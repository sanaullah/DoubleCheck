import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const layout = require("../../public/assets/codegraph-layout.js");

const sample = {
	nodes: [
		{ id: "app/handlers/Orders.bx", path: "app/handlers/Orders.bx", layer: "http-handlers", clusterId: "c1" },
		{ id: "app/models/OrderService.cfc", path: "app/models/OrderService.cfc", layer: "application-models", clusterId: "c1" },
		{ id: "app/models/Invoice.cfc", path: "app/models/Invoice.cfc", layer: "application-models", clusterId: "c2" },
		{ id: "app/handlers/Invoices.bx", path: "app/handlers/Invoices.bx", layer: "http-handlers", clusterId: "c2" },
		{ id: "tests/OrdersSpec.bx", path: "tests/OrdersSpec.bx", layer: "tests", clusterId: "c1" },
		{ id: "app/models/Orphan.cfc", path: "app/models/Orphan.cfc", layer: "application-models", clusterId: "" }
	],
	clusters: [
		{ id: "c1", label: "Orders", fileCount: 3, filePaths: ["app/handlers/Orders.bx", "app/models/OrderService.cfc", "tests/OrdersSpec.bx"] },
		{ id: "c2", label: "Invoices", fileCount: 2, filePaths: ["app/models/Invoice.cfc", "app/handlers/Invoices.bx"] }
	],
	clusterEdges: [{ from: "c1", to: "c2", weight: 2, edgeCount: 2 }],
	edges: [
		{ from: "app/handlers/Orders.bx", to: "app/models/OrderService.cfc", kind: "injects" },
		{ from: "app/models/OrderService.cfc", to: "app/models/Invoice.cfc", kind: "constructs" },
		{ from: "app/handlers/Invoices.bx", to: "app/models/Invoice.cfc", kind: "injects" },
		{ from: "tests/OrdersSpec.bx", to: "app/handlers/Orders.bx", kind: "tests" }
	]
};

test("budget never exceeded and truncated set when clipped", () => {
	const view = layout.buildFileView(sample, { maxNodes: 2, maxEdges: 1 });
	assert.ok(view.nodes.length <= 2);
	assert.ok(view.edges.length <= 1);
	assert.equal(view.truncated, true);
	assert.ok(view.totalNodes > view.nodes.length);

	const clusters = layout.buildClusterView(sample, { maxNodes: 1, maxEdges: 0 });
	assert.equal(clusters.nodes.length, 1);
	assert.equal(clusters.edges.length, 0);
	assert.equal(clusters.truncated, true);

	const sub = layout.selectSubgraph(sample, { focus: "app/handlers/Orders.bx", depth: 3, budget: 2 });
	assert.ok(sub.nodes.length <= 2);
	assert.equal(sub.truncated, true);
});

test("empty input returns zero nodes without throwing", () => {
	assert.doesNotThrow(() => {
		const a = layout.buildClusterView(null);
		const b = layout.buildFileView({});
		const c = layout.buildFocusView(null);
		const d = layout.selectSubgraph({}, { focus: "missing" });
		const e = layout.layoutLayered({ nodes: [], edges: [] });
		const f = layout.layoutClusters(null);
		const g = layout.layoutRadial({ nodes: [] });
		assert.equal(a.nodes.length, 0);
		assert.equal(b.nodes.length, 0);
		assert.equal(c.nodes.length, 0);
		assert.equal(d.nodes.length, 0);
		assert.equal(e.nodes.length, 0);
		assert.equal(f.nodes.length, 0);
		assert.equal(g.nodes.length, 0);
	});
});

test("layoutLayered finite coords ordered by layer", () => {
	const view = {
		nodes: [
			{ id: "a", label: "a", layer: 0 },
			{ id: "b", label: "b", layer: 1 },
			{ id: "c", label: "c", layer: 2 },
			{ id: "d", label: "d", layer: 1 }
		],
		edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }]
	};
	const positioned = layout.layoutLayered(view);
	assert.equal(positioned.nodes.length, 4);
	positioned.nodes.forEach((n) => {
		assert.equal(typeof n.x, "number");
		assert.equal(typeof n.y, "number");
		assert.ok(Number.isFinite(n.x));
		assert.ok(Number.isFinite(n.y));
	});
	const byId = Object.fromEntries(positioned.nodes.map((n) => [n.id, n]));
	assert.ok(byId.a.x < byId.b.x);
	assert.ok(byId.b.x < byId.c.x);
	assert.equal(byId.b.x, byId.d.x);
});

test("zoomAt keeps cursor point fixed and respects min/max", () => {
	const vp = layout.createViewport({ x: 0, y: 0, width: 400, height: 300, scale: 1 });
	const point = { x: 100, y: 50 };
	const worldBefore = { x: vp.x + point.x / vp.scale, y: vp.y + point.y / vp.scale };

	const zoomed = layout.zoomAt(vp, point, 2, { min: 0.5, max: 4 });
	const worldAfter = { x: zoomed.x + point.x / zoomed.scale, y: zoomed.y + point.y / zoomed.scale };
	assert.equal(zoomed.scale, 2);
	assert.ok(Math.abs(worldAfter.x - worldBefore.x) < 1e-9);
	assert.ok(Math.abs(worldAfter.y - worldBefore.y) < 1e-9);

	const cappedHigh = layout.zoomAt(vp, point, 100, { min: 0.5, max: 4 });
	assert.equal(cappedHigh.scale, 4);
	const cappedLow = layout.zoomAt({ ...vp, scale: 1 }, point, 0.01, { min: 0.5, max: 4 });
	assert.equal(cappedLow.scale, 0.5);
});

test("fitToBounds and viewBoxOf contain the bounds", () => {
	const vp = layout.createViewport(800, 600);
	const bounds = { x: 10, y: 20, width: 200, height: 100 };
	const fitted = layout.fitToBounds(vp, bounds, 10);
	const vb = layout.viewBoxOf(fitted).split(" ").map(Number);
	assert.equal(vb.length, 4);
	const [vx, vy, vw, vh] = vb;
	assert.ok(vx <= bounds.x);
	assert.ok(vy <= bounds.y);
	assert.ok(vx + vw >= bounds.x + bounds.width);
	assert.ok(vy + vh >= bounds.y + bounds.height);
});

test("hitTest returns empty string outside nodes", () => {
	const positioned = layout.layoutLayered({
		nodes: [{ id: "n1", label: "n1", layer: 0 }],
		edges: []
	});
	assert.equal(layout.hitTest(positioned, { x: -50, y: -50 }), "");
	const n = positioned.nodes[0];
	assert.equal(layout.hitTest(positioned, { x: n.x + 1, y: n.y + 1 }), "n1");
});

test("module require works without window or document", () => {
	assert.equal(typeof globalThis.window, "undefined");
	assert.equal(typeof globalThis.document, "undefined");
	assert.equal(typeof layout.buildSvg, "function");
	const svg = layout.buildSvg(
		layout.layoutClusters(layout.buildClusterView(sample)),
		{ ariaLabel: "test" }
	);
	assert.ok(svg.includes("<svg"));
	assert.ok(svg.includes('data-node-id="c1"'));
	assert.ok(!svg.includes("document."));
});
