"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global Config, SecurityUtils, PbxApi */

/**
 * ProvidersAPI - REST API v2 for providers management
 * 
 * Provides centralized API methods with built-in security features:
 * - Input sanitization for display
 * - XSS protection
 * - Consistent error handling
 * - CSRF protection through session cookies
 */
var ProvidersAPI = {
  /**
   * API endpoints configuration
   */
  endpoints: {
    getList: '/pbxcore/api/v2/providers/getList',
    getRecord: '/pbxcore/api/v2/providers/getRecord',
    saveRecord: '/pbxcore/api/v2/providers/saveRecord',
    deleteRecord: '/pbxcore/api/v2/providers/deleteRecord',
    getStatuses: '/pbxcore/api/v2/providers/getStatuses',
    updateStatus: '/pbxcore/api/v2/providers/updateStatus'
  },

  /**
   * Get record by ID with security processing
   * 
   * @param {string} id - Record ID or empty string for new
   * @param {string} type - Provider type (SIP or IAX)
   * @param {function} callback - Callback function
   */
  getRecord: function getRecord(id, type, callback) {
    var _this = this;

    // Check if this is a new record or existing
    var isNewRecord = !id || id === '' || id === 'new'; // Use RESTful URL with path parameters: /getRecord/SIP/SIP-TRUNK-123
    // Fall back to query parameters for 'new' records

    var url;

    if (isNewRecord) {
      // For new records, use query parameters
      url = this.endpoints.getRecord + (type ? '?type=' + type : '');
    } else {
      // For existing records, use RESTful path: /getRecord/SIP/SIP-TRUNK-123
      url = this.endpoints.getRecord + '/' + type + '/' + id;
    }

    $.api({
      url: url,
      method: 'GET',
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.result && response.data) {
          // Sanitize data for display
          response.data = _this.sanitizeProviderData(response.data);
        }

        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          messages: {
            error: ['Network error']
          }
        });
      }
    });
  },

  /**
   * Get list of all providers with security processing
   * 
   * @param {function} callback - Callback function
   */
  getList: function getList(callback) {
    var _this2 = this;

    $.api({
      url: this.endpoints.getList,
      method: 'GET',
      data: {
        includeDisabled: 'true' // Always include disabled providers in admin panel

      },
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.result && response.data) {
          // Sanitize array of providers
          response.data = response.data.map(function (item) {
            return this.sanitizeProviderData(item);
          }.bind(_this2));
        }

        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          data: []
        });
      }
    });
  },

  /**
   * Save provider record with validation and security
   * 
   * @param {object} data - Data to save
   * @param {function} callback - Callback function
   */
  saveRecord: function saveRecord(data, callback) {
    var _this3 = this;

    // Client-side validation
    if (!this.validateProviderData(data)) {
      callback({
        result: false,
        messages: {
          error: ['Client-side validation failed']
        }
      });
      return;
    } // Form.js with convertCheckboxesToBool=true sends all checkboxes as boolean values
    // Server accepts boolean values directly, no conversion needed


    var processedData = _objectSpread({}, data); // Use _method flag from Form.js if provided, otherwise fallback to ID-based detection


    var method = 'POST';

    if (processedData._method) {
      method = processedData._method;
      delete processedData._method; // Remove from data before sending
    } else if (processedData.id) {
      method = 'PUT';
    } // For POST (create), don't include ID in URL even if ID exists (pre-generated)
    // For PUT (update), include ID in URL


    var url = method === 'PUT' && processedData.id ? this.endpoints.saveRecord + '/' + processedData.id : this.endpoints.saveRecord;
    $.api({
      url: url,
      method: method,
      data: processedData,
      on: 'now',
      onSuccess: function onSuccess(response) {
        if (response.result && response.data) {
          response.data = _this3.sanitizeProviderData(response.data);
        }

        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          messages: {
            error: ['Network error']
          }
        });
      }
    });
  },

  /**
   * Delete provider record
   * 
   * @param {string} id - Record ID
   * @param {function} callback - Callback function
   */
  deleteRecord: function deleteRecord(id, callback) {
    $.api({
      url: this.endpoints.deleteRecord + '/' + id,
      on: 'now',
      method: 'DELETE',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Get provider statuses
   * 
   * @param {function} callback - Callback function
   */
  getStatuses: function getStatuses(callback) {
    $.api({
      url: this.endpoints.getStatuses,
      method: 'GET',
      on: 'now',
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          data: {}
        });
      }
    });
  },

  /**
   * Get status for a specific provider by ID
   * 
   * @param {string} providerId - Provider unique ID
   * @param {string} providerType - Provider type (SIP or IAX)
   * @param {function} callback - Callback function
   */
  getStatusById: function getStatusById(providerId, providerType, callback) {
    // Build URL with type if provided for better performance
    var url = '/pbxcore/api/v2/providers/getStatus/';

    if (providerType) {
      url += providerType.toUpperCase() + '/' + providerId;
    } else {
      url += providerId;
    }

    $.api({
      url: url,
      method: 'GET',
      on: 'now',
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          data: null
        });
      }
    });
  },

  /**
   * Update provider status (enable/disable)
   * 
   * @param {object} data - Data with id, type, and disabled status
   * @param {function} callback - Callback function
   */
  updateStatus: function updateStatus(data, callback) {
    // Validate required fields
    if (!data.id || !data.type) {
      callback({
        result: false,
        messages: {
          error: ['Provider ID and type are required']
        }
      });
      return;
    } // Convert data to proper format


    var updateData = {
      id: data.id,
      type: data.type.toUpperCase(),
      disabled: !!data.disabled
    };
    $.api({
      url: this.endpoints.updateStatus,
      method: 'POST',
      data: updateData,
      on: 'now',
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback({
          result: false,
          messages: {
            error: ['Network error']
          }
        });
      }
    });
  },

  /**
   * Sanitize provider data for secure display
   * 
   * @param {object} data - Provider data from API
   * @return {object} Data ready for display
   */
  sanitizeProviderData: function sanitizeProviderData(data) {
    if (!data) return data;
    var sanitized = {
      id: data.id,
      type: data.type || 'SIP',
      note: data.note || '',
      disabled: !!data.disabled
    }; // SIP-specific fields

    if (data.type === 'SIP') {
      Object.assign(sanitized, {
        username: data.username || '',
        secret: data.secret || '',
        host: data.host || '',
        port: parseInt(data.port) || 5060,
        transport: data.transport || 'UDP',
        qualify: !!data.qualify,
        qualifyfreq: parseInt(data.qualifyfreq) || 60,
        registration_type: data.registration_type || 'outbound',
        extension: data.extension || '',
        description: data.description || '',
        networkfilterid: data.networkfilterid || '',
        manualattributes: data.manualattributes || '',
        dtmfmode: data.dtmfmode || 'auto',
        nat: data.nat || 'auto_force',
        fromuser: data.fromuser || '',
        fromdomain: data.fromdomain || '',
        outbound_proxy: data.outbound_proxy || '',
        disablefromuser: !!data.disablefromuser,
        noregister: !!data.noregister,
        receive_calls_without_auth: !!data.receive_calls_without_auth,
        additionalHosts: data.additionalHosts || [],
        // CallerID/DID fields
        cid_source: data.cid_source || 'default',
        cid_custom_header: data.cid_custom_header || '',
        cid_parser_start: data.cid_parser_start || '',
        cid_parser_end: data.cid_parser_end || '',
        cid_parser_regex: data.cid_parser_regex || '',
        did_source: data.did_source || 'default',
        did_custom_header: data.did_custom_header || '',
        did_parser_start: data.did_parser_start || '',
        did_parser_end: data.did_parser_end || '',
        did_parser_regex: data.did_parser_regex || '',
        cid_did_debug: !!data.cid_did_debug
      });
    } // IAX-specific fields


    if (data.type === 'IAX') {
      Object.assign(sanitized, {
        username: data.username || '',
        secret: data.secret || '',
        host: data.host || '',
        qualify: !!data.qualify,
        registration_type: data.registration_type || 'none',
        description: data.description || '',
        manualattributes: data.manualattributes || '',
        noregister: !!data.noregister,
        networkfilterid: data.networkfilterid || '',
        port: data.port || '',
        receive_calls_without_auth: !!data.receive_calls_without_auth
      });
    }

    return sanitized;
  },

  /**
   * Client-side validation
   * 
   * @param {object} data - Data to validate
   * @return {boolean} Validation result
   */
  validateProviderData: function validateProviderData(data) {
    // Check if this is a status-only update (contains only id, type, disabled)
    var isStatusUpdate = data.id && data.type && data.hasOwnProperty('disabled') && Object.keys(data).length === 3;

    if (isStatusUpdate) {
      // Minimal validation for status updates
      return data.type && ['SIP', 'IAX'].includes(data.type);
    } // Type validation


    if (!data.type || !['SIP', 'IAX'].includes(data.type)) {
      return false;
    } // Username validation (alphanumeric and basic symbols)


    if (data.username && !/^[a-zA-Z0-9._-]*$/.test(data.username)) {
      return false;
    } // Host validation (domain or IP)


    if (data.host) {
      var hostPattern = /^([a-zA-Z0-9.-]+|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;

      if (!hostPattern.test(data.host)) {
        return false;
      }
    } // Port validation


    if (data.port !== undefined && data.port !== null && data.port !== '') {
      var port = parseInt(data.port);

      if (isNaN(port) || port < 1 || port > 65535) {
        return false;
      }
    } // Transport validation for SIP


    if (data.type === 'SIP' && data.transport) {
      if (!['UDP', 'TCP', 'TLS'].includes(data.transport)) {
        return false;
      }
    } // Extension validation (numeric only)


    if (data.extension && !/^[0-9]*$/.test(data.extension)) {
      return false;
    }

    return true;
  },

  /**
   * Get dropdown settings for provider selection - BACKWARD COMPATIBILITY
   * This method maintains compatibility with existing forms that use the old API
   * 
   * @param {function|object} onChangeCallback - Callback when selection changes OR options object
   * @param {object} options - Additional options (when first param is callback)
   * @return {object} Semantic UI dropdown settings object
   */
  getDropdownSettings: function getDropdownSettings(onChangeCallback, options) {
    // Handle different parameter combinations
    var callback = onChangeCallback;
    var settings = options || {}; // If first parameter is an object, treat it as options

    if (_typeof(onChangeCallback) === 'object' && onChangeCallback !== null) {
      settings = onChangeCallback;
      callback = settings.onChange;
    } // Default values


    var includeNone = settings.includeNone !== undefined ? settings.includeNone : true;
    var forceSelection = settings.forceSelection !== undefined ? settings.forceSelection : false;
    return {
      apiSettings: {
        // Use the new REST API v2 endpoint
        url: this.endpoints.getList,
        method: 'GET',
        cache: false,
        data: {
          includeDisabled: 'false' // Only show enabled providers in dropdowns

        },
        onResponse: function onResponse(response) {
          if (!response || !response.result || !response.data) {
            return {
              success: false,
              results: []
            };
          } // Transform API response to dropdown format


          var results = response.data.map(function (provider) {
            // Use the 'represent' field from server as-is, it already contains the icon
            // Server sends: "<i class=\"server icon\"></i> IAX: Test IAX Provider"
            return {
              value: provider.id,
              // Use id as the value (this is the provider ID)
              name: provider.represent,
              // Use server's represent field
              text: provider.represent,
              // Same for text display
              // Store additional data for future use
              providerType: provider.type,
              providerId: provider.id,
              host: provider.host || '',
              username: provider.username || ''
            };
          }); // Add 'None' option at the beginning only if includeNone is true

          if (includeNone) {
            results.unshift({
              value: 'none',
              name: globalTranslate.ir_AnyProvider_v2 || 'Any provider',
              text: globalTranslate.ir_AnyProvider_v2 || 'Any provider'
            });
          }

          return {
            success: true,
            results: results
          };
        }
      },
      ignoreCase: true,
      fullTextSearch: true,
      filterRemoteData: true,
      saveRemoteData: true,
      allowCategorySelection: false,
      forceSelection: forceSelection,
      // Use the forceSelection parameter
      hideDividers: 'empty',
      direction: 'downward',
      onChange: function onChange(value, text, $choice) {
        // Update hidden input fields for provider
        $('input[name="provider"], input[name="providerid"]').val(value).trigger('change'); // Call the provided callback if it exists

        if (typeof callback === 'function') {
          callback(value, text, $choice);
        }
      }
    };
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcHJvdmlkZXJzQVBJLmpzIl0sIm5hbWVzIjpbIlByb3ZpZGVyc0FQSSIsImVuZHBvaW50cyIsImdldExpc3QiLCJnZXRSZWNvcmQiLCJzYXZlUmVjb3JkIiwiZGVsZXRlUmVjb3JkIiwiZ2V0U3RhdHVzZXMiLCJ1cGRhdGVTdGF0dXMiLCJpZCIsInR5cGUiLCJjYWxsYmFjayIsImlzTmV3UmVjb3JkIiwidXJsIiwiJCIsImFwaSIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwic2FuaXRpemVQcm92aWRlckRhdGEiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsImluY2x1ZGVEaXNhYmxlZCIsIm1hcCIsIml0ZW0iLCJiaW5kIiwidmFsaWRhdGVQcm92aWRlckRhdGEiLCJwcm9jZXNzZWREYXRhIiwiX21ldGhvZCIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwiZ2V0U3RhdHVzQnlJZCIsInByb3ZpZGVySWQiLCJwcm92aWRlclR5cGUiLCJ0b1VwcGVyQ2FzZSIsInVwZGF0ZURhdGEiLCJkaXNhYmxlZCIsInNhbml0aXplZCIsIm5vdGUiLCJPYmplY3QiLCJhc3NpZ24iLCJ1c2VybmFtZSIsInNlY3JldCIsImhvc3QiLCJwb3J0IiwicGFyc2VJbnQiLCJ0cmFuc3BvcnQiLCJxdWFsaWZ5IiwicXVhbGlmeWZyZXEiLCJyZWdpc3RyYXRpb25fdHlwZSIsImV4dGVuc2lvbiIsImRlc2NyaXB0aW9uIiwibmV0d29ya2ZpbHRlcmlkIiwibWFudWFsYXR0cmlidXRlcyIsImR0bWZtb2RlIiwibmF0IiwiZnJvbXVzZXIiLCJmcm9tZG9tYWluIiwib3V0Ym91bmRfcHJveHkiLCJkaXNhYmxlZnJvbXVzZXIiLCJub3JlZ2lzdGVyIiwicmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgiLCJhZGRpdGlvbmFsSG9zdHMiLCJjaWRfc291cmNlIiwiY2lkX2N1c3RvbV9oZWFkZXIiLCJjaWRfcGFyc2VyX3N0YXJ0IiwiY2lkX3BhcnNlcl9lbmQiLCJjaWRfcGFyc2VyX3JlZ2V4IiwiZGlkX3NvdXJjZSIsImRpZF9jdXN0b21faGVhZGVyIiwiZGlkX3BhcnNlcl9zdGFydCIsImRpZF9wYXJzZXJfZW5kIiwiZGlkX3BhcnNlcl9yZWdleCIsImNpZF9kaWRfZGVidWciLCJpc1N0YXR1c1VwZGF0ZSIsImhhc093blByb3BlcnR5Iiwia2V5cyIsImxlbmd0aCIsImluY2x1ZGVzIiwidGVzdCIsImhvc3RQYXR0ZXJuIiwidW5kZWZpbmVkIiwiaXNOYU4iLCJnZXREcm9wZG93blNldHRpbmdzIiwib25DaGFuZ2VDYWxsYmFjayIsIm9wdGlvbnMiLCJzZXR0aW5ncyIsIm9uQ2hhbmdlIiwiaW5jbHVkZU5vbmUiLCJmb3JjZVNlbGVjdGlvbiIsImFwaVNldHRpbmdzIiwiY2FjaGUiLCJvblJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwcm92aWRlciIsInZhbHVlIiwibmFtZSIsInJlcHJlc2VudCIsInRleHQiLCJ1bnNoaWZ0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXJfQW55UHJvdmlkZXJfdjIiLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJhbGxvd0NhdGVnb3J5U2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwiZGlyZWN0aW9uIiwiJGNob2ljZSIsInZhbCIsInRyaWdnZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRTtBQUNQQyxJQUFBQSxPQUFPLEVBQUUsbUNBREY7QUFFUEMsSUFBQUEsU0FBUyxFQUFFLHFDQUZKO0FBR1BDLElBQUFBLFVBQVUsRUFBRSxzQ0FI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QXNCVyxPQUF0QixFQUErQjtBQUNyQztBQUNBckcsUUFBQUEsQ0FBQyxDQUFDLGtEQUFELENBQUQsQ0FBc0RzRyxHQUF0RCxDQUEwRGYsS0FBMUQsRUFBaUVnQixPQUFqRSxDQUF5RSxRQUF6RSxFQUZxQyxDQUlyQzs7QUFDQSxZQUFJLE9BQU8xRyxRQUFQLEtBQW9CLFVBQXhCLEVBQW9DO0FBQ2hDQSxVQUFBQSxRQUFRLENBQUMwRixLQUFELEVBQVFHLElBQVIsRUFBY1csT0FBZCxDQUFSO0FBQ0g7QUFDSjtBQWpFRSxLQUFQO0FBbUVIO0FBaGVnQixDQUFyQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBTZWN1cml0eVV0aWxzLCBQYnhBcGkgKi9cblxuLyoqXG4gKiBQcm92aWRlcnNBUEkgLSBSRVNUIEFQSSB2MiBmb3IgcHJvdmlkZXJzIG1hbmFnZW1lbnRcbiAqIFxuICogUHJvdmlkZXMgY2VudHJhbGl6ZWQgQVBJIG1ldGhvZHMgd2l0aCBidWlsdC1pbiBzZWN1cml0eSBmZWF0dXJlczpcbiAqIC0gSW5wdXQgc2FuaXRpemF0aW9uIGZvciBkaXNwbGF5XG4gKiAtIFhTUyBwcm90ZWN0aW9uXG4gKiAtIENvbnNpc3RlbnQgZXJyb3IgaGFuZGxpbmdcbiAqIC0gQ1NSRiBwcm90ZWN0aW9uIHRocm91Z2ggc2Vzc2lvbiBjb29raWVzXG4gKi9cbmNvbnN0IFByb3ZpZGVyc0FQSSA9IHtcbiAgICAvKipcbiAgICAgKiBBUEkgZW5kcG9pbnRzIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBlbmRwb2ludHM6IHtcbiAgICAgICAgZ2V0TGlzdDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0TGlzdCcsXG4gICAgICAgIGdldFJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0UmVjb3JkJyxcbiAgICAgICAgc2F2ZVJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvc2F2ZVJlY29yZCcsXG4gICAgICAgIGRlbGV0ZVJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZGVsZXRlUmVjb3JkJyxcbiAgICAgICAgZ2V0U3RhdHVzZXM6ICcvcGJ4Y29yZS9hcGkvdjIvcHJvdmlkZXJzL2dldFN0YXR1c2VzJyxcbiAgICAgICAgdXBkYXRlU3RhdHVzOiAnL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy91cGRhdGVTdGF0dXMnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIGJ5IElEIHdpdGggc2VjdXJpdHkgcHJvY2Vzc2luZ1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ld1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gUHJvdmlkZXIgdHlwZSAoU0lQIG9yIElBWClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UmVjb3JkOiBmdW5jdGlvbihpZCwgdHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgb3IgZXhpc3RpbmdcbiAgICAgICAgY29uc3QgaXNOZXdSZWNvcmQgPSAhaWQgfHwgaWQgPT09ICcnIHx8IGlkID09PSAnbmV3JztcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBSRVNUZnVsIFVSTCB3aXRoIHBhdGggcGFyYW1ldGVyczogL2dldFJlY29yZC9TSVAvU0lQLVRSVU5LLTEyM1xuICAgICAgICAvLyBGYWxsIGJhY2sgdG8gcXVlcnkgcGFyYW1ldGVycyBmb3IgJ25ldycgcmVjb3Jkc1xuICAgICAgICBsZXQgdXJsO1xuICAgICAgICBpZiAoaXNOZXdSZWNvcmQpIHtcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgdXNlIHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICAgICAgICAgIHVybCA9IHRoaXMuZW5kcG9pbnRzLmdldFJlY29yZCArICh0eXBlID8gJz90eXBlPScgKyB0eXBlIDogJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMsIHVzZSBSRVNUZnVsIHBhdGg6IC9nZXRSZWNvcmQvU0lQL1NJUC1UUlVOSy0xMjNcbiAgICAgICAgICAgIHVybCA9IHRoaXMuZW5kcG9pbnRzLmdldFJlY29yZCArICcvJyArIHR5cGUgKyAnLycgKyBpZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgZGF0YSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gdGhpcy5zYW5pdGl6ZVByb3ZpZGVyRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2YgYWxsIHByb3ZpZGVycyB3aXRoIHNlY3VyaXR5IHByb2Nlc3NpbmdcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0TGlzdDogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRMaXN0LFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBpbmNsdWRlRGlzYWJsZWQ6ICd0cnVlJyAgLy8gQWx3YXlzIGluY2x1ZGUgZGlzYWJsZWQgcHJvdmlkZXJzIGluIGFkbWluIHBhbmVsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgYXJyYXkgb2YgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEgPSByZXNwb25zZS5kYXRhLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zYW5pdGl6ZVByb3ZpZGVyRGF0YShpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YTogW119KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIHByb3ZpZGVyIHJlY29yZCB3aXRoIHZhbGlkYXRpb24gYW5kIHNlY3VyaXR5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNhdmVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgc2F2ZVJlY29yZDogZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAgICBpZiAoIXRoaXMudmFsaWRhdGVQcm92aWRlckRhdGEoZGF0YSkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ0NsaWVudC1zaWRlIHZhbGlkYXRpb24gZmFpbGVkJ119XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9ybS5qcyB3aXRoIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sPXRydWUgc2VuZHMgYWxsIGNoZWNrYm94ZXMgYXMgYm9vbGVhbiB2YWx1ZXNcbiAgICAgICAgLy8gU2VydmVyIGFjY2VwdHMgYm9vbGVhbiB2YWx1ZXMgZGlyZWN0bHksIG5vIGNvbnZlcnNpb24gbmVlZGVkXG4gICAgICAgIGNvbnN0IHByb2Nlc3NlZERhdGEgPSB7Li4uZGF0YX07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgX21ldGhvZCBmbGFnIGZyb20gRm9ybS5qcyBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIGZhbGxiYWNrIHRvIElELWJhc2VkIGRldGVjdGlvblxuICAgICAgICBsZXQgbWV0aG9kID0gJ1BPU1QnO1xuICAgICAgICBpZiAocHJvY2Vzc2VkRGF0YS5fbWV0aG9kKSB7XG4gICAgICAgICAgICBtZXRob2QgPSBwcm9jZXNzZWREYXRhLl9tZXRob2Q7XG4gICAgICAgICAgICBkZWxldGUgcHJvY2Vzc2VkRGF0YS5fbWV0aG9kOyAvLyBSZW1vdmUgZnJvbSBkYXRhIGJlZm9yZSBzZW5kaW5nXG4gICAgICAgIH0gZWxzZSBpZiAocHJvY2Vzc2VkRGF0YS5pZCkge1xuICAgICAgICAgICAgbWV0aG9kID0gJ1BVVCc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBQT1NUIChjcmVhdGUpLCBkb24ndCBpbmNsdWRlIElEIGluIFVSTCBldmVuIGlmIElEIGV4aXN0cyAocHJlLWdlbmVyYXRlZClcbiAgICAgICAgLy8gRm9yIFBVVCAodXBkYXRlKSwgaW5jbHVkZSBJRCBpbiBVUkxcbiAgICAgICAgY29uc3QgdXJsID0gbWV0aG9kID09PSAnUFVUJyAmJiBwcm9jZXNzZWREYXRhLmlkID8gXG4gICAgICAgICAgICB0aGlzLmVuZHBvaW50cy5zYXZlUmVjb3JkICsgJy8nICsgcHJvY2Vzc2VkRGF0YS5pZCA6IFxuICAgICAgICAgICAgdGhpcy5lbmRwb2ludHMuc2F2ZVJlY29yZDtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICBkYXRhOiBwcm9jZXNzZWREYXRhLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9IHRoaXMuc2FuaXRpemVQcm92aWRlckRhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBwcm92aWRlciByZWNvcmRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBSZWNvcmQgSURcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkOiBmdW5jdGlvbihpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5kZWxldGVSZWNvcmQgKyAnLycgKyBpZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcHJvdmlkZXIgc3RhdHVzZXNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0U3RhdHVzZXM6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMuZ2V0U3RhdHVzZXMsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiB7fX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzdGF0dXMgZm9yIGEgc3BlY2lmaWMgcHJvdmlkZXIgYnkgSURcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXJJZCAtIFByb3ZpZGVyIHVuaXF1ZSBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlclR5cGUgLSBQcm92aWRlciB0eXBlIChTSVAgb3IgSUFYKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRTdGF0dXNCeUlkOiBmdW5jdGlvbihwcm92aWRlcklkLCBwcm92aWRlclR5cGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIEJ1aWxkIFVSTCB3aXRoIHR5cGUgaWYgcHJvdmlkZWQgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuICAgICAgICBsZXQgdXJsID0gJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0U3RhdHVzLyc7XG4gICAgICAgIGlmIChwcm92aWRlclR5cGUpIHtcbiAgICAgICAgICAgIHVybCArPSBwcm92aWRlclR5cGUudG9VcHBlckNhc2UoKSArICcvJyArIHByb3ZpZGVySWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cmwgKz0gcHJvdmlkZXJJZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiBudWxsfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHByb3ZpZGVyIHN0YXR1cyAoZW5hYmxlL2Rpc2FibGUpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHdpdGggaWQsIHR5cGUsIGFuZCBkaXNhYmxlZCBzdGF0dXNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzOiBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICAgICAgaWYgKCFkYXRhLmlkIHx8ICFkYXRhLnR5cGUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ1Byb3ZpZGVyIElEIGFuZCB0eXBlIGFyZSByZXF1aXJlZCddfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgZGF0YSB0byBwcm9wZXIgZm9ybWF0XG4gICAgICAgIGNvbnN0IHVwZGF0ZURhdGEgPSB7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgICAgIHR5cGU6IGRhdGEudHlwZS50b1VwcGVyQ2FzZSgpLFxuICAgICAgICAgICAgZGlzYWJsZWQ6ICEhZGF0YS5kaXNhYmxlZFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy51cGRhdGVTdGF0dXMsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHVwZGF0ZURhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhbml0aXplIHByb3ZpZGVyIGRhdGEgZm9yIHNlY3VyZSBkaXNwbGF5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICogQHJldHVybiB7b2JqZWN0fSBEYXRhIHJlYWR5IGZvciBkaXNwbGF5XG4gICAgICovXG4gICAgc2FuaXRpemVQcm92aWRlckRhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgaWYgKCFkYXRhKSByZXR1cm4gZGF0YTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNhbml0aXplZCA9IHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgdHlwZTogZGF0YS50eXBlIHx8ICdTSVAnLFxuICAgICAgICAgICAgbm90ZTogZGF0YS5ub3RlIHx8ICcnLFxuICAgICAgICAgICAgZGlzYWJsZWQ6ICEhZGF0YS5kaXNhYmxlZFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gU0lQLXNwZWNpZmljIGZpZWxkc1xuICAgICAgICBpZiAoZGF0YS50eXBlID09PSAnU0lQJykge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihzYW5pdGl6ZWQsIHtcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogZGF0YS51c2VybmFtZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBzZWNyZXQ6IGRhdGEuc2VjcmV0IHx8ICcnLFxuICAgICAgICAgICAgICAgIGhvc3Q6IGRhdGEuaG9zdCB8fCAnJyxcbiAgICAgICAgICAgICAgICBwb3J0OiBwYXJzZUludChkYXRhLnBvcnQpIHx8IDUwNjAsXG4gICAgICAgICAgICAgICAgdHJhbnNwb3J0OiBkYXRhLnRyYW5zcG9ydCB8fCAnVURQJyxcbiAgICAgICAgICAgICAgICBxdWFsaWZ5OiAhIWRhdGEucXVhbGlmeSxcbiAgICAgICAgICAgICAgICBxdWFsaWZ5ZnJlcTogcGFyc2VJbnQoZGF0YS5xdWFsaWZ5ZnJlcSkgfHwgNjAsXG4gICAgICAgICAgICAgICAgcmVnaXN0cmF0aW9uX3R5cGU6IGRhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgJ291dGJvdW5kJyxcbiAgICAgICAgICAgICAgICBleHRlbnNpb246IGRhdGEuZXh0ZW5zaW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkYXRhLmRlc2NyaXB0aW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgIG5ldHdvcmtmaWx0ZXJpZDogZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJycsXG4gICAgICAgICAgICAgICAgbWFudWFsYXR0cmlidXRlczogZGF0YS5tYW51YWxhdHRyaWJ1dGVzIHx8ICcnLFxuICAgICAgICAgICAgICAgIGR0bWZtb2RlOiBkYXRhLmR0bWZtb2RlIHx8ICdhdXRvJyxcbiAgICAgICAgICAgICAgICBuYXQ6IGRhdGEubmF0IHx8ICdhdXRvX2ZvcmNlJyxcbiAgICAgICAgICAgICAgICBmcm9tdXNlcjogZGF0YS5mcm9tdXNlciB8fCAnJyxcbiAgICAgICAgICAgICAgICBmcm9tZG9tYWluOiBkYXRhLmZyb21kb21haW4gfHwgJycsXG4gICAgICAgICAgICAgICAgb3V0Ym91bmRfcHJveHk6IGRhdGEub3V0Ym91bmRfcHJveHkgfHwgJycsXG4gICAgICAgICAgICAgICAgZGlzYWJsZWZyb211c2VyOiAhIWRhdGEuZGlzYWJsZWZyb211c2VyLFxuICAgICAgICAgICAgICAgIG5vcmVnaXN0ZXI6ICEhZGF0YS5ub3JlZ2lzdGVyLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoOiAhIWRhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbEhvc3RzOiBkYXRhLmFkZGl0aW9uYWxIb3N0cyB8fCBbXSxcbiAgICAgICAgICAgICAgICAvLyBDYWxsZXJJRC9ESUQgZmllbGRzXG4gICAgICAgICAgICAgICAgY2lkX3NvdXJjZTogZGF0YS5jaWRfc291cmNlIHx8ICdkZWZhdWx0JyxcbiAgICAgICAgICAgICAgICBjaWRfY3VzdG9tX2hlYWRlcjogZGF0YS5jaWRfY3VzdG9tX2hlYWRlciB8fCAnJyxcbiAgICAgICAgICAgICAgICBjaWRfcGFyc2VyX3N0YXJ0OiBkYXRhLmNpZF9wYXJzZXJfc3RhcnQgfHwgJycsXG4gICAgICAgICAgICAgICAgY2lkX3BhcnNlcl9lbmQ6IGRhdGEuY2lkX3BhcnNlcl9lbmQgfHwgJycsXG4gICAgICAgICAgICAgICAgY2lkX3BhcnNlcl9yZWdleDogZGF0YS5jaWRfcGFyc2VyX3JlZ2V4IHx8ICcnLFxuICAgICAgICAgICAgICAgIGRpZF9zb3VyY2U6IGRhdGEuZGlkX3NvdXJjZSB8fCAnZGVmYXVsdCcsXG4gICAgICAgICAgICAgICAgZGlkX2N1c3RvbV9oZWFkZXI6IGRhdGEuZGlkX2N1c3RvbV9oZWFkZXIgfHwgJycsXG4gICAgICAgICAgICAgICAgZGlkX3BhcnNlcl9zdGFydDogZGF0YS5kaWRfcGFyc2VyX3N0YXJ0IHx8ICcnLFxuICAgICAgICAgICAgICAgIGRpZF9wYXJzZXJfZW5kOiBkYXRhLmRpZF9wYXJzZXJfZW5kIHx8ICcnLFxuICAgICAgICAgICAgICAgIGRpZF9wYXJzZXJfcmVnZXg6IGRhdGEuZGlkX3BhcnNlcl9yZWdleCB8fCAnJyxcbiAgICAgICAgICAgICAgICBjaWRfZGlkX2RlYnVnOiAhIWRhdGEuY2lkX2RpZF9kZWJ1Z1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgaWYgKGRhdGEudHlwZSA9PT0gJ0lBWCcpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oc2FuaXRpemVkLCB7XG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6IGRhdGEudXNlcm5hbWUgfHwgJycsXG4gICAgICAgICAgICAgICAgc2VjcmV0OiBkYXRhLnNlY3JldCB8fCAnJyxcbiAgICAgICAgICAgICAgICBob3N0OiBkYXRhLmhvc3QgfHwgJycsXG4gICAgICAgICAgICAgICAgcXVhbGlmeTogISFkYXRhLnF1YWxpZnksXG4gICAgICAgICAgICAgICAgcmVnaXN0cmF0aW9uX3R5cGU6IGRhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgJ25vbmUnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBkYXRhLmRlc2NyaXB0aW9uIHx8ICcnLFxuICAgICAgICAgICAgICAgIG1hbnVhbGF0dHJpYnV0ZXM6IGRhdGEubWFudWFsYXR0cmlidXRlcyB8fCAnJyxcbiAgICAgICAgICAgICAgICBub3JlZ2lzdGVyOiAhIWRhdGEubm9yZWdpc3RlcixcbiAgICAgICAgICAgICAgICBuZXR3b3JrZmlsdGVyaWQ6IGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICcnLFxuICAgICAgICAgICAgICAgIHBvcnQ6IGRhdGEucG9ydCB8fCAnJyxcbiAgICAgICAgICAgICAgICByZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aDogISFkYXRhLnJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHNhbml0aXplZDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsaWVudC1zaWRlIHZhbGlkYXRpb25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gdmFsaWRhdGVcbiAgICAgKiBAcmV0dXJuIHtib29sZWFufSBWYWxpZGF0aW9uIHJlc3VsdFxuICAgICAqL1xuICAgIHZhbGlkYXRlUHJvdmlkZXJEYXRhOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBzdGF0dXMtb25seSB1cGRhdGUgKGNvbnRhaW5zIG9ubHkgaWQsIHR5cGUsIGRpc2FibGVkKVxuICAgICAgICBjb25zdCBpc1N0YXR1c1VwZGF0ZSA9IGRhdGEuaWQgJiYgZGF0YS50eXBlICYmIGRhdGEuaGFzT3duUHJvcGVydHkoJ2Rpc2FibGVkJykgJiYgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhKS5sZW5ndGggPT09IDM7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNTdGF0dXNVcGRhdGUpIHtcbiAgICAgICAgICAgIC8vIE1pbmltYWwgdmFsaWRhdGlvbiBmb3Igc3RhdHVzIHVwZGF0ZXNcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnR5cGUgJiYgWydTSVAnLCAnSUFYJ10uaW5jbHVkZXMoZGF0YS50eXBlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVHlwZSB2YWxpZGF0aW9uXG4gICAgICAgIGlmICghZGF0YS50eXBlIHx8ICFbJ1NJUCcsICdJQVgnXS5pbmNsdWRlcyhkYXRhLnR5cGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZXJuYW1lIHZhbGlkYXRpb24gKGFscGhhbnVtZXJpYyBhbmQgYmFzaWMgc3ltYm9scylcbiAgICAgICAgaWYgKGRhdGEudXNlcm5hbWUgJiYgIS9eW2EtekEtWjAtOS5fLV0qJC8udGVzdChkYXRhLnVzZXJuYW1lKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIb3N0IHZhbGlkYXRpb24gKGRvbWFpbiBvciBJUClcbiAgICAgICAgaWYgKGRhdGEuaG9zdCkge1xuICAgICAgICAgICAgY29uc3QgaG9zdFBhdHRlcm4gPSAvXihbYS16QS1aMC05Li1dK3xcXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfSkkLztcbiAgICAgICAgICAgIGlmICghaG9zdFBhdHRlcm4udGVzdChkYXRhLmhvc3QpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBQb3J0IHZhbGlkYXRpb25cbiAgICAgICAgaWYgKGRhdGEucG9ydCAhPT0gdW5kZWZpbmVkICYmIGRhdGEucG9ydCAhPT0gbnVsbCAmJiBkYXRhLnBvcnQgIT09ICcnKSB7XG4gICAgICAgICAgICBjb25zdCBwb3J0ID0gcGFyc2VJbnQoZGF0YS5wb3J0KTtcbiAgICAgICAgICAgIGlmIChpc05hTihwb3J0KSB8fCBwb3J0IDwgMSB8fCBwb3J0ID4gNjU1MzUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFRyYW5zcG9ydCB2YWxpZGF0aW9uIGZvciBTSVBcbiAgICAgICAgaWYgKGRhdGEudHlwZSA9PT0gJ1NJUCcgJiYgZGF0YS50cmFuc3BvcnQpIHtcbiAgICAgICAgICAgIGlmICghWydVRFAnLCAnVENQJywgJ1RMUyddLmluY2x1ZGVzKGRhdGEudHJhbnNwb3J0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRXh0ZW5zaW9uIHZhbGlkYXRpb24gKG51bWVyaWMgb25seSlcbiAgICAgICAgaWYgKGRhdGEuZXh0ZW5zaW9uICYmICEvXlswLTldKiQvLnRlc3QoZGF0YS5leHRlbnNpb24pKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGRyb3Bkb3duIHNldHRpbmdzIGZvciBwcm92aWRlciBzZWxlY3Rpb24gLSBCQUNLV0FSRCBDT01QQVRJQklMSVRZXG4gICAgICogVGhpcyBtZXRob2QgbWFpbnRhaW5zIGNvbXBhdGliaWxpdHkgd2l0aCBleGlzdGluZyBmb3JtcyB0aGF0IHVzZSB0aGUgb2xkIEFQSVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb258b2JqZWN0fSBvbkNoYW5nZUNhbGxiYWNrIC0gQ2FsbGJhY2sgd2hlbiBzZWxlY3Rpb24gY2hhbmdlcyBPUiBvcHRpb25zIG9iamVjdFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQWRkaXRpb25hbCBvcHRpb25zICh3aGVuIGZpcnN0IHBhcmFtIGlzIGNhbGxiYWNrKVxuICAgICAqIEByZXR1cm4ge29iamVjdH0gU2VtYW50aWMgVUkgZHJvcGRvd24gc2V0dGluZ3Mgb2JqZWN0XG4gICAgICovXG4gICAgZ2V0RHJvcGRvd25TZXR0aW5nczogZnVuY3Rpb24ob25DaGFuZ2VDYWxsYmFjaywgb3B0aW9ucykge1xuICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IHBhcmFtZXRlciBjb21iaW5hdGlvbnNcbiAgICAgICAgbGV0IGNhbGxiYWNrID0gb25DaGFuZ2VDYWxsYmFjaztcbiAgICAgICAgbGV0IHNldHRpbmdzID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGZpcnN0IHBhcmFtZXRlciBpcyBhbiBvYmplY3QsIHRyZWF0IGl0IGFzIG9wdGlvbnNcbiAgICAgICAgaWYgKHR5cGVvZiBvbkNoYW5nZUNhbGxiYWNrID09PSAnb2JqZWN0JyAmJiBvbkNoYW5nZUNhbGxiYWNrICE9PSBudWxsKSB7XG4gICAgICAgICAgICBzZXR0aW5ncyA9IG9uQ2hhbmdlQ2FsbGJhY2s7XG4gICAgICAgICAgICBjYWxsYmFjayA9IHNldHRpbmdzLm9uQ2hhbmdlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEZWZhdWx0IHZhbHVlc1xuICAgICAgICBjb25zdCBpbmNsdWRlTm9uZSA9IHNldHRpbmdzLmluY2x1ZGVOb25lICE9PSB1bmRlZmluZWQgPyBzZXR0aW5ncy5pbmNsdWRlTm9uZSA6IHRydWU7XG4gICAgICAgIGNvbnN0IGZvcmNlU2VsZWN0aW9uID0gc2V0dGluZ3MuZm9yY2VTZWxlY3Rpb24gIT09IHVuZGVmaW5lZCA/IHNldHRpbmdzLmZvcmNlU2VsZWN0aW9uIDogZmFsc2U7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBhcGlTZXR0aW5nczoge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgbmV3IFJFU1QgQVBJIHYyIGVuZHBvaW50XG4gICAgICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRMaXN0LFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICAgICAgY2FjaGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgaW5jbHVkZURpc2FibGVkOiAnZmFsc2UnICAvLyBPbmx5IHNob3cgZW5hYmxlZCBwcm92aWRlcnMgaW4gZHJvcGRvd25zXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvblJlc3BvbnNlOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQgfHwgIXJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0czogW11cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyYW5zZm9ybSBBUEkgcmVzcG9uc2UgdG8gZHJvcGRvd24gZm9ybWF0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSByZXNwb25zZS5kYXRhLm1hcChmdW5jdGlvbihwcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNlIHRoZSAncmVwcmVzZW50JyBmaWVsZCBmcm9tIHNlcnZlciBhcy1pcywgaXQgYWxyZWFkeSBjb250YWlucyB0aGUgaWNvblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VydmVyIHNlbmRzOiBcIjxpIGNsYXNzPVxcXCJzZXJ2ZXIgaWNvblxcXCI+PC9pPiBJQVg6IFRlc3QgSUFYIFByb3ZpZGVyXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcHJvdmlkZXIuaWQsICAgICAgICAgICAvLyBVc2UgaWQgYXMgdGhlIHZhbHVlICh0aGlzIGlzIHRoZSBwcm92aWRlciBJRClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBwcm92aWRlci5yZXByZXNlbnQsICAgICAvLyBVc2Ugc2VydmVyJ3MgcmVwcmVzZW50IGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogcHJvdmlkZXIucmVwcmVzZW50LCAgICAgLy8gU2FtZSBmb3IgdGV4dCBkaXNwbGF5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgYWRkaXRpb25hbCBkYXRhIGZvciBmdXR1cmUgdXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJUeXBlOiBwcm92aWRlci50eXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3ZpZGVySWQ6IHByb3ZpZGVyLmlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3Q6IHByb3ZpZGVyLmhvc3QgfHwgJycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IHByb3ZpZGVyLnVzZXJuYW1lIHx8ICcnXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCAnTm9uZScgb3B0aW9uIGF0IHRoZSBiZWdpbm5pbmcgb25seSBpZiBpbmNsdWRlTm9uZSBpcyB0cnVlXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlTm9uZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy51bnNoaWZ0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJ25vbmUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGdsb2JhbFRyYW5zbGF0ZS5pcl9BbnlQcm92aWRlcl92MiB8fCAnQW55IHByb3ZpZGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuaXJfQW55UHJvdmlkZXJfdjIgfHwgJ0FueSBwcm92aWRlcidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IHJlc3VsdHNcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIHNhdmVSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgYWxsb3dDYXRlZ29yeVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZm9yY2VTZWxlY3Rpb24sICAvLyBVc2UgdGhlIGZvcmNlU2VsZWN0aW9uIHBhcmFtZXRlclxuICAgICAgICAgICAgaGlkZURpdmlkZXJzOiAnZW1wdHknLFxuICAgICAgICAgICAgZGlyZWN0aW9uOiAnZG93bndhcmQnLFxuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGhpZGRlbiBpbnB1dCBmaWVsZHMgZm9yIHByb3ZpZGVyXG4gICAgICAgICAgICAgICAgJCgnaW5wdXRbbmFtZT1cInByb3ZpZGVyXCJdLCBpbnB1dFtuYW1lPVwicHJvdmlkZXJpZFwiXScpLnZhbCh2YWx1ZSkudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2FsbCB0aGUgcHJvdmlkZWQgY2FsbGJhY2sgaWYgaXQgZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh2YWx1ZSwgdGV4dCwgJGNob2ljZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbn07Il19