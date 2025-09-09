import { renderTicketAndPrint } from './print.js?v=1757454000';

// --- GLOBAL VARIABLES ---
const defaultSettings = {
  tipo: 'Vanity Brows',
  precio: 5250,
  nombreBusiness: 'Vanity Beauty Center',
  direccion: 'Av. Ejemplo 123, Ciudad',
  rfc: '',
  tel: '8443555108',
  leyenda: '¡Gracias por tu preferencia!',
  folioPrefix: 'AP-',
  folioSeq: 1
};

let settings = {};
let movements = [];
let clients = [];
let users = [];
let products = [];
let incomeChart = null;
let paymentMethodChart = null;
let currentUser = {};
let currentClientId = null;
let cancellationRequests = [];

// --- UTILITIES ---
function escapeHTML(str) {
    if (str === null || str === undefined) {
        return '';
    }
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function construirFechaCita() {
    const fechaPicker = document.getElementById('m-fecha-cita');
    if (!fechaPicker || !fechaPicker.value) return '';
    
    // Convertir de formato ISO (YYYY-MM-DD) a formato DD/MM/YYYY
    const dateParts = fechaPicker.value.split('-');
    if (dateParts.length !== 3) return '';
    
    const year = dateParts[0];
    const month = dateParts[1];
    const day = dateParts[2];
    
    // Validar que todas las partes existan
    if (!year || !month || !day) return '';
    
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

// Actualizar horarios disponibles basados en la fecha seleccionada
function updateAvailableTimeSlots(selectedDate) {
    const horaSelect = document.getElementById('m-hora-cita');
    if (!horaSelect || !selectedDate) return;
    
    // Horarios base disponibles
    const baseTimeSlots = [
        { value: '10:00', label: '10:00 AM' },
        { value: '10:30', label: '10:30 AM' },
        { value: '11:00', label: '11:00 AM' },
        { value: '11:30', label: '11:30 AM' },
        { value: '12:00', label: '12:00 PM' },
        { value: '12:30', label: '12:30 PM' },
        { value: '13:00', label: '1:00 PM' },
        { value: '13:30', label: '1:30 PM' },
        { value: '14:00', label: '2:00 PM' },
        { value: '14:30', label: '2:30 PM' },
        { value: '15:00', label: '3:00 PM' },
        { value: '15:30', label: '3:30 PM' },
        { value: '16:00', label: '4:00 PM' },
        { value: '16:30', label: '4:30 PM' },
        { value: '17:00', label: '5:00 PM' },
        { value: '17:30', label: '5:30 PM' },
        { value: '18:00', label: '6:00 PM' }
    ];
    
    // Convertir fecha del date picker (YYYY-MM-DD) al formato usado en la base (DD/MM/YYYY)
    const dateParts = selectedDate.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    
    // Obtener citas ya programadas para esta fecha
    const existingAppointments = movements
        .filter(mov => {
            // Comparar tanto con formato ISO como DD/MM/YYYY
            return mov.fechaCita === selectedDate || mov.fechaCita === formattedDate;
        })
        .map(mov => mov.horaCita)
        .filter(hora => hora);
    
    // Filtrar horarios disponibles
    const availableSlots = baseTimeSlots.filter(slot => 
        !existingAppointments.includes(slot.value)
    );
    
    // Limpiar y repoblar selector
    const currentValue = horaSelect.value;
    horaSelect.innerHTML = '<option value="">-- Seleccionar hora --</option>';
    
    availableSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot.value;
        option.textContent = slot.label;
        horaSelect.appendChild(option);
    });
    
    // Si había un horario ocupado seleccionado, mostrarlo como no disponible
    if (currentValue && existingAppointments.includes(currentValue)) {
        const busyOption = document.createElement('option');
        busyOption.value = currentValue;
        busyOption.textContent = `${currentValue} (Ocupado)`;
        busyOption.disabled = true;
        busyOption.style.color = '#dc3545';
        horaSelect.appendChild(busyOption);
        horaSelect.value = currentValue;
    }
    
    // Mostrar contador de horarios disponibles
    const availableCount = availableSlots.length;
    const totalCount = baseTimeSlots.length;
    console.log(`Horarios disponibles para ${selectedDate}: ${availableCount}/${totalCount}`);
    
    // Actualizar indicador visual de disponibilidad
    const availabilityInfo = document.getElementById('time-availability-info');
    const availabilityCount = document.getElementById('available-slots-count');
    
    if (availabilityInfo && availabilityCount) {
        if (availableCount > 0) {
            availabilityCount.textContent = `✅ ${availableCount} de ${totalCount} horarios disponibles`;
            availabilityInfo.style.display = 'block';
            availabilityInfo.style.backgroundColor = availableCount > totalCount * 0.5 ? '#e8f5e8' : '#fff3cd';
            availabilityInfo.style.borderColor = availableCount > totalCount * 0.5 ? '#c3e6cb' : '#ffeaa7';
            availabilityInfo.style.color = availableCount > totalCount * 0.5 ? '#155724' : '#856404';
        } else {
            availabilityCount.textContent = '❌ No hay horarios disponibles para esta fecha';
            availabilityInfo.style.display = 'block';
            availabilityInfo.style.backgroundColor = '#f8d7da';
            availabilityInfo.style.borderColor = '#f5c6cb';
            availabilityInfo.style.color = '#721c24';
        }
    }
}

// Sistema dinámico de productos y descuentos
let selectedProducts = [];
let currentSubtotal = 0;
let currentDiscount = 0;

function initializeDynamicSystem() {
    const articuloSelect = document.getElementById('m-articulo');
    const categoriaSelect = document.getElementById('m-categoria');
    const addProductBtn = document.getElementById('add-product-btn');
    const discountType = document.getElementById('discount-type');
    const discountValue = document.getElementById('discount-value');
    const discountReason = document.getElementById('discount-reason');
    const clienteInput = document.getElementById('m-cliente');

    // Listener para cambio de categoría (servicio/curso)
    if (categoriaSelect) {
        categoriaSelect.addEventListener('change', function() {
            populateArticuloDropdown(this.value);
        });
    }

    // Botón para agregar productos
    if (addProductBtn) {
        addProductBtn.addEventListener('click', addCurrentProduct);
    }

    // Sistema de descuentos colapsable
    const discountToggle = document.getElementById('discount-toggle');
    const discountContainer = document.getElementById('discount-container');
    const discountSymbol = document.getElementById('discount-symbol');
    
    if (discountToggle && discountContainer) {
        discountToggle.addEventListener('change', function() {
            if (this.checked) {
                discountContainer.style.display = 'block';
                // Habilitar campos cuando se abre la sección
                if (discountType.value) {
                    discountValue.disabled = false;
                    discountReason.disabled = false;
                }
            } else {
                discountContainer.style.display = 'none';
                // Limpiar y deshabilitar campos cuando se cierra
                discountType.value = '';
                discountValue.value = '';
                discountReason.value = '';
                discountValue.disabled = true;
                discountReason.disabled = true;
                calculateTotals();
            }
        });
    }

    if (discountType) {
        discountType.addEventListener('change', function() {
            const isDiscountSelected = this.value !== '';
            discountValue.disabled = !isDiscountSelected;
            discountReason.disabled = !isDiscountSelected;
            
            // Actualizar símbolo según el tipo
            if (discountSymbol) {
                if (this.value === 'percentage') {
                    discountSymbol.textContent = '%';
                } else if (this.value === 'amount') {
                    discountSymbol.textContent = '$';
                } else if (this.value === 'anticipo') {
                    discountSymbol.textContent = '💰';
                } else if (this.value === 'warrior') {
                    discountSymbol.textContent = '🎗️';
                } else {
                    discountSymbol.textContent = '%';
                }
            }
            
            // Manejo especial para anticipos
            if (this.value === 'anticipo') {
                showAvailableAnticipos();
            } else if (!isDiscountSelected) {
                discountValue.value = '';
                discountReason.value = '';
            }
            calculateTotals();
        });
    }

    if (discountValue) {
        discountValue.addEventListener('input', calculateTotals);
    }

    // Detección automática de pacientes oncológicos para descuento Warrior
    if (clienteInput) {
        clienteInput.addEventListener('blur', function() {
            const clienteNombre = this.value.trim();
            if (clienteNombre) {
                const client = clients.find(c => c.nombre.toLowerCase() === clienteNombre.toLowerCase());
                if (client && client.esOncologico) {
                    // Activar automáticamente el descuento Warrior
                    activateWarriorDiscount();
                }
                // Cargar anticipos disponibles del cliente
                loadClientAnticipos(clienteNombre);
            } else {
                // Si no hay cliente, ocultar anticipos
                document.getElementById('anticipos-section').style.display = 'none';
            }
        });
    }
}

function activateWarriorDiscount() {
    const discountToggle = document.getElementById('discount-toggle');
    const discountContainer = document.getElementById('discount-container');
    const discountType = document.getElementById('discount-type');
    const discountValue = document.getElementById('discount-value');
    const discountReason = document.getElementById('discount-reason');

    // Activar la sección de descuentos
    if (discountToggle && !discountToggle.checked) {
        discountToggle.checked = true;
        if (discountContainer) {
            discountContainer.style.display = 'block';
        }
    }

    // Seleccionar descuento Warrior
    if (discountType) {
        discountType.value = 'warrior';
        discountType.dispatchEvent(new Event('change'));
    }

    // Establecer valores automáticamente
    if (discountValue) {
        discountValue.value = 100;
        discountValue.disabled = true;
    }

    if (discountReason) {
        discountReason.value = 'Paciente Oncológico';
        discountReason.disabled = true;
    }

    // Calcular totales
    calculateTotals();
}

function showDynamicSections() {
    // Show the product selection area and totals
    const selectedProducts = document.getElementById('selected-products');
    const totalsSection = document.querySelector('.totals-section');
    
    if (selectedProducts) selectedProducts.style.display = 'block';
    if (totalsSection) totalsSection.style.display = 'block';
}

function hideDynamicSections() {
    const selectedProductsEl = document.getElementById('selected-products');
    const totalsSection = document.querySelector('.totals-section');
    
    if (selectedProductsEl) selectedProductsEl.style.display = 'none';
    if (totalsSection) totalsSection.style.display = 'none';
    
    selectedProducts = [];
    renderSelectedProducts();
}

function addCurrentProduct() {
    const articuloSelect = document.getElementById('m-articulo');
    const categoriaSelect = document.getElementById('m-categoria');
    const quantityInput = document.getElementById('product-quantity');

    if (!categoriaSelect.value) {
        alert('Selecciona el tipo (servicio, curso o anticipo) primero');
        return;
    }

    if (!articuloSelect.value) {
        alert('Selecciona un producto primero');
        return;
    }

    const quantity = parseInt(quantityInput.value) || 1;
    
    // Manejar anticipos de forma especial
    if (categoriaSelect.value === 'anticipo') {
        handleAnticipoSelection();
        return;
    } else {
        // Manejar servicios y cursos como antes
        const productData = products.find(p => p.name === articuloSelect.value && p.type === categoriaSelect.value);
        
        if (productData) {
            const existingIndex = selectedProducts.findIndex(p => p.name === productData.name);
            
            if (existingIndex >= 0) {
                selectedProducts[existingIndex].quantity += quantity;
            } else {
                selectedProducts.push({
                    id: productData.id,
                    name: productData.name,
                    price: parseFloat(productData.price),
                    quantity: quantity,
                    type: categoriaSelect.value
                });
            }
        } else {
            alert('Producto no encontrado');
            return;
        }
    }
    
    renderSelectedProducts();
    calculateTotals();
    quantityInput.value = 1;
    articuloSelect.value = '';

    // Mostrar descuento inmediatamente
    showDiscountSection();
}

function removeProduct(productName) {
    selectedProducts = selectedProducts.filter(p => p.name !== productName);
    renderSelectedProducts();
    calculateTotals();
}

function renderSelectedProducts() {
    const container = document.getElementById('selected-products');
    if (!container) return;

    if (selectedProducts.length === 0) {
        container.innerHTML = '<p style="color: #6c757d; font-style: italic;">No hay productos seleccionados</p>';
        return;
    }

    const html = selectedProducts.map(product => {
        // Para anticipos no agregar el tipo en small porque ya está en el nombre
        const typeLabel = product.type === 'anticipo' ? '' : ` <small>(${product.type === 'service' ? 'Servicio' : 'Curso'})</small>`;
        
        return `
            <div class="product-item">
                <span class="product-item-name">${escapeHTML(product.name)}${typeLabel}</span>
                <span class="product-item-quantity">${product.quantity}x</span>
                <span class="product-item-price">$${(product.price * product.quantity).toFixed(2)}</span>
                <button type="button" class="btn-remove" onclick="removeProduct('${escapeHTML(product.name)}')">×</button>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function showDiscountSection() {
    const discountSection = document.querySelector('.discount-section');
    if (discountSection && selectedProducts.length > 0) {
        discountSection.style.display = 'block';
        discountSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

async function loadClientAnticipos(clienteNombre) {
    if (!clienteNombre) {
        document.getElementById('anticipos-section').style.display = 'none';
        return;
    }
    
    try {
        // Buscar anticipos en el historial de movimientos
        const response = await fetch('/api/movements');
        const movements = await response.json();
        
        // Filtrar anticipos del cliente que no han sido aplicados
        const anticipos = movements.filter(mov => 
            mov.concepto && mov.concepto.includes('Anticipo') && 
            mov.client && mov.client.nombre.toLowerCase() === clienteNombre.toLowerCase() &&
            !mov.aplicado // Assuming we'll add an 'aplicado' field to track used anticipos
        );
        
        const anticiposSection = document.getElementById('anticipos-section');
        const anticiposContainer = document.getElementById('anticipos-disponibles');
        
        if (anticipos.length > 0) {
            anticiposSection.style.display = 'block';
            anticiposContainer.innerHTML = '';
            
            anticipos.forEach(anticipo => {
                const anticipoItem = document.createElement('div');
                anticipoItem.className = 'anticipo-item';
                anticipoItem.innerHTML = `
                    <div class="anticipo-info">
                        <div class="anticipo-monto">$${parseFloat(anticipo.monto).toFixed(2)}</div>
                        <div class="anticipo-fecha">Fecha: ${new Date(anticipo.fecha).toLocaleDateString()}</div>
                        <div class="anticipo-folio">Folio: ${anticipo.folio}</div>
                    </div>
                    <div class="anticipo-actions">
                        <button class="btn-aplicar-anticipo" onclick="aplicarAnticipo('${anticipo.id}', ${anticipo.monto})">
                            Aplicar
                        </button>
                    </div>
                `;
                anticiposContainer.appendChild(anticipoItem);
            });
        } else {
            anticiposSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading anticipos:', error);
        document.getElementById('anticipos-section').style.display = 'none';
    }
}

function aplicarAnticipo(anticipoId, monto) {
    // Agregar el anticipo como un "descuento" o crédito
    const discountToggle = document.getElementById('discount-toggle');
    const discountContainer = document.getElementById('discount-container');
    const discountType = document.getElementById('discount-type');
    const discountValue = document.getElementById('discount-value');
    const discountReason = document.getElementById('discount-reason');
    
    // Activar la sección de descuentos
    if (discountToggle && !discountToggle.checked) {
        discountToggle.checked = true;
        if (discountContainer) {
            discountContainer.style.display = 'block';
        }
    }
    
    // Configurar como descuento de cantidad fija
    if (discountType) {
        discountType.value = 'amount';
        discountType.dispatchEvent(new Event('change'));
    }
    
    // Establecer el monto del anticipo
    if (discountValue) {
        discountValue.value = parseFloat(monto).toFixed(2);
        discountValue.disabled = true;
    }
    
    if (discountReason) {
        discountReason.value = `Anticipo aplicado (ID: ${anticipoId})`;
        discountReason.disabled = true;
    }
    
    // Calcular totales
    calculateTotals();
    
    // Ocultar la sección de anticipos para evitar aplicar múltiples
    document.getElementById('anticipos-section').style.display = 'none';
    
    alert('Anticipo aplicado correctamente');
}

async function showAvailableAnticipos() {
    const clienteInput = document.getElementById('m-cliente');
    const clienteNombre = clienteInput.value.trim();
    
    if (!clienteNombre) {
        alert('Por favor selecciona un cliente primero para ver sus anticipos disponibles.');
        document.getElementById('discount-type').value = '';
        return;
    }
    
    try {
        // Obtener anticipos disponibles del cliente
        const response = await fetch('/api/movements');
        const movements = await response.json();
        
        // Filtrar anticipos del cliente que no han sido aplicados
        const anticipos = movements.filter(mov => {
            const client = clients.find(c => c.id === mov.clienteId);
            return client && 
                   client.nombre.toLowerCase() === clienteNombre.toLowerCase() &&
                   mov.concepto && 
                   mov.concepto.includes('Anticipo') && 
                   !mov.aplicado; // Asumir que agregaremos un campo 'aplicado'
        });
        
        if (anticipos.length === 0) {
            // Permitir ingresar anticipo manualmente si no hay registrados
            const manualAnticipo = confirm(`No hay anticipos registrados para "${clienteNombre}".\n\n¿La cliente dio un anticipo directamente que no está en el sistema?\n\nHaz clic en OK para ingresar el anticipo manualmente.`);
            
            if (!manualAnticipo) {
                document.getElementById('discount-type').value = '';
                return;
            }
            
            // Mostrar el checkbox de confirmación
            mostrarConfirmacionAnticipoManual(clienteNombre);
            return;
        }
        
        // Crear lista de anticipos para mostrar al usuario
        let anticiposList = 'Anticipos disponibles:\n\n';
        anticipos.forEach((anticipo, index) => {
            anticiposList += `${index + 1}. $${parseFloat(anticipo.monto).toFixed(2)} - Folio: ${anticipo.folio}\n`;
        });
        
        const selectedIndex = prompt(anticiposList + '\nEscribe el número del anticipo que deseas aplicar:');
        
        if (selectedIndex === null) {
            document.getElementById('discount-type').value = '';
            return;
        }
        
        const anticipoIndex = parseInt(selectedIndex) - 1;
        
        if (isNaN(anticipoIndex) || anticipoIndex < 0 || anticipoIndex >= anticipos.length) {
            alert('Selección inválida');
            document.getElementById('discount-type').value = '';
            return;
        }
        
        const selectedAnticipo = anticipos[anticipoIndex];
        
        // Aplicar el anticipo como descuento
        const discountValue = document.getElementById('discount-value');
        const discountReason = document.getElementById('discount-reason');
        
        if (discountValue) {
            discountValue.value = parseFloat(selectedAnticipo.monto).toFixed(2);
            discountValue.disabled = true;
        }
        
        if (discountReason) {
            discountReason.value = `Anticipo aplicado - Folio: ${selectedAnticipo.folio}`;
            discountReason.disabled = true;
        }
        
        // Guardar referencia del anticipo para el ticket
        window.appliedAnticipo = {
            id: selectedAnticipo.id,
            folio: selectedAnticipo.folio,
            monto: selectedAnticipo.monto
        };
        
        calculateTotals();
        
    } catch (error) {
        console.error('Error loading anticipos:', error);
        alert('Error al cargar los anticipos del cliente');
        document.getElementById('discount-type').value = '';
    }
}

function aplicarAnticipoManual(monto, comentario, clienteNombre) {
    // Aplicar el anticipo manual como descuento
    const discountType = document.getElementById('discount-type');
    const discountValue = document.getElementById('discount-value');
    const discountReason = document.getElementById('discount-reason');
    
    if (discountValue) {
        discountValue.value = monto.toFixed(2);
        discountValue.disabled = true;
    }
    
    if (discountReason) {
        discountReason.value = `Anticipo manual - ${comentario}`;
        discountReason.disabled = true;
    }
    
    // Guardar referencia del anticipo manual para el ticket
    window.appliedAnticipo = {
        id: 'manual_' + Date.now(),
        folio: 'MANUAL',
        monto: monto,
        comentario: comentario,
        cliente: clienteNombre,
        manual: true
    };
    
    calculateTotals();
    alert(`Anticipo manual de $${monto.toFixed(2)} aplicado correctamente para ${clienteNombre}`);
}

function mostrarConfirmacionAnticipoManual(clienteNombre) {
    // Mostrar el checkbox de confirmación
    const confirmationDiv = document.getElementById('anticipo-manual-confirmation');
    const checkbox = document.getElementById('confirm-anticipo-manual');
    
    confirmationDiv.style.display = 'block';
    checkbox.checked = false;
    
    // Crear un botón temporal para proceder
    const existingButton = document.getElementById('btn-proceder-anticipo-manual');
    if (existingButton) {
        existingButton.remove();
    }
    
    const proceedButton = document.createElement('button');
    proceedButton.id = 'btn-proceder-anticipo-manual';
    proceedButton.textContent = 'Proceder con Anticipo Manual';
    proceedButton.className = 'modern-btn btn-primary';
    proceedButton.style.marginTop = '10px';
    proceedButton.disabled = true;
    
    // Habilitar botón solo cuando checkbox esté marcado
    checkbox.addEventListener('change', function() {
        proceedButton.disabled = !this.checked;
    });
    
    proceedButton.addEventListener('click', function() {
        if (checkbox.checked) {
            procederConAnticipoManual(clienteNombre);
        }
    });
    
    confirmationDiv.appendChild(proceedButton);
}

function procederConAnticipoManual(clienteNombre) {
    // Permitir entrada manual del anticipo
    const montoManual = prompt('Ingresa el monto del anticipo que dio la cliente:');
    
    if (!montoManual || isNaN(parseFloat(montoManual)) || parseFloat(montoManual) <= 0) {
        alert('Monto inválido. Operación cancelada.');
        ocultarConfirmacionAnticipoManual();
        document.getElementById('discount-type').value = '';
        return;
    }
    
    // Obtener comentario del campo en el formulario en lugar de usar prompt
    const commentInput = document.getElementById('anticipo-comment');
    const comentario = commentInput && commentInput.value.trim() 
        ? commentInput.value.trim() 
        : 'Anticipo manual - no registrado previamente';
    
    // Ocultar la confirmación
    ocultarConfirmacionAnticipoManual();
    
    // Aplicar el anticipo manual
    aplicarAnticipoManual(parseFloat(montoManual), comentario, clienteNombre);
}

function ocultarConfirmacionAnticipoManual() {
    const confirmationDiv = document.getElementById('anticipo-manual-confirmation');
    const existingButton = document.getElementById('btn-proceder-anticipo-manual');
    
    confirmationDiv.style.display = 'none';
    if (existingButton) {
        existingButton.remove();
    }
}

function calculateTotals() {
    currentSubtotal = selectedProducts.reduce((sum, product) => {
        return sum + (product.price * product.quantity);
    }, 0);

    // Calcular descuento
    const discountType = document.getElementById('discount-type')?.value;
    const discountValue = parseFloat(document.getElementById('discount-value')?.value) || 0;

    if (discountType === 'percentage') {
        currentDiscount = currentSubtotal * (discountValue / 100);
    } else if (discountType === 'amount') {
        currentDiscount = Math.min(discountValue, currentSubtotal);
    } else if (discountType === 'anticipo') {
        currentDiscount = Math.min(discountValue, currentSubtotal);
    } else if (discountType === 'warrior') {
        currentDiscount = currentSubtotal; // 100% de descuento
    } else {
        currentDiscount = 0;
    }

    const total = currentSubtotal - currentDiscount;

    // Actualizar displays principales
    const subtotalDisplay = document.getElementById('subtotal-display');
    const discountDisplay = document.getElementById('discount-display');
    const discountAmountDisplay = document.getElementById('discount-amount-display');
    const totalDisplay = document.getElementById('total-display');

    if (subtotalDisplay) subtotalDisplay.textContent = `$${currentSubtotal.toFixed(2)}`;
    if (totalDisplay) totalDisplay.textContent = `$${total.toFixed(2)}`;
    
    if (currentDiscount > 0) {
        if (discountDisplay) discountDisplay.style.display = 'flex';
        if (discountAmountDisplay) discountAmountDisplay.textContent = `-$${currentDiscount.toFixed(2)}`;
    } else {
        if (discountDisplay) discountDisplay.style.display = 'none';
    }

    // Actualizar preview del descuento en la sección colapsable
    const discountPreview = document.getElementById('discount-preview');
    const discountPreviewAmount = document.getElementById('discount-preview-amount');
    
    if (discountPreview && discountPreviewAmount) {
        if (currentDiscount > 0) {
            discountPreview.style.display = 'block';
            discountPreviewAmount.textContent = `-$${currentDiscount.toFixed(2)}`;
        } else {
            discountPreview.style.display = 'none';
        }
    }

    // Actualizar el campo de monto original
    const montoInput = document.getElementById('m-monto');
    if (montoInput) montoInput.value = total.toFixed(2);
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    const day = String(adjustedDate.getDate()).padStart(2, '0');
    const month = String(adjustedDate.getMonth() + 1).padStart(2, '0');
    const year = adjustedDate.getFullYear();
    return `${day}/${month}/${year}`;
}

const APP_VERSION = '1.4.0';

// --- DOM ELEMENTS ---
const formSettings = document.getElementById('formSettings');
const formMove = document.getElementById('formMove');
const tblMovesBody = document.getElementById('tblMoves')?.querySelector('tbody');
const btnExport = document.getElementById('btnExport');
const btnTestTicket = document.getElementById('btnTestTicket');
const formClient = document.getElementById('formClient');
const tblClientsBody = document.getElementById('tblClients')?.querySelector('tbody');
const clientDatalist = document.getElementById('client-list');
const formCredentials = document.getElementById('formCredentials');
const formAddUser = document.getElementById('formAddUser');
  const tblUsersBody = document.getElementById('tblUsers')?.querySelector('tbody');
  const tblServicesBody = document.getElementById('tblServices')?.querySelector('tbody');
  const tblCoursesBody = document.getElementById('tblCourses')?.querySelector('tbody');
  const formProduct = document.getElementById('formProduct');
const appointmentsList = document.getElementById('upcoming-appointments-list');

let isDashboardLoading = false;

// --- LÓGICA DE NEGOCIO ---

async function loadDashboardData() {
  if (isDashboardLoading) {
    return;
  }
  isDashboardLoading = true;

  try {
    const response = await fetch('/api/dashboard');
    if (!response.ok) {
      if (response.status === 403) {
        console.warn('Acceso al dashboard denegado.');
      } else {
        throw new Error('Falló la carga de datos del dashboard');
      }
      return;
    }
    const data = await response.json();

    const dashboardTab = document.getElementById('tab-dashboard');
    if (!dashboardTab.classList.contains('active')) {
      return;
    }

    document.getElementById('stat-total-income').textContent = `${Number(data.totalIncome || 0).toFixed(2)}`;
    document.getElementById('stat-total-movements').textContent = data.totalMovements || 0;

    if (incomeChart) {
      incomeChart.data.labels = data.incomeByService.map(item => item.tipo);
      incomeChart.data.datasets[0].data = data.incomeByService.map(item => item.total);
      incomeChart.update('none');
    }
    
    if (paymentMethodChart) {
      paymentMethodChart.data.labels = data.incomeByPaymentMethod.map(item => item.metodo);
      paymentMethodChart.data.datasets[0].data = data.incomeByPaymentMethod.map(item => item.total);
      paymentMethodChart.update('none');
    }

    if (appointmentsList) {
      appointmentsList.innerHTML = '';
      if (data.upcomingAppointments.length > 0) {
        data.upcomingAppointments.forEach(appt => {
          const item = document.createElement('div');
          item.className = 'appointment-item';
          item.innerHTML = `
            <a href="#" data-id="${appt.id}" data-action="reprint">${appt.clienteNombre}</a>
            <span class="date">${formatDate(appt.fechaCita)} - ${appt.horaCita}</span>
          `;
          appointmentsList.appendChild(item);
        });
      } else {
        appointmentsList.innerHTML = '<p>No hay citas próximas.</p>';
      }
    }
    
  } catch (error) {
    console.error('Error al cargar el dashboard:', error);
  } finally {
    isDashboardLoading = false;
  }
}

function generateFolio() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function addMovement(mov) {
  try {
    const response = await fetch('/api/movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movement: mov })
    });
    if (response.ok) {
      movements.unshift(mov);
      renderTable();
    } else {
      throw new Error('Failed to save movement');
    }
  } catch (error) {
    console.error('Error saving movement:', error);
    alert('Error al guardar el movimiento');
  }
}

async function deleteMovement(id) {
  if (confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
    try {
      const response = await fetch(`/api/movements/${id}`, { method: 'DELETE' });
      if (response.ok) {
        movements = movements.filter(m => m.id !== id);
        renderTable();
      } else {
        throw new Error('Failed to delete movement');
      }
    } catch (error) {
      console.error('Error deleting movement:', error);
      alert('Error al eliminar el movimiento');
    }
  }
}

async function saveClient(clientData) {
  let clientToSave;
  let isUpdate = false;

  if (clientData) {
    clientToSave = clientData;
  } else {
    isUpdate = !!document.getElementById('c-id').value;
    const id = isUpdate ? document.getElementById('c-id').value : crypto.randomUUID();

    clientToSave = {
      id: id,
      nombre: document.getElementById('c-nombre').value,
      telefono: document.getElementById('c-telefono').value,
      genero: document.getElementById('c-genero').value,
      cumpleaños: document.getElementById('c-cumple').value,
      consentimiento: document.getElementById('c-consent').checked,
      esOncologico: document.getElementById('c-pacienteOncologico').checked,
      oncologoAprueba: document.getElementById('c-oncologoAprueba').checked,
      nombreMedico: document.getElementById('c-nombreMedico').value,
      telefonoMedico: document.getElementById('c-telefonoMedico').value,
      cedulaMedico: document.getElementById('c-cedulaMedico').value,
      pruebaAprobacion: document.getElementById('c-pruebaAprobacion').checked,
    };
  }

  try {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: clientToSave })
    });
    if (!response.ok) {
      throw new Error('Failed to save client');
    }
  } catch (error) {
    console.error('Error saving client:', error);
    alert('Error al guardar el cliente');
    return;
  }

  if (isUpdate) {
    const index = clients.findIndex(c => c.id === clientToSave.id);
    if (index > -1) clients[index] = clientToSave;
  } else {
    clients.unshift(clientToSave);
  }
  
  renderClientsTable();
  updateClientDatalist();

  if (!clientData) {
    document.getElementById('formClient').reset();
    document.getElementById('c-id').value = '';
    document.getElementById('oncologico-fields').classList.add('hidden');
  }
}

async function deleteClient(id) {
  if (confirm('¿Estás seguro de que quieres eliminar este cliente? Se conservarán sus recibos históricos.')) {
    try {
      const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (response.ok) {
        clients = clients.filter(c => c.id !== id);
        renderClientsTable();
        updateClientDatalist();
        clearClientRecord();
      } else {
        throw new Error('Failed to delete client');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar el cliente');
    }
  }
}

function exportCSV() {
  const headers = 'folio,fechaISO,cliente,tipo,monto,metodo,concepto,staff,notas,fechaCita,horaCita';
  const rows = movements.map(m => {
    const client = clients.find(c => c.id === m.clienteId);
    return [
      m.folio, m.fechaISO, client ? client.nombre : 'N/A', m.tipo, m.monto,
      m.metodo || '', m.concepto || '', m.staff || '', m.notas || '',
      m.fechaCita || '', m.horaCita || ''
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });
  
  const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'movimientos.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- RENDERIZADO ---

function renderSettings() {
  document.getElementById('s-negocio').value = settings.negocio || '';
  document.getElementById('s-tagline').value = settings.tagline || '';
  document.getElementById('s-calle').value = settings.calle || '';
  document.getElementById('s-colonia-cp').value = settings.colonia && settings.cp ? `${settings.colonia}, ${settings.cp}` : '';
  document.getElementById('s-rfc').value = settings.rfc || '';
  document.getElementById('s-tel').value = settings.tel || '';
  document.getElementById('s-leyenda').value = settings.leyenda || '';
  document.getElementById('s-folioPrefix').value = settings.folioPrefix || '';
}

function renderTable() {
  if (!tblMovesBody) return;
  tblMovesBody.innerHTML = '';
  movements.forEach(mov => {
    const client = clients.find(c => c.id === mov.clienteId);
    const tr = tblMovesBody.insertRow();
    
    const tipoServicio = mov.subtipo ? `${escapeHTML(mov.tipo)} (${escapeHTML(mov.subtipo)})` : escapeHTML(mov.tipo);

    const folioCell = tr.insertCell();
    const folioLink = document.createElement('a');
    folioLink.href = '#';
    folioLink.className = 'action-btn';
    folioLink.dataset.id = mov.id;
    folioLink.dataset.action = 'reprint';
    folioLink.textContent = mov.folio;
    folioCell.appendChild(folioLink);

    tr.insertCell().textContent = formatDate(mov.fechaISO);
    tr.insertCell().textContent = `${formatDate(mov.fechaCita)} ${mov.horaCita || ''}`.trim();
    tr.insertCell().textContent = client ? escapeHTML(client.nombre) : 'Cliente Eliminado';
    tr.insertCell().textContent = tipoServicio;
    tr.insertCell().textContent = Number(mov.monto).toFixed(2);

    const actionsCell = tr.insertCell();
    
    // Botón de solicitar cancelación para todos los usuarios
    const cancelRequestButton = document.createElement('button');
    cancelRequestButton.className = 'action-btn btn-warning';
    cancelRequestButton.dataset.id = mov.id;
    cancelRequestButton.dataset.action = 'request-cancel';
    cancelRequestButton.textContent = 'Solicitar Cancelación';
    cancelRequestButton.style.marginRight = '5px';
    actionsCell.appendChild(cancelRequestButton);
    
    // Solo mostrar botón de eliminar para administradores
    if (currentUser && currentUser.role === 'admin') {
      const deleteButton = document.createElement('button');
      deleteButton.className = 'action-btn btn-danger';
      deleteButton.dataset.id = mov.id;
      deleteButton.dataset.action = 'delete';
      deleteButton.textContent = 'Eliminar';
      actionsCell.appendChild(deleteButton);
    }
  });
}

function renderClientsTable(clientList = clients) {
  if (!tblClientsBody) return;
  tblClientsBody.innerHTML = '';
  clientList.forEach(c => {
    const tr = tblClientsBody.insertRow();
    tr.dataset.id = c.id;
    if (c.id === currentClientId) {
        tr.classList.add('selected');
    }
    tr.insertCell().textContent = escapeHTML(c.nombre);
    tr.insertCell().textContent = escapeHTML(c.telefono || '');
  });
}

function renderUsersTable() {
    if (!tblUsersBody) return;
    tblUsersBody.innerHTML = '';
    users.forEach(u => {
        const tr = tblUsersBody.insertRow();
        tr.insertCell().textContent = escapeHTML(u.name);
        tr.insertCell().textContent = escapeHTML(u.username);
        tr.insertCell().textContent = u.role === 'admin' ? 'Administrador' : 'Usuario';

        const actionsCell = tr.insertCell();
        const editButton = document.createElement('button');
        editButton.className = 'action-btn';
        editButton.dataset.id = u.id;
        editButton.dataset.action = 'edit-user';
        editButton.textContent = 'Editar';
        actionsCell.appendChild(editButton);

        if (u.id !== currentUser.id) {
            const deleteButton = document.createElement('button');
            deleteButton.className = 'action-btn';
            deleteButton.dataset.id = u.id;
            deleteButton.dataset.action = 'delete-user';
            deleteButton.textContent = 'Eliminar';
            actionsCell.appendChild(deleteButton);
        }
    });
}

function renderProductTables() {
    const tblServicesBody = document.getElementById('tblServices')?.querySelector('tbody');
    const tblCoursesBody = document.getElementById('tblCourses')?.querySelector('tbody');

    if (!tblServicesBody || !tblCoursesBody) return;

    tblServicesBody.innerHTML = '';
    tblCoursesBody.innerHTML = '';

    products.forEach(p => {
        const tableBody = p.type === 'service' ? tblServicesBody : tblCoursesBody;
        const tr = tableBody.insertRow();
        tr.insertCell().textContent = escapeHTML(p.name);
        tr.insertCell().textContent = Number(p.price || 0).toFixed(2);

        const actionsCell = tr.insertCell();
        const editButton = document.createElement('button');
        editButton.className = 'action-btn';
        editButton.dataset.id = p.id;
        editButton.dataset.action = 'edit-product';
        editButton.textContent = 'Editar';
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-btn';
        deleteButton.dataset.id = p.id;
        deleteButton.dataset.action = 'delete-product';
        deleteButton.textContent = 'Eliminar';
        actionsCell.appendChild(deleteButton);
    });
}

function updateClientDatalist() {
  if (!clientDatalist) return;
  clientDatalist.innerHTML = '';
  clients.forEach(c => {
    const option = document.createElement('option');
    option.value = c.nombre;
    clientDatalist.appendChild(option);
  });
}

function populateArticuloDropdown(category) {
    const articuloSelect = document.getElementById('m-articulo');
    if (!articuloSelect) return;
    
    // Clear existing options except the first default option
    if (category) {
        let placeholder = '';
        if (category === 'service') placeholder = 'servicio';
        else if (category === 'course') placeholder = 'curso';
        else if (category === 'anticipo') placeholder = 'anticipo';
        
        articuloSelect.innerHTML = `<option value="">-- Seleccionar ${placeholder} --</option>`;
        
        if (category === 'anticipo') {
            // Para anticipos, solo una opción para ingresar monto
            const option = document.createElement('option');
            option.value = 'Anticipo';
            option.textContent = 'Anticipo (Monto personalizado)';
            articuloSelect.appendChild(option);
        } else {
            const items = products.filter(p => p.type === category);
            items.forEach(i => {
                const option = document.createElement('option');
                option.value = i.name;
                option.textContent = `${i.name} - $${parseFloat(i.price).toFixed(2)}`;
                articuloSelect.appendChild(option);
            });
        }
    } else {
        articuloSelect.innerHTML = '<option value="">-- Primero seleccione tipo --</option>';
    }
}

// --- MANEJADORES DE EVENTOS ---

async function handleSaveSettings(e) {
  e.preventDefault();
  settings.negocio = document.getElementById('s-negocio').value;
  settings.tagline = document.getElementById('s-tagline').value;
  settings.calle = document.getElementById('s-calle').value;
  
  const coloniaCp = document.getElementById('s-colonia-cp').value.split(',');
  settings.colonia = coloniaCp[0]?.trim() || '';
  settings.cp = coloniaCp[1]?.trim() || '';

  settings.rfc = document.getElementById('s-rfc').value;
  settings.tel = document.getElementById('s-tel').value;
  settings.leyenda = document.getElementById('s-leyenda').value;
  settings.folioPrefix = document.getElementById('s-folioPrefix').value;
  
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings })
    });
    if (response.ok) {
      alert('Configuración guardada.');
    } else {
      throw new Error('Failed to save settings');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Error al guardar la configuración');
  }
}

async function handleSaveCredentials(e) {
    e.preventDefault();
    const name = document.getElementById('s-name').value;
    const username = document.getElementById('s-username').value;
    const password = document.getElementById('s-password').value;

    const body = { username, name };
    if (password) {
        body.password = password;
    }

    try {
        const response = await fetch('/api/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            alert('Credenciales actualizadas.');
            currentUser.name = name;
            currentUser.username = username;
            document.getElementById('s-password').value = '';
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        alert('Error de conexión al guardar credenciales.');
    }
}

async function handleAddOrUpdateUser(e) {
    e.preventDefault();
    const id = document.getElementById('u-id').value;
    const name = document.getElementById('u-name').value;
    const username = document.getElementById('u-username').value;
    const password = document.getElementById('u-password').value;
    const role = document.getElementById('u-role').value;

    const isUpdate = !!id;
    const url = isUpdate ? `/api/users/${id}` : '/api/users';
    const method = isUpdate ? 'PUT' : 'POST';

    const body = { name, username, role };
    if (password || !isUpdate) {
        if (!password && !isUpdate) {
            alert('La contraseña es obligatoria para nuevos usuarios.');
            return;
        }
        body.password = password;
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Usuario ${isUpdate ? 'actualizado' : 'creado'} exitosamente.`);
            if (isUpdate) {
                const index = users.findIndex(u => u.id === parseInt(id));
                if (index > -1) {
                    users[index] = { ...users[index], name, username, role };
                }
            } else {
                users.push(result);
            }
            renderUsersTable();
            formAddUser.reset();
            document.getElementById('u-id').value = '';
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert('Error de conexión al guardar el usuario.');
    }
}

async function deleteUser(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
        try {
            const response = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (response.ok) {
                users = users.filter(u => u.id !== id);
                renderUsersTable();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            alert('Error de conexión al eliminar usuario.');
        }
    }
}

async function handleAddOrUpdateProduct(e) {
    e.preventDefault();
    const id = document.getElementById('p-id').value;
    const name = document.getElementById('p-name').value;
    const type = document.getElementById('p-type').value;
    const price = document.getElementById('p-price').value;

    const isUpdate = !!id;
    const url = isUpdate ? `/api/products/${id}` : '/api/products';
    const method = isUpdate ? 'PUT' : 'POST';

    const body = { name, type, price };

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (response.ok) {
            alert(`Producto ${isUpdate ? 'actualizado' : 'creado'} exitosamente.`);
            if (isUpdate) {
                const index = products.findIndex(p => p.id === parseInt(id));
                if (index > -1) {
                    products[index] = { ...products[index], name, type, price };
                }
            } else {
                products.push(result);
            }
            renderProductTables();
            updateUnifiedProductsAfterChange(); // Actualizar tabla unificada
            formProduct.reset();
            document.getElementById('p-id').value = '';
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert('Error de conexión al guardar el producto.');
    }
}

async function deleteProduct(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        try {
            const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            if (response.ok) {
                products = products.filter(p => p.id !== id);
                renderProductTables();
                updateUnifiedProductsAfterChange(); // Actualizar tabla unificada
            }
        } catch (error) {
            alert('Error de conexión al eliminar el producto.');
        }
    }
}

function showCancellationRequestModal(movementId, movement) {
    const client = clients.find(c => c.id === movement.clienteId);
    const clientName = client ? client.nombre : 'Cliente Eliminado';

    const modalHTML = `
        <div id="cancellation-modal" class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h2>Solicitar Cancelación de Venta</h2>
                <div class="cancellation-info">
                    <p><strong>Folio:</strong> ${escapeHTML(movement.folio)}</p>
                    <p><strong>Cliente:</strong> ${escapeHTML(clientName)}</p>
                    <p><strong>Concepto:</strong> ${escapeHTML(movement.concepto || 'N/A')}</p>
                    <p><strong>Monto:</strong> $${Number(movement.monto).toFixed(2)}</p>
                    <p><strong>Fecha:</strong> ${formatDate(movement.fechaISO)}</p>
                </div>
                <form id="formCancellationRequest">
                    <div class="form-grid-single">
                        <label>Motivo de la cancelación:</label>
                        <textarea id="cancellation-reason" required placeholder="Describe el motivo de la solicitud de cancelación..." rows="4"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-warning">Enviar Solicitud</button>
                        <button type="button" class="btn-secondary modal-cancel">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('cancellation-modal');
    const closeButton = modal.querySelector('.close-button');
    const cancelButton = modal.querySelector('.modal-cancel');
    const form = modal.querySelector('#formCancellationRequest');

    const closeModal = () => modal.remove();

    closeButton.onclick = closeModal;
    cancelButton.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) {
            closeModal();
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const reason = document.getElementById('cancellation-reason').value.trim();
        
        if (!reason) {
            alert('Por favor ingresa un motivo para la cancelación.');
            return;
        }

        try {
            const response = await fetch(`/api/movements/${movementId}/cancel-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Solicitud de cancelación enviada exitosamente. La venta quedará oculta hasta que el administrador revise tu solicitud.');
                closeModal();
                // Refresh movements to hide the temporarily cancelled item
                const movementsResponse = await fetch('/api/movements');
                if (movementsResponse.ok) {
                    movements = await movementsResponse.json();
                    renderTable();
                }
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            alert('Error de conexión al enviar la solicitud.');
        }
    };
}

function showAddCourseModal(clientId) {
    const courses = products.filter(p => p.type === 'course');
    const courseOptions = courses.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');

    const modalHTML = `
        <div id="course-modal" class="modal">
            <div class="modal-content">
                <span class="close-button">&times;</span>
                <h2>Registrar Curso a Cliente</h2>
                <form id="formAddCourseToClient">
                    <div class="form-grid-single">
                        <label>Curso:</label>
                        <select id="course-id" required>${courseOptions}</select>
                        <label>Fecha del Curso:</label>
                        <input type="date" id="course-date" />
                        <label>Score General:</label>
                        <input type="text" id="course-score" />
                        <div class="checkbox-container">
                            <input type="checkbox" id="course-presencial" />
                            <label for="course-presencial">¿Completó curso presencial?</label>
                        </div>
                        <div class="checkbox-container">
                            <input type="checkbox" id="course-online" />
                            <label for="course-online">¿Completó curso online?</label>
                        </div>
                        <div class="checkbox-container">
                            <input type="checkbox" id="course-practicas" />
                            <label for="course-practicas">¿Realizó prácticas?</label>
                        </div>
                        <div class="checkbox-container">
                            <input type="checkbox" id="course-certificacion" />
                            <label for="course-certificacion">¿Obtuvo certificación?</label>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit">Guardar Curso</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('course-modal');
    const closeButton = modal.querySelector('.close-button');
    const form = modal.querySelector('#formAddCourseToClient');

    const closeModal = () => modal.remove();

    closeButton.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) {
            closeModal();
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const courseData = {
            course_id: document.getElementById('course-id').value,
            fecha_curso: document.getElementById('course-date').value,
            score_general: document.getElementById('course-score').value,
            completo_presencial: document.getElementById('course-presencial').checked ? 1 : 0,
            completo_online: document.getElementById('course-online').checked ? 1 : 0,
            realizo_practicas: document.getElementById('course-practicas').checked ? 1 : 0,
            obtuvo_certificacion: document.getElementById('course-certificacion').checked ? 1 : 0,
        };

        try {
            const response = await fetch(`/api/clients/${clientId}/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(courseData)
            });

            if (response.ok) {
                alert('Curso registrado exitosamente.');
                closeModal();
                showClientRecord(clientId);
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            alert('Error de conexión al registrar el curso.');
        }
    };
}


async function handleNewMovement(e) {
  e.preventDefault();
  const form = e.target;
  const monto = parseFloat(document.getElementById('m-monto').value || 0);
  const clienteNombre = document.getElementById('m-cliente').value.trim() || 'Público General';

  if (selectedProducts.length === 0) {
    alert('Por favor selecciona al menos un producto o servicio');
    return;
  }

  // Check if this is an anticipo (doesn't need specific client)
  const isAnticipo = selectedProducts.some(p => p.type === 'anticipo');
  const isAnticipoGeneral = clienteNombre === 'Anticipo General';
  const isPublicoGeneral = clienteNombre === 'Público General';
  
  let client = null;
  if (!isAnticipoGeneral && !isPublicoGeneral) {
    client = clients.find(c => c.nombre.toLowerCase() === clienteNombre.toLowerCase());
    if (!client) {
      if (confirm(`El cliente "${clienteNombre}" no existe. ¿Deseas crearlo?`)) {
      const newClient = {
        id: crypto.randomUUID(),
        nombre: clienteNombre,
        telefono: '',
        cumpleaños: '',
        consentimiento: false
      };
      await saveClient(newClient);
      client = newClient;
      } else {
        return;
      }
    }
  } else if (isPublicoGeneral) {
    // For público general, create a generic client entry
    client = {
      id: 'publico_general',
      nombre: 'Público General',
      telefono: '',
      cumpleaños: '',
      consentimiento: false
    };
  } else {
    // For anticipo general, create a generic client entry
    client = {
      id: 'anticipo_general',
      nombre: 'Anticipo General',
      telefono: '',
      cumpleaños: '',
      consentimiento: false
    };
  }

  // Build concept from selected products
  const concepto = selectedProducts.map(p => `${p.name} (${p.quantity}x)`).join(', ');

  // Obtener información del descuento aplicado
  const discountType = document.getElementById('discount-type')?.value;
  const discountValue = parseFloat(document.getElementById('discount-value')?.value) || 0;
  const discountReason = document.getElementById('discount-reason')?.value || '';
  
  let discountInfo = null;
  if (currentDiscount > 0) {
    discountInfo = {
      type: discountType,
      value: discountValue,
      amount: currentDiscount,
      reason: discountReason,
      percentage: currentSubtotal > 0 ? (currentDiscount / currentSubtotal * 100) : 0
    };
    
    // Si es un anticipo aplicado, incluir información adicional
    if (discountType === 'anticipo' && window.appliedAnticipo) {
      discountInfo.anticipo = window.appliedAnticipo;
    }
  }

  const newMovement = {
    id: crypto.randomUUID(),
    folio: generateFolio(),
    fechaISO: new Date().toISOString(),
    clienteId: client.id,
    tipo: selectedProducts.length > 0 ? selectedProducts[0].type : 'service',
    subtipo: '',
    monto: Number(monto.toFixed(2)),
    metodo: document.getElementById('m-metodo').value,
    concepto: concepto,
    staff: currentUser.name,
    notas: document.getElementById('m-notas').value,
    fechaCita: construirFechaCita(),
    horaCita: document.getElementById('m-hora-cita').value,
    productos: selectedProducts, // Store product details for ticket
    descuento: currentDiscount,
    subtotal: currentSubtotal,
    discountInfo: discountInfo // Información detallada del descuento para el ticket
  };

  await addMovement(newMovement);
  renderTicketAndPrint({ ...newMovement, client }, settings);
  
  // Reset form and clear products
  form.reset();
  selectedProducts = [];
  currentSubtotal = 0;
  currentDiscount = 0;
  renderSelectedProducts();
  calculateTotals();
  hideDynamicSections();
  
  // Limpiar anticipo aplicado
  if (window.appliedAnticipo) {
    delete window.appliedAnticipo;
  }
  
  document.getElementById('m-cliente').focus();
}

function exportClientHistoryCSV(client, history) {
  const headers = 'Folio,Fecha,Servicio,Monto';
  const rows = history.map(mov => {
    const servicio = mov.subtipo ? `${mov.tipo} (${mov.subtipo})` : mov.tipo;
    return [
      mov.folio,
      formatDate(mov.fechaISO),
      `"${servicio}"`, 
      Number(mov.monto).toFixed(2)
    ].join(',');
  });

  const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows.join('\n')}`;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `historial-${client.nombre.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function showClientRecord(clientId) {
    currentClientId = clientId;
    const client = clients.find(c => c.id === clientId);
    if (!client) {
        clearClientRecord();
        return;
    }

    renderClientsTable(clients.filter(c => c.nombre.toLowerCase().includes(document.getElementById('search-client').value.toLowerCase())));

    const clientRecordContent = document.getElementById('client-record-content');
    const clientRecordPlaceholder = document.getElementById('client-record-placeholder');
    const clientDetails = document.getElementById('client-details');
    const clientHistoryTableBody = document.getElementById('client-history-table').querySelector('tbody');
    const clientCoursesContainer = document.getElementById('client-courses-history-container');

    clientDetails.innerHTML = `
        <p><strong>Nombre:</strong> ${escapeHTML(client.nombre)}</p>
        <p><strong>Teléfono:</strong> ${escapeHTML(client.telefono || 'N/A')}</p>
        <p><strong>Cumpleaños:</strong> ${escapeHTML(formatDate(client.cumpleaños) || 'N/A')}</p>
        <p><strong>Género:</strong> ${escapeHTML(client.genero || 'N/A')}</p>
        <p><strong>Oncológico:</strong> ${client.esOncologico ? 'Sí' : 'No'}</p>
    `;

    try {
        const [historyResponse, coursesResponse] = await Promise.all([
            fetch(`/api/clients/${client.id}/history`),
            fetch(`/api/clients/${client.id}/courses`)
        ]);

        const history = await historyResponse.json();
        const courses = await coursesResponse.json();

        clientHistoryTableBody.innerHTML = '';
        if (history.length > 0) {
            history.forEach(mov => {
                const tr = clientHistoryTableBody.insertRow();
                const servicio = mov.subtipo ? `${escapeHTML(mov.tipo)} (${escapeHTML(mov.subtipo)})` : escapeHTML(mov.tipo);
                tr.insertCell().textContent = mov.folio;
                tr.insertCell().textContent = formatDate(mov.fechaISO);
                tr.insertCell().textContent = servicio;
                tr.insertCell().textContent = Number(mov.monto).toFixed(2);
            });
        } else {
            clientHistoryTableBody.innerHTML = '<tr><td colspan="4">No hay historial de servicios.</td></tr>';
        }

        clientCoursesContainer.innerHTML = '';
        if (courses.length > 0) {
            const coursesTable = document.createElement('table');
            coursesTable.innerHTML = `
                <thead>
                    <tr>
                        <th>Curso</th>
                        <th>Fecha</th>
                        <th>Score</th>
                        <th>Presencial</th>
                        <th>Online</th>
                        <th>Prácticas</th>
                        <th>Certificación</th>
                    </tr>
                </thead>
                <tbody>
                    ${courses.map(course => `
                        <tr>
                            <td>${escapeHTML(course.course_name)}</td>
                            <td>${escapeHTML(formatDate(course.fecha_curso))}</td>
                            <td>${escapeHTML(course.score_general)}</td>
                            <td>${course.completo_presencial ? 'Sí' : 'No'}</td>
                            <td>${course.completo_online ? 'Sí' : 'No'}</td>
                            <td>${course.realizo_practicas ? 'Sí' : 'No'}</td>
                            <td>${course.obtuvo_certificacion ? 'Sí' : 'No'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            clientCoursesContainer.appendChild(coursesTable);
        } else {
            clientCoursesContainer.innerHTML = '<p>No hay cursos registrados para este cliente.</p>';
        }

    } catch (error) {
        console.error('Error al cargar el historial del cliente:', error);
        clientHistoryTableBody.innerHTML = '<tr><td colspan="4">Error al cargar historial.</td></tr>';
        clientCoursesContainer.innerHTML = '<p>Error al cargar historial de cursos.</p>';
    }

    clientRecordContent.classList.remove('hidden');
    clientRecordPlaceholder.classList.add('hidden');
}

function clearClientRecord() {
    currentClientId = null;
    const clientRecordContent = document.getElementById('client-record-content');
    const clientRecordPlaceholder = document.getElementById('client-record-placeholder');
    clientRecordContent.classList.add('hidden');
    clientRecordPlaceholder.classList.remove('hidden');
    renderClientsTable();
}

function handleTableClick(e) {
  const target = e.target;
  const row = target.closest('tr');
  if (!row) return;

  const tableId = row.closest('table')?.id;

  if (tableId === 'tblClients') {
      const clientId = row.dataset.id;
      showClientRecord(clientId);
      return;
  }

  const actionBtn = target.closest('.action-btn');
  if (actionBtn) {
    e.preventDefault();
    const id = actionBtn.dataset.id;
    const action = actionBtn.dataset.action;

    if (action === 'reprint' || action === 'delete' || action === 'request-cancel') {
      const movement = movements.find(m => m.id === id);
      if (movement) {
        if (action === 'reprint') {
          const client = clients.find(c => c.id === movement.clienteId);
          renderTicketAndPrint({ ...movement, client }, settings);
        } else if (action === 'delete') {
          deleteMovement(id);
        } else if (action === 'request-cancel') {
          showCancellationRequestModal(id, movement);
        }
      }
    } else if (action === 'edit-user') {
      const user = users.find(u => u.id === parseInt(id));
      if (user) {
        document.getElementById('u-id').value = user.id;
        document.getElementById('u-name').value = user.name;
        document.getElementById('u-username').value = user.username;
        document.getElementById('u-role').value = user.role;
        document.getElementById('u-password').value = '';
        document.getElementById('u-password').placeholder = 'Dejar en blanco para no cambiar';
      }
    } else if (action === 'delete-user') {
      deleteUser(parseInt(id, 10));
    } else if (action === 'edit-product') {
        const product = products.find(p => p.id === parseInt(id));
        if (product) {
            document.getElementById('p-id').value = product.id;
            document.getElementById('p-name').value = product.name;
            document.getElementById('p-type').value = product.type;
            document.getElementById('p-price').value = product.price;
        }
    } else if (action === 'delete-product') {
        deleteProduct(parseInt(id, 10));
    }
  }
}

async function handleClientForm(e) {
  e.preventDefault();
  await saveClient();
  activateClientSubTab('sub-tab-consult');
}

function activateClientSubTab(subTabId) {
  if (!subTabId) return;

  document.querySelectorAll('#tab-clients .sub-tab-link').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('#tab-clients .sub-tab-content').forEach(content => content.classList.remove('active'));

  const tabButton = document.querySelector(`[data-subtab="${subTabId}"]`);
  const tabContent = document.getElementById(subTabId);

  if (tabButton) {
    tabButton.classList.add('active');
  }
  if (tabContent) {
    tabContent.classList.add('active');
  }
}

function handleClientTabChange(e) {
  const subTabButton = e.target.closest('.sub-tab-link');
  if (!subTabButton) return;
  e.preventDefault();
  const subTabId = subTabButton.dataset.subtab;
  activateClientSubTab(subTabId);
}

function handleSalesTabChange(e) {
  const subTabButton = e.target.closest('.sub-tab-link');
  if (!subTabButton) return;
  e.preventDefault();
  const subTabId = subTabButton.dataset.subtab;
  activateSalesSubTab(subTabId);
}

function activateSalesSubTab(subTabId) {
  if (!subTabId) return;

  document.querySelectorAll('#tab-movements .sub-tab-link').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('#tab-movements .sub-tab-content').forEach(content => content.classList.remove('active'));

  const tabButton = document.querySelector(`[data-subtab="${subTabId}"]`);
  const tabContent = document.getElementById(subTabId);

  if (tabButton) {
    tabButton.classList.add('active');
  }
  if (tabContent) {
    tabContent.classList.add('active');
  }

  // Si cambiamos a la pestaña de tickets, cargar los movimientos
  if (subTabId === 'sub-tab-tickets') {
    renderTable();
  }
}

function activateTab(tabId) {
  if (!tabId) return;

  document.querySelectorAll('.tab-link').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
  const tabContent = document.getElementById(tabId);

  if (tabButton) {
    tabButton.classList.add('active');
  }
  if (tabContent) {
    tabContent.classList.add('active');
  }

  if (tabId === 'tab-dashboard') {
    if (!incomeChart) {
      const ctx = document.getElementById('incomeChart').getContext('2d');
      incomeChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: [],
          datasets: [{
            label: 'Ingresos por Servicio',
            data: [],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false
        }
      });
    }
    if (!paymentMethodChart) {
      const ctx = document.getElementById('paymentMethodChart').getContext('2d');
      paymentMethodChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: [],
          datasets: [{
            label: 'Ingresos por Método de Pago',
            data: [],
            backgroundColor: ['#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#36A2EB', '#FFCE56'],
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false
        }
      });
    }
    loadDashboardData();
  } else if (tabId === 'tab-cancellation-requests') {
    loadCancellationRequests();
  } else if (tabId === 'tab-movements') {
    initializeModernSalesInterface();
  }
}

function handleTabChange(e) {
  const tabButton = e.target.closest('.tab-link');
  if (!tabButton) return;

  if (tabButton.dataset.tab) {
    e.preventDefault();
    const tabId = tabButton.dataset.tab;
    activateTab(tabId);
  }
}

function handleTestTicket() {
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
    renderTicketAndPrint(demoMovement, settings);
}

function setupUIForRole(role) {
    console.log('SETUP UI FOR ROLE:', role);
    
    const dashboardTab = document.querySelector('[data-tab="tab-dashboard"]');
    const settingsTab = document.querySelector('[data-tab="tab-settings"]');
    const cancellationRequestsTab = document.getElementById('tab-cancellation-requests-btn');
    const userManagementSection = document.getElementById('user-management-section');
    const staffInput = document.getElementById('m-staff');
    const dbInfoIcon = document.getElementById('db-info-icon');
    
    console.log('Dashboard tab found:', !!dashboardTab);
    console.log('Settings tab found:', !!settingsTab);

    if (role === 'admin') {
        if (dashboardTab) dashboardTab.style.display = 'block';
        if (settingsTab) settingsTab.style.display = 'block';
        if (cancellationRequestsTab) cancellationRequestsTab.style.display = 'block';
        if (userManagementSection) userManagementSection.style.display = 'block';
        if (dbInfoIcon) dbInfoIcon.style.display = 'inline-block';
        
        // Show import products button for admins
        const importProductsBtn = document.getElementById('btnImportProducts');
        if (importProductsBtn) importProductsBtn.style.display = 'inline-block';
        
        fetch('/api/users')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch users list');
                return res.json();
            })
            .then(data => {
                users = data;
                renderUsersTable();
            })
            .catch(err => console.error(err));
    } else {
        // Usuario regular: NO acceso a Dashboard y Configuración
        console.log('CONFIGURANDO PARA USER REGULAR - OCULTANDO TABS');
        if (dashboardTab) {
            dashboardTab.style.display = 'none';
            console.log('Dashboard tab oculto');
        }
        if (settingsTab) {
            settingsTab.style.display = 'none';
            console.log('Settings tab oculto');
        }
        if (cancellationRequestsTab) {
            cancellationRequestsTab.style.display = 'none';
        }
        if (userManagementSection) userManagementSection.style.display = 'none';
        if (dbInfoIcon) dbInfoIcon.style.display = 'none';
    }
    
    if (staffInput) {
        staffInput.disabled = true;
    }
}

function populateFooter() {
    // Footer elements removed - no longer needed
}


// --- CANCELLATION REQUESTS FUNCTIONS ---

async function loadCancellationRequests() {
    if (currentUser.role !== 'admin') return;
    
    try {
        const response = await fetch('/api/cancellation-requests');
        if (response.ok) {
            cancellationRequests = await response.json();
            renderCancellationRequestsTable();
        }
    } catch (error) {
        console.error('Error loading cancellation requests:', error);
    }
}

function renderCancellationRequestsTable() {
    const tableBody = document.querySelector('#tblCancellationRequests tbody');
    const noRequestsDiv = document.getElementById('no-cancellation-requests');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (cancellationRequests.length === 0) {
        if (noRequestsDiv) noRequestsDiv.style.display = 'block';
        return;
    }
    
    if (noRequestsDiv) noRequestsDiv.style.display = 'none';
    
    cancellationRequests.forEach(request => {
        const row = tableBody.insertRow();
        
        // Status styling
        const statusClass = {
            'pending': 'status-pending',
            'approved': 'status-approved', 
            'denied': 'status-denied'
        }[request.status] || '';
        
        const statusText = {
            'pending': 'Pendiente',
            'approved': 'Aprobada',
            'denied': 'Denegada'
        }[request.status] || request.status;
        
        row.innerHTML = `
            <td>${escapeHTML(request.folio || 'N/A')}</td>
            <td>${escapeHTML(request.client_name || 'N/A')}</td>
            <td>$${Number(request.monto || 0).toFixed(2)}</td>
            <td>${escapeHTML(request.requested_by_name || 'N/A')}</td>
            <td>${formatDate(request.created_at)}</td>
            <td class="reason-cell" title="${escapeHTML(request.reason)}">${escapeHTML(request.reason.substring(0, 50))}${request.reason.length > 50 ? '...' : ''}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>
                ${request.status === 'pending' ? `
                    <button class="action-btn btn-success" onclick="processCancellationRequest('${request.id}', 'approved')" title="Aprobar">
                        ✓ Aprobar
                    </button>
                    <button class="action-btn btn-danger" onclick="processCancellationRequest('${request.id}', 'denied')" title="Denegar">
                        ✗ Denegar
                    </button>
                ` : `
                    <span class="processed-info">
                        ${request.status === 'approved' ? 'Aprobada' : 'Denegada'}
                        ${request.reviewed_at ? `<br><small>${formatDate(request.reviewed_at)}</small>` : ''}
                    </span>
                `}
            </td>
        `;
    });
}

async function processCancellationRequest(requestId, status) {
    const request = cancellationRequests.find(r => r.id === requestId);
    if (!request) return;
    
    const actionText = status === 'approved' ? 'aprobar' : 'denegar';
    const actionPast = status === 'approved' ? 'aprobada' : 'denegada';
    
    let adminNotes = '';
    if (status === 'denied') {
        adminNotes = prompt('Notas del administrador (opcional):', '');
        if (adminNotes === null) return; // Usuario canceló
    } else {
        const confirmMsg = `¿Estás seguro de que quieres ${actionText} la cancelación del folio ${request.folio}?\n\nEsto ${status === 'approved' ? 'ELIMINARÁ PERMANENTEMENTE' : 'restaurará'} la venta.`;
        if (!confirm(confirmMsg)) return;
    }
    
    try {
        const response = await fetch(`/api/cancellation-requests/${requestId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, admin_notes: adminNotes })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(`Solicitud ${actionPast} exitosamente.`);
            await loadCancellationRequests();
            
            // Refresh movements list to show/hide the movement
            const movementsResponse = await fetch('/api/movements');
            if (movementsResponse.ok) {
                movements = await movementsResponse.json();
                renderTable();
            }
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert('Error de conexión al procesar la solicitud.');
    }
}

// --- BULK PRODUCTS IMPORT ---
async function importProductsFromJSON() {
    const jsonData = {
        "Servicios": {
            "Pestañas": {
                "Servicios": [
                    { "nombre": "Extensión de Pestañas (Clean Girl)", "precio": 1570, "orden": 1 },
                    { "nombre": "Extensión de Pestañas (Elegant Lashes)", "precio": 950, "orden": 2 },
                    { "nombre": "Extensión de Pestañas (Mystery Lashes)", "precio": 1210, "orden": 3 },
                    { "nombre": "Extensión de Pestañas (Seduction Lashes)", "precio": 1580, "orden": 4 },
                    { "nombre": "Lash Lifting", "precio": 740, "orden": 5 },
                    { "nombre": "Retiro de pestañas", "precio": 140, "orden": 6 },
                    { "nombre": "Tinte para pestañas (Lash Lifting)", "precio": 210, "orden": 7 }
                ],
                "Retoques": {
                    "Elegant Lashes": [
                        { "nombre": "Retoque (1ª Semana)", "precio": 320, "orden": 10 },
                        { "nombre": "Retoque (2ª Semana)", "precio": 420, "orden": 11 },
                        { "nombre": "Retoque (3ª Semana)", "precio": 530, "orden": 12 }
                    ],
                    "Mystery Lashes": [
                        { "nombre": "Retoque (1ª Semana)", "precio": 330, "orden": 20 },
                        { "nombre": "Retoque (2ª Semana)", "precio": 430, "orden": 21 },
                        { "nombre": "Retoque (3ª Semana)", "precio": 540, "orden": 22 }
                    ],
                    "Seduction Lashes": [
                        { "nombre": "Retoque (1ª Semana)", "precio": 340, "orden": 30 },
                        { "nombre": "Retoque (2ª Semana)", "precio": 440, "orden": 31 },
                        { "nombre": "Retoque (3ª Semana)", "precio": 550, "orden": 32 }
                    ]
                }
            },
            "Microblading": {
                "Servicios": [
                    { "nombre": "Retoque Vanity Brows (Microblading)", "precio": 3680 },
                    { "nombre": "Vanity Lips", "precio": 5250 },
                    { "nombre": "Microblading Vanity Brows", "precio": 5250 },
                    { "nombre": "Powder Brows", "precio": 3680 }
                ]
            },
            "Uñas": {
                "Servicios": [
                    { "nombre": "Nail Art", "precio": null }
                ]
            }
        }
    };

    const productsToImport = [];

    // Convert JSON structure to flat products array
    Object.keys(jsonData.Servicios).forEach(mainCategory => {
        const categoryData = jsonData.Servicios[mainCategory];
        
        Object.keys(categoryData).forEach(subCategoryKey => {
            if (subCategoryKey === 'Servicios') {
                // Direct services
                categoryData[subCategoryKey].forEach(service => {
                    productsToImport.push({
                        name: service.nombre,
                        type: 'service',
                        price: service.precio,
                        category: mainCategory,
                        subcategory: 'Servicios',
                        custom_price: service.precio === null,
                        sort_order: service.orden || 0
                    });
                });
            } else if (subCategoryKey === 'Retoques') {
                // Retoques with sub-subcategories
                Object.keys(categoryData[subCategoryKey]).forEach(retouchType => {
                    categoryData[subCategoryKey][retouchType].forEach(retouch => {
                        productsToImport.push({
                            name: `${retouchType} - ${retouch.nombre}`,
                            type: 'service',
                            price: retouch.precio,
                            category: mainCategory,
                            subcategory: `Retoques - ${retouchType}`,
                            custom_price: false,
                            sort_order: retouch.orden || 0
                        });
                    });
                });
            }
        });
    });

    try {
        const response = await fetch('/api/products/bulk-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ products: productsToImport })
        });

        const result = await response.json();

        if (response.ok) {
            alert(`${result.count} productos importados exitosamente.`);
            // Refresh products list
            const productsResponse = await fetch('/api/products');
            if (productsResponse.ok) {
                products = await productsResponse.json();
                renderProductTables();
                updateUnifiedProductsAfterChange();
            }
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert('Error de conexión al importar productos.');
        console.error('Import error:', error);
    }
}

// --- MODERN SALES INTERFACE FUNCTIONS ---

function initializeModernSalesInterface() {
    // Initialize all categories as collapsed
    const categorySections = document.querySelectorAll('.category-section');
    categorySections.forEach(section => {
        const productsGrid = section.querySelector('.products-grid');
        const toggle = section.querySelector('.category-toggle');
        if (productsGrid && toggle) {
            productsGrid.style.display = 'none';
            toggle.textContent = '▶';
            section.classList.add('collapsed');
        }
    });

    // Initialize category toggles
    const categoryHeaders = document.querySelectorAll('.category-header');
    categoryHeaders.forEach(header => {
        header.addEventListener('click', toggleCategory);
    });

    // Load products by categories
    loadProductsByCategories();
    
    // Update cart display
    updateCartDisplay();
}

function toggleCategory(event) {
    const categorySection = event.currentTarget.closest('.category-section');
    const toggle = categorySection.querySelector('.category-toggle');
    const productsGrid = categorySection.querySelector('.products-grid');
    
    categorySection.classList.toggle('collapsed');
    
    if (categorySection.classList.contains('collapsed')) {
        if (productsGrid) productsGrid.style.display = 'none';
        toggle.textContent = '▶';
    } else {
        if (productsGrid) productsGrid.style.display = 'block';
        toggle.textContent = '▼';
    }
}

function collapseAllCategories() {
    const categorySections = document.querySelectorAll('.category-section');
    categorySections.forEach(section => {
        const productsGrid = section.querySelector('.products-grid');
        const toggle = section.querySelector('.category-toggle');
        if (productsGrid && toggle) {
            productsGrid.style.display = 'none';
            toggle.textContent = '▶';
            section.classList.add('collapsed');
        }
    });
}

async function loadProductsByCategories() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to load products');
        
        const allProducts = await response.json();
        
        // Update global products array
        products = allProducts;
        console.log('Products loaded:', products.length);
        
        // Group products by category
        const productsByCategory = {};
        allProducts.forEach(product => {
            const category = product.category || 'Otros';
            if (!productsByCategory[category]) {
                productsByCategory[category] = [];
            }
            productsByCategory[category].push(product);
        });
        
        // Log categories found
        console.log('Categories found:', Object.keys(productsByCategory));
        
        // Populate each category - map to correct category names
        renderProductsInCategory('Pestañas', productsByCategory['Pestañas'] || []);
        renderProductsInCategory('Microblading', productsByCategory['Microblading'] || []);
        renderProductsInCategory('Uñas', productsByCategory['Uñas'] || []);
        
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function renderProductsInCategory(categoryName, products) {
    let containerId;
    switch(categoryName) {
        case 'Pestañas':
            containerId = 'pestanas-products';
            break;
        case 'Microblading':
            containerId = 'microblading-products';
            break;
        case 'Uñas':
            containerId = 'unas-products';
            break;
        default:
            return;
    }
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    if (products.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">No hay productos disponibles</p>';
        return;
    }
    
    products.forEach(product => {
        const productCard = createProductCard(product);
        container.appendChild(productCard);
    });
}


function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;
    
    const priceDisplay = product.custom_price 
        ? '<span class="product-price custom">Precio personalizado</span>'
        : `<span class="product-price">$${parseFloat(product.price || 0).toFixed(2)}</span>`;
    
    card.innerHTML = `
        <div class="product-name">${escapeHTML(product.name)}</div>
        ${priceDisplay}
        <div class="product-actions">
            <input type="number" class="quantity-input" min="1" value="1" />
            <button class="btn-select-product" onclick="addProductToCart(${product.id})">
                Agregar
            </button>
        </div>
    `;
    
    return card;
}

function addProductToCart(productId) {
    const productCard = document.querySelector(`[data-product-id="${productId}"]`);
    if (!productCard) return;
    
    const quantityInput = productCard.querySelector('.quantity-input');
    const quantity = parseInt(quantityInput.value) || 1;
    
    // Find the product in the products array
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Handle custom price products
    let price = product.price;
    if (product.custom_price) {
        const customPrice = prompt(`Ingresa el precio para "${product.name}":`, '0');
        if (customPrice === null) return; // User cancelled
        price = parseFloat(customPrice) || 0;
    }
    
    // Check if product is already in cart
    const existingIndex = selectedProducts.findIndex(p => p.id === productId);
    
    if (existingIndex >= 0) {
        // Update quantity
        selectedProducts[existingIndex].quantity += quantity;
        selectedProducts[existingIndex].price = price; // Update price in case it changed
    } else {
        // Add new product
        selectedProducts.push({
            id: product.id,
            name: product.name,
            price: price,
            quantity: quantity,
            type: product.type,
            custom_price: product.custom_price
        });
    }
    
    // Visual feedback
    productCard.classList.add('selected');
    setTimeout(() => {
        productCard.classList.remove('selected');
    }, 1000);
    
    // Reset quantity input
    quantityInput.value = 1;
    
    updateCartDisplay();
    calculateTotals();
    
    // Auto-collapse all categories after adding product
    collapseAllCategories();
}

function removeProductFromCart(productId) {
    selectedProducts = selectedProducts.filter(p => p.id !== productId);
    updateCartDisplay();
    calculateTotals();
}

function updateCartDisplay() {
    const cartContainer = document.getElementById('selected-products-container');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    
    if (!cartContainer) return;
    
    // Update header counts
    const totalItems = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
    if (cartCount) cartCount.textContent = `${totalItems} producto${totalItems !== 1 ? 's' : ''}`;
    
    // Clear container
    cartContainer.innerHTML = '';
    
    if (selectedProducts.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart">
                <span class="empty-icon">🛒</span>
                <p>Selecciona servicios para comenzar</p>
            </div>
        `;
        return;
    }
    
    selectedProducts.forEach(product => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        cartItem.innerHTML = `
            <div class="item-info">
                <div class="item-name">${escapeHTML(product.name)}</div>
                <div class="item-details">${product.quantity}x - ${product.custom_price ? 'Precio personalizado' : 'Precio fijo'}</div>
            </div>
            <div class="item-price">$${(product.price * product.quantity).toFixed(2)}</div>
            <button class="btn-remove-item" onclick="removeProductFromCart(${product.id})" title="Remover">×</button>
        `;
        
        cartContainer.appendChild(cartItem);
    });
}


// Make functions globally accessible
window.addProductToCart = addProductToCart;
window.removeProductFromCart = removeProductFromCart;
window.processCancellationRequest = processCancellationRequest;
window.importProductsFromJSON = importProductsFromJSON;
window.addAnticipo = addAnticipo;

// Make removeProduct globally accessible
window.removeProduct = removeProduct;

// --- INICIALIZACIÓN ---

async function initializeApp() {
  let userResponse;
  try {
    userResponse = await fetch('/api/user');
    if (!userResponse.ok) {
      window.location.href = '/login.html';
      return;
    }

    const contentType = userResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('La respuesta del servidor no es JSON. Redirigiendo al login.');
      window.location.href = '/login.html';
      return;
    }
    
    currentUser = await userResponse.json();

  } catch (error) {
    console.error('Error de conexión al verificar la autenticación. Redirigiendo al login.', error);
    window.location.href = '/login.html';
    return;
  }

  const tabs = document.querySelector('.tabs');
  const btnLogout = document.getElementById('btnLogout');
  const btnCancelEditUser = document.getElementById('btnCancelEditUser');
  const tipoServicioSelect = document.getElementById('m-tipo');
  const clientSubTabs = document.querySelector('#tab-clients .sub-tabs');
  const salesSubTabs = document.querySelector('#tab-movements .sub-tabs');
  const dbInfoIcon = document.getElementById('db-info-icon');
  
  formSettings?.addEventListener('submit', handleSaveSettings);
  formCredentials?.addEventListener('submit', handleSaveCredentials);
  formMove?.addEventListener('submit', handleNewMovement);
  tblMovesBody?.addEventListener('click', handleTableClick);
  tblClientsBody?.addEventListener('click', handleTableClick);
  tblServicesBody?.addEventListener('click', handleTableClick);
  tblCoursesBody?.addEventListener('click', handleTableClick);
  appointmentsList?.addEventListener('click', handleTableClick);
  btnExport?.addEventListener('click', exportCSV);
  btnTestTicket?.addEventListener('click', handleTestTicket);
  formClient?.addEventListener('submit', handleClientForm);
  formProduct?.addEventListener('submit', handleAddOrUpdateProduct);
  tabs?.addEventListener('click', handleTabChange);
  clientSubTabs?.addEventListener('click', handleClientTabChange);
  salesSubTabs?.addEventListener('click', handleSalesTabChange);
  
  if (currentUser.role === 'admin') {
      formAddUser?.addEventListener('submit', handleAddOrUpdateUser);
      tblUsersBody?.addEventListener('click', handleTableClick);
      dbInfoIcon?.addEventListener('click', () => {
        document.getElementById('db-instructions').classList.toggle('hidden');
      });
  }
  
  btnLogout?.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login.html';
  });

  document.getElementById('btnCancelEditClient')?.addEventListener('click', () => {
    formClient.reset();
    document.getElementById('c-id').value = '';
    document.getElementById('oncologico-fields').classList.add('hidden');
  });

  document.getElementById('c-pacienteOncologico')?.addEventListener('change', (e) => {
    const oncologicoFields = document.getElementById('oncologico-fields');
    if (oncologicoFields) {
      oncologicoFields.classList.toggle('hidden', !e.target.checked);
      oncologicoFields.classList.toggle('active', e.target.checked);
    }
  });

  btnCancelEditUser?.addEventListener('click', (e) => {
    e.preventDefault();
    formAddUser.reset();
    document.getElementById('u-id').value = '';
    document.getElementById('u-password').placeholder = 'Contraseña';
  });

  const searchClientInput = document.getElementById('search-client');
  searchClientInput?.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredClients = clients.filter(c => 
      c.nombre.toLowerCase().includes(searchTerm) || 
      c.telefono?.toLowerCase().includes(searchTerm)
    );
    renderClientsTable(filteredClients);
  });

  const categoriaSelect = document.getElementById('m-categoria');
  categoriaSelect?.addEventListener('change', (e) => {
    populateArticuloDropdown(e.target.value);
  });

  tipoServicioSelect?.addEventListener('change', (e) => {
    const subtipoContainer = document.getElementById('m-subtipo-container');
    const servicesWithSubtype = ['Microblading', 'Lashes', 'Nail Art', 'Lash Lifting'];
    subtipoContainer.classList.toggle('hidden', !servicesWithSubtype.includes(e.target.value));
  });

    document.getElementById('btn-edit-client')?.addEventListener('click', () => {
      if (!currentClientId) return;
      const client = clients.find(c => c.id === currentClientId);
      if (client) {
          document.getElementById('c-id').value = client.id;
          document.getElementById('c-nombre').value = client.nombre;
          document.getElementById('c-telefono').value = client.telefono || '';
          document.getElementById('c-genero').value = client.genero || '';
          document.getElementById('c-cumple').value = client.cumpleaños;
          document.getElementById('c-consent').checked = client.consentimiento;

          const esOncologicoCheckbox = document.getElementById('c-pacienteOncologico');
          const oncologicoFields = document.getElementById('oncologico-fields');
          if (esOncologicoCheckbox) {
            esOncologicoCheckbox.checked = client.esOncologico;
          }
          if (oncologicoFields) {
            oncologicoFields.classList.toggle('hidden', !client.esOncologico);
            oncologicoFields.classList.toggle('active', client.esOncologico);
          }

          document.getElementById('c-oncologoAprueba').checked = client.oncologoAprueba;
          document.getElementById('c-nombreMedico').value = client.nombreMedico || '';
          document.getElementById('c-telefonoMedico').value = client.telefonoMedico || '';
          document.getElementById('c-cedulaMedico').value = client.cedulaMedico || '';
          document.getElementById('c-pruebaAprobacion').checked = client.pruebaAprobacion;

          activateClientSubTab('sub-tab-register');
      }
  });

  document.getElementById('btn-delete-client')?.addEventListener('click', () => {
      if (!currentClientId) return;
      deleteClient(currentClientId);
  });

  document.getElementById('btnAddCourseToClient')?.addEventListener('click', () => {
    const clientId = document.getElementById('c-id').value;
    if (!clientId) {
        alert('Por favor, primero guarda el cliente antes de añadir un curso.');
        return;
    }
    showAddCourseModal(clientId);
  });

  // Event listener para el date picker de citas
  const fechaCitaPicker = document.getElementById('m-fecha-cita');
  if (fechaCitaPicker) {
    fechaCitaPicker.addEventListener('change', function() {
      updateAvailableTimeSlots(this.value);
    });
  }

  Promise.all([
    fetch('/api/settings').then(res => res.json()).catch(() => defaultSettings),
    fetch('/api/movements').then(res => res.json()).catch(() => []),
    fetch('/api/clients').then(res => res.json()).catch(() => []),
    fetch('/api/products').then(res => res.json()).catch(() => []),
  ]).then(values => {
    console.log('Initial data loaded:', values);
    [settings, movements, clients, products] = values;
    
    console.log('Rendering settings...');
    renderSettings();
    console.log('Rendering movements table...');
    renderTable();
    console.log('Rendering clients table...');
    renderClientsTable();
    console.log('Rendering products table...');
    renderProductTables();
    console.log('Updating client datalist...');
    updateClientDatalist();
    // populateArticuloDropdown(''); // Legacy form function - not needed for modern interface
    
    if (currentUser) {
        console.log('Setting user info in form...');
        const sNameField = document.getElementById('s-name');
        const sUsernameField = document.getElementById('s-username');
        const mStaffField = document.getElementById('m-staff');
        
        if (sNameField) sNameField.value = currentUser.name || '';
        if (sUsernameField) sUsernameField.value = currentUser.username;
        if (mStaffField) mStaffField.value = currentUser.name || '';
    }
    
    console.log('Setting up UI for role...');
    setupUIForRole(currentUser.role);
    
    console.log('Activating initial tab...');
    // Usuario regular va a ventas, admin va a dashboard
    const initialTab = currentUser.role === 'admin' ? 'tab-dashboard' : 'tab-movements';
    activateTab(initialTab);

    console.log('Activating client sub-tab...');
    activateClientSubTab('sub-tab-register');
    console.log('Clearing client record...');
    clearClientRecord();
    console.log('Populating footer...');
    populateFooter();
    console.log('Initializing dynamic system...');
    initializeDynamicSystem();
    console.log('Initializing unified products table...');
    initializeUnifiedTable();
    console.log('Initialization complete.');

  }).catch(error => {
    console.error('CRITICAL: Failed to load initial data.', error);
    alert('Error Crítico: No se pudieron cargar los datos del servidor.');
  });
}

// --- NUEVA IMPLEMENTACIÓN: TABLA UNIFICADA DE PRODUCTOS ---

// Estado global para la tabla unificada
let allProductsData = [];
let currentSortField = 'descripcion';
let currentSortDirection = 'asc';

// Generar folio único para productos
function generateProductFolio(type) {
    const folioPrefix = settings.folioPrefix || 'PRD';
    const timestamp = Date.now().toString().slice(-6);
    const typeCode = {
        'service': 'SRV',
        'course': 'CRS'
    };
    return `${folioPrefix}-${typeCode[type]}-${timestamp}`;
}

// Los anticipos ya no son productos - se manejan solo en ventas

// Los anticipos usan prompts nativos mejorados con emojis

// Renderizar tabla unificada
function renderUnifiedProductsTable() {
    const tableBody = document.querySelector('#tblAllProducts tbody');
    if (!tableBody) return;

    // Limpiar tabla
    tableBody.innerHTML = '';

    // Aplicar filtros
    let filteredData = [...allProductsData];
    
    // Filtro por descripción
    const filterDescription = document.getElementById('filter-description')?.value?.toLowerCase();
    if (filterDescription) {
        filteredData = filteredData.filter(item => 
            item.descripcion.toLowerCase().includes(filterDescription)
        );
    }
    
    // Filtro por tipo de producto (servicios y cursos únicamente)
    const filterCategory = document.getElementById('filter-category')?.value;
    if (filterCategory) {
        filteredData = filteredData.filter(item => item.categoria === filterCategory);
    }
    
    // Filtro por rango de fechas
    const filterDateFrom = document.getElementById('filter-date-from')?.value;
    const filterDateTo = document.getElementById('filter-date-to')?.value;
    if (filterDateFrom || filterDateTo) {
        filteredData = filteredData.filter(item => {
            if (!item.fecha || item.fecha === 'N/A') return true;
            
            // Convertir fecha del item a formato comparable
            const itemDate = new Date(item.fecha.split('/').reverse().join('-'));
            
            if (filterDateFrom) {
                const fromDate = new Date(filterDateFrom);
                if (itemDate < fromDate) return false;
            }
            
            if (filterDateTo) {
                const toDate = new Date(filterDateTo);
                if (itemDate > toDate) return false;
            }
            
            return true;
        });
    }
    
    // Filtro por rango de precios
    const filterPriceMin = document.getElementById('filter-price-min')?.value;
    const filterPriceMax = document.getElementById('filter-price-max')?.value;
    if (filterPriceMin || filterPriceMax) {
        filteredData = filteredData.filter(item => {
            const price = parseFloat(item.precio) || 0;
            
            if (filterPriceMin && price < parseFloat(filterPriceMin)) return false;
            if (filterPriceMax && price > parseFloat(filterPriceMax)) return false;
            
            return true;
        });
    }

    // Ordenar datos
    filteredData.sort((a, b) => {
        let aValue = a[currentSortField] || '';
        let bValue = b[currentSortField] || '';
        
        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }
        
        if (currentSortDirection === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
    });

    // Renderizar filas
    filteredData.forEach(item => {
        const row = document.createElement('tr');
        
        const statusClass = item.status === 'cancelled' ? 'status-cancelled' : 'status-active';
        const categoryClass = `category-${item.categoria}`;
        
        row.innerHTML = `
            <td>${item.folio}</td>
            <td>${item.fecha}</td>
            <td>${item.cita || 'N/A'}</td>
            <td>${escapeHTML(item.descripcion)}</td>
            <td><span class="category-badge ${categoryClass}">${getCategoryName(item.categoria)}</span></td>
            <td>$${parseFloat(item.precio || 0).toFixed(2)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" onclick="editUnifiedProduct('${item.id}')" title="Editar">
                        <span class="material-icons-outlined">edit</span>
                    </button>
                    <button class="btn-icon btn-cancel" onclick="toggleProductStatus('${item.id}')" title="${item.status === 'cancelled' ? 'Reactivar' : 'Cancelar'}">
                        <span class="material-icons-outlined">${item.status === 'cancelled' ? 'check_circle' : 'cancel'}</span>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteUnifiedProduct('${item.id}')" title="Eliminar">
                        <span class="material-icons-outlined">delete</span>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Obtener nombre amigable de categoría
function getCategoryName(categoria) {
    const names = {
        'service': 'Servicio',
        'course': 'Curso'
    };
    return names[categoria] || categoria;
}

// Cargar datos unificados
function loadUnifiedProductsData() {
    allProductsData = [];
    
    // Agregar solo productos existentes (servicios y cursos)
    // Los anticipos NO se incluyen aquí - solo se manejan en ventas/notas
    products.forEach(product => {
        allProductsData.push({
            id: product.id,
            folio: product.folio || generateProductFolio(product.type),
            fecha: product.created_at ? new Date(product.created_at).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES'),
            cita: '', // Los servicios y cursos no tienen cita predefinida
            descripcion: product.name,
            categoria: product.type,
            precio: product.price || 0,
            status: product.status || 'active'
        });
    });
}

// Ordenar tabla
function sortTable(field) {
    if (currentSortField === field) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortDirection = 'asc';
    }
    
    // Actualizar iconos de ordenamiento
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.textContent = '↕';
    });
    
    const currentIcon = document.querySelector(`th[data-field="${field}"] .sort-icon`);
    if (currentIcon) {
        currentIcon.textContent = currentSortDirection === 'asc' ? '↑' : '↓';
    }
    
    renderUnifiedProductsTable();
}

// Inicializar filter modal
function initializeFilterModal() {
    const filterToggleBtn = document.getElementById('filter-toggle-btn');
    const filterModal = document.getElementById('filter-modal');
    const filterModalClose = document.getElementById('filter-modal-close');
    
    if (filterToggleBtn && filterModal) {
        filterToggleBtn.addEventListener('click', () => {
            filterModal.style.display = 'flex';
        });
    }
    
    if (filterModalClose && filterModal) {
        filterModalClose.addEventListener('click', () => {
            filterModal.style.display = 'none';
        });
    }
    
    // Cerrar modal al hacer click fuera de él
    if (filterModal) {
        filterModal.addEventListener('click', (e) => {
            if (e.target === filterModal) {
                filterModal.style.display = 'none';
            }
        });
    }
    
    // Aplicar filtros desde el modal
    const filterInputs = filterModal?.querySelectorAll('input, select');
    if (filterInputs) {
        filterInputs.forEach(input => {
            input.addEventListener('change', applyFiltersFromModal);
            input.addEventListener('input', applyFiltersFromModal);
        });
    }
}

// Aplicar filtros desde el modal
function applyFiltersFromModal() {
    renderUnifiedProductsTable();
}

// Editar producto unificado
function editUnifiedProduct(id) {
    // Solo editar productos reales (servicios y cursos)
    const product = products.find(p => p.id == id);
    if (product) {
        document.getElementById('p-id').value = product.id;
        document.getElementById('p-name').value = product.name;
        document.getElementById('p-type').value = product.type;
        document.getElementById('p-price').value = product.price || '';
        
        // Ya no hay campos de anticipo que mostrar
    }
}

// Cambiar estado del producto
async function toggleProductStatus(id) {
    const product = products.find(p => p.id == id);
    if (!product) return;
    
    const newStatus = product.status === 'cancelled' ? 'active' : 'cancelled';
    const actionText = newStatus === 'cancelled' ? 'cancelar' : 'reactivar';
    
    if (confirm(`¿Estás seguro de que quieres ${actionText} este producto?`)) {
        try {
            const response = await fetch(`/api/products/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...product,
                    status: newStatus
                })
            });
            
            if (response.ok) {
                product.status = newStatus;
                loadUnifiedProductsData();
                renderUnifiedProductsTable();
            }
        } catch (error) {
            alert('Error de conexión al actualizar el producto.');
        }
    }
}

// Eliminar producto unificado
async function deleteUnifiedProduct(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este producto permanentemente?')) {
        try {
            const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
            if (response.ok) {
                products = products.filter(p => p.id != id);
                loadUnifiedProductsData();
                renderUnifiedProductsTable();
                renderProductTables(); // Actualizar también las tablas originales
            }
        } catch (error) {
            alert('Error de conexión al eliminar el producto.');
        }
    }
}

// Los campos de anticipo fueron removidos - ya no son productos

// Función para actualizar tabla unificada después de cambios
function updateUnifiedProductsAfterChange() {
    loadUnifiedProductsData();
    renderUnifiedProductsTable();
}

// Inicializar controles de la tabla unificada
function initializeUnifiedTable() {
    // Inicializar filter modal
    initializeFilterModal();
    
    // Inicializar sorting para columnas
    document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-field');
            if (field) {
                sortTable(field);
            }
        });
    });
    
    // Verificar que los elementos existan antes de agregar listeners
    const productTypeSelect = document.getElementById('p-type');
    
    // Ya no se necesita manejar campos de anticipo en productos
    
    // Solo cargar si hay datos disponibles
    if (typeof products !== 'undefined' && typeof movements !== 'undefined') {
        loadUnifiedProductsData();
        renderUnifiedProductsTable();
    }
}

// Exponer funciones globalmente para uso en onclick
window.sortTable = sortTable;
window.initializeFilterModal = initializeFilterModal;
window.editUnifiedProduct = editUnifiedProduct;
window.toggleProductStatus = toggleProductStatus;
window.deleteUnifiedProduct = deleteUnifiedProduct;

function handleAnticipoSelection() {
    // 1. Primero pedir el monto del anticipo
    let anticipoAmount = prompt('💰 ANTICIPO\n\nIngresa el monto del anticipo:', '');
    if (anticipoAmount === null) return; // Usuario canceló
    
    anticipoAmount = parseFloat(anticipoAmount);
    if (isNaN(anticipoAmount) || anticipoAmount <= 0) {
        alert('⚠️ Por favor ingresa un monto válido para el anticipo');
        return;
    }
    
    // 2. Preguntar tipo con confirm para hacer más fácil la selección
    const esServicio = confirm('🎯 TIPO DE ANTICIPO\n\n¿Es para un SERVICIO?\n\n✅ Aceptar = Servicio\n❌ Cancelar = Curso');
    
    const productType = esServicio ? 'service' : 'course';
    const tipoTexto = esServicio ? 'servicio' : 'curso';
    
    // 3. Obtener productos según el tipo
    const availableProducts = products.filter(p => p.type === productType);
    
    if (availableProducts.length === 0) {
        alert(`❌ No hay ${tipoTexto}s disponibles`);
        return;
    }
    
    // 4. Crear lista numerada para selección (solo nombres, sin precios)
    let productOptions = `🛍️ SELECCIONAR ${tipoTexto.toUpperCase()}\n\n`;
    availableProducts.forEach((product, index) => {
        productOptions += `${index + 1}. ${product.name}\n`;
    });
    
    const selectedIndex = prompt(productOptions + '\n📝 Escribe el número de tu elección:');
    if (selectedIndex === null) return; // Usuario canceló
    
    const productIndex = parseInt(selectedIndex) - 1;
    
    if (isNaN(productIndex) || productIndex < 0 || productIndex >= availableProducts.length) {
        alert('❌ Selección inválida. Intenta de nuevo.');
        return;
    }
    
    const selectedProduct = availableProducts[productIndex];
    const typeLabel = productType === 'course' ? 'Curso' : 'Servicio';
    
    // 5. Crear nombre del anticipo para el ticket (tipo completo en paréntesis)
    const anticipoName = `Anticipo ${selectedProduct.name} $${parseFloat(anticipoAmount).toFixed(2)} (${typeLabel})`;
    
    // 6. Agregar a productos seleccionados
    selectedProducts.push({
        id: 'anticipo-' + Date.now(),
        name: anticipoName,
        price: anticipoAmount,
        quantity: 1, // Los anticipos siempre son cantidad 1
        type: 'anticipo',
        productName: selectedProduct.name,
        productType: productType
        // No incluir originalPrice para evitar confusión en dashboard
    });
    
    renderSelectedProducts();
    calculateTotals();
    showDynamicSections();
    
    // Mensaje de confirmación
    alert(`✅ ANTICIPO AGREGADO\n\n${anticipoName}`);
}

// Modern interface anticipo function
function addAnticipo() {
    const amountInput = document.getElementById('anticipo-amount');
    const commentInput = document.getElementById('anticipo-comment');
    
    const amount = parseFloat(amountInput.value);
    const comment = commentInput.value.trim();
    
    if (!amount || amount <= 0) {
        alert('Por favor ingresa una cantidad válida para el anticipo.');
        return;
    }
    
    // Create anticipo product name
    const anticipoName = comment ? `Anticipo - ${comment}` : 'Anticipo';
    
    // Clear the client field since anticipo doesn't need a specific client
    const clientInput = document.getElementById('m-cliente');
    if (clientInput) {
        clientInput.value = 'Anticipo General';
    }
    
    // Add to cart as a product
    selectedProducts.push({
        id: 'anticipo_' + Date.now(),
        name: anticipoName,
        price: amount,
        quantity: 1,
        type: 'anticipo',
        custom_price: false
    });
    
    // Clear inputs
    amountInput.value = '';
    commentInput.value = '';
    
    // Update cart display
    updateCartDisplay();
    calculateTotals();
    
    // Show confirmation
    alert(`✅ ANTICIPO AGREGADO\n\n${anticipoName}: $${amount.toFixed(2)}`);
}


document.addEventListener('DOMContentLoaded', initializeApp);
