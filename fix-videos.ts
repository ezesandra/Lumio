import { config } from 'dotenv';
config({ path: '.env.local' });
import { prisma } from './lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_API_URL || "https://api.openai.com/v1",
});

async function searchYouTube(query: string, maxResults = 3) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.items) return [];
  return data.items.map((item: any) => ({
    title: item.snippet.title,
    url: `https://youtube.com/watch?v=${item.id.videoId}`,
    channelName: item.snippet.channelTitle,
    thumbnailUrl: item.snippet.thumbnails.default.url,
  }));
}

async function fixVideos() {
  const contents = await prisma.studyContent.findMany({
    include: { document: true }
  });
  
  for (const content of contents) {
    console.log(`Fixing videos for document: ${content.document.documentTitle}`);
    
    const prompt = `You are an AI study assistant. The user uploaded a document. Here is the summary of the document:\n\n${content.summary}\n\nBased on this summary, please provide a highly specific 3-5 word search query to find the best tutorial videos on YouTube for the main topic of this document. Return JSON with this exact shape: { "youtubeSearchQuery": "your query here" }`;
    
    try {
      const response = await openai.chat.completions.create({
        model: process.env.AI_MODEL_NAME || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });
      
      const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
      const query = parsed.youtubeSearchQuery || `${content.document.documentTitle} tutorial`;
      console.log(`Generated query: ${query}`);
      
      const youtubeLinks = await searchYouTube(query);
      
      await prisma.studyContent.update({
        where: { id: content.id },
        data: { youtubeLinks },
      });
      console.log(`Updated videos for ${content.document.documentTitle}`);
    } catch (e) {
      console.error(`Failed for ${content.document.documentTitle}`, e);
    }
  }
}

fixVideos().catch(console.error).finally(() => prisma.$disconnect());
