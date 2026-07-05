import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateStudyPlanSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  documentId: z.string().optional().nullable(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Check ownership
    const existing = await prisma.studyPlan.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or access denied" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateStudyPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updateData: any = { ...parsed.data };
    if (parsed.data.date) {
      updateData.date = new Date(parsed.data.date);
    }

    // Verify document ownership if changing
    if (updateData.documentId) {
      const doc = await prisma.document.findUnique({
        where: { id: updateData.documentId },
        select: { userId: true },
      });
      if (!doc || doc.userId !== session.user.id) {
        return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
      }
    }

    const updated = await prisma.studyPlan.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ plan: updated });
  } catch (error) {
    console.error("[study-plan/PATCH]", error);
    return NextResponse.json({ error: "Failed to update study plan" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check ownership
    const existing = await prisma.studyPlan.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or access denied" }, { status: 404 });
    }

    await prisma.studyPlan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[study-plan/DELETE]", error);
    return NextResponse.json({ error: "Failed to delete study plan" }, { status: 500 });
  }
}
