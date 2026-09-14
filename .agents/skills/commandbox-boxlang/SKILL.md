---
name: commandbox-boxlang
description: >
  Use this skill when configuring CommandBox to run BoxLang server instances, using the BoxLang REPL,
  running BoxLang task runners, and managing BoxLang modules via CommandBox. Covers server.json
  BoxLang configuration, CLI commands, module installation, and the BoxLang-specific CommandBox workflow.
applyTo: "**/*.{bx,cfc,cfm,bxm,json}"
---

# CommandBox BoxLang Skill

## When to Use This Skill

Load this skill when:
- Starting a BoxLang server with CommandBox
- Configuring `server.json` for BoxLang engine settings
- Using the BoxLang REPL for interactive development
- Running BoxLang task runners or scripts from the CLI
- Installing BoxLang modules via CommandBox

## Installation

```bash
box install commandbox-boxlang
```

## Starting a BoxLang Server

```bash
# Start with BoxLang engine
box server start cfengine=boxlang

# Or configure via server.json (recommended)
box server start
```

### server.json Configuration

```json
{
    "name": "myapp",
    "cfengine": "boxlang",
    "port": 8080,
    "webroot": ".",
    "boxlang": {
        "version": "1.0.0",
        "debug": false,
        "modules": [
            "bx-compat-cfml",
            "bx-web-support"
        ],
        "jvmArgs": "-Xmx512m -Xms256m",
        "configFile": "boxlang.json"
    },
    "web": {
        "rewrites": {
            "enable": true,
            "config": "urlrewrite.xml"
        }
    }
}
```

### boxlang.json (BoxLang Runtime Config)

```json
{
    "debugMode": false,
    "defaultTimezone": "UTC",
    "defaultLocale": "en_US",
    "modules": {
        "bx-compat-cfml": {},
        "bx-web-support": {}
    },
    "executors": {
        "defaultTimeout": 30
    }
}
```

## BoxLang REPL

```bash
# Start interactive REPL
box boxlang repl

# Run a single expression
box boxlang execute "now()"

# Run a .bx file
box boxlang run path/to/script.bx

# Run with variables
box boxlang run script.bx --arg1=value1
```

## Module Management

```bash
# Install a BoxLang module
box install bx-compat-cfml
box install bx-orm
box install bx-async

# List installed BoxLang modules
box list --boxlang

# Update all BoxLang modules
box update --boxlang
```

## Task Runners

```js
// tasks/BuildTask.bx
class {

    function run( args = {} ) {
        print.line( "Building application..." )

        // Compile / minify / etc.
        command( "npm run build" ).run()

        print.greenLine( "Build complete!" )
    }

    function test( args = {} ) {
        command( "box testbox run" ).run()
    }
}
```

```bash
# Run a BoxLang task
box boxlang task BuildTask run
box boxlang task BuildTask test
```

## Common CLI Commands

```bash
# Check BoxLang version
box boxlang version

# Clear BoxLang module cache
box boxlang modulecache clear

# Compile a .bx file to bytecode
box boxlang compile path/to/file.bx

# Run tests with BoxLang engine
box testbox run runner=http://localhost:8080/tests/runner.cfm
```

## Best Practices

- **Use `server.json`** for all server configuration — avoids repeated CLI arguments
- **Pin BoxLang version** in `server.json` — prevents unexpected upgrades breaking the app
- **Install `bx-compat-cfml`** when migrating CFML code — enables legacy function/tag compatibility
- **Set JVM args** in `server.json` appropriate for the workload — avoid default heap limits in production
- **Use the REPL** for quick prototyping and debugging BoxLang expressions
- **Configure `debugMode: false`** in `boxlang.json` for production — avoids detailed error output

## Documentation

- commandbox-boxlang: https://github.com/Ortus-Solutions/commandbox-boxlang
- BoxLang docs: https://boxlang.ortusbooks.com
- CommandBox docs: https://commandbox.ortusbooks.com