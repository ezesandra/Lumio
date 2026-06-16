# SKILL.md — AI Content Generator

## Purpose

This skill covers the complete AI processing pipeline in Lumio — extracting text from uploaded files, calling the AI API to generate study content (summaries, explanations, flashcards, quizzes), fetching YouTube recommendations, storing results, and handling retries and failures gracefully.

---

## When to Use This Skill

- Building or modifying the AI processing pipeline
- Adding new AI-generated content types
- Debugging AI generation failures or empty outputs
- Implementing the YouTube recommendation feature
- Writing tests for AI content generation

---

## Pipeline Overview

```
Document uploaded
  → Extract text from file
  → Validate minimum content threshold
  → Send to AI API → structured output
  → Parse and store StudyContent
  → Fetch YouTube links from YouTube Data API
  → Update Document status to READY
  → Notify client (polling or webhook)
```

All steps run **asynchronously** — the upload endpoint returns `202 Accepted` immediately.

---

## Step 1 — Text Extraction (`lib/extractor.ts`)

```ts
import mammoth from "mammoth"
import * as pdfParse from "pdf-parse"
import * as JSZip from "jszip"

export type ExtractionResult = {
  text:  string
  pages: number
}

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  switch (mimeType) {
    case "application/pdf": {
      const data = await pdfParse(buffer)
      return { text: data.text, pages: data.numpages }
    }

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      const { value } = await mammoth.extractRawText({ buffer })
      return { text: value, pages: 1 }
    }

    case "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
      const text = await extractTextFromPptx(buffer)
      return { text, pages: text.split("\n").length }
    }

    case "text/plain": {
      return { text: buffer.toString("utf-8"), pages: 1 }
    }

    case "image/jpeg":
    case "image/png":
    case "image/webp": {
      // OCR via AI API vision endpoint
      return extractTextFromImage(buffer, mimeType)
    }

    default:
      throw new Error(`Unsupported MIME type: ${mimeType}`)
  }
}

async function extractTextFromImage(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  const base64 = buffer.toString("base64")
  const dataUri = `data:${mimeType};base64,${base64}`

  const response = await fetch(process.env.AI_API_URL!, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL ?? "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Extract all text from this image. Return only the extracted text, no preamble." },
          { type: "image_url", image_url: { url: dataUri } },
        ],
      }],
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`AI Vision API error: ${response.status} — ${err}`)
  }

  const data = await response.json()
  const text = data.choices[0].message.content.trim()
  return { text, pages: 1 }
}

async function extractTextFromPptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const slideRegex = /^ppt\/slides\/slide(\d+)\.xml$/
  const slideEntries = Object.entries(zip.files)
    .filter(([name]) => slideRegex.test(name))
    .sort(([a], [b]) => {
      const na = parseInt(a.match(slideRegex)![1], 10)
      const nb = parseInt(b.match(slideRegex)![1], 10)
      return na - nb
    })

  const texts: string[] = []
  for (const [, file] of slideEntries) {
    const content = await file.async("text")
    const textMatches = content.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? []
    const slideText = textMatches.map(m => m.replace(/<\/?a:t[^>]*>/g, "")).join(" ").trim()
    if (slideText) texts.push(slideText)
  }

  return texts.join("\n\n")
}
```

Install required packages:
```bash
npm install mammoth pdf-parse jszip
```

---

## Step 2 — AI API Call (`lib/ai.ts`)

Install Zod for response validation:
```bash
npm install zod
```

```ts
import { z } from "zod"

const MIN_CONTENT_CHARS = 200
const MAX_INPUT_CHARS   = Number(process.env.AI_MAX_INPUT_CHARS) || 12000
const AI_MODEL          = process.env.AI_MODEL ?? "gpt-4o"

export type AIStudyContent = z.infer<typeof AIStudyContentSchema>

export type Flashcard = {
  term:       string
  definition: string
}

export type QuizQuestion = {
  text:         string
  options:      string[]
  correctIndex: number
  explanation:  string
}

const FlashcardSchema = z.object({
  term:       z.string().min(1),
  definition: z.string().min(1),
})

const QuizQuestionSchema = z.object({
  text:         z.string().min(1),
  options:      z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation:  z.string().min(1),
})

const AIStudyContentSchema = z.object({
  summary:               z.string().min(1),
  simplifiedExplanation: z.string().nullable(),
  flashcards:            z.array(FlashcardSchema),
  quizQuestions:         z.array(QuizQuestionSchema),
  suggestedTopics:       z.array(z.string()),
})

export async function generateStudyContent(
  text:     string,
  topicTag: string,
  tier:     string
): Promise<AIStudyContent> {
  if (text.length < MIN_CONTENT_CHARS) {
    throw new ContentTooShortError(
      "Not enough content to generate study materials. Please upload a longer document."
    )
  }

  const includeSimplification = tier !== "FREE"
  const truncatedText         = text.slice(0, MAX_INPUT_CHARS)
  const prompt                = buildPrompt(truncatedText, topicTag, includeSimplification)

  const response = await fetch(process.env.AI_API_URL!, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model:      AI_MODEL,
      messages:   [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`AI API error: ${response.status} — ${err}`)
  }

  const data    = await response.json()
  const content = AIStudyContentSchema.parse(JSON.parse(data.choices[0].message.content))

  return content
}

function buildPrompt(text: string, topicTag: string, includeSimplification: boolean): string {
  return `
You are a study assistant. Analyze the following academic content about "${topicTag}" and return a JSON object with this exact structure:

{
  "summary": "A concise 3-5 sentence summary of the key points.",
  ${includeSimplification ? `"simplifiedExplanation": "A plain-language explanation a 15-year-old could understand.",` : `"simplifiedExplanation": null,`}
  "flashcards": [
    { "term": "Key Term", "definition": "Clear definition" }
  ],
  "quizQuestions": [
    {
      "text": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct."
    }
  ],
  "suggestedTopics": ["Topic 1", "Topic 2"]
}

Rules:
- Generate at least 5 flashcards and 5 quiz questions if content allows.
- All quiz questions must have exactly 4 options and one correct answer.
- Return only valid JSON — no markdown, no preamble.
- If content is insufficient for a section, return an empty array.

Content to analyze:
---
${text.slice(0, MAX_INPUT_CHARS)}
---
`.trim()
}

export class ContentTooShortError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ContentTooShortError"
  }
}
```

---

## Step 3 — YouTube Recommendations (`lib/youtube.ts`)

```ts
export type YouTubeVideo = {
  title:     string
  url:       string
  thumbnail: string
  channelName: string
}

const YOUTUBE_MAX_RESULTS = Number(process.env.YOUTUBE_MAX_RESULTS) || 3

export async function fetchYouTubeRecommendations(
  topicTag: string
): Promise<YouTubeVideo[]> {
  if (!process.env.YOUTUBE_API_KEY) return []  // Graceful no-op

  try {
    const query    = encodeURIComponent(`${topicTag} explained lecture`)
    const url      = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=${YOUTUBE_MAX_RESULTS}&key=${process.env.YOUTUBE_API_KEY}`
    const response = await fetch(url)

    if (!response.ok) return []

    const data = await response.json()

    return (data.items ?? []).map((item: any) => ({
      title:       item.snippet.title,
      url:         `https://www.youtube.com/watch?v=${item.id.videoId}`,
      thumbnail:   item.snippet.thumbnails.medium.url,
      channelName: item.snippet.channelTitle,
    }))
  } catch {
    return []  // Never block AI content if YouTube fails
  }
}
```

---

## Step 4 — Main Processing Job (`lib/process-document.ts`)

```ts
import { prisma } from "@/lib/prisma"
import { extractTextFromFile } from "@/lib/extractor"
import { generateStudyContent, ContentTooShortError } from "@/lib/ai"
import { fetchYouTubeRecommendations } from "@/lib/youtube"
import { downloadFromStorage } from "@/lib/storage"

async function callAIWithRetry(
  text: string, topicTag: string, tier: string
): Promise<Awaited<ReturnType<typeof generateStudyContent>>> {
  try {
    return await generateStudyContent(text, topicTag, tier)
  } catch (error) {
    if (error instanceof ContentTooShortError) throw error
    console.warn("[AI] First attempt failed, retrying once...")
    await new Promise(r => setTimeout(r, 2000))
    return await generateStudyContent(text, topicTag, tier)
  }
}

export async function processDocument(documentId: string): Promise<void> {
  const document = await prisma.document.findUnique({
    where:  { id: documentId },
    select: { id: true, userId: true, fileUrl: true, topicTag: true },
  })
  if (!document) throw new Error(`Document ${documentId} not found`)

  const user = await prisma.user.findUnique({
    where:  { id: document.userId },
    select: { subscriptionTier: true },
  })

  try {
    // 1. Download file from storage
    const { buffer, mimeType } = await downloadFromStorage(document.fileUrl)

    // 2. Extract text
    const { text } = await extractTextFromFile(buffer, mimeType)

    // 3. Generate study content (with automatic retry on transient failure)
    const aiContent = await callAIWithRetry(text, document.topicTag, user?.subscriptionTier ?? "FREE")

    // 4. Fetch YouTube recommendations (non-blocking — won't fail the pipeline)
    const youtubeLinks = await fetchYouTubeRecommendations(document.topicTag)

    // 5. Store StudyContent and update Document status atomically
    await prisma.$transaction([
      prisma.studyContent.create({
        data: {
          documentId:            document.id,
          summary:               aiContent.summary,
          simplifiedExplanation: aiContent.simplifiedExplanation,
          flashcards:            aiContent.flashcards,
          quizQuestions:         aiContent.quizQuestions,
          youtubeLinks,
        },
      }),
      prisma.document.update({
        where: { id: document.id },
        data:  { status: "READY" },
      }),
    ])
  } catch (error) {
    const isTooShort = error instanceof ContentTooShortError
    let failureReason: string

    if (isTooShort) {
      failureReason = "content_too_short"
    } else {
      failureReason = "ai_processing_failed"
      console.error(`[processDocument] ${documentId}`, error)
    }

    await prisma.document.update({
      where: { id: document.id },
      data:  {
        status:        "FAILED",
        failureReason,
      },
    })
  }
}
```

---

## Step 5 — Trigger From Upload Route

```ts
// In app/api/upload/route.ts — after creating the Document record:

import { processDocument } from "@/lib/process-document"

// Non-blocking fire-and-forget
processDocument(document.id).catch(err =>
  console.error("[upload] processDocument failed", err)
)

return NextResponse.json({ documentId: document.id, status: "processing" }, { status: 202 })
```

---

## Error States & Client Messages

| Error | `failureReason` | Document Status | Client Message |
|---|---|---|---|
| Content too short | `content_too_short` | `FAILED` | `"Not enough content to generate questions. Try uploading a longer document."` |
| AI API failure (after retry) | `ai_processing_failed` | `FAILED` | `"We couldn't generate your study content. Please try again."` |
| YouTube API unavailable | `null` | `READY` | YouTube section hidden; AI content shown normally |
| Unsupported file type | Rejected at upload | Rejected at upload | `"Please upload a PDF, DOCX, PPTX, image, or TXT file."` |

---

## Processing Checklist

- [ ] Text extraction handles PDF, DOCX, PPTX, TXT, and image files
- [ ] PPTX text extracted from slide XML (`<a:t>` elements) via JSZip
- [ ] Image OCR calls AI vision API with base64 data URI
- [ ] Minimum content threshold checked before AI call
- [ ] AI prompt requests valid JSON only (no markdown fences)
- [ ] Input text truncated to `AI_MAX_INPUT_CHARS` (default 12000) before prompt construction
- [ ] AI response validated with Zod schema — rejects malformed output
- [ ] YouTube failure never blocks AI content from being stored
- [ ] YouTube `maxResults` is config-driven via `YOUTUBE_MAX_RESULTS`
- [ ] `StudyContent` and `Document.status = READY` updated in a single transaction
- [ ] First AI failure triggers one retry with 2-second backoff
- [ ] `ContentTooShortError` is not retried — fails immediately with clear message
- [ ] `failureReason` is persisted on Document for client-side message mapping
- [ ] `simplifiedExplanation` is `null` for Free tier users