---
name: coldbox-flash-messaging
description: "Use this skill when implementing flash RAM messaging in ColdBox, using cbMessageBox for styled notifications, building POST-REDIRECT-GET patterns, persisting messages across redirects, showing success/error/warning/info alerts, or integrating flash with form validation."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# Flash Messaging

## When to Use This Skill

Use this skill when implementing flash messages in ColdBox for the POST-REDIRECT-GET pattern and user feedback notifications.

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

ColdBox provides two complementary approaches:
- **Flash RAM** — built-in storage for any data across one redirect (session/cookie-based)
- **cbMessageBox** — a dedicated module for styled notification messages (info/success/warning/error)

## Flash RAM Basics

```boxlang
// Store data before redirect
function store( event, rc, prc ) {
    var result = userService.create( rc )

    if( result.hasErrors() ){
        flash.put( "errors", result.getErrors() )
        flash.put( "formData", rc )
        relocate( "users.create" )
        return
    }

    flash.put( "success", "User created successfully!" )
    relocate( "users.index" )
}

// Read data after redirect
function index( event, rc, prc ) {
    prc.successMessage = flash.get( "success", "" )
    prc.users          = userService.list()
    event.setView( "users/index" )
}

// Check existence before reading
function create( event, rc, prc ) {
    if( flash.exists( "errors" ) ){
        prc.errors   = flash.get( "errors" )
        prc.formData = flash.get( "formData", {} )
    }
    prc.user = userService.new()
    event.setView( "users/create" )
}
```

## Flash RAM API

```boxlang
// Store single key
flash.put( "key", value )

// Store with persistence (survives more than one redirect)
flash.put( "key", value, persist = true )

// Store multiple values
flash.putAll( {
    success  : "User saved",
    userId   : 123,
    formData : rc
} )

// Read value (clears it after reading by default)
var value = flash.get( "key" )

// Read with default
var value = flash.get( "key", "default" )

// Check existence
if( flash.exists( "errors" ) ){ }

// Remove specific key
flash.remove( "key" )

// Clear all flash
flash.clear()

// Get all flash contents
var allFlash = flash.getAll()

// Keep flash for another request
flash.keep( "key" )
flash.keepAll()
```

## CBMessageBox Integration

CBMessageBox provides Bootstrap-compatible message boxes for styled notifications.

### Installation

```bash
box install cbmessagebox
```

### Module Configuration

```boxlang
// config/ColdBox.cfc
moduleSettings = {
    cbmessagebox : {
        flashKey     : "cbMessageBox",
        template     : "/coldbox/system/modules/cbMessageBox/views/_templates/messagebox.cfm",
        defaultType  : "info"
    }
}
```

### Using CBMessageBox in Handlers

```boxlang
class Users extends coldbox.system.EventHandler {

    @inject
    property name="MessageBox@cbmessagebox";

    function store( event, rc, prc ) {
        var result = userService.create( rc )

        if( result.hasErrors() ){
            // Store error with list formatting
            MessageBox.error(
                messageArray = result.getErrors()
            )
            flash.put( "formData", rc )
            relocate( "users.create" )
            return
        }

        MessageBox.success( "User '#rc.name#' created successfully!" )
        relocate( "users.index" )
    }

    function update( event, rc, prc ) {
        var result = userService.update( rc.id, rc )
        if( result.hasErrors() ){
            MessageBox.warning( "Some fields need your attention" )
            relocate( "users.edit", { id: rc.id } )
            return
        }
        MessageBox.success( "User updated!" )
        relocate( "users.show", { id: rc.id } )
    }

    function delete( event, rc, prc ) {
        userService.delete( rc.id )
        MessageBox.info( "User removed from the system" )
        relocate( "users.index" )
    }
}
```

**CFML (`.cfc`):**

```cfml
component extends="coldbox.system.EventHandler" {

    @inject
    property name="MessageBox@cbmessagebox";

    function store( event, rc, prc ) {
        var result = userService.create( rc )

        if( result.hasErrors() ){
            // Store error with list formatting
            MessageBox.error(
                messageArray = result.getErrors()
            )
            flash.put( "formData", rc )
            relocate( "users.create" )
            return
        }

        MessageBox.success( "User '#rc.name#' created successfully!" )
        relocate( "users.index" )
    }

    function update( event, rc, prc ) {
        var result = userService.update( rc.id, rc )
        if( result.hasErrors() ){
            MessageBox.warning( "Some fields need your attention" )
            relocate( "users.edit", { id: rc.id } )
            return
        }
        MessageBox.success( "User updated!" )
        relocate( "users.show", { id: rc.id } )
    }

    function delete( event, rc, prc ) {
        userService.delete( rc.id )
        MessageBox.info( "User removed from the system" )
        relocate( "users.index" )
    }
}
```

### CBMessageBox Types

```boxlang
// Success (green)
MessageBox.success( "Operation completed successfully!" )

// Error (red)
MessageBox.error( "An error occurred. Please try again." )

// Error with array of messages
MessageBox.error( messageArray = result.getErrors() )

// Warning (yellow)
MessageBox.warning( "Your session will expire in 5 minutes" )

// Info (blue)
MessageBox.info( "There are 3 new notifications" )
```

### Rendering CBMessageBox in Layout

```cfml
<!--- layouts/Main.cfm --->
<cfoutput>
<!DOCTYPE html>
<html>
<body>
    <nav>...</nav>

    <main class="container">
        <!--- Render flash message box --->
        #getInstance( "MessageBox@cbmessagebox" ).renderIt()#

        <!--- Or use the view partial --->
        #renderView( view = "_templates/messagebox", module = "cbmessagebox" )#

        <!--- Main content --->
        #renderView()#
    </main>
</body>
</html>
</cfoutput>
```

## PRG Pattern (Post-Redirect-Get)

```boxlang
// Full PRG workflow example
class Posts extends coldbox.system.EventHandler {

    @inject
    property name="postService";

    @inject
    property name="MessageBox@cbmessagebox";

    // GET /posts/new ? show form
    function create( event, rc, prc ) {
        // Restore form data from failed submit
        prc.post     = postService.new( flash.get( "formData", {} ) )
        prc.errors   = flash.get( "errors", [] )
        event.setView( "posts/create" )
    }

    // POST /posts ? store new post
    function store( event, rc, prc ) {
        var result = postService.create( rc )

        if( result.hasErrors() ){
            // Store validation errors and form data in flash
            flash.put( "errors", result.getErrors() )
            flash.put( "formData", rc )
            // Redirect back to form (POST ? REDIRECT ? GET)
            relocate( "posts.create" )
            return
        }

        // Success redirect to show
        MessageBox.success( "Post '#rc.title#' published!" )
        relocate( "posts.show", { id: result.getId() } )
    }

    // GET /posts/:id ? show single
    function show( event, rc, prc ) {
        prc.post = postService.getById( rc.id ?: 0 )
        event.setView( "posts/show" )
    }
}
```

**CFML (`.cfc`):**

```cfml
// Full PRG workflow example
component extends="coldbox.system.EventHandler" {

    property name="postService" inject="postService";

    @inject
    property name="MessageBox@cbmessagebox";

    // GET /posts/new ? show form
    function create( event, rc, prc ) {
        // Restore form data from failed submit
        prc.post     = postService.new( flash.get( "formData", {} ) )
        prc.errors   = flash.get( "errors", [] )
        event.setView( "posts/create" )
    }

    // POST /posts ? store new post
    function store( event, rc, prc ) {
        var result = postService.create( rc )

        if( result.hasErrors() ){
            // Store validation errors and form data in flash
            flash.put( "errors", result.getErrors() )
            flash.put( "formData", rc )
            // Redirect back to form (POST ? REDIRECT ? GET)
            relocate( "posts.create" )
            return
        }

        // Success redirect to show
        MessageBox.success( "Post '#rc.title#' published!" )
        relocate( "posts.show", { id: result.getId() } )
    }

    // GET /posts/:id ? show single
    function show( event, rc, prc ) {
        prc.post = postService.getById( rc.id ?: 0 )
        event.setView( "posts/show" )
    }
}
```

## Flash View Template

```cfml
<!--- views/shared/_flash.cfm --->
<cfoutput>
<cfif flash.exists( "success" )>
    <div class="alert alert-success alert-dismissible" role="alert">
        #encodeForHTML( flash.get( "success" ) )#
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
</cfif>
<cfif flash.exists( "error" )>
    <div class="alert alert-danger alert-dismissible" role="alert">
        #encodeForHTML( flash.get( "error" ) )#
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
</cfif>
<cfif flash.exists( "errors" )>
    <div class="alert alert-danger" role="alert">
        <ul class="mb-0">
            <cfloop array="#flash.get( 'errors' )#" item="err">
                <li>#encodeForHTML( err )#</li>
            </cfloop>
        </ul>
    </div>
</cfif>
<cfif flash.exists( "warning" )>
    <div class="alert alert-warning" role="alert">
        #encodeForHTML( flash.get( "warning" ) )#
    </div>
</cfif>
<cfif flash.exists( "info" )>
    <div class="alert alert-info" role="alert">
        #encodeForHTML( flash.get( "info" ) )#
    </div>
</cfif>
</cfoutput>
```

## Flash Messaging Best Practices

- Always use PRG pattern — redirect after POST, display flash on GET
- Use `cbMessageBox` module for consistent styled notifications
- Use `flash.put( "formData", rc )` to restore forms after validation failure
- Clear flash data after reading to avoid stale messages
- For REST APIs, don't use flash — return status codes and error structures
- Use `persist = true` only when flash needs to survive more than one redirect