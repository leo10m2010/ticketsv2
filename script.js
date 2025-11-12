// Generador de Tickets - Mes Morado

// Actualizar preview de números cuando cambian los inputs
document.addEventListener('DOMContentLoaded', function() {
    const startInput = document.getElementById('startNumber');
    const endInput = document.getElementById('endNumber');
    const dateInput = document.getElementById('eventDate');
    
    function updatePreview() {
        const start = parseInt(startInput.value) || 1;
        const end = parseInt(endInput.value) || 1;
        
        document.getElementById('previewStart').textContent = String(start).padStart(4, '0');
        document.getElementById('previewEnd').textContent = String(end).padStart(4, '0');
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
        
        document.getElementById('dayOfWeek').value = dayOfWeek;
        document.getElementById('dateText').value = `${day} DE ${month}`;
        document.getElementById('year').value = year;
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
    const locationFull = document.getElementById('locationFull');
    if (locationFull) {
        locationFull.addEventListener('input', function() {
            const fullText = this.value;
            // Poner todo el texto en location1, location2 queda vacío
            document.getElementById('location1').value = fullText;
            document.getElementById('location2').value = '';
            generateLivePreview();
        });
        
        // Inicializar valores al cargar
        document.getElementById('location1').value = locationFull.value;
        document.getElementById('location2').value = '';
    }
});

// Función debounce para evitar demasiadas actualizaciones
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
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
        
        // Click en las opciones de color predefinidas
        colorOptions.forEach(option => {
            option.addEventListener('click', function() {
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                const color = this.dataset.color;
                document.getElementById(hiddenId).value = color;
                picker.value = color;
                generateLivePreview();
            });
        });
        
        // Color personalizado con el picker
        picker.addEventListener('input', function() {
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            document.getElementById(hiddenId).value = this.value;
            generateLivePreview();
        });
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

// Función para crear un ticket con datos personalizados
function createTicket(ticketNumber, config) {
    const template = document.getElementById('ticketTemplate');
    const ticketClone = template.cloneNode(true);
    ticketClone.style.display = 'block';
    ticketClone.id = '';
    
    const ticket = ticketClone.querySelector('.ticket');
    
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
        p.innerHTML = `VALE POR <span>${config.voucherQuantity}</span> ${config.voucherType}`;
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

// Función para obtener configuración del formulario
function getConfig() {
    return {
        startNumber: parseInt(document.getElementById('startNumber').value) || 1,
        endNumber: parseInt(document.getElementById('endNumber').value) || 50,
        ticketsPerPage: parseInt(document.getElementById('ticketsPerPage').value) || 6,
        dayOfWeek: document.getElementById('dayOfWeek').value,
        dateText: document.getElementById('dateText').value,
        year: document.getElementById('year').value,
        dateColor: document.getElementById('dateColor').value,
        eventTitle: document.getElementById('eventTitle').value,
        eventSubtitle: document.getElementById('eventSubtitle').value,
        titleFont: document.getElementById('titleFont').value,
        subtitleFont: document.getElementById('subtitleFont').value,
        titleColor: document.getElementById('titleColor').value,
        subtitleColor: document.getElementById('subtitleColor').value,
        brandText: document.getElementById('brandText').value,
        voucherType: document.getElementById('voucherType').value,
        voucherQuantity: document.getElementById('voucherQuantity').value,
        voucherFont: document.getElementById('voucherFont').value,
        voucherColor: document.getElementById('voucherColor').value,
        location1: document.getElementById('location1').value,
        location2: document.getElementById('location2').value,
        imageUrl: document.getElementById('imageUrl').value,
        qrLink: document.getElementById('qrLink').value,
        qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(document.getElementById('qrLink').value)}`,
        titleSize: document.getElementById('titleSize').value,
        subtitleSize: document.getElementById('subtitleSize').value
    };
}

// Función para generar vista previa en vivo
function generateLivePreview() {
    const config = getConfig();
    const previewContainer = document.getElementById('previewContainer');
    
    // Limpiar contenedor
    previewContainer.innerHTML = '';
    
    // Limitar la vista previa a máximo 10 tickets para no sobrecargar
    const maxPreview = Math.min(config.endNumber - config.startNumber + 1, 10);
    
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
        moreInfo.innerHTML = `<i class="fas fa-info-circle"></i> Mostrando 10 de ${config.endNumber - config.startNumber + 1} tickets. Todos se generarán al imprimir.`;
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
    
    // Validar límites
    if (totalTickets > 2000) {
        alert('⚠️ Por favor, limita la generación a máximo 2000 tickets para mantener el rendimiento óptimo.');
        return;
    }
    
    if (totalTickets > 500) {
        const confirmLarge = confirm(`🚨 Estás a punto de generar ${totalTickets} tickets.\n\n` +
            'Este proceso puede tomar varios segundos.\n' +
            '¿Deseas continuar con la generación optimizada?');
        
        if (!confirmLarge) return;
    }
    
    try {
        // Usar el generador optimizado
        await window.pdfGenerator.generatePDF(config);
    } catch (error) {
        console.error('Error al generar PDF:', error);
        alert('❌ Error al generar el PDF: ' + error.message);
    }
}

/**
 * Función de respaldo para compatibilidad con el método original
 * Se mantiene para referencia pero se recomienda usar printTickets()
 */
function printTicketsLegacy() {
    const config = getConfig();
    const printArea = document.getElementById('printArea');
    
    // Limpiar área de impresión
    printArea.innerHTML = '';
    
    const totalTickets = config.endNumber - config.startNumber + 1;
    const ticketsPerPage = config.ticketsPerPage;
    const totalPages = Math.ceil(totalTickets / ticketsPerPage);
    
    let currentTicket = config.startNumber;
    
    // Crear páginas
    for (let page = 0; page < totalPages; page++) {
        const printPage = document.createElement('div');
        printPage.className = `print-page tickets-${ticketsPerPage}`;
        
        // Agregar tickets a la página
        const ticketsInThisPage = Math.min(ticketsPerPage, config.endNumber - currentTicket + 1);
        
        for (let i = 0; i < ticketsInThisPage; i++) {
            const ticketWrapper = document.createElement('div');
            const ticket = createTicket(currentTicket, config);
            ticketWrapper.appendChild(ticket);
            printPage.appendChild(ticketWrapper);
            currentTicket++;
        }
        
        printArea.appendChild(printPage);
    }
    
    // Esperar un momento para que las imágenes se carguen antes de imprimir
    setTimeout(() => {
        window.print();
    }, 500);
}

// Configurar drag and drop para imagen principal
function setupImageUpload() {
    const imageDropZone = document.getElementById('imageDropZone');
    const imageFileInput = document.getElementById('imageFileInput');
    const imageUrlInput = document.getElementById('imageUrl');
    
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
    
    // Función para manejar el archivo
    function handleImageFile(file) {
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imageUrlInput.value = e.target.result;
                imageDropZone.classList.add('has-image');
                imageDropZone.querySelector('p').textContent = '✓ Imagen cargada';
                generateLivePreview();
            };
            reader.readAsDataURL(file);
        }
    }
}

// Loosely inspired by https://dribbble.com/shots/9165032-Luke-Combs-Ticket-Stub