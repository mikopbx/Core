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
    'psw_GeneratePassword' => 'تولید رمز عبور',
    'psw_UseGenerateButton' => 'از دکمه تولید برای ایجاد رمز عبور قوی استفاده کنید.',
    'psw_PasswordGenerated' => 'رمز عبور قوی با موفقیت تولید شد',
    'psw_DefaultPasswordWarning' => 'رمز عبور پیش‌فرض تشخیص داده شد',
    'psw_ChangeDefaultPassword' => 'شما از رمز عبور پیش‌فرض استفاده می‌کنید. لطفاً برای امنیت آن را تغییر دهید.',
    'psw_WeakPassword' => 'رمز عبور ضعیف',
    'psw_PasswordTooCommon' => 'این رمز عبور خیلی رایج و قابل حدس است.',
    'psw_PasswordTooShort' => 'رمز عبور خیلی کوتاه است (حداقل %min% کاراکتر)',
    'psw_PasswordTooLong' => 'رمز عبور خیلی طولانی است (حداکثر %max% کاراکتر)',
    'psw_PasswordMinLength' => 'رمز عبور باید حداقل شامل 8 کاراکتر باشد.',
    'psw_PasswordRequirements' => 'الزامات رمز عبور',
    'psw_PasswordSuggestions' => 'توصیه‌ها برای بهبود قدرت رمز عبور',
    
    // Password strength indicators
    'psw_VeryWeak' => 'خیلی ضعیف',
    'psw_Weak' => 'ضعیف',
    'psw_Fair' => 'متوسط',
    'psw_Good' => 'خوب',
    'psw_Strong' => 'قوی',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'رمز عبور نمی‌تواند خالی باشد',
    'psw_EmptyPassword' => 'رمز عبور نمی‌تواند خالی باشد',
    'psw_PasswordInDictionary' => 'رمز عبور در فرهنگ رمزهای رایج یافت شد',
    'psw_PasswordAcceptable' => 'رمز عبور قابل قبول است',
    'psw_PasswordGenerateFailed' => 'تولید رمز عبور ناموفق بود',
    'psw_PasswordsArrayRequired' => 'آرایه رمزهای عبور مورد نیاز است',
    'psw_InvalidPasswordsFormat' => 'فرمت داده‌های رمز عبور نامعتبر',
    
    // Additional suggestions
    'psw_AddUppercase' => 'حروف بزرگ اضافه کنید',
    'psw_AddLowercase' => 'حروف کوچک اضافه کنید',
    'psw_AddNumbers' => 'اعداد اضافه کنید',
    'psw_AddSpecialChars' => 'کاراکترهای خاص اضافه کنید',
    'psw_IncreaseLength' => 'طول رمز عبور را افزایش دهید',
    'psw_AvoidRepeating' => 'از کاراکترهای تکراری پرهیز کنید',
    'psw_AvoidSequential' => 'از کاراکترهای پیاپی پرهیز کنید',
    'psw_AvoidCommonWords' => 'از کلمات رایج پرهیز کنید',
    
    // Password validation errors
    'psw_PasswordSimple' => 'رمز عبور تنظیم شده خیلی ساده است.',
    'psw_SetPassword' => 'رمز عبور جدید تنظیم کنید',
    'psw_SetPasswordError' => 'رمز عبور - %password% قابل استفاده نیست، در فرهنگ رمزهای ساده موجود است.',
    'psw_SetPasswordInfo' => 'رمز عبور مشخص شده قابل استفاده نیست، در فرهنگ رمزهای ساده موجود است.',
    'psw_PasswordNoNumbers' => 'رمز عبور باید شامل اعداد باشد',
    'psw_PasswordNoLowSimvol' => 'رمز عبور باید شامل کاراکترهای کوچک باشد',
    'psw_PasswordNoUpperSimvol' => 'رمز عبور باید شامل کاراکترهای بزرگ باشد',
    'psw_PasswordIsDefault' => 'از رمز عبور پیش‌فرض استفاده می‌شود',
    'psw_PasswordNoSpecialChars' => 'کاراکترهای خاص اضافه کنید (!@#$%)',
    'psw_PasswordMixCharTypes' => 'از ترکیب حروف، اعداد و نمادها استفاده کنید',
    'psw_PasswordAvoidCommon' => 'از کلمات و عبارات رایج پرهیز کنید',
    'psw_PasswordUsePassphrase' => 'استفاده از عبارت رمز را در نظر بگیرید',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'ضعیف',
    'psw_PasswordStrengthFair' => 'قابل قبول',
    'psw_PasswordStrengthGood' => 'خوب',
    'psw_PasswordStrengthStrong' => 'قوی',
    'psw_PasswordStrengthVeryStrong' => 'خیلی قوی',
    'psw_PasswordSecurityRequiresFair' => 'برای تأمین امنیت رمز عبور باید حداقل دارای قدرت متوسط باشد',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'رمز عبور',
    'psw_WebAdminPasswordRepeat' => 'ورود رمز عبور را تکرار کنید',
    'psw_Passwords' => 'رمز عبور رابط WEB',
    'psw_ValidateEmptyWebPassword' => 'رمز عبور مدیر نمی‌تواند خالی باشد',
    'psw_ValidateWeakWebPassword' => 'رمز عبور WEB باید بیشتر از 4 کاراکتر باشد',
    'psw_ValidateWebPasswordsFieldDifferent' => 'رمز عبور رابط وب نادرست وارد شده است',
    
    // SSH password specific
    'psw_SSHPassword' => 'رمز عبور SSH',
    'psw_SSHPasswordRepeat' => 'ورود رمز عبور را تکرار کنید',
    'psw_SSHDisablePasswordLogins' => 'غیرفعال کردن احراز هویت با رمز عبور',
    'psw_ValidateEmptySSHPassword' => 'رمز عبور SSH نمی‌تواند خالی باشد',
    'psw_ValidateWeakSSHPassword' => 'رمز عبور SSH باید بیشتر از 4 کاراکتر باشد',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'رمز عبور SSH نادرست وارد شده است. ورود رمز عبور را تکرار کنید.',
];