<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Form;

/**
 * Class LicensingGetKeyForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class LicensingGetKeyForm extends Form
{
    public function initialize(): void
    {
        $this->add(new Text('companyname'));
        $this->add(new Text('email'));
        $this->add(new Text('contact'));
        $this->add(new Numeric('inn'));
        $this->add(new Text('telefone'));
    }
}