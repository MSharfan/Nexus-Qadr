/**
 * Safely decode a JWT payload.
 * - Does NOT verify signature (frontend must never do that)
 * - Fails gracefully
 * - Returns null if token is invalid
 */

export function decodeJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Payload = parts[1];

    // Base64url → Base64
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');

    // Decode
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );

    const payload = JSON.parse(jsonPayload);

    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    return payload;
  } catch {
    // Any error → treat token as invalid
    return null;
  }
}
