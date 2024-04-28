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

namespace MikoPBX\Tests\PBXCoreREST\Lib\Extensions;

use MikoPBX\PBXCoreREST\Lib\Extensions\SaveRecordAction;
use MikoPBX\Tests\Unit\AbstractUnitTest;

class SaveRecordTest extends AbstractUnitTest
{

    public function testMain()
    {
        $data = [
            'id'=> null,
            'type' => 'SIP',
            'is_general_user_number' => 1,
            'sip_type' => 'peer',
            'sip_uniqid' => 'SIP-PHONE-47FD499D0B73B73C3D8D705947EC66B1',
            'sip_disabled' => 0,
            'mobile_uniqid' => 'EXTERNAL-47FD499D0B73B73C3D8D705947EC66B1',
            'user_avatar' => '',
            'user_id' => '',
            'file-select' => '',
            'user_username' => 'wqerwqerqwerwer',
            'number' => 276,
            'mobile_number' => '',
            'user_email' => '',
            'sip_secret' => 'b3d97cf23ceadc520e365b6d0a0bb6f2',
            'mobile_dialstring' => '',
            'sip_enableRecording' => 'on',
            'sip_dtmfmode' => 'auto',
            'sip_transport' => '',
            'sip_networkfilterid' => 'none',
            'sip_manualattributes' => '',
            'fwd_ringlength' => '',
            'fwd_forwarding' => '',
            'fwd_forwardingonbusy' => '',
            'fwd_forwardingonunavailable' => '',
            'dirrty' => '',
            'submitMode' => 'SaveSettings'
        ];
        $res = SaveRecordAction::main($data);
        $this->assertTrue($res->success);
    }
}
