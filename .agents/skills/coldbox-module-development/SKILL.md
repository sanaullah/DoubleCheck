---
name: coldbox-module-development
description: "Use this skill when creating reusable ColdBox modules, writing ModuleConfig.cfc, defining module-specific routes, models, settings, and interceptors, packaging modules for ForgeBox, or building internal application sub-systems as modules."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# Module Development

## When to Use This Skill

Use this skill when creating ColdBox modules — reusable, self-contained sub-applications with their own routes, handlers, services, and configuration.

## Language Mode Reference

Examples use **BoxLang (`.bx`)** syntax by default. Adapt for your target language:

| Concept | BoxLang (`.bx`) | CFML (`.cfc`) |
|---------|-----------------|---------------|
| Class declaration | `class [extends="..."] {` | `component [extends="..."] {` |
| DI annotation | `@inject` above `property name="svc";` | `property name="svc" inject="svc";` |
| View templates | `.bxm` suffix | `.cfm` / `.cfml` suffix |
| Tag prefix | `<bx:if>`, `<bx:output>`, `<bx:set>` | `<cfif>`, `<cfoutput>`, `<cfset>` |

> **CFML Compat Mode**: With BoxLang + CFML Compat module, `.bx` and `.cfc` files coexist freely. BoxLang-native classes use `class {}` (`.bx` files); CFML-compat classes use `component {}` (`.cfc` files).

## Core Concepts

ColdBox modules:
- Live in `modules/` (external) or `modules_app/` (internal)
- Have a `ModuleConfig.cfc` for registration and configuration
- Have a `box.json` for package metadata
- Can declare routes, settings, interceptors, and DI bindings
- Can be packaged and distributed on ForgeBox
- Are isolated via their own classloader mappings

## Module Directory Structure

```
modules_app/
  myModule/
    box.json                  # Package metadata
    ModuleConfig.cfc          # Module registration
    config/
      Router.cfc              # Module routes
      WireBox.cfc             # DI bindings (optional)
    handlers/
      Dashboard.cfc
    models/
      WidgetService.cfc
    views/
      dashboard/
        index.cfm
    layouts/
      Module.cfm
    interceptors/
      ModuleInterceptor.cfc
```

## ModuleConfig.cfc

```boxlang
class ModuleConfig {

    // ======================================================
    // Module Properties
    // ======================================================
    property name="title"           default="My Module";
    property name="description"     default="A ColdBox module";
    property name="version"         default="1.0.0";
    property name="author"          default="Your Name";
    property name="webURL"          default="https://example.com";
    property name="entryPoint"      default="mymodule";
    property name="cfmapping"       default="myModule";
    property name="autoMapModels"   default="true";

    // ======================================================
    // Module Configuration
    // ======================================================
    function configure() {
        // Module settings (configurable from host app)
        settings = {
            apiKey    : "",
            timeout   : 30,
            debug     : false
        }

        // Optional layout settings
        layoutSettings = {
            defaultLayout : "Module"
        }

        // Module-specific interceptors
        interceptors = [
            {
                class : "#moduleMapping#.interceptors.ModuleInterceptor",
                name  : "MyModuleInterceptor"
            }
        ]

        // Module-specific CacheBox caches
        cachebox = {}

        // WireBox binder config path
        wirebox = {
            binder : "#moduleMapping#.config.WireBox"
        }
    }

    // ======================================================
    // Lifecycle Hooks
    // ======================================================

    function onLoad() {
        // Runs when module is loaded (after configure())
        var settings = controller.getModuleSettings( "myModule" )
        log.info( "myModule loaded with settings: #settings.toString()#" )
    }

    function onUnload() {
        // Runs when module is unloaded
        log.info( "myModule unloaded" )
    }
}
```

**CFML (`.cfc`):**

```cfml
component {

    // ======================================================
    // Module Properties
    // ======================================================
    property name="title"           default="My Module";
    property name="description"     default="A ColdBox module";
    property name="version"         default="1.0.0";
    property name="author"          default="Your Name";
    property name="webURL"          default="https://example.com";
    property name="entryPoint"      default="mymodule";
    property name="cfmapping"       default="myModule";
    property name="autoMapModels"   default="true";

    // ======================================================
    // Module Configuration
    // ======================================================
    function configure() {
        // Module settings (configurable from host app)
        settings = {
            apiKey    : "",
            timeout   : 30,
            debug     : false
        }

        // Optional layout settings
        layoutSettings = {
            defaultLayout : "Module"
        }

        // Module-specific interceptors
        interceptors = [
            {
                class : "#moduleMapping#.interceptors.ModuleInterceptor",
                name  : "MyModuleInterceptor"
            }
        ]

        // Module-specific CacheBox caches
        cachebox = {}

        // WireBox binder config path
        wirebox = {
            binder : "#moduleMapping#.config.WireBox"
        }
    }

    // ======================================================
    // Lifecycle Hooks
    // ======================================================

    function onLoad() {
        // Runs when module is loaded (after configure())
        var settings = controller.getModuleSettings( "myModule" )
        log.info( "myModule loaded with settings: #settings.toString()#" )
    }

    function onUnload() {
        // Runs when module is unloaded
        log.info( "myModule unloaded" )
    }
}
```

## Module Router

```boxlang
// modules_app/myModule/config/Router.cfc
class Router extends coldbox.system.web.routing.Router {

    function configure() {

        // All routes here are prefixed with entryPoint
        // e.g., /mymodule/...
        route( "/", "dashboard.index" )
        route( "/dashboard", "dashboard.index" )

        // Resource routes
        resources( "widgets" )

        // API routes
        group( pattern = "/api" ) {
            resources( "items" )
        }

        // Wildcard fallback
        route( "/:handler/:action?" )
    }
}
```

**CFML (`.cfc`):**

```cfml
// modules_app/myModule/config/Router.cfc
component extends="coldbox.system.web.routing.Router" {

    function configure() {

        // All routes here are prefixed with entryPoint
        // e.g., /mymodule/...
        route( "/", "dashboard.index" )
        route( "/dashboard", "dashboard.index" )

        // Resource routes
        resources( "widgets" )

        // API routes
        group( pattern = "/api" ) {
            resources( "items" )
        }

        // Wildcard fallback
        route( "/:handler/:action?" )
    }
}
```

## Module Handler

```boxlang
class Dashboard extends coldbox.system.EventHandler {

    @inject
    property name="widgetService";

    // Get module settings in handler
    property name="settings" inject="coldbox:moduleSettings:myModule";

    function index( event, rc, prc ) {
        prc.widgets   = widgetService.list()
        prc.pageTitle = "Dashboard"
        prc.apiKey    = settings.apiKey
        event.setView( "dashboard/index" )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.EventHandler" {

    property name="widgetService" inject="widgetService";

    // Get module settings in handler
    property name="settings" inject="coldbox:moduleSettings:myModule";

    function index( event, rc, prc ) {
        prc.widgets   = widgetService.list()
        prc.pageTitle = "Dashboard"
        prc.apiKey    = settings.apiKey
        event.setView( "dashboard/index" )
    }
}
```

## Module Service

```boxlang
class WidgetService {

    // Injected module settings
    @inject( "coldbox:moduleSettings:myModule" )
    property name="settings";

    @inject
    property name="wirebox";

    function list() {
        return queryExecute(
            "SELECT * FROM widgets ORDER BY created_at DESC",
            {},
            { datasource: settings.datasource ?: "myapp" }
        )
    }

    function getById( id ) {
        var result = queryExecute(
            "SELECT * FROM widgets WHERE id = :id",
            { id: { value: id, cfsqltype: "integer" } },
            { datasource: settings.datasource ?: "myapp" }
        )
        return result.recordcount ? result : javaCast( "null", "" )
    }
}
```

**CFML (`.cfc`):**

```cfml
component {

    // Injected module settings
    property name="settings" inject="coldbox:moduleSettings:myModule";

    property name="wirebox" inject="wirebox";

    function list() {
        return queryExecute(
            "SELECT * FROM widgets ORDER BY created_at DESC",
            {},
            { datasource: settings.datasource ?: "myapp" }
        )
    }

    function getById( id ) {
        var result = queryExecute(
            "SELECT * FROM widgets WHERE id = :id",
            { id: { value: id, cfsqltype: "integer" } },
            { datasource: settings.datasource ?: "myapp" }
        )
        return result.recordcount ? result : javaCast( "null", "" )
    }
}
```

## box.json

```json
{
    "name"        : "my-module",
    "version"     : "1.0.0",
    "author"      : "Your Name <you@example.com>",
    "description" : "A ColdBox module",
    "homepage"    : "https://github.com/yourorg/my-module",
    "license"     : "Apache-2.0",
    "slug"        : "my-module",
    "type"        : "modules",
    "keywords"    : [ "coldbox", "module" ],
    "dependencies": {
        "coldbox"   : "^7.0.0"
    },
    "devDependencies": {
        "testbox" : "^5.0.0"
    }
}
```

## Module Inception and Dependencies

Use module inception when one ColdBox module depends on another ColdBox module and should install or bootstrap it automatically.

```json
{
    "name" : "content-module",
    "type" : "modules",
    "dependencies" : {
        "cbvalidation" : "^4.0.0",
        "cbauth"       : "^2.0.0"
    }
}
```

Keep inception boundaries clean:
- Declare module dependencies in `box.json`, not in ad hoc runtime checks
- Let each module own its config, routes, interceptors, and binder registrations
- Avoid hard-coding host-app paths when a dependent module should remain portable

## Overriding Module Settings from Host App

```boxlang
// config/ColdBox.cfc ? moduleSettings
moduleSettings = {
    myModule : {
        apiKey  : getSystemSetting( "MY_MODULE_API_KEY", "" ),
        timeout : 60,
        debug   : ( server.system.environment.APP_ENV ?: "production" ) == "development"
    }
}
```

## Module Interceptors

```boxlang
// modules_app/myModule/interceptors/ModuleInterceptor.cfc
class ModuleInterceptor extends coldbox.system.Interceptor {

    property name="settings" inject="coldbox:moduleSettings:myModule";

    function configure() {
        log.info( "MyModule interceptor configured" )
    }

    function preProcess( event, rc, prc, interceptData ) {
        if( settings.debug ){
            log.debug( "Module request: #event.getCurrentEvent()#" )
        }
    }
}
```

**CFML (`.cfc`):**

```cfml
// modules_app/myModule/interceptors/ModuleInterceptor.cfc
component extends="coldbox.system.Interceptor" {

    property name="settings" inject="coldbox:moduleSettings:myModule";

    function configure() {
        log.info( "MyModule interceptor configured" )
    }

    function preProcess( event, rc, prc, interceptData ) {
        if( settings.debug ){
            log.debug( "Module request: #event.getCurrentEvent()#" )
        }
    }
}
```

## Module Helpers and CF Mappings

```boxlang
// modules_app/myModule/ModuleConfig.cfc
class ModuleConfig {

    function configure() {
        settings = {
            cfmapping : "/mymodule"
        }
    }
}
```

Use module helpers and CF mappings intentionally:
- Add module-level or handler-level helper templates for reusable view logic that belongs to the module
- Expose a dedicated CF mapping when external code needs stable access to module assets or classes
- Keep helpers presentation-focused; do not move service/business logic into helper files

## Module WireBox Binder

```boxlang
// modules_app/myModule/config/WireBox.cfc
class WireBox extends coldbox.system.ioc.config.Binder {

    function configure() {
        // Map an interface to an implementation
        mapPath( "#moduleMapping#.models.WidgetService" )
            .asSingleton()

        // Map with custom ID
        map( "widgetRepository" )
            .to( "#moduleMapping#.models.WidgetRepository" )
            .asSingleton()

        // Map with constructor args
        map( "myModuleClient" )
            .to( "#moduleMapping#.models.APIClient" )
            .asSingleton()
            .initWith( apiKey = "@settings.apiKey@" )
    }
}
```

**CFML (`.cfc`):**

```cfml
// modules_app/myModule/config/WireBox.cfc
component extends="coldbox.system.ioc.config.Binder" {

    function configure() {
        // Map an interface to an implementation
        mapPath( "#moduleMapping#.models.WidgetService" )
            .asSingleton()

        // Map with custom ID
        map( "widgetRepository" )
            .to( "#moduleMapping#.models.WidgetRepository" )
            .asSingleton()

        // Map with constructor args
        map( "myModuleClient" )
            .to( "#moduleMapping#.models.APIClient" )
            .asSingleton()
            .initWith( apiKey = "@settings.apiKey@" )
    }
}
```

## Module Best Practices

- Use `moduleMapping` (injected by ColdBox) for fully-qualified class paths
- Access module settings via `cold box:moduleSettings:moduleName` injection DSL
- Use `onLoad()` and `onUnload()` for setup/teardown initialization
- Set `autoMapModels = true` so models auto-register with WireBox
- Keep modules self-contained — don't depend on host app models
- Test modules independently with their own TestBox specs
- Publish finished modules to ForgeBox with semantic versioning