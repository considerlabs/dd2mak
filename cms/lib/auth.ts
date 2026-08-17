import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { readStore } from "./store";
import type { Role, User } from "./store";
export { verifyPassword } from "./password";

const SECRET = process.env.CMS_SECRET || "dd2mak-local-secret-change-me";

function sign(payload: string) {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export async function setSession(user: User) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const payload = `${user.id}.${user.role}.${exp}`;
  const token = `${payload}.${sign(payload)}`;
  (await cookies()).set("dd2mak_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSession() {
  (await cookies()).delete("dd2mak_session");
}

export async function getSession(): Promise<{ id: string; role: Role } | null> {
  const token = (await cookies()).get("dd2mak_session")?.value;
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [id, role, exp, sig] = parts;
  const payload = `${id}.${role}.${exp}`;
  if (sign(payload) !== sig) return null;
  if (Number(exp) < Date.now()) return null;
  const user = readStore().users.find((u) => u.id === id);
  if (!user) return null;
  return { id, role: user.role };
}

export async function requireUser() {
  const session = await getSession();
  if (!session) throw new Error("로그인이 필요합니다.");
  return session;
}

export async function requireReviewer() {
  const session = await requireUser();
  if (session.role === "writer") throw new Error("검수 권한이 없습니다.");
  return session;
}
