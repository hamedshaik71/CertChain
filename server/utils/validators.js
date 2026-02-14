/**
 * Validate email format (institutional emails)
 */
const validateEmail = (email) => {
    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;

    // In development, allow all emails
    if (process.env.NODE_ENV === 'development') {
        return true;
    }

    // Institutional domain check
    const institutionalPatterns = [
        /\.edu$/i,
        /\.edu\./i,
        /\.ac\./i,
        /\.org$/i,
        /\.org\./i,
        /\.university/i,
        /\.college/i,
        /\.school/i,
        /\.institute/i,
        /\.gov$/i,
        /\.gov\./i,
    ];

    const domain = email.split('@')[1];
    return institutionalPatterns.some(pattern => pattern.test(domain));
};

/**
 * Validate password strength
 * - Minimum 12 characters
 * - At least one uppercase, lowercase, number, special char
 */
const validatePassword = (password) => {
    const errors = [];

    if (!password || password.length < 12) {
        errors.push('Minimum 12 characters required');
    }

    if (!/[A-Z]/.test(password)) {
        errors.push('At least one uppercase letter required');
    }

    if (!/[a-z]/.test(password)) {
        errors.push('At least one lowercase letter required');
    }

    if (!/[0-9]/.test(password)) {
        errors.push('At least one number required');
    }

    if (!/[!@#$%^&*]/.test(password)) {
        errors.push('At least one special character (!@#$%^&*) required');
    }

    return {
        valid: errors.length === 0,
        message: errors.length > 0 ? errors.join(', ') : 'Password is strong',
        errors
    };
};

/**
 * Validate accreditation ID format
 */
const validateAccreditationId = (id) => {
    const patterns = [
        /^AICTE[0-9]{5}$/,
        /^UGC[0-9]{7}$/,
        /^[A-Z]{2,4}[0-9]{5,7}$/
    ];

    return patterns.some(pattern => pattern.test(id));
};

module.exports = {
    validateEmail,
    validatePassword,
    validateAccreditationId
};