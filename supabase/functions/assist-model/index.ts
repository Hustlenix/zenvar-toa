// ZENVAR · TOA-01 · ASSIST-MODEL EDGE FUNCTION
// ---------------------------------------------------------------
// Server-side relay that powers the GENERAL assistant with a free-tier
// chat model. The model API key lives ONLY in this function's secrets —
// it never ships to the browser (static GitHub Pages stays key-free).
//
// Flow:  assistant.html (model-provider.js) → POST this function
//        → function calls the OpenAI-compatible model → returns { ok, answer }
//
// Provider: any OpenAI-compatible endpoint. Set secrets:
//   MODEL_API_BASE   e.g. https://api.groq.com/openai/v1   (Groq free tier)
//   MODEL_API_KEY    your free-tier API key
//   MODEL_NAME       e.g. llama-3.3-70b-versatile
//   MODEL_ANON_KEY   OPTIONAL extrna guard. If set, requests must carry a
//                    `x-model-key` header matching it (the browser sends the
//                    Supabase anon key). If unset, the function still works
//                    but is open to whoever can reach it — set a key!
//
// Deploy once with:  supabase secrets set MODEL_API_KEY=... MODEL_API_BASE=...
//                    supabase functions deploy assist-model
// ---------------------------------------------------------------

const MODEL_BASE = Deno.env.get("MODEL_API_BASE") || "https://api.groq.com/openai/v1";
const MODEL_KEY = Deno.env.get("MODEL_API_KEY") || "";
const MODEL_NAME = Deno.env.get("MODEL_NAME") || "llama-3.3-70b-versatile";
const MODEL_GUARD = Deno.env.get("MODEL_ANON_KEY") || "";

// Build an honest grounded prompt from the TOA corpus + the user's request.
function buildSystem(corpus, mode, myName, email) {
  const rolesJson = Array.isArray(corpus && corpus.roles)
    ? JSON.stringify(corpus.roles, null, 2)
    : "[]";
  const sectionsJson = Array.isArray(corpus && corpus.sections)
    ? JSON.stringify(corpus.sections, null, 2)
    : "[]";
  const user = myName ? `The signed-in member's name is ${myName}.` : "";
  const who = myName && email ? ` (verified email ${email})` : "";
  const scope = corpus && corpus.brand ? corpus.brand : "Zenvar TOA-01";

  return [
    `You are the assistant for ${scope}, grounded ONLY on the TOA-01 operating system below.`,
    user + who,
    "",
    "GROUND TRUTH — ROLE ROSTER:",
    rolesJson,
    "",
    "GROUND TRUTH — OPERATING SECTIONS:",
    sectionsJson,
    "",
    "RULES:",
    "1. Answer ONLY from the grounded truth above. Never invent facts, members, metrics, or policies.",
    "2. If something is not covered, say so plainly and offer what IS covered (operating checks, a role spec, or a weekly report).",
    "3. Mode is " + (mode || "toa") + ".",
    "   - 'toa'   → answer TOA questions from the sections.",
    "   - 'report'→ draft a concise weekly progress report for the member (metric, what shipped, the named blocker, next action).",
    "   - 'general'→ chat helpfully but stay grounded in the truth above.",
    "4. Keep answers tight and useful. Use **bold** for key phrases.",
    ""
  ].join("\n");
}

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-model-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  // Optional guard key check.
  if (MODEL_GUARD) {
    if (req.headers.get("x-model-key") !== MODEL_GUARD) {
      return new Response(
        JSON.stringify({ ok: false, answer: { kind: "uncovered", source: "MODEL GATE", text: "The model relay is locked. Please re-sign-in and try again." } }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }
  }

  let ctx;
  try {
    ctx = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad json" }), { status: 400, headers: cors });
  }

  const text = String(ctx.text || "").trim();
  const mode = ctx.mode || "toa";
  const myName = ctx.myName || null;
  const email = ctx.email || null;
  const corpus = ctx.corpus || {};

  if (!text) {
    return new Response(JSON.stringify({ ok: true, answer: { kind: "uncovered", source: "MODEL", text: "I didn't catch that — what can I help with?" } }), { headers: cors });
  }

  // Model key not set yet → honest not-wired answer, so the chain never breaks.
  if (!MODEL_KEY) {
    return new Response(JSON.stringify({
      ok: true,
      answer: {
        kind: "model_pending",
        source: "MODEL NOT WIRED",
        text: "The model brain is deployed but not yet activated — no MODEL_API_KEY is set on this Edge Function. Add a free-tier key (e.g. Groq) to switch on real chat. The grounded TOA answers still work."
      }
    }), { headers: cors });
  }

  const system = buildSystem(corpus, mode, myName, email);
  const payload = {
    model: MODEL_NAME,
    temperature: 0.4,
    messages: [
      { role: "system", content: system },
      { role: "user", content: text }
    ],
    max_tokens: 700
  };

  try {
    const r = await fetch(MODEL_BASE.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + MODEL_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const errText = (await r.text()).slice(0, 300);
      return new Response(JSON.stringify({
        ok: true,
        answer: { kind: "uncovered", source: "MODEL ERROR", text: "The model relay returned an error (" + r.status + "). The grounded TOA answers still work — try \u201Cwhat are the operating checks?\u201D" }
      }), { headers: cors });
    }

    const data = await r.json();
    const ans = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";
    return new Response(JSON.stringify({
      ok: true,
      answer: { kind: "grounded", source: "MODEL · " + MODEL_NAME, text: ans }
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({
      ok: true,
      answer: { kind: "uncovered", source: "MODEL ERROR", text: "The model brain hit a network error. The grounded TOA answers still work." }
    }), { headers: cors });
  }
});
