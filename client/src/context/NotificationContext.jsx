import { createContext, useState, useCallback } from "react";

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const showToast = useCallback((message, type = "info") => {
        const id = Date.now();
        const newToast = { id, message, type };

        setToasts(prev => [...prev, newToast]);

        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showConfirm = useCallback((message, onConfirm, onCancel) => {
        setConfirmDialog({
            message,
            onConfirm: () => {
                onConfirm?.();
                setConfirmDialog(null);
            },
            onCancel: () => {
                onCancel?.();
                setConfirmDialog(null);
            }
        });
    }, []);

    const hideConfirm = useCallback(() => {
        setConfirmDialog(null);
    }, []);

    return (
        <NotificationContext.Provider value={{ showToast, removeToast, showConfirm, hideConfirm, toasts, confirmDialog }}>
            {children}
        </NotificationContext.Provider>
    );
};
