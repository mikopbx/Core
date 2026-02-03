<?php
return [
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Kijelentkezés',
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Felhasználói engedélyezés',
    'rest_auth_LoginDesc' => 'Felhasználói hitelesítés és JWT tokenek kibocsátása. Két módszert támogat: jelszó (login+jelszó) és hozzáférési kulcs (sessionToken a WebAuthn-tól). Visszaad egy accessTokent (JWT, 15 perc), és beállít egy refreshTokent a httpOnly sütiben (30 nap).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Hozzáférési token frissítése',
    'rest_auth_RefreshDesc' => 'Frissíti a JWT hozzáférési tokent a sütiből származó frissítési token használatával. Opcionálisan rotálja a frissítési tokent a fokozott biztonság érdekében.',
    'rest_auth_LogoutDesc' => 'Töröld a frissítési tokent az adatbázisból és töröld a sütit. A JWT hozzáférési token 15 perc elteltével automatikusan lejár.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Felhasználói bejelentkezés hitelesítéshez',
    'rest_param_auth_password' => 'Felhasználói jelszó',
    'rest_param_auth_sessionToken' => 'Egyszeri munkamenet-token jelszó-hitelesítésből (64 hex karakter)',
    'rest_param_auth_rememberMe' => 'Emlékezz rám (frissítési token meghosszabbítása)',
    'rest_param_auth_refreshToken' => 'Hozzáférési token frissítése a httpOnly sütiből',
    'rest_param_auth_clientIp' => 'Kliens IP-címe az eszközkövetéshez',
    'rest_param_auth_userAgent' => 'Böngésző/eszközkövető alkalmazás felhasználói ügynöke',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'JWT hozzáférési token a kérések engedélyezéséhez (15 percig érvényes)',
    'rest_schema_auth_tokenType' => 'Az Authorization fejléc token típusa (mindig „Bearer”)',
    'rest_schema_auth_expiresIn' => 'Hozzáférési token lejáratáig hátralévő idő másodpercben',
    'rest_schema_auth_login' => 'A jogosult felhasználó bejelentkezése',
    'rest_schema_auth_message' => 'Üzenet a művelet eredményéről',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Sikeres hitelesítés. Hozzáférési token érkezett vissza, és frissítési token süti lett beállítva.',
    'rest_response_200_auth_refresh' => 'A hozzáférési token frissítése sikeresen megtörtént. Lehetséges, hogy a frissítési token rotálva lett.',
    'rest_response_200_auth_logout' => 'Sikeres kilépés. A frissítési token eltávolításra került az adatbázisból, és a süti is törlésre került.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Túl sok bejelentkezési kísérlet. Próbáld újra {interval} másodperc múlva.',
    'auth_LoginPasswordRequired' => 'Meg kell adnia a login+password vagy a sessionToken értéket.',
    'auth_WrongLoginPassword' => 'Helytelen bejelentkezés vagy jelszó',
    'auth_TokenSaveFailed' => 'Hiba történt a tokenek adatbázisba mentése során',
    'auth_RefreshTokenMissing' => 'Hiányzik a frissítési token a sütiből',
    'auth_RefreshTokenInvalid' => 'Érvénytelen frissítési token',
    'auth_RefreshTokenExpired' => 'A frissítési token lejárt vagy nem található',
    'auth_InvalidSessionData' => 'Érvénytelen munkamenet-adatok',
    'auth_TokenUpdateFailed' => 'Tokenfrissítési hiba',
    'rest_response_401_invalid_credentials' => 'Helytelen hitelesítő adatok',
    'rest_response_401_invalid_token' => 'Érvénytelen token',
    'rest_response_403_token_expired' => 'A token lejárt',
    'rest_response_429_too_many_requests' => 'Túl sok kérés',
];
