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
    'psw_GeneratePassword' => 'Tạo mật khẩu',
    'psw_UseGenerateButton' => 'Sử dụng nút tạo để tạo mật khẩu an toàn.',
    'psw_PasswordGenerated' => 'Mật khẩu an toàn đã được tạo thành công',
    'psw_DefaultPasswordWarning' => 'Đã phát hiện mật khẩu mặc định',
    'psw_ChangeDefaultPassword' => 'Bạn đang sử dụng mật khẩu mặc định. Vui lòng thay đổi nó vì lý do bảo mật.',
    'psw_WeakPassword' => 'Mật khẩu yếu',
    'psw_PasswordTooCommon' => 'Mật khẩu này quá phổ biến và dễ đoán.',
    'psw_PasswordTooShort' => 'Mật khẩu quá ngắn (tối thiểu %min% ký tự)',
    'psw_PasswordTooLong' => 'Mật khẩu quá dài (tối đa %max% ký tự)',
    'psw_PasswordMinLength' => 'Mật khẩu phải chứa ít nhất 8 ký tự.',
    'psw_PasswordRequirements' => 'Yêu cầu mật khẩu',
    'psw_PasswordSuggestions' => 'Khuyến nghị cải thiện bảo mật mật khẩu',
    
    // Password strength indicators
    'psw_VeryWeak' => 'Rất yếu',
    'psw_Weak' => 'Yếu',
    'psw_Fair' => 'Trung bình',
    'psw_Good' => 'Tốt',
    'psw_Strong' => 'Mạnh',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'Mật khẩu không được để trống',
    'psw_EmptyPassword' => 'Mật khẩu không được để trống',
    'psw_PasswordInDictionary' => 'Mật khẩu được tìm thấy trong từ điển mật khẩu phổ biến',
    'psw_PasswordAcceptable' => 'Mật khẩu có thể chấp nhận',
    'psw_PasswordGenerateFailed' => 'Không thể tạo mật khẩu',
    'psw_PasswordsArrayRequired' => 'Cần mảng mật khẩu',
    'psw_InvalidPasswordsFormat' => 'Định dạng dữ liệu mật khẩu không hợp lệ',
    
    // Additional suggestions
    'psw_AddUppercase' => 'Thêm chữ hoa',
    'psw_AddLowercase' => 'Thêm chữ thường',
    'psw_AddNumbers' => 'Thêm số',
    'psw_AddSpecialChars' => 'Thêm ký tự đặc biệt',
    'psw_IncreaseLength' => 'Tăng độ dài mật khẩu',
    'psw_AvoidRepeating' => 'Tránh ký tự lặp lại',
    'psw_AvoidSequential' => 'Tránh ký tự liên tiếp',
    'psw_AvoidCommonWords' => 'Tránh từ phổ biến',
    
    // Password validation errors
    'psw_PasswordSimple' => 'Mật khẩu được thiết lập quá đơn giản.',
    'psw_SetPassword' => 'Đặt mật khẩu mới',
    'psw_SetPasswordError' => 'Mật khẩu - %password% không thể sử dụng, nó có trong từ điển mật khẩu đơn giản.',
    'psw_SetPasswordInfo' => 'Mật khẩu đã chỉ định không thể sử dụng, nó có trong từ điển mật khẩu đơn giản.',
    'psw_PasswordNoNumbers' => 'Mật khẩu phải chứa số',
    'psw_PasswordNoLowSimvol' => 'Mật khẩu phải chứa ký tự thường',
    'psw_PasswordNoUpperSimvol' => 'Mật khẩu phải chứa ký tự hoa',
    'psw_PasswordIsDefault' => 'Đang sử dụng mật khẩu mặc định',
    'psw_PasswordNoSpecialChars' => 'Thêm ký tự đặc biệt (!@#$%)',
    'psw_PasswordMixCharTypes' => 'Sử dụng kết hợp chữ cái, số và ký hiệu',
    'psw_PasswordAvoidCommon' => 'Tránh từ và cụm từ phổ biến',
    'psw_PasswordUsePassphrase' => 'Xem xét sử dụng cụm từ mật khẩu',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'Yếu',
    'psw_PasswordStrengthFair' => 'Chấp nhận được',
    'psw_PasswordStrengthGood' => 'Tốt',
    'psw_PasswordStrengthStrong' => 'Mạnh',
    'psw_PasswordStrengthVeryStrong' => 'Rất mạnh',
    'psw_PasswordSecurityRequiresFair' => 'Để đảm bảo bảo mật, mật khẩu phải có ít nhất độ tin cậy trung bình',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'Mật khẩu',
    'psw_WebAdminPasswordRepeat' => 'Lặp lại nhập mật khẩu',
    'psw_Passwords' => 'Mật khẩu giao diện WEB',
    'psw_ValidateEmptyWebPassword' => 'Mật khẩu bảng quản trị không được để trống',
    'psw_ValidateWeakWebPassword' => 'Mật khẩu WEB phải dài hơn 4 ký tự',
    'psw_ValidateWebPasswordsFieldDifferent' => 'Mật khẩu giao diện web đã được nhập không chính xác',
    
    // SSH password specific
    'psw_SSHPassword' => 'Mật khẩu SSH',
    'psw_SSHPasswordRepeat' => 'Lặp lại nhập mật khẩu',
    'psw_SSHDisablePasswordLogins' => 'Vô hiệu hóa xác thực mật khẩu',
    'psw_ValidateEmptySSHPassword' => 'Mật khẩu SSH không được để trống',
    'psw_ValidateWeakSSHPassword' => 'Mật khẩu SSH phải dài hơn 4 ký tự',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'Mật khẩu SSH đã được nhập không chính xác. Lặp lại nhập mật khẩu.',
];