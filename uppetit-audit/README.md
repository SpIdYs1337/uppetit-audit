# 🚀 UPPETIT Audit

Внутренняя система аудита и контроля качества для сети UPPETIT. Приложение позволяет проводить проверки на точках, заполнять динамические чек-листы, прикреплять фотоотчеты и генерировать PDF-отчеты. Оптимизировано для работы на мобильных устройствах в режиме PWA.

## ✨ Ключевые возможности

* 📱 **Полный PWA-опыт**: Установка на iOS и Android, работа вне браузера, Push-уведомления, умная система проверки и загрузки обновлений "по воздуху".
* 📋 **Динамические чек-листы**: Создание шаблонов проверок, версионирование чек-листов, гибкая система штрафов и баллов.
* 📸 **Работа с медиа (AWS S3)**: Прямая загрузка фотографий нарушений в облачное хранилище (S3) с автоматической очисткой файлов старше 6 месяцев по Cron-расписанию.
* 📄 **Генерация PDF-отчетов**: Серверная генерация подробных отчетов (`@react-pdf/renderer`) с поддержкой нативного системного меню "Поделиться" (Web Share API) на мобильных устройствах.
* 🗺️ **Интерактивное управление**: Распределение точек (магазинов) между территориальными управляющими (ТУ) с помощью Drag-and-Drop интерфейса (`@dnd-kit`), адаптированного под Touch-экраны.
* 🔐 **Ролевая модель (RBAC)**: Разграничение прав доступа (Администратор, ТУ, Аудитор) с помощью NextAuth.js.

## 🛠 Технологический стек

* **Фреймворк:** [Next.js 14+](https://nextjs.org/) (App Router)
* **База данных:** PostgreSQL + [Prisma ORM](https://www.prisma.io/)
* **Стилизация:** [Tailwind CSS](https://tailwindcss.com/)
* **Аутентификация:** [NextAuth.js](https://next-auth.js.org/)
* **Хранилище файлов:** AWS S3 (через `@aws-sdk/client-s3`)
* **PWA:** `@ducanh2912/next-pwa`
* **Генерация PDF:** `@react-pdf/renderer`
* **Drag and Drop:** `@dnd-kit/core`

## ⚙️ Переменные окружения (.env)

Для локального запуска необходимо создать файл `.env` в корне проекта и заполнить следующие переменные:

```env
# База данных
DATABASE_URL="postgresql://user:password@localhost:5432/uppetit_audit?schema=public"

# Аутентификация
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-string"
AUTH_SECRET="your-super-secret-string"

# AWS S3 (Хранилище фото)
AWS_REGION="ru-central1"
AWS_ENDPOINT="[https://s3.ru-central1.amazonaws.com](https://s3.ru-central1.amazonaws.com)"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_BUCKET_NAME="uppetit-audits"

# Cron (Секретный ключ для фоновых задач)
CRON_SECRET="your-cron-secret-key"
```

## 🚀 Локальный запуск (Разработка)

1. Клонируйте репозиторий:
   ```bash
   git clone <url_репозитория>
   cd uppetit-audit
   ```
2. Установите зависимости:
   ```bash
   npm install
   ```
3. Примените миграции базы данных:
   ```bash
   npx prisma db push
   # или npx prisma migrate dev
   
```
4. Запустите сервер разработки (используется флаг `--webpack` для совместимости с PWA-плагином):
   ```bash
   npm run dev
   
```
5. Откройте `http://localhost:3000` в браузере.

## 📦 Деплой на продакшен (через PM2)

Приложение разворачивается на VPS (Ubuntu) с помощью менеджера процессов PM2.

```bash
# Получение свежего кода
git pull origin main

# Сборка проекта (используется Webpack)
npm run build

# Перезапуск процесса
pm2 restart uppetit
```

## 🧹 Фоновые задачи (Cron Jobs)

Для экономии места в S3 хранилище настроено автоматическое удаление фотографий из отчетов, которым больше 12 месяцев.

Задача запускается раз в сутки на сервере (через `crontab -e`):
```bash
0 3 * * * curl -X GET "[https://your-domain.ru/api/cron/cleanup-photos?key=your-cron-secret-key](https://your-domain.ru/api/cron/cleanup-photos?key=your-cron-secret-key)" > /dev/null 2>&1
```