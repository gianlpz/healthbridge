import type { UIMessage } from "ai";
import { TriageResult } from "./TriageResult";

type TriageLevel = "green" | "amber" | "red";

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function extractTriageLevel(content: string): TriageLevel | null {
  const lower = content.toLowerCase();
  if (lower.includes("[triage: red]")) return "red";
  if (lower.includes("[triage: amber]")) return "amber";
  if (lower.includes("[triage: green]")) return "green";
  return null;
}

function stripTriageTag(content: string): string {
  return content.replace(/\[triage:\s*(red|amber|green)\]/gi, "").trim();
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = getTextContent(message);
  const triageLevel = !isUser ? extractTriageLevel(text) : null;
  const displayContent = !isUser ? stripTriageTag(text) : text;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-white rounded-br-md"
            : "bg-white border border-slate-200 text-slate-700 rounded-bl-md"
        }`}
      >
        <div className="whitespace-pre-wrap">{displayContent}</div>
        {triageLevel && <TriageResult level={triageLevel} />}
      </div>
    </div>
  );
}
