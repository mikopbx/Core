<?php
namespace MikoPBX\AdminCabinet\Controllers;
use MikoPBX\AdminCabinet\Controllers\BaseController;
use MikoPBX\Common\Models\Users;

/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */



class UsersController extends BaseController {

    /**
     * Проверка на доступность емейл адреса
     */
    public function availableAction($email):void
    {
        $result = true;
        $extension = Users::findFirstByEmail($email);
        if ($extension) {
            $result = false;
        }
        $this->view->emailAvailable=$result;
    }

}