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
  // FUNCIÓN DE FECHA DEFINITIVA - NO MAS UNDEFINED NUNCA MAS
  function generarFechaTicketFINAL() {
    // Crear nueva fecha DIRECTAMENTE
    const fecha = new Date();
    
    // Obtener componentes de fecha SIN VARIABLES INTERMEDIAS
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear().toString();
    const hora = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    
    // Construir fecha final DIRECTAMENTE
    const resultado = `${dia}/${mes}/${año} ${hora}:${minutos}`;
    console.log("FECHA FINAL DEFINITIVA GENERADA:", resultado);
    return resultado;
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
  
  // CLIENTE PRIMERO
  if (mov.client) lines.push(`<div class="t-center t-small t-service-detail"><b>Cliente:</b> ${esc(mov.client.nombre)}</div>`);
  
  // DATOS DE CITA PROMINENTES
  if (mov.fechaCita || mov.horaCita) {
    lines.push('<div class="t-spacer"></div>');
    if (mov.fechaCita) lines.push(`<div class="t-center t-small"><b>Fecha de Cita:</b> ${esc(mov.fechaCita)}</div>`);
    if (mov.horaCita) lines.push(`<div class="t-center t-small"><b>Hora de Cita:</b> ${esc(mov.horaCita)}</div>`);
  }
  
  lines.push('<div class="t-spacer"></div>');
  lines.push(`<div class="t-row t-small"><span><b>Folio:</b></span><span>${esc(mov.folio)}</span></div>`);
  
  // Usar la función de fecha específica para tickets
  const fechaFinal = generarFechaTicketFINAL();
  console.log("FECHA GENERADA PARA TICKET:", fechaFinal);
  lines.push(`<div class="t-row t-small"><span><b>Fecha de Venta:</b></span><span>${esc(fechaFinal)}</span></div>`);
  
  lines.push('<div class="t-divider"></div>');
  lines.push(`<div class="t-center t-service-title t-bold">${esc(tipoServicio)}</div>`);
  
  // CONCEPTO CON PRECIO
  if (mov.concepto) {
    lines.push(`<div class="t-center t-small t-service-detail"><b>Concepto:</b></div>`);
    lines.push(`<div class="t-row t-small"><span>${esc(mov.concepto)}</span><span>$${montoFormateado}</span></div>`);
  }
  
  // DESCUENTOS SI EXISTEN
  if (mov.descuento && mov.descuento > 0) {
    if (mov.discountInfo) {
      // Mostrar información detallada del descuento
      const discountInfo = mov.discountInfo;
      let descriptionText = '';
      let amountText = `-$${Number(mov.descuento).toFixed(2)}`;
      
      if (discountInfo.type === 'anticipo') {
        // Distinguir entre anticipo registrado y manual
        if (discountInfo.anticipo && discountInfo.anticipo.manual) {
          descriptionText = `Anticipo manual aplicado (${discountInfo.anticipo.comentario})`;
        } else {
          descriptionText = `Anticipo aplicado ${discountInfo.anticipo ? `(${discountInfo.anticipo.folio})` : ''}`;
        }
        amountText = `-$${Number(mov.descuento).toFixed(2)} (${discountInfo.percentage.toFixed(1)}%)`;
      } else if (discountInfo.type === 'warrior') {
        descriptionText = 'Descuento Vanity (100%)';
        amountText = `-$${Number(mov.descuento).toFixed(2)} (${discountInfo.percentage.toFixed(1)}%)`;
      } else if (discountInfo.type === 'percentage') {
        descriptionText = `Descuento (${discountInfo.value}%)`;
        amountText = `-$${Number(mov.descuento).toFixed(2)} (${discountInfo.percentage.toFixed(1)}%)`;
      } else if (discountInfo.type === 'amount') {
        descriptionText = `Descuento ($${discountInfo.value})`;
        amountText = `-$${Number(mov.descuento).toFixed(2)} (${discountInfo.percentage.toFixed(1)}%)`;
      }
      
      lines.push(`<div class="t-row t-small"><span>${descriptionText}:</span><span>${amountText}</span></div>`);
      
      // Mostrar comentario del descuento si existe
      if (discountInfo.reason && discountInfo.reason.trim()) {
        lines.push(`<div class="t-center t-small t-service-detail"><b>Motivo:</b> ${esc(discountInfo.reason)}</div>`);
      }
    } else {
      // Fallback para formato anterior
      lines.push(`<div class="t-row t-small"><span>Descuento ${mov.motivoDescuento ? '(' + esc(mov.motivoDescuento) + ')' : ''}:</span><span>-$${Number(mov.descuento).toFixed(2)}</span></div>`);
    }
  }
  
  if (mov.staff) lines.push(`<div class="t-center t-small t-service-detail"><b>Te atendió:</b> ${esc(mov.staff)}</div>`);
  if (mov.notas) lines.push(`<div class="t-center t-small t-service-detail"><b>Notas:</b> ${esc(mov.notas)}</div>`);
  
  lines.push('<div class="t-divider"></div>');
  
  // TOTAL ALINEADO A LA DERECHA
  lines.push(`<div class="t-row t-bold"><span></span><span><b>Total: $${montoFormateado}</b></span></div>`);
  
  // MÉTODO DE PAGO DEBAJO DEL TOTAL - ALINEADO A LA DERECHA
  if (mov.metodo) lines.push(`<div class="t-right t-small"><b>Método:</b> ${esc(mov.metodo)}</div>`);
  
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

// FORZAR RECARGA - 2025-09-05T20:43:00 - NUEVA FUNCIÓN generarFechaTicketFINAL