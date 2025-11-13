// Generador de Tickets - Mes Morado

// Variable global para rastrear el procesamiento de imágenes
let currentImageProcessing = null;

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
document.addEventListener('DOMContentLoaded', function() {
    const startInput = document.getElementById('startNumber');
    const endInput = document.getElementById('endNumber');
    const dateInput = document.getElementById('eventDate');
    
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
    
    // Generar vista previa inicial
    generateLivePreview();
    
    // Actualizar vista previa cuando cambian los campos
    const allInputs = document.querySelectorAll('#dashboard input, #dashboard select');
    allInputs.forEach(input => {
        input.addEventListener('input', debounce(generateLivePreview, 500));
        input.addEventListener('change', generateLivePreview);
    });
    
    // Configurar selectores de color
    setupColorSelectors();
    
    // Configurar drag and drop para imagen
    setupImageUpload();
    
    // Manejar campo de ubicación combinado
    const locationFull = getElement('locationFull', false);
    if (locationFull) {
        locationFull.addEventListener('input', function() {
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
});

// Función debounce para evitar demasiadas actualizaciones
function debounce(func, wait) {
    let timeout;
    const executedFunction = function(...args) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };

    // Agregar método para cancelar manualmente
    executedFunction.cancel = function() {
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

        const handlePickerInput = function() {
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
        if (config.titleSize) {
            leftH1.style.fontSize = config.titleSize + 'px';
        }
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
 * Genera URL de código QR con fallback
 * @param {string} data - Datos para el QR
 * @returns {string} - URL del QR code
 */
function generateQRCodeUrl(data) {
    if (!data || data.trim() === '') {
        // QR placeholder si no hay datos
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UVI8L3RleHQ+PC9zdmc+';
    }

    // Usar configuración global
    const config = window.APP_CONFIG || { API: { QR_CODE_BASE: 'https://api.qrserver.com/v1/create-qr-code/', QR_CODE_SIZE: 200 } };
    return `${config.API.QR_CODE_BASE}?size=${config.API.QR_CODE_SIZE}x${config.API.QR_CODE_SIZE}&data=${encodeURIComponent(data)}`;
}

/**
 * Obtiene configuración del formulario con validación
 * @returns {Object} - Configuración validada
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
        qrUrl: generateQRCodeUrl(document.getElementById('qrLink').value),
        titleSize: parseInt(document.getElementById('titleSize').value) || 48,
        subtitleSize: parseInt(document.getElementById('subtitleSize').value) || 24
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

    // Limpiar contenedor
    previewContainer.innerHTML = '';

    // Limitar la vista previa usando configuración
    const appConfig = window.APP_CONFIG || { PREVIEW: { MAX_TICKETS_SHOWN: 10 } };
    const maxPreview = Math.min(config.endNumber - config.startNumber + 1, appConfig.PREVIEW.MAX_TICKETS_SHOWN);
    
    // Generar tickets de muestra
    for (let i = 0; i < maxPreview; i++) {
        const ticketNumber = config.startNumber + i;
        const ticket = createTicket(ticketNumber, config);
        previewContainer.appendChild(ticket);
    }
    
    // Si hay más tickets, mostrar mensaje
    if (config.endNumber - config.startNumber + 1 > 10) {
        const moreInfo = document.createElement('div');
        moreInfo.style.gridColumn = '1 / -1';
        moreInfo.style.textAlign = 'center';
        moreInfo.style.padding = '20px';
        moreInfo.style.color = '#4a437e';
        moreInfo.style.fontSize = '18px';
        moreInfo.style.fontWeight = 'bold';

        // Crear contenido de forma segura
        const icon = document.createElement('i');
        icon.className = 'fas fa-info-circle';
        moreInfo.appendChild(icon);

        const totalTickets = config.endNumber - config.startNumber + 1;
        moreInfo.appendChild(document.createTextNode(` Mostrando 10 de ${totalTickets} tickets. Todos se generarán al imprimir.`));

        previewContainer.appendChild(moreInfo);
    }
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
        // Mostrar toast de confirmación con botones
        const confirmToast = toast.info(
            `Estás a punto de generar ${totalTickets} tickets. Este proceso puede tomar varios segundos.`,
            '🚨 Generación masiva de tickets',
            0 // Sin auto-cierre
        );
        
        // Agregar botones de acción al toast
        setManagedTimeout(() => {
            const toastElement = document.getElementById(confirmToast);
            if (toastElement) {
                const actionButtons = document.createElement('div');
                actionButtons.style.marginTop = '10px';
                actionButtons.style.display = 'flex';
                actionButtons.style.gap = '10px';
                
                const continueBtn = document.createElement('button');
                continueBtn.textContent = 'Continuar';
                continueBtn.style.padding = '8px 16px';
                continueBtn.style.backgroundColor = '#4CAF50';
                continueBtn.style.color = 'white';
                continueBtn.style.border = 'none';
                continueBtn.style.borderRadius = '4px';
                continueBtn.style.cursor = 'pointer';

                const handleContinue = async () => {
                    toast.hide(confirmToast);
                    // Continuar con la generación
                    await continueGeneration(config);
                };
                continueBtn.addEventListener('click', handleContinue);

                const cancelBtn = document.createElement('button');
                cancelBtn.textContent = 'Cancelar';
                cancelBtn.style.padding = '8px 16px';
                cancelBtn.style.backgroundColor = '#f44336';
                cancelBtn.style.color = 'white';
                cancelBtn.style.border = 'none';
                cancelBtn.style.borderRadius = '4px';
                cancelBtn.style.cursor = 'pointer';

                const handleCancel = () => {
                    toast.hide(confirmToast);
                };
                cancelBtn.addEventListener('click', handleCancel);
                
                actionButtons.appendChild(continueBtn);
                actionButtons.appendChild(cancelBtn);
                toastElement.appendChild(actionButtons);
            }
        }, 100);
        
        return; // Salir y esperar la decisión del usuario
    }
    
    // Si es menos de 500 tickets, continuar directamente
    await continueGeneration(config);
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
                    <div class="modern-progress-bar">
                        <div class="modern-progress-fill" style="width: 0%"></div>
                    </div>
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
function createImageWorkerBlob() {
    const workerCode = `
self.onmessage = async function(e) {
    const { imageData, maxWidth, quality, fileType } = e.data;

    try {
        const img = await loadImage(imageData);
        let width = img.width;
        let height = img.height;

        self.postMessage({
            type: 'info',
            originalWidth: width,
            originalHeight: height
        });

        if (width > 3000 || height > 3000) {
            self.postMessage({ type: 'progress', progress: 10, message: 'Imagen muy grande detectada...' });

            const intermediateWidth = width * 0.5;
            const intermediateHeight = height * 0.5;
            const step1Canvas = createCanvas(intermediateWidth, intermediateHeight);
            const step1Ctx = step1Canvas.getContext('2d');
            step1Ctx.drawImage(img, 0, 0, intermediateWidth, intermediateHeight);

            self.postMessage({ type: 'progress', progress: 40, message: 'Reduciendo tamaño inicial...' });

            width = intermediateWidth;
            height = intermediateHeight;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            const finalCanvas = createCanvas(width, height);
            const finalCtx = finalCanvas.getContext('2d');

            if (fileType === 'image/png') {
                finalCtx.clearRect(0, 0, width, height);
            }

            finalCtx.drawImage(step1Canvas, 0, 0, width, height);
            self.postMessage({ type: 'progress', progress: 70, message: 'Aplicando compresión...' });

            const outputType = getSupportedType(fileType);
            const blob = await canvasToBlob(finalCanvas, outputType, quality);
            self.postMessage({ type: 'progress', progress: 90, message: 'Finalizando...' });

            const dataUrl = await blobToDataURL(blob);

            self.postMessage({
                type: 'success',
                result: dataUrl,
                originalSize: imageData.length,
                compressedSize: dataUrl.length
            });

        } else {
            self.postMessage({ type: 'progress', progress: 30, message: 'Procesando imagen...' });

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            if (fileType === 'image/png') {
                ctx.clearRect(0, 0, width, height);
            }

            ctx.drawImage(img, 0, 0, width, height);
            self.postMessage({ type: 'progress', progress: 60, message: 'Comprimiendo...' });

            const outputType = getSupportedType(fileType);
            const blob = await canvasToBlob(canvas, outputType, quality);
            const dataUrl = await blobToDataURL(blob);

            self.postMessage({
                type: 'success',
                result: dataUrl,
                originalSize: imageData.length,
                compressedSize: dataUrl.length
            });
        }

    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};

async function loadImage(dataUrl) {
    try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        return bitmap;
    } catch (error) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
            img.src = dataUrl;
        });
    }
}

function createCanvas(width, height) {
    return new OffscreenCanvas(width, height);
}

async function canvasToBlob(canvas, type, quality) {
    return await canvas.convertToBlob({ type: type, quality: quality });
}

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al convertir blob'));
        reader.readAsDataURL(blob);
    });
}

function getSupportedType(fileType) {
    const supportedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    return supportedTypes.includes(fileType) ? fileType : 'image/jpeg';
}
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
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
function compressImageWithWorker(file, maxWidth = 1200, quality = 0.85, processingToken, onProgress) {
    return new Promise((resolve, reject) => {
        const appConfig = window.APP_CONFIG || { IMAGE: { MAX_FILE_SIZE: 10 * 1024 * 1024 } };

        // Validar tamaño máximo
        if (file.size > appConfig.IMAGE.MAX_FILE_SIZE) {
            const sizeMB = (appConfig.IMAGE.MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
            reject(new Error(`La imagen es demasiado grande (máximo ${sizeMB}MB)`));
            return;
        }

        // Crear Web Worker inline (funciona en file://)
        const workerURL = createImageWorkerBlob();
        const worker = new Worker(workerURL);
        processingToken.worker = worker;
        processingToken.workerURL = workerURL;

        // Leer archivo
        const reader = new FileReader();

        reader.onload = function(e) {
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

        reader.onerror = function() {
            worker.terminate();
            URL.revokeObjectURL(workerURL);
            reject(new Error('No se pudo leer el archivo'));
        };

        // Escuchar mensajes del worker
        worker.onmessage = function(e) {
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

        worker.onerror = function(error) {
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

        reader.onload = function(e) {
            if (onProgress) onProgress(20);

            img = new Image();

            img.onload = function() {
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

            img.onerror = function() {
                cleanup();
                reject(new Error('No se pudo cargar la imagen'));
            };

            img.src = e.target.result;
        };

        reader.onerror = function() {
            cleanup();
            reject(new Error('No se pudo leer el archivo'));
        };

        reader.readAsDataURL(file);
    });
}

/**
 * Continúa con la generación de PDF después de la confirmación
 */
async function continueGeneration(config) {
    try {
        // Usar el generador optimizado
        await window.pdfGenerator.generatePDF(config);
    } catch (error) {
        // Error ya manejado por el generador de PDF
        toast.error(
            'Error al generar el PDF: ' + error.message,
            'Error en la generación ❌'
        );
    }
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

        img.onload = function() {
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

        img.onerror = function() {
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
 * Descarga múltiples PDFs automáticamente dividiendo en lotes
 * Para grandes volúmenes (>200 tickets)
 */
async function downloadPdfInBatches() {
    const config = getConfig();
    const totalTickets = config.endNumber - config.startNumber + 1;
    const appConfig = window.APP_CONFIG || { PDF: { MAX_TICKETS_PER_PDF: 200, MAX_TICKETS_TOTAL: 10000 } };

    if (totalTickets > appConfig.PDF.MAX_TICKETS_TOTAL) {
        toast.error(
            `El máximo es ${appConfig.PDF.MAX_TICKETS_TOTAL} tickets. Por favor reduce la cantidad.`,
            'Demasiados tickets ❌'
        );
        return;
    }

    const ticketsPerPdf = appConfig.PDF.MAX_TICKETS_PER_PDF;
    const totalPdfs = Math.ceil(totalTickets / ticketsPerPdf);

    // Confirmar con el usuario
    const confirmToast = toast.info(
        `Se generarán ${totalPdfs} archivos PDF (${ticketsPerPdf} tickets cada uno aprox.). ¿Continuar?`,
        '📦 Descarga en lotes',
        0
    );

    return new Promise((resolve) => {
        setTimeout(() => {
            const toastElement = document.getElementById(confirmToast);
            if (!toastElement) return;

            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = 'margin-top: 12px; display: flex; gap: 10px;';

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = `✓ Generar ${totalPdfs} PDFs`;
            confirmBtn.style.cssText = 'flex: 1; padding: 8px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;';

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '✗ Cancelar';
            cancelBtn.style.cssText = 'flex: 1; padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;';

            confirmBtn.onclick = async () => {
                toast.hide(confirmToast);
                await generateBatchPdfs(config, totalTickets, ticketsPerPdf);
                resolve(true);
            };

            cancelBtn.onclick = () => {
                toast.hide(confirmToast);
                resolve(false);
            };

            buttonContainer.appendChild(confirmBtn);
            buttonContainer.appendChild(cancelBtn);
            toastElement.querySelector('.toast-content').appendChild(buttonContainer);
        }, 100);
    });
}

/**
 * Genera múltiples PDFs en lotes
 */
async function generateBatchPdfs(config, totalTickets, ticketsPerPdf) {
    const totalPdfs = Math.ceil(totalTickets / ticketsPerPdf);
    const progressToast = toast.progress('Iniciando descarga en lotes...', 'Preparando');

    let currentStart = config.startNumber;

    for (let pdfIndex = 0; pdfIndex < totalPdfs; pdfIndex++) {
        const currentEnd = Math.min(currentStart + ticketsPerPdf - 1, config.endNumber);
        const ticketsInThisPdf = currentEnd - currentStart + 1;

        toast.update(
            progressToast,
            `Generando PDF ${pdfIndex + 1} de ${totalPdfs}...`,
            `Tickets ${currentStart}-${currentEnd}`
        );

        // Crear config temporal para este lote
        const batchConfig = { ...config, startNumber: currentStart, endNumber: currentEnd };

        try {
            await downloadSinglePdf(batchConfig, `${pdfIndex + 1}_de_${totalPdfs}`);
        } catch (error) {
            console.error(`Error generando PDF ${pdfIndex + 1}:`, error);
            toast.error(
                `Error en PDF ${pdfIndex + 1}: ${error.message}`,
                'Error parcial ⚠️',
                5000
            );
        }

        currentStart = currentEnd + 1;

        // Pausa entre PDFs para no saturar
        if (pdfIndex < totalPdfs - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    toast.complete(
        progressToast,
        `✓ ${totalPdfs} PDFs descargados con ${totalTickets} tickets total`,
        'success',
        5000
    );
}

/**
 * Descarga un PDF individual (función auxiliar)
 */
async function downloadSinglePdf(config, suffix = '') {
    return downloadPdfDirectlyCore(config, suffix);
}

/**
 * Descarga PDF directamente usando jsPDF + html2canvas
 * Versión reescrita sin html2pdf.js para evitar problemas de compatibilidad
 */
async function downloadPdfDirectly() {
    const config = getConfig();
    const totalTickets = config.endNumber - config.startNumber + 1;
    const appConfig = window.APP_CONFIG || { PDF: { MAX_TICKETS_DIRECT: 100, AUTO_SPLIT_THRESHOLD: 200 } };

    // Si excede el umbral, ofrecer descarga en lotes
    if (totalTickets > appConfig.PDF.AUTO_SPLIT_THRESHOLD) {
        toast.info(
            `Para ${totalTickets} tickets, se recomienda descarga en lotes automática.`,
            'Usar descarga en lotes? 📦',
            5000
        );

        return downloadPdfInBatches();
    }

    // Validar límites (conservador para descarga directa)
    if (totalTickets > appConfig.PDF.MAX_TICKETS_DIRECT) {
        toast.warning(
            `Para descargas directas, el máximo es ${appConfig.PDF.MAX_TICKETS_DIRECT} tickets. Usa "Imprimir (Vista Previa)" o divide en lotes.`,
            'Demasiados tickets ⚠️'
        );
        return;
    }

    return downloadPdfDirectlyCore(config);
}

/**
 * Función core para generar PDF (usada por descarga normal y en lotes)
 */
async function downloadPdfDirectlyCore(config, suffix = '') {

    // Validar que las bibliotecas estén disponibles
    const jsPDF = window.jspdf?.jsPDF; // jsPDF v2+ se accede así
    if (!jsPDF || typeof html2canvas === 'undefined') {
        console.error('Estado de bibliotecas:', {
            jspdf: window.jspdf,
            jsPDF: jsPDF,
            html2canvas: typeof html2canvas
        });
        toast.error(
            'Las bibliotecas PDF no se cargaron correctamente. Por favor, recarga la página.',
            'Error de bibliotecas ❌'
        );
        return;
    }

    const progressToast = toast.progress('Preparando PDF...', 'Iniciando');

    // Convertir imágenes a base64 primero
    toast.update(progressToast, 'Convirtiendo imágenes...', 'Progreso: 5%');
    let imageBase64 = config.imageUrl;
    let qrBase64 = config.qrUrl;

    try {
        if (config.imageUrl && !config.imageUrl.startsWith('data:')) {
            imageBase64 = await imageUrlToBase64(config.imageUrl);
        }
    } catch (error) {
        console.warn('Error al convertir imagen:', error);
    }

    try {
        if (config.qrUrl && !config.qrUrl.startsWith('data:')) {
            qrBase64 = await imageUrlToBase64(config.qrUrl);
        }
    } catch (error) {
        console.warn('Error al convertir QR:', error);
    }

    const pdfConfig = { ...config, imageUrl: imageBase64, qrUrl: qrBase64 };

    // Crear contenedor temporal VISIBLE para renderizado
    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: 210mm;
        background: white;
        z-index: 9999;
    `;
    document.body.appendChild(tempContainer);

    try {
        const ticketsPerPage = config.ticketsPerPage;
        const totalPages = Math.ceil(totalTickets / ticketsPerPage);
        let currentTicket = config.startNumber;

        toast.update(progressToast, 'Generando tickets...', 'Progreso: 15%');

        // Crear PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Generar cada página del PDF
        for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
            // Limpiar contenedor
            tempContainer.innerHTML = '';

            // Crear página con estilos similares al print
            const printPage = document.createElement('div');
            printPage.style.cssText = `
                width: 210mm;
                height: 297mm;
                background: white;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: center;
                padding: ${ticketsPerPage === 6 ? '2mm 3mm' : '2mm 3mm'};
                gap: ${ticketsPerPage === 6 ? '1mm' : '0.5mm'};
                box-sizing: border-box;
            `;

            const ticketsInThisPage = Math.min(ticketsPerPage, config.endNumber - currentTicket + 1);

            // Generar tickets para esta página
            for (let i = 0; i < ticketsInThisPage; i++) {
                const ticketWrapper = document.createElement('div');
                ticketWrapper.style.cssText = `
                    height: ${ticketsPerPage === 6 ? 'calc((297mm - 4mm - 5mm) / 6)' : 'calc((297mm - 4mm - 3.5mm) / 8)'};
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-shrink: 0;
                `;

                const ticketScaled = document.createElement('div');
                ticketScaled.style.cssText = `
                    transform: scale(${ticketsPerPage === 6 ? '0.68' : '0.56'});
                    transform-origin: center center;
                `;

                const ticket = createTicket(currentTicket, pdfConfig);
                if (ticket) {
                    ticketScaled.appendChild(ticket);
                    ticketWrapper.appendChild(ticketScaled);
                    printPage.appendChild(ticketWrapper);
                }
                currentTicket++;
            }

            tempContainer.appendChild(printPage);

            // Actualizar progreso
            const progress = 15 + ((pageIndex + 1) / totalPages) * 40;
            toast.update(progressToast, `Generando página ${pageIndex + 1}/${totalPages}...`, `Progreso: ${progress.toFixed(0)}%`);

            // Esperar imágenes de esta página (timeout reducido)
            const images = tempContainer.querySelectorAll('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return Promise.race([
                    new Promise(resolve => {
                        img.onload = img.onerror = resolve;
                    }),
                    new Promise(resolve => setTimeout(resolve, 2500)) // Reducido de 3000ms
                ]);
            }));

            // Dar tiempo para renderizado (optimizado)
            await new Promise(resolve => setTimeout(resolve, 200)); // Reducido de 300ms

            // Capturar esta página con html2canvas (optimizado)
            toast.update(progressToast, `Capturando página ${pageIndex + 1}/${totalPages}...`, `Progreso: ${(55 + (pageIndex / totalPages) * 25).toFixed(0)}%`);

            const canvas = await html2canvas(printPage, {
                scale: 1.8, // Reducido de 2 (20% más rápido, calidad similar)
                useCORS: false,
                allowTaint: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: printPage.offsetWidth,
                height: printPage.offsetHeight,
                removeContainer: false
            });

            console.log(`Página ${pageIndex + 1} capturada:`, canvas.width, 'x', canvas.height);

            // Convertir canvas a imagen
            const imgData = canvas.toDataURL('image/jpeg', 0.92);

            // Limpiar canvas para liberar memoria
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 0;
            canvas.height = 0;

            // Agregar página al PDF
            if (pageIndex > 0) {
                pdf.addPage();
            }

            // Ajustar imagen para que encaje en la página A4
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height || 1) * pdfWidth / (canvas.width || 1);

            pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));

            // Pequeña pausa entre páginas (optimizada)
            await new Promise(resolve => setTimeout(resolve, 50)); // Reducido de 100ms
        }

        // Descargar PDF
        toast.update(progressToast, 'Guardando PDF...', 'Progreso: 95%');

        const filename = suffix
            ? `tickets_${config.startNumber}-${config.endNumber}_parte_${suffix}.pdf`
            : `tickets_${config.startNumber}-${config.endNumber}.pdf`;

        pdf.save(filename);

        if (!suffix) {
            // Solo mostrar toast de éxito si no es parte de un lote
            toast.complete(progressToast, `✓ PDF generado con ${totalTickets} tickets (${totalPages} páginas)`, 'success', 3000);
        }

    } catch (error) {
        toast.hide(progressToast);
        console.error('Error al generar PDF:', error);

        toast.error(
            `Error: ${error.message}. Intenta con menos tickets o usa "Imprimir (Vista Previa)".`,
            'Error al generar PDF ❌',
            6000
        );
    } finally {
        // Cerrar toast si es parte de un lote
        if (suffix) {
            toast.hide(progressToast);
        }

        // Limpieza mejorada con timeout reducido
        setTimeout(() => {
            if (tempContainer && tempContainer.parentNode) {
                tempContainer.parentNode.removeChild(tempContainer);
            }

            // Limpiar canvas huérfanos creados por html2canvas
            document.querySelectorAll('canvas').forEach(canvas => {
                if (!canvas.closest('.ticket') && !canvas.closest('.preview-container')) {
                    try {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                        }
                        canvas.width = 0;
                        canvas.height = 0;
                        if (canvas.parentNode) {
                            canvas.parentNode.removeChild(canvas);
                        }
                    } catch (e) {
                        // Ignorar errores de limpieza
                    }
                }
            });
        }, 300); // Reducido de 500ms
    }
}

// Loosely inspired by https://dribbble.com/shots/9165032-Luke-Combs-Ticket-Stub