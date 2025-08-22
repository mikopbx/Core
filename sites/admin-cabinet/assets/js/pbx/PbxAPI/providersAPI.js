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
            // Use the 'name' field from server as-is, it already contains the icon
            // Server sends: "<i class=\"server icon\"></i> IAX: Test IAX Provider"
            return {
              value: provider.id,
              // Use id as the value
              name: provider.name,
              // Use server's name field as-is
              text: provider.name,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcHJvdmlkZXJzQVBJLmpzIl0sIm5hbWVzIjpbIlByb3ZpZGVyc0FQSSIsImVuZHBvaW50cyIsImdldExpc3QiLCJnZXRSZWNvcmQiLCJzYXZlUmVjb3JkIiwiZGVsZXRlUmVjb3JkIiwiZ2V0U3RhdHVzZXMiLCJ1cGRhdGVTdGF0dXMiLCJpZCIsInR5cGUiLCJjYWxsYmFjayIsImlzTmV3UmVjb3JkIiwidXJsIiwiJCIsImFwaSIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwic2FuaXRpemVQcm92aWRlckRhdGEiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsImluY2x1ZGVEaXNhYmxlZCIsIm1hcCIsIml0ZW0iLCJiaW5kIiwidmFsaWRhdGVQcm92aWRlckRhdGEiLCJwcm9jZXNzZWREYXRhIiwiX21ldGhvZCIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwiZ2V0U3RhdHVzQnlJZCIsInByb3ZpZGVySWQiLCJwcm92aWRlclR5cGUiLCJ0b1VwcGVyQ2FzZSIsInVwZGF0ZURhdGEiLCJkaXNhYmxlZCIsInNhbml0aXplZCIsIm5vdGUiLCJPYmplY3QiLCJhc3NpZ24iLCJ1c2VybmFtZSIsInNlY3JldCIsImhvc3QiLCJwb3J0IiwicGFyc2VJbnQiLCJ0cmFuc3BvcnQiLCJxdWFsaWZ5IiwicXVhbGlmeWZyZXEiLCJyZWdpc3RyYXRpb25fdHlwZSIsImV4dGVuc2lvbiIsImRlc2NyaXB0aW9uIiwibmV0d29ya2ZpbHRlcmlkIiwibWFudWFsYXR0cmlidXRlcyIsImR0bWZtb2RlIiwibmF0IiwiZnJvbXVzZXIiLCJmcm9tZG9tYWluIiwib3V0Ym91bmRfcHJveHkiLCJkaXNhYmxlZnJvbXVzZXIiLCJub3JlZ2lzdGVyIiwicmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgiLCJhZGRpdGlvbmFsSG9zdHMiLCJjaWRfc291cmNlIiwiY2lkX2N1c3RvbV9oZWFkZXIiLCJjaWRfcGFyc2VyX3N0YXJ0IiwiY2lkX3BhcnNlcl9lbmQiLCJjaWRfcGFyc2VyX3JlZ2V4IiwiZGlkX3NvdXJjZSIsImRpZF9jdXN0b21faGVhZGVyIiwiZGlkX3BhcnNlcl9zdGFydCIsImRpZF9wYXJzZXJfZW5kIiwiZGlkX3BhcnNlcl9yZWdleCIsImNpZF9kaWRfZGVidWciLCJpc1N0YXR1c1VwZGF0ZSIsImhhc093blByb3BlcnR5Iiwia2V5cyIsImxlbmd0aCIsImluY2x1ZGVzIiwidGVzdCIsImhvc3RQYXR0ZXJuIiwidW5kZWZpbmVkIiwiaXNOYU4iLCJnZXREcm9wZG93blNldHRpbmdzIiwib25DaGFuZ2VDYWxsYmFjayIsIm9wdGlvbnMiLCJzZXR0aW5ncyIsIm9uQ2hhbmdlIiwiaW5jbHVkZU5vbmUiLCJmb3JjZVNlbGVjdGlvbiIsImFwaVNldHRpbmdzIiwiY2FjaGUiLCJvblJlc3BvbnNlIiwic3VjY2VzcyIsInJlc3VsdHMiLCJwcm92aWRlciIsInZhbHVlIiwibmFtZSIsInRleHQiLCJ1bnNoaWZ0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXJfQW55UHJvdmlkZXJfdjIiLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwic2F2ZVJlbW90ZURhdGEiLCJhbGxvd0NhdGVnb3J5U2VsZWN0aW9uIiwiaGlkZURpdmlkZXJzIiwiZGlyZWN0aW9uIiwiJGNob2ljZSIsInZhbCIsInRyaWdnZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRTtBQUNQQyxJQUFBQSxPQUFPLEVBQUUsbUNBREY7QUFFUEMsSUFBQUEsU0FBUyxFQUFFLHFDQUZKO0FBR1BDLElBQUFBLFVBQVUsRUFBRSxzQ0FITDtBQUlQQyxJQUFB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QUErQjtBQUNyQztBQUNBcEcsUUFBQUEsQ0FBQyxDQUFDLGtEQUFELENBQUQsQ0FBc0RxRyxHQUF0RCxDQUEwRGQsS0FBMUQsRUFBaUVlLE9BQWpFLENBQXlFLFFBQXpFLEVBRnFDLENBSXJDOztBQUNBLFlBQUksT0FBT3pHLFFBQVAsS0FBb0IsVUFBeEIsRUFBb0M7QUFDaENBLFVBQUFBLFFBQVEsQ0FBQzBGLEtBQUQsRUFBUUUsSUFBUixFQUFjVyxPQUFkLENBQVI7QUFDSDtBQUNKO0FBakVFLEtBQVA7QUFtRUg7QUFoZWdCLENBQXJCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICovXG5cbi8qIGdsb2JhbCBDb25maWcsIFNlY3VyaXR5VXRpbHMsIFBieEFwaSAqL1xuXG4vKipcbiAqIFByb3ZpZGVyc0FQSSAtIFJFU1QgQVBJIHYyIGZvciBwcm92aWRlcnMgbWFuYWdlbWVudFxuICogXG4gKiBQcm92aWRlcyBjZW50cmFsaXplZCBBUEkgbWV0aG9kcyB3aXRoIGJ1aWx0LWluIHNlY3VyaXR5IGZlYXR1cmVzOlxuICogLSBJbnB1dCBzYW5pdGl6YXRpb24gZm9yIGRpc3BsYXlcbiAqIC0gWFNTIHByb3RlY3Rpb25cbiAqIC0gQ29uc2lzdGVudCBlcnJvciBoYW5kbGluZ1xuICogLSBDU1JGIHByb3RlY3Rpb24gdGhyb3VnaCBzZXNzaW9uIGNvb2tpZXNcbiAqL1xuY29uc3QgUHJvdmlkZXJzQVBJID0ge1xuICAgIC8qKlxuICAgICAqIEFQSSBlbmRwb2ludHMgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGVuZHBvaW50czoge1xuICAgICAgICBnZXRMaXN0OiAnL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy9nZXRMaXN0JyxcbiAgICAgICAgZ2V0UmVjb3JkOiAnL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy9nZXRSZWNvcmQnLFxuICAgICAgICBzYXZlUmVjb3JkOiAnL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy9zYXZlUmVjb3JkJyxcbiAgICAgICAgZGVsZXRlUmVjb3JkOiAnL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy9kZWxldGVSZWNvcmQnLFxuICAgICAgICBnZXRTdGF0dXNlczogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0U3RhdHVzZXMnLFxuICAgICAgICB1cGRhdGVTdGF0dXM6ICcvcGJ4Y29yZS9hcGkvdjIvcHJvdmlkZXJzL3VwZGF0ZVN0YXR1cydcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgYnkgSUQgd2l0aCBzZWN1cml0eSBwcm9jZXNzaW5nXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gUmVjb3JkIElEIG9yIGVtcHR5IHN0cmluZyBmb3IgbmV3XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSBQcm92aWRlciB0eXBlIChTSVAgb3IgSUFYKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRSZWNvcmQ6IGZ1bmN0aW9uKGlkLCB0eXBlLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgbmV3IHJlY29yZCBvciBleGlzdGluZ1xuICAgICAgICBjb25zdCBpc05ld1JlY29yZCA9ICFpZCB8fCBpZCA9PT0gJycgfHwgaWQgPT09ICduZXcnO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIFJFU1RmdWwgVVJMIHdpdGggcGF0aCBwYXJhbWV0ZXJzOiAvZ2V0UmVjb3JkL1NJUC9TSVAtVFJVTkstMTIzXG4gICAgICAgIC8vIEZhbGwgYmFjayB0byBxdWVyeSBwYXJhbWV0ZXJzIGZvciAnbmV3JyByZWNvcmRzXG4gICAgICAgIGxldCB1cmw7XG4gICAgICAgIGlmIChpc05ld1JlY29yZCkge1xuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCB1c2UgcXVlcnkgcGFyYW1ldGVyc1xuICAgICAgICAgICAgdXJsID0gdGhpcy5lbmRwb2ludHMuZ2V0UmVjb3JkICsgKHR5cGUgPyAnP3R5cGU9JyArIHR5cGUgOiAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcywgdXNlIFJFU1RmdWwgcGF0aDogL2dldFJlY29yZC9TSVAvU0lQLVRSVU5LLTEyM1xuICAgICAgICAgICAgdXJsID0gdGhpcy5lbmRwb2ludHMuZ2V0UmVjb3JkICsgJy8nICsgdHlwZSArICcvJyArIGlkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTYW5pdGl6ZSBkYXRhIGZvciBkaXNwbGF5XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEgPSB0aGlzLnNhbml0aXplUHJvdmlkZXJEYXRhKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBtZXNzYWdlczoge2Vycm9yOiBbJ05ldHdvcmsgZXJyb3InXX19KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgbGlzdCBvZiBhbGwgcHJvdmlkZXJzIHdpdGggc2VjdXJpdHkgcHJvY2Vzc2luZ1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRMaXN0OiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmdldExpc3QsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIGluY2x1ZGVEaXNhYmxlZDogJ3RydWUnICAvLyBBbHdheXMgaW5jbHVkZSBkaXNhYmxlZCBwcm92aWRlcnMgaW4gYWRtaW4gcGFuZWxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTYW5pdGl6ZSBhcnJheSBvZiBwcm92aWRlcnNcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9IHJlc3BvbnNlLmRhdGEubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnNhbml0aXplUHJvdmlkZXJEYXRhKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiBbXX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhdmUgcHJvdmlkZXIgcmVjb3JkIHdpdGggdmFsaWRhdGlvbiBhbmQgc2VjdXJpdHlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgdG8gc2F2ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBzYXZlUmVjb3JkOiBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBDbGllbnQtc2lkZSB2YWxpZGF0aW9uXG4gICAgICAgIGlmICghdGhpcy52YWxpZGF0ZVByb3ZpZGVyRGF0YShkYXRhKSkge1xuICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsIFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnQ2xpZW50LXNpZGUgdmFsaWRhdGlvbiBmYWlsZWQnXX1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JtLmpzIHdpdGggY29udmVydENoZWNrYm94ZXNUb0Jvb2w9dHJ1ZSBzZW5kcyBhbGwgY2hlY2tib3hlcyBhcyBib29sZWFuIHZhbHVlc1xuICAgICAgICAvLyBTZXJ2ZXIgYWNjZXB0cyBib29sZWFuIHZhbHVlcyBkaXJlY3RseSwgbm8gY29udmVyc2lvbiBuZWVkZWRcbiAgICAgICAgY29uc3QgcHJvY2Vzc2VkRGF0YSA9IHsuLi5kYXRhfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBfbWV0aG9kIGZsYWcgZnJvbSBGb3JtLmpzIGlmIHByb3ZpZGVkLCBvdGhlcndpc2UgZmFsbGJhY2sgdG8gSUQtYmFzZWQgZGV0ZWN0aW9uXG4gICAgICAgIGxldCBtZXRob2QgPSAnUE9TVCc7XG4gICAgICAgIGlmIChwcm9jZXNzZWREYXRhLl9tZXRob2QpIHtcbiAgICAgICAgICAgIG1ldGhvZCA9IHByb2Nlc3NlZERhdGEuX21ldGhvZDtcbiAgICAgICAgICAgIGRlbGV0ZSBwcm9jZXNzZWREYXRhLl9tZXRob2Q7IC8vIFJlbW92ZSBmcm9tIGRhdGEgYmVmb3JlIHNlbmRpbmdcbiAgICAgICAgfSBlbHNlIGlmIChwcm9jZXNzZWREYXRhLmlkKSB7XG4gICAgICAgICAgICBtZXRob2QgPSAnUFVUJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIFBPU1QgKGNyZWF0ZSksIGRvbid0IGluY2x1ZGUgSUQgaW4gVVJMIGV2ZW4gaWYgSUQgZXhpc3RzIChwcmUtZ2VuZXJhdGVkKVxuICAgICAgICAvLyBGb3IgUFVUICh1cGRhdGUpLCBpbmNsdWRlIElEIGluIFVSTFxuICAgICAgICBjb25zdCB1cmwgPSBtZXRob2QgPT09ICdQVVQnICYmIHByb2Nlc3NlZERhdGEuaWQgPyBcbiAgICAgICAgICAgIHRoaXMuZW5kcG9pbnRzLnNhdmVSZWNvcmQgKyAnLycgKyBwcm9jZXNzZWREYXRhLmlkIDogXG4gICAgICAgICAgICB0aGlzLmVuZHBvaW50cy5zYXZlUmVjb3JkO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgICAgIGRhdGE6IHByb2Nlc3NlZERhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gdGhpcy5zYW5pdGl6ZVByb3ZpZGVyRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHByb3ZpZGVyIHJlY29yZFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlY29yZCBJRFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQ6IGZ1bmN0aW9uKGlkLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmRlbGV0ZVJlY29yZCArICcvJyArIGlkLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBwcm92aWRlciBzdGF0dXNlc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRTdGF0dXNlczogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRTdGF0dXNlcyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IHt9fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0YXR1cyBmb3IgYSBzcGVjaWZpYyBwcm92aWRlciBieSBJRFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlcklkIC0gUHJvdmlkZXIgdW5pcXVlIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyVHlwZSAtIFByb3ZpZGVyIHR5cGUgKFNJUCBvciBJQVgpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFN0YXR1c0J5SWQ6IGZ1bmN0aW9uKHByb3ZpZGVySWQsIHByb3ZpZGVyVHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQnVpbGQgVVJMIHdpdGggdHlwZSBpZiBwcm92aWRlZCBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgICAgIGxldCB1cmwgPSAnL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy9nZXRTdGF0dXMvJztcbiAgICAgICAgaWYgKHByb3ZpZGVyVHlwZSkge1xuICAgICAgICAgICAgdXJsICs9IHByb3ZpZGVyVHlwZS50b1VwcGVyQ2FzZSgpICsgJy8nICsgcHJvdmlkZXJJZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVybCArPSBwcm92aWRlcklkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IG51bGx9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcHJvdmlkZXIgc3RhdHVzIChlbmFibGUvZGlzYWJsZSlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgd2l0aCBpZCwgdHlwZSwgYW5kIGRpc2FibGVkIHN0YXR1c1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXM6IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgICAgICBpZiAoIWRhdGEuaWQgfHwgIWRhdGEudHlwZSkge1xuICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsIFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnUHJvdmlkZXIgSUQgYW5kIHR5cGUgYXJlIHJlcXVpcmVkJ119XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBkYXRhIHRvIHByb3BlciBmb3JtYXRcbiAgICAgICAgY29uc3QgdXBkYXRlRGF0YSA9IHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgdHlwZTogZGF0YS50eXBlLnRvVXBwZXJDYXNlKCksXG4gICAgICAgICAgICBkaXNhYmxlZDogISFkYXRhLmRpc2FibGVkXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLnVwZGF0ZVN0YXR1cyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogdXBkYXRlRGF0YSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgcHJvdmlkZXIgZGF0YSBmb3Igc2VjdXJlIGRpc3BsYXlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9IERhdGEgcmVhZHkgZm9yIGRpc3BsYXlcbiAgICAgKi9cbiAgICBzYW5pdGl6ZVByb3ZpZGVyRGF0YTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEpIHJldHVybiBkYXRhO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2FuaXRpemVkID0ge1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgICAgICB0eXBlOiBkYXRhLnR5cGUgfHwgJ1NJUCcsXG4gICAgICAgICAgICBub3RlOiBkYXRhLm5vdGUgfHwgJycsXG4gICAgICAgICAgICBkaXNhYmxlZDogISFkYXRhLmRpc2FibGVkXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIGlmIChkYXRhLnR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHNhbml0aXplZCwge1xuICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBkYXRhLnVzZXJuYW1lIHx8ICcnLFxuICAgICAgICAgICAgICAgIHNlY3JldDogZGF0YS5zZWNyZXQgfHwgJycsXG4gICAgICAgICAgICAgICAgaG9zdDogZGF0YS5ob3N0IHx8ICcnLFxuICAgICAgICAgICAgICAgIHBvcnQ6IHBhcnNlSW50KGRhdGEucG9ydCkgfHwgNTA2MCxcbiAgICAgICAgICAgICAgICB0cmFuc3BvcnQ6IGRhdGEudHJhbnNwb3J0IHx8ICdVRFAnLFxuICAgICAgICAgICAgICAgIHF1YWxpZnk6ICEhZGF0YS5xdWFsaWZ5LFxuICAgICAgICAgICAgICAgIHF1YWxpZnlmcmVxOiBwYXJzZUludChkYXRhLnF1YWxpZnlmcmVxKSB8fCA2MCxcbiAgICAgICAgICAgICAgICByZWdpc3RyYXRpb25fdHlwZTogZGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCAnb3V0Ym91bmQnLFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogZGF0YS5leHRlbnNpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgbmV0d29ya2ZpbHRlcmlkOiBkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnJyxcbiAgICAgICAgICAgICAgICBtYW51YWxhdHRyaWJ1dGVzOiBkYXRhLm1hbnVhbGF0dHJpYnV0ZXMgfHwgJycsXG4gICAgICAgICAgICAgICAgZHRtZm1vZGU6IGRhdGEuZHRtZm1vZGUgfHwgJ2F1dG8nLFxuICAgICAgICAgICAgICAgIG5hdDogZGF0YS5uYXQgfHwgJ2F1dG9fZm9yY2UnLFxuICAgICAgICAgICAgICAgIGZyb211c2VyOiBkYXRhLmZyb211c2VyIHx8ICcnLFxuICAgICAgICAgICAgICAgIGZyb21kb21haW46IGRhdGEuZnJvbWRvbWFpbiB8fCAnJyxcbiAgICAgICAgICAgICAgICBvdXRib3VuZF9wcm94eTogZGF0YS5vdXRib3VuZF9wcm94eSB8fCAnJyxcbiAgICAgICAgICAgICAgICBkaXNhYmxlZnJvbXVzZXI6ICEhZGF0YS5kaXNhYmxlZnJvbXVzZXIsXG4gICAgICAgICAgICAgICAgbm9yZWdpc3RlcjogISFkYXRhLm5vcmVnaXN0ZXIsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGg6ICEhZGF0YS5yZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsSG9zdHM6IGRhdGEuYWRkaXRpb25hbEhvc3RzIHx8IFtdLFxuICAgICAgICAgICAgICAgIC8vIENhbGxlcklEL0RJRCBmaWVsZHNcbiAgICAgICAgICAgICAgICBjaWRfc291cmNlOiBkYXRhLmNpZF9zb3VyY2UgfHwgJ2RlZmF1bHQnLFxuICAgICAgICAgICAgICAgIGNpZF9jdXN0b21faGVhZGVyOiBkYXRhLmNpZF9jdXN0b21faGVhZGVyIHx8ICcnLFxuICAgICAgICAgICAgICAgIGNpZF9wYXJzZXJfc3RhcnQ6IGRhdGEuY2lkX3BhcnNlcl9zdGFydCB8fCAnJyxcbiAgICAgICAgICAgICAgICBjaWRfcGFyc2VyX2VuZDogZGF0YS5jaWRfcGFyc2VyX2VuZCB8fCAnJyxcbiAgICAgICAgICAgICAgICBjaWRfcGFyc2VyX3JlZ2V4OiBkYXRhLmNpZF9wYXJzZXJfcmVnZXggfHwgJycsXG4gICAgICAgICAgICAgICAgZGlkX3NvdXJjZTogZGF0YS5kaWRfc291cmNlIHx8ICdkZWZhdWx0JyxcbiAgICAgICAgICAgICAgICBkaWRfY3VzdG9tX2hlYWRlcjogZGF0YS5kaWRfY3VzdG9tX2hlYWRlciB8fCAnJyxcbiAgICAgICAgICAgICAgICBkaWRfcGFyc2VyX3N0YXJ0OiBkYXRhLmRpZF9wYXJzZXJfc3RhcnQgfHwgJycsXG4gICAgICAgICAgICAgICAgZGlkX3BhcnNlcl9lbmQ6IGRhdGEuZGlkX3BhcnNlcl9lbmQgfHwgJycsXG4gICAgICAgICAgICAgICAgZGlkX3BhcnNlcl9yZWdleDogZGF0YS5kaWRfcGFyc2VyX3JlZ2V4IHx8ICcnLFxuICAgICAgICAgICAgICAgIGNpZF9kaWRfZGVidWc6ICEhZGF0YS5jaWRfZGlkX2RlYnVnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSUFYLXNwZWNpZmljIGZpZWxkc1xuICAgICAgICBpZiAoZGF0YS50eXBlID09PSAnSUFYJykge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihzYW5pdGl6ZWQsIHtcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogZGF0YS51c2VybmFtZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBzZWNyZXQ6IGRhdGEuc2VjcmV0IHx8ICcnLFxuICAgICAgICAgICAgICAgIGhvc3Q6IGRhdGEuaG9zdCB8fCAnJyxcbiAgICAgICAgICAgICAgICBxdWFsaWZ5OiAhIWRhdGEucXVhbGlmeSxcbiAgICAgICAgICAgICAgICByZWdpc3RyYXRpb25fdHlwZTogZGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCAnbm9uZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgbWFudWFsYXR0cmlidXRlczogZGF0YS5tYW51YWxhdHRyaWJ1dGVzIHx8ICcnLFxuICAgICAgICAgICAgICAgIG5vcmVnaXN0ZXI6ICEhZGF0YS5ub3JlZ2lzdGVyLFxuICAgICAgICAgICAgICAgIG5ldHdvcmtmaWx0ZXJpZDogZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJycsXG4gICAgICAgICAgICAgICAgcG9ydDogZGF0YS5wb3J0IHx8ICcnLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoOiAhIWRhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGhcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc2FuaXRpemVkO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byB2YWxpZGF0ZVxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICovXG4gICAgdmFsaWRhdGVQcm92aWRlckRhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIHN0YXR1cy1vbmx5IHVwZGF0ZSAoY29udGFpbnMgb25seSBpZCwgdHlwZSwgZGlzYWJsZWQpXG4gICAgICAgIGNvbnN0IGlzU3RhdHVzVXBkYXRlID0gZGF0YS5pZCAmJiBkYXRhLnR5cGUgJiYgZGF0YS5oYXNPd25Qcm9wZXJ0eSgnZGlzYWJsZWQnKSAmJiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCA9PT0gMztcbiAgICAgICAgXG4gICAgICAgIGlmIChpc1N0YXR1c1VwZGF0ZSkge1xuICAgICAgICAgICAgLy8gTWluaW1hbCB2YWxpZGF0aW9uIGZvciBzdGF0dXMgdXBkYXRlc1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudHlwZSAmJiBbJ1NJUCcsICdJQVgnXS5pbmNsdWRlcyhkYXRhLnR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUeXBlIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKCFkYXRhLnR5cGUgfHwgIVsnU0lQJywgJ0lBWCddLmluY2x1ZGVzKGRhdGEudHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlcm5hbWUgdmFsaWRhdGlvbiAoYWxwaGFudW1lcmljIGFuZCBiYXNpYyBzeW1ib2xzKVxuICAgICAgICBpZiAoZGF0YS51c2VybmFtZSAmJiAhL15bYS16QS1aMC05Ll8tXSokLy50ZXN0KGRhdGEudXNlcm5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhvc3QgdmFsaWRhdGlvbiAoZG9tYWluIG9yIElQKVxuICAgICAgICBpZiAoZGF0YS5ob3N0KSB7XG4gICAgICAgICAgICBjb25zdCBob3N0UGF0dGVybiA9IC9eKFthLXpBLVowLTkuLV0rfFxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9KSQvO1xuICAgICAgICAgICAgaWYgKCFob3N0UGF0dGVybi50ZXN0KGRhdGEuaG9zdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFBvcnQgdmFsaWRhdGlvblxuICAgICAgICBpZiAoZGF0YS5wb3J0ICE9PSB1bmRlZmluZWQgJiYgZGF0YS5wb3J0ICE9PSBudWxsICYmIGRhdGEucG9ydCAhPT0gJycpIHtcbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBwYXJzZUludChkYXRhLnBvcnQpO1xuICAgICAgICAgICAgaWYgKGlzTmFOKHBvcnQpIHx8IHBvcnQgPCAxIHx8IHBvcnQgPiA2NTUzNSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVHJhbnNwb3J0IHZhbGlkYXRpb24gZm9yIFNJUFxuICAgICAgICBpZiAoZGF0YS50eXBlID09PSAnU0lQJyAmJiBkYXRhLnRyYW5zcG9ydCkge1xuICAgICAgICAgICAgaWYgKCFbJ1VEUCcsICdUQ1AnLCAnVExTJ10uaW5jbHVkZXMoZGF0YS50cmFuc3BvcnQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gdmFsaWRhdGlvbiAobnVtZXJpYyBvbmx5KVxuICAgICAgICBpZiAoZGF0YS5leHRlbnNpb24gJiYgIS9eWzAtOV0qJC8udGVzdChkYXRhLmV4dGVuc2lvbikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHByb3ZpZGVyIHNlbGVjdGlvbiAtIEJBQ0tXQVJEIENPTVBBVElCSUxJVFlcbiAgICAgKiBUaGlzIG1ldGhvZCBtYWludGFpbnMgY29tcGF0aWJpbGl0eSB3aXRoIGV4aXN0aW5nIGZvcm1zIHRoYXQgdXNlIHRoZSBvbGQgQVBJXG4gICAgICogXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbnxvYmplY3R9IG9uQ2hhbmdlQ2FsbGJhY2sgLSBDYWxsYmFjayB3aGVuIHNlbGVjdGlvbiBjaGFuZ2VzIE9SIG9wdGlvbnMgb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBBZGRpdGlvbmFsIG9wdGlvbnMgKHdoZW4gZmlyc3QgcGFyYW0gaXMgY2FsbGJhY2spXG4gICAgICogQHJldHVybiB7b2JqZWN0fSBTZW1hbnRpYyBVSSBkcm9wZG93biBzZXR0aW5ncyBvYmplY3RcbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzOiBmdW5jdGlvbihvbkNoYW5nZUNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgICAgIC8vIEhhbmRsZSBkaWZmZXJlbnQgcGFyYW1ldGVyIGNvbWJpbmF0aW9uc1xuICAgICAgICBsZXQgY2FsbGJhY2sgPSBvbkNoYW5nZUNhbGxiYWNrO1xuICAgICAgICBsZXQgc2V0dGluZ3MgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgZmlyc3QgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCwgdHJlYXQgaXQgYXMgb3B0aW9uc1xuICAgICAgICBpZiAodHlwZW9mIG9uQ2hhbmdlQ2FsbGJhY2sgPT09ICdvYmplY3QnICYmIG9uQ2hhbmdlQ2FsbGJhY2sgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHNldHRpbmdzID0gb25DaGFuZ2VDYWxsYmFjaztcbiAgICAgICAgICAgIGNhbGxiYWNrID0gc2V0dGluZ3Mub25DaGFuZ2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlZmF1bHQgdmFsdWVzXG4gICAgICAgIGNvbnN0IGluY2x1ZGVOb25lID0gc2V0dGluZ3MuaW5jbHVkZU5vbmUgIT09IHVuZGVmaW5lZCA/IHNldHRpbmdzLmluY2x1ZGVOb25lIDogdHJ1ZTtcbiAgICAgICAgY29uc3QgZm9yY2VTZWxlY3Rpb24gPSBzZXR0aW5ncy5mb3JjZVNlbGVjdGlvbiAhPT0gdW5kZWZpbmVkID8gc2V0dGluZ3MuZm9yY2VTZWxlY3Rpb24gOiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBuZXcgUkVTVCBBUEkgdjIgZW5kcG9pbnRcbiAgICAgICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmdldExpc3QsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRGlzYWJsZWQ6ICdmYWxzZScgIC8vIE9ubHkgc2hvdyBlbmFibGVkIHByb3ZpZGVycyBpbiBkcm9wZG93bnNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCB8fCAhcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzOiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJhbnNmb3JtIEFQSSByZXNwb25zZSB0byBkcm9wZG93biBmb3JtYXRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0cyA9IHJlc3BvbnNlLmRhdGEubWFwKGZ1bmN0aW9uKHByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVc2UgdGhlICduYW1lJyBmaWVsZCBmcm9tIHNlcnZlciBhcy1pcywgaXQgYWxyZWFkeSBjb250YWlucyB0aGUgaWNvblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VydmVyIHNlbmRzOiBcIjxpIGNsYXNzPVxcXCJzZXJ2ZXIgaWNvblxcXCI+PC9pPiBJQVg6IFRlc3QgSUFYIFByb3ZpZGVyXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcHJvdmlkZXIuaWQsICAgICAgICAgICAvLyBVc2UgaWQgYXMgdGhlIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcHJvdmlkZXIubmFtZSwgICAgICAgICAgLy8gVXNlIHNlcnZlcidzIG5hbWUgZmllbGQgYXMtaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBwcm92aWRlci5uYW1lLCAgICAgICAgICAvLyBTYW1lIGZvciB0ZXh0IGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBhZGRpdGlvbmFsIGRhdGEgZm9yIGZ1dHVyZSB1c2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm92aWRlclR5cGU6IHByb3ZpZGVyLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJJZDogcHJvdmlkZXIuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9zdDogcHJvdmlkZXIuaG9zdCB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VybmFtZTogcHJvdmlkZXIudXNlcm5hbWUgfHwgJydcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkICdOb25lJyBvcHRpb24gYXQgdGhlIGJlZ2lubmluZyBvbmx5IGlmIGluY2x1ZGVOb25lIGlzIHRydWVcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVOb25lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnVuc2hpZnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnbm9uZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogZ2xvYmFsVHJhbnNsYXRlLmlyX0FueVByb3ZpZGVyX3YyIHx8ICdBbnkgcHJvdmlkZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pcl9BbnlQcm92aWRlcl92MiB8fCAnQW55IHByb3ZpZGVyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0czogcmVzdWx0c1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBhbGxvd0NhdGVnb3J5U2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmb3JjZVNlbGVjdGlvbiwgIC8vIFVzZSB0aGUgZm9yY2VTZWxlY3Rpb24gcGFyYW1ldGVyXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQsICRjaG9pY2UpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IGZpZWxkcyBmb3IgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwicHJvdmlkZXJcIl0sIGlucHV0W25hbWU9XCJwcm92aWRlcmlkXCJdJykudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDYWxsIHRoZSBwcm92aWRlZCBjYWxsYmFjayBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxufTsiXX0=