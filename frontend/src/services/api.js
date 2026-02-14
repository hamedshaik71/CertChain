// ============ API SERVICE ============
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        
        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
            mode: 'cors',
            credentials: 'include',
        };

        if (options.body) {
            if (typeof options.body === 'string') {
                config.body = options.body;
            } else {
                config.body = JSON.stringify(options.body);
            }
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);
            const text = await response.text();
            
            if (!text || text.trim() === '') {
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }
                return { success: true };
            }
            
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                throw new Error('Invalid JSON response from server');
            }

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Request failed');
            }

            return data;
            
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error.message);
            throw error;
        }
    },

    async healthCheck() {
        return this.request('/api/health');
    },

    async loginStudent(data) {
        return this.request('/api/student/login', { method: 'POST', body: data });
    },

    async registerStudent(data) {
        return this.request('/api/student/register', { method: 'POST', body: data });
    },

    async getStudentCertificates(studentCode) {
        return this.request('/api/student/certificates', { method: 'POST', body: { studentCode } });
    },

    async getStudentProfile() {
        return this.request('/api/student/profile');
    },

    async loginInstitution(data) {
        return this.request('/api/institution/login', { method: 'POST', body: data });
    },

    async registerInstitution(formData) {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(`${API_URL}/api/institution/register`, {
                method: 'POST',
                headers: { ...(token && { Authorization: `Bearer ${token}` }) },
                body: formData,
                mode: 'cors',
                credentials: 'include',
            });
            
            const text = await response.text();
            if (!text || text.trim() === '') {
                if (!response.ok) throw new Error('Registration failed');
                return { success: true };
            }
            
            const data = JSON.parse(text);
            if (!response.ok) throw new Error(data.message || data.error || 'Registration failed');
            return data;
            
        } catch (error) {
            console.error('Institution registration error:', error);
            throw error;
        }
    },

    async forgotPassword(email) {
        return this.request('/api/institution/forgot-password', { method: 'POST', body: { email } });
    },

    async getInstitutionDashboard() {
        return this.request('/api/institution/dashboard');
    },

    async getInstitutionStudents() {
        return this.request('/api/institution/students');
    },

    async addStudent(data) {
        return this.request('/api/student/register', { method: 'POST', body: data });
    },

    async issueCertificate(formData) {
        const token = localStorage.getItem('token');
        
        try {
            const response = await fetch(`${API_URL}/api/certificate/issue`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
                mode: 'cors',
                credentials: 'include',
            });
            
            const text = await response.text();
            if (!text || text.trim() === '') {
                if (!response.ok) throw new Error('Certificate issuance failed');
                return { success: true };
            }
            
            const data = JSON.parse(text);
            if (!response.ok) throw new Error(data.message || data.error || 'Failed');
            return data;
            
        } catch (error) {
            console.error('Certificate issuance error:', error);
            throw error;
        }
    },

    async verifyCertificate(hash) {
        return this.request(`/api/public/verify/${hash}`);
    },

    async revokeCertificate(certificateHash, reason) {
        return this.request('/api/certificate/revoke', { method: 'POST', body: { certificateHash, reason } });
    },

    async loginAdmin(credentials) {
        return this.request('/api/admin/login', { method: 'POST', body: credentials });
    },

    async getAdminStats() {
        return this.request('/api/admin/stats');
    },

    async getAdminInstitutions() {
        return this.request('/api/admin/institutions');
    },

    async approveInstitution(id) {
        return this.request(`/api/admin/approve-institution/${id}`, { method: 'POST' });
    },

    async rejectInstitution(id, reason) {
        return this.request(`/api/admin/reject-institution/${id}`, { method: 'POST', body: { reason } });
    },

    async getPendingApprovals() {
        return this.request('/api/admin/pending-approvals');
    },

    async processCertificate(certificateId, action, comments) {
        return this.request('/api/admin/process-certificate', { method: 'POST', body: { certificateId, action, comments } });
    },
};

export default api;