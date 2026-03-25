import { NextResponse } from 'next/server';
import { getTeams, saveTeams } from '../../lib/db';

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

// Shuffles an array randomly
function shuffleArray(array: number[]) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export async function POST(request: Request) {
    try {
        const { teamName, password } = await request.json();

        if (!teamName || !password) {
            return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 });
        }

        if (password !== 'hunt2026') {
            return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
        }

        const normalizedName = teamName.trim();
        const teams = await getTeams();

        if (!teams[normalizedName]) {
            return NextResponse.json({ success: false, error: 'Team not registered. See Crew.' }, { status: 403 });
        }

        const teamData = teams[normalizedName];

        let needsSave = false;

        // Set up randomized question sequences and tracking per team upon first login
        if (!teamData.startTime) {
            teamData.startTime = new Date().toISOString();
            needsSave = true;
        }

        if (!teamData.questionSequence) {
            teamData.questionSequence = shuffleArray([0, 1, 2, 3, 4]);
            teamData.stageTimestamps = [];
            needsSave = true;
        }

        if (needsSave) {
            await saveTeams(teams);
        }

        let currentLocation = "COMPLETED";
        let firstClue = "Congratulations! You have successfully completed the Clueminati run. Return to base.";

        if (teamData.progress < 5) {
            const routeSeq = ROUTES[teamData.route as keyof typeof ROUTES];
            currentLocation = routeSeq[teamData.progress];
            firstClue = TRIVIAS[currentLocation];
        }

        return NextResponse.json({
            success: true,
            teamId: normalizedName,
            route: teamData.route,
            progress: teamData.progress,
            firstClue: firstClue
        });
    } catch (err) {
        return NextResponse.json({ success: false, error: 'Server error tracking progress' }, { status: 500 });
    }
}
