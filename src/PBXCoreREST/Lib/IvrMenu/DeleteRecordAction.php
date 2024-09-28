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

namespace MikoPBX\PBXCoreREST\Lib\IvrMenu;

use MikoPBX\Common\Models\IvrMenu;
use MikoPBX\Common\Providers\MainDatabaseProvider;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;
use Phalcon\Di\Injectable;

/**
 *  Class DeleteRecord
 *  Delete an ivr menu and all its dependencies including actions.
 *
 * @package MikoPBX\PBXCoreREST\Lib\IvrMenu
 */
class DeleteRecordAction extends Injectable
{

    /**
     * Deletes the ivr menu record with its dependent tables.
     *
     * @param string $id The ID of the queue to be deleted.
     * @return PBXApiResult Result of the delete operation.
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        $res->success = true;

        $di = Di::getDefault();
        $db = $di->get(MainDatabaseProvider::SERVICE_NAME);

        // Find the queue by ID
        $record = IvrMenu::findFirstByUniqid($id);
        if ($record===null){
            $res->messages['error'][] = 'IvrMenu with id '.$id.' does not exist';
            $res->success = false;
            return  $res;
        }

        $db->begin();

        // Delete associated extensions
        $extension = $record->Extensions;
        if ($extension!==null && !$extension->delete()) {
            $res->messages['error'][] = implode(PHP_EOL, $extension->getMessages());
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