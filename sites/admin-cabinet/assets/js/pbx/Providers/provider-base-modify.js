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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, NetworkFiltersAPI, DynamicDropdownBuilder, TooltipBuilder, PasswordScore, i18n, ProvidersAPI, SipProvidersAPI, IaxProvidersAPI, PasswordWidget */

/**
 * Base class for provider management forms
 * @class ProviderBase
 */
var ProviderBase = /*#__PURE__*/function () {
  // Class constants for selectors

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
    this.$description = $(ProviderBase.SELECTORS.DESCRIPTION);
    this.$passwordTooltipIcon = $(ProviderBase.SELECTORS.PASSWORD_TOOLTIP_ICON);
    this.$popuped = $(ProviderBase.SELECTORS.POPUPED); // Track if this is a new provider (not existing in database)

    this.isNewProvider = false; // Track if form is fully initialized

    this.formInitialized = false; // Host input validation regex

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
      var currentDescription = this.$description.val() || ''; // Check for copy mode from URL parameter or hidden field

      var copyFromId = $('#copy-from-id').val();
      var urlParams = new URLSearchParams(window.location.search);
      var copyParam = urlParams.get('copy');
      this.isCopyMode = false; // Save as class property
      // Select appropriate API client based on provider type

      var apiClient;

      if (this.providerType === 'SIP') {
        apiClient = SipProvidersAPI;
      } else if (this.providerType === 'IAX') {
        apiClient = IaxProvidersAPI;
      } else {
        apiClient = ProvidersAPI;
      } // Show loading state


      this.showLoadingState();

      if (copyParam || copyFromId) {
        // Copy mode - use the new RESTful copy endpoint
        var sourceId = copyParam || copyFromId;
        this.isCopyMode = true;
        this.isNewProvider = true; // Copy creates a new provider
        // Update header immediately for better UX

        this.updatePageHeader(currentDescription); // Call the copy custom method

        apiClient.callCustomMethod('copy', {
          id: sourceId
        }, function (response) {
          _this.hideLoadingState();

          _this.handleProviderDataResponse(response, ''); // Empty ID for new provider

        });
      } else {
        // Determine if this is a new provider
        this.isNewProvider = !providerId || providerId === '' || providerId === 'new'; // Update header immediately for better UX

        this.updatePageHeader(currentDescription); // Use getRecord method from PbxApiClient
        // It automatically handles new records (calls getDefault) and existing records

        apiClient.getRecord(providerId || 'new', function (response) {
          _this.hideLoadingState();

          _this.handleProviderDataResponse(response, providerId);
        });
      }
    }
    /**
     * Handle provider data response from API
     * @param {Object} response - API response
     * @param {string} providerId - Provider ID
     */

  }, {
    key: "handleProviderDataResponse",
    value: function handleProviderDataResponse(response, providerId) {
      var _this2 = this;

      if (response.result && response.data) {
        // Store provider data for later use
        this.providerData = response.data; // Update isNewProvider based on actual data from server
        // New providers won't have an id in the response data

        if (!response.data.id || response.data.id === '') {
          this.isNewProvider = true;
        } else {
          this.isNewProvider = false;
        } // Set the _isNew flag for new providers


        if (this.isNewProvider) {
          response.data._isNew = true;
        }

        this.populateFormData(response.data);
      } else if (providerId && providerId !== 'new') {
        UserMessage.showMultiString(response.messages);
      } // Initialize dynamic dropdowns with API data (V5.0 pattern)
      // For both new and existing records - API provides complete data with defaults


      var dropdownData = response.result && response.data ? response.data : {};
      this.initializeDropdownsWithData(dropdownData); // Continue with initialization

      this.initializeUIComponents();
      this.initializeEventHandlers();
      this.initializeForm();
      this.updateVisibilityElements(); // Mark form as changed if in copy mode to enable save button

      if (this.isCopyMode) {
        Form.dataChanged();
      } // Initialize tooltip popups


      this.$popuped.popup(); // Prevent browser password manager for generated passwords

      this.$secret.on('focus', function () {
        _this2.$secret.attr('autocomplete', 'new-password');
      });
    }
    /**
     * Initialize UI components
     */

  }, {
    key: "initializeUIComponents",
    value: function initializeUIComponents() {
      this.$checkBoxes.checkbox();
      this.initializeAccordion(); // Dynamic dropdowns are initialized after data is loaded with provider data
    }
    /**
     * Initialize all dropdowns following V5.0 clean data pattern
     * Called AFTER populateFormData to ensure clean data flow
     * @param {object} data - Provider data from API containing complete field values and represent text
     */

  }, {
    key: "initializeDropdownsWithData",
    value: function initializeDropdownsWithData() {
      var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      // Initialize dynamic dropdowns (API-based - uses DynamicDropdownBuilder with complete data)
      this.initializeNetworkFilterDropdown(data); // Initialize static dropdowns (rendered by PHP - use standard Fomantic UI)

      this.initializeRegistrationTypeDropdown();
    }
    /**
     * Initialize registration type dropdown with standard Fomantic UI (PHP-rendered)
     * This dropdown needs custom onChange for provider-specific visibility logic
     */

  }, {
    key: "initializeRegistrationTypeDropdown",
    value: function initializeRegistrationTypeDropdown() {
      var _this3 = this;

      var $dropdown = $('#registration_type-dropdown');

      if ($dropdown.length === 0) {
        return;
      } // For static dropdowns rendered by PHP, use simple Fomantic UI initialization
      // This dropdown needs custom onChange for complex field visibility logic


      $dropdown.dropdown({
        onChange: function onChange(value) {
          _this3.updateVisibilityElements(); // Update validation rules based on registration type


          Form.validateRules = _this3.getValidateRules();
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
     * Initialize network filter dropdown following V5.0 clean data pattern
     * @param {object} data - Provider data from API containing networkfilterid and networkfilterid_represent
     */

  }, {
    key: "initializeNetworkFilterDropdown",
    value: function initializeNetworkFilterDropdown() {
      var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var category = this.providerType || 'SIP'; // V5.0 pattern: Complete automation - no custom onChange needed

      DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
        apiUrl: "/pbxcore/api/v3/network-filters:getForSelect?categories[]=".concat(category),
        placeholder: globalTranslate.pr_NetworkFilter,
        cache: false // No onChange callback - DynamicDropdownBuilder handles everything automatically:
        // - Hidden input synchronization
        // - Change event triggering  
        // - Form.dataChanged() notification
        // - Validation error clearing

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
      Form.initialize(); // Mark form as fully initialized

      this.formInitialized = true;
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
      // Save the _isNew flag in a hidden field if present
      if (data._isNew !== undefined) {
        if ($('#_isNew').length === 0) {
          // Create hidden field if it doesn't exist
          $('<input>').attr({
            type: 'hidden',
            id: '_isNew',
            name: '_isNew',
            value: data._isNew ? 'true' : 'false'
          }).appendTo(this.$formObj);
        } else {
          $('#_isNew').val(data._isNew ? 'true' : 'false');
        }
      } // Common fields


      if (data.id) {
        $('#id').val(data.id);
      }

      if (data.description) {
        this.$description.val(data.description); // Update page header with provider name and type

        this.updatePageHeader(data.description);
      }

      if (data.note) {
        $('#note').val(data.note);
      } // Common provider fields - backend provides defaults


      $('#username').val(data.username || '');
      this.$secret.val(data.secret || '');
      $('#host').val(data.host || '');
      $('#registration_type').val(data.registration_type || '');
      $('#networkfilterid').val(data.networkfilterid || '');
      $('#manualattributes').val(data.manualattributes || '');
      $('#port').val(data.port || ''); // Common checkboxes - handle both string '1' and boolean true
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
        var newProviderText = globalTranslate.pr_NewProvider;
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
  DESCRIPTION: '#description',
  PASSWORD_TOOLTIP_ICON: '.password-tooltip-icon',
  POPUPED: '.popuped'
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiU0VMRUNUT1JTIiwiRk9STSIsIiRzZWNyZXQiLCJTRUNSRVQiLCIkY2hlY2tCb3hlcyIsIkNIRUNLQk9YRVMiLCIkYWNjb3JkaW9ucyIsIkFDQ09SRElPTlMiLCIkZGVzY3JpcHRpb24iLCJERVNDUklQVElPTiIsIiRwYXNzd29yZFRvb2x0aXBJY29uIiwiUEFTU1dPUkRfVE9PTFRJUF9JQ09OIiwiJHBvcHVwZWQiLCJQT1BVUEVEIiwiaXNOZXdQcm92aWRlciIsImZvcm1Jbml0aWFsaXplZCIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJSZWdFeHAiLCJwcm92aWRlcklkIiwidmFsIiwiY3VycmVudERlc2NyaXB0aW9uIiwiY29weUZyb21JZCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiY29weVBhcmFtIiwiZ2V0IiwiaXNDb3B5TW9kZSIsImFwaUNsaWVudCIsIlNpcFByb3ZpZGVyc0FQSSIsIklheFByb3ZpZGVyc0FQSSIsIlByb3ZpZGVyc0FQSSIsInNob3dMb2FkaW5nU3RhdGUiLCJzb3VyY2VJZCIsInVwZGF0ZVBhZ2VIZWFkZXIiLCJjYWxsQ3VzdG9tTWV0aG9kIiwiaWQiLCJyZXNwb25zZSIsImhpZGVMb2FkaW5nU3RhdGUiLCJoYW5kbGVQcm92aWRlckRhdGFSZXNwb25zZSIsImdldFJlY29yZCIsInJlc3VsdCIsImRhdGEiLCJwcm92aWRlckRhdGEiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm1EYXRhIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsImRyb3Bkb3duRGF0YSIsImluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YSIsImluaXRpYWxpemVVSUNvbXBvbmVudHMiLCJpbml0aWFsaXplRXZlbnRIYW5kbGVycyIsImluaXRpYWxpemVGb3JtIiwidXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwicG9wdXAiLCJvbiIsImF0dHIiLCJjaGVja2JveCIsImluaXRpYWxpemVBY2NvcmRpb24iLCJpbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duIiwiaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93biIsIiRkcm9wZG93biIsImxlbmd0aCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJ2YWx1ZSIsInZhbGlkYXRlUnVsZXMiLCJnZXRWYWxpZGF0ZVJ1bGVzIiwic2VsZiIsImFjY29yZGlvbiIsIm9uT3BlbiIsInNldFRpbWVvdXQiLCJjYXRlZ29yeSIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiYXBpVXJsIiwicGxhY2Vob2xkZXIiLCJnbG9iYWxUcmFuc2xhdGUiLCJwcl9OZXR3b3JrRmlsdGVyIiwiY2FjaGUiLCJpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQiLCJoaWRlIiwid2lkZ2V0IiwiUGFzc3dvcmRXaWRnZXQiLCJpbml0IiwidmFsaWRhdGlvbiIsIlZBTElEQVRJT04iLCJTT0ZUIiwiZ2VuZXJhdGVCdXR0b24iLCJzaG93UGFzc3dvcmRCdXR0b24iLCJjbGlwYm9hcmRCdXR0b24iLCJzaG93U3RyZW5ndGhCYXIiLCJzaG93V2FybmluZ3MiLCJ2YWxpZGF0ZU9uSW5wdXQiLCJjaGVja09uTG9hZCIsIm1pblNjb3JlIiwiZ2VuZXJhdGVMZW5ndGgiLCJwYXNzd29yZFdpZGdldCIsInNob3ciLCJjYkJlZm9yZVNlbmRGb3JtIiwiYmluZCIsImNiQWZ0ZXJTZW5kRm9ybSIsImluaXRpYWxpemUiLCJzZXR0aW5ncyIsImZvcm0iLCJhZGRDbGFzcyIsInJlbW92ZUNsYXNzIiwidW5kZWZpbmVkIiwidHlwZSIsIm5hbWUiLCJhcHBlbmRUbyIsImRlc2NyaXB0aW9uIiwibm90ZSIsInVzZXJuYW1lIiwic2VjcmV0IiwiaG9zdCIsInJlZ2lzdHJhdGlvbl90eXBlIiwibmV0d29ya2ZpbHRlcmlkIiwibWFudWFsYXR0cmlidXRlcyIsInBvcnQiLCJwcm9wIiwicXVhbGlmeSIsInJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIiwibm9yZWdpc3RlciIsImRpc2FibGVkIiwidG9vbHRpcERhdGEiLCJUb29sdGlwQnVpbGRlciIsImJ1aWxkQ29udGVudCIsInByb3ZpZGVyTmFtZSIsInByb3ZpZGVyVHlwZVRleHQiLCJoZWFkZXJUZXh0IiwidHJpbSIsIm5ld1Byb3ZpZGVyVGV4dCIsInByX05ld1Byb3ZpZGVyIiwidGV4dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsWTtBQUNGOztBQVlBO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksd0JBQVlDLFlBQVosRUFBMEI7QUFBQTs7QUFDdEIsU0FBS0EsWUFBTCxHQUFvQkEsWUFBcEIsQ0FEc0IsQ0FFdEI7O0FBQ0EsU0FBS0MsUUFBTCxHQUFnQkMsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJDLElBQXhCLENBQWpCO0FBQ0EsU0FBS0MsT0FBTCxHQUFlSCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QkcsTUFBeEIsQ0FBaEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CTCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QkssVUFBeEIsQ0FBcEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CUCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1Qk8sVUFBeEIsQ0FBcEI7QUFDQSxTQUFLQyxZQUFMLEdBQW9CVCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QlMsV0FBeEIsQ0FBckI7QUFDQSxTQUFLQyxvQkFBTCxH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Y2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGksIENsaXBib2FyZEpTLCBOZXR3b3JrRmlsdGVyc0FQSSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgVG9vbHRpcEJ1aWxkZXIsIFBhc3N3b3JkU2NvcmUsIGkxOG4sIFByb3ZpZGVyc0FQSSwgU2lwUHJvdmlkZXJzQVBJLCBJYXhQcm92aWRlcnNBUEksIFBhc3N3b3JkV2lkZ2V0ICovXG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgcHJvdmlkZXIgbWFuYWdlbWVudCBmb3Jtc1xuICogQGNsYXNzIFByb3ZpZGVyQmFzZVxuICovXG5jbGFzcyBQcm92aWRlckJhc2Uge1xuICAgIC8vIENsYXNzIGNvbnN0YW50cyBmb3Igc2VsZWN0b3JzXG4gICAgc3RhdGljIFNFTEVDVE9SUyA9IHtcbiAgICAgICAgRk9STTogJyNzYXZlLXByb3ZpZGVyLWZvcm0nLFxuICAgICAgICBTRUNSRVQ6ICcjc2VjcmV0JyxcbiAgICAgICAgQ0hFQ0tCT1hFUzogJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmNoZWNrYm94JyxcbiAgICAgICAgQUNDT1JESU9OUzogJyNzYXZlLXByb3ZpZGVyLWZvcm0gLnVpLmFjY29yZGlvbicsXG4gICAgICAgIERFU0NSSVBUSU9OOiAnI2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgUEFTU1dPUkRfVE9PTFRJUF9JQ09OOiAnLnBhc3N3b3JkLXRvb2x0aXAtaWNvbicsXG4gICAgICAgIFBPUFVQRUQ6ICcucG9wdXBlZCdcbiAgICB9O1xuXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlclR5cGUgLSBUeXBlIG9mIHByb3ZpZGVyIChTSVAgb3IgSUFYKVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHByb3ZpZGVyVHlwZSkge1xuICAgICAgICB0aGlzLnByb3ZpZGVyVHlwZSA9IHByb3ZpZGVyVHlwZTtcbiAgICAgICAgLy8gQ2FjaGUgalF1ZXJ5IG9iamVjdHNcbiAgICAgICAgdGhpcy4kZm9ybU9iaiA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5GT1JNKTtcbiAgICAgICAgdGhpcy4kc2VjcmV0ID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLlNFQ1JFVCk7XG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuQ0hFQ0tCT1hFUyk7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuQUNDT1JESU9OUyk7XG4gICAgICAgIHRoaXMuJGRlc2NyaXB0aW9uID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLkRFU0NSSVBUSU9OKTtcbiAgICAgICAgdGhpcy4kcGFzc3dvcmRUb29sdGlwSWNvbiA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5QQVNTV09SRF9UT09MVElQX0lDT04pO1xuICAgICAgICB0aGlzLiRwb3B1cGVkID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLlBPUFVQRUQpO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJhY2sgaWYgdGhpcyBpcyBhIG5ldyBwcm92aWRlciAobm90IGV4aXN0aW5nIGluIGRhdGFiYXNlKVxuICAgICAgICB0aGlzLmlzTmV3UHJvdmlkZXIgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyYWNrIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhvc3QgaW5wdXQgdmFsaWRhdGlvbiByZWdleFxuICAgICAgICB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24gPSBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgJ14oKChcXFxcZHxbMS05XVxcXFxkfDFcXFxcZHsyfXwyWzAtNF1cXFxcZHwyNVswLTVdKVxcXFwuKXszfSdcbiAgICAgICAgICAgICsgJyhcXFxcZHxbMS05XVxcXFxkfDFcXFxcZHsyfXwyWzAtNF1cXFxcZHwyNVswLTVdKSdcbiAgICAgICAgICAgICsgJyhcXFxcLyhcXGR8WzEtMl1cXGR8M1swLTJdKSk/J1xuICAgICAgICAgICAgKyAnfFthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKD86XFxcXC5bYS16QS1aXXsyLH0pKykkJyxcbiAgICAgICAgICAgICdnbSdcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpIHx8ICcnO1xuICAgICAgICBjb25zdCBjdXJyZW50RGVzY3JpcHRpb24gPSB0aGlzLiRkZXNjcmlwdGlvbi52YWwoKSB8fCAnJztcblxuICAgICAgICAvLyBDaGVjayBmb3IgY29weSBtb2RlIGZyb20gVVJMIHBhcmFtZXRlciBvciBoaWRkZW4gZmllbGRcbiAgICAgICAgY29uc3QgY29weUZyb21JZCA9ICQoJyNjb3B5LWZyb20taWQnKS52YWwoKTtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY29weVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuXG4gICAgICAgIHRoaXMuaXNDb3B5TW9kZSA9IGZhbHNlOyAvLyBTYXZlIGFzIGNsYXNzIHByb3BlcnR5XG5cbiAgICAgICAgLy8gU2VsZWN0IGFwcHJvcHJpYXRlIEFQSSBjbGllbnQgYmFzZWQgb24gcHJvdmlkZXIgdHlwZVxuICAgICAgICBsZXQgYXBpQ2xpZW50O1xuICAgICAgICBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdTSVAnKSB7XG4gICAgICAgICAgICBhcGlDbGllbnQgPSBTaXBQcm92aWRlcnNBUEk7XG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5wcm92aWRlclR5cGUgPT09ICdJQVgnKSB7XG4gICAgICAgICAgICBhcGlDbGllbnQgPSBJYXhQcm92aWRlcnNBUEk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcGlDbGllbnQgPSBQcm92aWRlcnNBUEk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgdGhpcy5zaG93TG9hZGluZ1N0YXRlKCk7XG5cbiAgICAgICAgaWYgKGNvcHlQYXJhbSB8fCBjb3B5RnJvbUlkKSB7XG4gICAgICAgICAgICAvLyBDb3B5IG1vZGUgLSB1c2UgdGhlIG5ldyBSRVNUZnVsIGNvcHkgZW5kcG9pbnRcbiAgICAgICAgICAgIGNvbnN0IHNvdXJjZUlkID0gY29weVBhcmFtIHx8IGNvcHlGcm9tSWQ7XG4gICAgICAgICAgICB0aGlzLmlzQ29weU1vZGUgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gdHJ1ZTsgLy8gQ29weSBjcmVhdGVzIGEgbmV3IHByb3ZpZGVyXG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgaW1tZWRpYXRlbHkgZm9yIGJldHRlciBVWFxuICAgICAgICAgICAgdGhpcy51cGRhdGVQYWdlSGVhZGVyKGN1cnJlbnREZXNjcmlwdGlvbik7XG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIGNvcHkgY3VzdG9tIG1ldGhvZFxuICAgICAgICAgICAgYXBpQ2xpZW50LmNhbGxDdXN0b21NZXRob2QoJ2NvcHknLCB7aWQ6IHNvdXJjZUlkfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGluZ1N0YXRlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVQcm92aWRlckRhdGFSZXNwb25zZShyZXNwb25zZSwgJycpOyAvLyBFbXB0eSBJRCBmb3IgbmV3IHByb3ZpZGVyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IHByb3ZpZGVyXG4gICAgICAgICAgICB0aGlzLmlzTmV3UHJvdmlkZXIgPSAhcHJvdmlkZXJJZCB8fCBwcm92aWRlcklkID09PSAnJyB8fCBwcm92aWRlcklkID09PSAnbmV3JztcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGhlYWRlciBpbW1lZGlhdGVseSBmb3IgYmV0dGVyIFVYXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VIZWFkZXIoY3VycmVudERlc2NyaXB0aW9uKTtcblxuICAgICAgICAgICAgLy8gVXNlIGdldFJlY29yZCBtZXRob2QgZnJvbSBQYnhBcGlDbGllbnRcbiAgICAgICAgICAgIC8vIEl0IGF1dG9tYXRpY2FsbHkgaGFuZGxlcyBuZXcgcmVjb3JkcyAoY2FsbHMgZ2V0RGVmYXVsdCkgYW5kIGV4aXN0aW5nIHJlY29yZHNcbiAgICAgICAgICAgIGFwaUNsaWVudC5nZXRSZWNvcmQocHJvdmlkZXJJZCB8fCAnbmV3JywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGluZ1N0YXRlKCk7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVQcm92aWRlckRhdGFSZXNwb25zZShyZXNwb25zZSwgcHJvdmlkZXJJZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcHJvdmlkZXIgZGF0YSByZXNwb25zZSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlcklkIC0gUHJvdmlkZXIgSURcbiAgICAgKi9cbiAgICBoYW5kbGVQcm92aWRlckRhdGFSZXNwb25zZShyZXNwb25zZSwgcHJvdmlkZXJJZCkge1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9yZSBwcm92aWRlciBkYXRhIGZvciBsYXRlciB1c2VcbiAgICAgICAgICAgICAgICB0aGlzLnByb3ZpZGVyRGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaXNOZXdQcm92aWRlciBiYXNlZCBvbiBhY3R1YWwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgICAgIC8vIE5ldyBwcm92aWRlcnMgd29uJ3QgaGF2ZSBhbiBpZCBpbiB0aGUgcmVzcG9uc2UgZGF0YVxuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5pZCB8fCByZXNwb25zZS5kYXRhLmlkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzTmV3UHJvdmlkZXIgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgX2lzTmV3IGZsYWcgZm9yIG5ldyBwcm92aWRlcnNcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5pc05ld1Byb3ZpZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB0aGlzLnBvcHVsYXRlRm9ybURhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVySWQgJiYgcHJvdmlkZXJJZCAhPT0gJ25ldycpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGR5bmFtaWMgZHJvcGRvd25zIHdpdGggQVBJIGRhdGEgKFY1LjAgcGF0dGVybilcbiAgICAgICAgICAgIC8vIEZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3JkcyAtIEFQSSBwcm92aWRlcyBjb21wbGV0ZSBkYXRhIHdpdGggZGVmYXVsdHNcbiAgICAgICAgICAgIGNvbnN0IGRyb3Bkb3duRGF0YSA9IChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkgPyByZXNwb25zZS5kYXRhIDoge307XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkcm9wZG93bkRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDb250aW51ZSB3aXRoIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgaWYgaW4gY29weSBtb2RlIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNDb3B5TW9kZSkge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXAgcG9wdXBzXG4gICAgICAgIHRoaXMuJHBvcHVwZWQucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIHRoaXMuJHNlY3JldC5vbignZm9jdXMnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRzZWNyZXQuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlDb21wb25lbnRzKCkge1xuICAgICAgICB0aGlzLiRjaGVja0JveGVzLmNoZWNrYm94KCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUFjY29yZGlvbigpO1xuICAgICAgICBcbiAgICAgICAgLy8gRHluYW1pYyBkcm9wZG93bnMgYXJlIGluaXRpYWxpemVkIGFmdGVyIGRhdGEgaXMgbG9hZGVkIHdpdGggcHJvdmlkZXIgZGF0YVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFsbCBkcm9wZG93bnMgZm9sbG93aW5nIFY1LjAgY2xlYW4gZGF0YSBwYXR0ZXJuXG4gICAgICogQ2FsbGVkIEFGVEVSIHBvcHVsYXRlRm9ybURhdGEgdG8gZW5zdXJlIGNsZWFuIGRhdGEgZmxvd1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSSBjb250YWluaW5nIGNvbXBsZXRlIGZpZWxkIHZhbHVlcyBhbmQgcmVwcmVzZW50IHRleHRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJvcGRvd25zV2l0aERhdGEoZGF0YSA9IHt9KSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZHluYW1pYyBkcm9wZG93bnMgKEFQSS1iYXNlZCAtIHVzZXMgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB3aXRoIGNvbXBsZXRlIGRhdGEpXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bihkYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3RhdGljIGRyb3Bkb3ducyAocmVuZGVyZWQgYnkgUEhQIC0gdXNlIHN0YW5kYXJkIEZvbWFudGljIFVJKVxuICAgICAgICB0aGlzLmluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlRHJvcGRvd24oKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHJlZ2lzdHJhdGlvbiB0eXBlIGRyb3Bkb3duIHdpdGggc3RhbmRhcmQgRm9tYW50aWMgVUkgKFBIUC1yZW5kZXJlZClcbiAgICAgKiBUaGlzIGRyb3Bkb3duIG5lZWRzIGN1c3RvbSBvbkNoYW5nZSBmb3IgcHJvdmlkZXItc3BlY2lmaWMgdmlzaWJpbGl0eSBsb2dpY1xuICAgICAqL1xuICAgIGluaXRpYWxpemVSZWdpc3RyYXRpb25UeXBlRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNyZWdpc3RyYXRpb25fdHlwZS1kcm9wZG93bicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRm9yIHN0YXRpYyBkcm9wZG93bnMgcmVuZGVyZWQgYnkgUEhQLCB1c2Ugc2ltcGxlIEZvbWFudGljIFVJIGluaXRpYWxpemF0aW9uXG4gICAgICAgIC8vIFRoaXMgZHJvcGRvd24gbmVlZHMgY3VzdG9tIG9uQ2hhbmdlIGZvciBjb21wbGV4IGZpZWxkIHZpc2liaWxpdHkgbG9naWNcbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWNjb3JkaW9uIHdpdGggY2FsbGJhY2tzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjY29yZGlvbigpIHtcbiAgICAgICAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMuYWNjb3JkaW9uKHtcbiAgICAgICAgICAgIG9uT3BlbjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGZpZWxkIHZpc2liaWxpdHkgd2hlbiBhY2NvcmRpb24gb3BlbnNcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzZWxmLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDUwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbmV0d29yayBmaWx0ZXIgZHJvcGRvd24gZm9sbG93aW5nIFY1LjAgY2xlYW4gZGF0YSBwYXR0ZXJuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJIGNvbnRhaW5pbmcgbmV0d29ya2ZpbHRlcmlkIGFuZCBuZXR3b3JrZmlsdGVyaWRfcmVwcmVzZW50XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU5ldHdvcmtGaWx0ZXJEcm9wZG93bihkYXRhID0ge30pIHtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSB0aGlzLnByb3ZpZGVyVHlwZSB8fCAnU0lQJztcbiAgICAgICAgXG4gICAgICAgIC8vIFY1LjAgcGF0dGVybjogQ29tcGxldGUgYXV0b21hdGlvbiAtIG5vIGN1c3RvbSBvbkNoYW5nZSBuZWVkZWRcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCduZXR3b3JrZmlsdGVyaWQnLCBkYXRhLCB7XG4gICAgICAgICAgICBhcGlVcmw6IGAvcGJ4Y29yZS9hcGkvdjMvbmV0d29yay1maWx0ZXJzOmdldEZvclNlbGVjdD9jYXRlZ29yaWVzW109JHtjYXRlZ29yeX1gLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXR3b3JrRmlsdGVyLFxuICAgICAgICAgICAgY2FjaGU6IGZhbHNlXG4gICAgICAgICAgICAvLyBObyBvbkNoYW5nZSBjYWxsYmFjayAtIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgaGFuZGxlcyBldmVyeXRoaW5nIGF1dG9tYXRpY2FsbHk6XG4gICAgICAgICAgICAvLyAtIEhpZGRlbiBpbnB1dCBzeW5jaHJvbml6YXRpb25cbiAgICAgICAgICAgIC8vIC0gQ2hhbmdlIGV2ZW50IHRyaWdnZXJpbmcgIFxuICAgICAgICAgICAgLy8gLSBGb3JtLmRhdGFDaGFuZ2VkKCkgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAvLyAtIFZhbGlkYXRpb24gZXJyb3IgY2xlYXJpbmdcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVFdmVudEhhbmRsZXJzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgd2hlbiBwcm92aWRlciBuYW1lIGNoYW5nZXNcbiAgICAgICAgdGhpcy4kZGVzY3JpcHRpb24ub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZVBhZ2VIZWFkZXIoJCh0aGlzKS52YWwoKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXRcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoKTtcbiAgICB9XG5cblxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGFzc3dvcmQgd2lkZ2V0IHdpdGggZGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVBhc3N3b3JkV2lkZ2V0KCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBwYXNzd29yZCB3aWRnZXQgd2l0aCBkZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgaWYgKHRoaXMuJHNlY3JldC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBIaWRlIGxlZ2FjeSBIVE1MIGJ1dHRvbnMgLSBQYXNzd29yZFdpZGdldCB3aWxsIG1hbmFnZSBpdHMgb3duIGJ1dHRvbnNcbiAgICAgICAgICAgICQoJy5jbGlwYm9hcmQnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjc2hvdy1oaWRlLXBhc3N3b3JkJykuaGlkZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBEZWZhdWx0IGNvbmZpZ3VyYXRpb24gZm9yIHByb3ZpZGVycyAtIHdpbGwgYmUgdXBkYXRlZCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgICAgICAgICAgY29uc3Qgd2lkZ2V0ID0gUGFzc3dvcmRXaWRnZXQuaW5pdCh0aGlzLiRzZWNyZXQsIHtcbiAgICAgICAgICAgICAgICB2YWxpZGF0aW9uOiBQYXNzd29yZFdpZGdldC5WQUxJREFUSU9OLlNPRlQsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVCdXR0b246IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd1Bhc3N3b3JkQnV0dG9uOiB0cnVlLCAgLy8gV2lsbCBiZSB1cGRhdGVkIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICAgICAgY2xpcGJvYXJkQnV0dG9uOiB0cnVlLCAgICAgIC8vIEtlZXAgY29weSBidXR0b24gZm9yIGFsbCBtb2Rlc1xuICAgICAgICAgICAgICAgIHNob3dTdHJlbmd0aEJhcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93V2FybmluZ3M6IHRydWUsXG4gICAgICAgICAgICAgICAgdmFsaWRhdGVPbklucHV0OiB0cnVlLFxuICAgICAgICAgICAgICAgIGNoZWNrT25Mb2FkOiBmYWxzZSwgLy8gRG9uJ3QgdmFsaWRhdGUgb24gbG9hZCwgbGV0IHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cyBoYW5kbGUgaXRcbiAgICAgICAgICAgICAgICBtaW5TY29yZTogNjAsXG4gICAgICAgICAgICAgICAgZ2VuZXJhdGVMZW5ndGg6IDMyIC8vIFByb3ZpZGVyIHBhc3N3b3JkcyBzaG91bGQgYmUgMzIgY2hhcnMgZm9yIGJldHRlciBzZWN1cml0eVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIHdpZGdldCBpbnN0YW5jZSBmb3IgbGF0ZXIgdXNlXG4gICAgICAgICAgICB0aGlzLnBhc3N3b3JkV2lkZ2V0ID0gd2lkZ2V0O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgdmlzaWJpbGl0eSBlbGVtZW50cyBub3cgdGhhdCB3aWRnZXQgaXMgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIC8vIFRoaXMgd2lsbCBhcHBseSB0aGUgY29ycmVjdCBjb25maWd1cmF0aW9uIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB2aXNpYmlsaXR5IG9mIGVsZW1lbnRzIGJhc2VkIG9uIHByb3ZpZGVyIHNldHRpbmdzXG4gICAgICogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3NlcyB0byBjb25maWd1cmUgUGFzc3dvcmRXaWRnZXQgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBwYXNzd29yZCB0b29sdGlwIGljb24gd2hlbiBpbiAnbm9uZScgcmVnaXN0cmF0aW9uIG1vZGVcbiAgICAgKi9cbiAgICBzaG93UGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uLnNob3coKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBwYXNzd29yZCB0b29sdGlwIGljb25cbiAgICAgKi9cbiAgICBoaWRlUGFzc3dvcmRUb29sdGlwKCkge1xuICAgICAgICB0aGlzLiRwYXNzd29yZFRvb2x0aXBJY29uLmhpZGUoKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBHZXQgdmFsaWRhdGlvbiBydWxlcyBiYXNlZCBvbiBwcm92aWRlciBzZXR0aW5nc1xuICAgICAqIFRoaXMgbWV0aG9kIHNob3VsZCBiZSBvdmVycmlkZGVuIGluIGNoaWxkIGNsYXNzZXNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fSBWYWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgZ2V0VmFsaWRhdGVSdWxlcygpIHtcbiAgICAgICAgLy8gT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAgICByZXR1cm4ge307XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmb3JtIHdpdGggdmFsaWRhdGlvbiBhbmQgY2FsbGJhY2tzXG4gICAgICogTm90ZTogVGhpcyBtZXRob2QgaXMgb3ZlcnJpZGRlbiBpbiBwcm92aWRlci1tb2RpZnkuanMgdG8gY29uZmlndXJlIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSB0aGlzLiRmb3JtT2JqO1xuICAgICAgICAvLyBVUkwgaXMgbm90IHNldCBoZXJlIC0gY2hpbGQgY2xhc3NlcyBjb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gdGhpcy5nZXRWYWxpZGF0ZVJ1bGVzKCk7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHRoaXMuY2JCZWZvcmVTZW5kRm9ybS5iaW5kKHRoaXMpO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHRoaXMuY2JBZnRlclNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTWFyayBmb3JtIGFzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgIHRoaXMuZm9ybUluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IE1vZGlmaWVkIHNldHRpbmdzXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgLy8gSU1QT1JUQU5UOiBEb24ndCBvdmVyd3JpdGUgcmVzdWx0LmRhdGEgLSBpdCBhbHJlYWR5IGNvbnRhaW5zIHByb2Nlc3NlZCBjaGVja2JveCB2YWx1ZXMgZnJvbSBGb3JtLmpzXG4gICAgICAgIC8vIFdlIHNob3VsZCBvbmx5IGFkZCBvciBtb2RpZnkgc3BlY2lmaWMgZmllbGRzXG4gICAgICAgIFxuICAgICAgICAvLyBJZiByZXN1bHQuZGF0YSBpcyBub3QgZGVmaW5lZCAoc2hvdWxkbid0IGhhcHBlbiksIGluaXRpYWxpemUgaXRcbiAgICAgICAgaWYgKCFyZXN1bHQuZGF0YSkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTmV0d29yayBmaWx0ZXIgdmFsdWUgaXMgYXV0b21hdGljYWxseSBoYW5kbGVkIGJ5IGZvcm0gc2VyaWFsaXphdGlvblxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gQ2FuIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgIH1cblxuXG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkaW5nIHN0YXRlIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIHNob3dMb2FkaW5nU3RhdGUoKSB7XG4gICAgICAgIHRoaXMuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBsb2FkaW5nIHN0YXRlIGZvciB0aGUgZm9ybVxuICAgICAqL1xuICAgIGhpZGVMb2FkaW5nU3RhdGUoKSB7XG4gICAgICAgIHRoaXMuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1EYXRhKGRhdGEpIHtcblxuICAgICAgICAvLyBTYXZlIHRoZSBfaXNOZXcgZmxhZyBpbiBhIGhpZGRlbiBmaWVsZCBpZiBwcmVzZW50XG4gICAgICAgIGlmIChkYXRhLl9pc05ldyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoJCgnI19pc05ldycpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBoaWRkZW4gZmllbGQgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgICQoJzxpbnB1dD4nKS5hdHRyKHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAnX2lzTmV3JyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ19pc05ldycsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBkYXRhLl9pc05ldyA/ICd0cnVlJyA6ICdmYWxzZSdcbiAgICAgICAgICAgICAgICB9KS5hcHBlbmRUbyh0aGlzLiRmb3JtT2JqKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI19pc05ldycpLnZhbChkYXRhLl9pc05ldyA/ICd0cnVlJyA6ICdmYWxzZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tbW9uIGZpZWxkc1xuICAgICAgICBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgJCgnI2lkJykudmFsKGRhdGEuaWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLiRkZXNjcmlwdGlvbi52YWwoZGF0YS5kZXNjcmlwdGlvbik7XG4gICAgICAgICAgICAvLyBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCBwcm92aWRlciBuYW1lIGFuZCB0eXBlXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VIZWFkZXIoZGF0YS5kZXNjcmlwdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEubm90ZSkge1xuICAgICAgICAgICAgJCgnI25vdGUnKS52YWwoZGF0YS5ub3RlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbW1vbiBwcm92aWRlciBmaWVsZHMgLSBiYWNrZW5kIHByb3ZpZGVzIGRlZmF1bHRzXG4gICAgICAgICQoJyN1c2VybmFtZScpLnZhbChkYXRhLnVzZXJuYW1lIHx8ICcnKTtcbiAgICAgICAgdGhpcy4kc2VjcmV0LnZhbChkYXRhLnNlY3JldCB8fCAnJyk7XG4gICAgICAgICQoJyNob3N0JykudmFsKGRhdGEuaG9zdCB8fCAnJyk7XG4gICAgICAgICQoJyNyZWdpc3RyYXRpb25fdHlwZScpLnZhbChkYXRhLnJlZ2lzdHJhdGlvbl90eXBlIHx8ICcnKTtcbiAgICAgICAgJCgnI25ldHdvcmtmaWx0ZXJpZCcpLnZhbChkYXRhLm5ldHdvcmtmaWx0ZXJpZCB8fCAnJyk7XG4gICAgICAgICQoJyNtYW51YWxhdHRyaWJ1dGVzJykudmFsKGRhdGEubWFudWFsYXR0cmlidXRlcyB8fCAnJyk7XG4gICAgICAgICQoJyNwb3J0JykudmFsKGRhdGEucG9ydCB8fCAnJyk7XG5cbiAgICAgICAgLy8gQ29tbW9uIGNoZWNrYm94ZXMgLSBoYW5kbGUgYm90aCBzdHJpbmcgJzEnIGFuZCBib29sZWFuIHRydWVcbiAgICAgICAgLy8gVGhlc2UgY2hlY2tib3hlcyB1c2Ugc3RhbmRhcmQgSFRNTCBjaGVja2JveCBiZWhhdmlvclxuICAgICAgICAkKCcjcXVhbGlmeScpLnByb3AoJ2NoZWNrZWQnLCBkYXRhLnF1YWxpZnkgPT09ICcxJyB8fCBkYXRhLnF1YWxpZnkgPT09IHRydWUpO1xuICAgICAgICAkKCcjcmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGgnKS5wcm9wKCdjaGVja2VkJywgZGF0YS5yZWNlaXZlX2NhbGxzX3dpdGhvdXRfYXV0aCA9PT0gJzEnIHx8IGRhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggPT09IHRydWUpO1xuICAgICAgICAkKCcjbm9yZWdpc3RlcicpLnByb3AoJ2NoZWNrZWQnLCBkYXRhLm5vcmVnaXN0ZXIgPT09ICcxJyB8fCBkYXRhLm5vcmVnaXN0ZXIgPT09IHRydWUpO1xuXG4gICAgICAgIC8vIERpc2FibGVkIHN0YXRlIC0gdGhpcyBpcyBhIGhpZGRlbiBmaWVsZCwgbm90IGEgY2hlY2tib3hcbiAgICAgICAgJCgnI2Rpc2FibGVkJykudmFsKGRhdGEuZGlzYWJsZWQgPyAnMScgOiAnMCcpO1xuICAgIH1cblxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcHMgZnJvbSBzdHJ1Y3R1cmVkIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcERhdGEgLSBUb29sdGlwIGRhdGEgb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0b29sdGlwXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIFRvb2x0aXBCdWlsZGVyLmJ1aWxkQ29udGVudCgpIGluc3RlYWRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIHJldHVybiBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCBwcm92aWRlciBuYW1lIGFuZCB0eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyTmFtZSAtIFByb3ZpZGVyIG5hbWVcbiAgICAgKi9cbiAgICB1cGRhdGVQYWdlSGVhZGVyKHByb3ZpZGVyTmFtZSkge1xuICAgICAgICBjb25zdCBwcm92aWRlclR5cGVUZXh0ID0gdGhpcy5wcm92aWRlclR5cGUgPT09ICdTSVAnID8gJ1NJUCcgOiAnSUFYJztcbiAgICAgICAgbGV0IGhlYWRlclRleHQ7XG4gICAgICAgIFxuICAgICAgICBpZiAocHJvdmlkZXJOYW1lICYmIHByb3ZpZGVyTmFtZS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAvLyBFeGlzdGluZyBwcm92aWRlciB3aXRoIG5hbWVcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBgJHtwcm92aWRlck5hbWV9ICgke3Byb3ZpZGVyVHlwZVRleHR9KWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOZXcgcHJvdmlkZXIgb3Igbm8gbmFtZVxuICAgICAgICAgICAgY29uc3QgbmV3UHJvdmlkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX05ld1Byb3ZpZGVyO1xuICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGAke25ld1Byb3ZpZGVyVGV4dH0gKCR7cHJvdmlkZXJUeXBlVGV4dH0pYDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIG1haW4gaGVhZGVyIGNvbnRlbnRcbiAgICAgICAgJCgnaDEgLmNvbnRlbnQnKS50ZXh0KGhlYWRlclRleHQpO1xuICAgIH1cbn0iXX0=