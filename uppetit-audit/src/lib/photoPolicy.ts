export function isAuditPhotoUrl(value: string) {
  try {
    if (!process.env.S3_PUBLIC_URL) return false;
    const base = new URL(process.env.S3_PUBLIC_URL);
    const url = new URL(value);
    const prefix = `${base.pathname.replace(/\/$/, '')}/audits/`;
    return url.protocol === 'https:' && url.origin === base.origin && !url.username && !url.password
      && !url.search && !url.hash && url.pathname.startsWith(prefix)
      && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(url.pathname.slice(prefix.length));
  } catch { return false; }
}
