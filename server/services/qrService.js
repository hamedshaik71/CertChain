const QRCode = require('qrcode');
const crypto = require('crypto');

class QRService {
    constructor() {
        // 🔒 HARDCODED URLs to match your exact setup
        // This ensures generated links always go to the right port
        this.baseURL = 'http://localhost:5000';      // Backend (API)
        this.frontendURL = 'http://localhost:3000';  // Frontend (View)
    }

    // Generate all necessary action URLs for a certificate
    generateActionURLs(certificateIdentifier) {
        const timestamp = Date.now();
        
        // Ensure identifier is a string
        const id = String(certificateIdentifier);

        // ✅ URL STRUCTURE MATCHING YOUR ROUTES
        return {
            // Frontend View Page (The one user sees)
            view: `${this.frontendURL}/verify/${id}`,
            
            // Backend Verification API (The one verifying the hash)
            verify: `${this.baseURL}/api/certificates/verify/${id}`,
            
            // Backend Download API
            download: `${this.baseURL}/api/certificates/download/${id}`,
            
            // Frontend Share Page (Same as view)
            share: `${this.frontendURL}/verify/${id}`, 
            
            // LinkedIn Add-to-Profile
            linkedIn: `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=Certificate&certUrl=${encodeURIComponent(`${this.frontendURL}/verify/${id}`)}`,
            
            // Deep link for mobile app (Optional, good for future)
            mobileApp: `certchain://verify/${id}`
        };
    }

    // Generate signature for secure actions (Optional)
    generateSignature(id, timestamp) {
        const secret = process.env.QR_SECRET || 'qr-secret-key';
        return crypto
            .createHmac('sha256', secret)
            .update(`${id}:${timestamp}`)
            .digest('hex')
            .substring(0, 16);
    }

    // Verify signature (Optional)
    verifySignature(id, timestamp, signature) {
        const expectedSignature = this.generateSignature(id, timestamp);
        return signature === expectedSignature;
    }

    // Generate Smart QR Code with embedded actions
    async generateSmartQR(certificateIdentifier, options = {}) {
        try {
            // 1. Get the Correct URLs using the identifier (CERT-... or ID)
            const actions = this.generateActionURLs(certificateIdentifier);
            
            // 2. Create QR Data Payload (For "Share Mode" JSON or Apps)
            const qrData = {
                type: 'CERTCHAIN_CERTIFICATE',
                version: '2.0',
                id: certificateIdentifier,
                urls: actions,
                timestamp: Date.now()
            };

            // 3. Determine what the QR Code actually "scans" as
            // Default: It scans as the Verification Link (Clickable)
            // If mode is 'json', it scans as raw JSON data
            const qrScanContent = options.mode === 'json' 
                ? JSON.stringify(qrData) 
                : actions.view; 

            // 4. Generate QR Code Image (Base64)
            const qrCodeDataURL = await QRCode.toDataURL(qrScanContent, {
                width: options.width || 300,
                margin: options.margin || 2,
                color: {
                    dark: options.darkColor || '#000000',
                    light: options.lightColor || '#ffffff'
                },
                errorCorrectionLevel: 'H' // High for Logo support
            });

            // 5. Generate Buffer (for PDF generation or file saves)
            const qrCodeBuffer = await QRCode.toBuffer(qrScanContent, {
                width: options.width || 300,
                margin: options.margin || 2,
                errorCorrectionLevel: 'H'
            });

            return {
                success: true,
                qrCodeDataURL,
                qrCodeBuffer,
                actions,
                data: qrData
            };

        } catch (error) {
            console.error('QR Generation Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Generate QR with custom design (Colors/Styles)
    async generateStyledQR(certificateIdentifier, style = 'default') {
        const styles = {
            default: { darkColor: '#000000', lightColor: '#ffffff' },
            blue: { darkColor: '#1e40af', lightColor: '#dbeafe' },
            green: { darkColor: '#166534', lightColor: '#dcfce7' },
            purple: { darkColor: '#7c3aed', lightColor: '#f3e8ff' },
            gold: { darkColor: '#92400e', lightColor: '#fef3c7' }
        };

        const selectedStyle = styles[style] || styles.default;
        return this.generateSmartQR(certificateIdentifier, selectedStyle);
    }
}

module.exports = new QRService();