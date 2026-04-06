<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\AdminCabinet\Forms\Elements\SemanticUIDropdown;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Text;

/**
 * Class CallQueueEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class CallQueueEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        // Entity is not used anymore - all data comes from REST API
        parent::initialize(null, $options);

        // ID
        $this->add(new Hidden('id'));

        // Name
        $this->add(new Text('name'));

        // Uniqid
        $this->add(new Hidden('uniqid'));

        // Extension
        $this->add(new Text('extension'));


        // Strategy - static dropdown with PHP rendering
        $this->addSemanticUIDropdown(
            'strategy',
            [
                'ringall' => $this->translation->_('cq_ringall'),
                'leastrecent' => $this->translation->_('cq_leastrecent'),
                'fewestcalls' => $this->translation->_('cq_fewestcalls'),
                'random' => $this->translation->_('cq_random'),
                'rrmemory' => $this->translation->_('cq_rrmemory'),
                'linear' => $this->translation->_('cq_linear')
            ],
            'ringall', // Default value, actual value will come from REST API
            [
                'clearable' => false,
                'forceSelection' => true
            ]
        );


        // Seconds_to_ring_each_member - Seconds between announcements
        $this->add(new Numeric('seconds_to_ring_each_member', ["maxlength" => 2, "style" => "width: 80px;"]));

        // Secondsforwrapup - Seconds for Wrap Up
        $this->add(new Numeric('seconds_for_wrapup', ["maxlength" => 2, "style" => "width: 80px;"]));

        // Recivecallswhileonacall
        $this->addCheckBox('recive_calls_while_on_a_call', false, true);

        // Callerhear
        $arrActions = [
            ['value' => 'ringing', 'text' => $this->translation->_('cq_ringing')],
            ['value' => 'moh', 'text' => $this->translation->_('cq_moh')],
        ];

        $callerhear = new SemanticUIDropdown(
            'caller_hear',
            $arrActions,
            [
                'placeholder' => '',
                'class' => 'ui selection dropdown callerhearselect',
            ]
        );
        $this->add($callerhear);

        // Announceposition
        $this->addCheckBox('announce_position', false, true);

        // Announceholdtime
        $this->addCheckBox('announce_hold_time', false, true);

        $this->add(new Hidden('periodic_announce_sound_id', [
            'id' => 'periodic_announce_sound_id'
        ]));

        $this->add(new Hidden('moh_sound_id', [
            'id' => 'moh_sound_id'
        ]));

        // Periodicannouncefrequency - Seconds between announcements
        $this->add(new Numeric('periodic_announce_frequency', ["maxlength" => 2, "style" => "width: 80px;"]));

        // Timeouttoredirecttoextension
        $this->add(
            new Numeric(
                'timeout_to_redirect_to_extension',
                [
                    "maxlength" => 2,
                    "style" => "width: 80px;",
                    "value" => 30,
                ]
            )
        );

        // Timeoutextension - hidden field, dropdown managed by JavaScript
        $this->add(new Hidden('timeout_extension'));

        // Redirecttoextensionifempty - hidden field, dropdown managed by JavaScript
        $this->add(new Hidden('redirect_to_extension_if_empty'));

        // Hidden fields for database compatibility (not displayed in UI)
        $this->add(new Hidden('number_unanswered_calls_to_redirect'));
        $this->add(new Hidden('redirect_to_extension_if_unanswered'));
        $this->add(new Hidden('number_repeat_unanswered_to_redirect'));
        $this->add(new Hidden('redirect_to_extension_if_repeat_exceeded'));

        // Caller ID prefix
        $this->add(new Text('callerid_prefix'));

        // Description
        $this->addTextArea('description', '', 65); // Default empty, actual value will come from REST API
    }
}
