import { describe, expect, it } from 'vitest';
import { gemstoneSubmissionSchema, settingSubmissionSchema, vendorOnboardingSchema } from '../validation.js';

describe('submission + onboarding validation', () => {
  it('accepts a valid vendor onboarding payload', () => {
    const parsed = vendorOnboardingSchema.parse({
      name: 'Atelier Test',
      country: 'AE',
      legal_name: 'Atelier Test LLC',
      contact_name: 'Layla Noor',
      email: 'layla@atelier.example',
    });
    expect(parsed.country).toBe('AE');
  });

  it('rejects a non-ISO country and a malformed email', () => {
    expect(() => vendorOnboardingSchema.parse({
      name: 'X', country: 'ARE', legal_name: 'X LLC', contact_name: 'Y', email: 'not-an-email',
    })).toThrow();
  });

  it('requires a positive carat weight on gemstone submissions', () => {
    expect(() => gemstoneSubmissionSchema.parse({
      vendor_ref: 'RB-1', variety: 'ruby', weight_ct: 0, currency: 'USD',
    })).toThrow();
    const ok = gemstoneSubmissionSchema.parse({
      vendor_ref: 'RB-1', variety: 'ruby', weight_ct: 2.5, currency: 'USD',
    });
    expect(ok.weight_ct).toBe(2.5);
  });

  it('requires a supported jewellery type on setting submissions', () => {
    const parsed = settingSubmissionSchema.parse({
      vendor_ref: 'S-1', jewellery_type: 'RING', metal: 'W18', currency: 'USD',
    });
    expect(parsed.jewellery_type).toBe('RING');
  });
});
