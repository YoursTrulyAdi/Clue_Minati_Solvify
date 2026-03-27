import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getDefaultStopsForRoute, normalizeRouteId } from "@/app/lib/defaultRoutes";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export async function GET(req: NextRequest) {
  try {
    const teamName = req.nextUrl.searchParams.get("teamName");
    if (!teamName) {
      return NextResponse.json({ success: false, error: "teamName is required" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { name: teamName } });
    if (!team) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
    }

    const routeId = normalizeRouteId(team.route);
    const totalStops = getDefaultStopsForRoute(routeId)?.length ?? 5;
    const isFinished = team.progress >= totalStops || !!team.endTime;
    const wasStoppedByAdmin = !!team.endTime && team.progress < totalStops;
    const broadcast = await prisma.broadcastMessage.findUnique({ where: { id: 1 } });

    let totalTimeText: string | null = null;
    if (team.startTime && team.endTime) {
      const diffMs = team.endTime.getTime() - team.startTime.getTime();
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      totalTimeText = formatDuration(totalSeconds);
    }

    return NextResponse.json({
      success: true,
      progress: team.progress,
      isFinished,
      wasStoppedByAdmin,
      solvedCount: team.progress,
      totalTimeText,
      broadcastMessage: broadcast?.isActive ? broadcast.message : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
