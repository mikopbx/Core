<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\AdminCabinet\Forms;

use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;

/**
 * Class SipProviderEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class SipProviderEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // ProviderType
        $this->add(new Hidden('providerType', ['value' => 'SIP']));

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
        $this->add(new Password('secret', [
            'autocomplete' => 'new-password',
            'data-no-password-manager' => 'true'
        ]));

        // Host
        $this->add(new Text('host'));

        // DTMF Mode - will be replaced with dropdown in JavaScript
        $this->add(new Hidden('dtmfmode', ['value' => $entity->dtmfmode ?? 'auto']));

        // Registration type - will be replaced with dropdown in JavaScript
        $this->add(new Hidden('registration_type', ['value' => $entity->registration_type ?? 'outbound']));

        // Transport protocol - will be replaced with dropdown in JavaScript
        $this->add(new Hidden('transport', ['value' => $entity->transport ?? 'UDP']));

        // Port
        $this->add(new Numeric('port'));
        $this->add(new Text('outbound_proxy'));

        // Qualify
        $this->addCheckBox('qualify', intval($entity->qualify) === 1);

        // Qualifyfreq
        $this->add(new Numeric('qualifyfreq', ["maxlength" => 3,
            "style" => "width: 80px;"]));

        // Fromuser
        $this->add(new Text('fromuser', [
            'placeholder' => $this->translation->_('pr_FromUserPlaceholder')
        ]));

        // Fromdomain
        $this->add(new Text('fromdomain', [
            'placeholder' => $this->translation->_('pr_FromDomainPlaceholder')
        ]));

        // Noregister
        $cheskarr = ['value' => null];
        if ($entity->noregister) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check('noregister', $cheskarr));

        // Disablefromuser
        $this->addCheckBox('disablefromuser', intval($entity->disablefromuser) === 1);

        // Receive_calls_without_auth
        $this->addCheckBox('receive_calls_without_auth', intval($entity->receive_calls_without_auth) === 1);

        // Network Filter - Changed from Select to Hidden
        // Network filter dropdown - empty select, will be populated via REST API
        $networkfilterid = new Select(
            'networkfilterid',
            [],
            [
                'useEmpty' => false,
                'value' => $entity->networkfilterid ?? 'none',
                'class' => 'ui selection dropdown search network-filter-select',
            ]
        );
        $this->add($networkfilterid);

        // Manualattributes
        $placeholderText = "[registration-auth]\nusername=962xxxxx030@ip.beeline.ru\n\n[endpoint-auth]\nusername=962xxxxx030@ip.beeline.ru";
        $this->addTextArea('manualattributes', $entity->getManualAttributes() ?? '', 65, [
            'placeholder' => $placeholderText
        ]);

        // Note
        $this->addTextArea('note', $options['note'] ?? '', 80, ['class' => 'confidential-field']);
    }
}