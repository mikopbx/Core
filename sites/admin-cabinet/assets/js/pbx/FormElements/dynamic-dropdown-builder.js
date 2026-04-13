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

    this.initializeDropdown(fieldName, config); // Restore value and display text after Fomantic UI initialization
    // Fomantic may reset text to placeholder during dropdown setup

    if (currentValue) {
      $hiddenInput.val(currentValue);
      $dropdown.find('> .text').html(currentText).removeClass('default');
    }
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


    this.initializeDropdown(fieldName, config); // Restore value and display text after Fomantic UI re-initialization

    if (currentValue) {
      $hiddenInput.val(currentValue);
    }

    if (currentText) {
      $dropdown.find('> .text').html(currentText).removeClass('default');
    }
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
      forceSelection: config.forceSelection || false,
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


    $dropdown.dropdown(settings); // For allowAdditions dropdowns: commit typed text when search input loses focus.
    // Fomantic UI does not auto-commit custom values on blur with forceSelection:false.
    // Solution: use Fomantic's own 'set selected' API which properly adds the value
    // to the dropdown, updates text, fires onChange, and maintains internal state.

    if (config.allowAdditions) {
      var $searchInput = $dropdown.find('input.search');

      if ($searchInput.length) {
        $searchInput.off('blur.ddbAdditions').on('blur.ddbAdditions', function () {
          var $si = $(this); // Delay lets Fomantic process menu item clicks first.
          // If user selected from menu, search input is already cleared.

          setTimeout(function () {
            var searchText = $si.val().trim();

            if (searchText) {
              // Use Fomantic API to add and select the custom value.
              // This updates text, hidden input, and internal state consistently.
              $dropdown.dropdown('set selected', searchText);
            }
          }, 150);
        });
      }
    } // Set selected value for static options after initialization


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
   * Cache-clear hook used by selectors (extension-selector, sound-file-selector).
   *
   * Fomantic UI's apiSettings cache has no public per-URL invalidation API.
   * Visible reload is achieved by callers via clear(fieldId) + selector.refresh(fieldId),
   * which reinitialises the dropdown and forces a fresh remote query. This method
   * is intentionally a no-op so the call sites don't TypeError; deeper cache
   * invalidation would require tracking instances by URL.
   *
   * @param {string} apiUrl - API endpoint URL (informational)
   * @param {object} [params] - Cache key parameters (informational)
   */
  // eslint-disable-next-line no-unused-vars
  clearCacheFor: function clearCacheFor(apiUrl) {// No-op — see method comment.

    var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvZHluYW1pYy1kcm9wZG93bi1idWlsZGVyLmpzIl0sIm5hbWVzIjpbIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiZmllbGROYW1lIiwiZGF0YSIsImNvbmZpZyIsIiRoaWRkZW5JbnB1dCIsIiQiLCJsZW5ndGgiLCJjb25zb2xlIiwid2FybiIsIiRleGlzdGluZ0Ryb3Bkb3duIiwidXBkYXRlRXhpc3RpbmdEcm9wZG93biIsImN1cnJlbnRWYWx1ZSIsImRlZmF1bHRWYWx1ZSIsInJlcHJlc2VudEZpZWxkIiwiY3VycmVudFRleHQiLCJiYXNlRmllbGROYW1lIiwicmVwbGFjZSIsImFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQiLCJzdGF0aWNPcHRpb25zIiwibWF0Y2hpbmdPcHRpb24iLCJmaW5kIiwib3B0aW9uIiwidmFsdWUiLCJ0ZXh0IiwibmFtZSIsIlNlY3VyaXR5VXRpbHMiLCJzYW5pdGl6ZU9iamVjdFJlcHJlc2VudGF0aW9ucyIsImlzVXNpbmdQbGFjZWhvbGRlciIsInBsYWNlaG9sZGVyIiwiZGVmYXVsdEJhc2VDbGFzc2VzIiwiYmFzZUNsYXNzZXMiLCJhZGRpdGlvbmFsQ2xhc3NlcyIsImFsbENsYXNzZXMiLCJqb2luIiwidGV4dENsYXNzIiwic2FmZUZpZWxkTmFtZSIsInNhbml0aXplQXR0cmlidXRlIiwiJGRyb3Bkb3duIiwiYWRkQ2xhc3MiLCJhdHRyIiwiJHRleHREaXYiLCJodG1sIiwiJGRyb3Bkb3duSWNvbiIsIiRtZW51IiwiZW1wdHlPcHRpb24iLCJ3aWxsQmVTZWFyY2giLCJpbmNsdWRlcyIsInNhZmVWYWx1ZSIsImVzY2FwZUh0bWwiLCJrZXkiLCJhcHBlbmQiLCJpbnNlcnRBZnRlciIsInZhbCIsImluaXRpYWxpemVEcm9wZG93biIsInJlbW92ZUNsYXNzIiwiJHRleHRFbGVtZW50Iiwic2V0dGluZ3MiLCJhbGxvd0FkZGl0aW9ucyIsImZ1bGxUZXh0U2VhcmNoIiwiZm9yY2VTZWxlY3Rpb24iLCJwcmVzZXJ2ZUhUTUwiLCJjbGVhcmFibGUiLCJmaWx0ZXJSZW1vdGVEYXRhIiwib25DaGFuZ2UiLCIkY2hvaWNlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImFwaVVybCIsImhhc1NlYXJjaElucHV0IiwiaGFzQ2xhc3MiLCJpbmRleE9mIiwiYXBpU2V0dGluZ3MiLCJ1cmwiLCJjYWNoZSIsInVuZGVmaW5lZCIsInRocm90dGxlIiwidGhyb3R0bGVGaXJzdFJlcXVlc3QiLCJvblJlc3BvbnNlIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkZWZhdWx0UmVzcG9uc2VIYW5kbGVyIiwicmVzdWx0cyIsInVuc2hpZnQiLCJ0eXBlIiwidHlwZUxvY2FsaXplZCIsIm9uRmFpbHVyZSIsImVycm9yIiwiYXBpUGFyYW1zIiwicGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwiZXhpc3RpbmdQYXJhbXMiLCJ0b1N0cmluZyIsInF1ZXJ5SW5kZXgiLCJzdWJzdHJpbmciLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51Iiwib25TaG93IiwiJGRycCIsIiRzZWFyY2hJbnB1dCIsInBvcHVsYXRlU3RhdGljT3B0aW9ucyIsImRyb3Bkb3duIiwib2ZmIiwib24iLCIkc2kiLCJzZXRUaW1lb3V0Iiwic2VhcmNoVGV4dCIsInRyaW0iLCJzdWNjZXNzIiwiQXJyYXkiLCJpc0FycmF5IiwibWFwIiwiaXRlbSIsInJhd1RleHQiLCJyZXByZXNlbnQiLCJzYWZlVGV4dCIsImRpc2FibGVkIiwiZmllbGRzIiwidmFsdWVzIiwiZm9yRWFjaCIsImlzRGlzYWJsZWQiLCJ2aXN1YWxDbGFzcyIsIm9wdGlvbnMiLCJyYXdWYWx1ZSIsImJ1aWxkTXVsdGlwbGVEcm9wZG93bnMiLCJjb25maWdzIiwiT2JqZWN0Iiwia2V5cyIsInNldFZhbHVlIiwiZ2V0VmFsdWUiLCJjbGVhciIsImNsZWFyQ2FjaGVGb3IiLCJkaXYiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQi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QUF2QixDQUFaO0FBQ0FGLElBQUFBLEdBQUcsQ0FBQ0csV0FBSixHQUFrQmpILElBQWxCO0FBQ0EsV0FBTzhHLEdBQUcsQ0FBQ0ksU0FBWDtBQUNIO0FBNWYwQixDQUEvQixDLENBK2ZBOztBQUNBLElBQUksT0FBT0MsTUFBUCxLQUFrQixXQUFsQixJQUFpQ0EsTUFBTSxDQUFDQyxPQUE1QyxFQUFxRDtBQUNqREQsRUFBQUEsTUFBTSxDQUFDQyxPQUFQLEdBQWlCNUksc0JBQWpCO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgRm9ybSwgZ2xvYmFsVHJhbnNsYXRlLCBTZWN1cml0eVV0aWxzICovXG5cbi8qKlxuICogRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAtIFVuaXZlcnNhbCBkcm9wZG93biBidWlsZGVyIGZvciBNaWtvUEJYIFY1LjBcbiAqIFxuICogQnVpbGRzIGRyb3Bkb3duIEhUTUwgZHluYW1pY2FsbHkgYmFzZWQgb24gUkVTVCBBUEkgZGF0YS5cbiAqIFNlcGFyYXRlcyBjb25jZXJuczogUEhQIGZvcm1zIG9ubHkgcHJvdmlkZSBoaWRkZW4gaW5wdXRzLCBcbiAqIEphdmFTY3JpcHQgYnVpbGRzIFVJIGFuZCBwb3B1bGF0ZXMgd2l0aCBkYXRhLlxuICogXG4gKiBVc2FnZTpcbiAqIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignbmV0d29ya2ZpbHRlcmlkJywgZGF0YSwge1xuICogICAgIGFwaVVybDogJy9wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0Rm9yU2VsZWN0JyxcbiAqICAgICBwbGFjZWhvbGRlcjogJ1NlbGVjdCBuZXR3b3JrIGZpbHRlcidcbiAqIH0pO1xuICovXG5jb25zdCBEeW5hbWljRHJvcGRvd25CdWlsZGVyID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIGRyb3Bkb3duIGZvciBhIGZpZWxkIGJhc2VkIG9uIFJFU1QgQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZSAoZS5nLiwgJ25ldHdvcmtmaWx0ZXJpZCcpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gRHJvcGRvd24gY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcgPSB7fSkge1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgSGlkZGVuIGlucHV0IG5vdCBmb3VuZCBmb3IgZmllbGQ6ICR7ZmllbGROYW1lfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBhbHJlYWR5IGV4aXN0cyAtIHVwZGF0ZSBpdCBpbnN0ZWFkIG9mIGNyZWF0aW5nIGR1cGxpY2F0ZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVFeGlzdGluZ0Ryb3Bkb3duKGZpZWxkTmFtZSwgZGF0YSwgY29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWVzIGZyb20gZGF0YVxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBkYXRhW2ZpZWxkTmFtZV0gfHwgY29uZmlnLmRlZmF1bHRWYWx1ZSB8fCAnJztcbiAgICAgICAgY29uc3QgcmVwcmVzZW50RmllbGQgPSBgJHtmaWVsZE5hbWV9X3JlcHJlc2VudGA7XG4gICAgICAgIFxuICAgICAgICAvLyBUcnkgbXVsdGlwbGUgcG9zc2libGUgcmVwcmVzZW50IGZpZWxkIG5hbWVzIGZvciBmbGV4aWJpbGl0eVxuICAgICAgICBsZXQgY3VycmVudFRleHQgPSBkYXRhW3JlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIC8vIFRyeSB3aXRob3V0ICdpZCcgc3VmZml4IChlLmcuLCBuZXR3b3JrZmlsdGVyX3JlcHJlc2VudCBpbnN0ZWFkIG9mIG5ldHdvcmtmaWx0ZXJpZF9yZXByZXNlbnQpXG4gICAgICAgICAgICBjb25zdCBiYXNlRmllbGROYW1lID0gZmllbGROYW1lLnJlcGxhY2UoL2lkJC8sICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGFsdGVybmF0aXZlUmVwcmVzZW50RmllbGQgPSBgJHtiYXNlRmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBkYXRhW2FsdGVybmF0aXZlUmVwcmVzZW50RmllbGRdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgdmFsdWUgYnV0IG5vIHJlcHJlc2VudCB0ZXh0LCB0cnkgdG8gZmluZCBpdCBpbiBzdGF0aWMgb3B0aW9ucyBmaXJzdFxuICAgICAgICBpZiAoY3VycmVudFZhbHVlICYmICFjdXJyZW50VGV4dCAmJiBjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgY29uc3QgbWF0Y2hpbmdPcHRpb24gPSBjb25maWcuc3RhdGljT3B0aW9ucy5maW5kKG9wdGlvbiA9PiBvcHRpb24udmFsdWUgPT09IGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICBpZiAobWF0Y2hpbmdPcHRpb24pIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50VGV4dCA9IG1hdGNoaW5nT3B0aW9uLnRleHQgfHwgbWF0Y2hpbmdPcHRpb24ubmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgSFRNTCBpbiByZXByZXNlbnQgdGV4dCB1c2luZyBTZWN1cml0eVV0aWxzXG4gICAgICAgIGlmIChjdXJyZW50VGV4dCAmJiB0eXBlb2YgY3VycmVudFRleHQgPT09ICdzdHJpbmcnICYmIHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgLy8gVXNlIHNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zIGZvciBhbGwgX3JlcHJlc2VudCBmaWVsZHMgYXMgdGhleSBjYW4gY29udGFpbiBIVE1MIGVudGl0aWVzIGFuZCBpY29uc1xuICAgICAgICAgICAgY3VycmVudFRleHQgPSBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKGN1cnJlbnRUZXh0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UncmUgdXNpbmcgcGxhY2Vob2xkZXIgdGV4dFxuICAgICAgICBjb25zdCBpc1VzaW5nUGxhY2Vob2xkZXIgPSAhY3VycmVudFRleHQ7XG5cbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gcGxhY2Vob2xkZXIgb3IgZGVmYXVsdFxuICAgICAgICBjdXJyZW50VGV4dCA9IGN1cnJlbnRUZXh0IHx8IGNvbmZpZy5wbGFjZWhvbGRlciB8fCAnU2VsZWN0IHZhbHVlJztcblxuICAgICAgICAvLyBCdWlsZCBDU1MgY2xhc3NlcyB3aXRoIHNhbml0aXphdGlvblxuICAgICAgICAvLyBBbGxvdyBjdXN0b20gYmFzZSBjbGFzc2VzIG9yIHVzZSBkZWZhdWx0IHdpdGggJ3NlbGVjdGlvbidcbiAgICAgICAgY29uc3QgZGVmYXVsdEJhc2VDbGFzc2VzID0gWyd1aScsICdzZWxlY3Rpb24nLCAnZHJvcGRvd24nXTtcbiAgICAgICAgY29uc3QgYmFzZUNsYXNzZXMgPSBjb25maWcuYmFzZUNsYXNzZXMgfHwgZGVmYXVsdEJhc2VDbGFzc2VzO1xuICAgICAgICBjb25zdCBhZGRpdGlvbmFsQ2xhc3NlcyA9IGNvbmZpZy5hZGRpdGlvbmFsQ2xhc3NlcyB8fCBbXTtcbiAgICAgICAgY29uc3QgYWxsQ2xhc3NlcyA9IFsuLi5iYXNlQ2xhc3NlcywgLi4uYWRkaXRpb25hbENsYXNzZXNdLmpvaW4oJyAnKTtcblxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biBIVE1MIC0gRklYRUQ6IENyZWF0ZSBlbGVtZW50cyB3aXRoIGpRdWVyeSB0byBwcm9wZXJseSBoYW5kbGUgSFRNTCBjb250ZW50XG4gICAgICAgIC8vIE9ubHkgc2hvdyBjdXJyZW50IHZhbHVlIGluIHRleHQgZGlzcGxheSwgbGV0IEFQSSBwb3B1bGF0ZSBtZW51IG9uIGNsaWNrXG4gICAgICAgIC8vIFVzZSAnZGVmYXVsdCcgY2xhc3Mgd2hlbiBzaG93aW5nIHBsYWNlaG9sZGVyLCBldmVuIGlmIHRoZXJlJ3MgYSB2YWx1ZVxuICAgICAgICBjb25zdCB0ZXh0Q2xhc3MgPSBpc1VzaW5nUGxhY2Vob2xkZXIgPyAndGV4dCBkZWZhdWx0JyA6ICd0ZXh0JztcbiAgICAgICAgXG4gICAgICAgIC8vIFNhbml0aXplIGZpZWxkTmFtZSBmb3IgdXNlIGluIElEIGF0dHJpYnV0ZVxuICAgICAgICBjb25zdCBzYWZlRmllbGROYW1lID0gdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnIFxuICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplQXR0cmlidXRlKGZpZWxkTmFtZSlcbiAgICAgICAgICAgIDogZmllbGROYW1lO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIHN0cnVjdHVyZSB1c2luZyBqUXVlcnkgZm9yIHByb3BlciBIVE1MIGhhbmRsaW5nXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJzxkaXY+JylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhhbGxDbGFzc2VzKVxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgYCR7c2FmZUZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICR0ZXh0RGl2ID0gJCgnPGRpdj4nKVxuICAgICAgICAgICAgLmFkZENsYXNzKHRleHRDbGFzcylcbiAgICAgICAgICAgIC5odG1sKGN1cnJlbnRUZXh0KTsgLy8gY3VycmVudFRleHQgYWxyZWFkeSBzYW5pdGl6ZWQgYWJvdmVcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRkcm9wZG93bkljb24gPSAkKCc8aT4nKS5hZGRDbGFzcygnZHJvcGRvd24gaWNvbicpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCc8ZGl2PicpLmFkZENsYXNzKCdtZW51Jyk7XG5cbiAgICAgICAgLy8gUHJlLXBvcHVsYXRlIG1lbnUgd2l0aCBlbXB0eSBvcHRpb24gT05MWSBmb3Igc2VhcmNoIGRyb3Bkb3duc1xuICAgICAgICAvLyBzbyBpdCBpcyB2aXNpYmxlIGJlZm9yZSB0aGUgdXNlciB0eXBlcyAobWluQ2hhcmFjdGVycz4wIHdvbid0IHRyaWdnZXIgQVBJKS5cbiAgICAgICAgLy8gRm9yIG5vbi1zZWFyY2ggZHJvcGRvd25zLCBza2lwIHByZS1wb3B1bGF0aW9uIHNvIHRoZSBtZW51IHN0YXJ0cyBlbXB0eVxuICAgICAgICAvLyBhbmQgRm9tYW50aWMgVUkgY2FsbHMgcXVlcnlSZW1vdGUoKSBvbiBmaXJzdCBvcGVuLlxuICAgICAgICBpZiAoY29uZmlnLmVtcHR5T3B0aW9uKSB7XG4gICAgICAgICAgICBjb25zdCB3aWxsQmVTZWFyY2ggPSBbLi4uYmFzZUNsYXNzZXMsIC4uLmFkZGl0aW9uYWxDbGFzc2VzXS5pbmNsdWRlcygnc2VhcmNoJyk7XG4gICAgICAgICAgICBpZiAod2lsbEJlU2VhcmNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2FmZVZhbHVlID0gdGhpcy5lc2NhcGVIdG1sKGNvbmZpZy5lbXB0eU9wdGlvbi5rZXkgfHwgJycpO1xuICAgICAgICAgICAgICAgICRtZW51Lmh0bWwoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7c2FmZVZhbHVlfVwiPiR7Y29uZmlnLmVtcHR5T3B0aW9uLnZhbHVlIHx8ICcnfTwvZGl2PmApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBc3NlbWJsZSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKCR0ZXh0RGl2LCAkZHJvcGRvd25JY29uLCAkbWVudSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnNlcnQgZHJvcGRvd24gYWZ0ZXIgaGlkZGVuIGlucHV0XG4gICAgICAgICRkcm9wZG93bi5pbnNlcnRBZnRlcigkaGlkZGVuSW5wdXQpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHZhbHVlIGluIGhpZGRlbiBpbnB1dFxuICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZyk7XG5cbiAgICAgICAgLy8gUmVzdG9yZSB2YWx1ZSBhbmQgZGlzcGxheSB0ZXh0IGFmdGVyIEZvbWFudGljIFVJIGluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIEZvbWFudGljIG1heSByZXNldCB0ZXh0IHRvIHBsYWNlaG9sZGVyIGR1cmluZyBkcm9wZG93biBzZXR1cFxuICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgICAgICAkZHJvcGRvd24uZmluZCgnPiAudGV4dCcpLmh0bWwoY3VycmVudFRleHQpLnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBleGlzdGluZyBkcm9wZG93biB3aXRoIG5ldyBjb25maWd1cmF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkTmFtZSAtIEZpZWxkIG5hbWVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZm9yIHRoZSBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgLSBOZXcgY29uZmlndXJhdGlvbiB0byBhcHBseVxuICAgICAqL1xuICAgIHVwZGF0ZUV4aXN0aW5nRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWcpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoISRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQ2Fubm90IHVwZGF0ZTogZHJvcGRvd24gbm90IGZvdW5kIGZvciBmaWVsZDogJHtmaWVsZE5hbWV9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgdmFsdWUgaWYgcHJvdmlkZWRcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gZGF0YVtmaWVsZE5hbWVdIHx8IGNvbmZpZy5kZWZhdWx0VmFsdWUgfHwgJyc7XG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHRleHQgaWYgcmVwcmVzZW50IGZpZWxkIGlzIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IHJlcHJlc2VudEZpZWxkID0gYCR7ZmllbGROYW1lfV9yZXByZXNlbnRgO1xuICAgICAgICBsZXQgY3VycmVudFRleHQgPSBkYXRhW3JlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgaWYgKCFjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgY29uc3QgYmFzZUZpZWxkTmFtZSA9IGZpZWxkTmFtZS5yZXBsYWNlKC9pZCQvLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBhbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkID0gYCR7YmFzZUZpZWxkTmFtZX1fcmVwcmVzZW50YDtcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0ID0gZGF0YVthbHRlcm5hdGl2ZVJlcHJlc2VudEZpZWxkXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2FuaXRpemUgSFRNTCBpbiByZXByZXNlbnQgdGV4dCB1c2luZyBTZWN1cml0eVV0aWxzIChjb25zaXN0ZW50IHdpdGggYnVpbGREcm9wZG93bilcbiAgICAgICAgaWYgKGN1cnJlbnRUZXh0ICYmIHR5cGVvZiBjdXJyZW50VGV4dCA9PT0gJ3N0cmluZycgJiYgdHlwZW9mIFNlY3VyaXR5VXRpbHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMgZm9yIGFsbCBfcmVwcmVzZW50IGZpZWxkcyBhcyB0aGV5IGNhbiBjb250YWluIEhUTUwgZW50aXRpZXMgYW5kIGljb25zXG4gICAgICAgICAgICBjdXJyZW50VGV4dCA9IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVPYmplY3RSZXByZXNlbnRhdGlvbnMoY3VycmVudFRleHQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0ZXh0RWxlbWVudCA9ICRkcm9wZG93bi5maW5kKCcudGV4dCcpO1xuICAgICAgICAgICAgJHRleHRFbGVtZW50Lmh0bWwoY3VycmVudFRleHQpO1xuICAgICAgICAgICAgJHRleHRFbGVtZW50LnJlbW92ZUNsYXNzKCdkZWZhdWx0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgZHJvcGRvd24gd2l0aCBuZXcgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihmaWVsZE5hbWUsIGNvbmZpZyk7XG5cbiAgICAgICAgLy8gUmVzdG9yZSB2YWx1ZSBhbmQgZGlzcGxheSB0ZXh0IGFmdGVyIEZvbWFudGljIFVJIHJlLWluaXRpYWxpemF0aW9uXG4gICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwoY3VycmVudFZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5maW5kKCc+IC50ZXh0JykuaHRtbChjdXJyZW50VGV4dCkucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkcm9wZG93biB3aXRoIEFQSSBvciBzdGF0aWMgZGF0YVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3duKGZpZWxkTmFtZSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGROYW1lfWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYERyb3Bkb3duIG5vdCBmb3VuZDogJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGFsbG93QWRkaXRpb25zOiBjb25maWcuYWxsb3dBZGRpdGlvbnMgfHwgZmFsc2UsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBjb25maWcuZm9yY2VTZWxlY3Rpb24gfHwgZmFsc2UsXG4gICAgICAgICAgICBwcmVzZXJ2ZUhUTUw6IHRydWUsIC8vIEFsbG93IEhUTUwgaW4gZHJvcGRvd24gdGV4dCAoZm9yIGljb25zLCBmbGFncywgZXRjLilcbiAgICAgICAgICAgIGNsZWFyYWJsZTogY29uZmlnLmNsZWFyYWJsZSB8fCBmYWxzZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG5cbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQsICRjaG9pY2UpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBBdXRvbWF0aWMgc3luY2hyb25pemF0aW9uIHdpdGggaGlkZGVuIGlucHV0XG4gICAgICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgb24gaGlkZGVuIGlucHV0IGZvciBmb3JtIHZhbGlkYXRpb24vcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBOb3RpZnkgZm9ybSBvZiBjaGFuZ2VzXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3VzdG9tIG9uQ2hhbmdlIGhhbmRsZXIgLSBvbmx5IGZvciBmaWVsZC1zcGVjaWZpYyBsb2dpY1xuICAgICAgICAgICAgICAgIGlmIChjb25maWcub25DaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLm9uQ2hhbmdlKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgQVBJIHNldHRpbmdzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChjb25maWcuYXBpVXJsKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBoYXMgc2VhcmNoIGZ1bmN0aW9uYWxpdHkgLSBkZXRlY3QgYnkgQ1NTIGNsYXNzZXMgc2luY2Ugc2VhcmNoIGlucHV0IGlzIGFkZGVkIGJ5IEZvbWFudGljIFVJIGxhdGVyXG4gICAgICAgICAgICBjb25zdCBoYXNTZWFyY2hJbnB1dCA9ICRkcm9wZG93bi5oYXNDbGFzcygnc2VhcmNoJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGxldCBhcGlVcmwgPSBjb25maWcuYXBpVXJsO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBPbmx5IGFkZCBxdWVyeSBwYXJhbWV0ZXIgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25zXG4gICAgICAgICAgICBpZiAoaGFzU2VhcmNoSW5wdXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmFwaVVybC5pbmRleE9mKCc/JykgPiAtMSkge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJyZxdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJz9xdWVyeT17cXVlcnl9JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgICAgIHVybDogYXBpVXJsLFxuICAgICAgICAgICAgICAgIGNhY2hlOiBjb25maWcuY2FjaGUgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5jYWNoZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgdGhyb3R0bGU6IGhhc1NlYXJjaElucHV0ID8gNTAwIDogMCxcbiAgICAgICAgICAgICAgICB0aHJvdHRsZUZpcnN0UmVxdWVzdDogZmFsc2UsXG5cbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gY29uZmlnLm9uUmVzcG9uc2VcbiAgICAgICAgICAgICAgICAgICAgICAgID8gY29uZmlnLm9uUmVzcG9uc2UocmVzcG9uc2UpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHRoaXMuZGVmYXVsdFJlc3BvbnNlSGFuZGxlcihyZXNwb25zZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUHJlcGVuZCBlbXB0eSBvcHRpb24gaWYgY29uZmlndXJlZFxuICAgICAgICAgICAgICAgICAgICBpZiAoY29uZmlnLmVtcHR5T3B0aW9uICYmIHJlc3VsdCAmJiByZXN1bHQucmVzdWx0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnJlc3VsdHMudW5zaGlmdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGNvbmZpZy5lbXB0eU9wdGlvbi5rZXkgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogY29uZmlnLmVtcHR5T3B0aW9uLnZhbHVlIHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvbmZpZy5lbXB0eU9wdGlvbi52YWx1ZSB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlTG9jYWxpemVkOiAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihg4p2MIEFQSSByZXF1ZXN0IGZhaWxlZCBmb3IgJHtmaWVsZE5hbWV9ICgke2NvbmZpZy5hcGlVcmx9KTpgLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBBUEkgcGFyYW1ldGVycyBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlQYXJhbXMgJiYgdHlwZW9mIGNvbmZpZy5hcGlQYXJhbXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhjb25maWcuYXBpUGFyYW1zKTtcbiAgICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ1BhcmFtcyA9IHBhcmFtcy50b1N0cmluZygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1BhcmFtcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXBpVXJsLmluZGV4T2YoJz8nKSA+IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBxdWVyeUluZGV4ID0gYXBpVXJsLmluZGV4T2YoJ3F1ZXJ5PXtxdWVyeX0nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxdWVyeUluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgPSBhcGlVcmwuc3Vic3RyaW5nKDAsIHF1ZXJ5SW5kZXgpICsgZXhpc3RpbmdQYXJhbXMgKyAnJnF1ZXJ5PXtxdWVyeX0nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlVcmwgKz0gJyYnICsgZXhpc3RpbmdQYXJhbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IGFkZCBxdWVyeSBwYXJhbWV0ZXIgaWYgdGhlIGRyb3Bkb3duIGlzIHNlYXJjaGFibGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChoYXNTZWFyY2hJbnB1dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcyArICcmcXVlcnk9e3F1ZXJ5fSc7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaVVybCArPSAnPycgKyBleGlzdGluZ1BhcmFtcztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLmFwaVNldHRpbmdzLnVybCA9IGFwaVVybDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gdGVtcGxhdGUgdG8gcHJvcGVybHkgcmVuZGVyIEhUTUwgY29udGVudFxuICAgICAgICAgICAgaWYgKCFjb25maWcudGVtcGxhdGVzKSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MudGVtcGxhdGVzID0ge1xuICAgICAgICAgICAgICAgICAgICBtZW51OiB0aGlzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLnRlbXBsYXRlcyA9IGNvbmZpZy50ZW1wbGF0ZXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZpeDogQ2xpY2tpbmcgdGhlIGRyb3Bkb3duIGljb24gb3BlbnMgdGhlIG1lbnUgd2l0aG91dCB0cmlnZ2VyaW5nIEFQSSBxdWVyeS5cbiAgICAgICAgICAgIC8vIEZvbWFudGljIFVJIG9ubHkgY2FsbHMgcXVlcnlSZW1vdGUoKSBpbiBzaG93KCkgd2hlbiBjYW4uc2hvdygpIGlzIGZhbHNlIChubyBpdGVtcykuXG4gICAgICAgICAgICAvLyBXaGVuIHNldFZhbHVlKCkgYWRkcyBhIHByZS1zZWxlY3RlZCBpdGVtLCBjYW4uc2hvdygpIHJldHVybnMgdHJ1ZSBhbmQgQVBJIGlzIHNraXBwZWQuXG4gICAgICAgICAgICAvLyBUaGlzIG9uU2hvdyBjYWxsYmFjayBkZXRlY3RzIGFuIHVuZGVyLXBvcHVsYXRlZCBtZW51IGFuZCB0cmlnZ2VycyBhIHNlYXJjaCB2aWFcbiAgICAgICAgICAgIC8vIHRoZSBpbnB1dCBldmVudCwgd2hpY2ggZ29lcyB0aHJvdWdoIG1vZHVsZS5zZWFyY2goKSAtPiBmaWx0ZXIoKSAtPiBxdWVyeVJlbW90ZSgpLlxuICAgICAgICAgICAgaWYgKGhhc1NlYXJjaElucHV0KSB7XG4gICAgICAgICAgICAgICAgc2V0dGluZ3Mub25TaG93ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZHJwID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJwLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkbWVudS5maW5kKCcuaXRlbScpLmxlbmd0aCA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCAkc2VhcmNoSW5wdXQgPSAkZHJwLmZpbmQoJ2lucHV0LnNlYXJjaCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRzZWFyY2hJbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2VhcmNoSW5wdXQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmIChjb25maWcuc3RhdGljT3B0aW9ucykge1xuICAgICAgICAgICAgLy8gRm9yIHN0YXRpYyBvcHRpb25zLCBwb3B1bGF0ZSBtZW51IGltbWVkaWF0ZWx5XG4gICAgICAgICAgICB0aGlzLnBvcHVsYXRlU3RhdGljT3B0aW9ucygkZHJvcGRvd24sIGNvbmZpZy5zdGF0aWNPcHRpb25zKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgbmF0aXZlIEZvbWFudGljIFVJIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bihzZXR0aW5ncyk7XG5cbiAgICAgICAgLy8gRm9yIGFsbG93QWRkaXRpb25zIGRyb3Bkb3duczogY29tbWl0IHR5cGVkIHRleHQgd2hlbiBzZWFyY2ggaW5wdXQgbG9zZXMgZm9jdXMuXG4gICAgICAgIC8vIEZvbWFudGljIFVJIGRvZXMgbm90IGF1dG8tY29tbWl0IGN1c3RvbSB2YWx1ZXMgb24gYmx1ciB3aXRoIGZvcmNlU2VsZWN0aW9uOmZhbHNlLlxuICAgICAgICAvLyBTb2x1dGlvbjogdXNlIEZvbWFudGljJ3Mgb3duICdzZXQgc2VsZWN0ZWQnIEFQSSB3aGljaCBwcm9wZXJseSBhZGRzIHRoZSB2YWx1ZVxuICAgICAgICAvLyB0byB0aGUgZHJvcGRvd24sIHVwZGF0ZXMgdGV4dCwgZmlyZXMgb25DaGFuZ2UsIGFuZCBtYWludGFpbnMgaW50ZXJuYWwgc3RhdGUuXG4gICAgICAgIGlmIChjb25maWcuYWxsb3dBZGRpdGlvbnMpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWFyY2hJbnB1dCA9ICRkcm9wZG93bi5maW5kKCdpbnB1dC5zZWFyY2gnKTtcbiAgICAgICAgICAgIGlmICgkc2VhcmNoSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJHNlYXJjaElucHV0Lm9mZignYmx1ci5kZGJBZGRpdGlvbnMnKS5vbignYmx1ci5kZGJBZGRpdGlvbnMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRzaSA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIC8vIERlbGF5IGxldHMgRm9tYW50aWMgcHJvY2VzcyBtZW51IGl0ZW0gY2xpY2tzIGZpcnN0LlxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB1c2VyIHNlbGVjdGVkIGZyb20gbWVudSwgc2VhcmNoIGlucHV0IGlzIGFscmVhZHkgY2xlYXJlZC5cbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hUZXh0ID0gJHNpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZWFyY2hUZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNlIEZvbWFudGljIEFQSSB0byBhZGQgYW5kIHNlbGVjdCB0aGUgY3VzdG9tIHZhbHVlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgdXBkYXRlcyB0ZXh0LCBoaWRkZW4gaW5wdXQsIGFuZCBpbnRlcm5hbCBzdGF0ZSBjb25zaXN0ZW50bHkuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZWFyY2hUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSwgMTUwKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBzZWxlY3RlZCB2YWx1ZSBmb3Igc3RhdGljIG9wdGlvbnMgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgaWYgKGNvbmZpZy5zdGF0aWNPcHRpb25zKSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAkaGlkZGVuSW5wdXQudmFsKCk7XG4gICAgICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIGRyb3Bkb3duIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgQVBJIHJlc3BvbnNlIGhhbmRsZXIgZm9yIE1pa29QQlggZm9ybWF0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gQVBJIHJlc3BvbnNlXG4gICAgICogQHJldHVybnMge29iamVjdH0gRm9tYW50aWMgVUkgY29tcGF0aWJsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGRlZmF1bHRSZXNwb25zZUhhbmRsZXIocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKChyZXNwb25zZS5yZXN1bHQgfHwgcmVzcG9uc2Uuc3VjY2VzcykgJiYgcmVzcG9uc2UuZGF0YSAmJiBBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEpKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgcmVzdWx0czogcmVzcG9uc2UuZGF0YS5tYXAoaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJhd1RleHQgPSBpdGVtLnJlcHJlc2VudCB8fCBpdGVtLm5hbWUgfHwgaXRlbS50ZXh0O1xuICAgICAgICAgICAgICAgICAgICAvLyBTYW5pdGl6ZSBkaXNwbGF5IHRleHQgd2hpbGUgcHJlc2VydmluZyBzYWZlIEhUTUwgKGljb25zKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzYWZlVGV4dCA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICAgICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgICAgICAgICA6IHJhd1RleHQ7XG5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogc2FmZVRleHQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBzYWZlVGV4dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiBpdGVtLmRpc2FibGVkIHx8IGZhbHNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgcmVzdWx0czogW11cbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBkcm9wZG93biBtZW51IHRlbXBsYXRlIGZvciBwcm9wZXIgSFRNTCByZW5kZXJpbmdcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmaWVsZHMgLSBGaWVsZCBjb25maWd1cmF0aW9uXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBmb3IgZHJvcGRvd24gbWVudVxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuXG4gICAgICAgIHZhbHVlcy5mb3JFYWNoKG9wdGlvbiA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IG9wdGlvbltmaWVsZHMudmFsdWVdIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9IG9wdGlvbltmaWVsZHMudGV4dF0gfHwgb3B0aW9uW2ZpZWxkcy5uYW1lXSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGlzRGlzYWJsZWQgPSBvcHRpb24uZGlzYWJsZWQgfHwgZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIFVzZSAnaW5hY3RpdmUnIGNsYXNzIGZvciB2aXN1YWwgc3R5bGluZyB3aXRob3V0IGJsb2NraW5nIHNlbGVjdGlvblxuICAgICAgICAgICAgY29uc3QgdmlzdWFsQ2xhc3MgPSBpc0Rpc2FibGVkID8gJyBpbmFjdGl2ZScgOiAnJztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtJHt2aXN1YWxDbGFzc31cIiBkYXRhLXZhbHVlPVwiJHtEeW5hbWljRHJvcGRvd25CdWlsZGVyLmVzY2FwZUh0bWwodmFsdWUpfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9IHRleHQ7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGRyb3Bkb3duIHdpdGggc3RhdGljIG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGRyb3Bkb3duIC0gRHJvcGRvd24gZWxlbWVudFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IG9wdGlvbnMgLSBTdGF0aWMgb3B0aW9ucyBhcnJheVxuICAgICAqL1xuICAgIHBvcHVsYXRlU3RhdGljT3B0aW9ucygkZHJvcGRvd24sIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgXG4gICAgICAgIG9wdGlvbnMuZm9yRWFjaChvcHRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgcmF3VmFsdWUgPSBvcHRpb24udmFsdWU7XG4gICAgICAgICAgICBjb25zdCByYXdUZXh0ID0gb3B0aW9uLnRleHQgfHwgb3B0aW9uLm5hbWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNhbml0aXplIHZhbHVlIGZvciBhdHRyaWJ1dGUgYW5kIHRleHQgZm9yIGRpc3BsYXlcbiAgICAgICAgICAgIGNvbnN0IHNhZmVWYWx1ZSA9IHR5cGVvZiBTZWN1cml0eVV0aWxzICE9PSAndW5kZWZpbmVkJyBcbiAgICAgICAgICAgICAgICA/IFNlY3VyaXR5VXRpbHMuc2FuaXRpemVBdHRyaWJ1dGUocmF3VmFsdWUpXG4gICAgICAgICAgICAgICAgOiB0aGlzLmVzY2FwZUh0bWwocmF3VmFsdWUpO1xuICAgICAgICAgICAgY29uc3Qgc2FmZVRleHQgPSB0eXBlb2YgU2VjdXJpdHlVdGlscyAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgICAgICAgICAgICAgPyBTZWN1cml0eVV0aWxzLnNhbml0aXplT2JqZWN0UmVwcmVzZW50YXRpb25zKHJhd1RleHQpXG4gICAgICAgICAgICAgICAgOiByYXdUZXh0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7c2FmZVZhbHVlfVwiPiR7c2FmZVRleHR9PC9kaXY+YCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgbXVsdGlwbGUgZHJvcGRvd25zIGZyb20gY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWdzIC0gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCBmaWVsZFxuICAgICAqL1xuICAgIGJ1aWxkTXVsdGlwbGVEcm9wZG93bnMoZGF0YSwgY29uZmlncykge1xuICAgICAgICBPYmplY3Qua2V5cyhjb25maWdzKS5mb3JFYWNoKGZpZWxkTmFtZSA9PiB7XG4gICAgICAgICAgICB0aGlzLmJ1aWxkRHJvcGRvd24oZmllbGROYW1lLCBkYXRhLCBjb25maWdzW2ZpZWxkTmFtZV0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCB2YWx1ZSBpbiBleGlzdGluZyBkcm9wZG93blxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICovXG4gICAgc2V0VmFsdWUoZmllbGROYW1lLCB2YWx1ZSkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZE5hbWV9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgZHJvcGRvd24gdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGROYW1lIC0gRmllbGQgbmFtZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEN1cnJlbnQgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRWYWx1ZShmaWVsZE5hbWUpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGROYW1lfS1kcm9wZG93bmApO1xuICAgICAgICByZXR1cm4gJGRyb3Bkb3duLmxlbmd0aCA/ICRkcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJykgOiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZE5hbWUgLSBGaWVsZCBuYW1lXG4gICAgICovXG4gICAgY2xlYXIoZmllbGROYW1lKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkTmFtZX0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWNoZS1jbGVhciBob29rIHVzZWQgYnkgc2VsZWN0b3JzIChleHRlbnNpb24tc2VsZWN0b3IsIHNvdW5kLWZpbGUtc2VsZWN0b3IpLlxuICAgICAqXG4gICAgICogRm9tYW50aWMgVUkncyBhcGlTZXR0aW5ncyBjYWNoZSBoYXMgbm8gcHVibGljIHBlci1VUkwgaW52YWxpZGF0aW9uIEFQSS5cbiAgICAgKiBWaXNpYmxlIHJlbG9hZCBpcyBhY2hpZXZlZCBieSBjYWxsZXJzIHZpYSBjbGVhcihmaWVsZElkKSArIHNlbGVjdG9yLnJlZnJlc2goZmllbGRJZCksXG4gICAgICogd2hpY2ggcmVpbml0aWFsaXNlcyB0aGUgZHJvcGRvd24gYW5kIGZvcmNlcyBhIGZyZXNoIHJlbW90ZSBxdWVyeS4gVGhpcyBtZXRob2RcbiAgICAgKiBpcyBpbnRlbnRpb25hbGx5IGEgbm8tb3Agc28gdGhlIGNhbGwgc2l0ZXMgZG9uJ3QgVHlwZUVycm9yOyBkZWVwZXIgY2FjaGVcbiAgICAgKiBpbnZhbGlkYXRpb24gd291bGQgcmVxdWlyZSB0cmFja2luZyBpbnN0YW5jZXMgYnkgVVJMLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFwaVVybCAtIEFQSSBlbmRwb2ludCBVUkwgKGluZm9ybWF0aW9uYWwpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtwYXJhbXNdIC0gQ2FjaGUga2V5IHBhcmFtZXRlcnMgKGluZm9ybWF0aW9uYWwpXG4gICAgICovXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXVudXNlZC12YXJzXG4gICAgY2xlYXJDYWNoZUZvcihhcGlVcmwsIHBhcmFtcyA9IHt9KSB7XG4gICAgICAgIC8vIE5vLW9wIOKAlCBzZWUgbWV0aG9kIGNvbW1lbnQuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVzY2FwZSBIVE1MIHRvIHByZXZlbnQgWFNTXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUZXh0IHRvIGVzY2FwZVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEVzY2FwZWQgdGV4dFxuICAgICAqL1xuICAgIGVzY2FwZUh0bWwodGV4dCkge1xuICAgICAgICBjb25zdCBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgZGl2LnRleHRDb250ZW50ID0gdGV4dDtcbiAgICAgICAgcmV0dXJuIGRpdi5pbm5lckhUTUw7XG4gICAgfVxufTtcblxuLy8gRXhwb3J0IGZvciB1c2UgaW4gb3RoZXIgbW9kdWxlc1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBEeW5hbWljRHJvcGRvd25CdWlsZGVyO1xufSJdfQ==