# Troubleshooting local setup

## `pnpm` is not recognised

Enable Corepack once, then use the version declared by the repository:

```bash
corepack enable
corepack prepare pnpm@12.6.0 --activate
```

## `better-sqlite3` cannot load

EPOCH uses a native SQLite driver. Prefer Node.js 22, which has prebuilt binaries
for the locked dependency in the supported environments. If the active Node.js
version has no prebuilt binary, install a C++ build toolchain and reinstall with
`pnpm install`.

## The UI loads but API data is unavailable

The Vite UI and API are separate processes during development. Start both with
`pnpm dev`, or start `pnpm api:dev` and `pnpm console:dev` in separate terminals.
The API should answer `GET http://127.0.0.1:3000/api/health`.

## A port is already in use

Stop the process using port 3000 or 5173, then restart the corresponding
development command. The production server can use the `PORT` environment
variable when deployed.
