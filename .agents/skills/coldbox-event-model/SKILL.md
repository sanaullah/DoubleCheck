---
name: coldbox-event-model
description: "Use this skill when working with the ColdBox event object (prc/rc), managing request collections, rendering views and data responses, handling redirects with relocate(), controlling HTTP status codes, or implementing event caching in ColdBox handlers."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# ColdBox Event Model

## When to Use This Skill

Use this skill when working with the ColdBox request lifecycle, event object, request collections, view rendering, and response management.

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

The ColdBox event model consists of:
- **Event Object** (`event`) — the `RequestContext` instance per request
- **Request Collection** (`rc`) — public request data (merged GET + POST + URL params)
- **Private Request Collection** (`prc`) — private handler-to-view data store
- **View Rendering** — `event.setView()` for HTML, `event.renderData()` for data
- **Relocations** — `relocate()` for redirects

## Request Collections

```boxlang
function index( event, rc, prc ) {

    // rc = public request collection (from URL, FORM, etc.)
    var userId   = rc.id ?: 0
    var page     = rc.page ?: 1
    var search   = rc.search ?: ""

    // prc = private REQUEST collection (handler to view data)
    prc.user     = userService.getById( userId )
    prc.users    = userService.list( page = page, search = search )
    prc.pageTitle = "Users"

    // Get/set any rc value
    event.getValue( "id", 0 )             // get with default
    event.setValue( "computedValue", 42 ) // set in rc
    event.getPrivateValue( "user" )       // get from prc
    event.setPrivateValue( "user", user ) // set in prc

    // Check if a value exists
    event.valueExists( "id" )
    event.privateValueExists( "user" )
}
```

## View Rendering

```boxlang
function showProfile( event, rc, prc ) {

    prc.user = userService.getById( rc.id ?: 0 )

    // Set a view
    event.setView( "users/profile" )

    // Set view with layout override
    event.setView(
        view   = "users/profile",
        layout = "AdminLayout"
    )

    // Render no layout (for pages we want no wrapping layout)
    event.setView( "partials/widget" ).noLayout()

    // Override the layout for this event
    event.setLayout( "PrintLayout" )

    // Set view and pass view args
    event.setView(
        view     = "users/profile",
        args     = { showSidebar: true }
    )
}
```

## Data Rendering (REST APIs)

```boxlang
function getUser( event, rc, prc ) {

    var user = userService.getById( rc.id ?: 0 )

    // Render JSON
    event.renderData( data = user.getMemento(), type = "json" )

    // With status code
    event.renderData(
        data       = user.getMemento(),
        type       = "json",
        statusCode = 200
    )

    // XML response
    event.renderData( data = data, type = "xml" )

    // Text response
    event.renderData( data = "Hello World", type = "text" )

    // HTML response
    event.renderData( data = "<h1>Hello</h1>", type = "html" )

    // Binary/file
    event.renderData( data = binaryData, type = "binary" )
}
```

## Relocations (Redirects)

```boxlang
function store( event, rc, prc ) {

    var user = userService.create( rc )

    // Simple relocation by event name
    relocate( "users.index" )

    // Relocation with query string
    relocate( "users.show", { id: user.getId() } )

    // Relocation to a URL
    relocate( uri = "/users/#user.getId()#" )

    // Relocation with status code
    relocate( uri = "/dashboard", statusCode = 302 )

    // Permanent redirect
    relocate( uri = "/new-path", statusCode = 301 )

    // Relocate back (to referring page)
    relocate( back = true )
}
```

## HTTP Request Information

```boxlang
function processRequest( event, rc, prc ) {

    // HTTP method detection
    event.getHTTPMethod()           // GET, POST, PUT, DELETE, etc.
    event.isPost()
    event.isGet()
    event.isPut()
    event.isDelete()
    event.isPatch()

    // Request info
    event.getHTTPHeader( "Authorization" )
    event.getHTTPHeader( "Content-Type" )
    event.getClientIP()
    event.getFullURL()
    event.getCurrentURL()
    event.getCurrentHandler()
    event.getCurrentAction()
    event.getCurrentEvent()         // "handler.action"
    event.getCurrentRoute()

    // AJAX detection
    event.isAjax()

    // SSL detection
    event.isSSL()
}
```

## Response Headers and Status

```boxlang
function apiResponse( event, rc, prc ) {

    // Set response headers
    event.setHTTPHeader( name = "X-Total-Count", value = 100 )
    event.setHTTPHeader( name = "Cache-Control", value = "no-cache" )

    // Set status code
    event.setHTTPHeader( statusCode = 201 )
    event.setHTTPHeader( statusText = "Created" )

    // Get response data
    event.renderData(
        data       = { id: 1, name: "Test" },
        type       = "json",
        statusCode = 201,
        headers    = { "X-Rate-Limit": 100 }
    )
}
```

## Event Caching

```boxlang
class Products extends coldbox.system.EventHandler {

    // Cache the 'index' action output for 60 minutes
    this.EVENT_CACHE_SUFFIX = "products"

    function index( event, rc, prc ) {

        // Cache this event's output
        event.setEventCacheableEntry(
            provider   = "template",
            timeout    = 60,
            lastAccess = 60
        )

        prc.products = productService.list()
        event.setView( "products/index" )
    }

    function show( event, rc, prc ) {

        // Cache per unique ID
        event.setEventCacheableEntry(
            provider   = "template",
            timeout    = 120,
            suffix     = rc.id ?: 0
        )

        prc.product = productService.getById( rc.id ?: 0 )
        event.setView( "products/show" )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.EventHandler" {

    // Cache the 'index' action output for 60 minutes
    this.EVENT_CACHE_SUFFIX = "products"

    function index( event, rc, prc ) {

        // Cache this event's output
        event.setEventCacheableEntry(
            provider   = "template",
            timeout    = 60,
            lastAccess = 60
        )

        prc.products = productService.list()
        event.setView( "products/index" )
    }

    function show( event, rc, prc ) {

        // Cache per unique ID
        event.setEventCacheableEntry(
            provider   = "template",
            timeout    = 120,
            suffix     = rc.id ?: 0
        )

        prc.product = productService.getById( rc.id ?: 0 )
        event.setView( "products/show" )
    }
}
```

## The Flash Scope

```boxlang
function store( event, rc, prc ) {

    var result = userService.create( rc )

    if( result.hasErrors() ){
        // Store data in flash for redirect
        flash.put( "errors", result.getErrors() )
        flash.put( "data", rc )
        relocate( "users.create" )
        return
    }

    // Success flash message
    flash.put( "success", "User created successfully!" )
    relocate( "users.index" )
}

function create( event, rc, prc ) {

    // Retrieve flash data after redirect
    prc.errors = flash.get( "errors", [] )
    prc.formData = flash.get( "data", {} )
    prc.user   = userService.new( prc.formData )
    event.setView( "users/create" )
}
```

## Executing Events with runEvent()

```boxlang
function dashboard( event, rc, prc ) {

    prc.stats = runEvent(
        event          = "reports.stats",
        private        = true,
        prePostExempt  = true,
        eventArguments = {
            range    : rc.range ?: "30d",
            include  : [ "sales", "users", "retention" ]
        }
    )

    prc.recentOrders = runEvent(
        event          = "widgets.recentOrders",
        cache          = true,
        cacheTimeout   = 5,
        cacheSuffix    = "dashboard-#prc.currentUser.getId()#",
        eventArguments = { limit : 10 }
    )

    event.setView( "dashboard/index" )
}
```

## Viewlets and Reusable Events

```boxlang
function sidebar( event, rc, prc ) {
    return runEvent(
        event          = "widgets.categoryMenu",
        private        = true,
        prePostExempt  = true,
        eventArguments = { selectedSlug : rc.category ?: "" }
    )
}
```

## Event Model Best Practices

- Use `prc` for data passed to views (not `rc`)
- Use `rc` for reading input, never write sensitive data to `rc`
- Use `event.renderData()` for REST APIs, `event.setView()` for HTML
- Use `relocate()` for POST-REDIRECT-GET pattern
- Call `event.noRender()` to suppress any rendering (for background tasks)
- Use `event.isAjax()` to detect and respond to AJAX requests appropriately
- Use `runEvent()` for reusable widgets/viewlets and internal event orchestration instead of duplicating handler logic
- Pass explicit `eventArguments` structs to internal events rather than mutating `rc` for side effects