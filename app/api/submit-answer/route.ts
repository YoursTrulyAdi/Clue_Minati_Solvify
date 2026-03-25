import { NextResponse } from 'next/server';
import { getTeams, saveTeams } from '../../lib/db';
import { TECHNICAL_QUESTIONS } from '../../lib/questions';

const TRIVIAS: Record<string, string> = {
    temple: "No exams are conducted,\nyet people come here seeking answers.\nNo one explains anything,\nyet many leave understanding more.\nIt’s the only place on campus\nwhere belief works better than proof.",
    bbc: "A place where height gives advantage,\nbut timing decides everything.\nYou don’t just play—you calculate,\nbut faster than any computer can.",
    lab: "A place where errors are expected,\nand success is compiled.\nNot the first lab, not the last—\nbut the one equal to the faces of a cube.",
    park: "No walls define it,\nno timetable controls it,\nand no one tells you to be quiet—\nyet somehow, it’s one of the most peaceful places around",
    canteen: "You don’t need a reason to come here—\nhunger is enough.\nYou don’t need a reason to stay—\ncomfort is enough"
};

const ROUTES: Record<string, string[]> = {
    A: ["lab", "canteen", "park", "temple", "bbc"],
    B: ["canteen", "park", "temple", "bbc", "lab"],
    C: ["park", "temple", "bbc", "lab", "canteen"],
    D: ["temple", "bbc", "lab", "canteen", "park"],
    E: ["bbc", "lab", "canteen", "park", "temple"]
};

export async function POST(request: Request) {
    try {
        const { teamId, route, stageId, answer } = await request.json();

        if (!teamId || !route || !stageId || !answer) {
            return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
        }

        const routeSeq = ROUTES[route as keyof typeof ROUTES];

        if (!routeSeq) {
            return NextResponse.json({ success: false, error: 'Invalid route assigned' }, { status: 400 });
        }

        const stageIndex = routeSeq.indexOf(stageId.toLowerCase());

        // Load db to update progress
        const teams = await getTeams();
        const teamData = teams[teamId];

        if (!teamData) {
            return NextResponse.json({ success: false, error: 'Team data corrupted. Please consult crew.' }, { status: 500 });
        }

        // ⚠️ STRICT SECURITY CHECK: Prevent skipping stages or replaying
        if (teamData.progress !== stageIndex) {
            return NextResponse.json({ success: false, error: 'Protocol violation. Accessing out-of-bounds node.' }, { status: 403 });
        }

        if (!teamData.questionSequence) {
            return NextResponse.json({ success: false, error: 'Question sequence corrupted.' }, { status: 500 });
        }

        const questionObj = TECHNICAL_QUESTIONS[teamData.questionSequence[teamData.progress]];
        if (!questionObj) {
            return NextResponse.json({ success: false, error: 'Invalid stage index lookup' }, { status: 404 });
        }

        const cleanAnswer = answer.toLowerCase().trim();
        const validAnswers = questionObj.ans;
        const isCorrect = validAnswers.some(a => cleanAnswer === a || cleanAnswer.includes(a));

        if (isCorrect) {
            const completionTime = new Date().toISOString();
            console.log(`[CORRECT ANSWER] team: ${teamId}, stage: ${stageId}, route: ${route}, time: ${completionTime}`);

            // Update data
            teamData.progress = stageIndex + 1;

            if (!teamData.stageTimestamps) teamData.stageTimestamps = [];
            teamData.stageTimestamps.push(completionTime);

            if (teamData.progress === 5) {
                teamData.endTime = completionTime;
            }

            await saveTeams(teams);

            let nextClue = "Congratulations! You have successfully completed the Clueminati hunt. Return to base.";
            if (stageIndex !== -1 && stageIndex < routeSeq.length - 1) {
                const nextStage = routeSeq[stageIndex + 1];
                nextClue = TRIVIAS[nextStage];
            }

            return NextResponse.json({
                correct: true,
                nextClue: nextClue
            });
        } else {
            return NextResponse.json({
                correct: false
            });
        }
    } catch (err) {
        return NextResponse.json({ success: false, error: 'Server error tracking progress' }, { status: 500 });
    }
}
