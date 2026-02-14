// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CertificateStore {
    
    struct Certificate {
        string certificateHash;
        string studentCode;
        string courseName;
        uint256 timestamp;
        address issuedBy;
        bool exists;
    }
    
    // Mapping from certificate hash to Certificate
    mapping(string => Certificate) public certificates;
    
    // Array of all certificate hashes
    string[] public allHashes;
    
    // Owner of the contract
    address public owner;
    
    // Events
    event CertificateStored(
        string indexed certificateHash,
        string studentCode,
        string courseName,
        uint256 timestamp,
        address issuedBy
    );
    
    event CertificateVerified(
        string indexed certificateHash,
        bool isValid,
        uint256 timestamp
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    // Store a certificate hash on blockchain
    function storeCertificate(
        string memory _certificateHash,
        string memory _studentCode,
        string memory _courseName
    ) public onlyOwner {
        require(!certificates[_certificateHash].exists, "Certificate already exists");
        
        certificates[_certificateHash] = Certificate({
            certificateHash: _certificateHash,
            studentCode: _studentCode,
            courseName: _courseName,
            timestamp: block.timestamp,
            issuedBy: msg.sender,
            exists: true
        });
        
        allHashes.push(_certificateHash);
        
        emit CertificateStored(
            _certificateHash,
            _studentCode,
            _courseName,
            block.timestamp,
            msg.sender
        );
    }
    
    // Verify a certificate exists on blockchain
    function verifyCertificate(string memory _certificateHash) 
        public 
        view 
        returns (
            bool exists,
            string memory studentCode,
            string memory courseName,
            uint256 timestamp,
            address issuedBy
        ) 
    {
        Certificate memory cert = certificates[_certificateHash];
        return (
            cert.exists,
            cert.studentCode,
            cert.courseName,
            cert.timestamp,
            cert.issuedBy
        );
    }
    
    // Get total certificates stored
    function getTotalCertificates() public view returns (uint256) {
        return allHashes.length;
    }
    
    // Check if certificate exists
    function certificateExists(string memory _certificateHash) 
        public 
        view 
        returns (bool) 
    {
        return certificates[_certificateHash].exists;
    }
}