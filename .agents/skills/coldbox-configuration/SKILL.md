---
name: coldbox-configuration
description: "Use this skill when configuring a ColdBox application in ColdBox.cfc, setting up environments, managing module settings, defining datasources, configuring logging with LogBox, setting up caching with CacheBox, or wiring dependencies with WireBox settings."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# ColdBox Configuration

## When to Use This Skill

Use this skill when configuring a ColdBox application via `config/ColdBox.cfc` — the master application configuration file.

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

ColdBox.cfc contains sections for:
- **`coldbox`** — core framework settings
- **`environments`** — environment-specific overrides
- **`modules`** — module settings per module
- **`interceptors`** — registered interceptors
- **`logbox`** — LogBox logging configuration
- **`cachebox`** — CacheBox cache configuration
- **`wirebox`** — WireBox DI configuration

## Full ColdBox.cfc Template

```boxlang
class ColdBox extends coldbox.system.Coldbox {

    function configure() {

        // =============================================
        // COLDBOX SETTINGS
        // =============================================
        coldbox = {
            // Application name
            appName              : "My ColdBox Application",
            appMapping           : "root",

            // Application reloading
            reinitPassword       : getSystemSetting( "REINIT_PASSWORD", "supersecret" ),
            reinitKey            : "reinit",

            // Default handler and view
            defaultHandler       : "main",
            defaultAction        : "index",
            defaultLayout        : "Main",
            defaultView          : "main/index",

            // Request Defaults
            requestContextDecorator : "",
            controllerDecorator     : "",

            // Custom interception points
            customInterceptionPoints : [
                "onUserLogin",
                "onUserLogout",
                "onOrderPlaced"
            ],

            // Exception handler
            exceptionHandler     : "main.onException",

            // Invalid event handler
            invalidEventHandler  : "main.onInvalidEvent",

            // Request timeout
            requestTimeout       : 60,

            // ColdBox settings
            handlersIndexAutoReload  : true,          // Development only
            modulesExternalLocation  : [ "modules" ]
        }

        // =============================================
        // ENVIRONMENT DETECTION
        // =============================================
        environments = {
            development : "localhost,127.0.0.1,^local",
            staging     : "staging.example.com",
            production  : "example.com"
        }

        // =============================================
        // LAYOUTS
        // =============================================
        layoutSettings = {
            defaultLayout : "Main",
            defaultView   : "main/index"
        }

        // =============================================
        // MODULES
        // =============================================
        moduleSettings = {
            // CBSecurity settings
            cbsecurity : {
                userService    : "UserService",
                jwtSettings    : {
                    secretKey  : getSystemSetting( "JWT_SECRET", generateSecretKey( "AES", 256 ) ),
                    expiration : 60
                }
            },
            // CBAuth settings
            cbauth : {
                userServiceClass : "UserService"
            },
            // CBI18N settings
            cbi18n : {
                defaultLocale  : "en_US",
                resourceBundles : {
                    main : "#appMapping#/includes/i18n/main"
                }
            }
        }

        // =============================================
        // INTERCEPTORS
        // =============================================
        interceptors = [
            {
                class  : "#appMapping#.interceptors.AppInterceptor",
                name   : "AppInterceptor"
            }
        ]

        // =============================================
        // LOGBOX
        // =============================================
        logbox = {
            // Appenders
            appenders : {
                // Console appender (development)
                console : {
                    class      : "coldbox.system.logging.appenders.ConsoleAppender",
                    levelMin   : "DEBUG",
                    levelMax   : "FATAL"
                },
                // Rolling file appender
                rolling : {
                    class      : "coldbox.system.logging.appenders.RollingFileAppender",
                    levelMin   : "WARN",
                    levelMax   : "FATAL",
                    properties : {
                        filePath  : "#getDirectoryFromPath( getBaseTemplatePath() )#logs",
                        fileName  : "app",
                        fileMaxSize : 5000,
                        fileMaxArchives : 2
                    }
                }
            },
            // Root logger
            root : { levelMin : "WARN", levelMax : "FATAL", appenders : "rolling" },
            // Category loggers
            categories : {
                // App debug
                "root"   : { levelMin : "INFO", levelMax : "DEBUG", appenders : "console" }
            }
        }

        // =============================================
        // CACHEBOX
        // =============================================
        cachebox = {
            // Configuration file
            configFile : "#appMapping#.config.CacheBox"
        }

        // =============================================
        // WIREBOX
        // =============================================
        wirebox = {
            enabled      : true,
            singletonReload : true,
            binder       : "#appMapping#.config.WireBox"
        }
    }

    // =============================================
    // ENVIRONMENT-SPECIFIC OVERRIDES
    // =============================================

    function development() {
        coldbox.handlersIndexAutoReload = true
        coldbox.reinitPassword          = ""
        coldbox.customErrorTemplate     = "/coldbox/system/exceptions/debugPanel.cfm"
    }

    function staging() {
        coldbox.customErrorTemplate = "/coldbox/system/exceptions/customError.cfm"
    }

    function production() {
        coldbox.handlersIndexAutoReload = false
        coldbox.reinitPassword          = getSystemSetting( "REINIT_PASSWORD", "changeme" )
        coldbox.customErrorTemplate     = "/coldbox/system/exceptions/customError.cfm"
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.Coldbox" {

    function configure() {

        // =============================================
        // COLDBOX SETTINGS
        // =============================================
        coldbox = {
            // Application name
            appName              : "My ColdBox Application",
            appMapping           : "root",

            // Application reloading
            reinitPassword       : getSystemSetting( "REINIT_PASSWORD", "supersecret" ),
            reinitKey            : "reinit",

            // Default handler and view
            defaultHandler       : "main",
            defaultAction        : "index",
            defaultLayout        : "Main",
            defaultView          : "main/index",

            // Request Defaults
            requestContextDecorator : "",
            controllerDecorator     : "",

            // Custom interception points
            customInterceptionPoints : [
                "onUserLogin",
                "onUserLogout",
                "onOrderPlaced"
            ],

            // Exception handler
            exceptionHandler     : "main.onException",

            // Invalid event handler
            invalidEventHandler  : "main.onInvalidEvent",

            // Request timeout
            requestTimeout       : 60,

            // ColdBox settings
            handlersIndexAutoReload  : true,          // Development only
            modulesExternalLocation  : [ "modules" ]
        }

        // =============================================
        // ENVIRONMENT DETECTION
        // =============================================
        environments = {
            development : "localhost,127.0.0.1,^local",
            staging     : "staging.example.com",
            production  : "example.com"
        }

        // =============================================
        // LAYOUTS
        // =============================================
        layoutSettings = {
            defaultLayout : "Main",
            defaultView   : "main/index"
        }

        // =============================================
        // MODULES
        // =============================================
        moduleSettings = {
            // CBSecurity settings
            cbsecurity : {
                userService    : "UserService",
                jwtSettings    : {
                    secretKey  : getSystemSetting( "JWT_SECRET", generateSecretKey( "AES", 256 ) ),
                    expiration : 60
                }
            },
            // CBAuth settings
            cbauth : {
                userServiceClass : "UserService"
            },
            // CBI18N settings
            cbi18n : {
                defaultLocale  : "en_US",
                resourceBundles : {
                    main : "#appMapping#/includes/i18n/main"
                }
            }
        }

        // =============================================
        // INTERCEPTORS
        // =============================================
        interceptors = [
            {
                class  : "#appMapping#.interceptors.AppInterceptor",
                name   : "AppInterceptor"
            }
        ]

        // =============================================
        // LOGBOX
        // =============================================
        logbox = {
            // Appenders
            appenders : {
                // Console appender (development)
                console : {
                    class      : "coldbox.system.logging.appenders.ConsoleAppender",
                    levelMin   : "DEBUG",
                    levelMax   : "FATAL"
                },
                // Rolling file appender
                rolling : {
                    class      : "coldbox.system.logging.appenders.RollingFileAppender",
                    levelMin   : "WARN",
                    levelMax   : "FATAL",
                    properties : {
                        filePath  : "#getDirectoryFromPath( getBaseTemplatePath() )#logs",
                        fileName  : "app",
                        fileMaxSize : 5000,
                        fileMaxArchives : 2
                    }
                }
            },
            // Root logger
            root : { levelMin : "WARN", levelMax : "FATAL", appenders : "rolling" },
            // Category loggers
            categories : {
                // App debug
                "root"   : { levelMin : "INFO", levelMax : "DEBUG", appenders : "console" }
            }
        }

        // =============================================
        // CACHEBOX
        // =============================================
        cachebox = {
            // Configuration file
            configFile : "#appMapping#.config.CacheBox"
        }

        // =============================================
        // WIREBOX
        // =============================================
        wirebox = {
            enabled      : true,
            singletonReload : true,
            binder       : "#appMapping#.config.WireBox"
        }
    }

    // =============================================
    // ENVIRONMENT-SPECIFIC OVERRIDES
    // =============================================

    function development() {
        coldbox.handlersIndexAutoReload = true
        coldbox.reinitPassword          = ""
        coldbox.customErrorTemplate     = "/coldbox/system/exceptions/debugPanel.cfm"
    }

    function staging() {
        coldbox.customErrorTemplate = "/coldbox/system/exceptions/customError.cfm"
    }

    function production() {
        coldbox.handlersIndexAutoReload = false
        coldbox.reinitPassword          = getSystemSetting( "REINIT_PASSWORD", "changeme" )
        coldbox.customErrorTemplate     = "/coldbox/system/exceptions/customError.cfm"
    }
}
```

## Environment Variables Pattern

```boxlang
// Using CFML/BoxLang environment variable helper
function configure() {
    vars.datasource = getSystemSetting( "DB_DSN", "myapp" )

    coldbox = {
        appName      : getSystemSetting( "APP_NAME", "My App" ),
        reinitPassword : getSystemSetting( "REINIT_PASSWORD", "" )
    }
}
```

## Module Settings

```boxlang
// Override any module setting from ColdBox.cfc
moduleSettings = {
    // Override cbsecurity module settings
    cbsecurity : {
        firewall : {
            rules : [
                {
                    secureList : "admin",
                    roles      : "admin",
                    match      : "url"
                }
            ]
        }
    },
    // Override cborm module settings
    cborm : {
        eventHandling : true,
        autoEvict     : true
    },
    // Override your own module settings
    myModule : {
        apiKey     : getSystemSetting( "MY_MODULE_API_KEY", "" ),
        timeout    : 30
    }
}
```

## Configuration Best Practices

- Use `getSystemSetting()` for all secrets/credentials — never hard-code them
- Use environment override methods (`development()`, `staging()`, `production()`) for per-environment settings
- Configure `environments` regex patterns for automatic environment detection by hostname
- Set `handlersIndexAutoReload = true` in development for instant handler discovery
- Use `moduleSettings` to override module defaults instead of editing module code
- Configure dedicated `logbox` appenders per environment (verbose in dev, file-only in production)
- Store LogBox categories that match your application package structure for granular logging control