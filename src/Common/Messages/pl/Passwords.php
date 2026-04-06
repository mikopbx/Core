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
    'psw_GeneratePassword' => 'Generuj hasło',
    'psw_UseGenerateButton' => 'Użyj przycisku generowania, aby utworzyć bezpieczne hasło.',
    'psw_PasswordGenerated' => 'Bezpieczne hasło zostało pomyślnie wygenerowane',
    'psw_DefaultPasswordWarning' => 'Wykryto hasło domyślne',
    'psw_ChangeDefaultPassword' => 'Używasz domyślnego hasła. Proszę zmienić je ze względów bezpieczeństwa.',
    'psw_WeakPassword' => 'Słabe hasło',
    'psw_PasswordTooCommon' => 'To hasło jest zbyt popularne i łatwe do odgadnięcia.',
    'psw_PasswordTooShort' => 'Hasło jest zbyt krótkie (minimum %min% znaków)',
    'psw_PasswordTooLong' => 'Hasło jest zbyt długie (maksymalnie %max% znaków)',
    'psw_PasswordMinLength' => 'Hasło musi zawierać co najmniej 8 znaków.',
    'psw_PasswordRequirements' => 'Wymagania dotyczące hasła',
    'psw_PasswordSuggestions' => 'Rekomendacje dla poprawy bezpieczeństwa hasła',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Bardzo słabe',
    'psw_Weak' => 'Słabe',
    'psw_Fair' => 'Średnie',
    'psw_Good' => 'Dobre',
    'psw_Strong' => 'Silne',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Hasło nie może być puste',
    'psw_EmptyPassword' => 'Hasło nie może być puste',
    'psw_PasswordInDictionary' => 'Hasło znalezione w słowniku popularnych haseł',
    'psw_PasswordAcceptable' => 'Hasło jest akceptowalne',
    'psw_PasswordGenerateFailed' => 'Nie udało się wygenerować hasła',
    'psw_PasswordsArrayRequired' => 'Wymagana jest tablica haseł',
    'psw_InvalidPasswordsFormat' => 'Nieprawidłowy format danych hasła',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Dodaj wielkie litery',
    'psw_AddLowercase' => 'Dodaj małe litery',
    'psw_AddNumbers' => 'Dodaj cyfry',
    'psw_AddSpecialChars' => 'Dodaj znaki specjalne',
    'psw_IncreaseLength' => 'Zwiększ długość hasła',
    'psw_AvoidRepeating' => 'Unikaj powtarzających się znaków',
    'psw_AvoidSequential' => 'Unikaj kolejnych znaków',
    'psw_AvoidCommonWords' => 'Unikaj popularnych słów',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Ustawiane hasło jest zbyt proste.',
    'psw_SetPassword' => 'Ustaw nowe hasło',
    'psw_SetPasswordError' => 'Hasło - %password% nie może być używane, znajduje się w słowniku prostych haseł.',
    'psw_SetPasswordInfo' => 'Podane hasło nie może być używane, znajduje się w słowniku prostych haseł.',
    'psw_PasswordNoNumbers' => 'Hasło musi zawierać cyfry',
    'psw_PasswordNoLowSimvol' => 'Hasło musi zawierać małe litery',
    'psw_PasswordNoUpperSimvol' => 'Hasło musi zawierać wielkie litery',
    'psw_PasswordIsDefault' => 'Używane jest hasło domyślne',
    'psw_PasswordNoSpecialChars' => 'Dodaj znaki specjalne (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Użyj kombinacji liter, cyfr i symboli',
    'psw_PasswordAvoidCommon' => 'Unikaj popularnych słów i fraz',
    'psw_PasswordUsePassphrase' => 'Rozważ użycie hasła frazowego',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Słabe',
    'psw_PasswordStrengthFair' => 'Zadowalające',
    'psw_PasswordStrengthGood' => 'Dobre',
    'psw_PasswordStrengthStrong' => 'Silne',
    'psw_PasswordStrengthVeryStrong' => 'Bardzo silne',
    'psw_PasswordSecurityRequiresFair' => 'Aby zapewnić bezpieczeństwo, hasło musi mieć co najmniej średnią niezawodność',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Hasło',
    'psw_WebAdminPasswordRepeat' => 'Powtórz wprowadzanie hasła',
    'psw_Passwords' => 'Hasło interfejsu WEB',
    'psw_ValidateEmptyWebPassword' => 'Hasło panelu administracyjnego nie może być puste',
    'psw_ValidateWeakWebPassword' => 'Hasło WEB musi być dłuższe niż 4 znaki',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Hasło interfejsu web zostało wprowadzone nieprawidłowo',
    
    // SSH password specific
    'psw_SSHPassword' => 'Hasło SSH',
    'psw_SSHPasswordRepeat' => 'Powtórz wprowadzanie hasła',
    'psw_SSHDisablePasswordLogins' => 'Wyłącz autoryzację hasłem',
    'psw_ValidateEmptySSHPassword' => 'Hasło SSH nie może być puste',
    'psw_ValidateWeakSSHPassword' => 'Hasło SSH musi być dłuższe niż 4 znaki',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'Hasło SSH zostało wprowadzone nieprawidłowo. Powtórz wprowadzanie hasła.',
];