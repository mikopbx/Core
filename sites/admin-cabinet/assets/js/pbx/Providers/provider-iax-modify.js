"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, ProviderIaxTooltipManager, ProviderTooltipManager, i18n, IaxProvidersAPI */

/**
 * IAX provider management form
 * @class ProviderIAX
 */
var ProviderIAX = /*#__PURE__*/function (_ProviderBase) {
  _inherits(ProviderIAX, _ProviderBase);

  var _super = _createSuper(ProviderIAX);

  function ProviderIAX() {
    _classCallCheck(this, ProviderIAX);

    return _super.call(this, 'IAX');
  }
  /**
   * Initialize the provider form
   */


  _createClass(ProviderIAX, [{
    key: "initialize",
    value: function initialize() {
      var _this = this;

      _get(_getPrototypeOf(ProviderIAX.prototype), "initialize", this).call(this); // IAX-specific initialization


      this.initializeIaxWarningMessage();
      this.initializeRealtimeValidation();
      this.initializeRegistrationTypeHandlers(); // Initialize tabs

      this.initializeTabs(); // Re-validate form when receive_calls_without_auth changes

      $('#receive_calls_without_auth.checkbox').checkbox('setting', 'onChange', function () {
        var regType = $('#registration_type').val(); // Clear any existing error on secret field

        _this.$formObj.form('remove prompt', 'secret');

        _this.$secret.closest('.field').removeClass('error'); // For inbound registration, validate based on checkbox state


        if (regType === 'inbound') {
          var isChecked = $('#receive_calls_without_auth').checkbox('is checked');

          if (!isChecked && _this.$secret.val() === '') {
            // If unchecked and password is empty, show error
            setTimeout(function () {
              _this.$formObj.form('validate field', 'secret');
            }, 100);
          }
        } // Mark form as changed


        Form.dataChanged();
      }); // Initialize field help tooltips

      this.initializeFieldTooltips();
    }
    /**
     * Initialize tab functionality
     */

  }, {
    key: "initializeTabs",
    value: function initializeTabs() {
      var self = this; // Disable diagnostics tab for new providers

      if (this.isNewProvider) {
        $('#provider-tabs-menu .item[data-tab="diagnostics"]').addClass('disabled');
      } else {
        $('#provider-tabs-menu .item[data-tab="diagnostics"]').removeClass('disabled');
      }

      $('#provider-tabs-menu .item').tab({
        onVisible: function onVisible(tabPath) {
          if (tabPath === 'diagnostics' && typeof providerModifyStatusWorker !== 'undefined' && !self.isNewProvider) {
            // Initialize diagnostics tab when it becomes visible
            providerModifyStatusWorker.initializeDiagnosticsTab();
          }
        },
        onLoad: function onLoad(tabPath, parameterArray, historyEvent) {
          // Block loading of diagnostics tab for new providers
          if (tabPath === 'diagnostics' && self.isNewProvider) {
            // Switch back to settings tab
            $('#provider-tabs-menu .item[data-tab="settings"]').tab('change tab', 'settings');
            return false;
          }
        }
      }); // Additional click prevention for disabled tab

      $('#provider-tabs-menu .item[data-tab="diagnostics"]').off('click.disabled').on('click.disabled', function (e) {
        if (self.isNewProvider) {
          e.preventDefault();
          e.stopImmediatePropagation(); // Ensure we stay on settings tab

          $('#provider-tabs-menu .item[data-tab="settings"]').tab('change tab', 'settings');
          return false;
        }
      });
    }
    /**
     * Initialize field help tooltips
     */

  }, {
    key: "initializeFieldTooltips",
    value: function initializeFieldTooltips() {
      ProviderIaxTooltipManager.initialize();
    }
    /**
     * Initialize IAX warning message
     */

  }, {
    key: "initializeIaxWarningMessage",
    value: function initializeIaxWarningMessage() {
      // Show IAX deprecated warning if enabled
      var showIaxWarning = $('#show-iax-warning').val() === '1';

      if (showIaxWarning) {
        var warningHtml = "\n                <div class=\"ui warning message\" id=\"iax-deprecation-notice\">\n                    <i class=\"close icon\"></i>\n                    <div class=\"header\">\n                        ".concat(globalTranslate.iax_DeprecationWarningTitle || 'IAX Protocol Notice', "\n                    </div>\n                    <p>").concat(globalTranslate.iax_DeprecationWarningText || 'IAX protocol is deprecated. Consider using SIP instead.', "</p>\n                </div>\n            ");
        $('#iax-warning-placeholder').html(warningHtml); // Allow user to close the warning

        $('#iax-deprecation-notice .close.icon').on('click', function () {
          $(this).closest('.message').transition('fade');
        });
      }
    }
    /**
     * Initialize real-time validation for specific fields
     */

  }, {
    key: "initializeRealtimeValidation",
    value: function initializeRealtimeValidation() {
      // Real-time validation for username - restrict special characters
      $('#username').on('input', function () {
        var $this = $(this);
        var value = $this.val(); // Allow only alphanumeric, dash and underscore

        var cleanValue = value.replace(/[^a-zA-Z0-9_-]/g, '');

        if (value !== cleanValue) {
          $this.val(cleanValue); // Show warning about invalid characters

          $this.closest('.field').addClass('error');
          $this.parent().append('<div class="ui pointing red basic label temporary-warning">' + (globalTranslate.pr_ValidationProviderLoginInvalidCharacters || 'Only letters, numbers, dash and underscore allowed') + '</div>'); // Remove warning after 3 seconds

          setTimeout(function () {
            $('.temporary-warning').remove();
            $this.closest('.field').removeClass('error');
          }, 3000);
        }
      });
    }
    /**
     * Initialize registration type change handlers
     */

  }, {
    key: "initializeRegistrationTypeHandlers",
    value: function initializeRegistrationTypeHandlers() {// Already handled by parent class dropdown initialization
      // This is for IAX-specific behavior if needed
    }
    /**
     * Get validation rules based on provider settings
     * @returns {object} Validation rules for the form
     */

  }, {
    key: "getValidateRules",
    value: function getValidateRules() {
      var regType = $('#registration_type').val();
      var rules = {}; // Common rules for all registration types

      rules.description = {
        identifier: 'description',
        rules: [{
          type: 'empty',
          prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
        }]
      }; // Rules based on registration type

      if (regType === 'outbound') {
        // OUTBOUND: We register to provider
        rules.host = {
          identifier: 'host',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
          }, {
            type: 'regExp',
            value: '/^[a-zA-Z0-9.-]+$/',
            prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters || 'Host can only contain letters, numbers, dots and hyphens'
          }]
        };
        rules.username = {
          identifier: 'username',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
          }, {
            type: 'regExp',
            value: '/^[a-zA-Z0-9_-]+$/',
            prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters
          }]
        };
        rules.secret = {
          identifier: 'secret',
          rules: [] // No validation for outbound passwords

        };
        rules.port = {
          identifier: 'port',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
          }, {
            type: 'integer[1..65535]',
            prompt: globalTranslate.pr_ValidationProviderPortInvalid
          }]
        };
      } else if (regType === 'inbound') {
        // INBOUND: Provider connects to us
        var receiveCallsChecked = $('#receive_calls_without_auth').checkbox('is checked');
        rules.username = {
          identifier: 'username',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
          }, {
            type: 'regExp',
            value: '/^[a-zA-Z0-9_-]+$/',
            prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters
          }]
        }; // Password validation only if receive_calls_without_auth is NOT checked

        if (!receiveCallsChecked) {
          rules.secret = {
            identifier: 'secret',
            rules: [{
              type: 'empty',
              prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
            }, {
              type: 'minLength[5]',
              prompt: globalTranslate.pr_ValidationProviderPasswordTooShort
            }]
          };
        } // Host is optional for inbound
        // Port is not shown for inbound

      } else if (regType === 'none') {
        // NONE: Static peer-to-peer connection
        rules.host = {
          identifier: 'host',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
          }, {
            type: 'regExp',
            value: '/^[a-zA-Z0-9.-]+$/',
            prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters || 'Host can only contain letters, numbers, dots and hyphens'
          }]
        };
        rules.username = {
          identifier: 'username',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
          }, {
            type: 'regExp',
            value: '/^[a-zA-Z0-9_-]+$/',
            prompt: globalTranslate.pr_ValidationProviderLoginInvalidCharacters
          }]
        }; // Password is optional for none mode

        rules.secret = {
          identifier: 'secret',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
          }]
        };
        rules.port = {
          identifier: 'port',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
          }, {
            type: 'integer[1..65535]',
            prompt: globalTranslate.pr_ValidationProviderPortInvalid
          }]
        };
      }

      return rules;
    }
    /**
     * Initialize form with REST API configuration
     */

  }, {
    key: "initializeForm",
    value: function initializeForm() {
      Form.$formObj = this.$formObj;
      Form.url = '#'; // Not used with REST API

      Form.validateRules = this.getValidateRules();
      Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
      Form.cbAfterSendForm = this.cbAfterSendForm.bind(this); // Configure REST API settings for v3 with auto-detection

      Form.apiSettings = {
        enabled: true,
        apiObject: IaxProvidersAPI,
        // Use IAX-specific API client v3
        autoDetectMethod: true // Automatically detect create/update based on id field

      }; // Set redirect URLs for save modes

      Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "providers/index/");
      Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "providers/modifyiax/"); // Enable automatic checkbox to boolean conversion

      Form.convertCheckboxesToBool = true; // Initialize the form - this was missing!

      Form.initialize(); // Mark form as fully initialized

      this.formInitialized = true;
    }
    /**
     * Update the visibility of elements based on the registration type
     */

  }, {
    key: "updateVisibilityElements",
    value: function updateVisibilityElements() {
      var _config$required,
          _config$optional,
          _this2 = this;

      var regType = $('#registration_type').val();
      var providerId = $('#id').val(); // Cache DOM elements

      var elements = {
        host: $('#elHost'),
        port: $('#elPort'),
        username: $('#elUsername'),
        secret: $('#elSecret'),
        receiveCalls: $('#elReceiveCalls'),
        networkFilter: $('#elNetworkFilter')
      };
      var fields = {
        username: $('#username'),
        secret: this.$secret,
        port: $('#port'),
        qualify: $('#qualify')
      };
      var labels = {
        host: $('#hostLabelText'),
        port: $('#portLabelText'),
        username: $('#usernameLabelText'),
        secret: $('#secretLabelText')
      }; // Configuration for each registration type

      var configs = {
        outbound: {
          visible: ['host', 'port', 'username', 'secret'],
          hidden: ['receiveCalls', 'networkFilter'],
          required: ['host', 'port', 'username', 'secret'],
          labels: {
            host: globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP',
            port: globalTranslate.pr_ProviderPort || 'Provider Port',
            username: globalTranslate.pr_ProviderLogin || 'Login',
            secret: globalTranslate.pr_ProviderPassword || 'Password'
          },
          passwordWidget: {
            generateButton: false,
            showPasswordButton: false,
            clipboardButton: false,
            showStrengthBar: false,
            validation: PasswordWidget.VALIDATION.NONE
          },
          defaultPort: '4569'
        },
        inbound: {
          visible: ['host', 'username', 'secret', 'receiveCalls', 'networkFilter'],
          hidden: ['port'],
          required: ['username', 'secret'],
          optional: ['host', 'port'],
          labels: {
            host: globalTranslate.pr_RemoteHostOrIPAddress || 'Remote Host/IP',
            username: globalTranslate.pr_AuthenticationUsername || 'Authentication Username',
            secret: globalTranslate.pr_AuthenticationPassword || 'Authentication Password'
          },
          passwordWidget: {
            generateButton: true,
            showPasswordButton: true,
            clipboardButton: true,
            showStrengthBar: true,
            validation: PasswordWidget.VALIDATION.SOFT
          },
          readonlyUsername: true,
          autoGeneratePassword: true
        },
        none: {
          visible: ['host', 'port', 'username', 'secret', 'receiveCalls', 'networkFilter'],
          hidden: [],
          required: ['host', 'port', 'username'],
          optional: ['secret'],
          labels: {
            host: globalTranslate.pr_PeerHostOrIPAddress || 'Peer Host/IP',
            port: globalTranslate.pr_PeerPort || 'Peer Port',
            username: globalTranslate.pr_PeerUsername || 'Peer Username',
            secret: globalTranslate.pr_PeerPassword || 'Peer Password'
          },
          passwordWidget: {
            generateButton: true,
            showPasswordButton: true,
            clipboardButton: true,
            showStrengthBar: true,
            validation: PasswordWidget.VALIDATION.SOFT
          },
          defaultPort: '4569',
          showPasswordTooltip: true
        }
      }; // Get current configuration

      var config = configs[regType] || configs.outbound; // Apply visibility

      config.visible.forEach(function (key) {
        var _elements$key;

        return (_elements$key = elements[key]) === null || _elements$key === void 0 ? void 0 : _elements$key.show();
      });
      config.hidden.forEach(function (key) {
        var _elements$key2;

        return (_elements$key2 = elements[key]) === null || _elements$key2 === void 0 ? void 0 : _elements$key2.hide();
      }); // Apply required/optional classes

      (_config$required = config.required) === null || _config$required === void 0 ? void 0 : _config$required.forEach(function (key) {
        var _elements$key3;

        return (_elements$key3 = elements[key]) === null || _elements$key3 === void 0 ? void 0 : _elements$key3.addClass('required');
      });
      (_config$optional = config.optional) === null || _config$optional === void 0 ? void 0 : _config$optional.forEach(function (key) {
        var _elements$key4;

        return (_elements$key4 = elements[key]) === null || _elements$key4 === void 0 ? void 0 : _elements$key4.removeClass('required');
      }); // Update labels

      Object.entries(config.labels).forEach(function (_ref) {
        var _labels$key;

        var _ref2 = _slicedToArray(_ref, 2),
            key = _ref2[0],
            text = _ref2[1];

        (_labels$key = labels[key]) === null || _labels$key === void 0 ? void 0 : _labels$key.text(text);
      }); // Handle username field for inbound

      if (config.readonlyUsername) {
        fields.username.val(providerId).attr('readonly', '');
      } else {
        fields.username.removeAttr('readonly');
      } // Auto-generate password for inbound if empty


      if (config.autoGeneratePassword && fields.secret.val().trim() === '' && this.passwordWidget) {
        var _this$passwordWidget$;

        (_this$passwordWidget$ = this.passwordWidget.elements.$generateBtn) === null || _this$passwordWidget$ === void 0 ? void 0 : _this$passwordWidget$.trigger('click');
      } // Set default port if needed


      if (config.defaultPort && (fields.port.val() === '' || fields.port.val() === '0')) {
        fields.port.val(config.defaultPort);
      } // Update password widget configuration


      if (this.passwordWidget && config.passwordWidget) {
        PasswordWidget.updateConfig(this.passwordWidget, config.passwordWidget);
      } // Handle password tooltip


      if (config.showPasswordTooltip) {
        this.showPasswordTooltip();
      } else {
        this.hidePasswordTooltip();
      } // Always enable qualify for IAX (NAT keepalive)


      fields.qualify.prop('checked', true).val('1'); // Clear validation errors for hidden fields

      config.hidden.forEach(function (key) {
        var fieldName = key.replace('el', '').toLowerCase();

        _this2.$formObj.form('remove prompt', fieldName);

        $("#".concat(fieldName)).closest('.field').removeClass('error');
      });
    }
    /**
     * Callback before form submission
     * @param {object} settings - Form settings
     * @returns {object} Modified form settings
     */

  }, {
    key: "cbBeforeSendForm",
    value: function cbBeforeSendForm(settings) {
      var result = settings; // Form.js with apiSettings.enabled and autoDetectMethod will automatically:
      // 1. Collect form data
      // 2. Convert checkboxes using convertCheckboxesToBool
      // 3. Detect if record is new based on id field
      // 4. Call the appropriate API method (create/update)
      // Just add provider-specific data

      result.data.type = 'IAX'; // Ensure ID field exists

      result.data.id = result.data.id || '';
      return result;
    }
    /**
     * Callback after form submission
     * @param {object} response - Response from server
     */

  }, {
    key: "cbAfterSendForm",
    value: function cbAfterSendForm(response) {
      if (response.result === true && response.data && response.data.id) {
        var newId = response.data.id; // Update the form ID field

        $('#id').val(newId); // Update isNewProvider flag

        this.isNewProvider = false; // Enable diagnostics tab for existing providers

        $('#provider-tabs-menu .item[data-tab="diagnostics"]').removeClass('disabled').css('opacity', '').css('cursor', ''); // Update the browser URL without reloading

        var newUrl = "".concat(globalRootUrl, "providers/modifyiax/").concat(newId);
        window.history.pushState({
          id: newId
        }, '', newUrl);
      }
    }
    /**
     * Populate form with data from API
     * @param {object} data - Provider data
     */

  }, {
    key: "populateFormData",
    value: function populateFormData(data) {
      _get(_getPrototypeOf(ProviderIAX.prototype), "populateFormData", this).call(this, data); // IAX-specific data population can be added here if needed

    }
  }]);

  return ProviderIAX;
}(ProviderBase);
/**
 * Initialize provider form on document ready
 */


$(document).ready(function () {
  var provider = new ProviderIAX();
  provider.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzIiwiaW5pdGlhbGl6ZVRhYnMiLCIkIiwiY2hlY2tib3giLCJyZWdUeXBlIiwidmFsIiwiJGZvcm1PYmoiLCJmb3JtIiwiJHNlY3JldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsImlzQ2hlY2tlZCIsInNldFRpbWVvdXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRmllbGRUb29sdGlwcyIsInNlbGYiLCJpc05ld1Byb3ZpZGVyIiwiYWRkQ2xhc3MiLCJ0YWIiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJvbkxvYWQiLCJwYXJhbWV0ZXJBcnJheSIsImhpc3RvcnlFdmVudCIsIm9mZiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwiUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJzaG93SWF4V2FybmluZyIsIndhcm5pbmdIdG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwiaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RpdGxlIiwiaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RleHQiLCJodG1sIiwidHJhbnNpdGlvbiIsIiR0aGlzIiwidmFsdWUiLCJjbGVhblZhbHVlIiwicmVwbGFjZSIsInBhcmVudCIsImFwcGVuZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMiLCJyZW1vdmUiLCJydWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsImhvc3QiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyIsInVzZXJuYW1lIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5Iiwic2VjcmV0IiwicG9ydCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQiLCJyZWNlaXZlQ2FsbHNDaGVja2VkIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCJ1cmwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiSWF4UHJvdmlkZXJzQVBJIiwiYXV0b0RldGVjdE1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImZvcm1Jbml0aWFsaXplZCIsInByb3ZpZGVySWQiLCJlbGVtZW50cyIsInJlY2VpdmVDYWxscyIsIm5ldHdvcmtGaWx0ZXIiLCJmaWVsZHMiLCJxdWFsaWZ5IiwibGFiZWxzIiwiY29uZmlncyIsIm91dGJvdW5kIiwidmlzaWJsZSIsImhpZGRlbiIsInJlcXVpcmVkIiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9Qcm92aWRlclBvcnQiLCJwcl9Qcm92aWRlckxvZ2luIiwicHJfUHJvdmlkZXJQYXNzd29yZCIsInBhc3N3b3JkV2lkZ2V0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJ2YWxpZGF0aW9uIiwiUGFzc3dvcmRXaWRnZXQiLCJWQUxJREFUSU9OIiwiTk9ORSIsImRlZmF1bHRQb3J0IiwiaW5ib3VuZCIsIm9wdGlvbmFsIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSIsInByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQiLCJTT0ZUIiwicmVhZG9ubHlVc2VybmFtZSIsImF1dG9HZW5lcmF0ZVBhc3N3b3JkIiwibm9uZSIsInByX1BlZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9QZWVyUG9ydCIsInByX1BlZXJVc2VybmFtZSIsInByX1BlZXJQYXNzd29yZCIsInNob3dQYXNzd29yZFRvb2x0aXAiLCJjb25maWciLCJmb3JFYWNoIiwia2V5Iiwic2hvdyIsImhpZGUiLCJPYmplY3QiLCJlbnRyaWVzIiwidGV4dCIsImF0dHIiLCJyZW1vdmVBdHRyIiwidHJpbSIsIiRnZW5lcmF0ZUJ0biIsInRyaWdnZXIiLCJ1cGRhdGVDb25maWciLCJoaWRlUGFzc3dvcmRUb29sdGlwIiwicHJvcCIsImZpZWxkTmFtZSIsInRvTG93ZXJDYXNlIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiaWQiLCJyZXNwb25zZSIsIm5ld0lkIiwiY3NzIiwibmV3VXJsIiwid2luZG93IiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsIlByb3ZpZGVyQmFzZSIsImRvY3VtZW50IiwicmVhZHkiLCJwcm92aWRlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsVzs7Ozs7QUFDRix5QkFBYztBQUFBOztBQUFBLDZCQUNKLEtB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QUFRLENBQUMxSCxVQUFUO0FBQ0gsQ0FIRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFByb3ZpZGVyQmFzZSwgUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlciwgUHJvdmlkZXJUb29sdGlwTWFuYWdlciwgaTE4biwgSWF4UHJvdmlkZXJzQVBJICovXG5cbi8qKlxuICogSUFYIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVySUFYXG4gKi9cbmNsYXNzIFByb3ZpZGVySUFYIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHsgXG4gICAgICAgIHN1cGVyKCdJQVgnKTsgXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBzdXBlci5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJQVgtc3BlY2lmaWMgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplSWF4V2FybmluZ01lc3NhZ2UoKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUmVhbHRpbWVWYWxpZGF0aW9uKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVIYW5kbGVycygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRhYnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLXZhbGlkYXRlIGZvcm0gd2hlbiByZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCBjaGFuZ2VzXG4gICAgICAgICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aC5jaGVja2JveCcpLmNoZWNrYm94KCdzZXR0aW5nJywgJ29uQ2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgZXJyb3Igb24gc2VjcmV0IGZpZWxkXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnc2VjcmV0Jyk7XG4gICAgICAgICAgICB0aGlzLiRzZWNyZXQuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvbiwgdmFsaWRhdGUgYmFzZWQgb24gY2hlY2tib3ggc3RhdGVcbiAgICAgICAgICAgIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIGlmICghaXNDaGVja2VkICYmIHRoaXMuJHNlY3JldC52YWwoKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdW5jaGVja2VkIGFuZCBwYXNzd29yZCBpcyBlbXB0eSwgc2hvdyBlcnJvclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZmllbGQnLCAnc2VjcmV0Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFiIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFicygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpYWdub3N0aWNzIHRhYiBmb3IgbmV3IHByb3ZpZGVyc1xuICAgICAgICBpZiAodGhpcy5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogKHRhYlBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiB0eXBlb2YgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIgIT09ICd1bmRlZmluZWQnICYmICFzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkaWFnbm9zdGljcyB0YWIgd2hlbiBpdCBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIuaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uTG9hZDogKHRhYlBhdGgsIHBhcmFtZXRlckFycmF5LCBoaXN0b3J5RXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBCbG9jayBsb2FkaW5nIG9mIGRpYWdub3N0aWNzIHRhYiBmb3IgbmV3IHByb3ZpZGVyc1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBTd2l0Y2ggYmFjayB0byBzZXR0aW5ncyB0YWJcbiAgICAgICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cInNldHRpbmdzXCJdJykudGFiKCdjaGFuZ2UgdGFiJywgJ3NldHRpbmdzJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkaXRpb25hbCBjbGljayBwcmV2ZW50aW9uIGZvciBkaXNhYmxlZCB0YWJcbiAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJykub2ZmKCdjbGljay5kaXNhYmxlZCcpLm9uKCdjbGljay5kaXNhYmxlZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGlmIChzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugc3RheSBvbiBzZXR0aW5ncyB0YWJcbiAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwic2V0dGluZ3NcIl0nKS50YWIoJ2NoYW5nZSB0YWInLCAnc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmllbGRUb29sdGlwcygpIHtcbiAgICAgICAgUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgSUFYIHdhcm5pbmcgbWVzc2FnZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpIHtcbiAgICAgICAgLy8gU2hvdyBJQVggZGVwcmVjYXRlZCB3YXJuaW5nIGlmIGVuYWJsZWRcbiAgICAgICAgY29uc3Qgc2hvd0lheFdhcm5pbmcgPSAkKCcjc2hvdy1pYXgtd2FybmluZycpLnZhbCgpID09PSAnMSc7XG4gICAgICAgIGlmIChzaG93SWF4V2FybmluZykge1xuICAgICAgICAgICAgY29uc3Qgd2FybmluZ0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiIGlkPVwiaWF4LWRlcHJlY2F0aW9uLW5vdGljZVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNsb3NlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmlheF9EZXByZWNhdGlvbldhcm5pbmdUaXRsZSB8fCAnSUFYIFByb3RvY29sIE5vdGljZSd9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5pYXhfRGVwcmVjYXRpb25XYXJuaW5nVGV4dCB8fCAnSUFYIHByb3RvY29sIGlzIGRlcHJlY2F0ZWQuIENvbnNpZGVyIHVzaW5nIFNJUCBpbnN0ZWFkLid9PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICQoJyNpYXgtd2FybmluZy1wbGFjZWhvbGRlcicpLmh0bWwod2FybmluZ0h0bWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBbGxvdyB1c2VyIHRvIGNsb3NlIHRoZSB3YXJuaW5nXG4gICAgICAgICAgICAkKCcjaWF4LWRlcHJlY2F0aW9uLW5vdGljZSAuY2xvc2UuaWNvbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQodGhpcykuY2xvc2VzdCgnLm1lc3NhZ2UnKS50cmFuc2l0aW9uKCdmYWRlJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlYWwtdGltZSB2YWxpZGF0aW9uIGZvciBzcGVjaWZpYyBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVhbHRpbWVWYWxpZGF0aW9uKCkge1xuICAgICAgICAvLyBSZWFsLXRpbWUgdmFsaWRhdGlvbiBmb3IgdXNlcm5hbWUgLSByZXN0cmljdCBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgJCgnI3VzZXJuYW1lJykub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICR0aGlzLnZhbCgpO1xuICAgICAgICAgICAgLy8gQWxsb3cgb25seSBhbHBoYW51bWVyaWMsIGRhc2ggYW5kIHVuZGVyc2NvcmVcbiAgICAgICAgICAgIGNvbnN0IGNsZWFuVmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9bXmEtekEtWjAtOV8tXS9nLCAnJyk7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT09IGNsZWFuVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAkdGhpcy52YWwoY2xlYW5WYWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGFib3V0IGludmFsaWQgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgICR0aGlzLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICR0aGlzLnBhcmVudCgpLmFwcGVuZCgnPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nIHJlZCBiYXNpYyBsYWJlbCB0ZW1wb3Jhcnktd2FybmluZ1wiPicgK1xuICAgICAgICAgICAgICAgICAgICAoZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMgfHwgJ09ubHkgbGV0dGVycywgbnVtYmVycywgZGFzaCBhbmQgdW5kZXJzY29yZSBhbGxvd2VkJykgK1xuICAgICAgICAgICAgICAgICAgICAnPC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHdhcm5pbmcgYWZ0ZXIgMyBzZWNvbmRzXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJy50ZW1wb3Jhcnktd2FybmluZycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAkdGhpcy5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVnaXN0cmF0aW9uIHR5cGUgY2hhbmdlIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVIYW5kbGVycygpIHtcbiAgICAgICAgLy8gQWxyZWFkeSBoYW5kbGVkIGJ5IHBhcmVudCBjbGFzcyBkcm9wZG93biBpbml0aWFsaXphdGlvblxuICAgICAgICAvLyBUaGlzIGlzIGZvciBJQVgtc3BlY2lmaWMgYmVoYXZpb3IgaWYgbmVlZGVkXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHByb3ZpZGVyIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHJ1bGVzID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBDb21tb24gcnVsZXMgZm9yIGFsbCByZWdpc3RyYXRpb24gdHlwZXNcbiAgICAgICAgcnVsZXMuZGVzY3JpcHRpb24gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gUnVsZXMgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgIC8vIE9VVEJPVU5EOiBXZSByZWdpc3RlciB0byBwcm92aWRlclxuICAgICAgICAgICAgcnVsZXMuaG9zdCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyB8fCAnSG9zdCBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRvdHMgYW5kIGh5cGhlbnMnLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMudXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Xy1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdIC8vIE5vIHZhbGlkYXRpb24gZm9yIG91dGJvdW5kIHBhc3N3b3Jkc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJ1bGVzLnBvcnQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgLy8gSU5CT1VORDogUHJvdmlkZXIgY29ubmVjdHMgdG8gdXNcbiAgICAgICAgICAgIGNvbnN0IHJlY2VpdmVDYWxsc0NoZWNrZWQgPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBydWxlcy51c2VybmFtZSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTlfLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUGFzc3dvcmQgdmFsaWRhdGlvbiBvbmx5IGlmIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIGlzIE5PVCBjaGVja2VkXG4gICAgICAgICAgICBpZiAoIXJlY2VpdmVDYWxsc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIb3N0IGlzIG9wdGlvbmFsIGZvciBpbmJvdW5kXG4gICAgICAgICAgICAvLyBQb3J0IGlzIG5vdCBzaG93biBmb3IgaW5ib3VuZFxuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgLy8gTk9ORTogU3RhdGljIHBlZXItdG8tcGVlciBjb25uZWN0aW9uXG4gICAgICAgICAgICBydWxlcy5ob3N0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTkuLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzIHx8ICdIb3N0IGNhbiBvbmx5IGNvbnRhaW4gbGV0dGVycywgbnVtYmVycywgZG90cyBhbmQgaHlwaGVucycsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy51c2VybmFtZSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTlfLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIFBhc3N3b3JkIGlzIG9wdGlvbmFsIGZvciBub25lIG1vZGVcbiAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJ1bGVzLnBvcnQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gdGhpcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIHYzIHdpdGggYXV0by1kZXRlY3Rpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IElheFByb3ZpZGVyc0FQSSwgLy8gVXNlIElBWC1zcGVjaWZpYyBBUEkgY2xpZW50IHYzXG4gICAgICAgICAgICBhdXRvRGV0ZWN0TWV0aG9kOiB0cnVlIC8vIEF1dG9tYXRpY2FsbHkgZGV0ZWN0IGNyZWF0ZS91cGRhdGUgYmFzZWQgb24gaWQgZmllbGRcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCByZWRpcmVjdCBVUkxzIGZvciBzYXZlIG1vZGVzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnlpYXgvYDtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybSAtIHRoaXMgd2FzIG1pc3NpbmchXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTWFyayBmb3JtIGFzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgIHRoaXMuZm9ybUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWNoZSBET00gZWxlbWVudHNcbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSB7XG4gICAgICAgICAgICBob3N0OiAkKCcjZWxIb3N0JyksXG4gICAgICAgICAgICBwb3J0OiAkKCcjZWxQb3J0JyksXG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI2VsVXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogJCgnI2VsU2VjcmV0JyksXG4gICAgICAgICAgICByZWNlaXZlQ2FsbHM6ICQoJyNlbFJlY2VpdmVDYWxscycpLFxuICAgICAgICAgICAgbmV0d29ya0ZpbHRlcjogJCgnI2VsTmV0d29ya0ZpbHRlcicpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZHMgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI3VzZXJuYW1lJyksXG4gICAgICAgICAgICBzZWNyZXQ6IHRoaXMuJHNlY3JldCxcbiAgICAgICAgICAgIHBvcnQ6ICQoJyNwb3J0JyksXG4gICAgICAgICAgICBxdWFsaWZ5OiAkKCcjcXVhbGlmeScpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsYWJlbHMgPSB7XG4gICAgICAgICAgICBob3N0OiAkKCcjaG9zdExhYmVsVGV4dCcpLFxuICAgICAgICAgICAgcG9ydDogJCgnI3BvcnRMYWJlbFRleHQnKSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjdXNlcm5hbWVMYWJlbFRleHQnKSxcbiAgICAgICAgICAgIHNlY3JldDogJCgnI3NlY3JldExhYmVsVGV4dCcpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGNvbnN0IGNvbmZpZ3MgPSB7XG4gICAgICAgICAgICBvdXRib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWydyZWNlaXZlQ2FsbHMnLCAnbmV0d29ya0ZpbHRlciddLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZScsICdzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIHx8ICdQcm92aWRlciBIb3N0L0lQJyxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUG9ydCB8fCAnUHJvdmlkZXIgUG9ydCcsXG4gICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJMb2dpbiB8fCAnTG9naW4nLFxuICAgICAgICAgICAgICAgICAgICBzZWNyZXQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBhc3N3b3JkIHx8ICdQYXNzd29yZCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5OT05FXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0UG9ydDogJzQ1NjknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5ib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICd1c2VybmFtZScsICdzZWNyZXQnLCAncmVjZWl2ZUNhbGxzJywgJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFsncG9ydCddLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3VzZXJuYW1lJywgJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiBbJ2hvc3QnLCAncG9ydCddLFxuICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiBnbG9iYWxUcmFuc2xhdGUucHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIHx8ICdSZW1vdGUgSG9zdC9JUCcsXG4gICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSB8fCAnQXV0aGVudGljYXRpb24gVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBzZWNyZXQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9BdXRoZW50aWNhdGlvblBhc3N3b3JkIHx8ICdBdXRoZW50aWNhdGlvbiBQYXNzd29yZCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlYWRvbmx5VXNlcm5hbWU6IHRydWUsXG4gICAgICAgICAgICAgICAgYXV0b0dlbmVyYXRlUGFzc3dvcmQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub25lOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ3JlY2VpdmVDYWxscycsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbXSxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnXSxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogWydzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1BlZXIgSG9zdC9JUCcsXG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUG9ydCB8fCAnUGVlciBQb3J0JyxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyVXNlcm5hbWUgfHwgJ1BlZXIgVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBzZWNyZXQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUGFzc3dvcmQgfHwgJ1BlZXIgUGFzc3dvcmQnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0UG9ydDogJzQ1NjknLFxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZFRvb2x0aXA6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgY29uZmlnID0gY29uZmlnc1tyZWdUeXBlXSB8fCBjb25maWdzLm91dGJvdW5kO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgdmlzaWJpbGl0eVxuICAgICAgICBjb25maWcudmlzaWJsZS5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5zaG93KCkpO1xuICAgICAgICBjb25maWcuaGlkZGVuLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LmhpZGUoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSByZXF1aXJlZC9vcHRpb25hbCBjbGFzc2VzXG4gICAgICAgIGNvbmZpZy5yZXF1aXJlZD8uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8uYWRkQ2xhc3MoJ3JlcXVpcmVkJykpO1xuICAgICAgICBjb25maWcub3B0aW9uYWw/LmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBsYWJlbHNcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoY29uZmlnLmxhYmVscykuZm9yRWFjaCgoW2tleSwgdGV4dF0pID0+IHtcbiAgICAgICAgICAgIGxhYmVsc1trZXldPy50ZXh0KHRleHQpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSB1c2VybmFtZSBmaWVsZCBmb3IgaW5ib3VuZFxuICAgICAgICBpZiAoY29uZmlnLnJlYWRvbmx5VXNlcm5hbWUpIHtcbiAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS52YWwocHJvdmlkZXJJZCkuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaWVsZHMudXNlcm5hbWUucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCBpZiBlbXB0eVxuICAgICAgICBpZiAoY29uZmlnLmF1dG9HZW5lcmF0ZVBhc3N3b3JkICYmIGZpZWxkcy5zZWNyZXQudmFsKCkudHJpbSgpID09PSAnJyAmJiB0aGlzLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0LmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bj8udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGRlZmF1bHQgcG9ydCBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGNvbmZpZy5kZWZhdWx0UG9ydCAmJiAoZmllbGRzLnBvcnQudmFsKCkgPT09ICcnIHx8IGZpZWxkcy5wb3J0LnZhbCgpID09PSAnMCcpKSB7XG4gICAgICAgICAgICBmaWVsZHMucG9ydC52YWwoY29uZmlnLmRlZmF1bHRQb3J0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHdpZGdldCBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmICh0aGlzLnBhc3N3b3JkV2lkZ2V0ICYmIGNvbmZpZy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQudXBkYXRlQ29uZmlnKHRoaXMucGFzc3dvcmRXaWRnZXQsIGNvbmZpZy5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBwYXNzd29yZCB0b29sdGlwXG4gICAgICAgIGlmIChjb25maWcuc2hvd1Bhc3N3b3JkVG9vbHRpcCkge1xuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWx3YXlzIGVuYWJsZSBxdWFsaWZ5IGZvciBJQVggKE5BVCBrZWVwYWxpdmUpXG4gICAgICAgIGZpZWxkcy5xdWFsaWZ5LnByb3AoJ2NoZWNrZWQnLCB0cnVlKS52YWwoJzEnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZXJyb3JzIGZvciBoaWRkZW4gZmllbGRzXG4gICAgICAgIGNvbmZpZy5oaWRkZW4uZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0ga2V5LnJlcGxhY2UoJ2VsJywgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCBmaWVsZE5hbWUpO1xuICAgICAgICAgICAgJChgIyR7ZmllbGROYW1lfWApLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IE1vZGlmaWVkIGZvcm0gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9ybS5qcyB3aXRoIGFwaVNldHRpbmdzLmVuYWJsZWQgYW5kIGF1dG9EZXRlY3RNZXRob2Qgd2lsbCBhdXRvbWF0aWNhbGx5OlxuICAgICAgICAvLyAxLiBDb2xsZWN0IGZvcm0gZGF0YVxuICAgICAgICAvLyAyLiBDb252ZXJ0IGNoZWNrYm94ZXMgdXNpbmcgY29udmVydENoZWNrYm94ZXNUb0Jvb2xcbiAgICAgICAgLy8gMy4gRGV0ZWN0IGlmIHJlY29yZCBpcyBuZXcgYmFzZWQgb24gaWQgZmllbGRcbiAgICAgICAgLy8gNC4gQ2FsbCB0aGUgYXBwcm9wcmlhdGUgQVBJIG1ldGhvZCAoY3JlYXRlL3VwZGF0ZSlcbiAgICAgICAgXG4gICAgICAgIC8vIEp1c3QgYWRkIHByb3ZpZGVyLXNwZWNpZmljIGRhdGFcbiAgICAgICAgcmVzdWx0LmRhdGEudHlwZSA9ICdJQVgnO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5zdXJlIElEIGZpZWxkIGV4aXN0c1xuICAgICAgICByZXN1bHQuZGF0YS5pZCA9IHJlc3VsdC5kYXRhLmlkIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHNlcnZlclxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgY29uc3QgbmV3SWQgPSByZXNwb25zZS5kYXRhLmlkO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGZvcm0gSUQgZmllbGRcbiAgICAgICAgICAgICQoJyNpZCcpLnZhbChuZXdJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBpc05ld1Byb3ZpZGVyIGZsYWdcbiAgICAgICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFbmFibGUgZGlhZ25vc3RpY3MgdGFiIGZvciBleGlzdGluZyBwcm92aWRlcnNcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmNzcygnb3BhY2l0eScsICcnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ2N1cnNvcicsICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBicm93c2VyIFVSTCB3aXRob3V0IHJlbG9hZGluZ1xuICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvbW9kaWZ5aWF4LyR7bmV3SWR9YDtcbiAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7IGlkOiBuZXdJZCB9LCAnJywgbmV3VXJsKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBzdXBlci5wb3B1bGF0ZUZvcm1EYXRhKGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gSUFYLXNwZWNpZmljIGRhdGEgcG9wdWxhdGlvbiBjYW4gYmUgYWRkZWQgaGVyZSBpZiBuZWVkZWRcbiAgICB9XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBwcm92aWRlciBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zdCBwcm92aWRlciA9IG5ldyBQcm92aWRlcklBWCgpO1xuICAgIHByb3ZpZGVyLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==