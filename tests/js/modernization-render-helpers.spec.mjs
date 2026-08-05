import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const helpers = require("../../public/assets/modernization-render-helpers.js");

// modernizationEvidenceBasisNote
assert.equal(
	helpers.modernizationEvidenceBasisNote({ evidenceBasis: "domain-clustering" }),
	"Grouped by shared domain — no deployment seam evidenced yet."
);
assert.equal(
	helpers.modernizationEvidenceBasisNote({ evidenceBasis: "explicit-seam" }),
	"Explicit runtime/deployment seam observed."
);
assert.equal(helpers.modernizationEvidenceBasisNote({ evidenceBasis: "unknown" }), "");
assert.equal(helpers.modernizationEvidenceBasisNote({}), "");

// modernizationMessageIsNote / modernizationGenerationErrors / modernizationGenerationNotes
assert.equal(helpers.modernizationMessageIsNote({ severity: "info" }), true);
assert.equal(helpers.modernizationMessageIsNote({ message: "synthesized-from-application-maps" }), true);
assert.equal(helpers.modernizationMessageIsNote({ message: "cost-reserved-for-roadmap" }), true);
assert.equal(helpers.modernizationMessageIsNote({ message: "budget-exceeded" }), false);

const mixedMessages = {
	generationErrors: [
		{ role: "modernization-roadmap", message: "budget-exceeded" },
		{ role: "modernization-roadmap", message: "synthesized-from-application-maps", severity: "info" }
	]
};
assert.deepEqual(
	helpers.modernizationGenerationErrors(mixedMessages).map((item) => item.message),
	["budget-exceeded"]
);
assert.deepEqual(
	helpers.modernizationGenerationNotes(mixedMessages).map((item) => item.message),
	["synthesized-from-application-maps"]
);

// modernizationPlanIsHollow
assert.equal(helpers.modernizationPlanIsHollow({ target: { units: [{ id: "tu-1" }] } }), false);
assert.equal(
	helpers.modernizationPlanIsHollow({
		target: { units: [] },
		routeContracts: [],
		generationErrors: [{ role: "modernization-application", message: "provider-failed" }]
	}),
	true
);
assert.equal(
	helpers.modernizationPlanIsHollow({
		target: { units: [] },
		routeContracts: [],
		roadmapPhases: [{ id: "phase-1", unitIds: [] }]
	}),
	true,
	"phases with no code links at all count as hollow"
);
assert.equal(
	helpers.modernizationPlanIsHollow({
		target: { units: [] },
		routeContracts: [],
		roadmapPhases: [{ id: "phase-1", unitIds: ["tu-1"] }]
	}),
	false,
	"at least one mapped phase is not hollow even with no top-level units/routes"
);
assert.equal(
	helpers.modernizationPlanIsHollow({
		metadata: { roadmapSource: "synthesized" },
		target: {
			units: [
				{ id: "coverage-1", provenanceClass: "deterministically-derived" },
				{ id: "coverage-2", provenanceClass: "deterministically-derived" }
			],
			placements: [{ id: "ctx-1", name: "ColdBox modular monolith (default)", placementType: "main-app" }]
		},
		roadmapPhases: [{ id: "phase-1", unitIds: ["coverage-1"] }],
		generationNotes: [{ message: "inventory-coverage-fallback", count: 2 }]
	}),
	true,
	"synthesized default-monolith road with coverage-stub majority is hollow"
);
assert.equal(
	helpers.modernizationPlanIsHollow({
		metadata: { roadmapSource: "synthesized" },
		target: {
			units: Array.from({ length: 30 }, (_, i) => ({
				id: `coverage-${i}`,
				provenanceClass: "deterministically-derived"
			})),
			placements: [
				{ id: "ctx-mod", name: "ColdBox module candidate: bridgeway", placementType: "coldbox-module", targetUnitIds: ["coverage-1"] },
				{ id: "ctx-jobs", name: "Scheduled / background workers", placementType: "main-app", targetUnitIds: ["coverage-2"] }
			]
		},
		roadmapPhases: [
			{ id: "phase-1", unitIds: ["coverage-1"] },
			{ id: "phase-2", unitIds: ["coverage-2"] }
		],
		generationNotes: [{ message: "inventory-coverage-fallback", count: 30 }]
	}),
	true,
	"directory-clustered synthesized packaging without migration steps is hollow"
);
assert.equal(
	helpers.modernizationPlanIsHollow({
		target: {
			units: [
				{ id: "coverage-1", provenanceClass: "deterministically-derived" },
				{ id: "coverage-2", provenanceClass: "deterministically-derived" },
				{ id: "tu-llm", provenanceClass: "model-generated" }
			]
		},
		generationNotes: [{ message: "inventory-coverage-fallback", count: 2 }]
	}),
	true,
	"coverage-fallback majority over LLM-mapped units counts as hollow"
);
assert.equal(
	helpers.modernizationPlanIsHollow({
		target: {
			units: [
				{ id: "tu-1", provenanceClass: "model-generated" },
				{ id: "tu-2", provenanceClass: "model-generated" },
				{ id: "coverage-1", provenanceClass: "deterministically-derived" }
			]
		},
		generationNotes: [{ message: "inventory-coverage-fallback", count: 1 }]
	}),
	false,
	"LLM-mapped majority is not hollow"
);
assert.equal(
	helpers.modernizationPlanIsHollow({
		metadata: { roadmapSource: "synthesized", architectureSource: "synthesized" },
		target: {
			units: Array.from({ length: 108 }, (_, i) => ({
				id: `tu-${i}`,
				provenanceClass: "provider-suggested"
			})),
			placements: [
				{ id: "p1", name: "ColdBox module candidate: model", placementType: "coldbox-module" },
				{ id: "p2", name: "ColdBox module candidate: services", placementType: "coldbox-module" }
			]
		},
		roadmapPhases: Array.from({ length: 6 }, (_, i) => ({
			id: `phase-${i}`,
			unitIds: [`tu-${i}`],
			migrationSteps: []
		})),
		samples: [],
		generationNotes: [{ message: "inventory-coverage-fallback", count: 56 }],
		generationSummary: { incompleteStages: ["database", "architecture", "roadmap"], actionability: "incomplete" }
	}),
	true,
	"CFTunes-shaped synthesized road with empty migration steps is hollow despite many LLM units"
);
assert.equal(
	helpers.modernizationPlanIsHollow({
		metadata: { roadmapSource: "provider" },
		target: { units: [{ id: "tu-1", provenanceClass: "provider-suggested" }] },
		samples: [{ id: "s1" }],
		roadmapPhases: [{
			id: "phase-1",
			unitIds: ["tu-1"],
			migrationSteps: [{ order: 1, action: "map" }]
		}]
	}),
	false,
	"provider roadmap with samples and migration steps is not hollow"
);

// modernizationGenerationSummary
{
	const summary = helpers.modernizationGenerationSummary({
		generationSummary: {
			status: "partial_failure",
			stage: "proposal_generation",
			errorType: "request_timeout",
			retryable: true,
			completedStages: ["inventory", "schema", "context", "evidence", "application-shards"],
			incompleteStages: ["architecture", "roadmap"],
			checkpointId: "run-1:proposal"
		}
	});
	assert.equal(summary.status, "partial_failure");
	assert.equal(summary.errorType, "request_timeout");
	assert.equal(summary.retryable, true);
	assert.deepEqual(summary.incompleteStages, ["architecture", "roadmap"]);
	assert.equal(summary.checkpointId, "run-1:proposal");
}
assert.equal(helpers.modernizationGenerationSummary({}).status, "");

// modernizationPaneBanner
assert.equal(
	helpers.modernizationPaneBanner("database", {
		dbFindings: [],
		dbTransitions: [],
		generationErrors: [{ role: "modernization-database", message: "provider-failed" }]
	}),
	"Database analysis didn't complete for this run — schema findings and migrations are not available yet."
);
assert.equal(
	helpers.modernizationPaneBanner("database", { dbFindings: [{ id: "f-1" }], dbTransitions: [] }),
	"",
	"no banner when findings exist even if a database error is present elsewhere"
);
assert.equal(
	helpers.modernizationPaneBanner("routes", {
		routeContracts: [],
		metadata: { applicationShards: { failed: 1, omitted: 0 } }
	}),
	"Some application shards didn't complete — routes may be missing rather than genuinely absent."
);
assert.equal(
	helpers.modernizationPaneBanner("routes", { routeContracts: [{ id: "r-1" }], metadata: { applicationShards: { failed: 3 } } }),
	"",
	"no banner when routes exist, even if some shards failed"
);
assert.equal(helpers.modernizationPaneBanner("contexts", {}), "", "unrelated panes never get a banner");

// modernizationValidationStatus
assert.equal(helpers.modernizationValidationStatus({ validationStatus: "passed" }), "valid");
assert.equal(helpers.modernizationValidationStatus({ validationLevel: "blocking" }), "blocking");
assert.equal(helpers.modernizationValidationStatus({ status: "warning" }), "warning");
assert.equal(helpers.modernizationValidationStatus({}), "unknown");

// modernizationItemLabel / modernizationItemKey
assert.equal(helpers.modernizationItemLabel({ _modernizationType: "roadmap-phase", name: "Orders slice" }), "Orders slice");
assert.equal(
	helpers.modernizationItemKey({ itemFingerprint: "fp-1", id: "id-1" }),
	"fp-1",
	"fingerprint wins over id when both are present"
);
assert.equal(
	helpers.modernizationItemKey({ id: "id-1" }),
	"id-1",
	"falls back to id when there is no fingerprint"
);

// modernizationItemMeta
assert.match(
	helpers.modernizationItemMeta({ _modernizationType: "db-finding", category: "index", severity: "high", expandContract: "expand" }),
	/index · high · expand/
);

// phaseHasCodeLinks
assert.equal(helpers.phaseHasCodeLinks({ unitIds: ["tu-1"] }), true);
assert.equal(helpers.phaseHasCodeLinks({ unitIds: [], routeIds: [], dbFindingIds: [], transitionIds: [] }), false);

// modernizationItems: contexts/extracts merge into one "contexts" pane, each tagged with its own type
const items = helpers.modernizationItems(
	{
		target: {
			contexts: [{ id: "ctx-1", name: "Crime" }],
			extracts: [{ id: "ext-1", name: "Spellcheck" }]
		}
	},
	"contexts"
);
assert.deepEqual(items.map((item) => item._modernizationType), ["context", "extract"]);

const placementItems = helpers.modernizationItems({ target: { placements: [{ id: "p-1", name: "Orders", placementType: "coldbox-module" }], contexts: [{ id: "legacy-context" }] } }, "contexts");
assert.deepEqual(placementItems.map((item) => item._modernizationType), ["placement"]);
assert.match(helpers.modernizationItemMeta({ _modernizationType: "placement", placementType: "external-service", gateStatus: "needs-review", gates: [{ status: "unknown" }] }), /external-service · needs-review · 1 unknown gates/);

// buildModernizationArchitectureSubgraph: turns target.contexts/target.extracts
// into the {nodes,edges} shape ArchitectureFlow.layoutFlowPositions() expects.
// Every context gets its own node regardless of packaging — a centralized
// context is still a real packaging decision, not something to fold away.
{
	const result = {
		target: {
			units: [ { id: "u1" }, { id: "u2" }, { id: "u3" }, { id: "u4" }, { id: "u5" } ],
			contexts: [
				{ id: "ctx-central", name: "Config", packaging: "centralized", targetUnitIds: [ "u1" ] },
				{ id: "ctx-crime", name: "Crime", packaging: "coldbox-module", targetUnitIds: [ "u2", "u3" ], dependsOnContextIds: [ "ext-spell" ] }
			],
			extracts: [
				{ id: "ext-spell", name: "Spellcheck", targetUnitIds: [ "u4" ] }
			]
		}
	};
	const subgraph = helpers.buildModernizationArchitectureSubgraph(result);
	assert.equal(subgraph.mode, "modernization-architecture");
	// core + centralized context + coldbox-module + extract
	assert.equal(subgraph.nodes.length, 4);
	const core = subgraph.nodes.find((n) => n.id === "core");
	assert.ok(core, "core node exists");
	// u5 belongs to no context/extract at all -> counted as ungrouped on core.
	assert.equal(core.unitCount, 1);
	const central = subgraph.nodes.find((n) => n.id === "ctx-central");
	assert.equal(central.role, "centralized");
	assert.equal(central.unitCount, 1);
	const crime = subgraph.nodes.find((n) => n.id === "ctx-crime");
	assert.equal(crime.role, "module");
	assert.equal(crime.unitCount, 2);
	const spell = subgraph.nodes.find((n) => n.id === "ext-spell");
	assert.equal(spell.role, "extract");
	// Every context/extract gets an edge back to core, plus the explicit
	// dependsOnContextIds edge from Crime to Spellcheck.
	assert.ok(subgraph.edges.some((e) => e.from === "core" && e.to === "ctx-central"));
	assert.ok(subgraph.edges.some((e) => e.from === "core" && e.to === "ctx-crime"));
	assert.ok(subgraph.edges.some((e) => e.from === "core" && e.to === "ext-spell"));
	assert.ok(subgraph.edges.some((e) => e.from === "ctx-crime" && e.to === "ext-spell"));
	assert.equal(subgraph.edges.length, 4);
}

// buildModernizationArchitectureSubgraph: a plan where every context stays
// centralized (0 coldbox-module, 0 extracts) is the expected, common outcome
// of a "modular monolith first" run — the map must still show it, not
// collapse to a single, empty-looking core node.
{
	const result = {
		target: {
			units: [ { id: "u1" }, { id: "u2" } ],
			contexts: [
				{ id: "ctx-a", name: "AJAX & Configuration Management", packaging: "centralized", targetUnitIds: [ "u1" ] },
				{ id: "ctx-b", name: "Crime & User Services", packaging: "centralized", targetUnitIds: [ "u2" ] }
			],
			extracts: []
		}
	};
	const subgraph = helpers.buildModernizationArchitectureSubgraph(result);
	assert.equal(subgraph.nodes.length, 3, "core + two centralized contexts, not just core");
	assert.ok(subgraph.nodes.some((n) => n.id === "ctx-a" && n.role === "centralized"));
	assert.ok(subgraph.nodes.some((n) => n.id === "ctx-b" && n.role === "centralized"));
}

// buildModernizationArchitectureSubgraph: degrades gracefully with no
// dependsOnContextIds data (older/fallback plans) — still renders nodes,
// just without extra edges, and a dangling dependency id is ignored rather
// than producing a broken edge.
{
	const result = {
		target: {
			contexts: [ { id: "ctx-crime", name: "Crime", packaging: "coldbox-module", targetUnitIds: [ "u2" ], dependsOnContextIds: [ "ctx-does-not-exist" ] } ],
			extracts: []
		}
	};
	const subgraph = helpers.buildModernizationArchitectureSubgraph(result);
	assert.equal(subgraph.nodes.length, 2);
	assert.equal(subgraph.edges.length, 1);
	assert.equal(subgraph.edges[0].from, "core");
	assert.equal(subgraph.edges[0].to, "ctx-crime");
}

// buildModernizationArchitectureSubgraph: no contexts/extracts at all —> just the core node, no edges.
{
	const subgraph = helpers.buildModernizationArchitectureSubgraph({ target: { contexts: [], extracts: [] } });
	assert.equal(subgraph.nodes.length, 1);
	assert.equal(subgraph.edges.length, 0);
}

// layoutModernizationArchitectureVertical: separate lanes for main-app /
// modules / microservices stacked top-to-bottom.
{
	const subgraph = helpers.buildModernizationArchitectureSubgraph({
		target: {
			units: [{ id: "u1" }, { id: "u2" }, { id: "u3" }],
			placements: [
				{ id: "p-main", name: "Bootstrap", placementType: "main-app", targetUnitIds: ["u1"] },
				{ id: "p-mod", name: "BLC module", placementType: "coldbox-module", targetUnitIds: ["u2"] },
				{ id: "p-svc", name: "Orders side app", placementType: "external-service", targetUnitIds: ["u3"] }
			]
		}
	});
	const layout = helpers.layoutModernizationArchitectureVertical(subgraph);
	assert.ok(layout.lanes.length >= 3, "core + at least one packaging lane");
	assert.ok(layout.lanes.some((lane) => lane.id === "main-app"));
	assert.ok(layout.lanes.some((lane) => lane.id === "modules"));
	assert.ok(layout.lanes.some((lane) => lane.id === "services"));
	const main = layout.nodes.find((n) => n.id === "p-main");
	const mod = layout.nodes.find((n) => n.id === "p-mod");
	const svc = layout.nodes.find((n) => n.id === "p-svc");
	assert.ok(main.y < mod.y, "main-app lane above modules");
	assert.ok(mod.y < svc.y, "modules lane above microservices");
	assert.equal(main.x, mod.x, "vertical layout shares one column");
}

// modernizationBriefSummary: aggregates status/effort/risk/packaging/next-action
// purely from result fields, for the "Modernization Brief" summary card.
{
	const result = {
		coverage: { status: "incomplete" },
		validation: { status: "warning" },
		roadmapPhases: [
			{ id: "phase-1", name: "Crime Management", effortSize: "M", riskLevel: "critical", effortDrivers: ["scope.application-state", "sql.query"], currentSlice: true },
			{ id: "phase-2", name: "Spellcheck", effortSize: "S", riskLevel: "none", currentSlice: false },
			{ id: "phase-3", name: "Reporting", effortSize: "L", riskLevel: "high", currentSlice: false }
		],
		target: {
			units: [ { id: "u1" } ],
			contexts: [
				{ id: "ctx-1", packaging: "coldbox-module" },
				{ id: "ctx-2", packaging: "centralized" }
			],
			extracts: [ { id: "ext-1" } ]
		}
	};
	const summary = helpers.modernizationBriefSummary(result);
	assert.equal(summary.hasPlan, true);
	assert.equal(summary.phaseCount, 3);
	assert.deepEqual(summary.effortCounts, { S: 1, M: 1, L: 1, XL: 0 });
	assert.equal(summary.riskyPhaseCount, 2, "critical + high count as risky, none does not");
	assert.deepEqual(summary.packagingSplit, { centralized: 1, modules: 1, extracts: 1 });
	assert.equal(summary.currentSlice.name, "Crime Management");
	assert.equal(summary.currentSlice.effortSize, "M");
	assert.equal(summary.currentSlice.riskLevel, "critical");
	assert.deepEqual(summary.currentSlice.effortDrivers, ["scope.application-state", "sql.query"]);
	assert.equal(summary.coverageStatus, "incomplete");
	assert.equal(summary.validationStatus, "warning");
}

// modernizationBriefSummary: no phases/contexts/units at all -> hasPlan is false.
{
	const summary = helpers.modernizationBriefSummary({});
	assert.equal(summary.hasPlan, false);
	assert.equal(summary.phaseCount, 0);
	assert.equal(summary.currentSlice, null);
}

// modernizationBriefSummary: degrades gracefully for a pre-Part-C plan with
// no effortSize/riskLevel fields at all — still a valid, non-throwing summary.
{
	const result = { target: { units: [ { id: "u1" } ], contexts: [], extracts: [] }, roadmapPhases: [ { id: "phase-1", name: "Only phase" } ] };
	const summary = helpers.modernizationBriefSummary(result);
	assert.equal(summary.hasPlan, true);
	assert.deepEqual(summary.effortCounts, { S: 0, M: 0, L: 0, XL: 0 });
	assert.equal(summary.riskyPhaseCount, 0);
	assert.equal(summary.currentSlice, null, "no phase has currentSlice=true");
}

// modernizationSignalLabel / Guide
assert.equal(helpers.modernizationSignalLabel("scope.application-state"), "Shared application state");
assert.match(helpers.modernizationSignalGuide("scope.application-state").impact, /WireBox|ColdBox config/);
// Unknown slug falls back to the slug itself, never undefined.
assert.equal(helpers.modernizationSignalLabel("totally.unknown"), "totally.unknown");
assert.equal(helpers.modernizationSignalGuide("totally.unknown").impact, "");

// modernizationSliceDifficulty: phase -> target units -> legacyUnitIds -> signals
{
	const result = {
		target: {
			units: [
				{ id: "tu-a", legacyUnitIds: ["legacy-a"], sourcePath: "handlers/A.cfc" },
				{ id: "tu-b", legacyUnitIds: ["legacy-b"], sourcePath: "handlers/B.cfc" }
			]
		},
		signals: [
			{ signalId: "scope.application-state", unitIds: ["legacy-a"], evidenceRefs: [{ filePath: "handlers/A.cfc", startLine: 4 }] },
			{ signalId: "scope.application-state", unitIds: ["legacy-a"], evidenceRefs: [{ filePath: "handlers/A.cfc", startLine: 9 }] },
			{ signalId: "include.chain", unitIds: ["legacy-a"], evidenceRefs: [{ filePath: "handlers/A.cfc", startLine: 2 }] },
			// belongs to another phase's unit — must not leak in
			{ signalId: "java.interop", unitIds: ["legacy-b"], evidenceRefs: [{ filePath: "handlers/B.cfc", startLine: 3 }] }
		]
	};
	const out = helpers.modernizationSliceDifficulty(result, { unitIds: ["tu-a"] });
	assert.equal(out.total, 3, "only tu-a's signals count");
	assert.equal(out.groups.length, 2);
	// Ranked by hit count descending.
	assert.equal(out.groups[0].signalId, "scope.application-state");
	assert.equal(out.groups[0].count, 2);
	assert.equal(out.groups[0].label, "Shared application state");
	assert.deepEqual(out.groups[0].files, ["handlers/A.cfc:4", "handlers/A.cfc:9"]);
	assert.equal(out.groups[1].signalId, "include.chain");
	assert.ok(!out.groups.some((g) => g.signalId === "java.interop"), "other phase's signal excluded");
}

// modernizationSliceDifficulty: sourcePath fallback for plans whose signals
// predate the unit range join (no unitIds stamped).
{
	const result = {
		target: { units: [{ id: "tu-a", sourcePath: "handlers/A.cfc" }] },
		signals: [{ signalId: "sql.query", evidenceRefs: [{ filePath: "handlers/A.cfc", startLine: 7 }] }]
	};
	const out = helpers.modernizationSliceDifficulty(result, { unitIds: ["tu-a"] });
	assert.equal(out.total, 1);
	assert.equal(out.groups[0].signalId, "sql.query");
}

// modernizationSliceDifficulty: empty/absent inputs degrade safely.
assert.deepEqual(helpers.modernizationSliceDifficulty({}, {}), { total: 0, groups: [] });
assert.deepEqual(helpers.modernizationSliceDifficulty({ signals: [] }, { unitIds: ["tu-a"] }), { total: 0, groups: [] });

console.log("modernization-render-helpers.spec.mjs OK");

// --- placement derivation: one owner, derived at render time ---------------
// `packaging` is the provider's older vocabulary for `placementType`, so every
// read has to fall back to it. That fallback used to be inlined in six places
// across the helpers and app.js.
assert.equal(helpers.placementTypeOf({ placementType: "External-Service" }), "external-service");
assert.equal(helpers.placementTypeOf({ packaging: "coldbox-module" }), "coldbox-module");
assert.equal(helpers.placementTypeOf({ placementType: "main-app", packaging: "external-service" }), "main-app");
assert.equal(helpers.placementTypeOf({}), "main-app");

assert.equal(helpers.isExtractPlacement({ placementType: "external-service" }), true);
assert.equal(helpers.isExtractPlacement({ packaging: "side-app" }), true);
assert.equal(helpers.isExtractPlacement({ placementType: "coldbox-module" }), false);
assert.equal(helpers.isModulePlacement({ packaging: "module" }), true);
assert.equal(helpers.isModulePlacement({ placementType: "external-service" }), false);

// stayInMonolith is derived, never read from the artifact. A stored value that
// disagrees with placementType must not win -- that stored copy disappears in
// Step 3b and the UI cannot depend on it.
assert.equal(helpers.staysInMonolith({ placementType: "external-service" }), false);
assert.equal(helpers.staysInMonolith({ placementType: "coldbox-module" }), true);
assert.equal(helpers.staysInMonolith({ placementType: "main-app" }), true);
assert.equal(helpers.staysInMonolith({ placementType: "external-service", stayInMonolith: true }), false);
assert.equal(helpers.staysInMonolith({ placementType: "main-app", stayInMonolith: false }), true);

// The map must read target.placements in preference to the legacy projection.
const derivedMap = helpers.buildModernizationArchitectureSubgraph({
	target: {
		placements: [
			{ id: "p1", name: "Notifications", placementType: "external-service", targetUnitIds: ["u1"] },
			{ id: "p2", name: "Orders", placementType: "main-app", targetUnitIds: ["u2"] }
		],
		contexts: [{ id: "legacy", name: "Should be ignored", targetUnitIds: ["u9"] }]
	}
});
assert.equal(derivedMap.lanes.extracts, 1, "placements must win over the legacy contexts projection");
assert.ok(derivedMap.nodes.some((node) => node.path === "Notifications" && node.role === "extract"), "the extracted placement must appear on the map in the extract lane");
assert.ok(!derivedMap.nodes.some((node) => node.path === "Should be ignored"), "the legacy projection must not be read when placements exist");

// --- placement source precedence -------------------------------------------
// Derived clusters outrank the provider's placements. A real run was observed
// where derivation said "two coldbox modules" and the provider said "two
// centralized", with both in the same artifact; the UI was showing the weaker
// answer. There is now one place that decides which wins.
const bothSources = {
	derived: { clusters: [
		{ id: "c1", domainKey: "notifications", name: "Notifications", placementType: "external-service", targetUnitIds: ["u1"], filePaths: ["a.cfc"] },
		{ id: "c2", domainKey: "orders", name: "Orders", placementType: "coldbox-module", targetUnitIds: ["u2"], filePaths: ["b.cfc"] }
	] },
	target: { placements: [ { id: "p1", name: "Everything", placementType: "main-app", targetUnitIds: ["u1", "u2"] } ] }
};
const resolved = helpers.modernizationPlacements(bothSources);
assert.equal(resolved.length, 2, "derived clusters must win over provider placements");
assert.equal(resolved[0]._placementSource, "derived");
assert.equal(helpers.buildModernizationArchitectureSubgraph(bothSources).lanes.extracts, 1);

// Provider placements are used when nothing was derived.
const providerOnly = { target: { placements: [ { id: "p1", name: "Orders", placementType: "coldbox-module", targetUnitIds: ["u1"] } ] } };
assert.equal(helpers.modernizationPlacements(providerOnly)[0]._placementSource, "provider");
assert.equal(helpers.buildModernizationArchitectureSubgraph(providerOnly).lanes.modules, 1);

// And the v1 vocabulary still renders: an untyped item in `extracts` is an
// extract because of the array it is in, not because of a field it carries.
const legacyOnly = { target: { contexts: [ { id: "c", name: "Core", targetUnitIds: ["u1"] } ], extracts: [ { id: "e", name: "Search", targetUnitIds: ["u2"] } ] } };
const legacyResolved = helpers.modernizationPlacements(legacyOnly);
assert.equal(legacyResolved.length, 2);
assert.equal(legacyResolved.every((item) => item._placementSource === "legacy"), true);
assert.equal(helpers.buildModernizationArchitectureSubgraph(legacyOnly).lanes.extracts, 1, "an untyped legacy extract must not become centralized");
