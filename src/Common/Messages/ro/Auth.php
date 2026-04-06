<?php
return [
    'rest_schema_auth_expiresIn' => 'Timpul până la expirarea tokenului de acces, în secunde',
    'auth_LoginPasswordRequired' => 'Trebuie să specificați login+password sau sessionToken.',
    'auth_WrongLoginPassword' => 'Nume de utilizator sau parolă incorectă',
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Autorizare utilizator',
    'rest_auth_LoginDesc' => 'Autentificarea utilizatorilor și emiterea de token-uri JWT. Acceptă două metode: parolă (login+password) și cheie de acces (sessionToken de la WebAuthn). Returnează un accessToken (JWT, 15 minute) și setează un refreshToken în cookie-ul httpOnly (30 de zile).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Actualizați tokenul de acces',
    'rest_auth_RefreshDesc' => 'Reîmprospătează token-ul de acces JWT folosind token-ul de reîmprospătare din cookie. Opțional, rotește token-ul de reîmprospătare pentru o securitate sporită.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Deconectare',
    'rest_auth_LogoutDesc' => 'Ștergeți token-ul de actualizare din baza de date și goliți cookie-ul. Token-ul de acces JWT va expira în mod natural după 15 minute.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Autentificare utilizator pentru autorizare',
    'rest_param_auth_password' => 'Parolă de utilizator',
    'rest_param_auth_sessionToken' => 'Token de sesiune unică utilizat pentru autentificarea cu cheie de acces (64 de caractere hexadecimale)',
    'rest_param_auth_rememberMe' => 'Ține-mă minte (extinde jetonul de actualizare)',
    'rest_param_auth_refreshToken' => 'Reîmprospătează tokenul din cookie-ul httpOnly pentru a reîmprospăta tokenul de acces',
    'rest_param_auth_clientIp' => 'Adresa IP a clientului pentru urmărirea dispozitivului',
    'rest_param_auth_userAgent' => 'Agent utilizator pentru aplicații de urmărire a browserului/dispozitivului',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'Token de acces JWT pentru autorizarea cererilor (valabil 15 minute)',
    'rest_schema_auth_tokenType' => 'Tipul de token pentru antetul de autorizare (întotdeauna „Purtător”)',
    'rest_schema_auth_login' => 'Autentificarea utilizatorului autorizat',
    'rest_schema_auth_message' => 'Mesaj despre rezultatul operației',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Autorizare reușită. Un token de acces a fost returnat și un cookie cu token de actualizare a fost setat.',
    'rest_response_200_auth_refresh' => 'Tokenul de acces a fost actualizat cu succes. Este posibil ca tokenul de actualizare să fi fost rotit.',
    'rest_response_200_auth_logout' => 'Ieșire reușită. Jetonul de actualizare a fost eliminat din baza de date, iar cookie-ul a fost șters.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Prea multe încercări de conectare. Încercați din nou peste {interval} secunde.',
    'auth_TokenSaveFailed' => 'Eroare la salvarea jetonului în baza de date',
    'auth_RefreshTokenMissing' => 'Lipsește jetonul de actualizare din cookie',
    'auth_RefreshTokenInvalid' => 'Jeton de actualizare nevalid',
    'auth_RefreshTokenExpired' => 'Jetonul de actualizare a expirat sau nu a fost găsit',
    'auth_InvalidSessionData' => 'Date de sesiune nevalide',
    'auth_TokenUpdateFailed' => 'Eroare de actualizare a jetonului',
    'rest_response_401_invalid_credentials' => 'Acreditări incorecte',
    'rest_response_401_invalid_token' => 'Jeton nevalid',
    'rest_response_403_token_expired' => 'Jetonul a expirat',
    'rest_response_429_too_many_requests' => 'Prea multe solicitări',
];
