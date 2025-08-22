"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, NetworkFiltersAPI, TooltipBuilder, PasswordScore, i18n, ProvidersAPI, providerPasswordValidator */

/**
 * Base class for provider management forms
 * @class ProviderBase
 */
var ProviderBase = /*#__PURE__*/function () {
  // Class constants for selectors
  // Class constants for values

  /**
   * Constructor
   * @param {string} providerType - Type of provider (SIP or IAX)
   */
  function ProviderBase(providerType) {
    _classCallCheck(this, ProviderBase);

    this.providerType = providerType; // Cache jQuery objects

    this.$formObj = $(ProviderBase.SELECTORS.FORM);
    this.$secret = $(ProviderBase.SELECTORS.SECRET);
    this.$checkBoxes = $(ProviderBase.SELECTORS.CHECKBOXES);
    this.$accordions = $(ProviderBase.SELECTORS.ACCORDIONS);
    this.$dropDowns = $(ProviderBase.SELECTORS.DROPDOWNS);
    this.$description = $(ProviderBase.SELECTORS.DESCRIPTION);
    this.$networkFilterId = $(ProviderBase.SELECTORS.NETWORK_FILTER_ID);
    this.$showHidePassword = $(ProviderBase.SELECTORS.SHOW_HIDE_PASSWORD);
    this.$generatePassword = $(ProviderBase.SELECTORS.GENERATE_PASSWORD);
    this.$passwordTooltipIcon = $(ProviderBase.SELECTORS.PASSWORD_TOOLTIP_ICON);
    this.$clipboard = $(ProviderBase.SELECTORS.CLIPBOARD);
    this.$popuped = $(ProviderBase.SELECTORS.POPUPED); // Track if this is a new provider (not existing in database)

    this.isNewProvider = false; // Host input validation regex

    this.hostInputValidation = new RegExp('^(((\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}' + '(\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])' + '(\\/(\d|[1-2]\d|3[0-2]))?' + '|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+)$', 'gm');
  }
  /**
   * Initialize the provider form
   */


  _createClass(ProviderBase, [{
    key: "initialize",
    value: function initialize() {
      var _this = this;

      var providerId = $('#id').val() || '';
      var currentDescription = this.$description.val() || ''; // Determine if this is a new provider
      // New providers have empty ID or 'new' as ID in the URL

      this.isNewProvider = !providerId || providerId === '' || providerId === 'new'; // Update header immediately for better UX

      this.updatePageHeader(currentDescription); // Show loading state

      this.showLoadingState(); // Load provider data from REST API

      ProvidersAPI.getRecord(providerId, this.providerType, function (response) {
        _this.hideLoadingState();

        if (response.result && response.data) {
          _this.populateFormData(response.data);
        } else if (providerId && providerId !== 'new') {
          UserMessage.showMultiString(response.messages);
        } // Continue with initialization


        _this.initializeUIComponents();

        _this.initializeEventHandlers();

        _this.initializeForm();

        _this.updateVisibilityElements(); // Initialize tooltip popups and clipboard


        _this.$popuped.popup();

        _this.initializeClipboard(); // Prevent browser password manager for generated passwords


        _this.$secret.on('focus', function () {
          _this.$secret.attr('autocomplete', 'new-password');
        });
      });
    }
    /**
     * Initialize UI components
     */

  }, {
    key: "initializeUIComponents",
    value: function initializeUIComponents() {
      this.$checkBoxes.checkbox();
      this.$dropDowns.dropdown();
      this.initializeAccordion(); // Initialize dynamic dropdowns

      this.initializeRegistrationTypeDropdown(); // Initialize network filter dropdown

      this.initializeNetworkFilterDropdown();
    }
    /**
     * Initialize registration type dropdown dynamically
     */

  }, {
    key: "initializeRegistrationTypeDropdown",
    value: function initializeRegistrationTypeDropdown() {
      var _this2 = this,
          _options$find;

      var $field = $('#registration_type');
      if ($field.length === 0) return; // Check if already inside a dropdown structure

      var $existingDropdown = $field.closest('.ui.dropdown');

      if ($existingDropdown.length > 0) {
        // Already a dropdown, just ensure it's initialized
        if (!$existingDropdown.hasClass('registration-type-dropdown')) {
          $existingDropdown.addClass('registration-type-dropdown');
        }

        $existingDropdown.dropdown({
          onChange: function onChange(value) {
            _this2.updateVisibilityElements(); // Clear validation errors


            _this2.$formObj.find('.field').removeClass('error');

            _this2.$formObj.find('.ui.error.message').remove();

            _this2.$formObj.find('.prompt').remove(); // Update validation rules


            Form.validateRules = _this2.getValidateRules();
            Form.dataChanged();
          }
        });
        return;
      }

      var currentValue = $field.val() || ProviderBase.DEFAULTS.REGISTRATION_TYPE;
      var isIAX = this.providerType === 'IAX'; // Build options based on provider type

      var options = [{
        value: 'outbound',
        text: globalTranslate[isIAX ? 'iax_REG_TYPE_OUTBOUND' : 'sip_REG_TYPE_OUTBOUND'] || 'Outbound'
      }, {
        value: 'inbound',
        text: globalTranslate[isIAX ? 'iax_REG_TYPE_INBOUND' : 'sip_REG_TYPE_INBOUND'] || 'Inbound'
      }, {
        value: 'none',
        text: globalTranslate[isIAX ? 'iax_REG_TYPE_NONE' : 'sip_REG_TYPE_NONE'] || 'None'
      }]; // Create dropdown HTML

      var dropdownHtml = "\n            <div class=\"ui selection dropdown registration-type-dropdown\">\n                <input type=\"hidden\" name=\"registration_type\" id=\"registration_type\" value=\"".concat(currentValue, "\">\n                <i class=\"dropdown icon\"></i>\n                <div class=\"default text\">").concat(((_options$find = options.find(function (o) {
        return o.value === currentValue;
      })) === null || _options$find === void 0 ? void 0 : _options$find.text) || currentValue, "</div>\n                <div class=\"menu\">\n                    ").concat(options.map(function (opt) {
        return "<div class=\"item\" data-value=\"".concat(opt.value, "\">").concat(opt.text, "</div>");
      }).join(''), "\n                </div>\n            </div>\n        "); // Replace the field

      $field.replaceWith(dropdownHtml); // Initialize dropdown

      $('.registration-type-dropdown').dropdown({
        onChange: function onChange(value) {
          _this2.updateVisibilityElements(); // Clear validation errors


          _this2.$formObj.find('.field').removeClass('error');

          _this2.$formObj.find('.ui.error.message').remove();

          _this2.$formObj.find('.prompt').remove(); // Update validation rules


          Form.validateRules = _this2.getValidateRules();
          Form.dataChanged();
        }
      });
    }
    /**
     * Initialize accordion with callbacks
     */

  }, {
    key: "initializeAccordion",
    value: function initializeAccordion() {
      var self = this;
      this.$accordions.accordion({
        onOpen: function onOpen() {
          // Update field visibility when accordion opens
          setTimeout(function () {
            if (typeof self.updateVisibilityElements === 'function') {
              self.updateVisibilityElements();
            }
          }, 50);
        }
      });
    }
    /**
     * Initialize network filter dropdown with simplified logic
     */

  }, {
    key: "initializeNetworkFilterDropdown",
    value: function initializeNetworkFilterDropdown() {
      if (this.$networkFilterId.length === 0) return; // Get current value from data attribute (set by populateFormData) or form value or default

      var currentValue = this.$networkFilterId.data('value') || this.$networkFilterId.val() || ProviderBase.DEFAULTS.NETWORK_FILTER; // Initialize with NetworkFiltersAPI using simplified approach

      NetworkFiltersAPI.initializeDropdown(this.$networkFilterId, {
        currentValue: currentValue,
        providerType: this.providerType,
        onChange: function onChange() {
          return Form.dataChanged();
        }
      });
    }
    /**
     * Initialize event handlers
     */

  }, {
    key: "initializeEventHandlers",
    value: function initializeEventHandlers() {
      var _this3 = this;

      var self = this; // Update header when provider name changes

      this.$description.on('input', function () {
        self.updatePageHeader($(this).val());
      }); // Initialize password strength indicator

      this.initializePasswordStrengthIndicator(); // Show/hide password toggle

      this.$showHidePassword.on('click', function (e) {
        e.preventDefault();
        var $button = $(e.currentTarget);
        var $icon = $button.find('i');

        if (_this3.$secret.attr('type') === 'password') {
          // Show password
          $icon.removeClass('eye').addClass('eye slash');

          _this3.$secret.attr('type', 'text');
        } else {
          // Hide password
          $icon.removeClass('eye slash').addClass('eye');

          _this3.$secret.attr('type', 'password');
        }
      }); // Generate new password

      this.$generatePassword.on('click', function (e) {
        e.preventDefault();

        _this3.generatePassword();
      });
    }
    /**
     * Initialize clipboard functionality
     */

  }, {
    key: "initializeClipboard",
    value: function initializeClipboard() {
      var clipboard = new ClipboardJS(ProviderBase.SELECTORS.CLIPBOARD);
      this.$clipboard.popup({
        on: 'manual'
      });
      clipboard.on('success', function (e) {
        $(e.trigger).popup('show');
        setTimeout(function () {
          $(e.trigger).popup('hide');
        }, 1500);
        e.clearSelection();
      });
      clipboard.on('error', function (e) {
        UserMessage.showError(globalTranslate.pr_ErrorOnProviderSave);
      });
    }
    /**
     * Generate a new password
     */

  }, {
    key: "generatePassword",
    value: function generatePassword() {
      var _this4 = this;

      PbxApi.PasswordGenerate(ProviderBase.DEFAULTS.PASSWORD_LENGTH, function (password) {
        if (password) {
          _this4.$secret.val(password);

          _this4.$secret.trigger('change');

          Form.dataChanged();

          _this4.$clipboard.attr('data-clipboard-text', password); // Update password strength indicator


          var $passwordProgress = $('#password-strength-progress');

          if ($passwordProgress.length > 0 && typeof PasswordScore !== 'undefined') {
            PasswordScore.checkPassStrength({
              pass: password,
              bar: $passwordProgress,
              section: $passwordProgress
            });
          }
        }
      });
    }
    /**
     * Initialize password strength indicator and validation
     */

  }, {
    key: "initializePasswordStrengthIndicator",
    value: function initializePasswordStrengthIndicator() {
      var _this5 = this;

      // Initialize the enhanced password validator if available
      if (typeof providerPasswordValidator !== 'undefined') {
        providerPasswordValidator.initialize(this, {
          showWarnings: true,
          checkOnLoad: true,
          validateOnlyGenerated: false // Validate all passwords for providers

        });
      } else if (this.$secret.length > 0 && typeof PasswordScore !== 'undefined') {
        // Fallback to basic password strength indicator
        // Create progress bar for password strength if it doesn't exist
        var $passwordProgress = $('#password-strength-progress');

        if ($passwordProgress.length === 0) {
          var $secretField = this.$secret.closest('.field');
          $passwordProgress = $('<div class="ui tiny progress" id="password-strength-progress"><div class="bar"></div></div>');
          $secretField.append($passwordProgress);
        } // Initialize Semantic UI progress component


        $passwordProgress.progress({
          percent: 0,
          showActivity: false
        }); // Update password strength on input with provider context

        this.$secret.on('input', function () {
          PasswordScore.checkPassStrength({
            pass: _this5.$secret.val(),
            bar: $passwordProgress,
            section: $passwordProgress,
            field: 'provider_secret' // Use provider context for validation

          });
        });
      }
    }
    /**
     * Update visibility of elements based on provider settings
     * This method should be overridden in child classes
     */

  }, {
    key: "updateVisibilityElements",
    value: function updateVisibilityElements() {// Override in child classes
    }
    /**
     * Show password tooltip icon when in 'none' registration mode
     */

  }, {
    key: "showPasswordTooltip",
    value: function showPasswordTooltip() {
      this.$passwordTooltipIcon.show();
    }
    /**
     * Hide password tooltip icon
     */

  }, {
    key: "hidePasswordTooltip",
    value: function hidePasswordTooltip() {
      this.$passwordTooltipIcon.hide();
    }
    /**
     * Get validation rules based on provider settings
     * This method should be overridden in child classes
     * @returns {object} Validation rules
     */

  }, {
    key: "getValidateRules",
    value: function getValidateRules() {
      // Override in child classes
      return {};
    }
    /**
     * Initialize form with validation and callbacks
     * Note: This method is overridden in provider-modify.js to configure REST API
     */

  }, {
    key: "initializeForm",
    value: function initializeForm() {
      Form.$formObj = this.$formObj; // URL is not set here - child classes configure REST API

      Form.validateRules = this.getValidateRules();
      Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
      Form.cbAfterSendForm = this.cbAfterSendForm.bind(this);
      Form.initialize();
    }
    /**
     * Callback before form submission
     * @param {object} settings - Form settings
     * @returns {object} Modified settings
     */

  }, {
    key: "cbBeforeSendForm",
    value: function cbBeforeSendForm(settings) {
      var result = settings; // IMPORTANT: Don't overwrite result.data - it already contains processed checkbox values from Form.js
      // We should only add or modify specific fields
      // If result.data is not defined (shouldn't happen), initialize it

      if (!result.data) {
        result.data = this.$formObj.form('get values');
      } // Network filter value is automatically handled by form serialization


      return result;
    }
    /**
     * Callback after form submission
     * @param {object} response - Server response
     */

  }, {
    key: "cbAfterSendForm",
    value: function cbAfterSendForm(response) {// Can be overridden in child classes
    }
    /**
     * Show loading state for the form
     */

  }, {
    key: "showLoadingState",
    value: function showLoadingState() {
      this.$formObj.addClass('loading');
    }
    /**
     * Hide loading state for the form
     */

  }, {
    key: "hideLoadingState",
    value: function hideLoadingState() {
      this.$formObj.removeClass('loading');
    }
    /**
     * Populate form with data from API
     * @param {object} data - Provider data from API
     */

  }, {
    key: "populateFormData",
    value: function populateFormData(data) {
      // Common fields
      if (data.id) {
        $('#id').val(data.id);
      }

      if (data.description) {
        this.$description.val(data.description); // Update page header with provider name and type

        this.updatePageHeader(data.description);
      }

      if (data.note) {
        $('#note').val(data.note);
      } // Store network filter value for later initialization


      var networkFilterValue = data.networkfilterid || ProviderBase.DEFAULTS.NETWORK_FILTER; // Common provider fields

      $('#username').val(data.username || '');
      this.$secret.val(data.secret || '');
      $('#host').val(data.host || '');
      $('#registration_type').val(data.registration_type || ProviderBase.DEFAULTS.REGISTRATION_TYPE); // Store value in data attribute since select is empty and can't hold value

      this.$networkFilterId.data('value', networkFilterValue);
      $('#manualattributes').val(data.manualattributes || ''); // Set default ports based on provider type

      if (this.providerType === 'SIP') {
        $('#port').val(data.port || ProviderBase.DEFAULTS.SIP_PORT);
      } else if (this.providerType === 'IAX') {
        $('#port').val(data.port || ProviderBase.DEFAULTS.IAX_PORT);
      } // Common checkboxes - handle both string '1' and boolean true


      if (data.qualify === '1' || data.qualify === true) $('#qualify').prop('checked', true);
      if (data.receive_calls_without_auth === '1' || data.receive_calls_without_auth === true) $('#receive_calls_without_auth').prop('checked', true);
      if (data.noregister === '1' || data.noregister === true) $('#noregister').prop('checked', true); // Disabled state

      if (data.disabled === '1' || data.disabled === true) {
        $('#disabled').val('1');
      }
    }
    /**
     * Build HTML content for tooltips from structured data
     * @param {Object} tooltipData - Tooltip data object
     * @returns {string} HTML content for tooltip
     * @deprecated Use TooltipBuilder.buildContent() instead
     */

  }, {
    key: "buildTooltipContent",
    value: function buildTooltipContent(tooltipData) {
      return TooltipBuilder.buildContent(tooltipData);
    }
    /**
     * Update page header with provider name and type
     * @param {string} providerName - Provider name
     */

  }, {
    key: "updatePageHeader",
    value: function updatePageHeader(providerName) {
      var providerTypeText = this.providerType === 'SIP' ? 'SIP' : 'IAX';
      var headerText;

      if (providerName && providerName.trim() !== '') {
        // Existing provider with name
        headerText = "".concat(providerName, " (").concat(providerTypeText, ")");
      } else {
        // New provider or no name
        var newProviderText = globalTranslate.pr_NewProvider || 'New Provider';
        headerText = "".concat(newProviderText, " (").concat(providerTypeText, ")");
      } // Update main header content


      $('h1 .content').text(headerText);
    }
  }]);

  return ProviderBase;
}();

_defineProperty(ProviderBase, "SELECTORS", {
  FORM: '#save-provider-form',
  SECRET: '#secret',
  CHECKBOXES: '#save-provider-form .checkbox',
  ACCORDIONS: '#save-provider-form .ui.accordion',
  DROPDOWNS: '#save-provider-form .ui.dropdown',
  DESCRIPTION: '#description',
  NETWORK_FILTER_ID: '#networkfilterid',
  SHOW_HIDE_PASSWORD: '#show-hide-password',
  GENERATE_PASSWORD: '#generate-new-password',
  PASSWORD_TOOLTIP_ICON: '.password-tooltip-icon',
  CLIPBOARD: '.clipboard',
  POPUPED: '.popuped'
});

_defineProperty(ProviderBase, "DEFAULTS", {
  SIP_PORT: '5060',
  IAX_PORT: '4569',
  PASSWORD_LENGTH: 16,
  QUALIFY_FREQ: '60',
  REGISTRATION_TYPE: 'outbound',
  DTMF_MODE: 'auto',
  TRANSPORT: 'UDP',
  NETWORK_FILTER: 'none'
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiU0VMRUNUT1JTIiwiRk9STSIsIiRzZWNyZXQiLCJTRUNSRVQiLCIkY2hlY2tCb3hlcyIsIkNIRUNLQk9YRVMiLCIkYWNjb3JkaW9ucyIsIkFDQ09SRElPTlMiLCIkZHJvcERvd25zIiwiRFJPUERPV05TIiwiJGRlc2NyaXB0aW9uIiwiREVTQ1JJUFRJT04iLCIkbmV0d29ya0ZpbHRlcklkIiwiTkVUV09SS19GSUxURVJfSUQiLCIkc2hvd0hpZGVQYXNzd29yZCIsIlNIT1dfSElERV9QQVNTV09SRCIsIiRnZW5lcmF0ZVBhc3N3b3JkIiwiR0VORVJBVEVfUEFTU1dPUkQiLCIkcGFzc3dvcmRUb29sdGlwSWNvbiIsIlBBU1NXT1JEX1RPT0xUSVBfSUNPTiIsIiRjbGlwYm9hcmQiLCJDTElQQk9BUkQiLCIkcG9wdXBlZCIsIlBPUFVQRUQiLCJpc05ld1Byb3ZpZGVyIiwiaG9zdElucHV0VmFsaWRhdGlvbiIsIlJlZ0V4cCIsInByb3ZpZGVySWQiLCJ2YWwiLCJjdXJyZW50RGVzY3JpcHRpb24iLCJ1cGRhdGVQYWdlSGVhZGVyIiwic2hvd0xvYWRpbmdTdGF0ZSIsIlByb3ZpZGVyc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwiaGlkZUxvYWRpbmdTdGF0ZSIsInJlc3VsdCIsImRhdGEiLCJwb3B1bGF0ZUZvcm1EYXRhIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsImluaXRpYWxpemVVSUNvbXBvbmVudHMiLCJpbml0aWFsaXplRXZlbnRIYW5kbGVycyIsImluaXRpYWxpemVGb3JtIiwidXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzIiwicG9wdXAiLCJpbml0aWFsaXplQ2xpcGJvYXJkIiwib24iLCJhdHRyIiwiY2hlY2tib3giLCJkcm9wZG93biIsImluaXRpYWxpemVBY2NvcmRpb24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZURyb3Bkb3duIiwiaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93biIsIiRmaWVsZCIsImxlbmd0aCIsIiRleGlzdGluZ0Ryb3Bkb3duIiwiY2xvc2VzdCIsImhhc0NsYXNzIiwiYWRkQ2xhc3MiLCJvbkNoYW5nZSIsInZhbHVlIiwiZmluZCIsInJlbW92ZUNsYXNzIiwicmVtb3ZlIiwiRm9ybSIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwiZGF0YUNoYW5nZWQiLCJjdXJyZW50VmFsdWUiLCJERUZBVUxUUyIsIlJFR0lTVFJBVElPTl9UWVBFIiwiaXNJQVgiLCJvcHRpb25zIiwidGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsImRyb3Bkb3duSHRtbCIsIm8iLCJtYXAiLCJvcHQiLCJqb2luIiwicmVwbGFjZVdpdGgiLCJzZWxmIiwiYWNjb3JkaW9uIiwib25PcGVuIiwic2V0VGltZW91dCIsIk5FVFdPUktfRklMVEVSIiwiTmV0d29ya0ZpbHRlcnNBUEkiLCJpbml0aWFsaXplRHJvcGRvd24iLCJpbml0aWFsaXplUGFzc3dvcmRTdHJlbmd0aEluZGljYXRvciIsImUiLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCJjdXJyZW50VGFyZ2V0IiwiJGljb24iLCJnZW5lcmF0ZVBhc3N3b3JkIiwiY2xpcGJvYXJkIiwiQ2xpcGJvYXJkSlMiLCJ0cmlnZ2VyIiwiY2xlYXJTZWxlY3Rpb24iLCJzaG93RXJyb3IiLCJwcl9FcnJvck9uUHJvdmlkZXJTYXZlIiwiUGJ4QXBpIiwiUGFzc3dvcmRHZW5lcmF0ZSIsIlBBU1NXT1JEX0xFTkdUSCIsInBhc3N3b3JkIiwiJHBhc3N3b3JkUHJvZ3Jlc3MiLCJQYXNzd29yZFNjb3JlIiwiY2hlY2tQYXNzU3RyZW5ndGgiLCJwYXNzIiwiYmFyIiwic2VjdGlvbiIsInByb3ZpZGVyUGFzc3dvcmRWYWxpZGF0b3IiLCJpbml0aWFsaXplIiwic2hvd1dhcm5pbmdzIiwiY2hlY2tPbkxvYWQiLCJ2YWxpZGF0ZU9ubHlHZW5lcmF0ZWQiLCIkc2VjcmV0RmllbGQiLCJhcHBlbmQiLCJwcm9ncmVzcyIsInBlcmNlbnQiLCJzaG93QWN0aXZpdHkiLCJmaWVsZCIsInNob3ciLCJoaWRlIiwiY2JCZWZvcmVTZW5kRm9ybSIsImJpbmQiLCJjYkFmdGVyU2VuZEZvcm0iLCJzZXR0aW5ncyIsImZvcm0iLCJpZCIsImRlc2NyaXB0aW9uIiwibm90ZSIsIm5ldHdvcmtGaWx0ZXJWYWx1ZSIsIm5ldHdvcmtmaWx0ZXJpZCIsInVzZXJuYW1lIiwic2VjcmV0IiwiaG9zdCIsInJlZ2lzdHJhdGlvbl90eXBlIiwibWFudWFsYXR0cmlidXRlcyIsInBvcnQiLCJTSVBfUE9SVCIsIklBWF9QT1JUIiwicXVhbGlmeSIsInByb3AiLCJyZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCIsIm5vcmVnaXN0ZXIiLCJkaXNhYmxlZCIsInRvb2x0aXBEYXRhIiwiVG9vbHRpcEJ1aWxkZXIiLCJidWlsZENvbnRlbnQiLCJwcm92aWRlck5hbWUiLCJwcm92aWRlclR5cGVUZXh0IiwiaGVhZGVyVGV4dCIsInRyaW0iLCJuZXdQcm92aWRlclRleHQiLCJwcl9OZXdQcm92aWRlciIsIlFVQUxJRllfRlJFUSIsIkRUTUZfTU9ERSIsIlRSQU5TUE9SVCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsWTtBQUNGO0FBZ0JBOztBQVlBO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksd0JBQVlDLFlBQVosRUFBMEI7QUFBQTs7QUFDdEIsU0FBS0EsWUFBTCxHQUFvQkEsWUFBcEIsQ0FEc0IsQ0FFdEI7O0FBQ0EsU0FBS0MsUUFBTCxHQUFnQkMsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJDLElBQXhCLENBQWpCO0FBQ0EsU0FBS0MsT0FBTCxHQUFlSCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QkcsTUFBeEIsQ0FBaEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CTCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QkssVUFBeEIsQ0FBcEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CUCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1Qk8sVUFBeEIsQ0FBcEI7QUFDQSxTQUFLQyxVQUFMLEdBQWtCVCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QlMsU0FBeEIsQ0FBbkI7QUFDQSxTQUFLQyxZQUFMLEdBQW9CWCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QlcsV0FBeEIsQ0FBckI7QUFDQSxTQUFLQyxnQkFBTCxHQUF3QmIsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJhLGlCQUF4QixDQUF6QjtBQUNBLFNBQUtDLGlCQUFMLEdBQXlCZixDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QmUsa0JBQXhCLENBQTFCO0FBQ0EsU0FBS0MsaUJBQUwsR0FBeUJqQixDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QmlCLGlCQUF4QixDQUExQjtBQUNBLFNBQUtDLG9CQUFMLEdBQTRCbkIsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJtQixxQkFBeEIsQ0FBN0I7QUFDQSxTQUFLQyxVQUFMLEdBQWtCckIsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJxQixTQUF4QixDQUFuQjtBQUNBLFNBQUtDLFFBQUwsR0FBZ0J2QixDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QnVCLE9BQXhCLENBQWpCLENBZHNCLENBZ0J0Qjs7QUFDQSxTQUFLQyxhQUFMLEdBQXFCLEtBQXJCLENBakJzQixDQW1CdEI7O0FBQ0EsU0FBS0MsbUJBQUwsR0FBMkIsSUFBSUMsTUFBSixDQUN2Qix1REFDRSwwQ0FERixHQUVFLDJCQUZGLEdBR0Usc0RBSnFCLEVBS3ZCLElBTHVCLENBQTNCO0FBT0g7QUFFRDtBQUNKO0FBQ0E7Ozs7O1dBQ0ksc0JBQWE7QUFBQTs7QUFDVCxVQUFNQyxVQUFVLEdBQUc1QixDQUFDLENBQUMsS0FBRCxDQUFELENBQVM2QixHQUFULE1BQWtCLEVBQXJDO0FBQ0EsVUFBTUMsa0JBQWtCLEdBQUcsS0FBS25CLFlBQUwsQ0FBa0JrQixHQUFsQixNQUEyQixFQUF0RCxDQUZTLENBSVQ7QUFDQTs7QUFDQSxXQUFLSixhQUFMLEdBQXFCLENBQUNHLFVBQUQsSUFBZUEsVUFBVSxLQUFLLEVBQTlCLElBQW9DQSxVQUFVLEtBQUssS0FBeEUsQ0FOUyxDQVFUOztBQUNBLFdBQUtHLGdCQUFMLENBQXNCRCxrQkFBdEIsRUFUUyxDQVdUOztBQUNBLFdBQUtFLGdCQUFMLEdBWlMsQ0FjVDs7QUFDQUMsTUFBQUEsWUFBWSxDQUFDQyxTQUFiLENBQXVCTixVQUF2QixFQUFtQyxLQUFLOUIsWUFBeEMsRUFBc0QsVUFBQ3FDLFFBQUQsRUFBYztBQUNoRSxRQUFBLEtBQUksQ0FBQ0MsZ0JBQUw7O0FBRUEsWUFBSUQsUUFBUSxDQUFDRSxNQUFULElBQW1CRixRQUFRLENBQUNHLElBQWhDLEVBQXNDO0FBQ2xDLFVBQUEsS0FBSSxDQUFDQyxnQkFBTCxDQUFzQkosUUFBUSxDQUFDRyxJQUEvQjtBQUNILFNBRkQsTUFFTyxJQUFJVixVQUFVLElBQUlBLFVBQVUsS0FBSyxLQUFqQyxFQUF3QztBQUMzQ1ksVUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCTixRQUFRLENBQUNPLFFBQXJDO0FBQ0gsU0FQK0QsQ0FTaEU7OztBQUNBLFFBQUEsS0FBSSxDQUFDQyxzQkFBTDs7QUFDQSxRQUFBLEtBQUksQ0FBQ0MsdUJBQUw7O0FBQ0EsUUFBQSxLQUFJLENBQUNDLGNBQUw7O0FBQ0EsUUFBQSxLQUFJLENBQUNDLHdCQUFMLEdBYmdFLENBZWhFOzs7QUFDQSxRQUFBLEtBQUksQ0FBQ3ZCLFFBQUwsQ0FBY3dCLEtBQWQ7O0FBQ0EsUUFBQSxLQUFJLENBQUNDLG1CQUFMLEdBakJnRSxDQW1CaEU7OztBQUNBLFFBQUEsS0FBSSxDQUFDN0MsT0FBTCxDQUFhOEMsRUFBYixDQUFnQixPQUFoQixFQUF5QixZQUFNO0FBQzNCLFVBQUEsS0FBSSxDQUFDOUMsT0FBTCxDQUFhK0MsSUFBYixDQUFrQixjQUFsQixFQUFrQyxjQUFsQztBQUNILFNBRkQ7QUFHSCxPQXZCRDtBQXdCSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLGtDQUF5QjtBQUNyQixXQUFLN0MsV0FBTCxDQUFpQjhDLFFBQWpCO0FBQ0EsV0FBSzFDLFVBQUwsQ0FBZ0IyQyxRQUFoQjtBQUNBLFdBQUtDLG1CQUFMLEdBSHFCLENBS3JCOztBQUNBLFdBQUtDLGtDQUFMLEdBTnFCLENBUXJCOztBQUNBLFdBQUtDLCtCQUFMO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSw4Q0FBcUM7QUFBQTtBQUFBOztBQUNqQyxVQUFNQyxNQUFNLEdBQUd4RCxDQUFDLENBQUMsb0JBQUQsQ0FBaEI7QUFDQSxVQUFJd0QsTUFBTSxDQUFDQyxNQUFQLEtBQWtCLENBQXRCLEVBQXlCLE9BRlEsQ0FJakM7O0FBQ0EsVUFBTUMsaUJBQWlCLEdBQUdGLE1BQU0sQ0FBQ0csT0FBUCxDQUFlLGNBQWYsQ0FBMUI7O0FBQ0EsVUFBSUQsaUJBQWlCLENBQUNELE1BQWxCLEdBQTJCLENBQS9CLEVBQWtDO0FBQzlCO0FBQ0EsWUFBSSxDQUFDQyxpQkFBaUIsQ0FBQ0UsUUFBbEIsQ0FBMkIsNEJBQTNCLENBQUwsRUFBK0Q7QUFDM0RGLFVBQUFBLGlCQUFpQixDQUFDRyxRQUFsQixDQUEyQiw0QkFBM0I7QUFDSDs7QUFDREgsUUFBQUEsaUJBQWlCLENBQUNOLFFBQWxCLENBQTJCO0FBQ3ZCVSxVQUFBQSxRQUFRLEVBQUUsa0JBQUNDLEtBQUQsRUFBVztBQUNqQixZQUFBLE1BQUksQ0FBQ2pCLHdCQUFMLEdBRGlCLENBRWpCOzs7QUFDQSxZQUFBLE1BQUksQ0FBQy9DLFFBQUwsQ0FBY2lFLElBQWQsQ0FBbUIsUUFBbkIsRUFBNkJDLFdBQTdCLENBQXlDLE9BQXpDOztBQUNBLFlBQUEsTUFBSSxDQUFDbEUsUUFBTCxDQUFjaUUsSUFBZCxDQUFtQixtQkFBbkIsRUFBd0NFLE1BQXhDOztBQUNBLFlBQUEsTUFBSSxDQUFDbkUsUUFBTCxDQUFjaUUsSUFBZCxDQUFtQixTQUFuQixFQUE4QkUsTUFBOUIsR0FMaUIsQ0FNakI7OztBQUNBQyxZQUFBQSxJQUFJLENBQUNDLGFBQUwsR0FBcUIsTUFBSSxDQUFDQyxnQkFBTCxFQUFyQjtBQUNBRixZQUFBQSxJQUFJLENBQUNHLFdBQUw7QUFDSDtBQVZzQixTQUEzQjtBQVlBO0FBQ0g7O0FBRUQsVUFBTUMsWUFBWSxHQUFHZixNQUFNLENBQUMzQixHQUFQLE1BQWdCaEMsWUFBWSxDQUFDMkUsUUFBYixDQUFzQkMsaUJBQTNEO0FBQ0EsVUFBTUMsS0FBSyxHQUFHLEtBQUs1RSxZQUFMLEtBQXNCLEtBQXBDLENBM0JpQyxDQTZCakM7O0FBQ0EsVUFBTTZFLE9BQU8sR0FBRyxDQUNaO0FBQUVaLFFBQUFBLEtBQUssRUFBRSxVQUFUO0FBQXFCYSxRQUFBQSxJQUFJLEVBQUVDLGVBQWUsQ0FBQ0gsS0FBSyxHQUFHLHVCQUFILEdBQTZCLHVCQUFuQyxDQUFmLElBQThFO0FBQXpHLE9BRFksRUFFWjtBQUFFWCxRQUFBQSxLQUFLLEVBQUUsU0FBVDtBQUFvQmEsUUFBQUEsSUFBSSxFQUFFQyxlQUFlLENBQUNILEtBQUssR0FBRyxzQkFBSCxHQUE0QixzQkFBbEMsQ0FBZixJQUE0RTtBQUF0RyxPQUZZLEVBR1o7QUFBRVgsUUFBQUEsS0FBSyxFQUFFLE1BQVQ7QUFBaUJhLFFBQUFBLElBQUksRUFBRUMsZUFBZSxDQUFDSCxLQUFLLEdBQUcsbUJBQUgsR0FBeUIsbUJBQS9CLENBQWYsSUFBc0U7QUFBN0YsT0FIWSxDQUFoQixDQTlCaUMsQ0FvQ2pDOztBQUNBLFVBQU1JLFlBQVksZ01BRW9FUCxZQUZwRSwrR0FJa0Isa0JBQUFJLE9BQU8sQ0FBQ1gsSUFBUixDQUFhLFVBQUFlLENBQUM7QUFBQSxlQUFJQSxDQUFDLENBQUNoQixLQUFGLEtBQVlRLFlBQWhCO0FBQUEsT0FBZCxpRUFBNkNLLElBQTdDLEtBQXFETCxZQUp2RSwrRUFNSkksT0FBTyxDQUFDSyxHQUFSLENBQVksVUFBQUMsR0FBRztBQUFBLDBEQUFxQ0EsR0FBRyxDQUFDbEIsS0FBekMsZ0JBQW1Ea0IsR0FBRyxDQUFDTCxJQUF2RDtBQUFBLE9BQWYsRUFBb0ZNLElBQXBGLENBQXlGLEVBQXpGLENBTkksMkRBQWxCLENBckNpQyxDQWdEakM7O0FBQ0ExQixNQUFBQSxNQUFNLENBQUMyQixXQUFQLENBQW1CTCxZQUFuQixFQWpEaUMsQ0FtRGpDOztBQUNBOUUsTUFBQUEsQ0FBQyxDQUFDLDZCQUFELENBQUQsQ0FBaUNvRCxRQUFqQyxDQUEwQztBQUN0Q1UsUUFBQUEsUUFBUSxFQUFFLGtCQUFDQyxLQUFELEVBQVc7QUFDakIsVUFBQSxNQUFJLENBQUNqQix3QkFBTCxHQURpQixDQUVqQjs7O0FBQ0EsVUFBQSxNQUFJLENBQUMvQyxRQUFMLENBQWNpRSxJQUFkLENBQW1CLFFBQW5CLEVBQTZCQyxXQUE3QixDQUF5QyxPQUF6Qzs7QUFDQSxVQUFBLE1BQUksQ0FBQ2xFLFFBQUwsQ0FBY2lFLElBQWQsQ0FBbUIsbUJBQW5CLEVBQXdDRSxNQUF4Qzs7QUFDQSxVQUFBLE1BQUksQ0FBQ25FLFFBQUwsQ0FBY2lFLElBQWQsQ0FBbUIsU0FBbkIsRUFBOEJFLE1BQTlCLEdBTGlCLENBTWpCOzs7QUFDQUMsVUFBQUEsSUFBSSxDQUFDQyxhQUFMLEdBQXFCLE1BQUksQ0FBQ0MsZ0JBQUwsRUFBckI7QUFDQUYsVUFBQUEsSUFBSSxDQUFDRyxXQUFMO0FBQ0g7QUFWcUMsT0FBMUM7QUFZSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLCtCQUFzQjtBQUNsQixVQUFNYyxJQUFJLEdBQUcsSUFBYjtBQUNBLFdBQUs3RSxXQUFMLENBQWlCOEUsU0FBakIsQ0FBMkI7QUFDdkJDLFFBQUFBLE1BQU0sRUFBRSxrQkFBVztBQUNmO0FBQ0FDLFVBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2IsZ0JBQUksT0FBT0gsSUFBSSxDQUFDdEMsd0JBQVosS0FBeUMsVUFBN0MsRUFBeUQ7QUFDckRzQyxjQUFBQSxJQUFJLENBQUN0Qyx3QkFBTDtBQUNIO0FBQ0osV0FKUyxFQUlQLEVBSk8sQ0FBVjtBQUtIO0FBUnNCLE9BQTNCO0FBVUg7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSwyQ0FBa0M7QUFDOUIsVUFBSSxLQUFLakMsZ0JBQUwsQ0FBc0I0QyxNQUF0QixLQUFpQyxDQUFyQyxFQUF3QyxPQURWLENBRzlCOztBQUNBLFVBQU1jLFlBQVksR0FBRyxLQUFLMUQsZ0JBQUwsQ0FBc0J5QixJQUF0QixDQUEyQixPQUEzQixLQUF1QyxLQUFLekIsZ0JBQUwsQ0FBc0JnQixHQUF0QixFQUF2QyxJQUFzRWhDLFlBQVksQ0FBQzJFLFFBQWIsQ0FBc0JnQixjQUFqSCxDQUo4QixDQU05Qjs7QUFDQUMsTUFBQUEsaUJBQWlCLENBQUNDLGtCQUFsQixDQUFxQyxLQUFLN0UsZ0JBQTFDLEVBQTREO0FBQ3hEMEQsUUFBQUEsWUFBWSxFQUFaQSxZQUR3RDtBQUV4RHpFLFFBQUFBLFlBQVksRUFBRSxLQUFLQSxZQUZxQztBQUd4RGdFLFFBQUFBLFFBQVEsRUFBRTtBQUFBLGlCQUFNSyxJQUFJLENBQUNHLFdBQUwsRUFBTjtBQUFBO0FBSDhDLE9BQTVEO0FBS0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSxtQ0FBMEI7QUFBQTs7QUFDdEIsVUFBTWMsSUFBSSxHQUFHLElBQWIsQ0FEc0IsQ0FHdEI7O0FBQ0EsV0FBS3pFLFlBQUwsQ0FBa0JzQyxFQUFsQixDQUFxQixPQUFyQixFQUE4QixZQUFXO0FBQ3JDbUMsUUFBQUEsSUFBSSxDQUFDckQsZ0JBQUwsQ0FBc0IvQixDQUFDLENBQUMsSUFBRCxDQUFELENBQVE2QixHQUFSLEVBQXRCO0FBQ0gsT0FGRCxFQUpzQixDQVF0Qjs7QUFDQSxXQUFLOEQsbUNBQUwsR0FUc0IsQ0FZdEI7O0FBQ0EsV0FBSzVFLGlCQUFMLENBQXVCa0MsRUFBdkIsQ0FBMEIsT0FBMUIsRUFBbUMsVUFBQzJDLENBQUQsRUFBTztBQUN0Q0EsUUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsWUFBTUMsT0FBTyxHQUFHOUYsQ0FBQyxDQUFDNEYsQ0FBQyxDQUFDRyxhQUFILENBQWpCO0FBQ0EsWUFBTUMsS0FBSyxHQUFHRixPQUFPLENBQUM5QixJQUFSLENBQWEsR0FBYixDQUFkOztBQUVBLFlBQUksTUFBSSxDQUFDN0QsT0FBTCxDQUFhK0MsSUFBYixDQUFrQixNQUFsQixNQUE4QixVQUFsQyxFQUE4QztBQUMxQztBQUNBOEMsVUFBQUEsS0FBSyxDQUFDL0IsV0FBTixDQUFrQixLQUFsQixFQUF5QkosUUFBekIsQ0FBa0MsV0FBbEM7O0FBQ0EsVUFBQSxNQUFJLENBQUMxRCxPQUFMLENBQWErQyxJQUFiLENBQWtCLE1BQWxCLEVBQTBCLE1BQTFCO0FBQ0gsU0FKRCxNQUlPO0FBQ0g7QUFDQThDLFVBQUFBLEtBQUssQ0FBQy9CLFdBQU4sQ0FBa0IsV0FBbEIsRUFBK0JKLFFBQS9CLENBQXdDLEtBQXhDOztBQUNBLFVBQUEsTUFBSSxDQUFDMUQsT0FBTCxDQUFhK0MsSUFBYixDQUFrQixNQUFsQixFQUEwQixVQUExQjtBQUNIO0FBQ0osT0FkRCxFQWJzQixDQTZCdEI7O0FBQ0EsV0FBS2pDLGlCQUFMLENBQXVCZ0MsRUFBdkIsQ0FBMEIsT0FBMUIsRUFBbUMsVUFBQzJDLENBQUQsRUFBTztBQUN0Q0EsUUFBQUEsQ0FBQyxDQUFDQyxjQUFGOztBQUNBLFFBQUEsTUFBSSxDQUFDSSxnQkFBTDtBQUNILE9BSEQ7QUFJSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLCtCQUFzQjtBQUNsQixVQUFNQyxTQUFTLEdBQUcsSUFBSUMsV0FBSixDQUFnQnRHLFlBQVksQ0FBQ0ksU0FBYixDQUF1QnFCLFNBQXZDLENBQWxCO0FBQ0EsV0FBS0QsVUFBTCxDQUFnQjBCLEtBQWhCLENBQXNCO0FBQ2xCRSxRQUFBQSxFQUFFLEVBQUU7QUFEYyxPQUF0QjtBQUlBaUQsTUFBQUEsU0FBUyxDQUFDakQsRUFBVixDQUFhLFNBQWIsRUFBd0IsVUFBQzJDLENBQUQsRUFBTztBQUMzQjVGLFFBQUFBLENBQUMsQ0FBQzRGLENBQUMsQ0FBQ1EsT0FBSCxDQUFELENBQWFyRCxLQUFiLENBQW1CLE1BQW5CO0FBQ0F3QyxRQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNidkYsVUFBQUEsQ0FBQyxDQUFDNEYsQ0FBQyxDQUFDUSxPQUFILENBQUQsQ0FBYXJELEtBQWIsQ0FBbUIsTUFBbkI7QUFDSCxTQUZTLEVBRVAsSUFGTyxDQUFWO0FBR0E2QyxRQUFBQSxDQUFDLENBQUNTLGNBQUY7QUFDSCxPQU5EO0FBUUFILE1BQUFBLFNBQVMsQ0FBQ2pELEVBQVYsQ0FBYSxPQUFiLEVBQXNCLFVBQUMyQyxDQUFELEVBQU87QUFDekJwRCxRQUFBQSxXQUFXLENBQUM4RCxTQUFaLENBQXNCekIsZUFBZSxDQUFDMEIsc0JBQXRDO0FBQ0gsT0FGRDtBQUdIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksNEJBQW1CO0FBQUE7O0FBQ2ZDLE1BQUFBLE1BQU0sQ0FBQ0MsZ0JBQVAsQ0FBd0I1RyxZQUFZLENBQUMyRSxRQUFiLENBQXNCa0MsZUFBOUMsRUFBK0QsVUFBQ0MsUUFBRCxFQUFjO0FBQ3pFLFlBQUlBLFFBQUosRUFBYztBQUNWLFVBQUEsTUFBSSxDQUFDeEcsT0FBTCxDQUFhMEIsR0FBYixDQUFpQjhFLFFBQWpCOztBQUNBLFVBQUEsTUFBSSxDQUFDeEcsT0FBTCxDQUFhaUcsT0FBYixDQUFxQixRQUFyQjs7QUFDQWpDLFVBQUFBLElBQUksQ0FBQ0csV0FBTDs7QUFDQSxVQUFBLE1BQUksQ0FBQ2pELFVBQUwsQ0FBZ0I2QixJQUFoQixDQUFxQixxQkFBckIsRUFBNEN5RCxRQUE1QyxFQUpVLENBTVY7OztBQUNBLGNBQU1DLGlCQUFpQixHQUFHNUcsQ0FBQyxDQUFDLDZCQUFELENBQTNCOztBQUNBLGNBQUk0RyxpQkFBaUIsQ0FBQ25ELE1BQWxCLEdBQTJCLENBQTNCLElBQWdDLE9BQU9vRCxhQUFQLEtBQXlCLFdBQTdELEVBQTBFO0FBQ3RFQSxZQUFBQSxhQUFhLENBQUNDLGlCQUFkLENBQWdDO0FBQzVCQyxjQUFBQSxJQUFJLEVBQUVKLFFBRHNCO0FBRTVCSyxjQUFBQSxHQUFHLEVBQUVKLGlCQUZ1QjtBQUc1QkssY0FBQUEsT0FBTyxFQUFFTDtBQUhtQixhQUFoQztBQUtIO0FBQ0o7QUFDSixPQWpCRDtBQWtCSDtBQUVEO0FBQ0o7QUFDQTs7OztXQUNJLCtDQUFzQztBQUFBOztBQUNsQztBQUNBLFVBQUksT0FBT00seUJBQVAsS0FBcUMsV0FBekMsRUFBc0Q7QUFDbERBLFFBQUFBLHlCQUF5QixDQUFDQyxVQUExQixDQUFxQyxJQUFyQyxFQUEyQztBQUN2Q0MsVUFBQUEsWUFBWSxFQUFFLElBRHlCO0FBRXZDQyxVQUFBQSxXQUFXLEVBQUUsSUFGMEI7QUFHdkNDLFVBQUFBLHFCQUFxQixFQUFFLEtBSGdCLENBR1Y7O0FBSFUsU0FBM0M7QUFLSCxPQU5ELE1BTU8sSUFBSSxLQUFLbkgsT0FBTCxDQUFhc0QsTUFBYixHQUFzQixDQUF0QixJQUEyQixPQUFPb0QsYUFBUCxLQUF5QixXQUF4RCxFQUFxRTtBQUN4RTtBQUNBO0FBQ0EsWUFBSUQsaUJBQWlCLEdBQUc1RyxDQUFDLENBQUMsNkJBQUQsQ0FBekI7O0FBQ0EsWUFBSTRHLGlCQUFpQixDQUFDbkQsTUFBbEIsS0FBNkIsQ0FBakMsRUFBb0M7QUFDaEMsY0FBTThELFlBQVksR0FBRyxLQUFLcEgsT0FBTCxDQUFhd0QsT0FBYixDQUFxQixRQUFyQixDQUFyQjtBQUNBaUQsVUFBQUEsaUJBQWlCLEdBQUc1RyxDQUFDLENBQUMsNkZBQUQsQ0FBckI7QUFDQXVILFVBQUFBLFlBQVksQ0FBQ0MsTUFBYixDQUFvQlosaUJBQXBCO0FBQ0gsU0FSdUUsQ0FVeEU7OztBQUNBQSxRQUFBQSxpQkFBaUIsQ0FBQ2EsUUFBbEIsQ0FBMkI7QUFDdkJDLFVBQUFBLE9BQU8sRUFBRSxDQURjO0FBRXZCQyxVQUFBQSxZQUFZLEVBQUU7QUFGUyxTQUEzQixFQVh3RSxDQWdCeEU7O0FBQ0EsYUFBS3hILE9BQUwsQ0FBYThDLEVBQWIsQ0FBZ0IsT0FBaEIsRUFBeUIsWUFBTTtBQUMzQjRELFVBQUFBLGFBQWEsQ0FBQ0MsaUJBQWQsQ0FBZ0M7QUFDNUJDLFlBQUFBLElBQUksRUFBRSxNQUFJLENBQUM1RyxPQUFMLENBQWEwQixHQUFiLEVBRHNCO0FBRTVCbUYsWUFBQUEsR0FBRyxFQUFFSixpQkFGdUI7QUFHNUJLLFlBQUFBLE9BQU8sRUFBRUwsaUJBSG1CO0FBSTVCZ0IsWUFBQUEsS0FBSyxFQUFFLGlCQUpxQixDQUlGOztBQUpFLFdBQWhDO0FBTUgsU0FQRDtBQVFIO0FBQ0o7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLG9DQUEyQixDQUN2QjtBQUNIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksK0JBQXNCO0FBQ2xCLFdBQUt6RyxvQkFBTCxDQUEwQjBHLElBQTFCO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSwrQkFBc0I7QUFDbEIsV0FBSzFHLG9CQUFMLENBQTBCMkcsSUFBMUI7QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSw0QkFBbUI7QUFDZjtBQUNBLGFBQU8sRUFBUDtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSwwQkFBaUI7QUFDYjNELE1BQUFBLElBQUksQ0FBQ3BFLFFBQUwsR0FBZ0IsS0FBS0EsUUFBckIsQ0FEYSxDQUViOztBQUNBb0UsTUFBQUEsSUFBSSxDQUFDQyxhQUFMLEdBQXFCLEtBQUtDLGdCQUFMLEVBQXJCO0FBQ0FGLE1BQUFBLElBQUksQ0FBQzRELGdCQUFMLEdBQXdCLEtBQUtBLGdCQUFMLENBQXNCQyxJQUF0QixDQUEyQixJQUEzQixDQUF4QjtBQUNBN0QsTUFBQUEsSUFBSSxDQUFDOEQsZUFBTCxHQUF1QixLQUFLQSxlQUFMLENBQXFCRCxJQUFyQixDQUEwQixJQUExQixDQUF2QjtBQUNBN0QsTUFBQUEsSUFBSSxDQUFDZ0QsVUFBTDtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTs7OztXQUNJLDBCQUFpQmUsUUFBakIsRUFBMkI7QUFDdkIsVUFBTTdGLE1BQU0sR0FBRzZGLFFBQWYsQ0FEdUIsQ0FFdkI7QUFDQTtBQUVBOztBQUNBLFVBQUksQ0FBQzdGLE1BQU0sQ0FBQ0MsSUFBWixFQUFrQjtBQUNkRCxRQUFBQSxNQUFNLENBQUNDLElBQVAsR0FBYyxLQUFLdkMsUUFBTCxDQUFjb0ksSUFBZCxDQUFtQixZQUFuQixDQUFkO0FBQ0gsT0FSc0IsQ0FVdkI7OztBQUVBLGFBQU85RixNQUFQO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7QUFDQTs7OztXQUNJLHlCQUFnQkYsUUFBaEIsRUFBMEIsQ0FDdEI7QUFDSDtBQUlEO0FBQ0o7QUFDQTs7OztXQUNJLDRCQUFtQjtBQUNmLFdBQUtwQyxRQUFMLENBQWM4RCxRQUFkLENBQXVCLFNBQXZCO0FBQ0g7QUFFRDtBQUNKO0FBQ0E7Ozs7V0FDSSw0QkFBbUI7QUFDZixXQUFLOUQsUUFBTCxDQUFja0UsV0FBZCxDQUEwQixTQUExQjtBQUNIO0FBRUQ7QUFDSjtBQUNBO0FBQ0E7Ozs7V0FDSSwwQkFBaUIzQixJQUFqQixFQUF1QjtBQUVuQjtBQUNBLFVBQUlBLElBQUksQ0FBQzhGLEVBQVQsRUFBYTtBQUNUcEksUUFBQUEsQ0FBQyxDQUFDLEtBQUQsQ0FBRCxDQUFTNkIsR0FBVCxDQUFhUyxJQUFJLENBQUM4RixFQUFsQjtBQUNIOztBQUNELFVBQUk5RixJQUFJLENBQUMrRixXQUFULEVBQXNCO0FBQ2xCLGFBQUsxSCxZQUFMLENBQWtCa0IsR0FBbEIsQ0FBc0JTLElBQUksQ0FBQytGLFdBQTNCLEVBRGtCLENBRWxCOztBQUNBLGFBQUt0RyxnQkFBTCxDQUFzQk8sSUFBSSxDQUFDK0YsV0FBM0I7QUFDSDs7QUFDRCxVQUFJL0YsSUFBSSxDQUFDZ0csSUFBVCxFQUFlO0FBQ1h0SSxRQUFBQSxDQUFDLENBQUMsT0FBRCxDQUFELENBQVc2QixHQUFYLENBQWVTLElBQUksQ0FBQ2dHLElBQXBCO0FBQ0gsT0Fia0IsQ0FlbkI7OztBQUNBLFVBQU1DLGtCQUFrQixHQUFHakcsSUFBSSxDQUFDa0csZUFBTCxJQUF3QjNJLFlBQVksQ0FBQzJFLFFBQWIsQ0FBc0JnQixjQUF6RSxDQWhCbUIsQ0FrQm5COztBQUNBeEYsTUFBQUEsQ0FBQyxDQUFDLFdBQUQsQ0FBRCxDQUFlNkIsR0FBZixDQUFtQlMsSUFBSSxDQUFDbUcsUUFBTCxJQUFpQixFQUFwQztBQUNBLFdBQUt0SSxPQUFMLENBQWEwQixHQUFiLENBQWlCUyxJQUFJLENBQUNvRyxNQUFMLElBQWUsRUFBaEM7QUFDQTFJLE1BQUFBLENBQUMsQ0FBQyxPQUFELENBQUQsQ0FBVzZCLEdBQVgsQ0FBZVMsSUFBSSxDQUFDcUcsSUFBTCxJQUFhLEVBQTVCO0FBQ0EzSSxNQUFBQSxDQUFDLENBQUMsb0JBQUQsQ0FBRCxDQUF3QjZCLEdBQXhCLENBQTRCUyxJQUFJLENBQUNzRyxpQkFBTCxJQUEwQi9JLFlBQVksQ0FBQzJFLFFBQWIsQ0FBc0JDLGlCQUE1RSxFQXRCbUIsQ0F1Qm5COztBQUNBLFdBQUs1RCxnQkFBTCxDQUFzQnlCLElBQXRCLENBQTJCLE9BQTNCLEVBQW9DaUcsa0JBQXBDO0FBQ0F2SSxNQUFBQSxDQUFDLENBQUMsbUJBQUQsQ0FBRCxDQUF1QjZCLEdBQXZCLENBQTJCUyxJQUFJLENBQUN1RyxnQkFBTCxJQUF5QixFQUFwRCxFQXpCbUIsQ0EyQm5COztBQUNBLFVBQUksS0FBSy9JLFlBQUwsS0FBc0IsS0FBMUIsRUFBaUM7QUFDN0JFLFFBQUFBLENBQUMsQ0FBQyxPQUFELENBQUQsQ0FBVzZCLEdBQVgsQ0FBZVMsSUFBSSxDQUFDd0csSUFBTCxJQUFhakosWUFBWSxDQUFDMkUsUUFBYixDQUFzQnVFLFFBQWxEO0FBQ0gsT0FGRCxNQUVPLElBQUksS0FBS2pKLFlBQUwsS0FBc0IsS0FBMUIsRUFBaUM7QUFDcENFLFFBQUFBLENBQUMsQ0FBQyxPQUFELENBQUQsQ0FBVzZCLEdBQVgsQ0FBZVMsSUFBSSxDQUFDd0csSUFBTCxJQUFhakosWUFBWSxDQUFDMkUsUUFBYixDQUFzQndFLFFBQWxEO0FBQ0gsT0FoQ2tCLENBa0NuQjs7O0FBQ0EsVUFBSTFHLElBQUksQ0FBQzJHLE9BQUwsS0FBaUIsR0FBakIsSUFBd0IzRyxJQUFJLENBQUMyRyxPQUFMLEtBQWlCLElBQTdDLEVBQW1EakosQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFja0osSUFBZCxDQUFtQixTQUFuQixFQUE4QixJQUE5QjtBQUNuRCxVQUFJNUcsSUFBSSxDQUFDNkcsMEJBQUwsS0FBb0MsR0FBcEMsSUFBMkM3RyxJQUFJLENBQUM2RywwQkFBTCxLQUFvQyxJQUFuRixFQUF5Rm5KLENBQUMsQ0FBQyw2QkFBRCxDQUFELENBQWlDa0osSUFBakMsQ0FBc0MsU0FBdEMsRUFBaUQsSUFBakQ7QUFDekYsVUFBSTVHLElBQUksQ0FBQzhHLFVBQUwsS0FBb0IsR0FBcEIsSUFBMkI5RyxJQUFJLENBQUM4RyxVQUFMLEtBQW9CLElBQW5ELEVBQXlEcEosQ0FBQyxDQUFDLGFBQUQsQ0FBRCxDQUFpQmtKLElBQWpCLENBQXNCLFNBQXRCLEVBQWlDLElBQWpDLEVBckN0QyxDQXVDbkI7O0FBQ0EsVUFBSTVHLElBQUksQ0FBQytHLFFBQUwsS0FBa0IsR0FBbEIsSUFBeUIvRyxJQUFJLENBQUMrRyxRQUFMLEtBQWtCLElBQS9DLEVBQXFEO0FBQ2pEckosUUFBQUEsQ0FBQyxDQUFDLFdBQUQsQ0FBRCxDQUFlNkIsR0FBZixDQUFtQixHQUFuQjtBQUNIO0FBQ0o7QUFHRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7V0FDSSw2QkFBb0J5SCxXQUFwQixFQUFpQztBQUM3QixhQUFPQyxjQUFjLENBQUNDLFlBQWYsQ0FBNEJGLFdBQTVCLENBQVA7QUFDSDtBQUVEO0FBQ0o7QUFDQTtBQUNBOzs7O1dBQ0ksMEJBQWlCRyxZQUFqQixFQUErQjtBQUMzQixVQUFNQyxnQkFBZ0IsR0FBRyxLQUFLNUosWUFBTCxLQUFzQixLQUF0QixHQUE4QixLQUE5QixHQUFzQyxLQUEvRDtBQUNBLFVBQUk2SixVQUFKOztBQUVBLFVBQUlGLFlBQVksSUFBSUEsWUFBWSxDQUFDRyxJQUFiLE9BQXdCLEVBQTVDLEVBQWdEO0FBQzVDO0FBQ0FELFFBQUFBLFVBQVUsYUFBTUYsWUFBTixlQUF1QkMsZ0JBQXZCLE1BQVY7QUFDSCxPQUhELE1BR087QUFDSDtBQUNBLFlBQU1HLGVBQWUsR0FBR2hGLGVBQWUsQ0FBQ2lGLGNBQWhCLElBQWtDLGNBQTFEO0FBQ0FILFFBQUFBLFVBQVUsYUFBTUUsZUFBTixlQUEwQkgsZ0JBQTFCLE1BQVY7QUFDSCxPQVgwQixDQWEzQjs7O0FBQ0ExSixNQUFBQSxDQUFDLENBQUMsYUFBRCxDQUFELENBQWlCNEUsSUFBakIsQ0FBc0IrRSxVQUF0QjtBQUNIOzs7Ozs7Z0JBcGdCQzlKLFksZUFFaUI7QUFDZkssRUFBQUEsSUFBSSxFQUFFLHFCQURTO0FBRWZFLEVBQUFBLE1BQU0sRUFBRSxTQUZPO0FBR2ZFLEVBQUFBLFVBQVUsRUFBRSwrQkFIRztBQUlmRSxFQUFBQSxVQUFVLEVBQUUsbUNBSkc7QUFLZkUsRUFBQUEsU0FBUyxFQUFFLGtDQUxJO0FBTWZFLEVBQUFBLFdBQVcsRUFBRSxjQU5FO0FBT2ZFLEVBQUFBLGlCQUFpQixFQUFFLGtCQVBKO0FBUWZFLEVBQUFBLGtCQUFrQixFQUFFLHFCQVJMO0FBU2ZFLEVBQUFBLGlCQUFpQixFQUFFLHdCQVRKO0FBVWZFLEVBQUFBLHFCQUFxQixFQUFFLHdCQVZSO0FBV2ZFLEVBQUFBLFNBQVMsRUFBRSxZQVhJO0FBWWZFLEVBQUFBLE9BQU8sRUFBRTtBQVpNLEM7O2dCQUZqQjNCLFksY0FrQmdCO0FBQ2RrSixFQUFBQSxRQUFRLEVBQUUsTUFESTtBQUVkQyxFQUFBQSxRQUFRLEVBQUUsTUFGSTtBQUdkdEMsRUFBQUEsZUFBZSxFQUFFLEVBSEg7QUFJZHFELEVBQUFBLFlBQVksRUFBRSxJQUpBO0FBS2R0RixFQUFBQSxpQkFBaUIsRUFBRSxVQUxMO0FBTWR1RixFQUFBQSxTQUFTLEVBQUUsTUFORztBQU9kQyxFQUFBQSxTQUFTLEVBQUUsS0FQRztBQVFkekUsRUFBQUEsY0FBYyxFQUFFO0FBUkYsQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBieEFwaSwgQ2xpcGJvYXJkSlMsIE5ldHdvcmtGaWx0ZXJzQVBJLCBUb29sdGlwQnVpbGRlciwgUGFzc3dvcmRTY29yZSwgaTE4biwgUHJvdmlkZXJzQVBJLCBwcm92aWRlclBhc3N3b3JkVmFsaWRhdG9yICovXG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgcHJvdmlkZXIgbWFuYWdlbWVudCBmb3Jtc1xuICogQGNsYXNzIFByb3ZpZGVyQmFzZVxuICovXG5jbGFzcyBQcm92aWRlckJhc2Uge1xuICAgIC8vIENsYXNzIGNvbnN0YW50cyBmb3Igc2VsZWN0b3JzXG4gICAgc3RhdGljIFNFTEVDVE9SUyA9IHtcbiAgICAgICAgRk9STTogJyNzYXZlLXByb3ZpZGVyLWZvcm0nLFxuICAgICAgICBTRUNSRVQ6ICcjc2VjcmV0JyxcbiAgICAgICAgQ0hFQ0tCT1hFUzogJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmNoZWNrYm94JyxcbiAgICAgICAgQUNDT1JESU9OUzogJyNzYXZlLXByb3ZpZGVyLWZvcm0gLnVpLmFjY29yZGlvbicsXG4gICAgICAgIERST1BET1dOUzogJyNzYXZlLXByb3ZpZGVyLWZvcm0gLnVpLmRyb3Bkb3duJyxcbiAgICAgICAgREVTQ1JJUFRJT046ICcjZGVzY3JpcHRpb24nLFxuICAgICAgICBORVRXT1JLX0ZJTFRFUl9JRDogJyNuZXR3b3JrZmlsdGVyaWQnLFxuICAgICAgICBTSE9XX0hJREVfUEFTU1dPUkQ6ICcjc2hvdy1oaWRlLXBhc3N3b3JkJyxcbiAgICAgICAgR0VORVJBVEVfUEFTU1dPUkQ6ICcjZ2VuZXJhdGUtbmV3LXBhc3N3b3JkJyxcbiAgICAgICAgUEFTU1dPUkRfVE9PTFRJUF9JQ09OOiAnLnBhc3N3b3JkLXRvb2x0aXAtaWNvbicsXG4gICAgICAgIENMSVBCT0FSRDogJy5jbGlwYm9hcmQnLFxuICAgICAgICBQT1BVUEVEOiAnLnBvcHVwZWQnXG4gICAgfTtcblxuICAgIC8vIENsYXNzIGNvbnN0YW50cyBmb3IgdmFsdWVzXG4gICAgc3RhdGljIERFRkFVTFRTID0ge1xuICAgICAgICBTSVBfUE9SVDogJzUwNjAnLFxuICAgICAgICBJQVhfUE9SVDogJzQ1NjknLFxuICAgICAgICBQQVNTV09SRF9MRU5HVEg6IDE2LFxuICAgICAgICBRVUFMSUZZX0ZSRVE6ICc2MCcsXG4gICAgICAgIFJFR0lTVFJBVElPTl9UWVBFOiAnb3V0Ym91bmQnLFxuICAgICAgICBEVE1GX01PREU6ICdhdXRvJyxcbiAgICAgICAgVFJBTlNQT1JUOiAnVURQJyxcbiAgICAgICAgTkVUV09SS19GSUxURVI6ICdub25lJ1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlclR5cGUgLSBUeXBlIG9mIHByb3ZpZGVyIChTSVAgb3IgSUFYKVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHByb3ZpZGVyVHlwZSkge1xuICAgICAgICB0aGlzLnByb3ZpZGVyVHlwZSA9IHByb3ZpZGVyVHlwZTtcbiAgICAgICAgLy8gQ2FjaGUgalF1ZXJ5IG9iamVjdHNcbiAgICAgICAgdGhpcy4kZm9ybU9iaiA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5GT1JNKTtcbiAgICAgICAgdGhpcy4kc2VjcmV0ID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLlNFQ1JFVCk7XG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuQ0hFQ0tCT1hFUyk7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuQUNDT1JESU9OUyk7XG4gICAgICAgIHRoaXMuJGRyb3BEb3ducyA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5EUk9QRE9XTlMpO1xuICAgICAgICB0aGlzLiRkZXNjcmlwdGlvbiA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5ERVNDUklQVElPTik7XG4gICAgICAgIHRoaXMuJG5ldHdvcmtGaWx0ZXJJZCA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5ORVRXT1JLX0ZJTFRFUl9JRCk7XG4gICAgICAgIHRoaXMuJHNob3dIaWRlUGFzc3dvcmQgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuU0hPV19ISURFX1BBU1NXT1JEKTtcbiAgICAgICAgdGhpcy4kZ2VuZXJhdGVQYXNzd29yZCA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5HRU5FUkFURV9QQVNTV09SRCk7XG4gICAgICAgIHRoaXMuJHBhc3N3b3JkVG9vbHRpcEljb24gPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuUEFTU1dPUkRfVE9PTFRJUF9JQ09OKTtcbiAgICAgICAgdGhpcy4kY2xpcGJvYXJkID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLkNMSVBCT0FSRCk7XG4gICAgICAgIHRoaXMuJHBvcHVwZWQgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuUE9QVVBFRCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmFjayBpZiB0aGlzIGlzIGEgbmV3IHByb3ZpZGVyIChub3QgZXhpc3RpbmcgaW4gZGF0YWJhc2UpXG4gICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gSG9zdCBpbnB1dCB2YWxpZGF0aW9uIHJlZ2V4XG4gICAgICAgIHRoaXMuaG9zdElucHV0VmFsaWRhdGlvbiA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAnXigoKFxcXFxkfFsxLTldXFxcXGR8MVxcXFxkezJ9fDJbMC00XVxcXFxkfDI1WzAtNV0pXFxcXC4pezN9J1xuICAgICAgICAgICAgKyAnKFxcXFxkfFsxLTldXFxcXGR8MVxcXFxkezJ9fDJbMC00XVxcXFxkfDI1WzAtNV0pJ1xuICAgICAgICAgICAgKyAnKFxcXFwvKFxcZHxbMS0yXVxcZHwzWzAtMl0pKT8nXG4gICAgICAgICAgICArICd8W2EtekEtWjAtOS1dezAsNjF9W2EtekEtWjAtOV0oPzpcXFxcLlthLXpBLVpdezIsfSkrKSQnLFxuICAgICAgICAgICAgJ2dtJ1xuICAgICAgICApO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIHByb3ZpZGVyIGZvcm1cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJCgnI2lkJykudmFsKCkgfHwgJyc7XG4gICAgICAgIGNvbnN0IGN1cnJlbnREZXNjcmlwdGlvbiA9IHRoaXMuJGRlc2NyaXB0aW9uLnZhbCgpIHx8ICcnO1xuICAgICAgICBcbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgcHJvdmlkZXJcbiAgICAgICAgLy8gTmV3IHByb3ZpZGVycyBoYXZlIGVtcHR5IElEIG9yICduZXcnIGFzIElEIGluIHRoZSBVUkxcbiAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gIXByb3ZpZGVySWQgfHwgcHJvdmlkZXJJZCA9PT0gJycgfHwgcHJvdmlkZXJJZCA9PT0gJ25ldyc7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGVhZGVyIGltbWVkaWF0ZWx5IGZvciBiZXR0ZXIgVVhcbiAgICAgICAgdGhpcy51cGRhdGVQYWdlSGVhZGVyKGN1cnJlbnREZXNjcmlwdGlvbik7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgdGhpcy5zaG93TG9hZGluZ1N0YXRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIHByb3ZpZGVyIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAgICBQcm92aWRlcnNBUEkuZ2V0UmVjb3JkKHByb3ZpZGVySWQsIHRoaXMucHJvdmlkZXJUeXBlLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRpbmdTdGF0ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBvcHVsYXRlRm9ybURhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVySWQgJiYgcHJvdmlkZXJJZCAhPT0gJ25ldycpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDb250aW51ZSB3aXRoIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKTtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcCBwb3B1cHMgYW5kIGNsaXBib2FyZFxuICAgICAgICAgICAgdGhpcy4kcG9wdXBlZC5wb3B1cCgpO1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplQ2xpcGJvYXJkKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgICAgICB0aGlzLiRzZWNyZXQub24oJ2ZvY3VzJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuJHNlY3JldC5hdHRyKCdhdXRvY29tcGxldGUnLCAnbmV3LXBhc3N3b3JkJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgdGhpcy4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuICAgICAgICB0aGlzLiRkcm9wRG93bnMuZHJvcGRvd24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQWNjb3JkaW9uKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGR5bmFtaWMgZHJvcGRvd25zXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93blxuICAgICAgICB0aGlzLmluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24oKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSByZWdpc3RyYXRpb24gdHlwZSBkcm9wZG93biBkeW5hbWljYWxseVxuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRmaWVsZCA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZScpO1xuICAgICAgICBpZiAoJGZpZWxkLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBpbnNpZGUgYSBkcm9wZG93biBzdHJ1Y3R1cmVcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nRHJvcGRvd24gPSAkZmllbGQuY2xvc2VzdCgnLnVpLmRyb3Bkb3duJyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdEcm9wZG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBBbHJlYWR5IGEgZHJvcGRvd24sIGp1c3QgZW5zdXJlIGl0J3MgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIGlmICghJGV4aXN0aW5nRHJvcGRvd24uaGFzQ2xhc3MoJ3JlZ2lzdHJhdGlvbi10eXBlLWRyb3Bkb3duJykpIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdEcm9wZG93bi5hZGRDbGFzcygncmVnaXN0cmF0aW9uLXR5cGUtZHJvcGRvd24nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZXJyb3JzXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnLnVpLmVycm9yLm1lc3NhZ2UnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcucHJvbXB0JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHRoaXMuZ2V0VmFsaWRhdGVSdWxlcygpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9ICRmaWVsZC52YWwoKSB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuUkVHSVNUUkFUSU9OX1RZUEU7XG4gICAgICAgIGNvbnN0IGlzSUFYID0gdGhpcy5wcm92aWRlclR5cGUgPT09ICdJQVgnO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgb3B0aW9ucyBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnb3V0Ym91bmQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGVbaXNJQVggPyAnaWF4X1JFR19UWVBFX09VVEJPVU5EJyA6ICdzaXBfUkVHX1RZUEVfT1VUQk9VTkQnXSB8fCAnT3V0Ym91bmQnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnaW5ib3VuZCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZVtpc0lBWCA/ICdpYXhfUkVHX1RZUEVfSU5CT1VORCcgOiAnc2lwX1JFR19UWVBFX0lOQk9VTkQnXSB8fCAnSW5ib3VuZCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdub25lJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlW2lzSUFYID8gJ2lheF9SRUdfVFlQRV9OT05FJyA6ICdzaXBfUkVHX1RZUEVfTk9ORSddIHx8ICdOb25lJyB9XG4gICAgICAgIF07XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gSFRNTFxuICAgICAgICBjb25zdCBkcm9wZG93bkh0bWwgPSBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VsZWN0aW9uIGRyb3Bkb3duIHJlZ2lzdHJhdGlvbi10eXBlLWRyb3Bkb3duXCI+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwicmVnaXN0cmF0aW9uX3R5cGVcIiBpZD1cInJlZ2lzdHJhdGlvbl90eXBlXCIgdmFsdWU9XCIke2N1cnJlbnRWYWx1ZX1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImRyb3Bkb3duIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRlZmF1bHQgdGV4dFwiPiR7b3B0aW9ucy5maW5kKG8gPT4gby52YWx1ZSA9PT0gY3VycmVudFZhbHVlKT8udGV4dCB8fCBjdXJyZW50VmFsdWV9PC9kaXY+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1lbnVcIj5cbiAgICAgICAgICAgICAgICAgICAgJHtvcHRpb25zLm1hcChvcHQgPT4gYDxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0LnZhbHVlfVwiPiR7b3B0LnRleHR9PC9kaXY+YCkuam9pbignJyl9XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlcGxhY2UgdGhlIGZpZWxkXG4gICAgICAgICRmaWVsZC5yZXBsYWNlV2l0aChkcm9wZG93bkh0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICAkKCcucmVnaXN0cmF0aW9uLXR5cGUtZHJvcGRvd24nKS5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICAvLyBDbGVhciB2YWxpZGF0aW9uIGVycm9yc1xuICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnLmZpZWxkJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcudWkuZXJyb3IubWVzc2FnZScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuJGZvcm1PYmouZmluZCgnLnByb21wdCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWNjb3JkaW9uIHdpdGggY2FsbGJhY2tzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjY29yZGlvbigpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMuYWNjb3JkaW9uKHtcbiAgICAgICAgICAgIG9uT3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGZpZWxkIHZpc2liaWxpdHkgd2hlbiBhY2NvcmRpb24gb3BlbnNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzZWxmLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gd2l0aCBzaW1wbGlmaWVkIGxvZ2ljXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bigpIHtcbiAgICAgICAgaWYgKHRoaXMuJG5ldHdvcmtGaWx0ZXJJZC5sZW5ndGggPT09IDApIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlIGZyb20gZGF0YSBhdHRyaWJ1dGUgKHNldCBieSBwb3B1bGF0ZUZvcm1EYXRhKSBvciBmb3JtIHZhbHVlIG9yIGRlZmF1bHRcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gdGhpcy4kbmV0d29ya0ZpbHRlcklkLmRhdGEoJ3ZhbHVlJykgfHwgdGhpcy4kbmV0d29ya0ZpbHRlcklkLnZhbCgpIHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5ORVRXT1JLX0ZJTFRFUjtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgd2l0aCBOZXR3b3JrRmlsdGVyc0FQSSB1c2luZyBzaW1wbGlmaWVkIGFwcHJvYWNoXG4gICAgICAgIE5ldHdvcmtGaWx0ZXJzQVBJLmluaXRpYWxpemVEcm9wZG93bih0aGlzLiRuZXR3b3JrRmlsdGVySWQsIHtcbiAgICAgICAgICAgIGN1cnJlbnRWYWx1ZSxcbiAgICAgICAgICAgIHByb3ZpZGVyVHlwZTogdGhpcy5wcm92aWRlclR5cGUsXG4gICAgICAgICAgICBvbkNoYW5nZTogKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXZlbnQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRXZlbnRIYW5kbGVycygpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGVhZGVyIHdoZW4gcHJvdmlkZXIgbmFtZSBjaGFuZ2VzXG4gICAgICAgIHRoaXMuJGRlc2NyaXB0aW9uLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgc2VsZi51cGRhdGVQYWdlSGVhZGVyKCQodGhpcykudmFsKCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgcGFzc3dvcmQgc3RyZW5ndGggaW5kaWNhdG9yXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVBhc3N3b3JkU3RyZW5ndGhJbmRpY2F0b3IoKTtcbiAgICAgICAgXG5cbiAgICAgICAgLy8gU2hvdy9oaWRlIHBhc3N3b3JkIHRvZ2dsZVxuICAgICAgICB0aGlzLiRzaG93SGlkZVBhc3N3b3JkLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkYnV0dG9uLmZpbmQoJ2knKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuJHNlY3JldC5hdHRyKCd0eXBlJykgPT09ICdwYXNzd29yZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IHBhc3N3b3JkXG4gICAgICAgICAgICAgICAgJGljb24ucmVtb3ZlQ2xhc3MoJ2V5ZScpLmFkZENsYXNzKCdleWUgc2xhc2gnKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRzZWNyZXQuYXR0cigndHlwZScsICd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgcGFzc3dvcmRcbiAgICAgICAgICAgICAgICAkaWNvbi5yZW1vdmVDbGFzcygnZXllIHNsYXNoJykuYWRkQ2xhc3MoJ2V5ZScpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHNlY3JldC5hdHRyKCd0eXBlJywgJ3Bhc3N3b3JkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIG5ldyBwYXNzd29yZFxuICAgICAgICB0aGlzLiRnZW5lcmF0ZVBhc3N3b3JkLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLmdlbmVyYXRlUGFzc3dvcmQoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjbGlwYm9hcmQgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVDbGlwYm9hcmQoKSB7XG4gICAgICAgIGNvbnN0IGNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUyhQcm92aWRlckJhc2UuU0VMRUNUT1JTLkNMSVBCT0FSRCk7XG4gICAgICAgIHRoaXMuJGNsaXBib2FyZC5wb3B1cCh7XG4gICAgICAgICAgICBvbjogJ21hbnVhbCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG4gICAgICAgICAgICAkKGUudHJpZ2dlcikucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICQoZS50cmlnZ2VyKS5wb3B1cCgnaGlkZScpO1xuICAgICAgICAgICAgfSwgMTUwMCk7XG4gICAgICAgICAgICBlLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNsaXBib2FyZC5vbignZXJyb3InLCAoZSkgPT4ge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5wcl9FcnJvck9uUHJvdmlkZXJTYXZlKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgYSBuZXcgcGFzc3dvcmRcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVBhc3N3b3JkKCkge1xuICAgICAgICBQYnhBcGkuUGFzc3dvcmRHZW5lcmF0ZShQcm92aWRlckJhc2UuREVGQVVMVFMuUEFTU1dPUkRfTEVOR1RILCAocGFzc3dvcmQpID0+IHtcbiAgICAgICAgICAgIGlmIChwYXNzd29yZCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJHNlY3JldC52YWwocGFzc3dvcmQpO1xuICAgICAgICAgICAgICAgIHRoaXMuJHNlY3JldC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgdGhpcy4kY2xpcGJvYXJkLmF0dHIoJ2RhdGEtY2xpcGJvYXJkLXRleHQnLCBwYXNzd29yZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHBhc3N3b3JkIHN0cmVuZ3RoIGluZGljYXRvclxuICAgICAgICAgICAgICAgIGNvbnN0ICRwYXNzd29yZFByb2dyZXNzID0gJCgnI3Bhc3N3b3JkLXN0cmVuZ3RoLXByb2dyZXNzJyk7XG4gICAgICAgICAgICAgICAgaWYgKCRwYXNzd29yZFByb2dyZXNzLmxlbmd0aCA+IDAgJiYgdHlwZW9mIFBhc3N3b3JkU2NvcmUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIFBhc3N3b3JkU2NvcmUuY2hlY2tQYXNzU3RyZW5ndGgoe1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFzczogcGFzc3dvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBiYXI6ICRwYXNzd29yZFByb2dyZXNzLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VjdGlvbjogJHBhc3N3b3JkUHJvZ3Jlc3NcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCBzdHJlbmd0aCBpbmRpY2F0b3IgYW5kIHZhbGlkYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRTdHJlbmd0aEluZGljYXRvcigpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZW5oYW5jZWQgcGFzc3dvcmQgdmFsaWRhdG9yIGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAodHlwZW9mIHByb3ZpZGVyUGFzc3dvcmRWYWxpZGF0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBwcm92aWRlclBhc3N3b3JkVmFsaWRhdG9yLmluaXRpYWxpemUodGhpcywge1xuICAgICAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjaGVja09uTG9hZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9ubHlHZW5lcmF0ZWQ6IGZhbHNlIC8vIFZhbGlkYXRlIGFsbCBwYXNzd29yZHMgZm9yIHByb3ZpZGVyc1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy4kc2VjcmV0Lmxlbmd0aCA+IDAgJiYgdHlwZW9mIFBhc3N3b3JkU2NvcmUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBiYXNpYyBwYXNzd29yZCBzdHJlbmd0aCBpbmRpY2F0b3JcbiAgICAgICAgICAgIC8vIENyZWF0ZSBwcm9ncmVzcyBiYXIgZm9yIHBhc3N3b3JkIHN0cmVuZ3RoIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgIGxldCAkcGFzc3dvcmRQcm9ncmVzcyA9ICQoJyNwYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzcycpO1xuICAgICAgICAgICAgaWYgKCRwYXNzd29yZFByb2dyZXNzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRzZWNyZXRGaWVsZCA9IHRoaXMuJHNlY3JldC5jbG9zZXN0KCcuZmllbGQnKTtcbiAgICAgICAgICAgICAgICAkcGFzc3dvcmRQcm9ncmVzcyA9ICQoJzxkaXYgY2xhc3M9XCJ1aSB0aW55IHByb2dyZXNzXCIgaWQ9XCJwYXNzd29yZC1zdHJlbmd0aC1wcm9ncmVzc1wiPjxkaXYgY2xhc3M9XCJiYXJcIj48L2Rpdj48L2Rpdj4nKTtcbiAgICAgICAgICAgICAgICAkc2VjcmV0RmllbGQuYXBwZW5kKCRwYXNzd29yZFByb2dyZXNzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBwcm9ncmVzcyBjb21wb25lbnRcbiAgICAgICAgICAgICRwYXNzd29yZFByb2dyZXNzLnByb2dyZXNzKHtcbiAgICAgICAgICAgICAgICBwZXJjZW50OiAwLFxuICAgICAgICAgICAgICAgIHNob3dBY3Rpdml0eTogZmFsc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcGFzc3dvcmQgc3RyZW5ndGggb24gaW5wdXQgd2l0aCBwcm92aWRlciBjb250ZXh0XG4gICAgICAgICAgICB0aGlzLiRzZWNyZXQub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIFBhc3N3b3JkU2NvcmUuY2hlY2tQYXNzU3RyZW5ndGgoe1xuICAgICAgICAgICAgICAgICAgICBwYXNzOiB0aGlzLiRzZWNyZXQudmFsKCksXG4gICAgICAgICAgICAgICAgICAgIGJhcjogJHBhc3N3b3JkUHJvZ3Jlc3MsXG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246ICRwYXNzd29yZFByb2dyZXNzLFxuICAgICAgICAgICAgICAgICAgICBmaWVsZDogJ3Byb3ZpZGVyX3NlY3JldCcgIC8vIFVzZSBwcm92aWRlciBjb250ZXh0IGZvciB2YWxpZGF0aW9uXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHByb3ZpZGVyIHNldHRpbmdzXG4gICAgICogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3Nlc1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHBhc3N3b3JkIHRvb2x0aXAgaWNvbiB3aGVuIGluICdub25lJyByZWdpc3RyYXRpb24gbW9kZVxuICAgICAqL1xuICAgIHNob3dQYXNzd29yZFRvb2x0aXAoKSB7XG4gICAgICAgIHRoaXMuJHBhc3N3b3JkVG9vbHRpcEljb24uc2hvdygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHBhc3N3b3JkIHRvb2x0aXAgaWNvblxuICAgICAqL1xuICAgIGhpZGVQYXNzd29yZFRvb2x0aXAoKSB7XG4gICAgICAgIHRoaXMuJHBhc3N3b3JkVG9vbHRpcEljb24uaGlkZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHByb3ZpZGVyIHNldHRpbmdzXG4gICAgICogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICAvLyBPdmVycmlkZSBpbiBjaGlsZCBjbGFzc2VzXG4gICAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCB2YWxpZGF0aW9uIGFuZCBjYWxsYmFja3NcbiAgICAgKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBvdmVycmlkZGVuIGluIHByb3ZpZGVyLW1vZGlmeS5qcyB0byBjb25maWd1cmUgUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIC8vIFVSTCBpcyBub3Qgc2V0IGhlcmUgLSBjaGlsZCBjbGFzc2VzIGNvbmZpZ3VyZSBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGhpcy5jYkJlZm9yZVNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gdGhpcy5jYkFmdGVyU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBNb2RpZmllZCBzZXR0aW5nc1xuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIC8vIElNUE9SVEFOVDogRG9uJ3Qgb3ZlcndyaXRlIHJlc3VsdC5kYXRhIC0gaXQgYWxyZWFkeSBjb250YWlucyBwcm9jZXNzZWQgY2hlY2tib3ggdmFsdWVzIGZyb20gRm9ybS5qc1xuICAgICAgICAvLyBXZSBzaG91bGQgb25seSBhZGQgb3IgbW9kaWZ5IHNwZWNpZmljIGZpZWxkc1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgcmVzdWx0LmRhdGEgaXMgbm90IGRlZmluZWQgKHNob3VsZG4ndCBoYXBwZW4pLCBpbml0aWFsaXplIGl0XG4gICAgICAgIGlmICghcmVzdWx0LmRhdGEpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5ldHdvcmsgZmlsdGVyIHZhbHVlIGlzIGF1dG9tYXRpY2FsbHkgaGFuZGxlZCBieSBmb3JtIHNlcmlhbGl6YXRpb25cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIENhbiBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICB9XG5cblxuICAgIFxuICAgIC8qKlxuICAgICAqIFNob3cgbG9hZGluZyBzdGF0ZSBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBzaG93TG9hZGluZ1N0YXRlKCkge1xuICAgICAgICB0aGlzLiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhpZGUgbG9hZGluZyBzdGF0ZSBmb3IgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBoaWRlTG9hZGluZ1N0YXRlKCkge1xuICAgICAgICB0aGlzLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIFxuICAgICAgICAvLyBDb21tb24gZmllbGRzXG4gICAgICAgIGlmIChkYXRhLmlkKSB7XG4gICAgICAgICAgICAkKCcjaWQnKS52YWwoZGF0YS5pZCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIHRoaXMuJGRlc2NyaXB0aW9uLnZhbChkYXRhLmRlc2NyaXB0aW9uKTtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwYWdlIGhlYWRlciB3aXRoIHByb3ZpZGVyIG5hbWUgYW5kIHR5cGVcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUGFnZUhlYWRlcihkYXRhLmRlc2NyaXB0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0YS5ub3RlKSB7XG4gICAgICAgICAgICAkKCcjbm90ZScpLnZhbChkYXRhLm5vdGUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBuZXR3b3JrIGZpbHRlciB2YWx1ZSBmb3IgbGF0ZXIgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgY29uc3QgbmV0d29ya0ZpbHRlclZhbHVlID0gZGF0YS5uZXR3b3JrZmlsdGVyaWQgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLk5FVFdPUktfRklMVEVSO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29tbW9uIHByb3ZpZGVyIGZpZWxkc1xuICAgICAgICAkKCcjdXNlcm5hbWUnKS52YWwoZGF0YS51c2VybmFtZSB8fCAnJyk7XG4gICAgICAgIHRoaXMuJHNlY3JldC52YWwoZGF0YS5zZWNyZXQgfHwgJycpO1xuICAgICAgICAkKCcjaG9zdCcpLnZhbChkYXRhLmhvc3QgfHwgJycpO1xuICAgICAgICAkKCcjcmVnaXN0cmF0aW9uX3R5cGUnKS52YWwoZGF0YS5yZWdpc3RyYXRpb25fdHlwZSB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuUkVHSVNUUkFUSU9OX1RZUEUpO1xuICAgICAgICAvLyBTdG9yZSB2YWx1ZSBpbiBkYXRhIGF0dHJpYnV0ZSBzaW5jZSBzZWxlY3QgaXMgZW1wdHkgYW5kIGNhbid0IGhvbGQgdmFsdWVcbiAgICAgICAgdGhpcy4kbmV0d29ya0ZpbHRlcklkLmRhdGEoJ3ZhbHVlJywgbmV0d29ya0ZpbHRlclZhbHVlKTtcbiAgICAgICAgJCgnI21hbnVhbGF0dHJpYnV0ZXMnKS52YWwoZGF0YS5tYW51YWxhdHRyaWJ1dGVzIHx8ICcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBkZWZhdWx0IHBvcnRzIGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgaWYgKHRoaXMucHJvdmlkZXJUeXBlID09PSAnU0lQJykge1xuICAgICAgICAgICAgJCgnI3BvcnQnKS52YWwoZGF0YS5wb3J0IHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5TSVBfUE9SVCk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdJQVgnKSB7XG4gICAgICAgICAgICAkKCcjcG9ydCcpLnZhbChkYXRhLnBvcnQgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLklBWF9QT1JUKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29tbW9uIGNoZWNrYm94ZXMgLSBoYW5kbGUgYm90aCBzdHJpbmcgJzEnIGFuZCBib29sZWFuIHRydWVcbiAgICAgICAgaWYgKGRhdGEucXVhbGlmeSA9PT0gJzEnIHx8IGRhdGEucXVhbGlmeSA9PT0gdHJ1ZSkgJCgnI3F1YWxpZnknKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgIGlmIChkYXRhLnJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoID09PSAnMScgfHwgZGF0YS5yZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCA9PT0gdHJ1ZSkgJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykucHJvcCgnY2hlY2tlZCcsIHRydWUpO1xuICAgICAgICBpZiAoZGF0YS5ub3JlZ2lzdGVyID09PSAnMScgfHwgZGF0YS5ub3JlZ2lzdGVyID09PSB0cnVlKSAkKCcjbm9yZWdpc3RlcicpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGVkIHN0YXRlXG4gICAgICAgIGlmIChkYXRhLmRpc2FibGVkID09PSAnMScgfHwgZGF0YS5kaXNhYmxlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgJCgnI2Rpc2FibGVkJykudmFsKCcxJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBzIGZyb20gc3RydWN0dXJlZCBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gVG9vbHRpcCBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdG9vbHRpcFxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudCh0b29sdGlwRGF0YSkge1xuICAgICAgICByZXR1cm4gVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggcHJvdmlkZXIgbmFtZSBhbmQgdHlwZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlck5hbWUgLSBQcm92aWRlciBuYW1lXG4gICAgICovXG4gICAgdXBkYXRlUGFnZUhlYWRlcihwcm92aWRlck5hbWUpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJUeXBlVGV4dCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnU0lQJyA/ICdTSVAnIDogJ0lBWCc7XG4gICAgICAgIGxldCBoZWFkZXJUZXh0O1xuICAgICAgICBcbiAgICAgICAgaWYgKHByb3ZpZGVyTmFtZSAmJiBwcm92aWRlck5hbWUudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgLy8gRXhpc3RpbmcgcHJvdmlkZXIgd2l0aCBuYW1lXG4gICAgICAgICAgICBoZWFkZXJUZXh0ID0gYCR7cHJvdmlkZXJOYW1lfSAoJHtwcm92aWRlclR5cGVUZXh0fSlgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTmV3IHByb3ZpZGVyIG9yIG5vIG5hbWVcbiAgICAgICAgICAgIGNvbnN0IG5ld1Byb3ZpZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXdQcm92aWRlciB8fCAnTmV3IFByb3ZpZGVyJztcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBgJHtuZXdQcm92aWRlclRleHR9ICgke3Byb3ZpZGVyVHlwZVRleHR9KWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBtYWluIGhlYWRlciBjb250ZW50XG4gICAgICAgICQoJ2gxIC5jb250ZW50JykudGV4dChoZWFkZXJUZXh0KTtcbiAgICB9XG59Il19