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
use MikoPBX\Common\Models\Sip;

class DataStructure {

    public ?string $id;

    public string $type = Extensions::TYPE_SIP;

    public string $show_in_phonebook = '1';
    public string $is_general_user_number = '1';
    public string $public_access = '0';

    public string $number='';

    public ?string $user_id='';
    public string $user_avatar='';
    public string $user_username='';
    public string $user_email='';
    public string $mobile_uniqid='';
    public string $mobile_number='';
    public string $mobile_dialstring='';
    public ?string $sip_uniqid='';

    public string $sip_secret='';
    public string $sip_type = 'peer';
    public string $sip_qualify = '1';
    public int $sip_qualifyfreq = 60;
    public string $sip_enableRecording='1';
    public string $sip_dtmfmode='auto';
    public string $sip_transport = ' ';
    public string $sip_networkfilterid = 'none';
    public string $sip_manualattributes='';
    public string $fwd_ringlength='45';
    public string $fwd_forwarding='';
    public string $fwd_forwardingonbusy='';
    public string $fwd_forwardingonunavailable='';

    /**
     * DataStructure constructor.
     *
     * Initializes a DataStructure instance with provided data.
     * If certain properties are empty, it assigns default values.
     *
     * @param array $data The input data to initialize the DataStructure.
     */
    public function __construct(array $data) {
        foreach ($data as $key => $value) {
            if (!property_exists($this, $key)) {
                continue;
            }
            // If value empty remain default value from property definition
            $this->$key = $value ?? $this->$key;
        }

        if (empty($this->number)){
            $this->number = Extensions::getNextInternalNumber();
        }
        if (empty($this->sip_uniqid)){
            $this->sip_uniqid = Sip::generateUniqueID();
        }
        if (empty($this->sip_secret)){
            $this->sip_secret = Sip::generateSipPassword();
        }
        if (empty($this->mobile_uniqid)){
            $this->mobile_uniqid = ExternalPhones::generateUniqueID();
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