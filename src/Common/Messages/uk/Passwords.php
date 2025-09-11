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
    'psw_GeneratePassword' => 'Згенерувати пароль',
    'psw_UseGenerateButton' => 'Використайте кнопку генерації для створення надійного пароля.',
    'psw_PasswordGenerated' => 'Надійний пароль успішно згенеровано',
    'psw_DefaultPasswordWarning' => 'Виявлено пароль за замовчуванням',
    'psw_ChangeDefaultPassword' => 'Ви використовуєте пароль за замовчуванням. Будь ласка, змініть його з міркувань безпеки.',
    'psw_WeakPassword' => 'Слабкий пароль',
    'psw_PasswordTooCommon' => 'Цей пароль занадто поширений і легко вгадується.',
    'psw_PasswordTooShort' => 'Пароль занадто короткий (мінімум %min% символів)',
    'psw_PasswordTooLong' => 'Пароль занадто довгий (максимум %max% символів)',
    'psw_PasswordMinLength' => 'Пароль повинен містити не менше 8 символів.',
    'psw_PasswordRequirements' => 'Вимоги до пароля',
    'psw_PasswordSuggestions' => 'Рекомендації для покращення безпеки пароля',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Дуже слабкий',
    'psw_Weak' => 'Слабкий',
    'psw_Fair' => 'Середній',
    'psw_Good' => 'Гарний',
    'psw_Strong' => 'Надійний',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Пароль не може бути порожнім',
    'psw_EmptyPassword' => 'Пароль не може бути порожнім',
    'psw_PasswordInDictionary' => 'Пароль знайдено в словнику поширених паролів',
    'psw_PasswordAcceptable' => 'Пароль прийнятний',
    'psw_PasswordGenerateFailed' => 'Не вдалося згенерувати пароль',
    'psw_PasswordsArrayRequired' => 'Потрібен масив паролів',
    'psw_InvalidPasswordsFormat' => 'Невірний формат даних пароля',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Додайте великі літери',
    'psw_AddLowercase' => 'Додайте малі літери',
    'psw_AddNumbers' => 'Додайте цифри',
    'psw_AddSpecialChars' => 'Додайте спеціальні символи',
    'psw_IncreaseLength' => 'Збільште довжину пароля',
    'psw_AvoidRepeating' => 'Уникайте символів, що повторюються',
    'psw_AvoidSequential' => 'Уникайте послідовних символів',
    'psw_AvoidCommonWords' => 'Уникайте поширених слів',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Пароль, що встановлюється, занадто простий.',
    'psw_SetPassword' => 'Встановити новий пароль',
    'psw_SetPasswordError' => 'Пароль - %password% не можна використовувати, він присутній у словнику простих паролів.',
    'psw_SetPasswordInfo' => 'Вказаний пароль не можна використовувати, він присутній у словнику простих паролів.',
    'psw_PasswordNoNumbers' => 'Пароль повинен містити цифри',
    'psw_PasswordNoLowSimvol' => 'Пароль повинен містити символи нижнього регістру',
    'psw_PasswordNoUpperSimvol' => 'Пароль повинен містити символи верхнього регістру',
    'psw_PasswordIsDefault' => 'Використовується пароль за замовчуванням',
    'psw_PasswordNoSpecialChars' => 'Додайте спеціальні символи (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Використайте поєднання літер, цифр і символів',
    'psw_PasswordAvoidCommon' => 'Уникайте поширених слів і фраз',
    'psw_PasswordUsePassphrase' => 'Розгляньте використання парольної фрази',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Слабкий',
    'psw_PasswordStrengthFair' => 'Задовільний',
    'psw_PasswordStrengthGood' => 'Гарний',
    'psw_PasswordStrengthStrong' => 'Сильний',
    'psw_PasswordStrengthVeryStrong' => 'Дуже сильний',
    'psw_PasswordSecurityRequiresFair' => 'Для забезпечення безпеки пароль повинен мати принаймні середню надійність',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Пароль',
    'psw_WebAdminPasswordRepeat' => 'Повторіть введення пароля',
    'psw_Passwords' => 'Пароль WEB інтерфейсу',
    'psw_ValidateEmptyWebPassword' => 'Пароль панелі адміністратора не може бути порожнім',
    'psw_ValidateWeakWebPassword' => 'Пароль WEB повинен бути довшим за 4 символи',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Пароль web інтерфейсу введено некоректно',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH пароль',
    'psw_SSHPasswordRepeat' => 'Повторіть введення пароля',
    'psw_SSHDisablePasswordLogins' => 'Відключити авторизацію за паролем',
    'psw_ValidateEmptySSHPassword' => 'Пароль SSH не може бути порожнім',
    'psw_ValidateWeakSSHPassword' => 'Пароль SSH повинен бути довшим за 4 символи',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'Пароль SSH введено некоректно. Повторіть введення пароля.',
];