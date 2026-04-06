<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Brugerautorisation',
    'auth_RefreshTokenExpired' => 'Opdateringstoken er udløbet eller ikke fundet',
    'auth_InvalidSessionData' => 'Ugyldige sessionsdata',
    'auth_TokenUpdateFailed' => 'Fejl ved tokenopdatering',
    'rest_response_401_invalid_credentials' => 'Forkerte legitimationsoplysninger',
    'rest_response_401_invalid_token' => 'Ugyldig token',
    'rest_response_403_token_expired' => 'Tokenet er udløbet',
    'rest_auth_LoginDesc' => 'Brugergodkendelse og udstedelse af JWT-tokens. Understøtter to metoder: adgangskode (login+adgangskode) og adgangsnøgle (sessionToken fra WebAuthn). Returnerer et accessToken (JWT, 15 minutter) og angiver et refreshToken i httpOnly-cookien (30 dage).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Opdater adgangstoken',
    'rest_auth_RefreshDesc' => 'Opdaterer JWT-adgangstokenet ved hjælp af opdateringstokenet fra cookien. Roterer valgfrit opdateringstokenet for øget sikkerhed.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Log ud',
    'rest_auth_LogoutDesc' => 'Slet opdateringstokenet fra databasen, og fjern cookien. JWT-adgangstokenet udløber naturligt efter 15 minutter.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Brugerlogin til godkendelse',
    'rest_param_auth_password' => 'Brugeradgangskode',
    'rest_param_auth_sessionToken' => 'Engangssessionstoken fra adgangsnøglegodkendelse (64 hexadecimale tegn)',
    'rest_param_auth_rememberMe' => 'Husk mig (forlæng opdateringstoken)',
    'rest_param_auth_refreshToken' => 'Opdater token fra httpOnly-cookien for at opdatere adgangstokenet',
    'rest_param_auth_clientIp' => 'Klientens IP-adresse til enhedssporing',
    'rest_param_auth_userAgent' => 'Brugeragent til browser-/enhedssporingsapp',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'JWT-adgangstoken til godkendelse af anmodninger (gyldig i 15 minutter)',
    'rest_schema_auth_tokenType' => 'Tokentype for godkendelsesheaderen (altid "Bearer")',
    'rest_schema_auth_expiresIn' => 'Tid indtil adgangstoken udløber i sekunder',
    'rest_schema_auth_login' => 'Login for den autoriserede bruger',
    'rest_schema_auth_message' => 'Besked om operationsresultatet',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Godkendelsen er gennemført. Der blev returneret et adgangstoken, og der blev angivet en cookie til opdateringstoken.',
    'rest_response_200_auth_refresh' => 'Adgangstokenet er blevet opdateret. Opdateringstokenet er muligvis blevet roteret.',
    'rest_response_200_auth_logout' => 'Afslutningen er fuldført. Opdateringstokenet er blevet fjernet fra databasen, og cookien er blevet ryddet.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'For mange loginforsøg. Prøv igen om {interval} sekunder.',
    'auth_LoginPasswordRequired' => 'Du skal angive login+adgangskode eller sessionstoken',
    'auth_WrongLoginPassword' => 'Forkert login eller adgangskode',
    'auth_TokenSaveFailed' => 'Fejl ved lagring af token i databasen',
    'auth_RefreshTokenMissing' => 'Opdateringstoken mangler i cookien',
    'auth_RefreshTokenInvalid' => 'Ugyldig opdateringstoken',
    'rest_response_429_too_many_requests' => 'For mange anmodninger',
];
