const encoder = new TextEncoder();
const decoder = new TextDecoder();
const DEV_SECRET = "frontier-local-preview-secret-is-never-used-in-production";

function secretValue() {
  const secret = process.env.ADMIN_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") return DEV_SECRET;
  throw new Error("ADMIN_SECRET is not configured");
}

async function encryptionKey() {
  const base = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretValue()),
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode("frontier-admin-config-v1"),
      info: encoder.encode("default-ai-provider"),
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    encoder.encode(value),
  );
  return `${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(value: string) {
  const [ivPart, encryptedPart] = value.split(".");
  if (!ivPart || !encryptedPart) throw new Error("Invalid encrypted value");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivPart) },
    await encryptionKey(),
    base64ToBytes(encryptedPart),
  );
  return decoder.decode(decrypted);
}
