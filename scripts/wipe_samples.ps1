# LIMS Development Wipe Script
# This script authenticates as an administrator and calls the wipe-samples endpoint.

$BaseUrl = "http://localhost:8080/api"
$LoginUrl = "$BaseUrl/auth/login"
$WipeUrl = "$BaseUrl/dev/wipe-samples"
$PingUrl = "$BaseUrl/dev/ping"

$AdminUser = "admin"
$AdminPass = "admin123" # Replace with your actual admin password

# 1. Connectivity Check (Ping)
echo "Checking backend connectivity..."
try {
    $PingResponse = Invoke-RestMethod -Uri $PingUrl -Method Get
    echo "Backend connectivity OK: Ping -> $PingResponse"
} catch {
    echo "Warning: Could not ping endpoint. Backend might be restarting or the path is still incorrect."
}

# 2. Authenticate to get JWT Token
echo "Logging in as $AdminUser..."
$LoginBody = @{
    username = $AdminUser
    password = $AdminPass
} | ConvertTo-Json

try {
    $LoginResponse = Invoke-RestMethod -Uri $LoginUrl -Method Post -Body $LoginBody -ContentType "application/json"
    $Token = $LoginResponse.token
    echo "Login successful. Received Token."
} catch {
    echo "Failed to login. Please check credentials and ensure the backend is running."
    exit
}

# 3. Call Wipe Endpoint
echo "Executing Sample Wipe..."
$Headers = @{
    Authorization = "Bearer $Token"
    "Content-Type" = "application/json"
}

try {
    $WipeResponse = Invoke-RestMethod -Uri $WipeUrl -Method Post -Headers $Headers
    echo "Success: $WipeResponse"
} catch {
    $ErrorMsg = $_.Exception.Response.GetResponseStream()
    if ($ErrorMsg) {
        $Reader = New-Object System.IO.StreamReader($ErrorMsg)
        $Body = $Reader.ReadToEnd()
        echo "Error: $Body"
    } else {
        echo "Error executing wipe request. Status Code: $($_.Exception.Response.StatusCode)"
    }
}
