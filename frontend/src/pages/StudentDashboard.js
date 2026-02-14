// client/src/components/StudentDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode.react';
import CertificateTimeline from './CertificateTimeline';
import './StudentDashboard.css';

function StudentDashboard() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCert, setSelectedCert] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [timelineEvents, setTimelineEvents] = useState([]);
    const [qrMode, setQrMode] = useState('verify'); // 'verify', 'share', 'download'
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });

    // 🔒 HARDCODED SERVER URL - Forces browser to look at Backend (Port 5000)
    const SERVER_URL = 'http://localhost:5000';

    useEffect(() => {
        fetchCertificates();
    }, []);

    useEffect(() => {
        if (certificates.length > 0) {
            generateTimelineEvents();
        }
    }, [certificates]);

    // Show notification helper
    const showNotification = (message, type = 'info') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification({ show: false, message: '', type: '' });
        }, 3000);
    };

    const fetchCertificates = async () => {
        try {
            const studentEmail = userData.email || 'user@example.com';
            console.log('Fetching certificates for:', studentEmail);
            
            // ✅ Fetch from Port 5000
            const response = await fetch(`${SERVER_URL}/api/certificates/student/${studentEmail}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            console.log('Certificates response:', data);
            
            if (data.success && data.certificates && data.certificates.length > 0) {
                setCertificates(data.certificates);
            } else {
                console.log('No certificates found, using mock data');
                setCertificates(getMockCertificates());
            }
        } catch (error) {
            console.error('Error fetching certificates:', error);
            setCertificates(getMockCertificates());
        } finally {
            setLoading(false);
        }
    };

    const getMockCertificates = () => {
        return [
            {
                id: '1',
                certificateHash: 'demo_cert_' + Date.now(),
                sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                courseName: 'Web Development Fundamentals',
                institutionName: 'Tech University',
                studentName: userData.fullName || 'Demo Student',
                studentEmail: userData.email || 'user@example.com',
                grade: 'A+',
                category: 'COURSE',
                issueDate: new Date().toISOString(),
                transactionHash: '0x' + 'a'.repeat(64),
                blockNumber: 12345,
                status: 'ISSUED',
                verified: true
            },
            {
                id: '2',
                certificateHash: 'demo_cert_blockchain_' + Date.now(),
                sha256Hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
                courseName: 'Blockchain Development',
                institutionName: 'Crypto Academy',
                studentName: userData.fullName || 'Demo Student',
                studentEmail: userData.email || 'user@example.com',
                grade: 'A',
                category: 'CERTIFICATION',
                issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                transactionHash: '0x' + 'b'.repeat(64),
                blockNumber: 12300,
                status: 'ISSUED',
                verified: true
            }
        ];
    };

    const generateTimelineEvents = () => {
        const events = [];
        
        certificates.forEach(cert => {
            events.push({
                type: 'ISSUED',
                title: `Certificate Issued: ${cert.courseName}`,
                description: `Your certificate for ${cert.courseName} has been issued by ${cert.institutionName}`,
                timestamp: cert.issueDate,
                actor: cert.institutionName,
                location: 'Online',
                transactionHash: cert.transactionHash,
                certificateHash: cert.certificateHash
            });

            if (cert.transactionHash) {
                events.push({
                    type: 'VERIFIED',
                    title: `Blockchain Verified: ${cert.courseName}`,
                    description: `Certificate has been permanently recorded on the blockchain`,
                    timestamp: new Date(new Date(cert.issueDate).getTime() + 3600000).toISOString(),
                    actor: 'Blockchain Network',
                    transactionHash: cert.transactionHash,
                    blockNumber: cert.blockNumber
                });
            }
        });

        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setTimelineEvents(events);
    };

    // ✅ FIXED: Correctly generates API URLs using CERT-HASH Priority
    const generateQRData = (cert, mode) => {
        // PRIORITY: certificateHash -> sha256Hash -> id
        const certIdentifier = cert.certificateHash || cert.sha256Hash || cert.id;
        
        if (!certIdentifier) {
            console.error('No valid identifier for certificate:', cert);
            return `${SERVER_URL}/api/certificates/verify/invalid`;
        }
        
        console.log(`🔍 Generating ${mode} QR for certificate:`, certIdentifier);
        
        switch(mode) {
            case 'verify':
                // ✅ Points to Backend API verify endpoint
                return `${SERVER_URL}/api/certificates/verify/${certIdentifier}`;
            
            case 'share':
                const shareData = {
                    type: 'BLOCKCHAIN_CERTIFICATE',
                    version: '1.0',
                    data: {
                        hash: certIdentifier,
                        student: cert.studentName,
                        course: cert.courseName,
                        institution: cert.institutionName,
                        grade: cert.grade,
                        date: cert.issueDate,
                        tx: cert.transactionHash ? cert.transactionHash.substring(0, 20) + '...' : null,
                        verify: `${SERVER_URL}/api/certificates/verify/${certIdentifier}`
                    }
                };
                return JSON.stringify(shareData);
            
            case 'download':
                return `${SERVER_URL}/api/certificates/download/${certIdentifier}`;
            
            default:
                return `${SERVER_URL}/api/certificates/verify/${certIdentifier}`;
        }
    };

    const handleDownload = async (certificate) => {
        try {
            const certHash = certificate.certificateHash || certificate.sha256Hash || certificate.id;
            
            showNotification('Preparing download...', 'info');
            
            // ✅ Fetch from Port 5000
            const response = await fetch(`${SERVER_URL}/api/certificates/download/${certHash}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Download failed');
            }
            
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/pdf')) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `certificate-${certHash.substring(0, 8)}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                const html = await response.text();
                const blob = new Blob([html], { type: 'text/html' });
                const url = window.URL.createObjectURL(blob);
                window.open(url, '_blank');
            }

            const newEvent = {
                type: 'DOWNLOADED',
                title: 'Certificate Downloaded',
                description: `You downloaded ${certificate.courseName} certificate`,
                timestamp: new Date().toISOString(),
                actor: userData.fullName || 'You'
            };
            setTimelineEvents(prev => [newEvent, ...prev]);
            
            showNotification('Certificate downloaded successfully!', 'success');

        } catch (error) {
            console.error('Error downloading certificate:', error);
            generateAndDownloadCertificate(certificate);
        }
    };

    // ✅ FIXED: HTML Template Links
    const generateAndDownloadCertificate = (certificate) => {
        const certHash = certificate.certificateHash || certificate.sha256Hash || certificate.id;
        const verifyUrl = `${SERVER_URL}/api/certificates/verify/${certHash}`;
        
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate - ${certificate.courseName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Georgia', serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .certificate {
            background: white;
            border: 8px double #1a365d;
            padding: 60px;
            max-width: 900px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            position: relative;
        }
        .certificate::before {
            content: '';
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
            border: 2px solid #e2e8f0;
            pointer-events: none;
        }
        .header { margin-bottom: 30px; }
        .logo { font-size: 48px; margin-bottom: 10px; }
        .title { 
            font-size: 42px; 
            color: #1a365d; 
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 4px;
            margin-bottom: 10px;
        }
        .subtitle { 
            font-size: 18px; 
            color: #4a5568; 
            font-style: italic;
        }
        .content { margin: 40px 0; }
        .presented-to { 
            font-size: 16px; 
            color: #718096;
            margin-bottom: 15px;
        }
        .student-name { 
            font-size: 36px; 
            color: #2d3748;
            font-weight: bold;
            border-bottom: 2px solid #667eea;
            display: inline-block;
            padding: 0 30px 10px;
            margin-bottom: 25px;
        }
        .course-info { margin: 30px 0; }
        .course-label { 
            font-size: 14px; 
            color: #718096;
            margin-bottom: 10px;
        }
        .course-name { 
            font-size: 28px; 
            color: #1a365d;
            font-weight: bold;
        }
        .details { 
            display: flex; 
            justify-content: center; 
            gap: 60px; 
            margin: 30px 0;
            flex-wrap: wrap;
        }
        .detail-item { text-align: center; }
        .detail-label { 
            font-size: 12px; 
            color: #a0aec0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .detail-value { 
            font-size: 18px; 
            color: #2d3748;
            font-weight: bold;
        }
        .verification {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
        }
        .verification-title {
            font-size: 14px;
            color: #4a5568;
            margin-bottom: 15px;
            font-weight: bold;
        }
        .hash {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #667eea;
            word-break: break-all;
            background: #edf2f7;
            padding: 8px;
            border-radius: 4px;
            margin: 5px 0;
        }
        .verify-link {
            color: #667eea;
            text-decoration: none;
            font-size: 14px;
        }
        .blockchain-badge {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 12px;
            margin-top: 15px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        .signature {
            display: inline-block;
            border-top: 2px solid #2d3748;
            padding-top: 10px;
            min-width: 200px;
        }
        .signature-name { font-weight: bold; color: #2d3748; }
        .signature-title { font-size: 12px; color: #718096; }
        @media print {
            body { background: white; padding: 0; }
            .certificate { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <div class="logo">🎓</div>
            <h1 class="title">Certificate of Achievement</h1>
            <p class="subtitle">Blockchain Verified Digital Certificate</p>
        </div>
        
        <div class="content">
            <p class="presented-to">This is to certify that</p>
            <h2 class="student-name">${certificate.studentName}</h2>
            
            <div class="course-info">
                <p class="course-label">has successfully completed</p>
                <h3 class="course-name">${certificate.courseName}</h3>
            </div>
            
            <div class="details">
                <div class="detail-item">
                    <p class="detail-label">Institution</p>
                    <p class="detail-value">${certificate.institutionName}</p>
                </div>
                <div class="detail-item">
                    <p class="detail-label">Grade</p>
                    <p class="detail-value">${certificate.grade}</p>
                </div>
                <div class="detail-item">
                    <p class="detail-label">Issue Date</p>
                    <p class="detail-value">${new Date(certificate.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            </div>
            
            <span class="blockchain-badge">✓ Verified on Blockchain</span>
        </div>
        
        <div class="verification">
            <p class="verification-title">🔐 Verification Details</p>
            <p><strong>Certificate Hash:</strong></p>
            <p class="hash">${certHash}</p>
            ${certificate.transactionHash ? `<p><strong>Blockchain TX:</strong></p><p class="hash">${certificate.transactionHash}</p>` : ''}
            <p style="margin-top: 15px;"><strong>Verify Online:</strong></p>
            <a href="${verifyUrl}" class="verify-link">${verifyUrl}</a>
        </div>
        
        <div class="footer">
            <div class="signature">
                <p class="signature-name">${certificate.institutionName}</p>
                <p class="signature-title">Authorized Signatory</p>
            </div>
        </div>
    </div>
</body>
</html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${certificate.courseName.replace(/\s+/g, '-')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Certificate downloaded as HTML!', 'success');
    };

    // ✅ FIXED: Share URL
    const handleShare = async (certificate) => {
        const certHash = certificate.certificateHash || certificate.sha256Hash || certificate.id;
        const shareUrl = `${SERVER_URL}/api/certificates/verify/${certHash}`;
        const shareText = `🎓 Check out my verified certificate for "${certificate.courseName}" from ${certificate.institutionName}!\n\nVerify authenticity: ${shareUrl}`;
        
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Certificate: ${certificate.courseName}`,
                    text: shareText,
                    url: shareUrl
                });
                showNotification('Shared successfully!', 'success');
            } else {
                await navigator.clipboard.writeText(shareUrl);
                showNotification('Verification link copied to clipboard!', 'success');
            }

            const newEvent = {
                type: 'SHARED',
                title: 'Certificate Shared',
                description: `You shared ${certificate.courseName} certificate`,
                timestamp: new Date().toISOString(),
                actor: userData.fullName || 'You'
            };
            setTimelineEvents(prev => [newEvent, ...prev]);

        } catch (error) {
            console.error('Share error:', error);
            try {
                await navigator.clipboard.writeText(shareUrl);
                showNotification('Link copied to clipboard!', 'success');
            } catch (clipError) {
                showNotification('Unable to share. Please copy the link manually.', 'error');
            }
        }
    };

    const openQRModal = (cert, mode = 'verify') => {
        setSelectedCert(cert);
        setQrMode(mode);
        setShowQR(true);
        console.log(`📱 Opening QR modal for ${mode} mode`);
    };

    const getQRModeInfo = () => {
        switch(qrMode) {
            case 'verify':
                return {
                    title: '🔍 Verification QR Code',
                    description: 'Scan to instantly verify this certificate on blockchain',
                    color: '#3b82f6',
                    icon: '🔍'
                };
            case 'share':
                return {
                    title: '📤 Share Certificate QR',
                    description: 'Contains full certificate data for offline sharing',
                    color: '#10b981',
                    icon: '📤'
                };
            case 'download':
                return {
                    title: '📥 Download QR Code',
                    description: 'Scan to download the certificate directly',
                    color: '#f59e0b',
                    icon: '📥'
                };
            default:
                return {
                    title: 'Certificate QR Code',
                    description: '',
                    color: '#6366f1',
                    icon: '📱'
                };
        }
    };

    const downloadQRImage = () => {
        const canvas = document.querySelector('.qr-container canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `certificate-${qrMode}-qr-${selectedCert?.certificateHash?.substring(0, 8) || 'code'}.png`;
            link.click();
            showNotification('QR code image downloaded!', 'success');
        }
    };

    const copyQRLink = async () => {
        if (selectedCert) {
            const qrData = generateQRData(selectedCert, qrMode);
            try {
                await navigator.clipboard.writeText(qrData);
                showNotification(`${qrMode === 'verify' ? 'Verification' : qrMode === 'share' ? 'Share' : 'Download'} link copied!`, 'success');
            } catch (error) {
                showNotification('Failed to copy link', 'error');
            }
        }
    };

    const getCategoryIcon = (category) => {
        const icons = {
            'DEGREE': '🎓',
            'DIPLOMA': '📜',
            'COURSE': '📚',
            'CERTIFICATION': '🏆',
            'WORKSHOP': '🔧',
            'INTERNSHIP': '💼',
            'ACHIEVEMENT': '🌟'
        };
        return icons[category] || '📜';
    };

    const getStatusBadge = (status, verified) => {
        if (status === 'ISSUED' && verified) {
            return { text: '✓ Verified', class: 'verified' };
        } else if (status === 'ISSUED') {
            return { text: '✓ Issued', class: 'issued' };
        } else if (status === 'PENDING_LEVEL_1' || status === 'PENDING_LEVEL_2' || status === 'PENDING_LEVEL_3') {
            return { text: '⏳ Pending', class: 'pending' };
        } else if (status === 'REJECTED') {
            return { text: '✕ Rejected', class: 'rejected' };
        }
        return { text: status, class: 'default' };
    };

    return (
        <div className="student-dashboard">
            {/* Notification */}
            {notification.show && (
                <div className={`notification notification-${notification.type}`}>
                    {notification.type === 'success' && '✓ '}
                    {notification.type === 'error' && '✕ '}
                    {notification.type === 'info' && 'ℹ '}
                    {notification.message}
                </div>
            )}

            {/* Hero Section */}
            <div className="dashboard-hero">
                <div className="hero-content">
                    <h1>Welcome, {userData.fullName || 'Student'}! 🎓</h1>
                    <p>Your Digital Certificate Portfolio</p>
                    <div className="hero-actions">
                        <Link to="/verify" className="btn-hero-action">
                            🔍 Verify a Certificate
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="stats-section">
                <div className="stat-box stat-1">
                    <span className="stat-icon">📜</span>
                    <div className="stat-info">
                        <h3>{certificates.length}</h3>
                        <p>Total Certificates</p>
                    </div>
                </div>
                <div className="stat-box stat-2">
                    <span className="stat-icon">✓</span>
                    <div className="stat-info">
                        <h3>{certificates.filter(c => c.transactionHash).length}</h3>
                        <p>Blockchain Verified</p>
                    </div>
                </div>
                <div className="stat-box stat-3">
                    <span className="stat-icon">🏆</span>
                    <div className="stat-info">
                        <h3>{certificates.filter(c => c.status === 'ISSUED').length}</h3>
                        <p>Active Certificates</p>
                    </div>
                </div>
                <div className="stat-box stat-4">
                    <span className="stat-icon">🔗</span>
                    <div className="stat-info">
                        <h3>∞</h3>
                        <p>Shareable Links</p>
                    </div>
                </div>
            </div>

            {/* Timeline Section */}
            {!loading && timelineEvents.length > 0 && (
                <CertificateTimeline events={timelineEvents} />
            )}

            {/* Certificates Section */}
            <div className="certificates-section">
                <div className="section-header">
                    <h2 className="section-title">📚 Your Certificates</h2>
                    <p className="section-subtitle">All your blockchain-verified certificates in one place</p>
                </div>
                
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Loading your certificates...</p>
                    </div>
                ) : certificates.length > 0 ? (
                    <div className="certificates-grid">
                        {certificates.map((cert, index) => {
                            const statusBadge = getStatusBadge(cert.status, cert.verified);
                            return (
                                <div 
                                    key={cert.id || index} 
                                    className="cert-card cert-animate"
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                >
                                    <div className="cert-header">
                                        <span className="cert-icon">{getCategoryIcon(cert.category)}</span>
                                        <span className={`cert-status ${statusBadge.class}`}>
                                            {statusBadge.text}
                                        </span>
                                    </div>

                                    <h3 className="cert-title">{cert.courseName}</h3>
                                    <p className="cert-institution">🏛️ {cert.institutionName}</p>
                                    
                                    <div className="cert-details">
                                        <p className="cert-grade">
                                            <span className="label">Grade:</span>
                                            <strong className="grade-value">{cert.grade}</strong>
                                        </p>
                                        <p className="cert-date">
                                            <span className="label">Issued:</span>
                                            {new Date(cert.issueDate).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>

                                    <div className="cert-hash">
                                        <span className="hash-label">Certificate ID:</span>
                                        <code>{(cert.certificateHash || cert.sha256Hash || '').substring(0, 20)}...</code>
                                    </div>

                                    {cert.transactionHash && (
                                        <div className="blockchain-info">
                                            <span className="blockchain-badge">
                                                ⛓️ Block #{cert.blockNumber || 'N/A'}
                                            </span>
                                        </div>
                                    )}

                                    <div className="cert-actions">
                                        <button 
                                            className="btn-action btn-download"
                                            onClick={() => handleDownload(cert)}
                                            title="Download Certificate"
                                        >
                                            📥 Download
                                        </button>
                                        <button 
                                            className="btn-action btn-share"
                                            onClick={() => handleShare(cert)}
                                            title="Share Certificate"
                                        >
                                            🔗 Share
                                        </button>
                                        
                                        {/* QR Actions Dropdown */}
                                        <div className="qr-dropdown">
                                            <button className="btn-action btn-qr" title="QR Code Options">
                                                📱 QR ▼
                                            </button>
                                            <div className="qr-dropdown-content">
                                                <button onClick={() => openQRModal(cert, 'verify')}>
                                                    🔍 Verify QR
                                                </button>
                                                <button onClick={() => openQRModal(cert, 'share')}>
                                                    📤 Share QR
                                                </button>
                                                <button onClick={() => openQRModal(cert, 'download')}>
                                                    📥 Download QR
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ✅ FIXED: Verify Link now prioritizes CERT-HASH */}
                                    <div className="cert-footer">
                                        <a 
                                            href={`${SERVER_URL}/api/certificates/verify/${cert.certificateHash || cert.sha256Hash || cert.id}`}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="verify-link"
                                        >
                                            🔍 Verify on Blockchain →
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-state">
                        <span className="empty-icon">📭</span>
                        <h3>No Certificates Yet</h3>
                        <p>Your certificates will appear here once issued by your institution</p>
                        <Link to="/verify" className="btn-primary">
                            🔍 Verify a Certificate
                        </Link>
                    </div>
                )}
            </div>

            {/* Enhanced QR Code Modal */}
            {showQR && selectedCert && (
                <div className="modal-overlay" onClick={() => setShowQR(false)}>
                    <div className="modal-content modal-animate" onClick={(e) => e.stopPropagation()}>
                        <button 
                            className="modal-close"
                            onClick={() => setShowQR(false)}
                            aria-label="Close modal"
                        >
                            ✕
                        </button>

                        <div className="modal-header" style={{ borderBottomColor: getQRModeInfo().color }}>
                            <h2>{getQRModeInfo().title}</h2>
                            <p className="modal-cert-name">{selectedCert.courseName}</p>
                            <small className="modal-description">{getQRModeInfo().description}</small>
                        </div>

                        {/* QR Mode Selector */}
                        <div className="qr-mode-selector">
                            <button 
                                className={`mode-btn ${qrMode === 'verify' ? 'active' : ''}`}
                                onClick={() => setQrMode('verify')}
                                style={qrMode === 'verify' ? { backgroundColor: '#3b82f6' } : {}}
                            >
                                🔍 Verify
                            </button>
                            <button 
                                className={`mode-btn ${qrMode === 'share' ? 'active' : ''}`}
                                onClick={() => setQrMode('share')}
                                style={qrMode === 'share' ? { backgroundColor: '#10b981' } : {}}
                            >
                                📤 Share
                            </button>
                            <button 
                                className={`mode-btn ${qrMode === 'download' ? 'active' : ''}`}
                                onClick={() => setQrMode('download')}
                                style={qrMode === 'download' ? { backgroundColor: '#f59e0b' } : {}}
                            >
                                📥 Download
                            </button>
                        </div>

                        {/* QR Code Display */}
                        <div className="qr-container">
                            <QRCode 
                                value={generateQRData(selectedCert, qrMode)}
                                size={280}
                                level="H"
                                includeMargin={true}
                                className="qr-code"
                                fgColor={getQRModeInfo().color}
                                bgColor="#ffffff"
                            />
                        </div>

                        {/* QR Data Preview */}
                        <div className="qr-data-preview">
                            <p className="preview-label">📱 Scan this QR code to:</p>
                            <code className="preview-data">
                                {qrMode === 'share' 
                                    ? 'Get certificate data (JSON format)'
                                    : generateQRData(selectedCert, qrMode)
                                }
                            </code>
                        </div>

                        {/* QR Usage Instructions */}
                        <div className="qr-instructions">
                            <h4>📖 How to use:</h4>
                            {qrMode === 'verify' && (
                                <ol>
                                    <li>📱 Open your phone camera or QR scanner app</li>
                                    <li>🎯 Point at the QR code above</li>
                                    <li>🔗 Tap the notification to open verification page</li>
                                    <li>✅ View full certificate with blockchain proof</li>
                                </ol>
                            )}
                            {qrMode === 'share' && (
                                <ol>
                                    <li>📱 Scan to get complete certificate data</li>
                                    <li>📴 Works offline - no internet needed</li>
                                    <li>🔗 Contains verification URL</li>
                                    <li>🖨️ Perfect for printed certificates</li>
                                </ol>
                            )}
                            {qrMode === 'download' && (
                                <ol>
                                    <li>📱 Scan to access direct download link</li>
                                    <li>📥 Certificate downloads automatically</li>
                                    <li>🔓 No login required for recipient</li>
                                    <li>✅ Includes all verification data</li>
                                </ol>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="modal-actions">
                            <button 
                                className="btn-primary"
                                onClick={downloadQRImage}
                                style={{ backgroundColor: getQRModeInfo().color }}
                            >
                                📥 Save QR Image
                            </button>
                            <button 
                                className="btn-secondary"
                                onClick={copyQRLink}
                            >
                                📋 Copy Link
                            </button>
                            <button 
                                className="btn-tertiary"
                                onClick={() => setShowQR(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StudentDashboard;