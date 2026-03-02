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
    var $menu = $('<div>').addClass('menu'); // Pre-populate menu with empty option ONLY for search dropdowns
    // so it is visible before the user types (minCharacters>0 won't trigger API).
    // For non-search dropdowns, skip pre-population so the menu starts empty
    // and Fomantic UI calls queryRemote() on first open.

    if (config.emptyOption) {
      var willBeSearch = [].concat(_toConsumableArray(baseClasses), _toConsumableArray(additionalClasses)).includes('search');

      if (willBeSearch) {
        var safeValue = this.escapeHtml(config.emptyOption.key || '');
        $menu.html("<div class=\"item\" data-value=\"".concat(safeValue, "\">").concat(config.emptyOption.value || '', "</div>"));
      }
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
      allowAdditions: config.allowAdditions || false,
      fullTextSearch: true,
      forceSelection: false,
      preserveHTML: true,
      // Allow HTML in dropdown text (for icons, flags, etc.)
      clearable: config.clearable || false,
      filterRemoteData: true,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImlzVXNpbmdQbGFjZWhvbGRlciIsInBsYWNlaG9sZGVyIiwiZGVmYXVsdEJhc2VDbGFzc2VzIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiZW1wdHlPcHRpb24iLCJ3aWxsQmVTZWFyY2giLCJpbmNsdWRlcyIsInNhZmVWYWx1ZSIsImVzY2FwZUh0bWwiLCJrZXkiLCJhcHBlbmQiLCJpbnNlcnRBZnRlciIsInZhbCIsImluaXRpYWxpemVEcm9wZG93biIsIiR0ZXh0RWxlbWVudCIsInJlbW92ZUNsYXNzIiwic2V0dGluZ3MiLCJhbGxvd0FkZGl0aW9ucyIsImZ1bGxUZXh0U2VhcmNoIiwiZm9yY2VTZWxlY3Rpb24iLCJwcmVzZXJ2ZUhUTUwiLCJjbGVhcmFibGUiLCJmaWx0ZXJSZW1vdGVEYXRhIiwib25DaGFuZ2UiLCIkY2hvaWNlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFwaVVybCIsImhhc1NlYXJjaElucHV0IiwiaGFzQ2xhc3MiLCJpbmRleE9mIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJjYWNoZSIsInVuZGVmaW5lZCIsInRocm90dGxlIiwidGhyb3R0bGVGaXJzdFJlcXVlc3QiLCJvblJlc3BvbnNlIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkZWZhdWx0UmVzcG9uc2VIYW5kbGVyIiwicmVzdWx0cyIsInVuc2hpZnQiLCJ0eXBlIiwidHlwZUxvY2FsaXplZCIsIm9uRmFpbHVyZSIsImVycm9yIiwiYXBpUGFyYW1zIiwicGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiZXhpc3RpbmdQYXJhbXMiLCJ0b1N0cmluZyIsInF1ZXJ5SW5kZXgiLCJzdWJzdHJpbmciLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51Iiwib25TaG93IiwiJGRycCIsIiRzZWFyY2hJbnB1dCIsInBvcHVsYXRlU3RhdGljT3B0aW9ucyIsImRyb3Bkb3duIiwic2V0VGltZW91dCIsInN1Y2Nlc3MiLCJBcnJheSIsImlzQXJyYXkiLCJtYXAiLCJpdGVtIiwicmF3VGV4dCIsInJlcHJlc2VudCIsInNhZmVUZXh0IiwiZGlzYWJsZWQiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJmb3JFYWNoIiwiaXNEaXNhYmxlZCIsInZpc3VhbENsYXNzIiwib3B0aW9ucyIsInJhd1ZhbHVlIiwiYnVpbGRNdWx0aXBsZURyb3Bkb3ducyIsImNvbmZpZ3MiLCJPYmplY3QiLCJrZXlzIiwic2V0VmFsdWUiLCJnZXRWYWx1ZSIsImNsZWFyIiwiZGl2IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwidGV4dENvbnRlbnQiLCJpbm5lckhUTUwiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBp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ZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCAkLCBGb3JtLCBnbG9iYWxUcmFuc2xhdGUsIFNlY3VyaXR5VXRpbHMgKi9cblxuLyoqXG4gKiBEeW5hbWljRHJvcGRvd25CdWlsZGVyIC0gVW5pdmVyc2FsIGRyb3Bkb3duIGJ1aWxkZXIgZm9yIE1pa29QQlggVjUuMFxuICogXG4gKiBCdWlsZHMgZHJvcGRvd24gSFRNTCBkeW5hbWljYWxseSBiYXNlZCBvbiBSRVNUIEFQSSBkYXRhLlxuICogU2VwYXJhdGVzIGNvbmNlcm5zOiBQSFAgZm9ybXMgb25seSBwcm92aWRlIGhpZGRlbiBpbnB1dHMsIFxuICogSmF2YVNjcmlwdCBidWlsZHMgVUkgYW5kIHBvcHVsYXRlcyB3aXRoIGRhdGEuXG4gKiBcbiAqIFVzYWdlOlxuICogRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gKiAgICAgYXBpVXJsOiAnL3BieGNvcmUvYXBpL3YyL25ldHdvcmstZmlsdGVycy9nZXRGb3JTZWxlY3QnLFxuICogICAgIHBsYWNlaG9sZGVyOiAnU2VsZWN0IG5ldHdvcmsgZmlsdGVyJ1xuICogfSk7XG4gKi9cbmNvbnN0IER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgZHJvcGRvd24gZm9yIGEgZmllbGQgYmFzZWQgb24gUkVTVCBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lIChlLmcuLCAnbmV0d29ya2ZpbHRlcmlkJylcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBEcm9wZG93biBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgYnVpbGREcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZyA9IHt9KSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBIaWRkZW4gaW5wdXQgbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGFscmVhZHkgZXhpc3RzIC0gdXBkYXRlIGl0IGluc3RlYWQgb2YgY3JlYXRpbmcgZHVwbGljYXRlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ0Ryb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGV4aXN0aW5nRHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUV4aXN0aW5nRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgY3VycmVudCB2YWx1ZXMgZnJvbSBkYXRhXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGRhdGFbZmllbGROYW1lXSB8fCBjb25maWcuZGVmYXVsdFZhbHVlIHx8ICcnO1xuICAgICAgICBjb25zdCByZXByZXNlbnRGaWVsZCA9IGAke2ZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyeSBtdWx0aXBsZSBwb3NzaWJsZSByZXByZXNlbnQgZmllbGQgbmFtZXMgZm9yIGZsZXhpYmlsaXR5XG4gICAgICAgIGxldCBjdXJyZW50VGV4dCA9IGRhdGFbcmVwcmVzZW50RmllbGRdO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgLy8gVHJ5IHdpdGhvdXQgJ2lkJyBzdWZmaXggKGUuZy4sIG5ldHdvcmtmaWx0ZXJfcmVwcmVzZW50IGluc3RlYWQgb2YgbmV0d29ya2ZpbHRlcmlkX3JlcHJlc2VudClcbiAgICAgICAgICAgIGNvbnN0IGJhc2VGaWVsZE5hbWUgPSBmaWVsZE5hbWUucmVwbGFjZSgvaWQkLywgJycpO1xuICAgICAgICAgICAgY29uc3QgYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZCA9IGAke2Jhc2VGaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IGRhdGFbYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElmIHdlIGhhdmUgYSB2YWx1ZSBidXQgbm8gcmVwcmVzZW50IHRleHQsIHRyeSB0byBmaW5kIGl0IGluIHN0YXRpYyBvcHRpb25zIGZpcnN0XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUgJiYgIWN1cnJlbnRUZXh0ICYmIGNvbmZpZy5zdGF0aWNPcHRpb25zKSB7XG4gICAgICAgICAgICBjb25zdCBtYXRjaGluZ09wdGlvbiA9IGNvbmZpZy5zdGF0aWNPcHRpb25zLmZpbmQob3B0aW9uID0+IG9wdGlvbi52YWx1ZSA9PT0gY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgIGlmIChtYXRjaGluZ09wdGlvbikge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gbWF0Y2hpbmdPcHRpb24udGV4dCB8fCBtYXRjaGluZ09wdGlvbi5uYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTYW5pdGl6ZSBIVE1MIGluIHJlcHJlc2VudCB0ZXh0IHVzaW5nIFNlY3VyaXR5VXRpbHNcbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0ICYmIHR5cGVvZiBjdXJyZW50VGV4dCA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMgZm9yIGFsbCBfcmVwcmVzZW50IGZpZWxkcyBhcyB0aGV5IGNhbiBjb250YWluIEhUTUwgZW50aXRpZXMgYW5kIGljb25zXG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoY3VycmVudFRleHQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB3ZSdyZSB1c2luZyBwbGFjZWhvbGRlciB0ZXh0XG4gICAgICAgIGNvbnN0IGlzVXNpbmdQbGFjZWhvbGRlciA9ICFjdXJyZW50VGV4dDtcblxuICAgICAgICAvLyBGYWxsYmFjayB0byBwbGFjZWhvbGRlciBvciBkZWZhdWx0XG4gICAgICAgIGN1cnJlbnRUZXh0ID0gY3VycmVudFRleHQgfHwgY29uZmlnLnBsYWNlaG9sZGVyIHx8ICdTZWxlY3QgdmFsdWUnO1xuXG4gICAgICAgIC8vIEJ1aWxkIENTUyBjbGFzc2VzIHdpdGggc2FuaXRpemF0aW9uXG4gICAgICAgIC8vIEFsbG93IGN1c3RvbSBiYXNlIGNsYXNzZXMgb3IgdXNlIGRlZmF1bHQgd2l0aCAnc2VsZWN0aW9uJ1xuICAgICAgICBjb25zdCBkZWZhdWx0QmFzZUNsYXNzZXMgPSBbJ3VpJywgJ3NlbGVjdGlvbicsICdkcm9wZG93biddO1xuICAgICAgICBjb25zdCBiYXNlQ2xhc3NlcyA9IGNvbmZpZy5iYXNlQ2xhc3NlcyB8fCBkZWZhdWx0QmFzZUNsYXNzZXM7XG4gICAgICAgIGNvbnN0IGFkZGl0aW9uYWxDbGFzc2VzID0gY29uZmlnLmFkZGl0aW9uYWxDbGFzc2VzIHx8IFtdO1xuICAgICAgICBjb25zdCBhbGxDbGFzc2VzID0gWy4uLmJhc2VDbGFzc2VzLCAuLi5hZGRpdGlvbmFsQ2xhc3Nlc10uam9pbignICcpO1xuXG4gICAgICAgIC8vIEJ1aWxkIGRyb3Bkb3duIEhUTUwgLSBGSVhFRDogQ3JlYXRlIGVsZW1lbnRzIHdpdGggalF1ZXJ5IHRvIHByb3Blcmx5IGhhbmRsZSBIVE1MIGNvbnRlbnRcbiAgICAgICAgLy8gT25seSBzaG93IGN1cnJlbnQgdmFsdWUgaW4gdGV4dCBkaXNwbGF5LCBsZXQgQVBJIHBvcHVsYXRlIG1lbnUgb24gY2xpY2tcbiAgICAgICAgLy8gVXNlICdkZWZhdWx0JyBjbGFzcyB3aGVuIHNob3dpbmcgcGxhY2Vob2xkZXIsIGV2ZW4gaWYgdGhlcmUncyBhIHZhbHVlXG4gICAgICAgIGNvbnN0IHRleHRDbGFzcyA9IGlzVXNpbmdQbGFjZWhvbGRlciA/ICd0ZXh0IGRlZmF1bHQnIDogJ3RleHQnO1xuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgZmllbGROYW1lIGZvciB1c2UgaW4gSUQgYXR0cmlidXRlXG4gICAgICAgIGNvbnN0IHNhZmVGaWVsZE5hbWUgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVBdHRyaWJ1dGUoZmllbGROYW1lKVxuICAgICAgICAgICAgOiBmaWVsZE5hbWU7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gc3RydWN0dXJlIHVzaW5nIGpRdWVyeSBmb3IgcHJvcGVyIEhUTUwgaGFuZGxpbmdcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnPGRpdj4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKGFsbENsYXNzZXMpXG4gICAgICAgICAgICAuYXR0cignaWQnLCBgJHtzYWZlRmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJHRleHREaXYgPSAkKCc8ZGl2PicpXG4gICAgICAgICAgICAuYWRkQ2xhc3ModGV4dENsYXNzKVxuICAgICAgICAgICAgLmh0bWwoY3VycmVudFRleHQpOyAvLyBjdXJyZW50VGV4dCBhbHJlYWR5IHNhbml0aXplZCBhYm92ZVxuICAgICAgICBcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duSWNvbiA9ICQoJzxpPicpLmFkZENsYXNzKCdkcm9wZG93biBpY29uJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkbWVudSA9ICQoJzxkaXY+JykuYWRkQ2xhc3MoJ21lbnUnKTtcblxuICAgICAgICAvLyBQcmUtcG9wdWxhdGUgbWVudSB3aXRoIGVtcHR5IG9wdGlvbiBPTkxZIGZvciBzZWFyY2ggZHJvcGRvd25zXG4gICAgICAgIC8vIHNvIGl0IGlzIHZpc2libGUgYmVmb3JlIHRoZSB1c2VyIHR5cGVzIChtaW5DaGFyYWN0ZXJzPjAgd29uJ3QgdHJpZ2dlciBBUEkpLlxuICAgICAgICAvLyBGb3Igbm9uLXNlYXJjaCBkcm9wZG93bnMsIHNraXAgcHJlLXBvcHVsYXRpb24gc28gdGhlIG1lbnUgc3RhcnRzIGVtcHR5XG4gICAgICAgIC8vIGFuZCBGb21hbnRpYyBVSSBjYWxscyBxdWVyeVJlbW90ZSgpIG9uIGZpcnN0IG9wZW4uXG4gICAgICAgIGlmIChjb25maWcuZW1wdHlPcHRpb24pIHtcbiAgICAgICAgICAgIGNvbnN0IHdpbGxCZVNlYXJjaCA9IFsuLi5iYXNlQ2xhc3NlcywgLi4uYWRkaXRpb25hbENsYXNzZXNdLmluY2x1ZGVzKCdzZWFyY2gnKTtcbiAgICAgICAgICAgIGlmICh3aWxsQmVTZWFyY2gpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzYWZlVmFsdWUgPSB0aGlzLmVzY2FwZUh0bWwoY29uZmlnLmVtcHR5T3B0aW9uLmtleSB8fCAnJyk7XG4gICAgICAgICAgICAgICAgJG1lbnUuaHRtbChgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtzYWZlVmFsdWV9XCI+JHtjb25maWcuZW1wdHlPcHRpb24udmFsdWUgfHwgJyd9PC9kaXY+YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFzc2VtYmxlIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5hcHBlbmQoJHRleHREaXYsICRkcm9wZG93bkljb24sICRtZW51KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluc2VydCBkcm9wZG93biBhZnRlciBoaWRkZW4gaW5wdXRcbiAgICAgICAgJGRyb3Bkb3duLmluc2VydEFmdGVyKCRoaWRkZW5JbnB1dCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdmFsdWUgaW4gaGlkZGVuIGlucHV0XG4gICAgICAgICRoaWRkZW5JbnB1dC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHJvcGRvd24oZmllbGROYW1lLCBjb25maWcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGV4aXN0aW5nIGRyb3Bkb3duIHdpdGggbmV3IGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIE5ldyBjb25maWd1cmF0aW9uIHRvIGFwcGx5XG4gICAgICovXG4gICAgdXBkYXRlRXhpc3RpbmdEcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZykge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBDYW5ub3QgdXBkYXRlOiBkcm9wZG93biBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCB2YWx1ZSBpZiBwcm92aWRlZFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBkYXRhW2ZpZWxkTmFtZV0gfHwgY29uZmlnLmRlZmF1bHRWYWx1ZSB8fCAnJztcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbChjdXJyZW50VmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gdGV4dCBpZiByZXByZXNlbnQgZmllbGQgaXMgcHJvdmlkZWRcbiAgICAgICAgY29uc3QgcmVwcmVzZW50RmllbGQgPSBgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgIGxldCBjdXJyZW50VGV4dCA9IGRhdGFbcmVwcmVzZW50RmllbGRdO1xuICAgICAgICBpZiAoIWN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICBjb25zdCBiYXNlRmllbGROYW1lID0gZmllbGROYW1lLnJlcGxhY2UoL2lkJC8sICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQgPSBgJHtiYXNlRmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBkYXRhW2FsdGVybmF0aXZlUmVwcmVzZW50RmllbGRdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTYW5pdGl6ZSBIVE1MIGluIHJlcHJlc2VudCB0ZXh0IHVzaW5nIFNlY3VyaXR5VXRpbHMgKGNvbnNpc3RlbnQgd2l0aCBidWlsZERyb3Bkb3duKVxuICAgICAgICBpZiAoY3VycmVudFRleHQgJiYgdHlwZW9mIGN1cnJlbnRUZXh0ID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIFVzZSBzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyBmb3IgYWxsIF9yZXByZXNlbnQgZmllbGRzIGFzIHRoZXkgY2FuIGNvbnRhaW4gSFRNTCBlbnRpdGllcyBhbmQgaWNvbnNcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhjdXJyZW50VGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgY29uc3QgJHRleHRFbGVtZW50ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Jyk7XG4gICAgICAgICAgICAkdGV4dEVsZW1lbnQuaHRtbChjdXJyZW50VGV4dCk7XG4gICAgICAgICAgICAkdGV4dEVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkcm9wZG93biB3aXRoIG5ldyBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURyb3Bkb3duKGZpZWxkTmFtZSwgY29uZmlnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBBUEkgb3Igc3RhdGljIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZykge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgXG4gICAgICAgIGlmICghJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBEcm9wZG93biBub3QgZm91bmQ6ICR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBhbGxvd0FkZGl0aW9uczogY29uZmlnLmFsbG93QWRkaXRpb25zIHx8IGZhbHNlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBwcmVzZXJ2ZUhUTUw6IHRydWUsIC8vIEFsbG93IEhUTUwgaW4gZHJvcGRvd24gdGV4dCAoZm9yIGljb25zLCBmbGFncywgZXRjLilcbiAgICAgICAgICAgIGNsZWFyYWJsZTogY29uZmlnLmNsZWFyYWJsZSB8fCBmYWxzZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQsICRjaG9pY2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBBdXRvbWF0aWMgc3luY2hyb25pemF0aW9uIHdpdGggaGlkZGVuIGlucHV0XG4gICAgICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgb24gaGlkZGVuIGlucHV0IGZvciBmb3JtIHZhbGlkYXRpb24vcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBOb3RpZnkgZm9ybSBvZiBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3VzdG9tIG9uQ2hhbmdlIGhhbmRsZXIgLSBvbmx5IGZvciBmaWVsZC1zcGVjaWZpYyBsb2dpY1xuICAgICAgICAgICAgICAgIGlmIChjb25maWcub25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLm9uQ2hhbmdlKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQVBJIHNldHRpbmdzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChjb25maWcuYXBpVXJsKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBoYXMgc2VhcmNoIGZ1bmN0aW9uYWxpdHkgLSBkZXRlY3QgYnkgQ1NTIGNsYXNzZXMgc2luY2Ugc2VhcmNoIGlucHV0IGlzIGFkZGVkIGJ5IEZvbWFudGljIFVJIGxhdGVyXG4gICAgICAgICAgICBjb25zdCBoYXNTZWFyY2hJbnB1dCA9ICRkcm9wZG93bi5oYXNDbGFzcygnc2VhcmNoJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxldCBhcGlVcmwgPSBjb25maWcuYXBpVXJsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IGFkZCBxdWVyeSBwYXJhbWV0ZXIgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25zXG4gICAgICAgICAgICBpZiAoaGFzU2VhcmNoSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmFwaVVybC5pbmRleE9mKCc/JykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJyZxdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJz9xdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgICAgIHVybDogYXBpVXJsLFxuICAgICAgICAgICAgICAgIGNhY2hlOiBjb25maWcuY2FjaGUgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5jYWNoZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGU6IGhhc1NlYXJjaElucHV0ID8gNTAwIDogMCxcbiAgICAgICAgICAgICAgICB0aHJvdHRsZUZpcnN0UmVxdWVzdDogZmFsc2UsXG5cbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gY29uZmlnLm9uUmVzcG9uc2VcbiAgICAgICAgICAgICAgICAgICAgICAgID8gY29uZmlnLm9uUmVzcG9uc2UocmVzcG9uc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHRoaXMuZGVmYXVsdFJlc3BvbnNlSGFuZGxlcihyZXNwb25zZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUHJlcGVuZCBlbXB0eSBvcHRpb24gaWYgY29uZmlndXJlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmVtcHR5T3B0aW9uICYmIHJlc3VsdCAmJiByZXN1bHQucmVzdWx0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnJlc3VsdHMudW5zaGlmdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNvbmZpZy5lbXB0eU9wdGlvbi5rZXkgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogY29uZmlnLmVtcHR5T3B0aW9uLnZhbHVlIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvbmZpZy5lbXB0eU9wdGlvbi52YWx1ZSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihg4p2MIEFQSSByZXF1ZXN0IGZhaWxlZCBmb3IgJHtmaWVsZE5hbWV9ICgke2NvbmZpZy5hcGlVcmx9KTpgLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBBUEkgcGFyYW1ldGVycyBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlQYXJhbXMgJiYgdHlwZW9mIGNvbmZpZy5hcGlQYXJhbXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhjb25maWcuYXBpUGFyYW1zKTtcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ1BhcmFtcyA9IHBhcmFtcy50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1BhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXBpVXJsLmluZGV4T2YoJz8nKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBxdWVyeUluZGV4ID0gYXBpVXJsLmluZGV4T2YoJ3F1ZXJ5PXtxdWVyeX0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeUluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgPSBhcGlVcmwuc3Vic3RyaW5nKDAsIHF1ZXJ5SW5kZXgpICsgZXhpc3RpbmdQYXJhbXMgKyAnJnF1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJyYnICsgZXhpc3RpbmdQYXJhbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGFkZCBxdWVyeSBwYXJhbWV0ZXIgaWYgdGhlIGRyb3Bkb3duIGlzIHNlYXJjaGFibGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNTZWFyY2hJbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcyArICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzLnVybCA9IGFwaVVybDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gdGVtcGxhdGUgdG8gcHJvcGVybHkgcmVuZGVyIEhUTUwgY29udGVudFxuICAgICAgICAgICAgaWYgKCFjb25maWcudGVtcGxhdGVzKSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MudGVtcGxhdGVzID0ge1xuICAgICAgICAgICAgICAgICAgICBtZW51OiB0aGlzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLnRlbXBsYXRlcyA9IGNvbmZpZy50ZW1wbGF0ZXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZpeDogQ2xpY2tpbmcgdGhlIGRyb3Bkb3duIGljb24gb3BlbnMgdGhlIG1lbnUgd2l0aG91dCB0cmlnZ2VyaW5nIEFQSSBxdWVyeS5cbiAgICAgICAgICAgIC8vIEZvbWFudGljIFVJIG9ubHkgY2FsbHMgcXVlcnlSZW1vdGUoKSBpbiBzaG93KCkgd2hlbiBjYW4uc2hvdygpIGlzIGZhbHNlIChubyBpdGVtcykuXG4gICAgICAgICAgICAvLyBXaGVuIHNldFZhbHVlKCkgYWRkcyBhIHByZS1zZWxlY3RlZCBpdGVtLCBjYW4uc2hvdygpIHJldHVybnMgdHJ1ZSBhbmQgQVBJIGlzIHNraXBwZWQuXG4gICAgICAgICAgICAvLyBUaGlzIG9uU2hvdyBjYWxsYmFjayBkZXRlY3RzIGFuIHVuZGVyLXBvcHVsYXRlZCBtZW51IGFuZCB0cmlnZ2VycyBhIHNlYXJjaCB2aWFcbiAgICAgICAgICAgIC8vIHRoZSBpbnB1dCBldmVudCwgd2hpY2ggZ29lcyB0aHJvdWdoIG1vZHVsZS5zZWFyY2goKSAtPiBmaWx0ZXIoKSAtPiBxdWVyeVJlbW90ZSgpLlxuICAgICAgICAgICAgaWYgKGhhc1NlYXJjaElucHV0KSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3Mub25TaG93ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZHJwID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJwLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkbWVudS5maW5kKCcuaXRlbScpLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkc2VhcmNoSW5wdXQgPSAkZHJwLmZpbmQoJ2lucHV0LnNlYXJjaCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzZWFyY2hJbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2VhcmNoSW5wdXQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIC8vIEZvciBzdGF0aWMgb3B0aW9ucywgcG9wdWxhdGUgbWVudSBpbW1lZGlhdGVseVxuICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZVN0YXRpY09wdGlvbnMoJGRyb3Bkb3duLCBjb25maWcuc3RhdGljT3B0aW9ucyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIG5hdGl2ZSBGb21hbnRpYyBVSSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oc2V0dGluZ3MpO1xuXG4gICAgICAgIC8vIFNldCBzZWxlY3RlZCB2YWx1ZSBmb3Igc3RhdGljIG9wdGlvbnMgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgaWYgKGNvbmZpZy5zdGF0aWNPcHRpb25zKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkaGlkZGVuSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIGRyb3Bkb3duIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgQVBJIHJlc3BvbnNlIGhhbmRsZXIgZm9yIE1pa29QQlggZm9ybWF0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlXG4gICAgICogQHJldHVybnMge29iamVjdH0gRm9tYW50aWMgVUkgY29tcGF0aWJsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGRlZmF1bHRSZXNwb25zZUhhbmRsZXIocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKChyZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2Uuc3VjY2VzcykgJiYgcmVzcG9uc2UuZGF0YSAmJiBBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVzdWx0czogcmVzcG9uc2UuZGF0YS5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJhd1RleHQgPSBpdGVtLnJlcHJlc2VudCB8fCBpdGVtLm5hbWUgfHwgaXRlbS50ZXh0O1xuICAgICAgICAgICAgICAgICAgICAvLyBTYW5pdGl6ZSBkaXNwbGF5IHRleHQgd2hpbGUgcHJlc2VydmluZyBzYWZlIEhUTUwgKGljb25zKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHJhd1RleHQ7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogc2FmZVRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBzYWZlVGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBpdGVtLmRpc2FibGVkIHx8IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW11cbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBkcm9wZG93biBtZW51IHRlbXBsYXRlIGZvciBwcm9wZXIgSFRNTCByZW5kZXJpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmaWVsZHMgLSBGaWVsZCBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgZHJvcGRvd24gbWVudVxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuXG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG9wdGlvbltmaWVsZHMudmFsdWVdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9IG9wdGlvbltmaWVsZHMudGV4dF0gfHwgb3B0aW9uW2ZpZWxkcy5uYW1lXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSBvcHRpb24uZGlzYWJsZWQgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIFVzZSAnaW5hY3RpdmUnIGNsYXNzIGZvciB2aXN1YWwgc3R5bGluZyB3aXRob3V0IGJsb2NraW5nIHNlbGVjdGlvblxuICAgICAgICAgICAgY29uc3QgdmlzdWFsQ2xhc3MgPSBpc0Rpc2FibGVkID8gJyBpbmFjdGl2ZScgOiAnJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtJHt2aXN1YWxDbGFzc31cIiBkYXRhLXZhbHVlPVwiJHtEeW5hbWljRHJvcGRvd25CdWlsZGVyLmVzY2FwZUh0bWwodmFsdWUpfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9IHRleHQ7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGRyb3Bkb3duIHdpdGggc3RhdGljIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGRyb3Bkb3duIC0gRHJvcGRvd24gZWxlbWVudFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMgLSBTdGF0aWMgb3B0aW9ucyBhcnJheVxuICAgICAqL1xuICAgIHBvcHVsYXRlU3RhdGljT3B0aW9ucygkZHJvcGRvd24sIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgXG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBvcHRpb24udmFsdWU7XG4gICAgICAgICAgICBjb25zdCByYXdUZXh0ID0gb3B0aW9uLnRleHQgfHwgb3B0aW9uLm5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNhbml0aXplIHZhbHVlIGZvciBhdHRyaWJ1dGUgYW5kIHRleHQgZm9yIGRpc3BsYXlcbiAgICAgICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVBdHRyaWJ1dGUocmF3VmFsdWUpXG4gICAgICAgICAgICAgICAgOiB0aGlzLmVzY2FwZUh0bWwocmF3VmFsdWUpO1xuICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgOiByYXdUZXh0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7c2FmZVZhbHVlfVwiPiR7c2FmZVRleHR9PC9kaXY+YCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgbXVsdGlwbGUgZHJvcGRvd25zIGZyb20gY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWdzIC0gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZFxuICAgICAqL1xuICAgIGJ1aWxkTXVsdGlwbGVEcm9wZG93bnMoZGF0YSwgY29uZmlncykge1xuICAgICAgICBPYmplY3Qua2V5cyhjb25maWdzKS5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWdzW2ZpZWxkTmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCB2YWx1ZSBpbiBleGlzdGluZyBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICovXG4gICAgc2V0VmFsdWUoZmllbGROYW1lLCB2YWx1ZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEN1cnJlbnQgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRWYWx1ZShmaWVsZE5hbWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICByZXR1cm4gJGRyb3Bkb3duLmxlbmd0aCA/ICRkcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJykgOiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICovXG4gICAgY2xlYXIoZmllbGROYW1lKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGV4dCB0byBlc2NhcGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBFc2NhcGVkIHRleHRcbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHRleHQpIHtcbiAgICAgICAgY29uc3QgZGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGRpdi50ZXh0Q29udGVudCA9IHRleHQ7XG4gICAgICAgIHJldHVybiBkaXYuaW5uZXJIVE1MO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gRHluYW1pY0Ryb3Bkb3duQnVpbGRlcjtcbn0iXX0=