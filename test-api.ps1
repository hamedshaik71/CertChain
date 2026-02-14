# test-api.ps1
Write-Host "🚀 Testing Certificate System API" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

$baseURL = "http://localhost:5000/api"

# Test 1: Check Server Health
Write-Host "`n📍 Test 1: Checking server..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseURL/health" -Method GET
    Write-Host "✅ Server is running!" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ Server not running! Start it first." -ForegroundColor Red
    Write-Host "   Run: node server.js" -ForegroundColor Yellow
    exit
}

# Test 2: Register Institution
Write-Host "`n📍 Test 2: Registering institution..." -ForegroundColor Yellow
$randomNum = Get-Random -Maximum 9999
$instBody = @{
    name = "PowerShell Test University"
    email = "ps-test$randomNum@university.edu"
    password = "Test@123456"
    phone = "+1234567890"
    address = "123 Test Street"
    website = "www.test.edu"
    accreditationId = "ACC$randomNum"
} | ConvertTo-Json

try {
    $instResponse = Invoke-RestMethod -Uri "$baseURL/institution/register" `
        -Method POST `
        -Body $instBody `
        -ContentType "application/json"
    
    Write-Host "✅ Institution registered!" -ForegroundColor Green
    Write-Host "   Code: $($instResponse.institutionCode)" -ForegroundColor Cyan
    $global:institutionCode = $instResponse.institutionCode
    $global:institutionEmail = $instResponse.institution.email
} catch {
    Write-Host "❌ Registration failed: $_" -ForegroundColor Red
}

# Test 3: Admin Login
Write-Host "`n📍 Test 3: Admin login..." -ForegroundColor Yellow
$adminBody = @{
    email = "admin1@certchain.io"
    secretCode = "CHAIN_ADMIN_001_7F9E2B4C8D1A5F6E"
    mnemonic12Words = "abandon ability able about above absent absorb abstract academy accept accident account"
} | ConvertTo-Json

try {
    $adminResponse = Invoke-RestMethod -Uri "$baseURL/admin/login" `
        -Method POST `
        -Body $adminBody `
        -ContentType "application/json"
    
    Write-Host "✅ Admin logged in!" -ForegroundColor Green
    $global:adminToken = $adminResponse.token
} catch {
    Write-Host "❌ Admin login failed: $_" -ForegroundColor Red
}

# Test 4: Approve Institution
Write-Host "`n📍 Test 4: Getting institutions..." -ForegroundColor Yellow
$headers = @{ Authorization = "Bearer $global:adminToken" }

try {
    $institutions = Invoke-RestMethod -Uri "$baseURL/admin/institutions" `
        -Method GET `
        -Headers $headers
    
    Write-Host "✅ Found $($institutions.total) institutions" -ForegroundColor Green
    
    if ($institutions.institutions.Count -gt 0) {
        $latestInst = $institutions.institutions[0]
        Write-Host "   Approving: $($latestInst.name)" -ForegroundColor Cyan
        
        $approveResponse = Invoke-RestMethod `
            -Uri "$baseURL/admin/approve-institution/$($latestInst._id)" `
            -Method POST `
            -Headers $headers
        
        Write-Host "✅ Institution approved!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Could not approve: $_" -ForegroundColor Yellow
}

# Test 5: Institution Login
Write-Host "`n📍 Test 5: Institution login..." -ForegroundColor Yellow
$instLoginBody = @{
    email = $global:institutionEmail
    password = "Test@123456"
} | ConvertTo-Json

try {
    $instLoginResponse = Invoke-RestMethod -Uri "$baseURL/institution/login" `
        -Method POST `
        -Body $instLoginBody `
        -ContentType "application/json"
    
    Write-Host "✅ Institution logged in!" -ForegroundColor Green
    $global:instToken = $instLoginResponse.token
} catch {
    Write-Host "⚠️ Institution login failed (might need approval first)" -ForegroundColor Yellow
}

# Test 6: Register Student
Write-Host "`n📍 Test 6: Registering student..." -ForegroundColor Yellow
$studentNum = Get-Random -Maximum 9999
$studentBody = @{
    email = "student$studentNum@test.com"
    fullName = "Test Student"
    password = "Student@123"
    institutionCode = $global:institutionCode
} | ConvertTo-Json

try {
    $studentResponse = Invoke-RestMethod -Uri "$baseURL/student/register" `
        -Method POST `
        -Body $studentBody `
        -ContentType "application/json"
    
    Write-Host "✅ Student registered!" -ForegroundColor Green
    Write-Host "   Code: $($studentResponse.studentCode)" -ForegroundColor Cyan
    $global:studentCode = $studentResponse.studentCode
} catch {
    Write-Host "❌ Student registration failed: $_" -ForegroundColor Red
}

# Test 7: Issue Certificate
Write-Host "`n📍 Test 7: Issuing certificate..." -ForegroundColor Yellow
$certBody = @{
    studentCode = $global:studentCode
    courseName = "Blockchain Development"
    grade = "A+"
    issueDate = (Get-Date).ToString("yyyy-MM-dd")
    category = "COURSE"
} | ConvertTo-Json

$instHeaders = @{ 
    Authorization = "Bearer $global:instToken"
}

try {
    $certResponse = Invoke-RestMethod -Uri "$baseURL/certificate/issue" `
        -Method POST `
        -Body $certBody `
        -Headers $instHeaders `
        -ContentType "application/json"
    
    Write-Host "`n🎉 CERTIFICATE ISSUED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    
    if ($certResponse.certificate.pdfUrl) {
        Write-Host "📄 PDF URL:" -ForegroundColor Yellow
        Write-Host "   $($certResponse.certificate.pdfUrl)" -ForegroundColor Cyan
        
        Write-Host "`n🔗 QR Verification URL:" -ForegroundColor Yellow
        Write-Host "   $($certResponse.certificate.qrCodeURL)" -ForegroundColor Cyan
        
        Write-Host "`n🔐 Certificate Hash:" -ForegroundColor Yellow
        Write-Host "   $($certResponse.certificate.certificateHash)" -ForegroundColor Cyan
        
        # Ask to open PDF
        Write-Host "`n📂 Want to open the certificate PDF? (Y/N)" -ForegroundColor Yellow
        $openPDF = Read-Host
        if ($openPDF -eq 'Y' -or $openPDF -eq 'y') {
            Start-Process $certResponse.certificate.pdfUrl
        }
    } else {
        Write-Host "⚠️ Certificate created but PDF URL not received" -ForegroundColor Yellow
        $certResponse | ConvertTo-Json
    }
} catch {
    Write-Host "❌ Certificate issue failed: $_" -ForegroundColor Red
    Write-Host "Make sure institution is approved first!" -ForegroundColor Yellow
}

Write-Host "`n✅ Test complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green