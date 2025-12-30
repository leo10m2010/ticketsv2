/**
 * UI Setup Module - Configuración de interfaz de usuario
 * Generador de Tickets v2
 */
(function (global) {
    'use strict';

    /**
     * Configura el sistema de temas (oscuro/claro)
     */
    function setupTheme() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        const savedTheme = localStorage.getItem('theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }

        themeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            const theme = isDark ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
            themeToggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            toast.info(`Modo ${isDark ? 'oscuro' : 'claro'} activado`, 'Tema cambiado', 2000);
        });
    }

    /**
     * Configura selectores de color
     */
    function setupColorSelectors() {
        function setupColorSelector(pickerId, hiddenId, hexId) {
            const picker = document.getElementById(pickerId);
            const hexInput = document.getElementById(hexId);
            const hiddenInput = document.getElementById(hiddenId);
            if (!picker || !hexInput || !hiddenInput) return;

            const container = picker.closest('.color-selector');
            if (!container) return;

            const colorOptions = container.querySelectorAll('.color-option');

            // Función unificada para actualizar el color
            const updateAll = (newColor, source) => {
                // Normalizar color (asegurar #)
                if (newColor.indexOf('#') !== 0) newColor = '#' + newColor;

                // Validar formato hex
                if (!/^#[0-9A-Fa-f]{6}$/.test(newColor)) return;

                // Actualizar estado visual de los presets
                colorOptions.forEach(opt => {
                    const isMatch = opt.dataset.color.toLowerCase() === newColor.toLowerCase();
                    opt.classList.toggle('selected', isMatch);
                });

                // Sincronizar componentes
                if (source !== 'picker') picker.value = newColor;
                if (source !== 'hex') hexInput.value = newColor.replace('#', '').toUpperCase();
                hiddenInput.value = newColor;

                // Actualizar preview
                if (typeof generateLivePreview === 'function') {
                    generateLivePreview();
                }
            };

            // Evento para presets
            container.addEventListener('click', (e) => {
                const option = e.target.closest('.color-option');
                if (option) {
                    updateAll(option.dataset.color, 'preset');
                }
            });

            // Evento para el picker nativo
            picker.addEventListener('input', function () {
                updateAll(this.value, 'picker');
            });

            // Evento para el campo de texto HEX
            hexInput.addEventListener('input', function () {
                let val = this.value;
                if (val.length === 6) {
                    updateAll(val, 'hex');
                }
            });

            // Al perder el foco, asegurar el formato correcto
            hexInput.addEventListener('blur', function () {
                this.value = hiddenInput.value.replace('#', '').toUpperCase();
            });

            // Inicializar el valor actual en el campo de texto
            hexInput.value = hiddenInput.value.replace('#', '').toUpperCase();
        }

        setupColorSelector('dateColorCustom', 'dateColor', 'dateColorHex');
        setupColorSelector('titleColorCustom', 'titleColor', 'titleColorHex');
        setupColorSelector('subtitleColorCustom', 'subtitleColor', 'subtitleColorHex');
        setupColorSelector('voucherColorCustom', 'voucherColor', 'voucherColorHex');
    }

    /**
     * Actualiza preview de rangos
     */
    function updatePreview() {
        const startInput = document.getElementById('startNumber');
        const endInput = document.getElementById('endNumber');
        const previewStart = document.getElementById('previewStart');
        const previewEnd = document.getElementById('previewEnd');

        if (previewStart && startInput) {
            previewStart.textContent = formatTicketNumber(parseInt(startInput.value) || 1);
        }
        if (previewEnd && endInput) {
            previewEnd.textContent = formatTicketNumber(parseInt(endInput.value) || 50);
        }
    }

    /**
     * Función para convertir fecha a texto en español
     */
    function updateDateText() {
        const dateInput = document.getElementById('eventDate');
        const dayOfWeekInput = document.getElementById('dayOfWeek');
        const dateTextInput = document.getElementById('dateText');
        const yearInput = document.getElementById('year');

        if (!dateInput || !dayOfWeekInput || !dateTextInput || !yearInput) return;

        const date = new Date(dateInput.value + 'T12:00:00');
        if (isNaN(date.getTime())) return;

        const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
        const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
            'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

        dayOfWeekInput.value = days[date.getDay()];
        dateTextInput.value = `${date.getDate()} DE ${months[date.getMonth()]}`;
        yearInput.value = date.getFullYear();

        generateLivePreview();
    }

    /**
     * Configura el modal de vista previa móvil
     */
    function setupMobilePreview() {
        const trigger = document.getElementById('mobilePreviewTrigger');
        const modal = document.getElementById('mobilePreviewModal');
        const closeBtn = document.getElementById('closeMobilePreview');
        const configPanel = document.querySelector('.config-panel');

        if (!trigger || !modal || !closeBtn) return;

        const toggleModal = () => {
            if (modal.classList.contains('active')) {
                modal.classList.remove('active');
                trigger.classList.remove('active');
            } else {
                modal.classList.add('active');
                trigger.classList.add('active');
                // Generar vista previa al abrir por si acaso
                if (typeof generateLivePreview === 'function') {
                    generateLivePreview();
                }
            }
        };

        const closeModal = () => {
            modal.classList.remove('active');
            trigger.classList.remove('active');
        };

        trigger.addEventListener('click', toggleModal);
        closeBtn.addEventListener('click', closeModal);

        // Cerrar al hacer clic fuera del modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Mover el preview arriba cuando el teclado esté abierto (input con foco)
        if (configPanel) {
            configPanel.addEventListener('focusin', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                    modal.classList.add('keyboard-open');
                }
            });

            configPanel.addEventListener('focusout', (e) => {
                // Pequeño delay para evitar parpadeo al cambiar entre inputs
                setTimeout(() => {
                    if (!configPanel.contains(document.activeElement) ||
                        (document.activeElement.tagName !== 'INPUT' &&
                            document.activeElement.tagName !== 'SELECT' &&
                            document.activeElement.tagName !== 'TEXTAREA')) {
                        modal.classList.remove('keyboard-open');
                    }
                }, 100);
            });
        }
    }

    // Exportar al namespace global
    global.UISetup = {
        setupTheme,
        setupColorSelectors,
        updatePreview,
        updateDateText,
        setupMobilePreview
    };

    global.setupTheme = setupTheme;
    global.setupColorSelectors = setupColorSelectors;
    global.updatePreview = updatePreview;
    global.updateDateText = updateDateText;
    global.setupMobilePreview = setupMobilePreview;

})(window);
