// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import "./index.css";
import { openai, supabase, EMBEDDING_MODEL } from "./lib/config.js";
import { seedMoviesIfEmpty } from "./scripts/seed.js";

/* ─────────────────────────  Poster helper (OMDb)  ───────────────────────── */
const OMDB_KEY = import.meta.env.VITE_OMDB_API_KEY;

async function fetchPoster(title, year) {
  if (!OMDB_KEY) return null;
  try {
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&y=${encodeURIComponent(
      year ?? ""
    )}&apikey=${OMDB_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data?.Poster && data.Poster !== "N/A" ? data.Poster : null;
  } catch {
    return null;
  }
}

/* ─────────────────────────  Small UI bits  ───────────────────────── */
function PopcornLogo({ className = "w-16 h-16" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="g" x1="0" x2="1">
          <stop offset="0" stopColor="#ffd166" />
          <stop offset="1" stopColor="#ffe08a" />
        </linearGradient>
      </defs>
      <rect x="18" y="24" width="28" height="30" rx="6" fill="#ef4444" />
      <rect x="22" y="24" width="4" height="30" rx="2" fill="#ffffff" opacity=".9" />
      <rect x="30" y="24" width="4" height="30" rx="2" fill="#ffffff" opacity=".9" />
      <rect x="38" y="24" width="4" height="30" rx="2" fill="#ffffff" opacity=".9" />
      <circle cx="24" cy="20" r="7" fill="url(#g)" />
      <circle cx="34" cy="18" r="8" fill="url(#g)" />
      <circle cx="44" cy="20" r="6.5" fill="url(#g)" />
      <circle cx="30" cy="22" r="6.5" fill="url(#g)" />
      <circle cx="38" cy="22" r="6" fill="url(#g)" />
    </svg>
  );
}

function PhoneCard({ children, footer }) {
  return (
    <div className="min-h-screen bg-navy flex items-start justify-center py-10">
      <div className="w-[360px] sm:w-[392px] bg-navyCard rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,.45)] border border-slate-800 overflow-hidden">
        <div className="px-5 pt-8 pb-6">{children}</div>
        {footer ? <div className="px-5 pb-8">{footer}</div> : null}
      </div>
    </div>
  );
}

function GreenButton({ disabled, children, className = "", ...props }) {
  return (
    <button
      disabled={disabled}
      className={`w-full rounded-xl h-12 font-semibold text-black transition
        ${disabled ? "bg-slate-700 text-slate-300 cursor-not-allowed" : "bg-limeBtn hover:bg-limeBtnHover"} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Pill({ children }) {
  return (
    <div className="w-full bg-[#0b1630] border border-slate-700 rounded-xl h-10 flex items-center px-3 text-sm text-slate-200">
      {children}
    </div>
  );
}

/* ─────────────────────────  Start View  ───────────────────────── */
function StartView({ onStart }) {
  const [count, setCount] = useState(2);
  const [minutes, setMinutes] = useState(120);
  const valid = count > 0 && minutes > 0;

  return (
    <PhoneCard
      footer={<GreenButton disabled={!valid} onClick={() => onStart({ count, minutes })}>Start</GreenButton>}
    >
      <div className="flex flex-col items-center gap-3">
        <PopcornLogo />
        <h1 className="text-3xl font-extrabold">PopChoice</h1>
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-slate-300 text-sm">How many people?</label>
          <Pill>
            <input
              type="number"
              min={1}
              max={20}
              className="bg-transparent outline-none w-full"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value || "0", 10))}
            />
          </Pill>
        </div>

        <div className="space-y-2">
          <label className="text-slate-300 text-sm">How much time do you have? (minutes)</label>
          <Pill>
            <input
              type="number"
              min={30}
              step={15}
              className="bg-transparent outline-none w-full"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value || "0", 10))}
            />
          </Pill>
        </div>
      </div>
    </PhoneCard>
  );
}

/* ─────────────────────────  Person View(s)  ───────────────────────── */
function PersonView({ index, total, initial, onNext, onFinish }) {
  const [fav, setFav] = useState(initial?.fav ?? "");
  const [era, setEra] = useState(initial?.era ?? "New");
  const [tone, setTone] = useState(initial?.tone ?? "Fun");
  const [island, setIsland] = useState(initial?.island ?? "");

  const canProceed = fav.trim().length > 0;

  return (
    <PhoneCard
      footer={
        total > 1 && index < total ? (
          <GreenButton disabled={!canProceed} onClick={() => onNext({ fav, era, tone, island })}>
            Next Person
          </GreenButton>
        ) : (
          <GreenButton disabled={!canProceed} onClick={() => onFinish({ fav, era, tone, island })}>
            Get Movie
          </GreenButton>
        )
      }
    >
      <div className="flex flex-col items-center gap-3">
        <PopcornLogo />
        <div className="text-3xl font-extrabold">PopChoice</div>
        <div className="mt-1 w-8 h-8 rounded-full bg-[#0b1630] border border-slate-700 text-slate-200 flex items-center justify-center text-sm">
          {index}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="space-y-2">
          <label className="text-slate-300 text-sm">What’s your favorite movie and why?</label>
          <textarea
            className="w-full rounded-xl bg-[#0b1630] border border-slate-700 p-3 text-slate-100 text-sm outline-none focus:border-slate-500 resize-none"
            rows={4}
            placeholder="The Shawshank Redemption — because it gives me hope…"
            value={fav}
            onChange={(e) => setFav(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-slate-300 text-sm">Are you in the mood for something new or a classic?</label>
          <Pill>
            <select className="bg-transparent outline-none w-full" value={era} onChange={(e) => setEra(e.target.value)}>
              <option>New</option>
              <option>Classic</option>
            </select>
          </Pill>
        </div>

        <div className="space-y-2">
          <label className="text-slate-300 text-sm">What are you in the mood for?</label>
          <Pill>
            <select className="bg-transparent outline-none w-full" value={tone} onChange={(e) => setTone(e.target.value)}>
              <option>Fun</option>
              <option>Serious</option>
              <option>Inspiring</option>
              <option>Scary</option>
            </select>
          </Pill>
        </div>

        <div className="space-y-2">
          <label className="text-slate-300 text-sm">
            Which famous film person would you love to be stranded on an island with and why?
          </label>
          <textarea
            className="w-full rounded-xl bg-[#0b1630] border border-slate-700 p-3 text-slate-100 text-sm outline-none focus:border-slate-500 resize-none"
            rows={3}
            placeholder="Tom Hanks — because he’s funny and I loved him in Cast Away!"
            value={island}
            onChange={(e) => setIsland(e.target.value)}
          />
        </div>
      </div>
    </PhoneCard>
  );
}

/* ─────────────────────────  Result View (Figma-style)  ───────────────────────── */
function ResultView({ result, onAgain, onNext, nextLoading }) {
  return (
    <PhoneCard
      footer={
        <div className="grid grid-cols-2 gap-3">
          <GreenButton onClick={onAgain}>Go Again</GreenButton>
          <button
            onClick={onNext}
            disabled={nextLoading}
            className={`rounded-xl h-12 font-semibold ${
              nextLoading ? "bg-slate-700 text-slate-300 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-600 text-white"
            }`}
          >
            {nextLoading ? "Finding…" : "Next Movie"}
          </button>
        </div>
      }
    >
      <div className="text-center">
        <div className="text-slate-300 text-xs uppercase tracking-wide">Recommendation</div>
        <h2 className="text-2xl font-extrabold mt-2">{result.title}</h2>
        {result.year && <div className="text-slate-400 text-sm mt-1">({result.year})</div>}
      </div>

      {/* Poster */}
      {result.poster && (
        <div className="mt-5 flex justify-center">
          <img
            src={result.poster}
            alt={`${result.title} poster`}
            className="w-56 h-auto object-cover rounded-xl shadow-[0_20px_60px_rgba(0,0,0,.45)] border border-slate-800"
          />
        </div>
      )}

      <div className="mt-5 space-y-4">
        <p className="text-slate-200 text-sm leading-relaxed">{result.description}</p>

        {result.explanation && (
          <div className="rounded-xl bg-[#0b1630] border border-slate-800 p-3 text-slate-100 text-sm">
            {result.explanation}
          </div>
        )}

        <div className="text-[11px] text-slate-500">Similarity: {result.similarity?.toFixed(3)}</div>
      </div>
    </PhoneCard>
  );
}

/* ─────────────────────────  Main App  ───────────────────────── */
export default function App() {
  const [view, setView] = useState("start"); // 'start' | 'person' | 'result'
  const [peopleCount, setPeopleCount] = useState(1);
  const [minutes, setMinutes] = useState(120);

  const [answers, setAnswers] = useState([]); // [{fav, era, tone, island}, ...]
  const [currentIndex, setCurrentIndex] = useState(1);

  const [result, setResult] = useState(null);
  const [lastEmbedding, setLastEmbedding] = useState(null);
  const [lastShownIds, setLastShownIds] = useState([]);
  const [nextLoading, setNextLoading] = useState(false);

  const [seedStatus, setSeedStatus] = useState("");

  // Seed once (only if empty)
  useEffect(() => {
    (async () => {
      try {
        setSeedStatus("Seeding…");
        await seedMoviesIfEmpty();
      } catch (e) {
        console.error("Seeding error:", e);
      } finally {
        setSeedStatus("");
      }
    })();
  }, []);

  const groupPrompt = useMemo(() => {
    if (!answers.length) return "";
    const per = answers
      .map(
        (a, i) =>
          `Person ${i + 1}: Favorite="${a.fav}". Era=${a.era}. Mood=${a.tone}. Island=${a.island || "—"}.`
      )
      .join("\n");
    return `Movie night with ${answers.length} people. Time available: ${minutes} minutes.\n${per}`;
  }, [answers, minutes]);

  async function recommendFromGroup(textPrompt) {
    // 1) embedding
    const emb = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: textPrompt,
    });
    const queryEmbedding = emb.data[0].embedding;
    setLastEmbedding(queryEmbedding);

    // 2) match from Supabase
    const { data: matches, error } = await supabase.rpc("match_movies", {
      query_embedding: queryEmbedding,
      match_count: 3,
    });
    if (error) throw error;

    const pick = matches.find((m) => !lastShownIds.includes(m.id)) ?? matches[0];
    if (!pick) throw new Error("No matches found.");

    setLastShownIds((prev) => [...prev, pick.id]);

    // 3) explanation
    const sys =
      "You are PopChoice, a warm, concise movie recommender. Explain in 1–2 sentences why the film fits the group's mood. No spoilers.";
    const user = `Group answers:\n${textPrompt}\n\nRecommended movie:\n${pick.title} (${pick.release_year})\n${pick.description}`;
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: 120,
    });

    // 4) poster
    const poster = await fetchPoster(pick.title, pick.release_year);

    return {
      title: pick.title,
      year: pick.release_year,
      description: pick.description,
      explanation: chat.choices?.[0]?.message?.content?.trim() ?? "",
      similarity: pick.similarity,
      poster, // 👈 used by ResultView
    };
  }

  /* Flow handlers */
  function handleStart({ count, minutes: mins }) {
    setPeopleCount(count);
    setMinutes(mins);
    setAnswers([]);
    setCurrentIndex(1);
    setLastShownIds([]);
    setResult(null);
    setView("person");
  }

  function handleNextPerson(a) {
    setAnswers((prev) => [...prev, a]);
    setCurrentIndex((i) => i + 1);
  }

  async function handleFinishLast(a) {
    const all = [...answers, a];
    setAnswers(all);
    try {
      const rec = await recommendFromGroup(
        `People: ${peopleCount}, Time: ${minutes} minutes.\n` +
          all
            .map(
              (x, i) =>
                `Person ${i + 1}: Favorite="${x.fav}". Era=${x.era}. Mood=${x.tone}. Island=${x.island || "—"}.`
            )
            .join("\n")
      );
      setResult(rec);
      setView("result");
    } catch (e) {
      console.error(e);
      alert(e.message || "Recommendation failed.");
    }
  }

  async function handleNextMovie() {
    if (!lastEmbedding) return;
    setNextLoading(true);
    try {
      const { data: matches, error } = await supabase.rpc("match_movies", {
        query_embedding: lastEmbedding,
        match_count: 5,
      });
      if (error) throw error;

      const next = matches.find((m) => !lastShownIds.includes(m.id)) ?? matches[0];
      if (!next) return;

      setLastShownIds((prev) => [...prev, next.id]);

      const chat = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are PopChoice. 1–2 sentences, friendly, no spoilers." },
          {
            role: "user",
            content: `Group answers:\n${groupPrompt}\n\nNext recommended:\n${next.title} (${next.release_year})\n${next.description}`,
          },
        ],
        max_tokens: 120,
        temperature: 0.7,
      });

      const poster = await fetchPoster(next.title, next.release_year);

      setResult({
        title: next.title,
        year: next.release_year,
        description: next.description,
        explanation: chat.choices?.[0]?.message?.content?.trim() ?? "",
        similarity: next.similarity,
        poster,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setNextLoading(false);
    }
  }

  return (
    <>
      {seedStatus && (
        <div className="w-full text-center text-[11px] text-slate-300 bg-slate-900 py-1">{seedStatus}</div>
      )}

      {view === "start" && <StartView onStart={handleStart} />}

      {view === "person" &&
        (currentIndex <= peopleCount ? (
          <PersonView
            index={currentIndex}
            total={peopleCount}
            initial={answers[currentIndex - 1]}
            onNext={handleNextPerson}
            onFinish={handleFinishLast}
          />
        ) : null)}

      {view === "result" && result && (
        <ResultView
          result={result}
          nextLoading={nextLoading}
          onAgain={() => {
            setView("start");
            setAnswers([]);
            setResult(null);
            setCurrentIndex(1);
            setLastEmbedding(null);
            setLastShownIds([]);
          }}
          onNext={handleNextMovie}
        />
      )}
    </>
  );
}
