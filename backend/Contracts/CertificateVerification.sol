// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CertificateVerification is AccessControl, ReentrancyGuard {
    
    // ============ ROLES ============
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant INSTITUTION_ROLE = keccak256("INSTITUTION_ROLE");
    
    // ============ ENUMS ============
    enum CertStatus { PENDING, ISSUED, VERIFIED, REVOKED, EXPIRED, REISSUED }
    
    // ============ STRUCTURES ============
    
    struct Certificate {
        bytes32 certificateHash;
        string studentCode;        // NEW: Unique student code
        address issuerWallet;
        string courseName;
        string grade;
        uint256 issueDate;
        uint256 expiryDate;
        CertStatus status;
        string ipfsHash;
        string documentHash;
        uint256 verificationCount;
        bool isTampered;
        uint256 createdAt;
        string revocationReason;
    }
    
    struct Institution {
        address walletAddress;
        string name;
        string institutionCode;    // NEW: Unique institution code
        string accreditationId;
        bool isApproved;
        uint256 certificatesIssued;
        uint256 certificatesRevoked;
        uint256 registrationDate;
    }
    
    struct CertificateEvent {
        string action;
        address actor;
        uint256 timestamp;
        string reason;
    }
    
    // ============ STORAGE ============
    
    mapping(bytes32 => Certificate) public certificates;
    mapping(bytes32 => CertificateEvent[]) public certificateHistory;
    mapping(address => Institution) public institutions;
    mapping(address => bool) public approvedInstitutions;
    mapping(string => bytes32[]) public studentCertificates; // studentCode => certificate hashes
    mapping(string => address) public institutionByCode;     // institutionCode => wallet
    
    // Statistics
    uint256 public totalCertificatesIssued;
    uint256 public totalCertificatesVerified;
    uint256 public totalCertificatesRevoked;
    uint256 public totalInstitutions;
    
    // ============ EVENTS ============
    
    event InstitutionRegistered(
        address indexed walletAddress,
        string name,
        string institutionCode,
        uint256 timestamp
    );
    
    event InstitutionApproved(
        address indexed walletAddress,
        string name,
        uint256 timestamp
    );
    
    event InstitutionRejected(
        address indexed walletAddress,
        uint256 timestamp
    );
    
    event CertificateIssued(
        bytes32 indexed certificateHash,
        string studentCode,
        address indexed issuerWallet,
        string courseName,
        uint256 timestamp
    );
    
    event CertificateVerified(
        bytes32 indexed certificateHash,
        address indexed verifier,
        uint256 verificationCount,
        uint256 timestamp
    );
    
    event CertificateRevoked(
        bytes32 indexed certificateHash,
        address indexed revokedBy,
        string reason,
        uint256 timestamp
    );
    
    event TamperDetected(
        bytes32 indexed certificateHash,
        address detector,
        uint256 timestamp
    );
    
    // ============ MODIFIERS ============
    
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "ONLY_ADMIN");
        _;
    }
    
    modifier onlyApprovedInstitution() {
        require(approvedInstitutions[msg.sender], "NOT_APPROVED_INSTITUTION");
        _;
    }
    
    modifier certificateExists(bytes32 _hash) {
        require(certificates[_hash].createdAt != 0, "CERT_NOT_FOUND");
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    // ============ INSTITUTION MANAGEMENT ============
    
    /**
     * @dev Register a new institution (requires MetaMask signature on frontend)
     */
    function registerInstitution(
        string memory _name,
        string memory _institutionCode,
        string memory _accreditationId
    ) external {
        require(bytes(_name).length > 0, "INVALID_NAME");
        require(bytes(_institutionCode).length > 0, "INVALID_CODE");
        require(institutions[msg.sender].registrationDate == 0, "ALREADY_REGISTERED");
        require(institutionByCode[_institutionCode] == address(0), "CODE_TAKEN");
        
        institutions[msg.sender] = Institution({
            walletAddress: msg.sender,
            name: _name,
            institutionCode: _institutionCode,
            accreditationId: _accreditationId,
            isApproved: false,
            certificatesIssued: 0,
            certificatesRevoked: 0,
            registrationDate: block.timestamp
        });
        
        institutionByCode[_institutionCode] = msg.sender;
        totalInstitutions++;
        
        emit InstitutionRegistered(msg.sender, _name, _institutionCode, block.timestamp);
    }
    
    /**
     * @dev Admin approves an institution
     */
    function approveInstitution(address _institution) external onlyAdmin {
        require(institutions[_institution].registrationDate != 0, "NOT_REGISTERED");
        require(!institutions[_institution].isApproved, "ALREADY_APPROVED");
        
        institutions[_institution].isApproved = true;
        approvedInstitutions[_institution] = true;
        _grantRole(INSTITUTION_ROLE, _institution);
        
        emit InstitutionApproved(
            _institution, 
            institutions[_institution].name, 
            block.timestamp
        );
    }
    
    /**
     * @dev Admin rejects an institution
     */
    function rejectInstitution(address _institution) external onlyAdmin {
        require(institutions[_institution].registrationDate != 0, "NOT_REGISTERED");
        
        institutions[_institution].isApproved = false;
        approvedInstitutions[_institution] = false;
        
        emit InstitutionRejected(_institution, block.timestamp);
    }
    
    /**
     * @dev Check if institution is approved
     */
    function isInstitutionApproved(address _institution) external view returns (bool) {
        return approvedInstitutions[_institution];
    }
    
    /**
     * @dev Get institution details
     */
    function getInstitutionDetails(address _institution) external view returns (Institution memory) {
        return institutions[_institution];
    }
    
    // ============ CERTIFICATE ISSUANCE ============
    
    /**
     * @dev Issue a new certificate (only approved institutions)
     */
    function issueCertificate(
        bytes32 _certificateHash,
        string memory _studentCode,
        string memory _courseName,
        string memory _grade,
        uint256 _issueDate,
        uint256 _expiryDate,
        string memory _ipfsHash,
        string memory _documentHash
    )
        external
        onlyApprovedInstitution
        nonReentrant
        returns (bool)
    {
        require(bytes(_studentCode).length > 0, "INVALID_STUDENT_CODE");
        require(_expiryDate > _issueDate, "INVALID_EXPIRY");
        require(certificates[_certificateHash].createdAt == 0, "CERT_EXISTS");
        
        certificates[_certificateHash] = Certificate({
            certificateHash: _certificateHash,
            studentCode: _studentCode,
            issuerWallet: msg.sender,
            courseName: _courseName,
            grade: _grade,
            issueDate: _issueDate,
            expiryDate: _expiryDate,
            status: CertStatus.ISSUED,
            ipfsHash: _ipfsHash,
            documentHash: _documentHash,
            verificationCount: 0,
            isTampered: false,
            createdAt: block.timestamp,
            revocationReason: ""
        });
        
        // Link certificate to student code
        studentCertificates[_studentCode].push(_certificateHash);
        
        // Update institution stats
        institutions[msg.sender].certificatesIssued++;
        totalCertificatesIssued++;
        
        // Add to history
        certificateHistory[_certificateHash].push(CertificateEvent({
            action: "ISSUED",
            actor: msg.sender,
            timestamp: block.timestamp,
            reason: ""
        }));
        
        emit CertificateIssued(
            _certificateHash,
            _studentCode,
            msg.sender,
            _courseName,
            block.timestamp
        );
        
        return true;
    }
    
    // ============ CERTIFICATE VERIFICATION ============
    
    /**
     * @dev Verify a certificate (public - no login required)
     */
    function verifyCertificate(bytes32 _certificateHash)
        external
        certificateExists(_certificateHash)
        nonReentrant
        returns (bool isValid, string memory message)
    {
        Certificate storage cert = certificates[_certificateHash];
        
        // Check if revoked
        if (cert.status == CertStatus.REVOKED) {
            return (false, "CERTIFICATE_REVOKED");
        }
        
        // Check if expired
        if (block.timestamp > cert.expiryDate) {
            if (cert.status != CertStatus.EXPIRED) {
                cert.status = CertStatus.EXPIRED;
            }
            return (false, "CERTIFICATE_EXPIRED");
        }
        
        // Check if tampered
        if (cert.isTampered) {
            return (false, "CERTIFICATE_TAMPERED");
        }
        
        // Update verification count
        cert.verificationCount++;
        totalCertificatesVerified++;
        
        // Add to history
        certificateHistory[_certificateHash].push(CertificateEvent({
            action: "VERIFIED",
            actor: msg.sender,
            timestamp: block.timestamp,
            reason: ""
        }));
        
        emit CertificateVerified(
            _certificateHash, 
            msg.sender, 
            cert.verificationCount, 
            block.timestamp
        );
        
        return (true, "CERTIFICATE_VALID");
    }
    
    /**
     * @dev Check if certificate is valid (view only - no state change)
     */
    function isCertificateValid(bytes32 _certificateHash)
        external
        view
        certificateExists(_certificateHash)
        returns (bool)
    {
        Certificate memory cert = certificates[_certificateHash];
        
        return (
            cert.status != CertStatus.REVOKED &&
            cert.status != CertStatus.EXPIRED &&
            !cert.isTampered &&
            block.timestamp <= cert.expiryDate
        );
    }
    
    // ============ CERTIFICATE RETRIEVAL ============
    
    /**
     * @dev Get certificate details
     */
    function getCertificateDetails(bytes32 _certificateHash)
        external
        view
        certificateExists(_certificateHash)
        returns (Certificate memory)
    {
        return certificates[_certificateHash];
    }
    
    /**
     * @dev Get all certificates for a student code
     */
    function getCertificatesByStudentCode(string memory _studentCode)
        external
        view
        returns (bytes32[] memory)
    {
        return studentCertificates[_studentCode];
    }
    
    /**
     * @dev Get certificate history
     */
    function getCertificateHistory(bytes32 _certificateHash)
        external
        view
        certificateExists(_certificateHash)
        returns (CertificateEvent[] memory)
    {
        return certificateHistory[_certificateHash];
    }
    
    // ============ CERTIFICATE REVOCATION ============
    
    /**
     * @dev Revoke a certificate (only issuer or admin)
     */
    function revokeCertificate(bytes32 _certificateHash, string memory _reason)
        external
        certificateExists(_certificateHash)
        nonReentrant
        returns (bool)
    {
        Certificate storage cert = certificates[_certificateHash];
        
        require(
            cert.issuerWallet == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "NOT_AUTHORIZED"
        );
        require(cert.status != CertStatus.REVOKED, "ALREADY_REVOKED");
        
        cert.status = CertStatus.REVOKED;
        cert.revocationReason = _reason;
        
        // Update stats
        institutions[cert.issuerWallet].certificatesRevoked++;
        totalCertificatesRevoked++;
        
        // Add to history
        certificateHistory[_certificateHash].push(CertificateEvent({
            action: "REVOKED",
            actor: msg.sender,
            timestamp: block.timestamp,
            reason: _reason
        }));
        
        emit CertificateRevoked(_certificateHash, msg.sender, _reason, block.timestamp);
        
        return true;
    }
    
    // ============ TAMPER DETECTION ============
    
    /**
     * @dev Detect if a certificate has been tampered
     */
    function detectTampering(bytes32 _certificateHash, string memory _verifyData)
        external
        certificateExists(_certificateHash)
        returns (bool isTampered)
    {
        bytes32 computedHash = keccak256(abi.encodePacked(_verifyData));
        
        if (computedHash != _certificateHash) {
            certificates[_certificateHash].isTampered = true;
            
            certificateHistory[_certificateHash].push(CertificateEvent({
                action: "TAMPER_DETECTED",
                actor: msg.sender,
                timestamp: block.timestamp,
                reason: "Hash mismatch"
            }));
            
            emit TamperDetected(_certificateHash, msg.sender, block.timestamp);
            return true;
        }
        
        return false;
    }
    
    // ============ STATISTICS ============
    
    /**
     * @dev Get contract statistics
     */
    function getContractStats()
        external
        view
        returns (
            uint256 issued,
            uint256 verified,
            uint256 revoked,
            uint256 institutionCount
        )
    {
        return (
            totalCertificatesIssued,
            totalCertificatesVerified,
            totalCertificatesRevoked,
            totalInstitutions
        );
    }
    
    /**
     * @dev Check certificate expiry
     */
    function checkExpiry(bytes32 _certificateHash)
        external
        view
        certificateExists(_certificateHash)
        returns (bool isExpired, uint256 daysUntilExpiry)
    {
        Certificate memory cert = certificates[_certificateHash];
        
        if (block.timestamp > cert.expiryDate) {
            return (true, 0);
        }
        
        uint256 timeUntilExpiry = cert.expiryDate - block.timestamp;
        uint256 days_ = timeUntilExpiry / 86400;
        
        return (false, days_);
    }
}