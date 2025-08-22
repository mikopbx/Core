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
    'psw_GeneratePassword' => 'Сгенерировать пароль',
    'psw_UseGenerateButton' => 'Используйте кнопку генерации для создания надежного пароля.',
    'psw_PasswordGenerated' => 'Надежный пароль успешно сгенерирован',
    'psw_DefaultPasswordWarning' => 'Обнаружен пароль по умолчанию',
    'psw_ChangeDefaultPassword' => 'Вы используете пароль по умолчанию. Пожалуйста, измените его для безопасности.',
    'psw_WeakPassword' => 'Слабый пароль',
    'psw_PasswordTooCommon' => 'Этот пароль слишком распространенный и легко угадываемый.',
    'psw_PasswordTooShort' => 'Пароль слишком короткий',
    'psw_PasswordMinLength' => 'Пароль должен содержать не менее 8 символов.',
    'psw_PasswordRequirements' => 'Требования к паролю',
    'psw_PasswordSuggestions' => 'Рекомендации для улучшения надежности пароля',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Очень слабый',
    'psw_Weak' => 'Слабый',
    'psw_Fair' => 'Средний',
    'psw_Good' => 'Хороший',
    'psw_Strong' => 'Надежный',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Пароль не может быть пустым',
    'psw_EmptyPassword' => 'Пароль не может быть пустым',
    'psw_PasswordInDictionary' => 'Пароль найден в словаре распространенных паролей',
    'psw_PasswordAcceptable' => 'Пароль приемлем',
    'psw_PasswordGenerateFailed' => 'Не удалось сгенерировать пароль',
    'psw_PasswordsArrayRequired' => 'Требуется массив паролей',
    'psw_InvalidPasswordsFormat' => 'Неверный формат данных паролей',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Добавьте заглавные буквы',
    'psw_AddLowercase' => 'Добавьте строчные буквы',
    'psw_AddNumbers' => 'Добавьте цифры',
    'psw_AddSpecialChars' => 'Добавьте специальные символы',
    'psw_IncreaseLength' => 'Увеличьте длину пароля',
    'psw_AvoidRepeating' => 'Избегайте повторяющихся символов',
    'psw_AvoidSequential' => 'Избегайте последовательных символов',
    'psw_AvoidCommonWords' => 'Избегайте распространенных слов',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Устанавливаемый пароль слишком простой.',
    'psw_SetPassword' => 'Установите новый пароль',
    'psw_SetPasswordError' => 'Пароль - %password% нельзя использовать, он присутствует в словаре простых паролей.',
    'psw_SetPasswordInfo' => 'Указанный пароль нельзя использовать, он присутствует в словаре простых паролей.',
    'psw_PasswordNoNumbers' => 'Пароль должен содержать цифры',
    'psw_PasswordNoLowSimvol' => 'Пароль должен содержать символы нижнего регистра',
    'psw_PasswordNoUpperSimvol' => 'Пароль должен содержать символы верхнего регистра',
    'psw_PasswordIsDefault' => 'Используется пароль по умолчанию',
    'psw_PasswordNoSpecialChars' => 'Добавьте специальные символы (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Используйте сочетание букв, цифр и символов',
    'psw_PasswordAvoidCommon' => 'Избегайте распространенных слов и фраз',
    'psw_PasswordUsePassphrase' => 'Рассмотрите использование парольной фразы',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Слабый',
    'psw_PasswordStrengthFair' => 'Удовлетворительный',
    'psw_PasswordStrengthGood' => 'Хороший',
    'psw_PasswordStrengthStrong' => 'Сильный',
    'psw_PasswordStrengthVeryStrong' => 'Очень сильный',
    'psw_PasswordSecurityRequiresFair' => 'Для обеспечения безопасности пароль должен иметь хотя бы среднюю надежность',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Пароль',
    'psw_WebAdminPasswordRepeat' => 'Повторите ввод пароля',
    'psw_Passwords' => 'Пароль WEB интерфейса',
    'psw_ValidateEmptyWebPassword' => 'Пароль админки не может быть пустым',
    'psw_ValidateWeakWebPassword' => 'Пароль WEB должен быть длиннее 4х символов',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Пароль web интерфейса введен некорректно',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH пароль',
    'psw_SSHPasswordRepeat' => 'Повторите ввод пароля',
    'psw_SSHDisablePasswordLogins' => 'Отключить авторизацию по паролю',
    'psw_ValidateEmptySSHPassword' => 'Пароль SSH не может быть пустым',
    'psw_ValidateWeakSSHPassword' => 'Пароль SSH должен быть длиннее 4х символов',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'Пароль SSH введен некорректно. Повторите ввод пароля.',
];