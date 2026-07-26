---
name: coldbox-rest-api-development
description: "Use this skill when building RESTful APIs in ColdBox using RestHandler, creating CRUD API endpoints, implementing API versioning, handling JWT/bearer token authentication, building structured error responses, or creating resource representations with mementos."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# REST API Development

## When to Use This Skill

Use this skill when building REST APIs with ColdBox, including API routing, handlers, authentication, versioning, and response formatting.

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

ColdBox REST APIs use:
- **RestHandler** — base handler with built-in error handling and response formatting
- **`event.renderData()`** — renders JSON/XML/text responses with status codes
- **Route resources** — maps CRUD verbs to handler actions
- **Modules** — ideal for versioned API isolation
- **JWT/cbSecurity** — provides API authentication

## API Module Structure

```
modules_app/
  api/
    config/
      Router.cfc       # API-specific routes
    handlers/
      Users.cfc        # Users API handler
      Posts.cfc
    models/
      UserTransformer.cfc
    ModuleConfig.cfc
```

## RestHandler Base Class

```boxlang
class Users extends coldbox.system.RestHandler {

    @inject
    property name="userService";

    // Runs before every action - great for input validation
    function preHandler( event, rc, prc, action ) {
        // Validate content type for mutation methods
        if( !listFindNoCase( "index,show", action ) ){
            if( !event.isPost() && !event.isPut() && !event.isPatch() ){
                return
            }
            validateContentType( event )
        }
    }

    /**
     * GET /api/v1/users
     */
    function index( event, rc, prc ) {
        var users = userService.list(
            page    = rc.page ?: 1,
            limit   = rc.limit ?: 25,
            filters = getFilters( rc )
        )

        event.renderData(
            data = {
                "data"       : users.getRecords(),
                "pagination" : users.getPagination()
            },
            statusCode = 200
        )
    }

    /**
     * GET /api/v1/users/:id
     */
    function show( event, rc, prc ) {
        var user = userService.getById( rc.id ?: 0 )

        if( isNull( user ) ){
            return apiNotFound( "User not found" )
        }

        event.renderData( data = user.getMemento(), statusCode = 200 )
    }

    /**
     * POST /api/v1/users
     */
    function create( event, rc, prc ) {
        var payload = event.getHTTPContent( json = true )
        var result  = userService.create( payload )

        if( result.hasErrors() ){
            return apiValidationFailed( result.getErrors() )
        }

        event.renderData( data = result.getMemento(), statusCode = 201 )
    }

    /**
     * PUT /api/v1/users/:id
     */
    function update( event, rc, prc ) {
        var payload = event.getHTTPContent( json = true )
        var result  = userService.update( rc.id ?: 0, payload )

        if( isNull( result ) ){
            return apiNotFound( "User not found" )
        }

        if( result.hasErrors() ){
            return apiValidationFailed( result.getErrors() )
        }

        event.renderData( data = result.getMemento(), statusCode = 200 )
    }

    /**
     * DELETE /api/v1/users/:id
     */
    function delete( event, rc, prc ) {
        var deleted = userService.delete( rc.id ?: 0 )

        if( !deleted ){
            return apiNotFound( "User not found" )
        }

        event.renderData( data = "", statusCode = 204 )
    }

    // Private helpers

    private function getFilters( rc ) {
        return {
            search : rc.search ?: "",
            role   : rc.role ?: "",
            active : rc.active ?: ""
        }
    }

    private function apiNotFound( message ) {
        event.renderData(
            data       = { "error": message, "statusCode": 404 },
            statusCode = 404
        )
    }

    private function apiValidationFailed( errors ) {
        event.renderData(
            data = {
                "error"      : "Validation failed",
                "errors"     : errors,
                "statusCode" : 422
            },
            statusCode = 422
        )
    }

    private function validateContentType( event ) {
        if( event.getHTTPHeader( "Content-Type", "" ) does not contain "application/json" ){
            event.renderData(
                data       = { "error": "Content-Type must be application/json" },
                statusCode = 415
            )
            event.noRender( false )
        }
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.RestHandler" {

    property name="userService" inject="userService";

    // Runs before every action - great for input validation
    function preHandler( event, rc, prc, action ) {
        // Validate content type for mutation methods
        if( !listFindNoCase( "index,show", action ) ){
            if( !event.isPost() && !event.isPut() && !event.isPatch() ){
                return
            }
            validateContentType( event )
        }
    }

    /**
     * GET /api/v1/users
     */
    function index( event, rc, prc ) {
        var users = userService.list(
            page    = rc.page ?: 1,
            limit   = rc.limit ?: 25,
            filters = getFilters( rc )
        )

        event.renderData(
            data = {
                "data"       : users.getRecords(),
                "pagination" : users.getPagination()
            },
            statusCode = 200
        )
    }

    /**
     * GET /api/v1/users/:id
     */
    function show( event, rc, prc ) {
        var user = userService.getById( rc.id ?: 0 )

        if( isNull( user ) ){
            return apiNotFound( "User not found" )
        }

        event.renderData( data = user.getMemento(), statusCode = 200 )
    }

    /**
     * POST /api/v1/users
     */
    function create( event, rc, prc ) {
        var payload = event.getHTTPContent( json = true )
        var result  = userService.create( payload )

        if( result.hasErrors() ){
            return apiValidationFailed( result.getErrors() )
        }

        event.renderData( data = result.getMemento(), statusCode = 201 )
    }

    /**
     * PUT /api/v1/users/:id
     */
    function update( event, rc, prc ) {
        var payload = event.getHTTPContent( json = true )
        var result  = userService.update( rc.id ?: 0, payload )

        if( isNull( result ) ){
            return apiNotFound( "User not found" )
        }

        if( result.hasErrors() ){
            return apiValidationFailed( result.getErrors() )
        }

        event.renderData( data = result.getMemento(), statusCode = 200 )
    }

    /**
     * DELETE /api/v1/users/:id
     */
    function delete( event, rc, prc ) {
        var deleted = userService.delete( rc.id ?: 0 )

        if( !deleted ){
            return apiNotFound( "User not found" )
        }

        event.renderData( data = "", statusCode = 204 )
    }

    // Private helpers

    private function getFilters( rc ) {
        return {
            search : rc.search ?: "",
            role   : rc.role ?: "",
            active : rc.active ?: ""
        }
    }

    private function apiNotFound( message ) {
        event.renderData(
            data       = { "error": message, "statusCode": 404 },
            statusCode = 404
        )
    }

    private function apiValidationFailed( errors ) {
        event.renderData(
            data = {
                "error"      : "Validation failed",
                "errors"     : errors,
                "statusCode" : 422
            },
            statusCode = 422
        )
    }

    private function validateContentType( event ) {
        if( event.getHTTPHeader( "Content-Type", "" ) does not contain "application/json" ){
            event.renderData(
                data       = { "error": "Content-Type must be application/json" },
                statusCode = 415
            )
            event.noRender( false )
        }
    }
}
```

## API Module Configuration

```boxlang
// modules_app/api/ModuleConfig.cfc
class ModuleConfig {

    property name="title"       default="API Module";
    property name="description" default="REST API";
    property name="version"     default="1.0.0";
    property name="entryPoint"  default="api";
    property name="author"      default="Ortus Solutions";

    function configure() {
        // Module settings
        settings = {
            jwtSecret     : getSystemSetting( "JWT_SECRET", "" ),
            tokenExpiry   : 60, // minutes
            refreshExpiry : 10080 // 7 days
        }
    }
}

// modules_app/api/config/Router.cfc
class Router extends coldbox.system.web.routing.Router {

    function configure() {
        // V1 resource routes
        group( pattern = "/v1" ) {
            resources( "users" )
            resources( "posts" )
        }
    }
}
```

**CFML (`.cfc`):**

```cfml
// modules_app/api/ModuleConfig.cfc
component {

    property name="title"       default="API Module";
    property name="description" default="REST API";
    property name="version"     default="1.0.0";
    property name="entryPoint"  default="api";
    property name="author"      default="Ortus Solutions";

    function configure() {
        // Module settings
        settings = {
            jwtSecret     : getSystemSetting( "JWT_SECRET", "" ),
            tokenExpiry   : 60, // minutes
            refreshExpiry : 10080 // 7 days
        }
    }
}

// modules_app/api/config/Router.cfc
component extends="coldbox.system.web.routing.Router" {

    function configure() {
        // V1 resource routes
        group( pattern = "/v1" ) {
            resources( "users" )
            resources( "posts" )
        }
    }
}
```

## JWT Authentication

```boxlang
class Auth extends coldbox.system.RestHandler {

    @inject
    property name="authService";

    @inject
    property name="jwtService";

    /**
     * POST /api/v1/auth/login
     */
    function login( event, rc, prc ) {
        var credentials = event.getHTTPContent( json = true )

        if( !authService.authenticate( credentials.email, credentials.password ) ){
            event.renderData(
                data       = { "error": "Invalid credentials" },
                statusCode = 401
            )
            return
        }

        var user  = authService.getAuthenticatedUser()
        var token = jwtService.fromUser( user )

        event.renderData(
            data = {
                "access_token"  : token,
                "token_type"    : "Bearer",
                "expires_in"    : 3600,
                "user"          : user.getMemento()
            },
            statusCode = 200
        )
    }

    /**
     * POST /api/v1/auth/refresh
     */
    function refresh( event, rc, prc ) {
        var bearer = getBearerToken( event )
        var token  = jwtService.refreshToken( bearer )

        event.renderData(
            data = { "access_token": token, "token_type": "Bearer" },
            statusCode = 200
        )
    }

    /**
     * POST /api/v1/auth/logout
     */
    function logout( event, rc, prc ) {
        var bearer = getBearerToken( event )
        jwtService.invalidateToken( bearer )
        event.renderData( data = { "message": "Logged out" }, statusCode = 200 )
    }

    private function getBearerToken( event ) {
        var header = event.getHTTPHeader( "Authorization", "" )
        return replaceNoCase( header, "Bearer ", "", "one" )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.RestHandler" {

    property name="authService" inject="authService";

    property name="jwtService" inject="jwtService";

    /**
     * POST /api/v1/auth/login
     */
    function login( event, rc, prc ) {
        var credentials = event.getHTTPContent( json = true )

        if( !authService.authenticate( credentials.email, credentials.password ) ){
            event.renderData(
                data       = { "error": "Invalid credentials" },
                statusCode = 401
            )
            return
        }

        var user  = authService.getAuthenticatedUser()
        var token = jwtService.fromUser( user )

        event.renderData(
            data = {
                "access_token"  : token,
                "token_type"    : "Bearer",
                "expires_in"    : 3600,
                "user"          : user.getMemento()
            },
            statusCode = 200
        )
    }

    /**
     * POST /api/v1/auth/refresh
     */
    function refresh( event, rc, prc ) {
        var bearer = getBearerToken( event )
        var token  = jwtService.refreshToken( bearer )

        event.renderData(
            data = { "access_token": token, "token_type": "Bearer" },
            statusCode = 200
        )
    }

    /**
     * POST /api/v1/auth/logout
     */
    function logout( event, rc, prc ) {
        var bearer = getBearerToken( event )
        jwtService.invalidateToken( bearer )
        event.renderData( data = { "message": "Logged out" }, statusCode = 200 )
    }

    private function getBearerToken( event ) {
        var header = event.getHTTPHeader( "Authorization", "" )
        return replaceNoCase( header, "Bearer ", "", "one" )
    }
}
```

## API Versioning

```boxlang
// Using modules for versioning
// modules_app/apiV1/ModuleConfig.cfc
class ModuleConfig {
    property name="entryPoint" default="api/v1";
}

// modules_app/apiV2/ModuleConfig.cfc
class ModuleConfig {
    property name="entryPoint" default="api/v2";
}

// URL-based versioning
group( pattern = "/api/v1" ) {
    resources( "users" )
}
group( pattern = "/api/v2" ) {
    resources( "users" )
}

// Header-based versioning
function preHandler( event, rc, prc, action ) {
    var version = event.getHTTPHeader( "Accept-Version", "v1" )
    prc.apiVersion = version
}
```

**CFML (`.cfc`):**

```cfml
// Using modules for versioning
// modules_app/apiV1/ModuleConfig.cfc
component {
    property name="entryPoint" default="api/v1";
}

// modules_app/apiV2/ModuleConfig.cfc
component {
    property name="entryPoint" default="api/v2";
}

// URL-based versioning
group( pattern = "/api/v1" ) {
    resources( "users" )
}
group( pattern = "/api/v2" ) {
    resources( "users" )
}

// Header-based versioning
function preHandler( event, rc, prc, action ) {
    var version = event.getHTTPHeader( "Accept-Version", "v1" )
    prc.apiVersion = version
}
```

## Pagination Response Structure

```boxlang
function index( event, rc, prc ) {
    var page  = rc.page ?: 1
    var limit = min( rc.limit ?: 25, 100 )   // cap at 100

    var results = userService.paginate(
        offset = ( page - 1 ) * limit,
        limit  = limit
    )

    event.renderData(
        data = {
            "data"  : results.records,
            "meta"  : {
                "total"       : results.total,
                "page"        : page,
                "limit"       : limit,
                "total_pages" : ceiling( results.total / limit ),
                "has_more"    : ( page * limit ) < results.total
            },
            "links" : {
                "self"  : buildLink( event.getCurrentEvent(), { page: page, limit: limit } ),
                "next"  : ( page * limit ) < results.total ? buildLink( event.getCurrentEvent(), { page: page + 1, limit: limit } ) : "",
                "prev"  : page > 1 ? buildLink( event.getCurrentEvent(), { page: page - 1, limit: limit } ) : ""
            }
        },
        statusCode = 200
    )
}
```

## REST API Best Practices

- Use `RestHandler` over `EventHandler` for APIs — it adds proper error handling
- Use HTTP status codes correctly (200, 201, 204, 400, 401, 403, 404, 422, 500)
- Read request body with `event.getHTTPContent( json = true )` for POST/PUT
- Structure responses consistently — always return `data` + optional `meta` + optional `links`
- Use modules for API versioning to keep versions independent
- Validate inputs before processing — return 422 with errors structure
- Secure endpoints with JWT + cbSecurity `@secured` annotations
- Use CORS interceptors for cross-origin access