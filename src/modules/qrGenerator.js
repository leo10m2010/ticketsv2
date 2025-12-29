/**
 * QR Generator Module - Generación de códigos QR
 * Generador de Tickets v2
 */
(function (global) {
    'use strict';

    // Caché para el QR local
    let cachedQRCodeUrl = '';

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

    /**
     * Obtiene la URL cacheada del QR
     * @returns {string} - URL del QR
     */
    function getCachedQRUrl() {
        return cachedQRCodeUrl;
    }

    /**
     * Establece la URL cacheada del QR
     * @param {string} url - URL del QR
     */
    function setCachedQRUrl(url) {
        cachedQRCodeUrl = url;
    }

    // Exportar al namespace global
    global.QRGenerator = {
        updateLocalQRCode,
        getCachedQRUrl,
        setCachedQRUrl
    };

    // También exponer individualmente para compatibilidad
    global.updateLocalQRCode = updateLocalQRCode;

})(window);
