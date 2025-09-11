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
    'psw_GeneratePassword' => 'Generera lösenord',
    'psw_UseGenerateButton' => 'Använd genereringsknappen för att skapa ett säkert lösenord.',
    'psw_PasswordGenerated' => 'Säkert lösenord har genererats framgångsrikt',
    'psw_DefaultPasswordWarning' => 'Standardlösenord upptäckt',
    'psw_ChangeDefaultPassword' => 'Du använder standardlösenordet. Vänligen ändra det av säkerhetsskäl.',
    'psw_WeakPassword' => 'Svagt lösenord',
    'psw_PasswordTooCommon' => 'Detta lösenord är alltför vanligt och lätt att gissa.',
    'psw_PasswordTooShort' => 'Lösenordet är för kort (minst %min% tecken)',
    'psw_PasswordTooLong' => 'Lösenordet är för långt (högst %max% tecken)',
    'psw_PasswordMinLength' => 'Lösenordet måste innehålla minst 8 tecken.',
    'psw_PasswordRequirements' => 'Lösenordskrav',
    'psw_PasswordSuggestions' => 'Rekommendationer för förbättring av lösenordssäkerhet',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Mycket svagt',
    'psw_Weak' => 'Svagt',
    'psw_Fair' => 'Acceptabelt',
    'psw_Good' => 'Bra',
    'psw_Strong' => 'Starkt',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Lösenordet kan inte vara tomt',
    'psw_EmptyPassword' => 'Lösenordet kan inte vara tomt',
    'psw_PasswordInDictionary' => 'Lösenord hittat i ordbok över vanliga lösenord',
    'psw_PasswordAcceptable' => 'Lösenordet är acceptabelt',
    'psw_PasswordGenerateFailed' => 'Kunde inte generera lösenord',
    'psw_PasswordsArrayRequired' => 'Array av lösenord krävs',
    'psw_InvalidPasswordsFormat' => 'Ogiltigt format på lösenordsdata',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Lägg till stora bokstäver',
    'psw_AddLowercase' => 'Lägg till små bokstäver',
    'psw_AddNumbers' => 'Lägg till siffror',
    'psw_AddSpecialChars' => 'Lägg till specialtecken',
    'psw_IncreaseLength' => 'Öka lösenordets längd',
    'psw_AvoidRepeating' => 'Undvik upprepade tecken',
    'psw_AvoidSequential' => 'Undvik sekventiella tecken',
    'psw_AvoidCommonWords' => 'Undvik vanliga ord',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Lösenordet som ska ställas in är för enkelt.',
    'psw_SetPassword' => 'Ställ in nytt lösenord',
    'psw_SetPasswordError' => 'Lösenordet - %password% kan inte användas, det finns i ordbok för enkla lösenord.',
    'psw_SetPasswordInfo' => 'Det angivna lösenordet kan inte användas, det finns i ordbok för enkla lösenord.',
    'psw_PasswordNoNumbers' => 'Lösenordet måste innehålla siffror',
    'psw_PasswordNoLowSimvol' => 'Lösenordet måste innehålla små bokstäver',
    'psw_PasswordNoUpperSimvol' => 'Lösenordet måste innehålla stora bokstäver',
    'psw_PasswordIsDefault' => 'Standardlösenord används',
    'psw_PasswordNoSpecialChars' => 'Lägg till specialtecken (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Använd en blandning av bokstäver, siffror och symboler',
    'psw_PasswordAvoidCommon' => 'Undvik vanliga ord och fraser',
    'psw_PasswordUsePassphrase' => 'Överväg att använda en lösenfras',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Svagt',
    'psw_PasswordStrengthFair' => 'Tillfredsställande',
    'psw_PasswordStrengthGood' => 'Bra',
    'psw_PasswordStrengthStrong' => 'Starkt',
    'psw_PasswordStrengthVeryStrong' => 'Mycket starkt',
    'psw_PasswordSecurityRequiresFair' => 'För att säkerställa säkerhet måste lösenordet ha åtminstone medel tillförlitlighet',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Lösenord',
    'psw_WebAdminPasswordRepeat' => 'Upprepa lösenordsinmatning',
    'psw_Passwords' => 'WEB-gränssnitt lösenord',
    'psw_ValidateEmptyWebPassword' => 'Admin panel lösenord kan inte vara tomt',
    'psw_ValidateWeakWebPassword' => 'WEB lösenord måste vara längre än 4 tecken',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Webbgränssnitt lösenord har angetts felaktigt',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH lösenord',
    'psw_SSHPasswordRepeat' => 'Upprepa lösenordsinmatning',
    'psw_SSHDisablePasswordLogins' => 'Inaktivera lösenordsauktorisation',
    'psw_ValidateEmptySSHPassword' => 'SSH lösenord kan inte vara tomt',
    'psw_ValidateWeakSSHPassword' => 'SSH lösenord måste vara längre än 4 tecken',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSH lösenord har angetts felaktigt. Upprepa lösenordsinmatning.',
];