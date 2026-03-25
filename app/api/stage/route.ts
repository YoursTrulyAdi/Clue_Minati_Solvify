import { NextResponse } from 'next/server';
import { getTeams } from '../../lib/db';
import { TECHNICAL_QUESTIONS } from '../../lib/questions';

const ROUTES: Record<string, string[]> = {
    A: ["lab", "canteen", "park", "temple", "bbc"],
    B: ["canteen", "park", "temple", "bbc", "lab"],
    C: ["park", "temple", "bbc", "lab", "canteen"],
    D: ["temple", "bbc", "lab", "canteen", "park"],
    E: ["bbc", "lab", "canteen", "park", "temple"]
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const stageId = searchParams.get('stageId');

    if (!teamId || !stageId) {
        return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const teams = await getTeams();
    const teamData = teams[teamId];

    if (!teamData) {
        return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const routeSeq = ROUTES[teamData.route as keyof typeof ROUTES];

    if (!routeSeq) {
        return NextResponse.json({ error: 'Route error' }, { status: 500 });
    }

    const expectedStage = routeSeq[teamData.progress];

    // STRICT VALIDATION: Prevent skipping or scanning wrong QR
    if (!expectedStage || stageId.toLowerCase() !== expectedStage) {
        return NextResponse.json({ error: 'Invalid QR Target. Stick to the designated route.' }, { status: 403 });
    }

    console.log(`[QR SCANNED] team: ${teamId}, stage: ${stageId}, time: ${new Date().toISOString()}`);

    if (!teamData.questionSequence) {
        return NextResponse.json({ error: 'Question sequence corrupted. See Crew.' }, { status: 500 });
    }

    // Get the question assigned to this specific step of their journey
    const questionIndex = teamData.questionSequence[teamData.progress];
    const questionObj = TECHNICAL_QUESTIONS[questionIndex];

    if (!questionObj) {
        return NextResponse.json({ error: 'Invalid stage index' }, { status: 404 });
    }

    return NextResponse.json({ question: questionObj.q });
}
