---
name: wirebox-di
description: "Use this skill when working with WireBox dependency injection -- bootstrapping the injector, configuring binders, creating object mappings, using the injection DSL, setting persistence scopes, applying providers to avoid scope-widening, lazy properties, property observers, object delegation, virtual inheritance, child injectors, the object populator, or WireBox event listeners. Applies to both standalone and ColdBox-integrated usage."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# WireBox — Dependency Injection

## When to Use This Skill

Use this skill whenever working with **WireBox** DI in any context:

- **Standalone** apps (pure WireBox, no ColdBox)
- **ColdBox** apps where you need DI internals, binder mappings, custom scopes, or advanced WireBox features

For ColdBox-specific injection namespaces (`coldbox:`, module settings, interceptors), also consult the `coldbox/di` skill.

## Language Mode Reference

Examples use **BoxLang (`.bx`)** syntax by default. Adapt for your target language:

| Concept | BoxLang (`.bx`) | CFML (`.cfc`) |
|---------|-----------------|---------------|
| Class declaration | `class [extends="..."] {` | `component [extends="..."] {` |
| DI annotation | `@inject` above `property name="svc";` | `property name="svc" inject="svc";` |
| View templates | `.bxm` suffix | `.cfm` / `.cfml` suffix |
| Tag prefix | `<bx:...>` | `<cf...>` |

> **CFML Compat Mode**: `.bx` and `.cfc` files coexist freely when using BoxLang + CFML Compat module.

---

## Core Concepts

WireBox is an IoC/DI framework that:

- Constructs, wires, and persists objects via an **Injector**
- Uses **Binder** CFCs and/or **annotations** for configuration (no XML)
- Supports **constructor**, **property**, and **setter** injection styles
- Manages object **life cycle scopes** (singleton, request, session, cachebox, etc.)
- Provides **Providers** to avoid scope-widening injection pitfalls
- Integrates an **AOP engine** as an event listener
- Ships with an **Object Populator** for hydrating CFCs from JSON, XML, queries, structs

---

## Bootstrapping the Injector

### Standalone — No Binder

```cfscript
// Zero config: WireBox resolves by CFC path convention
injector = new wirebox.system.ioc.Injector()
myObj    = injector.getInstance( "models.MyService" )
```

### Standalone — With a Binder

```cfscript
// Pass a dotted path or a CFC instance
injector = new wirebox.system.ioc.Injector( "config.WireBox" )
myObj    = injector.getInstance( "MyService" )
```

### ColdBox — Automatic Bootstrap

In ColdBox, WireBox is bootstrapped automatically. The binder lives at `config/WireBox.cfc` by convention. Access the injector anywhere via:

```cfscript
// In a handler, interceptor, or any injected component
property name="wirebox" inject="wirebox";

// Or via the controller
var injector = getController().getWireBox()

// Or use the helper in handlers
getInstance( "MyService" )
```

---

## Binder Configuration

### Extending the Base Binder (recommended for standalone)

```cfscript
// config/WireBox.bx  (or .cfc)
class extends="wirebox.system.ioc.config.Binder" {

    function configure() {

        // WireBox settings (optional)
        wirebox = {
            scopeRegistration : {
                enabled : true,
                scope   : "application",
                key     : "wireBox"
            },
            scanLocations : [ "models" ],
            listeners     : []
        }

        // --- Mappings ---
        // Map by alias -> CFC path
        map( "UserService" ).to( "models.UserService" ).asSingleton()

        // Map by CFC path (alias = CFC filename)
        mapPath( "models.UserRepository" ).asSingleton()

        // Scan entire directory — all CFCs registered by name
        // Call from onLoad() so WireBox is fully online
    }

    function onLoad() {
        mapDirectory( "models" )
    }
}
```

### ColdBox Enhanced Binder

In ColdBox, the binder has extra helpers:

```cfscript
class extends="coldbox.system.ioc.config.ColdBoxBinder" {

    function configure() {
        // Use getAppMapping() for portable paths
        mapDirectory( getAppMapping() & ".models" )
    }
}
```

---

## Object Mappings DSL

### Initiators

| Method | Description |
|--------|-------------|
| `map( alias )` | Start mapping with a named alias (or comma list) |
| `mapPath( path )` | Shorthand: `map(CFCName).to(path)` in one call |
| `mapDirectory( path, [include], [exclude], [influence], [filter] )` | Register all CFCs under path recursively |
| `with( alias )` | Retrieve existing mapping for chaining |
| `unMap( alias )` | Remove a mapping |

### Destinations

| Method | Description |
|--------|-------------|
| `to( path )` | CFC instantiation path |
| `toJava( path )` | Java class via `createObject("java")` |
| `toValue( value )` | Constant value (any type) |
| `toDSL( dsl )` | Construct via any injection DSL string |
| `toFactoryMethod( factory, method )` | Delegate creation to another mapping's method |
| `toProvider( provider )` | Use an `IProvider` implementation |
| `toRSS( url )` | Atom/RSS feed parsed via `cffeed` |
| `toWebservice( wsdl )` | WSDL webservice |

### Persistence DSL

| Method | Description |
|--------|-------------|
| `asSingleton()` | Singleton scope (one instance per injector lifetime) |
| `into( this.SCOPES.X )` | Any internal or custom scope |
| `inCacheBox( [timeout], [lastAccessTimeout], [provider] )` | Time-persisted in CacheBox |
| `asEagerInit()` | Create immediately on injector startup (default is lazy) |

```cfscript
// Examples
map( "ProductService" ).to( "models.ProductService" ).asSingleton()
map( "SessionCart"    ).to( "models.Cart"           ).into( this.SCOPES.SESSION )
map( "GoogleNews"     ).toRSS( "https://news.google.com/news?output=rss" )
                       .inCacheBox( timeout=60, lastAccessTimeout=15 )
map( "DBConnection"   ).toFactoryMethod( factory="DSFactory", method="getDS" )
map( "AppVersion"     ).toValue( "2.5.0" )
```

---

## Persistence Scopes

| Scope | Description |
|-------|-------------|
| `NOSCOPE` / `PROTOTYPE` | Transient — new instance each request (default) |
| `SINGLETON` | One instance for the injector lifetime |
| `REQUEST` | Lives for the duration of the HTTP request |
| `SESSION` | Lives in ColdFusion `session` scope |
| `APPLICATION` | Lives in ColdFusion `application` scope |
| `SERVER` | Lives in ColdFusion `server` scope |
| `CACHEBOX` | Time-persisted via any CacheBox provider |

### Persistence via Component Annotations

```cfscript
// Singleton
class singleton { ... }

// Request scope
class scope="request" { ... }

// Disable per-request transient cache
class transientCache="false" { ... }
```

> **Warning**: Injecting scoped objects (session, request, cachebox) into a singleton causes **scope-widening injection**. Use **Providers** to avoid this.

---

## Injection Styles

### 1. Property Injection (recommended)

```cfscript
class {

    // Inject by convention — mapping name = property name
    @inject
    property name="userService";

    // Inject by explicit mapping ID
    @inject "SecurityService"
    property name="security";

    // Inject into 'this' scope instead of 'variables'
    @inject @scope="this"
    property name="ROLES";
}
```

CFML equivalent:
```cfml
component {
    property name="userService"  inject;
    property name="security"     inject="SecurityService";
    property name="ROLES"        inject scope="this";
}
```

### 2. Constructor Injection

```cfscript
class {
    function init( required userService inject, required string dsn inject="coldbox:setting:dsn" ) {
        variables.userService = arguments.userService
        variables.dsn         = arguments.dsn
        return this
    }
}
```

### 3. Setter Injection

```cfscript
class {
    function setUserService( required userService ) inject {
        variables.userService = arguments.userService
    }
}
```

### Post-Injection Callback — `onDIComplete`

```cfscript
class singleton {

    @inject
    property name="cacheService";

    // Called once all DI is complete — safe to use injected dependencies here
    function onDIComplete() {
        variables.cacheService.warmUp()
    }
}
```

---

## Injection DSL Reference

### Default / Model Namespace

| DSL | Description |
|-----|-------------|
| `inject` (empty) | Inject mapping whose ID = property/arg/setter name |
| `id` | Same as empty |
| `model` | Same as empty |
| `id:{name}` | Inject named mapping |
| `id:{name}:{method}` | Inject result of calling `{method}` on `{name}` |

```cfscript
property name="userService"  inject;                        // by convention
property name="security"     inject="SecurityService";      // by ID
property name="roles"        inject="id:RoleService:list";  // factory method
```

### WireBox Namespace

| DSL | Description |
|-----|-------------|
| `wirebox` | The injector itself |
| `wirebox:binder` | The configuration binder |
| `wirebox:properties` | All injector properties / app settings |
| `wirebox:property:{name}` | Single property value |
| `wirebox:populator` | Object Populator utility |
| `wirebox:scope:{name}` | Direct reference to a scope object |
| `wirebox:asyncManager` | Async Manager |
| `wirebox:child:{name}` | Child injector by name |
| `wirebox:child:{name}:{id}` | Instance from a named child injector |

```cfscript
property name="injector"  inject="wirebox";
property name="populator" inject="wirebox:populator";
property name="settings"  inject="wirebox:properties";
property name="apiKey"    inject="wirebox:property:apiKey";
```

### LogBox Namespace

| DSL | Description |
|-----|-------------|
| `logbox` | The LogBox instance |
| `logbox:root` | Root logger |
| `logbox:logger:{category}` | Logger by category name |
| `logbox:logger:{this}` | Logger scoped to the current CFC path |

```cfscript
property name="log" inject="logbox:logger:{this}";
```

### Provider Namespace

```cfscript
// Inject a provider instead of the real object
// Solves scope-widening and deferred construction
property name="cart"   inject="provider:SessionCart";
property name="logger" inject="provider:logbox:logger:{this}";

// Usage
variables.cart.get().addItem( product )
```

---

## Providers (Scope-Widening Fix)

When a shorter-lived object (session, request) is needed in a longer-lived object (singleton), use a **Provider**:

### Method Provider (cleanest approach)

```cfscript
class singleton {

    // WireBox replaces this empty function with a live provider proxy
    function getCart() provider="SessionCart" {}

    function checkout() {
        getCart().submit()  // always fetches the current session's cart
    }
}
```

### Property Provider

```cfscript
class singleton {
    property name="cart" inject="provider:SessionCart";

    function checkout() {
        variables.cart.get().submit()
    }
}
```

### Custom Provider Class

```cfscript
// Implement wirebox.system.ioc.IProvider
class implements="wirebox.system.ioc.IProvider" {

    @inject
    property name="legacyFactory";

    function get() {
        return variables.legacyFactory.buildComplexObject()
    }
}

// Register in binder
map( "ComplexObject" ).toProvider( "ComplexObjectProvider" )
```

---

## Lazy Properties

Tag a property as `lazy` so it is constructed only on first access (memoized):

```cfscript
class {

    // Builder called on first call to getUtil()
    property name="util" lazy;

    private function buildUtil() {
        return new coldbox.system.core.util.Util()
    }
}

// Explicit builder name
class {
    property name="connection" lazy="openConnection";

    private function openConnection() {
        return datasource.getConnection()
    }
}

// No locking variant
class {
    property name="data" lazyNoLock;

    function buildData() {
        return heavyQuery.execute()
    }
}
```

> **Note**: Always access a lazy property via its generated getter method (not `variables.util` directly).

---

## Property Observers

React when a property's setter is called:

```cfscript
class {

    property name="status" observed;

    // Convention: {propertyName}Observer
    function statusObserver( newValue, oldValue, property ) {
        log.info( "Status changed from #oldValue# to #newValue#" )
    }
}

// Custom observer name
class {
    property name="data" observed="onDataChange";

    function onDataChange( newValue, oldValue, property ) {
        cache.clear( "data-*" )
    }
}
```

---

## Object Delegation

Use the `delegate` annotation to forward a delegate's public methods to the containing class:

```cfscript
class name="ApiClient" {

    // Inject and expose all Memory methods on Computer
    @inject @delegate
    property name="httpClient";
}

// Usage — httpClient methods available directly on ApiClient
apiClient.get( "/users" )
apiClient.post( "/users", body )
```

### Component-Level Delegation

```cfscript
// delegates annotation = comma-separated mapping names
class name="Computer" delegates="Memory,GPU" {
    // Memory.read(), Memory.write(), GPU.render() etc. available directly
}
```

---

## Virtual Inheritance

Blend all methods and properties of a base CFC into a target at runtime:

```cfscript
// Binder
map( "BaseModel"   ).to( "models.base.BaseModel" )
map( "UserService" ).to( "models.UserService" ).virtualInheritance( "BaseModel" )
```

`UserService` gains all `BaseModel` methods plus a `$super` reference and `$superInit()`.

---

## Child Injectors

Hierarchical DI for multi-tenant or module isolation:

```cfscript
// Register a child injector
injector.registerChildInjector( "moduleInjector", new wirebox.system.ioc.Injector( "modules.shop.config.WireBox" ) )

// Request from a specific child
injector.getInstance( name: "ProductService", injector: "moduleInjector" )

// Via DSL
property name="productService" inject="wirebox:child:moduleInjector:ProductService";

// Hierarchy lookup (local ? parent ? children)
injector.getInstance( "SomeService" )
```

---

## Object Populator

Hydrate CFCs from external data:

```cfscript
populator = injector.getObjectPopulator()
// or
property name="populator" inject="wirebox:populator";

// From struct
user = populator.populateFromStruct( target=getInstance("User"), memento=rc )

// From JSON
user = populator.populateFromJSON( target=getInstance("User"), JSONString=jsonBody )

// From query (first row)
user = populator.populateFromQuery( target=getInstance("User"), qry=qUsers )

// From query with prefix
user = populator.populateFromQueryWithPrefix( target=getInstance("User"), qry=qUsers, prefix="user_" )

// From XML
user = populator.populateFromXML( target=getInstance("User"), xml=xmlDoc )
```

---

## Common Injector Methods

```cfscript
// Create / retrieve an instance
getInstance( name="UserService" )
getInstance( name="UserService", initArguments={ dsn: "myDB" } )
getInstance( dsl="logbox:logger:models.UserService" )

// Autowire an existing object
injector.autowire( target=myObj )

// Clear all singletons (useful in dev)
injector.clearSingletons()

// Check if a mapping exists
injector.containsInstance( "UserService" )

// Retrieve binder
injector.getBinder()

// Get a scope object directly
injector.getScope( "singleton" )

// Set a parent injector for hierarchy
injector.setParent( parentInjector )
```

---

## WireBox Data Configuration

Full `wirebox` DSL struct reference for the binder's `configure()` method:

```cfscript
wirebox = {
    // LogBox config path (standalone only; ignored in ColdBox)
    logBoxConfig : "wirebox.system.ioc.config.LogBox",

    // CacheBox integration (standalone only; ignored in ColdBox)
    cacheBox : { enabled : true },

    // Auto-register injector on a CF scope
    scopeRegistration : {
        enabled : true,
        scope   : "application",  // server, session, application
        key     : "wireBox"
    },

    // Paths WireBox will scan when no mapping is found
    scanLocations : [ "models", "com.myapp" ],

    // Stop DI metadata inspection at these base classes
    stopRecursions : [ "coldbox.system.EventHandler" ],

    // Custom DSL namespaces  namespace => builder CFC path
    customDSL : {
        myDSL : "com.myapp.dsl.MyDSLBuilder"
    },

    // Custom storage scopes  annotationName => scope CFC path
    customScopes : {
        tenant : "com.myapp.scope.TenantScope"
    },

    // WireBox event listeners
    listeners : [
        { class: "wirebox.system.aop.Mixer", properties: {} }
    ],

    // Per-request transient injection caching (default true)
    transientInjectionCache : true
}
```

---

## Common Patterns

### Service Layer Singleton

```cfscript
// models/UserService.bx
class singleton {

    @inject
    property name="userRepository";

    @inject
    property name="log" inject="logbox:logger:{this}";

    function findById( required numeric id ) {
        return variables.userRepository.findById( id )
    }
}
```

### Transient Model with onDIComplete

```cfscript
// models/ReportBuilder.bx
class {   // no scope = transient

    @inject
    property name="queryService";

    property name="data";

    function onDIComplete() {
        variables.data = variables.queryService.loadDefaults()
    }
}
```

### Factory Method Mapping

```cfscript
// In binder
map( "DatasourceFactory" ).to( "models.DatasourceFactory" ).asSingleton()
map( "MainDS" ).toFactoryMethod( factory="DatasourceFactory", method="create" )
               .methodArg( name="name", value="mainDB" )
               .asSingleton()
```

### Scan & Override Pattern

```cfscript
function onLoad() {
    // Scan all models, then override specific ones
    mapDirectory( "models" )
    map( "EmailService" ).to( "models.email.SendGridService" ).asSingleton()
}
```

---

## Anti-Patterns to Avoid

| Anti-pattern | Solution |
|--------------|----------|
| Injecting session/request object into a singleton directly | Use `provider:` injection or method providers |
| Using `new` to create objects that have dependencies | Use `getInstance()` so WireBox can inject dependencies |
| Giant binder with hundreds of manual `mapPath()` calls | Use `mapDirectory()` with annotations on the CFCs |
| Forgetting `onDIComplete()` and using injected deps in `init()` | Use `onDIComplete()` for post-wiring initialization |
| Mixing scopes without providers | Plan scope lifetimes; use providers for volatile scopes |