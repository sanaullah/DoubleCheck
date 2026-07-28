(function (root, factory) {
	if (typeof module === "object" && module.exports) {
		module.exports = factory();
	} else {
		root.ArchitectureFlow = factory();
	}
})(typeof self !== "undefined" ? self : this, function () {
	"use strict";

	const DEFAULTS = { maxNodes: 14, maxEdges: 16 };

	function fileBasename(path) {
		const p = String(path || "").replace(/\\/g, "/");
		const i = p.lastIndexOf("/");
		return i >= 0 ? p.slice(i + 1) : p || "—";
	}

	function fileDir(path) {
		const p = String(path || "").replace(/\\/g, "/");
		const i = p.lastIndexOf("/");
		return i >= 0 ? p.slice(0, i) : "";
	}

	function shortDir(path) {
		const dir = fileDir(path);
		if (!dir) return "";
		const parts = dir.split("/").filter(Boolean);
		if (parts.length <= 2) return parts.join("/");
		return parts.slice(-2).join("/");
	}

	function normPath(path) {
		return String(path || "").replace(/\\/g, "/");
	}

	function layerRank(path) {
		const p = normPath(path).toLowerCase();
		if (p.includes("/handlers/") || p.includes("/handler/")) return 0;
		if (p.includes("/services/") || p.includes("/service/")) return 1;
		if (p.includes("/repositories/") || p.includes("/models/")) return 2;
		if (p.includes("/tests/") || p.startsWith("tests/")) return 4;
		return 3;
	}

	function uniqueEdges(list) {
		const seen = new Set();
		const out = [];
		list.forEach((e) => {
			const key = e.from + "\0" + e.to;
			if (seen.has(key)) return;
			seen.add(key);
			out.push(e);
		});
		return out;
	}

	function buildWiringSubgraph(graph, opts) {
		const maxNodes = (opts && opts.maxNodes) || DEFAULTS.maxNodes;
		const maxEdges = (opts && opts.maxEdges) || DEFAULTS.maxEdges;
		const deps = Array.isArray(graph && graph.dependencies) ? graph.dependencies : [];
		const resolved = uniqueEdges(
			deps
				.map((d) => ({
					from: normPath(d.sourceFile),
					to: normPath(d.targetFile),
					label: d.kind === "tests" ? "tests" : "depends"
				}))
				.filter((e) => e.from && e.to && e.from !== e.to)
		);

		const degree = new Map();
		resolved.forEach((e) => {
			degree.set(e.from, (degree.get(e.from) || 0) + 1);
			degree.set(e.to, (degree.get(e.to) || 0) + 1);
		});

		const ranked = resolved.slice().sort((a, b) => {
			const layerA = Math.abs(layerRank(a.from) - layerRank(a.to));
			const layerB = Math.abs(layerRank(b.from) - layerRank(b.to));
			if (layerA !== layerB) return layerB - layerA;
			const degA = (degree.get(a.from) || 0) + (degree.get(a.to) || 0);
			const degB = (degree.get(b.from) || 0) + (degree.get(b.to) || 0);
			return degB - degA;
		});

		// Grow a connected, readable set: prefer edges that add new nodes first.
		const nodesFinal = new Set();
		const edgesFinal = [];
		const tryAdd = (e, requireGrowth) => {
			if (edgesFinal.length >= maxEdges) return false;
			const hasFrom = nodesFinal.has(e.from);
			const hasTo = nodesFinal.has(e.to);
			const growth = (hasFrom ? 0 : 1) + (hasTo ? 0 : 1);
			if (requireGrowth && growth === 0) return false;
			if (nodesFinal.size + growth > maxNodes) return false;
			if (!nodesFinal.size && growth < 2) return false;
			if (nodesFinal.size && growth === 2 && nodesFinal.size + 2 > maxNodes) return false;
			// Keep the subgraph connected after the first edge.
			if (nodesFinal.size && growth === 2) return false;
			nodesFinal.add(e.from);
			nodesFinal.add(e.to);
			edgesFinal.push(e);
			return true;
		};

		ranked.forEach((e) => tryAdd(e, true));
		ranked.forEach((e) => {
			if (nodesFinal.has(e.from) && nodesFinal.has(e.to)) tryAdd(e, false);
		});
		// If still tiny, allow a second component.
		if (nodesFinal.size < Math.min(8, maxNodes)) {
			ranked.forEach((e) => {
				if (edgesFinal.length >= maxEdges) return;
				const growth = (nodesFinal.has(e.from) ? 0 : 1) + (nodesFinal.has(e.to) ? 0 : 1);
				if (!growth) return;
				if (nodesFinal.size + growth > maxNodes) return;
				nodesFinal.add(e.from);
				nodesFinal.add(e.to);
				edgesFinal.push(e);
			});
		}

		return {
			mode: "wiring",
			nodes: [...nodesFinal].map((path) => ({
				id: path,
				path,
				role: "file",
				layer: layerRank(path)
			})),
			edges: edgesFinal,
			truncated: nodesFinal.size < degree.size || edgesFinal.length < resolved.length,
			totalNodes: degree.size,
			totalEdges: resolved.length
		};
	}

	function buildImpactSubgraph(graph, opts) {
		const maxNodes = (opts && opts.maxNodes) || DEFAULTS.maxNodes;
		const maxEdges = (opts && opts.maxEdges) || DEFAULTS.maxEdges;
		const impacts = Array.isArray(graph && graph.impacts) ? graph.impacts : [];
		const edges = uniqueEdges(
			impacts
				.map((item) => ({
					from: normPath(item.changedFile),
					to: normPath(item.impactedFile),
					label: "impact"
				}))
				.filter((e) => e.from && e.to && e.from !== e.to)
		);
		const nodes = new Map();
		edges.forEach((e) => {
			if (!nodes.has(e.from)) nodes.set(e.from, { id: e.from, path: e.from, role: "seed" });
			if (!nodes.has(e.to)) nodes.set(e.to, { id: e.to, path: e.to, role: "impact" });
		});

		const edgesFinal = [];
		const nodesFinal = new Map();
		for (const e of edges) {
			if (edgesFinal.length >= maxEdges) break;
			const growth = (nodesFinal.has(e.from) ? 0 : 1) + (nodesFinal.has(e.to) ? 0 : 1);
			if (nodesFinal.size + growth > maxNodes) continue;
			nodesFinal.set(e.from, nodes.get(e.from));
			nodesFinal.set(e.to, nodes.get(e.to));
			edgesFinal.push(e);
		}

		return {
			mode: "impact",
			nodes: [...nodesFinal.values()],
			edges: edgesFinal,
			truncated: nodesFinal.size < nodes.size || edgesFinal.length < edges.length,
			totalNodes: nodes.size,
			totalEdges: edges.length
		};
	}

	function pickArchitectureSubgraph(graph, reviewScope, opts) {
		const scope = String(reviewScope || "full").toLowerCase();
		const isDiff = scope === "working-tree"
			|| scope === "revision-diff"
			|| scope.indexOf("working-tree") === 0
			|| scope.indexOf("revision-diff") === 0;
		if (isDiff) {
			const impact = buildImpactSubgraph(graph, opts);
			if (impact.edges.length) return impact;
		}
		return buildWiringSubgraph(graph, opts);
	}

	function topoDepths(nodes, edges) {
		const depth = new Map();
		nodes.forEach((n) => depth.set(n.id, typeof n.layer === "number" ? n.layer : layerRank(n.path)));
		for (let pass = 0; pass < nodes.length + 2; pass++) {
			let changed = false;
			edges.forEach((e) => {
				const next = (depth.get(e.from) || 0) + 1;
				if (next > (depth.get(e.to) || 0)) {
					depth.set(e.to, next);
					changed = true;
				}
			});
			if (!changed) break;
		}
		// Normalize to 0..n contiguous columns.
		const vals = [...new Set([...depth.values()])].sort((a, b) => a - b);
		const remap = new Map(vals.map((v, i) => [v, i]));
		depth.forEach((v, k) => depth.set(k, remap.get(v) || 0));
		return depth;
	}

	function layoutFlowPositions(subgraph, opts) {
		const nodeWidth = (opts && opts.nodeWidth) || 196;
		const nodeHeight = (opts && opts.nodeHeight) || 58;
		const gapX = (opts && opts.gapX) || 80;
		const gapY = (opts && opts.gapY) || 20;
		const pad = (opts && opts.pad) || 24;
		const nodes = (subgraph && subgraph.nodes) || [];
		const edges = (subgraph && subgraph.edges) || [];

		const columns = new Map();
		if (subgraph.mode === "impact") {
			nodes.forEach((n) => {
				const col = n.role === "seed" ? 0 : 1;
				if (!columns.has(col)) columns.set(col, []);
				columns.get(col).push(n);
			});
		} else {
			const depths = topoDepths(nodes, edges);
			nodes.forEach((n) => {
				const col = depths.get(n.id) || 0;
				if (!columns.has(col)) columns.set(col, []);
				columns.get(col).push(n);
			});
		}

		const colKeys = [...columns.keys()].sort((a, b) => a - b);
		const maxPerCol = 4;
		const visualCols = [];
		colKeys.forEach((col) => {
			const list = columns.get(col).slice().sort((a, b) =>
				fileBasename(a.path).localeCompare(fileBasename(b.path))
			);
			for (let i = 0; i < list.length; i += maxPerCol) {
				visualCols.push(list.slice(i, i + maxPerCol));
			}
		});
		if (!visualCols.length) visualCols.push([]);

		const maxRows = Math.max(1, ...visualCols.map((list) => Math.max(1, list.length)));
		const stackHeight = maxRows * nodeHeight + Math.max(0, maxRows - 1) * gapY;
		const positioned = [];
		visualCols.forEach((list, colIndex) => {
			const colHeight = list.length * nodeHeight + Math.max(0, list.length - 1) * gapY;
			const offsetY = Math.max(0, (stackHeight - colHeight) / 2);
			list.forEach((n, row) => {
				positioned.push({
					...n,
					x: pad + colIndex * (nodeWidth + gapX),
					y: pad + offsetY + row * (nodeHeight + gapY),
					w: nodeWidth,
					h: nodeHeight
				});
			});
		});

		return {
			width: pad * 2
				+ Math.max(1, visualCols.length) * nodeWidth
				+ Math.max(0, visualCols.length - 1) * gapX,
			height: pad * 2 + stackHeight,
			nodes: positioned,
			edges: edges.map((e) => ({ ...e }))
		};
	}

	return {
		fileBasename,
		fileDir,
		shortDir,
		normPath,
		buildWiringSubgraph,
		buildImpactSubgraph,
		pickArchitectureSubgraph,
		layoutFlowPositions
	};
});
