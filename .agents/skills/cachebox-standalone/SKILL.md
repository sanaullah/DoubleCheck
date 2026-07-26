---
name: cachebox-standalone
description: "Use this skill when working with CacheBox as a standalone caching framework (outside ColdBox) -- installing, creating and bootstrapping the CacheFactory, configuring the DSL, choosing object stores and eviction policies, selecting cache providers (CacheBoxProvider, CF, Lucee), implementing cache-aside/stampede-protection patterns, registering standalone listeners, named caches, disk/JDBC stores, reaping, shutdown, or monitoring cache performance."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# CacheBox — Standalone Framework

## When to Use This Skill

Use this skill when using CacheBox **outside of a ColdBox application** — as a pure standalone caching library. For ColdBox-integrated caching (WireBox injection, event/view caching, `@cacheable`), use the `coldbox-cache-integration` skill instead.

## Language Mode Reference

Examples use **CFML script** unless noted. For BoxLang replace `component` with `class` and use `cachebox.system` or `coldbox.system` depending on build.

---

## Core Concepts

CacheBox is an enterprise-grade, standalone caching aggregator for ColdFusion/BoxLang that:

- Aggregates multiple named cache providers under one API
- Ships built-in storage backends: RAM (ConcurrentStore), memory-sensitive (ConcurrentSoftReferenceStore), Disk, and JDBC
- Provides pluggable eviction policies: LRU, LFU, FIFO, LIFO, custom
- Broadcasts a rich event model through cache listeners
- Runs embedded in ColdBox or as a pure standalone library

> **Namespace**: Standalone = `cachebox.system.*`; ColdBox-embedded = `coldbox.system.*`

---

## 1. Installation (Standalone)

```bash
box install cachebox
```

Map the installed folder in `Application.cfc`:

```cfscript
this.mappings[ "/cachebox" ] = expandPath( "/path/to/cachebox" );
```

If using CacheBox **inside ColdBox**, skip installation — it is already included.

---

## 2. Modes of Operation

| Mode | Who creates CacheBox | Note |
|------|---------------------|------|
| **Standalone** | You — in `onApplicationStart` | Persist in `application` scope or WireBox |
| **ColdBox embedded** | ColdBox framework | Use `coldbox-cache-integration` skill |

---

## 3. Creating the CacheFactory

### 3a. Zero config (default settings)

```cfscript
application.cacheBox = new cachebox.system.cache.CacheFactory();
var cache = application.cacheBox.getDefaultCache();

cache.set( "myKey", { name : "Luis" }, 60, 20 ); // 60 min TTL, 20 min idle
var obj = cache.get( "myKey" );
```

### 3b. Portable CFC config (recommended for production)

Create `config/CacheBox.cfc`:

```cfscript
component {

    function configure() {
        cacheBox = {
            // Used only in standalone mode for console/file logging
            logBoxConfig : "cachebox.system.cache.config.LogBox",

            // Auto-registers the factory in application scope as application.cacheBox
            scopeRegistration : {
                enabled : true,
                scope   : "application",
                key     : "cacheBox"
            },

            // MANDATORY. Name "default" is reserved; provider cannot be changed.
            // All timeouts are in MINUTES.
            defaultCache : {
                objectDefaultTimeout           : 60,
                objectDefaultLastAccessTimeout : 30,
                useLastAccessTimeouts          : true,
                reapFrequency                  : 2,
                freeMemoryPercentageThreshold  : 0,    // 0 = no JVM memory check
                evictionPolicy                 : "LRU",
                evictCount                     : 1,
                maxObjects                     : 300,
                objectStore                    : "ConcurrentSoftReferenceStore",
                coldboxEnabled                 : false, // MUST be false in standalone mode
                resetTimeoutOnAccess           : false
            },

            // Named caches — add as many domains as needed
            caches : {
                // Fast, guaranteed in-memory cache for database queries
                queryCache : {
                    provider   : "cachebox.system.cache.providers.CacheBoxProvider",
                    properties : {
                        objectDefaultTimeout           : 30,
                        objectDefaultLastAccessTimeout : 15,
                        maxObjects                     : 500,
                        objectStore                    : "ConcurrentStore" // guaranteed — no JVM eviction
                    }
                },
                // Memory-sensitive view/fragment cache
                viewCache : {
                    provider   : "cachebox.system.cache.providers.CacheBoxProvider",
                    properties : {
                        objectDefaultTimeout           : 120,
                        objectDefaultLastAccessTimeout : 30,
                        maxObjects                     : 200,
                        objectStore                    : "ConcurrentSoftReferenceStore"
                    }
                },
                // Disk-backed cache (survives app restarts; serialises complex objects)
                diskCache : {
                    provider   : "cachebox.system.cache.providers.CacheBoxProvider",
                    properties : {
                        objectDefaultTimeout : 1440,   // 24 hours
                        maxObjects           : 1000,
                        objectStore          : "DiskStore",
                        directoryPath        : "/var/cache/myapp",
                        autoExpandPath       : false
                    }
                },
                // JDBC-backed cache (small clusters; stores in a DB table)
                dbCache : {
                    provider   : "cachebox.system.cache.providers.CacheBoxProvider",
                    properties : {
                        objectDefaultTimeout : 60,
                        maxObjects           : 1000,
                        objectStore          : "JDBCStore",
                        dsn                  : "myDatasource",
                        table                : "cachebox_objects",
                        tableAutoCreate      : true
                    }
                }
            },

            // Standalone listeners — executed in declaration order
            listeners : [
                { class : "myapp.listeners.CacheLogger", name : "CacheLogger", properties : {} }
            ]
        };
    }
}
```

Bootstrap in `Application.cfc`:

```cfscript
component {

    this.name    = "MyApp";
    // Required standalone mapping
    this.mappings[ "/cachebox" ] = expandPath( "/lib/cachebox" );
    this.mappings[ "/myapp" ]    = expandPath( "/" );

    function onApplicationStart() {
        var config = new cachebox.system.cache.config.CacheBoxConfig(
            CFCConfigPath : "config.CacheBox"
        );
        // scopeRegistration in config auto-sets application.cacheBox
        new cachebox.system.cache.CacheFactory( config );
    }

    function onRequestStart() {
        // REQUIRED in standalone mode — triggers expiry sweep per reapFrequency
        application.cacheBox.reapAll();
    }

    function onApplicationEnd( applicationScope ) {
        if ( structKeyExists( applicationScope, "cacheBox" ) ) {
            applicationScope.cacheBox.shutdown();
        }
    }
}
```

### 3c. Programmatic config

```cfscript
var config = new cachebox.system.cache.config.CacheBoxConfig()
    .scopeRegistration( true, "application", "cacheBox" )
    .defaultCache(
        maxObjects     : 200,
        objectStore    : "ConcurrentStore",
        evictionPolicy : "LRU"
    )
    .cache(
        "queryCache",
        "cachebox.system.cache.providers.CacheBoxProvider",
        { objectDefaultTimeout : 30, maxObjects : 500, objectStore : "ConcurrentStore" }
    )
    .listener( "myapp.listeners.CacheLogger", {}, "CacheLogger" );

new cachebox.system.cache.CacheFactory( config );
```

### 3d. Struct literal (inline, quick scripts)

```cfscript
new cachebox.system.cache.CacheFactory( {
    scopeRegistration : { enabled : true, scope : "application", key : "cacheBox" },
    defaultCache : {
        objectDefaultTimeout : 60,
        maxObjects           : 300,
        objectStore          : "ConcurrentSoftReferenceStore",
        coldboxEnabled       : false
    },
    caches    : {},
    listeners : []
} );
```

---

## 4. Accessing the Factory and Caches

```cfscript
// From application scope (set by scopeRegistration)
var cacheBox = application.cacheBox;

// Always-available default cache
var cache = cacheBox.getDefaultCache();

// Named cache
var queryCache = cacheBox.getCache( "queryCache" );

// All registered cache names
var names = cacheBox.getCacheNames(); // array

// Add a default-type cache at runtime
var extra = cacheBox.addDefaultCache( "SessionCache" );
```

---

## 5. Core Cache Provider API

All providers share the `ICacheProvider` API. Timeouts are in **minutes**.

```cfscript
// ?? WRITE ????????????????????????????????????????????????????????????????????
// set( key, value [, timeout [, lastAccessTimeout]] )
cache.set( "product_1", product, 60, 30 );  // 60 min TTL, 30 min idle
cache.set( "product_1", product );          // use configured defaults
cache.set( "config_data", data, 0, 0 );    // eternal (lives until explicit clear)

// ?? READ ?????????????????????????????????????????????????????????????????????
var val = cache.get( "product_1" );         // null if missing or expired; resets idle timer
var val = cache.getQuiet( "product_1" );    // null if missing or expired; does NOT reset idle timer

// ?? CHECK ????????????????????????????????????????????????????????????????????
var exists = cache.lookup( "product_1" );       // true/false, respects expiry, resets idle
var exists = cache.lookupQuiet( "product_1" );  // true/false, no idle reset

// ?? GET-OR-SET ????????????????????????????????????????????????????????????????
var product = cache.getOrSet(
    objectKey  : "product_1",
    produce    : function() { return loadProductFromDB( 1 ) },
    timeout    : 60,
    lastAccess : 30
);

// ?? METADATA ?????????????????????????????????????????????????????????????????
var meta = cache.getCachedObjectMetadata( "product_1" );
// meta.timeout, meta.lastAccessTimeout, meta.hits, meta.lastAccessed, meta.isExpired

// ?? DELETE ???????????????????????????????????????????????????????????????????
cache.clear( "product_1" );                          // single key
cache.clearByKeySnippet( "product_", false );        // all keys containing "product_"
cache.clearByKeySnippet( "^product_\d+$", true );   // regex match
cache.clearAll();                                    // all keys in this provider
cache.expireObject( "product_1" );                  // lazy expire (removed on next reap)
cache.expireAll();                                   // lazy expire entire cache

// ?? STATS ????????????????????????????????????????????????????????????????????
var keys  = cache.getKeys();    // array of all live keys
var size  = cache.getSize();    // count of live objects
var stats = cache.getStats();   // struct: hits, misses, evictions, performance
```

---

## 6. Cache Patterns

### Simple cache-aside

```cfscript
function getProduct( required numeric id ) {
    var key     = "product_#id#"
    var product = cache.get( key )

    if ( !isNull( product ) ) {
        return product
    }

    product = productGateway.findById( id )
    cache.set( key, product, 60, 30 )
    return product
}
```

### `getOrSet()` (preferred, eliminates null-check boilerplate)

```cfscript
function getProduct( required numeric id ) {
    return cache.getOrSet(
        objectKey  : "product_#id#",
        produce    : function() { return productGateway.findById( id ) },
        timeout    : 60,
        lastAccess : 30
    )
}
```

### Stampede protection (double-checked locking)

Use under high concurrency when the loader is expensive:

```cfscript
function getWithStampedeProtection( required string key, required any loader, numeric timeout = 60 ) {
    // Fast path — no lock
    var value = cache.get( key )
    if ( !isNull( value ) ) { return value }

    // Slow path — only one thread loads; others wait, then read from cache
    lock name="cache_load_#key#" timeout="15" throwontimeout="false" type="exclusive" {
        value = cache.get( key )  // re-check inside lock
        if ( isNull( value ) ) {
            value = loader()
            cache.set( key, value, timeout )
        }
    }
    return value
}
```

### Write-through

```cfscript
function save( required struct entity ) {
    var saved = repository.save( entity )
    cache.set( "entity_#saved.id#", saved, 60, 30 )
    return saved
}

function delete( required numeric id ) {
    repository.delete( id )
    cache.clear( "entity_#id#" )
    cache.clearByKeySnippet( "entity_list_" )  // invalidate related list caches
}
```

### Cache warming on startup

```cfscript
// myapp/listeners/CacheWarmer.cfc (standalone listener)
component {

    function configure( required any cacheBox, required struct properties ) {
        variables.cacheBox = arguments.cacheBox;
    }

    function afterCacheFactoryConfiguration( interceptData ) {
        var cache    = variables.cacheBox.getCache( "queryCache" )
        var products = new myapp.gateways.ProductGateway().findAllActive()
        for ( var p in products ) {
            cache.set( "product_#p.id#", p, 240 )
        }
    }
}
```

---

## 7. Cache Providers Reference

| Provider | Use when |
|----------|----------|
| `cachebox.system.cache.providers.CacheBoxProvider` | **Standalone apps** — native CacheBox engine |
| `cachebox.system.cache.providers.CacheBoxColdBoxProvider` | ColdBox apps (default cache only, `coldboxEnabled:true`) |
| `cachebox.system.cache.providers.CFProvider` | Delegate to Adobe CF built-in cache (standalone) |
| `cachebox.system.cache.providers.CFColdBoxProvider` | Delegate to Adobe CF built-in cache (ColdBox) |
| `cachebox.system.cache.providers.LuceeProvider` | Delegate to Lucee built-in cache (standalone) |
| `cachebox.system.cache.providers.LuceeColdBoxProvider` | Delegate to Lucee built-in cache (ColdBox) |
| `cachebox.system.cache.providers.MockProvider` | Testing / no-op |

**Always use `CacheBoxProvider` in standalone apps unless delegating to the CFML engine cache.**

---

## 8. Object Stores Reference

Object stores define where `CacheBoxProvider` physically stores objects:

| Store | Retention | Best For |
|-------|-----------|----------|
| `ConcurrentStore` | Guaranteed until evicted/expired/cleared | General data, queries — objects won't disappear under memory pressure |
| `ConcurrentSoftReferenceStore` | JVM may collect under heap pressure | View/fragment caching; memory-sensitive use cases |
| `DiskStore` | Survives restarts; disk I/O cost | Large payloads, cross-restart persistence |
| `JDBCStore` | Database-backed; survives restarts | Small clusters needing shared/centralised cache |

#### DiskStore extra properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `directoryPath` | string | ? | — | Path to store files |
| `autoExpandPath` | boolean | ? | `true` | Expand relative paths with `expandPath()` |

#### JDBCStore extra properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `dsn` | string | ? | — | Datasource name |
| `table` | string | ? | — | Table name |
| `dsnUsername` | string | ? | — | DSN username |
| `dsnPassword` | string | ? | — | DSN password |
| `tableAutoCreate` | boolean | ? | `true` | Auto-create table if missing |

> **ACF + JDBCStore inside `<cftransaction>`**: All DB tags must use identical `dsn`/username/password. Omit them and rely on `this.datasource` in `Application.cfc` to avoid the _"Usernames and Passwords must be the same"_ error.

---

## 9. Eviction Policies

| Policy | Algorithm | Use When |
|--------|-----------|----------|
| **LRU** (default) | Evicts least recently accessed | General-purpose |
| **LFU** | Evicts least frequently accessed | Hot-spot key sets |
| **FIFO** | Evicts oldest inserted | Queue semantics |
| **LIFO** | Evicts newest inserted | Stack semantics |
| Custom path | Your `IEvictionPolicy` impl | Special requirements |

> Eternal objects (`timeout = 0`) are **never** evicted by policy — they live until explicit `clear()` or factory `shutdown()`.

---

## 10. Reaping (Standalone Mandatory)

CacheBox does not self-reap in standalone mode. Trigger on every request:

```cfscript
function onRequestStart() {
    // Internally throttled to reapFrequency — safe to call every request
    application.cacheBox.reapAll();
}
```

---

## 11. CacheFactory Management Methods

```cfscript
var cacheBox = application.cacheBox;

cacheBox.addCache( myCustomCacheInstance );              // register a pre-built provider
cacheBox.addDefaultCache( "TempCache" );                // add default-type cache by name
cacheBox.removeCache( "TempCache" );                   // unregister and shut down a cache
cacheBox.replaceCache( original, decorated );           // swap with a decorated instance
cacheBox.expireAll();                                   // lazy-expire everything in all caches
cacheBox.clearAll();                                    // immediately clear all caches
cacheBox.reapAll();                                     // sweep all caches for expired objects
cacheBox.shutdown();                                    // graceful shutdown (always call on app stop)
cacheBox.getCacheNames();                               // array of registered cache names
cacheBox.isCacheRegistered( "queryCache" );             // boolean
```

---

## 12. Standalone Cache Listeners

Listeners are CFCs with methods named after the events they handle. **Order of execution = declaration order.**

```cfscript
// myapp/listeners/CacheLogger.cfc
component {

    // standalone configure signature — receives the factory + properties
    function configure( required any cacheBox, required struct properties ) {
        variables.cacheBox = arguments.cacheBox;
        variables.log      = arguments.cacheBox.getLogBox().getLogger( this );
    }

    // ?? CacheFactory events ????????????????????????????????????????????????
    function afterCacheFactoryConfiguration( interceptData ) {
        variables.log.info( "CacheBox ready. Caches: #variables.cacheBox.getCacheNames().toList()#" );
    }

    function beforeCacheFactoryShutdown( interceptData ) {
        variables.log.warn( "CacheBox shutting down" );
    }

    // ?? CacheBoxProvider events ????????????????????????????????????????????
    function afterCacheElementInsert( interceptData ) {
        variables.log.debug(
            "INSERT [#interceptData.cache.getName()#] #interceptData.cacheObjectKey# ttl=#interceptData.cacheObjectTimeout#"
        );
    }

    function afterCacheElementRemoved( interceptData ) {
        variables.log.debug(
            "REMOVE [#interceptData.cache.getName()#] #interceptData.cacheObjectKey#"
        );
    }

    function afterCacheElementExpired( interceptData ) {
        variables.log.debug(
            "EXPIRE [#interceptData.cache.getName()#] #interceptData.cacheObjectKey#"
        );
    }

    function afterCacheClearAll( interceptData ) {
        variables.log.info( "CLEAR ALL [#interceptData.cache.getName()#]" );
    }
}
```

### CacheFactory event reference

| Event | `interceptData` keys | When fired |
|-------|----------------------|-----------|
| `afterCacheFactoryConfiguration` | `cacheFactory` | After factory is fully started |
| `beforeCacheFactoryShutdown` | `cacheFactory` | Before graceful shutdown |
| `afterCacheFactoryShutdown` | `cacheFactory` | After shutdown completes |
| `afterCacheRegistration` | `cache` | After `addCache()` |
| `beforeCacheRemoval` | `cache` | Before `removeCache()` |
| `afterCacheRemoval` | `cache` (name string) | After cache removed |
| `beforeCacheReplacement` | `oldCache`, `newCache` | Before `replaceCache()` |
| `beforeCacheShutdown` | `cache` | Before individual cache shutdown |
| `afterCacheShutdown` | `cache` | After individual cache shutdown |

### CacheBoxProvider event reference

| Event | `interceptData` keys | When fired |
|-------|----------------------|-----------|
| `afterCacheElementInsert` | `cache`, `cacheObject`, `cacheObjectKey`, `cacheObjectTimeout`, `cacheObjectLastAccessTimeout` | After `set()` inserts a new key |
| `afterCacheElementUpdated` | `cache`, `cacheNewObject`, `cacheOldObject` | After `set()` replaces existing key |
| `afterCacheElementRemoved` | `cache`, `cacheObjectKey` | After `clear()` |
| `afterCacheElementExpired` | `cache`, `cacheObjectKey` | Reaper found expired key |
| `afterCacheClearAll` | `cache` | After `clearAll()` |

---

## 13. Monitoring & Stats

```cfscript
var cache = application.cacheBox.getDefaultCache();

// Performance stats struct
var stats = cache.getStats();
// stats.hits, stats.misses, stats.objectsAdded, stats.evictions, etc.

// Inspect a key
var meta = cache.getCachedObjectMetadata( "product_1" );
// meta.timeout, meta.lastAccessTimeout, meta.hits, meta.lastAccessed, meta.isExpired

// Inventory
var keys = cache.getKeys();
var size = cache.getSize();
```

---

## 14. Testing (MockProvider)

Replace a real provider with a no-op mock during tests:

```cfscript
function beforeAll() {
    var cacheBox  = application.cacheBox;
    var mockCache = new cachebox.system.cache.providers.MockProvider();
    mockCache.setName( "default" );
    mockCache.setConfiguration( {} );
    mockCache.init( cacheBox );
    cacheBox.replaceCache( cacheBox.getDefaultCache(), mockCache );
}
```

---

## 15. Production Best Practices

- **Always call `shutdown()`** in `onApplicationEnd` — ensures disk/JDBC stores flush cleanly.
- **Always call `reapAll()`** in `onRequestStart` — mandatory in standalone mode.
- **Persist in `application` scope** via `scopeRegistration` or explicit assignment; never re-instantiate per request.
- **Use `ConcurrentStore`** when objects must survive JVM memory pressure. Use `ConcurrentSoftReferenceStore` for view/template caches where graceful eviction under memory pressure is acceptable.
- **`DiskStore` / `JDBCStore`** require Java-serialisable objects — structs, arrays, and simple scalars are safe; CFC instances must be serialisable.
- **Namespace all cache keys** — prefix with domain and identifier (`"product_#id#"`, `"user_#id#_prefs"`) to avoid collisions across teams/modules.
- **Separate caches by data domain** — different TTLs, sizes, and eviction policies per domain (queries vs. views vs. config).
- **Use `getOrSet()`** to eliminate null-check boilerplate and reduce stampede risk.
- **Use `clearByKeySnippet()` over `clearAll()`** when invalidating a group — avoid mass cache stampedes.
- **Eternal objects (timeout=0)** are never evicted by policy — limit to true app-lifecycle singletons (e.g., reference lookup tables).
- **Monitor `getStats()`** — low hit rates indicate key naming or TTL problems, not a need to increase `maxObjects`.
- **Order listeners intentionally** — they run in declaration order; put cache-warming listeners before auditing ones.