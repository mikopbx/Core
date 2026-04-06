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
    'psw_GeneratePassword' => 'สร้างรหัสผ่าน',
    'psw_UseGenerateButton' => 'ใช้ปุ่มสร้างเพื่อสร้างรหัสผ่านที่ปลอดภัย',
    'psw_PasswordGenerated' => 'สร้างรหัสผ่านที่ปลอดภัยสำเร็จแล้ว',
    'psw_DefaultPasswordWarning' => 'ตรวจพบรหัสผ่านเริ่มต้น',
    'psw_ChangeDefaultPassword' => 'คุณกำลังใช้รหัสผ่านเริ่มต้น โปรดเปลี่ยนเพื่อความปลอดภัย',
    'psw_WeakPassword' => 'รหัสผ่านอ่อนแอ',
    'psw_PasswordTooCommon' => 'รหัสผ่านนี้ใช้กันทั่วไปเกินไปและเดาได้ง่าย',
    'psw_PasswordTooShort' => 'รหัสผ่านสั้นเกินไป (อย่างน้อย %min% ตัวอักษร)',
    'psw_PasswordTooLong' => 'รหัสผ่านยาวเกินไป (สูงสุด %max% ตัวอักษร)',
    'psw_PasswordMinLength' => 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
    'psw_PasswordRequirements' => 'ข้อกำหนดรหัสผ่าน',
    'psw_PasswordSuggestions' => 'คำแนะนำในการปรับปรุงความปลอดภัยของรหัสผ่าน',
    
    // Password strength indicators
    'psw_VeryWeak' => 'อ่อนแอมาก',
    'psw_Weak' => 'อ่อนแอ',
    'psw_Fair' => 'พอใช้',
    'psw_Good' => 'ดี',
    'psw_Strong' => 'ปลอดภัย',
    
    // Validation messages
    'psw_ValidateEmptyPassword' => 'รหัสผ่านไม่สามารถเป็นค่าว่างได้',
    'psw_EmptyPassword' => 'รหัสผ่านไม่สามารถเป็นค่าว่างได้',
    'psw_PasswordInDictionary' => 'พบรหัสผ่านในพจนานุกรมรหัสผ่านทั่วไป',
    'psw_PasswordAcceptable' => 'รหัสผ่านเป็นที่ยอมรับได้',
    'psw_PasswordGenerateFailed' => 'ไม่สามารถสร้างรหัสผ่านได้',
    'psw_PasswordsArrayRequired' => 'ต้องการรายการรหัสผ่าน',
    'psw_InvalidPasswordsFormat' => 'รูปแบบข้อมูลรหัสผ่านไม่ถูกต้อง',
    
    // Additional suggestions
    'psw_AddUppercase' => 'เพิ่มตัวอักษรใหญ่',
    'psw_AddLowercase' => 'เพิ่มตัวอักษรเล็ก',
    'psw_AddNumbers' => 'เพิ่มตัวเลข',
    'psw_AddSpecialChars' => 'เพิ่มอักขระพิเศษ',
    'psw_IncreaseLength' => 'เพิ่มความยาวของรหัสผ่าน',
    'psw_AvoidRepeating' => 'หลีกเลี่ยงอักขระที่ซ้ำกัน',
    'psw_AvoidSequential' => 'หลีกเลี่ยงอักขระที่เป็นลำดับ',
    'psw_AvoidCommonWords' => 'หลีกเลี่ยงคำศัพท์ทั่วไป',
    
    // Password validation errors
    'psw_PasswordSimple' => 'รหัสผ่านที่กำลังตั้งค่าง่ายเกินไป',
    'psw_SetPassword' => 'ตั้งค่ารหัสผ่านใหม่',
    'psw_SetPasswordError' => 'รหัสผ่าน - %password% ไม่สามารถใช้ได้ เนื่องจากอยู่ในพจนานุกรมรหัสผ่านง่าย',
    'psw_SetPasswordInfo' => 'รหัสผ่านที่ระบุไม่สามารถใช้ได้ เนื่องจากอยู่ในพจนานุกรมรหัสผ่านง่าย',
    'psw_PasswordNoNumbers' => 'รหัสผ่านต้องมีตัวเลข',
    'psw_PasswordNoLowSimvol' => 'รหัสผ่านต้องมีตัวอักษรเล็ก',
    'psw_PasswordNoUpperSimvol' => 'รหัสผ่านต้องมีตัวอักษรใหญ่',
    'psw_PasswordIsDefault' => 'กำลังใช้รหัสผ่านเริ่มต้น',
    'psw_PasswordNoSpecialChars' => 'เพิ่มอักขระพิเศษ (!@#$%)',
    'psw_PasswordMixCharTypes' => 'ใช้การผสมผสานของตัวอักษร ตัวเลข และสัญลักษณ์',
    'psw_PasswordAvoidCommon' => 'หลีกเลี่ยงคำและวลีที่ใช้กันทั่วไป',
    'psw_PasswordUsePassphrase' => 'พิจารณาใช้วลีรหัsผ่าน',
    
    // Password strength levels
    'psw_PasswordStrengthWeak' => 'อ่อนแอ',
    'psw_PasswordStrengthFair' => 'พอใช้',
    'psw_PasswordStrengthGood' => 'ดี',
    'psw_PasswordStrengthStrong' => 'แข็งแกร่ง',
    'psw_PasswordStrengthVeryStrong' => 'แข็งแกร่งมาก',
    'psw_PasswordSecurityRequiresFair' => 'เพื่อความปลอดภัย รหัสผ่านต้องมีความแข็งแกร่งอย่างน้อยระดับพอใช้',
    
    // Web admin password specific
    'psw_WebAdminPassword' => 'รหัสผ่าน',
    'psw_WebAdminPasswordRepeat' => 'ป้อนรหัสผ่านอีกครั้ง',
    'psw_Passwords' => 'รหัสผ่านอินเทอร์เฟซ WEB',
    'psw_ValidateEmptyWebPassword' => 'รหัสผ่านผู้ดูแลระบบไม่สามารถเป็นค่าว่างได้',
    'psw_ValidateWeakWebPassword' => 'รหัสผ่าน WEB ต้องยาวกว่า 4 ตัวอักษร',
    'psw_ValidateWebPasswordsFieldDifferent' => 'รหัสผ่านอินเทอร์เฟซเว็บป้อนไม่ถูกต้อง',
    
    // SSH password specific
    'psw_SSHPassword' => 'รหัสผ่าน SSH',
    'psw_SSHPasswordRepeat' => 'ป้อนรหัสผ่านอีกครั้ง',
    'psw_SSHDisablePasswordLogins' => 'ปิดใช้งานการยืนยันตัวตนด้วยรหัสผ่าน',
    'psw_ValidateEmptySSHPassword' => 'รหัสผ่าน SSH ไม่สามารถเป็นค่าว่างได้',
    'psw_ValidateWeakSSHPassword' => 'รหัสผ่าน SSH ต้องยาวกว่า 4 ตัวอักษร',
    'psw_ValidateSSHPasswordsFieldDifferent' => 'รหัสผ่าน SSH ป้อนไม่ถูกต้อง โปรดป้อนรหัสผ่านอีกครั้ง',
];