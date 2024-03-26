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

use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Select;


/**
 * Class DefaultIncomingRouteForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class DefaultIncomingRouteForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        foreach ($entity as $key => $value) {
            switch ($key) {
                case 'action' :
                {
                    $arrDefaultActions = [
                        IncomingRoutingTable::ACTION_BUSY       => $this->translation->_('ir_busy_signal'),
                        IncomingRoutingTable::ACTION_HANGUP     => $this->translation->_('ir_hangup'),
                        IncomingRoutingTable::ACTION_EXTENSION  => $this->translation->_('ir_extension'),
                        IncomingRoutingTable::ACTION_PLAYBACK   => $this->translation->_('ir_playback'),
                    ];

                    $defaultActions = new Select(
                        'action', $arrDefaultActions, [
                            'using' => [
                                'id',
                                'name',
                            ],
                            'useEmpty' => false,
                            'value' => $value,
                            'class' => 'ui selection dropdown defaultrouteselect',
                        ]
                    );
                    $this->add($defaultActions);
                    break;
                }
                case 'audio_message_id' :{
                    // Audio_message_id
                    $fileId = (string)$options['soundfiles'];
                    if(empty($fileId)){
                        $fileId = 'none';
                    }
                    $audioMessage = new Select(
                        'audio_message_id', $fileId, [
                                              'using' => [
                                                  'id',
                                                  'name',
                                              ],
                                              'useEmpty' => false,
                                              'class' => 'ui selection dropdown search audio-message-select',
                                          ]
                    );
                    $this->add($audioMessage);
                }
                case 'extension' :
                {
                    // Extension
                    $extension = new Select(
                        'extension', $options['extensions'], [
                            'using' => [
                                'id',
                                'name',
                            ],
                            'useEmpty' => true,
                            'value' => $value,
                            'class' => 'ui selection dropdown search forwarding-select',
                        ]
                    );
                    $this->add($extension);
                    break;
                }
                default:
                    $this->add(new Hidden($key));
            }
        }
    }
}