"use client";

import { MANNEQUIN } from "@/lib/models";

interface Props {
  selected: string;
  onSelect: (src: string) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

export default function BaseModelPicker({ selected, onSelect }: Props) {
  const isCustom = selected.startsWith("data:");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    onSelect(await readFileAsDataUrl(file));
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-gray-800">Base model</h2>
      <p className="mb-3 text-xs text-gray-500">
        Put the outfit on an AI-generated mannequin, or upload a real front-facing photo for
        try-on on a specific person.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => onSelect(MANNEQUIN)}
          className={`flex h-28 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 text-center transition ${
            selected === MANNEQUIN
              ? "border-gray-900 bg-gray-50"
              : "border-transparent bg-gray-50 hover:border-black/20"
          }`}
        >
          <span aria-hidden className="text-3xl">
            🧍
          </span>
          <span className="text-xs font-medium text-gray-700">Mannequin</span>
          <span className="text-[10px] text-gray-400">AI-generated</span>
        </button>

        {isCustom && (
          <div className="relative h-28 w-24 overflow-hidden rounded-lg border-2 border-gray-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected} alt="Custom base" className="h-full w-full object-cover" />
            <span className="absolute bottom-0 w-full bg-black/60 py-0.5 text-center text-[10px] text-white">
              Your photo
            </span>
          </div>
        )}

        <label
          className={`flex h-28 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-center text-[11px] leading-tight text-gray-500 hover:bg-gray-50 ${
            isCustom ? "border-black/20" : "border-black/20"
          }`}
        >
          {isCustom ? "Replace photo" : "Upload photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      </div>
    </div>
  );
}
