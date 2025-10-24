<?php
return [
    /**
 * Asterisk REST Interface (ARI) users translations
 */
    // Menu and breadcrumbs
    'mm_AsteriskRestUsers' => 'Acesso ao ARI',
    'ari_BreadcrumbAsteriskRestUsers' => 'Usuário ARI',
    'ari_BreadcrumbCreate' => 'Criar',
    'ari_BreadcrumbModify' => 'Editar',
    // Page titles and descriptions
    'ari_Title' => 'Gerenciar Usuários ARI',
    'ari_Description' => '',
    'ari_UserSettingsDescription' => 'Configurações do usuário para acessar a interface REST do Asterisk',
    'ari_NewUser' => 'Novo usuário ARI',
    'ari_EditUser' => 'Editando um usuário ARI',
    // Buttons
    'ari_AddNewUser' => 'Adicionar usuário',
    'ari_CreateFirstUser' => 'Crie seu primeiro usuário',
    'ari_SaveUser' => 'Salvar usuário',
    'ari_DeleteUser' => 'Excluir usuário',
    // Table columns
    'ari_Username' => 'Nome de usuário',
    'ari_Password' => 'Senha',
    'ari_Description' => 'A Asterisk REST Interface (ARI) permite que você gerencie o Asterisk via WebSocket e APIs REST.',
    'ari_Applications' => 'Aplicativos',
    'ari_Status' => 'Status',
    'ari_Enabled' => 'Habilitado',
    'ari_Disabled' => 'Desligado',
    'ari_EnableUser' => 'Habilitar usuário',
    // Form fields and placeholders
    'ari_UsernamePlaceholder' => 'por exemplo, ari_user',
    'ari_PasswordPlaceholder' => 'Digite uma senha ou gere uma nova',
    'ari_DescriptionPlaceholder' => 'Descrição do usuário (opcional)',
    'ari_ApplicationsPlaceholder' => 'Todas as aplicações (a menos que especificado)',
    'ari_EnabledTooltip' => 'Habilitar ou desabilitar o acesso para este usuário',
    // Applications help
    'ari_ApplicationsHelp' => 'Especifique os nomes dos aplicativos do Stasis aos quais o usuário tem acesso. Deixe em branco para acessar todos os aplicativos.',
    // Connection info
    'ari_ConnectionInfo' => 'Informações de conexão',
    'ari_WebSocketURL' => '',
    'ari_RESTURL' => '',
    'ari_SecureWebSocketURL' => 'URL WebSocket segura (TLS)',
    // Messages
    'ari_NoUsersFound' => 'Nenhum usuário ARI encontrado',
    'ari_PasswordGenerated' => 'Uma nova senha foi gerada',
    'ari_SaveSuccess' => 'Usuário ARI salvo com sucesso',
    'ari_SaveError' => 'Erro ao salvar usuário ARI',
    'ari_DeleteSuccess' => 'Usuário ARI excluído com sucesso',
    'ari_DeleteError' => 'Erro ao excluir usuário ARI',
    'ari_ConfirmDelete' => 'Tem certeza de que deseja excluir o usuário "{0}"?',
    'ari_UsernameNotUnique' => 'Este nome de usuário já está em uso',
    'ari_EmptyTableTitle' => 'Os usuários do ARI ainda não foram criados',
    'ari_EmptyTableDescription' => 'Crie seu primeiro usuário para acessar a interface REST do Asterisk',
    'ari_ErrorThisUsernameInNotAvailable' => 'Este nome de usuário já foi usado',
    // Validation messages
    'ari_ValidateUsernameEmpty' => 'O nome de usuário não pode estar vazio',
    'ari_ValidateUsernameFormat' => 'O nome de usuário só pode conter letras, números e o caractere _ (sublinhado)',
    'ari_ValidatePasswordEmpty' => 'A senha não pode estar vazia',
    // Info messages
    'ari_InfoSystemUser' => 'Este é um usuário do sistema e não pode ser excluído',
    'ari_InfoWebSocketConnection' => 'Use essas URLs para se conectar ao ARI via WebSocket ou REST API',
    'ari_InfoApplicationsAccess' => 'O usuário tem acesso apenas aos aplicativos especificados pela Stasis',
    'ari_InfoFullAccess' => 'O usuário tem acesso a todos os aplicativos Stasis',
    // Settings
    'ari_SettingsEnabled' => 'ARI incluído',
    'ari_SettingsAllowedOrigins' => 'Origens CORS permitidas',
    'ari_SettingsAllowedOriginsHelp' => 'Uma lista de domínios separados por vírgulas para CORS. Use * para permitir todas as origens.',
    // Connection info summary
    'ari_ConnectionInfoSummary' => 'Use credenciais de usuário para se conectar ao ARI via WebSocket ou API REST',
    // Tooltips for Applications field
    'ari_ApplicationsTooltip_header' => 'Stasis Aplicações',
    'ari_ApplicationsTooltip_desc' => 'Especifique os nomes dos aplicativos do Stasis aos quais o usuário tem acesso',
    'ari_ApplicationsTooltip_usage_header' => 'Uso',
    'ari_ApplicationsTooltip_usage_desc' => '',
    'ari_ApplicationsTooltip_common_header' => '',
    'ari_ApplicationsTooltip_common_ari_app' => '',
    'ari_ApplicationsTooltip_common_stasis' => '',
    'ari_ApplicationsTooltip_common_external_media' => '',
    'ari_ApplicationsTooltip_common_bridge_app' => '',
    'ari_ApplicationsTooltip_common_channel_spy' => '',
    'ari_ApplicationsTooltip_warning_header' => '',
    'ari_ApplicationsTooltip_warning' => '',
    // Tooltips for Connection Info
    'ari_ConnectionInfoTooltip_header' => '',
    'ari_ConnectionInfoTooltip_desc' => '',
    'ari_ConnectionInfoTooltip_websocket_header' => '',
    'ari_ConnectionInfoTooltip_websocket_url' => '',
    'ari_ConnectionInfoTooltip_websocket_secure' => '',
    'ari_ConnectionInfoTooltip_rest_header' => '',
    'ari_ConnectionInfoTooltip_rest_url' => '',
    'ari_ConnectionInfoTooltip_rest_secure' => '',
    'ari_ConnectionInfoTooltip_auth_header' => '',
    'ari_ConnectionInfoTooltip_auth_desc' => '',
    'ari_ConnectionInfoTooltip_examples_header' => '',
    'ari_ConnectionInfoTooltip_examples' => '',
    'ari_ConnectionInfoTooltip_note' => '',
    'ari_ConnectionInfoTooltip_server_placeholder' => '',
    // Other tooltips
    'ari_SystemUserReadOnly' => '',
    'ari_ErrorLoadingUser' => '',
];
