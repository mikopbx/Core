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
];
