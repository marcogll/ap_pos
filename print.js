/**
 * Escapa caracteres HTML para prevenir XSS.
 * @param {string} str El string a escapar.
 * @returns {string} El string escapado.
 */
function esc(str) {
  return String(str || '').replace(/[&<>"'/]/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": "&#39;"
  }[c]));
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    const day = String(adjustedDate.getDate()).padStart(2, '0');
    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const year = adjustedDate.getFullYear();
    const hours = String(adjustedDate.getHours()).padStart(2, '0');
    const minutes = String(adjustedDate.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Genera el HTML para un ticket de movimiento.
 * @param {object} mov El objeto del movimiento.
 * @param {object} settings El objeto de configuración.
 * @returns {string} El HTML del ticket.
 */
function templateTicket(mov, settings) {
  const fechaLocal = formatDate(mov.fechaISO || Date.now());
  const montoFormateado = Number(mov.monto).toFixed(2);
  const tipoServicio = mov.subtipo === 'Retoque' ? `Retoque de ${mov.tipo}` : mov.tipo;

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
  lines.push(`<div><span class="t-bold">${esc(tipoServicio)}</span></div>`);
  if (mov.client) lines.push(`<div class="t-small">Cliente: ${esc(mov.client.nombre)}</div>`);
  if (mov.concepto) lines.push(`<div class="t-small">Concepto: ${esc(mov.concepto)}</div>`);
  if (mov.staff)  lines.push(`<div class="t-small"><b>Te atendió:</b> ${esc(mov.staff)}</div>`);
  if (mov.metodo) lines.push(`<div class="t-small">Método: ${esc(mov.metodo)}</div>`);
  if (mov.notas)  lines.push(`<div class="t-small">Notas: ${esc(mov.notas)}</div>`);
  
  lines.push('<div class="t-divider"></div>');
  lines.push(`<div class="t-row t-bold"><span>Total</span><span>${montoFormateado}</span></div>`);
  
  if (mov.client && (mov.client.esOncologico || mov.client.consentimiento)) {
    lines.push('<div class="t-divider"></div>');
    if (mov.client.esOncologico) {
      lines.push('<div class="t-section t-bold t-center">Consentimiento Oncológico</div>');
      lines.push(`<div class="t-small">El cliente declara ser paciente oncológico y que la información de su médico es veraz.</div>`);
      if (mov.client.nombreMedico) lines.push(`<div class="t-small">Médico: ${esc(mov.client.nombreMedico)}</div>`);
      if (mov.client.telefonoMedico) lines.push(`<div class="t-small">Tel. Médico: ${esc(mov.client.telefonoMedico)}</div>`);
      if (mov.client.cedulaMedico) lines.push(`<div class="t-small">Cédula: ${esc(mov.client.cedulaMedico)}</div>`);
    }
    lines.push('<div class="t-divider"></div>');
    lines.push(`<div class="t-small t-center">Al consentir el servicio, declara que la información médica proporcionada es veraz.</div>`);
  }

  if (settings.leyenda) lines.push(`<div class="t-footer t-center t-small">${esc(settings.leyenda)}</div>`);
  
  lines.push('<div class="t-qr-section">');
  lines.push('<div class="t-small t-bold">¡Tu opinión es muy importante!</div>');
  lines.push('<div class="t-small">Escanea el código QR para darnos tu feedback.</div>');
  lines.push('<canvas id="qr-canvas"></canvas>');
  lines.push('</div>');

  lines.push('</div>');
  return lines.join('');
}

/**
 * Renderiza el ticket en el DOM, genera el QR y llama a la función de impresión.
 * @param {object} mov El objeto del movimiento.
 * @param {object} settings El objeto de configuración.
 */
export async function renderTicketAndPrint(mov, settings) {
  const printArea = document.getElementById('printArea');
  if (!printArea) {
    console.error("El área de impresión #printArea no se encontró.");
    alert("Error: No se encontró el área de impresión. Contacte al soporte.");
    return;
  }

  try {
    printArea.innerHTML = templateTicket(mov, settings);

    const canvas = document.getElementById('qr-canvas');
    if (!canvas) {
      console.error("El canvas del QR #qr-canvas no se encontró. Se imprimirá sin QR.");
      window.print();
      return;
    }

    const qrUrl = 'http://vanityexperience.mx/qr';
    await QRCode.toCanvas(canvas, qrUrl, { width: 140, margin: 1 });

    requestAnimationFrame(() => window.print());

  } catch (error) {
    console.error("Error al intentar imprimir:", error);
    alert(`Ocurrió un error al preparar la impresión: ${error.message}. Revise la consola para más detalles.`);
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const btnTestTicket = document.getElementById('btnTestTicket');
  if (btnTestTicket) {
    btnTestTicket.addEventListener('click', () => {
      const demoMovement = {
        id: 'demo',
        folio: 'DEMO-000001',
        fechaISO: new Date().toISOString(),
        client: {
          nombre: 'Cliente de Prueba',
          esOncologico: true,
          nombreMedico: 'Dr. Juan Pérez',
          telefonoMedico: '5512345678',
          cedulaMedico: '1234567'
        },
        tipo: 'Pago',
        monto: 123.45,
        metodo: 'Efectivo',
        concepto: 'Producto de demostración',
        staff: 'Admin',
        notas: 'Esta es una impresión de prueba.'
      };
      renderTicketAndPrint(demoMovement, window.settings || {});
    });
  }
});