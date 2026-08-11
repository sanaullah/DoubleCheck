import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const layout = require("../../public/assets/codegraph-layout.js");

test("CodeGraph UI wires path selection, bounded path API, highlight reuse, and exports", () => {
	const ui = readFileSync(new URL("../../public/assets/app.js", import.meta.url), "utf8");
	const view = readFileSync(new URL("../../app/views/main/codegraph.bxm", import.meta.url), "utf8");
	assert.match(ui, /codegraph\/paths\?/);
	assert.match(ui, /codeGraphPathHighlight/);
	assert.match(ui, /flowStepSet/);
	assert.match(ui, /data-codegraph-path-endpoint/);
	assert.match(ui, /codeGraphSymbolsForFile/);
	assert.match(ui, /flow\.stepSymbols/);
	assert.match(ui, /Flow symbols/);
	assert.match(view, /id="codegraph-pathfinder"/);
	assert.match(view, /data-codegraph-export="markdown"/);
	assert.match(view, /data-codegraph-export="mermaid"/);
	assert.match(view, /data-codegraph-export="svg"/);
});

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

test("layoutSwimlane orders nodes by role and keeps flow steps stable", () => {
	const positioned = layout.layoutSwimlane(
		{
			nodes: [
				{ id: "table:orders", label: "orders", role: "persistence" },
				{ id: "app/models/OrderService.cfc", label: "service", role: "domain" },
				{ id: "route:/orders", label: "orders route", role: "entry" },
				{ id: "app/public/app.js", label: "client", role: "client" }
			],
			edges: [{ from: "route:/orders", to: "app/models/OrderService.cfc" }]
		},
		{ flowStepSet: ["route:/orders", "app/models/OrderService.cfc", "table:orders"] }
	);
	assert.equal(positioned.mode, "swimlane");
	assert.equal(positioned.lanes[0].key, "client");
	assert.ok(positioned.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)));
	const byId = Object.fromEntries(positioned.nodes.map((node) => [node.id, node]));
	assert.equal(byId["route:/orders"].lane, "entry");
	assert.ok(byId["route:/orders"].x < byId["app/models/OrderService.cfc"].x);
	assert.ok(byId["app/models/OrderService.cfc"].x < byId["table:orders"].x);
	const svg = layout.buildSvg(positioned);
	assert.ok(svg.includes("cg-swimlane"));
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

test("overview cards include complexity, summary, and explore CTA", () => {
	const view = layout.buildClusterView(sample, {
		overview: true,
		summaries: [{ clusterId: "c1", text: "Orders domain handles checkout flow." }]
	});
	assert.equal(view.overview, true);
	assert.ok(view.nodes.every((n) => n.kind === "cluster"));
	const orders = view.nodes.find((n) => n.id === "c1");
	assert.ok(orders);
	assert.equal(orders.summaryOrigin, "ai");
	assert.match(orders.summary, /checkout/);
	assert.ok(["simple", "moderate", "complex"].includes(orders.complexity));

	const invoices = view.nodes.find((n) => n.id === "c2");
	assert.equal(invoices.summaryOrigin, "deterministic");
	assert.match(invoices.summary, /in the .+ area/);

	const positioned = layout.layoutClusters(view);
	assert.equal(positioned.overview, true);
	assert.ok(positioned.nodes[0].w >= layout.DEFAULTS.overviewNodeWidth);
	assert.ok(positioned.nodes[0].h >= layout.DEFAULTS.overviewNodeHeight);

	const svg = layout.buildSvg(positioned);
	assert.ok(svg.includes("cg-card"));
	assert.ok(svg.includes("Inspect"));
	assert.ok(svg.includes('data-complexity="'));
});

test("overview defaults to top-N modules not full catalog", () => {
	const many = {
		clusters: Array.from({ length: 20 }, (_, i) => ({
			id: "c" + i,
			label: "Mod" + i,
			fileCount: 20 - i,
			crossingEdges: i % 3,
			filePaths: ["f" + i + ".bx"]
		})),
		clusterEdges: []
	};
	const top = layout.buildClusterView(many, { overview: true, topN: 10 });
	assert.equal(top.nodes.length, 10);
	assert.equal(top.overviewCapped, true);
	assert.equal(top.totalClusters, 20);
	assert.equal(top.nodes[0].id, "c0");

	const all = layout.buildClusterView(many, { overview: true, showAll: true });
	assert.equal(all.nodes.length, 20);
	assert.equal(all.overviewCapped, false);

	const copy = layout.projectOverviewCopy(many, { projectName: "DemoApp", shown: 10 });
	assert.equal(copy.title, "DemoApp");
	assert.match(copy.blurb, /DemoApp/);
	assert.equal(copy.modules, 20);
});

test("complexityOf and wrapText are deterministic helpers", () => {
	assert.equal(layout.complexityOf({ fileCount: 1, crossingEdges: 0 }), "simple");
	assert.equal(layout.complexityOf({ fileCount: 20, crossingEdges: 5 }), "moderate");
	assert.equal(layout.complexityOf({ fileCount: 30, crossingEdges: 10, inCycle: true }), "complex");
	const lines = layout.wrapText("one two three four five six seven eight", 12, 2);
	assert.ok(lines.length <= 2);
	assert.ok(lines.join(" ").includes("one"));
});

test("uniqueEdges accepts sourceFile/targetFile and normalizes case", () => {
	const edges = layout.uniqueEdges([
		{
			sourceFile: "app/Handlers/Orders.bx",
			targetFile: "app/models/OrderService.cfc",
			kind: "injects",
			evidence: "property inject",
			line: 12
		},
		{
			from: "APP/handlers/orders.bx",
			to: "APP/models/orderservice.cfc",
			kind: "injects",
			evidence: "dup"
		}
	]);
	assert.equal(edges.length, 1);
	assert.equal(edges[0].from, "app/handlers/orders.bx");
	assert.equal(edges[0].to, "app/models/orderservice.cfc");
	assert.equal(edges[0].kind, "injects");
	assert.equal(edges[0].evidence, "property inject");
	assert.equal(edges[0].line, 12);
});

test("buildFocusView wires subgraph edges without from/to keys", () => {
	const focus = layout.buildFocusView(
		{
			focus: "app/handlers/Orders.bx",
			nodes: [
				{ id: "app/Handlers/Orders.bx", path: "app/Handlers/Orders.bx" },
				{ id: "app/models/OrderService.cfc", path: "app/models/OrderService.cfc" }
			],
			edges: [
				{
					sourceFile: "app/Handlers/Orders.bx",
					targetFile: "app/models/OrderService.cfc",
					kind: "injects",
					evidence: "inject=orderService"
				}
			]
		},
		{ detail: true }
	);
	assert.equal(focus.edges.length, 1);
	assert.equal(focus.edges[0].from, "app/handlers/orders.bx");
	assert.ok(focus.nodes.every((n) => n.id === n.id.toLowerCase()));
	const svg = layout.buildSvg(layout.layoutClusters(focus, { detail: true }));
	assert.ok(svg.includes("cg-edge"));
	assert.ok(svg.includes("injects"));
	assert.ok(svg.includes('data-evidence="inject=orderService"'));
});

test("buildSvg highlights only matching edge kind when parallel edges share from/to", () => {
	const parallel = {
		nodes: [
			{ id: "app/handlers/Orders.bx", path: "app/handlers/Orders.bx", layer: 0 },
			{ id: "app/models/OrderService.cfc", path: "app/models/OrderService.cfc", layer: 1 }
		],
		edges: [
			{ from: "app/handlers/Orders.bx", to: "app/models/OrderService.cfc", kind: "injects" },
			{ from: "app/handlers/Orders.bx", to: "app/models/OrderService.cfc", kind: "calls" }
		]
	};
	const positioned = layout.layoutLayered(parallel, { detail: true });
	const svg = layout.buildSvg(positioned, {
		flowStepSet: ["app/handlers/Orders.bx", "app/models/OrderService.cfc"],
		flowEdgeKinds: ["injects"]
	});
	const injects = svg.match(
		/<path class="cg-edge[^"]*is-flow-highlight[^"]*"[^>]*data-kind="injects"/
	);
	const calls = svg.match(
		/<path class="cg-edge[^"]*is-flow-highlight[^"]*"[^>]*data-kind="calls"/
	);
	assert.ok(injects, "injects edge should be flow-highlighted");
	assert.equal(calls, null, "calls edge must not be flow-highlighted");
});

test("buildSvg marks flow highlight nodes and consecutive edges", () => {
	const files = layout.buildFileView(sample, { detail: true });
	const positioned = layout.layoutClusters(files, { detail: true });
	const steps = [
		"app/handlers/Orders.bx",
		"app/models/OrderService.cfc",
		"app/models/Invoice.cfc"
	];
	const svg = layout.buildSvg(positioned, { flowStepSet: steps });
	assert.ok(svg.includes("is-flow-highlight"));
	assert.match(
		svg,
		/<g class="[^"]*is-flow-highlight[^"]*" data-node-id="app\/handlers\/orders\.bx"/
	);
	assert.match(
		svg,
		/<g class="[^"]*is-flow-highlight[^"]*" data-node-id="app\/models\/orderservice\.cfc"/
	);
	assert.match(svg, /<path class="cg-edge[^"]*is-flow-highlight"/);
	assert.doesNotMatch(
		svg,
		/<g class="[^"]*is-flow-highlight[^"]*" data-node-id="app\/models\/orphan\.cfc"/
	);
});

test("file and focus views render fan-in meta and edge kinds", () => {
	const files = layout.buildFileView(sample, { detail: true });
	assert.equal(files.detail, true);
	const orders = files.nodes.find((n) => /orders\.bx$/i.test(n.id) || /orders\.bx$/i.test(n.path || ""));
	assert.ok(orders);
	assert.equal(orders.id, orders.id.toLowerCase());
	const positioned = layout.layoutClusters(files, { detail: true });
	assert.ok(positioned.nodes[0].w >= layout.DEFAULTS.detailNodeWidth);
	const svg = layout.buildSvg(positioned);
	assert.ok(svg.includes("cg-file"));
	assert.ok(svg.includes("in "));
	assert.ok(svg.includes("injects") || svg.includes("constructs"));

	const focus = layout.buildFocusView(
		{
			focus: "app/handlers/Orders.bx",
			nodes: sample.nodes.slice(0, 3),
			edges: sample.edges.slice(0, 2)
		},
		{ detail: true }
	);
	assert.equal(focus.mode, "focus");
	const focusSvg = layout.buildSvg(layout.layoutRadial(focus, { detail: true }));
	assert.ok(focusSvg.includes("is-focus") || focusSvg.includes('data-kind="file"'));
});

test("buildFileView stubs outside endpoints for crossing edges", () => {
	const view = layout.buildFileView(
		{
			nodes: [{ id: "app/a.cfc", path: "app/a.cfc", clusterId: "c1" }],
			edges: [
				{
					from: "app/handlers/x.cfc",
					to: "app/a.cfc",
					kind: "injects",
					sourceFile: "app/handlers/X.cfc",
					targetFile: "app/a.cfc",
					crossing: true
				},
				{
					from: "app/a.cfc",
					to: "app/b.cfc",
					kind: "injects",
					sourceFile: "app/a.cfc",
					targetFile: "app/b.cfc",
					crossing: true
				}
			]
		},
		{ detail: true }
	);
	const outside = view.nodes.filter((n) => n.external);
	assert.equal(outside.length, 2);
	assert.ok(outside.some((n) => /x\.cfc$/i.test(n.path || n.id)));
	assert.ok(outside.some((n) => /b\.cfc$/i.test(n.path || n.id)));
	assert.ok(outside.every((n) => n.external && (n.role === "outside" || String(n.label || "").length)));
	assert.equal(view.edges.length, 2);
	assert.ok(view.edges.every((e) => e.crossing));
	const svg = layout.buildSvg(layout.layoutClusters(view, { detail: true }));
	assert.ok(svg.includes("is-external"));
	assert.ok(svg.includes("is-crossing"));
	assert.ok(svg.includes('data-role="outside"'));
	assert.ok(svg.includes("marker-end"));
	assert.ok(svg.includes("cg-file-complexity") || svg.includes("data-complexity"));
});

test("fileComplexityOf and fileRoleChip are deterministic", () => {
	assert.equal(layout.fileComplexityOf({ fanIn: 0, fanOut: 0, hotspotScore: 0 }), "simple");
	assert.equal(layout.fileComplexityOf({ fanIn: 4, fanOut: 3, hotspotScore: 30 }), "moderate");
	assert.equal(layout.fileComplexityOf({ fanIn: 8, fanOut: 6, hotspotScore: 60, inCycle: true }), "complex");
	assert.equal(layout.fileRoleChip({ external: true }), "outside");
	assert.equal(layout.fileRoleChip({ role: "entry" }), "entry");
	assert.equal(layout.fileRoleChip({ role: "unknown" }), "");
});

test("focus hub enlarges the focus node and tooltips include path and evidence", () => {
	const focus = layout.buildFocusView(
		{
			focus: "app/handlers/Orders.bx",
			nodes: [
				{ id: "app/handlers/Orders.bx", path: "app/handlers/Orders.bx", role: "focus" },
				{ id: "app/models/OrderService.cfc", path: "app/models/OrderService.cfc", role: "neighbor" }
			],
			edges: [
				{
					from: "app/handlers/Orders.bx",
					to: "app/models/OrderService.cfc",
					kind: "injects",
					evidence: "inject=orderService",
					line: 12
				}
			]
		},
		{ detail: true }
	);
	const positioned = layout.layoutRadial(focus, { detail: true });
	const hub = positioned.nodes.find((n) => n.role === "focus");
	const neighbor = positioned.nodes.find((n) => n.role === "neighbor");
	assert.ok(hub);
	assert.ok(neighbor);
	assert.ok(hub.w > neighbor.w);
	assert.ok(hub.h > neighbor.h);
	const svg = layout.buildSvg(positioned);
	assert.ok(svg.includes("<title>"));
	assert.ok(svg.includes("app/handlers/Orders.bx"));
	assert.ok(svg.includes("inject=orderService"));
	assert.match(layout.fileTooltip({ path: "app/A.bx", role: "entry" }), /app\/A\.bx/);
	assert.match(
		layout.edgeTooltip({ kind: "injects", from: "a", to: "b", evidence: "x", crossing: true }),
		/crosses module boundary/
	);
});

test("cycle highlight marks undirected consecutive pairs", () => {
	const view = {
		mode: "focus",
		focus: "app/a.bx",
		nodes: [
			{ id: "app/a.bx", path: "app/a.bx", role: "focus", layer: 0 },
			{ id: "app/b.bx", path: "app/b.bx", role: "neighbor", layer: 1 },
			{ id: "app/c.bx", path: "app/c.bx", role: "neighbor", layer: 1 }
		],
		edges: [
			{ from: "app/a.bx", to: "app/b.bx", kind: "calls" },
			{ from: "app/b.bx", to: "app/c.bx", kind: "calls" },
			{ from: "app/c.bx", to: "app/a.bx", kind: "calls" }
		]
	};
	const positioned = layout.layoutClusters(view, { detail: true });
	const svg = layout.buildSvg(positioned, {
		flowStepSet: ["app/a.bx", "app/b.bx", "app/c.bx", "app/a.bx"],
		cycleHighlight: true
	});
	assert.ok(svg.includes("is-cycle-highlight"));
	assert.ok(svg.includes("heat-") || svg.includes("data-complexity"));
});

test("hotspot heat classes scale with score", () => {
	const files = layout.buildFileView(
		{
			nodes: [
				{ id: "app/hot.bx", path: "app/hot.bx", hotspotScore: 55, fanIn: 2, fanOut: 2 },
				{ id: "app/warm.bx", path: "app/warm.bx", hotspotScore: 32, fanIn: 1, fanOut: 1 }
			],
			edges: []
		},
		{ detail: true }
	);
	const positioned = layout.layoutClusters(files, { detail: true });
	const svg = layout.buildSvg(positioned);
	assert.ok(svg.includes("heat-high"));
	assert.ok(svg.includes("heat-mid"));
});
