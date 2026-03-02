type TriageLevel = "green" | "amber" | "red";

const triageConfig: Record<
  TriageLevel,
  { label: string; description: string; bgColor: string; textColor: string; borderColor: string }
> = {
  green: {
    label: "Self-care",
    description: "Your symptoms suggest self-care may be appropriate. Monitor and rest.",
    bgColor: "bg-green-50",
    textColor: "text-green-800",
    borderColor: "border-green-200",
  },
  amber: {
    label: "See your GP",
    description: "Consider booking a GP appointment or calling NHS 111 for advice.",
    bgColor: "bg-amber-50",
    textColor: "text-amber-800",
    borderColor: "border-amber-200",
  },
  red: {
    label: "Seek urgent care",
    description: "Please seek urgent medical attention. Call 999 or go to A&E.",
    bgColor: "bg-red-50",
    textColor: "text-red-800",
    borderColor: "border-red-200",
  },
};

export function TriageResult({ level }: { level: TriageLevel }) {
  const config = triageConfig[level];

  return (
    <div
      className={`mt-3 rounded-lg border p-3 ${config.bgColor} ${config.borderColor}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-3 h-3 rounded-full ${
            level === "green"
              ? "bg-green-500"
              : level === "amber"
              ? "bg-amber-500"
              : "bg-red-500"
          }`}
        />
        <span className={`text-sm font-semibold ${config.textColor}`}>
          {config.label}
        </span>
      </div>
      <p className={`text-xs mt-1 ${config.textColor}`}>{config.description}</p>
      {level === "red" && (
        <a
          href="tel:999"
          className="inline-block mt-2 text-xs font-semibold text-red-700 underline"
        >
          Call 999 now
        </a>
      )}
      {level === "amber" && (
        <a
          href="tel:111"
          className="inline-block mt-2 text-xs font-semibold text-amber-700 underline"
        >
          Call NHS 111
        </a>
      )}
    </div>
  );
}
