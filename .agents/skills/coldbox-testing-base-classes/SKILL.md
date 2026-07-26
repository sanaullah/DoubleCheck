---
name: coldbox-testing-base-classes
description: "Use this skill to understand which ColdBox testing base class to extend for a given test type, configure test bundle annotations (appMapping, configMapping, unloadColdBox, loadColdBox, coldboxAppKey), set up the tests/ harness (Application.cfc, folder structure), or choose between integration testing (BaseTestCase), isolated handler testing (BaseHandlerTest), model unit testing (BaseModelTest), and interceptor unit testing (BaseInterceptorTest)."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# ColdBox Testing Base Classes

## Class Hierarchy

```
testbox.system.BaseSpec
 ??? coldbox.system.testing.BaseTestCase
      ??? coldbox.system.testing.BaseHandlerTest
      ??? coldbox.system.testing.BaseModelTest
      ??? coldbox.system.testing.BaseInterceptorTest
```

---

## Quick Decision Guide

| I want to test… | Extend |
|---|---|
| Handler actions using the full virtual app (execute / routes / interceptors) | `BaseTestCase` |
| Handler CFC in complete isolation (no app load) | `BaseHandlerTest` |
| A model/service/ORM entity in isolation | `BaseModelTest` |
| An interceptor CFC in isolation | `BaseInterceptorTest` |
| Any CFML/BX component with no ColdBox app | `BaseSpec` (TestBox) |

---

## Bundle Annotations Reference

All ColdBox test bundles support these annotations:

| Annotation | Default | Description |
|---|---|---|
| `appMapping` | `/` | Slash-notation path to the app root relative to the web root (e.g. `/apps/blog`) |
| `configMapping` | `{appMapping}/config/Coldbox.cfc` | Dot-notation path to the config CFC |
| `coldboxAppKey` | `cbController` | Application scope key where the controller is stored |
| `loadColdBox` | `true` | Boot the virtual ColdBox app in `beforeAll` |
| `unloadColdBox` | `true` | Destroy the virtual app in `afterAll` |

```boxlang
class extends="coldbox.system.testing.BaseTestCase"
    appMapping="/apps/blog"
    configMapping="apps.blog.test.resources.Config"
    coldboxAppKey="cbController"
    unloadColdBox="false"
{}
```

> Setting `unloadColdBox="false"` is a major performance win when multiple bundles share the same app.

---

## Test Harness Structure

CommandBox generates this layout when you run `coldbox create app`:

```
tests/
??? Application.cfc          ? harness Application.cfc
??? resources/                ? fixtures, test data, test config
?   ??? Config.cfc
??? specs/
    ??? integration/          ? BaseTestCase bundles
    ??? unit/
        ??? handlers/         ? BaseHandlerTest bundles
        ??? models/           ? BaseModelTest bundles
        ??? interceptors/     ? BaseInterceptorTest bundles
```

### tests/Application.cfc

```boxlang
class {
    this.name               = "ColdBoxTestingSuite"
    this.sessionManagement  = true
    this.sessionTimeout     = createTimeSpan( 0, 0, 15, 0 )
    this.applicationTimeout = createTimeSpan( 0, 0, 15, 0 )
    this.setClientCookies   = true

    // Map the test app root
    this.mappings[ "/root" ] = expandPath( "../" )

    function onRequestStart( string targetPage ) {
        // flush before each request
        if ( structKeyExists( url, "fwreinit" ) ) {
            if ( structKeyExists( server, "lucee" ) ) {
                pagePoolClear()
            }
        }
    }
}
```

---

## BaseTestCase — Integration

Loads the full virtual ColdBox app. Use for end-to-end handler, route, and cross-layer tests.

```boxlang
class extends="coldbox.system.testing.BaseTestCase"
    appMapping="/root"
    unloadColdBox="false"
{
    function beforeAll() { super.beforeAll() }
    function afterAll()  { super.afterAll()  }

    function run() {
        describe( "My Integration Suite", () => {
            beforeEach( () => { setup() } )  // reset virtual request
            // specs...
        } )
    }
}
```

**Key methods available:**

| Method | Description |
|---|---|
| `setup()` | Reset the virtual request (call in `beforeEach`) |
| `execute( event, renderResults, ... )` | Simulate an event (GET-style) |
| `get/post/put/patch/delete( route, params, headers, body )` | HTTP verb simulation |
| `getInstance( name )` | Resolve a WireBox object |
| `getController()` | Access the ColdBox controller |
| `getWireBox()` | Access the WireBox injector |
| `prepareMock( target )` | Prepare an object for MockBox |

---

## BaseHandlerTest — Isolated Handler Unit

Tests handler CFCs with no app load. You must mock every dependency.

```boxlang
class extends="coldbox.system.testing.BaseHandlerTest" handler="handlers.users" {

    function beforeAll() {
        super.setup()   // note: setup(), not beforeAll()
    }

    function run() {
        describe( "users handler — isolated", () => {
            it( "calls the service", () => {
                var mockSvc = createMock( "models.UserService" )
                handler.$property( propertyName = "userService", mock = mockSvc )
                mockSvc.$( "findAll" ).$results( [] )
                var event = execute( event = "users.index" )
                expect( mockSvc.$once( "findAll" ) ).toBeTrue()
            } )
        } )
    }
}
```

**Available after `super.setup()`:**

- `variables.handler` — the instantiated handler CFC
- `variables.handlerName` — fully-qualified name
- `execute()` — runs the handler action
- `prepareMock()`, `createMock()` — MockBox helpers

---

## BaseModelTest — Model / Service Unit

Tests model CFCs in isolation with pre-wired mock helpers. No app load.

```boxlang
class extends="coldbox.system.testing.BaseModelTest" model="models.UserService" {

    function beforeAll() {
        super.setup()
        model.init()   // call your own init if needed
    }

    function run() {
        describe( "UserService — isolated", () => {
            it( "computes something", () => {
                expect( model.compute() ).toBe( 42 )
            } )
        } )
    }
}
```

**Available after `super.setup()`:**

| Variable | Description |
|---|---|
| `variables.model` | Instantiated model under test |
| `variables.mockLogger` | Mock LogBox logger |
| `variables.mockLogBox` | Mock LogBox |
| `variables.mockCacheBox` | Mock CacheBox |
| `variables.mockWireBox` | Mock WireBox injector |

---

## BaseInterceptorTest — Interceptor Unit

Tests interceptor CFCs in isolation with pre-wired mock helpers. No app load.

```boxlang
class extends="coldbox.system.testing.BaseInterceptorTest"
    interceptor="interceptors.SecurityFirewall"
{
    function beforeAll() {
        super.setup()
    }

    function run() {
        describe( "SecurityFirewall — isolated", () => {
            it( "blocks unauthenticated requests", () => {
                interceptor.preProcess( mockRequestContext, {} )
                expect( mockRequestContext.$once( "noRender" ) ).toBeTrue()
            } )
        } )
    }
}
```

**Available after `super.setup()`:**

| Variable | Description |
|---|---|
| `variables.interceptor` | Instantiated interceptor under test |
| `variables.mockController` | Mock ColdBox controller |
| `variables.mockRequestService` | Mock request service |
| `variables.mockLogger` | Mock LogBox logger |
| `variables.mockLogBox` | Mock LogBox |
| `variables.mockFlash` | Mock flash scope |

---

## Custom TestBox Matchers (ColdBox adds)

| Matcher | Used on | Description |
|---|---|---|
| `toHaveStatus( code )` | response object | Assert HTTP status code |
| `toHaveInvalidData( field, msg )` | response object | Assert cbValidation field violation |
| `toRedirectTo( event )` | event/request context | Assert relocation target |

---

## CommandBox Scaffolding

```bash
coldbox create integration-test handler=users actions=index,show,store
coldbox create unit-test name=UserService type=model
coldbox create unit-test name=SecurityFirewall type=interceptor
```