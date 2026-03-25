<?php
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

return [
    // Authentication
    'ms_AuthenticationType' => 'Authentication Type',
    'ms_AuthTypePassword' => 'Username and Password',
    'ms_AuthTypeOAuth2' => 'OAuth2 (recommended)',

    // OAuth2
    'ms_OAuth2Provider' => 'OAuth2 Provider',
    'ms_SelectOAuth2Provider' => 'Select Provider',
    'ms_OAuth2ClientId' => 'Application ID (Client ID)',
    'ms_OAuth2ClientSecret' => 'Secret Key (Client Secret)',
    'ms_OAuth2ClientIdPlaceholder' => 'Enter Client ID from provider',
    'ms_OAuth2ClientSecretPlaceholder' => 'Enter Client Secret from provider',
    'ms_ConnectWithOAuth2' => 'Connect via OAuth2',
    'ms_DisconnectOAuth2' => 'Disconnect OAuth2',
    'ms_OAuth2AuthorizationFailed' => 'OAuth2 authorization failed',
    'ms_OAuth2InvalidCallback' => 'Invalid OAuth2 callback parameters',
    'ms_OAuth2AuthorizationSuccess' => 'OAuth2 authorization successful',
    'ms_OAuth2CallbackFailed' => 'OAuth2 callback processing failed',
    'ms_OAuth2ConnectedTo' => 'Connected to {provider}',
    'ms_OAuth2TokenValid' => '(token is valid)',
    'ms_OAuth2TokenExpired' => '(token expired - will be refreshed automatically)',
    'ms_OAuth2Authorized' => 'Authorized',
    'ms_OAuth2NotConfigured' => 'OAuth2 not configured. Set up Client ID and Client Secret, then click "Connect via OAuth2"',
    'ms_SavingBeforeOAuth2' => 'Saving settings before OAuth2 authorization...',
    'ms_FailedToSaveBeforeOAuth2' => 'Failed to save settings before OAuth2 authorization',
    'ms_SaveChangesBeforeTesting' => 'Save changes before testing',
    'ms_OAuth2MissingConfiguration' => 'Fill in all OAuth2 configuration fields',

    // OAuth2 Callback Page
    'ms_ProcessingAuthorization' => 'Processing authorization...',
    'ms_AuthorizationSuccessful' => 'Authorization successful!',
    'ms_AuthorizationFailed' => 'Authorization failed',
    'ms_ProcessingAuthCode' => 'Processing authorization code...',
    'ms_OAuth2MissingParameters' => 'Required authorization parameters missing',
    'ms_OAuth2ProcessingFailed' => 'OAuth2 authorization processing failed',

    // OAuth2 Error Translations
    'ms_OAuth2AccessDenied' => 'Access denied by user',
    'ms_OAuth2InvalidRequest' => 'Invalid authorization request',
    'ms_OAuth2InvalidClient' => 'Invalid application credentials',
    'ms_OAuth2InvalidGrant' => 'Invalid authorization code',
    'ms_OAuth2UnauthorizedClient' => 'Application not authorized',
    'ms_OAuth2UnsupportedGrantType' => 'Unsupported authorization type',
    'ms_OAuth2InvalidScope' => 'Invalid access permissions',
    'ms_OAuth2ServerError' => 'Authorization server error',
    'ms_OAuth2TemporarilyUnavailable' => 'Service temporarily unavailable',

    // Encryption types
    'ms_SMTPEncryption' => 'Encryption Type',
    'ms_EncryptionNone' => 'No Encryption (port 25)',
    'ms_EncryptionSTARTTLS' => 'STARTTLS (port 587)',
    'ms_EncryptionSSLTLS' => 'SSL/TLS (port 465)',

    // General Settings
    'ms_GeneralSettings' => 'General Settings',
    'ms_NotificationInfo' => 'Notification Setup Information',
    'ms_NotificationInfoText' => 'The system can send notifications about missed calls and voice messages. An SMTP server must be configured for this feature to work.',
    'ms_SMTPConfigRequired' => 'SMTP server configuration required to send notifications',

    // SMTP Settings
    'ms_SMTPSettings' => 'SMTP Settings',
    'ms_SMTPHost' => 'SMTP Host',
    'ms_SMTPPort' => 'SMTP Port',
    'ms_SMTPUsername' => 'SMTP Username',
    'ms_SMTPPassword' => 'SMTP Password',
    'ms_SMTPUseTLS' => 'Use TLS',
    'ms_SMTPCertCheck' => 'Verify Server Certificate',

    // Sender Settings
    'ms_SMTPSenderAddress' => 'Sender Address',
    'ms_SMTPFromUsername' => 'Sender Name',

    // Notifications
    'ms_MailEnableNotifications' => 'Enable Notifications',
    'ms_SendMissedCallNotifications' => 'Send missed call notifications',
    'ms_SendVoicemailNotifications' => 'Send voicemail notifications',
    'ms_SendLoginNotifications' => 'Send login notifications',
    'ms_SendSystemNotifications' => 'Send system notifications',
    'ms_MailSysadminEmail' => 'System Administrator Email',
    'ms_SystemEmailForMissed' => 'Common Email for Missed Call Notifications',
    'ms_VoicemailCommonEmail' => 'Common Email for Voicemail Messages',

    // Testing
    'ms_TestMailSettings' => 'Testing Mail Settings',
    'ms_TestConnection' => 'Test Connection',
    'ms_SendTestEmail' => 'Send Test Email',
    'ms_TestEmailSubject' => 'Mail Sending Test',
    'ms_TestEmailBody' => 'If you received this email, your mail settings are configured correctly.',
    'ms_TestEmailSentSuccessfully' => 'Email sent successfully',
    'ms_TestEmailSentTo' => 'Email sent to %EMAIL%',
    'ms_SentTestEmailAfterSaveTo' => 'Send test email to this address',
    'ms_SMTPConnectionTestSuccessful' => 'SMTP server connection successful',
    'ms_SuccessfullyConnectedToSMTPServer' => 'Successfully connected to SMTP server',
    'ms_FailedToConnectToSMTPServer' => 'Failed to connect to SMTP server',
    'ms_CouldNotEstablishConnection' => 'Could not establish connection to SMTP server. Check your settings.',
    'ms_ConnectionTestFailed' => 'Connection test failed: %MESSAGE%',
    'ms_FailedToSendTestEmail' => 'Failed to send test email',
    'ms_TestEmailFailedWithError' => 'Test email failed with error: %ERROR%',

    // Validation Messages
    'ms_ValidateSMTPHostEmpty' => 'Specify SMTP server',
    'ms_ValidateSMTPHostInvalid' => 'SMTP server can only contain letters, numbers, dots and hyphens',
    'ms_ValidateSMTPPortEmpty' => 'Specify SMTP server port',
    'ms_ValidateSMTPPortInvalid' => 'Invalid port value',
    'ms_ValidateSMTPUsernameEmpty' => 'Specify username',
    'ms_ValidateSMTPUsernameEmail' => 'Enter a valid email address',
    'ms_ValidateSMTPPasswordEmpty' => 'Specify password',
    'ms_ValidateSenderAddressEmpty' => 'Sender address field is required',
    'ms_ValidateSenderAddressInvalid' => 'Enter a valid sender email address',
    'ms_ValidateSystemEmailInvalid' => 'Enter a valid email for system notifications',
    'ms_ValidateMissedEmailInvalid' => 'Enter a valid email for missed call notifications',
    'ms_ValidateVoicemailEmailInvalid' => 'Enter a valid email for voicemail notifications',
    'ms_ValidateOAuth2ProviderEmpty' => 'Select OAuth2 provider',
    'ms_ValidateOAuth2ClientIdEmpty' => 'Enter Client ID',
    'ms_ValidateOAuth2ClientSecretEmpty' => 'Enter Client Secret',

    // Success Messages
    'ms_SuccessfulSaved' => 'Settings saved',
    'ms_SuccessfulDeleted' => 'Data deleted',

    // Tooltip translations for MailEnableNotifications
    'ms_MailEnableNotificationsTooltip_header' => 'Email Notification Management',
    'ms_MailEnableNotificationsTooltip_desc' => 'Master switch for all email notifications in the system. Enables or disables sending email messages for various events.',
    'ms_MailEnableNotificationsTooltip_when_enabled' => 'When enabled, the system sends:',
    'ms_MailEnableNotificationsTooltip_missed_calls' => 'Missed call notifications',
    'ms_MailEnableNotificationsTooltip_voicemail' => 'Voicemail messages by email',
    'ms_MailEnableNotificationsTooltip_system_events' => 'Important system events and warnings',
    'ms_MailEnableNotificationsTooltip_module_notifications' => 'Notifications from installed modules',
    'ms_MailEnableNotificationsTooltip_requirements' => 'Requirements for operation:',
    'ms_MailEnableNotificationsTooltip_smtp_configured' => 'Configured SMTP server connection',
    'ms_MailEnableNotificationsTooltip_sender_address' => 'Valid sender address specified',
    'ms_MailEnableNotificationsTooltip_recipient_emails' => 'Recipient addresses filled for required notification types',
    'ms_MailEnableNotificationsTooltip_when_disabled' => 'When disabled:',
    'ms_MailEnableNotificationsTooltip_when_disabled_desc' => 'The system will not send any email notifications, even if SMTP is configured',
    'ms_MailEnableNotificationsTooltip_warning' => 'Disabling notifications may result in missing important system events and issues',
    'ms_MailEnableNotificationsTooltip_note' => 'Each notification type can be additionally configured individually through corresponding sections',

    // Tooltip translations for SystemNotificationsEmail
    'ms_SystemNotificationsEmailTooltip_header' => 'System Notifications Email',
    'ms_SystemNotificationsEmailTooltip_desc' => 'System administrator\'s email address for receiving important system messages and warnings.',
    'ms_SystemNotificationsEmailTooltip_usage' => 'This address receives:',
    'ms_SystemNotificationsEmailTooltip_critical_errors' => 'Critical system errors',
    'ms_SystemNotificationsEmailTooltip_disk_space' => 'Disk space warnings',
    'ms_SystemNotificationsEmailTooltip_license' => 'License expiration notifications',
    'ms_SystemNotificationsEmailTooltip_updates' => 'Available system updates information',
    'ms_SystemNotificationsEmailTooltip_security' => 'Security and intrusion attempt notifications',
    'ms_SystemNotificationsEmailTooltip_ssl_cert' => 'SSL certificate expiration warnings',
    'ms_SystemNotificationsEmailTooltip_backup_status' => 'Backup results',
    'ms_SystemNotificationsEmailTooltip_examples' => 'Examples:',
    'ms_SystemNotificationsEmailTooltip_recommendations' => 'Recommendations:',
    'ms_SystemNotificationsEmailTooltip_use_monitored' => 'Use a regularly monitored mailbox',
    'ms_SystemNotificationsEmailTooltip_separate_account' => 'Consider using a separate account for system notifications',
    'ms_SystemNotificationsEmailTooltip_distribution_list' => 'Can specify a distribution list to notify multiple administrators',
    'ms_SystemNotificationsEmailTooltip_warning' => 'Without specifying this address, you will not receive critically important system messages',
    'ms_SystemNotificationsEmailTooltip_note' => 'Also used as the default address for testing mail settings and as contact email in SSL certificates',

    // Tooltip translations for MailSMTPAuthType
    'ms_MailSMTPAuthTypeTooltip_header' => 'Authentication Type Selection',
    'ms_MailSMTPAuthTypeTooltip_desc' => 'Determines the authorization method when connecting to the SMTP server for sending mail.',

    // Password authentication section
    'ms_MailSMTPAuthTypeTooltip_password_header' => 'Username and Password (classic authentication)',
    'ms_MailSMTPAuthTypeTooltip_password_desc_header' => 'Description:',
    'ms_MailSMTPAuthTypeTooltip_password_desc' => 'Traditional authorization method using username and password. Suitable for most SMTP servers.',
    'ms_MailSMTPAuthTypeTooltip_password_pros' => 'Advantages:',
    'ms_MailSMTPAuthTypeTooltip_password_pro_simple' => 'Simple setup - only username and password required',
    'ms_MailSMTPAuthTypeTooltip_password_pro_universal' => 'Universal support by all mail servers',
    'ms_MailSMTPAuthTypeTooltip_password_pro_noapi' => 'No application registration with provider required',
    'ms_MailSMTPAuthTypeTooltip_password_cons' => 'Disadvantages:',
    'ms_MailSMTPAuthTypeTooltip_password_con_security' => 'Less secure - password is stored in the system',
    'ms_MailSMTPAuthTypeTooltip_password_con_apppassword' => 'Gmail, Yandex, Mail.ru require application password instead of main password',
    'ms_MailSMTPAuthTypeTooltip_password_con_2fa' => 'When two-factor authentication is enabled, separate application password must be created',

    // OAuth2 authentication section
    'ms_MailSMTPAuthTypeTooltip_oauth2_header' => 'OAuth2 (modern authentication)',
    'ms_MailSMTPAuthTypeTooltip_oauth2_desc_header' => 'Description:',
    'ms_MailSMTPAuthTypeTooltip_oauth2_desc' => 'Secure authorization method via access tokens. You authorize on the provider\'s page, and the system receives a temporary token to work.',
    'ms_MailSMTPAuthTypeTooltip_oauth2_pros' => 'Advantages:',
    'ms_MailSMTPAuthTypeTooltip_oauth2_pro_secure' => 'High security level - password not stored in the system',
    'ms_MailSMTPAuthTypeTooltip_oauth2_pro_nopassword' => 'No need to create application passwords',
    'ms_MailSMTPAuthTypeTooltip_oauth2_pro_2fa' => 'Works with two-factor authentication without additional setup',
    'ms_MailSMTPAuthTypeTooltip_oauth2_pro_revoke' => 'Access can be revoked at any time through account settings',
    'ms_MailSMTPAuthTypeTooltip_oauth2_cons' => 'Disadvantages:',
    'ms_MailSMTPAuthTypeTooltip_oauth2_con_setup' => 'More complex initial setup',
    'ms_MailSMTPAuthTypeTooltip_oauth2_con_providers' => 'Only supported by major providers (Google, Microsoft, Yandex)',
    'ms_MailSMTPAuthTypeTooltip_oauth2_con_renew' => 'Tokens require periodic renewal',

    // Recommendation
    'ms_MailSMTPAuthTypeTooltip_recommendation' => 'Recommendation:',
    'ms_MailSMTPAuthTypeTooltip_recommendation_desc' => 'Use OAuth2 for Gmail, Outlook and Yandex. For corporate servers and other providers, use username and password.',
    'ms_MailSMTPAuthTypeTooltip_warning' => 'Changing authentication type will require reconfiguring the mail server connection',

    // Tooltip translations for MailOAuth2ClientId
    'ms_MailOAuth2ClientIdTooltip_header' => 'OAuth2 Application Identifier',
    'ms_MailOAuth2ClientIdTooltip_desc' => 'Client ID and Client Secret are your application\'s credentials for accessing the mail service via OAuth2.',
    'ms_MailOAuth2ClientIdTooltip_whatisit' => 'What is this?',
    'ms_MailOAuth2ClientIdTooltip_whatisit_desc' => 'Unique identifier of your application that you receive when registering an application with the mail provider.',
    'ms_MailOAuth2ClientIdTooltip_where_header' => 'Where to get Client ID and Client Secret:',

    // Google
    'ms_MailOAuth2ClientIdTooltip_google' => 'For Google (Gmail):',
    'ms_MailOAuth2ClientIdTooltip_google_step1' => '1. Go to Google Cloud Console (console.cloud.google.com)',
    'ms_MailOAuth2ClientIdTooltip_google_step2' => '2. Create a new project or select an existing one',
    'ms_MailOAuth2ClientIdTooltip_google_step3' => '3. Enable Gmail API and create OAuth 2.0 credentials',
    'ms_MailOAuth2ClientIdTooltip_google_step4' => '4. Download or copy Client ID and Client Secret',

    // Microsoft
    'ms_MailOAuth2ClientIdTooltip_microsoft' => 'For Microsoft (Outlook, Office 365):',
    'ms_MailOAuth2ClientIdTooltip_microsoft_step1' => '1. Go to Azure Portal (portal.azure.com)',
    'ms_MailOAuth2ClientIdTooltip_microsoft_step2' => '2. Register a new application in Azure Active Directory',
    'ms_MailOAuth2ClientIdTooltip_microsoft_step3' => '3. Add permissions for Microsoft Graph (Mail.Send)',
    'ms_MailOAuth2ClientIdTooltip_microsoft_step4' => '4. Create application secret and copy Application ID and Secret',

    // Yandex
    'ms_MailOAuth2ClientIdTooltip_yandex' => 'For Yandex:',
    'ms_MailOAuth2ClientIdTooltip_yandex_step1' => '1. Go to oauth.yandex.ru',
    'ms_MailOAuth2ClientIdTooltip_yandex_step2' => '2. Create a new application with mail access',
    'ms_MailOAuth2ClientIdTooltip_yandex_step3' => '3. Copy the application ID and secret key',

    // Examples
    'ms_MailOAuth2ClientIdTooltip_example' => 'Client ID Examples:',
    'ms_MailOAuth2ClientIdTooltip_warning' => 'Keep Client Secret secure! Do not share it with third parties or publish in public sources.',
    'ms_MailOAuth2ClientIdTooltip_note' => 'After creating the application, add your PBX URL to the list of allowed redirect URLs.',

    // Tooltip translations for SystemEmailForMissed
    'ms_SystemEmailForMissedTooltip_header' => 'Missed Call Notifications Email',
    'ms_SystemEmailForMissedTooltip_desc' => 'Common email address for sending notifications about missed external calls.',
    'ms_SystemEmailForMissedTooltip_how_it_works' => 'How it works:',
    'ms_SystemEmailForMissedTooltip_internal_calls' => 'Internal calls: notifications sent to employee\'s personal email from their profile',
    'ms_SystemEmailForMissedTooltip_external_calls' => 'External calls: if employee has no email specified, this common address is used',
    'ms_SystemEmailForMissedTooltip_no_personal' => 'Without personal email: all external call notifications go to this address',
    'ms_SystemEmailForMissedTooltip_usage_examples' => 'Usage examples:',
    'ms_SystemEmailForMissedTooltip_example_reception' => 'Sales department or reception email for monitoring missed customer calls',
    'ms_SystemEmailForMissedTooltip_example_manager' => 'Manager email for tracking unanswered inquiries',
    'ms_SystemEmailForMissedTooltip_example_crm' => 'CRM system integration for automatic missed call registration',
    'ms_SystemEmailForMissedTooltip_recommendations' => 'Recommendations:',
    'ms_SystemEmailForMissedTooltip_use_group' => 'Use a group mailbox for collective processing',
    'ms_SystemEmailForMissedTooltip_configure_personal' => 'Configure employees\' personal emails for personalized notifications',
    'ms_SystemEmailForMissedTooltip_monitor_regularly' => 'Ensure regular monitoring of this mailbox',
    'ms_SystemEmailForMissedTooltip_note' => 'If left empty, missed external call notifications will not be sent to employees without personal email',

    // Tooltip translations for VoicemailNotificationsEmail
    'ms_VoicemailNotificationsEmailTooltip_header' => 'Voicemail Email',
    'ms_VoicemailNotificationsEmailTooltip_desc' => 'Common email address for centralized delivery of all voicemail messages.',
    'ms_VoicemailNotificationsEmailTooltip_how_it_works' => 'How it works:',
    'ms_VoicemailNotificationsEmailTooltip_priority_order' => 'Voicemail delivery priority:',
    'ms_VoicemailNotificationsEmailTooltip_personal_first' => '1. Employee\'s personal email (if specified in profile)',
    'ms_VoicemailNotificationsEmailTooltip_common_second' => '2. This common address (if personal not specified)',
    'ms_VoicemailNotificationsEmailTooltip_no_send' => '3. Not sent (if both fields empty)',
    'ms_VoicemailNotificationsEmailTooltip_usage_examples' => 'Usage scenarios:',
    'ms_VoicemailNotificationsEmailTooltip_example_secretary' => 'Secretary\'s email for centralized processing of all voicemail messages',
    'ms_VoicemailNotificationsEmailTooltip_example_archive' => 'Corporate archive for storing copies of all voicemail messages',
    'ms_VoicemailNotificationsEmailTooltip_example_transcription' => 'Transcription service for automatic speech-to-text conversion',
    'ms_VoicemailNotificationsEmailTooltip_features' => 'Features:',
    'ms_VoicemailNotificationsEmailTooltip_audio_attachment' => 'Voicemail sent as audio attachment (WAV format)',
    'ms_VoicemailNotificationsEmailTooltip_caller_info' => 'Email includes caller information and call time',
    'ms_VoicemailNotificationsEmailTooltip_duration' => 'Message duration displayed in email text',
    'ms_VoicemailNotificationsEmailTooltip_note' => 'Recommended to configure employees\' personal emails for personalized voicemail delivery',

    // MailSMTPUseTLS Tooltip
    'ms_MailSMTPUseTLSTooltip_header' => 'TLS Encryption Usage',
    'ms_MailSMTPUseTLSTooltip_desc' => 'Secure connection configuration with mail server',
    'ms_MailSMTPUseTLSTooltip_whatisit' => 'What is this?',
    'ms_MailSMTPUseTLSTooltip_whatisit_desc' => 'TLS (Transport Layer Security) is an encryption protocol that protects email transmission from interception and tampering. It is the modern standard for securing mail connections.',

    'ms_MailSMTPUseTLSTooltip_when_enabled' => 'When enabled (recommended):',
    'ms_MailSMTPUseTLSTooltip_starttls_used' => 'STARTTLS protocol is used to upgrade connection to secure',
    'ms_MailSMTPUseTLSTooltip_port_587' => 'Usually uses port 587 (standard for secure sending)',
    'ms_MailSMTPUseTLSTooltip_encryption_upgrade' => 'Connection starts open and upgrades to encrypted',
    'ms_MailSMTPUseTLSTooltip_modern_standard' => 'Supported by all modern mail providers',

    'ms_MailSMTPUseTLSTooltip_when_disabled' => 'When disabled:',
    'ms_MailSMTPUseTLSTooltip_no_encryption' => 'Data transmitted in plain text without encryption',
    'ms_MailSMTPUseTLSTooltip_port_25' => 'Uses port 25 (obsolete, often blocked by providers)',
    'ms_MailSMTPUseTLSTooltip_auto_tls_disabled' => 'Automatic TLS upgrade disabled (SMTPAutoTLS = false)',
    'ms_MailSMTPUseTLSTooltip_legacy_servers' => 'May be required for old mail servers',

    'ms_MailSMTPUseTLSTooltip_port_recommendations' => 'Port recommendations:',
    'ms_MailSMTPUseTLSTooltip_port_25_desc' => 'Port 25: obsolete, no encryption, often blocked',
    'ms_MailSMTPUseTLSTooltip_port_587_desc' => 'Port 587: standard for STARTTLS, recommended',
    'ms_MailSMTPUseTLSTooltip_port_465_desc' => 'Port 465: SSL/TLS from the start (not STARTTLS)',

    'ms_MailSMTPUseTLSTooltip_provider_settings' => 'Popular provider settings:',
    'ms_MailSMTPUseTLSTooltip_gmail' => 'Gmail: enable TLS, port 587',
    'ms_MailSMTPUseTLSTooltip_outlook' => 'Outlook/Office365: enable TLS, port 587',
    'ms_MailSMTPUseTLSTooltip_yandex' => 'Yandex: enable TLS, port 587',
    'ms_MailSMTPUseTLSTooltip_mailru' => 'Mail.ru: enable TLS, port 465 or 587',

    'ms_MailSMTPUseTLSTooltip_warning' => 'Disabling TLS makes your email correspondence vulnerable to interception! Use unencrypted connection only in isolated networks.',
    'ms_MailSMTPUseTLSTooltip_note' => 'The "Verify SSL certificate" parameter works independently of TLS and allows disabling certificate verification for servers with self-signed or untrusted certificates.',

    // MailSMTPCertCheck tooltip
    'ms_MailSMTPCertCheckTooltip_header' => 'SSL Certificate Verification',
    'ms_MailSMTPCertCheckTooltip_desc' => 'Controls verification of mail server SSL certificate authenticity when using secure connection',
    'ms_MailSMTPCertCheckTooltip_when_enabled' => 'When enabled:',
    'ms_MailSMTPCertCheckTooltip_verify_certificate' => 'SSL certificate validity is verified',
    'ms_MailSMTPCertCheckTooltip_check_hostname' => 'Hostname match to certificate is verified',
    'ms_MailSMTPCertCheckTooltip_reject_selfsigned' => 'Self-signed certificates are rejected',
    'ms_MailSMTPCertCheckTooltip_protect_mitm' => 'Protection against man-in-the-middle attacks',
    'ms_MailSMTPCertCheckTooltip_when_disabled' => 'When disabled:',
    'ms_MailSMTPCertCheckTooltip_accept_any_cert' => 'Any certificate is accepted',
    'ms_MailSMTPCertCheckTooltip_allow_selfsigned' => 'Self-signed certificates are allowed',
    'ms_MailSMTPCertCheckTooltip_skip_hostname' => 'Hostname is not verified',
    'ms_MailSMTPCertCheckTooltip_less_secure' => 'Less secure connection',
    'ms_MailSMTPCertCheckTooltip_when_use' => 'When to enable:',
    'ms_MailSMTPCertCheckTooltip_public_servers' => 'Public mail servers (Gmail, Yandex, Mail.ru)',
    'ms_MailSMTPCertCheckTooltip_production_env' => 'Production environment',
    'ms_MailSMTPCertCheckTooltip_compliance' => 'Organization security requirements',
    'ms_MailSMTPCertCheckTooltip_when_disable' => 'When to disable:',
    'ms_MailSMTPCertCheckTooltip_internal_servers' => 'Internal mail servers',
    'ms_MailSMTPCertCheckTooltip_test_env' => 'Test environment',
    'ms_MailSMTPCertCheckTooltip_selfsigned_cert' => 'Servers with self-signed certificates',
    'ms_MailSMTPCertCheckTooltip_legacy_servers' => 'Legacy mail servers',
    'ms_MailSMTPCertCheckTooltip_warning' => 'Disabling certificate verification reduces connection security. Use only if you trust the mail server.',
    'ms_MailSMTPCertCheckTooltip_note' => 'This option is only available when using encryption (STARTTLS or SSL/TLS) and automatically hidden when selecting unencrypted connection.',

    // SMTP Connection Diagnostics
    // Error types
    'ms_DiagnosticErrorType_oauth2_auth_failed' => 'OAuth2 Authentication Error',
    'ms_DiagnosticErrorType_connection_failed' => 'Connection Error',
    'ms_DiagnosticErrorType_encryption_failed' => 'Encryption Error',
    'ms_DiagnosticErrorType_password_auth_failed' => 'Authentication Error',
    'ms_DiagnosticErrorType_protocol_mismatch' => 'Protocol Mismatch',
    'ms_DiagnosticErrorType_unknown' => 'Unknown Error',

    // Probable causes
    'ms_DiagnosticCause_oauth2_auth_failed' => 'Failed OAuth2 authorization',
    'ms_DiagnosticCause_connection_refused' => 'Server refused connection',
    'ms_DiagnosticCause_connection_timeout' => 'Connection timeout exceeded',
    'ms_DiagnosticCause_connection_failed' => 'Could not establish connection to SMTP server',
    'ms_DiagnosticCause_ssl_tls_failed' => 'SSL/TLS encryption error',
    'ms_DiagnosticCause_password_incorrect' => 'Incorrect username or password',
    'ms_DiagnosticCause_wrong_port_encryption' => 'Incorrect port or encryption type for server',
    'ms_DiagnosticCause_unknown_error' => 'Unknown error',
    'ms_DiagnosticCause_dns_resolution_failed' => 'Cannot find SMTP server',
    'ms_DiagnosticCause_oauth2_gmail_535' => 'Google rejected OAuth2 authentication',
    'ms_DiagnosticCause_gmail_app_password_required' => 'Gmail requires application password',
    'ms_DiagnosticCause_network_unreachable' => 'SMTP server unreachable',
    'ms_DiagnosticCause_oauth2_connection_auth' => 'OAuth2 authentication error during connection',

    // Detailed errors
    'ms_DiagnosticDetail_oauth2_535_error' => 'OAuth2 authorization failed (error 535) - invalid credentials or expired token',
    'ms_DiagnosticDetail_oauth2_refresh_token_invalid' => 'OAuth2 refresh token is invalid or expired',
    'ms_DiagnosticDetail_oauth2_insufficient_permissions' => 'OAuth2 account does not have permission to send emails',
    'ms_DiagnosticDetail_smtp_connection_refused' => 'SMTP server refused connection - check host and port',
    'ms_DiagnosticDetail_smtp_connection_timeout' => 'Connection timeout to SMTP server exceeded',
    'ms_DiagnosticDetail_smtp_connection_failed' => 'Could not establish connection to SMTP server - check network and server settings',
    'ms_DiagnosticDetail_ssl_certificate_failed' => 'SSL certificate verification error',
    'ms_DiagnosticDetail_ssl_handshake_failed' => 'SSL/TLS handshake error',
    'ms_DiagnosticDetail_smtp_auth_535_error' => 'SMTP authentication failed (535) - incorrect username/password',
    'ms_DiagnosticDetail_dns_lookup_failed' => 'System cannot find the specified SMTP server in DNS',
    'ms_DiagnosticDetail_gmail_oauth2_535_error' => 'Google rejected OAuth2 tokens (error 535) - possibly incorrect sender address or expired tokens',
    'ms_DiagnosticDetail_gmail_535_app_password' => 'Gmail requires application password instead of regular password (error 535)',
    'ms_DiagnosticDetail_server_unreachable' => 'SMTP server unreachable on network - check internet or local network connection',
    'ms_DiagnosticDetail_oauth2_connection_auth' => 'OAuth2 authentication failed when attempting to connect to SMTP server',

    // Hints and suggestions
    'ms_DiagnosticHint_check_sender_matches_oauth2' => 'Verify that sender address matches OAuth2 authorized account',
    'ms_DiagnosticHint_verify_client_credentials' => 'Check Client ID and Client Secret correctness',
    'ms_DiagnosticHint_reauthorize_oauth2' => 'Try reauthorizing OAuth2 connection',
    'ms_DiagnosticHint_reauthorize_oauth2_new_tokens' => 'Reauthorize OAuth2 connection to obtain new tokens',
    'ms_DiagnosticHint_check_gmail_send_as_permission' => 'Check "Send as" permissions in Gmail account',
    'ms_DiagnosticHint_verify_sender_authorized_gmail' => 'Verify that sender address is authorized in Gmail settings',
    'ms_DiagnosticHint_verify_smtp_hostname' => 'Verify SMTP server name correctness',
    'ms_DiagnosticHint_check_firewall_blocking' => 'Check that firewall is not blocking the connection',
    'ms_DiagnosticHint_ensure_smtp_service_running' => 'Ensure SMTP service is running on the server',
    'ms_DiagnosticHint_check_network_connectivity' => 'Check network connectivity to SMTP server',
    'ms_DiagnosticHint_server_overloaded_unreachable' => 'Server may be overloaded or unavailable',
    'ms_DiagnosticHint_disable_ssl_verification' => 'Try disabling SSL certificate verification',
    'ms_DiagnosticHint_check_valid_ssl_certificate' => 'Check that server has a valid SSL certificate',
    'ms_DiagnosticHint_check_encryption_type_matches' => 'Check that encryption type matches server requirements',
    'ms_DiagnosticHint_try_different_encryption' => 'Try a different encryption method (TLS/SSL/None)',
    'ms_DiagnosticHint_verify_username_password' => 'Verify username and password correctness',
    'ms_DiagnosticHint_check_app_specific_password' => 'Check if account requires application password',
    'ms_DiagnosticHint_ensure_smtp_auth_allowed' => 'Ensure account allows SMTP authentication',
    'ms_DiagnosticHint_check_port_matches_encryption' => 'Check that port matches encryption type',
    'ms_DiagnosticHint_common_port_combinations' => 'Common combinations: 587+TLS, 465+SSL, 25+None',
    'ms_DiagnosticHint_gmail_sender_must_match' => 'For Gmail: sender address must match OAuth2 account or be its alias',
    'ms_DiagnosticHint_check_send_mail_as_settings' => 'Check "Send mail as" settings in Gmail',
    'ms_DiagnosticHint_try_ip_instead_hostname' => 'Try using IP address instead of hostname',
    'ms_DiagnosticHint_verify_oauth2_tokens_valid' => 'Verify that OAuth2 tokens have not expired',
    'ms_DiagnosticHint_use_app_specific_password' => 'Use application password instead of main password',
    'ms_DiagnosticHint_enable_2fa_gmail' => 'Enable two-factor authentication and create application password',
    'ms_DiagnosticHint_verify_username_exact_email' => 'Ensure username is the exact email address',
    'ms_DiagnosticHint_check_server_hostname_port' => 'Check server hostname and port number correctness',
    'ms_DiagnosticHint_verify_network_connectivity' => 'Check internet or local network connection',

    // Diagnostic UI labels
    'ms_DiagnosticConnectionFailed' => 'Connection failed',
    'ms_DiagnosticAuthorized' => 'Authorized',
    'ms_DiagnosticProbableCause' => 'Probable cause:',
    'ms_DiagnosticTechnicalDetails' => 'Technical Details',

    // MS - Email Notification System
    // Common
    'ms_EmailNotification_Server' => 'Server',
    'ms_EmailNotification_Footer_AutomatedNotification' => 'This is an automated notification. Please do not reply to this email.',
    'ms_EmailNotification_Footer_PoweredBy' => 'Powered by',

    // Voicemail Notifications
    'ms_EmailNotification_Voicemail_Subject' => 'New Voicemail Message',
    'ms_EmailNotification_Voicemail_Preheader' => 'You have received a new voicemail message',
    'ms_EmailNotification_Voicemail_Message' => 'A new voicemail message has been left in your mailbox.',
    'ms_EmailNotification_Voicemail_From' => 'From',
    'ms_EmailNotification_Voicemail_Number' => 'Number',
    'ms_EmailNotification_Voicemail_Duration' => 'Duration',
    'ms_EmailNotification_Voicemail_Date' => 'Date and Time',
    'ms_EmailNotification_Voicemail_HelpText' => 'You can listen to the recording by opening the attached audio file.',

    // Login Notifications
    'ms_EmailNotification_Login_Subject' => 'Login to MikoPBX Admin Panel',
    'ms_EmailNotification_Login_Preheader' => 'New login detected',
    'ms_EmailNotification_Login_Message' => 'A login to your PBX administrative panel has been detected.',
    'ms_EmailNotification_Login_Username' => 'Username',
    'ms_EmailNotification_Login_IPAddress' => 'IP Address',
    'ms_EmailNotification_Login_Browser' => 'Browser',
    'ms_EmailNotification_Login_Time' => 'Login Time',
    'ms_EmailNotification_Login_SecurityNotice' => 'If this wasn\'t you',
    'ms_EmailNotification_Login_SecurityAction' => 'If you did not perform this login, immediately change your password and review your security settings.',
    'ms_EmailNotification_Login_GoToAdminPanel' => 'Go to Admin Panel',
    'ms_EmailNotification_Login_HelpText' => 'This notification is sent each time someone logs into the administrative panel to ensure system security.',

    // Missed Call Notifications
    'ms_EmailNotification_MissedCall_Subject' => 'Missed Call',
    'ms_EmailNotification_MissedCall_Preheader' => 'You have a missed call',
    'ms_EmailNotification_MissedCall_From' => 'From',
    'ms_EmailNotification_MissedCall_ToExtension' => 'To',
    'ms_EmailNotification_MissedCall_Time' => 'Call Time',
    'ms_EmailNotification_MissedCall_Footer' => 'Please contact the caller at your earliest convenience.',
    'ms_EmailNotification_MissedCall_ManagePreferences' => 'Manage Notification Preferences',

    // Disk Space Notifications
    'ms_EmailNotification_DiskSpace_Subject' => 'Warning: Low Disk Space',
    'ms_EmailNotification_DiskSpace_Preheader' => 'Disk space critically low',
    'ms_EmailNotification_DiskSpace_Message' => 'Your phone system is running low on storage disk space.',
    'ms_EmailNotification_DiskSpace_CurrentUsage' => 'Current Usage',
    'ms_EmailNotification_DiskSpace_AvailableSpace' => 'Available',
    'ms_EmailNotification_DiskSpace_Threshold' => 'Critical Threshold',
    'ms_EmailNotification_DiskSpace_GoToAdminPanel' => 'Go to Storage Management',
    'ms_EmailNotification_DiskSpace_HelpText' => 'We recommend freeing up space or increasing disk size to prevent issues with call recordings and system operation.',

    // Security Log Growth Notifications
    'ms_EmailNotification_SecurityLog_Subject' => 'Security Warning: Suspicious Activity in Security Log',
    'ms_EmailNotification_SecurityLog_Preheader' => 'Rapid Asterisk security log growth detected',
    'ms_EmailNotification_SecurityLog_Message' => 'Suspiciously rapid growth of the Asterisk security log has been detected, which may indicate attack attempts on your phone system.',
    'ms_EmailNotification_SecurityLog_Critical' => 'CRITICAL LEVEL',
    'ms_EmailNotification_SecurityLog_Warning' => 'Warning',
    'ms_EmailNotification_SecurityLog_GrowthRate' => 'Growth Rate',
    'ms_EmailNotification_SecurityLog_During' => 'during',
    'ms_EmailNotification_SecurityLog_PossibleCauses' => 'Possible Causes',
    'ms_EmailNotification_SecurityLog_Cause_BruteForce' => 'Brute force password attack',
    'ms_EmailNotification_SecurityLog_Cause_Scanning' => 'Port and service scanning',
    'ms_EmailNotification_SecurityLog_Cause_Misconfiguration' => 'Incorrect security or firewall configuration',
    'ms_EmailNotification_SecurityLog_CheckFirewall' => 'Check Security Settings',
    'ms_EmailNotification_SecurityLog_HelpText' => 'We recommend immediately checking the Asterisk security log, firewall settings and Fail2Ban. If necessary, restrict access to the system from trusted IP addresses only.',

    // SSH Password Changed Notifications
    'ms_EmailNotification_SSHPassword_Subject' => 'Warning: SSH Password Changed',
    'ms_EmailNotification_SSHPassword_Preheader' => 'SSH password has been modified',
    'ms_EmailNotification_SSHPassword_ChangedBy' => 'Changed By',
    'ms_EmailNotification_SSHPassword_IPAddress' => 'IP Address',
    'ms_EmailNotification_SSHPassword_Time' => 'Change Time',
    'ms_EmailNotification_SSHPassword_SecurityNotice' => 'Security Warning',
    'ms_EmailNotification_SSHPassword_SecurityAction' => 'The SSH password was changed outside the MikoPBX web interface. If this wasn\'t you, immediately review your security settings.',
    'ms_EmailNotification_SSHPassword_ReviewSecuritySettings' => 'Review Security Settings',
    'ms_EmailNotification_SSHPassword_Footer' => 'This is a critical security notification. Ignoring this message may lead to system compromise.',

    // System Problems Notifications
    'ms_EmailNotification_SystemProblems_Subject' => 'MikoPBX System Problems Detected',
    'ms_EmailNotification_SystemProblems_Preheader' => 'Administrator attention required',
    'ms_EmailNotification_SystemProblems_Message' => 'The system has detected %count% problem(s) that require your attention.',
    'ms_EmailNotification_SystemProblems_DetectedProblems' => 'Detected Problems',
    'ms_EmailNotification_SystemProblems_ActionRequired' => 'Action Required',
    'ms_EmailNotification_SystemProblems_PleaseResolve' => 'Please resolve the identified issues as soon as possible to ensure stable phone system operation.',
    'ms_EmailNotification_SystemProblems_GoToAdminPanel' => 'Go to Admin Panel',
    'ms_EmailNotification_SystemProblems_HelpText' => 'If you need help resolving these issues, contact technical support or visit our knowledge base.',

    // SMTP Test Notifications
    'ms_EmailNotification_SMTPTest_Subject' => 'SMTP Settings Test',
    'ms_EmailNotification_SMTPTest_Preheader' => 'Mail server configuration check',
    'ms_EmailNotification_SMTPTest_Message' => 'This is a test email to verify your mail server settings.',
    'ms_EmailNotification_SMTPTest_Successful' => 'Congratulations! Your SMTP settings are working correctly.',
    'ms_EmailNotification_SMTPTest_SMTPServer' => 'SMTP Server',
    'ms_EmailNotification_SMTPTest_Port' => 'Port',
    'ms_EmailNotification_SMTPTest_Encryption' => 'Encryption',
    'ms_EmailNotification_SMTPTest_Authentication' => 'Authentication',
    'ms_EmailNotification_SMTPTest_FromAddress' => 'From Address',
    'ms_EmailNotification_SMTPTest_OAuth2Provider' => 'OAuth2 Provider',
    'ms_EmailNotification_SMTPTest_Configured' => 'Configured',
    'ms_EmailNotification_SMTPTest_Working' => 'Working',
    'ms_EmailNotification_SMTPTest_Passed' => 'Passed',
    'ms_EmailNotification_SMTPTest_SMTPConnection' => 'SMTP Connection',
    'ms_EmailNotification_SMTPTest_EmailDelivery' => 'Email Delivery',
    'ms_EmailNotification_SMTPTest_HelpText' => 'If you received this email, your mail configuration is set up correctly and ready to send notifications.',

];
