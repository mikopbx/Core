<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'User authorization',
    'rest_auth_LoginDesc' => 'User authentication and JWT token issuance. Supports two methods: password (login+password) and passkey (sessionToken from WebAuthn). Returns accessToken (JWT, 15 min) and sets refreshToken in httpOnly cookie (30 days).',

    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Refresh access token',
    'rest_auth_RefreshDesc' => 'Refresh JWT access token using refresh token from cookie. Optionally rotates refresh token for enhanced security.',

    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Logout',
    'rest_auth_LogoutDesc' => 'Delete refresh token from database and clear cookie. JWT access token will expire naturally after 15 minutes.',

    /**
     * Parameters
     */
    'rest_param_auth_login' => 'User login for authorization',
    'rest_param_auth_password' => 'User password',
    'rest_param_auth_sessionToken' => 'One-time session token from passkey authentication (64 hex characters)',
    'rest_param_auth_rememberMe' => 'Remember me (extend refresh token lifetime)',
    'rest_param_auth_refreshToken' => 'Refresh token from httpOnly cookie to refresh access token',
    'rest_param_auth_clientIp' => 'Client IP address for device tracking',
    'rest_param_auth_userAgent' => 'Browser/application User-Agent for device tracking',

    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'JWT access token for request authorization (expires in 15 minutes)',
    'rest_schema_auth_tokenType' => 'Token type for Authorization header (always "Bearer")',
    'rest_schema_auth_expiresIn' => 'Time until access token expiration in seconds',
    'rest_schema_auth_login' => 'Authorized user login',
    'rest_schema_auth_message' => 'Operation result message',

    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Successful authorization. Access token returned and refresh token cookie set.',
    'rest_response_200_auth_refresh' => 'Access token successfully refreshed. Refresh token may have been rotated.',
    'rest_response_200_auth_logout' => 'Successful logout. Refresh token deleted from database and cookie cleared.',

    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Too many login attempts. Please try again in {interval} seconds.',
    'auth_LoginPasswordRequired' => 'Either login+password or sessionToken must be provided',
    'auth_WrongLoginPassword' => 'Invalid login or password',
    'auth_TokenSaveFailed' => 'Failed to save token to database',
    'auth_RefreshTokenMissing' => 'Refresh token is missing in cookie',
    'auth_RefreshTokenInvalid' => 'Invalid refresh token',
    'auth_RefreshTokenExpired' => 'Refresh token expired or not found',
    'auth_InvalidSessionData' => 'Invalid session data',
    'auth_TokenUpdateFailed' => 'Failed to update token',
    'rest_response_401_invalid_credentials' => 'Invalid credentials',
    'rest_response_401_invalid_token' => 'Invalid token',
    'rest_response_403_token_expired' => 'Token expired',
    'rest_response_429_too_many_requests' => 'Too many requests',
];
