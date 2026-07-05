import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });
import { prisma } from '../lib/prisma';

async function main() {
  const content = await prisma.studyContent.findFirst({
    orderBy: { generatedAt: 'desc' }
  });
  console.log(JSON.stringify(content?.quizQuestions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
