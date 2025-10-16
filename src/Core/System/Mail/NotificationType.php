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

namespace MikoPBX\Core\System\Mail;

/**
 * Enum NotificationType
 *
 * Defines all available email notification types with their visual characteristics.
 * Each type has predefined color scheme and icon for consistent email branding.
 *
 * @package MikoPBX\Core\System\Mail
 */
enum NotificationType: string
{
    /** System problems and errors notification */
    case SYSTEM_PROBLEMS = 'system_problems';

    /** SSH password change security alert */
    case SSH_PASSWORD_CHANGED = 'ssh_password_changed';

    /** Disk space warning notification */
    case DISK_SPACE_WARNING = 'disk_space_warning';

    /** Missed call notification */
    case MISSED_CALL = 'missed_call';

    /** New voicemail message notification */
    case VOICEMAIL = 'voicemail';

    /** SIP credentials for softphone setup */
    case SIP_CREDENTIALS = 'sip_credentials';

    /** SMTP/OAuth2 test email */
    case SMTP_TEST = 'smtp_test';

    /** System and modules updates available */
    case SYSTEM_UPDATES = 'system_updates';

    /** Admin panel login notification */
    case LOGIN_NOTIFICATION = 'login_notification';

    /**
     * Get gradient color scheme for email header
     *
     * Returns array with 'start' and 'end' colors for CSS gradient.
     * Colors are chosen based on notification severity and type.
     *
     * @return array{start: string, end: string} Hex color codes for gradient
     */
    public function getColorScheme(): array
    {
        return match($this) {
            self::SYSTEM_PROBLEMS => [
                'start' => '#ff6b6b',  // Red - critical/error
                'end' => '#ee5a24'
            ],
            self::SSH_PASSWORD_CHANGED => [
                'start' => '#ffa502',  // Orange - security warning
                'end' => '#ff6348'
            ],
            self::DISK_SPACE_WARNING => [
                'start' => '#ff6b6b',  // Red - critical warning
                'end' => '#ee5a24'
            ],
            self::MISSED_CALL => [
                'start' => '#4834d4',  // Blue - informational
                'end' => '#686de0'
            ],
            self::VOICEMAIL => [
                'start' => '#00d2d3',  // Teal - communication
                'end' => '#01a3a4'
            ],
            self::SIP_CREDENTIALS => [
                'start' => '#20bf6b',  // Green - success/setup
                'end' => '#26de81'
            ],
            self::SMTP_TEST => [
                'start' => '#3742fa',  // Blue - testing
                'end' => '#5f66f1'
            ],
            self::SYSTEM_UPDATES => [
                'start' => '#6c5ce7',  // Purple - updates
                'end' => '#a29bfe'
            ],
            self::LOGIN_NOTIFICATION => [
                'start' => '#0984e3',  // Blue - security/authentication
                'end' => '#74b9ff'
            ],
        };
    }

    /**
     * Get emoji icon for notification type
     *
     * Returns Unicode emoji character that represents the notification type.
     * Used in email header to provide visual identification.
     *
     * @return string Unicode emoji character
     */
    public function getIcon(): string
    {
        return match($this) {
            self::SYSTEM_PROBLEMS => '⚠️',
            self::SSH_PASSWORD_CHANGED => '🔐',
            self::DISK_SPACE_WARNING => '⚠️',
            self::MISSED_CALL => '📞',
            self::VOICEMAIL => '🎙️',
            self::SIP_CREDENTIALS => '✅',
            self::SMTP_TEST => '🧪',
            self::SYSTEM_UPDATES => '🔄',
            self::LOGIN_NOTIFICATION => '🔑',
        };
    }

    /**
     * Get default email title for notification type
     *
     * Returns default English title. Should be translated using translation service
     * in actual implementation.
     *
     * @return string Default notification title
     */
    public function getDefaultTitle(): string
    {
        return match($this) {
            self::SYSTEM_PROBLEMS => 'System Problems Detected',
            self::SSH_PASSWORD_CHANGED => 'SSH Password Changed',
            self::DISK_SPACE_WARNING => 'Disk Space Warning',
            self::MISSED_CALL => 'Missed Call',
            self::VOICEMAIL => 'New Voicemail',
            self::SIP_CREDENTIALS => 'Your SIP Credentials',
            self::SMTP_TEST => 'SMTP Test Successful',
            self::SYSTEM_UPDATES => 'Updates Available',
            self::LOGIN_NOTIFICATION => 'Admin Panel Login',
        };
    }

    /**
     * Check if notification type is critical
     *
     * Critical notifications should bypass caching and be sent immediately.
     *
     * @return bool True if notification is critical
     */
    public function isCritical(): bool
    {
        return match($this) {
            self::SYSTEM_PROBLEMS,
            self::SSH_PASSWORD_CHANGED,
            self::DISK_SPACE_WARNING => true,
            default => false,
        };
    }
}
