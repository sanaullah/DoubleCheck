# AiFlight

Local **Langfuse-style** observability for [bx-ai](https://ai.ortusbooks.com/) interceptor events.

ColdBox module folder: `app/modules/aiFlight/` (no hyphens in the folder name).  
Public URL entry point: `/aiflight/`.

It listens via `BoxRegisterInterceptor` to bx-ai `BoxAnnounce` points, stores traces in **module-owned SQLite**, and serves a desktop explorer.

## Quick start

1. Ensure `bx-ai` (and `bx-sqlite`) are available on the BoxLang runtime.
2. Place this module under `app/modules/aiFlight/` (ColdBox default modules location). ForgeBox installs can also land under the host’s external modules path.
3. In the host router, register module routing (if not already done by the module entryPoint):

```boxlang
route( "/aiflight" ).toModuleRouting( "aiFlight" );
```

4. Reinit ColdBox (`?fwreinit=1`).
5. Open `/aiflight/`.
6. Run any `aiChat()` / agent / tool call — traces appear automatically.

## Settings

In the host `config/ColdBox.bx`:

```boxlang
moduleSettings = {
	"aiFlight": {
		enabled             : true,
		viewerEnabled       : true,
		dbPath              : "", // default: module/.db/ai-flight.db
		previewChars        : 2000,
		maxTraces           : 500,
		captureCreateEvents : false,
		includePayloadJson  : true,
		pollSeconds         : 2,
		environment         : "local" // stamped on traces when intercept omits env
	}
};
```

## Explorer (v1.3)

- Copy link / JSON export on trace and session views
- Filters: search, status, model, environment, userId, observation type, duration, min cost, tools, errors
- Detail shows userId, environment, and metadata chips when present

## Security

- API keys and auth headers are redacted before persistence.
- The viewer has **no auth** — protect `/aiflight/` on shared hosts.
- Independent of any host app’s review/observability pipeline.

## Non-goals

No Langfuse cloud export, no OTLP, no mobile layout in v1.
