# 📱 Sistema de Recibos PNG - Especificación Completa

## 🎯 Objetivo
Crear un sistema paralelo que genere recibos PNG elegantes para enviar a clientes, manteniendo el sistema de impresión térmica actual intacto.

**Archivo de descarga**: `Ticket_{FOLIO}.png` (ej: `Ticket_AP-k8hcg.png`)

---

## 🎨 Assets Structure
```
/assets/receipt/
├── background.png          (fondo decorativo completo)
├── logo.png               (logotipo del negocio)
├── business-name.png       (nombre del negocio)
├── tagline.png            (tagline: "Beauty Expert", etc.)
├── comprobante-title.png  (título "COMPROBANTE DE PAGO")
└── rectangle-white.png    (rectángulo contenedor blanco/transparente)
```

## 🏗️ Arquitectura del Sistema

### HTML Structure
```html
<div class="receipt-wrapper">
  <!-- Fondo decorativo -->
  <div class="receipt-background" style="background-image: url('/assets/receipt/background.png')">
    
    <!-- Container principal -->
    <div class="receipt-container">
      
      <!-- Header con assets -->
      <div class="receipt-header">
        <img src="/assets/receipt/logo.png" class="logo-img">
        <img src="/assets/receipt/business-name.png" class="business-name-img">
        <img src="/assets/receipt/tagline.png" class="tagline-img">
      </div>
      
      <!-- Contenido sobre rectángulo blanco -->
      <div class="receipt-content" style="background-image: url('/assets/receipt/rectangle-white.png')">
        <img src="/assets/receipt/comprobante-title.png" class="title-img">
        
        <!-- Todo el contenido dinámico con Montserrat -->
        <div class="dynamic-content montserrat">
          <!-- Datos generados dinámicamente -->
        </div>
      </div>
      
    </div>
  </div>
</div>
```

### CSS Base
```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');

.receipt-wrapper {
  width: 400px;
  font-family: 'Montserrat', sans-serif;
}

.receipt-background {
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.receipt-content {
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
}

.montserrat { font-family: 'Montserrat', sans-serif; }
.bold { font-weight: 600; }
.extra-bold { font-weight: 700; }
```

---

## 🎫 Tipos de Tickets y Casos de Uso

### Matriz de Combinaciones
| Tipo | Cita | Anticipo | Consentimiento | Oncológico | Notas Especiales |
|------|------|----------|----------------|------------|------------------|
| **Servicio Simple** | ❌ | ❌ | ❌ | ❌ | - |
| **Servicio con Cita** | ✅ | ❌ | ❌ | ❌ | Fecha/Hora |
| **Anticipo Puro** | ✅ | ✅ | ❌ | ❌ | Notas anticipo |
| **Servicio + Anticipo Aplicado** | ✅ | ✅ | ❌ | ❌ | **SIN** notas anticipo |
| **Servicio + Consentimiento** | ✅ | ❌ | ✅ | ❌ | Texto consentimiento |
| **Servicio + Oncológico** | ✅ | ❌ | ✅ | ✅ | Datos médico |
| **Combo Completo** | ✅ | ✅ | ✅ | ✅ | Todo combinado |

### Lógica de Detección
```javascript
function analyzeTicketType(movement) {
  return {
    hasAppointment: !!(movement.fechaCita && movement.horaCita),
    isAnticipo: movement.tipo === 'Anticipo' || 
                movement.concepto?.toLowerCase().includes('anticipo'),
    hasAnticipoApplied: movement.discountInfo?.type === 'anticipo',
    hasConsent: movement.client?.consentimiento || movement.client?.esOncologico,
    isOncology: movement.client?.esOncologico,
    needsAnticipoNotes: function() {
      // Solo mostrar notas si es anticipo PURO (no aplicado a servicio)
      return this.isAnticipo && !this.hasAnticipoApplied;
    }
  };
}
```

### Casos Específicos

#### 1. Anticipo Puro
- **Mostrar**: Notas de compromiso y cancelación
- **Condición**: `movement.tipo === 'Anticipo'` Y NO tiene `discountInfo.type === 'anticipo'`

#### 2. Servicio + Anticipo Aplicado  
- **NO mostrar**: Notas de anticipo
- **Condición**: Servicio normal con descuento de anticipo aplicado

#### 3. Paciente Oncológico
- **Mostrar**: Datos del médico (nombre, teléfono, cédula)
- **Condición**: `movement.client.esOncologico === true`

#### 4. Consentimiento Médico
- **Mostrar**: Texto de consentimiento específico
- **Condición**: `movement.client.consentimiento === true`

---

## 🔄 Plan de Desarrollo

### **FASE 1: Setup con Assets (45 min)**
- [ ] Agregar librerías: `html2canvas` + `FileSaver.js`
- [ ] Crear archivo `receipt.js` para lógica PNG
- [ ] Crear archivo `receipt.css` para estilos móviles
- [ ] Setup HTML base con assets structure
- [ ] Test de carga de assets

### **FASE 2: Template Engine + Lógica de Casos (60 min)**
- [ ] Sistema de detección de tipos de ticket
- [ ] Templates dinámicos por caso de uso
- [ ] Mapeo de datos del movimiento a template
- [ ] Test de renderizado por tipo

### **FASE 3: Contenido Dinámico y Datos Médicos (45 min)**  
- [ ] Sección de consentimiento médico
- [ ] Datos de pacientes oncológicos
- [ ] Información de citas (fecha/hora)
- [ ] Test con datos médicos reales

### **FASE 4: Notas de Anticipo Inteligentes (30 min)**
- [ ] Lógica para mostrar/ocultar notas de anticipo
- [ ] Templates condicionales
- [ ] Test de casos anticipo vs servicio+anticipo

### **FASE 5: Generación PNG y Descarga (30 min)**
- [ ] Configuración `html2canvas` optimizada para móvil
- [ ] Sistema de nombres: `Ticket_{FOLIO}.png`
- [ ] Función de descarga automática
- [ ] Test de calidad de imagen

### **FASE 6: Testing Exhaustivo (45 min)**
- [ ] Test matrix con todos los casos
- [ ] Verificación de calidad PNG
- [ ] Compatibilidad navegadores
- [ ] Test de rendimiento

---

## 🧪 Test Scenarios

```javascript
const testScenarios = [
  // Básicos
  { 
    desc: "Servicio simple", 
    data: { tipo: "service", client: null, fechaCita: null },
    expect: { noAnticipoNotes: true, noMedicalData: true }
  },
  
  { 
    desc: "Servicio con cita", 
    data: { tipo: "service", client: "normal", fechaCita: "2025-01-15", horaCita: "10:00" },
    expect: { hasAppointment: true }
  },
  
  // Anticipos
  { 
    desc: "Anticipo puro", 
    data: { tipo: "Anticipo" },
    expect: { hasAnticipoNotes: true }
  },
  
  { 
    desc: "Servicio + anticipo aplicado", 
    data: { tipo: "service", discountInfo: { type: "anticipo" }},
    expect: { hasAnticipoNotes: false }
  },
  
  // Médicos
  { 
    desc: "Paciente oncológico completo", 
    data: { 
      client: { 
        esOncologico: true, 
        nombreMedico: "Dr. Juan", 
        telefonoMedico: "123456", 
        cedulaMedico: "ABC123" 
      }
    },
    expect: { hasMedicalData: true, hasConsentText: true }
  }
];
```

---

## 📦 Dependencias Requeridas

### Librerías JavaScript
```html
<!-- En index.html -->
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js"></script>
```

### Google Fonts
```css
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');
```

---

## 🚀 Integración con Sistema Actual

### Botón en Tabla de Tickets
```html
<!-- Agregar columna extra en tabla de movimientos -->
<td>
  <button onclick="downloadReceiptPNG('${mov.id}')" class="btn-receipt">
    📱 Enviar Recibo
  </button>
</td>
```

### Función Principal
```javascript
async function downloadReceiptPNG(movementId) {
  try {
    // 1. Obtener datos del movimiento
    const movement = await getMovementById(movementId);
    
    // 2. Analizar tipo de ticket
    const ticketType = analyzeTicketType(movement);
    
    // 3. Generar HTML del recibo
    const receiptHTML = generateReceiptHTML(movement, ticketType);
    
    // 4. Convertir a PNG
    const canvas = await html2canvas(receiptHTML, pngConfig);
    
    // 5. Descargar
    canvas.toBlob(blob => {
      saveAs(blob, `Ticket_${movement.folio}.png`);
    });
    
  } catch (error) {
    console.error('Error generating receipt:', error);
    alert('Error al generar el recibo');
  }
}
```

---

## 📏 Configuración PNG

```javascript
const pngConfig = {
  scale: 2,                    // HD quality
  width: 400,                  // Mobile optimal width
  height: 'auto',             
  backgroundColor: 'transparent', // Usar fondo del asset
  useCORS: true,              // Para assets externos
  allowTaint: true,
  ignoreElements: (element) => {
    // Ignorar elementos que no queremos en el PNG
    return element.classList?.contains('no-png');
  }
};
```

---

## 🎯 Resultado Final

**✅ Sistema que genera recibos PNG:**
- Diseño profesional idéntico al mockup
- Maneja TODOS los casos del negocio
- Descarga automática con nombre correcto
- No interfiere con sistema de impresión actual
- Optimizado para móvil y WhatsApp

**📱 Flujo de Usuario:**
1. Cliente termina servicio → Se imprime ticket térmico (como siempre)
2. Si cliente quiere recibo digital → Staff hace clic en "📱 Enviar Recibo"
3. Se descarga PNG → Staff envía por WhatsApp/email

**Estimación Total: 4 horas de desarrollo + testing**