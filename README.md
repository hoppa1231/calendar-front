# Calendar Front (static)

Статический фронтенд календаря (отпуска, командировки, загрузка) с мок-данными на случай недоступности API.

## Структура
- `public/` — `index.html`
- `styles/` — стили
- `src/` — JS модули (API, мок-данные, календарь, графики, утилиты)
- `openapi.json` — спецификация API (для справки)
- `nginx.conf` — конфиг для раздачи статических файлов
- `Dockerfile` — сборка образа на nginx

## Запуск в Docker
```bash
docker build -t calendar-front .
docker run --rm -p 8080:80 calendar-front
# открыть http://localhost:8080
```

## Локально без Docker
Любой статический сервер из корня (нужна поддержка ES-модулей):
```bash
python -m http.server 8080
```
Затем открыть `http://localhost:8080/public/index.html`.
