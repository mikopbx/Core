<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */
namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Email;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Form;


class LicensingGetTrialForm extends Form
{

    public function initialize($entity = null, $options = null): void
    {
        $this->add(new Text('companyname'));
        $this->add(new Email('email'));
        $this->add(new Text('contact'));
        $this->add(new Numeric('inn'));
        $this->add(new Text('telefone'));
    }
}