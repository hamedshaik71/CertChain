import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import './CertificateWallet.css';

const CertificateWallet = ({ certificates }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState({});

    const nextCard = () => {
        setCurrentIndex(prev => (prev + 1) % certificates.length);
    };

    const prevCard = () => {
        setCurrentIndex(prev => (prev - 1 + certificates.length) % certificates.length);
    };

    const toggleFlip = (id) => {
        setFlipped(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleShare = async (cert) => {
        const shareData = {
            title: `${cert.courseName} Certificate`,
            text: `Check out my verified certificate from ${cert.institutionName}!`,
            url: `${window.location.origin}/verify/${cert.certificateHash}`
        };

        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            navigator.clipboard.writeText(shareData.url);
        }
    };

    return (
        <div className="certificate-wallet">
            <div className="wallet-header">
                <span className="wallet-icon">💳</span>
                <h2>My Certificates</h2>
                <span className="card-count">{currentIndex + 1} / {certificates.length}</span>
            </div>

            <div className="cards-container">
                <AnimatePresence mode="wait">
                    {certificates.length > 0 && (
                        <CertificateCard
                            key={certificates[currentIndex]._id}
                            certificate={certificates[currentIndex]}
                            isFlipped={flipped[certificates[currentIndex]._id]}
                            onFlip={() => toggleFlip(certificates[currentIndex]._id)}
                            onShare={() => handleShare(certificates[currentIndex])}
                        />
                    )}
                </AnimatePresence>

                {certificates.length > 1 && (
                    <>
                        <button className="nav-btn nav-prev" onClick={prevCard}>
                            ‹
                        </button>
                        <button className="nav-btn nav-next" onClick={nextCard}>
                            ›
                        </button>
                    </>
                )}
            </div>

            <div className="card-dots">
                {certificates.map((_, idx) => (
                    <button
                        key={idx}
                        className={`dot ${idx === currentIndex ? 'active' : ''}`}
                        onClick={() => setCurrentIndex(idx)}
                    />
                ))}
            </div>

            <div className="wallet-actions">
                <button className="action-btn">
                    <span>📥</span> Add to Apple Wallet
                </button>
                <button className="action-btn">
                    <span>📤</span> Export All
                </button>
            </div>
        </div>
    );
};

const CertificateCard = ({ certificate, isFlipped, onFlip, onShare }) => {
    const x = useMotionValue(0);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'ISSUED': return '#10b981';
            case 'VERIFIED': return '#3b82f6';
            case 'REVOKED': return '#ef4444';
            case 'EXPIRED': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    const getGradeColor = (grade) => {
        if (grade?.startsWith('A')) return '#10b981';
        if (grade?.startsWith('B')) return '#3b82f6';
        if (grade?.startsWith('C')) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <motion.div
            className="certificate-card-3d"
            style={{ x, rotateY, perspective: 1000 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
            transition={{ type: "spring", duration: 0.6 }}
            whileHover={{ scale: 1.02 }}
            onClick={onFlip}
        >
            <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
                {/* Front of Card */}
                <div className="card-front">
                    <div className="card-gradient" />
                    
                    <div className="card-header">
                        <div className="institution-logo">
                            🎓
                        </div>
                        <div className="institution-info">
                            <h3>{certificate.institutionName}</h3>
                            <span className="institution-code">{certificate.institutionCode}</span>
                        </div>
                        <div 
                            className="status-badge"
                            style={{ background: getStatusColor(certificate.status) }}
                        >
                            {certificate.status === 'ISSUED' && '✓'}
                            {certificate.status === 'REVOKED' && '✕'}
                            {certificate.status === 'EXPIRED' && '⏱'}
                        </div>
                    </div>

                    <div className="card-body">
                        <h2 className="course-name">{certificate.courseName}</h2>
                        <p className="student-name">{certificate.studentName}</p>
                        
                        <div className="card-details">
                            <div className="detail">
                                <span className="label">Grade</span>
                                <span 
                                    className="value grade"
                                    style={{ color: getGradeColor(certificate.grade) }}
                                >
                                    {certificate.grade}
                                </span>
                            </div>
                            <div className="detail">
                                <span className="label">Issued</span>
                                <span className="value">
                                    {new Date(certificate.issueDate).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="card-footer">
                        <div className="blockchain-badge">
                            ⛓️ Blockchain Verified
                        </div>
                        <span className="tap-hint">Tap to flip</span>
                    </div>

                    {/* Holographic Effect */}
                    <div className="holographic-overlay" />
                </div>

                {/* Back of Card */}
                <div className="card-back">
                    <div className="card-gradient" />
                    
                    <div className="back-header">
                        <h3>Blockchain Proof</h3>
                    </div>

                    <div className="back-content">
                        <div className="qr-container">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${certificate.certificateHash}`}
                                alt="QR Code"
                                className="qr-code"
                            />
                        </div>

                        <div className="hash-info">
                            <span className="label">Certificate Hash</span>
                            <code className="hash">
                                {certificate.certificateHash?.slice(0, 16)}...
                            </code>
                        </div>

                        {certificate.transactionHash && (
                            <div className="tx-info">
                                <span className="label">Transaction</span>
                                <code className="hash">
                                    {certificate.transactionHash?.slice(0, 16)}...
                                </code>
                            </div>
                        )}

                        <div className="verification-count">
                            <span className="count">{certificate.verificationCount || 0}</span>
                            <span className="label">Verifications</span>
                        </div>
                    </div>

                    <div className="back-actions">
                        <button 
                            className="action-btn-small"
                            onClick={(e) => { e.stopPropagation(); onShare(); }}
                        >
                            🔗 Share
                        </button>
                        <button 
                            className="action-btn-small"
                            onClick={(e) => { e.stopPropagation(); }}
                        >
                            📥 Download
                        </button>
                    </div>

                    <span className="tap-hint">Tap to flip back</span>
                </div>
            </div>
        </motion.div>
    );
};

export default CertificateWallet;