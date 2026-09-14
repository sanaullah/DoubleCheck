---
name: coldbox-proxy
description: "Use this skill when building ColdBox Proxy objects to expose ColdBox event handlers to remote callers such as ColdFusion web services, Flex/AIR, event gateways, or CFC data binding -- enabling non-HTTP protocols to participate in the ColdBox event model."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# ColdBox Proxy

## When to Use This Skill

Use this skill when you need to expose your ColdBox application to non-HTTP callers: SOAP web services, Flex/AIR binary protocol, ColdFusion event gateways, or any remote CFC invocation that bypasses the normal HTTP request cycle.

## Core Concepts

- **Proxy** — A CFC that extends `coldbox.system.remote.ColdboxProxy` and acts as an interface between external callers and the ColdBox event model
- **`process()`** — Executes a ColdBox event from within the proxy; all extra arguments are merged into the request collection
- **`loadColdBox()`** — For loading an external ColdBox app whose `Application.cfc` is not in the webroot
- **`COLDBOX_APP_MAPPING`** — Required in `Application.cfc` when the ColdBox app lives in a sub-folder and uses non-HTTP protocols (Flex/AIR, gateways)
- **`preProxyResults`** interception point — Fires right before proxy returns results; ideal for logging, transformation

## File Organization

Create a `remote/` folder in your application root and place one or more proxy CFCs there, organized by domain:

```
/Application
  /remote
    UserProxy.cfc
    OrderProxy.cfc
```

## Basic Proxy Structure

```javascript
// remote/UserProxy.cfc
component extends="coldbox.system.remote.ColdboxProxy" {

    /**
     * Get a list of users
     * @page  Page number
     * @limit Records per page
     */
    array function getUsers( numeric page = 1, numeric limit = 25 ) {
        arguments.event = "api.users.index";
        var results = super.process( argumentCollection = arguments );
        return results ?: [];
    }

    /**
     * Get a single user by ID
     */
    struct function getUser( required numeric id ) {
        arguments.event = "api.users.show";
        var results = super.process( argumentCollection = arguments );
        return results ?: {};
    }

    /**
     * Save a user record
     */
    struct function saveUser( required struct userData ) {
        arguments.event = "api.users.save";
        structAppend( arguments, userData );
        return super.process( argumentCollection = arguments ) ?: {};
    }
}
```

## Matching Event Handler

The event handler accessed via `process()` can return data just as it would in an HTTP call. Handlers can distinguish proxy calls from browser calls using `event.isProxyRequest()`:

```javascript
// handlers/api/Users.cfc
component extends="coldbox.system.EventHandler" {

    property name="userService" inject="UserService";

    function index( event, rc, prc ) {
        var data = userService.list(
            page  = rc.page  ?: 1,
            limit = rc.limit ?: 25
        );

        // Return data directly when called via proxy
        if ( event.isProxyRequest() ) {
            return data.getRecords();
        }

        // Normal MVC view rendering
        prc.users = data;
        event.setView( "users/index" );
    }
}
```

## Proxy Methods Reference

| Method | Description |
|--------|-------------|
| `process( event, [args...] )` | Execute a ColdBox event; extra args merged into request collection |
| `announce( state, data )` | Fire a ColdBox interception announcement |
| `getInstance( name, dsl, initArguments )` | Get a WireBox model object |
| `getController()` | Return the ColdBox controller instance |
| `getCache( cacheName )` | Return a named CacheBox cache provider |
| `getCacheBox()` | Return the CacheBox instance |
| `getLogBox()` | Return the LogBox instance |
| `getWireBox()` | Return the WireBox instance |
| `getInterceptor( name )` | Get a named interceptor |
| `getRemotingUtil()` | Utility to manipulate output / buffer |
| `loadColdBox( appMapping )` | Load an external ColdBox application into scope |

## AppMapping for Non-HTTP Protocols

When using Flex/AIR or event gateways (no HTTP), ColdBox cannot auto-detect your app location. Set `COLDBOX_APP_MAPPING` in `Application.cfc`:

```javascript
// Application.cfc
component {
    // Empty string means app is at webroot (default)
    COLDBOX_APP_MAPPING = "";

    // Sub-folder: app lives at /apps/myApp
    // COLDBOX_APP_MAPPING = "apps.myApp";
}
```

> `COLDBOX_APP_MAPPING` is an **instantiation path**, not a file system path.

## Interception: preProxyResults

Use the `preProxyResults` interception point to transform, log, or audit results before they are returned to the caller:

```javascript
// interceptors/ProxyLogger.cfc
component extends="coldbox.system.Interceptor" {

    property name="log" inject="logbox:logger:{this}";

    function preProxyResults( event, interceptData ) {
        log.debug( "Proxy call completed", {
            event   : event.getCurrentEvent(),
            results : interceptData.proxyResults
        } );
    }
}
```

## ProxyReturnCollection Setting

By default, `process()` returns whatever the event handler returns. To always return the full request collection instead, set:

```javascript
// config/ColdBox.cfc
coldbox = {
    proxyReturnCollection : true
};
```

## SOAP Web Service Example

```javascript
// remote/ProductService.cfc
component
    extends    = "coldbox.system.remote.ColdboxProxy"
    output     = "false"
    hint       = "Product remote service"
{
    /**
     * @webservice true
     */
    remote array function getProducts( string category = "" ) {
        arguments.event = "api.products.index";
        return super.process( argumentCollection = arguments ) ?: [];
    }

    remote struct function getProduct( required string id ) {
        arguments.event = "api.products.show";
        return super.process( argumentCollection = arguments ) ?: {};
    }
}
```

## Key Rules

- Never place business logic inside proxy CFCs — delegate everything to handlers via `process()`.
- Keep proxy CFCs organized by domain (e.g., `UserProxy`, `OrderProxy`) rather than one giant proxy.
- Always provide a safe default return value (`?: []`, `?: {}`) in case the event returns nothing.
- Use `event.isProxyRequest()` in handlers to differentiate proxy vs. HTTP responses.
- Set `COLDBOX_APP_MAPPING` only when using non-HTTP protocols and the app is NOT at the webroot.