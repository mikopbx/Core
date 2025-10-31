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
   * Override to add IAX-specific initialization
   */


  _createClass(ProviderIAX, [{
    key: "initialize",
    value: function initialize() {
      // Call parent initialize - this handles the full flow:
      // 1. initializeUIComponents()
      // 2. initializeEventHandlers()
      // 3. initializeForm()
      // 4. loadFormData()
      _get(_getPrototypeOf(ProviderIAX.prototype), "initialize", this).call(this);
    }
    /**
     * Override initializeUIComponents to add IAX-specific UI initialization
     */

  }, {
    key: "initializeUIComponents",
    value: function initializeUIComponents() {
      // Call parent first
      _get(_getPrototypeOf(ProviderIAX.prototype), "initializeUIComponents", this).call(this); // IAX-specific UI components


      this.initializeIaxWarningMessage(); // Initialize tabs

      this.initializeTabs();
    }
    /**
     * Override initializeEventHandlers to add IAX-specific handlers
     */

  }, {
    key: "initializeEventHandlers",
    value: function initializeEventHandlers() {
      var _this = this;

      // Call parent first
      _get(_getPrototypeOf(ProviderIAX.prototype), "initializeEventHandlers", this).call(this); // IAX-specific event handlers


      this.initializeRealtimeValidation();
      this.initializeRegistrationTypeHandlers(); // Re-validate form when receive_calls_without_auth changes

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
      });
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
        var warningHtml = "\n                <div class=\"ui warning message\" id=\"iax-deprecation-notice\">\n                    <i class=\"close icon\"></i>\n                    <div class=\"header\">\n                        ".concat(globalTranslate.iax_DeprecationWarningTitle, "\n                    </div>\n                    <p>").concat(globalTranslate.iax_DeprecationWarningText, "</p>\n                </div>\n            ");
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
          $this.parent().append('<div class="ui pointing red basic label temporary-warning">' + globalTranslate.pr_ValidationProviderLoginInvalidCharacters + '</div>'); // Remove warning after 3 seconds

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
            prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters
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
            prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters
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

      Form.initialize(); // Initialize field help tooltips after PasswordWidget has created all buttons

      this.initializeFieldTooltips(); // Mark form as fully initialized

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
            host: globalTranslate.pr_ProviderHostOrIPAddress,
            port: globalTranslate.pr_ProviderPort,
            username: globalTranslate.pr_ProviderLogin,
            secret: globalTranslate.pr_ProviderPassword
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
            host: globalTranslate.pr_RemoteHostOrIPAddress,
            username: globalTranslate.pr_AuthenticationUsername,
            secret: globalTranslate.pr_AuthenticationPassword
          },
          passwordWidget: {
            generateButton: true,
            showPasswordButton: true,
            clipboardButton: true,
            showStrengthBar: true,
            validation: PasswordWidget.VALIDATION.SOFT
          },
          autoGeneratePassword: true
        },
        none: {
          visible: ['host', 'port', 'username', 'secret', 'receiveCalls', 'networkFilter'],
          hidden: [],
          required: ['host', 'port', 'username'],
          optional: ['secret'],
          labels: {
            host: globalTranslate.pr_PeerHostOrIPAddress,
            port: globalTranslate.pr_PeerPort,
            username: globalTranslate.pr_PeerUsername,
            secret: globalTranslate.pr_PeerPassword
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
      }); // Handle username field - ensure it's always editable

      fields.username.removeAttr('readonly'); // Pre-fill username with provider ID for new inbound providers

      if (regType === 'inbound' && this.isNewProvider && (!fields.username.val() || fields.username.val().trim() === '')) {
        fields.username.val(providerId);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVUYWJzIiwiaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbiIsImluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMiLCIkIiwiY2hlY2tib3giLCJyZWdUeXBlIiwidmFsIiwiJGZvcm1PYmoiLCJmb3JtIiwiJHNlY3JldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsImlzQ2hlY2tlZCIsInNldFRpbWVvdXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJzZWxmIiwiaXNOZXdQcm92aWRlciIsImFkZENsYXNzIiwidGFiIiwib25WaXNpYmxlIiwidGFiUGF0aCIsInByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyIiwiaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiIiwib25Mb2FkIiwicGFyYW1ldGVyQXJyYXkiLCJoaXN0b3J5RXZlbnQiLCJvZmYiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiIsIlByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIiLCJpbml0aWFsaXplIiwic2hvd0lheFdhcm5pbmciLCJ3YXJuaW5nSHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsImlheF9EZXByZWNhdGlvbldhcm5pbmdUaXRsZSIsImlheF9EZXByZWNhdGlvbldhcm5pbmdUZXh0IiwiaHRtbCIsInRyYW5zaXRpb24iLCIkdGhpcyIsInZhbHVlIiwiY2xlYW5WYWx1ZSIsInJlcGxhY2UiLCJwYXJlbnQiLCJhcHBlbmQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzIiwicmVtb3ZlIiwicnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJ0eXBlIiwicHJvbXB0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHkiLCJob3N0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInNlY3JldCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkIiwicmVjZWl2ZUNhbGxzQ2hlY2tlZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0IiwidXJsIiwidmFsaWRhdGVSdWxlcyIsImdldFZhbGlkYXRlUnVsZXMiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIklheFByb3ZpZGVyc0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJpbml0aWFsaXplRmllbGRUb29sdGlwcyIsImZvcm1Jbml0aWFsaXplZCIsInByb3ZpZGVySWQiLCJlbGVtZW50cyIsInJlY2VpdmVDYWxscyIsIm5ldHdvcmtGaWx0ZXIiLCJmaWVsZHMiLCJxdWFsaWZ5IiwibGFiZWxzIiwiY29uZmlncyIsIm91dGJvdW5kIiwidmlzaWJsZSIsImhpZGRlbiIsInJlcXVpcmVkIiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9Qcm92aWRlclBvcnQiLCJwcl9Qcm92aWRlckxvZ2luIiwicHJfUHJvdmlkZXJQYXNzd29yZCIsInBhc3N3b3JkV2lkZ2V0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJ2YWxpZGF0aW9uIiwiUGFzc3dvcmRXaWRnZXQiLCJWQUxJREFUSU9OIiwiTk9ORSIsImRlZmF1bHRQb3J0IiwiaW5ib3VuZCIsIm9wdGlvbmFsIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSIsInByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQiLCJTT0ZUIiwiYXV0b0dlbmVyYXRlUGFzc3dvcmQiLCJub25lIiwicHJfUGVlckhvc3RPcklQQWRkcmVzcyIsInByX1BlZXJQb3J0IiwicHJfUGVlclVzZXJuYW1lIiwicHJfUGVlclBhc3N3b3JkIiwic2hvd1Bhc3N3b3JkVG9vbHRpcCIsImNvbmZpZyIsImZvckVhY2giLCJrZXkiLCJzaG93IiwiaGlkZSIsIk9iamVjdCIsImVudHJpZXMiLCJ0ZXh0IiwicmVtb3ZlQXR0ciIsInRyaW0iLCIkZ2VuZXJhdGVCdG4iLCJ0cmlnZ2VyIiwidXBkYXRlQ29uZmlnIiwiaGlkZVBhc3N3b3JkVG9vbHRpcCIsInByb3AiLCJmaWVsZE5hbWUiLCJ0b0xvd2VyQ2FzZSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImlkIiwicmVzcG9uc2UiLCJuZXdJZCIsImNzcyIsIlByb3ZpZGVyQmFzZSIsImRvY3VtZW50IiwicmVhZHkiLCJwcm92aWRlciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsVzs7Ozs7QUFDRix5QkFBYztBQUFBOztBQUFBLDZCQUNKLEtBREk7QUFFYjtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7OztXQUNJLHNCQUFhO0FBQ1Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUFnQkcsUUFBaEIsRUFBMEI7QUFDdEIsVUFBSUEsUUFBUSxDQUFDSCxNQUFULEtBQW9CLElBQXBCLElBQTRCRyxRQUFRLENBQUNGLElBQXJDLElBQTZDRSxRQUFRLENBQUNGLElBQVQsQ0FBY0MsRUFBL0QsRUFBbUU7QUFDL0QsWUFBTUUsS0FBSyxHQUFHRCxRQUFRLENBQUNGLElBQVQsQ0FBY0MsRUFBNUIsQ0FEK0QsQ0FHL0Q7O0FBQ0E1SSxRQUFBQSxDQUFDLENBQUMsS0FBRCxDQUFELENBQVNHLEdBQVQsQ0FBYTJJLEtBQWIsRUFKK0QsQ0FNL0Q7O0FBQ0EsYUFBS2hJLGFBQUwsR0FBcUIsS0FBckIsQ0FQK0QsQ0FTL0Q7O0FBQ0FkLFFBQUFBLENBQUMsQ0FBQyxtREFBRCxDQUFELENBQ0tRLFdBREwsQ0FDaUIsVUFEakIsRUFFS3VJLEdBRkwsQ0FFUyxTQUZULEVBRW9CLEVBRnBCLEVBR0tBLEdBSEwsQ0FHUyxRQUhULEVBR21CLEVBSG5CLEVBVitELENBZS9EO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7O1dBQ0ksMEJBQWlCSixJQUFqQixFQUF1QjtBQUNuQix3RkFBdUJBLElBQXZCLEVBRG1CLENBR25COztBQUNIOzs7O0VBcGtCcUJLLFk7QUF1a0IxQjtBQUNBO0FBQ0E7OztBQUNBaEosQ0FBQyxDQUFDaUosUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQixNQUFNQyxRQUFRLEdBQUcsSUFBSXhKLFdBQUosRUFBakI7QUFDQXdKLEVBQUFBLFFBQVEsQ0FBQ3JILFVBQVQ7QUFDSCxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQcm92aWRlcklheFRvb2x0aXBNYW5hZ2VyLCBQcm92aWRlclRvb2x0aXBNYW5hZ2VyLCBpMThuLCBJYXhQcm92aWRlcnNBUEkgKi9cblxuLyoqXG4gKiBJQVggcHJvdmlkZXIgbWFuYWdlbWVudCBmb3JtXG4gKiBAY2xhc3MgUHJvdmlkZXJJQVhcbiAqL1xuY2xhc3MgUHJvdmlkZXJJQVggZXh0ZW5kcyBQcm92aWRlckJhc2Uge1xuICAgIGNvbnN0cnVjdG9yKCkgeyBcbiAgICAgICAgc3VwZXIoJ0lBWCcpOyBcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqIE92ZXJyaWRlIHRvIGFkZCBJQVgtc3BlY2lmaWMgaW5pdGlhbGl6YXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBpbml0aWFsaXplIC0gdGhpcyBoYW5kbGVzIHRoZSBmdWxsIGZsb3c6XG4gICAgICAgIC8vIDEuIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKVxuICAgICAgICAvLyAyLiBpbml0aWFsaXplRXZlbnRIYW5kbGVycygpXG4gICAgICAgIC8vIDMuIGluaXRpYWxpemVGb3JtKClcbiAgICAgICAgLy8gNC4gbG9hZEZvcm1EYXRhKClcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE92ZXJyaWRlIGluaXRpYWxpemVVSUNvbXBvbmVudHMgdG8gYWRkIElBWC1zcGVjaWZpYyBVSSBpbml0aWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IGZpcnN0XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcblxuICAgICAgICAvLyBJQVgtc3BlY2lmaWMgVUkgY29tcG9uZW50c1xuICAgICAgICB0aGlzLmluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUYWJzKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMgdG8gYWRkIElBWC1zcGVjaWZpYyBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICAvLyBDYWxsIHBhcmVudCBmaXJzdFxuICAgICAgICBzdXBlci5pbml0aWFsaXplRXZlbnRIYW5kbGVycygpO1xuXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBldmVudCBoYW5kbGVyc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzKCk7XG5cbiAgICAgICAgLy8gUmUtdmFsaWRhdGUgZm9ybSB3aGVuIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIGNoYW5nZXNcbiAgICAgICAgJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoLmNoZWNrYm94JykuY2hlY2tib3goJ3NldHRpbmcnLCAnb25DaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBlcnJvciBvbiBzZWNyZXQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgIHRoaXMuJHNlY3JldC5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblxuICAgICAgICAgICAgLy8gRm9yIGluYm91bmQgcmVnaXN0cmF0aW9uLCB2YWxpZGF0ZSBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc0NoZWNrZWQgJiYgdGhpcy4kc2VjcmV0LnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB1bmNoZWNrZWQgYW5kIHBhc3N3b3JkIGlzIGVtcHR5LCBzaG93IGVycm9yXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmaWVsZCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRhYiBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRhYnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gRGlzYWJsZSBkaWFnbm9zdGljcyB0YWIgZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgaWYgKHRoaXMuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBvblZpc2libGU6ICh0YWJQYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgdHlwZW9mIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyICE9PSAndW5kZWZpbmVkJyAmJiAhc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlhZ25vc3RpY3MgdGFiIHdoZW4gaXQgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmluaXRpYWxpemVEaWFnbm9zdGljc1RhYigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkxvYWQ6ICh0YWJQYXRoLCBwYXJhbWV0ZXJBcnJheSwgaGlzdG9yeUV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQmxvY2sgbG9hZGluZyBvZiBkaWFnbm9zdGljcyB0YWIgZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiBzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3dpdGNoIGJhY2sgdG8gc2V0dGluZ3MgdGFiXG4gICAgICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgY2xpY2sgcHJldmVudGlvbiBmb3IgZGlzYWJsZWQgdGFiXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpLm9mZignY2xpY2suZGlzYWJsZWQnKS5vbignY2xpY2suZGlzYWJsZWQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBpZiAoc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIHN0YXkgb24gc2V0dGluZ3MgdGFiXG4gICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cInNldHRpbmdzXCJdJykudGFiKCdjaGFuZ2UgdGFiJywgJ3NldHRpbmdzJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKSB7XG4gICAgICAgIFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIElBWCB3YXJuaW5nIG1lc3NhZ2VcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSWF4V2FybmluZ01lc3NhZ2UoKSB7XG4gICAgICAgIC8vIFNob3cgSUFYIGRlcHJlY2F0ZWQgd2FybmluZyBpZiBlbmFibGVkXG4gICAgICAgIGNvbnN0IHNob3dJYXhXYXJuaW5nID0gJCgnI3Nob3ctaWF4LXdhcm5pbmcnKS52YWwoKSA9PT0gJzEnO1xuICAgICAgICBpZiAoc2hvd0lheFdhcm5pbmcpIHtcbiAgICAgICAgICAgIGNvbnN0IHdhcm5pbmdIdG1sID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIiBpZD1cImlheC1kZXByZWNhdGlvbi1ub3RpY2VcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJjbG9zZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5pYXhfRGVwcmVjYXRpb25XYXJuaW5nVGl0bGV9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5pYXhfRGVwcmVjYXRpb25XYXJuaW5nVGV4dH08L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgJCgnI2lheC13YXJuaW5nLXBsYWNlaG9sZGVyJykuaHRtbCh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFsbG93IHVzZXIgdG8gY2xvc2UgdGhlIHdhcm5pbmdcbiAgICAgICAgICAgICQoJyNpYXgtZGVwcmVjYXRpb24tbm90aWNlIC5jbG9zZS5pY29uJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5jbG9zZXN0KCcubWVzc2FnZScpLnRyYW5zaXRpb24oJ2ZhZGUnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVhbC10aW1lIHZhbGlkYXRpb24gZm9yIHNwZWNpZmljIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKSB7XG4gICAgICAgIC8vIFJlYWwtdGltZSB2YWxpZGF0aW9uIGZvciB1c2VybmFtZSAtIHJlc3RyaWN0IHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgICAgICAkKCcjdXNlcm5hbWUnKS5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0aGlzID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJHRoaXMudmFsKCk7XG4gICAgICAgICAgICAvLyBBbGxvdyBvbmx5IGFscGhhbnVtZXJpYywgZGFzaCBhbmQgdW5kZXJzY29yZVxuICAgICAgICAgICAgY29uc3QgY2xlYW5WYWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1teYS16QS1aMC05Xy1dL2csICcnKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gY2xlYW5WYWx1ZSkge1xuICAgICAgICAgICAgICAgICR0aGlzLnZhbChjbGVhblZhbHVlKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHdhcm5pbmcgYWJvdXQgaW52YWxpZCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgJHRoaXMuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJHRoaXMucGFyZW50KCkuYXBwZW5kKCc8ZGl2IGNsYXNzPVwidWkgcG9pbnRpbmcgcmVkIGJhc2ljIGxhYmVsIHRlbXBvcmFyeS13YXJuaW5nXCI+JyArXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzICtcbiAgICAgICAgICAgICAgICAgICAgJzwvZGl2PicpO1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSB3YXJuaW5nIGFmdGVyIDMgc2Vjb25kc1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKCcudGVtcG9yYXJ5LXdhcm5pbmcnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgJHRoaXMuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGNoYW5nZSBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIEFscmVhZHkgaGFuZGxlZCBieSBwYXJlbnQgY2xhc3MgZHJvcGRvd24gaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gVGhpcyBpcyBmb3IgSUFYLXNwZWNpZmljIGJlaGF2aW9yIGlmIG5lZWRlZFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBwcm92aWRlciBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBydWxlcyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29tbW9uIHJ1bGVzIGZvciBhbGwgcmVnaXN0cmF0aW9uIHR5cGVzXG4gICAgICAgIHJ1bGVzLmRlc2NyaXB0aW9uID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnb3V0Ym91bmQnKSB7XG4gICAgICAgICAgICAvLyBPVVRCT1VORDogV2UgcmVnaXN0ZXIgdG8gcHJvdmlkZXJcbiAgICAgICAgICAgIHJ1bGVzLmhvc3QgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy51c2VybmFtZSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTlfLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW10gLy8gTm8gdmFsaWRhdGlvbiBmb3Igb3V0Ym91bmQgcGFzc3dvcmRzXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMucG9ydCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAvLyBJTkJPVU5EOiBQcm92aWRlciBjb25uZWN0cyB0byB1c1xuICAgICAgICAgICAgY29uc3QgcmVjZWl2ZUNhbGxzQ2hlY2tlZCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJ1bGVzLnVzZXJuYW1lID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOV8tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQYXNzd29yZCB2YWxpZGF0aW9uIG9ubHkgaWYgcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggaXMgTk9UIGNoZWNrZWRcbiAgICAgICAgICAgIGlmICghcmVjZWl2ZUNhbGxzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhvc3QgaXMgb3B0aW9uYWwgZm9yIGluYm91bmRcbiAgICAgICAgICAgIC8vIFBvcnQgaXMgbm90IHNob3duIGZvciBpbmJvdW5kXG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAvLyBOT05FOiBTdGF0aWMgcGVlci10by1wZWVyIGNvbm5lY3Rpb25cbiAgICAgICAgICAgIHJ1bGVzLmhvc3QgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy51c2VybmFtZSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTlfLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIFBhc3N3b3JkIGlzIG9wdGlvbmFsIGZvciBub25lIG1vZGVcbiAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJ1bGVzLnBvcnQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gdGhpcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciB2M1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogSWF4UHJvdmlkZXJzQVBJLCAvLyBVc2UgSUFYLXNwZWNpZmljIEFQSSBjbGllbnQgdjNcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNldCByZWRpcmVjdCBVUkxzIGZvciBzYXZlIG1vZGVzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnlpYXgvYDtcblxuICAgICAgICAvLyBFbmFibGUgYXV0b21hdGljIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvblxuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtIC0gdGhpcyB3YXMgbWlzc2luZyFcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzIGFmdGVyIFBhc3N3b3JkV2lkZ2V0IGhhcyBjcmVhdGVkIGFsbCBidXR0b25zXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKTtcblxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gdGhlIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAgICBjb25zdCBlbGVtZW50cyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNlbEhvc3QnKSxcbiAgICAgICAgICAgIHBvcnQ6ICQoJyNlbFBvcnQnKSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjZWxVc2VybmFtZScpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjZWxTZWNyZXQnKSxcbiAgICAgICAgICAgIHJlY2VpdmVDYWxsczogJCgnI2VsUmVjZWl2ZUNhbGxzJyksXG4gICAgICAgICAgICBuZXR3b3JrRmlsdGVyOiAkKCcjZWxOZXR3b3JrRmlsdGVyJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogdGhpcy4kc2VjcmV0LFxuICAgICAgICAgICAgcG9ydDogJCgnI3BvcnQnKSxcbiAgICAgICAgICAgIHF1YWxpZnk6ICQoJyNxdWFsaWZ5JylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxhYmVscyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNob3N0TGFiZWxUZXh0JyksXG4gICAgICAgICAgICBwb3J0OiAkKCcjcG9ydExhYmVsVGV4dCcpLFxuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyN1c2VybmFtZUxhYmVsVGV4dCcpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjc2VjcmV0TGFiZWxUZXh0JylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgY29uc3QgY29uZmlncyA9IHtcbiAgICAgICAgICAgIG91dGJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ3JlY2VpdmVDYWxscycsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBvcnQsXG4gICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJMb2dpbixcbiAgICAgICAgICAgICAgICAgICAgc2VjcmV0OiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQYXNzd29yZFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLk5PTkVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRQb3J0OiAnNDU2OSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbmJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdyZWNlaXZlQ2FsbHMnLCAnbmV0d29ya0ZpbHRlciddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWydwb3J0J10sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXNlcm5hbWUnLCAnc2VjcmV0J10sXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IFsnaG9zdCcsICdwb3J0J10sXG4gICAgICAgICAgICAgICAgbGFiZWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc2VjcmV0OiBnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25QYXNzd29yZFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXV0b0dlbmVyYXRlUGFzc3dvcmQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub25lOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ3JlY2VpdmVDYWxscycsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbXSxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnXSxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogWydzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJIb3N0T3JJUEFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUG9ydCxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyVXNlcm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQYXNzd29yZFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGVmYXVsdFBvcnQ6ICc0NTY5JyxcbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRUb29sdGlwOiB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgY3VycmVudCBjb25maWd1cmF0aW9uXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IGNvbmZpZ3NbcmVnVHlwZV0gfHwgY29uZmlncy5vdXRib3VuZDtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IHZpc2liaWxpdHlcbiAgICAgICAgY29uZmlnLnZpc2libGUuZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8uc2hvdygpKTtcbiAgICAgICAgY29uZmlnLmhpZGRlbi5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5oaWRlKCkpO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgcmVxdWlyZWQvb3B0aW9uYWwgY2xhc3Nlc1xuICAgICAgICBjb25maWcucmVxdWlyZWQ/LmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LmFkZENsYXNzKCdyZXF1aXJlZCcpKTtcbiAgICAgICAgY29uZmlnLm9wdGlvbmFsPy5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5yZW1vdmVDbGFzcygncmVxdWlyZWQnKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgbGFiZWxzXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGNvbmZpZy5sYWJlbHMpLmZvckVhY2goKFtrZXksIHRleHRdKSA9PiB7XG4gICAgICAgICAgICBsYWJlbHNba2V5XT8udGV4dCh0ZXh0KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGFuZGxlIHVzZXJuYW1lIGZpZWxkIC0gZW5zdXJlIGl0J3MgYWx3YXlzIGVkaXRhYmxlXG4gICAgICAgIGZpZWxkcy51c2VybmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuXG4gICAgICAgIC8vIFByZS1maWxsIHVzZXJuYW1lIHdpdGggcHJvdmlkZXIgSUQgZm9yIG5ldyBpbmJvdW5kIHByb3ZpZGVyc1xuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnICYmIHRoaXMuaXNOZXdQcm92aWRlciAmJiAoIWZpZWxkcy51c2VybmFtZS52YWwoKSB8fCBmaWVsZHMudXNlcm5hbWUudmFsKCkudHJpbSgpID09PSAnJykpIHtcbiAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS52YWwocHJvdmlkZXJJZCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tZ2VuZXJhdGUgcGFzc3dvcmQgZm9yIGluYm91bmQgaWYgZW1wdHlcbiAgICAgICAgaWYgKGNvbmZpZy5hdXRvR2VuZXJhdGVQYXNzd29yZCAmJiBmaWVsZHMuc2VjcmV0LnZhbCgpLnRyaW0oKSA9PT0gJycgJiYgdGhpcy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgdGhpcy5wYXNzd29yZFdpZGdldC5lbGVtZW50cy4kZ2VuZXJhdGVCdG4/LnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBkZWZhdWx0IHBvcnQgaWYgbmVlZGVkXG4gICAgICAgIGlmIChjb25maWcuZGVmYXVsdFBvcnQgJiYgKGZpZWxkcy5wb3J0LnZhbCgpID09PSAnJyB8fCBmaWVsZHMucG9ydC52YWwoKSA9PT0gJzAnKSkge1xuICAgICAgICAgICAgZmllbGRzLnBvcnQudmFsKGNvbmZpZy5kZWZhdWx0UG9ydCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwYXNzd29yZCB3aWRnZXQgY29uZmlndXJhdGlvblxuICAgICAgICBpZiAodGhpcy5wYXNzd29yZFdpZGdldCAmJiBjb25maWcucGFzc3dvcmRXaWRnZXQpIHtcbiAgICAgICAgICAgIFBhc3N3b3JkV2lkZ2V0LnVwZGF0ZUNvbmZpZyh0aGlzLnBhc3N3b3JkV2lkZ2V0LCBjb25maWcucGFzc3dvcmRXaWRnZXQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgcGFzc3dvcmQgdG9vbHRpcFxuICAgICAgICBpZiAoY29uZmlnLnNob3dQYXNzd29yZFRvb2x0aXApIHtcbiAgICAgICAgICAgIHRoaXMuc2hvd1Bhc3N3b3JkVG9vbHRpcCgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5oaWRlUGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFsd2F5cyBlbmFibGUgcXVhbGlmeSBmb3IgSUFYIChOQVQga2VlcGFsaXZlKVxuICAgICAgICBmaWVsZHMucXVhbGlmeS5wcm9wKCdjaGVja2VkJywgdHJ1ZSkudmFsKCcxJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9ycyBmb3IgaGlkZGVuIGZpZWxkc1xuICAgICAgICBjb25maWcuaGlkZGVuLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGtleS5yZXBsYWNlKCdlbCcsICcnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgZmllbGROYW1lKTtcbiAgICAgICAgICAgICQoYCMke2ZpZWxkTmFtZX1gKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBNb2RpZmllZCBmb3JtIHNldHRpbmdzXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgXG4gICAgICAgIC8vIEZvcm0uanMgd2l0aCBhcGlTZXR0aW5ncy5lbmFibGVkIGFuZCBhdXRvRGV0ZWN0TWV0aG9kIHdpbGwgYXV0b21hdGljYWxseTpcbiAgICAgICAgLy8gMS4gQ29sbGVjdCBmb3JtIGRhdGFcbiAgICAgICAgLy8gMi4gQ29udmVydCBjaGVja2JveGVzIHVzaW5nIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sXG4gICAgICAgIC8vIDMuIERldGVjdCBpZiByZWNvcmQgaXMgbmV3IGJhc2VkIG9uIGlkIGZpZWxkXG4gICAgICAgIC8vIDQuIENhbGwgdGhlIGFwcHJvcHJpYXRlIEFQSSBtZXRob2QgKGNyZWF0ZS91cGRhdGUpXG4gICAgICAgIFxuICAgICAgICAvLyBKdXN0IGFkZCBwcm92aWRlci1zcGVjaWZpYyBkYXRhXG4gICAgICAgIHJlc3VsdC5kYXRhLnR5cGUgPSAnSUFYJztcbiAgICAgICAgXG4gICAgICAgIC8vIEVuc3VyZSBJRCBmaWVsZCBleGlzdHNcbiAgICAgICAgcmVzdWx0LmRhdGEuaWQgPSByZXN1bHQuZGF0YS5pZCB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gUmVzcG9uc2UgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld0lkID0gcmVzcG9uc2UuZGF0YS5pZDtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBmb3JtIElEIGZpZWxkXG4gICAgICAgICAgICAkKCcjaWQnKS52YWwobmV3SWQpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgaXNOZXdQcm92aWRlciBmbGFnXG4gICAgICAgICAgICB0aGlzLmlzTmV3UHJvdmlkZXIgPSBmYWxzZTtcblxuICAgICAgICAgICAgLy8gRW5hYmxlIGRpYWdub3N0aWNzIHRhYiBmb3IgZXhpc3RpbmcgcHJvdmlkZXJzXG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ29wYWNpdHknLCAnJylcbiAgICAgICAgICAgICAgICAuY3NzKCdjdXJzb3InLCAnJyk7XG5cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBzdXBlci5wb3B1bGF0ZUZvcm1EYXRhKGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gSUFYLXNwZWNpZmljIGRhdGEgcG9wdWxhdGlvbiBjYW4gYmUgYWRkZWQgaGVyZSBpZiBuZWVkZWRcbiAgICB9XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBwcm92aWRlciBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zdCBwcm92aWRlciA9IG5ldyBQcm92aWRlcklBWCgpO1xuICAgIHByb3ZpZGVyLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==