import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

// Token types matching @gooin/garmin-connect library
export interface IOauth1Token {
  oauth_token: string;
  oauth_token_secret: string;
}

export interface IOauth2Token {
  scope: string;
  jti: string;
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in: number;
  expires_at: number;
  refresh_token_expires_at: number;
  last_update_date: string;
  expires_date: string;
}

export interface GarminTokens {
  oauth1: IOauth1Token;
  oauth2: IOauth2Token;
}

const TOKEN_DIR = path.join(process.cwd(), '.garmin-tokens');
const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_SECRET || 'default-dev-secret-change-in-production';
  return createHash('sha256').update(secret).digest();
}

function hashUserId(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 32);
}

async function ensureTokenDir(): Promise<void> {
  try {
    await fs.mkdir(TOKEN_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
}

function encrypt(data: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    data: encrypted,
  });
}

function decrypt(encryptedData: string): string {
  const { iv, authTag, data } = JSON.parse(encryptedData);
  const key = getEncryptionKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export async function saveTokens(userEmail: string, tokens: GarminTokens): Promise<void> {
  await ensureTokenDir();
  const userHash = hashUserId(userEmail);
  const filePath = path.join(TOKEN_DIR, `${userHash}.json`);

  const encrypted = encrypt(JSON.stringify(tokens));
  await fs.writeFile(filePath, encrypted, 'utf8');
}

export async function loadTokens(userEmail: string): Promise<GarminTokens | null> {
  const userHash = hashUserId(userEmail);
  const filePath = path.join(TOKEN_DIR, `${userHash}.json`);

  try {
    const encrypted = await fs.readFile(filePath, 'utf8');
    const decrypted = decrypt(encrypted);
    const tokens: GarminTokens = JSON.parse(decrypted);

    // Check if refresh token is still valid (with 1-day buffer)
    const now = Date.now() / 1000;
    const oneDayInSeconds = 86400;
    if (tokens.oauth2.refresh_token_expires_at && tokens.oauth2.refresh_token_expires_at < now + oneDayInSeconds) {
      // Refresh token expired or expiring soon
      await deleteTokens(userEmail);
      return null;
    }

    return tokens;
  } catch {
    return null;
  }
}

export async function deleteTokens(userEmail: string): Promise<void> {
  const userHash = hashUserId(userEmail);
  const filePath = path.join(TOKEN_DIR, `${userHash}.json`);

  try {
    await fs.unlink(filePath);
  } catch {
    // File doesn't exist, ignore
  }
}

export async function tokensExist(userEmail: string): Promise<boolean> {
  const userHash = hashUserId(userEmail);
  const filePath = path.join(TOKEN_DIR, `${userHash}.json`);

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
