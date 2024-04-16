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

namespace MikoPBX\PBXCoreREST\Lib\Extensions;

use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\ExternalPhones;
use MikoPBX\Common\Models\IncomingRoutingTable;
use MikoPBX\Common\Models\Sip;

class DataStructure
{

    public ?string $id;

    public string $type = Extensions::TYPE_SIP;

    public string $show_in_phonebook = '1';
    public string $is_general_user_number = '1';
    public string $public_access = '0';

    public string $number = '';

    public ?string $user_id = '';
    public string $user_avatar = '';
    public string $user_username = '';
    public string $user_email = '';
    public string $mobile_uniqid = '';
    public string $mobile_number = '';
    public string $mobile_dialstring = '';
    public ?string $sip_uniqid = '';

    public string $sip_secret = '';
    public string $sip_type = 'peer';
    public string $sip_qualify = '1';
    public int $sip_qualifyfreq = 60;
    public string $sip_enableRecording = '1';
    public string $sip_dtmfmode = 'auto';
    public string $sip_transport = '';
    public string $sip_networkfilterid = 'none';
    public string $sip_manualattributes = '';
    public int $fwd_ringlength = 45;
    public string $fwd_forwarding = '';
    public string $fwd_forwardingonbusy = '';
    public string $fwd_forwardingonunavailable = '';

    /**
     * DataStructure constructor.
     *
     * Initializes a DataStructure instance with provided data.
     * If certain properties are empty, it assigns default values.
     *
     * @param array $data The input data to initialize the DataStructure.
     */
    public function __construct(array $data)
    {
        // Use Reflection to get information about the class properties.
        $reflectionClass = new \ReflectionClass($this);
        $properties = $reflectionClass->getProperties();

        foreach ($properties as $property) {
            $propName = $property->getName();

            // Continue if the property doesn't exist in the data array.
            if (!array_key_exists($propName, $data)) {
                continue;
            }

            // Use Reflection to get the type of the property.
            $type = $property->getType();

            // Assign a default value based on the type.
            switch ($type->getName()) {
                case 'string':
                    $this->$propName = $data[$propName] ?? '';
                    break;
                case 'int':
                    $this->$propName = intval($data[$propName]) ?? 0;
                    break;
                // You can add more types here if needed
            }
        }

        // Fill empty values
        if (empty($this->sip_uniqid)) {
            $this->sip_uniqid = Sip::generateUniqueID();
        }
        if (empty($this->sip_secret)) {
            $this->sip_secret = Sip::generateSipPassword();
        }
        if (empty($this->mobile_uniqid)) {
            $this->mobile_uniqid = ExternalPhones::generateUniqueID();
        }
        if (empty($this->sip_networkfilterid)) {
            $this->sip_networkfilterid='none';
        }
        if (empty($this->sip_dtmfmode)) {
            $this->sip_dtmfmode='auto';
        }

        // Sanitize extension
        if (!empty($this->number)){
            $this->number = preg_replace('/\D/', '', $this->number);
        }
        if (empty($this->number)) {
            $this->number = Extensions::getNextInternalNumber();
        }

        // Sanitize mobile numbers
        if (!empty($this->mobile_number)){
            $this->mobile_number = preg_replace('/\D/', '', $this->mobile_number);
        }
        if (empty($this->mobile_dialstring)) {
            $this->mobile_dialstring = $this->mobile_number;
        }
        $properties = ['fwd_forwarding', 'fwd_forwardingonunavailable', 'fwd_forwardingonbusy'];
        foreach ($properties as $property) {
            if (!empty($this->{$property}) && !in_array($this->{$property}, [IncomingRoutingTable::ACTION_VOICEMAIL, IncomingRoutingTable::ACTION_BUSY, IncomingRoutingTable::ACTION_HANGUP], true)) {
                $this->{$property} = preg_replace('/\D/', '', $this->{$property});
            }
        }
    }

    /**
     * Convert the DataStructure object to an associative array.
     *
     * @return array The DataStructure object as an associative array.
     */
    public function toArray(): array
    {
        return get_object_vars($this);
    }
}