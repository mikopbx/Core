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

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\Providers;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;

/**
 * Class IncomingRouteEditForm
 * This class is responsible for creating the form used for editing incoming routes.
 * It extends from BaseForm to inherit common form functionality.
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class IncomingRouteEditForm extends BaseForm
{
    /**
     * Initialize the form elements
     *
     * @param mixed $entity The entity for which the form is being initialized.
     * @param mixed $options Additional options that may be needed.
     */
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // Add hidden field for ID
        $this->add(new Hidden('id'));

        // Add hidden field for Priority
        $this->add(new Hidden('priority'));

        // Add hidden field for Action, default value is 'extension'
        $this->add(new Hidden('action', ['value' => 'extension']));

        // Add text field for Rule Name
        $this->add(new Text('rulename'));

        // Add text field for Number
        $this->add(new Text('number'));

        // Add text area for Note
        $this->addTextArea('note', $entity->note ?? '', 65);

        // Add numeric field for Timeout with some styling
        $this->add(new Numeric('timeout', ['maxlength' => 3, 'style' => 'width: 80px;', 'defaultValue' => 120]));

        // Add select dropdown for Providers
        $providers = new Select(
            'provider', $this->prepareProviders(), [
                'using' => ['id', 'name'],
                'useEmpty' => false,
                'class' => 'ui selection dropdown provider-select',
            ]
        );
        $this->add($providers);

        // Add select dropdown for Extension
        $extension = new Select(
            'extension', $this->prepareForwardingExtensions($entity->extension ?? ''), [
                'using' => [
                    'id',
                    'name',
                ],
                'useEmpty' => false,
                'class' => 'ui selection dropdown search forwarding-select',
            ]
        );
        $this->add($extension);

        // Audio_message_id
        $audioMessage = new Select(
            'audio_message_id', $options['soundfiles'], [
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

    /**
     * Prepare Providers
     *
     * Generate a list of providers for the select dropdown
     *
     * @return array The list of providers
     */
    private function prepareProviders(): array
    {
        // Initialize an empty array to hold the list of providers
        $providersList = [];

        // Add a "none" option for any provider
        $providersList['none'] = $this->translation->_('ir_AnyProvider_v2');

        // Fetch all providers from the database
        $providers = Providers::find();

        // Loop through each provider to populate the providers list
        foreach ($providers as $provider) {
            $modelType = ucfirst($provider->type);
            $provByType = $provider->$modelType;
            $providersList[$provByType->uniqid] = $provByType->getRepresent();

        }
        return $providersList;
    }

    /**
     * Prepare Forwarding Extensions
     *
     * Generate a list of extensions for the select dropdown based on the provided extension.
     *
     * @param string $extension The extension to find
     *
     * @return array The list of forwarding extensions
     */
    private function prepareForwardingExtensions(string $extension): array
    {
        // Get a list of all used extensions
        $forwardingExtensions = [];

        // Add a default option for the select dropdown
        $forwardingExtensions[''] = $this->translation->_('ex_SelectNumber');

        $record = Extensions::findFirstByNumber($extension);
        $forwardingExtensions[$record->number] = $record ? $record->getRepresent() : '';
        return $forwardingExtensions;
    }
}