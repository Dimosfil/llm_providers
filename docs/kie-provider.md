# Kie client

`llm-providers/providers/kie` exports `createKieClient` and `KieError`.
This is a provider-specific Node.js client, not an application media abstraction.
It has no model registry, asset roles, normalized task states, queue or UI.

```js
import { createKieClient } from 'llm-providers/providers/kie';
const kie = createKieClient({ apiKey: process.env.KIE_API_KEY });

// Provider-native payload. Creation may incur charges.
const created = await kie.createTask({
  model: 'grok-imagine/text-to-image',
  input: { prompt: 'A watercolor landscape', aspect_ratio: '3:2' }
});
const record = await kie.getTask({ taskId: created.taskId });
// record.state, record.resultJson, record.creditsConsumed are Kie fields.
```

## Interfaces

- `createTask({model, input, callBackUrl?}, {signal}?)`: POST Market createTask.
  Returns provider `data`, including taskId, without reshaping it.
- `getTask({taskId}, {signal}?)`: GET Market recordInfo. Returns provider data
  including original state, resultJson, failure fields and any additional fields.
- `uploadFile({file: Blob, uploadPath, fileName?}, {signal}?)`: multipart upload.
  Returns provider upload metadata including downloadUrl/fileUrl.

The caller supplies provider-specific model inputs and validates their schema.
Uploads are not restricted to the application's image/video/audio concepts.
Filename choice belongs to the caller; Kie can overwrite matching names.
The library unwraps the response envelope and validates minimum response shape,
but does not map statuses or parse resultJson into an application result.
Provider data can include sensitive input/failure metadata: the consumer must
filter it before passing it to a UI or logs.

The consuming application owns its common media interface and adapters that
translate that interface to each provider's data. Its model profiles, role
mappings, result normalization, polling, source persistence and history stay
outside this library. The existing text-provider API is unaffected by this
correction; it has not been refactored as part of the Kie task.

## Transport and errors

Configuration accepts apiKey, fetchImpl, baseUrl, uploadUrl, createPath, taskPath,
timeoutMs (default 60000), uploadTimeoutMs (default 180000). All endpoints are
trusted server configuration and use HTTPS. API paths remain on the configured
API origin. No implicit environment, credential file or local profile reads.
Redirects are refused. Request timeouts and caller cancellation share an abort
controller. No automatic retries, including paid creation requests.

KieError contains code, status and outcome. A creation transport failure,
malformed reply, server failure or absent taskId gives outcome=unknown: reconcile
with the provider before another creation attempt. Explicit supported rejection
statuses give rejected. Local failures give not-submitted; on non-creation
operations this value says nothing about earlier submissions. Error messages do
not expose upstream response bodies, credentials or request content.

Initial support is Market createTask/recordInfo and file-stream-upload only.
Special Veo/Runway/Flux/4o protocols, account pricing, balance and callback
receivers are not implemented. A callback URL can be passed to createTask, but
the caller owns the receiving service.

Verification: `node --test test/kie-client.test.mjs` uses injected responses,
without network or paid generations. Protocol references:
[Market tasks](https://docs.kie.ai/market/common/get-task-detail),
[creation](https://docs.kie.ai/market/wan/2-7-text-to-video),
[upload](https://docs.kie.ai/file-upload-api/upload-file-stream).
