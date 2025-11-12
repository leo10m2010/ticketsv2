/**
 * Sistema de Notificaciones Toast
 * Sistema moderno de notificaciones para reemplazar alert()
 */

class ToastSystem {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.init();
    }

    init() {
        // Crear contenedor de toast si no existe
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    /**
     * Mostrar un toast
     * @param {string} message - Mensaje principal
     * @param {string} title - Título opcional
     * @param {string} type - Tipo: success, error, warning, info
     * @param {number} duration - Duración en ms (default: 3000)
     * @param {boolean} closable - Si se puede cerrar manualmente
     */
    show(message, title = '', type = 'info', duration = 3000, closable = true) {
        const toastId = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.id = toastId;

        // Icono según el tipo
        const icon = this.getIcon(type);
        
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            ${closable ? '<button class="toast-close">&times;</button>' : ''}
        `;

        // Agregar al contenedor
        this.container.appendChild(toast);
        
        // Guardar referencia
        this.toasts.set(toastId, toast);

        // Eventos
        if (closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => this.hide(toastId));
        }

        // Mostrar con animación
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Auto-cerrar después de la duración
        if (duration > 0) {
            setTimeout(() => {
                this.hide(toastId);
            }, duration);
        }

        return toastId;
    }

    /**
     * Ocultar un toast específico
     * @param {string} toastId - ID del toast
     */
    hide(toastId) {
        const toast = this.toasts.get(toastId);
        if (toast) {
            toast.classList.add('hide');
            
            // Eliminar después de la animación
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
                this.toasts.delete(toastId);
            }, 300);
        }
    }

    /**
     * Ocultar todos los toasts
     */
    hideAll() {
        this.toasts.forEach((toast, toastId) => {
            this.hide(toastId);
        });
    }

    /**
     * Obtener icono según el tipo
     * @param {string} type - Tipo de toast
     * @returns {string} - HTML del icono
     */
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '!',
            info: 'i'
        };
        return icons[type] || icons.info;
    }

    /**
     * Métodos abreviados para tipos comunes
     */
    success(message, title = 'Éxito', duration = 3000) {
        return this.show(message, title, 'success', duration);
    }

    error(message, title = 'Error', duration = 5000) {
        return this.show(message, title, 'error', duration);
    }

    warning(message, title = 'Advertencia', duration = 4000) {
        return this.show(message, title, 'warning', duration);
    }

    info(message, title = 'Información', duration = 3000) {
        return this.show(message, title, 'info', duration);
    }

    /**
     * Mostrar toast de progreso (persistente)
     * @param {string} message - Mensaje
     * @param {string} title - Título
     * @returns {string} - ID del toast para actualización
     */
    progress(message, title = 'Procesando...') {
        return this.show(message, title, 'info', 0, false);
    }

    /**
     * Actualizar un toast existente
     * @param {string} toastId - ID del toast
     * @param {string} message - Nuevo mensaje
     * @param {string} title - Nuevo título (opcional)
     * @param {string} type - Nuevo tipo (opcional)
     */
    update(toastId, message, title = null, type = null) {
        const toast = this.toasts.get(toastId);
        if (toast) {
            const content = toast.querySelector('.toast-content');
            const messageEl = content.querySelector('.toast-message');
            messageEl.textContent = message;
            
            if (title !== null) {
                const titleEl = content.querySelector('.toast-title');
                if (titleEl) {
                    titleEl.textContent = title;
                }
            }
            
            if (type !== null) {
                toast.className = `toast toast-${type} show`;
                const icon = toast.querySelector('.toast-icon');
                icon.textContent = this.getIcon(type);
            }
        }
    }

    /**
     * Cerrar un toast de progreso y mostrar resultado
     * @param {string} toastId - ID del toast de progreso
     * @param {string} message - Mensaje final
     * @param {string} type - Tipo final (success/error)
     * @param {number} duration - Duración antes de cerrar
     */
    complete(toastId, message, type = 'success', duration = 2000) {
        this.update(toastId, message, null, type);
        
        // Agregar botón de cerrar
        const toast = this.toasts.get(toastId);
        if (toast && !toast.querySelector('.toast-close')) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', () => this.hide(toastId));
            toast.appendChild(closeBtn);
        }
        
        // Cerrar después del tiempo especificado
        if (duration > 0) {
            setTimeout(() => {
                this.hide(toastId);
            }, duration);
        }
    }
}

// Crear instancia global
const toast = new ToastSystem();

// Métodos globales para facilitar el uso
window.showToast = (message, title, type, duration, closable) => {
    return toast.show(message, title, type, duration, closable);
};

window.showToastSuccess = (message, title) => {
    return toast.success(message, title);
};

window.showToastError = (message, title) => {
    return toast.error(message, title);
};

window.showToastWarning = (message, title) => {
    return toast.warning(message, title);
};

window.showToastInfo = (message, title) => {
    return toast.info(message, title);
};

window.hideAllToasts = () => {
    toast.hideAll();
};