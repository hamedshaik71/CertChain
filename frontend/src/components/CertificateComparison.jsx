import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import './CertificateComparison.css';

const CertificateComparison = ({ certificate1, certificate2, comparisonType = 'side-by-side' }) => {
    const [viewMode, setViewMode] = useState(comparisonType);
    const [highlightDifferences, setHighlightDifferences] = useState(true);

    const compareFields = [
        { key: 'studentName', label: 'Student Name', icon: '👤' },
        { key: 'courseName', label: 'Course', icon: '📚' },
        { key: 'grade', label: 'Grade', icon: '🏆' },
        { key: 'institutionName', label: 'Institution', icon: '🏛️' },
        { key: 'issueDate', label: 'Issue Date', icon: '📅' },
        { key: 'status', label: 'Status', icon: '📌' },
        { key: 'certificateHash', label: 'Hash', icon: '🔗' },
        { key: 'transactionHash', label: 'Blockchain TX', icon: '⛓️' }
    ];

    const getDifference = (field) => {
        const val1 = certificate1?.[field];
        const val2 = certificate2?.[field];
        return val1 !== val2;
    };

    const formatValue = (value, field) => {
        if (!value) return 'N/A';
        if (field === 'issueDate') return new Date(value).toLocaleDateString();
        if (field === 'certificateHash' || field === 'transactionHash') {
            return value.slice(0, 16) + '...';
        }
        return value;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ISSUED': case 'VERIFIED': return '#10b981';
            case 'REVOKED': return '#ef4444';
            case 'EXPIRED': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    return (
        <div className="certificate-comparison">
            {/* Header */}
            <div className="comparison-header">
                <h3>📊 Certificate Comparison</h3>
                <div className="view-toggle">
                    <button 
                        className={viewMode === 'side-by-side' ? 'active' : ''}
                        onClick={() => setViewMode('side-by-side')}
                    >
                        ⬛⬛ Side by Side
                    </button>
                    <button 
                        className={viewMode === 'overlay' ? 'active' : ''}
                        onClick={() => setViewMode('overlay')}
                    >
                        🔀 Overlay
                    </button>
                    <button 
                        className={viewMode === 'diff' ? 'active' : ''}
                        onClick={() => setViewMode('diff')}
                    >
                        ⚡ Diff View
                    </button>
                </div>
            </div>

            {/* Highlight Toggle */}
            <label className="highlight-toggle">
                <input
                    type="checkbox"
                    checked={highlightDifferences}
                    onChange={(e) => setHighlightDifferences(e.target.checked)}
                />
                <span className="toggle-slider"></span>
                Highlight Differences
            </label>

            {/* Comparison Content */}
            <AnimatePresence mode="wait">
                {viewMode === 'side-by-side' && (
                    <motion.div 
                        key="side-by-side"
                        className="comparison-side-by-side"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* Certificate 1 */}
                        <div className="cert-column original">
                            <div className="column-header">
                                <span className="column-badge">Original</span>
                                <span className="cert-date">
                                    {new Date(certificate1?.issueDate).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="cert-card">
                                <div 
                                    className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(certificate1?.status) }}
                                >
                                    {certificate1?.status}
                                </div>
                                {compareFields.map(field => (
                                    <div 
                                        key={field.key}
                                        className={`field-row ${highlightDifferences && getDifference(field.key) ? 'different' : ''}`}
                                    >
                                        <span className="field-icon">{field.icon}</span>
                                        <span className="field-label">{field.label}</span>
                                        <span className="field-value">
                                            {formatValue(certificate1?.[field.key], field.key)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Difference Indicator */}
                        <div className="diff-indicator">
                            <div className="diff-line"></div>
                            <span className="diff-badge">
                                {compareFields.filter(f => getDifference(f.key)).length} Changes
                            </span>
                            <div className="diff-line"></div>
                        </div>

                        {/* Certificate 2 */}
                        <div className="cert-column updated">
                            <div className="column-header">
                                <span className="column-badge">
                                    {certificate2?.status === 'REVOKED' ? 'Revoked' : 'Updated'}
                                </span>
                                <span className="cert-date">
                                    {new Date(certificate2?.updatedAt || certificate2?.issueDate).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="cert-card">
                                <div 
                                    className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(certificate2?.status) }}
                                >
                                    {certificate2?.status}
                                </div>
                                {compareFields.map(field => (
                                    <div 
                                        key={field.key}
                                        className={`field-row ${highlightDifferences && getDifference(field.key) ? 'different' : ''}`}
                                    >
                                        <span className="field-icon">{field.icon}</span>
                                        <span className="field-label">{field.label}</span>
                                        <span className="field-value">
                                            {formatValue(certificate2?.[field.key], field.key)}
                                        </span>
                                        {highlightDifferences && getDifference(field.key) && (
                                            <motion.span 
                                                className="change-indicator"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                            >
                                                ⚡
                                            </motion.span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {viewMode === 'diff' && (
                    <motion.div 
                        key="diff"
                        className="comparison-diff"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="diff-list">
                            {compareFields.map(field => {
                                const isDiff = getDifference(field.key);
                                return (
                                    <motion.div 
                                        key={field.key}
                                        className={`diff-row ${isDiff ? 'changed' : 'unchanged'}`}
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                    >
                                        <div className="diff-field">
                                            <span className="diff-icon">{field.icon}</span>
                                            <span className="diff-label">{field.label}</span>
                                        </div>
                                        
                                        {isDiff ? (
                                            <div className="diff-values">
                                                <div className="old-value">
                                                    <span className="value-badge removed">-</span>
                                                    {formatValue(certificate1?.[field.key], field.key)}
                                                </div>
                                                <span className="arrow">→</span>
                                                <div className="new-value">
                                                    <span className="value-badge added">+</span>
                                                    {formatValue(certificate2?.[field.key], field.key)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="same-value">
                                                <span className="check">✓</span>
                                                {formatValue(certificate1?.[field.key], field.key)}
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>

                        <div className="diff-summary">
                            <div className="summary-stat">
                                <span className="stat-icon changed">⚡</span>
                                <span className="stat-value">
                                    {compareFields.filter(f => getDifference(f.key)).length}
                                </span>
                                <span className="stat-label">Changed</span>
                            </div>
                            <div className="summary-stat">
                                <span className="stat-icon unchanged">✓</span>
                                <span className="stat-value">
                                    {compareFields.filter(f => !getDifference(f.key)).length}
                                </span>
                                <span className="stat-label">Unchanged</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {viewMode === 'overlay' && (
                    <motion.div 
                        key="overlay"
                        className="comparison-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <p className="overlay-hint">
                            Drag the slider to compare certificates
                        </p>
                        <div className="overlay-container">
                            <ReactCompareSlider
                                itemOne={
                                    <div className="overlay-cert original">
                                        <h4>Original Certificate</h4>
                                        <div className="overlay-content">
                                            {compareFields.map(field => (
                                                <div key={field.key} className="overlay-field">
                                                    <span>{field.label}:</span>
                                                    <strong>{formatValue(certificate1?.[field.key], field.key)}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                }
                                itemTwo={
                                    <div className="overlay-cert updated">
                                        <h4>Updated Certificate</h4>
                                        <div className="overlay-content">
                                            {compareFields.map(field => (
                                                <div key={field.key} className="overlay-field">
                                                    <span>{field.label}:</span>
                                                    <strong>{formatValue(certificate2?.[field.key], field.key)}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                }
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CertificateComparison;