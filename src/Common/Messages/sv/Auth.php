<?php
return [
    'rest_schema_auth_login' => 'Inloggning för den behöriga användaren',
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Användarbehörighet',
    'rest_auth_LoginDesc' => 'Användarautentisering och utfärdande av JWT-tokens. Stöder två metoder: lösenord (inloggning+lösenord) och lösenordsnyckel (sessionToken från WebAuthn). Returnerar en accessToken (JWT, 15 minuter) och anger en refreshToken i httpOnly-cookien (30 dagar).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Uppdatera åtkomsttoken',
    'rest_auth_RefreshDesc' => 'Uppdaterar JWT-åtkomsttoken med hjälp av uppdateringstoken från cookien. Roterar valfritt uppdateringstoken för ökad säkerhet.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Utloggning',
    'rest_auth_LogoutDesc' => 'Ta bort uppdateringstoken från databasen och rensa cookien. JWT-åtkomsttoken kommer att upphöra att gälla automatiskt efter 15 minuter.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Användarinloggning för auktorisering',
    'rest_param_auth_password' => 'Användarlösenord',
    'rest_param_auth_sessionToken' => 'Engångssessionstoken från lösenordsautentisering (64 hexadecimaltecken)',
    'rest_param_auth_rememberMe' => 'Kom ihåg mig (förläng uppdateringstoken)',
    'rest_param_auth_refreshToken' => 'Uppdatera token från httpOnly-cookien för att uppdatera åtkomsttoken',
    'rest_param_auth_clientIp' => 'Klientens IP-adress för enhetsspårning',
    'rest_param_auth_userAgent' => 'Användaragent för app för webbläsar-/enhetsspårning',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'JWT-åtkomsttoken för att auktorisera förfrågningar (giltig i 15 minuter)',
    'rest_schema_auth_tokenType' => 'Tokentyp för auktoriseringshuvudet (alltid "Bärare")',
    'rest_schema_auth_expiresIn' => 'Tid tills åtkomsttoken upphör att gälla i sekunder',
    'rest_schema_auth_message' => 'Meddelande om operationsresultatet',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Lyckad auktorisering. En åtkomsttoken returnerades och en cookie för uppdateringstoken ställdes in.',
    'rest_response_200_auth_refresh' => 'Åtkomsttoken har uppdaterats. Uppdateringstoken kan ha roterats.',
    'rest_response_200_auth_logout' => 'Lyckad avslutning. Uppdateringstoken har tagits bort från databasen och cookien har rensats.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'För många inloggningsförsök. Försök igen om {interval} sekunder.',
    'auth_LoginPasswordRequired' => 'Du måste ange inloggning+lösenord eller sessionstoken',
    'auth_WrongLoginPassword' => 'Felaktig inloggning eller lösenord',
    'auth_TokenSaveFailed' => 'Fel vid sparning av token i databasen',
    'auth_RefreshTokenMissing' => 'Uppdateringstoken saknas i cookien',
    'auth_RefreshTokenInvalid' => 'Ogiltig uppdateringstoken',
    'auth_RefreshTokenExpired' => 'Uppdateringstoken har gått ut eller hittades inte',
    'auth_InvalidSessionData' => 'Ogiltig sessionsdata',
    'auth_TokenUpdateFailed' => 'Fel vid tokenuppdatering',
    'rest_response_401_invalid_credentials' => 'Felaktiga inloggningsuppgifter',
    'rest_response_401_invalid_token' => 'Ogiltig token',
    'rest_response_403_token_expired' => 'Token har gått ut',
    'rest_response_429_too_many_requests' => 'För många förfrågningar',
];
