<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Autorización de usuario',
    'rest_schema_auth_message' => 'Mensaje sobre el resultado de la operación',
    'auth_RefreshTokenInvalid' => 'Token de actualización no válido',
    'rest_auth_LoginDesc' => 'Autenticación de usuarios y emisión de tokens JWT. Admite dos métodos: contraseña (inicio de sesión + contraseña) y clave de acceso (sessionToken de WebAuthn). Devuelve un accessToken (JWT, 15 minutos) y establece un refreshToken en la cookie httpOnly (30 días).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Actualizar token de acceso',
    'rest_auth_RefreshDesc' => 'Actualiza el token de acceso JWT utilizando el token de actualización de la cookie. Opcionalmente, rota el token de actualización para mayor seguridad.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Cerrar sesión',
    'rest_auth_LogoutDesc' => 'Elimine el token de actualización de la base de datos y borre la cookie. El token de acceso JWT expirará automáticamente después de 15 minutos.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Inicio de sesión de usuario para autorización',
    'rest_param_auth_password' => 'Contraseña de usuario',
    'rest_param_auth_sessionToken' => 'Token de sesión único de autenticación de clave de acceso (64 caracteres hexadecimales)',
    'rest_param_auth_rememberMe' => 'Recuérdame (extender token de actualización)',
    'rest_param_auth_refreshToken' => 'Actualizar el token de la cookie httpOnly para actualizar el token de acceso',
    'rest_param_auth_clientIp' => 'Dirección IP del cliente para el seguimiento del dispositivo',
    'rest_param_auth_userAgent' => 'Agente de usuario de la aplicación de seguimiento de navegador/dispositivo',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'Token de acceso JWT para autorizar solicitudes (válido por 15 minutos)',
    'rest_schema_auth_tokenType' => 'Tipo de token para el encabezado de autorización (siempre "Portador")',
    'rest_schema_auth_expiresIn' => 'Tiempo hasta que caduque el token de acceso en segundos',
    'rest_schema_auth_login' => 'Inicio de sesión del usuario autorizado',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Autorización exitosa. Se devolvió un token de acceso y se estableció una cookie de token de actualización.',
    'rest_response_200_auth_refresh' => 'El token de acceso se ha actualizado correctamente. Es posible que el token de actualización se haya rotado.',
    'rest_response_200_auth_logout' => 'Salida exitosa. El token de actualización se ha eliminado de la base de datos y la cookie se ha borrado.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en {interval} segundos.',
    'auth_LoginPasswordRequired' => 'Debes especificar login+password o sessionToken',
    'auth_WrongLoginPassword' => 'Nombre de usuario o contraseña incorrectos',
    'auth_TokenSaveFailed' => 'Error al guardar el token en la base de datos',
    'auth_RefreshTokenMissing' => 'Falta el token de actualización en la cookie',
    'auth_RefreshTokenExpired' => 'El token de actualización ha expirado o no se encuentra',
    'auth_InvalidSessionData' => 'Datos de sesión no válidos',
    'auth_TokenUpdateFailed' => 'Error de actualización de token',
    'rest_response_401_invalid_credentials' => 'Credenciales incorrectas',
    'rest_response_401_invalid_token' => 'Token inválido',
    'rest_response_403_token_expired' => 'El token ha expirado',
    'rest_response_429_too_many_requests' => 'Demasiadas solicitudes',
];
