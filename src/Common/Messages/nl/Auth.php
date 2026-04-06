<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Gebruikersautorisatie',
    'rest_auth_LoginDesc' => 'Gebruikersauthenticatie en uitgifte van JWT-tokens. Ondersteunt twee methoden: wachtwoord (login+wachtwoord) en passkey (sessionToken van WebAuthn). Retourneert een accessToken (JWT, 15 minuten) en stelt een refreshToken in de httpOnly-cookie in (30 dagen).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Toegangstoken vernieuwen',
    'rest_auth_RefreshDesc' => 'Vernieuwt het JWT-toegangstoken met behulp van het vernieuwingstoken uit de cookie. Optioneel roteert het vernieuwingstoken voor verhoogde beveiliging.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Uitloggen',
    'rest_auth_LogoutDesc' => 'Verwijder het vernieuwingstoken uit de database en wis de cookie. Het JWT-toegangstoken verloopt automatisch na 15 minuten.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Gebruikerslogin voor autorisatie',
    'rest_param_auth_password' => 'Gebruikerswachtwoord',
    'rest_param_auth_sessionToken' => 'Eenmalige sessietoken van wachtwoordauthenticatie (64 hexadecimale tekens)',
    'rest_param_auth_rememberMe' => 'Onthoud mij (uitbreidingsvernieuwingstoken)',
    'rest_param_auth_refreshToken' => 'Vernieuw het token van de httpOnly-cookie om het toegangstoken te vernieuwen',
    'rest_param_auth_clientIp' => 'Client-IP-adres voor apparaattracking',
    'rest_param_auth_userAgent' => 'Browser-/apparaattracking-app-gebruikeragent',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'JWT-toegangstoken voor het autoriseren van verzoeken (geldig gedurende 15 minuten)',
    'rest_schema_auth_tokenType' => 'Tokentype voor de autorisatieheader (altijd \'Bearer\')',
    'rest_schema_auth_expiresIn' => 'Tijd totdat toegangstoken verloopt in seconden',
    'rest_schema_auth_login' => 'Login van de geautoriseerde gebruiker',
    'rest_schema_auth_message' => 'Bericht over het resultaat van de operatie',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Succesvolle autorisatie. Er is een toegangstoken geretourneerd en een refresh-tokencookie is ingesteld.',
    'rest_response_200_auth_refresh' => 'De toegangstoken is succesvol bijgewerkt. De vernieuwingstoken is mogelijk geroteerd.',
    'rest_response_200_auth_logout' => 'Succesvolle exit. Het vernieuwingstoken is uit de database verwijderd en de cookie is gewist.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Te veel inlogpogingen. Probeer het over {interval} seconden opnieuw.',
    'auth_LoginPasswordRequired' => 'U moet login+wachtwoord of sessionToken opgeven',
    'auth_WrongLoginPassword' => 'Onjuiste login of wachtwoord',
    'auth_TokenSaveFailed' => 'Fout bij het opslaan van token in database',
    'auth_RefreshTokenMissing' => 'Vernieuwingstoken ontbreekt in cookie',
    'auth_RefreshTokenInvalid' => 'Ongeldig vernieuwingstoken',
    'auth_RefreshTokenExpired' => 'Vernieuwingstoken is verlopen of niet gevonden',
    'auth_InvalidSessionData' => 'Ongeldige sessiegegevens',
    'auth_TokenUpdateFailed' => 'Fout bij het vernieuwen van tokens',
    'rest_response_401_invalid_credentials' => 'Onjuiste inloggegevens',
    'rest_response_401_invalid_token' => 'Ongeldig token',
    'rest_response_403_token_expired' => 'Het token is verlopen',
    'rest_response_429_too_many_requests' => 'Te veel verzoeken',
];
