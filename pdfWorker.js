/**
 * Web Worker para procesamiento de PDF en background
 * Maneja la generación de tickets sin bloquear el hilo principal
 */

// Variables de control
let isCancelled = false;
let batchSize = 50;

// Escuchar mensajes del hilo principal
self.addEventListener('message', async function(event) {
    const { type, data } = event.data;
    
    switch (type) {
        case 'GENERATE_BATCH':
            await generateBatch(data);
            break;
            
        case 'CANCEL':
            isCancelled = true;
            break;
            
        case 'SET_BATCH_SIZE':
            batchSize = data.batchSize;
            break;
    }
});

/**
 * Genera un lote de tickets en background
 */
async function generateBatch(data) {
    const { startTicket, endTicket, config, batchIndex, totalBatches } = data;
    
    isCancelled = false;
    const tickets = [];
    
    try {
        for (let ticketNum = startTicket; ticketNum <= endTicket; ticketNum++) {
            if (isCancelled) {
                self.postMessage({
                    type: 'BATCH_CANCELLED',
                    data: { batchIndex }
                });
                return;
            }
            
            // Generar HTML del ticket
            const ticketHTML = await generateTicketHTML(ticketNum, config);
            tickets.push({
                number: ticketNum,
                html: ticketHTML
            });
            
            // Pequeña pausa para no sobrecargar
            if (ticketNum % 10 === 0) {
                await sleep(1);
            }
        }
        
        // Enviar resultado al hilo principal
        self.postMessage({
            type: 'BATCH_COMPLETE',
            data: {
                batchIndex,
                tickets,
                progress: ((batchIndex + 1) / totalBatches) * 100
            }
        });
        
    } catch (error) {
        self.postMessage({
            type: 'BATCH_ERROR',
            data: {
                batchIndex,
                error: error.message
            }
        });
    }
}

/**
 * Genera el HTML de un ticket individual
 */
async function generateTicketHTML(ticketNumber, config) {
    // Crear estructura HTML del ticket
    // Esto es una versión simplificada que puede ser personalizada
    
    const ticketHTML = `
        <div class="ticket" data-ticket-number="${ticketNumber}">
            <div class="ticket-number">#${String(ticketNumber).padStart(4, '0')}</div>
            <div class="ticket-info">
                <h1>${config.eventTitle}</h1>
                <h2>${config.eventSubtitle}</h2>
                <p class="date">${config.dayOfWeek} ${config.dateText} ${config.year}</p>
                <p class="location">${config.location1}</p>
                <p class="voucher">VALE POR ${config.voucherQuantity} ${config.voucherType}</p>
            </div>
        </div>
    `;
    
    return ticketHTML;
}

/**
 * Función auxiliar para pausas
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Notificar que el worker está listo
self.postMessage({
    type: 'WORKER_READY'
});