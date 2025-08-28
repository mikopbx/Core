"use strict";

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

/* global $, globalTranslate, NetworkFiltersAPI, Form */

/**
 * NetworkFilterSelector - Universal component for network filter dropdown selection
 * 
 * Provides consistent network filter selection functionality across the application.
 * Works with simplified API that returns only 'value' and 'represent' fields.
 * 
 * Features:
 * - Automatic loading of network filters from REST API
 * - Support for various filter types (SIP, IAX, AMI, API)
 * - HTML rendering support (icons included in 'represent' field)
 * - Automatic form change tracking
 * - Loading state management
 * 
 * Quick Start Guide:
 * ==================
 * 
 * 1. Basic initialization:
 *    NetworkFilterSelector.init('#network-filter-dropdown', {
 *        filterType: 'SIP',
 *        currentValue: 'none'
 *    });
 * 
 * 2. With change handler:
 *    NetworkFilterSelector.init('#dropdown', {
 *        filterType: 'SIP',
 *        onChange: (value, text) => {
 *            console.log('Selected:', value);
 *        }
 *    });
 * 
 * 3. For provider forms (SIP/IAX):
 *    NetworkFilterSelector.init('#networkfilterid', {
 *        filterType: providerType === 'IAX' ? 'IAX' : 'SIP',
 *        currentValue: $('#networkfilterid').val()
 *    });
 * 
 * API Response Format:
 * ====================
 * {
 *   result: true,
 *   data: [
 *     { value: 'none', represent: '<i class="globe icon"></i> Allow from any address' },
 *     { value: '123', represent: '<i class="filter icon"></i> Office Network' }
 *   ]
 * }
 * 
 * Configuration Options:
 * ======================
 * @param {string} filterType - Type of filter: 'SIP', 'IAX', 'AMI', 'API' (default: 'SIP')
 * @param {string} currentValue - Current selected value (default: 'none')
 * @param {string} currentText - Current selected text for display
 * @param {boolean} includeNone - Include "None" option (default: true)
 * @param {Function} onChange - Callback on value change: (value, text, $item) => {}
 * @param {string} hiddenFieldId - ID of hidden field to sync (default: 'networkfilterid')
 * 
 * @module NetworkFilterSelector
 */
var NetworkFilterSelector = {
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
    filterType: 'SIP',
    // Default filter type
    includeNone: true,
    // Include "None" option
    forceSelection: false,
    // Force user to select a filter
    clearable: false,
    // Don't allow clearing selection
    fullTextSearch: true,
    // Enable full text search
    allowAdditions: false,
    // Don't allow custom values
    onChange: null,
    // Change callback function
    hiddenFieldId: 'networkfilterid',
    // ID of hidden field to update
    noneText: null,
    // Text for "None" option (auto-detected)
    noneValue: 'none',
    // Value for "None" option
    placeholder: null,
    // Placeholder text (auto-detected)
    currentValue: null,
    // Current selected value
    currentText: null // Current selected text

  },

  /**
   * Initialize network filter selector
   * 
   * @param {string|jQuery} selector - Dropdown selector or jQuery object
   * @param {object} options - Configuration options
   * @param {string} options.filterType - Type of filter ('SIP', 'IAX', 'AMI', 'API')
   * @param {string} options.currentValue - Current filter ID value
   * @param {string} options.currentText - Current filter display text
   * @param {boolean} options.includeNone - Include "None" option
   * @returns {object|null} Selector instance
   */
  init: function init(selector) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var $dropdown = $(selector);

    if ($dropdown.length === 0) {
      return null;
    } // Generate unique ID for instance


    var instanceId = $dropdown.attr('id') || Math.random().toString(36).substr(2, 9); // Check if already initialized

    if (this.instances.has(instanceId)) {
      var existingInstance = this.instances.get(instanceId); // Update config if new options provided

      if (options.currentValue !== undefined) {
        existingInstance.currentValue = options.currentValue;
      }

      if (options.currentText !== undefined) {
        existingInstance.currentText = options.currentText;
      } // If dropdown was destroyed, reinitialize it


      if (!$dropdown.hasClass('ui') || !$dropdown.hasClass('dropdown')) {
        this.initializeDropdown(existingInstance);
      }

      return existingInstance;
    } // Merge options with defaults


    var config = _objectSpread(_objectSpread({}, this.defaults), options); // Auto-detect texts based on context


    if (!config.noneText) {
      config.noneText = this.detectNoneText(config.filterType);
    }

    if (!config.placeholder) {
      config.placeholder = this.detectPlaceholder($dropdown, config.filterType);
    } // Create instance


    var instance = {
      id: instanceId,
      $dropdown: $dropdown,
      config: config,
      $hiddenField: $("#".concat(config.hiddenFieldId)),
      initialized: false,
      currentValue: config.currentValue || config.noneValue,
      currentText: config.currentText || null
    }; // Initialize dropdown

    this.initializeDropdown(instance); // Store instance

    this.instances.set(instanceId, instance);
    return instance;
  },

  /**
   * Detect appropriate "None" text based on filter type
   * 
   * @param {string} filterType - Type of filter
   * @returns {string} Detected text
   */
  detectNoneText: function detectNoneText(filterType) {
    // Use unified translation for all filter types
    // The server already provides correct translation via API
    return globalTranslate.ex_NoNetworkFilter || 'None';
  },

  /**
   * Detect appropriate placeholder text
   * 
   * @param {jQuery} $dropdown - Dropdown element
   * @param {string} filterType - Type of filter
   * @returns {string} Detected text
   */
  detectPlaceholder: function detectPlaceholder($dropdown, filterType) {
    // Check existing default text
    var $defaultText = $dropdown.find('.default.text');

    if ($defaultText.length > 0) {
      return $defaultText.text();
    }

    return this.detectNoneText(filterType);
  },

  /**
   * Initialize dropdown with network filter data
   * 
   * @param {object} instance - Selector instance
   */
  initializeDropdown: function initializeDropdown(instance) {
    var $dropdown = instance.$dropdown,
        config = instance.config,
        $hiddenField = instance.$hiddenField,
        currentValue = instance.currentValue,
        currentText = instance.currentText; // Check if dropdown is already initialized with Semantic UI

    var isInitialized = $dropdown.hasClass('ui') && $dropdown.hasClass('dropdown') && $dropdown.data('moduleDropdown') !== undefined;

    if (isInitialized) {
      // Just refresh the dropdown if already initialized
      $dropdown.dropdown('refresh'); // Update value if needed

      if (currentValue) {
        $dropdown.dropdown('set selected', currentValue, null, true);
      }

      return;
    } // Get dropdown settings from NetworkFiltersAPI


    var apiSettings = this.getDropdownSettings(instance); // Prepare dropdown settings

    var dropdownSettings = _objectSpread(_objectSpread({}, apiSettings), {}, {
      forceSelection: config.forceSelection,
      clearable: config.clearable,
      fullTextSearch: config.fullTextSearch,
      allowAdditions: config.allowAdditions,
      placeholder: config.placeholder,
      onChange: function onChange(value, text, $selectedItem) {
        // Update hidden field
        if ($hiddenField.length > 0) {
          $hiddenField.val(value).trigger('change');
        } // Call custom onChange if provided


        if (typeof config.onChange === 'function') {
          config.onChange(value, text, $selectedItem);
        } // Mark form as changed if Form object exists


        if (typeof Form !== 'undefined' && Form.dataChanged) {
          Form.dataChanged();
        }
      }
    }); // Clear any existing initialization only if needed


    if ($dropdown.data('moduleDropdown')) {
      $dropdown.dropdown('destroy');
    } // Initialize dropdown


    $dropdown.dropdown(_objectSpread(_objectSpread({}, dropdownSettings), {}, {
      apiSettings: _objectSpread(_objectSpread({}, dropdownSettings.apiSettings), {}, {
        cache: false,
        // No caching - always get fresh data
        throttle: 0 // Load immediately on interaction

      })
    })); // Pre-load data for immediate display

    this.preloadData(instance);
    instance.initialized = true;
  },

  /**
   * Preload data for dropdown
   * 
   * @param {object} instance - Selector instance
   */
  preloadData: function preloadData(instance) {
    var $dropdown = instance.$dropdown,
        config = instance.config,
        currentValue = instance.currentValue,
        currentText = instance.currentText;
    var filterCategories = [config.filterType]; // Show loading state

    $dropdown.addClass('loading'); // If we have current value and text, add it temporarily while loading

    if (currentValue && currentText) {
      var $menu = $dropdown.find('.menu');

      if ($menu.length === 0) {
        $dropdown.append('<div class="menu"></div>');
      } // Add current option temporarily


      $menu.html("<div class=\"item\" data-value=\"".concat(currentValue, "\">").concat(currentText, "</div>"));
      $dropdown.dropdown('refresh');
      $dropdown.dropdown('set selected', currentValue, null, true);
    } // Use unified API method for all filter types


    var apiMethod = NetworkFiltersAPI.getForSelect; // Load data from API

    apiMethod.call(NetworkFiltersAPI, function (data) {
      // Remove loading state
      $dropdown.removeClass('loading');

      if (data && Array.isArray(data)) {
        // Clear and populate options
        var _$menu = $dropdown.find('.menu');

        _$menu.empty(); // Add filter options from API (API already includes "none" option when needed)


        data.forEach(function (filter) {
          var value = filter.value;
          var text = filter.represent; // New API structure uses 'represent' field
          // Add item with HTML from represent field

          _$menu.append("<div class=\"item\" data-value=\"".concat(value, "\">").concat(text, "</div>"));
        }); // Refresh dropdown

        $dropdown.dropdown('refresh'); // Set selected value if exists

        if (currentValue) {
          // Find the item with current value
          var $item = $dropdown.find(".item[data-value=\"".concat(currentValue, "\"]"));

          if ($item.length > 0) {
            // Set selected without triggering onChange
            $dropdown.dropdown('set selected', currentValue, null, true);
          } else if (currentValue && currentText) {
            // If value not found in loaded data but we have text, add it
            _$menu.append("<div class=\"item\" data-value=\"".concat(currentValue, "\">").concat(currentText, "</div>"));

            $dropdown.dropdown('refresh');
            $dropdown.dropdown('set selected', currentValue, null, true);
          } else if (config.includeNone) {
            // If value not found, fall back to none
            $dropdown.dropdown('set selected', config.noneValue, null, true);
          }
        }
      } else {
        // Fallback - keep current value if we have it
        var _$menu2 = $dropdown.find('.menu');

        if (currentValue && currentText) {
          _$menu2.html("<div class=\"item\" data-value=\"".concat(currentValue, "\">").concat(currentText, "</div>"));
        } else if (config.includeNone) {
          _$menu2.empty().append("<div class=\"item\" data-value=\"".concat(config.noneValue, "\">").concat(config.noneText, "</div>"));
        }

        $dropdown.dropdown('refresh');
        $dropdown.dropdown('set selected', currentValue || config.noneValue, null, true);
      }
    }, filterCategories);
  },

  /**
   * Get dropdown settings for API integration
   * 
   * @param {object} instance - Selector instance
   * @returns {object} Dropdown API settings
   */
  getDropdownSettings: function getDropdownSettings(instance) {
    var config = instance.config;
    var filterCategories = [config.filterType]; // Use unified API endpoint for all filter types

    var apiUrl = '/pbxcore/api/v2/network-filters/getForSelect';
    var apiMethod = 'GET';
    return {
      apiSettings: {
        url: apiUrl,
        method: apiMethod,
        cache: false,
        data: {
          categories: filterCategories
        },
        beforeSend: function beforeSend(settings) {
          return settings;
        },
        onResponse: function onResponse(response) {
          if (!response || !response.result || !response.data) {
            return {
              success: false,
              results: []
            };
          }

          var results = []; // API already includes properly formatted options with icons
          // Simply map the response data to dropdown format

          if (Array.isArray(response.data)) {
            response.data.forEach(function (filter) {
              results.push({
                value: filter.value,
                name: filter.represent,
                text: filter.represent
              });
            });
          }

          return {
            success: true,
            results: results
          };
        }
      }
    };
  },

  /**
   * Refresh network filter list for a selector
   * 
   * @param {string} instanceId - Instance ID
   */
  refresh: function refresh(instanceId) {
    var instance = this.instances.get(instanceId);

    if (!instance) {
      return;
    } // Clear cache and reinitialize


    instance.$dropdown.dropdown('clear');
    this.initializeDropdown(instance);
  },

  /**
   * Set value for a selector
   * 
   * @param {string} instanceId - Instance ID
   * @param {string} value - Network filter ID to select
   * @param {string} text - Optional display text
   */
  setValue: function setValue(instanceId, value) {
    var text = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var instance = this.instances.get(instanceId);

    if (!instance) {
      return;
    } // Update instance values


    instance.currentValue = value;

    if (text) {
      instance.currentText = text;
    } // Check if dropdown has this value in menu


    var $item = instance.$dropdown.find(".menu .item[data-value=\"".concat(value, "\"]"));

    if ($item.length === 0 && text) {
      // If item doesn't exist and we have text, add it
      var $menu = instance.$dropdown.find('.menu');
      $menu.append("<div class=\"item\" data-value=\"".concat(value, "\">").concat(text, "</div>"));
      instance.$dropdown.dropdown('refresh');
    }

    instance.$dropdown.dropdown('set selected', value);

    if (instance.$hiddenField.length > 0) {
      instance.$hiddenField.val(value).trigger('change');
    }
  },

  /**
   * Set value for a selector silently without triggering onChange callbacks
   * 
   * @param {string} instanceId - Instance ID
   * @param {string} value - Network filter ID to select
   * @param {string} text - Optional display text
   */
  setValueSilently: function setValueSilently(instanceId, value) {
    var text = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var instance = this.instances.get(instanceId);

    if (!instance) {
      return;
    } // Update instance values


    instance.currentValue = value;

    if (text) {
      instance.currentText = text;
    } // Check if dropdown has this value in menu


    var $item = instance.$dropdown.find(".menu .item[data-value=\"".concat(value, "\"]"));

    if ($item.length === 0 && text) {
      // If item doesn't exist and we have text, add it
      var $menu = instance.$dropdown.find('.menu');
      $menu.append("<div class=\"item\" data-value=\"".concat(value, "\">").concat(text, "</div>"));
      instance.$dropdown.dropdown('refresh');
    } // Use built-in Semantic UI preventChangeTrigger parameter


    instance.$dropdown.dropdown('set selected', value, true); // value, preventChangeTrigger=true

    if (instance.$hiddenField.length > 0) {
      // Update hidden field without triggering change event
      instance.$hiddenField.val(value);
    } // Force sync visual state after a short delay


    setTimeout(function () {
      var currentValue = instance.$hiddenField.val();

      if (currentValue !== value) {
        // Sync dropdown visual state with hidden field value
        instance.$dropdown.dropdown('set selected', currentValue, true);
      }
    }, 150);
  },

  /**
   * Get value from a selector
   * 
   * @param {string} instanceId - Instance ID
   * @returns {string|null} Selected network filter ID
   */
  getValue: function getValue(instanceId) {
    var instance = this.instances.get(instanceId);

    if (!instance) {
      return null;
    }

    return instance.$dropdown.dropdown('get value') || null;
  },

  /**
   * Clear selection
   * 
   * @param {string} instanceId - Instance ID
   */
  clear: function clear(instanceId) {
    var instance = this.instances.get(instanceId);

    if (!instance) {
      return;
    }

    instance.$dropdown.dropdown('clear');

    if (instance.$hiddenField.length > 0) {
      instance.$hiddenField.val('').trigger('change');
    }
  },

  /**
   * Destroy selector instance
   * 
   * @param {string} instanceId - Instance ID
   */
  destroy: function destroy(instanceId) {
    var instance = this.instances.get(instanceId);

    if (!instance) {
      return;
    }

    instance.$dropdown.dropdown('destroy');
    this.instances["delete"](instanceId);
  },

  /**
   * Initialize all network filter selectors on the page
   * 
   * @param {string} containerSelector - Container to search within
   */
  initializeAll: function initializeAll() {
    var _this = this;

    var containerSelector = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'body';
    var $container = $(containerSelector); // Find all network filter dropdowns

    $container.find('.network-filter-select').each(function (index, element) {
      var $dropdown = $(element); // Skip if already initialized

      if ($dropdown.data('network-filter-selector-initialized')) {
        return;
      } // Detect filter type from context


      var filterType = 'SIP'; // Default

      var formId = $dropdown.closest('form').attr('id');

      if (formId) {
        if (formId.includes('extension')) {
          filterType = 'SIP';
        } else if (formId.includes('provider')) {
          // Provider type needs to be determined from provider type field
          filterType = 'SIP'; // Will be overridden in provider-specific code
        } else if (formId.includes('manager')) {
          filterType = 'AMI';
        } else if (formId.includes('api-key')) {
          filterType = 'API';
        }
      } // Initialize with detected settings
      // Hidden field ID is always 'networkfilterid'


      _this.init($dropdown, {
        filterType: filterType,
        hiddenFieldId: 'networkfilterid'
      }); // Mark as initialized


      $dropdown.data('network-filter-selector-initialized', true);
    });
  }
}; // Export for use in other modules

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NetworkFilterSelector;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvbmV0d29yay1maWx0ZXItc2VsZWN0b3IuanMiXSwibmFtZXMiOlsiTmV0d29ya0ZpbHRlclNlbGVjdG9yIiwiaW5zdGFuY2VzIiwiTWFwIiwiZGVmYXVsdHMiLCJmaWx0ZXJUeXBlIiwiaW5jbHVkZU5vbmUiLCJmb3JjZVNlbGVjdGlvbiIsImNsZWFyYWJsZSIsImZ1bGxUZXh0U2VhcmNoIiwiYWxsb3dBZGRpdGlvbnMiLCJvbkNoYW5nZSIsImhpZGRlbkZpZWxkSWQiLCJub25lVGV4dCIsIm5vbmVWYWx1ZSIsInBsYWNlaG9sZGVyIiwiY3VycmVudFZhbHVlIiwiY3VycmVudFRleHQiLCJpbml0Iiwic2VsZWN0b3IiLCJvcHRpb25zIiwiJGRyb3Bkb3duIiwiJCIsImxlbmd0aCIsImluc3RhbmNlSWQiLCJhdHRyIiwiTWF0aCIsInJhbmRvbSIsInRvU3RyaW5nIiwic3Vic3RyIiwiaGFzIiwiZXhpc3RpbmdJbnN0YW5jZSIsImdldCIsInVuZGVmaW5lZCIsImhhc0NsYXNzIiwiaW5pdGlhbGl6ZURyb3Bkb3duIiwiY29uZmlnIiwiZGV0ZWN0Tm9uZVRleHQiLCJkZXRlY3RQbGFjZWhvbGRlciIsImluc3RhbmNlIiwiaWQiLCIkaGlkZGVuRmllbGQiLCJpbml0aWFsaXplZCIsInNldCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X05vTmV0d29ya0ZpbHRlciIsIiRkZWZhdWx0VGV4dCIsImZpbmQiLCJ0ZXh0IiwiaXNJbml0aWFsaXplZCIsImRhdGEiLCJkcm9wZG93biIsImFwaVNldHRpbmdzIiwiZ2V0RHJvcGRvd25TZXR0aW5ncyIsImRyb3Bkb3duU2V0dGluZ3MiLCJ2YWx1ZSIsIiRzZWxlY3RlZEl0ZW0iLCJ2YWwiLCJ0cmlnZ2VyIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiY2FjaGUiLCJ0aHJvdHRsZSIsInByZWxvYWREYXRhIiwiZmlsdGVyQ2F0ZWdvcmllcyIsImFkZENsYXNzIiwiJG1lbnUiLCJhcHBlbmQiLCJodG1sIiwiYXBpTWV0aG9kIiwiTmV0d29ya0ZpbHRlcnNBUEkiLCJnZXRGb3JTZWxlY3QiLCJjYWxsIiwicmVtb3ZlQ2xhc3MiLCJBcnJheSIsImlzQXJyYXkiLCJlbXB0eSIsImZvckVhY2giLCJmaWx0ZXIiLCJyZXByZXNlbnQiLCIkaXRlbSIsImFwaVVybCIsInVybCIsIm1ldGhvZCIsImNhdGVnb3JpZXMiLCJiZWZvcmVTZW5kIiwic2V0dGluZ3MiLCJvblJlc3BvbnNlIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJzdWNjZXNzIiwicmVzdWx0cyIsInB1c2giLCJuYW1lIiwicmVmcmVzaCIsInNldFZhbHVlIiwic2V0VmFsdWVTaWxlbnRseSIsInNldFRpbWVvdXQiLCJnZXRWYWx1ZSIsImNsZWFyIiwiZGVzdHJveSIsImluaXRpYWxpemVBbGwiLCJjb250YWluZXJTZWxlY3RvciIsIiRjb250YWluZXIiLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiZm9ybUlkIiwiY2xvc2VzdCIsImluY2x1ZGVzIiwibW9kdWxlIiwiZXhwb3J0cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHFCQUFxQixHQUFHO0FBRTFC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QWdDL0Q7OztBQUNBUyxNQUFBQSxTQUFTLENBQUM2QixJQUFWLENBQWUscUNBQWYsRUFBc0QsSUFBdEQ7QUFDSCxLQWxDRDtBQW1DSDtBQTNnQnlCLENBQTlCLEMsQ0E4Z0JBOztBQUNBLElBQUksT0FBTzRELE1BQVAsS0FBa0IsV0FBbEIsSUFBaUNBLE1BQU0sQ0FBQ0MsT0FBNUMsRUFBcUQ7QUFDakRELEVBQUFBLE1BQU0sQ0FBQ0MsT0FBUCxHQUFpQjlHLHFCQUFqQjtBQUNIIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIGdsb2JhbFRyYW5zbGF0ZSwgTmV0d29ya0ZpbHRlcnNBUEksIEZvcm0gKi9cblxuLyoqXG4gKiBOZXR3b3JrRmlsdGVyU2VsZWN0b3IgLSBVbml2ZXJzYWwgY29tcG9uZW50IGZvciBuZXR3b3JrIGZpbHRlciBkcm9wZG93biBzZWxlY3Rpb25cbiAqIFxuICogUHJvdmlkZXMgY29uc2lzdGVudCBuZXR3b3JrIGZpbHRlciBzZWxlY3Rpb24gZnVuY3Rpb25hbGl0eSBhY3Jvc3MgdGhlIGFwcGxpY2F0aW9uLlxuICogV29ya3Mgd2l0aCBzaW1wbGlmaWVkIEFQSSB0aGF0IHJldHVybnMgb25seSAndmFsdWUnIGFuZCAncmVwcmVzZW50JyBmaWVsZHMuXG4gKiBcbiAqIEZlYXR1cmVzOlxuICogLSBBdXRvbWF0aWMgbG9hZGluZyBvZiBuZXR3b3JrIGZpbHRlcnMgZnJvbSBSRVNUIEFQSVxuICogLSBTdXBwb3J0IGZvciB2YXJpb3VzIGZpbHRlciB0eXBlcyAoU0lQLCBJQVgsIEFNSSwgQVBJKVxuICogLSBIVE1MIHJlbmRlcmluZyBzdXBwb3J0IChpY29ucyBpbmNsdWRlZCBpbiAncmVwcmVzZW50JyBmaWVsZClcbiAqIC0gQXV0b21hdGljIGZvcm0gY2hhbmdlIHRyYWNraW5nXG4gKiAtIExvYWRpbmcgc3RhdGUgbWFuYWdlbWVudFxuICogXG4gKiBRdWljayBTdGFydCBHdWlkZTpcbiAqID09PT09PT09PT09PT09PT09PVxuICogXG4gKiAxLiBCYXNpYyBpbml0aWFsaXphdGlvbjpcbiAqICAgIE5ldHdvcmtGaWx0ZXJTZWxlY3Rvci5pbml0KCcjbmV0d29yay1maWx0ZXItZHJvcGRvd24nLCB7XG4gKiAgICAgICAgZmlsdGVyVHlwZTogJ1NJUCcsXG4gKiAgICAgICAgY3VycmVudFZhbHVlOiAnbm9uZSdcbiAqICAgIH0pO1xuICogXG4gKiAyLiBXaXRoIGNoYW5nZSBoYW5kbGVyOlxuICogICAgTmV0d29ya0ZpbHRlclNlbGVjdG9yLmluaXQoJyNkcm9wZG93bicsIHtcbiAqICAgICAgICBmaWx0ZXJUeXBlOiAnU0lQJyxcbiAqICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0KSA9PiB7XG4gKiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTZWxlY3RlZDonLCB2YWx1ZSk7XG4gKiAgICAgICAgfVxuICogICAgfSk7XG4gKiBcbiAqIDMuIEZvciBwcm92aWRlciBmb3JtcyAoU0lQL0lBWCk6XG4gKiAgICBOZXR3b3JrRmlsdGVyU2VsZWN0b3IuaW5pdCgnI25ldHdvcmtmaWx0ZXJpZCcsIHtcbiAqICAgICAgICBmaWx0ZXJUeXBlOiBwcm92aWRlclR5cGUgPT09ICdJQVgnID8gJ0lBWCcgOiAnU0lQJyxcbiAqICAgICAgICBjdXJyZW50VmFsdWU6ICQoJyNuZXR3b3JrZmlsdGVyaWQnKS52YWwoKVxuICogICAgfSk7XG4gKiBcbiAqIEFQSSBSZXNwb25zZSBGb3JtYXQ6XG4gKiA9PT09PT09PT09PT09PT09PT09PVxuICoge1xuICogICByZXN1bHQ6IHRydWUsXG4gKiAgIGRhdGE6IFtcbiAqICAgICB7IHZhbHVlOiAnbm9uZScsIHJlcHJlc2VudDogJzxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4gQWxsb3cgZnJvbSBhbnkgYWRkcmVzcycgfSxcbiAqICAgICB7IHZhbHVlOiAnMTIzJywgcmVwcmVzZW50OiAnPGkgY2xhc3M9XCJmaWx0ZXIgaWNvblwiPjwvaT4gT2ZmaWNlIE5ldHdvcmsnIH1cbiAqICAgXVxuICogfVxuICogXG4gKiBDb25maWd1cmF0aW9uIE9wdGlvbnM6XG4gKiA9PT09PT09PT09PT09PT09PT09PT09XG4gKiBAcGFyYW0ge3N0cmluZ30gZmlsdGVyVHlwZSAtIFR5cGUgb2YgZmlsdGVyOiAnU0lQJywgJ0lBWCcsICdBTUknLCAnQVBJJyAoZGVmYXVsdDogJ1NJUCcpXG4gKiBAcGFyYW0ge3N0cmluZ30gY3VycmVudFZhbHVlIC0gQ3VycmVudCBzZWxlY3RlZCB2YWx1ZSAoZGVmYXVsdDogJ25vbmUnKVxuICogQHBhcmFtIHtzdHJpbmd9IGN1cnJlbnRUZXh0IC0gQ3VycmVudCBzZWxlY3RlZCB0ZXh0IGZvciBkaXNwbGF5XG4gKiBAcGFyYW0ge2Jvb2xlYW59IGluY2x1ZGVOb25lIC0gSW5jbHVkZSBcIk5vbmVcIiBvcHRpb24gKGRlZmF1bHQ6IHRydWUpXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvbkNoYW5nZSAtIENhbGxiYWNrIG9uIHZhbHVlIGNoYW5nZTogKHZhbHVlLCB0ZXh0LCAkaXRlbSkgPT4ge31cbiAqIEBwYXJhbSB7c3RyaW5nfSBoaWRkZW5GaWVsZElkIC0gSUQgb2YgaGlkZGVuIGZpZWxkIHRvIHN5bmMgKGRlZmF1bHQ6ICduZXR3b3JrZmlsdGVyaWQnKVxuICogXG4gKiBAbW9kdWxlIE5ldHdvcmtGaWx0ZXJTZWxlY3RvclxuICovXG5jb25zdCBOZXR3b3JrRmlsdGVyU2VsZWN0b3IgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogQWN0aXZlIHNlbGVjdG9yIGluc3RhbmNlc1xuICAgICAqIEB0eXBlIHtNYXB9XG4gICAgICovXG4gICAgaW5zdGFuY2VzOiBuZXcgTWFwKCksXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBkZWZhdWx0czoge1xuICAgICAgICBmaWx0ZXJUeXBlOiAnU0lQJywgICAgICAgIC8vIERlZmF1bHQgZmlsdGVyIHR5cGVcbiAgICAgICAgaW5jbHVkZU5vbmU6IHRydWUsICAgICAgICAvLyBJbmNsdWRlIFwiTm9uZVwiIG9wdGlvblxuICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsICAgIC8vIEZvcmNlIHVzZXIgdG8gc2VsZWN0IGEgZmlsdGVyXG4gICAgICAgIGNsZWFyYWJsZTogZmFsc2UsICAgICAgICAgLy8gRG9uJ3QgYWxsb3cgY2xlYXJpbmcgc2VsZWN0aW9uXG4gICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLCAgICAgLy8gRW5hYmxlIGZ1bGwgdGV4dCBzZWFyY2hcbiAgICAgICAgYWxsb3dBZGRpdGlvbnM6IGZhbHNlLCAgICAvLyBEb24ndCBhbGxvdyBjdXN0b20gdmFsdWVzXG4gICAgICAgIG9uQ2hhbmdlOiBudWxsLCAgICAgICAgICAgLy8gQ2hhbmdlIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICAgIGhpZGRlbkZpZWxkSWQ6ICduZXR3b3JrZmlsdGVyaWQnLCAvLyBJRCBvZiBoaWRkZW4gZmllbGQgdG8gdXBkYXRlXG4gICAgICAgIG5vbmVUZXh0OiBudWxsLCAgICAgICAgICAgLy8gVGV4dCBmb3IgXCJOb25lXCIgb3B0aW9uIChhdXRvLWRldGVjdGVkKVxuICAgICAgICBub25lVmFsdWU6ICdub25lJywgICAgICAgIC8vIFZhbHVlIGZvciBcIk5vbmVcIiBvcHRpb25cbiAgICAgICAgcGxhY2Vob2xkZXI6IG51bGwsICAgICAgICAvLyBQbGFjZWhvbGRlciB0ZXh0IChhdXRvLWRldGVjdGVkKVxuICAgICAgICBjdXJyZW50VmFsdWU6IG51bGwsICAgICAgIC8vIEN1cnJlbnQgc2VsZWN0ZWQgdmFsdWVcbiAgICAgICAgY3VycmVudFRleHQ6IG51bGwsICAgICAgICAvLyBDdXJyZW50IHNlbGVjdGVkIHRleHRcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbmV0d29yayBmaWx0ZXIgc2VsZWN0b3JcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xqUXVlcnl9IHNlbGVjdG9yIC0gRHJvcGRvd24gc2VsZWN0b3Igb3IgalF1ZXJ5IG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG9wdGlvbnMuZmlsdGVyVHlwZSAtIFR5cGUgb2YgZmlsdGVyICgnU0lQJywgJ0lBWCcsICdBTUknLCAnQVBJJylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gb3B0aW9ucy5jdXJyZW50VmFsdWUgLSBDdXJyZW50IGZpbHRlciBJRCB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBvcHRpb25zLmN1cnJlbnRUZXh0IC0gQ3VycmVudCBmaWx0ZXIgZGlzcGxheSB0ZXh0XG4gICAgICogQHBhcmFtIHtib29sZWFufSBvcHRpb25zLmluY2x1ZGVOb25lIC0gSW5jbHVkZSBcIk5vbmVcIiBvcHRpb25cbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fG51bGx9IFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgaW5pdChzZWxlY3Rvciwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoc2VsZWN0b3IpO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdlbmVyYXRlIHVuaXF1ZSBJRCBmb3IgaW5zdGFuY2VcbiAgICAgICAgY29uc3QgaW5zdGFuY2VJZCA9ICRkcm9wZG93bi5hdHRyKCdpZCcpIHx8IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgaWYgKHRoaXMuaW5zdGFuY2VzLmhhcyhpbnN0YW5jZUlkKSkge1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdJbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZUlkKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBjb25maWcgaWYgbmV3IG9wdGlvbnMgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmN1cnJlbnRWYWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgZXhpc3RpbmdJbnN0YW5jZS5jdXJyZW50VmFsdWUgPSBvcHRpb25zLmN1cnJlbnRWYWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcHRpb25zLmN1cnJlbnRUZXh0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBleGlzdGluZ0luc3RhbmNlLmN1cnJlbnRUZXh0ID0gb3B0aW9ucy5jdXJyZW50VGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIElmIGRyb3Bkb3duIHdhcyBkZXN0cm95ZWQsIHJlaW5pdGlhbGl6ZSBpdFxuICAgICAgICAgICAgaWYgKCEkZHJvcGRvd24uaGFzQ2xhc3MoJ3VpJykgfHwgISRkcm9wZG93bi5oYXNDbGFzcygnZHJvcGRvd24nKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZURyb3Bkb3duKGV4aXN0aW5nSW5zdGFuY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGV4aXN0aW5nSW5zdGFuY2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE1lcmdlIG9wdGlvbnMgd2l0aCBkZWZhdWx0c1xuICAgICAgICBjb25zdCBjb25maWcgPSB7IC4uLnRoaXMuZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tZGV0ZWN0IHRleHRzIGJhc2VkIG9uIGNvbnRleHRcbiAgICAgICAgaWYgKCFjb25maWcubm9uZVRleHQpIHtcbiAgICAgICAgICAgIGNvbmZpZy5ub25lVGV4dCA9IHRoaXMuZGV0ZWN0Tm9uZVRleHQoY29uZmlnLmZpbHRlclR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghY29uZmlnLnBsYWNlaG9sZGVyKSB7XG4gICAgICAgICAgICBjb25maWcucGxhY2Vob2xkZXIgPSB0aGlzLmRldGVjdFBsYWNlaG9sZGVyKCRkcm9wZG93biwgY29uZmlnLmZpbHRlclR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2VcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB7XG4gICAgICAgICAgICBpZDogaW5zdGFuY2VJZCxcbiAgICAgICAgICAgICRkcm9wZG93bixcbiAgICAgICAgICAgIGNvbmZpZyxcbiAgICAgICAgICAgICRoaWRkZW5GaWVsZDogJChgIyR7Y29uZmlnLmhpZGRlbkZpZWxkSWR9YCksXG4gICAgICAgICAgICBpbml0aWFsaXplZDogZmFsc2UsXG4gICAgICAgICAgICBjdXJyZW50VmFsdWU6IGNvbmZpZy5jdXJyZW50VmFsdWUgfHwgY29uZmlnLm5vbmVWYWx1ZSxcbiAgICAgICAgICAgIGN1cnJlbnRUZXh0OiBjb25maWcuY3VycmVudFRleHQgfHwgbnVsbFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bihpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5zZXQoaW5zdGFuY2VJZCwgaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGV0ZWN0IGFwcHJvcHJpYXRlIFwiTm9uZVwiIHRleHQgYmFzZWQgb24gZmlsdGVyIHR5cGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsdGVyVHlwZSAtIFR5cGUgb2YgZmlsdGVyXG4gICAgICogQHJldHVybnMge3N0cmluZ30gRGV0ZWN0ZWQgdGV4dFxuICAgICAqL1xuICAgIGRldGVjdE5vbmVUZXh0KGZpbHRlclR5cGUpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgdHJhbnNsYXRpb24gZm9yIGFsbCBmaWx0ZXIgdHlwZXNcbiAgICAgICAgLy8gVGhlIHNlcnZlciBhbHJlYWR5IHByb3ZpZGVzIGNvcnJlY3QgdHJhbnNsYXRpb24gdmlhIEFQSVxuICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlLmV4X05vTmV0d29ya0ZpbHRlciB8fCAnTm9uZSc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXRlY3QgYXBwcm9wcmlhdGUgcGxhY2Vob2xkZXIgdGV4dFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkZHJvcGRvd24gLSBEcm9wZG93biBlbGVtZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbHRlclR5cGUgLSBUeXBlIG9mIGZpbHRlclxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IERldGVjdGVkIHRleHRcbiAgICAgKi9cbiAgICBkZXRlY3RQbGFjZWhvbGRlcigkZHJvcGRvd24sIGZpbHRlclR5cGUpIHtcbiAgICAgICAgLy8gQ2hlY2sgZXhpc3RpbmcgZGVmYXVsdCB0ZXh0XG4gICAgICAgIGNvbnN0ICRkZWZhdWx0VGV4dCA9ICRkcm9wZG93bi5maW5kKCcuZGVmYXVsdC50ZXh0Jyk7XG4gICAgICAgIGlmICgkZGVmYXVsdFRleHQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuICRkZWZhdWx0VGV4dC50ZXh0KCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuZGV0ZWN0Tm9uZVRleHQoZmlsdGVyVHlwZSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRyb3Bkb3duIHdpdGggbmV0d29yayBmaWx0ZXIgZGF0YVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURyb3Bkb3duKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGRyb3Bkb3duLCBjb25maWcsICRoaWRkZW5GaWVsZCwgY3VycmVudFZhbHVlLCBjdXJyZW50VGV4dCB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBpcyBhbHJlYWR5IGluaXRpYWxpemVkIHdpdGggU2VtYW50aWMgVUlcbiAgICAgICAgY29uc3QgaXNJbml0aWFsaXplZCA9ICRkcm9wZG93bi5oYXNDbGFzcygndWknKSAmJiAkZHJvcGRvd24uaGFzQ2xhc3MoJ2Ryb3Bkb3duJykgJiYgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kYXRhKCdtb2R1bGVEcm9wZG93bicpICE9PSB1bmRlZmluZWQ7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgLy8gSnVzdCByZWZyZXNoIHRoZSBkcm9wZG93biBpZiBhbHJlYWR5IGluaXRpYWxpemVkXG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB2YWx1ZSBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGN1cnJlbnRWYWx1ZSwgbnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBkcm9wZG93biBzZXR0aW5ncyBmcm9tIE5ldHdvcmtGaWx0ZXJzQVBJXG4gICAgICAgIGNvbnN0IGFwaVNldHRpbmdzID0gdGhpcy5nZXREcm9wZG93blNldHRpbmdzKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFByZXBhcmUgZHJvcGRvd24gc2V0dGluZ3NcbiAgICAgICAgY29uc3QgZHJvcGRvd25TZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIC4uLmFwaVNldHRpbmdzLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGNvbmZpZy5mb3JjZVNlbGVjdGlvbixcbiAgICAgICAgICAgIGNsZWFyYWJsZTogY29uZmlnLmNsZWFyYWJsZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiBjb25maWcuZnVsbFRleHRTZWFyY2gsXG4gICAgICAgICAgICBhbGxvd0FkZGl0aW9uczogY29uZmlnLmFsbG93QWRkaXRpb25zLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGNvbmZpZy5wbGFjZWhvbGRlcixcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQsICRzZWxlY3RlZEl0ZW0pID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGZpZWxkXG4gICAgICAgICAgICAgICAgaWYgKCRoaWRkZW5GaWVsZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICRoaWRkZW5GaWVsZC52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDYWxsIGN1c3RvbSBvbkNoYW5nZSBpZiBwcm92aWRlZFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9uQ2hhbmdlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5vbkNoYW5nZSh2YWx1ZSwgdGV4dCwgJHNlbGVjdGVkSXRlbSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIGlmIEZvcm0gb2JqZWN0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybSAhPT0gJ3VuZGVmaW5lZCcgJiYgRm9ybS5kYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIGluaXRpYWxpemF0aW9uIG9ubHkgaWYgbmVlZGVkXG4gICAgICAgIGlmICgkZHJvcGRvd24uZGF0YSgnbW9kdWxlRHJvcGRvd24nKSkge1xuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdkZXN0cm95Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIC4uLmRyb3Bkb3duU2V0dGluZ3MsXG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIC4uLmRyb3Bkb3duU2V0dGluZ3MuYXBpU2V0dGluZ3MsXG4gICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlLCAgLy8gTm8gY2FjaGluZyAtIGFsd2F5cyBnZXQgZnJlc2ggZGF0YVxuICAgICAgICAgICAgICAgIHRocm90dGxlOiAwICAgIC8vIExvYWQgaW1tZWRpYXRlbHkgb24gaW50ZXJhY3Rpb25cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBQcmUtbG9hZCBkYXRhIGZvciBpbW1lZGlhdGUgZGlzcGxheVxuICAgICAgICB0aGlzLnByZWxvYWREYXRhKGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIGluc3RhbmNlLmluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFByZWxvYWQgZGF0YSBmb3IgZHJvcGRvd25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIHByZWxvYWREYXRhKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgJGRyb3Bkb3duLCBjb25maWcsIGN1cnJlbnRWYWx1ZSwgY3VycmVudFRleHQgfSA9IGluc3RhbmNlO1xuICAgICAgICBjb25zdCBmaWx0ZXJDYXRlZ29yaWVzID0gW2NvbmZpZy5maWx0ZXJUeXBlXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkZHJvcGRvd24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIHdlIGhhdmUgY3VycmVudCB2YWx1ZSBhbmQgdGV4dCwgYWRkIGl0IHRlbXBvcmFyaWx5IHdoaWxlIGxvYWRpbmdcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAmJiBjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgICAgIGlmICgkbWVudS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAkZHJvcGRvd24uYXBwZW5kKCc8ZGl2IGNsYXNzPVwibWVudVwiPjwvZGl2PicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQWRkIGN1cnJlbnQgb3B0aW9uIHRlbXBvcmFyaWx5XG4gICAgICAgICAgICAkbWVudS5odG1sKGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIj4ke2N1cnJlbnRUZXh0fTwvZGl2PmApO1xuICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGN1cnJlbnRWYWx1ZSwgbnVsbCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIEFQSSBtZXRob2QgZm9yIGFsbCBmaWx0ZXIgdHlwZXNcbiAgICAgICAgY29uc3QgYXBpTWV0aG9kID0gTmV0d29ya0ZpbHRlcnNBUEkuZ2V0Rm9yU2VsZWN0O1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBkYXRhIGZyb20gQVBJXG4gICAgICAgIGFwaU1ldGhvZC5jYWxsKE5ldHdvcmtGaWx0ZXJzQVBJLCAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRkcm9wZG93bi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZGF0YSAmJiBBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgYW5kIHBvcHVsYXRlIG9wdGlvbnNcbiAgICAgICAgICAgICAgICBjb25zdCAkbWVudSA9ICRkcm9wZG93bi5maW5kKCcubWVudScpO1xuICAgICAgICAgICAgICAgICRtZW51LmVtcHR5KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIGZpbHRlciBvcHRpb25zIGZyb20gQVBJIChBUEkgYWxyZWFkeSBpbmNsdWRlcyBcIm5vbmVcIiBvcHRpb24gd2hlbiBuZWVkZWQpXG4gICAgICAgICAgICAgICAgZGF0YS5mb3JFYWNoKGZpbHRlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZmlsdGVyLnZhbHVlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gZmlsdGVyLnJlcHJlc2VudDsgLy8gTmV3IEFQSSBzdHJ1Y3R1cmUgdXNlcyAncmVwcmVzZW50JyBmaWVsZFxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGl0ZW0gd2l0aCBIVE1MIGZyb20gcmVwcmVzZW50IGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICRtZW51LmFwcGVuZChcbiAgICAgICAgICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke3ZhbHVlfVwiPiR7dGV4dH08L2Rpdj5gXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVmcmVzaCBkcm9wZG93blxuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBzZWxlY3RlZCB2YWx1ZSBpZiBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbmQgdGhlIGl0ZW0gd2l0aCBjdXJyZW50IHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRpdGVtID0gJGRyb3Bkb3duLmZpbmQoYC5pdGVtW2RhdGEtdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIl1gKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRpdGVtLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBzZWxlY3RlZCB3aXRob3V0IHRyaWdnZXJpbmcgb25DaGFuZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFZhbHVlLCBudWxsLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50VmFsdWUgJiYgY3VycmVudFRleHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIHZhbHVlIG5vdCBmb3VuZCBpbiBsb2FkZWQgZGF0YSBidXQgd2UgaGF2ZSB0ZXh0LCBhZGQgaXRcbiAgICAgICAgICAgICAgICAgICAgICAgICRtZW51LmFwcGVuZChgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtjdXJyZW50VmFsdWV9XCI+JHtjdXJyZW50VGV4dH08L2Rpdj5gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBjdXJyZW50VmFsdWUsIG51bGwsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbmZpZy5pbmNsdWRlTm9uZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgdmFsdWUgbm90IGZvdW5kLCBmYWxsIGJhY2sgdG8gbm9uZVxuICAgICAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBjb25maWcubm9uZVZhbHVlLCBudWxsLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgLSBrZWVwIGN1cnJlbnQgdmFsdWUgaWYgd2UgaGF2ZSBpdFxuICAgICAgICAgICAgICAgIGNvbnN0ICRtZW51ID0gJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAmJiBjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgICAgICAgICAkbWVudS5odG1sKGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIj4ke2N1cnJlbnRUZXh0fTwvZGl2PmApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29uZmlnLmluY2x1ZGVOb25lKSB7XG4gICAgICAgICAgICAgICAgICAgICRtZW51LmVtcHR5KCkuYXBwZW5kKFxuICAgICAgICAgICAgICAgICAgICAgICAgYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7Y29uZmlnLm5vbmVWYWx1ZX1cIj4ke2NvbmZpZy5ub25lVGV4dH08L2Rpdj5gXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgY3VycmVudFZhbHVlIHx8IGNvbmZpZy5ub25lVmFsdWUsIG51bGwsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBmaWx0ZXJDYXRlZ29yaWVzKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBkcm9wZG93biBzZXR0aW5ncyBmb3IgQVBJIGludGVncmF0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBEcm9wZG93biBBUEkgc2V0dGluZ3NcbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgY29uZmlnIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgY29uc3QgZmlsdGVyQ2F0ZWdvcmllcyA9IFtjb25maWcuZmlsdGVyVHlwZV07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgdW5pZmllZCBBUEkgZW5kcG9pbnQgZm9yIGFsbCBmaWx0ZXIgdHlwZXNcbiAgICAgICAgY29uc3QgYXBpVXJsID0gJy9wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0Rm9yU2VsZWN0JztcbiAgICAgICAgY29uc3QgYXBpTWV0aG9kID0gJ0dFVCc7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICB1cmw6IGFwaVVybCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6IGFwaU1ldGhvZCxcbiAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGF0YTogeyBjYXRlZ29yaWVzOiBmaWx0ZXJDYXRlZ29yaWVzIH0sXG4gICAgICAgICAgICAgICAgYmVmb3JlU2VuZDogZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNldHRpbmdzO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCB8fCAhcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzOiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQVBJIGFscmVhZHkgaW5jbHVkZXMgcHJvcGVybHkgZm9ybWF0dGVkIG9wdGlvbnMgd2l0aCBpY29uc1xuICAgICAgICAgICAgICAgICAgICAvLyBTaW1wbHkgbWFwIHRoZSByZXNwb25zZSBkYXRhIHRvIGRyb3Bkb3duIGZvcm1hdFxuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyZXNwb25zZS5kYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5mb3JFYWNoKGZpbHRlciA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGZpbHRlci52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogZmlsdGVyLnJlcHJlc2VudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogZmlsdGVyLnJlcHJlc2VudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0czogcmVzdWx0c1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggbmV0d29yayBmaWx0ZXIgbGlzdCBmb3IgYSBzZWxlY3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnN0YW5jZUlkIC0gSW5zdGFuY2UgSURcbiAgICAgKi9cbiAgICByZWZyZXNoKGluc3RhbmNlSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoaW5zdGFuY2VJZCk7XG4gICAgICAgIGlmICghaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgY2FjaGUgYW5kIHJlaW5pdGlhbGl6ZVxuICAgICAgICBpbnN0YW5jZS4kZHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURyb3Bkb3duKGluc3RhbmNlKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNldCB2YWx1ZSBmb3IgYSBzZWxlY3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnN0YW5jZUlkIC0gSW5zdGFuY2UgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBOZXR3b3JrIGZpbHRlciBJRCB0byBzZWxlY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIE9wdGlvbmFsIGRpc3BsYXkgdGV4dFxuICAgICAqL1xuICAgIHNldFZhbHVlKGluc3RhbmNlSWQsIHZhbHVlLCB0ZXh0ID0gbnVsbCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZUlkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2UgdmFsdWVzXG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICBpZiAodGV4dCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuY3VycmVudFRleHQgPSB0ZXh0O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBoYXMgdGhpcyB2YWx1ZSBpbiBtZW51XG4gICAgICAgIGNvbnN0ICRpdGVtID0gaW5zdGFuY2UuJGRyb3Bkb3duLmZpbmQoYC5tZW51IC5pdGVtW2RhdGEtdmFsdWU9XCIke3ZhbHVlfVwiXWApO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRpdGVtLmxlbmd0aCA9PT0gMCAmJiB0ZXh0KSB7XG4gICAgICAgICAgICAvLyBJZiBpdGVtIGRvZXNuJ3QgZXhpc3QgYW5kIHdlIGhhdmUgdGV4dCwgYWRkIGl0XG4gICAgICAgICAgICBjb25zdCAkbWVudSA9IGluc3RhbmNlLiRkcm9wZG93bi5maW5kKCcubWVudScpO1xuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGA8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCIke3ZhbHVlfVwiPiR7dGV4dH08L2Rpdj5gKTtcbiAgICAgICAgICAgIGluc3RhbmNlLiRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpbnN0YW5jZS4kZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHZhbHVlKTtcbiAgICAgICAgaWYgKGluc3RhbmNlLiRoaWRkZW5GaWVsZC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpbnN0YW5jZS4kaGlkZGVuRmllbGQudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgdmFsdWUgZm9yIGEgc2VsZWN0b3Igc2lsZW50bHkgd2l0aG91dCB0cmlnZ2VyaW5nIG9uQ2hhbmdlIGNhbGxiYWNrc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnN0YW5jZUlkIC0gSW5zdGFuY2UgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBOZXR3b3JrIGZpbHRlciBJRCB0byBzZWxlY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIE9wdGlvbmFsIGRpc3BsYXkgdGV4dFxuICAgICAqL1xuICAgIHNldFZhbHVlU2lsZW50bHkoaW5zdGFuY2VJZCwgdmFsdWUsIHRleHQgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBpbnN0YW5jZSB2YWx1ZXNcbiAgICAgICAgaW5zdGFuY2UuY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIGlmICh0ZXh0KSB7XG4gICAgICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGhhcyB0aGlzIHZhbHVlIGluIG1lbnVcbiAgICAgICAgY29uc3QgJGl0ZW0gPSBpbnN0YW5jZS4kZHJvcGRvd24uZmluZChgLm1lbnUgLml0ZW1bZGF0YS12YWx1ZT1cIiR7dmFsdWV9XCJdYCk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGl0ZW0ubGVuZ3RoID09PSAwICYmIHRleHQpIHtcbiAgICAgICAgICAgIC8vIElmIGl0ZW0gZG9lc24ndCBleGlzdCBhbmQgd2UgaGF2ZSB0ZXh0LCBhZGQgaXRcbiAgICAgICAgICAgIGNvbnN0ICRtZW51ID0gaW5zdGFuY2UuJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7dmFsdWV9XCI+JHt0ZXh0fTwvZGl2PmApO1xuICAgICAgICAgICAgaW5zdGFuY2UuJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBidWlsdC1pbiBTZW1hbnRpYyBVSSBwcmV2ZW50Q2hhbmdlVHJpZ2dlciBwYXJhbWV0ZXJcbiAgICAgICAgaW5zdGFuY2UuJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCB2YWx1ZSwgdHJ1ZSk7IC8vIHZhbHVlLCBwcmV2ZW50Q2hhbmdlVHJpZ2dlcj10cnVlXG4gICAgICAgIFxuICAgICAgICBpZiAoaW5zdGFuY2UuJGhpZGRlbkZpZWxkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gZmllbGQgd2l0aG91dCB0cmlnZ2VyaW5nIGNoYW5nZSBldmVudFxuICAgICAgICAgICAgaW5zdGFuY2UuJGhpZGRlbkZpZWxkLnZhbCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvcmNlIHN5bmMgdmlzdWFsIHN0YXRlIGFmdGVyIGEgc2hvcnQgZGVsYXlcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBpbnN0YW5jZS4kaGlkZGVuRmllbGQudmFsKCk7XG4gICAgICAgICAgICBpZiAoY3VycmVudFZhbHVlICE9PSB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIC8vIFN5bmMgZHJvcGRvd24gdmlzdWFsIHN0YXRlIHdpdGggaGlkZGVuIGZpZWxkIHZhbHVlXG4gICAgICAgICAgICAgICAgaW5zdGFuY2UuJGRyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBjdXJyZW50VmFsdWUsIHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxNTApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHZhbHVlIGZyb20gYSBzZWxlY3RvclxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnN0YW5jZUlkIC0gSW5zdGFuY2UgSURcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IFNlbGVjdGVkIG5ldHdvcmsgZmlsdGVyIElEXG4gICAgICovXG4gICAgZ2V0VmFsdWUoaW5zdGFuY2VJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZUlkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZS4kZHJvcGRvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpIHx8IG51bGw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciBzZWxlY3Rpb25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW5zdGFuY2VJZCAtIEluc3RhbmNlIElEXG4gICAgICovXG4gICAgY2xlYXIoaW5zdGFuY2VJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChpbnN0YW5jZUlkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpbnN0YW5jZS4kZHJvcGRvd24uZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgIGlmIChpbnN0YW5jZS4kaGlkZGVuRmllbGQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaW5zdGFuY2UuJGhpZGRlbkZpZWxkLnZhbCgnJykudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgc2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW5zdGFuY2VJZCAtIEluc3RhbmNlIElEXG4gICAgICovXG4gICAgZGVzdHJveShpbnN0YW5jZUlkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGluc3RhbmNlSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGluc3RhbmNlLiRkcm9wZG93bi5kcm9wZG93bignZGVzdHJveScpO1xuICAgICAgICB0aGlzLmluc3RhbmNlcy5kZWxldGUoaW5zdGFuY2VJZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCBuZXR3b3JrIGZpbHRlciBzZWxlY3RvcnMgb24gdGhlIHBhZ2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGFpbmVyU2VsZWN0b3IgLSBDb250YWluZXIgdG8gc2VhcmNoIHdpdGhpblxuICAgICAqL1xuICAgIGluaXRpYWxpemVBbGwoY29udGFpbmVyU2VsZWN0b3IgPSAnYm9keScpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICQoY29udGFpbmVyU2VsZWN0b3IpO1xuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBhbGwgbmV0d29yayBmaWx0ZXIgZHJvcGRvd25zXG4gICAgICAgICRjb250YWluZXIuZmluZCgnLm5ldHdvcmstZmlsdGVyLXNlbGVjdCcpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTa2lwIGlmIGFscmVhZHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIGlmICgkZHJvcGRvd24uZGF0YSgnbmV0d29yay1maWx0ZXItc2VsZWN0b3ItaW5pdGlhbGl6ZWQnKSkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRGV0ZWN0IGZpbHRlciB0eXBlIGZyb20gY29udGV4dFxuICAgICAgICAgICAgbGV0IGZpbHRlclR5cGUgPSAnU0lQJzsgLy8gRGVmYXVsdFxuICAgICAgICAgICAgY29uc3QgZm9ybUlkID0gJGRyb3Bkb3duLmNsb3Nlc3QoJ2Zvcm0nKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZm9ybUlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZvcm1JZC5pbmNsdWRlcygnZXh0ZW5zaW9uJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyVHlwZSA9ICdTSVAnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZm9ybUlkLmluY2x1ZGVzKCdwcm92aWRlcicpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFByb3ZpZGVyIHR5cGUgbmVlZHMgdG8gYmUgZGV0ZXJtaW5lZCBmcm9tIHByb3ZpZGVyIHR5cGUgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyVHlwZSA9ICdTSVAnOyAvLyBXaWxsIGJlIG92ZXJyaWRkZW4gaW4gcHJvdmlkZXItc3BlY2lmaWMgY29kZVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZm9ybUlkLmluY2x1ZGVzKCdtYW5hZ2VyJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyVHlwZSA9ICdBTUknO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZm9ybUlkLmluY2x1ZGVzKCdhcGkta2V5JykpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyVHlwZSA9ICdBUEknO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIGRldGVjdGVkIHNldHRpbmdzXG4gICAgICAgICAgICAvLyBIaWRkZW4gZmllbGQgSUQgaXMgYWx3YXlzICduZXR3b3JrZmlsdGVyaWQnXG4gICAgICAgICAgICB0aGlzLmluaXQoJGRyb3Bkb3duLCB7XG4gICAgICAgICAgICAgICAgZmlsdGVyVHlwZTogZmlsdGVyVHlwZSxcbiAgICAgICAgICAgICAgICBoaWRkZW5GaWVsZElkOiAnbmV0d29ya2ZpbHRlcmlkJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE1hcmsgYXMgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgICRkcm9wZG93bi5kYXRhKCduZXR3b3JrLWZpbHRlci1zZWxlY3Rvci1pbml0aWFsaXplZCcsIHRydWUpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IE5ldHdvcmtGaWx0ZXJTZWxlY3Rvcjtcbn0iXX0=