---
name: coldbox-testing-model
description: "Use this skill when unit testing ColdBox model objects (services, repositories, entities, or utility classes) in isolation using BaseModelTest, accessing the pre-wired model variable, leveraging the built-in mock helpers (mockLogger, mockLogBox, mockCacheBox, mockWireBox), calling model.init() to initialize the component, mocking injected properties with prepareMock(), or scaffolding model tests with CommandBox."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# Model / Service Unit Testing in ColdBox

## When to Use This Skill

- Unit testing a service, repository, ORM entity, or utility model in complete isolation
- Mocking logger, LogBox, CacheBox, or WireBox dependencies pre-wired by ColdBox
- Testing model logic without loading the full ColdBox virtual app
- Injecting MockBox stubs for model's injected properties

---

## Base Class

```boxlang
coldbox.system.testing.BaseModelTest
```

Extends `BaseTestCase` with `loadColdBox="false"` — no virtual app is started. Your model CFC is instantiated and handed to you in `variables.model`.

---

## Minimal Setup

```boxlang
class extends="coldbox.system.testing.BaseModelTest" model="models.UserService" {

    function beforeAll() {
        super.setup()          // creates variables.model and pre-wired mocks
        model.init()           // call your component's own init() if needed
    }

    function run() {
        describe( "UserService", () => {

            it( "returns an empty array by default", () => {
                expect( model.findAll() ).toBeArray()
            } )

        } )
    }
}
```

---

## Pre-Wired Mock Variables

After calling `super.setup()`, the following MockBox-created stubs are available:

| Variable | Type | Description |
|---|---|---|
| `variables.model` | CFC instance | The model under test |
| `variables.mockLogger` | Mock object | Stand-in for `LogBox.getLogger()` |
| `variables.mockLogBox` | Mock object | Stand-in for the full LogBox instance |
| `variables.mockCacheBox` | Mock object | Stand-in for CacheBox |
| `variables.mockWireBox` | Mock object | Stand-in for the WireBox injector |

Inject these into your model when its properties reference them:

```boxlang
function beforeAll() {
    super.setup()

    // inject mock logger if UserService has property name="log" inject="logbox:logger:{this}"
    prepareMock( model )
        .$property( propertyName = "log", mock = mockLogger )
        .$property( propertyName = "wirebox", mock = mockWireBox )

    model.init()
}
```

---

## Mocking Collaborating Services

```boxlang
class extends="coldbox.system.testing.BaseModelTest" model="models.OrderService" {

    function beforeAll() {
        super.setup()

        variables.mockProductRepo = createMock( "models.ProductRepository" )
        variables.mockEmailer     = createMock( "models.MailService" )

        prepareMock( model )
            .$property( propertyName = "productRepository", mock = mockProductRepo )
            .$property( propertyName = "mailService",       mock = mockEmailer )

        model.init()
    }

    function run() {
        describe( "OrderService", () => {

            it( "places an order and sends a confirmation email", () => {
                mockProductRepo
                    .$( "findById" )
                    .$results( { id: 1, price: 29.99, stock: 10 } )

                mockEmailer.$( "send" ).$results( true )

                var order = model.placeOrder( productId = 1, quantity = 2, userId = 42 )

                expect( order.status ).toBe( "confirmed" )
                expect( mockEmailer.$once( "send" ) ).toBeTrue()
            } )

            it( "throws when stock is insufficient", () => {
                mockProductRepo
                    .$( "findById" )
                    .$results( { id: 1, price: 29.99, stock: 0 } )

                expect( () => {
                    model.placeOrder( productId = 1, quantity = 5, userId = 42 )
                } ).toThrow( type = "models.OrderService.InsufficientStockException" )
            } )

        } )
    }
}
```

---

## init() Patterns

Some models accept constructor arguments; others use WireBox property injection only. Match the pattern your model uses:

```boxlang
// Pattern 1: no-arg init (injection-only model)
model.init()

// Pattern 2: init with arguments
model.init( dsn = "myDB", timeout = 30 )

// Pattern 3: no init needed (properties all mock-injected before any usage)
prepareMock( model )
    .$property( propertyName = "userGateway", mock = mockGateway )
// call model methods directly without init()
```

---

## Testing Model with ORM Entities

When a model interacts with ORM:

```boxlang
class extends="coldbox.system.testing.BaseModelTest" model="models.PostService" {

    function beforeAll() {
        super.setup()

        variables.mockORM = createMock( "cborm.models.BaseORMService" )
        prepareMock( model )
            .$property( propertyName = "postRepository", mock = mockORM )

        model.init()
    }

    function run() {
        describe( "PostService", () => {

            it( "finds published posts", () => {
                mockORM
                    .$( "findAllWhere" )
                    .$results( [
                        { id: 1, title: "Hello", status: "published" },
                        { id: 2, title: "World", status: "published" }
                    ] )

                var posts = model.getPublished()
                expect( posts ).toHaveLength( 2 )
                expect( mockORM.$once( "findAllWhere" ) ).toBeTrue()
            } )

        } )
    }
}
```

---

## Testing Private / Protected Methods with MockBox

```boxlang
function run() {
    describe( "UserService private methods", () => {

        it( "hashes passwords correctly", () => {
            prepareMock( model )
            // makePublic exposes private/package methods for testing
            model.$( "hashPassword", "hashed_result" )

            var hash = model.$getProperty( "hashPassword" )
            // alternatively call via invokePrivate if TestBox supports it:
            var result = model.invokePrivate( "hashPassword", [ "mypassword" ] )
            expect( result ).toBe( "hashed_result" )
        } )

    } )
}
```

---

## Asserting Log Calls

```boxlang
it( "logs an error when save fails", () => {
    mockProductRepo.$( "save" ).$throws( message = "DB Error", type = "DatabaseException" )
    mockLogger.$( "error" )

    expect( () => { model.saveProduct( {} ) } ).toThrow()
    expect( mockLogger.$once( "error" ) ).toBeTrue()
} )
```

---

## CommandBox Scaffolding

```bash
# Generate a model and its unit test together
coldbox create model name=UserService properties="name,email" --tests

# Or generate just the test
coldbox create unit-test name=UserService type=model --open
```

The generated file extends `BaseModelTest` with the `model` annotation pre-filled.

---

## Key Patterns Summary

| Pattern | Code |
|---|---|
| Extend base class | `extends="coldbox.system.testing.BaseModelTest" model="models.MyService"` |
| Boot model | `super.setup()` then `model.init()` |
| Inject mock logger | `prepareMock( model ).$property( propertyName="log", mock=mockLogger )` |
| Mock a collaborator | `createMock("models.Other")`, inject via `$property()` |
| Assert method called | `expect( mockX.$once("method") ).toBeTrue()` |
| Stub return value | `mockX.$( "method" ).$results( value )` |
| Stub exception | `mockX.$( "method" ).$throws( message, type )` |