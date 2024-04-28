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

namespace MikoPBX\PBXCoreREST\Lib\Extensions;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Providers\MainDatabaseProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di;

/**
 *  Class DeleteRecord
 *  Delete an internal number and all its dependencies including mobile and forwarding settings.
 *
 * @package MikoPBX\PBXCoreREST\Lib\Extensions
 */
class DeleteRecordAction extends \Phalcon\Di\Injectable
{

    /**
     * Deletes the extension record with its dependent tables.
     *
     * @param string $id ID of the extension to be deleted.
     * @return PBXApiResult Result of the delete operation.
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        $di = Di::getDefault();
        $db = $di->get(MainDatabaseProvider::SERVICE_NAME);

        $extension = Extensions::findFirstById($id);
        if ($extension===null){
            $res->messages['error'][] = 'Extension with id '.$id.' does not exist';
            $res->success = false;
            return  $res;
        }

        $db->begin();

        // To avoid circular references, we first delete the forwarding settings
        // for this account, as it may refer to itself.
        $forwardingRights = $extension->ExtensionForwardingRights;
        if ($forwardingRights!==null && !$forwardingRights->delete()) {
            $res->messages['error'][] = implode(PHP_EOL,$forwardingRights->getMessages());
            $res->success = false;
        }

        // Delete User
        $user = $extension->Users;
        if ($user !==null && !$user->delete()) {
            $res->messages['error'][] = implode(PHP_EOL, $user->getMessages());
            $res->success = false;
        }

        if (!$res->success) {
            $db->rollback();
        } else {
            $db->commit();
        }

        $res->data['id'] = $id;
        return $res;
    }

}