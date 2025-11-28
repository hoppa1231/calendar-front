# Calendar Front

Статический фронтенд календаря (отпуска, командировки, загрузка) с мок-данными на случай недоступности API.

## Структура
- `public/` — `index.html`, `config.js` (генерируется на старте контейнера)
- `styles/` — стили
- `src/` — JS модули (API, мок-данные, календарь, графики, утилиты)
- `openapi.json` — спецификация API (для справки)
- `nginx.conf` — конфиг для раздачи статических файлов
- `Dockerfile`, `docker-entrypoint.sh` — сборка образа на nginx, проброс API_BASE из env

## API_BASE (куда слать запросы)
- По умолчанию: `/api/v1` (тот же хост/порт, что фронт).
- В контейнере можно задать: `-e API_BASE=http://backend:8000/api/v1` — адрес пропишется в `config.js`.
- В UI текущий API BASE отображается в шапке.

## Запуск в Docker
```bash
docker build -t calendar-front .
docker run --rm -p 8080:80 -e API_BASE=http://localhost:8000/api/v1 calendar-front
# открыть http://localhost:8080
```

## Локально без Docker
Любой статический сервер из корня (нужна поддержка ES-модулей):
```bash
python -m http.server 8080
```
Затем открыть `http://localhost:8080/public/index.html`.  
При локальном запуске `config.js` можно поправить вручную (`window.__API_BASE__ = "http://localhost:8000/api/v1";`).
