<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Авторизация пользователя',
    'rest_auth_LoginDesc' => 'Аутентификация пользователя и выдача JWT токенов. Поддерживает два метода: password (login+password) и passkey (sessionToken от WebAuthn). Возвращает accessToken (JWT, 15 мин) и устанавливает refreshToken в httpOnly cookie (30 дней).',

    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Обновить access token',
    'rest_auth_RefreshDesc' => 'Обновление JWT access token с использованием refresh token из cookie. Опционально ротирует refresh token для повышенной безопасности.',

    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Выход из системы',
    'rest_auth_LogoutDesc' => 'Удаление refresh token из базы данных и очистка cookie. JWT access token истечёт естественным образом через 15 минут.',

    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Логин пользователя для авторизации',
    'rest_param_auth_password' => 'Пароль пользователя',
    'rest_param_auth_sessionToken' => 'One-time токен сессии от passkey authentication (64 hex символа)',
    'rest_param_auth_rememberMe' => 'Запомнить меня (продлить срок действия refresh token)',
    'rest_param_auth_refreshToken' => 'Refresh token из httpOnly cookie для обновления access token',
    'rest_param_auth_clientIp' => 'IP-адрес клиента для отслеживания устройств',
    'rest_param_auth_userAgent' => 'User-Agent браузера/приложения для отслеживания устройств',

    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'JWT токен доступа для авторизации запросов (срок действия 15 минут)',
    'rest_schema_auth_tokenType' => 'Тип токена для заголовка Authorization (всегда "Bearer")',
    'rest_schema_auth_expiresIn' => 'Время до истечения access token в секундах',
    'rest_schema_auth_login' => 'Логин авторизованного пользователя',
    'rest_schema_auth_message' => 'Сообщение о результате операции',

    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Успешная авторизация. Возвращён access token и установлен refresh token cookie.',
    'rest_response_200_auth_refresh' => 'Access token успешно обновлён. Возможно ротирован refresh token.',
    'rest_response_200_auth_logout' => 'Успешный выход. Refresh token удалён из базы и cookie очищена.',

    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Слишком много попыток входа. Попробуйте через {interval} секунд.',
    'auth_LoginPasswordRequired' => 'Необходимо указать login+password или sessionToken',
    'auth_WrongLoginPassword' => 'Неверный логин или пароль',
    'auth_TokenSaveFailed' => 'Ошибка сохранения токена в базу данных',
    'auth_RefreshTokenMissing' => 'Refresh token отсутствует в cookie',
    'auth_RefreshTokenInvalid' => 'Невалидный refresh token',
    'auth_RefreshTokenExpired' => 'Refresh token истёк или не найден',
    'auth_InvalidSessionData' => 'Невалидные данные сессии',
    'auth_TokenUpdateFailed' => 'Ошибка обновления токена',
    'rest_response_401_invalid_credentials' => 'Неверные учётные данные',
    'rest_response_401_invalid_token' => 'Невалидный токен',
    'rest_response_403_token_expired' => 'Токен истёк',
    'rest_response_429_too_many_requests' => 'Слишком много запросов',
];
