/**
 * Web Worker para comprimir imágenes sin bloquear el UI principal
 * Maneja imágenes grandes de forma eficiente
 */

self.onmessage = async function(e) {
    const { imageData, maxWidth, quality, fileType } = e.data;

    try {
        // Crear imagen desde data URL
        const img = await loadImage(imageData);

        // Calcular dimensiones
        let width = img.width;
        let height = img.height;

        // Informar tamaño original
        self.postMessage({
            type: 'info',
            originalWidth: width,
            originalHeight: height
        });

        // Para imágenes muy grandes, hacer reducción progresiva
        if (width > 3000 || height > 3000) {
            self.postMessage({ type: 'progress', progress: 10, message: 'Imagen muy grande detectada...' });

            // Paso 1: Reducir a tamaño intermedio (50%)
            const intermediateWidth = width * 0.5;
            const intermediateHeight = height * 0.5;

            const step1Canvas = createCanvas(intermediateWidth, intermediateHeight);
            const step1Ctx = step1Canvas.getContext('2d');
            step1Ctx.drawImage(img, 0, 0, intermediateWidth, intermediateHeight);

            self.postMessage({ type: 'progress', progress: 40, message: 'Reduciendo tamaño inicial...' });

            // Paso 2: Reducir al tamaño final
            width = intermediateWidth;
            height = intermediateHeight;

            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }

            const finalCanvas = createCanvas(width, height);
            const finalCtx = finalCanvas.getContext('2d');

            // Para PNG, limpiar canvas primero
            if (fileType === 'image/png') {
                finalCtx.clearRect(0, 0, width, height);
            }

            finalCtx.drawImage(step1Canvas, 0, 0, width, height);

            self.postMessage({ type: 'progress', progress: 70, message: 'Aplicando compresión...' });

            // Convertir a blob
            const outputType = getSupportedType(fileType);
            const blob = await canvasToBlob(finalCanvas, outputType, quality);

            self.postMessage({ type: 'progress', progress: 90, message: 'Finalizando...' });

            // Convertir blob a data URL
            const dataUrl = await blobToDataURL(blob);

            self.postMessage({
                type: 'success',
                result: dataUrl,
                originalSize: imageData.length,
                compressedSize: dataUrl.length
            });

        } else {
            // Para imágenes normales, proceso estándar
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

/**
 * Carga una imagen desde data URL usando createImageBitmap para mejor rendimiento
 */
async function loadImage(dataUrl) {
    try {
        // Convertir data URL a blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        // Usar createImageBitmap para carga optimizada y acelerada por hardware
        const bitmap = await createImageBitmap(blob);
        return bitmap;
    } catch (error) {
        // Fallback al método tradicional si createImageBitmap falla
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
            img.src = dataUrl;
        });
    }
}

/**
 * Crea un canvas con las dimensiones especificadas
 */
function createCanvas(width, height) {
    const canvas = new OffscreenCanvas(width, height);
    return canvas;
}

/**
 * Convierte canvas a blob
 */
async function canvasToBlob(canvas, type, quality) {
    return await canvas.convertToBlob({
        type: type,
        quality: quality
    });
}

/**
 * Convierte blob a data URL
 */
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Error al convertir blob'));
        reader.readAsDataURL(blob);
    });
}

/**
 * Obtiene tipo de imagen soportado
 */
function getSupportedType(fileType) {
    const supportedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    return supportedTypes.includes(fileType) ? fileType : 'image/jpeg';
}
