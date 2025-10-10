<?php
return [
    // General errors
    'pk_InvalidRequest' => 'Неверный запрос',

    // Authentication errors
    'pk_LoginRequired' => 'Требуется указать логин',
    'pk_OriginRequired' => 'Требуется указать origin для WebAuthn',
    'pk_NoPasskeysFound' => 'Passkeys не найдены для данного логина',
    'pk_ChallengeIdRequired' => 'Требуется указать идентификатор challenge',
    'pk_CredentialIdRequired' => 'Требуется указать идентификатор credential',
    'pk_ChallengeNotFound' => 'Challenge не найден или истёк',
    'pk_PasskeyNotFound' => 'Passkey не найден',
    'pk_LoginMismatch' => 'Несоответствие логина',
    'pk_SessionBuildFailed' => 'Не удалось создать параметры сессии',
    'pk_UserHandleRequired' => 'Требуется userHandle для аутентификации без логина',

    // Registration errors
    'pk_SessionIdRequired' => 'Требуется идентификатор сессии',
    'pk_UserNotAuthenticated' => 'Пользователь не авторизован',

    // CRUD errors
    'pk_PasskeyIdRequired' => 'Требуется указать ID passkey',
    'pk_PasskeyNotFoundOrDenied' => 'Passkey не найден или доступ запрещён',
    'pk_NameRequired' => 'Требуется указать название passkey',

    // Success messages
    'pk_PasskeyDeleted' => 'Passkey успешно удалён',
    'pk_PasskeyUpdated' => 'Passkey успешно обновлён',

     // Passkeys section
     'pk_PasskeysTitle' => 'Passkeys (биометрическая аутентификация)',
     'pk_PasskeysDescription' => 'Passkeys позволяют входить в систему используя биометрию (Face ID, Touch ID, Windows Hello) или аппаратный ключ безопасности.',
     'Passkeys' => 'Passkeys - это современный способ аутентификации без пароля. Используйте биометрию или аппаратный ключ для быстрого и безопасного входа.',
     'pk_AddPasskey' => 'Добавить Passkey',
     'pk_NoPasskeys' => 'Здесь будут ваши Passkeys',
     'pk_EmptyDescription' => 'Passkeys позволяют входить в систему без пароля, используя биометрию (Face ID, Touch ID, Windows Hello) или аппаратный ключ безопасности (YubiKey). Это быстрее и безопаснее традиционных паролей.',
     'pk_ReadDocs' => 'Ознакомиться с документацией',
 
     // Table columns
     'pk_ColumnName' => 'Название',
     'pk_ColumnCreated' => 'Создано',
     'pk_ColumnLastUsed' => 'Последнее использование',
     'pk_ColumnActions' => 'Действия',
 
     // Actions
     'pk_Rename' => 'Переименовать',
     'pk_Delete' => 'Удалить',
     'pk_DeleteConfirm' => 'Вы уверены что хотите удалить этот Passkey?',
 
     // Registration dialog
     'pk_RegisterTitle' => 'Регистрация нового Passkey',
     'pk_RegisterName' => 'Название (например: iPhone 15, YubiKey)',
     'pk_RegisterButton' => 'Зарегистрировать',
     'pk_RegisterCancel' => 'Отмена',
     'pk_RegisterProcessing' => 'Следуйте инструкциям на экране для завершения регистрации...',
 
     // Messages
     'pk_RegisterSuccess' => 'Passkey успешно зарегистрирован',
     'pk_RegisterError' => 'Ошибка регистрации Passkey',
     'pk_RegisterCancelled' => 'Регистрация Passkey отменена',
     'pk_DeleteSuccess' => 'Passkey успешно удалён',
     'pk_DeleteError' => 'Ошибка удаления Passkey',
     'pk_RenameSuccess' => 'Passkey успешно переименован',
     'pk_RenameError' => 'Ошибка переименования Passkey',
     'pk_NotSupported' => 'Ваш браузер не поддерживает Passkeys',
 
     // Login page
     'pk_LoginButton' => 'Войти с Passkey',
     'pk_LoginOr' => 'или',
     'pk_LoginProcessing' => 'Выполняется вход через Passkey...',
     'pk_LoginError' => 'Ошибка входа через Passkey',
     'pk_LoginNoPasskeys' => 'Для этого пользователя нет зарегистрированных Passkeys',

     // Tooltip
     'pk_PasskeysTooltip_header' => 'Passkeys (биометрическая аутентификация)',
     'pk_PasskeysTooltip_desc' => 'Passkeys — это современный стандарт аутентификации без паролей, основанный на технологии WebAuthn. Позволяет входить в систему используя биометрию или аппаратные ключи безопасности.',
     'pk_PasskeysTooltip_what_is' => 'Что такое Passkeys?',
     'pk_PasskeysTooltip_what_is_desc' => 'Passkeys — это криптографические ключи, хранящиеся на вашем устройстве. Они заменяют традиционные пароли более безопасной технологией.',
     'pk_PasskeysTooltip_supported_methods' => 'Поддерживаемые методы аутентификации',
     'pk_PasskeysTooltip_method_biometric' => '📱 Биометрия: Face ID, Touch ID, Windows Hello',
     'pk_PasskeysTooltip_method_hardware' => '🔑 Аппаратные ключи: YubiKey, Titan Key',
     'pk_PasskeysTooltip_method_platform' => '💻 Встроенные средства: PIN-код устройства',
     'pk_PasskeysTooltip_advantages' => 'Преимущества использования',
     'pk_PasskeysTooltip_advantage_security' => 'Защита от фишинга и перехвата данных',
     'pk_PasskeysTooltip_advantage_speed' => 'Быстрая аутентификация (1-2 секунды)',
     'pk_PasskeysTooltip_advantage_no_passwords' => 'Не нужно запоминать пароли',
     'pk_PasskeysTooltip_advantage_unique' => 'Уникальные ключи для каждого сайта',
     'pk_PasskeysTooltip_how_to_use' => 'Как использовать',
     'pk_PasskeysTooltip_use_step_1' => 'Нажмите "Добавить Passkey" в таблице ниже',
     'pk_PasskeysTooltip_use_step_2' => 'Следуйте инструкциям браузера для регистрации',
     'pk_PasskeysTooltip_use_step_3' => 'При следующем входе используйте Passkey вместо пароля',
     'pk_PasskeysTooltip_compatibility' => 'Совместимость',
     'pk_PasskeysTooltip_compatibility_desc' => 'Работает в современных браузерах Chrome, Safari, Edge, Firefox (версии 2023 года и новее). Требуется поддержка WebAuthn на устройстве.',
     'pk_PasskeysTooltip_security' => 'Безопасность',
     'pk_PasskeysTooltip_security_desc' => 'Приватные ключи никогда не покидают устройство. Сервер хранит только публичный ключ, который бесполезен для злоумышленников.',
     'pk_PasskeysTooltip_note' => '💡 Рекомендуем зарегистрировать несколько Passkeys на разных устройствах для резервного доступа.',
];
