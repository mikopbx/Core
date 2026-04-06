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
    'psw_GeneratePassword' => 'Luo salasana',
    'psw_UseGenerateButton' => 'Käytä luomispainiketta turvallisen salasanan luomiseen.',
    'psw_PasswordGenerated' => 'Turvallinen salasana luotiin onnistuneesti',
    'psw_DefaultPasswordWarning' => 'Oletussalasana havaittu',
    'psw_ChangeDefaultPassword' => 'Käytät oletussalasanaa. Vaihda se turvallisuussyistä.',
    'psw_WeakPassword' => 'Heikko salasana',
    'psw_PasswordTooCommon' => 'Tämä salasana on liian yleinen ja helposti arvattavissa.',
    'psw_PasswordTooShort' => 'Salasana on liian lyhyt (vähintään %min% merkkiä)',
    'psw_PasswordTooLong' => 'Salasana on liian pitkä (enintään %max% merkkiä)',
    'psw_PasswordMinLength' => 'Salasanan tulee sisältää vähintään 8 merkkiä.',
    'psw_PasswordRequirements' => 'Salasanavaatimukset',
    'psw_PasswordSuggestions' => 'Suositukset salasanan turvallisuuden parantamiseksi',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Erittäin heikko',
    'psw_Weak' => 'Heikko',
    'psw_Fair' => 'Kohtalainen',
    'psw_Good' => 'Hyvä',
    'psw_Strong' => 'Vahva',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Salasana ei voi olla tyhjä',
    'psw_EmptyPassword' => 'Salasana ei voi olla tyhjä',
    'psw_PasswordInDictionary' => 'Salasana löytyi yleisten salasanojen sanakirjasta',
    'psw_PasswordAcceptable' => 'Salasana on hyväksyttävä',
    'psw_PasswordGenerateFailed' => 'Salasanan luominen epäonnistui',
    'psw_PasswordsArrayRequired' => 'Salasanojen taulukko vaaditaan',
    'psw_InvalidPasswordsFormat' => 'Virheellinen salasanatietojen muoto',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Lisää isoja kirjaimia',
    'psw_AddLowercase' => 'Lisää pieniä kirjaimia',
    'psw_AddNumbers' => 'Lisää numeroita',
    'psw_AddSpecialChars' => 'Lisää erikoismerkkejä',
    'psw_IncreaseLength' => 'Pidennä salasanaa',
    'psw_AvoidRepeating' => 'Vältä toistettuja merkkejä',
    'psw_AvoidSequential' => 'Vältä peräkkäisiä merkkejä',
    'psw_AvoidCommonWords' => 'Vältä yleisiä sanoja',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Asetettava salasana on liian yksinkertainen.',
    'psw_SetPassword' => 'Aseta uusi salasana',
    'psw_SetPasswordError' => 'Salasanaa - %password% ei voida käyttää, se löytyy yksinkertaisten salasanojen sanakirjasta.',
    'psw_SetPasswordInfo' => 'Määritettyä salasanaa ei voida käyttää, se löytyy yksinkertaisten salasanojen sanakirjasta.',
    'psw_PasswordNoNumbers' => 'Salasanan tulee sisältää numeroita',
    'psw_PasswordNoLowSimvol' => 'Salasanan tulee sisältää pieniä kirjaimia',
    'psw_PasswordNoUpperSimvol' => 'Salasanan tulee sisältää isoja kirjaimia',
    'psw_PasswordIsDefault' => 'Käytetään oletussalasanaa',
    'psw_PasswordNoSpecialChars' => 'Lisää erikoismerkkejä (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Käytä kirjainten, numeroiden ja symbolien yhdistelmää',
    'psw_PasswordAvoidCommon' => 'Vältä yleisiä sanoja ja lauseita',
    'psw_PasswordUsePassphrase' => 'Harkitse salauslauseen käyttöä',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Heikko',
    'psw_PasswordStrengthFair' => 'Tyydyttävä',
    'psw_PasswordStrengthGood' => 'Hyvä',
    'psw_PasswordStrengthStrong' => 'Vahva',
    'psw_PasswordStrengthVeryStrong' => 'Erittäin vahva',
    'psw_PasswordSecurityRequiresFair' => 'Turvallisuuden varmistamiseksi salasanalla tulee olla vähintään keskiverto luotettavuus',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Salasana',
    'psw_WebAdminPasswordRepeat' => 'Toista salasanan syöttö',
    'psw_Passwords' => 'WEB-käyttöliittymän salasana',
    'psw_ValidateEmptyWebPassword' => 'Hallintapaneelin salasana ei voi olla tyhjä',
    'psw_ValidateWeakWebPassword' => 'WEB-salasanan tulee olla yli 4 merkkiä pitkä',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Web-käyttöliittymän salasana syötettiin väärin',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH-salasana',
    'psw_SSHPasswordRepeat' => 'Toista salasanan syöttö',
    'psw_SSHDisablePasswordLogins' => 'Poista salasanan valtuutus käytöstä',
    'psw_ValidateEmptySSHPassword' => 'SSH-salasana ei voi olla tyhjä',
    'psw_ValidateWeakSSHPassword' => 'SSH-salasanan tulee olla yli 4 merkkiä pitkä',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSH-salasana syötettiin väärin. Toista salasanan syöttö.',
];