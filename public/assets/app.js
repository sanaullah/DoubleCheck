// Detect current workspace from URL/page
function getCurrentWorkspace() {
	const path = window.location.pathname;
	if (path.startsWith("/modernize")) return "modernize";
	if (path.startsWith("/codegraph")) return "codegraph";
	if (path.startsWith("/review")) return "review";
	return "dashboard";
}

function resolveRunKind(run, fallbackWorkspace = state.workspace) {
	const kind = String(run?.runKind || fallbackWorkspace || "review").toLowerCase();
	if (kind === "modernize" || kind === "codegraph") return kind;
	return "review";
}

function workspaceDisplayName(kind) {
	if (kind === "modernize") return "Modernize";
	if (kind === "codegraph") return "CodeGraph";
	return "Review";
}

const state = {
	activeRun: null,
	eventSource: null,
	session: null,
	capabilities: {},
	statusPoll: null,
	closingStream: false,
	finishingRunId: "",
	didAutoResume: false,
	terminal: new Set(["succeeded", "partial", "failed", "cancelled"]),
	specialists: {},
	crew: {
		summary: "",
		source: ""
	},
	observations: [],
	observeFilter: "all",
	observeRoleFilter: "all",
	observeSearch: "",
	lastEventSequence: 0,
	lastTimelineKey: "",
	seenEventSequences: new Set(),
	observeRenderTimer: null,
	streamConnectedRunId: "",
	findings: [],
	selectedFindingId: "",
	findingSearch: "",
	findingSeverity: "all",
	findingReviewState: "all",
	findingSort: "priority",
	pendingFindingFingerprint: "",
	architectureSearch: "",
	architectureKind: "all",
	architectureGraph: null,
	architectureSelectedPath: "",
	architectureReviewScope: "full",
	projectTree: {
		path: "",
		files: [],
		selected: new Set(),
		loading: false,
		error: ""
	},
	history: {
		page: 1,
		totalPages: 0,
		rows: [],
		loading: false
	},
	commandMetrics: {
		files: 0,
		languages: [],
		findings: 0,
		specialistCompleted: 0,
		specialistTotal: 0
	},
	workspace: getCurrentWorkspace(),
	modernization: {
		result: null,
		loading: false,
		error: "",
		activePane: "overview",
		search: "",
		itemType: "all",
		validation: "all",
		decision: "all",
		context: "all",
		phase: "all",
		selectedItem: null,
		selectedPhaseId: "",
		selectedArchitectureId: "",
		showUnsliced: false,
		decisions: {},
		decisionNotes: {},
		decisionSelections: {},
		notice: "",
		noticeTone: "info"
	},
	codegraph: {
		result: null,
		snapshot: null,
		loading: false,
		error: "",
		mode: "cluster",
		layout: "cluster",
		selectedId: "",
		clusterId: "",
		focusId: "",
		focusSubgraph: null,
		issueTab: "cycles",
		viewport: null,
		layoutResult: null,
		viewTruncated: false,
		panning: false,
		panLast: null,
		showAi: true
	}
};

const statusLabels = {
	queued: "Queued",
	running: "Working",
	succeeded: "Succeeded",
	partial: "Completed with warnings",
	failed: "Failed",
	cancelled: "Cancelled",
	Idle: "Idle"
};

const phaseLabels = {
	queued: "Waiting to start",
	indexing: "Discovering files",
	"architecture-index": "Building symbol graph",
	planning: "Architecture + crew",
	deterministic: "Deterministic checks",
	specialists: "Specialist agents",
	"specialist-review": "Specialist agents",
	"deterministic-analysis": "Deterministic checks",
	"architecture-planning": "Architecture + crew",
	persisting: "Saving findings",
	completed: "Completed",
	cancelled: "Cancelled",
	failed: "Failed",
	"modernization-schema": "Sanitizing schema evidence",
	"modernization-inventory": "Cataloging CFML units",
	"modernization-signals": "Deriving coupling signals",
	"modernization-proposal": "Generating modernization proposals",
	"modernization-validation": "Validating proposal",
	"modernization-repair": "Repairing invalid items",
	"modernization-roadmap": "Assembling roadmap",
	"codegraph-index": "Indexing symbols",
	"codegraph-metrics": "Computing metrics",
	"codegraph-clusters": "Deriving clusters",
	"codegraph-narrative": "Optional narrative",
	"codegraph-persist": "Saving snapshot"
};

const eventLabels = {
	"run.status": "Status",
	"phase.started": "Phase",
	"task.progress": "Progress",
	"review.indexed": "Indexed",
	"review.graph": "Graph",
	"review.plan": "Plan",
	"review.specialist.progress": "Agent",
	"review.specialist.observe": "Trace",
	"review.specialists": "Agents",
	"review.findings": "Findings",
	"review.completed": "Completed",
	"run.completed": "Completed",
	"run.cancelled": "Cancelled",
	"run.error": "Error",
	"modernization.schema": "Schema evidence",
	"modernization.inventory": "Inventory",
	"modernization.signals": "Signals",
	"modernization.proposal.progress": "Proposal",
	"modernization.validation": "Validation",
	"modernization.repair": "Repair",
	"modernization.roadmap": "Roadmap",
	"modernization.completed": "Plan completed",
	"codegraph.index": "Graph index",
	"codegraph.metrics": "Graph metrics",
	"codegraph.clusters": "Clusters",
	"codegraph.narrative": "Narrative",
	"codegraph.completed": "Graph completed",
	"stream.error": "Stream",
	"stream.waiting": "Reconnect"
};

const pipelineOrder = [
	"scan",
	"architecture",
	"planning",
	"deterministic",
	"specialists",
	"completion"
];

const phasePipelineStage = {
	queued: "scan",
	indexing: "scan",
	"architecture-index": "architecture",
	planning: "planning",
	"architecture-planning": "planning",
	deterministic: "deterministic",
	"deterministic-analysis": "deterministic",
	specialists: "specialists",
	"specialist-review": "specialists",
	persisting: "completion",
	completed: "completion",
	cancelled: "completion",
	failed: "completion",
	"modernization-schema": "architecture",
	"modernization-inventory": "architecture",
	"modernization-signals": "planning",
	"modernization-proposal": "specialists",
	"modernization-validation": "completion",
	"modernization-repair": "completion",
	"modernization-roadmap": "completion",
	"codegraph-index": "architecture",
	"codegraph-metrics": "planning",
	"codegraph-clusters": "deterministic",
	"codegraph-narrative": "specialists",
	"codegraph-persist": "completion"
};

const pipelineLabels = {
	review: {
		aria: "Review pipeline",
		stages: {
			scan: "Repository scan",
			architecture: "Architecture model",
			planning: "Crew planning",
			deterministic: "Deterministic review",
			specialists: "Specialist analysis",
			completion: "Validate + save"
		}
	},
	modernize: {
		aria: "Modernize pipeline",
		stages: {
			scan: "Repository scan",
			architecture: "CFML inventory + schema",
			planning: "Signals + context packs",
			deterministic: "Evidence coverage",
			specialists: "Proposal agents",
			completion: "Validate + roadmap"
		}
	},
	codegraph: {
		aria: "CodeGraph pipeline",
		stages: {
			scan: "Repository scan",
			architecture: "Symbol index",
			planning: "Metrics",
			deterministic: "Clusters",
			specialists: "Optional narrative",
			completion: "Persist snapshot"
		}
	}
};

const emptyStateIcons = {
	findings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l2 2 4-4"/><path d="M5 5h14v14H5z"/></svg>',
	search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
	detail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
	history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
	architecture: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="7" r="2.5"/><circle cx="8" cy="18" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M8.2 7.8 15.8 8.8M7.2 15.8 15.5 15.2M8.3 8.3 9.5 15.7"/></svg>',
	feed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10M4 18h7"/></svg>',
	inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"/><path d="m4 8 2.5-3h11L20 8"/><path d="M9 13h6"/></svg>'
};

function emptyStateHtml({ icon = "inbox", title = "", hint = "" } = {}) {
	const svg = emptyStateIcons[icon] || emptyStateIcons.inbox;
	const hintHtml = hint ? `<span class="empty-state-hint">${hint}</span>` : "";
	return `<div class="empty-state" role="status"><span class="empty-state-icon" aria-hidden="true">${svg}</span><strong class="empty-state-title">${title}</strong>${hintHtml}</div>`;
}

function emptyStateElement(options = {}) {
	const wrap = document.createElement("div");
	wrap.innerHTML = emptyStateHtml(options);
	return wrap.firstElementChild;
}

function specialistWarningText(result = {}) {
	const failures = (result.specialists?.results || [])
		.filter((item) => item.status && item.status !== "succeeded")
		.map((item) => `${item.role}: ${item.error || item.status}`);
	if (!failures.length) return "";
	const realFailures = failures.filter((text) => !/circuit is open/i.test(text));
	if (realFailures.length) {
		return `Specialist issues: ${realFailures.join(" · ")}`;
	}
	return "AI specialists were paused after recent provider failures. Start another review to retry; deterministic findings are still kept.";
}

const stageLabels = {
	"task-started": "Starting",
	"provider-attempt": "Calling provider",
	"provider-run": "Running specialist",
	"provider-llm": "Calling model",
	"provider-llm-done": "Model responded",
	"provider-stream": "Streaming response",
	"provider-complete": "Provider finished",
	"provider-chat-fallback": "Completing via chat",
	"provider-retry": "Retrying provider",
	"provider-chat-request": "Chat request",
	"provider-chat-response": "Chat response",
	"tool-call": "Using tool",
	"tool-done": "Tool finished",
	"prompt-sent": "Prompt sent",
	"response-accepted": "Response accepted",
	"task-completed": "Task finished",
	queued: "Queued",
	running: "Working",
	succeeded: "Succeeded",
	failed: "Failed",
	timed_out: "Timed out",
	circuit_open: "Provider paused",
	budget_exceeded: "Budget exceeded"
};

function resetSpecialistBoard() {
	state.specialists = {};
	state.crew = { summary: "", source: "" };
	if (elements.specialistGrid) elements.specialistGrid.innerHTML = "";
	if (elements.specialistBoard) elements.specialistBoard.hidden = true;
	if (elements.crewSummary) {
		elements.crewSummary.hidden = true;
		elements.crewSummary.textContent = "";
	}
	if (elements.crewSourceBadge) {
		elements.crewSourceBadge.hidden = true;
		elements.crewSourceBadge.textContent = "";
	}
	if (elements.crewBoardTitle) {
		elements.crewBoardTitle.textContent = "Assigned specialists";
	}
	resetObservability();
}

function seedCrewFromPlan(detail = {}) {
	if (!detail || typeof detail !== "object") return;
	const crewSource = detail.crewSource || detail.source || "";
	const crewSummary = detail.crewSummary || detail.summary || "";
	if (crewSource || crewSummary) {
		state.crew = {
			source: crewSource || state.crew.source || "",
			summary: crewSummary || state.crew.summary || ""
		};
	}
	const tasks = Array.isArray(detail.tasks) ? detail.tasks : [];
	if (tasks.length) {
		tasks.forEach((task) => {
			if (!task?.role) return;
			upsertSpecialist(task.role, {
				status: task.status || "queued",
				stage: task.stage || "queued",
				message: task.message || "Queued from crew plan",
				brief: task.brief || "",
				objective: task.objective || ""
			});
		});
		return;
	}
	const roles = detail.roles || detail.selectedRoles || [];
	roles.forEach((role) => {
		upsertSpecialist(role, {
			status: "queued",
			stage: "queued",
			message: "Queued from review plan"
		});
	});
}

function updateCrewBoardHeading() {
	if (elements.crewSummary) {
		if (state.crew.summary) {
			elements.crewSummary.hidden = false;
			elements.crewSummary.textContent = state.crew.summary;
		} else {
			elements.crewSummary.hidden = true;
			elements.crewSummary.textContent = "";
		}
	}
	if (elements.crewSourceBadge) {
		if (state.crew.source) {
			elements.crewSourceBadge.hidden = false;
			elements.crewSourceBadge.textContent = state.crew.source === "llm"
				? "Planned crew"
				: "Default crew";
		} else {
			elements.crewSourceBadge.hidden = true;
			elements.crewSourceBadge.textContent = "";
		}
	}
	if (elements.crewBoardTitle) {
		const count = Object.keys(state.specialists || {}).length;
		elements.crewBoardTitle.textContent = count
			? `${count} assigned specialist${count === 1 ? "" : "s"}`
			: "Assigned specialists";
	}
}

function resetObservability() {
	state.observations = [];
	state.observeRoleFilter = "all";
	state.lastEventSequence = 0;
	state.lastTimelineKey = "";
	state.seenEventSequences = new Set();
	state.streamConnectedRunId = "";
	if (state.observeRenderTimer) {
		clearTimeout(state.observeRenderTimer);
		state.observeRenderTimer = null;
	}
	if (elements.observeFeed) elements.observeFeed.innerHTML = "";
	if (elements.observePanel) elements.observePanel.hidden = true;
	if (elements.jumpTrace) elements.jumpTrace.hidden = true;
	if (elements.aiflightLink) elements.aiflightLink.href = "/aiflight/";
	if (elements.observeRoleFilters) {
		elements.observeRoleFilters.hidden = true;
		elements.observeRoleFilters.innerHTML = "";
	}
	if (elements.observeSummary) {
		elements.observeSummary.hidden = true;
		elements.observeSummary.innerHTML = "";
	}
	if (elements.observeStageMap) {
		elements.observeStageMap.hidden = true;
		elements.observeStageMap.innerHTML = "";
	}
	if (elements.observeRunContext) {
		elements.observeRunContext.textContent =
			"Select a review to inspect its phases, spans, generations, tool calls, timing, failures, inputs, and outputs.";
	}
	if (elements.observeTraceStatus) {
		elements.observeTraceStatus.textContent = "Idle";
		elements.observeTraceStatus.dataset.status = "idle";
	}
	if (elements.traceCount) elements.traceCount.textContent = "0 observations";
}

function showObservabilityPanel() {
	if (!elements.observePanel) return;
	const count = state.observations.length;
	const hasRun = Boolean(state.activeRun);
	elements.observePanel.hidden = !(count || hasRun);
	if (elements.jumpTrace) {
		elements.jumpTrace.hidden = !hasRun;
	}
	if (elements.traceCount) {
		elements.traceCount.textContent = `${count} observation${count === 1 ? "" : "s"}`;
	}
	renderObserveIdentity();
	scheduleObservabilityRender();
}

function seedClientObservation(clientKey, entry = {}) {
	if (!clientKey) return;
	if (state.observations.some((item) => item.clientKey === clientKey)) return;
	pushTimeline({
		...entry,
		clientKey,
		kind: entry.kind || "phase",
		observationType: entry.observationType || "phase"
	});
}

function ensureRunAcceptedObservation(run) {
	if (!run?.id) return;
	const clientKey = `run-accepted:${run.id}`;
	if (
		state.observations.some(
			(item) =>
				item.clientKey === clientKey ||
				item.title === "Run accepted"
		)
	) {
		return;
	}
	const preview = run.message || `${scopeLabel(run.mode)} · ${friendlyStatus(run.status || "queued")}`;
	seedClientObservation(clientKey, {
		title: "Run accepted",
		preview,
		output: preview,
		meta: {
			status: friendlyStatus(run.status || "queued"),
			mode: run.mode || ""
		},
		at: run.createdAt || new Date().toISOString()
	});
}

function ensureStreamObservation(run, reconnected = false) {
	if (!run?.id) return;
	const clientKey = reconnected
		? `stream-reconnected:${run.id}`
		: `stream-connected:${run.id}`;
	seedClientObservation(clientKey, {
		title: reconnected ? "Live stream reconnected" : "Live stream connected",
		preview: reconnected
			? "Reconnected to local SSE progress stream"
			: "Listening on local SSE progress stream",
		output: reconnected
			? "Reconnected to local SSE progress stream"
			: "Listening on local SSE progress stream",
		meta: { status: "Live" },
		at: new Date().toISOString()
	});
}

function scheduleObservabilityRender() {
	if (state.observeRenderTimer) {
		clearTimeout(state.observeRenderTimer);
	}
	state.observeRenderTimer = setTimeout(() => {
		state.observeRenderTimer = null;
		renderObservability();
	}, 120);
}

function rememberEventSequence(sequence) {
	const seq = Number(sequence) || 0;
	if (!seq) return true;
	if (state.seenEventSequences.has(seq)) return false;
	state.seenEventSequences.add(seq);
	state.lastEventSequence = Math.max(state.lastEventSequence || 0, seq);
	return true;
}

function observationTypeFor(kind = "", explicit = "") {
	if (explicit) return explicit;
	switch (kind) {
		case "llm": return "generation";
		case "tool": return "tool";
		case "prompt":
		case "response":
		case "agent": return "span";
		case "fallback": return "event";
		case "phase": return "phase";
		default: return kind || "event";
	}
}

function pushTimeline(entry = {}) {
	const kind = entry.kind || "phase";
	const observationType = observationTypeFor(kind, entry.observationType);
	const title = entry.title || "Update";
	const input = entry.input || "";
	const output = entry.output || "";
	const preview = entry.preview || entry.message || input || output || "";
	const key = `${observationType}|${kind}|${entry.role || ""}|${title}|${preview.slice(0, 120)}`;
	if (key === state.lastTimelineKey && (kind === "phase" || observationType === "phase")) {
		return;
	}
	state.lastTimelineKey = key;

	const round = entry.meta?.round ?? entry.modelParameters?.round;
	const mode = entry.meta?.mode || entry.modelParameters?.mode || "";
	const toolName = entry.meta?.toolName || entry.modelParameters?.toolName || "";
	const pairKey =
		observationType === "generation" && round != null
			? `gen:${entry.role || ""}:${mode || "agent"}:${round}`
			: observationType === "tool" && toolName
				? `tool:${entry.role || ""}:${toolName}:${entry.meta?.toolCallId || ""}`
				: "";

	if (pairKey) {
		const existing = state.observations.find((item) => item.pairKey === pairKey);
		if (existing) {
			if (input) existing.input = input;
			if (output) existing.output = output;
			if (preview && !existing.preview) existing.preview = preview;
			existing.truncated = existing.truncated || !!entry.truncated;
			existing.characters = Math.max(existing.characters || 0, entry.characters || 0);
			existing.meta = { ...existing.meta, ...(entry.meta || {}) };
			existing.modelParameters = {
				...existing.modelParameters,
				...(entry.modelParameters || {})
			};
			existing.usage = { ...existing.usage, ...(entry.usage || {}) };
			if (entry.durationMs) existing.durationMs = entry.durationMs;
			if (entry.model) existing.model = entry.model;
			if (output) existing.title = existing.title.replace(/^LLM request/, "LLM generation");
			if (output && existing.title.startsWith("Tool call")) {
				existing.title = existing.title.replace(/^Tool call/, "Tool");
			}
			if (existing.startedAtMs && entry.at) {
				const end = Date.parse(entry.at);
				if (!Number.isNaN(end) && !existing.durationMs) {
					existing.durationMs = Math.max(0, end - existing.startedAtMs);
				}
			}
			existing.at = entry.at || existing.at || new Date().toISOString();
			showObservabilityPanel();
			return;
		}
	}

	const at = entry.at || new Date().toISOString();
	const observation = {
		id: `${Date.now()}-${state.observations.length}-${Math.random().toString(16).slice(2, 6)}`,
		clientKey: entry.clientKey || "",
		pairKey,
		role: entry.role || "",
		stage: entry.stage || "",
		message: entry.message || "",
		kind,
		observationType,
		title,
		preview,
		input,
		output,
		truncated: !!entry.truncated,
		characters: entry.characters || 0,
		model: entry.model || entry.meta?.model || "",
		modelParameters: entry.modelParameters || {},
		usage: entry.usage || {},
		durationMs: entry.durationMs || entry.meta?.durationMs || 0,
		startedAtMs: observationType === "generation" && !output ? Date.parse(at) || Date.now() : 0,
		meta: entry.meta || {},
		at,
		expanded: false
	};
	state.observations.unshift(observation);
	if (state.observations.length > 250) {
		state.observations.length = 250;
	}
	showObservabilityPanel();
}

function appendObservation(detail = {}) {
	const observe = detail.observe;
	if (!observe || !observe.kind) return;
	const meta = observe.meta || {};
	const modelParameters = observe.modelParameters || {};
	let input = observe.input || "";
	let output = observe.output || "";
	const preview = observe.preview || "";
	if (!input && !output && preview) {
		if (meta.io === "output" || observe.kind === "response" || observe.kind === "fallback") {
			output = preview;
		} else {
			input = preview;
		}
	}
	// Keep a visible body even when older/partial events omit input/output keys.
	if (!input && !output && !preview && observe.characters) {
		output = `(Payload body missing; recorded size ${observe.characters} characters.)`;
	}
	pushTimeline({
		role: detail.role || "",
		stage: detail.stage || "",
		message: detail.message || "",
		kind: observe.kind,
		observationType: observe.observationType || "",
		title: observe.title || observe.kind,
		preview: preview || input || output || detail.message || "",
		input,
		output,
		truncated: !!observe.truncated,
		characters: observe.characters || 0,
		model: observe.model || meta.model || "",
		modelParameters,
		usage: observe.usage || {},
		durationMs: observe.durationMs || meta.durationMs || 0,
		meta
	});
	upsertSpecialist(detail.role, {
		message: `${observe.kind}: ${observe.title || detail.message || observe.kind}`
	});
}

function timelineFromEvent(type, payload = {}, message = "") {
	const run = payload?.data?.run || {};
	const detail = payload?.data?.detail || {};
	const at = payload?.timestamp || new Date().toISOString();
	const phase = run.currentPhase || "";
	const progress = run.progress != null ? `${run.progress}%` : "";

	if (type === "review.specialist.observe") {
		return;
	}
	if (type === "review.specialist.progress" && detail.role) {
		const stage = detail.stage || "";
		const keepStages = new Set([
			"task-started",
			"task-completed",
			"provider-complete",
			"provider-chat-fallback",
			"provider-retry",
			"response-accepted"
		]);
		if (!keepStages.has(stage)) {
			return;
		}
		pushTimeline({
			kind: "agent",
			observationType: "event",
			role: detail.role,
			stage,
			title: stageLabels[stage] || stage || "Agent update",
			preview: detail.message || message,
			output: detail.message || message,
			meta: {
				status: detail.status || "",
				attempt: detail.attempt || "",
				progress
			},
			at
		});
		return;
	}
	if (type === "review.specialists" && detail) {
		pushTimeline({
			kind: "agent",
			observationType: "span",
			title: "Specialists finished",
			preview: message,
			output: message,
			meta: {
				completed: detail.completedTasks,
				failed: detail.failedTasks,
				findings: detail.findingCount
			},
			at
		});
		(detail.results || []).forEach((item) => {
			pushTimeline({
				kind: item.status === "succeeded" ? "response" : "fallback",
				observationType: item.status === "succeeded" ? "span" : "event",
				role: item.role || "",
				title: item.status === "succeeded" ? "Specialist succeeded" : "Specialist failed",
				preview: item.error || item.summary || item.status || "",
				output: item.error || item.summary || item.status || "",
				meta: { findings: (item.findings || []).length },
				at
			});
		});
		return;
	}
	const modernizationDetail = payload?.data?.detail || payload?.data || {};
	if (type.startsWith("modernization.") && modernizationDetail) {
		const progress = modernizationDetail.progress != null ? ` · ${modernizationDetail.progress}%` : "";
		message = modernizationDetail.message || modernizationDetail.stage || `${friendlyEvent(type)}${progress}`;
		if (modernizationDetail.filesScanned != null) state.commandMetrics.files = modernizationDetail.filesScanned;
		if (modernizationDetail.unitCount != null) state.commandMetrics.findings = modernizationDetail.unitCount;
		updateCommandMetrics();
	}
	if (type === "review.plan" && detail) {
		const crewSource = detail.crewSource || "deterministic";
		const crewSummary = detail.crewSummary || "";
		const crewLabel = crewSource === "llm" ? "Planned crew" : "Default crew";
		seedCrewFromPlan(detail);
		pushTimeline({
			kind: "phase",
			observationType: "phase",
			title: crewSummary ? `Crew: ${crewSummary}` : "Review plan ready",
			preview: message,
			output: message,
			meta: {
				tasks: `${detail.taskCount}/${detail.taskLimit || 0}`,
				roles: (detail.roles || detail.selectedRoles || []).join(", "),
				crew: crewLabel,
				tokens: `${detail.allocatedTokens || 0}/${detail.tokenBudget || 0}`
			},
			at
		});
		return;
	}
	if (type === "review.indexed" && detail) {
		pushTimeline({
			kind: "phase",
			observationType: "phase",
			title: "Files indexed",
			preview: message,
			output: message,
			meta: {
				files: detail.filesScanned,
				languages: (detail.languages || []).join(", "),
				scope: detail.scope || ""
			},
			at
		});
		return;
	}
	if (type === "review.graph" && detail) {
		pushTimeline({
			kind: "phase",
			observationType: "phase",
			title: "Architecture graph built",
			preview: message,
			output: message,
			meta: {
				symbols: detail.symbolCount,
				deps: detail.dependencyCount,
				impacts: detail.impactCount || 0
			},
			at
		});
		return;
	}
	if (type === "review.findings" && detail) {
		pushTimeline({
			kind: "phase",
			observationType: "phase",
			title: "Findings retained",
			preview: message,
			output: message,
			meta: { source: detail.source, count: detail.count },
			at
		});
		return;
	}
	if (type === "phase.started" || type === "task.progress" || type === "run.status") {
		const phaseTitle = friendlyPhase(phase);
		const detailMessage = run.message || message || "";
		// Prefer the concrete run message over vague phase labels like "Waiting to start".
		const title = detailMessage && phaseTitle && detailMessage !== phaseTitle
			? detailMessage
			: (detailMessage || phaseTitle || friendlyEvent(type));
		pushTimeline({
			kind: "phase",
			observationType: "phase",
			title,
			preview: detailMessage || phaseTitle,
			output: detailMessage || phaseTitle,
			meta: {
				status: friendlyStatus(run.status || ""),
				phase: phaseTitle || phase || "",
				progress
			},
			at
		});
		return;
	}
	if (type === "run.completed" || type === "review.completed" || type === "run.cancelled" || type === "run.error") {
		pushTimeline({
			kind: type === "run.error" ? "fallback" : "phase",
			observationType: type === "run.error" ? "event" : "phase",
			title: friendlyEvent(type),
			preview: run.message || message,
			output: run.message || message,
			meta: { status: friendlyStatus(run.status || ""), progress },
			at
		});
	}
}

function formatObserveParams(item) {
	const params = {
		...(item.modelParameters || {}),
		...(item.meta || {})
	};
	if (item.model && !params.model) params.model = item.model;
	if (item.role && !params.role) params.role = item.role;
	if (item.characters && params.promptCharacters == null) {
		params.characters = item.characters;
	}
	if (item.truncated) params.truncated = true;
	if (item.durationMs) params.durationMs = `${item.durationMs} ms`;
	const usage = item.usage || {};
	if (usage.promptTokens) params.promptTokens = usage.promptTokens;
	if (usage.completionTokens) params.completionTokens = usage.completionTokens;
	if (usage.totalTokens) params.totalTokens = usage.totalTokens;
	// Legacy runs labeled a budget ceiling as estimatedCostUsd and preview size as characters.
	if (params.estimatedCostUsd != null && params.budgetCeilingUsd == null) {
		params.budgetCeilingUsd = params.estimatedCostUsd;
	}
	delete params.estimatedCostUsd;
	delete params.io;
	if (
		params.previewCharacters != null &&
		params.characters != null &&
		Number(params.characters) === Number(params.previewCharacters) &&
		params.promptCharacters == null
	) {
		delete params.characters;
	}
	return Object.entries(params).filter(([, value]) => value !== "" && value != null);
}

function observeMatchesSearch(item, query) {
	if (!query) return true;
	const haystack = [
		item.role,
		item.kind,
		item.observationType,
		item.title,
		item.model,
		item.input,
		item.output,
		item.preview,
		JSON.stringify(item.meta || {}),
		JSON.stringify(item.modelParameters || {})
	].join("\n").toLowerCase();
	return haystack.includes(query);
}

function isFailureObservation(item = {}) {
	const title = String(item.title || "").toLowerCase();
	const preview = String(item.preview || item.message || item.output || "").toLowerCase();
	const status = String(item.meta?.status || "").toLowerCase();
	if (title.includes("failed") || title.includes("unavailable")) return true;
	if (status === "failed" || status === "timed_out" || status === "circuit_open" || status === "budget_exceeded") {
		return true;
	}
	if (
		preview.includes("deadline exceeded") ||
		preview.includes("not valid json") ||
		preview.includes("response is empty") ||
		preview.includes("empty content") ||
		preview.includes("specialist review unavailable") ||
		preview.includes("circuit is open") ||
		preview.includes("tool-call markup")
	) {
		return true;
	}
	const type = item.observationType || observationTypeFor(item.kind);
	if (type === "generation") {
		const output = String(item.output || "").trim();
		const titleText = String(item.title || "");
		// Completed response rows with no usable content.
		if (!output && /generation|response|chat review/i.test(titleText) && !/request/i.test(titleText)) {
			return true;
		}
		if (output && /response|generation|chat/i.test(titleText)) {
			if (/not valid json|response is empty|empty content|tool-call markup|deadline exceeded/i.test(output)) {
				return true;
			}
			if (!looksLikeJsonObject(output) && output.length < 24 && /error|failed|empty/i.test(output)) {
				return true;
			}
		}
	}
	return false;
}

function isRetryObservation(item = {}) {
	if (item.kind === "retry") return true;
	const title = String(item.title || "").toLowerCase();
	const reason = String(item.meta?.reason || "").toLowerCase();
	return (
		(item.kind === "fallback" || item.observationType === "event") &&
		(
			title.includes("retry") ||
			["invalid-json", "empty-content", "tool-call-markup"].includes(reason)
		)
	);
}

function looksLikeJsonObject(text) {
	const trimmed = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
	return trimmed.startsWith("{") && trimmed.includes("}");
}

function failureSortKey(item) {
	if (!isFailureObservation(item)) return 1;
	const title = String(item.title || "").toLowerCase();
	if (title.includes("specialist failed") || item.kind === "fallback") return 0;
	return 0.5;
}

function observabilityStats(rows) {
	const stats = {
		total: rows.length,
		generations: 0,
		tools: 0,
		spans: 0,
		events: 0,
		phases: 0,
		fallbacks: 0,
		retries: 0,
		failures: 0,
		durationMs: 0,
		tokens: 0,
		roles: new Set()
	};
	rows.forEach((item) => {
		const type = item.observationType || observationTypeFor(item.kind);
		if (type === "generation") stats.generations++;
		else if (type === "tool") stats.tools++;
		else if (type === "span") stats.spans++;
		else if (type === "phase") stats.phases++;
		else stats.events++;
		if (item.kind === "fallback") stats.fallbacks++;
		if (isRetryObservation(item)) stats.retries++;
		if (isFailureObservation(item)) stats.failures++;
		stats.durationMs += Number(item.durationMs) || 0;
		stats.tokens += Number(item.usage?.totalTokens || item.meta?.totalTokens || 0) || 0;
		if (item.role) stats.roles.add(item.role);
	});
	return stats;
}

function renderObserveSummary(rows) {
	if (!elements.observeSummary) return;
	if (!rows.length) {
		elements.observeSummary.hidden = true;
		elements.observeSummary.innerHTML = "";
		return;
	}
	const stats = observabilityStats(rows);
	elements.observeSummary.hidden = false;
	elements.observeSummary.innerHTML = `
		<span><strong>${stats.total}</strong> observations</span>
		<span><strong>${stats.generations}</strong> generations</span>
		<span><strong>${stats.tools}</strong> tools</span>
		<span><strong>${stats.phases}</strong> phases</span>
		<span><strong>${stats.spans}</strong> spans</span>
		<span><strong>${stats.retries}</strong> retries</span>
		<span><strong>${stats.failures}</strong> failures</span>
		<span><strong>${stats.roles.size}</strong> roles</span>
		<span><strong>${stats.durationMs ? `${stats.durationMs} ms` : "—"}</strong> latency</span>
		<span><strong>${stats.tokens || "—"}</strong> tokens</span>
	`;
}

function renderObserveIdentity() {
	const run = state.activeRun;
	if (elements.observeTraceStatus) {
		if (!run) {
			elements.observeTraceStatus.textContent = "Idle";
			elements.observeTraceStatus.dataset.status = "idle";
		} else if (state.terminal.has(run.status)) {
			elements.observeTraceStatus.textContent = friendlyStatus(run.status);
			elements.observeTraceStatus.dataset.status = run.status;
		} else if (run.status === "queued") {
			elements.observeTraceStatus.textContent = "Queued";
			elements.observeTraceStatus.dataset.status = "queued";
		} else if (state.eventSource) {
			elements.observeTraceStatus.textContent = "Live";
			elements.observeTraceStatus.dataset.status = "running";
		} else {
			elements.observeTraceStatus.textContent = friendlyStatus(run.status || "running");
			elements.observeTraceStatus.dataset.status = run.status || "running";
		}
	}
	if (!elements.observeRunContext) return;
	if (!run) {
		elements.observeRunContext.textContent =
			"Select a review to inspect its phases, spans, generations, tool calls, timing, failures, inputs, and outputs.";
		return;
	}
	const created = run.createdAt ? new Date(run.createdAt) : null;
	const createdLabel = created && !Number.isNaN(created.getTime())
		? created.toLocaleString()
		: "time unavailable";
	elements.observeRunContext.textContent = [
		`Trace ${run.id}`,
		run.projectPath || "local repository",
		scopeLabel(run.mode),
		presetLabelForRun(run),
		createdLabel
	].join(" · ");
}

function renderObserveStageMap(rows) {
	if (!elements.observeStageMap) return;
	const phases = rows.filter((item) =>
		(item.observationType || observationTypeFor(item.kind)) === "phase"
	);
	elements.observeStageMap.innerHTML = "";
	if (!phases.length) {
		elements.observeStageMap.hidden = true;
		return;
	}
	const seen = new Set();
	phases.forEach((item) => {
		const stageKey = String(
			item.meta?.phase || item.meta?.status || item.title || item.id
		).trim().toLowerCase();
		if (!stageKey || seen.has(stageKey)) return;
		seen.add(stageKey);
		const stage = document.createElement("div");
		stage.className = `observe-stage${isFailureObservation(item) ? " is-failure" : ""}`;
		const title = document.createElement("strong");
		title.textContent = item.title || friendlyPhase(item.meta?.phase) || "Review phase";
		const detail = document.createElement("small");
		const duration = Number(item.durationMs) || 0;
		detail.textContent = duration
			? `${duration} ms`
			: (item.meta?.status || item.meta?.phase || "recorded");
		stage.appendChild(title);
		stage.appendChild(detail);
		elements.observeStageMap.appendChild(stage);
	});
	elements.observeStageMap.hidden = !elements.observeStageMap.childElementCount;
}

function renderObserveRoleFilters() {
	if (!elements.observeRoleFilters) return;
	const roles = [...new Set(
		state.observations.map((item) => item.role).filter(Boolean)
	)].sort((a, b) => a.localeCompare(b));
	if (!roles.length) {
		elements.observeRoleFilters.hidden = true;
		elements.observeRoleFilters.innerHTML = "";
		if (state.observeRoleFilter !== "all") {
			state.observeRoleFilter = "all";
		}
		return;
	}
	if (
		state.observeRoleFilter !== "all" &&
		!roles.includes(state.observeRoleFilter)
	) {
		state.observeRoleFilter = "all";
	}
	elements.observeRoleFilters.hidden = false;
	elements.observeRoleFilters.innerHTML = "";
	const buttons = [
		{ value: "all", label: "All roles" },
		...roles.map((role) => ({ value: role, label: role }))
	];
	buttons.forEach((item) => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "observe-filter";
		button.dataset.observeRole = item.value;
		button.textContent = item.label;
		button.classList.toggle("is-active", state.observeRoleFilter === item.value);
		elements.observeRoleFilters.appendChild(button);
	});
}

function filteredObservations() {
	const filter = state.observeFilter || "all";
	const roleFilter = state.observeRoleFilter || "all";
	const query = (state.observeSearch || "").trim().toLowerCase();
	const rows = state.observations.filter((item) => {
		if (roleFilter !== "all" && item.role !== roleFilter) {
			return false;
		}
		if (filter === "failures") {
			if (!isFailureObservation(item)) return false;
		} else if (filter !== "all" && item.observationType !== filter && item.kind !== filter) {
			return false;
		}
		return observeMatchesSearch(item, query);
	});
	return rows.slice().sort((left, right) => {
		if (filter === "failures" || filter === "all") {
			const failDelta = failureSortKey(left) - failureSortKey(right);
			if (failDelta !== 0) return failDelta;
		}
		const leftAt = Date.parse(left.at || "") || 0;
		const rightAt = Date.parse(right.at || "") || 0;
		return rightAt - leftAt;
	});
}

function createObserveIoBlock(label, text, tone = "") {
	const block = document.createElement("div");
	block.className = `observe-io-block ${tone}`.trim();
	block.innerHTML = `
		<div class="observe-section-heading">
			<div class="observe-section-label"></div>
			<button type="button" class="observe-copy">Copy</button>
		</div>
		<pre></pre>
	`;
	block.querySelector(".observe-section-label").textContent = label;
	block.querySelector("pre").textContent = text;
	block.querySelector(".observe-copy").addEventListener("click", async (event) => {
		event.stopPropagation();
		const button = event.currentTarget;
		try {
			await navigator.clipboard.writeText(text);
			button.textContent = "Copied";
			setTimeout(() => {
				button.textContent = "Copy";
			}, 1200);
		} catch (error) {
			button.textContent = "Failed";
			setTimeout(() => {
				button.textContent = "Copy";
			}, 1200);
		}
	});
	return block;
}

function renderObservability() {
	if (!elements.observePanel || !elements.observeFeed) return;
	const filter = state.observeFilter || "all";
	const roleFilter = state.observeRoleFilter || "all";
	const query = (state.observeSearch || "").trim().toLowerCase();
	renderObserveRoleFilters();
	const rows = filteredObservations();
	elements.observePanel.hidden = false;
	if (elements.observeExport) {
		elements.observeExport.hidden = !state.activeRun?.id;
	}
	renderObserveIdentity();
	renderObserveSummary(rows);
	renderObserveStageMap(state.observations);
	const previousScroll = elements.observeFeed.scrollTop;
	elements.observeFeed.innerHTML = "";
	if (!rows.length) {
		const empty = document.createElement("li");
		empty.className = "empty-state-item";
		const parts = [];
		if (filter === "failures") parts.push("failure");
		else if (filter !== "all") parts.push(filter);
		if (roleFilter !== "all") parts.push(roleFilter);
		const filtered = Boolean(parts.length || query);
		empty.innerHTML = emptyStateHtml({
			icon: filtered ? "search" : "feed",
			title: filtered
				? "No matching observations"
				: (state.activeRun ? "Waiting for first server event…" : "No trace selected"),
			hint: filtered
				? `No matching ${parts.length ? parts.join(" ") + " " : ""}observations${query ? " for this search" : ""}.`
				: (state.activeRun
					? "Live observations will appear here as the review progresses."
					: "Start or select a run to inspect generations, tool calls, inputs, and outputs.")
		});
		elements.observeFeed.appendChild(empty);
		return;
	}

	const groups = new Map();
	rows.forEach((item) => {
		const type = item.observationType || observationTypeFor(item.kind);
		const key = item.role || (type === "phase" ? "run lifecycle" : "general");
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key).push(item);
	});

	const orderedGroups = [...groups.entries()];
	if (filter === "failures") {
		orderedGroups.sort((left, right) => {
			const leftFail = left[1].filter(isFailureObservation).length;
			const rightFail = right[1].filter(isFailureObservation).length;
			return rightFail - leftFail || left[0].localeCompare(right[0]);
		});
	}

	orderedGroups.forEach(([groupName, items]) => {
		const header = document.createElement("li");
		header.className = "observe-group";
		const failCount = items.filter(isFailureObservation).length;
		header.textContent = failCount
			? `${groupName} · ${failCount} failure${failCount === 1 ? "" : "s"}`
			: groupName;
		elements.observeFeed.appendChild(header);

		items.forEach((item) => {
			const li = document.createElement("li");
			const type = item.observationType || observationTypeFor(item.kind);
			const failed = isFailureObservation(item);
			const retry = isRetryObservation(item);
			li.className = `observe-item kind-${item.kind} type-${type}${failed ? " is-failure" : ""}${retry ? " is-retry" : ""}`;
			li.dataset.id = item.id;
			const stamp = item.at ? new Date(item.at) : null;
			const timeText = stamp && !Number.isNaN(stamp.getTime()) ? stamp.toLocaleTimeString() : "";
			const params = formatObserveParams(item);
			const hasInput = !!(item.input && String(item.input).trim());
			const hasOutput = !!(item.output && String(item.output).trim());
			const hasPreview = !!(item.preview && String(item.preview).trim());
			const open = item.expanded === true;
			const latency = item.durationMs ? `${item.durationMs} ms` : "";
			const tokens = item.usage?.totalTokens || item.meta?.totalTokens || "";

			li.innerHTML = `
				<button type="button" class="observe-summary">
					<span class="observe-kind"></span>
					<strong class="observe-role"></strong>
					<span class="observe-fail-badge" hidden>Failure</span>
					<span class="observe-title"></span>
					<span class="observe-model"></span>
					<span class="observe-latency"></span>
					<span class="observe-time"></span>
				</button>
				<div class="observe-body"></div>
			`;
			li.querySelector(".observe-kind").textContent = type;
			li.querySelector(".observe-role").textContent = item.role || item.kind || "trace";
			const failBadge = li.querySelector(".observe-fail-badge");
			if (failed) failBadge.hidden = false;
			li.querySelector(".observe-title").textContent = item.title;
			li.querySelector(".observe-model").textContent = [
				item.model || params.find(([k]) => k === "model")?.[1] || "",
				tokens ? `${tokens} tok` : ""
			].filter(Boolean).join(" · ");
			li.querySelector(".observe-latency").textContent = latency;
			li.querySelector(".observe-time").textContent = timeText;

			const body = li.querySelector(".observe-body");
			body.hidden = !open;
			li.classList.toggle("is-open", open);

			if (params.length) {
				const meta = document.createElement("div");
				meta.className = "observe-params";
				const heading = document.createElement("div");
				heading.className = "observe-section-label";
				heading.textContent = "Parameters";
				meta.appendChild(heading);
				const grid = document.createElement("dl");
				grid.className = "observe-param-grid";
				params.slice(0, 16).forEach(([key, value]) => {
					const dt = document.createElement("dt");
					dt.textContent = key;
					const dd = document.createElement("dd");
					dd.textContent = String(value);
					grid.appendChild(dt);
					grid.appendChild(dd);
				});
				meta.appendChild(grid);
				body.appendChild(meta);
			}

			const io = document.createElement("div");
			io.className = "observe-io";
			if (hasInput) io.appendChild(createObserveIoBlock("Input", item.input, "input"));
			if (hasOutput) io.appendChild(createObserveIoBlock("Output", item.output, "output"));
			if (!hasInput && !hasOutput && hasPreview) {
				io.appendChild(createObserveIoBlock("Payload", item.preview));
			}
			if (!hasInput && !hasOutput && !hasPreview) {
				io.appendChild(createObserveIoBlock(
					"Payload",
					"(No payload captured for this step. Newer runs record full LLM input/output.)"
				));
			}
			if (io.childNodes.length) body.appendChild(io);

			li.querySelector(".observe-summary").addEventListener("click", () => {
				item.expanded = !li.classList.contains("is-open");
				li.classList.toggle("is-open", item.expanded);
				body.hidden = !item.expanded;
			});
			elements.observeFeed.appendChild(li);
		});
	});
	elements.observeFeed.scrollTop = previousScroll;
}

async function exportObservabilityTraces() {
	if (!state.activeRun?.id) return;
	try {
		const payload = await request(
			`/api/v1/runs/${encodeURIComponent(state.activeRun.id)}/traces?download=true`
		);
		const blob = new Blob([JSON.stringify(payload.data || payload, null, 2)], {
			type: "application/json"
		});
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `doublecheck-traces-${state.activeRun.id.slice(0, 8)}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	} catch (error) {
		if (elements.message) {
			elements.message.textContent = error.message || "Trace export failed";
			elements.message.dataset.tone = "danger";
		}
	}
}

function upsertSpecialist(role, patch = {}) {
	if (!role) return;
	state.specialists = state.specialists || {};
	state.specialists[role] = {
		role,
		stage: "queued",
		status: "running",
		message: "Scheduled in review plan",
		attempt: 0,
		...(state.specialists[role] || {}),
		...patch
	};
	renderSpecialistBoard();
}

function specialistProgress(item = {}) {
	if (item.status === "succeeded") return 100;
	if (["failed", "timed_out", "circuit_open", "budget_exceeded"].includes(item.status)) return 100;
	return {
		queued: 5,
		"task-started": 12,
		"provider-attempt": 22,
		"prompt-sent": 30,
		"provider-run": 40,
		"provider-llm": 50,
		"provider-stream": 66,
		"tool-call": 72,
		"tool-done": 78,
		"provider-llm-done": 84,
		"provider-complete": 92,
		"response-accepted": 96,
		"task-completed": 100
	}[item.stage] || 18;
}

function renderSpecialistBoard() {
	if (!elements.specialistBoard || !elements.specialistGrid) return;
	const roles = Object.keys(state.specialists || {});
	elements.specialistBoard.hidden = !roles.length;
	updateCrewBoardHeading();
	elements.specialistGrid.innerHTML = "";
	roles.forEach((role) => {
		const item = state.specialists[role];
		const tone = item.status === "succeeded"
			? "ok"
			: ["failed", "circuit_open", "budget_exceeded"].includes(item.status)
				? "danger"
				: "info";
		const card = document.createElement("article");
		card.className = `specialist-card tone-${tone}`;
		card.innerHTML = `
			<header>
				<strong class="specialist-role"></strong>
				<span class="specialist-status"></span>
			</header>
			<p class="specialist-brief" hidden></p>
			<p class="specialist-stage"></p>
			<p class="specialist-message"></p>
			<div class="specialist-meta">
				<span class="specialist-attempt"></span>
				<span class="specialist-output"></span>
			</div>
			<div class="specialist-progress-track" aria-hidden="true">
				<div class="specialist-progress-bar"></div>
			</div>
		`;
		card.querySelector(".specialist-role").textContent = role;
		card.querySelector(".specialist-status").textContent = stageLabels[item.status] || item.status || "Working";
		const briefEl = card.querySelector(".specialist-brief");
		if (item.brief) {
			briefEl.hidden = false;
			briefEl.textContent = item.brief;
		}
		card.querySelector(".specialist-stage").textContent = stageLabels[item.stage] || item.stage || "Working";
		card.querySelector(".specialist-message").textContent = item.message || "";
		card.querySelector(".specialist-attempt").textContent = item.attempt
			? `Attempt ${item.attempt}`
			: "Awaiting provider";
		card.querySelector(".specialist-output").textContent = item.charactersSeen
			? `${item.charactersSeen} chars`
			: "";
		card.querySelector(".specialist-progress-bar").style.width = `${specialistProgress(item)}%`;
		elements.specialistGrid.appendChild(card);
	});
}

function renderSpecialistResults(result = {}) {
	if (!elements.specialistResults) return;
	const rows = result.specialists?.results || [];
	const coverage = result.coverage || null;
	if (!rows.length && !coverage) {
		elements.specialistResults.hidden = true;
		elements.specialistResults.innerHTML = "";
		return;
	}
	elements.specialistResults.hidden = false;
	elements.specialistResults.innerHTML = `<h3>Specialist outcomes</h3>`;
	if (coverage) {
		const coverageCard = document.createElement("article");
		coverageCard.className = `specialist-outcome ${coverage.gapCount ? "bad" : "ok"}`;
		coverageCard.innerHTML = `
			<header><strong>Coverage</strong><span></span></header>
			<p class="outcome-summary"></p>
			<p class="outcome-error"></p>
		`;
		coverageCard.querySelector("span").textContent =
			`${coverage.completionPercent}% · ${coverage.completedTasks}/${coverage.plannedTasks} tasks`;
		coverageCard.querySelector(".outcome-summary").textContent = coverage.gapCount
			? `${coverage.gapCount} gap${coverage.gapCount === 1 ? "" : "s"} remain. A follow-up is bounded to ${coverage.followUp?.maxTasks || 0} tasks.`
			: "Every planned specialist task produced a retained result.";
		coverageCard.querySelector(".outcome-error").textContent = (coverage.gaps || [])
			.slice(0, 3)
			.map((gap) => `${gap.role}: ${gap.reason}`)
			.join(" · ");
		if (coverage.followUp?.available && coverage.followUp?.roles?.length) {
			const button = document.createElement("button");
			button.type = "button";
			button.className = "secondary-button";
			button.textContent = `Run targeted follow-up (${coverage.followUp.maxTasks})`;
			button.addEventListener("click", async () => {
				if (!state.activeRun?.id) return;
				button.disabled = true;
				button.textContent = "Starting follow-up…";
				try {
					const payload = await request(
						`/api/v1/runs/${encodeURIComponent(state.activeRun.id)}/follow-up`,
						{ method: "POST", body: "{}" }
					);
					watchRun(payload.data);
					loadRuns();
				} catch (error) {
					button.disabled = false;
					button.textContent = "Retry targeted follow-up";
					coverageCard.querySelector(".outcome-error").textContent = error.message;
				}
			});
			coverageCard.appendChild(button);
		}
		elements.specialistResults.appendChild(coverageCard);
	}
	rows.forEach((item) => {
		const card = document.createElement("article");
		const ok = item.status === "succeeded";
		card.className = `specialist-outcome ${ok ? "ok" : "bad"}`;
		card.innerHTML = `
			<header>
				<strong></strong>
				<span></span>
			</header>
			<p class="outcome-summary"></p>
			<p class="outcome-error"></p>
		`;
		card.querySelector("strong").textContent = item.role || "specialist";
		card.querySelector("span").textContent = ok
			? `Succeeded · ${(item.findings || []).length} findings`
			: (stageLabels[item.status] || item.status || "Failed");
		card.querySelector(".outcome-summary").textContent = item.summary || (ok ? "No summary." : "");
		card.querySelector(".outcome-error").textContent = item.error || "";
		elements.specialistResults.appendChild(card);
		upsertSpecialist(item.role, {
			status: item.status || (ok ? "succeeded" : "failed"),
			stage: "task-completed",
			message: item.error || item.summary || (ok ? "Completed" : "Failed")
		});
	});
}

const elements = {
	form: document.querySelector("#run-form"),
	formMessage: document.querySelector("#form-message"),
	mode: document.querySelector("#run-mode"),
	modeHint: document.querySelector("#mode-hint"),
	reviewGoal: document.querySelector("#review-goal"),
	reviewGoalCount: document.querySelector("#review-goal-count"),
	presetSummary: document.querySelector("#preset-summary"),
	advancedSummary: document.querySelector("#advanced-summary-value"),
	readinessDetail: document.querySelector("#review-readiness-detail"),
	readinessLabel: document.querySelector("#readiness-label"),
	reviewGoalLabel: document.querySelector("#review-goal-label"),
	revisionFields: document.querySelector("#revision-fields"),
	baseRevision: document.querySelector("#base-revision"),
	cancel: document.querySelector("#cancel-button"),
	jumpTrace: document.querySelector("#jump-trace-button"),
	aiflightLink: document.querySelector("#aiflight-link"),
	jumpFindings: document.querySelector("#jump-findings-button"),
	commandExport: document.querySelector("#command-export-button"),
	commandRunContext: document.querySelector("#command-run-context"),
	runConfigDetails: document.querySelector("#run-config-details"),
	runConfigGrid: document.querySelector("#run-config-grid"),
	projectTreePanel: document.querySelector("#project-tree-panel"),
	projectTree: document.querySelector("#project-tree"),
	projectTreeCount: document.querySelector("#project-tree-count"),
	projectTreeRefresh: document.querySelector("#project-tree-refresh"),
	projectTreeSelectAll: document.querySelector("#project-tree-select-all"),
	projectTreeSelectNone: document.querySelector("#project-tree-select-none"),
	pipelineSteps: document.querySelector("#pipeline-steps"),
	commandFiles: document.querySelector("#command-files"),
	commandLanguages: document.querySelector("#command-languages"),
	commandScope: document.querySelector("#command-scope"),
	commandFindings: document.querySelector("#command-findings"),
	commandSpecialists: document.querySelector("#command-specialists"),
	commandBudget: document.querySelector("#command-budget"),
	refresh: document.querySelector("#refresh-button"),
	history: document.querySelector("#run-history"),
	historyFilters: document.querySelector("#history-filters"),
	historyClear: document.querySelector("#history-clear"),
	historyTrends: document.querySelector("#history-trends"),
	historyPagination: document.querySelector("#history-pagination"),
	historyPrevious: document.querySelector("#history-previous"),
	historyNext: document.querySelector("#history-next"),
	historyPageLabel: document.querySelector("#history-page-label"),
	historyComparison: document.querySelector("#history-comparison"),
	historyComparisonTitle: document.querySelector("#history-comparison-title"),
	historyComparisonClose: document.querySelector("#history-comparison-close"),
	comparisonCounts: document.querySelector("#comparison-counts"),
	comparisonMovements: document.querySelector("#comparison-movements"),
	title: document.querySelector("#active-title"),
	status: document.querySelector("#active-status"),
	phase: document.querySelector("#active-phase"),
	progress: document.querySelector("#active-progress"),
	commandWorkspaceLabel: document.querySelector("#command-workspace-label"),
	commandWorkspacePurpose: document.querySelector("#command-workspace-purpose"),
	resultsPanel: document.querySelector("#results-panel"),
	architectureExplorer: document.querySelector("#architecture-explorer"),
	message: document.querySelector("#active-message"),
	bar: document.querySelector("#progress-bar"),
	feed: document.querySelector("#event-feed"),
	specialistBoard: document.querySelector("#specialist-board"),
	specialistGrid: document.querySelector("#specialist-grid"),
	crewSummary: document.querySelector("#crew-summary"),
	crewSourceBadge: document.querySelector("#crew-source-badge"),
	crewBoardTitle: document.querySelector("#crew-board-title"),
	specialistResults: document.querySelector("#specialist-results"),
	observePanel: document.querySelector("#observe-panel"),
	observeFeed: document.querySelector("#observe-feed"),
	observeFilters: document.querySelector("#observe-filters"),
	observeRoleFilters: document.querySelector("#observe-role-filters"),
	observeSummary: document.querySelector("#observe-summary"),
	observeStageMap: document.querySelector("#observe-stage-map"),
	observeRunContext: document.querySelector("#observe-run-context"),
	observeTraceStatus: document.querySelector("#observe-trace-status"),
	traceCount: document.querySelector("#trace-count"),
	observeSearch: document.querySelector("#observe-search"),
	observeExport: document.querySelector("#observe-export"),
	summary: document.querySelector("#result-summary"),
	resultFiles: document.querySelector("#result-files"),
	resultLanguages: document.querySelector("#result-languages"),
	resultCount: document.querySelector("#result-count"),
	resultAiCoverage: document.querySelector("#result-ai-coverage"),
	resultScope: document.querySelector("#result-scope"),
	resultGraph: document.querySelector("#result-graph"),
	resultPlan: document.querySelector("#result-plan"),
	resultSpecialists: document.querySelector("#result-specialists"),
	baselineSummary: document.querySelector("#baseline-summary"),
	fixedFindings: document.querySelector("#fixed-findings"),
	fixedFindingsList: document.querySelector("#fixed-findings-list"),
	findings: document.querySelector("#findings-list"),
	findingDetail: document.querySelector("#finding-detail"),
	findingSearch: document.querySelector("#finding-search"),
	findingSeverity: document.querySelector("#finding-severity"),
	findingReviewState: document.querySelector("#finding-review-state"),
	findingSort: document.querySelector("#finding-sort"),
	findingSeveritySummary: document.querySelector("#finding-severity-summary"),
	architectureSearch: document.querySelector("#architecture-search"),
	architectureKind: document.querySelector("#architecture-kind"),
	architectureSummary: document.querySelector("#architecture-summary"),
	architectureResults: document.querySelector("#architecture-results"),
	architectureSnapshot: document.querySelector("#architecture-snapshot"),
	architectureDiagramShell: document.querySelector("#architecture-diagram-shell"),
	architectureDiagram: document.querySelector("#architecture-diagram"),
	architectureDiagramMeta: document.querySelector("#architecture-diagram-meta"),
	architectureClearSelection: document.querySelector("#architecture-clear-selection"),
	exportActions: document.querySelector("#export-actions"),
	aiBadge: document.querySelector("#ai-badge"),
	healthDot: document.querySelector("#health-dot"),
	healthLabel: document.querySelector("#health-label"),
	projectId: document.querySelector("#project-id"),
	projectPath: document.querySelector("#project-path"),
	runKind: document.querySelector("#run-kind"),
	workspaceHint: document.querySelector("#workspace-hint"),
	modernizationFields: document.querySelector("#modernization-fields"),
	modernizationProvider: document.querySelector("#modernization-provider"),
	modernizationTargetRuntime: document.querySelector("#target-runtime"),
	modernizationTargetLanguage: document.querySelector("#target-language"),
	modernizationLayoutProfile: document.querySelector("#layout-profile"),
	modernizationProviderStatus: document.querySelector("#modernization-provider-status"),
	modernizationReadiness: document.querySelector("#modernization-readiness"),
	modernizationResults: document.querySelector("#modernization-results"),
	modernizationOverview: document.querySelector("#modernization-overview"),
	modernizationCoverageBanner: document.querySelector("#modernization-coverage-banner"),
	modernizationPlanState: document.querySelector("#modernization-plan-state"),
	modernizationExportActions: document.querySelector("#modernization-export-actions"),
	modernizationSearch: document.querySelector("#modernization-search"),
	modernizationItemType: document.querySelector("#modernization-item-type"),
	modernizationValidation: document.querySelector("#modernization-validation-filter"),
	modernizationDecision: document.querySelector("#modernization-decision-filter"),
	modernizationContext: document.querySelector("#modernization-context-filter"),
	modernizationPhase: document.querySelector("#modernization-phase-filter"),
	modernizationItemDetail: document.querySelector("#modernization-item-detail"),
	modernizationPanes: document.querySelector("#modernization-panes"),
	modernizationSchemaSource: document.querySelector("#schema-source"),
	modernizationSchemaFile: document.querySelector("#schema-file"),
	modernizationSchemaFileWrap: document.querySelector("#schema-file-wrap"),
	modernizationSchemaPathWrap: document.querySelector("#schema-path-wrap"),
	modernizationSchemaPath: document.querySelector("#schema-path"),
	modernizationSchemaStatus: document.querySelector("#schema-file-status"),
	modernizationRemoteAckWrap: document.querySelector("#remote-provider-ack-wrap"),
	modernizationRemoteAck: document.querySelector("#remote-provider-ack"),
	startRunButton: document.querySelector("#start-run-button"),
	codegraphExplorer: document.querySelector("#codegraph-explorer"),
	codegraphStatus: document.querySelector("#codegraph-status"),
	codegraphEmpty: document.querySelector("#codegraph-empty"),
	codegraphFailed: document.querySelector("#codegraph-failed"),
	codegraphTruncation: document.querySelector("#codegraph-truncation"),
	codegraphBreadcrumb: document.querySelector("#codegraph-breadcrumb"),
	codegraphToolbar: document.querySelector("#codegraph-toolbar"),
	codegraphLayout: document.querySelector("#codegraph-layout"),
	codegraphShowAi: document.querySelector("#codegraph-show-ai"),
	codegraphAiSummaries: document.querySelector("#codegraph-ai-summaries"),
	codegraphWorkspace: document.querySelector("#codegraph-workspace"),
	codegraphCanvas: document.querySelector("#codegraph-canvas"),
	codegraphInspector: document.querySelector("#codegraph-inspector"),
	codegraphIssues: document.querySelector("#codegraph-issues"),
	codegraphIssueTabs: document.querySelector("#codegraph-issue-tabs"),
	codegraphIssueList: document.querySelector("#codegraph-issue-list"),
	preferencesForm: document.querySelector("#preferences-form"),
	preferencesReset: document.querySelector("#preferences-reset"),
	preferencesStatus: document.querySelector("#preferences-status"),
	providerTableBody: document.querySelector("#provider-table-body"),
	providerForm: document.querySelector("#provider-form"),
	providerCancelEdit: document.querySelector("#provider-cancel-edit"),
	providerSaveButton: document.querySelector("#provider-save-button"),
	providerFormStatus: document.querySelector("#provider-form-status"),
	runDefaultsForm: document.querySelector("#run-defaults-form"),
	runDefaultsStatus: document.querySelector("#run-defaults-status"),
	settingsPanel: document.querySelector("#settings-panel")
};

const reviewPresets = {
	quick: {
		label: "Quick",
		summary: "Focused review of correctness, security, and testing with a smaller context budget.",
		roles: [ "security", "correctness", "testing" ],
		budgets: {
			maxTasks: 3,
			maxTokens: 4000,
			maxTokensPerTask: 2000,
			maxDurationMs: 300000,
			maxIterationsPerTask: 4,
			maxToolOutputCharacters: 24000,
			maxCostUsd: 1
		}
	},
	balanced: {
		label: "Balanced",
		summary: "Balanced review with broad focus and sensible local limits.",
		roles: [
			"security",
			"correctness",
			"testing",
			"architecture",
			"performance",
			"boxlang-conventions",
			"cfml-conventions"
		],
		budgets: {
			maxTasks: 6,
			maxTokens: 12000,
			maxTokensPerTask: 6000,
			maxDurationMs: 600000,
			maxIterationsPerTask: 8,
			maxToolOutputCharacters: 48000,
			maxCostUsd: 5
		}
	},
	deep: {
		label: "Deep",
		summary: "Maximum available context, tool depth, and specialist budget for a thorough review.",
		roles: [
			"security",
			"correctness",
			"testing",
			"architecture",
			"performance",
			"boxlang-conventions",
			"cfml-conventions"
		],
		budgets: {
			maxTasks: 6,
			maxTokens: 24000,
			maxTokensPerTask: 6000,
			maxDurationMs: 600000,
			maxIterationsPerTask: 16,
			maxToolOutputCharacters: 96000,
			maxCostUsd: 10
		}
	}
};

function selectedPreset() {
	const value = elements.form?.querySelector("[name='reviewPreset']:checked")?.value || "balanced";
	return reviewPresets[value] || reviewPresets.balanced;
}

function updateNewReviewSummary() {
	const preset = selectedPreset();
	const modeLabels = {
		"working-tree": "Working tree",
		"revision-diff": "Revision comparison",
		full: "Full baseline"
	};
	const maxTasks = Number(elements.form?.elements.maxTasks?.value || 0);
	const maxTokens = Number(elements.form?.elements.maxTokens?.value || 0);
	const maxCost = Number(elements.form?.elements.maxCostUsd?.value || 0);
	if (elements.presetSummary) {
		elements.presetSummary.textContent = preset.summary;
	}
	if (elements.advancedSummary) {
		const tokenLabel = maxTokens >= 1000
			? `${Number((maxTokens / 1000).toFixed(1))}k`
			: String(maxTokens);
		elements.advancedSummary.textContent = `${maxTasks} tasks · ${tokenLabel} tokens · $${maxCost} max`;
	}
	if (elements.readinessDetail) {
		const scopeLabel = modeLabels[elements.mode?.value] || "Working tree";
		elements.readinessDetail.textContent = state.workspace === "modernize"
			? `${scopeLabel} · Proposal only · Read-only`
			: state.workspace === "codegraph"
				? "Full baseline · Deterministic · Read-only"
				: `${scopeLabel} · ${preset.label} · Read-only`;
	}
	if (elements.readinessLabel) {
		elements.readinessLabel.textContent = state.workspace === "modernize"
			? "Ready for a local modernization plan"
			: state.workspace === "codegraph"
				? "Ready for a local CodeGraph run"
				: "Ready for a local review";
	}
	if (elements.reviewGoalCount) {
		elements.reviewGoalCount.textContent = `${elements.reviewGoal?.value.length || 0} / 500`;
	}
}

// Modernize's ReviewRunService.normalizeModernizationBudgets() ceiling is
// 16,000 tokens/task and $200; plain Review's ReviewPolicyService ceiling
// (from .env) is 6,000 tokens/task and $50. The shared advanced-limits
// inputs must reflect whichever backend will validate the submitted run so
// the browser does not block values the server would accept, or accept
// values the server will reject.
const budgetCeilings = {
	review: { maxTokensPerTask: 6000, maxCostUsd: 50 },
	modernize: { maxTokensPerTask: 16000, maxCostUsd: 200 }
};

function updateBudgetCeilingsForWorkspace(modernize) {
	const ceilings = modernize ? budgetCeilings.modernize : budgetCeilings.review;
	const tokensInput = elements.form?.elements.maxTokensPerTask;
	if (tokensInput) {
		tokensInput.max = String(ceilings.maxTokensPerTask);
		if (Number(tokensInput.value) > ceilings.maxTokensPerTask) tokensInput.value = String(ceilings.maxTokensPerTask);
	}
	const costInput = elements.form?.elements.maxCostUsd;
	if (costInput) {
		costInput.max = String(ceilings.maxCostUsd);
		if (Number(costInput.value) > ceilings.maxCostUsd) costInput.value = String(ceilings.maxCostUsd);
	}
}

function applyReviewPreset(name) {
	const preset = reviewPresets[name];
	if (!preset || !elements.form) return;
	elements.form.querySelectorAll("[name='allowedRole']").forEach((input) => {
		input.checked = preset.roles.includes(input.value);
	});
	Object.entries(preset.budgets).forEach(([field, value]) => {
		const input = elements.form.elements[field];
		if (input) input.value = String(value);
	});
	updateNewReviewSummary();
}

async function request(url, options = {}) {
	const response = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(options.headers || {})
		}
	});
	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		const restMessages = Array.isArray(payload?.messages)
			? payload.messages
					.map((item) => String(item || "").replace(/^An exception occurred:\s*/i, ""))
					.filter(Boolean)
					.join(" ")
			: "";
		const message =
			payload?.error?.message ||
			payload?.message ||
			(typeof payload?.error === "string" ? payload.error : "") ||
			restMessages ||
			`Request failed (${response.status})`;
		const error = new Error(message);
		error.status = response.status;
		error.code = payload?.error?.code || "";
		throw error;
	}
	return payload;
}

function renderSession(session) {
	state.session = session;
	if (elements.form) {
		elements.form.hidden = false;
	}
}

async function loadSession() {
	try {
		const payload = await request("/api/v1/session");
		renderSession(payload.data);
		await loadCapabilities();
		await loadProjects();
		await loadRuns();
		await resumeRunFromQuery();
	} catch (error) {
		if (elements.formMessage) {
			elements.formMessage.textContent = error.message;
			elements.formMessage.dataset.tone = "danger";
		}
	}
}

async function loadCapabilities() {
	try {
		const payload = await request("/api/v1/capabilities");
		state.capabilities = payload.data || {};
		syncModernizationProviderToServer();
		updateModernizationProviderDisclosure();
	} catch (error) {
		// Capability discovery is advisory.  Keep the conservative local defaults
		// so a healthy Review workspace remains usable when an older server is
		// running during a desktop upgrade.
		state.capabilities = {};
	}
}

// The provider used by the run is the provider configured on the local
// server.  Keep the setup selector truthful instead of allowing a browser-only
// choice (for example, "Ollama") to disagree with the configured remote
// provider that the smoke endpoint and backend will actually use.
function syncModernizationProviderToServer() {
	const select = elements.modernizationProvider;
	const configured = String(state.capabilities?.aiExecution?.provider || "").trim().toLowerCase();
	if (!select || !configured) return;
	let option = [...select.options].find((item) => item.value.toLowerCase() === configured);
	if (!option) {
		option = document.createElement("option");
		option.value = configured;
		option.textContent = `Configured provider · ${configured}`;
		select.appendChild(option);
	}
	select.value = configured;
	select.dataset.configuredProvider = configured;
}

async function loadProjects() {
	if (!elements.projectId) return;
	try {
		const payload = await request("/api/v1/projects");
		const projects = payload.data || [];
		const previousPath = (elements.projectPath?.value || "").trim();
		elements.projectId.innerHTML = "";
		projects.forEach((project) => {
			const option = document.createElement("option");
			option.value = project.id;
			option.textContent = project.name;
			option.dataset.rootPath = project.rootPath;
			elements.projectId.appendChild(option);
		});
		// Keep a typed/restored path; only default when the field is empty.
		if (projects.length && !previousPath) {
			elements.projectPath.value = projects[0].rootPath;
		}
	} catch (error) {
		elements.projectId.innerHTML = `<option value="">${error.message}</option>`;
	}
}

function friendlyStatus(status) {
	return statusLabels[status] || status || "Idle";
}

function friendlyPhase(phase) {
	return phaseLabels[phase] || phase || "—";
}

function friendlyEvent(type) {
	return eventLabels[type] || type || "Update";
}

function stopStatusPoll() {
	if (state.statusPoll) {
		clearInterval(state.statusPoll);
		state.statusPoll = null;
	}
}

function resetCommandMetrics() {
	state.commandMetrics = {
		files: 0,
		languages: [],
		findings: 0,
		specialistCompleted: 0,
		specialistTotal: 0
	};
}

function presetLabelForRun(run = {}) {
	const budgets = run.budgets || {};
	const tokenBudget = Number(budgets.maxTokens || 0);
	if (tokenBudget && tokenBudget <= 4000) return "Quick";
	if (tokenBudget >= 24000) return "Deep";
	return "Balanced";
}

function scopeLabel(mode = "") {
	return {
		"working-tree": "Working tree",
		"revision-diff": "Revision diff",
		full: "Full baseline"
	}[mode] || mode || "—";
}

function addRunConfigRow(grid, label, value) {
	if (value === null || value === undefined || value === "") return;
	const dt = document.createElement("dt");
	dt.textContent = label;
	const dd = document.createElement("dd");
	dd.textContent = value;
	grid.appendChild(dt);
	grid.appendChild(dd);
}

// Renders exactly what was submitted when this run was created, so opening a
// run from history shows the real values instead of a guessed preset label.
function renderRunConfig(run) {
	const details = elements.runConfigDetails;
	const grid = elements.runConfigGrid;
	if (!details || !grid) return;
	grid.innerHTML = "";
	if (!run) {
		details.hidden = true;
		return;
	}
	addRunConfigRow(grid, "Project path", run.projectPath);
	addRunConfigRow(grid, "Scope", scopeLabel(run.mode));
	if (run.mode === "revision-diff") {
		addRunConfigRow(grid, "Base revision", run.baseRevision);
		addRunConfigRow(grid, "Head revision", run.headRevision);
	}
	if (run.runKind === "modernize") {
		const input = run.input || {};
		const source = input.source || {};
		const target = input.target || {};
		const database = input.database || {};
		const execution = input.execution || {};
		const schemaPack = input.schemaPack || {};
		const scopePaths = Array.isArray(input.scopePaths) ? input.scopePaths.filter(Boolean) : [];
		if (scopePaths.length) addRunConfigRow(grid, "Directory scope", scopePaths.join(", "));
		addRunConfigRow(grid, "Source engine", source.engine);
		addRunConfigRow(grid, "Source version", source.version);
		addRunConfigRow(grid, "Java version", source.javaVersion);
		addRunConfigRow(grid, "Target runtime", target.runtime);
		addRunConfigRow(grid, "Target language", target.language);
		addRunConfigRow(grid, "Layout profile", target.layoutProfile);
		addRunConfigRow(grid, "ColdBox major", target.coldboxMajor);
		addRunConfigRow(grid, "CLI major", target.cliMajor);
		addRunConfigRow(grid, "Database vendor", database.vendor && database.vendor !== "unknown" ? database.vendor : "");
		addRunConfigRow(grid, "Database version", database.version);
		addRunConfigRow(grid, "Database schema", database.schema);
		addRunConfigRow(grid, "Collation", database.collation);
		addRunConfigRow(grid, "Timezone", database.timezone);
		addRunConfigRow(grid, "Schema source", schemaPack.sourceKind);
		addRunConfigRow(grid, "Provider", execution.provider);
		addRunConfigRow(grid, "Model", execution.model);
		addRunConfigRow(grid, "Remote egress acknowledged", input.privacy?.remoteEgressAcknowledged ? "Yes" : "");
		addRunConfigRow(grid, "Outcomes", Array.isArray(input.outcomes) && input.outcomes.length ? input.outcomes.join(", ") : "");
	} else {
		const policy = run.policy || {};
		addRunConfigRow(grid, "Focus areas", Array.isArray(policy.allowedRoles) && policy.allowedRoles.length ? policy.allowedRoles.join(", ") : "All roles");
		addRunConfigRow(grid, "Review goal", policy.reviewGoal);
		addRunConfigRow(grid, "Fast mode", policy.fast ? "Yes" : "");
	}
	const budgets = run.budgets || {};
	addRunConfigRow(grid, "Max tasks", budgets.maxTasks);
	addRunConfigRow(grid, "Token budget", budgets.maxTokens);
	addRunConfigRow(grid, "Tokens per task", budgets.maxTokensPerTask);
	addRunConfigRow(grid, "Max cost ($)", budgets.maxCostUsd);
	details.hidden = grid.children.length === 0;
}

function updatePipeline(run) {
	if (!elements.pipelineSteps) return;
	const status = run?.status || "Idle";
	const kind = resolveRunKind(run);
	const labels = pipelineLabels[kind] || pipelineLabels.review;
	elements.pipelineSteps.setAttribute("aria-label", labels.aria);
	elements.pipelineSteps.querySelectorAll("[data-pipeline-stage]").forEach((item) => {
		const title = item.querySelector("strong");
		if (title) title.textContent = labels.stages[item.dataset.pipelineStage] || item.dataset.pipelineStage;
	});
	const activeStage = phasePipelineStage[run?.currentPhase] || "scan";
	const activeIndex = pipelineOrder.indexOf(activeStage);
	const terminalSuccess = status === "succeeded" || status === "partial";
	elements.pipelineSteps.querySelectorAll("[data-pipeline-stage]").forEach((item) => {
		const stage = item.dataset.pipelineStage;
		const index = pipelineOrder.indexOf(stage);
		const label = item.querySelector("small");
		item.classList.remove("is-complete", "is-active", "is-failed", "is-skipped");
		if (!run) {
			label.textContent = "Pending";
			return;
		}
		if (terminalSuccess || index < activeIndex) {
			item.classList.add("is-complete");
			label.textContent = "Completed";
		} else if (index === activeIndex) {
			if (status === "failed") {
				item.classList.add("is-failed");
				label.textContent = "Failed";
			} else if (status === "cancelled") {
				item.classList.add("is-skipped");
				label.textContent = "Cancelled";
			} else {
				item.classList.add("is-active");
				label.textContent = status === "queued" ? "Queued" : "In progress";
			}
		} else {
			label.textContent = "Pending";
		}
	});
}

function updateCommandMetrics(run = state.activeRun) {
	const metrics = state.commandMetrics || {};
	if (elements.commandFiles) {
		elements.commandFiles.textContent = metrics.files || "—";
	}
	if (elements.commandLanguages) {
		elements.commandLanguages.textContent = (metrics.languages || []).join(", ") || "—";
	}
	if (elements.commandScope) {
		const scoped = Array.isArray(run?.input?.scopePaths) ? run.input.scopePaths.filter(Boolean) : [];
		elements.commandScope.textContent = scoped.length
			? `${scopeLabel(run?.mode)} · ${scoped.length} path${scoped.length === 1 ? "" : "s"}`
			: scopeLabel(run?.mode);
	}
	if (elements.commandFindings) {
		elements.commandFindings.textContent = Number.isFinite(Number(metrics.findings))
			? String(metrics.findings)
			: "—";
	}
	if (elements.commandSpecialists) {
		const total = Number(metrics.specialistTotal || 0);
		const completed = Number(metrics.specialistCompleted || 0);
		elements.commandSpecialists.textContent = total ? `${completed}/${total}` : "—";
	}
	if (elements.commandBudget) {
		const budgets = run?.budgets || {};
		const tokens = Number(budgets.maxTokens || 0);
		const cost = Number(budgets.maxCostUsd || 0);
		const tokenLabel = tokens >= 1000 ? `${Number((tokens / 1000).toFixed(1))}k` : tokens;
		elements.commandBudget.textContent = tokens
			? `${tokenLabel} tokens${cost ? ` · $${cost}` : ""}`
			: "—";
	}
}

function setRun(run) {
	const previousRunId = state.activeRun?.id || "";
	state.activeRun = run;
	// The file picker is only useful while setting up a new run; once one is
	// active/finished, the panel gives its space back to progress/results.
	if (elements.projectTreePanel) elements.projectTreePanel.hidden = !!run;
	if (run?.runKind) state.workspace = resolveRunKind(run);
	if (run?.id && run.id !== previousRunId && run.runKind === "modernize") {
		state.modernization.result = null;
		state.modernization.loading = !state.terminal.has(run.status);
		state.modernization.error = "";
		state.modernization.selectedItem = null;
		state.modernization.selectedPhaseId = "";
		state.modernization.decisions = {};
		state.modernization.decisionNotes = {};
		state.modernization.decisionSelections = {};
		state.modernization.notice = "";
		state.modernization.noticeTone = "info";
		state.modernization.context = "all";
		state.modernization.phase = "all";
		state.modernization.activePane = "overview";
	}
	if (run?.id && run.id !== previousRunId && run.runKind === "codegraph") {
		state.codegraph.result = null;
		state.codegraph.snapshot = null;
		state.codegraph.loading = !state.terminal.has(run.status);
		state.codegraph.error = "";
		state.codegraph.mode = "cluster";
		state.codegraph.selectedId = "";
		state.codegraph.clusterId = "";
		state.codegraph.focusId = "";
		state.codegraph.layoutResult = null;
		state.codegraph.viewport = null;
	}
	const status = run?.status || "Idle";
	const kind = resolveRunKind(run);
	const workspaceLabel = workspaceDisplayName(kind);
	const noun = kind === "modernize" ? "modernization" : kind === "codegraph" ? "CodeGraph run" : "review";
	const resultNoun = kind === "modernize" ? "plan" : kind === "codegraph" ? "graph" : "findings";
	if (elements.jumpFindings) {
		elements.jumpFindings.textContent = kind === "modernize" ? "View plan" : kind === "codegraph" ? "View graph" : "View findings";
	}
	if (elements.commandExport) elements.commandExport.textContent = kind === "modernize" ? "Export plan" : "Export report";
	if (elements.cancel) {
		elements.cancel.textContent = kind === "modernize" ? "Cancel plan" : kind === "codegraph" ? "Cancel graph" : "Cancel review";
	}
	if (elements.commandWorkspaceLabel) elements.commandWorkspaceLabel.textContent = `${workspaceLabel} command center`;
	if (elements.commandWorkspacePurpose) {
		elements.commandWorkspacePurpose.textContent = kind === "modernize"
			? "Watch repository evidence, proposal roles, validation gates, and plan milestones for the active run."
			: kind === "codegraph"
				? "Watch indexing, metrics, clustering, and snapshot persistence for the active run."
				: "Watch pipeline stages, crew progress, and live milestones for the active run.";
	}
	if (elements.title) {
		elements.title.textContent = run
			? `${workspaceLabel} ${run.id.slice(0, 8)}`
			: `No active ${noun}`;
	}
	if (elements.status) {
		elements.status.textContent = friendlyStatus(status);
		elements.status.dataset.status = status;
	}
	if (elements.phase) elements.phase.textContent = friendlyPhase(run?.currentPhase);
	if (elements.progress) elements.progress.textContent = `${run?.progress || 0}%`;
	if (elements.bar) {
		elements.bar.style.width = `${run?.progress || 0}%`;
		elements.bar.dataset.status = status;
	}
	if (elements.cancel) elements.cancel.hidden = !run || state.terminal.has(status);
	if (elements.jumpTrace) {
		elements.jumpTrace.hidden = !run;
	}
	if (elements.aiflightLink) {
		elements.aiflightLink.href = run?.id ? `/aiflight/#session/${encodeURIComponent(run.id)}` : "/aiflight/";
	}
	if (elements.jumpFindings) {
		elements.jumpFindings.hidden = !run;
	}
	if (elements.commandExport) {
		elements.commandExport.hidden = kind === "codegraph" || !run || !state.terminal.has(status);
	}
	if (elements.commandRunContext) {
		elements.commandRunContext.textContent = run
			? `${workspaceLabel} · ${scopeLabel(run.mode)} · ${presetLabelForRun(run)} · ${run.projectPath || "local repository"}`
			: `Start a ${kind === "modernize" ? "Modernize plan" : kind === "codegraph" ? "CodeGraph run" : "review"} to monitor its pipeline and evidence.`;
	}
	renderRunConfig(run);
	updatePipeline(run);
	updateCommandMetrics(run);
	renderObserveIdentity();
	if (elements.exportActions) {
		elements.exportActions.hidden = kind !== "review" || !run || !state.terminal.has(status);
	}
	if (elements.modernizationExportActions) {
		elements.modernizationExportActions.hidden = kind !== "modernize" || !run || !state.terminal.has(status);
	}
	if (elements.modernizationResults && kind === "modernize") {
		renderModernizationResult(state.modernization.result || {});
	} else if (elements.modernizationResults) {
		elements.modernizationResults.hidden = true;
	}
	if (elements.codegraphExplorer && kind === "codegraph") {
		renderCodeGraph(state.codegraph.result || {});
	} else if (elements.codegraphExplorer) {
		elements.codegraphExplorer.hidden = true;
	}
	if (elements.resultsPanel) elements.resultsPanel.hidden = kind !== "review";
	if (elements.architectureExplorer) elements.architectureExplorer.hidden = kind !== "review";
	document.querySelectorAll(".history-row").forEach((row) => {
		row.classList.toggle("is-active", Boolean(run && row.dataset.runId === run.id));
	});
	if (elements.message) {
		if (!run) {
			elements.message.textContent = `Start a ${kind === "modernize" ? "Modernize plan" : kind === "codegraph" ? "CodeGraph run" : "review"} to watch live progress here.`;
			elements.message.dataset.tone = "idle";
		} else if (status === "failed") {
			elements.message.textContent = run.message || `The ${noun} failed.`;
			elements.message.dataset.tone = "danger";
		} else if (status === "partial") {
			elements.message.textContent = run.message
				? `${run.message} Check the ${resultNoun} panel below for details.`
				: `${workspaceLabel} finished with warnings. Check the panel below.`;
			elements.message.dataset.tone = "warning";
		} else if (status === "succeeded") {
			elements.message.textContent = run.message
				? `${run.message} Scroll down to review the ${resultNoun}.`
				: `${workspaceLabel} completed successfully. Scroll down to inspect the result.`;
			elements.message.dataset.tone = "ok";
		} else if (status === "cancelled") {
			elements.message.textContent = run.message || `${workspaceLabel} cancelled.`;
			elements.message.dataset.tone = "muted";
		} else if (status === "queued") {
			elements.message.textContent = run.message || `Waiting for a worker to pick up this ${noun}…`;
			elements.message.dataset.tone = "info";
		} else {
			elements.message.textContent = run.message || `${workspaceLabel} is in progress…`;
			elements.message.dataset.tone = "info";
		}
	}
}

function discoveryCoverageText(skipped = {}, discoveryTruncated = false) {
	const labels = {
		ignored: "ignored",
		oversized: "oversized",
		binary: "binary",
		unreadable: "unreadable",
		limit: "limit"
	};
	const parts = Object.entries(labels)
		.filter(([key]) => Number(skipped?.[key] || 0) > 0)
		.map(([key, label]) => `${Number(skipped[key])} ${label}`);
	if (discoveryTruncated) parts.push("truncated");
	return parts.length ? `Skipped: ${parts.join(" · ")}` : "";
}

function renderDiscoveryCoverage(skipped = {}, discoveryTruncated = false) {
	if (!elements.summary) return;
	let line = document.querySelector("#result-discovery-coverage");
	if (!line) {
		line = document.createElement("p");
		line.id = "result-discovery-coverage";
		line.className = "result-discovery-coverage";
		elements.summary.insertAdjacentElement("afterend", line);
	}
	line.textContent = discoveryCoverageText(skipped, discoveryTruncated);
	line.hidden = !line.textContent;
}

function appendEvent(type, payload) {
	if (elements.feed.querySelector(".empty-state")) elements.feed.innerHTML = "";
	const item = document.createElement("li");
	item.dataset.eventType = type;
	const run = payload?.data?.run;
	item.innerHTML = `
		<span class="event-type"></span>
		<span class="event-message"></span>
		<span class="event-time"></span>
	`;
	item.querySelector(".event-type").textContent = friendlyEvent(type);
	const detail = payload?.data?.detail;
	let message = run?.message || payload?.message || "Lifecycle update";
	if (type === "review.indexed" && detail) {
		const coverage = discoveryCoverageText(detail.skipped, detail.discoveryTruncated);
		message = `${detail.filesScanned} files indexed · ${(detail.languages || []).join(", ") || "no source languages"}${coverage ? ` · ${coverage}` : ""}`;
		state.commandMetrics.files = detail.filesScanned || 0;
		state.commandMetrics.languages = detail.languages || [];
		updateCommandMetrics();
		renderDiscoveryCoverage(detail.skipped, detail.discoveryTruncated);
	}
	if (type === "review.findings" && detail) {
		message = `${detail.count} ${detail.source} findings retained`;
		state.commandMetrics.findings = detail.count || 0;
		updateCommandMetrics();
	}
	if (type === "review.graph" && detail) {
		message = `${detail.symbolCount} symbols · ${detail.dependencyCount} dependencies · ${detail.impactCount || 0} impacts · ${detail.cacheHits} cache hits`;
	}
	if (type === "review.plan" && detail) {
		const reused = detail.modelReused ? " · reused model" : "";
		const crewBit = detail.crewSummary
			? ` · crew: ${detail.crewSummary}`
			: "";
		message = `${detail.factCount} architecture facts (${detail.inferredFacts || 0} enriched) · ${detail.taskCount}/${detail.taskLimit || 0} tasks · ${detail.contextRanges || 0} ranges/${detail.contextLineCount || detail.contextLines || 0} lines · ${detail.allocatedTokens || 0}/${detail.tokenBudget || 0} tokens · +${detail.diffAdded || 0}/-${detail.diffRemoved || 0} diff${reused}${crewBit}`;
		state.commandMetrics.specialistTotal = detail.taskCount || 0;
		state.commandMetrics.specialistCompleted = 0;
		updateCommandMetrics();
		seedCrewFromPlan(detail);
	}
	if (type === "review.specialist.progress" && detail) {
		const attempt = detail.attempt ? ` · attempt ${detail.attempt}` : "";
		const stageText = stageLabels[detail.stage] || detail.stage || "Working";
		const detailMessage = detail.message || stageText;
		message = `${detail.role}: ${detailMessage}${attempt}`;
		upsertSpecialist(detail.role, {
			stage: detail.stage || "running",
			status: detail.status || (detail.stage === "task-completed" ? "succeeded" : "running"),
			attempt: detail.attempt || 0,
			charactersSeen: detail.charactersSeen || 0,
			message: detailMessage
		});
		if (elements.message) {
			elements.message.textContent = message;
			elements.message.dataset.tone = "info";
		}
	}
	if (type === "review.specialist.observe" && detail) {
		appendObservation(detail);
		const obs = detail.observe || {};
		message = `${detail.role || "agent"}: ${obs.kind || "trace"} · ${obs.title || detail.message || "update"}`;
		item.classList.add("is-muted");
		item.classList.add("is-trace");
		if (elements.message && obs.title) {
			elements.message.textContent = `${detail.role || "agent"}: ${obs.title}`;
			elements.message.dataset.tone = "info";
		}
	}
	if (type === "review.specialists" && detail) {
		message = `${detail.completedTasks}/${detail.taskCount} specialist tasks completed · ${detail.findingCount} findings`;
		state.commandMetrics.specialistCompleted = detail.completedTasks || 0;
		state.commandMetrics.specialistTotal = detail.taskCount || 0;
		state.commandMetrics.findings = detail.findingCount || state.commandMetrics.findings;
		updateCommandMetrics();
		(detail.results || []).forEach((item) => {
			const ok = item.status === "succeeded";
			upsertSpecialist(item.role, {
				status: item.status || (ok ? "succeeded" : "failed"),
				stage: "task-completed",
				message: item.error || item.summary || (ok ? "Completed" : "Failed")
			});
		});
	}
	if (type === "run.error") {
		message = run?.message || detail?.message || `${state.workspace === "modernize" ? "Modernize plan" : "Review"} failed`;
		item.classList.add("is-error");
	}
	if (type === "run.completed" || type === "review.completed" || type === "modernization.completed") {
		item.classList.add("is-done");
	}
	if (type === "stream.error" || type === "stream.waiting") {
		item.classList.add("is-muted");
	}
	item.querySelector(".event-message").textContent = message;
	const stamp = payload?.timestamp ? new Date(payload.timestamp) : new Date();
	item.querySelector(".event-time").textContent = Number.isNaN(stamp.getTime())
		? ""
		: stamp.toLocaleTimeString();
	elements.feed.prepend(item);
	timelineFromEvent(type, payload, message);
}

function cleanLegacySourceLabel(item = {}) {
	const source = String(item.sourcePath || item.sourceFile || item.filePath || "").trim();
	if (source) return source;
	const links = item.legacyUnitIds || item.legacyLinks || item.relatedLegacyIds || [];
	const usable = (Array.isArray(links) ? links : [links])
		.map((entry) => String(entry || "").trim())
		.filter((entry) => entry && !/^no\s*colon$/i.test(entry) && entry !== "-" && entry !== "n/a");
	if (usable.length) return usable.join(", ");
	return "New proposal (no legacy file mapped)";
}

function phaseScaffoldEmptyHtml(kind = "files") {
	const noun = kind === "routes" ? "routes" : kind === "database" ? "database notes" : kind === "targets" ? "target files" : "legacy files";
	return `<p class="modernization-phase-empty"><strong>Scaffold / setup step</strong> — no ${noun} are mapped to this phase yet. Use the Definition of Done below for setup work, or pick a mapped slice on the Road (look for coexist / vertical-slice badges) to see what moves.</p>`;
}

/**
 * Coerces a plan collection to an array.
 *
 * Persisted plans can carry a collection as text ("[\n  phase-a\n]") rather than
 * a JSON array. Those values are truthy, so the usual `value || []` guard passes
 * them straight through to .forEach/.map and the whole workspace fails to
 * render. Parsing the token form keeps an older plan usable instead of blank.
 */
function asArray(value) {
	if (Array.isArray(value)) return value;
	if (value === null || value === undefined) return [];
	if (typeof value !== "string") return [];
	const text = value.trim().replace(/^\[|\]$/g, "");
	if (!text.trim()) return [];
	return text
		.split(/[,\r\n]+/)
		.map((item) => item.trim().replace(/^"|"$/g, "").trim())
		.filter(Boolean);
}

function orderedRoadmapPhases(phases = []) {
	const list = Array.isArray(phases) ? phases.slice() : [];
	if (list.length < 2) return list;
	const byId = new Map(list.map((phase) => [String(phase.id || ""), phase]));
	const visiting = new Set();
	const seen = new Set();
	const ordered = [];
	const visit = (id) => {
		const key = String(id || "");
		if (!key || seen.has(key) || !byId.has(key)) return;
		if (visiting.has(key)) return;
		visiting.add(key);
		const phase = byId.get(key);
		// A non-empty string is truthy, so `|| []` does not protect this: a phase
		// whose dependencies arrived as text used to throw here and blank the
		// whole workspace with "Could not load the saved modernization plan".
		asArray(phase.dependencies).forEach((dep) => visit(dep));
		visiting.delete(key);
		seen.add(key);
		ordered.push(phase);
	};
	list.forEach((phase) => visit(phase.id));
	list.forEach((phase) => {
		if (!seen.has(String(phase.id || ""))) ordered.push(phase);
	});
	return ordered;
}

async function continueModernizeCoverage(runId, button) {
	if (!runId) return;
	const label = button?.textContent || "Continue omitted coverage";
	if (button) {
		button.disabled = true;
		button.textContent = "Starting continuation…";
	}
	try {
		const payload = await request(`/api/v1/runs/${encodeURIComponent(runId)}/modernization/continue`, { method: "POST" });
		const next = payload?.data;
		if (!next?.id) throw new Error("Continuation run was not created.");
		await watchRun(next);
	} catch (error) {
		if (button) {
			button.disabled = false;
			button.textContent = label;
		}
		if (elements.modernizationCoverageBanner) {
			const note = document.createElement("p");
			note.className = "form-message";
			note.setAttribute("role", "alert");
			note.textContent = error.message || "Could not continue omitted modernization coverage.";
			elements.modernizationCoverageBanner.prepend(note);
		}
	}
}

function modernizationItemContext(item) {
	const value = item.contextId || item.context || item.contextName;
	return typeof value === "object" ? (value.id || value.name || "unassigned") : (value || "unassigned");
}

function modernizationItemPhase(item) {
	const value = item.phase || item.phaseId || item.roadmapPhase;
	return typeof value === "object" ? (value.id || value.name || "unassigned") : (value || "unassigned");
}

function modernizationItemMatches(item) {
	const query = state.modernization.search.trim().toLowerCase();
	if (state.modernization.itemType !== "all" && item._modernizationType !== state.modernization.itemType) return false;
	const validation = modernizationValidationStatus(item);
	if (state.modernization.validation !== "all" && validation !== state.modernization.validation) return false;
	const key = modernizationItemKey(item);
	const decision = String(state.modernization.decisions[key] || item.decision || "undecided").toLowerCase();
	if (state.modernization.decision !== "all" && decision !== state.modernization.decision) return false;
	const context = String(modernizationItemContext(item));
	if (state.modernization.context !== "all" && context !== state.modernization.context) return false;
	const phase = String(modernizationItemPhase(item));
	if (state.modernization.phase !== "all" && phase !== state.modernization.phase) return false;
	if (!query) return true;
	return Object.values(item).some((value) => String(value || "").toLowerCase().includes(query));
}

function refreshModernizationFilterOptions(result = {}) {
	const allItems = ["legacy", "target", "routes", "database", "links", "contexts", "roadmap"]
		.flatMap((pane) => modernizationItems(result, pane));
	const optionsFor = (values, selected, fallbackLabel) => {
		const unique = [...new Set(values.filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b));
		return [{ value: "all", label: fallbackLabel }, ...unique.map((value) => ({ value, label: value }))];
	};
	const apply = (select, options, selected) => {
		if (!select) return;
		select.innerHTML = "";
		options.forEach((option) => {
			const node = document.createElement("option");
			node.value = option.value;
			node.textContent = option.label;
			select.appendChild(node);
		});
		select.value = options.some((option) => option.value === selected) ? selected : "all";
	};
	apply(elements.modernizationContext, optionsFor(allItems.map(modernizationItemContext), state.modernization.context, "All contexts"), state.modernization.context);
	apply(elements.modernizationPhase, optionsFor(allItems.map(modernizationItemPhase), state.modernization.phase, "All phases"), state.modernization.phase);
}

function modernizationItemRouteId(item) {
	return item.id || item.itemId || item.findingId || item.transitionId || modernizationItemKey(item);
}

function modernizationEvidenceRefs(item = {}) {
	const value = item.evidenceRefs || item.evidenceReferences || item.evidence || [];
	if (typeof value === "string" && value.trim()) {
		const path = item.filePath || item.path || item.sourcePath || item.sourceFile || "";
		const startLine = Number(item.startLine || item.line || 0);
		const endLine = Number(item.endLine || startLine || 0);
		const range = startLine ? `:${startLine}${endLine && endLine !== startLine ? `–${endLine}` : ""}` : "";
		return path ? [{ label: `${path}${range}`, path, startLine, endLine }] : [];
	}
	const refs = Array.isArray(value) ? value : (value && typeof value === "object" ? [value] : []);
	return refs.map((ref) => {
		if (!ref || typeof ref !== "object") return { label: String(ref || ""), path: "", startLine: 0, endLine: 0 };
		const path = ref.filePath || ref.path || ref.sourcePath || ref.file || ref.sourceFile || "";
		const startLine = Number(ref.startLine || ref.line || ref.lineStart || 0);
		const endLine = Number(ref.endLine || ref.lineEnd || startLine || 0);
		const range = startLine ? `:${startLine}${endLine && endLine !== startLine ? `–${endLine}` : ""}` : "";
		return { label: `${path || "Immutable snapshot evidence"}${range}`, path, startLine, endLine };
	}).filter((ref) => ref.label);
}

/**
 * Some panes keep a header (a validation summary, or a "this section didn't
 * complete" banner) alongside their item list, so the list must render into a
 * nested child rather than the pane itself — pane.innerHTML would otherwise
 * wipe that header on every re-render (e.g. after an item click). Panes with
 * no such header still own the whole pane directly.
 */
function modernizationListContainer(pane) {
	if (!pane) return pane;
	const nested = pane.querySelector(".modernization-validation-items") || pane.querySelector(".modernization-pane-items");
	return nested || pane;
}

function renderModernizationList(container, items) {
	container.innerHTML = "";
	const filtered = items.filter(modernizationItemMatches);
	if (!filtered.length) {
		container.appendChild(emptyStateElement({ icon: "search", title: "No proposal items match", hint: "Try clearing the search or validation filter." }));
		return;
	}
	filtered.forEach((item) => {
		const card = document.createElement("button");
		card.type = "button";
		card.className = "modernization-item-card";
		card.dataset.modernizationItem = modernizationItemKey(item);
		card.innerHTML = `<span class="modernization-item-title"></span><span class="modernization-item-meta"></span><span class="modernization-item-decision"></span>`;
		card.querySelector(".modernization-item-title").textContent = modernizationItemLabel(item);
		card.querySelector(".modernization-item-meta").textContent = modernizationItemMeta(item);
		const decision = state.modernization.decisions[modernizationItemKey(item)] || item.decision || "undecided";
		card.querySelector(".modernization-item-decision").textContent = item._modernizationType === "legacy-unit" ? "Evidence" : decision;
		card.classList.toggle("is-selected", modernizationItemKey(item) === modernizationItemKey(state.modernization.selectedItem || {}));
		container.appendChild(card);
	});
}

function renderModernizationDetail(item) {
	if (!elements.modernizationItemDetail) return;
	elements.modernizationItemDetail.innerHTML = "";
	if (!item) {
		elements.modernizationItemDetail.appendChild(emptyStateElement({ icon: "detail", title: "Select a proposal item", hint: "Inspect evidence, then record an accept or reject decision." }));
		return;
	}
	const detail = document.createElement("div");
	detail.className = "modernization-detail-card";
	detail.innerHTML = `<div class="modernization-detail-heading"><span class="eyebrow"></span><span class="status-badge"></span></div><h3></h3><div class="modernization-detail-summary"></div><section class="modernization-evidence-section"><h4>Immutable snapshot evidence</h4><div class="modernization-evidence-links"></div></section><dl class="modernization-detail-fields"></dl><div class="modernization-decision-controls"><label>Decision<select><option value="undecided">Undecided</option><option value="accepted">Accept</option><option value="rejected">Reject</option></select></label><label class="placement-selection" hidden>Selected placement<select><option value="main-app">New main application</option><option value="coldbox-module">ColdBox module</option><option value="background-worker">Background worker</option><option value="scheduled-service">Scheduled service / jobs host</option><option value="external-service">External service candidate</option></select></label><label>Note<textarea rows="3" maxlength="2000" placeholder="Why this decision? (optional)"></textarea></label><button type="button" class="primary-button">Save decision</button><button type="button" class="secondary-button">Clear decision</button><p role="status"></p></div>`;
	detail.querySelector(".eyebrow").textContent = item._modernizationType || "proposal";
	detail.querySelector(".status-badge").textContent = modernizationValidationStatus(item);
	detail.querySelector("h3").textContent = modernizationItemLabel(item);
	renderModernizationDetailSummary(detail.querySelector(".modernization-detail-summary"), item);
	const evidenceLinks = detail.querySelector(".modernization-evidence-links");
	const evidenceRefs = modernizationEvidenceRefs(item);
	if (evidenceRefs.length) {
		evidenceRefs.forEach((ref) => {
			const link = document.createElement("a");
			link.className = "modernization-evidence-link";
			link.href = "#modernization-item-detail";
			link.textContent = ref.label;
			link.title = "Evidence location in the immutable repository snapshot";
			link.dataset.snapshotPath = ref.path;
			link.dataset.snapshotStartLine = String(ref.startLine || "");
			link.dataset.snapshotEndLine = String(ref.endLine || "");
			evidenceLinks.appendChild(link);
		});
	} else {
		evidenceLinks.textContent = "No evidence reference; this item must be marked as a new proposal or resolved before acceptance.";
	}
	const fields = detail.querySelector(".modernization-detail-fields");
	Object.entries(item).forEach(([key, value]) => {
		if (key.startsWith("_") || key === "itemFingerprint" || ["evidenceRefs", "evidenceReferences", "evidence"].includes(key) || value === null || value === undefined || value === "") return;
		const dt = document.createElement("dt");
		const dd = document.createElement("dd");
		dt.textContent = key;
		dd.textContent = typeof value === "object" ? JSON.stringify(value) : String(value);
		fields.append(dt, dd);
	});
	const key = modernizationItemKey(item);
	const decisionTypes = ["target-unit", "unit-link", "route-contract", "db-finding", "db-transition", "roadmap-phase", "sample", "context", "extract", "placement"];
	const canDecide = decisionTypes.includes(item._modernizationType);
	if (!canDecide) {
		const controls = detail.querySelector(".modernization-decision-controls");
		controls.innerHTML = "<p>This evidence item is informational and does not require a human decision.</p>";
	}
	const prior = state.modernization.decisions[key] || item.decision || "undecided";
	if (!canDecide) {
		elements.modernizationItemDetail.appendChild(detail);
		return;
	}
	detail.querySelector("select").value = prior;
	const placementSelection = detail.querySelector(".placement-selection");
	if (item._modernizationType === "placement") {
		placementSelection.hidden = false;
		const selected = state.modernization.decisionSelections?.[key] || item.selectedOption || item.selectedPlacementType || item.placementType || "main-app";
		placementSelection.querySelector("select").value = selected;
	}
	detail.querySelector("textarea").value = state.modernization.decisionNotes?.[key] || item.note || "";
	detail.querySelector(".primary-button").addEventListener("click", async () => {
		const decision = detail.querySelector("select").value;
		if (decision === "undecided") return;
		await saveModernizationDecision(item, decision, detail.querySelector("textarea").value, detail.querySelector("p"), placementSelection && !placementSelection.hidden ? placementSelection.querySelector("select").value : "");
	});
	detail.querySelector(".secondary-button").addEventListener("click", async () => {
		await clearModernizationDecision(item, detail.querySelector("p"));
	});
	if (["db-finding", "db-transition"].includes(item._modernizationType)) {
		const rebuildSection = document.createElement("div");
		rebuildSection.className = "modernization-decision-controls modernization-item-rebuild";
		rebuildSection.innerHTML = `<label>Rebuild note <textarea rows="2" maxlength="1000" placeholder="Optional guidance for a redo of this item"></textarea></label><button type="button" class="secondary-button">Rebuild item</button><p role="status"></p>`;
		rebuildSection.querySelector("button").addEventListener("click", async () => {
			await rebuildModernizationItem(item, rebuildSection.querySelector("textarea").value, rebuildSection.querySelector("p"));
		});
		detail.appendChild(rebuildSection);
	}
	elements.modernizationItemDetail.appendChild(detail);
}

async function rebuildModernizationItem(item, note, statusElement) {
	if (!state.activeRun?.id) return;
	if (statusElement) statusElement.textContent = "Rebuilding item…";
	try {
		const payload = await request(`/api/v1/runs/${encodeURIComponent(state.activeRun.id)}/modernization/items/${encodeURIComponent(modernizationItemRouteId(item))}/rebuild`, {
			method: "POST",
			body: JSON.stringify({
				itemType: item._modernizationType,
				itemFingerprint: item.itemFingerprint || "",
				planFingerprint: state.modernization.result?.planFingerprint || "",
				note: String(note || "").trim()
			})
		});
		if (statusElement) statusElement.textContent = "Item rebuilt.";
		if (payload?.data?.result) renderModernizationResult(payload.data.result);
		else await loadResult(state.activeRun.id);
	} catch (error) {
		if (statusElement) statusElement.textContent = error.message || "Item rebuild failed.";
	}
}

/**
 * Small risk/effort chip pair (deterministic, from ModernizationRiskService's
 * read-time overlay — cross-references review findings for the same
 * project, no new LLM call). Returns "" when neither field is present so
 * older/degraded results render exactly as before.
 */
function modernizationRiskEffortBadges(item = {}) {
	const parts = [];
	if (item.effortSize) parts.push(`<span class="modernization-effort-chip" data-size="${architectureEscapeAttr(item.effortSize)}" title="Effort size (mapped unit count plus weighted coupling)">${architectureEscapeHtml(item.effortSize)}</span>`);
	if (item.riskLevel && String(item.riskLevel).toLowerCase() !== "none") {
		parts.push(`<span class="modernization-risk-chip" data-risk="${architectureEscapeAttr(item.riskLevel)}" title="${item.relatedFindingCount || 0} related review finding(s)">${architectureEscapeHtml(item.riskLevel)} risk</span>`);
	}
	return parts.join("");
}

/**
 * Resolves target.contexts/target.extracts targetUnitIds against the
 * already-evidenced result.target.units instead of asking the LLM to
 * restate file/method names in prose — the same file/method-level guide,
 * sourced from data the pipeline already verified, not new provider output.
 */
function modernizationResolveTargetUnitLabels(targetUnitIds) {
	if (!Array.isArray(targetUnitIds) || !targetUnitIds.length) return [];
	const units = state.modernization.result?.target?.units || [];
	const unitById = new Map(units.map((unit) => [String(unit.id || unit.itemId || ""), unit]));
	return targetUnitIds.map((id) => {
		const unit = unitById.get(String(id));
		if (!unit) return String(id);
		const methods = Array.isArray(unit.symbolNames) && unit.symbolNames.length ? ` (${unit.symbolNames.slice(0, 3).join(", ")})` : "";
		return `${unit.sourcePath || "unknown source"}${methods} → ${unit.targetPath || "unassigned target"}`;
	});
}

/**
 * Fills an <ol> with the shared migrationSteps rendering (legacy file:symbol
 * → target file:method, plus action/note) — used both by the generic
 * proposal-item detail panel (context/extract/roadmap-phase) and by the
 * primary "Slice Definition of Done" panel under the Road, so the guide
 * looks identical wherever a user finds it.
 */
function renderMigrationStepsInto(ol, steps) {
	ol.innerHTML = "";
	(Array.isArray(steps) ? steps : []).forEach((step) => {
		const li = document.createElement("li");
		const legacyRef = step.legacyRef || {};
		const targetRef = step.targetRef || {};
		const from = [legacyRef.filePath, legacyRef.symbolName].filter(Boolean).join(":");
		const to = [targetRef.targetPath, targetRef.methodName].filter(Boolean).join(":");
		const action = document.createElement("strong");
		action.textContent = step.action || "Step";
		li.appendChild(action);
		if (from || to) {
			const path = document.createElement("code");
			path.textContent = `${from || "?"} → ${to || "?"}`;
			li.append(document.createTextNode(" — "), path);
		}
		if (step.note) {
			const note = document.createElement("span");
			note.className = "field-hint";
			note.textContent = ` ${step.note}`;
			li.appendChild(note);
		}
		ol.appendChild(li);
	});
}

function renderModernizationDetailSummary(host, item = {}) {
	if (!host) return;
	const addMigrationSteps = (steps) => {
		if (!Array.isArray(steps) || !steps.length) return;
		const section = document.createElement("section");
		const heading = document.createElement("h4");
		heading.textContent = "Migration steps";
		section.appendChild(heading);
		const ol = document.createElement("ol");
		ol.className = "modernization-migration-steps";
		renderMigrationStepsInto(ol, steps);
		section.appendChild(ol);
		host.appendChild(section);
	};
	const add = (title, value, className = "") => {
		if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) return;
		const section = document.createElement("section");
		if (className) section.className = className;
		const heading = document.createElement("h4");
		heading.textContent = title;
		section.appendChild(heading);
		if (className === "modernization-code-sample") {
			const warning = document.createElement("p");
			warning.className = "field-hint";
			warning.textContent = "AI-proposed skeleton — validate before use; not production-complete.";
			const pre = document.createElement("pre");
			pre.textContent = String(value);
			section.append(warning, pre);
		} else if (Array.isArray(value)) {
			const ul = document.createElement("ul");
			value.forEach((entry) => {
				const li = document.createElement("li");
				li.textContent = typeof entry === "object" ? JSON.stringify(entry) : String(entry);
				ul.appendChild(li);
			});
			section.appendChild(ul);
		} else {
			const p = document.createElement("p");
			p.textContent = String(value);
			section.appendChild(p);
		}
		host.appendChild(section);
	};
	if (item._modernizationType === "target-unit") {
		add("Legacy source", cleanLegacySourceLabel(item));
		add("Proposed target", item.targetPath || item.pathHint);
		add("Purpose", item.purpose || item.description || item.proposedRole);
		add("Methods and signatures", item.signatures || item.symbolNames || item.methods);
		add("Related database findings", item.relatedDbFindingIds);
		add("Sample skeleton", item.sampleCode || item.code, "modernization-code-sample");
	} else if (item._modernizationType === "legacy-unit") {
		add("Purpose", item.purpose || "Purpose was not enriched for this unit.");
		add("Signature", item.signature || item.symbolName);
		add("Detected modernization signals", (item.signalIds || []).map(modernizationSignalLabel));
		add("Tables touched", item.touchedTables);
		add("Columns touched", item.touchedColumns);
	} else if (item._modernizationType === "roadmap-phase") {
		add("Classification", item.classification);
		add("Migration wave", item.wave);
		add("Estimated complexity", item.estimatedComplexity);
		add("Goal", item.goal || item.description);
		add("Pattern", item.pattern);
		add("Parity intent", item.parityIntent);
		if (item.effortSize) add("Estimated effort", item.effortSize);
		if (Array.isArray(item.effortDrivers) && item.effortDrivers.length) add("Effort drivers", item.effortDrivers.map(modernizationSignalLabel));
		if (item.riskLevel && String(item.riskLevel).toLowerCase() !== "none") {
			add("Related review findings", `${item.relatedFindingCount || 0} finding(s), worst severity: ${item.riskLevel}`);
		}
		add("Risks", item.risks);
		add("Testing strategy", item.testingStrategy);
		add("Exit checklist", Array.isArray(item.exitCriteria) ? item.exitCriteria : (item.exitCriteria ? [item.exitCriteria] : []));
		add("Rollback", item.rollbackStrategy || item.rollback);
		add("Implementer prompt", item.implementerPrompt);
		addMigrationSteps(item.migrationSteps);
	} else if (item._modernizationType === "db-finding") {
		add("Problem", item.problem || item.message);
		add("Proposed change", item.proposedChange || item.recommendation);
		add("Transition stage", item.expandContract);
		add("Objects affected", item.objectRef || item.objectsTouched);
		add("Sample migration", item.sampleMigration || item.migrationCode, "modernization-code-sample");
	} else if (item._modernizationType === "route-contract") {
		add("Legacy URL", item.legacyPath || item.path);
		add("Target event / route", item.targetEvent || item.targetRoute);
		add("Rollback", item.rollbackNote || item.rollback);
	} else if (item._modernizationType === "unit-link") {
		add("Legacy unit", item.legacyUnitId || item.sourceUnitId || item.sourcePath);
		add("Target unit", item.targetUnitId || item.targetId || item.targetPath);
		add("Migration relation", item.relation || item.relationship || item.kind);
		add("Transition notes", item.notes || item.description);
		add("Confidence", item.confidence);
	} else if (item._modernizationType === "placement") {
		const placementType = placementTypeOf(item);
		add("Recommended placement", placementType === "external-service"
			? "External-service candidate"
			: (placementType === "coldbox-module"
				? "ColdBox module"
				: (placementType === "background-worker"
					? "Background worker"
					: (placementType === "scheduled-service"
						? "Scheduled service / jobs host"
						: "New main application"))));
		add("Why this placement", item.rationale || item.recommendation || item.purpose);
		add("Gate status", item.gateStatus || "needs-review");
		add("Gate snapshot", (item.gates || []).map((gate) => `${gate.id || "gate"}: ${gate.status || "unknown"} — ${gate.explanation || ""}`));
		add("Unresolved questions", item.questions || item.uncertainty);
		add("Legacy → target units in this capability", modernizationResolveTargetUnitLabels(item.targetUnitIds));
	} else if (item._modernizationType === "context" || item._modernizationType === "extract") {
		const isExtract = item._modernizationType === "extract";
		if (!isExtract) add("Packaging", item.packaging === "coldbox-module" ? "ColdBox module candidate" : "Centralize (stay in the monolith)");
		add("Purpose", item.purpose);
		if (isExtract) {
			add("Why extract", item.reason);
			add("Suggested boundary", item.suggestedBoundary);
			add("Data boundary", item.dataBoundaryNote);
			add("Shared datasource risk", item.sharedDatasourceRisk);
		} else {
			add("Why this grouping", item.recommendation);
		}
		add("Basis", modernizationEvidenceBasisNote(item));
		add("Suggested module path", item.moduleSlug ? `app/modules/${item.moduleSlug}/` : "");
		if (item.riskLevel && String(item.riskLevel).toLowerCase() !== "none") {
			add("Related review findings", `${item.relatedFindingCount || 0} finding(s), worst severity: ${item.riskLevel}`);
		}
		if (item.effortSize) add("Estimated effort", item.effortSize);
		add("Legacy → target units in this group", modernizationResolveTargetUnitLabels(item.targetUnitIds));
		addMigrationSteps(item.migrationSteps);
	} else if (item._modernizationType === "db-transition") {
		add("Operation", item.operation);
		add("Order", item.order);
		add("Migration file", item.migrationPath);
		add("Objects touched", item.objectsTouched);
		add("Rollback", item.rollback);
		add("Sample migration", item.sampleMigration || item.migrationCode, "modernization-code-sample");
	} else if (item._modernizationType === "sample") {
		add("Kind", item.sampleKind);
		add("Target path", item.targetPath || item.path);
		add("Language", item.language);
		add("Code skeleton", item.code || item.sampleCode, "modernization-code-sample");
	}
	add("Validation issues", item._validationMessages);
}

async function saveModernizationDecision(item, decision, note, statusElement, selectedOption = "") {
	if (!state.activeRun?.id) return;
	try {
		const payload = await request(`/api/v1/runs/${encodeURIComponent(state.activeRun.id)}/modernization/items/${encodeURIComponent(modernizationItemRouteId(item))}/decision`, {
			method: "PUT",
			body: JSON.stringify({ itemType: item._modernizationType, itemFingerprint: item.itemFingerprint || "", decision, selectedOption: String(selectedOption || ""), note: String(note || "").trim() })
		});
		state.modernization.decisions[modernizationItemKey(item)] = decision;
		if (!state.modernization.decisionNotes) state.modernization.decisionNotes = {};
		state.modernization.decisionNotes[modernizationItemKey(item)] = String(note || "").trim();
		if (selectedOption) state.modernization.decisionSelections[modernizationItemKey(item)] = selectedOption;
		state.modernization.notice = "";
		if (payload?.data?.result) renderModernizationResult(payload.data.result);
		else if (payload?.data) renderModernizationResult({ ...state.modernization.result, planState: payload.data.state?.state || state.modernization.result?.planState, decisions: payload.data.decisions || state.modernization.result?.decisions || [] });
	if (statusElement) statusElement.textContent = "Decision saved.";
	} catch (error) {
		if (statusElement) statusElement.textContent = error.status === 409 ? "This proposal changed. Refreshing the result…" : error.message;
		if (error.status === 409 && state.activeRun?.id) {
			state.modernization.notice = "This proposal changed while you were deciding. The result was refreshed; review the current fingerprint before saving again.";
			state.modernization.noticeTone = "warning";
			state.modernization.decisions = {};
			state.modernization.decisionNotes = {};
			state.modernization.decisionSelections = {};
			state.modernization.selectedItem = null;
			await loadResult(state.activeRun.id);
		}
	}
}

async function clearModernizationDecision(item, statusElement) {
	if (!state.activeRun?.id) return;
	try {
		const payload = await request(`/api/v1/runs/${encodeURIComponent(state.activeRun.id)}/modernization/items/${encodeURIComponent(modernizationItemRouteId(item))}/decision`, { method: "DELETE", body: JSON.stringify({ itemType: item._modernizationType, itemFingerprint: item.itemFingerprint || "" }) });
		delete state.modernization.decisions[modernizationItemKey(item)];
		if (state.modernization.decisionNotes) delete state.modernization.decisionNotes[modernizationItemKey(item)];
		if (state.modernization.decisionSelections) delete state.modernization.decisionSelections[modernizationItemKey(item)];
		state.modernization.notice = "";
		if (payload?.data?.result) renderModernizationResult(payload.data.result);
		else if (payload?.data) renderModernizationResult({ ...state.modernization.result, planState: payload.data.state?.state || state.modernization.result?.planState, decisions: payload.data.decisions || state.modernization.result?.decisions || [] });
		if (statusElement) statusElement.textContent = "Decision cleared.";
	} catch (error) {
		if (statusElement) statusElement.textContent = error.status === 409 ? "This proposal changed. Refreshing the result…" : error.message;
		if (error.status === 409 && state.activeRun?.id) {
			state.modernization.notice = "This proposal changed while you were clearing a decision. The result was refreshed; review the current fingerprint.";
			state.modernization.noticeTone = "warning";
			state.modernization.decisions = {};
			state.modernization.decisionNotes = {};
			state.modernization.decisionSelections = {};
			state.modernization.selectedItem = null;
			await loadResult(state.activeRun.id);
		}
	}
}

/**
 * "Modernization Brief" — one prominent, always-on-top summary card built
 * purely from data Parts A-C already produce: coverage/validation status,
 * an effort roll-up and risk distribution across roadmap phases
 * (ModernizationRiskService), the packaging split (Modular Monolith Map),
 * and a one-line recommended next step. Pure aggregation lives in
 * modernizationBriefSummary() (modernization-render-helpers.js) so it's
 * unit-testable without the DOM; this function only renders it.
 */
function renderModernizationBrief(result = {}, planState = "") {
	const host = document.querySelector("#modernization-brief");
	if (!host) return;
	const summary = modernizationBriefSummary(result);
	host.hidden = !summary.hasPlan;
	if (!summary.hasPlan) {
		host.innerHTML = "";
		return;
	}
	const effortLine = Object.entries(summary.effortCounts)
		.filter(([, count]) => count > 0)
		.map(([size, count]) => `${count} ${size}`)
		.join(" · ") || "not yet sized";
	const packagingLine = `${summary.packagingSplit.centralized} centralized · ${summary.packagingSplit.modules} ColdBox module${summary.packagingSplit.modules === 1 ? "" : "s"} · ${summary.packagingSplit.extracts} microservice candidate${summary.packagingSplit.extracts === 1 ? "" : "s"}`;
	const gateLine = `${summary.gateSummary.decisionRequired} decision${summary.gateSummary.decisionRequired === 1 ? "" : "s"} required · ${summary.gateSummary.unknown} unknown gate${summary.gateSummary.unknown === 1 ? "" : "s"}${summary.gateSummary.failed ? ` · ${summary.gateSummary.failed} blocked` : ""}`;
	const riskLine = summary.riskyPhaseCount > 0
		? `${summary.riskyPhaseCount} slice${summary.riskyPhaseCount === 1 ? "" : "s"} touch${summary.riskyPhaseCount === 1 ? "es" : ""} known high/critical review findings — sequence ${summary.riskyPhaseCount === 1 ? "it" : "them"} earlier or pair with a fix.`
		: "No slices flagged against known review findings.";
	const driverLine = summary.currentSlice?.effortDrivers?.length
		? ` · coupling drivers: ${summary.currentSlice.effortDrivers.map(modernizationSignalLabel).join(", ")}`
		: "";
	const nextLine = summary.currentSlice
		? `Start with “${summary.currentSlice.name}”${summary.currentSlice.effortSize ? ` (${summary.currentSlice.effortSize})` : ""}${summary.currentSlice.riskLevel && summary.currentSlice.riskLevel !== "none" ? ` · ${summary.currentSlice.riskLevel} risk` : ""}${driverLine}.`
		: "Pick a Road step below to see its next action.";
	// Step 10: when the brief role ran, its verdict leads and the numbers move
	// below it. Only claims whose citations resolved server-side get this far, so
	// anything rendered here is grounded in a file this run actually inventoried.
	const stated = modernizationBriefVerdict(result);
	const verdictBlock = stated.hasVerdict
		? `<div class="modernization-brief-verdict">
				<p>${architectureEscapeHtml(stated.verdict)}</p>
				${stated.claims.length ? `<ul>${stated.claims.map((claim) =>
					`<li>${architectureEscapeHtml(claim.claim)} <code>${architectureEscapeHtml(claim.refs.join(", "))}</code></li>`
				).join("")}</ul>` : ""}
				${stated.droppedClaims > 0 ? `<p class="modernization-brief-dropped">${stated.droppedClaims} further claim${stated.droppedClaims === 1 ? "" : "s"} dropped: citations did not resolve.</p>` : ""}
			</div>`
		: "";

	host.innerHTML = `
		${verdictBlock}
		<div class="modernization-brief-stats">
			<div><span>Plan status</span><strong>${architectureEscapeHtml(planState || "unknown")}</strong></div>
			<div><span>Coverage</span><strong>${architectureEscapeHtml(summary.coverageStatus)}</strong></div>
			<div><span>Slices</span><strong>${summary.phaseCount}</strong><small>${architectureEscapeHtml(effortLine)}</small></div>
			<div><span>Packaging</span><small>${architectureEscapeHtml(packagingLine)}</small><small>${architectureEscapeHtml(gateLine)}</small></div>
		</div>
		<p class="modernization-brief-risk" data-has-risk="${summary.riskyPhaseCount > 0}">${architectureEscapeHtml(riskLine)}</p>
		<p class="modernization-brief-next"><strong>Recommended next:</strong> ${architectureEscapeHtml(nextLine)}</p>
	`;
}

/**
 * Puts the plan's real counts on the catalogs disclosure.
 *
 * The catalogs were labelled "optional — use after you pick a road slice" and
 * collapsed, so the richest part of the plan read as a footnote and went unread.
 * Showing what is actually inside turns the summary into a reason to open it.
 */
function renderModernizationCatalogCounts(result = {}) {
	const host = document.querySelector("#modernization-catalog-counts");
	if (!host) return;
	const target = result.target || {};
	const parts = [
		[asArray(target.units).length, "targets"],
		[asArray(result.unitLinks).length, "legacy links"],
		[asArray(result.routeContracts).length, "routes"],
		[asArray(result.dbFindings).length + asArray(result.dbTransitions).length, "database items"]
	].filter(([count]) => count > 0);
	host.textContent = parts.length
		? parts.map(([count, label]) => `${count} ${label}`).join(" · ")
		: "";
	host.hidden = !parts.length;
}

function renderModernizationResult(result = {}) {
	state.modernization.result = result;
	refreshModernizationFilterOptions(result);
	if (Array.isArray(result.decisions)) {
		result.decisions.forEach((decision) => {
			const key = decision.itemFingerprint || decision.itemId || decision.id;
			if (key && decision.decision) state.modernization.decisions[key] = decision.decision;
			if (key && decision.selectedOption) state.modernization.decisionSelections[key] = decision.selectedOption;
		});
	}
	const active = state.workspace === "modernize" || state.activeRun?.runKind === "modernize";
	if (elements.modernizationResults) {
		elements.modernizationResults.hidden = !active;
		elements.modernizationResults.dataset.state = active ? "active" : "idle";
	}
	if (!active) return;
	if (document.querySelector("#results-panel")) document.querySelector("#results-panel").dataset.state = "idle";
	renderModernizationCatalogCounts(result);
	const hasResult = !!result && Object.keys(result).length > 0;
	if (state.modernization.loading && !hasResult) {
		if (elements.modernizationPlanState) {
			elements.modernizationPlanState.textContent = "Loading plan";
			elements.modernizationPlanState.dataset.state = "running";
		}
		if (elements.modernizationOverview) {
			elements.modernizationOverview.innerHTML = emptyStateHtml({
				icon: "working",
				title: "Loading the saved modernization plan",
				hint: "Large evidence-backed plans can take a moment. Counts and packaging decisions will appear only after the complete result is available."
			});
		}
		if (elements.modernizationCoverageBanner) {
			elements.modernizationCoverageBanner.hidden = true;
			elements.modernizationCoverageBanner.textContent = "";
		}
		const solutionHost = document.querySelector("#modernization-solution");
		if (solutionHost) solutionHost.hidden = true;
		const architectureHost = document.querySelector("#modernization-architecture");
		if (architectureHost) architectureHost.hidden = true;
		const briefHost = document.querySelector("#modernization-brief");
		if (briefHost) { briefHost.hidden = true; briefHost.innerHTML = ""; }
		return;
	}
	if (state.modernization.error && !hasResult) {
		if (elements.modernizationPlanState) {
			elements.modernizationPlanState.textContent = "Plan unavailable";
			elements.modernizationPlanState.dataset.state = "failed";
		}
		if (elements.modernizationOverview) {
			elements.modernizationOverview.innerHTML = emptyStateHtml({
				icon: "warning",
				title: "Could not load the saved modernization plan",
				hint: state.modernization.error
			});
		}
		return;
	}
	if (!state.activeRun && !hasResult) {
		if (elements.modernizationPlanState) {
			elements.modernizationPlanState.textContent = "No plan";
			elements.modernizationPlanState.dataset.state = "idle";
		}
		if (elements.modernizationOverview) {
			elements.modernizationOverview.innerHTML = emptyStateHtml({ icon: "inbox", title: "No Modernize plan selected", hint: "Complete a Modernize run or open one from history to inspect its evidence and decisions." });
		}
		if (elements.modernizationCoverageBanner) {
			elements.modernizationCoverageBanner.hidden = true;
			elements.modernizationCoverageBanner.textContent = "";
		}
		if (elements.modernizationExportActions) elements.modernizationExportActions.hidden = true;
		if (elements.modernizationItemDetail) {
			elements.modernizationItemDetail.innerHTML = "";
			elements.modernizationItemDetail.appendChild(emptyStateElement({ icon: "detail", title: "Select a proposal item", hint: "A completed plan will show immutable evidence here." }));
		}
		const solutionHost = document.querySelector("#modernization-solution");
		if (solutionHost) solutionHost.hidden = true;
		const briefHost = document.querySelector("#modernization-brief");
		if (briefHost) { briefHost.hidden = true; briefHost.innerHTML = ""; }
		return;
	}
	const coverage = result.coverage || {};
	const validation = result.validation || {};
	const runStatus = state.activeRun?.status || "";
	const planState = result.planState || result.state || (runStatus === "succeeded" || runStatus === "partial" ? "needs-review" : runStatus || "queued");
	if (elements.modernizationPlanState) {
		elements.modernizationPlanState.textContent = planState;
		elements.modernizationPlanState.dataset.state = planState;
	}
	renderModernizationBrief(result, planState);
	if (elements.modernizationOverview) {
		const inventory = result.inventory || {};
		const inventorySummary = inventory.summary || {};
		const schema = coverage.schema || {};
		const llm = coverage.llm || {};
		const target = result.target || {};
		const targetRuntime = result.metadata?.runtime?.runtime || result.metadata?.runtime || "not specified";
		const targetProfile = result.metadata?.targetProfile || target.layoutProfile || "not specified";
		const placements = Array.isArray(target.placements) ? target.placements : [];
		const placementCounts = { "main-app": 0, "coldbox-module": 0, "external-service": 0, "background-worker": 0, "scheduled-service": 0 };
		placements.forEach((item) => { const type = String(item.placementType || "main-app").toLowerCase(); if (placementCounts[type] !== undefined) placementCounts[type]++; });
		const gateSummary = result.gateSummary || {};
		elements.modernizationOverview.innerHTML = `${state.modernization.notice ? '<p class="form-message modernization-notice" role="alert"></p>' : ""}<p class="result-summary"></p><div class="modernization-overview-metrics"><div><span>Files indexed</span><strong>${coverage.filesScanned || 0}</strong></div><div><span>Legacy units</span><strong>${inventorySummary.unitCount || (inventory.units || []).length}</strong></div><div><span>Target units</span><strong>${(target.units || []).length}</strong></div><div><span>Capabilities</span><strong>${placements.length || (target.contexts || []).length}</strong></div><div><span>Modules</span><strong>${placementCounts["coldbox-module"]}</strong></div><div><span>Workers</span><strong>${placementCounts["background-worker"] + placementCounts["scheduled-service"]}</strong></div><div><span>Service candidates</span><strong>${placementCounts["external-service"]}</strong></div><div><span>Decisions required</span><strong>${placements.filter((item) => item.decisionRequired).length}</strong></div><div><span>Schema objects</span><strong>${Object.values(schema.objects || {}).reduce((sum, value) => sum + Number(value || 0), 0)}</strong></div><div><span>Validation</span><strong>${validation.status || validation.overallStatus || "unknown"}</strong></div></div><div class="modernization-overview-details"><dl><dt>Target runtime</dt><dd>${targetRuntime}</dd><dt>Layout profile</dt><dd>${targetProfile}</dd><dt>Placement posture</dt><dd>${placementCounts["main-app"]} main app · ${placementCounts["coldbox-module"]} modules · ${placementCounts["background-worker"] + placementCounts["scheduled-service"]} workers · ${placementCounts["external-service"]} service candidates</dd><dt>Gate snapshot</dt><dd>${gateSummary.unknown || placements.reduce((count, item) => count + (item.gates || []).filter((gate) => String(gate.status || "").toLowerCase() === "unknown").length, 0)} unknown · ${gateSummary.failed || placements.reduce((count, item) => count + (item.gates || []).filter((gate) => String(gate.status || "").toLowerCase() === "fail").length, 0)} failed</dd><dt>Coverage status</dt><dd>${coverage.status || (coverage.complete === true ? "complete" : "incomplete")}</dd><dt>Provider coverage</dt><dd>${llm.status || "not-observed"} · ${llm.completed || 0} completed · ${llm.failed || 0} failed · ${llm.omitted || llm.omittedPartitions || 0} omitted</dd><dt>Source context prepared</dt><dd>${llm.partitions || llm.planned || 0} partitions · ${llm.files || 0} files · ${llm.contextCharacters || 0} characters</dd><dt>Unresolved evidence</dt><dd>${inventorySummary.unresolvedCount || inventory.unresolved?.length || 0}</dd></dl></div><div class="modernization-transition-guide" id="modernization-transition-guide"></div>`;
		const queuedSummary = runStatus === "queued" ? "Modernize is queued; the plan will appear after the shared repository scan." : runStatus === "running" ? "Modernize is building an evidence-backed plan. Proposal items will appear as stages complete." : runStatus === "failed" ? (state.activeRun?.message || "Modernize could not generate a plan.") : runStatus === "cancelled" ? "Modernize was cancelled before a complete plan was generated." : runStatus === "partial" ? "A partial Modernize plan was retained with review gates." : "Modernization proposal is ready for review.";
		elements.modernizationOverview.querySelector(".result-summary").textContent = result.summary || queuedSummary;
		const notice = elements.modernizationOverview.querySelector(".modernization-notice");
		if (notice) {
			notice.textContent = state.modernization.notice;
			notice.dataset.tone = state.modernization.noticeTone || "info";
		}
		renderModernizationTransitionGuide(result);
	}
	if (elements.modernizationCoverageBanner) {
		const genErrors = modernizationGenerationErrors(result);
		const hollow = modernizationPlanIsHollow(result);
		const genSummary = typeof modernizationGenerationSummary === "function"
			? modernizationGenerationSummary(result)
			: { status: "" };
		const genNotesPreview = modernizationGenerationNotes(result);
		const bannerText = Array.isArray(coverage.banners) ? coverage.banners.join(" ") : "";
		const note = coverage.note || coverage.remoteProviderDisclosure || result.remoteProviderDisclosure || bannerText || (coverage.complete === false ? "Coverage is incomplete; review the explicit gaps before accepting this plan." : "") || (coverage.schema?.coverage === "absent" ? "Database coverage is inference-limited because no schema pack was provided." : "") || (genErrors.length || genNotesPreview.length || genSummary.status === "partial_failure" ? "generation-errors" : "");
		elements.modernizationCoverageBanner.hidden = !note;
		if (note) {
			const schema = coverage.schema || {};
			const llm = coverage.llm || {};
			const repo = coverage.repository || {};
			const targetCount = result.target?.units?.length || 0;
			const targetContextCount = result.target?.placements?.length || result.target?.contexts?.length || 0;
			const sourceCount = coverage.filesScanned || repo.indexed || 0;
			const cfmlFiles = coverage.cfmlFiles || coverage.cfmlInventory?.files || 0;
			const appError = genErrors.find((item) => String(item.role || "") === "modernization-application");
			const genNotes = modernizationGenerationNotes(result);
			const hasMaps = targetCount > 0 || (result.routeContracts || []).length > 0;
			const shardMeta = result.metadata?.applicationShards || {};
			const summaryLead = genSummary.status === "partial_failure"
				? `<div class="modernization-generation-alert" data-tone="warning"><strong>Partial modernization</strong><p>${architectureEscapeHtml(genSummary.errorType || genSummary.stage || "proposal_generation")}${genSummary.message ? `: ${architectureEscapeHtml(genSummary.message)}` : ""}.${genSummary.incompleteStages.length ? ` Incomplete: ${architectureEscapeHtml(genSummary.incompleteStages.join(", "))}.` : ""}${genSummary.limitReached ? ` Limit: ${architectureEscapeHtml(genSummary.limitReached)}.` : ""}${genSummary.retryable ? " Retryable from the last proposal checkpoint." : ""}</p>${genSummary.recommendedContinuation ? `<p class="confidence-action">${architectureEscapeHtml(genSummary.recommendedContinuation)}</p>` : ""}${genSummary.checkpointId ? `<p class="confidence-action">Checkpoint: ${architectureEscapeHtml(genSummary.checkpointId)}</p>` : ""}</div>`
				: "";
			const failureLead = hollow
				? `<div class="modernization-generation-alert" data-tone="warning"><strong>Modernization plan incomplete</strong><p>${appError ? `The application role failed (${appError.message || "provider-failed"}), so this plan has road text without reliable file maps, routes, or samples.` : (result.metadata?.roadmapSource === "synthesized" || result.generationSummary?.actionability === "incomplete") ? "Critical stages were synthesized or empty — this plan is not an actionable Solution guide yet (missing migration steps/samples, and/or database/architecture incomplete)." : "This plan has roadmap phases but no target units or route contracts bound to legacy files."}</p><p class="confidence-action">${(typeof genSummary.recommendedContinuation === "string" && genSummary.recommendedContinuation.includes("/modernization/continue")) ? architectureEscapeHtml(genSummary.recommendedContinuation) : `Next: continue omitted/failed coverage or start a new Modernize run. Indexed inventory (${cfmlFiles || sourceCount} CFML/source files) is still browsable below.`}</p></div>`
				: (genErrors.length
					? `<div class="modernization-generation-alert"><strong>Partial generation</strong><p>${hasMaps ? `${targetCount} target units retained` : "No maps yet"}${shardMeta.accepted ? ` · application shards ${shardMeta.accepted}/${shardMeta.total || shardMeta.accepted}` : ""}. ${genErrors.slice(0, 3).map((item) => `${item.role || "role"}${item.shard ? ` #${item.shard}` : ""}: ${item.message || "failed"}`).join(" · ")}</p></div>`
					: (genNotes.length
						? `<div class="modernization-generation-alert" data-tone="info"><strong>Generation notes</strong><p>${hasMaps ? `${targetCount} target units · ` : ""}${shardMeta.accepted ? `shards ${shardMeta.accepted}/${shardMeta.total || shardMeta.accepted} · ` : ""}${genNotes.slice(0, 3).map((item) => item.message || "note").join(" · ")}</p></div>`
						: ""));
			// Multi-wave continue is the supported path for full-estate completeness;
			// keep the CTA host available whenever omitted/failed shard paths remain.
			const continueActions = `<p class="modernization-continue-actions" hidden><button type="button" class="secondary-button" data-modernization-continue>Continue omitted coverage</button></p>`;
			elements.modernizationCoverageBanner.innerHTML = `${summaryLead}${failureLead}${continueActions}<details class="modernization-confidence-details"${hollow ? "" : ""}><summary><span class="eyebrow">Plan confidence</span> · working limits of this run (optional)</summary><div class="modernization-confidence-heading"><strong>Modernize works within what this run indexed</strong><span class="status-badge" data-state="warning">Scoped</span></div><div class="modernization-confidence-grid"><section><h4>Repository scope</h4><p class="confidence-fact repository-detail"></p><p class="confidence-impact"></p><p class="confidence-action"></p></section><section><h4>Database evidence</h4><p class="confidence-fact schema-detail"></p><p class="confidence-impact"></p><p class="confidence-action"></p></section><section><h4>AI context</h4><p class="confidence-fact context-detail"></p><p class="confidence-impact"></p><p class="confidence-action"></p></section></div></details>`;
			const cards = elements.modernizationCoverageBanner.querySelectorAll(".modernization-confidence-grid > section");
			const jsIndexed = repo.supportedLanguages?.JavaScript || 0;
			const jsCandidates = repo.candidateLanguages?.JavaScript || 0;
			const cfmlComplete = !!repo.modernizationLanguagesComplete;
			elements.modernizationCoverageBanner.querySelector(".repository-detail").textContent = cfmlComplete && repo.truncation
				? `${cfmlFiles} CFML/BoxLang files fully indexed; ${sourceCount}/${repo.candidates || sourceCount} total files kept after scan budget (${jsIndexed} JS indexed${jsCandidates ? ` of ${jsCandidates}` : ""}; ${repo.skipped || 0} skipped).`
				: `${sourceCount} files indexed from ${repo.candidates || sourceCount} candidates (${cfmlFiles} CFML); ${repo.oversized || 0} oversized and ${repo.skipped || 0} skipped.`;
			cards[0].querySelector(".confidence-impact").textContent = cfmlComplete && repo.truncation
				? "Impact: CFML modernization scope is complete. Skipped files are mostly JavaScript/assets, not missing ColdFusion pages."
				: "Impact: catalogs and maps cover indexed files only — that is enough to plan slices inside the indexed set.";
			cards[0].querySelector(".confidence-action").textContent = cfmlComplete && repo.truncation
				? "Optional: ignore this warning for CFML strangler work, or point Modernize at the app folder to hide asset noise."
				: (repo.truncation
					? "Optional: narrow the project path to the app directory or raise DOUBLECHECK_SCAN_MAX_FILES if CFML files were skipped."
					: "Repository scope for this path is complete.");
			if (!repo.truncation) cards[0].querySelector(".confidence-action").textContent = "Repository scope for this path is complete.";
			elements.modernizationCoverageBanner.querySelector(".schema-detail").textContent = schema.coverage === "absent" ? "No schema pack attached — database work stays advisory." : `${schema.coverage || "unknown"}: ${schema.objects?.tables || 0} tables, ${schema.objects?.columns || 0} columns, ${schema.objects?.constraints || 0} constraints, ${schema.objects?.indexes || 0} indexes, ${schema.objects?.routines || 0} routines.`;
			cards[1].querySelector(".confidence-impact").textContent = schema.coverage === "absent" ? "Impact: you can still modernize application/route slices; do not implement DB migrations from inference alone." : "Impact: database proposals are limited to the parsed schema objects shown above.";
			cards[1].querySelector(".confidence-action").textContent = schema.coverage === "absent" ? "Optional: in Modernize setup, attach DDL/JSON or an in-repo schema path when you need verified DB work." : "Next: review unresolved schema objects in Evidence and catalogs before accepting transitions.";
			const gapCount = Array.isArray(llm.gaps) ? llm.gaps.length : 0;
			elements.modernizationCoverageBanner.querySelector(".context-detail").textContent = hollow
				? `Provider coverage ${llm.status || "incomplete"}: context was prepared (${llm.partitions || llm.planned || 0} partitions, ${llm.files || 0} files) but the application proposal did not land (${targetCount} target units; ${gapCount} explicit gaps).`
				: `Provider coverage ${llm.status || "unknown"}: ${llm.completed || 0} shards completed, ${llm.failed || 0} failed, ${llm.omitted || llm.omittedPartitions || 0} omitted; ${targetContextCount} contexts / ${targetCount} target units; ${gapCount} explicit gaps.`;
			cards[2].querySelector(".confidence-impact").textContent = hollow
				? "Impact: confidence gaps are secondary — rerun until target structure and mapped road slices appear."
				: (Number(llm.omittedPartitions || 0) > 0 && targetCount > 0
					? `Impact: prompt packing skipped ${llm.omittedPartitions} extra partitions, but ${targetCount} target units were still proposed — use Target structure as the authority.`
					: (Number(llm.omittedPartitions || 0) > 0
						? `Impact: ${llm.omittedPartitions} partitions were omitted; use Target structure as the authority for what this plan covers.`
						: "Impact: AI context packing covered the prepared partitions for this run."));
			cards[2].querySelector(".confidence-action").textContent = hollow
				? "Next: rerun Modernize; prefer a smaller app directory if the provider timed out on the full tree."
				: (targetCount > 0
					? "Next: accept or rebuild one mapped slice at a time using only the files listed for that slice."
					: "Next: accept or rebuild one mapped slice at a time using only the files listed for that slice.");
			if (cfmlComplete && !hollow && coverage.complete !== false && llm.status !== "incomplete") {
				elements.modernizationCoverageBanner.querySelector(".modernization-confidence-heading strong").textContent = "CFML scope is ready — other limits are optional";
				elements.modernizationCoverageBanner.querySelector(".status-badge").textContent = "Ready";
				elements.modernizationCoverageBanner.querySelector(".status-badge").dataset.state = "ok";
			}
			const continueHost = elements.modernizationCoverageBanner.querySelector(".modernization-continue-actions");
			const omittedCount = Number(shardMeta.omitted || (shardMeta.omittedPaths || []).length || genSummary.partialResults?.omittedPaths || 0);
			const failedCount = Number(shardMeta.failed || genSummary.partialResults?.failedShards || 0);
			const continueRecommended = typeof genSummary.recommendedContinuation === "string"
				&& genSummary.recommendedContinuation.includes("/modernization/continue");
			if (continueHost && (omittedCount > 0 || failedCount > 0 || continueRecommended) && state.activeRun?.id) {
				continueHost.hidden = false;
				const continueBtn = continueHost.querySelector("[data-modernization-continue]");
				if (continueBtn && !continueBtn.dataset.bound) {
					continueBtn.dataset.bound = "1";
					continueBtn.addEventListener("click", () => continueModernizeCoverage(state.activeRun.id, continueBtn));
				}
			}
		}
	}
	const paneRows = {
		legacy: modernizationItems(result, "legacy"), target: modernizationItems(result, "target"), routes: modernizationItems(result, "routes"), database: modernizationItems(result, "database"), links: modernizationItems(result, "links"), contexts: modernizationItems(result, "contexts"), roadmap: modernizationItems(result, "roadmap")
	};
	Object.entries(paneRows).forEach(([pane, rows]) => {
		const element = document.querySelector(`#modernization-pane-${pane}`);
		if (!element) return;
		const banner = modernizationPaneBanner(pane, result);
		if (banner) {
			element.innerHTML = `<p class="field-hint modernization-pane-banner">${banner}</p><div class="modernization-pane-items"></div>`;
			renderModernizationList(modernizationListContainer(element), rows);
		} else {
			renderModernizationList(element, rows);
		}
	});
	const validationPane = document.querySelector("#modernization-pane-validation");
	if (validationPane) {
		// The summary counts and the item list are separate children so re-rendering
		// the list later (e.g. after an item click) never wipes the summary — see
		// modernizationListContainer().
		validationPane.innerHTML = `<div class="modernization-validation-summary"><strong>${validation.status || validation.overallStatus || "unknown"}</strong><span>${validation.blockingCount || validation.blockers || 0} blocking · ${validation.warningCount || validation.warnings || 0} warnings</span></div><div class="modernization-validation-items"></div>`;
		renderModernizationList(modernizationListContainer(validationPane), modernizationItems(result, "validation"));
	}
	const overviewPane = document.querySelector("#modernization-pane-overview");
	if (overviewPane) overviewPane.innerHTML = `<p>${result.assumptions?.length || 0} assumptions · ${(result.signals || []).length} coupling signals · ${(result.samples || []).length} bounded samples</p><p class="field-hint">Every proposal item should point back to an evidence reference or be marked as a new proposal.</p>`;
	const selected = state.modernization.selectedItem;
	if (selected) renderModernizationDetail(selected);
	if (elements.modernizationExportActions) elements.modernizationExportActions.hidden = !state.terminal.has(state.activeRun?.status || "");
	renderModernizationSolution(result);
}

function selectedRoadPhase(result = {}) {
	const phases = Array.isArray(result.roadmapPhases) ? result.roadmapPhases : [];
	if (!phases.length) return null;
	if (state.modernization.selectedPhaseId) {
		const match = phases.find((phase) => phase.id === state.modernization.selectedPhaseId);
		if (match) return match;
	}
	const current = phases.find((phase) => phase.currentSlice);
	if (current && phaseHasCodeLinks(current)) return current;
	const firstLinked = phases.find((phase) => phaseHasCodeLinks(phase));
	if (firstLinked) return firstLinked;
	return current || phases[0];
}

function renderModernizationArchitecture(result = {}) {
	const host = document.querySelector("#modernization-architecture");
	if (!host) return;
	const placements = Array.isArray(result.target?.placements) && result.target.placements.length
		? result.target.placements
		: (result.target?.contexts || result.contexts || []).map((item) => ({ ...item, placementType: item.placementType || item.packaging || "main-app" })).concat((result.target?.extracts || result.extracts || []).map((item) => ({ ...item, placementType: item.placementType || "external-service" })));
	const contexts = placements.filter((item) => !isExtractPlacement(item));
	const extracts = placements.filter((item) => isExtractPlacement(item));
	host.hidden = !placements.length;
	if (host.hidden) return;
	const architectureCoverage = document.querySelector("#modernization-architecture-coverage");
	if (architectureCoverage) {
		const synthesized = result.metadata?.architectureSource === "synthesized";
		architectureCoverage.hidden = !synthesized;
		architectureCoverage.textContent = synthesized
			? "This packaging view is a conservative default (everything centralized) — the architecture analysis step didn't complete for this run."
			: "";
	}
	renderModernizationArchitectureMap(result);
	const selectedId = state.modernization.selectedArchitectureId;
	let selectedItem = null;
	if (selectedId) {
		const matchedContext = contexts.find((item) => String(item.id || item.itemId || "") === selectedId);
		const matchedExtract = extracts.find((item) => String(item.id || item.itemId || "") === selectedId);
		if (matchedContext) selectedItem = { ...matchedContext, _modernizationType: "placement" };
		else if (matchedExtract) selectedItem = { ...matchedExtract, _modernizationType: "placement" };
	}
	renderModernizationArchitectureDetail(selectedItem);
}

/**
 * Renders target placements as a vertical Modular Monolith Map — separate
 * lanes for main-app, ColdBox modules, and side-app/microservice candidates.
 */
function renderModernizationArchitectureMap(result = {}) {
	const mapHost = document.querySelector("#modernization-architecture-map");
	if (!mapHost) return;
	const subgraph = buildModernizationArchitectureSubgraph(result);
	if (subgraph.nodes.length <= 1) {
		mapHost.innerHTML = `<p class="field-hint">No packaging decisions yet — the architecture role hasn't produced main-app, module, or side-app candidates for this run.</p>`;
		return;
	}
	const layoutFn = typeof layoutModernizationArchitectureVertical === "function"
		? layoutModernizationArchitectureVertical
		: null;
	// Let the lane grid use the width the pane actually has rather than assuming
	// a fixed column count.
	const availableWidth = mapHost.clientWidth || mapHost.parentElement?.clientWidth || 0;
	const layout = layoutFn
		? layoutFn(subgraph, { availableWidth })
		: (window.ArchitectureFlow ? window.ArchitectureFlow.layoutFlowPositions(subgraph) : null);
	if (!layout) {
		mapHost.innerHTML = `<p class="field-hint">Architecture map layout is unavailable in this build.</p>`;
		return;
	}
	const byId = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
	const selectedId = state.modernization.selectedArchitectureId;

	const laneLabels = (layout.lanes || []).map((lane) =>
		`<text class="architecture-lane-label" x="20" y="${lane.y + 12}">${architectureEscapeHtml(lane.title)} · ${lane.count}</text>`
	).join("");

	const edgeLines = layout.edges.map((e) => {
		const a = byId[e.from];
		const b = byId[e.to];
		if (!a || !b) return "";
		const vertical = Math.abs(b.y - a.y) >= Math.abs(b.x - a.x);
		if (vertical) {
			const x1 = a.x + a.w / 2;
			const y1 = a.y + a.h;
			const x2 = b.x + b.w / 2;
			const y2 = b.y;
			const dy = Math.max(18, (y2 - y1) * 0.4);
			return `<path class="architecture-edge" d="M${x1} ${y1} C${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}" />`;
		}
		const x1 = a.x + a.w;
		const y1 = a.y + a.h / 2;
		const x2 = b.x;
		const y2 = b.y + b.h / 2;
		const dx = Math.max(36, (x2 - x1) * 0.45);
		return `<path class="architecture-edge" d="M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}" />`;
	}).join("");

	const nodeHtml = layout.nodes.map((n) => {
		const sel = selectedId && selectedId === n.id ? " is-selected" : "";
		const roleClass = n.role === "core" ? " is-core" : n.role === "extract" ? " is-extract" : n.role === "centralized" ? " is-centralized" : " is-module";
		const speculative = n.item && String(n.item.evidenceBasis || "").toLowerCase() === "domain-clustering";
		const packagingLabel = n.role === "core"
			? "core"
			: n.role === "extract"
				? "side-app / microservice"
				: n.role === "module"
					? "coldbox module"
					: "main application";
		const subLabel = n.role === "core"
			? (n.unitCount > 0 ? `${n.unitCount} ungrouped unit${n.unitCount === 1 ? "" : "s"}` : "shared app bootstrap")
			: `${packagingLabel} · ${n.unitCount} unit${n.unitCount === 1 ? "" : "s"}${speculative ? " · speculative" : ""}`;
		const risk = n.item?.riskLevel && String(n.item.riskLevel).toLowerCase() !== "none" ? String(n.item.riskLevel).toLowerCase() : "";
		const riskDot = risk
			? `<circle class="architecture-node-risk" data-risk="${architectureEscapeAttr(risk)}" cx="${n.w - 10}" cy="10" r="5"><title>${architectureEscapeAttr(risk)} risk · ${n.item.relatedFindingCount || 0} related review finding(s)</title></circle>`
			: "";
		return `<g class="architecture-node${roleClass}${sel}" data-architecture-id="${architectureEscapeAttr(n.id)}" tabindex="0" role="button" aria-label="${architectureEscapeAttr(n.path)}" transform="translate(${n.x},${n.y})">
			<title>${architectureEscapeAttr(n.path)}</title>
			<rect class="architecture-node-card" width="${n.w}" height="${n.h}" rx="10" ry="10"></rect>
			<rect class="architecture-node-rail" x="0" y="0" width="4" height="${n.h}" rx="2"></rect>
			<text class="architecture-node-title" x="14" y="23">${architectureEscapeHtml(n.path)}</text>
			<text class="architecture-node-sub" x="14" y="41">${architectureEscapeHtml(subLabel)}</text>
			${riskDot}
		</g>`;
	}).join("");

	mapHost.innerHTML = `<svg class="modernization-architecture-svg is-vertical" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<marker id="modernization-architecture-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
				<path d="M0,0 L7,3.5 L0,7 Z" fill="#5a738a"></path>
			</marker>
		</defs>
		${laneLabels}
		${edgeLines}
		${nodeHtml}
	</svg>`;
	[...mapHost.querySelectorAll(".architecture-node")].forEach((node) => {
		const selectNode = () => {
			const id = node.dataset.architectureId || "";
			state.modernization.selectedArchitectureId = state.modernization.selectedArchitectureId === id ? "" : id;
			renderModernizationArchitecture(state.modernization.result || result);
		};
		node.addEventListener("click", selectNode);
		node.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectNode(); } });
	});
}

/**
 * Read-only "Migration Blueprint" for the packaging decision selected on the
 * map — reuses renderModernizationDetailSummary() (the same body renderer
 * the full item-detail panel under "Evidence and catalogs" uses) so the
 * context/extract field enrichment (resolved legacy/target unit list,
 * migration steps) only has to live in one place.
 */
function renderModernizationArchitectureDetail(item) {
	const host = document.querySelector("#modernization-architecture-detail");
	if (!host) return;
	host.innerHTML = "";
	if (!item) {
		host.appendChild(emptyStateElement({ icon: "detail", title: "Select a packaging decision", hint: "Click a node on the map for its migration blueprint." }));
		return;
	}
	const placementType = placementTypeOf(item);
	const isExtract = item._modernizationType === "extract" || ["external-service", "microservice", "side-app", "extract"].includes(placementType);
	const card = document.createElement("div");
	card.className = "modernization-detail-card";
	card.innerHTML = `<div class="modernization-detail-heading"><span class="eyebrow"></span><span class="status-badge"></span></div><h3></h3><div class="modernization-detail-summary"></div>`;
	card.querySelector(".eyebrow").textContent = isExtract
		? "microservice / side-app candidate"
		: (["coldbox-module", "module"].includes(placementType)
			? "coldbox module candidate"
			: (placementType === "background-worker"
				? "background worker candidate"
				: (placementType === "scheduled-service"
					? "scheduled service / jobs host"
					: "main application (stays in the monolith)")));
	card.querySelector(".status-badge").textContent = modernizationValidationStatus(item);
	card.querySelector("h3").textContent = item.name || item.id || "Packaging decision";
	renderModernizationDetailSummary(card.querySelector(".modernization-detail-summary"), item);
	host.appendChild(card);
}

function renderModernizationSolution(result = {}) {
	const host = document.querySelector("#modernization-solution");
	if (!host) return;
	const hasPlan = !!(result.roadmapPhases?.length || result.target?.placements?.length || result.target?.units?.length || result.inventory?.units?.length);
	host.hidden = !hasPlan;
	if (!hasPlan) return;
	const hollow = modernizationPlanIsHollow(result);
	const phases = orderedRoadmapPhases(result.roadmapPhases || []);
	const phase = selectedRoadPhase({ ...result, roadmapPhases: phases.length ? phases : result.roadmapPhases });
	if (phase?.id) state.modernization.selectedPhaseId = phase.id;
	const mappedPhase = phaseHasCodeLinks(phase || {});
	const road = result.coverage?.road || {};
	const unslicedToggle = document.querySelector("#modernization-show-unsliced");
	const showInventory = !!state.modernization.showUnsliced || hollow;
	if (unslicedToggle) unslicedToggle.checked = showInventory;
	const coverageEl = document.querySelector("#modernization-road-coverage");
	if (coverageEl) {
		const onRoad = Number(road.onRoad ?? 0);
		const notYet = Number(road.notYetSliced ?? 0);
		const schemaAbsent = (result.coverage?.schema?.coverage || "") === "absent";
		coverageEl.hidden = false;
		coverageEl.textContent = (hollow
			? `Narrative road only · ${(result.inventory?.units || []).length} legacy units indexed · rerun to get file maps`
			: `${onRoad} on road · ${notYet} not yet sliced${schemaAbsent ? " · schema inference-limited" : ""}`)
			+ (result.metadata?.roadmapSource === "synthesized"
				? " · Generic fallback road — the AI roadmap step didn't complete, so phases are grouped by file count, not by feature."
				: "");
	}
	const stackEl = document.querySelector("#modernization-source-stack");
	if (stackEl) {
		stackEl.hidden = !road.sourceStackNote;
		stackEl.textContent = road.sourceStackNote || "";
	}
	const unitIds = new Set(asArray(phase?.unitIds).map(String));
	const routeIds = new Set(asArray(phase?.routeIds).map(String));
	const findingIds = new Set(asArray(phase?.dbFindingIds).map(String));
	const transitionIds = new Set(asArray(phase?.transitionIds).map(String));
	const onRoadLegacy = new Set();
	if (mappedPhase) {
		(result.target?.units || []).forEach((unit) => {
			if (unitIds.size && !unitIds.has(String(unit.id))) return;
			(unit.legacyUnitIds || []).forEach((id) => onRoadLegacy.add(String(id)));
		});
		(result.unitLinks || []).forEach((link) => {
			if (unitIds.size && link.targetUnitId && !unitIds.has(String(link.targetUnitId))) return;
			if (link.legacyUnitId) onRoadLegacy.add(String(link.legacyUnitId));
		});
	}
	const legacyList = document.querySelector("#modernization-legacy-list");
	if (legacyList) {
		legacyList.innerHTML = "";
		const units = result.inventory?.units || [];
		const filtered = units.filter((unit) => {
			const id = String(unit.id || "");
			const onRoad = onRoadLegacy.has(id);
			if (showInventory) return true;
			if (!mappedPhase) return false;
			return onRoad;
		});
		if (!filtered.length) {
			legacyList.innerHTML = !mappedPhase && !showInventory
				? phaseScaffoldEmptyHtml("legacy")
				: `<p class="field-hint">${showInventory ? "No legacy units in inventory." : "This mapped phase did not resolve to legacy catalog rows. Try another Road step or open Evidence and catalogs."}</p>`;
		} else {
			if (hollow) {
				const note = document.createElement("p");
				note.className = "modernization-phase-empty";
				note.innerHTML = "<strong>Indexed legacy catalog</strong> — no phase has file maps yet, so the full indexed inventory is shown.";
				legacyList.appendChild(note);
			}
			filtered.slice(0, 80).forEach((unit) => {
				const row = document.createElement("button");
				row.type = "button";
				row.className = "modernization-solution-row";
				const onRoad = onRoadLegacy.has(String(unit.id || ""));
				row.innerHTML = `<span class="modernization-item-title"></span><span class="modernization-item-meta"></span>`;
				row.querySelector(".modernization-item-title").textContent = unit.path || unit.filePath || unit.name || unit.id || "Legacy unit";
				row.querySelector(".modernization-item-meta").textContent = `${unit.kind || unit.layer || "unit"}${onRoad ? "" : " · not yet sliced"}`;
				legacyList.appendChild(row);
			});
		}
	}
	const roadList = document.querySelector("#modernization-road-list");
	if (roadList) {
		roadList.innerHTML = "";
		if (hollow) {
			const note = document.createElement("p");
			note.className = "modernization-phase-empty";
			note.innerHTML = "<strong>Narrative road (unmapped)</strong> — phases below are guidance text only. Rerun Modernize so the application role can attach targets and routes.";
			roadList.appendChild(note);
		}
		phases.forEach((item, index) => {
			const card = document.createElement("button");
			card.type = "button";
			const linked = phaseHasCodeLinks(item);
			card.className = `modernization-road-card ${linked ? "is-mapped" : "is-scaffold"}`;
			card.classList.toggle("is-selected", item.id === phase?.id);
			card.dataset.phaseId = item.id || "";
			card.innerHTML = `<span class="modernization-road-index">${index + 1}</span><span class="modernization-road-body"><strong></strong><span class="modernization-item-meta"></span></span><span class="modernization-road-badges"></span><span class="status-badge"></span>`;
			card.querySelector("strong").textContent = item.name || item.goal || item.id || `Phase ${index + 1}`;
			card.querySelector(".modernization-item-meta").textContent = (item.name && item.goal && item.name !== item.goal)
				? item.goal
				: (item.parityIntent || (linked ? "Mapped slice" : "Setup / scaffold — no file map yet"));
			card.querySelector(".modernization-road-badges").innerHTML = modernizationRiskEffortBadges(item);
			card.querySelector(".status-badge").textContent = item.pattern || (linked ? "mapped" : "scaffold");
			card.addEventListener("click", () => {
				state.modernization.selectedPhaseId = item.id || "";
				renderModernizationSolution(state.modernization.result || result);
			});
			roadList.appendChild(card);
		});
	}
	const routeStrip = document.querySelector("#modernization-route-strip");
	if (routeStrip) {
		const routeObservation = result.coverage?.observations?.routes?.state || "not-observed";
		const routes = mappedPhase
			? (result.routeContracts || []).filter((route) => !routeIds.size || routeIds.has(String(route.id)))
			: [];
		if (!mappedPhase) {
			routeStrip.innerHTML = hollow
				? `<p class="modernization-phase-empty"><strong>No route contracts</strong> — the application proposal did not produce routes for this run.</p>`
				: phaseScaffoldEmptyHtml("routes");
		} else {
			routeStrip.innerHTML = routes.length
				? `<h4>Routes</h4>${routes.map((route) => `<div class="modernization-route-row"><code></code><span></span></div>`).join("")}`
				: `<p class="field-hint">No route contracts linked to this phase · source state: ${routeObservation}.</p>`;
			[...routeStrip.querySelectorAll(".modernization-route-row")].forEach((row, index) => {
				const route = routes[index];
				row.querySelector("code").textContent = `${route.method || "GET"} ${route.legacyPath || route.path || "?"} → ${route.targetRoute || route.targetEvent || "?"}`;
				row.querySelector("span").textContent = route.rollbackNote || route.rollback || "";
			});
		}
	}
	const targetTree = document.querySelector("#modernization-target-tree");
	if (targetTree) {
		const units = mappedPhase
			? (result.target?.units || []).filter((unit) => !unitIds.size || unitIds.has(String(unit.id)))
			: [];
		if (!mappedPhase) {
			targetTree.innerHTML = hollow
				? `<p class="modernization-phase-empty"><strong>No target structure</strong> — rerun Modernize so the application role can propose ColdBox handlers, models, and views from the indexed legacy files.</p>`
				: phaseScaffoldEmptyHtml("targets");
		} else {
			targetTree.innerHTML = units.length ? "" : `<p class="field-hint">No target units linked to this phase.</p>`;
			units.forEach((unit) => {
				const row = document.createElement("button");
				row.type = "button";
				row.className = "modernization-solution-row";
				row.innerHTML = `<span class="modernization-item-title"></span><span class="modernization-item-meta"></span>`;
				row.querySelector(".modernization-item-title").textContent = unit.targetPath || unit.pathHint || unit.id;
				row.querySelector(".modernization-item-meta").textContent = `${unit.layer || "target"} · ${(unit.symbolNames || []).slice(0, 3).join(", ") || "—"}`;
				row.addEventListener("click", () => {
					state.modernization.selectedItem = { ...unit, _modernizationType: "target-unit" };
					renderModernizationDetail(state.modernization.selectedItem);
				});
				targetTree.appendChild(row);
			});
		}
	}
	const sliceDb = document.querySelector("#modernization-slice-db");
	if (sliceDb) {
		const findings = mappedPhase
			? (result.dbFindings || []).filter((item) => !findingIds.size || findingIds.has(String(item.id)))
			: [];
		const transitions = mappedPhase
			? (result.dbTransitions || []).filter((item) => !transitionIds.size || transitionIds.has(String(item.id)))
			: [];
		const schemaAbsent = (result.coverage?.schema?.coverage || "") === "absent";
		if (!mappedPhase) {
			sliceDb.innerHTML = hollow
				? `<p class="modernization-phase-empty"><strong>Database notes</strong> — schema pack is still optional; application file maps must succeed first.</p>`
				: phaseScaffoldEmptyHtml("database");
		} else if (schemaAbsent && !findings.length && !transitions.length) {
			sliceDb.innerHTML = `<p class="field-hint">No schema pack — database notes for this slice are inference-limited.</p>`;
		} else if (!findings.length && !transitions.length) {
			sliceDb.innerHTML = `<p class="field-hint">No database findings linked to this phase.</p>`;
		} else {
			sliceDb.innerHTML = `<h4>Slice database</h4><ul></ul>`;
			const list = sliceDb.querySelector("ul");
			findings.slice(0, 8).forEach((item) => {
				const li = document.createElement("li");
				li.textContent = `${item.category || "db"} · ${item.objectRef || item.id}: ${item.proposedChange || item.problem || ""}`;
				list.appendChild(li);
			});
			transitions.slice(0, 8).forEach((item) => {
				const li = document.createElement("li");
				li.textContent = `${item.operation || "transition"} · ${item.migrationPath || item.id}`;
				list.appendChild(li);
			});
		}
	}
	renderModernizationArchitecture(result);
	const dod = document.querySelector("#modernization-slice-dod");
	if (dod && !phase) {
		dod.innerHTML = `<p class="field-hint">Select a roadmap phase to review definition of done.</p>`;
	} else if (dod) {
		const exit = Array.isArray(phase.exitCriteria) ? phase.exitCriteria : [];
		const currentPhaseId = phases.find((item) => item.currentSlice)?.id ?? phases.find((item) => phaseHasCodeLinks(item))?.id ?? phases[0]?.id;
		const isCurrent = phase.id === currentPhaseId;
		const eyebrow = hollow ? "Narrative step (unmapped)" : mappedPhase ? "Slice definition of done" : "Setup step definition of done";
		dod.innerHTML = `
			<div class="modernization-guide-heading"><div><p class="eyebrow">${eyebrow}</p><h3></h3></div><span class="status-badge"></span></div>
			${hollow ? `<p class="modernization-phase-empty">Treat this as planning notes only until a rerun produces mapped targets. Rebuild will not invent missing application maps.</p>` : mappedPhase ? "" : `<p class="modernization-phase-empty">This step is scaffold/setup. Accept it when the exit criteria are true, then move to a mapped Road slice to modernize concrete files.</p>`}
			<p class="modernization-dod-goal"></p>
			<p class="modernization-dod-parity"></p>
			<p class="modernization-dod-effort"></p>
			<div class="modernization-dod-grid"><section><h4>Exit criteria</h4><ul class="exit"></ul></section><section><h4>Rollback</h4><p class="rollback"></p></section><section class="modernization-dod-hard" hidden><h4>What makes this hard</h4><ul class="modernization-dod-difficulty"></ul></section></div>
			<section class="modernization-dod-prompt"><h4>Implementer prompt</h4><pre></pre></section>
			<section class="modernization-dod-migration-steps" hidden><h4>Migration steps</h4><ol class="modernization-migration-steps"></ol></section>
			<label class="modernization-rebuild-note">Rebuild note <textarea id="modernization-rebuild-note" rows="2" maxlength="1000" placeholder="Optional guidance for a redo of this slice"></textarea></label>
			<div class="modernization-dod-actions">
				<button type="button" class="primary-button" data-slice-action="accept" ${isCurrent ? "" : `disabled title="Only the current slice can be accepted or rejected — select it from the Road to act on it."`}>Accept slice</button>
				<button type="button" class="secondary-button" data-slice-action="reject" ${isCurrent ? "" : `disabled title="Only the current slice can be accepted or rejected — select it from the Road to act on it."`}>Reject slice</button>
				<button type="button" class="secondary-button" data-slice-action="rebuild">Rebuild slice</button>
			</div>
			<p class="form-message" id="modernization-slice-action-status" role="status"></p>`;
		dod.querySelector("h3").textContent = phase.name || phase.id;
		dod.querySelector(".status-badge").textContent = phase.classification || phase.pattern || (mappedPhase ? "mapped" : "scaffold");
		dod.querySelector(".modernization-dod-goal").textContent = phase.goal || "";
		dod.querySelector(".modernization-dod-parity").textContent = [
			phase.classification ? `Classification: ${phase.classification}` : "",
			phase.wave ? `Wave ${phase.wave}` : "",
			phase.estimatedComplexity ? `Complexity: ${phase.estimatedComplexity}` : "",
			phase.parityIntent ? `Parity: ${phase.parityIntent}` : ""
		].filter(Boolean).join(" · ");
		dod.querySelector(".modernization-dod-effort").textContent = Array.isArray(phase.effortDrivers) && phase.effortDrivers.length
			? `Weighted effort drivers: ${phase.effortDrivers.map(modernizationSignalLabel).join(", ")}`
			: (Array.isArray(phase.risks) && phase.risks.length ? `Risks: ${phase.risks.join("; ")}` : "");
		const exitList = dod.querySelector("ul.exit");
		if (!exit.length) exitList.innerHTML = `<li class="field-hint">No exit criteria listed.</li>`;
		else exit.forEach((item) => {
			const li = document.createElement("li");
			li.textContent = item;
			exitList.appendChild(li);
		});
		dod.querySelector(".rollback").textContent = phase.rollbackStrategy || phase.rollback || "No rollback note.";
		dod.querySelector("pre").textContent = phase.implementerPrompt || "No implementer prompt.";
		// Deterministic coupling evidence for this slice — the shared state,
		// include chains and dynamic construction that decide how hard the
		// migration actually is, not just which files move.
		const difficulty = modernizationSliceDifficulty(result, phase);
		const hardSection = dod.querySelector(".modernization-dod-hard");
		if (difficulty.groups.length && hardSection) {
			hardSection.hidden = false;
			const list = hardSection.querySelector("ul");
			list.innerHTML = "";
			difficulty.groups.forEach((group) => {
				const li = document.createElement("li");
				const label = document.createElement("strong");
				label.textContent = `${group.label} · ${group.count}`;
				li.appendChild(label);
				if (group.impact) {
					const impact = document.createElement("span");
					impact.className = "difficulty-impact";
					impact.textContent = group.impact;
					li.appendChild(impact);
				}
				if (group.files.length) {
					const where = document.createElement("code");
					where.textContent = group.files.join(", ");
					li.append(document.createElement("br"), where);
				}
				list.appendChild(li);
			});
		}
		const migrationSteps = Array.isArray(phase.migrationSteps) ? phase.migrationSteps : [];
		const migrationStepsSection = dod.querySelector(".modernization-dod-migration-steps");
		if (migrationSteps.length && migrationStepsSection) {
			migrationStepsSection.hidden = false;
			renderMigrationStepsInto(migrationStepsSection.querySelector("ol"), migrationSteps);
		}
		dod.querySelector('[data-slice-action="accept"]').addEventListener("click", () => saveSliceDecision(phase, "accepted"));
		dod.querySelector('[data-slice-action="reject"]').addEventListener("click", () => saveSliceDecision(phase, "rejected"));
		dod.querySelector('[data-slice-action="rebuild"]').addEventListener("click", () => rebuildSlice(phase));
	}
}

async function saveSliceDecision(phase, decision) {
	if (!state.activeRun?.id || !phase?.id) return;
	const status = document.querySelector("#modernization-slice-action-status");
	try {
		const payload = await request(`/api/v1/runs/${encodeURIComponent(state.activeRun.id)}/modernization/items/${encodeURIComponent(phase.id)}/decision`, {
			method: "PUT",
			body: JSON.stringify({
				itemType: "roadmap-phase",
				itemFingerprint: phase.itemFingerprint || "",
				planFingerprint: state.modernization.result?.planFingerprint || "",
				decision
			})
		});
		if (status) status.textContent = `Slice ${decision}.`;
		if (payload?.data?.result) renderModernizationResult(payload.data.result);
		else await loadResult(state.activeRun.id);
	} catch (error) {
		if (status) status.textContent = error.message || "Could not save slice decision.";
	}
}

async function rebuildSlice(phase) {
	if (!state.activeRun?.id || !phase?.id) return;
	const status = document.querySelector("#modernization-slice-action-status");
	const note = document.querySelector("#modernization-rebuild-note")?.value || "";
	if (status) status.textContent = "Rebuilding slice…";
	try {
		const payload = await request(`/api/v1/runs/${encodeURIComponent(state.activeRun.id)}/modernization/phases/${encodeURIComponent(phase.id)}/rebuild`, {
			method: "POST",
			body: JSON.stringify({
				note,
				planFingerprint: state.modernization.result?.planFingerprint || ""
			})
		});
		if (status) status.textContent = "Slice rebuilt.";
		if (payload?.data?.result) renderModernizationResult(payload.data.result);
		else await loadResult(state.activeRun.id);
	} catch (error) {
		if (status) status.textContent = error.message || "Slice rebuild failed.";
	}
}

/** One rolled-up line covering the whole plan (fallback sources, validation
 * counts, undecided speculative packaging picks) so the user doesn't have to
 * visit every band/tab to know if anything needs a second look. Empty string
 * when there's nothing to flag. */
function modernizationAttentionSummary(result = {}) {
	const flags = [];
	const metadata = result.metadata || {};
	if (metadata.roadmapSource === "synthesized") flags.push("roadmap is a generic fallback");
	if (metadata.architectureSource === "synthesized") flags.push("packaging is a conservative default");
	const validation = result.validation || {};
	const blocking = Number(validation.blocking ?? validation.blockingCount ?? 0);
	const warnings = Number(validation.warnings ?? validation.warningCount ?? 0);
	if (blocking) flags.push(`${blocking} blocking issue${blocking === 1 ? "" : "s"}`);
	if (warnings) flags.push(`${warnings} warning${warnings === 1 ? "" : "s"}`);
	const speculative = [
		...(result.target?.contexts || result.contexts || []),
		...(result.target?.extracts || result.extracts || [])
	].filter((item) => String(item.evidenceBasis || "").toLowerCase() === "domain-clustering");
	const undecided = speculative.filter((item) => {
		const decision = state.modernization.decisions[modernizationItemKey(item)] || item.decision || "undecided";
		return decision === "undecided";
	});
	if (undecided.length) flags.push(`${undecided.length} module/extract pick${undecided.length === 1 ? "" : "s"} still undecided`);
	return flags.length ? `Needs attention: ${flags.join(" · ")}.` : "";
}

function renderModernizationTransitionGuide(result = {}) {
	const host = document.querySelector("#modernization-transition-guide");
	if (!host) return;
	const target = result.target || {};
	const metadata = result.metadata || {};
	const runtime = metadata.runtime?.runtime || metadata.runtime || "boxlang";
	const profile = metadata.targetProfile || target.layoutProfile || "modern";
	const phases = orderedRoadmapPhases(result.roadmapPhases || []);
	const mapped = phases.filter((phase) => phaseHasCodeLinks(phase));
	const hollow = modernizationPlanIsHollow(result);
	const next = mapped.find((phase) => phase.currentSlice) || mapped[0] || phases.find((phase) => phase.currentSlice) || phases[0];
	const list = (items, empty) => items.length ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : `<p class="field-hint">${empty}</p>`;
	const attention = modernizationAttentionSummary(result);
	const attentionLine = attention ? `<p class="modernization-guide-attention">${attention}</p>` : "";
	if (hollow) {
		host.innerHTML = `<div class="modernization-guide-heading"><div><p class="eyebrow">How to use this plan</p><h3>Rerun until file maps appear</h3></div><span class="status-badge">${runtime} · ${profile}</span></div>
			${attentionLine}
			<p class="modernization-guide-next"><strong>Blocked:</strong> this plan is narrative-only (generic packaging and/or coverage stubs without enough AI-mapped targets). Set Directory scope to the folders you care about, raise duration/cost if the form allows, and rerun — Rebuild will not invent missing application maps.</p>
			<div class="modernization-guide-grid">
				<section><h4>1. What you still have</h4>${list([
					`${(result.inventory?.units || []).length} legacy units from the indexed tree are browsable in Legacy you have.`,
					"Database findings may still appear, but stay advisory without a schema pack."
				], "No inventory.")}</section>
				<section><h4>2. What is missing</h4>${list([
					"Target structure, route contracts, and phase→file links.",
					"Accept/Rebuild cannot invent those maps from an empty application fragment."
				], "Nothing missing.")}</section>
				<section><h4>3. What to do next</h4>${list([
					"Start a new Modernize run; prefer the application directory if the full repo times out the provider.",
					"Attach a schema pack only when you need verified database migrations."
				], "No next step.")}</section>
			</div>`;
		return;
	}
	host.innerHTML = `<div class="modernization-guide-heading"><div><p class="eyebrow">How to use this plan</p><h3>Follow the Road, one slice at a time</h3></div><span class="status-badge">${runtime} · ${profile}</span></div>
		${attentionLine}
		<p class="modernization-guide-next"><strong>Next:</strong> ${next ? `Review <em>${next.name || next.id}</em> in the Solution bands below, check exit criteria, then Accept or Rebuild that slice.` : "Complete a Modernize run to generate roadmap slices."}</p>
		<div class="modernization-guide-grid">
			<section><h4>1. Pick a Road step</h4>${list([
				"Prefer badges like coexist-route or vertical-slice — those have file maps.",
				"Scaffold / foundation steps are setup only; empty left/right panels are expected."
			], "No road guidance.")}</section>
			<section><h4>2. Review Definition of Done</h4>${list([
				"Read goal, parity, exit criteria, and rollback for the selected step.",
				"Accept when the slice is good enough; Rebuild if the proposal is wrong."
			], "No DoD guidance.")}</section>
			<section><h4>3. Then optional catalogs</h4>${list([
				"Open Evidence and catalogs only for blockers or missing links.",
				"Attach a schema pack in Modernize setup when database work matters."
			], "No catalog guidance.")}</section>
		</div>
		<div class="modernization-guide-actions"><strong>Mapped slices on this plan</strong>${list(
			mapped.slice(0, 6).map((phase, index) => `<strong>${index + 1}. ${phase.name || phase.id || "Slice"}</strong><br>${phase.goal || phase.parityIntent || phase.pattern || "Mapped modernization slice."}`),
			mapped.length ? "No mapped slices." : "No file-mapped slices yet — start with a scaffold step’s exit criteria, then rebuild or rerun for a vertical slice."
		)}</div>`;
}

function codeGraphLayoutApi() {
	return window.CodeGraphLayout || null;
}

function resetCodeGraphSelection() {
	state.codegraph.selectedId = "";
	state.codegraph.focusId = "";
	if (elements.codegraphInspector) {
		elements.codegraphInspector.innerHTML = emptyStateHtml({
			icon: "detail",
			title: "Select a node",
			hint: "Inspect cluster or file details here."
		});
	}
}

function codeGraphApplyViewBox() {
	const svg = elements.codegraphCanvas?.querySelector("svg");
	const CG = codeGraphLayoutApi();
	if (!svg || !CG || !state.codegraph.viewport) return;
	svg.setAttribute("viewBox", CG.viewBoxOf(state.codegraph.viewport));
}

function codeGraphCentreOnNode(nodeId) {
	const CG = codeGraphLayoutApi();
	const layout = state.codegraph.layoutResult;
	const node = layout?.nodes?.find((n) => n.id === nodeId);
	if (!CG || !node || !state.codegraph.viewport) return;
	const vp = state.codegraph.viewport;
	vp.x = node.x + node.w / 2 - vp.width / 2;
	vp.y = node.y + node.h / 2 - vp.height / 2;
	codeGraphApplyViewBox();
}

function codeGraphNarrative() {
	const snapshot = state.codegraph.snapshot || {};
	const narrative = snapshot.narrative;
	if (!narrative || typeof narrative !== "object" || !narrative.used) return null;
	return narrative;
}

function codeGraphSummaryForNode(node) {
	const narrative = codeGraphNarrative();
	if (!narrative || !Array.isArray(narrative.summaries) || !node) return null;
	const nodeId = node.id || node.path || "";
	const clusterId = node.kind === "cluster" ? node.id : (node.clusterId || "");
	return narrative.summaries.find((item) => {
		if (item.clusterId && clusterId && item.clusterId === clusterId) return true;
		if (item.nodeId && nodeId && item.nodeId === nodeId) return true;
		if (item.nodeId && node.path && item.nodeId === node.path) return true;
		return false;
	}) || null;
}

function codeGraphAiSummaryHtml(summary, narrative) {
	if (!summary) return "";
	const provider = [narrative?.provider, narrative?.model].filter(Boolean).join("/") || "AI";
	const title = summary.title ? `<strong>${escapeHtml(summary.title)}</strong> ` : "";
	return `<div class="codegraph-ai-note" data-origin="ai" title="Generated by ${escapeHtml(provider)} — not evidence"><span class="ai-chip">AI</span>${title}<span>${escapeHtml(summary.text || "")}</span></div>`;
}

function codeGraphInspectorHtml(node) {
	if (!node) {
		return emptyStateHtml({ icon: "detail", title: "Select a node", hint: "Inspect cluster or file details here." });
	}
	const rows = [
		["Kind", node.kind || "—"],
		["Path", node.path || "—"],
		["Cluster", node.clusterId || "—"],
		["Layer", node.layer != null ? String(node.layer) : "—"],
		["Files", node.fileCount != null ? String(node.fileCount) : ""],
		["Fan-in", node.fanIn != null ? String(node.fanIn) : ""],
		["Fan-out", node.fanOut != null ? String(node.fanOut) : ""],
		["Hotspot", node.hotspotScore != null ? String(node.hotspotScore) : ""],
		["In cycle", node.inCycle ? "Yes" : ""]
	].filter(([, value]) => value !== "");
	const narrative = codeGraphNarrative();
	const summary = state.codegraph.showAi ? codeGraphSummaryForNode(node) : null;
	const aiBlock = codeGraphAiSummaryHtml(summary, narrative);
	return `<div class="codegraph-inspector-body"><h3>${escapeHtml(node.label || node.id || "Node")}</h3><dl class="codegraph-inspector-grid">${rows.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd title="${escapeHtml(v)}">${escapeHtml(v)}</dd></div>`).join("")}</dl>${aiBlock}<p class="field-hint">${node.kind === "cluster" ? "Click again to open files in this cluster." : "Click again to load the neighbourhood subgraph."}</p></div>`;
}

function renderCodeGraphAiSummaries() {
	const host = elements.codegraphAiSummaries;
	const toggle = elements.codegraphShowAi;
	const narrative = codeGraphNarrative();
	const hasAi = !!(narrative && Array.isArray(narrative.summaries) && narrative.summaries.length);
	if (toggle) {
		toggle.disabled = !hasAi;
		toggle.checked = hasAi && !!state.codegraph.showAi;
		toggle.title = hasAi
			? `Generated by ${[narrative.provider, narrative.model].filter(Boolean).join("/") || "AI"} — not evidence`
			: "No AI summaries for this snapshot";
	}
	if (!host) return;
	if (!hasAi || !state.codegraph.showAi) {
		host.hidden = true;
		host.innerHTML = "";
		return;
	}
	const provider = [narrative.provider, narrative.model].filter(Boolean).join("/") || "AI";
	host.hidden = false;
	host.innerHTML = narrative.summaries.slice(0, 24).map((item) => {
		const label = item.title || item.clusterId || item.nodeId || "Summary";
		const target = item.clusterId || item.nodeId || "";
		return `<button type="button" class="codegraph-ai-summary" data-origin="ai" data-codegraph-ai-target="${escapeHtml(String(target))}" title="Generated by ${escapeHtml(provider)} — not evidence"><span class="ai-chip">AI</span><strong>${escapeHtml(String(label))}</strong><span>${escapeHtml(item.text || "")}</span></button>`;
	}).join("");
}

function renderCodeGraphIssues() {
	if (!elements.codegraphIssueList || !elements.codegraphIssueTabs) return;
	const snapshot = state.codegraph.snapshot || {};
	const tab = state.codegraph.issueTab || "cycles";
	elements.codegraphIssueTabs.querySelectorAll("[data-codegraph-issue]").forEach((button) => {
		const selected = button.dataset.codegraphIssue === tab;
		button.setAttribute("aria-selected", selected ? "true" : "false");
	});
	const lists = {
		cycles: snapshot.cycles || [],
		orphans: snapshot.orphans || [],
		violations: snapshot.layerViolations || [],
		hotspots: snapshot.hotspots || []
	};
	const rows = lists[tab] || [];
	if (!rows.length) {
		elements.codegraphIssueList.innerHTML = emptyStateHtml({
			icon: "inbox",
			title: `No ${tab}`,
			hint: "This snapshot has nothing in this issue category."
		});
		return;
	}
	elements.codegraphIssueList.innerHTML = rows.slice(0, 80).map((item, index) => {
		const id = item.id || item.path || item.from || item.nodeId || `issue-${index}`;
		const label = item.label || item.path || item.members?.join(", ") || item.message || id;
		return `<button type="button" class="codegraph-issue-item" data-codegraph-focus="${escapeHtml(String(id))}" data-codegraph-paths="${escapeHtml(JSON.stringify(item.members || item.filePaths || [item.path || id].filter(Boolean)))}">${escapeHtml(String(label))}</button>`;
	}).join("");
}

function renderCodeGraphBreadcrumb() {
	if (!elements.codegraphBreadcrumb) return;
	const parts = [{ id: "root", label: "Clusters" }];
	if (state.codegraph.mode === "file" || state.codegraph.mode === "focus") {
		parts.push({ id: "cluster", label: state.codegraph.clusterId || "Files" });
	}
	if (state.codegraph.mode === "focus") {
		parts.push({ id: "focus", label: state.codegraph.focusId || "Focus" });
	}
	elements.codegraphBreadcrumb.hidden = parts.length < 2;
	elements.codegraphBreadcrumb.innerHTML = parts.map((part, index) => {
		const last = index === parts.length - 1;
		return last
			? `<span class="codegraph-crumb is-current">${escapeHtml(part.label)}</span>`
			: `<button type="button" class="codegraph-crumb" data-codegraph-crumb="${escapeHtml(part.id)}">${escapeHtml(part.label)}</button>`;
	}).join('<span class="codegraph-crumb-sep" aria-hidden="true">/</span>');
}

function paintCodeGraphCanvas() {
	const CG = codeGraphLayoutApi();
	const host = elements.codegraphCanvas;
	if (!CG || !host) return;
	const snapshot = state.codegraph.snapshot;
	if (!snapshot) {
		host.innerHTML = "";
		return;
	}
	const layoutMode = state.codegraph.layout || "cluster";
	let view;
	if (state.codegraph.mode === "focus" && state.codegraph.focusSubgraph) {
		view = CG.buildFocusView(state.codegraph.focusSubgraph, { maxNodes: 120 });
	} else if (state.codegraph.mode === "file") {
		const clusterId = state.codegraph.clusterId;
		const filtered = {
			nodes: (snapshot.nodes || []).filter((n) => !clusterId || n.clusterId === clusterId || (n.path && clusterId && String(n.clusterId) === String(clusterId))),
			edges: snapshot.edges || []
		};
		if (clusterId && !filtered.nodes.length) {
			const cluster = (snapshot.clusters || []).find((c) => String(c.id) === String(clusterId));
			const paths = new Set((cluster?.filePaths || []).map((p) => String(p).replace(/\\/g, "/").toLowerCase()));
			filtered.nodes = (snapshot.nodes || []).filter((n) => paths.has(String(n.path || n.id || "").replace(/\\/g, "/").toLowerCase()));
		}
		view = CG.buildFileView(filtered, { maxNodes: 120 });
	} else {
		view = CG.buildClusterView(snapshot, { maxNodes: 60 });
	}
	state.codegraph.viewTruncated = !!(view.truncated || snapshot.truncated);
	const layout = layoutMode === "layer"
		? CG.layoutLayered(view)
		: layoutMode === "radial"
			? CG.layoutRadial(view)
			: CG.layoutClusters(view);
	state.codegraph.layoutResult = layout;
	host.innerHTML = CG.buildSvg(layout, { ariaLabel: "Code knowledge graph" });
	const svg = host.querySelector("svg");
	if (svg) {
		const rect = host.getBoundingClientRect();
		const vp = CG.createViewport({
			x: 0,
			y: 0,
			width: Math.max(rect.width || 800, 400),
			height: Math.max(rect.height || 520, 320),
			scale: 1
		});
		state.codegraph.viewport = CG.fitToBounds(vp, { width: layout.width, height: layout.height }, 24);
		svg.setAttribute("viewBox", CG.viewBoxOf(state.codegraph.viewport));
		svg.setAttribute("width", "100%");
		svg.setAttribute("height", "100%");
		svg.querySelectorAll(".cg-node").forEach((node) => {
			node.classList.toggle("is-selected", node.getAttribute("data-node-id") === state.codegraph.selectedId);
		});
	}
	if (elements.codegraphTruncation) {
		const reasons = [].concat(snapshot.truncationReasons || snapshot.truncation_reasons || []).filter(Boolean);
		const show = state.codegraph.viewTruncated || !!snapshot.truncated;
		elements.codegraphTruncation.hidden = !show;
		elements.codegraphTruncation.textContent = show
			? `Graph truncated${reasons.length ? `: ${reasons.join("; ")}` : " — showing a capped subset of nodes/edges."}`
			: "";
	}
	renderCodeGraphBreadcrumb();
}

function renderCodeGraph(result = {}) {
	const active = state.workspace === "codegraph" || state.activeRun?.runKind === "codegraph";
	if (elements.codegraphExplorer) {
		elements.codegraphExplorer.hidden = !active;
		elements.codegraphExplorer.dataset.state = active ? "active" : "idle";
	}
	if (!active) return;
	if (result && Object.keys(result).length) state.codegraph.result = result;
	const snapshot = result?.codegraph || state.codegraph.snapshot;
	if (snapshot && typeof snapshot === "object") state.codegraph.snapshot = snapshot;
	const hasSnapshot = !!(state.codegraph.snapshot && (state.codegraph.snapshot.clusters || state.codegraph.snapshot.nodes));
	const totals = state.codegraph.snapshot?.totals || {};
	if (totals.nodes != null) state.commandMetrics.findings = totals.nodes;
	if (totals.clusters != null) {
		state.commandMetrics.specialistTotal = totals.clusters;
		state.commandMetrics.specialistCompleted = totals.clusters;
	}
	updateCommandMetrics(state.activeRun);
	if (elements.codegraphStatus) {
		if (state.codegraph.loading && !hasSnapshot) {
			elements.codegraphStatus.textContent = "Loading graph";
			elements.codegraphStatus.dataset.state = "running";
		} else if (state.codegraph.error && !hasSnapshot) {
			elements.codegraphStatus.textContent = "Unavailable";
			elements.codegraphStatus.dataset.state = "failed";
		} else if (hasSnapshot) {
			elements.codegraphStatus.textContent = `${totals.nodes || 0} nodes · ${totals.clusters || 0} clusters`;
			elements.codegraphStatus.dataset.state = "ok";
		} else {
			elements.codegraphStatus.textContent = "No snapshot";
			elements.codegraphStatus.dataset.state = "idle";
		}
	}
	if (elements.codegraphFailed) {
		const failed = !!(state.codegraph.error && !hasSnapshot);
		elements.codegraphFailed.hidden = !failed;
		elements.codegraphFailed.textContent = failed ? state.codegraph.error : "";
	}
	if (elements.codegraphEmpty) elements.codegraphEmpty.hidden = hasSnapshot || state.codegraph.loading || !!state.codegraph.error;
	const showChrome = hasSnapshot;
	if (elements.codegraphToolbar) elements.codegraphToolbar.hidden = !showChrome;
	if (elements.codegraphWorkspace) elements.codegraphWorkspace.hidden = !showChrome;
	if (elements.codegraphIssues) elements.codegraphIssues.hidden = !showChrome;
	if (!showChrome) {
		if (elements.codegraphCanvas) elements.codegraphCanvas.innerHTML = "";
		if (elements.codegraphAiSummaries) {
			elements.codegraphAiSummaries.hidden = true;
			elements.codegraphAiSummaries.innerHTML = "";
		}
		if (elements.codegraphShowAi) {
			elements.codegraphShowAi.disabled = true;
			elements.codegraphShowAi.checked = false;
		}
		return;
	}
	if (elements.codegraphLayout && elements.codegraphLayout.value !== state.codegraph.layout) {
		elements.codegraphLayout.value = state.codegraph.layout;
	}
	paintCodeGraphCanvas();
	renderCodeGraphIssues();
	renderCodeGraphAiSummaries();
	const selected = state.codegraph.layoutResult?.nodes?.find((n) => n.id === state.codegraph.selectedId);
	if (elements.codegraphInspector) elements.codegraphInspector.innerHTML = codeGraphInspectorHtml(selected);
}

async function codeGraphDrillToFocus(nodeId) {
	const runId = state.activeRun?.id;
	if (!runId || !nodeId) return;
	try {
		const payload = await request(
			`/api/v1/runs/${encodeURIComponent(runId)}/codegraph/subgraph?focus=${encodeURIComponent(nodeId)}&depth=2&limit=120`
		);
		state.codegraph.mode = "focus";
		state.codegraph.focusId = nodeId;
		state.codegraph.focusSubgraph = payload.data;
		state.codegraph.selectedId = nodeId;
		paintCodeGraphCanvas();
		codeGraphCentreOnNode(nodeId);
		if (elements.codegraphInspector) {
			const selected = state.codegraph.layoutResult?.nodes?.find((n) => n.id === nodeId);
			elements.codegraphInspector.innerHTML = codeGraphInspectorHtml(selected);
		}
	} catch (error) {
		if (elements.codegraphFailed) {
			elements.codegraphFailed.hidden = false;
			elements.codegraphFailed.textContent = error.message || "Could not load subgraph.";
		}
	}
}

function codeGraphSelectNode(nodeId, { drill = false } = {}) {
	const layout = state.codegraph.layoutResult;
	const node = layout?.nodes?.find((n) => n.id === nodeId);
	if (!node) return;
	const same = state.codegraph.selectedId === nodeId;
	state.codegraph.selectedId = nodeId;
	elements.codegraphCanvas?.querySelectorAll(".cg-node").forEach((el) => {
		el.classList.toggle("is-selected", el.getAttribute("data-node-id") === nodeId);
	});
	if (elements.codegraphInspector) elements.codegraphInspector.innerHTML = codeGraphInspectorHtml(node);
	if (!drill && !same) return;
	if (node.kind === "cluster" || state.codegraph.mode === "cluster") {
		state.codegraph.mode = "file";
		state.codegraph.clusterId = nodeId;
		state.codegraph.focusId = "";
		state.codegraph.focusSubgraph = null;
		paintCodeGraphCanvas();
		return;
	}
	codeGraphDrillToFocus(nodeId);
}

function renderResult(result = {}) {
	if (state.workspace === "modernize" || state.activeRun?.runKind === "modernize") {
		renderModernizationResult(result);
		return;
	}
	if (state.workspace === "codegraph" || state.activeRun?.runKind === "codegraph") {
		renderCodeGraph(result);
		return;
	}
	if (!elements.summary) return;
	const scope = result.reviewScope || "";
	const unavailable = scope === "working-tree-unavailable" || scope === "revision-diff-unavailable";
	const hasPayload = !!(
		result.filesScanned ||
		result.findingsCount ||
		(result.findings || []).length ||
		result.graph?.summary?.symbolCount ||
		result.architecture?.summary?.factCount ||
		state.activeRun
	);
	const resultsPanel = document.querySelector("#results-panel");
	const architecturePanel = document.querySelector("#architecture-explorer");
	if (resultsPanel) resultsPanel.dataset.state = hasPayload ? "active" : "idle";
	if (architecturePanel) architecturePanel.dataset.state = hasPayload ? "active" : "idle";
	if (!hasPayload) {
		elements.summary.textContent = "Complete a run to inspect its indexed languages and evidence-backed findings.";
		elements.summary.dataset.tone = "idle";
	} else {
		elements.summary.textContent = result.summary || "The review has not produced a summary yet.";
		elements.summary.dataset.tone = unavailable ? "warning" : (result.findingsCount ? "ok" : "idle");
	}
	state.architectureReviewScope = result.reviewScope || "full";
	renderDiscoveryCoverage(result.skipped, result.discoveryTruncated);
	elements.resultFiles.textContent = result.filesScanned || 0;
	elements.resultLanguages.textContent = (result.languages || []).join(", ") || "—";
	elements.resultCount.textContent = result.findingsCount || 0;
	state.commandMetrics.files = result.filesScanned || state.commandMetrics.files || 0;
	state.commandMetrics.languages = result.languages || state.commandMetrics.languages || [];
	state.commandMetrics.findings = result.findingsCount || 0;
	const aiFiles = result.aiFilesReviewed || 0;
	const totalFiles = result.filesScanned || 0;
	elements.resultAiCoverage.textContent = result.aiEnabled
		? `${aiFiles}/${totalFiles} files · ${result.aiCharactersSent || 0} chars`
		: "Not used";
	elements.aiBadge.textContent = result.aiEnabled
		? `bx-ai ${aiFiles}/${totalFiles} + deterministic`
		: "Deterministic";
	const revision = result.repositoryRevision
		? ` · ${result.repositoryRevision.slice(0, 12)}`
		: "";
	elements.resultScope.textContent = `${result.reviewScope || "—"}${revision}`;
	const graph = result.graph?.summary || {};
	elements.resultGraph.textContent = `${graph.symbolCount || 0} symbols · ${graph.dependencyCount || 0} edges · ${graph.impactCount || 0} impacts`;
	const architecture = result.architecture?.summary || {};
	const architectureDiff = result.architectureDiff?.summary || {};
	const plan = result.plan?.summary || {};
	const reused = result.architectureReused ? " · reused" : "";
	elements.resultPlan.textContent = `${architecture.factCount || 0} facts (${architecture.inferredFacts || 0} enriched) · ${plan.taskCount || 0}/${plan.taskLimit || 0} tasks · ${plan.contextRangeCount || 0} ranges/${plan.contextLineCount || 0} lines · ${plan.allocatedTokens || 0}/${plan.tokenBudget || 0} tokens · +${architectureDiff.addedCount || 0}/-${architectureDiff.removedCount || 0}${reused}`;
	seedCrewFromPlan({
		crewSource: plan.crewSource || "",
		crewSummary: plan.crewSummary || "",
		selectedRoles: plan.selectedRoles || [],
		roles: plan.selectedRoles || [],
		tasks: (result.plan?.tasks || []).map((task) => ({
			role: task.role,
			brief: task.brief || "",
			objective: task.objective || "",
			status: "queued",
			stage: "queued",
			message: "From review plan"
		}))
	});
	const specialists = result.specialists?.summary || {};
	state.commandMetrics.specialistCompleted = specialists.completedTasks || 0;
	state.commandMetrics.specialistTotal = specialists.taskCount || 0;
	updateCommandMetrics();
	elements.resultSpecialists.textContent = `${specialists.completedTasks || 0}/${specialists.taskCount || 0} complete · ${specialists.failedTasks || 0} failed · ${specialists.toolCalls || 0} tool calls`;
	const specialistWarning = specialistWarningText(result);
	if (specialistWarning) {
		elements.summary.textContent = `${result.summary || "Review finished."} ${specialistWarning}`;
		elements.summary.dataset.tone = "warning";
	}
	renderSpecialistResults(result);
	renderArchitectureExplorer(result);
	renderBaselineSummary(result);
	state.findings = result.findings || [];
	if (state.pendingFindingFingerprint) {
		const pending = state.findings.find(
			(finding) => finding.fingerprint === state.pendingFindingFingerprint
		);
		if (pending) state.selectedFindingId = pending.id;
		state.pendingFindingFingerprint = "";
	}
	if (!state.findings.some((finding) => finding.id === state.selectedFindingId)) {
		state.selectedFindingId = state.findings[0]?.id || "";
	}
	renderFindingsWorkspace(unavailable);
	renderFixedFindings(result);
}

function findingPriority(finding) {
	return {
		critical: 0,
		high: 1,
		medium: 2,
		low: 3,
		info: 4
	}[finding.severity] ?? 5;
}

function filteredFindings() {
	const search = state.findingSearch.trim().toLowerCase();
	const rows = state.findings.filter((finding) => {
		if (state.findingSeverity !== "all" && finding.severity !== state.findingSeverity) {
			return false;
		}
		if (
			state.findingReviewState !== "all" &&
			(finding.review?.state || "new") !== state.findingReviewState
		) {
			return false;
		}
		if (!search) return true;
		return [
			finding.title,
			finding.message,
			finding.filePath,
			finding.ruleId,
			finding.category,
			finding.source
		].some((value) => String(value || "").toLowerCase().includes(search));
	});
	return rows.sort((left, right) => {
		if (state.findingSort === "confidence") {
			return Number(right.confidence || 0) - Number(left.confidence || 0);
		}
		if (state.findingSort === "file") {
			return String(left.filePath || "").localeCompare(String(right.filePath || ""));
		}
		return findingPriority(left) - findingPriority(right) ||
			Number(right.confidence || 0) - Number(left.confidence || 0);
	});
}

function renderFindingSeveritySummary() {
	if (!elements.findingSeveritySummary) return;
	const severities = ["critical", "high", "medium", "low", "info"];
	elements.findingSeveritySummary.innerHTML = "";
	severities.forEach((severity) => {
		const count = state.findings.filter((finding) => finding.severity === severity).length;
		if (!count) return;
		const item = document.createElement("button");
		item.type = "button";
		item.className = `severity-total severity-${severity}`;
		item.dataset.findingSeverity = severity;
		item.innerHTML = `<span>${severity}</span><strong>${count}</strong>`;
		item.classList.toggle("is-active", state.findingSeverity === severity);
		elements.findingSeveritySummary.appendChild(item);
	});
}

function renderFindingsWorkspace(unavailable = false) {
	if (!elements.findings || !elements.findingDetail) return;
	renderFindingSeveritySummary();
	const findings = filteredFindings();
	elements.findings.innerHTML = "";
	if (!findings.length) {
		const empty = emptyStateElement(
			state.findings.length
				? {
					icon: "search",
					title: "No findings match these filters",
					hint: "Try clearing severity, review state, or search."
				}
				: unavailable
					? {
						icon: "findings",
						title: "No files were reviewed",
						hint: "Switch Review mode to Full baseline and start again."
					}
					: {
						icon: "findings",
						title: "No evidence-backed findings",
						hint: "Complete a run to inspect indexed languages and retained findings."
					}
		);
		elements.findings.appendChild(empty);
		renderFindingDetail(null);
		return;
	}
	if (!findings.some((finding) => finding.id === state.selectedFindingId)) {
		state.selectedFindingId = findings[0].id;
	}
	findings.forEach((finding) => {
		const card = document.createElement("article");
		card.className = `finding-card severity-${finding.severity}`;
		card.dataset.findingId = finding.id;
		card.tabIndex = 0;
		card.setAttribute("role", "button");
		card.setAttribute("aria-pressed", finding.id === state.selectedFindingId ? "true" : "false");
		card.classList.toggle("is-selected", finding.id === state.selectedFindingId);
		card.innerHTML = `
			<div class="finding-heading">
				<span class="severity"></span>
				<strong class="finding-title"></strong>
				<span class="finding-source"></span>
			</div>
			<p class="finding-location"></p>
			<p class="finding-message"></p>
			<div class="finding-card-meta">
				<span class="finding-confidence"></span>
				<span class="finding-rule"></span>
				<span class="finding-review-badge"></span>
			</div>
		`;
		card.querySelector(".severity").textContent = finding.severity;
		const title = card.querySelector(".finding-title");
		title.textContent = finding.title;
		if (finding.baselineStatus === "new" || finding.baselineStatus === "unchanged") {
			const badge = document.createElement("span");
			badge.className = `baseline-status is-${finding.baselineStatus}`;
			badge.textContent = finding.baselineStatus === "new" ? "New" : "Unchanged";
			title.appendChild(badge);
		}
		card.querySelector(".finding-source").textContent = finding.source;
		card.querySelector(".finding-location").textContent = `${finding.filePath}:${finding.startLine}`;
		card.querySelector(".finding-message").textContent = finding.message;
		card.querySelector(".finding-confidence").textContent = `${Math.round(Number(finding.confidence || 0) * 100)}% confidence`;
		card.querySelector(".finding-rule").textContent = finding.ruleId || finding.category || "";
		const reviewBadge = card.querySelector(".finding-review-badge");
		reviewBadge.textContent = finding.review?.state || "new";
		reviewBadge.dataset.state = finding.review?.state || "new";
		elements.findings.appendChild(card);
	});
	renderFindingDetail(findings.find((finding) => finding.id === state.selectedFindingId) || findings[0]);
}

function renderFindingDetail(finding) {
	if (!elements.findingDetail) return;
	elements.findingDetail.innerHTML = "";
	if (!finding) {
		elements.findingDetail.innerHTML = emptyStateHtml({
			icon: "detail",
			title: "Select a finding",
			hint: "Inspect its evidence, recommendation, and review decision here."
		});
		return;
	}
	const detail = document.createElement("div");
	detail.className = `finding-detail-content severity-${finding.severity}`;
	detail.innerHTML = `
		<div class="finding-detail-heading">
			<span class="severity"></span>
			<span class="finding-detail-id"></span>
		</div>
		<h3></h3>
		<div class="finding-confidence-track" aria-label="Finding confidence">
			<span></span><i></i>
		</div>
		<section>
			<h4>Impact</h4>
			<p class="finding-detail-message"></p>
		</section>
		<section>
			<h4>Evidence location</h4>
			<p class="finding-location"></p>
			<pre><code></code></pre>
		</section>
		<section class="finding-analysis-source">
			<h4>Analysis source</h4>
			<p></p>
		</section>
		<section>
			<h4>Recommendation</h4>
			<div class="finding-solution"></div>
		</section>
		<section class="finding-review-panel">
			<h4>Review decision</h4>
			<div class="finding-review-fields">
				<label>Status
					<select class="finding-review-select">
						<option value="new">New</option>
						<option value="acknowledged">Acknowledged</option>
						<option value="reviewed">Reviewed</option>
						<option value="dismissed">Dismissed</option>
						<option value="resolved">Resolved</option>
						<option value="reopened">Reopened</option>
					</select>
				</label>
				<label>Note
					<textarea class="finding-review-note" maxlength="2000" rows="3" placeholder="Optional decision context"></textarea>
				</label>
				<button type="button" class="secondary finding-review-save">Save decision</button>
				<p class="finding-review-status" role="status"></p>
			</div>
			<div class="finding-review-history"></div>
		</section>
	`;
	detail.querySelector(".severity").textContent = finding.severity;
	detail.querySelector(".finding-detail-id").textContent = finding.id ? `ID ${finding.id.slice(0, 8)}` : "";
	detail.querySelector("h3").textContent = finding.title || "Finding";
	const confidence = Math.round(Number(finding.confidence || 0) * 100);
	detail.querySelector(".finding-confidence-track span").textContent = `Confidence ${confidence}%`;
	detail.querySelector(".finding-confidence-track i").style.width = `${confidence}%`;
	detail.querySelector(".finding-detail-message").textContent = finding.message || "";
	detail.querySelector(".finding-location").textContent = `${finding.filePath || "—"}:${finding.startLine || 0}${finding.endLine && finding.endLine !== finding.startLine ? `–${finding.endLine}` : ""}`;
	detail.querySelector("code").textContent = finding.evidence || "No source excerpt retained.";
	detail.querySelector(".finding-analysis-source p").textContent =
		`${finding.source || "deterministic"} · ${finding.ruleId || finding.category || "review rule"}`;
	renderFindingSolution(detail.querySelector(".finding-solution"), finding);
	const review = finding.review || { state: "new", note: "", version: 0, history: [] };
	detail.querySelector(".finding-review-select").value = review.state || "new";
	detail.querySelector(".finding-review-note").value = review.note || "";
	renderFindingReviewHistory(detail.querySelector(".finding-review-history"), review.history || []);
	detail.querySelector(".finding-review-save").addEventListener("click", () => {
		saveFindingReview(finding, detail);
	});
	elements.findingDetail.appendChild(detail);
}

function renderFindingReviewHistory(container, history) {
	container.innerHTML = "";
	if (!history.length) return;
	const heading = document.createElement("h5");
	heading.textContent = "Decision history";
	container.appendChild(heading);
	const list = document.createElement("ol");
	history.slice(0, 10).forEach((entry) => {
		const item = document.createElement("li");
		const actor = entry.changedBy ? ` by ${entry.changedBy}` : "";
		item.textContent = `${entry.state}${actor} · ${formatDate(entry.createdAt)}${entry.note ? ` — ${entry.note}` : ""}`;
		list.appendChild(item);
	});
	container.appendChild(list);
}

async function saveFindingReview(finding, detail) {
	if (!state.activeRun?.id || !finding.fingerprint) return;
	const button = detail.querySelector(".finding-review-save");
	const status = detail.querySelector(".finding-review-status");
	button.disabled = true;
	status.textContent = "Saving…";
	try {
		const payload = await request(
			`/api/v1/runs/${encodeURIComponent(state.activeRun.id)}/findings/${encodeURIComponent(finding.fingerprint)}/review`,
			{
				method: "PUT",
				body: JSON.stringify({
					reviewState: detail.querySelector(".finding-review-select").value,
					note: detail.querySelector(".finding-review-note").value,
					expectedVersion: finding.review?.version || 0
				})
			}
		);
		finding.review = payload.data;
		status.textContent = "Decision saved.";
		renderFindingsWorkspace();
	} catch (error) {
		status.textContent = error.message || "Could not save the decision.";
	} finally {
		button.disabled = false;
	}
}

function architectureEscapeHtml(value) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function architectureEscapeAttr(value) {
	return architectureEscapeHtml(value).replace(/'/g, "&#39;");
}

function renderArchitectureDiagram(graph) {
	const flow = window.ArchitectureFlow;
	const shell = elements.architectureDiagramShell;
	const host = elements.architectureDiagram;
	if (!flow || !shell || !host) return;

	const subgraph = flow.pickArchitectureSubgraph(graph, state.architectureReviewScope, {
		maxNodes: 16,
		maxEdges: 18
	});
	if (!subgraph.nodes.length) {
		shell.hidden = true;
		host.innerHTML = "";
		if (elements.architectureClearSelection) elements.architectureClearSelection.hidden = true;
		return;
	}
	shell.hidden = false;
	const layout = flow.layoutFlowPositions(subgraph);
	const selected = state.architectureSelectedPath;
	const hot = new Set();
	if (selected) {
		hot.add(selected);
		layout.edges.forEach((e) => {
			if (e.from === selected || e.to === selected) {
				hot.add(e.from);
				hot.add(e.to);
			}
		});
	}

	const modeEl = document.getElementById("architecture-diagram-mode");
	if (modeEl) {
		modeEl.dataset.mode = subgraph.mode;
		modeEl.textContent = subgraph.mode === "impact" ? "Impact" : "Wiring";
	}
	const trunc = subgraph.truncated
		? `Showing ${subgraph.nodes.length} of ${subgraph.totalNodes} files · ${layout.edges.length} links`
		: `${subgraph.nodes.length} files · ${layout.edges.length} links`;
	if (elements.architectureDiagramMeta) {
		elements.architectureDiagramMeta.textContent = trunc
			+ (subgraph.mode === "impact"
				? " · changed files → what they touch"
				: " · how key files depend on each other");
	}
	if (elements.architectureClearSelection) {
		elements.architectureClearSelection.hidden = !selected;
	}

	const byId = Object.fromEntries(layout.nodes.map((n) => [n.id, n]));
	const edgeLines = layout.edges.map((e) => {
		const a = byId[e.from];
		const b = byId[e.to];
		if (!a || !b) return "";
		const x1 = a.x + a.w;
		const y1 = a.y + a.h / 2;
		const x2 = b.x;
		const y2 = b.y + b.h / 2;
		const dx = Math.max(36, (x2 - x1) * 0.45);
		const connected = !selected || (hot.has(e.from) && hot.has(e.to));
		const isHot = selected && (e.from === selected || e.to === selected);
		const cls = [
			"architecture-edge",
			connected ? "" : "is-dimmed",
			isHot ? "is-hot" : ""
		].filter(Boolean).join(" ");
		return `<path class="${cls}" d="M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}" />`;
	}).join("");

	const shortDir = flow.shortDir || flow.fileDir;
	const nodeHtml = layout.nodes.map((n) => {
		const dim = selected && !hot.has(n.id) ? " is-dimmed" : "";
		const sel = selected === n.id ? " is-selected" : "";
		const seed = n.role === "seed" ? " seed" : "";
		const titleText = flow.fileBasename(n.path);
		const subLabel = shortDir(n.path);
		return `<g class="architecture-node${seed}${sel}${dim}" data-path="${architectureEscapeAttr(n.path)}" transform="translate(${n.x},${n.y})">
			<title>${architectureEscapeAttr(n.path)}</title>
			<rect class="architecture-node-card" width="${n.w}" height="${n.h}" rx="10" ry="10"></rect>
			<rect class="architecture-node-rail" x="0" y="0" width="4" height="${n.h}" rx="2"></rect>
			<text class="architecture-node-title" x="14" y="23">${architectureEscapeHtml(titleText)}</text>
			<text class="architecture-node-sub" x="14" y="41">${architectureEscapeHtml(subLabel)}</text>
		</g>`;
	}).join("");

	host.innerHTML = `<svg viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<marker id="architecture-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
				<path d="M0,0 L7,3.5 L0,7 Z" fill="#5a738a"></path>
			</marker>
			<marker id="architecture-arrow-hot" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
				<path d="M0,0 L7,3.5 L0,7 Z" fill="#67e8b6"></path>
			</marker>
		</defs>
		${edgeLines}
		${nodeHtml}
	</svg>`;
}

function renderArchitectureExplorer(result = null) {
	if (result) state.architectureGraph = {
		graph: result.graph || {},
		snapshot: result.snapshot || {}
	};
	if (!elements.architectureResults) return;
	const graph = state.architectureGraph?.graph || {};
	const snapshot = state.architectureGraph?.snapshot || {};
	const summary = graph.summary || {};
	elements.architectureSnapshot.textContent = snapshot.id
		? `Snapshot ${snapshot.id.slice(0, 12)}`
		: "No snapshot";
	elements.architectureSnapshot.title = snapshot.id || "";
	elements.architectureSummary.innerHTML = "";
	[
		["Files", snapshot.fileCount || summary.filesAnalyzed || 0],
		["Symbols", summary.symbolCount || 0],
		["Dependencies", summary.dependencyCount || 0],
		["Impacts", summary.impactCount || 0]
	].forEach(([label, value]) => {
		const item = document.createElement("div");
		item.innerHTML = `<span></span><strong></strong>`;
		item.querySelector("span").textContent = label;
		item.querySelector("strong").textContent = value;
		elements.architectureSummary.appendChild(item);
	});
	renderArchitectureDiagram(graph);
	const query = state.architectureSearch.toLowerCase().trim();
	const kind = state.architectureKind;
	const facts = [];
	if (kind === "all" || kind === "symbols") {
		(graph.symbols || []).forEach((item) => facts.push({
			type: "symbol",
			title: `${item.kind || "symbol"} · ${item.name || "unnamed"}`,
			location: `${item.filePath || "—"}:${item.line || 0}`,
			detail: item.evidence || ""
		}));
	}
	if (kind === "all" || kind === "dependencies") {
		(graph.dependencies || []).forEach((item) => facts.push({
			type: "dependency",
			title: `${item.kind || "dependency"} · ${item.target || "unknown target"}`,
			location: `${item.sourceFile || "—"}:${item.line || 0}`,
			detail: item.targetFile ? `Resolves to ${item.targetFile}` : (item.evidence || "")
		}));
	}
	if (kind === "all" || kind === "impacts") {
		(graph.impacts || []).forEach((item) => facts.push({
			type: "impact",
			title: `${item.changedSymbol || item.changedFile || "Change"} → ${item.impactedFile || "unknown"}`,
			location: `Depth ${item.depth || 0}${item.viaFile ? ` via ${item.viaFile}` : ""}`,
			detail: item.reason || ""
		}));
	}
	let visible = facts.filter((fact) => !query ||
		[fact.type, fact.title, fact.location, fact.detail].some((value) =>
			String(value || "").toLowerCase().includes(query)
		)
	);
	if (state.architectureSelectedPath) {
		const needle = state.architectureSelectedPath.toLowerCase().replace(/\\/g, "/");
		visible = visible.filter((fact) =>
			[fact.title, fact.location, fact.detail].some((value) =>
				String(value || "").toLowerCase().replace(/\\/g, "/").includes(needle)
			)
		);
	}
	elements.architectureResults.innerHTML = "";
	if (!visible.length) {
		elements.architectureResults.innerHTML = emptyStateHtml({
			icon: query || kind !== "all" || state.architectureSelectedPath ? "search" : "architecture",
			title: query || kind !== "all" || state.architectureSelectedPath
				? "No architecture facts match"
				: "No architecture snapshot",
			hint: query || kind !== "all" || state.architectureSelectedPath
				? "Try another search, fact type, or clear the diagram selection."
				: "Open a completed review to explore symbols, dependencies, and impact paths."
		});
		return;
	}
	visible.slice(0, 250).forEach((fact) => {
		const card = document.createElement("article");
		card.className = "architecture-fact";
		card.innerHTML = `<span class="architecture-fact-type"></span><strong></strong><p></p><small></small>`;
		card.querySelector(".architecture-fact-type").textContent = fact.type;
		card.querySelector("strong").textContent = fact.title;
		card.querySelector("p").textContent = fact.detail;
		card.querySelector("small").textContent = fact.location;
		elements.architectureResults.appendChild(card);
	});
}

function playbookSteps(playbook) {
	if (!playbook) return [];
	const steps = playbook.steps;
	if (Array.isArray(steps)) return steps;
	if (steps && typeof steps === "object") {
		return Object.keys(steps)
			.sort((a, b) => Number(a) - Number(b))
			.map((key) => steps[key])
			.filter((step) => typeof step === "string" && step.length);
	}
	return [];
}

function renderFindingSolution(container, finding) {
	if (!container) return;
	container.innerHTML = "";
	const playbook = finding.playbook;
	const patch = finding.fixPatch;
	const steps = playbookSteps(playbook);
	const hasPlaybook = steps.length > 0;
	const hasPatch = patch && patch.after;

	if (hasPlaybook) {
		const how = document.createElement("div");
		how.className = "finding-playbook";
		const heading = document.createElement("h4");
		heading.textContent = "How to fix";
		how.appendChild(heading);
		const list = document.createElement("ol");
		steps.forEach((step) => {
			const item = document.createElement("li");
			item.textContent = step;
			list.appendChild(item);
		});
		how.appendChild(list);
		if (playbook.example) {
			const example = document.createElement("pre");
			example.className = "finding-playbook-example";
			const code = document.createElement("code");
			code.textContent = playbook.example;
			example.appendChild(code);
			how.appendChild(example);
		}
		container.appendChild(how);
	} else if (finding.suggestion) {
		const how = document.createElement("div");
		how.className = "finding-playbook";
		const heading = document.createElement("h4");
		heading.textContent = "How to fix";
		how.appendChild(heading);
		const body = document.createElement("p");
		body.className = "finding-suggestion-body";
		body.textContent = finding.suggestion;
		how.appendChild(body);
		container.appendChild(how);
	} else if (!hasPatch) {
		const how = document.createElement("div");
		how.className = "finding-playbook";
		const body = document.createElement("p");
		body.className = "finding-suggestion-body";
		body.textContent = "No suggested change.";
		how.appendChild(body);
		container.appendChild(how);
	}

	if (hasPatch) {
		const block = document.createElement("div");
		block.className = "finding-fix-patch";
		const heading = document.createElement("h4");
		heading.textContent = "Suggested change";
		block.appendChild(heading);

		const beforeLabel = document.createElement("p");
		beforeLabel.className = "patch-label";
		beforeLabel.textContent = "Before";
		block.appendChild(beforeLabel);
		const beforePre = document.createElement("pre");
		const beforeCode = document.createElement("code");
		beforeCode.textContent = patch.before || "";
		beforePre.appendChild(beforeCode);
		block.appendChild(beforePre);

		const afterLabel = document.createElement("p");
		afterLabel.className = "patch-label";
		afterLabel.textContent = "After";
		block.appendChild(afterLabel);
		const afterPre = document.createElement("pre");
		const afterCode = document.createElement("code");
		afterCode.textContent = patch.after || "";
		afterPre.appendChild(afterCode);
		block.appendChild(afterPre);

		const copyBtn = document.createElement("button");
		copyBtn.type = "button";
		copyBtn.className = "secondary finding-copy-patch";
		copyBtn.textContent = "Copy after";
		copyBtn.addEventListener("click", async () => {
			try {
				await navigator.clipboard.writeText(patch.after || "");
				copyBtn.textContent = "Copied";
				setTimeout(() => {
					copyBtn.textContent = "Copy after";
				}, 1500);
			} catch (error) {
				copyBtn.textContent = "Copy failed";
			}
		});
		block.appendChild(copyBtn);
		container.appendChild(block);
	}
}

function renderBaselineSummary(result = {}) {
	if (!elements.baselineSummary) return;
	elements.baselineSummary.innerHTML = "";
	const baseline = result.baseline;
	if (!baseline) {
		elements.baselineSummary.hidden = false;
		elements.baselineSummary.textContent = "No prior run to compare (same path and mode).";
		return;
	}
	const counts = baseline.counts || {};
	elements.baselineSummary.hidden = false;
	const when = baseline.createdAt ? new Date(baseline.createdAt).toLocaleString() : baseline.runId;
	elements.baselineSummary.innerHTML = `
		<span class="baseline-chip is-new"></span>
		<span class="baseline-chip is-unchanged"></span>
		<span class="baseline-chip is-fixed"></span>
		<span class="baseline-vs"></span>
	`;
	elements.baselineSummary.querySelector(".is-new").textContent = `${counts.new || 0} new`;
	elements.baselineSummary.querySelector(".is-unchanged").textContent = `${counts.unchanged || 0} unchanged`;
	elements.baselineSummary.querySelector(".is-fixed").textContent = `${counts.fixed || 0} fixed`;
	elements.baselineSummary.querySelector(".baseline-vs").textContent = `vs prior run · ${when}`;
}

function renderFixedFindings(result = {}) {
	if (!elements.fixedFindings || !elements.fixedFindingsList) return;
	const fixed = result.fixedFindings || [];
	elements.fixedFindingsList.innerHTML = "";
	if (!result.baseline || !fixed.length) {
		elements.fixedFindings.hidden = true;
		return;
	}
	elements.fixedFindings.hidden = false;
	elements.fixedFindings.open = false;
	fixed.forEach((item) => {
		const row = document.createElement("div");
		row.className = "fixed-finding-item";
		row.textContent = `${item.title || item.ruleId || "Finding"} · ${item.filePath || "—"}${item.severity ? ` · ${item.severity}` : ""}`;
		elements.fixedFindingsList.appendChild(row);
	});
}

async function loadResult(runId) {
	const kind = resolveRunKind(state.activeRun);
	const modernize = kind === "modernize";
	const codegraph = kind === "codegraph";
	if (modernize) {
		state.modernization.loading = true;
		state.modernization.error = "";
		renderModernizationResult({});
	}
	if (codegraph) {
		state.codegraph.loading = true;
		state.codegraph.error = "";
		renderCodeGraph({});
	}
	try {
		const payload = await request(`/api/v1/runs/${encodeURIComponent(runId)}/result`);
		if (state.activeRun?.id && state.activeRun.id !== runId) return null;
		if (modernize) {
			state.modernization.loading = false;
			state.modernization.error = "";
		}
		if (codegraph) {
			state.codegraph.loading = false;
			state.codegraph.error = "";
		}
		renderResult(payload.data.result);
		return payload.data.result;
	} catch (error) {
		if (modernize && (!state.activeRun?.id || state.activeRun.id === runId)) {
			state.modernization.loading = false;
			state.modernization.error = error.message || "The saved plan request failed.";
			renderModernizationResult({});
		} else if (codegraph && (!state.activeRun?.id || state.activeRun.id === runId)) {
			state.codegraph.loading = false;
			state.codegraph.error = error.message || "The saved graph request failed.";
			renderCodeGraph({});
		} else if (elements.summary) {
			elements.summary.textContent = error.message;
			elements.summary.dataset.tone = "danger";
		}
		return null;
	}
}

async function reloadRunActivity(run, { clear = true } = {}) {
	if (clear) {
		if (elements.feed) elements.feed.innerHTML = "";
		state.observations = [];
		state.lastTimelineKey = "";
		state.lastEventSequence = 0;
	}
	return loadEventHistory(run, { replace: clear });
}

async function catchUpEvents(run) {
	if (!run?.id) return state.lastEventSequence || 0;
	const after = state.lastEventSequence || 0;
	try {
		const payload = await request(
			`/api/v1/runs/${encodeURIComponent(run.id)}/event-log?after=${encodeURIComponent(after)}&limit=500`
		);
		const rows = payload.data || [];
		let added = 0;
		rows.forEach((item) => {
			if (!rememberEventSequence(item.sequence)) return;
			if (!item.eventType || !item.payload) return;
			try {
				appendEvent(item.eventType, item.payload);
				added++;
			} catch (error) {
				console.warn("Failed to render event", item.eventType, error);
			}
		});
		if (added) showObservabilityPanel();
		return state.lastEventSequence || 0;
	} catch (error) {
		console.warn("Event catch-up failed", error);
		return state.lastEventSequence || 0;
	}
}

function finishRun(run) {
	if (state.finishingRunId === run.id) {
		setRun(run);
		return;
	}
	state.finishingRunId = run.id;
	stopStatusPoll();
	state.closingStream = true;
	if (run.runKind === "modernize" && !state.modernization.result) {
		state.modernization.loading = true;
		state.modernization.error = "";
	}
	if (run.runKind === "codegraph" && !state.codegraph.result) {
		state.codegraph.loading = true;
		state.codegraph.error = "";
	}
	setRun(run);
	if (state.eventSource) {
		state.eventSource.close();
		state.eventSource = null;
	}
	const hasAgentTraces = state.observations.some((item) =>
		["generation", "tool", "span"].includes(item.observationType) ||
		["prompt", "llm", "response", "fallback", "agent"].includes(item.kind)
	);
	const catchUpPromise = hasAgentTraces
		? catchUpEvents(run).then(() => {
			showObservabilityPanel();
			return state.lastEventSequence || 0;
		})
		: reloadRunActivity(run, { clear: true });

	catchUpPromise
		.catch((error) => {
			console.warn("Could not reload run activity", error);
		})
		.finally(() => {
			loadResult(run.id).then(() => {
				const resultTarget = run.runKind === "modernize"
					? elements.modernizationResults
					: run.runKind === "codegraph"
						? elements.codegraphExplorer
						: document.querySelector("#results-panel");
				resultTarget?.scrollIntoView({
					behavior: "smooth",
					block: "start"
				});
			});
			loadRuns();
			setTimeout(() => {
				state.closingStream = false;
				if (state.finishingRunId === run.id) {
					state.finishingRunId = "";
				}
			}, 500);
		});
}

async function pollActiveRun() {
	if (!state.activeRun || state.terminal.has(state.activeRun.status)) {
		stopStatusPoll();
		return;
	}
	try {
		await catchUpEvents(state.activeRun);
		const payload = await request(`/api/v1/runs/${encodeURIComponent(state.activeRun.id)}`);
		const run = payload.data;
		setRun(run);
		if (state.terminal.has(run.status)) {
			const waiting = elements.feed.querySelector('[data-event-type="stream.waiting"]');
			if (waiting) waiting.remove();
			finishRun(run);
		}
	} catch (error) {
		if (elements.message) {
			elements.message.textContent = `Status check failed: ${error.message}`;
			elements.message.dataset.tone = "danger";
		}
	}
}

function watchRun(run) {
	stopStatusPoll();
	state.closingStream = true;
	state.finishingRunId = "";
	if (state.eventSource) {
		state.eventSource.close();
		state.eventSource = null;
	}
	state.closingStream = false;
	state.streamConnectedRunId = "";
	resetCommandMetrics();
	setRun(run);
	if (elements.feed) elements.feed.innerHTML = "";
	resetSpecialistBoard();
	if (elements.message) {
		elements.message.textContent = run.message || "Loading live activity…";
		elements.message.dataset.tone = "info";
	}
	// Prove life immediately — do not wait for event-log / SSE.
	state.observations = [];
	state.lastTimelineKey = "";
	state.seenEventSequences = new Set();
	state.lastEventSequence = 0;
	ensureRunAcceptedObservation(run);
	showObservabilityPanel();
	loadEventHistory(run, { replace: true }).then((lastSequence) => {
		if (state.activeRun?.id !== run.id) return;
		ensureRunAcceptedObservation(run);
		showObservabilityPanel();
		if (state.terminal.has(run.status)) {
			finishRun(run);
			return;
		}
		openEventStream(run, lastSequence);
	}).catch((error) => {
		appendEvent("stream.error", {
			timestamp: new Date().toISOString(),
			message: error.message || "Could not load run events"
		});
		ensureRunAcceptedObservation(run);
		showObservabilityPanel();
		if (!state.terminal.has(run.status)) {
			openEventStream(run, 0);
		} else {
			finishRun(run);
		}
	});
}

async function loadEventHistory(run, { replace = true } = {}) {
	const payload = await request(
		`/api/v1/runs/${encodeURIComponent(run.id)}/event-log?limit=500`
	);
	const rows = payload.data || [];
	if (replace) {
		if (elements.feed) elements.feed.innerHTML = "";
		state.observations = [];
		state.lastTimelineKey = "";
		state.seenEventSequences = new Set();
		state.lastEventSequence = 0;
	}
	rows.forEach((item) => {
		if (!rememberEventSequence(item.sequence)) return;
		if (!item.eventType || !item.payload) return;
		try {
			appendEvent(item.eventType, item.payload);
		} catch (error) {
			console.warn("Failed to render historical event", item.eventType, error);
		}
	});
	if (replace && !rows.length) {
		appendEvent("run.status", {
			timestamp: new Date().toISOString(),
			data: { run }
		});
	}
	ensureRunAcceptedObservation(run);
	showObservabilityPanel();
	return state.lastEventSequence || 0;
}

function openEventStream(run, afterSequence = 0) {
	if (state.eventSource) {
		state.closingStream = true;
		state.eventSource.close();
		state.eventSource = null;
		state.closingStream = false;
	}
	const source = new EventSource(
		`/api/v1/runs/${encodeURIComponent(run.id)}/events?after=${encodeURIComponent(afterSequence)}`
	);
	state.eventSource = source;
	const reconnected = state.streamConnectedRunId === run.id;
	ensureStreamObservation(run, reconnected);
	state.streamConnectedRunId = run.id;
	renderObserveIdentity();
	const eventTypes = [
		"run.status", "phase.started", "task.progress", "review.indexed",
		"review.graph", "review.plan", "review.specialist.progress",
		"review.specialist.observe", "review.specialists",
		"review.findings", "review.completed", "run.completed",
		"run.cancelled", "run.error", "modernization.schema",
		"modernization.inventory", "modernization.signals",
		"modernization.proposal.progress", "modernization.validation",
		"modernization.repair", "modernization.roadmap",
		"modernization.completed",
		"codegraph.index", "codegraph.metrics", "codegraph.clusters",
		"codegraph.narrative", "codegraph.completed"
	];
	eventTypes.forEach((type) => source.addEventListener(type, (event) => {
		try {
			if (state.activeRun?.id !== run.id) return;
			const rawPayload = String(event.data || "").trim();
			// BoxLang's SSE keep-alive can surface as event data on some
			// runtimes/proxies. It is a transport comment, not a JSON event.
			if (!rawPayload || rawPayload.startsWith(":")) return;
			const sequence = Number(event.lastEventId) || 0;
			if (sequence && !rememberEventSequence(sequence)) {
				return;
			}
			const payload = JSON.parse(rawPayload);
			const waiting = elements.feed.querySelector('[data-event-type="stream.waiting"]');
			if (waiting) {
				waiting.remove();
				ensureStreamObservation(run, true);
			}
			appendEvent(type, payload);
			if (payload?.data?.run) {
				setRun(payload.data.run);
				if (state.terminal.has(payload.data.run.status)) {
					finishRun(payload.data.run);
				}
			}
		} catch (error) {
			appendEvent("stream.error", {
				timestamp: new Date().toISOString(),
				message: error.message || "Bad event payload"
			});
		}
	}));
	source.onopen = () => {
		// SSE is healthy again; the 2s status poll is only a fallback.
		stopStatusPoll();
	};
	source.onerror = () => {
		if (state.closingStream) {
			return;
		}
		if (state.activeRun && state.terminal.has(state.activeRun.status)) {
			source.close();
			catchUpEvents(state.activeRun).finally(() => {
				if (state.activeRun) finishRun(state.activeRun);
			});
			return;
		}
		if (!elements.feed.querySelector('[data-event-type="stream.waiting"]')) {
			appendEvent("stream.waiting", {
				timestamp: new Date().toISOString(),
				message: "Reconnecting to live updates…"
			});
		}
		catchUpEvents(state.activeRun);
		pollActiveRun();
		if (!state.statusPoll) {
			state.statusPoll = setInterval(pollActiveRun, 2000);
		}
	};
}

async function loadRuns() {
	if (!elements.history || state.history.loading) return;
	state.history.loading = true;
	elements.history.innerHTML = `<tr><td colspan="8">${emptyStateHtml({
		icon: "history",
		title: "Loading run history…",
		hint: "Fetching recent runs from the local database."
	})}</td></tr>`;
	try {
		const params = historyQueryParams();
		const payload = await request(`/api/v1/history?${params.toString()}`);
		const rows = payload.data || [];
		const meta = payload.meta || {};
		state.history.rows = rows;
		state.history.totalPages = meta.totalPages || 0;
		elements.history.innerHTML = rows.length
			? ""
			: `<tr><td colspan="8">${emptyStateHtml({
				icon: hasHistoryFilters() ? "search" : "history",
				title: hasHistoryFilters() ? "No runs match these filters" : "No runs yet",
				hint: hasHistoryFilters()
					? "Clear filters or broaden the date range."
					: "Start a local Review, Modernize, or CodeGraph run above — completed runs appear here."
			})}</td></tr>`;
		renderHistoryTrends(meta.trends || {});
		renderHistoryPagination(meta);
		rows.forEach((item) => {
			const run = item.run || {};
			const metrics = item.metrics || {};
			const modernization = item.modernization || metrics.modernization || {};
			const runKind = resolveRunKind(run);
			const isModernize = runKind === "modernize";
			const isCodegraph = runKind === "codegraph";
			const row = document.createElement("tr");
			row.className = "history-row";
			if (state.activeRun?.id === run.id) {
				row.classList.add("is-active");
			}
			row.dataset.runId = run.id;
			row.innerHTML = `
				<td class="repo"></td>
				<td class="mode"></td>
				<td><span class="status-badge"></span></td>
				<td class="history-severity"><div class="history-severity-chips"></div></td>
				<td class="history-specialists"></td>
				<td class="history-execution"></td>
				<td class="created"></td>
				<td class="actions">
					<div class="history-actions">
						<button type="button" class="secondary-button history-compare">Compare</button>
						<button type="button" class="secondary-button history-rerun">Rerun</button>
						<button type="button" class="secondary-button history-trace">Trace</button>
						<button type="button" class="secondary-button history-open">Open</button>
					</div>
				</td>
			`;
			row.querySelector(".repo").textContent = run.projectPath;
			row.querySelector(".repo").title = run.projectPath || "";
			row.querySelector(".mode").textContent = `${workspaceDisplayName(runKind)} · ${scopeLabel(run.mode)}`;
			const badge = row.querySelector(".status-badge");
			badge.textContent = friendlyStatus(run.status);
			badge.classList.add(run.status);
			badge.title = run.message || run.status;
			if (isModernize) {
				const planState = modernization.planState || modernization.state || "needs-review";
				const validation = modernization.validationStatus || modernization.validation?.status || "pending";
				const severity = row.querySelector(".history-severity");
				severity.textContent = `Plan · ${planState}`;
				severity.title = `Modernize plan state: ${planState}`;
				const specialists = row.querySelector(".history-specialists");
				specialists.textContent = `Validation · ${validation}`;
				specialists.title = "Modernize validation summary";
				row.querySelector(".history-compare").hidden = true;
			} else if (isCodegraph) {
				const cg = item.codegraph || metrics.codegraph || {};
				const severity = row.querySelector(".history-severity");
				const nodes = cg.nodeCount ?? cg.totals?.nodes ?? "—";
				const clusters = cg.clusterCount ?? cg.totals?.clusters ?? "—";
				severity.textContent = `Graph · ${nodes} nodes`;
				severity.title = "CodeGraph snapshot totals";
				const specialists = row.querySelector(".history-specialists");
				specialists.textContent = `Clusters · ${clusters}`;
				specialists.title = "CodeGraph cluster count";
				row.querySelector(".history-compare").hidden = true;
			} else {
				renderHistorySeverity(row.querySelector(".history-severity"), metrics.findings || {});
				renderHistorySpecialists(row.querySelector(".history-specialists"), metrics.specialists || {});
			}
			renderHistoryExecution(row.querySelector(".history-execution"), metrics);
			row.querySelector(".created").textContent = new Date(run.createdAt).toLocaleString();
			// This history table only renders on the dashboard, which has no
			// live-run or result panels of its own — navigate to the workspace
			// page that does, instead of calling watchRun() into thin air.
			const open = () => {
				window.location.href = `/${runKind}?run=${encodeURIComponent(run.id)}`;
			};
			row.addEventListener("click", open);
			row.querySelector(".history-open").addEventListener("click", (event) => {
				event.stopPropagation();
				open();
			});
			row.querySelector(".history-compare").addEventListener("click", (event) => {
				event.stopPropagation();
				loadHistoryComparison(run);
			});
			row.querySelector(".history-rerun").addEventListener("click", async (event) => {
				event.stopPropagation();
				const button = event.currentTarget;
				button.disabled = true;
				button.textContent = "Starting…";
				try {
					const payload = await request(
						`/api/v1/runs/${encodeURIComponent(run.id)}/rerun`,
						{ method: "POST", body: "{}" }
					);
					watchRun(payload.data);
					loadRuns();
				} catch (error) {
					button.disabled = false;
					button.textContent = "Rerun";
					window.alert(error.message || "Could not start the rerun.");
				}
			});
			row.querySelector(".history-trace").addEventListener("click", (event) => {
				event.stopPropagation();
				window.location.href = `/${runKind}?run=${encodeURIComponent(run.id)}&focus=trace`;
			});
			elements.history.appendChild(row);
		});
	} catch (error) {
		elements.history.innerHTML = `<tr><td colspan="8">${emptyStateHtml({
			icon: "inbox",
			title: "Could not load history",
			hint: error.message || "Try refreshing the history table."
		})}</td></tr>`;
	} finally {
		state.history.loading = false;
	}
}

// Resumes a specific run when the page is loaded as /review?run=<id>,
// /modernize?run=<id>, or /codegraph?run=<id> (e.g. via the dashboard history
// table's Open/Trace buttons). Fetches the run directly so it works even on
// pages that don't render a history table of their own.
async function resumeRunFromQuery() {
	if (state.activeRun || state.didAutoResume) return;
	const params = new URLSearchParams(window.location.search);
	const resumeId = params.get("run");
	if (!resumeId) return;
	state.didAutoResume = true;
	try {
		const payload = await request(`/api/v1/runs/${encodeURIComponent(resumeId)}`);
		watchRun(payload.data);
		if (params.get("focus") === "trace") {
			window.setTimeout(() => {
				elements.observePanel?.scrollIntoView({ behavior: "smooth", block: "start" });
			}, 250);
		}
	} catch (error) {
		if (elements.formMessage) {
			elements.formMessage.textContent = error.message || "Could not open the requested run.";
			elements.formMessage.dataset.tone = "danger";
		}
	}
}

function historyQueryParams() {
	const params = new URLSearchParams();
	const values = elements.historyFilters
		? Object.fromEntries(new FormData(elements.historyFilters))
		: {};
	Object.entries(values).forEach(([key, value]) => {
		const normalized = String(value || "").trim();
		if (!normalized) return;
		if (key === "from") {
			params.set(key, `${normalized}T00:00:00Z`);
		} else if (key === "to") {
			params.set(key, `${normalized}T23:59:59Z`);
		} else {
			params.set(key, normalized);
		}
	});
	params.set("page", String(state.history.page));
	params.set("limit", "5");
	return params;
}

function hasHistoryFilters() {
	if (!elements.historyFilters) return false;
	return [...new FormData(elements.historyFilters).values()]
		.some((value) => String(value || "").trim());
}

function renderHistoryTrends(trends = {}) {
	if (!elements.historyTrends) return;
	const values = [
		trends.runCount ?? 0,
		trends.totalFindings ?? 0,
		(trends.high || 0) + (trends.critical || 0),
		trends.medianDurationMs == null ? "Unavailable" : formatDuration(trends.medianDurationMs),
		formatCompactNumber(trends.totalTokens || 0),
		`${trends.retries || 0} / ${trends.failures || 0}`
	];
	[...elements.historyTrends.querySelectorAll("strong")].forEach((node, index) => {
		node.textContent = values[index];
	});
}

function renderHistoryPagination(meta = {}) {
	if (!elements.historyPagination) return;
	const totalPages = meta.totalPages || 0;
	elements.historyPagination.hidden = totalPages <= 1;
	elements.historyPageLabel.textContent = `Page ${meta.page || 1} of ${Math.max(1, totalPages)} · ${meta.total || 0} runs`;
	elements.historyPrevious.disabled = (meta.page || 1) <= 1;
	elements.historyNext.disabled = !totalPages || (meta.page || 1) >= totalPages;
}

function renderHistorySeverity(target, findings = {}) {
	const severities = ["critical", "high", "medium", "low"];
	const chips = target.querySelector(".history-severity-chips") || target;
	chips.innerHTML = "";
	severities.forEach((severity) => {
		const count = Number(findings[severity] || 0);
		if (!count) return;
		const chip = document.createElement("span");
		chip.className = `severity-chip ${severity}`;
		chip.textContent = `${count} ${severity[0].toUpperCase()}`;
		chip.title = `${count} ${severity} findings`;
		chips.appendChild(chip);
	});
	if (!chips.childElementCount) {
		chips.innerHTML = `<span class="history-severity-empty">${findings.total == null ? "Unavailable" : "No findings"}</span>`;
	}
}

function renderHistorySpecialists(target, specialists = {}) {
	if (!specialists.total) {
		target.textContent = "Deterministic";
		return;
	}
	target.textContent = `${specialists.completed || 0}/${specialists.total} complete`;
	target.title = `${(specialists.selected || []).join(", ") || "Specialists"}${specialists.failed ? ` · ${specialists.failed} failed` : ""}`;
	if (specialists.failed) target.dataset.tone = "danger";
}

function renderHistoryExecution(target, metrics = {}) {
	const ai = metrics.ai || {};
	const model = ai.models?.[0] || ai.providers?.[0] || (ai.available ? "AI recorded" : "No AI telemetry");
	const duration = metrics.durationAvailable ? formatDuration(metrics.durationMs) : "duration unavailable";
	const tokens = ai.totalTokens ? `${formatCompactNumber(ai.totalTokens)} tokens` : "tokens unavailable";
	target.textContent = `${duration} · ${model}`;
	target.title = `${tokens} · ${ai.retries || 0} retries · ${ai.failures || 0} failures`;
}

function formatDuration(value) {
	const milliseconds = Number(value || 0);
	if (milliseconds < 1000) return `${milliseconds} ms`;
	const seconds = Math.round(milliseconds / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	return `${minutes}m ${seconds % 60}s`;
}

function formatCompactNumber(value) {
	return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 })
		.format(Number(value || 0));
}

async function loadHistoryComparison(run) {
	if (!elements.historyComparison) return;
	elements.historyComparison.hidden = false;
	elements.historyComparisonTitle.textContent = `Comparing ${run.projectPath || run.id}`;
	elements.comparisonCounts.innerHTML = emptyStateHtml({
		icon: "history",
		title: "Loading compatible baseline…",
		hint: "Comparing this run with the prior matching review."
	});
	elements.comparisonMovements.innerHTML = "";
	elements.historyComparison.scrollIntoView({ behavior: "smooth", block: "nearest" });
	try {
		const payload = await request(`/api/v1/history/${encodeURIComponent(run.id)}/comparison`);
		renderHistoryComparison(run, payload.data || {});
	} catch (error) {
		elements.comparisonCounts.innerHTML = emptyStateHtml({
			icon: "inbox",
			title: "Could not load comparison",
			hint: error.message || "Try again from History."
		});
	}
}

function renderHistoryComparison(run, comparison = {}) {
	elements.comparisonCounts.innerHTML = "";
	if (!comparison.baseline) {
		elements.comparisonCounts.innerHTML = emptyStateHtml({
			icon: "history",
			title: "No prior compatible run",
			hint: comparison.runKind === "modernize"
				? "Need another completed Modernize run for the same repository."
				: "Need another completed run with the same repository and mode."
		});
		elements.comparisonMovements.innerHTML = "";
		return;
	}
	if (comparison.runKind === "modernize") {
		renderModernizeComparison(comparison);
		return;
	}
	const counts = comparison.counts || {};
	const labels = [
		["new", "New"],
		["unchanged", "Unchanged"],
		["resolved", "Resolved"],
		["reopened", "Reopened"],
		["severityRaised", "Severity raised"],
		["severityLowered", "Severity lowered"]
	];
	labels.forEach(([key, label]) => {
		const chip = document.createElement("span");
		chip.className = `comparison-chip is-${key}`;
		chip.textContent = `${counts[key] || 0} ${label}`;
		elements.comparisonCounts.appendChild(chip);
	});
	const baselineWhen = new Date(comparison.baseline.createdAt).toLocaleString();
	const note = document.createElement("span");
	note.className = "comparison-baseline-note";
	note.textContent = `vs ${baselineWhen}`;
	elements.comparisonCounts.appendChild(note);
	const delta = comparison.execution?.delta || {};
	const executionNote = document.createElement("div");
	executionNote.className = "comparison-execution-delta";
	executionNote.textContent = [
		`Duration ${formatSignedDuration(delta.durationMs)}`,
		`Tokens ${formatSignedNumber(delta.totalTokens)}`,
		`Retries ${formatSignedNumber(delta.retries)}`,
		`Failures ${formatSignedNumber(delta.failures)}`,
		`Specialist coverage ${formatSignedPercent(delta.specialistCoverage)}`
	].join(" · ");
	elements.comparisonCounts.appendChild(executionNote);

	elements.comparisonMovements.innerHTML = "";
	(comparison.movements || []).forEach((movement) => {
		const button = document.createElement("button");
		button.type = "button";
		button.className = "comparison-movement";
		button.innerHTML = `
			<span class="movement-type"></span>
			<strong class="movement-title"></strong>
			<small class="movement-location"></small>
			<span class="movement-severity"></span>
		`;
		button.querySelector(".movement-type").textContent = movement.type;
		button.querySelector(".movement-title").textContent = movement.title || movement.fingerprint;
		button.querySelector(".movement-location").textContent = `${movement.filePath || "Unknown file"}${movement.startLine ? `:${movement.startLine}` : ""}`;
		button.querySelector(".movement-severity").textContent = movement.previousSeverity
			? `${movement.previousSeverity} → ${movement.severity}`
			: movement.severity || "";
		button.addEventListener("click", async () => {
			let evidenceRun = run;
			if (movement.type === "resolved" && comparison.baseline?.runId) {
				try {
					const payload = await request(
						`/api/v1/runs/${encodeURIComponent(comparison.baseline.runId)}`
					);
					evidenceRun = payload.data || run;
				} catch (error) {
					const message = document.createElement("p");
					message.className = "empty-state";
					message.textContent = error.message;
					elements.comparisonMovements.prepend(message);
					return;
				}
			}
			state.pendingFindingFingerprint = movement.fingerprint || "";
			watchRun(evidenceRun);
			window.setTimeout(() => {
				document.querySelector("#evidence-panel")?.scrollIntoView({ behavior: "smooth" });
			}, 250);
		});
		elements.comparisonMovements.appendChild(button);
	});
	if (!elements.comparisonMovements.childElementCount) {
		elements.comparisonMovements.innerHTML = emptyStateHtml({
			icon: "findings",
			title: "No finding movement recorded",
			hint: "This baseline comparison has no new, resolved, or severity changes."
		});
	}
}

function renderModernizeComparison(comparison) {
	const diff = comparison.diff || {};
	const legacy = diff.legacyUnits || {};
	const target = diff.targetUnits || {};
	const decisions = diff.decisions || {};
	const coverage = diff.coverage || {};

	const chipDefs = [
		["legacy-added", `${legacy.summary?.addedCount || 0} legacy added`],
		["legacy-removed", `${legacy.summary?.removedCount || 0} legacy removed`],
		["target-added", `${target.summary?.addedCount || 0} target added`],
		["target-removed", `${target.summary?.removedCount || 0} target removed`],
		["decisions-carried", `${decisions.summary?.unchangedCount || 0} decisions carried forward`],
		["decisions-new", `${decisions.summary?.addedCount || 0} new decisions`]
	];
	chipDefs.forEach(([key, label]) => {
		const chip = document.createElement("span");
		chip.className = `comparison-chip is-${key}`;
		chip.textContent = label;
		elements.comparisonCounts.appendChild(chip);
	});
	const baselineWhen = new Date(comparison.baseline.createdAt).toLocaleString();
	const note = document.createElement("span");
	note.className = "comparison-baseline-note";
	note.textContent = `vs ${baselineWhen}`;
	elements.comparisonCounts.appendChild(note);

	const coverageNote = document.createElement("div");
	coverageNote.className = "comparison-execution-delta";
	coverageNote.textContent = [
		`On road ${formatSignedNumber(coverage.delta?.onRoadDelta)}`,
		`Not yet sliced ${formatSignedNumber(coverage.delta?.notYetSlicedDelta)}`,
		`Provider coverage ${coverage.baseline?.llmStatus || "unknown"} → ${coverage.current?.llmStatus || "unknown"}`
	].join(" · ");
	elements.comparisonCounts.appendChild(coverageNote);

	elements.comparisonMovements.innerHTML = "";
	const rows = [
		...(legacy.added || []).map((item) => ({ type: "legacy-added", ...item })),
		...(legacy.removed || []).map((item) => ({ type: "legacy-removed", ...item })),
		...(target.added || []).map((item) => ({ type: "target-added", ...item })),
		...(target.removed || []).map((item) => ({ type: "target-removed", ...item }))
	];
	rows.forEach((item) => {
		const row = document.createElement("div");
		row.className = "comparison-movement";
		row.innerHTML = `
			<span class="movement-type"></span>
			<strong class="movement-title"></strong>
			<small class="movement-location"></small>
		`;
		row.querySelector(".movement-type").textContent = item.type;
		row.querySelector(".movement-title").textContent = item.symbolName || item.filePath || item.id;
		row.querySelector(".movement-location").textContent = `${item.filePath || ""}${item.unitType ? ` · ${item.unitType}` : ""}`;
		elements.comparisonMovements.appendChild(row);
	});
	if (!elements.comparisonMovements.childElementCount) {
		elements.comparisonMovements.innerHTML = emptyStateHtml({
			icon: "findings",
			title: "No unit changes",
			hint: "Legacy and target units are identical to the prior run."
		});
	}
}

function formatSignedNumber(value) {
	const number = Number(value || 0);
	return `${number > 0 ? "+" : ""}${formatCompactNumber(number)}`;
}

function formatSignedDuration(value) {
	const number = Number(value || 0);
	return `${number > 0 ? "+" : number < 0 ? "−" : ""}${formatDuration(Math.abs(number))}`;
}

function formatSignedPercent(value) {
	const number = Math.round(Number(value || 0) * 100);
	return `${number > 0 ? "+" : ""}${number}%`;
}

async function loadHealth() {
	try {
		const payload = await request("/api/v1/health");
		elements.healthDot.className = "status-dot ok";
		elements.healthLabel.textContent = `${payload.data.status} · SQLite`;
	} catch (error) {
		elements.healthDot.className = "status-dot error";
		elements.healthLabel.textContent = "System unavailable";
	}
}

const localPreferencesKey = "doubleCheck.preferences.v1";

// defaultPreset/defaultMode live server-side (AppSettingsService) so they apply the
// same way regardless of which device opens the Review page; rememberProject/projectPath
// stay device-local since a remembered filesystem path is meaningless on another machine.
function readLocalPreferences() {
	try {
		return { rememberProject: false, projectPath: "", ...JSON.parse(localStorage.getItem(localPreferencesKey) || "{}") };
	} catch {
		return { rememberProject: false, projectPath: "" };
	}
}

function writeLocalPreferences(prefs) {
	localStorage.setItem(localPreferencesKey, JSON.stringify({
		rememberProject: !!prefs.rememberProject,
		projectPath: prefs.rememberProject ? (prefs.projectPath || "").trim() : ""
	}));
}

async function applyStartupPreferences() {
	const local = readLocalPreferences();
	let defaultPreset = "balanced";
	let defaultMode = "full";
	try {
		const payload = await request("/api/v1/app-settings");
		defaultPreset = payload.data?.defaultPreset || defaultPreset;
		defaultMode = payload.data?.defaultMode || defaultMode;
	} catch {
		// Settings endpoint unreachable (e.g. very first boot) - built-in defaults still apply.
	}
	const presetInput = elements.form?.querySelector(`[name="reviewPreset"][value="${defaultPreset}"]`);
	if (presetInput) {
		presetInput.checked = true;
		applyReviewPreset(defaultPreset);
	}
	if (elements.mode && defaultMode) {
		elements.mode.value = defaultMode;
	}
	if (local.rememberProject && local.projectPath && elements.projectPath) {
		elements.projectPath.value = local.projectPath;
	}
	updateRevisionFields();
	updateNewReviewSummary();
	loadProjectTree();
	if (elements.preferencesForm) {
		elements.preferencesForm.elements.defaultPreset.value = defaultPreset;
		elements.preferencesForm.elements.defaultMode.value = defaultMode;
		elements.preferencesForm.elements.rememberProject.checked = !!local.rememberProject;
	}
}

// Captures the current project path as "remembered" the moment it changes on the Review
// page, since the Dashboard's preferences form has no project-path field of its own to read.
elements.projectPath?.addEventListener("change", () => {
	const local = readLocalPreferences();
	if (local.rememberProject) {
		writeLocalPreferences({ rememberProject: true, projectPath: elements.projectPath.value || "" });
	}
});

elements.preferencesForm?.addEventListener("submit", async (event) => {
	event.preventDefault();
	const formData = new FormData(elements.preferencesForm);
	const rememberProject = formData.get("rememberProject") === "on";
	const existing = readLocalPreferences();
	writeLocalPreferences({ rememberProject, projectPath: rememberProject ? existing.projectPath : "" });
	try {
		await request("/api/v1/app-settings", {
			method: "PUT",
			body: JSON.stringify({
				defaultPreset: formData.get("defaultPreset") || "balanced",
				defaultMode: formData.get("defaultMode") || "full"
			})
		});
		elements.preferencesStatus.textContent = "Preferences saved.";
	} catch (error) {
		elements.preferencesStatus.textContent = error.message || "Could not save preferences.";
	}
});

elements.preferencesReset?.addEventListener("click", async () => {
	localStorage.removeItem(localPreferencesKey);
	try {
		await request("/api/v1/app-settings", {
			method: "PUT",
			body: JSON.stringify({ defaultPreset: "balanced", defaultMode: "full" })
		});
	} catch {
		// Local reset still applies even if the server write fails.
	}
	elements.preferencesStatus.textContent = "Preferences reset.";
	await applyStartupPreferences();
});

const providerTypeLabels = {
	openai: "OpenAI",
	"openai-compatible": "OpenAI-compatible",
	openrouter: "OpenRouter",
	ollama: "Ollama (local)",
	docker: "Docker Model Runner (local)",
	lmstudio: "LM Studio (local)",
	llamacpp: "llama.cpp (local)"
};

function resetProviderForm() {
	if (!elements.providerForm) return;
	elements.providerForm.reset();
	elements.providerForm.elements.id.value = "";
	elements.providerForm.elements.apiKey.placeholder = "Provider API key";
	if (elements.providerSaveButton) elements.providerSaveButton.textContent = "Add provider";
	if (elements.providerCancelEdit) elements.providerCancelEdit.hidden = true;
}

function fillProviderForm(profile) {
	if (!elements.providerForm) return;
	const form = elements.providerForm;
	form.elements.id.value = profile.id;
	form.elements.name.value = profile.name || "";
	form.elements.provider.value = profile.provider || "openrouter";
	form.elements.baseUrl.value = profile.baseUrl || "";
	form.elements.model.value = profile.model || "";
	form.elements.apiKey.value = "";
	form.elements.apiKey.placeholder = profile.hasApiKey ? `Leave blank to keep ${profile.apiKey || "saved key"}` : "Provider API key";
	form.elements.timeoutSeconds.value = profile.timeoutSeconds || 120;
	form.elements.contextWindow.value = profile.contextWindow || 128000;
	form.elements.inputUsdPerMillion.value = profile.inputUsdPerMillion || 0;
	form.elements.outputUsdPerMillion.value = profile.outputUsdPerMillion || 0;
	if (elements.providerSaveButton) elements.providerSaveButton.textContent = "Save changes";
	if (elements.providerCancelEdit) elements.providerCancelEdit.hidden = false;
	form.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function loadProviders() {
	if (!elements.providerTableBody) return;
	elements.providerTableBody.innerHTML = `<tr><td colspan="6">${emptyStateHtml({
		icon: "history",
		title: "Loading providers…"
	})}</td></tr>`;
	try {
		const payload = await request("/api/v1/ai-providers");
		const profiles = payload.data || [];
		if (!profiles.length) {
			elements.providerTableBody.innerHTML = `<tr><td colspan="6">${emptyStateHtml({
				icon: "inbox",
				title: "No saved providers",
				hint: "Add a provider below, or leave empty to keep using the environment-configured connection."
			})}</td></tr>`;
			return;
		}
		elements.providerTableBody.innerHTML = "";
		profiles.forEach((profile) => {
			const row = document.createElement("tr");
			row.dataset.providerId = profile.id;
			row.innerHTML = `
				<td class="name"></td>
				<td class="type"></td>
				<td class="model"></td>
				<td class="provider-key"></td>
				<td></td>
				<td>
					<div class="provider-actions">
						<button type="button" class="secondary-button" data-provider-action="activate">Activate</button>
						<button type="button" class="secondary-button" data-provider-action="test">Test</button>
						<button type="button" class="secondary-button" data-provider-action="edit">Edit</button>
						<button type="button" class="danger-button" data-provider-action="delete">Delete</button>
					</div>
				</td>
			`;
			row.querySelector(".name").textContent = profile.name;
			row.querySelector(".type").textContent = providerTypeLabels[profile.provider] || profile.provider;
			row.querySelector(".model").textContent = profile.model;
			row.querySelector(".provider-key").textContent = profile.hasApiKey ? profile.apiKey : "—";
			const statusCell = row.children[4];
			const badge = document.createElement("span");
			badge.className = `status-badge ${profile.isActive ? "succeeded" : ""}`;
			badge.textContent = profile.isActive ? "Active" : "Inactive";
			statusCell.appendChild(badge);
			const activateButton = row.querySelector('[data-provider-action="activate"]');
			if (profile.isActive && activateButton) {
				activateButton.disabled = true;
				activateButton.textContent = "Active";
			}
			elements.providerTableBody.appendChild(row);
		});
	} catch (error) {
		elements.providerTableBody.innerHTML = `<tr><td colspan="6">${emptyStateHtml({
			icon: "alert",
			title: "Could not load providers",
			hint: error.message || "Check the local server and try again."
		})}</td></tr>`;
	}
}

elements.providerForm?.addEventListener("submit", async (event) => {
	event.preventDefault();
	const formData = new FormData(elements.providerForm);
	const id = formData.get("id");
	const body = {
		name: formData.get("name") || "",
		provider: formData.get("provider") || "",
		baseUrl: formData.get("baseUrl") || "",
		model: formData.get("model") || "",
		timeoutSeconds: Number(formData.get("timeoutSeconds") || 120),
		contextWindow: Number(formData.get("contextWindow") || 128000),
		inputUsdPerMillion: Number(formData.get("inputUsdPerMillion") || 0),
		outputUsdPerMillion: Number(formData.get("outputUsdPerMillion") || 0)
	};
	const apiKey = (formData.get("apiKey") || "").trim();
	if (apiKey || !id) body.apiKey = apiKey;
	elements.providerFormStatus.textContent = "Saving…";
	try {
		await request(id ? `/api/v1/ai-providers/${id}` : "/api/v1/ai-providers", {
			method: id ? "PUT" : "POST",
			body: JSON.stringify(body)
		});
		elements.providerFormStatus.textContent = "Provider saved.";
		resetProviderForm();
		await loadProviders();
	} catch (error) {
		elements.providerFormStatus.textContent = error.message || "Could not save provider.";
	}
});

elements.providerCancelEdit?.addEventListener("click", () => {
	resetProviderForm();
	elements.providerFormStatus.textContent = "";
});

elements.providerTableBody?.addEventListener("click", async (event) => {
	const button = event.target.closest("[data-provider-action]");
	if (!button) return;
	const row = button.closest("tr");
	const id = row?.dataset.providerId;
	if (!id) return;
	const action = button.dataset.providerAction;
	if (action === "edit") {
		try {
			const payload = await request(`/api/v1/ai-providers/${id}`);
			fillProviderForm(payload.data || {});
			elements.providerFormStatus.textContent = "";
		} catch (error) {
			elements.providerFormStatus.textContent = error.message || "Could not load provider.";
		}
		return;
	}
	if (action === "delete") {
		if (!window.confirm("Delete this provider profile?")) return;
		try {
			await request(`/api/v1/ai-providers/${id}`, { method: "DELETE" });
			await loadProviders();
		} catch (error) {
			elements.providerFormStatus.textContent = error.message || "Could not delete provider.";
		}
		return;
	}
	if (action === "activate") {
		try {
			await request(`/api/v1/ai-providers/${id}/activate`, { method: "POST" });
			await loadProviders();
		} catch (error) {
			elements.providerFormStatus.textContent = error.message || "Could not activate provider.";
		}
		return;
	}
	if (action === "test") {
		const originalText = button.textContent;
		button.disabled = true;
		button.textContent = "Testing…";
		try {
			const payload = await request(`/api/v1/ai-providers/${id}/smoke`, { method: "POST" });
			elements.providerFormStatus.textContent = payload.data?.ok
				? "Connection succeeded."
				: (payload.data?.message || "Connection test did not confirm success.");
		} catch (error) {
			elements.providerFormStatus.textContent = error.message || "Connection test failed.";
		} finally {
			button.disabled = false;
			button.textContent = originalText;
		}
	}
});

async function loadRunDefaults() {
	if (!elements.runDefaultsForm) return;
	try {
		const payload = await request("/api/v1/app-settings");
		const settings = payload.data || {};
		const form = elements.runDefaultsForm;
		[
			"planMaxTasks", "runDefaultTokenBudget", "runMaxTokenBudget",
			"runDefaultTokensPerTask", "runMaxTokensPerTask", "runDefaultDurationMs", "runMaxDurationMs",
			"runDefaultIterationsPerTask", "runMaxIterationsPerTask", "runDefaultToolOutputCharacters",
			"runMaxToolOutputCharacters", "runDefaultCostUsd", "runMaxCostUsd", "observabilityPreviewCharacters"
		].forEach((key) => {
			if (form.elements[key] && settings[key] !== undefined) form.elements[key].value = settings[key];
		});
		if (form.elements.observabilityEnabled) form.elements.observabilityEnabled.checked = !!settings.observabilityEnabled;
	} catch (error) {
		elements.runDefaultsStatus.textContent = error.message || "Could not load run defaults.";
	}
}

elements.runDefaultsForm?.addEventListener("submit", async (event) => {
	event.preventDefault();
	const formData = new FormData(elements.runDefaultsForm);
	const body = {};
	[
		"planMaxTasks", "runDefaultTokenBudget", "runMaxTokenBudget",
		"runDefaultTokensPerTask", "runMaxTokensPerTask", "runDefaultDurationMs", "runMaxDurationMs",
		"runDefaultIterationsPerTask", "runMaxIterationsPerTask", "runDefaultToolOutputCharacters",
		"runMaxToolOutputCharacters", "runDefaultCostUsd", "runMaxCostUsd", "observabilityPreviewCharacters"
	].forEach((key) => { body[key] = Number(formData.get(key)); });
	body.observabilityEnabled = formData.get("observabilityEnabled") === "on";
	elements.runDefaultsStatus.textContent = "Saving…";
	try {
		await request("/api/v1/app-settings", { method: "PUT", body: JSON.stringify(body) });
		elements.runDefaultsStatus.textContent = "Run defaults saved.";
	} catch (error) {
		elements.runDefaultsStatus.textContent = error.message || "Could not save run defaults.";
	}
});

function setModernizationWorkspace(kind) {
	const modernize = kind === "modernize";
	state.workspace = modernize ? "modernize" : "review";
	if (elements.commandWorkspaceLabel) elements.commandWorkspaceLabel.textContent = `${modernize ? "Modernize" : "Review"} command center`;
	if (elements.commandWorkspacePurpose) elements.commandWorkspacePurpose.textContent = modernize
		? "Watch repository evidence, proposal roles, validation gates, and plan milestones for the active run."
		: "Watch pipeline stages, crew progress, and live milestones for the active run.";
	if (elements.modernizationFields) elements.modernizationFields.hidden = !modernize;
	updateBudgetCeilingsForWorkspace(modernize);
	if (elements.modernizationResults) elements.modernizationResults.hidden = !modernize;
	if (elements.workspaceHint) elements.workspaceHint.textContent = modernize
		? "Modernize builds a reviewable migration plan from CFML evidence; it never writes source files."
		: "Review produces evidence-backed findings and optional specialist analysis.";
	const modeLabel = document.querySelector("#run-mode-label");
	if (modeLabel) modeLabel.textContent = modernize ? "Modernize scope" : "Review mode";
	if (elements.startRunButton) elements.startRunButton.textContent = modernize ? "Start modernization plan" : "Start code review";
	if (elements.reviewGoalLabel) elements.reviewGoalLabel.firstChild.textContent = modernize ? "Modernization goal " : "Review goal ";
	if (elements.jumpFindings) elements.jumpFindings.textContent = modernize ? "View plan" : "View findings";
	if (elements.commandExport) elements.commandExport.textContent = modernize ? "Export plan" : "Export report";
	if (elements.cancel) elements.cancel.textContent = modernize ? "Cancel plan" : "Cancel review";
	if (!state.activeRun && elements.title) elements.title.textContent = modernize ? "No active modernization" : "No active review";
	if (elements.modernizationExportActions) elements.modernizationExportActions.hidden = !modernize || !state.terminal.has(state.activeRun?.status || "");
	if (elements.exportActions) elements.exportActions.hidden = modernize || !state.activeRun || !state.terminal.has(state.activeRun.status);
	if (elements.resultsPanel) elements.resultsPanel.hidden = modernize;
	if (elements.architectureExplorer) elements.architectureExplorer.hidden = modernize;
	if (modernize) updateModernizationSchemaFields();
	updateNewReviewSummary();
	updatePipeline(state.activeRun);
}

function updateModernizationSchemaFields() {
	const source = elements.modernizationSchemaSource?.value || "none";
	if (elements.modernizationSchemaFileWrap) elements.modernizationSchemaFileWrap.hidden = source !== "attached-dump";
	if (elements.modernizationSchemaPathWrap) elements.modernizationSchemaPathWrap.hidden = source !== "repo-path";
}

function updateModernizationTargetProfiles() {
	const runtime = elements.modernizationTargetRuntime?.value || "lucee-modern";
	const profiles = window.DoubleCheckModernization?.allowedProfiles(runtime) || [];
	if (!profiles.length) return;
	const languages = [...new Set(profiles.map((profile) => profile.targetLanguage))];
	const layouts = [...new Set(profiles.map((profile) => profile.layoutProfile))];
	const languageLabels = { boxlang: "BoxLang", cfml: "CFML" };
	const layoutLabels = { modern: "ColdBox app/ + public/", flat: "Flat repository layout" };
	const replaceOptions = (select, values, preferred, labels) => {
		if (!select) return;
		const prior = select.value;
		select.innerHTML = "";
		values.forEach((value) => {
			const option = document.createElement("option");
			option.value = value;
			option.textContent = labels[value] || value;
			select.appendChild(option);
		});
		select.value = values.includes(prior) ? prior : (values.includes(preferred) ? preferred : values[0]);
	};
	replaceOptions(elements.modernizationTargetLanguage, languages, languages[0], languageLabels);
	replaceOptions(elements.modernizationLayoutProfile, layouts, "modern", layoutLabels);
}

function updateModernizationProviderDisclosure() {
	const configured = String(elements.modernizationProvider?.dataset?.configuredProvider || "").toLowerCase();
	if (configured && elements.modernizationProvider && elements.modernizationProvider.value.toLowerCase() !== configured) {
		elements.modernizationProvider.value = configured;
	}
	const provider = String(elements.modernizationProvider?.value || "").toLowerCase();
	const remote = provider && provider !== "ollama" && provider !== "docker";
	if (elements.modernizationRemoteAckWrap) elements.modernizationRemoteAckWrap.hidden = !remote;
	if (elements.modernizationProviderStatus) {
		elements.modernizationProviderStatus.textContent = remote ? "Remote acknowledgement required" : "Local provider";
		elements.modernizationProviderStatus.dataset.state = remote ? "warning" : "ok";
	}
	if (remote && elements.modernizationReadiness) {
		elements.modernizationReadiness.textContent = "Run a provider smoke check before starting a remote proposal.";
		elements.modernizationReadiness.dataset.tone = "warning";
	}
}

function readModernizationSchemaFile(file) {
	if (!file) return Promise.resolve({ text: "", fileName: "" });
	const limit = Number(state.capabilities?.modernization?.maxSchemaAttachmentBytes || state.capabilities?.maxSchemaAttachmentBytes || 2 * 1024 * 1024);
	if (file.size > limit) return Promise.reject(new Error("Schema attachment exceeds the 2 MB local limit."));
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve({ text: String(reader.result || ""), fileName: file.name || "" });
		reader.onerror = () => reject(new Error("Unable to read the schema attachment locally."));
		reader.readAsText(file);
	});
}

async function smokeModernizationProvider() {
	if (!elements.modernizationProviderStatus) return { status: "unknown" };
	elements.modernizationProviderStatus.textContent = "Checking provider…";
	elements.modernizationProviderStatus.dataset.state = "pending";
	try {
		const payload = await request("/api/v1/ai/smoke");
		const success = payload?.data?.success !== false;
		elements.modernizationProviderStatus.textContent = success ? "Provider ready" : "Provider unavailable";
		elements.modernizationProviderStatus.dataset.state = success ? "ok" : "danger";
		return { status: success ? "succeeded" : "failed", message: payload?.data?.message || "Provider smoke check failed." };
	} catch (error) {
		elements.modernizationProviderStatus.textContent = "Provider unavailable";
		elements.modernizationProviderStatus.dataset.state = "danger";
		return { status: "failed", message: error.message };
	}
}

async function submitModernization() {
	if (elements.formMessage) {
		elements.formMessage.textContent = "";
		elements.formMessage.dataset.tone = "";
	}
	const formData = new FormData(elements.form);
	const values = Object.fromEntries(formData.entries());
	values.allowedRole = formData.getAll("allowedRole");
	const file = elements.modernizationSchemaFile?.files?.[0];
	try {
		const attachment = await readModernizationSchemaFile(file);
		values.schemaText = attachment.text;
		values.schemaFileName = attachment.fileName;
		const contract = window.DoubleCheckModernization;
		const capabilityInput = {
			...(state.capabilities?.modernization || {}),
			...state.capabilities,
			defaultProvider: values.provider,
			providerRequired: true
		};
		const requestBody = contract
			? contract.normalizeModernizationRequest(values, capabilityInput)
			: { runKind: "modernize", projectPath: values.projectPath, mode: values.mode, modernization: values };
		const smoke = await smokeModernizationProvider();
		const readiness = contract
			? contract.modernizationReadiness(requestBody, capabilityInput, smoke)
			: { ready: smoke.status !== "failed", errors: smoke.status === "failed" ? [smoke.message] : [], warnings: [] };
		if (!readiness.ready) {
			elements.modernizationReadiness.textContent = readiness.errors.join(" ");
			elements.modernizationReadiness.dataset.tone = "danger";
			return;
		}
		elements.modernizationReadiness.textContent = readiness.warnings.join(" ");
		const payload = await request("/api/v1/runs", { method: "POST", body: JSON.stringify(requestBody) });
		watchRun(payload.data);
		loadRuns();
	} catch (error) {
		elements.formMessage.textContent = error.message;
		elements.formMessage.dataset.tone = "danger";
	}
}

elements.runKind?.addEventListener("change", (event) => setModernizationWorkspace(event.target.value));
elements.modernizationProvider?.addEventListener("change", updateModernizationProviderDisclosure);
elements.modernizationTargetRuntime?.addEventListener("change", () => {
	updateModernizationTargetProfiles();
});
elements.modernizationSchemaSource?.addEventListener("change", updateModernizationSchemaFields);
elements.modernizationSchemaFile?.addEventListener("change", () => {
		const file = elements.modernizationSchemaFile.files?.[0];
		if (elements.modernizationSchemaStatus) elements.modernizationSchemaStatus.textContent = file ? `${file.name} selected · read locally on submit` : "Repository SQL will be auto-discovered locally; no usable DDL remains visible as inference-limited coverage.";
});

function setRunSubmitBusy(busy) {
	const button = elements.startRunButton;
	if (!button) return;
	if (busy) {
		button.dataset.idleLabel = button.textContent;
		button.disabled = true;
		button.classList.add("is-loading");
		button.innerHTML = "";
		const spinner = document.createElement("span");
		spinner.className = "button-spinner";
		spinner.setAttribute("aria-hidden", "true");
		const label = document.createElement("span");
		label.textContent = state.workspace === "modernize"
			? "Starting modernization…"
			: state.workspace === "codegraph"
				? "Starting CodeGraph…"
				: "Starting review…";
		button.append(spinner, label);
	} else {
		button.disabled = false;
		button.classList.remove("is-loading");
		if (button.dataset.idleLabel) button.textContent = button.dataset.idleLabel;
	}
}

elements.form?.addEventListener("submit", async (event) => {
	event.preventDefault();
	setRunSubmitBusy(true);
	try {
		if (state.workspace === "modernize") {
			await submitModernization();
			return;
		}
		if (state.workspace === "codegraph") {
			if (elements.formMessage) {
				elements.formMessage.textContent = "";
				elements.formMessage.dataset.tone = "";
			}
			const formData = new FormData(elements.form);
			const body = {
				runKind: "codegraph",
				projectPath: String(formData.get("projectPath") || "").trim(),
				mode: "full",
				projectId: formData.get("projectId") || undefined
			};
			try {
				const payload = await request("/api/v1/runs", { method: "POST", body: JSON.stringify(body) });
				watchRun(payload.data);
				loadRuns();
			} catch (error) {
				if (elements.formMessage) {
					elements.formMessage.textContent = error.message;
					elements.formMessage.dataset.tone = "danger";
				}
			}
			return;
		}
		elements.formMessage.textContent = "";
		const formData = new FormData(elements.form);
		const body = Object.fromEntries(formData);
		body.policy = {
			allowedRoles: formData.getAll("allowedRole"),
			reviewGoal: String(formData.get("reviewGoal") || "").trim()
		};
		body.budgets = {
			maxTasks: Number(formData.get("maxTasks")),
			maxTokens: Number(formData.get("maxTokens")),
			maxTokensPerTask: Number(formData.get("maxTokensPerTask")),
			maxDurationMs: Number(formData.get("maxDurationMs")),
			maxIterationsPerTask: Number(formData.get("maxIterationsPerTask")),
			maxToolOutputCharacters: Number(formData.get("maxToolOutputCharacters")),
			maxCostUsd: Number(formData.get("maxCostUsd"))
		};
		delete body.allowedRole;
		delete body.reviewGoal;
		delete body.reviewPreset;
		delete body.maxTasks;
		delete body.maxTokens;
		delete body.maxTokensPerTask;
		delete body.maxDurationMs;
		delete body.maxIterationsPerTask;
		delete body.maxToolOutputCharacters;
		delete body.maxCostUsd;
		// Only restrict the scan when the tree was loaded for THIS exact path
		// (not stale from a previous path edited without a Refresh) AND the
		// user actually deselected something — otherwise this stays absent so
		// scans behave exactly as before the file picker existed.
		const currentProjectPath = (elements.projectPath?.value || "").trim();
		if (
			state.projectTree.path && state.projectTree.path === currentProjectPath &&
			state.projectTree.files.length && state.projectTree.selected.size < state.projectTree.files.length
		) {
			body.selectedFiles = [...state.projectTree.selected];
		}
		try {
			const payload = await request("/api/v1/runs", { method: "POST", body: JSON.stringify(body) });
			watchRun(payload.data);
			loadRuns();
		} catch (error) {
			elements.formMessage.textContent = error.message;
		}
	} finally {
		setRunSubmitBusy(false);
	}
});

elements.projectId?.addEventListener("change", () => {
	const selected = elements.projectId.selectedOptions[0];
	if (selected?.dataset?.rootPath) {
		elements.projectPath.value = selected.dataset.rootPath;
	}
});

function updateRevisionFields() {
	const mode = elements.mode?.value || "full";
	const revisionMode = mode === "revision-diff";
	if (elements.revisionFields) elements.revisionFields.hidden = !revisionMode;
	if (elements.baseRevision) elements.baseRevision.required = revisionMode;
	if (elements.modeHint) {
		if (mode === "working-tree") {
			elements.modeHint.textContent = "Working tree needs a Git repository with changed files. For a plain folder or clean tree, choose Full baseline.";
		} else if (mode === "revision-diff") {
			elements.modeHint.textContent = "Compare two Git revisions. Provide a base branch/commit and optional head (defaults to HEAD).";
		} else {
			elements.modeHint.textContent = "Full baseline scans the folder/repository contents with ignore and size limits.";
		}
	}
	updateNewReviewSummary();
}

elements.mode?.addEventListener("change", updateRevisionFields);
elements.reviewGoal?.addEventListener("input", updateNewReviewSummary);
elements.form?.querySelectorAll("[name='reviewPreset']").forEach((input) => {
	input.addEventListener("change", () => {
		if (input.checked) applyReviewPreset(input.value);
	});
});
[
	"maxTasks",
	"maxTokens",
	"maxTokensPerTask",
	"maxDurationMs",
	"maxIterationsPerTask",
	"maxToolOutputCharacters",
	"maxCostUsd"
].forEach((name) => {
	elements.form?.elements[name]?.addEventListener("input", updateNewReviewSummary);
});

// Builds a nested { dirs: Map, files: [] } tree from flat repository-relative
// paths so the picker can render collapsible folders without the backend
// having to walk directories twice (once for files, once for structure).
function buildProjectTreeNode() {
	return { dirs: new Map(), files: [] };
}

function insertProjectTreePath(root, filePath) {
	const segments = filePath.split("/").filter(Boolean);
	const fileName = segments.pop();
	let node = root;
	for (const segment of segments) {
		if (!node.dirs.has(segment)) node.dirs.set(segment, buildProjectTreeNode());
		node = node.dirs.get(segment);
	}
	node.files.push({ name: fileName, filePath });
}

function projectTreeCheckedState(node) {
	const allPaths = [];
	(function collect(n) {
		n.files.forEach((f) => allPaths.push(f.filePath));
		n.dirs.forEach((child) => collect(child));
	})(node);
	if (!allPaths.length) return "none";
	const selectedCount = allPaths.filter((p) => state.projectTree.selected.has(p)).length;
	if (selectedCount === 0) return "none";
	if (selectedCount === allPaths.length) return "all";
	return "some";
}

function projectTreeAllPaths(node) {
	const paths = [];
	(function collect(n) {
		n.files.forEach((f) => paths.push(f.filePath));
		n.dirs.forEach((child) => collect(child));
	})(node);
	return paths;
}

function renderProjectTreeNode(node, dirPath, depth) {
	const dirNames = [...node.dirs.keys()].sort((a, b) => a.localeCompare(b));
	const sortedFiles = [...node.files].sort((a, b) => a.name.localeCompare(b.name));
	const dirsHtml = dirNames.map((name) => {
		const child = node.dirs.get(name);
		const childPath = dirPath ? `${dirPath}/${name}` : name;
		const checkedState = projectTreeCheckedState(child);
		return `<details class="project-tree-dir" open data-dir-path="${escapeHtml(childPath)}">
			<summary><input type="checkbox" data-dir-toggle="${escapeHtml(childPath)}" ${checkedState === "all" ? "checked" : ""} ${checkedState === "some" ? "data-indeterminate=\"true\"" : ""}> ${escapeHtml(name)}</summary>
			${renderProjectTreeNode(child, childPath, depth + 1)}
		</details>`;
	}).join("");
	const filesHtml = sortedFiles.map((file) => `<label class="project-tree-file">
		<input type="checkbox" data-file-toggle="${escapeHtml(file.filePath)}" ${state.projectTree.selected.has(file.filePath) ? "checked" : ""}>
		${escapeHtml(file.name)}
	</label>`).join("");
	return dirsHtml + filesHtml;
}

function escapeHtml(value) {
	return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[ch]));
}

function renderProjectTreeCount() {
	if (!elements.projectTreeCount) return;
	const total = state.projectTree.files.length;
	elements.projectTreeCount.textContent = total ? `${state.projectTree.selected.size} / ${total} selected` : "";
}

function renderProjectTree() {
	if (!elements.projectTree) return;
	renderProjectTreeCount();
	if (state.projectTree.loading) {
		elements.projectTree.innerHTML = `<p class="field-hint">Loading files…</p>`;
		return;
	}
	if (state.projectTree.error) {
		elements.projectTree.innerHTML = `<p class="field-hint" data-tone="danger">${escapeHtml(state.projectTree.error)}</p>`;
		return;
	}
	if (!state.projectTree.files.length) {
		elements.projectTree.innerHTML = `<p class="field-hint">Enter a project path on the left, then Refresh to preview its files.</p>`;
		return;
	}
	const root = buildProjectTreeNode();
	state.projectTree.files.forEach((file) => insertProjectTreePath(root, file.filePath));
	elements.projectTree.innerHTML = renderProjectTreeNode(root, "", 0);
	elements.projectTree.querySelectorAll("[data-indeterminate]").forEach((el) => { el.indeterminate = true; });
}

async function loadProjectTree() {
	const path = (elements.projectPath?.value || "").trim();
	if (!elements.projectTreePanel) return;
	if (!path) {
		state.projectTree = { path: "", files: [], selected: new Set(), loading: false, error: "" };
		renderProjectTree();
		return;
	}
	state.projectTree.loading = true;
	state.projectTree.error = "";
	renderProjectTree();
	try {
		const mode = elements.mode?.value || "full";
		const payload = await request(`/api/v1/projects/tree?projectPath=${encodeURIComponent(path)}&mode=${encodeURIComponent(mode)}`);
		const files = payload.data?.files || [];
		state.projectTree = {
			path,
			files,
			selected: new Set(files.map((f) => f.filePath)),
			loading: false,
			error: ""
		};
	} catch (error) {
		state.projectTree.loading = false;
		state.projectTree.error = error.message || "Could not load files for this path.";
	}
	renderProjectTree();
}

elements.projectTreeRefresh?.addEventListener("click", loadProjectTree);
elements.projectTreeSelectAll?.addEventListener("click", () => {
	state.projectTree.selected = new Set(state.projectTree.files.map((f) => f.filePath));
	renderProjectTree();
});
elements.projectTreeSelectNone?.addEventListener("click", () => {
	state.projectTree.selected = new Set();
	renderProjectTree();
});
elements.projectTree?.addEventListener("change", (event) => {
	const fileToggle = event.target.closest("[data-file-toggle]");
	if (fileToggle) {
		const path = fileToggle.getAttribute("data-file-toggle");
		if (fileToggle.checked) state.projectTree.selected.add(path);
		else state.projectTree.selected.delete(path);
		renderProjectTreeCount();
		return;
	}
	const dirToggle = event.target.closest("[data-dir-toggle]");
	if (dirToggle) {
		const dirPath = dirToggle.getAttribute("data-dir-toggle");
		const details = dirToggle.closest("[data-dir-path]");
		const root = buildProjectTreeNode();
		state.projectTree.files.forEach((file) => insertProjectTreePath(root, file.filePath));
		let node = root;
		dirPath.split("/").filter(Boolean).forEach((segment) => { node = node.dirs.get(segment); });
		const paths = node ? projectTreeAllPaths(node) : [];
		if (dirToggle.checked) paths.forEach((p) => state.projectTree.selected.add(p));
		else paths.forEach((p) => state.projectTree.selected.delete(p));
		renderProjectTree();
	}
});
elements.projectPath?.addEventListener("change", loadProjectTree);

elements.cancel?.addEventListener("click", async () => {
	if (!state.activeRun) return;
	try {
		const payload = await request(`/api/v1/runs/${encodeURIComponent(state.activeRun.id)}`, { method: "DELETE" });
		setRun(payload.data);
	} catch (error) {
		elements.formMessage.textContent = error.message;
	}
});

elements.jumpTrace?.addEventListener("click", () => {
	elements.observePanel?.scrollIntoView({
		behavior: "smooth",
		block: "start"
	});
});

elements.jumpFindings?.addEventListener("click", () => {
	const resultTarget = state.workspace === "modernize"
		? elements.modernizationResults
		: state.workspace === "codegraph"
			? elements.codegraphExplorer
			: document.querySelector("#results-panel");
	resultTarget?.scrollIntoView({
		behavior: "smooth",
		block: "start"
	});
});

elements.codegraphLayout?.addEventListener("change", (event) => {
	state.codegraph.layout = event.target.value || "cluster";
	paintCodeGraphCanvas();
});

elements.codegraphShowAi?.addEventListener("change", (event) => {
	state.codegraph.showAi = !!event.target.checked;
	renderCodeGraphAiSummaries();
	const selected = state.codegraph.layoutResult?.nodes?.find((n) => n.id === state.codegraph.selectedId);
	if (elements.codegraphInspector) elements.codegraphInspector.innerHTML = codeGraphInspectorHtml(selected);
});

elements.codegraphAiSummaries?.addEventListener("click", (event) => {
	const item = event.target.closest("[data-codegraph-ai-target]");
	if (!item) return;
	const target = item.dataset.codegraphAiTarget || "";
	if (!target) return;
	const match = state.codegraph.layoutResult?.nodes?.find((n) =>
		n.id === target || n.path === target || n.clusterId === target
	);
	if (match) codeGraphSelectNode(match.id);
});

elements.codegraphIssueTabs?.addEventListener("click", (event) => {
	const tab = event.target.closest("[data-codegraph-issue]");
	if (!tab) return;
	state.codegraph.issueTab = tab.dataset.codegraphIssue || "cycles";
	renderCodeGraphIssues();
});

elements.codegraphIssueList?.addEventListener("click", (event) => {
	const item = event.target.closest("[data-codegraph-focus]");
	if (!item) return;
	let paths = [];
	try { paths = JSON.parse(item.dataset.codegraphPaths || "[]"); } catch (_error) { paths = []; }
	const focusId = item.dataset.codegraphFocus || paths[0] || "";
	if (state.codegraph.mode === "cluster") {
		state.codegraph.mode = "file";
		state.codegraph.clusterId = "";
		paintCodeGraphCanvas();
	}
	const match = state.codegraph.layoutResult?.nodes?.find((n) =>
		n.id === focusId || paths.includes(n.id) || paths.includes(n.path)
	);
	if (match) {
		state.codegraph.selectedId = match.id;
		elements.codegraphCanvas?.querySelectorAll(".cg-node").forEach((el) => {
			el.classList.toggle("is-selected", el.getAttribute("data-node-id") === match.id);
		});
		if (elements.codegraphInspector) elements.codegraphInspector.innerHTML = codeGraphInspectorHtml(match);
		codeGraphCentreOnNode(match.id);
	}
});

elements.codegraphBreadcrumb?.addEventListener("click", (event) => {
	const crumb = event.target.closest("[data-codegraph-crumb]");
	if (!crumb) return;
	const target = crumb.dataset.codegraphCrumb;
	if (target === "root") {
		state.codegraph.mode = "cluster";
		state.codegraph.clusterId = "";
		state.codegraph.focusId = "";
		state.codegraph.focusSubgraph = null;
		resetCodeGraphSelection();
		paintCodeGraphCanvas();
	} else if (target === "cluster") {
		state.codegraph.mode = "file";
		state.codegraph.focusId = "";
		state.codegraph.focusSubgraph = null;
		paintCodeGraphCanvas();
	}
});

elements.codegraphCanvas?.addEventListener("click", (event) => {
	const node = event.target.closest("[data-node-id]");
	if (!node) return;
	codeGraphSelectNode(node.getAttribute("data-node-id"));
});

elements.codegraphCanvas?.addEventListener("dblclick", (event) => {
	const node = event.target.closest("[data-node-id]");
	if (!node) return;
	event.preventDefault();
	codeGraphSelectNode(node.getAttribute("data-node-id"), { drill: true });
});

elements.codegraphCanvas?.addEventListener("pointerdown", (event) => {
	if (event.target.closest("[data-node-id]")) return;
	state.codegraph.panning = true;
	state.codegraph.panLast = { x: event.clientX, y: event.clientY };
	elements.codegraphCanvas.setPointerCapture?.(event.pointerId);
});

elements.codegraphCanvas?.addEventListener("pointermove", (event) => {
	if (!state.codegraph.panning || !state.codegraph.viewport) return;
	const CG = codeGraphLayoutApi();
	if (!CG) return;
	const dx = event.clientX - state.codegraph.panLast.x;
	const dy = event.clientY - state.codegraph.panLast.y;
	state.codegraph.panLast = { x: event.clientX, y: event.clientY };
	state.codegraph.viewport = CG.panBy(state.codegraph.viewport, dx, dy);
	codeGraphApplyViewBox();
});

elements.codegraphCanvas?.addEventListener("pointerup", () => {
	state.codegraph.panning = false;
	state.codegraph.panLast = null;
});

elements.codegraphCanvas?.addEventListener("pointercancel", () => {
	state.codegraph.panning = false;
	state.codegraph.panLast = null;
});

elements.codegraphCanvas?.addEventListener("wheel", (event) => {
	const CG = codeGraphLayoutApi();
	if (!CG || !state.codegraph.viewport) return;
	event.preventDefault();
	const rect = elements.codegraphCanvas.getBoundingClientRect();
	const point = {
		x: event.clientX - rect.left,
		y: event.clientY - rect.top
	};
	const factor = event.deltaY < 0 ? 0.9 : 1.1;
	state.codegraph.viewport = CG.zoomAt(state.codegraph.viewport, point, factor, { min: 0.2, max: 8 });
	codeGraphApplyViewBox();
}, { passive: false });

elements.codegraphCanvas?.addEventListener("keydown", (event) => {
	const CG = codeGraphLayoutApi();
	if (!CG || !state.codegraph.viewport) return;
	if (event.key === "+" || event.key === "=") {
		event.preventDefault();
		state.codegraph.viewport = CG.zoomAt(state.codegraph.viewport, { x: state.codegraph.viewport.width / 2, y: state.codegraph.viewport.height / 2 }, 0.9, { min: 0.2, max: 8 });
		codeGraphApplyViewBox();
	} else if (event.key === "-" || event.key === "_") {
		event.preventDefault();
		state.codegraph.viewport = CG.zoomAt(state.codegraph.viewport, { x: state.codegraph.viewport.width / 2, y: state.codegraph.viewport.height / 2 }, 1.1, { min: 0.2, max: 8 });
		codeGraphApplyViewBox();
	} else if (event.key === "0") {
		event.preventDefault();
		paintCodeGraphCanvas();
	} else if (event.key === "Escape") {
		event.preventDefault();
		if (state.codegraph.mode === "focus") {
			state.codegraph.mode = "file";
			state.codegraph.focusId = "";
			state.codegraph.focusSubgraph = null;
			paintCodeGraphCanvas();
		} else if (state.codegraph.mode === "file") {
			state.codegraph.mode = "cluster";
			state.codegraph.clusterId = "";
			resetCodeGraphSelection();
			paintCodeGraphCanvas();
		} else {
			resetCodeGraphSelection();
			paintCodeGraphCanvas();
		}
	}
});

elements.commandExport?.addEventListener("click", () => {
	downloadExport("markdown");
});

elements.refresh?.addEventListener("click", loadRuns);
elements.historyFilters?.addEventListener("submit", (event) => {
	event.preventDefault();
	state.history.page = 1;
	loadRuns();
});
elements.historyClear?.addEventListener("click", () => {
	elements.historyFilters?.reset();
	state.history.page = 1;
	loadRuns();
});
elements.historyPrevious?.addEventListener("click", () => {
	if (state.history.page <= 1) return;
	state.history.page--;
	loadRuns();
});
elements.historyNext?.addEventListener("click", () => {
	if (state.history.page >= state.history.totalPages) return;
	state.history.page++;
	loadRuns();
});
elements.historyComparisonClose?.addEventListener("click", () => {
	elements.historyComparison.hidden = true;
});

elements.observeFilters?.addEventListener("click", (event) => {
	const button = event.target.closest("[data-observe-filter]");
	if (!button) return;
	state.observeFilter = button.dataset.observeFilter || "all";
	elements.observeFilters.querySelectorAll(".observe-filter").forEach((item) => {
		item.classList.toggle("is-active", item === button);
	});
	renderObservability();
});

elements.observeRoleFilters?.addEventListener("click", (event) => {
	const button = event.target.closest("[data-observe-role]");
	if (!button) return;
	state.observeRoleFilter = button.dataset.observeRole || "all";
	renderObservability();
});

elements.observeSearch?.addEventListener("input", (event) => {
	state.observeSearch = event.target.value || "";
	renderObservability();
});

elements.observeExport?.addEventListener("click", () => {
	exportObservabilityTraces();
});

elements.findingSearch?.addEventListener("input", (event) => {
	state.findingSearch = event.target.value || "";
	renderFindingsWorkspace();
});

elements.findingSeverity?.addEventListener("change", (event) => {
	state.findingSeverity = event.target.value || "all";
	renderFindingsWorkspace();
});

elements.findingReviewState?.addEventListener("change", (event) => {
	state.findingReviewState = event.target.value || "all";
	renderFindingsWorkspace();
});

elements.architectureSearch?.addEventListener("input", (event) => {
	state.architectureSearch = event.target.value || "";
	renderArchitectureExplorer();
});

elements.architectureKind?.addEventListener("change", (event) => {
	state.architectureKind = event.target.value || "all";
	renderArchitectureExplorer();
});

elements.architectureDiagram?.addEventListener("click", (event) => {
	const node = event.target.closest(".architecture-node");
	if (node) {
		const path = node.getAttribute("data-path") || "";
		state.architectureSelectedPath = state.architectureSelectedPath === path ? "" : path;
		renderArchitectureExplorer();
		return;
	}
	if (event.target.closest("svg") || event.target === elements.architectureDiagram) {
		state.architectureSelectedPath = "";
		renderArchitectureExplorer();
	}
});

elements.architectureClearSelection?.addEventListener("click", () => {
	state.architectureSelectedPath = "";
	renderArchitectureExplorer();
});

elements.findingSort?.addEventListener("change", (event) => {
	state.findingSort = event.target.value || "priority";
	renderFindingsWorkspace();
});

elements.findingSeveritySummary?.addEventListener("click", (event) => {
	const button = event.target.closest("[data-finding-severity]");
	if (!button) return;
	state.findingSeverity = state.findingSeverity === button.dataset.findingSeverity
		? "all"
		: button.dataset.findingSeverity;
	if (elements.findingSeverity) elements.findingSeverity.value = state.findingSeverity;
	renderFindingsWorkspace();
});

elements.findings?.addEventListener("click", (event) => {
	const card = event.target.closest("[data-finding-id]");
	if (!card) return;
	state.selectedFindingId = card.dataset.findingId || "";
	renderFindingsWorkspace();
});

elements.findings?.addEventListener("keydown", (event) => {
	if (event.key !== "Enter" && event.key !== " ") return;
	const card = event.target.closest("[data-finding-id]");
	if (!card) return;
	event.preventDefault();
	state.selectedFindingId = card.dataset.findingId || "";
	renderFindingsWorkspace();
});

async function downloadExport(format) {
	if (!state.activeRun) return;
	try {
		const response = await fetch(
			`/api/v1/runs/${encodeURIComponent(state.activeRun.id)}/export?format=${encodeURIComponent(format)}`
		);
		if (!response.ok) {
			const payload = await response.json().catch(() => ({}));
			throw new Error(payload?.error?.message || `Export failed (${response.status})`);
		}
		const blob = await response.blob();
		const disposition = response.headers.get("Content-Disposition") || "";
		const match = disposition.match(/filename="?([^"]+)"?/i);
		const fileName = match?.[1] || `doublecheck-report.${format === "sarif" ? "sarif.json" : format === "json" ? "json" : "md"}`;
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = fileName;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	} catch (error) {
		elements.summary.textContent = error.message;
	}
}

elements.exportActions?.addEventListener("click", (event) => {
	const button = event.target.closest("[data-export-format]");
	if (!button) return;
	downloadExport(button.dataset.exportFormat);
});

function selectModernizationPane(paneName, { focus = false } = {}) {
	const pane = String(paneName || "overview");
	state.modernization.activePane = pane;
	const tabs = elements.modernizationPanes?.querySelectorAll("[data-modern-pane]") || [];
	tabs.forEach((button) => {
		const selected = button.dataset.modernPane === pane;
		button.setAttribute("aria-selected", selected ? "true" : "false");
		button.setAttribute("tabindex", selected ? "0" : "-1");
		if (selected && focus) button.focus();
	});
	document.querySelectorAll("[data-modernization-pane]").forEach((panel) => {
		const selected = panel.dataset.modernizationPane === pane;
		panel.hidden = !selected;
		panel.setAttribute("aria-hidden", selected ? "false" : "true");
	});
}

elements.modernizationResults?.addEventListener("click", (event) => {
	const tab = event.target.closest("[data-modern-pane]");
	if (tab) {
		selectModernizationPane(tab.dataset.modernPane, { focus: false });
		return;
	}
	const itemButton = event.target.closest("[data-modernization-item]");
	if (!itemButton || !state.modernization.result) return;
	const rows = modernizationItems(state.modernization.result, state.modernization.activePane);
	state.modernization.selectedItem = rows.find((item) => modernizationItemKey(item) === itemButton.dataset.modernizationItem) || null;
	const pane = document.querySelector(`#modernization-pane-${state.modernization.activePane}`);
	if (pane) renderModernizationList(modernizationListContainer(pane), rows);
	renderModernizationDetail(state.modernization.selectedItem);
});

elements.modernizationResults?.addEventListener("keydown", (event) => {
	const tab = event.target.closest("[data-modern-pane]");
	if (!tab) return;
	const tabs = [...elements.modernizationPanes.querySelectorAll("[data-modern-pane]")];
	const index = tabs.indexOf(tab);
	if (index < 0) return;
	let next = index;
	if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
	else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
	else if (event.key === "Home") next = 0;
	else if (event.key === "End") next = tabs.length - 1;
	else return;
	event.preventDefault();
	selectModernizationPane(tabs[next].dataset.modernPane, { focus: true });
});

document.querySelector("#modernization-show-unsliced")?.addEventListener("change", (event) => {
	state.modernization.showUnsliced = !!event.target.checked;
	renderModernizationSolution(state.modernization.result || {});
});
elements.modernizationSearch?.addEventListener("input", (event) => {
	state.modernization.search = event.target.value || "";
	renderModernizationResult(state.modernization.result || {});
});
elements.modernizationItemType?.addEventListener("change", (event) => {
	state.modernization.itemType = event.target.value || "all";
	renderModernizationResult(state.modernization.result || {});
});
elements.modernizationValidation?.addEventListener("change", (event) => {
	state.modernization.validation = event.target.value || "all";
	renderModernizationResult(state.modernization.result || {});
});
elements.modernizationDecision?.addEventListener("change", (event) => {
	state.modernization.decision = event.target.value || "all";
	renderModernizationResult(state.modernization.result || {});
});
elements.modernizationContext?.addEventListener("change", (event) => {
	state.modernization.context = event.target.value || "all";
	renderModernizationResult(state.modernization.result || {});
});
elements.modernizationPhase?.addEventListener("change", (event) => {
	state.modernization.phase = event.target.value || "all";
	renderModernizationResult(state.modernization.result || {});
});
elements.modernizationExportActions?.addEventListener("click", (event) => {
	const button = event.target.closest("[data-modernization-export-format]");
	if (!button) return;
	downloadExport(button.dataset.modernizationExportFormat);
});

loadHealth();
applyStartupPreferences();
loadSession();
// AI providers and run defaults live inside the collapsed Settings <details>
// on the dashboard. Loading them eagerly on every page load fired two extra
// requests (including a redundant second /api/v1/app-settings fetch) before
// the user ever opened that panel. Load once, lazily, on first expand.
let settingsPanelLoaded = false;
elements.settingsPanel?.addEventListener("toggle", () => {
	if (elements.settingsPanel.open && !settingsPanelLoaded) {
		settingsPanelLoaded = true;
		loadProviders();
		loadRunDefaults();
	}
});
renderResult();
if (state.workspace === "codegraph") {
	updatePipeline(state.activeRun);
} else {
	setModernizationWorkspace(state.workspace === "modernize" ? "modernize" : "review");
}
selectModernizationPane(state.modernization.activePane);
updateModernizationProviderDisclosure();
updateModernizationTargetProfiles();
updateRevisionFields();
updateNewReviewSummary();
