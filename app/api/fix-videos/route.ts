import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchYouTube } from "@/lib/ai";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_API_URL || "https://api.openai.com/v1",
});

export async function GET() {
  const contents = await prisma.studyContent.findMany({
    include: { document: true }
  });
  
  const results = [];
  
  for (const content of contents) {
    const prompt = `You are an AI study assistant. Here is a document summary:\n\n${content.summary}\n\nProvide a highly specific 3-5 word search query to find the best tutorial videos on YouTube for this main topic. Return JSON with this exact shape: { "youtubeSearchQuery": "your query here" }`;
    
    try {
      const response = await openai.chat.completions.create({
        model: process.env.AI_MODEL_NAME || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      
      const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
      const query = parsed.youtubeSearchQuery || `${content.document.documentTitle} tutorial`;
      
      const youtubeLinks = await searchYouTube(query);
      
      await prisma.studyContent.update({
        where: { id: content.id },
        data: { youtubeLinks },
      });
      
      results.push({ document: content.document.documentTitle, query, updated: true });
    } catch (e) {
      results.push({ document: content.document.documentTitle, error: String(e) });
    }
  }
  
  return NextResponse.json({ success: true, results });
}
