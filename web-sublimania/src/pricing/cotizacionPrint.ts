import type { CotizacionHistoryEntry } from './types';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
function fmt(v: number) { return money.format(v); }
function pct(v: number) { return v > 0 ? `${Math.round(v * 100)}%` : '—'; }

function productLabel(id: string): string {
  switch (id) {
    case 'camiseta':    return 'Camiseta';
    case 'pantaloneta': return 'Pantaloneta';
    case 'equipo':      return 'Uniforme';
    case 'por_cm':      return 'Por cm';
    default:            return id;
  }
}

export function generateCotizacionHtml(entry: CotizacionHistoryEntry): string {
  const date = new Date(entry.createdAt).toLocaleDateString('es-EC', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const safeName = (entry.clienteNombre || 'SinCliente')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
  const dateTag = new Date(entry.createdAt)
    .toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '');
  const docTitle = `Cotizacion_${safeName}_${dateTag}`;

  const modeLabel =
    entry.serviceMode === 'full_service' ? 'UNIFORME COMPLETO' :
    entry.serviceMode === 'paper'        ? 'PAPEL'            : 'SUBLIMADO';

  const fabricLine = entry.serviceMode === 'full_service'
    ? `<div class="fab">
        Tela camiseta: <strong>${entry.fabricCamisetaNombre ?? '—'}</strong>
        &nbsp;·&nbsp;
        Tela pantaloneta: <strong>${entry.fabricPantalonetaNombre ?? '—'}</strong>
       </div>`
    : '';

  const bodyRows = entry.lines.map((line, i) => `
    <tr class="${i % 2 === 1 ? 'row-alt' : ''}">
      <td class="col-num">${i + 1}</td>
      <td class="col-prod">${productLabel(line.productId)}</td>
      <td class="col-talla">${line.talla}</td>
      <td class="col-cant">${line.quantity}</td>
      <td class="col-desc">${pct(line.volumeDiscount)}</td>
      <td class="col-pu">${fmt(line.finalUnitPrice)}</td>
      <td class="col-sub">${fmt(line.totalPrice)}</td>
    </tr>`).join('');


  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${docTitle}</title>
<style>
  @page { size: A4 portrait; margin: 1.2cm 1.4cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Space Grotesk', Arial, sans-serif; font-size: 9pt; color: #111; background: #fff; }

  /* ── Header ── */
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    border: 2px solid #111; padding: 0.55rem 0.75rem; margin-bottom: 0;
  }
  .header-left { display: flex; flex-direction: column; gap: 0.18rem; }
  .brand { font-size: 14pt; font-weight: 900; letter-spacing: 0.1em; line-height: 1; }
  .cliente { font-size: 9pt; margin-top: 0.2rem; }
  .cliente strong { font-weight: 700; }
  .date-line { font-size: 7.5pt; opacity: 0.5; margin-top: 0.1rem; }
  .fab { font-size: 7pt; opacity: 0.65; margin-top: 0.3rem; }
  .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; }
  .doc-label { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.12em; opacity: 0.45; }
  .mode-badge {
    font-size: 6.5pt; font-weight: 800; letter-spacing: 0.1em;
    padding: 0.2rem 0.5rem; border: 1.5px solid #111;
    background: #111; color: #fff;
    print-color-adjust: exact; -webkit-print-color-adjust: exact;
  }

  /* ── Table ── */
  table {
    width: 100%; border-collapse: collapse;
    border-left: 2px solid #111; border-right: 2px solid #111; border-bottom: 2px solid #111;
    font-size: 8.5pt;
  }
  thead tr {
    background: #222; color: #fff;
    print-color-adjust: exact; -webkit-print-color-adjust: exact;
  }
  th {
    padding: 0.3rem 0.55rem; text-align: left;
    font-size: 7pt; font-weight: 700; letter-spacing: 0.08em;
  }
  td { padding: 0.25rem 0.55rem; border-bottom: 0.5px solid #e0e0e0; }
  tr:last-child td { border-bottom: none; }
  .row-alt td { background: #f8f8f8; print-color-adjust: exact; -webkit-print-color-adjust: exact; }

  /* column alignment */
  .col-num  { width: 28px; text-align: center; opacity: 0.45; font-size: 7.5pt; }
  .col-prod { font-weight: 600; }
  .col-talla { font-weight: 700; }
  .col-cant, .col-desc { text-align: center; }
  .col-pu, .col-sub { text-align: right; font-variant-numeric: tabular-nums; }
  .col-sub { font-weight: 700; }
  th.col-pu, th.col-sub, th.col-cant, th.col-desc { text-align: right; }
  th.col-talla { text-align: center; }
  th.col-num { text-align: center; }

  /* ── Totals ── */
  .totals {
    border: 2px solid #111; border-top: none;
    padding: 0.5rem 0.75rem;
    display: flex; justify-content: flex-end; gap: 2.5rem;
  }
  .total-item { display: flex; flex-direction: column; align-items: flex-end; gap: 0.05rem; }
  .total-label { font-size: 6.5pt; font-weight: 700; letter-spacing: 0.08em; opacity: 0.5; }
  .total-value { font-size: 11pt; font-weight: 900; font-variant-numeric: tabular-nums; }
  .total-value.accent { color: #000; }

  /* ── Footer ── */
  .footer {
    margin-top: 1.2rem;
    padding-top: 0.4rem;
    border-top: 0.5px solid #ccc;
    font-size: 6.5pt; opacity: 0.4; letter-spacing: 0.04em;
    display: flex; justify-content: space-between;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="brand">${entry.orgNombre}</div>
      <div class="cliente">Cliente: <strong>${entry.clienteNombre || '—'}</strong></div>
      <div class="date-line">${date}</div>
      ${fabricLine}
    </div>
    <div class="header-right">
      <div class="doc-label">COTIZACIÓN</div>
      <div class="mode-badge">${modeLabel}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-prod">PRODUCTO</th>
        <th class="col-talla">TALLA</th>
        <th class="col-cant">CANT.</th>
        <th class="col-desc">DESC.</th>
        <th class="col-pu">P/U</th>
        <th class="col-sub">SUBTOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-item">
      <span class="total-label">TOTAL</span>
      <span class="total-value accent">${fmt(entry.totalPrice)}</span>
    </div>
  </div>

  <div class="footer">
    <span>Precios en USD · Sujetos a cambio sin previo aviso</span>
    <span>Generado por ${entry.orgNombre}</span>
  </div>

  <script>window.onload = function(){ window.focus(); window.print(); }<\/script>
</body>
</html>`;
}

export function openCotizacionPrintWindow(entry: CotizacionHistoryEntry): void {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(generateCotizacionHtml(entry));
  win.document.close();
}
