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

console.log("modernization-render-helpers.spec.mjs OK");
