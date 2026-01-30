import { useContext, useEffect } from "react";
import { NotificationContext } from "../context/NotificationContext";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/Toast.css";

const ConfirmDialog = () => {
    const { confirmDialog, hideConfirm } = useContext(NotificationContext);

    useEffect(() => {
        if (!confirmDialog) return;

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                confirmDialog.onCancel();
            } else if (e.key === "Enter") {
                confirmDialog.onConfirm();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [confirmDialog]);

    return (
        <AnimatePresence>
            {confirmDialog && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="confirm-overlay"
                        onClick={confirmDialog.onCancel}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="confirm-dialog"
                    >
                        <div className="confirm-icon">⚠️</div>
                        <h3 className="confirm-title">Confirm Action</h3>
                        <p className="confirm-message">{confirmDialog.message}</p>
                        <div className="confirm-actions">
                            <button
                                className="confirm-btn confirm-cancel"
                                onClick={confirmDialog.onCancel}
                            >
                                Cancel
                            </button>
                            <button
                                className="confirm-btn confirm-confirm"
                                onClick={confirmDialog.onConfirm}
                            >
                                Confirm
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConfirmDialog;
