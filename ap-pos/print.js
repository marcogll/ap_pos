/**
 * Escapa caracteres HTML para prevenir XSS.
 * @param {string} str El string a escapar.
 * @returns {string} El string escapado.
 */
function esc(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[c]));
}

/**
 * Genera el HTML para un ticket de movimiento.
 * @param {object} mov El objeto del movimiento.
 * @param {object} settings El objeto de configuración.
 * @returns {string} El HTML del ticket.
 */
function templateTicket(mov, settings) {
  const dt = new Date(mov.fechaISO || Date.now());
  const fechaLocal = dt.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  const montoFormateado = Number(mov.monto).toFixed(2);

  const lines = [];
  lines.push('<div class="ticket">');
  lines.push('<img src="src/logo.png" alt="Logo" class="t-logo">');
  
  if (settings.negocio) lines.push(`<div class="t-center t-bold">${esc(settings.negocio)}</div>`);
  if (settings.tagline) lines.push(`<div class="t-center t-tagline">${esc(settings.tagline)}</div>`);
  if (settings.rfc) lines.push(`<div class="t-center t-small">RFC: ${esc(settings.rfc)}</div>`);
  if (settings.sucursal) lines.push(`<div class="t-center t-small">${esc(settings.sucursal)}</div>`);
  if (settings.tel) lines.push(`<div class="t-center t-small">Tel: ${esc(settings.tel)}</div>`);
  
  lines.push('<div class="t-divider"></div>');
  lines.push(`<div class="t-row t-small"><span>Folio:</span><span>${esc(mov.folio)}</span></div>`);
  lines.push(`<div class="t-row t-small"><span>Fecha:</span><span>${esc(fechaLocal)}</span></div>`);
  
  lines.push('<div class="t-divider"></div>');
  lines.push(`<div><span class="t-bold">${esc(mov.tipo)}</span></div>`);
  if (mov.cliente) lines.push(`<div class="t-small">Cliente: ${esc(mov.cliente)}</div>`);
  if (mov.concepto) lines.push(`<div class="t-small">Concepto: ${esc(mov.concepto)}</div>`);
  if (mov.staff)  lines.push(`<div class="t-small"><b>Te atendió:</b> ${esc(mov.staff)}</div>`);
  if (mov.metodo) lines.push(`<div class="t-small">Método: ${esc(mov.metodo)}</div>`);
  if (mov.notas)  lines.push(`<div class="t-small">Notas: ${esc(mov.notas)}</div>`);
  
  lines.push('<div class="t-divider"></div>');
  lines.push(`<div class="t-row t-bold"><span>Total</span><span>$${montoFormateado}</span></div>`);
  
  if (settings.leyenda) lines.push(`<div class="t-footer t-center t-small">${esc(settings.leyenda)}</div>`);
  
  lines.push('</div>');
  return lines.join('');
}

/**
 * Renderiza el ticket en el DOM y llama a la función de impresión del navegador.
 * @param {object} mov El objeto del movimiento.
 * @param {object} settings El objeto de configuración.
 */
export function renderTicketAndPrint(mov, settings) {
  const printArea = document.getElementById('printArea');
  if (printArea) {
    printArea.innerHTML = templateTicket(mov, settings);
    window.print();
  } else {
    console.error("El área de impresión #printArea no se encontró.");
  }
}
