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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, ProviderIaxTooltipManager, ProviderTooltipManager, i18n, ProvidersAPI */

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
      Form.cbAfterSendForm = this.cbAfterSendForm.bind(this); // Configure REST API settings

      Form.apiSettings = {
        enabled: true,
        apiObject: ProvidersAPI,
        saveMethod: 'saveRecord',
        httpMethod: this.isNewProvider ? 'POST' : 'PUT'
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
      var result = settings; // Form.js with apiSettings.enabled will automatically:
      // 1. Collect form data
      // 2. Convert checkboxes using convertCheckboxesToBool
      // 3. Call the API using apiSettings configuration
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzIiwiaW5pdGlhbGl6ZVRhYnMiLCIkIiwiY2hlY2tib3giLCJyZWdUeXBlIiwidmFsIiwiJGZvcm1PYmoiLCJmb3JtIiwiJHNlY3JldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsImlzQ2hlY2tlZCIsInNldFRpbWVvdXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRmllbGRUb29sdGlwcyIsInNlbGYiLCJpc05ld1Byb3ZpZGVyIiwiYWRkQ2xhc3MiLCJ0YWIiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJvbkxvYWQiLCJwYXJhbWV0ZXJBcnJheSIsImhpc3RvcnlFdmVudCIsIm9mZiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwiUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJzaG93SWF4V2FybmluZyIsIndhcm5pbmdIdG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwiaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RpdGxlIiwiaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RleHQiLCJodG1sIiwidHJhbnNpdGlvbiIsIiR0aGlzIiwidmFsdWUiLCJjbGVhblZhbHVlIiwicmVwbGFjZSIsInBhcmVudCIsImFwcGVuZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMiLCJyZW1vdmUiLCJydWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsImhvc3QiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyIsInVzZXJuYW1lIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5Iiwic2VjcmV0IiwicG9ydCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQiLCJyZWNlaXZlQ2FsbHNDaGVja2VkIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCJ1cmwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiUHJvdmlkZXJzQVBJIiwic2F2ZU1ldGhvZCIsImh0dHBNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJmb3JtSW5pdGlhbGl6ZWQiLCJwcm92aWRlcklkIiwiZWxlbWVudHMiLCJyZWNlaXZlQ2FsbHMiLCJuZXR3b3JrRmlsdGVyIiwiZmllbGRzIiwicXVhbGlmeSIsImxhYmVscyIsImNvbmZpZ3MiLCJvdXRib3VuZCIsInZpc2libGUiLCJoaWRkZW4iLCJyZXF1aXJlZCIsInByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIiwicHJfUHJvdmlkZXJQb3J0IiwicHJfUHJvdmlkZXJMb2dpbiIsInByX1Byb3ZpZGVyUGFzc3dvcmQiLCJwYXNzd29yZFdpZGdldCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwidmFsaWRhdGlvbiIsIlBhc3N3b3JkV2lkZ2V0IiwiVkFMSURBVElPTiIsIk5PTkUiLCJkZWZhdWx0UG9ydCIsImluYm91bmQiLCJvcHRpb25hbCIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsInByX0F1dGhlbnRpY2F0aW9uVXNlcm5hbWUiLCJwcl9BdXRoZW50aWNhdGlvblBhc3N3b3JkIiwiU09GVCIsInJlYWRvbmx5VXNlcm5hbWUiLCJhdXRvR2VuZXJhdGVQYXNzd29yZCIsIm5vbmUiLCJwcl9QZWVySG9zdE9ySVBBZGRyZXNzIiwicHJfUGVlclBvcnQiLCJwcl9QZWVyVXNlcm5hbWUiLCJwcl9QZWVyUGFzc3dvcmQiLCJzaG93UGFzc3dvcmRUb29sdGlwIiwiY29uZmlnIiwiZm9yRWFjaCIsImtleSIsInNob3ciLCJoaWRlIiwiT2JqZWN0IiwiZW50cmllcyIsInRleHQiLCJhdHRyIiwicmVtb3ZlQXR0ciIsInRyaW0iLCIkZ2VuZXJhdGVCdG4iLCJ0cmlnZ2VyIiwidXBkYXRlQ29uZmlnIiwiaGlkZVBhc3N3b3JkVG9vbHRpcCIsInByb3AiLCJmaWVsZE5hbWUiLCJ0b0xvd2VyQ2FzZSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImlkIiwicmVzcG9uc2UiLCJuZXdJZCIsImNzcyIsIm5ld1VybCIsIndpbmRvdyIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJQcm92aWRlckJhc2UiLCJkb2N1bWVudCIsInJlYWR5IiwicHJvdmlkZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFc7Ozs7O0FBQ0YseUJBQWM7QUFBQTs7QUFBQSw2QkFD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R0FBRyxJQUFJL0osV0FBSixFQUFqQjtBQUNBK0osRUFBQUEsUUFBUSxDQUFDM0gsVUFBVDtBQUNILENBSEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQcm92aWRlckJhc2UsIFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIsIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXIsIGkxOG4sIFByb3ZpZGVyc0FQSSAqL1xuXG4vKipcbiAqIElBWCBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1cbiAqIEBjbGFzcyBQcm92aWRlcklBWFxuICovXG5jbGFzcyBQcm92aWRlcklBWCBleHRlbmRzIFByb3ZpZGVyQmFzZSB7XG4gICAgY29uc3RydWN0b3IoKSB7IFxuICAgICAgICBzdXBlcignSUFYJyk7IFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSUFYLXNwZWNpZmljIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUYWJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS12YWxpZGF0ZSBmb3JtIHdoZW4gcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggY2hhbmdlc1xuICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGguY2hlY2tib3gnKS5jaGVja2JveCgnc2V0dGluZycsICdvbkNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIGVycm9yIG9uIHNlY3JldCBmaWVsZFxuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgdGhpcy4kc2VjcmV0LmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3IgaW5ib3VuZCByZWdpc3RyYXRpb24sIHZhbGlkYXRlIGJhc2VkIG9uIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzQ2hlY2tlZCAmJiB0aGlzLiRzZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHVuY2hlY2tlZCBhbmQgcGFzc3dvcmQgaXMgZW1wdHksIHNob3cgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZpZWxkJywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRmllbGRUb29sdGlwcygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRhYiBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRhYnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaWFnbm9zdGljcyB0YWIgZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgaWYgKHRoaXMuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBvblZpc2libGU6ICh0YWJQYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgdHlwZW9mIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyICE9PSAndW5kZWZpbmVkJyAmJiAhc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlhZ25vc3RpY3MgdGFiIHdoZW4gaXQgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmluaXRpYWxpemVEaWFnbm9zdGljc1RhYigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkxvYWQ6ICh0YWJQYXRoLCBwYXJhbWV0ZXJBcnJheSwgaGlzdG9yeUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQmxvY2sgbG9hZGluZyBvZiBkaWFnbm9zdGljcyB0YWIgZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiBzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3dpdGNoIGJhY2sgdG8gc2V0dGluZ3MgdGFiXG4gICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgY2xpY2sgcHJldmVudGlvbiBmb3IgZGlzYWJsZWQgdGFiXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpLm9mZignY2xpY2suZGlzYWJsZWQnKS5vbignY2xpY2suZGlzYWJsZWQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBpZiAoc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIHN0YXkgb24gc2V0dGluZ3MgdGFiXG4gICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cInNldHRpbmdzXCJdJykudGFiKCdjaGFuZ2UgdGFiJywgJ3NldHRpbmdzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKSB7XG4gICAgICAgIFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIElBWCB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSWF4V2FybmluZ01lc3NhZ2UoKSB7XG4gICAgICAgIC8vIFNob3cgSUFYIGRlcHJlY2F0ZWQgd2FybmluZyBpZiBlbmFibGVkXG4gICAgICAgIGNvbnN0IHNob3dJYXhXYXJuaW5nID0gJCgnI3Nob3ctaWF4LXdhcm5pbmcnKS52YWwoKSA9PT0gJzEnO1xuICAgICAgICBpZiAoc2hvd0lheFdhcm5pbmcpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdIdG1sID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIiBpZD1cImlheC1kZXByZWNhdGlvbi1ub3RpY2VcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjbG9zZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5pYXhfRGVwcmVjYXRpb25XYXJuaW5nVGl0bGUgfHwgJ0lBWCBQcm90b2NvbCBOb3RpY2UnfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUuaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RleHQgfHwgJ0lBWCBwcm90b2NvbCBpcyBkZXByZWNhdGVkLiBDb25zaWRlciB1c2luZyBTSVAgaW5zdGVhZC4nfTwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG4gICAgICAgICAgICAkKCcjaWF4LXdhcm5pbmctcGxhY2Vob2xkZXInKS5odG1sKHdhcm5pbmdIdG1sKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWxsb3cgdXNlciB0byBjbG9zZSB0aGUgd2FybmluZ1xuICAgICAgICAgICAgJCgnI2lheC1kZXByZWNhdGlvbi1ub3RpY2UgLmNsb3NlLmljb24nKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmNsb3Nlc3QoJy5tZXNzYWdlJykudHJhbnNpdGlvbignZmFkZScpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByZWFsLXRpbWUgdmFsaWRhdGlvbiBmb3Igc3BlY2lmaWMgZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbigpIHtcbiAgICAgICAgLy8gUmVhbC10aW1lIHZhbGlkYXRpb24gZm9yIHVzZXJuYW1lIC0gcmVzdHJpY3Qgc3BlY2lhbCBjaGFyYWN0ZXJzXG4gICAgICAgICQoJyN1c2VybmFtZScpLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkdGhpcy52YWwoKTtcbiAgICAgICAgICAgIC8vIEFsbG93IG9ubHkgYWxwaGFudW1lcmljLCBkYXNoIGFuZCB1bmRlcnNjb3JlXG4gICAgICAgICAgICBjb25zdCBjbGVhblZhbHVlID0gdmFsdWUucmVwbGFjZSgvW15hLXpBLVowLTlfLV0vZywgJycpO1xuICAgICAgICAgICAgaWYgKHZhbHVlICE9PSBjbGVhblZhbHVlKSB7XG4gICAgICAgICAgICAgICAgJHRoaXMudmFsKGNsZWFuVmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIFNob3cgd2FybmluZyBhYm91dCBpbnZhbGlkIGNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICAkdGhpcy5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAkdGhpcy5wYXJlbnQoKS5hcHBlbmQoJzxkaXYgY2xhc3M9XCJ1aSBwb2ludGluZyByZWQgYmFzaWMgbGFiZWwgdGVtcG9yYXJ5LXdhcm5pbmdcIj4nICtcbiAgICAgICAgICAgICAgICAgICAgKGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzIHx8ICdPbmx5IGxldHRlcnMsIG51bWJlcnMsIGRhc2ggYW5kIHVuZGVyc2NvcmUgYWxsb3dlZCcpICtcbiAgICAgICAgICAgICAgICAgICAgJzwvZGl2PicpO1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSB3YXJuaW5nIGFmdGVyIDMgc2Vjb25kc1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCcudGVtcG9yYXJ5LXdhcm5pbmcnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgJHRoaXMuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGNoYW5nZSBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEFscmVhZHkgaGFuZGxlZCBieSBwYXJlbnQgY2xhc3MgZHJvcGRvd24gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gVGhpcyBpcyBmb3IgSUFYLXNwZWNpZmljIGJlaGF2aW9yIGlmIG5lZWRlZFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBwcm92aWRlciBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBydWxlcyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29tbW9uIHJ1bGVzIGZvciBhbGwgcmVnaXN0cmF0aW9uIHR5cGVzXG4gICAgICAgIHJ1bGVzLmRlc2NyaXB0aW9uID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICAvLyBPVVRCT1VORDogV2UgcmVnaXN0ZXIgdG8gcHJvdmlkZXJcbiAgICAgICAgICAgIHJ1bGVzLmhvc3QgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMgfHwgJ0hvc3QgY2FuIG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBkb3RzIGFuZCBoeXBoZW5zJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJ1bGVzLnVzZXJuYW1lID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOV8tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSAvLyBObyB2YWxpZGF0aW9uIGZvciBvdXRib3VuZCBwYXNzd29yZHNcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy5wb3J0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgIC8vIElOQk9VTkQ6IFByb3ZpZGVyIGNvbm5lY3RzIHRvIHVzXG4gICAgICAgICAgICBjb25zdCByZWNlaXZlQ2FsbHNDaGVja2VkID0gJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcnVsZXMudXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Xy1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFBhc3N3b3JkIHZhbGlkYXRpb24gb25seSBpZiByZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCBpcyBOT1QgY2hlY2tlZFxuICAgICAgICAgICAgaWYgKCFyZWNlaXZlQ2FsbHNDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtaW5MZW5ndGhbNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSG9zdCBpcyBvcHRpb25hbCBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgLy8gUG9ydCBpcyBub3Qgc2hvd24gZm9yIGluYm91bmRcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgIC8vIE5PTkU6IFN0YXRpYyBwZWVyLXRvLXBlZXIgY29ubmVjdGlvblxuICAgICAgICAgICAgcnVsZXMuaG9zdCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Li1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyB8fCAnSG9zdCBjYW4gb25seSBjb250YWluIGxldHRlcnMsIG51bWJlcnMsIGRvdHMgYW5kIGh5cGhlbnMnLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMudXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Xy1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBQYXNzd29yZCBpcyBvcHRpb25hbCBmb3Igbm9uZSBtb2RlXG4gICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy5wb3J0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJ1bGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBQcm92aWRlcnNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCcsXG4gICAgICAgICAgICBodHRwTWV0aG9kOiB0aGlzLmlzTmV3UHJvdmlkZXIgPyAnUE9TVCcgOiAnUFVUJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHJlZGlyZWN0IFVSTHMgZm9yIHNhdmUgbW9kZXNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeWlheC9gO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtIC0gdGhpcyB3YXMgbWlzc2luZyFcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gdGhlIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAgICBjb25zdCBlbGVtZW50cyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNlbEhvc3QnKSxcbiAgICAgICAgICAgIHBvcnQ6ICQoJyNlbFBvcnQnKSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjZWxVc2VybmFtZScpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjZWxTZWNyZXQnKSxcbiAgICAgICAgICAgIHJlY2VpdmVDYWxsczogJCgnI2VsUmVjZWl2ZUNhbGxzJyksXG4gICAgICAgICAgICBuZXR3b3JrRmlsdGVyOiAkKCcjZWxOZXR3b3JrRmlsdGVyJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogdGhpcy4kc2VjcmV0LFxuICAgICAgICAgICAgcG9ydDogJCgnI3BvcnQnKSxcbiAgICAgICAgICAgIHF1YWxpZnk6ICQoJyNxdWFsaWZ5JylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxhYmVscyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNob3N0TGFiZWxUZXh0JyksXG4gICAgICAgICAgICBwb3J0OiAkKCcjcG9ydExhYmVsVGV4dCcpLFxuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyN1c2VybmFtZUxhYmVsVGV4dCcpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjc2VjcmV0TGFiZWxUZXh0JylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgY29uc3QgY29uZmlncyA9IHtcbiAgICAgICAgICAgIG91dGJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ3JlY2VpdmVDYWxscycsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1Byb3ZpZGVyIEhvc3QvSVAnLFxuICAgICAgICAgICAgICAgICAgICBwb3J0OiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQb3J0IHx8ICdQcm92aWRlciBQb3J0JyxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckxvZ2luIHx8ICdMb2dpbicsXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUGFzc3dvcmQgfHwgJ1Bhc3N3b3JkJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLk5PTkVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRQb3J0OiAnNDU2OSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbmJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdyZWNlaXZlQ2FsbHMnLCAnbmV0d29ya0ZpbHRlciddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWydwb3J0J10sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXNlcm5hbWUnLCAnc2VjcmV0J10sXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IFsnaG9zdCcsICdwb3J0J10sXG4gICAgICAgICAgICAgICAgbGFiZWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MgfHwgJ1JlbW90ZSBIb3N0L0lQJyxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9BdXRoZW50aWNhdGlvblVzZXJuYW1lIHx8ICdBdXRoZW50aWNhdGlvbiBVc2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDogZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQgfHwgJ0F1dGhlbnRpY2F0aW9uIFBhc3N3b3JkJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVhZG9ubHlVc2VybmFtZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdXRvR2VuZXJhdGVQYXNzd29yZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vbmU6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZScsICdzZWNyZXQnLCAncmVjZWl2ZUNhbGxzJywgJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFtdLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZSddLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiBbJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiBnbG9iYWxUcmFuc2xhdGUucHJfUGVlckhvc3RPcklQQWRkcmVzcyB8fCAnUGVlciBIb3N0L0lQJyxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQb3J0IHx8ICdQZWVyIFBvcnQnLFxuICAgICAgICAgICAgICAgICAgICB1c2VybmFtZTogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJVc2VybmFtZSB8fCAnUGVlciBVc2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQYXNzd29yZCB8fCAnUGVlciBQYXNzd29yZCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRQb3J0OiAnNDU2OScsXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkVG9vbHRpcDogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgY29uZmlndXJhdGlvblxuICAgICAgICBjb25zdCBjb25maWcgPSBjb25maWdzW3JlZ1R5cGVdIHx8IGNvbmZpZ3Mub3V0Ym91bmQ7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSB2aXNpYmlsaXR5XG4gICAgICAgIGNvbmZpZy52aXNpYmxlLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LnNob3coKSk7XG4gICAgICAgIGNvbmZpZy5oaWRkZW4uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8uaGlkZSgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IHJlcXVpcmVkL29wdGlvbmFsIGNsYXNzZXNcbiAgICAgICAgY29uZmlnLnJlcXVpcmVkPy5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5hZGRDbGFzcygncmVxdWlyZWQnKSk7XG4gICAgICAgIGNvbmZpZy5vcHRpb25hbD8uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8ucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJykpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGxhYmVsc1xuICAgICAgICBPYmplY3QuZW50cmllcyhjb25maWcubGFiZWxzKS5mb3JFYWNoKChba2V5LCB0ZXh0XSkgPT4ge1xuICAgICAgICAgICAgbGFiZWxzW2tleV0/LnRleHQodGV4dCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHVzZXJuYW1lIGZpZWxkIGZvciBpbmJvdW5kXG4gICAgICAgIGlmIChjb25maWcucmVhZG9ubHlVc2VybmFtZSkge1xuICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnZhbChwcm92aWRlcklkKS5hdHRyKCdyZWFkb25seScsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLWdlbmVyYXRlIHBhc3N3b3JkIGZvciBpbmJvdW5kIGlmIGVtcHR5XG4gICAgICAgIGlmIChjb25maWcuYXV0b0dlbmVyYXRlUGFzc3dvcmQgJiYgZmllbGRzLnNlY3JldC52YWwoKS50cmltKCkgPT09ICcnICYmIHRoaXMucGFzc3dvcmRXaWRnZXQpIHtcbiAgICAgICAgICAgIHRoaXMucGFzc3dvcmRXaWRnZXQuZWxlbWVudHMuJGdlbmVyYXRlQnRuPy50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIG5lZWRlZFxuICAgICAgICBpZiAoY29uZmlnLmRlZmF1bHRQb3J0ICYmIChmaWVsZHMucG9ydC52YWwoKSA9PT0gJycgfHwgZmllbGRzLnBvcnQudmFsKCkgPT09ICcwJykpIHtcbiAgICAgICAgICAgIGZpZWxkcy5wb3J0LnZhbChjb25maWcuZGVmYXVsdFBvcnQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgd2lkZ2V0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKHRoaXMucGFzc3dvcmRXaWRnZXQgJiYgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC51cGRhdGVDb25maWcodGhpcy5wYXNzd29yZFdpZGdldCwgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIHRvb2x0aXBcbiAgICAgICAgaWYgKGNvbmZpZy5zaG93UGFzc3dvcmRUb29sdGlwKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkVG9vbHRpcCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgZW5hYmxlIHF1YWxpZnkgZm9yIElBWCAoTkFUIGtlZXBhbGl2ZSlcbiAgICAgICAgZmllbGRzLnF1YWxpZnkucHJvcCgnY2hlY2tlZCcsIHRydWUpLnZhbCgnMScpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBlcnJvcnMgZm9yIGhpZGRlbiBmaWVsZHNcbiAgICAgICAgY29uZmlnLmhpZGRlbi5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBrZXkucmVwbGFjZSgnZWwnLCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsIGZpZWxkTmFtZSk7XG4gICAgICAgICAgICAkKGAjJHtmaWVsZE5hbWV9YCkuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge29iamVjdH0gTW9kaWZpZWQgZm9ybSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JtLmpzIHdpdGggYXBpU2V0dGluZ3MuZW5hYmxlZCB3aWxsIGF1dG9tYXRpY2FsbHk6XG4gICAgICAgIC8vIDEuIENvbGxlY3QgZm9ybSBkYXRhXG4gICAgICAgIC8vIDIuIENvbnZlcnQgY2hlY2tib3hlcyB1c2luZyBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbFxuICAgICAgICAvLyAzLiBDYWxsIHRoZSBBUEkgdXNpbmcgYXBpU2V0dGluZ3MgY29uZmlndXJhdGlvblxuICAgICAgICBcbiAgICAgICAgLy8gSnVzdCBhZGQgcHJvdmlkZXItc3BlY2lmaWMgZGF0YVxuICAgICAgICByZXN1bHQuZGF0YS50eXBlID0gJ0lBWCc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbnN1cmUgSUQgZmllbGQgZXhpc3RzXG4gICAgICAgIHJlc3VsdC5kYXRhLmlkID0gcmVzdWx0LmRhdGEuaWQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gc2VydmVyXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdJZCA9IHJlc3BvbnNlLmRhdGEuaWQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgZm9ybSBJRCBmaWVsZFxuICAgICAgICAgICAgJCgnI2lkJykudmFsKG5ld0lkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGlzTmV3UHJvdmlkZXIgZmxhZ1xuICAgICAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gZmFsc2U7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEVuYWJsZSBkaWFnbm9zdGljcyB0YWIgZm9yIGV4aXN0aW5nIHByb3ZpZGVyc1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAuY3NzKCdvcGFjaXR5JywgJycpXG4gICAgICAgICAgICAgICAgLmNzcygnY3Vyc29yJywgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGJyb3dzZXIgVVJMIHdpdGhvdXQgcmVsb2FkaW5nXG4gICAgICAgICAgICBjb25zdCBuZXdVcmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnlpYXgvJHtuZXdJZH1gO1xuICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKHsgaWQ6IG5ld0lkIH0sICcnLCBuZXdVcmwpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIHN1cGVyLnBvcHVsYXRlRm9ybURhdGEoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJQVgtc3BlY2lmaWMgZGF0YSBwb3B1bGF0aW9uIGNhbiBiZSBhZGRlZCBoZXJlIGlmIG5lZWRlZFxuICAgIH1cbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHByb3ZpZGVyIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IFByb3ZpZGVySUFYKCk7XG4gICAgcHJvdmlkZXIuaW5pdGlhbGl6ZSgpO1xufSk7Il19