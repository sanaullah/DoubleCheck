"""
Read-only diagnostic for the latest Modernize run.

Copies .db/doublecheck.db (plus WAL/SHM) to a temp snapshot and reports the
Modernize run metrics (pre-inversion pipeline; see .docs/plans/modernize-inversion-plan.md). Mutates nothing.

    python .docs/scripts/diag-modernization.py [--run <runId>]
"""
import argparse, collections, json, os, shutil, sqlite3, sys, tempfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB = os.environ.get("DOUBLECHECK_DB_PATH") or os.path.join(REPO, ".db", "doublecheck.db")


def snapshot(src):
    tmp = tempfile.mkdtemp(prefix="dc-diag-")
    dst = os.path.join(tmp, "dc.db")
    shutil.copy2(src, dst)
    for ext in ("-wal", "-shm"):
        if os.path.exists(src + ext):
            shutil.copy2(src + ext, dst + ext)
    return dst


def pct(n, d):
    return f"{(100.0 * n / d):.0f}%" if d else "n/a"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", help="run id (default: latest modernize run)")
    args = ap.parse_args()

    if not os.path.exists(DB):
        sys.exit(f"database not found: {DB}")

    con = sqlite3.connect(snapshot(DB))
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    if args.run:
        run_id = args.run
    else:
        cur.execute(
            "SELECT id FROM review_runs WHERE run_kind='modernize' "
            "ORDER BY created_at DESC LIMIT 1"
        )
        row = cur.fetchone()
        if not row:
            sys.exit("no modernize runs found")
        run_id = row["id"]

    cur.execute(
        "SELECT id,status,current_phase,project_path,mode,created_at,completed_at "
        "FROM review_runs WHERE id=?", (run_id,)
    )
    run = cur.fetchone()
    if not run:
        sys.exit(f"run not found: {run_id}")

    print("=" * 64)
    print("RUN", run_id)
    print("=" * 64)
    for k in run.keys():
        print(f"  {k}: {run[k]}")

    print("\n--- checkpoints ---")
    cur.execute(
        "SELECT stage,status,progress FROM modernization_checkpoints "
        "WHERE run_id=? ORDER BY updated_at", (run_id,)
    )
    for r in cur.fetchall():
        print(f"  {r['stage']:<18} {r['status']:<10} {r['progress']}%")

    cur.execute(
        "SELECT plan_json,validation_json,coverage_json,state FROM modernization_plans "
        "WHERE run_id=?", (run_id,)
    )
    row = cur.fetchone()
    if not row:
        print("\nNO PLAN ROW")
        return
    plan = json.loads(row["plan_json"])
    val = json.loads(row["validation_json"]) if row["validation_json"] else {}
    cov = json.loads(row["coverage_json"]) if row["coverage_json"] else {}
    print(f"\nplan state: {row['state']}")

    tgt = plan.get("target", {}) or {}
    units = tgt.get("units", []) or []
    print("\n--- artifact counts ---")
    print(f"  target.units      : {len(units)}")
    print(f"  target.placements : {len(tgt.get('placements') or [])}")
    for k in ("unitLinks", "routeContracts", "samples", "dbFindings",
              "dbTransitions", "roadmapPhases", "assumptions", "signals"):
        print(f"  {k:<18}: {len(plan.get(k) or [])}")

    llm = cov.get("llm", {}) or {}
    print("\n--- DEFECT 1: context grounding ---")
    print(f"  partitions          : {llm.get('partitions')}")
    print(f"  omittedPartitions   : {llm.get('omittedPartitions')}   <-- target 0")
    print(f"  contextCharacters   : {llm.get('contextCharacters')}")

    print("\n--- DEFECT 2: shard completeness ---")
    inv_files = {(f.get("filePath") or "").replace("\\", "/").lower()
                 for f in (plan.get("inventory", {}) or {}).get("files") or []}
    cfml = {p for p in inv_files if p.endswith((".cfm", ".cfc"))}
    mapped = set()
    for u in units:
        sp = (u.get("sourcePath") or "").replace("\\", "/").lower()
        if sp:
            mapped.add(sp)
    for l in plan.get("unitLinks", []) or []:
        sp = (l.get("sourcePath") or "").replace("\\", "/").lower()
        if sp:
            mapped.add(sp)
    unmapped = sorted(cfml - mapped)
    print(f"  CFML files          : {len(cfml)}")
    print(f"  unmapped            : {len(unmapped)} ({pct(len(unmapped), len(cfml))})   <-- target <=2")
    for p in unmapped[:20]:
        print(f"     - {p}")
    for e in plan.get("generationErrors", []) or []:
        print(f"  error: shard {e.get('shard')} {e.get('errorType')} ({e.get('role')})")

    notes = plan.get("generationNotes", []) or []
    dropped = [n for n in notes if n.get("message") == "omitted-unbacked-route"]
    print("\n--- DEFECT 3: routes ---")
    print(f"  routeContracts kept : {len(plan.get('routeContracts') or [])}   <-- target >=20")
    print(f"  routes dropped      : {len(dropped)} "
          f"{dict(collections.Counter(n.get('reason') for n in dropped))}")
    for n in notes:
        if n.get("message") == "dropped-unresolved-unit-links":
            print(f"  unitLinks dropped   : {n.get('count')}")

    phases = plan.get("roadmapPhases", []) or []
    withdb = sum(1 for p in phases if (p.get("dbFindingIds") or p.get("transitionIds")))
    withsamples = sum(1 for p in phases if p.get("sampleIds"))
    generic = [p for p in phases
               if str(p.get("name") or p.get("goal") or "").lower().startswith("continue")]
    generic_units = sum(len(p.get("unitIds") or []) for p in generic)
    print("\n--- DEFECT 4: roadmap actionability ---")
    print(f"  phases              : {len(phases)}")
    print(f"  phases w/ db links  : {withdb}/{len(phases)}   <-- target >=6")
    print(f"  phases w/ samples   : {withsamples}/{len(phases)}")
    print(f"  units in generic    : {generic_units} ({pct(generic_units, len(units))})   <-- target <20%")

    print("\n--- DEFECT 5: validation ---")
    counter = collections.Counter()
    for m in val.get("messages", []) or []:
        text = m.get("message", "")
        key = ("migration missing up/down" if "Migration is missing" in text
               else "no evidence references" if "no evidence references" in text
               else text[:52])
        counter[key] += 1
    print(f"  status={val.get('overallStatus')} blocking={val.get('blockingCount')} "
          f"warnings={val.get('warningCount')}")
    for k, c in counter.most_common(8):
        print(f"    {c:>3}  {k}")

    md = plan.get("metadata", {}) or {}
    shards = md.get("applicationShards", {}) or {}
    summary_omitted = ((plan.get("generationSummary", {}) or {})
                       .get("partialResults", {}) or {}).get("omittedPaths")
    print("\n--- DEFECT 6: honesty ---")
    print(f"  metadata.applicationShards.omitted : {shards.get('omitted')}")
    print(f"  generationSummary…omittedPaths     : {summary_omitted}")
    print(f"  coverage.llm.omittedPartitions     : {llm.get('omittedPartitions')}")
    if shards.get("omitted") != llm.get("omittedPartitions"):
        print("  MISMATCH: shard counters under-report context-budget omissions")

    print("\n--- DEFECT 7: confidence typing ---")
    conf = collections.Counter(str(u.get("confidence")) for u in units)
    numeric = {k: v for k, v in conf.items() if k.replace(".", "", 1).isdigit()}
    enum = {k: v for k, v in conf.items() if k not in numeric}
    print(f"  enum   : {enum}")
    print(f"  numeric: {numeric}")
    if numeric and enum:
        print("  MISMATCH: confidence emitted in two type systems")

    con.close()


if __name__ == "__main__":
    main()
