<?php
/**
 * Asterisk REST Interface (ARI) users translations
 */

return [
    // Menu and breadcrumbs
    'mm_AsteriskRestUsers' => 'ARI Access',
    'ari_BreadcrumbAsteriskRestUsers' => 'ARI Users',
    'ari_BreadcrumbCreate' => 'Create',
    'ari_BreadcrumbModify' => 'Edit',

    // Page titles and descriptions
    'ari_Title' => 'ARI User Management',
    'ari_Description' => 'Asterisk REST Interface (ARI) allows you to control Asterisk via WebSocket and REST API',
    'ari_UserSettingsDescription' => 'User settings for accessing Asterisk REST Interface',
    'ari_NewUser' => 'New ARI User',
    'ari_EditUser' => 'Edit ARI User',

    // Buttons
    'ari_AddNewUser' => 'Add User',
    'ari_CreateFirstUser' => 'Create First User',
    'ari_SaveUser' => 'Save User',
    'ari_DeleteUser' => 'Delete User',

    // Table columns
    'ari_Username' => 'Username',
    'ari_Password' => 'Password',
    'ari_Applications' => 'Applications',
    'ari_Status' => 'Status',
    'ari_Enabled' => 'Enabled',
    'ari_Disabled' => 'Disabled',
    'ari_EnableUser' => 'Enable User',

    // Form fields and placeholders
    'ari_UsernamePlaceholder' => 'e.g., ari_user',
    'ari_PasswordPlaceholder' => 'Enter password or generate a new one',
    'ari_DescriptionPlaceholder' => 'User description (optional)',
    'ari_ApplicationsPlaceholder' => 'All applications (if not specified)',
    'ari_EnabledTooltip' => 'Enable or disable access for this user',

    // Applications help
    'ari_ApplicationsHelp' => 'Specify the Stasis application names this user has access to. Leave empty to allow access to all applications.',

    // Connection info
    'ari_ConnectionInfo' => 'Connection Information',
    'ari_WebSocketURL' => 'WebSocket URL',
    'ari_RESTURL' => 'REST API URL',
    'ari_SecureWebSocketURL' => 'Secure WebSocket URL (TLS)',

    // Messages
    'ari_NoUsersFound' => 'No ARI users found',
    'ari_PasswordGenerated' => 'New password generated',
    'ari_SaveSuccess' => 'ARI user successfully saved',
    'ari_SaveError' => 'Error saving ARI user',
    'ari_DeleteSuccess' => 'ARI user successfully deleted',
    'ari_DeleteError' => 'Error deleting ARI user',
    'ari_ConfirmDelete' => 'Are you sure you want to delete user "{0}"?',
    'ari_UsernameNotUnique' => 'This username is already in use',
    'ari_EmptyTableTitle' => 'No ARI users have been created yet',
    'ari_EmptyTableDescription' => 'Create the first user to access Asterisk REST Interface',
    'ari_ErrorThisUsernameInNotAvailable' => 'This username is already taken',

    // Validation messages
    'ari_ValidateUsernameEmpty' => 'Username cannot be empty',
    'ari_ValidateUsernameFormat' => 'Username can only contain Latin letters, numbers, and underscores',
    'ari_ValidatePasswordEmpty' => 'Password cannot be empty',

    // Info messages
    'ari_InfoSystemUser' => 'This is a system user and cannot be deleted',
    'ari_InfoWebSocketConnection' => 'Use these URLs to connect to ARI via WebSocket or REST API',
    'ari_InfoApplicationsAccess' => 'User has access only to specified Stasis applications',
    'ari_InfoFullAccess' => 'User has access to all Stasis applications',

    // Settings
    'ari_SettingsEnabled' => 'ARI enabled',
    'ari_SettingsAllowedOrigins' => 'Allowed CORS origins',
    'ari_SettingsAllowedOriginsHelp' => 'List of domains for CORS (comma-separated). Use * to allow all origins.',

    // Connection info summary
    'ari_ConnectionInfoSummary' => 'Use the user credentials to connect to ARI via WebSocket or REST API',

    // Tooltips for Applications field
    'ari_ApplicationsTooltip_header' => 'Stasis Applications',
    'ari_ApplicationsTooltip_desc' => 'Specify the Stasis application names this user has access to',
    'ari_ApplicationsTooltip_usage_header' => 'Usage',
    'ari_ApplicationsTooltip_usage_desc' => 'Leave the field empty to allow access to all applications. Specify particular applications to restrict access.',
    'ari_ApplicationsTooltip_common_header' => 'Common Applications',
    'ari_ApplicationsTooltip_common_ari_app' => 'Main application for ARI',
    'ari_ApplicationsTooltip_common_stasis' => 'Base Stasis application',
    'ari_ApplicationsTooltip_common_external_media' => 'Working with external media streams',
    'ari_ApplicationsTooltip_common_bridge_app' => 'Call bridge management',
    'ari_ApplicationsTooltip_common_channel_spy' => 'Channel monitoring',
    'ari_ApplicationsTooltip_warning_header' => 'Warning',
    'ari_ApplicationsTooltip_warning' => 'Restricting application access affects ARI client functionality',

    // Tooltips for Connection Info
    'ari_ConnectionInfoTooltip_header' => 'Connection Parameters',
    'ari_ConnectionInfoTooltip_desc' => 'Use these parameters to configure connection to Asterisk REST Interface',
    'ari_ConnectionInfoTooltip_websocket_header' => 'WebSocket Connection',
    'ari_ConnectionInfoTooltip_websocket_url' => 'Regular WebSocket',
    'ari_ConnectionInfoTooltip_websocket_secure' => 'Secure WebSocket (TLS)',
    'ari_ConnectionInfoTooltip_rest_header' => 'REST API',
    'ari_ConnectionInfoTooltip_rest_url' => 'HTTP endpoint',
    'ari_ConnectionInfoTooltip_rest_secure' => 'HTTPS endpoint',
    'ari_ConnectionInfoTooltip_auth_header' => 'Authentication',
    'ari_ConnectionInfoTooltip_auth_desc' => 'Use the username and password from this form for Basic Authentication',
    'ari_ConnectionInfoTooltip_examples_header' => 'Connection Example',
    'ari_ConnectionInfoTooltip_examples' => '# WebSocket with authentication|ws://username:password@server:8088/ari/events?app=my-app&subscribe=all||# REST API request|curl -u username:password http://server:8088/ari/channels',
    'ari_ConnectionInfoTooltip_note' => 'Replace [application] with your Stasis application name',
    'ari_ConnectionInfoTooltip_server_placeholder' => 'your-server',

    // Other tooltips
    'ari_SystemUserReadOnly' => 'System user is read-only',
    'ari_ErrorLoadingUser' => 'Error loading user data',

    // REST API parameter descriptions (request fields)
    'rest_param_aru_username' => 'Username for ARI access',
    'rest_param_aru_password' => 'Password for ARI authentication',
    'rest_param_aru_applications' => 'List of Stasis applications the user has access to (empty array = all applications)',
    'rest_param_aru_description' => 'ARI user description',
    'rest_param_aru_weak_password' => 'Password strength indicator (0 - unknown, 1 - strong, 2 - weak)',
    'rest_param_aru_object' => 'Asterisk REST Interface (ARI) user object',

    // REST API schema descriptions (response fields)
    'rest_schema_aru_id' => 'Unique ARI user identifier',
    'rest_schema_aru_applications_summary' => 'Brief description of available applications',
    'rest_schema_aru_applications_count' => 'Number of applications the user has access to',
    'rest_schema_aru_object' => 'Asterisk REST Interface (ARI) user object',
    'rest_schema_aru_represent' => 'String representation of ARI user for display in dropdown lists',

    // REST API operation descriptions
    'rest_aru_GetList' => 'Get ARI users list',
    'rest_aru_GetListDesc' => 'Returns a list of all Asterisk REST Interface users with pagination and filtering support',
    'rest_aru_GetRecord' => 'Get ARI user',
    'rest_aru_GetRecordDesc' => 'Returns detailed information about a specific ARI user by their identifier',
    'rest_aru_Create' => 'Create ARI user',
    'rest_aru_CreateDesc' => 'Creates a new user for accessing Asterisk REST Interface with specified parameters',
    'rest_aru_Update' => 'Update ARI user',
    'rest_aru_UpdateDesc' => 'Completely replaces data of an existing ARI user (all fields are required)',
    'rest_aru_Patch' => 'Partially update ARI user',
    'rest_aru_PatchDesc' => 'Updates only specified fields of an existing ARI user',
    'rest_aru_Delete' => 'Delete ARI user',
    'rest_aru_DeleteDesc' => 'Deletes an ARI user from the system by their identifier',
    'rest_aru_GetDefault' => 'Get new ARI user template',
    'rest_aru_GetDefaultDesc' => 'Returns an object with default settings for creating a new ARI user',
];
