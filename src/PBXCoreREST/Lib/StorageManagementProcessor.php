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

namespace MikoPBX\PBXCoreREST\Lib;

use MikoPBX\Core\System\Storage;
use MikoPBX\PBXCoreREST\Lib\Storage\GetSettingsAction;
use MikoPBX\PBXCoreREST\Lib\Storage\GetUsageAction;
use MikoPBX\PBXCoreREST\Lib\Storage\UpdateSettingsAction;
use Phalcon\Di\Injectable;

/**
 * Available actions for Storage management
 */
enum StorageAction: string
{
    // Singleton standard methods
    case GET = 'get';
    case UPDATE = 'update';
    case PATCH = 'patch';

    // For singleton, getList returns the single resource
    case GET_LIST = 'getList';

    // Custom storage methods
    case USAGE = 'usage';
    case LIST = 'list';
    case MOUNT = 'mount';
    case UMOUNT = 'umount';
    case MKFS = 'mkfs';
    case STATUS_MKFS = 'statusMkfs';
}

/**
 * Storage management processor (Singleton resource)
 *
 * Handles all Storage management operations as a singleton resource
 * There's only one storage configuration in the system
 *
 * RESTful API mapping:
 * - GET /storage     -> get (retrieve current settings)
 * - PUT /storage     -> update (fully update settings)
 * - PATCH /storage   -> patch (partially update settings)
 * - GET /storage/usage -> usage (get storage usage statistics)
 *
 * @package MikoPBX\PBXCoreREST\Lib
 */
class StorageManagementProcessor extends Injectable
{
    /**
     * Processes Storage management requests with type-safe enum matching
     *
     * @param array<string, mixed> $request Request data with 'action' and 'data' fields
     * @return PBXApiResult API response object with success status and data
     */
    public static function callBack(array $request): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $actionString = '';
        if (isset($request['action'])) {
            if (is_string($request['action'])) {
                $actionString = $request['action'];
            } elseif (is_numeric($request['action'])) {
                $actionString = (string)$request['action'];
            }
        }

        /** @var array<string, mixed> $data */
        $data = isset($request['data']) && is_array($request['data']) ? $request['data'] : [];

        // Type-safe action matching with enum
        $action = StorageAction::tryFrom($actionString);

        if ($action === null) {
            $res->messages['error'][] = "Unknown action - $actionString in " . __CLASS__;
            $res->function = $actionString;
            return $res;
        }

        // Execute action using match expression (PHP 8)
        $res = match ($action) {
            StorageAction::GET, StorageAction::GET_LIST => GetSettingsAction::main(),
            StorageAction::UPDATE, StorageAction::PATCH => UpdateSettingsAction::main($data),
            StorageAction::USAGE => GetUsageAction::main(),
            StorageAction::LIST => self::getList(),
            StorageAction::MOUNT => self::mount($data),
            StorageAction::UMOUNT => self::umount($data),
            StorageAction::MKFS => self::mkfs($data),
            StorageAction::STATUS_MKFS => self::statusMkfs($data),
        };

        $res->function = $actionString;
        return $res;
    }

    /**
     * Get list of all storage devices
     *
     * @return PBXApiResult
     */
    private static function getList(): PBXApiResult
    {
        $res = new PBXApiResult();
        $st = new Storage();
        $res->success = true;
        $res->data = $st->getAllHdd();
        return $res;
    }

    /**
     * Mount a disk
     *
     * @param array<string, mixed> $data Request data
     * @return PBXApiResult
     */
    private static function mount(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $dev = '';
        $format = '';
        $dir = '';

        if (isset($data['dev'])) {
            if (is_string($data['dev'])) {
                $dev = $data['dev'];
            } elseif (is_numeric($data['dev'])) {
                $dev = (string)$data['dev'];
            }
        }

        if (isset($data['format'])) {
            if (is_string($data['format'])) {
                $format = $data['format'];
            } elseif (is_numeric($data['format'])) {
                $format = (string)$data['format'];
            }
        }

        if (isset($data['dir'])) {
            if (is_string($data['dir'])) {
                $dir = $data['dir'];
            } elseif (is_numeric($data['dir'])) {
                $dir = (string)$data['dir'];
            }
        }

        $res->success = Storage::mountDisk($dev, $format, $dir);
        return $res;
    }

    /**
     * Unmount a disk
     *
     * @param array<string, mixed> $data Request data
     * @return PBXApiResult
     */
    private static function umount(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $dir = '';

        if (isset($data['dir'])) {
            if (is_string($data['dir'])) {
                $dir = $data['dir'];
            } elseif (is_numeric($data['dir'])) {
                $dir = (string)$data['dir'];
            }
        }

        $res->success = Storage::umountDisk($dir);
        return $res;
    }

    /**
     * Format a disk
     *
     * @param array<string, mixed> $data Request data
     * @return PBXApiResult
     */
    private static function mkfs(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $dev = '';

        if (isset($data['dev'])) {
            if (is_string($data['dev'])) {
                $dev = $data['dev'];
            } elseif (is_numeric($data['dev'])) {
                $dev = (string)$data['dev'];
            }
        }

        $res->success = Storage::mkfsDisk($dev);
        if ($res->success) {
            $res->data['status'] = 'inprogress';
        }
        return $res;
    }

    /**
     * Get status of disk formatting
     *
     * @param array<string, mixed> $data Request data
     * @return PBXApiResult
     */
    private static function statusMkfs(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->success = true;
        $dev = '';

        if (isset($data['dev'])) {
            if (is_string($data['dev'])) {
                $dev = $data['dev'];
            } elseif (is_numeric($data['dev'])) {
                $dev = (string)$data['dev'];
            }
        }

        $res->data['status'] = Storage::statusMkfs($dev);
        return $res;
    }
}
