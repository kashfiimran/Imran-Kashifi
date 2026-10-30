/**
 * ChecksumValidator implements real cryptographic SHA-256 hashing using Web Crypto API.
 */
export class ChecksumValidator {
  /**
   * Computes SHA-256 hex string of an ArrayBuffer or Uint8Array
   */
  public static async computeSha256(data: ArrayBuffer | Uint8Array): Promise<string> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      throw new Error('Web Crypto API is not available in this environment');
    }

    const buffer = data instanceof Uint8Array ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer as ArrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validates if the actual hash matches the expected hash (case-insensitive)
   */
  public static async verify(data: ArrayBuffer | Uint8Array, expectedSha256: string): Promise<boolean> {
    const actualHash = await this.computeSha256(data);
    return actualHash.toLowerCase() === expectedSha256.trim().toLowerCase();
  }
}
