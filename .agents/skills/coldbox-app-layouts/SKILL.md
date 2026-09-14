---
name: coldbox-app-layouts
description: "Use this skill when choosing a ColdBox application layout (flat, boxlang, or modern), scaffolding a new ColdBox project, understanding project directory structure, deciding between app structure options, or migrating from one layout to another. Use when asked about flat layout, boxlang template, modern template, app structure, project skeleton, or web root separation."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# App Layouts

## When to Use This Skill

Use this skill when:

- Creating a new ColdBox application from scratch and choosing a project structure
- Deciding between the `flat`, `boxlang`, and `modern` application templates
- Scaffolding via `box coldbox create app skeleton=<name>`
- Understanding directory conventions for an existing app
- Migrating from one layout to another

## Language & Engine Compatibility

| Layout | CFML (Adobe CF / Lucee) | BoxLang |
|--------|------------------------|---------|
| `flat` | Yes | Yes |
| `boxlang` | No | Yes only |
| `modern` | Yes | Yes |

> **Default**: The ColdBox CLI (`coldbox create app`) defaults to the `boxlang` skeleton. Pass `--cfml` or `skeleton=flat` / `skeleton=modern` to use another layout.

## Flat Layout

**Template repo**: <https://github.com/coldbox-templates/flat>

The flat layout places all application code directly in the web root. It is the traditional ColdBox structure and the widest-compatibility choice — works with Adobe ColdFusion, Lucee, and BoxLang.

### Flat: Directory Map

```
/
??? Application.cfc             # App bootstrap
??? index.cfm                   # Front controller
??? box.json                    # CommandBox package descriptor
??? server.json                 # Server configuration
??? pom.xml                     # Maven Java dependencies (optional)
?
??? config/
?   ??? ColdBox.cfc             # Framework settings
?   ??? Router.cfc              # URL routing
?   ??? WireBox.cfc             # DI bindings (optional)
?
??? handlers/                   # Event handlers (controllers)
??? models/                     # Services, beans, business logic
??? views/                      # View templates
??? layouts/                    # Layout wrappers
??? interceptors/               # Event interceptors
??? modules_app/                # Internal HMVC modules
?
??? includes/                   # Public assets (CSS, JS, images)
?   ??? css/
?   ??? js/
?   ??? images/
?
??? tests/
?   ??? Application.cfc
?   ??? runner.cfm
?   ??? specs/
?       ??? integration/
?       ??? unit/
?
??? lib/                        # Framework libraries (managed by CommandBox)
    ??? coldbox/
    ??? testbox/
```

### Flat: Best For

- Rapid prototyping and quick-start projects
- Learning ColdBox — the structure is immediately visible
- Traditional shared hosting environments
- Teams familiar with standard CFML application structures
- Internal tools that do not require strict code/web-root separation

### Flat: Caveats

- All application code (handlers, models, config) lives under the web root and is theoretically directly accessible
- Modules with UI assets require no special alias configuration since everything is in the same root
- Not recommended for security-critical production deployments without additional server-level restrictions

### Flat: Scaffold Command

```bash
box coldbox create app name=myApp skeleton=flat
```

---

## BoxLang Layout

**Template repo**: <https://github.com/coldbox-templates/boxlang>

The BoxLang layout is the default modern architecture for BoxLang-native applications. It uses the same `/app` + `/public` separation as the Modern layout but adds BoxLang-specific assets: `.bx` class files, a `runtime/` configuration directory, a `Build.bx` build script, Vite frontend tooling, and native BoxLang mappings pre-configured in `runtime/config/boxlang.json`.

### BoxLang: Directory Map

```
/
??? box.json                    # CommandBox package descriptor
??? server.json                 # CommandBox server config (webroot = public/)
??? pom.xml                     # Maven Java deps (optional)
??? Build.bx                    # BoxLang build + distribution script
?
??? app/                        # Application code (NOT web-accessible)
?   ??? config/
?   ?   ??? ColdBox.bx          # Framework settings
?   ?   ??? Router.bx           # URL routing
?   ?   ??? WireBox.bx          # DI bindings (optional)
?   ?   ??? CacheBox.bx         # Caching config (optional)
?   ?   ??? Scheduler.bx        # Task scheduling (optional)
?   ??? handlers/               # Event handlers
?   ??? helpers/                # Application helpers (optional)
?   ??? interceptors/           # Event interceptors
?   ??? layouts/                # View layouts
?   ??? logs/                   # App logs (optional)
?   ??? models/                 # Business logic
?   ??? modules/                # App-specific modules (optional)
?   ??? views/                  # View templates (.bxm)
?
??? public/                     # Web root (CommandBox points here)
?   ??? Application.bx          # Web-facing bootstrap
?   ??? index.bxm               # Front controller
?   ??? favicon.ico
?   ??? robots.txt
?   ??? includes/               # Static assets
?
??? lib/                        # Dependencies (managed by CommandBox)
?   ??? coldbox/
?   ??? testbox/
?   ??? modules/                # ColdBox modules
?   ??? java/                   # Java JARs (managed by Maven)
?
??? resources/                  # Non-web resources
?   ??? migrations/             # Database migrations (cbmigrations)
?   ??? docker/                 # Docker configuration (optional)
?   ??? seeders/                # Database seeders
?   ??? swagger/                # API docs (cbswagger)
?   ??? assets/                 # Vite source assets (if using Vite)
?       ??? css/
?       ??? js/
?
??? runtime/                    # BoxLang runtime overrides
?   ??? boxlang.json            # Custom BoxLang configuration
?   ??? global/
?   ?   ??? classes/
?   ?   ??? components/
?   ??? logs/
?
??? tests/
    ??? Application.bx
    ??? runner.cfm
    ??? specs/
        ??? integration/
```

### BoxLang: Best For

- BoxLang-native applications where you want idiomatic `.bx` classes throughout
- Projects using the BoxLang OS runtime for CLI/script use alongside web serving
- Applications leveraging Vite for modern frontend asset pipelines (Vue 3, Tailwind)
- Production BoxLang deployments with compiled bytecode distribution via `Build.bx`
- Teams fully committed to the BoxLang ecosystem

### BoxLang: Caveats

- BoxLang only — does not support Adobe ColdFusion or Lucee
- Requires BoxLang OS runtime (1.6+) in addition to CommandBox for the build script
- Module web UI assets require `server.json` aliases (same as Modern)
- Test components must include `appMapping="/app"`
- The `runtime/` directory is BoxLang-specific and does not exist in Flat or Modern

### BoxLang: Scaffold Command

```bash
# Default — this is what `box coldbox create app` uses
box coldbox create app name=myApp

# Explicit
box coldbox create app name=myApp skeleton=boxlang

# With optional features
box coldbox create app name=myApp skeleton=boxlang --vite --docker --migrations
```

### BoxLang: Testing Baseline

```boxlang
// tests/specs/integration/MainSpec.bx
class extends="coldbox.system.testing.BaseTestCase" appMapping="/app" {

    function beforeAll() {
        super.beforeAll()
    }

    function run(){
        describe( "Main Handler", function(){
            beforeEach( function( currentSpec ){
                setup()
            })

            it( "can render the homepage", function(){
                var event = this.get( "main.index" )
                expect( event.getRenderedContent() ).notToBeEmpty()
            })
        })
    }
}
```

---

## Modern Layout

**Template repo**: <https://github.com/coldbox-templates/modern>

The Modern layout implements a security-first architecture by separating application code from the web root. It is compatible with both Adobe ColdFusion (2021+) and BoxLang. Unlike the BoxLang layout, it uses `.cfc` files and traditional CFML tag syntax throughout; BoxLang `.bx` files may be used when running on BoxLang with CFML compat mode.

> Note: Lucee is **not** supported by this template.

### Modern: Directory Map

```
/
??? box.json                    # CommandBox package descriptor
??? server.json                 # CommandBox server config (webroot = public/)
??? pom.xml                     # Maven Java deps (optional)
?
??? app/                        # Application code (NOT web-accessible)
?   ??? Application.cfc         # Contains only `abort;` to block direct access
?   ??? config/
?   ?   ??? ColdBox.cfc         # Framework settings
?   ?   ??? Router.cfc          # URL routing
?   ?   ??? WireBox.cfc         # DI bindings (optional)
?   ?   ??? CacheBox.cfc        # Caching config (optional)
?   ??? handlers/               # Event handlers
?   ??? helpers/                # Application helpers (optional)
?   ??? interceptors/           # Event interceptors
?   ??? layouts/                # View layouts
?   ??? logs/                   # App logs
?   ??? models/                 # Business logic
?   ??? views/                  # View templates (.cfm)
?
??? public/                     # Web root (CommandBox points here)
?   ??? Application.cfc         # Bootstrap that maps to /app
?   ??? index.cfm               # Front controller
?   ??? favicon.ico
?   ??? robots.txt
?   ??? includes/               # Static assets (CSS, JS, images)
?
??? lib/                        # Dependencies (managed by CommandBox)
?   ??? coldbox/
?   ??? testbox/
?   ??? modules/                # ColdBox modules
?   ??? java/                   # Java JARs (managed by Maven)
?
??? resources/                  # Non-web resources
?   ??? database/               # Migrations and seeders
?   ??? apidocs/                # API documentation
?
??? tests/
    ??? Application.cfc
    ??? runner.cfm
    ??? index.cfm
    ??? specs/
        ??? integration/
```

### Modern: Best For

- Production and enterprise applications requiring code/web-root separation
- Mixed CFML + BoxLang teams where Adobe CF 2021+ or BoxLang is the target engine
- Security-conscious deployments where application logic must not be directly web-accessible
- Environments where you cannot configure server-level URL rewriting to block access to application directories

### Modern: Caveats

- Module web UI assets (e.g., `cbdebugger`, `cbswagger`) require `server.json` aliases since `lib/` is outside the web root
- Test components must include `appMapping="/app"` in `BaseTestCase`
- Direct HTTP access to `/app/` returns 404 by design — this is intentional
- `app/Application.cfc` only contains `abort;` as a security barrier

### Modern: Scaffold Command

```bash
box coldbox create app name=myApp skeleton=modern
```

### Critical `server.json` Aliases

```json
{
    "web": {
        "webroot": "public",
        "rewrites": { "enable": true },
        "aliases": {
            "/coldbox/system/exceptions": "./lib/coldbox/system/exceptions/",
            "/tests": "./tests/"
        }
    }
}
```

Add an alias for every module that exposes web assets:

```json
"/cbdebugger": "./lib/modules/cbdebugger"
```

### Modern: Testing Baseline

```cfml
// tests/specs/integration/MainSpec.cfc
component extends="coldbox.system.testing.BaseTestCase" appMapping="/app" {

    function beforeAll(){
        super.beforeAll()
    }

    function run(){
        describe( "Main Handler", function(){
            beforeEach( function( currentSpec ){
                setup()
            })

            it( "can render the homepage", function(){
                var event = this.get( "main.index" )
                expect( event.getRenderedContent() ).notToBeEmpty()
            })
        })
    }
}
```

---

## Choosing the Right Layout

| Scenario | Recommended Layout |
|----------|--------------------|
| Learning ColdBox or rapid prototyping | `flat` |
| Simple internal tool on traditional hosting | `flat` |
| BoxLang-native app, CLI + web, or Vite frontend | `boxlang` |
| Full BoxLang ecosystem (compiled builds, BoxLang OS) | `boxlang` |
| Production Adobe CF or mixed CF/BoxLang team | `modern` |
| Enterprise security-first deployment | `modern` |
| Multi-engine team (Lucee included) | `flat` (only layout supporting Lucee) |

### Decision Flowchart

```
Are you using BoxLang exclusively?
??? Yes ? Do you need Vite, Build.bx, or BoxLang OS runtime?
?         ??? Yes ? boxlang
?         ??? No  ? boxlang (still the default) or modern
??? No  ? Does security or deployment require code outside the web root?
          ??? Yes ? modern
          ??? No  ? flat
```

### Migrating Between Layouts

#### Flat to Modern or BoxLang

1. Move `handlers/`, `models/`, `views/`, `layouts/`, `interceptors/`, `config/` into `app/`
2. Create `public/` with `Application.cfc` (or `.bx`) that sets `COLDBOX_APP_ROOT_PATH` and `COLDBOX_APP_MAPPING="/app"`
3. Move `index.cfm` (or `index.bxm`) and static assets to `public/`
4. Update `server.json` to set `webroot = "public"` and add any module aliases
5. Update all test components to include `appMapping="/app"`

#### Modern to BoxLang

1. Rename `.cfc` files to `.bx` and replace `component` with `class`
2. Rename `.cfm`/`.cfml` view/layout files to `.bxm`
3. Rename config files (`ColdBox.cfc` ? `ColdBox.bx`, `Router.cfc` ? `Router.bx`, etc.)
4. Add a `runtime/` directory with `boxlang.json` for BoxLang mappings
5. Add `Build.bx` if you need compiled distribution builds