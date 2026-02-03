<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Ủy quyền người dùng',
    'rest_auth_LoginDesc' => 'Xác thực người dùng và cấp phát mã thông báo JWT. Hỗ trợ hai phương thức: mật khẩu (đăng nhập + mật khẩu) và khóa mật khẩu (sessionToken từ WebAuthn). Trả về accessToken (JWT, 15 phút) và thiết lập refreshToken trong cookie httpOnly (30 ngày).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Làm mới mã truy cập',
    'rest_auth_RefreshDesc' => 'Làm mới mã thông báo truy cập JWT bằng cách sử dụng mã thông báo làm mới từ cookie. Tùy chọn xoay vòng mã thông báo làm mới để tăng cường bảo mật.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Đăng xuất',
    'rest_auth_LogoutDesc' => 'Xóa mã thông báo làm mới khỏi cơ sở dữ liệu và xóa cookie. Mã thông báo truy cập JWT sẽ tự động hết hạn sau 15 phút.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Đăng nhập người dùng để xác thực',
    'rest_param_auth_password' => 'Mật khẩu người dùng',
    'rest_param_auth_sessionToken' => 'Mã token phiên dùng một lần từ xác thực passkey (64 ký tự thập lục phân)',
    'rest_param_auth_rememberMe' => 'Ghi nhớ tôi (gia hạn mã thông báo làm mới)',
    'rest_param_auth_refreshToken' => 'Mã thông báo làm mới từ cookie httpOnly để làm mới mã thông báo truy cập.',
    'rest_param_auth_clientIp' => 'Địa chỉ IP của máy khách để theo dõi thiết bị',
    'rest_param_auth_userAgent' => 'user-agent của ứng dụng theo dõi trình duyệt/thiết bị',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'Mã thông báo truy cập JWT dùng để xác thực yêu cầu (có hiệu lực trong 15 phút)',
    'rest_schema_auth_tokenType' => 'Loại mã thông báo cho tiêu đề Ủy quyền (luôn là "Bearer")',
    'rest_schema_auth_expiresIn' => 'Thời gian còn lại cho đến khi mã truy cập hết hạn (giây)',
    'rest_schema_auth_login' => 'Đăng nhập của người dùng được ủy quyền',
    'rest_schema_auth_message' => 'Thông báo về kết quả hoạt động',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Xác thực thành công. Mã truy cập đã được trả về và cookie mã làm mới đã được thiết lập.',
    'rest_response_200_auth_refresh' => 'Mã truy cập đã được cập nhật thành công. Mã làm mới có thể đã được xoay vòng.',
    'rest_response_200_auth_logout' => 'Thoát thành công. Mã thông báo làm mới đã được xóa khỏi cơ sở dữ liệu và cookie đã được xóa.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau {interval} giây.',
    'auth_LoginPasswordRequired' => 'Bạn phải chỉ định tên đăng nhập + mật khẩu hoặc mã phiên (sessionToken).',
    'auth_WrongLoginPassword' => 'Tên đăng nhập hoặc mật khẩu không chính xác',
    'auth_TokenSaveFailed' => 'Lỗi khi lưu mã thông báo vào cơ sở dữ liệu',
    'auth_RefreshTokenMissing' => 'Mã thông báo làm mới bị thiếu trong cookie',
    'auth_RefreshTokenInvalid' => 'Mã thông báo làm mới không hợp lệ',
    'auth_RefreshTokenExpired' => 'Mã thông báo làm mới đã hết hạn hoặc không tìm thấy.',
    'auth_InvalidSessionData' => 'Dữ liệu phiên không hợp lệ',
    'auth_TokenUpdateFailed' => 'Lỗi làm mới mã thông báo',
    'rest_response_401_invalid_credentials' => 'Thông tin đăng nhập không chính xác',
    'rest_response_401_invalid_token' => 'Mã thông báo không hợp lệ',
    'rest_response_403_token_expired' => 'Mã thông báo đã hết hạn',
    'rest_response_429_too_many_requests' => 'Quá nhiều yêu cầu',
];
