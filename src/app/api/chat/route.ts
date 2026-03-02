import { google } from "@ai-sdk/google";
import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import { z } from "zod";
import { searchKnowledge } from "./rag";

const SYSTEM_PROMPT = `You are HealthBridge, a helpful and empathetic health information assistant. Your role is to provide general health information to help people understand their symptoms and decide on appropriate next steps.

IMPORTANT RULES:
1. You are NOT a doctor. You do NOT diagnose conditions. You provide GENERAL HEALTH INFORMATION only.
2. Always remind users that your guidance does not replace professional medical advice.
3. Ask clarifying questions about symptoms: duration, severity (1-10), location, what makes it better/worse, any other symptoms.
4. Be warm, calm, and reassuring in your tone.
5. Keep responses concise and easy to understand — avoid complex medical jargon.

TRIAGE SYSTEM:
After gathering enough information, include ONE of these tags at the END of your response:

[TRIAGE: GREEN] — Symptoms suggest self-care is appropriate (e.g., common cold, minor headache, mild muscle ache). Suggest rest, hydration, over-the-counter remedies.

[TRIAGE: AMBER] — Symptoms warrant professional attention (e.g., persistent pain lasting days, unexplained weight loss, recurring symptoms). Recommend booking a GP appointment or calling NHS 111.

[TRIAGE: RED] — Symptoms suggest urgent or emergency care needed (e.g., chest pain, difficulty breathing, signs of stroke, severe allergic reaction, heavy bleeding). Direct to call 999 or go to A&E immediately.

SAFETY RULES:
- If someone mentions chest pain, difficulty breathing, stroke symptoms (face drooping, arm weakness, speech difficulty), severe bleeding, loss of consciousness, or suicidal thoughts — IMMEDIATELY respond with [TRIAGE: RED] and direct them to call 999.
- Never suggest specific prescription medications.
- Never provide dosage information for any medication.
- Always suggest seeing a healthcare professional for persistent or worsening symptoms.
- If unsure, err on the side of caution and recommend seeing a GP.

MULTI-STEP WORKFLOW:
You have access to multiple tools. Use them in sequence to build a thorough assessment:

1. searchHealthInfo — Look up symptoms in the knowledge base. Always start here.
2. checkSymptomInteractions — If the user reports 2+ symptoms, check if the combination is dangerous.
3. assessSeverity — If the user provides duration and pain level, assess severity with structured rules.

You do NOT need to use all tools every time. Choose based on what information the user has given you:
- Single vague symptom ("my head hurts") → search only, then ask follow-ups
- Multiple symptoms with details → search, check interactions, assess severity
- Emergency symptoms (chest pain, breathing difficulty) → skip tools, go straight to [TRIAGE: RED]

AGENT BEHAVIOR:
- Think step by step. After each tool result, decide whether you need more information before responding.
- You can call tools in sequence across multiple steps — you don't have to do everything at once.
- Synthesize ALL tool results into a single, coherent response at the end.
- When you have enough information, provide your triage recommendation.
- Do not tell the user which tools you are using — just provide helpful health information.

FIRST MESSAGE:
When a user first describes their symptoms, ask 2-3 focused follow-up questions before providing any triage recommendation. Only include a triage tag after you have enough information to make a reasonable assessment.

FORMATTING:
- Use short paragraphs
- Use simple, everyday language
- Be direct but compassionate`;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: google("gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    temperature: 0.2,
    maxOutputTokens: 500,
    tools: {
      // RAG-powered tool — searches the knowledge base using embeddings
      searchHealthInfo: tool({
        description:
          "Search the health knowledge base for information about symptoms, conditions, or health topics. Returns relevant passages from medical reference documents.",
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              "The health topic or symptom to search for (e.g., 'tension headache causes', 'knee pain when walking', 'fever in children')"
            ),
        }),
        execute: async ({ query }) => {
          console.log(`\n🔧 AI called searchHealthInfo("${query}")`);
          const results = await searchKnowledge(query);
          return { results };
        },
      }),

      // Checks if a combination of symptoms could indicate something more serious
      checkSymptomInteractions: tool({
        description:
          "Check if a combination of symptoms together could indicate a more serious condition than each symptom alone. Use this when the user reports 2 or more symptoms.",
        inputSchema: z.object({
          symptoms: z
            .array(z.string())
            .describe(
              "List of symptoms to check for dangerous combinations (e.g., ['headache', 'fever', 'stiff neck'])"
            ),
        }),
        execute: async ({ symptoms }) => {
          console.log(
            `\n🔧 AI called checkSymptomInteractions(${JSON.stringify(symptoms)})`
          );

          // Hardcoded lookup table of known dangerous symptom combinations
          const dangerousCombinations = [
            {
              symptoms: ["headache", "fever", "stiff neck"],
              condition: "Possible meningitis",
              severity: "RED",
              advice: "Seek emergency care immediately. This combination can indicate meningitis.",
            },
            {
              symptoms: ["headache", "fever"],
              condition: "Possible infection or flu",
              severity: "AMBER",
              advice: "Monitor closely. If stiff neck develops, seek emergency care.",
            },
            {
              symptoms: ["dizziness", "chest pain"],
              condition: "Possible cardiac event",
              severity: "RED",
              advice: "Call emergency services immediately. Do not wait.",
            },
            {
              symptoms: ["dizziness", "nausea", "headache"],
              condition: "Possible migraine or vestibular issue",
              severity: "AMBER",
              advice: "Rest in a dark room. See a GP if symptoms persist.",
            },
            {
              symptoms: ["fever", "sore throat", "fatigue"],
              condition: "Possible viral infection (mono, flu)",
              severity: "AMBER",
              advice: "Rest and hydrate. See a GP if symptoms worsen or last more than a week.",
            },
            {
              symptoms: ["stomach pain", "fever", "vomiting"],
              condition: "Possible appendicitis or food poisoning",
              severity: "AMBER",
              advice: "If pain is in the lower right abdomen, seek urgent care.",
            },
            {
              symptoms: ["chest pain", "shortness of breath"],
              condition: "Possible cardiac or pulmonary emergency",
              severity: "RED",
              advice: "Call 999 immediately.",
            },
          ];

          // Normalize symptoms to lowercase for matching
          const normalizedSymptoms = symptoms.map((s) => s.toLowerCase());

          // Find matching combinations (all combo symptoms must be present)
          const matches = dangerousCombinations.filter((combo) =>
            combo.symptoms.every((s) =>
              normalizedSymptoms.some((ns) => ns.includes(s))
            )
          );

          if (matches.length === 0) {
            return {
              found: false,
              message: "No known dangerous interactions found for this combination.",
              recommendation: "Assess each symptom individually.",
            };
          }

          // Return the most severe match (RED > AMBER > GREEN)
          const severityOrder = ["RED", "AMBER", "GREEN"];
          const sorted = matches.sort(
            (a, b) =>
              severityOrder.indexOf(a.severity) -
              severityOrder.indexOf(b.severity)
          );

          return {
            found: true,
            topMatch: sorted[0],
            allMatches: sorted,
          };
        },
      }),

      // Generates a structured severity assessment based on duration and pain
      assessSeverity: tool({
        description:
          "Assess the severity of a symptom based on how long the user has had it and their pain level. Use this after gathering duration and pain information from the user.",
        inputSchema: z.object({
          symptom: z.string().describe("The main symptom being assessed"),
          duration_days: z
            .number()
            .describe("How many days the user has had this symptom"),
          pain_level: z
            .number()
            .min(1)
            .max(10)
            .describe("Pain level on a scale of 1-10"),
        }),
        execute: async ({ symptom, duration_days, pain_level }) => {
          console.log(
            `\n🔧 AI called assessSeverity("${symptom}", ${duration_days} days, ${pain_level}/10)`
          );

          // Rule-based severity logic
          let severity: "LOW" | "MODERATE" | "HIGH";
          let recommendation: string;

          if (pain_level >= 8 || duration_days >= 14) {
            severity = "HIGH";
            recommendation =
              "This combination of pain and duration warrants prompt medical attention. Recommend seeing a GP urgently or visiting urgent care.";
          } else if (pain_level >= 5 || duration_days >= 5) {
            severity = "MODERATE";
            recommendation =
              "Symptoms are beyond typical self-care territory. Recommend booking a GP appointment within the next few days.";
          } else {
            severity = "LOW";
            recommendation =
              "Symptoms are within the range where self-care is usually appropriate. Monitor and see a GP if things worsen.";
          }

          return {
            symptom,
            duration_days,
            pain_level,
            severity,
            recommendation,
            flags: {
              longDuration: duration_days >= 7,
              highPain: pain_level >= 7,
              chronicRisk: duration_days >= 14,
            },
          };
        },
      }),
    },
    stopWhen: stepCountIs(5), // room for 3 tool calls + synthesis + response
    onStepFinish({ stepNumber, toolCalls, text, finishReason }) {
      const stepType = toolCalls.length > 0 ? "TOOL" : "TEXT";
      const continues = finishReason === "tool-calls";
      console.log(`\n${"─".repeat(50)}`);
      console.log(
        `📍 Step ${stepNumber + 1} complete | Type: ${stepType} | Continues: ${continues}`
      );

      if (toolCalls.length > 0) {
        for (const tc of toolCalls) {
          console.log(`   🔧 Called: ${tc.toolName}`);
          console.log(`   📥 Input: ${JSON.stringify(tc.input)}`);
        }
      }

      if (text) {
        const preview = text.length > 150 ? text.slice(0, 150) + "..." : text;
        console.log(`   💬 Response: ${preview}`);
      }

      console.log(`${"─".repeat(50)}`);
    },
  });

  return result.toUIMessageStreamResponse();
}
