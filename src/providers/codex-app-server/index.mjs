import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { providerNames } from "../../contracts.mjs";
import { normalizeEffort, resolvePreferredCodexCommand } from "../../config.mjs";
import { applyOutputContract } from "../../outputContracts.mjs";

export function createCodexAppServerProvider(options = {}) {
  const runtime = buildCodexRuntimeOptions(process.env, options);
  return {
    name: providerNames.CODEX,
    model: runtime.model,
    isConfigured: () => Boolean(runtime.command),
    async generate(request = {}, callbacks = {}) {
      const output = await runCodexTurn(requestToPrompt(request), callbacks, runtime);
      return {
        provider: providerNames.CODEX,
        model: request.model || runtime.model,
        output,
        parsed: applyOutputContract(output, request.output)
      };
    }
  };
}

export function buildCodexRuntimeOptions(env = process.env, overrides = {}) {
  return {
    cwd: overrides.cwd || process.cwd(),
    command: overrides.command || resolveCodexCommand(env),
    model: overrides.model || env.CODEX_MODEL || env.LAUNCH_DESK_MODEL || "gpt-5.5",
    effort: normalizeEffort(overrides.effort || env.CODEX_EFFORT),
    requestTimeoutMs: milliseconds(overrides.requestTimeoutMs, env.CODEX_REQUEST_TIMEOUT_SECONDS, 30),
    turnTimeoutMs: milliseconds(overrides.turnTimeoutMs, env.CODEX_TURN_TIMEOUT_SECONDS, 180),
    developerInstructions: overrides.developerInstructions || [
      "You are a local provider runtime.",
      "Answer in chat only.",
      "Do not edit files, inspect files, run shell commands, or ask for approvals."
    ].join(" ")
  };
}

export function resolveCodexCommand(env = process.env) {
  if (env.CODEX_COMMAND?.trim()) {
    return env.CODEX_COMMAND.trim();
  }

  if (process.platform === "win32") {
    const preferred = resolvePreferredCodexCommand(env);
    if (existsSync(preferred)) {
      return preferred;
    }

    const pathEntries = (env.Path || env.PATH || "").split(path.delimiter).filter(Boolean);
    const pathCommand = pathEntries
      .map((entry) => path.join(entry, "codex.cmd"))
      .find((candidate) => existsSync(candidate) && !/(\\WindowsApps\\|\\System32\\)/i.test(candidate));
    return pathCommand || "codex.cmd";
  }

  return "codex";
}

export async function runCodexTurn(prompt, callbacks = {}, runtimeOptions = {}) {
  const options = buildCodexRuntimeOptions(process.env, runtimeOptions);
  const server = new CodexAppServer(options);

  try {
    callbacks.onStatus?.(`Starting Codex app-server with model ${options.model}.`);
    await server.start();
    const threadId = await server.startThread(options.model);
    callbacks.onStatus?.("Codex thread is ready.");
    return await server.runTurn(threadId, prompt, callbacks);
  } finally {
    server.stop();
  }
}

class MessageQueue {
  messages = [];
  waiters = [];
  failed = null;

  push(message) {
    const waiter = this.waiters.shift();
    if (waiter) {
      clearTimeout(waiter.timer);
      waiter.resolve(message);
      return;
    }
    this.messages.push(message);
  }

  fail(error) {
    this.failed = error;
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }

  next(timeoutMs, context) {
    if (this.messages.length > 0) {
      return Promise.resolve(this.messages.shift());
    }
    if (this.failed) {
      return Promise.reject(this.failed);
    }

    return new Promise((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.waiters = this.waiters.filter((candidate) => candidate !== waiter);
          reject(new Error(`Timed out while waiting for ${context}.`));
        }, timeoutMs)
      };
      this.waiters.push(waiter);
    });
  }
}

class CodexAppServer {
  process = null;
  nextId = 1;
  queue = new MessageQueue();
  stderrLines = [];
  stdoutBuffer = "";

  constructor(options) {
    this.options = options;
  }

  async start() {
    this.process = spawn(this.options.command, ["app-server"], {
      cwd: this.options.cwd,
      shell: process.platform === "win32",
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });

    this.process.stdout.setEncoding("utf8");
    this.process.stderr.setEncoding("utf8");
    this.process.stdout.on("data", (chunk) => this.readStdout(chunk));
    this.process.stderr.on("data", (chunk) => this.readStderr(chunk));
    this.process.once("error", (error) => this.queue.fail(error));
    this.process.once("close", (code) => {
      this.queue.fail(new Error(`Codex app-server exited with code ${code}.${this.stderrTail()}`));
    });

    await this.request("initialize", {
      clientInfo: {
        name: "llm_providers_codex_app",
        title: "LLM Providers Codex App Runtime",
        version: "0.1.0"
      },
      capabilities: {
        experimentalApi: true,
        requestAttestation: false,
        optOutNotificationMethods: [
          "command/exec/outputDelta",
          "item/plan/delta",
          "item/fileChange/outputDelta",
          "item/reasoning/summaryTextDelta",
          "item/reasoning/textDelta"
        ]
      }
    });
    this.notify("initialized", {});
  }

  stop() {
    if (this.process && !this.process.killed) {
      this.process.kill();
    }
  }

  async startThread(model) {
    const result = await this.request("thread/start", {
      model,
      modelProvider: null,
      cwd: this.options.cwd,
      runtimeWorkspaceRoots: [this.options.cwd],
      approvalPolicy: null,
      approvalsReviewer: null,
      sandbox: null,
      permissions: null,
      config: null,
      serviceName: null,
      baseInstructions: null,
      developerInstructions: this.options.developerInstructions,
      personality: null,
      ephemeral: true,
      sessionStartSource: null,
      threadSource: null,
      environments: null,
      dynamicTools: null,
      selectedCapabilityRoots: null,
      mockExperimentalField: null
    });

    const threadId = result?.thread?.id;
    if (!threadId) {
      throw new Error("Codex app-server did not return a thread id.");
    }
    return threadId;
  }

  async runTurn(threadId, prompt, callbacks) {
    const result = await this.request("turn/start", {
      threadId,
      clientUserMessageId: randomUUID(),
      input: [{ type: "text", text: prompt, text_elements: [] }],
      responsesapiClientMetadata: null,
      additionalContext: null,
      environments: null,
      cwd: this.options.cwd,
      runtimeWorkspaceRoots: [this.options.cwd],
      approvalPolicy: null,
      approvalsReviewer: null,
      sandboxPolicy: null,
      permissions: null,
      model: null,
      effort: this.options.effort,
      summary: null,
      personality: null,
      outputSchema: null,
      collaborationMode: null
    });

    return this.collectFinalResponse(result?.turn?.id, callbacks);
  }

  readStdout(chunk) {
    this.stdoutBuffer += chunk;
    const lines = this.stdoutBuffer.split(/\r?\n/);
    this.stdoutBuffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      try {
        this.queue.push(JSON.parse(line));
      } catch {
        this.readStderr(line);
      }
    }
  }

  readStderr(chunk) {
    for (const line of chunk.split(/\r?\n/).filter(Boolean)) {
      this.stderrLines.push(line);
      if (this.stderrLines.length > 80) {
        this.stderrLines.shift();
      }
    }
  }

  stderrTail() {
    return this.stderrLines.length > 0 ? ` Stderr: ${this.stderrLines.join("\n")}` : "";
  }

  send(message) {
    if (!this.process?.stdin.writable) {
      throw new Error("Codex app-server is not running.");
    }
    this.process.stdin.write(`${JSON.stringify(message)}\n`);
  }

  notify(method, params) {
    this.send({ method, params });
  }

  async request(method, params) {
    const id = this.nextId;
    this.nextId += 1;
    this.send({ method, id, params });

    while (true) {
      const message = await this.queue.next(this.options.requestTimeoutMs, `Codex response ${id}`);
      if (message.id !== id) {
        continue;
      }
      if (message.error) {
        throw new Error(`Codex request failed: ${JSON.stringify(message.error)}`);
      }
      return message.result;
    }
  }

  async collectFinalResponse(turnId, callbacks) {
    let streamed = "";
    let completedText = "";

    while (true) {
      const message = await this.queue.next(this.options.turnTimeoutMs, "Codex turn completion");
      const method = typeof message.method === "string" ? message.method : "";
      const params = message.params && typeof message.params === "object" ? message.params : {};

      if (method === "item/agentMessage/delta") {
        const delta = typeof params.delta === "string" ? params.delta : typeof params.text === "string" ? params.text : "";
        if (delta) {
          streamed += delta;
          callbacks.onTextDelta?.(delta);
        }
      }

      if (method === "item/completed") {
        const item = params.item && typeof params.item === "object" ? params.item : {};
        if (item.type === "agentMessage" && typeof item.text === "string") {
          completedText = item.text;
        }
      }

      if (method === "turn/completed") {
        const completedTurn = params.turn && typeof params.turn === "object" ? params.turn : {};
        if (!turnId || completedTurn.id === turnId) {
          const output = (completedText || streamed).trim();
          if (!streamed && output) {
            callbacks.onTextDelta?.(output);
          }
          return output;
        }
      }
    }
  }
}

function requestToPrompt(request = {}) {
  if (typeof request.prompt === "string" && request.prompt.trim()) {
    return request.prompt;
  }
  if (Array.isArray(request.messages)) {
    return request.messages.map((message) => `${message.role}: ${message.content}`).join("\n\n");
  }
  return "";
}

function milliseconds(overrideMs, envSeconds, fallbackSeconds) {
  const override = Number(overrideMs);
  if (Number.isFinite(override) && override > 0) {
    return override;
  }
  const seconds = Number(envSeconds);
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : fallbackSeconds) * 1000;
}
