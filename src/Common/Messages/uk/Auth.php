<?php
return [
    'auth_RefreshTokenInvalid' => 'Невалідний refresh token',
    'auth_RefreshTokenExpired' => 'Refresh token минув або не знайдено',
    'auth_InvalidSessionData' => 'Невалідні дані сесії',
    'auth_TokenUpdateFailed' => 'Помилка оновлення токена',
    'rest_response_401_invalid_credentials' => 'Невірні облікові дані',
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Авторизація користувача',
    'rest_auth_LoginDesc' => 'Аутентифікація користувача та видача JWT токенів. Підтримує два методи: password (login+password) та passkey (sessionToken від WebAuthn). Повертає accessToken (JWT, 15 хв) та встановлює refreshToken у httpOnly cookie (30 днів).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Оновити access token',
    'rest_auth_RefreshDesc' => 'Оновлення JWT access token за допомогою refresh token з cookie. Опційно ротує refresh token для підвищеної безпеки.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Вихід із системи',
    'rest_auth_LogoutDesc' => 'Видалення refresh token з бази даних та очищення cookie. JWT access token закінчиться природним чином через 15 хвилин.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Логін користувача для авторизації',
    'rest_param_auth_password' => 'Пароль користувача',
    'rest_param_auth_sessionToken' => 'One-time токен сесії від passkey authentication (64 hex символу)',
    'rest_param_auth_rememberMe' => 'Запам\'ятати мене (продовжити термін дії refresh token)',
    'rest_param_auth_refreshToken' => 'Refresh token з httpOnly cookie для оновлення access token',
    'rest_param_auth_clientIp' => 'IP-адреса клієнта для відстеження пристроїв',
    'rest_param_auth_userAgent' => 'User-Agent браузера/програми для відстеження пристроїв',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'JWT токен доступу для авторизації запитів (термін дії 15 хвилин)',
    'rest_schema_auth_tokenType' => 'Тип токена для заголовка Authorization (завжди "Bearer")',
    'rest_schema_auth_expiresIn' => 'Час до закінчення access token в секундах',
    'rest_schema_auth_login' => 'Логін авторизованого користувача',
    'rest_schema_auth_message' => 'Повідомлення про результат операції',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Успішна авторизація. Повернено access token та встановлено refresh token cookie.',
    'rest_response_200_auth_refresh' => 'Access token успішно оновлено. Можливо ротований refresh token.',
    'rest_response_200_auth_logout' => 'Успішний вихід. Refresh token видалено з бази та cookie очищена.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Занадто багато спроб входу. Спробуйте через {interval} секунд.',
    'auth_LoginPasswordRequired' => 'Необхідно вказати login+password або sessionToken',
    'auth_WrongLoginPassword' => 'Невірний логін або пароль',
    'auth_TokenSaveFailed' => 'Помилка збереження токена до бази даних',
    'auth_RefreshTokenMissing' => 'Refresh token відсутня у cookie',
    'rest_response_401_invalid_token' => 'Невалідний токен',
    'rest_response_403_token_expired' => 'Токен минув',
    'rest_response_429_too_many_requests' => 'Забагато запитів',
];
