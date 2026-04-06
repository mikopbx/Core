<?php
return [
    'auth_RefreshTokenInvalid' => 'Yanlış yeniləmə tokeni',
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'İstifadəçi icazəsi',
    'rest_auth_LoginDesc' => 'İstifadəçi identifikasiyası və JWT tokenlərinin verilməsi. İki üsulu dəstəkləyir: parol (giriş+parol) və parol açarı (WebAuthn-dan sessionToken). AccessToken qaytarır (JWT, 15 dəqiqə) və httpOnly kukisində refreshToken təyin edir (30 gün).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Giriş tokenini yeniləyin',
    'rest_auth_RefreshDesc' => 'Kukidən yeniləmə tokenindən istifadə edərək JWT giriş tokenini yeniləyir. Təhlükəsizliyi artırmaq üçün isteğe bağlı olaraq yeniləmə tokenini döndərir.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Çıxış',
    'rest_auth_LogoutDesc' => 'Yeniləmə tokenini verilənlər bazasından silin və kukini təmizləyin. JWT giriş tokeni 15 dəqiqədən sonra təbii olaraq bitəcək.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Avtorizasiya üçün istifadəçi girişi',
    'rest_param_auth_password' => 'İstifadəçi parolu',
    'rest_param_auth_sessionToken' => 'Şifrə identifikasiyasından birdəfəlik sessiya tokeni (64 altıbucaqlı simvol)',
    'rest_param_auth_rememberMe' => 'Məni yadda saxla (yeniləmə nişanını genişləndir)',
    'rest_param_auth_refreshToken' => 'Giriş tokenini yeniləmək üçün httpOnly kukisindən tokenləri yeniləyin',
    'rest_param_auth_clientIp' => 'Cihaz izləmə üçün müştəri IP ünvanı',
    'rest_param_auth_userAgent' => 'Brauzer/cihaz izləmə tətbiqi istifadəçi-agenti',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'Sorğuların təsdiqlənməsi üçün JWT giriş tokeni (15 dəqiqə ərzində etibarlıdır)',
    'rest_schema_auth_tokenType' => 'Avtorizasiya başlığı üçün token növü (həmişə "Daşıyıcı")',
    'rest_schema_auth_expiresIn' => 'Giriş nişanının müddəti saniyələrlə',
    'rest_schema_auth_login' => 'Səlahiyyətli istifadəçinin girişi',
    'rest_schema_auth_message' => 'Əməliyyat nəticəsi haqqında mesaj',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Uğurlu avtorizasiya. Giriş tokeni qaytarıldı və yeniləmə tokeni kukisi təyin edildi.',
    'rest_response_200_auth_refresh' => 'Giriş tokeni uğurla yeniləndi. Yeniləmə tokeni fırlanmış ola bilər.',
    'rest_response_200_auth_logout' => 'Uğurlu çıxış. Yeniləmə tokeni verilənlər bazasından silindi və kuki təmizləndi.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Giriş cəhdləri çoxdur. {interval} saniyə sonra yenidən cəhd edin.',
    'auth_LoginPasswordRequired' => 'Giriş+parol və ya sessionToken göstərməlisiniz',
    'auth_WrongLoginPassword' => 'Yanlış giriş və ya parol',
    'auth_TokenSaveFailed' => 'Tokeni verilənlər bazasına saxlamaqda xəta baş verdi',
    'auth_RefreshTokenMissing' => 'Kukidən yeniləmə tokeni yoxdur',
    'auth_RefreshTokenExpired' => 'Yeniləmə nişanının müddəti bitib və ya tapılmayıb',
    'auth_InvalidSessionData' => 'Yanlış sessiya məlumatları',
    'auth_TokenUpdateFailed' => 'Token yeniləmə xətası',
    'rest_response_401_invalid_credentials' => 'Yanlış etimadnamələr',
    'rest_response_401_invalid_token' => 'Yanlış token',
    'rest_response_403_token_expired' => 'Tokenin müddəti bitib',
    'rest_response_429_too_many_requests' => 'Həddindən artıq çox sorğu',
];
