"use client";

import { useChat } from "@ai-sdk/react";
import { useRef, useEffect, useState } from "react";
import { Header } from "../components/Header";
import { DisclaimerBanner } from "../components/DisclaimerBanner";
import { ChatMessage } from "../components/ChatMessage";
import { ChatInput } from "../components/ChatInput";
import { SymptomCard } from "../components/SymptomCard";

const SUGGESTED_SYMPTOMS = [
  "I have a headache that won't go away",
  "I've had a sore throat for 3 days",
  "My stomach has been hurting after eating",
  "I feel dizzy when I stand up",
];

export default function ChatPage() {
  const { messages, sendMessage, status } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    const text = input.trim();
    setInput("");
    sendMessage({ text });
  };

  const handleSymptomClick = (symptom: string) => {
    sendMessage({ text: symptom });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <DisclaimerBanner />

      {/* Chat area */}
      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                <span className="text-primary text-xl font-bold">H</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                How can I help you today?
              </h2>
              <p className="text-sm text-slate-500 max-w-sm mb-8">
                Describe your symptoms in your own words, or choose a common
                concern below.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTED_SYMPTOMS.map((symptom) => (
                  <SymptomCard
                    key={symptom}
                    label={symptom}
                    onClick={handleSymptomClick}
                  />
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <ChatInput
            input={input}
            onChange={(e) => setInput(e.target.value)}
            onSubmit={handleSubmit}
            isLoading={isBusy}
          />
          <p className="text-xs text-slate-400 text-center mt-2">
            Not medical advice. If in doubt, call{" "}
            <a href="tel:111" className="underline">
              NHS 111
            </a>{" "}
            or{" "}
            <a href="tel:999" className="underline text-red-500">
              999
            </a>{" "}
            for emergencies.
          </p>
        </div>
      </main>
    </div>
  );
}
