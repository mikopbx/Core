<?php
return [
    'auth_WrongLoginPassword' => 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    'rest_param_auth_refreshToken' => 'รีเฟรชโทเค็นจากคุกกี้ httpOnly เพื่อรีเฟรชโทเค็นการเข้าถึง',
    'rest_param_auth_rememberMe' => 'จดจำฉันไว้ (ขยายโทเค็นรีเฟรช)',
    'auth_TokenUpdateFailed' => 'ข้อผิดพลาดในการรีเฟรชโทเค็น',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'โทเค็นการเข้าถึง JWT สำหรับการอนุมัติคำขอ (มีอายุ 15 นาที)',
    'auth_TokenSaveFailed' => 'เกิดข้อผิดพลาดในการบันทึกโทเค็นลงในฐานข้อมูล',
    'rest_response_401_invalid_token' => 'โทเค็นไม่ถูกต้อง',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'เข้าสู่ระบบผู้ใช้เพื่อขออนุญาต',
    'auth_RefreshTokenInvalid' => 'โทเค็นรีเฟรชไม่ถูกต้อง',
    'rest_auth_LogoutDesc' => 'ลบ refresh token ออกจากฐานข้อมูลและล้างคุกกี้ access token JWT จะหมดอายุโดยอัตโนมัติหลังจาก 15 นาที',
    'rest_response_200_auth_logout' => 'ออกจากระบบสำเร็จแล้ว โทเค็นรีเฟรชถูกลบออกจากฐานข้อมูลและคุกกี้ถูกล้างออกเรียบร้อยแล้ว',
    'auth_RefreshTokenExpired' => 'โทเค็นรีเฟรชหมดอายุหรือหาไม่พบ',
    'rest_schema_auth_login' => 'การเข้าสู่ระบบของผู้ใช้ที่ได้รับอนุญาต',
    'rest_response_429_too_many_requests' => 'คำขอมากเกินไป',
    'rest_schema_auth_message' => 'ข้อความเกี่ยวกับผลการดำเนินการ',
    'rest_param_auth_clientIp' => 'ที่อยู่ IP ของลูกค้าสำหรับการติดตามอุปกรณ์',
    'rest_response_200_auth_refresh' => 'โทเค็นการเข้าถึงได้รับการอัปเดตเรียบร้อยแล้ว โทเค็นรีเฟรชอาจมีการเปลี่ยนแปลง',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'ออกจากระบบ',
    'rest_auth_LoginDesc' => 'การตรวจสอบสิทธิ์ผู้ใช้และการออกโทเค็น JWT รองรับสองวิธี: รหัสผ่าน (ล็อกอิน+รหัสผ่าน) และ passkey (sessionToken จาก WebAuthn) ส่งคืน accessToken (JWT, 15 วัน) และตั้งค่า refreshToken ในคุกกี้ httpOnly (30 วัน)',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'พยายามเข้าสู่ระบบมากเกินไป โปรดลองอีกครั้งในอีก {interval} วินาที',
    'rest_response_403_token_expired' => 'โทเค็นหมดอายุแล้ว',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'การอนุญาตสำเร็จแล้ว ได้รับโทเค็นการเข้าถึงและตั้งค่าคุกกี้โทเค็นรีเฟรชเรียบร้อยแล้ว',
    'rest_schema_auth_tokenType' => 'ประเภทโทเค็นสำหรับส่วนหัวการอนุญาต (โดยปกติจะเป็น "Bearer")',
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'การอนุญาตผู้ใช้',
    'rest_param_auth_userAgent' => 'ตัวแทนผู้ใช้ของแอปติดตามเบราว์เซอร์/อุปกรณ์',
    'rest_auth_RefreshDesc' => 'รีเฟรชโทเค็นการเข้าถึง JWT โดยใช้โทเค็นรีเฟรชจากคุกกี้ สามารถหมุนเวียนโทเค็นรีเฟรชเพื่อเพิ่มความปลอดภัยได้ (เป็นทางเลือกเพิ่มเติม)',
    'rest_param_auth_sessionToken' => 'โทเค็นเซสชันแบบใช้ครั้งเดียวจากการตรวจสอบสิทธิ์ด้วยรหัสผ่าน (อักขระเลขฐานสิบหก 64 ตัว)',
    'auth_LoginPasswordRequired' => 'คุณต้องระบุชื่อผู้ใช้และรหัสผ่าน หรือ sessionToken',
    'rest_param_auth_password' => 'รหัสผ่านผู้ใช้',
    'rest_response_401_invalid_credentials' => 'ข้อมูลประจำตัวไม่ถูกต้อง',
    'auth_RefreshTokenMissing' => 'โทเค็นรีเฟรชหายไปจากคุกกี้',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'รีเฟรชโทเค็นการเข้าถึง',
    'auth_InvalidSessionData' => 'ข้อมูลเซสชันไม่ถูกต้อง',
    'rest_schema_auth_expiresIn' => 'ระยะเวลาจนกว่าโทเค็นการเข้าถึงจะหมดอายุ (หน่วยเป็นวินาที)',
];
