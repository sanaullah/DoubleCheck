---
name: coldbox-testing-interceptor
description: "Use this skill when unit testing ColdBox interceptors in isolation using BaseInterceptorTest, accessing the pre-wired interceptor variable, leveraging mock helpers (mockController, mockRequestService, mockLogger, mockLogBox, mockFlash), configuring interceptor properties with configProperties, calling interceptor announce points directly, or scaffolding interceptor tests with CommandBox."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# Interceptor Unit Testing in ColdBox

## When to Use This Skill

- Unit testing an interceptor CFC in complete isolation (no virtual ColdBox app)
- Testing individual interception points (`preProcess`, `postProcess`, `onException`, custom events)
- Mocking the controller, request service, logger, or flash scope
- Verifying that an interceptor modifies the request context or calls other services

---

## Base Class

```boxlang
coldbox.system.testing.BaseInterceptorTest
```

Extends `BaseTestCase` with `loadColdBox="false"`. Your interceptor CFC is instantiated and handed to you in `variables.interceptor`.

---

## Minimal Setup

```boxlang
class extends="coldbox.system.testing.BaseInterceptorTest"
    interceptor="interceptors.SecurityFirewall"
{

    function beforeAll() {
        super.setup()   // creates variables.interceptor and all mock helpers
    }

    function run() {
        describe( "SecurityFirewall", () => {

            it( "allows authenticated requests through", () => {
                // inject a mock authenticated session into the mocked request context
                mockRequestContext.$( "getValue" ).$results( { userId: 42 } )

                interceptor.preProcess( mockRequestContext, {} )

                expect( mockRequestContext.$never( "noRender" ) ).toBeTrue()
            } )

        } )
    }
}
```

---

## Pre-Wired Mock Variables

After `super.setup()`, the following are available:

| Variable | Description |
|---|---|
| `variables.interceptor` | The instantiated interceptor under test |
| `variables.mockController` | Mock of the ColdBox controller |
| `variables.mockRequestService` | Mock of the request service |
| `variables.mockLogger` | Mock LogBox logger |
| `variables.mockLogBox` | Mock LogBox instance |
| `variables.mockFlash` | Mock flash scope |

---

## Calling Interception Points

Invoke any interception point directly as a method on `interceptor`:

```boxlang
interceptor.preProcess( mockEvent, interceptData )
interceptor.postProcess( mockEvent, interceptData )
interceptor.onException( mockEvent, { exception: cfcatch } )
interceptor.preHandlerInvoke( mockEvent, interceptData )
interceptor.postHandlerInvoke( mockEvent, interceptData )

// Custom announce point registered by the interceptor
interceptor.onUserLogin( mockEvent, { user: { id: 1 } } )
```

---

## Configuring Interceptor Properties

Many interceptors read their own config properties. Set them via `configProperties` before calling `super.setup()`:

```boxlang
class extends="coldbox.system.testing.BaseInterceptorTest"
    interceptor="interceptors.RateLimiter"
{

    function beforeAll() {
        variables.configProperties = {
            maxRequests : 100,
            windowSeconds : 60
        }
        super.setup()
    }

    function run() {
        describe( "RateLimiter", () => {
            it( "blocks requests beyond the limit", () => {
                // test with configProperties already applied
            } )
        } )
    }
}
```

---

## Full Example — Security Interceptor

```boxlang
class extends="coldbox.system.testing.BaseInterceptorTest"
    interceptor="interceptors.SecurityFirewall"
{

    function beforeAll() {
        super.setup()
        // Inject mock services the interceptor has via WireBox
        variables.mockJWTService = createMock( "cbsecurity.models.JWTService" )
        prepareMock( interceptor )
            .$property( propertyName = "jwtService", mock = mockJWTService )
        interceptor.configure()
    }

    function run() {

        describe( "SecurityFirewall interceptor", () => {

            describe( "preProcess", () => {

                it( "allows request when valid JWT present", () => {
                    mockJWTService
                        .$( "parseToken" )
                        .$results( { valid: true, userId: 42 } )
                    mockRequestContext
                        .$( "getHTTPHeader" )
                        .$results( "Bearer valid.jwt.token" )
                    mockRequestContext.$( "setValue" )

                    interceptor.preProcess( mockRequestContext, {} )

                    expect( mockRequestContext.$once( "setValue", [ "currentUser", { valid: true, userId: 42 } ] ) ).toBeTrue()
                } )

                it( "aborts request when token is invalid", () => {
                    mockJWTService
                        .$( "parseToken" )
                        .$throws( type = "TokenInvalidException" )
                    mockRequestContext
                        .$( "getHTTPHeader" )
                        .$results( "" )
                    mockRequestContext.$( "noRender" )

                    interceptor.preProcess( mockRequestContext, {} )

                    expect( mockRequestContext.$once( "noRender" ) ).toBeTrue()
                } )

            } )

        } )
    }
}
```

---

## Mocking Additional Dependencies

```boxlang
function beforeAll() {
    super.setup()

    // Inject any additional mock collaborators
    variables.mockCacheService = createMock( "models.CacheService" )
    prepareMock( interceptor )
        .$property( propertyName = "cacheService",  mock = mockCacheService )
        .$property( propertyName = "log",            mock = mockLogger )
        .$property( propertyName = "controller",     mock = mockController )

    interceptor.configure()
}
```

---

## Testing Announce Points on the Controller

```boxlang
it( "announces a custom event after processing", () => {
    mockController.$( "announce" )

    interceptor.postHandlerInvoke( mockRequestContext, {} )

    expect( mockController.$once( "announce", [ "onAfterHandlerInvoke", {} ] ) ).toBeTrue()
} )
```

---

## Testing Flash Scope Interactions

```boxlang
it( "stores messages in flash scope", () => {
    mockFlash.$( "put" )
    mockRequestContext.$( "getPrivateValue" ).$results( "Access denied" )

    interceptor.preProcess( mockRequestContext, {} )

    expect( mockFlash.$once( "put" ) ).toBeTrue()
} )
```

---

## CommandBox Scaffolding

```bash
# Generate an interceptor and its unit test
coldbox create interceptor name=SecurityFirewall points=preProcess,postProcess --tests

# Or generate just the test
coldbox create unit-test name=SecurityFirewall type=interceptor --open
```

---

## Key Patterns Summary

| Pattern | Code |
|---|---|
| Extend base class | `extends="coldbox.system.testing.BaseInterceptorTest" interceptor="interceptors.MyInterceptor"` |
| Boot interceptor | `super.setup()` then `interceptor.configure()` (if applicable) |
| Set config properties | Assign `variables.configProperties = {}` BEFORE `super.setup()` |
| Inject mock logger | `prepareMock( interceptor ).$property( propertyName="log", mock=mockLogger )` |
| Mock collaborator | `createMock("models.X")`, inject via `$property()` |
| Call announce point | `interceptor.preProcess( mockRequestContext, interceptData )` |
| Assert method called | `expect( mockX.$once("method") ).toBeTrue()` |
| Assert method NOT called | `expect( mockX.$never("method") ).toBeTrue()` |