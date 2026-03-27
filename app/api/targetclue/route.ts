import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const location = req.nextUrl.searchParams.get("location");

    if (!location) {
      return NextResponse.json(
        { success: false, error: "Location parameter is required" },
        { status: 400 }
      );
    }

    const clue = await prisma.targetClue.findUnique({
      where: { mappedLocation: location.toLowerCase() },
    });

    if (!clue) {
      return NextResponse.json(
        { success: false, error: "Clue not found for this location" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      clueText: clue.clueText,
      mappedLocation: clue.mappedLocation,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
