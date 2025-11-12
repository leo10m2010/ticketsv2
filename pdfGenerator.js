/**
 * Generador de PDF Optimizado para Grandes Volúmenes
 * Implementa procesamiento asíncrono, control de memoria y progreso visible
 */

class PDFGenerator {
    constructor() {
        this.batchSize = 50; // Tamaño del lote para procesamiento
        this.maxMemoryUsage = 400 * 1024 * 1024; // 400MB límite de memoria
        this.isCancelled = false;
        this.isProcessing = false;
        this.progressCallback = null;
        this.cancelCallback = null;
    }

    /**
     * Genera PDF optimizado con soporte para grandes volúmenes
     * @param {Object} config - Configuración de los tickets
     * @param {Function} progressCallback - Callback para actualizar progreso
     * @param {Function} cancelCallback - Callback para manejar cancelación
     * @returns {Promise<void>}
     */
    async generatePDF(config, progressCallback = null, cancelCallback = null) {
        this.progressCallback = progressCallback;
        this.cancelCallback = cancelCallback;
        this.isCancelled = false;
        this.isProcessing = true;

        const startTime = performance.now();
        const totalTickets = config.endNumber - config.startNumber + 1;

        try {
            // Validar límites
            if (totalTickets > 2000) {
                throw new Error('Máximo 2000 tickets permitidos para mantener el rendimiento');
            }

            // Mostrar diálogo de progreso
            this.showProgressDialog();

            // Usar estrategia según el volumen
            if (totalTickets <= 100) {
                await this.generateSmallBatch(config);
            } else {
                await this.generateLargeBatch(config);
            }

            const endTime = performance.now();
            const duration = (endTime - startTime) / 1000;

            this.hideProgressDialog();
            this.showSuccessMessage(totalTickets, duration);

        } catch (error) {
            this.hideProgressDialog();
            if (this.isCancelled) {
                this.showCancelledMessage();
            } else {
                throw error;
            }
        } finally {
            this.isProcessing = false;
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
            this.updateProgress(progress, `Generando página ${page + 1} de ${totalPages}`);
            
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
            window.print();
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
     * Espera a que todas las imágenes se carguen
     */
    async waitForImages() {
        const images = document.querySelectorAll('#printArea img');
        const imagePromises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
                img.addEventListener('load', resolve);
                img.addEventListener('error', reject);
            });
        });

        await Promise.all(imagePromises);
    }

    /**
     * Muestra el diálogo de progreso
     */
    showProgressDialog() {
        const dialogHTML = `
            <div id="pdfProgressDialog" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 15px;
                    text-align: center;
                    min-width: 300px;
                    max-width: 500px;
                ">
                    <h3 style="margin-bottom: 20px; color: #2c3e50;">
                        <i class="fas fa-file-pdf"></i> Generando PDF
                    </h3>
                    <div style="
                        width: 100%;
                        height: 20px;
                        background: #ecf0f1;
                        border-radius: 10px;
                        overflow: hidden;
                        margin-bottom: 15px;
                    ">
                        <div id="pdfProgressBar" style="
                            height: 100%;
                            background: linear-gradient(135deg, #27ae60, #2ecc71);
                            width: 0%;
                            transition: width 0.3s ease;
                        "></div>
                    </div>
                    <p id="pdfProgressText" style="margin-bottom: 20px; color: #7f8c8d;">
                        Iniciando generación...
                    </p>
                    <button id="pdfCancelBtn" style="
                        background: #e74c3c;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                    ">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        
        // Configurar botón de cancelar
        document.getElementById('pdfCancelBtn').addEventListener('click', () => {
            this.cancel();
        });
    }

    /**
     * Actualiza el progreso
     */
    updateProgress(percentage, message) {
        const progressBar = document.getElementById('pdfProgressBar');
        const progressText = document.getElementById('pdfProgressText');
        
        if (progressBar && progressText) {
            progressBar.style.width = percentage + '%';
            progressText.textContent = message;
        }

        if (this.progressCallback) {
            this.progressCallback(percentage, message);
        }
    }

    /**
     * Oculta el diálogo de progreso
     */
    hideProgressDialog() {
        const dialog = document.getElementById('pdfProgressDialog');
        if (dialog) {
            dialog.remove();
        }
    }

    /**
     * Cancela la generación
     */
    cancel() {
        this.isCancelled = true;
        if (this.cancelCallback) {
            this.cancelCallback();
        }
    }

    /**
     * Muestra mensaje de éxito
     */
    showSuccessMessage(totalTickets, duration) {
        const message = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #27ae60;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10001;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            ">
                <i class="fas fa-check-circle"></i>
                ¡PDF generado exitosamente!
                <br><small>${totalTickets} tickets en ${duration.toFixed(1)} segundos</small>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', message);
        
        setTimeout(() => {
            const successDiv = document.querySelector('div[style*="#27ae60"]');
            if (successDiv) successDiv.remove();
        }, 5000);
    }

    /**
     * Muestra mensaje de cancelación
     */
    showCancelledMessage() {
        const message = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f39c12;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10001;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            ">
                <i class="fas fa-info-circle"></i>
                Generación cancelada por el usuario
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', message);
        
        setTimeout(() => {
            const cancelledDiv = document.querySelector('div[style*="#f39c12"]');
            if (cancelledDiv) cancelledDiv.remove();
        }, 3000);
    }

    /**
     * Limpieza de memoria
     */
    cleanup() {
        // Limpiar referencias
        this.progressCallback = null;
        this.cancelCallback = null;
        
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
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0; // Fallback si no está disponible
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