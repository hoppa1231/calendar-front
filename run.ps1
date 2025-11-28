$ErrorActionPreference = "Stop"

$image = "calendar-front"
$apiBase = $env:API_BASE
if (-not $apiBase) { $apiBase = "http://localhost:8000/api/v1" }

Write-Host "Building image $image..."
docker build -t $image .

Write-Host "Running on http://localhost:8080 (API_BASE=$apiBase)"
docker run --rm -p 8080:80 -e API_BASE=$apiBase $image
