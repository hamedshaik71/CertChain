import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './FraudAlertOverlay.css';

const FraudAlertOverlay = ({ certificate, fraudData, onDismiss, onInvestigate }) => {
    const [expanded, setExpanded] = useState(false);
    const [pulseCount, setPulseCount] = useState(0);

    useEffect(() => {
        // Pulse effect counter
        const interval = setInterval(() => {
            setPulseCount(prev => prev + 1);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'CRITICAL': return '#ef4444';
            case 'HIGH': return '#f97316';
            case 'MEDIUM': return '#f59e0b';
            case 'LOW': return '#3b82f6';
            default: return '#6b7280';
        }
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'CRITICAL': return '🚨';
            case 'HIGH': return '⚠️';
            case 'MEDIUM': return '🔶';
            case 'LOW': return '🔵';
            default: return '❓';
        }
    };

    const getFraudTypeIcon = (type) => {
        switch (type) {
            case 'DUPLICATE_CERTIFICATE': return '📋';
            case 'FAKE_ISSUER': return '🎭';
            case 'TAMPERED_DATA': return '🔓';
            case 'IDENTITY_MISMATCH': return '👤';
            case 'PATTERN_ANOMALY': return '📊';
            case 'FORGED_CREDENTIAL': return '📝';
            default: return '⚡';
        }
    };

    return (
        <motion.div 
            className={`fraud-alert-overlay severity-${fraudData.severity?.toLowerCase()}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            {/* Animated Warning Border */}
            <motion.div 
                className="alert-border"
                style={{ borderColor: getSeverityColor(fraudData.severity) }}
                animate={{
                    boxShadow: [
                        `0 0 20px ${getSeverityColor(fraudData.severity)}40`,
                        `0 0 40px ${getSeverityColor(fraudData.severity)}80`,
                        `0 0 20px ${getSeverityColor(fraudData.severity)}40`
                    ]
                }}
                transition={{ repeat: Infinity, duration: 1.5 }}
            />

            {/* Alert Header */}
            <div className="alert-header">
                <motion.div 
                    className="alert-icon"
                    animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, -10, 10, 0]
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    {getSeverityIcon(fraudData.severity)}
                </motion.div>
                
                <div className="alert-title">
                    <h3>Fraud Alert Detected</h3>
                    <span 
                        className="severity-badge"
                        style={{ backgroundColor: getSeverityColor(fraudData.severity) }}
                    >
                        {fraudData.severity}
                    </span>
                </div>

                <button className="btn-close" onClick={onDismiss}>✕</button>
            </div>

            {/* Risk Score */}
            <div className="risk-score-section">
                <div className="risk-meter">
                    <svg viewBox="0 0 100 50" className="risk-gauge">
                        <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="8"
                            strokeLinecap="round"
                        />
                        <motion.path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke={getSeverityColor(fraudData.severity)}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray="126"
                            initial={{ strokeDashoffset: 126 }}
                            animate={{ 
                                strokeDashoffset: 126 - (fraudData.riskScore / 100) * 126 
                            }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                        />
                    </svg>
                    <div className="risk-value">
                        <motion.span
                            key={fraudData.riskScore}
                            initial={{ scale: 1.5 }}
                            animate={{ scale: 1 }}
                        >
                            {fraudData.riskScore}
                        </motion.span>
                        <span className="risk-label">Risk Score</span>
                    </div>
                </div>
            </div>

            {/* Detected Issues */}
            <div className="detected-issues">
                <h4>Detected Issues ({fraudData.alerts?.length || 0})</h4>
                <div className="issues-list">
                    {fraudData.alerts?.map((alert, idx) => (
                        <motion.div
                            key={idx}
                            className="issue-item"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <span className="issue-icon">{getFraudTypeIcon(alert.type)}</span>
                            <div className="issue-content">
                                <span className="issue-type">{alert.type.replace(/_/g, ' ')}</span>
                                <span className="issue-message">{alert.message}</span>
                            </div>
                            <span 
                                className="issue-severity"
                                style={{ color: getSeverityColor(alert.severity) }}
                            >
                                {alert.severity}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Expandable Details */}
            <button 
                className="btn-expand"
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? '▲ Hide Details' : '▼ Show Details'}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        className="alert-details"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <div className="detail-section">
                            <h5>Certificate Information</h5>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span>Hash</span>
                                    <code>{certificate?.certificateHash?.slice(0, 20)}...</code>
                                </div>
                                <div className="detail-item">
                                    <span>Student</span>
                                    <strong>{certificate?.studentName}</strong>
                                </div>
                                <div className="detail-item">
                                    <span>Course</span>
                                    <strong>{certificate?.courseName}</strong>
                                </div>
                                <div className="detail-item">
                                    <span>Institution</span>
                                    <strong>{certificate?.institutionName}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="detail-section">
                            <h5>Analysis Breakdown</h5>
                            {fraudData.breakdown && Object.entries(fraudData.breakdown).map(([key, value]) => (
                                <div key={key} className="breakdown-item">
                                    <span className="breakdown-label">{key}</span>
                                    <div className="breakdown-bar">
                                        <motion.div
                                            className="breakdown-fill"
                                            style={{ 
                                                backgroundColor: value < 50 ? '#ef4444' : '#10b981'
                                            }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${value}%` }}
                                        />
                                    </div>
                                    <span className="breakdown-value">{value}%</span>
                                </div>
                            ))}
                        </div>

                        <div className="detail-section">
                            <h5>Recommendations</h5>
                            <ul className="recommendations-list">
                                {fraudData.recommendations?.map((rec, idx) => (
                                    <li key={idx}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Actions */}
            <div className="alert-actions">
                <button className="btn-investigate" onClick={onInvestigate}>
                    🔍 Investigate
                </button>
                <button className="btn-block">
                    🚫 Block Certificate
                </button>
                <button className="btn-report">
                    📝 Generate Report
                </button>
            </div>

            {/* Pulse Animation Overlay */}
            <div className="pulse-overlay">
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={`${pulseCount}-${i}`}
                        className="pulse-ring"
                        style={{ borderColor: getSeverityColor(fraudData.severity) }}
                        initial={{ scale: 0.8, opacity: 0.8 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 2, delay: i * 0.4 }}
                    />
                ))}
            </div>
        </motion.div>
    );
};

export default FraudAlertOverlay;