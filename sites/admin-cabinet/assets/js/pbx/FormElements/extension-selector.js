"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

/* global $, globalTranslate, DynamicDropdownBuilder, SecurityUtils, Form */

/**
 * ExtensionSelector - Extension-specific wrapper over DynamicDropdownBuilder
 * 
 * This component builds upon DynamicDropdownBuilder to provide extension-specific features:
 * - Support for extension types/categories (routing, internal, all, etc.)
 * - Proper HTML rendering for extension names with icons
 * - Extension exclusion functionality
 * - Optimized caching for extension data
 * - Full-text search capabilities
 * 
 * Usage:
 * ExtensionSelector.init('extension', {
 *     type: 'routing',              // Extension type (routing/internal/all)
 *     excludeExtensions: ['101'],   // Extensions to exclude
 *     includeEmpty: true,           // Include empty option
 *     onChange: (value) => { ... }  // Change callback
 * }); 
 * 
 * @module ExtensionSelector
 */
var ExtensionSelector = {
  /**
   * Active selector instances
   * @type {Map}
   */
  instances: new Map(),

  /**
   * Default configuration
   * @type {object}
   */
  defaults: {
    type: 'all',
    // Extension type (all/routing/internal/queue/etc.)
    excludeExtensions: [],
    // Extensions to exclude from list
    includeEmpty: false,
    // Include empty/none option
    placeholder: null,
    // Placeholder text (auto-detected)
    additionalClasses: [],
    // Additional CSS classes for dropdown
    onChange: null,
    // Change callback function
    onLoadComplete: null // Load complete callback

  },

  /**
   * Initialize extension selector
   * 
   * @param {string} fieldId - Field ID (e.g., 'extension')
   * @param {object} options - Configuration options
   * @returns {object|null} Selector instance
   */
  init: function init(fieldId) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    // Check if already initialized
    if (this.instances.has(fieldId)) {
      return this.instances.get(fieldId);
    } // Find hidden input element


    var $hiddenInput = $("#".concat(fieldId));

    if (!$hiddenInput.length) {
      console.warn("ExtensionSelector: Hidden input not found for field: ".concat(fieldId));
      return null;
    } // Merge options with defaults


    var config = _objectSpread(_objectSpread({}, this.defaults), options); // Get current value and represent text from data object if provided


    var currentValue = options.data && options.data[fieldId] || $hiddenInput.val() || '';
    var currentText = this.detectInitialText(fieldId, options.data) || config.placeholder; // Build API URL with parameters using v3 API

    var apiUrl = '/pbxcore/api/v3/extensions:getForSelect';
    var apiParams = {}; // Add type parameter

    if (config.type && config.type !== 'all') {
      apiParams.type = config.type;
    } // Add exclude parameter


    if (config.excludeExtensions && config.excludeExtensions.length > 0) {
      apiParams.exclude = config.excludeExtensions.join(',');
    } // Request empty option from API so it appears in search results


    if (config.includeEmpty) {
      apiParams.includeEmpty = 'true';
    } // Create dropdown configuration for DynamicDropdownBuilder


    var dropdownConfig = {
      apiUrl: apiUrl,
      apiParams: apiParams,
      placeholder: config.placeholder || this.getPlaceholderByType(config.type),
      // Custom response handler for extension-specific processing
      onResponse: function onResponse(response) {
        return _this.processExtensionResponse(response, config);
      },
      onChange: function onChange(value, text, $choice) {
        _this.handleSelectionChange(fieldId, value, text, $choice, config);
      }
    }; // Pass the original data object directly to DynamicDropdownBuilder
    // This ensures proper handling of existing values and their representations

    var dropdownData = options.data || {}; // Override template for proper HTML rendering

    dropdownConfig.templates = {
      menu: this.customDropdownMenu
    }; // Add default classes for extension dropdowns

    dropdownConfig.additionalClasses = ['search'].concat(_toConsumableArray(config.additionalClasses || []));
    DynamicDropdownBuilder.buildDropdown(fieldId, dropdownData, dropdownConfig); // Create instance

    var instance = {
      fieldId: fieldId,
      config: config,
      currentValue: currentValue,
      currentText: currentText,
      $hiddenInput: $hiddenInput
    }; // Store instance

    this.instances.set(fieldId, instance);
    return instance;
  },

  /**
   * Detect initial text from data object or dropdown
   * 
   * @param {string} fieldId - Field ID
   * @param {object} data - Data object with represent fields
   * @returns {string|null} Initial text
   */
  detectInitialText: function detectInitialText(fieldId, data) {
    if (data && data["".concat(fieldId, "_represent")]) {
      return data["".concat(fieldId, "_represent")];
    } // Try to get from existing dropdown text


    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      var $text = $dropdown.find('.text:not(.default)');

      if ($text.length && $text.text().trim()) {
        return $text.html();
      }
    }

    return null;
  },

  /**
   * Get appropriate placeholder text by extension type
   * 
   * @param {string} type - Extension type
   * @returns {string} Placeholder text
   */
  getPlaceholderByType: function getPlaceholderByType(type) {
    switch (type) {
      case 'routing':
        return globalTranslate.ex_SelectExtension;

      case 'internal':
        return globalTranslate.ex_SelectInternalExtension;

      case 'queue':
        return globalTranslate.ex_SelectQueueExtension;

      default:
        return globalTranslate.ex_SelectExtension;
    }
  },

  /**
   * Process API response for extension-specific formatting
   * 
   * @param {object} response - API response
   * @param {object} config - Configuration
   * @returns {object} Processed response
   */
  processExtensionResponse: function processExtensionResponse(response, config) {
    if ((response.result || response.success) && response.data && Array.isArray(response.data)) {
      var processedResults = response.data.map(function (item) {
        var displayText = item.represent || item.name || item.text || item.value; // Apply HTML sanitization for extension content with icons

        if (displayText && typeof SecurityUtils !== 'undefined') {
          displayText = SecurityUtils.sanitizeExtensionsApiContent(displayText);
        }

        return {
          value: item.value || item.id,
          text: displayText,
          name: displayText,
          type: item.type || '',
          typeLocalized: item.typeLocalized || '',
          disabled: item.disabled || false
        };
      });
      return {
        success: true,
        results: processedResults
      };
    }

    return {
      success: false,
      results: []
    };
  },

  /**
   * Handle dropdown selection change
   * 
   * @param {string} fieldId - Field ID
   * @param {string} value - Selected value
   * @param {string} text - Selected text
   * @param {jQuery} $choice - Selected choice element
   * @param {object} config - Configuration
   */
  handleSelectionChange: function handleSelectionChange(fieldId, value, text, $choice, config) {
    var instance = this.instances.get(fieldId);
    if (!instance) return; // Update instance state

    instance.currentValue = value;
    instance.currentText = text; // CRITICAL: Update hidden input field to maintain synchronization

    var $hiddenInput = $("#".concat(fieldId));

    if ($hiddenInput.length) {
      $hiddenInput.val(value);
    } // Call custom onChange if provided


    if (typeof config.onChange === 'function') {
      config.onChange(value, text, $choice);
    } // Notify form of changes


    if (typeof Form !== 'undefined' && Form.dataChanged) {
      Form.dataChanged();
    }
  },

  /**
   * Custom dropdown menu template with categories support
   * Synchronized with ExtensionsAPI.customDropdownMenu logic for compatibility
   * 
   * @param {object} response - Response from API
   * @param {object} fields - Field configuration
   * @returns {string} HTML for dropdown menu
   */
  customDropdownMenu: function customDropdownMenu(response, fields) {
    var values = response[fields.values] || [];
    var html = '';
    var oldType = ''; // Use $.each for compatibility with original ExtensionsAPI.customDropdownMenu

    $.each(values, function (index, option) {
      var value = option[fields.value] || '';
      var text = option[fields.text] || option[fields.name] || '';
      var type = option.type || '';
      var typeLocalized = option.typeLocalized || ''; // Add category header if type changed - exact same logic as ExtensionsAPI.customDropdownMenu

      if (type !== oldType) {
        oldType = type;
        html += '<div class="divider"></div>';
        html += '\t<div class="header">';
        html += '\t<i class="tags icon"></i>';
        html += typeLocalized;
        html += '</div>';
      } // For Fomantic UI to work correctly with HTML content, data-text should contain the HTML
      // that will be displayed when the item is selected. Text is already sanitized in processExtensionResponse.


      var maybeText = text ? "data-text=\"".concat(text.replace(/"/g, '&quot;'), "\"") : '';
      var maybeDisabled = option.disabled ? 'disabled ' : '';
      html += "<div class=\"".concat(maybeDisabled, "item\" data-value=\"").concat(ExtensionSelector.escapeHtml(value), "\"").concat(maybeText, ">");
      html += text; // Text is already sanitized in processExtensionResponse

      html += '</div>';
    });
    return html;
  },

  /**
   * Set value programmatically with optional text
   * V5.0: Enhanced to support setting both value and display text
   *
   * @param {string} fieldId - Field ID
   * @param {string} value - Value to set
   * @param {string} text - Display text (optional, if provided will update display)
   */
  setValue: function setValue(fieldId, value) {
    var text = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var instance = this.instances.get(fieldId);

    if (!instance) {
      console.warn("ExtensionSelector: Instance not found for field: ".concat(fieldId));
      return;
    } // Update hidden input value


    var $hiddenInput = $("#".concat(fieldId));

    if ($hiddenInput.length) {
      $hiddenInput.val(value);
    } // Update dropdown display


    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      // Handle empty value specially
      if (value === '' || value === null) {
        // Clear the dropdown
        $dropdown.dropdown('clear');
        var $textElement = $dropdown.find('.text');

        if ($textElement.length) {
          // Add default class for placeholder style
          $textElement.addClass('default');
        }
      } // If text is provided, update both value and text
      else if (text !== null && text !== '') {
        // Create temporary menu item with the new text if it doesn't exist
        var $menu = $dropdown.find('.menu');
        var existingItem = $menu.find(".item[data-value=\"".concat(value, "\"]"));

        if (!existingItem.length && value !== '') {
          // Add temporary item for mobile number or other dynamic values
          var safeValue = this.escapeHtml(value);
          var safeText = typeof SecurityUtils !== 'undefined' ? SecurityUtils.sanitizeExtensionsApiContent(text) : text;
          $menu.append("<div class=\"item\" data-value=\"".concat(safeValue, "\" data-text=\"").concat(safeText.replace(/"/g, '&quot;'), "\">").concat(safeText, "</div>"));
        } // Set selected value in dropdown


        $dropdown.dropdown('set selected', value); // Force text update if Semantic UI didn't pick it up

        var _$textElement = $dropdown.find('.text');

        if (_$textElement.length) {
          _$textElement.html(text); // Remove default class to show text as selected, not placeholder


          _$textElement.removeClass('default');
        }
      } else {
        // Just set the value, let dropdown handle text
        $dropdown.dropdown('set selected', value); // Remove default class if value is set

        var _$textElement2 = $dropdown.find('.text');

        if (_$textElement2.length) {
          _$textElement2.removeClass('default');
        }
      }
    } // Update instance state


    instance.currentValue = value;
    instance.currentText = text || ''; // Trigger change event for form processing

    $hiddenInput.trigger('change'); // Notify form of changes

    if (typeof Form !== 'undefined' && Form.dataChanged) {
      Form.dataChanged();
    }
  },

  /**
   * Set display text without changing value
   * V5.0: New method for updating display text only
   *
   * @param {string} fieldId - Field ID
   * @param {string} text - Display text to set
   */
  setText: function setText(fieldId, text) {
    var instance = this.instances.get(fieldId);

    if (!instance) {
      console.warn("ExtensionSelector: Instance not found for field: ".concat(fieldId));
      return;
    }

    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      var $textElement = $dropdown.find('.text');

      if ($textElement.length) {
        // Sanitize text before setting
        var safeText = typeof SecurityUtils !== 'undefined' ? SecurityUtils.sanitizeExtensionsApiContent(text) : text;
        $textElement.html(safeText); // Remove default class to show text as selected, not placeholder

        $textElement.removeClass('default');
        instance.currentText = text;
      }
    }
  },

  /**
   * Get current value
   * 
   * @param {string} fieldId - Field ID
   * @returns {string|null} Current value
   */
  getValue: function getValue(fieldId) {
    var instance = this.instances.get(fieldId);
    return instance ? instance.currentValue : null;
  },

  /**
   * Clear dropdown selection
   *
   * @param {string} fieldId - Field ID
   */
  clear: function clear(fieldId) {
    var instance = this.instances.get(fieldId);

    if (instance) {
      // Use DynamicDropdownBuilder to clear
      DynamicDropdownBuilder.clear(fieldId); // Add default class to show placeholder style

      var $dropdown = $("#".concat(fieldId, "-dropdown"));

      if ($dropdown.length) {
        var $textElement = $dropdown.find('.text');

        if ($textElement.length) {
          $textElement.addClass('default');
        }
      } // Update instance state


      instance.currentValue = null;
      instance.currentText = null;
    }
  },

  /**
   * Refresh dropdown data
   *
   * @param {string} fieldId - Field ID
   */
  refresh: function refresh(fieldId) {
    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      // Check if dropdown is still attached to DOM before refreshing
      if ($.contains(document, $dropdown[0])) {
        // Temporarily disable animations to prevent DOM errors
        $dropdown.dropdown('hide');
        $dropdown.dropdown({
          silent: true
        });
        $dropdown.dropdown('refresh');
      }
    }
  },

  /**
   * Clear cache for extensions API
   * Call this after extension operations (add/edit/delete)
   * @param {string} type - Optional: specific type to clear ('routing', 'internal', etc.)
   */
  clearCache: function clearCache() {
    var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

    if (type) {
      // Clear cache for specific type
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v3/extensions:getForSelect', {
        type: type
      });
    } else {
      // Clear all extensions cache
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v3/extensions:getForSelect');
    }
  },

  /**
   * Refresh all extension dropdowns on the page
   * This will force them to reload data from server
   * @param {string} type - Optional: specific type to refresh ('routing', 'internal', etc.)
   */
  refreshAll: function refreshAll() {
    var _this2 = this;

    var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    // Clear cache first
    this.clearCache(type); // Refresh each active instance

    this.instances.forEach(function (instance, fieldId) {
      if (!type || instance.config.type === type) {
        // Clear dropdown and reload
        DynamicDropdownBuilder.clear(fieldId); // Safely refresh dropdown

        _this2.refresh(fieldId);
      }
    });
  },

  /**
   * Update extension exclusion list for existing instance
   * 
   * @param {string} fieldId - Field ID
   * @param {Array} excludeExtensions - Extensions to exclude
   */
  updateExclusions: function updateExclusions(fieldId) {
    var excludeExtensions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var instance = this.instances.get(fieldId);

    if (!instance) {
      console.warn("ExtensionSelector: Instance not found for field: ".concat(fieldId));
      return;
    } // Update configuration


    instance.config.excludeExtensions = excludeExtensions; // Clear cache for this specific configuration

    var cacheKey = this.generateCacheKey(instance.config);
    DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v3/extensions:getForSelect', cacheKey); // Refresh dropdown

    this.refresh(fieldId);
  },

  /**
   * Generate cache key based on configuration
   * 
   * @param {object} config - Extension selector configuration
   * @returns {object} Cache key parameters
   */
  generateCacheKey: function generateCacheKey(config) {
    var cacheParams = {};

    if (config.type && config.type !== 'all') {
      cacheParams.type = config.type;
    }

    if (config.excludeExtensions && config.excludeExtensions.length > 0) {
      cacheParams.exclude = config.excludeExtensions.join(',');
    }

    return cacheParams;
  },

  /**
   * Destroy instance
   * 
   * @param {string} fieldId - Field ID
   */
  destroy: function destroy(fieldId) {
    var instance = this.instances.get(fieldId);

    if (instance) {
      // Remove from instances
      this.instances["delete"](fieldId);
    }
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml: function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}; // Export for use in other modules

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionSelector;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZXh0ZW5zaW9uLXNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5zdGFuY2VzIiwiTWFwIiwiZGVmYXVsdHMiLCJ0eXBlIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJpbmNsdWRlRW1wdHkiLCJwbGFjZWhvbGRlciIsImFkZGl0aW9uYWxDbGFzc2VzIiwib25DaGFuZ2UiLCJvbkxvYWRDb21wbGV0ZSIsImluaXQiLCJmaWVsZElkIiwib3B0aW9ucyIsImhhcyIsImdldCIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsImNvbmZpZyIsImN1cnJlbnRWYWx1ZSIsImRhdGEiLCJ2YWwiLCJjdXJyZW50VGV4dCIsImRldGVjdEluaXRpYWxUZXh0IiwiYXBpVXJsIiwiYXBpUGFyYW1zIiwiZXhjbHVkZSIsImpvaW4iLCJkcm9wZG93bkNvbmZpZyIsImdldFBsYWNlaG9sZGVyQnlUeXBlIiwib25SZXNwb25zZSIsInJlc3BvbnNlIiwicHJvY2Vzc0V4dGVuc2lvblJlc3BvbnNlIiwidmFsdWUiLCJ0ZXh0IiwiJGNob2ljZSIsImhhbmRsZVNlbGVjdGlvbkNoYW5nZSIsImRyb3Bkb3duRGF0YSIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImluc3RhbmNlIiwic2V0IiwiJGRyb3Bkb3duIiwiJHRleHQiLCJmaW5kIiwidHJpbSIsImh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9TZWxlY3RFeHRlbnNpb24iLCJleF9TZWxlY3RJbnRlcm5hbEV4dGVuc2lvbiIsImV4X1NlbGVjdFF1ZXVlRXh0ZW5zaW9uIiwicmVzdWx0Iiwic3VjY2VzcyIsIkFycmF5IiwiaXNBcnJheSIsInByb2Nlc3NlZFJlc3VsdHMiLCJtYXAiLCJpdGVtIiwiZGlzcGxheVRleHQiLCJyZXByZXNlbnQiLCJuYW1lIiwiU2VjdXJpdHlVdGlscyIsInNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQiLCJpZCIsInR5cGVMb2NhbGl6ZWQiLCJkaXNhYmxlZCIsInJlc3VsdHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJvbGRUeXBlIiwiZWFjaCIsImluZGV4Iiwib3B0aW9uIiwibWF5YmVUZXh0IiwicmVwbGFjZSIsIm1heWJlRGlzYWJsZWQiLCJlc2NhcGVIdG1sIiwic2V0VmFsdWUiLCJkcm9wZG93biIsIiR0ZXh0RWxlbWVudCIsImFkZENsYXNzIiwiJG1lbnUiLCJleGlzdGluZ0l0ZW0iLCJzYWZlVmFsdWUiLCJzYWZlVGV4dCIsImFwcGVuZCIsInJlbW92ZUNsYXNzIiwidHJpZ2dlciIsInNldFRleHQiLCJnZXRWYWx1ZSIsImNsZWFyIiwicmVmcmVzaCIsImNvbnRhaW5zIiwiZG9jdW1lbnQiLCJzaWxlbnQiLCJjbGVhckNhY2hlIiwiY2xlYXJDYWNoZUZvciIsInJlZnJlc2hBbGwiLCJmb3JFYWNoIiwidXBkYXRlRXhjbHVzaW9ucyIsImNhY2hlS2V5IiwiZ2VuZXJhdGVDYWNoZUtleSIsImNhY2hlUGFyYW1zIiwiZGVzdHJveSIsImRpdiIsImNyZWF0ZUVsZW1lbnQiLCJ0ZXh0Q29udGVudCIsImlubmVySFRNTCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFFdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEs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QUFDdEMwRyxNQUFBQSxXQUFXLENBQUMxRyxJQUFaLEdBQW1CaUIsTUFBTSxDQUFDakIsSUFBMUI7QUFDSDs7QUFFRCxRQUFJaUIsTUFBTSxDQUFDaEIsaUJBQVAsSUFBNEJnQixNQUFNLENBQUNoQixpQkFBUCxDQUF5QmEsTUFBekIsR0FBa0MsQ0FBbEUsRUFBcUU7QUFDakU0RixNQUFBQSxXQUFXLENBQUNqRixPQUFaLEdBQXNCUixNQUFNLENBQUNoQixpQkFBUCxDQUF5QnlCLElBQXpCLENBQThCLEdBQTlCLENBQXRCO0FBQ0g7O0FBRUQsV0FBT2dGLFdBQVA7QUFDSCxHQXZnQnFCOztBQXlnQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0E5Z0JzQixtQkE4Z0JkbkcsT0E5Z0JjLEVBOGdCTDtBQUNiLFFBQU1rQyxRQUFRLEdBQUcsS0FBSzdDLFNBQUwsQ0FBZWMsR0FBZixDQUFtQkgsT0FBbkIsQ0FBakI7O0FBQ0EsUUFBSWtDLFFBQUosRUFBYztBQUNWO0FBQ0EsV0FBSzdDLFNBQUwsV0FBc0JXLE9BQXRCO0FBQ0g7QUFDSixHQXBoQnFCOztBQXNoQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXdFLEVBQUFBLFVBM2hCc0Isc0JBMmhCWC9DLElBM2hCVyxFQTJoQkw7QUFDYixRQUFNMkUsR0FBRyxHQUFHWCxRQUFRLENBQUNZLGFBQVQsQ0FBdUIsS0FBdkIsQ0FBWjtBQUNBRCxJQUFBQSxHQUFHLENBQUNFLFdBQUosR0FBa0I3RSxJQUFsQjtBQUNBLFdBQU8yRSxHQUFHLENBQUNHLFNBQVg7QUFDSDtBQS9oQnFCLENBQTFCLEMsQ0FraUJBOztBQUNBLElBQUksT0FBT0MsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCckgsaUJBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgZ2xvYmFsVHJhbnNsYXRlLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBTZWN1cml0eVV0aWxzLCBGb3JtICovXG5cbi8qKlxuICogRXh0ZW5zaW9uU2VsZWN0b3IgLSBFeHRlbnNpb24tc3BlY2lmaWMgd3JhcHBlciBvdmVyIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAqIFxuICogVGhpcyBjb21wb25lbnQgYnVpbGRzIHVwb24gRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB0byBwcm92aWRlIGV4dGVuc2lvbi1zcGVjaWZpYyBmZWF0dXJlczpcbiAqIC0gU3VwcG9ydCBmb3IgZXh0ZW5zaW9uIHR5cGVzL2NhdGVnb3JpZXMgKHJvdXRpbmcsIGludGVybmFsLCBhbGwsIGV0Yy4pXG4gKiAtIFByb3BlciBIVE1MIHJlbmRlcmluZyBmb3IgZXh0ZW5zaW9uIG5hbWVzIHdpdGggaWNvbnNcbiAqIC0gRXh0ZW5zaW9uIGV4Y2x1c2lvbiBmdW5jdGlvbmFsaXR5XG4gKiAtIE9wdGltaXplZCBjYWNoaW5nIGZvciBleHRlbnNpb24gZGF0YVxuICogLSBGdWxsLXRleHQgc2VhcmNoIGNhcGFiaWxpdGllc1xuICogXG4gKiBVc2FnZTpcbiAqIEV4dGVuc2lvblNlbGVjdG9yLmluaXQoJ2V4dGVuc2lvbicsIHtcbiAqICAgICB0eXBlOiAncm91dGluZycsICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gdHlwZSAocm91dGluZy9pbnRlcm5hbC9hbGwpXG4gKiAgICAgZXhjbHVkZUV4dGVuc2lvbnM6IFsnMTAxJ10sICAgLy8gRXh0ZW5zaW9ucyB0byBleGNsdWRlXG4gKiAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLCAgICAgICAgICAgLy8gSW5jbHVkZSBlbXB0eSBvcHRpb25cbiAqICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7IC4uLiB9ICAvLyBDaGFuZ2UgY2FsbGJhY2tcbiAqIH0pOyBcbiAqIFxuICogQG1vZHVsZSBFeHRlbnNpb25TZWxlY3RvclxuICovXG5jb25zdCBFeHRlbnNpb25TZWxlY3RvciA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBBY3RpdmUgc2VsZWN0b3IgaW5zdGFuY2VzXG4gICAgICogQHR5cGUge01hcH1cbiAgICAgKi9cbiAgICBpbnN0YW5jZXM6IG5ldyBNYXAoKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIHR5cGU6ICdhbGwnLCAgICAgICAgICAgICAgLy8gRXh0ZW5zaW9uIHR5cGUgKGFsbC9yb3V0aW5nL2ludGVybmFsL3F1ZXVlL2V0Yy4pXG4gICAgICAgIGV4Y2x1ZGVFeHRlbnNpb25zOiBbXSwgICAgLy8gRXh0ZW5zaW9ucyB0byBleGNsdWRlIGZyb20gbGlzdFxuICAgICAgICBpbmNsdWRlRW1wdHk6IGZhbHNlLCAgICAgIC8vIEluY2x1ZGUgZW1wdHkvbm9uZSBvcHRpb25cbiAgICAgICAgcGxhY2Vob2xkZXI6IG51bGwsICAgICAgICAvLyBQbGFjZWhvbGRlciB0ZXh0IChhdXRvLWRldGVjdGVkKVxuICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogW10sICAgIC8vIEFkZGl0aW9uYWwgQ1NTIGNsYXNzZXMgZm9yIGRyb3Bkb3duXG4gICAgICAgIG9uQ2hhbmdlOiBudWxsLCAgICAgICAgICAvLyBDaGFuZ2UgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgb25Mb2FkQ29tcGxldGU6IG51bGwsICAgIC8vIExvYWQgY29tcGxldGUgY2FsbGJhY2tcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uIHNlbGVjdG9yXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRCAoZS5nLiwgJ2V4dGVuc2lvbicpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fG51bGx9IFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgaW5pdChmaWVsZElkLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBpbml0aWFsaXplZFxuICAgICAgICBpZiAodGhpcy5pbnN0YW5jZXMuaGFzKGZpZWxkSWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGhpZGRlbiBpbnB1dCBlbGVtZW50XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgIGlmICghJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBFeHRlbnNpb25TZWxlY3RvcjogSGlkZGVuIGlucHV0IG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGRJZH1gKTtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBNZXJnZSBvcHRpb25zIHdpdGggZGVmYXVsdHNcbiAgICAgICAgY29uc3QgY29uZmlnID0geyAuLi50aGlzLmRlZmF1bHRzLCAuLi5vcHRpb25zIH07XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgY3VycmVudCB2YWx1ZSBhbmQgcmVwcmVzZW50IHRleHQgZnJvbSBkYXRhIG9iamVjdCBpZiBwcm92aWRlZFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YVtmaWVsZElkXSkgfHwgJGhpZGRlbklucHV0LnZhbCgpIHx8ICcnO1xuICAgICAgICBjb25zdCBjdXJyZW50VGV4dCA9IHRoaXMuZGV0ZWN0SW5pdGlhbFRleHQoZmllbGRJZCwgb3B0aW9ucy5kYXRhKSB8fCBjb25maWcucGxhY2Vob2xkZXI7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBBUEkgVVJMIHdpdGggcGFyYW1ldGVycyB1c2luZyB2MyBBUElcbiAgICAgICAgbGV0IGFwaVVybCA9ICcvcGJ4Y29yZS9hcGkvdjMvZXh0ZW5zaW9uczpnZXRGb3JTZWxlY3QnO1xuICAgICAgICBjb25zdCBhcGlQYXJhbXMgPSB7fTtcblxuICAgICAgICAvLyBBZGQgdHlwZSBwYXJhbWV0ZXJcbiAgICAgICAgaWYgKGNvbmZpZy50eXBlICYmIGNvbmZpZy50eXBlICE9PSAnYWxsJykge1xuICAgICAgICAgICAgYXBpUGFyYW1zLnR5cGUgPSBjb25maWcudHlwZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCBleGNsdWRlIHBhcmFtZXRlclxuICAgICAgICBpZiAoY29uZmlnLmV4Y2x1ZGVFeHRlbnNpb25zICYmIGNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBhcGlQYXJhbXMuZXhjbHVkZSA9IGNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucy5qb2luKCcsJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXF1ZXN0IGVtcHR5IG9wdGlvbiBmcm9tIEFQSSBzbyBpdCBhcHBlYXJzIGluIHNlYXJjaCByZXN1bHRzXG4gICAgICAgIGlmIChjb25maWcuaW5jbHVkZUVtcHR5KSB7XG4gICAgICAgICAgICBhcGlQYXJhbXMuaW5jbHVkZUVtcHR5ID0gJ3RydWUnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIGNvbmZpZ3VyYXRpb24gZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgY29uc3QgZHJvcGRvd25Db25maWcgPSB7XG4gICAgICAgICAgICBhcGlVcmw6IGFwaVVybCxcbiAgICAgICAgICAgIGFwaVBhcmFtczogYXBpUGFyYW1zLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGNvbmZpZy5wbGFjZWhvbGRlciB8fCB0aGlzLmdldFBsYWNlaG9sZGVyQnlUeXBlKGNvbmZpZy50eXBlKSxcbiAgICAgICAgICAgIC8vIEN1c3RvbSByZXNwb25zZSBoYW5kbGVyIGZvciBleHRlbnNpb24tc3BlY2lmaWMgcHJvY2Vzc2luZ1xuICAgICAgICAgICAgb25SZXNwb25zZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucHJvY2Vzc0V4dGVuc2lvblJlc3BvbnNlKHJlc3BvbnNlLCBjb25maWcpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCwgJGNob2ljZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2VsZWN0aW9uQ2hhbmdlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0LCAkY2hvaWNlLCBjb25maWcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gUGFzcyB0aGUgb3JpZ2luYWwgZGF0YSBvYmplY3QgZGlyZWN0bHkgdG8gRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICAvLyBUaGlzIGVuc3VyZXMgcHJvcGVyIGhhbmRsaW5nIG9mIGV4aXN0aW5nIHZhbHVlcyBhbmQgdGhlaXIgcmVwcmVzZW50YXRpb25zXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duRGF0YSA9IG9wdGlvbnMuZGF0YSB8fCB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIE92ZXJyaWRlIHRlbXBsYXRlIGZvciBwcm9wZXIgSFRNTCByZW5kZXJpbmdcbiAgICAgICAgZHJvcGRvd25Db25maWcudGVtcGxhdGVzID0ge1xuICAgICAgICAgICAgbWVudTogdGhpcy5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBkZWZhdWx0IGNsYXNzZXMgZm9yIGV4dGVuc2lvbiBkcm9wZG93bnNcbiAgICAgICAgZHJvcGRvd25Db25maWcuYWRkaXRpb25hbENsYXNzZXMgPSBbJ3NlYXJjaCcsIC4uLihjb25maWcuYWRkaXRpb25hbENsYXNzZXMgfHwgW10pXTtcbiAgICAgICAgXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihmaWVsZElkLCBkcm9wZG93bkRhdGEsIGRyb3Bkb3duQ29uZmlnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBpbnN0YW5jZVxuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHtcbiAgICAgICAgICAgIGZpZWxkSWQsXG4gICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICBjdXJyZW50VmFsdWUsXG4gICAgICAgICAgICBjdXJyZW50VGV4dCxcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuc2V0KGZpZWxkSWQsIGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERldGVjdCBpbml0aWFsIHRleHQgZnJvbSBkYXRhIG9iamVjdCBvciBkcm9wZG93blxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgb2JqZWN0IHdpdGggcmVwcmVzZW50IGZpZWxkc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gSW5pdGlhbCB0ZXh0XG4gICAgICovXG4gICAgZGV0ZWN0SW5pdGlhbFRleHQoZmllbGRJZCwgZGF0YSkge1xuICAgICAgICBpZiAoZGF0YSAmJiBkYXRhW2Ake2ZpZWxkSWR9X3JlcHJlc2VudGBdKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YVtgJHtmaWVsZElkfV9yZXByZXNlbnRgXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IHRvIGdldCBmcm9tIGV4aXN0aW5nIGRyb3Bkb3duIHRleHRcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0ZXh0ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Om5vdCguZGVmYXVsdCknKTtcbiAgICAgICAgICAgIGlmICgkdGV4dC5sZW5ndGggJiYgJHRleHQudGV4dCgpLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkdGV4dC5odG1sKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGFwcHJvcHJpYXRlIHBsYWNlaG9sZGVyIHRleHQgYnkgZXh0ZW5zaW9uIHR5cGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIEV4dGVuc2lvbiB0eXBlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUGxhY2Vob2xkZXIgdGV4dFxuICAgICAqL1xuICAgIGdldFBsYWNlaG9sZGVyQnlUeXBlKHR5cGUpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgICAgICBjYXNlICdyb3V0aW5nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLmV4X1NlbGVjdEV4dGVuc2lvbjtcbiAgICAgICAgICAgIGNhc2UgJ2ludGVybmFsJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLmV4X1NlbGVjdEludGVybmFsRXh0ZW5zaW9uO1xuICAgICAgICAgICAgY2FzZSAncXVldWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0UXVldWVFeHRlbnNpb247XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0RXh0ZW5zaW9uO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIEFQSSByZXNwb25zZSBmb3IgZXh0ZW5zaW9uLXNwZWNpZmljIGZvcm1hdHRpbmdcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFByb2Nlc3NlZCByZXNwb25zZVxuICAgICAqL1xuICAgIHByb2Nlc3NFeHRlbnNpb25SZXNwb25zZShyZXNwb25zZSwgY29uZmlnKSB7XG4gICAgICAgIGlmICgocmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlLnN1Y2Nlc3MpICYmIHJlc3BvbnNlLmRhdGEgJiYgQXJyYXkuaXNBcnJheShyZXNwb25zZS5kYXRhKSkge1xuICAgICAgICAgICAgY29uc3QgcHJvY2Vzc2VkUmVzdWx0cyA9IHJlc3BvbnNlLmRhdGEubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGxldCBkaXNwbGF5VGV4dCA9IGl0ZW0ucmVwcmVzZW50IHx8IGl0ZW0ubmFtZSB8fCBpdGVtLnRleHQgfHwgaXRlbS52YWx1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBcHBseSBIVE1MIHNhbml0aXphdGlvbiBmb3IgZXh0ZW5zaW9uIGNvbnRlbnQgd2l0aCBpY29uc1xuICAgICAgICAgICAgICAgIGlmIChkaXNwbGF5VGV4dCAmJiB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlzcGxheVRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQoZGlzcGxheVRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSB8fCBpdGVtLmlkLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBkaXNwbGF5VGV4dCxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogZGlzcGxheVRleHQsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGl0ZW0udHlwZSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogaXRlbS50eXBlTG9jYWxpemVkIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogaXRlbS5kaXNhYmxlZCB8fCBmYWxzZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlc3VsdHM6IHByb2Nlc3NlZFJlc3VsdHNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsIFxuICAgICAgICAgICAgcmVzdWx0czogW10gXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBTZWxlY3RlZCB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gU2VsZWN0ZWQgdGV4dFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkY2hvaWNlIC0gU2VsZWN0ZWQgY2hvaWNlIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGhhbmRsZVNlbGVjdGlvbkNoYW5nZShmaWVsZElkLCB2YWx1ZSwgdGV4dCwgJGNob2ljZSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2Ugc3RhdGVcbiAgICAgICAgaW5zdGFuY2UuY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gdGV4dDtcbiAgICAgICAgXG4gICAgICAgIC8vIENSSVRJQ0FMOiBVcGRhdGUgaGlkZGVuIGlucHV0IGZpZWxkIHRvIG1haW50YWluIHN5bmNocm9uaXphdGlvblxuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICBpZiAoJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENhbGwgY3VzdG9tIG9uQ2hhbmdlIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25maWcub25DaGFuZ2UodmFsdWUsIHRleHQsICRjaG9pY2UpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOb3RpZnkgZm9ybSBvZiBjaGFuZ2VzXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXN0b20gZHJvcGRvd24gbWVudSB0ZW1wbGF0ZSB3aXRoIGNhdGVnb3JpZXMgc3VwcG9ydFxuICAgICAqIFN5bmNocm9uaXplZCB3aXRoIEV4dGVuc2lvbnNBUEkuY3VzdG9tRHJvcGRvd25NZW51IGxvZ2ljIGZvciBjb21wYXRpYmlsaXR5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZmllbGRzIC0gRmllbGQgY29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgZm9yIGRyb3Bkb3duIG1lbnVcbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCBbXTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgbGV0IG9sZFR5cGUgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSAkLmVhY2ggZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBvcmlnaW5hbCBFeHRlbnNpb25zQVBJLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBvcHRpb25bZmllbGRzLnZhbHVlXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBvcHRpb25bZmllbGRzLnRleHRdIHx8IG9wdGlvbltmaWVsZHMubmFtZV0gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCB0eXBlID0gb3B0aW9uLnR5cGUgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCB0eXBlTG9jYWxpemVkID0gb3B0aW9uLnR5cGVMb2NhbGl6ZWQgfHwgJyc7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBjYXRlZ29yeSBoZWFkZXIgaWYgdHlwZSBjaGFuZ2VkIC0gZXhhY3Qgc2FtZSBsb2dpYyBhcyBFeHRlbnNpb25zQVBJLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgaWYgKHR5cGUgIT09IG9sZFR5cGUpIHtcbiAgICAgICAgICAgICAgICBvbGRUeXBlID0gdHlwZTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiZGl2aWRlclwiPjwvZGl2Pic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXFx0PGRpdiBjbGFzcz1cImhlYWRlclwiPic7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnXFx0PGkgY2xhc3M9XCJ0YWdzIGljb25cIj48L2k+JztcbiAgICAgICAgICAgICAgICBodG1sICs9IHR5cGVMb2NhbGl6ZWQ7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIEZvbWFudGljIFVJIHRvIHdvcmsgY29ycmVjdGx5IHdpdGggSFRNTCBjb250ZW50LCBkYXRhLXRleHQgc2hvdWxkIGNvbnRhaW4gdGhlIEhUTUxcbiAgICAgICAgICAgIC8vIHRoYXQgd2lsbCBiZSBkaXNwbGF5ZWQgd2hlbiB0aGUgaXRlbSBpcyBzZWxlY3RlZC4gVGV4dCBpcyBhbHJlYWR5IHNhbml0aXplZCBpbiBwcm9jZXNzRXh0ZW5zaW9uUmVzcG9uc2UuXG4gICAgICAgICAgICBjb25zdCBtYXliZVRleHQgPSB0ZXh0ID8gYGRhdGEtdGV4dD1cIiR7dGV4dC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyl9XCJgIDogJyc7XG4gICAgICAgICAgICBjb25zdCBtYXliZURpc2FibGVkID0gb3B0aW9uLmRpc2FibGVkID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIiR7bWF5YmVEaXNhYmxlZH1pdGVtXCIgZGF0YS12YWx1ZT1cIiR7RXh0ZW5zaW9uU2VsZWN0b3IuZXNjYXBlSHRtbCh2YWx1ZSl9XCIke21heWJlVGV4dH0+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gdGV4dDsgLy8gVGV4dCBpcyBhbHJlYWR5IHNhbml0aXplZCBpbiBwcm9jZXNzRXh0ZW5zaW9uUmVzcG9uc2VcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgdmFsdWUgcHJvZ3JhbW1hdGljYWxseSB3aXRoIG9wdGlvbmFsIHRleHRcbiAgICAgKiBWNS4wOiBFbmhhbmNlZCB0byBzdXBwb3J0IHNldHRpbmcgYm90aCB2YWx1ZSBhbmQgZGlzcGxheSB0ZXh0XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBEaXNwbGF5IHRleHQgKG9wdGlvbmFsLCBpZiBwcm92aWRlZCB3aWxsIHVwZGF0ZSBkaXNwbGF5KVxuICAgICAqL1xuICAgIHNldFZhbHVlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0ID0gbnVsbCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBFeHRlbnNpb25TZWxlY3RvcjogSW5zdGFuY2Ugbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB2YWx1ZVxuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICBpZiAoJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gZGlzcGxheVxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZElkfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gSGFuZGxlIGVtcHR5IHZhbHVlIHNwZWNpYWxseVxuICAgICAgICAgICAgaWYgKHZhbHVlID09PSAnJyB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIHRoZSBkcm9wZG93blxuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkdGV4dEVsZW1lbnQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHRleHRFbGVtZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZGVmYXVsdCBjbGFzcyBmb3IgcGxhY2Vob2xkZXIgc3R5bGVcbiAgICAgICAgICAgICAgICAgICAgJHRleHRFbGVtZW50LmFkZENsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gSWYgdGV4dCBpcyBwcm92aWRlZCwgdXBkYXRlIGJvdGggdmFsdWUgYW5kIHRleHRcbiAgICAgICAgICAgIGVsc2UgaWYgKHRleHQgIT09IG51bGwgJiYgdGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdGVtcG9yYXJ5IG1lbnUgaXRlbSB3aXRoIHRoZSBuZXcgdGV4dCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ0l0ZW0gPSAkbWVudS5maW5kKGAuaXRlbVtkYXRhLXZhbHVlPVwiJHt2YWx1ZX1cIl1gKTtcblxuICAgICAgICAgICAgICAgIGlmICghZXhpc3RpbmdJdGVtLmxlbmd0aCAmJiB2YWx1ZSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIHRlbXBvcmFyeSBpdGVtIGZvciBtb2JpbGUgbnVtYmVyIG9yIG90aGVyIGR5bmFtaWMgdmFsdWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHRoaXMuZXNjYXBlSHRtbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCh0ZXh0KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiB0ZXh0O1xuICAgICAgICAgICAgICAgICAgICAkbWVudS5hcHBlbmQoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7c2FmZVZhbHVlfVwiIGRhdGEtdGV4dD1cIiR7c2FmZVRleHQucmVwbGFjZSgvXCIvZywgJyZxdW90OycpfVwiPiR7c2FmZVRleHR9PC9kaXY+YCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHNlbGVjdGVkIHZhbHVlIGluIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBGb3JjZSB0ZXh0IHVwZGF0ZSBpZiBTZW1hbnRpYyBVSSBkaWRuJ3QgcGljayBpdCB1cFxuICAgICAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgICAgIGlmICgkdGV4dEVsZW1lbnQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ZXh0RWxlbWVudC5odG1sKHRleHQpO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZGVmYXVsdCBjbGFzcyB0byBzaG93IHRleHQgYXMgc2VsZWN0ZWQsIG5vdCBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICAgICAkdGV4dEVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEp1c3Qgc2V0IHRoZSB2YWx1ZSwgbGV0IGRyb3Bkb3duIGhhbmRsZSB0ZXh0XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRlZmF1bHQgY2xhc3MgaWYgdmFsdWUgaXMgc2V0XG4gICAgICAgICAgICAgICAgY29uc3QgJHRleHRFbGVtZW50ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCR0ZXh0RWxlbWVudC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRleHRFbGVtZW50LnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGluc3RhbmNlIHN0YXRlXG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQgfHwgJyc7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgZm9yIGZvcm0gcHJvY2Vzc2luZ1xuICAgICAgICAkaGlkZGVuSW5wdXQudHJpZ2dlcignY2hhbmdlJyk7XG5cbiAgICAgICAgLy8gTm90aWZ5IGZvcm0gb2YgY2hhbmdlc1xuICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uZGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgZGlzcGxheSB0ZXh0IHdpdGhvdXQgY2hhbmdpbmcgdmFsdWVcbiAgICAgKiBWNS4wOiBOZXcgbWV0aG9kIGZvciB1cGRhdGluZyBkaXNwbGF5IHRleHQgb25seVxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gRGlzcGxheSB0ZXh0IHRvIHNldFxuICAgICAqL1xuICAgIHNldFRleHQoZmllbGRJZCwgdGV4dCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBFeHRlbnNpb25TZWxlY3RvcjogSW5zdGFuY2Ugbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgaWYgKCR0ZXh0RWxlbWVudC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBTYW5pdGl6ZSB0ZXh0IGJlZm9yZSBzZXR0aW5nXG4gICAgICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplRXh0ZW5zaW9uc0FwaUNvbnRlbnQodGV4dClcbiAgICAgICAgICAgICAgICAgICAgOiB0ZXh0O1xuICAgICAgICAgICAgICAgICR0ZXh0RWxlbWVudC5odG1sKHNhZmVUZXh0KTtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZGVmYXVsdCBjbGFzcyB0byBzaG93IHRleHQgYXMgc2VsZWN0ZWQsIG5vdCBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICR0ZXh0RWxlbWVudC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gdGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgdmFsdWVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBDdXJyZW50IHZhbHVlXG4gICAgICovXG4gICAgZ2V0VmFsdWUoZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlID8gaW5zdGFuY2UuY3VycmVudFZhbHVlIDogbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGNsZWFyKGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgLy8gVXNlIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgdG8gY2xlYXJcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXIoZmllbGRJZCk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBkZWZhdWx0IGNsYXNzIHRvIHNob3cgcGxhY2Vob2xkZXIgc3R5bGVcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgICAgIGlmICgkdGV4dEVsZW1lbnQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICR0ZXh0RWxlbWVudC5hZGRDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGluc3RhbmNlIHN0YXRlXG4gICAgICAgICAgICBpbnN0YW5jZS5jdXJyZW50VmFsdWUgPSBudWxsO1xuICAgICAgICAgICAgaW5zdGFuY2UuY3VycmVudFRleHQgPSBudWxsO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIGRyb3Bkb3duIGRhdGFcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICByZWZyZXNoKGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGlzIHN0aWxsIGF0dGFjaGVkIHRvIERPTSBiZWZvcmUgcmVmcmVzaGluZ1xuICAgICAgICAgICAgaWYgKCQuY29udGFpbnMoZG9jdW1lbnQsICRkcm9wZG93blswXSkpIHtcbiAgICAgICAgICAgICAgICAvLyBUZW1wb3JhcmlseSBkaXNhYmxlIGFuaW1hdGlvbnMgdG8gcHJldmVudCBET00gZXJyb3JzXG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdoaWRlJyk7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICAgICAgc2lsZW50OiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGNhY2hlIGZvciBleHRlbnNpb25zIEFQSVxuICAgICAqIENhbGwgdGhpcyBhZnRlciBleHRlbnNpb24gb3BlcmF0aW9ucyAoYWRkL2VkaXQvZGVsZXRlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gT3B0aW9uYWw6IHNwZWNpZmljIHR5cGUgdG8gY2xlYXIgKCdyb3V0aW5nJywgJ2ludGVybmFsJywgZXRjLilcbiAgICAgKi9cbiAgICBjbGVhckNhY2hlKHR5cGUgPSBudWxsKSB7XG4gICAgICAgIGlmICh0eXBlKSB7XG4gICAgICAgICAgICAvLyBDbGVhciBjYWNoZSBmb3Igc3BlY2lmaWMgdHlwZVxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5jbGVhckNhY2hlRm9yKCcvcGJ4Y29yZS9hcGkvdjMvZXh0ZW5zaW9uczpnZXRGb3JTZWxlY3QnLCB7IHR5cGUgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDbGVhciBhbGwgZXh0ZW5zaW9ucyBjYWNoZVxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5jbGVhckNhY2hlRm9yKCcvcGJ4Y29yZS9hcGkvdjMvZXh0ZW5zaW9uczpnZXRGb3JTZWxlY3QnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCBhbGwgZXh0ZW5zaW9uIGRyb3Bkb3ducyBvbiB0aGUgcGFnZVxuICAgICAqIFRoaXMgd2lsbCBmb3JjZSB0aGVtIHRvIHJlbG9hZCBkYXRhIGZyb20gc2VydmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBPcHRpb25hbDogc3BlY2lmaWMgdHlwZSB0byByZWZyZXNoICgncm91dGluZycsICdpbnRlcm5hbCcsIGV0Yy4pXG4gICAgICovXG4gICAgcmVmcmVzaEFsbCh0eXBlID0gbnVsbCkge1xuICAgICAgICAvLyBDbGVhciBjYWNoZSBmaXJzdFxuICAgICAgICB0aGlzLmNsZWFyQ2FjaGUodHlwZSk7XG5cbiAgICAgICAgLy8gUmVmcmVzaCBlYWNoIGFjdGl2ZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSwgZmllbGRJZCkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0eXBlIHx8IGluc3RhbmNlLmNvbmZpZy50eXBlID09PSB0eXBlKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgZHJvcGRvd24gYW5kIHJlbG9hZFxuICAgICAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXIoZmllbGRJZCk7XG5cbiAgICAgICAgICAgICAgICAvLyBTYWZlbHkgcmVmcmVzaCBkcm9wZG93blxuICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaChmaWVsZElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZXh0ZW5zaW9uIGV4Y2x1c2lvbiBsaXN0IGZvciBleGlzdGluZyBpbnN0YW5jZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBleGNsdWRlRXh0ZW5zaW9ucyAtIEV4dGVuc2lvbnMgdG8gZXhjbHVkZVxuICAgICAqL1xuICAgIHVwZGF0ZUV4Y2x1c2lvbnMoZmllbGRJZCwgZXhjbHVkZUV4dGVuc2lvbnMgPSBbXSkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBFeHRlbnNpb25TZWxlY3RvcjogSW5zdGFuY2Ugbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY29uZmlndXJhdGlvblxuICAgICAgICBpbnN0YW5jZS5jb25maWcuZXhjbHVkZUV4dGVuc2lvbnMgPSBleGNsdWRlRXh0ZW5zaW9ucztcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGNhY2hlIGZvciB0aGlzIHNwZWNpZmljIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgY2FjaGVLZXkgPSB0aGlzLmdlbmVyYXRlQ2FjaGVLZXkoaW5zdGFuY2UuY29uZmlnKTtcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5jbGVhckNhY2hlRm9yKCcvcGJ4Y29yZS9hcGkvdjMvZXh0ZW5zaW9uczpnZXRGb3JTZWxlY3QnLCBjYWNoZUtleSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZWZyZXNoIGRyb3Bkb3duXG4gICAgICAgIHRoaXMucmVmcmVzaChmaWVsZElkKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGNhY2hlIGtleSBiYXNlZCBvbiBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIEV4dGVuc2lvbiBzZWxlY3RvciBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge29iamVjdH0gQ2FjaGUga2V5IHBhcmFtZXRlcnNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUNhY2hlS2V5KGNvbmZpZykge1xuICAgICAgICBjb25zdCBjYWNoZVBhcmFtcyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvbmZpZy50eXBlICYmIGNvbmZpZy50eXBlICE9PSAnYWxsJykge1xuICAgICAgICAgICAgY2FjaGVQYXJhbXMudHlwZSA9IGNvbmZpZy50eXBlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoY29uZmlnLmV4Y2x1ZGVFeHRlbnNpb25zICYmIGNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjYWNoZVBhcmFtcy5leGNsdWRlID0gY29uZmlnLmV4Y2x1ZGVFeHRlbnNpb25zLmpvaW4oJywnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNhY2hlUGFyYW1zO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBpbnN0YW5jZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICBkZXN0cm95KGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGZyb20gaW5zdGFuY2VzXG4gICAgICAgICAgICB0aGlzLmluc3RhbmNlcy5kZWxldGUoZmllbGRJZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIHRvIHByZXZlbnQgWFNTXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZGl2LnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgcmV0dXJuIGRpdi5pbm5lckhUTUw7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFeHRlbnNpb25TZWxlY3Rvcjtcbn0iXX0=