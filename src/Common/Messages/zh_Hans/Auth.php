<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => '用户授权',
    'rest_param_auth_password' => '用户密码',
    'rest_response_401_invalid_token' => '无效令牌',
    'rest_auth_LoginDesc' => '用户身份验证和 JWT 令牌颁发。支持两种方法：密码（登录名+密码）和密钥（来自 WebAuthn 的 sessionToken）。返回一个 accessToken（JWT，有效期 15 分钟），并在 httpOnly cookie 中设置一个 refreshToken（有效期 30 天）。',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => '刷新访问令牌',
    'rest_auth_RefreshDesc' => '使用 cookie 中的刷新令牌刷新 JWT 访问令牌。可以选择性地轮换刷新令牌以提高安全性。',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => '注销',
    'rest_auth_LogoutDesc' => '从数据库中删除刷新令牌并清除 cookie。JWT 访问令牌将在 15 分钟后自然过期。',
    /**
     * Parameters
     */
    'rest_param_auth_login' => '用户登录进行授权',
    'rest_param_auth_sessionToken' => '通过密码认证获取的一次性会话令牌（64 个十六进制字符）',
    'rest_param_auth_rememberMe' => '记住我（延长刷新令牌）',
    'rest_param_auth_refreshToken' => '使用 httpOnly cookie 中的刷新令牌来刷新访问令牌',
    'rest_param_auth_clientIp' => '用于设备跟踪的客户端 IP 地址',
    'rest_param_auth_userAgent' => '浏览器/设备跟踪应用程序用户代理',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => '用于授权请求的 JWT 访问令牌（有效期为 15 分钟）',
    'rest_schema_auth_tokenType' => 'Authorization 标头的令牌类型（始终为“Bearer”）',
    'rest_schema_auth_expiresIn' => '访问令牌剩余时间（秒）',
    'rest_schema_auth_login' => '授权用户的登录',
    'rest_schema_auth_message' => '关于操作结果的消息',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => '授权成功。已返回访问令牌并设置刷新令牌 cookie。',
    'rest_response_200_auth_refresh' => '访问令牌已成功更新。刷新令牌可能已轮换。',
    'rest_response_200_auth_logout' => '退出成功。刷新令牌已从数据库中删除，cookie 也已清除。',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => '登录尝试次数过多。请在 {interval} 秒后重试。',
    'auth_LoginPasswordRequired' => '您必须指定登录名+密码或会话令牌。',
    'auth_WrongLoginPassword' => '登录名或密码错误',
    'auth_TokenSaveFailed' => '保存令牌到数据库时出错',
    'auth_RefreshTokenMissing' => 'Cookie 中缺少刷新令牌',
    'auth_RefreshTokenInvalid' => '无效的刷新令牌',
    'auth_RefreshTokenExpired' => '刷新令牌已过期或未找到',
    'auth_InvalidSessionData' => '无效的会话数据',
    'auth_TokenUpdateFailed' => '令牌刷新错误',
    'rest_response_401_invalid_credentials' => '凭证错误',
    'rest_response_403_token_expired' => '令牌已过期。',
    'rest_response_429_too_many_requests' => '请求过多',
];
