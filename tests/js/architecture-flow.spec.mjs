import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const flow = require("../../public/assets/architecture-flow.js");

const sample = {
	dependencies: [
		{ sourceFile: "app/handlers/Main.bx", targetFile: "app/models/services/ReviewRunService.bx", kind: "component" },
		{ sourceFile: "app/models/services/ReviewRunService.bx", targetFile: "app/models/repositories/ReviewRunRepository.bx", kind: "component" },
		{ sourceFile: "tests/specs/MainSpec.bx", targetFile: "app/handlers/Main.bx", kind: "tests" },
		{ sourceFile: "app/handlers/Other.bx", targetFile: "", kind: "component" }
	],
	impacts: [
		{ changedFile: "app/models/services/ReviewRunService.bx", impactedFile: "app/handlers/Main.bx", depth: 1, viaFile: "", reason: "depends" },
		{ changedFile: "app/models/services/ReviewRunService.bx", impactedFile: "tests/specs/MainSpec.bx", depth: 2, viaFile: "app/handlers/Main.bx", reason: "tests" }
	]
};

{
	const g = flow.buildWiringSubgraph(sample, { maxNodes: 20, maxEdges: 25 });
	assert.equal(g.mode, "wiring");
	assert.ok(g.nodes.some((n) => n.path.endsWith("ReviewRunService.bx")));
	assert.ok(g.edges.every((e) => e.from && e.to));
	assert.ok(!g.edges.some((e) => e.to === ""));
}

{
	const g = flow.buildImpactSubgraph(sample, { maxNodes: 20, maxEdges: 25 });
	assert.equal(g.mode, "impact");
	const seed = g.nodes.find((n) => n.role === "seed");
	assert.ok(seed && seed.path.includes("ReviewRunService.bx"));
	assert.ok(g.edges.length >= 1);
}

{
	const g = flow.pickArchitectureSubgraph(sample, "working-tree", { maxNodes: 20, maxEdges: 25 });
	assert.equal(g.mode, "impact");
	const full = flow.pickArchitectureSubgraph(sample, "full", { maxNodes: 20, maxEdges: 25 });
	assert.equal(full.mode, "wiring");
	const emptyImpact = flow.pickArchitectureSubgraph(
		{ dependencies: sample.dependencies, impacts: [] },
		"working-tree",
		{ maxNodes: 20, maxEdges: 25 }
	);
	assert.equal(emptyImpact.mode, "wiring");
}

{
	const g = flow.buildWiringSubgraph(sample, { maxNodes: 20, maxEdges: 25 });
	const layout = flow.layoutFlowPositions(g, { nodeWidth: 160, nodeHeight: 44, gapX: 48, gapY: 28 });
	assert.ok(layout.width > 0 && layout.height > 0);
	assert.equal(layout.nodes.length, g.nodes.length);
	layout.nodes.forEach((n) => {
		assert.equal(typeof n.x, "number");
		assert.equal(typeof n.y, "number");
	});
}

console.log("architecture-flow.spec.mjs: ok");
