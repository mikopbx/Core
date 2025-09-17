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

namespace MikoPBX\PBXCoreREST\Lib\Firewall;

use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use Phalcon\Di\Di;

/**
 * Class DeleteRecordAction
 * 
 * Deletes a firewall rule (NetworkFilter and associated FirewallRules are cascade deleted).
 *
 * @package MikoPBX\PBXCoreREST\Lib\Firewall
 */
class DeleteRecordAction
{
    /**
     * Delete a firewall rule by ID
     *
     * @param string $id NetworkFilter ID
     * @return PBXApiResult The result of the delete operation
     */
    public static function main(string $id): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        $di = Di::getDefault();
        $db = $di->get('db');
        
        try {
            if (empty($id)) {
                $res->messages['error'][] = 'ID is required';
                $res->success = false;
                return $res;
            }
            
            $networkFilter = NetworkFilters::findFirstById($id);
            if (!$networkFilter) {
                $res->messages['error'][] = "Firewall rule with ID '$id' not found";
                $res->success = false;
                return $res;
            }
            
            $db->begin();
            
            // Delete the NetworkFilter (FirewallRules will be cascade deleted)
            if (!$networkFilter->delete()) {
                $errors = $networkFilter->getMessages();
                foreach ($errors as $error) {
                    $res->messages['error'][] = $error->getMessage();
                }
                $db->rollback();
                $res->success = false;
                return $res;
            }
            
            $db->commit();
            
            // Firewall will be reloaded automatically by model events
            
            $res->data = ['id' => $id];
            $res->messages['info'][] = "Firewall rule with ID '$id' has been deleted";
            $res->success = true;
        } catch (\Exception $e) {
            $db->rollback();
            $res->messages['error'][] = $e->getMessage();
            $res->success = false;
        }
        
        return $res;
    }
}