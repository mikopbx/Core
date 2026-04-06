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

use MikoPBX\Common\Models\PbxSettings;
use Phalcon\Forms\Element\Hidden;

/**
 * LocalStorageEditForm
 *
 * Form for local storage settings (general retention period).
 * Sends data to: PATCH /pbxcore/api/v3/storage
 *
 * @package MikoPBX\AdminCabinet\Forms
 */
class LocalStorageEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // General recording retention period
        // The actual value will be loaded via REST API in JavaScript
        $this->add(new Hidden(PbxSettings::PBX_RECORD_SAVE_PERIOD));
    }
}
