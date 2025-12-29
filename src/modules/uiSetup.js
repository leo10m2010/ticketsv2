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
        function setupColorSelector(pickerId, hiddenId) {
            const picker = document.getElementById(pickerId);
            if (!picker) return;

            const container = picker.closest('.color-selector');
            if (!container) return;

            const colorOptions = container.querySelectorAll('.color-option');

            const oldHandler = container._colorClickHandler;
            if (oldHandler) {
                container.removeEventListener('click', oldHandler);
            }

            const handleContainerClick = (e) => {
                const option = e.target.closest('.color-option');
                if (option) {
                    colorOptions.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    const color = option.dataset.color;
                    document.getElementById(hiddenId).value = color;
                    picker.value = color;
                    generateLivePreview();
                }
            };

            container._colorClickHandler = handleContainerClick;
            container.addEventListener('click', handleContainerClick);

            const oldPickerHandler = picker._inputHandler;
            if (oldPickerHandler) {
                picker.removeEventListener('input', oldPickerHandler);
            }

            const handlePickerInput = function () {
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                document.getElementById(hiddenId).value = this.value;
                generateLivePreview();
            };

            picker._inputHandler = handlePickerInput;
            picker.addEventListener('input', handlePickerInput);
        }

        setupColorSelector('dateColorCustom', 'dateColor');
        setupColorSelector('titleColorCustom', 'titleColor');
        setupColorSelector('subtitleColorCustom', 'subtitleColor');
        setupColorSelector('voucherColorCustom', 'voucherColor');
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

    // Exportar al namespace global
    global.UISetup = {
        setupTheme,
        setupColorSelectors,
        updatePreview,
        updateDateText
    };

    global.setupTheme = setupTheme;
    global.setupColorSelectors = setupColorSelectors;
    global.updatePreview = updatePreview;
    global.updateDateText = updateDateText;

})(window);
