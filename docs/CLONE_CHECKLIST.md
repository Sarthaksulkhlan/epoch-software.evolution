# Clone checklist

Use this checklist to verify a fresh EPOCH checkout before making changes.

## Supported environment

- Node.js 22 or newer, with Node.js 22 recommended.
- pnpm 12.6.0, supplied automatically by Corepack.
- A native build toolchain is required when `better-sqlite3` has no prebuilt binary for the active Node version.

## Install and verify

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

The development UI runs at `http://127.0.0.1:5173/` with `pnpm console:dev`.
The API runs at `http://127.0.0.1:3000/` with `pnpm api:dev`.

For a single command that checks the repository layout and package metadata, run
`pnpm verify:clone`.
