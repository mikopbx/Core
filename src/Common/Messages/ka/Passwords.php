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
    'psw_GeneratePassword' => 'პაროლის გენერირება',
    'psw_UseGenerateButton' => 'გამოიყენეთ გენერაციის ღილაკი უსაფრთხო პაროლის შესაქმნელად.',
    'psw_PasswordGenerated' => 'უსაფრთხო პაროლი წარმატებით გენერირებულია',
    'psw_DefaultPasswordWarning' => 'ნაგულისხმევი პაროლი აღმოჩენილია',
    'psw_ChangeDefaultPassword' => 'თქვენ იყენებთ ნაგულისხმევ პაროლს. გთხოვთ შეცვალოთ ის უსაფრთხოებისთვის.',
    'psw_WeakPassword' => 'სუსტი პაროლი',
    'psw_PasswordTooCommon' => 'ეს პაროლი ზედმეტად გავრცელებულია და ადვილად გამოცნობადია.',
    'psw_PasswordTooShort' => 'პაროლი ზედმეტად მოკლეა (მინიმუმ %min% სიმბოლო)',
    'psw_PasswordTooLong' => 'პაროლი ზედმეტად გრძელია (მაქსიმუმ %max% სიმბოლო)',
    'psw_PasswordMinLength' => 'პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს.',
    'psw_PasswordRequirements' => 'პაროლის მოთხოვნები',
    'psw_PasswordSuggestions' => 'რეკომენდაციები პაროლის უსაფრთხოების გასაუმჯობესებლად',
    
    // Password strength indicators
    'psw_VeryWeak' => 'ძალიან სუსტი',
    'psw_Weak' => 'სუსტი',
    'psw_Fair' => 'საშუალო',
    'psw_Good' => 'კარგი',
    'psw_Strong' => 'ძლიერი',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'პაროლი არ შეიძლება იყოს ცარიელი',
    'psw_EmptyPassword' => 'პაროლი არ შეიძლება იყოს ცარიელი',
    'psw_PasswordInDictionary' => 'პაროლი ნაპოვნია გავრცელებული პაროლების ლექსიკონში',
    'psw_PasswordAcceptable' => 'პაროლი მისაღებია',
    'psw_PasswordGenerateFailed' => 'პაროლის გენერირება ვერ მოხერხდა',
    'psw_PasswordsArrayRequired' => 'საჭიროა პაროლების მასივი',
    'psw_InvalidPasswordsFormat' => 'პაროლის მონაცემების არასწორი ფორმატი',
    
    // Additional suggestions
    'psw_AddUppercase' => 'დაამატეთ დიდი ასოები',
    'psw_AddLowercase' => 'დაამატეთ პატარა ასოები',
    'psw_AddNumbers' => 'დაამატეთ რიცხვები',
    'psw_AddSpecialChars' => 'დაამატეთ სპეციალური სიმბოლოები',
    'psw_IncreaseLength' => 'გაზარდეთ პაროლის სიგრძე',
    'psw_AvoidRepeating' => 'თავიდან აიცილეთ განმეორებითი სიმბოლოები',
    'psw_AvoidSequential' => 'თავიდან აიცილეთ თანმიმდევრული სიმბოლოები',
    'psw_AvoidCommonWords' => 'თავიდან აიცილეთ გავრცელებული სიტყვები',
    
    // Password validation errors
    'psw_PasswordSimple' => 'დასაყენებელი პაროლი ზედმეტად მარტივია.',
    'psw_SetPassword' => 'დააყენეთ ახალი პაროლი',
    'psw_SetPasswordError' => 'პაროლი - %password% ვერ გამოიყენება, ის არსებობს მარტივი პაროლების ლექსიკონში.',
    'psw_SetPasswordInfo' => 'მითითებული პაროლი ვერ გამოიყენება, ის არსებობს მარტივი პაროლების ლექსიკონში.',
    'psw_PasswordNoNumbers' => 'პაროლი უნდა შეიცავდეს რიცხვებს',
    'psw_PasswordNoLowSimvol' => 'პაროლი უნდა შეიცავდეს პატარა ასოების სიმბოლოებს',
    'psw_PasswordNoUpperSimvol' => 'პაროლი უნდა შეიცავდეს დიდი ასოების სიმბოლოებს',
    'psw_PasswordIsDefault' => 'გამოიყენება ნაგულისხმევი პაროლი',
    'psw_PasswordNoSpecialChars' => 'დაამატეთ სპეციალური სიმბოლოები (!@#$%)',
    'psw_PasswordMixCharTypes' => 'გამოიყენეთ ასოების, რიცხვებისა და სიმბოლოების კომბინაცია',
    'psw_PasswordAvoidCommon' => 'თავიდან აიცილეთ გავრცელებული სიტყვები და ფრაზები',
    'psw_PasswordUsePassphrase' => 'განიხილეთ პაროლის ფრაზის გამოყენება',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'სუსტი',
    'psw_PasswordStrengthFair' => 'დამაკმაყოფილებელი',
    'psw_PasswordStrengthGood' => 'კარგი',
    'psw_PasswordStrengthStrong' => 'ძლიერი',
    'psw_PasswordStrengthVeryStrong' => 'ძალიან ძლიერი',
    'psw_PasswordSecurityRequiresFair' => 'უსაფრთხოების უზრუნველსაყოფად პაროლი უნდა ყოფილიყოს მინიმუმ საშუალო საიმედოობის',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'პაროლი',
    'psw_WebAdminPasswordRepeat' => 'გაიმეორეთ პაროლის შეყვანა',
    'psw_Passwords' => 'WEB ინტერფეისის პაროლი',
    'psw_ValidateEmptyWebPassword' => 'ადმინისტრაციის პანელის პაროლი არ შეიძლება იყოს ცარიელი',
    'psw_ValidateWeakWebPassword' => 'WEB პაროლი უნდა იყოს 4 სიმბოლოზე გრძელი',
    'psw_ValidateWebPasswordsFieldDifferent' => 'ვებ ინტერფეისის პაროლი არასწორად იქნა შეყვანილი',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH პაროლი',
    'psw_SSHPasswordRepeat' => 'გაიმეორეთ პაროლის შეყვანა',
    'psw_SSHDisablePasswordLogins' => 'პაროლის ავტორიზაციის გამორთვა',
    'psw_ValidateEmptySSHPassword' => 'SSH პაროლი არ შეიძლება იყოს ცარიელი',
    'psw_ValidateWeakSSHPassword' => 'SSH პაროლი უნდა იყოს 4 სიმბოლოზე გრძელი',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSH პაროლი არასწორად იქნა შეყვანილი. გაიმეორეთ პაროლის შეყვანა.',
];