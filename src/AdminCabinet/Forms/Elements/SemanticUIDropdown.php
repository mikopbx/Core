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

namespace MikoPBX\AdminCabinet\Forms\Elements;

use Phalcon\Forms\Element\AbstractElement;

/**
 * SemanticUIDropdown - Simplified universal dropdown form element (V3.0)
 * 
 * Generates proper HTML for native Fomantic UI dropdown with API support.
 * No complex JavaScript logic - uses native Fomantic UI apiSettings.
 * 
 * Key Features:
 * - Native Fomantic UI integration (no custom logic)
 * - API data loading with proper HTML structure
 * - Initial value display before API load
 * - Fresh data on every click (cache: false by default)
 * 
 * Usage in form:
 * $dropdown = new SemanticUIDropdown('networkfilterid', [], [
 *     'apiUrl' => '/pbxcore/api/v2/network-filters/getForSelect?categories[]=SIP',
 *     'placeholder' => 'Select network filter',
 *     'initialText' => $entity->networkfilterid_represent
 * ]);
 * $dropdown->setDefault($entity->networkfilterid);
 * $this->add($dropdown);
 */
class SemanticUIDropdown extends AbstractElement
{
    /**
     * @var array Configuration options
     */
    protected array $config = [];
    
    /**
     * @var array Static dropdown options if not using API
     */
    protected array $dropdownOptions = [];
    
    /**
     * Constructor
     * 
     * @param string $name Element name
     * @param array $options Static options array
     * @param array $attributes Element attributes/configuration
     */
    public function __construct(string $name, array $options = [], array $attributes = [])
    {
        parent::__construct($name, $attributes);
        
        // Store static dropdown options
        $this->dropdownOptions = $options;
        
        // Extract configuration from attributes (simplified for native Fomantic UI)
        $this->config = [
            'apiUrl' => $attributes['apiUrl'] ?? null,
            'placeholder' => $attributes['placeholder'] ?? '',
            'preserveHTML' => $attributes['preserveHTML'] ?? true,
            'cache' => $attributes['cache'] ?? false,  // Default to fresh data
            'hiddenFieldName' => $attributes['hiddenFieldName'] ?? $name,
            'class' => $attributes['class'] ?? 'ui selection dropdown',
            'id' => $attributes['id'] ?? $name . '-dropdown',
            'initialText' => $attributes['initialText'] ?? null,
        ];
        
        // Remove config keys from attributes to avoid duplication
        foreach (array_keys($this->config) as $key) {
            unset($attributes[$key]);
        }
        
        $this->setAttributes($attributes);
    }
    
    /**
     * Render the element (Simplified for native Fomantic UI)
     * 
     * @param array $attributes Additional attributes
     * @return string
     */
    public function render($attributes = null): string
    {
        $html = [];
        $value = $this->getValue();
        
        // Start dropdown container (no complex data attributes)
        $html[] = sprintf(
            '<div class="%s" id="%s"',
            htmlspecialchars($this->config['class']),
            htmlspecialchars($this->config['id'])
        );
        
        // Add custom attributes if provided
        if (is_array($attributes)) {
            foreach ($attributes as $key => $val) {
                if (!in_array($key, ['id', 'class', 'name'])) {
                    $html[] = sprintf(' %s="%s"', htmlspecialchars($key), htmlspecialchars($val));
                }
            }
        }
        
        $html[] = '>';
        
        // Hidden input for form submission
        $html[] = sprintf(
            '<input type="hidden" name="%s" id="%s" value="%s">',
            htmlspecialchars($this->config['hiddenFieldName']),
            htmlspecialchars($this->config['hiddenFieldName']),
            htmlspecialchars($value ?? '')
        );
        
        // Display text - show initial value or placeholder
        $displayText = $this->getDisplayText($value);
        
        if ($displayText) {
            $html[] = sprintf(
                '<div class="text">%s</div>', 
                $this->config['preserveHTML'] ? $displayText : htmlspecialchars($displayText)
            );
        } else {
            $html[] = sprintf(
                '<div class="default text">%s</div>',
                htmlspecialchars($this->config['placeholder'])
            );
        }
        
        // Dropdown icon
        $html[] = '<i class="dropdown icon"></i>';
        
        // Menu container
        $html[] = '<div class="menu">';
        
        // CRITICAL: Add initial element to menu for API-based dropdowns
        if ($this->config['apiUrl'] && $value && $displayText) {
            // For API dropdowns: add current selection to menu so Fomantic UI can find it
            $html[] = sprintf(
                '<div class="item active selected" data-value="%s">%s</div>',
                htmlspecialchars($value),
                $this->config['preserveHTML'] ? $displayText : htmlspecialchars($displayText)
            );
        } elseif (!$this->config['apiUrl'] && !empty($this->dropdownOptions)) {
            // For static dropdowns: add all options
            foreach ($this->dropdownOptions as $key => $option) {
                list($optionValue, $optionRepresent) = $this->parseOption($key, $option);
                
                $isSelected = ($value && $optionValue == $value);
                $selectedClass = $isSelected ? ' active selected' : '';
                
                $html[] = sprintf(
                    '<div class="item%s" data-value="%s">%s</div>',
                    $selectedClass,
                    htmlspecialchars($optionValue),
                    $this->config['preserveHTML'] ? $optionRepresent : htmlspecialchars($optionRepresent)
                );
            }
        }
        
        $html[] = '</div>'; // Close menu
        $html[] = '</div>'; // Close dropdown
        
        return implode('', $html);
    }
    
    /**
     * Get display text for current value
     * 
     * @param mixed $value Current value
     * @return string Display text
     */
    private function getDisplayText($value): string
    {
        if (!$value) {
            return '';
        }
        
        // For static options, find the text
        if (!empty($this->dropdownOptions)) {
            foreach ($this->dropdownOptions as $key => $option) {
                list($optionValue, $optionRepresent) = $this->parseOption($key, $option);
                if ($optionValue == $value) {
                    return $optionRepresent;
                }
            }
        }
        
        // For API-based dropdowns, use initialText
        if ($this->config['initialText']) {
            return $this->config['initialText'];
        }
        
        return '';
    }
    
    /**
     * Parse option into value and represent
     * 
     * @param mixed $key Option key
     * @param mixed $option Option data
     * @return array [value, represent]
     */
    private function parseOption($key, $option): array
    {
        if (is_array($option)) {
            // Format: [['value' => 'v1', 'text' => 't1', 'represent' => 'r1'], ...]
            $optionValue = $option['value'] ?? '';
            $optionText = $option['text'] ?? $option['name'] ?? $optionValue;
            $optionRepresent = $option['represent'] ?? $optionText;
        } else {
            // Format: ['value1' => 'Text 1', 'value2' => 'Text 2']
            $optionValue = $key;
            $optionRepresent = $option;
        }
        
        return [$optionValue, $optionRepresent];
    }
    
    /**
     * Set API URL for dynamic data loading
     * 
     * @param string $url API endpoint URL
     * @return $this
     */
    public function setApiUrl(string $url): self
    {
        $this->config['apiUrl'] = $url;
        return $this;
    }
    
    /**
     * Set static options
     * 
     * @param array $options Options array
     * @return $this
     */
    public function setOptions(array $options): self
    {
        $this->dropdownOptions = $options;
        return $this;
    }
    
    /**
     * Set placeholder text
     * 
     * @param string $placeholder Placeholder text
     * @return $this
     */
    public function setPlaceholder(string $placeholder): self
    {
        $this->config['placeholder'] = $placeholder;
        return $this;
    }
    
    /**
     * Set initial text (for API-based dropdowns)
     * 
     * @param string $initialText HTML representation of initial value
     * @return $this
     */
    public function setInitialText(string $initialText): self
    {
        $this->config['initialText'] = $initialText;
        return $this;
    }
    
    
    /**
     * Get configuration value
     * 
     * @param string $key Configuration key
     * @return mixed|null
     */
    public function getConfig(string $key)
    {
        return $this->config[$key] ?? null;
    }
    
    /**
     * Set configuration value
     * 
     * @param string $key Configuration key
     * @param mixed $value Configuration value
     * @return $this
     */
    public function setConfig(string $key, $value): self
    {
        $this->config[$key] = $value;
        return $this;
    }
}