---
name: coldbox-documenter
description: "Use this skill when writing or improving documentation comments for ColdBox application code -- handlers, models, services, interceptors, layouts, modules, and configuration files. Covers what to document, what to skip, ColdBox-specific patterns for @event/@rc/@prc, integration with DocBox annotations, and documentation standards that result in accurate, useful API docs."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# ColdBox Documenter

## When to Use This Skill

Use this skill when:
- Writing or reviewing documentation comments for any ColdBox component
- Deciding what information belongs in a block comment vs inline code comments
- Preparing a ColdBox application for DocBox API documentation generation
- Establishing documentation standards across a development team

## Language Mode Reference

Examples use **BoxLang (`.bx`)** syntax by default. Adapt for your target language:

| Concept | BoxLang (`.bx`) | CFML (`.cfc`) |
|---------|-----------------|---------------|
| Class declaration | `class [extends="..."] {` | `component [extends="..."] {` |
| DI annotation | `@inject` above `property name="svc";` | `property name="svc" inject="svc";` |
| View templates | `.bxm` suffix | `.cfm` / `.cfml` suffix |
| Tag prefix | `<bx:if>`, `<bx:output>`, `<bx:set>` | `<cfif>`, `<cfoutput>`, `<cfset>` |

> **CFML Compat Mode**: With BoxLang + CFML Compat module, `.bx` and `.cfc` files coexist freely. BoxLang-native classes use `class {}` (`.bx` files); CFML-compat classes use `component {}` (`.cfc` files).

## Guiding Principles

1. **Document the contract, not the implementation.** Comments should describe *what* and *why*, not *how*. The code already shows how.
2. **Prioritize public API.** Every public method needs a comment. Private/package-private methods need one only when the intent is not obvious.
3. **Be concise but complete.** One sharp sentence is better than three vague ones.
4. **Keep comments synchronized.** Outdated comments are worse than no comments — update them when code changes.

## File-Level Documentation Standards

### Which Files to Document

| File Type | Priority | Notes |
|-----------|----------|-------|
| Handlers | High | All public actions + class-level description |
| Services / Models | High | All public methods + class-level description |
| Interceptors | High | `configure()` + every announced event method |
| Modules / `ModuleConfig` | High | Module purpose, version, dependencies |
| Configuration (`ColdBox.cfc`, `Router.cfc`) | Medium | Annotate non-obvious settings |
| Layouts + Views | Low | Only complex layouts with significant logic |
| Tests | Skip | Test names document intent well enough |

## Documenting Handlers

### Class-Level

```js
/**
 * Handles all HTTP endpoints for the User resource.
 *
 * Supports listing, viewing, creating, updating, and deleting users.
 * Requires an authenticated session for all actions except `register`.
 *
 * @author  Dev Team
 * @since   1.0
 */
class extends="coldbox.system.EventHandler" {
```

### Action Methods (`@event`, `@rc`, `@prc`)

ColdBox handler actions always receive `event`, `rc`, and `prc`. Use these standard tags:

```js
/**
 * Display paginated list of users.
 *
 * Reads optional `rc.page` (default 1) and `rc.pageSize` (default 25).
 *
 * @event   RequestContext
 * @rc      rc.page, rc.pageSize — pagination controls
 * @prc     prc.users — populated with paginated User records
 * @return  void
 */
function index( event, rc, prc ) {
    ...
}
```

### REST Actions

For REST handlers, document the HTTP contract explicitly:

```js
/**
 * GET /api/v1/users/:userId — retrieve a single user.
 *
 * @event      RequestContext
 * @rc         rc.userId — path parameter
 * @prc        prc.user — populated User entity or null
 * @return     JSON: { data: User } on success; { error } on not found
 * @throws     EntityNotFound  When userId does not match any record
 * @since      2.0
 */
function show( event, rc, prc ) {
    ...
}
```

### Documenting `allowedMethods`

```js
/**
 * Accepted HTTP methods for each handler action.
 * Requests with wrong methods automatically receive a 405 response.
 */
this.allowedMethods = {
    create  : "POST",
    update  : "PUT,PATCH",
    delete  : "DELETE"
};
```

## Documenting Services

Services form the backbone of business logic. Document every public method thoroughly.

```js
/**
 * Manages the User lifecycle: creation, authentication, profile management, and deletion.
 *
 * All password handling uses bcrypt via the `bCrypt` module.
 * Emits `user.created`, `user.updated`, and `user.deleted` via Interceptors.
 *
 * @author     Dev Team
 * @version    2.1
 * @since      1.0
 */
class {

    property name="userDAO"       inject="UserDAO";
    property name="passwordService" inject="PasswordService";

    /**
     * Find a user by primary key; throws if not found.
     *
     * @userId  The numeric user ID to look up
     * @return  User entity
     * @throws  EntityNotFound  When no user exists with this ID
     */
    User function findOrFail( required numeric userId ) { ... }

    /**
     * Authenticate a user by email and password.
     *
     * Returns a populated User on success, or throws on invalid credentials.
     * Locks the account after 5 consecutive failures.
     *
     * @email     The user's email address
     * @password  Plaintext password to verify
     * @return    Authenticated User entity
     * @throws    AuthenticationException  On invalid credentials
     * @throws    AccountLockedException   After 5 consecutive failures
     */
    User function authenticate( required string email, required string password ) { ... }

    /**
     * Permanently delete a user and all associated records.
     *
     * Emits the `user.deleted` interception point before deletion.
     *
     * @userId     The user to delete
     * @return     void
     * @since      1.5
     * @deprecated Use `deactivate()` instead — permanent deletion is discouraged
     */
    void function delete( required numeric userId ) { ... }
}
```

## Documenting Models / Entities

For ORM or Active Record entities, document non-obvious properties and all computed/relationship methods.

```js
/**
 * Represents a system user and their authentication/profile data.
 *
 * ORM entity mapped to the `users` table.
 *
 * @author  Dev Team
 * @since   1.0
 */
class persistent="true" table="users" {

    /**
     * Auto-generated surrogate primary key.
     */
    property name="id" type="numeric" fieldtype="id" generator="native";

    /**
     * Hashed bcrypt password — never store raw plaintext here.
     */
    property name="passwordHash" type="string" column="password_hash";

    /**
     * Returns true when the account has been verified by email.
     */
    boolean function isVerified() { return len( getEmailVerifiedAt() ) > 0 }

    /**
     * All roles assigned to this user (many-to-many via user_roles).
     *
     * @return  Array of Role entities
     */
    array function getRoles() { ... }
}
```

## Documenting Interceptors

```js
/**
 * Security interceptor that enforces authentication on every request.
 *
 * Runs on `preProcess` to validate sessions before any handler executes.
 * Exempts paths in `settings.securityExemptions`.
 *
 * @author  Dev Team
 * @since   1.0
 */
class extends="coldbox.system.Interceptor" {

    /**
     * Declare which interception points this interceptor listens to.
     */
    property name="interceptorSettings" inject="coldbox:interceptorSettings";

    /**
     * Intercept every request and validate authentication.
     *
     * Redirects unauthenticated requests to the login page.
     *
     * @event   RequestContext
     * @data    Interception data struct (empty for preProcess)
     * @buffer  Output buffer
     * @return  void
     */
    void function preProcess( event, interceptData, buffer ) { ... }
}
```

## Documenting Modules (`ModuleConfig.cfc`)

```js
/**
 * Module configuration for the `cbSecurity` module.
 *
 * Provides authentication, authorization, JWT, and rate-limiting
 * functionality for ColdBox applications.
 *
 * @author  Ortus Solutions
 * @version 3.5.0
 * @since   1.0
 */
class {

    /** Human-readable title shown in the admin panel. */
    this.title       = "cbSecurity";

    /** Short description used in module listings. */
    this.description = "Security module for ColdBox applications";

    /** Minimum ColdBox version required. */
    this.cfMapping   = "cbSecurity";

    function configure() {
        // ...
    }
}
```

## Documenting Configuration Files

### `config/ColdBox.cfc`

Comment non-obvious settings in the `configure()` body:

```js
function configure() {

    // Application identity
    coldbox = {
        appName      : "MyApp",
        appKey       : "MyApp",
        // Enable async logging to prevent log writes from blocking requests
        logBoxConfig : "config.LogBox"
    };

    // Custom exception handler: renders pretty error pages in production
    coldbox.exceptionHandler = "main.onException";

    // Register interceptors loaded at startup
    interceptors = [
        { class: "interceptors.Security",   properties: {} },
        { class: "interceptors.Maintenance", properties: {} }
    ];
}
```

### `config/Router.cfc`

Document non-obvious routing rules:

```js
/**
 * Application URL routing configuration.
 *
 * Routes are matched top-to-bottom; the first match wins.
 * API routes live under the `/api/v1` namespace.
 */
class extends="coldbox.system.web.routing.Router" {

    function configure() {

        // SPA catch-all: serve index for any unmatched route (React/Vue routing)
        route( "/app/:anything" ).to( "main.index" );

        // API v1 namespace
        group( { pattern: "/api/v1", namespace: "api.v1" }, function() {
            resources( resource: "users",   handler: "Users" );
            resources( resource: "products", handler: "Products" );
        } );
    }
}
```

## What NOT to Document

Avoid noise comments that restate the obvious:

```js
// BAD — restates the function name
/**
 * Gets the user.
 */
User function getUser() { ... }

// GOOD — adds value
/**
 * Returns the currently authenticated user from the session scope.
 * Throws when called outside an authenticated request.
 *
 * @return  Authenticated User entity
 * @throws  AuthenticationRequired  When no active session exists
 */
User function getCurrentUser() { ... }
```

Also skip:
- Getters/setters generated by `accessors=true` — they need no comments
- One-liner private helpers where the name is self-explanatory
- Test spec files — test names document behavior

## Documentation Checklist

Before submitting a ColdBox component:

- [ ] Class/component has a `/** ... */` comment with a clear one-sentence summary
- [ ] All public methods have parameter + return documentation
- [ ] `@throws` tags list every exception the method can produce
- [ ] Deprecated elements are marked with `@deprecated` + migration hint
- [ ] `@since` is set on all new public API additions
- [ ] Handler actions document `@rc` inputs and `@prc` outputs
- [ ] REST endpoints document the HTTP verb, path, and response shape
- [ ] Inherited settings (from ORM, ColdBox conventions) are noted where they differ
- [ ] Comments are in sync with the current implementation