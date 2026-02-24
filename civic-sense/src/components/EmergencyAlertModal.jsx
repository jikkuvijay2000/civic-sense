import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaExclamationTriangle, FaTimes } from 'react-icons/fa';

const EmergencyAlertModal = ({ isOpen, onClose, alertData }) => {
    if (!isOpen || !alertData) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 9999, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)' }}>
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-4 overflow-hidden position-relative"
                        style={{ maxWidth: '500px', width: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)', borderLeft: '6px solid #ef4444' }}
                    >

                        <div className="px-4 pt-4 pb-0 d-flex align-items-center justify-content-between">
                            <span className="badge bg-danger-subtle text-danger rounded-pill px-3 py-2 d-flex align-items-center gap-2 border border-danger-subtle fw-bold" style={{ letterSpacing: '0.5px' }}>
                                <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                    <FaExclamationTriangle />
                                </motion.div>
                                EMERGENCY ALERT
                            </span>
                            <button onClick={onClose} className="btn btn-sm btn-light rounded-circle p-2 d-flex align-items-center justify-content-center text-secondary hover-scale transition-fast" style={{ width: '32px', height: '32px' }}>
                                <FaTimes />
                            </button>
                        </div>

                        <div className="p-4 px-md-5 text-center">
                            {alertData.image && (
                                <div className="mb-4 mx-auto border rounded-4 p-1 shadow-sm" style={{ maxWidth: '350px', backgroundColor: '#f8fafc' }}>
                                    <img src={alertData.image} alt="Alert" className="img-fluid rounded-3 w-100" style={{ height: '200px', objectFit: 'cover' }} />
                                </div>
                            )}

                            <h4 className="fw-bolder text-dark mb-4">{alertData.title}</h4>

                            <div className="bg-light p-3 rounded-4 mb-4 text-start border shadow-sm">
                                <p className="mb-0 text-secondary" style={{ whiteSpace: 'pre-line', lineHeight: '1.6', fontSize: '0.95rem' }}>{alertData.content}</p>
                            </div>

                            <button
                                onClick={onClose}
                                className="btn btn-danger w-100 py-3 rounded-pill fw-bold hover-scale shadow-sm"
                            >
                                Acknowledge Alert
                            </button>
                        </div>

                        <div className="bg-light p-3 text-center border-top">
                            <small className="text-secondary fw-semibold text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '11px' }}>
                                ISSUED BY {alertData.author?.toUpperCase() || alertData.role?.toUpperCase() || "AUTHORITY"} • {new Date(alertData.createdAt).toLocaleTimeString()}
                            </small>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default EmergencyAlertModal;
