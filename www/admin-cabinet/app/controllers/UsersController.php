<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

use \Models\Users;

class UsersController extends BaseController {

    /**
     * Проверка на доступность емейл адреса
     */
    public function availableAction($email){
        $result = true;
        $extension = Users::findFirstByEmail($email);
        if ($extension) {
            $result = false;
        }
        $this->view->emailAvailable=$result;
    }

}