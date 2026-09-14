---
name: wirebox-aop
description: "Use this skill when working with WireBox Aspect-Oriented Programming (AOP) -- activating the AOP engine (Mixer listener), creating method interceptor aspects, registering aspects via mapAspect(), binding aspects to classes and methods via bindAspect(), using the Matcher DSL (any, regex, mappings, instanceOf, annotatedWith, methods, returns), auto-aspect binding via classMatcher/methodMatcher annotations, the MethodInvocation API (proceed, getArgs, getTarget, getMethod), using built-in aspects (CFTransaction, HibernateTransaction, MethodLogger), and AOP in both standalone WireBox and ColdBox applications."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# WireBox AOP — Aspect-Oriented Programming

## When to Use This Skill

Use this skill when:

- Adding cross-cutting concerns (logging, transactions, security, caching, tracing) to methods without modifying them
- Creating reusable method interceptors (aspects)
- Using the built-in `CFTransaction`, `HibernateTransaction`, or `MethodLogger` aspects
- Binding aspects to classes/methods via DSL or self-binding annotations

Applies to both **standalone WireBox** and **ColdBox** applications.

## Language Mode Reference

Examples use **BoxLang (`.bx`)** / CFML script syntax. Adapt for your target language:

| Concept | BoxLang (`.bx`) | CFML (`.cfc`) |
|---------|-----------------|---------------|
| Class declaration | `class [extends="..."] {` | `component [extends="..."] {` |
| DI annotation | `@inject` above `property name="svc";` | `property name="svc" inject="svc";` |

---

## AOP Vocabulary

| Term | Definition |
|------|------------|
| **Aspect** | A modularized cross-cutting concern (e.g., logging, transactions) |
| **Target Object** | The object whose methods will be intercepted |
| **Join Point** | A method execution point where an aspect is applied |
| **Advice** | The action taken at a join point (before, after, or around) |
| **AOP Proxy** | The runtime proxy wrapping the original method |

---

## AOP Namespaces

```
// ColdBox application
coldbox.system.aop

// Standalone WireBox
wirebox.system.aop
```

> WireBox AOP is implemented as a **WireBox listener** called the **Mixer**. It transforms objects after DI is complete and is fully decoupled from WireBox internals.

---

## Step 1: Activate the AOP Engine

Register the Mixer listener in your WireBox binder:

### Standalone WireBox

```cfscript
// config/WireBox.bx (or .cfc)
class extends="wirebox.system.ioc.config.Binder" {

    function configure() {
        wirebox = {
            listeners : [
                {
                    class      : "wirebox.system.aop.Mixer",
                    properties : {
                        // Where to write generated UDF stubs (disk or memory)
                        generationPath   : "/wirebox/system/aop/tmp",
                        // Reload class match dict on each request (dev only)
                        classMatchReload : false
                    }
                }
            ]
        }
    }
}
```

### ColdBox Application

In ColdBox, use the `coldbox.system.aop.Mixer` namespace:

```cfscript
// config/WireBox.bx
class extends="coldbox.system.ioc.config.ColdBoxBinder" {

    function configure() {
        wirebox = {
            listeners : [
                {
                    class      : "coldbox.system.aop.Mixer",
                    properties : {
                        generationPath   : "/wirebox/system/aop/tmp",
                        classMatchReload : false
                    }
                }
            ]
        }

        // Register and bind aspects here
    }
}
```

Alternatively, register the Mixer as a **ColdBox interceptor** in `config/ColdBox.cfc`:

```cfscript
interceptors = [
    { class: "coldbox.system.aop.Mixer", name: "AOPMixer", properties: {} }
]
```

---

## Step 2: Create an Aspect

An aspect must implement `wirebox.system.aop.MethodInterceptor` (or `coldbox.system.aop.MethodInterceptor` in ColdBox):

```cfscript
// models/aspects/MethodLoggerAspect.bx
class implements="wirebox.system.aop.MethodInterceptor" {

    // Aspects support full WireBox DI
    @inject "logbox:logger:{this}"
    property name="log";

    function init( boolean logResults = true ) {
        variables.logResults = arguments.logResults
        return this
    }

    /**
     * The single entry point for all AOP advice.
     * Implement before/around/after logic here.
     * You MUST call invocation.proceed() to execute the real method.
     */
    function invokeMethod( required invocation ) {
        var target  = arguments.invocation.getTargetName()
        var method  = arguments.invocation.getMethod()
        var args    = arguments.invocation.getArgs()
        var debug   = "target=#target#, method=#method#, args=#serializeJSON(args)#"

        // BEFORE advice
        log.debug( "BEFORE: #debug#" )

        // AROUND — proceed to the real method (or next aspect in chain)
        var result = arguments.invocation.proceed()

        // AFTER advice
        if ( !isNull( result ) && variables.logResults ) {
            log.debug( "AFTER: #debug#, result=#serializeJSON(result)#" )
        }

        return result ?: javaCast( "null", "" )
    }
}
```

### Aspect Rules

- **Always call `invocation.proceed()`** unless you intentionally want to short-circuit the method (e.g., a security aspect that blocks access).
- If the method has a return value, **return the result** of `proceed()`.
- Aspects are WireBox-managed objects — full DI is available.
- Multiple aspects can be chained on the same join point; execution follows registration order.

---

## Step 3: Register the Aspect

In the WireBox binder, declare the aspect mapping using `mapAspect()`:

```cfscript
// Register an aspect — auto-discovers classMatcher/methodMatcher annotations
mapAspect( "MethodLogger" ).to( "models.aspects.MethodLoggerAspect" )

// Disable auto-binding (self-binding annotations ignored)
mapAspect( aspect="MethodLogger", autoBind=false ).to( "models.aspects.MethodLoggerAspect" )
```

---

## Step 4: Bind the Aspect to Classes and Methods

Use `bindAspect()` with the **Matcher DSL** to declare what to intercept:

```cfscript
// Log all save() calls on UserService
bindAspect(
    classes  : match().mappings( "UserService" ),
    methods  : match().methods( "save" ),
    aspects  : "MethodLogger"
)

// Transaction on any method annotated @transactional
bindAspect(
    classes  : match().any(),
    methods  : match().annotatedWith( "transactional" ),
    aspects  : "CFTransaction"
)

// Multiple aspects on regex-matched service classes
bindAspect(
    classes  : match().regex( ".*Service$" ),
    methods  : match().any(),
    aspects  : "MethodLogger,SecurityAspect"
)
```

---

## Matcher DSL

The `match()` convenience method in the binder creates a `wirebox.system.aop.Matcher` instance. Chain these methods:

### Class Matchers

| Method | Description |
|--------|-------------|
| `any()` | Matches all classes |
| `mappings( mappings )` | Match specific mapping names (list or array) |
| `instanceOf( classPath )` | Match if class `isInstanceOf(classPath)` |
| `annotatedWith( annotation [, value] )` | Match classes with an annotation (optionally matching value) |
| `regex( pattern )` | Match CFC path against a regular expression |

### Method Matchers

| Method | Description |
|--------|-------------|
| `any()` | Matches all methods |
| `methods( names )` | Match specific method names (list or array) |
| `annotatedWith( annotation [, value] )` | Match methods with an annotation |
| `returns( type )` | Match methods by return type |
| `regex( pattern )` | Match method names against a regular expression |

### Logical Combinators

| Method | Description |
|--------|-------------|
| `andMatch( matcher )` | AND two matchers together |
| `orMatch( matcher )` | OR two matchers together |

```cfscript
// Only public void service methods
bindAspect(
    classes : match().regex( ".*Service$" ).andMatch( match().annotatedWith( "monitored" ) ),
    methods : match().returns( "void" ),
    aspects : "MetricsAspect"
)
```

---

## Auto-Aspect Binding

Let the aspect declare its own class/method matchers via annotations — no `bindAspect()` call needed:

```cfscript
/**
 * @classMatcher any
 * @methodMatcher annotatedWith:transactional
 */
class name="TransactionAspect"
      implements="wirebox.system.aop.MethodInterceptor" {

    function invokeMethod( required invocation ) {
        transaction {
            return arguments.invocation.proceed()
        }
    }
}
```

Register it — WireBox detects the annotations and binds automatically:

```cfscript
mapAspect( "TransactionAspect" ).to( "models.aspects.TransactionAspect" )
```

Override the self-binding when needed:

```cfscript
mapAspect( aspect="TransactionAspect", autoBind=false ).to( "models.aspects.TransactionAspect" )
bindAspect( classes=match().mappings( "OrderService" ), methods=match().regex( "^save" ), aspects="TransactionAspect" )
```

### classMatcher Annotation DSL Values

| Value | Description |
|-------|-------------|
| `any` | Any class |
| `annotatedWith:{annotation}` | Class has annotation present |
| `annotatedWith:{annotation}:{value}` | Class has annotation with specific value |
| `mappings:{name,name,...}` | Specific named mappings |
| `instanceOf:{classPath}` | Class is an instance of classPath |
| `regex:{pattern}` | Class path matches regex |

### methodMatcher Annotation DSL Values

| Value | Description |
|-------|-------------|
| `any` | Any method |
| `annotatedWith:{annotation}` | Method has annotation present |
| `annotatedWith:{annotation}:{value}` | Method has annotation with specific value |
| `methods:{name,name,...}` | Specific method names |
| `returns:{type}` | Methods returning a specific type |
| `regex:{pattern}` | Method name matches regex |

---

## MethodInvocation API

The `invocation` argument passed to `invokeMethod` exposes:

| Method | Description |
|--------|-------------|
| `getMethod()` | Name of the intercepted method (join point) |
| `getMethodMetadata()` | Struct of the method's CFC metadata (annotations) |
| `getArgs()` | Current argument collection (struct) |
| `setArgs( args )` | Override the argument collection before proceeding |
| `getTarget()` | Reference to the target object |
| `getTargetName()` | Name (mapping ID) of the target object |
| `getTargetMapping()` | The WireBox mapping object (has extra attributes etc.) |
| `proceed()` | Execute the real method or the next aspect in chain |

```cfscript
function invokeMethod( required invocation ) {
    // Read a method annotation to decide behavior
    var meta = arguments.invocation.getMethodMetadata()
    if ( structKeyExists( meta, "secured" ) ) {
        if ( !variables.securityService.isLoggedIn() ) {
            throw( type="SecurityException", message="Not authorized" )
        }
    }

    // Modify arguments before the real call
    var args    = arguments.invocation.getArgs()
    args.auditUser = variables.securityService.getCurrentUser()
    arguments.invocation.setArgs( args )

    return arguments.invocation.proceed()
}
```

---

## Built-In Aspects

WireBox ships with three ready-to-use aspects in `wirebox.system.aop.aspects` (or `coldbox.system.aop.aspects`):

### CFTransaction

Wraps methods in a ColdFusion `transaction {}` block. Self-binding: matches any class, methods annotated `@transactional`.

```cfscript
mapAspect( "CFTransaction" ).to( "coldbox.system.aop.aspects.CFTransaction" )

// Now annotate any method with @transactional
class name="OrderService" {

    function placeOrder( required order ) transactional {
        variables.orderRepository.save( arguments.order )
        variables.inventoryService.deduct( arguments.order.getItems() )
    }
}
```

### HibernateTransaction

Wraps methods in a native Hibernate transaction block. Same self-binding pattern as CFTransaction.

```cfscript
mapAspect( "HibernateTransaction" ).to( "coldbox.system.aop.aspects.HibernateTransaction" )
```

### MethodLogger

Logs method entries and results via LogBox. Self-binding: any class, any method.

```cfscript
mapAspect( "MethodLogger" ).to( "coldbox.system.aop.aspects.MethodLogger" )
```

---

## Complete Example — Security Aspect

```cfscript
// models/aspects/SecuredAspect.bx
/**
 * @classMatcher any
 * @methodMatcher annotatedWith:secured
 */
class implements="wirebox.system.aop.MethodInterceptor" {

    @inject
    property name="securityService";

    @inject "logbox:logger:{this}"
    property name="log";

    function invokeMethod( required invocation ) {
        var meta     = arguments.invocation.getMethodMetadata()
        var required = meta.secured ?: "authenticated"

        if ( required == "authenticated" && !variables.securityService.isLoggedIn() ) {
            log.warn( "Unauthorized access attempt to #arguments.invocation.getMethod()#" )
            throw( type="SecurityException", message="Authentication required" )
        }

        if ( required != "authenticated" && !variables.securityService.hasPermission( required ) ) {
            log.warn( "Permission denied [#required#] on #arguments.invocation.getMethod()#" )
            throw( type="SecurityException", message="Permission denied: #required#" )
        }

        return arguments.invocation.proceed()
    }
}
```

```cfscript
// config/WireBox.bx
class extends="coldbox.system.ioc.config.ColdBoxBinder" {

    function configure() {
        wirebox = {
            listeners : [{ class: "coldbox.system.aop.Mixer" }]
        }

        // Register self-binding aspects
        mapAspect( "SecuredAspect"   ).to( "models.aspects.SecuredAspect" )
        mapAspect( "CFTransaction"   ).to( "coldbox.system.aop.aspects.CFTransaction" )
        mapAspect( "MethodLogger"    ).to( "coldbox.system.aop.aspects.MethodLogger" )
    }
}
```

```cfscript
// models/OrderService.bx
class singleton {

    @inject
    property name="orderRepository";

    // Requires 'place-orders' permission
    function checkout( required cart ) secured="place-orders" transactional {
        var order = variables.orderRepository.createFromCart( arguments.cart )
        variables.orderRepository.save( order )
        return order
    }

    // Requires only login
    function getHistory() secured {
        return variables.orderRepository.findAll()
    }
}
```

---

## AOP in Standalone WireBox

Same workflow but use `wirebox.system.aop.*` namespaces:

```cfscript
// Binder listener
wirebox = {
    listeners : [{ class: "wirebox.system.aop.Mixer" }]
}

// Aspect implements
class implements="wirebox.system.aop.MethodInterceptor" { ... }

// Map aspect
mapAspect( "MyAspect" ).to( "model.aspects.MyAspect" )
```

---

## Checklist for Configuring AOP

1. **Add the Mixer listener** to `wirebox.listeners` in your binder (standalone: `wirebox.system.aop.Mixer`; ColdBox: `coldbox.system.aop.Mixer`)
2. **Create your aspect** implementing `MethodInterceptor` — add DI, implement `invokeMethod`, call `proceed()`
3. **Register the aspect** with `mapAspect( "Name" ).to( "path.to.Aspect" )`
4. **Bind the aspect** with `bindAspect(classes, methods, aspects)` — or use `@classMatcher` / `@methodMatcher` annotations for auto-binding
5. **Annotate target methods** if using annotation-based matching (e.g., `transactional`, `secured`)

---

## Anti-Patterns to Avoid

| Anti-pattern | Solution |
|--------------|----------|
| Forgetting to call `invocation.proceed()` | Always call it unless intentionally blocking the method |
| Not returning the result of `proceed()` | `return invocation.proceed()` — callers depend on the return value |
| Registering the Mixer but not calling `mapAspect()` | Both steps are required — Mixer enables AOP; `mapAspect` registers the aspect |
| Applying AOP to transient objects with volatile state | Prefer singletons or application-scope objects as aspect targets |
| Circular dependencies between aspects | Keep aspects focused; avoid injecting objects that themselves have AOP applied |
| Using `classMatchReload=true` in production | Only enable in development — it reloads matchers on every request |