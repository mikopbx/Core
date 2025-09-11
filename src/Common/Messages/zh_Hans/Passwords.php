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
    'psw_GeneratePassword' => '生成密码',
    'psw_UseGenerateButton' => '使用生成按钮创建安全密码。',
    'psw_PasswordGenerated' => '安全密码生成成功',
    'psw_DefaultPasswordWarning' => '检测到默认密码',
    'psw_ChangeDefaultPassword' => '您正在使用默认密码。请为了安全而更改它。',
    'psw_WeakPassword' => '弱密码',
    'psw_PasswordTooCommon' => '此密码过于常见且容易被猜到。',
    'psw_PasswordTooShort' => '密码太短（至少%min%个字符）',
    'psw_PasswordTooLong' => '密码太长（最多%max%个字符）',
    'psw_PasswordMinLength' => '密码必须包含至少8个字符。',
    'psw_PasswordRequirements' => '密码要求',
    'psw_PasswordSuggestions' => '改善密码强度的建议',
    
    // Password strength indicators
    'psw_VeryWeak' => '非常弱',
    'psw_Weak' => '弱',
    'psw_Fair' => '一般',
    'psw_Good' => '好',
    'psw_Strong' => '强',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => '密码不能为空',
    'psw_EmptyPassword' => '密码不能为空',
    'psw_PasswordInDictionary' => '在常用密码字典中找到密码',
    'psw_PasswordAcceptable' => '密码可接受',
    'psw_PasswordGenerateFailed' => '密码生成失败',
    'psw_PasswordsArrayRequired' => '需要密码数组',
    'psw_InvalidPasswordsFormat' => '无效的密码数据格式',
    
    // Additional suggestions
    'psw_AddUppercase' => '添加大写字母',
    'psw_AddLowercase' => '添加小写字母',
    'psw_AddNumbers' => '添加数字',
    'psw_AddSpecialChars' => '添加特殊字符',
    'psw_IncreaseLength' => '增加密码长度',
    'psw_AvoidRepeating' => '避免重复字符',
    'psw_AvoidSequential' => '避免连续字符',
    'psw_AvoidCommonWords' => '避免常用词汇',
    
    // Password validation errors
    'psw_PasswordSimple' => '正在设置的密码过于简单。',
    'psw_SetPassword' => '设置新密码',
    'psw_SetPasswordError' => '密码 - %password% 无法使用，它在简单密码字典中。',
    'psw_SetPasswordInfo' => '指定的密码无法使用，它在简单密码字典中。',
    'psw_PasswordNoNumbers' => '密码必须包含数字',
    'psw_PasswordNoLowSimvol' => '密码必须包含小写字符',
    'psw_PasswordNoUpperSimvol' => '密码必须包含大写字符',
    'psw_PasswordIsDefault' => '正在使用默认密码',
    'psw_PasswordNoSpecialChars' => '添加特殊字符 (!@#$%)',
    'psw_PasswordMixCharTypes' => '使用字母、数字和符号的组合',
    'psw_PasswordAvoidCommon' => '避免常用词汇和短语',
    'psw_PasswordUsePassphrase' => '考虑使用密码短语',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => '弱',
    'psw_PasswordStrengthFair' => '一般',
    'psw_PasswordStrengthGood' => '好',
    'psw_PasswordStrengthStrong' => '强',
    'psw_PasswordStrengthVeryStrong' => '非常强',
    'psw_PasswordSecurityRequiresFair' => '为了安全，密码必须至少有一般强度',
    
    // Web admin password specific
    'psw_WebAdminPassword' => '密码',
    'psw_WebAdminPasswordRepeat' => '重复输入密码',
    'psw_Passwords' => 'WEB界面密码',
    'psw_ValidateEmptyWebPassword' => '管理员密码不能为空',
    'psw_ValidateWeakWebPassword' => 'WEB密码必须超过4个字符',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Web界面密码输入不正确',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSH密码',
    'psw_SSHPasswordRepeat' => '重复输入密码',
    'psw_SSHDisablePasswordLogins' => '禁用密码身份验证',
    'psw_ValidateEmptySSHPassword' => 'SSH密码不能为空',
    'psw_ValidateWeakSSHPassword' => 'SSH密码必须超过4个字符',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSH密码输入不正确。请重新输入密码。',
];