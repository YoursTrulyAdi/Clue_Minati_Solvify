"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [teamName, setTeamName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamName, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed");
      }

      // Store in localStorage
      localStorage.setItem("teamId", data.teamId);
      localStorage.setItem("route", data.route);
      localStorage.setItem("progress", data.progress);
      localStorage.setItem("currentClue", data.firstClue); // 'firstClue' from API

      // Redirect to main system
      router.push("/app");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-transparent text-foreground transition-all duration-300">
      <div className="w-full max-w-sm rounded-xl border border-yellow-500/30 bg-black/80 p-8 shadow-[0_0_20px_rgba(212,175,55,0.15)] backdrop-blur-sm sm:max-w-md">
        <h1 className="mb-6 text-center text-3xl font-bold uppercase tracking-widest text-[#D4AF37]">
          Clueminati
        </h1>
        <p className="mb-8 text-center text-sm text-gray-400">
          Enter your team credentials to begin the hunt.
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-gray-200 outline-none transition-colors focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              placeholder="e.g., Code Breakers"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-gray-200 outline-none transition-colors focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#D4AF37] px-4 py-3 text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-yellow-400 active:scale-95 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Begin"}
          </button>
        </form>
      </div>
    </div>
  );
}
