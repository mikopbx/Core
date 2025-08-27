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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, NetworkFiltersAPI, NetworkFilterSelector, TooltipBuilder, PasswordScore, i18n, ProvidersAPI, PasswordWidget */

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
    this.$passwordTooltipIcon = $(ProviderBase.SELECTORS.PASSWORD_TOOLTIP_ICON);
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


        _this.initializeUIComponents(); // Initialize network filter dropdown after data is loaded


        var networkFilterValue = response.result && response.data ? response.data.networkfilterid : null;

        _this.initializeNetworkFilterDropdown(networkFilterValue);

        _this.initializeEventHandlers();

        _this.initializeForm();

        _this.updateVisibilityElements(); // Initialize tooltip popups


        _this.$popuped.popup(); // Prevent browser password manager for generated passwords


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
      this.$checkBoxes.checkbox(); // Initialize dropdowns except network filter (handled by NetworkFilterSelector)

      this.$dropDowns.not('#networkfilterid-dropdown').dropdown();
      this.initializeAccordion(); // Initialize dynamic dropdowns

      this.initializeRegistrationTypeDropdown(); // Network filter dropdown is initialized after data is loaded
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
     * @param {string} networkFilterValue - Current network filter value from API
     */

  }, {
    key: "initializeNetworkFilterDropdown",
    value: function initializeNetworkFilterDropdown() {
      var networkFilterValue = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      if (this.$networkFilterId.length === 0) return; // Use provided value or get from hidden field or default

      var currentValue = networkFilterValue || $('#networkfilterid').val() || ProviderBase.DEFAULTS.NETWORK_FILTER; // Set hidden field value before initialization

      $('#networkfilterid').val(currentValue); // Initialize with NetworkFilterSelector

      NetworkFilterSelector.init(this.$networkFilterId, {
        filterType: this.providerType,
        // 'SIP' or 'IAX'
        currentValue: currentValue,
        includeNone: false,
        // Providers don't have "None" option, they use specific filters
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
      var self = this; // Update header when provider name changes

      this.$description.on('input', function () {
        self.updatePageHeader($(this).val());
      }); // Initialize password widget

      this.initializePasswordWidget();
    }
    /**
     * Initialize password widget with default configuration
     */

  }, {
    key: "initializePasswordWidget",
    value: function initializePasswordWidget() {
      // Initialize the password widget with default configuration
      if (this.$secret.length > 0) {
        // Hide legacy HTML buttons - PasswordWidget will manage its own buttons
        $('.clipboard').hide();
        $('#show-hide-password').hide(); // Default configuration for providers - will be updated based on registration type

        var widget = PasswordWidget.init(this.$secret, {
          validation: PasswordWidget.VALIDATION.SOFT,
          generateButton: true,
          showPasswordButton: true,
          // Will be updated based on registration type
          clipboardButton: true,
          // Keep copy button for all modes
          showStrengthBar: true,
          showWarnings: true,
          validateOnInput: true,
          checkOnLoad: false,
          // Don't validate on load, let updateVisibilityElements handle it
          minScore: 60,
          generateLength: 32 // Provider passwords should be 32 chars for better security

        }); // Store widget instance for later use

        this.passwordWidget = widget; // Update visibility elements now that widget is initialized
        // This will apply the correct configuration based on registration type

        if (typeof this.updateVisibilityElements === 'function') {
          this.updateVisibilityElements();
        }
      }
    }
    /**
     * Update visibility of elements based on provider settings
     * This method should be overridden in child classes
     */

  }, {
    key: "updateVisibilityElements",
    value: function updateVisibilityElements() {// Override in child classes to configure PasswordWidget based on registration type
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
      // These checkboxes use standard HTML checkbox behavior


      $('#qualify').prop('checked', data.qualify === '1' || data.qualify === true);
      $('#receive_calls_without_auth').prop('checked', data.receive_calls_without_auth === '1' || data.receive_calls_without_auth === true);
      $('#noregister').prop('checked', data.noregister === '1' || data.noregister === true); // Disabled state - this is a hidden field, not a checkbox

      $('#disabled').val(data.disabled ? '1' : '0');
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
  NETWORK_FILTER_ID: '#networkfilterid-dropdown',
  PASSWORD_TOOLTIP_ICON: '.password-tooltip-icon',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiU0VMRUNUT1JTIiwiRk9STSIsIiRzZWNyZXQiLCJTRUNSRVQiLCIkY2hlY2tCb3hlcyIsIkNIRUNLQk9YRVMiLCIkYWNjb3JkaW9ucyIsIkFDQ09SRElPTlMiLCIkZHJvcERvd25zIiwiRFJPUERPV05TIiwiJGRlc2NyaXB0aW9uIiwiREVTQ1JJUFRJT04iLCIkbmV0d29ya0ZpbHRlcklkIiwiTkVUV09SS19GSUxURVJfSUQiLCIkcGFzc3dvcmRUb29sdGlwSWNvbiIsIlBBU1NXT1JEX1RPT0xUSVBfSUNPTiIsIiRwb3B1cGVkIiwiUE9QVVBFRCIsImlzTmV3UHJvdmlkZXIiLCJob3N0SW5wdXRWYWxpZGF0aW9uIiwiUmVnRXhwIiwicHJvdmlkZXJJZCIsInZhbCIsImN1cnJlbnREZXNjcmlwdGlvbiIsInVwZGF0ZVBhZ2VIZWFkZXIiLCJzaG93TG9hZGluZ1N0YXRlIiwiUHJvdmlkZXJzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJoaWRlTG9hZGluZ1N0YXRlIiwicmVzdWx0IiwiZGF0YSIsInBvcHVsYXRlRm9ybURhdGEiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyIsIm5ldHdvcmtGaWx0ZXJWYWx1ZSIsIm5ldHdvcmtmaWx0ZXJpZCIsImluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24iLCJpbml0aWFsaXplRXZlbnRIYW5kbGVycyIsImluaXRpYWxpemVGb3JtIiwidXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzIiwicG9wdXAiLCJvbiIsImF0dHIiLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5pdGlhbGl6ZUFjY29yZGlvbiIsImluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlRHJvcGRvd24iLCIkZmllbGQiLCJsZW5ndGgiLCIkZXhpc3RpbmdEcm9wZG93biIsImNsb3Nlc3QiLCJoYXNDbGFzcyIsImFkZENsYXNzIiwib25DaGFuZ2UiLCJ2YWx1ZSIsImZpbmQiLCJyZW1vdmVDbGFzcyIsInJlbW92ZSIsIkZvcm0iLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2V0VmFsaWRhdGVSdWxlcyIsImRhdGFDaGFuZ2VkIiwiY3VycmVudFZhbHVlIiwiREVGQVVMVFMiLCJSRUdJU1RSQVRJT05fVFlQRSIsImlzSUFYIiwib3B0aW9ucyIsInRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJkcm9wZG93bkh0bWwiLCJvIiwibWFwIiwib3B0Iiwiam9pbiIsInJlcGxhY2VXaXRoIiwic2VsZiIsImFjY29yZGlvbiIsIm9uT3BlbiIsInNldFRpbWVvdXQiLCJORVRXT1JLX0ZJTFRFUiIsIk5ldHdvcmtGaWx0ZXJTZWxlY3RvciIsImluaXQiLCJmaWx0ZXJUeXBlIiwiaW5jbHVkZU5vbmUiLCJpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQiLCJoaWRlIiwid2lkZ2V0IiwiUGFzc3dvcmRXaWRnZXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsInBhc3N3b3JkV2lkZ2V0Iiwic2hvdyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiaW5pdGlhbGl6ZSIsInNldHRpbmdzIiwiZm9ybSIsImlkIiwiZGVzY3JpcHRpb24iLCJub3RlIiwidXNlcm5hbWUiLCJzZWNyZXQiLCJob3N0IiwicmVnaXN0cmF0aW9uX3R5cGUiLCJtYW51YWxhdHRyaWJ1dGVzIiwicG9ydCIsIlNJUF9QT1JUIiwiSUFYX1BPUlQiLCJwcm9wIiwicXVhbGlmeSIsInJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIiwibm9yZWdpc3RlciIsImRpc2FibGVkIiwidG9vbHRpcERhdGEiLCJUb29sdGlwQnVpbGRlciIsImJ1aWxkQ29udGVudCIsInByb3ZpZGVyTmFtZSIsInByb3ZpZGVyVHlwZVRleHQiLCJoZWFkZXJUZXh0IiwidHJpbSIsIm5ld1Byb3ZpZGVyVGV4dCIsInByX05ld1Byb3ZpZGVyIiwiUEFTU1dPUkRfTEVOR1RIIiwiUVVBTElGWV9GUkVRIiwiRFRNRl9NT0RFIiwiVFJBTlNQT1JUIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtJQUNNQSxZO0FBQ0Y7QUFhQTs7QUFZQTtBQUNKO0FBQ0E7QUFDQTtBQUNJLHdCQUFZQyxZQUFaLEVBQTBCO0FBQUE7O0FBQ3RCLFNBQUtBLFlBQUwsR0FBb0JBLFlBQXBCLENBRHNCLENBRXRCOztBQUNBLFNBQUtDLFFBQUwsR0FBZ0JDLENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCQyxJQUF4QixDQUFqQjtBQUNBLFNBQUtDLE9BQUwsR0FBZUgsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJHLE1BQXhCLENBQWhCO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQkwsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJLLFVBQXhCLENBQXBCO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQlAsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJPLFVBQXhCLENBQXBCO0FBQ0EsU0FBS0MsVUFBTCxHQUFrQlQsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJTLFNBQXhCLENBQW5CO0FBQ0EsU0FBS0MsWUFBTCxHQUFvQlgsQ0FBQyxDQUFDSCxZQUFZLENB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a29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBDbGlwYm9hcmRKUywgTmV0d29ya0ZpbHRlcnNBUEksIE5ldHdvcmtGaWx0ZXJTZWxlY3RvciwgVG9vbHRpcEJ1aWxkZXIsIFBhc3N3b3JkU2NvcmUsIGkxOG4sIFByb3ZpZGVyc0FQSSwgUGFzc3dvcmRXaWRnZXQgKi9cblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBwcm92aWRlciBtYW5hZ2VtZW50IGZvcm1zXG4gKiBAY2xhc3MgUHJvdmlkZXJCYXNlXG4gKi9cbmNsYXNzIFByb3ZpZGVyQmFzZSB7XG4gICAgLy8gQ2xhc3MgY29uc3RhbnRzIGZvciBzZWxlY3RvcnNcbiAgICBzdGF0aWMgU0VMRUNUT1JTID0ge1xuICAgICAgICBGT1JNOiAnI3NhdmUtcHJvdmlkZXItZm9ybScsXG4gICAgICAgIFNFQ1JFVDogJyNzZWNyZXQnLFxuICAgICAgICBDSEVDS0JPWEVTOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAuY2hlY2tib3gnLFxuICAgICAgICBBQ0NPUkRJT05TOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuYWNjb3JkaW9uJyxcbiAgICAgICAgRFJPUERPV05TOiAnI3NhdmUtcHJvdmlkZXItZm9ybSAudWkuZHJvcGRvd24nLFxuICAgICAgICBERVNDUklQVElPTjogJyNkZXNjcmlwdGlvbicsXG4gICAgICAgIE5FVFdPUktfRklMVEVSX0lEOiAnI25ldHdvcmtmaWx0ZXJpZC1kcm9wZG93bicsXG4gICAgICAgIFBBU1NXT1JEX1RPT0xUSVBfSUNPTjogJy5wYXNzd29yZC10b29sdGlwLWljb24nLFxuICAgICAgICBQT1BVUEVEOiAnLnBvcHVwZWQnXG4gICAgfTtcblxuICAgIC8vIENsYXNzIGNvbnN0YW50cyBmb3IgdmFsdWVzXG4gICAgc3RhdGljIERFRkFVTFRTID0ge1xuICAgICAgICBTSVBfUE9SVDogJzUwNjAnLFxuICAgICAgICBJQVhfUE9SVDogJzQ1NjknLFxuICAgICAgICBQQVNTV09SRF9MRU5HVEg6IDE2LFxuICAgICAgICBRVUFMSUZZX0ZSRVE6ICc2MCcsXG4gICAgICAgIFJFR0lTVFJBVElPTl9UWVBFOiAnb3V0Ym91bmQnLFxuICAgICAgICBEVE1GX01PREU6ICdhdXRvJyxcbiAgICAgICAgVFJBTlNQT1JUOiAnVURQJyxcbiAgICAgICAgTkVUV09SS19GSUxURVI6ICdub25lJ1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlclR5cGUgLSBUeXBlIG9mIHByb3ZpZGVyIChTSVAgb3IgSUFYKVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHByb3ZpZGVyVHlwZSkge1xuICAgICAgICB0aGlzLnByb3ZpZGVyVHlwZSA9IHByb3ZpZGVyVHlwZTtcbiAgICAgICAgLy8gQ2FjaGUgalF1ZXJ5IG9iamVjdHNcbiAgICAgICAgdGhpcy4kZm9ybU9iaiA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5GT1JNKTtcbiAgICAgICAgdGhpcy4kc2VjcmV0ID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLlNFQ1JFVCk7XG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuQ0hFQ0tCT1hFUyk7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuQUNDT1JESU9OUyk7XG4gICAgICAgIHRoaXMuJGRyb3BEb3ducyA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5EUk9QRE9XTlMpO1xuICAgICAgICB0aGlzLiRkZXNjcmlwdGlvbiA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5ERVNDUklQVElPTik7XG4gICAgICAgIHRoaXMuJG5ldHdvcmtGaWx0ZXJJZCA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5ORVRXT1JLX0ZJTFRFUl9JRCk7XG4gICAgICAgIHRoaXMuJHBhc3N3b3JkVG9vbHRpcEljb24gPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuUEFTU1dPUkRfVE9PTFRJUF9JQ09OKTtcbiAgICAgICAgdGhpcy4kcG9wdXBlZCA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5QT1BVUEVEKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyYWNrIGlmIHRoaXMgaXMgYSBuZXcgcHJvdmlkZXIgKG5vdCBleGlzdGluZyBpbiBkYXRhYmFzZSlcbiAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBIb3N0IGlucHV0IHZhbGlkYXRpb24gcmVnZXhcbiAgICAgICAgdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgICdeKCgoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSlcXFxcLil7M30nXG4gICAgICAgICAgICArICcoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSknXG4gICAgICAgICAgICArICcoXFxcXC8oXFxkfFsxLTJdXFxkfDNbMC0yXSkpPydcbiAgICAgICAgICAgICsgJ3xbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSg/OlxcXFwuW2EtekEtWl17Mix9KSspJCcsXG4gICAgICAgICAgICAnZ20nXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNvbnN0IHByb3ZpZGVySWQgPSAkKCcjaWQnKS52YWwoKSB8fCAnJztcbiAgICAgICAgY29uc3QgY3VycmVudERlc2NyaXB0aW9uID0gdGhpcy4kZGVzY3JpcHRpb24udmFsKCkgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyBwcm92aWRlclxuICAgICAgICAvLyBOZXcgcHJvdmlkZXJzIGhhdmUgZW1wdHkgSUQgb3IgJ25ldycgYXMgSUQgaW4gdGhlIFVSTFxuICAgICAgICB0aGlzLmlzTmV3UHJvdmlkZXIgPSAhcHJvdmlkZXJJZCB8fCBwcm92aWRlcklkID09PSAnJyB8fCBwcm92aWRlcklkID09PSAnbmV3JztcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgaW1tZWRpYXRlbHkgZm9yIGJldHRlciBVWFxuICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VIZWFkZXIoY3VycmVudERlc2NyaXB0aW9uKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICB0aGlzLnNob3dMb2FkaW5nU3RhdGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgcHJvdmlkZXIgZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICAgIFByb3ZpZGVyc0FQSS5nZXRSZWNvcmQocHJvdmlkZXJJZCwgdGhpcy5wcm92aWRlclR5cGUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGluZ1N0YXRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHRoaXMucG9wdWxhdGVGb3JtRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXJJZCAmJiBwcm92aWRlcklkICE9PSAnbmV3Jykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENvbnRpbnVlIHdpdGggaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIG5ldHdvcmsgZmlsdGVyIGRyb3Bkb3duIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrRmlsdGVyVmFsdWUgPSByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSA/IFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEubmV0d29ya2ZpbHRlcmlkIDogbnVsbDtcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bihuZXR3b3JrRmlsdGVyVmFsdWUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVFdmVudEhhbmRsZXJzKCk7XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXAgcG9wdXBzXG4gICAgICAgICAgICB0aGlzLiRwb3B1cGVkLnBvcHVwKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgICAgICB0aGlzLiRzZWNyZXQub24oJ2ZvY3VzJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuJHNlY3JldC5hdHRyKCdhdXRvY29tcGxldGUnLCAnbmV3LXBhc3N3b3JkJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBjb21wb25lbnRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpIHtcbiAgICAgICAgdGhpcy4kY2hlY2tCb3hlcy5jaGVja2JveCgpO1xuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3ducyBleGNlcHQgbmV0d29yayBmaWx0ZXIgKGhhbmRsZWQgYnkgTmV0d29ya0ZpbHRlclNlbGVjdG9yKVxuICAgICAgICB0aGlzLiRkcm9wRG93bnMubm90KCcjbmV0d29ya2ZpbHRlcmlkLWRyb3Bkb3duJykuZHJvcGRvd24oKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQWNjb3JkaW9uKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGR5bmFtaWMgZHJvcGRvd25zXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpO1xuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciBkcm9wZG93biBpcyBpbml0aWFsaXplZCBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGRyb3Bkb3duIGR5bmFtaWNhbGx5XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGZpZWxkID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlJyk7XG4gICAgICAgIGlmICgkZmllbGQubGVuZ3RoID09PSAwKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IGluc2lkZSBhIGRyb3Bkb3duIHN0cnVjdHVyZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdEcm9wZG93biA9ICRmaWVsZC5jbG9zZXN0KCcudWkuZHJvcGRvd24nKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ0Ryb3Bkb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEFscmVhZHkgYSBkcm9wZG93biwganVzdCBlbnN1cmUgaXQncyBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkZXhpc3RpbmdEcm9wZG93bi5oYXNDbGFzcygncmVnaXN0cmF0aW9uLXR5cGUtZHJvcGRvd24nKSkge1xuICAgICAgICAgICAgICAgICRleGlzdGluZ0Ryb3Bkb3duLmFkZENsYXNzKCdyZWdpc3RyYXRpb24tdHlwZS1kcm9wZG93bicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGV4aXN0aW5nRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgdmFsaWRhdGlvbiBlcnJvcnNcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcudWkuZXJyb3IubWVzc2FnZScpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy5wcm9tcHQnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudFZhbHVlID0gJGZpZWxkLnZhbCgpIHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5SRUdJU1RSQVRJT05fVFlQRTtcbiAgICAgICAgY29uc3QgaXNJQVggPSB0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCc7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBvcHRpb25zIGJhc2VkIG9uIHByb3ZpZGVyIHR5cGVcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICdvdXRib3VuZCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZVtpc0lBWCA/ICdpYXhfUkVHX1RZUEVfT1VUQk9VTkQnIDogJ3NpcF9SRUdfVFlQRV9PVVRCT1VORCddIHx8ICdPdXRib3VuZCcgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdpbmJvdW5kJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlW2lzSUFYID8gJ2lheF9SRUdfVFlQRV9JTkJPVU5EJyA6ICdzaXBfUkVHX1RZUEVfSU5CT1VORCddIHx8ICdJbmJvdW5kJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ25vbmUnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGVbaXNJQVggPyAnaWF4X1JFR19UWVBFX05PTkUnIDogJ3NpcF9SRUdfVFlQRV9OT05FJ10gfHwgJ05vbmUnIH1cbiAgICAgICAgXTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBIVE1MXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSHRtbCA9IGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWxlY3Rpb24gZHJvcGRvd24gcmVnaXN0cmF0aW9uLXR5cGUtZHJvcGRvd25cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJyZWdpc3RyYXRpb25fdHlwZVwiIGlkPVwicmVnaXN0cmF0aW9uX3R5cGVcIiB2YWx1ZT1cIiR7Y3VycmVudFZhbHVlfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGVmYXVsdCB0ZXh0XCI+JHtvcHRpb25zLmZpbmQobyA9PiBvLnZhbHVlID09PSBjdXJyZW50VmFsdWUpPy50ZXh0IHx8IGN1cnJlbnRWYWx1ZX08L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWVudVwiPlxuICAgICAgICAgICAgICAgICAgICAke29wdGlvbnMubWFwKG9wdCA9PiBgPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHQudmFsdWV9XCI+JHtvcHQudGV4dH08L2Rpdj5gKS5qb2luKCcnKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVwbGFjZSB0aGUgZmllbGRcbiAgICAgICAgJGZpZWxkLnJlcGxhY2VXaXRoKGRyb3Bkb3duSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICAgICQoJy5yZWdpc3RyYXRpb24tdHlwZS1kcm9wZG93bicpLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIHZhbGlkYXRpb24gZXJyb3JzXG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICAgICAgICAgICAgICB0aGlzLiRmb3JtT2JqLmZpbmQoJy51aS5lcnJvci5tZXNzYWdlJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy4kZm9ybU9iai5maW5kKCcucHJvbXB0JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhY2NvcmRpb24gd2l0aCBjYWxsYmFja3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNjb3JkaW9uKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy4kYWNjb3JkaW9ucy5hY2NvcmRpb24oe1xuICAgICAgICAgICAgb25PcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZmllbGQgdmlzaWJpbGl0eSB3aGVuIGFjY29yZGlvbiBvcGVuc1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHNlbGYudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93biB3aXRoIHNpbXBsaWZpZWQgbG9naWNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV0d29ya0ZpbHRlclZhbHVlIC0gQ3VycmVudCBuZXR3b3JrIGZpbHRlciB2YWx1ZSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24obmV0d29ya0ZpbHRlclZhbHVlID0gbnVsbCkge1xuICAgICAgICBpZiAodGhpcy4kbmV0d29ya0ZpbHRlcklkLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gVXNlIHByb3ZpZGVkIHZhbHVlIG9yIGdldCBmcm9tIGhpZGRlbiBmaWVsZCBvciBkZWZhdWx0XG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IG5ldHdvcmtGaWx0ZXJWYWx1ZSB8fCAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKCkgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLk5FVFdPUktfRklMVEVSO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGhpZGRlbiBmaWVsZCB2YWx1ZSBiZWZvcmUgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChjdXJyZW50VmFsdWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB3aXRoIE5ldHdvcmtGaWx0ZXJTZWxlY3RvclxuICAgICAgICBOZXR3b3JrRmlsdGVyU2VsZWN0b3IuaW5pdCh0aGlzLiRuZXR3b3JrRmlsdGVySWQsIHtcbiAgICAgICAgICAgIGZpbHRlclR5cGU6IHRoaXMucHJvdmlkZXJUeXBlLCAvLyAnU0lQJyBvciAnSUFYJ1xuICAgICAgICAgICAgY3VycmVudFZhbHVlOiBjdXJyZW50VmFsdWUsXG4gICAgICAgICAgICBpbmNsdWRlTm9uZTogZmFsc2UsICAvLyBQcm92aWRlcnMgZG9uJ3QgaGF2ZSBcIk5vbmVcIiBvcHRpb24sIHRoZXkgdXNlIHNwZWNpZmljIGZpbHRlcnNcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgd2hlbiBwcm92aWRlciBuYW1lIGNoYW5nZXNcbiAgICAgICAgdGhpcy4kZGVzY3JpcHRpb24ub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZVBhZ2VIZWFkZXIoJCh0aGlzKS52YWwoKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXRcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoKTtcbiAgICB9XG5cblxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0IHdpdGggZGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0KCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBwYXNzd29yZCB3aWRnZXQgd2l0aCBkZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKHRoaXMuJHNlY3JldC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBIaWRlIGxlZ2FjeSBIVE1MIGJ1dHRvbnMgLSBQYXNzd29yZFdpZGdldCB3aWxsIG1hbmFnZSBpdHMgb3duIGJ1dHRvbnNcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJykuaGlkZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEZWZhdWx0IGNvbmZpZ3VyYXRpb24gZm9yIHByb3ZpZGVycyAtIHdpbGwgYmUgdXBkYXRlZCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICAgICAgY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdCh0aGlzLiRzZWNyZXQsIHtcbiAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlQsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLCAgLy8gV2lsbCBiZSB1cGRhdGVkIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLCAgICAgIC8vIEtlZXAgY29weSBidXR0b24gZm9yIGFsbCBtb2Rlc1xuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiBmYWxzZSwgLy8gRG9uJ3QgdmFsaWRhdGUgb24gbG9hZCwgbGV0IHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cyBoYW5kbGUgaXRcbiAgICAgICAgICAgICAgICBtaW5TY29yZTogNjAsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDMyIC8vIFByb3ZpZGVyIHBhc3N3b3JkcyBzaG91bGQgYmUgMzIgY2hhcnMgZm9yIGJldHRlciBzZWN1cml0eVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIHdpZGdldCBpbnN0YW5jZSBmb3IgbGF0ZXIgdXNlXG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0ID0gd2lkZ2V0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgdmlzaWJpbGl0eSBlbGVtZW50cyBub3cgdGhhdCB3aWRnZXQgaXMgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIC8vIFRoaXMgd2lsbCBhcHBseSB0aGUgY29ycmVjdCBjb25maWd1cmF0aW9uIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHByb3ZpZGVyIHNldHRpbmdzXG4gICAgICogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3NlcyB0byBjb25maWd1cmUgUGFzc3dvcmRXaWRnZXQgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBwYXNzd29yZCB0b29sdGlwIGljb24gd2hlbiBpbiAnbm9uZScgcmVnaXN0cmF0aW9uIG1vZGVcbiAgICAgKi9cbiAgICBzaG93UGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uLnNob3coKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBwYXNzd29yZCB0b29sdGlwIGljb25cbiAgICAgKi9cbiAgICBoaWRlUGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uLmhpZGUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBwcm92aWRlciBzZXR0aW5nc1xuICAgICAqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgLy8gT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggdmFsaWRhdGlvbiBhbmQgY2FsbGJhY2tzXG4gICAgICogTm90ZTogVGhpcyBtZXRob2QgaXMgb3ZlcnJpZGRlbiBpbiBwcm92aWRlci1tb2RpZnkuanMgdG8gY29uZmlndXJlIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICAvLyBVUkwgaXMgbm90IHNldCBoZXJlIC0gY2hpbGQgY2xhc3NlcyBjb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge29iamVjdH0gTW9kaWZpZWQgc2V0dGluZ3NcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBJTVBPUlRBTlQ6IERvbid0IG92ZXJ3cml0ZSByZXN1bHQuZGF0YSAtIGl0IGFscmVhZHkgY29udGFpbnMgcHJvY2Vzc2VkIGNoZWNrYm94IHZhbHVlcyBmcm9tIEZvcm0uanNcbiAgICAgICAgLy8gV2Ugc2hvdWxkIG9ubHkgYWRkIG9yIG1vZGlmeSBzcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgXG4gICAgICAgIC8vIElmIHJlc3VsdC5kYXRhIGlzIG5vdCBkZWZpbmVkIChzaG91bGRuJ3QgaGFwcGVuKSwgaW5pdGlhbGl6ZSBpdFxuICAgICAgICBpZiAoIXJlc3VsdC5kYXRhKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciB2YWx1ZSBpcyBhdXRvbWF0aWNhbGx5IGhhbmRsZWQgYnkgZm9ybSBzZXJpYWxpemF0aW9uXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzXG4gICAgfVxuXG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRpbmcgc3RhdGUgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgc2hvd0xvYWRpbmdTdGF0ZSgpIHtcbiAgICAgICAgdGhpcy4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIGxvYWRpbmcgc3RhdGUgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgaGlkZUxvYWRpbmdTdGF0ZSgpIHtcbiAgICAgICAgdGhpcy4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBcbiAgICAgICAgLy8gQ29tbW9uIGZpZWxkc1xuICAgICAgICBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgJCgnI2lkJykudmFsKGRhdGEuaWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLiRkZXNjcmlwdGlvbi52YWwoZGF0YS5kZXNjcmlwdGlvbik7XG4gICAgICAgICAgICAvLyBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCBwcm92aWRlciBuYW1lIGFuZCB0eXBlXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VIZWFkZXIoZGF0YS5kZXNjcmlwdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEubm90ZSkge1xuICAgICAgICAgICAgJCgnI25vdGUnKS52YWwoZGF0YS5ub3RlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgbmV0d29yayBmaWx0ZXIgdmFsdWUgZm9yIGxhdGVyIGluaXRpYWxpemF0aW9uXG4gICAgICAgIGNvbnN0IG5ldHdvcmtGaWx0ZXJWYWx1ZSA9IGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5ORVRXT1JLX0ZJTFRFUjtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbW1vbiBwcm92aWRlciBmaWVsZHNcbiAgICAgICAgJCgnI3VzZXJuYW1lJykudmFsKGRhdGEudXNlcm5hbWUgfHwgJycpO1xuICAgICAgICB0aGlzLiRzZWNyZXQudmFsKGRhdGEuc2VjcmV0IHx8ICcnKTtcbiAgICAgICAgJCgnI2hvc3QnKS52YWwoZGF0YS5ob3N0IHx8ICcnKTtcbiAgICAgICAgJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKGRhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgUHJvdmlkZXJCYXNlLkRFRkFVTFRTLlJFR0lTVFJBVElPTl9UWVBFKTtcbiAgICAgICAgLy8gU3RvcmUgdmFsdWUgaW4gZGF0YSBhdHRyaWJ1dGUgc2luY2Ugc2VsZWN0IGlzIGVtcHR5IGFuZCBjYW4ndCBob2xkIHZhbHVlXG4gICAgICAgIHRoaXMuJG5ldHdvcmtGaWx0ZXJJZC5kYXRhKCd2YWx1ZScsIG5ldHdvcmtGaWx0ZXJWYWx1ZSk7XG4gICAgICAgICQoJyNtYW51YWxhdHRyaWJ1dGVzJykudmFsKGRhdGEubWFudWFsYXR0cmlidXRlcyB8fCAnJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBwb3J0cyBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgICQoJyNwb3J0JykudmFsKGRhdGEucG9ydCB8fCBQcm92aWRlckJhc2UuREVGQVVMVFMuU0lQX1BPUlQpO1xuICAgICAgICB9IGVsc2UgaWYgKHRoaXMucHJvdmlkZXJUeXBlID09PSAnSUFYJykge1xuICAgICAgICAgICAgJCgnI3BvcnQnKS52YWwoZGF0YS5wb3J0IHx8IFByb3ZpZGVyQmFzZS5ERUZBVUxUUy5JQVhfUE9SVCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENvbW1vbiBjaGVja2JveGVzIC0gaGFuZGxlIGJvdGggc3RyaW5nICcxJyBhbmQgYm9vbGVhbiB0cnVlXG4gICAgICAgIC8vIFRoZXNlIGNoZWNrYm94ZXMgdXNlIHN0YW5kYXJkIEhUTUwgY2hlY2tib3ggYmVoYXZpb3JcbiAgICAgICAgJCgnI3F1YWxpZnknKS5wcm9wKCdjaGVja2VkJywgZGF0YS5xdWFsaWZ5ID09PSAnMScgfHwgZGF0YS5xdWFsaWZ5ID09PSB0cnVlKTtcbiAgICAgICAgJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykucHJvcCgnY2hlY2tlZCcsIGRhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggPT09ICcxJyB8fCBkYXRhLnJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoID09PSB0cnVlKTtcbiAgICAgICAgJCgnI25vcmVnaXN0ZXInKS5wcm9wKCdjaGVja2VkJywgZGF0YS5ub3JlZ2lzdGVyID09PSAnMScgfHwgZGF0YS5ub3JlZ2lzdGVyID09PSB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGVkIHN0YXRlIC0gdGhpcyBpcyBhIGhpZGRlbiBmaWVsZCwgbm90IGEgY2hlY2tib3hcbiAgICAgICAgJCgnI2Rpc2FibGVkJykudmFsKGRhdGEuZGlzYWJsZWQgPyAnMScgOiAnMCcpO1xuICAgIH1cblxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcHMgZnJvbSBzdHJ1Y3R1cmVkIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcERhdGEgLSBUb29sdGlwIGRhdGEgb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0b29sdGlwXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIFRvb2x0aXBCdWlsZGVyLmJ1aWxkQ29udGVudCgpIGluc3RlYWRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIHJldHVybiBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCBwcm92aWRlciBuYW1lIGFuZCB0eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyTmFtZSAtIFByb3ZpZGVyIG5hbWVcbiAgICAgKi9cbiAgICB1cGRhdGVQYWdlSGVhZGVyKHByb3ZpZGVyTmFtZSkge1xuICAgICAgICBjb25zdCBwcm92aWRlclR5cGVUZXh0ID0gdGhpcy5wcm92aWRlclR5cGUgPT09ICdTSVAnID8gJ1NJUCcgOiAnSUFYJztcbiAgICAgICAgbGV0IGhlYWRlclRleHQ7XG4gICAgICAgIFxuICAgICAgICBpZiAocHJvdmlkZXJOYW1lICYmIHByb3ZpZGVyTmFtZS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAvLyBFeGlzdGluZyBwcm92aWRlciB3aXRoIG5hbWVcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBgJHtwcm92aWRlck5hbWV9ICgke3Byb3ZpZGVyVHlwZVRleHR9KWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOZXcgcHJvdmlkZXIgb3Igbm8gbmFtZVxuICAgICAgICAgICAgY29uc3QgbmV3UHJvdmlkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX05ld1Byb3ZpZGVyIHx8ICdOZXcgUHJvdmlkZXInO1xuICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGAke25ld1Byb3ZpZGVyVGV4dH0gKCR7cHJvdmlkZXJUeXBlVGV4dH0pYDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIG1haW4gaGVhZGVyIGNvbnRlbnRcbiAgICAgICAgJCgnaDEgLmNvbnRlbnQnKS50ZXh0KGhlYWRlclRleHQpO1xuICAgIH1cbn0iXX0=