import fs from 'fs/promises';
import path from 'path';

const filePath = path.join(process.cwd(), 'teams-db.json');

export interface TeamMember {
    name: string;
    usn: string;
}

export interface TeamState {
    route: string;
    progress: number;
    startTime: string | null;
    endTime: string | null;
    members: TeamMember[];
    questionSequence?: number[];
    stageTimestamps?: string[];
}

export async function getTeams(): Promise<Record<string, TeamState>> {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
}

export async function saveTeams(teams: Record<string, TeamState>) {
    await fs.writeFile(filePath, JSON.stringify(teams, null, 2), 'utf8');
}
