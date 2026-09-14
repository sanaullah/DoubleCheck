---
name: coldbox-request-context
description: "Use this skill when working with the ColdBox RequestContext object (event), managing rc and prc collections, building URLs with buildLink(), detecting HTTP methods, accessing request metadata, working with flash scope, handling AJAX requests, or reading HTTP headers and body content."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# ColdBox Request Context

## When to Use This Skill

Use this skill when working with the ColdBox `RequestContext` event object in handlers to manage request data, view rendering, HTTP info, and flash messaging.

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

The `RequestContext` (event object) is:
- The central object for every ColdBox request
- Injects into every handler action as `event`
- Contains `rc` (public request collection) and `prc` (private collection)
- Has methods for view rendering, relocation, headers, and HTTP introspection

## Request Collection Access

```boxlang
function handler( event, rc, prc ) {

    // ----- Reading rc (public request collection) -----
    var id     = rc.id ?: 0
    var search = rc.search ?: ""
    var page   = rc.page ?: 1

    // Get with default fallback
    var name  = event.getValue( "name", "Anonymous" )

    // Check existence
    if( event.valueExists( "token" ) ){
        var token = rc.token
    }

    // Get all rc values
    var allRequestData = event.getCollection()

    // ----- Writing prc (private collection) -----
    prc.user      = userService.getById( id )
    prc.pageTitle = "My Page"

    // Set private value
    event.setPrivateValue( "user", userService.getById( id ) )

    // Get private value with default
    var user = event.getPrivateValue( "user", {} )

    // Check private value
    if( event.privateValueExists( "user" ) ){
        // ...
    }

    // Get all prc values
    var allPrivateData  = event.getPrivateCollection()

    // ----- Merge into rc -----
    event.setValue( "computedKey", "computedValue" )
}
```

## HTTP Request Introspection

```boxlang
function processRequest( event, rc, prc ) {

    // HTTP method
    var method = event.getHTTPMethod()    // GET, POST, PUT, DELETE ...
    event.isGet()
    event.isPost()
    event.isPut()
    event.isPatch()
    event.isDelete()
    event.isHead()
    event.isOptions()

    // Request metadata
    event.isAjax()
    event.isSSL()
    event.getClientIP()
    event.getFullURL()
    event.getCurrentURL()

    // Current routing info
    event.getCurrentHandler()     // "users"
    event.getCurrentAction()      // "show"
    event.getCurrentEvent()       // "users.show"
    event.getCurrentRoute()       // "/users/:id"
    event.getCurrentRoutedURL()   // "/users/123"
    event.getCurrentModule()      // "" or "myModule"

    // HTTP Headers
    var contentType    = event.getHTTPHeader( "Content-Type", "" )
    var authorization  = event.getHTTPHeader( "Authorization", "" )
    var acceptLanguage = event.getHTTPHeader( "Accept-Language", "en" )

    // Request body
    var rawBody  = event.getHTTPContent()
    var jsonBody = event.getHTTPContent( json = true ) // deserializeJSON

    // Form and file uploads
    var formData  = event.getCollection()
    if( event.valueExists( "fileUpload" ) ){
        var upload = event.getValue( "fileUpload" )
    }
}
```

## Response Control

```boxlang
function respond( event, rc, prc ) {

    // Render a view with the default layout
    event.setView( "users/show" )

    // Render with specific layout
    event.setView( view = "users/show", layout = "Admin" )

    // Override layout
    event.setLayout( "Print" )

    // No layout
    event.setView( "partials/card" ).noLayout()

    // Render data (REST response)
    event.renderData(
        data       = { id: 1, name: "Test" },
        type       = "json",
        statusCode = 200
    )

    // Set response headers
    event.setHTTPHeader( name = "X-Custom-Header", value = "value" )
    event.setHTTPHeader( statusCode = 201 )

    // Suppress all rendering
    event.noRender()

    // Redirect
    relocate( "users.index" )
    relocate( uri = "/users/123" )
    relocate( "users.show", { id: 123 }, statusCode = 302 )
}
```

## Building URLs

```boxlang
// In handlers or views
var indexLink  = buildLink( "users.index" )
var showLink   = buildLink( "users.show", { id: prc.user.getId() } )
var searchLink = buildLink( "search.index", { q: "hello", page: 2 } )

// With query string struct
var link = buildLink(
    linkTo      = "products.list",
    queryString = { category: "books", sort: "price" }
)

// Named route
var namedLink = buildLink( routeName = "user.profile", queryString = { tab: "settings" } )

// Module route
var modLink = buildLink( "myModule:dashboard.index" )

// External URL (won't be mapped)
var extLink = buildLink( "https://www.google.com" )
```

## Flash Scope

```boxlang
// Store data in flash before redirect
function store( event, rc, prc ) {
    var result = userService.create( rc )

    if( result.hasErrors() ){
        flash.put( "errors", result.getErrors() )
        flash.put( "formData", rc )
        relocate( "users.create" )
        return
    }

    flash.put( "success", "User created!" )
    relocate( "users.index" )
}

// Read flash data after redirect
function create( event, rc, prc ) {
    if( flash.exists( "errors" ) ){
        prc.errors   = flash.get( "errors" )
        prc.formData = flash.get( "formData", {} )
        flash.remove( "errors" )
        flash.remove( "formData" )
    }
    prc.user = userService.new( prc.formData ?: {} )
    event.setView( "users/create" )
}

// Keep flash beyond one redirect
flash.put( "notice", "Please check your email", persist = true )

// Clear all flash
flash.clear()
```

## AJAX Handling Pattern

```boxlang
function index( event, rc, prc ) {

    prc.users = userService.list()

    if( event.isAjax() ){
        // Respond with JSON for AJAX requests
        event.renderData( data = prc.users, type = "json" )
    } else {
        // Full page response
        event.setView( "users/index" )
    }
}
```

## Event Context Best Practices

- Use `prc` for data passed to views — never expose sensitive data in `rc`
- Use `event.getValue()` with defaults instead of `rc.key ?: default` for clean defaults
- Check `event.isAjax()` and respond accordingly for hybrid pages
- Use `event.getHTTPContent( json = true )` to read JSON request bodies in REST handlers
- Use `flash` scope only for one-request data after redirects (PRG pattern)
- Use `buildLink()` instead of hard-coded URLs in templates and handlers
- Call `event.noRender()` before returning from async-triggered actions with no response