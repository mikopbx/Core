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

use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Text;

/**
 * Class Fail2BanEditForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class Fail2BanEditForm extends BaseForm
{

    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);


        foreach ($entity as $key => $value) {
            switch ($key) {
                case "id":
                    $this->add(new Hidden($key));
                    break;
                case "maxretry":
                case "bantime":
                case "findtime":
                case "***ALL NUMBERIC ABOVE***":
                    $this->add(new Numeric($key));
                    break;
                case "whitelist":
                    $this->addTextArea($key, $value??'', 95);
                    break;
                default:
                    $this->add(new Text($key));
            }
        }

        $cheskarr = ['value' => null];
        if ($options[PbxSettingsConstants::PBX_FAIL2BAN_ENABLED] === "1") {
            $cheskarr = ['checked' => 'checked', 'value' => null];
        }
        $this->add(new Check(PbxSettingsConstants::PBX_FAIL2BAN_ENABLED, $cheskarr));
    }
}