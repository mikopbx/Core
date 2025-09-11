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
      cache: false,
      // Explicitly disable caching to prevent double callbacks
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
      disabled: !!data.disabled,
      // Include represent field as-is (it will be sanitized during display)
      represent: data.represent || ''
    }; // Common fields for display

    Object.assign(sanitized, {
      host: data.host || '',
      username: data.username || ''
    }); // SIP-specific fields

    if (data.type === 'SIP') {
      Object.assign(sanitized, {
        secret: data.secret || '',
        port: parseInt(data.port) || 5060,
        transport: data.transport || 'UDP',
        qualify: !!data.qualify,
        qualifyfreq: parseInt(data.qualifyfreq) || 60,
        registration_type: data.registration_type || 'outbound',
        extension: data.extension || '',
        description: data.description || '',
        networkfilterid: data.networkfilterid || '',
        networkfilter_represent: data.networkfilter_represent || '',
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
        secret: data.secret || '',
        qualify: !!data.qualify,
        registration_type: data.registration_type || 'none',
        description: data.description || '',
        manualattributes: data.manualattributes || '',
        noregister: !!data.noregister,
        networkfilterid: data.networkfilterid || '',
        networkfilter_represent: data.networkfilter_represent || '',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcHJvdmlkZXJzQVBJLmpzIl0sIm5hbWVzIjpbIlByb3ZpZGVyc0FQSSIsImVuZHBvaW50cyIsImdldExpc3QiLCJnZXRSZWNvcmQiLCJzYXZlUmVjb3JkIiwiZGVsZXRlUmVjb3JkIiwiZ2V0U3RhdHVzZXMiLCJ1cGRhdGVTdGF0dXMiLCJpZCIsInR5cGUiLCJjYWxsYmFjayIsImlzTmV3UmVjb3JkIiwidXJsIiwiJCIsImFwaSIsIm1ldGhvZCIsIm9uIiwiY2FjaGUiLCJvblN1Y2Nlc3MiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJzYW5pdGl6ZVByb3ZpZGVyRGF0YSIsIm9uRmFpbHVyZSIsIm9uRXJyb3IiLCJtZXNzYWdlcyIsImVycm9yIiwiaW5jbHVkZURpc2FibGVkIiwibWFwIiwiaXRlbSIsImJpbmQiLCJ2YWxpZGF0ZVByb3ZpZGVyRGF0YSIsInByb2Nlc3NlZERhdGEiLCJfbWV0aG9kIiwic3VjY2Vzc1Rlc3QiLCJQYnhBcGkiLCJnZXRTdGF0dXNCeUlkIiwicHJvdmlkZXJJZCIsInByb3ZpZGVyVHlwZSIsInRvVXBwZXJDYXNlIiwidXBkYXRlRGF0YSIsImRpc2FibGVkIiwic2FuaXRpemVkIiwibm90ZSIsInJlcHJlc2VudCIsIk9iamVjdCIsImFzc2lnbiIsImhvc3QiLCJ1c2VybmFtZSIsInNlY3JldCIsInBvcnQiLCJwYXJzZUludCIsInRyYW5zcG9ydCIsInF1YWxpZnkiLCJxdWFsaWZ5ZnJlcSIsInJlZ2lzdHJhdGlvbl90eXBlIiwiZXh0ZW5zaW9uIiwiZGVzY3JpcHRpb24iLCJuZXR3b3JrZmlsdGVyaWQiLCJuZXR3b3JrZmlsdGVyX3JlcHJlc2VudCIsIm1hbnVhbGF0dHJpYnV0ZXMiLCJkdG1mbW9kZSIsIm5hdCIsImZyb211c2VyIiwiZnJvbWRvbWFpbiIsIm91dGJvdW5kX3Byb3h5IiwiZGlzYWJsZWZyb211c2VyIiwibm9yZWdpc3RlciIsInJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIiwiYWRkaXRpb25hbEhvc3RzIiwiY2lkX3NvdXJjZSIsImNpZF9jdXN0b21faGVhZGVyIiwiY2lkX3BhcnNlcl9zdGFydCIsImNpZF9wYXJzZXJfZW5kIiwiY2lkX3BhcnNlcl9yZWdleCIsImRpZF9zb3VyY2UiLCJkaWRfY3VzdG9tX2hlYWRlciIsImRpZF9wYXJzZXJfc3RhcnQiLCJkaWRfcGFyc2VyX2VuZCIsImRpZF9wYXJzZXJfcmVnZXgiLCJjaWRfZGlkX2RlYnVnIiwiaXNTdGF0dXNVcGRhdGUiLCJoYXNPd25Qcm9wZXJ0eSIsImtleXMiLCJsZW5ndGgiLCJpbmNsdWRlcyIsInRlc3QiLCJob3N0UGF0dGVybiIsInVuZGVmaW5lZCIsImlzTmFOIiwiZ2V0RHJvcGRvd25TZXR0aW5ncyIsIm9uQ2hhbmdlQ2FsbGJhY2siLCJvcHRpb25zIiwic2V0dGluZ3MiLCJvbkNoYW5nZSIsImluY2x1ZGVOb25lIiwiZm9yY2VTZWxlY3Rpb24iLCJhcGlTZXR0aW5ncyIsIm9uUmVzcG9uc2UiLCJzdWNjZXNzIiwicmVzdWx0cyIsInByb3ZpZGVyIiwidmFsdWUiLCJuYW1lIiwidGV4dCIsInVuc2hpZnQiLCJnbG9iYWxUcmFuc2xhdGUiLCJpcl9BbnlQcm92aWRlcl92MiIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJoaWRlRGl2aWRlcnMiLCJkaXJlY3Rpb24iLCIkY2hvaWNlIiwidmFsIiwidHJpZ2dlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztBQUNqQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFO0FBQ1BDLElBQUFBLE9BQU8sRUFBRSxtQ0FERjtBQUVQQyxJQUFBQSxTQUFTLEVBQUUscUNBRko7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RSxJQXBEYjtBQXFESEMsTUFBQUEsc0JBQXNCLEVBQUUsS0FyRHJCO0FBc0RIaEIsTUFBQUEsY0FBYyxFQUFFQSxjQXREYjtBQXNEOEI7QUFDakNpQixNQUFBQSxZQUFZLEVBQUUsT0F2RFg7QUF3REhDLE1BQUFBLFNBQVMsRUFBRSxVQXhEUjtBQXlESHBCLE1BQUFBLFFBQVEsRUFBRSxrQkFBU1EsS0FBVCxFQUFnQkUsSUFBaEIsRUFBc0JXLE9BQXRCLEVBQStCO0FBQ3JDO0FBQ0F0RyxRQUFBQSxDQUFDLENBQUMsa0RBQUQsQ0FBRCxDQUFzRHVHLEdBQXRELENBQTBEZCxLQUExRCxFQUFpRWUsT0FBakUsQ0FBeUUsUUFBekUsRUFGcUMsQ0FJckM7O0FBQ0EsWUFBSSxPQUFPM0csUUFBUCxLQUFvQixVQUF4QixFQUFvQztBQUNoQ0EsVUFBQUEsUUFBUSxDQUFDNEYsS0FBRCxFQUFRRSxJQUFSLEVBQWNXLE9BQWQsQ0FBUjtBQUNIO0FBQ0o7QUFqRUUsS0FBUDtBQW1FSDtBQXhlZ0IsQ0FBckIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgU2VjdXJpdHlVdGlscywgUGJ4QXBpICovXG5cbi8qKlxuICogUHJvdmlkZXJzQVBJIC0gUkVTVCBBUEkgdjIgZm9yIHByb3ZpZGVycyBtYW5hZ2VtZW50XG4gKiBcbiAqIFByb3ZpZGVzIGNlbnRyYWxpemVkIEFQSSBtZXRob2RzIHdpdGggYnVpbHQtaW4gc2VjdXJpdHkgZmVhdHVyZXM6XG4gKiAtIElucHV0IHNhbml0aXphdGlvbiBmb3IgZGlzcGxheVxuICogLSBYU1MgcHJvdGVjdGlvblxuICogLSBDb25zaXN0ZW50IGVycm9yIGhhbmRsaW5nXG4gKiAtIENTUkYgcHJvdGVjdGlvbiB0aHJvdWdoIHNlc3Npb24gY29va2llc1xuICovXG5jb25zdCBQcm92aWRlcnNBUEkgPSB7XG4gICAgLyoqXG4gICAgICogQVBJIGVuZHBvaW50cyBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgZW5kcG9pbnRzOiB7XG4gICAgICAgIGdldExpc3Q6ICcvcGJ4Y29yZS9hcGkvdjIvcHJvdmlkZXJzL2dldExpc3QnLFxuICAgICAgICBnZXRSZWNvcmQ6ICcvcGJ4Y29yZS9hcGkvdjIvcHJvdmlkZXJzL2dldFJlY29yZCcsXG4gICAgICAgIHNhdmVSZWNvcmQ6ICcvcGJ4Y29yZS9hcGkvdjIvcHJvdmlkZXJzL3NhdmVSZWNvcmQnLFxuICAgICAgICBkZWxldGVSZWNvcmQ6ICcvcGJ4Y29yZS9hcGkvdjIvcHJvdmlkZXJzL2RlbGV0ZVJlY29yZCcsXG4gICAgICAgIGdldFN0YXR1c2VzOiAnL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy9nZXRTdGF0dXNlcycsXG4gICAgICAgIHVwZGF0ZVN0YXR1czogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvdXBkYXRlU3RhdHVzJ1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBieSBJRCB3aXRoIHNlY3VyaXR5IHByb2Nlc3NpbmdcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBSZWNvcmQgSUQgb3IgZW1wdHkgc3RyaW5nIGZvciBuZXdcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtIFByb3ZpZGVyIHR5cGUgKFNJUCBvciBJQVgpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFJlY29yZDogZnVuY3Rpb24oaWQsIHR5cGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSBuZXcgcmVjb3JkIG9yIGV4aXN0aW5nXG4gICAgICAgIGNvbnN0IGlzTmV3UmVjb3JkID0gIWlkIHx8IGlkID09PSAnJyB8fCBpZCA9PT0gJ25ldyc7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgUkVTVGZ1bCBVUkwgd2l0aCBwYXRoIHBhcmFtZXRlcnM6IC9nZXRSZWNvcmQvU0lQL1NJUC1UUlVOSy0xMjNcbiAgICAgICAgLy8gRmFsbCBiYWNrIHRvIHF1ZXJ5IHBhcmFtZXRlcnMgZm9yICduZXcnIHJlY29yZHNcbiAgICAgICAgbGV0IHVybDtcbiAgICAgICAgaWYgKGlzTmV3UmVjb3JkKSB7XG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIHVzZSBxdWVyeSBwYXJhbWV0ZXJzXG4gICAgICAgICAgICB1cmwgPSB0aGlzLmVuZHBvaW50cy5nZXRSZWNvcmQgKyAodHlwZSA/ICc/dHlwZT0nICsgdHlwZSA6ICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyByZWNvcmRzLCB1c2UgUkVTVGZ1bCBwYXRoOiAvZ2V0UmVjb3JkL1NJUC9TSVAtVFJVTkstMTIzXG4gICAgICAgICAgICB1cmwgPSB0aGlzLmVuZHBvaW50cy5nZXRSZWNvcmQgKyAnLycgKyB0eXBlICsgJy8nICsgaWQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2UsIC8vIEV4cGxpY2l0bHkgZGlzYWJsZSBjYWNoaW5nIHRvIHByZXZlbnQgZG91YmxlIGNhbGxiYWNrc1xuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgZGF0YSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gdGhpcy5zYW5pdGl6ZVByb3ZpZGVyRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2YgYWxsIHByb3ZpZGVycyB3aXRoIHNlY3VyaXR5IHByb2Nlc3NpbmdcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0TGlzdDogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRMaXN0LFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBpbmNsdWRlRGlzYWJsZWQ6ICd0cnVlJyAgLy8gQWx3YXlzIGluY2x1ZGUgZGlzYWJsZWQgcHJvdmlkZXJzIGluIGFkbWluIHBhbmVsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgYXJyYXkgb2YgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEgPSByZXNwb25zZS5kYXRhLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zYW5pdGl6ZVByb3ZpZGVyRGF0YShpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YTogW119KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIHByb3ZpZGVyIHJlY29yZCB3aXRoIHZhbGlkYXRpb24gYW5kIHNlY3VyaXR5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNhdmVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgc2F2ZVJlY29yZDogZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAgICBpZiAoIXRoaXMudmFsaWRhdGVQcm92aWRlckRhdGEoZGF0YSkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ0NsaWVudC1zaWRlIHZhbGlkYXRpb24gZmFpbGVkJ119XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9ybS5qcyB3aXRoIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sPXRydWUgc2VuZHMgYWxsIGNoZWNrYm94ZXMgYXMgYm9vbGVhbiB2YWx1ZXNcbiAgICAgICAgLy8gU2VydmVyIGFjY2VwdHMgYm9vbGVhbiB2YWx1ZXMgZGlyZWN0bHksIG5vIGNvbnZlcnNpb24gbmVlZGVkXG4gICAgICAgIGNvbnN0IHByb2Nlc3NlZERhdGEgPSB7Li4uZGF0YX07XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgX21ldGhvZCBmbGFnIGZyb20gRm9ybS5qcyBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIGZhbGxiYWNrIHRvIElELWJhc2VkIGRldGVjdGlvblxuICAgICAgICBsZXQgbWV0aG9kID0gJ1BPU1QnO1xuICAgICAgICBpZiAocHJvY2Vzc2VkRGF0YS5fbWV0aG9kKSB7XG4gICAgICAgICAgICBtZXRob2QgPSBwcm9jZXNzZWREYXRhLl9tZXRob2Q7XG4gICAgICAgICAgICBkZWxldGUgcHJvY2Vzc2VkRGF0YS5fbWV0aG9kOyAvLyBSZW1vdmUgZnJvbSBkYXRhIGJlZm9yZSBzZW5kaW5nXG4gICAgICAgIH0gZWxzZSBpZiAocHJvY2Vzc2VkRGF0YS5pZCkge1xuICAgICAgICAgICAgbWV0aG9kID0gJ1BVVCc7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEZvciBQT1NUIChjcmVhdGUpLCBkb24ndCBpbmNsdWRlIElEIGluIFVSTCBldmVuIGlmIElEIGV4aXN0cyAocHJlLWdlbmVyYXRlZClcbiAgICAgICAgLy8gRm9yIFBVVCAodXBkYXRlKSwgaW5jbHVkZSBJRCBpbiBVUkxcbiAgICAgICAgY29uc3QgdXJsID0gbWV0aG9kID09PSAnUFVUJyAmJiBwcm9jZXNzZWREYXRhLmlkID8gXG4gICAgICAgICAgICB0aGlzLmVuZHBvaW50cy5zYXZlUmVjb3JkICsgJy8nICsgcHJvY2Vzc2VkRGF0YS5pZCA6IFxuICAgICAgICAgICAgdGhpcy5lbmRwb2ludHMuc2F2ZVJlY29yZDtcbiAgICAgICAgXG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgICAgICBkYXRhOiBwcm9jZXNzZWREYXRhLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9IHRoaXMuc2FuaXRpemVQcm92aWRlckRhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBwcm92aWRlciByZWNvcmRcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaWQgLSBSZWNvcmQgSURcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkOiBmdW5jdGlvbihpZCwgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5kZWxldGVSZWNvcmQgKyAnLycgKyBpZCxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcHJvdmlkZXIgc3RhdHVzZXNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0U3RhdHVzZXM6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMuZ2V0U3RhdHVzZXMsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiB7fX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBzdGF0dXMgZm9yIGEgc3BlY2lmaWMgcHJvdmlkZXIgYnkgSURcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXJJZCAtIFByb3ZpZGVyIHVuaXF1ZSBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlclR5cGUgLSBQcm92aWRlciB0eXBlIChTSVAgb3IgSUFYKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRTdGF0dXNCeUlkOiBmdW5jdGlvbihwcm92aWRlcklkLCBwcm92aWRlclR5cGUsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIEJ1aWxkIFVSTCB3aXRoIHR5cGUgaWYgcHJvdmlkZWQgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuICAgICAgICBsZXQgdXJsID0gJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0U3RhdHVzLyc7XG4gICAgICAgIGlmIChwcm92aWRlclR5cGUpIHtcbiAgICAgICAgICAgIHVybCArPSBwcm92aWRlclR5cGUudG9VcHBlckNhc2UoKSArICcvJyArIHByb3ZpZGVySWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1cmwgKz0gcHJvdmlkZXJJZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcjogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHtyZXN1bHQ6IGZhbHNlLCBkYXRhOiBudWxsfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHByb3ZpZGVyIHN0YXR1cyAoZW5hYmxlL2Rpc2FibGUpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHdpdGggaWQsIHR5cGUsIGFuZCBkaXNhYmxlZCBzdGF0dXNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgdXBkYXRlU3RhdHVzOiBmdW5jdGlvbihkYXRhLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICAgICAgaWYgKCFkYXRhLmlkIHx8ICFkYXRhLnR5cGUpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ1Byb3ZpZGVyIElEIGFuZCB0eXBlIGFyZSByZXF1aXJlZCddfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgZGF0YSB0byBwcm9wZXIgZm9ybWF0XG4gICAgICAgIGNvbnN0IHVwZGF0ZURhdGEgPSB7XG4gICAgICAgICAgICBpZDogZGF0YS5pZCxcbiAgICAgICAgICAgIHR5cGU6IGRhdGEudHlwZS50b1VwcGVyQ2FzZSgpLFxuICAgICAgICAgICAgZGlzYWJsZWQ6ICEhZGF0YS5kaXNhYmxlZFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy51cGRhdGVTdGF0dXMsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHVwZGF0ZURhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnTmV0d29yayBlcnJvciddfX0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFNhbml0aXplIHByb3ZpZGVyIGRhdGEgZm9yIHNlY3VyZSBkaXNwbGF5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICogQHJldHVybiB7b2JqZWN0fSBEYXRhIHJlYWR5IGZvciBkaXNwbGF5XG4gICAgICovXG4gICAgc2FuaXRpemVQcm92aWRlckRhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgaWYgKCFkYXRhKSByZXR1cm4gZGF0YTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHNhbml0aXplZCA9IHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgdHlwZTogZGF0YS50eXBlIHx8ICdTSVAnLFxuICAgICAgICAgICAgbm90ZTogZGF0YS5ub3RlIHx8ICcnLFxuICAgICAgICAgICAgZGlzYWJsZWQ6ICEhZGF0YS5kaXNhYmxlZCxcbiAgICAgICAgICAgIC8vIEluY2x1ZGUgcmVwcmVzZW50IGZpZWxkIGFzLWlzIChpdCB3aWxsIGJlIHNhbml0aXplZCBkdXJpbmcgZGlzcGxheSlcbiAgICAgICAgICAgIHJlcHJlc2VudDogZGF0YS5yZXByZXNlbnQgfHwgJydcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbW1vbiBmaWVsZHMgZm9yIGRpc3BsYXlcbiAgICAgICAgT2JqZWN0LmFzc2lnbihzYW5pdGl6ZWQsIHtcbiAgICAgICAgICAgIGhvc3Q6IGRhdGEuaG9zdCB8fCAnJyxcbiAgICAgICAgICAgIHVzZXJuYW1lOiBkYXRhLnVzZXJuYW1lIHx8ICcnXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU0lQLXNwZWNpZmljIGZpZWxkc1xuICAgICAgICBpZiAoZGF0YS50eXBlID09PSAnU0lQJykge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihzYW5pdGl6ZWQsIHtcbiAgICAgICAgICAgICAgICBzZWNyZXQ6IGRhdGEuc2VjcmV0IHx8ICcnLFxuICAgICAgICAgICAgICAgIHBvcnQ6IHBhcnNlSW50KGRhdGEucG9ydCkgfHwgNTA2MCxcbiAgICAgICAgICAgICAgICB0cmFuc3BvcnQ6IGRhdGEudHJhbnNwb3J0IHx8ICdVRFAnLFxuICAgICAgICAgICAgICAgIHF1YWxpZnk6ICEhZGF0YS5xdWFsaWZ5LFxuICAgICAgICAgICAgICAgIHF1YWxpZnlmcmVxOiBwYXJzZUludChkYXRhLnF1YWxpZnlmcmVxKSB8fCA2MCxcbiAgICAgICAgICAgICAgICByZWdpc3RyYXRpb25fdHlwZTogZGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCAnb3V0Ym91bmQnLFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogZGF0YS5leHRlbnNpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgbmV0d29ya2ZpbHRlcmlkOiBkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnJyxcbiAgICAgICAgICAgICAgICBuZXR3b3JrZmlsdGVyX3JlcHJlc2VudDogZGF0YS5uZXR3b3JrZmlsdGVyX3JlcHJlc2VudCB8fCAnJyxcbiAgICAgICAgICAgICAgICBtYW51YWxhdHRyaWJ1dGVzOiBkYXRhLm1hbnVhbGF0dHJpYnV0ZXMgfHwgJycsXG4gICAgICAgICAgICAgICAgZHRtZm1vZGU6IGRhdGEuZHRtZm1vZGUgfHwgJ2F1dG8nLFxuICAgICAgICAgICAgICAgIG5hdDogZGF0YS5uYXQgfHwgJ2F1dG9fZm9yY2UnLFxuICAgICAgICAgICAgICAgIGZyb211c2VyOiBkYXRhLmZyb211c2VyIHx8ICcnLFxuICAgICAgICAgICAgICAgIGZyb21kb21haW46IGRhdGEuZnJvbWRvbWFpbiB8fCAnJyxcbiAgICAgICAgICAgICAgICBvdXRib3VuZF9wcm94eTogZGF0YS5vdXRib3VuZF9wcm94eSB8fCAnJyxcbiAgICAgICAgICAgICAgICBkaXNhYmxlZnJvbXVzZXI6ICEhZGF0YS5kaXNhYmxlZnJvbXVzZXIsXG4gICAgICAgICAgICAgICAgbm9yZWdpc3RlcjogISFkYXRhLm5vcmVnaXN0ZXIsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGg6ICEhZGF0YS5yZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsSG9zdHM6IGRhdGEuYWRkaXRpb25hbEhvc3RzIHx8IFtdLFxuICAgICAgICAgICAgICAgIC8vIENhbGxlcklEL0RJRCBmaWVsZHNcbiAgICAgICAgICAgICAgICBjaWRfc291cmNlOiBkYXRhLmNpZF9zb3VyY2UgfHwgJ2RlZmF1bHQnLFxuICAgICAgICAgICAgICAgIGNpZF9jdXN0b21faGVhZGVyOiBkYXRhLmNpZF9jdXN0b21faGVhZGVyIHx8ICcnLFxuICAgICAgICAgICAgICAgIGNpZF9wYXJzZXJfc3RhcnQ6IGRhdGEuY2lkX3BhcnNlcl9zdGFydCB8fCAnJyxcbiAgICAgICAgICAgICAgICBjaWRfcGFyc2VyX2VuZDogZGF0YS5jaWRfcGFyc2VyX2VuZCB8fCAnJyxcbiAgICAgICAgICAgICAgICBjaWRfcGFyc2VyX3JlZ2V4OiBkYXRhLmNpZF9wYXJzZXJfcmVnZXggfHwgJycsXG4gICAgICAgICAgICAgICAgZGlkX3NvdXJjZTogZGF0YS5kaWRfc291cmNlIHx8ICdkZWZhdWx0JyxcbiAgICAgICAgICAgICAgICBkaWRfY3VzdG9tX2hlYWRlcjogZGF0YS5kaWRfY3VzdG9tX2hlYWRlciB8fCAnJyxcbiAgICAgICAgICAgICAgICBkaWRfcGFyc2VyX3N0YXJ0OiBkYXRhLmRpZF9wYXJzZXJfc3RhcnQgfHwgJycsXG4gICAgICAgICAgICAgICAgZGlkX3BhcnNlcl9lbmQ6IGRhdGEuZGlkX3BhcnNlcl9lbmQgfHwgJycsXG4gICAgICAgICAgICAgICAgZGlkX3BhcnNlcl9yZWdleDogZGF0YS5kaWRfcGFyc2VyX3JlZ2V4IHx8ICcnLFxuICAgICAgICAgICAgICAgIGNpZF9kaWRfZGVidWc6ICEhZGF0YS5jaWRfZGlkX2RlYnVnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSUFYLXNwZWNpZmljIGZpZWxkc1xuICAgICAgICBpZiAoZGF0YS50eXBlID09PSAnSUFYJykge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihzYW5pdGl6ZWQsIHtcbiAgICAgICAgICAgICAgICBzZWNyZXQ6IGRhdGEuc2VjcmV0IHx8ICcnLFxuICAgICAgICAgICAgICAgIHF1YWxpZnk6ICEhZGF0YS5xdWFsaWZ5LFxuICAgICAgICAgICAgICAgIHJlZ2lzdHJhdGlvbl90eXBlOiBkYXRhLnJlZ2lzdHJhdGlvbl90eXBlIHx8ICdub25lJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvbiB8fCAnJyxcbiAgICAgICAgICAgICAgICBtYW51YWxhdHRyaWJ1dGVzOiBkYXRhLm1hbnVhbGF0dHJpYnV0ZXMgfHwgJycsXG4gICAgICAgICAgICAgICAgbm9yZWdpc3RlcjogISFkYXRhLm5vcmVnaXN0ZXIsXG4gICAgICAgICAgICAgICAgbmV0d29ya2ZpbHRlcmlkOiBkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnJyxcbiAgICAgICAgICAgICAgICBuZXR3b3JrZmlsdGVyX3JlcHJlc2VudDogZGF0YS5uZXR3b3JrZmlsdGVyX3JlcHJlc2VudCB8fCAnJyxcbiAgICAgICAgICAgICAgICBwb3J0OiBkYXRhLnBvcnQgfHwgJycsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGg6ICEhZGF0YS5yZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzYW5pdGl6ZWQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGllbnQtc2lkZSB2YWxpZGF0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHZhbGlkYXRlXG4gICAgICogQHJldHVybiB7Ym9vbGVhbn0gVmFsaWRhdGlvbiByZXN1bHRcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVByb3ZpZGVyRGF0YTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIGEgc3RhdHVzLW9ubHkgdXBkYXRlIChjb250YWlucyBvbmx5IGlkLCB0eXBlLCBkaXNhYmxlZClcbiAgICAgICAgY29uc3QgaXNTdGF0dXNVcGRhdGUgPSBkYXRhLmlkICYmIGRhdGEudHlwZSAmJiBkYXRhLmhhc093blByb3BlcnR5KCdkaXNhYmxlZCcpICYmIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YSkubGVuZ3RoID09PSAzO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzU3RhdHVzVXBkYXRlKSB7XG4gICAgICAgICAgICAvLyBNaW5pbWFsIHZhbGlkYXRpb24gZm9yIHN0YXR1cyB1cGRhdGVzXG4gICAgICAgICAgICByZXR1cm4gZGF0YS50eXBlICYmIFsnU0lQJywgJ0lBWCddLmluY2x1ZGVzKGRhdGEudHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFR5cGUgdmFsaWRhdGlvblxuICAgICAgICBpZiAoIWRhdGEudHlwZSB8fCAhWydTSVAnLCAnSUFYJ10uaW5jbHVkZXMoZGF0YS50eXBlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2VybmFtZSB2YWxpZGF0aW9uIChhbHBoYW51bWVyaWMgYW5kIGJhc2ljIHN5bWJvbHMpXG4gICAgICAgIGlmIChkYXRhLnVzZXJuYW1lICYmICEvXlthLXpBLVowLTkuXy1dKiQvLnRlc3QoZGF0YS51c2VybmFtZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSG9zdCB2YWxpZGF0aW9uIChkb21haW4gb3IgSVApXG4gICAgICAgIGlmIChkYXRhLmhvc3QpIHtcbiAgICAgICAgICAgIGNvbnN0IGhvc3RQYXR0ZXJuID0gL14oW2EtekEtWjAtOS4tXSt8XFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9XFwuXFxkezEsM30pJC87XG4gICAgICAgICAgICBpZiAoIWhvc3RQYXR0ZXJuLnRlc3QoZGF0YS5ob3N0KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUG9ydCB2YWxpZGF0aW9uXG4gICAgICAgIGlmIChkYXRhLnBvcnQgIT09IHVuZGVmaW5lZCAmJiBkYXRhLnBvcnQgIT09IG51bGwgJiYgZGF0YS5wb3J0ICE9PSAnJykge1xuICAgICAgICAgICAgY29uc3QgcG9ydCA9IHBhcnNlSW50KGRhdGEucG9ydCk7XG4gICAgICAgICAgICBpZiAoaXNOYU4ocG9ydCkgfHwgcG9ydCA8IDEgfHwgcG9ydCA+IDY1NTM1KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUcmFuc3BvcnQgdmFsaWRhdGlvbiBmb3IgU0lQXG4gICAgICAgIGlmIChkYXRhLnR5cGUgPT09ICdTSVAnICYmIGRhdGEudHJhbnNwb3J0KSB7XG4gICAgICAgICAgICBpZiAoIVsnVURQJywgJ1RDUCcsICdUTFMnXS5pbmNsdWRlcyhkYXRhLnRyYW5zcG9ydCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEV4dGVuc2lvbiB2YWxpZGF0aW9uIChudW1lcmljIG9ubHkpXG4gICAgICAgIGlmIChkYXRhLmV4dGVuc2lvbiAmJiAhL15bMC05XSokLy50ZXN0KGRhdGEuZXh0ZW5zaW9uKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBkcm9wZG93biBzZXR0aW5ncyBmb3IgcHJvdmlkZXIgc2VsZWN0aW9uIC0gQkFDS1dBUkQgQ09NUEFUSUJJTElUWVxuICAgICAqIFRoaXMgbWV0aG9kIG1haW50YWlucyBjb21wYXRpYmlsaXR5IHdpdGggZXhpc3RpbmcgZm9ybXMgdGhhdCB1c2UgdGhlIG9sZCBBUElcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufG9iamVjdH0gb25DaGFuZ2VDYWxsYmFjayAtIENhbGxiYWNrIHdoZW4gc2VsZWN0aW9uIGNoYW5nZXMgT1Igb3B0aW9ucyBvYmplY3RcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyAtIEFkZGl0aW9uYWwgb3B0aW9ucyAod2hlbiBmaXJzdCBwYXJhbSBpcyBjYWxsYmFjaylcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFNlbWFudGljIFVJIGRyb3Bkb3duIHNldHRpbmdzIG9iamVjdFxuICAgICAqL1xuICAgIGdldERyb3Bkb3duU2V0dGluZ3M6IGZ1bmN0aW9uKG9uQ2hhbmdlQ2FsbGJhY2ssIG9wdGlvbnMpIHtcbiAgICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCBwYXJhbWV0ZXIgY29tYmluYXRpb25zXG4gICAgICAgIGxldCBjYWxsYmFjayA9IG9uQ2hhbmdlQ2FsbGJhY2s7XG4gICAgICAgIGxldCBzZXR0aW5ncyA9IG9wdGlvbnMgfHwge307XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBmaXJzdCBwYXJhbWV0ZXIgaXMgYW4gb2JqZWN0LCB0cmVhdCBpdCBhcyBvcHRpb25zXG4gICAgICAgIGlmICh0eXBlb2Ygb25DaGFuZ2VDYWxsYmFjayA9PT0gJ29iamVjdCcgJiYgb25DaGFuZ2VDYWxsYmFjayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgc2V0dGluZ3MgPSBvbkNoYW5nZUNhbGxiYWNrO1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBzZXR0aW5ncy5vbkNoYW5nZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRGVmYXVsdCB2YWx1ZXNcbiAgICAgICAgY29uc3QgaW5jbHVkZU5vbmUgPSBzZXR0aW5ncy5pbmNsdWRlTm9uZSAhPT0gdW5kZWZpbmVkID8gc2V0dGluZ3MuaW5jbHVkZU5vbmUgOiB0cnVlO1xuICAgICAgICBjb25zdCBmb3JjZVNlbGVjdGlvbiA9IHNldHRpbmdzLmZvcmNlU2VsZWN0aW9uICE9PSB1bmRlZmluZWQgPyBzZXR0aW5ncy5mb3JjZVNlbGVjdGlvbiA6IGZhbHNlO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYXBpU2V0dGluZ3M6IHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdGhlIG5ldyBSRVNUIEFQSSB2MiBlbmRwb2ludFxuICAgICAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMuZ2V0TGlzdCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGNhY2hlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGluY2x1ZGVEaXNhYmxlZDogJ2ZhbHNlJyAgLy8gT25seSBzaG93IGVuYWJsZWQgcHJvdmlkZXJzIGluIGRyb3Bkb3duc1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25SZXNwb25zZTogZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHM6IFtdXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBUcmFuc2Zvcm0gQVBJIHJlc3BvbnNlIHRvIGRyb3Bkb3duIGZvcm1hdFxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHRzID0gcmVzcG9uc2UuZGF0YS5tYXAoZnVuY3Rpb24ocHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgJ3JlcHJlc2VudCcgZmllbGQgZnJvbSBzZXJ2ZXIgYXMtaXMsIGl0IGFscmVhZHkgY29udGFpbnMgdGhlIGljb25cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNlcnZlciBzZW5kczogXCI8aSBjbGFzcz1cXFwic2VydmVyIGljb25cXFwiPjwvaT4gSUFYOiBUZXN0IElBWCBQcm92aWRlclwiXG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHByb3ZpZGVyLmlkLCAgICAgICAgICAgLy8gVXNlIGlkIGFzIHRoZSB2YWx1ZSAodGhpcyBpcyB0aGUgcHJvdmlkZXIgSUQpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcHJvdmlkZXIucmVwcmVzZW50LCAgICAgLy8gVXNlIHNlcnZlcidzIHJlcHJlc2VudCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHByb3ZpZGVyLnJlcHJlc2VudCwgICAgIC8vIFNhbWUgZm9yIHRleHQgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIGFkZGl0aW9uYWwgZGF0YSBmb3IgZnV0dXJlIHVzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyVHlwZTogcHJvdmlkZXIudHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm92aWRlcklkOiBwcm92aWRlci5pZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0OiBwcm92aWRlci5ob3N0IHx8ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBwcm92aWRlci51c2VybmFtZSB8fCAnJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgJ05vbmUnIG9wdGlvbiBhdCB0aGUgYmVnaW5uaW5nIG9ubHkgaWYgaW5jbHVkZU5vbmUgaXMgdHJ1ZVxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5jbHVkZU5vbmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdHMudW5zaGlmdCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICdub25lJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBnbG9iYWxUcmFuc2xhdGUuaXJfQW55UHJvdmlkZXJfdjIgfHwgJ0FueSBwcm92aWRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmlyX0FueVByb3ZpZGVyX3YyIHx8ICdBbnkgcHJvdmlkZXInXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzOiByZXN1bHRzXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBzYXZlUmVtb3RlRGF0YTogdHJ1ZSxcbiAgICAgICAgICAgIGFsbG93Q2F0ZWdvcnlTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZvcmNlU2VsZWN0aW9uLCAgLy8gVXNlIHRoZSBmb3JjZVNlbGVjdGlvbiBwYXJhbWV0ZXJcbiAgICAgICAgICAgIGhpZGVEaXZpZGVyczogJ2VtcHR5JyxcbiAgICAgICAgICAgIGRpcmVjdGlvbjogJ2Rvd253YXJkJyxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbih2YWx1ZSwgdGV4dCwgJGNob2ljZSkge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBoaWRkZW4gaW5wdXQgZmllbGRzIGZvciBwcm92aWRlclxuICAgICAgICAgICAgICAgICQoJ2lucHV0W25hbWU9XCJwcm92aWRlclwiXSwgaW5wdXRbbmFtZT1cInByb3ZpZGVyaWRcIl0nKS52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENhbGwgdGhlIHByb3ZpZGVkIGNhbGxiYWNrIGlmIGl0IGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2sodmFsdWUsIHRleHQsICRjaG9pY2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG59OyJdfQ==