---
name: coldbox-testing-handler
description: "Use this skill when testing ColdBox event handlers with execute(), asserting rc/prc collections, verifying view selection and rendered output, mocking relocations, testing renderData() and getHandlerResults(), setting HTTP methods and headers, injecting mocks into handlers, or using BaseHandlerTest for isolated handler unit tests."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# Handler Testing in ColdBox

## When to Use This Skill

- Writing tests for ColdBox handlers/controllers
- Asserting what view, layout, or data a handler returns
- Verifying redirect/relocation behavior after form submissions
- Testing RESTful handlers that call `renderData()`
- Checking HTTP status codes set by handlers
- Unit-testing a handler in full isolation with `BaseHandlerTest`

## Language Mode Reference

| Concept | BoxLang (`.bx`) preferred | CFML (`.cfc`) compatible |
|---|---|---|
| Class declaration | `class extends="..." {}` | `component extends="..." {}` |
| Closures | `() => {}` | `function() {}` |

---

## Testing Class Choices

| Class | Purpose |
|---|---|
| `coldbox.system.testing.BaseTestCase` | **Integration** — loads the full virtual ColdBox app |
| `coldbox.system.testing.BaseHandlerTest` | **Isolated unit** — tests the handler CFC with no app load |

Use `BaseTestCase` for most handler tests. Use `BaseHandlerTest` only when you want full isolation.

---

## Integration Handler Test (BaseTestCase)

```boxlang
class extends="coldbox.system.testing.BaseTestCase" appMapping="/root" {

    function beforeAll() {
        super.beforeAll()
    }

    function afterAll() {
        super.afterAll()
    }

    function run() {
        describe( "Main Handler", () => {

            beforeEach( () => {
                // CRITICAL: fresh virtual request per spec
                setup()
            } )

            it( "renders the homepage", () => {
                var event = execute( event = "main.index", renderResults = true )
                expect( event.getPrivateValue( "welcomeMessage" ) ).toBe( "Welcome to ColdBox!" )
                expect( event.getCurrentView() ).toBe( "main/index" )
            } )

            it( "places users in prc", () => {
                var event = execute( event = "users.index", renderResults = true )
                expect( event.getPrivateValue( "users" ) ).toBeArray()
            } )

            it( "stores a user and redirects", () => {
                var event = execute(
                    event          = "users.store",
                    renderResults  = true,
                    eventArguments = { name: "Alice", email: "alice@example.com" }
                )
                expect( event.getValue( "relocate_event", "" ) ).toBe( "users.index" )
            } )

        } )
    }
}
```

---

## The execute() Method

`execute()` simulates a ColdBox event and returns the request context. It is limited to **GET-style** simulation. For POST/PUT/DELETE use the HTTP method helpers.

| Argument | Type | Default | Description |
|---|---|---|---|
| `event` | string | — | Event to execute e.g. `"users.index"` |
| `route` | string | — | Route URL e.g. `"/users"` — also exercises URL mappings |
| `queryString` | string | `""` | Query string appended to the simulated request |
| `private` | boolean | `false` | Execute as a private event |
| `prePostExempt` | boolean | `false` | Skip pre/post interceptors |
| `eventArguments` | struct | `{}` | Arguments passed directly into the handler action |
| `renderResults` | boolean | `false` | Render output and store in `cbox_rendered_content` |
| `withExceptionHandling` | boolean | `false` | Route errors through ColdBox exception handling |
| `domain` | string | `cgi.server_name` | Simulate a specific domain |

---

## Asserting Results

### Handler Return Value

```boxlang
// handler
function list( event, rc, prc ) {
    return "Hola Luis"
}

// spec
var event = execute( event = "main.list", renderResults = true )
expect( event.getHandlerResults() ).toBe( "Hola Luis" )
// also available as rc value
expect( event.getValue( "cbox_handler_results" ) ).toBe( "Hola Luis" )
```

### View Selection

```boxlang
var event = execute( event = "users.index", renderResults = true )
expect( event.getCurrentView() ).toBe( "users/index" )
```

### Rendered Content

```boxlang
var event = execute( event = "main.data", renderResults = true )
expect( event.getRenderedContent() ).toBeJSON()
```

### renderData() — REST handlers

```boxlang
// handler
function data( event, rc, prc ) {
    event.renderData( data = myService.getData(), type = "json" )
}

// spec
var event = execute( event = "main.data", renderResults = true )
expect( event.getRenderData().type ).toBe( "json" )
expect( event.getPrivateValue( "cbox_renderdata" ).type ).toBe( "json" )
```

### HTTP Status Code

```boxlang
var event = execute( event = "api.users.show", renderResults = true )
expect( event.getStatusCode() ).toBe( 200 )
// ColdBox matcher shorthand
expect( event.getResponse() ).toHaveStatus( 200 )
```

### prc / rc Values

```boxlang
// private collection (set by handler via prc.x = ...)
var user = event.getPrivateValue( "user" )
expect( user ).toHaveKey( "id" )
expect( user.email ).toBe( "alice@example.com" )

// public collection (from rc)
var name = event.getValue( "name" )
```

---

## Mocking Relocations

ColdBox automatically stubs `relocate()` during tests. Relocation arguments are saved as `relocate_*` keys in the rc.

```boxlang
it( "redirects to users.index after save", () => {
    var event = execute(
        event          = "users.store",
        eventArguments = { name: "Bob", email: "bob@example.com" }
    )
    expect( event.getValue( "relocate_event", "" ) ).toBe( "users.index" )
} )

it( "redirects with status 301", () => {
    var event = execute( event = "legacy.redirect" )
    expect( event.getValue( "relocate_statusCode", "" ) ).toBe( "301" )
} )
```

The available `relocate_*` keys:

| Key | Description |
|---|---|
| `relocate_event` | Target ColdBox event |
| `relocate_URL` | Target URL |
| `relocate_URI` | Target URI |
| `relocate_queryString` | Query string |
| `relocate_statusCode` | HTTP redirect status code |

Or use the ColdBox TestBox matcher:

```boxlang
expect( event ).toRedirectTo( "main.index" )
```

---

## Lifecycle and setup()

```boxlang
function beforeAll() {
    super.beforeAll()
    // one-time app-level setup
}

function afterAll() {
    super.afterAll()
}

function run() {
    describe( "Users Handler", () => {

        beforeEach( () => {
            setup()  // fresh virtual request per spec — never skip this
        } )

        // specs...
    } )
}
```

> **Important:** If you do not call `super.beforeAll()` / `super.afterAll()`, the virtual app will not load/unload correctly. Always funnel the super call.

---

## Performance: Keep ColdBox Loaded Across Bundles

By default the virtual app is destroyed after each bundle. To share it across bundles for faster runs:

```boxlang
class extends="coldbox.system.testing.BaseTestCase"
    appMapping="/root"
    unloadColdBox="false"
{
    this.unloadColdBox = false
    // ...
}
```

---

## Test Annotations

| Annotation | Default | Description |
|---|---|---|
| `appMapping` | `/` | Slash-notation path to the ColdBox app root |
| `configMapping` | `{appMapping}/config/Coldbox.cfc` | Dot-notation path to config CFC |
| `coldboxAppKey` | `cbController` | Application scope key for the controller |
| `loadColdBox` | `true` | Whether to load the virtual app |
| `unloadColdBox` | `true` | Whether to unload the virtual app after specs |

```boxlang
class extends="coldbox.system.testing.BaseTestCase"
    appMapping="/apps/MyApp"
    configMapping="apps.MyApp.test.resources.Config"
{}
```

---

## Injecting Mock Services

```boxlang
beforeEach( () => {
    setup()
    variables.mockUserService = createMock( "models.UserService" )
    prepareMock( getInstance( "users@handlers" ) )
        .$property( propertyName = "userService", mock = mockUserService )
} )

it( "calls userService.findAll", () => {
    mockUserService.$( "findAll" ).$results( [ { id: 1, name: "Alice" } ] )
    var event = execute( event = "users.index", renderResults = true )
    expect( mockUserService.$once( "findAll" ) ).toBeTrue()
    expect( event.getPrivateValue( "users" ) ).toHaveLength( 1 )
} )
```

---

## Isolated Handler Unit Test (BaseHandlerTest)

`BaseHandlerTest` tests the handler CFC in complete isolation — no virtual ColdBox app. Mock all dependencies manually.

```boxlang
class extends="coldbox.system.testing.BaseHandlerTest" handler="handlers.users" {

    function beforeAll() {
        super.setup()
        mockUserService = createMock( "models.UserService" )
        handler.$property( propertyName = "userService", mock = mockUserService )
    }

    function run() {
        describe( "users handler — isolated", () => {

            it( "index places users in prc", () => {
                mockUserService.$( "findAll" ).$results( [ { id: 1 } ] )
                var event = execute( event = "users.index" )
                expect( event.getPrivateValue( "users" ) ).toHaveLength( 1 )
            } )

        } )
    }
}
```

> Integration tests load the full ColdBox app; isolated handler tests (`BaseHandlerTest`) do not. In isolated tests you must mock every dependency the handler uses.

---

## CommandBox Scaffolding

```bash
coldbox create integration-test handler=users actions=index,show,store --open
```

---

## Key Methods Quick Reference

| Method | Description |
|---|---|
| `execute( event, renderResults, eventArguments )` | Execute a ColdBox event |
| `setup()` | Reset the virtual request — call in `beforeEach` |
| `event.getCurrentView()` | View name chosen by the handler |
| `event.getRenderedContent()` | Rendered output string |
| `event.getHandlerResults()` | Value explicitly returned by the handler action |
| `event.getRenderData()` | Struct from `renderData()` call |
| `event.getPrivateValue( key )` | Read from `prc` |
| `event.getValue( key )` | Read from `rc` |
| `event.getStatusCode()` | HTTP status code |
| `event.getResponse()` | ColdBox response object (supports `.toHaveStatus()`) |
| `prepareMock( handler )` | Prepare handler for property injection |
| `getInstance( name )` | Get a WireBox-managed object |