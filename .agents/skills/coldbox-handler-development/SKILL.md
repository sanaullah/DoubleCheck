---
name: coldbox-handler-development
description: "Use this skill when creating ColdBox handlers (controllers), implementing CRUD actions, adding dependency injection to handlers, working with preHandler/postHandler advices, secured actions, REST handlers, or the EventHandler base class."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# Handler Development

## When to Use This Skill

Use this skill when creating ColdBox handlers (controllers) for handling HTTP requests, implementing CRUD operations, or building web interfaces.

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

Handlers are ColdBox's controllers that:
- Handle HTTP requests and orchestrate application flow
- Receive the event object, request collection (rc), and private request collection (prc)
- Use dependency injection for services and models
- Return views or data responses
- Can be secured with security annotations

## Implementation Steps

1. Define handler name and actions
2. Add dependency injection for required services
3. Implement actions with event, rc, prc parameters
4. Process request data and delegate to services
5. Populate prc with view data or use event.renderData() for APIs
6. Add security annotations if needed
7. Write handler tests

## Basic Handler Template

```boxlang
class extends="coldbox.system.EventHandler" {

    @inject
    property name="userService";

    @inject
    property name="validationManager";

    /**
     * Display list of users
     */
    function index( event, rc, prc ) {
        prc.users = userService.list(
            page = rc.page ?: 1,
            limit = rc.limit ?: 25
        )
        event.setView( "users/index" )
    }

    /**
     * Display single user
     */
    function show( event, rc, prc ) {
        prc.user = userService.getById( rc.id ?: 0 )
        event.setView( "users/show" )
    }

    /**
     * Display create form
     */
    function create( event, rc, prc ) {
        prc.user = userService.new()
        event.setView( "users/create" )
    }

    /**
     * Store new user
     */
    function store( event, rc, prc ) {
        var result = userService.create( rc )

        if( result.hasErrors() ){
            flash.put( "errors", result.getErrors() )
            flash.put( "data", rc )
            relocate( "users.create" )
        }

        flash.put( "success", "User created successfully" )
        relocate( uri = "/users/#result.getId()#" )
    }

    /**
     * Display edit form
     */
    function edit( event, rc, prc ) {
        prc.user = userService.getById( rc.id ?: 0 )
        event.setView( "users/edit" )
    }

    /**
     * Update existing user
     */
    function update( event, rc, prc ) {
        var result = userService.update( rc.id ?: 0, rc )

        if( result.hasErrors() ){
            flash.put( "errors", result.getErrors() )
            flash.put( "data", rc )
            relocate( "users.edit", { id: rc.id } )
        }

        flash.put( "success", "User updated successfully" )
        relocate( uri = "/users/#rc.id#" )
    }

    /**
     * Delete user
     */
    function delete( event, rc, prc ) {
        userService.delete( rc.id ?: 0 )
        flash.put( "success", "User deleted successfully" )
        relocate( "users.index" )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.EventHandler" {

    property name="userService" inject="userService";

    property name="validationManager" inject="validationManager";

    /**
     * Display list of users
     */
    function index( event, rc, prc ) {
        prc.users = userService.list(
            page = rc.page ?: 1,
            limit = rc.limit ?: 25
        )
        event.setView( "users/index" )
    }

    /**
     * Display single user
     */
    function show( event, rc, prc ) {
        prc.user = userService.getById( rc.id ?: 0 )
        event.setView( "users/show" )
    }

    /**
     * Display create form
     */
    function create( event, rc, prc ) {
        prc.user = userService.new()
        event.setView( "users/create" )
    }

    /**
     * Store new user
     */
    function store( event, rc, prc ) {
        var result = userService.create( rc )

        if( result.hasErrors() ){
            flash.put( "errors", result.getErrors() )
            flash.put( "data", rc )
            relocate( "users.create" )
        }

        flash.put( "success", "User created successfully" )
        relocate( uri = "/users/#result.getId()#" )
    }

    /**
     * Display edit form
     */
    function edit( event, rc, prc ) {
        prc.user = userService.getById( rc.id ?: 0 )
        event.setView( "users/edit" )
    }

    /**
     * Update existing user
     */
    function update( event, rc, prc ) {
        var result = userService.update( rc.id ?: 0, rc )

        if( result.hasErrors() ){
            flash.put( "errors", result.getErrors() )
            flash.put( "data", rc )
            relocate( "users.edit", { id: rc.id } )
        }

        flash.put( "success", "User updated successfully" )
        relocate( uri = "/users/#rc.id#" )
    }

    /**
     * Delete user
     */
    function delete( event, rc, prc ) {
        userService.delete( rc.id ?: 0 )
        flash.put( "success", "User deleted successfully" )
        relocate( "users.index" )
    }
}
```

## REST Handler

```boxlang
class api_Users extends coldbox.system.RestHandler {

    @inject
    property name="userService";

    function index( event, rc, prc ) {
        var users = userService.list(
            page = rc.page ?: 1,
            limit = rc.limit ?: 25
        )
        event.renderData( data = users, statusCode = 200 )
    }

    function show( event, rc, prc ) {
        var user = userService.getById( rc.id ?: 0 )
        if( isNull( user ) ){
            event.renderData( data = { "error": "User not found" }, statusCode = 404 )
            return
        }
        event.renderData( data = user, statusCode = 200 )
    }

    function create( event, rc, prc ) {
        var result = userService.create( rc )
        if( result.hasErrors() ){
            event.renderData( data = { "errors": result.getErrors() }, statusCode = 422 )
            return
        }
        event.renderData( data = result, statusCode = 201 )
    }

    function update( event, rc, prc ) {
        var result = userService.update( rc.id ?: 0, rc )
        if( result.hasErrors() ){
            event.renderData( data = { "errors": result.getErrors() }, statusCode = 422 )
            return
        }
        event.renderData( data = result, statusCode = 200 )
    }

    function delete( event, rc, prc ) {
        userService.delete( rc.id ?: 0 )
        event.renderData( data = { "message": "User deleted successfully" }, statusCode = 204 )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.RestHandler" {

    property name="userService" inject="userService";

    function index( event, rc, prc ) {
        var users = userService.list(
            page = rc.page ?: 1,
            limit = rc.limit ?: 25
        )
        event.renderData( data = users, statusCode = 200 )
    }

    function show( event, rc, prc ) {
        var user = userService.getById( rc.id ?: 0 )
        if( isNull( user ) ){
            event.renderData( data = { "error": "User not found" }, statusCode = 404 )
            return
        }
        event.renderData( data = user, statusCode = 200 )
    }

    function create( event, rc, prc ) {
        var result = userService.create( rc )
        if( result.hasErrors() ){
            event.renderData( data = { "errors": result.getErrors() }, statusCode = 422 )
            return
        }
        event.renderData( data = result, statusCode = 201 )
    }

    function update( event, rc, prc ) {
        var result = userService.update( rc.id ?: 0, rc )
        if( result.hasErrors() ){
            event.renderData( data = { "errors": result.getErrors() }, statusCode = 422 )
            return
        }
        event.renderData( data = result, statusCode = 200 )
    }

    function delete( event, rc, prc ) {
        userService.delete( rc.id ?: 0 )
        event.renderData( data = { "message": "User deleted successfully" }, statusCode = 204 )
    }
}
```

## Handler with Around Advices

```boxlang
class Products extends coldbox.system.EventHandler {

    // Run before ALL actions
    this.preHandler = "setupDefaults"

    // Run after ALL actions
    this.postHandler = "logActivity"

    // Run around specific actions
    this.aroundHandler = "measurePerformance"

    private function setupDefaults( event, rc, prc, action ) {
        prc.currentUser = auth().user()
        prc.pageTitle = "Products"
    }

    private function logActivity( event, rc, prc, action ) {
        log.info( "Action completed: #action#" )
    }

    private function measurePerformance( event, rc, prc, targetAction, args ) {
        var start = getTickCount()
        targetAction( argumentCollection = args )
        log.debug( "Action #args.action# took #getTickCount() - start#ms" )
    }

    function index( event, rc, prc ) {
        prc.products = productService.list()
        event.setView( "products/index" )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.EventHandler" {

    // Run before ALL actions
    this.preHandler = "setupDefaults"

    // Run after ALL actions
    this.postHandler = "logActivity"

    // Run around specific actions
    this.aroundHandler = "measurePerformance"

    private function setupDefaults( event, rc, prc, action ) {
        prc.currentUser = auth().user()
        prc.pageTitle = "Products"
    }

    private function logActivity( event, rc, prc, action ) {
        log.info( "Action completed: #action#" )
    }

    private function measurePerformance( event, rc, prc, targetAction, args ) {
        var start = getTickCount()
        targetAction( argumentCollection = args )
        log.debug( "Action #args.action# took #getTickCount() - start#ms" )
    }

    function index( event, rc, prc ) {
        prc.products = productService.list()
        event.setView( "products/index" )
    }
}
```

## Secured Handler

```boxlang
class Admin extends coldbox.system.EventHandler {

    // Secure entire handler - requires authentication
    this.preHandler = "checkAuth"

    @inject
    property name="userService";

    private function checkAuth( event, rc, prc, action ) {
        if( !auth().check() ){
            flash.put( "error", "Please login to continue" )
            relocate( "security.login" )
        }
        if( !auth().user().hasRole( "admin" ) ){
            flash.put( "error", "Insufficient permissions" )
            relocate( "main.index" )
        }
    }

    function index( event, rc, prc ) {
        prc.users = userService.list()
        event.setView( "admin/index" )
    }

    // Using security annotations (requires CBSecurity)
    @secured
    @permissions( "admin.users.delete" )
    function delete( event, rc, prc ) {
        userService.delete( rc.id ?: 0 )
        flash.put( "success", "User deleted" )
        relocate( "admin.index" )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.EventHandler" {

    // Secure entire handler - requires authentication
    this.preHandler = "checkAuth"

    property name="userService" inject="userService";

    private function checkAuth( event, rc, prc, action ) {
        if( !auth().check() ){
            flash.put( "error", "Please login to continue" )
            relocate( "security.login" )
        }
        if( !auth().user().hasRole( "admin" ) ){
            flash.put( "error", "Insufficient permissions" )
            relocate( "main.index" )
        }
    }

    function index( event, rc, prc ) {
        prc.users = userService.list()
        event.setView( "admin/index" )
    }

    // Using security annotations (requires CBSecurity)
    @secured
    @permissions( "admin.users.delete" )
    function delete( event, rc, prc ) {
        userService.delete( rc.id ?: 0 )
        flash.put( "success", "User deleted" )
        relocate( "admin.index" )
    }
}
```

## HTTP Method Security

```boxlang
class Orders extends coldbox.system.EventHandler {

    this.allowedMethods = {
        save   : "POST",
        update : "PUT,PATCH",
        delete : "DELETE"
    }

    function save( event, rc, prc ) {
        var order = orderService.create( rc )
        flash.put( "success", "Order created" )
        relocate( "orders.show/#order.getId()#" )
    }

    function onInvalidHTTPMethod( event, rc, prc, faultAction, eventArguments ) {
        event.renderData(
            type       = "json",
            data       = { error : "Method not allowed", action : faultAction },
            statusCode = 405
        )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.EventHandler" {

    this.allowedMethods = {
        save   : "POST",
        update : "PUT,PATCH",
        delete : "DELETE"
    }

    function save( event, rc, prc ) {
        var order = orderService.create( rc )
        flash.put( "success", "Order created" )
        relocate( "orders.show/#order.getId()#" )
    }

    function onInvalidHTTPMethod( event, rc, prc, faultAction, eventArguments ) {
        event.renderData(
            type       = "json",
            data       = { error : "Method not allowed", action : faultAction },
            statusCode = 405
        )
    }
}
```

## Model Data Binding with populateModel()

```boxlang
class Users extends coldbox.system.EventHandler {

    @inject
    property name="userService";

    function save( event, rc, prc ) {
        var user = populateModel(
            model                = userService.new(),
            include              = "firstName,lastName,email,password",
            exclude              = "role,isAdmin",
            composeRelationships = true,
            ignoreEmpty          = true
        )

        var result = userService.save( user )
        if( result.hasErrors() ){
            flash.put( "errors", result.getErrors() )
            flash.put( "data", rc )
            relocate( "users.create" )
            return
        }

        flash.put( "success", "User saved" )
        relocate( "users.index" )
    }
}
```

## Handler Best Practices

- Keep handlers thin — delegate business logic to services/models
- Use `prc` for view data, `rc` for request input
- Use `event.renderData()` for REST responses, `event.setView()` for HTML
- Use `relocate()` after POST actions (PRG pattern)
- Inject dependencies via `@inject` annotations (WireBox)
- Secure handlers with `this.preHandler` or CBSecurity annotations
- Use `this.allowedMethods` and `onInvalidHTTPMethod()` to enforce HTTP semantics centrally
- Prefer `populateModel()` over hand-copying request values into entities/forms
- Name handlers to match route resources (e.g., `Users.cfc` ? `users.*`)