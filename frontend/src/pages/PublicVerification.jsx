import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import VerificationScanner from '../components/VerificationScanner';
import TrustMeter from '../components/TrustMeter';
import './PublicVerification.css';

const PublicVerification = () => {
    const { hash } = useParams();
    const [searchParams] = useSearchParams();
    const [inputHash, setInputHash] = useState(hash || '');
    const [verificationResult, setVerificationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        if (hash) {
            handleVerify(hash);
        }
    }, [hash]);

    const handleVerify = async (certificateHash) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/public/verify/${certificateHash}`);
            const data = await response.json();
            setVerificationResult(data);
        } catch (error) {
            setVerificationResult({
                success: false,
                error: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleShare = () => {
        const url = `${window.location.origin}/verify/${inputHash}`;
        if (navigator.share) {
            navigator.share({
                title: 'Verified Certificate',
                text: 'Check out this blockchain-verified certificate!',
                url
            });
        } else {
            navigator.clipboard.writeText(url);
        }
    };

    return (
        <div className="public-verification-page">
            {/* Animated Background */}
            <div className="bg-animation">
                <div className="bg-gradient" />
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="floating-particle"
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: Math.random() * window.innerHeight,
                        }}
                        animate={{
                            y: [null, Math.random() * -200, null],
                            x: [null, Math.random() * 100 - 50, null],
                        }}
                        transition={{
                            duration: 10 + Math.random() * 10,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>

            <div className="verification-container">
                {/* Header */}
                <motion.header 
                    className="verification-header"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="logo">
                        <span className="logo-icon">🎓</span>
                        <span className="logo-text">CertChain</span>
                    </div>
                    <h1>Certificate Verification Portal</h1>
                    <p>Verify the authenticity of any blockchain-secured certificate</p>
                </motion.header>

                {/* Search Section */}
                <motion.div 
                    className="search-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="search-box">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Enter certificate hash or scan QR code"
                            value={inputHash}
                            onChange={(e) => setInputHash(e.target.value)}
                        />
                        <button 
                            className="btn-scan"
                            onClick={() => setShowScanner(true)}
                        >
                            📱 Scan
                        </button>
                    </div>
                    <button 
                        className="btn-verify"
                        onClick={() => handleVerify(inputHash)}
                        disabled={!inputHash || loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                ✓ Verify Certificate
                            </>
                        )}
                    </button>
                </motion.div>

                {/* Results Section */}
                <AnimatePresence>
                    {verificationResult && (
                        <motion.div
                            className={`verification-result ${verificationResult.success ? 'valid' : 'invalid'}`}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                        >
                            {verificationResult.success ? (
                                <>
                                    <motion.div 
                                        className="result-badge valid"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", delay: 0.2 }}
                                    >
                                        <span className="badge-icon">✅</span>
                                        <span className="badge-text">VERIFIED</span>
                                    </motion.div>

                                    <div className="certificate-card">
                                        <div className="card-header">
                                            <div className="institution-info">
                                                <span className="inst-icon">🏛️</span>
                                                <h3>{verificationResult.certificate.institutionName}</h3>
                                            </div>
                                            <div className="blockchain-badge">
                                                ⛓️ On Blockchain
                                            </div>
                                        </div>

                                        <div className="card-body">
                                            <h2>{verificationResult.certificate.courseName}</h2>
                                            <p className="student-name">
                                                Awarded to: <strong>{verificationResult.certificate.studentName}</strong>
                                            </p>

                                            <div className="details-grid">
                                                <div className="detail">
                                                    <span className="label">Grade</span>
                                                    <span className="value grade">{verificationResult.certificate.grade}</span>
                                                </div>
                                                <div className="detail">
                                                    <span className="label">Issue Date</span>
                                                    <span className="value">
                                                        {new Date(verificationResult.certificate.issueDate).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className="detail">
                                                    <span className="label">Status</span>
                                                    <span className="value status-valid">
                                                        {verificationResult.certificate.status}
                                                    </span>
                                                </div>
                                                <div className="detail">
                                                    <span className="label">Verifications</span>
                                                    <span className="value">
                                                        {verificationResult.certificate.verificationCount}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card-footer">
                                            <div className="hash-display">
                                                <span className="label">Certificate Hash</span>
                                                <code>{inputHash}</code>
                                            </div>
                                            {verificationResult.certificate.transactionHash && (
                                                <div className="tx-display">
                                                    <span className="label">Blockchain TX</span>
                                                    <code>{verificationResult.certificate.transactionHash.slice(0, 20)}...</code>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <TrustMeter 
                                        score={85} 
                                        label="Trust Score"
                                    />

                                    <div className="result-actions">
                                        <button className="btn-share" onClick={handleShare}>
                                            🔗 Share Result
                                        </button>
                                        <button className="btn-download">
                                            📥 Download Certificate
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <motion.div 
                                    className="invalid-result"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <div className="result-badge invalid">
                                        <span className="badge-icon">❌</span>
                                        <span className="badge-text">NOT FOUND</span>
                                    </div>
                                    <p>This certificate hash was not found in our blockchain records.</p>
                                    <ul className="suggestions">
                                        <li>Double-check the certificate hash</li>
                                        <li>Ensure you copied the complete hash</li>
                                        <li>Contact the issuing institution</li>
                                    </ul>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Features Section */}
                <div className="features-section">
                    <div className="feature">
                        <span className="feature-icon">⛓️</span>
                        <h4>Blockchain Secured</h4>
                        <p>Immutable records on distributed ledger</p>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">🔐</span>
                        <h4>Tamper-Proof</h4>
                        <p>SHA-256 hash verification</p>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">⚡</span>
                        <h4>Instant Verification</h4>
                        <p>Real-time authenticity check</p>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">🌍</span>
                        <h4>Global Access</h4>
                        <p>Verify from anywhere, anytime</p>
                    </div>
                </div>

                {/* Footer */}
                <footer className="verification-footer">
                    <p>Powered by CertChain • Blockchain Certificate Verification</p>
                    <div className="footer-links">
                        <a href="/about">About</a>
                        <a href="/contact">Contact</a>
                        <a href="/privacy">Privacy</a>
                    </div>
                </footer>
            </div>

            {/* QR Scanner Modal */}
            <AnimatePresence>
                {showScanner && (
                    <motion.div 
                        className="scanner-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowScanner(false)}
                    >
                        <motion.div 
                            className="scanner-content"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="close-scanner" onClick={() => setShowScanner(false)}>
                                ✕
                            </button>
                            <VerificationScanner
                                onVerify={(hash) => {
                                    setInputHash(hash);
                                    setShowScanner(false);
                                    handleVerify(hash);
                                }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PublicVerification;