// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CertificateNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    // Certificate data structure
    struct CertificateData {
        string studentName;
        string courseName;
        string grade;
        string institutionName;
        string certificateHash;
        uint256 issueDate;
        bool isValid;
    }

    // Mapping from token ID to certificate data
    mapping(uint256 => CertificateData) public certificates;

    // Mapping from certificate hash to token ID
    mapping(string => uint256) public hashToTokenId;

    // Mapping from student address to their token IDs
    mapping(address => uint256[]) private _studentCertificates;

    // Mapping of authorized institutions
    mapping(address => bool) public authorizedInstitutions;

    // Events
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed student,
        string certificateHash,
        string courseName
    );

    event CertificateRevoked(uint256 indexed tokenId, string reason);
    event InstitutionAuthorized(address indexed institution);
    event InstitutionRevoked(address indexed institution);

    constructor() ERC721("CertChain Certificate", "CERT") {
        _tokenIds = 0;
    }

    modifier onlyAuthorizedInstitution() {
        require(
            authorizedInstitutions[msg.sender] || msg.sender == owner(),
            "Not authorized institution"
        );
        _;
    }

    // Authorize an institution to mint certificates
    function authorizeInstitution(address institution) external onlyOwner {
        authorizedInstitutions[institution] = true;
        emit InstitutionAuthorized(institution);
    }

    // Revoke institution authorization
    function revokeInstitution(address institution) external onlyOwner {
        authorizedInstitutions[institution] = false;
        emit InstitutionRevoked(institution);
    }

    // Mint a new certificate NFT
    function mintCertificate(
        address student,
        string memory studentName,
        string memory courseName,
        string memory grade,
        string memory institutionName,
        string memory certificateHash,
        string memory tokenURI_
    ) external onlyAuthorizedInstitution returns (uint256) {
        require(hashToTokenId[certificateHash] == 0, "Certificate already minted");
        require(student != address(0), "Invalid student address");

        _tokenIds++;
        uint256 newTokenId = _tokenIds;

        _safeMint(student, newTokenId);
        _setTokenURI(newTokenId, tokenURI_);

        certificates[newTokenId] = CertificateData({
            studentName: studentName,
            courseName: courseName,
            grade: grade,
            institutionName: institutionName,
            certificateHash: certificateHash,
            issueDate: block.timestamp,
            isValid: true
        });

        hashToTokenId[certificateHash] = newTokenId;
        _studentCertificates[student].push(newTokenId);

        emit CertificateMinted(newTokenId, student, certificateHash, courseName);

        return newTokenId;
    }

    // Revoke a certificate
    function revokeCertificate(uint256 tokenId, string memory reason)
        external
        onlyAuthorizedInstitution
    {
        require(tokenId > 0 && tokenId <= _tokenIds, "Certificate does not exist");
        certificates[tokenId].isValid = false;
        emit CertificateRevoked(tokenId, reason);
    }

    // Verify a certificate
    function verifyCertificate(string memory certificateHash)
        external
        view
        returns (
            bool exists,
            bool isValid,
            string memory studentName,
            string memory courseName,
            string memory grade,
            string memory institutionName,
            uint256 issueDate
        )
    {
        uint256 tokenId = hashToTokenId[certificateHash];
        if (tokenId == 0) {
            return (false, false, "", "", "", "", 0);
        }

        CertificateData memory cert = certificates[tokenId];
        return (
            true,
            cert.isValid,
            cert.studentName,
            cert.courseName,
            cert.grade,
            cert.institutionName,
            cert.issueDate
        );
    }

    // Get certificate data by token ID
    function getCertificate(uint256 tokenId)
        external
        view
        returns (CertificateData memory)
    {
        require(tokenId > 0 && tokenId <= _tokenIds, "Certificate does not exist");
        return certificates[tokenId];
    }

    // Get total certificates minted
    function totalCertificates() external view returns (uint256) {
        return _tokenIds;
    }

    // Get all certificates for a student
    function getStudentCertificates(address student)
        external
        view
        returns (uint256[] memory)
    {
        return _studentCertificates[student];
    }

    // ============================================
    // Required overrides for ERC721 + ERC721URIStorage
    // ============================================

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}