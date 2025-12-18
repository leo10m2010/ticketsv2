// Generador de Tickets - Mes Morado

// Variable global para rastrear el procesamiento de imágenes
let currentImageProcessing = null;
let cachedQRCodeUrl = ''; // Caché para el QR local

// Set para rastrear timeouts activos
const activeTimeouts = new Set();

/**
 * Crea un timeout gestionado que se limpia automáticamente
 * @param {Function} callback - Función a ejecutar
 * @param {number} delay - Delay en ms
 * @returns {number} - ID del timeout
 */
function setManagedTimeout(callback, delay) {
    const timeoutId = setTimeout(() => {
        activeTimeouts.delete(timeoutId);
        callback();
    }, delay);
    activeTimeouts.add(timeoutId);
    return timeoutId;
}

/**
 * Limpia un timeout gestionado específico
 * @param {number} timeoutId - ID del timeout a limpiar
 */
function clearManagedTimeout(timeoutId) {
    clearTimeout(timeoutId);
    activeTimeouts.delete(timeoutId);
}

/**
 * Limpia todos los timeouts activos
 */
function clearAllTimeouts() {
    activeTimeouts.forEach(id => clearTimeout(id));
    activeTimeouts.clear();
}

/**
 * Obtiene un elemento del DOM con validación
 * @param {string} id - ID del elemento
 * @param {boolean} required - Si es requerido (lanzará error si no existe)
 * @returns {HTMLElement|null} - Elemento o null si no existe
 */
function getElement(id, required = true) {
    const element = document.getElementById(id);
    if (!element && required) {
        const errorMsg = `Error: Elemento requerido '${id}' no encontrado en el DOM`;
        console.error(errorMsg);
        toast.error(`Error de configuración: elemento ${id} no encontrado`, 'Error interno');
        throw new Error(errorMsg);
    }
    return element;
}

// Limpiar timeouts al salir
window.addEventListener('beforeunload', clearAllTimeouts);

// Manejo de conexión offline/online
window.addEventListener('online', () => {
    toast.success('Conexión restaurada', 'Online ✓');
});

window.addEventListener('offline', () => {
    toast.warning('Sin conexión a internet. Algunas funciones pueden no estar disponibles (como QR codes externos).', 'Offline ⚠️', 5000);
});

// Actualizar preview de números cuando cambian los inputs
document.addEventListener('DOMContentLoaded', function () {
    const startInput = document.getElementById('startNumber');
    const endInput = document.getElementById('endNumber');
    const dateInput = document.getElementById('eventDate');

    // Establecer fecha de hoy (Perú) por defecto
    if (dateInput) {
        const peruDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Lima',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());
        dateInput.value = peruDate;
    }

    function updatePreview() {
        const start = parseInt(startInput.value) || 1;
        const end = parseInt(endInput.value) || 1;

        const previewStart = getElement('previewStart', false);
        const previewEnd = getElement('previewEnd', false);

        if (previewStart) {
            previewStart.textContent = String(start).padStart(4, '0');
        }
        if (previewEnd) {
            previewEnd.textContent = String(end).padStart(4, '0');
        }
    }

    // Función para convertir fecha a texto en español
    function updateDateText() {
        const dateValue = dateInput.value;
        if (!dateValue) return;

        const date = new Date(dateValue + 'T00:00:00');

        // Días de la semana en español
        const daysOfWeek = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
        const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
            'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

        const dayOfWeek = daysOfWeek[date.getDay()];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();

        const dayOfWeekEl = getElement('dayOfWeek', false);
        const dateTextEl = getElement('dateText', false);
        const yearEl = getElement('year', false);

        if (dayOfWeekEl) dayOfWeekEl.value = dayOfWeek;
        if (dateTextEl) dateTextEl.value = `${day} DE ${month}`;
        if (yearEl) yearEl.value = year;
    }

    startInput.addEventListener('input', updatePreview);
    endInput.addEventListener('input', updatePreview);
    dateInput.addEventListener('change', updateDateText);

    // Inicializar fecha al cargar
    updateDateText();

    // Cargar datos persistentes
    loadFormData();

    // Sobreescribir con la fecha de hoy si el usuario así lo desea (configuración "siempre hoy")
    // Esto asegura que cada vez que abra la app, la fecha sea la actual.
    if (dateInput) {
        const todayPeru = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Lima',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date());
        dateInput.value = todayPeru;
        updateDateText();
    }

    // Inicializar QR por primera vez
    updateLocalQRCode(document.getElementById('qrLink').value, () => {
        generateLivePreview();
    });

    // Actualizar vista previa cuando cambian los campos
    const allInputs = document.querySelectorAll('#dashboard input:not(#qrLink), #dashboard select');
    const saveDebounced = debounce(saveFormData, 1000);
    const previewDebounced = debounce(generateLivePreview, 500);

    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            previewDebounced();
            saveDebounced();
        });
        input.addEventListener('change', () => {
            generateLivePreview();
            saveFormData();
        });
    });

    // Listener especial para QR (asíncrono)
    const qrLinkInput = document.getElementById('qrLink');
    if (qrLinkInput) {
        qrLinkInput.addEventListener('input', debounce(() => {
            updateLocalQRCode(qrLinkInput.value, () => {
                generateLivePreview();
                saveFormData();
            });
        }, 500));
    }

    // Configurar selectores de color
    setupColorSelectors();

    // Configurar drag and drop para imagen
    setupImageUpload();


    // Manejar campo de ubicación combinado
    const locationFull = getElement('locationFull', false);
    if (locationFull) {
        locationFull.addEventListener('input', function () {
            const fullText = this.value;
            const location1 = getElement('location1', false);
            const location2 = getElement('location2', false);

            // Poner todo el texto en location1, location2 queda vacío
            if (location1) location1.value = fullText;
            if (location2) location2.value = '';
            generateLivePreview();
        });

        // Inicializar valores al cargar
        const location1 = getElement('location1', false);
        const location2 = getElement('location2', false);
        if (location1) location1.value = locationFull.value;
        if (location2) location2.value = '';
    }

    // Configurar botón de impresión
    const printButton = document.getElementById('printButton');
    if (printButton) {
        printButton.addEventListener('click', printTickets);
    }

    // Configurar botón de descarga directa de PDF
    const downloadPdfButton = document.getElementById('downloadPdfButton');
    if (downloadPdfButton) {
        downloadPdfButton.addEventListener('click', downloadPdfDirectly);
    }

    // Configurar modo oscuro
    setupTheme();
});

/**
 * Configura el sistema de temas (oscuro/claro)
 */
function setupTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    // Cargar preferencia guardada
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

// Función debounce para evitar demasiadas actualizaciones
function debounce(func, wait) {
    let timeout;
    const executedFunction = function (...args) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };

    // Agregar método para cancelar manualmente
    executedFunction.cancel = function () {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };

    return executedFunction;
}

// Configurar selectores de color
function setupColorSelectors() {
    // Función helper para configurar un selector de color
    function setupColorSelector(pickerId, hiddenId) {
        const picker = document.getElementById(pickerId);
        if (!picker) return;

        // Encontrar el contenedor .color-selector más cercano
        const container = picker.closest('.color-selector');
        if (!container) return;

        const colorOptions = container.querySelectorAll('.color-option');

        // Usar event delegation para evitar múltiples listeners
        // Remover listener anterior si existe
        const oldHandler = container._colorClickHandler;
        if (oldHandler) {
            container.removeEventListener('click', oldHandler);
        }

        // Nuevo handler con event delegation
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

        // Guardar referencia y agregar listener
        container._colorClickHandler = handleContainerClick;
        container.addEventListener('click', handleContainerClick);

        // Color personalizado con el picker
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

    // Configurar todos los selectores
    setupColorSelector('dateColorCustom', 'dateColor');
    setupColorSelector('titleColorCustom', 'titleColor');
    setupColorSelector('subtitleColorCustom', 'subtitleColor');
    setupColorSelector('voucherColorCustom', 'voucherColor');
}

// Función para formatear número con ceros a la izquierda
function formatTicketNumber(num) {
    return String(num).padStart(4, '0');
}

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

    // Actualizar imagen de fondo

    // Actualizar imagen de fondo
    const imageDiv = ticket.querySelector('.image');
    if (imageDiv && config.imageUrl) {
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
    // Lado izquierdo - dentro de .left .ticket-number p
    const leftTicketNumber = ticket.querySelector('.left .ticket-number p');
    if (leftTicketNumber) {
        leftTicketNumber.textContent = '#' + formatTicketNumber(ticketNumber);
    }

    // Lado derecho - p.ticket-number dentro de .right
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

        // Aplicar color a la fecha (especialmente al span del medio)
        if (config.dateColor && dateSpans[1]) {
            dateSpans[1].style.color = config.dateColor;
        }
    }

    // Actualizar títulos del evento (izquierda y derecha)
    const leftH1 = ticket.querySelector('.left .show-name h1');
    const rightH1 = ticket.querySelector('.right .show-name h1');

    // Título izquierdo (con tamaño personalizable)
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

    // Título derecho (tamaño fijo, solo texto y color)
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
        // Limpiar contenido previo
        p.textContent = '';

        // Crear elementos de forma segura para prevenir XSS
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
        // Si location2 está vacío, ocultar el bullet point
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
    return ticket;
}

/**
 * Genera URL de código QR localmente usando la librería QRCode
 * @param {string} data - Datos para el QR
 * @param {Function} callback - Callback con la URL generada
 */
function updateLocalQRCode(data, callback) {
    if (!data || data.trim() === '') {
        cachedQRCodeUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UVI8L3RleHQ+PC9zdmc+';
        if (callback) callback(cachedQRCodeUrl);
        return;
    }

    // Crear un contenedor temporal para la librería
    const tempDiv = document.createElement('div');
    try {
        new QRCode(tempDiv, {
            text: data,
            width: 200,
            height: 200,
            correctLevel: QRCode.CorrectLevel.H
        });

        // La librería genera un canvas o un img. Esperamos a que esté listo.
        const checkReady = () => {
            const img = tempDiv.querySelector('img');
            if (img && img.src && img.src.startsWith('data:')) {
                cachedQRCodeUrl = img.src;
                if (callback) callback(cachedQRCodeUrl);
            } else {
                setTimeout(checkReady, 50);
            }
        };
        checkReady();
    } catch (e) {
        console.error('Error generando QR local:', e);
        // Fallback a API externa si falla la librería
        cachedQRCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
        if (callback) callback(cachedQRCodeUrl);
    }
}

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

    return {
        startNumber,
        endNumber,
        ticketsPerPage: parseInt(document.getElementById('ticketsPerPage').value) || 6,
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
        qrUrl: cachedQRCodeUrl,
        titleSize: parseInt(document.getElementById('titleSize').value) || 48,
        subtitleSize: parseInt(document.getElementById('subtitleSize').value) || 24,
        splitPdf: document.getElementById('splitPdf')?.checked ?? true
    };
}

// Función para generar vista previa en vivo
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

    // Limitar la vista previa usando configuración
    const appConfig = window.APP_CONFIG || { PREVIEW: { MAX_TICKETS_SHOWN: 10 } };
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

/**
 * Genera PDF optimizado con soporte para grandes volúmenes
 * Utiliza el generador optimizado para mejor rendimiento
 */
async function printTickets() {
    const config = getConfig();
    const totalTickets = config.endNumber - config.startNumber + 1;
    const appConfig = window.APP_CONFIG || { PDF: { MAX_TICKETS_TOTAL: 10000, MASS_GENERATION_THRESHOLD: 500 } };

    // Validar límites
    if (totalTickets > appConfig.PDF.MAX_TICKETS_TOTAL) {
        toast.warning(
            `Por favor, limita la generación a máximo ${appConfig.PDF.MAX_TICKETS_TOTAL} tickets para mantener el rendimiento óptimo.`,
            'Demasiados tickets ⚠️'
        );
        return;
    }

    if (totalTickets > appConfig.PDF.MASS_GENERATION_THRESHOLD) {
        // Mostrar toast de confirmación
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
                continueBtn.className = 'btn-confirm'; // Asumiendo que existe o hereda estilos básicos
                continueBtn.style.cssText = 'padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;';

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancelar';
                cancelBtn.style.cssText = 'padding: 5px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;';

                continueBtn.onclick = () => {
                    toast.hide(confirmToast);
                    window.pdfGenerator.generatePDF(config, 'print');
                };

                cancelBtn.onclick = () => toast.hide(confirmToast);

                actionButtons.appendChild(continueBtn);
                actionButtons.appendChild(cancelBtn);
                toastElement.appendChild(actionButtons);
            }
        }, 100);
        return;
    }

    // Generación directa
    window.pdfGenerator.generatePDF(config, 'print');
}

// Configurar drag and drop para imagen principal
function setupImageUpload() {
    const imageDropZone = getElement('imageDropZone', false);
    const imageFileInput = getElement('imageFileInput', false);
    const imageUrlInput = getElement('imageUrl', false);

    if (!imageDropZone || !imageFileInput || !imageUrlInput) {
        console.warn('Elementos de upload de imagen no encontrados, saltando inicialización');
        return;
    }

    // Click para abrir selector de archivos
    imageDropZone.addEventListener('click', () => imageFileInput.click());

    // Cuando se selecciona un archivo
    imageFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageFile(e.target.files[0]);
        }
    });

    // Drag over
    imageDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageDropZone.classList.add('drag-over');
    });

    // Drag leave
    imageDropZone.addEventListener('dragleave', () => {
        imageDropZone.classList.remove('drag-over');
    });

    // Drop
    imageDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        imageDropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleImageFile(e.dataTransfer.files[0]);
        }
    });

    /**
     * Crea y muestra un modal moderno para el proceso de compresión de imagen
     */
    function createImageProcessingModal(file) {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'image-processing-overlay';

        // Crear estructura del modal
        overlay.innerHTML = `
            <div class="image-processing-modal">
                <div class="image-processing-header">
                    <div class="processing-icon">
                        <div class="processing-icon-circle">
                            <i class="fas fa-sync-alt"></i>
                        </div>
                    </div>
                    <h2 class="image-processing-title">Comprimiendo Imagen</h2>
                    <p class="image-processing-subtitle">Estamos optimizando tu imagen para mejor rendimiento</p>
                </div>

                <div class="image-preview-thumbnail" style="display: none;">
                    <img src="" alt="Preview">
                </div>

                <div class="modern-progress-container">
                    <span class="progress-percentage">0%</span>
                    <div class="modern-progress-fill" style="width: 0%"></div>
                    <div class="progress-message">Iniciando...</div>
                </div>

                <div class="processing-details">
                    <div class="detail-item">
                        <div class="detail-label">Tamaño Original</div>
                        <div class="detail-value" data-original-size>${(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tamaño Comprimido</div>
                        <div class="detail-value highlight" data-compressed-size>-- MB</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Velocidad</div>
                        <div class="detail-value" data-speed>-- MB/s</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tiempo Restante</div>
                        <div class="detail-value" data-eta>Calculando...</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Crear preview de la imagen
        const reader = new FileReader();
        reader.onload = (e) => {
            const thumbnail = overlay.querySelector('.image-preview-thumbnail');
            const img = thumbnail.querySelector('img');
            img.src = e.target.result;
            thumbnail.style.display = 'block';
        };
        reader.readAsDataURL(file);

        // Variables para tracking
        const startTime = Date.now();
        let lastUpdateTime = startTime;
        let processedBytes = 0;

        return {
            overlay,
            updateProgress: (progress, message) => {
                const progressFill = overlay.querySelector('.modern-progress-fill');
                const progressPercentage = overlay.querySelector('.progress-percentage');
                const progressMessage = overlay.querySelector('.progress-message');
                const speedElement = overlay.querySelector('[data-speed]');
                const etaElement = overlay.querySelector('[data-eta]');

                progressFill.style.width = progress + '%';
                progressPercentage.textContent = progress + '%';
                progressMessage.textContent = message || 'Procesando...';

                // Calcular velocidad y tiempo estimado
                const now = Date.now();
                const elapsed = (now - startTime) / 1000; // segundos
                const currentProcessed = (progress / 100) * file.size;
                const speed = currentProcessed / elapsed; // bytes/s
                const remaining = file.size - currentProcessed;
                const eta = remaining / speed; // segundos

                if (elapsed > 0.5 && progress > 5) {
                    speedElement.textContent = (speed / 1024 / 1024).toFixed(2) + ' MB/s';

                    if (progress < 95) {
                        if (eta < 1) {
                            etaElement.textContent = 'Casi listo...';
                        } else if (eta < 60) {
                            etaElement.textContent = Math.ceil(eta) + 's';
                        } else {
                            etaElement.textContent = Math.ceil(eta / 60) + 'm ' + Math.ceil(eta % 60) + 's';
                        }
                    } else {
                        etaElement.textContent = 'Finalizando...';
                    }
                }
            },
            showSuccess: (compressedSize, reduction) => {
                const iconCircle = overlay.querySelector('.processing-icon-circle');
                const icon = iconCircle.querySelector('i');
                const title = overlay.querySelector('.image-processing-title');
                const subtitle = overlay.querySelector('.image-processing-subtitle');
                const compressedSizeElement = overlay.querySelector('[data-compressed-size]');
                const progressMessage = overlay.querySelector('.progress-message');

                // Cambiar a estado de éxito
                iconCircle.classList.remove('pulse');
                iconCircle.classList.add('success');
                icon.className = 'fas fa-check';
                icon.style.animation = 'none';

                title.textContent = '¡Imagen Optimizada!';
                subtitle.textContent = `Tu imagen ha sido comprimida exitosamente con ${reduction}% de reducción`;

                compressedSizeElement.textContent = (compressedSize / 1024 / 1024).toFixed(2) + ' MB';
                compressedSizeElement.classList.add('success');

                progressMessage.textContent = '✓ Completado';
                progressMessage.style.color = '#27ae60';

                // Mostrar resultado con animación
                const resultDiv = document.createElement('div');
                resultDiv.className = 'processing-result success';
                resultDiv.innerHTML = `
                    <div class="result-message">Compresión exitosa</div>
                    <div class="result-details">
                        Ahorro de espacio: ${(file.size - compressedSize) / 1024 / 1024 > 0.1
                        ? (file.size - compressedSize) / 1024 / 1024 + ' MB'
                        : (file.size - compressedSize) / 1024 + ' KB'}
                    </div>
                `;
                overlay.querySelector('.modern-progress-container').after(resultDiv);

                // Botón para cerrar
                setTimeout(() => {
                    const closeBtn = document.createElement('button');
                    closeBtn.className = 'close-processing-btn';
                    closeBtn.textContent = 'Continuar';
                    closeBtn.onclick = () => overlay.remove();
                    overlay.querySelector('.image-processing-modal').appendChild(closeBtn);
                }, 500);

                // Auto-cerrar después de 3 segundos
                setTimeout(() => overlay.remove(), 3000);
            },
            showError: (errorMessage) => {
                const iconCircle = overlay.querySelector('.processing-icon-circle');
                const icon = iconCircle.querySelector('i');
                const title = overlay.querySelector('.image-processing-title');
                const subtitle = overlay.querySelector('.image-processing-subtitle');
                const progressMessage = overlay.querySelector('.progress-message');

                iconCircle.classList.add('error');
                icon.className = 'fas fa-times';
                icon.style.animation = 'none';

                title.textContent = 'Error al Procesar';
                subtitle.textContent = errorMessage;

                progressMessage.textContent = '✗ Error';
                progressMessage.style.color = '#e74c3c';

                // Mostrar error con animación
                const resultDiv = document.createElement('div');
                resultDiv.className = 'processing-result error';
                resultDiv.innerHTML = `
                    <div class="result-message">No se pudo procesar la imagen</div>
                    <div class="result-details">${errorMessage}</div>
                `;
                overlay.querySelector('.modern-progress-container').after(resultDiv);

                // Botón para cerrar
                const closeBtn = document.createElement('button');
                closeBtn.className = 'close-processing-btn';
                closeBtn.style.background = '#e74c3c';
                closeBtn.textContent = 'Cerrar';
                closeBtn.onclick = () => overlay.remove();
                overlay.querySelector('.image-processing-modal').appendChild(closeBtn);
            },
            remove: () => overlay.remove()
        };
    }

    // Función para manejar el archivo
    async function handleImageFile(file) {
        if (file && file.type.startsWith('image/')) {
            // Cancelar procesamiento anterior si existe
            if (currentImageProcessing) {
                currentImageProcessing.cancelled = true;
                if (currentImageProcessing.worker) {
                    currentImageProcessing.worker.terminate();
                }
                if (currentImageProcessing.workerURL) {
                    URL.revokeObjectURL(currentImageProcessing.workerURL);
                }
                if (currentImageProcessing.modal) {
                    currentImageProcessing.modal.remove();
                }
            }

            // Crear token único para este procesamiento
            const processingToken = { cancelled: false, worker: null, workerURL: null, modal: null };
            currentImageProcessing = processingToken;

            // Crear modal moderno
            const modal = createImageProcessingModal(file);
            processingToken.modal = modal;

            try {
                const appConfig = window.APP_CONFIG || { IMAGE: { MAX_WIDTH: 1200, COMPRESSION_QUALITY: 0.85 } };

                // Detectar si es una imagen muy grande
                const isLargeImage = file.size > 3 * 1024 * 1024; // > 3MB

                let compressedDataUrl;

                if (isLargeImage && typeof Worker !== 'undefined') {
                    // Usar Web Worker para imágenes grandes
                    compressedDataUrl = await compressImageWithWorker(
                        file,
                        appConfig.IMAGE.MAX_WIDTH,
                        appConfig.IMAGE.COMPRESSION_QUALITY,
                        processingToken,
                        (progress, message) => {
                            modal.updateProgress(progress, message);
                        }
                    );
                } else {
                    // Usar método estándar para imágenes pequeñas
                    compressedDataUrl = await compressImage(
                        file,
                        appConfig.IMAGE.MAX_WIDTH,
                        appConfig.IMAGE.COMPRESSION_QUALITY,
                        (progress) => {
                            modal.updateProgress(progress, 'Procesando imagen...');
                        }
                    );
                }

                // Verificar si este procesamiento fue cancelado
                if (processingToken.cancelled) {
                    console.log('Procesamiento de imagen cancelado (nueva imagen cargada)');
                    return;
                }

                // Calcular tamaños y reducción
                const compressedSize = compressedDataUrl.length * 0.75; // data URL base64 overhead
                const reduction = ((1 - compressedSize / file.size) * 100).toFixed(1);

                // Mostrar éxito en el modal
                modal.showSuccess(compressedSize, reduction);

                // Actualizar el sistema
                imageUrlInput.value = compressedDataUrl;
                imageDropZone.classList.add('has-image');
                imageDropZone.querySelector('p').textContent =
                    `✓ Imagen optimizada (${reduction}% de reducción)`;

                // Usar debounce para preview
                const debouncedPreview = debounce(generateLivePreview, 300);
                debouncedPreview();

            } catch (error) {
                // Verificar si fue cancelado antes de mostrar error
                if (processingToken.cancelled) {
                    return;
                }

                modal.showError(error.message);
                imageDropZone.querySelector('p').textContent = '✗ Error al cargar imagen';

            } finally {
                // Limpiar solo si es el procesamiento actual
                if (currentImageProcessing === processingToken) {
                    currentImageProcessing = null;
                }
            }
        }
    }
}

/**
 * Crea un Web Worker inline desde código JavaScript
 * Esto permite que funcione en file:// sin necesidad de servidor
 */
/**
 * Crea un Web Worker (intenta cargar desde archivo, fallback a inline para file://)
 */
async function getWorkerURL() {
    // Si estamos en un servidor (http/https), el archivo externo es más limpio
    if (window.location.protocol.startsWith('http')) {
        return 'imageWorker.js';
    }

    // Fallback a Blob inline para file:// (compatible con seguridad del navegador)
    if (window._workerBlobURL) return window._workerBlobURL;

    // El código del worker está duplicado aquí para file:// compatibility
    // En producción con servidor, este bloque no se usaría idealmente.
    const workerCode = `
        self.onmessage = async function(e) {
            const { imageData, maxWidth, quality, fileType } = e.data;
            try {
                const img = await loadImage(imageData);
                let width = img.width;
                let height = img.height;
                self.postMessage({ type: 'info', originalWidth: width, originalHeight: height });

                if (width > 3000 || height > 3000) {
                    self.postMessage({ type: 'progress', progress: 10, message: 'Imagen muy grande...' });
                    const intermediateWidth = width * 0.5;
                    const intermediateHeight = height * 0.5;
                    const step1Canvas = new OffscreenCanvas(intermediateWidth, intermediateHeight);
                    const step1Ctx = step1Canvas.getContext('2d');
                    step1Ctx.drawImage(img, 0, 0, intermediateWidth, intermediateHeight);
                    width = intermediateWidth; height = intermediateHeight;
                    if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
                    const finalCanvas = new OffscreenCanvas(width, height);
                    const finalCtx = finalCanvas.getContext('2d');
                    if (fileType === 'image/png') finalCtx.clearRect(0, 0, width, height);
                    finalCtx.drawImage(step1Canvas, 0, 0, width, height);
                    const blob = await finalCanvas.convertToBlob({ type: getSupportedType(fileType), quality: quality });
                    const dataUrl = await blobToDataURL(blob);
                    self.postMessage({ type: 'success', result: dataUrl, originalSize: imageData.length, compressedSize: dataUrl.length });
                } else {
                    if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
                    const canvas = new OffscreenCanvas(width, height);
                    const ctx = canvas.getContext('2d');
                    if (fileType === 'image/png') ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    const blob = await canvas.convertToBlob({ type: getSupportedType(fileType), quality: quality });
                    const dataUrl = await blobToDataURL(blob);
                    self.postMessage({ type: 'success', result: dataUrl, originalSize: imageData.length, compressedSize: dataUrl.length });
                }
            } catch (error) { self.postMessage({ type: 'error', error: error.message }); }
        };

        async function loadImage(dataUrl) {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            return await createImageBitmap(blob);
        }

        function blobToDataURL(blob) {
            return new Promise((r) => { const reader = new FileReader(); reader.onload = () => r(reader.result); reader.readAsDataURL(blob); });
        }

        function getSupportedType(t) { return ['image/png', 'image/jpeg', 'image/webp'].includes(t) ? t : 'image/jpeg'; }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    window._workerBlobURL = URL.createObjectURL(blob);
    return window._workerBlobURL;
}

/**
 * Comprime una imagen usando Web Worker (para imágenes grandes)
 * @param {File} file - Archivo de imagen
 * @param {number} maxWidth - Ancho máximo en píxeles
 * @param {number} quality - Calidad de compresión (0-1)
 * @param {Object} processingToken - Token para cancelación
 * @param {Function} onProgress - Callback de progreso
 * @returns {Promise<string>} - Data URL de la imagen comprimida
 */
async function compressImageWithWorker(file, maxWidth = 1200, quality = 0.85, processingToken, onProgress) {
    // Obtener URL del worker (archivo o blob) ANTES de la promesa
    const workerURL = await getWorkerURL();

    return new Promise((resolve, reject) => {
        const appConfig = window.APP_CONFIG || { IMAGE: { MAX_FILE_SIZE: 10 * 1024 * 1024 } };

        // Validar tamaño máximo
        if (file.size > appConfig.IMAGE.MAX_FILE_SIZE) {
            const sizeMB = (appConfig.IMAGE.MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
            reject(new Error(`La imagen es demasiado grande (máximo ${sizeMB}MB)`));
            return;
        }

        const worker = new Worker(workerURL);
        processingToken.worker = worker;
        processingToken.workerURL = workerURL;

        // Leer archivo
        const reader = new FileReader();

        reader.onload = function (e) {
            if (processingToken.cancelled) {
                worker.terminate();
                URL.revokeObjectURL(workerURL);
                reject(new Error('Cancelado'));
                return;
            }

            // Enviar imagen al worker
            worker.postMessage({
                imageData: e.target.result,
                maxWidth: maxWidth,
                quality: quality,
                fileType: file.type
            });
        };

        reader.onerror = function () {
            worker.terminate();
            URL.revokeObjectURL(workerURL);
            reject(new Error('No se pudo leer el archivo'));
        };

        // Escuchar mensajes del worker
        worker.onmessage = function (e) {
            const { type, progress, message, result, error } = e.data;

            if (processingToken.cancelled) {
                worker.terminate();
                URL.revokeObjectURL(workerURL);
                reject(new Error('Cancelado'));
                return;
            }

            switch (type) {
                case 'progress':
                    if (onProgress) {
                        onProgress(progress, message || '');
                    }
                    break;

                case 'info':
                    console.log('Imagen original:', e.data.originalWidth, 'x', e.data.originalHeight);
                    break;

                case 'success':
                    worker.terminate();
                    URL.revokeObjectURL(workerURL);
                    processingToken.worker = null;

                    // Calcular estadísticas
                    const reduction = ((1 - e.data.compressedSize / e.data.originalSize) * 100).toFixed(1);
                    console.log(`Worker: Imagen comprimida ${reduction}% de reducción`);

                    resolve(result);
                    break;

                case 'error':
                    worker.terminate();
                    URL.revokeObjectURL(workerURL);
                    processingToken.worker = null;
                    reject(new Error(error));
                    break;
            }
        };

        worker.onerror = function (error) {
            worker.terminate();
            URL.revokeObjectURL(workerURL);
            processingToken.worker = null;
            reject(new Error('Error en el procesamiento: ' + error.message));
        };

        // Iniciar lectura
        reader.readAsDataURL(file);
    });
}

/**
 * Comprime una imagen para optimizar rendimiento (método estándar)
 * @param {File} file - Archivo de imagen
 * @param {number} maxWidth - Ancho máximo en píxeles
 * @param {number} quality - Calidad de compresión (0-1)
 * @param {Function} onProgress - Callback de progreso opcional
 * @returns {Promise<string>} - Data URL de la imagen comprimida
 */
function compressImage(file, maxWidth = 1200, quality = 0.85, onProgress = null) {
    return new Promise((resolve, reject) => {
        // Usar configuración global
        const appConfig = window.APP_CONFIG || { IMAGE: { MAX_FILE_SIZE: 10 * 1024 * 1024, PROCESSING_TIMEOUT: 30000 } };

        // Validar tamaño máximo del archivo
        if (file.size > appConfig.IMAGE.MAX_FILE_SIZE) {
            const sizeMB = (appConfig.IMAGE.MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
            reject(new Error(`La imagen es demasiado grande (máximo ${sizeMB}MB)`));
            return;
        }

        const reader = new FileReader();
        const fileType = file.type; // Guardar tipo original
        let img = null;
        let canvas = null;
        let timeoutId = null;

        // Función de limpieza de memoria
        const cleanup = () => {
            // Limpiar timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }

            // Limpiar canvas
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                canvas.width = 0;
                canvas.height = 0;
                canvas = null;
            }

            // Limpiar imagen
            if (img) {
                img.onload = null;
                img.onerror = null;
                img.src = '';
                img = null;
            }

            // Limpiar reader
            reader.onload = null;
            reader.onerror = null;
        };

        // Timeout usando configuración
        timeoutId = setTimeout(() => {
            cleanup();
            const timeoutSec = (appConfig.IMAGE.PROCESSING_TIMEOUT / 1000).toFixed(0);
            reject(new Error(`Timeout al procesar la imagen (${timeoutSec}s)`));
        }, appConfig.IMAGE.PROCESSING_TIMEOUT);

        reader.onload = function (e) {
            if (onProgress) onProgress(20);

            img = new Image();

            img.onload = function () {
                try {
                    if (onProgress) onProgress(40);

                    // Crear canvas para redimensionar
                    canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calcular nuevas dimensiones manteniendo aspect ratio
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    if (onProgress) onProgress(60);

                    // Dibujar imagen redimensionada
                    const ctx = canvas.getContext('2d');

                    // Para PNG con transparencia, limpiar canvas primero
                    if (fileType === 'image/png') {
                        ctx.clearRect(0, 0, width, height);
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    if (onProgress) onProgress(80);

                    // Usar tipo original si es soportado, sino JPEG como fallback
                    const supportedTypes = ['image/png', 'image/jpeg', 'image/webp'];
                    const outputType = supportedTypes.includes(fileType) ? fileType : 'image/jpeg';

                    // Convertir a data URL con compresión
                    const compressedDataUrl = canvas.toDataURL(outputType, quality);

                    if (onProgress) onProgress(100);

                    // Limpiar recursos antes de resolver
                    cleanup();
                    resolve(compressedDataUrl);
                } catch (error) {
                    cleanup();
                    reject(new Error('Error al comprimir la imagen: ' + error.message));
                }
            };

            img.onerror = function () {
                cleanup();
                reject(new Error('No se pudo cargar la imagen'));
            };

            img.src = e.target.result;
        };

        reader.onerror = function () {
            cleanup();
            reject(new Error('No se pudo leer el archivo'));
        };

        reader.readAsDataURL(file);
    });
}

// Caché para imágenes ya convertidas (evita reconversiones)
const imageConversionCache = new Map();
const MAX_CACHE_SIZE = 20; // Máximo 20 imágenes en caché

/**
 * Limpia el caché de imágenes si excede el tamaño máximo
 */
function cleanImageCache() {
    if (imageConversionCache.size > MAX_CACHE_SIZE) {
        // Eliminar las primeras entradas (FIFO)
        const entriesToDelete = imageConversionCache.size - MAX_CACHE_SIZE;
        const keys = Array.from(imageConversionCache.keys());
        for (let i = 0; i < entriesToDelete; i++) {
            imageConversionCache.delete(keys[i]);
        }
        console.log(`Caché limpiado: ${entriesToDelete} imágenes eliminadas`);
    }
}

/**
 * Convierte una URL de imagen a base64 usando proxy CORS
 * @param {string} url - URL de la imagen
 * @returns {Promise<string>} - Data URL en base64
 */
async function imageUrlToBase64(url) {
    if (!url || url.startsWith('data:')) {
        return url; // Ya es base64
    }

    // Verificar caché primero
    if (imageConversionCache.has(url)) {
        console.log('Usando imagen cacheada:', url.substring(0, 50) + '...');
        return imageConversionCache.get(url);
    }

    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        let timeoutId = null;
        let resolved = false;

        const resolveOnce = (result) => {
            if (!resolved) {
                resolved = true;
                if (timeoutId) clearTimeout(timeoutId);

                // Cachear resultado si es diferente de la URL original
                if (result !== url && result.startsWith('data:')) {
                    imageConversionCache.set(url, result);
                    cleanImageCache(); // Limpiar caché si es necesario
                }

                resolve(result);
            }
        };

        img.onload = function () {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL('image/jpeg', 0.9);

                // Limpiar canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.width = 0;
                canvas.height = 0;

                resolveOnce(dataURL);
            } catch (error) {
                console.error('Error al convertir imagen:', error);
                resolveOnce(url);
            }
        };

        img.onerror = function () {
            console.warn('No se pudo cargar imagen:', url);
            resolveOnce(url);
        };

        // Usar proxy CORS solo para URLs externas
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        img.src = proxyUrl;

        // Timeout optimizado de 8 segundos
        timeoutId = setTimeout(() => {
            console.warn('Timeout al convertir imagen:', url);
            resolveOnce(url);
        }, 8000);
    });
}

/**
 * Descarga PDF usando el generador optimizado
 */
async function downloadPdfDirectly() {
    const config = getConfig();
    window.pdfGenerator.generatePDF(config, 'download');
}

/**
 * Guarda los datos del formulario en localStorage
 */
function saveFormData() {
    try {
        const config = getConfig();
        // No guardar la URL de la imagen si es muy grande (dataURL), mejor solo la URL externa o nada para no saturar localStorage
        // Pero el usuario pidió que se guarde, así que intentaremos si no excede los límites típicos (5MB)
        localStorage.setItem('ticketConfig', JSON.stringify(config));
        console.log('Datos guardados en localStorage');
    } catch (e) {
        console.warn('No se pudo guardar en localStorage (posiblemente por tamaño de imagen)', e);
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




// Loosely inspired by https://dribbble.com/shots/9165032-Luke-Combs-Ticket-Stub
