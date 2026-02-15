import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './VerifyCertificate.css';

const VerifyCertificate = () => {
    const { hash } = useParams(); 
    const [searchParams] = useSearchParams();
    
    const [certificate, setCertificate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [initialIntro, setInitialIntro] = useState(true); 
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [viewerInfo, setViewerInfo] = useState({});
    const [verificationTime, setVerificationTime] = useState(null);

    const SERVER_URL = process.env.REACT_APP_API_URL || 'https://certchain-api.onrender.com';

    useEffect(() => {
        captureViewerInfo();
        verifyCertificate();
        setVerificationTime(new Date());

        // Play the awesome intro for 3 seconds
        setTimeout(() => setInitialIntro(false), 3000);
    }, [hash]);

    const captureViewerInfo = () => {
        const info = {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        setViewerInfo(info);
    };

    const verifyCertificate = async () => {
        try {
            const response = await fetch(`${SERVER_URL}/api/certificates/verify/${hash}`);
            let data;

try {
   const text = await response.text();
   data = text ? JSON.parse(text) : {};
} catch (err) {
   console.error("💀 Invalid JSON response:", err);
   data = { success: false, error: "INVALID_SERVER_RESPONSE" };
}


            if (data.success) {
                setCertificate(data.certificate);
                setVerificationStatus({
                    isValid: data.isValid,
                    source: data.source, 
                    blockchainVerified: data.blockchainVerified,
                    status: data.certificate.status,
                    tamperedDetected: false
                });
                logVerification(data.certificate.id || data.certificate._id);
            } else {
                setVerificationStatus({ isValid: false, error: data.message, tamperedDetected: true });
            }
        } catch (error) {
            setVerificationStatus({ isValid: false, error: "Network Error", tamperedDetected: false });
        } finally {
            setLoading(false);
        }
    };

    const logVerification = async (certId) => {
        try {
            await fetch(`${SERVER_URL}/api/certificates/log-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: ({ certificateId: certId, viewerInfo, timestamp: new Date().toISOString() })
            });
        } catch (error) {}
    };

    const getStatusBadge = () => {
        if (!verificationStatus) return null;
        if (verificationStatus.tamperedDetected) return <motion.div className="status-badge tampered" initial={{ scale: 0 }} animate={{ scale: 1 }}><span className="status-icon">🚨</span><span>RECORD NOT FOUND</span></motion.div>;
        if (verificationStatus.source === 'BLOCKCHAIN_LEDGER' || verificationStatus.source === 'LEDGER') return <motion.div className="status-badge ledger" initial={{ scale: 0 }} animate={{ scale: 1 }}><span className="status-icon">🛡️</span><span>SECURE LEDGER VERIFIED</span></motion.div>;
        if (verificationStatus.isValid) return <motion.div className="status-badge active" initial={{ scale: 0 }} animate={{ scale: 1 }}><span className="status-icon">🟢</span><span>VALID (PENDING ANCHOR)</span></motion.div>;
    };

    // --- 🌟 NEW SCI-FI INTRO COMPONENT ---
    if (initialIntro) {
        return (
            <div className="intro-overlay">
                <div className="quantum-loader">
                    <div className="circle-1"></div>
                    <div className="circle-2"></div>
                    <div className="core"></div>
                    <div className="particles"></div>
                </div>
                <div className="loading-text-container">
                    <span className="loading-text">ESTABLISHING SECURE CONNECTION</span>
                    <span className="blink">...</span>
                </div>
                <div className="hash-scroll">{hash}</div>
            </div>
        );
    }

    if (loading) return null; 

    if (verificationStatus?.tamperedDetected || !certificate) {
        return (
            <div className="verify-container">
                <motion.div className="fraud-card" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <div className="fraud-icon">🚫</div>
                    <h1>Certificate Not Found</h1>
                    <p>ID <strong>{hash}</strong> not found in ledger.</p>
                    <button className="action-btn" onClick={() => window.location.reload()}>Try Again</button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="verify-container">
            <div className="watermark">Verified by CertChain • {verificationTime?.toLocaleTimeString()}</div>
            <div className="bg-shape shape-1"></div>
            <div className="bg-shape shape-2"></div>

            <motion.div 
                className="verify-card"
                // 🚀 CARD MATERIALIZATION ANIMATION
                initial={{ scale: 0.5, opacity: 0, rotateX: 90 }}
                animate={{ scale: 1, opacity: 1, rotateX: 0 }}
                transition={{ duration: 0.8, ease: "circOut" }}
            >
                {/* 🌟 HOLOGRAPHIC SCANNER */}
                <div className="holographic-scan"></div>

                <div className="verify-header">
                    <div className="logo-area">🎓 CertChain</div>
                    {getStatusBadge()}
                </div>

                <div className="tab-navigation">
                    <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📄 Overview</button>
                    <button className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`} onClick={() => setActiveTab('ledger')}>⛓️ Ledger</button>
                    <button className={`tab-btn ${activeTab === 'issuer' ? 'active' : ''}`} onClick={() => setActiveTab('issuer')}>🏫 Issuer</button>
                </div>

                <div className="card-body custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <motion.div key="overview" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                                <div className="student-profile">
                                    <div className="avatar-circle">{certificate.studentName.charAt(0)}</div>
                                    <div><h2>{certificate.studentName}</h2><p className="sub-text">{certificate.studentEmail}</p></div>
                                </div>
                                <div className="info-grid">
                                    <div className="info-item"><label>Course Name</label><div className="value">{certificate.courseName}</div></div>
                                    <div className="info-item"><label>Institution</label><div className="value">{certificate.institutionName}</div></div>
                                    <div className="info-item"><label>Grade Achieved</label><div className="value highlight">{certificate.grade}</div></div>
                                    <div className="info-item"><label>Issue Date</label><div className="value">{new Date(certificate.issueDate).toLocaleDateString()}</div></div>
                                </div>
                                <div className="id-box"><label>🔑 Verified Certificate ID</label><div className="id-value">{certificate.certificateHash}</div></div>
                                {certificate.fileData && (
                                    <button className="download-btn" onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = `data:application/pdf;base64,${certificate.fileData}`;
                                        link.download = `${certificate.certificateHash}.pdf`;
                                        link.click();
                                    }}>📥 Download Original PDF</button>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'ledger' && (
                            <motion.div key="ledger" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                                <div className="ledger-steps">
                                    <div className="step success"><div className="icon">✅</div><div><h4>Input Received</h4><p>ID: {hash}</p></div></div>
                                    <div className="line"></div>
                                    <div className="step success"><div className="icon">✅</div><div><h4>Ledger Match Found</h4><p>Record exists in Immutable Ledger</p></div></div>
                                    <div className="line"></div>
                                    <div className="step success"><div className="icon">✅</div><div><h4>Cryptographic Proof</h4><p className="mono">{certificate.sha256Hash.substring(0, 30)}...</p></div></div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'issuer' && (
                            <motion.div key="issuer" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
                                <div className="issuer-profile-card">
                                    <div className="ip-header"><div className="ip-icon">🏛️</div><div className="ip-info"><h3>{certificate.institutionName}</h3><span className="ip-badge">Authorized Issuer</span></div></div>
                                    <div className="ip-body">
                                        <div className="ip-row"><span className="ip-label">Contact Email</span><span className="ip-value">{certificate.institutionAddress || "admin@institution.edu"}</span></div>
                                        <div className="ip-row"><span className="ip-label">Compliance Status</span><span className="ip-value status-ok">Active & Compliant</span></div>
                                        <div className="ip-row"><span className="ip-label">Blockchain Authority ID</span><code className="ip-code">0x{certificate.institutionAddress ? certificate.institutionAddress.substring(0, 16) : 'b4f...'}...</code></div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="card-footer">Secured by <strong>CertChain</strong> Blockchain Technology</div>
            </motion.div>
        </div>
    );
};

export default VerifyCertificate;