/**
 * App.js - Punto de entrada principal
 * Generador de Tickets v2
 * 
 * Este archivo inicializa la aplicación y conecta todos los módulos.
 * Dependencias (deben cargarse antes):
 *   - config.js
 *   - toast.js
 *   - src/modules/utils.js
 *   - src/modules/qrGenerator.js
 *   - src/modules/configManager.js
 *   - src/modules/ticketRenderer.js
 *   - src/modules/imageHandler.js
 *   - src/modules/uiSetup.js
 *   - pdfGenerator.js
 */
(function (global) {
    'use strict';

    /**
     * Genera PDF para impresión
     */
    async function printTickets() {
        const config = getConfig();
        const totalTickets = config.endNumber - config.startNumber + 1;
        const appConfig = global.APP_CONFIG || { PDF: { MAX_TICKETS_TOTAL: 10000, MASS_GENERATION_THRESHOLD: 500 } };

        if (totalTickets > appConfig.PDF.MAX_TICKETS_TOTAL) {
            toast.warning(
                `Por favor, limita la generación a máximo ${appConfig.PDF.MAX_TICKETS_TOTAL} tickets.`,
                'Demasiados tickets ⚠️'
            );
            return;
        }

        if (totalTickets > appConfig.PDF.MASS_GENERATION_THRESHOLD) {
            const confirmToast = toast.info(
                `Estás a punto de generar ${totalTickets} tickets. Este proceso puede tomar unos segundos.`,
                '🚨 Generación masiva',
                0
            );

            setManagedTimeout(() => {
                const toastElement = document.getElementById(confirmToast);
                if (toastElement) {
                    const actionButtons = document.createElement('div');
                    actionButtons.style.marginTop = '10px';
                    actionButtons.style.display = 'flex';
                    actionButtons.style.gap = '10px';

                    const continueBtn = document.createElement('button');
                    continueBtn.textContent = 'Continuar';
                    continueBtn.style.cssText = 'padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;';

                    const cancelBtn = document.createElement('button');
                    cancelBtn.textContent = 'Cancelar';
                    cancelBtn.style.cssText = 'padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;';

                    continueBtn.onclick = () => {
                        toast.hide(confirmToast);
                        global.pdfGenerator.generatePDF(config, 'print');
                    };

                    cancelBtn.onclick = () => toast.hide(confirmToast);

                    actionButtons.appendChild(continueBtn);
                    actionButtons.appendChild(cancelBtn);
                    toastElement.appendChild(actionButtons);
                }
            }, 100);
            return;
        }

        global.pdfGenerator.generatePDF(config, 'print');
    }

    /**
     * Descarga PDF directamente
     */
    function downloadPdfDirectly() {
        const config = getConfig();
        global.pdfGenerator.generatePDF(config, 'download');
    }

    /**
     * Inicialización de la aplicación
     */
    function initApp() {
        // Manejar conexión offline/online
        window.addEventListener('online', () => {
            toast.success('Conexión restaurada', 'Online ✓');
        });

        window.addEventListener('offline', () => {
            toast.warning('Sin conexión a internet', 'Offline ⚠️');
        });

        // Cargar datos guardados
        loadFormData();

        // Actualizar vista previa de números en info-box
        updatePreview();

        // Inicializar fecha de Perú
        const dateInput = document.getElementById('eventDate');
        if (dateInput && !dateInput.value) {
            const peruDate = new Intl.DateTimeFormat('sv-SE', {
                timeZone: 'America/Lima',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(new Date());
            dateInput.value = peruDate;
        }

        // Referencias a elementos principales
        const startInput = document.getElementById('startNumber');
        const endInput = document.getElementById('endNumber');

        // Listeners para rangos
        if (startInput) startInput.addEventListener('input', updatePreview);
        if (endInput) endInput.addEventListener('input', updatePreview);

        // Listener para fecha
        if (dateInput) dateInput.addEventListener('change', updateDateText);

        // Inicializar fecha
        updateDateText();

        // Configurar selectores de color
        setupColorSelectors();

        // Configurar upload de imágenes
        setupImageUpload();

        // Debounce para inputs de texto
        const previewDebounced = debounce(generateLivePreview, 400);
        const saveDebounced = debounce(saveFormData, 1000);

        // Inputs que actualizan preview
        const textInputs = document.querySelectorAll('input[type="text"], input[type="number"], select');
        textInputs.forEach(input => {
            input.addEventListener('input', () => {
                previewDebounced();
                saveDebounced();
            });
            input.addEventListener('change', () => {
                generateLivePreview();
                saveFormData();
            });
        });

        // Listener especial para QR
        const qrLinkInput = document.getElementById('qrLink');
        if (qrLinkInput) {
            qrLinkInput.addEventListener('input', debounce(() => {
                updateLocalQRCode(qrLinkInput.value, () => {
                    generateLivePreview();
                });
            }, 500));
        }

        // Sincronizar ubicación
        const locationFull = document.getElementById('locationFull');
        if (locationFull) {
            locationFull.addEventListener('input', () => {
                const fullText = locationFull.value;
                const location1 = document.getElementById('location1');
                const location2 = document.getElementById('location2');
                if (location1) location1.value = fullText;
                if (location2) location2.value = '';
                generateLivePreview();
            });
        }

        // Botones de acción
        const printButton = document.getElementById('printButton');
        if (printButton) {
            printButton.addEventListener('click', printTickets);
        }

        const downloadPdfButton = document.getElementById('downloadPdfButton');
        if (downloadPdfButton) {
            downloadPdfButton.addEventListener('click', downloadPdfDirectly);
        }

        // Configurar tema oscuro/claro
        setupTheme();

        // Generar preview inicial
        const qrLink = document.getElementById('qrLink');
        if (qrLink && qrLink.value) {
            updateLocalQRCode(qrLink.value, generateLivePreview);
        } else {
            generateLivePreview();
        }

        console.log('✅ Generador de Tickets v2 - Inicializado correctamente');
    }

    // Exponer funciones globales
    global.printTickets = printTickets;
    global.downloadPdfDirectly = downloadPdfDirectly;

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

})(window);
