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
    var currentText = this.detectInitialText(fieldId, options.data) || config.placeholder; // Build API URL with parameters

    var apiUrl = '/pbxcore/api/extensions/getForSelect';
    var apiParams = {}; // Add type parameter

    if (config.type && config.type !== 'all') {
      apiParams.type = config.type;
    } // Add exclude parameter


    if (config.excludeExtensions && config.excludeExtensions.length > 0) {
      apiParams.exclude = config.excludeExtensions.join(',');
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
    }; // Add empty option if needed

    if (config.includeEmpty) {
      dropdownConfig.emptyOption = {
        key: '',
        value: globalTranslate.ex_SelectExtension || 'Select extension'
      };
    } // Pass the original data object directly to DynamicDropdownBuilder
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
        return globalTranslate.ex_SelectExtension || 'Select extension';

      case 'internal':
        return globalTranslate.ex_SelectInternalExtension || 'Select internal extension';

      case 'queue':
        return globalTranslate.ex_SelectQueueExtension || 'Select queue extension';

      default:
        return globalTranslate.ex_SelectExtension || 'Select extension';
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
   * Synchronized with Extensions.customDropdownMenu logic for compatibility
   * 
   * @param {object} response - Response from API
   * @param {object} fields - Field configuration
   * @returns {string} HTML for dropdown menu
   */
  customDropdownMenu: function customDropdownMenu(response, fields) {
    var values = response[fields.values] || [];
    var html = '';
    var oldType = ''; // Use $.each for compatibility with original Extensions.customDropdownMenu

    $.each(values, function (index, option) {
      var value = option[fields.value] || '';
      var text = option[fields.text] || option[fields.name] || '';
      var type = option.type || '';
      var typeLocalized = option.typeLocalized || ''; // Add category header if type changed - exact same logic as Extensions.customDropdownMenu

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
    // Delegate to DynamicDropdownBuilder
    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      $dropdown.dropdown('refresh');
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
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/extensions/getForSelect', {
        type: type
      });
    } else {
      // Clear all extensions cache
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/extensions/getForSelect');
    }
  },

  /**
   * Refresh all extension dropdowns on the page
   * This will force them to reload data from server
   * @param {string} type - Optional: specific type to refresh ('routing', 'internal', etc.)
   */
  refreshAll: function refreshAll() {
    var type = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    // Clear cache first
    this.clearCache(type); // Refresh each active instance

    this.instances.forEach(function (instance, fieldId) {
      if (!type || instance.config.type === type) {
        // Clear dropdown and reload
        DynamicDropdownBuilder.clear(fieldId); // Reinitialize dropdown to trigger new API request

        var $dropdown = $("#".concat(fieldId, "-dropdown"));

        if ($dropdown.length) {
          $dropdown.dropdown('refresh');
        }
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
    DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/extensions/getForSelect', cacheKey); // Refresh dropdown

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZXh0ZW5zaW9uLXNlbGVjdG9yLmpzIl0sIm5hbWVzIjpbIkV4dGVuc2lvblNlbGVjdG9yIiwiaW5zdGFuY2VzIiwiTWFwIiwiZGVmYXVsdHMiLCJ0eXBlIiwiZXhjbHVkZUV4dGVuc2lvbnMiLCJpbmNsdWRlRW1wdHkiLCJwbGFjZWhvbGRlciIsImFkZGl0aW9uYWxDbGFzc2VzIiwib25DaGFuZ2UiLCJvbkxvYWRDb21wbGV0ZSIsImluaXQiLCJmaWVsZElkIiwib3B0aW9ucyIsImhhcyIsImdldCIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsImNvbmZpZyIsImN1cnJlbnRWYWx1ZSIsImRhdGEiLCJ2YWwiLCJjdXJyZW50VGV4dCIsImRldGVjdEluaXRpYWxUZXh0IiwiYXBpVXJsIiwiYXBpUGFyYW1zIiwiZXhjbHVkZSIsImpvaW4iLCJkcm9wZG93bkNvbmZpZyIsImdldFBsYWNlaG9sZGVyQnlUeXBlIiwib25SZXNwb25zZSIsInJlc3BvbnNlIiwicHJvY2Vzc0V4dGVuc2lvblJlc3BvbnNlIiwidmFsdWUiLCJ0ZXh0IiwiJGNob2ljZSIsImhhbmRsZVNlbGVjdGlvbkNoYW5nZSIsImVtcHR5T3B0aW9uIiwia2V5IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfU2VsZWN0RXh0ZW5zaW9uIiwiZHJvcGRvd25EYXRhIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW5zdGFuY2UiLCJzZXQiLCIkZHJvcGRvd24iLCIkdGV4dCIsImZpbmQiLCJ0cmltIiwiaHRtbCIsImV4X1NlbGVjdEludGVybmFsRXh0ZW5zaW9uIiwiZXhfU2VsZWN0UXVldWVFeHRlbnNpb24iLCJyZXN1bHQiLCJzdWNjZXNzIiwiQXJyYXkiLCJpc0FycmF5IiwicHJvY2Vzc2VkUmVzdWx0cyIsIm1hcCIsIml0ZW0iLCJkaXNwbGF5VGV4dCIsInJlcHJlc2VudCIsIm5hbWUiLCJTZWN1cml0eVV0aWxzIiwic2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCIsImlkIiwidHlwZUxvY2FsaXplZCIsImRpc2FibGVkIiwicmVzdWx0cyIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImZpZWxkcyIsInZhbHVlcyIsIm9sZFR5cGUiLCJlYWNoIiwiaW5kZXgiLCJvcHRpb24iLCJtYXliZVRleHQiLCJyZXBsYWNlIiwibWF5YmVEaXNhYmxlZCIsImVzY2FwZUh0bWwiLCJzZXRWYWx1ZSIsImRyb3Bkb3duIiwiJHRleHRFbGVtZW50IiwiYWRkQ2xhc3MiLCIkbWVudSIsImV4aXN0aW5nSXRlbSIsInNhZmVWYWx1ZSIsInNhZmVUZXh0IiwiYXBwZW5kIiwicmVtb3ZlQ2xhc3MiLCJ0cmlnZ2VyIiwic2V0VGV4dCIsImdldFZhbHVlIiwiY2xlYXIiLCJyZWZyZXNoIiwiY2xlYXJDYWNoZSIsImNsZWFyQ2FjaGVGb3IiLCJyZWZyZXNoQWxsIiwiZm9yRWFjaCIsInVwZGF0ZUV4Y2x1c2lvbnMiLCJjYWNoZUtleSIsImdlbmVyYXRlQ2FjaGVLZXkiLCJjYWNoZVBhcmFtcyIsImRlc3Ryb3kiLCJkaXYiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJ0ZXh0Q29udGVudCIsImlubmVySFRNTCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsaUJBQWlCLEdBQUc7QUFFdEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEs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ZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBnbG9iYWxUcmFuc2xhdGUsIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIFNlY3VyaXR5VXRpbHMsIEZvcm0gKi9cblxuLyoqXG4gKiBFeHRlbnNpb25TZWxlY3RvciAtIEV4dGVuc2lvbi1zcGVjaWZpYyB3cmFwcGVyIG92ZXIgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICogXG4gKiBUaGlzIGNvbXBvbmVudCBidWlsZHMgdXBvbiBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHRvIHByb3ZpZGUgZXh0ZW5zaW9uLXNwZWNpZmljIGZlYXR1cmVzOlxuICogLSBTdXBwb3J0IGZvciBleHRlbnNpb24gdHlwZXMvY2F0ZWdvcmllcyAocm91dGluZywgaW50ZXJuYWwsIGFsbCwgZXRjLilcbiAqIC0gUHJvcGVyIEhUTUwgcmVuZGVyaW5nIGZvciBleHRlbnNpb24gbmFtZXMgd2l0aCBpY29uc1xuICogLSBFeHRlbnNpb24gZXhjbHVzaW9uIGZ1bmN0aW9uYWxpdHlcbiAqIC0gT3B0aW1pemVkIGNhY2hpbmcgZm9yIGV4dGVuc2lvbiBkYXRhXG4gKiAtIEZ1bGwtdGV4dCBzZWFyY2ggY2FwYWJpbGl0aWVzXG4gKiBcbiAqIFVzYWdlOlxuICogRXh0ZW5zaW9uU2VsZWN0b3IuaW5pdCgnZXh0ZW5zaW9uJywge1xuICogICAgIHR5cGU6ICdyb3V0aW5nJywgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiB0eXBlIChyb3V0aW5nL2ludGVybmFsL2FsbClcbiAqICAgICBleGNsdWRlRXh0ZW5zaW9uczogWycxMDEnXSwgICAvLyBFeHRlbnNpb25zIHRvIGV4Y2x1ZGVcbiAqICAgICBpbmNsdWRlRW1wdHk6IHRydWUsICAgICAgICAgICAvLyBJbmNsdWRlIGVtcHR5IG9wdGlvblxuICogICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHsgLi4uIH0gIC8vIENoYW5nZSBjYWxsYmFja1xuICogfSk7XG4gKiBcbiAqIEBtb2R1bGUgRXh0ZW5zaW9uU2VsZWN0b3JcbiAqL1xuY29uc3QgRXh0ZW5zaW9uU2VsZWN0b3IgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogQWN0aXZlIHNlbGVjdG9yIGluc3RhbmNlc1xuICAgICAqIEB0eXBlIHtNYXB9XG4gICAgICovXG4gICAgaW5zdGFuY2VzOiBuZXcgTWFwKCksXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBkZWZhdWx0czoge1xuICAgICAgICB0eXBlOiAnYWxsJywgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiB0eXBlIChhbGwvcm91dGluZy9pbnRlcm5hbC9xdWV1ZS9ldGMuKVxuICAgICAgICBleGNsdWRlRXh0ZW5zaW9uczogW10sICAgIC8vIEV4dGVuc2lvbnMgdG8gZXhjbHVkZSBmcm9tIGxpc3RcbiAgICAgICAgaW5jbHVkZUVtcHR5OiBmYWxzZSwgICAgICAvLyBJbmNsdWRlIGVtcHR5L25vbmUgb3B0aW9uXG4gICAgICAgIHBsYWNlaG9sZGVyOiBudWxsLCAgICAgICAgLy8gUGxhY2Vob2xkZXIgdGV4dCAoYXV0by1kZXRlY3RlZClcbiAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFtdLCAgICAvLyBBZGRpdGlvbmFsIENTUyBjbGFzc2VzIGZvciBkcm9wZG93blxuICAgICAgICBvbkNoYW5nZTogbnVsbCwgICAgICAgICAgLy8gQ2hhbmdlIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICAgIG9uTG9hZENvbXBsZXRlOiBudWxsLCAgICAvLyBMb2FkIGNvbXBsZXRlIGNhbGxiYWNrXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSUQgKGUuZy4sICdleHRlbnNpb24nKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICogQHJldHVybnMge29iamVjdHxudWxsfSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXQoZmllbGRJZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgaWYgKHRoaXMuaW5zdGFuY2VzLmhhcyhmaWVsZElkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBoaWRkZW4gaW5wdXQgZWxlbWVudFxuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgRXh0ZW5zaW9uU2VsZWN0b3I6IEhpZGRlbiBpbnB1dCBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTWVyZ2Ugb3B0aW9ucyB3aXRoIGRlZmF1bHRzXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHsgLi4udGhpcy5kZWZhdWx0cywgLi4ub3B0aW9ucyB9O1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWUgYW5kIHJlcHJlc2VudCB0ZXh0IGZyb20gZGF0YSBvYmplY3QgaWYgcHJvdmlkZWRcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gKG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGFbZmllbGRJZF0pIHx8ICRoaWRkZW5JbnB1dC52YWwoKSB8fCAnJztcbiAgICAgICAgY29uc3QgY3VycmVudFRleHQgPSB0aGlzLmRldGVjdEluaXRpYWxUZXh0KGZpZWxkSWQsIG9wdGlvbnMuZGF0YSkgfHwgY29uZmlnLnBsYWNlaG9sZGVyO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgQVBJIFVSTCB3aXRoIHBhcmFtZXRlcnNcbiAgICAgICAgbGV0IGFwaVVybCA9ICcvcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QnO1xuICAgICAgICBjb25zdCBhcGlQYXJhbXMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB0eXBlIHBhcmFtZXRlclxuICAgICAgICBpZiAoY29uZmlnLnR5cGUgJiYgY29uZmlnLnR5cGUgIT09ICdhbGwnKSB7XG4gICAgICAgICAgICBhcGlQYXJhbXMudHlwZSA9IGNvbmZpZy50eXBlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZXhjbHVkZSBwYXJhbWV0ZXJcbiAgICAgICAgaWYgKGNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucyAmJiBjb25maWcuZXhjbHVkZUV4dGVuc2lvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgYXBpUGFyYW1zLmV4Y2x1ZGUgPSBjb25maWcuZXhjbHVkZUV4dGVuc2lvbnMuam9pbignLCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gY29uZmlndXJhdGlvbiBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCBkcm9wZG93bkNvbmZpZyA9IHtcbiAgICAgICAgICAgIGFwaVVybDogYXBpVXJsLFxuICAgICAgICAgICAgYXBpUGFyYW1zOiBhcGlQYXJhbXMsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogY29uZmlnLnBsYWNlaG9sZGVyIHx8IHRoaXMuZ2V0UGxhY2Vob2xkZXJCeVR5cGUoY29uZmlnLnR5cGUpLFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDdXN0b20gcmVzcG9uc2UgaGFuZGxlciBmb3IgZXh0ZW5zaW9uLXNwZWNpZmljIHByb2Nlc3NpbmdcbiAgICAgICAgICAgIG9uUmVzcG9uc2U6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NFeHRlbnNpb25SZXNwb25zZShyZXNwb25zZSwgY29uZmlnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQsICRjaG9pY2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNlbGVjdGlvbkNoYW5nZShmaWVsZElkLCB2YWx1ZSwgdGV4dCwgJGNob2ljZSwgY29uZmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZW1wdHkgb3B0aW9uIGlmIG5lZWRlZFxuICAgICAgICBpZiAoY29uZmlnLmluY2x1ZGVFbXB0eSkge1xuICAgICAgICAgICAgZHJvcGRvd25Db25maWcuZW1wdHlPcHRpb24gPSB7XG4gICAgICAgICAgICAgICAga2V5OiAnJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlbGVjdEV4dGVuc2lvbiB8fCAnU2VsZWN0IGV4dGVuc2lvbidcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFBhc3MgdGhlIG9yaWdpbmFsIGRhdGEgb2JqZWN0IGRpcmVjdGx5IHRvIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHByb3BlciBoYW5kbGluZyBvZiBleGlzdGluZyB2YWx1ZXMgYW5kIHRoZWlyIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICBjb25zdCBkcm9wZG93bkRhdGEgPSBvcHRpb25zLmRhdGEgfHwge307XG4gICAgICAgIFxuICAgICAgICAvLyBPdmVycmlkZSB0ZW1wbGF0ZSBmb3IgcHJvcGVyIEhUTUwgcmVuZGVyaW5nXG4gICAgICAgIGRyb3Bkb3duQ29uZmlnLnRlbXBsYXRlcyA9IHtcbiAgICAgICAgICAgIG1lbnU6IHRoaXMuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgZGVmYXVsdCBjbGFzc2VzIGZvciBleHRlbnNpb24gZHJvcGRvd25zXG4gICAgICAgIGRyb3Bkb3duQ29uZmlnLmFkZGl0aW9uYWxDbGFzc2VzID0gWydzZWFyY2gnLCAuLi4oY29uZmlnLmFkZGl0aW9uYWxDbGFzc2VzIHx8IFtdKV07XG4gICAgICAgIFxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZmllbGRJZCwgZHJvcGRvd25EYXRhLCBkcm9wZG93bkNvbmZpZyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2VcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB7XG4gICAgICAgICAgICBmaWVsZElkLFxuICAgICAgICAgICAgY29uZmlnLFxuICAgICAgICAgICAgY3VycmVudFZhbHVlLFxuICAgICAgICAgICAgY3VycmVudFRleHQsXG4gICAgICAgICAgICAkaGlkZGVuSW5wdXRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIGluc3RhbmNlXG4gICAgICAgIHRoaXMuaW5zdGFuY2VzLnNldChmaWVsZElkLCBpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXRlY3QgaW5pdGlhbCB0ZXh0IGZyb20gZGF0YSBvYmplY3Qgb3IgZHJvcGRvd25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIG9iamVjdCB3aXRoIHJlcHJlc2VudCBmaWVsZHNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IEluaXRpYWwgdGV4dFxuICAgICAqL1xuICAgIGRldGVjdEluaXRpYWxUZXh0KGZpZWxkSWQsIGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEgJiYgZGF0YVtgJHtmaWVsZElkfV9yZXByZXNlbnRgXSkge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGFbYCR7ZmllbGRJZH1fcmVwcmVzZW50YF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRyeSB0byBnZXQgZnJvbSBleGlzdGluZyBkcm9wZG93biB0ZXh0XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCAkdGV4dCA9ICRkcm9wZG93bi5maW5kKCcudGV4dDpub3QoLmRlZmF1bHQpJyk7XG4gICAgICAgICAgICBpZiAoJHRleHQubGVuZ3RoICYmICR0ZXh0LnRleHQoKS50cmltKCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHRleHQuaHRtbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBhcHByb3ByaWF0ZSBwbGFjZWhvbGRlciB0ZXh0IGJ5IGV4dGVuc2lvbiB0eXBlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBFeHRlbnNpb24gdHlwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFBsYWNlaG9sZGVyIHRleHRcbiAgICAgKi9cbiAgICBnZXRQbGFjZWhvbGRlckJ5VHlwZSh0eXBlKSB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgY2FzZSAncm91dGluZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGdsb2JhbFRyYW5zbGF0ZS5leF9TZWxlY3RFeHRlbnNpb24gfHwgJ1NlbGVjdCBleHRlbnNpb24nO1xuICAgICAgICAgICAgY2FzZSAnaW50ZXJuYWwnOlxuICAgICAgICAgICAgICAgIHJldHVybiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0SW50ZXJuYWxFeHRlbnNpb24gfHwgJ1NlbGVjdCBpbnRlcm5hbCBleHRlbnNpb24nO1xuICAgICAgICAgICAgY2FzZSAncXVldWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VsZWN0UXVldWVFeHRlbnNpb24gfHwgJ1NlbGVjdCBxdWV1ZSBleHRlbnNpb24nO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLmV4X1NlbGVjdEV4dGVuc2lvbiB8fCAnU2VsZWN0IGV4dGVuc2lvbic7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgQVBJIHJlc3BvbnNlIGZvciBleHRlbnNpb24tc3BlY2lmaWMgZm9ybWF0dGluZ1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge29iamVjdH0gUHJvY2Vzc2VkIHJlc3BvbnNlXG4gICAgICovXG4gICAgcHJvY2Vzc0V4dGVuc2lvblJlc3BvbnNlKHJlc3BvbnNlLCBjb25maWcpIHtcbiAgICAgICAgaWYgKChyZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2Uuc3VjY2VzcykgJiYgcmVzcG9uc2UuZGF0YSAmJiBBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9jZXNzZWRSZXN1bHRzID0gcmVzcG9uc2UuZGF0YS5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGRpc3BsYXlUZXh0ID0gaXRlbS5yZXByZXNlbnQgfHwgaXRlbS5uYW1lIHx8IGl0ZW0udGV4dCB8fCBpdGVtLnZhbHVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFwcGx5IEhUTUwgc2FuaXRpemF0aW9uIGZvciBleHRlbnNpb24gY29udGVudCB3aXRoIGljb25zXG4gICAgICAgICAgICAgICAgaWYgKGRpc3BsYXlUZXh0ICYmIHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBkaXNwbGF5VGV4dCA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudChkaXNwbGF5VGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlIHx8IGl0ZW0uaWQsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGRpc3BsYXlUZXh0LFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBkaXNwbGF5VGV4dCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogaXRlbS50eXBlIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiBpdGVtLnR5cGVMb2NhbGl6ZWQgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBpdGVtLmRpc2FibGVkIHx8IGZhbHNlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVzdWx0czogcHJvY2Vzc2VkUmVzdWx0c1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHsgXG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSwgXG4gICAgICAgICAgICByZXN1bHRzOiBbXSBcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBkcm9wZG93biBzZWxlY3Rpb24gY2hhbmdlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFNlbGVjdGVkIHZhbHVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBTZWxlY3RlZCB0ZXh0XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRjaG9pY2UgLSBTZWxlY3RlZCBjaG9pY2UgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaGFuZGxlU2VsZWN0aW9uQ2hhbmdlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0LCAkY2hvaWNlLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBpbnN0YW5jZSBzdGF0ZVxuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgaW5zdGFuY2UuY3VycmVudFRleHQgPSB0ZXh0O1xuICAgICAgICBcbiAgICAgICAgLy8gQ1JJVElDQUw6IFVwZGF0ZSBoaWRkZW4gaW5wdXQgZmllbGQgdG8gbWFpbnRhaW4gc3luY2hyb25pemF0aW9uXG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgIGlmICgkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2FsbCBjdXN0b20gb25DaGFuZ2UgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub25DaGFuZ2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbmZpZy5vbkNoYW5nZSh2YWx1ZSwgdGV4dCwgJGNob2ljZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGlmeSBmb3JtIG9mIGNoYW5nZXNcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBkcm9wZG93biBtZW51IHRlbXBsYXRlIHdpdGggY2F0ZWdvcmllcyBzdXBwb3J0XG4gICAgICogU3luY2hyb25pemVkIHdpdGggRXh0ZW5zaW9ucy5jdXN0b21Ecm9wZG93bk1lbnUgbG9naWMgZm9yIGNvbXBhdGliaWxpdHlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmaWVsZHMgLSBGaWVsZCBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgZHJvcGRvd24gbWVudVxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IFtdO1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBsZXQgb2xkVHlwZSA9ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlICQuZWFjaCBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG9yaWdpbmFsIEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgICQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG9wdGlvbltmaWVsZHMudmFsdWVdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9IG9wdGlvbltmaWVsZHMudGV4dF0gfHwgb3B0aW9uW2ZpZWxkcy5uYW1lXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBvcHRpb24udHlwZSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHR5cGVMb2NhbGl6ZWQgPSBvcHRpb24udHlwZUxvY2FsaXplZCB8fCAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGNhdGVnb3J5IGhlYWRlciBpZiB0eXBlIGNoYW5nZWQgLSBleGFjdCBzYW1lIGxvZ2ljIGFzIEV4dGVuc2lvbnMuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgICAgICBpZiAodHlwZSAhPT0gb2xkVHlwZSkge1xuICAgICAgICAgICAgICAgIG9sZFR5cGUgPSB0eXBlO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcXHQ8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JztcbiAgICAgICAgICAgICAgICBodG1sICs9ICdcXHQ8aSBjbGFzcz1cInRhZ3MgaWNvblwiPjwvaT4nO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gdHlwZUxvY2FsaXplZDtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3IgRm9tYW50aWMgVUkgdG8gd29yayBjb3JyZWN0bHkgd2l0aCBIVE1MIGNvbnRlbnQsIGRhdGEtdGV4dCBzaG91bGQgY29udGFpbiB0aGUgSFRNTFxuICAgICAgICAgICAgLy8gdGhhdCB3aWxsIGJlIGRpc3BsYXllZCB3aGVuIHRoZSBpdGVtIGlzIHNlbGVjdGVkLiBUZXh0IGlzIGFscmVhZHkgc2FuaXRpemVkIGluIHByb2Nlc3NFeHRlbnNpb25SZXNwb25zZS5cbiAgICAgICAgICAgIGNvbnN0IG1heWJlVGV4dCA9IHRleHQgPyBgZGF0YS10ZXh0PVwiJHt0ZXh0LnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKX1cImAgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSBvcHRpb24uZGlzYWJsZWQgPyAnZGlzYWJsZWQgJyA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtFeHRlbnNpb25TZWxlY3Rvci5lc2NhcGVIdG1sKHZhbHVlKX1cIiR7bWF5YmVUZXh0fT5gO1xuICAgICAgICAgICAgaHRtbCArPSB0ZXh0OyAvLyBUZXh0IGlzIGFscmVhZHkgc2FuaXRpemVkIGluIHByb2Nlc3NFeHRlbnNpb25SZXNwb25zZVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCB2YWx1ZSBwcm9ncmFtbWF0aWNhbGx5IHdpdGggb3B0aW9uYWwgdGV4dFxuICAgICAqIFY1LjA6IEVuaGFuY2VkIHRvIHN1cHBvcnQgc2V0dGluZyBib3RoIHZhbHVlIGFuZCBkaXNwbGF5IHRleHRcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBWYWx1ZSB0byBzZXRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIERpc3BsYXkgdGV4dCAob3B0aW9uYWwsIGlmIHByb3ZpZGVkIHdpbGwgdXBkYXRlIGRpc3BsYXkpXG4gICAgICovXG4gICAgc2V0VmFsdWUoZmllbGRJZCwgdmFsdWUsIHRleHQgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEV4dGVuc2lvblNlbGVjdG9yOiBJbnN0YW5jZSBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHZhbHVlXG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgIGlmICgkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKHZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biBkaXNwbGF5XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgZW1wdHkgdmFsdWUgc3BlY2lhbGx5XG4gICAgICAgICAgICBpZiAodmFsdWUgPT09ICcnIHx8IHZhbHVlID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgICAgIGlmICgkdGV4dEVsZW1lbnQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBkZWZhdWx0IGNsYXNzIGZvciBwbGFjZWhvbGRlciBzdHlsZVxuICAgICAgICAgICAgICAgICAgICAkdGV4dEVsZW1lbnQuYWRkQ2xhc3MoJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBJZiB0ZXh0IGlzIHByb3ZpZGVkLCB1cGRhdGUgYm90aCB2YWx1ZSBhbmQgdGV4dFxuICAgICAgICAgICAgZWxzZSBpZiAodGV4dCAhPT0gbnVsbCAmJiB0ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB0ZW1wb3JhcnkgbWVudSBpdGVtIHdpdGggdGhlIG5ldyB0ZXh0IGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICBjb25zdCAkbWVudSA9ICRkcm9wZG93bi5maW5kKCcubWVudScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nSXRlbSA9ICRtZW51LmZpbmQoYC5pdGVtW2RhdGEtdmFsdWU9XCIke3ZhbHVlfVwiXWApO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFleGlzdGluZ0l0ZW0ubGVuZ3RoICYmIHZhbHVlICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgdGVtcG9yYXJ5IGl0ZW0gZm9yIG1vYmlsZSBudW1iZXIgb3Igb3RoZXIgZHluYW1pYyB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdGhpcy5lc2NhcGVIdG1sKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAgICAgICAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUV4dGVuc2lvbnNBcGlDb250ZW50KHRleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHRleHQ7XG4gICAgICAgICAgICAgICAgICAgICRtZW51LmFwcGVuZChgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtzYWZlVmFsdWV9XCIgZGF0YS10ZXh0PVwiJHtzYWZlVGV4dC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jyl9XCI+JHtzYWZlVGV4dH08L2Rpdj5gKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgc2VsZWN0ZWQgdmFsdWUgaW4gZHJvcGRvd25cbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcblxuICAgICAgICAgICAgICAgIC8vIEZvcmNlIHRleHQgdXBkYXRlIGlmIFNlbWFudGljIFVJIGRpZG4ndCBwaWNrIGl0IHVwXG4gICAgICAgICAgICAgICAgY29uc3QgJHRleHRFbGVtZW50ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCR0ZXh0RWxlbWVudC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRleHRFbGVtZW50Lmh0bWwodGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkZWZhdWx0IGNsYXNzIHRvIHNob3cgdGV4dCBhcyBzZWxlY3RlZCwgbm90IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgICAgICR0ZXh0RWxlbWVudC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSnVzdCBzZXQgdGhlIHZhbHVlLCBsZXQgZHJvcGRvd24gaGFuZGxlIHRleHRcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZGVmYXVsdCBjbGFzcyBpZiB2YWx1ZSBpcyBzZXRcbiAgICAgICAgICAgICAgICBjb25zdCAkdGV4dEVsZW1lbnQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHRleHRFbGVtZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAkdGV4dEVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2Ugc3RhdGVcbiAgICAgICAgaW5zdGFuY2UuY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gdGV4dCB8fCAnJztcblxuICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCBmb3IgZm9ybSBwcm9jZXNzaW5nXG4gICAgICAgICRoaWRkZW5JbnB1dC50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuICAgICAgICAvLyBOb3RpZnkgZm9ybSBvZiBjaGFuZ2VzXG4gICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCBkaXNwbGF5IHRleHQgd2l0aG91dCBjaGFuZ2luZyB2YWx1ZVxuICAgICAqIFY1LjA6IE5ldyBtZXRob2QgZm9yIHVwZGF0aW5nIGRpc3BsYXkgdGV4dCBvbmx5XG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBEaXNwbGF5IHRleHQgdG8gc2V0XG4gICAgICovXG4gICAgc2V0VGV4dChmaWVsZElkLCB0ZXh0KSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEV4dGVuc2lvblNlbGVjdG9yOiBJbnN0YW5jZSBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkSWR9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZElkfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgJHRleHRFbGVtZW50ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Jyk7XG4gICAgICAgICAgICBpZiAoJHRleHRFbGVtZW50Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIFNhbml0aXplIHRleHQgYmVmb3JlIHNldHRpbmdcbiAgICAgICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVFeHRlbnNpb25zQXBpQ29udGVudCh0ZXh0KVxuICAgICAgICAgICAgICAgICAgICA6IHRleHQ7XG4gICAgICAgICAgICAgICAgJHRleHRFbGVtZW50Lmh0bWwoc2FmZVRleHQpO1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkZWZhdWx0IGNsYXNzIHRvIHNob3cgdGV4dCBhcyBzZWxlY3RlZCwgbm90IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgJHRleHRFbGVtZW50LnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuY3VycmVudFRleHQgPSB0ZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCB2YWx1ZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IEN1cnJlbnQgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRWYWx1ZShmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICByZXR1cm4gaW5zdGFuY2UgPyBpbnN0YW5jZS5jdXJyZW50VmFsdWUgOiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICovXG4gICAgY2xlYXIoZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKGluc3RhbmNlKSB7XG4gICAgICAgICAgICAvLyBVc2UgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB0byBjbGVhclxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5jbGVhcihmaWVsZElkKTtcblxuICAgICAgICAgICAgLy8gQWRkIGRlZmF1bHQgY2xhc3MgdG8gc2hvdyBwbGFjZWhvbGRlciBzdHlsZVxuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRleHRFbGVtZW50ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Jyk7XG4gICAgICAgICAgICAgICAgaWYgKCR0ZXh0RWxlbWVudC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRleHRFbGVtZW50LmFkZENsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2Ugc3RhdGVcbiAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IG51bGw7XG4gICAgICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggZHJvcGRvd24gZGF0YVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICByZWZyZXNoKGZpZWxkSWQpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG8gRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZElkfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGNhY2hlIGZvciBleHRlbnNpb25zIEFQSVxuICAgICAqIENhbGwgdGhpcyBhZnRlciBleHRlbnNpb24gb3BlcmF0aW9ucyAoYWRkL2VkaXQvZGVsZXRlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gT3B0aW9uYWw6IHNwZWNpZmljIHR5cGUgdG8gY2xlYXIgKCdyb3V0aW5nJywgJ2ludGVybmFsJywgZXRjLilcbiAgICAgKi9cbiAgICBjbGVhckNhY2hlKHR5cGUgPSBudWxsKSB7XG4gICAgICAgIGlmICh0eXBlKSB7XG4gICAgICAgICAgICAvLyBDbGVhciBjYWNoZSBmb3Igc3BlY2lmaWMgdHlwZVxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5jbGVhckNhY2hlRm9yKCcvcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QnLCB7IHR5cGUgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDbGVhciBhbGwgZXh0ZW5zaW9ucyBjYWNoZVxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5jbGVhckNhY2hlRm9yKCcvcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCBhbGwgZXh0ZW5zaW9uIGRyb3Bkb3ducyBvbiB0aGUgcGFnZVxuICAgICAqIFRoaXMgd2lsbCBmb3JjZSB0aGVtIHRvIHJlbG9hZCBkYXRhIGZyb20gc2VydmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBPcHRpb25hbDogc3BlY2lmaWMgdHlwZSB0byByZWZyZXNoICgncm91dGluZycsICdpbnRlcm5hbCcsIGV0Yy4pXG4gICAgICovXG4gICAgcmVmcmVzaEFsbCh0eXBlID0gbnVsbCkge1xuICAgICAgICAvLyBDbGVhciBjYWNoZSBmaXJzdFxuICAgICAgICB0aGlzLmNsZWFyQ2FjaGUodHlwZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZWZyZXNoIGVhY2ggYWN0aXZlIGluc3RhbmNlXG4gICAgICAgIHRoaXMuaW5zdGFuY2VzLmZvckVhY2goKGluc3RhbmNlLCBmaWVsZElkKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXR5cGUgfHwgaW5zdGFuY2UuY29uZmlnLnR5cGUgPT09IHR5cGUpIHtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciBkcm9wZG93biBhbmQgcmVsb2FkXG4gICAgICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5jbGVhcihmaWVsZElkKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZWluaXRpYWxpemUgZHJvcGRvd24gdG8gdHJpZ2dlciBuZXcgQVBJIHJlcXVlc3RcbiAgICAgICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZElkfS1kcm9wZG93bmApO1xuICAgICAgICAgICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZXh0ZW5zaW9uIGV4Y2x1c2lvbiBsaXN0IGZvciBleGlzdGluZyBpbnN0YW5jZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBleGNsdWRlRXh0ZW5zaW9ucyAtIEV4dGVuc2lvbnMgdG8gZXhjbHVkZVxuICAgICAqL1xuICAgIHVwZGF0ZUV4Y2x1c2lvbnMoZmllbGRJZCwgZXhjbHVkZUV4dGVuc2lvbnMgPSBbXSkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBFeHRlbnNpb25TZWxlY3RvcjogSW5zdGFuY2Ugbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZElkfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgY29uZmlndXJhdGlvblxuICAgICAgICBpbnN0YW5jZS5jb25maWcuZXhjbHVkZUV4dGVuc2lvbnMgPSBleGNsdWRlRXh0ZW5zaW9ucztcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIGNhY2hlIGZvciB0aGlzIHNwZWNpZmljIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgY2FjaGVLZXkgPSB0aGlzLmdlbmVyYXRlQ2FjaGVLZXkoaW5zdGFuY2UuY29uZmlnKTtcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5jbGVhckNhY2hlRm9yKCcvcGJ4Y29yZS9hcGkvZXh0ZW5zaW9ucy9nZXRGb3JTZWxlY3QnLCBjYWNoZUtleSk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZWZyZXNoIGRyb3Bkb3duXG4gICAgICAgIHRoaXMucmVmcmVzaChmaWVsZElkKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlIGNhY2hlIGtleSBiYXNlZCBvbiBjb25maWd1cmF0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIEV4dGVuc2lvbiBzZWxlY3RvciBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge29iamVjdH0gQ2FjaGUga2V5IHBhcmFtZXRlcnNcbiAgICAgKi9cbiAgICBnZW5lcmF0ZUNhY2hlS2V5KGNvbmZpZykge1xuICAgICAgICBjb25zdCBjYWNoZVBhcmFtcyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvbmZpZy50eXBlICYmIGNvbmZpZy50eXBlICE9PSAnYWxsJykge1xuICAgICAgICAgICAgY2FjaGVQYXJhbXMudHlwZSA9IGNvbmZpZy50eXBlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoY29uZmlnLmV4Y2x1ZGVFeHRlbnNpb25zICYmIGNvbmZpZy5leGNsdWRlRXh0ZW5zaW9ucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjYWNoZVBhcmFtcy5leGNsdWRlID0gY29uZmlnLmV4Y2x1ZGVFeHRlbnNpb25zLmpvaW4oJywnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNhY2hlUGFyYW1zO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBpbnN0YW5jZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICBkZXN0cm95KGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGZyb20gaW5zdGFuY2VzXG4gICAgICAgICAgICB0aGlzLmluc3RhbmNlcy5kZWxldGUoZmllbGRJZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIHRvIHByZXZlbnQgWFNTXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZGl2LnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgcmV0dXJuIGRpdi5pbm5lckhUTUw7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBFeHRlbnNpb25TZWxlY3Rvcjtcbn0iXX0=