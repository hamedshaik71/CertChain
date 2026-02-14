/**
 * Parse user agent string into browser, OS, device type
 */
const parseUserAgent = (userAgent) => {
    if (!userAgent) {
        return { browser: 'Unknown', os: 'Unknown', deviceType: 'unknown' };
    }

    const ua = userAgent.toLowerCase();

    // Browser detection
    let browser = 'Unknown';
    if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    // OS detection
    let os = 'Unknown';
    if (ua.includes('win')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    // Device type detection
    let deviceType = 'desktop';
    if (ua.includes('mobile') || ua.includes('android')) deviceType = 'mobile';
    else if (ua.includes('tablet') || ua.includes('ipad')) deviceType = 'tablet';

    return { browser, os, deviceType };
};

module.exports = {
    parseUserAgent
};