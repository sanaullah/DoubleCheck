---
name: coldbox-routing-development
description: "Use this skill when configuring ColdBox routes, setting up RESTful resource routes, creating route groups, implementing URL pattern matching with constraints, defining named routes, or working with Router.cfc in a ColdBox application."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# Routing Development

## When to Use This Skill

Use this skill when setting up URL routing for ColdBox applications, defining REST resource routes, or configuring route constraints and groups.

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

ColdBox routing maps URLs to handler actions via `config/Router.cfc`:
- RESTful resource routes are defined via `resources()` or `route()`
- Route groups share prefix, namespace, or middleware
- Constraints validate URL segments with regex
- Named routes can be used in views/handlers via `buildLink()`
- HTTP verb restrictions enforce RESTful semantics

## Implementation Steps

1. Create/open `config/Router.cfc`
2. Define resource routes or individual routes
3. Add route groups where appropriate
4. Apply constraints to dynamic segments
5. Name routes for reference in templates
6. Order routes from most-specific to least-specific

## Basic Router.cfc

```boxlang
class Router extends coldbox.system.web.routing.Router {

    function configure() {

        // Set base URL and options
        setFullRewrites( true )

        // Simple home route
        route( "/", "main.index" )

        // Named route
        route( name = "about", pattern = "/about", target = "pages.about" )

        // RESTful resource (generates CRUD routes)
        resources( "users" )

        // Nested resources
        resources(
            resource  = "posts",
            nested    = "comments"
        )

        // Wildcard route - MUST be last
        route( "/:handler/:action?" )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.web.routing.Router" {

    function configure() {

        // Set base URL and options
        setFullRewrites( true )

        // Simple home route
        route( "/", "main.index" )

        // Named route
        route( name = "about", pattern = "/about", target = "pages.about" )

        // RESTful resource (generates CRUD routes)
        resources( "users" )

        // Nested resources
        resources(
            resource  = "posts",
            nested    = "comments"
        )

        // Wildcard route - MUST be last
        route( "/:handler/:action?" )
    }
}
```

## RESTful Resource Routes

`resources( "users" )` generates these routes:

| Method   | URL             | Handler Action  |
|----------|-----------------|-----------------|
| GET      | /users          | users.index     |
| GET      | /users/new      | users.create    |
| POST     | /users          | users.store     |
| GET      | /users/:id      | users.show      |
| GET      | /users/:id/edit | users.edit      |
| PUT      | /users/:id      | users.update    |
| PATCH    | /users/:id      | users.update    |
| DELETE   | /users/:id      | users.delete    |

## Route Groups

```boxlang
// API versioning group
group(
    pattern   = "/api/v1",
    namespace = "api.v1",
    handler   = "api.v1"
) {
    resources( "users" )
    resources( "posts" )
    resources( "comments" )
}

// Admin group with prefix
group(
    pattern = "/admin",
    handler = "admin"
) {
    route( "/", "admin.dashboard.index" )
    resources( "users" )
    resources( "settings" )
}

// Authenticated group (with CBSecurity middleware)
group(
    pattern    = "/dashboard",
    middleware = "cbsecurity"
) {
    route( "/", "dashboard.index" )
    route( "/profile", "dashboard.profile" )
}
```

## Routes with Constraints

```boxlang
// Numeric ID constraint
route(
    pattern     = "/users/:id",
    target      = "users.show",
    constraints = { id: "[0-9]+" }
)

// UUID constraint
route(
    pattern     = "/tokens/:token",
    target      = "tokens.verify",
    constraints = { token: "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}" }
)

// Slug constraint
route(
    pattern     = "/blog/:slug",
    target      = "blog.show",
    constraints = { slug: "[a-z0-9-]+" }
)

// Optional segments
route( "/search/:term?", "search.index" )
```

## HTTP Verb-Specific Routes

```boxlang
// Explicit HTTP methods
get( "/users", "users.index" )
post( "/users", "users.store" )
put( "/users/:id", "users.update" )
patch( "/users/:id", "users.patch" )
delete( "/users/:id", "users.delete" )

// Multiple verbs
route(
    pattern = "/users/:id",
    target  = "users.show"
).methods( "GET,HEAD" )
```

## Named Routes in Views

```boxlang
// In handler
var userLink = buildLink( "users.show", { id: prc.user.getId() } )

// In view template
<a href="#buildLink( 'users.index' )#">All Users</a>
<a href="#buildLink( 'users.edit', { id: prc.user.getId() } )#">Edit</a>

// Or using named route
<a href="#buildLink( routeName = 'user.profile', queryString = { tab: 'settings' } )#">Profile</a>
```

## API Router (Dedicated)

```boxlang
// config/Router.cfc
class Router extends coldbox.system.web.routing.Router {

    function configure() {
        setFullRewrites( true )

        // Mount API routes from module
        addRoute( route( "/api/" ).toModuleRoutes( "api" ) )

        // Web routes
        route( "/", "main.index" )
        route( "/:handler/:action?" )
    }
}

// modules/api/config/Router.cfc
class Router extends coldbox.system.web.routing.Router {

    function configure() {
        // V1 routes
        group( pattern = "/v1" ) {
            resources( "users" )
            resources( "posts" )
        }

        // V2 routes
        group(
            pattern   = "/v2",
            namespace = "v2"
        ) {
            resources( "users" )
        }
    }
}
```

**CFML (`.cfc`):**

```cfml
// config/Router.cfc
component extends="coldbox.system.web.routing.Router" {

    function configure() {
        setFullRewrites( true )

        // Mount API routes from module
        addRoute( route( "/api/" ).toModuleRoutes( "api" ) )

        // Web routes
        route( "/", "main.index" )
        route( "/:handler/:action?" )
    }
}

// modules/api/config/Router.cfc
component extends="coldbox.system.web.routing.Router" {

    function configure() {
        // V1 routes
        group( pattern = "/v1" ) {
            resources( "users" )
            resources( "posts" )
        }

        // V2 routes
        group(
            pattern   = "/v2",
            namespace = "v2"
        ) {
            resources( "users" )
        }
    }
}
```

## Route Best Practices

- Define most-specific routes first, wildcards last
- Use `resources()` for standard CRUD routes rather than defining each route manually
- Group related routes with shared prefixes/namespaces
- Add constraints for numeric IDs and UUIDs to prevent invalid parameters
- Name important routes for easy reference in templates
- Use HTTP method restrictions for REST APIs
- Separate API routing via modules for cleaner organization