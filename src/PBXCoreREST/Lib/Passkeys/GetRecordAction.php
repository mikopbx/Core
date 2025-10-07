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

namespace MikoPBX\PBXCoreREST\Lib\Passkeys;

use MikoPBX\Common\Models\UserPasskeys;
use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Passkeys\PasskeyDataStructure;

/**
 * Get Single Passkey Record Action
 *
 * @package MikoPBX\PBXCoreREST\Lib\Passkeys
 */
class GetRecordAction
{
    /**
     * Get single passkey by ID
     *
     * @param array $data Request data with 'id' field
     * @return PBXApiResult
     */
    public static function main(array $data): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;

        $id = $data['id'] ?? '';

        if (empty($id)) {
            $res->messages['error'][] = TranslationProvider::translate('pk_PasskeyIdRequired');
            return $res;
        }

        $passkey = UserPasskeys::findFirstById($id);

        if (!$passkey) {
            $res->messages['error'][] = TranslationProvider::translate('pk_PasskeyNotFound');
            return $res;
        }

        $res->data = PasskeyDataStructure::getRecord($passkey);
        $res->success = true;

        return $res;
    }
}
