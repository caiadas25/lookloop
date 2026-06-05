import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const LOCAL_WAITLIST_FILE = ".next/dev/waitlist.json";

export type WaitlistEntry = {
  email: string;
  subscribedAt: string | null;
};

type LocalWaitlistData = {
  entries: WaitlistEntry[];
};

async function getKv() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return null;
  }
  const { kv } = await import("@vercel/kv");
  return kv;
}

function canUseLocalWaitlistStore(): boolean {
  return process.env.NODE_ENV === "development";
}

export async function addWaitlistEmail(
  email: string,
): Promise<{ alreadySubscribed: boolean }> {
  const kv = await getKv();
  if (kv) {
    const existing = await kv.get<string>(`waitlist:${email}`);
    if (existing) return { alreadySubscribed: true };

    await kv.set(`waitlist:${email}`, new Date().toISOString());
    await kv.incr("waitlist:count");
    return { alreadySubscribed: false };
  }

  if (!canUseLocalWaitlistStore()) {
    throw new Error("Waitlist is not configured yet. Please try again later.");
  }

  const data = await readLocalWaitlist();
  const existing = data.entries.some((entry) => entry.email === email);
  if (existing) return { alreadySubscribed: true };

  data.entries.push({ email, subscribedAt: new Date().toISOString() });
  await writeLocalWaitlist(data);
  return { alreadySubscribed: false };
}

export async function getWaitlistCount(): Promise<number> {
  const kv = await getKv();
  if (kv) return (await kv.get<number>("waitlist:count")) ?? 0;
  if (!canUseLocalWaitlistStore()) return 0;

  return (await readLocalWaitlist()).entries.length;
}

export async function getWaitlistEntries(): Promise<{
  count: number;
  entries: WaitlistEntry[];
}> {
  const kv = await getKv();
  if (kv) return getKvWaitlistEntries(kv);
  if (!canUseLocalWaitlistStore()) {
    throw new Error("Waitlist is not configured yet.");
  }

  const entries = sortEntries((await readLocalWaitlist()).entries);
  return { count: entries.length, entries };
}

async function getKvWaitlistEntries(kv: Awaited<ReturnType<typeof getKv>>) {
  if (!kv) throw new Error("Waitlist is not configured yet.");

  const keys: string[] = [];
  let cursor = "0";
  do {
    const result = await kv.scan(cursor, { match: "waitlist:*", count: 100 });
    cursor = result[0];
    keys.push(...result[1]);
  } while (cursor !== "0");

  const emailKeys = keys.filter((key) => key !== "waitlist:count");
  const entries = await Promise.all(
    emailKeys.map(async (key) => {
      const email = key.replace("waitlist:", "");
      const subscribedAt = await kv.get<string>(key);
      return { email, subscribedAt };
    }),
  );

  const count = (await kv.get<number>("waitlist:count")) ?? entries.length;
  return { count, entries: sortEntries(entries) };
}

async function readLocalWaitlist(): Promise<LocalWaitlistData> {
  try {
    const raw = await readFile(getLocalWaitlistFile(), "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalWaitlistData>;
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];

    return {
      entries: entries
        .map(parseLocalWaitlistEntry)
        .filter((entry): entry is WaitlistEntry => entry !== null),
    };
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "ENOENT"
    ) {
      return { entries: [] };
    }
    throw err;
  }
}

function parseLocalWaitlistEntry(raw: unknown): WaitlistEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as Partial<WaitlistEntry>;
  if (typeof entry.email !== "string") return null;

  return {
    email: entry.email,
    subscribedAt: typeof entry.subscribedAt === "string" ? entry.subscribedAt : null,
  };
}

async function writeLocalWaitlist(data: LocalWaitlistData): Promise<void> {
  const file = getLocalWaitlistFile();
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function getLocalWaitlistFile(): string {
  return join(process.cwd(), LOCAL_WAITLIST_FILE);
}

function sortEntries(entries: WaitlistEntry[]): WaitlistEntry[] {
  return [...entries].sort((a, b) => {
    if (!a.subscribedAt || !b.subscribedAt) return 0;
    return new Date(b.subscribedAt).getTime() - new Date(a.subscribedAt).getTime();
  });
}
