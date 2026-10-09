export type TotpEnrollment = { secret: string; issuer: string; account: string };

// Key URI format used by authenticator apps. Encode every label/parameter
// separately so a login cannot change the secret or TOTP settings.
export function buildTotpEnrollmentUri({ secret, issuer, account }: TotpEnrollment) {
  const parameters = { secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' };
  const query = Object.entries(parameters).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?${query}`;
}
