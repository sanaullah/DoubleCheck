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
			contexts: [(target.contexts || result.contexts || []).map((item) => ({ ...item, itemType: item.itemType || "context" })).concat((target.extracts || result.extracts || []).map((item) => ({ ...item, itemType: item.itemType || "extract" }))), "context"],
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
		if (targets.length || routes.length) return false;
		const mapped = phases.some((phase) => phaseHasCodeLinks(phase));
		const appFailed = modernizationGenerationErrors(result).some((item) => String(item.role || "") === "modernization-application");
		return appFailed || (phases.length > 0 && !mapped);
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
		if (item._modernizationType === "legacy-unit") {
			const range = item.startLine ? ` · lines ${item.startLine}${item.endLine && item.endLine !== item.startLine ? `–${item.endLine}` : ""}` : "";
			return `${item.layer || item.unitType || "legacy"}${range} · ${item.signalIds?.length || 0} signals · ${item.touchedTables?.length || 0} tables · ${provenance}`;
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
		const contexts = result.target?.contexts || result.contexts || [];
		const extracts = result.target?.extracts || result.extracts || [];
		const modules = contexts.filter((item) => String(item.packaging || "").toLowerCase() === "coldbox-module");
		const central = contexts.filter((item) => !modules.includes(item));

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
			totalEdges: edges.length
		};
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
		const contexts = result.target?.contexts || result.contexts || [];
		const extracts = result.target?.extracts || result.extracts || [];
		const modules = contexts.filter((item) => String(item.packaging || "").toLowerCase() === "coldbox-module");
		const effortCounts = { S: 0, M: 0, L: 0, XL: 0 };
		let riskyPhaseCount = 0;
		phases.forEach((phase) => {
			if (phase.effortSize && Object.prototype.hasOwnProperty.call(effortCounts, phase.effortSize)) effortCounts[phase.effortSize]++;
			if (["high", "critical"].includes(String(phase.riskLevel || "").toLowerCase())) riskyPhaseCount++;
		});
		const currentPhase = phases.find((phase) => phase.currentSlice) || null;
		return {
			hasPlan: !!(phases.length || contexts.length || extracts.length || (result.target?.units || []).length),
			phaseCount: phases.length,
			effortCounts,
			riskyPhaseCount,
			packagingSplit: { centralized: Math.max(0, contexts.length - modules.length), modules: modules.length, extracts: extracts.length },
			currentSlice: currentPhase ? { name: currentPhase.name || currentPhase.goal || currentPhase.id || "Current slice", effortSize: currentPhase.effortSize || "", riskLevel: currentPhase.riskLevel || "" } : null,
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
		modernizationValidationStatus,
		modernizationItemMeta,
		modernizationItemKey,
		modernizationPaneBanner,
		modernizationEvidenceBasisNote,
		buildModernizationArchitectureSubgraph,
		modernizationBriefSummary
	};
});
