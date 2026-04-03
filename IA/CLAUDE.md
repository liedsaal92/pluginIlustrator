# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GENERAR_EQUIPO** — Sublimania's automatic sports-team uniform generator.
Two-part system:
1. **Web app** (`web/`) — browser tool to load an Excel player roster, configure per-size design rules, and export a CSV.
2. **Illustrator script** (`GENERAR_EQUIPO.jsx` + `lib/`) — ExtendScript that reads the CSV, validates the `.ai` template, duplicates and scales each garment piece per player, and places results in a `GENERADO` layer.

## Running the Script

There is no build step. To execute in Adobe Illustrator:

> **File → Scripts → Other Script…** → select `GENERAR_EQUIPO.jsx`

The script requires:
- An `.ai` document open with a `TEMPLATE` layer (see Template Structure below)
- A CSV file exported from the web app (or from the `DATOS_CSV` sheet of the Excel)

## Running the Web App

Open `web/index.html` directly in a browser (no server needed). It uses SheetJS (loaded from CDN) to parse `.xlsx` files client-side. State is persisted via `localStorage`; the Excel file handle is persisted via IndexedDB for repeat saves.

## Language & Runtime Constraints

`lib/*.jsx` and `GENERAR_EQUIPO.jsx` are **ExtendScript** (Adobe's ES3-based engine). Key constraints:
- No `const`/`let`, arrow functions, template literals, `Array.forEach`, or any ES5+ features.
- No modules — files are concatenated at runtime via `#include` directives in the entry file.
- All files must share a single global scope; function and variable names must not collide across files.
- `web/js/*.js` is modern ES6+ and runs in the browser — different rules apply there.

## Architecture

### ExtendScript side (`lib/` load order via `#include`)

| File | Responsibility |
|---|---|
| `config.jsx` | `CONFIG` object — template base dimensions (cm), plotter width, gap sizes, piece names, CSV column names |
| `log.jsx` | `Log` singleton — `.ok()`, `.info()`, `.error()`, `.fatal()`, `.exportar()` writes a timestamped `.txt` |
| `utils.jsx` | `trim`, `sanitizar`, `ptToCm`/`cmToPt`, `getTimestamp`, `decodificarXml` |
| `ai_utils.jsx` | Illustrator DOM helpers — find layers/groups/items by name (direct, recursive, all-duplicates), `crearDocumentoNuevo` |
| `csv_reader.jsx` | `leerXlsx(file)` — parses UTF-8 CSV, normalises numeric fields, filters blank-NOMBRE rows |
| `template_validator.jsx` | `validarPlantilla(doc)` — checks `TEMPLATE` layer exists, finds piece groups, detects duplicates |
| `escala.jsx` | `scaleGroupExact`, `escalarLogoDesdecentro`, `escalarItemDesdecentro`, `escalarItemProporcional`, `getDimensiones`, `getBaseParaPieza` |
| `dinamicos.jsx` | `aplicarDinamicos(grupoCopia, jugador, pieza, factorPieza)` — sets `NOMBRE`, `NUMERO`, logos, sponsors, costillas, etiqueta, sleeve lines |

### Template `.ai` required structure

```
Layer: TEMPLATE
  GroupItem: FRENTE      ← must be at first level of TEMPLATE
    GroupItem: DINAMICO
      TextFrame: NOMBRE
      TextFrame: NUMERO
      GroupItem: ESCUDO
      ...
    GroupItem: ESTATICO
  GroupItem: ESPALDA
  GroupItem: MANGA_IZQ
  GroupItem: MANGA_DER
```

- Each piece group may have **one** `DINAMICO` and **one** `ESTATICO` subgroup (validator rejects duplicates).
- Output is written to a `GENERADO` layer created in the same document; any previous `GENERADO` layer is cleared.

### Web app (`web/`)

| File | Responsibility |
|---|---|
| `js/schema.js` | `SCHEMA` — piece/element/field definitions that drive the form; `CSV_COLUMN_ORDER` — canonical column order for export; `PLAYER_KEYS` — fixed per-player columns |
| `js/app.js` | `APP` global state, screen navigation (`upload → configure → export`), per-talla rules, per-player overrides, rendering |
| `js/csv-export.js` | Builds and downloads the CSV from `APP` state |

### Unit convention

All dimensions in `CONFIG` and the CSV are in **centimetres**. Internal Illustrator coordinates use **points**. Use `ptToCm` / `cmToPt` (from `utils.jsx`) for conversions. `CM_TO_PT = 28.3464567` is defined in `config.jsx`.

## Key Config Values (update when template changes)

`lib/config.jsx` — `CONFIG.templateBase` stores the measured cm dimensions of each piece group in the `.ai` template. If the template artwork is resized, these values **must** be updated or scaling will be wrong. Same for `CONFIG.lineaMangaBase`.
