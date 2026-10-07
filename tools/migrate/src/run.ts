/**
 * tools/migrate — the resumable, idempotent, hash-gated stage runner
 * (plan task 10).
 *
 * Execution contract (each requirement is test-frozen by run.spec.ts):
 *
 *   A. RESUMABILITY — stage state lives in `import_batches` (durable). A
 *      run replays the chain, skipping every SUCCEEDED stage and resuming
 *      any FAILED/absent one. An interrupted run is safely retryable: no
 *      completed stage is re-executed, and downstream stages never execute
 *      prematurely because every failure stops the chain immediately.
 *
 *   B. IDEMPOTENCY — re-running a completed stage is a no-op (skip, not
 *      rework). The implemented stages themselves are idempotent:
 *      runMigrations is a no-op once all migrations are recorded, and the
 *      reference seed inserts ON CONFLICT DO NOTHING.
 *
 *   C. SHA-256 GATING — a stage's declared artifacts are verified against
 *      docs/evidence/MANIFEST.md BEFORE execution; any mismatch/absence
 *      refuses the run naming stage + artifact + expected vs actual digest.
 *      Nothing is silently continued.
 *
 *   D. DRY RUN — `plan` prints the resolved stage/artifact plan and touches
 *      neither the archive nor the database state rows.
 *
 *   F. FAILURE BEHAVIOUR — a failed stage is marked FAILED (retryable), the
 *      chain stops with a non-zero exit, previously completed stages stay
 *      complete, and the failure reason lands in the durable audit row.
 *
 *   G. AUDITABILITY — stage id, status, source artifact/digest notes and
 *      started/finished timestamps are all in the durable rows; errors carry
 *      artifact/digest details and never secrets.
 */
import { ArtifactVerificationError, parseManifest, resolveArchiveRoot, verifyArtifact, type ManifestArtifact } from './manifest.js';
import { STAGES, requiredArtifactsFor, type StageDefinition } from './stages.js';
import { MigrationState, type StageStatus } from './state.js';
import { runMigrations, defaultMigrationsFolder, seedReferenceData } from '@maihan/db';

export interface RunOptions {
  databaseUrl: string;
  repoRoot: string;
  manifestPath?: string;
  archiveRoot?: string;
  /** Minimum manifest rows (13 = the authoritative physical count; fixtures lower it explicitly). */
  minManifestArtifacts?: number;
  /** Only these stages (all implemented stages when omitted). */
  onlyStageIds?: readonly string[];
  /** Up to (inclusive) this stage id; stages after it never run. */
  stopAfterStageId?: string;
  /** Inspect the plan without mutating anything. */
  dryRun?: boolean;
}

export interface StageOutcome {
  readonly id: string;
  readonly action: 'RAN' | 'SKIPPED' | 'DRY_RUN' | 'REFUSED_NOT_IMPLEMENTED';
  readonly status: StageStatus | null;
  readonly detail: string;
}

function outcomeOf(id: string, action: StageOutcome['action'], status: StageStatus | null, detail: string): StageOutcome {
  return { id, action, status, detail };
}

function write(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

function artifactNote(artifacts: readonly ManifestArtifact[]): string {
  if (artifacts.length === 0) return 'none';
  if (artifacts.length === 1) return `${artifacts[0]?.artifact} (${artifacts[0]?.sha256.slice(0, 16)}…)`;
  return `${artifacts.length} manifest artifacts`;
}

async function executeStage(
  stage: StageDefinition,
  options: { databaseUrl: string; repoRoot: string; manifestPath: string; archiveRoot: string },
): Promise<void> {
  switch (stage.id) {
    case 'verify-artifacts': {
      // The per-artifact verification already ran in the gating loop with
      // progress output; this stage is its own gate.
      return;
    }
    case 'migrate-schema': {
      const result = await runMigrations({ databaseUrl: options.databaseUrl, migrationsFolder: defaultMigrationsFolder() });
      write(`  migrate-schema: target ${result.database}, ${result.recorded} migration(s) recorded`);
      return;
    }
    case 'seed-reference': {
      const { Client } = await import('pg');
      const client = new Client({ connectionString: options.databaseUrl });
      await client.connect();
      try {
        const counts = await seedReferenceData(client);
        write(
          `  seed-reference: metals ${counts.metals.inserted}/${counts.metals.present}, jewellery_types ${counts.jewelleryTypes.inserted}/${counts.jewelleryTypes.present},` +
            ` setting_styles ${counts.settingStyles.inserted}/${counts.settingStyles.present}, treatments ${counts.treatments.inserted}/${counts.treatments.present},` +
            ` treatment_labels ${counts.treatmentLabels.inserted}/${counts.treatmentLabels.present},` +
            ` colour_intensities ${counts.colourIntensities.inserted}/${counts.colourIntensities.present},` +
            ` clarities ${counts.clarities.inserted}/${counts.clarities.present}, clarity_labels ${counts.clarityLabels.inserted}/${counts.clarityLabels.present}`,
        );
      } finally {
        await client.end().catch(() => undefined);
      }
      return;
    }
    default:
      throw new Error(`stage ${stage.id} has no executor (declared but not implemented: ${stage.blockedBy ?? 'unknown'})`);
  }
}

/**
 * Run the stage chain. Throws (never silently continues) on hash mismatch,
 * missing manifest/artifact or an executed unreachable state; marked FAILED
 * rows carry the reason.
 */
export async function runStages(options: RunOptions): Promise<readonly StageOutcome[]> {
  const manifestPath = options.manifestPath ?? `${options.repoRoot}/docs/evidence/MANIFEST.md`;
  const archiveRoot = options.archiveRoot ?? resolveArchiveRoot();

  const manifest = parseManifest(manifestPath, { minArtifacts: options.minManifestArtifacts ?? 13 }); // fail fast: a partial real manifest refuses everything
  // The default chain covers IMPLEMENTED stages only: declared future stages
  // refuse explicitly when targeted by --stage, and the full run ends after
  // the last implemented stage rather than tripping them.
  const chain = STAGES.filter((stage) =>
    options.onlyStageIds ? options.onlyStageIds.includes(stage.id) : stage.implemented,
  );
  if (chain.length === 0) {
    throw new Error(`no known stage in selection: ${(options.onlyStageIds ?? []).join(', ')}`);
  }

  const state = await MigrationState.connect(options.databaseUrl);
  const outcomes: StageOutcome[] = [];
  try {
    await state.assertDevContract();
    const stopIndex = options.stopAfterStageId ? chain.findIndex((s) => s.id === options.stopAfterStageId) : chain.length - 1;
    if (stopIndex < 0) {
      throw new Error(`unknown stop-after stage: ${options.stopAfterStageId}`);
    }

    for (const stage of chain.slice(0, stopIndex + 1)) {
      const current: StageStatus | null = (await state.get(`stage:${stage.id}`))?.status ?? null;
      if (current === 'SUCCEEDED') {
        write(`status ${stage.id}: SKIP (durable state SUCCEEDED; idempotent resume)`);
        outcomes.push(outcomeOf(stage.id, 'SKIPPED', current, 'durable state SUCCEEDED'));
        continue;
      }
      if (!stage.implemented) {
        const reason = `stage ${stage.id} is declared but not implemented (${stage.blockedBy}); refusing to execute`;
        await state.markFailed({ stageKey: `stage:${stage.id}`, reason });
        write(`status ${stage.id}: REFUSED — ${reason}`);
        throw new Error(reason);
      }

      // SHA-256 gating BEFORE any execution.
      const artifacts = requiredArtifactsFor(stage, manifest);
      if (options.dryRun) {
        write(`plan ${stage.id}: ${stage.description}`);
        write(`plan ${stage.id}: artifacts: ${artifactNote(artifacts)}`);
        outcomes.push(outcomeOf(stage.id, 'DRY_RUN', current, `${artifacts.length} artifact(s) to verify`));
        continue;
      }
      let totalBytes = 0;
      for (const artifact of artifacts) {
        try {
          const result = verifyArtifact({ artifact, archiveRoot, repoRoot: options.repoRoot, stage: stage.id });
          totalBytes += result.sizeBytes;
          write(`  ${stage.id}: artifact ${artifact.artifact} verified (${result.sizeBytes.toLocaleString('en-US')} B)`);
        } catch (error) {
          const reason = error instanceof ArtifactVerificationError ? error.message : `${error instanceof Error ? error.message : String(error)}`;
          await state.markFailed({ stageKey: `stage:${stage.id}`, reason: `artifact verification: ${reason}` });
          throw error;
        }
      }
      if (stage.id === 'verify-artifacts') {
        write(`  verify-artifacts: ${artifacts.length} artifacts, ${(totalBytes / 1e9).toFixed(2)} GB — all digests match the manifest (archive read-only)`);
      }

      await state.markRunning({
        stageKey: `stage:${stage.id}`,
        sourceArtifact: artifactNote(artifacts),
      });
      try {
        await executeStage(stage, { databaseUrl: options.databaseUrl, repoRoot: options.repoRoot, manifestPath, archiveRoot });
        const notes =
          stage.id === 'verify-artifacts'
            ? `${artifacts.length} manifest artifacts verified against recorded SHA-256 (archive read-only)`
            : stage.id === 'migrate-schema'
              ? 'ordered DDL migration chain applied (Drizzle history authoritative)'
              : 'authoritative reference vocabulary seeded (ON CONFLICT DO NOTHING)';
        await state.markSucceeded({ stageKey: `stage:${stage.id}`, notes });
        outcomes.push(outcomeOf(stage.id, 'RAN', 'SUCCEEDED', notes));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        await state.markFailed({ stageKey: `stage:${stage.id}`, reason });
        throw new Error(`stage ${stage.id} FAILED: ${reason}; downstream stages stopped, state preserved for resume`, { cause: error });
      }
    }
  } finally {
    await state.end();
  }
  return outcomes;
}
