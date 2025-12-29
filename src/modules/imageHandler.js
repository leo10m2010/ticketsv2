/**
 * Image Handler Module - Procesamiento y compresión de imágenes
 * Generador de Tickets v2
 * 
 * Este módulo contiene todas las funciones relacionadas con:
 * - Upload de imágenes (drag & drop)
 * - Compresión de imágenes (estándar y con Web Worker)
 * - Modal de progreso de compresión
 * - Conversión de URLs a Base64
 */
(function (global) {
    'use strict';

    // Variable global para rastrear el procesamiento de imágenes
    let currentImageProcessing = null;

    // Caché para imágenes ya convertidas
    const imageConversionCache = new Map();
    const MAX_CACHE_SIZE = 20;

    /**
     * Limpia el caché de imágenes si excede el tamaño máximo
     */
    function cleanImageCache() {
        if (imageConversionCache.size > MAX_CACHE_SIZE) {
            const keysToDelete = [];
            let count = 0;
            for (const key of imageConversionCache.keys()) {
                if (count < imageConversionCache.size - MAX_CACHE_SIZE + 5) {
                    keysToDelete.push(key);
                    count++;
                }
            }
            keysToDelete.forEach(key => imageConversionCache.delete(key));
        }
    }

    /**
     * Crea un Web Worker para compresión
     */
    function getWorkerURL() {
        // Código del worker inline
        const workerCode = `
            self.onmessage = function(e) {
                const { imageData, maxWidth, quality } = e.data;
                
                self.postMessage({ type: 'progress', progress: 10, message: 'Iniciando compresión...' });
                
                // Crear canvas offscreen
                const canvas = new OffscreenCanvas(imageData.width, imageData.height);
                const ctx = canvas.getContext('2d');
                
                self.postMessage({ type: 'progress', progress: 30, message: 'Redimensionando...' });
                
                // Calcular nuevas dimensiones
                let width = imageData.width;
                let height = imageData.height;
                
                if (width > maxWidth) {
                    const ratio = maxWidth / width;
                    width = maxWidth;
                    height = Math.round(height * ratio);
                }
                
                canvas.width = width;
                canvas.height = height;
                
                self.postMessage({ type: 'progress', progress: 50, message: 'Procesando píxeles...' });
                
                // Dibujar imagen redimensionada
                ctx.putImageData(imageData, 0, 0);
                
                self.postMessage({ type: 'progress', progress: 70, message: 'Comprimiendo...' });
                
                // Convertir a blob
                canvas.convertToBlob({ type: 'image/jpeg', quality: quality }).then(blob => {
                    const reader = new FileReader();
                    reader.onload = function() {
                        self.postMessage({ 
                            type: 'complete', 
                            progress: 100, 
                            dataUrl: reader.result 
                        });
                    };
                    reader.readAsDataURL(blob);
                }).catch(err => {
                    self.postMessage({ type: 'error', error: err.message });
                });
            };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        return URL.createObjectURL(blob);
    }

    /**
     * Comprime una imagen (método estándar)
     */
    function compressImage(file, maxWidth = 1200, quality = 0.85, onProgress = null) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            const cleanup = () => {
                // Cleanup
            };

            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    if (onProgress) onProgress(30, 'Redimensionando...');

                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        const ratio = maxWidth / width;
                        width = maxWidth;
                        height = Math.round(height * ratio);
                    }

                    if (onProgress) onProgress(50, 'Comprimiendo...');

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    if (onProgress) onProgress(80, 'Finalizando...');

                    const dataUrl = canvas.toDataURL('image/jpeg', quality);

                    if (onProgress) onProgress(100, 'Completado');

                    cleanup();
                    resolve(dataUrl);
                };

                img.onerror = () => {
                    cleanup();
                    reject(new Error('Error al cargar la imagen'));
                };

                img.src = e.target.result;
            };

            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };

            if (onProgress) onProgress(10, 'Leyendo archivo...');
            reader.readAsDataURL(file);
        });
    }

    /**
     * Comprime una imagen usando Web Worker
     */
    function compressImageWithWorker(file, maxWidth = 1200, quality = 0.85, processingToken, onProgress) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Crear canvas para obtener ImageData
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    try {
                        const workerURL = getWorkerURL();
                        processingToken.workerURL = workerURL;

                        const worker = new Worker(workerURL);
                        processingToken.worker = worker;

                        worker.onmessage = (e) => {
                            const { type, progress, message, dataUrl, error } = e.data;

                            if (type === 'progress') {
                                if (onProgress) onProgress(progress, message);
                            } else if (type === 'complete') {
                                worker.terminate();
                                URL.revokeObjectURL(workerURL);
                                resolve(dataUrl);
                            } else if (type === 'error') {
                                worker.terminate();
                                URL.revokeObjectURL(workerURL);
                                reject(new Error(error));
                            }
                        };

                        worker.onerror = (error) => {
                            worker.terminate();
                            URL.revokeObjectURL(workerURL);
                            reject(new Error('Error en Web Worker'));
                        };

                        worker.postMessage({ imageData, maxWidth, quality });

                    } catch (e) {
                        // Fallback to standard compression
                        compressImage(file, maxWidth, quality, onProgress)
                            .then(resolve)
                            .catch(reject);
                    }
                };

                img.onerror = () => reject(new Error('Error al cargar imagen'));
                img.src = e.target.result;
            };

            reader.onerror = () => reject(new Error('Error al leer archivo'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Convierte una URL de imagen a base64
     */
    function imageUrlToBase64(url) {
        return new Promise((resolve) => {
            if (!url || url.startsWith('data:')) {
                resolve(url);
                return;
            }

            // Check cache
            if (imageConversionCache.has(url)) {
                resolve(imageConversionCache.get(url));
                return;
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';

            let resolved = false;
            const resolveOnce = (result) => {
                if (!resolved) {
                    resolved = true;
                    if (result && result.startsWith('data:')) {
                        imageConversionCache.set(url, result);
                        cleanImageCache();
                    }
                    resolve(result);
                }
            };

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    resolveOnce(dataUrl);
                } catch (e) {
                    resolveOnce(url);
                }
            };

            img.onerror = () => {
                resolveOnce(url);
            };

            setTimeout(() => resolveOnce(url), 5000);
            img.src = url;
        });
    }

    /**
     * Configura drag and drop para imagen principal
     */
    function setupImageUpload() {
        const imageDropZone = getElement('imageDropZone', false);
        const imageFileInput = getElement('imageFileInput', false);
        const imageUrlInput = getElement('imageUrl', false);

        if (!imageDropZone || !imageFileInput || !imageUrlInput) {
            console.warn('Elementos de upload de imagen no encontrados');
            return;
        }

        imageDropZone.addEventListener('click', () => imageFileInput.click());

        imageFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleImageFile(e.target.files[0]);
            }
        });

        imageDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageDropZone.classList.add('drag-over');
        });

        imageDropZone.addEventListener('dragleave', () => {
            imageDropZone.classList.remove('drag-over');
        });

        imageDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            imageDropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                handleImageFile(e.dataTransfer.files[0]);
            }
        });

        async function handleImageFile(file) {
            if (!file || !file.type.startsWith('image/')) return;

            if (currentImageProcessing) {
                currentImageProcessing.cancelled = true;
                if (currentImageProcessing.worker) {
                    currentImageProcessing.worker.terminate();
                }
            }

            const processingToken = { cancelled: false, worker: null, workerURL: null };
            currentImageProcessing = processingToken;

            try {
                const appConfig = global.APP_CONFIG || { IMAGE: { MAX_WIDTH: 1200, COMPRESSION_QUALITY: 0.85 } };
                const isLargeImage = file.size > 3 * 1024 * 1024;

                let compressedDataUrl;

                if (isLargeImage && typeof Worker !== 'undefined') {
                    compressedDataUrl = await compressImageWithWorker(
                        file,
                        appConfig.IMAGE.MAX_WIDTH,
                        appConfig.IMAGE.COMPRESSION_QUALITY,
                        processingToken,
                        (progress, message) => {
                            console.log(`Compresión: ${progress}% - ${message}`);
                        }
                    );
                } else {
                    compressedDataUrl = await compressImage(
                        file,
                        appConfig.IMAGE.MAX_WIDTH,
                        appConfig.IMAGE.COMPRESSION_QUALITY,
                        (progress) => {
                            console.log(`Compresión: ${progress}%`);
                        }
                    );
                }

                if (processingToken.cancelled) return;

                imageUrlInput.value = compressedDataUrl;
                imageDropZone.classList.add('has-image');
                generateLivePreview();
                saveFormData();

                toast.success('Imagen cargada correctamente', 'Imagen');

            } catch (error) {
                console.error('Error procesando imagen:', error);
                toast.error('Error al procesar la imagen', 'Error');
            }
        }
    }

    // Exportar al namespace global
    global.ImageHandler = {
        setupImageUpload,
        compressImage,
        compressImageWithWorker,
        imageUrlToBase64,
        cleanImageCache
    };

    global.setupImageUpload = setupImageUpload;
    global.compressImage = compressImage;
    global.compressImageWithWorker = compressImageWithWorker;
    global.imageUrlToBase64 = imageUrlToBase64;

})(window);
