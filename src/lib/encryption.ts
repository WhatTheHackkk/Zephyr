import CryptoJS from 'crypto-js';

// Simple fallback symmetric key for E2E prototype
// In a production app, keys would be generated per user/channel and exchanged via public key crypto.
const MASTER_KEY = 'zephyr-e2ee-master-secret-key-2024';

export const encryptMessage = (text: string): string => {
  if (!text) return text;
  return CryptoJS.AES.encrypt(text, MASTER_KEY).toString();
};

export const decryptMessage = (ciphertext: string): string => {
  if (!ciphertext) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, MASTER_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption fails (e.g. not encrypted, or wrong key), it returns empty string
    return originalText || ciphertext;
  } catch (err) {
    // If it's old plain text, decryption will throw, so just return the original text
    return ciphertext;
  }
};
