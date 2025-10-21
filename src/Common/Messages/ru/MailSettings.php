<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

return [
    // Authentication
    'ms_AuthenticationType' => 'Тип аутентификации',
    'ms_AuthTypePassword' => 'Логин и пароль',
    'ms_AuthTypeOAuth2' => 'OAuth2 (рекомендуется)',

    // OAuth2
    'ms_OAuth2Provider' => 'Провайдер OAuth2',
    'ms_SelectOAuth2Provider' => 'Выберите провайдера',
    'ms_OAuth2ClientId' => 'Идентификатор приложения (Client ID)',
    'ms_OAuth2ClientSecret' => 'Секретный ключ (Client Secret)',
    'ms_OAuth2ClientIdPlaceholder' => 'Введите Client ID от провайдера',
    'ms_OAuth2ClientSecretPlaceholder' => 'Введите Client Secret от провайдера',
    'ms_ConnectWithOAuth2' => 'Подключить через OAuth2',
    'ms_DisconnectOAuth2' => 'Отключить OAuth2',
    'ms_OAuth2AuthorizationFailed' => 'Ошибка авторизации OAuth2',
    'ms_OAuth2InvalidCallback' => 'Неверные параметры OAuth2 callback',
    'ms_OAuth2AuthorizationSuccess' => 'OAuth2 авторизация успешна',
    'ms_OAuth2CallbackFailed' => 'Ошибка обработки OAuth2 callback',
    'ms_OAuth2ConnectedTo' => 'Подключено к {provider}',
    'ms_OAuth2TokenValid' => '(токен действителен)',
    'ms_OAuth2TokenExpired' => '(токен истек - будет обновлен автоматически)',
    'ms_OAuth2Authorized' => 'Авторизовано',
    'ms_OAuth2NotConfigured' => 'OAuth2 не настроен. Настройте Client ID и Client Secret, затем нажмите "Подключить через OAuth2"',
    'ms_SavingBeforeOAuth2' => 'Сохранение настроек перед авторизацией OAuth2...',
    'ms_FailedToSaveBeforeOAuth2' => 'Не удалось сохранить настройки перед авторизацией OAuth2',
    'ms_SaveChangesBeforeTesting' => 'Сохраните изменения перед тестированием',
    'ms_OAuth2MissingConfiguration' => 'Заполните все поля OAuth2 конфигурации',

    // OAuth2 Callback Page
    'ms_ProcessingAuthorization' => 'Обработка авторизации...',
    'ms_AuthorizationSuccessful' => 'Авторизация успешна!',
    'ms_AuthorizationFailed' => 'Ошибка авторизации',
    'ms_ProcessingAuthCode' => 'Обработка кода авторизации...',
    'ms_OAuth2MissingParameters' => 'Отсутствуют необходимые параметры авторизации',
    'ms_OAuth2ProcessingFailed' => 'Ошибка обработки авторизации OAuth2',

    // OAuth2 Error Translations
    'ms_OAuth2AccessDenied' => 'Доступ запрещен пользователем',
    'ms_OAuth2InvalidRequest' => 'Некорректный запрос авторизации',
    'ms_OAuth2InvalidClient' => 'Неверные данные приложения',
    'ms_OAuth2InvalidGrant' => 'Недействительный код авторизации',
    'ms_OAuth2UnauthorizedClient' => 'Приложение не авторизовано',
    'ms_OAuth2UnsupportedGrantType' => 'Неподдерживаемый тип авторизации',
    'ms_OAuth2InvalidScope' => 'Недопустимые права доступа',
    'ms_OAuth2ServerError' => 'Ошибка сервера авторизации',
    'ms_OAuth2TemporarilyUnavailable' => 'Сервис временно недоступен',

    // Encryption types
    'ms_SMTPEncryption' => 'Тип шифрования',
    'ms_EncryptionNone' => 'Без шифрования (порт 25)',
    'ms_EncryptionSTARTTLS' => 'STARTTLS (порт 587)',
    'ms_EncryptionSSLTLS' => 'SSL/TLS (порт 465)',

    // General Settings
    'ms_GeneralSettings' => 'Общие настройки',
    'ms_NotificationInfo' => 'Информация о настройке уведомлений',
    'ms_NotificationInfoText' => 'Система может отправлять уведомления о пропущенных вызовах и голосовых сообщениях. Для работы этой функции необходимо настроить SMTP сервер.',
    'ms_SMTPConfigRequired' => 'Для отправки уведомлений требуется настройка SMTP сервера',

    // SMTP Settings
    'ms_SMTPSettings' => 'Настройки SMTP',
    'ms_SMTPHost' => 'SMTP хост',
    'ms_SMTPPort' => 'SMTP порт',
    'ms_SMTPUsername' => 'SMTP логин',
    'ms_SMTPPassword' => 'SMTP пароль',
    'ms_SMTPUseTLS' => 'Использовать TLS',
    'ms_SMTPCertCheck' => 'Проверять сертификат сервера',

    // Sender Settings
    'ms_SMTPSenderAddress' => 'Адрес отправителя',
    'ms_SMTPFromUsername' => 'Имя отправителя',

    // Notifications
    'ms_MailEnableNotifications' => 'Использовать оповещения',
    'ms_SendMissedCallNotifications' => 'Отправлять уведомления о пропущенных вызовах',
    'ms_SendVoicemailNotifications' => 'Отправлять уведомления о голосовых сообщениях',
    'ms_SendLoginNotifications' => 'Отправлять уведомления о входах в систему',
    'ms_SendSystemNotifications' => 'Отправлять системные уведомления',
    'ms_MailSysadminEmail' => 'Email системного администратора',
    'ms_SystemEmailForMissed' => 'Единый Email для уведомлений о пропущенных вызовах',
    'ms_VoicemailCommonEmail' => 'Единый Email для сообщений голосовой почты',

    // Testing
    'ms_TestMailSettings' => 'Тестирование настроек почты',
    'ms_TestConnection' => 'Проверить подключение',
    'ms_SendTestEmail' => 'Отправить тестовое письмо',
    'ms_TestEmailSubject' => 'Тестирование отправки почты',
    'ms_TestEmailBody' => 'Если вы получили это письмо, значит настройки почты выполнены правильно.',
    'ms_TestEmailSentSuccessfully' => 'Письмо отправлено',
    'ms_TestEmailSentTo' => 'Письмо отправлено на адрес %EMAIL%',
    'ms_SentTestEmailAfterSaveTo' => 'Отправить тестовое письмо на этот адрес',
    'ms_SMTPConnectionTestSuccessful' => 'Подключение к SMTP серверу успешно',
    'ms_SuccessfullyConnectedToSMTPServer' => 'Успешно подключено к SMTP серверу',
    'ms_FailedToConnectToSMTPServer' => 'Не удалось подключиться к SMTP серверу',
    'ms_CouldNotEstablishConnection' => 'Не удалось установить соединение с SMTP сервером. Проверьте настройки.',
    'ms_ConnectionTestFailed' => 'Проверка подключения не удалась: %MESSAGE%',
    'ms_FailedToSendTestEmail' => 'Не удалось отправить тестовое письмо',
    'ms_TestEmailFailedWithError' => 'Ошибка отправки тестового письма: %ERROR%',

    // Validation Messages
    'ms_ValidateSMTPHostEmpty' => 'Укажите SMTP сервер',
    'ms_ValidateSMTPHostInvalid' => 'SMTP сервер может содержать только буквы, цифры, точки и дефисы',
    'ms_ValidateSMTPPortEmpty' => 'Укажите порт SMTP сервера',
    'ms_ValidateSMTPPortInvalid' => 'Некорректное значение порта',
    'ms_ValidateSMTPUsernameEmpty' => 'Укажите имя пользователя',
    'ms_ValidateSMTPUsernameEmail' => 'Введите корректный email адрес',
    'ms_ValidateSMTPPasswordEmpty' => 'Укажите пароль',
    'ms_ValidateSenderAddressEmpty' => 'Поле "Адрес отправителя" обязательно для заполнения',
    'ms_ValidateSenderAddressInvalid' => 'Введите корректный email адрес отправителя',
    'ms_ValidateSystemEmailInvalid' => 'Введите корректный email для системных уведомлений',
    'ms_ValidateMissedEmailInvalid' => 'Введите корректный email для уведомлений о пропущенных вызовах',
    'ms_ValidateVoicemailEmailInvalid' => 'Введите корректный email для уведомлений голосовой почты',
    'ms_ValidateOAuth2ProviderEmpty' => 'Выберите OAuth2 провайдера',
    'ms_ValidateOAuth2ClientIdEmpty' => 'Введите Client ID',
    'ms_ValidateOAuth2ClientSecretEmpty' => 'Введите Client Secret',

    // Success Messages
    'ms_SuccessfulSaved' => 'Настройки сохранены',
    'ms_SuccessfulDeleted' => 'Данные удалены',

    // Tooltip translations for MailEnableNotifications
    'ms_MailEnableNotificationsTooltip_header' => 'Управление почтовыми уведомлениями',
    'ms_MailEnableNotificationsTooltip_desc' => 'Главный переключатель для всех почтовых уведомлений в системе. Включает или отключает отправку email-сообщений для различных событий.',
    'ms_MailEnableNotificationsTooltip_when_enabled' => 'При включении система отправляет:',
    'ms_MailEnableNotificationsTooltip_missed_calls' => 'Уведомления о пропущенных вызовах',
    'ms_MailEnableNotificationsTooltip_voicemail' => 'Голосовые сообщения на email',
    'ms_MailEnableNotificationsTooltip_system_events' => 'Важные системные события и предупреждения',
    'ms_MailEnableNotificationsTooltip_module_notifications' => 'Уведомления от установленных модулей',
    'ms_MailEnableNotificationsTooltip_requirements' => 'Требования для работы:',
    'ms_MailEnableNotificationsTooltip_smtp_configured' => 'Настроенное подключение к SMTP серверу',
    'ms_MailEnableNotificationsTooltip_sender_address' => 'Указан корректный адрес отправителя',
    'ms_MailEnableNotificationsTooltip_recipient_emails' => 'Заполнены адреса получателей для нужных типов уведомлений',
    'ms_MailEnableNotificationsTooltip_when_disabled' => 'При отключении:',
    'ms_MailEnableNotificationsTooltip_when_disabled_desc' => 'Система не будет отправлять никакие email-уведомления, даже если SMTP настроен',
    'ms_MailEnableNotificationsTooltip_warning' => 'Отключение уведомлений может привести к пропуску важных системных событий и проблем',
    'ms_MailEnableNotificationsTooltip_note' => 'Каждый тип уведомлений можно дополнительно настроить индивидуально через соответствующие разделы',

    // Tooltip translations for SystemNotificationsEmail
    'ms_SystemNotificationsEmailTooltip_header' => 'Email для системных уведомлений',
    'ms_SystemNotificationsEmailTooltip_desc' => 'Адрес электронной почты системного администратора для получения важных системных сообщений и предупреждений.',
    'ms_SystemNotificationsEmailTooltip_usage' => 'На этот адрес отправляются:',
    'ms_SystemNotificationsEmailTooltip_critical_errors' => 'Критические системные ошибки',
    'ms_SystemNotificationsEmailTooltip_disk_space' => 'Предупреждения о нехватке дискового пространства',
    'ms_SystemNotificationsEmailTooltip_license' => 'Уведомления об истечении лицензии',
    'ms_SystemNotificationsEmailTooltip_updates' => 'Информация о доступных обновлениях системы',
    'ms_SystemNotificationsEmailTooltip_security' => 'Уведомления о безопасности и попытках взлома',
    'ms_SystemNotificationsEmailTooltip_ssl_cert' => 'Предупреждения об истечении SSL сертификатов',
    'ms_SystemNotificationsEmailTooltip_backup_status' => 'Результаты резервного копирования',
    'ms_SystemNotificationsEmailTooltip_examples' => 'Примеры:',
    'ms_SystemNotificationsEmailTooltip_recommendations' => 'Рекомендации:',
    'ms_SystemNotificationsEmailTooltip_use_monitored' => 'Используйте регулярно проверяемый почтовый ящик',
    'ms_SystemNotificationsEmailTooltip_separate_account' => 'Желательно использовать отдельную учетную запись для системных уведомлений',
    'ms_SystemNotificationsEmailTooltip_distribution_list' => 'Можно указать список рассылки для оповещения нескольких администраторов',
    'ms_SystemNotificationsEmailTooltip_warning' => 'Без указания этого адреса вы не будете получать критически важные системные сообщения',
    'ms_SystemNotificationsEmailTooltip_note' => 'Также используется как адрес по умолчанию для тестирования почтовых настроек и в качестве контактного email в SSL сертификатах',

    // Tooltip translations for MailSMTPAuthType
    'ms_MailSMTPAuthTypeTooltip_header' => 'Выбор типа аутентификации',
    'ms_MailSMTPAuthTypeTooltip_desc' => 'Определяет способ авторизации при подключении к SMTP серверу для отправки почты.',

    // Password authentication section
    'ms_MailSMTPAuthTypeTooltip_password_header' => 'Логин и пароль (классическая аутентификация)',
    'ms_MailSMTPAuthTypeTooltip_password_desc_header' => 'Описание:',
    'ms_MailSMTPAuthTypeTooltip_password_desc' => 'Традиционный метод авторизации с использованием имени пользователя и пароля. Подходит для большинства SMTP серверов.',
    'ms_MailSMTPAuthTypeTooltip_password_pros' => 'Преимущества:',
    'ms_MailSMTPAuthTypeTooltip_password_pro_simple' => 'Простая настройка - требуется только логин и пароль',
    'ms_MailSMTPAuthTypeTooltip_password_pro_universal' => 'Универсальная поддержка всеми почтовыми серверами',
    'ms_MailSMTPAuthTypeTooltip_password_pro_noapi' => 'Не требует регистрации приложения у провайдера',
    'ms_MailSMTPAuthTypeTooltip_password_cons' => 'Недостатки:',
    'ms_MailSMTPAuthTypeTooltip_password_con_security' => 'Менее безопасно - пароль хранится в системе',
    'ms_MailSMTPAuthTypeTooltip_password_con_apppassword' => 'Для Gmail, Yandex, Mail.ru требуется пароль приложения вместо основного',
    'ms_MailSMTPAuthTypeTooltip_password_con_2fa' => 'При включенной двухфакторной аутентификации нужно создавать отдельный пароль приложения',

    // OAuth2 authentication section
    'ms_MailSMTPAuthTypeTooltip_oauth2_header' => 'OAuth2 (современная аутентификация)',
    'ms_MailSMTPAuthTypeTooltip_oauth2_desc_header' => 'Описание:',
    'ms_MailSMTPAuthTypeTooltip_oauth2_desc' => 'Безопасный метод авторизации через токены доступа. Вы авторизуетесь на странице провайдера, а система получает временный токен для работы.',
    'ms_MailSMTPAuthTypeTooltip_oauth2_pros' => 'Преимущества:',
    'ms_MailSMTPAuthTypeTooltip_oauth2_pro_secure' => 'Высокий уровень безопасности - пароль не хранится в системе',
    'ms_MailSMTPAuthTypeTooltip_oauth2_pro_nopassword' => 'Не требуется создавать пароли приложений',
    'ms_MailSMTPAuthTypeTooltip_oauth2_pro_2fa' => 'Работает с двухфакторной аутентификацией без дополнительных настроек',
    'ms_MailSMTPAuthTypeTooltip_oauth2_pro_revoke' => 'Доступ можно отозвать в любой момент через настройки аккаунта',
    'ms_MailSMTPAuthTypeTooltip_oauth2_cons' => 'Недостатки:',
    'ms_MailSMTPAuthTypeTooltip_oauth2_con_setup' => 'Более сложная первоначальная настройка',
    'ms_MailSMTPAuthTypeTooltip_oauth2_con_providers' => 'Поддерживается только крупными провайдерами (Google, Microsoft, Yandex)',
    'ms_MailSMTPAuthTypeTooltip_oauth2_con_renew' => 'Токены требуют периодического обновления',

    // Recommendation
    'ms_MailSMTPAuthTypeTooltip_recommendation' => 'Рекомендация:',
    'ms_MailSMTPAuthTypeTooltip_recommendation_desc' => 'Используйте OAuth2 для Gmail, Outlook и Yandex. Для корпоративных серверов и других провайдеров используйте логин и пароль.',
    'ms_MailSMTPAuthTypeTooltip_warning' => 'При смене типа аутентификации потребуется заново настроить подключение к почтовому серверу',

    // Tooltip translations for MailOAuth2ClientId
    'ms_MailOAuth2ClientIdTooltip_header' => 'Идентификатор приложения OAuth2',
    'ms_MailOAuth2ClientIdTooltip_desc' => 'Client ID и Client Secret — это учетные данные вашего приложения для доступа к почтовому сервису через OAuth2.',
    'ms_MailOAuth2ClientIdTooltip_whatisit' => 'Что это такое?',
    'ms_MailOAuth2ClientIdTooltip_whatisit_desc' => 'Уникальный идентификатор вашего приложения, который вы получаете при регистрации приложения у почтового провайдера.',
    'ms_MailOAuth2ClientIdTooltip_where_header' => 'Где получить Client ID и Client Secret:',

    // Google
    'ms_MailOAuth2ClientIdTooltip_google' => 'Для Google (Gmail):',
    'ms_MailOAuth2ClientIdTooltip_google_step1' => '1. Перейдите в Google Cloud Console (console.cloud.google.com)',
    'ms_MailOAuth2ClientIdTooltip_google_step2' => '2. Создайте новый проект или выберите существующий',
    'ms_MailOAuth2ClientIdTooltip_google_step3' => '3. Включите Gmail API и создайте учетные данные OAuth 2.0',
    'ms_MailOAuth2ClientIdTooltip_google_step4' => '4. Скачайте или скопируйте Client ID и Client Secret',

    // Microsoft
    'ms_MailOAuth2ClientIdTooltip_microsoft' => 'Для Microsoft (Outlook, Office 365):',
    'ms_MailOAuth2ClientIdTooltip_microsoft_step1' => '1. Перейдите в Azure Portal (portal.azure.com)',
    'ms_MailOAuth2ClientIdTooltip_microsoft_step2' => '2. Зарегистрируйте новое приложение в Azure Active Directory',
    'ms_MailOAuth2ClientIdTooltip_microsoft_step3' => '3. Добавьте разрешения для Microsoft Graph (Mail.Send)',
    'ms_MailOAuth2ClientIdTooltip_microsoft_step4' => '4. Создайте секрет приложения и скопируйте Application ID и Secret',

    // Yandex
    'ms_MailOAuth2ClientIdTooltip_yandex' => 'Для Яндекс:',
    'ms_MailOAuth2ClientIdTooltip_yandex_step1' => '1. Перейдите на oauth.yandex.ru',
    'ms_MailOAuth2ClientIdTooltip_yandex_step2' => '2. Создайте новое приложение с доступом к почте',
    'ms_MailOAuth2ClientIdTooltip_yandex_step3' => '3. Скопируйте ID приложения и секретный ключ',

    // Examples
    'ms_MailOAuth2ClientIdTooltip_example' => 'Примеры Client ID:',
    'ms_MailOAuth2ClientIdTooltip_warning' => 'Храните Client Secret в безопасности! Не передавайте его третьим лицам и не публикуйте в открытых источниках.',
    'ms_MailOAuth2ClientIdTooltip_note' => 'После создания приложения добавьте URL вашей PBX в список разрешенных для перенаправления.',

    // Tooltip translations for SystemEmailForMissed
    'ms_SystemEmailForMissedTooltip_header' => 'Email для уведомлений о пропущенных вызовах',
    'ms_SystemEmailForMissedTooltip_desc' => 'Общий адрес электронной почты для отправки уведомлений о пропущенных внешних вызовах.',
    'ms_SystemEmailForMissedTooltip_how_it_works' => 'Как работает:',
    'ms_SystemEmailForMissedTooltip_internal_calls' => 'Внутренние вызовы: уведомления отправляются на личный email сотрудника из его карточки',
    'ms_SystemEmailForMissedTooltip_external_calls' => 'Внешние вызовы: если у сотрудника не указан email, используется этот общий адрес',
    'ms_SystemEmailForMissedTooltip_no_personal' => 'Без личного email: все уведомления о внешних звонках идут на этот адрес',
    'ms_SystemEmailForMissedTooltip_usage_examples' => 'Примеры использования:',
    'ms_SystemEmailForMissedTooltip_example_reception' => 'Email отдела продаж или приёмной для контроля пропущенных клиентских звонков',
    'ms_SystemEmailForMissedTooltip_example_manager' => 'Email менеджера для мониторинга неотвеченных обращений',
    'ms_SystemEmailForMissedTooltip_example_crm' => 'Интеграция с CRM-системой для автоматической регистрации пропущенных звонков',
    'ms_SystemEmailForMissedTooltip_recommendations' => 'Рекомендации:',
    'ms_SystemEmailForMissedTooltip_use_group' => 'Используйте групповой почтовый ящик для коллективной обработки',
    'ms_SystemEmailForMissedTooltip_configure_personal' => 'Настройте личные email сотрудников для персонализированных уведомлений',
    'ms_SystemEmailForMissedTooltip_monitor_regularly' => 'Обеспечьте регулярную проверку этого почтового ящика',
    'ms_SystemEmailForMissedTooltip_note' => 'Если поле оставлено пустым, уведомления о пропущенных внешних звонках не будут отправляться сотрудникам без личного email',

    // Tooltip translations for VoicemailNotificationsEmail
    'ms_VoicemailNotificationsEmailTooltip_header' => 'Email для голосовой почты',
    'ms_VoicemailNotificationsEmailTooltip_desc' => 'Единый адрес электронной почты для централизованной отправки всех голосовых сообщений.',
    'ms_VoicemailNotificationsEmailTooltip_how_it_works' => 'Как работает:',
    'ms_VoicemailNotificationsEmailTooltip_priority_order' => 'Приоритет отправки голосовых сообщений:',
    'ms_VoicemailNotificationsEmailTooltip_personal_first' => '1. Личный email сотрудника (если указан в карточке)',
    'ms_VoicemailNotificationsEmailTooltip_common_second' => '2. Этот общий адрес (если личный не указан)',
    'ms_VoicemailNotificationsEmailTooltip_no_send' => '3. Не отправляется (если оба поля пустые)',
    'ms_VoicemailNotificationsEmailTooltip_usage_examples' => 'Сценарии использования:',
    'ms_VoicemailNotificationsEmailTooltip_example_secretary' => 'Email секретаря для централизованной обработки всех голосовых сообщений',
    'ms_VoicemailNotificationsEmailTooltip_example_archive' => 'Корпоративный архив для хранения копий всех голосовых сообщений',
    'ms_VoicemailNotificationsEmailTooltip_example_transcription' => 'Сервис транскрибации для автоматического преобразования голоса в текст',
    'ms_VoicemailNotificationsEmailTooltip_features' => 'Особенности:',
    'ms_VoicemailNotificationsEmailTooltip_audio_attachment' => 'Голосовое сообщение отправляется как аудио-вложение (WAV формат)',
    'ms_VoicemailNotificationsEmailTooltip_caller_info' => 'В письме указывается информация о звонившем и времени звонка',
    'ms_VoicemailNotificationsEmailTooltip_duration' => 'Длительность сообщения отображается в тексте письма',
    'ms_VoicemailNotificationsEmailTooltip_note' => 'Рекомендуется настроить личные email сотрудников для персонализированной доставки голосовых сообщений',


    // MailSMTPUseTLS Tooltip
    'ms_MailSMTPUseTLSTooltip_header' => 'Использование TLS шифрования',
    'ms_MailSMTPUseTLSTooltip_desc' => 'Настройка защищенного соединения с почтовым сервером',
    'ms_MailSMTPUseTLSTooltip_whatisit' => 'Что это такое?',
    'ms_MailSMTPUseTLSTooltip_whatisit_desc' => 'TLS (Transport Layer Security) — протокол шифрования, который защищает передачу email от перехвата и подмены. Является современным стандартом защиты почтовых соединений.',

    'ms_MailSMTPUseTLSTooltip_when_enabled' => 'Когда включено (рекомендуется):',
    'ms_MailSMTPUseTLSTooltip_starttls_used' => 'Используется протокол STARTTLS для обновления соединения до защищенного',
    'ms_MailSMTPUseTLSTooltip_port_587' => 'Обычно используется порт 587 (стандарт для защищенной отправки)',
    'ms_MailSMTPUseTLSTooltip_encryption_upgrade' => 'Соединение начинается открытым и обновляется до зашифрованного',
    'ms_MailSMTPUseTLSTooltip_modern_standard' => 'Поддерживается всеми современными почтовыми провайдерами',

    'ms_MailSMTPUseTLSTooltip_when_disabled' => 'Когда выключено:',
    'ms_MailSMTPUseTLSTooltip_no_encryption' => 'Данные передаются в открытом виде без шифрования',
    'ms_MailSMTPUseTLSTooltip_port_25' => 'Используется порт 25 (устаревший, часто блокируется провайдерами)',
    'ms_MailSMTPUseTLSTooltip_auto_tls_disabled' => 'Автоматическое обновление до TLS отключается (SMTPAutoTLS = false)',
    'ms_MailSMTPUseTLSTooltip_legacy_servers' => 'Может требоваться для старых почтовых серверов',

    'ms_MailSMTPUseTLSTooltip_port_recommendations' => 'Рекомендации по портам:',
    'ms_MailSMTPUseTLSTooltip_port_25_desc' => 'Порт 25: устаревший, без шифрования, часто заблокирован',
    'ms_MailSMTPUseTLSTooltip_port_587_desc' => 'Порт 587: стандарт для STARTTLS, рекомендуется',
    'ms_MailSMTPUseTLSTooltip_port_465_desc' => 'Порт 465: SSL/TLS с самого начала (не STARTTLS)',

    'ms_MailSMTPUseTLSTooltip_provider_settings' => 'Настройки популярных провайдеров:',
    'ms_MailSMTPUseTLSTooltip_gmail' => 'Gmail: включить TLS, порт 587',
    'ms_MailSMTPUseTLSTooltip_outlook' => 'Outlook/Office365: включить TLS, порт 587',
    'ms_MailSMTPUseTLSTooltip_yandex' => 'Яндекс: включить TLS, порт 587',
    'ms_MailSMTPUseTLSTooltip_mailru' => 'Mail.ru: включить TLS, порт 465 или 587',

    'ms_MailSMTPUseTLSTooltip_warning' => 'Отключение TLS делает вашу почтовую переписку уязвимой для перехвата! Используйте незащищенное соединение только в изолированных сетях.',
    'ms_MailSMTPUseTLSTooltip_note' => 'Параметр "Проверять SSL сертификат" работает независимо от TLS и позволяет отключить проверку сертификатов для серверов с самоподписанными или недоверенными сертификатами.',

    // MailSMTPCertCheck tooltip
    'ms_MailSMTPCertCheckTooltip_header' => 'Проверка SSL-сертификата',
    'ms_MailSMTPCertCheckTooltip_desc' => 'Управляет проверкой подлинности SSL-сертификата почтового сервера при использовании защищенного соединения',
    'ms_MailSMTPCertCheckTooltip_when_enabled' => 'Когда включено:',
    'ms_MailSMTPCertCheckTooltip_verify_certificate' => 'Проверяется действительность SSL-сертификата',
    'ms_MailSMTPCertCheckTooltip_check_hostname' => 'Проверяется соответствие имени хоста сертификату',
    'ms_MailSMTPCertCheckTooltip_reject_selfsigned' => 'Отклоняются самоподписанные сертификаты',
    'ms_MailSMTPCertCheckTooltip_protect_mitm' => 'Защита от атак "человек посередине"',
    'ms_MailSMTPCertCheckTooltip_when_disabled' => 'Когда отключено:',
    'ms_MailSMTPCertCheckTooltip_accept_any_cert' => 'Принимается любой сертификат',
    'ms_MailSMTPCertCheckTooltip_allow_selfsigned' => 'Разрешены самоподписанные сертификаты',
    'ms_MailSMTPCertCheckTooltip_skip_hostname' => 'Не проверяется имя хоста',
    'ms_MailSMTPCertCheckTooltip_less_secure' => 'Менее безопасное соединение',
    'ms_MailSMTPCertCheckTooltip_when_use' => 'Когда включать:',
    'ms_MailSMTPCertCheckTooltip_public_servers' => 'Публичные почтовые серверы (Gmail, Яндекс, Mail.ru)',
    'ms_MailSMTPCertCheckTooltip_production_env' => 'Производственная среда',
    'ms_MailSMTPCertCheckTooltip_compliance' => 'Требования безопасности организации',
    'ms_MailSMTPCertCheckTooltip_when_disable' => 'Когда отключать:',
    'ms_MailSMTPCertCheckTooltip_internal_servers' => 'Внутренние почтовые серверы',
    'ms_MailSMTPCertCheckTooltip_test_env' => 'Тестовая среда',
    'ms_MailSMTPCertCheckTooltip_selfsigned_cert' => 'Серверы с самоподписанными сертификатами',
    'ms_MailSMTPCertCheckTooltip_legacy_servers' => 'Устаревшие почтовые серверы',
    'ms_MailSMTPCertCheckTooltip_warning' => 'Отключение проверки сертификата снижает безопасность соединения. Используйте только если уверены в надежности почтового сервера.',
    'ms_MailSMTPCertCheckTooltip_note' => 'Эта опция доступна только при использовании шифрования (STARTTLS или SSL/TLS) и автоматически скрывается при выборе незащищенного соединения.',

    // SMTP Connection Diagnostics
    // Error types
    'ms_DiagnosticErrorType_oauth2_auth_failed' => 'Ошибка OAuth2 аутентификации',
    'ms_DiagnosticErrorType_connection_failed' => 'Ошибка подключения',
    'ms_DiagnosticErrorType_encryption_failed' => 'Ошибка шифрования',
    'ms_DiagnosticErrorType_password_auth_failed' => 'Ошибка аутентификации',
    'ms_DiagnosticErrorType_protocol_mismatch' => 'Несоответствие протокола',
    'ms_DiagnosticErrorType_unknown' => 'Неизвестная ошибка',

    // Probable causes
    'ms_DiagnosticCause_oauth2_auth_failed' => 'Неудачная OAuth2 авторизация',
    'ms_DiagnosticCause_connection_refused' => 'Сервер отклонил соединение',
    'ms_DiagnosticCause_connection_timeout' => 'Превышено время ожидания соединения',
    'ms_DiagnosticCause_connection_failed' => 'Не удалось установить соединение с SMTP сервером',
    'ms_DiagnosticCause_ssl_tls_failed' => 'Ошибка SSL/TLS шифрования',
    'ms_DiagnosticCause_password_incorrect' => 'Неверные имя пользователя или пароль',
    'ms_DiagnosticCause_wrong_port_encryption' => 'Неправильный порт или тип шифрования для сервера',
    'ms_DiagnosticCause_unknown_error' => 'Неизвестная ошибка',
    'ms_DiagnosticCause_dns_resolution_failed' => 'Не удается найти SMTP сервер',
    'ms_DiagnosticCause_oauth2_gmail_535' => 'Google отклонил OAuth2 аутентификацию',
    'ms_DiagnosticCause_gmail_app_password_required' => 'Gmail требует пароль приложения',
    'ms_DiagnosticCause_network_unreachable' => 'SMTP сервер недоступен',
    'ms_DiagnosticCause_oauth2_connection_auth' => 'Ошибка OAuth2 аутентификации при подключении',

    // Detailed errors
    'ms_DiagnosticDetail_oauth2_535_error' => 'OAuth2 авторизация не удалась (ошибка 535) - недействительные учетные данные или истекший токен',
    'ms_DiagnosticDetail_oauth2_refresh_token_invalid' => 'Refresh token OAuth2 недействителен или истек',
    'ms_DiagnosticDetail_oauth2_insufficient_permissions' => 'У учетной записи OAuth2 нет разрешения на отправку писем',
    'ms_DiagnosticDetail_smtp_connection_refused' => 'SMTP сервер отклонил соединение - проверьте хост и порт',
    'ms_DiagnosticDetail_smtp_connection_timeout' => 'Превышено время ожидания подключения к SMTP серверу',
    'ms_DiagnosticDetail_smtp_connection_failed' => 'Не удалось установить соединение с SMTP сервером - проверьте настройки сети и сервера',
    'ms_DiagnosticDetail_ssl_certificate_failed' => 'Ошибка проверки SSL сертификата',
    'ms_DiagnosticDetail_ssl_handshake_failed' => 'Ошибка SSL/TLS рукопожатия',
    'ms_DiagnosticDetail_smtp_auth_535_error' => 'Аутентификация SMTP не удалась (535) - неверные имя пользователя/пароль',
    'ms_DiagnosticDetail_dns_lookup_failed' => 'Система не может найти указанный SMTP сервер в DNS',
    'ms_DiagnosticDetail_gmail_oauth2_535_error' => 'Google отклонил OAuth2 токены (ошибка 535) - возможно неверный адрес отправителя или истекшие токены',
    'ms_DiagnosticDetail_gmail_535_app_password' => 'Gmail требует пароль приложения вместо обычного пароля (ошибка 535)',
    'ms_DiagnosticDetail_server_unreachable' => 'SMTP сервер недоступен по сети - проверьте подключение к интернету или локальной сети',
    'ms_DiagnosticDetail_oauth2_connection_auth' => 'OAuth2 аутентификация не удалась при попытке подключения к SMTP серверу',

    // Hints and suggestions
    'ms_DiagnosticHint_check_sender_matches_oauth2' => 'Проверьте, что адрес отправителя соответствует авторизованной учетной записи OAuth2',
    'ms_DiagnosticHint_verify_client_credentials' => 'Проверьте правильность Client ID и Client Secret',
    'ms_DiagnosticHint_reauthorize_oauth2' => 'Попробуйте переавторизовать OAuth2 соединение',
    'ms_DiagnosticHint_reauthorize_oauth2_new_tokens' => 'Переавторизуйте OAuth2 соединение для получения новых токенов',
    'ms_DiagnosticHint_check_gmail_send_as_permission' => 'Проверьте разрешения "Отправить как" в аккаунте Gmail',
    'ms_DiagnosticHint_verify_sender_authorized_gmail' => 'Убедитесь, что адрес отправителя авторизован в настройках Gmail',
    'ms_DiagnosticHint_verify_smtp_hostname' => 'Проверьте правильность имени SMTP сервера',
    'ms_DiagnosticHint_check_firewall_blocking' => 'Проверьте, что брандмауэр не блокирует соединение',
    'ms_DiagnosticHint_ensure_smtp_service_running' => 'Убедитесь, что служба SMTP запущена на сервере',
    'ms_DiagnosticHint_check_network_connectivity' => 'Проверьте сетевую связь с SMTP сервером',
    'ms_DiagnosticHint_server_overloaded_unreachable' => 'Сервер может быть перегружен или недоступен',
    'ms_DiagnosticHint_disable_ssl_verification' => 'Попробуйте отключить проверку SSL сертификата',
    'ms_DiagnosticHint_check_valid_ssl_certificate' => 'Проверьте, что у сервера есть действительный SSL сертификат',
    'ms_DiagnosticHint_check_encryption_type_matches' => 'Проверьте, что тип шифрования соответствует требованиям сервера',
    'ms_DiagnosticHint_try_different_encryption' => 'Попробуйте другой метод шифрования (TLS/SSL/Нет)',
    'ms_DiagnosticHint_verify_username_password' => 'Проверьте правильность имени пользователя и пароля',
    'ms_DiagnosticHint_check_app_specific_password' => 'Проверьте, требует ли учетная запись пароль приложения',
    'ms_DiagnosticHint_ensure_smtp_auth_allowed' => 'Убедитесь, что учетная запись разрешает SMTP аутентификацию',
    'ms_DiagnosticHint_check_port_matches_encryption' => 'Проверьте, что порт соответствует типу шифрования',
    'ms_DiagnosticHint_common_port_combinations' => 'Обычные комбинации: 587+TLS, 465+SSL, 25+Нет',
    'ms_DiagnosticHint_gmail_sender_must_match' => 'Для Gmail: адрес отправителя должен совпадать с учетной записью OAuth2 или быть её псевдонимом',
    'ms_DiagnosticHint_check_send_mail_as_settings' => 'Проверьте настройки "Отправка почты от имени" в Gmail',
    'ms_DiagnosticHint_try_ip_instead_hostname' => 'Попробуйте использовать IP адрес вместо имени хоста',
    'ms_DiagnosticHint_verify_oauth2_tokens_valid' => 'Проверьте, что OAuth2 токены не истекли',
    'ms_DiagnosticHint_use_app_specific_password' => 'Используйте пароль приложения вместо основного пароля',
    'ms_DiagnosticHint_enable_2fa_gmail' => 'Включите двухфакторную аутентификацию и создайте пароль приложения',
    'ms_DiagnosticHint_verify_username_exact_email' => 'Убедитесь, что имя пользователя - это точный email адрес',
    'ms_DiagnosticHint_check_server_hostname_port' => 'Проверьте правильность имени сервера и номера порта',
    'ms_DiagnosticHint_verify_network_connectivity' => 'Проверьте подключение к интернету или локальной сети',

    // Diagnostic UI labels
    'ms_DiagnosticConnectionFailed' => 'Подключение не удалось',
    'ms_DiagnosticAuthorized' => 'Авторизовано',
    'ms_DiagnosticProbableCause' => 'Вероятная причина:',
    'ms_DiagnosticTechnicalDetails' => 'Технические подробности',

    // MS - Email Notification System
    // Common
    'ms_EmailNotification_Server' => 'Сервер',
    'ms_EmailNotification_Footer_AutomatedNotification' => 'Это автоматическое уведомление. Пожалуйста, не отвечайте на это письмо.',
    'ms_EmailNotification_Footer_PoweredBy' => 'Работает на',

    // Voicemail Notifications
    'ms_EmailNotification_Voicemail_Subject' => 'Новое голосовое сообщение',
    'ms_EmailNotification_Voicemail_Preheader' => 'Вы получили новое голосовое сообщение',
    'ms_EmailNotification_Voicemail_Message' => 'На ваш почтовый ящик поступило новое голосовое сообщение.',
    'ms_EmailNotification_Voicemail_From' => 'От',
    'ms_EmailNotification_Voicemail_Number' => 'Номер',
    'ms_EmailNotification_Voicemail_Mailbox' => 'Почтовый ящик',
    'ms_EmailNotification_Voicemail_Duration' => 'Длительность',
    'ms_EmailNotification_Voicemail_Date' => 'Дата и время',
    'ms_EmailNotification_Voicemail_MessageNumber' => 'Номер сообщения',
    'ms_EmailNotification_Voicemail_AttachmentInfo' => 'Аудиозапись сообщения прикреплена к этому письму.',
    'ms_EmailNotification_Voicemail_HelpText' => 'Вы можете прослушать запись, открыв прикрепленный файл или позвонив на номер вашего почтового ящика.',

    // Login Notifications
    'ms_EmailNotification_Login_Subject' => 'Вход в панель администратора MikoPBX',
    'ms_EmailNotification_Login_Preheader' => 'Обнаружен новый вход в систему',
    'ms_EmailNotification_Login_Message' => 'Зафиксирован вход в административную панель вашей АТС.',
    'ms_EmailNotification_Login_Username' => 'Пользователь',
    'ms_EmailNotification_Login_IPAddress' => 'IP адрес',
    'ms_EmailNotification_Login_Browser' => 'Браузер',
    'ms_EmailNotification_Login_Time' => 'Время входа',
    'ms_EmailNotification_Login_SecurityNotice' => 'Если это были не вы',
    'ms_EmailNotification_Login_SecurityAction' => 'Если вы не выполняли вход в систему, немедленно измените пароль и проверьте настройки безопасности.',
    'ms_EmailNotification_Login_GoToAdminPanel' => 'Перейти в панель управления',
    'ms_EmailNotification_Login_HelpText' => 'Это уведомление отправляется каждый раз при входе в административную панель для обеспечения безопасности системы.',

    // Missed Call Notifications
    'ms_EmailNotification_MissedCall_Subject' => 'Пропущенный вызов',
    'ms_EmailNotification_MissedCall_Preheader' => 'У вас пропущенный вызов',
    'ms_EmailNotification_MissedCall_From' => 'От кого',
    'ms_EmailNotification_MissedCall_ToExtension' => 'Кому',
    'ms_EmailNotification_MissedCall_Time' => 'Время вызова',
    'ms_EmailNotification_MissedCall_Footer' => 'Пожалуйста, свяжитесь с абонентом при первой возможности.',
    'ms_EmailNotification_MissedCall_ManagePreferences' => 'Управление настройками уведомлений',

    // Disk Space Notifications
    'ms_EmailNotification_DiskSpace_Subject' => 'Предупреждение: Заканчивается место на диске',
    'ms_EmailNotification_DiskSpace_Preheader' => 'Дисковое пространство критически мало',
    'ms_EmailNotification_DiskSpace_Message' => 'На вашей телефонной станции заканчивается свободное место на диске хранения данных.',
    'ms_EmailNotification_DiskSpace_CurrentUsage' => 'Текущее использование',
    'ms_EmailNotification_DiskSpace_AvailableSpace' => 'Доступно',
    'ms_EmailNotification_DiskSpace_Threshold' => 'Критический порог',
    'ms_EmailNotification_DiskSpace_GoToAdminPanel' => 'Перейти к управлению хранилищем',
    'ms_EmailNotification_DiskSpace_HelpText' => 'Рекомендуется освободить место или увеличить размер диска для предотвращения проблем с записью звонков и работой системы.',

    // Security Log Growth Notifications
    'ms_EmailNotification_SecurityLog_Subject' => 'Предупреждение безопасности: Подозрительная активность в логе безопасности',
    'ms_EmailNotification_SecurityLog_Preheader' => 'Обнаружен быстрый рост лога безопасности Asterisk',
    'ms_EmailNotification_SecurityLog_Message' => 'Обнаружен подозрительно быстрый рост лога безопасности Asterisk, что может указывать на попытки атаки на вашу телефонную станцию.',
    'ms_EmailNotification_SecurityLog_Critical' => 'КРИТИЧЕСКИЙ УРОВЕНЬ',
    'ms_EmailNotification_SecurityLog_Warning' => 'Предупреждение',
    'ms_EmailNotification_SecurityLog_GrowthRate' => 'Скорость роста',
    'ms_EmailNotification_SecurityLog_During' => 'за',
    'ms_EmailNotification_SecurityLog_PossibleCauses' => 'Возможные причины',
    'ms_EmailNotification_SecurityLog_Cause_BruteForce' => 'Атака методом перебора паролей (brute force)',
    'ms_EmailNotification_SecurityLog_Cause_Scanning' => 'Сканирование портов и служб',
    'ms_EmailNotification_SecurityLog_Cause_Misconfiguration' => 'Неправильная настройка безопасности или сетевого экрана',
    'ms_EmailNotification_SecurityLog_CheckFirewall' => 'Проверить настройки безопасности',
    'ms_EmailNotification_SecurityLog_HelpText' => 'Рекомендуется немедленно проверить лог безопасности Asterisk, настройки сетевого экрана и Fail2Ban. При необходимости ограничьте доступ к станции только из доверенных IP-адресов.',

    // SSH Password Changed Notifications
    'ms_EmailNotification_SSHPassword_Subject' => 'Внимание: Изменен SSH пароль',
    'ms_EmailNotification_SSHPassword_Preheader' => 'SSH пароль был изменен',
    'ms_EmailNotification_SSHPassword_ChangedBy' => 'Изменено',
    'ms_EmailNotification_SSHPassword_IPAddress' => 'IP адрес',
    'ms_EmailNotification_SSHPassword_Time' => 'Время изменения',
    'ms_EmailNotification_SSHPassword_SecurityNotice' => 'Предупреждение безопасности',
    'ms_EmailNotification_SSHPassword_SecurityAction' => 'SSH пароль был изменен вне веб-интерфейса MikoPBX. Если это были не вы, немедленно проверьте настройки безопасности.',
    'ms_EmailNotification_SSHPassword_ReviewSecuritySettings' => 'Проверить настройки безопасности',
    'ms_EmailNotification_SSHPassword_Footer' => 'Это критическое уведомление безопасности. Игнорирование этого сообщения может привести к компрометации системы.',

    // System Problems Notifications
    'ms_EmailNotification_SystemProblems_Subject' => 'Обнаружены проблемы в работе MikoPBX',
    'ms_EmailNotification_SystemProblems_Preheader' => 'Требуется внимание администратора',
    'ms_EmailNotification_SystemProblems_DetectedProblems' => 'Обнаруженные проблемы',
    'ms_EmailNotification_SystemProblems_ActionRequired' => 'Требуются действия',
    'ms_EmailNotification_SystemProblems_PleaseResolve' => 'Пожалуйста, устраните выявленные проблемы как можно скорее для обеспечения стабильной работы телефонной станции.',
    'ms_EmailNotification_SystemProblems_GoToAdminPanel' => 'Перейти в панель управления',
    'ms_EmailNotification_SystemProblems_HelpText' => 'Если вам нужна помощь в устранении проблем, обратитесь в техническую поддержку или посетите нашу базу знаний.',

    // SMTP Test Notifications
    'ms_EmailNotification_SMTPTest_Subject' => 'Тест настроек SMTP',
    'ms_EmailNotification_SMTPTest_Preheader' => 'Проверка конфигурации почтового сервера',
    'ms_EmailNotification_SMTPTest_Message' => 'Это тестовое письмо для проверки настроек вашего почтового сервера.',
    'ms_EmailNotification_SMTPTest_Successful' => 'Поздравляем! Настройки SMTP работают корректно.',
    'ms_EmailNotification_SMTPTest_SMTPServer' => 'SMTP сервер',
    'ms_EmailNotification_SMTPTest_Port' => 'Порт',
    'ms_EmailNotification_SMTPTest_Encryption' => 'Шифрование',
    'ms_EmailNotification_SMTPTest_Authentication' => 'Аутентификация',
    'ms_EmailNotification_SMTPTest_FromAddress' => 'Адрес отправителя',
    'ms_EmailNotification_SMTPTest_OAuth2Provider' => 'OAuth2 провайдер',
    'ms_EmailNotification_SMTPTest_Configured' => 'Настроено',
    'ms_EmailNotification_SMTPTest_Working' => 'Работает',
    'ms_EmailNotification_SMTPTest_Passed' => 'Пройдено',
    'ms_EmailNotification_SMTPTest_HelpText' => 'Если вы получили это письмо, значит ваша почтовая конфигурация настроена правильно и готова к отправке уведомлений.',

];
