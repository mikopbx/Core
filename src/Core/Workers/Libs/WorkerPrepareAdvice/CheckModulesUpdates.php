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
 * Produces advice entries for newer versions of already-installed modules:
 *   - security patch (warning, red banner) when the installed version is below
 *     the release server's `minSecureVersion` for that module,
 *   - regular new version (info, bell only) otherwise.
 *
 * `minSecureVersion` is the highest module release flagged as a security fix on
 * the release server. Because getAvailableModules returns only the latest
 * release per module (and never receives the client's installed version), the
 * server cannot do the version-aware gating itself — it just publishes the
 * threshold and the client compares its local version against it. This keeps the
 * security banner alive for users still behind the fix even after a later
 * non-security release ships, and auto-expires it for users already at or above
 * the fix (no false alarms).
 *
 * @package MikoPBX\Core\Workers\Libs\WorkerPrepareAdvice
 */
class CheckModulesUpdates extends Injectable
{
    /**
     * Check for module updates and security patches of installed modules.
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
            if ($uniqid === '' || !isset($modulesFromLocal[$uniqid])) {
                // Only advise about modules that are actually installed.
                continue;
            }

            $remoteVersion = (string)($module['version'] ?? '0.0.0');
            $localVersion = (string)($modulesFromLocal[$uniqid]['version'] ?? '0.0.0');
            if (!version_compare($localVersion, $remoteVersion, '<')) {
                // Already up to date.
                continue;
            }

            $name = (string)($module['name'] ?? $uniqid);
            $moduleUrl = $marketplaceBaseUrl . '?module=' . urlencode($uniqid) . '#/marketplace';

            // Security patch: installed version is below the latest security fix.
            $minSecureVersion = (string)($module['minSecureVersion'] ?? '');
            $isSecurity = $minSecureVersion !== ''
                && version_compare($localVersion, $minSecureVersion, '<');

            if ($isSecurity) {
                $messages['warning'][] = [
                    'messageTpl' => 'adv_SecurityPatchAvailable',
                    'messageParams' => [
                        'url' => $moduleUrl,
                        'module' => $name,
                        'ver' => $remoteVersion,
                        'currentVer' => $localVersion,
                    ],
                ];
            } else {
                $messages['info'][] = [
                    'messageTpl' => 'adv_AvailableNewVersionModule',
                    'messageParams' => [
                        'url' => $moduleUrl,
                        'ver' => $remoteVersion,
                        'module' => $name,
                        'currentVer' => $localVersion,
                    ],
                ];
            }
        }

        return $messages;
    }
}
