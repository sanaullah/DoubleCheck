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
	// This asserted /in the .+ area/, which only ever passed because the layer was
	// fabricated from the card's index — the spec was testing the bug. `c2` has no
	// layer, so the clause must not appear; a cluster that has one still gets it.
	assert.match(invoices.summary, /Invoices — 2 files\./);
	assert.equal(/in the .+ area/.test(invoices.summary), false, "no layer, no layer clause");

	const layered = layout.buildClusterView(
		{
			nodes: [],
			clusters: [{ id: "c9", label: "Ledger", fileCount: 2, layer: "application models", filePaths: [] }],
			clusterEdges: [],
			edges: []
		},
		{ overview: true }
	);
	assert.match(layered.nodes[0].summary, /in the application models area/);

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

test("layout output is byte-identical across runs and independent of locale", () => {
	// D26: seven bare localeCompare tie-breaks meant the same snapshot laid out
	// on two machines with different collation produced different coordinates,
	// and no spec existed to catch it.
	const snapshot = {
		nodes: [
			{ id: "app/Ähnlich.bx", path: "app/Ähnlich.bx", role: "domain", fanIn: 1, fanOut: 1 },
			{ id: "app/apple.bx", path: "app/apple.bx", role: "domain", fanIn: 2, fanOut: 0 },
			{ id: "app/Banana.bx", path: "app/Banana.bx", role: "entry", fanIn: 0, fanOut: 3 },
			{ id: "app/aardvark.bx", path: "app/aardvark.bx", role: "persistence", fanIn: 1, fanOut: 1 },
			{ id: "app/zebra.bx", path: "app/zebra.bx", role: "view", fanIn: 1, fanOut: 0 }
		],
		edges: [
			{ from: "app/apple.bx", to: "app/Banana.bx", kind: "calls" },
			{ from: "app/zebra.bx", to: "app/aardvark.bx", kind: "injects" }
		],
		clusters: []
	};

	const first = layout.layoutClusters(layout.buildFileView(snapshot, { maxNodes: 20, detail: true }), { detail: true });
	const second = layout.layoutClusters(layout.buildFileView(snapshot, { maxNodes: 20, detail: true }), { detail: true });

	assert.equal(JSON.stringify(first), JSON.stringify(second), "same input must produce byte-identical layout");

	// Every emitted coordinate must be a finite number, not a locale artefact.
	for (const node of first.nodes) {
		assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y), `node ${node.id} has non-finite coordinates`);
	}
});

test("every drawn node carries an accessible name and a keyboard target", () => {
	// E8/G-i: the canvas was pointer-only, and an SVG shape announces nothing on
	// its own. Colour carries nine roles, so a name is the only differentiator
	// for a screen reader.
	const snapshot = {
		nodes: [
			{ id: "app/OrderService.bx", path: "app/OrderService.bx", role: "domain", fanIn: 4, fanOut: 2 },
			{ id: "app/OrderRepo.bx", path: "app/OrderRepo.bx", role: "persistence", fanIn: 1, fanOut: 0 }
		],
		edges: [{ from: "app/OrderService.bx", to: "app/OrderRepo.bx", kind: "injects" }],
		clusters: []
	};
	const svg = layout.buildSvg(
		layout.layoutClusters(layout.buildFileView(snapshot, { maxNodes: 10, detail: true }), { detail: true }),
		{ ariaLabel: "Code knowledge graph" }
	);

	assert.match(svg, /role="list"/, "the node set must be enumerable");
	// Attribute order is deliberately not asserted here: `class` must stay first
	// for the older specs, so the a11y attributes sit at the end of the tag.
	const labels = svg.match(/aria-label="[^"]*called by[^"]*"/g) || [];
	assert.equal(labels.length, 2, "every node is a focusable list item with a name");
	// The label uses the node\'s display name, not its full path — that is what
	// a reader hears, and the path is already on data-path.
	assert.match(svg, /aria-label="OrderService\.bx, domain, called by 4, calls 2"/);
});

test("ariaLabelFor degrades without throwing on a sparse node", () => {
	assert.equal(layout.ariaLabelFor(null), "graph node");
	assert.match(layout.ariaLabelFor({ id: "x.bx" }), /x\.bx/);
});

test("degree-of-interest keeps the focus neighbourhood that a flat slice would drop", () => {
	// E2: the cap used to take the first N in array order, so a neighbour of the
	// focus could be dropped purely for sorting late while an unrelated node
	// survived. DOI is importance minus hops from the focus.
	const nodes = [];
	// Twenty unrelated, moderately important nodes sort before the focus.
	for (let i = 0; i < 20; i++) {
		nodes.push({ id: `app/aaa${i}.bx`, path: `app/aaa${i}.bx`, fanIn: 5, fanOut: 0 });
	}
	nodes.push({ id: "app/zzz-focus.bx", path: "app/zzz-focus.bx", fanIn: 1, fanOut: 1 });
	nodes.push({ id: "app/zzz-neighbour.bx", path: "app/zzz-neighbour.bx", fanIn: 0, fanOut: 0 });

	const edges = [{ from: "app/zzz-focus.bx", to: "app/zzz-neighbour.bx", kind: "calls" }];
	const view = layout.buildFileView({ nodes, edges, clusters: [] }, {
		maxNodes: 5,
		detail: true,
		focus: "app/zzz-focus.bx"
	});
	const kept = view.nodes.map((n) => String(n.id));

	assert.ok(kept.some((id) => id.includes("zzz-focus")), "the focus must survive its own cap");
	assert.ok(kept.some((id) => id.includes("zzz-neighbour")), "a direct neighbour outranks an unrelated node");
	assert.ok(view.truncated, "the cap still reports that it cut");
});

test("degree-of-interest is deterministic and needs no focus", () => {
	const nodes = [
		{ id: "b.bx", path: "b.bx", fanIn: 2, fanOut: 0 },
		{ id: "a.bx", path: "a.bx", fanIn: 2, fanOut: 0 }
	];
	const first = layout.degreeOfInterest(nodes, [], "");
	const second = layout.degreeOfInterest(nodes, [], "");
	assert.deepEqual(first.map((e) => e.interest), second.map((e) => e.interest));
	// Without a focus every node sits at distance zero, so importance alone ranks.
	assert.equal(first[0].interest, first[1].interest);
});

test("the symbol level is drawable, not just listable", () => {
	// G-a: symbols existed only as a rail list, so "what calls this function"
	// could be answered in a panel but never seen on the map.
	const ui = readFileSync(new URL("../../public/assets/app.js", import.meta.url), "utf8");
	const view = readFileSync(new URL("../../app/views/main/codegraph.bxm", import.meta.url), "utf8");

	assert.match(ui, /depth === "symbol"/, "the painter handles a symbol depth");
	assert.match(ui, /codeGraphLoadSymbolCanvas/, "symbol rows are fetched for the canvas");
	assert.match(ui, /level=symbol&scope=/, "rows come from the levelled endpoint, not the snapshot blob");
	assert.match(view, /data-codegraph-depth="symbol"/, "the depth control offers it");
});

test("plain /codegraph stays on the form and only offers the saved map", () => {
	// The form is the point of this page: it is how someone scans a *different*
	// project or directory. Auto-loading the last snapshot put a stale map in
	// front of that, so a bare /codegraph must not open anything.
	//
	// The real gap it was trying to close — dozens of stored graphs with no route
	// back to one except the dashboard — is closed by *offering* the map instead.
	const ui = readFileSync(new URL("../../public/assets/app.js", import.meta.url), "utf8");
	const view = readFileSync(new URL("../../app/views/main/codegraph.bxm", import.meta.url), "utf8");
	// Only the no-run-id branch, not the whole function: an explicit ?run= is
	// still expected to open a run, and that is what History's Open button uses.
	const bareStart = ui.indexOf("if (!resumeId) {");
	const bare = ui.slice(bareStart, ui.indexOf("return;", bareStart));
	assert.doesNotMatch(bare, /watchRun\(/, "a bare /codegraph must not open a run");
	assert.match(bare, /offerProjectSnapshot\(\)/, "it offers the saved map instead");
	assert.match(ui, /data-open-saved-map/, "and the offer only loads when clicked");
	assert.match(view, /id="run-form"/, "the form stays in front");
	// History still routes here with an explicit id.
	assert.match(ui, /\/\$\{runKind\}\?run=\$\{encodeURIComponent\(run\.id\)\}/);
});

test("the briefing renders on the depths that return early", () => {
	// renderCodeGraphCanvas returns before renderCodeGraphProjectStrip for the
	// "start" and "matrix" depths, and a run opens on "start" — so the pitch,
	// domains, onboarding path and processes stayed hidden on every arrival, with
	// their content already rendered underneath an unset `hidden` flag.
	const ui = readFileSync(new URL("../../public/assets/app.js", import.meta.url), "utf8");
	const start = ui.indexOf('if (depth === "start")');
	assert.ok(start > 0, "the start depth branch exists");
	// Both branches sit together; take the window that spans them rather than
	// anchoring on a token that also appears elsewhere in the file.
	const branches = ui.slice(start, start + 900);
	assert.match(branches, /renderCodeGraphStartHere\(host\)/);
	assert.match(branches, /renderCodeGraphMatrix\(host, snapshot\)/);
	const strips = branches.match(/renderCodeGraphProjectStrip\(/g) || [];
	assert.equal(strips.length, 2, "both early-returning depths render the briefing before returning");
});

test("unresolved references and starved kinds are stated, not folded into cap counts", () => {
	// G8: 17,364 references the graph could not resolve were recorded and never
	// shown. An unresolved reference is not an omission — no larger cap recovers
	// it — so it gets its own sentence.
	const ui = readFileSync(new URL("../../public/assets/app.js", import.meta.url), "utf8");
	const fn = ui.slice(ui.indexOf("function codeGraphCompletenessLines"), ui.indexOf("function codeGraphTruncationMessage"));

	assert.match(fn, /could not be resolved to a file/, "unresolved count must be surfaced");
	assert.match(fn, /starvedKinds/, "a wholly starved relationship kind must be named");
	// And the banner must appear when that is the only thing to report.
	assert.match(ui, /hasUnresolved/, "an untruncated snapshot with unresolved refs still reports them");
});

test("symbol view labels by symbol name and follows source order", () => {
	// G-a: the symbol level was drawn through buildFileView, which labels by path
	// — the same string on every box, since they share one file — and orders by
	// path, which is no order at all within a file.
	const view = layout.buildSymbolView({
		nodes: [
			{ id: "sym:b", path: "app/S.bx", symbolName: "zeta", kind: "function", line: 40, fanIn: 1, fanOut: 0 },
			{ id: "sym:a", path: "app/S.bx", symbolName: "alpha", kind: "function", line: 10, fanIn: 3, fanOut: 2 }
		],
		edges: [ { from: "sym:a", to: "sym:b", kind: "calls", line: 12 } ]
	}, { maxNodes: 50 });

	assert.equal(view.mode, "symbol");
	assert.deepEqual(view.nodes.map((n) => n.label), ["alpha", "zeta"], "labelled by symbol, ordered by line");
	assert.equal(view.edges.length, 1, "symbol edges survive");
});

test("the overview offers two non-diagram views and lands on the reading order", () => {
	// The 42-box overview overlapped, clipped its own labels, and named modules
	// from filenames. Neither of these can overlap: one is a list, one is a grid.
	const ui = readFileSync(new URL("../../public/assets/app.js", import.meta.url), "utf8");
	const markup = readFileSync(new URL("../../app/views/main/codegraph.bxm", import.meta.url), "utf8");

	assert.match(markup, /data-codegraph-depth="start"/, "Start here is a depth");
	assert.match(markup, /data-codegraph-depth="matrix"/, "Matrix is a depth");
	assert.match(ui, /mode:\s*"start"/, "a run opens on the reading order, not the diagram");
	assert.match(ui, /renderCodeGraphStartHere/);
	assert.match(ui, /renderCodeGraphMatrix/);
	// Below the diagonal is a cycle — the property that makes a DSM worth drawing.
	assert.match(ui, /is-cycle/);
});

// ---------------------------------------------------------------------------
// A field with no data renders no widget.
//
// `layerLabelOf` used to fall back to ["entry","config","domain","support",
// "tests"][index % 5] — the card's draw position. Snapshot clusters carry
// neither `layer` nor `layerLabel`, so every card on the Overview displayed a
// layer derived from nothing, in the same styling as the real file count: a
// 117-file core-services module read "entry", the repository layer read "tests".
//
// These are written against the general rule rather than the one field, because
// the defect was not that this fallback was wrong — it was that a renderer was
// allowed to invent a value at all.
// ---------------------------------------------------------------------------

const unlayeredSnapshot = {
	nodes: [],
	clusters: [
		{ id: "c1", label: "Alpha", fileCount: 9, symbolCount: 40, crossingEdges: 1, filePaths: [] },
		{ id: "c2", label: "Beta", fileCount: 9, symbolCount: 40, crossingEdges: 1, filePaths: [] },
		{ id: "c3", label: "Gamma", fileCount: 9, symbolCount: 40, crossingEdges: 1, filePaths: [] },
		{ id: "c4", label: "Delta", fileCount: 9, symbolCount: 40, crossingEdges: 1, filePaths: [] },
		{ id: "c5", label: "Epsilon", fileCount: 9, symbolCount: 40, crossingEdges: 1, filePaths: [] },
		{ id: "c6", label: "Zeta", fileCount: 9, symbolCount: 40, crossingEdges: 1, filePaths: [] }
	],
	clusterEdges: [],
	edges: []
};

test("a cluster with no layer in the payload gets no layer label", () => {
	const view = layout.buildClusterView(unlayeredSnapshot, { showAll: true });
	const labels = view.nodes.map((n) => n.layerLabel);
	assert.deepEqual(
		labels,
		labels.map(() => ""),
		"no cluster carries a layer, so none may display one"
	);
	assert.equal(
		view.nodes.every((n) => n.layer === undefined),
		true,
		"the numeric layer feeds the Layer layout's bands — it may not be positional either"
	);
});

test("identical clusters render identically wherever they are drawn", () => {
	// The regression in one assertion: six clusters with identical data differed
	// only by array position, and position alone changed what the card claimed.
	const view = layout.buildClusterView(unlayeredSnapshot, { showAll: true });
	const claims = view.nodes.map((n) => [n.layerLabel, n.complexity, n.fileCount].join("|"));
	assert.equal(
		new Set(claims).size,
		1,
		"identical input must produce identical claims: " + JSON.stringify(claims)
	);
});

test("a real layer on the payload is still shown", () => {
	// The fix must not throw away true data along with the invented data.
	const view = layout.buildClusterView(
		{
			nodes: [],
			clusters: [{ id: "c1", label: "Alpha", fileCount: 3, layer: "application models", filePaths: [] }],
			clusterEdges: [],
			edges: []
		},
		{ showAll: true }
	);
	assert.equal(view.nodes[0].layerLabel, "application models");
});

test("the overview card omits chips it has no value for", () => {
	const view = layout.buildClusterView(unlayeredSnapshot, { showAll: true });
	const svg = layout.buildSvg(view, {});
	assert.equal(
		/class="cg-card-layer"/.test(svg),
		false,
		"no layer value means no layer element — not an empty one"
	);
	assert.match(svg, /class="cg-card-complexity"/, "complexity is real and still renders");
	assert.match(svg, /class="cg-card-footer"/, "the file count is real and still renders");
});

test("every visible card claim traces to a payload value", () => {
	// The general guard. Any chip added later that is derived from draw order
	// rather than data fails this, because shuffling the input must not change
	// what any card says about itself.
	const shuffled = Object.assign({}, unlayeredSnapshot, {
		clusters: unlayeredSnapshot.clusters.slice().reverse()
	});
	const a = layout.buildClusterView(unlayeredSnapshot, { showAll: true });
	const b = layout.buildClusterView(shuffled, { showAll: true });
	const claimsOf = (view) =>
		view.nodes
			.map((n) => [n.id, n.layerLabel, n.complexity, n.fileCount, n.summary].join("|"))
			.sort();
	assert.deepEqual(claimsOf(a), claimsOf(b), "a card's claims must not depend on its position");
});

test("the flows endpoint and its hop contract are wired", () => {
	// Flows were the product's central promise and the one answer with no endpoint:
	// they lived only inside the snapshot blob returned by /result, as a list of
	// node names with no line behind any step.
	const handler = readFileSync(new URL("../../app/handlers/ApiCodeGraph.bx", import.meta.url), "utf8");
	const router = readFileSync(new URL("../../app/config/Router.bx", import.meta.url), "utf8");
	const flowService = readFileSync(new URL("../../app/models/services/CodeGraphFlowService.bx", import.meta.url), "utf8");
	const mcp = readFileSync(new URL("../../app/models/services/CodeGraphMcpDescriptor.bx", import.meta.url), "utf8");

	assert.match(router, /codegraph\/flows/, "the route exists");
	assert.match(handler, /function flows\(/, "the action exists");
	assert.match(handler, /unresolvedHops/, "a hop that could not be bound is reported, not dropped");
	assert.match(flowService, /hopsFor\(/, "hops are assembled");
	assert.match(flowService, /resolution: found \? "exact" : "unresolved"/, "every hop carries a resolution class");
	assert.match(mcp, /codegraph_flows/, "an agent can reach flows too");
});

test("search facets are applied or refused, never silently ignored", () => {
	const handler = readFileSync(new URL("../../app/handlers/ApiCodeGraph.bx", import.meta.url), "utf8");
	const repo = readFileSync(new URL("../../app/models/repositories/CodeGraphGraphRepository.bx", import.meta.url), "utf8");
	assert.match(repo, /kindFilter/, "kind is a predicate");
	assert.match(repo, /roleFilter/, "role is a predicate");
	assert.match(handler, /is not a supported search facet/, "an unsupported facet is rejected rather than dropped");
});

test("every shipped browser asset parses", () => {
	// A syntax error in app.js takes the whole workspace down — no canvas, no
	// drawer, no arrival — and the suite stayed green because nothing here ever
	// parsed the file it asserts against with string matches. One bad regex
	// escape shipped exactly that.
	const { execFileSync } = require("node:child_process");
	for (const asset of ["app.js", "codegraph-layout.js", "modernization-render-helpers.js", "modernization-contract.js", "architecture-flow.js"]) {
		const path = new URL(`../../public/assets/${asset}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
		assert.doesNotThrow(
			() => execFileSync(process.execPath, ["--check", path], { stdio: "pipe" }),
			`${asset} must parse`
		);
	}
});
