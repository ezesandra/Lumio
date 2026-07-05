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

export async function searchYouTube(query: string, maxResults = 3): Promise<YouTubeVideo[]> {
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

export async function generateStudyContent(documentId: string, fileContent?: string) {
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
  } else if (document.testFormat === "multiple-true-false") {
    questionsJsonExample = `"questions": [
    {
      "question": "Statement text?",
      "options": ["True", "False"],
      "correctIndex": 0,
      "explanation": "Why this statement is true or false."
    }
  ]`;
  } else {
    questionsJsonExample = `"questions": [
    {
      "question": "Question text?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct."
    }
  ]`;
  }

  const contentSection = fileContent
    ? `\n\nHere is the document content:\n\n${fileContent.slice(0, 50000)}`
    : "";

const prompt = `You are an AI study assistant. Given a document titled "${document.documentTitle}"${contentSection}, generate ${document.questionCount} ${formatLabel} questions.

Return JSON with this exact shape:
{
  "summary": "A concise 3-4 paragraph summary of the material",
  "simplifiedExplanation": "A simple analogy or explanation for beginners",
  "youtubeSearchQuery": "A highly specific 3-5 word search query to find the best tutorial videos on YouTube for the main topic of this document (e.g. 'Photosynthesis biology tutorial', 'React hooks explanation')",
  ${document.testFormat !== "flashcard" ? `"flashcards": [
    { "id": "uuid1", "front": "Concept?", "back": "Definition." }
  ],` : ""}
  ${questionsJsonExample}
}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL_NAME || "gpt-4o-mini",
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
      searchYouTube(parsed.youtubeSearchQuery || `${document.documentTitle} tutorial`),
    ]);

    const isFlashcard = document.testFormat === "flashcard";

    await prisma.studyContent.create({
      data: {
        documentId,
        summary: parsed.summary,
        simplifiedExplanation: parsed.simplifiedExplanation,
        flashcards: isFlashcard ? (parsed.questions ?? []) : (parsed.flashcards ?? []),
        quizQuestions: !isFlashcard ? (parsed.questions ?? []) : [],
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

export async function generateQuizOnly(documentId: string, fileContent: string, testFormat: string, questionCount: number) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, documentTitle: true },
  });

  if (!document) throw new Error("Document not found");

  const formatLabels: Record<string, string> = {
    "multiple-choice": "multiple choice",
    "flashcard": "flashcard",
    "multiple-true-false": "multiple true/false",
    "oral": "oral exam",
    "essay": "essay",
  };

  const formatLabel = formatLabels[testFormat] || testFormat;

  let questionsJsonExample: string;
  if (testFormat === "flashcard") {
    questionsJsonExample = `"questions": [
    { "front": "Question?", "back": "Answer." }
  ]`;
  } else if (testFormat === "essay") {
    questionsJsonExample = `"questions": [
    {
      "question": "Essay question?",
      "modelAnswer": "Key points to include in the answer..."
    }
  ]`;
  } else if (testFormat === "oral") {
    questionsJsonExample = `"questions": [
    {
      "question": "Oral exam question?",
      "expectedPoints": ["Key point 1", "Key point 2"]
    }
  ]`;
  } else if (testFormat === "multiple-true-false") {
    questionsJsonExample = `"questions": [
    {
      "question": "Statement text?",
      "options": ["True", "False"],
      "correctIndex": 0,
      "explanation": "Why this statement is true or false."
    }
  ]`;
  } else {
    questionsJsonExample = `"questions": [
    {
      "question": "Question text?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctIndex": 0,
      "explanation": "Why this answer is correct."
    }
  ]`;
  }

  const contentSection = fileContent
    ? `\n\nHere is the document content:\n\n${fileContent.slice(0, 50000)}`
    : "";

  const prompt = `You are an AI study assistant. Given a document titled "${document.documentTitle}"${contentSection}, generate ${questionCount} ${formatLabel} questions.

Return JSON with this exact shape:
{
  ${questionsJsonExample}
}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL_NAME || "gpt-4o-mini",
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
    const generatedQuestions = parsed.questions ?? [];

    await prisma.studyContent.update({
      where: { documentId },
      data: {
        quizQuestions: generatedQuestions,
      },
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { 
        status: "READY",
        testFormat,
        questionCount,
      },
    });
  } catch (error) {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED", failureReason: (error as Error).message },
    });
    throw error;
  }
}
