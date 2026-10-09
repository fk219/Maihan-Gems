/**
 * tools/migrate — CLI (bin: maihan-migrate).
 *
 * Commands (a small, deterministic CLI — no framework):
 *
 *   maihan-migrate plan [--stage <id>] [--stop-after <id>] [--manifest <path>] [--archive-root <path>]
 *       Print the resolved stage/artifact plan. Touches the database ONLY to
 *       read durable status; never writes, never mutates, never reasons.
 *
 *   maihan-migrate run [--stage <id>]... [--stop-after <id>] [--manifest <path>] [--archive-root <path>]
 *       Run the stage chain. Resumable (SUCCEEDED stages skip), idempotent,
 *       hash-gated: every declared artifact's SHA-256 must match the manifest
 *       before the stage executes. Any failure stops the chain, marks the
 *       stage FAILED (retryable) and exits non-zero.
 *
 *   maihan-migrate status [--manifest <path>]
 *       Print the durable stage state from import_batches.
 *
 * DATABASE_URL names the target database (the single sanctioned variable,
 * SoT 29.6); the runner enforces the maihan_dev dev contract and never
 * prints a credential.
 */
import { pathToFileURL } from 'node:url';
import { resolveArchiveRoot } from './manifest.js';
import { STAGES, requiredArtifactsFor } from './stages.js';
import { parseManifest } from './manifest.js';
import { MigrationState } from './state.js';
import { runStages } from './run.js';

function write(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

function usage(): void {
  write('usage: maihan-migrate <plan|run|status> [--stage <id>]... [--stop-after <id>] [--manifest <path>] [--archive-root <path>]');
  write('stages: ' + STAGES.map((s) => s.id).join(', '));
}

interface Args {
  command: string;
  stageIds: string[];
  stopAfter?: string;
  manifestPath?: string;
  archiveRoot?: string;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = { command: argv[0] ?? '', stageIds: [] };
  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i] ?? '';
    if (arg === '--stage') {
      const value = argv[i + 1];
      if (value !== undefined) {
        args.stageIds.push(value);
        i += 1;
      }
    } else if (arg === '--stop-after') {
      args.stopAfter = argv[i + 1];
      i += 1;
    } else if (arg === '--manifest') {
      args.manifestPath = argv[i + 1];
      i += 1;
    } else if (arg === '--archive-root') {
      args.archiveRoot = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.env['MAIHAN_REPO_ROOT'] ?? process.cwd();
  const rawDatabaseUrl = process.env['DATABASE_URL'] ?? '';
  // ADR/design requirement: migration execution requires a direct (non-pooled) connection
  const databaseUrl = rawDatabaseUrl.replace('-pooler.', '.');

  if (args.command !== 'plan' && args.command !== 'run' && args.command !== 'status') {
    usage();
    process.exitCode = 1;
    return;
  }

  if (args.command === 'status') {
    const manifest = parseManifest(args.manifestPath ?? `${repoRoot}/docs/evidence/MANIFEST.md`);
    const state = await MigrationState.connect(databaseUrl);
    try {
      const db = await state.assertDevContract();
      write(`migrate status on ${db}`);
      const rows = await state.listStages();
      for (const stage of STAGES) {
        const row = rows.find((r) => r.stageKey === `stage:${stage.id}`);
        write(
          `  ${stage.id.padEnd(20)} ${stage.implemented ? 'implemented' : 'declared  '} ${row ? row.status.padEnd(9) : '-'.padEnd(9)} ${row?.notes ?? ''}`,
        );
        if (stage.implemented) {
          void requiredArtifactsFor(stage, manifest);
        }
      }
    } finally {
      await state.end();
    }
    return;
  }

  if (args.command === 'plan') {
    await runStages({
      databaseUrl,
      repoRoot,
      manifestPath: args.manifestPath,
      archiveRoot: args.archiveRoot ?? resolveArchiveRoot(),
      onlyStageIds: args.stageIds.length > 0 ? args.stageIds : undefined,
      stopAfterStageId: args.stopAfter,
      dryRun: true,
    });
    return;
  }

  await runStages({
    databaseUrl,
    repoRoot,
    manifestPath: args.manifestPath,
    archiveRoot: args.archiveRoot ?? resolveArchiveRoot(),
    onlyStageIds: args.stageIds.length > 0 ? args.stageIds : undefined,
    stopAfterStageId: args.stopAfter,
  });
}

const isDirectExecution =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch((error: unknown) => {
    process.stderr.write(`maihan-migrate: FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
