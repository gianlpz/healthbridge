import { embed } from "ai";
import { google } from "@ai-sdk/google";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// --- Types ---

interface DocumentChunk {
  content: string;       // The text of this chunk
  source: string;        // Which file it came from (e.g., "headaches.md")
  embedding: number[];   // The vector representation of this chunk
}

// --- In-memory cache ---
// We load and embed documents once, then reuse them for every search.
// This avoids re-reading files and re-calling the embedding API on every request.
let cachedChunks: DocumentChunk[] | null = null;

// --- Core functions ---

/**
 * Load all markdown files from the /knowledge directory and split them into chunks.
 * Each chunk is roughly one section of a document (~200 words).
 */
function loadDocuments(): { content: string; source: string }[] {
  const knowledgeDir = join(process.cwd(), "src/app/api/chat/knowledge");
  const files = readdirSync(knowledgeDir).filter((f) => f.endsWith(".md"));

  const chunks: { content: string; source: string }[] = [];

  for (const file of files) {
    const text = readFileSync(join(knowledgeDir, file), "utf-8");

    // Split by ## headings — each section becomes its own chunk
    // This keeps related information together (e.g., "Self-Care" stays as one chunk)
    const sections = text.split(/\n(?=## )/).filter((s) => s.trim().length > 0);

    // Include the main heading (# Title) with each chunk for context
    const title = sections[0]?.split("\n")[0] || file;

    for (const section of sections) {
      chunks.push({
        content: `${title}\n\n${section}`.trim(),
        source: file,
      });
    }
  }

  console.log(`📚 Loaded ${chunks.length} chunks from ${files.length} knowledge files`);
  return chunks;
}

/**
 * Cosine similarity — measures how similar two vectors are.
 *
 * Think of vectors as arrows pointing in a direction. Cosine similarity measures
 * the angle between them:
 * - 1.0 = pointing the same direction (very similar meaning)
 * - 0.0 = perpendicular (unrelated)
 * - -1.0 = pointing opposite directions (opposite meaning)
 *
 * Formula: dot(A, B) / (magnitude(A) * magnitude(B))
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Load documents and compute their embeddings (only on first call).
 * Subsequent calls return the cached result.
 */
async function getEmbeddedChunks(): Promise<DocumentChunk[]> {
  if (cachedChunks) {
    console.log("⚡ Using cached document embeddings");
    return cachedChunks;
  }

  console.log("🔄 First request — loading and embedding knowledge documents...");

  const rawChunks = loadDocuments();

  // Embed each chunk using the Google embedding model
  // We do them one at a time to keep it simple and easy to debug
  const embeddedChunks: DocumentChunk[] = [];

  for (const chunk of rawChunks) {
    const { embedding } = await embed({
      model: google.embeddingModel("text-embedding-004"),
      value: chunk.content,
    });

    embeddedChunks.push({
      content: chunk.content,
      source: chunk.source,
      embedding,
    });
  }

  console.log(`✅ Embedded ${embeddedChunks.length} chunks`);
  cachedChunks = embeddedChunks;
  return cachedChunks;
}

/**
 * Search the knowledge base for chunks relevant to a query.
 *
 * This is the core RAG function:
 * 1. Embed the user's query into a vector
 * 2. Compare it to every document chunk using cosine similarity
 * 3. Return the top 3 most relevant chunks
 */
export async function searchKnowledge(query: string): Promise<string> {
  console.log(`\n🔍 RAG search: "${query}"`);

  // Step 1: Embed the query
  const { embedding: queryEmbedding } = await embed({
    model: google.embeddingModel("text-embedding-004"),
    value: query,
  });

  // Step 2: Get all document chunks (loads + embeds on first call)
  const chunks = await getEmbeddedChunks();

  // Step 3: Score every chunk by similarity to the query
  const scored = chunks.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // Step 4: Sort by score (highest first) and take top 3
  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, 3);

  // Log what we found — helpful for debugging
  console.log("📊 Top 3 matches:");
  for (const chunk of topChunks) {
    const preview = chunk.content.substring(0, 80).replace(/\n/g, " ");
    console.log(`   ${chunk.score.toFixed(3)} | ${chunk.source} | ${preview}...`);
  }

  // Step 5: Format the results as text for the AI to read
  const result = topChunks
    .map((chunk) => `--- From ${chunk.source} (relevance: ${chunk.score.toFixed(2)}) ---\n${chunk.content}`)
    .join("\n\n");

  return result;
}
