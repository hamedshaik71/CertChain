import React from 'react';
import { motion } from 'framer-motion';
import './RevokedCertificate.css';

const RevokedCertificate = ({ certificate, revocationDetails }) => {
    return (
        <motion.div 
            className="revoked-certificate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Revoked Overlay */}
            <motion.div 
                className="revoked-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <motion.div 
                    className="revoked-stamp"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: -15 }}
                    transition={{ 
                        type: "spring", 
                        stiffness: 200, 
                        damping: 10,
                        delay: 0.3 
                    }}
                >
                    <span className="stamp-text">REVOKED</span>
                    <span className="stamp-date">
                        {new Date(revocationDetails?.revokedAt).toLocaleDateString()}
                    </span>
                </motion.div>

                {/* Warning animation */}
                <motion.div 
                    className="warning-pulse"
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ 
                        repeat: Infinity, 
                        duration: 2 
                    }}
                />
            </motion.div>

            {/* Certificate Content (greyed out) */}
            <div className="certificate-content greyed">
                <div className="cert-header">
                    <span className="cert-icon">📜</span>
                    <h3>{certificate.courseName}</h3>
                </div>

                <div className="cert-details">
                    <div className="detail-row">
                        <span>Student</span>
                        <strong>{certificate.studentName}</strong>
                    </div>
                    <div className="detail-row">
                        <span>Institution</span>
                        <strong>{certificate.institutionName}</strong>
                    </div>
                    <div className="detail-row">
                        <span>Issue Date</span>
                        <strong>{new Date(certificate.issueDate).toLocaleDateString()}</strong>
                    </div>
                    <div className="detail-row strikethrough">
                        <span>Grade</span>
                        <strong>{certificate.grade}</strong>
                    </div>
                </div>

                <div className="cert-hash">
                    <code>{certificate.certificateHash?.slice(0, 20)}...</code>
                </div>
            </div>

            {/* Revocation Details */}
            <motion.div 
                className="revocation-info"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <div className="revocation-header">
                    <span className="warning-icon">⚠️</span>
                    <h4>Certificate Revoked</h4>
                </div>

                <div className="revocation-details">
                    <div className="detail">
                        <span className="label">Reason</span>
                        <span className="value error">{revocationDetails?.reason}</span>
                    </div>
                    <div className="detail">
                        <span className="label">Revoked By</span>
                        <span className="value">{revocationDetails?.revokedBy}</span>
                    </div>
                    <div className="detail">
                        <span className="label">Revocation Date</span>
                        <span className="value">
                            {new Date(revocationDetails?.revokedAt).toLocaleString()}
                        </span>
                    </div>
                    {revocationDetails?.transactionHash && (
                        <div className="detail">
                            <span className="label">Blockchain TX</span>
                            <code className="value">{revocationDetails.transactionHash.slice(0, 20)}...</code>
                        </div>
                    )}
                </div>

                <div className="revocation-actions">
                    <button className="btn-appeal">
                        📝 File Appeal
                    </button>
                    <button className="btn-contact">
                        📧 Contact Institution
                    </button>
                </div>
            </motion.div>

            {/* Animated X marks */}
            <motion.div 
                className="x-marks"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
            >
                {[...Array(3)].map((_, i) => (
                    <motion.span
                        key={i}
                        className="x-mark"
                        initial={{ scale: 0, rotate: 0 }}
                        animate={{ scale: 1, rotate: 15 }}
                        transition={{ delay: 0.8 + i * 0.1 }}
                    >
                        ✕
                    </motion.span>
                ))}
            </motion.div>
        </motion.div>
    );
};

export default RevokedCertificate;