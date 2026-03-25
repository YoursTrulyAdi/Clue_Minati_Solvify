"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Scanner } from '@yudiel/react-qr-scanner';

function MainAppContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const stageId = searchParams.get("stageId");

    const [teamId, setTeamId] = useState<string | null>(null);
    const [currentClue, setCurrentClue] = useState<string>("");

    const [question, setQuestion] = useState<string | null>(null);
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [correct, setCorrect] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const storedTeamId = localStorage.getItem("teamId");
        if (!storedTeamId) {
            router.replace("/");
            return;
        }
        setTeamId(storedTeamId);
        setCurrentClue(localStorage.getItem("currentClue") || "");
        setProgress(parseInt(localStorage.getItem("progress") || "0", 10));
    }, [router]);

    useEffect(() => {
        if (stageId && teamId) {
            const fetchQuestion = async () => {
                try {
                    const res = await fetch(`/api/stage?teamId=${teamId}&stageId=${stageId}`);
                    const data = await res.json();
                    if (data.question) {
                        setQuestion(data.question);
                    } else {
                        setError(data.error || "Stage not found.");
                    }
                } catch (err) {
                    setError("Failed to load stage.");
                }
            };

            setCorrect(false);
            setAnswer("");
            setQuestion(null);
            setError("");
            fetchQuestion();
        } else {
            setQuestion(null);
            setError("");
            setCorrect(false);
            setIsScanning(false);
        }
    }, [stageId, teamId]);

    const handleSubmitAnswer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answer.trim()) return;

        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/submit-answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teamId, route: localStorage.getItem("route"), stageId, answer }),
            });
            const data = await res.json();

            if (data.correct && data.nextClue) {
                setCorrect(true);
                setTimeout(() => {
                    localStorage.setItem("currentClue", data.nextClue);
                    setCurrentClue(data.nextClue);

                    const newProg = progress + 1;
                    localStorage.setItem("progress", newProg.toString());
                    setProgress(newProg);

                    router.replace("/app");
                }, 3000); // Wait 3s so they can enjoy the transition
            } else {
                setError(data.error || "Ah ah ah... Incorrect.");
            }
        } catch (err) {
            setError("Error validating answer.");
        } finally {
            if (!correct) {
                setLoading(false);
            }
        }
    };

    const handleScan = (result: any) => {
        let text = "";
        if (Array.isArray(result) && result.length > 0) {
            text = result[0].rawValue || result[0].text;
        } else if (typeof result === "string") {
            text = result;
        }

        if (text) {
            setIsScanning(false);
            router.push(`/app?stageId=${encodeURIComponent(text.toLowerCase())}`);
        }
    };

    if (!teamId) return <div className="min-h-screen bg-transparent text-white" />;

    if (isScanning && !stageId && !correct) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-transparent text-white relative z-10">
                <div className="w-full max-w-sm border border-[#D4AF37]/40 bg-[#080808] p-4 shadow-[0_0_20px_rgba(212,175,55,0.1)] glow-panel relative">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-[#D4AF37] text-xs font-bold uppercase tracking-[0.2em]">Scanner Initialization</h2>
                        <button onClick={() => setIsScanning(false)} className="text-red-500 uppercase text-xs font-bold">X</button>
                    </div>

                    <div className="w-full aspect-square overflow-hidden border border-[#D4AF37]">
                        <Scanner
                            onScan={handleScan}
                            components={{ finder: true }}
                        />
                    </div>
                    <p className="mt-4 text-[10px] text-gray-500 uppercase tracking-widest text-center">Position the QR code within the frame</p>
                </div>
            </div>
        );
    }


    if (stageId && !correct) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-transparent text-white relative z-10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.05)_0,rgba(0,0,0,1)_100%)]"></div>
                <div className="w-full max-w-md border border-[#D4AF37]/40 bg-[#080808] p-8 shadow-[0_0_20px_rgba(212,175,55,0.1)] glow-panel relative overflow-hidden transition-all duration-500 z-10">

                    <h2 className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                        Stage Challenge
                    </h2>

                    <div className="mb-6 min-h-[50px]">
                        {question ? (
                            <p className="text-lg font-medium leading-relaxed">{question}</p>
                        ) : error ? (
                            <p className="text-red-500 text-sm tracking-widest">{error}</p>
                        ) : (
                            <div className="animate-pulse space-y-2">
                                <div className="h-4 bg-gray-800 rounded w-full"></div>
                                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmitAnswer} className="space-y-4">
                        <input
                            type="text"
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            disabled={loading || !question}
                            placeholder="Your answer..."
                            className="w-full rounded-md border border-gray-800 bg-black px-4 py-3 text-sm text-white outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                        />
                        {error && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest pt-1 animate-pulse">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading || !question || !answer}
                            className="w-full mt-4 bg-[#D4AF37] py-3 text-xs tracking-widest font-bold uppercase text-black hover:bg-yellow-400 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? "Validating..." : "Submit Answer"}
                        </button>
                    </form>

                    <button
                        onClick={() => router.replace("/app")}
                        className="w-full text-center mt-6 text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                    >
                        ABORT STAGE
                    </button>
                </div>
            </div>
        );
    }

    if (correct) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-transparent text-white transition-opacity duration-1000 z-10 relative">
                <div className="text-center animate-pulse">
                    <div className="inline-block rounded-full bg-green-950 border border-green-500 p-4 mb-4 shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all">
                        <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h2 className="text-[#D4AF37] text-lg font-bold tracking-[0.2em] uppercase">
                        Access Granted
                    </h2>
                    <p className="text-gray-400 text-xs mt-3 tracking-[0.2em]">Decrypting next coordinate...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-transparent text-white relative z-10">
            <div className="absolute inset-0 bg-[#0a0a0a] bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0,rgba(0,0,0,1)_70%)] opacity-70"></div>

            <div className="w-full max-w-lg text-center z-10">

                <div className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.3em] mb-8 flex flex-col items-center">
                    <span className="mb-2 block border-y border-[#D4AF37]/50 py-1 px-4 tracking-widest">Team {teamId.replace('team-', '').toUpperCase()}</span>
                    Target Acquired
                </div>

                {/* Progress Tracker */}
                <div className="flex justify-center items-center gap-3 mb-8">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-2 relative">
                            <div className={`w-3 h-3 rotate-45 border transition-all duration-500 ${i < progress ? 'bg-[#D4AF37] border-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.6)]' : 'bg-transparent border-gray-700'}`}></div>
                            {i < 4 && <div className={`absolute top-[4px] left-[15px] w-8 h-[1px] ${i < progress ? 'bg-[#D4AF37]/50' : 'bg-gray-800'}`}></div>}
                        </div>
                    ))}
                </div>

                <div className="text-xl sm:text-2xl font-light leading-relaxed tracking-wider shadow-black drop-shadow-lg p-10 relative bg-black/40 backdrop-blur-sm border border-[#D4AF37]/10">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-[#D4AF37]/40"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#D4AF37]/40"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#D4AF37]/40"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-[#D4AF37]/40"></div>

                    <p className={`whitespace-pre-line ${!currentClue ? "animate-pulse text-gray-400 text-sm tracking-widest" : "text-gray-200"}`}>
                        {currentClue || "No active clue found..."}
                    </p>
                </div>

                <button
                    onClick={() => setIsScanning(true)}
                    className="mt-16 relative group overflow-hidden px-8 py-4 bg-transparent border border-[#D4AF37] text-[#D4AF37] uppercase text-[10px] font-bold tracking-[0.3em] transition-all hover:bg-[#D4AF37]/10"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                        Scan Target QR
                    </span>
                </button>
            </div>
        </div>
    );
}

export default function AppMain() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-transparent flex items-center justify-center text-[#D4AF37] text-[10px] tracking-widest uppercase animate-pulse">Initializing Scanner...</div>}>
            <MainAppContent />
        </Suspense>
    );
}
