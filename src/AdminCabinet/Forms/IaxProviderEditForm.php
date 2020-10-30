<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;

/**
 * Class IaxProviderEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
class IaxProviderEditForm extends Form
{
    public function initialize($entity = null): void
    {
        // ProviderType
        $this->add(new Hidden('providerType', ['value' => 'IAX']));

        // Disabled
        $this->add(new Hidden('disabled'));

        // ID
        $this->add(new Hidden('id'));

        // Uniqid
        $this->add(new Hidden('uniqid'));

        // Type
        $this->add(new Hidden('type'));

        // Description
        $this->add(new Text('description'));

        // Username
        $this->add(new Text('username'));

        // Secret
        $this->add(new Password('secret'));

        // Host
        $this->add(new Text('host'));

        // Qualify
        $cheskarr = ['value' => null];
        if ($entity->qualify) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('qualify', $cheskarr));

        // Noregister
        $cheskarr = ['value' => null];
        if ($entity->noregister) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('noregister', $cheskarr));


        // Manualattributes
        $rows = max(round(strlen($entity->manualattributes) / 95), 2);
        $this->add(new TextArea('manualattributes', ["rows" => $rows]));
    }
}