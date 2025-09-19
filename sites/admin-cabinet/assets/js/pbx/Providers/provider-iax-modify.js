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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzIiwiaW5pdGlhbGl6ZVRhYnMiLCIkIiwiY2hlY2tib3giLCJyZWdUeXBlIiwidmFsIiwiJGZvcm1PYmoiLCJmb3JtIiwiJHNlY3JldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsImlzQ2hlY2tlZCIsInNldFRpbWVvdXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRmllbGRUb29sdGlwcyIsInNlbGYiLCJpc05ld1Byb3ZpZGVyIiwiYWRkQ2xhc3MiLCJ0YWIiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJvbkxvYWQiLCJwYXJhbWV0ZXJBcnJheSIsImhpc3RvcnlFdmVudCIsIm9mZiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwiUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJzaG93SWF4V2FybmluZyIsIndhcm5pbmdIdG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwiaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RpdGxlIiwiaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RleHQiLCJodG1sIiwidHJhbnNpdGlvbiIsIiR0aGlzIiwidmFsdWUiLCJjbGVhblZhbHVlIiwicmVwbGFjZSIsInBhcmVudCIsImFwcGVuZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMiLCJyZW1vdmUiLCJydWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsImhvc3QiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyIsInVzZXJuYW1lIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5Iiwic2VjcmV0IiwicG9ydCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQiLCJyZWNlaXZlQ2FsbHNDaGVja2VkIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCJ1cmwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiSWF4UHJvdmlkZXJzQVBJIiwiYXV0b0RldGVjdE1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImZvcm1Jbml0aWFsaXplZCIsInByb3ZpZGVySWQiLCJlbGVtZW50cyIsInJlY2VpdmVDYWxscyIsIm5ldHdvcmtGaWx0ZXIiLCJmaWVsZHMiLCJxdWFsaWZ5IiwibGFiZWxzIiwiY29uZmlncyIsIm91dGJvdW5kIiwidmlzaWJsZSIsImhpZGRlbiIsInJlcXVpcmVkIiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9Qcm92aWRlclBvcnQiLCJwcl9Qcm92aWRlckxvZ2luIiwicHJfUHJvdmlkZXJQYXNzd29yZCIsInBhc3N3b3JkV2lkZ2V0IiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJ2YWxpZGF0aW9uIiwiUGFzc3dvcmRXaWRnZXQiLCJWQUxJREFUSU9OIiwiTk9ORSIsImRlZmF1bHRQb3J0IiwiaW5ib3VuZCIsIm9wdGlvbmFsIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSIsInByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQiLCJTT0ZUIiwicmVhZG9ubHlVc2VybmFtZSIsImF1dG9HZW5lcmF0ZVBhc3N3b3JkIiwibm9uZSIsInByX1BlZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9QZWVyUG9ydCIsInByX1BlZXJVc2VybmFtZSIsInByX1BlZXJQYXNzd29yZCIsInNob3dQYXNzd29yZFRvb2x0aXAiLCJjb25maWciLCJmb3JFYWNoIiwia2V5Iiwic2hvdyIsImhpZGUiLCJPYmplY3QiLCJlbnRyaWVzIiwidGV4dCIsImF0dHIiLCJyZW1vdmVBdHRyIiwidHJpbSIsIiRnZW5lcmF0ZUJ0biIsInRyaWdnZXIiLCJ1cGRhdGVDb25maWciLCJoaWRlUGFzc3dvcmRUb29sdGlwIiwicHJvcCIsImZpZWxkTmFtZSIsInRvTG93ZXJDYXNlIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwiaWQiLCJyZXNwb25zZSIsIm5ld0lkIiwiY3NzIiwiUHJvdmlkZXJCYXNlIiwiZG9jdW1lbnQiLCJyZWFkeSIsInByb3ZpZGVyIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxXOzs7OztBQUNGLHlCQUFjO0FBQUE7O0FBQUEsNkJBQ0osS0FESTtBQUViO0FBRUQ7QUFDSjtBQUNBOzs7OztXQUNJLHNCQUFhO0FB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QUFQO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLHlCQUFnQkcsUUFBaEIsRUFBMEI7QUFDdEIsVUFBSUEsUUFBUSxDQUFDSCxNQUFULEtBQW9CLElBQXBCLElBQTRCRyxRQUFRLENBQUNGLElBQXJDLElBQTZDRSxRQUFRLENBQUNGLElBQVQsQ0FBY0MsRUFBL0QsRUFBbUU7QUFDL0QsWUFBTUUsS0FBSyxHQUFHRCxRQUFRLENBQUNGLElBQVQsQ0FBY0MsRUFBNUIsQ0FEK0QsQ0FHL0Q7O0FBQ0E5SSxRQUFBQSxDQUFDLENBQUMsS0FBRCxDQUFELENBQVNHLEdBQVQsQ0FBYTZJLEtBQWIsRUFKK0QsQ0FNL0Q7O0FBQ0EsYUFBS2pJLGFBQUwsR0FBcUIsS0FBckIsQ0FQK0QsQ0FTL0Q7O0FBQ0FmLFFBQUFBLENBQUMsQ0FBQyxtREFBRCxDQUFELENBQ0tRLFdBREwsQ0FDaUIsVUFEakIsRUFFS3lJLEdBRkwsQ0FFUyxTQUZULEVBRW9CLEVBRnBCLEVBR0tBLEdBSEwsQ0FHUyxRQUhULEVBR21CLEVBSG5CLEVBVitELENBZS9EO0FBQ0g7QUFDSjtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7O1dBQ0ksMEJBQWlCSixJQUFqQixFQUF1QjtBQUNuQix3RkFBdUJBLElBQXZCLEVBRG1CLENBR25COztBQUNIOzs7O0VBNWlCcUJLLFk7QUEraUIxQjtBQUNBO0FBQ0E7OztBQUNBbEosQ0FBQyxDQUFDbUosUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQixNQUFNQyxRQUFRLEdBQUcsSUFBSTFKLFdBQUosRUFBakI7QUFDQTBKLEVBQUFBLFFBQVEsQ0FBQ3RILFVBQVQ7QUFDSCxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQcm92aWRlcklheFRvb2x0aXBNYW5hZ2VyLCBQcm92aWRlclRvb2x0aXBNYW5hZ2VyLCBpMThuLCBJYXhQcm92aWRlcnNBUEkgKi9cblxuLyoqXG4gKiBJQVggcHJvdmlkZXIgbWFuYWdlbWVudCBmb3JtXG4gKiBAY2xhc3MgUHJvdmlkZXJJQVhcbiAqL1xuY2xhc3MgUHJvdmlkZXJJQVggZXh0ZW5kcyBQcm92aWRlckJhc2Uge1xuICAgIGNvbnN0cnVjdG9yKCkgeyBcbiAgICAgICAgc3VwZXIoJ0lBWCcpOyBcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAgICB0aGlzLmluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGFicygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtdmFsaWRhdGUgZm9ybSB3aGVuIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIGNoYW5nZXNcbiAgICAgICAgJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoLmNoZWNrYm94JykuY2hlY2tib3goJ3NldHRpbmcnLCAnb25DaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBlcnJvciBvbiBzZWNyZXQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgIHRoaXMuJHNlY3JldC5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIGluYm91bmQgcmVnaXN0cmF0aW9uLCB2YWxpZGF0ZSBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc0NoZWNrZWQgJiYgdGhpcy4kc2VjcmV0LnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB1bmNoZWNrZWQgYW5kIHBhc3N3b3JkIGlzIGVtcHR5LCBzaG93IGVycm9yXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmaWVsZCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGUgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgIGlmICh0aGlzLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiAodGFiUGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHR5cGVvZiBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciAhPT0gJ3VuZGVmaW5lZCcgJiYgIXNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRpYWdub3N0aWNzIHRhYiB3aGVuIGl0IGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgICAgICBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlci5pbml0aWFsaXplRGlhZ25vc3RpY3NUYWIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25Mb2FkOiAodGFiUGF0aCwgcGFyYW1ldGVyQXJyYXksIGhpc3RvcnlFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEJsb2NrIGxvYWRpbmcgb2YgZGlhZ25vc3RpY3MgdGFiIGZvciBuZXcgcHJvdmlkZXJzXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdkaWFnbm9zdGljcycgJiYgc2VsZi5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN3aXRjaCBiYWNrIHRvIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwic2V0dGluZ3NcIl0nKS50YWIoJ2NoYW5nZSB0YWInLCAnc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNsaWNrIHByZXZlbnRpb24gZm9yIGRpc2FibGVkIHRhYlxuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKS5vZmYoJ2NsaWNrLmRpc2FibGVkJykub24oJ2NsaWNrLmRpc2FibGVkJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgaWYgKHNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBzdGF5IG9uIHNldHRpbmdzIHRhYlxuICAgICAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJzZXR0aW5nc1wiXScpLnRhYignY2hhbmdlIHRhYicsICdzZXR0aW5ncycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCkge1xuICAgICAgICBQcm92aWRlcklheFRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBJQVggd2FybmluZyBtZXNzYWdlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlKCkge1xuICAgICAgICAvLyBTaG93IElBWCBkZXByZWNhdGVkIHdhcm5pbmcgaWYgZW5hYmxlZFxuICAgICAgICBjb25zdCBzaG93SWF4V2FybmluZyA9ICQoJyNzaG93LWlheC13YXJuaW5nJykudmFsKCkgPT09ICcxJztcbiAgICAgICAgaWYgKHNob3dJYXhXYXJuaW5nKSB7XG4gICAgICAgICAgICBjb25zdCB3YXJuaW5nSHRtbCA9IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgd2FybmluZyBtZXNzYWdlXCIgaWQ9XCJpYXgtZGVwcmVjYXRpb24tbm90aWNlXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiY2xvc2UgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RpdGxlIHx8ICdJQVggUHJvdG9jb2wgTm90aWNlJ31cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLmlheF9EZXByZWNhdGlvbldhcm5pbmdUZXh0IHx8ICdJQVggcHJvdG9jb2wgaXMgZGVwcmVjYXRlZC4gQ29uc2lkZXIgdXNpbmcgU0lQIGluc3RlYWQuJ308L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgJCgnI2lheC13YXJuaW5nLXBsYWNlaG9sZGVyJykuaHRtbCh3YXJuaW5nSHRtbCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFsbG93IHVzZXIgdG8gY2xvc2UgdGhlIHdhcm5pbmdcbiAgICAgICAgICAgICQoJyNpYXgtZGVwcmVjYXRpb24tbm90aWNlIC5jbG9zZS5pY29uJykub24oJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5jbG9zZXN0KCcubWVzc2FnZScpLnRyYW5zaXRpb24oJ2ZhZGUnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVhbC10aW1lIHZhbGlkYXRpb24gZm9yIHNwZWNpZmljIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKSB7XG4gICAgICAgIC8vIFJlYWwtdGltZSB2YWxpZGF0aW9uIGZvciB1c2VybmFtZSAtIHJlc3RyaWN0IHNwZWNpYWwgY2hhcmFjdGVyc1xuICAgICAgICAkKCcjdXNlcm5hbWUnKS5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0aGlzID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJHRoaXMudmFsKCk7XG4gICAgICAgICAgICAvLyBBbGxvdyBvbmx5IGFscGhhbnVtZXJpYywgZGFzaCBhbmQgdW5kZXJzY29yZVxuICAgICAgICAgICAgY29uc3QgY2xlYW5WYWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1teYS16QS1aMC05Xy1dL2csICcnKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gY2xlYW5WYWx1ZSkge1xuICAgICAgICAgICAgICAgICR0aGlzLnZhbChjbGVhblZhbHVlKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHdhcm5pbmcgYWJvdXQgaW52YWxpZCBjaGFyYWN0ZXJzXG4gICAgICAgICAgICAgICAgJHRoaXMuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgJHRoaXMucGFyZW50KCkuYXBwZW5kKCc8ZGl2IGNsYXNzPVwidWkgcG9pbnRpbmcgcmVkIGJhc2ljIGxhYmVsIHRlbXBvcmFyeS13YXJuaW5nXCI+JyArXG4gICAgICAgICAgICAgICAgICAgIChnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyB8fCAnT25seSBsZXR0ZXJzLCBudW1iZXJzLCBkYXNoIGFuZCB1bmRlcnNjb3JlIGFsbG93ZWQnKSArXG4gICAgICAgICAgICAgICAgICAgICc8L2Rpdj4nKTtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgd2FybmluZyBhZnRlciAzIHNlY29uZHNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgnLnRlbXBvcmFyeS13YXJuaW5nJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICR0aGlzLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByZWdpc3RyYXRpb24gdHlwZSBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzKCkge1xuICAgICAgICAvLyBBbHJlYWR5IGhhbmRsZWQgYnkgcGFyZW50IGNsYXNzIGRyb3Bkb3duIGluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIFRoaXMgaXMgZm9yIElBWC1zcGVjaWZpYyBiZWhhdmlvciBpZiBuZWVkZWRcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcHJvdmlkZXIgc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgcnVsZXMgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbW1vbiBydWxlcyBmb3IgYWxsIHJlZ2lzdHJhdGlvbiB0eXBlc1xuICAgICAgICBydWxlcy5kZXNjcmlwdGlvbiA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBSdWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgLy8gT1VUQk9VTkQ6IFdlIHJlZ2lzdGVyIHRvIHByb3ZpZGVyXG4gICAgICAgICAgICBydWxlcy5ob3N0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTkuLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzIHx8ICdIb3N0IGNhbiBvbmx5IGNvbnRhaW4gbGV0dGVycywgbnVtYmVycywgZG90cyBhbmQgaHlwaGVucycsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy51c2VybmFtZSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTlfLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW10gLy8gTm8gdmFsaWRhdGlvbiBmb3Igb3V0Ym91bmQgcGFzc3dvcmRzXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMucG9ydCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAvLyBJTkJPVU5EOiBQcm92aWRlciBjb25uZWN0cyB0byB1c1xuICAgICAgICAgICAgY29uc3QgcmVjZWl2ZUNhbGxzQ2hlY2tlZCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJ1bGVzLnVzZXJuYW1lID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOV8tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQYXNzd29yZCB2YWxpZGF0aW9uIG9ubHkgaWYgcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggaXMgTk9UIGNoZWNrZWRcbiAgICAgICAgICAgIGlmICghcmVjZWl2ZUNhbGxzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhvc3QgaXMgb3B0aW9uYWwgZm9yIGluYm91bmRcbiAgICAgICAgICAgIC8vIFBvcnQgaXMgbm90IHNob3duIGZvciBpbmJvdW5kXG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAvLyBOT05FOiBTdGF0aWMgcGVlci10by1wZWVyIGNvbm5lY3Rpb25cbiAgICAgICAgICAgIHJ1bGVzLmhvc3QgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS4tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMgfHwgJ0hvc3QgY2FuIG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBkb3RzIGFuZCBoeXBoZW5zJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJ1bGVzLnVzZXJuYW1lID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOV8tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgLy8gUGFzc3dvcmQgaXMgb3B0aW9uYWwgZm9yIG5vbmUgbW9kZVxuICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMucG9ydCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBydWxlcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGhpcy5jYkJlZm9yZVNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gdGhpcy5jYkFmdGVyU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgdjMgd2l0aCBhdXRvLWRldGVjdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogSWF4UHJvdmlkZXJzQVBJLCAvLyBVc2UgSUFYLXNwZWNpZmljIEFQSSBjbGllbnQgdjNcbiAgICAgICAgICAgIGF1dG9EZXRlY3RNZXRob2Q6IHRydWUgLy8gQXV0b21hdGljYWxseSBkZXRlY3QgY3JlYXRlL3VwZGF0ZSBiYXNlZCBvbiBpZCBmaWVsZFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHJlZGlyZWN0IFVSTHMgZm9yIHNhdmUgbW9kZXNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeWlheC9gO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtIC0gdGhpcyB3YXMgbWlzc2luZyFcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gdGhlIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENhY2hlIERPTSBlbGVtZW50c1xuICAgICAgICBjb25zdCBlbGVtZW50cyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNlbEhvc3QnKSxcbiAgICAgICAgICAgIHBvcnQ6ICQoJyNlbFBvcnQnKSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjZWxVc2VybmFtZScpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjZWxTZWNyZXQnKSxcbiAgICAgICAgICAgIHJlY2VpdmVDYWxsczogJCgnI2VsUmVjZWl2ZUNhbGxzJyksXG4gICAgICAgICAgICBuZXR3b3JrRmlsdGVyOiAkKCcjZWxOZXR3b3JrRmlsdGVyJylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGZpZWxkcyA9IHtcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjdXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogdGhpcy4kc2VjcmV0LFxuICAgICAgICAgICAgcG9ydDogJCgnI3BvcnQnKSxcbiAgICAgICAgICAgIHF1YWxpZnk6ICQoJyNxdWFsaWZ5JylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGxhYmVscyA9IHtcbiAgICAgICAgICAgIGhvc3Q6ICQoJyNob3N0TGFiZWxUZXh0JyksXG4gICAgICAgICAgICBwb3J0OiAkKCcjcG9ydExhYmVsVGV4dCcpLFxuICAgICAgICAgICAgdXNlcm5hbWU6ICQoJyN1c2VybmFtZUxhYmVsVGV4dCcpLFxuICAgICAgICAgICAgc2VjcmV0OiAkKCcjc2VjcmV0TGFiZWxUZXh0JylcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyYXRpb24gZm9yIGVhY2ggcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgY29uc3QgY29uZmlncyA9IHtcbiAgICAgICAgICAgIG91dGJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0J10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbJ3JlY2VpdmVDYWxscycsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1Byb3ZpZGVyIEhvc3QvSVAnLFxuICAgICAgICAgICAgICAgICAgICBwb3J0OiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQb3J0IHx8ICdQcm92aWRlciBQb3J0JyxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckxvZ2luIHx8ICdMb2dpbicsXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUGFzc3dvcmQgfHwgJ1Bhc3N3b3JkJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLk5PTkVcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRQb3J0OiAnNDU2OSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbmJvdW5kOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCcsICdyZWNlaXZlQ2FsbHMnLCAnbmV0d29ya0ZpbHRlciddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWydwb3J0J10sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXNlcm5hbWUnLCAnc2VjcmV0J10sXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IFsnaG9zdCcsICdwb3J0J10sXG4gICAgICAgICAgICAgICAgbGFiZWxzOiB7XG4gICAgICAgICAgICAgICAgICAgIGhvc3Q6IGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MgfHwgJ1JlbW90ZSBIb3N0L0lQJyxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9BdXRoZW50aWNhdGlvblVzZXJuYW1lIHx8ICdBdXRoZW50aWNhdGlvbiBVc2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDogZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQgfHwgJ0F1dGhlbnRpY2F0aW9uIFBhc3N3b3JkJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcGFzc3dvcmRXaWRnZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93U3RyZW5ndGhCYXI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVhZG9ubHlVc2VybmFtZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdXRvR2VuZXJhdGVQYXNzd29yZDogdHJ1ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5vbmU6IHtcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZScsICdzZWNyZXQnLCAncmVjZWl2ZUNhbGxzJywgJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFtdLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZSddLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiBbJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiBnbG9iYWxUcmFuc2xhdGUucHJfUGVlckhvc3RPcklQQWRkcmVzcyB8fCAnUGVlciBIb3N0L0lQJyxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQb3J0IHx8ICdQZWVyIFBvcnQnLFxuICAgICAgICAgICAgICAgICAgICB1c2VybmFtZTogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJVc2VybmFtZSB8fCAnUGVlciBVc2VybmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHNlY3JldDogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQYXNzd29yZCB8fCAnUGVlciBQYXNzd29yZCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRlZmF1bHRQb3J0OiAnNDU2OScsXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkVG9vbHRpcDogdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgY29uZmlndXJhdGlvblxuICAgICAgICBjb25zdCBjb25maWcgPSBjb25maWdzW3JlZ1R5cGVdIHx8IGNvbmZpZ3Mub3V0Ym91bmQ7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSB2aXNpYmlsaXR5XG4gICAgICAgIGNvbmZpZy52aXNpYmxlLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LnNob3coKSk7XG4gICAgICAgIGNvbmZpZy5oaWRkZW4uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8uaGlkZSgpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGx5IHJlcXVpcmVkL29wdGlvbmFsIGNsYXNzZXNcbiAgICAgICAgY29uZmlnLnJlcXVpcmVkPy5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5hZGRDbGFzcygncmVxdWlyZWQnKSk7XG4gICAgICAgIGNvbmZpZy5vcHRpb25hbD8uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8ucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJykpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGxhYmVsc1xuICAgICAgICBPYmplY3QuZW50cmllcyhjb25maWcubGFiZWxzKS5mb3JFYWNoKChba2V5LCB0ZXh0XSkgPT4ge1xuICAgICAgICAgICAgbGFiZWxzW2tleV0/LnRleHQodGV4dCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHVzZXJuYW1lIGZpZWxkIGZvciBpbmJvdW5kXG4gICAgICAgIGlmIChjb25maWcucmVhZG9ubHlVc2VybmFtZSkge1xuICAgICAgICAgICAgZmllbGRzLnVzZXJuYW1lLnZhbChwcm92aWRlcklkKS5hdHRyKCdyZWFkb25seScsICcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLWdlbmVyYXRlIHBhc3N3b3JkIGZvciBpbmJvdW5kIGlmIGVtcHR5XG4gICAgICAgIGlmIChjb25maWcuYXV0b0dlbmVyYXRlUGFzc3dvcmQgJiYgZmllbGRzLnNlY3JldC52YWwoKS50cmltKCkgPT09ICcnICYmIHRoaXMucGFzc3dvcmRXaWRnZXQpIHtcbiAgICAgICAgICAgIHRoaXMucGFzc3dvcmRXaWRnZXQuZWxlbWVudHMuJGdlbmVyYXRlQnRuPy50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIG5lZWRlZFxuICAgICAgICBpZiAoY29uZmlnLmRlZmF1bHRQb3J0ICYmIChmaWVsZHMucG9ydC52YWwoKSA9PT0gJycgfHwgZmllbGRzLnBvcnQudmFsKCkgPT09ICcwJykpIHtcbiAgICAgICAgICAgIGZpZWxkcy5wb3J0LnZhbChjb25maWcuZGVmYXVsdFBvcnQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgd2lkZ2V0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKHRoaXMucGFzc3dvcmRXaWRnZXQgJiYgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICBQYXNzd29yZFdpZGdldC51cGRhdGVDb25maWcodGhpcy5wYXNzd29yZFdpZGdldCwgY29uZmlnLnBhc3N3b3JkV2lkZ2V0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHBhc3N3b3JkIHRvb2x0aXBcbiAgICAgICAgaWYgKGNvbmZpZy5zaG93UGFzc3dvcmRUb29sdGlwKSB7XG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkVG9vbHRpcCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgZW5hYmxlIHF1YWxpZnkgZm9yIElBWCAoTkFUIGtlZXBhbGl2ZSlcbiAgICAgICAgZmllbGRzLnF1YWxpZnkucHJvcCgnY2hlY2tlZCcsIHRydWUpLnZhbCgnMScpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBlcnJvcnMgZm9yIGhpZGRlbiBmaWVsZHNcbiAgICAgICAgY29uZmlnLmhpZGRlbi5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBrZXkucmVwbGFjZSgnZWwnLCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsIGZpZWxkTmFtZSk7XG4gICAgICAgICAgICAkKGAjJHtmaWVsZE5hbWV9YCkuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge29iamVjdH0gTW9kaWZpZWQgZm9ybSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JtLmpzIHdpdGggYXBpU2V0dGluZ3MuZW5hYmxlZCBhbmQgYXV0b0RldGVjdE1ldGhvZCB3aWxsIGF1dG9tYXRpY2FsbHk6XG4gICAgICAgIC8vIDEuIENvbGxlY3QgZm9ybSBkYXRhXG4gICAgICAgIC8vIDIuIENvbnZlcnQgY2hlY2tib3hlcyB1c2luZyBjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbFxuICAgICAgICAvLyAzLiBEZXRlY3QgaWYgcmVjb3JkIGlzIG5ldyBiYXNlZCBvbiBpZCBmaWVsZFxuICAgICAgICAvLyA0LiBDYWxsIHRoZSBhcHByb3ByaWF0ZSBBUEkgbWV0aG9kIChjcmVhdGUvdXBkYXRlKVxuICAgICAgICBcbiAgICAgICAgLy8gSnVzdCBhZGQgcHJvdmlkZXItc3BlY2lmaWMgZGF0YVxuICAgICAgICByZXN1bHQuZGF0YS50eXBlID0gJ0lBWCc7XG4gICAgICAgIFxuICAgICAgICAvLyBFbnN1cmUgSUQgZmllbGQgZXhpc3RzXG4gICAgICAgIHJlc3VsdC5kYXRhLmlkID0gcmVzdWx0LmRhdGEuaWQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFJlc3BvbnNlIGZyb20gc2VydmVyXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICBjb25zdCBuZXdJZCA9IHJlc3BvbnNlLmRhdGEuaWQ7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgZm9ybSBJRCBmaWVsZFxuICAgICAgICAgICAgJCgnI2lkJykudmFsKG5ld0lkKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGlzTmV3UHJvdmlkZXIgZmxhZ1xuICAgICAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIEVuYWJsZSBkaWFnbm9zdGljcyB0YWIgZm9yIGV4aXN0aW5nIHByb3ZpZGVyc1xuICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcbiAgICAgICAgICAgICAgICAuY3NzKCdvcGFjaXR5JywgJycpXG4gICAgICAgICAgICAgICAgLmNzcygnY3Vyc29yJywgJycpO1xuXG4gICAgICAgICAgICAvLyBGb3JtLmpzIHdpbGwgaGFuZGxlIGFsbCByZWRpcmVjdCBsb2dpYyBiYXNlZCBvbiBzdWJtaXRNb2RlXG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgc3VwZXIucG9wdWxhdGVGb3JtRGF0YShkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBkYXRhIHBvcHVsYXRpb24gY2FuIGJlIGFkZGVkIGhlcmUgaWYgbmVlZGVkXG4gICAgfVxufVxuXG4vKipcbiAqIEluaXRpYWxpemUgcHJvdmlkZXIgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY29uc3QgcHJvdmlkZXIgPSBuZXcgUHJvdmlkZXJJQVgoKTtcbiAgICBwcm92aWRlci5pbml0aWFsaXplKCk7XG59KTsiXX0=