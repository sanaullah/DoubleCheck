> Committed documentation. Product truth: **[application-features.md](application-features.md)**.

# BoxLang Project Conventions

## Class documentation (required)

Every application `.bx` class under `app/` must open with a short Javadoc-style
purpose block (what it does + `@see` collaborators when useful). Do not leave
new services/handlers undocumented.

```boxlang
/**
 * Local workspace identity and project-path checks for review runs.
 *
 * @see ReviewRunService
 */
@singleton
class {
```

Document public entry methods when behavior is non-obvious (exceptions, side
effects). Prefer updating [technical-flow.md](technical-flow.md) when the review
pipeline changes.

## JSON

Use BoxLang's native JSON functions:

- `jsonSerialize( value )` encodes a BoxLang value as JSON.
- `jsonDeserialize( json )` decodes JSON into a BoxLang value.

Do not use the CFML-style names `serializeJSON()` or `deserializeJSON()` in this
BoxLang application.

## HTML encoding

The tested BoxLang 1.14 runtime exposes `encodeForHTML()` through the installed
runtime support. `encodeForHTMLAttribute()` is not available in this runtime,
so templates must use the tested encoder (or a deliberately installed
attribute-encoding module API) rather than assuming the CFML function name.
