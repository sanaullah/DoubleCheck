---
name: logbox
description: >
  Use this skill whenever working with LogBox -- standalone or inside a ColdBox application. Covers installation,
  configuration DSL (appenders, root logger, categories), all built-in appender types with their properties,
  logger injection via WireBox DSL, category inheritance, structured logging with extraInfo, performance patterns
  (can{} methods, closure messages), custom appenders, custom layouts, async logging, environment-specific config,
  and production best practices.
applyTo: "**/*.{bx,cfc,cfm,bxm}"
---

# LogBox Skill

## When to Use This Skill

Load this skill when:
- Installing or configuring LogBox (standalone or in ColdBox)
- Choosing and configuring appenders (console, file, rolling, DB, scope, socket, email)
- Setting up categories, the root logger, or category-level inheritance
- Injecting loggers into services, handlers, or interceptors via WireBox
- Using structured `extraInfo` logging or implementing `$toString()`
- Writing performant logging using `canDebug()` / closure messages
- Building custom appenders or layouts
- Configuring different log levels per environment

## Language Mode Reference

Examples default to **BoxLang (`.bx`)** syntax. Adapt as needed:

| Concept | BoxLang (`.bx`) | CFML (`.cfc`) |
|---------|-----------------|---------------|
| Class declaration | `class [extends="..."] {` | `component [extends="..."] {` |
| DI annotation | `@inject` above property | `property name="x" inject="y";` |
| Template suffix | `.bxm` | `.cfm` / `.cfml` |
| Tag prefix | `<bx:...>` | `<cf...>` |

> **CFML Compat**: BoxLang + CFML Compat module lets `.bx` and `.cfc` files coexist. Use `class {}` for BoxLang-native, `component {}` for CFML-compat.

## Architecture Overview

LogBox has five components that work together:

1. **LogBox** — central library storing loggers, appenders, categories, and configuration
2. **Logger** — sends messages to appropriate destinations according to its category
3. **Categories** — each logger has a unique category, typically a dot-notation class path
4. **Appenders** — components that receive log events and write them to a destination
5. **Layouts** — control the message format sent by an appender

## Log Levels

Levels run from most severe (0) to most verbose (5):

| Level | Int | When to Use |
|-------|-----|-------------|
| `FATAL` | 0 | Severe error — application may not recover |
| `ERROR` | 1 | Error condition — app continues |
| `WARN`  | 2 | Unexpected but non-breaking situation |
| `INFO`  | 3 | Significant business events |
| `DEBUG` | 4 | Diagnostic info useful during development |
| `OFF`   | 5 | Disable all logging for a category |

> `levelMin` / `levelMax` define the **window** of levels an appender or category accepts. Use numeric integers or string names interchangeably.

## Installation

### ColdBox Applications

LogBox is bundled with ColdBox. Configure it in `config/LogBox.cfc` (by convention) or inline in `config/ColdBox.cfc`.

### Standalone

```bash
# Install via CommandBox
box install logbox
```

Add the mapping in `Application.cfc`:

```cfscript
this.mappings[ "/logbox" ] = expandPath( "/path/to/logbox" );
```

Standalone namespace: `logbox.system.logging`
ColdBox namespace: `coldbox.system.logging`

Verify standalone installation:

```cfscript
logbox = new logbox.system.logging.LogBox();
```

## LogBox Configuration DSL

The same DSL works in all three contexts:
- `config/LogBox.cfc` — standalone CFC with `configure()` method
- `config/ColdBox.cfc` `logbox` variable — inline ColdBox config
- Struct literal passed to the `LogBox` constructor (standalone)

### Full DSL Reference

```cfscript
logBox = {
    appenders  : {},   // Required: one or more appender definitions
    root       : {},   // Required: root logger settings
    categories : {},   // Optional: named category overrides (granular)
    fatal      : [],   // Optional: array of category names ? FATAL only
    error      : [],   // Optional: array of category names ? ERROR only
    warn       : [],   // Optional: array of category names ? WARN only
    info       : [],   // Optional: array of category names ? INFO only
    debug      : [],   // Optional: array of category names ? DEBUG only
    off        : []    // Optional: array of category names ? logging off
}
```

### Appender Keys

| Key | Required | Description |
|-----|----------|-------------|
| `class` | Yes | Full class path of the appender |
| `properties` | No | Struct of appender-specific settings |
| `layout` | No | Class path of a custom layout |
| `levelMin` | No | Min level (defaults to `0` / `FATAL`) |
| `levelMax` | No | Max level (defaults to `4` / `DEBUG`) |
| `async` | No | Boolean — log asynchronously in a separate thread (default: `false`) |

### Root Logger Keys

| Key | Required | Description |
|-----|----------|-------------|
| `levelMin` | No | Min severity (defaults to `FATAL`) |
| `levelMax` | No | Max severity (defaults to `DEBUG`) |
| `appenders` | Yes | Comma-list of appender names or `"*"` for all |
| `exclude` | No | Comma-list of appenders to exclude |

### Category Keys

Same as root logger, plus `name`. When no config is found for a requested category, LogBox walks up the dot-notation hierarchy to the first ancestor that is configured, then falls back to root.

## Configuration Examples

### Standalone `config/LogBox.cfc`

```boxlang
// BoxLang
class extends="logbox.system.logging.config.LogBoxConfig" {

    function configure() {

        appenders = {
            console : {
                class    : "logbox.system.logging.appenders.ConsoleAppender",
                levelMin : "DEBUG",
                levelMax : "FATAL"
            },
            fileApp : {
                class      : "logbox.system.logging.appenders.FileAppender",
                levelMin   : "INFO",
                levelMax   : "FATAL",
                properties : {
                    filePath   : "/app/logs",
                    fileName   : "application",
                    autoExpand : false
                }
            },
            rollingApp : {
                class      : "logbox.system.logging.appenders.RollingFileAppender",
                levelMin   : "WARN",
                levelMax   : "FATAL",
                properties : {
                    filePath        : "/app/logs",
                    fileName        : "app",
                    autoExpand      : false,
                    fileMaxSize     : 5000,
                    fileMaxArchives : 5
                }
            }
        }

        root = {
            levelMin  : "WARN",
            levelMax  : "FATAL",
            appenders : "rollingApp"
        }

        categories = {
            "models"           : { levelMin : "DEBUG", levelMax : "INFO",  appenders : "console,fileApp" },
            "models.UserService" : { levelMin : "DEBUG", levelMax : "DEBUG", appenders : "console" }
        }

        // Shorthand: put these categories at DEBUG level using root appenders
        debug = [ "coldbox.system.interceptors" ]

        // Silence noisy third-party packages
        off = [ "coldbox.system.plugins.BeanFactory" ]
    }
}
```

```cfml
// CFML equivalent
component extends="coldbox.system.logging.config.LogBoxConfig" {

    function configure() {

        appenders = {
            console : {
                class    : "coldbox.system.logging.appenders.ConsoleAppender",
                levelMin : "DEBUG",
                levelMax : "FATAL"
            },
            rollingApp : {
                class      : "coldbox.system.logging.appenders.RollingFileAppender",
                levelMin   : "WARN",
                levelMax   : "FATAL",
                properties : {
                    filePath        : "/app/logs",
                    fileName        : "app",
                    autoExpand      : false,
                    fileMaxSize     : 5000,
                    fileMaxArchives : 5
                }
            }
        }

        root = { levelMin : "WARN", levelMax : "FATAL", appenders : "rollingApp" }

        categories = {
            "models" : { levelMin : "DEBUG", levelMax : "INFO", appenders : "console" }
        }
    }
}
```

### ColdBox Inline Config (`config/ColdBox.cfc`)

```cfscript
// Inside configure() — shared across all environments
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
                fileMaxArchives : 3
            }
        }
    },
    root       : { levelMin : "WARN", levelMax : "FATAL", appenders : "rolling" },
    categories : {}
}

// Development override — verbose, no file I/O
function development() {
    logbox.root = { levelMin : "DEBUG", levelMax : "FATAL", appenders : "console" }
}

// Production override — only warnings and above to rolling file
function production() {
    logbox.root = { levelMin : "WARN", levelMax : "FATAL", appenders : "rolling" }
}
```

### ColdBox Config File Pointer

```cfscript
// In config/ColdBox.cfc — point to an external file
logbox = { configFile : "config/LogBox" }
// or with a package path
logbox = { configFile : "myapp.config.LogBox" }
```

### Standalone Instantiation

```cfscript
// Direct struct config (no CFC needed)
var logbox = new logbox.system.logging.LogBox( {
    appenders : {
        console : { class : "logbox.system.logging.appenders.ConsoleAppender" }
    },
    root : { levelMax : "DEBUG", appenders : "*" }
} )

var log = logbox.getLogger( "myapp.services.UserService" )
log.info( "LogBox running standalone" )
```

## Built-In Appenders

Use the short class name (relative to `coldbox.system.logging.appenders.` or `logbox.system.logging.appenders.`) or the full path.

### ConsoleAppender

Writes to the system console/stdout. Ideal for development and Docker containers.

```cfscript
console : {
    class : "coldbox.system.logging.appenders.ConsoleAppender"
    // No required properties
}
```

### FileAppender

Writes to a single log file (appends forever — no rotation).

```cfscript
fileApp : {
    class      : "coldbox.system.logging.appenders.FileAppender",
    properties : {
        filePath     : "/app/logs",      // Required — directory path
        fileName     : "application",    // Optional — defaults to appender name
        fileEncoding : "UTF-8",          // Optional — default UTF-8
        autoExpand   : false             // Set false for absolute paths
    }
}
```

> Always set `autoExpand : false` when using absolute file paths.

### RollingFileAppender

Writes to a file and automatically rotates when the file exceeds a size limit.

```cfscript
rollingApp : {
    class      : "coldbox.system.logging.appenders.RollingFileAppender",
    properties : {
        filePath        : "/app/logs",   // Required
        fileName        : "app",         // Optional
        fileEncoding    : "UTF-8",       // Optional
        autoExpand      : false,         // Set false for absolute paths
        fileMaxSize     : 2000,          // KB — default 2000 (2 MB)
        fileMaxArchives : 2              // Number of archived files to keep — default 2
    }
}
```

### DBAppender

Writes log entries to a database table.

```cfscript
dbLog : {
    class      : "coldbox.system.logging.appenders.DBAppender",
    levelMin   : "ERROR",
    levelMax   : "FATAL",
    properties : {
        dsn          : "myDSN",        // Required
        table        : "app_logs",     // Required
        autocreate   : true,           // Create table if not exists — default false
        rotate       : true,           // Delete old records — default true
        rotationDays : 30              // Days to keep records — default 30
    }
}
```

Table columns (when `autocreate : true`): `id` (UUID), `severity`, `category`, `logdate`, `appendername`, `message`, `extrainfo`.

Use `columnMap` to alias your own column names:

```cfscript
properties : {
    dsn       : "myDSN",
    table     : "logs",
    columnMap : {
        severity   : "log_level",
        category   : "log_category",
        message    : "log_message",
        extrainfo  : "log_extra"
    }
}
```

### ScopeAppender

Stores log entries in a CF/BoxLang scope (useful for debugging in-request).

```cfscript
scopeLog : {
    class      : "coldbox.system.logging.appenders.ScopeAppender",
    properties : {
        scope : "request",          // Any valid scope — default "request"
        key   : "logs",             // Key within the scope — default appender name
        limit : 50                  // Max entries to keep (0 = unlimited, default)
    }
}
```

### SocketAppender

Transmits log events over a TCP socket.

```cfscript
socketApp : {
    class      : "coldbox.system.logging.appenders.SocketAppender",
    properties : {
        host              : "logserver.example.com",
        port              : 5000,
        timeout           : 3,
        persistConnection : false
    }
}
```

### EmailAppender

Sends log events via email (use sparingly — FATAL/ERROR only).

```cfscript
emailAlert : {
    class      : "coldbox.system.logging.appenders.EmailAppender",
    levelMin   : "FATAL",
    levelMax   : "ERROR",
    properties : {
        from    : "errors@example.com",
        to      : "ops@example.com",
        subject : "[PROD] Application Error"
    }
}
```

### Async Logging

Any appender can log asynchronously. Add `async : true` to its config:

```cfscript
fileApp : {
    class      : "coldbox.system.logging.appenders.FileAppender",
    async      : true,
    properties : { filePath : "/app/logs" }
}
```

## WireBox Injection DSL

The `logbox:` DSL prefix is available in any WireBox-managed component.

| DSL Token | Returns |
|-----------|---------|
| `logbox` | The LogBox instance itself |
| `logbox:root` | The root logger |
| `logbox:logger:{this}` | Logger whose category = current class path |
| `logbox:logger:some.category` | Logger for a specific named category |

```boxlang
// BoxLang
class UserService {

    // Best practice: category auto-matches class path
    @inject( "logbox:logger:{this}" )
    property name="log";

    // Access the LogBox instance itself
    @inject( "logbox" )
    property name="logBox";
}
```

```cfml
// CFML
component {
    property name="log"    inject="logbox:logger:{this}";
    property name="logBox" inject="logbox";
}
```

## Logger API

### Logging Methods

| Method | Description |
|--------|-------------|
| `fatal( message [, extraInfo] )` | Log at FATAL level |
| `error( message [, extraInfo] )` | Log at ERROR level |
| `warn( message [, extraInfo] )`  | Log at WARN level |
| `info( message [, extraInfo] )`  | Log at INFO level |
| `debug( message [, extraInfo] )` | Log at DEBUG level |
| `logMessage( message, severity [, extraInfo] )` | Log at any level |

`message` can be a string or a **closure** (see performance section). `extraInfo` can be any value: string, struct, query, array, object.

### Utility Methods

| Method | Description |
|--------|-------------|
| `canLog( level )` | Returns true if the given numeric level is loggable |
| `canFatal()` / `canError()` / `canWarn()` / `canInfo()` / `canDebug()` | Shorthand level checks |
| `getLevelMin()` / `getLevelMax()` | Get configured level bounds |
| `setLevelMin( level )` / `setLevelMax( level )` | Override levels at runtime |
| `getRootLogger()` | Get the root logger |
| `getCategory()` | Get this logger's category name |

### LogBox Methods

| Method | Description |
|--------|-------------|
| `getLogger( category )` | Get a logger by category string or pass `this` |
| `getRootLogger()` | Get the root logger |
| `configure( config )` | Dynamically reconfigure LogBox at runtime |
| `getCurrentAppenders()` | List of registered appender names |
| `getCurrentLoggers()` | List of instantiated logger names |

## Logger Usage Patterns

### Basic Usage in a Service

```boxlang
class OrderService {

    @inject( "logbox:logger:{this}" )
    property name="log";

    function processOrder( required order ) {
        log.info( "Processing order ##order.getId()" )

        try {
            var result = paymentGateway.charge( order )
            log.info( "Payment successful", { transactionId : result.id, amount : result.amount } )
            return result
        } catch( PaymentException e ) {
            log.error( "Payment failed for order ##order.getId()", e )
            rethrow
        }
    }
}
```

```cfml
component {

    property name="log" inject="logbox:logger:{this}";

    function processOrder( required order ) {
        log.info( "Processing order ##order.getId()" )

        try {
            var result = paymentGateway.charge( order )
            log.info( "Payment successful", { transactionId : result.id, amount : result.amount } )
            return result
        } catch( PaymentException e ) {
            log.error( "Payment failed for order ##order.getId()", e )
            rethrow
        }
    }
}
```

### Standalone Logger Access (No WireBox)

```cfscript
// Get logger by string category
var log = application.logbox.getLogger( "myapp.services.OrderService" )

// Get logger scoped to the current object (resolves to full CFC path)
var log = application.logbox.getLogger( this )
```

## Performance: Avoid Unnecessary Log Evaluation

### Problem — always evaluates the message

```cfscript
// BAD: the string interpolation runs even if DEBUG is disabled
log.debug( "User data: #serializeJSON( user )#" )
```

### Solution 1 — `can{}` guard

```cfscript
if( log.canDebug() ) {
    log.debug( "User data: #serializeJSON( user )#" )
}
```

### Solution 2 — Closure message (preferred for multi-line expressions)

```cfscript
// The closure is ONLY executed when the level is enabled
log.debug( () => "User data: #serializeJSON( user )#" )

log.debug( () => {
    var parts = []
    parts.append( "id=#user.getId()#" )
    parts.append( "email=#user.getEmail()#" )
    return parts.toList( ", " )
} )
```

Always use `canDebug()` or closure messages before any expensive serialization, query, or computation that exists solely for logging.

## Structured extraInfo and `$toString()`

`extraInfo` accepts any value. Appenders serialize it using this algorithm:

1. Simple value ? use as-is
2. Object with `$toString()` ? call it and use the return string
3. Exception ? serialize to JSON
4. Object without `$toString()` ? serialize to XML
5. Struct / array / query ? serialize to JSON

### Implement `$toString()` on domain objects

```boxlang
class User {

    function $toString() {
        return "#getName()#,#getEmail()#,#getRole()#"
    }
}
```

```cfml
component {
    function $toString() {
        return "#getName()#,#getEmail()#,#getRole()#"
    }
}
```

```cfscript
// When logged, calls user.$toString() automatically
log.debug( "User authenticated", user )

// Structured struct — serialized to JSON
log.error( "Checkout failed", {
    userId  : user.getId(),
    cart    : cart.getTotalItems(),
    error   : e.message
} )
```

## Category Inheritance

Categories use **dot-notation inheritance**. When a logger for `a.b.c` is requested and not configured, LogBox walks up: `a.b` ? `a` ? `root`.

```
root           FATAL–DEBUG ? console, file
??? models     INFO–DEBUG  ? console
    ??? models.UserService  DEBUG only ? console   (explicitly configured)
    ??? models.OrderService (NOT configured) ? inherits from models: INFO–DEBUG ? console
```

Example configuration:

```cfscript
categories = {
    // All models package — INFO and above
    "models" : { levelMin : "INFO", levelMax : "FATAL", appenders : "console" },

    // One specific model — DEBUG only
    "models.UserService" : { levelMin : "DEBUG", levelMax : "DEBUG", appenders : "console" }
}
```

`models.OrderService` is not configured ? it inherits from `models` (INFO–FATAL, console).
`models.UserService` is explicitly configured ? DEBUG only, console.

Use package-level categories to toggle entire features without changing code.

## Custom Appenders

Extend `AbstractAppender` (standalone: `logbox.system.logging.AbstractAppender`, ColdBox: `coldbox.system.logging.AbstractAppender`).

```boxlang
// BoxLang — models/logging/WebhookAppender.bx
class WebhookAppender extends coldbox.system.logging.AbstractAppender {

    function init( required string name, struct properties = {}, string layout = "", numeric levelMin = 0, numeric levelMax = 4 ) {
        super.init( argumentCollection = arguments )
        return this
    }

    // Called once when appender is registered — good for setup
    function onRegistration() {
        variables.webhookUrl = getProperty( "webhookUrl" )
        variables.minSeverity = getProperty( "minSeverity", "ERROR" )
    }

    // Called for every log event this appender receives
    function logMessage( required logEvent ) {
        if( !len( variables.webhookUrl ) ) return

        // Use hasCustomLayout() + getCustomLayout() for custom formatting
        var message = hasCustomLayout()
            ? getCustomLayout().format( logEvent )
            : "[#severityToString( logEvent.getSeverity() )#] #logEvent.getMessage()#"

        http url=variables.webhookUrl method="POST" throwOnError=false {
            httpparam type="header" name="Content-Type" value="application/json"
            httpparam type="body" value=serializeJSON( {
                severity  : severityToString( logEvent.getSeverity() ),
                category  : logEvent.getCategory(),
                message   : message,
                extraInfo : logEvent.getExtraInfo(),
                timestamp : logEvent.getTimestamp()
            } )
        }
    }

    function onUnRegistration() {}
}
```

```cfml
// CFML equivalent
component extends="coldbox.system.logging.AbstractAppender" {

    function init( required string name, struct properties = {}, string layout = "", numeric levelMin = 0, numeric levelMax = 4 ) {
        super.init( argumentCollection = arguments )
        return this
    }

    function onRegistration() {
        variables.webhookUrl = getProperty( "webhookUrl" )
    }

    function logMessage( required logEvent ) {
        if( !len( variables.webhookUrl ) ) return
        cfhttp( url=variables.webhookUrl, method="POST", throwOnError=false ) {
            cfhttpparam( type="header", name="Content-Type", value="application/json" )
            cfhttpparam( type="body", value=serializeJSON( {
                severity : severityToString( logEvent.getSeverity() ),
                message  : logEvent.getMessage()
            } ) )
        }
    }

    function onUnRegistration() {}
}
```

### AbstractAppender Helper Methods

| Method | Description |
|--------|-------------|
| `getProperty( name [, default] )` | Read a config property |
| `setProperty( name, value )` | Write a config property |
| `propertyExists( name )` | Check if a property is set |
| `getProperties()` | Get all properties |
| `severityToString( numeric )` | Convert severity int to human-readable |
| `getName()` | Appender name |
| `hasCustomLayout()` | True if a layout is configured |
| `getCustomLayout()` | Get the layout object |
| `isInitialized()` | True if appender is ready |

Register a custom appender in config:

```cfscript
appenders = {
    webhook : {
        class      : "models.logging.WebhookAppender",
        levelMin   : "ERROR",
        levelMax   : "FATAL",
        properties : { webhookUrl : "https://hooks.example.com/alerts" }
    }
}
```

## Custom Layouts

Extend `AbstractLayout` (standalone: `logbox.system.logging.Layout`, ColdBox: `coldbox.system.logging.AbstractLayout`). Implement one method: `format( logEvent )`.

```boxlang
// BoxLang — models/logging/JsonLayout.bx
class JsonLayout extends coldbox.system.logging.AbstractLayout {

    function format( required logEvent ) {
        return serializeJSON( {
            "@timestamp" : dateTimeFormat( logEvent.getTimestamp(), "yyyy-mm-dd'T'HH:nn:ssZ" ),
            level        : logEvent.getSeverity(),
            logger       : logEvent.getCategory(),
            message      : logEvent.getMessage(),
            extra        : logEvent.getExtraInfo()
        } )
    }
}
```

```cfml
// CFML
component extends="coldbox.system.logging.AbstractLayout" {

    function format( required logEvent ) {
        return serializeJSON( {
            level    : logEvent.getSeverity(),
            logger   : logEvent.getCategory(),
            message  : logEvent.getMessage(),
            extra    : logEvent.getExtraInfo()
        } )
    }
}
```

Use a layout in appender config:

```cfscript
console : {
    class  : "coldbox.system.logging.appenders.ConsoleAppender",
    layout : "models.logging.JsonLayout"
}
```

### LogEvent API

| Method | Returns |
|--------|---------|
| `getMessage()` | The log message string |
| `getExtraInfo()` | The extra info value (already serialized by appender) |
| `getSeverity()` | Numeric severity level |
| `getCategory()` | Category string |
| `getTimestamp()` | datetime of the log entry |
| `getAppenderName()` | Name of the calling appender |

## Production Best Practices

- **Use `logbox:logger:{this}`** — category automatically matches the class path, enabling inheritance control without code changes
- **Guard expensive messages** — always use `canDebug()` / closure messages before building data solely for logging
- **Structure extraInfo as a struct** — enables JSON appenders and log aggregators (ELK, Splunk, etc.) to parse fields
- **Never log secrets** — redact passwords, tokens, PII, and card numbers before passing them to any logger
- **Development**: root ? DEBUG–FATAL ? ConsoleAppender only (no file I/O overhead)
- **Production**: root ? WARN–FATAL ? RollingFileAppender; optionally FATAL ? EmailAppender
- **Category granularity**: define a category per package (`models`, `handlers`, `services`) — not per class — for bulk toggling in config
- **Use `off` array** to silence noisy packages (e.g., third-party modules) without removing them from appender config
- **Rolling file in production**: set `fileMaxSize : 5000` (5 MB) and `fileMaxArchives : 5` to cap disk usage
- **Async appenders** (`async : true`) for high-throughput systems — be aware that async logging may lose entries on abrupt shutdown
- **Custom appenders for third-party sinks** (Slack, PagerDuty, CloudWatch): keep all transport logic inside the appender, never inline in services