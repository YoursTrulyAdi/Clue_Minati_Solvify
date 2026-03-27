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
    const { teamName, scannedLocation } = await req.json();

    if (!teamName || !scannedLocation) {
      return NextResponse.json(
        { success: false, error: "Missing teamName or scannedLocation" },
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

    // 2. Fetch their route's stops and auto-recover if route rows were not seeded
    const routeId = normalizeRouteId(team.route);
    let route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) {
      const fallbackStops = getDefaultStopsForRoute(routeId);
      if (!fallbackStops) {
        return NextResponse.json({ success: false, error: "Route not configured" }, { status: 500 });
      }

      route = await prisma.route.upsert({
        where: { id: routeId },
        update: { stops: fallbackStops },
        create: { id: routeId, stops: fallbackStops },
      });
    }

    // 3. Check if team has already completed all stops
    if (team.progress >= route.stops.length) {
      return NextResponse.json({ success: false, error: "You have already completed all stops!" }, { status: 400 });
    }

    // 4. Check if scanned location matches the expected next stop
    const expectedStop = route.stops[team.progress];
    const normalizedScanned = scannedLocation.trim().toLowerCase();
    const normalizedExpected = expectedStop.toLowerCase();

    if (normalizedScanned !== normalizedExpected) {
      return NextResponse.json({
        success: false,
        error: `Wrong location`,
      }, { status: 403 });
    }

    // 5. Pick a random unseen question from the pool OR return already assigned question
    let pickedId: number;
    let isNewAssignment = false;
    
    if (team.usedQuestions.length > team.progress) {
      pickedId = team.usedQuestions[team.progress];
    } else {
      const allQuestions = await prisma.question.findMany({ select: { id: true } });
      const unusedQuestions = allQuestions.filter((q: { id: number }) => !team.usedQuestions.includes(q.id));

      if (unusedQuestions.length === 0) {
        return NextResponse.json({ success: false, error: "No more questions available in the pool!" }, { status: 500 });
      }

      const randomIndex = Math.floor(Math.random() * unusedQuestions.length);
      pickedId = unusedQuestions[randomIndex].id;
      isNewAssignment = true;
    }

    const question = await prisma.question.findUnique({ where: { id: pickedId } });
    if (!question) {
      return NextResponse.json({ success: false, error: "Failed to load question" }, { status: 500 });
    }

    // 6. Record assignment and/or startTime
    const updateData: any = {};
    if (team.progress === 0 && !team.startTime) {
      updateData.startTime = new Date();
    }
    if (isNewAssignment) {
      updateData.usedQuestions = [...team.usedQuestions, pickedId];
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.team.update({
        where: { name: teamName },
        data: updateData,
      });
    }

    const currentStage = team.progress + 1;
    await prisma.teamStageTime.upsert({
      where: {
        teamName_stage: {
          teamName,
          stage: currentStage,
        },
      },
      update: {},
      create: {
        teamName,
        stage: currentStage,
      },
    });

    return NextResponse.json({
      success: true,
      targetLabel: `Target ${team.progress + 1}`,
      stopNumber: team.progress + 1,
      totalStops: route.stops.length,
      questionId: question.id,
      question: question.question,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
