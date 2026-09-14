---
name: coldbox-decorators
description: "Use this skill when extending or overriding ColdBox framework internals via the Decorator pattern -- specifically creating a ControllerDecorator to wrap the main ColdBox controller, or a RequestContextDecorator to wrap and augment the request context (event) object with custom methods or overridden behavior."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# ColdBox Decorators (Controller & Request Context)

## When to Use This Skill

Use this skill when you need to:
- Add custom methods or override existing methods on the ColdBox **controller** object (e.g., always force SSL on all relocations)
- Add custom methods or override existing methods on the **request context** (event/`rc`/`prc`) object (e.g., auto-trim values, add helper getters)
- Extend framework behavior without modifying framework source code

## Core Concepts

Both decorators follow the [Decorator Pattern](https://sourcemaking.com/design_patterns/decorator):
- You create a CFC that **extends the framework decorator base class**
- Implement a `configure()` method for initialization
- Add new methods or override existing ones
- Access the **original** object via a getter (`getController()` or `getRequestContext()`)
- Register the decorator path in `config/ColdBox.cfc`

Neither decorator requires modifying framework source — changes are application-level.

---

## Controller Decorator

### When to Use

- Override `relocate()` / `setNextEvent()` to always add SSL, tracking params, etc.
- Add application-specific controller-level helpers
- Implement different controller behaviors per deployment protocol

### Base Class

`coldbox.system.web.ControllerDecorator`

Access original controller: `getController()`

### Implementation

```javascript
// models/MyControllerDecorator.cfc
component extends="coldbox.system.web.ControllerDecorator" {

    /**
     * Called when the decorator is created at application startup.
     * Use this for any initialization logic.
     */
    function configure() {
        // initialization if needed
    }

    /**
     * Override relocate() to always enforce SSL
     */
    function relocate(
        event          = "",
        route          = "",
        URL            = "",
        queryString    = "",
        persist        = "",
        persistStruct  = {},
        addToken       = false,
        boolean ssl    = true,   // force SSL for every relocation
        baseURL        = "",
        boolean postProcessExempt = false,
        statusCode     = 302
    ) {
        // Always set ssl = true and delegate to real controller
        arguments.ssl = true;
        return getController().relocate( argumentCollection = arguments );
    }

    /**
     * Add a custom application-specific method
     */
    string function getAppVersion() {
        return getController().getSetting( "appVersion" );
    }
}
```

**CFML (`.cfc`) — identical syntax**, just save as `.cfc` and use `component` (same here since extending a framework CFC).

### Configuration

```javascript
// config/ColdBox.cfc
component {
    function configure() {
        coldbox = {
            controllerDecorator : "models.MyControllerDecorator"
        };
    }
}
```

The value is the **WireBox instantiation path** of your decorator CFC.

---

## Request Context Decorator

### When to Use

- Override `getValue()` to auto-trim or sanitize incoming request values
- Add domain-specific helper methods to the event object (e.g., `getCurrentUser()`, `isApiRequest()`)
- Centralize request validation or transformation logic

### Base Class

`coldbox.system.web.context.RequestContextDecorator`

Access original request context: `getRequestContext()`
Access ColdBox controller: `getController()` or `variables.controller`

### Implementation

```javascript
// models/system/MyRequestDecorator.cfc
component extends="coldbox.system.web.context.RequestContextDecorator" {

    /**
     * Called when the decorator is created each request.
     * Must return `this`.
     */
    function configure() {
        return this;
    }

    /**
     * Override getValue() to auto-trim all simple request values
     */
    function getValue( required name, defaultValue, boolean private = false ) {
        // Safety check using the original context
        if ( !getRequestContext().valueExists( arguments.name ) ) {
            return arguments.keyExists( "defaultValue" ) ? arguments.defaultValue : "";
        }

        var val = getRequestContext().getValue( argumentCollection = arguments );

        // Auto-trim simple values
        if ( isSimpleValue( val ) ) {
            return trim( val );
        }

        return val;
    }

    /**
     * Custom helper: is the current request an API call?
     */
    boolean function isApiRequest() {
        return getRequestContext().getCurrentRoutedURL().startsWith( "/api" )
            || getRequestContext().getHTTPHeader( "Accept", "" ).findNoCase( "application/json" );
    }

    /**
     * Custom helper: get the authenticated user from prc
     */
    any function getCurrentUser() {
        return getRequestContext().getPrivateValue( "currentUser", {} );
    }

    /**
     * Custom helper: require a value or throw a validation error
     */
    any function requireValue( required string name, string message = "" ) {
        var val = getRequestContext().getValue( name, "" );
        if ( !len( trim( val ) ) ) {
            throw(
                type    = "app.validation.MissingRequired",
                message = len( arguments.message ) ? arguments.message : "Missing required value: #arguments.name#"
            );
        }
        return val;
    }
}
```

### Configuration

```javascript
// config/ColdBox.cfc
component {
    function configure() {
        coldbox = {
            requestContextDecorator : "models.system.MyRequestDecorator"
        };
    }
}
```

### Using the Custom Methods in Handlers

Once configured, any handler receives the decorated event object and can call your new methods directly:

```javascript
// handlers/Users.cfc
component extends="coldbox.system.EventHandler" {

    function index( event, rc, prc ) {
        // Custom method from decorator
        if ( event.isApiRequest() ) {
            return event.renderData( data: userService.list() );
        }

        prc.user = event.getCurrentUser();
        event.setView( "users/index" );
    }

    function save( event, rc, prc ) {
        // Auto-trimmed via overridden getValue()
        var name  = event.getValue( "name", "" );
        var email = event.getValue( "email", "" );

        // Or use requireValue() helper
        var userId = event.requireValue( "userId", "User ID is required" );
    }
}
```

## Key Rules

- **Controller Decorator**: Use for framework-level behavior that applies across all controllers and relocations.
- **Request Context Decorator**: Use for request-scoped helpers and value transformation that apply across all handlers.
- Always call `getController().methodName( argumentCollection = arguments )` or `getRequestContext().methodName( argumentCollection = arguments )` when delegating to the original object.
- The `configure()` method in `RequestContextDecorator` must return `this`.
- Only **one** decorator of each type can be active at a time.
- Decorator paths are **WireBox instantiation paths**, not file system paths.
- Both decorators are available via WireBox injection if needed; prefer accessing them through the `event` object in handlers.