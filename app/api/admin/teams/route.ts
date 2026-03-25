import { NextResponse } from 'next/server';
import { getTeams, saveTeams, TeamState, TeamMember } from '../../../lib/db';

export async function GET(request: Request) {
    const teams = await getTeams();
    return NextResponse.json({ success: true, teams });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { teamName, route, members, deleteTeam, resetTeam } = body;

        if (!teamName) {
            return NextResponse.json({ success: false, error: 'Team name is required' }, { status: 400 });
        }

        const teams = await getTeams();
        const normalizedName = teamName.trim();

        if (deleteTeam) {
            delete teams[normalizedName];
        } else if (resetTeam) {
            if (teams[normalizedName]) {
                teams[normalizedName].progress = 0;
                teams[normalizedName].startTime = null;
                teams[normalizedName].endTime = null;
            }
        } else {
            if (!route || !['A', 'B', 'C', 'D', 'E'].includes(route)) {
                return NextResponse.json({ success: false, error: 'Invalid route' }, { status: 400 });
            }

            if (!members || !Array.isArray(members) || members.length < 2 || members.length > 4) {
                return NextResponse.json({ success: false, error: 'Team must have 2-4 members' }, { status: 400 });
            }

            for (const m of members) {
                if (!m.name || !m.usn) {
                    return NextResponse.json({ success: false, error: 'All members must have a name & usn' }, { status: 400 });
                }
            }

            const existing = teams[normalizedName];
            teams[normalizedName] = {
                route,
                progress: existing ? existing.progress : 0,
                startTime: existing ? existing.startTime : null,
                endTime: existing ? existing.endTime : null,
                members: members
            } as TeamState;
        }

        await saveTeams(teams);
        return NextResponse.json({ success: true, teams });
    } catch (err) {
        return NextResponse.json({ success: false, error: 'Server error saving team' }, { status: 500 });
    }
}
