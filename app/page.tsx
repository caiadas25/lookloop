"use client";

import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("success");
      setMessage(data.message);
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Lookloop
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          See how outfits look before you buy them.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Paste links to clothing from any store. Lookloop composites everything onto one model
          so you can judge how items layer together.
        </p>
      </div>

      {/* How it works */}
      <div className="mt-16 grid max-w-lg grid-cols-1 gap-8 sm:grid-cols-3">
        <Step
          number="1"
          title="Add items"
          description="Paste store links or upload photos of clothing you're considering."
        />
        <Step
          number="2"
          title="One click"
          description="Lookloop composes the full outfit onto a single model in one AI-generated image."
        />
        <Step
          number="3"
          title="Decide"
          description="See how everything layers together before you spend a cent."
        />
      </div>

      {/* Email signup */}
      <div className="mt-16 w-full max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
          <label htmlFor="email" className="text-sm font-medium text-gray-700">
            Get notified when we launch
          </label>
          <div className="flex w-full gap-2">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              placeholder="you@example.com"
              required
              className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="shrink-0 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50"
            >
              {status === "loading" ? "…" : "Notify me"}
            </button>
          </div>
          {message && (
            <p
              className={`text-sm ${
                status === "success" ? "text-green-600" : "text-red-500"
              }`}
            >
              {message}
            </p>
          )}
        </form>
        <p className="mt-4 text-center text-xs text-gray-400">
          No spam. Just a one-time email when Lookloop is ready.
        </p>
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-16 pb-8 text-xs text-gray-300">
        © {new Date().getFullYear()} Lookloop
      </footer>
    </main>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
        {number}
      </div>
      <h2 className="mt-3 text-sm font-semibold text-gray-800">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
    </div>
  );
}
