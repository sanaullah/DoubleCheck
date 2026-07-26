---
name: coldbox-di
description: "Use this skill when working with dependency injection inside a ColdBox application -- the ColdBox injection DSL namespaces (coldbox:, logbox:, cachebox:, wirebox:, model:), module settings injection, injecting ColdBox services (interceptors, flash, router, scheduler), configuring the WireBox binder in ColdBox context, the enhanced ColdBox binder helpers, or wiring handlers/interceptors/models via ColdBox-aware WireBox."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# ColdBox — Dependency Injection

## When to Use This Skill

Use this skill when working with DI **inside a ColdBox application**. It covers the ColdBox-specific injection DSL namespaces and integration features that are *not* available in standalone WireBox.

For WireBox fundamentals (binder config, scopes, providers, lazy properties, child injectors, object populator), consult the `wirebox` skill first.

## Language Mode Reference

Examples use **BoxLang (`.bx`)** syntax by default.

| Concept | BoxLang (`.bx`) | CFML (`.cfc`) |
|---------|-----------------|---------------|
| Class declaration | `class [extends="..."] {` | `component [extends="..."] {` |
| Property DI annotation | `@inject` above `property name="svc";` | `property name="svc" inject="svc";` |

---

## How WireBox Integrates with ColdBox

ColdBox automatically bootstraps a WireBox injector at startup. Key integration points:

- **Binder location**: `config/WireBox.cfc` (optional — ColdBox works without one and auto-maps `models/`)
- **Injector access**: Available at `controller.getWireBox()` or via `inject="wirebox"`
- **Auto-scan**: The `models/` folder is automatically registered; every CFC is accessible by its name
- **ColdBox objects**: Handlers, interceptors, and scheduled tasks are automatically wired by the framework
- **Module isolation**: Each ColdBox module gets its own WireBox namespace and can declare its own mappings

---

## ColdBox Binder

```cfscript
// config/WireBox.bx  (or .cfc)
class extends="coldbox.system.ioc.config.ColdBoxBinder" {

    function configure() {
        // getAppMapping() returns the app root dotted path
        // mapDirectory auto-registers all CFCs under models/
        mapDirectory( getAppMapping() & ".models" )

        // Override specific mappings
        map( "EmailService" ).to( getAppMapping() & ".models.email.SendGridService" ).asSingleton()
    }

    function onLoad() {
        // onLoad fires after WireBox is fully online — safe for mapDirectory()
        mapDirectory( getAppMapping() & ".models.plugins" )
    }
}
```

> **Note**: ColdBox already registers `models/` automatically, so an explicit `mapDirectory` is only needed for additional scan paths or non-convention folders.

---

## Getting Instances

```cfscript
// In handlers, interceptors, scheduled tasks — built-in helper
getInstance( "UserService" )
getInstance( name="UserService", initArguments={ dsn: "myDB" } )

// Via injection
property name="userService" inject;                   // by convention from property name
property name="userService" inject="UserService";     // by explicit ID
property name="userService" inject="id:UserService";  // explicit namespace
```

---

## Full Injection DSL Namespace Reference

### Default / Model Namespace

| DSL | Description |
|-----|-------------|
| *(empty inject)* | Inject by property / arg / setter name |
| `id:{name}` | Inject named mapping |
| `model:{name}` | Alias for `id:` |
| `id:{name}:{method}` | Inject result of calling method on the mapping |

```cfscript
property name="userService"  inject;                        // by convention
property name="authService"  inject="SecurityService";      // by ID
property name="adminRoles"   inject="id:RoleService:getAdminRoles";
```

---

### WireBox Namespace

| DSL | Description |
|-----|-------------|
| `wirebox` | The WireBox injector |
| `wirebox:binder` | The configuration binder |
| `wirebox:properties` | All application settings (merged app + coldbox) |
| `wirebox:property:{name}` | Single property value |
| `wirebox:populator` | Object Populator utility |
| `wirebox:scope:{name}` | Direct scope object reference |
| `wirebox:asyncManager` | The Async Manager |
| `wirebox:eventManager` | WireBox's internal event manager |
| `wirebox:parent` | Parent injector (if any) |
| `wirebox:child:{name}` | Child injector by name |
| `wirebox:child:{name}:{id}` | Instance from a named child injector |

```cfscript
property name="injector"     inject="wirebox";
property name="populator"    inject="wirebox:populator";
property name="appSettings"  inject="wirebox:properties";
property name="apiKey"       inject="wirebox:property:stripe.apiKey";
```

---

### ColdBox Namespace (ColdBox apps only)

#### Single-Level

| DSL | Description |
|-----|-------------|
| `coldbox` | The ColdBox controller |

#### Two-Level

| DSL | Description |
|-----|-------------|
| `coldbox:asyncManager` | Global Async Manager |
| `coldbox:appScheduler` | Global application scheduler |
| `coldbox:configSettings` | Application configuration settings struct |
| `coldbox:coldboxSettings` | Internal ColdBox framework settings struct |
| `coldbox:dataMarshaller` | Data marshaller (JSON/XML/WDDX/plain serialization) |
| `coldbox:flash` | Flash scope object |
| `coldbox:handlerService` | Handler service |
| `coldbox:interceptorService` | Interceptor service |
| `coldbox:moduleService` | Module service |
| `coldbox:renderer` | Renderer object (transient) |
| `coldbox:requestContext` | Current request context (transient) |
| `coldbox:requestService` | Request service |
| `coldbox:router` | Application router |
| `coldbox:routingService` | Routing service |
| `coldbox:schedulerService` | Scheduler service |
| `coldbox:loaderService` | Loader service |

#### Three-Level

| DSL | Description |
|-----|-------------|
| `coldbox:setting:{key}` | Application setting by key |
| `coldbox:setting:{key}@{module}` | Setting from a specific module |
| `coldbox:coldboxSetting:{key}` | Internal ColdBox framework setting |
| `coldbox:interceptor:{name}` | Named interceptor reference |
| `coldbox:moduleSettings:{module}` | Entire module settings struct |
| `coldbox:moduleConfig:{module}` | Entire module configuration struct |

#### Four-Level

| DSL | Description |
|-----|-------------|
| `coldbox:moduleSettings:{module}:{key}` | Single key from module settings |

```cfscript
// ColdBox namespace examples
property name="controller"         inject="coldbox";
property name="flash"              inject="coldbox:flash";
property name="moduleService"      inject="coldbox:moduleService";
property name="asyncManager"       inject="coldbox:asyncManager";
property name="appScheduler"       inject="coldbox:appScheduler";
property name="renderer"           inject="coldbox:renderer";
property name="router"             inject="coldbox:router";

// Settings
property name="dsn"                inject="coldbox:setting:datasource";
property name="apiUrl"             inject="coldbox:setting:apiUrl@myModule";
property name="stripeKey"          inject="coldbox:setting:stripe.key";

// Module config
property name="shopSettings"       inject="coldbox:moduleSettings:shop";
property name="taxRate"            inject="coldbox:moduleSettings:shop:taxRate";

// Named interceptor
property name="securityInterceptor" inject="coldbox:interceptor:Security";
```

---

### LogBox Namespace

| DSL | Description |
|-----|-------------|
| `logbox` | LogBox instance |
| `logbox:root` | Root logger |
| `logbox:logger:{category}` | Logger by category string |
| `logbox:logger:{this}` | Logger using current CFC dotted path as category |

```cfscript
property name="log"    inject="logbox:logger:{this}";  // recommended for models
property name="root"   inject="logbox:root";
```

---

### CacheBox Namespace

| DSL | Description |
|-----|-------------|
| `cachebox` | CacheBox instance (CacheFactory) |
| `cachebox:default` | Default cache provider |
| `cachebox:{name}` | Named cache provider |

```cfscript
property name="cacheFactory"  inject="cachebox";
property name="cache"         inject="cachebox:default";
property name="sessionCache"  inject="cachebox:sessions";
```

---

### Provider Namespace

```cfscript
// Inject a provider to defer construction or avoid scope widening
property name="cart"   inject="provider:SessionCart";

// Provider over a DSL string
property name="logger" inject="provider:logbox:logger:{this}";

// Use .get() to retrieve the actual object
variables.cart.get().addItem( product )
```

---

## Complete Model Example — Service

```cfscript
// models/UserService.bx
class singleton {

    // Standard model injection
    @inject
    property name="userRepository";

    // App setting
    @inject "coldbox:setting:maxLoginAttempts"
    property name="maxLoginAttempts";

    // Logger scoped to this CFC
    @inject "logbox:logger:{this}"
    property name="log";

    // Cache for performance
    @inject "cachebox:default"
    property name="cache";

    // Module-level setting
    @inject "coldbox:moduleSettings:security:lockoutMinutes"
    property name="lockoutMinutes";

    function login( required string email, required string password ) {
        var cacheKey = "login_attempts_#arguments.email#"
        var attempts = variables.cache.get( cacheKey ) ?: 0

        if ( attempts >= variables.maxLoginAttempts ) {
            log.warn( "Account locked: #arguments.email#" )
            throw( type="AccountLockedException" )
        }

        var user = variables.userRepository.findByEmail( arguments.email )
        if ( isNull( user ) || !user.checkPassword( arguments.password ) ) {
            variables.cache.set( cacheKey, ++attempts, variables.lockoutMinutes )
            throw( type="InvalidCredentialsException" )
        }

        variables.cache.clear( cacheKey )
        return user
    }
}
```

---

## Complete Model Example — Handler

```cfscript
// handlers/Users.bx
class extends="coldbox.system.EventHandler" {

    // Inject service by convention
    @inject
    property name="userService";

    // Inject a transient provider (scope-widening safe)
    @inject "provider:UserForm"
    property name="userFormProvider";

    // Module setting
    @inject "coldbox:setting:itemsPerPage"
    property name="itemsPerPage";

    function index( event, rc, prc ) {
        prc.users = variables.userService.paginate(
            page  : rc.page  ?: 1,
            limit : variables.itemsPerPage
        )
        event.setView( "users/index" )
    }

    function create( event, rc, prc ) {
        prc.form = variables.userFormProvider.get()
        event.setView( "users/create" )
    }
}
```

---

## Module DI Configuration

Each ColdBox module has its own `models/` auto-scanned and can declare a `WireBox.cfc`:

```cfscript
// modules/shop/config/WireBox.bx
class extends="coldbox.system.ioc.config.ColdBoxBinder" {

    function configure() {
        // Override the default PaymentGateway for this module
        map( "PaymentGateway" ).to( "modules.shop.models.StripeGateway" ).asSingleton()
    }
}
```

Inject across module boundaries:

```cfscript
// Inject from another module using @module suffix
property name="authService" inject="id:AuthService@security";

// Via coldbox:setting from another module
property name="apiKey" inject="coldbox:setting:apiKey@payments";
```

---

## ColdBox Application Settings Injection

Define settings in `config/ColdBox.cfc`:

```cfscript
// config/ColdBox.bx
class {
    function configure() {
        coldbox = {
            appName : "MyApp"
        }
        settings = {
            maxItems     : 25,
            featureFlags : { darkMode: true, beta: false }
        }
    }
}
```

Inject them anywhere:

```cfscript
property name="maxItems"   inject="coldbox:setting:maxItems";

// Nested key injection
property name="darkMode"   inject="coldbox:setting:featureFlags.darkMode";
```

---

## Common Patterns

### Environment-Aware Service Registration

```cfscript
// config/WireBox.bx
class extends="coldbox.system.ioc.config.ColdBoxBinder" {

    function configure() {
        if ( getInjector().getBinder().getProperties().environment == "testing" ) {
            map( "EmailService" ).to( "models.email.MockEmailService" ).asSingleton()
        } else {
            map( "EmailService" ).to( "models.email.SendGridService" ).asSingleton()
        }
    }
}
```

### Inject the Request Context (Transient)

```cfscript
class {
    // Must use provider — RequestContext is transient (scoped per request)
    property name="event" inject="provider:coldbox:requestContext";

    function process() {
        var rc = variables.event.get().getCollection()
    }
}
```

### Flash Scope Access in a Service

```cfscript
class singleton {
    @inject "coldbox:flash"
    property name="flash";

    function notify( required string message ) {
        variables.flash.put( "notice", arguments.message )
    }
}
```

---

## Anti-Patterns to Avoid

| Anti-pattern | Solution |
|--------------|----------|
| Using `application.wirebox.getInstance()` instead of injection | Use `inject` annotation; fallback to `getInstance()` helper in handlers |
| Injecting `coldbox:requestContext` directly into a singleton | Use `provider:coldbox:requestContext` — request context is transient |
| Hardcoding strings in models instead of injecting settings | Use `coldbox:setting:{key}` injection |
| Creating module services via `new` in handlers | Use `getInstance()` or property injection; services need DI |
| Re-declaring mappings already auto-scanned from `models/` | Trust auto-scan; only override when you need a different implementation |