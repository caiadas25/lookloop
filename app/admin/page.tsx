"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { UsagePeriod, UsageStats } from "@/lib/usage-analytics";

interface Entry {
  email: string;
  subscribedAt: string | null;
}

const PERIODS: { value: UsagePeriod; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All" },
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [period, setPeriod] = useState<UsagePeriod>("7d");
  const [count, setCount] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const loadWaitlist = useCallback(async () => {
    setWaitlistLoading(true);
    setWaitlistError(null);

    try {
      const res = await fetch("/api/waitlist/admin");
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to load waitlist.");
      setCount(data.count);
      setEntries(data.entries);
    } catch (err) {
      setWaitlistError(err instanceof Error ? err.message : "Failed to load waitlist.");
    } finally {
      setWaitlistLoading(false);
    }
  }, []);

  const loadStats = useCallback(async (selectedPeriod: UsagePeriod) => {
    setStatsLoading(true);
    setStatsError(null);

    try {
      const res = await fetch(`/api/admin/stats?period=${selectedPeriod}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to load usage stats.");
      setStats(data);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "Failed to load usage stats.");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((data) => {
        const isAuthenticated = Boolean(data.authenticated);
        setAuthenticated(isAuthenticated);
        if (isAuthenticated) void loadWaitlist();
      })
      .catch(() => setAuthenticated(false));
  }, [loadWaitlist]);

  useEffect(() => {
    if (!authenticated) return;

    void Promise.resolve().then(() => loadStats(period));
  }, [authenticated, loadStats, period]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed.");
      setPassword("");
      setAuthenticated(true);
      await Promise.all([loadWaitlist(), loadStats(period)]);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Login failed.");
      setAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setCount(null);
    setEntries([]);
    setStats(null);
  }

  if (authenticated === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-sm text-gray-500">Checking session...</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900">Admin sign in</h1>
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-lg border border-black/15 px-3 text-sm text-gray-900 outline-none focus:border-gray-900"
            required
          />
          {authError && <p className="text-sm text-red-500">{authError}</p>}
          <button
            type="submit"
            disabled={authLoading}
            className="h-11 w-full rounded-lg bg-gray-900 text-sm font-semibold text-white disabled:opacity-60"
          >
            {authLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 text-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-black/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
              FitMashr admin
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-gray-950">
              Operations dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-black/10 bg-white p-1">
              {PERIODS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setPeriod(item.value)}
                  className={`h-9 rounded-md px-3 text-sm font-semibold transition ${
                    period === item.value
                      ? "bg-gray-950 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Link href="/try" className="text-sm font-semibold text-gray-900 underline">
              Open try-on
            </Link>
            <button type="button" onClick={handleLogout} className="text-sm text-gray-500">
              Log out
            </button>
          </div>
        </div>

        {statsLoading && <p className="mt-4 text-sm text-gray-500">Loading usage stats...</p>}
        {statsError && <p className="mt-4 text-sm text-red-500">{statsError}</p>}
        {stats && !stats.configured && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            KV is not configured, so usage events cannot be recorded yet.
          </p>
        )}

        <UsageOverview stats={stats} />

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <UsageChart stats={stats} />
          <UsageMix stats={stats} />
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <RecentUsage stats={stats} />
          <WaitlistPanel
            count={count}
            entries={entries}
            loading={waitlistLoading}
            error={waitlistError}
          />
        </div>
      </div>
    </main>
  );
}

function UsageOverview({ stats }: { stats: UsageStats | null }) {
  const totals = stats?.totals;

  return (
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Generations"
        value={formatInteger(totals?.generations)}
        detail={`${formatInteger(totals?.failedAttempts)} failed attempts`}
      />
      <MetricCard
        label="Model calls"
        value={formatInteger(totals?.calls)}
        detail={`${formatDecimal(totals?.avgCallsPerGeneration)} avg per generation`}
      />
      <MetricCard
        label="Cost"
        value={formatCurrency(totals?.costUsd)}
        detail={`${formatCurrency(totals?.avgCostPerGeneration)} avg per costed generation`}
      />
      <MetricCard
        label="Success rate"
        value={formatPercent(totals?.successRate)}
        detail={`${formatDuration(totals?.avgDurationMs)} avg duration`}
      />
      <MetricCard
        label="Tokens"
        value={formatInteger(totals?.tokens)}
        detail={`${formatDecimal(totals?.avgTokensPerGeneration)} avg per generation`}
      />
      <MetricCard
        label="Garments"
        value={formatDecimal(totals?.avgGarmentsPerGeneration)}
        detail="avg pieces per generation"
      />
      <MetricCard
        label="Cost coverage"
        value={formatInteger(totals?.costedGenerations)}
        detail={`${formatInteger(totals?.unknownCostGenerations)} generations without reported cost`}
      />
      <MetricCard
        label="Attempts"
        value={formatInteger(totals?.attempts)}
        detail="successful plus failed generation attempts"
      />
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-lg border border-black/10 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-normal text-gray-950">{value}</p>
      <p className="mt-2 text-sm text-gray-500">{detail}</p>
    </article>
  );
}

function UsageChart({ stats }: { stats: UsageStats | null }) {
  const maxGenerations = useMemo(
    () => Math.max(1, ...(stats?.series.map((bucket) => bucket.generations) ?? [0])),
    [stats],
  );

  return (
    <section className="rounded-lg border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-950">Generations by period</h2>
          <p className="mt-1 text-sm text-gray-500">Completed generations with failed attempts noted.</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
          {stats?.period ?? "7d"}
        </span>
      </div>

      <div className="mt-6 overflow-x-auto">
        <div className="flex min-h-64 min-w-[640px] items-end gap-2">
          {(stats?.series ?? []).map((bucket) => (
            <div key={bucket.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-44 w-full items-end rounded-md bg-gray-100 px-1">
                <div
                  className="w-full rounded-t bg-[#ff6bb5]"
                  style={{
                    height: `${Math.max(4, (bucket.generations / maxGenerations) * 100)}%`,
                  }}
                  title={`${bucket.generations} generations`}
                />
              </div>
              <p className="text-xs font-semibold text-gray-600">{bucket.generations}</p>
              <p className="w-16 truncate text-center text-[11px] text-gray-400">
                {bucket.label}
              </p>
              {bucket.failedAttempts > 0 && (
                <p className="text-[11px] font-semibold text-red-500">
                  {bucket.failedAttempts} failed
                </p>
              )}
            </div>
          ))}
          {(!stats || stats.series.length === 0) && (
            <p className="pb-24 text-sm text-gray-400">No usage events in this period.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function UsageMix({ stats }: { stats: UsageStats | null }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5">
      <h2 className="text-lg font-bold text-gray-950">Model and mode mix</h2>

      <div className="mt-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Models</h3>
        <div className="mt-3 space-y-3">
          {(stats?.models ?? []).map((model) => (
            <BreakdownRow
              key={model.label}
              label={model.label}
              value={`${formatInteger(model.count)} gen`}
              detail={formatCurrency(model.costUsd)}
            />
          ))}
          {(!stats || stats.models.length === 0) && (
            <p className="text-sm text-gray-400">No completed generations yet.</p>
          )}
        </div>
      </div>

      <div className="mt-7">
        <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Modes</h3>
        <div className="mt-3 space-y-3">
          {(stats?.modes ?? []).map((mode) => (
            <BreakdownRow
              key={mode.label}
              label={mode.label}
              value={`${formatInteger(mode.count)} gen`}
              detail={`${formatInteger(mode.calls)} calls`}
            />
          ))}
          {(!stats || stats.modes.length === 0) && (
            <p className="text-sm text-gray-400">No mode data yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function BreakdownRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2">
      <p className="min-w-0 truncate text-sm font-semibold text-gray-900">{label}</p>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-gray-950">{value}</p>
        <p className="text-xs text-gray-500">{detail}</p>
      </div>
    </div>
  );
}

function RecentUsage({ stats }: { stats: UsageStats | null }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5">
      <h2 className="text-lg font-bold text-gray-950">Recent generation events</h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-gray-50">
            <tr>
              <th className="px-3 py-2 font-medium text-gray-500">Time</th>
              <th className="px-3 py-2 font-medium text-gray-500">Status</th>
              <th className="px-3 py-2 font-medium text-gray-500">Calls</th>
              <th className="px-3 py-2 font-medium text-gray-500">Cost</th>
            </tr>
          </thead>
          <tbody>
            {(stats?.recent ?? []).map((event) => (
              <tr key={event.id} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-2 text-gray-500">{formatDateTime(event.createdAt)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${
                      event.outcome === "success"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {event.outcome}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-700">{event.requests}</td>
                <td className="px-3 py-2 text-gray-700">{formatCurrency(event.costUsd)}</td>
              </tr>
            ))}
            {(!stats || stats.recent.length === 0) && (
              <tr>
                <td className="px-3 py-6 text-sm text-gray-400" colSpan={4}>
                  No generation events recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WaitlistPanel({
  count,
  entries,
  loading,
  error,
}: {
  count: number | null;
  entries: Entry[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-950">Waitlist</h2>
          <p className="mt-1 text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{count ?? 0}</span> email
            {count !== 1 ? "s" : ""} on the list
          </p>
        </div>
      </div>

      {loading && <p className="mt-4 text-sm text-gray-500">Loading waitlist...</p>}
      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="mt-4 max-h-[22rem] overflow-auto rounded-lg border border-black/10">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-black/10 bg-gray-50">
              <tr>
                <th className="px-3 py-2 font-medium text-gray-500">#</th>
                <th className="px-3 py-2 font-medium text-gray-500">Email</th>
                <th className="px-3 py-2 font-medium text-gray-500">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.email} className="border-b border-black/5 last:border-0">
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 text-gray-900">{entry.email}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {entry.subscribedAt ? formatDateTime(entry.subscribedAt) : "-"}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-sm text-gray-400" colSpan={3}>
                    No entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatCurrency(value: number | null | undefined): string {
  return typeof value === "number" ? currency.format(value) : "-";
}

function formatInteger(value: number | null | undefined): string {
  return typeof value === "number" ? integer.format(value) : "-";
}

function formatDecimal(value: number | null | undefined): string {
  return typeof value === "number" ? decimal.format(value) : "-";
}

function formatPercent(value: number | null | undefined): string {
  return typeof value === "number" ? percent.format(value) : "-";
}

function formatDuration(value: number | null | undefined): string {
  if (typeof value !== "number") return "-";
  if (value < 1000) return `${integer.format(value)} ms`;
  return `${decimal.format(value / 1000)} sec`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
