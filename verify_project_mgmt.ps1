$ErrorActionPreference = "Stop"

function Invoke-Api {
    param (
        [string]$Uri,
        [string]$Method = "GET",
        [hashtable]$Body = @{},
        [string]$Token
    )

    $Headers = @{ "Content-Type" = "application/json" }
    if ($Token) {
        $Headers["Authorization"] = "Bearer $Token"
    }

    $JsonBody = $Body | ConvertTo-Json -Depth 10
    
    try {
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri "http://localhost:8080$Uri" -Method $Method -Headers $Headers
        } else {
            $response = Invoke-RestMethod -Uri "http://localhost:8080$Uri" -Method $Method -Body $JsonBody -Headers $Headers
        }
        return $response
    } catch {
        $ex = $_.Exception
        Write-Host "API Call Failed: $Uri ($Method)" -ForegroundColor Red
        if ($ex.Response) {
             try {
                $reader = New-Object System.IO.StreamReader($ex.Response.GetResponseStream())
                $body = $reader.ReadToEnd()
                Write-Host "Status: $($ex.Response.StatusCode)" -ForegroundColor Red
                Write-Host "Body: $body" -ForegroundColor Red
             } catch {
                Write-Host "Could not read response body." -ForegroundColor Red
             }
        } else {
             Write-Host "Error: $_" -ForegroundColor Red
        }
        exit 1
    }
}

# 1. Login
Write-Host "Logging in as admin..."
$loginResponse = Invoke-Api -Uri "/api/auth/login" -Method "POST" -Body @{ username = "admin"; password = "password" }
$token = $loginResponse.token
Write-Host "Login successful. Token acquired."

# 2. Create Client
Write-Host "Creating Client..."
$client = Invoke-Api -Uri "/api/lookup/clients" -Method "POST" -Token $token -Body @{
    name = "ACME Corp"
    code = "ACME"
    active = $true
}
Write-Host "Client created: $($client.name) (ID: $($client.id))"

# 3. Create Project
Write-Host "Creating Project..."
$project = Invoke-Api -Uri "/api/projects" -Method "POST" -Token $token -Body @{
    projectNumber = "P-2023-VERIFY"
    name = "Verification Project"
    clientId = $client.id
    location = "Test Site"
    active = $true
}
Write-Host "Project created: $($project.projectNumber) - $($project.name) (ID: $($project.id))"

# 4. Verify Project List
Write-Host "Verifying Project List..."
$projects = Invoke-Api -Uri "/api/projects" -Method "GET" -Token $token
$foundProject = $projects | Where-Object { $_.id -eq $project.id }
if ($foundProject) {
    Write-Host "Project found in list."
} else {
    Write-Error "Project NOT found in list!"
}

# 5. Create Product (Needed for Sample)
Write-Host "Creating Product..."
$product = Invoke-Api -Uri "/api/lookup/products" -Method "POST" -Token $token -Body @{
    name = "Water"
    code = "WATER"
    active = $true
}
Write-Host "Product created: $($product.name) (ID: $($product.id))"

# 6. Register Job
Write-Host "Registering Job..."
$job = Invoke-Api -Uri "/api/samples" -Method "POST" -Token $token -Body @{
    clientId = $client.id
    projectId = $project.id
    priority = "NORMAL"
    samples = @(
        @{
            productId = $product.id
            description = "Test Sample"
        }
    )
}
Write-Host "Job Registered: $($job.jobNumber)"
Write-Host "Linked Project: $($job.projectName) (ID: $($job.projectId))"

if ($job.projectId -eq $project.id) {
    Write-Host "VERIFICATION SUCCESS: Job is correctly linked to Project."
} else {
    Write-Error "VERIFICATION FAILED: Job is NOT linked to Project."
}
