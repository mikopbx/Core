<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\Upgrade\Releases;

use MikoPBX\Common\Models\{Extensions, IncomingRoutingTable, Users};
use MikoPBX\Core\System\{SystemMessages, Upgrade\UpgradeSystemConfigInterface};
use Phalcon\Di\Injectable;

/**
 * Class UpdateConfigsUpToVer20241212
 * 
 * Migrates legacy action-based routing to extension-based routing for system actions.
 * Creates missing system extensions and updates IncomingRoutingTable records.
 * 
 * @package MikoPBX\Core\System\Upgrade\Releases
 */
class UpdateConfigsUpToVer20241212 extends Injectable implements UpgradeSystemConfigInterface
{
    public const string PBX_VERSION = '2024.12.12';
    
    /**
     * Map of legacy action values to system extension numbers.
     * These values match the constants from IncomingRoutingTable but are
     * defined as strings here to avoid dependency on deprecated constants.
     */
    private const LEGACY_ACTION_MAP = [
        'hangup' => 'hangup',
        'busy' => 'busy',
        'voicemail' => 'voicemail', 
        'did2user' => 'did2user',
    ];
    
    /**
     * Main update method
     *
     * @return void
     */
    public function processUpdate(): void
    {
        // Step 1: Ensure all system extensions exist
        $this->ensureSystemExtensionsExist();

        // Step 2: Migrate legacy action-based routing to extension-based
        $this->migrateLegacyActions();

        // Step 3: Remove legacy root user (id=1) if exists
        $this->removeLegacyRootUser();
    }
    
    /**
     * Ensure all required system extensions exist in the database
     *
     * @return void
     */
    private function ensureSystemExtensionsExist(): void
    {
        $systemExtensions = [
            'hangup' => 'Hangup',
            'busy' => 'Busy',
            'voicemail' => 'Voicemail',
            'did2user' => 'DID to User',
        ];
        
        foreach ($systemExtensions as $number => $name) {
            $extension = Extensions::findFirst([
                'conditions' => 'number = :number:',
                'bind' => ['number' => $number]
            ]);
            
            if ($extension === null) {
                // Create new system extension
                $extension = new Extensions();
                $extension->number = $number;
                $extension->type = Extensions::TYPE_SYSTEM;
                $extension->callerid = $name . ' System Extension';
                $extension->public_access = '0';
                $extension->show_in_phonebook = '0';
                $extension->save();
                
                echo "Created system extension: $number\n";
            } elseif ($extension->type !== Extensions::TYPE_SYSTEM) {
                // Update existing extension to be a system extension
                $extension->type = Extensions::TYPE_SYSTEM;
                $extension->save();
                
                echo "Updated extension $number to system type\n";
            }
        }
    }
    
    /**
     * Migrate legacy action-based routing to extension-based routing
     *
     * @return void
     */
    private function migrateLegacyActions(): void
    {
        // Find all incoming routes
        $routes = IncomingRoutingTable::find();
        if (!is_iterable($routes)) {
            return;
        }

        $migratedCount = 0;

        /** @var IncomingRoutingTable $route */
        foreach ($routes as $route) {
            $migrated = false;
            
            // Check if this route uses a legacy action
            if (isset(self::LEGACY_ACTION_MAP[$route->action])) {
                // Convert to extension-based routing
                $route->extension = self::LEGACY_ACTION_MAP[$route->action];
                $route->action = 'extension'; // Use string literal instead of constant
                $migrated = true;
            }
            // Special case for 'did' which might be stored as 'did' instead of 'did2user'
            elseif ($route->action === 'did') {
                $route->extension = 'did2user';
                $route->action = 'extension';
                $migrated = true;
            }
            
            if ($migrated && $route->save()) {
                $migratedCount++;
            }
        }
        
        if ($migratedCount > 0) {
            echo "Migrated $migratedCount incoming routes from action-based to extension-based routing\n";
        }
    }

    /**
     * Remove legacy root user (id=1) and associated extensions from old system versions.
     *
     * In old versions of MikoPBX (before refactoring), a "root user" with id=1 was automatically
     * created with extension number 10000. This is no longer needed and should be removed during upgrade.
     *
     * @return void
     */
    private function removeLegacyRootUser(): void
    {
        // Find user with id=1 (legacy root user)
        $legacyUser = Users::findFirst('id=1');

        if ($legacyUser === null) {
            // No legacy user found, nothing to do
            return;
        }

        SystemMessages::sysLogMsg(
            __METHOD__,
            "Found legacy root user (id=1, email: {$legacyUser->email}). Removing...",
            LOG_INFO
        );

        // Find and delete all extensions associated with this user
        $userExtensions = Extensions::find([
            'conditions' => 'userid = :userid:',
            'bind' => ['userid' => $legacyUser->id]
        ]);

        if (!is_iterable($userExtensions)) {
            SystemMessages::sysLogMsg(
                __METHOD__,
                'No extensions found for legacy user, proceeding with user deletion',
                LOG_INFO
            );
            $userExtensions = [];
        }

        $deletedExtensions = 0;
        /** @var Extensions $extension */
        foreach ($userExtensions as $extension) {
            if ($extension->delete()) {
                $deletedExtensions++;
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Deleted legacy extension: {$extension->number} (type: {$extension->type})",
                    LOG_INFO
                );
            } else {
                $messages = implode(', ', $extension->getMessages());
                SystemMessages::sysLogMsg(
                    __METHOD__,
                    "Failed to delete extension {$extension->number}: {$messages}",
                    LOG_WARNING
                );
            }
        }

        // Delete the user record (CASCADE should delete remaining references)
        if ($legacyUser->delete()) {
            echo "Removed legacy root user (id=1) and {$deletedExtensions} associated extension(s)\n";
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Successfully removed legacy root user (id=1) and {$deletedExtensions} extension(s)",
                LOG_INFO
            );
        } else {
            $messages = implode(', ', $legacyUser->getMessages());
            SystemMessages::sysLogMsg(
                __METHOD__,
                "Failed to delete legacy root user: {$messages}",
                LOG_ERR
            );
            echo "Warning: Could not remove legacy root user (id=1): {$messages}\n";
        }
    }
}