**Обновление audituppetit.ru: Ubuntu, Nginx, PM2 и PostgreSQL**

Инструкция для вашей конфигурации: Git находится в `/var/www`, приложение и серверный `.env` — в `/var/www/uppetit-audit`, процесс PM2 — `uppetit`, порт — 3000, PostgreSQL — на этом сервере. Команды сервера выполняются в Bash по SSH под тем же пользователем, который управляет этим процессом PM2. Нужен доступ `sudo` к PostgreSQL и Nginx.

Существующий серверный `.env` не заменяем и не редактируем. Локальные `.env`, `.env.development.local`, базу и учётную запись `local.admin` на сервер не переносим. Получаем только код через Git. Для первого включения MFA потребуется постоянный `AUTH_MFA_SECRET`; если его ещё нет, добавляем только этот новый ключ в отдельный серверный `.env.production.local`.

Миграция `20261009090000_security_sessions` сохраняет пользователей, хеши паролей, аудиты, ответы, точки, чек-листы и расписание. Она **удаляет старое поле `User.inviteToken`**, поэтому прежние ссылки приглашений перестанут работать. Их значения останутся в резервной копии, но в новой версии нужно выдать новые приглашения. Все сотрудники войдут заново, каждый ADMIN подключит MFA. До окна обновления завершите проверки: старые несохранённые черновики PWA будут удалены при обновлении клиента. Фотографии находятся в S3; миграция их не перемещает и не удаляет.

Это инструкция, а не уже выполненный деплой. Запускайте блоки последовательно. При ошибке остановитесь и прочитайте условие соответствующего шага. Не запускайте весь документ одним скриптом.

1. **Подготовьте и отправьте код с компьютера разработчика.**

Сейчас изменения безопасности содержат новые, ещё не отслеживаемые Git файлы. Один `git pull` на сервере не доставит их, пока не создан и не отправлен коммит. В PowerShell:

```powershell
cd C:\uppetit-dev
git status --short
git diff --stat
git add -- uppetit-audit
git diff --cached --name-only
git diff --cached --stat
```

Просмотрите список: должны быть исходники, `package.json`, `package-lock.json`, новая миграция, `worker/index.js`, тесты и документация. В нём не должно быть настоящих `.env*`, дампов базы, `node_modules` или `.next`. `.env.example` — только шаблон. Не включайте посторонние изменения.

```powershell
git commit -m "Harden internal authentication, sessions and administrator MFA"
git push origin main
git rev-parse HEAD
```

Сохраните SHA последней команды: именно этот коммит должен оказаться на сервере. Если push отклонён, сначала согласуйте расхождения локальной и удалённой ветки; не используйте force push.

2. **Проверьте сервер до остановки приложения.**

```bash
ssh YOUR_SERVER_USER@YOUR_SERVER_IP
whoami
pm2 list
pm2 show uppetit
node --version
npm --version
sudo -u postgres psql -X -d postgres -c 'SELECT version();'
pg_dump --version
pg_restore --version
df -h /var/www /var/backups
timedatectl status
sudo nginx -t
```

В PM2 проверьте `cwd = /var/www/uppetit-audit` и запуск production через `npm start` / `next start`, не `npm run dev`. Проверьте все экземпляры процесса, если используется cluster mode. Next.js 16.4.0 требует Node.js не ниже 20.9; используйте совместимую поддерживаемую версию Node. Клиент `pg_dump` должен поддерживать основную версию установленного PostgreSQL. Для дампа, копии старой сборки и проверочной базы нужно свободное место с запасом. Время сервера и телефона администратора должно синхронизироваться.

Переменные, явно заданные в PM2 или shell, имеют приоритет над файлами Next.js. Если PM2 задаёт `DATABASE_URL`, `AUTH_SECRET`, адрес авторизации или MFA-ключ отдельно, сравните их с используемой конфигурацией локально, не публикуя значения. В новой сборке и запущенном процессе должны использоваться одна рабочая база и один набор секретов.

В этой SSH-сессии задайте:

```bash
set -euo pipefail
umask 077
export NODE_ENV=production
APP_DIR=/var/www/uppetit-audit
DEPLOY_STAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_DIR=/var/backups/uppetit-security/$DEPLOY_STAMP
sudo install -d -m 700 -o "$(id -un)" -g "$(id -gn)" "$BACKUP_DIR"
cd "$APP_DIR"
test -f .env
test -f package.json
git -C /var/www rev-parse --show-toplevel
git -C /var/www rev-parse HEAD > "$BACKUP_DIR/old-commit.txt"
pm2 jlist > "$BACKUP_DIR/pm2-before.json"
sudo nginx -T > "$BACKUP_DIR/nginx-before.txt" 2>&1
sha256sum .env > "$BACKUP_DIR/env.sha256"
```

Запомните точный `BACKUP_DIR`. Сессия хранит эти переменные; после переподключения задайте тот же путь вручную. Архивы и `pm2-before.json` могут содержать секреты — храните их с ограниченным доступом.

Получите имя базы и пользователя из действующего окружения, не выводя пароль:

```bash
DB_NAME=$(node <<'NODE'
require('@next/env').loadEnvConfig(process.cwd(), false);
const u = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) || (u.port && u.port !== '5432')) throw new Error('Unexpected database host/port');
if ((u.searchParams.get('schema') || 'public') !== 'public') throw new Error('This instruction requires schema public');
console.log(decodeURIComponent(u.pathname.slice(1)));
NODE
)
APP_DB_USER=$(node <<'NODE'
require('@next/env').loadEnvConfig(process.cwd(), false);
console.log(decodeURIComponent(new URL(process.env.DATABASE_URL).username));
NODE
)
test -n "$DB_NAME"
test -n "$APP_DB_USER"
printf 'Database: %s; application role: %s\n' "$DB_NAME" "$APP_DB_USER"
sudo -u postgres psql -X -d "$DB_NAME" -c 'SELECT current_database(), current_user;'
```

Подтвердите, что это именно рабочая база приложения. Команды `sudo -u postgres` используют локальное подключение через Unix socket и обычную Ubuntu-настройку peer authentication. Если у вас она изменена, остановитесь и используйте согласованный способ подключения; не меняйте `pg_hba.conf` ради этого деплоя.

3. **Откройте окно обслуживания и ограничьте доступ сотрудников.**

Предупредите сотрудников о повторном входе и MFA для администраторов. Дождитесь отправки текущих аудитов. На время проверки новой версии доступ должен быть только у оператора деплоя: иначе восстановление старого дампа могло бы уничтожить уже созданные после обновления записи.

Сохраните конфигурацию Nginx:

```bash
sudo tar -czf "$BACKUP_DIR/nginx-config-before.tar.gz" -C /etc nginx
```

Если у вас нет готового режима обслуживания, можно добавить следующий временный фрагмент **внутрь существующего HTTPS `server {}` для `audituppetit.ru`**, перед `location`-блоками. Путь конфигурационного файла найдите в выводе `sudo nginx -T`; не создавайте второй конфликтующий server block. Замените `YOUR_OPERATOR_PUBLIC_IP` реальным IP, с которого будете проверять сайт в браузере. При дополнительном прокси перед Nginx сначала проверьте, что `$remote_addr` действительно показывает IP оператора.

```nginx
set $uppetit_maintenance 0;
if (-f /run/uppetit-maintenance) {
    set $uppetit_maintenance 1;
}
if ($remote_addr = YOUR_OPERATOR_PUBLIC_IP) {
    set $uppetit_maintenance 0;
}
if ($remote_addr = 127.0.0.1) {
    set $uppetit_maintenance 0;
}
if ($remote_addr = ::1) {
    set $uppetit_maintenance 0;
}
if ($uppetit_maintenance = 1) {
    return 503;
}
```

Примените только после успешной проверки:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo touch /run/uppetit-maintenance
```

Проверьте с другого IP, например с телефона через мобильную сеть: сайт должен отвечать 503. С IP оператора сайт пока доступен. Внутренний порт 3000 не должен быть доступен сотрудникам напрямую. Если не можете обеспечить ограничение всех путей записи, не рассчитывайте на откат восстановлением старого дампа после запуска нового приложения.

Остановите только приложение, оставив PostgreSQL работающим:

```bash
pm2 stop uppetit --watch
pm2 list
sudo ss -ltnp 'sport = :3000'
```

Процесс должен быть остановлен, а порт 3000 освобождён. `--watch` отключает автоматический запуск при изменении файлов. Если порт занят другим процессом или остался другой экземпляр приложения, выясните его назначение и остановите экземпляры этого приложения до продолжения. На период окна остановите также отдельные фоновые процессы, которые могут писать в эту базу; HTTP cron-запросы к остановленному приложению не выполнятся. Не выполняйте `cleanup-photos` как проверку доступности.

4. **Сделайте окончательную резервную копию после остановки записей.**

```bash
tar --exclude='uppetit-audit/node_modules' \
    --exclude='uppetit-audit/.next/cache' \
    -czf "$BACKUP_DIR/app-before.tar.gz" -C /var/www uppetit-audit
tar -tzf "$BACKUP_DIR/app-before.tar.gz" > "$BACKUP_DIR/app-before-files.txt"
sudo -u postgres pg_dump --format=custom --dbname="$DB_NAME" > "$BACKUP_DIR/database.dump"
sudo -u postgres pg_dumpall --globals-only > "$BACKUP_DIR/postgres-globals.sql"
test -s "$BACKUP_DIR/database.dump"
pg_restore --list "$BACKUP_DIR/database.dump" > "$BACKUP_DIR/database-contents.txt"
sha256sum "$BACKUP_DIR/database.dump" "$BACKUP_DIR/app-before.tar.gz" > "$BACKUP_DIR/backups.sha256"
```

Архив приложения включает старый код, `.env*`, `.next` со старой сборкой и `public` со старым service worker. `node_modules` восстанавливаются по старому lock-файлу. Дамп сохраняет схему, данные и историю Prisma; отдельный globals-файл сохраняет роли кластера. Внешние объекты S3 в PostgreSQL-дамп не входят: в нём сохраняются ссылки. Во время обновления не изменяйте бакет, lifecycle-правила и не запускайте очистку фото.

Сохраните числа записей и ссылок на фотографии:

```bash
cat > "$BACKUP_DIR/counts.sql" <<'SQL'
SELECT 'Answer', count(*) FROM public."Answer"
UNION ALL SELECT 'Audit', count(*) FROM public."Audit"
UNION ALL SELECT 'Checklist', count(*) FROM public."Checklist"
UNION ALL SELECT 'ChecklistItem', count(*) FROM public."ChecklistItem"
UNION ALL SELECT 'ChecklistVersion', count(*) FROM public."ChecklistVersion"
UNION ALL SELECT 'Location', count(*) FROM public."Location"
UNION ALL SELECT 'User', count(*) FROM public."User"
UNION ALL SELECT 'VisitPlan', count(*) FROM public."VisitPlan"
UNION ALL SELECT '_LocationTus', count(*) FROM public."_LocationTus"
UNION ALL SELECT 'photo_links', coalesce(sum(cardinality("photos")), 0) FROM public."Answer"
ORDER BY 1;
SQL
sudo -u postgres psql -X -A -t -F '|' -v ON_ERROR_STOP=1 -d "$DB_NAME" \
    < "$BACKUP_DIR/counts.sql" > "$BACKUP_DIR/counts-before.txt"
cat "$BACKUP_DIR/counts-before.txt"
```

Копию архивов перенесите с VPS в защищённое хранилище. Например, во втором окне терминала на компьютере:

```powershell
scp -r YOUR_SERVER_USER@YOUR_SERVER_IP:/var/backups/uppetit-security/EXACT_DEPLOY_STAMP C:\YOUR_PROTECTED_BACKUP_DIRECTORY\
```

Подставьте фактические путь/пользователя. Скачивание должно завершиться успешно. Если серверный пользователь не имеет доступа к файлам, не открывайте каталог всем пользователям: организуйте передачу с соответствующими правами.

5. **Получите релиз из Git строго из `/var/www`.**

```bash
cd /var/www
git status --short
```

Не продолжайте при неожиданных изменениях отслеживаемых файлов. Если единственное изменение — сгенерированный предыдущей production-сборкой `uppetit-audit/public/sw.js`, он уже сохранён в архиве; после проверки этого условия можно вернуть только его исходник:

```bash
git restore -- uppetit-audit/public/sw.js
```

Не используйте `git reset --hard` или `git clean`: они не нужны для обновления и могут удалить серверные файлы. Нужные неотслеживаемые файлы сохраните; не добавляйте серверные секреты в Git.

```bash
git pull --ff-only origin main
git rev-parse HEAD
cd /var/www/uppetit-audit
test -f prisma/migrations/20261009090000_security_sessions/migration.sql
sha256sum -c "$BACKUP_DIR/env.sha256"
```

SHA должен совпасть с коммитом из шага 1, проверка `.env` — завершиться с `OK`. Если не совпадает или pull не проходит, не переходите к миграции.

6. **Установите зависимости и подготовьте окружение без изменения `.env`.**

```bash
cd /var/www/uppetit-audit
npm ci --include=dev
npx --no-install prisma --version
npx --no-install prisma generate
```

Используем Prisma проекта 6.19.3 и сохранённый lock-файл. Не запускайте установку `prisma@latest`, `npm update` или `npm audit fix` в этом окне. Сборке и проверкам нужны devDependencies. `generate` создаёт клиент, но не изменяет таблицы.

Для **первого** выпуска MFA следующий блок создаст только недостающий `AUTH_MFA_SECRET` в `.env.production.local`, не выведет его и не изменит `.env`. Уже существующий ключ не меняется. При повторных деплоях сохраняйте прежний ключ: после регистрации MFA его потеря или произвольная замена лишит пользователей рабочего второго фактора.

```bash
node <<'NODE'
const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
require('@next/env').loadEnvConfig(process.cwd(), false);
if (!process.env.AUTH_MFA_SECRET) {
  fs.appendFileSync('.env.production.local', '\nAUTH_MFA_SECRET=' + randomBytes(32).toString('base64') + '\n', { mode: 0o600 });
  fs.chmodSync('.env.production.local', 0o600);
  console.log('Created the missing MFA key in .env.production.local');
} else {
  console.log('Existing MFA key preserved');
}
NODE
```

`.env.production.local` загружается Next.js в production и добавляет новый ключ к прежним настройкам. Не копируйте сюда `DATABASE_URL`, S3/VAPID-ключи или новый `AUTH_SECRET`. Существующий `AUTH_SECRET` нужно сохранить. Prisma 6 CLI для этого проекта читает базу из `.env`/`DATABASE_URL` процесса; одного нового MFA-ключа в дополнительном файле ему не требуется.

Если исходный `.env` содержит `NEXTAUTH_URL=http://audituppetit.ru`, добавьте в `.env.production.local` обе строки `AUTH_URL=https://audituppetit.ru` и `NEXTAUTH_URL=https://audituppetit.ru`, сохранив уже созданный MFA-ключ. Production-файл имеет приоритет перед `.env`; явно заданные переменные PM2/shell нужно проверить отдельно. Исходный `.env` и прежний `AUTH_SECRET` сохраняются. После этой настройки обновите защищённую резервную копию `.env.production.local`.

Проверьте настройки без вывода секретов:

```bash
node <<'NODE'
require('@next/env').loadEnvConfig(process.cwd(), false);
const u = new URL(process.env.DATABASE_URL);
const origin = new URL(process.env.AUTH_URL || process.env.NEXTAUTH_URL || 'http://invalid').origin;
console.log({ databaseHost: u.hostname, databaseName: decodeURIComponent(u.pathname.slice(1)), authOrigin: origin,
  authSecretConfigured: !!process.env.AUTH_SECRET, mfaSecretConfigured: !!process.env.AUTH_MFA_SECRET,
  trustedIpHeader: process.env.AUTH_TRUSTED_IP_HEADER || '(not configured)' });
if (origin !== 'https://audituppetit.ru') throw new Error('Authentication origin must match production');
if (!process.env.AUTH_SECRET) throw new Error('Existing AUTH_SECRET is required');
if (!process.env.AUTH_MFA_SECRET || process.env.AUTH_MFA_SECRET.length < 32) throw new Error('Persistent MFA key is required');
if (!process.env.S3_PUBLIC_URL?.startsWith('https://')) throw new Error('S3_PUBLIC_URL must use HTTPS');
NODE
```

При ошибке не заменяйте `.env` локальным файлом. Разберите текущую конфигурацию. Если в production задан только корректный `NEXTAUTH_URL`, код поддерживает его; новый `AUTH_URL` в этом случае не обязателен.

Для общей нагрузки компании настройте доверенный IP-заголовок. В существующем проксирующем `location` Nginx должны быть корректные строки:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Real-IP $remote_addr;
```

Если Nginx **перезаписывает** `X-Real-IP` адресом подключившегося клиента и backend закрыт от прямого доступа, можно через `nano .env.production.local` добавить `AUTH_TRUSTED_IP_HEADER=x-real-ip`, сохранив новый MFA-ключ. Если переменная уже задана, сначала проверьте используемый заголовок, не создавайте конфликтующие определения. Без доверенного заголовка все запросы делят общий IP-лимит 100 попыток входа за 15 минут; лимит на каждого пользователя работает отдельно. После правки Nginx выполните `sudo nginx -t` и только затем `sudo systemctl reload nginx`.

Сохраните резервную копию новых постоянных ключей до регистрации MFA:

```bash
if [ -f .env.production.local ]; then
    cp -p .env.production.local "$BACKUP_DIR/env.production.local.after"
fi
sha256sum -c "$BACKUP_DIR/env.sha256"
```

Эту дополнительную копию также перенесите в защищённое хранилище.

7. **Проверьте историю миграций до применения.**

```bash
if npx --no-install prisma migrate status; then
    printf 'Migration history is up to date; verify whether this release was already applied.\n'
else
    printf 'Read the report: pending migrations also return exit code 1.\n'
fi
cat prisma/migrations/20261009090000_security_sessions/migration.sql
```

Для первого выпуска ожидается **только** неприменённая миграция `20261009090000_security_sessions`. Код возврата 1 сам по себе не означает сбой: pending migrations тоже дают 1. Но при ошибке подключения, failed migrations, расхождении истории или отсутствии `_prisma_migrations` остановитесь.

Если рабочая база раньше обновлялась через `prisma db push` и история не отражает реальную схему, сначала нужен отдельно проверенный baseline. Не помечайте все миграции как выполненные наугад. Особенно нельзя вслепую применять старые неприменённые миграции: например, `20260707113159_add_required_optional` удаляет старое поле требований к фотографиям и устанавливает значения по умолчанию.

Если новая миграция уже применена, это не первый выпуск: не создавайте ключ MFA заново, проверьте существующие настройки и измените сценарий соответственно.

8. **Докажите, что дамп восстанавливается, и отрепетируйте миграцию на копии.**

Следующие команды создают отдельную базу, не изменяя production. Она содержит персональные данные: не публикуйте её наружу и не запускайте на ней публичный экземпляр приложения с рабочими S3/push-настройками.

```bash
export CHECK_DB=uppetit_deploy_check_$DEPLOY_STAMP
test "$CHECK_DB" != "$DB_NAME"
sudo -u postgres createdb --template=template0 --owner="$APP_DB_USER" "$CHECK_DB"
sudo -u postgres pg_restore --dbname="$CHECK_DB" --role="$APP_DB_USER" \
    --no-owner --no-acl --single-transaction --exit-on-error \
    < "$BACKUP_DIR/database.dump"
sudo -u postgres psql -X -A -t -F '|' -v ON_ERROR_STOP=1 -d "$CHECK_DB" \
    < "$BACKUP_DIR/counts.sql" > "$BACKUP_DIR/counts-restored.txt"
diff -u "$BACKUP_DIR/counts-before.txt" "$BACKUP_DIR/counts-restored.txt"
```

Восстановление должно завершиться без ошибок, `diff` — без различий. `pg_restore --list` из шага 4 проверял читаемость оглавления; только фактическое восстановление проверяет, что база действительно восстанавливается.

Сформируйте подключение к копии, сохранив параметры исходного подключения. Пароль не выводится в терминал:

```bash
cd /var/www/uppetit-audit
REHEARSAL_DB_URL=$(node <<'NODE'
require('@next/env').loadEnvConfig(process.cwd(), false);
const u = new URL(process.env.DATABASE_URL);
u.pathname = '/' + process.env.CHECK_DB;
console.log(u.toString());
NODE
)
DATABASE_URL="$REHEARSAL_DB_URL" npx --no-install prisma migrate deploy
DATABASE_URL="$REHEARSAL_DB_URL" npx --no-install prisma migrate status
sudo -u postgres psql -X -A -t -F '|' -v ON_ERROR_STOP=1 -d "$CHECK_DB" \
    < "$BACKUP_DIR/counts.sql" > "$BACKUP_DIR/counts-rehearsal.txt"
diff -u "$BACKUP_DIR/counts-before.txt" "$BACKUP_DIR/counts-rehearsal.txt"
```

Префикс `DATABASE_URL=...` действует только на конкретную команду; `.env` и подключение production не меняются. При любой ошибке репетиции production-миграцию не запускайте. Права проверочной роли/схемы должны соответствовать приложению. Проверочная база и дамп остаются для разбора/восстановления; очищайте их позднее отдельным осознанным действием.

9. **Соберите и проверьте релиз до изменения рабочей схемы.**

```bash
cd /var/www/uppetit-audit
npm run typecheck
npm run test:security
DATABASE_URL="$REHEARSAL_DB_URL" npm run build
npm run test:pwa
test -s .next/BUILD_ID
test -s public/sw.js
ls -l public/workbox-*.js public/worker-*.js
```

Тесты безопасности используют подмену Prisma и не меняют базу. Сборка получает уже мигрированную проверочную базу только на время этой команды; при production-запуске база будет прочитана из прежнего серверного окружения. Публичный VAPID-ключ для сборки должен быть рабочим серверным, поскольку `NEXT_PUBLIC_*` включаются в клиентский JavaScript при сборке.

Production-сборка генерирует `public/sw.js`, `public/workbox-*.js` и `public/worker-*.js`. Не заменяйте их после сборки исходным development service worker из Git. Приложение всё ещё остановлено, сотрудники не работают со смесью старой и новой сборок.

10. **Примените миграцию на рабочей базе.**

Ещё раз проверьте, что обычный `DATABASE_URL` не был вручную экспортирован с адресом проверочной базы. `npx` покажет datasource и имя целевой базы — это должен быть `$DB_NAME` из шага 2. Выполняем команды из рабочей директории:

```bash
cd /var/www/uppetit-audit
sha256sum -c "$BACKUP_DIR/env.sha256"
npx --no-install prisma migrate deploy
npx --no-install prisma migrate status
sudo -u postgres psql -X -A -t -F '|' -v ON_ERROR_STOP=1 -d "$DB_NAME" \
    < "$BACKUP_DIR/counts.sql" > "$BACKUP_DIR/counts-after.txt"
diff -u "$BACKUP_DIR/counts-before.txt" "$BACKUP_DIR/counts-after.txt"
```

Ожидаемый результат: миграция успешно применена, история up to date, число бизнес-записей и ссылок на фото не изменилось. Сравнение количеств — дополнительная проверка, а не доказательство побайтовой идентичности данных; полный дамп и проверенное восстановление остаются основой восстановления.

Для production используем только подготовленную миграцию через `migrate deploy`. **Не выполняйте `migrate reset`, `migrate dev`, `db push --accept-data-loss`, seed или удаление базы.** При ошибке миграции оставьте приложение остановленным. У этого SQL-файла нет общей транзакции `BEGIN/COMMIT`; нельзя предполагать, что все частичные изменения автоматически откатились. Не запускайте старый код и не отмечайте failed migration как applied без проверки фактически выполненного SQL.

11. **Запустите приложение, оставив режим обслуживания для сотрудников.**

```bash
cd /var/www/uppetit-audit
NODE_ENV=production pm2 restart uppetit --update-env
pm2 list
pm2 show uppetit
pm2 logs uppetit --lines 100 --nostream
curl --resolve audituppetit.ru:443:127.0.0.1 --fail --silent --show-error --output /dev/null https://audituppetit.ru/
curl --resolve audituppetit.ru:443:127.0.0.1 --silent --show-error --output /dev/null --write-out '%{http_code}\n' \
    https://audituppetit.ru/api/users
```

Последняя команда без cookie должна показать 401. Не отправляйте пароли/MFA-коды в curl-командах, историю shell или логи. Процесс должен быть online и работать из правильного `cwd`. Если PM2 до этого явно задавал иные переменные, `--update-env` не является способом автоматически удалить конфликтующие значения: проверьте фактическую конфигурацию процесса.

С разрешённого IP откройте `https://audituppetit.ru` в браузере. Войдите реальной существующей учётной записью ADMIN, подключите MFA по новому QR, сохраните резервные коды и проверьте вход с новым текущим кодом после его смены. Проверьте аудитора/TU, старый аудит и его фотографии, PDF/Excel и доступ к своим данным. Если нужно временно разрешить отдельные IP тестирующих сотрудников, добавьте их по аналогии в режим обслуживания и проверьте Nginx перед reload. Не создавайте и не удаляйте бизнес-записи в production до решения об открытии доступа; создание нового аудита и загрузку фото проверьте на staging, а на рабочей базе — после принятия релиза. Запись тестового аудита в production тоже считается новой записью для условий отката.

В PWA закройте старые вкладки/окна и откройте приложение с сетью. Проверьте новый service worker и повторный вход. Не требуйте от сотрудников очистки всех данных браузера, если у них есть незавершённая работа.

12. **Откройте доступ и сохраните конфигурацию PM2.**

Только после проверки входа, MFA и существующих данных:

```bash
sudo rm -- /run/uppetit-maintenance
pm2 save
cd /var/www/uppetit-audit
sha256sum -c "$BACKUP_DIR/env.sha256"
git -C /var/www rev-parse HEAD > "$BACKUP_DIR/new-commit.txt"
pm2 logs uppetit --lines 100 --nostream
```

Проверьте доступ с обычного устройства сотрудника. Сообщите о завершении окна, необходимости повторного входа и настройке MFA администраторами. Выдайте заново нужные приглашения. После открытия доступа новые аудиты должны сохраняться, фотографии загружаться в прежний бакет. Наблюдайте за ошибками авторизации, загрузки фото и 429; при большом числе 429 проверьте реальный IP в доверенном заголовке.

Временный фрагмент Nginx можно оставить до завершения наблюдения: без файла в `/run` он не ограничивает доступ. Позже удалите только этот фрагмент, проверьте `nginx -t` и reload. Сохраните бэкапы и новый ключ MFA согласно принятому сроку хранения; не удаляйте их сразу после первого успешного входа.

13. **Добавьте отдельную ежедневную очистку истёкших сеансов.**

Этот шаг не блокирует запуск. Используйте существующий постоянный `CRON_SECRET`; если он не настроен, сначала согласуйте его хранение, не подставляйте тестовое значение. Не меняйте действующую очистку фото в рамках добавления новой задачи.

Сохраните следующий скрипт, например в `/var/www/uppetit-audit/.security-build-backup/cleanup-security.cjs` (директория игнорируется Git). Он читает production-окружение, отправляет секрет в заголовке и не выводит его:

```js
const { loadEnvConfig } = require('@next/env');
process.env.NODE_ENV = 'production';
loadEnvConfig('/var/www/uppetit-audit', false);
async function main() {
  if (!process.env.CRON_SECRET) throw new Error('CRON_SECRET is not configured');
  const response = await fetch('https://audituppetit.ru/api/cron/cleanup-security', {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Security cleanup returned ${response.status}`);
  console.log(await response.text());
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
```

```bash
mkdir -p /var/www/uppetit-audit/.security-build-backup
# Сохраните приведённый выше скрипт через редактор.
chmod 600 /var/www/uppetit-audit/.security-build-backup/cleanup-security.cjs
command -v node
node /var/www/uppetit-audit/.security-build-backup/cleanup-security.cjs
crontab -e
```

Добавьте строку, заменив `ABSOLUTE_NODE_PATH` результатом `command -v node`. Для nvm это обычно полный путь внутри каталога версии Node, не обязательно `/usr/bin/node`:

```cron
15 3 * * * cd /var/www/uppetit-audit && ABSOLUTE_NODE_PATH .security-build-backup/cleanup-security.cjs >> .security-build-backup/cleanup-security.log 2>&1
```

Запускайте cron от пользователя приложения. Новая задача удаляет только истёкшие `AuthSession` и `AuthRateLimit`, не аудиты и не фотографии. Если у вас уже есть мониторируемый планировщик, добавьте такой же вызов туда вместо второго cron.

14. **План отката: до миграции и после неё — разные действия.**

До production-миграции рабочая база остаётся прежней. При сбое сборки можно восстановить старое приложение **в отдельный каталог**, установить старые зависимости и направить PM2 на него, сохранив существующий `.env`. Не возвращайте `.next` от старой версии поверх исходников новой.

После production-миграции обычный возврат старого Git-коммита не подходит: старый Prisma Client ожидает удалённое поле `inviteToken`. При failed migration могли остаться частичные изменения. Приложение держите остановленным до восстановления согласованных кода и базы.

**Если сотрудники ещё не получили доступ и после дампа не создано бизнес-записей**, полное восстановление предрелизной базы допустимо как согласованный аварийный откат. Если запись уже была, старый дамп её не содержит: не восстанавливайте его поверх production. Сначала сохраните ещё один дамп текущей базы, затем разберите корректирующую/обратную миграцию с сохранением новых записей. Универсальной безопасной команды отката для такого случая нет.

Проверенный предрелизный дамп восстанавливайте сначала в ещё одну новую базу по аналогии с шагом 8. Полное восстановление непосредственно в прежнюю production-базу с `--clean --if-exists` разрушительно; здесь намеренно нет команды для безусловного выполнения. После выбора плана восстановления нужно также убрать новые `AuthSession`/`AuthRateLimit` и состояние новой миграции, если восстанавливается именно старая схема: `pg_restore --clean` сам по себе не удаляет таблицы, которых не было в старом дампе. Не делайте это по отдельности без согласованного плана.

Для извлечения старого приложения без удаления текущего:

```bash
ROLLBACK_ROOT=/var/www/uppetit-rollback-$DEPLOY_STAMP
mkdir -m 700 "$ROLLBACK_ROOT"
tar -xzf "$BACKUP_DIR/app-before.tar.gz" -C "$ROLLBACK_ROOT"
cd "$ROLLBACK_ROOT/uppetit-audit"
npm ci --include=dev
npx --no-install prisma generate
```

Архив содержит старую сборку и серверные настройки на момент резервирования. Перед использованием сравните `.env` с неизменённым `/var/www/uppetit-audit/.env`; не меняйте секреты.

Вариант аварийного отката **без удаления нынешней базы и без изменения исходного `.env`** — восстановить снимок в новую базу и запустить старое приложение с временным переопределением `DATABASE_URL` в PM2. Используйте его только при выполнении условия об отсутствии новых бизнес-данных после дампа. Восстанавливается состояние на момент дампа, включая тогдашние пароли и приглашения; новые настройки MFA из неудачного выпуска в старую схему не входят. Нынешняя production-база остаётся на месте для разбора.

Снова включите обслуживание и остановите приложение, если оно уже было запущено:

```bash
sudo touch /run/uppetit-maintenance
pm2 stop uppetit --watch
sudo ss -ltnp 'sport = :3000'
export ROLLBACK_DB=uppetit_rollback_$DEPLOY_STAMP
test "$ROLLBACK_DB" != "$DB_NAME"
sudo -u postgres createdb --template=template0 --owner="$APP_DB_USER" "$ROLLBACK_DB"
sudo -u postgres pg_restore --dbname="$ROLLBACK_DB" --role="$APP_DB_USER" \
    --no-owner --no-acl --single-transaction --exit-on-error \
    < "$BACKUP_DIR/database.dump"
sudo -u postgres psql -X -A -t -F '|' -v ON_ERROR_STOP=1 -d "$ROLLBACK_DB" \
    < "$BACKUP_DIR/counts.sql" > "$BACKUP_DIR/counts-rollback.txt"
diff -u "$BACKUP_DIR/counts-before.txt" "$BACKUP_DIR/counts-rollback.txt"
cd "$ROLLBACK_ROOT/uppetit-audit"
cmp .env /var/www/uppetit-audit/.env
ROLLBACK_DB_URL=$(node <<'NODE'
require('@next/env').loadEnvConfig(process.cwd(), false);
const u = new URL(process.env.DATABASE_URL);
u.pathname = '/' + process.env.ROLLBACK_DB;
console.log(u.toString());
NODE
)
```

Если прежняя команда `npm start` запускает `next start` и все необходимые серверные настройки находятся в архивных `.env*`, можно запустить отдельный временный процесс:

```bash
NODE_ENV=production DATABASE_URL="$ROLLBACK_DB_URL" pm2 start npm \
    --name uppetit-rollback --cwd "$ROLLBACK_ROOT/uppetit-audit" \
    -- start -- --hostname 127.0.0.1 --port 3000
pm2 logs uppetit-rollback --lines 100 --nostream
curl --resolve audituppetit.ru:443:127.0.0.1 --fail --silent --show-error --output /dev/null https://audituppetit.ru/
```

Первый `--` передаёт аргументы от PM2 к npm, второй — от npm к `next start`. Если настройки приходили из ecosystem/PM2, воспроизведите необходимые значения и параметры по `pm2-before.json`, переопределив только целевую базу/каталог. Проверьте вход и старые данные через HTTPS до открытия доступа. Затем можно снять обслуживание и выполнить `pm2 save`. Не перезапускайте исходный `uppetit` параллельно с `uppetit-rollback` и не возвращайте его автоматически на исходную базу: две базы после возобновления работы будут расходиться. Фактический активный каталог и базу зафиксируйте для следующего выпуска. При плановом исправлении вперёд текущая рабочая база отката должна быть учтена как источник новых данных.

Источники поведения инструментов: [Prisma migrate deploy](https://docs.prisma.io/docs/cli/v7/migrate/deploy), [Prisma migrate status и коды выхода](https://docs.prisma.io/docs/cli/v7/migrate/status), [PostgreSQL pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html), [PostgreSQL pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html), [Next.js: порядок загрузки окружения](https://nextjs.org/docs/app/guides/environment-variables), [PM2: управление процессами](https://pm2.keymetrics.io/docs/usage/process-management/), [PM2: отключение watch](https://pm2.keymetrics.io/docs/usage/watch-and-restart/). Для команд Prisma в этой инструкции используется установленная в проекте версия 6.19.3; переход на новую основную версию Prisma не выполняется.
