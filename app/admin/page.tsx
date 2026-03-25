"use client";

import { useEffect, useState } from "react";

export default function AdminDashboard() {
    const [password, setPassword] = useState("");
    const [authed, setAuthed] = useState(false);
    const [teams, setTeams] = useState<Record<string, any>>({});

    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamRoute, setNewTeamRoute] = useState("A");
    const [members, setMembers] = useState([{ name: "", usn: "" }, { name: "", usn: "" }]);
    const [activeTab, setActiveTab] = useState<"teams" | "qr">("teams");
    const [highlightedQR, setHighlightedQR] = useState<string | null>(null);

    const STAGES = ["lab", "canteen", "park", "temple", "bbc"];

    useEffect(() => {
        if (authed) {
            fetchTeams();
            const interval = setInterval(fetchTeams, 5000);
            return () => clearInterval(interval);
        }
    }, [authed]);

    const fetchTeams = async () => {
        try {
            const res = await fetch("/api/admin/teams");
            const data = await res.json();
            if (data.success) setTeams(data.teams);
        } catch (err) { }
    };

    const handleAuth = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === "admin") setAuthed(true);
        else alert("Incorrect admin password.");
    };

    const updateMember = (index: number, field: "name" | "usn", value: string) => {
        const updated = [...members];
        updated[index][field] = value;
        setMembers(updated);
    };

    const handleAddTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim()) return;

        try {
            const res = await fetch("/api/admin/teams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamName: newTeamName, route: newTeamRoute, members })
            });
            const data = await res.json();
            if (!data.success) {
                alert(data.error);
                return;
            }
            setNewTeamName("");
            setMembers([{ name: "", usn: "" }, { name: "", usn: "" }]);
            fetchTeams();
        } catch (err) { }
    };

    const handleDelete = async (teamName: string) => {
        if (!confirm("Remove this team?")) return;
        try {
            await fetch("/api/admin/teams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamName, deleteTeam: true })
            });
            fetchTeams();
        } catch (err) { }
    };

    const handleReset = async (teamName: string) => {
        if (!confirm("Reset team progress & time?")) return;
        try {
            await fetch("/api/admin/teams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamName, resetTeam: true })
            });
            fetchTeams();
        } catch (err) { }
    }

    const formatDuration = (start: string | null, end: string | null) => {
        if (!start) return "Not started";
        const startTime = new Date(start).getTime();
        const endTime = end ? new Date(end).getTime() : Date.now();
        const diff = Math.floor((endTime - startTime) / 1000); // seconds
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        return `${m}m ${s}s ${end ? '(Finished)' : '(Running)'}`;
    };

    const handleDownloadQR = async (stage: string) => {
        try {
            const url = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&color=212-175-55&bgcolor=000&data=${stage}`;
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `Clueminati_QR_${stage.toUpperCase()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            alert("Failed to download QR code.");
        }
    };

    if (!authed) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-transparent text-white relative z-10">
                <form onSubmit={handleAuth} className="border border-gray-800 p-8 glow-panel relative z-10 bg-black/80 backdrop-blur-sm">
                    <h2 className="text-[#D4AF37] mb-4 text-sm font-bold uppercase tracking-widest">Admin Access</h2>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 p-2 mb-4 outline-none focus:border-[#D4AF37] transition-all"
                        placeholder="Password..."
                    />
                    <button type="submit" className="w-full bg-[#D4AF37] text-black font-bold p-2 uppercase text-xs hover:bg-yellow-400 transition-colors">Login</button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 bg-transparent text-white font-mono relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
                <h1 className="text-3xl font-bold uppercase tracking-widest text-[#D4AF37]">Clueminati Control</h1>
                <div className="flex border border-gray-700 overflow-hidden bg-black">
                    <button onClick={() => setActiveTab("teams")} className={`px-4 py-2 uppercase text-xs font-bold transition-colors ${activeTab === "teams" ? "bg-[#D4AF37] text-black" : "hover:bg-gray-800"}`}>Live Board</button>
                    <button onClick={() => setActiveTab("qr")} className={`px-4 py-2 uppercase text-xs font-bold border-l border-gray-700 transition-colors ${activeTab === "qr" ? "bg-[#D4AF37] text-black" : "hover:bg-gray-800"}`}>QR Codes</button>
                </div>
            </div>

            {activeTab === "teams" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                    {/* ADD TEAM FORM */}
                    <div className="border border-gray-800 p-6 bg-[#050505]/95 backdrop-blur-sm">
                        <h2 className="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.2em] mb-6">Register Team</h2>
                        <form onSubmit={handleAddTeam} className="space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Team Name</label>
                                <input
                                    type="text"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    className="w-full mt-1 bg-black border border-gray-800 p-2 outline-none focus:border-[#D4AF37] text-sm transition-all"
                                    placeholder="e.g. Wolfpack"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Route Assignment</label>
                                <select
                                    value={newTeamRoute}
                                    onChange={(e) => setNewTeamRoute(e.target.value)}
                                    className="w-full mt-1 bg-black border border-gray-800 p-2 outline-none focus:border-[#D4AF37] text-sm transition-all"
                                >
                                    <option value="A">Route A (Lab-Can-Prk-Tmp-Bbc)</option>
                                    <option value="B">Route B (Can-Prk-Tmp-Bbc-Lab)</option>
                                    <option value="C">Route C (Prk-Tmp-Bbc-Lab-Can)</option>
                                    <option value="D">Route D (Tmp-Bbc-Lab-Can-Prk)</option>
                                    <option value="E">Route E (Bbc-Lab-Can-Prk-Tmp)</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-gray-800">
                                <label className="text-[10px] text-[#D4AF37] uppercase font-bold tracking-[0.1em] block mb-2">Team Members (2-4)</label>
                                {members.map((m, i) => (
                                    <div key={i} className="flex gap-2 mb-2">
                                        <input type="text" placeholder={`Member ${i + 1} Name`} value={m.name} onChange={(e) => updateMember(i, "name", e.target.value)} className="w-1/2 bg-black border border-gray-800 p-2 text-xs outline-none focus:border-[#D4AF37] transition-colors" required={i < 2} />
                                        <input type="text" placeholder={`USN`} value={m.usn} onChange={(e) => updateMember(i, "usn", e.target.value)} className="w-1/2 bg-black border border-gray-800 p-2 text-xs outline-none focus:border-[#D4AF37] transition-colors" required={i < 2} />
                                        {i >= 2 && (
                                            <button type="button" onClick={() => setMembers(members.filter((_, idx) => idx !== i))} className="text-red-500 text-xs px-2 font-bold hover:scale-110">X</button>
                                        )}
                                    </div>
                                ))}
                                {members.length < 4 && (
                                    <button type="button" onClick={() => setMembers([...members, { name: "", usn: "" }])} className="text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-widest mt-2">+ Add Member</button>
                                )}
                            </div>

                            <button type="submit" className="w-full bg-[#D4AF37]/20 border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all text-[#D4AF37] font-bold py-3 uppercase text-[10px] tracking-widest mt-4">
                                Register & Assign
                            </button>
                        </form>
                    </div>

                    {/* TEAM PROGRESS TABLE */}
                    <div className="lg:col-span-2 border border-gray-800 p-6 bg-[#050505]/95 backdrop-blur-sm overflow-x-auto">
                        <h2 className="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.2em] mb-6">Live Progress Tracker</h2>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase tracking-widest">
                                    <th className="pb-3 pr-4 font-normal">Team</th>
                                    <th className="pb-3 pr-4 font-normal">Members</th>
                                    <th className="pb-3 pr-4 font-normal">Route</th>
                                    <th className="pb-3 pr-4 font-normal">Progress</th>
                                    <th className="pb-3 pr-4 font-normal">Time Taken</th>
                                    <th className="pb-3 font-normal text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(teams).map(([name, data]) => (
                                    <tr key={name} className="border-b border-gray-900 hover:bg-gray-900/50 transition-colors">
                                        <td className="py-4 pr-4 font-bold tracking-wide text-gray-200">{name}</td>
                                        <td className="py-4 pr-4 text-xs text-gray-400">
                                            {data.members?.map((m: any, idx: number) => (
                                                <div key={idx}>{m.name} <span className="text-gray-600">({m.usn})</span></div>
                                            ))}
                                        </td>
                                        <td className="py-4 pr-4 text-[#D4AF37]">{data.route}</td>
                                        <td className="py-4 pr-4">
                                            <span className={`px-3 py-1 text-[10px] rounded border ${data.progress === 5 ? 'border-green-500 text-green-500 bg-green-950/30' : 'border-[#D4AF37] text-[#D4AF37] bg-yellow-950/10'}`}>
                                                {data.progress} / 5
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 text-[10px] text-gray-400 uppercase tracking-wider">
                                            {formatDuration(data.startTime, data.endTime)}
                                        </td>
                                        <td className="py-4 text-right space-x-3">
                                            <button onClick={() => handleReset(name)} className="text-[10px] font-bold tracking-wider text-gray-500 hover:text-white uppercase transition-colors">Reset</button>
                                            <button onClick={() => handleDelete(name)} className="text-[10px] font-bold tracking-wider text-red-900 hover:text-red-500 uppercase transition-colors">Del</button>
                                        </td>
                                    </tr>
                                ))}
                                {Object.keys(teams).length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-xs text-gray-600 uppercase tracking-widest">
                                            No teams assigned yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === "qr" && (
                <div className="border border-gray-800 p-8 bg-[#050505]/95 backdrop-blur-sm relative z-10">
                    <h2 className="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.2em] mb-4">Location QR Codes</h2>
                    <p className="text-xs text-gray-400 mb-8 max-w-2xl leading-relaxed">Print these and place them physically at the locations. The app scanner will read the plain text ID to unlock the challenge stage. Click on a QR code to expand it for easy scanning off the monitor.</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
                        {STAGES.map((stage) => (
                            <div key={stage} className="flex flex-col items-center bg-black p-4 border border-gray-800 rounded shadow-[0_0_15px_rgba(212,175,55,0.05)]">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=212-175-55&bgcolor=000&data=${stage}`}
                                    alt={`${stage} QR Code`}
                                    className="w-full h-auto mb-4 border border-[#D4AF37]/50 cursor-pointer hover:border-[#D4AF37] hover:scale-105 transition-all outline-none rounded-sm"
                                    onClick={() => setHighlightedQR(stage)}
                                />
                                <h3 className="uppercase tracking-[0.2em] font-bold text-[#D4AF37] mb-4 text-sm">{stage}</h3>

                                <button
                                    onClick={() => handleDownloadQR(stage)}
                                    className="w-full py-2 bg-[#D4AF37]/10 border border-[#D4AF37] text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest hover:bg-[#D4AF37] hover:text-black transition-colors"
                                >
                                    Download
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* HIGHLIGHTED QR MODAL */}
            {highlightedQR && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 cursor-pointer backdrop-blur-sm"
                    onClick={() => setHighlightedQR(null)}
                >
                    <div className="animate-pulse absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1)_0,transparent_60%)] pointer-events-none"></div>
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&color=212-175-55&bgcolor=000&data=${highlightedQR}`}
                        alt="Highlight"
                        className="w-[90vw] max-w-lg h-auto border-4 border-[#D4AF37] shadow-[0_0_50px_rgba(212,175,55,0.6)] relative z-10 p-2 bg-black"
                    />
                    <h3 className="uppercase tracking-[0.5em] font-bold text-[#D4AF37] mt-10 text-3xl relative z-10">{highlightedQR}</h3>
                    <p className="text-gray-500 mt-6 text-[10px] uppercase tracking-[0.3em] relative z-10 animate-bounce">Click anywhere to close</p>
                </div>
            )}

        </div>
    );
}
