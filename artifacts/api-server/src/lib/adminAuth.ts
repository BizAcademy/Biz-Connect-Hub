import { timingSafeEqual } from "crypto";
import type { Request, Response } from "express";

const DEV_FALLBACK = "biz2024admin";

/**
 * Resolve the admin password.
 * In production the ADMIN_PASSWORD secret is required (fail closed);
 * in development a fallback keeps the local admin usable.
 */
function getAdminPassword(): string | null {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (process.env.NODE_ENV === "production") return null;
  return DEV_FALLBACK;
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function checkAdminPassword(password: string | undefined): boolean {
  const expected = getAdminPassword();
  if (!expected || !password) return false;
  return safeEqual(password, expected);
}

/** Check the x-admin-password header of a request. */
export function isAdminRequest(req: Request): boolean {
  const pw = req.headers["x-admin-password"];
  return typeof pw === "string" && checkAdminPassword(pw);
}

/** Guard helper: sends 401 and returns false when not admin. */
export function requireAdmin(req: Request, res: Response): boolean {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}
