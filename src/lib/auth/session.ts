/**
 * Stateless session cookie, signed with HMAC-SHA256 via Web Crypto so it works
 * in both the Edge middleware and Node route handlers. The cookie only proves
 * identity + role; passwords are bcrypt-checked in the login route (Node only).
 */

export const SESSION_COOKIE = "revivalos_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Session = {
  uid: string;
  role: string;
  name: string;
  exp: number; // ms epoch
};

const encoder = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  const bin = atob(t);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET || "revivalos-dev-secret-change-me";
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  input: Omit<Session, "exp">,
  maxAgeSec = SESSION_MAX_AGE,
): Promise<string> {
  const session: Session = { ...input, exp: Date.now() + maxAgeSec * 1000 };
  const payload = b64url(encoder.encode(JSON.stringify(session)));
  const sig = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    encoder.encode(payload),
  );
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

export async function verifySession(
  token: string | undefined | null,
): Promise<Session | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let ok = false;
  try {
    ok = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      b64urlToBytes(sig) as BufferSource,
      encoder.encode(payload) as BufferSource,
    );
  } catch {
    return null;
  }
  if (!ok) return null;
  try {
    const s = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(payload)),
    ) as Session;
    if (typeof s.exp !== "number" || s.exp < Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}
