import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_API_URL || undefined,
});

export async function POST(req: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;

  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 1. Verify ownership
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { studyContent: true }
    });

    if (!document || document.userId !== session.user.id) {
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
    }

    if (!document.studyContent) {
       return NextResponse.json({ error: "Document is still processing" }, { status: 400 });
    }

    // 2. Save User Message
    await prisma.chatMessage.create({
      data: {
        documentId,
        userId: session.user.id,
        role: "user",
        content: message
      }
    });

    // 3. Fetch past messages for context (last 10)
    const pastMessages = await prisma.chatMessage.findMany({
      where: { documentId, userId: session.user.id },
      orderBy: { createdAt: "asc" },
      take: 20
    });

    const messagesForAI: any[] = [
      {
        role: "system",
        content: `You are a helpful AI study tutor. The user is studying a document titled "${document.documentTitle}". 
Here is a summary of the document for context: 
${document.studyContent.summary}

Answer the user's questions clearly, accurately, and concisely based on this context. Be encouraging and helpful.`
      },
      ...pastMessages.map((m: any) => ({ role: m.role, content: m.content }))
    ];

    // 4. Call AI API
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL_NAME || "gpt-4o-mini",
      messages: messagesForAI,
    });

    const aiResponse = response.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // 5. Save AI Message
    const savedAiMessage = await prisma.chatMessage.create({
      data: {
        documentId,
        userId: session.user.id,
        role: "assistant",
        content: aiResponse
      }
    });

    return NextResponse.json({ success: true, message: savedAiMessage });

  } catch (error: any) {
    console.error("[chat/POST]", error);
    return NextResponse.json({ error: "Failed to send message", details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;

  try {
    const pastMessages = await prisma.chatMessage.findMany({
      where: { documentId, userId: session.user.id },
      orderBy: { createdAt: "asc" }
    });
    
    return NextResponse.json({ messages: pastMessages });
  } catch (error: any) {
    console.error("[chat/GET]", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

