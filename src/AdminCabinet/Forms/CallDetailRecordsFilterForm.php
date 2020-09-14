<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Form;

/**
 * Class CallDetailRecordsFilterForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class CallDetailRecordsFilterForm extends Form
{

    public function initialize(/** @scrutinizer ignore-unused */ $entity = null, $options = null): void
    {
        $this->add(
            new Text(
                'extension',
                ['value' => $options['extension']]
            )
        );
        $this->add(
            new Text(
                'date_from',
                ['value' => $options['date_from']]
            )
        );
        $this->add(new Text('date_to', ['value' => $options['date_to']]));
    }
}