"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function commitToStreak(days: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthorized" };

    if (![7, 14, 30].includes(days)) {
      return { error: "Invalid streak goal" };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { targetStreak: days },
    });

    revalidatePath("/progress");
    return { success: true };
  } catch (error) {
    console.error("[commitToStreak]", error);
    return { error: "Failed to set streak goal" };
  }
}
