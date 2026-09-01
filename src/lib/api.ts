import { NextResponse } from "next/server";
import type { z } from "zod";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function badRequest(message: string, issues?: unknown): NextResponse {
  return NextResponse.json({ error: message, issues }, { status: 400 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal error"): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

type Parsed<T> = { ok: true; data: T } | { ok: false; res: NextResponse };

export function parseQuery<T>(schema: z.ZodType<T>, url: string): Parsed<T> {
  const params = Object.fromEntries(new URL(url).searchParams.entries());
  const r = schema.safeParse(params);
  if (!r.success) return { ok: false, res: badRequest("Invalid query", r.error.issues) };
  return { ok: true, data: r.data };
}

export async function parseJson<T>(
  schema: z.ZodType<T>,
  req: Request,
): Promise<Parsed<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, res: badRequest("Invalid JSON body") };
  }
  const r = schema.safeParse(body);
  if (!r.success) return { ok: false, res: badRequest("Invalid body", r.error.issues) };
  return { ok: true, data: r.data };
}
