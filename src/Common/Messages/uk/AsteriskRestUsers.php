<?php
/**
 * Asterisk REST Interface (ARI) users translations
 */

return [
    // Menu and breadcrumbs
    'mm_AsteriskRestUsers' => 'Доступ до ARI',
    'ari_BreadcrumbAsteriskRestUsers' => 'Користувачі ARI',
    'ari_BreadcrumbCreate' => 'Створити',
    'ari_BreadcrumbModify' => 'Редагувати',
    
    // Page titles and descriptions
    'ari_Title' => 'Керування користувачами ARI',
    'ari_Description' => 'Asterisk REST Interface (ARI) дозволяє керувати Asterisk через WebSocket і REST API',
    'ari_UserSettingsDescription' => 'Налаштування користувача для доступу до Asterisk REST Interface',
    'ari_NewUser' => 'Новий користувач ARI',
    'ari_EditUser' => 'Редагування користувача ARI',
    
    // Buttons
    'ari_AddNewUser' => 'Додати користувача',
    'ari_CreateFirstUser' => 'Створити першого користувача',
    'ari_SaveUser' => 'Зберегти користувача',
    'ari_DeleteUser' => 'Видалити користувача',
    
    // Table columns
    'ari_Username' => 'Ім\'я користувача',
    'ari_Password' => 'Пароль',
    'ari_Applications' => 'Застосунки',
    'ari_Status' => 'Статус',
    'ari_Enabled' => 'Увімкнено',
    'ari_Disabled' => 'Вимкнено',
    'ari_EnableUser' => 'Увімкнути користувача',
    
    // Form fields and placeholders
    'ari_UsernamePlaceholder' => 'наприклад, ari_user',
    'ari_PasswordPlaceholder' => 'Введіть пароль або згенеруйте новий',
    'ari_DescriptionPlaceholder' => 'Опис користувача (необов\'язково)',
    'ari_ApplicationsPlaceholder' => 'Усі застосунки (якщо не вказано)',
    'ari_EnabledTooltip' => 'Увімкнути або вимкнути доступ для цього користувача',
    
    // Applications help
    'ari_ApplicationsHelp' => 'Вкажіть імена Stasis-застосунків, до яких має доступ користувач. Залиште порожнім для доступу до всіх застосунків.',
    
    // Connection info
    'ari_ConnectionInfo' => 'Інформація для підключення',
    'ari_WebSocketURL' => 'WebSocket URL',
    'ari_RESTURL' => 'REST API URL',
    'ari_SecureWebSocketURL' => 'Захищений WebSocket URL (TLS)',
    
    // Messages
    'ari_NoUsersFound' => 'Користувачів ARI не знайдено',
    'ari_PasswordGenerated' => 'Новий пароль згенеровано',
    'ari_SaveSuccess' => 'Користувача ARI успішно збережено',
    'ari_SaveError' => 'Помилка під час збереження користувача ARI',
    'ari_DeleteSuccess' => 'Користувача ARI успішно видалено',
    'ari_DeleteError' => 'Помилка під час видалення користувача ARI',
    'ari_ConfirmDelete' => 'Ви впевнені, що хочете видалити користувача "{0}"?',
    'ari_UsernameNotUnique' => 'Це ім\'я користувача вже використовується',
    'ari_EmptyTableTitle' => 'Користувачів ARI ще не створено',
    'ari_EmptyTableDescription' => 'Створіть першого користувача для доступу до Asterisk REST Interface',
    'ari_ErrorThisUsernameInNotAvailable' => 'Це ім\'я користувача вже зайняте',
    
    // Validation messages
    'ari_ValidateUsernameEmpty' => 'Ім\'я користувача не може бути порожнім',
    'ari_ValidateUsernameFormat' => 'Ім\'я користувача може містити лише латинські літери, цифри та символ підкреслення',
    'ari_ValidatePasswordEmpty' => 'Пароль не може бути порожнім',
    
    // Info messages
    'ari_InfoSystemUser' => 'Це системний користувач, його не можна видалити',
    'ari_InfoWebSocketConnection' => 'Використовуйте ці URL для підключення до ARI через WebSocket або REST API',
    'ari_InfoApplicationsAccess' => 'Користувач має доступ лише до вказаних Stasis-застосунків',
    'ari_InfoFullAccess' => 'Користувач має доступ до всіх Stasis-застосунків',
    
    // Settings
    'ari_SettingsEnabled' => 'ARI увімкнено',
    'ari_SettingsAllowedOrigins' => 'Дозволені джерела CORS',
    'ari_SettingsAllowedOriginsHelp' => 'Список доменів для CORS (через кому). Використовуйте * для дозволу всіх джерел.',
    
    // Connection info summary
    'ari_ConnectionInfoSummary' => 'Використовуйте облікові дані користувача для підключення до ARI через WebSocket або REST API',
    
    // Tooltips for Applications field
    'ari_ApplicationsTooltip_header' => 'Stasis-застосунки',
    'ari_ApplicationsTooltip_desc' => 'Вкажіть імена Stasis-застосунків, до яких має доступ користувач',
    'ari_ApplicationsTooltip_usage_header' => 'Використання',
    'ari_ApplicationsTooltip_usage_desc' => 'Залиште поле порожнім для доступу до всіх застосунків. Вкажіть конкретні застосунки, щоб обмежити доступ.',
    'ari_ApplicationsTooltip_common_header' => 'Поширені застосунки',
    'ari_ApplicationsTooltip_common_ari_app' => 'Основний застосунок для ARI',
    'ari_ApplicationsTooltip_common_stasis' => 'Базовий Stasis-застосунок',
    'ari_ApplicationsTooltip_common_external_media' => 'Робота із зовнішніми медіапотоками',
    'ari_ApplicationsTooltip_common_bridge_app' => 'Керування мостами викликів',
    'ari_ApplicationsTooltip_common_channel_spy' => 'Прослуховування каналів',
    'ari_ApplicationsTooltip_warning_header' => 'Увага',
    'ari_ApplicationsTooltip_warning' => 'Обмеження доступу до застосунків впливає на функціональність ARI-клієнта',
    
    // Tooltips for Connection Info
    'ari_ConnectionInfoTooltip_header' => 'Параметри підключення',
    'ari_ConnectionInfoTooltip_desc' => 'Використовуйте ці параметри для налаштування підключення до Asterisk REST Interface',
    'ari_ConnectionInfoTooltip_websocket_header' => 'Підключення WebSocket',
    'ari_ConnectionInfoTooltip_websocket_url' => 'Звичайний WebSocket',
    'ari_ConnectionInfoTooltip_websocket_secure' => 'Захищений WebSocket (TLS)',
    'ari_ConnectionInfoTooltip_rest_header' => 'REST API',
    'ari_ConnectionInfoTooltip_rest_url' => 'HTTP endpoint',
    'ari_ConnectionInfoTooltip_rest_secure' => 'HTTPS endpoint',
    'ari_ConnectionInfoTooltip_auth_header' => 'Автентифікація',
    'ari_ConnectionInfoTooltip_auth_desc' => 'Використовуйте ім\'я користувача та пароль з цієї форми для Basic Authentication',
    'ari_ConnectionInfoTooltip_examples_header' => 'Приклад підключення',
    'ari_ConnectionInfoTooltip_examples' => '# WebSocket з автентифікацією|ws://username:password@server:8088/ari/events?app=my-app&subscribe=all||# Запит REST API|curl -u username:password http://server:8088/ari/channels',
    'ari_ConnectionInfoTooltip_note' => 'Замініть [application] на ім\'я вашого Stasis-застосунку',
    'ari_ConnectionInfoTooltip_server_placeholder' => 'ваш-сервер',
    
    // Other tooltips
    'ari_SystemUserReadOnly' => 'Системний користувач доступний лише для читання',
    'ari_ErrorLoadingUser' => 'Помилка під час завантаження даних користувача',

    // REST API parameter descriptions (request fields)
    'rest_param_aru_username' => 'Ім\'я користувача для доступу до ARI',
    'rest_param_aru_password' => 'Пароль для автентифікації в ARI',
    'rest_param_aru_applications' => 'Список Stasis-застосунків, до яких має доступ користувач (порожній масив = усі застосунки)',
    'rest_param_aru_description' => 'Опис користувача ARI',
    'rest_param_aru_weak_password' => 'Індикатор надійності пароля (0 - невідомо, 1 - надійний, 2 - слабкий)',
    'rest_param_aru_object' => 'Об\'єкт користувача Asterisk REST Interface (ARI)',

    // REST API schema descriptions (response fields)
    'rest_schema_aru_id' => 'Унікальний ідентифікатор користувача ARI',
    'rest_schema_aru_applications_summary' => 'Короткий опис доступних застосунків',
    'rest_schema_aru_applications_count' => 'Кількість застосунків, до яких має доступ користувач',
    'rest_schema_aru_object' => 'Об\'єкт користувача Asterisk REST Interface (ARI)',
    'rest_schema_aru_represent' => 'Рядкове подання користувача ARI для відображення у випадних списках',

    // REST API operation descriptions
    'rest_aru_GetList' => 'Отримати список користувачів ARI',
    'rest_aru_GetListDesc' => 'Повертає список усіх користувачів Asterisk REST Interface з підтримкою пагінації та фільтрації',
    'rest_aru_GetRecord' => 'Отримати користувача ARI',
    'rest_aru_GetRecordDesc' => 'Повертає детальну інформацію про конкретного користувача ARI за його ідентифікатором',
    'rest_aru_Create' => 'Створити користувача ARI',
    'rest_aru_CreateDesc' => 'Створює нового користувача для доступу до Asterisk REST Interface із зазначеними параметрами',
    'rest_aru_Update' => 'Оновити користувача ARI',
    'rest_aru_UpdateDesc' => 'Повністю замінює дані наявного користувача ARI (усі поля обов\'язкові)',
    'rest_aru_Patch' => 'Частково оновити користувача ARI',
    'rest_aru_PatchDesc' => 'Оновлює лише вказані поля наявного користувача ARI',
    'rest_aru_Delete' => 'Видалити користувача ARI',
    'rest_aru_DeleteDesc' => 'Видаляє користувача ARI із системи за його ідентифікатором',
    'rest_aru_GetDefault' => 'Отримати шаблон нового користувача ARI',
    'rest_aru_GetDefaultDesc' => 'Повертає об\'єкт із налаштуваннями за замовчуванням для створення нового користувача ARI',
];