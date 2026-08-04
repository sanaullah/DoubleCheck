/*
 * Pure helpers shared by the Modernize workspace UI (app.js) and its Node
 * tests. This file intentionally has no DOM or network dependency, so it can
 * be `require()`d directly in tests/js/*.spec.mjs the same way
 * modernization-contract.js is.
 */
(function (root, factory) {
	const api = factory();
	if (typeof module === "object" && module.exports) module.exports = api;
	if (root) Object.assign(root, api);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
	function phaseHasCodeLinks(phase = {}) {
		return !!(
			(Array.isArray(phase.unitIds) && phase.unitIds.length) ||
			(Array.isArray(phase.routeIds) && phase.routeIds.length) ||
			(Array.isArray(phase.dbFindingIds) && phase.dbFindingIds.length) ||
			(Array.isArray(phase.transitionIds) && phase.transitionIds.length)
		);
	}

	function modernizationItems(result = {}, pane = "") {
		const target = result.target || {};
		const database = result.schemaEvidence?.database || result.database || {};
		const map = {
			legacy: [result.inventory?.units || [], "legacy-unit"],
			target: [(target.units || []).concat((result.samples || []).map((item) => ({ ...item, itemType: item.itemType || "sample" }))), "target-unit"],
			routes: [result.routeContracts || [], "route-contract"],
			database: [(result.dbFindings || []).map((item) => ({ ...item, itemType: item.itemType || "db-finding" })).concat((result.dbTransitions || database.findings || []).map((item) => ({ ...item, itemType: item.itemType || "db-transition" }))), "db-finding"],
			links: [result.unitLinks || [], "unit-link"],
			contexts: [(target.placements || []).map((item) => ({ ...item, itemType: item.itemType || "placement" })).concat(
				(target.placements || []).length ? [] : (target.contexts || result.contexts || []).map((item) => ({ ...item, itemType: item.itemType || "context" })).concat((target.extracts || result.extracts || []).map((item) => ({ ...item, itemType: item.itemType || "extract" })))
			), "placement"],
			placements: [(target.placements || []).map((item) => ({ ...item, itemType: item.itemType || "placement" })), "placement"],
			roadmap: [result.roadmapPhases || [], "roadmap-phase"],
			validation: [result.validation?.items || result.validation?.messages || [], "validation"]
		};
		const pair = map[pane] || [[], "item"];
		return pair[0].map((item) => {
			const typed = { ...item, _modernizationType: item.itemType || pair[1] };
			const itemId = item.id || item.itemId || item.findingId || item.transitionId || "";
			const messages = itemId ? (result.validation?.messages || []).filter((message) => message.itemId === itemId) : [];
			if (messages.some((message) => (message.level || message.validationLevel) === "blocking")) typed.validationLevel = "blocking";
			else if (messages.some((message) => (message.level || message.validationLevel) === "warning")) typed.validationLevel = "warning";
			typed._validationMessages = messages.map((message) => message.message).filter(Boolean);
			return typed;
		});
	}

	function modernizationItemLabel(item) {
		if (item._modernizationType === "legacy-unit") {
			const file = item.filePath || item.path || "Unknown source file";
			const symbol = item.symbolName || item.signature || "";
			return symbol && symbol !== file ? `${file} · ${symbol}` : file;
		}
		if (item._modernizationType === "target-unit") return item.targetPath || item.pathHint || item.path || item.name || item.title || item.id || "Untitled target";
		if (item._modernizationType === "unit-link") return `${item.sourcePath || item.legacyUnitId || item.sourceUnitId || "Legacy unit"} → ${item.targetPath || item.targetUnitId || item.targetId || "Target unit"}`;
		if (item._modernizationType === "roadmap-phase") return item.name || item.title || item.goal || item.id || "Roadmap phase";
		if (item._modernizationType === "route-contract") return `${item.method || "GET"} ${item.legacyPath || item.path || "legacy route"} → ${item.targetRoute || item.targetEvent || "target"}`;
		if (item._modernizationType === "db-finding") return item.objectRef || item.proposedChange || item.problem || item.id || "Database finding";
		if (item._modernizationType === "db-transition") return item.migrationPath || item.operation || item.id || "Database transition";
		if (item._modernizationType === "placement") return (item.name || item.title || item.id || "Capability") + " · " + (item.placementType || item.packaging || "main-app");
		if (item._modernizationType === "sample") return item.targetPath || item.path || item.sampleKind || item.id || "Sample";
		if (item._modernizationType === "validation" || item.itemType === "validation") {
			return item.title || item.message || item.detail || item.targetPath || item.path || item.itemId || item.id || "Validation note";
		}
		return item.name || item.title || item.message || item.filePath || item.path || item.targetPath || item.legacyPath || item.objectRef || item.findingId || item.transitionId || item.id || "Untitled proposal";
	}

	function modernizationGenerationErrors(result = {}) {
		const errors = result.generationErrors || result.errors || [];
		return Array.isArray(errors)
			? errors.filter((item) => item && (item.message || item.role) && !modernizationMessageIsNote(item))
			: [];
	}

	function modernizationGenerationNotes(result = {}) {
		const notes = result.generationNotes || [];
		const fromErrors = (result.generationErrors || result.errors || []).filter((item) => modernizationMessageIsNote(item));
		const merged = [...(Array.isArray(notes) ? notes : []), ...fromErrors];
		return merged.filter((item) => item && (item.message || item.role));
	}

	function modernizationMessageIsNote(item = {}) {
		const message = String(item.message || "").toLowerCase();
		const severity = String(item.severity || "").toLowerCase();
		if (severity === "info" || severity === "note") return true;
		if (message.startsWith("synthesized-")) return true;
		if (message === "cost-reserved-for-roadmap") return true;
		if (message === "ignored-non-object-items") return true;
		return false;
	}

	function modernizationPlanIsHollow(result = {}) {
		const phases = Array.isArray(result.roadmapPhases) ? result.roadmapPhases : [];
		const targets = result.target?.units || [];
		const routes = result.routeContracts || [];
		const placements = result.target?.placements || [];
		const samples = Array.isArray(result.samples) ? result.samples : [];
		const llmMapped = targets.filter((unit) => {
			const provenance = String(unit?.provenanceClass || "").toLowerCase();
			const id = String(unit?.id || "");
			if (provenance === "deterministically-derived") return false;
			if (id.startsWith("coverage-")) return false;
			return true;
		});
		const fallbackNote = modernizationGenerationNotes(result).find((item) => String(item.message || "") === "inventory-coverage-fallback");
		const fallbackCount = Number(fallbackNote?.count || 0);
		const fallbackDominates = fallbackCount > 0 && fallbackCount >= Math.max(1, llmMapped.length);
		const fallbackRatio = fallbackCount / Math.max(1, targets.length);
		const mappedPhases = phases.filter((phase) => phaseHasCodeLinks(phase));
		const packagingIsDefaultOnly =
			placements.length === 0 ||
			(placements.length <= 1 &&
				/modular monolith \(default\)/i.test(String(placements[0]?.name || placements[0]?.domainKey || "")));
		const roadmapSynthesized = String(result.metadata?.roadmapSource || result.generationSummary?.roadmapSource || "").toLowerCase() === "synthesized";
		const architectureSynthesized = String(result.metadata?.architectureSource || result.generationSummary?.architectureSource || "").toLowerCase() === "synthesized";
		const migrationStepCount = phases.reduce((count, phase) => count + (Array.isArray(phase?.migrationSteps) ? phase.migrationSteps.length : 0), 0);
		const incompleteStages = Array.isArray(result.generationSummary?.incompleteStages)
			? result.generationSummary.incompleteStages.map(String)
			: [];
		const dbIncomplete =
			incompleteStages.includes("database") ||
			modernizationGenerationErrors(result).some((item) => String(item.role || "") === "modernization-database");
		const failedGaps = modernizationGenerationNotes(result).some((item) => String(item.message || "") === "failed-shard-gaps-retained");

		// Synthesized road with zero actionability is hollow regardless of LLM unit count.
		if (roadmapSynthesized && migrationStepCount === 0 && samples.length === 0) return true;
		if (architectureSynthesized && roadmapSynthesized && migrationStepCount === 0 && samples.length === 0) return true;
		if (fallbackCount >= 10 && fallbackRatio >= 0.25 && (roadmapSynthesized || dbIncomplete || failedGaps)) return true;
		// Synthesized roads are hollow when packaging stayed the generic
		// default and maps are mostly coverage stubs.
		if (roadmapSynthesized && packagingIsDefaultOnly && fallbackDominates && llmMapped.length < 20) return true;
		if (fallbackDominates && packagingIsDefaultOnly && llmMapped.length < 20) return true;
		if (llmMapped.length || routes.length) {
			if (failedGaps && migrationStepCount === 0 && samples.length === 0 && (roadmapSynthesized || dbIncomplete)) return true;
			return false;
		}
		if (targets.length && !llmMapped.length && !routes.length) {
			if (mappedPhases.length && placements.length > 1 && migrationStepCount > 0) return false;
			if (!mappedPhases.length) return true;
			if (packagingIsDefaultOnly) return true;
		}
		const appFailed = modernizationGenerationErrors(result).some((item) => String(item.role || "") === "modernization-application");
		return appFailed || (phases.length > 0 && !mappedPhases.length);
	}

	function modernizationGenerationSummary(result = {}) {
		const raw = result && typeof result.generationSummary === "object" && result.generationSummary
			? result.generationSummary
			: {};
		const status = String(raw.status || "").trim();
		return {
			status,
			stage: String(raw.stage || "").trim(),
			errorType: String(raw.errorType || "").trim(),
			message: String(raw.message || "").trim(),
			retryable: !!raw.retryable,
			completedStages: Array.isArray(raw.completedStages) ? raw.completedStages.map(String) : [],
			incompleteStages: Array.isArray(raw.incompleteStages) ? raw.incompleteStages.map(String) : [],
			checkpointId: String(raw.checkpointId || "").trim(),
			limitReached: String(raw.limitReached || "").trim(),
			actionability: String(raw.actionability || "").trim(),
			recommendedContinuation: String(raw.recommendedContinuation || "").trim(),
			partialResults: raw.partialResults && typeof raw.partialResults === "object" ? raw.partialResults : {}
		};
	}

	function modernizationValidationStatus(item) {
		const value = String(item.validationStatus || item.validationLevel || item.status || "unknown").toLowerCase();
		if (["passed", "pass", "ok", "succeeded", "valid"].includes(value)) return "valid";
		if (["error", "failed", "fail", "blocking", "blocker"].includes(value)) return "blocking";
		if (["warn", "warning"].includes(value)) return "warning";
		return value;
	}

	function modernizationItemMeta(item) {
		const validation = modernizationValidationStatus(item);
		const provenance = item.provenanceClass || "unknown provenance";
		if (item._modernizationType === "placement") return (item.placementType || item.packaging || "main-app") + " · " + (item.gateStatus || "needs-review") + " · " + (item.gates || []).filter((gate) => String(gate.status || "").toLowerCase() === "unknown").length + " unknown gates · " + provenance;
		if (item._modernizationType === "legacy-unit") {
			const range = item.startLine ? ` · lines ${item.startLine}${item.endLine && item.endLine !== item.startLine ? `–${item.endLine}` : ""}` : "";
			return `${item.layer || item.unitType || "legacy"}${range} · ${item.signalIds?.length || 0} signal types · ${item.touchedTables?.length || 0} tables · ${provenance}`;
		}
		if (item._modernizationType === "target-unit") return `${item.layer || item.kind || "target"} · ${item.sourcePath || item.filePath || "new proposal"} · ${validation} · ${provenance}`;
		if (item._modernizationType === "roadmap-phase") return `${item.pattern || "migration phase"} · ${(item.dependencies || []).length} dependencies · ${validation} · ${provenance}`;
		if (item._modernizationType === "db-finding") return `${item.category || "database"} · ${item.severity || "unrated"} · ${item.expandContract || "review"} · ${provenance}`;
		if (item._modernizationType === "route-contract") return `${item.method || "UNKNOWN"} ${item.legacyPath || item.path || "legacy route"} → ${item.targetRoute || item.targetEvent || "target route"} · ${provenance}`;
		return `${item._modernizationType} · ${validation} · ${provenance}`;
	}

	function modernizationItemKey(item) {
		return item.itemFingerprint || item.id || item.itemId || item.findingId || item.transitionId || modernizationItemLabel(item);
	}

	/** Plain-language note for a catalog pane whose section came back empty
	 * because the role that fills it failed or was skipped, not because there
	 * was genuinely nothing to report. Returns "" when no note applies. */
	function modernizationPaneBanner(pane, result) {
		const genErrors = modernizationGenerationErrors(result);
		if (pane === "database") {
			const empty = !(result.dbFindings || []).length && !(result.dbTransitions || []).length;
			if (empty && genErrors.some((item) => String(item.role || "") === "modernization-database")) {
				return "Database analysis didn't complete for this run — schema findings and migrations are not available yet.";
			}
		}
		if (pane === "routes") {
			const shards = result.metadata?.applicationShards || {};
			if (!(result.routeContracts || []).length && (Number(shards.failed || 0) > 0 || Number(shards.omitted || 0) > 0)) {
				return "Some application shards didn't complete — routes may be missing rather than genuinely absent.";
			}
		}
		if (pane === "roadmap") {
			const shards = result.metadata?.roadmapShards || {};
			if (!(result.roadmapPhases || []).length && (Number(shards.failed || 0) > 0 || Number(shards.omitted || 0) > 0)) {
				return "Some roadmap shards didn't complete — phases may be missing rather than genuinely absent.";
			}
		}
		return "";
	}

	function modernizationEvidenceBasisNote(item = {}) {
		const basis = String(item.evidenceBasis || "").toLowerCase();
		if (basis === "domain-clustering") return "Grouped by shared domain — no deployment seam evidenced yet.";
		if (basis === "explicit-seam") return "Explicit runtime/deployment seam observed.";
		return "";
	}

	/**
	 * Turns target.contexts/target.extracts into the {nodes,edges} shape
	 * ArchitectureFlow.layoutFlowPositions() expects, so the Modernize
	 * "Modular Monolith Map" reuses the same layout engine as the code-review
	 * Architecture tab's file-dependency diagram instead of a bespoke one.
	 * Pure/DOM-free so it's directly unit-testable.
	 */
	function buildModernizationArchitectureSubgraph(result = {}) {
		const placements = Array.isArray(result.target?.placements) && result.target.placements.length
			? result.target.placements
			: (result.target?.contexts || result.contexts || []).map((item) => ({ ...item, placementType: item.placementType || item.packaging || "main-app" })).concat((result.target?.extracts || result.extracts || []).map((item) => ({ ...item, placementType: item.placementType || "external-service" })));
		const modules = placements.filter((item) => ["coldbox-module", "module"].includes(String(item.placementType || item.packaging || "").toLowerCase()));
		const extracts = placements.filter((item) => ["external-service", "microservice", "side-app", "extract"].includes(String(item.placementType || item.packaging || "").toLowerCase()));
		const central = placements.filter((item) => !modules.includes(item) && !extracts.includes(item));

		const nodes = [];
		const idById = new Map();
		const addNode = (id, path, role, item, unitCount) => {
			const node = { id, path, role, item: item || null, unitCount: unitCount || 0 };
			nodes.push(node);
			idById.set(id, node);
		};
		const groupedUnitIds = new Set();
		const addGroupNode = (item, role) => {
			const id = String(item.id || item.itemId || "");
			if (!id) return;
			const unitIds = Array.isArray(item.targetUnitIds) ? item.targetUnitIds : [];
			unitIds.forEach((unitId) => groupedUnitIds.add(String(unitId)));
			addNode(id, item.name || id, role, item, unitIds.length);
		};
		// "Centralized" packaging is the default, expected outcome for most
		// groups in a modular-monolith-first plan — it must still get its own
		// node, not be folded away into an invisible unit count on "core".
		// Otherwise a run that (correctly) keeps everything centralized shows
		// an empty map instead of the packaging picture it actually made.
		central.forEach((item) => addGroupNode(item, "centralized"));
		modules.forEach((item) => addGroupNode(item, "module"));
		extracts.forEach((item) => addGroupNode(item, "extract"));
		const units = result.target?.units || [];
		const ungroupedCount = units.filter((unit) => !groupedUnitIds.has(String(unit.id || unit.itemId || ""))).length;
		addNode("core", "ColdBox Monolith", "core", null, ungroupedCount);

		const edgeKeys = new Set();
		const edges = [];
		const addEdge = (from, to) => {
			if (!idById.has(from) || !idById.has(to) || from === to) return;
			const key = `${from}\0${to}`;
			if (edgeKeys.has(key)) return;
			edgeKeys.add(key);
			edges.push({ from, to });
		};
		[...central, ...modules, ...extracts].forEach((item) => {
			const id = String(item.id || item.itemId || "");
			if (!id || !idById.has(id)) return;
			addEdge("core", id);
			(Array.isArray(item.dependsOnContextIds) ? item.dependsOnContextIds : []).forEach((dependsOnId) => {
				addEdge(id, String(dependsOnId));
			});
		});

		return {
			mode: "modernization-architecture",
			nodes,
			edges,
			truncated: false,
			totalNodes: nodes.length,
			totalEdges: edges.length,
			lanes: {
				centralized: central.length,
				modules: modules.length,
				extracts: extracts.length
			}
		};
	}

	/**
	 * Vertical packaging lanes for the Modular Monolith Map: core → main-app →
	 * ColdBox modules → side-app/microservice candidates. Keeps each packaging
	 * type visually separate instead of a left-to-right dependency soup.
	 */
	function layoutModernizationArchitectureVertical(subgraph = {}, opts = {}) {
		const nodeWidth = Number(opts.nodeWidth) > 0 ? Number(opts.nodeWidth) : 240;
		const nodeHeight = Number(opts.nodeHeight) > 0 ? Number(opts.nodeHeight) : 56;
		const gapX = Number(opts.gapX) > 0 ? Number(opts.gapX) : 16;
		const gapY = Number(opts.gapY) > 0 ? Number(opts.gapY) : 10;
		const gapLane = Number(opts.gapLane) > 0 ? Number(opts.gapLane) : 26;
		const pad = Number(opts.pad) > 0 ? Number(opts.pad) : 20;
		const laneHeaderH = 20;
		const nodes = Array.isArray(subgraph.nodes) ? subgraph.nodes : [];
		const edges = Array.isArray(subgraph.edges) ? subgraph.edges : [];
		const byRole = {
			core: nodes.filter((n) => n.role === "core"),
			centralized: nodes.filter((n) => n.role === "centralized"),
			module: nodes.filter((n) => n.role === "module"),
			extract: nodes.filter((n) => n.role === "extract")
		};
		const sortNodes = (list) => list.slice().sort((a, b) => String(a.path || a.id).localeCompare(String(b.path || b.id)));
		const lanes = [
			{ id: "core", title: "Shared ColdBox core", roleClass: "is-core", nodes: sortNodes(byRole.core) },
			{ id: "main-app", title: "Main application (monolith)", roleClass: "is-centralized", nodes: sortNodes(byRole.centralized) },
			{ id: "modules", title: "ColdBox module candidates", roleClass: "is-module", nodes: sortNodes(byRole.module) },
			{ id: "services", title: "Side-app / microservice candidates", roleClass: "is-extract", nodes: sortNodes(byRole.extract) }
		].filter((lane) => lane.nodes.length);

		// One node per row made the map a 280px-wide, 1400px-tall ribbon that had to
		// be scrolled past to reach anything — 19 packaging decisions in a single
		// column. Nodes now wrap into a grid inside their lane, so a lane reads as
		// a group and the whole map fits a desktop viewport.
		const widest = lanes.reduce((max, lane) => Math.max(max, lane.nodes.length), 0);
		let columns = Number(opts.columns) > 0 ? Math.floor(opts.columns) : 0;
		if (!columns) {
			const available = Number(opts.availableWidth) > 0 ? Number(opts.availableWidth) : 0;
			columns = available > 0
				? Math.floor((available - pad * 2 + gapX) / (nodeWidth + gapX))
				: 3;
		}
		// Never more columns than there are nodes to fill them, so a small plan
		// does not render as one sparse row with dead space.
		columns = Math.max(1, Math.min(columns, 4, widest || 1));

		// Spend the leftover pane width on the cards rather than leaving a margin:
		// these labels are placement names like "Core application bootstrap and
		// shared infrastructure", and a wider card is the difference between
		// reading one and guessing at it.
		let cardWidth = nodeWidth;
		const availableForCards = Number(opts.availableWidth) > 0 ? Number(opts.availableWidth) : 0;
		if (availableForCards > 0) {
			const fitted = Math.floor((availableForCards - pad * 2 - gapX * (columns - 1)) / columns);
			if (fitted > cardWidth) cardWidth = Math.min(fitted, 360);
		}

		let y = pad;
		const positioned = [];
		const laneMeta = [];
		lanes.forEach((lane) => {
			laneMeta.push({ id: lane.id, title: lane.title, roleClass: lane.roleClass, y, count: lane.nodes.length });
			y += laneHeaderH;
			lane.nodes.forEach((n, index) => {
				positioned.push({
					...n,
					x: pad + (index % columns) * (cardWidth + gapX),
					y: y + Math.floor(index / columns) * (nodeHeight + gapY),
					w: cardWidth,
					h: nodeHeight,
					lane: lane.id
				});
			});
			const rows = Math.ceil(lane.nodes.length / columns) || 1;
			y += rows * (nodeHeight + gapY) + gapLane;
		});

		return {
			width: pad * 2 + columns * cardWidth + (columns - 1) * gapX,
			height: Math.max(pad * 2 + nodeHeight, y),
			columns,
			cardWidth,
			nodes: positioned,
			edges: edges.map((e) => ({ ...e })),
			lanes: laneMeta
		};
	}

	/**
	 * What each deterministic coupling signal means for a CFML -> ColdBox
	 * migration. Keyed by the signalId slugs ModernizationSignalService emits.
	 * `impact` is the part a planner actually needs: what the legacy construct
	 * has to become on the target side.
	 */
	const MODERNIZATION_SIGNAL_GUIDE = {
		"scope.application-state": { label: "Shared application state", impact: "Must become WireBox singletons, ColdBox config, or CacheBox — not application scope." },
		"scope.session-heavy": { label: "Session state coupling", impact: "Move to cbstorages/cbsecurity rather than reading session scope directly." },
		"scope.client": { label: "Client scope coupling", impact: "Client scope has no ColdBox equivalent; re-home this state deliberately." },
		"security.session-gate": { label: "Auth / session gate", impact: "Replace hand-rolled login checks with a cbsecurity rule or interceptor." },
		"include.chain": { label: "Include chain", impact: "cfinclude shares variables implicitly; convert to views/helpers with explicit args." },
		"component.dynamic": { label: "Dynamic component construction", impact: "Cannot be migrated statically — needs a human decision on the DI mapping." },
		"dynamic.eval": { label: "evaluate() usage", impact: "Requires manual rewrite; no safe mechanical translation." },
		"component.construction": { label: "Component construction", impact: "createObject/new becomes WireBox injection." },
		"sql.query": { label: "Inline SQL", impact: "Move to qb or a service method; parameterize on the way." },
		"sql.unparameterized": { label: "Unparameterized SQL", impact: "Security risk — must use queryparam/qb bindings when migrated." },
		"sql.dynamic-identifier": { label: "Dynamic SQL identifier", impact: "Table/column built at runtime; cannot be validated statically." },
		"sql.proc-call": { label: "Stored procedure call", impact: "Confirm the proc still exists on the target database." },
		"sql.parameter-mismatch": { label: "SQL parameter mismatch", impact: "CFML and SQL bindings may disagree; verify before migrating." },
		"sql.table-ref": { label: "Table reference", impact: "Ties this slice to schema work." },
		"sql.column-ref": { label: "Column reference", impact: "Ties this slice to schema work." },
		"sql.type-hint": { label: "CFML SQL type hint", impact: "cfsqltype hints carry over to qb bindings." },
		"datasource.named": { label: "Named datasource", impact: "Datasource must be declared in ColdBox config." },
		"http.outbound": { label: "Outbound HTTP call", impact: "A real deployment seam — candidate for isolation." },
		"schedule.task": { label: "Scheduled work", impact: "Becomes a ColdBox scheduled task; a real deployment seam." },
		"filesystem.io": { label: "Filesystem access", impact: "Check path assumptions survive the app/ + public/ split." },
		"java.interop": { label: "Java interop", impact: "BoxLang Java interop differs from Lucee — verify each call." },
		"app.lifecycle": { label: "Application lifecycle", impact: "Application.cfc hooks decompose across ColdBox config and interceptors." },
		"route.evidence": { label: "Legacy route", impact: "Needs a coexist route before the legacy path can retire." },
		"route.dynamic": { label: "Dynamic route", impact: "Route built at runtime; confirm manually." },
		"coldbox.present": { label: "ColdBox already present", impact: "Some target structure already exists." }
	};

	function modernizationSignalGuide(signalId) {
		const key = String(signalId || "");
		return MODERNIZATION_SIGNAL_GUIDE[key] || { label: key, impact: "" };
	}

	function modernizationSignalLabel(signalId) {
		return modernizationSignalGuide(signalId).label;
	}

	/**
	 * "What makes this slice hard" — resolves a roadmap phase to its coupling
	 * signals through phase.unitIds -> target units -> legacyUnitIds (with a
	 * sourcePath fallback), then ranks them by hit count.
	 *
	 * Pure/DOM-free so it is unit-testable; every input optional because plans
	 * predating the signal join carry no unitIds on their signals.
	 */
	function modernizationSliceDifficulty(result = {}, phase = {}, limit = 6) {
		const signals = Array.isArray(result.signals) ? result.signals : [];
		const phaseUnitIds = new Set((Array.isArray(phase.unitIds) ? phase.unitIds : []).map(String));
		if (!signals.length || !phaseUnitIds.size) return { total: 0, groups: [] };

		const legacyIds = new Set();
		const paths = new Set();
		(result.target?.units || []).forEach((unit) => {
			if (!phaseUnitIds.has(String(unit.id || unit.itemId || ""))) return;
			(Array.isArray(unit.legacyUnitIds) ? unit.legacyUnitIds : []).forEach((id) => legacyIds.add(String(id)));
			String(unit.sourcePath || "").split(",").forEach((part) => {
				const norm = part.trim().replace(/\\/g, "/").toLowerCase();
				if (norm) paths.add(norm);
			});
		});
		if (!legacyIds.size && !paths.size) return { total: 0, groups: [] };

		const buckets = new Map();
		let total = 0;
		signals.forEach((signal) => {
			if (!signal || typeof signal !== "object") return;
			const owners = Array.isArray(signal.unitIds) ? signal.unitIds : [];
			const ref = (Array.isArray(signal.evidenceRefs) ? signal.evidenceRefs[0] : null) || {};
			const filePath = String(ref.filePath || "");
			const inScope = owners.some((id) => legacyIds.has(String(id)))
				|| (filePath && paths.has(filePath.replace(/\\/g, "/").toLowerCase()));
			if (!inScope) return;
			const signalId = String(signal.signalId || "");
			if (!signalId) return;
			total++;
			if (!buckets.has(signalId)) {
				const guide = modernizationSignalGuide(signalId);
				buckets.set(signalId, { signalId, label: guide.label, impact: guide.impact, count: 0, files: [] });
			}
			const bucket = buckets.get(signalId);
			bucket.count++;
			if (filePath && bucket.files.length < 3) {
				const label = `${filePath}:${ref.startLine || 0}`;
				if (!bucket.files.includes(label)) bucket.files.push(label);
			}
		});

		const groups = [...buckets.values()].sort((a, b) => (b.count - a.count) || a.signalId.localeCompare(b.signalId));
		return { total, groups: groups.slice(0, limit) };
	}

	/**
	 * Pure aggregation for the "Modernization Brief" summary card: status,
	 * effort roll-up and risk distribution (from ModernizationRiskService's
	 * read-time overlay), packaging split (from the architecture role), and
	 * a one-line recommended next action. Every input is optional — a plan
	 * from before Parts B/C shipped, or one that skipped those roles, still
	 * produces a valid (mostly empty) summary rather than throwing.
	 */
	function modernizationBriefSummary(result = {}) {
		const phases = Array.isArray(result.roadmapPhases) ? result.roadmapPhases : [];
		const placements = Array.isArray(result.target?.placements) && result.target.placements.length
			? result.target.placements
			: (result.target?.contexts || result.contexts || []).map((item) => ({ ...item, placementType: item.placementType || item.packaging || "main-app" })).concat((result.target?.extracts || result.extracts || []).map((item) => ({ ...item, placementType: item.placementType || "external-service" })));
		const modules = placements.filter((item) => ["coldbox-module", "module"].includes(String(item.placementType || item.packaging || "").toLowerCase()));
		const extracts = placements.filter((item) => ["external-service", "microservice", "side-app", "extract"].includes(String(item.placementType || item.packaging || "").toLowerCase()));
		const effortCounts = { S: 0, M: 0, L: 0, XL: 0 };
		let riskyPhaseCount = 0;
		phases.forEach((phase) => {
			if (phase.effortSize && Object.prototype.hasOwnProperty.call(effortCounts, phase.effortSize)) effortCounts[phase.effortSize]++;
			if (["high", "critical"].includes(String(phase.riskLevel || "").toLowerCase())) riskyPhaseCount++;
		});
		const currentPhase = phases.find((phase) => phase.currentSlice) || null;
		return {
			hasPlan: !!(phases.length || placements.length || (result.target?.units || []).length),
			phaseCount: phases.length,
			effortCounts,
			riskyPhaseCount,
			packagingSplit: { centralized: Math.max(0, placements.length - modules.length - extracts.length), modules: modules.length, extracts: extracts.length },
			gateSummary: {
				failed: placements.reduce((count, item) => count + (item.gates || []).filter((gate) => String(gate.status || "").toLowerCase() === "fail").length, 0),
				unknown: placements.reduce((count, item) => count + (item.gates || []).filter((gate) => String(gate.status || "").toLowerCase() === "unknown").length, 0),
				decisionRequired: placements.filter((item) => item.decisionRequired).length
			},
			currentSlice: currentPhase ? {
				name: currentPhase.name || currentPhase.goal || currentPhase.id || "Current slice",
				effortSize: currentPhase.effortSize || "",
				riskLevel: currentPhase.riskLevel || "",
				effortDrivers: Array.isArray(currentPhase.effortDrivers) ? currentPhase.effortDrivers : []
			} : null,
			coverageStatus: result.coverage?.status || (result.coverage?.complete === true ? "complete" : "incomplete"),
			validationStatus: result.validation?.status || result.validation?.overallStatus || "unknown"
		};
	}

	return {
		phaseHasCodeLinks,
		modernizationItems,
		modernizationItemLabel,
		modernizationGenerationErrors,
		modernizationGenerationNotes,
		modernizationMessageIsNote,
		modernizationPlanIsHollow,
		modernizationGenerationSummary,
		modernizationValidationStatus,
		modernizationItemMeta,
		modernizationItemKey,
		modernizationPaneBanner,
		modernizationEvidenceBasisNote,
		buildModernizationArchitectureSubgraph,
		layoutModernizationArchitectureVertical,
		modernizationBriefSummary,
		MODERNIZATION_SIGNAL_GUIDE,
		modernizationSignalGuide,
		modernizationSignalLabel,
		modernizationSliceDifficulty
	};
});
