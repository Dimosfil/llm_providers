import test from 'node:test';
import assert from 'node:assert/strict';
import { createKieClient, KieError } from 'llm-providers/providers/kie';
const response = data => ({ ok: true, status: 200, json: async () => ({ code: 200, data }) });
const make = fetchImpl => createKieClient({ apiKey: 'test-secret', fetchImpl });

test('Kie client accepts wire input and returns provider data unchanged', async () => {
  const payload = { model: 'example/video', input: { prompt: 'Кот', image_urls: ['https://example.test/x'], custom_scenes: [{ text: 'x' }] }, callBackUrl: 'https://example.test/callback' };
  const data = { taskId: 'task-1', providerExtra: 42 };
  const client = make(async (url, options) => {
    assert.equal(url, 'https://api.kie.ai/api/v1/jobs/createTask');
    assert.deepEqual(JSON.parse(options.body), payload);
    assert.equal(options.redirect, 'error');
    return response(data);
  });
  assert.deepEqual(await client.createTask(payload), data);
  assert.equal(client.listModels, undefined);
  assert.equal(client.submit, undefined);
});
test('Kie getTask preserves native status, resultJson and additional fields', async () => {
  const data = { taskId: 'a/b', state: 'future-provider-state', resultJson: '{"resultUrls":[]}', model: 'native-model', creditsConsumed: 0 };
  const client = make(async url => { assert.equal(new URL(url).searchParams.get('taskId'), 'a/b'); return response(data); });
  assert.deepEqual(await client.getTask({ taskId: 'a/b' }), data);
});
test('Kie upload accepts provider multipart fields without application asset roles', async () => {
  const data = { downloadUrl: 'https://example.test/file', fileName: 'doc.txt', fileSize: 3 };
  const client = make(async (_url, options) => {
    assert.equal(await options.body.get('file').text(), 'abc');
    assert.equal(options.body.get('uploadPath'), 'caller/path');
    assert.equal(options.body.get('fileName'), 'doc.txt');
    assert.equal(options.headers['Content-Type'], undefined);
    return response(data);
  });
  assert.deepEqual(await client.uploadFile({ file: new Blob(['abc'], { type: 'text/plain' }), uploadPath: 'caller/path', fileName: 'doc.txt' }), data);
});
test('Kie validates request envelope before transport', async () => {
  const client = make(() => assert.fail('unexpected network'));
  for (const value of [{}, { model: 'x', input: [] }, { model: 'x', input: {}, prompt: 'wrong layer' }, { model: 'x', input: { duration: NaN } }]) {
    await assert.rejects(client.createTask(value), { code: 'INVALID_REQUEST' });
  }
});
test('Kie omits an explicitly undefined optional callback', async () => {
  const client = make(async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), { model: 'x', input: {} });
    return response({ taskId: 'task-undefined-callback' });
  });
  assert.deepEqual(await client.createTask({ model: 'x', input: {}, callBackUrl: undefined }), {
    taskId: 'task-undefined-callback'
  });
});
test('ambiguous creation is never retried and does not leak response/error bodies', async () => {
  for (const fail of [
    () => { throw Error('test-secret'); }, () => response({}),
    () => ({ ok: false, status: 503, json: async () => ({ msg: 'test-secret' }) }),
    () => ({ ok: true, json: async () => { throw Error('test-secret'); } })
  ]) {
    let calls = 0;
    const client = make(async () => { calls++; return fail(); });
    await assert.rejects(client.createTask({ model: 'x', input: {} }), error => {
      assert.ok(error instanceof KieError); assert.equal(error.outcome, 'unknown');
      assert.equal(error.message.includes('test-secret'), false); return true;
    });
    assert.equal(calls, 1);
  }
});
test('explicit rejection differs from ambiguous outcome', async () => {
  const client = make(async () => ({ ok: true, json: async () => ({ code: 402 }) }));
  await assert.rejects(client.createTask({ model: 'x', input: {} }), { code: 'INSUFFICIENT_CREDITS', outcome: 'rejected' });
});
test('non-JSON HTTP errors preserve status and rejection outcome', async () => {
  for (const [status, code] of [[401, 'PROVIDER_ERROR'], [402, 'INSUFFICIENT_CREDITS'], [429, 'PROVIDER_ERROR']]) {
    const client = make(async () => new Response('upstream error', { status }));
    await assert.rejects(client.createTask({ model: 'x', input: {} }), error => {
      assert.equal(error.code, code);
      assert.equal(error.status, status);
      assert.equal(error.outcome, 'rejected');
      return true;
    });
  }
});
test('abort before sending makes no call; timeout after dispatch is unknown', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(make(() => assert.fail()).createTask({ model: 'x', input: {} }, { signal: controller.signal }), { code: 'ABORTED', outcome: 'not-submitted' });
  const client = createKieClient({ apiKey: 'test', timeoutMs: 5,
    fetchImpl: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(Error('abort')), { once: true })) });
  await assert.rejects(client.createTask({ model: 'x', input: {} }), { outcome: 'unknown' });
});
