import { config } from 'dotenv';
config({ path: '.env.local' });
import { prisma } from './lib/prisma';

async function main() {
  const docs = await prisma.studyContent.findMany({
    orderBy: { generatedAt: 'desc' },
    take: 1,
    select: { youtubeLinks: true, summary: true, document: { select: { documentTitle: true } } }
  });
  console.log(JSON.stringify(docs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
