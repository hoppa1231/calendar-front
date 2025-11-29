$ErrorActionPreference = "Stop"

$image = "calendar-front"

Write-Host "Building image $image..."
docker build -t $image .

Write-Host "Running on http://localhost:8080"
docker run --rm -p 8080:80 $image
