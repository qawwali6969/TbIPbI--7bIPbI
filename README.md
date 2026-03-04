# PopShop KR - Pinterest App Website

## Структура сайта

```
/
├── index.html      # Главная страница с редиректом на Etsy
├── privacy.html    # Privacy Policy (требуется Pinterest)
├── callback.html   # OAuth callback (требуется Pinterest)
└── README.md       # Этот файл
```

## Функциональность

### 1. index.html
- Красивый landing page с логотипом
- Автоматический редирект на https://popshopkr.etsy.com через 3 секунды
- Ссылка на Privacy Policy
- Адаптивный дизайн

### 2. privacy.html
- Полная Privacy Policy для Pinterest API
- Разделы: Information We Collect, How We Use Your Information, Pinterest API Integration, Data Storage, etc.
- Необходима для получения доступа к Pinterest API
- Ссылка "Back to Home" без редиректа

### 3. callback.html
- Обрабатывает OAuth callback от Pinterest
- Показывает authorization code (для demo видео)
- Обрабатывает ошибки авторизации
- JavaScript парсит URL параметры (?code=xxx&state=yyy)

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
2. Добавьте redirect URI: `https://yourdomain.com/callback.html`
3. Выберите scopes: `boards:read`, `boards:write`, `pins:read`, `pins:write`
4. В поле "Privacy Policy URL" укажите: `https://yourdomain.com/privacy.html`

### Демо-видео для Pinterest:

Нужно показать:
1. Открытие OAuth URL:
   ```
   https://www.pinterest.com/oauth/?client_id=YOUR_CLIENT_ID&redirect_uri=https://yourdomain.com/callback.html&response_type=code&scope=boards:read,pins:read,pins:write
   ```
2. Логин в Pinterest
3. Экран авторизации (Give access)
4. Редирект на callback.html
5. Показ authorization code
6. Обмен кода на токен через API call

## Развёртывание

### Option 1: GitHub Pages (Бесплатно)
1. Создайте репозиторий на GitHub
2. Загрузите эти файлы
3. Включите GitHub Pages в настройках
4. Домен будет: `https://yourusername.github.io/repo-name/`

### Option 2: Netlify (Бесплатно)
1. Перетащите папку на https://app.netlify.com/drop
2. Получите домен instantly

### Option 3: Vercel (Бесплатно)
```bash
npm i -g vercel
vercel
```

## Важные URL для Pinterest

- **Privacy Policy**: `https://yourdomain.com/privacy.html`
- **Redirect URI**: `https://yourdomain.com/callback.html`
- **Homepage**: `https://yourdomain.com/` (редирект на Etsy)

## Проверка перед подачей

- [ ] Сайт доступен по HTTPS
- [ ] Privacy Policy открывается без редиректа
- [ ] На Privacy Policy есть контакт email
- [ ] Callback URL правильно обрабатывает code параметр
- [ ] Все ссылки работают

## Etsy магазин

Ссылка: https://popshopkr.etsy.com

---

**Note**: Замените `yourdomain.com` на ваш реальный домен после развёртывания.
