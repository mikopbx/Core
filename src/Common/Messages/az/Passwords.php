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
    'psw_GeneratePassword' => 'Parol generasiya et',
    'psw_UseGenerateButton' => 'Etibarlı parol yaratmaq üçün generasiya düyməsindən istifadə edin.',
    'psw_PasswordGenerated' => 'Etibarlı parol uğurla generasiya olundu',
    'psw_DefaultPasswordWarning' => 'Standart parol aşkar edildi',
    'psw_ChangeDefaultPassword' => 'Siz standart paroldan istifadə edirsiniz. Təhlükəsizlik üçün onu dəyişin.',
    'psw_WeakPassword' => 'Zəif parol',
    'psw_PasswordTooCommon' => 'Bu parol çox geniş yayılmışdır və asanlıqla təxmin edilə bilər.',
    'psw_PasswordTooShort' => 'Parol çox qısadır (minimum %min% simvol)',
    'psw_PasswordTooLong' => 'Parol çox uzundur (maksimum %max% simvol)',
    'psw_PasswordMinLength' => 'Parol ən azı 8 simvol olmalıdır.',
    'psw_PasswordRequirements' => 'Parol tələbləri',
    'psw_PasswordSuggestions' => 'Parolun etibarlılığını yaxşılaşdırmaq üçün tövsiyələr',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Çox zəif',
    'psw_Weak' => 'Zəif',
    'psw_Fair' => 'Orta',
    'psw_Good' => 'Yaxşı',
    'psw_Strong' => 'Güclü',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Parol boş ola bilməz',
    'psw_EmptyPassword' => 'Parol boş ola bilməz',
    'psw_PasswordInDictionary' => 'Parol geniş yayılmış parollar lüğətində tapıldı',
    'psw_PasswordAcceptable' => 'Parol məqbuldur',
    'psw_PasswordGenerateFailed' => 'Parol generasiya etmək mümkün olmadı',
    'psw_PasswordsArrayRequired' => 'Parollar massivi tələb olunur',
    'psw_InvalidPasswordsFormat' => 'Parol məlumatlarının yanlış formatı',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Böyük hərflər əlavə edin',
    'psw_AddLowercase' => 'Kiçik hərflər əlavə edin',
    'psw_AddNumbers' => 'Rəqəmlər əlavə edin',
    'psw_AddSpecialChars' => 'Xüsusi simvollar əlavə edin',
    'psw_IncreaseLength' => 'Parolun uzunluğunu artırın',
    'psw_AvoidRepeating' => 'Təkrar simvollardan qaçının',
    'psw_AvoidSequential' => 'Ardıcıl simvollardan qaçının',
    'psw_AvoidCommonWords' => 'Geniş yayılmış sözlərdən qaçının',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Qurulacaq parol çox sadədir.',
    'psw_SetPassword' => 'Yeni parol təyin edin',
    'psw_SetPasswordError' => 'Parol - %password% istifadə edilə bilməz, o, sadə parollar lüğətində mövcuddur.',
    'psw_SetPasswordInfo' => 'Göstərilən parol istifadə edilə bilməz, o, sadə parollar lüğətində mövcuddur.',
    'psw_PasswordNoNumbers' => 'Parol rəqəmlər ehtiva etməlidir',
    'psw_PasswordNoLowSimvol' => 'Parol kiçik hərf simvolları ehtiva etməlidir',
    'psw_PasswordNoUpperSimvol' => 'Parol böyük hərf simvolları ehtiva etməlidir',
    'psw_PasswordIsDefault' => 'Standart paroldan istifadə olunur',
    'psw_PasswordNoSpecialChars' => 'Xüsusi simvollar əlavə edin (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Hərflərin, rəqəmlərin və simvolların qarışığından istifadə edin',
    'psw_PasswordAvoidCommon' => 'Geniş yayılmış sözlər və ifadələrdən qaçının',
    'psw_PasswordUsePassphrase' => 'Parol ifadəsindən istifadəni nəzərdən keçirin',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Zəif',
    'psw_PasswordStrengthFair' => 'Qənaətbəxş',
    'psw_PasswordStrengthGood' => 'Yaxşı',
    'psw_PasswordStrengthStrong' => 'Güclü',
    'psw_PasswordStrengthVeryStrong' => 'Çox güclü',
    'psw_PasswordSecurityRequiresFair' => 'Təhlükəsizliyi təmin etmək üçün parol ən azı orta etibarlılığa malik olmalıdır',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Parol',
    'psw_WebAdminPasswordRepeat' => 'Parol daxil etməyi təkrarlayın',
    'psw_Passwords' => 'WEB interfeysi parolu',
    'psw_ValidateEmptyWebPassword' => 'Admin paneli parolu boş ola bilməz',
    'psw_ValidateWeakWebPassword' => 'WEB parol 4 simvoldan uzun olmalıdır',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Web interfeysi parolu yanlış daxil edilmişdir',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH parol',
    'psw_SSHPasswordRepeat' => 'Parol daxil etməyi təkrarlayın',
    'psw_SSHDisablePasswordLogins' => 'Parolun avtorizasiyasını söndür',
    'psw_ValidateEmptySSHPassword' => 'SSH parol boş ola bilməz',
    'psw_ValidateWeakSSHPassword' => 'SSH parol 4 simvoldan uzun olmalıdır',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSH parol yanlış daxil edilmişdir. Parol daxil etməyi təkrarlayın.',
];