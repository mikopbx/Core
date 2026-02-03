<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Käyttäjän valtuutus',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Päivitä käyttöoikeustunnus',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'JWT-käyttöoikeustunnus pyyntöjen valtuuttamiseen (voimassa 15 minuuttia)',
    'auth_RefreshTokenInvalid' => 'Virheellinen päivitystunnus',
    'rest_response_403_token_expired' => 'Tunnus on vanhentunut',
    'rest_response_429_too_many_requests' => 'Liikaa pyyntöjä',
    'rest_auth_LoginDesc' => 'Käyttäjän todennus ja JWT-tokenien myöntäminen. Tukee kahta menetelmää: salasana (login+password) ja todentamisavain (sessionToken WebAuthnista). Palauttaa accessTokenin (JWT, 15 minuuttia) ja asettaa refreshTokenin httpOnly-evästeeseen (30 päivää).',
    'rest_auth_RefreshDesc' => 'Päivittää JWT-käyttöoikeustunnuksen evästeen päivitystunnuksen avulla. Valinnaisesti päivitystunnusta voidaan kiertää turvallisuuden parantamiseksi.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Kirjaudu ulos',
    'rest_auth_LogoutDesc' => 'Poista päivitystunnus tietokannasta ja tyhjennä eväste. JWT-käyttöoikeustunnus vanhenee luonnollisesti 15 minuutin kuluttua.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Käyttäjän kirjautuminen valtuutusta varten',
    'rest_param_auth_password' => 'Käyttäjän salasana',
    'rest_param_auth_sessionToken' => 'Kertaluonteinen istuntotunnus salasana-todennuksesta (64 heksamerkkiä)',
    'rest_param_auth_rememberMe' => 'Muista minut (jatka päivitystunnusta)',
    'rest_param_auth_refreshToken' => 'Päivitä tunniste httpOnly-evästeestä käyttöoikeustunnuksen päivittämiseksi',
    'rest_param_auth_clientIp' => 'Asiakkaan IP-osoite laitteen seurantaa varten',
    'rest_param_auth_userAgent' => 'Selaimen/laitteen seurantasovelluksen käyttäjäagentti',
    'rest_schema_auth_tokenType' => 'Valtuutusotsikon tunnustyyppi (aina "Hallinta")',
    'rest_schema_auth_expiresIn' => 'Aikaa käyttöoikeustunnuksen vanhenemiseen sekunteina',
    'rest_schema_auth_login' => 'Valtuutetun käyttäjän kirjautuminen',
    'rest_schema_auth_message' => 'Viesti operaation tuloksesta',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Valtuutus onnistui. Käyttöoikeustunnus palautettiin ja päivitystunnuseväste asetettiin.',
    'rest_response_200_auth_refresh' => 'Käyttöoikeustunnus on päivitetty onnistuneesti. Päivitystunnusta on saatettu kierrättää.',
    'rest_response_200_auth_logout' => 'Poistuminen onnistui. Päivitystunnus on poistettu tietokannasta ja eväste on tyhjennetty.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Liian monta kirjautumisyritystä. Yritä uudelleen {interval} sekunnin kuluttua.',
    'auth_LoginPasswordRequired' => 'Sinun on määritettävä kirjautuminen+salasana tai istuntotunnus',
    'auth_WrongLoginPassword' => 'Väärä kirjautumistunnus tai salasana',
    'auth_TokenSaveFailed' => 'Virhe tallennettaessa tokenia tietokantaan',
    'auth_RefreshTokenMissing' => 'Päivitystunnus puuttuu evästeestä',
    'auth_RefreshTokenExpired' => 'Päivitystunnus on vanhentunut tai sitä ei löydy',
    'auth_InvalidSessionData' => 'Virheelliset istuntotiedot',
    'auth_TokenUpdateFailed' => 'Tunnuksen päivitysvirhe',
    'rest_response_401_invalid_credentials' => 'Virheelliset tunnistetiedot',
    'rest_response_401_invalid_token' => 'Virheellinen tunnus',
];
