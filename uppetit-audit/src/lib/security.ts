import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import { compare } from 'bcryptjs';
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from './sessionPolicy';
import { normalizeOneTimeCode } from './oneTimeCode';

const derivePassword = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key));
});
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');

export function passwordIsAllowed(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derivePassword(password, salt);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string) {
  if (password.length > MAX_PASSWORD_LENGTH) return false;
  if (stored.startsWith('$2')) return compare(password, stored);
  const [algorithm, salt, encoded] = stored.split('$');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(encoded || '')) return false;
  const expected = Buffer.from(encoded, 'hex');
  const actual = await derivePassword(password, salt);
  return timingSafeEqual(expected, actual);
}

export function issueInvite(purpose: 'INVITE' | 'RESET', now = Date.now()) {
  const token = randomBytes(32).toString('base64url');
  return { token, inviteTokenHash: hashToken(token), invitePurpose: purpose,
    inviteExpiresAt: new Date(now + (purpose === 'INVITE' ? 24 * 60 * 60_000 : 15 * 60_000)) };
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function generateTotpSecret() {
  const bytes = randomBytes(20);
  let bits = 0, value = 0, result = '';
  for (const byte of bytes) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { result += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  return result;
}

function decodeBase32(secret: string) {
  let bits = 0, value = 0;
  const bytes: number[] = [];
  for (const char of secret) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Invalid TOTP secret');
    value = (value << 5) | digit; bits += 5;
    if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(bytes);
}

export function totpCode(secret: string, step: number, digits = 6) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac('sha1', decodeBase32(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).toString().padStart(digits, '0');
}

export function matchTotpStep(secret: string, code: string, now = Date.now()) {
  code = normalizeOneTimeCode(code);
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(now / 30_000);
  for (const candidate of [step, step - 1, step + 1]) {
    if (candidate >= 0 && timingSafeEqual(Buffer.from(totpCode(secret, candidate)), Buffer.from(code))) return BigInt(candidate);
  }
  return null;
}

function encryptionKey() {
  const secret = process.env.AUTH_MFA_SECRET;
  if (!secret) throw new Error('AUTH_MFA_SECRET is required');
  return createHash('sha256').update(`uppetit:totp:v1:${secret}`).digest();
}

export function encryptTotp(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map(part => part.toString('base64url')).join('.');
}

export function decryptTotp(value: string) {
  const [iv, tag, ciphertext] = value.split('.').map(part => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function generateRecoveryCodes() {
  return Array.from({ length: 10 }, () => randomBytes(10).toString('hex'));
}
