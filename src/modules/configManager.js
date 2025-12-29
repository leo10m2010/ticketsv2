/**
 * Config Manager Module - Gestión de configuración
 * Generador de Tickets v2
 */
(function (global) {
    'use strict';

    /**
     * Obtiene la configuración actual del formulario
     * @returns {Object} - Configuración del ticket
     */
    function getConfig() {
        const startNumber = parseInt(document.getElementById('startNumber').value) || 1;
        const endNumber = parseInt(document.getElementById('endNumber').value) || 50;

        // Validar rangos
        if (startNumber < 1) {
            toast.warning('El número inicial debe ser mayor a 0', 'Valor inválido');
            throw new Error('Número inicial inválido');
        }

        if (endNumber < startNumber) {
            toast.warning('El número final debe ser mayor o igual al inicial', 'Rango inválido');
            throw new Error('Rango de números inválido');
        }

        // Obtener URL del QR cacheado
        const qrUrl = global.QRGenerator ? global.QRGenerator.getCachedQRUrl() : '';

        return {
            startNumber,
            endNumber,
            ticketsPerPage: parseInt(document.getElementById('ticketsPerPage').value) || 6,
            ticketMode: document.getElementById('ticketMode')?.value || 'full',
            dayOfWeek: (document.getElementById('dayOfWeek').value || '').trim(),
            dateText: (document.getElementById('dateText').value || '').trim(),
            year: parseInt(document.getElementById('year').value) || new Date().getFullYear(),
            dateColor: document.getElementById('dateColor').value || '#000000',
            eventTitle: (document.getElementById('eventTitle').value || '').trim(),
            eventSubtitle: (document.getElementById('eventSubtitle').value || '').trim(),
            titleFont: document.getElementById('titleFont').value || 'Poppins',
            subtitleFont: document.getElementById('subtitleFont').value || 'Poppins',
            titleColor: document.getElementById('titleColor').value || '#000000',
            subtitleColor: document.getElementById('subtitleColor').value || '#000000',
            brandText: (document.getElementById('brandText').value || 'TICKET').trim(),
            voucherType: (document.getElementById('voucherType').value || '').trim(),
            voucherQuantity: document.getElementById('voucherQuantity').value || '1',
            voucherFont: document.getElementById('voucherFont').value || 'Poppins',
            voucherColor: document.getElementById('voucherColor').value || '#000000',
            location1: (document.getElementById('location1').value || '').trim(),
            location2: (document.getElementById('location2').value || '').trim(),
            imageUrl: document.getElementById('imageUrl').value || '',
            qrLink: document.getElementById('qrLink').value || '',
            qrUrl: qrUrl,
            titleSize: parseInt(document.getElementById('titleSize').value) || 48,
            subtitleSize: parseInt(document.getElementById('subtitleSize').value) || 24,
            splitPdf: document.getElementById('splitPdf')?.checked ?? true
        };
    }

    /**
     * Guarda los datos del formulario en localStorage
     */
    function saveFormData() {
        try {
            const config = getConfig();
            localStorage.setItem('ticketConfig', JSON.stringify(config));
            console.log('Datos guardados en localStorage');
        } catch (e) {
            console.warn('No se pudo guardar en localStorage', e);
        }
    }

    /**
     * Carga los datos del formulario desde localStorage
     */
    function loadFormData() {
        try {
            const saved = localStorage.getItem('ticketConfig');
            if (!saved) return;

            const config = JSON.parse(saved);
            const mapping = {
                'startNumber': config.startNumber,
                'endNumber': config.endNumber,
                'ticketsPerPage': config.ticketsPerPage,
                'ticketMode': config.ticketMode,
                'dayOfWeek': config.dayOfWeek,
                'dateText': config.dateText,
                'year': config.year,
                'dateColor': config.dateColor,
                'eventTitle': config.eventTitle,
                'eventSubtitle': config.eventSubtitle,
                'titleFont': config.titleFont,
                'subtitleFont': config.subtitleFont,
                'titleColor': config.titleColor,
                'subtitleColor': config.subtitleColor,
                'brandText': config.brandText,
                'voucherType': config.voucherType,
                'voucherQuantity': config.voucherQuantity,
                'voucherFont': config.voucherFont,
                'voucherColor': config.voucherColor,
                'location1': config.location1,
                'location2': config.location2,
                'imageUrl': config.imageUrl,
                'qrLink': config.qrLink,
                'titleSize': config.titleSize,
                'subtitleSize': config.subtitleSize
            };

            for (const [id, value] of Object.entries(mapping)) {
                const el = document.getElementById(id);
                if (el && value !== undefined) {
                    el.value = value;
                    // Si es un color picker con hidden, actualizar ambos
                    if (id.includes('Color')) {
                        const picker = document.getElementById(id + 'Custom');
                        if (picker) picker.value = value;
                        // Marcar la opción seleccionada visualmente
                        const container = el.closest('.color-selector') || (picker ? picker.closest('.color-selector') : null);
                        if (container) {
                            container.querySelectorAll('.color-option').forEach(opt => {
                                if (opt.dataset.color === value) opt.classList.add('selected');
                                else opt.classList.remove('selected');
                            });
                        }
                    }
                }
            }

            // Actualizar UI especial
            if (config.imageUrl) {
                const dropZone = document.getElementById('imageDropZone');
                if (dropZone) dropZone.classList.add('has-image');
            }

            // Sincronizar locationFull si existe
            const locationFull = document.getElementById('locationFull');
            if (locationFull && config.location1) {
                locationFull.value = config.location1;
            }

        } catch (e) {
            console.error('Error al cargar localStorage', e);
        }
    }

    // Exportar al namespace global
    global.ConfigManager = {
        getConfig,
        saveFormData,
        loadFormData
    };

    // También exponer individualmente para compatibilidad
    global.getConfig = getConfig;
    global.saveFormData = saveFormData;
    global.loadFormData = loadFormData;

})(window);
