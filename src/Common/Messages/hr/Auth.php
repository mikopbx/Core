<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Autorizacija korisnika',
    'rest_schema_auth_tokenType' => 'Vrsta tokena za zaglavlje autorizacije (uvijek "Nosilac")',
    'auth_RefreshTokenInvalid' => 'Nevažeći token za osvježavanje',
    'auth_RefreshTokenExpired' => 'Token za osvježavanje istekao je ili nije pronađen',
    'auth_InvalidSessionData' => 'Nevažeći podaci sesije',
    'auth_TokenUpdateFailed' => 'Pogreška osvježavanja tokena',
    'rest_response_401_invalid_credentials' => 'Netočne vjerodajnice',
    'rest_auth_LoginDesc' => 'Autentifikacija korisnika i izdavanje JWT tokena. Podržava dvije metode: lozinku (login+password) i pristupni ključ (sessionToken iz WebAuthn-a). Vraća accessToken (JWT, 15 minuta) i postavlja refreshToken u httpOnly kolačić (30 dana).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Osvježi token za pristup',
    'rest_auth_RefreshDesc' => 'Osvježava JWT pristupni token pomoću tokena za osvježavanje iz kolačića. Opcionalno rotira token za osvježavanje radi veće sigurnosti.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Odjava',
    'rest_auth_LogoutDesc' => 'Izbrišite token za osvježavanje iz baze podataka i izbrišite kolačić. JWT token za pristup će prirodno isteći nakon 15 minuta.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Prijava korisnika za autorizaciju',
    'rest_param_auth_password' => 'Korisnička lozinka',
    'rest_param_auth_sessionToken' => 'Jednokratni token sesije iz autentifikacije lozinkom (64 heksadecimalna znaka)',
    'rest_param_auth_rememberMe' => 'Zapamti me (produženje tokena za osvježavanje)',
    'rest_param_auth_refreshToken' => 'Osvježi token iz httpOnly kolačića za osvježavanje pristupnog tokena',
    'rest_param_auth_clientIp' => 'IP adresa klijenta za praćenje uređaja',
    'rest_param_auth_userAgent' => 'Korisnički agent aplikacije za praćenje preglednika/uređaja',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'JWT pristupni token za autorizaciju zahtjeva (vrijedi 15 minuta)',
    'rest_schema_auth_expiresIn' => 'Vrijeme do isteka pristupnog tokena u sekundama',
    'rest_schema_auth_login' => 'Prijava ovlaštenog korisnika',
    'rest_schema_auth_message' => 'Poruka o rezultatu operacije',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Uspješna autorizacija. Vraćen je pristupni token i postavljen je kolačić tokena za osvježavanje.',
    'rest_response_200_auth_refresh' => 'Pristupni token je uspješno ažuriran. Token za osvježavanje je možda rotiran.',
    'rest_response_200_auth_logout' => 'Uspješan izlaz. Token za osvježavanje uklonjen je iz baze podataka, a kolačić je izbrisan.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Previše pokušaja prijave. Pokušajte ponovno za {interval} sekundi.',
    'auth_LoginPasswordRequired' => 'Morate navesti prijavu + lozinku ili sessionToken',
    'auth_WrongLoginPassword' => 'Netočna prijava ili lozinka',
    'auth_TokenSaveFailed' => 'Pogreška pri spremanju tokena u bazu podataka',
    'auth_RefreshTokenMissing' => 'Nedostaje token za osvježavanje u kolačiću',
    'rest_response_401_invalid_token' => 'Nevažeći token',
    'rest_response_403_token_expired' => 'Token je istekao',
    'rest_response_429_too_many_requests' => 'Previše zahtjeva',
];
