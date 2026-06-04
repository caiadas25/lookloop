import { NextResponse } from "next/server";
import { isAdminCookieHeaderAuthenticated } from "@/lib/admin-auth";
import { getUsageStats, normalizeUsagePeriod } from "@/lib/usage-analytics";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await isAdminCookieHeaderAuthenticated(req.headers.get("cookie")))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(req.url);
  const period = normalizeUsagePeriod(url.searchParams.get("period"));

  try {
    const stats = await getUsageStats(period);
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read usage stats.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
