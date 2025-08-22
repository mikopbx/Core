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
            value: '/^[a-zA-Z0-9._-]+$/',
            prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters || 'Host can only contain letters, numbers, dots, hyphens and underscores'
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
            value: '/^[a-zA-Z0-9._-]+$/',
            prompt: globalTranslate.pr_ValidationProviderHostInvalidCharacters || 'Host can only contain letters, numbers, dots, hyphens and underscores'
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

      Form.convertCheckboxesToBool = true;
      Form.initialize();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzIiwiaW5pdGlhbGl6ZVRhYnMiLCIkIiwiY2hlY2tib3giLCJyZWdUeXBlIiwidmFsIiwiJGZvcm1PYmoiLCJmb3JtIiwiJHNlY3JldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsImlzQ2hlY2tlZCIsInNldFRpbWVvdXQiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplRmllbGRUb29sdGlwcyIsInNlbGYiLCJpc05ld1Byb3ZpZGVyIiwiYWRkQ2xhc3MiLCJ0YWIiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwicHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIiLCJpbml0aWFsaXplRGlhZ25vc3RpY3NUYWIiLCJvbkxvYWQiLCJwYXJhbWV0ZXJBcnJheSIsImhpc3RvcnlFdmVudCIsIm9mZiIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwiUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlciIsImluaXRpYWxpemUiLCJzaG93SWF4V2FybmluZyIsIndhcm5pbmdIdG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwiaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RpdGxlIiwiaWF4X0RlcHJlY2F0aW9uV2FybmluZ1RleHQiLCJodG1sIiwidHJhbnNpdGlvbiIsIiR0aGlzIiwidmFsdWUiLCJjbGVhblZhbHVlIiwicmVwbGFjZSIsInBhcmVudCIsImFwcGVuZCIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMiLCJyZW1vdmUiLCJydWxlcyIsImRlc2NyaXB0aW9uIiwiaWRlbnRpZmllciIsInR5cGUiLCJwcm9tcHQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSIsImhvc3QiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJbnZhbGlkQ2hhcmFjdGVycyIsInVzZXJuYW1lIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5Iiwic2VjcmV0IiwicG9ydCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQiLCJyZWNlaXZlQ2FsbHNDaGVja2VkIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCJ1cmwiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiUHJvdmlkZXJzQVBJIiwic2F2ZU1ldGhvZCIsImh0dHBNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJwcm92aWRlcklkIiwiZWxlbWVudHMiLCJyZWNlaXZlQ2FsbHMiLCJuZXR3b3JrRmlsdGVyIiwiZmllbGRzIiwicXVhbGlmeSIsImxhYmVscyIsImNvbmZpZ3MiLCJvdXRib3VuZCIsInZpc2libGUiLCJoaWRkZW4iLCJyZXF1aXJlZCIsInByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIiwicHJfUHJvdmlkZXJQb3J0IiwicHJfUHJvdmlkZXJMb2dpbiIsInByX1Byb3ZpZGVyUGFzc3dvcmQiLCJwYXNzd29yZFdpZGdldCIsImdlbmVyYXRlQnV0dG9uIiwic2hvd1Bhc3N3b3JkQnV0dG9uIiwiY2xpcGJvYXJkQnV0dG9uIiwic2hvd1N0cmVuZ3RoQmFyIiwidmFsaWRhdGlvbiIsIlBhc3N3b3JkV2lkZ2V0IiwiVkFMSURBVElPTiIsIk5PTkUiLCJkZWZhdWx0UG9ydCIsImluYm91bmQiLCJvcHRpb25hbCIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsInByX0F1dGhlbnRpY2F0aW9uVXNlcm5hbWUiLCJwcl9BdXRoZW50aWNhdGlvblBhc3N3b3JkIiwiU09GVCIsInJlYWRvbmx5VXNlcm5hbWUiLCJhdXRvR2VuZXJhdGVQYXNzd29yZCIsIm5vbmUiLCJwcl9QZWVySG9zdE9ySVBBZGRyZXNzIiwicHJfUGVlclBvcnQiLCJwcl9QZWVyVXNlcm5hbWUiLCJwcl9QZWVyUGFzc3dvcmQiLCJzaG93UGFzc3dvcmRUb29sdGlwIiwiY29uZmlnIiwiZm9yRWFjaCIsImtleSIsInNob3ciLCJoaWRlIiwiT2JqZWN0IiwiZW50cmllcyIsInRleHQiLCJhdHRyIiwicmVtb3ZlQXR0ciIsInRyaW0iLCIkZ2VuZXJhdGVCdG4iLCJ0cmlnZ2VyIiwidXBkYXRlQ29uZmlnIiwiaGlkZVBhc3N3b3JkVG9vbHRpcCIsInByb3AiLCJmaWVsZE5hbWUiLCJ0b0xvd2VyQ2FzZSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImlkIiwicmVzcG9uc2UiLCJuZXdJZCIsImNzcyIsIm5ld1VybCIsIndpbmRvdyIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJQcm92aWRlckJhc2UiLCJkb2N1bWVudCIsInJlYWR5IiwicHJvdmlkZXIiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFc7Ozs7O0FBQ0YseUJBQWM7QUFBQTs7QUFBQSw2QkFDSixLQURJO0FBRWI7QUFFRDtB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b250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFByb3ZpZGVyQmFzZSwgUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlciwgUHJvdmlkZXJUb29sdGlwTWFuYWdlciwgaTE4biwgUHJvdmlkZXJzQVBJICovXG5cbi8qKlxuICogSUFYIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVySUFYXG4gKi9cbmNsYXNzIFByb3ZpZGVySUFYIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHsgXG4gICAgICAgIHN1cGVyKCdJQVgnKTsgXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBzdXBlci5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJQVgtc3BlY2lmaWMgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplSWF4V2FybmluZ01lc3NhZ2UoKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUmVhbHRpbWVWYWxpZGF0aW9uKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVIYW5kbGVycygpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRhYnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlLXZhbGlkYXRlIGZvcm0gd2hlbiByZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCBjaGFuZ2VzXG4gICAgICAgICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aC5jaGVja2JveCcpLmNoZWNrYm94KCdzZXR0aW5nJywgJ29uQ2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciBhbnkgZXhpc3RpbmcgZXJyb3Igb24gc2VjcmV0IGZpZWxkXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnc2VjcmV0Jyk7XG4gICAgICAgICAgICB0aGlzLiRzZWNyZXQuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvbiwgdmFsaWRhdGUgYmFzZWQgb24gY2hlY2tib3ggc3RhdGVcbiAgICAgICAgICAgIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIGlmICghaXNDaGVja2VkICYmIHRoaXMuJHNlY3JldC52YWwoKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgdW5jaGVja2VkIGFuZCBwYXNzd29yZCBpcyBlbXB0eSwgc2hvdyBlcnJvclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgndmFsaWRhdGUgZmllbGQnLCAnc2VjcmV0Jyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZFxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFiIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFicygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBEaXNhYmxlIGRpYWdub3N0aWNzIHRhYiBmb3IgbmV3IHByb3ZpZGVyc1xuICAgICAgICBpZiAodGhpcy5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwiZGlhZ25vc3RpY3NcIl0nKVxuICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogKHRhYlBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiB0eXBlb2YgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIgIT09ICd1bmRlZmluZWQnICYmICFzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkaWFnbm9zdGljcyB0YWIgd2hlbiBpdCBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIuaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uTG9hZDogKHRhYlBhdGgsIHBhcmFtZXRlckFycmF5LCBoaXN0b3J5RXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBCbG9jayBsb2FkaW5nIG9mIGRpYWdub3N0aWNzIHRhYiBmb3IgbmV3IHByb3ZpZGVyc1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHNlbGYuaXNOZXdQcm92aWRlcikge1xuICAgICAgICAgICAgICAgICAgICAvLyBTd2l0Y2ggYmFjayB0byBzZXR0aW5ncyB0YWJcbiAgICAgICAgICAgICAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cInNldHRpbmdzXCJdJykudGFiKCdjaGFuZ2UgdGFiJywgJ3NldHRpbmdzJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkaXRpb25hbCBjbGljayBwcmV2ZW50aW9uIGZvciBkaXNhYmxlZCB0YWJcbiAgICAgICAgJCgnI3Byb3ZpZGVyLXRhYnMtbWVudSAuaXRlbVtkYXRhLXRhYj1cImRpYWdub3N0aWNzXCJdJykub2ZmKCdjbGljay5kaXNhYmxlZCcpLm9uKCdjbGljay5kaXNhYmxlZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGlmIChzZWxmLmlzTmV3UHJvdmlkZXIpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugc3RheSBvbiBzZXR0aW5ncyB0YWJcbiAgICAgICAgICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtW2RhdGEtdGFiPVwic2V0dGluZ3NcIl0nKS50YWIoJ2NoYW5nZSB0YWInLCAnc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmllbGRUb29sdGlwcygpIHtcbiAgICAgICAgUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlci5pbml0aWFsaXplKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgSUFYIHdhcm5pbmcgbWVzc2FnZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpIHtcbiAgICAgICAgLy8gU2hvdyBJQVggZGVwcmVjYXRlZCB3YXJuaW5nIGlmIGVuYWJsZWRcbiAgICAgICAgY29uc3Qgc2hvd0lheFdhcm5pbmcgPSAkKCcjc2hvdy1pYXgtd2FybmluZycpLnZhbCgpID09PSAnMSc7XG4gICAgICAgIGlmIChzaG93SWF4V2FybmluZykge1xuICAgICAgICAgICAgY29uc3Qgd2FybmluZ0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiIGlkPVwiaWF4LWRlcHJlY2F0aW9uLW5vdGljZVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImNsb3NlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmlheF9EZXByZWNhdGlvbldhcm5pbmdUaXRsZSB8fCAnSUFYIFByb3RvY29sIE5vdGljZSd9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5pYXhfRGVwcmVjYXRpb25XYXJuaW5nVGV4dCB8fCAnSUFYIHByb3RvY29sIGlzIGRlcHJlY2F0ZWQuIENvbnNpZGVyIHVzaW5nIFNJUCBpbnN0ZWFkLid9PC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcbiAgICAgICAgICAgICQoJyNpYXgtd2FybmluZy1wbGFjZWhvbGRlcicpLmh0bWwod2FybmluZ0h0bWwpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBbGxvdyB1c2VyIHRvIGNsb3NlIHRoZSB3YXJuaW5nXG4gICAgICAgICAgICAkKCcjaWF4LWRlcHJlY2F0aW9uLW5vdGljZSAuY2xvc2UuaWNvbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICQodGhpcykuY2xvc2VzdCgnLm1lc3NhZ2UnKS50cmFuc2l0aW9uKCdmYWRlJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlYWwtdGltZSB2YWxpZGF0aW9uIGZvciBzcGVjaWZpYyBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVhbHRpbWVWYWxpZGF0aW9uKCkge1xuICAgICAgICAvLyBSZWFsLXRpbWUgdmFsaWRhdGlvbiBmb3IgdXNlcm5hbWUgLSByZXN0cmljdCBzcGVjaWFsIGNoYXJhY3RlcnNcbiAgICAgICAgJCgnI3VzZXJuYW1lJykub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICR0aGlzLnZhbCgpO1xuICAgICAgICAgICAgLy8gQWxsb3cgb25seSBhbHBoYW51bWVyaWMsIGRhc2ggYW5kIHVuZGVyc2NvcmVcbiAgICAgICAgICAgIGNvbnN0IGNsZWFuVmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9bXmEtekEtWjAtOV8tXS9nLCAnJyk7XG4gICAgICAgICAgICBpZiAodmFsdWUgIT09IGNsZWFuVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAkdGhpcy52YWwoY2xlYW5WYWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyB3YXJuaW5nIGFib3V0IGludmFsaWQgY2hhcmFjdGVyc1xuICAgICAgICAgICAgICAgICR0aGlzLmNsb3Nlc3QoJy5maWVsZCcpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICR0aGlzLnBhcmVudCgpLmFwcGVuZCgnPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nIHJlZCBiYXNpYyBsYWJlbCB0ZW1wb3Jhcnktd2FybmluZ1wiPicgK1xuICAgICAgICAgICAgICAgICAgICAoZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMgfHwgJ09ubHkgbGV0dGVycywgbnVtYmVycywgZGFzaCBhbmQgdW5kZXJzY29yZSBhbGxvd2VkJykgK1xuICAgICAgICAgICAgICAgICAgICAnPC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIHdhcm5pbmcgYWZ0ZXIgMyBzZWNvbmRzXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJy50ZW1wb3Jhcnktd2FybmluZycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAkdGhpcy5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVnaXN0cmF0aW9uIHR5cGUgY2hhbmdlIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVIYW5kbGVycygpIHtcbiAgICAgICAgLy8gQWxyZWFkeSBoYW5kbGVkIGJ5IHBhcmVudCBjbGFzcyBkcm9wZG93biBpbml0aWFsaXphdGlvblxuICAgICAgICAvLyBUaGlzIGlzIGZvciBJQVgtc3BlY2lmaWMgYmVoYXZpb3IgaWYgbmVlZGVkXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHByb3ZpZGVyIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHJ1bGVzID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBDb21tb24gcnVsZXMgZm9yIGFsbCByZWdpc3RyYXRpb24gdHlwZXNcbiAgICAgICAgcnVsZXMuZGVzY3JpcHRpb24gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gUnVsZXMgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgIC8vIE9VVEJPVU5EOiBXZSByZWdpc3RlciB0byBwcm92aWRlclxuICAgICAgICAgICAgcnVsZXMuaG9zdCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Ll8tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SW52YWxpZENoYXJhY3RlcnMgfHwgJ0hvc3QgY2FuIG9ubHkgY29udGFpbiBsZXR0ZXJzLCBudW1iZXJzLCBkb3RzLCBoeXBoZW5zIGFuZCB1bmRlcnNjb3JlcycsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy51c2VybmFtZSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlthLXpBLVowLTlfLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5JbnZhbGlkQ2hhcmFjdGVycyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW10gLy8gTm8gdmFsaWRhdGlvbiBmb3Igb3V0Ym91bmQgcGFzc3dvcmRzXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMucG9ydCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAvLyBJTkJPVU5EOiBQcm92aWRlciBjb25uZWN0cyB0byB1c1xuICAgICAgICAgICAgY29uc3QgcmVjZWl2ZUNhbGxzQ2hlY2tlZCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHJ1bGVzLnVzZXJuYW1lID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOV8tXSskLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbkludmFsaWRDaGFyYWN0ZXJzLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQYXNzd29yZCB2YWxpZGF0aW9uIG9ubHkgaWYgcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggaXMgTk9UIGNoZWNrZWRcbiAgICAgICAgICAgIGlmICghcmVjZWl2ZUNhbGxzQ2hlY2tlZCkge1xuICAgICAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzVdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhvc3QgaXMgb3B0aW9uYWwgZm9yIGluYm91bmRcbiAgICAgICAgICAgIC8vIFBvcnQgaXMgbm90IHNob3duIGZvciBpbmJvdW5kXG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAvLyBOT05FOiBTdGF0aWMgcGVlci10by1wZWVyIGNvbm5lY3Rpb25cbiAgICAgICAgICAgIHJ1bGVzLmhvc3QgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eW2EtekEtWjAtOS5fLV0rJC8nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdEludmFsaWRDaGFyYWN0ZXJzIHx8ICdIb3N0IGNhbiBvbmx5IGNvbnRhaW4gbGV0dGVycywgbnVtYmVycywgZG90cywgaHlwaGVucyBhbmQgdW5kZXJzY29yZXMnLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcnVsZXMudXNlcm5hbWUgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bYS16QS1aMC05Xy1dKyQvJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSW52YWxpZENoYXJhY3RlcnMsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAvLyBQYXNzd29yZCBpcyBvcHRpb25hbCBmb3Igbm9uZSBtb2RlXG4gICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBydWxlcy5wb3J0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJ1bGVzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBQcm92aWRlcnNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCcsXG4gICAgICAgICAgICBodHRwTWV0aG9kOiB0aGlzLmlzTmV3UHJvdmlkZXIgPyAnUE9TVCcgOiAnUFVUJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHJlZGlyZWN0IFVSTHMgZm9yIHNhdmUgbW9kZXNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeWlheC9gO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWNoZSBET00gZWxlbWVudHNcbiAgICAgICAgY29uc3QgZWxlbWVudHMgPSB7XG4gICAgICAgICAgICBob3N0OiAkKCcjZWxIb3N0JyksXG4gICAgICAgICAgICBwb3J0OiAkKCcjZWxQb3J0JyksXG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI2VsVXNlcm5hbWUnKSxcbiAgICAgICAgICAgIHNlY3JldDogJCgnI2VsU2VjcmV0JyksXG4gICAgICAgICAgICByZWNlaXZlQ2FsbHM6ICQoJyNlbFJlY2VpdmVDYWxscycpLFxuICAgICAgICAgICAgbmV0d29ya0ZpbHRlcjogJCgnI2VsTmV0d29ya0ZpbHRlcicpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBmaWVsZHMgPSB7XG4gICAgICAgICAgICB1c2VybmFtZTogJCgnI3VzZXJuYW1lJyksXG4gICAgICAgICAgICBzZWNyZXQ6IHRoaXMuJHNlY3JldCxcbiAgICAgICAgICAgIHBvcnQ6ICQoJyNwb3J0JyksXG4gICAgICAgICAgICBxdWFsaWZ5OiAkKCcjcXVhbGlmeScpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBjb25zdCBsYWJlbHMgPSB7XG4gICAgICAgICAgICBob3N0OiAkKCcjaG9zdExhYmVsVGV4dCcpLFxuICAgICAgICAgICAgcG9ydDogJCgnI3BvcnRMYWJlbFRleHQnKSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiAkKCcjdXNlcm5hbWVMYWJlbFRleHQnKSxcbiAgICAgICAgICAgIHNlY3JldDogJCgnI3NlY3JldExhYmVsVGV4dCcpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmF0aW9uIGZvciBlYWNoIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgIGNvbnN0IGNvbmZpZ3MgPSB7XG4gICAgICAgICAgICBvdXRib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICdwb3J0JywgJ3VzZXJuYW1lJywgJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIGhpZGRlbjogWydyZWNlaXZlQ2FsbHMnLCAnbmV0d29ya0ZpbHRlciddLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2hvc3QnLCAncG9ydCcsICd1c2VybmFtZScsICdzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIHx8ICdQcm92aWRlciBIb3N0L0lQJyxcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUG9ydCB8fCAnUHJvdmlkZXIgUG9ydCcsXG4gICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJMb2dpbiB8fCAnTG9naW4nLFxuICAgICAgICAgICAgICAgICAgICBzZWNyZXQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBhc3N3b3JkIHx8ICdQYXNzd29yZCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5OT05FXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0UG9ydDogJzQ1NjknXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaW5ib3VuZDoge1xuICAgICAgICAgICAgICAgIHZpc2libGU6IFsnaG9zdCcsICd1c2VybmFtZScsICdzZWNyZXQnLCAncmVjZWl2ZUNhbGxzJywgJ25ldHdvcmtGaWx0ZXInXSxcbiAgICAgICAgICAgICAgICBoaWRkZW46IFsncG9ydCddLFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3VzZXJuYW1lJywgJ3NlY3JldCddLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiBbJ2hvc3QnLCAncG9ydCddLFxuICAgICAgICAgICAgICAgIGxhYmVsczoge1xuICAgICAgICAgICAgICAgICAgICBob3N0OiBnbG9iYWxUcmFuc2xhdGUucHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIHx8ICdSZW1vdGUgSG9zdC9JUCcsXG4gICAgICAgICAgICAgICAgICAgIHVzZXJuYW1lOiBnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSB8fCAnQXV0aGVudGljYXRpb24gVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBzZWNyZXQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9BdXRoZW50aWNhdGlvblBhc3N3b3JkIHx8ICdBdXRoZW50aWNhdGlvbiBQYXNzd29yZCdcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHBhc3N3b3JkV2lkZ2V0OiB7XG4gICAgICAgICAgICAgICAgICAgIGdlbmVyYXRlQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGNsaXBib2FyZEJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlYWRvbmx5VXNlcm5hbWU6IHRydWUsXG4gICAgICAgICAgICAgICAgYXV0b0dlbmVyYXRlUGFzc3dvcmQ6IHRydWVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBub25lOiB7XG4gICAgICAgICAgICAgICAgdmlzaWJsZTogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnLCAnc2VjcmV0JywgJ3JlY2VpdmVDYWxscycsICduZXR3b3JrRmlsdGVyJ10sXG4gICAgICAgICAgICAgICAgaGlkZGVuOiBbXSxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWydob3N0JywgJ3BvcnQnLCAndXNlcm5hbWUnXSxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogWydzZWNyZXQnXSxcbiAgICAgICAgICAgICAgICBsYWJlbHM6IHtcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1BlZXIgSG9zdC9JUCcsXG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUG9ydCB8fCAnUGVlciBQb3J0JyxcbiAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyVXNlcm5hbWUgfHwgJ1BlZXIgVXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBzZWNyZXQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUGFzc3dvcmQgfHwgJ1BlZXIgUGFzc3dvcmQnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBwYXNzd29yZFdpZGdldDoge1xuICAgICAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbjogUGFzc3dvcmRXaWRnZXQuVkFMSURBVElPTi5TT0ZUXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0UG9ydDogJzQ1NjknLFxuICAgICAgICAgICAgICAgIHNob3dQYXNzd29yZFRvb2x0aXA6IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgY29uZmlnID0gY29uZmlnc1tyZWdUeXBlXSB8fCBjb25maWdzLm91dGJvdW5kO1xuICAgICAgICBcbiAgICAgICAgLy8gQXBwbHkgdmlzaWJpbGl0eVxuICAgICAgICBjb25maWcudmlzaWJsZS5mb3JFYWNoKGtleSA9PiBlbGVtZW50c1trZXldPy5zaG93KCkpO1xuICAgICAgICBjb25maWcuaGlkZGVuLmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LmhpZGUoKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBcHBseSByZXF1aXJlZC9vcHRpb25hbCBjbGFzc2VzXG4gICAgICAgIGNvbmZpZy5yZXF1aXJlZD8uZm9yRWFjaChrZXkgPT4gZWxlbWVudHNba2V5XT8uYWRkQ2xhc3MoJ3JlcXVpcmVkJykpO1xuICAgICAgICBjb25maWcub3B0aW9uYWw/LmZvckVhY2goa2V5ID0+IGVsZW1lbnRzW2tleV0/LnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBsYWJlbHNcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoY29uZmlnLmxhYmVscykuZm9yRWFjaCgoW2tleSwgdGV4dF0pID0+IHtcbiAgICAgICAgICAgIGxhYmVsc1trZXldPy50ZXh0KHRleHQpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSB1c2VybmFtZSBmaWVsZCBmb3IgaW5ib3VuZFxuICAgICAgICBpZiAoY29uZmlnLnJlYWRvbmx5VXNlcm5hbWUpIHtcbiAgICAgICAgICAgIGZpZWxkcy51c2VybmFtZS52YWwocHJvdmlkZXJJZCkuYXR0cigncmVhZG9ubHknLCAnJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaWVsZHMudXNlcm5hbWUucmVtb3ZlQXR0cigncmVhZG9ubHknKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCBpZiBlbXB0eVxuICAgICAgICBpZiAoY29uZmlnLmF1dG9HZW5lcmF0ZVBhc3N3b3JkICYmIGZpZWxkcy5zZWNyZXQudmFsKCkudHJpbSgpID09PSAnJyAmJiB0aGlzLnBhc3N3b3JkV2lkZ2V0KSB7XG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0LmVsZW1lbnRzLiRnZW5lcmF0ZUJ0bj8udHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGRlZmF1bHQgcG9ydCBpZiBuZWVkZWRcbiAgICAgICAgaWYgKGNvbmZpZy5kZWZhdWx0UG9ydCAmJiAoZmllbGRzLnBvcnQudmFsKCkgPT09ICcnIHx8IGZpZWxkcy5wb3J0LnZhbCgpID09PSAnMCcpKSB7XG4gICAgICAgICAgICBmaWVsZHMucG9ydC52YWwoY29uZmlnLmRlZmF1bHRQb3J0KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHdpZGdldCBjb25maWd1cmF0aW9uXG4gICAgICAgIGlmICh0aGlzLnBhc3N3b3JkV2lkZ2V0ICYmIGNvbmZpZy5wYXNzd29yZFdpZGdldCkge1xuICAgICAgICAgICAgUGFzc3dvcmRXaWRnZXQudXBkYXRlQ29uZmlnKHRoaXMucGFzc3dvcmRXaWRnZXQsIGNvbmZpZy5wYXNzd29yZFdpZGdldCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBwYXNzd29yZCB0b29sdGlwXG4gICAgICAgIGlmIChjb25maWcuc2hvd1Bhc3N3b3JkVG9vbHRpcCkge1xuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFRvb2x0aXAoKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWx3YXlzIGVuYWJsZSBxdWFsaWZ5IGZvciBJQVggKE5BVCBrZWVwYWxpdmUpXG4gICAgICAgIGZpZWxkcy5xdWFsaWZ5LnByb3AoJ2NoZWNrZWQnLCB0cnVlKS52YWwoJzEnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZXJyb3JzIGZvciBoaWRkZW4gZmllbGRzXG4gICAgICAgIGNvbmZpZy5oaWRkZW4uZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0ga2V5LnJlcGxhY2UoJ2VsJywgJycpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCBmaWVsZE5hbWUpO1xuICAgICAgICAgICAgJChgIyR7ZmllbGROYW1lfWApLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IE1vZGlmaWVkIGZvcm0gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9ybS5qcyB3aXRoIGFwaVNldHRpbmdzLmVuYWJsZWQgd2lsbCBhdXRvbWF0aWNhbGx5OlxuICAgICAgICAvLyAxLiBDb2xsZWN0IGZvcm0gZGF0YVxuICAgICAgICAvLyAyLiBDb252ZXJ0IGNoZWNrYm94ZXMgdXNpbmcgY29udmVydENoZWNrYm94ZXNUb0Jvb2xcbiAgICAgICAgLy8gMy4gQ2FsbCB0aGUgQVBJIHVzaW5nIGFwaVNldHRpbmdzIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgXG4gICAgICAgIC8vIEp1c3QgYWRkIHByb3ZpZGVyLXNwZWNpZmljIGRhdGFcbiAgICAgICAgcmVzdWx0LmRhdGEudHlwZSA9ICdJQVgnO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5zdXJlIElEIGZpZWxkIGV4aXN0c1xuICAgICAgICByZXN1bHQuZGF0YS5pZCA9IHJlc3VsdC5kYXRhLmlkIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBSZXNwb25zZSBmcm9tIHNlcnZlclxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgY29uc3QgbmV3SWQgPSByZXNwb25zZS5kYXRhLmlkO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGZvcm0gSUQgZmllbGRcbiAgICAgICAgICAgICQoJyNpZCcpLnZhbChuZXdJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBpc05ld1Byb3ZpZGVyIGZsYWdcbiAgICAgICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IGZhbHNlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFbmFibGUgZGlhZ25vc3RpY3MgdGFiIGZvciBleGlzdGluZyBwcm92aWRlcnNcbiAgICAgICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW1bZGF0YS10YWI9XCJkaWFnbm9zdGljc1wiXScpXG4gICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG4gICAgICAgICAgICAgICAgLmNzcygnb3BhY2l0eScsICcnKVxuICAgICAgICAgICAgICAgIC5jc3MoJ2N1cnNvcicsICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBicm93c2VyIFVSTCB3aXRob3V0IHJlbG9hZGluZ1xuICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvbW9kaWZ5aWF4LyR7bmV3SWR9YDtcbiAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSh7IGlkOiBuZXdJZCB9LCAnJywgbmV3VXJsKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBzdXBlci5wb3B1bGF0ZUZvcm1EYXRhKGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gSUFYLXNwZWNpZmljIGRhdGEgcG9wdWxhdGlvbiBjYW4gYmUgYWRkZWQgaGVyZSBpZiBuZWVkZWRcbiAgICB9XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBwcm92aWRlciBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zdCBwcm92aWRlciA9IG5ldyBQcm92aWRlcklBWCgpO1xuICAgIHByb3ZpZGVyLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==