import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

export class EncryptionManager {
  private keyPath: string;
  private key: Buffer | null = null;
  private initialized: boolean = false;

  constructor(keyPath: string) {
    this.keyPath = keyPath;
  }

  async initialize(): Promise<void> {
    try {
      if (fs.existsSync(this.keyPath)) {
        // Load existing key
        const keyData = fs.readFileSync(this.keyPath);
        this.key = keyData;
      } else {
        // Generate new key
        this.key = crypto.randomBytes(KEY_LENGTH);
        
        // Ensure directory exists
        const dir = path.dirname(this.keyPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Save key to file
        fs.writeFileSync(this.keyPath, this.key, { mode: 0o600 });
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize encryption:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  isInitialized(): boolean {
    return this.initialized && this.key !== null;
  }

  encrypt(plaintext: string): string {
    if (!this.key) {
      throw new Error('Encryption not initialized');
    }

    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV + AuthTag + Encrypted data
      const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'base64')
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  decrypt(encryptedData: string): string {
    if (!this.key) {
      throw new Error('Encryption not initialized');
    }

    try {
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract IV, AuthTag, and encrypted data
      const iv = combined.subarray(0, IV_LENGTH);
      const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
      
      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Hash a value (for non-reversible encryption like passwords)
  hash(value: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.pbkdf2Sync(value, salt, 100000, 64, 'sha512');
    return salt.toString('hex') + ':' + hash.toString('hex');
  }

  // Verify a hashed value
  verifyHash(value: string, hashedValue: string): boolean {
    const [saltHex, hashHex] = hashedValue.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const hash = crypto.pbkdf2Sync(value, salt, 100000, 64, 'sha512');
    return hash.toString('hex') === hashHex;
  }

  // Check if the encryption key exists
  keyExists(): boolean {
    return fs.existsSync(this.keyPath);
  }

  // Export key (for backup purposes - handle with care!)
  exportKey(): string | null {
    if (!this.key) return null;
    return this.key.toString('base64');
  }

  // Import key (for restore purposes)
  async importKey(keyBase64: string): Promise<void> {
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== KEY_LENGTH) {
      throw new Error('Invalid key length');
    }
    
    this.key = key;
    fs.writeFileSync(this.keyPath, this.key, { mode: 0o600 });
    this.initialized = true;
  }
}
