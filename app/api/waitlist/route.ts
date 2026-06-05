import { NextResponse } from "next/server";
import { addWaitlistEmail, getWaitlistCount } from "@/lib/waitlist-store";

export const runtime = "nodejs";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email =
    typeof body === "object" &&
    body !== null &&
    typeof (body as Record<string, unknown>).email === "string"
      ? ((body as Record<string, string>).email as string).trim().toLowerCase()
      : "";

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  try {
    const result = await addWaitlistEmail(email);
    if (result.alreadySubscribed) {
      return NextResponse.json({ message: "You're already on the list!" });
    }

    return NextResponse.json({
      message: "You're on the list! We'll notify you when FitMashr drops.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({ count: await getWaitlistCount() });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
