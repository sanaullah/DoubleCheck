---
name: coldbox-cli
description: "Use this skill when using the ColdBox CLI (CommandBox module) to scaffold applications, generate handlers, models, services, views, layouts, interceptors, modules, ORM artifacts, tests, or manage AI integration. Covers all `coldbox create` commands, language flags (BoxLang vs CFML), app skeleton selection, feature flags (--docker, --vite, --rest, --migrations, --ai), template token patterns, layout detection, and AI integration sub-commands."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# ColdBox CLI Skill

## When to Use This Skill

Use this skill when:

- Creating a new ColdBox application from a skeleton
- Scaffolding any ColdBox artifact: handler, model, service, view, layout, interceptor, module
- Generating ORM entities, services, or CRUD scaffolding
- Generating test specs (BDD or xUnit, unit or integration)
- Running the interactive `app-wizard` for guided project creation
- Managing AI integration (installing guidelines, skills, agents, MCP servers)
- Choosing between BoxLang (default) and CFML output

---

## Language Mode Reference

Examples use **BoxLang (`.bx`)** syntax by default. Adapt for your target language:

| Concept | BoxLang (`.bx`) | CFML (`.cfc`) |
|---------|-----------------|---------------|
| Class declaration | `class [extends="..."] {` | `component [extends="..."] {` |
| DI annotation | `@inject` above `property name="svc";` | `property name="svc" inject="svc";` |
| View templates | `.bxm` suffix | `.cfm` / `.cfml` suffix |
| Tag prefix | `<bx:if>`, `<bx:output>`, `<bx:set>` | `<cfif>`, `<cfoutput>`, `<cfset>` |

> **CFML Compat Mode**: With BoxLang + CFML Compat module, `.bx` and `.cfc` files coexist freely. BoxLang-native classes use `class {}` (`.bx` files); CFML-compat classes use `component {}` (`.cfc` files).

## Command Quick Reference

All commands are prefixed with `coldbox`.

### `coldbox create` — Code Generation

| Command | Purpose |
|---------|---------|
| `coldbox create app` | Create a ColdBox application from a skeleton |
| `coldbox create app-wizard` | Interactive guided wizard for app creation |
| `coldbox create handler` | Generate an event handler (controller) |
| `coldbox create service` | Generate a service model |
| `coldbox create model` | Generate a model object |
| `coldbox create view` | Generate a view template |
| `coldbox create layout` | Generate a layout template |
| `coldbox create interceptor` | Generate an interceptor |
| `coldbox create module` | Generate a ColdBox module scaffold |
| `coldbox create resource` | RESTful resource scaffolding (handler + model + views + tests) |
| `coldbox create orm-entity` | Generate an ORM entity |
| `coldbox create orm-service` | Generate an ORM service layer |
| `coldbox create orm-crud` | Generate CRUD handler + views from an ORM entity |
| `coldbox create orm-virtual-service` | Generate a virtual entity service |
| `coldbox create orm-event-handler` | Generate an ORM event handler |
| `coldbox create integration-test` | Generate a ColdBox integration test spec |
| `coldbox create bdd` | Generate a BDD spec (delegates to TestBox CLI) |
| `coldbox create unit` | Generate a xUnit bundle (delegates to TestBox CLI) |
| `coldbox create apidocs` | Generate API documentation |

### `coldbox ai` — AI Integration

| Command | Purpose |
|---------|---------|
| `coldbox ai install` | Install AI integration (guidelines, skills, agents, MCP) into the app |
| `coldbox ai refresh` | Sync guidelines/skills from installed modules |
| `coldbox ai info` | Display AI integration status |
| `coldbox ai doctor` | Diagnose AI setup issues |
| `coldbox ai tree` | Visualize the `.ai/` resource structure |
| `coldbox ai stats` | Show context usage statistics |
| `coldbox ai guidelines list/add/remove` | Manage individual guidelines |
| `coldbox ai skills list/add/remove` | Manage individual skills |
| `coldbox ai agents list/add/remove` | Manage AI agent configuration files |
| `coldbox ai mcp list/add/remove` | Manage MCP server entries |

---

## Language Handling

### BoxLang is the Default

All `coldbox create` commands generate **BoxLang** (`.bx`) files by default. CFML (`.cfc`) output is opt-in.

### Auto-Detection Logic (`isBoxLangProject()`)

The CLI automatically detects the project language using:

1. Running server engine — `serverInfo.cfengine` contains `"boxlang"`
2. `box.json` ? `testbox.runner == "boxlang"`
3. `box.json` ? `language == "boxlang"`

If none of the above match and no flag is passed, **BoxLang is still the default** for new projects.

### Language Flags

| Flag | Effect |
|------|--------|
| `--boxlang` | Force BoxLang output (usually not needed; it's the default) |
| `--cfml` | Force CFML output — overrides auto-detection |

### Output File Extensions

| Language | Source Extensions | Template Extensions |
|----------|------------------|---------------------|
| BoxLang | `.bx` | `.bxm` (views/layouts) |
| CFML | `.cfc` | `.cfm` (views/layouts) |

### Component ? Class Conversion

When generating BoxLang files, the CLI transforms CFML `component` keyword to BoxLang `class` automatically. You never need to handle this manually.

---

## App Creation

### Skeletons

```bash
coldbox create app myApp                   # BoxLang (default)
coldbox create app myApp --cfml            # CFML Modern layout
coldbox create app myApp skeleton=rest     # REST API skeleton
```

| Skeleton Name | ForgeBox Slug | Best For |
|---------------|---------------|---------|
| `boxlang` *(default)* | `cbtemplate-boxlang` | New BoxLang apps |
| `modern` | `cbtemplate-modern` | CFML + BoxLang, `app/` layout |
| `flat` | `cbtemplate-flat` | CFML + BoxLang, flat layout |
| `rest` | `cbtemplate-rest` | REST APIs |
| `rest-hmvc` | `cbtemplate-rest-hmvc` | HMVC + REST |
| `supersimple` | `cbtemplate-supersimple` | Bare-bones prototype |
| `vite` | `cbtemplate-vite` | Frontend build (Vite) |

Any valid ForgeBox endpoint ID, Git URL, or HTTP URL can also be passed as `skeleton`:

```bash
coldbox create app skeleton=http://site.com/myTemplate.zip
coldbox create app skeleton=coldbox-templates/rest
```

### Feature Flags for App Creation

| Flag | What It Does | Compatible With |
|------|-------------|-----------------|
| `--migrations` | Runs `cfmigrations init` after app creation | All skeletons |
| `--docker` | Adds Docker files + `docker-compose.yml` | All skeletons |
| `--vite` | Sets up Vite frontend asset pipeline | `boxlang`, `modern` |
| `--rest` | Configures the app as a REST API | BoxLang apps |
| `--ai` | Installs AI integration (`.ai/` structure) | All skeletons |
| `--aiAgent` | Agents to configure (comma-separated: `claude,copilot,cursor`) | Requires `--ai` |

```bash
# Full-featured BoxLang REST API with all extras
coldbox create app myAPI \
  skeleton=rest \
  --migrations \
  --docker \
  --ai \
  --aiAgent=claude,copilot

# Modern CFML app with Docker
coldbox create app myApp --cfml --docker --migrations
```

### Interactive Wizard

Use the wizard for a guided experience that prompts for language, skeleton, features, AI setup, and more:

```bash
coldbox create app-wizard
```

---

## Code Generation Commands

### Handler

Generates an event handler (controller) with optional actions, views, and tests.

| Argument / Flag | Default | Description |
|-----------------|---------|-------------|
| `name` *(required)* | — | Handler name (e.g., `users`, `admin.Users`) |
| `actions` | `""` | Comma-separated list of actions to generate |
| `--views` | `false` | Generate view stubs for each action |
| `--rest` | `false` | Scaffold as a REST handler (extends `RestHandler`) |
| `--resource` | `false` | Scaffold standard REST resource actions |
| `--integrationTests` | `true` | Generate an integration test |
| `--force` | `false` | Overwrite existing files |
| `--open` | `false` | Open generated files after creation |

```bash
coldbox create handler users
coldbox create handler users actions=index,show,create,update,delete --views
coldbox create handler api/Users --rest
coldbox create handler photos --resource --integrationTests
```

---

### Model

Generates a model class with optional properties, accessors, persistence, migration, seeder, and handler.

| Argument / Flag | Default | Description |
|-----------------|---------|-------------|
| `name` *(required)* | — | Model name (e.g., `User`, `blog.Post`) |
| `properties` | `""` | Comma-separated properties. Add ORM type via colon: `firstName,age:numeric` |
| `--accessors` | `true` | Generate `property` accessors |
| `--persistence` | `false` | Make it an ORM entity |
| `--migration` | `false` | Generate a cfmigrations file |
| `--seeder` | `false` | Generate a mock data seeder |
| `--handler` | `false` | Generate a companion handler |
| `--rest` | `false` | Make the companion handler a REST handler |
| `--resource` | `false` | Make the companion handler a resource handler |
| `--all` | `false` | Shortcut for `--handler --migration --seeder` |
| `--tests` | `true` | Generate model unit tests |
| `--force` | `false` | Overwrite existing files |

```bash
coldbox create model User
coldbox create model User properties=firstName,lastName,email
coldbox create model Post properties=title,body,publishedDate:timestamp --accessors --persistence
coldbox create model Product properties=name,price:numeric,stock:integer --all
```

---

### Service

Generates a service model with optional methods and tests.

| Argument / Flag | Default | Description |
|-----------------|---------|-------------|
| `name` *(required)* | — | Service name (e.g., `UserService`) |
| `methods` | `""` | Comma-separated method stubs to generate |
| `--tests` | `true` | Generate a unit test spec |
| `--force` | `false` | Overwrite existing files |
| `--open` | `false` | Open generated files after creation |

```bash
coldbox create service UserService
coldbox create service OrderService methods=create,cancel,refund,getByUser --tests
```

---

### Resource

Full RESTful scaffolding: handler + model + views/API actions + optional tests, migration, and seeder.

Standard resource actions generated:

| HTTP Method | Route | Handler Action |
|-------------|-------|----------------|
| `GET` | `/photos` | `photos.index` |
| `GET` | `/photos/new` | `photos.new` |
| `POST` | `/photos` | `photos.create` |
| `GET` | `/photos/:id` | `photos.show` |
| `GET` | `/photos/:id/edit` | `photos.edit` |
| `POST/PUT/PATCH` | `/photos/:id` | `photos.update` |
| `DELETE` | `/photos/:id` | `photos.delete` |

API resources omit `new` and `edit` (HTML form) actions.

| Argument / Flag | Default | Description |
|-----------------|---------|-------------|
| `resource` *(required)* | — | Resource name, or comma-separated list |
| `handler` | resource name | Handler name override (only for single resource) |
| `singularName` | resource name | Singular model name |
| `parameterName` | `id` | Route parameter name |
| `--api` | `false` | Generate API (JSON) resource instead of HTML |
| `--model` | resource name | Companion model name |
| `--persistent` | `false` | Generate model as ORM entity |
| `--tests` | `true` | Generate integration and unit tests |
| `--migration` | `false` | Generate cfmigrations for the entity |
| `--seeder` | `false` | Generate a mock data seeder |
| `--force` | `false` | Overwrite existing files |

```bash
# Basic resource
coldbox create resource photos

# Multiple resources at once
coldbox create resource photos,users,categories

# API resource with tests and migration
coldbox create resource photos --api --tests --migration

# ORM-backed resource
coldbox create resource photos singularName=Photo --persistent --migration --seeder
```

---

### View

Generates a view template.

```bash
coldbox create view users/index
coldbox create view users/show --helper  # also creates view helper
coldbox create view home --cfml          # force CFML .cfm extension
```

| Flag | Default | Description |
|------|---------|-------------|
| `--helper` | `false` | Generate a companion view helper file |
| `--content` | `""` | Pre-populate with initial content |
| `--force` | `false` | Overwrite existing files |

---

### Layout

Generates a layout template.

```bash
coldbox create layout default
coldbox create layout admin --helper
```

| Flag | Default | Description |
|------|---------|-------------|
| `--helper` | `false` | Generate a companion layout helper |
| `--content` | `""` | Pre-populate with initial content |
| `--force` | `false` | Overwrite existing files |

---

### Interceptor

Generates an interceptor with optional interception points and tests.

| Argument / Flag | Default | Description |
|-----------------|---------|-------------|
| `name` *(required)* | — | Interceptor name (e.g., `SecurityInterceptor`) |
| `points` | `""` | Comma-separated interception points to implement |
| `--tests` | `true` | Generate a unit test spec |
| `--force` | `false` | Overwrite existing files |
| `--open` | `false` | Open files after creation |

```bash
coldbox create interceptor SecurityInterceptor
coldbox create interceptor AuditInterceptor points=preProcess,postProcess --tests
coldbox create interceptor SessionInterceptor points=afterAspectsLoad,preEvent
```

---

### Module

Generates a full ColdBox module scaffold.

| Argument / Flag | Default | Description |
|-----------------|---------|-------------|
| `name` *(required)* | — | Module name (slug) |
| `author` | `""` | Author name for `ModuleConfig` |
| `description` | `""` | Module description |
| `version` | `1.0.0` | Module version |
| `cfmapping` | module name | ColdFusion mapping alias |
| `--ai` | `false` | Include AI best practices |
| `--force` | `false` | Overwrite existing files |

```bash
coldbox create module myModule author="Jane Doe" description="My custom module"
coldbox create module payments version=2.0.0 --ai
```

---

## ORM Commands

### ORM Entity

Generates an ORM-mapped entity class.

| Argument / Flag | Default | Description |
|-----------------|---------|-------------|
| `name` *(required)* | — | Entity name |
| `table` | entity name (pluralized) | Database table name |
| `--activeEntity` | `false` | Extend `cborm.models.ActiveEntity` |
| `primaryKey` | `id` | Primary key property name |
| `primaryKeyColumn` | primary key value | Column name if different |
| `generator` | `native` | ORM key generator (`increment`, `identity`, `uuid`, `guid`, `native`, etc.) |
| `properties` | `""` | Comma-separated properties with optional ORM type: `name,age:numeric` |
| `--tests` | `true` | Generate unit tests |
| `--handler` | `false` | Generate a companion handler |
| `--rest` | `false` | Make the companion handler a REST handler |
| `--resource` | `false` | Make the companion handler a resource handler |
| `--all` | `false` | Shortcut for handler + tests |
| `--force` | `false` | Overwrite existing files |

```bash
coldbox create orm-entity User
coldbox create orm-entity Post table=blog_posts properties=title,body,publishedAt:timestamp
coldbox create orm-entity Product --activeEntity properties=name,price:numeric --all
```

---

### ORM Service

Generates an ORM service extending `cborm.models.VirtualEntityService`.

| Argument / Flag | Default | Description |
|-----------------|---------|-------------|
| `name` *(required)* | — | Entity name the service will manage |
| `--queryCaching` | `false` | Enable Hibernate query caching |
| `--eventHandling` | `true` | Enable ORM event handling |
| `cacheRegion` | entity name | Cache region name |
| `--tests` | `true` | Generate unit tests |
| `--force` | `false` | Overwrite existing files |

```bash
coldbox create orm-service User
coldbox create orm-service Post --queryCaching --eventHandling cacheRegion=postCache
```

---

### ORM CRUD

Generates a handler + views for full CRUD based on an existing ORM entity.

```bash
coldbox create orm-crud User
coldbox create orm-crud Product pluralName=Products --tests
```

---

### ORM Virtual Service

Generates a virtual entity service (no concrete class needed).

```bash
coldbox create orm-virtual-service User
coldbox create orm-virtual-service Post --queryCaching
```

---

### ORM Event Handler

Generates an ORM event handler for Hibernate lifecycle events.

```bash
coldbox create orm-event-handler
```

---

## Testing Commands

### Integration Test

Generates a ColdBox integration test spec.

| Argument / Flag | Default | Description |
|-----------------|---------|-------------|
| `name` *(required)* | — | Handler name to generate tests for |
| `actions` | `""` | Comma-separated actions to generate test cases for |
| `--bdd` | `true` | Generate as BDD spec (default) |
| `--xunit` | `false` | Generate as xUnit test case |
| `--force` | `false` | Overwrite existing files |
| `--open` | `false` | Open files after creation |

```bash
coldbox create integration-test users
coldbox create integration-test users actions=index,show,create
coldbox create integration-test users --xunit
```

---

### BDD Spec

Generates a TestBox BDD spec (delegates to `testbox-cli`).

```bash
coldbox create bdd UserSpec
```

---

### Unit Test

Generates a TestBox xUnit bundle (delegates to `testbox-cli`).

```bash
coldbox create unit UserTest
```

---

## AI Integration

### Install AI Integration

Installs AI context files into the application's `.ai/` directory.

```bash
# Default: BoxLang project, Claude agent
coldbox ai install

# Multiple agents
coldbox ai install --aiAgent=claude,copilot,cursor

# CFML project
coldbox ai install --cfml

# Force re-install
coldbox ai install --force
```

Installed structure:

```
.ai/
??? guidelines/          # Framework docs (boxlang, coldbox, cborm, cbAuth, etc.)
??? skills/              # On-demand implementation cookbooks
??? manifest.json        # Tracks what is installed (version, agents, guidelines, skills, MCP)
CLAUDE.md                # (if --aiAgent=claude)
.github/copilot-instructions.md  # (if --aiAgent=copilot)
.cursorrules             # (if --aiAgent=cursor)
AGENTS.md                # (if --aiAgent=codex or opencode)
GEMINI.md                # (if --aiAgent=gemini)
```

Supported agents: `claude`, `copilot`, `cursor`, `codex`, `gemini`, `opencode`

---

### Refresh AI Integration

Syncs guidelines and skills from newly installed CommandBox modules:

```bash
coldbox ai refresh
```

---

### Diagnostics

```bash
coldbox ai info      # Show current guidelines, skills, agents, and MCP servers
coldbox ai doctor    # Diagnose configuration issues
coldbox ai tree      # Tree view of .ai/ directory
coldbox ai stats     # AI context character/token usage stats
```

---

### Guideline Sub-Commands

```bash
coldbox ai guidelines list
coldbox ai guidelines add cborm
coldbox ai guidelines remove cborm
```

Core guidelines available: `boxlang`, `cfml`, `coldbox`
Module guidelines (40+): `bcrypt`, `cbauth`, `cborm`, `testbox`, `wirebox`, and many more

---

### Skill Sub-Commands

```bash
coldbox ai skills list
coldbox ai skills add handler-development
coldbox ai skills remove handler-development
```

Over 71 skills are available, covering BoxLang core, ColdBox framework, ORM, security, testing, and modules.

---

### MCP Server Sub-Commands

```bash
coldbox ai mcp list
coldbox ai mcp add coldbox
coldbox ai mcp remove coldbox
```

Over 30 Ortus MCP documentation servers available (ColdBox, TestBox, WireBox, CacheBox, LogBox, QB, Quick, CBSecurity, and more).

---

## Template Tokens Reference

All code templates use `|TOKEN|` markers that are replaced with generated values. You typically do not interact with templates directly, but knowing the tokens helps you understand what the CLI configures.

| Token | Replaced With |
|-------|--------------|
| `\|handlerName\|` | Handler class name |
| `\|modelName\|` | Model / entity class name |
| `\|entity\|` | Singular entity name |
| `\|entityPlural\|` | Plural entity name |
| `\|Description\|` | Hint/description string |
| `\|modelDescription\|` | Model-level description |
| `\|properties\|` | Generated property declarations |
| `\|methods\|` | Generated method stubs |
| `\|initContent\|` | Constructor body |
| `\|EventActions\|` | Expanded action function stubs |
| `\|interceptionPoints\|` | Declared interception point list |
| `\|interceptionPoint\|` | Single interception point name |
| `\|pk\|` | Primary key name |
| `\|appMapping\|` | Application mapping string |
| `\|accessors\|` | `accessors="true"` or `""` |
| `\|Name\|` | Generic name (interceptor, module) |
| `\|action\|` | Single action name |
| `\|hint\|` | Single action hint |

---

## Layout Detection

The CLI automatically detects whether the project uses a **modern** or **flat** directory layout and adjusts all generated paths.

| Layout | Indicator | Prefix Used |
|--------|-----------|-------------|
| Modern | `app/handlers/` directory exists | `app/` |
| Flat | No `app/` directory | `""` (root) |

```
Modern layout:          Flat layout:
app/                    handlers/
  handlers/             models/
  models/               views/
  views/                tests/specs/
tests/specs/
```

You never need to configure this — detection is automatic.

---

## Common Workflows

### New BoxLang REST API from Scratch

```bash
# 1. Create the app
coldbox create app myAPI skeleton=rest --migrations --docker --ai --aiAgent=copilot

# 2. Create a resource endpoint
coldbox create resource products --api --tests --migration

# 3. Create a service layer
coldbox create service ProductService methods=list,findById,create,update,delete

# 4. Create an authentication interceptor
coldbox create interceptor JWTInterceptor points=preProcess --tests
```

---

### New CFML App with Full CRUD

```bash
# 1. Create the app
coldbox create app myApp --cfml --migrations

# 2. Scaffold a full ORM-backed resource
coldbox create resource blog/posts \
  singularName=Post \
  --persistent \
  --tests \
  --migration \
  --seeder

# 3. Generate integration tests for the posts handler
coldbox create integration-test blog/Posts actions=index,show,create,update,delete
```

---

### Add AI Integration to an Existing App

```bash
# From your app root
coldbox ai install --aiAgent=claude,copilot

# After installing new CommandBox modules (e.g., cbsecurity):
coldbox ai refresh

# Check what was installed
coldbox ai info
coldbox ai stats
```

---

### Scaffold a ColdBox Module

```bash
# Create the module
coldbox create module payments author="Acme Corp" description="Payment integrations" version=1.0.0

# Add a handler inside the module
cd modules/payments
coldbox create handler Checkout actions=index,process,confirm --views

# Add a service
coldbox create service PaymentGatewayService methods=charge,refund,void
```

---

## Tips & Best Practices

- **Always run commands from the application root** — the CLI uses the current directory to locate `handlers/`, `models/`, `views/`, and `tests/` correctly.
- **Use `--force` carefully** — it silently overwrites existing files. Omit it to get a confirmation prompt.
- **Use `--open`** to immediately open newly created files in your editor.
- **Combine `--all` on model/resource** — `coldbox create model User --all` is the fastest way to get a handler + migration + seeder in one command.
- **`coldbox create resource` is the quickest path to a full CRUD feature** — it scaffolds handler, model, views/API actions, tests, migration, and seeder in one step.
- **Use `app-wizard` for new projects** — it guides you through language, skeleton, feature selection, and AI setup interactively.
- **Refresh AI integration** after installing new CommandBox modules (`coldbox ai refresh`) to pick up module-specific guidelines and skills automatically.
- **Semicolons are not needed** in generated code (BoxLang optional; CFML convention followed by the templates) except on property declarations: `property name="foo" type="string";`