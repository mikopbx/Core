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

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;

/**
 * Class TimeSettingsEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class TimeSettingsEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // PBX Timezone - using DynamicDropdownBuilder (built by JavaScript)
        $this->add(new Hidden(PbxSettings::PBX_TIMEZONE));

        // NTP server textarea - data will be loaded via REST API
        $this->add(new TextArea(PbxSettings::NTP_SERVER, [
            'value' => '',
            'rows' => 4
        ]));

        // Manual time settings checkbox - data will be loaded via REST API
        $this->addCheckBox(PbxSettings::PBX_MANUAL_TIME_SETTINGS, false);

        // Manual date/time input field - data will be loaded via REST API
        $this->add(new Text('ManualDateTime', ['value' => '']));
    }
}
