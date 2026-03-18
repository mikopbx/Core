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
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Hidden;

/**
 * Class Fail2BanEditForm
 *
 * Creates empty form structure for Fail2Ban settings.
 * Actual data is loaded via REST API from JavaScript.
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class Fail2BanEditForm extends BaseForm
{
    /**
     * Initialize the form with empty fields
     * Data will be populated via REST API from JavaScript
     */
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // Hidden fields for Fail2Ban settings (values set by security preset slider)
        $this->add(new Hidden('maxretry'));
        $this->add(new Hidden('bantime'));
        $this->add(new Hidden('findtime'));

        // Textarea for whitelist
        $this->addTextArea('whitelist', '', 95);

        // Checkbox for enabling/disabling Fail2Ban
        $this->addCheckBox(PbxSettings::PBX_FAIL2BAN_ENABLED, false);

        // Hidden field for max requests per second
        $this->add(new Hidden(PbxSettings::PBX_FIREWALL_MAX_REQ));
    }
}
