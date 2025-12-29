/**
 * Ticket Renderer Module - Creación y renderizado de tickets
 * Generador de Tickets v2
 */
(function (global) {
    'use strict';

    /**
     * Crea un ticket con datos personalizados y validación
     * @param {number} ticketNumber - Número del ticket
     * @param {Object} config - Configuración del ticket
     * @returns {HTMLElement|null} - Elemento del ticket o null si falla
     */
    function createTicket(ticketNumber, config) {
        if (!config) {
            console.error('Config is required for createTicket');
            return null;
        }

        const template = document.getElementById('ticketTemplate');
        if (!template) {
            console.error('Ticket template not found');
            return null;
        }

        const ticketClone = template.cloneNode(true);
        ticketClone.style.display = 'block';
        ticketClone.id = '';

        const ticket = ticketClone.querySelector('.ticket');
        if (!ticket) {
            console.error('Ticket element not found in template');
            return null;
        }

        // Actualizar imagen de fondo (solo si hay una URL válida)
        const imageDiv = ticket.querySelector('.image');
        if (imageDiv && config.imageUrl && config.imageUrl.trim() !== '') {
            imageDiv.style.backgroundImage = `url("${config.imageUrl}")`;
            imageDiv.style.backgroundSize = 'cover';
            imageDiv.style.backgroundPosition = 'center';
            imageDiv.style.backgroundRepeat = 'no-repeat';
        }

        // Actualizar textos de marca lateral
        const admitOneSpans = ticket.querySelectorAll('.admit-one span');
        admitOneSpans.forEach(span => {
            span.textContent = config.brandText;
        });

        // Actualizar números de ticket (izquierda y derecha)
        const leftTicketNumber = ticket.querySelector('.left .ticket-number p');
        if (leftTicketNumber) {
            leftTicketNumber.textContent = '#' + formatTicketNumber(ticketNumber);
        }

        const rightTicketNumber = ticket.querySelector('.right p.ticket-number');
        if (rightTicketNumber) {
            rightTicketNumber.textContent = '#' + formatTicketNumber(ticketNumber);
        }

        // Actualizar fecha
        const dateSpans = ticket.querySelectorAll('.date span');
        if (dateSpans.length >= 3) {
            dateSpans[0].textContent = config.dayOfWeek;
            dateSpans[1].textContent = config.dateText;
            dateSpans[2].textContent = config.year;

            if (config.dateColor && dateSpans[1]) {
                dateSpans[1].style.color = config.dateColor;
            }
        }

        // Actualizar títulos del evento (izquierda y derecha)
        const leftH1 = ticket.querySelector('.left .show-name h1');
        const rightH1 = ticket.querySelector('.right .show-name h1');

        if (leftH1) {
            leftH1.textContent = config.eventTitle;
            if (config.titleFont) {
                leftH1.style.fontFamily = `"${config.titleFont}", sans-serif`;
            }
            if (config.titleColor) {
                leftH1.style.color = config.titleColor;
            }

            // Ajuste automático de fuente para títulos largos
            let fontSize = config.titleSize || 45;
            if (config.eventTitle && config.eventTitle.length > 15) {
                fontSize = Math.max(24, fontSize - (config.eventTitle.length - 15) * 1.2);
            }
            leftH1.style.fontSize = fontSize + 'px';
        }

        if (rightH1) {
            rightH1.textContent = config.eventTitle;
            if (config.titleFont) {
                rightH1.style.fontFamily = `"${config.titleFont}", sans-serif`;
            }
            if (config.titleColor) {
                rightH1.style.color = config.titleColor;
            }
        }

        const showNameH2 = ticket.querySelectorAll('.show-name h2');
        showNameH2.forEach(h2 => {
            h2.textContent = config.eventSubtitle;
            if (config.subtitleFont) {
                h2.style.fontFamily = `"${config.subtitleFont}", cursive`;
            }
            if (config.subtitleColor) {
                h2.style.color = config.subtitleColor;
            }
            if (config.subtitleSize) {
                h2.style.fontSize = config.subtitleSize + 'px';
            }
        });

        // Actualizar tipo de vale
        const timePs = ticket.querySelectorAll('.time p');
        timePs.forEach(p => {
            p.textContent = '';
            p.appendChild(document.createTextNode('VALE POR '));

            const span = document.createElement('span');
            span.textContent = config.voucherQuantity;
            p.appendChild(span);

            p.appendChild(document.createTextNode(' ' + config.voucherType));

            if (config.voucherColor) {
                p.style.color = config.voucherColor;
            }
            if (config.voucherFont) {
                p.style.fontFamily = `"${config.voucherFont}", sans-serif`;
            }
        });

        // Actualizar ubicación
        const locationSpans = ticket.querySelectorAll('.location span');
        if (locationSpans.length >= 3) {
            locationSpans[0].textContent = config.location1;
            if (config.location2 && config.location2.trim() !== '') {
                locationSpans[1].textContent = '•';
                locationSpans[2].textContent = config.location2;
            } else {
                locationSpans[1].textContent = '';
                locationSpans[2].textContent = '';
            }
        }

        // Actualizar código QR
        const barcodeImg = ticket.querySelector('.barcode img');
        if (barcodeImg) {
            barcodeImg.src = config.qrUrl;
        }

        // Modo compacto: ocultar sección central (ticket-info)
        if (config.ticketMode === 'compact') {
            const ticketInfo = ticket.querySelector('.ticket-info');
            if (ticketInfo) {
                ticketInfo.style.display = 'none';
            }
            ticket.classList.add('ticket-compact');
        }

        return ticket;
    }

    /**
     * Genera vista previa en vivo de los tickets
     */
    function generateLivePreview() {
        const config = getConfig();
        const previewContainer = getElement('previewContainer', false);

        if (!previewContainer) {
            console.warn('Preview container no encontrado, saltando preview');
            return;
        }

        // Limpiar contenedor y usar DocumentFragment para mejor rendimiento
        previewContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();

        // Limitar la vista previa
        const appConfig = global.APP_CONFIG || { PREVIEW: { MAX_TICKETS_SHOWN: 10 } };
        const maxPreview = Math.min(config.endNumber - config.startNumber + 1, appConfig.PREVIEW.MAX_TICKETS_SHOWN);

        // Generar tickets de muestra
        for (let i = 0; i < maxPreview; i++) {
            const ticketNumber = config.startNumber + i;
            const ticket = createTicket(ticketNumber, config);
            if (ticket) fragment.appendChild(ticket);
        }

        // Si hay más tickets, mostrar mensaje
        const totalTickets = config.endNumber - config.startNumber + 1;
        if (totalTickets > appConfig.PREVIEW.MAX_TICKETS_SHOWN) {
            const moreInfo = document.createElement('div');
            moreInfo.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 20px; color: #4a437e; font-size: 18px; font-weight: bold;';

            const icon = document.createElement('i');
            icon.className = 'fas fa-info-circle';
            moreInfo.appendChild(icon);

            moreInfo.appendChild(document.createTextNode(` Mostrando ${appConfig.PREVIEW.MAX_TICKETS_SHOWN} de ${totalTickets} tickets. Todos se generarán al imprimir.`));
            fragment.appendChild(moreInfo);
        }

        previewContainer.appendChild(fragment);
    }

    // Exportar al namespace global
    global.TicketRenderer = {
        createTicket,
        generateLivePreview
    };

    // También exponer individualmente para compatibilidad
    global.createTicket = createTicket;
    global.generateLivePreview = generateLivePreview;

})(window);
