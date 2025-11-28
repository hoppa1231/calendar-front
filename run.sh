#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="calendar-front"
API_BASE_URL="${API_BASE:-http://localhost:8000/api/v1}"

echo "Building image ${IMAGE_NAME}..."
docker build -t "${IMAGE_NAME}" .

echo "Running container on http://localhost:8080 (API_BASE=${API_BASE_URL})"
docker run --rm -p 8080:80 -e API_BASE="${API_BASE_URL}" "${IMAGE_NAME}"
