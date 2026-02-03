<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Autorizzazione dell\'utente',
    'rest_auth_RefreshDesc' => 'Aggiorna il token di accesso JWT utilizzando il token di aggiornamento del cookie. Facoltativamente, ruota il token di aggiornamento per una maggiore sicurezza.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Esci',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Accesso utente per l\'autorizzazione',
    'rest_param_auth_password' => 'Password utente',
    'rest_response_401_invalid_credentials' => 'Credenziali errate',
    'rest_auth_LoginDesc' => 'Autenticazione utente ed emissione di token JWT. Supporta due metodi: password (login+password) e passkey (sessionToken da WebAuthn). Restituisce un accessToken (JWT, 15 minuti) e imposta un refreshToken nel cookie httpOnly (30 giorni).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Aggiorna il token di accesso',
    'rest_auth_LogoutDesc' => 'Elimina il token di aggiornamento dal database e cancella il cookie. Il token di accesso JWT scadrà automaticamente dopo 15 minuti.',
    'rest_param_auth_sessionToken' => 'Token di sessione monouso dall\'autenticazione con passkey (64 caratteri esadecimali)',
    'rest_param_auth_rememberMe' => 'Ricordami (estendere il token di aggiornamento)',
    'rest_param_auth_refreshToken' => 'Aggiorna il token dal cookie httpOnly per aggiornare il token di accesso',
    'rest_param_auth_clientIp' => 'Indirizzo IP del client per il monitoraggio del dispositivo',
    'rest_param_auth_userAgent' => 'User-agent dell\'app di monitoraggio del browser/dispositivo',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'Token di accesso JWT per l\'autorizzazione delle richieste (valido per 15 minuti)',
    'rest_schema_auth_tokenType' => 'Tipo di token per l\'intestazione di autorizzazione (sempre "Portatore")',
    'rest_schema_auth_expiresIn' => 'Tempo fino alla scadenza del token di accesso in secondi',
    'rest_schema_auth_login' => 'Login dell\'utente autorizzato',
    'rest_schema_auth_message' => 'Messaggio sul risultato dell\'operazione',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Autorizzazione riuscita. È stato restituito un token di accesso ed è stato impostato un cookie di token di aggiornamento.',
    'rest_response_200_auth_refresh' => 'Il token di accesso è stato aggiornato correttamente. Il token di aggiornamento potrebbe essere stato ruotato.',
    'rest_response_200_auth_logout' => 'Uscita riuscita. Il token di aggiornamento è stato rimosso dal database e il cookie è stato cancellato.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Troppi tentativi di accesso. Riprova tra {intervallo} secondi.',
    'auth_LoginPasswordRequired' => 'Devi specificare login+password o sessionToken',
    'auth_WrongLoginPassword' => 'Login o password errati',
    'auth_TokenSaveFailed' => 'Errore durante il salvataggio del token nel database',
    'auth_RefreshTokenMissing' => 'Token di aggiornamento mancante dal cookie',
    'auth_RefreshTokenInvalid' => 'Token di aggiornamento non valido',
    'auth_RefreshTokenExpired' => 'Il token di aggiornamento è scaduto o non è stato trovato',
    'auth_InvalidSessionData' => 'Dati di sessione non validi',
    'auth_TokenUpdateFailed' => 'Errore di aggiornamento del token',
    'rest_response_401_invalid_token' => 'Token non valido',
    'rest_response_403_token_expired' => 'Il token è scaduto',
    'rest_response_429_too_many_requests' => 'Troppe richieste',
];
