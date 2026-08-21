# RFC: MSW Toggle Flag for PG Frontend ([Issue #148](https://github.com/String-dxd/teacher-workspace-pg-frontend/issues/148))

**Author:** Eugene Ang
**Date:** 2026-08-21
**Status:** Draft - for team discussion

---

## Problem

The PG frontend starts MSW unconditionally in dev mode. There is no mechanism to toggle between mocked responses and real PG APIs in deployed non-prod environments. As we integrate with the TW Go proxy (JWT signing + AWS private link to PG backend), we need a way to choose MSW vs real API per environment.

---

## Current State (Codebase Findings)

**Bootstrap (`src/bootstrap.tsx`):**

```ts
if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
```

MSW starts whenever rsbuild is in dev mode. No flag, no guard exists.

**MSW coverage:** 61 handlers, covering announcements, consent forms, drafts, school data, and session. All return the pgw-web envelope format.

**Tests:** E2E (Playwright) runs against `pnpm dev` which always has MSW active.

**TW Host:** No AWS Parameter Store and no runtime config endpoint yet.

---

## Environment Conditions

| Environment            | MSW?                 | Why                                                     |
| ---------------------- | -------------------- | ------------------------------------------------------- |
| Local dev (`pnpm dev`) | Always ON            | PG API is behind AWS private link, unreachable locally  |
| Deployed DEV           | Controlled by toggle | Team chooses mock vs real per build (building this now) |
| Deployed Staging       | Controlled by toggle | Future: env close to prod for integration validation    |
| Production             | Never ON             | Data integrity, hard-blocked regardless of flag         |

**Key constraint:** rsbuild has only two build modes: dev server (`DEV=true`) and production build (`PROD=true`). ALL deployed environments (including deployed DEV) run production builds. The difference between them is which env vars are baked in and which infra they deploy to.

---

## Recommended Solution: Build-time Env Flags (Option A)

Two env vars baked at build time by rsbuild:

| Var                   | Role                                                  |
| --------------------- | ----------------------------------------------------- |
| `PUBLIC_APP_ENV`      | Identifies the environment (dev, staging, production) |
| `PUBLIC_ENABLE_MOCKS` | On/off switch for MSW (`'true'` to enable)            |

**Updated bootstrap logic:**

```ts
const MSW_TOGGLEABLE_ENVS = ['dev', 'staging'];

async function boot() {
  const shouldEnableMsw =
    import.meta.env.DEV ||
    (import.meta.env.PUBLIC_ENABLE_MOCKS === 'true' &&
      MSW_TOGGLEABLE_ENVS.includes(import.meta.env.PUBLIC_APP_ENV));

  if (shouldEnableMsw) {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledRequest: 'bypass' });
    window.__MSW_ACTIVE__ = true;
  } else {
    // Clean up stale MSW service worker from previous mock-mode session
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      if (reg.active?.scriptURL.includes('mockServiceWorker')) {
        await reg.unregister();
      }
    }
  }

  const { default: App } = await import('./App');
  // ...render
}
```

**Decision flow:**

1. Local dev: always MSW (short-circuit)
2. `PUBLIC_ENABLE_MOCKS=true` + env in allowlist: MSW ON
3. Everything else (production, or flag unset): MSW OFF

**Tree-shaking:** When `PUBLIC_ENABLE_MOCKS` is unset, the bundler const-folds `undefined === 'true'` to `false`, dead-code-eliminating the entire MSW import path from the bundle.

**CI pipeline example:**

```yaml
# DEV environment - mock mode (building now)
build_dev_mock:
  variables:
    PUBLIC_APP_ENV: 'dev'
    PUBLIC_ENABLE_MOCKS: 'true'

# DEV environment - integration mode
build_dev_integration:
  variables:
    PUBLIC_APP_ENV: 'dev'

# Staging - example for future env close to prod
build_staging_integration:
  variables:
    PUBLIC_APP_ENV: 'staging'
```

---

## Alternative Solutions (for future consideration)

| Option                       | Summary                                          | Trade-off                                                                                          |
| ---------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **B: Host runtime config**   | TW host injects `window.__TW_CONFIG__` into HTML | Toggle without rebuild, but requires host Go changes + cross-team work. MSW cannot be tree-shaken. |
| **C: localStorage override** | Add browser-level toggle on top of Option A      | Testers flip instantly, but requires page reload and is per-browser.                               |
| **D: AWS Parameter Store**   | CI or container reads config from SSM            | Centralized audit trail, but infra setup cost disproportionate for two vars for now.               |

All options build on top of Option A and none invalidate it. Start with A, layer others if/when the need arises.

---

## Open Questions for Discussion

1. **Is rebuild-to-toggle ok for now?**

- Switching an environment between mock and integration mode means changing CI vars and rebuilding. If there are friction, we could implement a runtime toggle (Option C)?

2. **E2E strategy:** Should Playwright E2E run in both modes (MSW + real API)?

- Recommendation: For now we can have MSW-based regression on every PR. Then discuss next time on whether we want to have e2e with PG real API, as that include discussion for e2e data seeding and preparation.
