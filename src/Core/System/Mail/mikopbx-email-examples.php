<?php

declare(strict_types=1);

/**
 * MikoPBX Email Template Usage Examples
 * 
 * This file demonstrates how to use the universal email template
 * for different types of notifications in MikoPBX system.
 * 
 * PSR-12 compliant code style
 */

namespace MikoPBX\EmailTemplates;

/**
 * Class EmailTemplateExamples
 * 
 * Provides examples of filling the email template with data
 * for different notification scenarios
 */
class EmailTemplateExamples
{
    /**
     * Example 1: Disk space warning notification
     * 
     * @param array $data Contains server info and disk usage details
     * @return array Template variables
     */
    public function getDiskSpaceWarningVariables(array $data): array
    {
        return [
            // Header configuration
            'HEADER_COLOR_START' => '#ff6b6b',  // Red gradient for warnings
            'HEADER_COLOR_END' => '#ee5a24',
            'NOTIFICATION_ICON' => '⚠️',
            'EMAIL_TITLE' => 'Disk Space Warning',
            'EMAIL_SUBJECT' => 'Warning: Low disk space on server',
            'PREHEADER_TEXT' => 'Your server is running low on disk space',
            
            // Server identification
            'SERVER_LABEL' => 'Server',
            'SERVER_NAME' => $data['server_name'] ?? 'MikoPBX Server',
            'TIMESTAMP' => date('Y-m-d H:i:s'),
            'LANGUAGE_CODE' => $data['language'] ?? 'en',
            
            // Main content
            'MAIN_MESSAGE' => 'Your server is running critically low on disk space. Immediate action is required to prevent service interruption.',
            
            // Dynamic content with disk usage details
            'DYNAMIC_CONTENT' => $this->buildDiskUsageContent($data),
            
            // Information box
            'IF_INFO_BOX' => true,
            'INFO_BOX_COLOR' => '#ff6b6b',
            'INFO_BOX_CONTENT' => "<strong>Current Usage:</strong> {$data['disk_usage']}%<br>" .
                                  "<strong>Available Space:</strong> {$data['free_space']} GB<br>" .
                                  "<strong>Threshold:</strong> 90%",
            
            // Call to action
            'IF_CTA_BUTTON' => true,
            'CTA_URL' => $data['admin_url'] ?? '#',
            'CTA_COLOR' => '#007bff',
            'CTA_TEXT' => 'Go to Admin Panel',
            
            // Help text
            'IF_HELP_TEXT' => true,
            'HELP_TEXT' => 'Please free up disk space by removing old recordings, logs, or unnecessary files. ' .
                          'If you need assistance, contact your system administrator.',
            
            // Footer
            'FOOTER_MESSAGE' => 'This is an automated notification from your MikoPBX system.',
            'IF_UNSUBSCRIBE' => false,
            'IF_POWERED_BY' => true,
        ];
    }
    
    /**
     * Example 2: SSH password change notification
     * 
     * @param array $data Contains server and security info
     * @return array Template variables
     */
    public function getSshPasswordChangeVariables(array $data): array
    {
        return [
            // Header configuration for security alerts
            'HEADER_COLOR_START' => '#ffa502',  // Orange gradient for security
            'HEADER_COLOR_END' => '#ff6348',
            'NOTIFICATION_ICON' => '🔐',
            'EMAIL_TITLE' => 'Security Alert',
            'EMAIL_SUBJECT' => 'SSH Password Changed',
            'PREHEADER_TEXT' => 'The SSH password for your server has been changed',
            
            // Server identification
            'SERVER_LABEL' => 'Server',
            'SERVER_NAME' => $data['server_name'] ?? 'MikoPBX Server',
            'TIMESTAMP' => date('Y-m-d H:i:s'),
            'LANGUAGE_CODE' => $data['language'] ?? 'en',
            
            // Main content
            'MAIN_MESSAGE' => 'The SSH password for your MikoPBX server has been successfully changed. ' .
                            'If you did not initiate this change, please take immediate action.',
            
            // Dynamic content
            'DYNAMIC_CONTENT' => '',
            
            // Information box with details
            'IF_INFO_BOX' => true,
            'INFO_BOX_COLOR' => '#ffa502',
            'INFO_BOX_CONTENT' => "<strong>Changed by:</strong> {$data['changed_by']}<br>" .
                                  "<strong>IP Address:</strong> {$data['ip_address']}<br>" .
                                  "<strong>Time:</strong> {$data['change_time']}",
            
            // Security action button
            'IF_CTA_BUTTON' => true,
            'CTA_URL' => $data['security_settings_url'] ?? '#',
            'CTA_COLOR' => '#ff6348',
            'CTA_TEXT' => 'Review Security Settings',
            
            // Help text
            'IF_HELP_TEXT' => true,
            'HELP_TEXT' => '<strong>Security Notice:</strong> If you did not authorize this change, ' .
                          'please contact your system administrator immediately and consider changing all passwords.',
            
            // Footer
            'FOOTER_MESSAGE' => 'This security notification cannot be disabled for your protection.',
            'IF_UNSUBSCRIBE' => false,
            'IF_POWERED_BY' => true,
        ];
    }
    
    /**
     * Example 3: Missed call notification
     * 
     * @param array $data Contains call details
     * @return array Template variables
     */
    public function getMissedCallVariables(array $data): array
    {
        return [
            // Header configuration for informational messages
            'HEADER_COLOR_START' => '#4834d4',  // Blue gradient
            'HEADER_COLOR_END' => '#686de0',
            'NOTIFICATION_ICON' => '📞',
            'EMAIL_TITLE' => 'Missed Call',
            'EMAIL_SUBJECT' => "Missed call from {$data['caller_id']}",
            'PREHEADER_TEXT' => "You have a missed call from {$data['caller_id']}",
            
            // Server identification
            'SERVER_LABEL' => 'PBX System',
            'SERVER_NAME' => $data['server_name'] ?? 'MikoPBX',
            'TIMESTAMP' => $data['call_time'] ?? date('Y-m-d H:i:s'),
            'LANGUAGE_CODE' => $data['language'] ?? 'en',
            
            // Main content
            'MAIN_MESSAGE' => "You missed a call from <strong>{$data['caller_id']}</strong>" .
                            ($data['caller_name'] ? " ({$data['caller_name']})" : '') . '.',
            
            // Call details table
            'IF_DATA_TABLE' => true,
            'DATA_TABLE_ROWS' => $this->buildCallDetailsTable($data),
            
            // No info box for missed calls
            'IF_INFO_BOX' => false,
            
            // Call back button
            'IF_CTA_BUTTON' => !empty($data['callback_available']),
            'CTA_URL' => "tel:{$data['caller_id']}",
            'CTA_COLOR' => '#4834d4',
            'CTA_TEXT' => 'Call Back',
            
            // Help text
            'IF_HELP_TEXT' => false,
            
            // Footer
            'FOOTER_MESSAGE' => 'You received this notification because missed call alerts are enabled for your extension.',
            'IF_UNSUBSCRIBE' => true,
            'UNSUBSCRIBE_URL' => $data['unsubscribe_url'] ?? '#',
            'UNSUBSCRIBE_TEXT' => 'Manage notification preferences',
            'IF_POWERED_BY' => false,
        ];
    }
    
    /**
     * Example 4: Voicemail notification
     * 
     * @param array $data Contains voicemail details
     * @return array Template variables
     */
    public function getVoicemailVariables(array $data): array
    {
        return [
            // Header configuration
            'HEADER_COLOR_START' => '#00d2d3',  // Teal gradient
            'HEADER_COLOR_END' => '#01a3a4',
            'NOTIFICATION_ICON' => '🎙️',
            'EMAIL_TITLE' => 'New Voicemail',
            'EMAIL_SUBJECT' => 'You have a new voicemail message',
            'PREHEADER_TEXT' => "New voicemail from {$data['caller_id']}",
            
            // Server identification
            'SERVER_LABEL' => 'PBX System',
            'SERVER_NAME' => $data['server_name'] ?? 'MikoPBX',
            'TIMESTAMP' => date('Y-m-d H:i:s'),
            'LANGUAGE_CODE' => $data['language'] ?? 'en',
            
            // Main content
            'MAIN_MESSAGE' => "You have received a new voicemail message.",
            
            // Voicemail details
            'IF_DATA_TABLE' => true,
            'DATA_TABLE_ROWS' => $this->buildVoicemailDetailsTable($data),

            // No info box — help text already mentions the attachment
            'IF_INFO_BOX' => false,

            // No CTA button
            'IF_CTA_BUTTON' => false,

            // Help text about attachment
            'IF_HELP_TEXT' => true,
            'HELP_TEXT' => 'You can listen to the recording by opening the attached audio file.',

            // Footer
            'FOOTER_MESSAGE' => 'This is an automated notification. Please do not reply to this email.',
            'IF_UNSUBSCRIBE' => false,
            'IF_POWERED_BY' => true,
        ];
    }
    
    /**
     * Example 5: SIP credentials notification
     * 
     * @param array $data Contains SIP account details
     * @return array Template variables
     */
    public function getSipCredentialsVariables(array $data): array
    {
        return [
            // Header configuration
            'HEADER_COLOR_START' => '#20bf6b',  // Green gradient for success
            'HEADER_COLOR_END' => '#26de81',
            'NOTIFICATION_ICON' => '✅',
            'EMAIL_TITLE' => 'Your SIP Credentials',
            'EMAIL_SUBJECT' => 'SIP Softphone Configuration',
            'PREHEADER_TEXT' => 'Your SIP account credentials for softphone setup',
            
            // Server identification
            'SERVER_LABEL' => 'PBX Server',
            'SERVER_NAME' => $data['server_name'] ?? 'MikoPBX',
            'TIMESTAMP' => date('Y-m-d H:i:s'),
            'LANGUAGE_CODE' => $data['language'] ?? 'en',
            
            // Main content
            'MAIN_MESSAGE' => 'Here are your SIP credentials for configuring your softphone application. ' .
                            'Please keep this information secure.',
            
            // Credentials table
            'IF_DATA_TABLE' => true,
            'DATA_TABLE_ROWS' => $this->buildSipCredentialsTable($data),
            
            // Security notice
            'IF_INFO_BOX' => true,
            'INFO_BOX_COLOR' => '#ffa502',
            'INFO_BOX_CONTENT' => '<strong>Security Notice:</strong> Never share these credentials with anyone. ' .
                                  'If you suspect your account has been compromised, contact your administrator immediately.',
            
            // Setup guide button
            'IF_CTA_BUTTON' => true,
            'CTA_URL' => $data['setup_guide_url'] ?? '#',
            'CTA_COLOR' => '#20bf6b',
            'CTA_TEXT' => 'View Setup Guide',
            
            // Help text with QR code mention
            'IF_HELP_TEXT' => true,
            'HELP_TEXT' => 'You can also use the QR code attached to this email for quick configuration on mobile devices. ' .
                          'For assistance, contact your system administrator.',
            
            // Footer
            'FOOTER_MESSAGE' => 'This email contains sensitive information. Please delete it after saving your credentials.',
            'IF_UNSUBSCRIBE' => false,
            'IF_POWERED_BY' => true,
        ];
    }
    
    /**
     * Example 6: SMTP test email
     * 
     * @param array $data Contains test parameters
     * @return array Template variables
     */
    public function getSmtpTestVariables(array $data): array
    {
        return [
            // Header configuration
            'HEADER_COLOR_START' => '#3742fa',  // Blue gradient for tests
            'HEADER_COLOR_END' => '#5f66f1',
            'NOTIFICATION_ICON' => '🧪',
            'EMAIL_TITLE' => 'SMTP Test Successful',
            'EMAIL_SUBJECT' => 'SMTP Configuration Test',
            'PREHEADER_TEXT' => 'Your SMTP settings are working correctly',
            
            // Server identification
            'SERVER_LABEL' => 'Test initiated from',
            'SERVER_NAME' => $data['server_name'] ?? 'MikoPBX',
            'TIMESTAMP' => date('Y-m-d H:i:s'),
            'LANGUAGE_CODE' => $data['language'] ?? 'en',
            
            // Main content
            'MAIN_MESSAGE' => 'Congratulations! Your SMTP email configuration is working correctly. ' .
                            'This test email confirms that your email settings are properly configured.',
            
            // Test parameters table
            'IF_DATA_TABLE' => true,
            'DATA_TABLE_ROWS' => $this->buildSmtpTestTable($data),
            
            // Success info box
            'IF_INFO_BOX' => true,
            'INFO_BOX_COLOR' => '#20bf6b',
            'INFO_BOX_CONTENT' => '<strong>✓ SMTP Connection:</strong> Successful<br>' .
                                  '<strong>✓ Authentication:</strong> Passed<br>' .
                                  '<strong>✓ Email Delivery:</strong> Working<br>' .
                                  ($data['oauth2_enabled'] ? '<strong>✓ OAuth2:</strong> Configured' : ''),
            
            // No CTA for test emails
            'IF_CTA_BUTTON' => false,
            
            // Help text
            'IF_HELP_TEXT' => true,
            'HELP_TEXT' => 'You can now use these settings for all system notifications. ' .
                          'If you experience any issues, please verify your SMTP settings.',
            
            // Footer
            'FOOTER_MESSAGE' => 'This is a test email. No action required.',
            'IF_UNSUBSCRIBE' => false,
            'IF_POWERED_BY' => true,
        ];
    }
    
    /**
     * Example 7: System updates notification
     * 
     * @param array $data Contains available updates info
     * @return array Template variables
     */
    public function getSystemUpdatesVariables(array $data): array
    {
        return [
            // Header configuration
            'HEADER_COLOR_START' => '#6c5ce7',  // Purple gradient for updates
            'HEADER_COLOR_END' => '#a29bfe',
            'NOTIFICATION_ICON' => '🔄',
            'EMAIL_TITLE' => 'Updates Available',
            'EMAIL_SUBJECT' => 'New updates available for your MikoPBX',
            'PREHEADER_TEXT' => "{$data['updates_count']} updates are ready to install",
            
            // Server identification
            'SERVER_LABEL' => 'Server',
            'SERVER_NAME' => $data['server_name'] ?? 'MikoPBX',
            'TIMESTAMP' => date('Y-m-d H:i:s'),
            'LANGUAGE_CODE' => $data['language'] ?? 'en',
            
            // Main content
            'MAIN_MESSAGE' => "There are <strong>{$data['updates_count']}</strong> updates available for your system. " .
                            'We recommend installing these updates to ensure optimal performance and security.',
            
            // Dynamic content with update list
            'DYNAMIC_CONTENT' => $this->buildUpdatesList($data),
            
            // Info box with current versions
            'IF_INFO_BOX' => true,
            'INFO_BOX_COLOR' => '#6c5ce7',
            'INFO_BOX_CONTENT' => "<strong>Current System Version:</strong> {$data['current_version']}<br>" .
                                  "<strong>Available Version:</strong> {$data['available_version']}<br>" .
                                  "<strong>Last Updated:</strong> {$data['last_update_date']}",
            
            // Update button
            'IF_CTA_BUTTON' => true,
            'CTA_URL' => $data['update_url'] ?? '#',
            'CTA_COLOR' => '#6c5ce7',
            'CTA_TEXT' => 'View Updates',
            
            // Help text
            'IF_HELP_TEXT' => true,
            'HELP_TEXT' => '<strong>Important:</strong> Please backup your system before installing updates. ' .
                          'Updates will be installed during the maintenance window you have configured.',
            
            // Footer
            'FOOTER_MESSAGE' => 'You receive this notification because automatic update checks are enabled.',
            'IF_UNSUBSCRIBE' => true,
            'UNSUBSCRIBE_URL' => $data['notifications_settings_url'] ?? '#',
            'UNSUBSCRIBE_TEXT' => 'Change update notification settings',
            'IF_POWERED_BY' => true,
        ];
    }
    
    /**
     * Build disk usage content HTML
     * 
     * @param array $data Disk usage data
     * @return string HTML content
     */
    private function buildDiskUsageContent(array $data): string
    {
        $html = '<div style="margin: 20px 0;">';
        $html .= '<div style="background-color: #f1f3f5; border-radius: 8px; padding: 4px; margin-bottom: 15px;">';
        
        // Progress bar
        $usage = (int)($data['disk_usage'] ?? 85);
        $color = $usage > 90 ? '#ff6b6b' : ($usage > 75 ? '#ffa502' : '#20bf6b');
        
        $html .= '<div style="background-color: ' . $color . '; width: ' . $usage . '%; ';
        $html .= 'height: 30px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">';
        $html .= $usage . '%</div>';
        $html .= '</div>';
        
        // Partitions list
        if (!empty($data['partitions'])) {
            $html .= '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #495057;">';
            $html .= '<strong>Affected Partitions:</strong><br>';
            foreach ($data['partitions'] as $partition) {
                $html .= '• ' . $partition['name'] . ': ' . $partition['usage'] . '% used<br>';
            }
            $html .= '</div>';
        }
        
        $html .= '</div>';
        return $html;
    }
    
    /**
     * Build call details table rows
     * 
     * @param array $data Call data
     * @return string HTML table rows
     */
    private function buildCallDetailsTable(array $data): string
    {
        $rows = [
            ['label' => 'From', 'value' => $data['caller_id'] . ($data['caller_name'] ? ' (' . $data['caller_name'] . ')' : '')],
            ['label' => 'To Extension', 'value' => $data['extension']],
            ['label' => 'Time', 'value' => $data['call_time']],
            ['label' => 'Duration', 'value' => 'Missed'],
        ];
        
        return $this->buildTableRows($rows);
    }
    
    /**
     * Build voicemail details table rows
     * 
     * @param array $data Voicemail data
     * @return string HTML table rows
     */
    private function buildVoicemailDetailsTable(array $data): string
    {
        $rows = [
            ['label' => 'From', 'value' => $data['caller_name'] ?: $data['caller_id']],
        ];

        // Show number separately only when caller name is known
        if (!empty($data['caller_name']) && $data['caller_name'] !== $data['caller_id']) {
            $rows[] = ['label' => 'Number', 'value' => $data['caller_id']];
        }

        $rows[] = ['label' => 'Duration', 'value' => $data['duration'] . ' seconds'];
        $rows[] = ['label' => 'Received', 'value' => $data['received_time']];

        return $this->buildTableRows($rows);
    }
    
    /**
     * Build SIP credentials table rows
     * 
     * @param array $data SIP credentials data
     * @return string HTML table rows
     */
    private function buildSipCredentialsTable(array $data): string
    {
        $rows = [
            ['label' => 'SIP Server', 'value' => $data['sip_server']],
            ['label' => 'Port', 'value' => $data['sip_port'] ?? '5060'],
            ['label' => 'Transport', 'value' => $data['transport'] ?? 'UDP'],
            ['label' => 'Username', 'value' => $data['username']],
            ['label' => 'Password', 'value' => $data['password']],
            ['label' => 'Extension', 'value' => $data['extension']],
        ];
        
        if (!empty($data['outbound_proxy'])) {
            $rows[] = ['label' => 'Outbound Proxy', 'value' => $data['outbound_proxy']];
        }
        
        return $this->buildTableRows($rows);
    }
    
    /**
     * Build SMTP test table rows
     * 
     * @param array $data SMTP test data
     * @return string HTML table rows
     */
    private function buildSmtpTestTable(array $data): string
    {
        $rows = [
            ['label' => 'SMTP Server', 'value' => $data['smtp_server']],
            ['label' => 'Port', 'value' => $data['smtp_port']],
            ['label' => 'Encryption', 'value' => $data['encryption'] ?? 'TLS'],
            ['label' => 'Authentication', 'value' => $data['auth_type'] ?? 'LOGIN'],
            ['label' => 'From Address', 'value' => $data['from_address']],
        ];
        
        if (!empty($data['oauth2_enabled'])) {
            $rows[] = ['label' => 'OAuth2', 'value' => 'Enabled'];
            $rows[] = ['label' => 'Provider', 'value' => $data['oauth2_provider'] ?? 'Google'];
        }
        
        return $this->buildTableRows($rows);
    }
    
    /**
     * Build updates list HTML
     * 
     * @param array $data Updates data
     * @return string HTML content
     */
    private function buildUpdatesList(array $data): string
    {
        if (empty($data['updates'])) {
            return '';
        }
        
        $html = '<div style="margin: 25px 0;">';
        $html .= '<h3 style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; ';
        $html .= 'font-size: 16px; color: #333333; margin-bottom: 15px;">Available Updates:</h3>';
        
        foreach ($data['updates'] as $update) {
            $html .= '<div style="background-color: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 6px; border-left: 3px solid #6c5ce7;">';
            $html .= '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif;">';
            $html .= '<strong style="color: #333333; font-size: 14px;">' . htmlspecialchars($update['name']) . '</strong>';
            $html .= ' <span style="color: #6c757d; font-size: 12px;">v' . htmlspecialchars($update['version']) . '</span><br>';
            $html .= '<span style="color: #6c757d; font-size: 13px;">' . htmlspecialchars($update['description'] ?? '') . '</span>';
            $html .= '</div>';
            $html .= '</div>';
        }
        
        $html .= '</div>';
        return $html;
    }
    
    /**
     * Build HTML table rows from array data
     * 
     * @param array $rows Array of label/value pairs
     * @return string HTML table rows
     */
    private function buildTableRows(array $rows): string
    {
        $html = '';
        foreach ($rows as $row) {
            $html .= '<tr>';
            $html .= '<td style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; ';
            $html .= 'font-size: 14px; color: #6c757d; padding: 8px 0; vertical-align: top;">';
            $html .= htmlspecialchars($row['label']) . ':';
            $html .= '</td>';
            $html .= '<td style="font-family: \'SF Mono\', Monaco, \'Courier New\', monospace; font-size: 14px; color: #212529; ';
            $html .= 'padding: 8px 0; padding-left: 20px; word-break: break-all; vertical-align: top;">';
            $html .= '<strong>' . htmlspecialchars($row['value']) . '</strong>';
            $html .= '</td>';
            $html .= '</tr>';
        }
        return $html;
    }
}
