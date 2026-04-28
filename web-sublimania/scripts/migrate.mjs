// ============================================================
//  scripts/migrate.mjs — Migración JSON backup v2 → Supabase
//
//  Uso:
//    node scripts/migrate.mjs <ORG_ID>
//
//  Variables de entorno requeridas (en .env.migration):
//    VITE_SUPABASE_URL=https://xxxx.supabase.co
//    SUPABASE_SERVICE_ROLE_KEY=eyJh...
//
//  El service role key bypasea RLS — nunca lo commitees.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';


// ── Config ───────────────────────────────────────────────────
const ORG_ID = '3251f795-d0f3-4f97-8094-c69b79311902';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`
❌  Faltan variables de entorno. Ejecutá así:

  VITE_SUPABASE_URL=https://xxxx.supabase.co \\
  SUPABASE_SERVICE_ROLE_KEY=eyJh... \\
  node scripts/migrate.mjs

La service role key está en:
  Supabase → Project Settings → API → service_role
`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Leer JSON ────────────────────────────────────────────────
const JSON_PATH = process.argv[2]
  ?? resolve(dirname(fileURLToPath(import.meta.url)), '../../Downloads/sublimania_config_migracion.json');
const raw = JSON.parse(readFileSync(JSON_PATH, 'utf8'));

console.log(`\n📦  Backup v${raw.version} — exportado ${raw.exportedAt}`);
console.log(`🏢  ORG_ID: ${ORG_ID}\n`);

// ── Helpers ──────────────────────────────────────────────────
function ok(label, data) { console.log(`  ✅  ${label} (${Array.isArray(data) ? data.length : 1})`); }
function err(label, error) { console.error(`  ❌  ${label}:`, error?.message ?? error); }

async function upsert(table, rows, conflict) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: conflict });
  if (error) err(table, error);
  else ok(table, rows);
}

// ── 1. Clientes ───────────────────────────────────────────────
async function migrateClientes() {
  console.log('👥  Migrando clientes...');
  const rows = (raw.clientes ?? []).map(c => ({
    id:             c.id,
    org_id:         ORG_ID,
    nombre:         c.nombre,
    casa_costurera: c.casaCosturera,
  }));
  if (!rows.length) return;
  await supabase.from('clientes').delete().eq('org_id', ORG_ID);
  const { error } = await supabase.from('clientes').insert(rows);
  if (error) err('clientes', error);
  else ok('clientes', rows);
}

// ── 2. Moldes (solo default si no existe) ────────────────────
async function migrateMoldes() {
  console.log('🧩  Verificando molde default...');
  const { data } = await supabase.from('moldes').select('id').eq('org_id', ORG_ID).eq('id', 'camiseta');
  if (!data || data.length === 0) {
    const { error } = await supabase.from('moldes').insert({ id: 'camiseta', org_id: ORG_ID, nombre: 'CAMISETA' });
    if (error) err('moldes', error);
    else ok('moldes (default insertado)', [1]);
  } else {
    console.log('  ⏭️   molde "camiseta" ya existe');
  }
}

// ── 3. Tallas config ─────────────────────────────────────────
async function migrateTallas() {
  console.log('📐  Migrando tallas...');
  const rows = [];

  // v2: tallasPorCliente[clienteId][tallaNombre] = dims (sin moldeId)
  // v3: tallasPorCliente[clienteId][moldeId][tallaNombre] = dims
  const byCliente = raw.tallasPorCliente ?? {};

  for (const [clienteId, byTallaOrMolde] of Object.entries(byCliente)) {
    // Detectar si es v2 (valor es {ALTO,ANCHO,...}) o v3 (valor es otro objeto con moldeId)
    const firstVal = Object.values(byTallaOrMolde)[0] ?? {};
    const isV2 = 'ALTO' in firstVal || 'ANCHO' in firstVal;

    const byMolde = isV2
      ? { camiseta: byTallaOrMolde }          // v2 → envolver en molde default
      : byTallaOrMolde;                        // v3 → ya tiene moldeId

    for (const [moldeId, byTalla] of Object.entries(byMolde)) {
      for (const [talla, dims] of Object.entries(byTalla)) {
        rows.push({
          org_id: ORG_ID,
          cliente_id: clienteId,
          molde_id: moldeId,
          talla,
          alto: dims.ALTO ?? '',
          ancho: dims.ANCHO ?? '',
          manga_ancho: dims.MANGA_ANCHO ?? '',
          manga_alto: dims.MANGA_ALTO ?? '',
          // MANGA_RANGLAN_* ignorados — no están en el schema
        });
      }
    }
  }

  await upsert('tallas_config', rows, 'org_id,cliente_id,molde_id,talla');
}

// ── 4. Teams ─────────────────────────────────────────────────
async function migrateTeams() {
  console.log('⚽  Migrando teams...');
  const teams = raw.teams ?? [];
  const now = new Date().toISOString();

  // 4a. Teams rows
  const teamRows = teams.map(t => ({
    id: t.id,
    org_id: ORG_ID,
    nombre: t.nombre,
    notas: t.globalConfig?.NOTAS ?? '',
    created_at: t.createdAt ?? now,
    updated_at: t.updatedAt ?? now,
  }));
  await upsert('teams', teamRows, 'id,org_id');

  // 4b. Players
  const playerRows = [];
  for (const t of teams) {
    (t.players ?? []).forEach((p, position) => {
      playerRows.push({
        team_id: t.id,
        org_id: ORG_ID,
        position,
        nombre: p.NOMBRE,
        nombre_camiseta: p.NOMBRE_CAMISETA,
        numero: p.NUMERO,
        talla: p.TALLA,
      });
    });
  }

  // Players: delete + re-insert por team
  if (playerRows.length > 0) {
    for (const t of teams) {
      await supabase.from('players').delete().eq('team_id', t.id).eq('org_id', ORG_ID);
    }
    await upsert('players', playerRows, 'team_id,org_id,position');
  } else {
    console.log('  ⏭️   sin jugadores');
  }

  // 4c. Talla rules
  const rulesRows = [];
  for (const t of teams) {
    for (const [talla, rules] of Object.entries(t.tallaRules ?? {})) {
      rulesRows.push({ team_id: t.id, org_id: ORG_ID, talla, rules });
    }
  }
  await upsert('talla_rules', rulesRows, 'team_id,org_id,talla');

  // 4d. Player overrides
  const overrideRows = [];
  for (const t of teams) {
    for (const [pos, overrides] of Object.entries(t.overrides ?? {})) {
      if (Object.keys(overrides).length === 0) continue;
      overrideRows.push({
        team_id: t.id,
        org_id: ORG_ID,
        player_position: Number(pos),
        overrides,
      });
    }
  }
  for (const t of teams) {
    await supabase.from('player_overrides').delete().eq('team_id', t.id).eq('org_id', ORG_ID);
  }
  if (overrideRows.length > 0) {
    await upsert('player_overrides', overrideRows, 'team_id,org_id,player_position');
  } else {
    console.log('  ⏭️   sin overrides');
  }
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  try {
    await migrateClientes();
    await migrateMoldes();
    await migrateTallas();
    await migrateTeams();
    console.log('\n🎉  Migración completa.\n');
  } catch (e) {
    console.error('\n💥  Error inesperado:', e);
    process.exit(1);
  }
}

main();
