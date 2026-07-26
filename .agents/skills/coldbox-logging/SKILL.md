---
name: coldbox-logging
description: >
  Use this skill for all ColdBox-specific logging concerns: configuring LogBox inside a ColdBox application
  (config/LogBox.cfc, inline DSL, configFile pointer), per-environment log levels, injecting loggers into
  handlers/interceptors/services via the WireBox logbox DSL, accessing logbox from the ColdBox proxy,
  and logging best practices specific to the ColdBox lifecycle.
applyTo: "**/*.{bx,cfc,cfm,bxm}"
---

# ColdBox Logging Skill

## When to Use This Skill

Load this skill when:
- Configuring LogBox inside a ColdBox application
- Choosing between `config/LogBox.cfc`, inline `logbox` DSL, or a `configFile` pointer
- Setting per-environment log levels (development vs production) in `ColdBox.cfc`
- Injecting loggers into handlers, interceptors, services, or models
- Accessing LogBox from a ColdBox proxy
- Combining LogBox with ColdBox lifecycle events (interceptors, error handling)

> For standalone LogBox concepts (appenders, layouts, custom appenders), load the **logbox** skill.

## Language Mode Reference

| Concept | BoxLang (`.bx`) | CFML (`.cfc`) |
|---------|-----------------|---------------|
| Class declaration | `class [extends="..."] {` | `component [extends="..."] {` |
| DI annotation | `@inject` above property | `property name="x" inject="y";` |
| Handler base | `extends="coldbox.system.EventHandler"` | same |
| Interceptor base | `extends="coldbox.system.Interceptor"` | same |

## How ColdBox Loads LogBox

ColdBox resolves your LogBox configuration in this order:

1. Is there a `logbox` variable in `config/ColdBox.cfc` `configure()`?
   - **No** ? Does `config/LogBox.cfc` exist? **Yes** ? use it by convention. **No** ? use ColdBox framework defaults.
   - **Yes** ? Does it have a `configFile` key? **Yes** ? load that CFC. **No** ? treat the struct as inline DSL.

Default ColdBox configuration (if you define nothing):

```cfscript
logBox = {
    appenders : {
        console : { class : "coldbox.system.logging.appenders.DummyAppender" }
    },
    root : { levelMax : "OFF", levelMin : "OFF", appenders : "*" }
}
```

All logging is **OFF** by default. You must configure it yourself.

## Configuration Methods

### Method 1 — `config/LogBox.cfc` (recommended for large apps)

```boxlang
// config/LogBox.cfc — BoxLang
class extends="coldbox.system.logging.config.LogBoxConfig" {

    function configure() {

        appenders = {
            console : {
                class    : "coldbox.system.logging.appenders.ConsoleAppender",
                levelMin : "DEBUG",
                levelMax : "FATAL"
            },
            rolling : {
                class      : "coldbox.system.logging.appenders.RollingFileAppender",
                levelMin   : "WARN",
                levelMax   : "FATAL",
                properties : {
                    filePath        : "#getDirectoryFromPath( getBaseTemplatePath() )#logs",
                    fileName        : "app",
                    fileMaxSize     : 5000,
                    fileMaxArchives : 5
                }
            }
        }

        // Production default: WARN and above to file
        root = { levelMin : "WARN", levelMax : "FATAL", appenders : "rolling" }

        categories = {
            "coldbox.system" : { levelMin : "WARN", levelMax : "FATAL", appenders : "rolling" },
            "handlers"       : { levelMin : "INFO", levelMax : "FATAL", appenders : "console,rolling" },
            "models"         : { levelMin : "DEBUG", levelMax : "FATAL", appenders : "console" }
        }

        // Silence verbose packages
        off = [ "coldbox.system.plugins.BeanFactory" ]
    }
}
```

```cfml
// CFML
component extends="coldbox.system.logging.config.LogBoxConfig" {

    function configure() {

        appenders = {
            console : {
                class    : "coldbox.system.logging.appenders.ConsoleAppender",
                levelMin : "DEBUG",
                levelMax : "FATAL"
            },
            rolling : {
                class      : "coldbox.system.logging.appenders.RollingFileAppender",
                levelMin   : "WARN",
                levelMax   : "FATAL",
                properties : {
                    filePath        : "#getDirectoryFromPath( getBaseTemplatePath() )#logs",
                    fileName        : "app",
                    fileMaxSize     : 5000,
                    fileMaxArchives : 5
                }
            }
        }

        root       = { levelMin : "WARN", levelMax : "FATAL", appenders : "rolling" }
        categories = {
            "handlers" : { levelMin : "INFO", levelMax : "FATAL", appenders : "console,rolling" },
            "models"   : { levelMin : "DEBUG", levelMax : "FATAL", appenders : "console" }
        }
    }
}
```

### Method 2 — Inline DSL in `config/ColdBox.cfc`

```cfscript
// Inside configure()
logbox = {
    appenders : {
        console : {
            class    : "coldbox.system.logging.appenders.ConsoleAppender",
            levelMin : "DEBUG",
            levelMax : "FATAL"
        },
        rolling : {
            class      : "coldbox.system.logging.appenders.RollingFileAppender",
            levelMin   : "WARN",
            levelMax   : "FATAL",
            properties : {
                filePath        : "#getDirectoryFromPath( getBaseTemplatePath() )#logs",
                fileName        : "app",
                fileMaxSize     : 5000,
                fileMaxArchives : 5
            }
        }
    },
    root       : { levelMin : "WARN", levelMax : "FATAL", appenders : "rolling" },
    categories : {
        "handlers" : { levelMin : "INFO", levelMax : "FATAL", appenders : "console,rolling" },
        "models"   : { levelMin : "DEBUG", levelMax : "FATAL", appenders : "console" }
    }
}
```

### Method 3 — External CFC Pointer

```cfscript
// In config/ColdBox.cfc configure()
logbox = { configFile : "config.LogBox" }

// Or with a full dotted path
logbox = { configFile : "myapp.config.LogBoxProduction" }
```

## Per-Environment Log Levels

Override the `logbox` variable inside environment methods. The environment methods run **after** `configure()` and merge/override settings.

```cfscript
// config/ColdBox.cfc

function configure() {
    // Shared appender definitions
    logbox = {
        appenders : {
            console : {
                class    : "coldbox.system.logging.appenders.ConsoleAppender",
                levelMin : "DEBUG",
                levelMax : "FATAL"
            },
            rolling : {
                class      : "coldbox.system.logging.appenders.RollingFileAppender",
                levelMin   : "ERROR",
                levelMax   : "FATAL",
                properties : {
                    filePath        : "#getDirectoryFromPath( getBaseTemplatePath() )#logs",
                    fileName        : "app",
                    fileMaxSize     : 5000,
                    fileMaxArchives : 5
                }
            },
            emailAlert : {
                class      : "coldbox.system.logging.appenders.EmailAppender",
                levelMin   : "FATAL",
                levelMax   : "FATAL",
                properties : {
                    from    : "errors@example.com",
                    to      : "ops@example.com",
                    subject : "[PROD FATAL] Application Error"
                }
            }
        },
        // Default: production-safe
        root       : { levelMin : "ERROR", levelMax : "FATAL", appenders : "rolling" },
        categories : {}
    }
}

// Development: log everything to console only
function development() {
    logbox.root = { levelMin : "DEBUG", levelMax : "FATAL", appenders : "console" }
    logbox.categories[ "coldbox.system" ] = { levelMin : "WARN", levelMax : "FATAL", appenders : "console" }
}

// Staging: INFO+ to console and file, no email alerts
function staging() {
    logbox.root = { levelMin : "INFO", levelMax : "FATAL", appenders : "console,rolling" }
}

// Production: WARN+ to file, FATAL emails ops
function production() {
    logbox.root = { levelMin : "WARN", levelMax : "FATAL", appenders : "rolling,emailAlert" }
}
```

## WireBox Injection DSL

Inject loggers into any WireBox-managed component. The `logbox:` DSL prefix is always available inside ColdBox.

| DSL Token | Returns |
|-----------|---------|
| `logbox` | The application LogBox instance |
| `logbox:root` | The root logger |
| `logbox:logger:{this}` | Logger whose category = current class path (most common) |
| `logbox:logger:category.name` | Logger for a specific named category |

### Handlers

```boxlang
// BoxLang handler
class extends="coldbox.system.EventHandler" {

    @inject( "logbox:logger:{this}" )
    property name="log";

    function index( event, rc, prc ) {
        log.info( "Rendering index, user=##rc.userId" )

        try {
            prc.data = userService.listActive()
        } catch( any e ) {
            log.error( "Failed to load users", e )
            event.setHTTPHeader( statusCode : 500 )
            return "error"
        }
    }
}
```

```cfml
// CFML handler
component extends="coldbox.system.EventHandler" {

    property name="log" inject="logbox:logger:{this}";

    function index( event, rc, prc ) {
        log.info( "Rendering index, user=##rc.userId" )

        try {
            prc.data = userService.listActive()
        } catch( any e ) {
            log.error( "Failed to load users", e )
            event.setHTTPHeader( statusCode : 500 )
            return "error"
        }
    }
}
```

### Interceptors

```boxlang
// BoxLang interceptor
class extends="coldbox.system.Interceptor" {

    @inject( "logbox:logger:{this}" )
    property name="log";

    function preProcess( event, interceptData, rc, prc ) {
        if( log.canDebug() ) {
            log.debug( "Incoming request: ##event.getCurrentRoutedURL()", {
                method : event.getHTTPMethod(),
                user   : prc.oCurrentUser?.getId() ?: "anonymous"
            } )
        }
    }

    function onException( event, interceptData, rc, prc ) {
        log.error(
            "Unhandled exception on ##event.getCurrentEvent()",
            {
                type    : interceptData.exception.type,
                message : interceptData.exception.message,
                detail  : interceptData.exception.detail
            }
        )
    }
}
```

```cfml
// CFML interceptor
component extends="coldbox.system.Interceptor" {

    property name="log" inject="logbox:logger:{this}";

    function preProcess( event, interceptData, rc, prc ) {
        if( log.canDebug() ) {
            log.debug( "Incoming request: ##event.getCurrentRoutedURL()" )
        }
    }

    function onException( event, interceptData, rc, prc ) {
        log.error( "Unhandled exception", interceptData.exception )
    }
}
```

### Models / Services

```boxlang
class PaymentService {

    @inject( "logbox:logger:{this}" )
    property name="log";

    function charge( required order ) {
        log.info( "Charging order ##order.getId()", { amount : order.getTotal() } )

        try {
            var result = gateway.process( order )
            log.info( "Charge successful", { transactionId : result.id } )
            return result
        } catch( GatewayException e ) {
            log.error( "Gateway error on order ##order.getId()", {
                error   : e.message,
                code    : e.errorCode,
                orderId : order.getId()
            } )
            rethrow
        }
    }
}
```

```cfml
component {

    property name="log" inject="logbox:logger:{this}";

    function charge( required order ) {
        log.info( "Charging order ##order.getId()", { amount : order.getTotal() } )

        try {
            var result = gateway.process( order )
            log.info( "Charge successful", { transactionId : result.id } )
            return result
        } catch( GatewayException e ) {
            log.error( "Gateway error on order ##order.getId()", e )
            rethrow
        }
    }
}
```

## Accessing LogBox Programmatically

Inside any ColdBox component you can reach LogBox through the `controller`:

```cfscript
// Inside a handler or interceptor (has access to the controller)
var logbox = controller.getLogBox()
var log    = logbox.getLogger( this )

// Inside application.cfc after bootstrap
var logbox = application.cbController.getLogBox()
```

## LogBox from the ColdBox Proxy

When calling ColdBox from a non-ColdBox context (Flex, REST, legacy pages):

```cfscript
// In your ColdBox Proxy
component extends="coldbox.system.remote.ColdboxProxy" {

    function processPayment( required amount ) {
        var log = getLogBox().getLogger( this )
        log.info( "Proxy payment request", { amount : arguments.amount } )

        try {
            return process( event="api.payments.process", collection={ amount : arguments.amount } )
        } catch( any e ) {
            log.error( "Proxy payment failed", e )
            rethrow
        }
    }
}
```

## Logging in ColdBox Error Handling

Use an `onException` interceptor (preferred over `onError` in Application.cfc) for centralized error logging:

```boxlang
// interceptors/GlobalExceptionLogger.bx
class extends="coldbox.system.Interceptor" {

    @inject( "logbox:logger:{this}" )
    property name="log";

    function onException( event, interceptData, rc, prc ) {
        var exception = interceptData.exception

        log.error(
            "Unhandled exception [##exception.type##]: ##exception.message##",
            {
                type       : exception.type,
                message    : exception.message,
                detail     : exception.detail,
                stackTrace : exception.stackTrace ?: "",
                event      : event.getCurrentEvent(),
                url        : event.getCurrentRoutedURL()
            }
        )
    }
}
```

Register in `config/ColdBox.cfc`:

```cfscript
interceptors = [
    { class : "interceptors.GlobalExceptionLogger", name : "GlobalExceptionLogger" }
]
```

## Category Naming Conventions in ColdBox

Always use dot-notation that mirrors your component path. This enables **category inheritance** — configuring a parent category covers all children.

| Component Path | Recommended Logger Injection |
|---------------|------------------------------|
| `handlers.UserHandler` | `logbox:logger:{this}` ? category `handlers.UserHandler` |
| `models.services.PaymentService` | `logbox:logger:{this}` ? category `models.services.PaymentService` |
| `interceptors.SecurityInterceptor` | `logbox:logger:{this}` ? category `interceptors.SecurityInterceptor` |
| `modules.myModule.models.Repo` | `logbox:logger:{this}` ? category `modules.myModule.models.Repo` |

Configure once at the package level to cover all descendants:

```cfscript
categories = {
    // All handlers — INFO and above
    "handlers"   : { levelMin : "INFO", levelMax : "FATAL", appenders : "console,rolling" },
    // All models — DEBUG in dev (overridden per environment)
    "models"     : { levelMin : "DEBUG", levelMax : "FATAL", appenders : "console" },
    // All interceptors — INFO and above
    "interceptors" : { levelMin : "INFO", levelMax : "FATAL", appenders : "rolling" }
}
```

## Performance Patterns

### Always guard expensive debug messages

```cfscript
// Bad — serialization always happens
log.debug( "Request context: #serializeJSON( rc )#" )

// Good — only evaluated when DEBUG is enabled
if( log.canDebug() ) {
    log.debug( "Request context: #serializeJSON( rc )#" )
}

// Best — closure avoids the if statement
log.debug( () => "Request context: #serializeJSON( rc )#" )
```

### Avoid logging entire request/response objects in production

```cfscript
// Bad — may log sensitive headers, tokens, PII
log.debug( "Request", getHTTPRequestData() )

// Good — log only what you need, explicitly
log.debug( "Request", {
    method : event.getHTTPMethod(),
    route  : event.getCurrentRoutedURL(),
    userId : prc.currentUser?.getId() ?: "anon"
} )
```

## ColdBox Logging Best Practices

- **Use `config/LogBox.cfc`** for complex configurations; inline DSL for simple or environment-only overrides
- **Per-environment overrides belong in `development()` / `staging()` / `production()` methods** in `ColdBox.cfc`
- **Inject `logbox:logger:{this}`** in every handler, service, and interceptor — the category auto-matches the class path
- **Never use `writeOutput()` or `cflog` for application logging** — route everything through LogBox for consistency, filtering, and format control
- **Production minimum: WARN** — only warnings and above to rolling file; FATAL to email
- **Development maximum: DEBUG to console** — no file I/O overhead; instant feedback
- **Log security events at INFO or WARN**: login attempts, permission denials, suspicious inputs
- **Log business events at INFO**: order placed, payment processed, account created
- **Log integrations at DEBUG**: external API calls, response codes, latency
- **Always include context in `extraInfo`** (user ID, order ID, relevant IDs) — makes log searching dramatically faster
- **Register a global `onException` interceptor** for centralized error capture instead of scattered try/catch logging