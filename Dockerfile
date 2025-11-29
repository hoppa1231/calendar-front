FROM nginx:1.27-alpine

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

# Конфиг для SPA-fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Статика
# Кладём index.html в корень, чтобы nginx отдавал его как /
COPY public/ ./
COPY styles/ ./styles/
COPY src/ ./src/
COPY openapi.json ./openapi.json

EXPOSE 80
