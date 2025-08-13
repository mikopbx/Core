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


    var processedData = _objectSpread({}, data);

    var method = processedData.id ? 'PUT' : 'POST';
    var url = processedData.id ? this.endpoints.saveRecord + '/' + processedData.id : this.endpoints.saveRecord;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvcHJvdmlkZXJzQVBJLmpzIl0sIm5hbWVzIjpbIlByb3ZpZGVyc0FQSSIsImVuZHBvaW50cyIsImdldExpc3QiLCJnZXRSZWNvcmQiLCJzYXZlUmVjb3JkIiwiZGVsZXRlUmVjb3JkIiwiZ2V0U3RhdHVzZXMiLCJ1cGRhdGVTdGF0dXMiLCJpZCIsInR5cGUiLCJjYWxsYmFjayIsImlzTmV3UmVjb3JkIiwidXJsIiwiJCIsImFwaSIsIm1ldGhvZCIsIm9uIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwic2FuaXRpemVQcm92aWRlckRhdGEiLCJvbkZhaWx1cmUiLCJvbkVycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsImluY2x1ZGVEaXNhYmxlZCIsIm1hcCIsIml0ZW0iLCJiaW5kIiwidmFsaWRhdGVQcm92aWRlckRhdGEiLCJwcm9jZXNzZWREYXRhIiwic3VjY2Vzc1Rlc3QiLCJQYnhBcGkiLCJnZXRTdGF0dXNCeUlkIiwicHJvdmlkZXJJZCIsInByb3ZpZGVyVHlwZSIsInRvVXBwZXJDYXNlIiwidXBkYXRlRGF0YSIsImRpc2FibGVkIiwic2FuaXRpemVkIiwibm90ZSIsIk9iamVjdCIsImFzc2lnbiIsInVzZXJuYW1lIiwic2VjcmV0IiwiaG9zdCIsInBvcnQiLCJwYXJzZUludCIsInRyYW5zcG9ydCIsInF1YWxpZnkiLCJxdWFsaWZ5ZnJlcSIsInJlZ2lzdHJhdGlvbl90eXBlIiwiZXh0ZW5zaW9uIiwiZGVzY3JpcHRpb24iLCJuZXR3b3JrZmlsdGVyaWQiLCJtYW51YWxhdHRyaWJ1dGVzIiwiZHRtZm1vZGUiLCJuYXQiLCJmcm9tdXNlciIsImZyb21kb21haW4iLCJvdXRib3VuZF9wcm94eSIsImRpc2FibGVmcm9tdXNlciIsIm5vcmVnaXN0ZXIiLCJyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCIsImFkZGl0aW9uYWxIb3N0cyIsImNpZF9zb3VyY2UiLCJjaWRfY3VzdG9tX2hlYWRlciIsImNpZF9wYXJzZXJfc3RhcnQiLCJjaWRfcGFyc2VyX2VuZCIsImNpZF9wYXJzZXJfcmVnZXgiLCJkaWRfc291cmNlIiwiZGlkX2N1c3RvbV9oZWFkZXIiLCJkaWRfcGFyc2VyX3N0YXJ0IiwiZGlkX3BhcnNlcl9lbmQiLCJkaWRfcGFyc2VyX3JlZ2V4IiwiY2lkX2RpZF9kZWJ1ZyIsImlzU3RhdHVzVXBkYXRlIiwiaGFzT3duUHJvcGVydHkiLCJrZXlzIiwibGVuZ3RoIiwiaW5jbHVkZXMiLCJ0ZXN0IiwiaG9zdFBhdHRlcm4iLCJ1bmRlZmluZWQiLCJpc05hTiIsImdldERyb3Bkb3duU2V0dGluZ3MiLCJvbkNoYW5nZUNhbGxiYWNrIiwib3B0aW9ucyIsInNldHRpbmdzIiwib25DaGFuZ2UiLCJpbmNsdWRlTm9uZSIsImZvcmNlU2VsZWN0aW9uIiwiYXBpU2V0dGluZ3MiLCJjYWNoZSIsIm9uUmVzcG9uc2UiLCJzdWNjZXNzIiwicmVzdWx0cyIsInByb3ZpZGVyIiwidmFsdWUiLCJuYW1lIiwidGV4dCIsInVuc2hpZnQiLCJnbG9iYWxUcmFuc2xhdGUiLCJpcl9BbnlQcm92aWRlcl92MiIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZpbHRlclJlbW90ZURhdGEiLCJzYXZlUmVtb3RlRGF0YSIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJoaWRlRGl2aWRlcnMiLCJkaXJlY3Rpb24iLCIkY2hvaWNlIiwidmFsIiwidHJpZ2dlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztBQUNqQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFO0FBQ1BDLElBQUFBLE9BQU8sRUFBRSxtQ0FERjtBQUVQQyxJQUFBQSxTQUFTLEVBQUUscUNBRko7QUFHUEMsSUFBQUEsVUFBVSxFQUFFLHNDQUhMO0FBSVBDLElBQUFBLFlBQVksRUFB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O0FBbUVIO0FBdGRnQixDQUFyQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBTZWN1cml0eVV0aWxzLCBQYnhBcGkgKi9cblxuLyoqXG4gKiBQcm92aWRlcnNBUEkgLSBSRVNUIEFQSSB2MiBmb3IgcHJvdmlkZXJzIG1hbmFnZW1lbnRcbiAqIFxuICogUHJvdmlkZXMgY2VudHJhbGl6ZWQgQVBJIG1ldGhvZHMgd2l0aCBidWlsdC1pbiBzZWN1cml0eSBmZWF0dXJlczpcbiAqIC0gSW5wdXQgc2FuaXRpemF0aW9uIGZvciBkaXNwbGF5XG4gKiAtIFhTUyBwcm90ZWN0aW9uXG4gKiAtIENvbnNpc3RlbnQgZXJyb3IgaGFuZGxpbmdcbiAqIC0gQ1NSRiBwcm90ZWN0aW9uIHRocm91Z2ggc2Vzc2lvbiBjb29raWVzXG4gKi9cbmNvbnN0IFByb3ZpZGVyc0FQSSA9IHtcbiAgICAvKipcbiAgICAgKiBBUEkgZW5kcG9pbnRzIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBlbmRwb2ludHM6IHtcbiAgICAgICAgZ2V0TGlzdDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0TGlzdCcsXG4gICAgICAgIGdldFJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZ2V0UmVjb3JkJyxcbiAgICAgICAgc2F2ZVJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvc2F2ZVJlY29yZCcsXG4gICAgICAgIGRlbGV0ZVJlY29yZDogJy9wYnhjb3JlL2FwaS92Mi9wcm92aWRlcnMvZGVsZXRlUmVjb3JkJyxcbiAgICAgICAgZ2V0U3RhdHVzZXM6ICcvcGJ4Y29yZS9hcGkvdjIvcHJvdmlkZXJzL2dldFN0YXR1c2VzJyxcbiAgICAgICAgdXBkYXRlU3RhdHVzOiAnL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy91cGRhdGVTdGF0dXMnXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIGJ5IElEIHdpdGggc2VjdXJpdHkgcHJvY2Vzc2luZ1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ld1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gUHJvdmlkZXIgdHlwZSAoU0lQIG9yIElBWClcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0UmVjb3JkOiBmdW5jdGlvbihpZCwgdHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgb3IgZXhpc3RpbmdcbiAgICAgICAgY29uc3QgaXNOZXdSZWNvcmQgPSAhaWQgfHwgaWQgPT09ICcnIHx8IGlkID09PSAnbmV3JztcbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBSRVNUZnVsIFVSTCB3aXRoIHBhdGggcGFyYW1ldGVyczogL2dldFJlY29yZC9TSVAvU0lQLVRSVU5LLTEyM1xuICAgICAgICAvLyBGYWxsIGJhY2sgdG8gcXVlcnkgcGFyYW1ldGVycyBmb3IgJ25ldycgcmVjb3Jkc1xuICAgICAgICBsZXQgdXJsO1xuICAgICAgICBpZiAoaXNOZXdSZWNvcmQpIHtcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgdXNlIHF1ZXJ5IHBhcmFtZXRlcnNcbiAgICAgICAgICAgIHVybCA9IHRoaXMuZW5kcG9pbnRzLmdldFJlY29yZCArICh0eXBlID8gJz90eXBlPScgKyB0eXBlIDogJycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMsIHVzZSBSRVNUZnVsIHBhdGg6IC9nZXRSZWNvcmQvU0lQL1NJUC1UUlVOSy0xMjNcbiAgICAgICAgICAgIHVybCA9IHRoaXMuZW5kcG9pbnRzLmdldFJlY29yZCArICcvJyArIHR5cGUgKyAnLycgKyBpZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgZGF0YSBmb3IgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gdGhpcy5zYW5pdGl6ZVByb3ZpZGVyRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGxpc3Qgb2YgYWxsIHByb3ZpZGVycyB3aXRoIHNlY3VyaXR5IHByb2Nlc3NpbmdcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0TGlzdDogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRMaXN0LFxuICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICBpbmNsdWRlRGlzYWJsZWQ6ICd0cnVlJyAgLy8gQWx3YXlzIGluY2x1ZGUgZGlzYWJsZWQgcHJvdmlkZXJzIGluIGFkbWluIHBhbmVsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgb25TdWNjZXNzOiAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FuaXRpemUgYXJyYXkgb2YgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEgPSByZXNwb25zZS5kYXRhLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zYW5pdGl6ZVByb3ZpZGVyRGF0YShpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgfS5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgZGF0YTogW119KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTYXZlIHByb3ZpZGVyIHJlY29yZCB3aXRoIHZhbGlkYXRpb24gYW5kIHNlY3VyaXR5XG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBEYXRhIHRvIHNhdmVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgc2F2ZVJlY29yZDogZnVuY3Rpb24oZGF0YSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAgICBpZiAoIXRoaXMudmFsaWRhdGVQcm92aWRlckRhdGEoZGF0YSkpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHtcbiAgICAgICAgICAgICAgICByZXN1bHQ6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICBtZXNzYWdlczoge2Vycm9yOiBbJ0NsaWVudC1zaWRlIHZhbGlkYXRpb24gZmFpbGVkJ119XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9ybS5qcyB3aXRoIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sPXRydWUgc2VuZHMgYWxsIGNoZWNrYm94ZXMgYXMgYm9vbGVhbiB2YWx1ZXNcbiAgICAgICAgLy8gU2VydmVyIGFjY2VwdHMgYm9vbGVhbiB2YWx1ZXMgZGlyZWN0bHksIG5vIGNvbnZlcnNpb24gbmVlZGVkXG4gICAgICAgIGNvbnN0IHByb2Nlc3NlZERhdGEgPSB7Li4uZGF0YX07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBtZXRob2QgPSBwcm9jZXNzZWREYXRhLmlkID8gJ1BVVCcgOiAnUE9TVCc7XG4gICAgICAgIGNvbnN0IHVybCA9IHByb2Nlc3NlZERhdGEuaWQgPyBcbiAgICAgICAgICAgIHRoaXMuZW5kcG9pbnRzLnNhdmVSZWNvcmQgKyAnLycgKyBwcm9jZXNzZWREYXRhLmlkIDogXG4gICAgICAgICAgICB0aGlzLmVuZHBvaW50cy5zYXZlUmVjb3JkO1xuICAgICAgICBcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgICAgIGRhdGE6IHByb2Nlc3NlZERhdGEsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gdGhpcy5zYW5pdGl6ZVByb3ZpZGVyRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVsZXRlIHByb3ZpZGVyIHJlY29yZFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIFJlY29yZCBJRFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQ6IGZ1bmN0aW9uKGlkLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmRlbGV0ZVJlY29yZCArICcvJyArIGlkLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnREVMRVRFJyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBwcm92aWRlciBzdGF0dXNlc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRTdGF0dXNlczogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRTdGF0dXNlcyxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IHt9fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHN0YXR1cyBmb3IgYSBzcGVjaWZpYyBwcm92aWRlciBieSBJRFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlcklkIC0gUHJvdmlkZXIgdW5pcXVlIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyVHlwZSAtIFByb3ZpZGVyIHR5cGUgKFNJUCBvciBJQVgpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldFN0YXR1c0J5SWQ6IGZ1bmN0aW9uKHByb3ZpZGVySWQsIHByb3ZpZGVyVHlwZSwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQnVpbGQgVVJMIHdpdGggdHlwZSBpZiBwcm92aWRlZCBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgICAgIGxldCB1cmwgPSAnL3BieGNvcmUvYXBpL3YyL3Byb3ZpZGVycy9nZXRTdGF0dXMvJztcbiAgICAgICAgaWYgKHByb3ZpZGVyVHlwZSkge1xuICAgICAgICAgICAgdXJsICs9IHByb3ZpZGVyVHlwZS50b1VwcGVyQ2FzZSgpICsgJy8nICsgcHJvdmlkZXJJZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHVybCArPSBwcm92aWRlcklkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmU6IChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soe3Jlc3VsdDogZmFsc2UsIGRhdGE6IG51bGx9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcHJvdmlkZXIgc3RhdHVzIChlbmFibGUvZGlzYWJsZSlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgd2l0aCBpZCwgdHlwZSwgYW5kIGRpc2FibGVkIHN0YXR1c1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICB1cGRhdGVTdGF0dXM6IGZ1bmN0aW9uKGRhdGEsIGNhbGxiYWNrKSB7XG4gICAgICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgICAgICBpZiAoIWRhdGEuaWQgfHwgIWRhdGEudHlwZSkge1xuICAgICAgICAgICAgY2FsbGJhY2soe1xuICAgICAgICAgICAgICAgIHJlc3VsdDogZmFsc2UsIFxuICAgICAgICAgICAgICAgIG1lc3NhZ2VzOiB7ZXJyb3I6IFsnUHJvdmlkZXIgSUQgYW5kIHR5cGUgYXJlIHJlcXVpcmVkJ119XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCBkYXRhIHRvIHByb3BlciBmb3JtYXRcbiAgICAgICAgY29uc3QgdXBkYXRlRGF0YSA9IHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkLFxuICAgICAgICAgICAgdHlwZTogZGF0YS50eXBlLnRvVXBwZXJDYXNlKCksXG4gICAgICAgICAgICBkaXNhYmxlZDogISFkYXRhLmRpc2FibGVkXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLnVwZGF0ZVN0YXR1cyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogdXBkYXRlRGF0YSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG9uU3VjY2VzczogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZTogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3I6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh7cmVzdWx0OiBmYWxzZSwgbWVzc2FnZXM6IHtlcnJvcjogWydOZXR3b3JrIGVycm9yJ119fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2FuaXRpemUgcHJvdmlkZXIgZGF0YSBmb3Igc2VjdXJlIGRpc3BsYXlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R9IERhdGEgcmVhZHkgZm9yIGRpc3BsYXlcbiAgICAgKi9cbiAgICBzYW5pdGl6ZVByb3ZpZGVyRGF0YTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBpZiAoIWRhdGEpIHJldHVybiBkYXRhO1xuICAgICAgICBcbiAgICAgICAgY29uc3Qgc2FuaXRpemVkID0ge1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQsXG4gICAgICAgICAgICB0eXBlOiBkYXRhLnR5cGUgfHwgJ1NJUCcsXG4gICAgICAgICAgICBub3RlOiBkYXRhLm5vdGUgfHwgJycsXG4gICAgICAgICAgICBkaXNhYmxlZDogISFkYXRhLmRpc2FibGVkXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBTSVAtc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIGlmIChkYXRhLnR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKHNhbml0aXplZCwge1xuICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBkYXRhLnVzZXJuYW1lIHx8ICcnLFxuICAgICAgICAgICAgICAgIHNlY3JldDogZGF0YS5zZWNyZXQgfHwgJycsXG4gICAgICAgICAgICAgICAgaG9zdDogZGF0YS5ob3N0IHx8ICcnLFxuICAgICAgICAgICAgICAgIHBvcnQ6IHBhcnNlSW50KGRhdGEucG9ydCkgfHwgNTA2MCxcbiAgICAgICAgICAgICAgICB0cmFuc3BvcnQ6IGRhdGEudHJhbnNwb3J0IHx8ICdVRFAnLFxuICAgICAgICAgICAgICAgIHF1YWxpZnk6ICEhZGF0YS5xdWFsaWZ5LFxuICAgICAgICAgICAgICAgIHF1YWxpZnlmcmVxOiBwYXJzZUludChkYXRhLnF1YWxpZnlmcmVxKSB8fCA2MCxcbiAgICAgICAgICAgICAgICByZWdpc3RyYXRpb25fdHlwZTogZGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCAnb3V0Ym91bmQnLFxuICAgICAgICAgICAgICAgIGV4dGVuc2lvbjogZGF0YS5leHRlbnNpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgbmV0d29ya2ZpbHRlcmlkOiBkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnJyxcbiAgICAgICAgICAgICAgICBtYW51YWxhdHRyaWJ1dGVzOiBkYXRhLm1hbnVhbGF0dHJpYnV0ZXMgfHwgJycsXG4gICAgICAgICAgICAgICAgZHRtZm1vZGU6IGRhdGEuZHRtZm1vZGUgfHwgJ2F1dG8nLFxuICAgICAgICAgICAgICAgIG5hdDogZGF0YS5uYXQgfHwgJ2F1dG9fZm9yY2UnLFxuICAgICAgICAgICAgICAgIGZyb211c2VyOiBkYXRhLmZyb211c2VyIHx8ICcnLFxuICAgICAgICAgICAgICAgIGZyb21kb21haW46IGRhdGEuZnJvbWRvbWFpbiB8fCAnJyxcbiAgICAgICAgICAgICAgICBvdXRib3VuZF9wcm94eTogZGF0YS5vdXRib3VuZF9wcm94eSB8fCAnJyxcbiAgICAgICAgICAgICAgICBkaXNhYmxlZnJvbXVzZXI6ICEhZGF0YS5kaXNhYmxlZnJvbXVzZXIsXG4gICAgICAgICAgICAgICAgbm9yZWdpc3RlcjogISFkYXRhLm5vcmVnaXN0ZXIsXG4gICAgICAgICAgICAgICAgcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGg6ICEhZGF0YS5yZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsSG9zdHM6IGRhdGEuYWRkaXRpb25hbEhvc3RzIHx8IFtdLFxuICAgICAgICAgICAgICAgIC8vIENhbGxlcklEL0RJRCBmaWVsZHNcbiAgICAgICAgICAgICAgICBjaWRfc291cmNlOiBkYXRhLmNpZF9zb3VyY2UgfHwgJ2RlZmF1bHQnLFxuICAgICAgICAgICAgICAgIGNpZF9jdXN0b21faGVhZGVyOiBkYXRhLmNpZF9jdXN0b21faGVhZGVyIHx8ICcnLFxuICAgICAgICAgICAgICAgIGNpZF9wYXJzZXJfc3RhcnQ6IGRhdGEuY2lkX3BhcnNlcl9zdGFydCB8fCAnJyxcbiAgICAgICAgICAgICAgICBjaWRfcGFyc2VyX2VuZDogZGF0YS5jaWRfcGFyc2VyX2VuZCB8fCAnJyxcbiAgICAgICAgICAgICAgICBjaWRfcGFyc2VyX3JlZ2V4OiBkYXRhLmNpZF9wYXJzZXJfcmVnZXggfHwgJycsXG4gICAgICAgICAgICAgICAgZGlkX3NvdXJjZTogZGF0YS5kaWRfc291cmNlIHx8ICdkZWZhdWx0JyxcbiAgICAgICAgICAgICAgICBkaWRfY3VzdG9tX2hlYWRlcjogZGF0YS5kaWRfY3VzdG9tX2hlYWRlciB8fCAnJyxcbiAgICAgICAgICAgICAgICBkaWRfcGFyc2VyX3N0YXJ0OiBkYXRhLmRpZF9wYXJzZXJfc3RhcnQgfHwgJycsXG4gICAgICAgICAgICAgICAgZGlkX3BhcnNlcl9lbmQ6IGRhdGEuZGlkX3BhcnNlcl9lbmQgfHwgJycsXG4gICAgICAgICAgICAgICAgZGlkX3BhcnNlcl9yZWdleDogZGF0YS5kaWRfcGFyc2VyX3JlZ2V4IHx8ICcnLFxuICAgICAgICAgICAgICAgIGNpZF9kaWRfZGVidWc6ICEhZGF0YS5jaWRfZGlkX2RlYnVnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSUFYLXNwZWNpZmljIGZpZWxkc1xuICAgICAgICBpZiAoZGF0YS50eXBlID09PSAnSUFYJykge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihzYW5pdGl6ZWQsIHtcbiAgICAgICAgICAgICAgICB1c2VybmFtZTogZGF0YS51c2VybmFtZSB8fCAnJyxcbiAgICAgICAgICAgICAgICBzZWNyZXQ6IGRhdGEuc2VjcmV0IHx8ICcnLFxuICAgICAgICAgICAgICAgIGhvc3Q6IGRhdGEuaG9zdCB8fCAnJyxcbiAgICAgICAgICAgICAgICBxdWFsaWZ5OiAhIWRhdGEucXVhbGlmeSxcbiAgICAgICAgICAgICAgICByZWdpc3RyYXRpb25fdHlwZTogZGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCAnbm9uZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgICAgICAgbWFudWFsYXR0cmlidXRlczogZGF0YS5tYW51YWxhdHRyaWJ1dGVzIHx8ICcnLFxuICAgICAgICAgICAgICAgIG5vcmVnaXN0ZXI6ICEhZGF0YS5ub3JlZ2lzdGVyLFxuICAgICAgICAgICAgICAgIG5ldHdvcmtmaWx0ZXJpZDogZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgJycsXG4gICAgICAgICAgICAgICAgcG9ydDogZGF0YS5wb3J0IHx8ICcnLFxuICAgICAgICAgICAgICAgIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoOiAhIWRhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGhcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc2FuaXRpemVkO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSB0byB2YWxpZGF0ZVxuICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IFZhbGlkYXRpb24gcmVzdWx0XG4gICAgICovXG4gICAgdmFsaWRhdGVQcm92aWRlckRhdGE6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIHN0YXR1cy1vbmx5IHVwZGF0ZSAoY29udGFpbnMgb25seSBpZCwgdHlwZSwgZGlzYWJsZWQpXG4gICAgICAgIGNvbnN0IGlzU3RhdHVzVXBkYXRlID0gZGF0YS5pZCAmJiBkYXRhLnR5cGUgJiYgZGF0YS5oYXNPd25Qcm9wZXJ0eSgnZGlzYWJsZWQnKSAmJiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEpLmxlbmd0aCA9PT0gMztcbiAgICAgICAgXG4gICAgICAgIGlmIChpc1N0YXR1c1VwZGF0ZSkge1xuICAgICAgICAgICAgLy8gTWluaW1hbCB2YWxpZGF0aW9uIGZvciBzdGF0dXMgdXBkYXRlc1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudHlwZSAmJiBbJ1NJUCcsICdJQVgnXS5pbmNsdWRlcyhkYXRhLnR5cGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUeXBlIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKCFkYXRhLnR5cGUgfHwgIVsnU0lQJywgJ0lBWCddLmluY2x1ZGVzKGRhdGEudHlwZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXNlcm5hbWUgdmFsaWRhdGlvbiAoYWxwaGFudW1lcmljIGFuZCBiYXNpYyBzeW1ib2xzKVxuICAgICAgICBpZiAoZGF0YS51c2VybmFtZSAmJiAhL15bYS16QS1aMC05Ll8tXSokLy50ZXN0KGRhdGEudXNlcm5hbWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhvc3QgdmFsaWRhdGlvbiAoZG9tYWluIG9yIElQKVxuICAgICAgICBpZiAoZGF0YS5ob3N0KSB7XG4gICAgICAgICAgICBjb25zdCBob3N0UGF0dGVybiA9IC9eKFthLXpBLVowLTkuLV0rfFxcZHsxLDN9XFwuXFxkezEsM31cXC5cXGR7MSwzfVxcLlxcZHsxLDN9KSQvO1xuICAgICAgICAgICAgaWYgKCFob3N0UGF0dGVybi50ZXN0KGRhdGEuaG9zdCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFBvcnQgdmFsaWRhdGlvblxuICAgICAgICBpZiAoZGF0YS5wb3J0ICE9PSB1bmRlZmluZWQgJiYgZGF0YS5wb3J0ICE9PSBudWxsICYmIGRhdGEucG9ydCAhPT0gJycpIHtcbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBwYXJzZUludChkYXRhLnBvcnQpO1xuICAgICAgICAgICAgaWYgKGlzTmFOKHBvcnQpIHx8IHBvcnQgPCAxIHx8IHBvcnQgPiA2NTUzNSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVHJhbnNwb3J0IHZhbGlkYXRpb24gZm9yIFNJUFxuICAgICAgICBpZiAoZGF0YS50eXBlID09PSAnU0lQJyAmJiBkYXRhLnRyYW5zcG9ydCkge1xuICAgICAgICAgICAgaWYgKCFbJ1VEUCcsICdUQ1AnLCAnVExTJ10uaW5jbHVkZXMoZGF0YS50cmFuc3BvcnQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gdmFsaWRhdGlvbiAobnVtZXJpYyBvbmx5KVxuICAgICAgICBpZiAoZGF0YS5leHRlbnNpb24gJiYgIS9eWzAtOV0qJC8udGVzdChkYXRhLmV4dGVuc2lvbikpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHByb3ZpZGVyIHNlbGVjdGlvbiAtIEJBQ0tXQVJEIENPTVBBVElCSUxJVFlcbiAgICAgKiBUaGlzIG1ldGhvZCBtYWludGFpbnMgY29tcGF0aWJpbGl0eSB3aXRoIGV4aXN0aW5nIGZvcm1zIHRoYXQgdXNlIHRoZSBvbGQgQVBJXG4gICAgICogXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbnxvYmplY3R9IG9uQ2hhbmdlQ2FsbGJhY2sgLSBDYWxsYmFjayB3aGVuIHNlbGVjdGlvbiBjaGFuZ2VzIE9SIG9wdGlvbnMgb2JqZWN0XG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBBZGRpdGlvbmFsIG9wdGlvbnMgKHdoZW4gZmlyc3QgcGFyYW0gaXMgY2FsbGJhY2spXG4gICAgICogQHJldHVybiB7b2JqZWN0fSBTZW1hbnRpYyBVSSBkcm9wZG93biBzZXR0aW5ncyBvYmplY3RcbiAgICAgKi9cbiAgICBnZXREcm9wZG93blNldHRpbmdzOiBmdW5jdGlvbihvbkNoYW5nZUNhbGxiYWNrLCBvcHRpb25zKSB7XG4gICAgICAgIC8vIEhhbmRsZSBkaWZmZXJlbnQgcGFyYW1ldGVyIGNvbWJpbmF0aW9uc1xuICAgICAgICBsZXQgY2FsbGJhY2sgPSBvbkNoYW5nZUNhbGxiYWNrO1xuICAgICAgICBsZXQgc2V0dGluZ3MgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgZmlyc3QgcGFyYW1ldGVyIGlzIGFuIG9iamVjdCwgdHJlYXQgaXQgYXMgb3B0aW9uc1xuICAgICAgICBpZiAodHlwZW9mIG9uQ2hhbmdlQ2FsbGJhY2sgPT09ICdvYmplY3QnICYmIG9uQ2hhbmdlQ2FsbGJhY2sgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHNldHRpbmdzID0gb25DaGFuZ2VDYWxsYmFjaztcbiAgICAgICAgICAgIGNhbGxiYWNrID0gc2V0dGluZ3Mub25DaGFuZ2U7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIERlZmF1bHQgdmFsdWVzXG4gICAgICAgIGNvbnN0IGluY2x1ZGVOb25lID0gc2V0dGluZ3MuaW5jbHVkZU5vbmUgIT09IHVuZGVmaW5lZCA/IHNldHRpbmdzLmluY2x1ZGVOb25lIDogdHJ1ZTtcbiAgICAgICAgY29uc3QgZm9yY2VTZWxlY3Rpb24gPSBzZXR0aW5ncy5mb3JjZVNlbGVjdGlvbiAhPT0gdW5kZWZpbmVkID8gc2V0dGluZ3MuZm9yY2VTZWxlY3Rpb24gOiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGFwaVNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIHRoZSBuZXcgUkVTVCBBUEkgdjIgZW5kcG9pbnRcbiAgICAgICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmdldExpc3QsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBjYWNoZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRGlzYWJsZWQ6ICdmYWxzZScgIC8vIE9ubHkgc2hvdyBlbmFibGVkIHByb3ZpZGVycyBpbiBkcm9wZG93bnNcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uUmVzcG9uc2U6IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCB8fCAhcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzOiBbXVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJhbnNmb3JtIEFQSSByZXNwb25zZSB0byBkcm9wZG93biBmb3JtYXRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0cyA9IHJlc3BvbnNlLmRhdGEubWFwKGZ1bmN0aW9uKHByb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVc2UgdGhlICduYW1lJyBmaWVsZCBmcm9tIHNlcnZlciBhcy1pcywgaXQgYWxyZWFkeSBjb250YWlucyB0aGUgaWNvblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2VydmVyIHNlbmRzOiBcIjxpIGNsYXNzPVxcXCJzZXJ2ZXIgaWNvblxcXCI+PC9pPiBJQVg6IFRlc3QgSUFYIFByb3ZpZGVyXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogcHJvdmlkZXIuaWQsICAgICAgICAgICAvLyBVc2UgaWQgYXMgdGhlIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogcHJvdmlkZXIubmFtZSwgICAgICAgICAgLy8gVXNlIHNlcnZlcidzIG5hbWUgZmllbGQgYXMtaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBwcm92aWRlci5uYW1lLCAgICAgICAgICAvLyBTYW1lIGZvciB0ZXh0IGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBhZGRpdGlvbmFsIGRhdGEgZm9yIGZ1dHVyZSB1c2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm92aWRlclR5cGU6IHByb3ZpZGVyLnR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJJZDogcHJvdmlkZXIuaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9zdDogcHJvdmlkZXIuaG9zdCB8fCAnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VybmFtZTogcHJvdmlkZXIudXNlcm5hbWUgfHwgJydcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQWRkICdOb25lJyBvcHRpb24gYXQgdGhlIGJlZ2lubmluZyBvbmx5IGlmIGluY2x1ZGVOb25lIGlzIHRydWVcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVOb25lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnVuc2hpZnQoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnbm9uZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogZ2xvYmFsVHJhbnNsYXRlLmlyX0FueVByb3ZpZGVyX3YyIHx8ICdBbnkgcHJvdmlkZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pcl9BbnlQcm92aWRlcl92MiB8fCAnQW55IHByb3ZpZGVyJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0czogcmVzdWx0c1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiB0cnVlLFxuICAgICAgICAgICAgc2F2ZVJlbW90ZURhdGE6IHRydWUsXG4gICAgICAgICAgICBhbGxvd0NhdGVnb3J5U2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmb3JjZVNlbGVjdGlvbiwgIC8vIFVzZSB0aGUgZm9yY2VTZWxlY3Rpb24gcGFyYW1ldGVyXG4gICAgICAgICAgICBoaWRlRGl2aWRlcnM6ICdlbXB0eScsXG4gICAgICAgICAgICBkaXJlY3Rpb246ICdkb3dud2FyZCcsXG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24odmFsdWUsIHRleHQsICRjaG9pY2UpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaGlkZGVuIGlucHV0IGZpZWxkcyBmb3IgcHJvdmlkZXJcbiAgICAgICAgICAgICAgICAkKCdpbnB1dFtuYW1lPVwicHJvdmlkZXJcIl0sIGlucHV0W25hbWU9XCJwcm92aWRlcmlkXCJdJykudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDYWxsIHRoZSBwcm92aWRlZCBjYWxsYmFjayBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxufTsiXX0=