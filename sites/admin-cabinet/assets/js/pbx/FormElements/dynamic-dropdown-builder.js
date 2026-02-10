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
    var $menu = $('<div>').addClass('menu'); // Pre-populate menu with empty option so it is visible on first click
    // (search dropdowns with minCharacters>0 won't trigger API until user types)

    if (config.emptyOption) {
      var safeValue = this.escapeHtml(config.emptyOption.key || '');
      $menu.html("<div class=\"item\" data-value=\"".concat(safeValue, "\">").concat(config.emptyOption.value || '', "</div>"));
    } // Assemble dropdown


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
      clearable: false,
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
          var result = config.onResponse ? config.onResponse(response) : _this.defaultResponseHandler(response); // Prepend empty option if configured

          if (config.emptyOption && result && result.results) {
            result.results.unshift({
              value: config.emptyOption.key || '',
              text: config.emptyOption.value || '',
              name: config.emptyOption.value || '',
              type: '',
              typeLocalized: ''
            });
          }

          return result;
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
            name: safeText,
            disabled: item.disabled || false
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
      var isDisabled = option.disabled || false; // Use 'inactive' class for visual styling without blocking selection

      var visualClass = isDisabled ? ' inactive' : '';
      html += "<div class=\"item".concat(visualClass, "\" data-value=\"").concat(DynamicDropdownBuilder.escapeHtml(value), "\">");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImlzVXNpbmdQbGFjZWhvbGRlciIsInBsYWNlaG9sZGVyIiwiZGVmYXVsdEJhc2VDbGFzc2VzIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiZW1wdHlPcHRpb24iLCJzYWZlVmFsdWUiLCJlc2NhcGVIdG1sIiwia2V5IiwiYXBwZW5kIiwiaW5zZXJ0QWZ0ZXIiLCJ2YWwiLCJpbml0aWFsaXplRHJvcGRvd24iLCIkdGV4dEVsZW1lbnQiLCJyZW1vdmVDbGFzcyIsInNldHRpbmdzIiwiYWxsb3dBZGRpdGlvbnMiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwicHJlc2VydmVIVE1MIiwiY2xlYXJhYmxlIiwib25DaGFuZ2UiLCIkY2hvaWNlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFwaVVybCIsImhhc1NlYXJjaElucHV0IiwiaGFzQ2xhc3MiLCJpbmRleE9mIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJjYWNoZSIsInVuZGVmaW5lZCIsInRocm90dGxlIiwidGhyb3R0bGVGaXJzdFJlcXVlc3QiLCJmaWx0ZXJSZW1vdGVEYXRhIiwibWluQ2hhcmFjdGVycyIsIm9uUmVzcG9uc2UiLCJyZXNwb25zZSIsInJlc3VsdCIsImRlZmF1bHRSZXNwb25zZUhhbmRsZXIiLCJyZXN1bHRzIiwidW5zaGlmdCIsInR5cGUiLCJ0eXBlTG9jYWxpemVkIiwib25GYWlsdXJlIiwiZXJyb3IiLCJhcGlQYXJhbXMiLCJwYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJleGlzdGluZ1BhcmFtcyIsInRvU3RyaW5nIiwicXVlcnlJbmRleCIsInN1YnN0cmluZyIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJwb3B1bGF0ZVN0YXRpY09wdGlvbnMiLCJkcm9wZG93biIsInNldFRpbWVvdXQiLCJzdWNjZXNzIiwiQXJyYXkiLCJpc0FycmF5IiwibWFwIiwiaXRlbSIsInJhd1RleHQiLCJyZXByZXNlbnQiLCJzYWZlVGV4dCIsImRpc2FibGVkIiwiZmllbGRzIiwidmFsdWVzIiwiZm9yRWFjaCIsImlzRGlzYWJsZWQiLCJ2aXN1YWxDbGFzcyIsIm9wdGlvbnMiLCJyYXdWYWx1ZSIsImJ1aWxkTXVsdGlwbGVEcm9wZG93bnMiLCJjb25maWdzIiwiT2JqZWN0Iiwia2V5cyIsInNldFZhbHVlIiwiZ2V0VmFsdWUiLCJjbGVhciIsImRpdiIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInRleHRDb250ZW50IiwiaW5uZXJIVE1MIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNB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Z0IsRUEwYVY7QUFDYixRQUFNb0csR0FBRyxHQUFHQyxRQUFRLENBQUNDLGFBQVQsQ0FBdUIsS0FBdkIsQ0FBWjtBQUNBRixJQUFBQSxHQUFHLENBQUNHLFdBQUosR0FBa0J2RyxJQUFsQjtBQUNBLFdBQU9vRyxHQUFHLENBQUNJLFNBQVg7QUFDSDtBQTlhMEIsQ0FBL0IsQyxDQWliQTs7QUFDQSxJQUFJLE9BQU9DLE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQmxJLHNCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIEZvcm0sIGdsb2JhbFRyYW5zbGF0ZSwgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgLSBVbml2ZXJzYWwgZHJvcGRvd24gYnVpbGRlciBmb3IgTWlrb1BCWCBWNS4wXG4gKiBcbiAqIEJ1aWxkcyBkcm9wZG93biBIVE1MIGR5bmFtaWNhbGx5IGJhc2VkIG9uIFJFU1QgQVBJIGRhdGEuXG4gKiBTZXBhcmF0ZXMgY29uY2VybnM6IFBIUCBmb3JtcyBvbmx5IHByb3ZpZGUgaGlkZGVuIGlucHV0cywgXG4gKiBKYXZhU2NyaXB0IGJ1aWxkcyBVSSBhbmQgcG9wdWxhdGVzIHdpdGggZGF0YS5cbiAqIFxuICogVXNhZ2U6XG4gKiBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAqICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjIvbmV0d29yay1maWx0ZXJzL2dldEZvclNlbGVjdCcsXG4gKiAgICAgcGxhY2Vob2xkZXI6ICdTZWxlY3QgbmV0d29yayBmaWx0ZXInXG4gKiB9KTtcbiAqL1xuY29uc3QgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBkcm9wZG93biBmb3IgYSBmaWVsZCBiYXNlZCBvbiBSRVNUIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWUgKGUuZy4sICduZXR3b3JrZmlsdGVyaWQnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIERyb3Bkb3duIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBidWlsZERyb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnID0ge30pIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEhpZGRlbiBpbnB1dCBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgZHJvcGRvd24gYWxyZWFkeSBleGlzdHMgLSB1cGRhdGUgaXQgaW5zdGVhZCBvZiBjcmVhdGluZyBkdXBsaWNhdGVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nRHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdEcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRXhpc3RpbmdEcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlcyBmcm9tIGRhdGFcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gZGF0YVtmaWVsZE5hbWVdIHx8IGNvbmZpZy5kZWZhdWx0VmFsdWUgfHwgJyc7XG4gICAgICAgIGNvbnN0IHJlcHJlc2VudEZpZWxkID0gYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHBvc3NpYmxlIHJlcHJlc2VudCBmaWVsZCBuYW1lcyBmb3IgZmxleGliaWxpdHlcbiAgICAgICAgbGV0IGN1cnJlbnRUZXh0ID0gZGF0YVtyZXByZXNlbnRGaWVsZF07XG4gICAgICAgIFxuICAgICAgICBpZiAoIWN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICAvLyBUcnkgd2l0aG91dCAnaWQnIHN1ZmZpeCAoZS5nLiwgbmV0d29ya2ZpbHRlcl9yZXByZXNlbnQgaW5zdGVhZCBvZiBuZXR3b3JrZmlsdGVyaWRfcmVwcmVzZW50KVxuICAgICAgICAgICAgY29uc3QgYmFzZUZpZWxkTmFtZSA9IGZpZWxkTmFtZS5yZXBsYWNlKC9pZCQvLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkID0gYCR7YmFzZUZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gZGF0YVthbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIHZhbHVlIGJ1dCBubyByZXByZXNlbnQgdGV4dCwgdHJ5IHRvIGZpbmQgaXQgaW4gc3RhdGljIG9wdGlvbnMgZmlyc3RcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAmJiAhY3VycmVudFRleHQgJiYgY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoaW5nT3B0aW9uID0gY29uZmlnLnN0YXRpY09wdGlvbnMuZmluZChvcHRpb24gPT4gb3B0aW9uLnZhbHVlID09PSBjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgaWYgKG1hdGNoaW5nT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFRleHQgPSBtYXRjaGluZ09wdGlvbi50ZXh0IHx8IG1hdGNoaW5nT3B0aW9uLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIEhUTUwgaW4gcmVwcmVzZW50IHRleHQgdXNpbmcgU2VjdXJpdHlVdGlsc1xuICAgICAgICBpZiAoY3VycmVudFRleHQgJiYgdHlwZW9mIGN1cnJlbnRUZXh0ID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIFVzZSBzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyBmb3IgYWxsIF9yZXByZXNlbnQgZmllbGRzIGFzIHRoZXkgY2FuIGNvbnRhaW4gSFRNTCBlbnRpdGllcyBhbmQgaWNvbnNcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhjdXJyZW50VGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdlJ3JlIHVzaW5nIHBsYWNlaG9sZGVyIHRleHRcbiAgICAgICAgY29uc3QgaXNVc2luZ1BsYWNlaG9sZGVyID0gIWN1cnJlbnRUZXh0O1xuXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIHBsYWNlaG9sZGVyIG9yIGRlZmF1bHRcbiAgICAgICAgY3VycmVudFRleHQgPSBjdXJyZW50VGV4dCB8fCBjb25maWcucGxhY2Vob2xkZXIgfHwgJ1NlbGVjdCB2YWx1ZSc7XG5cbiAgICAgICAgLy8gQnVpbGQgQ1NTIGNsYXNzZXMgd2l0aCBzYW5pdGl6YXRpb25cbiAgICAgICAgLy8gQWxsb3cgY3VzdG9tIGJhc2UgY2xhc3NlcyBvciB1c2UgZGVmYXVsdCB3aXRoICdzZWxlY3Rpb24nXG4gICAgICAgIGNvbnN0IGRlZmF1bHRCYXNlQ2xhc3NlcyA9IFsndWknLCAnc2VsZWN0aW9uJywgJ2Ryb3Bkb3duJ107XG4gICAgICAgIGNvbnN0IGJhc2VDbGFzc2VzID0gY29uZmlnLmJhc2VDbGFzc2VzIHx8IGRlZmF1bHRCYXNlQ2xhc3NlcztcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbENsYXNzZXMgPSBjb25maWcuYWRkaXRpb25hbENsYXNzZXMgfHwgW107XG4gICAgICAgIGNvbnN0IGFsbENsYXNzZXMgPSBbLi4uYmFzZUNsYXNzZXMsIC4uLmFkZGl0aW9uYWxDbGFzc2VzXS5qb2luKCcgJyk7XG5cbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gSFRNTCAtIEZJWEVEOiBDcmVhdGUgZWxlbWVudHMgd2l0aCBqUXVlcnkgdG8gcHJvcGVybHkgaGFuZGxlIEhUTUwgY29udGVudFxuICAgICAgICAvLyBPbmx5IHNob3cgY3VycmVudCB2YWx1ZSBpbiB0ZXh0IGRpc3BsYXksIGxldCBBUEkgcG9wdWxhdGUgbWVudSBvbiBjbGlja1xuICAgICAgICAvLyBVc2UgJ2RlZmF1bHQnIGNsYXNzIHdoZW4gc2hvd2luZyBwbGFjZWhvbGRlciwgZXZlbiBpZiB0aGVyZSdzIGEgdmFsdWVcbiAgICAgICAgY29uc3QgdGV4dENsYXNzID0gaXNVc2luZ1BsYWNlaG9sZGVyID8gJ3RleHQgZGVmYXVsdCcgOiAndGV4dCc7XG4gICAgICAgIFxuICAgICAgICAvLyBTYW5pdGl6ZSBmaWVsZE5hbWUgZm9yIHVzZSBpbiBJRCBhdHRyaWJ1dGVcbiAgICAgICAgY29uc3Qgc2FmZUZpZWxkTmFtZSA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUF0dHJpYnV0ZShmaWVsZE5hbWUpXG4gICAgICAgICAgICA6IGZpZWxkTmFtZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBzdHJ1Y3R1cmUgdXNpbmcgalF1ZXJ5IGZvciBwcm9wZXIgSFRNTCBoYW5kbGluZ1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoYWxsQ2xhc3NlcylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGAke3NhZmVGaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkdGV4dERpdiA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgIC5hZGRDbGFzcyh0ZXh0Q2xhc3MpXG4gICAgICAgICAgICAuaHRtbChjdXJyZW50VGV4dCk7IC8vIGN1cnJlbnRUZXh0IGFscmVhZHkgc2FuaXRpemVkIGFib3ZlXG4gICAgICAgIFxuICAgICAgICBjb25zdCAkZHJvcGRvd25JY29uID0gJCgnPGk+JykuYWRkQ2xhc3MoJ2Ryb3Bkb3duIGljb24nKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnPGRpdj4nKS5hZGRDbGFzcygnbWVudScpO1xuXG4gICAgICAgIC8vIFByZS1wb3B1bGF0ZSBtZW51IHdpdGggZW1wdHkgb3B0aW9uIHNvIGl0IGlzIHZpc2libGUgb24gZmlyc3QgY2xpY2tcbiAgICAgICAgLy8gKHNlYXJjaCBkcm9wZG93bnMgd2l0aCBtaW5DaGFyYWN0ZXJzPjAgd29uJ3QgdHJpZ2dlciBBUEkgdW50aWwgdXNlciB0eXBlcylcbiAgICAgICAgaWYgKGNvbmZpZy5lbXB0eU9wdGlvbikge1xuICAgICAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdGhpcy5lc2NhcGVIdG1sKGNvbmZpZy5lbXB0eU9wdGlvbi5rZXkgfHwgJycpO1xuICAgICAgICAgICAgJG1lbnUuaHRtbChgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtzYWZlVmFsdWV9XCI+JHtjb25maWcuZW1wdHlPcHRpb24udmFsdWUgfHwgJyd9PC9kaXY+YCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFzc2VtYmxlIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5hcHBlbmQoJHRleHREaXYsICRkcm9wZG93bkljb24sICRtZW51KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluc2VydCBkcm9wZG93biBhZnRlciBoaWRkZW4gaW5wdXRcbiAgICAgICAgJGRyb3Bkb3duLmluc2VydEFmdGVyKCRoaWRkZW5JbnB1dCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdmFsdWUgaW4gaGlkZGVuIGlucHV0XG4gICAgICAgICRoaWRkZW5JbnB1dC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHJvcGRvd24oZmllbGROYW1lLCBjb25maWcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGV4aXN0aW5nIGRyb3Bkb3duIHdpdGggbmV3IGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIE5ldyBjb25maWd1cmF0aW9uIHRvIGFwcGx5XG4gICAgICovXG4gICAgdXBkYXRlRXhpc3RpbmdEcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZykge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBDYW5ub3QgdXBkYXRlOiBkcm9wZG93biBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB2YWx1ZSBpZiBwcm92aWRlZFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBkYXRhW2ZpZWxkTmFtZV0gfHwgY29uZmlnLmRlZmF1bHRWYWx1ZSB8fCAnJztcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbChjdXJyZW50VmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gdGV4dCBpZiByZXByZXNlbnQgZmllbGQgaXMgcHJvdmlkZWRcbiAgICAgICAgY29uc3QgcmVwcmVzZW50RmllbGQgPSBgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgIGxldCBjdXJyZW50VGV4dCA9IGRhdGFbcmVwcmVzZW50RmllbGRdO1xuICAgICAgICBpZiAoIWN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICBjb25zdCBiYXNlRmllbGROYW1lID0gZmllbGROYW1lLnJlcGxhY2UoL2lkJC8sICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQgPSBgJHtiYXNlRmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBkYXRhW2FsdGVybmF0aXZlUmVwcmVzZW50RmllbGRdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTYW5pdGl6ZSBIVE1MIGluIHJlcHJlc2VudCB0ZXh0IHVzaW5nIFNlY3VyaXR5VXRpbHMgKGNvbnNpc3RlbnQgd2l0aCBidWlsZERyb3Bkb3duKVxuICAgICAgICBpZiAoY3VycmVudFRleHQgJiYgdHlwZW9mIGN1cnJlbnRUZXh0ID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIFVzZSBzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyBmb3IgYWxsIF9yZXByZXNlbnQgZmllbGRzIGFzIHRoZXkgY2FuIGNvbnRhaW4gSFRNTCBlbnRpdGllcyBhbmQgaWNvbnNcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhjdXJyZW50VGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgY29uc3QgJHRleHRFbGVtZW50ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Jyk7XG4gICAgICAgICAgICAkdGV4dEVsZW1lbnQuaHRtbChjdXJyZW50VGV4dCk7XG4gICAgICAgICAgICAkdGV4dEVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkcm9wZG93biB3aXRoIG5ldyBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURyb3Bkb3duKGZpZWxkTmFtZSwgY29uZmlnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBBUEkgb3Igc3RhdGljIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZykge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBEcm9wZG93biBub3QgZm91bmQ6ICR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBhbGxvd0FkZGl0aW9uczogZmFsc2UsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIHByZXNlcnZlSFRNTDogdHJ1ZSwgLy8gQWxsb3cgSFRNTCBpbiBkcm9wZG93biB0ZXh0IChmb3IgaWNvbnMsIGZsYWdzLCBldGMuKVxuICAgICAgICAgICAgY2xlYXJhYmxlOiBmYWxzZSxcblxuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSwgdGV4dCwgJGNob2ljZSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEF1dG9tYXRpYyBzeW5jaHJvbml6YXRpb24gd2l0aCBoaWRkZW4gaW5wdXRcbiAgICAgICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCBvbiBoaWRkZW4gaW5wdXQgZm9yIGZvcm0gdmFsaWRhdGlvbi9wcm9jZXNzaW5nXG4gICAgICAgICAgICAgICAgJGhpZGRlbklucHV0LnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE5vdGlmeSBmb3JtIG9mIGNoYW5nZXNcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uZGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDdXN0b20gb25DaGFuZ2UgaGFuZGxlciAtIG9ubHkgZm9yIGZpZWxkLXNwZWNpZmljIGxvZ2ljXG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5vbkNoYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25maWcub25DaGFuZ2UodmFsdWUsIHRleHQsICRjaG9pY2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBBUEkgc2V0dGluZ3MgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKGNvbmZpZy5hcGlVcmwpIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGhhcyBzZWFyY2ggZnVuY3Rpb25hbGl0eSAtIGRldGVjdCBieSBDU1MgY2xhc3NlcyBzaW5jZSBzZWFyY2ggaW5wdXQgaXMgYWRkZWQgYnkgRm9tYW50aWMgVUkgbGF0ZXJcbiAgICAgICAgICAgIGNvbnN0IGhhc1NlYXJjaElucHV0ID0gJGRyb3Bkb3duLmhhc0NsYXNzKCdzZWFyY2gnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbGV0IGFwaVVybCA9IGNvbmZpZy5hcGlVcmw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE9ubHkgYWRkIHF1ZXJ5IHBhcmFtZXRlciBmb3Igc2VhcmNoYWJsZSBkcm9wZG93bnNcbiAgICAgICAgICAgIGlmIChoYXNTZWFyY2hJbnB1dCkge1xuICAgICAgICAgICAgICAgIGlmIChjb25maWcuYXBpVXJsLmluZGV4T2YoJz8nKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnJnF1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnP3F1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2V0dGluZ3MuYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICAgICAgdXJsOiBhcGlVcmwsXG4gICAgICAgICAgICAgICAgY2FjaGU6IGNvbmZpZy5jYWNoZSAhPT0gdW5kZWZpbmVkID8gY29uZmlnLmNhY2hlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICB0aHJvdHRsZTogaGFzU2VhcmNoSW5wdXQgPyA1MDAgOiAwLFxuICAgICAgICAgICAgICAgIHRocm90dGxlRmlyc3RSZXF1ZXN0OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1pbkNoYXJhY3RlcnM6IGhhc1NlYXJjaElucHV0ID8gMyA6IDAsIC8vIFNlYXJjaCBkcm9wZG93bnMgbmVlZCAzIGNoYXJhY3RlcnMsIHNpbXBsZSBkcm9wZG93bnMgd29yayBvbiBjbGlja1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBjb25maWcub25SZXNwb25zZVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBjb25maWcub25SZXNwb25zZShyZXNwb25zZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIDogdGhpcy5kZWZhdWx0UmVzcG9uc2VIYW5kbGVyKHJlc3BvbnNlKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBQcmVwZW5kIGVtcHR5IG9wdGlvbiBpZiBjb25maWd1cmVkXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb25maWcuZW1wdHlPcHRpb24gJiYgcmVzdWx0ICYmIHJlc3VsdC5yZXN1bHRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQucmVzdWx0cy51bnNoaWZ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogY29uZmlnLmVtcHR5T3B0aW9uLmtleSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBjb25maWcuZW1wdHlPcHRpb24udmFsdWUgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogY29uZmlnLmVtcHR5T3B0aW9uLnZhbHVlIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVMb2NhbGl6ZWQ6ICcnXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGDinYwgQVBJIHJlcXVlc3QgZmFpbGVkIGZvciAke2ZpZWxkTmFtZX0gKCR7Y29uZmlnLmFwaVVybH0pOmAsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIEFQSSBwYXJhbWV0ZXJzIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAoY29uZmlnLmFwaVBhcmFtcyAmJiB0eXBlb2YgY29uZmlnLmFwaVBhcmFtcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKGNvbmZpZy5hcGlQYXJhbXMpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nUGFyYW1zID0gcGFyYW1zLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nUGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcGlVcmwuaW5kZXhPZignPycpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHF1ZXJ5SW5kZXggPSBhcGlVcmwuaW5kZXhPZigncXVlcnk9e3F1ZXJ5fScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHF1ZXJ5SW5kZXggPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCA9IGFwaVVybC5zdWJzdHJpbmcoMCwgcXVlcnlJbmRleCkgKyBleGlzdGluZ1BhcmFtcyArICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnJicgKyBleGlzdGluZ1BhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgYWRkIHF1ZXJ5IHBhcmFtZXRlciBpZiB0aGUgZHJvcGRvd24gaXMgc2VhcmNoYWJsZVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhhc1NlYXJjaElucHV0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICc/JyArIGV4aXN0aW5nUGFyYW1zICsgJyZxdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICc/JyArIGV4aXN0aW5nUGFyYW1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuYXBpU2V0dGluZ3MudXJsID0gYXBpVXJsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSB0ZW1wbGF0ZSB0byBwcm9wZXJseSByZW5kZXIgSFRNTCBjb250ZW50XG4gICAgICAgICAgICBpZiAoIWNvbmZpZy50ZW1wbGF0ZXMpIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy50ZW1wbGF0ZXMgPSB7XG4gICAgICAgICAgICAgICAgICAgIG1lbnU6IHRoaXMuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MudGVtcGxhdGVzID0gY29uZmlnLnRlbXBsYXRlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgLy8gRm9yIHN0YXRpYyBvcHRpb25zLCBwb3B1bGF0ZSBtZW51IGltbWVkaWF0ZWx5XG4gICAgICAgICAgICB0aGlzLnBvcHVsYXRlU3RhdGljT3B0aW9ucygkZHJvcGRvd24sIGNvbmZpZy5zdGF0aWNPcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgbmF0aXZlIEZvbWFudGljIFVJIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bihzZXR0aW5ncyk7XG5cbiAgICAgICAgLy8gU2V0IHNlbGVjdGVkIHZhbHVlIGZvciBzdGF0aWMgb3B0aW9ucyBhZnRlciBpbml0aWFsaXphdGlvblxuICAgICAgICBpZiAoY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRoaWRkZW5JbnB1dC52YWwoKTtcbiAgICAgICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgZHJvcGRvd24gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBBUEkgcmVzcG9uc2UgaGFuZGxlciBmb3IgTWlrb1BCWCBmb3JtYXRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBGb21hbnRpYyBVSSBjb21wYXRpYmxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZGVmYXVsdFJlc3BvbnNlSGFuZGxlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAoKHJlc3BvbnNlLnJlc3VsdCB8fCByZXNwb25zZS5zdWNjZXNzKSAmJiByZXNwb25zZS5kYXRhICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICByZXN1bHRzOiByZXNwb25zZS5kYXRhLm1hcChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmF3VGV4dCA9IGl0ZW0ucmVwcmVzZW50IHx8IGl0ZW0ubmFtZSB8fCBpdGVtLnRleHQ7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNhbml0aXplIGRpc3BsYXkgdGV4dCB3aGlsZSBwcmVzZXJ2aW5nIHNhZmUgSFRNTCAoaWNvbnMpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMocmF3VGV4dClcbiAgICAgICAgICAgICAgICAgICAgICAgIDogcmF3VGV4dDtcblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBzYWZlVGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHNhZmVUZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IGl0ZW0uZGlzYWJsZWQgfHwgZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICByZXN1bHRzOiBbXVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGRyb3Bkb3duIG1lbnUgdGVtcGxhdGUgZm9yIHByb3BlciBIVE1MIHJlbmRlcmluZ1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZpZWxkcyAtIEZpZWxkIGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIGZvciBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgdmFsdWVzLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gb3B0aW9uW2ZpZWxkcy52YWx1ZV0gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gb3B0aW9uW2ZpZWxkcy50ZXh0XSB8fCBvcHRpb25bZmllbGRzLm5hbWVdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgaXNEaXNhYmxlZCA9IG9wdGlvbi5kaXNhYmxlZCB8fCBmYWxzZTtcblxuICAgICAgICAgICAgLy8gVXNlICdpbmFjdGl2ZScgY2xhc3MgZm9yIHZpc3VhbCBzdHlsaW5nIHdpdGhvdXQgYmxvY2tpbmcgc2VsZWN0aW9uXG4gICAgICAgICAgICBjb25zdCB2aXN1YWxDbGFzcyA9IGlzRGlzYWJsZWQgPyAnIGluYWN0aXZlJyA6ICcnO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW0ke3Zpc3VhbENsYXNzfVwiIGRhdGEtdmFsdWU9XCIke0R5bmFtaWNEcm9wZG93bkJ1aWxkZXIuZXNjYXBlSHRtbCh2YWx1ZSl9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gdGV4dDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZHJvcGRvd24gd2l0aCBzdGF0aWMgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZHJvcGRvd24gLSBEcm9wZG93biBlbGVtZW50XG4gICAgICogQHBhcmFtIHtBcnJheX0gb3B0aW9ucyAtIFN0YXRpYyBvcHRpb25zIGFycmF5XG4gICAgICovXG4gICAgcG9wdWxhdGVTdGF0aWNPcHRpb25zKCRkcm9wZG93biwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCAkbWVudSA9ICRkcm9wZG93bi5maW5kKCcubWVudScpO1xuICAgICAgICBcbiAgICAgICAgb3B0aW9ucy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICAgICAgICBjb25zdCByYXdWYWx1ZSA9IG9wdGlvbi52YWx1ZTtcbiAgICAgICAgICAgIGNvbnN0IHJhd1RleHQgPSBvcHRpb24udGV4dCB8fCBvcHRpb24ubmFtZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU2FuaXRpemUgdmFsdWUgZm9yIGF0dHJpYnV0ZSBhbmQgdGV4dCBmb3IgZGlzcGxheVxuICAgICAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUF0dHJpYnV0ZShyYXdWYWx1ZSlcbiAgICAgICAgICAgICAgICA6IHRoaXMuZXNjYXBlSHRtbChyYXdWYWx1ZSk7XG4gICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMocmF3VGV4dClcbiAgICAgICAgICAgICAgICA6IHJhd1RleHQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRtZW51LmFwcGVuZChgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtzYWZlVmFsdWV9XCI+JHtzYWZlVGV4dH08L2Rpdj5gKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBtdWx0aXBsZSBkcm9wZG93bnMgZnJvbSBjb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZ3MgLSBDb25maWd1cmF0aW9uIGZvciBlYWNoIGZpZWxkXG4gICAgICovXG4gICAgYnVpbGRNdWx0aXBsZURyb3Bkb3ducyhkYXRhLCBjb25maWdzKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKGNvbmZpZ3MpLmZvckVhY2goZmllbGROYW1lID0+IHtcbiAgICAgICAgICAgIHRoaXMuYnVpbGREcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZ3NbZmllbGROYW1lXSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHZhbHVlIGluIGV4aXN0aW5nIGRyb3Bkb3duXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBWYWx1ZSB0byBzZXRcbiAgICAgKi9cbiAgICBzZXRWYWx1ZShmaWVsZE5hbWUsIHZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBkcm9wZG93biB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQ3VycmVudCB2YWx1ZVxuICAgICAqL1xuICAgIGdldFZhbHVlKGZpZWxkTmFtZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIHJldHVybiAkZHJvcGRvd24ubGVuZ3RoID8gJGRyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKSA6ICcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKi9cbiAgICBjbGVhcihmaWVsZE5hbWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIHRvIHByZXZlbnQgWFNTXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZGl2LnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgcmV0dXJuIGRpdi5pbm5lckhUTUw7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBEeW5hbWljRHJvcGRvd25CdWlsZGVyO1xufSJdfQ==