---
name: route-visualizer
description: >
  Use this skill when inspecting all registered ColdBox routes using the route-visualizer module.
  Covers installation as a development dependency, accessing the route-visualizer UI, understanding
  the route table output, and restricting access to development environments.
applyTo: "**/*.{bx,cfc,cfm,bxm}"
---

# Route Visualizer Skill

## When to Use This Skill

Load this skill when:
- Debugging route registration and handler mapping in a ColdBox application
- Verifying that REST API routes are correctly defined and ordered
- Checking which HTTP methods, patterns, and actions are registered
- Onboarding new developers to understand the application's URL structure

## Installation

Install as a development-only dependency:

```bash
box install route-visualizer --saveDev
```

## Accessing the Route Visualizer

Once installed, navigate to:

```
http://localhost:8500/route-visualizer
```

The visualizer displays all registered routes including:
- HTTP method(s) allowed
- URL pattern
- Handler and action target
- Route name
- Module (if applicable)
- Middleware assigned

## Module-Specific Routes

To view routes for a specific module:

```
http://localhost:8500/route-visualizer?module=api
```

## Filtering Routes

The UI supports text-based filtering. Use the search box to filter by path, handler, or name.

## Best Practices

- **Install with `--saveDev`** — should never be present in production environments
- **Restrict to development only** — confirm the module is listed under `devDependencies` in `box.json`, not `dependencies`
- **Verify route ordering** — ColdBox routes are first-match-wins; use the visualizer to catch shadowing
- **Use before deploying** to confirm all expected API routes are registered after router changes
- **Do not commit `--savedev` installs to shared production boxes** — use box.json environment scoping

## box.json Example

```json
{
    "devDependencies": {
        "route-visualizer": "^1.0.0"
    }
}
```

## Documentation

- route-visualizer: https://github.com/coldbox-modules/route-visualizer