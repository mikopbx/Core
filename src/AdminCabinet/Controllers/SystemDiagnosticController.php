<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

namespace MikoPBX\AdminCabinet\Controllers;
use MikoPBX\AdminCabinet\Forms\SystemDiagnosticForm;
use MikoPBX\PBXCoreREST\Lib\FilesManagementProcessor;

class SystemDiagnosticController extends BaseController
{

    public function indexAction(): void
    {

        $this->view->form     = new SystemDiagnosticForm();

        $fileData = FilesManagementProcessor::getLogFromFile(SystemDiagnosticForm::DEFAULT_FILENAME);
        if($fileData->success){
            $this->view->content  = file_get_contents($fileData->data[0]);
        }
    }


}