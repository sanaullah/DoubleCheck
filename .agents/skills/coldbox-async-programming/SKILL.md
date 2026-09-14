---
name: coldbox-async-programming
description: "Use this skill when building async pipelines, working with ColdBox Futures, running parallel computations with all()/allApply()/anyOf(), registering and managing thread-pool executors, or accessing the AsyncManager via the async() helper."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# Async Programming (Futures & Executors)

## When to Use This Skill

Use this skill when you need non-blocking operations, parallel workloads, async pipelines, or custom thread-pool management in ColdBox or any standalone Ortus library (WireBox, CacheBox, LogBox).

## Language Mode Reference

Examples use **BoxLang (`.bx`)** syntax by default. Adapt for your target language:

| Concept | BoxLang (`.bx`) | CFML (`.cfc`) |
|---------|-----------------|---------------|
| Class declaration | `class [extends="..."] {` | `component [extends="..."] {` |
| Arrow lambda | `( arg ) => expression` | `( arg ) => expression` |
| Closure | `function() { ... }` | `function() { ... }` |

## Core Concepts

- **AsyncManager** — Central manager accessed via `async()` helper or WireBox injection `@inject "asyncManager@coldbox"`
- **ColdBox Future** — Backed by Java `CompletableFuture`; created via `newFuture()` / `newCompletedFuture()`
- **Executors** — Thread pools (fixed, cached, single, scheduled) registered in AsyncManager
- **Parallel methods** — `all()`, `allApply()`, `anyOf()` for concurrent workloads
- Available in **any** ColdBox/WireBox/CacheBox/LogBox application (not ColdBox-only)

## Accessing the AsyncManager

```boxlang
// In a handler or interceptor — shortcut helper
var future = async().newFuture( () => someService.heavyWork() )

// Via injection
@inject("asyncManager@coldbox")
property name="asyncManager";

// In a non-ColdBox app
application.asyncManager = new coldbox.system.async.AsyncManager()
```

## Creating Futures

```boxlang
// Constructor shortcut
var f = async().newFuture( () => userService.findAll() )

// run() method — also supports CFC + method name
var f = async().newFuture().run( () => userService.findAll() )
var f = async().newFuture().run( supplier: userService, method: "findAll" )

// Already-completed future (seed a value)
var f = async().newCompletedFuture( 42 )

// Complete an in-progress future with a fallback
var f = async().newFuture( () => fetch() ).complete( fallbackValue )
```

> **loadAppContext** — pass `loadAppContext: false` when your task doesn't need CFML mappings/settings; reduces overhead and avoids context conflicts.

## Building Pipelines

```boxlang
// Chain transformations with then()
var result = async()
    .newFuture( () => orderService.getOrders() )
    .then( ( orders ) => orders.filter( ( o ) => o.isPending() ) )
    .then( ( pending ) => pending.map( ( o ) => o.getMemento() ) )
    .get()  // blocking wait for final result

// Combine two futures
var combined = async()
    .newFuture( () => userService.getUser( userId ) )
    .thenCombine(
        async().newFuture( () => orderService.getOrders( userId ) ),
        ( user, orders ) => { user: user, orders: orders }
    )
    .get()

// Handle errors in pipeline
var safe = async()
    .newFuture( () => riskyService.fetch() )
    .exceptionally( ( ex ) => defaultValue )
    .get()

// Timeout an individual future
var result = async()
    .newFuture( () => slowService.compute() )
    .get( 5000, "milliseconds" )  // throws TimeoutException on expiry
```

## Parallel Computations

### all() — Wait for ALL results

```boxlang
// Pass closures or existing futures
var results = async()
    .newFuture()
    .all(
        () => hyper.post( "/service-a" ),
        () => hyper.post( "/service-b" ),
        () => hyper.post( "/service-c" )
    )
    .get()  // returns array of results in order

// With timeout across all
var results = async()
    .newFuture()
    .withTimeout( 10, "seconds" )
    .all( f1, f2, f3 )
    .get()
```

### allApply() — Parallel map over a collection

```boxlang
// Array input — process each element in parallel
var mementos = async().allApply(
    orderService.findAll(),
    ( order ) => order.getMemento()
)

// Struct input — result object has key + value
var processed = async().allApply(
    configMap,
    ( item ) => item.key & "=" & item.value.toString()
)

// Custom executor for big workloads
var results = async().allApply(
    hugeList,
    ( item ) => processItem( item ),
    async().$executors.newFixedThreadPool( 50 )
)
```

### anyOf() — Return the FASTEST result

```boxlang
// Race multiple futures — first to complete wins
var fastestDns = async()
    .newFuture()
    .anyOf(
        () => dns1.resolve( "example.com" ),
        () => dns2.resolve( "example.com" )
    )
    .get()
```

## Executors

### Executor Types

| Type | Default Threads | Best For |
|------|----------------|----------|
| `fixed` | 20 | Worker pools, multiple parallel tasks |
| `cached` | unbounded (60s TTL) | Variable load, bursty workloads |
| `single` | 1 | Sequential FIFO ordering |
| `scheduled` | 20 | Periodic / one-off scheduled tasks |

### Registering & Using Executors

```boxlang
// Register a named executor (singleton — reused on subsequent calls)
var pool = async().newExecutor( "myWorkers", "fixed", 10 )

// Shortcuts
var scheduled = async().newScheduledExecutor( "heartbeat", 5 )
var singleQ   = async().newSingleExecutor( "auditQueue" )
var elastic   = async().newCachedExecutor( "httpPool" )

// Use executor for a future
var f = async().newFuture( () => work(), pool )

// Executor management
async().hasExecutor( "myWorkers" )      // boolean
async().getExecutorNames()              // array
async().shutdownExecutor( "myWorkers" ) // graceful
async().deleteExecutor( "myWorkers" )   // shutdown + remove
async().shutdownAllExecutors()

// Status snapshot
var stats = async().getExecutorStatusMap()
```

## Handler Usage Patterns

```boxlang
class DataHandler extends coldbox.system.EventHandler {

    @inject("asyncManager@coldbox")
    property name="asyncManager";

    // Return a future directly — ColdBox renders when it resolves
    function index( event, rc, prc ) {
        return asyncManager.allApply(
            orderService.findAll(),
            ( order ) => order.getMemento()
        )
    }

    // Fire-and-forget background task
    function triggerReport( event, rc, prc ) {
        async().newFuture(
            () => reportService.buildReport( rc.reportId ),
            loadAppContext: false
        )
        event.renderData( data: { queued: true }, statusCode: 202 )
    }
}
```

## Key Rules

- **Never call `get()` on the main request thread** for long-running background work — it blocks the HTTP response. Use `get()` only when you genuinely need a synchronous result.
- Use `loadAppContext: false` for pure computation tasks that don't need CFML mappings.
- Prefer `allApply()` over manual looping for parallel collection processing.
- Use `withNoOverlaps()` on scheduled tasks to prevent stacking (see scheduled-tasks skill).
- Register long-lived executors once at startup, not per-request.