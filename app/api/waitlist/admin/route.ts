import { NextResponse } from "next/server";
import { isAdminCookieHeaderAuthenticated } from "@/lib/admin-auth";
import { getWaitlistEntries } from "@/lib/waitlist-store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await isAdminCookieHeaderAuthenticated(req.headers.get("cookie")))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return NextResponse.json(await getWaitlistEntries());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read waitlist.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
