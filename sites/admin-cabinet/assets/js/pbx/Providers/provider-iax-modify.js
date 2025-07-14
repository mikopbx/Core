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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, PasswordScore */

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
      _get(_getPrototypeOf(ProviderIAX.prototype), "initialize", this).call(this); // IAX-specific initialization


      this.initializeIaxWarningMessage();
      this.initializeRealtimeValidation();
      this.initializeRegistrationTypeHandlers(); // Re-validate form when receive_calls_without_auth changes

      var self = this;
      $('#receive_calls_without_auth.checkbox').checkbox('setting', 'onChange', function () {
        // Get registration type to determine validation rules
        var regType = $('#registration_type').val(); // Clear any existing error on secret field

        self.$formObj.form('remove prompt', 'secret');
        self.$secret.closest('.field').removeClass('error'); // For inbound registration, validate based on checkbox state

        if (regType === 'inbound') {
          var isChecked = $('#receive_calls_without_auth').checkbox('is checked');

          if (!isChecked && self.$secret.val() === '') {
            // If unchecked and password is empty, show error
            setTimeout(function () {
              self.$formObj.form('validate field', 'secret');
            }, 100);
          }
        } // Mark form as changed


        Form.dataChanged();
      }); // Initialize field help tooltips

      this.initializeFieldTooltips();
    }
    /**
     * Initialize IAX warning message handling
     */

  }, {
    key: "initializeIaxWarningMessage",
    value: function initializeIaxWarningMessage() {
      var $warningMessage = $('#elReceiveCalls').next('.warning.message');
      var $checkboxInput = $('#receive_calls_without_auth'); // Function to update warning message state

      function updateWarningState() {
        if ($checkboxInput.prop('checked')) {
          $warningMessage.removeClass('hidden');
        } else {
          $warningMessage.addClass('hidden');
        }
      } // Initialize warning state


      updateWarningState(); // Handle checkbox changes

      var self = this;
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
      var _this = this;

      // Enable inline validation for better UX
      this.$formObj.form('setting', 'inline', true); // Password strength indicator

      if (this.$secret.length > 0 && typeof PasswordScore !== 'undefined') {
        // Create progress bar for password strength if it doesn't exist
        var $passwordProgress = $('#password-strength-progress');

        if ($passwordProgress.length === 0) {
          var $secretField = this.$secret.closest('.field');
          $passwordProgress = $('<div class="ui tiny progress" id="password-strength-progress"><div class="bar"></div></div>');
          $secretField.append($passwordProgress);
        } // Update password strength on input


        this.$secret.on('input', function () {
          PasswordScore.checkPassStrength({
            pass: _this.$secret.val(),
            bar: $passwordProgress,
            section: $passwordProgress
          });
        });
      } // Add helper text for IAX-specific fields


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

      var self = this;
      this.$formObj.find('input[type="text"], input[type="password"]').on('blur', function () {
        var fieldName = $(this).attr('name');
        var validateRules = self.getValidateRules();

        if (fieldName && validateRules[fieldName]) {
          self.$formObj.form('validate field', fieldName);
        }
      });
    }
    /**
     * Initialize field help tooltips
     */

  }, {
    key: "initializeFieldTooltips",
    value: function initializeFieldTooltips() {
      // Build tooltip data structures
      var registrationTypeData = {
        header: globalTranslate.iax_RegistrationTypeTooltip_header,
        list: [{
          term: globalTranslate.iax_RegistrationTypeTooltip_outbound,
          definition: globalTranslate.iax_RegistrationTypeTooltip_outbound_desc
        }, {
          term: globalTranslate.iax_RegistrationTypeTooltip_inbound,
          definition: globalTranslate.iax_RegistrationTypeTooltip_inbound_desc
        }, {
          term: globalTranslate.iax_RegistrationTypeTooltip_none,
          definition: globalTranslate.iax_RegistrationTypeTooltip_none_desc
        }]
      };
      var receiveCallsData = {
        header: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_header,
        description: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_desc,
        warning: {
          header: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_warning_header,
          text: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_warning
        },
        list: [{
          term: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_application,
          definition: globalTranslate.iax_ReceiveCallsWithoutAuthTooltip_application_desc
        }]
      };
      var networkFilterData = {
        header: globalTranslate.iax_NetworkFilterTooltip_header,
        description: globalTranslate.iax_NetworkFilterTooltip_desc,
        list: [{
          term: globalTranslate.iax_NetworkFilterTooltip_inbound,
          definition: globalTranslate.iax_NetworkFilterTooltip_inbound_desc
        }, {
          term: globalTranslate.iax_NetworkFilterTooltip_outbound,
          definition: globalTranslate.iax_NetworkFilterTooltip_outbound_desc
        }, {
          term: globalTranslate.iax_NetworkFilterTooltip_none,
          definition: globalTranslate.iax_NetworkFilterTooltip_none_desc
        }]
      };
      var providerHostData = {
        header: globalTranslate.iax_ProviderHostTooltip_header,
        description: globalTranslate.iax_ProviderHostTooltip_desc,
        list: [globalTranslate.iax_ProviderHostTooltip_format_ip, globalTranslate.iax_ProviderHostTooltip_format_domain, globalTranslate.iax_ProviderHostTooltip_outbound_use, globalTranslate.iax_ProviderHostTooltip_none_use],
        note: globalTranslate.iax_ProviderHostTooltip_note
      };
      var portData = {
        header: globalTranslate.iax_PortTooltip_header,
        description: globalTranslate.iax_PortTooltip_desc,
        list: [globalTranslate.iax_PortTooltip_default, globalTranslate.iax_PortTooltip_info],
        note: globalTranslate.iax_PortTooltip_note
      };
      var manualAttributesData = {
        header: i18n('iax_ManualAttributesTooltip_header'),
        description: i18n('iax_ManualAttributesTooltip_desc'),
        list: [{
          term: i18n('iax_ManualAttributesTooltip_format'),
          definition: null
        }],
        examplesHeader: i18n('iax_ManualAttributesTooltip_examples_header'),
        examples: ['language = ru', 'codecpriority = host', 'trunktimestamps = yes', 'trunk = yes'],
        warning: {
          header: i18n('iax_ManualAttributesTooltip_warning_header'),
          text: i18n('iax_ManualAttributesTooltip_warning')
        }
      };
      var tooltipConfigs = {
        'registration_type': this.buildTooltipContent(registrationTypeData),
        'receive_calls_without_auth': this.buildTooltipContent(receiveCallsData),
        'network_filter': this.buildTooltipContent(networkFilterData),
        'provider_host': this.buildTooltipContent(providerHostData),
        'iax_port': this.buildTooltipContent(portData),
        'manual_attributes': this.buildTooltipContent(manualAttributesData)
      }; // Initialize tooltips for each field with info icon

      $('.field-info-icon').each(function (_, element) {
        var $icon = $(element);
        var fieldName = $icon.data('field');
        var content = tooltipConfigs[fieldName];

        if (content) {
          $icon.popup({
            html: content,
            position: 'top right',
            hoverable: true,
            delay: {
              show: 300,
              hide: 100
            },
            variation: 'flowing'
          });
        }
      });
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
    value: function initializeRegistrationTypeHandlers() {
      var self = this; // Handle registration type changes

      $('#registration_type').dropdown('setting', 'onChange', function (value) {
        // Update visibility of elements
        self.updateVisibilityElements(); // Update validation rules for the new registration type

        Form.validateRules = self.getValidateRules(); // Clear any validation errors

        self.$formObj.find('.field.error').removeClass('error');
        self.$formObj.find('.ui.error.message').empty();
        self.$formObj.form('remove prompt', 'secret');
        self.$formObj.form('remove prompt', 'host');
        self.$formObj.form('remove prompt', 'port'); // Mark form as changed

        Form.dataChanged();
      });
    }
    /**
     * Override parent's initializeForm to handle dynamic validation rules
     */

  }, {
    key: "initializeForm",
    value: function initializeForm() {
      var self = this;
      Form.$formObj = this.$formObj; // Get initial validation rules

      var validationConfig = {
        on: 'blur',
        inline: true,
        keyboardShortcuts: false,
        fields: this.getValidateRules(),
        onSuccess: function onSuccess(event) {
          // Prevent auto-submit, only submit via button click
          if (event) {
            event.preventDefault();
          }

          return false;
        }
      }; // Initialize form with validation

      Form.$formObj.form(validationConfig);
      Form.url = "".concat(globalRootUrl, "providers/save/").concat(this.providerType.toLowerCase());
      Form.validateRules = this.getValidateRules();
      Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
      Form.cbAfterSendForm = this.cbAfterSendForm.bind(this);
      Form.initialize(); // Override Form's submit button handler to use dynamic validation rules

      Form.$submitButton.off('click').on('click', function (e) {
        e.preventDefault();
        if (Form.$submitButton.hasClass('loading')) return;
        if (Form.$submitButton.hasClass('disabled')) return; // Get current validation rules based on form state

        var currentRules = self.getValidateRules(); // Set up form validation with current rules and submit

        Form.$formObj.form({
          on: 'blur',
          fields: currentRules,
          onSuccess: function onSuccess() {
            // Call submitForm() on successful validation
            Form.submitForm();
          },
          onFailure: function onFailure() {
            // Add error class to form on validation failure
            Form.$formObj.removeClass('error').addClass('error');
          }
        });
        Form.$formObj.form('validate form');
      });
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
      var elUniqId = $('#uniqid');
      var genPassword = $('#generate-new-password');
      var valUserName = $('#username');
      var valSecret = this.$secret;
      var valPort = $('#port');
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

      valUserName.removeAttr('readonly'); // Hide any existing password info messages

      this.hidePasswordInfoMessage(); // Update element visibility based on registration type

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
        elSecret.addClass('required'); // Hide generate and copy buttons for outbound

        genPassword.hide();
        copyButton.hide();
        showHideButton.show(); // Update labels for outbound

        labelHostText.text(globalTranslate.pr_ProviderHostOrIPAddress || 'Provider Host/IP');
        labelPortText.text(globalTranslate.pr_ProviderPort || 'Provider Port');
        labelUsernameText.text(globalTranslate.pr_ProviderLogin || 'Login');
        labelSecretText.text(globalTranslate.pr_ProviderPassword || 'Password'); // Set default port if empty

        if (valPort.val() === '' || valPort.val() === '0') {
          valPort.val('4569');
        }
      } else if (regType === 'inbound') {
        // INBOUND: Provider connects to us
        valUserName.val(elUniqId.val());
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
        showHideButton.show();
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
        // Show informational message for password field

        this.showPasswordInfoMessage('iax'); // Update required fields

        elHost.addClass('required');
        elPort.addClass('required');
        elUsername.addClass('required');
        elSecret.removeClass('required'); // Password is optional in none mode
        // Hide generate and copy buttons

        genPassword.hide();
        copyButton.hide();
        showHideButton.show(); // Update labels for none (peer-to-peer)

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
}(ProviderBase); // Initialize on document ready


$(document).ready(function () {
  var provider = new ProviderIAX();
  provider.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzIiwic2VsZiIsIiQiLCJjaGVja2JveCIsInJlZ1R5cGUiLCJ2YWwiLCIkZm9ybU9iaiIsImZvcm0iLCIkc2VjcmV0IiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwiaXNDaGVja2VkIiwic2V0VGltZW91dCIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImluaXRpYWxpemVGaWVsZFRvb2x0aXBzIiwiJHdhcm5pbmdNZXNzYWdlIiwibmV4dCIsIiRjaGVja2JveElucHV0IiwidXBkYXRlV2FybmluZ1N0YXRlIiwicHJvcCIsImFkZENsYXNzIiwib25DaGVja2VkIiwidHJhbnNpdGlvbiIsIm9uVW5jaGVja2VkIiwibGVuZ3RoIiwiUGFzc3dvcmRTY29yZSIsIiRwYXNzd29yZFByb2dyZXNzIiwiJHNlY3JldEZpZWxkIiwiYXBwZW5kIiwib24iLCJjaGVja1Bhc3NTdHJlbmd0aCIsInBhc3MiLCJiYXIiLCJzZWN0aW9uIiwiJHBvcnRGaWVsZCIsImZpbmQiLCIkbGFiZWwiLCJzaG93IiwiaGlkZSIsImZpZWxkTmFtZSIsImF0dHIiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsInJlZ2lzdHJhdGlvblR5cGVEYXRhIiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2hlYWRlciIsImxpc3QiLCJ0ZXJtIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kIiwiZGVmaW5pdGlvbiIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmQiLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmUiLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZV9kZXNjIiwicmVjZWl2ZUNhbGxzRGF0YSIsImlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJpYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2Rlc2MiLCJ3YXJuaW5nIiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsInRleHQiLCJpYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmciLCJpYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2FwcGxpY2F0aW9uIiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbl9kZXNjIiwibmV0d29ya0ZpbHRlckRhdGEiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaGVhZGVyIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2Rlc2MiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZCIsImlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kX2Rlc2MiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmQiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsImlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmVfZGVzYyIsInByb3ZpZGVySG9zdERhdGEiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9oZWFkZXIiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2lwIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2RvbWFpbiIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kX3VzZSIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX25vbmVfdXNlIiwibm90ZSIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX25vdGUiLCJwb3J0RGF0YSIsImlheF9Qb3J0VG9vbHRpcF9oZWFkZXIiLCJpYXhfUG9ydFRvb2x0aXBfZGVzYyIsImlheF9Qb3J0VG9vbHRpcF9kZWZhdWx0IiwiaWF4X1BvcnRUb29sdGlwX2luZm8iLCJpYXhfUG9ydFRvb2x0aXBfbm90ZSIsIm1hbnVhbEF0dHJpYnV0ZXNEYXRhIiwiaTE4biIsImV4YW1wbGVzSGVhZGVyIiwiZXhhbXBsZXMiLCJ0b29sdGlwQ29uZmlncyIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJlYWNoIiwiXyIsImVsZW1lbnQiLCIkaWNvbiIsImRhdGEiLCJjb250ZW50IiwicG9wdXAiLCJodG1sIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJkZWxheSIsInZhcmlhdGlvbiIsImdldE91dGJvdW5kUnVsZXMiLCJnZXRJbmJvdW5kUnVsZXMiLCJnZXROb25lUnVsZXMiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHkiLCJob3N0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInNlY3JldCIsIm9wdGlvbmFsIiwicG9ydCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQiLCJyZWNlaXZlV2l0aG91dEF1dGgiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCIsImRyb3Bkb3duIiwidmFsdWUiLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJlbXB0eSIsInZhbGlkYXRpb25Db25maWciLCJpbmxpbmUiLCJrZXlib2FyZFNob3J0Y3V0cyIsImZpZWxkcyIsIm9uU3VjY2VzcyIsImV2ZW50IiwicHJldmVudERlZmF1bHQiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwicHJvdmlkZXJUeXBlIiwidG9Mb3dlckNhc2UiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImluaXRpYWxpemUiLCIkc3VibWl0QnV0dG9uIiwib2ZmIiwiZSIsImhhc0NsYXNzIiwiY3VycmVudFJ1bGVzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsImVsSG9zdCIsImVsVXNlcm5hbWUiLCJlbFNlY3JldCIsImVsUG9ydCIsImVsUmVjZWl2ZUNhbGxzIiwiZWxOZXR3b3JrRmlsdGVyIiwiZWxVbmlxSWQiLCJnZW5QYXNzd29yZCIsInZhbFVzZXJOYW1lIiwidmFsU2VjcmV0IiwidmFsUG9ydCIsInZhbFF1YWxpZnkiLCJjb3B5QnV0dG9uIiwic2hvd0hpZGVCdXR0b24iLCJsYWJlbEhvc3RUZXh0IiwibGFiZWxQb3J0VGV4dCIsImxhYmVsVXNlcm5hbWVUZXh0IiwibGFiZWxTZWNyZXRUZXh0IiwicmVtb3ZlQXR0ciIsImhpZGVQYXNzd29yZEluZm9NZXNzYWdlIiwicHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9Qcm92aWRlclBvcnQiLCJwcl9Qcm92aWRlckxvZ2luIiwicHJfUHJvdmlkZXJQYXNzd29yZCIsInRyaW0iLCJnZW5lcmF0ZVBhc3N3b3JkIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSIsInByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQiLCJzaG93UGFzc3dvcmRJbmZvTWVzc2FnZSIsInByX1BlZXJIb3N0T3JJUEFkZHJlc3MiLCJwcl9QZWVyUG9ydCIsInByX1BlZXJVc2VybmFtZSIsInBy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O0VBanFCcUJ3TCxZLEdBb3FCMUI7OztBQUNBM0wsQ0FBQyxDQUFDNEwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQixNQUFNQyxRQUFRLEdBQUcsSUFBSW5NLFdBQUosRUFBakI7QUFDQW1NLEVBQUFBLFFBQVEsQ0FBQzdDLFVBQVQ7QUFDSCxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQYXNzd29yZFNjb3JlICovXG5cbi8qKlxuICogSUFYIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybVxuICogQGNsYXNzIFByb3ZpZGVySUFYXG4gKi9cbmNsYXNzIFByb3ZpZGVySUFYIGV4dGVuZHMgUHJvdmlkZXJCYXNlIHtcbiAgICBjb25zdHJ1Y3RvcigpIHsgXG4gICAgICAgIHN1cGVyKCdJQVgnKTsgXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN1cGVyLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIElBWC1zcGVjaWZpYyBpbml0aWFsaXphdGlvblxuICAgICAgICB0aGlzLmluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBSZS12YWxpZGF0ZSBmb3JtIHdoZW4gcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggY2hhbmdlc1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoLmNoZWNrYm94JykuY2hlY2tib3goJ3NldHRpbmcnLCAnb25DaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBHZXQgcmVnaXN0cmF0aW9uIHR5cGUgdG8gZGV0ZXJtaW5lIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ2xlYXIgYW55IGV4aXN0aW5nIGVycm9yIG9uIHNlY3JldCBmaWVsZFxuICAgICAgICAgICAgc2VsZi4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgc2VsZi4kc2VjcmV0LmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3IgaW5ib3VuZCByZWdpc3RyYXRpb24sIHZhbGlkYXRlIGJhc2VkIG9uIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzQ2hlY2tlZCAmJiBzZWxmLiRzZWNyZXQudmFsKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHVuY2hlY2tlZCBhbmQgcGFzc3dvcmQgaXMgZW1wdHksIHNob3cgZXJyb3JcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZpZWxkJywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZpZWxkIGhlbHAgdG9vbHRpcHNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRmllbGRUb29sdGlwcygpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgSUFYIHdhcm5pbmcgbWVzc2FnZSBoYW5kbGluZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSgpIHtcbiAgICAgICAgY29uc3QgJHdhcm5pbmdNZXNzYWdlID0gJCgnI2VsUmVjZWl2ZUNhbGxzJykubmV4dCgnLndhcm5pbmcubWVzc2FnZScpO1xuICAgICAgICBjb25zdCAkY2hlY2tib3hJbnB1dCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gRnVuY3Rpb24gdG8gdXBkYXRlIHdhcm5pbmcgbWVzc2FnZSBzdGF0ZVxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVXYXJuaW5nU3RhdGUoKSB7XG4gICAgICAgICAgICBpZiAoJGNoZWNrYm94SW5wdXQucHJvcCgnY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLnJlbW92ZUNsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3YXJuaW5nIHN0YXRlXG4gICAgICAgIHVwZGF0ZVdhcm5pbmdTdGF0ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGNoZWNrYm94IGNoYW5nZXNcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aC5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hlY2tlZDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLnJlbW92ZUNsYXNzKCdoaWRkZW4nKS50cmFuc2l0aW9uKCdmYWRlIGluJyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25VbmNoZWNrZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS50cmFuc2l0aW9uKCdmYWRlIG91dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UuYWRkQ2xhc3MoJ2hpZGRlbicpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlYWwtdGltZSB2YWxpZGF0aW9uIGZlZWRiYWNrXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlYWx0aW1lVmFsaWRhdGlvbigpIHtcbiAgICAgICAgLy8gRW5hYmxlIGlubGluZSB2YWxpZGF0aW9uIGZvciBiZXR0ZXIgVVhcbiAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdzZXR0aW5nJywgJ2lubGluZScsIHRydWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gUGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yXG4gICAgICAgIGlmICh0aGlzLiRzZWNyZXQubGVuZ3RoID4gMCAmJiB0eXBlb2YgUGFzc3dvcmRTY29yZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBwcm9ncmVzcyBiYXIgZm9yIHBhc3N3b3JkIHN0cmVuZ3RoIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgIGxldCAkcGFzc3dvcmRQcm9ncmVzcyA9ICQoJyNwYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpO1xuICAgICAgICAgICAgaWYgKCRwYXNzd29yZFByb2dyZXNzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRzZWNyZXRGaWVsZCA9IHRoaXMuJHNlY3JldC5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgICAgICAgICAkcGFzc3dvcmRQcm9ncmVzcyA9ICQoJzxkaXYgY2xhc3M9XCJ1aSB0aW55IHByb2dyZXNzXCIgaWQ9XCJwYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzc1wiPjxkaXYgY2xhc3M9XCJiYXJcIj48L2Rpdj48L2Rpdj4nKTtcbiAgICAgICAgICAgICAgICAkc2VjcmV0RmllbGQuYXBwZW5kKCRwYXNzd29yZFByb2dyZXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHN0cmVuZ3RoIG9uIGlucHV0XG4gICAgICAgICAgICB0aGlzLiRzZWNyZXQub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIFBhc3N3b3JkU2NvcmUuY2hlY2tQYXNzU3RyZW5ndGgoe1xuICAgICAgICAgICAgICAgICAgICBwYXNzOiB0aGlzLiRzZWNyZXQudmFsKCksXG4gICAgICAgICAgICAgICAgICAgIGJhcjogJHBhc3N3b3JkUHJvZ3Jlc3MsXG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246ICRwYXNzd29yZFByb2dyZXNzXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhlbHBlciB0ZXh0IGZvciBJQVgtc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIGNvbnN0ICRwb3J0RmllbGQgPSAkKCcjcG9ydCcpLmNsb3Nlc3QoJy5maWVsZCcpO1xuICAgICAgICBpZiAoJHBvcnRGaWVsZC5maW5kKCcudWkucG9pbnRpbmcubGFiZWwnKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICRwb3J0RmllbGQuYXBwZW5kKCc8ZGl2IGNsYXNzPVwidWkgcG9pbnRpbmcgbGFiZWxcIiBzdHlsZT1cImRpc3BsYXk6IG5vbmU7XCI+RGVmYXVsdCBJQVggcG9ydCBpcyA0NTY5PC9kaXY+Jyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgcG9ydCBoZWxwZXIgb24gZm9jdXNcbiAgICAgICAgJCgnI3BvcnQnKS5vbignZm9jdXMnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRsYWJlbCA9ICQodGhpcykuY2xvc2VzdCgnLmZpZWxkJykuZmluZCgnLnVpLnBvaW50aW5nLmxhYmVsJyk7XG4gICAgICAgICAgICBpZiAoJCh0aGlzKS52YWwoKSA9PT0gJycgfHwgJCh0aGlzKS52YWwoKSA9PT0gJzQ1NjknKSB7XG4gICAgICAgICAgICAgICAgJGxhYmVsLnNob3coKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkub24oJ2JsdXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQodGhpcykuY2xvc2VzdCgnLmZpZWxkJykuZmluZCgnLnVpLnBvaW50aW5nLmxhYmVsJykuaGlkZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFZhbGlkYXRlIG9uIGJsdXIgZm9yIGltbWVkaWF0ZSBmZWVkYmFja1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCdpbnB1dFt0eXBlPVwidGV4dFwiXSwgaW5wdXRbdHlwZT1cInBhc3N3b3JkXCJdJykub24oJ2JsdXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICQodGhpcykuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGVSdWxlcyA9IHNlbGYuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICAgICAgaWYgKGZpZWxkTmFtZSAmJiB2YWxpZGF0ZVJ1bGVzW2ZpZWxkTmFtZV0pIHtcbiAgICAgICAgICAgICAgICBzZWxmLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZpZWxkJywgZmllbGROYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKSB7IFxuICAgICAgICAvLyBCdWlsZCB0b29sdGlwIGRhdGEgc3RydWN0dXJlc1xuICAgICAgICBjb25zdCByZWdpc3RyYXRpb25UeXBlRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHJlY2VpdmVDYWxsc0RhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfd2FybmluZ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2FwcGxpY2F0aW9uLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbl9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG5ldHdvcmtGaWx0ZXJEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmQsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmUsXG4gICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfbm9uZV9kZXNjXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHByb3ZpZGVySG9zdERhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9pcCxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2RvbWFpbixcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfb3V0Ym91bmRfdXNlLFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub25lX3VzZVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcG9ydERhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUG9ydFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUG9ydFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX2RlZmF1bHQsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qb3J0VG9vbHRpcF9pbmZvXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmlheF9Qb3J0VG9vbHRpcF9ub3RlXG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgbWFudWFsQXR0cmlidXRlc0RhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9oZWFkZXInKSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBpMThuKCdpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZGVzYycpLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Zvcm1hdCcpLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGV4YW1wbGVzSGVhZGVyOiBpMThuKCdpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfZXhhbXBsZXNfaGVhZGVyJyksXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdsYW5ndWFnZSA9IHJ1JyxcbiAgICAgICAgICAgICAgICAnY29kZWNwcmlvcml0eSA9IGhvc3QnLFxuICAgICAgICAgICAgICAgICd0cnVua3RpbWVzdGFtcHMgPSB5ZXMnLFxuICAgICAgICAgICAgICAgICd0cnVuayA9IHllcydcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBpMThuKCdpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZ19oZWFkZXInKSxcbiAgICAgICAgICAgICAgICB0ZXh0OiBpMThuKCdpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfd2FybmluZycpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICAncmVnaXN0cmF0aW9uX3R5cGUnOiB0aGlzLmJ1aWxkVG9vbHRpcENvbnRlbnQocmVnaXN0cmF0aW9uVHlwZURhdGEpLFxuICAgICAgICAgICAgJ3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJzogdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KHJlY2VpdmVDYWxsc0RhdGEpLFxuICAgICAgICAgICAgJ25ldHdvcmtfZmlsdGVyJzogdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KG5ldHdvcmtGaWx0ZXJEYXRhKSxcbiAgICAgICAgICAgICdwcm92aWRlcl9ob3N0JzogdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KHByb3ZpZGVySG9zdERhdGEpLFxuICAgICAgICAgICAgJ2lheF9wb3J0JzogdGhpcy5idWlsZFRvb2x0aXBDb250ZW50KHBvcnREYXRhKSxcbiAgICAgICAgICAgICdtYW51YWxfYXR0cmlidXRlcyc6IHRoaXMuYnVpbGRUb29sdGlwQ29udGVudChtYW51YWxBdHRyaWJ1dGVzRGF0YSlcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGVhY2ggZmllbGQgd2l0aCBpbmZvIGljb25cbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKF8sIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdG9vbHRpcENvbmZpZ3NbZmllbGROYW1lXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAocmVnVHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnb3V0Ym91bmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ2luYm91bmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEluYm91bmRSdWxlcygpO1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Tm9uZVJ1bGVzKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBvdXRib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRPdXRib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRJbmJvdW5kUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlY2VpdmVXaXRob3V0QXV0aCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBydWxlcyA9IHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTZWNyZXQgaXMgb3B0aW9uYWwgaWYgcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggaXMgY2hlY2tlZFxuICAgICAgICBpZiAoIXJlY2VpdmVXaXRob3V0QXV0aCkge1xuICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzhdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBydWxlcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igbm9uZSByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXROb25lUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGNoYW5nZSBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIHJlZ2lzdHJhdGlvbiB0eXBlIGNoYW5nZXNcbiAgICAgICAgJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykuZHJvcGRvd24oJ3NldHRpbmcnLCAnb25DaGFuZ2UnLCAodmFsdWUpID0+IHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzXG4gICAgICAgICAgICBzZWxmLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIG5ldyByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gc2VsZi5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFyIGFueSB2YWxpZGF0aW9uIGVycm9yc1xuICAgICAgICAgICAgc2VsZi4kZm9ybU9iai5maW5kKCcuZmllbGQuZXJyb3InKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIHNlbGYuJGZvcm1PYmouZmluZCgnLnVpLmVycm9yLm1lc3NhZ2UnKS5lbXB0eSgpO1xuICAgICAgICAgICAgc2VsZi4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ3NlY3JldCcpO1xuICAgICAgICAgICAgc2VsZi4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ2hvc3QnKTtcbiAgICAgICAgICAgIHNlbGYuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdwb3J0Jyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIE92ZXJyaWRlIHBhcmVudCdzIGluaXRpYWxpemVGb3JtIHRvIGhhbmRsZSBkeW5hbWljIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGluaXRpYWwgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBjb25zdCB2YWxpZGF0aW9uQ29uZmlnID0ge1xuICAgICAgICAgICAgb246ICdibHVyJyxcbiAgICAgICAgICAgIGlubGluZTogdHJ1ZSxcbiAgICAgICAgICAgIGtleWJvYXJkU2hvcnRjdXRzOiBmYWxzZSxcbiAgICAgICAgICAgIGZpZWxkczogdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCksXG4gICAgICAgICAgICBvblN1Y2Nlc3M6IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgLy8gUHJldmVudCBhdXRvLXN1Ym1pdCwgb25seSBzdWJtaXQgdmlhIGJ1dHRvbiBjbGlja1xuICAgICAgICAgICAgICAgIGlmIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gd2l0aCB2YWxpZGF0aW9uXG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSh2YWxpZGF0aW9uQ29uZmlnKTtcbiAgICAgICAgXG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvc2F2ZS8ke3RoaXMucHJvdmlkZXJUeXBlLnRvTG93ZXJDYXNlKCl9YDtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gT3ZlcnJpZGUgRm9ybSdzIHN1Ym1pdCBidXR0b24gaGFuZGxlciB0byB1c2UgZHluYW1pYyB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChGb3JtLiRzdWJtaXRCdXR0b24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKEZvcm0uJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnZGlzYWJsZWQnKSkgcmV0dXJuO1xuXG4gICAgICAgICAgICAvLyBHZXQgY3VycmVudCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIGZvcm0gc3RhdGVcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRSdWxlcyA9IHNlbGYuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgdXAgZm9ybSB2YWxpZGF0aW9uIHdpdGggY3VycmVudCBydWxlcyBhbmQgc3VibWl0XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oe1xuICAgICAgICAgICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZHM6IGN1cnJlbnRSdWxlcyxcbiAgICAgICAgICAgICAgICAgICAgb25TdWNjZXNzKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbCBzdWJtaXRGb3JtKCkgb24gc3VjY2Vzc2Z1bCB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLnN1Ym1pdEZvcm0oKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgb25GYWlsdXJlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWRkIGVycm9yIGNsYXNzIHRvIGZvcm0gb24gdmFsaWRhdGlvbiBmYWlsdXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdlcnJvcicpLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmb3JtJyk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgdmlzaWJpbGl0eSBvZiBlbGVtZW50cyBiYXNlZCBvbiB0aGUgcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgKi9cbiAgICB1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKSB7XG4gICAgICAgIC8vIEdldCBlbGVtZW50IHJlZmVyZW5jZXNcbiAgICAgICAgY29uc3QgZWxIb3N0ID0gJCgnI2VsSG9zdCcpO1xuICAgICAgICBjb25zdCBlbFVzZXJuYW1lID0gJCgnI2VsVXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgZWxTZWNyZXQgPSAkKCcjZWxTZWNyZXQnKTtcbiAgICAgICAgY29uc3QgZWxQb3J0ID0gJCgnI2VsUG9ydCcpO1xuICAgICAgICBjb25zdCBlbFJlY2VpdmVDYWxscyA9ICQoJyNlbFJlY2VpdmVDYWxscycpO1xuICAgICAgICBjb25zdCBlbE5ldHdvcmtGaWx0ZXIgPSAkKCcjZWxOZXR3b3JrRmlsdGVyJyk7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgY29uc3QgZWxVbmlxSWQgPSAkKCcjdW5pcWlkJyk7XG4gICAgICAgIGNvbnN0IGdlblBhc3N3b3JkID0gJCgnI2dlbmVyYXRlLW5ldy1wYXNzd29yZCcpO1xuXG4gICAgICAgIGNvbnN0IHZhbFVzZXJOYW1lID0gJCgnI3VzZXJuYW1lJyk7XG4gICAgICAgIGNvbnN0IHZhbFNlY3JldCA9IHRoaXMuJHNlY3JldDtcbiAgICAgICAgY29uc3QgdmFsUG9ydCA9ICQoJyNwb3J0Jyk7XG4gICAgICAgIGNvbnN0IHZhbFF1YWxpZnkgPSAkKCcjcXVhbGlmeScpO1xuICAgICAgICBjb25zdCBjb3B5QnV0dG9uID0gJCgnI2VsU2VjcmV0IC5idXR0b24uY2xpcGJvYXJkJyk7XG4gICAgICAgIGNvbnN0IHNob3dIaWRlQnV0dG9uID0gJCgnI3Nob3ctaGlkZS1wYXNzd29yZCcpO1xuXG4gICAgICAgIC8vIEdldCBsYWJlbCB0ZXh0IGVsZW1lbnRzXG4gICAgICAgIGNvbnN0IGxhYmVsSG9zdFRleHQgPSAkKCcjaG9zdExhYmVsVGV4dCcpO1xuICAgICAgICBjb25zdCBsYWJlbFBvcnRUZXh0ID0gJCgnI3BvcnRMYWJlbFRleHQnKTtcbiAgICAgICAgY29uc3QgbGFiZWxVc2VybmFtZVRleHQgPSAkKCcjdXNlcm5hbWVMYWJlbFRleHQnKTtcbiAgICAgICAgY29uc3QgbGFiZWxTZWNyZXRUZXh0ID0gJCgnI3NlY3JldExhYmVsVGV4dCcpO1xuXG4gICAgICAgIC8vIEFsd2F5cyBlbmFibGUgcXVhbGlmeSBmb3IgSUFYIChOQVQga2VlcGFsaXZlKVxuICAgICAgICBpZiAodmFsUXVhbGlmeS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YWxRdWFsaWZ5LnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIHZhbFF1YWxpZnkudmFsKCcxJyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YWxVc2VyTmFtZS5yZW1vdmVBdHRyKCdyZWFkb25seScpO1xuXG4gICAgICAgIC8vIEhpZGUgYW55IGV4aXN0aW5nIHBhc3N3b3JkIGluZm8gbWVzc2FnZXNcbiAgICAgICAgdGhpcy5oaWRlUGFzc3dvcmRJbmZvTWVzc2FnZSgpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBlbGVtZW50IHZpc2liaWxpdHkgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdvdXRib3VuZCcpIHtcbiAgICAgICAgICAgIC8vIE9VVEJPVU5EOiBXZSByZWdpc3RlciB0byBwcm92aWRlclxuICAgICAgICAgICAgZWxIb3N0LnNob3coKTtcbiAgICAgICAgICAgIGVsUG9ydC5zaG93KCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUmVjZWl2ZUNhbGxzLmhpZGUoKTtcbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5oaWRlKCk7IC8vIE5ldHdvcmsgZmlsdGVyIG5vdCByZWxldmFudCBmb3Igb3V0Ym91bmRcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgICAgICAgICAgZWxIb3N0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxQb3J0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIGdlbmVyYXRlIGFuZCBjb3B5IGJ1dHRvbnMgZm9yIG91dGJvdW5kXG4gICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICBjb3B5QnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIHNob3dIaWRlQnV0dG9uLnNob3coKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGxhYmVscyBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgIGxhYmVsSG9zdFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1Byb3ZpZGVyIEhvc3QvSVAnKTtcbiAgICAgICAgICAgIGxhYmVsUG9ydFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQb3J0IHx8ICdQcm92aWRlciBQb3J0Jyk7XG4gICAgICAgICAgICBsYWJlbFVzZXJuYW1lVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckxvZ2luIHx8ICdMb2dpbicpO1xuICAgICAgICAgICAgbGFiZWxTZWNyZXRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyUGFzc3dvcmQgfHwgJ1Bhc3N3b3JkJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IHBvcnQgaWYgZW1wdHlcbiAgICAgICAgICAgIGlmICh2YWxQb3J0LnZhbCgpID09PSAnJyB8fCB2YWxQb3J0LnZhbCgpID09PSAnMCcpIHtcbiAgICAgICAgICAgICAgICB2YWxQb3J0LnZhbCgnNDU2OScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgLy8gSU5CT1VORDogUHJvdmlkZXIgY29ubmVjdHMgdG8gdXNcbiAgICAgICAgICAgIHZhbFVzZXJOYW1lLnZhbChlbFVuaXFJZC52YWwoKSk7XG4gICAgICAgICAgICB2YWxVc2VyTmFtZS5hdHRyKCdyZWFkb25seScsICcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQXV0by1nZW5lcmF0ZSBwYXNzd29yZCBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb24gaWYgZW1wdHlcbiAgICAgICAgICAgIGlmICh2YWxTZWNyZXQudmFsKCkudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ2VuZXJhdGVQYXNzd29yZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LmhpZGUoKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxSZWNlaXZlQ2FsbHMuc2hvdygpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLnNob3coKTsgLy8gTmV0d29yayBmaWx0ZXIgYXZhaWxhYmxlIGZvciBzZWN1cml0eVxuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBwcm9tcHQgZm9yIGhpZGRlbiBwb3J0IGZpZWxkXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAncG9ydCcpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgICAgICAgICBlbEhvc3QucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFBvcnQucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxTZWNyZXQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBob3N0IHZhbGlkYXRpb24gZXJyb3Igc2luY2UgaXQncyBvcHRpb25hbCBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdyZW1vdmUgcHJvbXB0JywgJ2hvc3QnKTtcbiAgICAgICAgICAgICQoJyNob3N0JykuY2xvc2VzdCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgYWxsIGJ1dHRvbnMgZm9yIGluYm91bmRcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLnNob3coKTtcbiAgICAgICAgICAgIGNvcHlCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgY29weUJ1dHRvbi5hdHRyKCdkYXRhLWNsaXBib2FyZC10ZXh0JywgdmFsU2VjcmV0LnZhbCgpKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGxhYmVscyBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgbGFiZWxIb3N0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9SZW1vdGVIb3N0T3JJUEFkZHJlc3MgfHwgJ1JlbW90ZSBIb3N0L0lQJyk7XG4gICAgICAgICAgICBsYWJlbFVzZXJuYW1lVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9BdXRoZW50aWNhdGlvblVzZXJuYW1lIHx8ICdBdXRoZW50aWNhdGlvbiBVc2VybmFtZScpO1xuICAgICAgICAgICAgbGFiZWxTZWNyZXRUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQgfHwgJ0F1dGhlbnRpY2F0aW9uIFBhc3N3b3JkJyk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ25vbmUnKSB7XG4gICAgICAgICAgICAvLyBOT05FOiBTdGF0aWMgcGVlci10by1wZWVyIGNvbm5lY3Rpb25cbiAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7IFxuICAgICAgICAgICAgZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxSZWNlaXZlQ2FsbHMuc2hvdygpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLnNob3coKTsgLy8gTmV0d29yayBmaWx0ZXIgYXZhaWxhYmxlIGZvciBzZWN1cml0eVxuXG4gICAgICAgICAgICAvLyBTaG93IGluZm9ybWF0aW9uYWwgbWVzc2FnZSBmb3IgcGFzc3dvcmQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuc2hvd1Bhc3N3b3JkSW5mb01lc3NhZ2UoJ2lheCcpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgICAgICAgICBlbEhvc3QuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFBvcnQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxTZWNyZXQucmVtb3ZlQ2xhc3MoJ3JlcXVpcmVkJyk7IC8vIFBhc3N3b3JkIGlzIG9wdGlvbmFsIGluIG5vbmUgbW9kZVxuXG4gICAgICAgICAgICAvLyBIaWRlIGdlbmVyYXRlIGFuZCBjb3B5IGJ1dHRvbnNcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgICAgIGNvcHlCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBub25lIChwZWVyLXRvLXBlZXIpXG4gICAgICAgICAgICBsYWJlbEhvc3RUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1BlZXIgSG9zdC9JUCcpO1xuICAgICAgICAgICAgbGFiZWxQb3J0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUG9ydCB8fCAnUGVlciBQb3J0Jyk7XG4gICAgICAgICAgICBsYWJlbFVzZXJuYW1lVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyVXNlcm5hbWUgfHwgJ1BlZXIgVXNlcm5hbWUnKTtcbiAgICAgICAgICAgIGxhYmVsU2VjcmV0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUGFzc3dvcmQgfHwgJ1BlZXIgUGFzc3dvcmQnKTtcblxuICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgcG9ydCBpZiBlbXB0eVxuICAgICAgICAgICAgaWYgKHZhbFBvcnQudmFsKCkgPT09ICcnIHx8IHZhbFBvcnQudmFsKCkgPT09ICcwJykge1xuICAgICAgICAgICAgICAgIHZhbFBvcnQudmFsKCc0NTY5Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjb25zdCBwcm92aWRlciA9IG5ldyBQcm92aWRlcklBWCgpO1xuICAgIHByb3ZpZGVyLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==