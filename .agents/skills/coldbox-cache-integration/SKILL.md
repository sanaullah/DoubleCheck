---
name: coldbox-cache-integration
description: "Use this skill when implementing caching inside a ColdBox application -- configuring CacheBox via ColdBox.cfc or config/CacheBox.cfc, injecting caches with WireBox (cachebox:name), using getCache() in handlers, event/view output caching with setEventCacheableEntry(), view fragment caching with renderView(cache=true), query caching, cache listeners as ColdBox interceptors, Redis/distributed provider setup, or choosing between default and template caches."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# CacheBox — ColdBox Integration

## When to Use This Skill

Use this skill when adding caching to a **ColdBox application**. For standalone CacheBox usage (no ColdBox framework), see the `cachebox-standalone` skill.

## Language Mode Reference

Examples use **BoxLang (`.bx`)** syntax by default. For CFML replace `class` with `component` and use `property name="x" inject="y";` annotations.

| Concept | BoxLang | CFML |
|---------|---------|------|
| Class | `class {` | `component {` |
| WireBox inject annotation | `@inject( "dsl" )` above property | `property name="x" inject="dsl";` |
| View files | `.bxm` | `.cfm` |

---

## 1. How ColdBox Wires CacheBox

ColdBox creates and manages a CacheBox factory automatically. No `Application.cfc` bootstrap code is needed. The factory is accessible via:

```cfscript
// From any handler, interceptor, or service
var cacheBox  = getCacheBox();          // the CacheBox factory
var defCache  = getCache();             // default cache provider
var tplCache  = getCache( "template" ); // named cache provider
```

---

## 2. Configuration

ColdBox looks for CacheBox config in this order:

1. `cachebox` DSL struct inside `config/ColdBox.cfc` ? `configure()`
2. `config/CacheBox.cfc` (portable CFC by convention — recommended)
3. Built-in defaults at `coldbox/system/web/config/CacheBox.cfc`

### 2a. Default built-in caches (no config required)

ColdBox ships with two built-in caches:

| Cache name | Object store | Purpose |
|-----------|-------------|---------|
| `default` | `ConcurrentStore` (guaranteed) | General data, objects, query results |
| `template` | `ConcurrentSoftReferenceStore` (memory-sensitive) | Event output caching, view fragment caching |

Use the defaults until you need different TTLs, size limits, or distributed providers.

### 2b. config/CacheBox.cfc (recommended for custom config)

```cfscript
// config/CacheBox.cfc
component {

    function configure() {
        cacheBox = {
            // All timeouts in MINUTES

            // MANDATORY. "default" is reserved. coldboxEnabled MUST be true in ColdBox apps.
            defaultCache : {
                objectDefaultTimeout           : 60,
                objectDefaultLastAccessTimeout : 30,
                useLastAccessTimeouts          : true,
                reapFrequency                  : 2,
                freeMemoryPercentageThreshold  : 0,
                evictionPolicy                 : "LRU",
                evictCount                     : 1,
                maxObjects                     : 300,
                objectStore                    : "ConcurrentStore",
                coldboxEnabled                 : true  // REQUIRED for ColdBox
            },

            caches : {
                // ColdBox event/view template caching — memory-sensitive is appropriate here
                template : {
                    provider   : "coldbox.system.cache.providers.CacheBoxColdBoxProvider",
                    properties : {
                        objectDefaultTimeout           : 60,
                        objectDefaultLastAccessTimeout : 30,
                        useLastAccessTimeouts          : true,
                        reapFrequency                  : 2,
                        freeMemoryPercentageThreshold  : 0,
                        evictionPolicy                 : "LRU",
                        evictCount                     : 2,
                        maxObjects                     : 300,
                        objectStore                    : "ConcurrentSoftReferenceStore"
                    }
                },

                // Product catalog — long TTL, guaranteed objects
                products : {
                    provider   : "coldbox.system.cache.providers.CacheBoxColdBoxProvider",
                    properties : {
                        objectDefaultTimeout : 240,   // 4 hours
                        maxObjects           : 1000,
                        objectStore          : "ConcurrentStore"
                    }
                },

                // Session/token cache — match your session timeout
                sessions : {
                    provider   : "coldbox.system.cache.providers.CacheBoxColdBoxProvider",
                    properties : {
                        objectDefaultTimeout : 30,
                        maxObjects           : 5000,
                        objectStore          : "ConcurrentStore"
                    }
                }
            }
        };
    }
}
```

### 2c. Inline DSL inside ColdBox.cfc

```cfscript
// config/ColdBox.cfc
function configure() {
    // ...other config...

    // Option A: point to an external CFC
    cacheBox = { configFile : "config.CacheBox" };

    // Option B: inline DSL  (same keys as portable CFC above)
    cacheBox = {
        defaultCache : { objectDefaultTimeout : 60, maxObjects : 300, coldboxEnabled : true },
        caches       : {}
    };
}
```

### 2d. Engine-native providers (Lucee / Adobe CF caches)

```cfscript
// config/CacheBox.cfc  — add after the default caches block
if ( listFindNoCase( "Lucee", server.coldfusion.productname ) ) {
    cacheBox.caches.luceeCache = {
        provider : "coldbox.system.cache.providers.LuceeColdBoxProvider"
    };
} else {
    cacheBox.caches.cfCache = {
        provider : "coldbox.system.cache.providers.CFColdBoxProvider"
    };
}
```

### 2e. Redis provider (`cbRedis` module)

```bash
box install cbRedis
```

```cfscript
// config/CacheBox.cfc
caches : {
    redis : {
        provider   : "cbRedis.models.providers.RedisProvider",
        properties : {
            host                 : getSystemSetting( "REDIS_HOST", "localhost" ),
            port                 : getSystemSetting( "REDIS_PORT", 6379 ),
            password             : getSystemSetting( "REDIS_PASSWORD", "" ),
            database             : 0,
            objectDefaultTimeout : 60,
            keyPrefix            : "myapp:"
        }
    },
    // Distribute sessions across cluster nodes
    sessions : {
        provider   : "cbRedis.models.providers.RedisProvider",
        properties : {
            host                 : getSystemSetting( "REDIS_HOST", "localhost" ),
            port                 : getSystemSetting( "REDIS_PORT", 6379 ),
            objectDefaultTimeout : 30,
            keyPrefix            : "myapp:session:"
        }
    }
}
```

---

## 3. Injecting Caches with WireBox

Use WireBox DSL to inject cache providers into any managed component (services, handlers, interceptors).

**BoxLang:**

```cfscript
class ProductService {

    // Inject by name — resolves to the named cache provider
    @inject( "cachebox:default" )
    property name="cache";

    @inject( "cachebox:products" )
    property name="productCache";

    @inject( "cachebox:template" )
    property name="templateCache";

    // Inject the full CacheBox factory (to resolve caches dynamically)
    @inject( "cachebox" )
    property name="cacheBox";

    function getCacheByName( required string name ) {
        return cacheBox.getCache( name )
    }
}
```

**CFML:**

```cfscript
component {

    property name="cache"         inject="cachebox:default";
    property name="productCache"  inject="cachebox:products";
    property name="templateCache" inject="cachebox:template";
    property name="cacheBox"      inject="cachebox";
}
```

### From handlers/interceptors (no injection needed)

```cfscript
// Available directly in handlers and interceptors via controller helpers
var cache    = getCache();             // default cache
var tpl      = getCache( "template" );
var cacheBox = getCacheBox();
```

---

## 4. Core Cache API (Same for All Providers)

All timeouts are in **minutes**.

```cfscript
// ?? WRITE ????????????????????????????????????????????????????????????????????
cache.set( "product_1", product, 60, 30 );   // TTL=60, idle=30
cache.set( "product_1", product );           // use configured defaults
cache.set( "config", data, 0, 0 );          // eternal

// ?? READ ?????????????????????????????????????????????????????????????????????
var val = cache.get( "product_1" );          // null if missing/expired
var val = cache.getQuiet( "product_1" );    // does not reset idle timer

// ?? GET-OR-SET ????????????????????????????????????????????????????????????????
var product = cache.getOrSet(
    objectKey  : "product_1",
    produce    : function() { return productRepository.findById( 1 ) },
    timeout    : 60,
    lastAccess : 30
);

// ?? CHECK ????????????????????????????????????????????????????????????????????
var exists = cache.lookup( "product_1" );
var exists = cache.lookupQuiet( "product_1" ); // no idle reset

// ?? DELETE ???????????????????????????????????????????????????????????????????
cache.clear( "product_1" );
cache.clearByKeySnippet( "product_", false );        // all keys containing snippet
cache.clearByKeySnippet( "^product_\d+$", true );   // regex
cache.clearAll();
cache.expireObject( "product_1" );    // lazy expire

// ?? INSPECT ??????????????????????????????????????????????????????????????????
var meta  = cache.getCachedObjectMetadata( "product_1" );
var keys  = cache.getKeys();
var size  = cache.getSize();
var stats = cache.getStats();
```

---

## 5. Service-Layer Cache Patterns

### Simple cache-aside

**BoxLang:**

```cfscript
class ProductService {

    @inject( "cachebox:products" )
    property name="cache";

    function getById( required numeric id ) {
        var key     = "product_#id#"
        var product = cache.get( key )

        if ( !isNull( product ) ) {
            return product
        }

        product = productRepository.findById( id )
        cache.set( key, product, 60, 30 )
        return product
    }

    function list( numeric page = 1, numeric limit = 25 ) {
        return cache.getOrSet(
            objectKey  : "products_list_#page#_#limit#",
            produce    : function() { return productRepository.list( page = page, limit = limit ) },
            timeout    : 30,
            lastAccess : 15
        )
    }

    function save( required struct product ) {
        var saved = productRepository.save( product )
        // Write-through
        cache.set( "product_#saved.id#", saved, 60, 30 )
        // Invalidate related list caches
        cache.clearByKeySnippet( "products_list_" )
        return saved
    }

    function delete( required numeric id ) {
        productRepository.delete( id )
        cache.clear( "product_#id#" )
        cache.clearByKeySnippet( "products_list_" )
    }
}
```

**CFML:**

```cfscript
component {

    property name="cache" inject="cachebox:products";

    function getById( required numeric id ) {
        return cache.getOrSet(
            objectKey  : "product_#id#",
            produce    : function() { return productRepository.findById( id ) },
            timeout    : 60,
            lastAccess : 30
        )
    }
}
```

### Stampede protection

```cfscript
function getExpensiveValue( required string key, required any loader, numeric timeout = 60 ) {
    var value = cache.get( key )
    if ( !isNull( value ) ) { return value }

    lock name="cache_load_#key#" timeout="15" throwontimeout="false" type="exclusive" {
        value = cache.get( key )
        if ( isNull( value ) ) {
            value = loader()
            cache.set( key, value, timeout )
        }
    }
    return value
}
```

---

## 6. Event Output Caching

Cache the entire output of a handler event. ColdBox stores the rendered HTML in the `template` cache provider.

**BoxLang:**

```cfscript
class Catalog extends coldbox.system.EventHandler {

    function index( event, rc, prc ) {
        // Cache this event's output for 60 min, idle 30 min
        event.setEventCacheableEntry(
            provider   : "template",
            timeout    : 60,
            lastAccess : 30
        )
        prc.categories = categoryService.list()
        event.setView( "catalog/index" )
    }

    function show( event, rc, prc ) {
        // Cache per product ID — different cache entry per suffix
        event.setEventCacheableEntry(
            provider   : "template",
            timeout    : 120,
            lastAccess : 60,
            suffix     : rc.id ?: "0"
        )
        prc.product = productService.getById( rc.id ?: 0 )
        event.setView( "catalog/show" )
    }
}
```

**CFML:**

```cfscript
component extends="coldbox.system.EventHandler" {

    function index( event, rc, prc ) {
        event.setEventCacheableEntry(
            provider   : "template",
            timeout    : 60,
            lastAccess : 30
        )
        prc.categories = categoryService.list()
        event.setView( "catalog/index" )
    }
}
```

> **Invalidation**: Event caches are keyed by event name + suffix. Clear them via `getCache( "template" ).clearByKeySnippet( "event_name" )` or `getCache( "template" ).clearAll()`.

---

## 7. View Fragment Caching

Cache individual view fragments inside a layout or view template. Uses the `template` cache.

```cfscript
// In a view or layout file (.bxm / .cfm)
#renderView(
    view                    = "shared/featured_products",
    cache                   = true,
    cacheTimeout            = 30,
    cacheLastAccessTimeout  = 15
)#
```

Fragment cache keys are auto-generated from the view path. Clear a fragment:

```cfscript
getCache( "template" ).clearByKeySnippet( "shared/featured_products" )
```

---

## 8. Query Caching (native CFML)

ColdFusion/Lucee/BoxLang natively cache queries with `cachedWithin`:

```cfscript
function getTopProducts() {
    return queryExecute(
        "SELECT * FROM products WHERE active = 1 ORDER BY views DESC LIMIT 10",
        {},
        {
            cachedWithin : createTimeSpan( 0, 0, 30, 0 ), // 30 minutes
            datasource   : "myapp"
        }
    )
}
```

> Use CacheBox provider caching (not query-level) when you need explicit invalidation control.

---

## 9. Cache Listeners as ColdBox Interceptors

In ColdBox, CacheBox listeners **are** ColdBox interceptors — declare them in `config/ColdBox.cfc`.

**BoxLang:**

```cfscript
// interceptors/CacheAuditInterceptor.bx
class CacheAuditInterceptor extends coldbox.system.Interceptor {

    function configure() {}

    // ?? CacheBoxProvider events ???????????????????????????????????????????
    function afterCacheElementInsert( event, interceptData, buffer ) {
        log.debug(
            "CACHE INSERT [#interceptData.cache.getName()#] #interceptData.cacheObjectKey# ttl=#interceptData.cacheObjectTimeout#"
        )
    }

    function afterCacheElementRemoved( event, interceptData, buffer ) {
        log.debug(
            "CACHE REMOVE [#interceptData.cache.getName()#] #interceptData.cacheObjectKey#"
        )
    }

    function afterCacheElementExpired( event, interceptData, buffer ) {
        log.debug(
            "CACHE EXPIRE [#interceptData.cache.getName()#] #interceptData.cacheObjectKey#"
        )
    }

    // ?? CacheFactory events ???????????????????????????????????????????????
    function afterCacheFactoryConfiguration( event, interceptData, buffer ) {
        log.info( "CacheBox configured" )
        // Good place to warm caches
        warmCriticalCaches()
    }

    function beforeCacheFactoryShutdown( event, interceptData, buffer ) {
        log.warn( "CacheBox shutting down" )
    }

    private function warmCriticalCaches() {
        var cache    = getCacheBox().getCache( "products" )
        var products = productGatewayInstance.findAllActive()
        for ( var p in products ) {
            cache.set( "product_#p.id#", p, 240, 60 )
        }
    }
}
```

**CFML:**

```cfscript
component extends="coldbox.system.Interceptor" {

    function configure() {}

    function afterCacheElementInsert( event, interceptData, buffer ) {
        log.debug( "INSERT [#interceptData.cache.getName()#] #interceptData.cacheObjectKey#" )
    }

    function afterCacheFactoryConfiguration( event, interceptData, buffer ) {
        // Warm critical caches after CacheBox starts
    }
}
```

Register in `config/ColdBox.cfc`:

```cfscript
interceptors = [
    { class : "interceptors.CacheAuditInterceptor", name : "CacheAuditInterceptor", properties : {} }
];
```

---

## 10. CacheBox Events Available to Interceptors

### CacheFactory events

| Event | `interceptData` keys |
|-------|----------------------|
| `afterCacheFactoryConfiguration` | `cacheFactory` |
| `beforeCacheFactoryShutdown` | `cacheFactory` |
| `afterCacheFactoryShutdown` | `cacheFactory` |
| `afterCacheRegistration` | `cache` |
| `beforeCacheRemoval` | `cache` |
| `afterCacheRemoval` | `cache` (name string) |
| `beforeCacheReplacement` | `oldCache`, `newCache` |
| `beforeCacheShutdown` | `cache` |
| `afterCacheShutdown` | `cache` |

### CacheBoxProvider events

| Event | `interceptData` keys |
|-------|----------------------|
| `afterCacheElementInsert` | `cache`, `cacheObject`, `cacheObjectKey`, `cacheObjectTimeout`, `cacheObjectLastAccessTimeout` |
| `afterCacheElementUpdated` | `cache`, `cacheNewObject`, `cacheOldObject` |
| `afterCacheElementRemoved` | `cache`, `cacheObjectKey` |
| `afterCacheElementExpired` | `cache`, `cacheObjectKey` |
| `afterCacheClearAll` | `cache` |

---

## 11. Named Cache Configuration Reference

### defaultCache properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `objectDefaultTimeout` | numeric | 60 | Object lifespan (minutes); 0 = eternal |
| `objectDefaultLastAccessTimeout` | numeric | 30 | Idle timeout (minutes) |
| `useLastAccessTimeouts` | boolean | true | Enable/disable idle timeout |
| `reapFrequency` | numeric | 2 | Minutes between expiry sweeps |
| `freeMemoryPercentageThreshold` | numeric | 0 | Min JVM free memory % before caching (0=unlimited) |
| `evictionPolicy` | string | LRU | LRU, LFU, FIFO, LIFO, or custom path |
| `evictCount` | numeric | 1 | Objects evicted per policy execution |
| `maxObjects` | numeric | 300 | Maximum live objects |
| `objectStore` | string | ConcurrentStore | ConcurrentStore, ConcurrentSoftReferenceStore, DiskStore, JDBCStore |
| `coldboxEnabled` | boolean | true | **Must be true** for ColdBox default cache |
| `resetTimeoutOnAccess` | boolean | false | Reset TTL on each access (session-like behaviour) |

---

## 12. Production Best Practices

- **Set `coldboxEnabled : true`** in the `defaultCache` block — required for ColdBox app integration.
- **Use the `default` cache for service/data caching** and the `template` cache exclusively for event/view output.
- **Inject caches at component level** via WireBox (`@inject( "cachebox:name" )`) — never call `getCache()` inside methods if the component is a WireBox singleton.
- **Prefer `getOrSet()`** at the service layer to eliminate null-check boilerplate.
- **Use `getCache()` / `getCacheBox()`** inside handlers and interceptors — these controller helpers spare the injection overhead for one-off use.
- **Event output caching is coarse-grained** — it caches entire event HTML; hard to selectively invalidate. Use only for read-heavy, infrequently updated pages.
- **View fragment caching** is finer-grained than event caching — prefer it over event caching when only part of a page is static.
- **Configure Redis** for multi-server / auto-scaling deployments — in-memory providers are per-process.
- **Namespace cache keys** by domain and ID (`"product_#id#"`, `"user_#id#_prefs"`) to avoid cross-domain collisions.
- **Use `clearByKeySnippet()`** to invalidate families of keys; avoid `clearAll()` which evicts everything and causes stampede.
- **Warm critical caches** in the `afterCacheFactoryConfiguration` interceptor event — fires after ColdBox starts CacheBox.
- **Monitor `getStats()`** per cache to tune TTL and `maxObjects`; low hit rates usually mean TTL is too short or keys are not reused.
- **Never cache user-specific data with a shared key** — always include user identity in the cache key.