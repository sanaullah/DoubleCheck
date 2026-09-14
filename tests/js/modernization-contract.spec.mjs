import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const contract = require("../../public/assets/modernization-contract.js");

assert.equal(contract.allowedProfiles("lucee-modern").length, 2);
assert.equal(contract.allowedProfiles("lucee").length, 2);
assert.equal(contract.allowedProfiles("lucee-modern").every((profile) => profile.targetLanguage === "cfml"), true);
assert.deepEqual(contract.allowedProfiles("boxlang-modern").map((profile) => profile.layoutProfile), ["boxlang", "modern"]);
assert.deepEqual(contract.allowedProfiles("unknown"), []);

const request = contract.normalizeModernizationRequest({
	projectPath: "C:/projects/legacy-shop",
	mode: "working-tree",
	targetRuntime: "lucee-modern",
	targetLanguage: "cfml",
	layoutProfile: "modern",
	schemaSource: "repo-path",
	schemaPath: "resources/schema.sql",
	provider: "ollama",
	databaseVendor: "SQL Server",
	allowedRole: ["application", "database"],
	maxTasks: "4"
});
assert.equal(request.runKind, "modernize");
assert.equal(request.modernization.target.layoutProfile, "modern");
assert.deepEqual(request.policy.allowedRoles, ["application", "database"]);
assert.equal(request.budgets.maxTasks, 4);
assert.equal(request.input.database.vendor, "sqlserver");
assert.equal(request.input.provider, "ollama");

const jsonRequest = contract.normalizeModernizationRequest({
	projectPath: "C:/projects/legacy-shop",
	targetRuntime: "lucee-modern",
	schemaSource: "attached-dump",
	schemaFileName: "schema.json"
});
assert.equal(jsonRequest.input.schemaPack.format, "structured-json-v1");

assert.equal(contract.schemaAttachmentWithinLimit({ size: 10 }, { maxSchemaAttachmentBytes: 100 }), true);
assert.equal(contract.schemaAttachmentWithinLimit({ size: 101 }, { maxSchemaAttachmentBytes: 100 }), false);

const localReady = contract.modernizationReadiness(request, { providerRequired: true }, { status: "succeeded" });
assert.equal(localReady.ready, true);
assert.equal(localReady.localProvider, true);

const remote = contract.normalizeModernizationRequest({
	projectPath: "C:/projects/legacy-shop",
	targetRuntime: "lucee-modern",
	provider: "openai"
});
const remoteBlocked = contract.modernizationReadiness(remote, { providerRequired: true, defaultProvider: "openai" }, { status: "succeeded" });
assert.equal(remoteBlocked.ready, false);
assert.match(remoteBlocked.errors.join(" "), /acknowledge/i);
remote.input.privacy.remoteEgressAcknowledged = true;
const remoteReady = contract.modernizationReadiness(remote, { providerRequired: true, defaultProvider: "openai" }, { status: "succeeded" });
assert.equal(remoteReady.ready, true);

const scope = contract.modernizationReadiness(request, { providerRequired: true, defaultProvider: "ollama" }, { status: "succeeded" });
assert.match(scope.warnings.join(" "), /full repository scope/i);

const invalidProfile = contract.normalizeModernizationRequest({
	projectPath: "C:/projects/legacy-shop",
	targetRuntime: "lucee-modern",
	targetLanguage: "boxlang",
	layoutProfile: "modern",
	provider: "ollama"
});
const invalidReady = contract.modernizationReadiness(invalidProfile, { providerRequired: true }, { status: "succeeded" });
assert.equal(invalidReady.ready, false);
assert.match(invalidReady.errors.join(" "), /target language and layout/i);

const scopeRequest = contract.normalizeModernizationRequest({
	projectPath: "C:/projects/legacy-shop",
	targetRuntime: "lucee-modern",
	provider: "ollama",
	scopePaths: "weboffice/_scheduledScripts\nweboffice/bridgeway_BLCcategory2/\n\nweboffice/_scheduledScripts"
});
assert.deepEqual(scopeRequest.input.scopePaths, [
	"weboffice/_scheduledScripts",
	"weboffice/bridgeway_BLCcategory2"
]);
assert.deepEqual(scopeRequest.modernization.scopePaths, scopeRequest.input.scopePaths);

console.log("modernization-contract.spec.mjs: ok");
