"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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
   * Show password strength indicator and trigger initial check
   */


  _createClass(ProviderIAX, [{
    key: "showPasswordStrengthIndicator",
    value: function showPasswordStrengthIndicator() {
      var $passwordProgress = $('#password-strength-progress');

      if ($passwordProgress.length > 0) {
        // Initialize progress component if not already done
        if (!$passwordProgress.hasClass('progress')) {
          $passwordProgress.progress({
            percent: 0,
            showActivity: false
          });
        }

        $passwordProgress.show(); // Trigger password strength check if password exists

        if (this.$secret.val() && typeof PasswordScore !== 'undefined') {
          PasswordScore.checkPassStrength({
            pass: this.$secret.val(),
            bar: $passwordProgress,
            section: $passwordProgress
          });
        }
      }
    }
    /**
     * Hide password strength indicator
     */

  }, {
    key: "hidePasswordStrengthIndicator",
    value: function hidePasswordStrengthIndicator() {
      var $passwordProgress = $('#password-strength-progress');

      if ($passwordProgress.length > 0) {
        $passwordProgress.hide();
      }
    }
    /**
     * Initialize the provider form
     */

  }, {
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
      $('#provider-tabs-menu .item').tab({
        onVisible: function onVisible(tabPath) {
          if (tabPath === 'diagnostics' && typeof providerModifyStatusWorker !== 'undefined') {
            // Initialize diagnostics tab when it becomes visible
            providerModifyStatusWorker.initializeDiagnosticsTab();
          }
        }
      });
    }
    /**
     * Callback before form submission
     */

  }, {
    key: "cbBeforeSendForm",
    value: function cbBeforeSendForm(settings) {
      var result = _get(_getPrototypeOf(ProviderIAX.prototype), "cbBeforeSendForm", this).call(this, settings); // Add provider type


      result.data.type = this.providerType; // Checkbox values are now automatically processed by Form.js with convertCheckboxesToBool = true

      return result;
    }
    /**
     * Callback after form submission
     */

  }, {
    key: "cbAfterSendForm",
    value: function cbAfterSendForm(response) {
      _get(_getPrototypeOf(ProviderIAX.prototype), "cbAfterSendForm", this).call(this, response);

      if (response.result && response.data) {
        // Update form with response data if needed
        if (response.data.id && !$('#id').val()) {
          $('#id').val(response.data.id);
        } // The Form.js will handle the reload automatically if response.reload is present
        // For new records, REST API returns reload path like "providers/modifyiax/IAX-TRUNK-xxx"

      }
    }
    /**
     * Initialize IAX warning message handling
     */

  }, {
    key: "initializeIaxWarningMessage",
    value: function initializeIaxWarningMessage() {
      var $warningMessage = $('#elReceiveCalls').next('.warning.message');
      var $checkboxInput = $('#receive_calls_without_auth'); // Function to update warning message state

      var updateWarningState = function updateWarningState() {
        if ($checkboxInput.prop('checked')) {
          $warningMessage.removeClass('hidden');
        } else {
          $warningMessage.addClass('hidden');
        }
      }; // Initialize warning state


      updateWarningState(); // Handle checkbox changes

      $('#receive_calls_without_auth.checkbox').checkbox({
        onChecked: function onChecked() {
          $warningMessage.removeClass('hidden').transition('fade in');
        },
        onUnchecked: function onUnchecked() {
          $warningMessage.transition('fade out', function () {
            $warningMessage.addClass('hidden');
          });
        }
      });
    }
    /**
     * Initialize real-time validation feedback
     */

  }, {
    key: "initializeRealtimeValidation",
    value: function initializeRealtimeValidation() {
      var _this2 = this;

      // Enable inline validation for better UX
      this.$formObj.form('setting', 'inline', true); // Add helper text for IAX-specific fields

      var $portField = $('#port').closest('.field');

      if ($portField.find('.ui.pointing.label').length === 0) {
        $portField.append('<div class="ui pointing label" style="display: none;">Default IAX port is 4569</div>');
      } // Show port helper on focus


      $('#port').on('focus', function () {
        var $label = $(this).closest('.field').find('.ui.pointing.label');

        if ($(this).val() === '' || $(this).val() === '4569') {
          $label.show();
        }
      }).on('blur', function () {
        $(this).closest('.field').find('.ui.pointing.label').hide();
      }); // Validate on blur for immediate feedback

      this.$formObj.find('input[type="text"], input[type="password"]').on('blur', function (event) {
        var fieldName = $(event.target).attr('name');

        var validateRules = _this2.getValidateRules();

        if (fieldName && validateRules[fieldName]) {
          _this2.$formObj.form('validate field', fieldName);
        }
      });
    }
    /**
     * Initialize field help tooltips
     */

  }, {
    key: "initializeFieldTooltips",
    value: function initializeFieldTooltips() {
      // Use the specialized ProviderIaxTooltipManager for IAX provider
      ProviderIaxTooltipManager.initialize();
    }
    /**
     * Get validation rules based on registration type
     * @returns {object} Validation rules
     */

  }, {
    key: "getValidateRules",
    value: function getValidateRules() {
      var regType = $('#registration_type').val();

      switch (regType) {
        case 'outbound':
          return this.getOutboundRules();

        case 'inbound':
          return this.getInboundRules();

        case 'none':
          return this.getNoneRules();

        default:
          return this.getOutboundRules();
      }
    }
    /**
     * Get validation rules for outbound registration
     */

  }, {
    key: "getOutboundRules",
    value: function getOutboundRules() {
      return {
        description: {
          identifier: 'description',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
          }]
        },
        host: {
          identifier: 'host',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
          }]
        },
        username: {
          identifier: 'username',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
          }]
        },
        secret: {
          identifier: 'secret',
          optional: true,
          rules: []
        },
        port: {
          identifier: 'port',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
          }, {
            type: 'integer[1..65535]',
            prompt: globalTranslate.pr_ValidationProviderPortInvalid
          }]
        }
      };
    }
    /**
     * Get validation rules for inbound registration
     */

  }, {
    key: "getInboundRules",
    value: function getInboundRules() {
      var receiveWithoutAuth = $('#receive_calls_without_auth').checkbox('is checked');
      var rules = {
        description: {
          identifier: 'description',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
          }]
        },
        username: {
          identifier: 'username',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
          }]
        }
      }; // Secret is optional if receive_calls_without_auth is checked

      if (!receiveWithoutAuth) {
        rules.secret = {
          identifier: 'secret',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
          }, {
            type: 'minLength[8]',
            prompt: globalTranslate.pr_ValidationProviderPasswordTooShort
          }]
        };
      } else {
        rules.secret = {
          identifier: 'secret',
          optional: true,
          rules: []
        };
      }

      return rules;
    }
    /**
     * Get validation rules for none registration
     */

  }, {
    key: "getNoneRules",
    value: function getNoneRules() {
      return {
        description: {
          identifier: 'description',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderNameIsEmpty
          }]
        },
        host: {
          identifier: 'host',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderHostIsEmpty
          }]
        },
        username: {
          identifier: 'username',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderLoginIsEmpty
          }]
        },
        secret: {
          identifier: 'secret',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPasswordEmpty
          }]
        },
        port: {
          identifier: 'port',
          rules: [{
            type: 'empty',
            prompt: globalTranslate.pr_ValidationProviderPortIsEmpty
          }, {
            type: 'integer[1..65535]',
            prompt: globalTranslate.pr_ValidationProviderPortInvalid
          }]
        }
      };
    }
    /**
     * Initialize registration type change handlers
     */

  }, {
    key: "initializeRegistrationTypeHandlers",
    value: function initializeRegistrationTypeHandlers() {// Registration type handler is now in base class
      // This method is kept for compatibility
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
      }; // Navigation URLs

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
      // Get element references
      var elHost = $('#elHost');
      var elUsername = $('#elUsername');
      var elSecret = $('#elSecret');
      var elPort = $('#elPort');
      var elReceiveCalls = $('#elReceiveCalls');
      var elNetworkFilter = $('#elNetworkFilter');
      var regType = $('#registration_type').val();
      var genPassword = $('#generate-new-password');
      var valUserName = $('#username');
      var valSecret = this.$secret;
      var valPort = $('#port');
      var providerId = $('#id').val();
      var valQualify = $('#qualify');
      var copyButton = $('#elSecret .button.clipboard');
      var showHideButton = $('#show-hide-password'); // Get label text elements

      var labelHostText = $('#hostLabelText');
      var labelPortText = $('#portLabelText');
      var labelUsernameText = $('#usernameLabelText');
      var labelSecretText = $('#secretLabelText'); // Always enable qualify for IAX (NAT keepalive)

      if (valQualify.length > 0) {
        valQualify.prop('checked', true);
        valQualify.val('1');
      }

      valUserName.removeAttr('readonly'); // Hide password tooltip by default

      this.hidePasswordTooltip(); // Update element visibility based on registration type

      if (regType === 'outbound') {
        // OUTBOUND: We register to provider
        elHost.show();
        elPort.show();
        elUsername.show();
        elSecret.show();
        elReceiveCalls.hide();
        elNetworkFilter.hide(); // Network filter not relevant for outbound
        // Update required fields

        elHost.addClass('required');
        elPort.addClass('required');
        elUsername.addClass('required');
        elSecret.addClass('required'); // Hide all password management buttons for outbound

        genPassword.hide();
        copyButton.hide();
        showHideButton.hide(); // Hide password strength indicator for outbound

        this.hidePasswordStrengthIndicator(); // Update labels for outbound

        labelHostText.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP');
        labelPortText.text(globalTranslate.pr_ProviderPort || 'Provider Port');
        labelUsernameText.text(globalTranslate.pr_ProviderLogin || 'Login');
        labelSecretText.text(globalTranslate.pr_ProviderPassword || 'Password'); // Set default port if empty

        if (valPort.val() === '' || valPort.val() === '0') {
          valPort.val('4569');
        }
      } else if (regType === 'inbound') {
        // INBOUND: Provider connects to us
        valUserName.val(providerId);
        valUserName.attr('readonly', ''); // Auto-generate password for inbound registration if empty

        if (valSecret.val().trim() === '') {
          this.generatePassword();
        }

        elHost.show();
        elPort.hide();
        elUsername.show();
        elSecret.show();
        elReceiveCalls.show();
        elNetworkFilter.show(); // Network filter available for security
        // Remove validation prompt for hidden port field

        this.$formObj.form('remove prompt', 'port'); // Update required fields

        elHost.removeClass('required');
        elPort.removeClass('required');
        elUsername.addClass('required');
        elSecret.addClass('required'); // Remove host validation error since it's optional for inbound

        this.$formObj.form('remove prompt', 'host');
        $('#host').closest('.field').removeClass('error'); // Show all buttons for inbound

        genPassword.show();
        copyButton.show();
        showHideButton.show(); // Show password strength indicator for inbound

        this.showPasswordStrengthIndicator();
        copyButton.attr('data-clipboard-text', valSecret.val()); // Update labels for inbound

        labelHostText.text(globalTranslate.pr_RemoteHostOrIPAddress || 'Remote Host/IP');
        labelUsernameText.text(globalTranslate.pr_AuthenticationUsername || 'Authentication Username');
        labelSecretText.text(globalTranslate.pr_AuthenticationPassword || 'Authentication Password');
      } else if (regType === 'none') {
        // NONE: Static peer-to-peer connection
        elHost.show();
        elPort.show();
        elUsername.show();
        elSecret.show();
        elReceiveCalls.show();
        elNetworkFilter.show(); // Network filter available for security
        // Show tooltip icon for password field

        this.showPasswordTooltip(); // Update required fields

        elHost.addClass('required');
        elPort.addClass('required');
        elUsername.addClass('required');
        elSecret.removeClass('required'); // Password is optional in none mode
        // Show password management buttons for none registration (except generate)

        genPassword.hide();
        copyButton.show();
        showHideButton.show(); // Show password strength indicator for none type

        this.showPasswordStrengthIndicator(); // Update labels for none (peer-to-peer)

        labelHostText.text(globalTranslate.pr_PeerHostOrIPAddress || 'Peer Host/IP');
        labelPortText.text(globalTranslate.pr_PeerPort || 'Peer Port');
        labelUsernameText.text(globalTranslate.pr_PeerUsername || 'Peer Username');
        labelSecretText.text(globalTranslate.pr_PeerPassword || 'Peer Password'); // Set default port if empty

        if (valPort.val() === '' || valPort.val() === '0') {
          valPort.val('4569');
        }
      }
    }
  }]);

  return ProviderIAX;
}(ProviderBase);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsIiRwYXNzd29yZFByb2dyZXNzIiwiJCIsImxlbmd0aCIsImhhc0NsYXNzIiwicHJvZ3Jlc3MiLCJwZXJjZW50Iiwic2hvd0FjdGl2aXR5Iiwic2hvdyIsIiRzZWNyZXQiLCJ2YWwiLCJQYXNzd29yZFNjb3JlIiwiY2hlY2tQYXNzU3RyZW5ndGgiLCJwYXNzIiwiYmFyIiwic2VjdGlvbiIsImhpZGUiLCJpbml0aWFsaXplSWF4V2FybmluZ01lc3NhZ2UiLCJpbml0aWFsaXplUmVhbHRpbWVWYWxpZGF0aW9uIiwiaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVIYW5kbGVycyIsImluaXRpYWxpemVUYWJzIiwiY2hlY2tib3giLCJyZWdUeXBlIiwiJGZvcm1PYmoiLCJmb3JtIiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwiaXNDaGVja2VkIiwic2V0VGltZW91dCIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImluaXRpYWxpemVGaWVsZFRvb2x0aXBzIiwidGFiIiwib25WaXNpYmxlIiwidGFiUGF0aCIsInByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyIiwiaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwidHlwZSIsInByb3ZpZGVyVHlwZSIsInJlc3BvbnNlIiwiaWQiLCIkd2FybmluZ01lc3NhZ2UiLCJuZXh0IiwiJGNoZWNrYm94SW5wdXQiLCJ1cGRhdGVXYXJuaW5nU3RhdGUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJvbkNoZWNrZWQiLCJ0cmFuc2l0aW9uIiwib25VbmNoZWNrZWQiLCIkcG9ydEZpZWxkIiwiZmluZCIsImFwcGVuZCIsIm9uIiwiJGxhYmVsIiwiZXZlbnQiLCJmaWVsZE5hbWUiLCJ0YXJnZXQiLCJhdHRyIiwidmFsaWRhdGVSdWxlcyIsImdldFZhbGlkYXRlUnVsZXMiLCJQcm92aWRlcklheFRvb2x0aXBNYW5hZ2VyIiwiaW5pdGlhbGl6ZSIsImdldE91dGJvdW5kUnVsZXMiLCJnZXRJbmJvdW5kUnVsZXMiLCJnZXROb25lUnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwiaG9zdCIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5IiwidXNlcm5hbWUiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHkiLCJzZWNyZXQiLCJvcHRpb25hbCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkIiwicmVjZWl2ZVdpdGhvdXRBdXRoIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIlByb3ZpZGVyc0FQSSIsInNhdmVNZXRob2QiLCJodHRwTWV0aG9kIiwiaXNOZXdQcm92aWRlciIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImVsSG9zdCIsImVsVXNlcm5hbWUiLCJlbFNlY3JldCIsImVsUG9ydCIsImVsUmVjZWl2ZUNhbGxzIiwiZWxOZXR3b3JrRmlsdGVyIiwiZ2VuUGFzc3dvcmQiLCJ2YWxVc2VyTmFtZSIsInZhbFNlY3JldCIsInZhbFBvcnQiLCJwcm92aWRlcklkIiwidmFsUXVhbGlmeSIsImNvcHlCdXR0b24iLCJzaG93SGlkZUJ1dHRvbiIsImxhYmVsSG9zdFRleHQiLCJsYWJlbFBvcnRUZXh0IiwibGFiZWxVc2VybmFtZVRleHQiLCJsYWJlbFNlY3JldFRleHQiLCJyZW1vdmVBdHRyIiwiaGlkZVBhc3N3b3JkVG9vbHRpcCIsImhpZGVQYXNzd29yZFN0cmVuZ3RoSW5kaWNhdG9yIiwidGV4dCIsInByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIiwicHJfUHJvdmlkZXJQb3J0IiwicHJfUHJvdmlkZXJMb2dpbiIsInByX1Byb3ZpZGVyUGFzc3dvcmQiLCJ0cmltIiwiZ2VuZXJhdGVQYXNzd29yZCIsInNob3dQYXNzd29yZFN0cmVuZ3RoSW5kaWNhdG9yIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSIsInByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQiLCJzaG93UGFzc3dvcmRUb29sdGlwIiwicHJfUGVlckhvc3RPcklQQWRkcmVzcyIsInByX1BlZXJQb3J0IiwicHJfUGVlclVzZXJuYW1lIiwicHJfUGVlclBhc3N3b3JkIiwiUHJvdmlkZXJCYXNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxXOzs7OztBQUNGLHlCQUFjO0FBQUE7O0FBQUEsNkJBQ0osS0FESTtBQUViO0FBRUQ7QUFDSjtBQUNBOzs7OztXQUNJLHlDQUFnQztBQUM1QixVQUFNQyxpQkFBaUIsR0FBR0MsQ0FBQyxDQUFDLDZCQUFELENBQTNCOztBQUNBLFVBQUlELGlCQUFpQixDQUFDRSxNQUFsQixHQUEyQixDQUEvQixFQUFrQztBQUM5QjtBQUNBLFlBQUksQ0FBQ0YsaUJBQWlCLENBQUNHLFFBQWxCLENBQTJCLFVBQTNCLENBQUwsRUFBNkM7QUFDekNILFVBQUFBLGlCQUFpQixDQUFDSSxRQUFsQixDQUEyQjtB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c0QsUUFBQUEsVUFBVSxDQUFDdEQsUUFBWCxDQUFvQixVQUFwQjtBQUNBdUQsUUFBQUEsUUFBUSxDQUFDOUUsV0FBVCxDQUFxQixVQUFyQixFQWhCMkIsQ0FnQk87QUFFbEM7O0FBQ0FrRixRQUFBQSxXQUFXLENBQUM1RixJQUFaO0FBQ0FrRyxRQUFBQSxVQUFVLENBQUMxRyxJQUFYO0FBQ0EyRyxRQUFBQSxjQUFjLENBQUMzRyxJQUFmLEdBckIyQixDQXVCM0I7O0FBQ0EsYUFBSzBILDZCQUFMLEdBeEIyQixDQTBCM0I7O0FBQ0FkLFFBQUFBLGFBQWEsQ0FBQ08sSUFBZCxDQUFtQmxELGVBQWUsQ0FBQzhELHNCQUFoQixJQUEwQyxjQUE3RDtBQUNBbEIsUUFBQUEsYUFBYSxDQUFDTSxJQUFkLENBQW1CbEQsZUFBZSxDQUFDK0QsV0FBaEIsSUFBK0IsV0FBbEQ7QUFDQWxCLFFBQUFBLGlCQUFpQixDQUFDSyxJQUFsQixDQUF1QmxELGVBQWUsQ0FBQ2dFLGVBQWhCLElBQW1DLGVBQTFEO0FBQ0FsQixRQUFBQSxlQUFlLENBQUNJLElBQWhCLENBQXFCbEQsZUFBZSxDQUFDaUUsZUFBaEIsSUFBbUMsZUFBeEQsRUE5QjJCLENBZ0MzQjs7QUFDQSxZQUFJM0IsT0FBTyxDQUFDckcsR0FBUixPQUFrQixFQUFsQixJQUF3QnFHLE9BQU8sQ0FBQ3JHLEdBQVIsT0FBa0IsR0FBOUMsRUFBbUQ7QUFDL0NxRyxVQUFBQSxPQUFPLENBQUNyRyxHQUFSLENBQVksTUFBWjtBQUNIO0FBQ0o7QUFDSjs7OztFQTdqQnFCaUksWSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFByb3ZpZGVyQmFzZSwgUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlciwgUHJvdmlkZXJUb29sdGlwTWFuYWdlciwgaTE4biwgUHJvdmlkZXJzQVBJICovXG5cbi8qKlxuICogSUFYIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVySUFYXG4gKi9cbmNsYXNzIFByb3ZpZGVySUFYIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHsgXG4gICAgICAgIHN1cGVyKCdJQVgnKTsgXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgcGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yIGFuZCB0cmlnZ2VyIGluaXRpYWwgY2hlY2tcbiAgICAgKi9cbiAgICBzaG93UGFzc3dvcmRTdHJlbmd0aEluZGljYXRvcigpIHtcbiAgICAgICAgY29uc3QgJHBhc3N3b3JkUHJvZ3Jlc3MgPSAkKCcjcGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgaWYgKCRwYXNzd29yZFByb2dyZXNzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcHJvZ3Jlc3MgY29tcG9uZW50IGlmIG5vdCBhbHJlYWR5IGRvbmVcbiAgICAgICAgICAgIGlmICghJHBhc3N3b3JkUHJvZ3Jlc3MuaGFzQ2xhc3MoJ3Byb2dyZXNzJykpIHtcbiAgICAgICAgICAgICAgICAkcGFzc3dvcmRQcm9ncmVzcy5wcm9ncmVzcyh7XG4gICAgICAgICAgICAgICAgICAgIHBlcmNlbnQ6IDAsXG4gICAgICAgICAgICAgICAgICAgIHNob3dBY3Rpdml0eTogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHBhc3N3b3JkUHJvZ3Jlc3Muc2hvdygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIHBhc3N3b3JkIHN0cmVuZ3RoIGNoZWNrIGlmIHBhc3N3b3JkIGV4aXN0c1xuICAgICAgICAgICAgaWYgKHRoaXMuJHNlY3JldC52YWwoKSAmJiB0eXBlb2YgUGFzc3dvcmRTY29yZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgcGFzczogdGhpcy4kc2VjcmV0LnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICBiYXI6ICRwYXNzd29yZFByb2dyZXNzLFxuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiAkcGFzc3dvcmRQcm9ncmVzc1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgcGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yXG4gICAgICovXG4gICAgaGlkZVBhc3N3b3JkU3RyZW5ndGhJbmRpY2F0b3IoKSB7XG4gICAgICAgIGNvbnN0ICRwYXNzd29yZFByb2dyZXNzID0gJCgnI3Bhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgIGlmICgkcGFzc3dvcmRQcm9ncmVzcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkcGFzc3dvcmRQcm9ncmVzcy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc3VwZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSUFYLXNwZWNpZmljIGluaXRpYWxpemF0aW9uXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUlheFdhcm5pbmdNZXNzYWdlKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUYWJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS12YWxpZGF0ZSBmb3JtIHdoZW4gcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggY2hhbmdlc1xuICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGguY2hlY2tib3gnKS5jaGVja2JveCgnc2V0dGluZycsICdvbkNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIGVycm9yIG9uIHNlY3JldCBmaWVsZFxuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgdGhpcy4kc2VjcmV0LmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3IgaW5ib3VuZCByZWdpc3RyYXRpb24sIHZhbGlkYXRlIGJhc2VkIG9uIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzQ2hlY2tlZCAmJiB0aGlzLiRzZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHVuY2hlY2tlZCBhbmQgcGFzc3dvcmQgaXMgZW1wdHksIHNob3cgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZpZWxkJywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRmllbGRUb29sdGlwcygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRhYiBmdW5jdGlvbmFsaXR5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRhYnMoKSB7XG4gICAgICAgICQoJyNwcm92aWRlci10YWJzLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiAodGFiUGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnZGlhZ25vc3RpY3MnICYmIHR5cGVvZiBwcm92aWRlck1vZGlmeVN0YXR1c1dvcmtlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkaWFnbm9zdGljcyB0YWIgd2hlbiBpdCBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICAgICAgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIuaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc3VwZXIuY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcHJvdmlkZXIgdHlwZVxuICAgICAgICByZXN1bHQuZGF0YS50eXBlID0gdGhpcy5wcm92aWRlclR5cGU7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVja2JveCB2YWx1ZXMgYXJlIG5vdyBhdXRvbWF0aWNhbGx5IHByb2Nlc3NlZCBieSBGb3JtLmpzIHdpdGggY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgc3VwZXIuY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCByZXNwb25zZSBkYXRhIGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuaWQgJiYgISQoJyNpZCcpLnZhbCgpKSB7XG4gICAgICAgICAgICAgICAgJCgnI2lkJykudmFsKHJlc3BvbnNlLmRhdGEuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBUaGUgRm9ybS5qcyB3aWxsIGhhbmRsZSB0aGUgcmVsb2FkIGF1dG9tYXRpY2FsbHkgaWYgcmVzcG9uc2UucmVsb2FkIGlzIHByZXNlbnRcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgUkVTVCBBUEkgcmV0dXJucyByZWxvYWQgcGF0aCBsaWtlIFwicHJvdmlkZXJzL21vZGlmeWlheC9JQVgtVFJVTksteHh4XCJcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgSUFYIHdhcm5pbmcgbWVzc2FnZSBoYW5kbGluZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpIHtcbiAgICAgICAgY29uc3QgJHdhcm5pbmdNZXNzYWdlID0gJCgnI2VsUmVjZWl2ZUNhbGxzJykubmV4dCgnLndhcm5pbmcubWVzc2FnZScpO1xuICAgICAgICBjb25zdCAkY2hlY2tib3hJbnB1dCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gRnVuY3Rpb24gdG8gdXBkYXRlIHdhcm5pbmcgbWVzc2FnZSBzdGF0ZVxuICAgICAgICBjb25zdCB1cGRhdGVXYXJuaW5nU3RhdGUgPSAoKSA9PiB7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94SW5wdXQucHJvcCgnY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2FybmluZyBzdGF0ZVxuICAgICAgICB1cGRhdGVXYXJuaW5nU3RhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjaGVja2JveCBjaGFuZ2VzXG4gICAgICAgICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aC5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpLnRyYW5zaXRpb24oJ2ZhZGUgaW4nKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblVuY2hlY2tlZCgpIHtcbiAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UudHJhbnNpdGlvbignZmFkZSBvdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVhbC10aW1lIHZhbGlkYXRpb24gZmVlZGJhY2tcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVhbHRpbWVWYWxpZGF0aW9uKCkge1xuICAgICAgICAvLyBFbmFibGUgaW5saW5lIHZhbGlkYXRpb24gZm9yIGJldHRlciBVWFxuICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3NldHRpbmcnLCAnaW5saW5lJywgdHJ1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaGVscGVyIHRleHQgZm9yIElBWC1zcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgY29uc3QgJHBvcnRGaWVsZCA9ICQoJyNwb3J0JykuY2xvc2VzdCgnLmZpZWxkJyk7XG4gICAgICAgIGlmICgkcG9ydEZpZWxkLmZpbmQoJy51aS5wb2ludGluZy5sYWJlbCcpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJHBvcnRGaWVsZC5hcHBlbmQoJzxkaXYgY2xhc3M9XCJ1aSBwb2ludGluZyBsYWJlbFwiIHN0eWxlPVwiZGlzcGxheTogbm9uZTtcIj5EZWZhdWx0IElBWCBwb3J0IGlzIDQ1Njk8L2Rpdj4nKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBwb3J0IGhlbHBlciBvbiBmb2N1c1xuICAgICAgICAkKCcjcG9ydCcpLm9uKCdmb2N1cycsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGxhYmVsID0gJCh0aGlzKS5jbG9zZXN0KCcuZmllbGQnKS5maW5kKCcudWkucG9pbnRpbmcubGFiZWwnKTtcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLnZhbCgpID09PSAnJyB8fCAkKHRoaXMpLnZhbCgpID09PSAnNDU2OScpIHtcbiAgICAgICAgICAgICAgICAkbGFiZWwuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS5vbignYmx1cicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCh0aGlzKS5jbG9zZXN0KCcuZmllbGQnKS5maW5kKCcudWkucG9pbnRpbmcubGFiZWwnKS5oaWRlKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVmFsaWRhdGUgb24gYmx1ciBmb3IgaW1tZWRpYXRlIGZlZWRiYWNrXG4gICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnaW5wdXRbdHlwZT1cInRleHRcIl0sIGlucHV0W3R5cGU9XCJwYXNzd29yZFwiXScpLm9uKCdibHVyJywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkKGV2ZW50LnRhcmdldCkuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSAmJiB2YWxpZGF0ZVJ1bGVzW2ZpZWxkTmFtZV0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZpZWxkJywgZmllbGROYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIFVzZSB0aGUgc3BlY2lhbGl6ZWQgUHJvdmlkZXJJYXhUb29sdGlwTWFuYWdlciBmb3IgSUFYIHByb3ZpZGVyXG4gICAgICAgIFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAocmVnVHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnb3V0Ym91bmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ2luYm91bmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEluYm91bmRSdWxlcygpO1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Tm9uZVJ1bGVzKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBvdXRib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRPdXRib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRJbmJvdW5kUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlY2VpdmVXaXRob3V0QXV0aCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBydWxlcyA9IHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTZWNyZXQgaXMgb3B0aW9uYWwgaWYgcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggaXMgY2hlY2tlZFxuICAgICAgICBpZiAoIXJlY2VpdmVXaXRob3V0QXV0aCkge1xuICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzhdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBydWxlcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igbm9uZSByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXROb25lUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGNoYW5nZSBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIFJlZ2lzdHJhdGlvbiB0eXBlIGhhbmRsZXIgaXMgbm93IGluIGJhc2UgY2xhc3NcbiAgICAgICAgLy8gVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgY29tcGF0aWJpbGl0eVxuICAgIH1cbiAgICBcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSB0aGlzLmNiQmVmb3JlU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSB0aGlzLmNiQWZ0ZXJTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBQcm92aWRlcnNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCcsXG4gICAgICAgICAgICBodHRwTWV0aG9kOiB0aGlzLmlzTmV3UHJvdmlkZXIgPyAnUE9TVCcgOiAnUFVUJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnlpYXgvYDtcbiAgICAgICAgXG4gICAgICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gR2V0IGVsZW1lbnQgcmVmZXJlbmNlc1xuICAgICAgICBjb25zdCBlbEhvc3QgPSAkKCcjZWxIb3N0Jyk7XG4gICAgICAgIGNvbnN0IGVsVXNlcm5hbWUgPSAkKCcjZWxVc2VybmFtZScpO1xuICAgICAgICBjb25zdCBlbFNlY3JldCA9ICQoJyNlbFNlY3JldCcpO1xuICAgICAgICBjb25zdCBlbFBvcnQgPSAkKCcjZWxQb3J0Jyk7XG4gICAgICAgIGNvbnN0IGVsUmVjZWl2ZUNhbGxzID0gJCgnI2VsUmVjZWl2ZUNhbGxzJyk7XG4gICAgICAgIGNvbnN0IGVsTmV0d29ya0ZpbHRlciA9ICQoJyNlbE5ldHdvcmtGaWx0ZXInKTtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBnZW5QYXNzd29yZCA9ICQoJyNnZW5lcmF0ZS1uZXctcGFzc3dvcmQnKTtcblxuICAgICAgICBjb25zdCB2YWxVc2VyTmFtZSA9ICQoJyN1c2VybmFtZScpO1xuICAgICAgICBjb25zdCB2YWxTZWNyZXQgPSB0aGlzLiRzZWNyZXQ7XG4gICAgICAgIGNvbnN0IHZhbFBvcnQgPSAkKCcjcG9ydCcpO1xuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgIGNvbnN0IHZhbFF1YWxpZnkgPSAkKCcjcXVhbGlmeScpO1xuICAgICAgICBjb25zdCBjb3B5QnV0dG9uID0gJCgnI2VsU2VjcmV0IC5idXR0b24uY2xpcGJvYXJkJyk7XG4gICAgICAgIGNvbnN0IHNob3dIaWRlQnV0dG9uID0gJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpO1xuXG4gICAgICAgIC8vIEdldCBsYWJlbCB0ZXh0IGVsZW1lbnRzXG4gICAgICAgIGNvbnN0IGxhYmVsSG9zdFRleHQgPSAkKCcjaG9zdExhYmVsVGV4dCcpO1xuICAgICAgICBjb25zdCBsYWJlbFBvcnRUZXh0ID0gJCgnI3BvcnRMYWJlbFRleHQnKTtcbiAgICAgICAgY29uc3QgbGFiZWxVc2VybmFtZVRleHQgPSAkKCcjdXNlcm5hbWVMYWJlbFRleHQnKTtcbiAgICAgICAgY29uc3QgbGFiZWxTZWNyZXRUZXh0ID0gJCgnI3NlY3JldExhYmVsVGV4dCcpO1xuXG4gICAgICAgIC8vIEFsd2F5cyBlbmFibGUgcXVhbGlmeSBmb3IgSUFYIChOQVQga2VlcGFsaXZlKVxuICAgICAgICBpZiAodmFsUXVhbGlmeS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YWxRdWFsaWZ5LnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIHZhbFF1YWxpZnkudmFsKCcxJyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YWxVc2VyTmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuXG4gICAgICAgIC8vIEhpZGUgcGFzc3dvcmQgdG9vbHRpcCBieSBkZWZhdWx0XG4gICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkVG9vbHRpcCgpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBlbGVtZW50IHZpc2liaWxpdHkgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgIC8vIE9VVEJPVU5EOiBXZSByZWdpc3RlciB0byBwcm92aWRlclxuICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsUG9ydC5zaG93KCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUmVjZWl2ZUNhbGxzLmhpZGUoKTtcbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5oaWRlKCk7IC8vIE5ldHdvcmsgZmlsdGVyIG5vdCByZWxldmFudCBmb3Igb3V0Ym91bmRcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgICAgICAgICAgZWxIb3N0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxQb3J0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIGFsbCBwYXNzd29yZCBtYW5hZ2VtZW50IGJ1dHRvbnMgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICBjb3B5QnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIHNob3dIaWRlQnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGlkZSBwYXNzd29yZCBzdHJlbmd0aCBpbmRpY2F0b3IgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICB0aGlzLmhpZGVQYXNzd29yZFN0cmVuZ3RoSW5kaWNhdG9yKCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHMgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICBsYWJlbEhvc3RUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVySG9zdE9ySVBBZGRyZXNzIHx8ICdQcm92aWRlciBIb3N0L0lQJyk7XG4gICAgICAgICAgICBsYWJlbFBvcnRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUG9ydCB8fCAnUHJvdmlkZXIgUG9ydCcpO1xuICAgICAgICAgICAgbGFiZWxVc2VybmFtZVRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJMb2dpbiB8fCAnTG9naW4nKTtcbiAgICAgICAgICAgIGxhYmVsU2VjcmV0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBhc3N3b3JkIHx8ICdQYXNzd29yZCcpO1xuXG4gICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIGVtcHR5XG4gICAgICAgICAgICBpZiAodmFsUG9ydC52YWwoKSA9PT0gJycgfHwgdmFsUG9ydC52YWwoKSA9PT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgdmFsUG9ydC52YWwoJzQ1NjknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnaW5ib3VuZCcpIHtcbiAgICAgICAgICAgIC8vIElOQk9VTkQ6IFByb3ZpZGVyIGNvbm5lY3RzIHRvIHVzXG4gICAgICAgICAgICB2YWxVc2VyTmFtZS52YWwocHJvdmlkZXJJZCk7XG4gICAgICAgICAgICB2YWxVc2VyTmFtZS5hdHRyKCdyZWFkb25seScsICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb24gaWYgZW1wdHlcbiAgICAgICAgICAgIGlmICh2YWxTZWNyZXQudmFsKCkudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVQYXNzd29yZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LmhpZGUoKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxSZWNlaXZlQ2FsbHMuc2hvdygpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLnNob3coKTsgLy8gTmV0d29yayBmaWx0ZXIgYXZhaWxhYmxlIGZvciBzZWN1cml0eVxuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBwcm9tcHQgZm9yIGhpZGRlbiBwb3J0IGZpZWxkXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAncG9ydCcpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgICAgICAgICBlbEhvc3QucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFBvcnQucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxTZWNyZXQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBob3N0IHZhbGlkYXRpb24gZXJyb3Igc2luY2UgaXQncyBvcHRpb25hbCBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ2hvc3QnKTtcbiAgICAgICAgICAgICQoJyNob3N0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgYWxsIGJ1dHRvbnMgZm9yIGluYm91bmRcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLnNob3coKTtcbiAgICAgICAgICAgIGNvcHlCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IHBhc3N3b3JkIHN0cmVuZ3RoIGluZGljYXRvciBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRTdHJlbmd0aEluZGljYXRvcigpO1xuICAgICAgICAgICAgY29weUJ1dHRvbi5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgdmFsU2VjcmV0LnZhbCgpKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGxhYmVscyBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgbGFiZWxIb3N0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MgfHwgJ1JlbW90ZSBIb3N0L0lQJyk7XG4gICAgICAgICAgICBsYWJlbFVzZXJuYW1lVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9BdXRoZW50aWNhdGlvblVzZXJuYW1lIHx8ICdBdXRoZW50aWNhdGlvbiBVc2VybmFtZScpO1xuICAgICAgICAgICAgbGFiZWxTZWNyZXRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQgfHwgJ0F1dGhlbnRpY2F0aW9uIFBhc3N3b3JkJyk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAvLyBOT05FOiBTdGF0aWMgcGVlci10by1wZWVyIGNvbm5lY3Rpb25cbiAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7IFxuICAgICAgICAgICAgZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxSZWNlaXZlQ2FsbHMuc2hvdygpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLnNob3coKTsgLy8gTmV0d29yayBmaWx0ZXIgYXZhaWxhYmxlIGZvciBzZWN1cml0eVxuXG4gICAgICAgICAgICAvLyBTaG93IHRvb2x0aXAgaWNvbiBmb3IgcGFzc3dvcmQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuc2hvd1Bhc3N3b3JkVG9vbHRpcCgpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgICAgICAgICBlbEhvc3QuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFBvcnQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxTZWNyZXQucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7IC8vIFBhc3N3b3JkIGlzIG9wdGlvbmFsIGluIG5vbmUgbW9kZVxuXG4gICAgICAgICAgICAvLyBTaG93IHBhc3N3b3JkIG1hbmFnZW1lbnQgYnV0dG9ucyBmb3Igbm9uZSByZWdpc3RyYXRpb24gKGV4Y2VwdCBnZW5lcmF0ZSlcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgICAgIGNvcHlCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTaG93IHBhc3N3b3JkIHN0cmVuZ3RoIGluZGljYXRvciBmb3Igbm9uZSB0eXBlXG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFN0cmVuZ3RoSW5kaWNhdG9yKCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHMgZm9yIG5vbmUgKHBlZXItdG8tcGVlcilcbiAgICAgICAgICAgIGxhYmVsSG9zdFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlckhvc3RPcklQQWRkcmVzcyB8fCAnUGVlciBIb3N0L0lQJyk7XG4gICAgICAgICAgICBsYWJlbFBvcnRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQb3J0IHx8ICdQZWVyIFBvcnQnKTtcbiAgICAgICAgICAgIGxhYmVsVXNlcm5hbWVUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJVc2VybmFtZSB8fCAnUGVlciBVc2VybmFtZScpO1xuICAgICAgICAgICAgbGFiZWxTZWNyZXRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJQYXNzd29yZCB8fCAnUGVlciBQYXNzd29yZCcpO1xuXG4gICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0IGlmIGVtcHR5XG4gICAgICAgICAgICBpZiAodmFsUG9ydC52YWwoKSA9PT0gJycgfHwgdmFsUG9ydC52YWwoKSA9PT0gJzAnKSB7XG4gICAgICAgICAgICAgICAgdmFsUG9ydC52YWwoJzQ1NjknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0iXX0=