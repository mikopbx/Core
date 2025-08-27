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

namespace MikoPBX\PBXCoreREST\Lib\AsteriskManagers;

use MikoPBX\Common\Models\AsteriskManagerUsers;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractSaveRecordAction;
use MikoPBX\Core\System\Util;

/**
 * Save Asterisk manager record action.
 *
 * @package MikoPBX\PBXCoreREST\Lib\AsteriskManagers
 */
class SaveRecordAction extends AbstractSaveRecordAction
{
    /**
     * Save (create or update) Asterisk manager.
     *
     * @param array $data Manager data
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = self::createApiResult(__METHOD__);

        // Define sanitization rules
        $sanitizationRules = [
            'id' => 'int',
            'username' => 'string|sanitize|max:32',
            'secret' => 'string|max:64',
            'description' => 'string|sanitize|max:255|empty_to_null',
            'networkfilterid' => 'string|max:64|empty_to_null',
            'permissions' => 'array',
            'call_limit' => 'int',
        ];
        
        // Text fields for unified processing
        $textFields = ['username', 'description'];

        try {
            // Sanitize input data
            $sanitizedData = self::sanitizeInputData($data, $sanitizationRules, $textFields);
            
            // Validate required fields
            $validationErrors = self::validateRequiredFields(
                $sanitizedData,
                ['username' => [['type' => 'required', 'message' => 'Username is required']]]
            );
            
            if (!empty($validationErrors)) {
                $res->messages['error'] = $validationErrors;
                return $res;
            }

            // Find existing or create new
            if (!empty($sanitizedData['id'])) {
                $manager = AsteriskManagerUsers::findFirstById($sanitizedData['id']);
                if (!$manager) {
                    $res->messages['error'][] = "Manager with ID {$sanitizedData['id']} not found";
                    return $res;
                }
            } else {
                $manager = new AsteriskManagerUsers();
                $manager->uniqid = strtoupper('AMI-' . md5(time() . $sanitizedData['username']));
            }

            // Check for duplicate username
            if (!self::checkUsernameUniqueness($sanitizedData['username'], $manager->id)) {
                $res->messages['error'][] = "Manager with username '{$sanitizedData['username']}' already exists";
                return $res;
            }

            // Save in transaction
            $savedManager = self::executeInTransaction(function() use ($manager, $sanitizedData) {
                // Update fields
                $manager->username = $sanitizedData['username'];
                
                // Only update password if provided
                if (!empty($sanitizedData['secret'])) {
                    $manager->secret = $sanitizedData['secret'];
                } elseif (empty($manager->secret)) {
                    // Generate password for new manager if not provided
                    $manager->secret = Util::generateRandomString(16);
                }

                // Process permissions
                self::processPermissions($manager, $sanitizedData['permissions'] ?? []);
                
                // Process network filter
                self::processNetworkFilter($manager, $sanitizedData);

                // Set other fields
                $manager->description = $sanitizedData['description'] ?? '';
                $manager->call_limit = (int)($sanitizedData['call_limit'] ?? 0);

                // Save manager
                if (!$manager->save()) {
                    throw new \Exception('Failed to save manager: ' . implode(', ', $manager->getMessages()));
                }
                
                return $manager;
            });

            // Reload manager configuration
            self::reloadAsteriskManager();

            $res->success = true;
            $res->data = DataStructure::createFromModel($savedManager);
            
            // Only set reload for new records
            if (empty($sanitizedData['id'])) {
                $res->reload = "asterisk-managers/modify/{$savedManager->id}";
            }
            
        } catch (\Exception $e) {
            return self::handleError($e, $res);
        }

        return $res;
    }
    
    /**
     * Check username uniqueness.
     *
     * @param string $username Username to check
     * @param int|null $currentId Current manager ID (for updates)
     * @return bool True if username is unique
     */
    private static function checkUsernameUniqueness(string $username, ?int $currentId = null): bool
    {
        $existingManager = AsteriskManagerUsers::findFirst([
            'conditions' => 'username = :username: AND id != :id:',
            'bind' => [
                'username' => $username,
                'id' => $currentId ?? 0,
            ],
        ]);
        
        return $existingManager === null;
    }
    
    /**
     * Process permissions from request data.
     *
     * @param AsteriskManagerUsers $manager Manager model
     * @param array $permissions Permissions data from request
     */
    private static function processPermissions(AsteriskManagerUsers $manager, array $permissions): void
    {
        $availablePermissions = [
            'call', 'cdr', 'originate', 'reporting', 'agent', 'config', 
            'dialplan', 'dtmf', 'log', 'system', 'user', 'verbose', 'command'
        ];
        
        if (!empty($permissions)) {
            // New format with boolean fields
            foreach ($availablePermissions as $perm) {
                // Handle both boolean and string values from JavaScript
                $readKey = $perm . '_read';
                $writeKey = $perm . '_write';
                
                // Build permission value: 'read', 'write', 'read,write', or ''
                $permValue = [];
                
                if (isset($permissions[$readKey])) {
                    $readValue = $permissions[$readKey];
                    if ($readValue === true || $readValue === 'true' || $readValue === 1 || $readValue === '1') {
                        $permValue[] = 'read';
                    }
                }
                
                if (isset($permissions[$writeKey])) {
                    $writeValue = $permissions[$writeKey];
                    if ($writeValue === true || $writeValue === 'true' || $writeValue === 1 || $writeValue === '1') {
                        $permValue[] = 'write';
                    }
                }
                
                // Set the permission field in the model
                $manager->$perm = implode(',', $permValue);
            }
        } else {
            // Clear all permissions if not provided
            foreach ($availablePermissions as $perm) {
                $manager->$perm = '';
            }
        }
    }
    
    /**
     * Process network filter settings.
     *
     * @param AsteriskManagerUsers $manager Manager model
     * @param array $data Request data
     */
    private static function processNetworkFilter(AsteriskManagerUsers $manager, array $data): void
    {
        if (!empty($data['networkfilterid'])) {
            $manager->networkfilterid = $data['networkfilterid'];
            
            // Get permit/deny from network filter
            $filter = NetworkFilters::findFirstById($data['networkfilterid']);
            if ($filter) {
                $manager->permit = $filter->permit;
                $manager->deny = $filter->deny;
            }
        } else {
            $manager->networkfilterid = null;
            $manager->permit = $data['permit'] ?? '127.0.0.1/255.255.255.255';
            $manager->deny = $data['deny'] ?? '0.0.0.0/0.0.0.0';
        }
    }

    /**
     * Reload Asterisk manager configuration.
     */
    private static function reloadAsteriskManager(): void
    {
        // Send signal to reload manager configuration
        $di = \Phalcon\Di\Di::getDefault();
        if ($di && $di->has('beanstalkConnectionWorkers')) {
            $queue = $di->get('beanstalkConnectionWorkers');
            $queue->publish(
                json_encode(['action' => 'reload', 'module' => 'manager']),
                'worker_reload_manager'
            );
        }
    }
}