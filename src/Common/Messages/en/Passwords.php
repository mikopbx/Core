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
    'psw_GeneratePassword' => 'Generate Password',
    'psw_UseGenerateButton' => 'Use the generate button to create a strong password.',
    'psw_PasswordGenerated' => 'Strong password successfully generated',
    'psw_DefaultPasswordWarning' => 'Default password detected',
    'psw_ChangeDefaultPassword' => 'You are using a default password. Please change it for security.',
    'psw_WeakPassword' => 'Weak password',
    'psw_PasswordTooCommon' => 'This password is too common and easily guessable.',
    'psw_PasswordTooShort' => 'Password is too short (minimum %min% characters)',
    'psw_PasswordTooLong' => 'Password is too long (maximum %max% characters)',
    'psw_PasswordMinLength' => 'Password must contain at least 8 characters.',
    'psw_PasswordRequirements' => 'Password requirements',
    'psw_PasswordSuggestions' => 'Suggestions for improving password strength',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Very Weak',
    'psw_Weak' => 'Weak',
    'psw_Fair' => 'Fair',
    'psw_Good' => 'Good',
    'psw_Strong' => 'Strong',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Password cannot be empty',
    'psw_EmptyPassword' => 'Password cannot be empty',
    'psw_PasswordInDictionary' => 'Password found in common passwords dictionary',
    'psw_PasswordAcceptable' => 'Password is acceptable',
    'psw_PasswordGenerateFailed' => 'Failed to generate password',
    'psw_PasswordsArrayRequired' => 'Passwords array required',
    'psw_InvalidPasswordsFormat' => 'Invalid password data format',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Add uppercase letters',
    'psw_AddLowercase' => 'Add lowercase letters',
    'psw_AddNumbers' => 'Add numbers',
    'psw_AddSpecialChars' => 'Add special characters',
    'psw_IncreaseLength' => 'Increase password length',
    'psw_AvoidRepeating' => 'Avoid repeating characters',
    'psw_AvoidSequential' => 'Avoid sequential characters',
    'psw_AvoidCommonWords' => 'Avoid common words',
    
    // Password validation errors
    'psw_PasswordSimple' => 'The password being set is too simple.',
    'psw_SetPassword' => 'Set new password',
    'psw_SetPasswordError' => 'Password - %password% cannot be used, it is in the simple passwords dictionary.',
    'psw_SetPasswordInfo' => 'The specified password cannot be used, it is in the simple passwords dictionary.',
    'psw_PasswordNoNumbers' => 'Password must contain numbers',
    'psw_PasswordNoLowSimvol' => 'Password must contain lowercase characters',
    'psw_PasswordNoUpperSimvol' => 'Password must contain uppercase characters',
    'psw_PasswordIsDefault' => 'Default password is being used',
    'psw_PasswordNoSpecialChars' => 'Add special characters (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Use a mix of letters, numbers and symbols',
    'psw_PasswordAvoidCommon' => 'Avoid common words and phrases',
    'psw_PasswordUsePassphrase' => 'Consider using a passphrase',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Weak',
    'psw_PasswordStrengthFair' => 'Fair',
    'psw_PasswordStrengthGood' => 'Good',
    'psw_PasswordStrengthStrong' => 'Strong',
    'psw_PasswordStrengthVeryStrong' => 'Very Strong',
    'psw_PasswordSecurityRequiresFair' => 'For security, password must have at least fair strength',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Password',
    'psw_WebAdminPasswordRepeat' => 'Repeat password entry',
    'psw_Passwords' => 'WEB interface password',
    'psw_ValidateEmptyWebPassword' => 'Admin password cannot be empty',
    'psw_ValidateWeakWebPassword' => 'WEB password must be longer than 4 characters',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Web interface password entered incorrectly',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH password',
    'psw_SSHPasswordRepeat' => 'Repeat password entry',
    'psw_SSHDisablePasswordLogins' => 'Disable password authentication',
    'psw_ValidateEmptySSHPassword' => 'SSH password cannot be empty',
    'psw_ValidateWeakSSHPassword' => 'SSH password must be longer than 4 characters',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSH password entered incorrectly. Please re-enter password.',
];