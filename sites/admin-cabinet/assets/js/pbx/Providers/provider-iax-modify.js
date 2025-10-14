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
          readonlyUsername: true,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVUYWJzIiwiaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbiIsImluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMiLCIkIiwiY2hlY2tib3giLCJyZWdUeXBlIiwidmFsIiwiJGZvcm1PYmoiLCJmb3JtIiwiJHNlY3JldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsImlzQ2hlY2tlZCIsInNldFRpbWVvdXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRmllbGRUb29sdGlwcyIsInNlbGYiLCJpc05ld1Byb3ZpZGVyIiwiYWRkQ2xhc3MiLCJ0YWIiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJvbkxvYWQiLCJwYXJhbWV0ZXJBcnJheSIsImhpc3RvcnlFdmVudCIsIm9mZiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwiUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJzaG93SWF4V2FybmluZyIsIndhcm5pbmdIdG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwiaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RpdGxlIiwiaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RleHQiLCJodG1sIiwidHJhbnNpdGlvbiIsIiR0aGlzIiwidmFsdWUiLCJjbGVhblZhbHVlIiwicmVwbGFjZSIsInBhcmVudCIsImFwcGVuZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMiLCJyZW1vdmUiLCJydWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsImhvc3QiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyIsInVzZXJuYW1lIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5Iiwic2VjcmV0IiwicG9ydCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQiLCJyZWNlaXZlQ2FsbHNDaGVja2VkIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCJ1cmwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiSWF4UHJvdmlkZXJzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImZvcm1Jbml0aWFsaXplZCIsInByb3ZpZGVySWQiLCJlbGVtZW50cyIsInJlY2VpdmVDYWxscyIsIm5ldHdvcmtGaWx0ZXIiLCJmaWVsZHMiLCJxdWFsaWZ5IiwibGFiZWxzIiwiY29uZmlncyIsIm91dGJvdW5kIiwidmlzaWJsZSIsImhpZGRlbiIsInJlcXVpcmVkIiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9Qcm92aWRlclBvcnQiLCJwcl9Qcm92aWRlckxvZ2luIiwicHJfUHJvdmlkZXJQYXNzd29yZCIsInBhc3N3b3JkV2lkZ2V0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJ2YWxpZGF0aW9uIiwiUGFzc3dvcmRXaWRnZXQiLCJWQUxJREFUSU9OIiwiTk9ORSIsImRlZmF1bHRQb3J0IiwiaW5ib3VuZCIsIm9wdGlvbmFsIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSIsInByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQiLCJTT0ZUIiwicmVhZG9ubHlVc2VybmFtZSIsImF1dG9HZW5lcmF0ZVBhc3N3b3JkIiwibm9uZSIsInByX1BlZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9QZWVyUG9ydCIsInByX1BlZXJVc2VybmFtZSIsInByX1BlZXJQYXNzd29yZCIsInNob3dQYXNzd29yZFRvb2x0aXAiLCJjb25maWciLCJmb3JFYWNoIiwia2V5Iiwic2hvdyIsImhpZGUiLCJPYmplY3QiLCJlbnRyaWVzIiwidGV4dCIsImF0dHIiLCJyZW1vdmVBdHRyIiwidHJpbSIsIiRnZW5lcmF0ZUJ0biIsInRyaWdnZXIiLCJ1cGRhdGVDb25maWciLCJoaWRlUGFzc3dvcmRUb29sdGlwIiwicHJvcCIsImZpZWxkTmFtZSIsInRvTG93ZXJDYXNlIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiaWQiLCJyZXNwb25zZSIsIm5ld0lkIiwiY3NzIiwiUHJvdmlkZXJCYXNlIiwiZG9jdW1lbnQiLCJyZWFkeSIsInByb3ZpZGVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxXOzs7OztBQUNGLHlCQUFjO0FBQUE7O0FBQUEsNkJBQ0osS0FESTtBQUViO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7O1dBQ0ksc0JBQWE7QUFD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LE1BQVQsS0FBb0IsSUFBcEIsSUFBNEJHLFFBQVEsQ0FBQ0YsSUFBckMsSUFBNkNFLFFBQVEsQ0FBQ0YsSUFBVCxDQUFjQyxFQUEvRCxFQUFtRTtBQUMvRCxZQUFNRSxLQUFLLEdBQUdELFFBQVEsQ0FBQ0YsSUFBVCxDQUFjQyxFQUE1QixDQUQrRCxDQUcvRDs7QUFDQTlJLFFBQUFBLENBQUMsQ0FBQyxLQUFELENBQUQsQ0FBU0csR0FBVCxDQUFhNkksS0FBYixFQUorRCxDQU0vRDs7QUFDQSxhQUFLakksYUFBTCxHQUFxQixLQUFyQixDQVArRCxDQVMvRDs7QUFDQWYsUUFBQUEsQ0FBQyxDQUFDLG1EQUFELENBQUQsQ0FDS1EsV0FETCxDQUNpQixVQURqQixFQUVLeUksR0FGTCxDQUVTLFNBRlQsRUFFb0IsRUFGcEIsRUFHS0EsR0FITCxDQUdTLFFBSFQsRUFHbUIsRUFIbkIsRUFWK0QsQ0FlL0Q7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSwwQkFBaUJKLElBQWpCLEVBQXVCO0FBQ25CLHdGQUF1QkEsSUFBdkIsRUFEbUIsQ0FHbkI7O0FBQ0g7Ozs7RUFwa0JxQkssWTtBQXVrQjFCO0FBQ0E7QUFDQTs7O0FBQ0FsSixDQUFDLENBQUNtSixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCLE1BQU1DLFFBQVEsR0FBRyxJQUFJMUosV0FBSixFQUFqQjtBQUNBMEosRUFBQUEsUUFBUSxDQUFDdEgsVUFBVDtBQUNILENBSEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQcm92aWRlckJhc2UsIFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIsIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXIsIGkxOG4sIElheFByb3ZpZGVyc0FQSSAqL1xuXG4vKipcbiAqIElBWCBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1cbiAqIEBjbGFzcyBQcm92aWRlcklBWFxuICovXG5jbGFzcyBQcm92aWRlcklBWCBleHRlbmRzIFByb3ZpZGVyQmFzZSB7XG4gICAgY29uc3RydWN0b3IoKSB7IFxuICAgICAgICBzdXBlcignSUFYJyk7IFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICogT3ZlcnJpZGUgdG8gYWRkIElBWC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IGluaXRpYWxpemUgLSB0aGlzIGhhbmRsZXMgdGhlIGZ1bGwgZmxvdzpcbiAgICAgICAgLy8gMS4gaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpXG4gICAgICAgIC8vIDIuIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKClcbiAgICAgICAgLy8gMy4gaW5pdGlhbGl6ZUZvcm0oKVxuICAgICAgICAvLyA0LiBsb2FkRm9ybURhdGEoKVxuICAgICAgICBzdXBlci5pbml0aWFsaXplKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyB0byBhZGQgSUFYLXNwZWNpZmljIFVJIGluaXRpYWxpemF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gQ2FsbCBwYXJlbnQgZmlyc3RcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBVSSBjb21wb25lbnRzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRhYnMoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPdmVycmlkZSBpbml0aWFsaXplRXZlbnRIYW5kbGVycyB0byBhZGQgSUFYLXNwZWNpZmljIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IGZpcnN0XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemVFdmVudEhhbmRsZXJzKCk7XG5cbiAgICAgICAgLy8gSUFYLXNwZWNpZmljIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMoKTtcblxuICAgICAgICAvLyBSZS12YWxpZGF0ZSBmb3JtIHdoZW4gcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggY2hhbmdlc1xuICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGguY2hlY2tib3gnKS5jaGVja2JveCgnc2V0dGluZycsICdvbkNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIGVycm9yIG9uIHNlY3JldCBmaWVsZFxuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgdGhpcy4kc2VjcmV0LmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuXG4gICAgICAgICAgICAvLyBGb3IgaW5ib3VuZCByZWdpc3RyYXRpb24sIHZhbGlkYXRlIGJhc2VkIG9uIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzQ2hlY2tlZCAmJiB0aGlzLiRzZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHVuY2hlY2tlZCBhbmQgcGFzc3dvcmQgaXMgZW1wdHksIHNob3cgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZpZWxkJywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgIGlmICh0aGlzLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiAodGFiUGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHR5cGVvZiBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciAhPT0gJ3VuZGVmaW5lZCcgJiYgIXNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpYWdub3N0aWNzIHRhYiB3aGVuIGl0IGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5pbml0aWFsaXplRGlhZ25vc3RpY3NUYWIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25Mb2FkOiAodGFiUGF0aCwgcGFyYW1ldGVyQXJyYXksIGhpc3RvcnlFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEJsb2NrIGxvYWRpbmcgb2YgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN3aXRjaCBiYWNrIHRvIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwic2V0dGluZ3NcIl0nKS50YWIoJ2NoYW5nZSB0YWInLCAnc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNsaWNrIHByZXZlbnRpb24gZm9yIGRpc2FibGVkIHRhYlxuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKS5vZmYoJ2NsaWNrLmRpc2FibGVkJykub24oJ2NsaWNrLmRpc2FibGVkJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKHNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBzdGF5IG9uIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCkge1xuICAgICAgICBQcm92aWRlcklheFRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBJQVggd2FybmluZyBtZXNzYWdlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlKCkge1xuICAgICAgICAvLyBTaG93IElBWCBkZXByZWNhdGVkIHdhcm5pbmcgaWYgZW5hYmxlZFxuICAgICAgICBjb25zdCBzaG93SWF4V2FybmluZyA9ICQoJyNzaG93LWlheC13YXJuaW5nJykudmFsKCkgPT09ICcxJztcbiAgICAgICAgaWYgKHNob3dJYXhXYXJuaW5nKSB7XG4gICAgICAgICAgICBjb25zdCB3YXJuaW5nSHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCIgaWQ9XCJpYXgtZGVwcmVjYXRpb24tbm90aWNlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2xvc2UgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RpdGxlfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUuaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RleHR9PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICQoJyNpYXgtd2FybmluZy1wbGFjZWhvbGRlcicpLmh0bWwod2FybmluZ0h0bWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBbGxvdyB1c2VyIHRvIGNsb3NlIHRoZSB3YXJuaW5nXG4gICAgICAgICAgICAkKCcjaWF4LWRlcHJlY2F0aW9uLW5vdGljZSAuY2xvc2UuaWNvbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQodGhpcykuY2xvc2VzdCgnLm1lc3NhZ2UnKS50cmFuc2l0aW9uKCdmYWRlJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlYWwtdGltZSB2YWxpZGF0aW9uIGZvciBzcGVjaWZpYyBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVhbHRpbWVWYWxpZGF0aW9uKCkge1xuICAgICAgICAvLyBSZWFsLXRpbWUgdmFsaWRhdGlvbiBmb3IgdXNlcm5hbWUgLSByZXN0cmljdCBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgJCgnI3VzZXJuYW1lJykub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICR0aGlzLnZhbCgpO1xuICAgICAgICAgICAgLy8gQWxsb3cgb25seSBhbHBoYW51bWVyaWMsIGRhc2ggYW5kIHVuZGVyc2NvcmVcbiAgICAgICAgICAgIGNvbnN0IGNsZWFuVmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9bXmEtekEtWjAtOV8tXS9nLCAnJyk7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT09IGNsZWFuVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAkdGhpcy52YWwoY2xlYW5WYWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGFib3V0IGludmFsaWQgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgICR0aGlzLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICR0aGlzLnBhcmVudCgpLmFwcGVuZCgnPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nIHJlZCBiYXNpYyBsYWJlbCB0ZW1wb3Jhcnktd2FybmluZ1wiPicgK1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyArXG4gICAgICAgICAgICAgICAgICAgICc8L2Rpdj4nKTtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgd2FybmluZyBhZnRlciAzIHNlY29uZHNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnRlbXBvcmFyeS13YXJuaW5nJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICR0aGlzLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByZWdpc3RyYXRpb24gdHlwZSBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzKCkge1xuICAgICAgICAvLyBBbHJlYWR5IGhhbmRsZWQgYnkgcGFyZW50IGNsYXNzIGRyb3Bkb3duIGluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIFRoaXMgaXMgZm9yIElBWC1zcGVjaWZpYyBiZWhhdmlvciBpZiBuZWVkZWRcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcHJvdmlkZXIgc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcnVsZXMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbW1vbiBydWxlcyBmb3IgYWxsIHJlZ2lzdHJhdGlvbiB0eXBlc1xuICAgICAgICBydWxlcy5kZXNjcmlwdGlvbiA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBSdWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgLy8gT1VUQk9VTkQ6IFdlIHJlZ2lzdGVyIHRvIHByb3ZpZGVyXG4gICAgICAgICAgICBydWxlcy5ob3N0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTkuLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMudXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Xy1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdIC8vIE5vIHZhbGlkYXRpb24gZm9yIG91dGJvdW5kIHBhc3N3b3Jkc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJ1bGVzLnBvcnQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgLy8gSU5CT1VORDogUHJvdmlkZXIgY29ubmVjdHMgdG8gdXNcbiAgICAgICAgICAgIGNvbnN0IHJlY2VpdmVDYWxsc0NoZWNrZWQgPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBydWxlcy51c2VybmFtZSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTlfLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUGFzc3dvcmQgdmFsaWRhdGlvbiBvbmx5IGlmIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIGlzIE5PVCBjaGVja2VkXG4gICAgICAgICAgICBpZiAoIXJlY2VpdmVDYWxsc0NoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIb3N0IGlzIG9wdGlvbmFsIGZvciBpbmJvdW5kXG4gICAgICAgICAgICAvLyBQb3J0IGlzIG5vdCBzaG93biBmb3IgaW5ib3VuZFxuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgLy8gTk9ORTogU3RhdGljIHBlZXItdG8tcGVlciBjb25uZWN0aW9uXG4gICAgICAgICAgICBydWxlcy5ob3N0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTkuLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMudXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Xy1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBQYXNzd29yZCBpcyBvcHRpb25hbCBmb3Igbm9uZSBtb2RlXG4gICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy5wb3J0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJ1bGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciB2M1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogSWF4UHJvdmlkZXJzQVBJLCAvLyBVc2UgSUFYLXNwZWNpZmljIEFQSSBjbGllbnQgdjNcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHJlZGlyZWN0IFVSTHMgZm9yIHNhdmUgbW9kZXNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeWlheC9gO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtIC0gdGhpcyB3YXMgbWlzc2luZyFcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gdGhlIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAgICBjb25zdCBlbGVtZW50cyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNlbEhvc3QnKSxcbiAgICAgICAgICAgIHBvcnQ6ICQoJyNlbFBvcnQnKSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjZWxVc2VybmFtZScpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjZWxTZWNyZXQnKSxcbiAgICAgICAgICAgIHJlY2VpdmVDYWxsczogJCgnI2VsUmVjZWl2ZUNhbGxzJyksXG4gICAgICAgICAgICBuZXR3b3JrRmlsdGVyOiAkKCcjZWxOZXR3b3JrRmlsdGVyJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogdGhpcy4kc2VjcmV0LFxuICAgICAgICAgICAgcG9ydDogJCgnI3BvcnQnKSxcbiAgICAgICAgICAgIHF1YWxpZnk6ICQoJyNxdWFsaWZ5JylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxhYmVscyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNob3N0TGFiZWxUZXh0JyksXG4gICAgICAgICAgICBwb3J0OiAkKCcjcG9ydExhYmVsVGV4dCcpLFxuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyN1c2VybmFtZUxhYmVsVGV4dCcpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjc2VjcmV0TGFiZWxUZXh0JylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgY29uc3QgY29uZmlncyA9IHtcbiAgICAgICAgICAgIG91dGJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ3JlY2VpdmVDYWxscycsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBvcnQsXG4gICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJMb2dpbixcbiAgICAgICAgICAgICAgICAgICAgc2VjcmV0OiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQYXNzd29yZFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLk5PTkVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRQb3J0OiAnNDU2OSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbmJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdyZWNlaXZlQ2FsbHMnLCAnbmV0d29ya0ZpbHRlciddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWydwb3J0J10sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXNlcm5hbWUnLCAnc2VjcmV0J10sXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IFsnaG9zdCcsICdwb3J0J10sXG4gICAgICAgICAgICAgICAgbGFiZWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc2VjcmV0OiBnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25QYXNzd29yZFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVhZG9ubHlVc2VybmFtZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdXRvR2VuZXJhdGVQYXNzd29yZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vbmU6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZScsICdzZWNyZXQnLCAncmVjZWl2ZUNhbGxzJywgJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFtdLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZSddLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiBbJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiBnbG9iYWxUcmFuc2xhdGUucHJfUGVlckhvc3RPcklQQWRkcmVzcyxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQb3J0LFxuICAgICAgICAgICAgICAgICAgICB1c2VybmFtZTogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJVc2VybmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc2VjcmV0OiBnbG9iYWxUcmFuc2xhdGUucHJfUGVlclBhc3N3b3JkXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0UG9ydDogJzQ1NjknLFxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZFRvb2x0aXA6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgY29uZmlnID0gY29uZmlnc1tyZWdUeXBlXSB8fCBjb25maWdzLm91dGJvdW5kO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgdmlzaWJpbGl0eVxuICAgICAgICBjb25maWcudmlzaWJsZS5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5zaG93KCkpO1xuICAgICAgICBjb25maWcuaGlkZGVuLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LmhpZGUoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSByZXF1aXJlZC9vcHRpb25hbCBjbGFzc2VzXG4gICAgICAgIGNvbmZpZy5yZXF1aXJlZD8uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8uYWRkQ2xhc3MoJ3JlcXVpcmVkJykpO1xuICAgICAgICBjb25maWcub3B0aW9uYWw/LmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBsYWJlbHNcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoY29uZmlnLmxhYmVscykuZm9yRWFjaCgoW2tleSwgdGV4dF0pID0+IHtcbiAgICAgICAgICAgIGxhYmVsc1trZXldPy50ZXh0KHRleHQpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSB1c2VybmFtZSBmaWVsZCBmb3IgaW5ib3VuZFxuICAgICAgICBpZiAoY29uZmlnLnJlYWRvbmx5VXNlcm5hbWUpIHtcbiAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS52YWwocHJvdmlkZXJJZCkuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaWVsZHMudXNlcm5hbWUucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCBpZiBlbXB0eVxuICAgICAgICBpZiAoY29uZmlnLmF1dG9HZW5lcmF0ZVBhc3N3b3JkICYmIGZpZWxkcy5zZWNyZXQudmFsKCkudHJpbSgpID09PSAnJyAmJiB0aGlzLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0LmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bj8udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGRlZmF1bHQgcG9ydCBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGNvbmZpZy5kZWZhdWx0UG9ydCAmJiAoZmllbGRzLnBvcnQudmFsKCkgPT09ICcnIHx8IGZpZWxkcy5wb3J0LnZhbCgpID09PSAnMCcpKSB7XG4gICAgICAgICAgICBmaWVsZHMucG9ydC52YWwoY29uZmlnLmRlZmF1bHRQb3J0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHdpZGdldCBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmICh0aGlzLnBhc3N3b3JkV2lkZ2V0ICYmIGNvbmZpZy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQudXBkYXRlQ29uZmlnKHRoaXMucGFzc3dvcmRXaWRnZXQsIGNvbmZpZy5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBwYXNzd29yZCB0b29sdGlwXG4gICAgICAgIGlmIChjb25maWcuc2hvd1Bhc3N3b3JkVG9vbHRpcCkge1xuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWx3YXlzIGVuYWJsZSBxdWFsaWZ5IGZvciBJQVggKE5BVCBrZWVwYWxpdmUpXG4gICAgICAgIGZpZWxkcy5xdWFsaWZ5LnByb3AoJ2NoZWNrZWQnLCB0cnVlKS52YWwoJzEnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZXJyb3JzIGZvciBoaWRkZW4gZmllbGRzXG4gICAgICAgIGNvbmZpZy5oaWRkZW4uZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0ga2V5LnJlcGxhY2UoJ2VsJywgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCBmaWVsZE5hbWUpO1xuICAgICAgICAgICAgJChgIyR7ZmllbGROYW1lfWApLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IE1vZGlmaWVkIGZvcm0gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9ybS5qcyB3aXRoIGFwaVNldHRpbmdzLmVuYWJsZWQgYW5kIGF1dG9EZXRlY3RNZXRob2Qgd2lsbCBhdXRvbWF0aWNhbGx5OlxuICAgICAgICAvLyAxLiBDb2xsZWN0IGZvcm0gZGF0YVxuICAgICAgICAvLyAyLiBDb252ZXJ0IGNoZWNrYm94ZXMgdXNpbmcgY29udmVydENoZWNrYm94ZXNUb0Jvb2xcbiAgICAgICAgLy8gMy4gRGV0ZWN0IGlmIHJlY29yZCBpcyBuZXcgYmFzZWQgb24gaWQgZmllbGRcbiAgICAgICAgLy8gNC4gQ2FsbCB0aGUgYXBwcm9wcmlhdGUgQVBJIG1ldGhvZCAoY3JlYXRlL3VwZGF0ZSlcbiAgICAgICAgXG4gICAgICAgIC8vIEp1c3QgYWRkIHByb3ZpZGVyLXNwZWNpZmljIGRhdGFcbiAgICAgICAgcmVzdWx0LmRhdGEudHlwZSA9ICdJQVgnO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5zdXJlIElEIGZpZWxkIGV4aXN0c1xuICAgICAgICByZXN1bHQuZGF0YS5pZCA9IHJlc3VsdC5kYXRhLmlkIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHNlcnZlclxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgY29uc3QgbmV3SWQgPSByZXNwb25zZS5kYXRhLmlkO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGZvcm0gSUQgZmllbGRcbiAgICAgICAgICAgICQoJyNpZCcpLnZhbChuZXdJZCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBpc05ld1Byb3ZpZGVyIGZsYWdcbiAgICAgICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBFbmFibGUgZGlhZ25vc3RpY3MgdGFiIGZvciBleGlzdGluZyBwcm92aWRlcnNcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmNzcygnb3BhY2l0eScsICcnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ2N1cnNvcicsICcnKTtcblxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIHN1cGVyLnBvcHVsYXRlRm9ybURhdGEoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJQVgtc3BlY2lmaWMgZGF0YSBwb3B1bGF0aW9uIGNhbiBiZSBhZGRlZCBoZXJlIGlmIG5lZWRlZFxuICAgIH1cbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHByb3ZpZGVyIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IFByb3ZpZGVySUFYKCk7XG4gICAgcHJvdmlkZXIuaW5pdGlhbGl6ZSgpO1xufSk7Il19