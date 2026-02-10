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
      } // Fix: Clicking the dropdown icon opens the menu without triggering API query.
      // Fomantic UI only calls queryRemote() in show() when can.show() is false (no items).
      // When setValue() adds a pre-selected item, can.show() returns true and API is skipped.
      // This onShow callback detects an under-populated menu and triggers a search via
      // the input event, which goes through module.search() -> filter() -> queryRemote().


      if (hasSearchInput) {
        settings.onShow = function () {
          var $drp = $(this);
          var $menu = $drp.find('.menu');

          if ($menu.find('.item').length <= 1) {
            var $searchInput = $drp.find('input.search');

            if ($searchInput.length) {
              $searchInput.trigger('input');
            }
          }
        };
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImlzVXNpbmdQbGFjZWhvbGRlciIsInBsYWNlaG9sZGVyIiwiZGVmYXVsdEJhc2VDbGFzc2VzIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiZW1wdHlPcHRpb24iLCJzYWZlVmFsdWUiLCJlc2NhcGVIdG1sIiwia2V5IiwiYXBwZW5kIiwiaW5zZXJ0QWZ0ZXIiLCJ2YWwiLCJpbml0aWFsaXplRHJvcGRvd24iLCIkdGV4dEVsZW1lbnQiLCJyZW1vdmVDbGFzcyIsInNldHRpbmdzIiwiYWxsb3dBZGRpdGlvbnMiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwicHJlc2VydmVIVE1MIiwiY2xlYXJhYmxlIiwib25DaGFuZ2UiLCIkY2hvaWNlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFwaVVybCIsImhhc1NlYXJjaElucHV0IiwiaGFzQ2xhc3MiLCJpbmRleE9mIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJjYWNoZSIsInVuZGVmaW5lZCIsInRocm90dGxlIiwidGhyb3R0bGVGaXJzdFJlcXVlc3QiLCJmaWx0ZXJSZW1vdGVEYXRhIiwib25SZXNwb25zZSIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGVmYXVsdFJlc3BvbnNlSGFuZGxlciIsInJlc3VsdHMiLCJ1bnNoaWZ0IiwidHlwZSIsInR5cGVMb2NhbGl6ZWQiLCJvbkZhaWx1cmUiLCJlcnJvciIsImFwaVBhcmFtcyIsInBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsImV4aXN0aW5nUGFyYW1zIiwidG9TdHJpbmciLCJxdWVyeUluZGV4Iiwic3Vic3RyaW5nIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsIm9uU2hvdyIsIiRkcnAiLCIkc2VhcmNoSW5wdXQiLCJwb3B1bGF0ZVN0YXRpY09wdGlvbnMiLCJkcm9wZG93biIsInNldFRpbWVvdXQiLCJzdWNjZXNzIiwiQXJyYXkiLCJpc0FycmF5IiwibWFwIiwiaXRlbSIsInJhd1RleHQiLCJyZXByZXNlbnQiLCJzYWZlVGV4dCIsImRpc2FibGVkIiwiZmllbGRzIiwidmFsdWVzIiwiZm9yRWFjaCIsImlzRGlzYWJsZWQiLCJ2aXN1YWxDbGFzcyIsIm9wdGlvbnMiLCJyYXdWYWx1ZSIsImJ1aWxkTXVsdGlwbGVEcm9wZG93bnMiLCJjb25maWdzIiwiT2JqZWN0Iiwia2V5cyIsInNldFZhbHVlIiwiZ2V0VmFsdWUiLCJjbGVhciIsImRpdiIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInRleHRDb250ZW50IiwiaW5uZXJIVE1MIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7OztBQUFB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R2hDLENBQUMsWUFBS0osU0FBTCxlQUFuQjtBQUNBLFdBQU9vQyxTQUFTLENBQUMvQixNQUFWLEdBQW1CK0IsU0FBUyxDQUFDK0QsUUFBVixDQUFtQixXQUFuQixDQUFuQixHQUFxRCxFQUE1RDtBQUNILEdBemEwQjs7QUEyYTNCO0FBQ0o7QUFDQTtBQUNBO0FBQ0l3QixFQUFBQSxLQS9hMkIsaUJBK2FyQjNILFNBL2FxQixFQSthVjtBQUNiLFFBQU1vQyxTQUFTLEdBQUdoQyxDQUFDLFlBQUtKLFNBQUwsZUFBbkI7O0FBQ0EsUUFBSW9DLFNBQVMsQ0FBQy9CLE1BQWQsRUFBc0I7QUFDbEIrQixNQUFBQSxTQUFTLENBQUMrRCxRQUFWLENBQW1CLE9BQW5CO0FBQ0g7QUFDSixHQXBiMEI7O0FBc2IzQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0l0RCxFQUFBQSxVQTNiMkIsc0JBMmJoQnZCLElBM2JnQixFQTJiVjtBQUNiLFFBQU1zRyxHQUFHLEdBQUdDLFFBQVEsQ0FBQ0MsYUFBVCxDQUF1QixLQUF2QixDQUFaO0FBQ0FGLElBQUFBLEdBQUcsQ0FBQ0csV0FBSixHQUFrQnpHLElBQWxCO0FBQ0EsV0FBT3NHLEdBQUcsQ0FBQ0ksU0FBWDtBQUNIO0FBL2IwQixDQUEvQixDLENBa2NBOztBQUNBLElBQUksT0FBT0MsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCcEksc0JBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgRm9ybSwgZ2xvYmFsVHJhbnNsYXRlLCBTZWN1cml0eVV0aWxzICovXG5cbi8qKlxuICogRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAtIFVuaXZlcnNhbCBkcm9wZG93biBidWlsZGVyIGZvciBNaWtvUEJYIFY1LjBcbiAqIFxuICogQnVpbGRzIGRyb3Bkb3duIEhUTUwgZHluYW1pY2FsbHkgYmFzZWQgb24gUkVTVCBBUEkgZGF0YS5cbiAqIFNlcGFyYXRlcyBjb25jZXJuczogUEhQIGZvcm1zIG9ubHkgcHJvdmlkZSBoaWRkZW4gaW5wdXRzLCBcbiAqIEphdmFTY3JpcHQgYnVpbGRzIFVJIGFuZCBwb3B1bGF0ZXMgd2l0aCBkYXRhLlxuICogXG4gKiBVc2FnZTpcbiAqIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICogICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0Rm9yU2VsZWN0JyxcbiAqICAgICBwbGFjZWhvbGRlcjogJ1NlbGVjdCBuZXR3b3JrIGZpbHRlcidcbiAqIH0pO1xuICovXG5jb25zdCBEeW5hbWljRHJvcGRvd25CdWlsZGVyID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGRyb3Bkb3duIGZvciBhIGZpZWxkIGJhc2VkIG9uIFJFU1QgQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSAoZS5nLiwgJ25ldHdvcmtmaWx0ZXJpZCcpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gRHJvcGRvd24gY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcgPSB7fSkge1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgSGlkZGVuIGlucHV0IG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGROYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBhbHJlYWR5IGV4aXN0cyAtIHVwZGF0ZSBpdCBpbnN0ZWFkIG9mIGNyZWF0aW5nIGR1cGxpY2F0ZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVFeGlzdGluZ0Ryb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWVzIGZyb20gZGF0YVxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBkYXRhW2ZpZWxkTmFtZV0gfHwgY29uZmlnLmRlZmF1bHRWYWx1ZSB8fCAnJztcbiAgICAgICAgY29uc3QgcmVwcmVzZW50RmllbGQgPSBgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgIFxuICAgICAgICAvLyBUcnkgbXVsdGlwbGUgcG9zc2libGUgcmVwcmVzZW50IGZpZWxkIG5hbWVzIGZvciBmbGV4aWJpbGl0eVxuICAgICAgICBsZXQgY3VycmVudFRleHQgPSBkYXRhW3JlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIC8vIFRyeSB3aXRob3V0ICdpZCcgc3VmZml4IChlLmcuLCBuZXR3b3JrZmlsdGVyX3JlcHJlc2VudCBpbnN0ZWFkIG9mIG5ldHdvcmtmaWx0ZXJpZF9yZXByZXNlbnQpXG4gICAgICAgICAgICBjb25zdCBiYXNlRmllbGROYW1lID0gZmllbGROYW1lLnJlcGxhY2UoL2lkJC8sICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQgPSBgJHtiYXNlRmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBkYXRhW2FsdGVybmF0aXZlUmVwcmVzZW50RmllbGRdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgdmFsdWUgYnV0IG5vIHJlcHJlc2VudCB0ZXh0LCB0cnkgdG8gZmluZCBpdCBpbiBzdGF0aWMgb3B0aW9ucyBmaXJzdFxuICAgICAgICBpZiAoY3VycmVudFZhbHVlICYmICFjdXJyZW50VGV4dCAmJiBjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2hpbmdPcHRpb24gPSBjb25maWcuc3RhdGljT3B0aW9ucy5maW5kKG9wdGlvbiA9PiBvcHRpb24udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICBpZiAobWF0Y2hpbmdPcHRpb24pIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGV4dCA9IG1hdGNoaW5nT3B0aW9uLnRleHQgfHwgbWF0Y2hpbmdPcHRpb24ubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgSFRNTCBpbiByZXByZXNlbnQgdGV4dCB1c2luZyBTZWN1cml0eVV0aWxzXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCAmJiB0eXBlb2YgY3VycmVudFRleHQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIGZvciBhbGwgX3JlcHJlc2VudCBmaWVsZHMgYXMgdGhleSBjYW4gY29udGFpbiBIVE1MIGVudGl0aWVzIGFuZCBpY29uc1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UncmUgdXNpbmcgcGxhY2Vob2xkZXIgdGV4dFxuICAgICAgICBjb25zdCBpc1VzaW5nUGxhY2Vob2xkZXIgPSAhY3VycmVudFRleHQ7XG5cbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gcGxhY2Vob2xkZXIgb3IgZGVmYXVsdFxuICAgICAgICBjdXJyZW50VGV4dCA9IGN1cnJlbnRUZXh0IHx8IGNvbmZpZy5wbGFjZWhvbGRlciB8fCAnU2VsZWN0IHZhbHVlJztcblxuICAgICAgICAvLyBCdWlsZCBDU1MgY2xhc3NlcyB3aXRoIHNhbml0aXphdGlvblxuICAgICAgICAvLyBBbGxvdyBjdXN0b20gYmFzZSBjbGFzc2VzIG9yIHVzZSBkZWZhdWx0IHdpdGggJ3NlbGVjdGlvbidcbiAgICAgICAgY29uc3QgZGVmYXVsdEJhc2VDbGFzc2VzID0gWyd1aScsICdzZWxlY3Rpb24nLCAnZHJvcGRvd24nXTtcbiAgICAgICAgY29uc3QgYmFzZUNsYXNzZXMgPSBjb25maWcuYmFzZUNsYXNzZXMgfHwgZGVmYXVsdEJhc2VDbGFzc2VzO1xuICAgICAgICBjb25zdCBhZGRpdGlvbmFsQ2xhc3NlcyA9IGNvbmZpZy5hZGRpdGlvbmFsQ2xhc3NlcyB8fCBbXTtcbiAgICAgICAgY29uc3QgYWxsQ2xhc3NlcyA9IFsuLi5iYXNlQ2xhc3NlcywgLi4uYWRkaXRpb25hbENsYXNzZXNdLmpvaW4oJyAnKTtcblxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biBIVE1MIC0gRklYRUQ6IENyZWF0ZSBlbGVtZW50cyB3aXRoIGpRdWVyeSB0byBwcm9wZXJseSBoYW5kbGUgSFRNTCBjb250ZW50XG4gICAgICAgIC8vIE9ubHkgc2hvdyBjdXJyZW50IHZhbHVlIGluIHRleHQgZGlzcGxheSwgbGV0IEFQSSBwb3B1bGF0ZSBtZW51IG9uIGNsaWNrXG4gICAgICAgIC8vIFVzZSAnZGVmYXVsdCcgY2xhc3Mgd2hlbiBzaG93aW5nIHBsYWNlaG9sZGVyLCBldmVuIGlmIHRoZXJlJ3MgYSB2YWx1ZVxuICAgICAgICBjb25zdCB0ZXh0Q2xhc3MgPSBpc1VzaW5nUGxhY2Vob2xkZXIgPyAndGV4dCBkZWZhdWx0JyA6ICd0ZXh0JztcbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIGZpZWxkTmFtZSBmb3IgdXNlIGluIElEIGF0dHJpYnV0ZVxuICAgICAgICBjb25zdCBzYWZlRmllbGROYW1lID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplQXR0cmlidXRlKGZpZWxkTmFtZSlcbiAgICAgICAgICAgIDogZmllbGROYW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIHN0cnVjdHVyZSB1c2luZyBqUXVlcnkgZm9yIHByb3BlciBIVE1MIGhhbmRsaW5nXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhhbGxDbGFzc2VzKVxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgYCR7c2FmZUZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICR0ZXh0RGl2ID0gJCgnPGRpdj4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKHRleHRDbGFzcylcbiAgICAgICAgICAgIC5odG1sKGN1cnJlbnRUZXh0KTsgLy8gY3VycmVudFRleHQgYWxyZWFkeSBzYW5pdGl6ZWQgYWJvdmVcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRkcm9wZG93bkljb24gPSAkKCc8aT4nKS5hZGRDbGFzcygnZHJvcGRvd24gaWNvbicpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCc8ZGl2PicpLmFkZENsYXNzKCdtZW51Jyk7XG5cbiAgICAgICAgLy8gUHJlLXBvcHVsYXRlIG1lbnUgd2l0aCBlbXB0eSBvcHRpb24gc28gaXQgaXMgdmlzaWJsZSBvbiBmaXJzdCBjbGlja1xuICAgICAgICAvLyAoc2VhcmNoIGRyb3Bkb3ducyB3aXRoIG1pbkNoYXJhY3RlcnM+MCB3b24ndCB0cmlnZ2VyIEFQSSB1bnRpbCB1c2VyIHR5cGVzKVxuICAgICAgICBpZiAoY29uZmlnLmVtcHR5T3B0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCBzYWZlVmFsdWUgPSB0aGlzLmVzY2FwZUh0bWwoY29uZmlnLmVtcHR5T3B0aW9uLmtleSB8fCAnJyk7XG4gICAgICAgICAgICAkbWVudS5odG1sKGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke3NhZmVWYWx1ZX1cIj4ke2NvbmZpZy5lbXB0eU9wdGlvbi52YWx1ZSB8fCAnJ308L2Rpdj5gKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXNzZW1ibGUgZHJvcGRvd25cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZCgkdGV4dERpdiwgJGRyb3Bkb3duSWNvbiwgJG1lbnUpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5zZXJ0IGRyb3Bkb3duIGFmdGVyIGhpZGRlbiBpbnB1dFxuICAgICAgICAkZHJvcGRvd24uaW5zZXJ0QWZ0ZXIoJGhpZGRlbklucHV0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB2YWx1ZSBpbiBoaWRkZW4gaW5wdXRcbiAgICAgICAgJGhpZGRlbklucHV0LnZhbChjdXJyZW50VmFsdWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZXhpc3RpbmcgZHJvcGRvd24gd2l0aCBuZXcgY29uZmlndXJhdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZvciB0aGUgZHJvcGRvd25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gTmV3IGNvbmZpZ3VyYXRpb24gdG8gYXBwbHlcbiAgICAgKi9cbiAgICB1cGRhdGVFeGlzdGluZ0Ryb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYENhbm5vdCB1cGRhdGU6IGRyb3Bkb3duIG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGROYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHZhbHVlIGlmIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGRhdGFbZmllbGROYW1lXSB8fCBjb25maWcuZGVmYXVsdFZhbHVlIHx8ICcnO1xuICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biB0ZXh0IGlmIHJlcHJlc2VudCBmaWVsZCBpcyBwcm92aWRlZFxuICAgICAgICBjb25zdCByZXByZXNlbnRGaWVsZCA9IGAke2ZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgbGV0IGN1cnJlbnRUZXh0ID0gZGF0YVtyZXByZXNlbnRGaWVsZF07XG4gICAgICAgIGlmICghY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VGaWVsZE5hbWUgPSBmaWVsZE5hbWUucmVwbGFjZSgvaWQkLywgJycpO1xuICAgICAgICAgICAgY29uc3QgYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZCA9IGAke2Jhc2VGaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IGRhdGFbYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIEhUTUwgaW4gcmVwcmVzZW50IHRleHQgdXNpbmcgU2VjdXJpdHlVdGlscyAoY29uc2lzdGVudCB3aXRoIGJ1aWxkRHJvcGRvd24pXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCAmJiB0eXBlb2YgY3VycmVudFRleHQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIGZvciBhbGwgX3JlcHJlc2VudCBmaWVsZHMgYXMgdGhleSBjYW4gY29udGFpbiBIVE1MIGVudGl0aWVzIGFuZCBpY29uc1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICBjb25zdCAkdGV4dEVsZW1lbnQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKTtcbiAgICAgICAgICAgICR0ZXh0RWxlbWVudC5odG1sKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgICAgICR0ZXh0RWxlbWVudC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyb3Bkb3duIHdpdGggbmV3IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHJvcGRvd24oZmllbGROYW1lLCBjb25maWcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93biB3aXRoIEFQSSBvciBzdGF0aWMgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3duKGZpZWxkTmFtZSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYERyb3Bkb3duIG5vdCBmb3VuZDogJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGFsbG93QWRkaXRpb25zOiBmYWxzZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgcHJlc2VydmVIVE1MOiB0cnVlLCAvLyBBbGxvdyBIVE1MIGluIGRyb3Bkb3duIHRleHQgKGZvciBpY29ucywgZmxhZ3MsIGV0Yy4pXG4gICAgICAgICAgICBjbGVhcmFibGU6IGZhbHNlLFxuXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQXV0b21hdGljIHN5bmNocm9uaXphdGlvbiB3aXRoIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IG9uIGhpZGRlbiBpbnB1dCBmb3IgZm9ybSB2YWxpZGF0aW9uL3Byb2Nlc3NpbmdcbiAgICAgICAgICAgICAgICAkaGlkZGVuSW5wdXQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTm90aWZ5IGZvcm0gb2YgY2hhbmdlc1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEN1c3RvbSBvbkNoYW5nZSBoYW5kbGVyIC0gb25seSBmb3IgZmllbGQtc3BlY2lmaWMgbG9naWNcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLm9uQ2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5vbkNoYW5nZSh2YWx1ZSwgdGV4dCwgJGNob2ljZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIEFQSSBzZXR0aW5ncyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoY29uZmlnLmFwaVVybCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgZHJvcGRvd24gaGFzIHNlYXJjaCBmdW5jdGlvbmFsaXR5IC0gZGV0ZWN0IGJ5IENTUyBjbGFzc2VzIHNpbmNlIHNlYXJjaCBpbnB1dCBpcyBhZGRlZCBieSBGb21hbnRpYyBVSSBsYXRlclxuICAgICAgICAgICAgY29uc3QgaGFzU2VhcmNoSW5wdXQgPSAkZHJvcGRvd24uaGFzQ2xhc3MoJ3NlYXJjaCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBsZXQgYXBpVXJsID0gY29uZmlnLmFwaVVybDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBhZGQgcXVlcnkgcGFyYW1ldGVyIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duc1xuICAgICAgICAgICAgaWYgKGhhc1NlYXJjaElucHV0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlVcmwuaW5kZXhPZignPycpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICc/cXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZXR0aW5ncy5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgICAgICB1cmw6IGFwaVVybCxcbiAgICAgICAgICAgICAgICBjYWNoZTogY29uZmlnLmNhY2hlICE9PSB1bmRlZmluZWQgPyBjb25maWcuY2FjaGUgOiB0cnVlLFxuICAgICAgICAgICAgICAgIHRocm90dGxlOiBoYXNTZWFyY2hJbnB1dCA/IDUwMCA6IDAsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGVGaXJzdFJlcXVlc3Q6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gY29uZmlnLm9uUmVzcG9uc2VcbiAgICAgICAgICAgICAgICAgICAgICAgID8gY29uZmlnLm9uUmVzcG9uc2UocmVzcG9uc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHRoaXMuZGVmYXVsdFJlc3BvbnNlSGFuZGxlcihyZXNwb25zZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUHJlcGVuZCBlbXB0eSBvcHRpb24gaWYgY29uZmlndXJlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmVtcHR5T3B0aW9uICYmIHJlc3VsdCAmJiByZXN1bHQucmVzdWx0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnJlc3VsdHMudW5zaGlmdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNvbmZpZy5lbXB0eU9wdGlvbi5rZXkgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogY29uZmlnLmVtcHR5T3B0aW9uLnZhbHVlIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvbmZpZy5lbXB0eU9wdGlvbi52YWx1ZSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihg4p2MIEFQSSByZXF1ZXN0IGZhaWxlZCBmb3IgJHtmaWVsZE5hbWV9ICgke2NvbmZpZy5hcGlVcmx9KTpgLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBBUEkgcGFyYW1ldGVycyBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlQYXJhbXMgJiYgdHlwZW9mIGNvbmZpZy5hcGlQYXJhbXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhjb25maWcuYXBpUGFyYW1zKTtcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ1BhcmFtcyA9IHBhcmFtcy50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1BhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXBpVXJsLmluZGV4T2YoJz8nKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBxdWVyeUluZGV4ID0gYXBpVXJsLmluZGV4T2YoJ3F1ZXJ5PXtxdWVyeX0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeUluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgPSBhcGlVcmwuc3Vic3RyaW5nKDAsIHF1ZXJ5SW5kZXgpICsgZXhpc3RpbmdQYXJhbXMgKyAnJnF1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJyYnICsgZXhpc3RpbmdQYXJhbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGFkZCBxdWVyeSBwYXJhbWV0ZXIgaWYgdGhlIGRyb3Bkb3duIGlzIHNlYXJjaGFibGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNTZWFyY2hJbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcyArICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzLnVybCA9IGFwaVVybDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gdGVtcGxhdGUgdG8gcHJvcGVybHkgcmVuZGVyIEhUTUwgY29udGVudFxuICAgICAgICAgICAgaWYgKCFjb25maWcudGVtcGxhdGVzKSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MudGVtcGxhdGVzID0ge1xuICAgICAgICAgICAgICAgICAgICBtZW51OiB0aGlzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLnRlbXBsYXRlcyA9IGNvbmZpZy50ZW1wbGF0ZXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZpeDogQ2xpY2tpbmcgdGhlIGRyb3Bkb3duIGljb24gb3BlbnMgdGhlIG1lbnUgd2l0aG91dCB0cmlnZ2VyaW5nIEFQSSBxdWVyeS5cbiAgICAgICAgICAgIC8vIEZvbWFudGljIFVJIG9ubHkgY2FsbHMgcXVlcnlSZW1vdGUoKSBpbiBzaG93KCkgd2hlbiBjYW4uc2hvdygpIGlzIGZhbHNlIChubyBpdGVtcykuXG4gICAgICAgICAgICAvLyBXaGVuIHNldFZhbHVlKCkgYWRkcyBhIHByZS1zZWxlY3RlZCBpdGVtLCBjYW4uc2hvdygpIHJldHVybnMgdHJ1ZSBhbmQgQVBJIGlzIHNraXBwZWQuXG4gICAgICAgICAgICAvLyBUaGlzIG9uU2hvdyBjYWxsYmFjayBkZXRlY3RzIGFuIHVuZGVyLXBvcHVsYXRlZCBtZW51IGFuZCB0cmlnZ2VycyBhIHNlYXJjaCB2aWFcbiAgICAgICAgICAgIC8vIHRoZSBpbnB1dCBldmVudCwgd2hpY2ggZ29lcyB0aHJvdWdoIG1vZHVsZS5zZWFyY2goKSAtPiBmaWx0ZXIoKSAtPiBxdWVyeVJlbW90ZSgpLlxuICAgICAgICAgICAgaWYgKGhhc1NlYXJjaElucHV0KSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3Mub25TaG93ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZHJwID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJwLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkbWVudS5maW5kKCcuaXRlbScpLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkc2VhcmNoSW5wdXQgPSAkZHJwLmZpbmQoJ2lucHV0LnNlYXJjaCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzZWFyY2hJbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2VhcmNoSW5wdXQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIEZvciBzdGF0aWMgb3B0aW9ucywgcG9wdWxhdGUgbWVudSBpbW1lZGlhdGVseVxuICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZVN0YXRpY09wdGlvbnMoJGRyb3Bkb3duLCBjb25maWcuc3RhdGljT3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIG5hdGl2ZSBGb21hbnRpYyBVSSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oc2V0dGluZ3MpO1xuXG4gICAgICAgIC8vIFNldCBzZWxlY3RlZCB2YWx1ZSBmb3Igc3RhdGljIG9wdGlvbnMgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgaWYgKGNvbmZpZy5zdGF0aWNPcHRpb25zKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkaGlkZGVuSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIGRyb3Bkb3duIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgQVBJIHJlc3BvbnNlIGhhbmRsZXIgZm9yIE1pa29QQlggZm9ybWF0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlXG4gICAgICogQHJldHVybnMge29iamVjdH0gRm9tYW50aWMgVUkgY29tcGF0aWJsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGRlZmF1bHRSZXNwb25zZUhhbmRsZXIocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKChyZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2Uuc3VjY2VzcykgJiYgcmVzcG9uc2UuZGF0YSAmJiBBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVzdWx0czogcmVzcG9uc2UuZGF0YS5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJhd1RleHQgPSBpdGVtLnJlcHJlc2VudCB8fCBpdGVtLm5hbWUgfHwgaXRlbS50ZXh0O1xuICAgICAgICAgICAgICAgICAgICAvLyBTYW5pdGl6ZSBkaXNwbGF5IHRleHQgd2hpbGUgcHJlc2VydmluZyBzYWZlIEhUTUwgKGljb25zKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHJhd1RleHQ7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogc2FmZVRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBzYWZlVGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBpdGVtLmRpc2FibGVkIHx8IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW11cbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBkcm9wZG93biBtZW51IHRlbXBsYXRlIGZvciBwcm9wZXIgSFRNTCByZW5kZXJpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmaWVsZHMgLSBGaWVsZCBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgZHJvcGRvd24gbWVudVxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuXG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG9wdGlvbltmaWVsZHMudmFsdWVdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9IG9wdGlvbltmaWVsZHMudGV4dF0gfHwgb3B0aW9uW2ZpZWxkcy5uYW1lXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSBvcHRpb24uZGlzYWJsZWQgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIFVzZSAnaW5hY3RpdmUnIGNsYXNzIGZvciB2aXN1YWwgc3R5bGluZyB3aXRob3V0IGJsb2NraW5nIHNlbGVjdGlvblxuICAgICAgICAgICAgY29uc3QgdmlzdWFsQ2xhc3MgPSBpc0Rpc2FibGVkID8gJyBpbmFjdGl2ZScgOiAnJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtJHt2aXN1YWxDbGFzc31cIiBkYXRhLXZhbHVlPVwiJHtEeW5hbWljRHJvcGRvd25CdWlsZGVyLmVzY2FwZUh0bWwodmFsdWUpfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9IHRleHQ7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGRyb3Bkb3duIHdpdGggc3RhdGljIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGRyb3Bkb3duIC0gRHJvcGRvd24gZWxlbWVudFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMgLSBTdGF0aWMgb3B0aW9ucyBhcnJheVxuICAgICAqL1xuICAgIHBvcHVsYXRlU3RhdGljT3B0aW9ucygkZHJvcGRvd24sIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgXG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBvcHRpb24udmFsdWU7XG4gICAgICAgICAgICBjb25zdCByYXdUZXh0ID0gb3B0aW9uLnRleHQgfHwgb3B0aW9uLm5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNhbml0aXplIHZhbHVlIGZvciBhdHRyaWJ1dGUgYW5kIHRleHQgZm9yIGRpc3BsYXlcbiAgICAgICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVBdHRyaWJ1dGUocmF3VmFsdWUpXG4gICAgICAgICAgICAgICAgOiB0aGlzLmVzY2FwZUh0bWwocmF3VmFsdWUpO1xuICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgOiByYXdUZXh0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7c2FmZVZhbHVlfVwiPiR7c2FmZVRleHR9PC9kaXY+YCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgbXVsdGlwbGUgZHJvcGRvd25zIGZyb20gY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWdzIC0gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZFxuICAgICAqL1xuICAgIGJ1aWxkTXVsdGlwbGVEcm9wZG93bnMoZGF0YSwgY29uZmlncykge1xuICAgICAgICBPYmplY3Qua2V5cyhjb25maWdzKS5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWdzW2ZpZWxkTmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCB2YWx1ZSBpbiBleGlzdGluZyBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICovXG4gICAgc2V0VmFsdWUoZmllbGROYW1lLCB2YWx1ZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEN1cnJlbnQgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRWYWx1ZShmaWVsZE5hbWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICByZXR1cm4gJGRyb3Bkb3duLmxlbmd0aCA/ICRkcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJykgOiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICovXG4gICAgY2xlYXIoZmllbGROYW1lKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGRpdi50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIHJldHVybiBkaXYuaW5uZXJIVE1MO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRHluYW1pY0Ryb3Bkb3duQnVpbGRlcjtcbn0iXX0=