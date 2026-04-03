# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**pluginIlustrator** — Sublimania's automatic sports-team uniform generator. Three sub-systems:

1. **`IA/`** — Adobe Illustrator ExtendScript plugin that reads a CSV and generates scaled garment pieces per player.
2. **`web/`** — Legacy vanilla-JS web app (no build step) to configure per-size design rules and export a CSV.
3. **`web-sublimania/`** — New React/TypeScript rewrite of the web app (Vite, Zustand, Bootstrap).

See `IA/CLAUDE.md` for deep detail on the ExtendScript side.

## Running the ExtendScript Plugin

No build step. Execute inside Adobe Illustrator:

> **File → Scripts → Other Script…** → select `IA/GENERAR_EQUIPO.jsx`

Requires an open `.ai` document with a `TEMPLATE` layer and a CSV produced by either web app.

## Running the Legacy Web App

Open `web/index.html` directly in a browser (no server). Uses SheetJS from CDN. Persists state in `localStorage`; file handles via IndexedDB.

## Running the React Web App (`web-sublimania/`)

```bash
cd web-sublimania
npm install
npm run dev       # dev server with HMR
npm run build     # tsc + vite build
npm run lint      # eslint
npm run preview   # preview production build
```

## Architecture

### `web-sublimania/` — React App

Three screens navigated via `useTeamStore.screen` (`'upload' → 'configure' → 'export'`):

| Module | Path | Role |
|---|---|---|
| Upload | `src/modules/upload/UploadScreen.tsx` | Reads `.xlsx` via SheetJS, populates store |
| Configure | `src/modules/configure/ConfigureScreen.tsx` | Per-talla rules + per-player overrides |
| Export | `src/modules/export/ExportScreen.tsx` | CSV generation and download |

State is managed by two Zustand stores:
- `useTeamStore` (`src/store/useTeamStore.ts`) — players, tallas, rules, overrides, navigation; persisted to `localStorage` as `sublimania_team_v1`.
- `useConfigFileStore` (`src/store/useConfigFileStore.ts`) — File System Access API handle for saving config to a `.json` file across sessions.

`src/utils/schema.ts` is the single source of truth for piece names (`FRENTE`, `ESPALDA`, `MANGA_IZQ`, `MANGA_DER`), configurable elements per piece, and CSV column order. Any new element or piece must be added here first.

`src/utils/csvExport.ts` builds the CSV from the store state. `src/utils/excelReader.ts` parses the incoming `.xlsx`.

### `web/` — Legacy App

| File | Role |
|---|---|
| `js/schema.js` | `SCHEMA` — piece/element/field definitions; `CSV_COLUMN_ORDER`; `PLAYER_KEYS` |
| `js/app.js` | `APP` global state, screen navigation, per-talla rules, per-player overrides, rendering |
| `js/csv-export.js` | CSV builder and downloader |

### `IA/` — ExtendScript Plugin

See `IA/CLAUDE.md` for full detail. Key constraint: all `IA/lib/*.jsx` files are **ExtendScript (ES3)** — no `const`/`let`, arrow functions, template literals, or `Array.forEach`. Files share one global scope via `#include`.

## Critical Constraints

- **ExtendScript is ES3.** Never use modern JS syntax in `IA/`.
- **Template names are case-sensitive and exact:** `TEMPLATE`, `FRENTE`, `ESPALDA`, `MANGA_IZQ` (singular), `MANGA_DER`, `DINAMICO`, `ESTATICO`, `NOMBRE`, `NUMERO`, `LOGO`.
- **Unit convention:** CSV and `CONFIG` use centimetres; Illustrator internals use points. Convert via `ptToCm`/`cmToPt` (`IA/lib/utils.jsx`). `CM_TO_PT = 28.3464567`.
- **Plotter max width: 130 cm (3685 pt).** Layout rows must not exceed this.
- **`IA/lib/config.jsx` `CONFIG.templateBase`** stores the measured cm dimensions of each `.ai` template piece group. Update this if the artwork is resized or scaling will be wrong.
- **`DATOS/DATOS.csv`** is the live data file used by the script. The Excel source is `DATOS/EQUIPO.xlsx`, sheet `DATOS_CSV`.
