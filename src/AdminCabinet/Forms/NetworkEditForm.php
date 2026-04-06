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

use MikoPBX\AdminCabinet\Library\Cidr;
use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Text;

/**
 * Class NetworkEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class NetworkEditForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // Basic fields
        $this->add(new Text('hostname'));
        $this->add(new Text('gateway', ['class' => 'ipaddress']));
        $this->add(new Text('primarydns', ['class' => 'ipaddress']));
        $this->add(new Text('secondarydns', ['class' => 'ipaddress']));
        $this->add(new Text('extipaddr', ['placeholder' => '123.111.123.111']));
        $this->add(new Text('exthostname', ['placeholder' => 'mikopbx.company.com']));

        // Port settings - placeholder values only, actual data loads via REST API
        $this->add(new Numeric(
            PbxSettings::EXTERNAL_SIP_PORT,
            [
                'placeholder' => '5060',
                'style' => 'width:130px;'
            ]
        ));
        $this->add(new Numeric(
            PbxSettings::EXTERNAL_TLS_PORT,
            [
                'placeholder' => '5061',
                'style' => 'width:130px;'
            ]
        ));

        // Checkboxes - state will be set by JavaScript
        $this->addCheckBox('usenat', false);
        $this->addCheckBox(PbxSettings::AUTO_UPDATE_EXTERNAL_IP, false);

        // Internet interface selector - DynamicDropdownBuilder will build the dropdown
        $this->add(new Hidden('internet_interface'));

        // All interface tabs and form fields will be created dynamically in JavaScript
        // based on data from REST API
    }
}
