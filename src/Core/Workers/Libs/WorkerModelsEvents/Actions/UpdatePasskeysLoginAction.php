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

namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\UserPasskeys;

/**
 * Update UserPasskeys login when admin login changes
 *
 * When WEB_ADMIN_LOGIN changes, all passkeys for the old admin login
 * must be updated to use the new login.
 */
class UpdatePasskeysLoginAction implements ReloadActionInterface
{
    /**
     * Update passkeys login when admin login changes
     *
     * @param array $parameters Contains changedFields with old and new values
     * @return void
     */
    public function execute(array $parameters = []): void
    {
        // Extract parameters - can be array of multiple change sets
        foreach ($parameters as $changeData) {
            // Skip if this is not WEB_ADMIN_LOGIN setting
            if (!isset($changeData['recordId']) || $changeData['recordId'] !== PbxSettings::WEB_ADMIN_LOGIN) {
                continue;
            }

            // Extract old and new values from changedFields
            $changedFields = $changeData['changedFields'] ?? [];
            if (!isset($changedFields['value']['old']) || !isset($changedFields['value']['new'])) {
                continue;
            }

            $oldLogin = $changedFields['value']['old'];
            $newLogin = $changedFields['value']['new'];

            // Skip if values are the same
            if ($oldLogin === $newLogin || empty($oldLogin)) {
                continue;
            }

            // Find all passkeys for previous admin login
            $passkeys = UserPasskeys::find([
                'conditions' => 'login = :oldLogin:',
                'bind' => ['oldLogin' => $oldLogin]
            ]);

            // Update all passkeys to new login
            if (count($passkeys) > 0) {
                /** @var UserPasskeys $passkey */
                foreach ($passkeys as $passkey) {
                    $passkey->login = $newLogin;
                    $passkey->save();
                }
            }
        }
    }
}
