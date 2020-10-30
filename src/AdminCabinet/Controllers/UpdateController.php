<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

class UpdateController extends BaseController
{

    /**
     * Обновление станции до нового релиза
     *
     */
    public function indexAction(): void
    {
        $this->view->submitMode = null;
    }
}