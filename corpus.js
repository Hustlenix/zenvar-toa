/*
 * ZENVAR · TOA-01 · ASSIST CORPUS
 *
 * The grounded knowledge base the Zenvar member assistant answers from.
 *
 * This is a STATIC re-statement of the live TOA-01 document (index.html) and
 * the individual role pages. It is the source of truth for the deterministic
 * assistant today, and becomes the retrieval context (RAG source) for the
 * model-backed assistant once a provider is wired in. If the agreement text
 * changes, this file must change with it — keep the wording faithful.
 *
 * Deliberately: only text that is actually in the signed agreement / role
 * pages is here. Nothing is invented. Where the assistant is asked something
 * not covered, it says so instead of making things up.
 */
window.ZENVAR_CORPUS = window.ZENVAR_CORPUS || {
  // ── The company / framing ──
  company: {
    name: "Zenvar",
    division: "Operations Division",
    doc: "TOA-01 · Team Operating Agreement · Rev A",
    lines: [
      "Content growth",
      "Website builds",
      "Business automation"
    ],
    framing:
      "Zenvar is a real business, not a project. Members are paid to deliver results for clients in three areas: content growth, website builds, and business automation. This agreement defines how we work, how we are measured, and what is expected of every member."
  },

  // ── Section 02 · Operating checks ──
  checks: [
    {
      id: "Q1",
      title: "SIGNAL OVER NOISE",
      text: "Spend time on work that moves a client result or a team metric forward. Planning, tweaking, and looking busy are not signal."
    },
    {
      id: "Q2",
      title: "ATTACK THE BOTTLENECK",
      text: "Before starting new work, identify what is actually limiting progress, for you or for the team, and fix that first."
    },
    {
      id: "Q3",
      title: "NUMBERS OVER FEELINGS",
      text: "\u201CI think I improved\u201D is not an update. Bring the number: leads sent, revenue, deliverables shipped, deadlines hit."
    }
  ],

  // ── Section 04 · Procedure (work standards) ──
  procedure: [
    { id: "STEP 01", text: "Show up daily with intent. No excuses for avoidable misses; if you miss work, you fill the gap later." },
    { id: "STEP 02", text: "Complete assigned work on time. Flag the delay before the deadline, not after." },
    { id: "STEP 03", text: "Apply judgment before escalating. Check the relevant SOP or checklist first. If it answers your question, don't send it to Hemanathan for approval." },
    { id: "STEP 04", text: "Take ownership of your role's outcome, not just your task list." },
    { id: "STEP 05", text: "Give and accept direct feedback, on your own work and on teammates'." },
    { id: "STEP 06", text: "Improve at least one relevant skill every week." }
  ],

  // ── Section 05 · Inspection (weekly review gauges) ──
  inspection: {
    gauges: [
      { id: "GAUGE i", text: "Work completed against what was assigned" },
      { id: "GAUGE ii", text: "The weekly metric for that role (parts list, item by item)" },
      { id: "GAUGE iii", text: "One blocker or bottleneck that slowed the work down" }
    ],
    cycle:
      "The weekly review covers what shipped, what the numbers show, and what system needs to change. Underperformance is addressed directly and specifically with the individual, not through group messages. The review loop: SHIP, REVIEW THE NUMBERS, NAME THE BLOCKER, CHANGE THE SYSTEM."
  },

  // ── Section 06 · Culture ──
  culture: [
    "We solve problems together and communicate honestly.",
    "We do not tolerate blame-shifting, ego, or repeated unexplained misses.",
    "Effort is respected. Consistency is expected. Improvement is required. Results are how we measure it."
  ],

  // ── Section 07 · Approvals (commitments made by signing) ──
  approvals: [
    { ref: "\u00A71", text: "Own your role and its weekly metric" },
    { ref: "\u00A72", text: "Follow the standards in Sections 04 and 05" },
    { ref: "\u00A73", text: "Contribute to the team's results, not just your own task list" }
  ],

  // ── Parts list / roles ──
  // Each role: item number, member name, role title, weekly metric, and a
  // short list of the role's core duties verbatim from the role page where
  // the page text was available. Roles marked duties:[] simply have page
  // detail not yet transcribed into this corpus — the assistant will point
  // to the live role page rather than guess.
  roles: [
    {
      item: "01",
      member: "Lalith",
      title: "CTO · Automation Lead",
      metric: "Automations shipped / client outcomes",
      reportsTo: "Hemanathan (CEO)",
      coLead: "Darmigan (Web Lead)",
      duties: [
        { id: "DUTY 01", name: "Client Workflow Architecture", text: "Map client business bottlenecks into automated systems. Design workflows that eliminate manual data entry, connect disjointed software, and remove operational friction." },
        { id: "DUTY 02", name: "End-to-End Build & Deployment", text: "Implement, test, and ship automation pipelines using APIs, webhooks, serverless functions, and integration platforms. Every automation must have error handling and logging." },
        { id: "DUTY 03", name: "Internal Tooling & Infrastructure", text: "Maintain Zenvar internal pipeline tools. Build and optimize automations connecting Shanjay lead capture, Noel outreach CRM, and Hemanathan calendar schedules." },
        { id: "DUTY 04", name: "Cross-Stack Technical Coverage", text: "Maintain full working capability across both web engineering and business automations alongside Darmigan. No technical silos exist." }
      ],
      gauges: [
        "Total automations shipped vs assigned",
        "Client outcome validation rate (100% target)",
        "One technical bottleneck resolved this week"
      ]
    },
    { item: "02", member: "Darmigan", title: "CTO · Web Lead", metric: "Sites shipped / client outcomes", reportsTo: "Hemanathan (CEO)", coLead: "Lalith (Automation Lead)", duties: [], gauges: [] },
    { item: "03", member: "Charvesh", title: "Content & Marketing Lead", metric: "Content published & marketing reach", reportsTo: "Hemanathan (CEO)", duties: [], gauges: [] },
    { item: "04", member: "Hari", title: "Content & Marketing", metric: "Content edited / produced & turnaround time", reportsTo: "Charvesh (Content & Marketing Lead)", duties: [], gauges: [] },
    { item: "05", member: "Noel", title: "Operations & SDR", metric: "Outreach sent & qualified calls booked", reportsTo: "Hemanathan (CEO)", duties: [], gauges: [] },
    { item: "06", member: "Shanjay", title: "Lead Generation & Customer Profile Manager", metric: "Leads generated & profiles maintained", reportsTo: "Hemanathan (CEO)", duties: [], gauges: [] },
    { item: "07", member: "Hemanathan", title: "Founder / CEO · Sales Closing", metric: "Deals closed, revenue & team execution", reportsTo: "—", duties: [], gauges: [] },
    { item: "08", member: "Sheryan", title: "Editor · Content Post-Production", metric: "Completed edits & verification turnaround", reportsTo: "Charvesh (Content & Marketing Lead)", duties: [], gauges: [] }
  ]
};
