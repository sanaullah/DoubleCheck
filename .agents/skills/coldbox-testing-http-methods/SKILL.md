---
name: coldbox-testing-http-methods
description: "Use this skill when simulating HTTP requests in ColdBox tests using the get(), post(), put(), patch(), delete(), or request() methods, setting request headers (Authorization, Accept, Content-Type), sending JSON request bodies, asserting response status with toHaveStatus(), checking validation errors with toHaveInvalidData(), or understanding the difference between execute() (event-based) and the HTTP method helpers (route/URL-based)."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# HTTP Method Testing in ColdBox

## When to Use HTTP Method Helpers vs execute()

| Method | What it simulates | Use for |
|---|---|---|
| `execute( event )` | ColdBox event string (e.g. `"users.index"`) | Directly calling a handler action — no routing |
| `get/post/put/patch/delete( route )` | HTTP verb + URL/route | Testing REST APIs, routing, verb constraints |
| `request( method, route )` | Generic — any HTTP verb | Non-standard verbs or programmatic verb selection |

> `get()`, `post()`, etc. route through the full ColdBox routing layer, so they also test URL mappings and HTTP-method-constrained routes.

---

## Signatures

All HTTP helpers share the same parameter set:

```boxlang
function get(
    required string route,    // URL or named route
    struct  params  = {},     // query string / form params
    struct  headers = {},     // HTTP headers
    any     body    = ""      // raw request body (string or struct)
) {}

// identical signature for post(), put(), patch(), delete()

function request(
    required string method,   // HTTP verb
    required string route,
    struct  params  = {},
    struct  headers = {},
    any     body    = ""
) {}
```

All helpers return the **event/request context** object (same as `execute()`).

---

## GET Requests

```boxlang
it( "lists users", () => {
    var event = get( route = "/api/users" )
    expect( event.getResponse() ).toHaveStatus( 200 )
    var body = deserializeJSON( event.getRenderedContent() )
    expect( body.data ).toBeArray()
} )

it( "returns a single user", () => {
    var event = get( route = "/api/users/1" )
    expect( event.getResponse() ).toHaveStatus( 200 )
} )
```

---

## GET with Query String

```boxlang
it( "filters by name", () => {
    var event = get(
        route  = "/api/users",
        params = { filter: "alice", page: 1 }
    )
    expect( event.getResponse() ).toHaveStatus( 200 )
} )
```

---

## POST — Form Submission

```boxlang
it( "creates a user", () => {
    var event = post(
        route  = "/api/users",
        params = { name: "Alice", email: "alice@example.com" }
    )
    expect( event.getResponse() ).toHaveStatus( 201 )
} )
```

---

## POST — JSON Body

Pass a struct as `body` — ColdBox will serialize it and set `Content-Type: application/json`:

```boxlang
it( "creates a user via JSON", () => {
    var event = post(
        route   = "/api/users",
        headers = { "Content-Type": "application/json", "Accept": "application/json" },
        body    = { name: "Bob", email: "bob@example.com", role: "admin" }
    )
    expect( event.getResponse() ).toHaveStatus( 201 )
    var body = deserializeJSON( event.getRenderedContent() )
    expect( body.data.email ).toBe( "bob@example.com" )
} )
```

---

## PUT / PATCH — Updates

```boxlang
it( "updates a user fully", () => {
    var event = put(
        route = "/api/users/1",
        body  = { name: "Alice Updated", email: "alice2@example.com" }
    )
    expect( event.getResponse() ).toHaveStatus( 200 )
} )

it( "partial update via patch", () => {
    var event = patch(
        route = "/api/users/1",
        body  = { email: "newemail@example.com" }
    )
    expect( event.getResponse() ).toHaveStatus( 200 )
} )
```

---

## DELETE

```boxlang
it( "deletes a user", () => {
    var event = delete( route = "/api/users/1" )
    expect( event.getResponse() ).toHaveStatus( 204 )
} )
```

---

## Authenticated Requests (Headers)

```boxlang
// JWT Bearer token
it( "returns 200 with valid token", () => {
    var token = obtainToken( "alice", "password123" )
    var event = get(
        route   = "/api/protected/resource",
        headers = { "Authorization": "Bearer #token#" }
    )
    expect( event.getResponse() ).toHaveStatus( 200 )
} )

// API Key header
it( "returns 401 without api key", () => {
    var event = get( route = "/api/protected/resource" )
    expect( event.getResponse() ).toHaveStatus( 401 )
} )
```

---

## Asserting Response Status

```boxlang
// ColdBox custom matcher (recommended)
expect( event.getResponse() ).toHaveStatus( 200 )

// Direct assertion
expect( event.getStatusCode() ).toBe( 200 )
expect( event.getResponse().getStatusCode() ).toBe( 404 )
```

---

## Asserting Validation Errors (cbValidation)

`toHaveInvalidData( field, message )` checks that the response contains a cbValidation constraint error for the given field:

```boxlang
it( "returns 422 when email is missing", () => {
    var event = post(
        route  = "/api/users",
        params = { name: "Bob" }  // no email
    )
    expect( event.getResponse() ).toHaveStatus( 422 )
    expect( event.getResponse() ).toHaveInvalidData( "email", "required" )
} )
```

---

## Asserting JSON Response Shape

```boxlang
it( "returns correct response envelope", () => {
    var event = get( route = "/api/users" )
    var json  = deserializeJSON( event.getRenderedContent() )
    expect( json ).toHaveKey( "data" )
    expect( json ).toHaveKey( "pagination" )
    expect( json.pagination.total ).toBeGTE( 0 )
} )
```

---

## BDD Story Pattern — Full CRUD Flow

```boxlang
describe( "Users API", () => {

    beforeEach( () => { setup() } )

    story( "As an admin I can manage users", () => {

        given( "valid input", () => {

            then( "I can create a user (201)", () => {
                var event = post(
                    route   = "/api/users",
                    headers = authHeaders(),
                    body    = { name: "Carol", email: "carol@example.com" }
                )
                expect( event.getResponse() ).toHaveStatus( 201 )
            } )

            then( "I can list users (200)", () => {
                var event = get( route = "/api/users", headers = authHeaders() )
                expect( event.getResponse() ).toHaveStatus( 200 )
            } )

        } )

        given( "invalid input", () => {
            then( "I get validation errors (422)", () => {
                var event = post( route = "/api/users", headers = authHeaders(), body = {} )
                expect( event.getResponse() ).toHaveStatus( 422 )
            } )
        } )

    } )

} )
```

---

## Key Response Object Methods

| Method | Description |
|---|---|
| `event.getResponse()` | ColdBox response object (supports custom matchers) |
| `event.getStatusCode()` | Integer HTTP status code |
| `event.getRenderedContent()` | Rendered response body as string |
| `event.getHandlerResults()` | Value returned by the handler action |
| `event.getRenderData()` | Struct from `event.renderData()` |
| `event.getValue( key )` | Read from request collection (rc) |
| `event.getPrivateValue( key )` | Read from private collection (prc) |
| `event.getCurrentView()` | View name selected by the handler |