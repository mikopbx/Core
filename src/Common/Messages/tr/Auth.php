<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Kullanıcı yetkilendirmesi',
    'rest_schema_auth_message' => 'Operasyon sonucuyla ilgili mesaj',
    'auth_WrongLoginPassword' => 'Yanlış giriş veya şifre',
    'rest_response_401_invalid_token' => 'Geçersiz belirteç',
    'rest_response_403_token_expired' => 'Tokenin süresi doldu.',
    'rest_response_429_too_many_requests' => 'Çok fazla istek',
    'rest_auth_LoginDesc' => 'Kullanıcı kimlik doğrulaması ve JWT token\'larının oluşturulması. İki yöntemi destekler: parola (giriş+parola) ve parola anahtarı (WebAuthn\'dan sessionToken). Bir accessToken (JWT, 15 dakika) döndürür ve httpOnly çerezine bir refreshToken (30 gün) yerleştirir.',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Erişim belirtecini yenile',
    'rest_auth_RefreshDesc' => 'Çerezdeki yenileme belirtecini kullanarak JWT erişim belirtecini yeniler. İsteğe bağlı olarak, artırılmış güvenlik için yenileme belirtecini döndürür.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Çıkış yap',
    'rest_auth_LogoutDesc' => 'Yenileme belirtecini veritabanından silin ve çerezi temizleyin. JWT erişim belirteci 15 dakika sonra otomatik olarak sona erecektir.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Yetkilendirme için kullanıcı girişi',
    'rest_param_auth_password' => 'Kullanıcı şifresi',
    'rest_param_auth_sessionToken' => 'Parola kimlik doğrulamasından elde edilen tek kullanımlık oturum belirteci (64 onaltılık karakter)',
    'rest_param_auth_rememberMe' => 'Beni hatırla (yenileme belirtecini uzat)',
    'rest_param_auth_refreshToken' => 'Erişim belirtecini yenilemek için httpOnly çerezinden yenileme belirtecini alın.',
    'rest_param_auth_clientIp' => 'Cihaz takibi için istemci IP adresi',
    'rest_param_auth_userAgent' => 'Tarayıcı/cihaz izleme uygulaması kullanıcı aracısı',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'İstekleri yetkilendirmek için kullanılan JWT erişim belirteci (15 dakika geçerlidir)',
    'rest_schema_auth_tokenType' => 'Yetkilendirme başlığı için belirteç türü (her zaman "Bearer")',
    'rest_schema_auth_expiresIn' => 'Erişim belirtecinin süresinin dolmasına kalan süre (saniye cinsinden)',
    'rest_schema_auth_login' => 'Yetkili kullanıcının oturum açması',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Yetkilendirme başarılı. Bir erişim belirteci döndürüldü ve bir yenileme belirteci çerezi ayarlandı.',
    'rest_response_200_auth_refresh' => 'Erişim belirteci başarıyla güncellendi. Yenileme belirteci değiştirilmiş olabilir.',
    'rest_response_200_auth_logout' => 'Başarılı çıkış. Yenileme belirteci veritabanından kaldırıldı ve çerez temizlendi.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Çok fazla giriş denemesi yapıldı. Lütfen {interval} saniye sonra tekrar deneyin.',
    'auth_LoginPasswordRequired' => 'Kullanıcı adı ve şifrenizi veya sessionToken\'ı belirtmeniz gerekmektedir.',
    'auth_TokenSaveFailed' => 'Token veritabanına kaydedilirken hata oluştu.',
    'auth_RefreshTokenMissing' => 'Çerezde yenileme belirteci eksik.',
    'auth_RefreshTokenInvalid' => 'Geçersiz yenileme belirteci',
    'auth_RefreshTokenExpired' => 'Yenileme belirteci süresi dolmuş veya bulunamadı.',
    'auth_InvalidSessionData' => 'Geçersiz oturum verileri',
    'auth_TokenUpdateFailed' => 'Token yenileme hatası',
    'rest_response_401_invalid_credentials' => 'Yanlış kimlik bilgileri',
];
