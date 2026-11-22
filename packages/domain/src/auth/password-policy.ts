/**
 * packages/domain/src/auth/password-policy.ts
 *
 * Registration is the only place a password is *chosen*, so it is the only
 * place composition rules belong. Login deliberately applies length only
 * (`LoginRequestSchema`): telling an attacker which passwords are structurally
 * invalid is a free oracle.
 *
 * The policy is two rules, both of which a customer can act on:
 *   1. length — at least {@link PASSWORD_MIN_LENGTH} characters;
 *   2. not one of the highest-frequency breached passwords.
 *
 * The blocklist is literal breached passwords from published frequency
 * analyses. Entries are matched, never echoed, and never logged: a message
 * that names the password would turn a validation error into a credential
 * leak in the browser, the logs and the trace.
 *
 * No I/O, no clock, no dependency: validation is a pure function.
 */

/** 12 is short enough to remember, long enough to defeat online guessing. */
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Upper bound only to bound scrypt cost. 200 matches the login schema, so a
 * password that can be set can always be used.
 */
export const PASSWORD_MAX_LENGTH = 200;

export type PasswordPolicyCode = 'TOO_SHORT' | 'TOO_LONG' | 'COMMON_PASSWORD';

export interface PasswordPolicyViolation {
  readonly code: PasswordPolicyCode;
  /** Safe to render: it never contains the password. */
  readonly message: string;
}

/**
 * The 100 highest-frequency breached passwords, plus the leet and
 * trailing-digit variants the matcher derives. Lowercase on purpose: the
 * matcher normalises, so the stored list stays readable. The fixed size is an
 * assertion in `password-policy.spec.ts`, not a comment.
 */
export const COMMON_PASSWORDS: readonly string[] = Object.freeze([
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234',
  '111111', '1234567', 'dragon', '123123', 'baseball', 'abc123', 'football',
  'monkey', 'letmein', '696969', 'shadow', 'master', '666666', 'qwertyuiop',
  '123321', 'mustang', '1234567890', 'michael', '654321', 'superman',
  '1qaz2wsx', '7777777', '121212', '000000', 'qazwsx', '123qwe', 'killer',
  'trustno1', 'jordan', 'jennifer', 'zxcvbnm', 'asdfgh', 'hunter', 'buster',
  'soccer', 'harley', 'batman', 'andrew', 'tigger', 'sunshine', 'iloveyou',
  '2000', 'charlie', 'robert', 'thomas', 'hockey', 'ranger', 'daniel',
  'starwars', 'klaster', '112233', 'george', 'computer', 'michelle', 'jessica',
  'pepper', '1111', 'zxcvbn', '555555', '11111111', '131313', 'freedom',
  '777777', 'pass', 'maggie', '159753', 'aaaaaa', 'ginger', 'princess',
  'joshua', 'cheese', 'amanda', 'summer', 'love', 'ashley', '6969', 'nicole',
  'chelsea', 'biteme', 'matthew', 'access', 'yankees', '987654321', 'dallas',
  'austin', 'thunder', 'taylor', 'matrix', 'welcome', 'admin', 'login',
  'passw0rd', 'hello',
]);

const COMMON_PASSWORD_KEYS: ReadonlySet<string> = new Set(COMMON_PASSWORDS);

/** Digits and symbols people substitute for letters when they "strengthen". */
const LEET: Readonly<Record<string, string>> = Object.freeze({
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '9': 'g',
  '@': 'a',
  $: 's',
  '!': 'i',
  '|': 'l',
  '+': 't',
});

function stripTrailingDigits(value: string): string {
  return value.replace(/[0-9]+$/, '');
}

/**
 * Every normalisation under which a password is considered "the same as" a
 * listed one: as typed, punctuation removed, trailing digits removed, and
 * leet-decoded. Four cheap Set lookups beat one clever heuristic.
 *
 * Trailing digits are removed BEFORE leet decoding on purpose: in
 * `P@ssw0rd1234` the `1234` is a suffix, so decoding `1` to `i` first would
 * produce a string that matches nothing.
 */
export function commonPasswordKeys(password: string): string[] {
  const lower = password.toLowerCase();
  const bare = lower.replace(/[^a-z0-9]/g, '');
  const decoded = stripTrailingDigits(lower)
    .replace(/[^a-z0-9@$!|+]/g, '')
    .replace(/[0-9@$!|+]/g, (char) => LEET[char] ?? char)
    .replace(/[^a-z]/g, '');
  return [
    lower,
    bare,
    stripTrailingDigits(bare),
    decoded,
  ];
}

/** True when the password is a listed one, however it was dressed up. */
export function isCommonPassword(password: string): boolean {
  return commonPasswordKeys(password).some((key) => COMMON_PASSWORD_KEYS.has(key));
}

/**
 * Validate a password that is about to be SET.
 *
 * Returns `null` when acceptable, otherwise the one violation to report. Only
 * the first violation is returned: a form should fix one thing at a time, and
 * a list of rules is a checklist an attacker can also read.
 */
export function validatePasswordPolicy(password: string): PasswordPolicyViolation | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      code: 'TOO_SHORT',
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
    };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      code: 'TOO_LONG',
      message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters long.`,
    };
  }
  if (isCommonPassword(password)) {
    return {
      code: 'COMMON_PASSWORD',
      message:
        'That password appears on published lists of the most commonly used passwords. Choose one that is longer and less predictable.',
    };
  }
  return null;
}
