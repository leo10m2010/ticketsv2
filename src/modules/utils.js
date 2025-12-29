/**
 * Utils Module - Utilidades generales
 * Generador de Tickets v2
 */
(function (global) {
    'use strict';

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
        if (timeoutId) {
            clearTimeout(timeoutId);
            activeTimeouts.delete(timeoutId);
        }
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
            console.warn(`Elemento con ID '${id}' no encontrado`);
        }
        return element;
    }

    /**
     * Función debounce para evitar demasiadas actualizaciones
     * @param {Function} func - Función a ejecutar
     * @param {number} wait - Tiempo de espera en ms
     * @returns {Function} - Función con debounce
     */
    function debounce(func, wait) {
        let timeout;
        const executedFunction = function (...args) {
            const later = () => {
                timeout = null;
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };

        // Agregar método para cancelar manualmente
        executedFunction.cancel = function () {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
        };

        return executedFunction;
    }

    /**
     * Formatea número con ceros a la izquierda
     * @param {number} num - Número a formatear
     * @returns {string} - Número formateado
     */
    function formatTicketNumber(num) {
        return String(num).padStart(4, '0');
    }

    // Limpiar timeouts al salir
    window.addEventListener('beforeunload', clearAllTimeouts);

    // Exportar al namespace global
    global.TicketUtils = {
        setManagedTimeout,
        clearManagedTimeout,
        clearAllTimeouts,
        getElement,
        debounce,
        formatTicketNumber
    };

    // También exponer individualmente para compatibilidad
    global.setManagedTimeout = setManagedTimeout;
    global.clearManagedTimeout = clearManagedTimeout;
    global.clearAllTimeouts = clearAllTimeouts;
    global.getElement = getElement;
    global.debounce = debounce;
    global.formatTicketNumber = formatTicketNumber;

})(window);
