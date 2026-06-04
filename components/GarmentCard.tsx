"use client";

import {
  GARMENT_TYPES,
  GARMENT_TYPE_LABELS,
  type Garment,
  type GarmentType,
} from "@/lib/garments";

interface Props {
  garment: Garment;
  onChangeType: (id: string, type: GarmentType) => void;
  onRemove: (id: string) => void;
  isTypeDisabled?: (type: GarmentType, garment: Garment) => boolean;
}

export default function GarmentCard({
  garment,
  onChangeType,
  onRemove,
  isTypeDisabled,
}: Props) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-[#151515] bg-white p-3 shadow-[4px_4px_0_#151515]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={garment.imageUrl}
        alt={garment.label}
        className="h-16 w-16 shrink-0 rounded-xl border-2 border-[#151515] object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[#151515]" title={garment.label}>
          {garment.label}
        </p>
        <select
          value={garment.type}
          onChange={(e) => onChangeType(garment.id, e.target.value as GarmentType)}
          className="mt-2 rounded-full border-2 border-[#151515] bg-[#f6ff70] px-3 py-1 text-xs font-black text-[#151515]"
        >
          {GARMENT_TYPES.map((t) => (
            <option key={t} value={t} disabled={isTypeDisabled?.(t, garment) ?? false}>
              {GARMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={() => onRemove(garment.id)}
        aria-label="Remove"
        className="rounded-full border-2 border-[#151515] bg-[#ff6bb5] px-2 py-1 text-sm font-black text-[#151515] transition hover:bg-[#f6ff70]"
      >
        ✕
      </button>
    </div>
  );
}
