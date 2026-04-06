<?php
return [
    /**
     * Login endpoint
     */
    'rest_auth_Login' => 'Autorização do usuário',
    'rest_auth_LoginDesc' => 'Autenticação de usuário e emissão de tokens JWT. Suporta dois métodos: senha (login + senha) e chave de acesso (sessionToken do WebAuthn). Retorna um accessToken (JWT, 15 minutos) e define um refreshToken no cookie httpOnly (30 dias).',
    /**
     * Refresh endpoint
     */
    'rest_auth_Refresh' => 'Atualizar token de acesso',
    'rest_auth_RefreshDesc' => 'Atualiza o token de acesso JWT usando o token de atualização do cookie. Opcionalmente, rotaciona o token de atualização para aumentar a segurança.',
    /**
     * Logout endpoint
     */
    'rest_auth_Logout' => 'Sair',
    'rest_auth_LogoutDesc' => 'Exclua o token de atualização do banco de dados e limpe o cookie. O token de acesso JWT expirará automaticamente após 15 minutos.',
    /**
     * Parameters
     */
    'rest_param_auth_login' => 'Login do usuário para autorização',
    'rest_param_auth_password' => 'Senha do usuário',
    'rest_param_auth_sessionToken' => 'Token de sessão único da autenticação por chave de acesso (64 caracteres hexadecimais)',
    'rest_param_auth_rememberMe' => 'Lembrar-me (extender token de atualização)',
    'rest_param_auth_refreshToken' => 'Token de atualização do cookie httpOnly para atualizar o token de acesso.',
    'rest_param_auth_clientIp' => 'Endereço IP do cliente para rastreamento de dispositivos',
    'rest_param_auth_userAgent' => 'Agente do usuário do aplicativo de rastreamento de navegador/dispositivo',
    /**
     * Response schema descriptions
     */
    'rest_schema_auth_accessToken' => 'Token de acesso JWT para autorizar solicitações (válido por 15 minutos)',
    'rest_schema_auth_tokenType' => 'Tipo de token para o cabeçalho de autorização (sempre "Bearer")',
    'rest_schema_auth_expiresIn' => 'Tempo restante até o token de acesso expirar (em segundos)',
    'rest_schema_auth_login' => 'Login do usuário autorizado',
    'rest_schema_auth_message' => 'Mensagem sobre o resultado da operação',
    /**
     * Responses
     */
    'rest_response_200_auth_login' => 'Autorização bem-sucedida. Um token de acesso foi retornado e um cookie de atualização foi definido.',
    'rest_response_200_auth_refresh' => 'O token de acesso foi atualizado com sucesso. O token de atualização pode ter sido rotacionado.',
    'rest_response_200_auth_logout' => 'Saída bem-sucedida. O token de atualização foi removido do banco de dados e o cookie foi apagado.',
    /**
     * Error messages
     */
    'auth_TooManyLoginAttempts' => 'Muitas tentativas de login. Tente novamente em {interval} segundos.',
    'auth_LoginPasswordRequired' => 'Você deve especificar login + senha ou token de sessão.',
    'auth_WrongLoginPassword' => 'Login ou senha incorretos',
    'auth_TokenSaveFailed' => 'Erro ao salvar o token no banco de dados',
    'auth_RefreshTokenMissing' => 'Token de atualização ausente no cookie',
    'auth_RefreshTokenInvalid' => 'Token de atualização inválido',
    'auth_RefreshTokenExpired' => 'O token de atualização expirou ou não foi encontrado.',
    'auth_InvalidSessionData' => 'Dados de sessão inválidos',
    'auth_TokenUpdateFailed' => 'Erro na atualização do token',
    'rest_response_401_invalid_credentials' => 'Credenciais incorretas',
    'rest_response_401_invalid_token' => 'Token inválido',
    'rest_response_403_token_expired' => 'O token expirou.',
    'rest_response_429_too_many_requests' => 'Muitos pedidos',
];
