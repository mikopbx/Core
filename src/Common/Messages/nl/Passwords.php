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
    'psw_GeneratePassword' => 'Wachtwoord Genereren',
    'psw_UseGenerateButton' => 'Gebruik de genereerknop om een veilig wachtwoord te maken.',
    'psw_PasswordGenerated' => 'Veilig wachtwoord succesvol gegenereerd',
    'psw_DefaultPasswordWarning' => 'Standaardwachtwoord gedetecteerd',
    'psw_ChangeDefaultPassword' => 'U gebruikt een standaardwachtwoord. Wijzig dit voor de veiligheid.',
    'psw_WeakPassword' => 'Zwak wachtwoord',
    'psw_PasswordTooCommon' => 'Dit wachtwoord is te gewoon en makkelijk te raden.',
    'psw_PasswordTooShort' => 'Wachtwoord is te kort (minimaal %min% tekens)',
    'psw_PasswordTooLong' => 'Wachtwoord is te lang (maximaal %max% tekens)',
    'psw_PasswordMinLength' => 'Wachtwoord moet minstens 8 tekens bevatten.',
    'psw_PasswordRequirements' => 'Wachtwoordvereisten',
    'psw_PasswordSuggestions' => 'Suggesties voor verbetering van wachtwoordbeveiliging',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Zeer Zwak',
    'psw_Weak' => 'Zwak',
    'psw_Fair' => 'Redelijk',
    'psw_Good' => 'Goed',
    'psw_Strong' => 'Veilig',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Wachtwoord mag niet leeg zijn',
    'psw_EmptyPassword' => 'Wachtwoord mag niet leeg zijn',
    'psw_PasswordInDictionary' => 'Wachtwoord gevonden in woordenboek van veelgebruikte wachtwoorden',
    'psw_PasswordAcceptable' => 'Wachtwoord is acceptabel',
    'psw_PasswordGenerateFailed' => 'Wachtwoord genereren mislukt',
    'psw_PasswordsArrayRequired' => 'Wachtwoorden array vereist',
    'psw_InvalidPasswordsFormat' => 'Ongeldig wachtwoordgegevensformaat',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Hoofdletters toevoegen',
    'psw_AddLowercase' => 'Kleine letters toevoegen',
    'psw_AddNumbers' => 'Cijfers toevoegen',
    'psw_AddSpecialChars' => 'Speciale tekens toevoegen',
    'psw_IncreaseLength' => 'Wachtwoordlengte verhogen',
    'psw_AvoidRepeating' => 'Herhalende tekens vermijden',
    'psw_AvoidSequential' => 'Opeenvolgende tekens vermijden',
    'psw_AvoidCommonWords' => 'Veelgebruikte woorden vermijden',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Het in te stellen wachtwoord is te eenvoudig.',
    'psw_SetPassword' => 'Nieuw wachtwoord instellen',
    'psw_SetPasswordError' => 'Wachtwoord - %password% kan niet worden gebruikt, het staat in het woordenboek van eenvoudige wachtwoorden.',
    'psw_SetPasswordInfo' => 'Het opgegeven wachtwoord kan niet worden gebruikt, het staat in het woordenboek van eenvoudige wachtwoorden.',
    'psw_PasswordNoNumbers' => 'Wachtwoord moet cijfers bevatten',
    'psw_PasswordNoLowSimvol' => 'Wachtwoord moet kleine letters bevatten',
    'psw_PasswordNoUpperSimvol' => 'Wachtwoord moet hoofdletters bevatten',
    'psw_PasswordIsDefault' => 'Standaardwachtwoord wordt gebruikt',
    'psw_PasswordNoSpecialChars' => 'Speciale tekens toevoegen (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Gebruik een mix van letters, cijfers en symbolen',
    'psw_PasswordAvoidCommon' => 'Veelgebruikte woorden en zinnen vermijden',
    'psw_PasswordUsePassphrase' => 'Overweeg het gebruik van een wachtwoordzin',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Zwak',
    'psw_PasswordStrengthFair' => 'Redelijk',
    'psw_PasswordStrengthGood' => 'Goed',
    'psw_PasswordStrengthStrong' => 'Sterk',
    'psw_PasswordStrengthVeryStrong' => 'Zeer Sterk',
    'psw_PasswordSecurityRequiresFair' => 'Voor veiligheid moet het wachtwoord minstens redelijk sterk zijn',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Wachtwoord',
    'psw_WebAdminPasswordRepeat' => 'Wachtwoordinvoer herhalen',
    'psw_Passwords' => 'WEB interface wachtwoord',
    'psw_ValidateEmptyWebPassword' => 'Beheerderswachtwoord mag niet leeg zijn',
    'psw_ValidateWeakWebPassword' => 'WEB wachtwoord moet langer zijn dan 4 tekens',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Web interface wachtwoord onjuist ingevoerd',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH wachtwoord',
    'psw_SSHPasswordRepeat' => 'Wachtwoordinvoer herhalen',
    'psw_SSHDisablePasswordLogins' => 'Wachtwoordauthenticatie uitschakelen',
    'psw_ValidateEmptySSHPassword' => 'SSH wachtwoord mag niet leeg zijn',
    'psw_ValidateWeakSSHPassword' => 'SSH wachtwoord moet langer zijn dan 4 tekens',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSH wachtwoord onjuist ingevoerd. Voer het wachtwoord opnieuw in.',
];