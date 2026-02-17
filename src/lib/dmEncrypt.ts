import crypto from 'crypto';

let key: Buffer;

export function initDmEncryption(secret: string): void {
  key = crypto.createHmac('sha256', secret).update('dm-encryption-key').digest();
}

export function encryptDmContent(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`;
}

export function decryptDmContent(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 3) return stored; // not encrypted — return as-is
  const [ivHex, ciphertextHex, tagHex] = parts;
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    if (iv.length !== 12 || tag.length !== 16) return stored;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return stored; // decryption failed — return as-is (likely plaintext)
  }
}
