// Load .env.local first (Next.js convention), fall back to .env
import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fallback to .env
import { defineConfig } from "prisma/config";

const directUrl = process.env.DATABASE_URL!;

const shadowUrl = process.env.SHADOW_DATABASE_URL || undefined;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl,
  },
});
