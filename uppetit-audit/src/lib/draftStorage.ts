const prefix = 'uppetit-draft-v1:';
const pending = new Map<string, Promise<void>>();
let generation = 0;
export const draftStorageKey = (userId: string, name: string) => `${prefix}${userId}:${name}`;

async function encryptionKey(hex: string) {
  const bytes = Uint8Array.from(hex.match(/.{2}/g) || [], byte => parseInt(byte, 16));
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
const encode = (bytes: Uint8Array) => btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
const decode = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));

export async function readDraft<T>(userId: string, name: string, key: string): Promise<T | null> {
  const storageKey = draftStorageKey(userId, name);
  await pending.get(storageKey);
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;
  const { iv, ciphertext } = JSON.parse(raw);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(iv),
    additionalData: new TextEncoder().encode(storageKey) }, await encryptionKey(key), decode(ciphertext));
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

export function writeDraft(userId: string, name: string, key: string, value: unknown) {
  const storageKey = draftStorageKey(userId, name);
  const currentGeneration = generation;
  const write = (pending.get(storageKey) || Promise.resolve()).catch(() => {}).then(async () => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv,
      additionalData: new TextEncoder().encode(storageKey) }, await encryptionKey(key), new TextEncoder().encode(JSON.stringify(value)));
    if (generation === currentGeneration) localStorage.setItem(storageKey, JSON.stringify({ iv: encode(iv), ciphertext: encode(new Uint8Array(encrypted)) }));
  });
  pending.set(storageKey, write);
  void write.finally(() => { if (pending.get(storageKey) === write) pending.delete(storageKey); }).catch(() => {});
  return write;
}

export async function removeDraft(userId: string, name: string) {
  const storageKey = draftStorageKey(userId, name);
  await pending.get(storageKey)?.catch(() => {});
  localStorage.removeItem(storageKey);
}

export function clearDrafts(userId?: string) {
  generation++;
  for (const key of Object.keys(localStorage)) {
    if (key === 'last_active_audit' || key.startsWith('audit_draft_') || key.startsWith('audit_meta_')
      || (userId && key.startsWith(`${prefix}${userId}:`))) localStorage.removeItem(key);
  }
}
