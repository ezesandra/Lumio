import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function test() {
  const { sendPasswordResetEmail } = await import("./lib/email.js");
  try {
    console.log("Testing sendPasswordResetEmail...");
    await sendPasswordResetEmail("ezesandra704@gmail.com", "test-token-123");
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

test();
