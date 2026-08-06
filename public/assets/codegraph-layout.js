(function (root, factory) {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.CodeGraphLayout = factory();
	}
})(typeof self !== "undefined" ? self : this, function () {
	"use strict";

	const DEFAULTS = {
		maxNodes: 120,
		maxEdges: 300,
		nodeWidth: 180,
		nodeHeight: 56,
		gapX: 72,
		gapY: 20,
		pad: 24,
		// Overview (project-module) cards — Understand-Anything style
		overviewNodeWidth: 280,
		overviewNodeHeight: 148,
		overviewGapX: 48,
		overviewGapY: 36,
		overviewMaxSummaryChars: 160,
		overviewMaxSummaryLines: 3
	};

	const LAYER_ORDER = {
		"http-handlers": 0,
		"entry-points": 0,
		handlers: 0,
		configuration: 1,
		config: 1,
		"application-models": 2,
		models: 2,
		services: 2,
		other: 3,
		documentation: 3,
		manifests: 3,
		tests: 4
	};

	function opt(opts, key, fallback) {
		if (opts && opts[key] !== undefined && opts[key] !== null && opts[key] !== "") {
			return opts[key];
		}
		return fallback;
	}

	function mergeDefaults(opts) {
		const o = opts || {};
		const overview = !!o.overview;
		return {
			maxNodes: Number(opt(o, "maxNodes", DEFAULTS.maxNodes)) || DEFAULTS.maxNodes,
			maxEdges: Number(opt(o, "maxEdges", DEFAULTS.maxEdges)) || DEFAULTS.maxEdges,
			nodeWidth:
				Number(
					opt(
						o,
						"nodeWidth",
						overview ? DEFAULTS.overviewNodeWidth : DEFAULTS.nodeWidth
					)
				) || (overview ? DEFAULTS.overviewNodeWidth : DEFAULTS.nodeWidth),
			nodeHeight:
				Number(
					opt(
						o,
						"nodeHeight",
						overview ? DEFAULTS.overviewNodeHeight : DEFAULTS.nodeHeight
					)
				) || (overview ? DEFAULTS.overviewNodeHeight : DEFAULTS.nodeHeight),
			gapX:
				Number(opt(o, "gapX", overview ? DEFAULTS.overviewGapX : DEFAULTS.gapX)) ||
				(overview ? DEFAULTS.overviewGapX : DEFAULTS.gapX),
			gapY:
				Number(opt(o, "gapY", overview ? DEFAULTS.overviewGapY : DEFAULTS.gapY)) ||
				(overview ? DEFAULTS.overviewGapY : DEFAULTS.gapY),
			pad: Number(opt(o, "pad", DEFAULTS.pad)) || DEFAULTS.pad,
			includeTests: o.includeTests !== false,
			kinds: Array.isArray(o.kinds) ? o.kinds : null,
			overview: overview,
			summaries: Array.isArray(o.summaries) ? o.summaries : null
		};
	}

	/** Deterministic complexity badge for overview cards. */
	function complexityOf(cluster) {
		const files = Number(cluster && cluster.fileCount) || 0;
		const crossing = Number(cluster && (cluster.crossingEdges != null ? cluster.crossingEdges : cluster.crossings)) || 0;
		const symbols = Number(cluster && cluster.symbolCount) || 0;
		const inCycle = !!(cluster && (cluster.inCycle || cluster.hasCycle));
		const score = files + crossing * 3 + Math.floor(symbols / 20) + (inCycle ? 8 : 0);
		if (score >= 40 || inCycle && files >= 8) return "complex";
		if (score >= 12) return "moderate";
		return "simple";
	}

	function layerLabelOf(cluster, index) {
		if (cluster && cluster.layerLabel) return String(cluster.layerLabel);
		if (cluster && typeof cluster.layer === "string" && isNaN(Number(cluster.layer))) {
			return String(cluster.layer).replace(/-/g, " ");
		}
		const labels = ["entry", "config", "domain", "support", "tests"];
		const layer = typeof cluster.layer === "number" ? cluster.layer : index % labels.length;
		return labels[Math.max(0, Math.min(labels.length - 1, layer))] || "module";
	}

	function summaryForCluster(cluster, summaries) {
		const id = String((cluster && (cluster.id || cluster.key)) || "");
		if (Array.isArray(summaries)) {
			const hit = summaries.find(
				(s) => s && (s.clusterId === id || s.nodeId === id || (s.title && s.title === (cluster.label || cluster.name)))
			);
			if (hit && hit.text) return { text: String(hit.text), origin: "ai" };
		}
		if (cluster && cluster.summary) return { text: String(cluster.summary), origin: "provided" };
		const files = Number(cluster && cluster.fileCount) || (Array.isArray(cluster && cluster.filePaths) ? cluster.filePaths.length : 0);
		const crossing = Number(cluster && cluster.crossingEdges) || 0;
		const cohesion = cluster && cluster.cohesion != null ? Number(cluster.cohesion) : null;
		const bits = [];
		bits.push(files === 1 ? "1 file" : files + " files");
		if (crossing) bits.push(crossing + " crossing edge" + (crossing === 1 ? "" : "s"));
		if (cohesion != null && !isNaN(cohesion)) bits.push("cohesion " + cohesion.toFixed(2));
		const label = (cluster && (cluster.label || cluster.name || cluster.key)) || "Module";
		return {
			text: label + " — " + bits.join(" · ") + ". Select to inspect; explore files from the panel.",
			origin: "deterministic"
		};
	}

	function wrapText(text, maxChars, maxLines) {
		const raw = String(text || "").replace(/\s+/g, " ").trim();
		if (!raw) return [];
		const limit = Math.max(8, maxChars || 42);
		const lines = [];
		let rest = raw;
		while (rest.length && lines.length < (maxLines || 3)) {
			if (rest.length <= limit) {
				lines.push(rest);
				break;
			}
			let cut = rest.lastIndexOf(" ", limit);
			if (cut < limit * 0.5) cut = limit;
			lines.push(rest.slice(0, cut).trim());
			rest = rest.slice(cut).trim();
		}
		if (rest.length && lines.length) {
			const last = lines[lines.length - 1];
			lines[lines.length - 1] = last.replace(/\s+\S*$/, "") + "…";
		}
		return lines;
	}

	function normPath(path) {
		return String(path || "").replace(/\\/g, "/");
	}

	function fileBasename(path) {
		const p = normPath(path);
		const i = p.lastIndexOf("/");
		return i >= 0 ? p.slice(i + 1) : p || "—";
	}

	function isTestPath(path) {
		const p = normPath(path).toLowerCase();
		return /(^|\/)tests?\//.test(p) || /\bspec\./i.test(p);
	}

	function escapeXml(value) {
		return String(value == null ? "" : value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&apos;");
	}

	function numericLayer(node) {
		if (typeof node.layer === "number" && Number.isFinite(node.layer)) {
			return node.layer;
		}
		const key = String(node.layer || node.component || "").toLowerCase();
		return Object.prototype.hasOwnProperty.call(LAYER_ORDER, key) ? LAYER_ORDER[key] : 3;
	}

	function uniqueEdges(list) {
		const seen = new Set();
		const out = [];
		(list || []).forEach((e) => {
			const from = String(e.from || "");
			const to = String(e.to || "");
			if (!from || !to || from === to) return;
			const key = from + "\0" + to + "\0" + String(e.kind || e.label || "");
			if (seen.has(key)) return;
			seen.add(key);
			out.push({
				from,
				to,
				kind: e.kind || e.label || "",
				weight: e.weight,
				edgeCount: e.edgeCount,
				label: e.label || e.kind || ""
			});
		});
		return out;
	}

	function emptyView(extra) {
		return Object.assign(
			{
				nodes: [],
				edges: [],
				truncated: false,
				totalNodes: 0,
				totalEdges: 0
			},
			extra || {}
		);
	}

	function capGraph(nodes, edges, maxNodes, maxEdges) {
		const totalNodes = nodes.length;
		const totalEdges = edges.length;
		let selectedNodes = nodes;
		let selectedEdges = edges;
		let truncated = false;

		if (selectedNodes.length > maxNodes) {
			selectedNodes = selectedNodes.slice(0, maxNodes);
			truncated = true;
		}
		const idSet = new Set(selectedNodes.map((n) => n.id));
		selectedEdges = selectedEdges.filter((e) => idSet.has(e.from) && idSet.has(e.to));
		if (selectedEdges.length > maxEdges) {
			selectedEdges = selectedEdges.slice(0, maxEdges);
			truncated = true;
		}
		if (selectedNodes.length < totalNodes || selectedEdges.length < totalEdges) {
			truncated = true;
		}

		return {
			nodes: selectedNodes,
			edges: selectedEdges,
			truncated,
			totalNodes,
			totalEdges
		};
	}

	function snapshotEdges(snapshot) {
		if (Array.isArray(snapshot && snapshot.edges) && snapshot.edges.length) {
			return uniqueEdges(snapshot.edges);
		}
		return uniqueEdges(snapshot && snapshot.clusterEdges);
	}

	function buildClusterView(snapshot, opts) {
		const cfg = mergeDefaults(Object.assign({}, opts, { overview: opts && opts.overview !== false }));
		const clusters = Array.isArray(snapshot && snapshot.clusters) ? snapshot.clusters : [];
		const clusterEdges = Array.isArray(snapshot && snapshot.clusterEdges) ? snapshot.clusterEdges : [];
		const summaries = cfg.summaries;

		const nodes = clusters.map((c, index) => {
			const summary = summaryForCluster(c, summaries);
			const fileCount =
				c.fileCount != null ? c.fileCount : Array.isArray(c.filePaths) ? c.filePaths.length : 0;
			const node = {
				id: String(c.id || c.key || "cluster-" + index),
				label: c.label || c.name || c.key || c.id || "cluster",
				kind: "cluster",
				layer: typeof c.layer === "number" ? c.layer : index % 5,
				layerLabel: layerLabelOf(c, index),
				fileCount: fileCount,
				symbolCount: c.symbolCount || 0,
				crossingEdges: c.crossingEdges != null ? c.crossingEdges : 0,
				cohesion: c.cohesion,
				inCycle: !!(c.inCycle || c.hasCycle),
				filePaths: Array.isArray(c.filePaths) ? c.filePaths.slice() : [],
				summary: summary.text,
				summaryOrigin: summary.origin,
				complexity: complexityOf(
					Object.assign({}, c, {
						fileCount: fileCount,
						crossingEdges: c.crossingEdges != null ? c.crossingEdges : 0
					})
				)
			};
			return node;
		});

		const edges = uniqueEdges(clusterEdges);
		const capped = capGraph(nodes, edges, cfg.maxNodes, cfg.maxEdges);
		return Object.assign({ mode: "cluster", overview: true }, capped);
	}

	function buildFileView(snapshot, opts) {
		const cfg = mergeDefaults(opts);
		const raw = Array.isArray(snapshot && snapshot.nodes) ? snapshot.nodes : [];
		let nodes = raw.map((n, index) => {
			const path = n.path || n.id || "";
			return {
				id: String(n.id || path || "node-" + index),
				path: path,
				label: n.label || fileBasename(path),
				kind: n.kind || "file",
				layer: numericLayer(n),
				component: n.component || n.layer || "",
				clusterId: n.clusterId || "",
				fanIn: n.fanIn || 0,
				fanOut: n.fanOut || 0,
				inCycle: !!n.inCycle,
				hotspotScore: n.hotspotScore || 0
			};
		});

		if (!cfg.includeTests) {
			nodes = nodes.filter((n) => !isTestPath(n.path) && n.component !== "tests" && n.layer !== 4);
		}

		const edges = Array.isArray(snapshot && snapshot.edges)
			? uniqueEdges(snapshot.edges)
			: [];
		const filteredEdges = cfg.kinds
			? edges.filter((e) => cfg.kinds.indexOf(e.kind) >= 0)
			: edges;

		const capped = capGraph(nodes, filteredEdges, cfg.maxNodes, cfg.maxEdges);
		return Object.assign({ mode: "file" }, capped);
	}

	function buildFocusView(subgraph, opts) {
		const cfg = mergeDefaults(opts);
		const rawNodes = Array.isArray(subgraph && subgraph.nodes) ? subgraph.nodes : [];
		const rawEdges = Array.isArray(subgraph && subgraph.edges) ? subgraph.edges : [];

		const nodes = rawNodes.map((n, index) => ({
			id: String(n.id || n.path || "node-" + index),
			path: n.path || "",
			label: n.label || fileBasename(n.path || n.id || ""),
			kind: n.kind || "file",
			layer: numericLayer(n),
			clusterId: n.clusterId || "",
			role: n.role || (n.id === (subgraph && subgraph.focus) ? "focus" : "neighbor")
		}));
		const edges = uniqueEdges(rawEdges);
		const capped = capGraph(nodes, edges, cfg.maxNodes, cfg.maxEdges);
		return Object.assign(
			{
				mode: "focus",
				focus: subgraph && subgraph.focus ? String(subgraph.focus) : ""
			},
			capped
		);
	}

	function selectSubgraph(snapshot, options) {
		const opts = options || {};
		const focus = String(opts.focus || "");
		const depth = opts.depth == null ? 2 : Math.max(0, Number(opts.depth) || 0);
		const budget = Math.max(1, Number(opts.budget || opts.maxNodes || DEFAULTS.maxNodes) || DEFAULTS.maxNodes);
		const includeTests = opts.includeTests !== false;
		const kinds = Array.isArray(opts.kinds) ? opts.kinds : null;

		const fileNodes = Array.isArray(snapshot && snapshot.nodes) ? snapshot.nodes : [];
		const clusterNodes = Array.isArray(snapshot && snapshot.clusters) ? snapshot.clusters : [];
		const useFileEdges = Array.isArray(snapshot && snapshot.edges) && snapshot.edges.length > 0;
		const edgeSource = useFileEdges
			? uniqueEdges(snapshot.edges)
			: uniqueEdges(snapshot && snapshot.clusterEdges);
		const allEdges = kinds
			? edgeSource.filter((e) => kinds.indexOf(e.kind) >= 0 || !e.kind)
			: edgeSource;

		const nodeIndex = new Map();
		if (useFileEdges || fileNodes.length) {
			fileNodes.forEach((n, i) => {
				const id = String(n.id || n.path || "node-" + i);
				nodeIndex.set(id, {
					id,
					path: n.path || id,
					label: n.label || fileBasename(n.path || id),
					kind: n.kind || "file",
					layer: numericLayer(n),
					clusterId: n.clusterId || "",
					component: n.component || ""
				});
			});
		} else {
			clusterNodes.forEach((c, i) => {
				const id = String(c.id || c.key || "cluster-" + i);
				nodeIndex.set(id, {
					id,
					path: "",
					label: c.label || c.name || id,
					kind: "cluster",
					layer: typeof c.layer === "number" ? c.layer : 0,
					fileCount: c.fileCount || 0
				});
			});
		}

		allEdges.forEach((e) => {
			if (!nodeIndex.has(e.from)) {
				nodeIndex.set(e.from, { id: e.from, path: e.from, label: fileBasename(e.from), kind: "file", layer: 0 });
			}
			if (!nodeIndex.has(e.to)) {
				nodeIndex.set(e.to, { id: e.to, path: e.to, label: fileBasename(e.to), kind: "file", layer: 0 });
			}
		});

		const totalNodes = nodeIndex.size;
		const totalEdges = allEdges.length;

		if (!focus || !nodeIndex.size) {
			return emptyView({ focus, totalNodes, totalEdges, truncated: false });
		}

		const adj = new Map();
		nodeIndex.forEach((_, id) => adj.set(id, []));
		allEdges.forEach((e) => {
			adj.get(e.from).push(e.to);
			adj.get(e.to).push(e.from);
		});

		const selected = new Map();
		const queue = [];
		if (nodeIndex.has(focus)) {
			queue.push({ id: focus, d: 0 });
			selected.set(focus, nodeIndex.get(focus));
		}

		while (queue.length && selected.size < budget) {
			const cur = queue.shift();
			if (cur.d >= depth) continue;
			const neighbors = adj.get(cur.id) || [];
			for (let i = 0; i < neighbors.length; i++) {
				if (selected.size >= budget) break;
				const nid = neighbors[i];
				if (selected.has(nid)) continue;
				const node = nodeIndex.get(nid);
				if (!node) continue;
				if (!includeTests && (isTestPath(node.path) || node.component === "tests" || node.layer === 4)) {
					continue;
				}
				selected.set(nid, Object.assign({}, node, { depth: cur.d + 1 }));
				queue.push({ id: nid, d: cur.d + 1 });
			}
		}

		const idSet = new Set(selected.keys());
		const edges = allEdges.filter((e) => idSet.has(e.from) && idSet.has(e.to));
		const nodes = [...selected.values()];
		const truncated = nodes.length < totalNodes || edges.length < totalEdges || nodes.length >= budget;

		return {
			focus,
			nodes,
			edges,
			truncated,
			totalNodes,
			totalEdges
		};
	}

	function layoutBounds(positioned, pad) {
		if (!positioned.length) {
			return { width: pad * 2, height: pad * 2, nodes: [], edges: [] };
		}
		let maxX = 0;
		let maxY = 0;
		positioned.forEach((n) => {
			maxX = Math.max(maxX, n.x + n.w);
			maxY = Math.max(maxY, n.y + n.h);
		});
		return {
			width: maxX + pad,
			height: maxY + pad
		};
	}

	function layoutClusters(view, opts) {
		const overview = !!(view && (view.overview || view.mode === "cluster"));
		const cfg = mergeDefaults(Object.assign({}, opts, { overview: overview || !!(opts && opts.overview) }));
		const nodes = (view && view.nodes) || [];
		const edges = (view && view.edges) || [];
		const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, nodes.length))));
		const positioned = nodes.map((n, i) => {
			const col = i % cols;
			const row = Math.floor(i / cols);
			return Object.assign({}, n, {
				x: cfg.pad + col * (cfg.nodeWidth + cfg.gapX),
				y: cfg.pad + row * (cfg.nodeHeight + cfg.gapY),
				w: cfg.nodeWidth,
				h: cfg.nodeHeight
			});
		});
		const bounds = layoutBounds(positioned, cfg.pad);
		return {
			width: bounds.width,
			height: bounds.height,
			nodes: positioned,
			edges: edges.map((e) => Object.assign({}, e)),
			mode: (view && view.mode) || "cluster",
			overview: overview
		};
	}

	function layoutLayered(view, opts) {
		const overview = !!(view && (view.overview || view.mode === "cluster")) || !!(opts && opts.overview);
		const cfg = mergeDefaults(Object.assign({}, opts, { overview: overview }));
		const nodes = (view && view.nodes) || [];
		const edges = (view && view.edges) || [];
		const columns = new Map();

		nodes.forEach((n) => {
			const layer = numericLayer(n);
			if (!columns.has(layer)) columns.set(layer, []);
			columns.get(layer).push(n);
		});

		const colKeys = [...columns.keys()].sort((a, b) => a - b);
		const positioned = [];
		colKeys.forEach((layer, colIndex) => {
			const list = columns.get(layer).slice().sort((a, b) =>
				String(a.label || a.path || a.id).localeCompare(String(b.label || b.path || b.id))
			);
			list.forEach((n, row) => {
				positioned.push(
					Object.assign({}, n, {
						layer,
						x: cfg.pad + colIndex * (cfg.nodeWidth + cfg.gapX),
						y: cfg.pad + row * (cfg.nodeHeight + cfg.gapY),
						w: cfg.nodeWidth,
						h: cfg.nodeHeight
					})
				);
			});
		});

		const bounds = layoutBounds(positioned, cfg.pad);
		return {
			width: bounds.width || cfg.pad * 2,
			height: bounds.height || cfg.pad * 2,
			nodes: positioned,
			edges: edges.map((e) => Object.assign({}, e)),
			mode: (view && view.mode) || "layered",
			overview: overview
		};
	}

	function layoutRadial(view, opts) {
		const overview = !!(view && (view.overview || view.mode === "cluster")) || !!(opts && opts.overview);
		const cfg = mergeDefaults(Object.assign({}, opts, { overview: overview }));
		const nodes = (view && view.nodes) || [];
		const edges = (view && view.edges) || [];
		if (!nodes.length) {
			return { width: cfg.pad * 2, height: cfg.pad * 2, nodes: [], edges: [], mode: "radial", overview: overview };
		}

		const focusId = (view && view.focus) || (nodes.find((n) => n.role === "focus") || nodes[0]).id;
		const byId = new Map(nodes.map((n) => [n.id, n]));
		const adj = new Map(nodes.map((n) => [n.id, []]));
		edges.forEach((e) => {
			if (adj.has(e.from) && adj.has(e.to)) {
				adj.get(e.from).push(e.to);
				adj.get(e.to).push(e.from);
			}
		});

		const dist = new Map();
		const queue = [focusId];
		dist.set(focusId, 0);
		while (queue.length) {
			const id = queue.shift();
			(adj.get(id) || []).forEach((nid) => {
				if (dist.has(nid)) return;
				dist.set(nid, dist.get(id) + 1);
				queue.push(nid);
			});
		}

		const rings = new Map();
		nodes.forEach((n) => {
			const d = dist.has(n.id) ? dist.get(n.id) : numericLayer(n) + 1;
			if (!rings.has(d)) rings.set(d, []);
			rings.get(d).push(n);
		});

		const cx = cfg.pad + 280;
		const cy = cfg.pad + 280;
		const positioned = [];
		rings.forEach((list, d) => {
			if (d === 0) {
				const n = byId.get(focusId) || list[0];
				positioned.push(
					Object.assign({}, n, {
						x: cx - cfg.nodeWidth / 2,
						y: cy - cfg.nodeHeight / 2,
						w: cfg.nodeWidth,
						h: cfg.nodeHeight
					})
				);
				return;
			}
			const radius = d * (cfg.nodeWidth + cfg.gapX);
			list.forEach((n, i) => {
				const angle = (Math.PI * 2 * i) / Math.max(1, list.length) - Math.PI / 2;
				positioned.push(
					Object.assign({}, n, {
						x: cx + Math.cos(angle) * radius - cfg.nodeWidth / 2,
						y: cy + Math.sin(angle) * radius - cfg.nodeHeight / 2,
						w: cfg.nodeWidth,
						h: cfg.nodeHeight
					})
				);
			});
		});

		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		positioned.forEach((n) => {
			minX = Math.min(minX, n.x);
			minY = Math.min(minY, n.y);
			maxX = Math.max(maxX, n.x + n.w);
			maxY = Math.max(maxY, n.y + n.h);
		});
		const shiftX = cfg.pad - minX;
		const shiftY = cfg.pad - minY;
		const shifted = positioned.map((n) =>
			Object.assign({}, n, { x: n.x + shiftX, y: n.y + shiftY })
		);

		return {
			width: maxX - minX + cfg.pad * 2,
			height: maxY - minY + cfg.pad * 2,
			nodes: shifted,
			edges: edges.map((e) => Object.assign({}, e)),
			mode: "radial",
			overview: overview
		};
	}

	function nodeLabel(node, opts) {
		if (!node) return "";
		if (opts && opts.preferPath && node.path) return fileBasename(node.path);
		if (node.label) return String(node.label);
		if (node.path) return fileBasename(node.path);
		return String(node.id || "");
	}

	function edgePath(a, b, opts) {
		if (!a || !b) return "";
		const aw = a.w || DEFAULTS.nodeWidth;
		const ah = a.h || DEFAULTS.nodeHeight;
		const bw = b.w || DEFAULTS.nodeWidth;
		const bh = b.h || DEFAULTS.nodeHeight;
		const x1 = a.x + aw;
		const y1 = a.y + ah / 2;
		const x2 = b.x;
		const y2 = b.y + bh / 2;
		const curved = !opts || opts.curved !== false;
		if (!curved) {
			return "M " + x1 + " " + y1 + " L " + x2 + " " + y2;
		}
		const midX = (x1 + x2) / 2;
		return "M " + x1 + " " + y1 + " C " + midX + " " + y1 + ", " + midX + " " + y2 + ", " + x2 + " " + y2;
	}

	function buildOverviewCard(n, opts) {
		const title = escapeXml(nodeLabel(n, opts));
		const complexity = escapeXml(n.complexity || "simple");
		const layer = escapeXml(String(n.layerLabel || "module").toUpperCase());
		const files = Number(n.fileCount) || 0;
		const fileLabel = files === 1 ? "1 file" : files + " files";
		const lines = wrapText(
			n.summary || "",
			Math.floor((n.w - 28) / 7.2),
			DEFAULTS.overviewMaxSummaryLines
		);
		const summaryOrigin = n.summaryOrigin === "ai" ? "ai" : "deterministic";
		const accent =
			complexity === "complex" ? "#b45309" : complexity === "moderate" ? "#1d4ed8" : "#15803d";
		const textParts = lines
			.map(function (line, i) {
				return (
					'<text class="cg-card-summary" x="' +
					(n.x + 14) +
					'" y="' +
					(n.y + 78 + i * 14) +
					'">' +
					escapeXml(line) +
					"</text>"
				);
			})
			.join("");
		return (
			'<g class="cg-node cg-card" data-node-id="' +
			escapeXml(n.id) +
			'" data-kind="cluster" data-complexity="' +
			complexity +
			'" data-summary-origin="' +
			summaryOrigin +
			'">' +
			'<rect class="cg-card-body" x="' +
			n.x +
			'" y="' +
			n.y +
			'" width="' +
			n.w +
			'" height="' +
			n.h +
			'" rx="8" ry="8"/>' +
			'<rect class="cg-card-accent" x="' +
			n.x +
			'" y="' +
			n.y +
			'" width="' +
			n.w +
			'" height="4" rx="2" ry="2" fill="' +
			accent +
			'"/>' +
			'<text class="cg-card-meta" x="' +
			(n.x + 14) +
			'" y="' +
			(n.y + 24) +
			'">LAYER · <tspan class="cg-card-complexity">' +
			complexity +
			"</tspan></text>" +
			'<text class="cg-card-layer" x="' +
			(n.x + n.w - 14) +
			'" y="' +
			(n.y + 24) +
			'" text-anchor="end">' +
			layer +
			"</text>" +
			'<text class="cg-card-title" x="' +
			(n.x + 14) +
			'" y="' +
			(n.y + 48) +
			'">' +
			title +
			"</text>" +
			textParts +
			'<text class="cg-card-footer" x="' +
			(n.x + 14) +
			'" y="' +
			(n.y + n.h - 14) +
			'">' +
			escapeXml(fileLabel) +
			'</text>' +
			'<text class="cg-card-cta" x="' +
			(n.x + n.w - 14) +
			'" y="' +
			(n.y + n.h - 14) +
			'" text-anchor="end">Click to inspect</text>' +
			"</g>"
		);
	}

	function buildSimpleNode(n, opts) {
		const label = escapeXml(nodeLabel(n, opts));
		return (
			'<g class="cg-node" data-node-id="' +
			escapeXml(n.id) +
			'" data-kind="' +
			escapeXml(n.kind || "file") +
			'">' +
			'<rect x="' +
			n.x +
			'" y="' +
			n.y +
			'" width="' +
			n.w +
			'" height="' +
			n.h +
			'" rx="6" ry="6"/>' +
			'<text x="' +
			(n.x + 10) +
			'" y="' +
			(n.y + n.h / 2 + 4) +
			'">' +
			label +
			"</text>" +
			"</g>"
		);
	}

	function buildSvg(layout, opts) {
		const cfg = mergeDefaults(opts);
		const nodes = (layout && layout.nodes) || [];
		const edges = (layout && layout.edges) || [];
		const width = (layout && layout.width) || cfg.pad * 2;
		const height = (layout && layout.height) || cfg.pad * 2;
		const byId = new Map(nodes.map((n) => [n.id, n]));
		const aria = escapeXml((opts && opts.ariaLabel) || "Code graph");
		const overview =
			!!(layout && layout.overview) ||
			(layout && layout.mode === "cluster") ||
			nodes.some((n) => n.kind === "cluster" && (n.summary || n.complexity));

		const edgeParts = [];
		edges.forEach((e) => {
			const a = byId.get(e.from);
			const b = byId.get(e.to);
			if (!a || !b) return;
			const weight = e.weight != null ? e.weight : e.edgeCount;
			edgeParts.push(
				'<path class="cg-edge" data-from="' +
					escapeXml(e.from) +
					'" data-to="' +
					escapeXml(e.to) +
					'" d="' +
					escapeXml(edgePath(a, b, opts)) +
					'" fill="none" stroke="currentColor" stroke-opacity="0.4"/>' +
					(weight != null
						? '<text class="cg-edge-label" x="' +
							((a.x + a.w + b.x) / 2) +
							'" y="' +
							((a.y + a.h / 2 + b.y + b.h / 2) / 2 - 4) +
							'">' +
							escapeXml(String(weight)) +
							"</text>"
						: "")
			);
		});

		const nodeParts = nodes.map((n) => {
			if (overview && n.kind === "cluster") return buildOverviewCard(n, opts);
			return buildSimpleNode(n, opts);
		});

		return (
			'<svg xmlns="http://www.w3.org/2000/svg" class="cg-svg' +
			(overview ? " cg-svg-overview" : "") +
			'" width="' +
			width +
			'" height="' +
			height +
			'" viewBox="0 0 ' +
			width +
			" " +
			height +
			'" role="img" aria-label="' +
			aria +
			'">' +
			'<g class="cg-edges">' +
			edgeParts.join("") +
			"</g>" +
			'<g class="cg-nodes">' +
			nodeParts.join("") +
			"</g>" +
			"</svg>"
		);
	}

	function createViewport(a, b, c, d, e) {
		if (typeof a === "object" && a !== null) {
			return {
				x: Number(a.x) || 0,
				y: Number(a.y) || 0,
				width: Number(a.width != null ? a.width : a.w) || 800,
				height: Number(a.height != null ? a.height : a.h) || 600,
				scale: Number(a.scale) || 1
			};
		}
		if (arguments.length <= 2) {
			return {
				x: 0,
				y: 0,
				width: Number(a) || 800,
				height: Number(b) || 600,
				scale: 1
			};
		}
		return {
			x: Number(a) || 0,
			y: Number(b) || 0,
			width: Number(c) || 800,
			height: Number(d) || 600,
			scale: Number(e) || 1
		};
	}

	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value));
	}

	function zoomAt(vp, point, factor, limits) {
		const min = limits && limits.min != null ? Number(limits.min) : 0.25;
		const max = limits && limits.max != null ? Number(limits.max) : 8;
		const px = point && point.x != null ? Number(point.x) : 0;
		const py = point && point.y != null ? Number(point.y) : 0;
		const scale = Number(vp.scale) || 1;
		const worldX = vp.x + px / scale;
		const worldY = vp.y + py / scale;
		const next = clamp(scale * (Number(factor) || 1), min, max);
		return {
			x: worldX - px / next,
			y: worldY - py / next,
			width: vp.width,
			height: vp.height,
			scale: next
		};
	}

	function panBy(vp, dx, dy) {
		const scale = Number(vp.scale) || 1;
		return {
			x: vp.x - (Number(dx) || 0) / scale,
			y: vp.y - (Number(dy) || 0) / scale,
			width: vp.width,
			height: vp.height,
			scale: scale
		};
	}

	function fitToBounds(vp, bounds, pad) {
		const padding = pad == null ? DEFAULTS.pad : Number(pad) || 0;
		const bx = Number(bounds.x != null ? bounds.x : bounds.minX) || 0;
		const by = Number(bounds.y != null ? bounds.y : bounds.minY) || 0;
		const bw =
			Number(
				bounds.width != null
					? bounds.width
					: bounds.w != null
						? bounds.w
						: (bounds.maxX || 0) - bx
			) || 1;
		const bh =
			Number(
				bounds.height != null
					? bounds.height
					: bounds.h != null
						? bounds.h
						: (bounds.maxY || 0) - by
			) || 1;
		const worldW = Math.max(1, bw + padding * 2);
		const worldH = Math.max(1, bh + padding * 2);
		const scale = Math.min(vp.width / worldW, vp.height / worldH);
		return {
			x: bx - padding,
			y: by - padding,
			width: vp.width,
			height: vp.height,
			scale: scale > 0 ? scale : 1
		};
	}

	function viewBoxOf(vp) {
		const scale = Number(vp.scale) || 1;
		const w = vp.width / scale;
		const h = vp.height / scale;
		return vp.x + " " + vp.y + " " + w + " " + h;
	}

	function hitTest(layout, point) {
		const nodes = (layout && layout.nodes) || [];
		const px = point && point.x != null ? Number(point.x) : NaN;
		const py = point && point.y != null ? Number(point.y) : NaN;
		if (!Number.isFinite(px) || !Number.isFinite(py)) return "";
		for (let i = nodes.length - 1; i >= 0; i--) {
			const n = nodes[i];
			if (px >= n.x && px <= n.x + n.w && py >= n.y && py <= n.y + n.h) {
				return n.id;
			}
		}
		return "";
	}

	return {
		DEFAULTS,
		buildClusterView,
		buildFileView,
		buildFocusView,
		selectSubgraph,
		layoutClusters,
		layoutLayered,
		layoutRadial,
		buildSvg,
		edgePath,
		nodeLabel,
		createViewport,
		zoomAt,
		panBy,
		fitToBounds,
		viewBoxOf,
		hitTest,
		fileBasename,
		normPath,
		complexityOf,
		summaryForCluster,
		wrapText
	};
});
