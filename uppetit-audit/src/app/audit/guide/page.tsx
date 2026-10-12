'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Badge, Icon, Notice } from '@/components/ui';
import { APP_VERSION } from '@/lib/version';

const contents = [
  ['login', 'Вход'], ['home', 'Главная'], ['start', 'Новая проверка'],
  ['answers', 'Ответы и фото'], ['draft', 'Черновики'], ['finish', 'Отправка'],
  ['history', 'История'], ['analytics', 'Аналитика'], ['phone', 'На телефоне'],
] as const;

export default function GuidePage() {
  const { data: session } = useSession();
  const analytics = session?.user.role === 'ADMIN' || session?.user.role === 'TU';
  return <div className="ui-page max-w-5xl space-y-5">
    <header className="ui-heading"><div><Badge tone="brand">UPPETIT · {APP_VERSION}</Badge><h1 className="mt-3">Как пользоваться приложением</h1><p>От входа и первой проверки до истории, фотографий и аналитики.</p></div><Link href="/audit" className="ui-button ui-button-secondary"><Icon name="arrow" />На главную</Link></header>
    <nav aria-label="Разделы инструкции" className="ui-panel p-3 flex flex-wrap gap-2">{contents.map(([id, title]) => <a key={id} href={'#guide-' + id} className="ui-button ui-button-ghost !text-xs">{title}</a>)}</nav>
    <section id="guide-login" className="ui-panel p-5 sm:p-7 space-y-4 scroll-mt-24">
      <h2 className="text-xl font-semibold">1. Вход в UPPETIT</h2>
      <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed ui-muted">
        <li>Введите логин или телефон и пароль. Нажмите <strong>«Войти в систему»</strong>.</li>
        <li>Если второй фактор настроен, появится отдельный экран. Введите шестизначный код из приложения-аутентификатора и нажмите <strong>«Подтвердить»</strong>.</li>
        <li>При отсутствии доступа к аутентификатору выберите <strong>«Использовать резервный код»</strong>. Каждый резервный код действует один раз.</li>
        <li>При первом входе администратор проходит настройку второго фактора: сканирует QR-код и сохраняет резервные коды в безопасном месте.</li>
      </ol>
      <p className="ui-muted text-sm leading-relaxed">Если код не подходит, проверьте автоматическую настройку даты и времени телефона. Если забыли пароль или потеряли второй фактор, обратитесь к администратору.</p>
    </section>
    <section id="guide-home" className="ui-panel p-5 sm:p-7 space-y-4 scroll-mt-24">
      <h2 className="text-xl font-semibold">2. Главная и навигация</h2>
      <div className="grid gap-3 sm:grid-cols-2">{[
        ['Начать аудит', 'Создать проверку с выбором точки и действующего чек-листа. Можно также начать с конкретной точки в списке на главной.'],
        ['Продолжить', 'Вернуться к незавершённой проверке. Блок появляется, когда у этой учётной записи есть черновик на текущем устройстве.'],
        ['Мои результаты', 'Количество ваших проверок, средний результат и проверки с замечаниями. Период переключается отдельно от истории и аналитики.'],
        ['План и история', 'В плане — назначенные визиты, в истории — отправленные проверки с ответами, фотографиями и отчётами.'],
      ].map(([title, text]) => <div key={title} className="rounded-xl bg-[var(--surface-muted)] p-4"><h3 className="font-semibold text-sm">{title}</h3><p className="ui-muted text-sm leading-relaxed mt-2">{text}</p></div>)}</div>
      <p className="ui-muted text-sm leading-relaxed">На телефоне основные разделы расположены в нижнем меню: <strong>«Главная», «Проверка», «История», «План»</strong>. ТУ и администратору доступны территория и аналитика; администратору — отдельная панель управления. Тема переключается в шапке, настройки представления сохраняются для вашей учётной записи на этом устройстве.</p>
    </section>
    <section id="guide-start" className="ui-panel p-5 sm:p-7 space-y-4 scroll-mt-24">
      <h2 className="text-xl font-semibold">3. Начать новую проверку</h2>
      <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed ui-muted">
        <li>На главной нажмите <strong>«Начать аудит»</strong> или выберите <strong>«Проверка»</strong> в нижнем меню.</li>
        <li>Найдите точку по названию, коду или адресу и выберите её. Для аудитора и администратора доступен фильтр <strong>«Территория»</strong>; ТУ работает со своими доступными точками.</li>
        <li>Выберите действующий чек-лист. Архивные, неопубликованные и недоступные вашей роли чек-листы не предлагаются.</li>
        <li>Проверьте выбранные параметры и нажмите <strong>«Начать заполнение»</strong>.</li>
      </ol>
      <p className="ui-muted text-sm">Если нужная точка или чек-лист отсутствуют, проверьте поиск и фильтр территории, затем обратитесь к администратору.</p>
    </section>
    <section id="guide-answers" className="ui-panel p-5 sm:p-7 space-y-4 scroll-mt-24">
      <h2 className="text-xl font-semibold">4. Ответы, фотографии и комментарии</h2>
      <p className="ui-muted text-sm leading-relaxed">Для каждого пункта выберите <strong>«Всё отлично»</strong> или <strong>«Есть проблема»</strong>. В карточке указаны раздел, текст вопроса и штраф в баллах. Критические пункты выделены отдельно.</p>
      <div className="grid gap-3 sm:grid-cols-3">{[
        ['Фото обязательно', 'Фотографию нужно приложить независимо от ответа.'],
        ['Фото при нарушении', 'Фотография обязательна, если выбрано «Есть проблема».'],
        ['Фото по желанию', 'При необходимости добавьте снимок; отсутствие фото не блокирует ответ.'],
      ].map(([title, text]) => <div key={title} className="rounded-xl bg-[var(--surface-muted)] p-4"><h3 className="font-semibold text-sm">{title}</h3><p className="ui-muted text-sm leading-relaxed mt-2">{text}</p></div>)}</div>
      <p className="ui-muted text-sm leading-relaxed">Сделайте снимок кнопкой камеры или выберите фотографии из галереи. Дождитесь завершения загрузки. При нарушении добавьте краткий комментарий: что обнаружено и где. Для загрузки фотографий нужен интернет.</p>
      <p className="ui-muted text-sm leading-relaxed">Кнопки <strong>«Назад»</strong> и <strong>«Далее»</strong> переключают вопросы. <strong>«К пропуску»</strong> помогает вернуться к неотвеченному пункту. Когда все ответы готовы, нажмите <strong>«К итогам»</strong>. Если переход заблокирован, проверьте ответ и требование к фотографии.</p>
    </section>
    <section id="guide-draft" className="ui-panel p-5 sm:p-7 space-y-4 scroll-mt-24">
      <h2 className="text-xl font-semibold">5. Черновик и продолжение работы</h2>
      <p className="ui-muted text-sm leading-relaxed">Ответы, сотрудники смены и общий комментарий сохраняются на устройстве по мере изменений. В шапке проверки смотрите статус <strong>«Черновик сохранён»</strong>. Это сохранение на устройстве, а не отправка завершённого аудита.</p>
      <p className="ui-muted text-sm leading-relaxed">Чтобы отложить работу, нажмите крестик в шапке проверки: он возвращает на главную с сохранением черновика. Позже используйте <strong>«Продолжить»</strong> в блоке незавершённого аудита.</p>
      <Notice>Черновик доступен только той же учётной записи на этом устройстве и в этом браузере. Выход из системы удаляет черновики. До отправки не очищайте данные браузера и не переключайтесь на другой аккаунт.</Notice>
      <p className="ui-muted text-sm leading-relaxed">При изменении опубликованной версии чек-листа старый черновик может стать непригодным для отправки. Если приложение предлагает удалить его и начать заново, сначала оцените, какие сведения нужно сохранить. Сообщение об ошибке сохранения нельзя считать подтверждением, что введённые данные уже сохранены.</p>
    </section>
    <section id="guide-finish" className="ui-panel p-5 sm:p-7 space-y-4 scroll-mt-24">
      <h2 className="text-xl font-semibold">6. Завершение и отправка</h2>
      <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed ui-muted">
        <li>На экране <strong>«Итоги проверки»</strong> укажите хотя бы одного сотрудника смены. При необходимости добавьте остальных.</li>
        <li>Запишите общий комментарий и просмотрите ответы. Кнопка <strong>«К пункту»</strong> возвращает к выбранному вопросу для исправления.</li>
        <li>Нажмите <strong>«Завершить аудит»</strong> и в окне подтверждения — <strong>«Отправить»</strong>.</li>
        <li>Дождитесь сообщения об успешном завершении и возвращения из проверки. Проверьте, что аудит появился в истории.</li>
      </ol>
      <Notice>Аудит считается отправленным после успешного ответа сервера. Для отправки нужен интернет. При ошибке сохраните введённые сведения, проверьте соединение и текст ошибки; не начинайте новую проверку вместо незавершённой.</Notice>
    </section>
    <section id="guide-history" className="ui-panel p-5 sm:p-7 space-y-4 scroll-mt-24">
      <h2 className="text-xl font-semibold">7. История, отчёты и поиск</h2>
      <p className="ui-muted text-sm leading-relaxed">В истории аудитора отображаются его проверки; администратор работает с общей историей. Используйте поиск, даты и доступные фильтры. Список разбит на страницы, количество найденных проверок показано отдельно; история не ограничена первыми 200 записями.</p>
      <p className="ui-muted text-sm leading-relaxed">Нажмите <strong>«Ответы и фотографии»</strong>, чтобы открыть смену, общий комментарий и ответы. Фотография открывается крупно; закройте её крестиком или клавишей Escape. Для отдельной проверки доступен <strong>PDF</strong>.</p>
      <p className="ui-muted text-sm leading-relaxed"><strong>Excel истории</strong> включает весь результат выбранных фильтров, а не только текущую страницу. При слишком большой выборке сузьте период или фильтры. Изменение статуса ответа и удаление аудита доступны администратору; проверяющий просматривает результат.</p>
      <Link href="/audit/history" className="ui-button ui-button-secondary"><Icon name="history" />Открыть мою историю</Link>
    </section>
    <section id="guide-analytics" className="ui-panel p-5 sm:p-7 space-y-4 scroll-mt-24">
      <h2 className="text-xl font-semibold">8. Аналитика сети и территории</h2>
      <p className="ui-muted text-sm leading-relaxed">Аналитика сети находится в панели администратора. Аналитика территории доступна ТУ и администратору в пределах закреплённых точек. Аудитор использует блок <strong>«Мои результаты»</strong> на главной.</p>
      <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed ui-muted">
        <li>Выберите период, чек-листы, точки и аудиторов. В аналитике сети фильтр <strong>«ТУ сейчас»</strong> относится к текущим назначениям точек.</li>
        <li><strong>«Обзор»:</strong> качество, количество проверок, охват, критические замечания, динамика и причины потери баллов. Нажатие на показатель открывает детали.</li>
        <li><strong>«Точки»:</strong> результат каждой точки, замечания и повторяющиеся пункты. На телефоне строки представлены карточками.</li>
        <li><strong>«Нарушения»:</strong> частота конкретного пункта, затронутые точки, повторы, критичность, баллы и фото. Откройте связанную проверку для деталей.</li>
        <li><strong>«Проверки»:</strong> все проверки выбранного набора по страницам. Кнопка просмотра открывает ответы и фотографии без ухода из аналитики.</li>
        <li><strong>«Выгрузить в Excel»:</strong> сводка, точки, нарушения, разделы, аудиторы, чек-листы и все ответы по выбранным фильтрам. Размер страницы не ограничивает файл.</li>
      </ul>
      <p className="ui-muted text-sm leading-relaxed">Выполнение стандартов — сумма набранных баллов относительно суммы максимумов. Частота проблемы считается только по проверкам этого пункта. Повтор означает одинаковое нарушение на одной точке в разных проверках периода; это не самостоятельный статус устранения. Подробные определения доступны в блоке <strong>«Как считаются метрики»</strong>.</p>
      {analytics && <Link href={session?.user.role === 'ADMIN' ? '/admin' : '/audit/dashboard'} className="ui-button ui-button-secondary"><Icon name="dashboard" />Открыть аналитику</Link>}
    </section>
    <section id="guide-phone" className="ui-panel p-5 sm:p-7 space-y-4 scroll-mt-24">
      <h2 className="text-xl font-semibold">9. UPPETIT на телефоне</h2>
      <p className="ui-muted text-sm leading-relaxed"><strong>iPhone:</strong> откройте рабочий сайт в Safari, нажмите «Поделиться» → «На экран „Домой“» и добавьте значок. <strong>Android:</strong> в меню Chrome выберите установку приложения, если браузер предлагает эту возможность.</p>
      <p className="ui-muted text-sm leading-relaxed">Для обновления закройте и снова откройте приложение или обновите страницу. Перед обновлением сохраните работу. Установка на главный экран не означает, что вход, отправка проверки и загрузка фотографий работают без интернета.</p>
      <p className="ui-muted text-sm leading-relaxed">Если элемент не помещается или возникает ошибка, сообщите администратору: модель устройства, браузер, раздел, действие и снимок экрана. Пароль, одноразовые коды и резервные коды в сообщении не указывайте.</p>
    </section>
    <footer className="ui-muted text-xs leading-relaxed">Инструкция для UPPETIT {APP_VERSION}. Доступные разделы и действия зависят от вашей роли.</footer>
  </div>;
}
