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

namespace MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice;

use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\PBXCoreREST\Lib\Modules\GetAvailableModulesAction;
use Phalcon\Di\Injectable;

/**
 * Class CheckModulesUpdates
 * This class is responsible for checking modules updates.
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckModulesUpdates extends Injectable
{
    /**
     * Check for a new version PBX
     *
     * @return array An array containing information messages about available updates.
     *
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

        foreach ($modulesFromServer as $module) {
            if (isset($modulesFromLocal[$module['uniqid']])) {
                $moduleFromLocal = $modulesFromLocal[$module['uniqid']];
                $localVersion = $moduleFromLocal['version'] ?? '0.0.0';
                $remoteVersion = $module['version'] ?? '0.0.0';
                if (version_compare($localVersion, $remoteVersion, '<')) {
                    $messages['info'][] = [
                        'messageTpl' => 'adv_AvailableNewVersionModule',
                        'messageParams' => [
                            'url' => $this->url->get('pbx-extension-modules/index/') . '?module=' . urlencode($module['uniqid']) . '#/marketplace',
                            'ver' => $remoteVersion,
                            'module' => $module['name'],
                            'currentVer' => $localVersion,
                        ]
                    ];
                }
            }
        }
        return $messages;
    }
}
