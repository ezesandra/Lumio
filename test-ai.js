require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_API_URL || "https://api.openai.com/v1",
});

async function test() {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a test." },
        { role: "user", content: "Say hello." },
      ],
      max_tokens: 10,
    });
    console.log("Success:", response.choices[0].message.content);
  } catch (e) {
    console.error("AI Error:", e.message);
  }
}
test();
