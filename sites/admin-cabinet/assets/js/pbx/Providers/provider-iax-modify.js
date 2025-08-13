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
        saveMethod: 'saveRecord'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsIiRwYXNzd29yZFByb2dyZXNzIiwiJCIsImxlbmd0aCIsImhhc0NsYXNzIiwicHJvZ3Jlc3MiLCJwZXJjZW50Iiwic2hvd0FjdGl2aXR5Iiwic2hvdyIsIiRzZWNyZXQiLCJ2YWwiLCJQYXNzd29yZFNjb3JlIiwiY2hlY2tQYXNzU3RyZW5ndGgiLCJwYXNzIiwiYmFyIiwic2VjdGlvbiIsImhpZGUiLCJpbml0aWFsaXplSWF4V2FybmluZ01lc3NhZ2UiLCJpbml0aWFsaXplUmVhbHRpbWVWYWxpZGF0aW9uIiwiaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVIYW5kbGVycyIsImluaXRpYWxpemVUYWJzIiwiY2hlY2tib3giLCJyZWdUeXBlIiwiJGZvcm1PYmoiLCJmb3JtIiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwiaXNDaGVja2VkIiwic2V0VGltZW91dCIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImluaXRpYWxpemVGaWVsZFRvb2x0aXBzIiwidGFiIiwib25WaXNpYmxlIiwidGFiUGF0aCIsInByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyIiwiaW5pdGlhbGl6ZURpYWdub3N0aWNzVGFiIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJkYXRhIiwidHlwZSIsInByb3ZpZGVyVHlwZSIsInJlc3BvbnNlIiwiaWQiLCIkd2FybmluZ01lc3NhZ2UiLCJuZXh0IiwiJGNoZWNrYm94SW5wdXQiLCJ1cGRhdGVXYXJuaW5nU3RhdGUiLCJwcm9wIiwiYWRkQ2xhc3MiLCJvbkNoZWNrZWQiLCJ0cmFuc2l0aW9uIiwib25VbmNoZWNrZWQiLCIkcG9ydEZpZWxkIiwiZmluZCIsImFwcGVuZCIsIm9uIiwiJGxhYmVsIiwiZXZlbnQiLCJmaWVsZE5hbWUiLCJ0YXJnZXQiLCJhdHRyIiwidmFsaWRhdGVSdWxlcyIsImdldFZhbGlkYXRlUnVsZXMiLCJQcm92aWRlcklheFRvb2x0aXBNYW5hZ2VyIiwiaW5pdGlhbGl6ZSIsImdldE91dGJvdW5kUnVsZXMiLCJnZXRJbmJvdW5kUnVsZXMiLCJnZXROb25lUnVsZXMiLCJkZXNjcmlwdGlvbiIsImlkZW50aWZpZXIiLCJydWxlcyIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5IiwiaG9zdCIsInByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5IiwidXNlcm5hbWUiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHkiLCJzZWNyZXQiLCJvcHRpb25hbCIsInBvcnQiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SXNFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJbnZhbGlkIiwicmVjZWl2ZVdpdGhvdXRBdXRoIiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQiLCJ1cmwiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIlByb3ZpZGVyc0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiY29udmVydENoZWNrYm94ZXNUb0Jvb2wiLCJlbEhvc3QiLCJlbFVzZXJuYW1lIiwiZWxTZWNyZXQiLCJlbFBvcnQiLCJlbFJlY2VpdmVDYWxscyIsImVsTmV0d29ya0ZpbHRlciIsImdlblBhc3N3b3JkIiwidmFsVXNlck5hbWUiLCJ2YWxTZWNyZXQiLCJ2YWxQb3J0IiwicHJvdmlkZXJJZCIsInZhbFF1YWxpZnkiLCJjb3B5QnV0dG9uIiwic2hvd0hpZGVCdXR0b24iLCJsYWJlbEhvc3RUZXh0IiwibGFiZWxQb3J0VGV4dCIsImxhYmVsVXNlcm5hbWVUZXh0IiwibGFiZWxTZWNyZXRUZXh0IiwicmVtb3ZlQXR0ciIsImhpZGVQYXNzd29yZFRvb2x0aXAiLCJoaWRlUGFzc3dvcmRTdHJlbmd0aEluZGljYXRvciIsInRleHQiLCJwcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyIsInByX1Byb3ZpZGVyUG9ydCIsInByX1Byb3ZpZGVyTG9naW4iLCJwcl9Qcm92aWRlclBhc3N3b3JkIiwidHJpbSIsImdlbmVyYXRlUGFzc3dvcmQiLCJzaG93UGFzc3dvcmRTdHJlbmd0aEluZGljYXRvciIsInByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyIsInByX0F1dGhlbnRpY2F0aW9uVXNlcm5hbWUiLCJwcl9BdXRoZW50aWNhdGlvblBhc3N3b3JkIiwic2hvd1Bhc3N3b3JkVG9vbHRpcCIsInByX1BlZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9QZWVyUG9ydCIsInByX1BlZXJVc2VybmFtZSIsInByX1BlZXJQYXNzd29yZCIsIlByb3ZpZGVyQmFzZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsVzs7Ozs7QUFDRix5QkFBYztBQUFBOztBQUFBLDZCQUNKLEtBREk7QUFFYjtBQUVEO0FBQ0o7QUFDQTs7Ozs7V0FDSSx5Q0FBZ0M7QUFDNUIsVUFBTUMsaUJBQWlCLEdBQUdDLENBQUMsQ0FBQyw2QkFBRCxDQUEzQjs7QUFDQSxVQUFJRCxpQkFBaUIsQ0FBQ0UsTUFBbEIsR0FBMkIsQ0FBL0IsRUFBa0M7QUFDOUI7QUFDQSxZQUFJLENBQUNGLGlCQUFpQixDQUFDRyxRQUFsQixDQUEyQixVQUEzQixDQUFMLEVBQTZDO0FBQ3pDSCxVQUFBQSxpQkFBaUIsQ0FBQ0ksUUFBbEIsQ0FBMkI7QUFDdkJDLFlBQUFBLE9BQU8sRUFBRSxDQURjO0FB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LENBZ0JPO0FBRWxDOztBQUNBZ0YsUUFBQUEsV0FBVyxDQUFDMUYsSUFBWjtBQUNBZ0csUUFBQUEsVUFBVSxDQUFDeEcsSUFBWDtBQUNBeUcsUUFBQUEsY0FBYyxDQUFDekcsSUFBZixHQXJCMkIsQ0F1QjNCOztBQUNBLGFBQUt3SCw2QkFBTCxHQXhCMkIsQ0EwQjNCOztBQUNBZCxRQUFBQSxhQUFhLENBQUNPLElBQWQsQ0FBbUJoRCxlQUFlLENBQUM0RCxzQkFBaEIsSUFBMEMsY0FBN0Q7QUFDQWxCLFFBQUFBLGFBQWEsQ0FBQ00sSUFBZCxDQUFtQmhELGVBQWUsQ0FBQzZELFdBQWhCLElBQStCLFdBQWxEO0FBQ0FsQixRQUFBQSxpQkFBaUIsQ0FBQ0ssSUFBbEIsQ0FBdUJoRCxlQUFlLENBQUM4RCxlQUFoQixJQUFtQyxlQUExRDtBQUNBbEIsUUFBQUEsZUFBZSxDQUFDSSxJQUFoQixDQUFxQmhELGVBQWUsQ0FBQytELGVBQWhCLElBQW1DLGVBQXhELEVBOUIyQixDQWdDM0I7O0FBQ0EsWUFBSTNCLE9BQU8sQ0FBQ25HLEdBQVIsT0FBa0IsRUFBbEIsSUFBd0JtRyxPQUFPLENBQUNuRyxHQUFSLE9BQWtCLEdBQTlDLEVBQW1EO0FBQy9DbUcsVUFBQUEsT0FBTyxDQUFDbkcsR0FBUixDQUFZLE1BQVo7QUFDSDtBQUNKO0FBQ0o7Ozs7RUE1akJxQitILFkiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQcm92aWRlckJhc2UsIFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIsIFByb3ZpZGVyVG9vbHRpcE1hbmFnZXIsIGkxOG4sIFByb3ZpZGVyc0FQSSAqL1xuXG4vKipcbiAqIElBWCBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1cbiAqIEBjbGFzcyBQcm92aWRlcklBWFxuICovXG5jbGFzcyBQcm92aWRlcklBWCBleHRlbmRzIFByb3ZpZGVyQmFzZSB7XG4gICAgY29uc3RydWN0b3IoKSB7IFxuICAgICAgICBzdXBlcignSUFYJyk7IFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHBhc3N3b3JkIHN0cmVuZ3RoIGluZGljYXRvciBhbmQgdHJpZ2dlciBpbml0aWFsIGNoZWNrXG4gICAgICovXG4gICAgc2hvd1Bhc3N3b3JkU3RyZW5ndGhJbmRpY2F0b3IoKSB7XG4gICAgICAgIGNvbnN0ICRwYXNzd29yZFByb2dyZXNzID0gJCgnI3Bhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgIGlmICgkcGFzc3dvcmRQcm9ncmVzcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHByb2dyZXNzIGNvbXBvbmVudCBpZiBub3QgYWxyZWFkeSBkb25lXG4gICAgICAgICAgICBpZiAoISRwYXNzd29yZFByb2dyZXNzLmhhc0NsYXNzKCdwcm9ncmVzcycpKSB7XG4gICAgICAgICAgICAgICAgJHBhc3N3b3JkUHJvZ3Jlc3MucHJvZ3Jlc3Moe1xuICAgICAgICAgICAgICAgICAgICBwZXJjZW50OiAwLFxuICAgICAgICAgICAgICAgICAgICBzaG93QWN0aXZpdHk6IGZhbHNlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICRwYXNzd29yZFByb2dyZXNzLnNob3coKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJpZ2dlciBwYXNzd29yZCBzdHJlbmd0aCBjaGVjayBpZiBwYXNzd29yZCBleGlzdHNcbiAgICAgICAgICAgIGlmICh0aGlzLiRzZWNyZXQudmFsKCkgJiYgdHlwZW9mIFBhc3N3b3JkU2NvcmUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgUGFzc3dvcmRTY29yZS5jaGVja1Bhc3NTdHJlbmd0aCh7XG4gICAgICAgICAgICAgICAgICAgIHBhc3M6IHRoaXMuJHNlY3JldC52YWwoKSxcbiAgICAgICAgICAgICAgICAgICAgYmFyOiAkcGFzc3dvcmRQcm9ncmVzcyxcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogJHBhc3N3b3JkUHJvZ3Jlc3NcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHBhc3N3b3JkIHN0cmVuZ3RoIGluZGljYXRvclxuICAgICAqL1xuICAgIGhpZGVQYXNzd29yZFN0cmVuZ3RoSW5kaWNhdG9yKCkge1xuICAgICAgICBjb25zdCAkcGFzc3dvcmRQcm9ncmVzcyA9ICQoJyNwYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpO1xuICAgICAgICBpZiAoJHBhc3N3b3JkUHJvZ3Jlc3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJHBhc3N3b3JkUHJvZ3Jlc3MuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAgICB0aGlzLmluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGFicygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtdmFsaWRhdGUgZm9ybSB3aGVuIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIGNoYW5nZXNcbiAgICAgICAgJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoLmNoZWNrYm94JykuY2hlY2tib3goJ3NldHRpbmcnLCAnb25DaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBlcnJvciBvbiBzZWNyZXQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgIHRoaXMuJHNlY3JldC5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIGluYm91bmQgcmVnaXN0cmF0aW9uLCB2YWxpZGF0ZSBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc0NoZWNrZWQgJiYgdGhpcy4kc2VjcmV0LnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB1bmNoZWNrZWQgYW5kIHBhc3N3b3JkIGlzIGVtcHR5LCBzaG93IGVycm9yXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmaWVsZCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWIgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJzKCkge1xuICAgICAgICAkKCcjcHJvdmlkZXItdGFicy1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogKHRhYlBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2RpYWdub3N0aWNzJyAmJiB0eXBlb2YgcHJvdmlkZXJNb2RpZnlTdGF0dXNXb3JrZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZGlhZ25vc3RpY3MgdGFiIHdoZW4gaXQgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgICAgIHByb3ZpZGVyTW9kaWZ5U3RhdHVzV29ya2VyLmluaXRpYWxpemVEaWFnbm9zdGljc1RhYigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHN1cGVyLmNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgcmVzdWx0LmRhdGEudHlwZSA9IHRoaXMucHJvdmlkZXJUeXBlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2tib3ggdmFsdWVzIGFyZSBub3cgYXV0b21hdGljYWxseSBwcm9jZXNzZWQgYnkgRm9ybS5qcyB3aXRoIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sID0gdHJ1ZVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIHN1cGVyLmNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSk7XG4gICAgICAgIFxuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggcmVzcG9uc2UgZGF0YSBpZiBuZWVkZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmlkICYmICEkKCcjaWQnKS52YWwoKSkge1xuICAgICAgICAgICAgICAgICQoJyNpZCcpLnZhbChyZXNwb25zZS5kYXRhLmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVGhlIEZvcm0uanMgd2lsbCBoYW5kbGUgdGhlIHJlbG9hZCBhdXRvbWF0aWNhbGx5IGlmIHJlc3BvbnNlLnJlbG9hZCBpcyBwcmVzZW50XG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIFJFU1QgQVBJIHJldHVybnMgcmVsb2FkIHBhdGggbGlrZSBcInByb3ZpZGVycy9tb2RpZnlpYXgvSUFYLVRSVU5LLXh4eFwiXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIElBWCB3YXJuaW5nIG1lc3NhZ2UgaGFuZGxpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSWF4V2FybmluZ01lc3NhZ2UoKSB7XG4gICAgICAgIGNvbnN0ICR3YXJuaW5nTWVzc2FnZSA9ICQoJyNlbFJlY2VpdmVDYWxscycpLm5leHQoJy53YXJuaW5nLm1lc3NhZ2UnKTtcbiAgICAgICAgY29uc3QgJGNoZWNrYm94SW5wdXQgPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZ1bmN0aW9uIHRvIHVwZGF0ZSB3YXJuaW5nIG1lc3NhZ2Ugc3RhdGVcbiAgICAgICAgY29uc3QgdXBkYXRlV2FybmluZ1N0YXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveElucHV0LnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHdhcm5pbmcgc3RhdGVcbiAgICAgICAgdXBkYXRlV2FybmluZ1N0YXRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBIYW5kbGUgY2hlY2tib3ggY2hhbmdlc1xuICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGguY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQoKSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS50cmFuc2l0aW9uKCdmYWRlIGluJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25VbmNoZWNrZWQoKSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLnRyYW5zaXRpb24oJ2ZhZGUgb3V0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlYWwtdGltZSB2YWxpZGF0aW9uIGZlZWRiYWNrXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbigpIHtcbiAgICAgICAgLy8gRW5hYmxlIGlubGluZSB2YWxpZGF0aW9uIGZvciBiZXR0ZXIgVVhcbiAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdzZXR0aW5nJywgJ2lubGluZScsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhlbHBlciB0ZXh0IGZvciBJQVgtc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIGNvbnN0ICRwb3J0RmllbGQgPSAkKCcjcG9ydCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICBpZiAoJHBvcnRGaWVsZC5maW5kKCcudWkucG9pbnRpbmcubGFiZWwnKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICRwb3J0RmllbGQuYXBwZW5kKCc8ZGl2IGNsYXNzPVwidWkgcG9pbnRpbmcgbGFiZWxcIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+RGVmYXVsdCBJQVggcG9ydCBpcyA0NTY5PC9kaXY+Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgcG9ydCBoZWxwZXIgb24gZm9jdXNcbiAgICAgICAgJCgnI3BvcnQnKS5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRsYWJlbCA9ICQodGhpcykuY2xvc2VzdCgnLmZpZWxkJykuZmluZCgnLnVpLnBvaW50aW5nLmxhYmVsJyk7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS52YWwoKSA9PT0gJycgfHwgJCh0aGlzKS52YWwoKSA9PT0gJzQ1NjknKSB7XG4gICAgICAgICAgICAgICAgJGxhYmVsLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkub24oJ2JsdXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykuY2xvc2VzdCgnLmZpZWxkJykuZmluZCgnLnVpLnBvaW50aW5nLmxhYmVsJykuaGlkZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIG9uIGJsdXIgZm9yIGltbWVkaWF0ZSBmZWVkYmFja1xuICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W3R5cGU9XCJ0ZXh0XCJdLCBpbnB1dFt0eXBlPVwicGFzc3dvcmRcIl0nKS5vbignYmx1cicsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJChldmVudC50YXJnZXQpLmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgJiYgdmFsaWRhdGVSdWxlc1tmaWVsZE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmaWVsZCcsIGZpZWxkTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCkge1xuICAgICAgICAvLyBVc2UgdGhlIHNwZWNpYWxpemVkIFByb3ZpZGVySWF4VG9vbHRpcE1hbmFnZXIgZm9yIElBWCBwcm92aWRlclxuICAgICAgICBQcm92aWRlcklheFRvb2x0aXBNYW5hZ2VyLmluaXRpYWxpemUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKHJlZ1R5cGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ291dGJvdW5kJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgICAgICBjYXNlICdpbmJvdW5kJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRJbmJvdW5kUnVsZXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE5vbmVSdWxlcygpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRPdXRib3VuZFJ1bGVzKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igb3V0Ym91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0T3V0Ym91bmRSdWxlcygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBob3N0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2hvc3QnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXJuYW1lOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3VzZXJuYW1lJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTG9naW5Jc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2VjcmV0OiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIGluYm91bmQgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0SW5ib3VuZFJ1bGVzKCkge1xuICAgICAgICBjb25zdCByZWNlaXZlV2l0aG91dEF1dGggPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcnVsZXMgPSB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gU2VjcmV0IGlzIG9wdGlvbmFsIGlmIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIGlzIGNoZWNrZWRcbiAgICAgICAgaWYgKCFyZWNlaXZlV2l0aG91dEF1dGgpIHtcbiAgICAgICAgICAgIHJ1bGVzLnNlY3JldCA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21pbkxlbmd0aFs4XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZFRvb1Nob3J0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcnVsZXM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2V0IHZhbGlkYXRpb24gcnVsZXMgZm9yIG5vbmUgcmVnaXN0cmF0aW9uXG4gICAgICovXG4gICAgZ2V0Tm9uZVJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAncG9ydCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi42NTUzNV0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByZWdpc3RyYXRpb24gdHlwZSBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzKCkge1xuICAgICAgICAvLyBSZWdpc3RyYXRpb24gdHlwZSBoYW5kbGVyIGlzIG5vdyBpbiBiYXNlIGNsYXNzXG4gICAgICAgIC8vIFRoaXMgbWV0aG9kIGlzIGtlcHQgZm9yIGNvbXBhdGliaWxpdHlcbiAgICB9XG4gICAgXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCBSRVNUIEFQSSBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGhpcy5jYkJlZm9yZVNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gdGhpcy5jYkFmdGVyU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5nc1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogUHJvdmlkZXJzQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL21vZGlmeWlheC9gO1xuICAgICAgICBcbiAgICAgICAgLy8gRW5hYmxlIGF1dG9tYXRpYyBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gdGhlIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICAvLyBHZXQgZWxlbWVudCByZWZlcmVuY2VzXG4gICAgICAgIGNvbnN0IGVsSG9zdCA9ICQoJyNlbEhvc3QnKTtcbiAgICAgICAgY29uc3QgZWxVc2VybmFtZSA9ICQoJyNlbFVzZXJuYW1lJyk7XG4gICAgICAgIGNvbnN0IGVsU2VjcmV0ID0gJCgnI2VsU2VjcmV0Jyk7XG4gICAgICAgIGNvbnN0IGVsUG9ydCA9ICQoJyNlbFBvcnQnKTtcbiAgICAgICAgY29uc3QgZWxSZWNlaXZlQ2FsbHMgPSAkKCcjZWxSZWNlaXZlQ2FsbHMnKTtcbiAgICAgICAgY29uc3QgZWxOZXR3b3JrRmlsdGVyID0gJCgnI2VsTmV0d29ya0ZpbHRlcicpO1xuICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgIGNvbnN0IGdlblBhc3N3b3JkID0gJCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpO1xuXG4gICAgICAgIGNvbnN0IHZhbFVzZXJOYW1lID0gJCgnI3VzZXJuYW1lJyk7XG4gICAgICAgIGNvbnN0IHZhbFNlY3JldCA9IHRoaXMuJHNlY3JldDtcbiAgICAgICAgY29uc3QgdmFsUG9ydCA9ICQoJyNwb3J0Jyk7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgY29uc3QgdmFsUXVhbGlmeSA9ICQoJyNxdWFsaWZ5Jyk7XG4gICAgICAgIGNvbnN0IGNvcHlCdXR0b24gPSAkKCcjZWxTZWNyZXQgLmJ1dHRvbi5jbGlwYm9hcmQnKTtcbiAgICAgICAgY29uc3Qgc2hvd0hpZGVCdXR0b24gPSAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJyk7XG5cbiAgICAgICAgLy8gR2V0IGxhYmVsIHRleHQgZWxlbWVudHNcbiAgICAgICAgY29uc3QgbGFiZWxIb3N0VGV4dCA9ICQoJyNob3N0TGFiZWxUZXh0Jyk7XG4gICAgICAgIGNvbnN0IGxhYmVsUG9ydFRleHQgPSAkKCcjcG9ydExhYmVsVGV4dCcpO1xuICAgICAgICBjb25zdCBsYWJlbFVzZXJuYW1lVGV4dCA9ICQoJyN1c2VybmFtZUxhYmVsVGV4dCcpO1xuICAgICAgICBjb25zdCBsYWJlbFNlY3JldFRleHQgPSAkKCcjc2VjcmV0TGFiZWxUZXh0Jyk7XG5cbiAgICAgICAgLy8gQWx3YXlzIGVuYWJsZSBxdWFsaWZ5IGZvciBJQVggKE5BVCBrZWVwYWxpdmUpXG4gICAgICAgIGlmICh2YWxRdWFsaWZ5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhbFF1YWxpZnkucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgdmFsUXVhbGlmeS52YWwoJzEnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhbFVzZXJOYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG5cbiAgICAgICAgLy8gSGlkZSBwYXNzd29yZCB0b29sdGlwIGJ5IGRlZmF1bHRcbiAgICAgICAgdGhpcy5oaWRlUGFzc3dvcmRUb29sdGlwKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgLy8gT1VUQk9VTkQ6IFdlIHJlZ2lzdGVyIHRvIHByb3ZpZGVyXG4gICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxSZWNlaXZlQ2FsbHMuaGlkZSgpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLmhpZGUoKTsgLy8gTmV0d29yayBmaWx0ZXIgbm90IHJlbGV2YW50IGZvciBvdXRib3VuZFxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgICAgICAgICBlbEhvc3QuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFBvcnQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxTZWNyZXQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgYWxsIHBhc3N3b3JkIG1hbmFnZW1lbnQgYnV0dG9ucyBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgICAgIGNvcHlCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgc2hvd0hpZGVCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBIaWRlIHBhc3N3b3JkIHN0cmVuZ3RoIGluZGljYXRvciBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgIHRoaXMuaGlkZVBhc3N3b3JkU3RyZW5ndGhJbmRpY2F0b3IoKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGxhYmVscyBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgIGxhYmVsSG9zdFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1Byb3ZpZGVyIEhvc3QvSVAnKTtcbiAgICAgICAgICAgIGxhYmVsUG9ydFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQb3J0IHx8ICdQcm92aWRlciBQb3J0Jyk7XG4gICAgICAgICAgICBsYWJlbFVzZXJuYW1lVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckxvZ2luIHx8ICdMb2dpbicpO1xuICAgICAgICAgICAgbGFiZWxTZWNyZXRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUGFzc3dvcmQgfHwgJ1Bhc3N3b3JkJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IHBvcnQgaWYgZW1wdHlcbiAgICAgICAgICAgIGlmICh2YWxQb3J0LnZhbCgpID09PSAnJyB8fCB2YWxQb3J0LnZhbCgpID09PSAnMCcpIHtcbiAgICAgICAgICAgICAgICB2YWxQb3J0LnZhbCgnNDU2OScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgLy8gSU5CT1VORDogUHJvdmlkZXIgY29ubmVjdHMgdG8gdXNcbiAgICAgICAgICAgIHZhbFVzZXJOYW1lLnZhbChwcm92aWRlcklkKTtcbiAgICAgICAgICAgIHZhbFVzZXJOYW1lLmF0dHIoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBdXRvLWdlbmVyYXRlIHBhc3N3b3JkIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvbiBpZiBlbXB0eVxuICAgICAgICAgICAgaWYgKHZhbFNlY3JldC52YWwoKS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVBhc3N3b3JkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICBlbFBvcnQuaGlkZSgpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICBlbFJlY2VpdmVDYWxscy5zaG93KCk7XG4gICAgICAgICAgICBlbE5ldHdvcmtGaWx0ZXIuc2hvdygpOyAvLyBOZXR3b3JrIGZpbHRlciBhdmFpbGFibGUgZm9yIHNlY3VyaXR5XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIHByb21wdCBmb3IgaGlkZGVuIHBvcnQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdwb3J0Jyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICAgICAgICAgIGVsSG9zdC5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsUG9ydC5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFNlY3JldC5hZGRDbGFzcygncmVxdWlyZWQnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGhvc3QgdmFsaWRhdGlvbiBlcnJvciBzaW5jZSBpdCdzIG9wdGlvbmFsIGZvciBpbmJvdW5kXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnaG9zdCcpO1xuICAgICAgICAgICAgJCgnI2hvc3QnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBhbGwgYnV0dG9ucyBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuc2hvdygpO1xuICAgICAgICAgICAgY29weUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICBzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yIGZvciBpbmJvdW5kXG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFN0cmVuZ3RoSW5kaWNhdG9yKCk7XG4gICAgICAgICAgICBjb3B5QnV0dG9uLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCB2YWxTZWNyZXQudmFsKCkpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBpbmJvdW5kXG4gICAgICAgICAgICBsYWJlbEhvc3RUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1JlbW90ZUhvc3RPcklQQWRkcmVzcyB8fCAnUmVtb3RlIEhvc3QvSVAnKTtcbiAgICAgICAgICAgIGxhYmVsVXNlcm5hbWVUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uVXNlcm5hbWUgfHwgJ0F1dGhlbnRpY2F0aW9uIFVzZXJuYW1lJyk7XG4gICAgICAgICAgICBsYWJlbFNlY3JldFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25QYXNzd29yZCB8fCAnQXV0aGVudGljYXRpb24gUGFzc3dvcmQnKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZWdUeXBlID09PSAnbm9uZScpIHtcbiAgICAgICAgICAgIC8vIE5PTkU6IFN0YXRpYyBwZWVyLXRvLXBlZXIgY29ubmVjdGlvblxuICAgICAgICAgICAgZWxIb3N0LnNob3coKTsgXG4gICAgICAgICAgICBlbFBvcnQuc2hvdygpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICBlbFJlY2VpdmVDYWxscy5zaG93KCk7XG4gICAgICAgICAgICBlbE5ldHdvcmtGaWx0ZXIuc2hvdygpOyAvLyBOZXR3b3JrIGZpbHRlciBhdmFpbGFibGUgZm9yIHNlY3VyaXR5XG5cbiAgICAgICAgICAgIC8vIFNob3cgdG9vbHRpcCBpY29uIGZvciBwYXNzd29yZCBmaWVsZFxuICAgICAgICAgICAgdGhpcy5zaG93UGFzc3dvcmRUb29sdGlwKCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICAgICAgICAgIGVsSG9zdC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsUG9ydC5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFNlY3JldC5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTsgLy8gUGFzc3dvcmQgaXMgb3B0aW9uYWwgaW4gbm9uZSBtb2RlXG5cbiAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmQgbWFuYWdlbWVudCBidXR0b25zIGZvciBub25lIHJlZ2lzdHJhdGlvbiAoZXhjZXB0IGdlbmVyYXRlKVxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuaGlkZSgpO1xuICAgICAgICAgICAgY29weUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICBzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgcGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yIGZvciBub25lIHR5cGVcbiAgICAgICAgICAgIHRoaXMuc2hvd1Bhc3N3b3JkU3RyZW5ndGhJbmRpY2F0b3IoKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGxhYmVscyBmb3Igbm9uZSAocGVlci10by1wZWVyKVxuICAgICAgICAgICAgbGFiZWxIb3N0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVySG9zdE9ySVBBZGRyZXNzIHx8ICdQZWVyIEhvc3QvSVAnKTtcbiAgICAgICAgICAgIGxhYmVsUG9ydFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlclBvcnQgfHwgJ1BlZXIgUG9ydCcpO1xuICAgICAgICAgICAgbGFiZWxVc2VybmFtZVRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlclVzZXJuYW1lIHx8ICdQZWVyIFVzZXJuYW1lJyk7XG4gICAgICAgICAgICBsYWJlbFNlY3JldFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUGVlclBhc3N3b3JkIHx8ICdQZWVyIFBhc3N3b3JkJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IHBvcnQgaWYgZW1wdHlcbiAgICAgICAgICAgIGlmICh2YWxQb3J0LnZhbCgpID09PSAnJyB8fCB2YWxQb3J0LnZhbCgpID09PSAnMCcpIHtcbiAgICAgICAgICAgICAgICB2YWxQb3J0LnZhbCgnNDU2OScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSJdfQ==