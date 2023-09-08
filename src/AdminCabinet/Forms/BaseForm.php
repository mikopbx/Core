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

use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\WebUIConfigInterface;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;

/**
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
abstract class BaseForm extends Form
{

    public function initialize($entity = null, $options = null): void
    {
        PBXConfModulesProvider::hookModulesMethod(WebUIConfigInterface::ON_BEFORE_FORM_INITIALIZE, [$this, $entity, $options]);
    }

    /**
     * Add a textarea form element.
     *
     * @param string $areaName The name of the textarea field.
     * @param string $areaValue The initial value for the textarea field.
     * @param int $areaWidth The width of the textarea field in columns (optional, default: 85).
     * @param array $options Additional options for TextArea element
     * @return void
     */
    public function addTextArea(string $areaName, string $areaValue, int $areaWidth = 90, array $options=[]): void
    {
        $rows = 1;
        $strings = '';
        if (array_key_exists('placeholder', $options) && !empty($options["placeholder"])){
            $strings = explode("\n", $options["placeholder"]);
        }
        if (!empty($areaValue)){
            $strings = explode("\n", $areaValue);
        }
        foreach ($strings as $string) {
            $rows += ceil(strlen($string) / $areaWidth);
        }
        $options["rows"]=max($rows, 2);
        $options["value"] = $areaValue;
        $this->add(new TextArea($areaName, $options));
    }
}