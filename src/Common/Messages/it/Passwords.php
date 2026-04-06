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
    'psw_GeneratePassword' => 'Genera Password',
    'psw_UseGenerateButton' => 'Usa il pulsante di generazione per creare una password sicura.',
    'psw_PasswordGenerated' => 'Password sicura generata con successo',
    'psw_DefaultPasswordWarning' => 'Password predefinita rilevata',
    'psw_ChangeDefaultPassword' => 'Stai usando una password predefinita. Cambiala per sicurezza.',
    'psw_WeakPassword' => 'Password debole',
    'psw_PasswordTooCommon' => 'Questa password è troppo comune e facile da indovinare.',
    'psw_PasswordTooShort' => 'Password troppo corta (minimo %min% caratteri)',
    'psw_PasswordTooLong' => 'Password troppo lunga (massimo %max% caratteri)',
    'psw_PasswordMinLength' => 'La password deve contenere almeno 8 caratteri.',
    'psw_PasswordRequirements' => 'Requisiti della password',
    'psw_PasswordSuggestions' => 'Suggerimenti per migliorare la sicurezza della password',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Molto Debole',
    'psw_Weak' => 'Debole',
    'psw_Fair' => 'Accettabile',
    'psw_Good' => 'Buona',
    'psw_Strong' => 'Sicura',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'La password non può essere vuota',
    'psw_EmptyPassword' => 'La password non può essere vuota',
    'psw_PasswordInDictionary' => 'Password trovata nel dizionario delle password comuni',
    'psw_PasswordAcceptable' => 'La password è accettabile',
    'psw_PasswordGenerateFailed' => 'Generazione password fallita',
    'psw_PasswordsArrayRequired' => 'Array di password richiesto',
    'psw_InvalidPasswordsFormat' => 'Formato dati password non valido',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Aggiungi lettere maiuscole',
    'psw_AddLowercase' => 'Aggiungi lettere minuscole',
    'psw_AddNumbers' => 'Aggiungi numeri',
    'psw_AddSpecialChars' => 'Aggiungi caratteri speciali',
    'psw_IncreaseLength' => 'Aumenta lunghezza password',
    'psw_AvoidRepeating' => 'Evita caratteri ripetuti',
    'psw_AvoidSequential' => 'Evita caratteri sequenziali',
    'psw_AvoidCommonWords' => 'Evita parole comuni',
    
    // Password validation errors
    'psw_PasswordSimple' => 'La password che si sta impostando è troppo semplice.',
    'psw_SetPassword' => 'Imposta nuova password',
    'psw_SetPasswordError' => 'Password - %password% non può essere utilizzata, è nel dizionario delle password semplici.',
    'psw_SetPasswordInfo' => 'La password specificata non può essere utilizzata, è nel dizionario delle password semplici.',
    'psw_PasswordNoNumbers' => 'La password deve contenere numeri',
    'psw_PasswordNoLowSimvol' => 'La password deve contenere caratteri minuscoli',
    'psw_PasswordNoUpperSimvol' => 'La password deve contenere caratteri maiuscoli',
    'psw_PasswordIsDefault' => 'Si sta usando la password predefinita',
    'psw_PasswordNoSpecialChars' => 'Aggiungi caratteri speciali (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Usa una combinazione di lettere, numeri e simboli',
    'psw_PasswordAvoidCommon' => 'Evita parole e frasi comuni',
    'psw_PasswordUsePassphrase' => 'Considera l\'uso di una passphrase',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Debole',
    'psw_PasswordStrengthFair' => 'Accettabile',
    'psw_PasswordStrengthGood' => 'Buona',
    'psw_PasswordStrengthStrong' => 'Forte',
    'psw_PasswordStrengthVeryStrong' => 'Molto Forte',
    'psw_PasswordSecurityRequiresFair' => 'Per la sicurezza, la password deve avere almeno una forza accettabile',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Password',
    'psw_WebAdminPasswordRepeat' => 'Ripeti inserimento password',
    'psw_Passwords' => 'Password interfaccia WEB',
    'psw_ValidateEmptyWebPassword' => 'La password admin non può essere vuota',
    'psw_ValidateWeakWebPassword' => 'La password WEB deve essere più lunga di 4 caratteri',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Password interfaccia web inserita incorrettamente',
    
    // SSH password specific
    'psw_SSHPassword' => 'Password SSH',
    'psw_SSHPasswordRepeat' => 'Ripeti inserimento password',
    'psw_SSHDisablePasswordLogins' => 'Disabilita autenticazione tramite password',
    'psw_ValidateEmptySSHPassword' => 'La password SSH non può essere vuota',
    'psw_ValidateWeakSSHPassword' => 'La password SSH deve essere più lunga di 4 caratteri',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'Password SSH inserita incorrettamente. Reinserisci la password.',
];