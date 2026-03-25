"use client";
import { useEffect, useState } from "react";

export function Particles() {
    const [dots, setDots] = useState<any[]>([]);

    useEffect(() => {
        // Generate 50 premium ambient golden particles on mount exclusively on client
        const newDots = Array.from({ length: 50 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100 + "vw",
            top: Math.random() * 100 + "vh",
            size: Math.random() * 6 + 3 + "px", // Bigger: 3px to 9px
            duration: Math.random() * 25 + 20 + "s", // Much slower: 20s to 45s
            delay: Math.random() * -45 + "s", // Huge negative delay smears them perfectly across the screen immediately
            baseOpacity: Math.random() * 0.4 + 0.1, // Softer baseline opacity
        }));
        setDots(newDots);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[0] overflow-hidden">
            {dots.map((dot) => (
                <div
                    key={dot.id}
                    className="particle absolute rounded-full bg-[#D4AF37]"
                    style={{
                        left: dot.left,
                        top: dot.top,
                        width: dot.size,
                        height: dot.size,
                        opacity: dot.baseOpacity,
                        animation: `float ${dot.duration} infinite ease-in-out`,
                        animationDelay: dot.delay,
                        filter: "blur(1px)",
                        boxShadow: "0 0 15px rgba(212,175,55,0.6)"
                    }}
                />
            ))}
        </div>
    );
}
