<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

namespace MikoPBX\AdminCabinet\Controllers;
use MikoPBX\AdminCabinet\Forms\SystemDiagnosticForm;

class SystemDiagnosticController extends BaseController
{

    public function indexAction(): void
    {
        $this->view->form     = new SystemDiagnosticForm();
    }


}