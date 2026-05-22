"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SPORTS = [
  { name: "Rugby", emoji: "🏉" },
  { name: "Soccer", emoji: "⚽" },
  { name: "Basketball", emoji: "🏀" },
  { name: "NFL", emoji: "🏈" },
  { name: "Baseball", emoji: "⚾" },
  { name: "Hockey", emoji: "🏒" },
  { name: "Tennis", emoji: "🎾" },
  { name: "Cricket", emoji: "🏏" },
  { name: "Motorsport", emoji: "🏎️" },
];

export default function HomePage() {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  function toggle(sport: string) {
    setSelected((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  }

  function handleContinue() {
    if (selected.length === 0) return;
    localStorage.setItem("selectedSports", JSON.stringify(selected));
    router.push("/query");
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-4xl md:text-5xl font-bold text-center mb-2">
        What Sports Do You <span className="text-gold">Love</span>?
      </h1>
      <p className="text-gray-400 text-lg mb-10 text-center">
        Select the sports that matter most to your city
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl w-full mb-10">
        {SPORTS.map((sport) => {
          const isSelected = selected.includes(sport.name);
          return (
            <button
              key={sport.name}
              onClick={() => toggle(sport.name)}
              className={`
                relative p-6 rounded-xl text-center transition-all duration-200
                hover:scale-105 hover:shadow-lg cursor-pointer
                ${
                  isSelected
                    ? "bg-navy-lighter border-2 border-gold shadow-[0_0_12px_rgba(212,168,83,0.3)]"
                    : "bg-navy-light border-2 border-transparent hover:border-blue/50"
                }
              `}
            >
              <div className="text-3xl mb-2">{sport.emoji}</div>
              <div className="font-semibold text-sm">{sport.name}</div>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={selected.length === 0}
        className={`
          px-8 py-3 rounded-lg font-bold text-lg transition-all duration-200
          ${
            selected.length > 0
              ? "bg-gold text-navy hover:bg-gold/90 cursor-pointer"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }
        `}
      >
        Continue ({selected.length} selected)
      </button>
    </main>
  );
}
