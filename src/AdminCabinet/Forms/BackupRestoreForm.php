<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */
namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\File;
use Phalcon\Forms\Form;


class BackupRestoreForm extends Form
{

    public function initialize($entity = null, $options = null)
    {
        $this->add(new File('restore-file'));
    }
}