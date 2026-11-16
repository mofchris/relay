// Password hashing (PBKDF2-SHA256) and session tokens (HS256 JWT), both on the
// Web Crypto API so they run natively in Cloudflare Workers and in Node.

const encoder = new TextEncoder();

// Workers caps PBKDF2 at 100,000 iterations.
export const PBKDF2_ITERATIONS = 100_000;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Constant-time comparison, so timing does not leak how much of a hash matched. */
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Hash a password as `pbkdf2$<iterations>$<salt>$<hash>`. */
export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const parts = (stored ?? "").split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) return false;
  const hash = await pbkdf2(password, fromBase64Url(parts[2]), iterations);
  return sameBytes(hash, fromBase64Url(parts[3]));
}

// --- JWT (HS256) -------------------------------------------------------------

export interface TokenClaims {
  sub: number;
  exp: number;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

const HEADER = toBase64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));

export async function signToken(userId: number, secret: string, ttlSeconds: number): Promise<string> {
  const claims: TokenClaims = { sub: userId, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payload = toBase64Url(encoder.encode(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(`${HEADER}.${payload}`));
  return `${HEADER}.${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Returns the claims if the token is well-formed, correctly signed and unexpired. */
export async function verifyToken(token: string, secret: string): Promise<TokenClaims | null> {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature || header !== HEADER) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      fromBase64Url(signature) as BufferSource,
      encoder.encode(`${header}.${payload}`),
    );
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as TokenClaims;
    if (!Number.isInteger(claims.sub) || typeof claims.exp !== "number") return null;
    return claims.exp > Date.now() / 1000 ? claims : null;
  } catch {
    return null;
  }
}
