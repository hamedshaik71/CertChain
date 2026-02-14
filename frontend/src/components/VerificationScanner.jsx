import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './VerificationScanner.css';

const VerificationScanner = ({ onVerify, certificateHash }) => {
    const [stage, setStage] = useState('idle'); // idle, scanning, verifying, success, failed
    const [scanProgress, setScanProgress] = useState(0);
    const [result, setResult] = useState(null);
    const scanLineRef = useRef(null);

    const startVerification = async () => {
        setStage('scanning');
        setScanProgress(0);

        // Animate scan progress
        const scanInterval = setInterval(() => {
            setScanProgress(prev => {
                if (prev >= 100) {
                    clearInterval(scanInterval);
                    return 100;
                }
                return prev + 2;
            });
        }, 30);

        // Wait for scan animation
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setStage('verifying');

        try {
            // Call verification API
            const response = await fetch(`/api/public/verify/${certificateHash}`);
            const data = await response.json();

            await new Promise(resolve => setTimeout(resolve, 1000));

            if (data.success) {
                setStage('success');
                setResult(data.certificate);
            } else {
                setStage('failed');
                setResult({ error: data.error });
            }
        } catch (error) {
            setStage('failed');
            setResult({ error: error.message });
        }
    };

    const reset = () => {
        setStage('idle');
        setScanProgress(0);
        setResult(null);
    };

    return (
        <div className="verification-scanner">
            <AnimatePresence mode="wait">
                {stage === 'idle' && (
                    <motion.div
                        key="idle"
                        className="scanner-idle"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        <div className="qr-frame">
                            <div className="qr-corner top-left"></div>
                            <div className="qr-corner top-right"></div>
                            <div className="qr-corner bottom-left"></div>
                            <div className="qr-corner bottom-right"></div>
                            <span className="qr-icon">📱</span>
                        </div>
                        <button className="btn-scan" onClick={startVerification}>
                            <span className="scan-icon">🔍</span>
                            Verify Certificate
                        </button>
                    </motion.div>
                )}

                {stage === 'scanning' && (
                    <motion.div
                        key="scanning"
                        className="scanner-active"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="scan-box">
                            <div className="qr-corner top-left active"></div>
                            <div className="qr-corner top-right active"></div>
                            <div className="qr-corner bottom-left active"></div>
                            <div className="qr-corner bottom-right active"></div>
                            
                            <motion.div 
                                className="scan-line"
                                animate={{ 
                                    top: ['0%', '100%', '0%'],
                                }}
                                transition={{ 
                                    duration: 1.5, 
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            />
                            
                            <div className="scan-grid">
                                {[...Array(16)].map((_, i) => (
                                    <motion.div 
                                        key={i} 
                                        className="grid-cell"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0, 1, 0] }}
                                        transition={{ 
                                            delay: i * 0.05, 
                                            duration: 0.5,
                                            repeat: Infinity
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                        
                        <div className="scan-progress">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${scanProgress}%` }}
                            />
                        </div>
                        <p className="scan-text">Scanning certificate...</p>
                    </motion.div>
                )}

                {stage === 'verifying' && (
                    <motion.div
                        key="verifying"
                        className="scanner-verifying"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    >
                        <div className="blockchain-animation">
                            <motion.div 
                                className="chain-block"
                                animate={{ 
                                    rotateY: [0, 360],
                                    boxShadow: [
                                        '0 0 20px rgba(102, 126, 234, 0.3)',
                                        '0 0 40px rgba(102, 126, 234, 0.8)',
                                        '0 0 20px rgba(102, 126, 234, 0.3)'
                                    ]
                                }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                ⛓️
                            </motion.div>
                            <motion.div 
                                className="chain-links"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 0.5, repeat: Infinity }}
                            >
                                <span>━━━</span>
                                <span>━━━</span>
                                <span>━━━</span>
                            </motion.div>
                        </div>
                        <p className="verify-text">Verifying on Blockchain...</p>
                    </motion.div>
                )}

                {stage === 'success' && (
                    <motion.div
                        key="success"
                        className="scanner-success"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", duration: 0.6 }}
                    >
                        <motion.div 
                            className="success-badge"
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.2, 1] }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            <motion.div
                                className="checkmark-circle"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                            >
                                <svg viewBox="0 0 100 100">
                                    <motion.circle
                                        cx="50"
                                        cy="50"
                                        r="45"
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="6"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.5 }}
                                    />
                                    <motion.path
                                        d="M30 50 L45 65 L70 35"
                                        fill="none"
                                        stroke="#10b981"
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ delay: 0.5, duration: 0.3 }}
                                    />
                                </svg>
                            </motion.div>
                        </motion.div>
                        
                        <motion.h2 
                            className="success-title"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            ✓ Verified on Blockchain
                        </motion.h2>
                        
                        <motion.div 
                            className="success-details"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            {result && (
                                <>
                                    <div className="detail-row">
                                        <span>Student</span>
                                        <strong>{result.studentName}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>Course</span>
                                        <strong>{result.courseName}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>Institution</span>
                                        <strong>{result.institutionName}</strong>
                                    </div>
                                    <div className="detail-row">
                                        <span>Grade</span>
                                        <strong className="grade">{result.grade}</strong>
                                    </div>
                                </>
                            )}
                        </motion.div>

                        <motion.div 
                            className="blockchain-proof"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                        >
                            <span className="proof-icon">⛓️</span>
                            <span className="proof-text">Immutably recorded on blockchain</span>
                        </motion.div>

                        <button className="btn-reset" onClick={reset}>
                            Verify Another
                        </button>
                    </motion.div>
                )}

                {stage === 'failed' && (
                    <motion.div
                        key="failed"
                        className="scanner-failed"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <motion.div 
                            className="failed-icon"
                            animate={{ 
                                rotate: [0, -10, 10, -10, 0],
                            }}
                            transition={{ duration: 0.5 }}
                        >
                            ❌
                        </motion.div>
                        <h2>Verification Failed</h2>
                        <p>{result?.error || 'Certificate not found'}</p>
                        <button className="btn-reset" onClick={reset}>
                            Try Again
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default VerificationScanner;