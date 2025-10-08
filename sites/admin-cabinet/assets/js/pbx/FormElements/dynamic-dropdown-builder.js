"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

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

/* global $, Form, globalTranslate, SecurityUtils */

/**
 * DynamicDropdownBuilder - Universal dropdown builder for MikoPBX V5.0
 * 
 * Builds dropdown HTML dynamically based on REST API data.
 * Separates concerns: PHP forms only provide hidden inputs, 
 * JavaScript builds UI and populates with data.
 * 
 * Usage:
 * DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
 *     apiUrl: '/pbxcore/api/v2/network-filters/getForSelect',
 *     placeholder: 'Select network filter'
 * });
 */
var DynamicDropdownBuilder = {
  /**
   * Build dropdown for a field based on REST API data
   * @param {string} fieldName - Field name (e.g., 'networkfilterid')
   * @param {object} data - Data from REST API
   * @param {object} config - Dropdown configuration
   */
  buildDropdown: function buildDropdown(fieldName, data) {
    var config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    var $hiddenInput = $("#".concat(fieldName));

    if (!$hiddenInput.length) {
      console.warn("Hidden input not found for field: ".concat(fieldName));
      return;
    } // Check if dropdown already exists - update it instead of creating duplicate


    var $existingDropdown = $("#".concat(fieldName, "-dropdown"));

    if ($existingDropdown.length) {
      this.updateExistingDropdown(fieldName, data, config);
      return;
    } // Get current values from data


    var currentValue = data[fieldName] || config.defaultValue || '';
    var representField = "".concat(fieldName, "_represent"); // Try multiple possible represent field names for flexibility

    var currentText = data[representField];

    if (!currentText) {
      // Try without 'id' suffix (e.g., networkfilter_represent instead of networkfilterid_represent)
      var baseFieldName = fieldName.replace(/id$/, '');
      var alternativeRepresentField = "".concat(baseFieldName, "_represent");
      currentText = data[alternativeRepresentField];
    } // If we have a value but no represent text, try to find it in static options first


    if (currentValue && !currentText && config.staticOptions) {
      var matchingOption = config.staticOptions.find(function (option) {
        return option.value === currentValue;
      });

      if (matchingOption) {
        currentText = matchingOption.text || matchingOption.name;
      }
    } // Sanitize HTML in represent text using SecurityUtils


    if (currentText && typeof currentText === 'string' && typeof SecurityUtils !== 'undefined') {
      // Use sanitizeObjectRepresentations for all _represent fields as they can contain HTML entities and icons
      currentText = SecurityUtils.sanitizeObjectRepresentations(currentText);
    } // Check if we're using placeholder text


    var isUsingPlaceholder = !currentText; // Fallback to placeholder or default

    currentText = currentText || config.placeholder || 'Select value'; // Build CSS classes with sanitization
    // Allow custom base classes or use default with 'selection'

    var defaultBaseClasses = ['ui', 'selection', 'dropdown'];
    var baseClasses = config.baseClasses || defaultBaseClasses;
    var additionalClasses = config.additionalClasses || [];
    var allClasses = [].concat(_toConsumableArray(baseClasses), _toConsumableArray(additionalClasses)).join(' '); // Build dropdown HTML - FIXED: Create elements with jQuery to properly handle HTML content
    // Only show current value in text display, let API populate menu on click
    // Use 'default' class when showing placeholder, even if there's a value

    var textClass = isUsingPlaceholder ? 'text default' : 'text'; // Sanitize fieldName for use in ID attribute

    var safeFieldName = typeof SecurityUtils !== 'undefined' ? SecurityUtils.sanitizeAttribute(fieldName) : fieldName; // Create dropdown structure using jQuery for proper HTML handling

    var $dropdown = $('<div>').addClass(allClasses).attr('id', "".concat(safeFieldName, "-dropdown"));
    var $textDiv = $('<div>').addClass(textClass).html(currentText); // currentText already sanitized above

    var $dropdownIcon = $('<i>').addClass('dropdown icon');
    var $menu = $('<div>').addClass('menu').html('<!-- Menu intentionally empty - will be populated by API on click -->'); // Assemble dropdown

    $dropdown.append($textDiv, $dropdownIcon, $menu); // Insert dropdown after hidden input

    $dropdown.insertAfter($hiddenInput); // Set value in hidden input

    $hiddenInput.val(currentValue); // Initialize dropdown

    this.initializeDropdown(fieldName, config);
  },

  /**
   * Update existing dropdown with new configuration
   * @param {string} fieldName - Field name
   * @param {object} data - Data for the dropdown
   * @param {object} config - New configuration to apply
   */
  updateExistingDropdown: function updateExistingDropdown(fieldName, data, config) {
    var $dropdown = $("#".concat(fieldName, "-dropdown"));
    var $hiddenInput = $("#".concat(fieldName));

    if (!$dropdown.length) {
      console.warn("Cannot update: dropdown not found for field: ".concat(fieldName));
      return;
    } // Update hidden input value if provided


    var currentValue = data[fieldName] || config.defaultValue || '';

    if (currentValue) {
      $hiddenInput.val(currentValue);
    } // Update dropdown text if represent field is provided


    var representField = "".concat(fieldName, "_represent");
    var currentText = data[representField];

    if (!currentText) {
      var baseFieldName = fieldName.replace(/id$/, '');
      var alternativeRepresentField = "".concat(baseFieldName, "_represent");
      currentText = data[alternativeRepresentField];
    } // Sanitize HTML in represent text using SecurityUtils (consistent with buildDropdown)


    if (currentText && typeof currentText === 'string' && typeof SecurityUtils !== 'undefined') {
      // Use sanitizeObjectRepresentations for all _represent fields as they can contain HTML entities and icons
      currentText = SecurityUtils.sanitizeObjectRepresentations(currentText);
    }

    if (currentText) {
      var $textElement = $dropdown.find('.text');
      $textElement.html(currentText);
      $textElement.removeClass('default');
    } // Re-initialize dropdown with new configuration


    this.initializeDropdown(fieldName, config);
  },

  /**
   * Initialize dropdown with API or static data
   * @param {string} fieldName - Field name
   * @param {object} config - Configuration object
   */
  initializeDropdown: function initializeDropdown(fieldName, config) {
    var _this = this;

    var $dropdown = $("#".concat(fieldName, "-dropdown"));
    var $hiddenInput = $("#".concat(fieldName));

    if (!$dropdown.length) {
      console.warn("Dropdown not found: ".concat(fieldName, "-dropdown"));
      return;
    }

    var settings = {
      allowAdditions: false,
      fullTextSearch: true,
      forceSelection: false,
      preserveHTML: true,
      // Allow HTML in dropdown text (for icons, flags, etc.)
      onChange: function onChange(value, text, $choice) {
        // Automatic synchronization with hidden input
        $hiddenInput.val(value); // Trigger change event on hidden input for form validation/processing

        $hiddenInput.trigger('change'); // Notify form of changes

        if (typeof Form !== 'undefined' && Form.dataChanged) {
          Form.dataChanged();
        } // Custom onChange handler - only for field-specific logic


        if (config.onChange) {
          config.onChange(value, text, $choice);
        }
      }
    }; // Add API settings if provided

    if (config.apiUrl) {
      // Check if dropdown has search functionality - detect by CSS classes since search input is added by Fomantic UI later
      var hasSearchInput = $dropdown.hasClass('search');
      var apiUrl = config.apiUrl; // Only add query parameter for searchable dropdowns

      if (hasSearchInput) {
        if (config.apiUrl.indexOf('?') > -1) {
          apiUrl += '&query={query}';
        } else {
          apiUrl += '?query={query}';
        }
      }

      settings.apiSettings = {
        url: apiUrl,
        cache: config.cache !== undefined ? config.cache : true,
        throttle: hasSearchInput ? 500 : 0,
        throttleFirstRequest: false,
        filterRemoteData: true,
        minCharacters: hasSearchInput ? 3 : 0,
        // Search dropdowns need 3 characters, simple dropdowns work on click
        onResponse: function onResponse(response) {
          return config.onResponse ? config.onResponse(response) : _this.defaultResponseHandler(response);
        },
        onFailure: function onFailure(response) {
          console.error("\u274C API request failed for ".concat(fieldName, " (").concat(config.apiUrl, "):"), response);
        }
      }; // Add additional API parameters if provided

      if (config.apiParams && _typeof(config.apiParams) === 'object') {
        var params = new URLSearchParams(config.apiParams);
        var existingParams = params.toString();

        if (existingParams) {
          if (apiUrl.indexOf('?') > -1) {
            var queryIndex = apiUrl.indexOf('query={query}');

            if (queryIndex > -1) {
              apiUrl = apiUrl.substring(0, queryIndex) + existingParams + '&query={query}';
            } else {
              apiUrl += '&' + existingParams;
            }
          } else {
            // Only add query parameter if the dropdown is searchable
            if (hasSearchInput) {
              apiUrl += '?' + existingParams + '&query={query}';
            } else {
              apiUrl += '?' + existingParams;
            }
          }

          settings.apiSettings.url = apiUrl;
        }
      } // Use custom template to properly render HTML content


      if (!config.templates) {
        settings.templates = {
          menu: this.customDropdownMenu
        };
      } else {
        settings.templates = config.templates;
      }
    } else if (config.staticOptions) {
      // For static options, populate menu immediately
      this.populateStaticOptions($dropdown, config.staticOptions);
    } // Initialize native Fomantic UI dropdown


    $dropdown.dropdown(settings);
  },

  /**
   * Default API response handler for MikoPBX format
   * @param {object} response - API response
   * @returns {object} Fomantic UI compatible response
   */
  defaultResponseHandler: function defaultResponseHandler(response) {
    if ((response.result || response.success) && response.data && Array.isArray(response.data)) {
      return {
        success: true,
        results: response.data.map(function (item) {
          var rawText = item.represent || item.name || item.text; // Sanitize display text while preserving safe HTML (icons)

          var safeText = typeof SecurityUtils !== 'undefined' ? SecurityUtils.sanitizeObjectRepresentations(rawText) : rawText;
          return {
            value: item.value,
            text: safeText,
            name: safeText
          };
        })
      };
    }

    return {
      success: false,
      results: []
    };
  },

  /**
   * Custom dropdown menu template for proper HTML rendering
   * @param {object} response - Response from API
   * @param {object} fields - Field configuration
   * @returns {string} HTML for dropdown menu
   */
  customDropdownMenu: function customDropdownMenu(response, fields) {
    var values = response[fields.values] || {};
    var html = '';
    values.forEach(function (option) {
      var value = option[fields.value] || '';
      var text = option[fields.text] || option[fields.name] || '';
      html += "<div class=\"item\" data-value=\"".concat(DynamicDropdownBuilder.escapeHtml(value), "\">");
      html += text;
      html += '</div>';
    });
    return html;
  },

  /**
   * Populate dropdown with static options
   * @param {jQuery} $dropdown - Dropdown element
   * @param {Array} options - Static options array
   */
  populateStaticOptions: function populateStaticOptions($dropdown, options) {
    var _this2 = this;

    var $menu = $dropdown.find('.menu');
    options.forEach(function (option) {
      var rawValue = option.value;
      var rawText = option.text || option.name; // Sanitize value for attribute and text for display

      var safeValue = typeof SecurityUtils !== 'undefined' ? SecurityUtils.sanitizeAttribute(rawValue) : _this2.escapeHtml(rawValue);
      var safeText = typeof SecurityUtils !== 'undefined' ? SecurityUtils.sanitizeObjectRepresentations(rawText) : rawText;
      $menu.append("<div class=\"item\" data-value=\"".concat(safeValue, "\">").concat(safeText, "</div>"));
    });
  },

  /**
   * Build multiple dropdowns from configuration object
   * @param {object} data - Data from REST API
   * @param {object} configs - Configuration for each field
   */
  buildMultipleDropdowns: function buildMultipleDropdowns(data, configs) {
    var _this3 = this;

    Object.keys(configs).forEach(function (fieldName) {
      _this3.buildDropdown(fieldName, data, configs[fieldName]);
    });
  },

  /**
   * Set value in existing dropdown
   * @param {string} fieldName - Field name
   * @param {string} value - Value to set
   */
  setValue: function setValue(fieldName, value) {
    var $dropdown = $("#".concat(fieldName, "-dropdown"));

    if ($dropdown.length) {
      $dropdown.dropdown('set selected', value);
    }
  },

  /**
   * Get current dropdown value
   * @param {string} fieldName - Field name
   * @returns {string} Current value
   */
  getValue: function getValue(fieldName) {
    var $dropdown = $("#".concat(fieldName, "-dropdown"));
    return $dropdown.length ? $dropdown.dropdown('get value') : '';
  },

  /**
   * Clear dropdown selection
   * @param {string} fieldName - Field name
   */
  clear: function clear(fieldName) {
    var $dropdown = $("#".concat(fieldName, "-dropdown"));

    if ($dropdown.length) {
      $dropdown.dropdown('clear');
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
  module.exports = DynamicDropdownBuilder;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImlzVXNpbmdQbGFjZWhvbGRlciIsInBsYWNlaG9sZGVyIiwiZGVmYXVsdEJhc2VDbGFzc2VzIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiYXBwZW5kIiwiaW5zZXJ0QWZ0ZXIiLCJ2YWwiLCJpbml0aWFsaXplRHJvcGRvd24iLCIkdGV4dEVsZW1lbnQiLCJyZW1vdmVDbGFzcyIsInNldHRpbmdzIiwiYWxsb3dBZGRpdGlvbnMiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwicHJlc2VydmVIVE1MIiwib25DaGFuZ2UiLCIkY2hvaWNlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFwaVVybCIsImhhc1NlYXJjaElucHV0IiwiaGFzQ2xhc3MiLCJpbmRleE9mIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJjYWNoZSIsInVuZGVmaW5lZCIsInRocm90dGxlIiwidGhyb3R0bGVGaXJzdFJlcXVlc3QiLCJmaWx0ZXJSZW1vdGVEYXRhIiwibWluQ2hhcmFjdGVycyIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsImRlZmF1bHRSZXNwb25zZUhhbmRsZXIiLCJvbkZhaWx1cmUiLCJlcnJvciIsImFwaVBhcmFtcyIsInBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImV4aXN0aW5nUGFyYW1zIiwidG9TdHJpbmciLCJxdWVyeUluZGV4Iiwic3Vic3RyaW5nIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsInBvcHVsYXRlU3RhdGljT3B0aW9ucyIsImRyb3Bkb3duIiwicmVzdWx0Iiwic3VjY2VzcyIsIkFycmF5IiwiaXNBcnJheSIsInJlc3VsdHMiLCJtYXAiLCJpdGVtIiwicmF3VGV4dCIsInJlcHJlc2VudCIsInNhZmVUZXh0IiwiZmllbGRzIiwidmFsdWVzIiwiZm9yRWFjaCIsImVzY2FwZUh0bWwiLCJvcHRpb25zIiwicmF3VmFsdWUiLCJzYWZlVmFsdWUiLCJidWlsZE11bHRpcGxlRHJvcGRvd25zIiwiY29uZmlncyIsIk9iamVjdCIsImtleXMiLCJzZXRWYWx1ZSIsImdldFZhbHVlIiwiY2xlYXIiLCJkaXYiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJ0ZXh0Q29udGVudCIsImlubmVySFRNTCIsIm1vZHVsZSIsImV4cG9ydHMiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBGb3JtLCBnbG9iYWxUcmFuc2xhdGUsIFNlY3VyaXR5VXRpbHMgKi9cblxuLyoqXG4gKiBEeW5hbWljRHJvcGRvd25CdWlsZGVyIC0gVW5pdmVyc2FsIGRyb3Bkb3duIGJ1aWxkZXIgZm9yIE1pa29QQlggVjUuMFxuICogXG4gKiBCdWlsZHMgZHJvcGRvd24gSFRNTCBkeW5hbWljYWxseSBiYXNlZCBvbiBSRVNUIEFQSSBkYXRhLlxuICogU2VwYXJhdGVzIGNvbmNlcm5zOiBQSFAgZm9ybXMgb25seSBwcm92aWRlIGhpZGRlbiBpbnB1dHMsIFxuICogSmF2YVNjcmlwdCBidWlsZHMgVUkgYW5kIHBvcHVsYXRlcyB3aXRoIGRhdGEuXG4gKiBcbiAqIFVzYWdlOlxuICogRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gKiAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YyL25ldHdvcmstZmlsdGVycy9nZXRGb3JTZWxlY3QnLFxuICogICAgIHBsYWNlaG9sZGVyOiAnU2VsZWN0IG5ldHdvcmsgZmlsdGVyJ1xuICogfSk7XG4gKi9cbmNvbnN0IER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgZHJvcGRvd24gZm9yIGEgZmllbGQgYmFzZWQgb24gUkVTVCBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lIChlLmcuLCAnbmV0d29ya2ZpbHRlcmlkJylcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBEcm9wZG93biBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgYnVpbGREcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZyA9IHt9KSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBIaWRkZW4gaW5wdXQgbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGFscmVhZHkgZXhpc3RzIC0gdXBkYXRlIGl0IGluc3RlYWQgb2YgY3JlYXRpbmcgZHVwbGljYXRlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUV4aXN0aW5nRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgY3VycmVudCB2YWx1ZXMgZnJvbSBkYXRhXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGRhdGFbZmllbGROYW1lXSB8fCBjb25maWcuZGVmYXVsdFZhbHVlIHx8ICcnO1xuICAgICAgICBjb25zdCByZXByZXNlbnRGaWVsZCA9IGAke2ZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyeSBtdWx0aXBsZSBwb3NzaWJsZSByZXByZXNlbnQgZmllbGQgbmFtZXMgZm9yIGZsZXhpYmlsaXR5XG4gICAgICAgIGxldCBjdXJyZW50VGV4dCA9IGRhdGFbcmVwcmVzZW50RmllbGRdO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgLy8gVHJ5IHdpdGhvdXQgJ2lkJyBzdWZmaXggKGUuZy4sIG5ldHdvcmtmaWx0ZXJfcmVwcmVzZW50IGluc3RlYWQgb2YgbmV0d29ya2ZpbHRlcmlkX3JlcHJlc2VudClcbiAgICAgICAgICAgIGNvbnN0IGJhc2VGaWVsZE5hbWUgPSBmaWVsZE5hbWUucmVwbGFjZSgvaWQkLywgJycpO1xuICAgICAgICAgICAgY29uc3QgYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZCA9IGAke2Jhc2VGaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IGRhdGFbYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSB2YWx1ZSBidXQgbm8gcmVwcmVzZW50IHRleHQsIHRyeSB0byBmaW5kIGl0IGluIHN0YXRpYyBvcHRpb25zIGZpcnN0XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUgJiYgIWN1cnJlbnRUZXh0ICYmIGNvbmZpZy5zdGF0aWNPcHRpb25zKSB7XG4gICAgICAgICAgICBjb25zdCBtYXRjaGluZ09wdGlvbiA9IGNvbmZpZy5zdGF0aWNPcHRpb25zLmZpbmQob3B0aW9uID0+IG9wdGlvbi52YWx1ZSA9PT0gY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgIGlmIChtYXRjaGluZ09wdGlvbikge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gbWF0Y2hpbmdPcHRpb24udGV4dCB8fCBtYXRjaGluZ09wdGlvbi5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTYW5pdGl6ZSBIVE1MIGluIHJlcHJlc2VudCB0ZXh0IHVzaW5nIFNlY3VyaXR5VXRpbHNcbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0ICYmIHR5cGVvZiBjdXJyZW50VGV4dCA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMgZm9yIGFsbCBfcmVwcmVzZW50IGZpZWxkcyBhcyB0aGV5IGNhbiBjb250YWluIEhUTUwgZW50aXRpZXMgYW5kIGljb25zXG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoY3VycmVudFRleHQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB3ZSdyZSB1c2luZyBwbGFjZWhvbGRlciB0ZXh0XG4gICAgICAgIGNvbnN0IGlzVXNpbmdQbGFjZWhvbGRlciA9ICFjdXJyZW50VGV4dDtcblxuICAgICAgICAvLyBGYWxsYmFjayB0byBwbGFjZWhvbGRlciBvciBkZWZhdWx0XG4gICAgICAgIGN1cnJlbnRUZXh0ID0gY3VycmVudFRleHQgfHwgY29uZmlnLnBsYWNlaG9sZGVyIHx8ICdTZWxlY3QgdmFsdWUnO1xuXG4gICAgICAgIC8vIEJ1aWxkIENTUyBjbGFzc2VzIHdpdGggc2FuaXRpemF0aW9uXG4gICAgICAgIC8vIEFsbG93IGN1c3RvbSBiYXNlIGNsYXNzZXMgb3IgdXNlIGRlZmF1bHQgd2l0aCAnc2VsZWN0aW9uJ1xuICAgICAgICBjb25zdCBkZWZhdWx0QmFzZUNsYXNzZXMgPSBbJ3VpJywgJ3NlbGVjdGlvbicsICdkcm9wZG93biddO1xuICAgICAgICBjb25zdCBiYXNlQ2xhc3NlcyA9IGNvbmZpZy5iYXNlQ2xhc3NlcyB8fCBkZWZhdWx0QmFzZUNsYXNzZXM7XG4gICAgICAgIGNvbnN0IGFkZGl0aW9uYWxDbGFzc2VzID0gY29uZmlnLmFkZGl0aW9uYWxDbGFzc2VzIHx8IFtdO1xuICAgICAgICBjb25zdCBhbGxDbGFzc2VzID0gWy4uLmJhc2VDbGFzc2VzLCAuLi5hZGRpdGlvbmFsQ2xhc3Nlc10uam9pbignICcpO1xuXG4gICAgICAgIC8vIEJ1aWxkIGRyb3Bkb3duIEhUTUwgLSBGSVhFRDogQ3JlYXRlIGVsZW1lbnRzIHdpdGggalF1ZXJ5IHRvIHByb3Blcmx5IGhhbmRsZSBIVE1MIGNvbnRlbnRcbiAgICAgICAgLy8gT25seSBzaG93IGN1cnJlbnQgdmFsdWUgaW4gdGV4dCBkaXNwbGF5LCBsZXQgQVBJIHBvcHVsYXRlIG1lbnUgb24gY2xpY2tcbiAgICAgICAgLy8gVXNlICdkZWZhdWx0JyBjbGFzcyB3aGVuIHNob3dpbmcgcGxhY2Vob2xkZXIsIGV2ZW4gaWYgdGhlcmUncyBhIHZhbHVlXG4gICAgICAgIGNvbnN0IHRleHRDbGFzcyA9IGlzVXNpbmdQbGFjZWhvbGRlciA/ICd0ZXh0IGRlZmF1bHQnIDogJ3RleHQnO1xuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgZmllbGROYW1lIGZvciB1c2UgaW4gSUQgYXR0cmlidXRlXG4gICAgICAgIGNvbnN0IHNhZmVGaWVsZE5hbWUgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVBdHRyaWJ1dGUoZmllbGROYW1lKVxuICAgICAgICAgICAgOiBmaWVsZE5hbWU7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gc3RydWN0dXJlIHVzaW5nIGpRdWVyeSBmb3IgcHJvcGVyIEhUTUwgaGFuZGxpbmdcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnPGRpdj4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKGFsbENsYXNzZXMpXG4gICAgICAgICAgICAuYXR0cignaWQnLCBgJHtzYWZlRmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJHRleHREaXYgPSAkKCc8ZGl2PicpXG4gICAgICAgICAgICAuYWRkQ2xhc3ModGV4dENsYXNzKVxuICAgICAgICAgICAgLmh0bWwoY3VycmVudFRleHQpOyAvLyBjdXJyZW50VGV4dCBhbHJlYWR5IHNhbml0aXplZCBhYm92ZVxuICAgICAgICBcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duSWNvbiA9ICQoJzxpPicpLmFkZENsYXNzKCdkcm9wZG93biBpY29uJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkbWVudSA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnbWVudScpXG4gICAgICAgICAgICAuaHRtbCgnPCEtLSBNZW51IGludGVudGlvbmFsbHkgZW1wdHkgLSB3aWxsIGJlIHBvcHVsYXRlZCBieSBBUEkgb24gY2xpY2sgLS0+Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBc3NlbWJsZSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKCR0ZXh0RGl2LCAkZHJvcGRvd25JY29uLCAkbWVudSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnNlcnQgZHJvcGRvd24gYWZ0ZXIgaGlkZGVuIGlucHV0XG4gICAgICAgICRkcm9wZG93bi5pbnNlcnRBZnRlcigkaGlkZGVuSW5wdXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHZhbHVlIGluIGhpZGRlbiBpbnB1dFxuICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURyb3Bkb3duKGZpZWxkTmFtZSwgY29uZmlnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBleGlzdGluZyBkcm9wZG93biB3aXRoIG5ldyBjb25maWd1cmF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZm9yIHRoZSBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBOZXcgY29uZmlndXJhdGlvbiB0byBhcHBseVxuICAgICAqL1xuICAgIHVwZGF0ZUV4aXN0aW5nRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQ2Fubm90IHVwZGF0ZTogZHJvcGRvd24gbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgdmFsdWUgaWYgcHJvdmlkZWRcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gZGF0YVtmaWVsZE5hbWVdIHx8IGNvbmZpZy5kZWZhdWx0VmFsdWUgfHwgJyc7XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHRleHQgaWYgcmVwcmVzZW50IGZpZWxkIGlzIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IHJlcHJlc2VudEZpZWxkID0gYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICBsZXQgY3VycmVudFRleHQgPSBkYXRhW3JlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgaWYgKCFjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgY29uc3QgYmFzZUZpZWxkTmFtZSA9IGZpZWxkTmFtZS5yZXBsYWNlKC9pZCQvLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkID0gYCR7YmFzZUZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gZGF0YVthbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgSFRNTCBpbiByZXByZXNlbnQgdGV4dCB1c2luZyBTZWN1cml0eVV0aWxzIChjb25zaXN0ZW50IHdpdGggYnVpbGREcm9wZG93bilcbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0ICYmIHR5cGVvZiBjdXJyZW50VGV4dCA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMgZm9yIGFsbCBfcmVwcmVzZW50IGZpZWxkcyBhcyB0aGV5IGNhbiBjb250YWluIEhUTUwgZW50aXRpZXMgYW5kIGljb25zXG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoY3VycmVudFRleHQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgJHRleHRFbGVtZW50Lmh0bWwoY3VycmVudFRleHQpO1xuICAgICAgICAgICAgJHRleHRFbGVtZW50LnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBuZXcgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyb3Bkb3duIHdpdGggQVBJIG9yIHN0YXRpYyBkYXRhXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd24oZmllbGROYW1lLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgRHJvcGRvd24gbm90IGZvdW5kOiAke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0ge1xuICAgICAgICAgICAgYWxsb3dBZGRpdGlvbnM6IGZhbHNlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBwcmVzZXJ2ZUhUTUw6IHRydWUsIC8vIEFsbG93IEhUTUwgaW4gZHJvcGRvd24gdGV4dCAoZm9yIGljb25zLCBmbGFncywgZXRjLilcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCwgJGNob2ljZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEF1dG9tYXRpYyBzeW5jaHJvbml6YXRpb24gd2l0aCBoaWRkZW4gaW5wdXRcbiAgICAgICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCBvbiBoaWRkZW4gaW5wdXQgZm9yIGZvcm0gdmFsaWRhdGlvbi9wcm9jZXNzaW5nXG4gICAgICAgICAgICAgICAgJGhpZGRlbklucHV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE5vdGlmeSBmb3JtIG9mIGNoYW5nZXNcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uZGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDdXN0b20gb25DaGFuZ2UgaGFuZGxlciAtIG9ubHkgZm9yIGZpZWxkLXNwZWNpZmljIGxvZ2ljXG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5vbkNoYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcub25DaGFuZ2UodmFsdWUsIHRleHQsICRjaG9pY2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBBUEkgc2V0dGluZ3MgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKGNvbmZpZy5hcGlVcmwpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGhhcyBzZWFyY2ggZnVuY3Rpb25hbGl0eSAtIGRldGVjdCBieSBDU1MgY2xhc3NlcyBzaW5jZSBzZWFyY2ggaW5wdXQgaXMgYWRkZWQgYnkgRm9tYW50aWMgVUkgbGF0ZXJcbiAgICAgICAgICAgIGNvbnN0IGhhc1NlYXJjaElucHV0ID0gJGRyb3Bkb3duLmhhc0NsYXNzKCdzZWFyY2gnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IGFwaVVybCA9IGNvbmZpZy5hcGlVcmw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgYWRkIHF1ZXJ5IHBhcmFtZXRlciBmb3Igc2VhcmNoYWJsZSBkcm9wZG93bnNcbiAgICAgICAgICAgIGlmIChoYXNTZWFyY2hJbnB1dCkge1xuICAgICAgICAgICAgICAgIGlmIChjb25maWcuYXBpVXJsLmluZGV4T2YoJz8nKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnJnF1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnP3F1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2V0dGluZ3MuYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICAgICAgdXJsOiBhcGlVcmwsXG4gICAgICAgICAgICAgICAgY2FjaGU6IGNvbmZpZy5jYWNoZSAhPT0gdW5kZWZpbmVkID8gY29uZmlnLmNhY2hlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICB0aHJvdHRsZTogaGFzU2VhcmNoSW5wdXQgPyA1MDAgOiAwLFxuICAgICAgICAgICAgICAgIHRocm90dGxlRmlyc3RSZXF1ZXN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1pbkNoYXJhY3RlcnM6IGhhc1NlYXJjaElucHV0ID8gMyA6IDAsIC8vIFNlYXJjaCBkcm9wZG93bnMgbmVlZCAzIGNoYXJhY3RlcnMsIHNpbXBsZSBkcm9wZG93bnMgd29yayBvbiBjbGlja1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29uZmlnLm9uUmVzcG9uc2UgXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGNvbmZpZy5vblJlc3BvbnNlKHJlc3BvbnNlKSBcbiAgICAgICAgICAgICAgICAgICAgICAgIDogdGhpcy5kZWZhdWx0UmVzcG9uc2VIYW5kbGVyKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYOKdjCBBUEkgcmVxdWVzdCBmYWlsZWQgZm9yICR7ZmllbGROYW1lfSAoJHtjb25maWcuYXBpVXJsfSk6YCwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgQVBJIHBhcmFtZXRlcnMgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmIChjb25maWcuYXBpUGFyYW1zICYmIHR5cGVvZiBjb25maWcuYXBpUGFyYW1zID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoY29uZmlnLmFwaVBhcmFtcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdQYXJhbXMgPSBwYXJhbXMudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFwaVVybC5pbmRleE9mKCc/JykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcXVlcnlJbmRleCA9IGFwaVVybC5pbmRleE9mKCdxdWVyeT17cXVlcnl9Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocXVlcnlJbmRleCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsID0gYXBpVXJsLnN1YnN0cmluZygwLCBxdWVyeUluZGV4KSArIGV4aXN0aW5nUGFyYW1zICsgJyZxdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICcmJyArIGV4aXN0aW5nUGFyYW1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25seSBhZGQgcXVlcnkgcGFyYW1ldGVyIGlmIHRoZSBkcm9wZG93biBpcyBzZWFyY2hhYmxlXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFzU2VhcmNoSW5wdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJz8nICsgZXhpc3RpbmdQYXJhbXMgKyAnJnF1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJz8nICsgZXhpc3RpbmdQYXJhbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5hcGlTZXR0aW5ncy51cmwgPSBhcGlVcmw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2UgY3VzdG9tIHRlbXBsYXRlIHRvIHByb3Blcmx5IHJlbmRlciBIVE1MIGNvbnRlbnRcbiAgICAgICAgICAgIGlmICghY29uZmlnLnRlbXBsYXRlcykge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLnRlbXBsYXRlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbWVudTogdGhpcy5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy50ZW1wbGF0ZXMgPSBjb25maWcudGVtcGxhdGVzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNvbmZpZy5zdGF0aWNPcHRpb25zKSB7XG4gICAgICAgICAgICAvLyBGb3Igc3RhdGljIG9wdGlvbnMsIHBvcHVsYXRlIG1lbnUgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgIHRoaXMucG9wdWxhdGVTdGF0aWNPcHRpb25zKCRkcm9wZG93biwgY29uZmlnLnN0YXRpY09wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBuYXRpdmUgRm9tYW50aWMgVUkgZHJvcGRvd25cbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHNldHRpbmdzKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgQVBJIHJlc3BvbnNlIGhhbmRsZXIgZm9yIE1pa29QQlggZm9ybWF0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlXG4gICAgICogQHJldHVybnMge29iamVjdH0gRm9tYW50aWMgVUkgY29tcGF0aWJsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGRlZmF1bHRSZXNwb25zZUhhbmRsZXIocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKChyZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2Uuc3VjY2VzcykgJiYgcmVzcG9uc2UuZGF0YSAmJiBBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVzdWx0czogcmVzcG9uc2UuZGF0YS5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJhd1RleHQgPSBpdGVtLnJlcHJlc2VudCB8fCBpdGVtLm5hbWUgfHwgaXRlbS50ZXh0O1xuICAgICAgICAgICAgICAgICAgICAvLyBTYW5pdGl6ZSBkaXNwbGF5IHRleHQgd2hpbGUgcHJlc2VydmluZyBzYWZlIEhUTUwgKGljb25zKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhyYXdUZXh0KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiByYXdUZXh0O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogc2FmZVRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBzYWZlVGV4dFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IFxuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsIFxuICAgICAgICAgICAgcmVzdWx0czogW10gXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXN0b20gZHJvcGRvd24gbWVudSB0ZW1wbGF0ZSBmb3IgcHJvcGVyIEhUTUwgcmVuZGVyaW5nXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZmllbGRzIC0gRmllbGQgY29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgZm9yIGRyb3Bkb3duIG1lbnVcbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG9wdGlvbltmaWVsZHMudmFsdWVdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9IG9wdGlvbltmaWVsZHMudGV4dF0gfHwgb3B0aW9uW2ZpZWxkcy5uYW1lXSB8fCAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtEeW5hbWljRHJvcGRvd25CdWlsZGVyLmVzY2FwZUh0bWwodmFsdWUpfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9IHRleHQ7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZHJvcGRvd24gd2l0aCBzdGF0aWMgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZHJvcGRvd24gLSBEcm9wZG93biBlbGVtZW50XG4gICAgICogQHBhcmFtIHtBcnJheX0gb3B0aW9ucyAtIFN0YXRpYyBvcHRpb25zIGFycmF5XG4gICAgICovXG4gICAgcG9wdWxhdGVTdGF0aWNPcHRpb25zKCRkcm9wZG93biwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCAkbWVudSA9ICRkcm9wZG93bi5maW5kKCcubWVudScpO1xuICAgICAgICBcbiAgICAgICAgb3B0aW9ucy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICAgICAgICBjb25zdCByYXdWYWx1ZSA9IG9wdGlvbi52YWx1ZTtcbiAgICAgICAgICAgIGNvbnN0IHJhd1RleHQgPSBvcHRpb24udGV4dCB8fCBvcHRpb24ubmFtZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2FuaXRpemUgdmFsdWUgZm9yIGF0dHJpYnV0ZSBhbmQgdGV4dCBmb3IgZGlzcGxheVxuICAgICAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUF0dHJpYnV0ZShyYXdWYWx1ZSlcbiAgICAgICAgICAgICAgICA6IHRoaXMuZXNjYXBlSHRtbChyYXdWYWx1ZSk7XG4gICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMocmF3VGV4dClcbiAgICAgICAgICAgICAgICA6IHJhd1RleHQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRtZW51LmFwcGVuZChgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtzYWZlVmFsdWV9XCI+JHtzYWZlVGV4dH08L2Rpdj5gKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBtdWx0aXBsZSBkcm9wZG93bnMgZnJvbSBjb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZ3MgLSBDb25maWd1cmF0aW9uIGZvciBlYWNoIGZpZWxkXG4gICAgICovXG4gICAgYnVpbGRNdWx0aXBsZURyb3Bkb3ducyhkYXRhLCBjb25maWdzKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGNvbmZpZ3MpLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIHRoaXMuYnVpbGREcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZ3NbZmllbGROYW1lXSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHZhbHVlIGluIGV4aXN0aW5nIGRyb3Bkb3duXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBWYWx1ZSB0byBzZXRcbiAgICAgKi9cbiAgICBzZXRWYWx1ZShmaWVsZE5hbWUsIHZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBkcm9wZG93biB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQ3VycmVudCB2YWx1ZVxuICAgICAqL1xuICAgIGdldFZhbHVlKGZpZWxkTmFtZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIHJldHVybiAkZHJvcGRvd24ubGVuZ3RoID8gJGRyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKSA6ICcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKi9cbiAgICBjbGVhcihmaWVsZE5hbWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIHRvIHByZXZlbnQgWFNTXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZGl2LnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgcmV0dXJuIGRpdi5pbm5lckhUTUw7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBEeW5hbWljRHJvcGRvd25CdWlsZGVyO1xufSJdfQ==