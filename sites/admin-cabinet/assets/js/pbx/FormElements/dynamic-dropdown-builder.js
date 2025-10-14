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


    $dropdown.dropdown(settings); // Set selected value for static options after initialization

    if (config.staticOptions) {
      var currentValue = $hiddenInput.val();

      if (currentValue) {
        // Use setTimeout to ensure dropdown is fully initialized
        setTimeout(function () {
          $dropdown.dropdown('set selected', currentValue);
        }, 10);
      }
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImlzVXNpbmdQbGFjZWhvbGRlciIsInBsYWNlaG9sZGVyIiwiZGVmYXVsdEJhc2VDbGFzc2VzIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiYXBwZW5kIiwiaW5zZXJ0QWZ0ZXIiLCJ2YWwiLCJpbml0aWFsaXplRHJvcGRvd24iLCIkdGV4dEVsZW1lbnQiLCJyZW1vdmVDbGFzcyIsInNldHRpbmdzIiwiYWxsb3dBZGRpdGlvbnMiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwicHJlc2VydmVIVE1MIiwib25DaGFuZ2UiLCIkY2hvaWNlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFwaVVybCIsImhhc1NlYXJjaElucHV0IiwiaGFzQ2xhc3MiLCJpbmRleE9mIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJjYWNoZSIsInVuZGVmaW5lZCIsInRocm90dGxlIiwidGhyb3R0bGVGaXJzdFJlcXVlc3QiLCJmaWx0ZXJSZW1vdGVEYXRhIiwibWluQ2hhcmFjdGVycyIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsImRlZmF1bHRSZXNwb25zZUhhbmRsZXIiLCJvbkZhaWx1cmUiLCJlcnJvciIsImFwaVBhcmFtcyIsInBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImV4aXN0aW5nUGFyYW1zIiwidG9TdHJpbmciLCJxdWVyeUluZGV4Iiwic3Vic3RyaW5nIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsInBvcHVsYXRlU3RhdGljT3B0aW9ucyIsImRyb3Bkb3duIiwic2V0VGltZW91dCIsInJlc3VsdCIsInN1Y2Nlc3MiLCJBcnJheSIsImlzQXJyYXkiLCJyZXN1bHRzIiwibWFwIiwiaXRlbSIsInJhd1RleHQiLCJyZXByZXNlbnQiLCJzYWZlVGV4dCIsImZpZWxkcyIsInZhbHVlcyIsImZvckVhY2giLCJlc2NhcGVIdG1sIiwib3B0aW9ucyIsInJhd1ZhbHVlIiwic2FmZVZhbHVlIiwiYnVpbGRNdWx0aXBsZURyb3Bkb3ducyIsImNvbmZpZ3MiLCJPYmplY3QiLCJrZXlzIiwic2V0VmFsdWUiLCJnZXRWYWx1ZSIsImNsZWFyIiwiZGl2IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwidGV4dENvbnRlbnQiLCJpbm5lckhUTUwiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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LElBQUFBLEdBQUcsQ0FBQ0csV0FBSixHQUFrQjlGLElBQWxCO0FBQ0EsV0FBTzJGLEdBQUcsQ0FBQ0ksU0FBWDtBQUNIO0FBdlowQixDQUEvQixDLENBMFpBOztBQUNBLElBQUksT0FBT0MsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCekgsc0JBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgRm9ybSwgZ2xvYmFsVHJhbnNsYXRlLCBTZWN1cml0eVV0aWxzICovXG5cbi8qKlxuICogRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAtIFVuaXZlcnNhbCBkcm9wZG93biBidWlsZGVyIGZvciBNaWtvUEJYIFY1LjBcbiAqIFxuICogQnVpbGRzIGRyb3Bkb3duIEhUTUwgZHluYW1pY2FsbHkgYmFzZWQgb24gUkVTVCBBUEkgZGF0YS5cbiAqIFNlcGFyYXRlcyBjb25jZXJuczogUEhQIGZvcm1zIG9ubHkgcHJvdmlkZSBoaWRkZW4gaW5wdXRzLCBcbiAqIEphdmFTY3JpcHQgYnVpbGRzIFVJIGFuZCBwb3B1bGF0ZXMgd2l0aCBkYXRhLlxuICogXG4gKiBVc2FnZTpcbiAqIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICogICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0Rm9yU2VsZWN0JyxcbiAqICAgICBwbGFjZWhvbGRlcjogJ1NlbGVjdCBuZXR3b3JrIGZpbHRlcidcbiAqIH0pO1xuICovXG5jb25zdCBEeW5hbWljRHJvcGRvd25CdWlsZGVyID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGRyb3Bkb3duIGZvciBhIGZpZWxkIGJhc2VkIG9uIFJFU1QgQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSAoZS5nLiwgJ25ldHdvcmtmaWx0ZXJpZCcpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gRHJvcGRvd24gY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcgPSB7fSkge1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgSGlkZGVuIGlucHV0IG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGROYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBhbHJlYWR5IGV4aXN0cyAtIHVwZGF0ZSBpdCBpbnN0ZWFkIG9mIGNyZWF0aW5nIGR1cGxpY2F0ZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVFeGlzdGluZ0Ryb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWVzIGZyb20gZGF0YVxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBkYXRhW2ZpZWxkTmFtZV0gfHwgY29uZmlnLmRlZmF1bHRWYWx1ZSB8fCAnJztcbiAgICAgICAgY29uc3QgcmVwcmVzZW50RmllbGQgPSBgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgIFxuICAgICAgICAvLyBUcnkgbXVsdGlwbGUgcG9zc2libGUgcmVwcmVzZW50IGZpZWxkIG5hbWVzIGZvciBmbGV4aWJpbGl0eVxuICAgICAgICBsZXQgY3VycmVudFRleHQgPSBkYXRhW3JlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIC8vIFRyeSB3aXRob3V0ICdpZCcgc3VmZml4IChlLmcuLCBuZXR3b3JrZmlsdGVyX3JlcHJlc2VudCBpbnN0ZWFkIG9mIG5ldHdvcmtmaWx0ZXJpZF9yZXByZXNlbnQpXG4gICAgICAgICAgICBjb25zdCBiYXNlRmllbGROYW1lID0gZmllbGROYW1lLnJlcGxhY2UoL2lkJC8sICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQgPSBgJHtiYXNlRmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBkYXRhW2FsdGVybmF0aXZlUmVwcmVzZW50RmllbGRdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgdmFsdWUgYnV0IG5vIHJlcHJlc2VudCB0ZXh0LCB0cnkgdG8gZmluZCBpdCBpbiBzdGF0aWMgb3B0aW9ucyBmaXJzdFxuICAgICAgICBpZiAoY3VycmVudFZhbHVlICYmICFjdXJyZW50VGV4dCAmJiBjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2hpbmdPcHRpb24gPSBjb25maWcuc3RhdGljT3B0aW9ucy5maW5kKG9wdGlvbiA9PiBvcHRpb24udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICBpZiAobWF0Y2hpbmdPcHRpb24pIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGV4dCA9IG1hdGNoaW5nT3B0aW9uLnRleHQgfHwgbWF0Y2hpbmdPcHRpb24ubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgSFRNTCBpbiByZXByZXNlbnQgdGV4dCB1c2luZyBTZWN1cml0eVV0aWxzXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCAmJiB0eXBlb2YgY3VycmVudFRleHQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIGZvciBhbGwgX3JlcHJlc2VudCBmaWVsZHMgYXMgdGhleSBjYW4gY29udGFpbiBIVE1MIGVudGl0aWVzIGFuZCBpY29uc1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UncmUgdXNpbmcgcGxhY2Vob2xkZXIgdGV4dFxuICAgICAgICBjb25zdCBpc1VzaW5nUGxhY2Vob2xkZXIgPSAhY3VycmVudFRleHQ7XG5cbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gcGxhY2Vob2xkZXIgb3IgZGVmYXVsdFxuICAgICAgICBjdXJyZW50VGV4dCA9IGN1cnJlbnRUZXh0IHx8IGNvbmZpZy5wbGFjZWhvbGRlciB8fCAnU2VsZWN0IHZhbHVlJztcblxuICAgICAgICAvLyBCdWlsZCBDU1MgY2xhc3NlcyB3aXRoIHNhbml0aXphdGlvblxuICAgICAgICAvLyBBbGxvdyBjdXN0b20gYmFzZSBjbGFzc2VzIG9yIHVzZSBkZWZhdWx0IHdpdGggJ3NlbGVjdGlvbidcbiAgICAgICAgY29uc3QgZGVmYXVsdEJhc2VDbGFzc2VzID0gWyd1aScsICdzZWxlY3Rpb24nLCAnZHJvcGRvd24nXTtcbiAgICAgICAgY29uc3QgYmFzZUNsYXNzZXMgPSBjb25maWcuYmFzZUNsYXNzZXMgfHwgZGVmYXVsdEJhc2VDbGFzc2VzO1xuICAgICAgICBjb25zdCBhZGRpdGlvbmFsQ2xhc3NlcyA9IGNvbmZpZy5hZGRpdGlvbmFsQ2xhc3NlcyB8fCBbXTtcbiAgICAgICAgY29uc3QgYWxsQ2xhc3NlcyA9IFsuLi5iYXNlQ2xhc3NlcywgLi4uYWRkaXRpb25hbENsYXNzZXNdLmpvaW4oJyAnKTtcblxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biBIVE1MIC0gRklYRUQ6IENyZWF0ZSBlbGVtZW50cyB3aXRoIGpRdWVyeSB0byBwcm9wZXJseSBoYW5kbGUgSFRNTCBjb250ZW50XG4gICAgICAgIC8vIE9ubHkgc2hvdyBjdXJyZW50IHZhbHVlIGluIHRleHQgZGlzcGxheSwgbGV0IEFQSSBwb3B1bGF0ZSBtZW51IG9uIGNsaWNrXG4gICAgICAgIC8vIFVzZSAnZGVmYXVsdCcgY2xhc3Mgd2hlbiBzaG93aW5nIHBsYWNlaG9sZGVyLCBldmVuIGlmIHRoZXJlJ3MgYSB2YWx1ZVxuICAgICAgICBjb25zdCB0ZXh0Q2xhc3MgPSBpc1VzaW5nUGxhY2Vob2xkZXIgPyAndGV4dCBkZWZhdWx0JyA6ICd0ZXh0JztcbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIGZpZWxkTmFtZSBmb3IgdXNlIGluIElEIGF0dHJpYnV0ZVxuICAgICAgICBjb25zdCBzYWZlRmllbGROYW1lID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplQXR0cmlidXRlKGZpZWxkTmFtZSlcbiAgICAgICAgICAgIDogZmllbGROYW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIHN0cnVjdHVyZSB1c2luZyBqUXVlcnkgZm9yIHByb3BlciBIVE1MIGhhbmRsaW5nXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhhbGxDbGFzc2VzKVxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgYCR7c2FmZUZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICR0ZXh0RGl2ID0gJCgnPGRpdj4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKHRleHRDbGFzcylcbiAgICAgICAgICAgIC5odG1sKGN1cnJlbnRUZXh0KTsgLy8gY3VycmVudFRleHQgYWxyZWFkeSBzYW5pdGl6ZWQgYWJvdmVcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRkcm9wZG93bkljb24gPSAkKCc8aT4nKS5hZGRDbGFzcygnZHJvcGRvd24gaWNvbicpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCc8ZGl2PicpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ21lbnUnKVxuICAgICAgICAgICAgLmh0bWwoJzwhLS0gTWVudSBpbnRlbnRpb25hbGx5IGVtcHR5IC0gd2lsbCBiZSBwb3B1bGF0ZWQgYnkgQVBJIG9uIGNsaWNrIC0tPicpO1xuICAgICAgICBcbiAgICAgICAgLy8gQXNzZW1ibGUgZHJvcGRvd25cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZCgkdGV4dERpdiwgJGRyb3Bkb3duSWNvbiwgJG1lbnUpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5zZXJ0IGRyb3Bkb3duIGFmdGVyIGhpZGRlbiBpbnB1dFxuICAgICAgICAkZHJvcGRvd24uaW5zZXJ0QWZ0ZXIoJGhpZGRlbklucHV0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB2YWx1ZSBpbiBoaWRkZW4gaW5wdXRcbiAgICAgICAgJGhpZGRlbklucHV0LnZhbChjdXJyZW50VmFsdWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZXhpc3RpbmcgZHJvcGRvd24gd2l0aCBuZXcgY29uZmlndXJhdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZvciB0aGUgZHJvcGRvd25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gTmV3IGNvbmZpZ3VyYXRpb24gdG8gYXBwbHlcbiAgICAgKi9cbiAgICB1cGRhdGVFeGlzdGluZ0Ryb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYENhbm5vdCB1cGRhdGU6IGRyb3Bkb3duIG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGROYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHZhbHVlIGlmIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGRhdGFbZmllbGROYW1lXSB8fCBjb25maWcuZGVmYXVsdFZhbHVlIHx8ICcnO1xuICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biB0ZXh0IGlmIHJlcHJlc2VudCBmaWVsZCBpcyBwcm92aWRlZFxuICAgICAgICBjb25zdCByZXByZXNlbnRGaWVsZCA9IGAke2ZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgbGV0IGN1cnJlbnRUZXh0ID0gZGF0YVtyZXByZXNlbnRGaWVsZF07XG4gICAgICAgIGlmICghY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VGaWVsZE5hbWUgPSBmaWVsZE5hbWUucmVwbGFjZSgvaWQkLywgJycpO1xuICAgICAgICAgICAgY29uc3QgYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZCA9IGAke2Jhc2VGaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IGRhdGFbYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIEhUTUwgaW4gcmVwcmVzZW50IHRleHQgdXNpbmcgU2VjdXJpdHlVdGlscyAoY29uc2lzdGVudCB3aXRoIGJ1aWxkRHJvcGRvd24pXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCAmJiB0eXBlb2YgY3VycmVudFRleHQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIGZvciBhbGwgX3JlcHJlc2VudCBmaWVsZHMgYXMgdGhleSBjYW4gY29udGFpbiBIVE1MIGVudGl0aWVzIGFuZCBpY29uc1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICBjb25zdCAkdGV4dEVsZW1lbnQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKTtcbiAgICAgICAgICAgICR0ZXh0RWxlbWVudC5odG1sKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgICAgICR0ZXh0RWxlbWVudC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyb3Bkb3duIHdpdGggbmV3IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHJvcGRvd24oZmllbGROYW1lLCBjb25maWcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93biB3aXRoIEFQSSBvciBzdGF0aWMgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3duKGZpZWxkTmFtZSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYERyb3Bkb3duIG5vdCBmb3VuZDogJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGFsbG93QWRkaXRpb25zOiBmYWxzZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgcHJlc2VydmVIVE1MOiB0cnVlLCAvLyBBbGxvdyBIVE1MIGluIGRyb3Bkb3duIHRleHQgKGZvciBpY29ucywgZmxhZ3MsIGV0Yy4pXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQsICRjaG9pY2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBBdXRvbWF0aWMgc3luY2hyb25pemF0aW9uIHdpdGggaGlkZGVuIGlucHV0XG4gICAgICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgb24gaGlkZGVuIGlucHV0IGZvciBmb3JtIHZhbGlkYXRpb24vcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBOb3RpZnkgZm9ybSBvZiBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3VzdG9tIG9uQ2hhbmdlIGhhbmRsZXIgLSBvbmx5IGZvciBmaWVsZC1zcGVjaWZpYyBsb2dpY1xuICAgICAgICAgICAgICAgIGlmIChjb25maWcub25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLm9uQ2hhbmdlKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQVBJIHNldHRpbmdzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChjb25maWcuYXBpVXJsKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBoYXMgc2VhcmNoIGZ1bmN0aW9uYWxpdHkgLSBkZXRlY3QgYnkgQ1NTIGNsYXNzZXMgc2luY2Ugc2VhcmNoIGlucHV0IGlzIGFkZGVkIGJ5IEZvbWFudGljIFVJIGxhdGVyXG4gICAgICAgICAgICBjb25zdCBoYXNTZWFyY2hJbnB1dCA9ICRkcm9wZG93bi5oYXNDbGFzcygnc2VhcmNoJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxldCBhcGlVcmwgPSBjb25maWcuYXBpVXJsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IGFkZCBxdWVyeSBwYXJhbWV0ZXIgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25zXG4gICAgICAgICAgICBpZiAoaGFzU2VhcmNoSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmFwaVVybC5pbmRleE9mKCc/JykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJyZxdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJz9xdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgICAgIHVybDogYXBpVXJsLFxuICAgICAgICAgICAgICAgIGNhY2hlOiBjb25maWcuY2FjaGUgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5jYWNoZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGU6IGhhc1NlYXJjaElucHV0ID8gNTAwIDogMCxcbiAgICAgICAgICAgICAgICB0aHJvdHRsZUZpcnN0UmVxdWVzdDogZmFsc2UsXG4gICAgICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBtaW5DaGFyYWN0ZXJzOiBoYXNTZWFyY2hJbnB1dCA/IDMgOiAwLCAvLyBTZWFyY2ggZHJvcGRvd25zIG5lZWQgMyBjaGFyYWN0ZXJzLCBzaW1wbGUgZHJvcGRvd25zIHdvcmsgb24gY2xpY2tcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbmZpZy5vblJlc3BvbnNlIFxuICAgICAgICAgICAgICAgICAgICAgICAgPyBjb25maWcub25SZXNwb25zZShyZXNwb25zZSkgXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHRoaXMuZGVmYXVsdFJlc3BvbnNlSGFuZGxlcihyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGDinYwgQVBJIHJlcXVlc3QgZmFpbGVkIGZvciAke2ZpZWxkTmFtZX0gKCR7Y29uZmlnLmFwaVVybH0pOmAsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIEFQSSBwYXJhbWV0ZXJzIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAoY29uZmlnLmFwaVBhcmFtcyAmJiB0eXBlb2YgY29uZmlnLmFwaVBhcmFtcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGNvbmZpZy5hcGlQYXJhbXMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nUGFyYW1zID0gcGFyYW1zLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcGlVcmwuaW5kZXhPZignPycpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHF1ZXJ5SW5kZXggPSBhcGlVcmwuaW5kZXhPZigncXVlcnk9e3F1ZXJ5fScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHF1ZXJ5SW5kZXggPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCA9IGFwaVVybC5zdWJzdHJpbmcoMCwgcXVlcnlJbmRleCkgKyBleGlzdGluZ1BhcmFtcyArICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnJicgKyBleGlzdGluZ1BhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgYWRkIHF1ZXJ5IHBhcmFtZXRlciBpZiB0aGUgZHJvcGRvd24gaXMgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhc1NlYXJjaElucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICc/JyArIGV4aXN0aW5nUGFyYW1zICsgJyZxdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICc/JyArIGV4aXN0aW5nUGFyYW1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuYXBpU2V0dGluZ3MudXJsID0gYXBpVXJsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSB0ZW1wbGF0ZSB0byBwcm9wZXJseSByZW5kZXIgSFRNTCBjb250ZW50XG4gICAgICAgICAgICBpZiAoIWNvbmZpZy50ZW1wbGF0ZXMpIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy50ZW1wbGF0ZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIG1lbnU6IHRoaXMuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MudGVtcGxhdGVzID0gY29uZmlnLnRlbXBsYXRlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgLy8gRm9yIHN0YXRpYyBvcHRpb25zLCBwb3B1bGF0ZSBtZW51IGltbWVkaWF0ZWx5XG4gICAgICAgICAgICB0aGlzLnBvcHVsYXRlU3RhdGljT3B0aW9ucygkZHJvcGRvd24sIGNvbmZpZy5zdGF0aWNPcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgbmF0aXZlIEZvbWFudGljIFVJIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bihzZXR0aW5ncyk7XG5cbiAgICAgICAgLy8gU2V0IHNlbGVjdGVkIHZhbHVlIGZvciBzdGF0aWMgb3B0aW9ucyBhZnRlciBpbml0aWFsaXphdGlvblxuICAgICAgICBpZiAoY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRoaWRkZW5JbnB1dC52YWwoKTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgZHJvcGRvd24gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBBUEkgcmVzcG9uc2UgaGFuZGxlciBmb3IgTWlrb1BCWCBmb3JtYXRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBGb21hbnRpYyBVSSBjb21wYXRpYmxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZGVmYXVsdFJlc3BvbnNlSGFuZGxlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAoKHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZS5zdWNjZXNzKSAmJiByZXNwb25zZS5kYXRhICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICByZXN1bHRzOiByZXNwb25zZS5kYXRhLm1hcChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmF3VGV4dCA9IGl0ZW0ucmVwcmVzZW50IHx8IGl0ZW0ubmFtZSB8fCBpdGVtLnRleHQ7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNhbml0aXplIGRpc3BsYXkgdGV4dCB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgSFRNTCAoaWNvbnMpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHJhd1RleHQ7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBzYWZlVGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHNhZmVUZXh0XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgXG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSwgXG4gICAgICAgICAgICByZXN1bHRzOiBbXSBcbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBkcm9wZG93biBtZW51IHRlbXBsYXRlIGZvciBwcm9wZXIgSFRNTCByZW5kZXJpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmaWVsZHMgLSBGaWVsZCBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgZHJvcGRvd24gbWVudVxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgdmFsdWVzLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gb3B0aW9uW2ZpZWxkcy52YWx1ZV0gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gb3B0aW9uW2ZpZWxkcy50ZXh0XSB8fCBvcHRpb25bZmllbGRzLm5hbWVdIHx8ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke0R5bmFtaWNEcm9wZG93bkJ1aWxkZXIuZXNjYXBlSHRtbCh2YWx1ZSl9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gdGV4dDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBkcm9wZG93biB3aXRoIHN0YXRpYyBvcHRpb25zXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRkcm9wZG93biAtIERyb3Bkb3duIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBvcHRpb25zIC0gU3RhdGljIG9wdGlvbnMgYXJyYXlcbiAgICAgKi9cbiAgICBwb3B1bGF0ZVN0YXRpY09wdGlvbnMoJGRyb3Bkb3duLCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgIFxuICAgICAgICBvcHRpb25zLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJhd1ZhbHVlID0gb3B0aW9uLnZhbHVlO1xuICAgICAgICAgICAgY29uc3QgcmF3VGV4dCA9IG9wdGlvbi50ZXh0IHx8IG9wdGlvbi5uYW1lO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTYW5pdGl6ZSB2YWx1ZSBmb3IgYXR0cmlidXRlIGFuZCB0ZXh0IGZvciBkaXNwbGF5XG4gICAgICAgICAgICBjb25zdCBzYWZlVmFsdWUgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplQXR0cmlidXRlKHJhd1ZhbHVlKVxuICAgICAgICAgICAgICAgIDogdGhpcy5lc2NhcGVIdG1sKHJhd1ZhbHVlKTtcbiAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhyYXdUZXh0KVxuICAgICAgICAgICAgICAgIDogcmF3VGV4dDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke3NhZmVWYWx1ZX1cIj4ke3NhZmVUZXh0fTwvZGl2PmApO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIG11bHRpcGxlIGRyb3Bkb3ducyBmcm9tIGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlncyAtIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGRcbiAgICAgKi9cbiAgICBidWlsZE11bHRpcGxlRHJvcGRvd25zKGRhdGEsIGNvbmZpZ3MpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoY29uZmlncykuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgdGhpcy5idWlsZERyb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnc1tmaWVsZE5hbWVdKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgdmFsdWUgaW4gZXhpc3RpbmcgZHJvcGRvd25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFZhbHVlIHRvIHNldFxuICAgICAqL1xuICAgIHNldFZhbHVlKGZpZWxkTmFtZSwgdmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDdXJyZW50IHZhbHVlXG4gICAgICovXG4gICAgZ2V0VmFsdWUoZmllbGROYW1lKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgcmV0dXJuICRkcm9wZG93bi5sZW5ndGggPyAkZHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpIDogJyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciBkcm9wZG93biBzZWxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqL1xuICAgIGNsZWFyKGZpZWxkTmFtZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgdG8gcHJldmVudCBYU1NcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gZXNjYXBlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgZXNjYXBlSHRtbCh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBkaXYudGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgICAgICByZXR1cm4gZGl2LmlubmVySFRNTDtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IER5bmFtaWNEcm9wZG93bkJ1aWxkZXI7XG59Il19