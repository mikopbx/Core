<?php

return [
    /*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

    // Password validation messages
    'psw_GeneratePassword' => 'Şifre oluştur',
    'psw_UseGenerateButton' => 'Güvenli bir şifre oluşturmak için oluşturma düğmesini kullanın.',
    'psw_PasswordGenerated' => 'Güvenli şifre başarıyla oluşturuldu',
    'psw_DefaultPasswordWarning' => 'Varsayılan şifre tespit edildi',
    'psw_ChangeDefaultPassword' => 'Varsayılan şifreyi kullanıyorsunuz. Güvenlik için lütfen değiştirin.',
    'psw_WeakPassword' => 'Zayıf şifre',
    'psw_PasswordTooCommon' => 'Bu şifre çok yaygın ve kolayca tahmin edilebilir.',
    'psw_PasswordTooShort' => 'Şifre çok kısa (en az %min% karakter)',
    'psw_PasswordTooLong' => 'Şifre çok uzun (en fazla %max% karakter)',
    'psw_PasswordMinLength' => 'Şifre en az 8 karakter içermelidir.',
    'psw_PasswordRequirements' => 'Şifre gereksinimleri',
    'psw_PasswordSuggestions' => 'Şifre güvenliğini artırmak için öneriler',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Çok zayıf',
    'psw_Weak' => 'Zayıf',
    'psw_Fair' => 'Orta',
    'psw_Good' => 'İyi',
    'psw_Strong' => 'Güçlü',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Şifre boş olamaz',
    'psw_EmptyPassword' => 'Şifre boş olamaz',
    'psw_PasswordInDictionary' => 'Şifre yaygın şifreler sözlüğünde bulundu',
    'psw_PasswordAcceptable' => 'Şifre kabul edilebilir',
    'psw_PasswordGenerateFailed' => 'Şifre oluşturulamadı',
    'psw_PasswordsArrayRequired' => 'Şifre dizisi gerekli',
    'psw_InvalidPasswordsFormat' => 'Geçersiz şifre veri formatı',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Büyük harfler ekleyin',
    'psw_AddLowercase' => 'Küçük harfler ekleyin',
    'psw_AddNumbers' => 'Sayılar ekleyin',
    'psw_AddSpecialChars' => 'Özel karakterler ekleyin',
    'psw_IncreaseLength' => 'Şifre uzunluğunu artırın',
    'psw_AvoidRepeating' => 'Tekrarlayan karakterlerden kaçının',
    'psw_AvoidSequential' => 'Ardışık karakterlerden kaçının',
    'psw_AvoidCommonWords' => 'Yaygın kelimelerden kaçının',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Kurulacak şifre çok basit.',
    'psw_SetPassword' => 'Yeni şifre belirleyin',
    'psw_SetPasswordError' => 'Şifre - %password% kullanılamaz, basit şifreler sözlüğünde mevcut.',
    'psw_SetPasswordInfo' => 'Belirtilen şifre kullanılamaz, basit şifreler sözlüğünde mevcut.',
    'psw_PasswordNoNumbers' => 'Şifre sayılar içermelidir',
    'psw_PasswordNoLowSimvol' => 'Şifre küçük harf karakterleri içermelidir',
    'psw_PasswordNoUpperSimvol' => 'Şifre büyük harf karakterleri içermelidir',
    'psw_PasswordIsDefault' => 'Varsayılan şifre kullanılıyor',
    'psw_PasswordNoSpecialChars' => 'Özel karakterler ekleyin (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Harfler, rakamlar ve semboller karışımı kullanın',
    'psw_PasswordAvoidCommon' => 'Yaygın kelimeler ve ifadelerden kaçının',
    'psw_PasswordUsePassphrase' => 'Şifre ifadesi kullanmayı düşünün',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Zayıf',
    'psw_PasswordStrengthFair' => 'Tatmin edici',
    'psw_PasswordStrengthGood' => 'İyi',
    'psw_PasswordStrengthStrong' => 'Güçlü',
    'psw_PasswordStrengthVeryStrong' => 'Çok güçlü',
    'psw_PasswordSecurityRequiresFair' => 'Güvenliği sağlamak için şifre en az orta güvenilirliğe sahip olmalıdır',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Şifre',
    'psw_WebAdminPasswordRepeat' => 'Şifre girişini tekrarlayın',
    'psw_Passwords' => 'WEB arayüzü şifresi',
    'psw_ValidateEmptyWebPassword' => 'Yönetim paneli şifresi boş olamaz',
    'psw_ValidateWeakWebPassword' => 'WEB şifresi 4 karakterden uzun olmalıdır',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Web arayüzü şifresi yanlış girildi',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH şifresi',
    'psw_SSHPasswordRepeat' => 'Şifre girişini tekrarlayın',
    'psw_SSHDisablePasswordLogins' => 'Şifre yetkilendirmesini devre dışı bırak',
    'psw_ValidateEmptySSHPassword' => 'SSH şifresi boş olamaz',
    'psw_ValidateWeakSSHPassword' => 'SSH şifresi 4 karakterden uzun olmalıdır',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSH şifresi yanlış girildi. Şifre girişini tekrarlayın.',
];