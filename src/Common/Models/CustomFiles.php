<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Common\Models;

use Phalcon\Filter\Validation;
use Phalcon\Filter\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class CustomFiles
 *
 * @package MikoPBX\Common\Models
 */
class CustomFiles extends ModelsBase
{
    public const string MODE_NONE = 'none';
    public const string MODE_APPEND = 'append';
    public const string MODE_OVERRIDE = 'override';
    public const string MODE_SCRIPT = 'script';
    public const string MODE_CUSTOM = 'custom';  // User-created custom file

    /**
     * List of directories where custom files are allowed to be created/modified/deleted.
     * This is a security measure to prevent modification of critical system files.
     */
    public const array ALLOWED_DIRECTORIES = [
        '/usr/bin/',
        '/usr/sbin/',
        '/bin/',
        '/sbin/',
        '/etc/asterisk/',
        '/etc/dahdi/',
        '/etc/fail2ban/',
        '/etc/keepalived/',
        '/etc/monit.d/',
        '/etc/nats/',
        '/etc/nginx/',
        '/etc/php.d/',
        '/etc/ppp/',
        '/etc/rc/',
        '/etc/rsyslog.d/',
        '/etc/wireguard/',
        '/var/lib/asterisk/',
        '/var/spool/asterisk/',
        '/var/spool/cron/crontabs/',
        '/storage/usbdisk1/',
        '/tmp/',
        '/var/www/',
    ];

    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * Filepath of the custom file
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $filepath = '';

    /**
     * Content of the custom file
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $content = null;

    /**
     * File replacement mode
     * append - append to the end of the file
     * override - override the file
     * none - do nothing
     *
     * @Column(type="string", nullable=true, default="none") {'script'|'append'|'override'|'none'}
     */
    public ?string $mode = self::MODE_NONE;

    /**
     * Indicates if the file has been changed
     *
     * @Column(type="string", length=1, nullable=true, default="0")
     */
    public ?string $changed = '0';

    /**
     * Description of the custom file
     *
     * @Column(type="string", nullable=true)
     */
    public ?string $description = '';

    /**
     * Initialize the model.
     */
    public function initialize(): void
    {
        $this->setSource('m_CustomFiles');
        parent::initialize();
    }

    /**
     * Perform validation on the model.
     *
     * @return bool Whether the validation was successful or not.
     */
    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'filepath',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisFilepathMustBeUniqueForCustomFilesModels'),
                ]
            )
        );

        return $this->validate($validation);
    }

    /**
     * Get the decoded content from the model.
     *
     * @return string The decoded content.
     */
    public function getContent(): string
    {
        return base64_decode((string)$this->content);
    }

    /**
     * Set the encoded content for the model.
     *
     * @param string $text The content to be encoded and set.
     * @return void
     */
    public function setContent(string $text): void
    {
        $this->content = base64_encode($text);
    }

    /**
     * Check if the filepath is within allowed directories
     *
     * @param string $filepath The file path to check
     * @return bool True if the file is in an allowed directory
     */
    public static function isPathAllowed(string $filepath): bool
    {
        // Normalize the path to prevent directory traversal attacks
        $normalizedPath = self::normalizePath($filepath);
        if ($normalizedPath === false) {
            return false;
        }

        // Check each allowed directory
        foreach (self::ALLOWED_DIRECTORIES as $allowedDir) {
            // Normalize the allowed directory path
            $normalizedAllowedDir = rtrim($allowedDir, '/');

            // Check if the file is within this allowed directory
            if (strpos($normalizedPath, $normalizedAllowedDir . '/') === 0 ||
                $normalizedPath === $normalizedAllowedDir) {
                return true;
            }
        }

        return false;
    }

    /**
     * Normalize and validate a file path
     *
     * @param string $filepath The file path to normalize
     * @return string|false Normalized path or false if invalid
     */
    private static function normalizePath(string $filepath): string|false
    {
        // Remove any null bytes
        $filepath = str_replace("\0", '', $filepath);

        // Check for directory traversal attempts
        if (str_contains($filepath, '..')) {
            return false;
        }

        // Ensure path is absolute
        if (!str_starts_with($filepath, '/')) {
            return false;
        }

        // Remove multiple slashes
        $filepath = preg_replace('#/+#', '/', $filepath);

        // Remove trailing slash if it's not the root directory
        if (strlen($filepath) > 1 && str_ends_with($filepath, '/')) {
            $filepath = rtrim($filepath, '/');
        }

        return $filepath;
    }

    /**
     * Get a user-friendly error message for security violations
     *
     * @param string $filepath The file path that was rejected
     * @return string Error message
     */
    public static function getSecurityErrorMessage(string $filepath): string
    {
        return "Security error: File path '$filepath' is not in an allowed directory. " .
               "Custom files can only be created in specific system directories.";
    }
}
