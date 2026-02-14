import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './BulkIssuanceProgress.css';

const BulkIssuanceProgress = ({ 
    totalCertificates, 
    issuedCount, 
    failedCount,
    currentCertificate,
    isProcessing,
    onCancel,
    onRetryFailed
}) => {
    const [showDetails, setShowDetails] = useState(false);
    const progress = (issuedCount / totalCertificates) * 100;
    const successRate = issuedCount > 0 
        ? ((issuedCount / (issuedCount + failedCount)) * 100).toFixed(1)
        : 0;

    return (
        <div className="bulk-issuance-progress">
            <div className="progress-header">
                <h3>📦 Bulk Certificate Issuance</h3>
                {isProcessing && (
                    <motion.div 
                        className="processing-badge"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                        ⏳ Processing...
                    </motion.div>
                )}
            </div>

            {/* Main Progress Circle */}
            <div className="progress-visual">
                <svg className="progress-ring" viewBox="0 0 200 200">
                    {/* Background circle */}
                    <circle
                        cx="100"
                        cy="100"
                        r="85"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="15"
                    />
                    {/* Progress circle */}
                    <motion.circle
                        cx="100"
                        cy="100"
                        r="85"
                        fill="none"
                        stroke="url(#progressGradient)"
                        strokeWidth="15"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 85}
                        strokeDashoffset={2 * Math.PI * 85 * (1 - progress / 100)}
                        transform="rotate(-90 100 100)"
                        initial={{ strokeDashoffset: 2 * Math.PI * 85 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 85 * (1 - progress / 100) }}
                        transition={{ duration: 0.5 }}
                    />
                    <defs>
                        <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#667eea" />
                            <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                    </defs>
                </svg>

                <div className="progress-center">
                    <motion.span 
                        className="progress-percentage"
                        key={Math.round(progress)}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                    >
                        {Math.round(progress)}%
                    </motion.span>
                    <span className="progress-label">Complete</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-box total">
                    <span className="stat-icon">📋</span>
                    <div className="stat-content">
                        <span className="stat-value">{totalCertificates}</span>
                        <span className="stat-label">Total</span>
                    </div>
                </div>
                <div className="stat-box success">
                    <span className="stat-icon">✅</span>
                    <div className="stat-content">
                        <motion.span 
                            className="stat-value"
                            key={issuedCount}
                            initial={{ scale: 1.3, color: '#10b981' }}
                            animate={{ scale: 1, color: '#10b981' }}
                        >
                            {issuedCount}
                        </motion.span>
                        <span className="stat-label">Issued</span>
                    </div>
                </div>
                <div className="stat-box failed">
                    <span className="stat-icon">❌</span>
                    <div className="stat-content">
                        <span className="stat-value">{failedCount}</span>
                        <span className="stat-label">Failed</span>
                    </div>
                </div>
                <div className="stat-box remaining">
                    <span className="stat-icon">⏳</span>
                    <div className="stat-content">
                        <span className="stat-value">{totalCertificates - issuedCount - failedCount}</span>
                        <span className="stat-label">Remaining</span>
                    </div>
                </div>
            </div>

            {/* Current Certificate Being Processed */}
            {currentCertificate && isProcessing && (
                <motion.div 
                    className="current-processing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="processing-animation">
                        <motion.div 
                            className="processing-dot"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 0.5 }}
                        />
                    </div>
                    <div className="processing-info">
                        <span className="processing-label">Now Processing:</span>
                        <span className="processing-name">{currentCertificate.studentName}</span>
                        <span className="processing-course">{currentCertificate.courseName}</span>
                    </div>
                </motion.div>
            )}

            {/* Live Feed */}
            <div className="issuance-feed">
                <div className="feed-header" onClick={() => setShowDetails(!showDetails)}>
                    <span>📝 Issuance Log</span>
                    <span className="toggle">{showDetails ? '▲' : '▼'}</span>
                </div>
                <AnimatePresence>
                    {showDetails && (
                        <motion.div 
                            className="feed-content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            {/* Sample log entries */}
                            <div className="feed-item success">
                                <span className="feed-icon">✅</span>
                                <span className="feed-text">John Doe - Issued successfully</span>
                                <span className="feed-time">2s ago</span>
                            </div>
                            <div className="feed-item success">
                                <span className="feed-icon">✅</span>
                                <span className="feed-text">Jane Smith - Issued successfully</span>
                                <span className="feed-time">5s ago</span>
                            </div>
                            <div className="feed-item error">
                                <span className="feed-icon">❌</span>
                                <span className="feed-text">Bob Wilson - Invalid student code</span>
                                <span className="feed-time">8s ago</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Success Rate */}
            <div className="success-rate">
                <span className="rate-label">Success Rate</span>
                <div className="rate-bar">
                    <motion.div 
                        className="rate-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${successRate}%` }}
                    />
                </div>
                <span className="rate-value">{successRate}%</span>
            </div>

            {/* Actions */}
            <div className="progress-actions">
                {isProcessing ? (
                    <button className="btn-cancel" onClick={onCancel}>
                        ⏹️ Cancel
                    </button>
                ) : (
                    <>
                        {failedCount > 0 && (
                            <button className="btn-retry" onClick={onRetryFailed}>
                                🔄 Retry Failed ({failedCount})
                            </button>
                        )}
                        <button className="btn-done">
                            ✅ Done
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default BulkIssuanceProgress;