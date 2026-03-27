import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getDefaultStopsForRoute, normalizeRouteId } from "@/app/lib/defaultRoutes";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export async function POST(req: NextRequest) {
  try {
    const { teamName, questionId, answer } = await req.json();

    if (!teamName || !questionId || !answer) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Fetch team
    const team = await prisma.team.findUnique({ where: { name: teamName } });
    if (!team) {
      return NextResponse.json({ success: false, error: "Team not found" }, { status: 404 });
    }

    if (team.endTime) {
      let totalTimeText: string | null = null;
      if (team.startTime) {
        const diffMs = team.endTime.getTime() - team.startTime.getTime();
        const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
        totalTimeText = formatDuration(totalSeconds);
      }

      return NextResponse.json({
        success: false,
        error: "Treasure quest has been stopped by admin.",
        questStopped: true,
        solvedCount: team.progress,
        totalTimeText,
      }, { status: 403 });
    }

    // 2. Fetch the question from the pool
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    // 3. Check answer (case-insensitive, trimmed)
    if (answer.trim().toLowerCase() !== question.answer.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Incorrect answer. Try again!" }, { status: 400 });
    }

    // 4. Correct answer! Advance progress and mark question as used
    const newProgress = team.progress + 1;

    const routeId = normalizeRouteId(team.route);
    const route = await prisma.route.findUnique({ where: { id: routeId } });
    const totalStops = route?.stops.length ?? getDefaultStopsForRoute(routeId)?.length ?? 5;

    const dataToUpdate: {
      progress: number;
      endTime?: Date;
    } = {
      progress: newProgress,
    };

    if (newProgress >= totalStops) {
      dataToUpdate.endTime = new Date();
    }

    const updatedTeam = await prisma.team.update({
      where: { name: teamName },
      data: dataToUpdate,
    });

    const isFinished = newProgress >= totalStops;
    let totalTimeText: string | null = null;

    if (isFinished && updatedTeam.startTime && updatedTeam.endTime) {
      const diffMs = updatedTeam.endTime.getTime() - updatedTeam.startTime.getTime();
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      totalTimeText = formatDuration(totalSeconds);
    }

    return NextResponse.json({
      success: true,
      message: isFinished ? "Quest Complete!" : "Correct! Proceed to the next clue.",
      progress: updatedTeam.progress,
      isFinished,
      totalTimeText,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
