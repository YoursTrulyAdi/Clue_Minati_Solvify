import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getDefaultStopsForRoute, normalizeRouteId } from "@/app/lib/defaultRoutes";

function isAdminAuthorized(req: NextRequest): boolean {
  const incoming = req.headers.get("x-admin-password") ?? "";
  const expected = process.env.ADMIN_PASSWORD ?? "admin";
  return incoming === expected;
}

// GET — fetch all teams
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const teams = await prisma.team.findMany({ orderBy: { createdAt: "asc" } });
    const stageTimes = await prisma.teamStageTime.findMany({
      orderBy: [{ recordedAt: "desc" }, { stage: "desc" }],
    });
    const broadcast = await prisma.broadcastMessage.findUnique({ where: { id: 1 } });

    const teamsMap: Record<string, any> = {};
    for (const team of teams) {
      teamsMap[team.name] = {
        password: team.password,
        route: team.route,
        members: team.members,
        progress: team.progress,
        penalties: team.penalties,
        startTime: team.startTime,
        endTime: team.endTime,
      };
    }

    return NextResponse.json({
      success: true,
      teams: teamsMap,
      stageTimes,
      broadcastMessage: broadcast?.isActive ? broadcast.message : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Failed to fetch teams" }, { status: 500 });
  }
}

// POST — create team, delete team, or reset team
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      teamName,
      deleteTeam,
      resetTeam,
      password,
      route,
      members,
      addPenalty,
      resetPenalties,
      stopQuest,
      setBroadcastMessage,
      clearBroadcastMessage,
    } = body;
    const routeId = normalizeRouteId(route);

    if (setBroadcastMessage) {
      const message = String(setBroadcastMessage).trim();
      if (!message) {
        return NextResponse.json({ success: false, error: "Broadcast message cannot be empty" }, { status: 400 });
      }

      await prisma.broadcastMessage.upsert({
        where: { id: 1 },
        update: { message, isActive: true },
        create: { id: 1, message, isActive: true },
      });

      return NextResponse.json({ success: true, broadcastMessage: message });
    }

    if (clearBroadcastMessage) {
      await prisma.broadcastMessage.updateMany({
        where: { id: 1 },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, broadcastMessage: null });
    }

    if (stopQuest) {
      const now = new Date();
      const result = await prisma.team.updateMany({
        where: { endTime: null },
        data: { endTime: now },
      });
      return NextResponse.json({ success: true, affectedTeams: result.count });
    }

    if (!teamName) {
      return NextResponse.json({ success: false, error: "Team name is required" }, { status: 400 });
    }

    // DELETE
    if (deleteTeam) {
      await prisma.team.delete({ where: { name: teamName } });
      return NextResponse.json({ success: true });
    }

    // RESET progress, time, and used questions
    if (resetTeam) {
      await prisma.team.update({
        where: { name: teamName },
        data: { progress: 0, penalties: 0, startTime: null, endTime: null, usedQuestions: [] },
      });
      await prisma.teamStageTime.deleteMany({ where: { teamName } });
      return NextResponse.json({ success: true });
    }

    // Penalty management (admin only route)
    if (addPenalty) {
      await prisma.team.update({
        where: { name: teamName },
        data: { penalties: { increment: 1 } },
      });
      return NextResponse.json({ success: true });
    }

    if (resetPenalties) {
      await prisma.team.update({
        where: { name: teamName },
        data: { penalties: 0 },
      });
      return NextResponse.json({ success: true });
    }

    // CREATE — validate required fields
    if (!password || !routeId || !members || members.length < 2) {
      return NextResponse.json(
        { success: false, error: "Missing required team fields or not enough members (min 2)" },
        { status: 400 }
      );
    }

    if (!getDefaultStopsForRoute(routeId)) {
      return NextResponse.json({ success: false, error: "Invalid route selected" }, { status: 400 });
    }

    const existing = await prisma.team.findUnique({ where: { name: teamName } });
    if (existing) {
      return NextResponse.json({ success: false, error: "A team with this name already exists" }, { status: 409 });
    }

    await prisma.team.create({
      data: {
        name: teamName,
        password,
        route: routeId,
        members,
        progress: 0,
        usedQuestions: [],
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
