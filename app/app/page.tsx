"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";
import { getDefaultStopsForRoute } from "@/app/lib/defaultRoutes";

function MainAppContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authed, setAuthed] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<{ name: string; usn: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [route, setRoute] = useState("");
  const [targetClue, setTargetClue] = useState<{ clueText: string; resourceUrl: string | null } | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  
  // Game State
  const [currentQuestion, setCurrentQuestion] = useState<{ id: number; text: string } | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [finalTimeText, setFinalTimeText] = useState("N/A");
  const [wasStoppedByAdmin, setWasStoppedByAdmin] = useState(false);
  const [solvedCount, setSolvedCount] = useState(0);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    const storedTeamName = localStorage.getItem("teamName");
    if (!storedTeamName) {
      router.replace("/");
    } else {
      setTeamName(storedTeamName);
      const storedRoute = localStorage.getItem("route") || "";
      setRoute(storedRoute);
      const storedProgress = parseInt(localStorage.getItem("progress") || "0", 10);
      setProgress(storedProgress);
      setSolvedCount(storedProgress);
      const storedIsFinished = localStorage.getItem("isFinished") === "1";
      if (storedIsFinished) {
        setIsFinished(true);
        setFinalTimeText(localStorage.getItem("totalTimeText") || "N/A");
      }
      setWasStoppedByAdmin(localStorage.getItem("wasStoppedByAdmin") === "1");
      try {
        setMembers(JSON.parse(localStorage.getItem("members") || "[]"));
      } catch { /* ignore parse errors */ }
      setAuthed(true);
    }
  }, [router]);

  useEffect(() => {
    if (!route) return;
    const totalStops = getDefaultStopsForRoute(route)?.length ?? 5;
    if (progress >= totalStops) {
      setIsFinished(true);
      if (finalTimeText === "N/A") {
        setFinalTimeText(localStorage.getItem("totalTimeText") || "N/A");
      }
      setCurrentQuestion(null);
      setIsScanning(false);
      setScanError("");
    }
  }, [route, progress, finalTimeText]);

  useEffect(() => {
    if (!authed || !teamName) return;

    const syncTeamStatus = async () => {
      try {
        const res = await fetch(`/api/team-status?teamName=${encodeURIComponent(teamName)}`);
        const data = await res.json();
        if (!data.success) return;

        if (typeof data.progress === "number") {
          setProgress(data.progress);
          setSolvedCount(data.progress);
          localStorage.setItem("progress", String(data.progress));
          localStorage.setItem("solvedCount", String(data.progress));
        }

        if (data.totalTimeText) {
          setFinalTimeText(data.totalTimeText);
          localStorage.setItem("totalTimeText", data.totalTimeText);
        }

        setWasStoppedByAdmin(!!data.wasStoppedByAdmin);
        localStorage.setItem("wasStoppedByAdmin", data.wasStoppedByAdmin ? "1" : "0");

        if (data.isFinished) {
          setIsFinished(true);
          localStorage.setItem("isFinished", "1");
          setCurrentQuestion(null);
          setIsScanning(false);
          setScanError("");
        }
      } catch {
        // Ignore transient status sync errors.
      }
    };

    syncTeamStatus();

    const handleFocus = () => {
      void syncTeamStatus();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void syncTeamStatus();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [authed, teamName]);

  useEffect(() => {
    const totalStops = getDefaultStopsForRoute(route)?.length ?? 5;
    if (route && progress >= 0 && progress < totalStops && !isFinished) {
      const stops = getDefaultStopsForRoute(route);
      if (stops && progress < stops.length) {
        const currentLocation = stops[progress];
        const fetchClue = async () => {
          try {
            const res = await fetch(`/api/targetclue?location=${encodeURIComponent(currentLocation)}`);
            const data = await res.json();
            if (data.success) {
              setTargetClue({ clueText: data.clueText, resourceUrl: data.resourceUrl });
            }
          } catch (err) {
            console.error("Failed to fetch target clue:", err);
          }
        };
        fetchClue();
      }
    }
  }, [route, progress, isFinished]);

  const handleScan = async (results: any[]) => {
    if (!results || results.length === 0) return;
    const location = results[0]?.rawValue || results[0]?.text || "";
    
    if (location) {
      setIsScanning(false);
      setScanError("");
      
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamName, scannedLocation: location }),
        });
        
        const data = await res.json();
        
        if (data.success) {
          setCurrentQuestion({ id: data.questionId, text: data.question });
          setFeedback(null);
        } else {
          if (data.questStopped) {
            const currentSolved = typeof data.solvedCount === "number" ? data.solvedCount : progress;
            setSolvedCount(currentSolved);
            setWasStoppedByAdmin(true);
            setIsFinished(true);
            setCurrentQuestion(null);
            setFinalTimeText(data.totalTimeText || "N/A");
            localStorage.setItem("progress", String(currentSolved));
            localStorage.setItem("solvedCount", String(currentSolved));
            localStorage.setItem("wasStoppedByAdmin", "1");
            localStorage.setItem("isFinished", "1");
            if (data.totalTimeText) localStorage.setItem("totalTimeText", data.totalTimeText);
            return;
          }
          setScanError(data.error || "Invalid location for your current stage.");
        }
      } catch (err) {
        setScanError("Connection error. Try scanning again.");
      }
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || !userAnswer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName,
          questionId: currentQuestion.id,
          answer: userAnswer
        }),
      });

      const data = await res.json();

      if (data.success) {
        setFeedback({ type: "success", text: data.message });
        setProgress(data.progress);
        setSolvedCount(data.progress);
        localStorage.setItem("progress", String(data.progress));
        localStorage.setItem("solvedCount", String(data.progress));
        
        if (data.isFinished) {
          if (data.totalTimeText) {
            setFinalTimeText(data.totalTimeText);
            localStorage.setItem("totalTimeText", data.totalTimeText);
          }
          setWasStoppedByAdmin(!!data.wasStoppedByAdmin);
          localStorage.setItem("wasStoppedByAdmin", data.wasStoppedByAdmin ? "1" : "0");
          localStorage.setItem("isFinished", "1");
          setIsFinished(true);
          setCurrentQuestion(null);
        } else {
          // Wait a bit then clear the question to show the next clue
          setTimeout(() => {
            setCurrentQuestion(null);
            setUserAnswer("");
            setFeedback(null);
          }, 2500);
        }
      } else {
        if (data.questStopped) {
          const currentSolved = typeof data.solvedCount === "number" ? data.solvedCount : progress;
          setSolvedCount(currentSolved);
          setWasStoppedByAdmin(true);
          setIsFinished(true);
          setCurrentQuestion(null);
          setFinalTimeText(data.totalTimeText || "N/A");
          localStorage.setItem("progress", String(currentSolved));
          localStorage.setItem("solvedCount", String(currentSolved));
          localStorage.setItem("wasStoppedByAdmin", "1");
          localStorage.setItem("isFinished", "1");
          if (data.totalTimeText) localStorage.setItem("totalTimeText", data.totalTimeText);
          return;
        }
        setFeedback({ type: "error", text: data.error || "Incorrect answer." });
      }
    } catch (err) {
      setFeedback({ type: "error", text: "Failed to submit answer. Try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authed) return null;

  if (isFinished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center z-10">
        <div className="absolute inset-0 bg-black bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.15)_0,rgba(0,0,0,1)_70%)]" />
        <div className="z-10 animate-bounce mb-8">
           <svg className="w-20 h-20 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        </div>
        <h1 className="text-4xl font-bold text-[#D4AF37] uppercase tracking-[0.3em] mb-4 z-10">Quest Complete</h1>
        {wasStoppedByAdmin ? (
          <>
            <p className="text-gray-300 tracking-wide text-sm mb-2 z-10">
              Test time was completed, you have solved {solvedCount} questions.
            </p>
            <p className="text-gray-400 tracking-widest uppercase text-xs mb-10 z-10">Now head to lab-3 for further procedure.</p>
          </>
        ) : (
          <>
            <p className="text-gray-300 tracking-wide text-sm mb-2 z-10">
              Congratuations on completing the treasure hunt your total time was {finalTimeText}.
            </p>
            <p className="text-gray-400 tracking-widest uppercase text-xs mb-10 z-10">Now reach to lab-3 for further procedure.</p>
          </>
        )}
        <div className="border border-[#D4AF37]/20 p-8 bg-black/40 backdrop-blur-sm z-10">
           <p className="text-[#D4AF37] font-bold text-lg mb-2">{teamName}</p>
           <p className="text-gray-500 text-xs">
             {wasStoppedByAdmin ? `Solved ${solvedCount} of 5 questions.` : "All 5 clues deciphered successfully."}
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-transparent text-white relative z-10">
      <div className="absolute inset-0 bg-[#0a0a0a] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0,rgba(0,0,0,1)_70%)] opacity-70" />

      <div className="w-full max-w-lg text-center z-10">

        {/* Rules Info Button */}
        <button
          onClick={() => setShowRules(!showRules)}
          className="text-xs text-gray-400 hover:text-[#D4AF37] uppercase tracking-widest mb-6 transition-colors"
        >
          ℹ️ Game Rules
        </button>

        {/* Rules Modal */}
        {showRules && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm border border-[#D4AF37]/40 bg-black/80 backdrop-blur-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#D4AF37] font-bold uppercase tracking-widest">Game Rules</h2>
                <button
                  onClick={() => setShowRules(false)}
                  className="text-gray-400 hover:text-red-400 text-lg"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4 text-gray-300 text-xs leading-relaxed">
                <div>
                  <p className="text-[#D4AF37] font-bold mb-1">✓ Answers are ONE WORD ONLY</p>
                  <p className="text-gray-400">All answers consist of a single word</p>
                </div>
                <div>
                  <p className="text-[#D4AF37] font-bold mb-1">✓ CASE INSENSITIVE</p>
                  <p className="text-gray-400">Answers can be in any case (UPPER, lower, MiXeD)</p>
                </div>
                <div>
                  <p className="text-[#D4AF37] font-bold mb-1">✓ STUCK? GET A CLUE</p>
                  <p className="text-gray-400">Approach volunteers for location clues.</p>
                  <p className="text-red-500 font-bold mt-1">⚠️ Each clue request = 1 PENALTY</p>
                </div>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-full mt-6 bg-[#D4AF37] text-black font-bold py-2 uppercase text-xs hover:bg-yellow-400"
              >
                Got It
              </button>
            </div>
          </div>
        )}

        {/* Team Header */}
        <div className="mb-8">
          <div className="inline-block border border-[#D4AF37]/40 px-6 py-3 mb-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mb-1">Team</p>
            <h1 className="text-2xl font-bold uppercase tracking-widest text-[#D4AF37]">{teamName}</h1>
          </div>
          {members.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-3">
              {members.map((m, i) => (
                <span key={i} className="text-[10px] uppercase tracking-widest text-gray-400 border border-gray-800 px-3 py-1">
                  {m.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Progress Tracker */}
        <div className="flex justify-center items-center gap-3 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 relative">
              <div className={`w-3 h-3 rotate-45 border transition-all duration-500 ${i < progress ? "bg-[#D4AF37] border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.6)]" : "bg-transparent border-gray-700"}`} />
              {i < 4 && <div className={`absolute top-1 left-3.75 w-8 h-px ${i < progress ? "bg-[#D4AF37]/50" : "bg-gray-800"}`} />}
            </div>
          ))}
        </div>

        {/* Clue/Question Box */}
        <div className="min-h-55 flex flex-col justify-center text-xl sm:text-2xl font-light leading-relaxed tracking-wider shadow-black drop-shadow-lg p-10 relative bg-black/40 backdrop-blur-sm border border-[#D4AF37]/10">
          <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-[#D4AF37]/40" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#D4AF37]/40" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#D4AF37]/40" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-[#D4AF37]/40" />
          
          {currentQuestion ? (
            <div className="space-y-6">
              <p className="text-base text-gray-200">{currentQuestion.text}</p>
              <form onSubmit={handleSubmitAnswer} className="mt-4">
                <input
                  type="text"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  disabled={isSubmitting || feedback?.type === "success"}
                  className="w-full bg-gray-950 border border-gray-800 p-3 text-sm text-center tracking-widest outline-none focus:border-[#D4AF37] transition-all"
                  placeholder="ENTER ANSWER..."
                  required
                />
                {feedback && (
                  <p className={`text-[10px] uppercase tracking-widest mt-3 font-bold ${feedback.type === "success" ? "text-green-500" : "text-red-500"}`}>
                    {feedback.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || feedback?.type === "success"}
                  className="w-full mt-4 bg-[#D4AF37] text-black text-[10px] font-bold py-3 uppercase tracking-[0.2em] hover:bg-yellow-400 disabled:opacity-50"
                >
                  {isSubmitting ? "Validating..." : "Submit Answer"}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-4">Location Hint</p>
              <p className="text-gray-200 text-lg tracking-widest uppercase font-bold">
                 Target {progress + 1}
              </p>
              {targetClue && (
                <div className="mt-6 space-y-4">
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {targetClue.clueText}
                  </p>
                  {targetClue.resourceUrl && (
                    <a 
                      href={targetClue.resourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block text-[#D4AF37] text-sm underline hover:text-yellow-300 transition-colors"
                    >
                      📎 {targetClue.resourceUrl}
                    </a>
                  )}
                </div>
              )}
              <p className="text-gray-500 text-xs mt-6 tracking-widest uppercase animate-pulse">
                Find the QR at this location to proceed
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {!currentQuestion && (
          <div className="mt-10">
            {scanError && (
               <p className="text-red-500 text-[10px] uppercase tracking-widest mb-4 font-bold">{scanError}</p>
            )}
            <button
              onClick={() => { setScanError(""); setIsScanning(true); }}
              className="relative px-8 py-4 bg-transparent border border-[#D4AF37] text-[#D4AF37] uppercase text-[10px] font-bold tracking-[0.3em] transition-all hover:bg-[#D4AF37]/10 active:scale-95"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Scan Target QR
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm border border-[#D4AF37]/40 bg-[#080808] shadow-[0_0_30px_rgba(212,175,55,0.15)]">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-gray-800">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Scanner Active</p>
                <p className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest">Target {progress + 1}</p>
              </div>
              <button
                onClick={() => setIsScanning(false)}
                className="text-gray-500 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                ✕ Close
              </button>
            </div>

            {/* Scanner Viewport */}
            <div className="relative w-full aspect-square overflow-hidden">
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#D4AF37] z-10" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#D4AF37] z-10" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-[#D4AF37] z-10" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-[#D4AF37] z-10" />
              <div className="absolute left-0 right-0 h-px bg-[#D4AF37]/60 z-10 animate-[scan_2s_ease-in-out_infinite]" style={{ top: "50%" }} />

              <Scanner
                onScan={handleScan}
                onError={(err) => setScanError("Camera Error: Check Permissions")}
                components={{ finder: false }}
                styles={{ container: { width: "100%", height: "100%" } }}
                constraints={{ facingMode: "environment" }}
              />
            </div>
            <p className="text-gray-600 text-[10px] uppercase tracking-widest text-center py-4">
              Scan the QR for Target {progress + 1}
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-40px); opacity: 0.4; }
          50% { transform: translateY(40px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function AppMain() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-transparent flex items-center justify-center text-[#D4AF37] text-[10px] tracking-widest uppercase animate-pulse">
        Initializing...
      </div>
    }>
      <MainAppContent />
    </Suspense>
  );
}


