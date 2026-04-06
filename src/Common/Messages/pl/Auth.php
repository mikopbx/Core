<?php
return [
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Odśwież token dostępu',
    'rest_param_auth_clientIp' => 'Adres IP klienta do śledzenia urządzenia',
    'auth_WrongLoginPassword' => 'Nieprawidłowy login lub hasło',
    'auth_RefreshTokenInvalid' => 'Nieprawidłowy token odświeżania',
    'rest_response_401_invalid_token' => 'Nieprawidłowy token',
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Autoryzacja użytkownika',
    'rest_auth_LoginDesc' => 'Uwierzytelnianie użytkowników i wydawanie tokenów JWT. Obsługuje dwie metody: hasło (login+hasło) i klucz dostępu (sessionToken z WebAuthn). Zwraca accessToken (JWT, 15 minut) i ustawia refreshToken w pliku cookie httpOnly (30 dni).',
    'rest_auth_RefreshDesc' => 'Odświeża token dostępu JWT za pomocą tokena odświeżania z pliku cookie. Opcjonalnie zmienia token odświeżania w celu zwiększenia bezpieczeństwa.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Wyloguj',
    'rest_auth_LogoutDesc' => 'Usuń token odświeżania z bazy danych i wyczyść plik cookie. Token dostępu JWT wygaśnie automatycznie po 15 minutach.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Logowanie użytkownika w celu autoryzacji',
    'rest_param_auth_password' => 'Hasło użytkownika',
    'rest_param_auth_sessionToken' => 'Jednorazowy token sesji z uwierzytelniania kluczem dostępu (64 znaki szesnastkowe)',
    'rest_param_auth_rememberMe' => 'Zapamiętaj mnie (rozszerz token odświeżania)',
    'rest_param_auth_refreshToken' => 'Odśwież token z pliku cookie httpOnly, aby odświeżyć token dostępu',
    'rest_param_auth_userAgent' => 'Aplikacja śledząca przeglądarkę/urządzenie, agent użytkownika',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'Token dostępu JWT do autoryzacji żądań (ważny przez 15 minut)',
    'rest_schema_auth_tokenType' => 'Typ tokena dla nagłówka autoryzacji (zawsze „Bearer”)',
    'rest_schema_auth_expiresIn' => 'Czas do wygaśnięcia tokena dostępu w sekundach',
    'rest_schema_auth_login' => 'Logowanie użytkownika autoryzowanego',
    'rest_schema_auth_message' => 'Komunikat o wyniku operacji',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Autoryzacja zakończona sukcesem. Zwrócono token dostępu i ustawiono plik cookie tokena odświeżania.',
    'rest_response_200_auth_refresh' => 'Token dostępu został pomyślnie zaktualizowany. Token odświeżania mógł zostać obrócony.',
    'rest_response_200_auth_logout' => 'Pomyślne wyjście. Token odświeżania został usunięty z bazy danych, a plik cookie został wyczyszczony.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Zbyt wiele prób logowania. Spróbuj ponownie za {interval} sekund.',
    'auth_LoginPasswordRequired' => 'Musisz określić login+hasło lub sessionToken',
    'auth_TokenSaveFailed' => 'Błąd podczas zapisywania tokena w bazie danych',
    'auth_RefreshTokenMissing' => 'Brak tokena odświeżania w pliku cookie',
    'auth_RefreshTokenExpired' => 'Token odświeżania wygasł lub nie został znaleziony',
    'auth_InvalidSessionData' => 'Nieprawidłowe dane sesji',
    'auth_TokenUpdateFailed' => 'Błąd odświeżania tokena',
    'rest_response_401_invalid_credentials' => 'Nieprawidłowe dane uwierzytelniające',
    'rest_response_403_token_expired' => 'Token wygasł',
    'rest_response_429_too_many_requests' => 'Zbyt wiele próśb',
];
