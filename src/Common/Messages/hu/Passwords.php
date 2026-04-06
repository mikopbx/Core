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
    'psw_GeneratePassword' => 'Jelszó generálása',
    'psw_UseGenerateButton' => 'Használja a generálás gombot biztonságos jelszó létrehozásához.',
    'psw_PasswordGenerated' => 'Biztonságos jelszó sikeresen generálva',
    'psw_DefaultPasswordWarning' => 'Alapértelmezett jelszó észlelve',
    'psw_ChangeDefaultPassword' => 'Az alapértelmezett jelszót használja. Kérjük változtassa meg a biztonság érdekében.',
    'psw_WeakPassword' => 'Gyenge jelszó',
    'psw_PasswordTooCommon' => 'Ez a jelszó túl gyakori és könnyen kitalálható.',
    'psw_PasswordTooShort' => 'A jelszó túl rövid (legalább %min% karakter)',
    'psw_PasswordTooLong' => 'A jelszó túl hosszú (legfeljebb %max% karakter)',
    'psw_PasswordMinLength' => 'A jelszónak legalább 8 karaktert kell tartalmaznia.',
    'psw_PasswordRequirements' => 'Jelszó követelmények',
    'psw_PasswordSuggestions' => 'Javaslatok a jelszó biztonságának javításához',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Nagyon gyenge',
    'psw_Weak' => 'Gyenge',
    'psw_Fair' => 'Közepes',
    'psw_Good' => 'Jó',
    'psw_Strong' => 'Erős',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'A jelszó nem lehet üres',
    'psw_EmptyPassword' => 'A jelszó nem lehet üres',
    'psw_PasswordInDictionary' => 'Jelszó megtalálva a gyakori jelszavak szótárában',
    'psw_PasswordAcceptable' => 'A jelszó elfogadható',
    'psw_PasswordGenerateFailed' => 'Nem sikerült jelszót generálni',
    'psw_PasswordsArrayRequired' => 'Jelszó tömb szükséges',
    'psw_InvalidPasswordsFormat' => 'Érvénytelen jelszó adatformátum',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Adjon hozzá nagybetűket',
    'psw_AddLowercase' => 'Adjon hozzá kisbetűket',
    'psw_AddNumbers' => 'Adjon hozzá számokat',
    'psw_AddSpecialChars' => 'Adjon hozzá speciális karaktereket',
    'psw_IncreaseLength' => 'Növelje a jelszó hosszát',
    'psw_AvoidRepeating' => 'Kerülje az ismétlődő karaktereket',
    'psw_AvoidSequential' => 'Kerülje az egymást követő karaktereket',
    'psw_AvoidCommonWords' => 'Kerülje a gyakori szavakat',
    
    // Password validation errors
    'psw_PasswordSimple' => 'A beállítandó jelszó túl egyszerű.',
    'psw_SetPassword' => 'Új jelszó beállítása',
    'psw_SetPasswordError' => 'A jelszó - %password% nem használható, megtalálható az egyszerű jelszavak szótárában.',
    'psw_SetPasswordInfo' => 'A megadott jelszó nem használható, megtalálható az egyszerű jelszavak szótárában.',
    'psw_PasswordNoNumbers' => 'A jelszónak számokat kell tartalmaznia',
    'psw_PasswordNoLowSimvol' => 'A jelszónak kisbetűs karaktereket kell tartalmaznia',
    'psw_PasswordNoUpperSimvol' => 'A jelszónak nagybetűs karaktereket kell tartalmaznia',
    'psw_PasswordIsDefault' => 'Alapértelmezett jelszót használ',
    'psw_PasswordNoSpecialChars' => 'Adjon hozzá speciális karaktereket (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Használjon betűk, számok és szimbólumok keverékét',
    'psw_PasswordAvoidCommon' => 'Kerülje a gyakori szavakat és kifejezéseket',
    'psw_PasswordUsePassphrase' => 'Fontolja meg egy jelmondat használatát',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Gyenge',
    'psw_PasswordStrengthFair' => 'Kielégítő',
    'psw_PasswordStrengthGood' => 'Jó',
    'psw_PasswordStrengthStrong' => 'Erős',
    'psw_PasswordStrengthVeryStrong' => 'Nagyon erős',
    'psw_PasswordSecurityRequiresFair' => 'A biztonság érdekében a jelszónak legalább közepes megbízhatósággal kell rendelkeznie',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Jelszó',
    'psw_WebAdminPasswordRepeat' => 'Ismételje meg a jelszó bevitelét',
    'psw_Passwords' => 'WEB felület jelszava',
    'psw_ValidateEmptyWebPassword' => 'Az admin panel jelszava nem lehet üres',
    'psw_ValidateWeakWebPassword' => 'A WEB jelszónak 4 karakternél hosszabbnak kell lennie',
    'psw_ValidateWebPasswordsFieldDifferent' => 'A web felület jelszava helytelenül lett megadva',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH jelszó',
    'psw_SSHPasswordRepeat' => 'Ismételje meg a jelszó bevitelét',
    'psw_SSHDisablePasswordLogins' => 'Jelszó hitelesítés kikapcsolása',
    'psw_ValidateEmptySSHPassword' => 'Az SSH jelszó nem lehet üres',
    'psw_ValidateWeakSSHPassword' => 'Az SSH jelszónak 4 karakternél hosszabbnak kell lennie',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'Az SSH jelszó helytelenül lett megadva. Ismételje meg a jelszó bevitelét.',
];