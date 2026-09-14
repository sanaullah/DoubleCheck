---
name: coldbox-reviewer
description: "Use this skill when reviewing ColdBox application code for correctness, security, performance, testability, and adherence to ColdBox conventions. Covers handlers, services, models, interceptors, modules, routing, ORM/OBM usage, REST APIs, dependency injection patterns, and common anti-patterns to flag during pull request reviews."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# ColdBox Code Reviewer

## When to Use This Skill

Use this skill when:
- Reviewing pull requests for ColdBox (BoxLang or CFML) applications
- Auditing an existing codebase for quality and security issues
- Establishing a code review checklist for a development team
- Identifying anti-patterns or risky patterns in ColdBox code

---

## Language Mode Reference

Examples use **BoxLang (`.bx`)** syntax by default. Adapt for your target language:

| Concept | BoxLang (`.bx`) | CFML (`.cfc`) |
|---------|-----------------|---------------|
| Class declaration | `class [extends="..."] {` | `component [extends="..."] {` |
| DI annotation | `@inject` above `property name="svc";` | `property name="svc" inject="svc";` |
| View templates | `.bxm` suffix | `.cfm` / `.cfml` suffix |
| Tag prefix | `<bx:if>`, `<bx:output>`, `<bx:set>` | `<cfif>`, `<cfoutput>`, `<cfset>` |

> **CFML Compat Mode**: With BoxLang + CFML Compat module, `.bx` and `.cfc` files coexist freely. BoxLang-native classes use `class {}` (`.bx` files); CFML-compat classes use `component {}` (`.cfc` files).

## Review Checklist Overview

| Category | Key Questions |
|----------|--------------|
| Architecture | Does the code follow the ColdBox layers correctly? |
| Handlers | Are actions thin? No business logic leaking in? |
| Services | Single responsibility? Proper error handling? |
| Security | Input validated? SQL injection / XSS / CSRF covered? |
| Dependency Injection | WireBox used correctly? No `createObject()` anti-patterns? |
| ORM / Queries | N+1 problem? Unsafe concatenation in HQL/SQL? |
| REST APIs | Consistent HTTP verbs, status codes, and response shape? |
| Performance | Unnecessary DB hits? Missing caching? |
| Testability | Logic in handler actions? Hard-coded dependencies? |
| Documentation | Public API documented? Deprecated APIs marked? |

---

## Architecture & Layering

### ? Correct Layering

```
Handler ? Service ? DAO / ORM Entity
          ? (optional)
       Interceptor / Event
```

- **Handlers** — route events, populate prc, delegate to services
- **Services** — all business logic, emit interception points
- **DAOs / Repositories** — only data access
- **Models / Entities** — data + domain behavior; no framework calls

### ? Anti-Patterns to Flag

```js
// ? Business logic inside a handler action
function create( event, rc, prc ) {
    var user = new User()
    user.setEmail( rc.email )
    // hashing inside the handler — belongs in a service
    user.setPassword( hash( rc.password, "bcrypt" ) )
    entitySave( user )
    event.setView( "users/created" )
}

// ? Delegate to service
function create( event, rc, prc ) {
    prc.user = userService.create( rc )
    event.setView( "users/created" )
}
```

---

## Handler Review

### Checklist

- [ ] Action is thin — only coordinates between service calls and view setup
- [ ] `rc` inputs are validated before use (or validated inside the service)
- [ ] No raw SQL or ORM queries directly in handler
- [ ] `allowedMethods` is declared to restrict HTTP verbs
- [ ] `event.paramValue()` used instead of `isDefined("rc.x")` checks
- [ ] `relocate()` used after successful POST (PRG pattern)
- [ ] No `cfoutput` / direct response writes in a non-REST handler

### Common Handler Issues

```js
// ? Missing allowedMethods guard — allows DELETE via GET
function delete( event, rc, prc ) {
    userService.delete( rc.userId )
    relocate( "users.index" )
}

// ? Always declare allowedMethods
this.allowedMethods = { delete: "DELETE,POST" }

// ? Direct array access without param check
function show( event, rc, prc ) {
    prc.user = userService.find( rc.userId ) // rc.userId may not exist
}

// ? Use paramValue() to provide a safe default
function show( event, rc, prc ) {
    event.paramValue( "userId", 0 )
    prc.user = userService.find( rc.userId )
}
```

---

## Security Review

### Input Validation & Sanitization

```js
// ? Using rc directly in a query without validation
var q = queryExecute( "SELECT * FROM users WHERE email = '#rc.email#'" )

// ? Use query params (always)
var q = queryExecute(
    "SELECT * FROM users WHERE email = :email",
    { email: { value: rc.email, cfsqltype: "cf_sql_varchar" } }
)
```

### Cross-Site Scripting (XSS)

```html
<!-- ? Unescaped output in views -->
<p>#prc.user.getBio()#</p>

<!-- ? Always encode output -->
<p>#encodeForHTML( prc.user.getBio() )#</p>
```

### Mass Assignment

```js
// ? Populating an entity directly from rc — exposes all fields
getBeanPopulator().populateFromStruct( user, rc )

// ? Allowlist only expected keys
getBeanPopulator().populateFromStruct(
    user,
    rc,
    include = "firstName,lastName,email"
)
```

### CSRF

- Verify that mutating actions (POST/PUT/DELETE) check a CSRF token if the app uses session-based auth
- JWT-based REST APIs are generally exempt (token in header, not cookie)

### Authentication / Authorization Checks

```js
// ? No authorization check before operating on another user's data
function update( event, rc, prc ) {
    userService.update( rc.userId, rc )
}

// ? Verify the current user owns the resource
function update( event, rc, prc ) {
    if ( !authService.canEdit( rc.userId ) ) {
        return event.renderData( type: "json", data: { error: "Forbidden" }, statusCode: 403 )
    }
    userService.update( rc.userId, rc )
}
```

---

## Dependency Injection (WireBox)

### Checklist

- [ ] All dependencies injected via `property name="..." inject="..."` — no `createObject()`
- [ ] Singletons (`singleton` scope) hold no mutable request-level state
- [ ] Request/transient objects use `transient` scope or `wirebox.getInstance()`
- [ ] No `application.wirebox` access patterns in business code

### Common DI Issues

```js
// ? Manual instantiation defeats WireBox
class {
    function init() {
        variables.userService = createObject( "component", "models.UserService" ).init()
    }
}

// ? Let WireBox inject it
class {
    property name="userService" inject="UserService";
}

// ? Singleton service holds request-scoped state — causes data leakage between requests
class singleton {
    property name="currentUser"; // ? DANGEROUS in a singleton
}

// ? Store per-request state in prc, not in a singleton service
```

---

## ORM / Query Review

### N+1 Query Problem

```js
// ? N+1: one query to load orders, then one per order for user
for ( var order in orders ) {
    print( order.getUser().getEmail() )  // triggers a SELECT for each order
}

// ? Use HQL with join fetch
var orders = ORMExecuteQuery(
    "FROM Order o JOIN FETCH o.user WHERE o.status = :status",
    { status: "active" }
)
```

### Unsafe HQL / SQL

```js
// ? String concatenation in HQL — SQL injection risk
var results = ORMExecuteQuery( "FROM User WHERE email = '#arguments.email#'" )

// ? Named parameters
var results = ORMExecuteQuery(
    "FROM User WHERE email = :email",
    false,
    { email: arguments.email }
)
```

### Query of Queries

```js
// ? QoQ on a large query is slow; loop aggregation in CFML is faster
var result = new Query( sql: "SELECT * FROM myBigQuery WHERE status = 'active'", dbtype: "query", myBigQuery: myBigQuery ).execute().getResult()

// ? For aggregation, use the database query or array functions instead
```

---

## REST API Review

### Checklist

- [ ] Correct HTTP verbs used: GET (read), POST (create), PUT/PATCH (update), DELETE (delete)
- [ ] Correct HTTP status codes returned: 200, 201, 204, 400, 401, 403, 404, 422, 500
- [ ] Error responses follow a consistent JSON shape: `{ "error": "message" }`
- [ ] No sensitive data (passwords, tokens, PII) in response bodies
- [ ] Pagination info included in list endpoints: `{ data: [], meta: { page, total } }`
- [ ] `Content-Type: application/json` set on all JSON responses

### Common REST Issues

```js
// ? Wrong status code for creation
function create( event, rc, prc ) {
    prc.user = userService.create( rc )
    event.renderData( type: "json", data: prc.user, statusCode: 200 ) // should be 201
}

// ?
event.renderData( type: "json", data: prc.user, statusCode: 201 )

// ? Swallowing errors and returning 200
function update( event, rc, prc ) {
    try {
        userService.update( rc )
        event.renderData( type: "json", data: { success: true } )
    } catch( any e ) {
        event.renderData( type: "json", data: { success: false } ) // ? 200 status even on failure
    }
}

// ? Return appropriate 4xx/5xx codes
} catch( ValidationException e ) {
    event.renderData( type: "json", data: { error: e.message }, statusCode: 422 )
} catch( any e ) {
    event.renderData( type: "json", data: { error: "Internal error" }, statusCode: 500 )
}
```

---

## Performance Review

### Checklist

- [ ] No per-request database calls for data that rarely changes (use CacheBox)
- [ ] No wildcard `SELECT *` on wide tables
- [ ] Large result sets use pagination, not full loads
- [ ] View rendering does not execute queries (data loaded in action, not view)
- [ ] No expensive operations inside loops

### Caching Anti-Pattern

```js
// ? Hits the DB on every request for config that never changes
function getConfig( event, rc, prc ) {
    prc.config = configService.loadAllSettings()
}

// ? Cache it
function getConfig( event, rc, prc ) {
    prc.config = cache( "appConfig", 60, function() {
        return configService.loadAllSettings()
    } )
}
```

---

## Testability Review

### Checklist

- [ ] Business logic is in services — not in handlers or views — so it can be unit-tested
- [ ] Services accept dependencies via injection (not hard-coded `createObject()`)
- [ ] Methods return values rather than writing directly to `prc` or `application`
- [ ] Side effects (email, SMS, external calls) are behind an interface so they can be mocked
- [ ] No global state required to test a method in isolation

### Hard-to-Test Pattern

```js
// ? Hard to test — direct DB call + global scope write
function processOrder( required numeric orderId ) {
    var order = entityLoad( "Order", orderId, true )
    application.stats.orderCount++
    sendEmail( to: order.getUser().getEmail(), subject: "Order confirmed" )
}

// ? Testable — dependencies injected, side effects behind interfaces
function processOrder( required numeric orderId ) {
    var order = orderDAO.find( orderId )
    statsService.incrementOrders()
    emailService.sendOrderConfirmation( order )
    return order
}
```

---

## Interceptor Review

### Checklist

- [ ] Interceptor has a single, clearly stated responsibility
- [ ] Does not perform heavy work on high-frequency points (`preProcess`, `postRender`)
- [ ] Terminates the request with `event.noExecution()` correctly when intercepting
- [ ] Does not swallow exceptions silently

```js
// ? Heavy DB query on every single request
void function preProcess( event, interceptData, buffer ) {
    prc.menuItems = menuService.loadAll() // hits DB on every request
}

// ? Cache it
void function preProcess( event, interceptData, buffer ) {
    prc.menuItems = cache( "menuItems", 10, function() {
        return menuService.loadAll()
    } )
}
```

---

## Module Review

### Checklist

- [ ] `box.json` has accurate `version`, `name`, and ColdBox version constraint
- [ ] `ModuleConfig.cfc` declares all settings with sensible defaults
- [ ] Routes are prefixed with the module namespace to avoid conflicts
- [ ] Interceptors are registered in `interceptors` array, not hard-coded
- [ ] Module cleans up after itself in `onUnload()`

---

## Documentation Review

- [ ] Every public method has a `/** ... */` comment with description + `@return`
- [ ] Handler actions document `@rc` inputs and `@prc` outputs
- [ ] Deprecated APIs are marked `@deprecated` with a migration path
- [ ] New public APIs have `@since` set to the current version
- [ ] Comments are accurate (not stale from a previous implementation)

---

## Quick Reference: Red Flags

| Code Pattern | Issue |
|-------------|-------|
| `"SELECT ... WHERE x = '#var#'"` | SQL injection |
| `#prc.userInput#` in a view with no encoding | XSS |
| `populateFromStruct(entity, rc)` with no allowlist | Mass assignment |
| `createObject("component", "some.path").init()` | Bypasses WireBox |
| `application.scope` mutations in a handler | Global state; race conditions |
| `cfquery` inside a `cfloop` | N+1 / chatty DB pattern |
| Missing `allowedMethods` on mutating actions | CSRF / verb tampering |
| `catch(any e) { /* empty */ }` | Swallowed exceptions |
| Singleton with mutable instance state | Request data leakage |
| Business logic in a view template | Untestable, violates MVC |