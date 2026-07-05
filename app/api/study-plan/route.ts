import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createStudyPlanSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  documentId: z.string().optional(),
}).strict();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const plans = await prisma.studyPlan.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        startTime: true,
        endTime: true,
        documentId: true,
        document: {
          select: {
            documentTitle: true,
          }
        }
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("[study-plan/GET]", error);
    return NextResponse.json({ error: "Failed to fetch study plans" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createStudyPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { title, description, date, startTime, endTime, documentId } = parsed.data;

    if (documentId) {
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { userId: true },
      });
      if (!doc || doc.userId !== session.user.id) {
        return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
      }
    }

    const plan = await prisma.studyPlan.create({
      data: {
        userId: session.user.id,
        title,
        description,
        date: new Date(date),
        startTime,
        endTime,
        documentId,
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error("[study-plan/POST]", error);
    return NextResponse.json({ error: "Failed to create study plan" }, { status: 500 });
  }
}
