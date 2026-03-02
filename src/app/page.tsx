import Link from "next/link";
import { Header } from "./components/Header";
import { DisclaimerBanner } from "./components/DisclaimerBanner";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <DisclaimerBanner />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Hero */}
        <div className="max-w-2xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm text-teal-700 border border-teal-200">
            <span className="inline-block w-2 h-2 rounded-full bg-teal-500" />
            AI-Powered Health Guidance
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
            Understand your symptoms,
            <br />
            <span className="text-primary">know your next step</span>
          </h1>

          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Describe how you&apos;re feeling in your own words. HealthBridge
            provides general health information and helps you decide whether to
            self-care, see your GP, or seek urgent help.
          </p>

          <Link
            href="/chat"
            className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl px-8 py-4 text-lg transition-colors"
          >
            Start Assessment
          </Link>
        </div>

        {/* How it works */}
        <div className="mt-16 max-w-3xl w-full">
          <h2 className="text-xl font-semibold text-slate-900 text-center mb-8">
            How it works
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <StepCard
              step="1"
              title="Describe symptoms"
              description="Tell us what you're experiencing in your own words"
            />
            <StepCard
              step="2"
              title="Get guidance"
              description="Receive general health information based on your symptoms"
            />
            <StepCard
              step="3"
              title="Know your next step"
              description="See a clear recommendation: self-care, GP, or urgent care"
            />
          </div>
        </div>

        {/* Important notice */}
        <div className="mt-12 max-w-2xl w-full bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 text-sm font-medium">Important</p>
          <p className="text-amber-700 text-sm mt-1">
            HealthBridge provides general health information only. It does not
            diagnose conditions or replace professional medical advice. If you
            are experiencing a medical emergency, call{" "}
            <strong>999</strong> immediately.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 px-4 text-center text-sm text-slate-500">
        <p>
          If you need immediate help, call{" "}
          <a href="tel:111" className="text-primary font-medium hover:underline">
            NHS 111
          </a>{" "}
          or{" "}
          <a href="tel:999" className="text-red-600 font-medium hover:underline">
            999 for emergencies
          </a>
        </p>
      </footer>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-teal-100 text-primary font-bold text-sm mb-3">
        {step}
      </div>
      <h3 className="font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}
