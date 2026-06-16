import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_API_URL || "https://api.openai.com/v1",
});

type YouTubeVideo = {
  title: string;
  url: string;
  channelName: string;
  thumbnailUrl: string;
};

async function searchYouTube(query: string, maxResults = 3): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json() as { items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails: { default: { url: string } } } }[] };
  if (!data.items) return [];

  return data.items.map((item) => ({
    title: item.snippet.title,
    url: `https://youtube.com/watch?v=${item.id.videoId}`,
    channelName: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails.default.url,
  }));
}

export async function generateStudyContent(documentId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, fileName: true, documentTitle: true, testFormat: true, questionCount: true },
  });

  if (!document) throw new Error("Document not found");

  const formatLabels: Record<string, string> = {
    "multiple-choice": "multiple choice",
    "flashcard": "flashcard",
    "multiple-true-false": "multiple true/false",
    "oral": "oral exam",
    "essay": "essay",
  };

  const formatLabel = formatLabels[document.testFormat] || document.testFormat;

  let questionsJsonExample: string;
  if (document.testFormat === "flashcard") {
    questionsJsonExample = `"questions": [
    { "front": "Question?", "back": "Answer." }
  ]`;
  } else if (document.testFormat === "essay") {
    questionsJsonExample = `"questions": [
    {
      "question": "Essay question?",
      "modelAnswer": "Key points to include in the answer..."
    }
  ]`;
  } else if (document.testFormat === "oral") {
    questionsJsonExample = `"questions": [
    {
      "question": "Oral exam question?",
      "expectedPoints": ["Key point 1", "Key point 2"]
    }
  ]`;
  } else {
    questionsJsonExample = `"questions": [
    {
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Why this answer is correct."
    }
  ]`;
  }

  const prompt = `You are an AI study assistant. Given a document titled "${document.documentTitle}", generate ${document.questionCount} ${formatLabel} questions.

Return JSON with this exact shape:
{
  "summary": "A concise 3-4 paragraph summary of the material",
  "simplifiedExplanation": "A simple analogy or explanation for beginners",
  ${questionsJsonExample}
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful study assistant that generates structured educational content." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No content generated");

    const parsed = JSON.parse(content);

    const [youtubeLinks] = await Promise.all([
      searchYouTube(`${document.documentTitle} tutorial`),
    ]);

    await prisma.studyContent.create({
      data: {
        documentId,
        summary: parsed.summary,
        simplifiedExplanation: parsed.simplifiedExplanation,
        flashcards: parsed.flashcards,
        quizQuestions: parsed.quizQuestions,
        youtubeLinks,
      },
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "READY" },
    });
  } catch (error) {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED", failureReason: (error as Error).message },
    });
    throw error;
  }
}
