import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateICS } from "@/lib/calendar";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const plan = await prisma.studyPlan.findUnique({
      where: { id },
    });

    if (!plan || plan.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found or access denied" }, { status: 404 });
    }

    const icsContent = generateICS({
      title: plan.title,
      description: plan.description,
      date: plan.date,
      startTime: plan.startTime,
      endTime: plan.endTime,
    });

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="study-session-${plan.id}.ics"`,
      },
    });
  } catch (error) {
    console.error("[study-plan/ics/GET]", error);
    return NextResponse.json({ error: "Failed to generate ICS file" }, { status: 500 });
  }
}
