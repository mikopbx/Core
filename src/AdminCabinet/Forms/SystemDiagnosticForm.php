<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Form;

/**
 * Class SystemDiagnosticForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class SystemDiagnosticForm extends Form
{

    public function initialize(): void
    {
        // Filenames dropdown
        $filenames = new Select(
            'filenames', [], ['class'    => 'ui fluid selection search dropdown filenames-select']
        );

        $this->add($filenames);

        $this->add(new Text('filter', ['value' => '']));
        $this->add(new Numeric('lines',  ['value' => '500']));

    }
}