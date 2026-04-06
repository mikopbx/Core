<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Benutzerautorisierung',
    'rest_schema_auth_tokenType' => 'Token-Typ für den Authorization-Header (immer "Bearer")',
    'auth_TokenUpdateFailed' => 'Token-Aktualisierungsfehler',
    'rest_response_401_invalid_credentials' => 'Falsche Anmeldeinformationen',
    'rest_response_401_invalid_token' => 'Ungültiges Token',
    'rest_response_403_token_expired' => 'Das Token ist abgelaufen.',
    'rest_response_429_too_many_requests' => 'Zu viele Anfragen',
    'rest_auth_LoginDesc' => 'Benutzerauthentifizierung und Ausstellung von JWT-Tokens. Unterstützt zwei Methoden: Passwort (Benutzername + Passwort) und Passkey (Session-Token von WebAuthn). Gibt ein Zugriffstoken (JWT, 15 Minuten) zurück und speichert ein Aktualisierungstoken im httpOnly-Cookie (30 Tage).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Zugriffstoken aktualisieren',
    'rest_auth_RefreshDesc' => 'Aktualisiert das JWT-Zugriffstoken mithilfe des Aktualisierungstokens aus dem Cookie. Optional kann das Aktualisierungstoken zur Erhöhung der Sicherheit rotiert werden.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Abmelden',
    'rest_auth_LogoutDesc' => 'Löschen Sie das Aktualisierungstoken aus der Datenbank und den Cookie. Das JWT-Zugriffstoken läuft nach 15 Minuten automatisch ab.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Benutzeranmeldung zur Autorisierung',
    'rest_param_auth_password' => 'Benutzer-Passwort',
    'rest_param_auth_sessionToken' => 'Einmaliges Sitzungstoken aus der Passkey-Authentifizierung (64 Hexadezimalzeichen)',
    'rest_param_auth_rememberMe' => 'Angemeldet bleiben (Refresh-Token verlängern)',
    'rest_param_auth_refreshToken' => 'Aktualisieren Sie das Zugriffstoken mithilfe des httpOnly-Cookies.',
    'rest_param_auth_clientIp' => 'Client-IP-Adresse für die Geräteverfolgung',
    'rest_param_auth_userAgent' => 'Browser-/Geräte-Tracking-App-User-Agent',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'JWT-Zugriffstoken zur Autorisierung von Anfragen (gültig für 15 Minuten)',
    'rest_schema_auth_expiresIn' => 'Zeit bis zum Ablauf des Zugriffstokens in Sekunden',
    'rest_schema_auth_login' => 'Anmeldung des autorisierten Benutzers',
    'rest_schema_auth_message' => 'Meldung zum Operationsergebnis',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Autorisierung erfolgreich. Ein Zugriffstoken wurde zurückgegeben und ein Aktualisierungstoken-Cookie gesetzt.',
    'rest_response_200_auth_refresh' => 'Das Zugriffstoken wurde erfolgreich aktualisiert. Das Aktualisierungstoken wurde möglicherweise neu erstellt.',
    'rest_response_200_auth_logout' => 'Erfolgreicher Abbruch. Das Aktualisierungstoken wurde aus der Datenbank entfernt und der Cookie gelöscht.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Zu viele Anmeldeversuche. Bitte versuchen Sie es in {Intervall} Sekunden erneut.',
    'auth_LoginPasswordRequired' => 'Sie müssen Benutzername und Passwort oder Session-Token angeben.',
    'auth_WrongLoginPassword' => 'Falsche Anmeldedaten oder falsches Passwort',
    'auth_TokenSaveFailed' => 'Fehler beim Speichern des Tokens in der Datenbank',
    'auth_RefreshTokenMissing' => 'Aktualisierungstoken fehlt im Cookie',
    'auth_RefreshTokenInvalid' => 'Ungültiges Aktualisierungstoken',
    'auth_RefreshTokenExpired' => 'Das Aktualisierungstoken ist abgelaufen oder wurde nicht gefunden.',
    'auth_InvalidSessionData' => 'Ungültige Sitzungsdaten',
];
