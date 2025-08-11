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

/* global globalRootUrl, globalTranslate, Form, ProviderBase, PasswordScore, TooltipBuilder, i18n */

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
        'registration_type': registrationTypeData,
        'receive_calls_without_auth': receiveCallsData,
        'network_filter': networkFilterData,
        'provider_host': providerHostData,
        'iax_port': portData,
        'manual_attributes': manualAttributesData
      }; // Initialize tooltips using TooltipBuilder

      TooltipBuilder.initialize(tooltipConfigs);
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
     * Initialize network filter dropdown with IAX category
     */

  }, {
    key: "initializeNetworkFilterDropdown",
    value: function initializeNetworkFilterDropdown() {
      var _this2 = this;

      var $field = $('#networkfilterid');
      if ($field.length === 0) return; // Get the dropdown element

      var $dropdown = $field;

      if ($field.is('select')) {
        $dropdown = $field.hasClass('ui') ? $field : $field.closest('.ui.dropdown');

        if ($dropdown.length === 0) {
          $dropdown = $field;
        }
      } // Get current value


      var currentValue = this.getCurrentNetworkFilterValue(); // Use NetworkFiltersAPI to initialize the dropdown with IAX category

      NetworkFiltersAPI.initializeDropdown($dropdown, {
        currentValue: currentValue,
        categories: ['IAX'],
        // Use IAX category instead of SIP
        onChange: function onChange(value) {
          _this2.onNetworkFilterChange(value);

          Form.dataChanged();
        }
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
        copyButton.attr('data-clipboard-text', valSecret.val()); // Restore network filter state if needed

        this.restoreNetworkFilterState(); // Update labels for inbound

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
        // Hide generate and copy buttons

        genPassword.hide();
        copyButton.hide();
        showHideButton.show(); // Restore network filter state if needed

        this.restoreNetworkFilterState(); // Update labels for none (peer-to-peer)

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItaWF4LW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJQcm92aWRlcklBWCIsImluaXRpYWxpemVJYXhXYXJuaW5nTWVzc2FnZSIsImluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZUhhbmRsZXJzIiwic2VsZiIsIiQiLCJjaGVja2JveCIsInJlZ1R5cGUiLCJ2YWwiLCIkZm9ybU9iaiIsImZvcm0iLCIkc2VjcmV0IiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwiaXNDaGVja2VkIiwic2V0VGltZW91dCIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImluaXRpYWxpemVGaWVsZFRvb2x0aXBzIiwiJHdhcm5pbmdNZXNzYWdlIiwibmV4dCIsIiRjaGVja2JveElucHV0IiwidXBkYXRlV2FybmluZ1N0YXRlIiwicHJvcCIsImFkZENsYXNzIiwib25DaGVja2VkIiwidHJhbnNpdGlvbiIsIm9uVW5jaGVja2VkIiwibGVuZ3RoIiwiUGFzc3dvcmRTY29yZSIsIiRwYXNzd29yZFByb2dyZXNzIiwiJHNlY3JldEZpZWxkIiwiYXBwZW5kIiwib24iLCJjaGVja1Bhc3NTdHJlbmd0aCIsInBhc3MiLCJiYXIiLCJzZWN0aW9uIiwiJHBvcnRGaWVsZCIsImZpbmQiLCIkbGFiZWwiLCJzaG93IiwiaGlkZSIsImZpZWxkTmFtZSIsImF0dHIiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsInJlZ2lzdHJhdGlvblR5cGVEYXRhIiwiaGVhZGVyIiwiZ2xvYmFsVHJhbnNsYXRlIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2hlYWRlciIsImxpc3QiLCJ0ZXJtIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX291dGJvdW5kIiwiZGVmaW5pdGlvbiIsImlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX2luYm91bmQiLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZF9kZXNjIiwiaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmUiLCJpYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfbm9uZV9kZXNjIiwicmVjZWl2ZUNhbGxzRGF0YSIsImlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJpYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2Rlc2MiLCJ3YXJuaW5nIiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF93YXJuaW5nX2hlYWRlciIsInRleHQiLCJpYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmciLCJpYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX2FwcGxpY2F0aW9uIiwiaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbl9kZXNjIiwibmV0d29ya0ZpbHRlckRhdGEiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaGVhZGVyIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2Rlc2MiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfaW5ib3VuZCIsImlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kX2Rlc2MiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmQiLCJpYXhfTmV0d29ya0ZpbHRlclRvb2x0aXBfb3V0Ym91bmRfZGVzYyIsImlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lIiwiaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmVfZGVzYyIsInByb3ZpZGVySG9zdERhdGEiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9oZWFkZXIiLCJpYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2lwIiwiaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfZm9ybWF0X2RvbWFpbiIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kX3VzZSIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX25vbmVfdXNlIiwibm90ZSIsImlheF9Qcm92aWRlckhvc3RUb29sdGlwX25vdGUiLCJwb3J0RGF0YSIsImlheF9Qb3J0VG9vbHRpcF9oZWFkZXIiLCJpYXhfUG9ydFRvb2x0aXBfZGVzYyIsImlheF9Qb3J0VG9vbHRpcF9kZWZhdWx0IiwiaWF4X1BvcnRUb29sdGlwX2luZm8iLCJpYXhfUG9ydFRvb2x0aXBfbm90ZSIsIm1hbnVhbEF0dHJpYnV0ZXNEYXRhIiwiaTE4biIsImV4YW1wbGVzSGVhZGVyIiwiZXhhbXBsZXMiLCJ0b29sdGlwQ29uZmlncyIsIlRvb2x0aXBCdWlsZGVyIiwiaW5pdGlhbGl6ZSIsImdldE91dGJvdW5kUnVsZXMiLCJnZXRJbmJvdW5kUnVsZXMiLCJnZXROb25lUnVsZXMiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHkiLCJob3N0IiwicHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHkiLCJ1c2VybmFtZSIsInByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSIsInNlY3JldCIsIm9wdGlvbmFsIiwicG9ydCIsInByX1ZhbGlkYXRpb25Qcm92aWRlclBvcnRJc0VtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydEludmFsaWQiLCJyZWNlaXZlV2l0aG91dEF1dGgiLCJwcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5IiwicHJfVmFsaWRhdGlvblByb3ZpZGVyUGFzc3dvcmRUb29TaG9ydCIsIiRmaWVsZCIsIiRkcm9wZG93biIsImlzIiwiaGFzQ2xhc3MiLCJjdXJyZW50VmFsdWUiLCJnZXRDdXJyZW50TmV0d29ya0ZpbHRlclZhbHVlIiwiTmV0d29ya0ZpbHRlcnNBUEkiLCJpbml0aWFsaXplRHJvcGRvd24iLCJjYXRlZ29yaWVzIiwib25DaGFuZ2UiLCJ2YWx1ZSIsIm9uTmV0d29ya0ZpbHRlckNoYW5nZSIsInZhbGlkYXRpb25Db25maWciLCJpbmxpbmUiLCJrZXlib2FyZFNob3J0Y3V0cyIsImZpZWxkcyIsIm9uU3VjY2VzcyIsImV2ZW50IiwicHJldmVudERlZmF1bHQiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwicHJvdmlkZXJUeXBlIiwidG9Mb3dlckNhc2UiLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsIiRzdWJtaXRCdXR0b24iLCJvZmYiLCJlIiwiY3VycmVudFJ1bGVzIiwic3VibWl0Rm9ybSIsIm9uRmFpbHVyZSIsImVsSG9zdCIsImVsVXNlcm5hbWUiLCJlbFNlY3JldCIsImVsUG9ydCIsImVsUmVjZWl2ZUNhbGxzIiwiZWxOZXR3b3JrRmlsdGVyIiwiZWxVbmlxSWQiLCJnZW5QYXNzd29yZCIsInZhbFVzZXJOYW1lIiwidmFsU2VjcmV0IiwidmFsUG9ydCIsInZhbFF1YWxpZnkiLCJjb3B5QnV0dG9uIiwic2hvd0hpZGVCdXR0b24iLCJsYWJlbEhvc3RUZXh0IiwibGFiZWxQb3J0VGV4dCIsImxhYmVsVXNlcm5hbWVUZXh0IiwibGFiZWxTZWNyZXRUZXh0IiwicmVtb3ZlQXR0ciIsImhpZGVQYXNzd29yZFRvb2x0aXAiLCJwcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyIsInByX1Byb3ZpZGVyUG9ydCIsInByX1Byb3ZpZGVyTG9naW4iLCJwcl9Qcm92aWRlclBhc3N3b3JkIiwidHJpbSIsImdlbmVyYXRlUGFzc3dvcmQiLCJyZXN0b3JlTmV0d29ya0ZpbHRlclN0YXRlIiwicHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIiwicHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSIsInByX0F1dGhlbnRpY2F0aW9uUGFzc3dvcmQiLCJzaG93UGFzc3dvcmRUb29sdGlwIiwicHJfUGVlckhvc3RPcklQQWRkcmVzcyIsInByX1BlZXJQ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MkIsQ0EwQjNCOztBQUNBWixRQUFBQSxhQUFhLENBQUNyRyxJQUFkLENBQW1CakIsZUFBZSxDQUFDdUksc0JBQWhCLElBQTBDLGNBQTdEO0FBQ0FoQixRQUFBQSxhQUFhLENBQUN0RyxJQUFkLENBQW1CakIsZUFBZSxDQUFDd0ksV0FBaEIsSUFBK0IsV0FBbEQ7QUFDQWhCLFFBQUFBLGlCQUFpQixDQUFDdkcsSUFBbEIsQ0FBdUJqQixlQUFlLENBQUN5SSxlQUFoQixJQUFtQyxlQUExRDtBQUNBaEIsUUFBQUEsZUFBZSxDQUFDeEcsSUFBaEIsQ0FBcUJqQixlQUFlLENBQUMwSSxlQUFoQixJQUFtQyxlQUF4RCxFQTlCMkIsQ0FnQzNCOztBQUNBLFlBQUl4QixPQUFPLENBQUMzSixHQUFSLE9BQWtCLEVBQWxCLElBQXdCMkosT0FBTyxDQUFDM0osR0FBUixPQUFrQixHQUE5QyxFQUFtRDtBQUMvQzJKLFVBQUFBLE9BQU8sQ0FBQzNKLEdBQVIsQ0FBWSxNQUFaO0FBQ0g7QUFDSjtBQUNKOzs7O0VBbHFCcUJvTCxZIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUHJvdmlkZXJCYXNlLCBQYXNzd29yZFNjb3JlLCBUb29sdGlwQnVpbGRlciwgaTE4biAqL1xuXG4vKipcbiAqIElBWCBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1cbiAqIEBjbGFzcyBQcm92aWRlcklBWFxuICovXG5jbGFzcyBQcm92aWRlcklBWCBleHRlbmRzIFByb3ZpZGVyQmFzZSB7XG4gICAgY29uc3RydWN0b3IoKSB7IFxuICAgICAgICBzdXBlcignSUFYJyk7IFxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBzdXBlci5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJQVgtc3BlY2lmaWMgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgdGhpcy5pbml0aWFsaXplSWF4V2FybmluZ01lc3NhZ2UoKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUmVhbHRpbWVWYWxpZGF0aW9uKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVIYW5kbGVycygpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmUtdmFsaWRhdGUgZm9ybSB3aGVuIHJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIGNoYW5nZXNcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aC5jaGVja2JveCcpLmNoZWNrYm94KCdzZXR0aW5nJywgJ29uQ2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gR2V0IHJlZ2lzdHJhdGlvbiB0eXBlIHRvIGRldGVybWluZSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgICBjb25zdCByZWdUeXBlID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENsZWFyIGFueSBleGlzdGluZyBlcnJvciBvbiBzZWNyZXQgZmllbGRcbiAgICAgICAgICAgIHNlbGYuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgIHNlbGYuJHNlY3JldC5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIGluYm91bmQgcmVnaXN0cmF0aW9uLCB2YWxpZGF0ZSBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgaWYgKHJlZ1R5cGUgPT09ICdpbmJvdW5kJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc0NoZWNrZWQgJiYgc2VsZi4kc2VjcmV0LnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiB1bmNoZWNrZWQgYW5kIHBhc3N3b3JkIGlzIGVtcHR5LCBzaG93IGVycm9yXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmaWVsZCcsICdzZWNyZXQnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWVsZCBoZWxwIHRvb2x0aXBzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZpZWxkVG9vbHRpcHMoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIElBWCB3YXJuaW5nIG1lc3NhZ2UgaGFuZGxpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplSWF4V2FybmluZ01lc3NhZ2UoKSB7XG4gICAgICAgIGNvbnN0ICR3YXJuaW5nTWVzc2FnZSA9ICQoJyNlbFJlY2VpdmVDYWxscycpLm5leHQoJy53YXJuaW5nLm1lc3NhZ2UnKTtcbiAgICAgICAgY29uc3QgJGNoZWNrYm94SW5wdXQgPSAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZ1bmN0aW9uIHRvIHVwZGF0ZSB3YXJuaW5nIG1lc3NhZ2Ugc3RhdGVcbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlV2FybmluZ1N0YXRlKCkge1xuICAgICAgICAgICAgaWYgKCRjaGVja2JveElucHV0LnByb3AoJ2NoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5hZGRDbGFzcygnaGlkZGVuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2FybmluZyBzdGF0ZVxuICAgICAgICB1cGRhdGVXYXJuaW5nU3RhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBjaGVja2JveCBjaGFuZ2VzXG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGguY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoZWNrZWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICR3YXJuaW5nTWVzc2FnZS5yZW1vdmVDbGFzcygnaGlkZGVuJykudHJhbnNpdGlvbignZmFkZSBpbicpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uVW5jaGVja2VkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAkd2FybmluZ01lc3NhZ2UudHJhbnNpdGlvbignZmFkZSBvdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgJHdhcm5pbmdNZXNzYWdlLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByZWFsLXRpbWUgdmFsaWRhdGlvbiBmZWVkYmFja1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWFsdGltZVZhbGlkYXRpb24oKSB7XG4gICAgICAgIC8vIEVuYWJsZSBpbmxpbmUgdmFsaWRhdGlvbiBmb3IgYmV0dGVyIFVYXG4gICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgnc2V0dGluZycsICdpbmxpbmUnLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBhc3N3b3JkIHN0cmVuZ3RoIGluZGljYXRvclxuICAgICAgICBpZiAodGhpcy4kc2VjcmV0Lmxlbmd0aCA+IDAgJiYgdHlwZW9mIFBhc3N3b3JkU2NvcmUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgcHJvZ3Jlc3MgYmFyIGZvciBwYXNzd29yZCBzdHJlbmd0aCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICBsZXQgJHBhc3N3b3JkUHJvZ3Jlc3MgPSAkKCcjcGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3MnKTtcbiAgICAgICAgICAgIGlmICgkcGFzc3dvcmRQcm9ncmVzcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkc2VjcmV0RmllbGQgPSB0aGlzLiRzZWNyZXQuY2xvc2VzdCgnLmZpZWxkJyk7XG4gICAgICAgICAgICAgICAgJHBhc3N3b3JkUHJvZ3Jlc3MgPSAkKCc8ZGl2IGNsYXNzPVwidWkgdGlueSBwcm9ncmVzc1wiIGlkPVwicGFzc3dvcmQtc3RyZW5ndGgtcHJvZ3Jlc3NcIj48ZGl2IGNsYXNzPVwiYmFyXCI+PC9kaXY+PC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgJHNlY3JldEZpZWxkLmFwcGVuZCgkcGFzc3dvcmRQcm9ncmVzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwYXNzd29yZCBzdHJlbmd0aCBvbiBpbnB1dFxuICAgICAgICAgICAgdGhpcy4kc2VjcmV0Lm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICBQYXNzd29yZFNjb3JlLmNoZWNrUGFzc1N0cmVuZ3RoKHtcbiAgICAgICAgICAgICAgICAgICAgcGFzczogdGhpcy4kc2VjcmV0LnZhbCgpLFxuICAgICAgICAgICAgICAgICAgICBiYXI6ICRwYXNzd29yZFByb2dyZXNzLFxuICAgICAgICAgICAgICAgICAgICBzZWN0aW9uOiAkcGFzc3dvcmRQcm9ncmVzc1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWxwZXIgdGV4dCBmb3IgSUFYLXNwZWNpZmljIGZpZWxkc1xuICAgICAgICBjb25zdCAkcG9ydEZpZWxkID0gJCgnI3BvcnQnKS5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgaWYgKCRwb3J0RmllbGQuZmluZCgnLnVpLnBvaW50aW5nLmxhYmVsJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAkcG9ydEZpZWxkLmFwcGVuZCgnPGRpdiBjbGFzcz1cInVpIHBvaW50aW5nIGxhYmVsXCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPkRlZmF1bHQgSUFYIHBvcnQgaXMgNDU2OTwvZGl2PicpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IHBvcnQgaGVscGVyIG9uIGZvY3VzXG4gICAgICAgICQoJyNwb3J0Jykub24oJ2ZvY3VzJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKHRoaXMpLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoJy51aS5wb2ludGluZy5sYWJlbCcpO1xuICAgICAgICAgICAgaWYgKCQodGhpcykudmFsKCkgPT09ICcnIHx8ICQodGhpcykudmFsKCkgPT09ICc0NTY5Jykge1xuICAgICAgICAgICAgICAgICRsYWJlbC5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLm9uKCdibHVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoJy51aS5wb2ludGluZy5sYWJlbCcpLmhpZGUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBWYWxpZGF0ZSBvbiBibHVyIGZvciBpbW1lZGlhdGUgZmVlZGJhY2tcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnaW5wdXRbdHlwZT1cInRleHRcIl0sIGlucHV0W3R5cGU9XCJwYXNzd29yZFwiXScpLm9uKCdibHVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkKHRoaXMpLmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGNvbnN0IHZhbGlkYXRlUnVsZXMgPSBzZWxmLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgIGlmIChmaWVsZE5hbWUgJiYgdmFsaWRhdGVSdWxlc1tmaWVsZE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgc2VsZi4kZm9ybU9iai5mb3JtKCd2YWxpZGF0ZSBmaWVsZCcsIGZpZWxkTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmllbGQgaGVscCB0b29sdGlwc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWVsZFRvb2x0aXBzKCkgeyBcbiAgICAgICAgLy8gQnVpbGQgdG9vbHRpcCBkYXRhIHN0cnVjdHVyZXNcbiAgICAgICAgY29uc3QgcmVnaXN0cmF0aW9uVHlwZURhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9vdXRib3VuZF9kZXNjXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVnaXN0cmF0aW9uVHlwZVRvb2x0aXBfaW5ib3VuZCxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9pbmJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWdpc3RyYXRpb25UeXBlVG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlZ2lzdHJhdGlvblR5cGVUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCByZWNlaXZlQ2FsbHNEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUmVjZWl2ZUNhbGxzV2l0aG91dEF1dGhUb29sdGlwX3dhcm5pbmdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1JlY2VpdmVDYWxsc1dpdGhvdXRBdXRoVG9vbHRpcF9hcHBsaWNhdGlvbixcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9SZWNlaXZlQ2FsbHNXaXRob3V0QXV0aFRvb2x0aXBfYXBwbGljYXRpb25fZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBuZXR3b3JrRmlsdGVyRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9pbmJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX2luYm91bmRfZGVzY1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX291dGJvdW5kX2Rlc2NcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmlheF9OZXR3b3JrRmlsdGVyVG9vbHRpcF9ub25lLFxuICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X05ldHdvcmtGaWx0ZXJUb29sdGlwX25vbmVfZGVzY1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBwcm92aWRlckhvc3REYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUHJvdmlkZXJIb3N0VG9vbHRpcF9mb3JtYXRfaXAsXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX2Zvcm1hdF9kb21haW4sXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qcm92aWRlckhvc3RUb29sdGlwX291dGJvdW5kX3VzZSxcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfbm9uZV91c2VcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1Byb3ZpZGVySG9zdFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHBvcnREYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaWF4X1BvcnRUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmlheF9Qb3J0VG9vbHRpcF9kZWZhdWx0LFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pYXhfUG9ydFRvb2x0aXBfaW5mb1xuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pYXhfUG9ydFRvb2x0aXBfbm90ZVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG1hbnVhbEF0dHJpYnV0ZXNEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBpMThuKCdpYXhfTWFudWFsQXR0cmlidXRlc1Rvb2x0aXBfaGVhZGVyJyksXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2Rlc2MnKSxcbiAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRlcm06IGkxOG4oJ2lheF9NYW51YWxBdHRyaWJ1dGVzVG9vbHRpcF9mb3JtYXQnKSxcbiAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX2V4YW1wbGVzX2hlYWRlcicpLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnbGFuZ3VhZ2UgPSBydScsXG4gICAgICAgICAgICAgICAgJ2NvZGVjcHJpb3JpdHkgPSBob3N0JyxcbiAgICAgICAgICAgICAgICAndHJ1bmt0aW1lc3RhbXBzID0geWVzJyxcbiAgICAgICAgICAgICAgICAndHJ1bmsgPSB5ZXMnXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmdfaGVhZGVyJyksXG4gICAgICAgICAgICAgICAgdGV4dDogaTE4bignaWF4X01hbnVhbEF0dHJpYnV0ZXNUb29sdGlwX3dhcm5pbmcnKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgJ3JlZ2lzdHJhdGlvbl90eXBlJzogcmVnaXN0cmF0aW9uVHlwZURhdGEsXG4gICAgICAgICAgICAncmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnOiByZWNlaXZlQ2FsbHNEYXRhLFxuICAgICAgICAgICAgJ25ldHdvcmtfZmlsdGVyJzogbmV0d29ya0ZpbHRlckRhdGEsXG4gICAgICAgICAgICAncHJvdmlkZXJfaG9zdCc6IHByb3ZpZGVySG9zdERhdGEsXG4gICAgICAgICAgICAnaWF4X3BvcnQnOiBwb3J0RGF0YSxcbiAgICAgICAgICAgICdtYW51YWxfYXR0cmlidXRlcyc6IG1hbnVhbEF0dHJpYnV0ZXNEYXRhXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIHVzaW5nIFRvb2x0aXBCdWlsZGVyXG4gICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICogQHJldHVybnMge29iamVjdH0gVmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGdldFZhbGlkYXRlUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlZ1R5cGUgPSAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoKTtcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAocmVnVHlwZSkge1xuICAgICAgICAgICAgY2FzZSAnb3V0Ym91bmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgICAgIGNhc2UgJ2luYm91bmQnOlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldEluYm91bmRSdWxlcygpO1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0Tm9uZVJ1bGVzKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE91dGJvdW5kUnVsZXMoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGZvciBvdXRib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRPdXRib3VuZFJ1bGVzKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhvc3Q6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnaG9zdCcsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcm5hbWU6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAndXNlcm5hbWUnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJMb2dpbklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZWNyZXQ6IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiAnc2VjcmV0JyxcbiAgICAgICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBydWxlczogW10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3IgaW5ib3VuZCByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXRJbmJvdW5kUnVsZXMoKSB7XG4gICAgICAgIGNvbnN0IHJlY2VpdmVXaXRob3V0QXV0aCA9ICQoJyNyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBydWxlcyA9IHtcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBTZWNyZXQgaXMgb3B0aW9uYWwgaWYgcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggaXMgY2hlY2tlZFxuICAgICAgICBpZiAoIXJlY2VpdmVXaXRob3V0QXV0aCkge1xuICAgICAgICAgICAgcnVsZXMuc2VjcmV0ID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWluTGVuZ3RoWzhdJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlclBhc3N3b3JkVG9vU2hvcnQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBydWxlcy5zZWNyZXQgPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogJ3NlY3JldCcsXG4gICAgICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBydWxlcztcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBmb3Igbm9uZSByZWdpc3RyYXRpb25cbiAgICAgKi9cbiAgICBnZXROb25lUnVsZXMoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlck5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaG9zdDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdob3N0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVySG9zdElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VybmFtZToge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICd1c2VybmFtZScsXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnByX1ZhbGlkYXRpb25Qcm92aWRlckxvZ2luSXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlY3JldDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzZWNyZXQnLFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQYXNzd29yZEVtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcG9ydDoge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwb3J0JyxcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUucHJfVmFsaWRhdGlvblByb3ZpZGVyUG9ydElzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzEuLjY1NTM1XScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5wcl9WYWxpZGF0aW9uUHJvdmlkZXJQb3J0SW52YWxpZCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGNoYW5nZSBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlSGFuZGxlcnMoKSB7XG4gICAgICAgIC8vIFJlZ2lzdHJhdGlvbiB0eXBlIGhhbmRsZXIgaXMgbm93IGluIGJhc2UgY2xhc3NcbiAgICAgICAgLy8gVGhpcyBtZXRob2QgaXMga2VwdCBmb3IgY29tcGF0aWJpbGl0eVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIHdpdGggSUFYIGNhdGVnb3J5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI25ldHdvcmtmaWx0ZXJpZCcpO1xuICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gR2V0IHRoZSBkcm9wZG93biBlbGVtZW50XG4gICAgICAgIGxldCAkZHJvcGRvd24gPSAkZmllbGQ7XG4gICAgICAgIGlmICgkZmllbGQuaXMoJ3NlbGVjdCcpKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24gPSAkZmllbGQuaGFzQ2xhc3MoJ3VpJykgPyAkZmllbGQgOiAkZmllbGQuY2xvc2VzdCgnLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICRkcm9wZG93biA9ICRmaWVsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWVcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gdGhpcy5nZXRDdXJyZW50TmV0d29ya0ZpbHRlclZhbHVlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgTmV0d29ya0ZpbHRlcnNBUEkgdG8gaW5pdGlhbGl6ZSB0aGUgZHJvcGRvd24gd2l0aCBJQVggY2F0ZWdvcnlcbiAgICAgICAgTmV0d29ya0ZpbHRlcnNBUEkuaW5pdGlhbGl6ZURyb3Bkb3duKCRkcm9wZG93biwge1xuICAgICAgICAgICAgY3VycmVudFZhbHVlOiBjdXJyZW50VmFsdWUsXG4gICAgICAgICAgICBjYXRlZ29yaWVzOiBbJ0lBWCddLCAvLyBVc2UgSUFYIGNhdGVnb3J5IGluc3RlYWQgb2YgU0lQXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5vbk5ldHdvcmtGaWx0ZXJDaGFuZ2UodmFsdWUpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogT3ZlcnJpZGUgcGFyZW50J3MgaW5pdGlhbGl6ZUZvcm0gdG8gaGFuZGxlIGR5bmFtaWMgdmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgaW5pdGlhbCB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIGNvbnN0IHZhbGlkYXRpb25Db25maWcgPSB7XG4gICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgaW5saW5lOiB0cnVlLFxuICAgICAgICAgICAga2V5Ym9hcmRTaG9ydGN1dHM6IGZhbHNlLFxuICAgICAgICAgICAgZmllbGRzOiB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKSxcbiAgICAgICAgICAgIG9uU3VjY2VzczogZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBQcmV2ZW50IGF1dG8tc3VibWl0LCBvbmx5IHN1Ym1pdCB2aWEgYnV0dG9uIGNsaWNrXG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB3aXRoIHZhbGlkYXRpb25cbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKHZhbGlkYXRpb25Db25maWcpO1xuICAgICAgICBcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9zYXZlLyR7dGhpcy5wcm92aWRlclR5cGUudG9Mb3dlckNhc2UoKX1gO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGhpcy5jYkJlZm9yZVNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gdGhpcy5jYkFmdGVyU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBPdmVycmlkZSBGb3JtJ3Mgc3VibWl0IGJ1dHRvbiBoYW5kbGVyIHRvIHVzZSBkeW5hbWljIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLm9mZignY2xpY2snKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKEZvcm0uJHN1Ym1pdEJ1dHRvbi5oYXNDbGFzcygnbG9hZGluZycpKSByZXR1cm47XG4gICAgICAgICAgICBpZiAoRm9ybS4kc3VibWl0QnV0dG9uLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSByZXR1cm47XG5cbiAgICAgICAgICAgIC8vIEdldCBjdXJyZW50IHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gZm9ybSBzdGF0ZVxuICAgICAgICAgICAgY29uc3QgY3VycmVudFJ1bGVzID0gc2VsZi5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCB1cCBmb3JtIHZhbGlkYXRpb24gd2l0aCBjdXJyZW50IHJ1bGVzIGFuZCBzdWJtaXRcbiAgICAgICAgICAgIEZvcm0uJGZvcm1PYmpcbiAgICAgICAgICAgICAgICAuZm9ybSh7XG4gICAgICAgICAgICAgICAgICAgIG9uOiAnYmx1cicsXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkczogY3VycmVudFJ1bGVzLFxuICAgICAgICAgICAgICAgICAgICBvblN1Y2Nlc3MoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDYWxsIHN1Ym1pdEZvcm0oKSBvbiBzdWNjZXNzZnVsIHZhbGlkYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uc3VibWl0Rm9ybSgpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZXJyb3IgY2xhc3MgdG8gZm9ybSBvbiB2YWxpZGF0aW9uIGZhaWx1cmVcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2Vycm9yJykuYWRkQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3ZhbGlkYXRlIGZvcm0nKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHRoZSByZWdpc3RyYXRpb24gdHlwZVxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gR2V0IGVsZW1lbnQgcmVmZXJlbmNlc1xuICAgICAgICBjb25zdCBlbEhvc3QgPSAkKCcjZWxIb3N0Jyk7XG4gICAgICAgIGNvbnN0IGVsVXNlcm5hbWUgPSAkKCcjZWxVc2VybmFtZScpO1xuICAgICAgICBjb25zdCBlbFNlY3JldCA9ICQoJyNlbFNlY3JldCcpO1xuICAgICAgICBjb25zdCBlbFBvcnQgPSAkKCcjZWxQb3J0Jyk7XG4gICAgICAgIGNvbnN0IGVsUmVjZWl2ZUNhbGxzID0gJCgnI2VsUmVjZWl2ZUNhbGxzJyk7XG4gICAgICAgIGNvbnN0IGVsTmV0d29ya0ZpbHRlciA9ICQoJyNlbE5ldHdvcmtGaWx0ZXInKTtcbiAgICAgICAgY29uc3QgcmVnVHlwZSA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbCgpO1xuICAgICAgICBjb25zdCBlbFVuaXFJZCA9ICQoJyN1bmlxaWQnKTtcbiAgICAgICAgY29uc3QgZ2VuUGFzc3dvcmQgPSAkKCcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJyk7XG5cbiAgICAgICAgY29uc3QgdmFsVXNlck5hbWUgPSAkKCcjdXNlcm5hbWUnKTtcbiAgICAgICAgY29uc3QgdmFsU2VjcmV0ID0gdGhpcy4kc2VjcmV0O1xuICAgICAgICBjb25zdCB2YWxQb3J0ID0gJCgnI3BvcnQnKTtcbiAgICAgICAgY29uc3QgdmFsUXVhbGlmeSA9ICQoJyNxdWFsaWZ5Jyk7XG4gICAgICAgIGNvbnN0IGNvcHlCdXR0b24gPSAkKCcjZWxTZWNyZXQgLmJ1dHRvbi5jbGlwYm9hcmQnKTtcbiAgICAgICAgY29uc3Qgc2hvd0hpZGVCdXR0b24gPSAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJyk7XG5cbiAgICAgICAgLy8gR2V0IGxhYmVsIHRleHQgZWxlbWVudHNcbiAgICAgICAgY29uc3QgbGFiZWxIb3N0VGV4dCA9ICQoJyNob3N0TGFiZWxUZXh0Jyk7XG4gICAgICAgIGNvbnN0IGxhYmVsUG9ydFRleHQgPSAkKCcjcG9ydExhYmVsVGV4dCcpO1xuICAgICAgICBjb25zdCBsYWJlbFVzZXJuYW1lVGV4dCA9ICQoJyN1c2VybmFtZUxhYmVsVGV4dCcpO1xuICAgICAgICBjb25zdCBsYWJlbFNlY3JldFRleHQgPSAkKCcjc2VjcmV0TGFiZWxUZXh0Jyk7XG5cbiAgICAgICAgLy8gQWx3YXlzIGVuYWJsZSBxdWFsaWZ5IGZvciBJQVggKE5BVCBrZWVwYWxpdmUpXG4gICAgICAgIGlmICh2YWxRdWFsaWZ5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhbFF1YWxpZnkucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICAgICAgdmFsUXVhbGlmeS52YWwoJzEnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhbFVzZXJOYW1lLnJlbW92ZUF0dHIoJ3JlYWRvbmx5Jyk7XG5cbiAgICAgICAgLy8gSGlkZSBwYXNzd29yZCB0b29sdGlwIGJ5IGRlZmF1bHRcbiAgICAgICAgdGhpcy5oaWRlUGFzc3dvcmRUb29sdGlwKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGVsZW1lbnQgdmlzaWJpbGl0eSBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICBpZiAocmVnVHlwZSA9PT0gJ291dGJvdW5kJykge1xuICAgICAgICAgICAgLy8gT1VUQk9VTkQ6IFdlIHJlZ2lzdGVyIHRvIHByb3ZpZGVyXG4gICAgICAgICAgICBlbEhvc3Quc2hvdygpO1xuICAgICAgICAgICAgZWxQb3J0LnNob3coKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuc2hvdygpO1xuICAgICAgICAgICAgZWxTZWNyZXQuc2hvdygpO1xuICAgICAgICAgICAgZWxSZWNlaXZlQ2FsbHMuaGlkZSgpO1xuICAgICAgICAgICAgZWxOZXR3b3JrRmlsdGVyLmhpZGUoKTsgLy8gTmV0d29yayBmaWx0ZXIgbm90IHJlbGV2YW50IGZvciBvdXRib3VuZFxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVxdWlyZWQgZmllbGRzXG4gICAgICAgICAgICBlbEhvc3QuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFBvcnQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxTZWNyZXQuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgZ2VuZXJhdGUgYW5kIGNvcHkgYnV0dG9ucyBmb3Igb3V0Ym91bmRcbiAgICAgICAgICAgIGdlblBhc3N3b3JkLmhpZGUoKTtcbiAgICAgICAgICAgIGNvcHlCdXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgc2hvd0hpZGVCdXR0b24uc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBvdXRib3VuZFxuICAgICAgICAgICAgbGFiZWxIb3N0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlckhvc3RPcklQQWRkcmVzcyB8fCAnUHJvdmlkZXIgSG9zdC9JUCcpO1xuICAgICAgICAgICAgbGFiZWxQb3J0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9Qcm92aWRlclBvcnQgfHwgJ1Byb3ZpZGVyIFBvcnQnKTtcbiAgICAgICAgICAgIGxhYmVsVXNlcm5hbWVUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1Byb3ZpZGVyTG9naW4gfHwgJ0xvZ2luJyk7XG4gICAgICAgICAgICBsYWJlbFNlY3JldFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUHJvdmlkZXJQYXNzd29yZCB8fCAnUGFzc3dvcmQnKTtcblxuICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgcG9ydCBpZiBlbXB0eVxuICAgICAgICAgICAgaWYgKHZhbFBvcnQudmFsKCkgPT09ICcnIHx8IHZhbFBvcnQudmFsKCkgPT09ICcwJykge1xuICAgICAgICAgICAgICAgIHZhbFBvcnQudmFsKCc0NTY5Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocmVnVHlwZSA9PT0gJ2luYm91bmQnKSB7XG4gICAgICAgICAgICAvLyBJTkJPVU5EOiBQcm92aWRlciBjb25uZWN0cyB0byB1c1xuICAgICAgICAgICAgdmFsVXNlck5hbWUudmFsKGVsVW5pcUlkLnZhbCgpKTtcbiAgICAgICAgICAgIHZhbFVzZXJOYW1lLmF0dHIoJ3JlYWRvbmx5JywgJycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBdXRvLWdlbmVyYXRlIHBhc3N3b3JkIGZvciBpbmJvdW5kIHJlZ2lzdHJhdGlvbiBpZiBlbXB0eVxuICAgICAgICAgICAgaWYgKHZhbFNlY3JldC52YWwoKS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5nZW5lcmF0ZVBhc3N3b3JkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGVsSG9zdC5zaG93KCk7XG4gICAgICAgICAgICBlbFBvcnQuaGlkZSgpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5zaG93KCk7XG4gICAgICAgICAgICBlbFNlY3JldC5zaG93KCk7XG4gICAgICAgICAgICBlbFJlY2VpdmVDYWxscy5zaG93KCk7XG4gICAgICAgICAgICBlbE5ldHdvcmtGaWx0ZXIuc2hvdygpOyAvLyBOZXR3b3JrIGZpbHRlciBhdmFpbGFibGUgZm9yIHNlY3VyaXR5XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB2YWxpZGF0aW9uIHByb21wdCBmb3IgaGlkZGVuIHBvcnQgZmllbGRcbiAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgncmVtb3ZlIHByb21wdCcsICdwb3J0Jyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZXF1aXJlZCBmaWVsZHNcbiAgICAgICAgICAgIGVsSG9zdC5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsUG9ydC5yZW1vdmVDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsVXNlcm5hbWUuYWRkQ2xhc3MoJ3JlcXVpcmVkJyk7XG4gICAgICAgICAgICBlbFNlY3JldC5hZGRDbGFzcygncmVxdWlyZWQnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGhvc3QgdmFsaWRhdGlvbiBlcnJvciBzaW5jZSBpdCdzIG9wdGlvbmFsIGZvciBpbmJvdW5kXG4gICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3JlbW92ZSBwcm9tcHQnLCAnaG9zdCcpO1xuICAgICAgICAgICAgJCgnI2hvc3QnKS5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBhbGwgYnV0dG9ucyBmb3IgaW5ib3VuZFxuICAgICAgICAgICAgZ2VuUGFzc3dvcmQuc2hvdygpO1xuICAgICAgICAgICAgY29weUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICBzaG93SGlkZUJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICBjb3B5QnV0dG9uLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCB2YWxTZWNyZXQudmFsKCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZXN0b3JlIG5ldHdvcmsgZmlsdGVyIHN0YXRlIGlmIG5lZWRlZFxuICAgICAgICAgICAgdGhpcy5yZXN0b3JlTmV0d29ya0ZpbHRlclN0YXRlKCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBsYWJlbHMgZm9yIGluYm91bmRcbiAgICAgICAgICAgIGxhYmVsSG9zdFRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfUmVtb3RlSG9zdE9ySVBBZGRyZXNzIHx8ICdSZW1vdGUgSG9zdC9JUCcpO1xuICAgICAgICAgICAgbGFiZWxVc2VybmFtZVRleHQudGV4dChnbG9iYWxUcmFuc2xhdGUucHJfQXV0aGVudGljYXRpb25Vc2VybmFtZSB8fCAnQXV0aGVudGljYXRpb24gVXNlcm5hbWUnKTtcbiAgICAgICAgICAgIGxhYmVsU2VjcmV0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9BdXRoZW50aWNhdGlvblBhc3N3b3JkIHx8ICdBdXRoZW50aWNhdGlvbiBQYXNzd29yZCcpO1xuICAgICAgICB9IGVsc2UgaWYgKHJlZ1R5cGUgPT09ICdub25lJykge1xuICAgICAgICAgICAgLy8gTk9ORTogU3RhdGljIHBlZXItdG8tcGVlciBjb25uZWN0aW9uXG4gICAgICAgICAgICBlbEhvc3Quc2hvdygpOyBcbiAgICAgICAgICAgIGVsUG9ydC5zaG93KCk7XG4gICAgICAgICAgICBlbFVzZXJuYW1lLnNob3coKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnNob3coKTtcbiAgICAgICAgICAgIGVsUmVjZWl2ZUNhbGxzLnNob3coKTtcbiAgICAgICAgICAgIGVsTmV0d29ya0ZpbHRlci5zaG93KCk7IC8vIE5ldHdvcmsgZmlsdGVyIGF2YWlsYWJsZSBmb3Igc2VjdXJpdHlcblxuICAgICAgICAgICAgLy8gU2hvdyB0b29sdGlwIGljb24gZm9yIHBhc3N3b3JkIGZpZWxkXG4gICAgICAgICAgICB0aGlzLnNob3dQYXNzd29yZFRvb2x0aXAoKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHJlcXVpcmVkIGZpZWxkc1xuICAgICAgICAgICAgZWxIb3N0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxQb3J0LmFkZENsYXNzKCdyZXF1aXJlZCcpO1xuICAgICAgICAgICAgZWxVc2VybmFtZS5hZGRDbGFzcygncmVxdWlyZWQnKTtcbiAgICAgICAgICAgIGVsU2VjcmV0LnJlbW92ZUNsYXNzKCdyZXF1aXJlZCcpOyAvLyBQYXNzd29yZCBpcyBvcHRpb25hbCBpbiBub25lIG1vZGVcblxuICAgICAgICAgICAgLy8gSGlkZSBnZW5lcmF0ZSBhbmQgY29weSBidXR0b25zXG4gICAgICAgICAgICBnZW5QYXNzd29yZC5oaWRlKCk7XG4gICAgICAgICAgICBjb3B5QnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIHNob3dIaWRlQnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVzdG9yZSBuZXR3b3JrIGZpbHRlciBzdGF0ZSBpZiBuZWVkZWRcbiAgICAgICAgICAgIHRoaXMucmVzdG9yZU5ldHdvcmtGaWx0ZXJTdGF0ZSgpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgbGFiZWxzIGZvciBub25lIChwZWVyLXRvLXBlZXIpXG4gICAgICAgICAgICBsYWJlbEhvc3RUZXh0LnRleHQoZ2xvYmFsVHJhbnNsYXRlLnByX1BlZXJIb3N0T3JJUEFkZHJlc3MgfHwgJ1BlZXIgSG9zdC9JUCcpO1xuICAgICAgICAgICAgbGFiZWxQb3J0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUG9ydCB8fCAnUGVlciBQb3J0Jyk7XG4gICAgICAgICAgICBsYWJlbFVzZXJuYW1lVGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyVXNlcm5hbWUgfHwgJ1BlZXIgVXNlcm5hbWUnKTtcbiAgICAgICAgICAgIGxhYmVsU2VjcmV0VGV4dC50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5wcl9QZWVyUGFzc3dvcmQgfHwgJ1BlZXIgUGFzc3dvcmQnKTtcblxuICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgcG9ydCBpZiBlbXB0eVxuICAgICAgICAgICAgaWYgKHZhbFBvcnQudmFsKCkgPT09ICcnIHx8IHZhbFBvcnQudmFsKCkgPT09ICcwJykge1xuICAgICAgICAgICAgICAgIHZhbFBvcnQudmFsKCc0NTY5Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59Il19