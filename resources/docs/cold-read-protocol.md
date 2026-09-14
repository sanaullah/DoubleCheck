# The Cold-Read Protocol — session sheet

**Purpose.** Measure the one thing CodeGraph's automated checks cannot: whether a
developer who has never seen a project can understand it from CodeGraph alone.

**Why this sheet exists.** The protocol has been specified since
[`plans/codegraph-remediation-plan.md`](plans/codegraph-remediation-plan.md) §2a
and never run, and the reason is mundane — it was a paragraph describing an
intention, not something a person could pick up and execute. Everything except a
person is now prepared here.

**What has already been measured, and what has not.**

| | Status |
|---|---|
| Instrument runs (can the surface produce each answer with evidence?) | **Done** — 17/17 on DoubleCheck, 14/15 applicable on ColdBox. See plan §34 |
| Human run (can a stranger *find* the answer and trust it?) | **Not done.** This sheet |

An instrument run proves the data exists. It cannot see whether a reader knows
where to click, phrases the question the way the API expects, or believes the
answer. Those are the failures this session is for. **Do not quote the
instrument scores as comprehension.**

---

## Before the session (5 minutes, run by anyone)

1. Start the app: `box server start`, then note the port it prints.
2. Build a map of the target project — the reader must never see this step:

```bash
curl -s -X POST "http://127.0.0.1:PORT/api/v1/runs" -H "Content-Type: application/json" -d '{"projectPath":"ABSOLUTE/PATH/TO/PROJECT","mode":"full","runKind":"codegraph"}'
```

3. Wait for `"status":"succeeded"`, then open the map at
   `http://127.0.0.1:PORT/codegraph?run=RUN_ID&depth=file` and confirm the canvas
   draws. Hand the reader that URL and nothing else.

### The prepared second project

`lib/coldbox` in this repository is the ColdBox framework: **205 ColdFusion files
written by someone else**, which nobody here has read. It is the "unfamiliar
ColdFusion repository" §2a asks for, it needs no network access, and it is known
to index — plan §34.4 has the numbers. Use it when no other unfamiliar CF project
is available.

---

## Choosing the reader

The reader must not have read the target project's source. That is the only hard
requirement.

- For **ColdBox**: almost any developer here qualifies, including the people who
  built DoubleCheck. Being expert in DoubleCheck does not disqualify you from
  cold-reading ColdBox — it is the *target* that must be unfamiliar.
- For **DoubleCheck**: a reader from outside the project is required, and this is
  the harder booking. Run the ColdBox session first; it is available today.

---

## Rules

1. **Only the CodeGraph UI and its API.** No source files, no editor search, no
   grep, no asking anyone, no reading this repository's docs.
2. **Think aloud.** The transcript is worth more than the score.
3. **A question is `answered` only if the reader can state the answer *and* point
   at the `file:line` CodeGraph gave them.** Confident and unsupported is
   `not answered`.
4. **Record where they looked before they found it.** A question answered after
   four wrong screens is a finding even though it scores `answered`.
5. **Stop at 30 minutes.** Whatever is unanswered is unanswered — that is the
   measurement.

Do not help. If the reader is stuck, record the stuck state and move on. The urge
to point at the right tab is the single biggest threat to this session's validity.

---

## Recording sheet

Time budget: **30 minutes total.** Copy this table and fill it in live.

| # | Question | Verdict | Time | Where they looked first | Where the answer actually came from | Evidence they cited |
|---|---|---|---|---|---|---|
| Q1 | What is this application, and how is it organised? | | | | | |
| Q2 | What are the main domains / modules / layers and their responsibilities? | | | | | |
| Q3 | Where are the entry points? | | | | | |
| Q4 | What starts each request, job, event or background process? | | | | | |
| Q5 | How does a JavaScript action reach an HTTP route? | | | | | |
| Q6 | How does a route reach a handler and action? | | | | | |
| Q7 | Which services, repositories, queries and tables participate? | | | | | |
| Q8 | What response or side effect completes the flow? | | | | | |
| Q9 | Which symbols define / reference / call / extend / test another? | | | | | |
| Q10 | Which configuration values influence each component? | | | | | |
| Q11 | Which tests exercise each implementation path? | | | | | |
| Q12 | What changes when a file, symbol, endpoint or table changes? | | | | | |
| Q13 | Where are the cycles, hotspots, dead code and violations? | | | | | |
| Q14 | What is proven, inferred, truncated, unsupported or unknown? | | | | | |
| Q15 | Where should I start reading? | | | | | |
| Q16 | Which components matter most, and why? | | | | | |
| Q17 | What external systems does this talk to? | | | | | |

**Verdicts:** `answered` · `partial` · `not answered` · `n/a` (the project has no
such thing — record *how the reader established that*, which is itself a test of
whether absence is distinguishable from failure).

Score as **answered / applicable**, and state the n/a count beside it. Never
report a bare fraction without the n/a count: a project with no SQL scoring 14/15
is not worse than one scoring 15/17.

---

## After the session

Record three things in the plan, in this order:

1. **The score**, with the n/a count and the target project named.
2. **Every question where the reader looked in the wrong place first.** This is
   the actual output. The instrument runs already proved the answers exist; only a
   human can show that they are in the wrong place, named the wrong thing, or not
   believed.
3. **Anything the reader stated confidently and wrongly.** A wrong answer
   delivered with confidence is the most serious result this protocol can produce,
   and it outranks the score.

If the reader answers fewer than 10 of 17, do not treat it as a UI polish item —
re-read plan §31, which found the product serving a weaker graph to every query
while its extraction tables looked healthy. The same shape of defect can hide
behind a working screen.
