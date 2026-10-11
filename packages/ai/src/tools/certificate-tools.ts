/**
 * packages/ai/src/tools/certificate-tools.ts
 *
 * Authority: technical_design/18_AI_ORCHESTRATION_ARCHITECTURE.md §4, doc 17
 *
 * Tool: get_certificate (read, public, redacted)
 * Invariant INV-07: Unverified fields (< 0.85 confidence or status != VERIFIED)
 * are redacted / labelled unverified and never presented as verified truth.
 */
import { z } from 'zod';
import type { Tool, ToolContext, AuthzDecision, Citation } from './types.js';

const GetCertificateInput = z.object({
  certificateId: z.string().optional(),
  gemRef: z.string().optional(),
}).refine((data) => data.certificateId !== undefined || data.gemRef !== undefined, {
  message: 'Either certificateId or gemRef must be provided.',
});

const GetCertificateOutput = z.object({
  found: z.boolean(),
  certificateId: z.string().optional(),
  labName: z.string().nullable(),
  certificateNumber: z.string().nullable(),
  verificationStatus: z.enum(['UNVERIFIED', 'EXTRACTED', 'CROSS_CHECKED', 'VERIFIED', 'REJECTED']),
  isFullyVerified: z.boolean(),
  extractedFields: z.record(
    z.object({
      value: z.unknown(),
      confidence: z.number(),
      status: z.string(),
      isWithheld: z.boolean(),
    }),
  ),
  notice: z.string(),
});

export const getCertificateTool: Tool<
  z.infer<typeof GetCertificateInput>,
  z.infer<typeof GetCertificateOutput>
> = {
  name: 'get_certificate',
  version: '1.0.0',
  description: 'Retrieve verified gemmological lab report attributes with strict redaction of unverified claims.',
  inputSchema: GetCertificateInput,
  outputSchema: GetCertificateOutput,
  mutates: false,
  timeoutMs: 2000,
  idempotent: true,
  authorization(_ctx: ToolContext): AuthzDecision {
    return { allowed: true, action: 'ALLOW' };
  },
  async execute(ctx: ToolContext, input) {
    const cert = await ctx.services.certificates.getPublicCertificate(input);
    if (!cert) {
      return {
        found: false,
        labName: null,
        certificateNumber: null,
        verificationStatus: 'UNVERIFIED',
        isFullyVerified: false,
        extractedFields: {},
        notice: 'No certificate documentation on file for this stone.',
      };
    }

    const isVerified = cert.verification_status === 'VERIFIED';
    const rawFields = cert.fields ?? {};
    const sanitizedFields: Record<string, any> = {};

    for (const [key, field] of Object.entries(rawFields as Record<string, any>)) {
      const conf = Number(field?.confidence ?? 0);
      const isWithheld = conf < 0.50 || (!isVerified && conf < 0.85);
      sanitizedFields[key] = {
        value: isWithheld ? null : field?.value,
        confidence: conf,
        status: isVerified ? 'VERIFIED' : 'EXTRACTED_UNVERIFIED',
        isWithheld,
      };
    }

    return {
      found: true,
      certificateId: cert.id,
      labName: cert.lab_name ?? 'Document on file',
      certificateNumber: isVerified ? cert.certificate_number : 'Masked (Pending verification)',
      verificationStatus: cert.verification_status ?? 'UNVERIFIED',
      isFullyVerified: isVerified,
      extractedFields: sanitizedFields,
      notice: isVerified
        ? 'Fully verified against gemmological lab records.'
        : 'Documentation on file, pending independent gemmological verification.',
    };
  },
  citationFor(output): ReadonlyArray<Citation> {
    if (!output.found || !output.certificateId) return [];
    return [
      {
        type: 'CERTIFICATE',
        id: output.certificateId,
        label: `${output.labName} (${output.verificationStatus})`,
        url: `/certificates/${output.certificateId}`,
        confidence: output.isFullyVerified ? 1.0 : 0.85,
        fields: ['verificationStatus', 'labName', 'extractedFields'],
      },
    ];
  },
};
