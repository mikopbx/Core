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

declare(strict_types=1);

namespace MikoPBX\Common\Library\Auth;

use ErrorException;
use MikoPBX\AdminCabinet\Controllers\SessionController;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\AclProvider;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\PasswordService;
use MikoPBX\Modules\Config\WebUIConfigInterface;
use Phalcon\Encryption\Security;

/**
 * Shared authentication credentials validator
 *
 * Provides unified authentication logic for both web UI (SessionController)
 * and REST API (Auth/LoginAction). Eliminates code duplication.
 *
 * @package MikoPBX\Common\Library\Auth
 */
class CredentialsValidator
{
    /**
     * Build admin session parameters
     *
     * Creates standard session parameter array for admin user.
     * Used by both password and passkey authentication.
     *
     * @param string $login Admin login name
     * @return array<string, mixed> Session parameters
     */
    public static function buildAdminSessionParams(string $login): array
    {
        return [
            SessionController::ROLE => AclProvider::ROLE_ADMINS,
            SessionController::HOME_PAGE => '/admin-cabinet/extensions/index',
            SessionController::USER_NAME => $login,
        ];
    }

    /**
     * Check admin credentials
     *
     * Validates login and password against system admin credentials.
     * Supports multiple password formats for backward compatibility:
     * 1. Plain text (legacy installations)
     * 2. SHA-512 crypt hash (new format, compatible with /etc/shadow)
     * 3. bcrypt hash (Phalcon Security, existing installations)
     *
     * @param string $login Login name
     * @param string $password Password
     * @param Security $security Security service for bcrypt verification
     * @return bool True if credentials are valid
     */
    public static function checkAdminCredentials(string $login, string $password, Security $security): bool
    {
        // Check admin login name
        $storedLogin = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_LOGIN);
        if ($storedLogin !== $login) {
            return false;
        }

        $storedPassword = PbxSettings::getValueByKey(PbxSettings::WEB_ADMIN_PASSWORD);

        // 1. Plain text match (legacy)
        if ($storedPassword === $password) {
            return true;
        }

        // 2. SHA-512 crypt hash (new format)
        if (PasswordService::isSha512Hash($storedPassword)) {
            return PasswordService::verifySha512Hash($password, $storedPassword);
        }

        // 3. bcrypt hash (existing installations via Phalcon Security)
        set_error_handler(function ($severity, $message, $file, $line) {
            throw new ErrorException($message, 0, $severity, $file, $line);
        });

        try {
            $result = $security->checkHash($password, $storedPassword);
        } catch (ErrorException $e) {
            $result = false;
        }
        restore_error_handler();

        return $result;
    }

    /**
     * Authenticate via module hooks
     *
     * Attempts to authenticate user through registered extension modules.
     * Returns session parameters from the first module that successfully authenticates.
     *
     * @param string $login User login
     * @param string $password User password
     * @return array<string, mixed>|null Session parameters if authenticated, null otherwise
     */
    public static function authenticateViaModules(string $login, string $password): ?array
    {
        // Try to authenticate via module hooks
        $moduleResults = PBXConfModulesProvider::hookModulesMethod(
            WebUIConfigInterface::AUTHENTICATE_USER,
            [$login, $password]
        );

        foreach ($moduleResults as $sessionData) {
            if (!empty($sessionData) && is_array($sessionData)) {
                return $sessionData;
            }
        }

        return null;
    }

    /**
     * Authenticate user with password
     *
     * Complete authentication flow: checks admin credentials first,
     * then tries module authentication if admin check fails.
     *
     * Returns session parameters on success:
     * - SessionController::ROLE - user role ('admins' or module-specific)
     * - SessionController::HOME_PAGE - redirect URL after login
     * - SessionController::USER_NAME - user login
     *
     * @param string $login User login
     * @param string $password User password
     * @param Security $security Security service for password hashing
     * @return array<string, mixed>|null Session parameters if authenticated, null otherwise
     */
    public static function authenticate(string $login, string $password, Security $security): ?array
    {
        // Check admin credentials first
        if (self::checkAdminCredentials($login, $password, $security)) {
            return self::buildAdminSessionParams($login);
        }

        // Try to authenticate via module hooks
        return self::authenticateViaModules($login, $password);
    }
}
