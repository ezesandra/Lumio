require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

async function test() {
  console.log("URL:", process.env.AI_API_URL);
  console.log("Key:", process.env.AI_API_KEY?.slice(0, 10) + "...");
  console.log("Model:", process.env.AI_MODEL_NAME);

  const openai = new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_API_URL || undefined,
  });

  try {
    const response = await openai.chat.completions.create({
      model: process.env.AI_MODEL_NAME || "deepseek-chat",
      messages: [{ role: "user", content: "Say hello!" }]
    });
    console.log("Success:", response.choices[0].message.content);
  } catch (err) {
    console.error("Error:", err.message);
    if (err.response) {
       console.error(err.response.data);
    }
  }
}

test();
