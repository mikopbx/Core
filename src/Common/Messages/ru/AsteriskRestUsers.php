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
    'ari_Description' => 'Описание',
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
];