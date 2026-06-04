"use client";

import { useState, type ClipboardEvent } from "react";
import type { Garment, GarmentType } from "@/lib/garments";

interface Props {
  onAdd: (garment: Garment) => void;
  garments: Garment[];
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

function firstHttpUrl(value: string): string | null {
  const match = value.match(/https?:\/\/[^\s<>"']+/i);
  if (!match) return null;

  try {
    return new URL(match[0]).toString();
  } catch {
    return null;
  }
}

const GARMENT_CARDS: { type: GarmentType; label: string; icon: string }[] = [
  { type: "top", label: "Top", icon: "👕" },
  { type: "bottom", label: "Bottom", icon: "👖" },
  { type: "shoes", label: "Shoes", icon: "👟" },
  { type: "jacket", label: "Outer", icon: "🧥" },
  { type: "hat", label: "Hat", icon: "🧢" },
  { type: "dress", label: "Dress", icon: "👗" },
];

/** Count how many garments of each type exist. */
function countByType(garments: Garment[]): Partial<Record<GarmentType, number>> {
  const counts: Partial<Record<GarmentType, number>> = {};
  for (const g of garments) {
    counts[g.type] = (counts[g.type] ?? 0) + 1;
  }
  return counts;
}

export default function AddGarmentForm({ onAdd, garments }: Props) {
  const [type, setType] = useState<GarmentType>("top");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = countByType(garments);
  const hasDress = (counts.dress ?? 0) > 0;
  const hasTopOrBottom = (counts.top ?? 0) > 0 || (counts.bottom ?? 0) > 0;

  function isTypeDisabled(t: GarmentType): boolean {
    if ((type === "dress" || hasDress) && (t === "top" || t === "bottom")) {
      return true;
    }
    if (hasTopOrBottom && t === "dress") return true;
    return false;
  }

  function guardSelectedType(): boolean {
    if (!isTypeDisabled(type)) return true;
    setError("A dress replaces top and bottom pieces in the same outfit.");
    return false;
  }

  async function addUrl(rawUrl: string) {
    const nextUrl = rawUrl.trim();
    if (!nextUrl) return;
    if (!guardSelectedType()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: nextUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't read that page.");
      onAdd({
        id: newId(),
        type,
        label: data.title?.slice(0, 60) || "",
        imageUrl: data.imageUrl,
        sourceUrl: nextUrl,
      });
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUrlAdd() {
    await addUrl(url);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!guardSelectedType()) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onAdd({
        id: newId(),
        type,
        label: file.name.replace(/\.[^.]+$/, "").slice(0, 60),
        imageUrl: dataUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClipboardText(text: string) {
    const pastedUrl = firstHttpUrl(text);
    if (!pastedUrl) {
      setError("Clipboard doesn't contain an image or link.");
      return;
    }
    setUrl(pastedUrl);
    await addUrl(pastedUrl);
  }

  async function handlePaste(e: ClipboardEvent<HTMLElement>) {
    if (busy) return;
    const files = Array.from(e.clipboardData.files);
    const file =
      files.find((f) => f.type.startsWith("image/")) ??
      Array.from(e.clipboardData.items)
        .find((item) => item.kind === "file" && item.type.startsWith("image/"))
        ?.getAsFile() ??
      undefined;

    if (file) {
      e.preventDefault();
      await handleFile(file);
      return;
    }

    const pastedUrl = firstHttpUrl(e.clipboardData.getData("text/plain"));
    if (!pastedUrl) return;
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    e.preventDefault();
    await handleClipboardText(pastedUrl);
  }

  async function handleClipboardAdd() {
    if (busy) return;
    setError(null);
    const clipboard = navigator.clipboard;

    try {
      if (clipboard && "read" in clipboard) {
        const items = await clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((itemType) =>
            itemType.startsWith("image/"),
          );
          if (imageType) {
            const blob = await item.getType(imageType);
            await handleFile(
              new File([blob], "clipboard-image", {
                type: blob.type || imageType,
              }),
            );
            return;
          }
        }
      }

      if (clipboard && "readText" in clipboard) {
        await handleClipboardText(await clipboard.readText());
        return;
      }

      setError("Use Cmd+V/Ctrl+V or upload an image instead.");
    } catch (err) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Clipboard access was blocked. Use Cmd+V/Ctrl+V or upload an image instead."
          : "Couldn't read from the clipboard.",
      );
    }
  }

  function selectType(t: GarmentType) {
    if (isTypeDisabled(t)) return;
    setType(t);
    setError(null);
  }

  /**
   * Figure out the visual state of a card:
   *  - active: currently selected for the next add
   *  - used: has garments of this type in the outfit (but not selected now)
   */
  function cardStyle(t: GarmentType): string {
    const disabled = isTypeDisabled(t);
    const active = type === t && !disabled;
    const used = (counts[t] ?? 0) > 0;

    if (disabled) {
      return "cursor-not-allowed border-[#151515]/15 bg-[#d8d2c6] text-[#746f67] opacity-60";
    }
    if (active) {
      return "border-[#151515] bg-[#151515] text-white shadow-[3px_3px_0_#ff6bb5]";
    }
    if (used) {
      return "border-[#151515] bg-[#f6ff70] text-[#151515]";
    }
    return "border-[#151515]/25 bg-white text-[#39352f] hover:border-[#151515]";
  }

  return (
    <section
      className="rounded-[1.6rem] border-2 border-[#151515] bg-[#fffaf0] p-4 shadow-[7px_7px_0_#151515]"
      onPaste={handlePaste}
    >
      <p className="text-xs font-black uppercase text-[#746f67]">Drop a piece</p>
      <h2 className="mb-4 text-xl font-black text-[#151515]">
        Add clothing
      </h2>

      <label className="mb-2 block text-xs font-black uppercase text-[#746f67]">
        What kind of item?
      </label>
      <div className="mb-3 grid grid-cols-5 gap-2">
        {GARMENT_CARDS.map((c) => (
          <button
            key={c.type}
            type="button"
            onClick={() => selectType(c.type)}
            disabled={isTypeDisabled(c.type)}
            className={`relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-center text-[#151515] transition ${cardStyle(c.type)}`}
          >
            {(counts[c.type] ?? 0) > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#151515] bg-[#62d8ff] text-[9px] font-black text-[#151515]">
                ✓
              </span>
            )}
            <span className="text-2xl leading-none">{c.icon}</span>
            <span className="text-[11px] font-black">{c.label}</span>
          </button>
        ))}
      </div>

      <label className="mb-1 block text-xs font-black uppercase text-[#746f67]">
        Paste a store link, image link, or clipboard photo
      </label>
      <div className="mb-3 flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleUrlAdd()}
          placeholder="https://store.com/product-or-image..."
          className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-[#151515] bg-white px-4 text-sm font-bold text-[#151515] outline-none placeholder:text-[#746f67] focus:ring-2 focus:ring-[#ff6bb5]"
          disabled={busy}
        />
        <button
          type="button"
          onClick={handleClipboardAdd}
          disabled={busy}
          className="shrink-0 rounded-2xl border-2 border-[#151515] bg-[#62d8ff] px-3 py-2 text-sm font-black text-[#151515] transition hover:bg-[#f6ff70] disabled:opacity-40"
        >
          Paste
        </button>
        <button
          type="button"
          onClick={handleUrlAdd}
          disabled={busy || !url.trim()}
          className="shrink-0 rounded-2xl border-2 border-[#151515] bg-[#151515] px-4 py-2 text-sm font-black text-white transition hover:bg-[#ff6bb5] hover:text-[#151515] disabled:opacity-40"
        >
          {busy ? "..." : "Add"}
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-[#746f67]">
        <span className="h-0.5 flex-1 bg-[#151515]" /> or{" "}
        <span className="h-0.5 flex-1 bg-[#151515]" />
      </div>

      <label className="flex min-h-14 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[#151515] bg-[#62d8ff] px-3 py-3 text-sm font-black text-[#151515] transition hover:bg-[#f6ff70]">
        Upload or paste an image
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      {error && <p className="mt-3 text-sm font-bold text-[#bf1f46]">{error}</p>}
    </section>
  );
}
