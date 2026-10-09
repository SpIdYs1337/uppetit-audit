// Authenticator apps can group digits with spaces (including non-breaking
// spaces). Keep leading zeroes and reject extra digits/characters at validation.
export function normalizeOneTimeCode(value: string) {
  return value.replace(/\s/g, '');
}
