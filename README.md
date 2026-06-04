# 🚀 UPPETIT Audit

Внутренняя система аудита и контроля качества для сети UPPETIT. Приложение позволяет проводить проверки на точках, заполнять динамические чек-листы, прикреплять фотоотчеты, анализировать статистику и генерировать отчеты (PDF/Excel). Оптимизировано для быстрой работы на мобильных устройствах в режиме PWA.

## ✨ Ключевые возможности

* 📱 **Полный PWA-опыт**: Установка на iOS и Android, работа вне браузера, Push-уведомления, умная система проверки и загрузки обновлений "по воздуху".
* 📊 **Умная аналитика (Дэшборд)**: Интерактивные графики, динамическое сравнение периодов (тренды), рейтинги лучших и проблемных точек, подсчет попадания в зоны качества ("Светофор").
* 📋 **Динамические чек-листы**: Создание шаблонов проверок, версионирование чек-листов, гибкая система штрафов и баллов.
* 📈 **Экспорт данных**: Генерация серверных PDF-отчетов с поддержкой нативного меню "Поделиться" (Web Share API) и детальная **выгрузка в Excel** с цветовой индикацией зон.
* 📸 **Работа с медиа (AWS S3/Ceph)**: Прямая ленивая загрузка фотографий в облачное хранилище с автоматической очисткой файлов старше **6 месяцев** по Cron-расписанию.
* 🔐 **Безопасность и Роли (RBAC)**: Строгое разграничение прав доступа (Администратор, ТУ, Аудитор) с помощью NextAuth.js и защиты API-роутов через Middleware.

## 🛠 Технологический стек

* **Фреймворк:** [Next.js 14+](https://nextjs.org/) (App Router)
* **База данных:** PostgreSQL + [Prisma ORM](https://www.prisma.io/)
* **Стилизация:** [Tailwind CSS](https://tailwindcss.com/)
* **Аутентификация:** [NextAuth.js v5](https://next-auth.js.org/) *(+ `bcryptjs` для надежного шифрования паролей)*
* **Хранилище файлов:** AWS S3 *(через `aws-sdk` v2 для 100% совместимости с S3-хранилищами вроде Beget/Ceph)*
* **PWA:** `@ducanh2912/next-pwa`

**Ключевые инфраструктурные модули:**
* **Аналитика и графики:** `recharts`
* **Генерация отчетов:** `@react-pdf/renderer` (PDF) и `exceljs` (XLSX)
* **Валидация данных:** `zod` *(обеспечивает строгую типизацию API и защиту эндпоинтов)*
* **Уведомления:** `web-push` *(для отправки push-уведомлений сотрудникам о завершении аудитов)*

## ⚙️ Переменные окружения (.env)

Для локального запуска необходимо создать файл `.env` в корне проекта и заполнить следующие переменные:

```env
# База данных
DATABASE_URL="postgresql://user:password@localhost:5432/uppetit_audit?schema=public"

# Аутентификация
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-string"
AUTH_SECRET="your-super-secret-string"

# AWS S3 (Хранилище фото - поддержка Beget/S3)
S3_REGION="ru-1"
S3_ENDPOINT="[https://s3.beget.com](https://s3.beget.com)"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET_NAME="uppetit-audits"
S3_PUBLIC_URL="[https://your-domain.com](https://your-domain.com)" # Публичный URL для чтения фото

# Web-Push уведомления
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"

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

# Установка новых зависимостей
npm install

# Сборка проекта
npm run build

# Перезапуск процесса
pm2 restart uppetit
```

## 🧹 Фоновые задачи (Cron Jobs)

Для экономии места в S3 хранилище и оперативной памяти базы данных настроено автоматическое удаление фотографий из отчетов, которым больше **6 месяцев**.

Задача запускается раз в сутки на сервере (через `crontab -e`):
```bash
0 3 * * * curl -X GET "[https://your-domain.ru/api/cron/cleanup-photos?key=your-cron-secret-key](https://your-domain.ru/api/cron/cleanup-photos?key=your-cron-secret-key)" > /dev/null 2>&1
```