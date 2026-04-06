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
    'psw_GeneratePassword' => 'Generovat Heslo',
    'psw_UseGenerateButton' => 'Použijte tlačítko generovat pro vytvoření bezpečného hesla.',
    'psw_PasswordGenerated' => 'Bezpečné heslo bylo úspěšně vygenerováno',
    'psw_DefaultPasswordWarning' => 'Zjištěno výchozí heslo',
    'psw_ChangeDefaultPassword' => 'Používáte výchozí heslo. Změňte ho kvůli bezpečnosti.',
    'psw_WeakPassword' => 'Slabé heslo',
    'psw_PasswordTooCommon' => 'Toto heslo je příliš obvyklé a snadno uhádnutelné.',
    'psw_PasswordTooShort' => 'Heslo je příliš krátké (minimálně %min% znaků)',
    'psw_PasswordTooLong' => 'Heslo je příliš dlouhé (maximálně %max% znaků)',
    'psw_PasswordMinLength' => 'Heslo musí obsahovat alespoň 8 znaků.',
    'psw_PasswordRequirements' => 'Požadavky na heslo',
    'psw_PasswordSuggestions' => 'Návrhy pro zlepšení bezpečnosti hesla',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Velmi Slabé',
    'psw_Weak' => 'Slabé',
    'psw_Fair' => 'Přijatelné',
    'psw_Good' => 'Dobré',
    'psw_Strong' => 'Silné',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Heslo nemůže být prázdné',
    'psw_EmptyPassword' => 'Heslo nemůže být prázdné',
    'psw_PasswordInDictionary' => 'Heslo nalezeno ve slovníku běžných hesel',
    'psw_PasswordAcceptable' => 'Heslo je přijatelné',
    'psw_PasswordGenerateFailed' => 'Generování hesla selhalo',
    'psw_PasswordsArrayRequired' => 'Vyžadováno pole hesel',
    'psw_InvalidPasswordsFormat' => 'Neplatný formát dat hesla',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Přidat velká písmena',
    'psw_AddLowercase' => 'Přidat malá písmena',
    'psw_AddNumbers' => 'Přidat čísla',
    'psw_AddSpecialChars' => 'Přidat speciální znaky',
    'psw_IncreaseLength' => 'Zvýšit délku hesla',
    'psw_AvoidRepeating' => 'Vyhnout se opakujícím znakům',
    'psw_AvoidSequential' => 'Vyhnout se postupným znakům',
    'psw_AvoidCommonWords' => 'Vyhnout se běžným slovům',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Nastavované heslo je příliš jednoduché.',
    'psw_SetPassword' => 'Nastavit nové heslo',
    'psw_SetPasswordError' => 'Heslo - %password% nelze použít, je ve slovníku jednoduchých hesel.',
    'psw_SetPasswordInfo' => 'Zadané heslo nelze použít, je ve slovníku jednoduchých hesel.',
    'psw_PasswordNoNumbers' => 'Heslo musí obsahovat čísla',
    'psw_PasswordNoLowSimvol' => 'Heslo musí obsahovat malá písmena',
    'psw_PasswordNoUpperSimvol' => 'Heslo musí obsahovat velká písmena',
    'psw_PasswordIsDefault' => 'Používá se výchozí heslo',
    'psw_PasswordNoSpecialChars' => 'Přidat speciální znaky (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Použít kombinaci písmen, číslic a symbolů',
    'psw_PasswordAvoidCommon' => 'Vyhnout se běžným slovům a frázím',
    'psw_PasswordUsePassphrase' => 'Zvážit použití heslovací fráze',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Slabé',
    'psw_PasswordStrengthFair' => 'Přijatelné',
    'psw_PasswordStrengthGood' => 'Dobré',
    'psw_PasswordStrengthStrong' => 'Silné',
    'psw_PasswordStrengthVeryStrong' => 'Velmi Silné',
    'psw_PasswordSecurityRequiresFair' => 'Pro bezpečnost musí heslo mít alespoň přijatelnou sílu',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Heslo',
    'psw_WebAdminPasswordRepeat' => 'Opakovat zadání hesla',
    'psw_Passwords' => 'Heslo WEB rozhraní',
    'psw_ValidateEmptyWebPassword' => 'Heslo správce nemůže být prázdné',
    'psw_ValidateWeakWebPassword' => 'WEB heslo musí být delší než 4 znaky',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Heslo webového rozhraní bylo zadáno nesprávně',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH heslo',
    'psw_SSHPasswordRepeat' => 'Opakovat zadání hesla',
    'psw_SSHDisablePasswordLogins' => 'Zakázat ověřování heslem',
    'psw_ValidateEmptySSHPassword' => 'SSH heslo nemůže být prázdné',
    'psw_ValidateWeakSSHPassword' => 'SSH heslo musí být delší než 4 znaky',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSH heslo bylo zadáno nesprávně. Zadejte heslo znovu.',
];