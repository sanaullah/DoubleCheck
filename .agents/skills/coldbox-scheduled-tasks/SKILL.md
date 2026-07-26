---
name: coldbox-scheduled-tasks
description: "Use this skill when creating ColdBox scheduled tasks, building Scheduler.cfc files, registering task frequencies, managing task life-cycles (before/after/onFailure/onSuccess), using server fixation for clustered apps, or configuring module schedulers."
applyTo: "**/*.{bx,bxm,cfc,cfm,cfml}"
---

# Scheduled Tasks

## When to Use This Skill

Use this skill when you need to run background tasks on a schedule — recurring jobs, one-off warm-up tasks, heartbeats, cache cleanup, data sync, or any server-side automation.

## Language Mode Reference

Examples use **BoxLang** / CFML script syntax (both supported identically for scheduler code).

## Core Concepts

- **Global Scheduler** — `config/Scheduler.cfc` with a `configure()` method; auto-discovered by ColdBox
- **Module Scheduler** — each module can have its own `Scheduler.cfc` inside the module root
- **WireBox ID** — the global scheduler is available as `appScheduler@coldbox`
- **Task DSL** — fluent API on `ColdBoxScheduledTask` object returned by `task( name )`
- **Built on AsyncManager** — backed by Java `ScheduledExecutorService`

## File Location & Structure

```
config/
  Scheduler.cfc       ? Global app scheduler
modules_app/
  myModule/
    Scheduler.cfc     ? Module-level scheduler
```

### Minimal Scheduler

```javascript
// config/Scheduler.cfc
component {

    function configure() {
        task( "Clear Old Sessions" )
            .call( () => getInstance( "SessionService" ).purgeExpired() )
            .everyDayAt( "02:00" );
    }
}
```

## Full Scheduler Template

```javascript
component {

    /**
     * Configure global scheduler settings and register tasks.
     * Available config methods:
     *   setTimezone( "America/Chicago" )
     *   setExecutor( asyncManager.newScheduledExecutor("myPool", 50) )
     *   setCacheName( "redis" )          ? for server fixation
     *   setServerFixation( true )        ? run once across all nodes
     */
    function configure() {

        // ---------- Global Settings ----------
        setTimezone( "UTC" );

        // ---------- Recurring Tasks ----------
        task( "Heartbeat" )
            .call( () => runEvent( "main.heartbeat" ) )
            .every( 5, "minutes" )
            .onFailure( ( task, exception ) => {
                getInstance( "AlertService" ).sendAlert( exception.message )
            } );

        task( "Daily Cleanup" )
            .call( () => getInstance( "CleanupService" ).run() )
            .everyDayAt( "03:00" )
            .onOneServer()          // clustered apps: run on ONE node only
            .withNoOverlaps();      // prevent task stacking if it runs long

        task( "Weekly Report" )
            .call( () => getInstance( "ReportService" ).generateWeekly() )
            .everyWeekOn( 1, "08:00" )  // Monday at 08:00
            .onEnvironment( [ "production" ] );

        // ---------- One-Off Startup Tasks ----------
        task( "Warm Up Cache" )
            .call( () => getInstance( "CacheWarmer" ).prime() )
            .delay( 30, "seconds" );    // fire once, 30s after app start

        task( "Notify Admin of Startup" )
            .call( () => getInstance( "AdminNotifier" ).appStarted() )
            .delay( 1, "minutes" );
    }

    // ---- Life-Cycle Hooks ----

    function onStartup() {
        // Called after all tasks are registered
        log.info( "Scheduler started" )
    }

    function onShutdown() {
        // Called before scheduler shuts down
        log.info( "Scheduler shutting down" )
    }

    function onAnyTaskError( required task, required exception ) {
        // Called whenever any task throws
        log.error( "Task failed: #task.getName()# — #exception.message#" )
    }

    function onAnyTaskSuccess( required task, result ) {
        // Called whenever any task completes without error
    }

    function beforeAnyTask( required task ) {
        // Called before every task execution
    }

    function afterAnyTask( required task, result ) {
        // Called after every task execution
    }
}
```

## Task DSL Reference

### Registering a Task

```javascript
task( "my-task-name" )          // unique name — returns ColdBoxScheduledTask
    .call( closure )            // required: what to execute
    .everyMinute()              // required: how often (or omit for one-off)
```

### Callable Targets

```javascript
// Lambda / arrow function
.call( () => getInstance( "MyService" ).doWork() )

// Closure
.call( function() {
    getInstance( "MyService" ).doWork()
} )

// CFC instance — calls run() by default
.call( getInstance( "MyTaskCFC" ) )

// CFC instance with custom method
.call( getInstance( "MyService" ), "cleanup" )

// ColdBox event
.call( () => runEvent( "scheduler.cleanCache" ) )
```

### Frequency Methods

| Method | Description |
|--------|-------------|
| `every( period, timeUnit )` | Custom interval (ms default) |
| `spacedDelay( delay, timeUnit )` | Fixed delay between completions (no overlap) |
| `everyMinute()` | Every minute |
| `everyHour()` | Every hour |
| `everyHourAt( minutes )` | Hourly at a specific minute mark |
| `everyDay()` | Every day at midnight |
| `everyDayAt( "HH:mm" )` | Daily at a specific time |
| `everyWeek()` | Every Sunday at midnight |
| `everyWeekOn( day, time )` | Weekly on a specific day (1=Mon … 7=Sun) |
| `everyMonth()` | First day of every month at midnight |
| `everyMonthOn( day, time )` | Monthly on specific day and time |
| `onFirstBusinessDayOfTheMonth( time )` | First Monday of the month |
| `onLastBusinessDayOfTheMonth( time )` | Last business day of the month |
| `everyYear()` | First day of the year at midnight |
| `everyYearOn( month, day, time )` | Yearly on a specific date |
| `onWeekends( time )` | Saturday and Sunday |
| `onWeekdays( time )` | Monday–Friday |
| `onMondays( time )` … `onSundays( time )` | Specific day of week |

> Time units: `nanoseconds`, `microseconds`, `milliseconds` (default), `seconds`, `minutes`, `hours`, `days`

### Overlap Prevention

```javascript
// Prevent stacking: next run waits for previous to finish
.withNoOverlaps()

// Spaced delay alternative (explicit)
.spacedDelay( 30, "seconds" )
```

### Startup Delay

```javascript
// Delay first execution only
.delay( 5, "minutes" )
```

### Life-Cycle Methods Per Task

```javascript
task( "example" )
    .call( () => doWork() )
    .everyMinute()
    .before( ( task ) => {
        // runs before each execution
    } )
    .after( ( task, results ) => {
        // runs after each execution
    } )
    .onFailure( ( task, exception ) => {
        // handle errors
    } )
    .onSuccess( ( task, results ) => {
        // handle success
    } )
```

### Constraints

```javascript
// Run only when a condition is true at runtime
.when( () => getSetting( "tasksEnabled" ) )

// Restrict to specific environments
.onEnvironment( "production" )
.onEnvironment( [ "staging", "production" ] )

// Date range
.startOn( "2025-01-01", "00:00" )
.endOn( "2025-12-31", "23:59" )

// Time-of-day window
.between( "09:00", "17:00" )
.startOnTime( "09:00" )
.endOnTime( "17:00" )

// Specific timezone for this task
.setTimezone( "America/New_York" )
```

### Server Fixation (Clustering)

```javascript
// Run on only ONE node in a cluster — requires distributed cache
task( "nightly-report" )
    .call( () => reportService.build() )
    .everyDayAt( "01:00" )
    .onOneServer()
    .setCacheName( "redis" )   // change the fixation cache (default: "template")
```

### Disable / Enable

```javascript
// Permanently disabled at registration
.disable()

// Re-enable at runtime
myTask.enable()

// Prefix with "x" to disable (like xdescribe in TestBox)
xtask( "Disabled Task" )
    .call( () => doWork() )
    .everyMinute()
```

## Module Scheduler

Create `Scheduler.cfc` in your module root. Module schedulers have extra auto-injected variables: `moduleMapping`, `modulePath`, `moduleSettings`.

```javascript
// modules_app/myModule/Scheduler.cfc
component {

    function configure() {
        task( "Module Sync" )
            .call( () => getInstance( "SyncService@myModule" ).sync() )
            .everyHour()
    }
}
```

Register it in `ModuleConfig.cfc` — ColdBox discovers scheduler files automatically when they exist in the module root.

## Scheduler Properties Available in configure()

| Property | Description |
|----------|-------------|
| `asyncManager` | AsyncManager reference |
| `cachebox` | CacheBox reference |
| `controller` | ColdBox controller |
| `log` | Pre-configured logger |
| `wirebox` | WireBox reference |
| `appMapping` | Application mapping path |

Helper methods available: `getInstance()`, `announce()`, `runEvent()`, `runRoute()`, `getSetting()`, `getCache()`, `getModuleSettings()`, `view()`, `layout()`

## Key Rules

- Always create a unique task name — duplicate names cause conflicts.
- Call `.call()` before any frequency method.
- Use `.withNoOverlaps()` on tasks that may run longer than their interval.
- Use `.onOneServer()` for tasks that must run once across a cluster — requires a distributed cache.
- Omit any frequency method to make a task **one-off** (run once at startup, optionally after a `delay()`).
- Use `xtask()` prefix to temporarily disable a task without removing it (like TestBox's `xdescribe`).