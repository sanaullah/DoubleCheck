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
		// File / neighbourhood detail cards
		detailNodeWidth: 236,
		detailNodeHeight: 92,
		focusHubScale: 1.38,
		detailGapX: 56,
		detailGapY: 28,
		// Overview (project-module) cards — fewer, larger, quieter
		overviewNodeWidth: 320,
		overviewNodeHeight: 140,
		overviewGapX: 40,
		overviewGapY: 32,
		overviewMaxSummaryChars: 140,
		overviewMaxSummaryLines: 2,
		overviewTopN: 18
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
		const detail = !!o.detail && !overview;
		const widthFallback = overview
			? DEFAULTS.overviewNodeWidth
			: detail
				? DEFAULTS.detailNodeWidth
				: DEFAULTS.nodeWidth;
		const heightFallback = overview
			? DEFAULTS.overviewNodeHeight
			: detail
				? DEFAULTS.detailNodeHeight
				: DEFAULTS.nodeHeight;
		const gapXFallback = overview
			? DEFAULTS.overviewGapX
			: detail
				? DEFAULTS.detailGapX
				: DEFAULTS.gapX;
		const gapYFallback = overview
			? DEFAULTS.overviewGapY
			: detail
				? DEFAULTS.detailGapY
				: DEFAULTS.gapY;
		return {
			maxNodes: Number(opt(o, "maxNodes", DEFAULTS.maxNodes)) || DEFAULTS.maxNodes,
			maxEdges: Number(opt(o, "maxEdges", DEFAULTS.maxEdges)) || DEFAULTS.maxEdges,
			nodeWidth: Number(opt(o, "nodeWidth", widthFallback)) || widthFallback,
			nodeHeight: Number(opt(o, "nodeHeight", heightFallback)) || heightFallback,
			gapX: Number(opt(o, "gapX", gapXFallback)) || gapXFallback,
			gapY: Number(opt(o, "gapY", gapYFallback)) || gapYFallback,
			pad: Number(opt(o, "pad", DEFAULTS.pad)) || DEFAULTS.pad,
			includeTests: o.includeTests !== false,
			kinds: Array.isArray(o.kinds) ? o.kinds : null,
			overview: overview,
			detail: detail,
			summaries: Array.isArray(o.summaries) ? o.summaries : null,
			showAll: !!o.showAll,
			topN: Number(opt(o, "topN", DEFAULTS.overviewTopN)) || DEFAULTS.overviewTopN,
			focusHubScale: Number(opt(o, "focusHubScale", DEFAULTS.focusHubScale)) || DEFAULTS.focusHubScale
		};
	}

	/** Deterministic complexity badge for overview cards. */
	function complexityOf(cluster) {
		const files = Number(cluster && cluster.fileCount) || 0;
		const crossing = Number(cluster && (cluster.crossingEdges != null ? cluster.crossingEdges : cluster.crossings)) || 0;
		const symbols = Number(cluster && cluster.symbolCount) || 0;
		const inCycle = !!(cluster && (cluster.inCycle || cluster.hasCycle));
		const score = files + crossing * 3 + Math.floor(symbols / 20) + (inCycle ? 8 : 0);
		if (score >= 40 || (inCycle && files >= 8)) return "complex";
		if (score >= 12) return "moderate";
		return "simple";
	}

	/** Deterministic complexity for file / neighbourhood cards. */
	function fileComplexityOf(node) {
		const fanIn = Number(node && node.fanIn) || 0;
		const fanOut = Number(node && node.fanOut) || 0;
		const hot = Number(node && node.hotspotScore) || 0;
		const inCycle = !!(node && node.inCycle);
		const score = fanIn * 2 + fanOut + Math.floor(hot / 10) + (inCycle ? 10 : 0);
		if (score >= 28 || hot >= 50) return "complex";
		if (score >= 10 || hot >= 25) return "moderate";
		return "simple";
	}

	function fileRoleChip(node) {
		if (node && node.external) return "outside";
		const role = String((node && node.role) || "")
			.toLowerCase()
			.trim();
		if (!role || role === "unknown") return "";
		return role;
	}

	function isFocusNode(node, view) {
		if (!node) return false;
		if (node.role === "focus") return true;
		const focusId = view && view.focus ? normId(view.focus) : "";
		return !!(focusId && (idsEqual(node.id, focusId) || idsEqual(node.path, focusId)));
	}

	function nodeBoxSize(node, cfg, view) {
		const baseW = cfg.nodeWidth;
		const baseH = cfg.nodeHeight;
		const focusMode = !!(view && view.mode === "focus");
		if (focusMode && isFocusNode(node, view)) {
			const scale = Number(cfg.focusHubScale) || DEFAULTS.focusHubScale;
			return {
				w: Math.round(baseW * scale),
				h: Math.round(baseH * scale)
			};
		}
		return { w: baseW, h: baseH };
	}

	function fileTooltip(n) {
		const path = normPath((n && (n.path || n.id)) || "");
		const parts = [];
		if (path) parts.push(path);
		if (n && n.external) parts.push("outside module");
		const role = fileRoleChip(n);
		if (role) parts.push("role: " + role);
		const complexity = (n && n.complexity) || fileComplexityOf(n || {});
		if (complexity) parts.push("complexity: " + complexity);
		return parts.join(" · ");
	}

	function edgeTooltip(e) {
		const kind = (e && (e.kind || e.label)) || "depends";
		const from = (e && (e.sourceFile || e.from)) || "";
		const to = (e && (e.targetFile || e.to)) || "";
		const parts = [String(kind) + ": " + from + " → " + to];
		if (e && e.line) parts.push("line " + e.line);
		if (e && e.evidence) parts.push(String(e.evidence).slice(0, 180));
		if (e && e.crossing) parts.push("crosses module boundary");
		return parts.join(" · ");
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
		const label = (cluster && (cluster.label || cluster.name || cluster.key)) || "Module";
		const files =
			Number(cluster && cluster.fileCount) ||
			(Array.isArray(cluster && cluster.filePaths) ? cluster.filePaths.length : 0);
		const layer = layerLabelOf(cluster, 0);
		if (Array.isArray(summaries)) {
			const hit = summaries.find(
				(s) =>
					s &&
					(s.clusterId === id ||
						s.nodeId === id ||
						(s.title && s.title === (cluster.label || cluster.name)))
			);
			if (hit && hit.text) return { text: String(hit.text), origin: "ai" };
		}
		if (cluster && cluster.summary) return { text: String(cluster.summary), origin: "provided" };
		const fileBit = files === 1 ? "1 file" : files + " files";
		return {
			text: label + " — " + fileBit + " in the " + layer + " area.",
			origin: "deterministic"
		};
	}

	function overviewScore(cluster) {
		const files =
			Number(cluster && cluster.fileCount) ||
			(Array.isArray(cluster && cluster.filePaths) ? cluster.filePaths.length : 0);
		const crossing = Number(cluster && cluster.crossingEdges) || 0;
		const symbols = Number(cluster && cluster.symbolCount) || 0;
		const inCycle = !!(cluster && (cluster.inCycle || cluster.hasCycle));
		return files * 4 + crossing * 3 + Math.floor(symbols / 10) + (inCycle ? 20 : 0);
	}

	/** Rank clusters for project Overview (largest / most connected first). */
	function selectTopClusters(clusters, limit) {
		const list = Array.isArray(clusters) ? clusters.slice() : [];
		const capped = Math.max(1, Number(limit) || DEFAULTS.overviewTopN);
		list.sort((a, b) => {
			const diff = overviewScore(b) - overviewScore(a);
			if (diff !== 0) return diff;
			return cmpStable(a.label || a.id || "", b.label || b.id || "");
		});
		return list.slice(0, capped);
	}

	/** Project landing copy for the Overview strip (deterministic; AI optional). */
	function projectOverviewCopy(snapshot, opts) {
		const o = opts || {};
		const totals = (snapshot && snapshot.totals) || {};
		const clusters = Array.isArray(snapshot && snapshot.clusters) ? snapshot.clusters : [];
		const files = Number(totals.files != null ? totals.files : totals.nodes) || 0;
		const moduleCount = Number(totals.clusters != null ? totals.clusters : clusters.length) || 0;
		const cycles = Number(totals.cycles != null ? totals.cycles : (snapshot.cycles || []).length) || 0;
		const name = String(o.projectName || "Project").trim() || "Project";
		const summaries = o.summaries || (o.narrative && o.narrative.summaries) || null;
		let blurb = name + " — " + files + " files across " + moduleCount + " modules.";
		if (cycles) {
			blurb += " " + cycles + " dependency cycle" + (cycles === 1 ? "" : "s") + " flagged.";
		}
		if (Array.isArray(summaries) && summaries.length && o.preferAi !== false) {
			const featured = selectTopClusters(clusters, 1)[0];
			const fid = featured ? String(featured.id || featured.key || "") : "";
			const hit = summaries.find((s) => s && s.clusterId === fid && s.text);
			if (hit && hit.text) {
				blurb = String(hit.text).replace(/\s+/g, " ").trim();
				if (blurb.length > 220) blurb = blurb.slice(0, 217).replace(/\s+\S*$/, "") + "…";
			}
		}
		return {
			title: name,
			blurb: blurb,
			files: files,
			modules: moduleCount,
			cycles: cycles,
			shown: Number(o.shown) || 0,
			totalModules: moduleCount
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

	/** Stable graph id: forward-slash + lowercase (matches snapshot node.id). */
	// Bare localeCompare uses the runtime's default collation, so the same snapshot
	// laid out on two machines with different locales produced a different node
	// order and therefore different coordinates. Ordering is part of the
	// deterministic contract, so it must not depend on where it runs.
	// Colour must not be the only differentiator, and an SVG shape carries no
	// accessible name on its own. Role and counts are what a reader needs spoken.
	function ariaLabelFor(node) {
		if (!node) return "graph node";
		const parts = [];
		parts.push(String(node.label || node.path || node.id || "node"));
		if (node.role) parts.push(String(node.role));
		if (node.kind && node.kind !== "file") parts.push(String(node.kind));
		const fanIn = Number(node.fanIn);
		const fanOut = Number(node.fanOut);
		if (Number.isFinite(fanIn) || Number.isFinite(fanOut)) {
			parts.push("called by " + (Number.isFinite(fanIn) ? fanIn : 0) + ", calls " + (Number.isFinite(fanOut) ? fanOut : 0));
		}
		return parts.join(", ");
	}

	function cmpStable(a, b) {
		const left = String(a == null ? "" : a);
		const right = String(b == null ? "" : b);
		return left < right ? -1 : left > right ? 1 : 0;
	}

	function normId(path) {
		return normPath(path).toLowerCase();
	}

	function idsEqual(a, b) {
		return normId(a) === normId(b) && !!normId(a);
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
		const seen = new Map();
		const out = [];
		(list || []).forEach((e) => {
			const rawFrom = e.from || e.sourceFile || e.source || "";
			const rawTo = e.to || e.targetFile || "";
			const from = normId(rawFrom);
			const to = normId(rawTo);
			if (!from || !to || from === to) return;
			const kind = String(e.kind || e.label || "");
			const key = from + "\0" + to + "\0" + kind;
			if (seen.has(key)) {
				const existing = seen.get(key);
				if (Array.isArray(e.kinds)) {
					existing.kinds = Array.from(new Set([...(existing.kinds || []), ...e.kinds.map(String)])).sort();
				}
				if (e.evidence && !existing.evidence) existing.evidence = String(e.evidence);
				if (e.line != null && (existing.line == null || existing.line === 0)) {
					existing.line = Number(e.line) || 0;
				}
				const add = e.weight != null ? Number(e.weight) : e.edgeCount != null ? Number(e.edgeCount) : 1;
				existing.edgeCount = (Number(existing.edgeCount) || 1) + (Number.isFinite(add) ? add : 1);
				if (existing.weight != null || e.weight != null) {
					existing.weight = (Number(existing.weight) || 0) + (Number(e.weight) || 0);
				}
				return;
			}
			const edge = {
				from,
				to,
				kind,
				weight: e.weight,
				edgeCount: e.edgeCount != null ? e.edgeCount : 1,
				label: e.label || kind || "",
				evidence: e.evidence != null ? String(e.evidence) : "",
				line: e.line != null ? Number(e.line) || 0 : null,
				target: e.target != null ? String(e.target) : "",
				sourceFile: normPath(e.sourceFile || rawFrom),
				targetFile: normPath(e.targetFile || rawTo),
				crossing: !!e.crossing,
				id: e.id != null ? String(e.id) : ""
			};
			if (Array.isArray(e.kinds)) edge.kinds = Array.from(new Set(e.kinds.map(String))).sort();
			seen.set(key, edge);
			out.push(edge);
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

	// Degree-of-interest: a priori importance minus distance from the focus.
	//
	// Furnas' DOI, adapted from trees to graphs. It replaces a flat top-N slice,
	// which cuts by position in the array and can therefore drop the very
	// neighbours that explain the node you are looking at. Interest is:
	//
	//     structural importance  −  hops from the focus
	//
	// so the focus and its immediate neighbourhood always survive, and what falls
	// off the end is genuinely peripheral rather than merely late.
	//
	// Deterministic: importance comes from stored fan-in/out, distance from a BFS
	// over the edge list in its existing order, and ties break on id.
	function degreeOfInterest(nodes, edges, focusId) {
		const adjacency = new Map();
		const link = (a, b) => {
			if (!adjacency.has(a)) adjacency.set(a, []);
			adjacency.get(a).push(b);
		};
		edges.forEach((e) => {
			const from = normId(e.from);
			const to = normId(e.to);
			if (!from || !to) return;
			link(from, to);
			link(to, from);
		});

		const distance = new Map();
		const focus = normId(focusId);
		if (focus) {
			distance.set(focus, 0);
			let frontier = [focus];
			let hop = 0;
			while (frontier.length && hop < 6) {
				hop++;
				const next = [];
				for (const id of frontier) {
					for (const neighbour of adjacency.get(id) || []) {
						if (distance.has(neighbour)) continue;
						distance.set(neighbour, hop);
						next.push(neighbour);
					}
				}
				frontier = next;
			}
		}

		return nodes.map((n) => {
			const id = normId(n.id || n.path);
			const importance = (Number(n.hotspotScore) || 0) + (Number(n.fanIn) || 0) + 0.5 * (Number(n.fanOut) || 0);
			// Unreached nodes sit beyond the walk rather than at distance zero.
			const hops = distance.has(id) ? distance.get(id) : focus ? 99 : 0;
			return { node: n, id, interest: importance - hops * 4 };
		});
	}

	function capGraph(nodes, edges, maxNodes, maxEdges, focusId) {
		const totalNodes = nodes.length;
		const totalEdges = edges.length;
		let selectedNodes = nodes;
		let selectedEdges = edges;
		let truncated = false;

		if (selectedNodes.length > maxNodes) {
			const scored = degreeOfInterest(selectedNodes, edges, focusId);
			scored.sort((a, b) => {
				if (a.interest !== b.interest) return b.interest - a.interest;
				return cmpStable(a.id, b.id);
			});
			const keep = new Set(scored.slice(0, maxNodes).map((entry) => entry.id));
			// Restore the incoming order so layout and specs stay comparable; DOI
			// decides membership, not arrangement.
			selectedNodes = selectedNodes.filter((n) => keep.has(normId(n.id || n.path)));
			truncated = true;
		}
		const idSet = new Set(selectedNodes.map((n) => normId(n.id || n.path)));
		selectedEdges = selectedEdges.filter((e) => idSet.has(normId(e.from)) && idSet.has(normId(e.to)));
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
		const allClusters = Array.isArray(snapshot && snapshot.clusters) ? snapshot.clusters : [];
		const clusterEdges = Array.isArray(snapshot && snapshot.clusterEdges) ? snapshot.clusterEdges : [];
		const summaries = cfg.summaries;
		const clusters = cfg.showAll ? allClusters : selectTopClusters(allClusters, cfg.topN);

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

		const idSet = new Set(nodes.map((n) => normId(n.id)));
		const edges = uniqueEdges(clusterEdges).filter((e) => idSet.has(normId(e.from)) && idSet.has(normId(e.to)));
		const capped = capGraph(nodes, edges, cfg.maxNodes, cfg.maxEdges, opts && opts.focus);
		return Object.assign(
			{
				mode: "cluster",
				overview: true,
				totalClusters: allClusters.length,
				shownClusters: capped.nodes.length,
				overviewCapped: !cfg.showAll && capped.nodes.length < allClusters.length
			},
			capped
		);
	}

	function buildFileView(snapshot, opts) {
		const cfg = mergeDefaults(Object.assign({}, opts, { detail: true, overview: false }));
		const raw = Array.isArray(snapshot && snapshot.nodes) ? snapshot.nodes : [];
		let nodes = raw.map((n, index) => {
			const path = normPath(n.path || n.id || "");
			const id = normId(n.id || path) || "node-" + index;
			return {
				id: id,
				path: path || id,
				label: n.label || fileBasename(path),
				kind: n.kind || "file",
				layer: numericLayer(n),
				layerLabel: typeof n.layer === "string" ? n.layer : n.component || "",
				component: n.component || n.layer || "",
				clusterId: n.clusterId || "",
				fanIn: n.fanIn || 0,
				fanOut: n.fanOut || 0,
				symbolCount: n.symbolCount || 0,
				inCycle: !!n.inCycle,
				hotspotScore: n.hotspotScore || 0,
				role: n.role || "",
				external: !!n.external,
				complexity: n.complexity || ""
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

		// Stub outside-module endpoints referenced by crossing edges.
		const known = new Set(nodes.map((n) => normId(n.id)));
		filteredEdges.forEach((e) => {
			[e.from, e.to].forEach((endId) => {
				const key = normId(endId);
				if (!key || known.has(key)) return;
				known.add(key);
				const path = normPath(
					normId(e.from) === key ? e.sourceFile || e.from : e.targetFile || e.to
				);
				nodes.push({
					id: key,
					path: path || key,
					label: fileBasename(path || key),
					kind: "file",
					layer: 3,
					layerLabel: "outside",
					component: "",
					clusterId: "",
					fanIn: 0,
					fanOut: 0,
					symbolCount: 0,
					inCycle: false,
					hotspotScore: 0,
					role: "outside",
					external: true,
					complexity: "simple"
				});
			});
		});

		nodes.forEach((n) => {
			if (!n.complexity) n.complexity = fileComplexityOf(n);
		});

		const capped = capGraph(nodes, filteredEdges, cfg.maxNodes, cfg.maxEdges, (snapshot && snapshot.focus) || (opts && opts.focus));
		return Object.assign({ mode: "file", detail: true }, capped);
	}

	function buildFocusView(subgraph, opts) {
		const cfg = mergeDefaults(Object.assign({}, opts, { detail: true, overview: false }));
		const rawNodes = Array.isArray(subgraph && subgraph.nodes) ? subgraph.nodes : [];
		const rawEdges = Array.isArray(subgraph && subgraph.edges) ? subgraph.edges : [];
		const focusId = subgraph && subgraph.focus ? normId(subgraph.focus) : "";

		const nodes = rawNodes.map((n, index) => {
			const path = normPath(n.path || n.id || "");
			const id = normId(n.id || path) || "node-" + index;
			return {
				id: id,
				path: path || id,
				label: n.label || fileBasename(path),
				kind: n.kind || "file",
				layer: numericLayer(n),
				layerLabel: typeof n.layer === "string" ? n.layer : n.component || "",
				clusterId: n.clusterId || "",
				fanIn: n.fanIn || 0,
				fanOut: n.fanOut || 0,
				symbolCount: n.symbolCount || 0,
				inCycle: !!n.inCycle,
				hotspotScore: n.hotspotScore || 0,
				role: n.role || (idsEqual(id, focusId) || idsEqual(path, focusId) ? "focus" : "neighbor")
			};
		});
		const edges = uniqueEdges(rawEdges);
		const capped = capGraph(nodes, edges, cfg.maxNodes, cfg.maxEdges, opts && opts.focus);
		return Object.assign(
			{
				mode: "focus",
				detail: true,
				focus: focusId
			},
			capped
		);
	}

	/**
	 * Draw the symbol level of one file.
	 *
	 * The symbol level was fetched, listed and searchable but never rendered, so
	 * "what calls this function" was answerable only as a side-panel list. The
	 * payload from /codegraph/graph?level=symbol is already nodes and edges; it
	 * needs shaping, not new data.
	 *
	 * Symbols are labelled by name rather than by path — every node here shares
	 * one file, so a path label would repeat the same string on every box — and
	 * ordered by line so the drawing follows the source.
	 */
	function buildSymbolView(payload, opts) {
		const cfg = mergeDefaults(Object.assign({}, opts, { detail: true, overview: false }));
		const rawNodes = Array.isArray(payload && payload.nodes) ? payload.nodes : [];
		const rawEdges = Array.isArray(payload && payload.edges) ? payload.edges : [];
		const focusId = payload && payload.focus ? normId(payload.focus) : "";

		const ordered = rawNodes.slice().sort((a, b) => {
			const byLine = (Number(a.line) || 0) - (Number(b.line) || 0);
			if (byLine !== 0) return byLine;
			return String(a.symbolName || "").localeCompare(String(b.symbolName || ""), "en");
		});

		const nodes = ordered.map((n, index) => {
			const id = normId(n.id || n.path || "") || "symbol-" + index;
			const name = String(n.symbolName || "").trim();
			return {
				id: id,
				path: normPath(n.path || ""),
				label: name || fileBasename(normPath(n.path || "")) || id,
				kind: n.kind || "function",
				layer: numericLayer(n),
				layerLabel: String(n.kind || "symbol"),
				clusterId: "",
				fanIn: n.fanIn || 0,
				fanOut: n.fanOut || 0,
				symbolCount: 0,
				line: Number(n.line) || 0,
				inCycle: false,
				hotspotScore: n.hotspot || 0,
				role: n.role || (idsEqual(id, focusId) ? "focus" : "symbol")
			};
		});

		const capped = capGraph(nodes, uniqueEdges(rawEdges), cfg.maxNodes, cfg.maxEdges, opts && opts.focus);
		return Object.assign({ mode: "symbol", detail: true, focus: focusId }, capped);
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
		const detail = !!(view && view.detail) || !!(opts && opts.detail);
		const cfg = mergeDefaults(
			Object.assign({}, opts, { overview: overview || !!(opts && opts.overview), detail: detail && !overview })
		);
		const nodes = (view && view.nodes) || [];
		const edges = (view && view.edges) || [];
		const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, nodes.length))));
		const positioned = nodes.map((n, i) => {
			const col = i % cols;
			const row = Math.floor(i / cols);
			const box = nodeBoxSize(n, cfg, view);
			return Object.assign({}, n, {
				x: cfg.pad + col * (cfg.nodeWidth + cfg.gapX),
				y: cfg.pad + row * (cfg.nodeHeight + cfg.gapY),
				w: box.w,
				h: box.h
			});
		});
		const nodeById = new Map(positioned.map((n) => [normId(n.id), n]));
		const graphEdges = edges.filter((e) => nodeById.has(normId(e.from)) && nodeById.has(normId(e.to)));
		// Fixed-seed, fixed-iteration relaxation: overview stays reproducible while
		// dense connected modules stop looking like an arbitrary alphabetic grid.
		for (let iteration = 0; iteration < 14; iteration++) {
			const delta = positioned.map(() => ({ x: 0, y: 0 }));
			for (let i = 0; i < positioned.length; i++) {
				for (let j = i + 1; j < positioned.length; j++) {
					const a = positioned[i];
					const b = positioned[j];
					const ax = a.x + a.w / 2;
					const ay = a.y + a.h / 2;
					const bx = b.x + b.w / 2;
					const by = b.y + b.h / 2;
					const dx = ax - bx || (i < j ? 1 : -1);
					const dy = ay - by || (i < j ? 1 : -1);
					const distance = Math.max(24, Math.hypot(dx, dy));
					const force = Math.min(8, 1800 / (distance * distance));
					delta[i].x += (dx / distance) * force;
					delta[i].y += (dy / distance) * force;
					delta[j].x -= (dx / distance) * force;
					delta[j].y -= (dy / distance) * force;
				}
			}
			graphEdges.forEach((edge) => {
				const aIndex = positioned.indexOf(nodeById.get(normId(edge.from)));
				const bIndex = positioned.indexOf(nodeById.get(normId(edge.to)));
				if (aIndex < 0 || bIndex < 0) return;
				const a = positioned[aIndex];
				const b = positioned[bIndex];
				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const distance = Math.max(1, Math.hypot(dx, dy));
				const force = Math.min(5, (distance - cfg.gapX - cfg.nodeWidth) * 0.004);
				delta[aIndex].x += (dx / distance) * force;
				delta[aIndex].y += (dy / distance) * force;
				delta[bIndex].x -= (dx / distance) * force;
				delta[bIndex].y -= (dy / distance) * force;
			});
			positioned.forEach((node, index) => {
				node.x = Math.max(cfg.pad, node.x + delta[index].x);
				node.y = Math.max(cfg.pad, node.y + delta[index].y);
			});
		}
		const bounds = layoutBounds(positioned, cfg.pad);
		return {
			width: bounds.width,
			height: bounds.height,
			nodes: positioned,
			edges: edges.map((e) => Object.assign({}, e)),
			mode: (view && view.mode) || "cluster",
			overview: overview,
			detail: !overview && detail
		};
	}

	function layoutLayered(view, opts) {
		const overview = !!(view && (view.overview || view.mode === "cluster")) || !!(opts && opts.overview);
		const detail = !!(view && view.detail) || !!(opts && opts.detail);
		const cfg = mergeDefaults(Object.assign({}, opts, { overview: overview, detail: detail && !overview }));
		const nodes = (view && view.nodes) || [];
		const edges = (view && view.edges) || [];
		const columns = new Map();

		nodes.forEach((n) => {
			const layer = numericLayer(n);
			if (!columns.has(layer)) columns.set(layer, []);
			columns.get(layer).push(n);
		});

		const colKeys = [...columns.keys()].sort((a, b) => a - b);
		const edgePairs = edges.map((e) => ({ from: normId(e.from), to: normId(e.to) }));
		const orderedColumns = new Map();
		colKeys.forEach((layer) => orderedColumns.set(layer, columns.get(layer).slice().sort((a, b) => cmpStable(a.label || a.path || a.id, b.label || b.path || b.id))));
		const positionMap = () => {
			const map = new Map();
			colKeys.forEach((layer) => orderedColumns.get(layer).forEach((node, index) => map.set(normId(node.id), index)));
			return map;
		};
		// Barycenter sweeps reduce crossings without introducing layout randomness.
		for (let sweep = 0; sweep < 3; sweep++) {
			for (let columnIndex = 1; columnIndex < colKeys.length; columnIndex++) {
				const previous = new Set(orderedColumns.get(colKeys[columnIndex - 1]).map((n) => normId(n.id)));
				const positions = positionMap();
				orderedColumns.get(colKeys[columnIndex]).sort((a, b) => {
					const mean = (node) => {
						const neighbors = edgePairs.filter((edge) => edge.to === normId(node.id) && previous.has(edge.from)).map((edge) => positions.get(edge.from));
						return neighbors.length ? neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length : Number.POSITIVE_INFINITY;
					};
					const byMean = mean(a) - mean(b);
					return Number.isFinite(byMean) && byMean !== 0 ? byMean : cmpStable(a.label || a.path || a.id, b.label || b.path || b.id);
				});
			}
			for (let columnIndex = colKeys.length - 2; columnIndex >= 0; columnIndex--) {
				const next = new Set(orderedColumns.get(colKeys[columnIndex + 1]).map((n) => normId(n.id)));
				const positions = positionMap();
				orderedColumns.get(colKeys[columnIndex]).sort((a, b) => {
					const mean = (node) => {
						const neighbors = edgePairs.filter((edge) => edge.from === normId(node.id) && next.has(edge.to)).map((edge) => positions.get(edge.to));
						return neighbors.length ? neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length : Number.POSITIVE_INFINITY;
					};
					const byMean = mean(a) - mean(b);
					return Number.isFinite(byMean) && byMean !== 0 ? byMean : cmpStable(a.label || a.path || a.id, b.label || b.path || b.id);
				});
			}
		}
		const positioned = [];
		colKeys.forEach((layer, colIndex) => {
			const list = orderedColumns.get(layer);
			list.forEach((n, row) => {
				positioned.push(
					Object.assign({}, n, {
						layer,
						x: cfg.pad + colIndex * (cfg.nodeWidth + cfg.gapX),
						y: cfg.pad + row * (cfg.nodeHeight + cfg.gapY),
						w: nodeBoxSize(n, cfg, view).w,
						h: nodeBoxSize(n, cfg, view).h
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
			overview: overview,
			detail: !overview && detail
		};
	}

	const SWIMLANE_ORDER = {
		client: 0,
		"entry-points": 1,
		entry: 1,
		orchestrator: 2,
		domain: 3,
		view: 4,
		persistence: 5,
		integration: 6,
		configuration: 7,
		config: 7,
		test: 8,
		tests: 8,
		other: 9,
		unknown: 9
	};

	function swimlaneRole(node) {
		const id = normId((node && (node.id || node.path)) || "");
		if (id.indexOf("route:") === 0) return "entry";
		if (id.indexOf("table:") === 0) return "persistence";
		if (id.indexOf("http:") === 0 || id.indexOf("schedule:") === 0) return "integration";
		const role = String((node && (node.role || node.layerLabel || node.layer)) || "")
			.toLowerCase()
			.replace(/\s+/g, "-")
			.trim();
		return role || "unknown";
	}

	function swimlaneLabel(role) {
		return String(role || "unknown")
			.replace(/-/g, " ")
			.replace(/\b\w/g, (letter) => letter.toUpperCase());
	}

	function layoutSwimlane(view, opts) {
		const overview = !!(view && (view.overview || view.mode === "cluster")) || !!(opts && opts.overview);
		const detail = !!(view && view.detail) || !!(opts && opts.detail);
		const cfg = mergeDefaults(Object.assign({}, opts, { overview: overview, detail: detail && !overview }));
		const nodes = (view && view.nodes) || [];
		const edges = (view && view.edges) || [];
		if (!nodes.length) {
			return { width: cfg.pad * 2, height: cfg.pad * 2, nodes: [], edges: [], lanes: [], mode: "swimlane", overview: overview, detail: !overview && detail };
		}

		const stepOrder = new Map();
		(Array.isArray(opts && opts.flowStepSet) ? opts.flowStepSet : []).forEach((id, index) => {
			const normalized = normId(id);
			if (normalized && !stepOrder.has(normalized)) stepOrder.set(normalized, index);
		});
		const lanes = new Map();
		nodes.forEach((node) => {
			const role = swimlaneRole(node);
			if (!lanes.has(role)) lanes.set(role, []);
			lanes.get(role).push(node);
		});
		const laneKeys = [...lanes.keys()].sort((a, b) => {
			const order = (SWIMLANE_ORDER[a] ?? 9) - (SWIMLANE_ORDER[b] ?? 9);
			return order || cmpStable(a, b);
		});
		const laneHeight = cfg.nodeHeight + cfg.gapY;
		const positioned = [];
		const laneRects = [];
		let maxColumns = 1;
		laneKeys.forEach((role, laneIndex) => {
			const list = lanes.get(role).slice().sort((a, b) => {
				const aStep = stepOrder.has(normId(a.id)) ? stepOrder.get(normId(a.id)) : Number.POSITIVE_INFINITY;
				const bStep = stepOrder.has(normId(b.id)) ? stepOrder.get(normId(b.id)) : Number.POSITIVE_INFINITY;
				return aStep - bStep || cmpStable(a.label || a.path || a.id, b.label || b.path || b.id);
			});
			list.forEach((node, columnIndex) => {
				const box = nodeBoxSize(node, cfg, view);
				const flowColumn = stepOrder.has(normId(node.id)) ? stepOrder.get(normId(node.id)) : stepOrder.size + columnIndex;
				maxColumns = Math.max(maxColumns, flowColumn + 1);
				positioned.push(Object.assign({}, node, {
					lane: role,
					laneLabel: swimlaneLabel(role),
					x: cfg.pad + flowColumn * (cfg.nodeWidth + cfg.gapX),
					y: cfg.pad + laneIndex * laneHeight,
					w: box.w,
					h: box.h
				}));
			});
			laneRects.push({
				key: role,
				label: swimlaneLabel(role),
				x: 0,
				y: laneIndex * laneHeight,
				width: cfg.pad * 2 + Math.max(1, maxColumns) * cfg.nodeWidth + Math.max(0, maxColumns - 1) * cfg.gapX,
				height: laneHeight
			});
		});
		const width = cfg.pad * 2 + maxColumns * cfg.nodeWidth + Math.max(0, maxColumns - 1) * cfg.gapX;
		const height = cfg.pad * 2 + laneKeys.length * laneHeight;
		laneRects.forEach((lane) => {
			lane.width = width;
			lane.y += cfg.pad;
		});
		return {
			width: width,
			height: height,
			nodes: positioned,
			edges: edges.map((e) => Object.assign({}, e)),
			lanes: laneRects,
			mode: "swimlane",
			overview: overview,
			detail: !overview && detail
		};
	}

	function layoutRadial(view, opts) {
		const overview = !!(view && (view.overview || view.mode === "cluster")) || !!(opts && opts.overview);
		const detail = !!(view && view.detail) || !!(opts && opts.detail);
		const cfg = mergeDefaults(Object.assign({}, opts, { overview: overview, detail: detail && !overview }));
		const nodes = (view && view.nodes) || [];
		const edges = (view && view.edges) || [];
		if (!nodes.length) {
			return { width: cfg.pad * 2, height: cfg.pad * 2, nodes: [], edges: [], mode: "radial", overview: overview, detail: !overview && detail };
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
				const box = nodeBoxSize(n, cfg, view);
				positioned.push(
					Object.assign({}, n, {
						x: cx - box.w / 2,
						y: cy - box.h / 2,
						w: box.w,
						h: box.h
					})
				);
				return;
			}
			const radius = d * (cfg.nodeWidth + cfg.gapX);
			if (d > 1) {
				const prior = rings.get(d - 1) || [];
				const priorIndex = new Map(prior.map((node, index) => [node.id, index]));
				list.sort((a, b) => {
					const score = (node) => {
						const neighbors = (adj.get(node.id) || []).map((id) => priorIndex.get(id)).filter((value) => value != null);
						return neighbors.length ? neighbors.reduce((sum, value) => sum + value, 0) / neighbors.length : Number.POSITIVE_INFINITY;
					};
					const diff = score(a) - score(b);
					return Number.isFinite(diff) && diff !== 0 ? diff : cmpStable(a.label || a.id, b.label || b.id);
				});
			}
			list.forEach((n, i) => {
				const angle = (Math.PI * 2 * i) / Math.max(1, list.length) - Math.PI / 2;
				const box = nodeBoxSize(n, cfg, view);
				positioned.push(
					Object.assign({}, n, {
						x: cx + Math.cos(angle) * radius - box.w / 2,
						y: cy + Math.sin(angle) * radius - box.h / 2,
						w: box.w,
						h: box.h
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
			overview: overview,
			detail: !overview && detail
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
		const acx = a.x + aw / 2;
		const acy = a.y + ah / 2;
		const bcx = b.x + bw / 2;
		const bcy = b.y + bh / 2;
		const horizontal = Math.abs(bcx - acx) >= Math.abs(bcy - acy);
		const rightward = bcx >= acx;
		const downward = bcy >= acy;
		const x1 = horizontal ? (rightward ? a.x + aw : a.x) : acx;
		const y1 = horizontal ? acy : (downward ? a.y + ah : a.y);
		const x2 = horizontal ? (rightward ? b.x : b.x + bw) : bcx;
		const y2 = horizontal ? bcy : (downward ? b.y : b.y + bh);
		const curved = !opts || opts.curved !== false;
		if (!curved) {
			return "M " + x1 + " " + y1 + " L " + x2 + " " + y2;
		}
		if (horizontal) {
			const midX = (x1 + x2) / 2;
			return "M " + x1 + " " + y1 + " C " + midX + " " + y1 + ", " + midX + " " + y2 + ", " + x2 + " " + y2;
		}
		const midY = (y1 + y2) / 2;
		return "M " + x1 + " " + y1 + " C " + x1 + " " + midY + ", " + x2 + " " + midY + ", " + x2 + " " + y2;
	}

	function buildFlowHighlightContext(opts) {
		const ctx = {
			nodeSet: new Set(),
			flowEdgeKeys: new Set(),
			cycleHighlight: !!(opts && opts.cycleHighlight)
		};
		if (!opts) return ctx;
		const addNode = function (id) {
			const n = normId(id);
			if (n) ctx.nodeSet.add(n);
		};
		if (Array.isArray(opts.highlightIds)) {
			opts.highlightIds.forEach(addNode);
		}
		const ordered = Array.isArray(opts.flowStepSet) ? opts.flowStepSet : [];
		const edgeKinds = Array.isArray(opts.flowEdgeKinds)
			? opts.flowEdgeKinds
			: Array.isArray(opts.edgeKinds)
				? opts.edgeKinds
				: null;
		ordered.forEach(addNode);
		for (let i = 0; i < ordered.length - 1; i++) {
			const from = normId(ordered[i]);
			const to = normId(ordered[i + 1]);
			const kind =
				edgeKinds && edgeKinds[i] != null && edgeKinds[i] !== ""
					? String(edgeKinds[i])
					: "";
			if (kind) {
				ctx.flowEdgeKeys.add(from + "\0" + to + "\0" + kind);
			} else {
				ctx.flowEdgeKeys.add(from + "\0" + to);
				if (ctx.cycleHighlight) ctx.flowEdgeKeys.add(to + "\0" + from);
			}
		}
		return ctx;
	}

	function nodeIsFlowHighlighted(n, ctx) {
		if (!ctx || !ctx.nodeSet.size || !n) return false;
		return ctx.nodeSet.has(normId(n.id)) || (n.path && ctx.nodeSet.has(normId(n.path)));
	}

	function edgeIsFlowHighlighted(e, ctx) {
		if (!ctx || !ctx.nodeSet.size || !e) return false;
		const from = normId(e.from);
		const to = normId(e.to);
		const kind = String(e.kind || "");
		if (ctx.flowEdgeKeys.size) {
			const keyWithKind = from + "\0" + to + "\0" + kind;
			const keyPair = from + "\0" + to;
			if (ctx.flowEdgeKeys.has(keyWithKind)) return true;
			if (ctx.flowEdgeKeys.has(keyPair)) return true;
			return false;
		}
		return ctx.nodeSet.has(from) && ctx.nodeSet.has(to);
	}

	function buildOverviewCard(n, opts) {
		const title = escapeXml(nodeLabel(n, opts));
		const complexity = escapeXml(n.complexity || "simple");
		const layer = escapeXml(String(n.layerLabel || "module"));
		const files = Number(n.fileCount) || 0;
		const fileLabel = files === 1 ? "1 file" : files + " files";
		const lines = wrapText(
			n.summary || "",
			Math.floor((n.w - 28) / 7.4),
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
					(n.y + 72 + i * 16) +
					'">' +
					escapeXml(line) +
					"</text>"
				);
			})
			.join("");
		const flowHighlight = nodeIsFlowHighlighted(n, opts && opts._flowHighlightCtx);
		return (
			// WCAG 2.1.1/4.1.2: every data point must be reachable by keyboard and
			// announce a name. Colour alone carries nine roles otherwise.
			'<g class="cg-node cg-card' +
			(flowHighlight ? " is-flow-highlight" : "") +
			'" data-node-id="' +
			escapeXml(n.id) +
			'" data-kind="cluster" data-complexity="' +
			complexity +
			'" data-summary-origin="' +
			summaryOrigin +
			'" role="listitem" tabindex="-1" aria-label="' +
			escapeXml(ariaLabelFor(n)) +
			'">' +
			'<rect class="cg-card-body" x="' +
			n.x +
			'" y="' +
			n.y +
			'" width="' +
			n.w +
			'" height="' +
			n.h +
			'" rx="10" ry="10"/>' +
			'<rect class="cg-card-accent" x="' +
			n.x +
			'" y="' +
			n.y +
			'" width="' +
			n.w +
			'" height="4" rx="2" ry="2" fill="' +
			accent +
			'"/>' +
			'<text class="cg-card-complexity" x="' +
			(n.x + 14) +
			'" y="' +
			(n.y + 28) +
			'">' +
			complexity +
			"</text>" +
			'<text class="cg-card-layer" x="' +
			(n.x + n.w - 14) +
			'" y="' +
			(n.y + 28) +
			'" text-anchor="end">' +
			layer +
			"</text>" +
			'<text class="cg-card-title" x="' +
			(n.x + 14) +
			'" y="' +
			(n.y + 52) +
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
			"</text>" +
			'<text class="cg-card-cta" x="' +
			(n.x + n.w - 14) +
			'" y="' +
			(n.y + n.h - 14) +
			'" text-anchor="end">Inspect</text>' +
			"</g>"
		);
	}

	function buildFileNode(n, opts) {
		const title = escapeXml(nodeLabel(n, opts));
		const isFocus = n.role === "focus";
		const roleChip = fileRoleChip(n);
		const complexity = n.complexity || fileComplexityOf(n);
		const meta = [];
		if (n.fanIn != null || n.fanOut != null) {
			meta.push("in " + (Number(n.fanIn) || 0) + " · out " + (Number(n.fanOut) || 0));
		}
		if (n.hotspotScore) meta.push("hot " + Math.round(Number(n.hotspotScore) || 0));
		if (n.inCycle) meta.push("cycle");
		const metaText = escapeXml(meta.join(" · "));
		const flowHighlight = nodeIsFlowHighlighted(n, opts && opts._flowHighlightCtx);
		const cycleHighlight = !!(opts && opts._flowHighlightCtx && opts._flowHighlightCtx.cycleHighlight && flowHighlight);
		const hot = Number(n.hotspotScore) || 0;
		const heat =
			hot >= 50 ? " heat-high" : hot >= 30 ? " heat-mid" : hot >= 15 ? " heat-low" : "";
		const cls =
			"cg-node cg-file" +
			(isFocus ? " is-focus" : "") +
			(n.external ? " is-external" : "") +
			(n.inCycle ? " in-cycle" : "") +
			(hot >= 40 ? " is-hotspot" : "") +
			heat +
			(flowHighlight ? " is-flow-highlight" : "") +
			(cycleHighlight ? " is-cycle-highlight" : "");
		const chipY = n.y + 16;
		const titleY = n.y + (roleChip || complexity ? 40 : 28);
		const metaY = titleY + 20;
		const roleMarkup = roleChip
			? '<text class="cg-file-role" x="' +
				(n.x + 12) +
				'" y="' +
				chipY +
				'">' +
				escapeXml(roleChip) +
				"</text>"
			: "";
		const complexityMarkup = complexity
			? '<text class="cg-file-complexity" text-anchor="end" x="' +
				(n.x + n.w - 12) +
				'" y="' +
				chipY +
				'">' +
				escapeXml(complexity) +
				"</text>"
			: "";
		return (
			// Focusable and named: an SVG shape carries no accessible name, and the
			// role hues are the only differentiator without one. `class` stays the
			// first attribute — existing specs match on it.
			'<g class="' +
			cls +
			'" data-node-id="' +
			escapeXml(n.id) +
			'" data-kind="' +
			escapeXml(n.kind || "file") +
			'" data-path="' +
			escapeXml(n.path || "") +
			'"' +
			(n.external ? ' data-external="true"' : "") +
			(roleChip ? ' data-role="' + escapeXml(roleChip) + '"' : n.role ? ' data-role="' + escapeXml(String(n.role)) + '"' : "") +
			' data-complexity="' +
			escapeXml(complexity) +
			'" role="listitem" tabindex="-1" aria-label="' +
			escapeXml(ariaLabelFor(n)) +
			'">' +
			"<title>" +
			escapeXml(fileTooltip(n)) +
			"</title>" +
			'<rect class="cg-file-body" x="' +
			n.x +
			'" y="' +
			n.y +
			'" width="' +
			n.w +
			'" height="' +
			n.h +
			'" rx="8" ry="8"/>' +
			roleMarkup +
			complexityMarkup +
			'<text class="cg-file-title" x="' +
			(n.x + 12) +
			'" y="' +
			titleY +
			'">' +
			title +
			"</text>" +
			(metaText
				? '<text class="cg-file-meta" x="' +
					(n.x + 12) +
					'" y="' +
					metaY +
					'">' +
					metaText +
					"</text>"
				: "") +
			"</g>"
		);
	}

	function buildSimpleNode(n, opts) {
		if (n && (n.kind === "file" || n.path || n.role === "focus" || n.role === "neighbor")) {
			return buildFileNode(n, opts);
		}
		const flowHighlight = nodeIsFlowHighlighted(n, opts && opts._flowHighlightCtx);
		const label = escapeXml(nodeLabel(n, opts));
		return (
			'<g class="cg-node' +
			(flowHighlight ? " is-flow-highlight" : "") +
			'" data-node-id="' +
			escapeXml(n.id) +
			'" data-kind="' +
			escapeXml(n.kind || "file") +
			'" role="listitem" tabindex="-1" aria-label="' +
			escapeXml(ariaLabelFor(n)) +
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
		const flowCtx = buildFlowHighlightContext(opts);
		const renderOpts = Object.assign({}, opts || {}, { _flowHighlightCtx: flowCtx });
		const nodes = (layout && layout.nodes) || [];
		const edges = (layout && layout.edges) || [];
		const width = (layout && layout.width) || cfg.pad * 2;
		const height = (layout && layout.height) || cfg.pad * 2;
		const byId = new Map();
		nodes.forEach((n) => {
			byId.set(n.id, n);
			byId.set(normId(n.id), n);
			if (n.path) byId.set(normId(n.path), n);
		});
		const aria = escapeXml((opts && opts.ariaLabel) || "Code graph");
		const overview =
			!!(layout && layout.overview) ||
			(layout && layout.mode === "cluster") ||
			nodes.some((n) => n.kind === "cluster" && (n.summary || n.complexity));
		const selectedEdgeKey = opts && opts.selectedEdgeKey ? String(opts.selectedEdgeKey) : "";
		const laneParts = layout && layout.mode === "swimlane"
			? ((layout.lanes || []).map((lane, index) =>
				'<g class="cg-swimlane" data-lane="' + escapeXml(lane.key) + '">' +
				'<rect x="' + lane.x + '" y="' + lane.y + '" width="' + lane.width + '" height="' + lane.height + '" fill="' + (index % 2 ? "#f8fafc" : "#ffffff") + '"/>' +
				'<text class="cg-swimlane-label" x="12" y="' + (lane.y + 18) + '">' + escapeXml(lane.label) + '</text>' +
				'</g>'
			)).join("")
			: "";

		const edgeParts = [];
		edges.forEach((e) => {
			const a = byId.get(e.from) || byId.get(normId(e.from));
			const b = byId.get(e.to) || byId.get(normId(e.to));
			if (!a || !b) return;
			const weight = e.weight != null ? e.weight : e.edgeCount;
			const edgeLabel = e.kind || e.label || (weight != null ? String(weight) : "");
			const edgeKey = normId(e.from) + "\0" + normId(e.to) + "\0" + String(e.kind || "");
			const kindSlug = String(e.kind || "")
				.toLowerCase()
				.replace(/[^a-z0-9_-]+/g, "");
			const kindClass = kindSlug ? " is-kind-" + kindSlug : "";
			const selected = selectedEdgeKey && edgeKey === selectedEdgeKey ? " is-selected" : "";
			const flowOn = edgeIsFlowHighlighted(e, flowCtx);
			const flowHighlight = flowOn ? " is-flow-highlight" : "";
			const cycleHighlight = flowOn && flowCtx.cycleHighlight ? " is-cycle-highlight" : "";
			const crossing = e.crossing ? " is-crossing" : "";
			let extraAttrs = "";
			if (e.evidence) extraAttrs += ' data-evidence="' + escapeXml(String(e.evidence).slice(0, 400)) + '"';
			if (e.line != null && e.line !== "") extraAttrs += ' data-line="' + escapeXml(String(e.line)) + '"';
			if (e.crossing) extraAttrs += ' data-crossing="true"';
			edgeParts.push(
				'<path class="cg-edge' +
					kindClass +
					selected +
					flowHighlight +
					cycleHighlight +
					crossing +
					'" data-from="' +
					escapeXml(e.from) +
					'" data-to="' +
					escapeXml(e.to) +
					'" data-kind="' +
					escapeXml(e.kind || "") +
					'"' +
					extraAttrs +
					' marker-end="url(#cg-arrow)" d="' +
					escapeXml(edgePath(a, b, opts)) +
					'" fill="none" stroke="currentColor"><title>' +
					escapeXml(edgeTooltip(e)) +
					"</title></path>" +
					(edgeLabel
						? '<text class="cg-edge-label" x="' +
							((a.x + a.w + b.x) / 2) +
							'" y="' +
							((a.y + a.h / 2 + b.y + b.h / 2) / 2 - 4) +
							'">' +
							escapeXml(String(edgeLabel)) +
							"</text>"
						: "")
			);
		});

		const nodeParts = nodes.map((n) => {
			if (overview && n.kind === "cluster") return buildOverviewCard(n, renderOpts);
			return buildSimpleNode(n, renderOpts);
		});

		return (
			'<svg xmlns="http://www.w3.org/2000/svg" class="cg-svg' +
			(overview ? " cg-svg-overview" : "") +
			(layout && layout.mode === "focus" ? " cg-svg-focus" : "") +
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
			'<defs><marker id="cg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/></marker></defs>' +
			laneParts +
			'<g class="cg-edges">' +
			edgeParts.join("") +
			"</g>" +
			'<g class="cg-nodes" role="list">' +
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
		buildSymbolView,
		selectSubgraph,
		layoutClusters,
		layoutLayered,
		layoutSwimlane,
		layoutRadial,
		buildSvg,
		ariaLabelFor,
		degreeOfInterest,
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
		normId,
		idsEqual,
		uniqueEdges,
		complexityOf,
		fileComplexityOf,
		fileRoleChip,
		fileTooltip,
		edgeTooltip,
		summaryForCluster,
		wrapText,
		selectTopClusters,
		overviewScore,
		projectOverviewCopy
	};
});
