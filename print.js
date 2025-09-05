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


/**
 * Genera el HTML para un ticket de movimiento.
 * @param {object} mov El objeto del movimiento.
 * @param {object} settings El objeto de configuración.
 * @returns {string} El HTML del ticket.
 */
function templateTicket(mov, settings) {
  // Función de fecha EXCLUSIVA para tickets - no depende de nada más
  function fechaTicketDefinitivaV2() {
    // PRUEBA: Hardcodeamos para confirmar que esta función se está ejecutando
    console.log("FUNCIÓN fechaTicketDefinitivaV2 EJECUTÁNDOSE - MOV:", mov);
    
    if (mov && mov.fechaISO) {
      console.log("Usando mov.fechaISO:", mov.fechaISO);
      const fecha = new Date(mov.fechaISO);
      const dia = String(fecha.getDate()).padStart(2, '0');
      const mes = String(fecha.getMonth() + 1).padStart(2, '0'); 
      const año = fecha.getFullYear();
      const hora = String(fecha.getHours()).padStart(2, '0');
      const minuto = String(fecha.getMinutes()).padStart(2, '0');
      return `${dia}/${mes}/${año} ${hora}:${minuto}`;
    } else {
      console.log("No hay mov.fechaISO, usando fecha actual");
      return "05/09/2025 00:32 - NUEVA FUNCIÓN";
    }
  }
  
  const montoFormateado = Number(mov.monto).toFixed(2);
  const tipoServicio = mov.subtipo === 'Retoque' ? `Retoque de ${mov.tipo}` : mov.tipo;

  const lines = [];
  lines.push('<div class="ticket">');
  lines.push('<img src="src/logo.png" alt="Logo" class="t-logo">');
  
  // Información del negocio - verificar estructura de settings
  // Extraer datos desde settings o settings.settings (doble anidación)
  const businessData = settings?.settings || settings || {};
  
  const negocioNombre = businessData?.negocio || settings?.negocio || 'Ale Ponce';
  const negocioTagline = businessData?.tagline || settings?.tagline || 'beauty expert';  
  const negocioCalle = businessData?.calle || settings?.calle;
  const negocioColonia = businessData?.colonia || settings?.colonia;
  const negocioCP = businessData?.cp || settings?.cp;
  const negocioRFC = businessData?.rfc || settings?.rfc;
  const negocioTel = businessData?.tel || settings?.tel || '8443555108';
  
  lines.push(`<div class="t-center t-bold t-business-name">${esc(negocioNombre)}</div>`);
  lines.push(`<div class="t-center t-tagline">${esc(negocioTagline)}</div>`);
  lines.push('<div class="t-spacer"></div>');
  if (negocioCalle) lines.push(`<div class="t-center t-small">${esc(negocioCalle)}</div>`);
  if (negocioColonia && negocioCP) lines.push(`<div class="t-center t-small">${esc(negocioColonia)}, ${esc(negocioCP)}</div>`);
  if (negocioRFC) lines.push(`<div class="t-center t-small">RFC: ${esc(negocioRFC)}</div>`);
  lines.push(`<div class="t-center t-small">Tel: ${esc(negocioTel)}</div>`);
  
  lines.push('<div class="t-divider"></div>');
  lines.push(`<div class="t-row t-small"><span><b>Folio:</b></span><span>${esc(mov.folio)}</span></div>`);
  // Usar la función de fecha específica para tickets
  const fechaFinal = fechaTicketDefinitivaV2();
  
  lines.push(`<div class="t-row t-small"><span><b>Fecha:</b></span><span>${esc(fechaFinal)}</span></div>`);
  
  lines.push('<div class="t-divider"></div>');
  lines.push(`<div class="t-service-title t-bold">${esc(tipoServicio)}</div>`);
  if (mov.client) lines.push(`<div class="t-small t-service-detail">Cliente: ${esc(mov.client.nombre)}</div>`);
  if (mov.concepto) lines.push(`<div class="t-small t-service-detail">Concepto: ${esc(mov.concepto)}</div>`);
  if (mov.staff) lines.push(`<div class="t-small t-service-detail"><b>Te atendió:</b> ${esc(mov.staff)}</div>`);
  if (mov.metodo) lines.push(`<div class="t-small t-service-detail">Método: ${esc(mov.metodo)}</div>`);
  if (mov.notas) lines.push(`<div class="t-small t-service-detail">Notas: ${esc(mov.notas)}</div>`);
  
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
    const consentText = mov.tipo === 'Curso' || tipoServicio.toLowerCase().includes('curso') 
      ? 'Al inscribirse al curso, acepta los términos y condiciones del programa educativo.'
      : 'Al consentir el servicio, declara que la información médica proporcionada es veraz.';
    lines.push(`<div class="t-small t-center">${consentText}</div>`);
  }

  lines.push('<div class="t-qr-section">');
  lines.push('<div class="t-small t-bold t-center">¡Tu opinión es muy importante!</div>');
  lines.push('<div class="t-small t-center">Escanea el código QR para darnos tu feedback.</div>');
  lines.push('<canvas id="qr-canvas"></canvas>');
  lines.push('</div>');
  
  const negocioLeyenda = businessData?.leyenda || settings?.leyenda;
  if (negocioLeyenda) lines.push(`<div class="t-footer t-center t-small">${esc(negocioLeyenda)}</div>`);

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

// FORZAR RECARGA - 2025-09-04T16:36:00 - Fecha corregida