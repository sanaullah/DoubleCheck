---
name: coldbox-view-rendering
description: "Use this skill when rendering views and partials in ColdBox, creating reusable view components, caching view output, passing data to views, rendering views from services, using renderView() inline, or dynamically selecting views based on context."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# View Rendering

## When to Use This Skill

Use this skill when creating ColdBox views, rendering partials, passing data between handlers and views, and implementing view caching strategies.

## Language Mode Reference

Examples use **BoxLang (`.bx`)** syntax by default. Adapt for your target language:

| Concept | BoxLang (`.bx`) | CFML (`.cfc`) |
|---------|-----------------|---------------|
| Class declaration | `class [extends="..."] {` | `component [extends="..."] {` |
| DI annotation | `@inject` above `property name="svc";` | `property name="svc" inject="svc";` |
| View templates | `.bxm` suffix | `.cfm` / `.cfml` suffix |
| Tag prefix | `<bx:if>`, `<bx:output>`, `<bx:set>` | `<cfif>`, `<cfoutput>`, `<cfset>` |

> **CFML Compat Mode**: With BoxLang + CFML Compat module, `.bx` and `.cfc` files coexist freely. BoxLang-native classes use `class {}` (`.bx` files); CFML-compat classes use `component {}` (`.cfc` files).

## Core Concepts

ColdBox views:
- Live in `views/` directory and match handler naming conventions
- Receive data from handlers via `prc` (private request collection)
- Are wrapped in layouts unless `noLayout()` is called
- Can render partials with `renderView()` or `#renderView()#`
- Can be cached per template or per event
- Can render module-specific views

## Basic View Structure

```cfml
<!--- views/users/index.cfm --->
<cfoutput>
<div class="container">
    <h1>Users</h1>

    <cfif flash.exists( "success" )>
        <div class="alert alert-success">
            #flash.get( "success" )#
        </div>
    </cfif>

    <table class="table">
        <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            <cfloop array="#prc.users#" item="user">
            <tr>
                <td>#encodeForHTML( user.getName() )#</td>
                <td>#encodeForHTML( user.getEmail() )#</td>
                <td>
                    <a href="#buildLink( 'users.show', { id: user.getId() } )#">View</a>
                    <a href="#buildLink( 'users.edit', { id: user.getId() } )#">Edit</a>
                </td>
            </tr>
            </cfloop>
        </tbody>
    </table>
</div>
</cfoutput>
```

## Rendering Partials Inline

```cfml
<!--- Renders views/shared/_flash.cfm inline --->
#renderView( "shared/_flash" )#

<!--- With data passed to partial --->
#renderView(
    view = "shared/_user_card",
    args = { user: prc.user, showActions: true }
)#

<!--- Module views --->
#renderView( view = "partials/widget", module = "myModule" )#

<!--- Cached partial --->
#renderView(
    view                 = "partials/sidebar",
    cache                = true,
    cacheTimeout         = 60,
    cacheLastAccessTimeout = 30
)#
```

## Handler to View Data

```boxlang
// Handler
function show( event, rc, prc ) {
    prc.user     = userService.getById( rc.id ?: 0 )
    prc.posts    = postService.findByUser( prc.user )
    prc.pageTitle = "Profile: #prc.user.getName()#"
    event.setView( "users/show" )
}
```

```cfml
<!--- views/users/show.cfm --->
<cfoutput>
<title>#encodeForHTML( prc.pageTitle )#</title>
<h1>#encodeForHTML( prc.user.getName() )#</h1>
<p>#encodeForHTML( prc.user.getEmail() )#</p>

<h2>Posts</h2>
<cfloop array="#prc.posts#" item="post">
    <h3>#encodeForHTML( post.getTitle() )#</h3>
    <p>#encodeForHTML( post.getExcerpt() )#</p>
</cfloop>
</cfoutput>
```

## Rendering from Services

```boxlang
// Inject renderer into service
class EmailService {

    @inject
    property name="renderer" inject="coldbox:renderer";

    function getWelcomeEmailHTML( user ) {
        return renderer.renderView(
            view = "emails/welcome",
            args = { user: user }
        )
    }
}
```

**CFML (`.cfc`):**

```cfml
// Inject renderer into service
component {

    property name="renderer" inject="renderer" inject="coldbox:renderer";

    function getWelcomeEmailHTML( user ) {
        return renderer.renderView(
            view = "emails/welcome",
            args = { user: user }
        )
    }
}
```

## Dynamic View Selection

```boxlang
// Select view based on format
function show( event, rc, prc ) {
    prc.user = userService.getById( rc.id ?: 0 )

    var format = rc.format ?: "html"
    switch( format ){
        case "print":
            event.setView( view = "users/print", layout = "PrintLayout" )
            break
        case "pdf":
            event.setView( view = "users/pdf" ).noLayout()
            break
        default:
            event.setView( "users/show" )
    }
}

// Select view based on user role
function dashboard( event, rc, prc ) {
    var user = auth().user()
    prc.user = user

    if( user.hasRole( "admin" ) ){
        event.setView( "dashboard/admin" )
    } else if( user.hasRole( "manager" ) ){
        event.setView( "dashboard/manager" )
    } else {
        event.setView( "dashboard/user" )
    }
}
```

## View Caching Strategies

```boxlang
// Cache full view output per event (in handler)
function catalogList( event, rc, prc ) {
    event.setEventCacheableEntry(
        provider   = "template",
        timeout    = 60,
        lastAccess = 30
    )

    prc.categories = categoryService.list()
    event.setView( "catalog/list" )
}

// Per-view fragment caching in view template
#renderView(
    view         = "shared/featured_products",
    cache        = true,
    cacheTimeout = 30
)#
```

## Rendering No Layout (Partials/Streams)

```boxlang
// No layout for modal partial
function userCard( event, rc, prc ) {
    prc.user = userService.getById( rc.id ?: 0 )
    event.setView( "users/_card" ).noLayout()
}

// No layout for email preview
function emailPreview( event, rc, prc ) {
    prc.user = userService.getById( rc.id ?: 0 )
    event.setView( view = "emails/welcome", layout = "EmailLayout" ).noLayout()
}
```

## BoxLang Template Views (.bxm)

```cfml
<!--- views/users/index.bxm — BoxLang template syntax --->
<bx:output>
<div class="container">
    <h1>Users</h1>

    <bx:loop array="#prc.users#" item="user">
    <div class="user-card">
        <h3>#encodeForHTML( user.getName() )#</h3>
        <p>#encodeForHTML( user.getEmail() )#</p>
    </div>
    </bx:loop>
</div>
</bx:output>
```

## View Best Practices

- Always use `encodeForHTML()` / `encodeForHTMLAttribute()` for user data
- Use `prc` for view data (not `rc`) — keep presentation clean
- Prefix partials with underscore (`_card.cfm`, `_flash.cfm`) by convention
- Use `renderView()` for partials and composable view fragments
- Cache views for expensive database-driven content that doesn't change frequently
- Use `.noLayout()` for AJAX rendered fragments and email previews
- Never write business logic in views — delegate to services