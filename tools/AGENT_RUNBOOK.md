# Agent Runbook

Every command should be copy-pasteable from the project root.

## Install

```powershell
npm install
```

## Run

```powershell
node test/smoke.mjs
```

## Test

```powershell
npm test
```

## Build

```powershell
# No build step currently required.
```

## Smoke Check

```powershell
npm run smoke
```

Expected result:

```text
smoke ok
```

## Logs

```powershell
# No project-owned runtime logs yet.
```

## Environment Notes

- Runtime secrets must come from environment or caller-owned config.
- Do not commit provider API keys, generated model output, or local runtime logs.
