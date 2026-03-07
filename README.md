# Kinoshara - Pinterest App Website

## Структура сайта

```
/
├── index.html      # Главная страница для app review
├── privacy.html    # Privacy Policy
├── callback.html   # OAuth callback + token exchange UI
├── terms.html      # Terms and returns
├── server.js       # Минимальный backend для Pinterest OAuth
├── package.json    # npm scripts
├── .env.example    # Переменные окружения
└── README.md       # Этот файл
```

## Функциональность

### 1. index.html
- Landing page бренда Kinoshara
- Позиционирование под merchant publishing workflow
- Ссылки на Privacy Policy, Terms и Contact
- Единый бренд Kinoshara

### 2. privacy.html
- Полная Privacy Policy для Pinterest API
- Описывает product publishing workflow, scopes, OAuth flow и удаление данных
- Содержит единые контакты Kinoshara

### 3. callback.html
- Обрабатывает OAuth callback от Pinterest
- Показывает authorization code
- Используется как зарегистрированный redirect URI
- Не содержит лишнего публичного UI для внутреннего workflow

### 4. server.js
- Раздает статические страницы
- Имеет endpoint `/api/pinterest/config` для генерации OAuth URL на фронтенде
- Имеет endpoint `/api/pinterest/token` для обмена `code -> access_token`
- Имеет endpoint `/api/pinterest/boards` для проверки реального API вызова
- Не требует внешних npm-зависимостей

## Основной use case

Kinoshara uses Pinterest API for a merchant publishing workflow:
- merchant authorizes a Pinterest account
- the workflow can read selected board data
- the system publishes original product Pins based on approved Kinoshara listings

## Для Pinterest API Review

### Требования Pinterest (Standard Access):
1. ✅ **Privacy Policy** - доступна по `/privacy.html`
2. ✅ **Valid redirect_uri** - используй `https://yourdomain.com/callback.html`
3. ✅ **OAuth flow demo** - покажите:
   - Переход на Pinterest login
   - Authorization screen
   - Редирект на callback.html
   - Получение кода
   - Обмен кода на токен (через curl/API)

### Настройка в Pinterest Developer Console:

1. Создайте приложение: https://developers.pinterest.com/apps/
2. Добавьте redirect URI: `https://kinoshara.app/callback.html`
3. Выберите scopes: `boards:read`, `boards:write`, `pins:read`, `pins:write`
4. В поле "Privacy Policy URL" укажите: `https://kinoshara.app/privacy.html`

### Демо-видео для Pinterest:

Нужно показать:
1. Открытие OAuth URL:
   ```
   https://www.pinterest.com/oauth/?client_id=YOUR_CLIENT_ID&redirect_uri=https://kinoshara.app/callback.html&response_type=code&scope=boards:read,pins:read,pins:write
   ```
2. Логин в Pinterest
3. Экран авторизации (Give access)
4. Редирект на callback.html
5. Показ authorization code
6. Обмен кода на токен через `/api/pinterest/token`
7. Реальный API вызов к `/api/pinterest/boards` или создание test product Pin

## Локальный запуск

1. Скопируйте `.env.example` в `.env` или экспортируйте переменные вручную:
   ```bash
   export PINTEREST_CLIENT_ID=your_client_id
   export PINTEREST_CLIENT_SECRET=your_client_secret
   export PINTEREST_REDIRECT_URI=http://localhost:3000/callback.html
   ```
2. Запустите сервер:
   ```bash
   npm start
   ```
3. Откройте:
   - `http://localhost:3000/`
   - `http://localhost:3000/privacy.html`
   - `http://localhost:3000/callback.html`

## Продакшн переменные

- `PINTEREST_CLIENT_ID`
- `PINTEREST_CLIENT_SECRET`
- `PINTEREST_REDIRECT_URI`
- `PINTEREST_SCOPES` (опционально, по умолчанию `boards:read,pins:read,pins:write`)
- `PORT` (опционально)
- `HOST` (опционально)

## Развёртывание

### Option 1: Render / Railway / Fly.io
- Подходит, потому что нужен backend для безопасного хранения `client_secret`
- В репозитории уже есть `render.yaml`

### Option 2: Vercel
- Можно использовать как Node app, если задать environment variables

### Option 3: GitHub Pages
- Подходит только для статического фронтенда
- Не подходит для безопасного token exchange с `client_secret`

## Важные URL для Pinterest

- **Privacy Policy**: `https://kinoshara.app/privacy.html`
- **Redirect URI**: `https://kinoshara.app/callback.html`
- **Homepage**: `https://kinoshara.app/`

## Проверка перед подачей

- [ ] Сайт доступен по HTTPS
- [ ] Privacy Policy открывается без редиректа
- [ ] На Privacy Policy есть реальный контакт email
- [ ] Redirect URI в Pinterest совпадает с `PINTEREST_REDIRECT_URI`
- [ ] Callback URL получает `code` и вызывает backend token exchange
- [ ] После token exchange есть хотя бы один реальный API response
- [ ] Все ссылки работают

---

**Note**: Перед повторной подачей замените email-адреса в HTML на реально работающие адреса, если `privacy@kinoshara.app` и `support@kinoshara.app` у вас еще не созданы.
