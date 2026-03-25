"use client";
import { useEffect, useState } from "react";

export function Particles() {
    const [dots, setDots] = useState<any[]>([]);

    useEffect(() => {
        // Generate 40 random golden particles on mount exclusively on client
        const newDots = Array.from({ length: 40 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100 + "vw",
            top: Math.random() * 100 + "vh",
            size: Math.random() * 2 + 1 + "px",
            duration: Math.random() * 20 + 15 + "s",
            delay: Math.random() * -20 + "s",
        }));
        setDots(newDots);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[0] overflow-hidden">
            {dots.map((dot) => (
                <div
                    key={dot.id}
                    className="particle absolute rounded-full bg-[#D4AF37]/60"
                    style={{
                        left: dot.left,
                        top: dot.top,
                        width: dot.size,
                        height: dot.size,
                        animation: `float ${dot.duration} infinite linear`,
                        animationDelay: dot.delay,
                        boxShadow: "0 0 10px rgba(212,175,55,0.8)"
                    }}
                />
            ))}
        </div>
    );
}
