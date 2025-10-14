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
   * Initialize the provider form following CallQueues pattern
   *
   * Flow:
   * 1. Initialize UI components first (synchronous)
   * 2. Initialize form with validation
   * 3. Load data from API (asynchronous, last)
   */


  _createClass(ProviderBase, [{
    key: "initialize",
    value: function initialize() {
      // 1. Initialize UI components first (synchronous)
      this.initializeUIComponents(); // 2. Initialize event handlers

      this.initializeEventHandlers(); // 3. Initialize form with REST API settings (before loading data)

      this.initializeForm(); // 4. Load form data via REST API (last, after all UI is initialized)

      this.loadFormData();
    }
    /**
     * Load form data via REST API
     * This is called last, after all UI components are initialized
     */

  }, {
    key: "loadFormData",
    value: function loadFormData() {
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


      this.showLoadingState(); // Update header immediately for better UX

      this.updatePageHeader(currentDescription);

      if (copyParam || copyFromId) {
        // Copy mode - use the new RESTful copy endpoint
        var sourceId = copyParam || copyFromId;
        this.isCopyMode = true;
        this.isNewProvider = true; // Copy creates a new provider
        // Call the copy custom method

        apiClient.callCustomMethod('copy', {
          id: sourceId
        }, function (response) {
          _this.hideLoadingState();

          if (response.result && response.data) {
            // Mark as new record for copy
            response.data._isNew = true;

            _this.populateForm(response.data); // Mark form as changed to enable save button


            Form.dataChanged();
          } else {
            // Show error
            UserMessage.showMultiString(response.messages);
          }
        });
      } else {
        // Determine if this is a new provider
        this.isNewProvider = !providerId || providerId === '' || providerId === 'new'; // Use getRecord method from PbxApiClient
        // It automatically handles new records (calls getDefault) and existing records

        apiClient.getRecord(providerId || 'new', function (response) {
          _this.hideLoadingState();

          if (response.result && response.data) {
            // Mark as new record if we don't have an ID
            if (!response.data.id || response.data.id === '') {
              response.data._isNew = true;
              _this.isNewProvider = true;
            }

            _this.populateForm(response.data);
          } else {
            // Show error for existing records that failed to load
            if (providerId && providerId !== 'new') {
              UserMessage.showMultiString(response.messages);
            }
          }
        });
      }
    }
    /**
     * Populate form with data from REST API
     * Following CallQueues pattern with initializeDropdownsWithData
     * @param {Object} data - Form data from API
     */

  }, {
    key: "populateForm",
    value: function populateForm(data) {
      var _this2 = this;

      // Store provider data for later use
      this.providerData = data; // Update isNewProvider based on actual data from server

      if (!data.id || data.id === '') {
        this.isNewProvider = true;
      } else {
        this.isNewProvider = false;
      } // Use unified silent population approach (CallQueues pattern)


      Form.populateFormSilently(data, {
        beforePopulate: function beforePopulate(formData) {
          // Initialize dropdowns first with form data (only once)
          _this2.initializeDropdownsWithData(data);
        },
        afterPopulate: function afterPopulate(formData) {
          // Manually populate specific fields if needed by child classes
          _this2.populateFormData(data); // Update visibility based on loaded data


          _this2.updateVisibilityElements();
        }
      }); // Initialize tooltip popups after form is populated

      this.$popuped.popup();
    }
    /**
     * Initialize UI components
     * Called first, before data loading
     */

  }, {
    key: "initializeUIComponents",
    value: function initializeUIComponents() {
      // Initialize basic UI components (synchronous)
      this.$checkBoxes.checkbox();
      this.initializeAccordion(); // Initialize tooltip popups

      this.$popuped.popup(); // Dynamic dropdowns are initialized later in initializeDropdownsWithData (after data is loaded)
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
     * Called after UI components, before form initialization
     */

  }, {
    key: "initializeEventHandlers",
    value: function initializeEventHandlers() {
      var _this4 = this;

      var self = this; // Update header when provider name changes

      this.$description.on('input', function () {
        self.updatePageHeader($(this).val());
      }); // Prevent browser password manager for generated passwords

      this.$secret.on('focus', function () {
        _this4.$secret.attr('autocomplete', 'new-password');
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
     * Populate provider-specific form fields
     * Called from populateForm() after Form.populateFormSilently()
     * Override in child classes for provider-specific field population
     * @param {object} data - Provider data from API
     */

  }, {
    key: "populateFormData",
    value: function populateFormData(data) {
      // Update page header with provider name
      if (data.description) {
        this.updatePageHeader(data.description);
      } // Most fields are now handled by Form.populateFormSilently()
      // This method is for special cases or provider-specific fields
      // Override in child classes (ProviderSIP, ProviderIAX) as needed

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiU0VMRUNUT1JTIiwiRk9STSIsIiRzZWNyZXQiLCJTRUNSRVQiLCIkY2hlY2tCb3hlcyIsIkNIRUNLQk9YRVMiLCIkYWNjb3JkaW9ucyIsIkFDQ09SRElPTlMiLCIkZGVzY3JpcHRpb24iLCJERVNDUklQVElPTiIsIiRwYXNzd29yZFRvb2x0aXBJY29uIiwiUEFTU1dPUkRfVE9PTFRJUF9JQ09OIiwiJHBvcHVwZWQiLCJQT1BVUEVEIiwiaXNOZXdQcm92aWRlciIsImZvcm1Jbml0aWFsaXplZCIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJSZWdFeHAiLCJpbml0aWFsaXplVUlDb21wb25lbnRzIiwiaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMiLCJpbml0aWFsaXplRm9ybSIsImxvYWRGb3JtRGF0YSIsInByb3ZpZGVySWQiLCJ2YWwiLCJjdXJyZW50RGVzY3JpcHRpb24iLCJjb3B5RnJvbUlkIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJpc0NvcHlNb2RlIiwiYXBpQ2xpZW50IiwiU2lwUHJvdmlkZXJzQVBJIiwiSWF4UHJvdmlkZXJzQVBJIiwiUHJvdmlkZXJzQVBJIiwic2hvd0xvYWRpbmdTdGF0ZSIsInVwZGF0ZVBhZ2VIZWFkZXIiLCJzb3VyY2VJZCIsImNhbGxDdXN0b21NZXRob2QiLCJpZCIsInJlc3BvbnNlIiwiaGlkZUxvYWRpbmdTdGF0ZSIsInJlc3VsdCIsImRhdGEiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiZ2V0UmVjb3JkIiwicHJvdmlkZXJEYXRhIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJiZWZvcmVQb3B1bGF0ZSIsImZvcm1EYXRhIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIiwiYWZ0ZXJQb3B1bGF0ZSIsInBvcHVsYXRlRm9ybURhdGEiLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJwb3B1cCIsImNoZWNrYm94IiwiaW5pdGlhbGl6ZUFjY29yZGlvbiIsImluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZURyb3Bkb3duIiwiJGRyb3Bkb3duIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInZhbHVlIiwidmFsaWRhdGVSdWxlcyIsImdldFZhbGlkYXRlUnVsZXMiLCJzZWxmIiwiYWNjb3JkaW9uIiwib25PcGVuIiwic2V0VGltZW91dCIsImNhdGVnb3J5IiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJwbGFjZWhvbGRlciIsImdsb2JhbFRyYW5zbGF0ZSIsInByX05ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsIm9uIiwiYXR0ciIsImluaXRpYWxpemVQYXNzd29yZFdpZGdldCIsImhpZGUiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsInBhc3N3b3JkV2lkZ2V0Iiwic2hvdyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiaW5pdGlhbGl6ZSIsInNldHRpbmdzIiwiZm9ybSIsImFkZENsYXNzIiwicmVtb3ZlQ2xhc3MiLCJkZXNjcmlwdGlvbiIsInRvb2x0aXBEYXRhIiwiVG9vbHRpcEJ1aWxkZXIiLCJidWlsZENvbnRlbnQiLCJwcm92aWRlck5hbWUiLCJwcm92aWRlclR5cGVUZXh0IiwiaGVhZGVyVGV4dCIsInRyaW0iLCJuZXdQcm92aWRlclRleHQiLCJwcl9OZXdQcm92aWRlciIsInRleHQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0lBQ01BLFk7QUFDRjs7QUFZQTtBQUNKO0FBQ0E7QUFDQTtBQUNJLHdCQUFZQyxZQUFaLEVBQTBCO0FBQUE7O0FBQ3RCLFNBQUtBLFlBQUwsR0FBb0JBLFlBQXBCLENBRHNCLENBRXRCOztBQUNBLFNBQUtDLFFBQUwsR0FBZ0JDLENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCQyxJQUF4QixDQUFqQjtBQUNBLFNBQUtDLE9BQUwsR0FBZUgsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJHLE1BQXhCLENBQWhCO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQkwsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJLLFVBQXhCLENBQXBCO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQlAsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJPLFVBQXhCLENBQXBCO0FBQ0EsU0FBS0MsWUFBTCxHQUFvQlQsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJTLFdBQXhCLENBQXJCO0FBQ0EsU0FBS0Msb0JBQUwsR0FBNEJYLENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCVyxxQkFBeEIsQ0FBN0I7QUFDQSxTQUFLQyxRQUFMLEdBQWdCYixDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QmEsT0FBeEIsQ0FBakIsQ0FUc0IsQ0FXdEI7O0FBQ0EsU0FBS0MsYUFBTCxH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OUgsWSxlQUVpQjtBQUNmSyxFQUFBQSxJQUFJLEVBQUUscUJBRFM7QUFFZkUsRUFBQUEsTUFBTSxFQUFFLFNBRk87QUFHZkUsRUFBQUEsVUFBVSxFQUFFLCtCQUhHO0FBSWZFLEVBQUFBLFVBQVUsRUFBRSxtQ0FKRztBQUtmRSxFQUFBQSxXQUFXLEVBQUUsY0FMRTtBQU1mRSxFQUFBQSxxQkFBcUIsRUFBRSx3QkFOUjtBQU9mRSxFQUFBQSxPQUFPLEVBQUU7QUFQTSxDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBDbGlwYm9hcmRKUywgTmV0d29ya0ZpbHRlcnNBUEksIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIFRvb2x0aXBCdWlsZGVyLCBQYXNzd29yZFNjb3JlLCBpMThuLCBQcm92aWRlcnNBUEksIFNpcFByb3ZpZGVyc0FQSSwgSWF4UHJvdmlkZXJzQVBJLCBQYXNzd29yZFdpZGdldCAqL1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIHByb3ZpZGVyIG1hbmFnZW1lbnQgZm9ybXNcbiAqIEBjbGFzcyBQcm92aWRlckJhc2VcbiAqL1xuY2xhc3MgUHJvdmlkZXJCYXNlIHtcbiAgICAvLyBDbGFzcyBjb25zdGFudHMgZm9yIHNlbGVjdG9yc1xuICAgIHN0YXRpYyBTRUxFQ1RPUlMgPSB7XG4gICAgICAgIEZPUk06ICcjc2F2ZS1wcm92aWRlci1mb3JtJyxcbiAgICAgICAgU0VDUkVUOiAnI3NlY3JldCcsXG4gICAgICAgIENIRUNLQk9YRVM6ICcjc2F2ZS1wcm92aWRlci1mb3JtIC5jaGVja2JveCcsXG4gICAgICAgIEFDQ09SRElPTlM6ICcjc2F2ZS1wcm92aWRlci1mb3JtIC51aS5hY2NvcmRpb24nLFxuICAgICAgICBERVNDUklQVElPTjogJyNkZXNjcmlwdGlvbicsXG4gICAgICAgIFBBU1NXT1JEX1RPT0xUSVBfSUNPTjogJy5wYXNzd29yZC10b29sdGlwLWljb24nLFxuICAgICAgICBQT1BVUEVEOiAnLnBvcHVwZWQnXG4gICAgfTtcblxuXG4gICAgLyoqXG4gICAgICogQ29uc3RydWN0b3JcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXJUeXBlIC0gVHlwZSBvZiBwcm92aWRlciAoU0lQIG9yIElBWClcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihwcm92aWRlclR5cGUpIHtcbiAgICAgICAgdGhpcy5wcm92aWRlclR5cGUgPSBwcm92aWRlclR5cGU7XG4gICAgICAgIC8vIENhY2hlIGpRdWVyeSBvYmplY3RzXG4gICAgICAgIHRoaXMuJGZvcm1PYmogPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuRk9STSk7XG4gICAgICAgIHRoaXMuJHNlY3JldCA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5TRUNSRVQpO1xuICAgICAgICB0aGlzLiRjaGVja0JveGVzID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLkNIRUNLQk9YRVMpO1xuICAgICAgICB0aGlzLiRhY2NvcmRpb25zID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLkFDQ09SRElPTlMpO1xuICAgICAgICB0aGlzLiRkZXNjcmlwdGlvbiA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5ERVNDUklQVElPTik7XG4gICAgICAgIHRoaXMuJHBhc3N3b3JkVG9vbHRpcEljb24gPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuUEFTU1dPUkRfVE9PTFRJUF9JQ09OKTtcbiAgICAgICAgdGhpcy4kcG9wdXBlZCA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5QT1BVUEVEKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyYWNrIGlmIHRoaXMgaXMgYSBuZXcgcHJvdmlkZXIgKG5vdCBleGlzdGluZyBpbiBkYXRhYmFzZSlcbiAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmFjayBpZiBmb3JtIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgIHRoaXMuZm9ybUluaXRpYWxpemVkID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBIb3N0IGlucHV0IHZhbGlkYXRpb24gcmVnZXhcbiAgICAgICAgdGhpcy5ob3N0SW5wdXRWYWxpZGF0aW9uID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAgICdeKCgoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSlcXFxcLil7M30nXG4gICAgICAgICAgICArICcoXFxcXGR8WzEtOV1cXFxcZHwxXFxcXGR7Mn18MlswLTRdXFxcXGR8MjVbMC01XSknXG4gICAgICAgICAgICArICcoXFxcXC8oXFxkfFsxLTJdXFxkfDNbMC0yXSkpPydcbiAgICAgICAgICAgICsgJ3xbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSg/OlxcXFwuW2EtekEtWl17Mix9KSspJCcsXG4gICAgICAgICAgICAnZ20nXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgcHJvdmlkZXIgZm9ybSBmb2xsb3dpbmcgQ2FsbFF1ZXVlcyBwYXR0ZXJuXG4gICAgICpcbiAgICAgKiBGbG93OlxuICAgICAqIDEuIEluaXRpYWxpemUgVUkgY29tcG9uZW50cyBmaXJzdCAoc3luY2hyb25vdXMpXG4gICAgICogMi4gSW5pdGlhbGl6ZSBmb3JtIHdpdGggdmFsaWRhdGlvblxuICAgICAqIDMuIExvYWQgZGF0YSBmcm9tIEFQSSAoYXN5bmNocm9ub3VzLCBsYXN0KVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIDEuIEluaXRpYWxpemUgVUkgY29tcG9uZW50cyBmaXJzdCAoc3luY2hyb25vdXMpXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVVJQ29tcG9uZW50cygpO1xuXG4gICAgICAgIC8vIDIuIEluaXRpYWxpemUgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRXZlbnRIYW5kbGVycygpO1xuXG4gICAgICAgIC8vIDMuIEluaXRpYWxpemUgZm9ybSB3aXRoIFJFU1QgQVBJIHNldHRpbmdzIChiZWZvcmUgbG9hZGluZyBkYXRhKVxuICAgICAgICB0aGlzLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gNC4gTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJIChsYXN0LCBhZnRlciBhbGwgVUkgaXMgaW5pdGlhbGl6ZWQpXG4gICAgICAgIHRoaXMubG9hZEZvcm1EYXRhKCk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICogVGhpcyBpcyBjYWxsZWQgbGFzdCwgYWZ0ZXIgYWxsIFVJIGNvbXBvbmVudHMgYXJlIGluaXRpYWxpemVkXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICBjb25zdCBwcm92aWRlcklkID0gJCgnI2lkJykudmFsKCkgfHwgJyc7XG4gICAgICAgIGNvbnN0IGN1cnJlbnREZXNjcmlwdGlvbiA9IHRoaXMuJGRlc2NyaXB0aW9uLnZhbCgpIHx8ICcnO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBjb3B5IG1vZGUgZnJvbSBVUkwgcGFyYW1ldGVyIG9yIGhpZGRlbiBmaWVsZFxuICAgICAgICBjb25zdCBjb3B5RnJvbUlkID0gJCgnI2NvcHktZnJvbS1pZCcpLnZhbCgpO1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG5cbiAgICAgICAgdGhpcy5pc0NvcHlNb2RlID0gZmFsc2U7IC8vIFNhdmUgYXMgY2xhc3MgcHJvcGVydHlcblxuICAgICAgICAvLyBTZWxlY3QgYXBwcm9wcmlhdGUgQVBJIGNsaWVudCBiYXNlZCBvbiBwcm92aWRlciB0eXBlXG4gICAgICAgIGxldCBhcGlDbGllbnQ7XG4gICAgICAgIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ1NJUCcpIHtcbiAgICAgICAgICAgIGFwaUNsaWVudCA9IFNpcFByb3ZpZGVyc0FQSTtcbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLnByb3ZpZGVyVHlwZSA9PT0gJ0lBWCcpIHtcbiAgICAgICAgICAgIGFwaUNsaWVudCA9IElheFByb3ZpZGVyc0FQSTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFwaUNsaWVudCA9IFByb3ZpZGVyc0FQSTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICB0aGlzLnNob3dMb2FkaW5nU3RhdGUoKTtcblxuICAgICAgICAvLyBVcGRhdGUgaGVhZGVyIGltbWVkaWF0ZWx5IGZvciBiZXR0ZXIgVVhcbiAgICAgICAgdGhpcy51cGRhdGVQYWdlSGVhZGVyKGN1cnJlbnREZXNjcmlwdGlvbik7XG5cbiAgICAgICAgaWYgKGNvcHlQYXJhbSB8fCBjb3B5RnJvbUlkKSB7XG4gICAgICAgICAgICAvLyBDb3B5IG1vZGUgLSB1c2UgdGhlIG5ldyBSRVNUZnVsIGNvcHkgZW5kcG9pbnRcbiAgICAgICAgICAgIGNvbnN0IHNvdXJjZUlkID0gY29weVBhcmFtIHx8IGNvcHlGcm9tSWQ7XG4gICAgICAgICAgICB0aGlzLmlzQ29weU1vZGUgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gdHJ1ZTsgLy8gQ29weSBjcmVhdGVzIGEgbmV3IHByb3ZpZGVyXG5cbiAgICAgICAgICAgIC8vIENhbGwgdGhlIGNvcHkgY3VzdG9tIG1ldGhvZFxuICAgICAgICAgICAgYXBpQ2xpZW50LmNhbGxDdXN0b21NZXRob2QoJ2NvcHknLCB7aWQ6IHNvdXJjZUlkfSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGluZ1N0YXRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgYXMgbmV3IHJlY29yZCBmb3IgY29weVxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yXG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyBwcm92aWRlclxuICAgICAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gIXByb3ZpZGVySWQgfHwgcHJvdmlkZXJJZCA9PT0gJycgfHwgcHJvdmlkZXJJZCA9PT0gJ25ldyc7XG5cbiAgICAgICAgICAgIC8vIFVzZSBnZXRSZWNvcmQgbWV0aG9kIGZyb20gUGJ4QXBpQ2xpZW50XG4gICAgICAgICAgICAvLyBJdCBhdXRvbWF0aWNhbGx5IGhhbmRsZXMgbmV3IHJlY29yZHMgKGNhbGxzIGdldERlZmF1bHQpIGFuZCBleGlzdGluZyByZWNvcmRzXG4gICAgICAgICAgICBhcGlDbGllbnQuZ2V0UmVjb3JkKHByb3ZpZGVySWQgfHwgJ25ldycsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRpbmdTdGF0ZSgpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRFxuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLmRhdGEuaWQgfHwgcmVzcG9uc2UuZGF0YS5pZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGZvciBleGlzdGluZyByZWNvcmRzIHRoYXQgZmFpbGVkIHRvIGxvYWRcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3ZpZGVySWQgJiYgcHJvdmlkZXJJZCAhPT0gJ25ldycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKiBGb2xsb3dpbmcgQ2FsbFF1ZXVlcyBwYXR0ZXJuIHdpdGggaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGb3JtIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTdG9yZSBwcm92aWRlciBkYXRhIGZvciBsYXRlciB1c2VcbiAgICAgICAgdGhpcy5wcm92aWRlckRhdGEgPSBkYXRhO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBpc05ld1Byb3ZpZGVyIGJhc2VkIG9uIGFjdHVhbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghZGF0YS5pZCB8fCBkYXRhLmlkID09PSAnJykge1xuICAgICAgICAgICAgdGhpcy5pc05ld1Byb3ZpZGVyID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuaXNOZXdQcm92aWRlciA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2ggKENhbGxRdWV1ZXMgcGF0dGVybilcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBiZWZvcmVQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgZmlyc3Qgd2l0aCBmb3JtIGRhdGEgKG9ubHkgb25jZSlcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBwb3B1bGF0ZSBzcGVjaWZpYyBmaWVsZHMgaWYgbmVlZGVkIGJ5IGNoaWxkIGNsYXNzZXNcbiAgICAgICAgICAgICAgICB0aGlzLnBvcHVsYXRlRm9ybURhdGEoZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdmlzaWJpbGl0eSBiYXNlZCBvbiBsb2FkZWQgZGF0YVxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcCBwb3B1cHMgYWZ0ZXIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgdGhpcy4kcG9wdXBlZC5wb3B1cCgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVUkgY29tcG9uZW50c1xuICAgICAqIENhbGxlZCBmaXJzdCwgYmVmb3JlIGRhdGEgbG9hZGluZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgYmFzaWMgVUkgY29tcG9uZW50cyAoc3luY2hyb25vdXMpXG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQWNjb3JkaW9uKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwIHBvcHVwc1xuICAgICAgICB0aGlzLiRwb3B1cGVkLnBvcHVwKCk7XG5cbiAgICAgICAgLy8gRHluYW1pYyBkcm9wZG93bnMgYXJlIGluaXRpYWxpemVkIGxhdGVyIGluIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YSAoYWZ0ZXIgZGF0YSBpcyBsb2FkZWQpXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIGRyb3Bkb3ducyBmb2xsb3dpbmcgVjUuMCBjbGVhbiBkYXRhIHBhdHRlcm5cbiAgICAgKiBDYWxsZWQgQUZURVIgcG9wdWxhdGVGb3JtRGF0YSB0byBlbnN1cmUgY2xlYW4gZGF0YSBmbG93XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJIGNvbnRhaW5pbmcgY29tcGxldGUgZmllbGQgdmFsdWVzIGFuZCByZXByZXNlbnQgdGV4dFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhID0ge30pIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkeW5hbWljIGRyb3Bkb3ducyAoQVBJLWJhc2VkIC0gdXNlcyBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHdpdGggY29tcGxldGUgZGF0YSlcbiAgICAgICAgdGhpcy5pbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duKGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdGF0aWMgZHJvcGRvd25zIChyZW5kZXJlZCBieSBQSFAgLSB1c2Ugc3RhbmRhcmQgRm9tYW50aWMgVUkpXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVnaXN0cmF0aW9uIHR5cGUgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqIFRoaXMgZHJvcGRvd24gbmVlZHMgY3VzdG9tIG9uQ2hhbmdlIGZvciBwcm92aWRlci1zcGVjaWZpYyB2aXNpYmlsaXR5IGxvZ2ljXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlLWRyb3Bkb3duJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3Igc3RhdGljIGRyb3Bkb3ducyByZW5kZXJlZCBieSBQSFAsIHVzZSBzaW1wbGUgRm9tYW50aWMgVUkgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gVGhpcyBkcm9wZG93biBuZWVkcyBjdXN0b20gb25DaGFuZ2UgZm9yIGNvbXBsZXggZmllbGQgdmlzaWJpbGl0eSBsb2dpY1xuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhY2NvcmRpb24gd2l0aCBjYWxsYmFja3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNjb3JkaW9uKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy4kYWNjb3JkaW9ucy5hY2NvcmRpb24oe1xuICAgICAgICAgICAgb25PcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZmllbGQgdmlzaWJpbGl0eSB3aGVuIGFjY29yZGlvbiBvcGVuc1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHNlbGYudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93biBmb2xsb3dpbmcgVjUuMCBjbGVhbiBkYXRhIHBhdHRlcm5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGEgZnJvbSBBUEkgY29udGFpbmluZyBuZXR3b3JrZmlsdGVyaWQgYW5kIG5ldHdvcmtmaWx0ZXJpZF9yZXByZXNlbnRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duKGRhdGEgPSB7fSkge1xuICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHRoaXMucHJvdmlkZXJUeXBlIHx8ICdTSVAnO1xuICAgICAgICBcbiAgICAgICAgLy8gVjUuMCBwYXR0ZXJuOiBDb21wbGV0ZSBhdXRvbWF0aW9uIC0gbm8gY3VzdG9tIG9uQ2hhbmdlIG5lZWRlZFxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgIGFwaVVybDogYC9wYnhjb3JlL2FwaS92My9uZXR3b3JrLWZpbHRlcnM6Z2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT0ke2NhdGVnb3J5fWAsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXIsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2VcbiAgICAgICAgICAgIC8vIE5vIG9uQ2hhbmdlIGNhbGxiYWNrIC0gRHluYW1pY0Ryb3Bkb3duQnVpbGRlciBoYW5kbGVzIGV2ZXJ5dGhpbmcgYXV0b21hdGljYWxseTpcbiAgICAgICAgICAgIC8vIC0gSGlkZGVuIGlucHV0IHN5bmNocm9uaXphdGlvblxuICAgICAgICAgICAgLy8gLSBDaGFuZ2UgZXZlbnQgdHJpZ2dlcmluZyAgXG4gICAgICAgICAgICAvLyAtIEZvcm0uZGF0YUNoYW5nZWQoKSBub3RpZmljYXRpb25cbiAgICAgICAgICAgIC8vIC0gVmFsaWRhdGlvbiBlcnJvciBjbGVhcmluZ1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV2ZW50IGhhbmRsZXJzXG4gICAgICogQ2FsbGVkIGFmdGVyIFVJIGNvbXBvbmVudHMsIGJlZm9yZSBmb3JtIGluaXRpYWxpemF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgd2hlbiBwcm92aWRlciBuYW1lIGNoYW5nZXNcbiAgICAgICAgdGhpcy4kZGVzY3JpcHRpb24ub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBzZWxmLnVwZGF0ZVBhZ2VIZWFkZXIoJCh0aGlzKS52YWwoKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFByZXZlbnQgYnJvd3NlciBwYXNzd29yZCBtYW5hZ2VyIGZvciBnZW5lcmF0ZWQgcGFzc3dvcmRzXG4gICAgICAgIHRoaXMuJHNlY3JldC5vbignZm9jdXMnLCAoKSA9PiB7XG4gICAgICAgICAgICB0aGlzLiRzZWNyZXQuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldFxuICAgICAgICB0aGlzLmluaXRpYWxpemVQYXNzd29yZFdpZGdldCgpO1xuICAgIH1cblxuXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgd2l0aCBkZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIHBhc3N3b3JkIHdpZGdldCB3aXRoIGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgICAgICBpZiAodGhpcy4kc2VjcmV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEhpZGUgbGVnYWN5IEhUTUwgYnV0dG9ucyAtIFBhc3N3b3JkV2lkZ2V0IHdpbGwgbWFuYWdlIGl0cyBvd24gYnV0dG9uc1xuICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKS5oaWRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERlZmF1bHQgY29uZmlndXJhdGlvbiBmb3IgcHJvdmlkZXJzIC0gd2lsbCBiZSB1cGRhdGVkIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KHRoaXMuJHNlY3JldCwge1xuICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsICAvLyBXaWxsIGJlIHVwZGF0ZWQgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsICAgICAgLy8gS2VlcCBjb3B5IGJ1dHRvbiBmb3IgYWxsIG1vZGVzXG4gICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IGZhbHNlLCAvLyBEb24ndCB2YWxpZGF0ZSBvbiBsb2FkLCBsZXQgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzIGhhbmRsZSBpdFxuICAgICAgICAgICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMzIgLy8gUHJvdmlkZXIgcGFzc3dvcmRzIHNob3VsZCBiZSAzMiBjaGFycyBmb3IgYmV0dGVyIHNlY3VyaXR5XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgd2lkZ2V0IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgICAgIHRoaXMucGFzc3dvcmRXaWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB2aXNpYmlsaXR5IGVsZW1lbnRzIG5vdyB0aGF0IHdpZGdldCBpcyBpbml0aWFsaXplZFxuICAgICAgICAgICAgLy8gVGhpcyB3aWxsIGFwcGx5IHRoZSBjb3JyZWN0IGNvbmZpZ3VyYXRpb24gYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gcHJvdmlkZXIgc2V0dGluZ3NcbiAgICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICAvLyBPdmVycmlkZSBpbiBjaGlsZCBjbGFzc2VzIHRvIGNvbmZpZ3VyZSBQYXNzd29yZFdpZGdldCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHBhc3N3b3JkIHRvb2x0aXAgaWNvbiB3aGVuIGluICdub25lJyByZWdpc3RyYXRpb24gbW9kZVxuICAgICAqL1xuICAgIHNob3dQYXNzd29yZFRvb2x0aXAoKSB7XG4gICAgICAgIHRoaXMuJHBhc3N3b3JkVG9vbHRpcEljb24uc2hvdygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHBhc3N3b3JkIHRvb2x0aXAgaWNvblxuICAgICAqL1xuICAgIGhpZGVQYXNzd29yZFRvb2x0aXAoKSB7XG4gICAgICAgIHRoaXMuJHBhc3N3b3JkVG9vbHRpcEljb24uaGlkZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHByb3ZpZGVyIHNldHRpbmdzXG4gICAgICogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICAvLyBPdmVycmlkZSBpbiBjaGlsZCBjbGFzc2VzXG4gICAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCB2YWxpZGF0aW9uIGFuZCBjYWxsYmFja3NcbiAgICAgKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBvdmVycmlkZGVuIGluIHByb3ZpZGVyLW1vZGlmeS5qcyB0byBjb25maWd1cmUgUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIC8vIFVSTCBpcyBub3Qgc2V0IGhlcmUgLSBjaGlsZCBjbGFzc2VzIGNvbmZpZ3VyZSBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGhpcy5jYkJlZm9yZVNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gdGhpcy5jYkFmdGVyU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge29iamVjdH0gTW9kaWZpZWQgc2V0dGluZ3NcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBJTVBPUlRBTlQ6IERvbid0IG92ZXJ3cml0ZSByZXN1bHQuZGF0YSAtIGl0IGFscmVhZHkgY29udGFpbnMgcHJvY2Vzc2VkIGNoZWNrYm94IHZhbHVlcyBmcm9tIEZvcm0uanNcbiAgICAgICAgLy8gV2Ugc2hvdWxkIG9ubHkgYWRkIG9yIG1vZGlmeSBzcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgXG4gICAgICAgIC8vIElmIHJlc3VsdC5kYXRhIGlzIG5vdCBkZWZpbmVkIChzaG91bGRuJ3QgaGFwcGVuKSwgaW5pdGlhbGl6ZSBpdFxuICAgICAgICBpZiAoIXJlc3VsdC5kYXRhKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciB2YWx1ZSBpcyBhdXRvbWF0aWNhbGx5IGhhbmRsZWQgYnkgZm9ybSBzZXJpYWxpemF0aW9uXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzXG4gICAgfVxuXG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRpbmcgc3RhdGUgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgc2hvd0xvYWRpbmdTdGF0ZSgpIHtcbiAgICAgICAgdGhpcy4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIGxvYWRpbmcgc3RhdGUgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgaGlkZUxvYWRpbmdTdGF0ZSgpIHtcbiAgICAgICAgdGhpcy4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBwcm92aWRlci1zcGVjaWZpYyBmb3JtIGZpZWxkc1xuICAgICAqIENhbGxlZCBmcm9tIHBvcHVsYXRlRm9ybSgpIGFmdGVyIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgICAqIE92ZXJyaWRlIGluIGNoaWxkIGNsYXNzZXMgZm9yIHByb3ZpZGVyLXNwZWNpZmljIGZpZWxkIHBvcHVsYXRpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm1EYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggcHJvdmlkZXIgbmFtZVxuICAgICAgICBpZiAoZGF0YS5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQYWdlSGVhZGVyKGRhdGEuZGVzY3JpcHRpb24pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTW9zdCBmaWVsZHMgYXJlIG5vdyBoYW5kbGVkIGJ5IEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgICAgICAvLyBUaGlzIG1ldGhvZCBpcyBmb3Igc3BlY2lhbCBjYXNlcyBvciBwcm92aWRlci1zcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgLy8gT3ZlcnJpZGUgaW4gY2hpbGQgY2xhc3NlcyAoUHJvdmlkZXJTSVAsIFByb3ZpZGVySUFYKSBhcyBuZWVkZWRcbiAgICB9XG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXBzIGZyb20gc3RydWN0dXJlZCBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRvb2x0aXBEYXRhIC0gVG9vbHRpcCBkYXRhIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdG9vbHRpcFxuICAgICAqIEBkZXByZWNhdGVkIFVzZSBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQoKSBpbnN0ZWFkXG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudCh0b29sdGlwRGF0YSkge1xuICAgICAgICByZXR1cm4gVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBhZ2UgaGVhZGVyIHdpdGggcHJvdmlkZXIgbmFtZSBhbmQgdHlwZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlck5hbWUgLSBQcm92aWRlciBuYW1lXG4gICAgICovXG4gICAgdXBkYXRlUGFnZUhlYWRlcihwcm92aWRlck5hbWUpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJUeXBlVGV4dCA9IHRoaXMucHJvdmlkZXJUeXBlID09PSAnU0lQJyA/ICdTSVAnIDogJ0lBWCc7XG4gICAgICAgIGxldCBoZWFkZXJUZXh0O1xuICAgICAgICBcbiAgICAgICAgaWYgKHByb3ZpZGVyTmFtZSAmJiBwcm92aWRlck5hbWUudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgLy8gRXhpc3RpbmcgcHJvdmlkZXIgd2l0aCBuYW1lXG4gICAgICAgICAgICBoZWFkZXJUZXh0ID0gYCR7cHJvdmlkZXJOYW1lfSAoJHtwcm92aWRlclR5cGVUZXh0fSlgO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTmV3IHByb3ZpZGVyIG9yIG5vIG5hbWVcbiAgICAgICAgICAgIGNvbnN0IG5ld1Byb3ZpZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5wcl9OZXdQcm92aWRlcjtcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBgJHtuZXdQcm92aWRlclRleHR9ICgke3Byb3ZpZGVyVHlwZVRleHR9KWA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBtYWluIGhlYWRlciBjb250ZW50XG4gICAgICAgICQoJ2gxIC5jb250ZW50JykudGV4dChoZWFkZXJUZXh0KTtcbiAgICB9XG59Il19