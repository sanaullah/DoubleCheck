---
name: coldbox-testing-integration
description: "Use this skill when writing integration tests for ColdBox that use real dependencies (database, WireBox, ColdBox context), testing full request/response cycles with execute(), setting up and tearing down test databases, testing services with real data, or using BaseTestCase for end-to-end handler tests with actual WireBox injections."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# Integration Testing in ColdBox

## Overview

Integration tests verify how components work together using real dependencies — actual database connections, real WireBox injections, and full ColdBox request cycles. Unlike unit tests, integration tests do not mock external dependencies, instead relying on a test database or real services.

## Language Mode Reference

Examples use **BoxLang (`.bx`)** syntax by default. Adapt for your target language:

| Concept | BoxLang (`.bx`) | CFML (`.cfc`) |
|---------|-----------------|---------------|
| Class declaration | `class [extends="..."] {` | `component [extends="..."] {` |
| DI annotation | `@inject` above `property name="svc";` | `property name="svc" inject="svc";` |
| View templates | `.bxm` suffix | `.cfm` / `.cfml` suffix |
| Tag prefix | `<bx:if>`, `<bx:output>`, `<bx:set>` | `<cfif>`, `<cfoutput>`, `<cfset>` |

> **CFML Compat Mode**: With BoxLang + CFML Compat module, `.bx` and `.cfc` files coexist freely. BoxLang-native classes use `class {}` (`.bx` files); CFML-compat classes use `component {}` (`.cfc` files).

## Basic Integration Test

```boxlang
component extends="coldbox.system.testing.BaseTestCase" appMapping="/root" {

    function beforeAll() {
        super.setup()
        // Get real services from WireBox (no mocks)
        variables.userService = getInstance( "UserService" )
    }

    function afterAll() {
        structDelete( application, "cbController" )
    }

    function run() {
        describe( "UserService Integration", () => {

            beforeEach( () => {
                setupTestDatabase()
            } )

            afterEach( () => {
                cleanupTestDatabase()
            } )

            it( "should create and retrieve a user from DB", () => {
                // Act - uses real database
                user = userService.create( {
                    name: "Alice Smith",
                    email: "alice@example.com"
                } )

                // Assert
                expect( user.id ).toBeNumeric()

                // Retrieve from DB
                found = userService.findById( user.id )
                expect( found.name ).toBe( "Alice Smith" )
            } )

            it( "should return empty when no users exist", () => {
                users = userService.findAll()
                expect( users ).toBeArray()
                expect( users ).toBeEmpty()
            } )
        } )
    }

    private function setupTestDatabase() {
        queryExecute( "DELETE FROM users WHERE email LIKE '%@testexample.com'" )
    }

    private function cleanupTestDatabase() {
        queryExecute( "DELETE FROM users WHERE email LIKE '%@testexample.com'" )
    }
}
```

## Full Request Cycle Integration Test

```boxlang
component extends="coldbox.system.testing.BaseTestCase" appMapping="/root" {

    function beforeAll() {
        super.setup()
    }

    function run() {
        describe( "User Registration Integration", () => {

            beforeEach( () => {
                queryExecute( "DELETE FROM users WHERE email = 'integration@test.com'" )
            } )

            it( "should register a user through the full request cycle", () => {
                // Execute through full ColdBox handler stack
                event = execute(
                    event = "users.register",
                    renderResults = true,
                    eventArguments = {
                        name: "Integration User",
                        email: "integration@test.com",
                        password: "TestPass123!"
                    }
                )

                expect( event.getStatusCode() ).toBe( 201 )

                // Verify user actually persisted in DB
                result = queryExecute(
                    "SELECT * FROM users WHERE email = :email",
                    { email: "integration@test.com" }
                )

                expect( result.recordCount ).toBe( 1 )
            } )
        } )
    }
}
```

## Database Transaction Rollback Pattern

```boxlang
component extends="coldbox.system.testing.BaseTestCase" appMapping="/root" {

    function beforeAll() {
        super.setup()
        variables.userService = getInstance( "UserService" )
    }

    function run() {
        describe( "Database integration with rollback", () => {

            beforeEach( () => {
                // Start a transaction before each test
                transaction action="begin" {}
            } )

            afterEach( () => {
                // Roll back all changes — keeps DB clean
                transaction action="rollback" {}
            } )

            it( "should create a user (rolled back after)", () => {
                user = userService.create( {
                    name: "Transaction User",
                    email: "txn@test.com"
                } )

                expect( user.id ).toBeNumeric()

                // Verify within transaction
                found = userService.findById( user.id )
                expect( found.name ).toBe( "Transaction User" )
            } )
        } )
    }
}
```

## Multi-Service Integration Test

```boxlang
component extends="coldbox.system.testing.BaseTestCase" appMapping="/root" {

    function beforeAll() {
        super.setup()
        // Get all real services
        variables.userService  = getInstance( "UserService" )
        variables.orderService = getInstance( "OrderService" )
        variables.emailService = getInstance( "EmailService" )
    }

    function run() {
        describe( "Order placement integration", () => {

            it( "should create user and place first order", () => {
                // Create real user in DB
                user = userService.create( {
                    name: "New Customer",
                    email: "customer@test.com"
                } )

                // Place order for that user
                order = orderService.placeOrder( {
                    customerId: user.id,
                    items: [ { productId: 1, qty: 1, price: 9.99 } ]
                } )

                // Verify order persisted
                expect( order.id ).toBeNumeric()
                expect( order.customerId ).toBe( user.id )
                expect( order.status ).toBe( "pending" )

                // Verify email was queued
                emails = emailService.getQueuedEmails( user.id )
                expect( emails ).toHaveLength( 1 )
                expect( emails[1].type ).toBe( "order_confirmation" )
            } )
        } )
    }
}
```

## API Integration Test (Full Stack)

```boxlang
component extends="coldbox.system.testing.BaseTestCase" appMapping="/root" {

    function beforeAll() {
        super.setup()
        variables.authToken = loginAsTestUser()
    }

    function run() {
        describe( "API Integration Tests", () => {

            it( "should return paginated user list", () => {
                event = execute(
                    event = "api.v1.users.index",
                    renderResults = true
                )

                expect( event.getStatusCode() ).toBe( 200 )

                response = deserializeJSON( event.getRenderedContent() )
                expect( response ).toHaveKey( "data" )
                expect( response ).toHaveKey( "pagination" )
                expect( response.pagination ).toHaveKey( "total" )
            } )

            it( "should reject unauthenticated request", () => {
                event = execute(
                    event = "api.v1.admin.users",
                    renderResults = true
                )

                expect( event.getStatusCode() ).toBe( 401 )
            } )
        } )
    }

    private function loginAsTestUser() {
        loginEvent = execute(
            event = "api.v1.auth.login",
            renderResults = true,
            eventArguments = {
                email: "testadmin@example.com",
                password: "testpassword"
            }
        )
        response = deserializeJSON( loginEvent.getRenderedContent() )
        return response.token
    }
}
```

## Integration vs Unit Test Decision

| Scenario | Use Unit Test | Use Integration Test |
|----------|--------------|---------------------|
| Testing business logic | ? | — |
| Testing DB persistence | — | ? |
| Testing handler routing | — | ? |
| Testing service interactions | Mocks OK | ? Real |
| Testing external APIs | Mock | ? Sandbox |
| Fast feedback loop | ? | — |
| Full stack validation | — | ? |

## Best Practices

1. **Isolate test data** — use unique emails like `test+{uuid}@example.com` or transactions with rollback
2. **Use dedicated test datasource** — configure a test DB in `Application.cfc`
3. **Seed minimal data** — only create what the test needs
4. **Run integration tests separately** — tag with `labels="integration"` to run independently from unit tests
5. **Keep tests deterministic** — don't rely on existing DB state; set it up explicitly