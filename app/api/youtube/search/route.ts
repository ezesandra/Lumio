import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { searchYouTube } from "@/lib/ai";
import { authOptions } from "@/lib/auth";
import { LIMITS, type TierKey } from "@/lib/limits";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = session.user.subscriptionTier as TierKey;
  if (!LIMITS[tier]?.youtubeRecommendations) {
    return NextResponse.json({ error: "Feature not available on your plan" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Query parameter required" }, { status: 400 });
  }

  const videos = await searchYouTube(query, 3);
  return NextResponse.json({ videos });
}
