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
    'psw_GeneratePassword' => 'Generiraj lozinku',
    'psw_UseGenerateButton' => 'Koristite gumb za generiranje kako biste stvorili sigurnu lozinku.',
    'psw_PasswordGenerated' => 'Sigurna lozinka uspješno generirana',
    'psw_DefaultPasswordWarning' => 'Otkrivena zadana lozinka',
    'psw_ChangeDefaultPassword' => 'Koristite zadanu lozinku. Molimo promijenite je radi sigurnosti.',
    'psw_WeakPassword' => 'Slaba lozinka',
    'psw_PasswordTooCommon' => 'Ova lozinka je prerasprostraněna i lahko pogodiva.',
    'psw_PasswordTooShort' => 'Lozinka je prekratka (najmanje %min% znakova)',
    'psw_PasswordTooLong' => 'Lozinka je predugačka (najviše %max% znakova)',
    'psw_PasswordMinLength' => 'Lozinka mora sadržavati najmanje 8 znakova.',
    'psw_PasswordRequirements' => 'Zahtjevi za lozinku',
    'psw_PasswordSuggestions' => 'Preporuke za poboljšanje sigurnosti lozinke',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Vrlo slaba',
    'psw_Weak' => 'Slaba',
    'psw_Fair' => 'Osrednja',
    'psw_Good' => 'Dobra',
    'psw_Strong' => 'Jaka',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Lozinka ne može biti prazna',
    'psw_EmptyPassword' => 'Lozinka ne može biti prazna',
    'psw_PasswordInDictionary' => 'Lozinka pronađena u rječniku uobičajenih lozinki',
    'psw_PasswordAcceptable' => 'Lozinka je prihvatljiva',
    'psw_PasswordGenerateFailed' => 'Neuspjelo generiranje lozinke',
    'psw_PasswordsArrayRequired' => 'Potreban je niz lozinki',
    'psw_InvalidPasswordsFormat' => 'Neispravan format podataka lozinke',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Dodajte velika slova',
    'psw_AddLowercase' => 'Dodajte mala slova',
    'psw_AddNumbers' => 'Dodajte brojeve',
    'psw_AddSpecialChars' => 'Dodajte posebne znakove',
    'psw_IncreaseLength' => 'Povećajte duljinu lozinke',
    'psw_AvoidRepeating' => 'Izbjegavajte ponavljajuće znakove',
    'psw_AvoidSequential' => 'Izbjegavajte uzastopne znakove',
    'psw_AvoidCommonWords' => 'Izbjegavajte česte riječi',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Lozinka koju treba postaviti je presimple.',
    'psw_SetPassword' => 'Postavite novu lozinku',
    'psw_SetPasswordError' => 'Lozinka - %password% se ne može koristiti, nalazi se u rječniku jednostavnih lozinki.',
    'psw_SetPasswordInfo' => 'Navedena lozinka se ne može koristiti, nalazi se u rječniku jednostavnih lozinki.',
    'psw_PasswordNoNumbers' => 'Lozinka mora sadržavati brojeve',
    'psw_PasswordNoLowSimvol' => 'Lozinka mora sadržavati mala slova',
    'psw_PasswordNoUpperSimvol' => 'Lozinka mora sadržavati velika slova',
    'psw_PasswordIsDefault' => 'Koristi se zadana lozinka',
    'psw_PasswordNoSpecialChars' => 'Dodajte posebne znakove (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Koristite kombinaciju slova, brojeva i simbola',
    'psw_PasswordAvoidCommon' => 'Izbjegavajte česte riječi i fraze',
    'psw_PasswordUsePassphrase' => 'Razmislite o korištenju sigurnosne fraze',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Slaba',
    'psw_PasswordStrengthFair' => 'Zadovoljavajuća',
    'psw_PasswordStrengthGood' => 'Dobra',
    'psw_PasswordStrengthStrong' => 'Jaka',
    'psw_PasswordStrengthVeryStrong' => 'Vrlo jaka',
    'psw_PasswordSecurityRequiresFair' => 'Za osiguravanje sigurnosti lozinka mora imati barem umjerenu pouzdanost',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Lozinka',
    'psw_WebAdminPasswordRepeat' => 'Ponovite unos lozinke',
    'psw_Passwords' => 'Lozinka WEB sučelja',
    'psw_ValidateEmptyWebPassword' => 'Lozinka admin panela ne može biti prazna',
    'psw_ValidateWeakWebPassword' => 'WEB lozinka mora biti duža od 4 znaka',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Lozinka web sučelja je neispravno unesena',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH lozinka',
    'psw_SSHPasswordRepeat' => 'Ponovite unos lozinke',
    'psw_SSHDisablePasswordLogins' => 'Onemogući autorizaciju lozinke',
    'psw_ValidateEmptySSHPassword' => 'SSH lozinka ne može biti prazna',
    'psw_ValidateWeakSSHPassword' => 'SSH lozinka mora biti duža od 4 znaka',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSH lozinka je neispravno unesena. Ponovite unos lozinke.',
];