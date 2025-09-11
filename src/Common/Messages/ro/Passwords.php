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
    'psw_GeneratePassword' => 'Generare parolă',
    'psw_UseGenerateButton' => 'Folosiți butonul de generare pentru a crea o parolă sigură.',
    'psw_PasswordGenerated' => 'Parolă sigură generată cu succes',
    'psw_DefaultPasswordWarning' => 'Parolă implicită detectată',
    'psw_ChangeDefaultPassword' => 'Folosiți parola implicită. Vă rugăm să o schimbați din motive de securitate.',
    'psw_WeakPassword' => 'Parolă slabă',
    'psw_PasswordTooCommon' => 'Această parolă este prea comună și ușor de ghicit.',
    'psw_PasswordTooShort' => 'Parola este prea scurtă (minim %min% caractere)',
    'psw_PasswordTooLong' => 'Parola este prea lungă (maxim %max% caractere)',
    'psw_PasswordMinLength' => 'Parola trebuie să conțină cel puțin 8 caractere.',
    'psw_PasswordRequirements' => 'Cerințe parolă',
    'psw_PasswordSuggestions' => 'Recomandări pentru îmbunătățirea securității parolei',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Foarte slabă',
    'psw_Weak' => 'Slabă',
    'psw_Fair' => 'Acceptabilă',
    'psw_Good' => 'Bună',
    'psw_Strong' => 'Puternică',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Parola nu poate fi goală',
    'psw_EmptyPassword' => 'Parola nu poate fi goală',
    'psw_PasswordInDictionary' => 'Parola găsită în dicționarul de parole comune',
    'psw_PasswordAcceptable' => 'Parola este acceptabilă',
    'psw_PasswordGenerateFailed' => 'Nu s-a putut genera parola',
    'psw_PasswordsArrayRequired' => 'Este necesară o matrice de parole',
    'psw_InvalidPasswordsFormat' => 'Format invalid de date pentru parolă',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Adăugați litere mari',
    'psw_AddLowercase' => 'Adăugați litere mici',
    'psw_AddNumbers' => 'Adăugați cifre',
    'psw_AddSpecialChars' => 'Adăugați caractere speciale',
    'psw_IncreaseLength' => 'Măriți lungimea parolei',
    'psw_AvoidRepeating' => 'Evitați caracterele repetitive',
    'psw_AvoidSequential' => 'Evitați caracterele secvențiale',
    'psw_AvoidCommonWords' => 'Evitați cuvintele comune',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Parola de setat este prea simplă.',
    'psw_SetPassword' => 'Setați parolă nouă',
    'psw_SetPasswordError' => 'Parola - %password% nu poate fi folosită, se găsește în dicționarul de parole simple.',
    'psw_SetPasswordInfo' => 'Parola specificată nu poate fi folosită, se găsește în dicționarul de parole simple.',
    'psw_PasswordNoNumbers' => 'Parola trebuie să conțină cifre',
    'psw_PasswordNoLowSimvol' => 'Parola trebuie să conțină caractere mici',
    'psw_PasswordNoUpperSimvol' => 'Parola trebuie să conțină caractere mari',
    'psw_PasswordIsDefault' => 'Se folosește parola implicită',
    'psw_PasswordNoSpecialChars' => 'Adăugați caractere speciale (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Folosiți o combinație de litere, cifre și simboluri',
    'psw_PasswordAvoidCommon' => 'Evitați cuvintele și expresiile comune',
    'psw_PasswordUsePassphrase' => 'Luați în considerare folosirea unei fraze de acces',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Slabă',
    'psw_PasswordStrengthFair' => 'Satisfăcătoare',
    'psw_PasswordStrengthGood' => 'Bună',
    'psw_PasswordStrengthStrong' => 'Puternică',
    'psw_PasswordStrengthVeryStrong' => 'Foarte puternică',
    'psw_PasswordSecurityRequiresFair' => 'Pentru a asigura securitatea, parola trebuie să aibă cel puțin fiabilitate medie',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Parolă',
    'psw_WebAdminPasswordRepeat' => 'Repetați introducerea parolei',
    'psw_Passwords' => 'Parola interfeței WEB',
    'psw_ValidateEmptyWebPassword' => 'Parola panoului admin nu poate fi goală',
    'psw_ValidateWeakWebPassword' => 'Parola WEB trebuie să fie mai lungă de 4 caractere',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Parola interfeței web a fost introdusă incorect',
    
    // SSH password specific
    'psw_SSHPassword' => 'Parolă SSH',
    'psw_SSHPasswordRepeat' => 'Repetați introducerea parolei',
    'psw_SSHDisablePasswordLogins' => 'Dezactivați autorizarea prin parolă',
    'psw_ValidateEmptySSHPassword' => 'Parola SSH nu poate fi goală',
    'psw_ValidateWeakSSHPassword' => 'Parola SSH trebuie să fie mai lungă de 4 caractere',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'Parola SSH a fost introdusă incorect. Repetați introducerea parolei.',
];