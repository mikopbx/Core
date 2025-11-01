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
      // Call parent first
      _get(_getPrototypeOf(ProviderIAX.prototype), "initializeEventHandlers", this).call(this); // IAX-specific event handlers


      this.initializeRealtimeValidation();
      this.initializeRegistrationTypeHandlers();
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
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
          }, {
            type: 'minLength[5]',
            prompt: globalTranslate.pr_ValidationProviderPasswordTooShort
          }]
        }; // Host is optional for inbound
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
          _this = this;

      var regType = $('#registration_type').val();
      var providerId = $('#id').val(); // Cache DOM elements

      var elements = {
        host: $('#elHost'),
        port: $('#elPort'),
        username: $('#elUsername'),
        secret: $('#elSecret'),
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
          hidden: ['networkFilter'],
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
          visible: ['host', 'username', 'secret', 'networkFilter'],
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
          visible: ['host', 'port', 'username', 'secret', 'networkFilter'],
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

        _this.$formObj.form('remove prompt', fieldName);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVUYWJzIiwiaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbiIsImluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMiLCJzZWxmIiwiaXNOZXdQcm92aWRlciIsIiQiLCJhZGRDbGFzcyIsInJlbW92ZUNsYXNzIiwidGFiIiwib25WaXNpYmxlIiwidGFiUGF0aCIsInByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyIiwiaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiIiwib25Mb2FkIiwicGFyYW1ldGVyQXJyYXkiLCJoaXN0b3J5RXZlbnQiLCJvZmYiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiIsIlByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIiLCJpbml0aWFsaXplIiwic2hvd0lheFdhcm5pbmciLCJ2YWwiLCJ3YXJuaW5nSHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsImlheF9EZXByZWNhdGlvbldhcm5pbmdUaXRsZSIsImlheF9EZXByZWNhdGlvbldhcm5pbmdUZXh0IiwiaHRtbCIsImNsb3Nlc3QiLCJ0cmFuc2l0aW9uIiwiJHRoaXMiLCJ2YWx1ZSIsImNsZWFuVmFsdWUiLCJyZXBsYWNlIiwicGFyZW50IiwiYXBwZW5kIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyIsInNldFRpbWVvdXQiLCJyZW1vdmUiLCJyZWdUeXBlIiwicnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJ0eXBlIiwicHJvbXB0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHkiLCJob3N0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInNlY3JldCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCJGb3JtIiwiJGZvcm1PYmoiLCJ1cmwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiSWF4UHJvdmlkZXJzQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImluaXRpYWxpemVGaWVsZFRvb2x0aXBzIiwiZm9ybUluaXRpYWxpemVkIiwicHJvdmlkZXJJZCIsImVsZW1lbnRzIiwibmV0d29ya0ZpbHRlciIsImZpZWxkcyIsIiRzZWNyZXQiLCJxdWFsaWZ5IiwibGFiZWxzIiwiY29uZmlncyIsIm91dGJvdW5kIiwidmlzaWJsZSIsImhpZGRlbiIsInJlcXVpcmVkIiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9Qcm92aWRlclBvcnQiLCJwcl9Qcm92aWRlckxvZ2luIiwicHJfUHJvdmlkZXJQYXNzd29yZCIsInBhc3N3b3JkV2lkZ2V0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJ2YWxpZGF0aW9uIiwiUGFzc3dvcmRXaWRnZXQiLCJWQUxJREFUSU9OIiwiTk9ORSIsImRlZmF1bHRQb3J0IiwiaW5ib3VuZCIsIm9wdGlvbmFsIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSIsInByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQiLCJTT0ZUIiwiYXV0b0dlbmVyYXRlUGFzc3dvcmQiLCJub25lIiwicHJfUGVlckhvc3RPcklQQWRkcmVzcyIsInByX1BlZXJQb3J0IiwicHJfUGVlclVzZXJuYW1lIiwicHJfUGVlclBhc3N3b3JkIiwic2hvd1Bhc3N3b3JkVG9vbHRpcCIsImNvbmZpZyIsImZvckVhY2giLCJrZXkiLCJzaG93IiwiaGlkZSIsIk9iamVjdCIsImVudHJpZXMiLCJ0ZXh0IiwicmVtb3ZlQXR0ciIsInRyaW0iLCIkZ2VuZXJhdGVCdG4iLCJ0cmlnZ2VyIiwidXBkYXRlQ29uZmlnIiwiaGlkZVBhc3N3b3JkVG9vbHRpcCIsInByb3AiLCJmaWVsZE5hbWUiLCJ0b0xvd2VyQ2FzZSIsImZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImRhdGEiLCJpZCIsInJlc3BvbnNlIiwibmV3SWQiLCJjc3MiLCJQcm92aWRlckJhc2UiLCJkb2N1bWVudCIsInJlYWR5IiwicHJvdmlkZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFc7Ozs7O0FBQ0YseUJBQWM7QUFBQTs7QUFBQSw2QkFDSixLQURJO0FBRWI7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7Ozs7V0FDSSxzQkFBYTtBQUNUO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksa0NBQXlCO0FBQ3JCO0FBQ0EsOEZBRnFCLENBSXJCOzs7QUFDQSxXQUFLQywy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QUFULENBQWNDLEVBQS9ELEVBQW1FO0FBQy9ELFlBQU1FLEtBQUssR0FBR0QsUUFBUSxDQUFDRixJQUFULENBQWNDLEVBQTVCLENBRCtELENBRy9EOztBQUNBckksUUFBQUEsQ0FBQyxDQUFDLEtBQUQsQ0FBRCxDQUFTbUIsR0FBVCxDQUFhb0gsS0FBYixFQUorRCxDQU0vRDs7QUFDQSxhQUFLeEksYUFBTCxHQUFxQixLQUFyQixDQVArRCxDQVMvRDs7QUFDQUMsUUFBQUEsQ0FBQyxDQUFDLG1EQUFELENBQUQsQ0FDS0UsV0FETCxDQUNpQixVQURqQixFQUVLc0ksR0FGTCxDQUVTLFNBRlQsRUFFb0IsRUFGcEIsRUFHS0EsR0FITCxDQUdTLFFBSFQsRUFHbUIsRUFIbkIsRUFWK0QsQ0FlL0Q7QUFDSDtBQUNKO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSwwQkFBaUJKLElBQWpCLEVBQXVCO0FBQ25CLHdGQUF1QkEsSUFBdkIsRUFEbUIsQ0FHbkI7O0FBQ0g7Ozs7RUF4aUJxQkssWTtBQTJpQjFCO0FBQ0E7QUFDQTs7O0FBQ0F6SSxDQUFDLENBQUMwSSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCLE1BQU1DLFFBQVEsR0FBRyxJQUFJbkosV0FBSixFQUFqQjtBQUNBbUosRUFBQUEsUUFBUSxDQUFDM0gsVUFBVDtBQUNILENBSEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQcm92aWRlckJhc2UsIFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIsIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXIsIGkxOG4sIElheFByb3ZpZGVyc0FQSSAqL1xuXG4vKipcbiAqIElBWCBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1cbiAqIEBjbGFzcyBQcm92aWRlcklBWFxuICovXG5jbGFzcyBQcm92aWRlcklBWCBleHRlbmRzIFByb3ZpZGVyQmFzZSB7XG4gICAgY29uc3RydWN0b3IoKSB7IFxuICAgICAgICBzdXBlcignSUFYJyk7IFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICogT3ZlcnJpZGUgdG8gYWRkIElBWC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IGluaXRpYWxpemUgLSB0aGlzIGhhbmRsZXMgdGhlIGZ1bGwgZmxvdzpcbiAgICAgICAgLy8gMS4gaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpXG4gICAgICAgIC8vIDIuIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKClcbiAgICAgICAgLy8gMy4gaW5pdGlhbGl6ZUZvcm0oKVxuICAgICAgICAvLyA0LiBsb2FkRm9ybURhdGEoKVxuICAgICAgICBzdXBlci5pbml0aWFsaXplKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyB0byBhZGQgSUFYLXNwZWNpZmljIFVJIGluaXRpYWxpemF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgLy8gQ2FsbCBwYXJlbnQgZmlyc3RcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBVSSBjb21wb25lbnRzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRhYnMoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBPdmVycmlkZSBpbml0aWFsaXplRXZlbnRIYW5kbGVycyB0byBhZGQgSUFYLXNwZWNpZmljIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIENhbGwgcGFyZW50IGZpcnN0XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemVFdmVudEhhbmRsZXJzKCk7XG5cbiAgICAgICAgLy8gSUFYLXNwZWNpZmljIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgIGlmICh0aGlzLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiAodGFiUGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHR5cGVvZiBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciAhPT0gJ3VuZGVmaW5lZCcgJiYgIXNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpYWdub3N0aWNzIHRhYiB3aGVuIGl0IGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5pbml0aWFsaXplRGlhZ25vc3RpY3NUYWIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25Mb2FkOiAodGFiUGF0aCwgcGFyYW1ldGVyQXJyYXksIGhpc3RvcnlFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEJsb2NrIGxvYWRpbmcgb2YgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN3aXRjaCBiYWNrIHRvIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwic2V0dGluZ3NcIl0nKS50YWIoJ2NoYW5nZSB0YWInLCAnc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNsaWNrIHByZXZlbnRpb24gZm9yIGRpc2FibGVkIHRhYlxuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKS5vZmYoJ2NsaWNrLmRpc2FibGVkJykub24oJ2NsaWNrLmRpc2FibGVkJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKHNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBzdGF5IG9uIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCkge1xuICAgICAgICBQcm92aWRlcklheFRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBJQVggd2FybmluZyBtZXNzYWdlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlKCkge1xuICAgICAgICAvLyBTaG93IElBWCBkZXByZWNhdGVkIHdhcm5pbmcgaWYgZW5hYmxlZFxuICAgICAgICBjb25zdCBzaG93SWF4V2FybmluZyA9ICQoJyNzaG93LWlheC13YXJuaW5nJykudmFsKCkgPT09ICcxJztcbiAgICAgICAgaWYgKHNob3dJYXhXYXJuaW5nKSB7XG4gICAgICAgICAgICBjb25zdCB3YXJuaW5nSHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCIgaWQ9XCJpYXgtZGVwcmVjYXRpb24tbm90aWNlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2xvc2UgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RpdGxlfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPHA+JHtnbG9iYWxUcmFuc2xhdGUuaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RleHR9PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICQoJyNpYXgtd2FybmluZy1wbGFjZWhvbGRlcicpLmh0bWwod2FybmluZ0h0bWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBbGxvdyB1c2VyIHRvIGNsb3NlIHRoZSB3YXJuaW5nXG4gICAgICAgICAgICAkKCcjaWF4LWRlcHJlY2F0aW9uLW5vdGljZSAuY2xvc2UuaWNvbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQodGhpcykuY2xvc2VzdCgnLm1lc3NhZ2UnKS50cmFuc2l0aW9uKCdmYWRlJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlYWwtdGltZSB2YWxpZGF0aW9uIGZvciBzcGVjaWZpYyBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVhbHRpbWVWYWxpZGF0aW9uKCkge1xuICAgICAgICAvLyBSZWFsLXRpbWUgdmFsaWRhdGlvbiBmb3IgdXNlcm5hbWUgLSByZXN0cmljdCBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgJCgnI3VzZXJuYW1lJykub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICR0aGlzLnZhbCgpO1xuICAgICAgICAgICAgLy8gQWxsb3cgb25seSBhbHBoYW51bWVyaWMsIGRhc2ggYW5kIHVuZGVyc2NvcmVcbiAgICAgICAgICAgIGNvbnN0IGNsZWFuVmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9bXmEtekEtWjAtOV8tXS9nLCAnJyk7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT09IGNsZWFuVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAkdGhpcy52YWwoY2xlYW5WYWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGFib3V0IGludmFsaWQgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgICR0aGlzLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICR0aGlzLnBhcmVudCgpLmFwcGVuZCgnPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nIHJlZCBiYXNpYyBsYWJlbCB0ZW1wb3Jhcnktd2FybmluZ1wiPicgK1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyArXG4gICAgICAgICAgICAgICAgICAgICc8L2Rpdj4nKTtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgd2FybmluZyBhZnRlciAzIHNlY29uZHNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnRlbXBvcmFyeS13YXJuaW5nJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICR0aGlzLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByZWdpc3RyYXRpb24gdHlwZSBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzKCkge1xuICAgICAgICAvLyBBbHJlYWR5IGhhbmRsZWQgYnkgcGFyZW50IGNsYXNzIGRyb3Bkb3duIGluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIFRoaXMgaXMgZm9yIElBWC1zcGVjaWZpYyBiZWhhdmlvciBpZiBuZWVkZWRcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcHJvdmlkZXIgc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcnVsZXMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbW1vbiBydWxlcyBmb3IgYWxsIHJlZ2lzdHJhdGlvbiB0eXBlc1xuICAgICAgICBydWxlcy5kZXNjcmlwdGlvbiA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBSdWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgLy8gT1VUQk9VTkQ6IFdlIHJlZ2lzdGVyIHRvIHByb3ZpZGVyXG4gICAgICAgICAgICBydWxlcy5ob3N0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTkuLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMudXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Xy1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdIC8vIE5vIHZhbGlkYXRpb24gZm9yIG91dGJvdW5kIHBhc3N3b3Jkc1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJ1bGVzLnBvcnQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgLy8gSU5CT1VORDogUHJvdmlkZXIgY29ubmVjdHMgdG8gdXNcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcnVsZXMudXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Xy1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIEhvc3QgaXMgb3B0aW9uYWwgZm9yIGluYm91bmRcbiAgICAgICAgICAgIC8vIFBvcnQgaXMgbm90IHNob3duIGZvciBpbmJvdW5kXG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAvLyBOT05FOiBTdGF0aWMgcGVlci10by1wZWVyIGNvbm5lY3Rpb25cbiAgICAgICAgICAgIHJ1bGVzLmhvc3QgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy51c2VybmFtZSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTlfLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIFBhc3N3b3JkIGlzIG9wdGlvbmFsIGZvciBub25lIG1vZGVcbiAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJ1bGVzLnBvcnQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BvcnQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMS4uNjU1MzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggUkVTVCBBUEkgY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gdGhpcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciB2M1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogSWF4UHJvdmlkZXJzQVBJLCAvLyBVc2UgSUFYLXNwZWNpZmljIEFQSSBjbGllbnQgdjNcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFNldCByZWRpcmVjdCBVUkxzIGZvciBzYXZlIG1vZGVzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnlpYXgvYDtcblxuICAgICAgICAvLyBFbmFibGUgYXV0b21hdGljIGNoZWNrYm94IHRvIGJvb2xlYW4gY29udmVyc2lvblxuICAgICAgICBGb3JtLmNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtIC0gdGhpcyB3YXMgbWlzc2luZyFcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzIGFmdGVyIFBhc3N3b3JkV2lkZ2V0IGhhcyBjcmVhdGVkIGFsbCBidXR0b25zXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKTtcblxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gdGhlIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAgICBjb25zdCBlbGVtZW50cyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNlbEhvc3QnKSxcbiAgICAgICAgICAgIHBvcnQ6ICQoJyNlbFBvcnQnKSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjZWxVc2VybmFtZScpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjZWxTZWNyZXQnKSxcbiAgICAgICAgICAgIG5ldHdvcmtGaWx0ZXI6ICQoJyNlbE5ldHdvcmtGaWx0ZXInKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZmllbGRzID0ge1xuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyN1c2VybmFtZScpLFxuICAgICAgICAgICAgc2VjcmV0OiB0aGlzLiRzZWNyZXQsXG4gICAgICAgICAgICBwb3J0OiAkKCcjcG9ydCcpLFxuICAgICAgICAgICAgcXVhbGlmeTogJCgnI3F1YWxpZnknKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgY29uc3QgbGFiZWxzID0ge1xuICAgICAgICAgICAgaG9zdDogJCgnI2hvc3RMYWJlbFRleHQnKSxcbiAgICAgICAgICAgIHBvcnQ6ICQoJyNwb3J0TGFiZWxUZXh0JyksXG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI3VzZXJuYW1lTGFiZWxUZXh0JyksXG4gICAgICAgICAgICBzZWNyZXQ6ICQoJyNzZWNyZXRMYWJlbFRleHQnKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJhdGlvbiBmb3IgZWFjaCByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBjb25zdCBjb25maWdzID0ge1xuICAgICAgICAgICAgb3V0Ym91bmQ6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZScsICdzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFsnbmV0d29ya0ZpbHRlciddLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZScsICdzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzLFxuICAgICAgICAgICAgICAgICAgICBwb3J0OiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQb3J0LFxuICAgICAgICAgICAgICAgICAgICB1c2VybmFtZTogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyTG9naW4sXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUGFzc3dvcmRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5OT05FXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0UG9ydDogJzQ1NjknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5ib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICd1c2VybmFtZScsICdzZWNyZXQnLCAnbmV0d29ya0ZpbHRlciddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWydwb3J0J10sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXNlcm5hbWUnLCAnc2VjcmV0J10sXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IFsnaG9zdCcsICdwb3J0J10sXG4gICAgICAgICAgICAgICAgbGFiZWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MsXG4gICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc2VjcmV0OiBnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25QYXNzd29yZFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgYXV0b0dlbmVyYXRlUGFzc3dvcmQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub25lOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFtdLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZSddLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiBbJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiBnbG9iYWxUcmFuc2xhdGUucHJfUGVlckhvc3RPcklQQWRkcmVzcyxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQb3J0LFxuICAgICAgICAgICAgICAgICAgICB1c2VybmFtZTogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJVc2VybmFtZSxcbiAgICAgICAgICAgICAgICAgICAgc2VjcmV0OiBnbG9iYWxUcmFuc2xhdGUucHJfUGVlclBhc3N3b3JkXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0UG9ydDogJzQ1NjknLFxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZFRvb2x0aXA6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgY29uZmlnID0gY29uZmlnc1tyZWdUeXBlXSB8fCBjb25maWdzLm91dGJvdW5kO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgdmlzaWJpbGl0eVxuICAgICAgICBjb25maWcudmlzaWJsZS5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5zaG93KCkpO1xuICAgICAgICBjb25maWcuaGlkZGVuLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LmhpZGUoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSByZXF1aXJlZC9vcHRpb25hbCBjbGFzc2VzXG4gICAgICAgIGNvbmZpZy5yZXF1aXJlZD8uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8uYWRkQ2xhc3MoJ3JlcXVpcmVkJykpO1xuICAgICAgICBjb25maWcub3B0aW9uYWw/LmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBsYWJlbHNcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoY29uZmlnLmxhYmVscykuZm9yRWFjaCgoW2tleSwgdGV4dF0pID0+IHtcbiAgICAgICAgICAgIGxhYmVsc1trZXldPy50ZXh0KHRleHQpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgdXNlcm5hbWUgZmllbGQgLSBlbnN1cmUgaXQncyBhbHdheXMgZWRpdGFibGVcbiAgICAgICAgZmllbGRzLnVzZXJuYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG5cbiAgICAgICAgLy8gUHJlLWZpbGwgdXNlcm5hbWUgd2l0aCBwcm92aWRlciBJRCBmb3IgbmV3IGluYm91bmQgcHJvdmlkZXJzXG4gICAgICAgIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcgJiYgdGhpcy5pc05ld1Byb3ZpZGVyICYmICghZmllbGRzLnVzZXJuYW1lLnZhbCgpIHx8IGZpZWxkcy51c2VybmFtZS52YWwoKS50cmltKCkgPT09ICcnKSkge1xuICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnZhbChwcm92aWRlcklkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCBpZiBlbXB0eVxuICAgICAgICBpZiAoY29uZmlnLmF1dG9HZW5lcmF0ZVBhc3N3b3JkICYmIGZpZWxkcy5zZWNyZXQudmFsKCkudHJpbSgpID09PSAnJyAmJiB0aGlzLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0LmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bj8udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGRlZmF1bHQgcG9ydCBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGNvbmZpZy5kZWZhdWx0UG9ydCAmJiAoZmllbGRzLnBvcnQudmFsKCkgPT09ICcnIHx8IGZpZWxkcy5wb3J0LnZhbCgpID09PSAnMCcpKSB7XG4gICAgICAgICAgICBmaWVsZHMucG9ydC52YWwoY29uZmlnLmRlZmF1bHRQb3J0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHdpZGdldCBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmICh0aGlzLnBhc3N3b3JkV2lkZ2V0ICYmIGNvbmZpZy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQudXBkYXRlQ29uZmlnKHRoaXMucGFzc3dvcmRXaWRnZXQsIGNvbmZpZy5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBwYXNzd29yZCB0b29sdGlwXG4gICAgICAgIGlmIChjb25maWcuc2hvd1Bhc3N3b3JkVG9vbHRpcCkge1xuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWx3YXlzIGVuYWJsZSBxdWFsaWZ5IGZvciBJQVggKE5BVCBrZWVwYWxpdmUpXG4gICAgICAgIGZpZWxkcy5xdWFsaWZ5LnByb3AoJ2NoZWNrZWQnLCB0cnVlKS52YWwoJzEnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZXJyb3JzIGZvciBoaWRkZW4gZmllbGRzXG4gICAgICAgIGNvbmZpZy5oaWRkZW4uZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0ga2V5LnJlcGxhY2UoJ2VsJywgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCBmaWVsZE5hbWUpO1xuICAgICAgICAgICAgJChgIyR7ZmllbGROYW1lfWApLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IE1vZGlmaWVkIGZvcm0gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9ybS5qcyB3aXRoIGFwaVNldHRpbmdzLmVuYWJsZWQgYW5kIGF1dG9EZXRlY3RNZXRob2Qgd2lsbCBhdXRvbWF0aWNhbGx5OlxuICAgICAgICAvLyAxLiBDb2xsZWN0IGZvcm0gZGF0YVxuICAgICAgICAvLyAyLiBDb252ZXJ0IGNoZWNrYm94ZXMgdXNpbmcgY29udmVydENoZWNrYm94ZXNUb0Jvb2xcbiAgICAgICAgLy8gMy4gRGV0ZWN0IGlmIHJlY29yZCBpcyBuZXcgYmFzZWQgb24gaWQgZmllbGRcbiAgICAgICAgLy8gNC4gQ2FsbCB0aGUgYXBwcm9wcmlhdGUgQVBJIG1ldGhvZCAoY3JlYXRlL3VwZGF0ZSlcbiAgICAgICAgXG4gICAgICAgIC8vIEp1c3QgYWRkIHByb3ZpZGVyLXNwZWNpZmljIGRhdGFcbiAgICAgICAgcmVzdWx0LmRhdGEudHlwZSA9ICdJQVgnO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5zdXJlIElEIGZpZWxkIGV4aXN0c1xuICAgICAgICByZXN1bHQuZGF0YS5pZCA9IHJlc3VsdC5kYXRhLmlkIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHNlcnZlclxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgY29uc3QgbmV3SWQgPSByZXNwb25zZS5kYXRhLmlkO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGZvcm0gSUQgZmllbGRcbiAgICAgICAgICAgICQoJyNpZCcpLnZhbChuZXdJZCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBpc05ld1Byb3ZpZGVyIGZsYWdcbiAgICAgICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBFbmFibGUgZGlhZ25vc3RpY3MgdGFiIGZvciBleGlzdGluZyBwcm92aWRlcnNcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmNzcygnb3BhY2l0eScsICcnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ2N1cnNvcicsICcnKTtcblxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIHN1cGVyLnBvcHVsYXRlRm9ybURhdGEoZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJQVgtc3BlY2lmaWMgZGF0YSBwb3B1bGF0aW9uIGNhbiBiZSBhZGRlZCBoZXJlIGlmIG5lZWRlZFxuICAgIH1cbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHByb3ZpZGVyIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGNvbnN0IHByb3ZpZGVyID0gbmV3IFByb3ZpZGVySUFYKCk7XG4gICAgcHJvdmlkZXIuaW5pdGlhbGl6ZSgpO1xufSk7Il19