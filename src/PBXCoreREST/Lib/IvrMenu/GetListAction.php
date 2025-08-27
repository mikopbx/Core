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
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;

/**
 * Action for getting list of all IVR menus
 * 
 * @api {get} /pbxcore/api/v2/ivr-menu/getList Get all IVR menus
 * @apiVersion 2.0.0
 * @apiName GetList
 * @apiGroup IvrMenu
 * 
 * @apiSuccess {Boolean} result Operation result
 * @apiSuccess {Array} data Array of IVR menus
 * @apiSuccess {String} data.id Record ID
 * @apiSuccess {String} data.uniqid Unique identifier
 * @apiSuccess {String} data.extension Extension number
 * @apiSuccess {String} data.name IVR menu name
 * @apiSuccess {String} data.description IVR menu description
 * @apiSuccess {String} data.represent Display representation of IVR menu (name + extension)
 * @apiSuccess {String} data.timeoutExtensionRepresent Timeout extension representation
 * @apiSuccess {Array} data.actions Array of menu actions with digits and extensions
 */
class GetListAction
{
    /**
     * Get list of all IVR menus
     * 
     * @param array $data - Filter parameters (not used yet)
     * @return PBXApiResult
     */
    public static function main(array $data = []): PBXApiResult
    {
        $res = new PBXApiResult();
        $res->processor = __METHOD__;
        
        try {
            // Get all IVR menus sorted by name
            $ivrMenus = IvrMenu::find([
                'order' => 'name ASC'
            ]);
            
            $data = [];
            foreach ($ivrMenus->toArray() as $menuData) {
                $ivrMenu = new IvrMenu();
                $ivrMenu->assign($menuData);
                $data[] = DataStructure::createForList($ivrMenu);
            }
            
            $res->data = $data;
            $res->success = true;
        } catch (\Exception $e) {
            $res->messages['error'][] = $e->getMessage();
        }
        
        return $res;
    }
}