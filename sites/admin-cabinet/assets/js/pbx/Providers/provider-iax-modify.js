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
      Form.cbAfterSendForm = this.cbAfterSendForm.bind(this); // Configure REST API settings for v3

      Form.apiSettings = {
        enabled: true,
        apiObject: IaxProvidersAPI,
        // Use IAX-specific API client v3
        saveMethod: 'saveRecord'
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

        $('#provider-tabs-menu .item[data-tab="diagnostics"]').removeClass('disabled').css('opacity', '').css('cursor', ''); // Form.js will handle all redirect logic based on submitMode
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzIiwiaW5pdGlhbGl6ZVRhYnMiLCIkIiwiY2hlY2tib3giLCJyZWdUeXBlIiwidmFsIiwiJGZvcm1PYmoiLCJmb3JtIiwiJHNlY3JldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsImlzQ2hlY2tlZCIsInNldFRpbWVvdXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRmllbGRUb29sdGlwcyIsInNlbGYiLCJpc05ld1Byb3ZpZGVyIiwiYWRkQ2xhc3MiLCJ0YWIiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJvbkxvYWQiLCJwYXJhbWV0ZXJBcnJheSIsImhpc3RvcnlFdmVudCIsIm9mZiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwiUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJzaG93SWF4V2FybmluZyIsIndhcm5pbmdIdG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwiaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RpdGxlIiwiaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RleHQiLCJodG1sIiwidHJhbnNpdGlvbiIsIiR0aGlzIiwidmFsdWUiLCJjbGVhblZhbHVlIiwicmVwbGFjZSIsInBhcmVudCIsImFwcGVuZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMiLCJyZW1vdmUiLCJydWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsImhvc3QiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyIsInVzZXJuYW1lIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5Iiwic2VjcmV0IiwicG9ydCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQiLCJyZWNlaXZlQ2FsbHNDaGVja2VkIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCJ1cmwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiSWF4UHJvdmlkZXJzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImZvcm1Jbml0aWFsaXplZCIsInByb3ZpZGVySWQiLCJlbGVtZW50cyIsInJlY2VpdmVDYWxscyIsIm5ldHdvcmtGaWx0ZXIiLCJmaWVsZHMiLCJxdWFsaWZ5IiwibGFiZWxzIiwiY29uZmlncyIsIm91dGJvdW5kIiwidmlzaWJsZSIsImhpZGRlbiIsInJlcXVpcmVkIiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9Qcm92aWRlclBvcnQiLCJwcl9Qcm92aWRlckxvZ2luIiwicHJfUHJvdmlkZXJQYXNzd29yZCIsInBhc3N3b3JkV2lkZ2V0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJ2YWxpZGF0aW9uIiwiUGFzc3dvcmRXaWRnZXQiLCJWQUxJREFUSU9OIiwiTk9ORSIsImRlZmF1bHRQb3J0IiwiaW5ib3VuZCIsIm9wdGlvbmFsIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSIsInByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQiLCJTT0ZUIiwicmVhZG9ubHlVc2VybmFtZSIsImF1dG9HZW5lcmF0ZVBhc3N3b3JkIiwibm9uZSIsInByX1BlZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9QZWVyUG9ydCIsInByX1BlZXJVc2VybmFtZSIsInByX1BlZXJQYXNzd29yZCIsInNob3dQYXNzd29yZFRvb2x0aXAiLCJjb25maWciLCJmb3JFYWNoIiwia2V5Iiwic2hvdyIsImhpZGUiLCJPYmplY3QiLCJlbnRyaWVzIiwidGV4dCIsImF0dHIiLCJyZW1vdmVBdHRyIiwidHJpbSIsIiRnZW5lcmF0ZUJ0biIsInRyaWdnZXIiLCJ1cGRhdGVDb25maWciLCJoaWRlUGFzc3dvcmRUb29sdGlwIiwicHJvcCIsImZpZWxkTmFtZSIsInRvTG93ZXJDYXNlIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiaWQiLCJyZXNwb25zZSIsIm5ld0lkIiwiY3NzIiwiUHJvdmlkZXJCYXNlIiwiZG9jdW1lbnQiLCJyZWFkeSIsInByb3ZpZGVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxXOzs7OztBQUNGLHlCQUFjO0FBQUE7O0FBQUEsNkJBQ0osS0FESTtBQUViO0FBRUQ7QUFDSjtBQUNBOzs7OztXQUNJLHNCQUFhO0FBQUE7O0FB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QUFDQTtBQUNBOzs7O1dBQ0kseUJBQWdCRyxRQUFoQixFQUEwQjtBQUN0QixVQUFJQSxRQUFRLENBQUNILE1BQVQsS0FBb0IsSUFBcEIsSUFBNEJHLFFBQVEsQ0FBQ0YsSUFBckMsSUFBNkNFLFFBQVEsQ0FBQ0YsSUFBVCxDQUFjQyxFQUEvRCxFQUFtRTtBQUMvRCxZQUFNRSxLQUFLLEdBQUdELFFBQVEsQ0FBQ0YsSUFBVCxDQUFjQyxFQUE1QixDQUQrRCxDQUcvRDs7QUFDQTlJLFFBQUFBLENBQUMsQ0FBQyxLQUFELENBQUQsQ0FBU0csR0FBVCxDQUFhNkksS0FBYixFQUorRCxDQU0vRDs7QUFDQSxhQUFLakksYUFBTCxHQUFxQixLQUFyQixDQVArRCxDQVMvRDs7QUFDQWYsUUFBQUEsQ0FBQyxDQUFDLG1EQUFELENBQUQsQ0FDS1EsV0FETCxDQUNpQixVQURqQixFQUVLeUksR0FGTCxDQUVTLFNBRlQsRUFFb0IsRUFGcEIsRUFHS0EsR0FITCxDQUdTLFFBSFQsRUFHbUIsRUFIbkIsRUFWK0QsQ0FlL0Q7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSwwQkFBaUJKLElBQWpCLEVBQXVCO0FBQ25CLHdGQUF1QkEsSUFBdkIsRUFEbUIsQ0FHbkI7O0FBQ0g7Ozs7RUE1aUJxQkssWTtBQStpQjFCO0FBQ0E7QUFDQTs7O0FBQ0FsSixDQUFDLENBQUNtSixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCLE1BQU1DLFFBQVEsR0FBRyxJQUFJMUosV0FBSixFQUFqQjtBQUNBMEosRUFBQUEsUUFBUSxDQUFDdEgsVUFBVDtBQUNILENBSEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQcm92aWRlckJhc2UsIFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIsIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXIsIGkxOG4sIElheFByb3ZpZGVyc0FQSSAqL1xuXG4vKipcbiAqIElBWCBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1cbiAqIEBjbGFzcyBQcm92aWRlcklBWFxuICovXG5jbGFzcyBQcm92aWRlcklBWCBleHRlbmRzIFByb3ZpZGVyQmFzZSB7XG4gICAgY29uc3RydWN0b3IoKSB7IFxuICAgICAgICBzdXBlcignSUFYJyk7IFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSUFYLXNwZWNpZmljIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUYWJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS12YWxpZGF0ZSBmb3JtIHdoZW4gcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggY2hhbmdlc1xuICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGguY2hlY2tib3gnKS5jaGVja2JveCgnc2V0dGluZycsICdvbkNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIGVycm9yIG9uIHNlY3JldCBmaWVsZFxuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgdGhpcy4kc2VjcmV0LmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3IgaW5ib3VuZCByZWdpc3RyYXRpb24sIHZhbGlkYXRlIGJhc2VkIG9uIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzQ2hlY2tlZCAmJiB0aGlzLiRzZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHVuY2hlY2tlZCBhbmQgcGFzc3dvcmQgaXMgZW1wdHksIHNob3cgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZpZWxkJywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRmllbGRUb29sdGlwcygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRhYiBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRhYnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaWFnbm9zdGljcyB0YWIgZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgaWYgKHRoaXMuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBvblZpc2libGU6ICh0YWJQYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgdHlwZW9mIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyICE9PSAndW5kZWZpbmVkJyAmJiAhc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlhZ25vc3RpY3MgdGFiIHdoZW4gaXQgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmluaXRpYWxpemVEaWFnbm9zdGljc1RhYigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkxvYWQ6ICh0YWJQYXRoLCBwYXJhbWV0ZXJBcnJheSwgaGlzdG9yeUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQmxvY2sgbG9hZGluZyBvZiBkaWFnbm9zdGljcyB0YWIgZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiBzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3dpdGNoIGJhY2sgdG8gc2V0dGluZ3MgdGFiXG4gICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgY2xpY2sgcHJldmVudGlvbiBmb3IgZGlzYWJsZWQgdGFiXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpLm9mZignY2xpY2suZGlzYWJsZWQnKS5vbignY2xpY2suZGlzYWJsZWQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBpZiAoc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIHN0YXkgb24gc2V0dGluZ3MgdGFiXG4gICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cInNldHRpbmdzXCJdJykudGFiKCdjaGFuZ2UgdGFiJywgJ3NldHRpbmdzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKSB7XG4gICAgICAgIFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIElBWCB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSWF4V2FybmluZ01lc3NhZ2UoKSB7XG4gICAgICAgIC8vIFNob3cgSUFYIGRlcHJlY2F0ZWQgd2FybmluZyBpZiBlbmFibGVkXG4gICAgICAgIGNvbnN0IHNob3dJYXhXYXJuaW5nID0gJCgnI3Nob3ctaWF4LXdhcm5pbmcnKS52YWwoKSA9PT0gJzEnO1xuICAgICAgICBpZiAoc2hvd0lheFdhcm5pbmcpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdIdG1sID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIiBpZD1cImlheC1kZXByZWNhdGlvbi1ub3RpY2VcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjbG9zZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5pYXhfRGVwcmVjYXRpb25XYXJuaW5nVGl0bGUgfHwgJ0lBWCBQcm90b2NvbCBOb3RpY2UnfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUuaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RleHQgfHwgJ0lBWCBwcm90b2NvbCBpcyBkZXByZWNhdGVkLiBDb25zaWRlciB1c2luZyBTSVAgaW5zdGVhZC4nfTwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAkKCcjaWF4LXdhcm5pbmctcGxhY2Vob2xkZXInKS5odG1sKHdhcm5pbmdIdG1sKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWxsb3cgdXNlciB0byBjbG9zZSB0aGUgd2FybmluZ1xuICAgICAgICAgICAgJCgnI2lheC1kZXByZWNhdGlvbi1ub3RpY2UgLmNsb3NlLmljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmNsb3Nlc3QoJy5tZXNzYWdlJykudHJhbnNpdGlvbignZmFkZScpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByZWFsLXRpbWUgdmFsaWRhdGlvbiBmb3Igc3BlY2lmaWMgZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbigpIHtcbiAgICAgICAgLy8gUmVhbC10aW1lIHZhbGlkYXRpb24gZm9yIHVzZXJuYW1lIC0gcmVzdHJpY3Qgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICAgICQoJyN1c2VybmFtZScpLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkdGhpcy52YWwoKTtcbiAgICAgICAgICAgIC8vIEFsbG93IG9ubHkgYWxwaGFudW1lcmljLCBkYXNoIGFuZCB1bmRlcnNjb3JlXG4gICAgICAgICAgICBjb25zdCBjbGVhblZhbHVlID0gdmFsdWUucmVwbGFjZSgvW15hLXpBLVowLTlfLV0vZywgJycpO1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9PSBjbGVhblZhbHVlKSB7XG4gICAgICAgICAgICAgICAgJHRoaXMudmFsKGNsZWFuVmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIFNob3cgd2FybmluZyBhYm91dCBpbnZhbGlkIGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICAkdGhpcy5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkdGhpcy5wYXJlbnQoKS5hcHBlbmQoJzxkaXYgY2xhc3M9XCJ1aSBwb2ludGluZyByZWQgYmFzaWMgbGFiZWwgdGVtcG9yYXJ5LXdhcm5pbmdcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgKGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzIHx8ICdPbmx5IGxldHRlcnMsIG51bWJlcnMsIGRhc2ggYW5kIHVuZGVyc2NvcmUgYWxsb3dlZCcpICtcbiAgICAgICAgICAgICAgICAgICAgJzwvZGl2PicpO1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSB3YXJuaW5nIGFmdGVyIDMgc2Vjb25kc1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCcudGVtcG9yYXJ5LXdhcm5pbmcnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgJHRoaXMuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGNoYW5nZSBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEFscmVhZHkgaGFuZGxlZCBieSBwYXJlbnQgY2xhc3MgZHJvcGRvd24gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gVGhpcyBpcyBmb3IgSUFYLXNwZWNpZmljIGJlaGF2aW9yIGlmIG5lZWRlZFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBwcm92aWRlciBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBydWxlcyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29tbW9uIHJ1bGVzIGZvciBhbGwgcmVnaXN0cmF0aW9uIHR5cGVzXG4gICAgICAgIHJ1bGVzLmRlc2NyaXB0aW9uID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICAvLyBPVVRCT1VORDogV2UgcmVnaXN0ZXIgdG8gcHJvdmlkZXJcbiAgICAgICAgICAgIHJ1bGVzLmhvc3QgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMgfHwgJ0hvc3QgY2FuIG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBkb3RzIGFuZCBoeXBoZW5zJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJ1bGVzLnVzZXJuYW1lID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOV8tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSAvLyBObyB2YWxpZGF0aW9uIGZvciBvdXRib3VuZCBwYXNzd29yZHNcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy5wb3J0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgIC8vIElOQk9VTkQ6IFByb3ZpZGVyIGNvbm5lY3RzIHRvIHVzXG4gICAgICAgICAgICBjb25zdCByZWNlaXZlQ2FsbHNDaGVja2VkID0gJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcnVsZXMudXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Xy1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFBhc3N3b3JkIHZhbGlkYXRpb24gb25seSBpZiByZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCBpcyBOT1QgY2hlY2tlZFxuICAgICAgICAgICAgaWYgKCFyZWNlaXZlQ2FsbHNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSG9zdCBpcyBvcHRpb25hbCBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgLy8gUG9ydCBpcyBub3Qgc2hvd24gZm9yIGluYm91bmRcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgIC8vIE5PTkU6IFN0YXRpYyBwZWVyLXRvLXBlZXIgY29ubmVjdGlvblxuICAgICAgICAgICAgcnVsZXMuaG9zdCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyB8fCAnSG9zdCBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRvdHMgYW5kIGh5cGhlbnMnLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMudXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Xy1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBQYXNzd29yZCBpcyBvcHRpb25hbCBmb3Igbm9uZSBtb2RlXG4gICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy5wb3J0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJ1bGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciB2M1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogSWF4UHJvdmlkZXJzQVBJLCAvLyBVc2UgSUFYLXNwZWNpZmljIEFQSSBjbGllbnQgdjNcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHJlZGlyZWN0IFVSTHMgZm9yIHNhdmUgbW9kZXNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeWlheC9gO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtIC0gdGhpcyB3YXMgbWlzc2luZyFcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gdGhlIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAgICBjb25zdCBlbGVtZW50cyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNlbEhvc3QnKSxcbiAgICAgICAgICAgIHBvcnQ6ICQoJyNlbFBvcnQnKSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjZWxVc2VybmFtZScpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjZWxTZWNyZXQnKSxcbiAgICAgICAgICAgIHJlY2VpdmVDYWxsczogJCgnI2VsUmVjZWl2ZUNhbGxzJyksXG4gICAgICAgICAgICBuZXR3b3JrRmlsdGVyOiAkKCcjZWxOZXR3b3JrRmlsdGVyJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogdGhpcy4kc2VjcmV0LFxuICAgICAgICAgICAgcG9ydDogJCgnI3BvcnQnKSxcbiAgICAgICAgICAgIHF1YWxpZnk6ICQoJyNxdWFsaWZ5JylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxhYmVscyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNob3N0TGFiZWxUZXh0JyksXG4gICAgICAgICAgICBwb3J0OiAkKCcjcG9ydExhYmVsVGV4dCcpLFxuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyN1c2VybmFtZUxhYmVsVGV4dCcpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjc2VjcmV0TGFiZWxUZXh0JylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgY29uc3QgY29uZmlncyA9IHtcbiAgICAgICAgICAgIG91dGJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ3JlY2VpdmVDYWxscycsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1Byb3ZpZGVyIEhvc3QvSVAnLFxuICAgICAgICAgICAgICAgICAgICBwb3J0OiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQb3J0IHx8ICdQcm92aWRlciBQb3J0JyxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckxvZ2luIHx8ICdMb2dpbicsXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUGFzc3dvcmQgfHwgJ1Bhc3N3b3JkJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLk5PTkVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRQb3J0OiAnNDU2OSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbmJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdyZWNlaXZlQ2FsbHMnLCAnbmV0d29ya0ZpbHRlciddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWydwb3J0J10sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXNlcm5hbWUnLCAnc2VjcmV0J10sXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IFsnaG9zdCcsICdwb3J0J10sXG4gICAgICAgICAgICAgICAgbGFiZWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MgfHwgJ1JlbW90ZSBIb3N0L0lQJyxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9BdXRoZW50aWNhdGlvblVzZXJuYW1lIHx8ICdBdXRoZW50aWNhdGlvbiBVc2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDogZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQgfHwgJ0F1dGhlbnRpY2F0aW9uIFBhc3N3b3JkJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVhZG9ubHlVc2VybmFtZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdXRvR2VuZXJhdGVQYXNzd29yZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vbmU6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZScsICdzZWNyZXQnLCAncmVjZWl2ZUNhbGxzJywgJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFtdLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZSddLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiBbJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiBnbG9iYWxUcmFuc2xhdGUucHJfUGVlckhvc3RPcklQQWRkcmVzcyB8fCAnUGVlciBIb3N0L0lQJyxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQb3J0IHx8ICdQZWVyIFBvcnQnLFxuICAgICAgICAgICAgICAgICAgICB1c2VybmFtZTogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJVc2VybmFtZSB8fCAnUGVlciBVc2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQYXNzd29yZCB8fCAnUGVlciBQYXNzd29yZCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRQb3J0OiAnNDU2OScsXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkVG9vbHRpcDogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgY29uZmlndXJhdGlvblxuICAgICAgICBjb25zdCBjb25maWcgPSBjb25maWdzW3JlZ1R5cGVdIHx8IGNvbmZpZ3Mub3V0Ym91bmQ7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSB2aXNpYmlsaXR5XG4gICAgICAgIGNvbmZpZy52aXNpYmxlLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LnNob3coKSk7XG4gICAgICAgIGNvbmZpZy5oaWRkZW4uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8uaGlkZSgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IHJlcXVpcmVkL29wdGlvbmFsIGNsYXNzZXNcbiAgICAgICAgY29uZmlnLnJlcXVpcmVkPy5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5hZGRDbGFzcygncmVxdWlyZWQnKSk7XG4gICAgICAgIGNvbmZpZy5vcHRpb25hbD8uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8ucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJykpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGxhYmVsc1xuICAgICAgICBPYmplY3QuZW50cmllcyhjb25maWcubGFiZWxzKS5mb3JFYWNoKChba2V5LCB0ZXh0XSkgPT4ge1xuICAgICAgICAgICAgbGFiZWxzW2tleV0/LnRleHQodGV4dCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHVzZXJuYW1lIGZpZWxkIGZvciBpbmJvdW5kXG4gICAgICAgIGlmIChjb25maWcucmVhZG9ubHlVc2VybmFtZSkge1xuICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnZhbChwcm92aWRlcklkKS5hdHRyKCdyZWFkb25seScsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLWdlbmVyYXRlIHBhc3N3b3JkIGZvciBpbmJvdW5kIGlmIGVtcHR5XG4gICAgICAgIGlmIChjb25maWcuYXV0b0dlbmVyYXRlUGFzc3dvcmQgJiYgZmllbGRzLnNlY3JldC52YWwoKS50cmltKCkgPT09ICcnICYmIHRoaXMucGFzc3dvcmRXaWRnZXQpIHtcbiAgICAgICAgICAgIHRoaXMucGFzc3dvcmRXaWRnZXQuZWxlbWVudHMuJGdlbmVyYXRlQnRuPy50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIG5lZWRlZFxuICAgICAgICBpZiAoY29uZmlnLmRlZmF1bHRQb3J0ICYmIChmaWVsZHMucG9ydC52YWwoKSA9PT0gJycgfHwgZmllbGRzLnBvcnQudmFsKCkgPT09ICcwJykpIHtcbiAgICAgICAgICAgIGZpZWxkcy5wb3J0LnZhbChjb25maWcuZGVmYXVsdFBvcnQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgd2lkZ2V0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKHRoaXMucGFzc3dvcmRXaWRnZXQgJiYgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC51cGRhdGVDb25maWcodGhpcy5wYXNzd29yZFdpZGdldCwgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIHRvb2x0aXBcbiAgICAgICAgaWYgKGNvbmZpZy5zaG93UGFzc3dvcmRUb29sdGlwKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkVG9vbHRpcCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgZW5hYmxlIHF1YWxpZnkgZm9yIElBWCAoTkFUIGtlZXBhbGl2ZSlcbiAgICAgICAgZmllbGRzLnF1YWxpZnkucHJvcCgnY2hlY2tlZCcsIHRydWUpLnZhbCgnMScpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBlcnJvcnMgZm9yIGhpZGRlbiBmaWVsZHNcbiAgICAgICAgY29uZmlnLmhpZGRlbi5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBrZXkucmVwbGFjZSgnZWwnLCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsIGZpZWxkTmFtZSk7XG4gICAgICAgICAgICAkKGAjJHtmaWVsZE5hbWV9YCkuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge29iamVjdH0gTW9kaWZpZWQgZm9ybSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JtLmpzIHdpdGggYXBpU2V0dGluZ3MuZW5hYmxlZCBhbmQgYXV0b0RldGVjdE1ldGhvZCB3aWxsIGF1dG9tYXRpY2FsbHk6XG4gICAgICAgIC8vIDEuIENvbGxlY3QgZm9ybSBkYXRhXG4gICAgICAgIC8vIDIuIENvbnZlcnQgY2hlY2tib3hlcyB1c2luZyBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbFxuICAgICAgICAvLyAzLiBEZXRlY3QgaWYgcmVjb3JkIGlzIG5ldyBiYXNlZCBvbiBpZCBmaWVsZFxuICAgICAgICAvLyA0LiBDYWxsIHRoZSBhcHByb3ByaWF0ZSBBUEkgbWV0aG9kIChjcmVhdGUvdXBkYXRlKVxuICAgICAgICBcbiAgICAgICAgLy8gSnVzdCBhZGQgcHJvdmlkZXItc3BlY2lmaWMgZGF0YVxuICAgICAgICByZXN1bHQuZGF0YS50eXBlID0gJ0lBWCc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbnN1cmUgSUQgZmllbGQgZXhpc3RzXG4gICAgICAgIHJlc3VsdC5kYXRhLmlkID0gcmVzdWx0LmRhdGEuaWQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gc2VydmVyXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdJZCA9IHJlc3BvbnNlLmRhdGEuaWQ7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgZm9ybSBJRCBmaWVsZFxuICAgICAgICAgICAgJCgnI2lkJykudmFsKG5ld0lkKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGlzTmV3UHJvdmlkZXIgZmxhZ1xuICAgICAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIEVuYWJsZSBkaWFnbm9zdGljcyB0YWIgZm9yIGV4aXN0aW5nIHByb3ZpZGVyc1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAuY3NzKCdvcGFjaXR5JywgJycpXG4gICAgICAgICAgICAgICAgLmNzcygnY3Vyc29yJywgJycpO1xuXG4gICAgICAgICAgICAvLyBGb3JtLmpzIHdpbGwgaGFuZGxlIGFsbCByZWRpcmVjdCBsb2dpYyBiYXNlZCBvbiBzdWJtaXRNb2RlXG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgc3VwZXIucG9wdWxhdGVGb3JtRGF0YShkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBkYXRhIHBvcHVsYXRpb24gY2FuIGJlIGFkZGVkIGhlcmUgaWYgbmVlZGVkXG4gICAgfVxufVxuXG4vKipcbiAqIEluaXRpYWxpemUgcHJvdmlkZXIgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY29uc3QgcHJvdmlkZXIgPSBuZXcgUHJvdmlkZXJJQVgoKTtcbiAgICBwcm92aWRlci5pbml0aWFsaXplKCk7XG59KTsiXX0=