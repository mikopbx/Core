<?php
/**
 * Asterisk REST Interface (ARI) users translations
 */

return [
    // Menu and breadcrumbs
    'mm_AsteriskRestUsers' => 'Доступ к ARI',
    'ari_BreadcrumbAsteriskRestUsers' => 'Пользователи ARI',
    'ari_BreadcrumbCreate' => 'Создать',
    'ari_BreadcrumbModify' => 'Редактировать',
    
    // Page titles and descriptions
    'ari_Title' => 'Управление пользователями ARI',
    'ari_Description' => 'Asterisk REST Interface (ARI) позволяет управлять Asterisk через WebSocket и REST API',
    'ari_UserSettingsDescription' => 'Настройки пользователя для доступа к Asterisk REST Interface',
    'ari_NewUser' => 'Новый пользователь ARI',
    'ari_EditUser' => 'Редактирование пользователя ARI',
    
    // Buttons
    'ari_AddNewUser' => 'Добавить пользователя',
    'ari_CreateFirstUser' => 'Создать первого пользователя',
    'ari_SaveUser' => 'Сохранить пользователя',
    'ari_DeleteUser' => 'Удалить пользователя',
    
    // Table columns
    'ari_Username' => 'Имя пользователя',
    'ari_Password' => 'Пароль',
    'ari_Applications' => 'Приложения',
    'ari_Status' => 'Статус',
    'ari_Enabled' => 'Включен',
    'ari_Disabled' => 'Выключен',
    'ari_EnableUser' => 'Включить пользователя',
    
    // Form fields and placeholders
    'ari_UsernamePlaceholder' => 'например, ari_user',
    'ari_PasswordPlaceholder' => 'Введите пароль или сгенерируйте новый',
    'ari_DescriptionPlaceholder' => 'Описание пользователя (необязательно)',
    'ari_ApplicationsPlaceholder' => 'Все приложения (если не указано)',
    'ari_EnabledTooltip' => 'Включить или выключить доступ для этого пользователя',
    
    // Applications help
    'ari_ApplicationsHelp' => 'Укажите имена Stasis приложений, к которым имеет доступ пользователь. Оставьте пустым для доступа ко всем приложениям.',
    
    // Connection info
    'ari_ConnectionInfo' => 'Информация для подключения',
    'ari_WebSocketURL' => 'WebSocket URL',
    'ari_RESTURL' => 'REST API URL',
    'ari_SecureWebSocketURL' => 'Защищенный WebSocket URL (TLS)',
    
    // Messages
    'ari_NoUsersFound' => 'Пользователи ARI не найдены',
    'ari_PasswordGenerated' => 'Новый пароль сгенерирован',
    'ari_SaveSuccess' => 'Пользователь ARI успешно сохранен',
    'ari_SaveError' => 'Ошибка при сохранении пользователя ARI',
    'ari_DeleteSuccess' => 'Пользователь ARI успешно удален',
    'ari_DeleteError' => 'Ошибка при удалении пользователя ARI',
    'ari_ConfirmDelete' => 'Вы уверены, что хотите удалить пользователя "{0}"?',
    'ari_UsernameNotUnique' => 'Это имя пользователя уже используется',
    'ari_EmptyTableTitle' => 'Пользователи ARI еще не созданы',
    'ari_EmptyTableDescription' => 'Создайте первого пользователя для доступа к Asterisk REST Interface',
    'ari_ErrorThisUsernameInNotAvailable' => 'Это имя пользователя уже занято',
    
    // Validation messages
    'ari_ValidateUsernameEmpty' => 'Имя пользователя не может быть пустым',
    'ari_ValidateUsernameFormat' => 'Имя пользователя может содержать только латинские буквы, цифры и символ подчеркивания',
    'ari_ValidatePasswordEmpty' => 'Пароль не может быть пустым',
    
    // Info messages
    'ari_InfoSystemUser' => 'Это системный пользователь и не может быть удален',
    'ari_InfoWebSocketConnection' => 'Используйте эти URL для подключения к ARI через WebSocket или REST API',
    'ari_InfoApplicationsAccess' => 'Пользователь имеет доступ только к указанным Stasis приложениям',
    'ari_InfoFullAccess' => 'Пользователь имеет доступ ко всем Stasis приложениям',
    
    // Settings
    'ari_SettingsEnabled' => 'ARI включен',
    'ari_SettingsAllowedOrigins' => 'Разрешенные источники CORS',
    'ari_SettingsAllowedOriginsHelp' => 'Список доменов для CORS (через запятую). Используйте * для разрешения всех источников.',
    
    // Connection info summary
    'ari_ConnectionInfoSummary' => 'Используйте учетные данные пользователя для подключения к ARI через WebSocket или REST API',
    
    // Tooltips for Applications field
    'ari_ApplicationsTooltip_header' => 'Stasis приложения',
    'ari_ApplicationsTooltip_desc' => 'Укажите имена Stasis приложений, к которым имеет доступ пользователь',
    'ari_ApplicationsTooltip_usage_header' => 'Использование',
    'ari_ApplicationsTooltip_usage_desc' => 'Оставьте поле пустым для доступа ко всем приложениям. Укажите конкретные приложения для ограничения доступа.',
    'ari_ApplicationsTooltip_common_header' => 'Распространенные приложения',
    'ari_ApplicationsTooltip_common_ari_app' => 'Основное приложение для ARI',
    'ari_ApplicationsTooltip_common_stasis' => 'Базовое Stasis приложение',
    'ari_ApplicationsTooltip_common_external_media' => 'Работа с внешними медиа-потоками',
    'ari_ApplicationsTooltip_common_bridge_app' => 'Управление мостами вызовов',
    'ari_ApplicationsTooltip_common_channel_spy' => 'Прослушивание каналов',
    'ari_ApplicationsTooltip_warning_header' => 'Внимание',
    'ari_ApplicationsTooltip_warning' => 'Ограничение доступа к приложениям влияет на функциональность ARI клиента',
    
    // Tooltips for Connection Info
    'ari_ConnectionInfoTooltip_header' => 'Параметры подключения',
    'ari_ConnectionInfoTooltip_desc' => 'Используйте эти параметры для настройки подключения к Asterisk REST Interface',
    'ari_ConnectionInfoTooltip_websocket_header' => 'WebSocket подключение',
    'ari_ConnectionInfoTooltip_websocket_url' => 'Обычный WebSocket',
    'ari_ConnectionInfoTooltip_websocket_secure' => 'Защищенный WebSocket (TLS)',
    'ari_ConnectionInfoTooltip_rest_header' => 'REST API',
    'ari_ConnectionInfoTooltip_rest_url' => 'HTTP endpoint',
    'ari_ConnectionInfoTooltip_rest_secure' => 'HTTPS endpoint',
    'ari_ConnectionInfoTooltip_auth_header' => 'Аутентификация',
    'ari_ConnectionInfoTooltip_auth_desc' => 'Используйте имя пользователя и пароль из этой формы для Basic Authentication',
    'ari_ConnectionInfoTooltip_examples_header' => 'Пример подключения',
    'ari_ConnectionInfoTooltip_examples' => '# WebSocket с аутентификацией|ws://username:password@server:8088/ari/events?app=my-app&subscribe=all||# REST API запрос|curl -u username:password http://server:8088/ari/channels',
    'ari_ConnectionInfoTooltip_note' => 'Замените [application] на имя вашего Stasis приложения',
    'ari_ConnectionInfoTooltip_server_placeholder' => 'ваш-сервер',
    
    // Other tooltips
    'ari_SystemUserReadOnly' => 'Системный пользователь доступен только для чтения',
    'ari_ErrorLoadingUser' => 'Ошибка при загрузке данных пользователя',

    // REST API parameter descriptions (request fields)
    'rest_param_aru_username' => 'Имя пользователя для доступа к ARI',
    'rest_param_aru_password' => 'Пароль для аутентификации в ARI',
    'rest_param_aru_applications' => 'Список Stasis приложений, к которым имеет доступ пользователь (пустой массив = все приложения)',
    'rest_param_aru_description' => 'Описание пользователя ARI',
    'rest_param_aru_weak_password' => 'Индикатор надежности пароля (0 - неизвестно, 1 - надежный, 2 - слабый)',
    'rest_param_aru_object' => 'Объект пользователя Asterisk REST Interface (ARI)',

    // REST API schema descriptions (response fields)
    'rest_schema_aru_id' => 'Уникальный идентификатор пользователя ARI',
    'rest_schema_aru_applications_summary' => 'Краткое описание доступных приложений',
    'rest_schema_aru_applications_count' => 'Количество приложений, к которым имеет доступ пользователь',
    'rest_schema_aru_object' => 'Объект пользователя Asterisk REST Interface (ARI)',
    'rest_schema_aru_represent' => 'Строковое представление пользователя ARI для отображения в выпадающих списках',

    // REST API operation descriptions
    'rest_aru_GetList' => 'Получить список пользователей ARI',
    'rest_aru_GetListDesc' => 'Возвращает список всех пользователей Asterisk REST Interface с поддержкой пагинации и фильтрации',
    'rest_aru_GetRecord' => 'Получить пользователя ARI',
    'rest_aru_GetRecordDesc' => 'Возвращает детальную информацию о конкретном пользователе ARI по его идентификатору',
    'rest_aru_Create' => 'Создать пользователя ARI',
    'rest_aru_CreateDesc' => 'Создает нового пользователя для доступа к Asterisk REST Interface с указанными параметрами',
    'rest_aru_Update' => 'Обновить пользователя ARI',
    'rest_aru_UpdateDesc' => 'Полностью заменяет данные существующего пользователя ARI (все поля обязательны)',
    'rest_aru_Patch' => 'Частично обновить пользователя ARI',
    'rest_aru_PatchDesc' => 'Обновляет только указанные поля существующего пользователя ARI',
    'rest_aru_Delete' => 'Удалить пользователя ARI',
    'rest_aru_DeleteDesc' => 'Удаляет пользователя ARI из системы по его идентификатору',
    'rest_aru_GetDefault' => 'Получить шаблон нового пользователя ARI',
    'rest_aru_GetDefaultDesc' => 'Возвращает объект с настройками по умолчанию для создания нового пользователя ARI',
];