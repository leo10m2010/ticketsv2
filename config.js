/**
 * Configuración global de la aplicación
 * Centraliza todos los valores configurables
 */
const APP_CONFIG = {
    // Configuración de imágenes
    IMAGE: {
        MAX_WIDTH: 1200,              // Ancho máximo para compresión
        COMPRESSION_QUALITY: 0.85,    // Calidad de compresión (0-1)
        MAX_FILE_SIZE: 50 * 1024 * 1024,  // 50MB máximo
        PROCESSING_TIMEOUT: 30000     // 30 segundos timeout
    },

    // Configuración de vista previa
    PREVIEW: {
        MAX_TICKETS_SHOWN: 10,        // Máximo de tickets en preview
        DEBOUNCE_DELAY: 300           // Delay para debounce en ms
    },

    // Configuración de PDF
    PDF: {
        BATCH_SIZE: 50,               // Tickets por lote
        MAX_MEMORY_MB: 400,           // Límite de memoria en MB
        MAX_TICKETS_TOTAL: 2000,      // Máximo tickets totales
        MAX_TICKETS_DIRECT: 500,      // Máximo para descarga directa
        MASS_GENERATION_THRESHOLD: 500 // Umbral para confirmación
    },

    // Timeouts y delays
    TIMING: {
        TOAST_BUTTON_DELAY: 100,      // Delay para agregar botones a toast
        IMAGE_LOAD_TIMEOUT: 10000,    // Timeout para carga de imágenes
        PREVIEW_UPDATE_DELAY: 300     // Delay para actualizar preview
    },

    // URLs y APIs
    API: {
        QR_CODE_BASE: 'https://api.qrserver.com/v1/create-qr-code/',
        QR_CODE_SIZE: 200
    }
};

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.APP_CONFIG = APP_CONFIG;
}
