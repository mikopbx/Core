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

use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Select;
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
        parent::initialize($entity, $options);

        // ID
        $this->add(new Hidden('id'));

        // Name
        $this->add(new Text('name'));

        // Uniqid
        $this->add(new Hidden('uniqid'));

        // Extension
        $this->add(new Text('extension'));


        // Strategy
        $arrActions = [
            'ringall' => $this->translation->_('cq_ringall'),
            'leastrecent' => $this->translation->_('cq_leastrecent'),
            'fewestcalls' => $this->translation->_('cq_fewestcalls'),
            'random' => $this->translation->_('cq_random'),
            'rrmemory' => $this->translation->_('cq_rrmemory'),
            'linear' => $this->translation->_('cq_linear'),
        ];

        $strategy = new Select(
            'strategy', $arrActions, [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'defaultValue' => "ringall",
                'class' => 'ui selection dropdown strategyselect',
            ]
        );
        $this->add($strategy);


        // Seconds_to_ring_each_member - Seconds between announcements
        $this->add(new Numeric('seconds_to_ring_each_member', ["maxlength" => 2, "style" => "width: 80px;"]));

        // Secondsforwrapup - Seconds for Wrap Up
        $this->add(new Numeric('seconds_for_wrapup', ["maxlength" => 2, "style" => "width: 80px;"]));

        // Recivecallswhileonacall
        $cheskarr = ['value' => null];
        if ($entity->recive_calls_while_on_a_call) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('recive_calls_while_on_a_call', $cheskarr));

        // Callerhear
        $arrActions = [
            'ringing' => $this->translation->_('cq_ringing'),
            'moh' => $this->translation->_('cq_moh'),
        ];

        $callerhear = new Select(
            'caller_hear', $arrActions, [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'class' => 'ui selection dropdown callerhearselect',
            ]
        );
        $this->add($callerhear);

        // Announceposition
        $cheskarr = ['value' => null];
        if ($entity->announce_position) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('announce_position', $cheskarr));

        // Announceholdtime
        $cheskarr = ['value' => null];
        if ($entity->announce_hold_time) {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }

        $this->add(new Check('announce_hold_time', $cheskarr));


        $periodicannouncesoundid = new Select(
            'periodic_announce_sound_id', $options['soundfiles'], [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => true,
                'class' => 'ui selection dropdown search periodic-announce-sound-id-select',
            ]
        );
        $this->add($periodicannouncesoundid);

        $periodicannouncesoundid = new Select(
            'moh_sound_id', $options['mohSoundFiles'], [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => true,
                'class' => 'ui selection dropdown search periodic-announce-sound-id-select',
            ]
        );
        $this->add($periodicannouncesoundid);

        // Periodicannouncefrequency - Seconds between announcements
        $this->add(new Numeric('periodic_announce_frequency', ["maxlength" => 2, "style" => "width: 80px;"]));

        // Timeouttoredirecttoextension
        $ringlength = $entity->timeout_to_redirect_to_extension;
        $this->add(
            new Numeric(
                'timeout_to_redirect_to_extension',
                [
                    "maxlength" => 2,
                    "style" => "width: 80px;",
                    "value" => ($ringlength > 0) ? $ringlength : '',
                ]
            )
        );

        // Timeoutextension
        $extension = new Select(
            'timeout_extension', $options['extensions'], [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => true,
                'class' => 'ui selection dropdown search forwarding-select',
            ]
        );
        $this->add($extension);

        // Redirecttoextensionifempty
        $extension = new Select(
            'redirect_to_extension_if_empty', $options['extensions'], [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => true,
                'class' => 'ui selection dropdown search forwarding-select',
            ]
        );
        $this->add($extension);

        // Numberunansweredcallstoredirect
        $ringlength = $entity->number_unanswered_calls_to_redirect;
        $this->add(
            new Numeric(
                'number_unanswered_calls_to_redirect',
                [
                    "maxlength" => 2,
                    "style" => "width: 80px;",
                    "value" => ($ringlength > 0) ? $ringlength : '',
                ]
            )
        );

        // Redirecttoextensionifunanswered
        $extension = new Select(
            'redirect_to_extension_if_unanswered', $options['extensions'], [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => true,
                'class' => 'ui selection dropdown search forwarding-select',
            ]
        );
        $this->add($extension);

        // Numberrepeatunansweredtoredirect
        $ringlength = $entity->number_repeat_unanswered_to_redirect;
        $this->add(
            new Numeric(
                'number_repeat_unanswered_to_redirect',
                [
                    "maxlength" => 2,
                    "style" => "width: 80px;",
                    "value" => ($ringlength > 0) ? $ringlength : '',
                ]
            )
        );

        // Redirecttoextensionifrepeatexceeded
        $extension = new Select(
            'redirect_to_extension_if_repeat_exceeded', $options['extensions'], [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => true,
                'class' => 'ui selection dropdown search forwarding-select',
            ]
        );
        $this->add($extension);

        // Caller ID prefix
        $this->add(new Text('callerid_prefix'));

        // Description
        $this->addTextArea('description', $entity->description??'', 65);
    }
}