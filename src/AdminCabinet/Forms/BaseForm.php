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

use MikoPBX\AdminCabinet\Forms\Elements\SemanticUIDropdown;
use MikoPBX\AdminCabinet\Library\SecurityHelper;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\WebUIConfigInterface;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Form;
use stdClass;

/**
 * @property \MikoPBX\Common\Providers\TranslationProvider translation
 */
abstract class BaseForm extends Form
{
    public function initialize($entity = null, $options = null): void
    {
        if ($entity === null) {
            $entity = new stdClass();
        }
        PBXConfModulesProvider::hookModulesMethod(
            WebUIConfigInterface::ON_BEFORE_FORM_INITIALIZE,
            [$this, $entity, $options]
        );
    }

    /**
     * Add a textarea form element.
     *
     * @param string $areaName The name of the textarea field.
     * @param string $areaValue The initial value for the textarea field.
     * @param int $areaWidth The width of the textarea field in columns (optional, default: 85).
     * @param array $options Additional options for TextArea element
     *                       Special option 'skipEscaping' can be used for technical configuration fields
     * @return void
     */
    public function addTextArea(string $areaName, string $areaValue, int $areaWidth = 90, array $options = []): void
    {
        $rows = 1;
        $strings = '';
        if (array_key_exists('placeholder', $options) && !empty($options["placeholder"])) {
            $strings = explode("\n", $options["placeholder"]);
        }
        if (!empty($areaValue)) {
            $strings = explode("\n", $areaValue);
        }
        foreach ($strings as $string) {
            $rows += ceil(strlen($string) / $areaWidth);
        }
        $options["rows"] = max($rows, 2);
        
        // SECURITY: Escape HTML content to prevent XSS attacks in textarea values
        // Use SecurityHelper to properly escape HTML while preserving user content integrity
        // Skip escaping for technical configuration fields that may contain special characters
        $skipEscaping = $options['skipEscaping'] ?? false;
        unset($options['skipEscaping']); // Remove from options to avoid passing to TextArea
        
        if ($skipEscaping) {
            $options["value"] = $areaValue;
        } else {
            $options["value"] = SecurityHelper::escapeHtml($areaValue);
        }
        
        $this->add(new TextArea($areaName, $options));
    }

    /**
     * Adds a checkbox to the form field with the given name.
     *
     * @param string $fieldName The name of the form field.
     * @param bool $checked Indicates whether the checkbox is checked by default.
     * @param string $checkedValue The value assigned to the checkbox when it is checked.
     * @return void
     */
    public function addCheckBox(string $fieldName, bool $checked, string $checkedValue = 'on'): void
    {
        $checkAr = ['value' => null];
        if ($checked) {
            $checkAr = ['checked' => $checkedValue,'value' => $checkedValue];
        }
        $this->add(new Check($fieldName, $checkAr));
    }
    
    /**
     * Add a SemanticUI dropdown element to the form.
     *
     * @param string $name The name of the dropdown field
     * @param array $options Static options array (if not using API)
     * @param mixed $value Initial value for the dropdown
     * @param array $attributes Additional attributes and configuration
     * @return void
     */
    protected function addSemanticUIDropdown(
        string $name, 
        array $options = [], 
        $value = null,
        array $attributes = []
    ): void {
        $element = new SemanticUIDropdown($name, $options, $attributes);
        
        if ($value !== null) {
            $element->setDefault($value);
        }
        
        $this->add($element);
    }
}
