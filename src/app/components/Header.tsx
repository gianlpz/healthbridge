import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-sm">H</span>
          </div>
          <span className="font-bold text-lg text-slate-900">HealthBridge</span>
        </Link>

        <a
          href="tel:111"
          className="text-sm font-medium text-primary hover:underline"
        >
          NHS 111
        </a>
      </div>
    </header>
  );
}
