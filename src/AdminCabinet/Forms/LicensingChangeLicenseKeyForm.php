<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Form;

/**
 * Class LicensingChangeLicenseKeyForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class LicensingChangeLicenseKeyForm extends Form
{

    public function initialize(/** @scrutinizer ignore-unused */ $entity = null, $options = null): void
    {
        $this->add(new Text('licKey', ["value" => $options['licKey']]));
    }
}