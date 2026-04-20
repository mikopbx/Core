<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\PBXCoreREST\Lib\Modules\GetAvailableModulesAction;
use Phalcon\Di\Injectable;

/**
 * Class CheckModulesUpdates
 *
 * Produces advice entries for:
 *   - new versions of already-installed modules (info, or warning for security),
 *   - security-type modules not yet installed (warning).
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckModulesUpdates extends Injectable
{
    private const string SECURITY_TYPE = 'security';

    /**
     * Check for module updates and uninstalled security patches.
     *
     * @return array<string, array<int, array<string, mixed>>>
     */
    public function process(): array
    {
        $messages = [];
        $res = GetAvailableModulesAction::main();

        if ($res->success === false) {
            return [];
        }

        $modulesFromServer = $res->data['modules'] ?? [];
        $modulesFromLocal = PbxExtensionModules::getModulesArray();

        $marketplaceBaseUrl = $this->url->get('pbx-extension-modules/index/');

        foreach ($modulesFromServer as $module) {
            $uniqid = (string)($module['uniqid'] ?? '');
            if ($uniqid === '') {
                continue;
            }
            $moduleType = (string)($module['module_type'] ?? 'general');
            $moduleUrl = $marketplaceBaseUrl . '?module=' . urlencode($uniqid) . '#/marketplace';
            $remoteVersion = (string)($module['version'] ?? '0.0.0');
            $name = (string)($module['name'] ?? $uniqid);

            if (isset($modulesFromLocal[$uniqid])) {
                // Installed — advise when a newer version is available.
                $localVersion = (string)($modulesFromLocal[$uniqid]['version'] ?? '0.0.0');
                if (version_compare($localVersion, $remoteVersion, '<')) {
                    $bucket = $moduleType === self::SECURITY_TYPE ? 'warning' : 'info';
                    $messages[$bucket][] = [
                        'messageTpl' => 'adv_AvailableNewVersionModule',
                        'messageParams' => [
                            'url' => $moduleUrl,
                            'ver' => $remoteVersion,
                            'module' => $name,
                            'currentVer' => $localVersion,
                            'module_type' => $moduleType,
                        ],
                    ];
                }
                continue;
            }

            // Not installed — surface security patches as warning-level advice.
            if ($moduleType === self::SECURITY_TYPE) {
                $messages['warning'][] = [
                    'messageTpl' => 'adv_SecurityPatchAvailable',
                    'messageParams' => [
                        'url' => $moduleUrl,
                        'module' => $name,
                        'ver' => $remoteVersion,
                        'module_type' => $moduleType,
                    ],
                ];
            }
        }

        return $messages;
    }
}
