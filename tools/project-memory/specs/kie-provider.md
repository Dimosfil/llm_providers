# Kie provider boundary

2026-09-17: user corrected ownership. The library must hold provider
implementations and their required data interfaces. The media abstraction is
specific to AI Media Client and belongs there, not in this shared library.

`src/providers/kie/index.mjs` implements createKieClient; `contracts.mjs` defines
Kie wire types and KieError. Package export: `./providers/kie`. Methods:
createTask({model,input,callBackUrl?}), getTask({taskId}),
uploadFile({file:Blob,uploadPath,fileName?}). Responses are Kie data unchanged
after envelope validation. No model profiles, semantic roles, common states or
media registry remain in this library. No ./media export remains.

The client owns authentication, protocol paths, multipart formatting,
timeout/abort and safe transport errors. It never retries ambiguous creation.
KieError.outcome preserves unknown versus rejected/not-submitted; the caller
owns reconciliation. Raw success data may contain sensitive fields and must be
filtered by the application's adapter. No storage or implicit credential reads.

Market only. Special APIs remain out of scope pending discussion. Existing
text-provider abstractions predate this work and were not changed. Public usage:
`docs/kie-provider.md`. Offline tests: `test/kie-client.test.mjs`.
