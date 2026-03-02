"use client";

interface SymptomCardProps {
  label: string;
  onClick: (symptom: string) => void;
}

export function SymptomCard({ label, onClick }: SymptomCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(label)}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:border-primary hover:text-primary transition-colors text-left"
    >
      {label}
    </button>
  );
}
