/*
 * Pure helpers shared by the Modernize setup UI and its Node contract tests.
 * This file intentionally has no DOM or network dependency.
 */
(function (root, factory) {
	const api = factory();
	if (typeof module === "object" && module.exports) module.exports = api;
	if (root) root.DoubleCheckModernization = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
	const DEFAULT_LIMIT = 2 * 1024 * 1024;
	const MAX_OUTCOME_CHARACTERS = 120;
	const profileMatrix = {
		"boxlang-modern": {
			runtime: "boxlang-modern",
			languages: ["boxlang"],
			layouts: ["boxlang", "modern"]
		},
		"lucee-modern": {
			runtime: "lucee-modern",
			languages: ["cfml"],
			layouts: ["modern", "flat"]
		},
	};

	function asObject(values) {
		if (!values) return {};
		if (typeof values.get === "function") {
			const result = {};
			for (const [key, value] of values.entries()) {
				if (Object.prototype.hasOwnProperty.call(result, key)) {
					result[key] = Array.isArray(result[key]) ? result[key].concat(value) : [result[key], value];
				} else result[key] = value;
			}
			return result;
		}
		return { ...values };
	}

	function first(values, key, fallback = "") {
		const value = values[key];
		return Array.isArray(value) ? (value[0] ?? fallback) : (value ?? fallback);
	}

	function list(values, key) {
		const value = values[key];
		if (Array.isArray(value)) return value.filter(Boolean).map(String);
		if (value === undefined || value === null || value === "") return [];
		return [String(value)];
	}

	function number(values, key, fallback) {
		const parsed = Number(first(values, key, fallback));
		return Number.isFinite(parsed) ? parsed : fallback;
	}

	function allowedProfiles(targetRuntime) {
		const rawKey = String(targetRuntime || "").trim().toLowerCase();
		const key = profileMatrix[rawKey] ? rawKey : `${rawKey}-modern`;
		const profile = profileMatrix[key];
		if (!profile) return [];
		return profile.languages.flatMap((language) => profile.layouts.map((layout) => ({
			targetRuntime: profile.runtime,
			targetLanguage: language,
			layoutProfile: layout
		})));
	}

	function normalizeModernizationRequest(formValues, capabilities = {}) {
		const values = asObject(formValues);
		const targetRuntime = String(first(values, "targetRuntime", "lucee-modern")).trim().toLowerCase();
		const profileOptions = allowedProfiles(targetRuntime);
		const requestedLanguage = String(first(values, "targetLanguage", profileOptions[0]?.targetLanguage || "cfml")).toLowerCase();
		const requestedLayout = String(first(values, "layoutProfile", profileOptions[0]?.layoutProfile || "modern")).toLowerCase();
		const selectedProfile = profileOptions.find((item) => item.targetLanguage === requestedLanguage && item.layoutProfile === requestedLayout) || {
			targetRuntime,
			targetLanguage: requestedLanguage,
			layoutProfile: requestedLayout
		};
		const schemaText = first(values, "schemaText", "");
		const schemaFileName = String(first(values, "schemaFileName", "")).trim().toLowerCase();
		const schemaPath = first(values, "schemaPath", "");
		const provider = String(first(values, "provider", capabilities.defaultProvider || "")).trim().toLowerCase();
		const ack = first(values, "remoteProviderAcknowledged", false);

		const runtime = targetRuntime.endsWith("-modern") ? targetRuntime.slice(0, -7) : targetRuntime;
		const schemaSource = String(first(values, "schemaSource", "none")).trim().toLowerCase() || "none";
		const schemaFormat = schemaSource === "attached-dump"
			? (schemaFileName.endsWith(".json") ? "structured-json-v1" : "inline-ddl")
			: schemaSource === "repo-path" ? "sql-ddl" : "";
		const modelOverride = String(first(values, "modelOverride", "")).trim();
		const outcomes = list(values, "outcomes").concat(String(first(values, "outcome", "")).trim() ? [String(first(values, "outcome", "")).trim()] : []);
		const normalizedInput = {
			provider,
			execution: { model: modelOverride },
			outcomes,
			source: {
				engine: String(first(values, "sourceEngine", "unknown")).trim().toLowerCase(),
				version: String(first(values, "sourceVersion", "")).trim(),
				javaVersion: String(first(values, "sourceJavaVersion", "")).trim()
			},
			target: {
				runtime,
				language: selectedProfile.targetLanguage,
				layoutProfile: selectedProfile.layoutProfile,
				coldboxMajor: String(first(values, "coldboxMajor", "")).trim(),
				cliMajor: String(first(values, "cliMajor", "")).trim()
			},
			database: {
				vendor: normalizeVendor(first(values, "databaseVendor", "unknown")),
				version: String(first(values, "databaseVersion", "")).trim(),
				schema: String(first(values, "databaseSchema", "")).trim(),
				collation: String(first(values, "databaseCollation", "")).trim(),
				timezone: String(first(values, "databaseTimezone", "")).trim()
			},
			schemaPack: {
				sourceKind: schemaSource === "attached-dump" ? "inline" : schemaSource,
				format: schemaFormat,
				relativePath: schemaPath,
				packVersion: schemaSource === "attached-dump" ? "modernization-schema-pack-v1" : "",
				inlineContent: schemaText
			},
			privacy: {
				remoteProvider: !!provider && provider !== "ollama" && provider !== "docker",
				remoteEgressAcknowledged: ack === true || ack === "true" || ack === "on" || ack === "1"
			},
			samplePolicy: {
				maxFiles: number(values, "maxSampleFiles", Number(capabilities.maxSampleFiles || 80)),
				currentPhasesOnly: true
			}
		};

		return {
			runKind: "modernize",
			projectId: String(first(values, "projectId", "")).trim(),
			projectPath: String(first(values, "projectPath", "")).trim(),
			mode: String(first(values, "mode", "full")).trim().toLowerCase() || "full",
			input: normalizedInput,
			modernization: normalizedInput,
			policy: {
				allowedRoles: list(values, "allowedRole"),
				reviewGoal: String(first(values, "reviewGoal", "")).trim()
			},
			budgets: {
				maxTasks: number(values, "maxTasks", 3),
				maxTokens: Math.max(number(values, "maxTokens", 24000), 24000),
				maxTokensPerTask: Math.max(number(values, "maxTokensPerTask", 8000), 8000),
				maxDurationMs: Math.max(number(values, "maxDurationMs", 900000), 900000),
				maxIterationsPerTask: number(values, "maxIterationsPerTask", 8),
				maxToolOutputCharacters: number(values, "maxToolOutputCharacters", 48000),
				maxCostUsd: Math.max(number(values, "maxCostUsd", 40), 40),
				maxApplicationShards: number(values, "maxApplicationShards", 40),
				applicationShardSize: number(values, "applicationShardSize", 2),
				applicationShardConcurrency: number(values, "applicationShardConcurrency", 3)
			}
		};
	}

	function schemaAttachmentWithinLimit(file, capabilities = {}) {
		if (!file) return true;
		const limit = Number(capabilities.maxSchemaAttachmentBytes || DEFAULT_LIMIT);
		return Number.isFinite(Number(file.size)) && Number(file.size) >= 0 && Number(file.size) <= limit;
	}

	function normalizeVendor(value) {
		const raw = String(value || "unknown").trim().toLowerCase();
		const compact = raw.replace(/[\s_-]+/g, "");
		return { "sqlserver": "sqlserver", "mssql": "mssql", "mysql": "mysql", "mariadb": "mysql", "postgres": "postgresql", "postgresql": "postgresql", "oracle": "oracle", "sqlite": "sqlite" }[compact] || "unknown";
	}

	function modernizationReadiness(input = {}, capabilities = {}, smokeState = {}) {
		const request = input.runKind ? input : normalizeModernizationRequest(input, capabilities);
		const modernization = request.input || request.modernization || {};
		const errors = [];
		const warnings = [];
		const mode = request.mode || "full";
		if (!request.projectPath) errors.push("Choose a local project path.");
		const target = modernization.target || {};
		const targetRuntime = target.runtime || target.targetRuntime || modernization.targetRuntime || "";
		const targetLanguage = target.language || modernization.targetLanguage || "";
		const targetLayout = target.layoutProfile || modernization.layoutProfile || "";
		const profiles = allowedProfiles(targetRuntime);
		if (!profiles.length) {
			errors.push("Choose a supported target runtime profile.");
		} else if (!profiles.some((profile) => profile.targetLanguage === String(targetLanguage).toLowerCase() && profile.layoutProfile === String(targetLayout).toLowerCase())) {
			errors.push("Choose a supported target language and layout profile for the selected runtime.");
		}
		if (mode !== "full") warnings.push("Modernize is most complete with a full repository scope; this run may be inference-limited.");
		if ((modernization.schemaPack?.sourceKind || modernization.schema?.source || "none") === "repo-path" && !(modernization.schemaPack?.relativePath || modernization.schema?.path)) {
			errors.push("Provide a relative in-repository schema path or choose another schema source.");
		}
		if ((modernization.outcomes || []).some((outcome) => String(outcome).length > MAX_OUTCOME_CHARACTERS)) {
			errors.push(`Keep each modernization outcome at ${MAX_OUTCOME_CHARACTERS} characters or fewer.`);
		}
		// The normalized request carries the selected provider so callers do not
		// need to duplicate form state when checking readiness.  Capabilities can
		// still override it when the server has a configured default.
		const providerName = String(capabilities.defaultProvider || modernization.provider || "").toLowerCase();
		const localProvider = providerName === "ollama" || providerName === "docker" || capabilities.localProviders?.includes(providerName);
		const providerRequired = capabilities.providerRequired !== false;
		if (providerRequired && !providerName) errors.push("Select an enabled modernization provider.");
		if (providerName && smokeState && smokeState.status === "failed") errors.push(smokeState.message || "Provider smoke check failed.");
		const remote = providerName && !localProvider;
		if (remote && !(modernization.privacy?.remoteEgressAcknowledged || capabilities.remoteAcknowledged)) {
			errors.push("Acknowledge that proposal context may be sent to the selected remote provider.");
		}
		if (remote) warnings.push("Remote provider disclosure is active; secrets and schema input stay redacted by the local app.");
		if (smokeState && smokeState.status === "pending") warnings.push("Run the provider smoke check before starting Modernize.");
		return { ready: errors.length === 0, errors, warnings, remoteProvider: remote, localProvider };
	}

	return {
		allowedProfiles,
		normalizeModernizationRequest,
		schemaAttachmentWithinLimit,
		modernizationReadiness,
		profileMatrix
	};
});
