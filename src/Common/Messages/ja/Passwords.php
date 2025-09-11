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
    'psw_GeneratePassword' => 'パスワードを生成',
    'psw_UseGenerateButton' => '生成ボタンを使用して安全なパスワードを作成してください。',
    'psw_PasswordGenerated' => '安全なパスワードが正常に生成されました',
    'psw_DefaultPasswordWarning' => 'デフォルトパスワードが検出されました',
    'psw_ChangeDefaultPassword' => 'デフォルトパスワードを使用しています。セキュリティのために変更してください。',
    'psw_WeakPassword' => '弱いパスワード',
    'psw_PasswordTooCommon' => 'このパスワードは一般的すぎて推測されやすいです。',
    'psw_PasswordTooShort' => 'パスワードが短すぎます（最低%min%文字）',
    'psw_PasswordTooLong' => 'パスワードが長すぎます（最大%max%文字）',
    'psw_PasswordMinLength' => 'パスワードは最低8文字である必要があります。',
    'psw_PasswordRequirements' => 'パスワード要件',
    'psw_PasswordSuggestions' => 'パスワード強度改善のための提案',
    
    // Password strength indicators
    'psw_VeryWeak' => '非常に弱い',
    'psw_Weak' => '弱い',
    'psw_Fair' => '普通',
    'psw_Good' => '良い',
    'psw_Strong' => '強い',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'パスワードを空にすることはできません',
    'psw_EmptyPassword' => 'パスワードを空にすることはできません',
    'psw_PasswordInDictionary' => '一般的なパスワード辞書にパスワードが見つかりました',
    'psw_PasswordAcceptable' => 'パスワードは許容範囲内です',
    'psw_PasswordGenerateFailed' => 'パスワードの生成に失敗しました',
    'psw_PasswordsArrayRequired' => 'パスワード配列が必要です',
    'psw_InvalidPasswordsFormat' => '無効なパスワードデータ形式',
    
    // Additional suggestions
    'psw_AddUppercase' => '大文字を追加',
    'psw_AddLowercase' => '小文字を追加',
    'psw_AddNumbers' => '数字を追加',
    'psw_AddSpecialChars' => '特殊文字を追加',
    'psw_IncreaseLength' => 'パスワード長を増やす',
    'psw_AvoidRepeating' => '繰り返し文字を避ける',
    'psw_AvoidSequential' => '連続文字を避ける',
    'psw_AvoidCommonWords' => '一般的な単語を避ける',
    
    // Password validation errors
    'psw_PasswordSimple' => '設定されるパスワードが単純すぎます。',
    'psw_SetPassword' => '新しいパスワードを設定',
    'psw_SetPasswordError' => 'パスワード - %password% は使用できません。簡単なパスワード辞書に含まれています。',
    'psw_SetPasswordInfo' => '指定されたパスワードは使用できません。簡単なパスワード辞書に含まれています。',
    'psw_PasswordNoNumbers' => 'パスワードは数字を含む必要があります',
    'psw_PasswordNoLowSimvol' => 'パスワードは小文字を含む必要があります',
    'psw_PasswordNoUpperSimvol' => 'パスワードは大文字を含む必要があります',
    'psw_PasswordIsDefault' => 'デフォルトパスワードが使用されています',
    'psw_PasswordNoSpecialChars' => '特殊文字を追加してください (!@#$%)',
    'psw_PasswordMixCharTypes' => '文字、数字、記号の組み合わせを使用してください',
    'psw_PasswordAvoidCommon' => '一般的な単語や語句を避けてください',
    'psw_PasswordUsePassphrase' => 'パスフレーズの使用を検討してください',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => '弱い',
    'psw_PasswordStrengthFair' => '普通',
    'psw_PasswordStrengthGood' => '良い',
    'psw_PasswordStrengthStrong' => '強い',
    'psw_PasswordStrengthVeryStrong' => '非常に強い',
    'psw_PasswordSecurityRequiresFair' => 'セキュリティのため、パスワードは最低でも普通の強度が必要です',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'パスワード',
    'psw_WebAdminPasswordRepeat' => 'パスワード入力を繰り返す',
    'psw_Passwords' => 'WEBインターフェースパスワード',
    'psw_ValidateEmptyWebPassword' => '管理者パスワードを空にすることはできません',
    'psw_ValidateWeakWebPassword' => 'WEBパスワードは4文字より長くする必要があります',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Webインターフェースパスワードが正しく入力されていません',
    
    // SSH password specific
    'psw_SSHPassword' => 'SSHパスワード',
    'psw_SSHPasswordRepeat' => 'パスワード入力を繰り返す',
    'psw_SSHDisablePasswordLogins' => 'パスワード認証を無効にする',
    'psw_ValidateEmptySSHPassword' => 'SSHパスワードを空にすることはできません',
    'psw_ValidateWeakSSHPassword' => 'SSHパスワードは4文字より長くする必要があります',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'SSHパスワードが正しく入力されていません。パスワードを再入力してください。',
];