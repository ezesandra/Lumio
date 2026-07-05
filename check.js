const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const content = await prisma.studyContent.findFirst({
    orderBy: { generatedAt: 'desc' }
  });
  console.log(JSON.stringify(content.quizQuestions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
