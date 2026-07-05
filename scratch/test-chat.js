const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const doc = await prisma.document.findFirst({
    where: { status: "READY" },
    include: { studyContent: true }
  });
  
  if (!doc) {
    console.log("No ready documents found.");
    return;
  }

  console.log(`Found doc: ${doc.id}, userId: ${doc.userId}`);
  
  // Now let's try the OpenAI call directly to see if DeepSeek throws an error
  const OpenAI = require('openai');
  require('dotenv').config({ path: '.env.local' });
  
  const openai = new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_API_URL || undefined,
  });

  try {
    const messagesForAI = [
      {
        role: "system",
        content: `You are a helpful AI study tutor. The user is studying a document titled "${doc.documentTitle}". 
Here is a summary of the document for context: 
${doc.studyContent.summary}

Answer the user's questions clearly, accurately, and concisely based on this context. Be encouraging and helpful.`
      },
      { role: "user", content: "Hello, what is this document about?" }
    ];

    console.log("Calling OpenAI/DeepSeek...");
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL_NAME || "gpt-4o-mini",
      messages: messagesForAI,
    });
    
    console.log("Success!");
    console.log(response.choices[0]?.message?.content);
  } catch (err) {
    console.error("OpenAI Error:", err);
  }
}

test().catch(console.error).finally(() => prisma.$disconnect());
