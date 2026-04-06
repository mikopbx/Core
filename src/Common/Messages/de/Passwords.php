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
    'psw_GeneratePassword' => 'Passwort generieren',
    'psw_UseGenerateButton' => 'Verwenden Sie die Schaltfläche "Generieren", um ein sicheres Passwort zu erstellen.',
    'psw_PasswordGenerated' => 'Sicheres Passwort erfolgreich generiert',
    'psw_DefaultPasswordWarning' => 'Standard-Passwort erkannt',
    'psw_ChangeDefaultPassword' => 'Sie verwenden ein Standard-Passwort. Bitte ändern Sie es aus Sicherheitsgründen.',
    'psw_WeakPassword' => 'Schwaches Passwort',
    'psw_PasswordTooCommon' => 'Dieses Passwort ist zu häufig verwendet und leicht zu erraten.',
    'psw_PasswordTooShort' => 'Passwort ist zu kurz (mindestens %min% Zeichen)',
    'psw_PasswordTooLong' => 'Passwort ist zu lang (maximal %max% Zeichen)',
    'psw_PasswordMinLength' => 'Das Passwort muss mindestens 8 Zeichen enthalten.',
    'psw_PasswordRequirements' => 'Passwort-Anforderungen',
    'psw_PasswordSuggestions' => 'Vorschläge zur Verbesserung der Passwort-Sicherheit',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Sehr schwach',
    'psw_Weak' => 'Schwach',
    'psw_Fair' => 'Mittelmäßig',
    'psw_Good' => 'Gut',
    'psw_Strong' => 'Sicher',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Passwort darf nicht leer sein',
    'psw_EmptyPassword' => 'Passwort darf nicht leer sein',
    'psw_PasswordInDictionary' => 'Passwort wurde im Wörterbuch häufiger Passwörter gefunden',
    'psw_PasswordAcceptable' => 'Passwort ist akzeptabel',
    'psw_PasswordGenerateFailed' => 'Passwort-Generierung fehlgeschlagen',
    'psw_PasswordsArrayRequired' => 'Passwort-Array erforderlich',
    'psw_InvalidPasswordsFormat' => 'Ungültiges Passwort-Datenformat',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Großbuchstaben hinzufügen',
    'psw_AddLowercase' => 'Kleinbuchstaben hinzufügen',
    'psw_AddNumbers' => 'Zahlen hinzufügen',
    'psw_AddSpecialChars' => 'Sonderzeichen hinzufügen',
    'psw_IncreaseLength' => 'Passwort-Länge erhöhen',
    'psw_AvoidRepeating' => 'Wiederholende Zeichen vermeiden',
    'psw_AvoidSequential' => 'Aufeinanderfolgende Zeichen vermeiden',
    'psw_AvoidCommonWords' => 'Häufige Wörter vermeiden',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Das zu setzende Passwort ist zu einfach.',
    'psw_SetPassword' => 'Neues Passwort festlegen',
    'psw_SetPasswordError' => 'Passwort - %password% kann nicht verwendet werden, es steht im Wörterbuch einfacher Passwörter.',
    'psw_SetPasswordInfo' => 'Das angegebene Passwort kann nicht verwendet werden, es steht im Wörterbuch einfacher Passwörter.',
    'psw_PasswordNoNumbers' => 'Passwort muss Zahlen enthalten',
    'psw_PasswordNoLowSimvol' => 'Passwort muss Kleinbuchstaben enthalten',
    'psw_PasswordNoUpperSimvol' => 'Passwort muss Großbuchstaben enthalten',
    'psw_PasswordIsDefault' => 'Standard-Passwort wird verwendet',
    'psw_PasswordNoSpecialChars' => 'Sonderzeichen hinzufügen (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Verwenden Sie eine Mischung aus Buchstaben, Zahlen und Symbolen',
    'psw_PasswordAvoidCommon' => 'Häufige Wörter und Phrasen vermeiden',
    'psw_PasswordUsePassphrase' => 'Erwägen Sie die Verwendung einer Passphrase',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Schwach',
    'psw_PasswordStrengthFair' => 'Mittelmäßig',
    'psw_PasswordStrengthGood' => 'Gut',
    'psw_PasswordStrengthStrong' => 'Stark',
    'psw_PasswordStrengthVeryStrong' => 'Sehr stark',
    'psw_PasswordSecurityRequiresFair' => 'Für die Sicherheit muss das Passwort mindestens mittelmäßige Stärke haben',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Passwort',
    'psw_WebAdminPasswordRepeat' => 'Passwort-Eingabe wiederholen',
    'psw_Passwords' => 'WEB-Interface-Passwort',
    'psw_ValidateEmptyWebPassword' => 'Admin-Passwort darf nicht leer sein',
    'psw_ValidateWeakWebPassword' => 'WEB-Passwort muss länger als 4 Zeichen sein',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Web-Interface-Passwort wurde falsch eingegeben',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH-Passwort',
    'psw_SSHPasswordRepeat' => 'Passwort-Eingabe wiederholen',
    'psw_SSHDisablePasswordLogins' => 'Passwort-Authentifizierung deaktivieren',
    'psw_ValidateEmptySSHPassword' => 'SSH-Passwort darf nicht leer sein',
    'psw_ValidateWeakSSHPassword' => 'SSH-Passwort muss länger als 4 Zeichen sein',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSH-Passwort wurde falsch eingegeben. Bitte geben Sie das Passwort erneut ein.',
];