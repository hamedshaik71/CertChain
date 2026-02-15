// frontend/src/components/Institution/IssueCertificate.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const IssueCertificate = ({ user, token, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [issuedCertificate, setIssuedCertificate] = useState(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    studentCode: '',
    courseName: '',
    grade: '',
    issueDate: new Date().toISOString().split('T')[0],
    category: 'COURSE',
    expiryDate: ''
  });

  // Fetch students on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      console.log("🔍 Fetching students...");
      const response = await axios.get('https://certchain-api.onrender.com/api/institution/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log("✅ Students fetched:", response.data);
      
      if (response.data.success) {
        setStudents(response.data.students || []);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      // Don't block the UI, user can still type manually if fetch fails
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIssuedCertificate(null);

    try {
      console.log('📤 Preparing submission...');

      // 🚨 FIX: Use FormData because backend uses Multer
      const submissionData = new FormData();
      submissionData.append('studentCode', formData.studentCode);
      submissionData.append('courseName', formData.courseName);
      submissionData.append('grade', formData.grade);
      submissionData.append('issueDate', formData.issueDate);
      submissionData.append('category', formData.category);
      
      if (formData.expiryDate) {
        submissionData.append('expiryDate', formData.expiryDate);
      }

      console.log('🚀 Sending FormData to server...');

      const response = await axios.post(
        'https://certchain-api.onrender.com/api/certificate/issue',
        submissionData,
        {
          headers: {
            // Let Axios set the Content-Type to multipart/form-data automatically
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('✅ Certificate response:', response.data);

      if (response.data.success) {
        setIssuedCertificate(response.data.certificate);
      } else {
        setError(response.data.message || 'Failed to issue certificate');
      }

    } catch (err) {
      console.error('❌ Certificate error:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIssuedCertificate(null);
    setFormData({
      studentCode: '',
      courseName: '',
      grade: '',
      issueDate: new Date().toISOString().split('T')[0],
      category: 'COURSE',
      expiryDate: ''
    });
    setError('');
  };

  // SUCCESS VIEW
  if (issuedCertificate) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 shadow-lg">
          {/* Success Header */}
          <div className="flex items-center justify-center mb-6">
            <div className="bg-green-100 rounded-full p-4">
              <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-green-800 text-center mb-2">
            🎉 Certificate Issued Successfully!
          </h2>
          <p className="text-green-600 text-center mb-6">
            The certificate has been generated and is pending approval.
          </p>

          {/* Certificate Details */}
          <div className="bg-white rounded-lg p-5 mb-6 shadow">
            <h3 className="font-bold text-lg text-gray-800 mb-4 border-b pb-2">
              📋 Certificate Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Student Name</p>
                <p className="font-semibold">{issuedCertificate.studentName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Student Code</p>
                <p className="font-semibold">{issuedCertificate.studentCode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Course</p>
                <p className="font-semibold">{issuedCertificate.courseName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Grade</p>
                <p className="font-semibold text-xl">{issuedCertificate.grade}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-semibold text-yellow-600">
                  ⏳ {issuedCertificate.status?.replace(/_/g, ' ') || 'Pending'}
                </p>
              </div>
            </div>

            {/* Hash Display */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500 mb-1">Blockchain Hash</p>
              <div className="bg-gray-100 p-2 rounded font-mono text-xs break-all text-gray-600">
                {issuedCertificate.certificateHash}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {issuedCertificate.pdfUrl && (
              <a
                href={issuedCertificate.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition text-center font-medium shadow"
              >
                📄 Download PDF
              </a>
            )}
            
            <button
              onClick={resetForm}
              className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-medium shadow"
            >
              ➕ Issue Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FORM VIEW
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <span className="mr-3">📜</span>
          Issue New Certificate
        </h2>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Student Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Code *
            </label>
            {students.length > 0 ? (
              <select
                name="studentCode"
                value={formData.studentCode}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">-- Select Student --</option>
                {students.map(student => (
                  <option key={student._id || student.studentCode} value={student.studentCode}>
                    {student.studentCode} - {student.fullName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="studentCode"
                value={formData.studentCode}
                onChange={handleChange}
                required
                placeholder="Enter student code (e.g., STU-123456)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
            {students.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                    No registered students found. You can enter the code manually.
                </p>
            )}
          </div>

          {/* Course Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Name *
            </label>
            <input
              type="text"
              name="courseName"
              value={formData.courseName}
              onChange={handleChange}
              required
              placeholder="e.g., Blockchain Development"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade *
            </label>
            <select
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">-- Select Grade --</option>
              <option value="A+">A+ (Excellent)</option>
              <option value="A">A (Very Good)</option>
              <option value="A-">A-</option>
              <option value="B+">B+ (Good)</option>
              <option value="B">B (Above Average)</option>
              <option value="B-">B-</option>
              <option value="C+">C+ (Average)</option>
              <option value="C">C (Pass)</option>
              <option value="D">D</option>
              <option value="Pass">Pass</option>
              <option value="Distinction">Distinction</option>
              <option value="First Class">First Class</option>
              <option value="Second Class">Second Class</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="COURSE">Course</option>
              <option value="DEGREE">Degree</option>
              <option value="DIPLOMA">Diploma</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="CERTIFICATION">Certification</option>
              <option value="TRAINING">Training</option>
              <option value="ACHIEVEMENT">Achievement</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Issue Date */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Date *
                </label>
                <input
                type="date"
                name="issueDate"
                value={formData.issueDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* Expiry Date (Optional) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiry Date
                </label>
                <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-6 rounded-lg font-medium text-white transition-all mt-4 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              '🎓 Issue Certificate'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default IssueCertificate;