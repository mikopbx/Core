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
    'psw_GeneratePassword' => 'Generer kodeord',
    'psw_UseGenerateButton' => 'Brug genereringsknappen til at oprette et sikkert kodeord.',
    'psw_PasswordGenerated' => 'Sikkert kodeord blev genereret',
    'psw_DefaultPasswordWarning' => 'Standard kodeord opdaget',
    'psw_ChangeDefaultPassword' => 'Du bruger standardkodeordet. Skift det af sikkerhedshensyn.',
    'psw_WeakPassword' => 'Svagt kodeord',
    'psw_PasswordTooCommon' => 'Dette kodeord er for almindeligt og let at gætte.',
    'psw_PasswordTooShort' => 'Kodeord er for kort (minimum %min% tegn)',
    'psw_PasswordTooLong' => 'Kodeord er for langt (maksimum %max% tegn)',
    'psw_PasswordMinLength' => 'Kodeord skal indeholde mindst 8 tegn.',
    'psw_PasswordRequirements' => 'Kodeordskrav',
    'psw_PasswordSuggestions' => 'Anbefalinger til forbedring af kodeordets sikkerhed',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Meget svagt',
    'psw_Weak' => 'Svagt',
    'psw_Fair' => 'Middel',
    'psw_Good' => 'Godt',
    'psw_Strong' => 'Stærkt',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Kodeord kan ikke være tomt',
    'psw_EmptyPassword' => 'Kodeord kan ikke være tomt',
    'psw_PasswordInDictionary' => 'Kodeord fundet i ordbog over almindelige kodeord',
    'psw_PasswordAcceptable' => 'Kodeord er acceptabelt',
    'psw_PasswordGenerateFailed' => 'Kunne ikke generere kodeord',
    'psw_PasswordsArrayRequired' => 'Array af kodeord påkrævet',
    'psw_InvalidPasswordsFormat' => 'Ugyldigt format på kodeordsdata',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Tilføj store bogstaver',
    'psw_AddLowercase' => 'Tilføj små bogstaver',
    'psw_AddNumbers' => 'Tilføj tal',
    'psw_AddSpecialChars' => 'Tilføj specialtegn',
    'psw_IncreaseLength' => 'Øg kodeordets længde',
    'psw_AvoidRepeating' => 'Undgå gentagne tegn',
    'psw_AvoidSequential' => 'Undgå fortløbende tegn',
    'psw_AvoidCommonWords' => 'Undgå almindelige ord',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Kodeordet der skal indstilles er for simpelt.',
    'psw_SetPassword' => 'Indstil nyt kodeord',
    'psw_SetPasswordError' => 'Kodeord - %password% kan ikke bruges, det findes i ordbogen over simple kodeord.',
    'psw_SetPasswordInfo' => 'Det angivne kodeord kan ikke bruges, det findes i ordbogen over simple kodeord.',
    'psw_PasswordNoNumbers' => 'Kodeord skal indeholde tal',
    'psw_PasswordNoLowSimvol' => 'Kodeord skal indeholde små bogstaver',
    'psw_PasswordNoUpperSimvol' => 'Kodeord skal indeholde store bogstaver',
    'psw_PasswordIsDefault' => 'Der bruges standardkodeord',
    'psw_PasswordNoSpecialChars' => 'Tilføj specialtegn (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Brug en blanding af bogstaver, tal og symboler',
    'psw_PasswordAvoidCommon' => 'Undgå almindelige ord og sætninger',
    'psw_PasswordUsePassphrase' => 'Overvej at bruge en adgangssætning',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Svagt',
    'psw_PasswordStrengthFair' => 'Tilfredsstillende',
    'psw_PasswordStrengthGood' => 'Godt',
    'psw_PasswordStrengthStrong' => 'Stærkt',
    'psw_PasswordStrengthVeryStrong' => 'Meget stærkt',
    'psw_PasswordSecurityRequiresFair' => 'For at sikre sikkerhed skal kodeordet have mindst middel pålidelighed',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Kodeord',
    'psw_WebAdminPasswordRepeat' => 'Gentag kodeordsindtastning',
    'psw_Passwords' => 'WEB interface kodeord',
    'psw_ValidateEmptyWebPassword' => 'Admin panel kodeord kan ikke være tomt',
    'psw_ValidateWeakWebPassword' => 'WEB kodeord skal være længere end 4 tegn',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Web interface kodeord er indtastet forkert',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH kodeord',
    'psw_SSHPasswordRepeat' => 'Gentag kodeordsindtastning',
    'psw_SSHDisablePasswordLogins' => 'Deaktiver kodeordsautorisation',
    'psw_ValidateEmptySSHPassword' => 'SSH kodeord kan ikke være tomt',
    'psw_ValidateWeakSSHPassword' => 'SSH kodeord skal være længere end 4 tegn',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSH kodeord er indtastet forkert. Gentag kodeordsindtastning.',
];