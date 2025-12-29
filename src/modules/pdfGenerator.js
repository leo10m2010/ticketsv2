/**
 * Generador de PDF Optimizado para Grandes Volúmenes
 * Implementa procesamiento asíncrono, control de memoria y progreso visible
 */

class PDFGenerator {
    constructor() {
        // Usar configuración global
        const config = window.APP_CONFIG || { PDF: { BATCH_SIZE: 50, MAX_MEMORY_MB: 400 } };
        this.isCancelled = false;
        this.isProcessing = false;
        this.progressToastId = null;
    }

    /**
     * Genera PDF optimizado con soporte para grandes volúmenes
     * @param {Object} config - Configuración de los tickets
     * @param {string} mode - 'print' o 'download'
     * @returns {Promise<void>}
     */
    async generatePDF(config, mode = 'download') {
        if (this.isProcessing) {
            toast.warning('Ya hay una generación en proceso', 'Espere por favor');
            return;
        }

        this.isCancelled = false;
        this.isProcessing = true;

        const startTime = performance.now();
        const totalTickets = config.endNumber - config.startNumber + 1;

        try {
            // Validar bibliotecas
            const jsPDF = window.jspdf?.jsPDF;
            if (!jsPDF || typeof html2canvas === 'undefined') {
                throw new Error('Bibliotecas PDF no cargadas. Recarga la página.');
            }

            // Mostrar toast de progreso
            this.progressToastId = toast.progress(
                mode === 'print' ? 'Preparando impresión...' : 'Iniciando descarga (Alta Calidad)...',
                'Iniciando'
            );

            // Pre-abrir ventana para impresión (evitar bloqueo de popups)
            let printWindow = null;
            if (mode === 'print') {
                printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(`
                        <html>
                            <head><title>Generando Vista Previa...</title></head>
                            <body style="font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5;">
                                <div style="text-align: center;">
                                    <div style="font-size: 24px; margin-bottom: 20px;">Generando Vista Previa...</div>
                                    <div style="color: #666;">Por favor espere mientras se preparan sus tickets.</div>
                                    <div style="font-size: 14px; color: #888;">Esto puede tomar unos segundos...</div>
                                </div>
                            </body>
                        </html>
                    `);
                } else {
                    toast.warning('Por favor permite las ventanas emergentes para ver la vista previa.', 'Pop-up bloqueado');
                }
            }

            // 1. Pre-procesar imágenes (convertir a Base64)
            toast.update(this.progressToastId, 'Optimizando imágenes...', 'Progreso: 5%');
            const optimizedConfig = await this.optimizeImages(config);

            // --- OPTIMIZACIÓN MASIVA ---
            const maxTicketsPerFile = window.APP_CONFIG?.PDF?.MAX_TICKETS_PER_PDF || 200;
            const shouldSplit = config.splitPdf && totalTickets > maxTicketsPerFile && mode === 'download';

            // Escalado adaptativo: 100+ tickets -> scale 2 (ahorra mucha RAM), else scale 3
            const adaptiveScale = totalTickets > 100 ? 2 : 3;
            // Calidad JPEG adaptativa: 100+ tickets -> 0.8, else 0.95
            const jpegQuality = totalTickets > 100 ? 0.8 : 0.95;
            // ---------------------------

            // 3. Crear contenedor temporal invisible
            const tempContainer = document.createElement('div');
            tempContainer.id = 'pdf-temp-container';
            tempContainer.style.cssText = `
                position: fixed;
                left: -10000px;
                top: 0;
                width: 210mm;
                height: 297mm;
                background: white;
                z-index: -1;
                pointer-events: none;
            `;
            document.body.appendChild(tempContainer);

            try {
                let currentTicket = optimizedConfig.startNumber;
                let ticketsProcessedInCurrentFile = 0;
                let fileIndex = 1;
                let pdf = new jsPDF('p', 'mm', 'a4');
                const ticketsPerPage = optimizedConfig.ticketsPerPage;
                const totalPages = Math.ceil(totalTickets / ticketsPerPage);
                const pdfWidth = 210;
                const pdfHeight = 297;

                // 4. Generar página por página
                for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                    if (this.isCancelled) throw new Error('Proceso cancelado por el usuario');

                    // Verificar si necesitamos empezar un nuevo archivo (segmentación)
                    if (shouldSplit && ticketsProcessedInCurrentFile >= maxTicketsPerFile) {
                        const rangeStart = currentTicket - ticketsProcessedInCurrentFile;
                        const rangeEnd = currentTicket - 1;
                        pdf.save(`tickets_${rangeStart}-${rangeEnd}_parte${fileIndex}.pdf`);

                        // Reiniciar para nuevo archivo
                        pdf = new jsPDF('p', 'mm', 'a4');
                        ticketsProcessedInCurrentFile = 0;
                        fileIndex++;

                        toast.info(`Iniciando descarga de parte ${fileIndex}...`, 'Segmentación activa');
                        await this.sleep(500); // Pausa para que el navegador procese la descarga anterior
                    }

                    // Limpiar contenedor
                    tempContainer.innerHTML = '';

                    // Crear estructura de página
                    const pageElement = this.createPageStructure(ticketsPerPage);

                    // Llenar con tickets
                    const ticketsInThisPage = Math.min(ticketsPerPage, optimizedConfig.endNumber - currentTicket + 1);

                    for (let i = 0; i < ticketsInThisPage; i++) {
                        const ticketWrapper = this.createTicketWrapper(ticketsPerPage);
                        const ticket = createTicket(currentTicket, optimizedConfig);

                        // Escalar ticket para ajustar según cantidad por página y modo
                        const isCompact = optimizedConfig.ticketMode === 'compact';
                        let scaleValue = '0.56';

                        if (isCompact) {
                            // Escalas para ticket compacto (más pequeño, escalas más grandes)
                            if (ticketsPerPage === 1) scaleValue = '1.0';
                            else if (ticketsPerPage === 2) scaleValue = '1.0';
                            else if (ticketsPerPage === 4) scaleValue = '1.0';
                            else if (ticketsPerPage === 6) scaleValue = '0.85';
                            else scaleValue = '0.72'; // 8 tickets
                        } else {
                            // Escalas para ticket completo
                            if (ticketsPerPage === 1) scaleValue = '1.0';
                            else if (ticketsPerPage === 2) scaleValue = '1.0';
                            else if (ticketsPerPage === 4) scaleValue = '0.85';
                            else if (ticketsPerPage === 6) scaleValue = '0.68';
                        }
                        const ticketScaled = document.createElement('div');
                        ticketScaled.style.cssText = `
                            transform: scale(${scaleValue});
                            transform-origin: center center;
                            width: 100%;
                            display: flex;
                            justify-content: center;
                        `;

                        if (ticket) {
                            ticket.style.boxShadow = 'none';
                            ticket.style.border = '1px solid #e0e0e0';

                            // Corregir marcas de agua
                            const watermarks = ticket.querySelectorAll('.admit-one');
                            watermarks.forEach(el => {
                                if (el.parentElement) el.parentElement.style.position = 'relative';
                                el.style.cssText += 'writing-mode: horizontal-tb; transform: rotate(90deg); transform-origin: center center; width: 250px; height: 30px; position: absolute; left: -110px; top: 110px; display: flex; justify-content: space-around; align-items: center; letter-spacing: 0.1em; font-weight: bold; white-space: nowrap;';
                            });

                            ticketScaled.appendChild(ticket);
                            ticketWrapper.appendChild(ticketScaled);
                            pageElement.appendChild(ticketWrapper);
                        }
                        currentTicket++;
                        ticketsProcessedInCurrentFile++;
                    }

                    tempContainer.appendChild(pageElement);

                    // Actualizar progreso
                    const progress = 10 + ((pageIndex + 1) / totalPages) * 80;
                    toast.update(
                        this.progressToastId,
                        `Procesando página ${pageIndex + 1} de ${totalPages}...`,
                        `Progreso: ${progress.toFixed(0)}%`
                    );

                    // Esperar carga de imágenes
                    await this.waitForImages(tempContainer);

                    // Renderizar a Canvas con escalado adaptativo
                    const canvas = await html2canvas(pageElement, {
                        scale: adaptiveScale,
                        useCORS: true,
                        logging: false,
                        backgroundColor: '#ffffff',
                        width: 794, // A4 pixels at 96 DPI
                        height: 1123
                    });

                    // Agregar a PDF (solo si no es la primera página del archivo actual)
                    const isFirstPageOfFile = (ticketsProcessedInCurrentFile <= ticketsPerPage);
                    if (!isFirstPageOfFile) {
                        pdf.addPage();
                    }

                    const imgData = canvas.toDataURL('image/jpeg', jpegQuality);
                    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

                    // Limpiar memoria CRÍTICO
                    this.cleanupCanvas(canvas);

                    // Pequeña pausa para no bloquear UI
                    await this.sleep(totalTickets > 100 ? 30 : 10);
                }

                // 5. Finalizar (guardar el último o único archivo)
                toast.update(this.progressToastId, 'Finalizando documento...', 'Progreso: 95%');

                if (mode === 'print') {
                    const pdfBlob = pdf.output('bloburl');
                    if (printWindow) {
                        printWindow.location.href = pdfBlob;
                        setTimeout(() => URL.revokeObjectURL(pdfBlob), 60000);
                    } else {
                        window.open(pdfBlob, '_blank');
                    }
                } else {
                    const rangeStart = currentTicket - ticketsProcessedInCurrentFile;
                    const rangeEnd = currentTicket - 1;
                    const suffix = shouldSplit ? `_parte${fileIndex}` : '';
                    pdf.save(`tickets_${rangeStart}-${rangeEnd}${suffix}.pdf`);
                }

                const duration = ((performance.now() - startTime) / 1000).toFixed(1);
                toast.complete(
                    this.progressToastId,
                    `✓ Completado en ${duration}s (${totalTickets} tickets)`,
                    'success',
                    5000
                );

            } finally {
                if (tempContainer.parentNode) {
                    tempContainer.parentNode.removeChild(tempContainer);
                }
                // Liberar memoria de imágenes optimizadas si son muchas
                if (totalTickets > 50) {
                    optimizedConfig.imageUrl = null;
                    optimizedConfig.qrUrl = null;
                }
            }

        } catch (error) {
            console.error('Error en generación:', error);
            if (this.progressToastId) {
                toast.error(
                    `Error: ${error.message}`,
                    'Falló la generación ❌'
                );
            }
            // Cerrar ventana de impresión si hubo error
            if (mode === 'print' && typeof printWindow !== 'undefined' && printWindow) {
                printWindow.close();
            }
        } finally {
            this.isProcessing = false;
            this.progressToastId = null;
        }
    }

    /**
     * Convierte imágenes a Base64 para evitar problemas de CORS y rendimiento
     */
    async optimizeImages(config) {
        const newConfig = { ...config };

        // Helper para convertir URL a Base64
        const toBase64 = async (url) => {
            if (!url || url.startsWith('data:')) return url;
            try {
                // Usar la función existente en script.js si es posible, o implementar simple
                if (window.imageUrlToBase64) return await window.imageUrlToBase64(url);
                return url;
            } catch (e) {
                console.warn('No se pudo optimizar imagen:', url);
                return url;
            }
        };

        if (newConfig.imageUrl) newConfig.imageUrl = await toBase64(newConfig.imageUrl);
        if (newConfig.qrUrl) newConfig.qrUrl = await toBase64(newConfig.qrUrl);

        return newConfig;
    }

    createPageStructure(ticketsPerPage) {
        const div = document.createElement('div');
        let gap = '0.5mm';
        let padding = '2mm 3mm';
        if (ticketsPerPage === 1) { gap = '0'; padding = '5mm'; }
        else if (ticketsPerPage === 2) { gap = '5mm'; padding = '5mm'; }
        else if (ticketsPerPage === 4) { gap = '2mm'; padding = '3mm'; }
        else if (ticketsPerPage === 6) { gap = '1mm'; }

        div.style.cssText = `
            width: 210mm;
            height: 297mm;
            background: white;
            display: flex;
            flex-direction: column;
            justify-content: ${ticketsPerPage <= 2 ? 'center' : 'flex-start'};
            align-items: center;
            padding: ${padding};
            gap: ${gap};
            box-sizing: border-box;
        `;
        return div;
    }

    createTicketWrapper(ticketsPerPage) {
        const div = document.createElement('div');
        let height = 'calc((297mm - 4mm - 3.5mm) / 8)'; // default 8

        if (ticketsPerPage === 1) {
            height = 'auto';
        } else if (ticketsPerPage === 2) {
            height = 'calc((297mm - 10mm - 5mm) / 2)';
        } else if (ticketsPerPage === 4) {
            height = 'calc((297mm - 6mm - 6mm) / 4)';
        } else if (ticketsPerPage === 6) {
            height = 'calc((297mm - 4mm - 5mm) / 6)';
        }

        div.style.cssText = `
            height: ${height};
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-shrink: 0;
        `;
        return div;
    }

    async waitForImages(container) {
        const promises = [];

        // 1. Esperar imágenes <img>
        const images = Array.from(container.querySelectorAll('img'));
        images.forEach(img => {
            if (img.complete) return;
            promises.push(new Promise(resolve => {
                const timeout = window.APP_CONFIG?.TIMING?.IMAGE_LOAD_TIMEOUT || 5000;
                img.onload = img.onerror = resolve;
                setTimeout(resolve, timeout); // Timeout seguridad
            }));
        });

        // 2. Esperar imagen de fondo (crítico para el diseño)
        const bgDivs = Array.from(container.querySelectorAll('.image'));
        bgDivs.forEach(div => {
            const bgImage = div.style.backgroundImage;
            if (bgImage && bgImage !== 'none') {
                const url = bgImage.slice(5, -2); // Extraer URL de url("...")
                if (url) {
                    promises.push(new Promise(resolve => {
                        const timeout = window.APP_CONFIG?.TIMING?.IMAGE_LOAD_TIMEOUT || 5000;
                        const img = new Image();
                        img.onload = img.onerror = resolve;
                        img.src = url;
                        setTimeout(resolve, timeout);
                    }));
                }
            }
        });

        if (promises.length > 0) {
            await Promise.all(promises);
        }
    }

    cleanupCanvas(canvas) {
        try {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 0;
            canvas.height = 0;
        } catch (e) { /* ignore */ }
    }

    cancel() {
        this.isCancelled = true;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Instancia global
window.pdfGenerator = new PDFGenerator();