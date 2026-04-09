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
      forceSelection: config.forceSelection !== undefined ? config.forceSelection : !!config.allowAdditions,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImlzVXNpbmdQbGFjZWhvbGRlciIsInBsYWNlaG9sZGVyIiwiZGVmYXVsdEJhc2VDbGFzc2VzIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiZW1wdHlPcHRpb24iLCJ3aWxsQmVTZWFyY2giLCJpbmNsdWRlcyIsInNhZmVWYWx1ZSIsImVzY2FwZUh0bWwiLCJrZXkiLCJhcHBlbmQiLCJpbnNlcnRBZnRlciIsInZhbCIsImluaXRpYWxpemVEcm9wZG93biIsIiR0ZXh0RWxlbWVudCIsInJlbW92ZUNsYXNzIiwic2V0dGluZ3MiLCJhbGxvd0FkZGl0aW9ucyIsImZ1bGxUZXh0U2VhcmNoIiwiZm9yY2VTZWxlY3Rpb24iLCJ1bmRlZmluZWQiLCJwcmVzZXJ2ZUhUTUwiLCJjbGVhcmFibGUiLCJmaWx0ZXJSZW1vdGVEYXRhIiwib25DaGFuZ2UiLCIkY2hvaWNlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFwaVVybCIsImhhc1NlYXJjaElucHV0IiwiaGFzQ2xhc3MiLCJpbmRleE9mIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJjYWNoZSIsInRocm90dGxlIiwidGhyb3R0bGVGaXJzdFJlcXVlc3QiLCJvblJlc3BvbnNlIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkZWZhdWx0UmVzcG9uc2VIYW5kbGVyIiwicmVzdWx0cyIsInVuc2hpZnQiLCJ0eXBlIiwidHlwZUxvY2FsaXplZCIsIm9uRmFpbHVyZSIsImVycm9yIiwiYXBpUGFyYW1zIiwicGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiZXhpc3RpbmdQYXJhbXMiLCJ0b1N0cmluZyIsInF1ZXJ5SW5kZXgiLCJzdWJzdHJpbmciLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51Iiwib25TaG93IiwiJGRycCIsIiRzZWFyY2hJbnB1dCIsInBvcHVsYXRlU3RhdGljT3B0aW9ucyIsImRyb3Bkb3duIiwic2V0VGltZW91dCIsInN1Y2Nlc3MiLCJBcnJheSIsImlzQXJyYXkiLCJtYXAiLCJpdGVtIiwicmF3VGV4dCIsInJlcHJlc2VudCIsInNhZmVUZXh0IiwiZGlzYWJsZWQiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJmb3JFYWNoIiwiaXNEaXNhYmxlZCIsInZpc3VhbENsYXNzIiwib3B0aW9ucyIsInJhd1ZhbHVlIiwiYnVpbGRNdWx0aXBsZURyb3Bkb3ducyIsImNvbmZpZ3MiLCJPYmplY3QiLCJrZXlzIiwic2V0VmFsdWUiLCJnZXRWYWx1ZSIsImNsZWFyIiwiZGl2IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwidGV4dENvbnRlbnQiLCJpbm5lckhUTUwiLCJtb2R1bGUiLCJleHBvcnRzIl0sIm1hcHBp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cUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQnRJLHNCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIEZvcm0sIGdsb2JhbFRyYW5zbGF0ZSwgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgLSBVbml2ZXJzYWwgZHJvcGRvd24gYnVpbGRlciBmb3IgTWlrb1BCWCBWNS4wXG4gKiBcbiAqIEJ1aWxkcyBkcm9wZG93biBIVE1MIGR5bmFtaWNhbGx5IGJhc2VkIG9uIFJFU1QgQVBJIGRhdGEuXG4gKiBTZXBhcmF0ZXMgY29uY2VybnM6IFBIUCBmb3JtcyBvbmx5IHByb3ZpZGUgaGlkZGVuIGlucHV0cywgXG4gKiBKYXZhU2NyaXB0IGJ1aWxkcyBVSSBhbmQgcG9wdWxhdGVzIHdpdGggZGF0YS5cbiAqIFxuICogVXNhZ2U6XG4gKiBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAqICAgICBhcGlVcmw6ICcvcGJ4Y29yZS9hcGkvdjIvbmV0d29yay1maWx0ZXJzL2dldEZvclNlbGVjdCcsXG4gKiAgICAgcGxhY2Vob2xkZXI6ICdTZWxlY3QgbmV0d29yayBmaWx0ZXInXG4gKiB9KTtcbiAqL1xuY29uc3QgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciA9IHtcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBkcm9wZG93biBmb3IgYSBmaWVsZCBiYXNlZCBvbiBSRVNUIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWUgKGUuZy4sICduZXR3b3JrZmlsdGVyaWQnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIERyb3Bkb3duIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBidWlsZERyb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnID0ge30pIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEhpZGRlbiBpbnB1dCBub3QgZm91bmQgZm9yIGZpZWxkOiAke2ZpZWxkTmFtZX1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgZHJvcGRvd24gYWxyZWFkeSBleGlzdHMgLSB1cGRhdGUgaXQgaW5zdGVhZCBvZiBjcmVhdGluZyBkdXBsaWNhdGVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nRHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdEcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlRXhpc3RpbmdEcm9wZG93bihmaWVsZE5hbWUsIGRhdGEsIGNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlcyBmcm9tIGRhdGFcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gZGF0YVtmaWVsZE5hbWVdIHx8IGNvbmZpZy5kZWZhdWx0VmFsdWUgfHwgJyc7XG4gICAgICAgIGNvbnN0IHJlcHJlc2VudEZpZWxkID0gYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IG11bHRpcGxlIHBvc3NpYmxlIHJlcHJlc2VudCBmaWVsZCBuYW1lcyBmb3IgZmxleGliaWxpdHlcbiAgICAgICAgbGV0IGN1cnJlbnRUZXh0ID0gZGF0YVtyZXByZXNlbnRGaWVsZF07XG4gICAgICAgIFxuICAgICAgICBpZiAoIWN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICAvLyBUcnkgd2l0aG91dCAnaWQnIHN1ZmZpeCAoZS5nLiwgbmV0d29ya2ZpbHRlcl9yZXByZXNlbnQgaW5zdGVhZCBvZiBuZXR3b3JrZmlsdGVyaWRfcmVwcmVzZW50KVxuICAgICAgICAgICAgY29uc3QgYmFzZUZpZWxkTmFtZSA9IGZpZWxkTmFtZS5yZXBsYWNlKC9pZCQvLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkID0gYCR7YmFzZUZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gZGF0YVthbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIHZhbHVlIGJ1dCBubyByZXByZXNlbnQgdGV4dCwgdHJ5IHRvIGZpbmQgaXQgaW4gc3RhdGljIG9wdGlvbnMgZmlyc3RcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAmJiAhY3VycmVudFRleHQgJiYgY29uZmlnLnN0YXRpY09wdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoaW5nT3B0aW9uID0gY29uZmlnLnN0YXRpY09wdGlvbnMuZmluZChvcHRpb24gPT4gb3B0aW9uLnZhbHVlID09PSBjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgaWYgKG1hdGNoaW5nT3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFRleHQgPSBtYXRjaGluZ09wdGlvbi50ZXh0IHx8IG1hdGNoaW5nT3B0aW9uLm5hbWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIEhUTUwgaW4gcmVwcmVzZW50IHRleHQgdXNpbmcgU2VjdXJpdHlVdGlsc1xuICAgICAgICBpZiAoY3VycmVudFRleHQgJiYgdHlwZW9mIGN1cnJlbnRUZXh0ID09PSAnc3RyaW5nJyAmJiB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIFVzZSBzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyBmb3IgYWxsIF9yZXByZXNlbnQgZmllbGRzIGFzIHRoZXkgY2FuIGNvbnRhaW4gSFRNTCBlbnRpdGllcyBhbmQgaWNvbnNcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhjdXJyZW50VGV4dCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdlJ3JlIHVzaW5nIHBsYWNlaG9sZGVyIHRleHRcbiAgICAgICAgY29uc3QgaXNVc2luZ1BsYWNlaG9sZGVyID0gIWN1cnJlbnRUZXh0O1xuXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIHBsYWNlaG9sZGVyIG9yIGRlZmF1bHRcbiAgICAgICAgY3VycmVudFRleHQgPSBjdXJyZW50VGV4dCB8fCBjb25maWcucGxhY2Vob2xkZXIgfHwgJ1NlbGVjdCB2YWx1ZSc7XG5cbiAgICAgICAgLy8gQnVpbGQgQ1NTIGNsYXNzZXMgd2l0aCBzYW5pdGl6YXRpb25cbiAgICAgICAgLy8gQWxsb3cgY3VzdG9tIGJhc2UgY2xhc3NlcyBvciB1c2UgZGVmYXVsdCB3aXRoICdzZWxlY3Rpb24nXG4gICAgICAgIGNvbnN0IGRlZmF1bHRCYXNlQ2xhc3NlcyA9IFsndWknLCAnc2VsZWN0aW9uJywgJ2Ryb3Bkb3duJ107XG4gICAgICAgIGNvbnN0IGJhc2VDbGFzc2VzID0gY29uZmlnLmJhc2VDbGFzc2VzIHx8IGRlZmF1bHRCYXNlQ2xhc3NlcztcbiAgICAgICAgY29uc3QgYWRkaXRpb25hbENsYXNzZXMgPSBjb25maWcuYWRkaXRpb25hbENsYXNzZXMgfHwgW107XG4gICAgICAgIGNvbnN0IGFsbENsYXNzZXMgPSBbLi4uYmFzZUNsYXNzZXMsIC4uLmFkZGl0aW9uYWxDbGFzc2VzXS5qb2luKCcgJyk7XG5cbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gSFRNTCAtIEZJWEVEOiBDcmVhdGUgZWxlbWVudHMgd2l0aCBqUXVlcnkgdG8gcHJvcGVybHkgaGFuZGxlIEhUTUwgY29udGVudFxuICAgICAgICAvLyBPbmx5IHNob3cgY3VycmVudCB2YWx1ZSBpbiB0ZXh0IGRpc3BsYXksIGxldCBBUEkgcG9wdWxhdGUgbWVudSBvbiBjbGlja1xuICAgICAgICAvLyBVc2UgJ2RlZmF1bHQnIGNsYXNzIHdoZW4gc2hvd2luZyBwbGFjZWhvbGRlciwgZXZlbiBpZiB0aGVyZSdzIGEgdmFsdWVcbiAgICAgICAgY29uc3QgdGV4dENsYXNzID0gaXNVc2luZ1BsYWNlaG9sZGVyID8gJ3RleHQgZGVmYXVsdCcgOiAndGV4dCc7XG4gICAgICAgIFxuICAgICAgICAvLyBTYW5pdGl6ZSBmaWVsZE5hbWUgZm9yIHVzZSBpbiBJRCBhdHRyaWJ1dGVcbiAgICAgICAgY29uc3Qgc2FmZUZpZWxkTmFtZSA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZUF0dHJpYnV0ZShmaWVsZE5hbWUpXG4gICAgICAgICAgICA6IGZpZWxkTmFtZTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBzdHJ1Y3R1cmUgdXNpbmcgalF1ZXJ5IGZvciBwcm9wZXIgSFRNTCBoYW5kbGluZ1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoYWxsQ2xhc3NlcylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGAke3NhZmVGaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkdGV4dERpdiA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgIC5hZGRDbGFzcyh0ZXh0Q2xhc3MpXG4gICAgICAgICAgICAuaHRtbChjdXJyZW50VGV4dCk7IC8vIGN1cnJlbnRUZXh0IGFscmVhZHkgc2FuaXRpemVkIGFib3ZlXG4gICAgICAgIFxuICAgICAgICBjb25zdCAkZHJvcGRvd25JY29uID0gJCgnPGk+JykuYWRkQ2xhc3MoJ2Ryb3Bkb3duIGljb24nKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnPGRpdj4nKS5hZGRDbGFzcygnbWVudScpO1xuXG4gICAgICAgIC8vIFByZS1wb3B1bGF0ZSBtZW51IHdpdGggZW1wdHkgb3B0aW9uIE9OTFkgZm9yIHNlYXJjaCBkcm9wZG93bnNcbiAgICAgICAgLy8gc28gaXQgaXMgdmlzaWJsZSBiZWZvcmUgdGhlIHVzZXIgdHlwZXMgKG1pbkNoYXJhY3RlcnM+MCB3b24ndCB0cmlnZ2VyIEFQSSkuXG4gICAgICAgIC8vIEZvciBub24tc2VhcmNoIGRyb3Bkb3ducywgc2tpcCBwcmUtcG9wdWxhdGlvbiBzbyB0aGUgbWVudSBzdGFydHMgZW1wdHlcbiAgICAgICAgLy8gYW5kIEZvbWFudGljIFVJIGNhbGxzIHF1ZXJ5UmVtb3RlKCkgb24gZmlyc3Qgb3Blbi5cbiAgICAgICAgaWYgKGNvbmZpZy5lbXB0eU9wdGlvbikge1xuICAgICAgICAgICAgY29uc3Qgd2lsbEJlU2VhcmNoID0gWy4uLmJhc2VDbGFzc2VzLCAuLi5hZGRpdGlvbmFsQ2xhc3Nlc10uaW5jbHVkZXMoJ3NlYXJjaCcpO1xuICAgICAgICAgICAgaWYgKHdpbGxCZVNlYXJjaCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHRoaXMuZXNjYXBlSHRtbChjb25maWcuZW1wdHlPcHRpb24ua2V5IHx8ICcnKTtcbiAgICAgICAgICAgICAgICAkbWVudS5odG1sKGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke3NhZmVWYWx1ZX1cIj4ke2NvbmZpZy5lbXB0eU9wdGlvbi52YWx1ZSB8fCAnJ308L2Rpdj5gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXNzZW1ibGUgZHJvcGRvd25cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZCgkdGV4dERpdiwgJGRyb3Bkb3duSWNvbiwgJG1lbnUpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5zZXJ0IGRyb3Bkb3duIGFmdGVyIGhpZGRlbiBpbnB1dFxuICAgICAgICAkZHJvcGRvd24uaW5zZXJ0QWZ0ZXIoJGhpZGRlbklucHV0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB2YWx1ZSBpbiBoaWRkZW4gaW5wdXRcbiAgICAgICAgJGhpZGRlbklucHV0LnZhbChjdXJyZW50VmFsdWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZXhpc3RpbmcgZHJvcGRvd24gd2l0aCBuZXcgY29uZmlndXJhdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZvciB0aGUgZHJvcGRvd25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gTmV3IGNvbmZpZ3VyYXRpb24gdG8gYXBwbHlcbiAgICAgKi9cbiAgICB1cGRhdGVFeGlzdGluZ0Ryb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYENhbm5vdCB1cGRhdGU6IGRyb3Bkb3duIG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGROYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IHZhbHVlIGlmIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IGRhdGFbZmllbGROYW1lXSB8fCBjb25maWcuZGVmYXVsdFZhbHVlIHx8ICcnO1xuICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biB0ZXh0IGlmIHJlcHJlc2VudCBmaWVsZCBpcyBwcm92aWRlZFxuICAgICAgICBjb25zdCByZXByZXNlbnRGaWVsZCA9IGAke2ZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgbGV0IGN1cnJlbnRUZXh0ID0gZGF0YVtyZXByZXNlbnRGaWVsZF07XG4gICAgICAgIGlmICghY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhc2VGaWVsZE5hbWUgPSBmaWVsZE5hbWUucmVwbGFjZSgvaWQkLywgJycpO1xuICAgICAgICAgICAgY29uc3QgYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZCA9IGAke2Jhc2VGaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IGRhdGFbYWx0ZXJuYXRpdmVSZXByZXNlbnRGaWVsZF07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIEhUTUwgaW4gcmVwcmVzZW50IHRleHQgdXNpbmcgU2VjdXJpdHlVdGlscyAoY29uc2lzdGVudCB3aXRoIGJ1aWxkRHJvcGRvd24pXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCAmJiB0eXBlb2YgY3VycmVudFRleHQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIGZvciBhbGwgX3JlcHJlc2VudCBmaWVsZHMgYXMgdGhleSBjYW4gY29udGFpbiBIVE1MIGVudGl0aWVzIGFuZCBpY29uc1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICBjb25zdCAkdGV4dEVsZW1lbnQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQnKTtcbiAgICAgICAgICAgICR0ZXh0RWxlbWVudC5odG1sKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgICAgICR0ZXh0RWxlbWVudC5yZW1vdmVDbGFzcygnZGVmYXVsdCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRyb3Bkb3duIHdpdGggbmV3IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplRHJvcGRvd24oZmllbGROYW1lLCBjb25maWcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93biB3aXRoIEFQSSBvciBzdGF0aWMgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3duKGZpZWxkTmFtZSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYERyb3Bkb3duIG5vdCBmb3VuZDogJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGFsbG93QWRkaXRpb25zOiBjb25maWcuYWxsb3dBZGRpdGlvbnMgfHwgZmFsc2UsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBjb25maWcuZm9yY2VTZWxlY3Rpb24gIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5mb3JjZVNlbGVjdGlvbiA6ICEhY29uZmlnLmFsbG93QWRkaXRpb25zLFxuICAgICAgICAgICAgcHJlc2VydmVIVE1MOiB0cnVlLCAvLyBBbGxvdyBIVE1MIGluIGRyb3Bkb3duIHRleHQgKGZvciBpY29ucywgZmxhZ3MsIGV0Yy4pXG4gICAgICAgICAgICBjbGVhcmFibGU6IGNvbmZpZy5jbGVhcmFibGUgfHwgZmFsc2UsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQXV0b21hdGljIHN5bmNocm9uaXphdGlvbiB3aXRoIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IG9uIGhpZGRlbiBpbnB1dCBmb3IgZm9ybSB2YWxpZGF0aW9uL3Byb2Nlc3NpbmdcbiAgICAgICAgICAgICAgICAkaGlkZGVuSW5wdXQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gTm90aWZ5IGZvcm0gb2YgY2hhbmdlc1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEN1c3RvbSBvbkNoYW5nZSBoYW5kbGVyIC0gb25seSBmb3IgZmllbGQtc3BlY2lmaWMgbG9naWNcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLm9uQ2hhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5vbkNoYW5nZSh2YWx1ZSwgdGV4dCwgJGNob2ljZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIEFQSSBzZXR0aW5ncyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoY29uZmlnLmFwaVVybCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgZHJvcGRvd24gaGFzIHNlYXJjaCBmdW5jdGlvbmFsaXR5IC0gZGV0ZWN0IGJ5IENTUyBjbGFzc2VzIHNpbmNlIHNlYXJjaCBpbnB1dCBpcyBhZGRlZCBieSBGb21hbnRpYyBVSSBsYXRlclxuICAgICAgICAgICAgY29uc3QgaGFzU2VhcmNoSW5wdXQgPSAkZHJvcGRvd24uaGFzQ2xhc3MoJ3NlYXJjaCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBsZXQgYXBpVXJsID0gY29uZmlnLmFwaVVybDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gT25seSBhZGQgcXVlcnkgcGFyYW1ldGVyIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duc1xuICAgICAgICAgICAgaWYgKGhhc1NlYXJjaElucHV0KSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlVcmwuaW5kZXhPZignPycpID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICc/cXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZXR0aW5ncy5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgICAgICB1cmw6IGFwaVVybCxcbiAgICAgICAgICAgICAgICBjYWNoZTogY29uZmlnLmNhY2hlICE9PSB1bmRlZmluZWQgPyBjb25maWcuY2FjaGUgOiB0cnVlLFxuICAgICAgICAgICAgICAgIHRocm90dGxlOiBoYXNTZWFyY2hJbnB1dCA/IDUwMCA6IDAsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGVGaXJzdFJlcXVlc3Q6IGZhbHNlLFxuXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGNvbmZpZy5vblJlc3BvbnNlXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGNvbmZpZy5vblJlc3BvbnNlKHJlc3BvbnNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiB0aGlzLmRlZmF1bHRSZXNwb25zZUhhbmRsZXIocmVzcG9uc2UpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFByZXBlbmQgZW1wdHkgb3B0aW9uIGlmIGNvbmZpZ3VyZWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbmZpZy5lbXB0eU9wdGlvbiAmJiByZXN1bHQgJiYgcmVzdWx0LnJlc3VsdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5yZXN1bHRzLnVuc2hpZnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBjb25maWcuZW1wdHlPcHRpb24ua2V5IHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGNvbmZpZy5lbXB0eU9wdGlvbi52YWx1ZSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBjb25maWcuZW1wdHlPcHRpb24udmFsdWUgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZUxvY2FsaXplZDogJydcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYOKdjCBBUEkgcmVxdWVzdCBmYWlsZWQgZm9yICR7ZmllbGROYW1lfSAoJHtjb25maWcuYXBpVXJsfSk6YCwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgQVBJIHBhcmFtZXRlcnMgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmIChjb25maWcuYXBpUGFyYW1zICYmIHR5cGVvZiBjb25maWcuYXBpUGFyYW1zID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoY29uZmlnLmFwaVBhcmFtcyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdQYXJhbXMgPSBwYXJhbXMudG9TdHJpbmcoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdQYXJhbXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFwaVVybC5pbmRleE9mKCc/JykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcXVlcnlJbmRleCA9IGFwaVVybC5pbmRleE9mKCdxdWVyeT17cXVlcnl9Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocXVlcnlJbmRleCA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsID0gYXBpVXJsLnN1YnN0cmluZygwLCBxdWVyeUluZGV4KSArIGV4aXN0aW5nUGFyYW1zICsgJyZxdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpVXJsICs9ICcmJyArIGV4aXN0aW5nUGFyYW1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25seSBhZGQgcXVlcnkgcGFyYW1ldGVyIGlmIHRoZSBkcm9wZG93biBpcyBzZWFyY2hhYmxlXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaGFzU2VhcmNoSW5wdXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJz8nICsgZXhpc3RpbmdQYXJhbXMgKyAnJnF1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJz8nICsgZXhpc3RpbmdQYXJhbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzZXR0aW5ncy5hcGlTZXR0aW5ncy51cmwgPSBhcGlVcmw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2UgY3VzdG9tIHRlbXBsYXRlIHRvIHByb3Blcmx5IHJlbmRlciBIVE1MIGNvbnRlbnRcbiAgICAgICAgICAgIGlmICghY29uZmlnLnRlbXBsYXRlcykge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLnRlbXBsYXRlcyA9IHtcbiAgICAgICAgICAgICAgICAgICAgbWVudTogdGhpcy5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy50ZW1wbGF0ZXMgPSBjb25maWcudGVtcGxhdGVzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGaXg6IENsaWNraW5nIHRoZSBkcm9wZG93biBpY29uIG9wZW5zIHRoZSBtZW51IHdpdGhvdXQgdHJpZ2dlcmluZyBBUEkgcXVlcnkuXG4gICAgICAgICAgICAvLyBGb21hbnRpYyBVSSBvbmx5IGNhbGxzIHF1ZXJ5UmVtb3RlKCkgaW4gc2hvdygpIHdoZW4gY2FuLnNob3coKSBpcyBmYWxzZSAobm8gaXRlbXMpLlxuICAgICAgICAgICAgLy8gV2hlbiBzZXRWYWx1ZSgpIGFkZHMgYSBwcmUtc2VsZWN0ZWQgaXRlbSwgY2FuLnNob3coKSByZXR1cm5zIHRydWUgYW5kIEFQSSBpcyBza2lwcGVkLlxuICAgICAgICAgICAgLy8gVGhpcyBvblNob3cgY2FsbGJhY2sgZGV0ZWN0cyBhbiB1bmRlci1wb3B1bGF0ZWQgbWVudSBhbmQgdHJpZ2dlcnMgYSBzZWFyY2ggdmlhXG4gICAgICAgICAgICAvLyB0aGUgaW5wdXQgZXZlbnQsIHdoaWNoIGdvZXMgdGhyb3VnaCBtb2R1bGUuc2VhcmNoKCkgLT4gZmlsdGVyKCkgLT4gcXVlcnlSZW1vdGUoKS5cbiAgICAgICAgICAgIGlmIChoYXNTZWFyY2hJbnB1dCkge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLm9uU2hvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGRycCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRtZW51ID0gJGRycC5maW5kKCcubWVudScpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJG1lbnUuZmluZCgnLml0ZW0nKS5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgJHNlYXJjaElucHV0ID0gJGRycC5maW5kKCdpbnB1dC5zZWFyY2gnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkc2VhcmNoSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHNlYXJjaElucHV0LnRyaWdnZXIoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGNvbmZpZy5zdGF0aWNPcHRpb25zKSB7XG4gICAgICAgICAgICAvLyBGb3Igc3RhdGljIG9wdGlvbnMsIHBvcHVsYXRlIG1lbnUgaW1tZWRpYXRlbHlcbiAgICAgICAgICAgIHRoaXMucG9wdWxhdGVTdGF0aWNPcHRpb25zKCRkcm9wZG93biwgY29uZmlnLnN0YXRpY09wdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBuYXRpdmUgRm9tYW50aWMgVUkgZHJvcGRvd25cbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHNldHRpbmdzKTtcblxuICAgICAgICAvLyBTZXQgc2VsZWN0ZWQgdmFsdWUgZm9yIHN0YXRpYyBvcHRpb25zIGFmdGVyIGluaXRpYWxpemF0aW9uXG4gICAgICAgIGlmIChjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGhpZGRlbklucHV0LnZhbCgpO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBkcm9wZG93biBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICAgICAgfSwgMTApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IEFQSSByZXNwb25zZSBoYW5kbGVyIGZvciBNaWtvUEJYIGZvcm1hdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IEZvbWFudGljIFVJIGNvbXBhdGlibGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBkZWZhdWx0UmVzcG9uc2VIYW5kbGVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmICgocmVzcG9uc2UucmVzdWx0IHx8IHJlc3BvbnNlLnN1Y2Nlc3MpICYmIHJlc3BvbnNlLmRhdGEgJiYgQXJyYXkuaXNBcnJheShyZXNwb25zZS5kYXRhKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlc3VsdHM6IHJlc3BvbnNlLmRhdGEubWFwKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByYXdUZXh0ID0gaXRlbS5yZXByZXNlbnQgfHwgaXRlbS5uYW1lIHx8IGl0ZW0udGV4dDtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgZGlzcGxheSB0ZXh0IHdoaWxlIHByZXNlcnZpbmcgc2FmZSBIVE1MIChpY29ucylcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgICAgICAgICAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhyYXdUZXh0KVxuICAgICAgICAgICAgICAgICAgICAgICAgOiByYXdUZXh0O1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHNhZmVUZXh0LFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogc2FmZVRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogaXRlbS5kaXNhYmxlZCB8fCBmYWxzZVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgIHJlc3VsdHM6IFtdXG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXN0b20gZHJvcGRvd24gbWVudSB0ZW1wbGF0ZSBmb3IgcHJvcGVyIEhUTUwgcmVuZGVyaW5nXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZmllbGRzIC0gRmllbGQgY29uZmlndXJhdGlvblxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgZm9yIGRyb3Bkb3duIG1lbnVcbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcblxuICAgICAgICB2YWx1ZXMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBvcHRpb25bZmllbGRzLnZhbHVlXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSBvcHRpb25bZmllbGRzLnRleHRdIHx8IG9wdGlvbltmaWVsZHMubmFtZV0gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gb3B0aW9uLmRpc2FibGVkIHx8IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBVc2UgJ2luYWN0aXZlJyBjbGFzcyBmb3IgdmlzdWFsIHN0eWxpbmcgd2l0aG91dCBibG9ja2luZyBzZWxlY3Rpb25cbiAgICAgICAgICAgIGNvbnN0IHZpc3VhbENsYXNzID0gaXNEaXNhYmxlZCA/ICcgaW5hY3RpdmUnIDogJyc7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbSR7dmlzdWFsQ2xhc3N9XCIgZGF0YS12YWx1ZT1cIiR7RHluYW1pY0Ryb3Bkb3duQnVpbGRlci5lc2NhcGVIdG1sKHZhbHVlKX1cIj5gO1xuICAgICAgICAgICAgaHRtbCArPSB0ZXh0O1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBkcm9wZG93biB3aXRoIHN0YXRpYyBvcHRpb25zXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRkcm9wZG93biAtIERyb3Bkb3duIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBvcHRpb25zIC0gU3RhdGljIG9wdGlvbnMgYXJyYXlcbiAgICAgKi9cbiAgICBwb3B1bGF0ZVN0YXRpY09wdGlvbnMoJGRyb3Bkb3duLCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgIFxuICAgICAgICBvcHRpb25zLmZvckVhY2gob3B0aW9uID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJhd1ZhbHVlID0gb3B0aW9uLnZhbHVlO1xuICAgICAgICAgICAgY29uc3QgcmF3VGV4dCA9IG9wdGlvbi50ZXh0IHx8IG9wdGlvbi5uYW1lO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTYW5pdGl6ZSB2YWx1ZSBmb3IgYXR0cmlidXRlIGFuZCB0ZXh0IGZvciBkaXNwbGF5XG4gICAgICAgICAgICBjb25zdCBzYWZlVmFsdWUgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplQXR0cmlidXRlKHJhd1ZhbHVlKVxuICAgICAgICAgICAgICAgIDogdGhpcy5lc2NhcGVIdG1sKHJhd1ZhbHVlKTtcbiAgICAgICAgICAgIGNvbnN0IHNhZmVUZXh0ID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgICAgID8gU2VjdXJpdHlVdGlscy5zYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyhyYXdUZXh0KVxuICAgICAgICAgICAgICAgIDogcmF3VGV4dDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke3NhZmVWYWx1ZX1cIj4ke3NhZmVUZXh0fTwvZGl2PmApO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIG11bHRpcGxlIGRyb3Bkb3ducyBmcm9tIGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlncyAtIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggZmllbGRcbiAgICAgKi9cbiAgICBidWlsZE11bHRpcGxlRHJvcGRvd25zKGRhdGEsIGNvbmZpZ3MpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoY29uZmlncykuZm9yRWFjaChmaWVsZE5hbWUgPT4ge1xuICAgICAgICAgICAgdGhpcy5idWlsZERyb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnc1tmaWVsZE5hbWVdKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgdmFsdWUgaW4gZXhpc3RpbmcgZHJvcGRvd25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFZhbHVlIHRvIHNldFxuICAgICAqL1xuICAgIHNldFZhbHVlKGZpZWxkTmFtZSwgdmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IGRyb3Bkb3duIHZhbHVlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDdXJyZW50IHZhbHVlXG4gICAgICovXG4gICAgZ2V0VmFsdWUoZmllbGROYW1lKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgcmV0dXJuICRkcm9wZG93bi5sZW5ndGggPyAkZHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpIDogJyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciBkcm9wZG93biBzZWxlY3Rpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqL1xuICAgIGNsZWFyKGZpZWxkTmFtZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXNjYXBlIEhUTUwgdG8gcHJldmVudCBYU1NcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRleHQgdG8gZXNjYXBlXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRXNjYXBlZCB0ZXh0XG4gICAgICovXG4gICAgZXNjYXBlSHRtbCh0ZXh0KSB7XG4gICAgICAgIGNvbnN0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBkaXYudGV4dENvbnRlbnQgPSB0ZXh0O1xuICAgICAgICByZXR1cm4gZGl2LmlubmVySFRNTDtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IER5bmFtaWNEcm9wZG93bkJ1aWxkZXI7XG59Il19