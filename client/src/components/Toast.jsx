import { useContext, useEffect, useState } from "react";
import { NotificationContext } from "../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/Toast.css";

const Toast = () => {
    const { toasts, removeToast } = useContext(NotificationContext);

    return (
        <div className="toast-container">
            <AnimatePresence>
                {toasts.map((toast, index) => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onRemove={removeToast}
                        index={index}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};

const ToastItem = ({ toast, onRemove, index }) => {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev <= 0) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - (100 / 40); // 4000ms / 100ms intervals
            });
        }, 100);

        return () => clearInterval(interval);
    }, []);

    const getIcon = () => {
        switch (toast.type) {
            case "success": return "✓";
            case "error": return "✕";
            case "warning": return "⚠";
            default: return "ℹ";
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`toast toast-${toast.type}`}
            style={{ top: `${index * 80}px` }}
        >
            <div className="toast-content">
                <div className="toast-icon">{getIcon()}</div>
                <div className="toast-message">{toast.message}</div>
                <button
                    className="toast-close"
                    onClick={() => onRemove(toast.id)}
                    aria-label="Close notification"
                >
                    ✕
                </button>
            </div>
            <div className="toast-progress">
                <motion.div
                    className="toast-progress-bar"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 4, ease: "linear" }}
                />
            </div>
        </motion.div>
    );
};

export default Toast;
