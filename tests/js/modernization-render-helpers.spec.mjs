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

// buildModernizationArchitectureSubgraph: turns target.contexts/target.extracts
// into the {nodes,edges} shape ArchitectureFlow.layoutFlowPositions() expects.
{
	const result = {
		target: {
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
	// Core (monolith) + one coldbox-module + one extract; the centralized
	// context does not get its own node, it is folded into core's unit count.
	assert.equal(subgraph.nodes.length, 3);
	const core = subgraph.nodes.find((n) => n.id === "core");
	assert.ok(core, "core node exists");
	assert.equal(core.unitCount, 1);
	const crime = subgraph.nodes.find((n) => n.id === "ctx-crime");
	assert.equal(crime.role, "module");
	assert.equal(crime.unitCount, 2);
	const spell = subgraph.nodes.find((n) => n.id === "ext-spell");
	assert.equal(spell.role, "extract");
	// Every module/extract gets an edge back to core, plus the explicit
	// dependsOnContextIds edge from Crime to Spellcheck.
	assert.ok(subgraph.edges.some((e) => e.from === "core" && e.to === "ctx-crime"));
	assert.ok(subgraph.edges.some((e) => e.from === "core" && e.to === "ext-spell"));
	assert.ok(subgraph.edges.some((e) => e.from === "ctx-crime" && e.to === "ext-spell"));
	assert.equal(subgraph.edges.length, 3);
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

// modernizationBriefSummary: aggregates status/effort/risk/packaging/next-action
// purely from result fields, for the "Modernization Brief" summary card.
{
	const result = {
		coverage: { status: "incomplete" },
		validation: { status: "warning" },
		roadmapPhases: [
			{ id: "phase-1", name: "Crime Management", effortSize: "M", riskLevel: "critical", currentSlice: true },
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

console.log("modernization-render-helpers.spec.mjs OK");
