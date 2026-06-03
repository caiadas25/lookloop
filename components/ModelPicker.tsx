"use client";

import { MODEL_OPTIONS, type ModelKey } from "@/lib/model-options";

interface Props {
  selected: ModelKey;
  onSelect: (key: ModelKey) => void;
}

export default function ModelPicker({ selected, onSelect }: Props) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-black uppercase text-[#746f67]">
          Image model (via OpenRouter)
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MODEL_OPTIONS.map((m) => {
          const active = selected === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelect(m.key)}
              className={`min-h-20 rounded-2xl border-2 px-3 py-2 text-left transition ${
                active
                  ? "border-[#151515] bg-[#151515] text-white"
                  : "border-[#151515]/20 bg-white text-[#39352f] hover:border-[#151515]"
              }`}
            >
              <span className="block text-sm font-black leading-tight">{m.label}</span>
              <span
                className={`mt-1 block text-[11px] font-bold leading-tight ${
                  active ? "text-white/70" : "text-[#746f67]"
                }`}
              >
                {m.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
