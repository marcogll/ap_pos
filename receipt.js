// PNG Receipt System - Based on broad_idea.png design
// Phase 1: Setup with Assets

class PNGReceiptGenerator {
    constructor() {
        this.pngConfig = {
            scale: 2,
            width: 540, // 1080/2 for mobile format
            height: 960, // 1920/2 for mobile format
            backgroundColor: 'white',
            useCORS: true,
            allowTaint: true,
            ignoreElements: (element) => {
                return element.classList?.contains('no-png');
            }
        };
    }

    hasAnyDiscount(movement) {
        // Check discountInfo.amount
        if (movement.discountInfo && parseFloat(movement.discountInfo.amount || '0') > 0) {
            console.log('🎯 Found discount in discountInfo.amount:', movement.discountInfo.amount);
            return true;
        }

        // Check for descuento field directly
        if (movement.descuento && parseFloat(movement.descuento) > 0) {
            console.log('🎯 Found discount in movement.descuento:', movement.descuento);
            return true;
        }

        // Check for anticipo aplicado in concepto text
        if (movement.concepto && movement.concepto.toLowerCase().includes('anticipo aplicado')) {
            console.log('🎯 Found anticipo in concepto text');
            return true;
        }

        // Check for subtotal vs monto difference (indicating discount)
        const subtotal = parseFloat(movement.subtotal || movement.monto || '0');
        const monto = parseFloat(movement.monto || '0');
        if (subtotal > monto && (subtotal - monto) > 0.01) {
            console.log('🎯 Found discount from subtotal/monto difference:', subtotal - monto);
            return true;
        }

        console.log('❌ No discount found in movement');
        return false;
    }

    extractDiscountInfo(data) {
        // Priority 1: discountInfo structured data
        if (data.discountInfo && parseFloat(data.discountInfo.amount || '0') > 0) {
            return {
                amount: data.discountInfo.amount,
                label: data.tipoDescuento ? `Descuento (${data.tipoDescuento})` : 'Descuento',
                detail: data.motivoDescuento || null
            };
        }

        // Priority 2: direct descuento field
        if (data.descuento && parseFloat(data.descuento) > 0) {
            return {
                amount: data.descuento,
                label: data.tipoDescuento ? `Descuento (${data.tipoDescuento})` : 'Descuento',
                detail: data.motivoDescuento || null
            };
        }

        // Priority 3: Calculate from subtotal vs monto
        const subtotal = parseFloat(data.subtotal || data.monto || '0');
        const monto = parseFloat(data.monto || '0');
        if (subtotal > monto && (subtotal - monto) > 0.01) {
            const discountAmount = (subtotal - monto).toFixed(2);
            return {
                amount: discountAmount,
                label: 'Anticipo Aplicado',
                detail: 'Anticipo manual - no registrado previamente'
            };
        }

        // Priority 4: Extract from concepto text if it mentions anticipo
        if (data.concepto && data.concepto.toLowerCase().includes('anticipo aplicado')) {
            // Try to extract amount from text
            const match = data.concepto.match(/\$(\d+(?:\.\d{2})?)/);
            if (match) {
                return {
                    amount: match[1],
                    label: 'Anticipo Aplicado',
                    detail: 'Anticipo manual'
                };
            }
        }

        // Fallback
        return {
            amount: '0.00',
            label: 'Descuento',
            detail: null
        };
    }

    analyzeTicketType(movement) {
        console.log('🔍 Analyzing movement for discounts:', {
            discountInfo: movement.discountInfo,
            descuento: movement.descuento,
            subtotal: movement.subtotal,
            monto: movement.monto,
            concepto: movement.concepto
        });

        const analysis = {
            // Basic ticket analysis
            hasAppointment: !!(movement.fechaCita && movement.horaCita),
            isAnticipo: movement.tipo === 'Anticipo' ||
                       movement.concepto?.toLowerCase().includes('anticipo'),
            hasAnticipoApplied: movement.discountInfo?.type === 'anticipo',
            hasConsent: movement.client?.consentimiento || movement.client?.esOncologico,
            isOncology: movement.client?.esOncologico,

            // Service type detection
            isService: movement.tipo === 'service' || movement.tipo === 'Service',
            isCourse: movement.tipo === 'course' || movement.tipo === 'Curso',

            // Payment analysis - check multiple fields for discounts/anticipos
            hasDiscount: this.hasAnyDiscount(movement),
            isWarriorDiscount: movement.discountInfo?.type === 'warrior',

            // Client type analysis
            hasClientInfo: !!(movement.client && movement.client.nombre),
            hasClientPhone: !!(movement.client && movement.client.telefono),

            // Medical info analysis
            hasMedicalInfo: function() {
                return this.isOncology && movement.client && (
                    movement.client.nombreMedico ||
                    movement.client.telefonoMedico ||
                    movement.client.cedulaMedico
                );
            },

            // Anticipo logic
            needsAnticipoNotes: function() {
                // Show anticipo notes only for pure anticipos (not applied to services)
                return this.isAnticipo && !this.hasAnticipoApplied;
            },

            // Check if service is PMU related
            isPMUService: function() {
                const pmuKeywords = ['microblading', 'pmu', 'pigmentacion', 'cejas', 'labios', 'vanity brows', 'brows'];
                const concepto = movement.concepto?.toLowerCase() || '';
                return pmuKeywords.some(keyword => concepto.includes(keyword));
            },

            // Determine main ticket category
            getTicketCategory: function() {
                if (this.isAnticipo && !this.hasAnticipoApplied) return 'anticipo-puro';
                if (this.isService && this.hasAnticipoApplied) return 'servicio-con-anticipo';
                if (this.isService && this.hasConsent && this.isOncology && this.isPMUService()) return 'servicio-oncologico';
                if (this.isService && this.hasConsent && this.isPMUService()) return 'servicio-con-consentimiento';
                if (this.isService && this.hasAppointment) return 'servicio-con-cita';
                if (this.isService) return 'servicio-simple';
                if (this.isCourse) return 'curso';
                return 'otros';
            }
        };

        console.log('🔍 Analysis result - hasDiscount:', analysis.hasDiscount);
        console.log('🔍 Analysis result - discountInfo amount:', movement.discountInfo?.amount);

        return analysis;
    }

    // Enhanced data mapping system
    mapMovementData(movement) {
        return {
            // Basic info
            folio: movement.folio || 'N/A',
            fecha: this.formatDate(movement.fecha) || new Date().toLocaleDateString('es-MX'),
            concepto: movement.concepto || movement.serviceName || 'Servicio',
            monto: this.formatAmount(movement.monto || movement.total || '0'),
            metodo: movement.metodo || movement.paymentMethod || 'No especificado',
            staff: movement.staff || movement.attendedBy || 'Ale Ponce',

            // Client info
            cliente: this.getClientName(movement),
            telefonoCliente: this.getClientPhone(movement),

            // Appointment info
            fechaCita: movement.fechaCita || movement.appointmentDate,
            horaCita: movement.horaCita || movement.appointmentTime,

            // Discount/anticipo info
            subtotal: this.formatAmount(movement.subtotal || movement.monto),
            descuento: this.formatAmount(movement.discountInfo?.amount || '0'),
            tipoDescuento: movement.discountInfo?.type || null,
            motivoDescuento: movement.discountInfo?.reason || null,

            // Client object
            client: movement.client || {},

            // Original movement for reference
            originalMovement: movement
        };
    }

    // Helper functions for data formatting
    formatDate(dateStr) {
        if (!dateStr) return null;
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr; // Invalid date
            return date.toLocaleDateString('es-MX', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            return dateStr;
        }
    }

    formatAmount(amount) {
        if (!amount) return '0.00';
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return numAmount.toFixed(2);
    }

    getClientName(movement) {
        if (movement.cliente) return movement.cliente;
        if (movement.client?.nombre) return movement.client.nombre;
        if (movement.clientName) return movement.clientName;
        return 'Cliente General';
    }

    getClientPhone(movement) {
        if (movement.telefonoCliente) return movement.telefonoCliente;
        if (movement.client?.telefono) return movement.client.telefono;
        if (movement.clientPhone) return movement.clientPhone;
        return null;
    }

    // Dynamic template generation based on ticket type
    generateReceiptHTML(movement, ticketType) {
        const data = this.mapMovementData(movement);
        const category = ticketType.getTicketCategory();

        return `
            <div class="receipt-wrapper" style="width: 540px; min-height: 960px; background: url('./assets/receipt/background.png') center/cover; position: relative; font-family: 'Montserrat', sans-serif; color: #333; padding: 40px;">
                <div class="receipt-card" style="position: relative; z-index: 2; background: rgba(255,255,255,0.95); border-radius: 20px; padding: 40px 30px; min-height: calc(100% - 80px); box-sizing: border-box; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">

                    ${this.generateMobileHeader()}
                    ${this.generateMobileTitle()}
                    ${this.generateMobileBasicInfo(data)}
                    ${this.generateMobileServicesTable(data, ticketType)}
                    ${this.generateMobileTotalsSection(data, ticketType)}
                    ${this.generateCategorySpecificSections(data, ticketType, category)}
                    ${this.generateMobileFooter()}

                </div>
            </div>
        `;
    }

    generateMobileHeader() {
        return `
            <div class="mobile-header" style="text-align: center; margin-bottom: 25px; padding-top: 15px;">
                <img src="./assets/receipt/isotipo.svg" alt="ap" style="width: 22%; max-width: 140px; height: auto; margin-bottom: 15px;" />
                <div class="logotipo" style="text-align: center;">
                    <div class="business-name" style="font-size: 14px; font-weight: 700; color: #000; margin-bottom: 5px; letter-spacing: 1px;">ALEJANDRA PONCE</div>
                    <div class="business-tagline" style="font-size: 10px; color: #666; font-weight: 400; letter-spacing: 1px;">BEAUTY EXPERT • MASTER TRAINER</div>
                </div>
            </div>
        `;
    }

    generateHeader() {
        return `
            <div class="receipt-header">
                <div class="logo-section">
                    <div class="logo-text">ap</div>
                </div>
                <div class="business-info">
                    <div class="business-name">ALEJANDRA PONCE</div>
                    <div class="business-tagline">BEAUTY EXPERT • MASTER TRAINER</div>
                </div>
            </div>
        `;
    }

    generateMobileTitle() {
        return `
            <div class="mobile-title" style="text-align: center; margin-bottom: 25px;">
                <img src="./assets/receipt/comprobante-title.svg" alt="COMPROBANTE DE PAGO" style="width: 51%; max-width: 238px; height: auto;" />
            </div>
        `;
    }

    generateTitle() {
        return `
            <div class="receipt-title">
                <h1>COMPROBANTE DE PAGO</h1>
            </div>
        `;
    }

    generateMobileBasicInfo(data) {
        return `
            <div class="mobile-client-info" style="margin-bottom: 20px;">
                <div style="margin-bottom: 15px;">
                    <span style="font-size: 14px; color: #666; font-weight: 400;">Cliente: </span>
                    <span style="font-size: 16px; color: #000; font-weight: 700;">${data.cliente}</span>
                </div>
                ${data.telefonoCliente ? `
                    <div style="margin-bottom: 15px;">
                        <span style="font-size: 14px; color: #666; font-weight: 400;">Contacto: </span>
                        <span style="font-size: 14px; color: #000; font-weight: 500;">${data.telefonoCliente}</span>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; gap: 20px;">
                    <div style="flex: 1;">
                        <div style="font-size: 14px; color: #666; font-weight: 400; margin-bottom: 3px;">Folio</div>
                        <div style="font-size: 16px; color: #000; font-weight: 700;">${data.folio}</div>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 14px; color: #666; font-weight: 400; margin-bottom: 3px;">Fecha</div>
                        <div style="font-size: 16px; color: #000; font-weight: 700;">${data.fecha}</div>
                    </div>
                </div>
            </div>
        `;
    }

    generateBasicInfo(data) {
        return `
            <div class="receipt-info">
                <div class="info-row">
                    <span class="label">Folio</span>
                    <span class="value">${data.folio}</span>
                </div>
                <div class="info-row">
                    <span class="label">Fecha</span>
                    <span class="value">${data.fecha}</span>
                </div>
            </div>
        `;
    }

    generateMobileClientInfo(data, ticketType) {
        return ``;  // Esta función ya no se usa, la info del cliente se movió a generateMobileBasicInfo
    }

    generateClientInfo(data, ticketType) {
        return `
            <div class="client-info">
                <div class="client-row">
                    <span class="client-label">Cliente:</span>
                    <span class="client-name">${data.cliente}</span>
                </div>
                ${data.telefonoCliente ? `
                    <div class="client-row">
                        <span class="client-label">Contacto:</span>
                        <span class="client-contact">${data.telefonoCliente}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    generateMobileServicesTable(data, ticketType) {
        console.log('🔍 Services table - hasDiscount:', ticketType.hasDiscount);
        console.log('🔍 Services table - descuento amount:', data.descuento);
        console.log('🔍 Services table - discountInfo:', data.originalMovement?.discountInfo);
        return `
            <div class="mobile-services" style="margin-bottom: 30px;">
                <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
                    <thead>
                        <tr style="background: #f8f8f8;">
                            <th style="padding: 10px 8px; text-align: left; font-size: 14px; font-weight: 700; border-right: 2px solid #000; width: 70%;">Descripción</th>
                            <th style="padding: 10px 8px; text-align: right; font-size: 14px; font-weight: 700; width: 30%;">Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style="padding: 12px 8px; border-right: 2px solid #000; border-top: 2px solid #000; font-size: 14px; color: #333; vertical-align: top; line-height: 1.4;">${data.concepto}</td>
                            <td style="padding: 12px 8px; border-top: 2px solid #000; text-align: right; font-size: 16px; color: #000; font-weight: 700;">$${data.monto}</td>
                        </tr>
                        ${ticketType.hasDiscount ? this.generateMobileDiscountTableRow(data) : ''}
                    </tbody>
                </table>
            </div>
        `;
    }

    generateServicesTable(data, ticketType) {
        return `
            <div class="services-table">
                <div class="table-header">
                    <div class="description-header">Description</div>
                    <div class="amount-header">Amount</div>
                </div>
                <div class="table-content">
                    <div class="service-row">
                        <div class="service-description">${data.concepto}</div>
                        <div class="service-amount">$${data.monto}</div>
                    </div>
                    ${ticketType.hasDiscount ? this.generateDiscountRow(data) : ''}
                </div>
            </div>
        `;
    }

    generateMobileDiscountTableRow(data) {
        const discountInfo = this.extractDiscountInfo(data);
        console.log('🎨 Generating discount row with extracted info:', discountInfo);

        return `
            <tr>
                <td style="padding: 12px 8px; border-right: 2px solid #000; border-top: 2px solid #000; font-size: 14px; color: #999; vertical-align: top; line-height: 1.4;">
                    ${discountInfo.label}
                    ${discountInfo.detail ? `<br><span style="font-size: 12px;">${discountInfo.detail}</span>` : ''}
                </td>
                <td style="padding: 12px 8px; border-top: 2px solid #000; text-align: right; font-size: 16px; color: #e74c3c; font-weight: 600;">-$${discountInfo.amount}</td>
            </tr>
        `;
    }

    generateAppointmentInTotals(data) {
        const fechaCita = data.fechaCita ? this.formatDate(data.fechaCita) : null;
        const citaText = fechaCita && data.horaCita ? `${fechaCita} - ${data.horaCita}` : 'Por confirmar';
        return `
            <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #ccc;">
                <div style="font-size: 11px; color: #666; text-align: center;">🗓️ Tu cita es: ${citaText}</div>
            </div>
        `;
    }

    generateMobileDiscountRow(data) {
        const discountInfo = this.extractDiscountInfo(data);
        return `
            <div style="border-top: 1px dashed #ddd; padding-top: 15px; margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="font-size: 14px; color: #999; flex: 1; line-height: 1.4;">
                        ${discountInfo.label}
                        ${discountInfo.detail ? `<br><span style="font-size: 12px;">${discountInfo.detail}</span>` : ''}
                    </div>
                    <div style="font-size: 16px; color: #e74c3c; font-weight: 600; margin-left: 15px;">-$${discountInfo.amount}</div>
                </div>
            </div>
        `;
    }

    generateDiscountRow(data) {
        const discountInfo = this.extractDiscountInfo(data);
        return `
            <div class="service-row discount-row">
                <div class="service-description">
                    ${discountInfo.label}
                    ${discountInfo.detail ? `<br><small>${discountInfo.detail}</small>` : ''}
                </div>
                <div class="service-amount discount-amount">-$${discountInfo.amount}</div>
            </div>
        `;
    }

    generateMobileTotalsSection(data, ticketType) {
        return `
            <div class="mobile-totals" style="margin-bottom: 20px; margin-top: 15px; padding: 12px; background: rgba(0,0,0,0.05); border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #000;">
                    <span style="font-size: 16px; color: #000; font-weight: 700;">Total Pagado</span>
                    <span style="font-size: 20px; color: #000; font-weight: 700;">$${data.monto}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 12px; color: #000; font-weight: 700;">Método de Pago:</span>
                    <span style="font-size: 12px; color: #000; font-weight: 500;">${data.metodo}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 12px; color: #000; font-weight: 700;">Te atendió:</span>
                    <span style="font-size: 12px; color: #000; font-weight: 500;">${data.staff}</span>
                </div>
                ${ticketType.hasAppointment ? this.generateAppointmentInTotals(data) : ''}
            </div>
        `;
    }

    generateTotalsSection(data, ticketType) {
        return `
            <div class="totals-section">
                <div class="total-row">
                    <span class="total-label">Total Paid</span>
                    <span class="total-amount">$${data.monto}</span>
                </div>
                <div class="payment-row">
                    <span class="payment-label">Payment Method:</span>
                    <span class="payment-method">${data.metodo}</span>
                </div>
                <div class="staff-row">
                    <span class="staff-label">Te atendió:</span>
                    <span class="staff-name">${data.staff}</span>
                </div>
            </div>
        `;
    }

    generateCategorySpecificSections(data, ticketType, category) {
        let sections = '';

        // Add category-specific content
        switch (category) {
            case 'anticipo-puro':
                sections += this.generateAnticipoSection();
                break;
            case 'servicio-oncologico':
                sections += this.generateOncologySection(data);
                break;
            case 'servicio-con-consentimiento':
                sections += this.generateConsentSection();
                break;
            case 'curso':
                sections += this.generateCourseSection();
                break;
        }

        return sections;
    }

    generateAppointmentSection(data) {
        return `
            <div class="appointment-section" style="background: rgba(240,248,255,0.8); padding: 15px; border-left: 4px solid #007bff; margin: 15px 0; border-radius: 5px;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #0056b3;">📅 Información de Cita</h4>
                <p style="margin: 5px 0; font-size: 12px; line-height: 1.4; color: #333;"><strong>Fecha:</strong> ${data.fechaCita || 'Por confirmar'}</p>
                <p style="margin: 5px 0; font-size: 12px; line-height: 1.4; color: #333;"><strong>Hora:</strong> ${data.horaCita || 'Por confirmar'}</p>
            </div>
        `;
    }

    generateAnticipoSection() {
        return `
            <div class="anticipo-section" style="background: rgba(255,248,220,0.8); padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; border-radius: 5px;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #b8860b;">💰 Notas del Anticipo</h4>
                <p style="margin: 8px 0; font-size: 12px; line-height: 1.4; color: #333;">Al dejar tu anticipo, te agradecemos tu compromiso con nuestro tiempo, de la misma forma en que nosotros respetamos el tuyo.</p>
                <p style="margin: 8px 0; font-size: 12px; line-height: 1.4; color: #333;">Las cancelaciones con menos de 48 horas no son reembolsables.</p>
            </div>
        `;
    }

    generateConsentSection() {
        return `
            <div class="consent-section" style="background: rgba(255,248,220,0.8); padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; border-radius: 5px;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: #b8860b;">📋 Consentimiento Médico</h4>
                <p style="margin: 5px 0; font-size: 12px; line-height: 1.4;">✅ Cliente ha proporcionado consentimiento médico informado completo</p>
                <p style="margin: 5px 0; font-size: 12px; line-height: 1.4;">Se han explicado los procedimientos, riesgos y cuidados post-tratamiento</p>
            </div>
        `;
    }

    generateOncologySection(data) {
        const client = data.client;
        return `
            <div class="oncology-section" style="background: rgba(255,240,245,0.8); padding: 12px; border-left: 4px solid #dc3545; margin: 15px 0; border-radius: 5px;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #dc3545;">🎗️ Consentimiento Oncológico</h4>
                <p style="margin: 4px 0; font-size: 11px; line-height: 1.3; color: #333;">El cliente declara ser paciente oncológico y que la información de su médico es veraz.</p>
                ${client.nombreMedico ? `<p style="margin: 3px 0; font-size: 11px; line-height: 1.3; color: #333;"><strong>Médico:</strong> ${client.nombreMedico}</p>` : ''}
                ${client.cedulaMedico ? `<p style="margin: 3px 0; font-size: 11px; line-height: 1.3; color: #333;"><strong>Cédula:</strong> ${client.cedulaMedico}</p>` : ''}
                <p style="margin: 4px 0 0 0; font-size: 10px; line-height: 1.3; color: #666;">Al consentir el servicio, declara que la información médica proporcionada es veraz.</p>
            </div>
        `;
    }

    generateCourseSection() {
        return `
            <div class="course-section">
                <h4>🎓 Información del Curso</h4>
                <p>✅ Inscripción confirmada al programa educativo</p>
                <p>Términos y condiciones del curso aceptados</p>
                <p>Para consultas sobre fechas y material, contactar directamente</p>
            </div>
        `;
    }

    generateMobileFooter() {
        return `
            <div class="mobile-footer" style="text-align: center; padding: 15px 10px; margin-top: 10px;">
                <div style="font-size: 12px; color: #666; margin-bottom: 8px; font-weight: 300;">Si tienes alguna duda o pregunta</div>
                <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 12px;">
                    <span style="font-size: 16px;">📱</span>
                    <span style="font-size: 16px;">📞</span>
                </div>
                <div style="font-size: 14px; line-height: 1.3; color: #333;">
                    <div style="font-weight: 300; margin-bottom: 2px;">Muchas gracias por confiar tu</div>
                    <div style="font-weight: 600;">belleza en mí <span style="color: #e74c3c;">🤍</span></div>
                </div>
            </div>
        `;
    }

    generateFooter() {
        return `
            <div class="receipt-footer">
                <div class="contact-text">Si tienes alguna duda o pregunta</div>
                <div class="contact-icons">
                    <span class="whatsapp-icon">📱</span>
                    <span class="phone-icon">📞</span>
                </div>
                <div class="thank-you">
                    <span class="thank-text">Muchas gracias por confiar tu</span>
                    <span class="beauty-text">belleza en mí</span>
                    <span class="heart-icon">🤍</span>
                </div>
            </div>
        `;
    }

    async downloadReceiptPNG(movementId, movementData = null) {
        try {
            console.log('🎨 PNG Receipt Generator - Starting generation for:', movementId);
            console.log('📋 Movement data provided:', movementData);

            // Check dependencies
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas library not loaded');
            }
            if (typeof saveAs === 'undefined') {
                throw new Error('FileSaver library not loaded');
            }

            // Get movement data - use provided data or fetch test data
            const movement = movementData || await this.getMovementById(movementId);
            console.log('📄 Final movement data:', movement);

            // Analyze ticket type
            const ticketType = this.analyzeTicketType(movement);
            console.log('🔍 Ticket type analysis:', ticketType);

            // Generate HTML
            const receiptHTML = this.generateReceiptHTML(movement, ticketType);
            console.log('🏗️ Generated HTML length:', receiptHTML.length);

            // Create temporary DOM element with mobile dimensions
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = receiptHTML;
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '-9999px';
            tempDiv.style.width = '540px';
            tempDiv.style.height = '960px';
            tempDiv.style.backgroundColor = 'white';
            tempDiv.style.fontFamily = "'Montserrat', sans-serif";
            tempDiv.style.overflow = 'hidden';

            // Apply receipt styles and ensure CSS is loaded
            tempDiv.className = 'receipt-container';

            // Create and inject CSS link to ensure styles are applied
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'receipt.css';
            if (!document.querySelector('link[href="receipt.css"]')) {
                document.head.appendChild(cssLink);
            }

            // Ensure child element has proper mobile dimensions too
            const tempElement = tempDiv.firstElementChild;
            if (tempElement) {
                tempElement.style.width = '540px';
                tempElement.style.height = '960px';
                tempElement.style.backgroundColor = 'white';
                tempElement.style.fontFamily = "'Montserrat', sans-serif";
                tempElement.style.display = 'block';
                tempElement.style.overflow = 'hidden';
            }

            document.body.appendChild(tempDiv);
            console.log('📐 Temp div created and added to DOM with explicit dimensions');

            // Wait for DOM to settle, CSS to load, and images to load
            console.log('⏳ Waiting for DOM to settle, CSS to load, and images to load...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Longer wait for CSS
            await this.waitForImages(tempDiv);
            console.log('✅ Images loaded and DOM settled');

            // Log element dimensions before canvas creation
            const rect = tempDiv.getBoundingClientRect();
            const childRect = tempElement?.getBoundingClientRect();
            console.log('📏 Temp div dimensions:', rect?.width, 'x', rect?.height);
            console.log('📏 Child element dimensions:', childRect?.width, 'x', childRect?.height);

            // Force a reflow to ensure all dimensions are calculated
            tempDiv.offsetHeight;
            if (tempElement) tempElement.offsetHeight;

            // Use the element with the most reliable dimensions
            const elementToCapture = tempElement || tempDiv;
            const finalRect = elementToCapture.getBoundingClientRect();
            console.log('📏 Final element to capture dimensions:', finalRect?.width, 'x', finalRect?.height);

            // Convert to PNG with mobile config
            console.log('🖼️ Converting to PNG with html2canvas...');
            const adjustedConfig = {
                scale: 2,
                width: 540,
                height: 960,
                backgroundColor: 'white',
                useCORS: true,
                allowTaint: true,
                removeContainer: false
            };
            console.log('🔧 Using canvas config:', adjustedConfig);

            const canvas = await html2canvas(elementToCapture, adjustedConfig);
            console.log('✅ Canvas created, dimensions:', canvas.width, 'x', canvas.height);

            // Clean up
            document.body.removeChild(tempDiv);
            console.log('🧹 Temporary DOM element removed');

            // Download
            console.log('💾 Creating blob and downloading...');
            canvas.toBlob(blob => {
                if (blob) {
                    saveAs(blob, `Ticket_${movement.folio}.png`);
                    console.log('🎉 PNG receipt downloaded successfully:', `Ticket_${movement.folio}.png`);
                } else {
                    throw new Error('Failed to create blob from canvas');
                }
            });

        } catch (error) {
            console.error('❌ Error generating receipt:', error);
            alert('Error al generar el recibo PNG: ' + error.message);
        }
    }

    async waitForImages(container) {
        const images = container.querySelectorAll('img');
        const imagePromises = Array.from(images).map(img => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if image fails to load
                }
            });
        });
        await Promise.all(imagePromises);
    }

    async getMovementById(movementId) {
        // Placeholder - will integrate with actual movement retrieval
        // For now, return different test scenarios based on movementId

        const testScenarios = {
            'TEST-001': {
                // Servicio simple
                id: movementId,
                folio: 'AP-001',
                fecha: '2025-09-14',
                cliente: 'Ana García',
                telefonoCliente: '+52 614 123 4567',
                concepto: 'Pestañas Volumen Ruso',
                monto: '1200.00',
                metodo: 'Efectivo',
                staff: 'Ale Ponce',
                tipo: 'service',
                client: { nombre: 'Ana García', telefono: '+52 614 123 4567' }
            },

            'TEST-002': {
                // Servicio con cita
                id: movementId,
                folio: 'AP-002',
                fecha: '2025-09-14',
                cliente: 'María López',
                concepto: 'Microblading Completo',
                monto: '2500.00',
                metodo: 'Tarjeta',
                staff: 'Ale Ponce',
                fechaCita: '2025-09-20',
                horaCita: '10:00',
                tipo: 'service',
                client: { nombre: 'María López' }
            },

            'TEST-003': {
                // Anticipo puro
                id: movementId,
                folio: 'AP-003',
                fecha: '2025-09-14',
                cliente: 'Carmen Ruiz',
                concepto: 'Anticipo - Pestañas',
                monto: '500.00',
                metodo: 'Transferencia',
                staff: 'Ale Ponce',
                fechaCita: '2025-09-25',
                horaCita: '14:00',
                tipo: 'Anticipo',
                client: { nombre: 'Carmen Ruiz' }
            },

            'TEST-004': {
                // Servicio con anticipo aplicado
                id: movementId,
                folio: 'AP-004',
                fecha: '2025-09-14',
                cliente: 'Laura Pérez',
                concepto: 'Pestañas Mega Volumen',
                monto: '800.00',
                subtotal: '1300.00',
                metodo: 'Efectivo',
                staff: 'Ale Ponce',
                tipo: 'service',
                discountInfo: {
                    type: 'anticipo',
                    amount: '500.00',
                    reason: 'Anticipo aplicado'
                },
                client: { nombre: 'Laura Pérez' }
            },

            'TEST-005': {
                // Paciente oncológico
                id: movementId,
                folio: 'AP-005',
                fecha: '2025-09-14',
                cliente: 'Elena Martínez',
                concepto: 'Microblading Oncológico',
                monto: '0.00',
                metodo: 'Cortesía',
                staff: 'Ale Ponce',
                fechaCita: '2025-09-18',
                horaCita: '11:00',
                tipo: 'service',
                discountInfo: {
                    type: 'warrior',
                    amount: '2500.00',
                    reason: 'Programa Vanity Warriors'
                },
                client: {
                    nombre: 'Elena Martínez',
                    telefono: '+52 614 987 6543',
                    consentimiento: true,
                    esOncologico: true,
                    nombreMedico: 'Dr. Carlos Hernández',
                    telefonoMedico: '+52 614 555 0123',
                    cedulaMedico: 'CED-789456'
                }
            },

            'TEST-006': {
                // Curso
                id: movementId,
                folio: 'AP-006',
                fecha: '2025-09-14',
                cliente: 'Sofia Vargas',
                concepto: 'Curso Básico de Pestañas',
                monto: '3500.00',
                metodo: 'Transferencia',
                staff: 'Ale Ponce',
                tipo: 'course',
                client: {
                    nombre: 'Sofia Vargas',
                    telefono: '+52 614 456 7890',
                    consentimiento: true
                }
            }
        };

        // Return test scenario or default
        return testScenarios[movementId] || testScenarios['TEST-001'];
    }
}

// Global instance
window.pngReceiptGenerator = new PNGReceiptGenerator();

// Global function for easy access
window.downloadReceiptPNG = function(movementId) {
    window.pngReceiptGenerator.downloadReceiptPNG(movementId);
};

console.log('PNG Receipt Generator initialized successfully (based on broad_idea.png design)');