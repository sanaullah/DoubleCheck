---
name: coldbox-interceptor-development
description: "Use this skill when creating ColdBox interceptors for cross-cutting concerns, listening to framework lifecycle events, implementing security checks, logging, CORS, rate limiting, request/response transformation, or firing and listening to custom interception points."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# Interceptor Development

## When to Use This Skill

Use this skill when building interceptors to hook into the ColdBox request lifecycle for security, logging, caching, CORS, rate-limiting, or any cross-cutting concern.

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

ColdBox interceptors:
- Listen to **interception points** (framework lifecycle events)
- Use `interceptData` for reading/modifying data at the point of execution
- Are registered in `ColdBox.cfc` or module `ModuleConfig.cfc`
- Can be synchronous (default) or asynchronous (`asyncAll`, `asyncPool`)
- Can fire custom interception points with `announce()`

## Interception Points Reference

| Category        | Point                          | When Fired                       |
|-----------------|-------------------------------|----------------------------------|
| Application     | `applicationEnd`              | Application teardown             |
| Request         | `preProcess`                  | Before handler executed          |
| Request         | `postProcess`                 | After handler executed           |
| Handler         | `preHandler`                  | Before action execution          |
| Handler         | `postHandler`                 | After action execution           |
| View            | `preLayout`                   | Before layout rendered           |
| View            | `preRender`                   | Before view rendered             |
| View            | `postRender`                  | After view rendered              |
| Exception       | `onException`                 | On unhandled exception           |
| CacheBox        | `afterCacheElementInsert`     | After cache item stored          |
| Module          | `preModuleLoad`               | Before module loads              |
| Module          | `postModuleLoad`              | After module loads               |

## Basic Interceptor Structure

```boxlang
class LoggingInterceptor extends coldbox.system.Interceptor {

    @inject
    property name="logService";

    function configure() {
        // Called on startup — initialize settings
        log.info( "LoggingInterceptor configured" )
    }

    function preProcess( event, rc, prc, interceptData ) {
        // Log every incoming request
        log.info( "Request started: #event.getCurrentEvent()#", {
            method    : event.getHTTPMethod(),
            ip        : event.getClientIP(),
            userAgent : event.getHTTPHeader( "User-Agent", "" )
        } )
    }

    function postProcess( event, rc, prc, interceptData ) {
        // Log after processing
        log.info( "Request completed: #event.getCurrentEvent()#" )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.Interceptor" {

    property name="logService" inject="logService";

    function configure() {
        // Called on startup — initialize settings
        log.info( "LoggingInterceptor configured" )
    }

    function preProcess( event, rc, prc, interceptData ) {
        // Log every incoming request
        log.info( "Request started: #event.getCurrentEvent()#", {
            method    : event.getHTTPMethod(),
            ip        : event.getClientIP(),
            userAgent : event.getHTTPHeader( "User-Agent", "" )
        } )
    }

    function postProcess( event, rc, prc, interceptData ) {
        // Log after processing
        log.info( "Request completed: #event.getCurrentEvent()#" )
    }
}
```

## Security Interceptor

```boxlang
class SecurityInterceptor extends coldbox.system.Interceptor {

    @inject
    property name="authService";

    property name="securedRoutes" type="array";

    function configure() {
        securedRoutes = [
            "/admin",
            "/dashboard",
            "/account"
        ]
    }

    function preProcess( event, rc, prc, interceptData ) {
        var currentURL = event.getCurrentRoutedURL()

        // Check if route requires authentication
        if( !requiresAuth( currentURL ) ){
            return
        }

        // Check if user is authenticated
        if( !authService.check() ){
            flash.put( "error", "Please login to continue" )
            flash.put( "returnTo", currentURL )
            relocate( "security.login" )
        }
    }

    private function requiresAuth( url ) {
        return securedRoutes.some( ( route ) => url.startsWith( route ) )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.Interceptor" {

    property name="authService" inject="authService";

    property name="securedRoutes" type="array";

    function configure() {
        securedRoutes = [
            "/admin",
            "/dashboard",
            "/account"
        ]
    }

    function preProcess( event, rc, prc, interceptData ) {
        var currentURL = event.getCurrentRoutedURL()

        // Check if route requires authentication
        if( !requiresAuth( currentURL ) ){
            return
        }

        // Check if user is authenticated
        if( !authService.check() ){
            flash.put( "error", "Please login to continue" )
            flash.put( "returnTo", currentURL )
            relocate( "security.login" )
        }
    }

    private function requiresAuth( url ) {
        return securedRoutes.some( ( route ) => url.startsWith( route ) )
    }
}
```

## CORS Interceptor

```boxlang
class CORSInterceptor extends coldbox.system.Interceptor {

    property name="allowedOrigins" type="array";
    property name="allowedMethods" type="string";
    property name="allowedHeaders" type="string";

    function configure() {
        allowedOrigins = [ "https://app.example.com", "https://admin.example.com" ]
        allowedMethods = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        allowedHeaders = "Content-Type,Authorization,X-Requested-With"
    }

    function preProcess( event, rc, prc, interceptData ) {
        var origin = event.getHTTPHeader( "Origin", "" )

        // Allow if matching enabled origin
        if( allowedOrigins.contains( origin ) ){
            event.setHTTPHeader( "Access-Control-Allow-Origin", origin )
            event.setHTTPHeader( "Access-Control-Allow-Credentials", "true" )
        }

        event.setHTTPHeader( "Access-Control-Allow-Methods", allowedMethods )
        event.setHTTPHeader( "Access-Control-Allow-Headers", allowedHeaders )
        event.setHTTPHeader( "Access-Control-Max-Age", "86400" )

        // Handle preflight OPTIONS request
        if( event.getHTTPMethod() == "OPTIONS" ){
            event.renderData( data = "", statusCode = 204 )
            event.noRender( false )
        }
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.Interceptor" {

    property name="allowedOrigins" type="array";
    property name="allowedMethods" type="string";
    property name="allowedHeaders" type="string";

    function configure() {
        allowedOrigins = [ "https://app.example.com", "https://admin.example.com" ]
        allowedMethods = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        allowedHeaders = "Content-Type,Authorization,X-Requested-With"
    }

    function preProcess( event, rc, prc, interceptData ) {
        var origin = event.getHTTPHeader( "Origin", "" )

        // Allow if matching enabled origin
        if( allowedOrigins.contains( origin ) ){
            event.setHTTPHeader( "Access-Control-Allow-Origin", origin )
            event.setHTTPHeader( "Access-Control-Allow-Credentials", "true" )
        }

        event.setHTTPHeader( "Access-Control-Allow-Methods", allowedMethods )
        event.setHTTPHeader( "Access-Control-Allow-Headers", allowedHeaders )
        event.setHTTPHeader( "Access-Control-Max-Age", "86400" )

        // Handle preflight OPTIONS request
        if( event.getHTTPMethod() == "OPTIONS" ){
            event.renderData( data = "", statusCode = 204 )
            event.noRender( false )
        }
    }
}
```

## Rate Limiting Interceptor

```boxlang
class RateLimitInterceptor extends coldbox.system.Interceptor {

    @inject
    property name="cachebox:default" inject="cachebox:default" name="cacheProvider";

    property name="requestsPerMinute" default="60";

    function configure() {
        requestsPerMinute = getSetting( "rateLimitPerMinute", 60 )
    }

    function preProcess( event, rc, prc, interceptData ) {
        var clientIP  = event.getClientIP()
        var cacheKey  = "ratelimit_#clientIP#"
        var cacheData = cacheProvider.get( cacheKey )

        if( isNull( cacheData ) ){
            cacheProvider.set( cacheKey, { count: 1, resetAt: dateAdd( "n", 1, now() ) }, 2, 2 )
            return
        }

        if( cacheData.count >= requestsPerMinute ){
            event.renderData(
                data = {
                    "error"      : "Too many requests",
                    "retryAfter" : dateDiff( "s", now(), cacheData.resetAt )
                },
                statusCode = 429,
                headers    = {
                    "X-RateLimit-Limit"     : requestsPerMinute,
                    "X-RateLimit-Remaining" : 0,
                    "Retry-After"           : dateDiff( "s", now(), cacheData.resetAt )
                }
            )
            return
        }

        cacheData.count++
        cacheProvider.set( cacheKey, cacheData, 2, 2 )

        event.setHTTPHeader( "X-RateLimit-Limit", requestsPerMinute )
        event.setHTTPHeader( "X-RateLimit-Remaining", requestsPerMinute - cacheData.count )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.Interceptor" {

    @inject
    property name="cachebox:default" inject="cachebox:default" name="cacheProvider";

    property name="requestsPerMinute" default="60";

    function configure() {
        requestsPerMinute = getSetting( "rateLimitPerMinute", 60 )
    }

    function preProcess( event, rc, prc, interceptData ) {
        var clientIP  = event.getClientIP()
        var cacheKey  = "ratelimit_#clientIP#"
        var cacheData = cacheProvider.get( cacheKey )

        if( isNull( cacheData ) ){
            cacheProvider.set( cacheKey, { count: 1, resetAt: dateAdd( "n", 1, now() ) }, 2, 2 )
            return
        }

        if( cacheData.count >= requestsPerMinute ){
            event.renderData(
                data = {
                    "error"      : "Too many requests",
                    "retryAfter" : dateDiff( "s", now(), cacheData.resetAt )
                },
                statusCode = 429,
                headers    = {
                    "X-RateLimit-Limit"     : requestsPerMinute,
                    "X-RateLimit-Remaining" : 0,
                    "Retry-After"           : dateDiff( "s", now(), cacheData.resetAt )
                }
            )
            return
        }

        cacheData.count++
        cacheProvider.set( cacheKey, cacheData, 2, 2 )

        event.setHTTPHeader( "X-RateLimit-Limit", requestsPerMinute )
        event.setHTTPHeader( "X-RateLimit-Remaining", requestsPerMinute - cacheData.count )
    }
}
```

## Custom Interception Points

```boxlang
// Declare custom interception point in ColdBox.cfc
class ColdBox extends coldbox.system.Coldbox {

    function configure() {
        coldbox = {
            customInterceptionPoints : [
                "onUserCreated",
                "onUserDeleted",
                "onOrderPlaced",
                "onPaymentProcessed"
            ]
        }
    }
}

// Fire custom interception point from service
class UserService {

    @inject
    property name="interceptorService";

    function create( data ) {
        var user = userRepository.create( data )

        // Announce custom interception event
        announce(
            "onUserCreated",
            { user: user }
        )

        return user
    }
}

// Listen to custom interception point in interceptor
class UserEventInterceptor extends coldbox.system.Interceptor {

    @inject
    property name="emailService";

    function onUserCreated( event, rc, prc, interceptData ) {
        var user = interceptData.user
        emailService.sendWelcomeEmail( user )
    }
}
```

**CFML (`.cfc`):**

```cfml
// Declare custom interception point in ColdBox.cfc
component extends="coldbox.system.Coldbox" {

    function configure() {
        coldbox = {
            customInterceptionPoints : [
                "onUserCreated",
                "onUserDeleted",
                "onOrderPlaced",
                "onPaymentProcessed"
            ]
        }
    }
}

// Fire custom interception point from service
component {

    property name="interceptorService" inject="interceptorService";

    function create( data ) {
        var user = userRepository.create( data )

        // Announce custom interception event
        announce(
            "onUserCreated",
            { user: user }
        )

        return user
    }
}

// Listen to custom interception point in interceptor
component extends="coldbox.system.Interceptor" {

    property name="emailService" inject="emailService";

    function onUserCreated( event, rc, prc, interceptData ) {
        var user = interceptData.user
        emailService.sendWelcomeEmail( user )
    }
}
```

## Registering Interceptors

```boxlang
// In ColdBox.cfc
class ColdBox extends coldbox.system.Coldbox {

    function configure() {
        // Register interceptors
        interceptors = [
            {
                class  : "interceptors.CORSInterceptor",
                name   : "CORSInterceptor",
                properties : { allowedOrigins: "https://app.example.com" }
            },
            {
                class  : "interceptors.RateLimitInterceptor",
                name   : "RateLimitInterceptor",
                properties : { rateLimitPerMinute: 100 }
            },
            {
                class  : "interceptors.LoggingInterceptor",
                name   : "LoggingInterceptor"
            }
        ]
    }
}

// In module ModuleConfig.cfc
class ModuleConfig {

    function configure() {
        interceptors = [
            {
                class : "#moduleMapping#.interceptors.ModuleInterceptor",
                name  : "MyModuleInterceptor"
            }
        ]
    }
}
```

**CFML (`.cfc`):**

```cfml
// In ColdBox.cfc
component extends="coldbox.system.Coldbox" {

    function configure() {
        // Register interceptors
        interceptors = [
            {
                class  : "interceptors.CORSInterceptor",
                name   : "CORSInterceptor",
                properties : { allowedOrigins: "https://app.example.com" }
            },
            {
                class  : "interceptors.RateLimitInterceptor",
                name   : "RateLimitInterceptor",
                properties : { rateLimitPerMinute: 100 }
            },
            {
                class  : "interceptors.LoggingInterceptor",
                name   : "LoggingInterceptor"
            }
        ]
    }
}

// In module ModuleConfig.cfc
component {

    function configure() {
        interceptors = [
            {
                class : "#moduleMapping#.interceptors.ModuleInterceptor",
                name  : "MyModuleInterceptor"
            }
        ]
    }
}
```

## Asynchronous Interceptors

```boxlang
class AsyncEmailInterceptor extends coldbox.system.Interceptor {

    // Run all listeners asynchronously
    property name="asyncAll" default="true";

    @inject
    property name="emailService";

    function onUserCreated( event, rc, prc, interceptData ) {
        // Runs in a separate thread
        emailService.sendWelcomeEmail( interceptData.user )
    }

    function onOrderPlaced( event, rc, prc, interceptData ) {
        // Runs in a separate thread
        emailService.sendOrderConfirmation( interceptData.order )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.Interceptor" {

    // Run all listeners asynchronously
    property name="asyncAll" default="true";

    property name="emailService" inject="emailService";

    function onUserCreated( event, rc, prc, interceptData ) {
        // Runs in a separate thread
        emailService.sendWelcomeEmail( interceptData.user )
    }

    function onOrderPlaced( event, rc, prc, interceptData ) {
        // Runs in a separate thread
        emailService.sendOrderConfirmation( interceptData.order )
    }
}
```

## Interceptor Best Practices

- Keep interceptors focused on a single concern (SRP)
- Use `configure()` to initialize settings from the `properties` struct
- Use `announce()` for custom lifecycle events instead of direct dependencies
- Register CORS interceptors before all others in the chain
- Use async interceptors for non-blocking email/notification workflows
- Prefer CBSecurity module over custom security interceptors for auth
- Log interceptor errors but don't swallow exceptions silently