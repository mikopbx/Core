<?php
return [
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Obnovit přístupový token',
    'rest_param_auth_sessionToken' => 'Jednorázový token relace z ověřování heslem (64 hexadecimálních znaků)',
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Autorizace uživatele',
    'rest_auth_LoginDesc' => 'Ověřování uživatelů a vydávání JWT tokenů. Podporuje dvě metody: heslo (login+password) a přístupový klíč (sessionToken z WebAuthn). Vrací accessToken (JWT, 15 minut) a nastavuje refreshToken v souboru cookie httpOnly (30 dní).',
    'rest_auth_RefreshDesc' => 'Obnoví přístupový token JWT pomocí obnovovacího tokenu z cookie. Volitelně obnovovací token otočí pro zvýšení zabezpečení.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Odhlásit se',
    'rest_auth_LogoutDesc' => 'Smažte token pro obnovení z databáze a vymažte soubor cookie. Platnost přístupového tokenu JWT přirozeně vyprší po 15 minutách.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Přihlášení uživatele pro autorizaci',
    'rest_param_auth_password' => 'Uživatelské heslo',
    'rest_param_auth_rememberMe' => 'Zapamatovat si mě (prodloužit token obnovení)',
    'rest_param_auth_refreshToken' => 'Obnovte token z cookie httpOnly pro obnovení přístupového tokenu.',
    'rest_param_auth_clientIp' => 'IP adresa klienta pro sledování zařízení',
    'rest_param_auth_userAgent' => 'Uživatelský agent aplikace pro sledování prohlížeče/zařízení',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'Přístupový token JWT pro autorizaci požadavků (platný 15 minut)',
    'rest_schema_auth_tokenType' => 'Typ tokenu pro autorizační hlavičku (vždy „Nositel“)',
    'rest_schema_auth_expiresIn' => 'Čas do vypršení platnosti přístupového tokenu v sekundách',
    'rest_schema_auth_login' => 'Přihlášení oprávněného uživatele',
    'rest_schema_auth_message' => 'Zpráva o výsledku operace',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Autorizace proběhla úspěšně. Byl vrácen přístupový token a nastaven soubor cookie pro obnovení tokenu.',
    'rest_response_200_auth_refresh' => 'Přístupový token byl úspěšně aktualizován. Obnovovací token mohl být rotován.',
    'rest_response_200_auth_logout' => 'Úspěšné ukončení. Token obnovení byl z databáze odstraněn a soubor cookie byl vymazán.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Příliš mnoho pokusů o přihlášení. Zkuste to znovu za {interval} sekund.',
    'auth_LoginPasswordRequired' => 'Musíte zadat přihlašovací jméno + heslo nebo sessionToken.',
    'auth_WrongLoginPassword' => 'Nesprávné přihlašovací jméno nebo heslo',
    'auth_TokenSaveFailed' => 'Chyba při ukládání tokenu do databáze',
    'auth_RefreshTokenMissing' => 'V souboru cookie chybí token pro obnovení.',
    'auth_RefreshTokenInvalid' => 'Neplatný token obnovení',
    'auth_RefreshTokenExpired' => 'Platnost tokenu pro obnovení vypršela nebo nebyl nalezen.',
    'auth_InvalidSessionData' => 'Neplatná data relace',
    'auth_TokenUpdateFailed' => 'Chyba aktualizace tokenu',
    'rest_response_401_invalid_credentials' => 'Nesprávné přihlašovací údaje',
    'rest_response_401_invalid_token' => 'Neplatný token',
    'rest_response_403_token_expired' => 'Platnost tokenu vypršela.',
    'rest_response_429_too_many_requests' => 'Příliš mnoho požadavků',
];
