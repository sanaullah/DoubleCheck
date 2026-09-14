---
name: coldbox-layout-development
description: "Use this skill when creating ColdBox layouts (master page templates), building admin layouts, creating reusable view partials, implementing nested content rendering with renderView(), switching layouts dynamically per handler, or organizing HTML structure around content views."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# Layout Development

## When to Use This Skill

Use this skill when creating ColdBox layout templates that wrap views with a consistent HTML structure (navigation, headers, footers).

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

ColdBox layouts:
- Live in `layouts/` directory
- Wrap rendered views with headers, footers, navigation
- Default layout is `Main.cfm`
- Views render within layouts via `#renderView()#`
- Can be overridden per handler or per action
- Support nested partials with `#renderView( view = "shared/..." )#`

## Main Layout (BoxLang/CFML)

```cfml
<!--- layouts/Main.cfm --->
<!DOCTYPE html>
<html lang="en">
<head>
    <cfoutput>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>#encodeForHTML( prc.pageTitle ?: "My Application" )#</title>
    <link rel="stylesheet" href="/includes/css/app.css">
    </cfoutput>
</head>
<body>
    <!--- Navigation partial --->
    #renderView( "shared/_nav" )#

    <!--- Flash messages --->
    #renderView( "shared/_flash" )#

    <!--- Main content view --->
    <main class="container">
        #renderView()#
    </main>

    <!--- Footer partial --->
    #renderView( "shared/_footer" )#

    <script src="/includes/js/app.js"></script>
</body>
</html>
```

## Admin Layout

```cfml
<!--- layouts/Admin.cfm --->
<!DOCTYPE html>
<html lang="en">
<head>
    <cfoutput>
    <meta charset="UTF-8">
    <title>Admin | #encodeForHTML( prc.pageTitle ?: "Administration" )#</title>
    <link rel="stylesheet" href="/includes/css/admin.css">
    </cfoutput>
</head>
<body class="admin">
    #renderView( "admin/shared/_header" )#

    <div class="admin-wrapper">
        <aside>
            #renderView( "admin/shared/_sidebar" )#
        </aside>
        <main class="admin-content">
            #renderView( "shared/_flash" )#
            #renderView()#
        </main>
    </div>

    #renderView( "admin/shared/_footer" )#
    <script src="/includes/js/admin.js"></script>
</body>
</html>
```

## Named Layouts in ColdBox.cfc

```boxlang
// config/ColdBox.cfc
class ColdBox extends coldbox.system.Coldbox {
    function configure() {
        layoutSettings = {
            defaultLayout : "Main",
            defaultView   : "main/index"
        }
    }
}
```

**CFML (`.cfc`):**

```cfml
// config/ColdBox.cfc
component extends="coldbox.system.Coldbox" {
    function configure() {
        layoutSettings = {
            defaultLayout : "Main",
            defaultView   : "main/index"
        }
    }
}
```

## Switching Layouts per Handler

```boxlang
// Admin handler — use admin layout for all actions
class Admin extends coldbox.system.EventHandler {

    this.preHandler = "setAdminLayout"

    private function setAdminLayout( event, rc, prc, action ) {
        event.setLayout( "Admin" )
        prc.section = "admin"
    }

    function index( event, rc, prc ) {
        prc.pageTitle = "Dashboard"
        event.setView( "admin/dashboard" )
    }
}

// Per-action layout override
function preview( event, rc, prc ) {
    event.setView( view = "report/print", layout = "Print" )
}

function modal( event, rc, prc ) {
    event.setView( "users/modal" ).noLayout()
}
```

**CFML (`.cfc`):**

```cfml
// Admin handler — use admin layout for all actions
component extends="coldbox.system.EventHandler" {

    this.preHandler = "setAdminLayout"

    private function setAdminLayout( event, rc, prc, action ) {
        event.setLayout( "Admin" )
        prc.section = "admin"
    }

    function index( event, rc, prc ) {
        prc.pageTitle = "Dashboard"
        event.setView( "admin/dashboard" )
    }
}

// Per-action layout override
function preview( event, rc, prc ) {
    event.setView( view = "report/print", layout = "Print" )
}

function modal( event, rc, prc ) {
    event.setView( "users/modal" ).noLayout()
}
```

## Shared Partials

```cfml
<!--- views/shared/_nav.cfm --->
<cfoutput>
<nav class="navbar">
    <a href="#buildLink( 'main.index' )#" class="brand">My App</a>
    <ul>
        <cfif auth().check()>
            <li><a href="#buildLink( 'dashboard.index' )#">Dashboard</a></li>
            <li><a href="#buildLink( 'security.logout' )#">Logout</a></li>
        <cfelse>
            <li><a href="#buildLink( 'security.login' )#">Login</a></li>
        </cfif>
    </ul>
</nav>
</cfoutput>

<!--- views/shared/_flash.cfm --->
<cfoutput>
<cfif flash.exists( "success" )>
    <div class="alert alert-success">#encodeForHTML( flash.get( "success" ) )#</div>
</cfif>
<cfif flash.exists( "error" )>
    <div class="alert alert-error">#encodeForHTML( flash.get( "error" ) )#</div>
</cfif>
<cfif flash.exists( "errors" )>
    <div class="alert alert-error">
        <ul>
        <cfloop array="#flash.get( 'errors' )#" item="e">
            <li>#encodeForHTML( e )#</li>
        </cfloop>
        </ul>
    </div>
</cfif>
</cfoutput>
```

## Print / Email Layouts

```cfml
<!--- layouts/Print.cfm — no navigation, clean for printing --->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        @media print { .no-print { display: none; } }
    </style>
</head>
<body>
    #renderView()#
    <div class="no-print">
        <button onclick="window.print()">Print</button>
    </div>
</body>
</html>

<!--- layouts/Email.cfm — minimal for email rendering --->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
    </style>
</head>
<body>
    <table width="600" align="center">
        <tr><td>#renderView()#</td></tr>
    </table>
</body>
</html>
```

## Module-Specific Layouts

```cfml
<!--- modules_app/admin/layouts/Admin.cfm --->
<!DOCTYPE html>
<html>
<head>
    <title>Admin Module</title>
</head>
<body>
    #renderView( view = "shared/_nav", module = "admin" )#
    <main>#renderView()#</main>
</body>
</html>
```

```boxlang
// ModuleConfig.cfc — set module default layout
class ModuleConfig {
    function configure() {
        layoutSettings = {
            defaultLayout : "Admin"
        }
    }
}
```

**CFML (`.cfc`):**

```cfml
// ModuleConfig.cfc — set module default layout
component {
    function configure() {
        layoutSettings = {
            defaultLayout : "Admin"
        }
    }
}
```

## Layout Best Practices

- Name layouts semantically (`Main`, `Admin`, `Print`, `Email`, `Minimal`)
- Use `#renderView()#` (no args) to inject the current view content
- Prefix shared partials with `_` by convention (`_nav.cfm`, `_flash.cfm`)
- Keep layouts free of business logic — they should only compose HTML
- Set the default layout in `layoutSettings.defaultLayout` in ColdBox.cfc
- Use `.noLayout()` for AJAX responses, modals, and email rendering
- Place module-specific layouts in the module's `layouts/` folder