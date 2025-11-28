#!/usr/bin/env sh
set -e

API_BASE_VALUE=${API_BASE:-/api/v1}
echo "window.__API_BASE__ = \"${API_BASE_VALUE}\";" > /usr/share/nginx/html/config.js

exec nginx -g 'daemon off;'
