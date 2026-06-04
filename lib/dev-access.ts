import { isAdminCookieHeaderAuthenticated } from "./admin-auth";

export function isLocalDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

export async function hasDevToolAccess(cookieHeader: string | null): Promise<boolean> {
  if (isLocalDevelopment()) return true;
  return isAdminCookieHeaderAuthenticated(cookieHeader);
}
