# `app/models` guide

This folder contains DoubleCheck's domain objects, SQLite repositories, and
application services. HTTP handlers should stay thin: they validate the
request boundary, authorize the operation, and delegate the actual work to
these classes.

The model layer is local-first. Review data is stored in the configured SQLite
database, source analysis runs on the user's machine, and AI calls are
optional. The model layer does not implement accounts, hosted retention, or
multi-tenant SaaS behavior.

## The two main flows

```text
ReviewRunService.create()
  -> RepositoryScannerService.scan()
  -> ArchitectureIndexService.index()
       -> BoxLangParserService / CfmlParserService
       -> AnalysisGraphRepository
  -> ArchitectureModelService.build()
       -> ArchitectureRepository
  -> ReviewPlannerService.plan()
       -> ContextPackService / ContextPackRenderer
  -> FindingService.deterministic()
  -> SpecialistReviewService.review()       (optional AI depth)
       -> ControlledRepositoryToolService
       -> SpecialistAgentGateway -> AIChatGateway
  -> ReviewResultRepository / ReviewEventService
```

```text
ReviewRunService.executeRun() [runKind = modernize]
  -> ModernizationRunService.execute()
       -> ModernizationEvidenceDiscoveryService
       -> ModernizationSchemaPackService
       -> ModernizationInventoryService
       -> ModernizationSignalService
       -> ModernizationContextPackService
       -> ModernizationProposalService [optional AI]
       -> ModernizationPlacementService.canonicalize()
       -> ModernizationGateService.evaluatePlan()
       -> ModernizationValidationService
       -> ModernizationRepository
```

The Review path produces evidence-backed findings. The Modernize path produces
a validated proposal and never edits the analyzed repository or executes DDL.

## Conventions

### Domain objects

Classes in `domain/` are accessors-enabled mementos. `init()` copies only known
properties from input, and `getMemento()` returns the stable struct shape used by
handlers, repositories, and the UI. They do not query the database or perform
business decisions.

Most stay small. **Derived structural types may be large but must remain
computation-free** — `CouplingGraph` holds thousands of edges, and that is fine;
what it must never do is compute them. The service computes and owns the
invariant, the type holds the result and answers questions over data it already
has. Answering `fanIn( filePath )` from a metrics struct is a lookup, not a
business decision; running the graph traversal that produced it would be.

This split is what makes "one owner per invariant" enforceable, and it exists
because target-path derivation once had two owners — the proposal service derived
a path and placement canonicalization independently rewrote it.

### Repositories

Classes in `repositories/` are singleton SQLite adapters. They use the injected
`coldbox:setting:datasource`, bind values through `queryExecute()`, and hydrate
rows into domain objects or plain structs. Repositories own persistence shape;
services own validation, authorization, orchestration, and policy.

### Services

Classes in `services/` are singleton business services. Public methods are the
stable collaboration points used by handlers and neighboring services. Private
helpers normalize input, bound output, build SQL payloads, or implement the
deterministic rules behind those public methods.

### Data safety boundaries

- `SchemaService` is the single source of truth for the main SQLite schema.
- `SecurityContextService` resolves the local project identity and rejects
  missing or non-directory project paths before analysis starts.
- `ControlledRepositoryToolService` exposes only allowlisted read operations to
  specialist agents.
- `SecretRedactionService` removes credential-like values before evidence is
  persisted, exported, or sent to an AI provider.
- `ModernizationSchemaPackService` treats schema text as untrusted evidence;
  it sanitizes it and removes row-bearing DML rather than executing it.

## Domain objects

| File | Responsibility | Public API |
| --- | --- | --- |
| [AgentResult.bx](domain/AgentResult.bx) | Memento for one specialist task result, including status, findings, tool audit, provenance, and timing. | `init`, `getMemento` |
| [ArchitectureModel.bx](domain/ArchitectureModel.bx) | Memento for deterministic architecture facts plus optional enrichment and fingerprints. | `init`, `getMemento` |
| [Cluster.bx](domain/Cluster.bx) | One derived cluster: candidate boundary, its units and files, and the evidence for or against separating it. Computation-free. | `init`, `getMemento`, `contains`, `isSeparable`, `boundaryEvidence`, `couplingCount`, `size` |
| [CouplingGraph.bx](domain/CouplingGraph.bx) | Derived coupling structure for Modernize: file nodes, typed and provenance-weighted edges, fan-in/out, cycles, shared-state overlay, co-access matrix. Large but computation-free; `ModernizationCouplingGraphService` owns the computation. | `init`, `getMemento`, `fanIn`, `fanOut`, `hasEdge`, `edgesCrossing`, `truncated`, `cycleMembersFor`, `coAccessPeers` |
| [ModernizationPlan.bx](domain/ModernizationPlan.bx) | Versioned validated Modernize artifact containing inventory, schema evidence, signals, target units, links, and roadmap data. | `init`, `getMemento` |
| [WaveOrder.bx](domain/WaveOrder.bx) | Migration order derived from the cluster dependency DAG. Wave is longest-path depth; cluster-level cycles are carried rather than hidden. Computation-free. | `init`, `getMemento`, `wave`, `blocks`, `clustersInWave`, `criticalPath`, `inCycle` |
| [ReviewPlan.bx](domain/ReviewPlan.bx) | Immutable bounded specialist plan: tasks, roles, context ranges, budgets, and coverage. | `init`, `getMemento` |
| [ReviewRun.bx](domain/ReviewRun.bx) | Review lifecycle memento for status, phase, progress, policy, budgets, leases, and project identity. | `init`, `getMemento` |

## Repositories

| File | Responsibility | Public API |
| --- | --- | --- |
| [AIProviderProfileRepository.bx](repositories/AIProviderProfileRepository.bx) | Stores user-managed provider profiles and the active-profile flag. | `list`, `countForTenant`, `get`, `getActive`, `create`, `update`, `delete`, `setActive` |
| [AnalysisGraphRepository.bx](repositories/AnalysisGraphRepository.bx) | Stores content-addressed parser caches and per-run symbols, dependencies, and graph lookup results. | `findCached`, `saveCached`, `replaceRunGraph`, `findBaselineGraph`, `getGraph` |
| [AppSettingsRepository.bx](repositories/AppSettingsRepository.bx) | Persists flat setting overrides by local tenant/project scope. | `getAll`, `set`, `setMany` |
| [ArchitectureRepository.bx](repositories/ArchitectureRepository.bx) | Persists architecture snapshots, plans, diffs, baselines, and reusable architecture caches. | `save`, `get`, `findReusable`, `saveReusable`, `findBaseline` |
| [FindingReviewRepository.bx](repositories/FindingReviewRepository.bx) | Stores fingerprint-level finding decisions and append-only review transitions. | `listForProject`, `setState` |
| [ModernizationRepository.bx](repositories/ModernizationRepository.bx) | Stores sanitized schema packs, checkpoints, plans, human decisions, and decision events. | `saveSchemaPack`, `getSchemaPack`, `saveCheckpoint`, `getCheckpoints`, `savePlan`, `getPlan`, `upsertDecision`, `findDecision`, `deleteDecision`, `listDecisions`, `appendDecisionEvent`, `listDecisionEvents` |
| [ReviewEventRepository.bx](repositories/ReviewEventRepository.bx) | Appends and replays the ordered run-event stream used by SSE and observability. | `append`, `after` |
| [ReviewResultRepository.bx](repositories/ReviewResultRepository.bx) | Replaces run artifacts/findings, saves summaries, and assembles a result snapshot. | `replaceArtifacts`, `replaceFindings`, `saveSummary`, `getResult` |
| [ReviewRunRepository.bx](repositories/ReviewRunRepository.bx) | Persists run creation, worker claims, leases, cancellation, state transitions, listing, and baselines. | `create`, `find`, `delete`, `findScoped`, `claim`, `recoverableIds`, `renewLease`, `ownsLease`, `setErrorReference`, `list`, `listScoped`, `updateState`, `isCancellationRequested`, `findPriorEligibleBaseline`, `findLatestForProject` |
| [SpecialistResultRepository.bx](repositories/SpecialistResultRepository.bx) | Replaces or upserts per-task specialist results and reads them by run. | `replace`, `upsert`, `get` |

## Services

### Review pipeline and analysis

| File | Responsibility | Public API |
| --- | --- | --- |
| [ReviewRunService.bx](services/ReviewRunService.bx) | Coordinates run creation, queueing, leases, phase execution, cancellation, result assembly, reruns, follow-ups, and Modernize continuation. | `create`, `rerunScoped`, `followUpScoped`, `continueModernizeScoped`, `recoverPendingRuns`, `get`, `getScoped`, `getResult`, `getResultScoped`, `list`, `listScoped`, `cancel`, `cancelScoped`, `isTerminal` |
| [RepositoryScannerService.bx](services/RepositoryScannerService.bx) | Discovers bounded source files for working-tree, revision-diff, or full scans and reads file metadata/content. | `scan`, `listSourceFiles`, `prioritizeCandidatePaths` |
| [GitRepositoryService.bx](services/GitRepositoryService.bx) | Provides read-only Git inspection, file lists, blobs, and changed line ranges. | `inspect`, `workingTreePaths`, `fullPaths`, `revisionPaths`, `readBlob`, `changedLineRanges` |
| [ReviewPolicyService.bx](services/ReviewPolicyService.bx) | Validates the create payload, allowlisted roles, budgets, and stable policy fingerprint. | `normalize` |
| [ReviewPlannerService.bx](services/ReviewPlannerService.bx) | Builds a bounded immutable specialist plan from architecture and context evidence. | `plan` |
| [ContextPackService.bx](services/ContextPackService.bx) | Selects authorized file/line ranges within file and character budgets. | `build` |
| [ContextPackRenderer.bx](services/ContextPackRenderer.bx) | Validates, ranks, redacts, and renders complete evidence lines for chat-only providers. | `render` |
| [FindingService.bx](services/FindingService.bx) | Runs deterministic rules, normalizes AI findings, fingerprints findings, and removes duplicates. | `deterministic`, `normalizeAI`, `deduplicate` |
| [FindingSolutionService.bx](services/FindingSolutionService.bx) | Attaches rule playbooks and accepts only evidence-matched, confidence-gated fix patches. | `enrich`, `enrichAll`, `serializeSolution`, `deserializeSolution` |
| [FindingBaselineService.bx](services/FindingBaselineService.bx) | Computes new/unchanged/fixed labels against the prior eligible run without writing derived state. | `classify`, `applyToResult` |
| [FindingReviewService.bx](services/FindingReviewService.bx) | Applies project-scoped finding review decisions and overlays their history on results. | `update`, `applyToResult`, `reopenResolvedForRun` |
| [ReviewEventService.bx](services/ReviewEventService.bx) | Publishes ordered run events and coalesces noisy specialist progress before SSE replay. | `publish`, `after`, `publishCoalesced` |
| [ReviewHistoryService.bx](services/ReviewHistoryService.bx) | Reads historical run summaries and compares fingerprints; it does not persist derived history. | `listScoped`, `compareScoped` |
| [CoverageAssessmentService.bx](services/CoverageAssessmentService.bx) | Calculates explicit specialist task coverage and remaining review gaps. | `assess` |
| [ObservabilityTraceService.bx](services/ObservabilityTraceService.bx) | Projects persisted run events into local Langfuse-inspired trace artifacts. | `exportTraces` |
| [ReportExportService.bx](services/ReportExportService.bx) | Exports review results as JSON, Markdown, or SARIF. | `export`, `supportedFormats`, `toJson`, `toMarkdown`, `toSarif` |
| [QualityGateService.bx](services/QualityGateService.bx) | Runs seeded evaluation gates and reports configured quality status. | `runSeededGate`, `status`, `advertisedLanguages` |
| [EvaluationService.bx](services/EvaluationService.bx) | Loads an evaluation corpus, executes review cases, and checks citation/threshold metrics. | `loadCorpus`, `evaluate` |

### Architecture and parsers

| File | Responsibility | Public API |
| --- | --- | --- |
| [ArchitectureIndexService.bx](services/ArchitectureIndexService.bx) | Builds a content-addressed graph for a run and dispatches supported files to the matching parser. | `index`, `buildImpactCone` |
| [BoxLangParserService.bx](services/BoxLangParserService.bx) | Extracts BoxLang symbols, calls, dependencies, and impact edges. | `getVersion`, `supports`, `parse` |
| [CfmlParserService.bx](services/CfmlParserService.bx) | Extracts CFML symbols, calls, dependencies, and impact edges under the same parser contract. | `getVersion`, `supports`, `parse` |
| [ArchitectureModelService.bx](services/ArchitectureModelService.bx) | Derives bounded deterministic architecture facts from graph data and scanned files. | `build` |
| [ArchitectureEnrichmentService.bx](services/ArchitectureEnrichmentService.bx) | Optionally enriches deterministic facts with cited AI observations and caches safe results. | `isEnabled`, `cacheKey`, `enrich` |
| [ArchitectureDiffService.bx](services/ArchitectureDiffService.bx) | Compares current architecture facts with a baseline using stable set differences. | `compare` |

### AI providers and specialist execution

| File | Responsibility | Public API |
| --- | --- | --- |
| [AIChatGateway.bx](services/AIChatGateway.bx) | Small provider-neutral wrapper around `aiChat()` with enablement checks. | `isEnabled`, `chat` |
| [AiProviderInferenceService.bx](services/AiProviderInferenceService.bx) | Classifies local provider/base-URL combinations so local and hosted behavior use the same policy. | `isLocal` |
| [AIProviderProfileService.bx](services/AIProviderProfileService.bx) | Validates and manages provider-profile CRUD, activation, and connection smoke tests. | `list`, `get`, `create`, `update`, `delete`, `activate`, `smokeTest` |
| [AIProviderResolverService.bx](services/AIProviderResolverService.bx) | Resolves the active or requested profile fresh from SQLite, falling back to environment settings. | `resolve` |
| [AIReviewService.bx](services/AIReviewService.bx) | Provides the bounded bulk-review fallback when specialist agents are not enabled. | `isEnabled`, `review`, `smokeTest` |
| [CrewPlannerService.bx](services/CrewPlannerService.bx) | Optionally proposes a small set of catalog roles and change-specific briefs. | `isEnabled`, `propose`, `validateAndClamp` |
| [PromptRegistry.bx](services/PromptRegistry.bx) | Local versioned source of truth for prompt contracts, policies, schemas, and provider capability profiles. | `manifest`, `contract`, `previousContract`, `lifecycle`, `activeVersion`, `previousVersion`, `schema`, `policy`, `evals`, `authoringMetaPrompt`, `capabilities`, `listContracts`, `listSchemas`, `clearCache` |
| [PromptCompiler.bx](services/PromptCompiler.bx) | Compiles registry contracts into provider-neutral prompt packages; dynamic task/evidence stays user-side. | `compile`, `compileRepair`, `fitPackage`, `capabilities`, `structuredOutput`, `lint`, `lintPackage` |
| [PromptOutputValidator.bx](services/PromptOutputValidator.bx) | Provider-independent structural and evidence validation for prompt-contract JSON outputs. | `validate`, `validateStructure`, `sanitize`, `sanitizeValid`, `assertValid`, `assertStructureValid` |
| [PromptAuthoringService.bx](services/PromptAuthoringService.bx) | Builds offline prompt-authoring requests; never calls a provider or changes the active runtime contract. | `build`, `validateProposal` |
| [PromptEvaluationService.bx](services/PromptEvaluationService.bx) | Deterministic local evaluation harness for versioned prompt contracts; never contacts a provider. | `lintAll`, `evaluate` |
| [SpecialistAgentFactory.bx](services/SpecialistAgentFactory.bx) | Builds versioned allowlisted role definitions, instructions, and output contracts. | `definition`, `input` |
| [SpecialistAgentGateway.bx](services/SpecialistAgentGateway.bx) | Executes one specialist through agent tools or embedded-context chat with retries and circuit breaking. | `isEnabled`, `run`, `runAsyncRetry`, `unwrapAsyncError`, `getProviderKey`, `circuitStatus`, `resetCircuit`, `contextPackCharacterBudget` |
| [SpecialistReviewService.bx](services/SpecialistReviewService.bx) | Runs planned specialist tasks within concurrency/budget bounds and validates their findings. | `isEnabled`, `review`, `cancelRun` |
| [ControlledRepositoryToolService.bx](services/ControlledRepositoryToolService.bx) | Creates read-only allowlisted tool sessions, authenticates ranges, redacts output, and records tool audit. | `createSession`, `buildAITools`, `execute`, `audit`, `recordContextPack`, `cancel` |

### Modernize workflow

| File | Responsibility | Public API |
| --- | --- | --- |
| [ModernizationAgentFactory.bx](services/ModernizationAgentFactory.bx) | Creates role-specific, versioned prompts and output schemas for Modernize agents. | `build`, `version` |
| [ModernizationAgentGateway.bx](services/ModernizationAgentGateway.bx) | Executes bounded JSON-only Modernize calls, injecting allowlisted skills and redacting responses. | `isEnabled`, `buildSkillTools`, `run`, `cancelRun` |
| [ModernizationContextPackService.bx](services/ModernizationContextPackService.bx) | Partitions bounded evidence along candidate seams instead of copying the repository wholesale. | `build` |
| [ModernizationCoverageService.bx](services/ModernizationCoverageService.bx) | Computes repository, inventory, schema, context, LLM, and roadmap coverage. | `assess`, `enrichRoadCoverage` |
| [ModernizationDecisionService.bx](services/ModernizationDecisionService.bx) | Applies stale-safe human decisions to plan items and clears invalidated decisions. | `refreshState`, `clearStaleDecisions`, `decide`, `clear` |
| [ModernizationDiffService.bx](services/ModernizationDiffService.bx) | Compares Modernize plans, tracks added/removed items, carries decisions, and reports coverage movement. | `compare` |
| [ModernizationEvidenceDiscoveryService.bx](services/ModernizationEvidenceDiscoveryService.bx) | Finds a small allowlisted set of configuration and migration evidence for Modernize only. | `discover` |
| [ModernizationExportService.bx](services/ModernizationExportService.bx) | Renders persisted Modernize artifacts as JSON, Markdown, or validation-oriented SARIF. | `export`, `supportedFormats`, `toJson`, `toMarkdown`, `toSarif` |
| [ModernizationGateService.bx](services/ModernizationGateService.bx) | Applies deterministic, conservative placement gates; ownership/ops need remain unknown until plan or human input supplies them. | `evaluatePlan`, `evaluatePlacement` |
| [ModernizationIdentityService.bx](services/ModernizationIdentityService.bx) | Creates deterministic opaque IDs and fingerprints without putting source text in identifiers. **Sole owner of the fingerprint volatile-key list.** | `itemId`, `itemFingerprint`, `volatileKeys`, `withoutVolatileKeys` |
| [ModernizationCouplingGraphService.bx](services/ModernizationCouplingGraphService.bx) | Computes the deterministic coupling graph from inventory dependencies: typed provenance-weighted file edges, fan-in/out, cycles, shared-state overlay, table co-access, outbound integration. No provider. | `build`, `cohesion`, `graphVersion` |
| [ModernizationDerivedStructureService.bx](services/ModernizationDerivedStructureService.bx) | Derives clusters (weighted modularity over coupling evidence), boundary verdicts and migration wave order; also owns the synthesized architecture/roadmap fallbacks moved out of the proposal service. No provider. | `deriveClusters`, `deriveWaveOrder`, `applySynthesizedArchitecture`, `applySynthesizedRoadmap`, `synthesizeGroupedPhases`, `synthesisRoadmapGroups`, `leftoverRoadmapGroups`, `synthesizeRoadmapClassification`, `architectureDecisionsMissing`, `normalizeArchitecturePlacementTypes` |
| [ModernizationInventoryService.bx](services/ModernizationInventoryService.bx) | Builds conservative evidence-linked CFML inventory records; it is not a full AST. | `build` |
| [ModernizationPlacementService.bx](services/ModernizationPlacementService.bx) | Canonicalizes Modernize v2 placements, adapts persisted plans for read, and projects legacy contexts/extracts. | `planVersion`, `placementVersion`, `canonicalize`, `adaptForRead`, `getPlacements`, `refreshFingerprints` |
| [ModernizationPolicyService.bx](services/ModernizationPolicyService.bx) | Validates immutable Modernize input, applies limits, and gates provider-dependent work. | `normalize`, `preflight`, `isProviderEnabled`, `ensureProviderEnabled` |
| [ModernizationProposalService.bx](services/ModernizationProposalService.bx) | Runs bounded application/database/architecture/roadmap roles, shards large inputs, and merges validated fragments. | `propose`, `cancelRun`, `repair` |
| [ModernizationRiskService.bx](services/ModernizationRiskService.bx) | Adds a read-time deterministic risk overlay from existing Review findings. | `enrich` |
| [ModernizationRunService.bx](services/ModernizationRunService.bx) | Owns the Modernize evidence/proposal artifact lifecycle after shared run scanning. | `execute`, `getResult`, `cancelRun`, `checkpointStatusForPayload` |
| [ModernizationSchemaPackService.bx](services/ModernizationSchemaPackService.bx) | Ingests, sanitizes, parses, and discovers schema evidence without executing SQL or retaining row DML. | `ingest`, `sanitize`, `parse`, `discover` |
| [ModernizationSignalService.bx](services/ModernizationSignalService.bx) | Derives deterministic modernization seams before any optional AI call. | `build` |
| [ModernizationSkillService.bx](services/ModernizationSkillService.bx) | Reads only allowlisted installed skill packs, never skill files from the analyzed project. | `listPack`, `readSkill`, `isAllowlisted`, `resolveSkillsRoot` |
| [ModernizationSliceRebuildService.bx](services/ModernizationSliceRebuildService.bx) | Rebuilds one roadmap phase or item from bounded evidence without widening its scope. | `assertEvidencePack`, `mergeFragment`, `rebuild`, `rebuildItem`, `buildEvidencePack` |
| [ModernizationValidationService.bx](services/ModernizationValidationService.bx) | Applies deterministic structure, evidence, syntax, and safety gates to a plan. | `validate` |

### Cross-cutting services

| File | Responsibility | Public API |
| --- | --- | --- |
| [AppSettingsService.bx](services/AppSettingsService.bx) | Reads fresh SQLite setting overrides and falls back to injected defaults; writes settings-panel changes. | `get`, `getAll`, `set`, `setMany` |
| [SchemaService.bx](services/SchemaService.bx) | Owns, applies, repairs, validates, reports, and deliberately rebuilds the complete main SQLite schema. | `getDatabaseStatus`, `ensureSchema`, `rebuildSchema` |
| [SecretRedactionService.bx](services/SecretRedactionService.bx) | Redacts credential-like text, structured values, and line collections. | `redactText`, `redactStructured`, `redactLine`, `redactLines` |
| [SecurityContextService.bx](services/SecurityContextService.bx) | Resolves the local identity/project and authorizes safe project paths and operations. | `authenticate`, `authorize`, `projectFor`, `authorizeProjectPath`, `projectsFor`, `defaultContext` |
| [SupportedLanguageService.bx](services/SupportedLanguageService.bx) | Canonical registry for BoxLang, CFML, and JavaScript review support. | `definitions`, `extensionMap` |
| [WorkerRegistryService.bx](services/WorkerRegistryService.bx) | Registers, heartbeats, lists, and stops workers participating in run leases. | `heartbeat`, `listActive`, `stop` |
| [RulePlaybookCatalog.bx](services/RulePlaybookCatalog.bx) | Provides static remediation guidance keyed by deterministic finding rule ID. | `get` |

## Where to start when changing behavior

| Change | Start here | Then inspect |
| --- | --- | --- |
| Run lifecycle, queueing, cancellation, or SSE | `ReviewRunService` | `ReviewRunRepository`, `ReviewEventService`, `WorkerRegistryService` |
| File selection or Git scope | `RepositoryScannerService` | `GitRepositoryService`, `SupportedLanguageService` |
| Architecture graph or parser behavior | `ArchitectureIndexService` | `BoxLangParserService`, `CfmlParserService`, `AnalysisGraphRepository` |
| Deterministic findings | `FindingService` | `FindingSolutionService`, `RulePlaybookCatalog` |
| Specialist prompts or tools | `SpecialistAgentFactory` | `SpecialistAgentGateway`, `ControlledRepositoryToolService`, `AIChatGateway` |
| Prompt contracts, schemas, or offline eval | `PromptRegistry` | `PromptCompiler`, `PromptOutputValidator`, `PromptEvaluationService`, `PromptAuthoringService` |
| Modernize inventory or proposal | `ModernizationRunService` | `ModernizationInventoryService`, `ModernizationProposalService`, `ModernizationValidationService` |
| Modernize placements or gates | `ModernizationPlacementService` | `ModernizationGateService`, `ModernizationRunService`, `ModernizationValidationService` |
| Modernize schema evidence | `ModernizationSchemaPackService` | `ModernizationRepository`, `ModernizationValidationService` |
| SQLite schema or cleanup | `SchemaService` | `runtime/boxlang.json`, repository SQL, SQLite status checks |
| Path safety or secret handling | `SecurityContextService` | `SecretRedactionService`, `ControlledRepositoryToolService` |

When adding a model class, open it with a short Javadoc-style purpose block,
document public methods whose side effects or failure behavior are not obvious,
and update this index with the file's responsibility and public API.
