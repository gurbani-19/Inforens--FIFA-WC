# verify_workflow.ps1
# Automates registering a user, submitting outcome predictions (win/draw), resolving matches as admin, checking draw prediction support, reprocessing, and leaderboard standings updates.

$apiBase = "http://localhost:5000/api"

Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
Write-Host "Inforens FIFA Predictor 2026 - Programmatic Verification" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan

# 1. Register a new verification user
Write-Host "[1/6] Registering user 'verify_user'..." -ForegroundColor Yellow
$regBody = @{
    username = "verify_user"
    email = "verify_user@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $regRes = Invoke-RestMethod -Uri "$apiBase/auth/register" -Method Post -Body $regBody -ContentType "application/json"
    $userToken = $regRes.token
    $userId = $regRes.user.id
    Write-Host "Successfully registered user! Token retrieved." -ForegroundColor Green
} catch {
    Write-Host "Registration failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Response details: $($reader.ReadToEnd())" -ForegroundColor Red
    }
    exit 1
}

# 2. Check active matches
Write-Host "`n[2/6] Querying matches..." -ForegroundColor Yellow
$matches = Invoke-RestMethod -Uri "$apiBase/matches" -Method Get
Write-Host "Found $($matches.Count) matches in database." -ForegroundColor Green
foreach ($m in $matches) {
    Write-Host "Match ID $($m.id): $($m.teamA) vs $($m.teamB) | Status: $($m.status) | Kickoff: $($m.kickoffTime)" -ForegroundColor Gray
}

# Match 7: Germany vs Curaçao (predict Draw)
# Match 8: Netherlands vs Japan (predict Japan win - teamB)
$matchId1 = 7
$matchId2 = 8

# 3. Submit predictions as verify_user
Write-Host "`n[3/6] Submitting winner predictions (Draw for France vs Germany, Team B for England vs Brazil)..." -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $userToken"
}

# Prediction 1: Draw
$predBody1 = @{
    matchId = $matchId1
    predictedWinner = "draw"
} | ConvertTo-Json

$predRes1 = Invoke-RestMethod -Uri "$apiBase/predictions" -Method Post -Body $predBody1 -ContentType "application/json" -Headers $headers
Write-Host "France vs Germany prediction (Draw) submitted! ID: $($predRes1.id)" -ForegroundColor Green

# Prediction 2: Brazil Win (teamB)
$predBody2 = @{
    matchId = $matchId2
    predictedWinner = "teamB"
} | ConvertTo-Json

$predRes2 = Invoke-RestMethod -Uri "$apiBase/predictions" -Method Post -Body $predBody2 -ContentType "application/json" -Headers $headers
Write-Host "England vs Brazil prediction (Team B) submitted! ID: $($predRes2.id)" -ForegroundColor Green

# 4. Log in as admin
Write-Host "`n[4/6] Logging in as Admin..." -ForegroundColor Yellow
$adminLoginBody = @{
    email = "admin@inforens.com"
    password = "admin123"
} | ConvertTo-Json

$adminLoginRes = Invoke-RestMethod -Uri "$apiBase/auth/login" -Method Post -Body $adminLoginBody -ContentType "application/json"
$adminToken = $adminLoginRes.token
Write-Host "Successfully logged in as admin." -ForegroundColor Green

# 5. Resolve matches as Admin
Write-Host "`n[5/6] Resolving match France vs Germany as completed with score 2-2 (Draw)..." -ForegroundColor Yellow
$adminHeaders = @{
    Authorization = "Bearer $adminToken"
}

$resolveBody1 = @{
    teamAGoals = 2
    teamBGoals = 2
} | ConvertTo-Json

$resolveRes1 = Invoke-RestMethod -Uri "$apiBase/admin/matches/$matchId1/result" -Method Post -Body $resolveBody1 -ContentType "application/json" -Headers $adminHeaders
Write-Host "Match France vs Germany resolved successfully." -ForegroundColor Green

Write-Host "Resolving match England vs Brazil as completed with score 1-3 (Brazil Win)..." -ForegroundColor Yellow
$resolveBody2 = @{
    teamAGoals = 1
    teamBGoals = 3
} | ConvertTo-Json

$resolveRes2 = Invoke-RestMethod -Uri "$apiBase/admin/matches/$matchId2/result" -Method Post -Body $resolveBody2 -ContentType "application/json" -Headers $adminHeaders
Write-Host "Match England vs Brazil resolved successfully." -ForegroundColor Green

# 6. Verify score updates for verify_user
Write-Host "`n[6/6] Fetching verify_user profile and details..." -ForegroundColor Yellow
$profile = Invoke-RestMethod -Uri "$apiBase/auth/me" -Method Get -Headers $headers

Write-Host "--- Scoring Verification Results ---" -ForegroundColor Cyan
Write-Host "Username: $($profile.username)" -ForegroundColor White
Write-Host "Points: $($profile.points) (Expected: 2 - 1 point per correct prediction)" -ForegroundColor White
Write-Host "Rank: $($profile.rank)" -ForegroundColor White
Write-Host "Streak: $($profile.activeStreak) (Expected: 2)" -ForegroundColor White
Write-Host "Correct Picks: $($profile.correctPredictions) (Expected: 2)" -ForegroundColor White
Write-Host "Accuracy: $($profile.predictionAccuracy)% (Expected: 100%)" -ForegroundColor White

if ($profile.points -eq 2) {
    Write-Host "Outcome-only points and draw predictions verified successfully!" -ForegroundColor Green
} else {
    Write-Host "Scoring mismatch. Points: $($profile.points)" -ForegroundColor Red
}

# Test Reprocessing Result (England vs Brazil from 1-3 to 2-0 England Win)
Write-Host "`n[TEST] Testing retroactive reprocessing/correction tool..." -ForegroundColor Yellow
Write-Host "Changing England vs Brazil result to 2-0 (England Win - teamA)..." -ForegroundColor Yellow
$reprocessBody = @{
    teamAGoals = 2
    teamBGoals = 0
} | ConvertTo-Json

$reprocessRes = Invoke-RestMethod -Uri "$apiBase/admin/matches/$matchId2/reprocess" -Method Post -Body $reprocessBody -ContentType "application/json" -Headers $adminHeaders
Write-Host "Reprocess completed. Message: $($reprocessRes.message)" -ForegroundColor Green

# Fetch updated profile
$updatedProfile = Invoke-RestMethod -Uri "$apiBase/auth/me" -Method Get -Headers $headers
Write-Host "--- Updated Scoring Results After Reprocessing ---" -ForegroundColor Cyan
Write-Host "Points: $($updatedProfile.points) (Expected: 1 - France vs Germany draw remains correct, England vs Brazil is now incorrect)" -ForegroundColor White
Write-Host "Streak: $($updatedProfile.activeStreak) (Expected: 1)" -ForegroundColor White
Write-Host "Correct Picks: $($updatedProfile.correctPredictions) (Expected: 1)" -ForegroundColor White
Write-Host "Accuracy: $($updatedProfile.predictionAccuracy)% (Expected: 50%)" -ForegroundColor White

if ($updatedProfile.points -eq 1 -and $updatedProfile.activeStreak -eq 1) {
    Write-Host "Result reprocessing, streak re-calculation, and correctness updates verified successfully!" -ForegroundColor Green
} else {
    Write-Host "Reprocessing logic check failed." -ForegroundColor Red
}

# Fetch notifications
$notifications = Invoke-RestMethod -Uri "$apiBase/notifications" -Method Get -Headers $headers
Write-Host "`n--- Notifications Log ---" -ForegroundColor Cyan
foreach ($n in $notifications) {
    Write-Host "[$($n.type)] $($n.message)" -ForegroundColor Gray
}

# Export Leaderboard CSV
Write-Host "`nExporting Leaderboard CSV..." -ForegroundColor Yellow
$csvRes = Invoke-RestMethod -Uri "$apiBase/admin/leaderboard/export" -Method Get -Headers $adminHeaders
Write-Host "CSV content length: $($csvRes.Length) characters" -ForegroundColor Green
Write-Host "CSV sample data:" -ForegroundColor Gray
Write-Host $csvRes -ForegroundColor Gray
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
