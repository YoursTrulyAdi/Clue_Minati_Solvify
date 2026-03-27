"use client";

import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [teams, setTeams] = useState<Record<string, any>>({});
  const [stageTimes, setStageTimes] = useState<Array<{ id: number; teamName: string; stage: number; recordedAt: string }>>([]);

  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamPassword, setNewTeamPassword] = useState("");
  const [newTeamRoute, setNewTeamRoute] = useState("A");
  const [members, setMembers] = useState([{ name: "", usn: "" }, { name: "", usn: "" }]);
  const [activeTab, setActiveTab] = useState<"teams" | "qr">("teams");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stoppingQuest, setStoppingQuest] = useState(false);

  useEffect(() => {
    if (authed) fetchTeams();
  }, [authed]);

  const fetchTeams = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/teams", {
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (data.success) {
        setTeams(data.teams);
        setStageTimes(data.stageTimes ?? []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
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
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          teamName: newTeamName,
          password: newTeamPassword,
          route: newTeamRoute,
          members,
        }),
      });
      const data = await res.json();
      if (!data.success) { alert(data.error); return; }
      setNewTeamName("");
      setNewTeamPassword("");
      setNewTeamRoute("A");
      setMembers([{ name: "", usn: "" }, { name: "", usn: "" }]);
      fetchTeams();
    } catch {
      alert("Error saving team");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (teamName: string) => {
    if (!confirm("Remove this team?")) return;
    try {
      await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ teamName, deleteTeam: true }),
      });
      fetchTeams();
    } catch (err) { console.error(err); }
  };

  const handleReset = async (teamName: string) => {
    if (!confirm("Reset team progress & time?")) return;
    try {
      await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ teamName, resetTeam: true }),
      });
      fetchTeams();
    } catch (err) { console.error(err); }
  };

  const handlePenalty = async (teamName: string) => {
    try {
      await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ teamName, addPenalty: true }),
      });
      fetchTeams();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPenalties = async (teamName: string) => {
    try {
      await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ teamName, resetPenalties: true }),
      });
      fetchTeams();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStopQuest = async () => {
    if (!confirm("Stop the treasure quest for all teams? This will end active runs immediately.")) return;
    setStoppingQuest(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ stopQuest: true }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "Failed to stop quest");
        return;
      }
      alert(`Quest stopped for all teams. Updated ${data.affectedTeams ?? 0} team(s).`);
      fetchTeams();
    } catch (err) {
      console.error(err);
      alert("Failed to stop quest");
    } finally {
      setStoppingQuest(false);
    }
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start) return "Not started";
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diff = Math.floor((endTime - startTime) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}m ${s}s${end ? " (Finished)" : " (Running)"}`;
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-transparent text-white">
        <form onSubmit={handleAuth} className="border border-gray-800 p-8 bg-black/80 backdrop-blur-sm">
          <h2 className="text-[#D4AF37] mb-4 text-sm font-bold uppercase tracking-widest">Admin Access</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 p-2 mb-4 outline-none focus:border-[#D4AF37]"
            placeholder="Password..."
          />
          <button type="submit" className="w-full bg-[#D4AF37] text-black font-bold p-2 uppercase text-xs hover:bg-yellow-400">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-transparent text-white font-mono">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold uppercase tracking-widest text-[#D4AF37]">Clueminati Control</h1>
        <div className="flex border border-gray-700 overflow-hidden bg-black">
          <button onClick={() => setActiveTab("teams")} className={`px-4 py-2 uppercase text-xs font-bold transition-colors ${activeTab === "teams" ? "bg-[#D4AF37] text-black" : "hover:bg-gray-800"}`}>Live Board</button>
        </div>
      </div>

      {activeTab === "teams" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* TEAM REGISTRATION FORM */}
          <div className="border border-gray-800 p-6 bg-black/80 backdrop-blur-sm">
            <h2 className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-6">Register Team</h2>
            <form onSubmit={handleAddTeam} className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold">Team Name</label>
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full mt-1 bg-gray-900 border border-gray-800 p-2 outline-none focus:border-[#D4AF37] text-sm"
                  placeholder="e.g. Wolfpack"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold">Team Password</label>
                <input
                  type="text"
                  value={newTeamPassword}
                  onChange={(e) => setNewTeamPassword(e.target.value)}
                  className="w-full mt-1 bg-gray-900 border border-gray-800 p-2 outline-none focus:border-[#D4AF37] text-sm"
                  placeholder="e.g. pass123"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold">Location Route</label>
                <select
                  value={newTeamRoute}
                  onChange={(e) => setNewTeamRoute(e.target.value)}
                  className="w-full mt-1 bg-gray-900 border border-gray-800 p-2 outline-none focus:border-[#D4AF37] text-sm"
                >
                  <option value="A">Route A</option>
                  <option value="B">Route B</option>
                  <option value="C">Route C</option>
                  <option value="D">Route D</option>
                  <option value="E">Route E</option>
                </select>
              </div>

              <div className="pt-4 border-t border-gray-800">
                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-3">Team Members (2-4)</label>
                {members.map((m, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={m.name}
                      onChange={(e) => updateMember(i, "name", e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-800 p-2 text-xs outline-none focus:border-[#D4AF37]"
                      required={i < 2}
                    />
                    <input
                      type="text"
                      placeholder="USN"
                      value={m.usn}
                      onChange={(e) => updateMember(i, "usn", e.target.value)}
                      className="flex-1 bg-gray-900 border border-gray-800 p-2 text-xs outline-none focus:border-[#D4AF37]"
                      required={i < 2}
                    />
                    {i >= 2 && (
                      <button
                        type="button"
                        onClick={() => setMembers(members.filter((_, idx) => idx !== i))}
                        className="text-red-500 text-xs px-2 font-bold hover:text-red-300"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {members.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setMembers([...members, { name: "", usn: "" }])}
                    className="text-[10px] text-gray-400 hover:text-white mt-2 uppercase font-bold"
                  >
                    + Add Member
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D4AF37] text-black font-bold py-2 uppercase text-xs hover:bg-yellow-400 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Register & Assign"}
              </button>
            </form>
          </div>

          {/* TEAMS LIST */}
          <div className="lg:col-span-2 border border-gray-800 p-6 bg-black/80 backdrop-blur-sm overflow-x-auto">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest">Live Progress</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStopQuest}
                  disabled={stoppingQuest}
                  className="border border-red-500 px-3 py-1 text-[10px] font-bold uppercase text-red-400 hover:bg-red-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {stoppingQuest ? "Stopping..." : "Stop Quest"}
                </button>
                <button
                  type="button"
                  onClick={fetchTeams}
                  disabled={refreshing}
                  className="border border-[#D4AF37] px-3 py-1 text-[10px] font-bold uppercase text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase">
                  <th className="pb-3 pr-4">Team</th>
                  <th className="pb-3 pr-4">Password</th>
                  <th className="pb-3 pr-4">Members</th>
                  <th className="pb-3 pr-4">Route</th>
                  <th className="pb-3 pr-4">Progress</th>
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 pr-4">Penalties</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(teams).map(([name, data]) => (
                  <tr key={name} className="border-b border-gray-900 hover:bg-gray-900/30">
                    <td className="py-3 pr-4 font-bold text-gray-100">{name}</td>
                    <td className="py-3 pr-4 text-sm font-mono text-[#D4AF37]">{data.password}</td>
                    <td className="py-3 pr-4 text-[11px] text-gray-400">
                      {data.members?.map((m: any, idx: number) => (
                        <div key={idx}>{m.name}</div>
                      ))}
                    </td>
                    <td className="py-3 pr-4 text-[#D4AF37]">{data.route}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-1 text-[10px] rounded border ${data.progress === 5 ? 'border-green-500 text-green-500 bg-green-950/30' : 'border-[#D4AF37] text-[#D4AF37] bg-yellow-950/10'}`}>
                        {data.progress} / 5
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[11px] text-gray-400">
                      {formatDuration(data.startTime, data.endTime)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePenalty(name)}
                          className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold py-1 px-2 uppercase transition-colors"
                        >
                          + Penalty
                        </button>
                        <span className="text-[#D4AF37] font-bold text-sm bg-yellow-950/20 border border-[#D4AF37]/30 px-3 py-1 rounded">
                          {data.penalties || 0}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right flex gap-2 justify-end">
                      <button
                        onClick={() => handleResetPenalties(name)}
                        className="text-[10px] font-bold text-gray-500 hover:text-gray-300 uppercase"
                        title="Reset penalties"
                      >
                        ResetP
                      </button>
                      <button
                        onClick={() => handleReset(name)}
                        className="text-[10px] font-bold text-yellow-600 hover:text-yellow-400 uppercase"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => handleDelete(name)}
                        className="text-[10px] font-bold text-red-700 hover:text-red-500 uppercase"
                      >
                        Del
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {Object.keys(teams).length === 0 && (
              <p className="text-center text-gray-600 text-xs py-8 uppercase">No teams registered yet</p>
            )}

            <div className="mt-8 border-t border-gray-800 pt-6">
              <h3 className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest mb-4">Stage Timeline</h3>
              {stageTimes.length === 0 ? (
                <p className="text-gray-600 text-xs uppercase">No stage timestamps recorded yet</p>
              ) : (
                <div className="max-h-72 overflow-y-auto border border-gray-900">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase">
                        <th className="py-2 px-3">Team</th>
                        <th className="py-2 px-3">Stage</th>
                        <th className="py-2 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageTimes.map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-900 hover:bg-gray-900/30">
                          <td className="py-2 px-3 text-gray-200 font-bold">{entry.teamName}</td>
                          <td className="py-2 px-3 text-[#D4AF37]">{entry.stage}</td>
                          <td className="py-2 px-3 text-gray-400">{new Date(entry.recordedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}