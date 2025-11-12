/**
 * Generador de PDF Optimizado para Grandes Volúmenes
 * Implementa procesamiento asíncrono, control de memoria y progreso visible
 */

class PDFGenerator {
    constructor() {
        // Usar configuración global
        const config = window.APP_CONFIG || { PDF: { BATCH_SIZE: 50, MAX_MEMORY_MB: 400 } };
        this.batchSize = config.PDF.BATCH_SIZE;
        this.maxMemoryUsage = config.PDF.MAX_MEMORY_MB * 1024 * 1024;
        this.isCancelled = false;
        this.isProcessing = false;
    }

    /**
     * Genera PDF optimizado con soporte para grandes volúmenes
     * @param {Object} config - Configuración de los tickets
     * @returns {Promise<void>}
     */
    async generatePDF(config) {
        this.isCancelled = false;
        this.isProcessing = true;

        const startTime = performance.now();
        const totalTickets = config.endNumber - config.startNumber + 1;

        try {
            // Validar límites usando configuración
            const appConfig = window.APP_CONFIG || { PDF: { MAX_TICKETS_TOTAL: 2000 } };
            if (totalTickets > appConfig.PDF.MAX_TICKETS_TOTAL) {
                toast.error(
                    `Máximo ${appConfig.PDF.MAX_TICKETS_TOTAL} tickets permitidos para mantener el rendimiento. Por favor, genera los tickets en lotes más pequeños.`,
                    'Demasiados tickets'
                );
                return;
            }

            // Mostrar toast de progreso
        this.progressToastId = toast.progress('Iniciando generación de PDF...', 'Generando tickets');

            // Registrar estadísticas iniciales
            const startMemory = this.getMemoryUsage();

            // Usar estrategia según el volumen
            if (totalTickets <= 100) {
                await this.generateSmallBatch(config);
            } else {
                await this.generateLargeBatch(config);
            }

            const endTime = performance.now();
            const duration = (endTime - startTime) / 1000;
            const endMemory = this.getMemoryUsage();
            const memoryUsed = ((endMemory - startMemory) / 1024 / 1024).toFixed(1);
            const ticketsPerSecond = totalTickets / duration;

            // Cerrar toast de progreso y mostrar éxito
            if (this.progressToastId) {
                toast.complete(
                    this.progressToastId,
                    `📊 Estadísticas de generación:\n• Tiempo total: ${duration.toFixed(1)}s\n• Tickets generados: ${totalTickets}\n• Memoria usada: ${memoryUsed}MB\n• Velocidad: ${ticketsPerSecond.toFixed(1)} tickets/segundo`,
                    'success',
                    5000
                );
            }

        } catch (error) {
            // Cerrar toast de progreso
            if (this.progressToastId) {
                toast.hide(this.progressToastId);
            }
            
            if (error.message === 'Proceso cancelado por el usuario') {
                toast.warning(
                    'La generación de PDF fue cancelada exitosamente.',
                    'Proceso cancelado ⏹️'
                );
            } else {
                toast.error(
                    `${error.message} Por favor, intenta con menos tickets o recarga la página.`,
                    'Error en la generación ❌'
                );
            }
            
            throw error;
        } finally {
            this.isProcessing = false;
            this.isCancelled = false;
            this.progressToastId = null;
            this.cleanup();
        }
    }

    /**
     * Genera lotes pequeños (≤100 tickets) - método tradicional optimizado
     */
    async generateSmallBatch(config) {
        const printArea = document.getElementById('printArea');
        printArea.innerHTML = '';

        const totalTickets = config.endNumber - config.startNumber + 1;
        const ticketsPerPage = config.ticketsPerPage;
        const totalPages = Math.ceil(totalTickets / ticketsPerPage);

        for (let page = 0; page < totalPages; page++) {
            if (this.isCancelled) return;

            await this.processPage(page, config);
            
            const progress = ((page + 1) / totalPages) * 100;
            toast.update(this.progressToastId, `Generando página ${page + 1} de ${totalPages}`, `Progreso: ${progress.toFixed(0)}%`);
            
            // Pequeña pausa para no bloquear la UI
            await this.sleep(10);
        }

        // Esperar a que las imágenes se carguen
        await this.waitForImages();
        
        if (!this.isCancelled) {
            window.print();
        }
    }

    /**
     * Genera lotes grandes (>100 tickets) - con procesamiento por lotes
     */
    async generateLargeBatch(config) {
        const totalTickets = config.endNumber - config.startNumber + 1;
        const totalBatches = Math.ceil(totalTickets / this.batchSize);
        
        let processedTickets = 0;

        // Crear contenedor temporal para lotes
        const tempContainer = document.createElement('div');
        tempContainer.style.display = 'none';
        document.body.appendChild(tempContainer);

        try {
            for (let batch = 0; batch < totalBatches; batch++) {
                if (this.isCancelled) return;

                const startTicket = config.startNumber + (batch * this.batchSize);
                const endTicket = Math.min(startTicket + this.batchSize - 1, config.endNumber);
                
                // Procesar lote actual
                await this.processBatch(startTicket, endTicket, config, tempContainer);
                
                processedTickets += (endTicket - startTicket + 1);
                const progress = (processedTickets / totalTickets) * 100;
                
                this.updateProgress(progress, `Procesando tickets ${processedTickets} de ${totalTickets}`);
                
                // Monitorear uso de memoria
                if (this.getMemoryUsage() > this.maxMemoryUsage) {
                    await this.cleanupMemory(tempContainer);
                }
                
                // Pausa más larga entre lotes para mantener la UI responsiva
                await this.sleep(batch < totalBatches - 1 ? 50 : 100);
            }

            // Generar PDF final
            await this.generateFinalPDF(tempContainer, config);
            
        } finally {
            // Limpiar contenedor temporal
            if (tempContainer.parentNode) {
                tempContainer.parentNode.removeChild(tempContainer);
            }
        }
    }

    /**
     * Procesa un lote de tickets
     */
    async processBatch(startTicket, endTicket, config, container) {
        const ticketsPerPage = config.ticketsPerPage;
        const ticketsInBatch = endTicket - startTicket + 1;
        const pagesInBatch = Math.ceil(ticketsInBatch / ticketsPerPage);

        for (let page = 0; page < pagesInBatch; page++) {
            if (this.isCancelled) return;

            const pageElement = document.createElement('div');
            pageElement.className = `print-page tickets-${ticketsPerPage}`;
            
            const startInPage = startTicket + (page * ticketsPerPage);
            const endInPage = Math.min(startInPage + ticketsPerPage - 1, endTicket);

            for (let ticketNum = startInPage; ticketNum <= endInPage; ticketNum++) {
                const ticketWrapper = document.createElement('div');
                const ticket = this.createTicketElement(ticketNum, config);
                ticketWrapper.appendChild(ticket);
                pageElement.appendChild(ticketWrapper);
            }

            container.appendChild(pageElement);
            
            // Pequeña pausa para procesamiento
            await this.sleep(5);
        }
    }

    /**
     * Genera el PDF final para lotes grandes
     */
    async generateFinalPDF(container, config) {
        const printArea = document.getElementById('printArea');
        printArea.innerHTML = '';
        
        // Mover contenido procesado al área de impresión
        while (container.firstChild) {
            printArea.appendChild(container.firstChild);
        }

        await this.waitForImages();
        
        if (!this.isCancelled) {
            this.updateProgress(95, 'Preparando impresión...');
            await this.sleep(200);
            
            // Ocultar toast temporalmente antes de imprimir
            this.hideToastForPrint();
            
            // Pequeña pausa para asegurar que los toast se oculten
            await this.sleep(100);
            
            window.print();
            
            // Restaurar toast después de imprimir (opcional)
            setTimeout(() => this.restoreToastAfterPrint(), 500);
        }
    }

    /**
     * Crea un elemento de ticket optimizado
     */
    createTicketElement(ticketNumber, config) {
        // Reutilizar la función existente del script principal
        if (typeof createTicket === 'function') {
            return createTicket(ticketNumber, config);
        }
        
        // Fallback si la función no está disponible
        const template = document.getElementById('ticketTemplate');
        const ticketClone = template.cloneNode(true);
        ticketClone.style.display = 'block';
        ticketClone.id = '';
        
        // Actualizar número de ticket
        const ticketNumElements = ticketClone.querySelectorAll('.ticket-number p, p.ticket-number');
        ticketNumElements.forEach(elem => {
            elem.textContent = '#' + String(ticketNumber).padStart(4, '0');
        });
        
        return ticketClone;
    }

    /**
     * Procesa una página individual (para lotes pequeños)
     */
    async processPage(pageIndex, config) {
        const printArea = document.getElementById('printArea');
        const printPage = document.createElement('div');
        printPage.className = `print-page tickets-${config.ticketsPerPage}`;

        const startTicket = config.startNumber + (pageIndex * config.ticketsPerPage);
        const endTicket = Math.min(startTicket + config.ticketsPerPage - 1, config.endNumber);

        for (let ticketNum = startTicket; ticketNum <= endTicket; ticketNum++) {
            const ticketWrapper = document.createElement('div');
            const ticket = this.createTicketElement(ticketNum, config);
            ticketWrapper.appendChild(ticket);
            printPage.appendChild(ticketWrapper);
        }

        printArea.appendChild(printPage);
    }

    /**
     * Espera a que todas las imágenes se carguen con timeout
     */
    async waitForImages(timeout = null) {
        const appConfig = window.APP_CONFIG || { TIMING: { IMAGE_LOAD_TIMEOUT: 10000 } };
        const imageTimeout = timeout || appConfig.TIMING.IMAGE_LOAD_TIMEOUT;

        const images = document.querySelectorAll('#printArea img');
        const imagePromises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();

            return Promise.race([
                new Promise((resolve) => {
                    const handleLoad = () => {
                        img.removeEventListener('load', handleLoad);
                        img.removeEventListener('error', handleLoad);
                        resolve();
                    };
                    img.addEventListener('load', handleLoad);
                    img.addEventListener('error', handleLoad);
                }),
                new Promise((resolve) =>
                    setTimeout(() => {
                        console.warn('Image load timeout:', img.src);
                        resolve();
                    }, imageTimeout)
                )
            ]);
        });

        try {
            await Promise.all(imagePromises);
        } catch (error) {
            // Si alguna imagen falla, continuamos de todas formas
            console.warn('Error loading images:', error);
        }
    }







    /**
     * Cancela la generación con cleanup completo
     */
    cancel() {
        if (this.isProcessing && !this.isCancelled) {
            this.isCancelled = true;

            // Limpiar DOM
            const printArea = document.getElementById('printArea');
            if (printArea) {
                printArea.innerHTML = '';
            }

            // Actualizar el toast para mostrar que se está cancelando
            if (this.progressToastId) {
                toast.update(this.progressToastId, 'Cancelando generación...', 'Procesando cancelación');

                // Cerrar toast después de un momento
                setManagedTimeout(() => {
                    if (this.progressToastId) {
                        toast.hide(this.progressToastId);
                        this.progressToastId = null;
                    }
                }, 1000);
            }

            // Forzar cleanup
            this.cleanup();
        }
    }

    /**
     * Actualiza el progreso de la generación
     * @param {number} progress - Porcentaje de progreso (0-100)
     * @param {string} message - Mensaje descriptivo del progreso
     */
    updateProgress(progress, message) {
        if (this.progressToastId) {
            toast.update(this.progressToastId, message, `Progreso: ${progress.toFixed(0)}%`);
        }
    }





    /**
     * Limpieza de memoria
     */
    cleanup() {
        // Forzar recolección de basura si está disponible
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Limpieza de memoria para lotes grandes
     */
    async cleanupMemory(container) {
        // Remover páginas antiguas del DOM
        const pages = container.querySelectorAll('.print-page');
        const pagesToRemove = Math.floor(pages.length * 0.3); // Remover 30% más antiguo
        
        for (let i = 0; i < pagesToRemove; i++) {
            if (pages[i] && pages[i].parentNode) {
                pages[i].parentNode.removeChild(pages[i]);
            }
        }
        
        // Pequeña pausa para permitir recolección de basura
        await this.sleep(100);
    }

    /**
     * Obtiene el uso de memoria aproximado
     */
    getMemoryUsage() {
        // performance.memory solo está disponible en Chrome/Edge con flag
        if (performance.memory && typeof performance.memory.usedJSHeapSize === 'number') {
            return performance.memory.usedJSHeapSize;
        }

        // Fallback: estimar uso basado en número de elementos DOM
        // Aproximadamente 1KB por elemento (conservador)
        const domElements = document.querySelectorAll('*').length;
        const estimatedSize = domElements * 1000;

        return estimatedSize;
    }

    /**
     * Oculta los toast temporalmente antes de imprimir
     */
    hideToastForPrint() {
        const toastContainer = document.querySelector('.toast-container');
        if (toastContainer) {
            toastContainer.style.display = 'none';
            toastContainer.style.visibility = 'hidden';
        }
        
        // También ocultar cualquier toast individual
        const toasts = document.querySelectorAll('.toast');
        toasts.forEach(toast => {
            toast.style.display = 'none';
            toast.style.visibility = 'hidden';
        });
    }

    /**
     * Restaura los toast después de imprimir
     */
    restoreToastAfterPrint() {
        const toastContainer = document.querySelector('.toast-container');
        if (toastContainer) {
            toastContainer.style.display = '';
            toastContainer.style.visibility = '';
        }
        
        // Restaurar toasts individuales
        const toasts = document.querySelectorAll('.toast');
        toasts.forEach(toast => {
            toast.style.display = '';
            toast.style.visibility = '';
        });
    }

    /**
     * Función auxiliar para sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Instancia global del generador
window.pdfGenerator = new PDFGenerator();