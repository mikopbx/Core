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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS, NetworkFiltersAPI, DynamicDropdownBuilder, TooltipBuilder, PasswordScore, i18n, ProvidersAPI, PasswordWidget */

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
      var requestId = providerId;
      this.isCopyMode = false; // Save as class property

      if (copyParam || copyFromId) {
        requestId = 'copy-' + (copyParam || copyFromId);
        this.isCopyMode = true;
      } // Determine if this is a new provider
      // New providers have empty ID or 'new' as ID in the URL, or are in copy mode


      this.isNewProvider = !providerId || providerId === '' || providerId === 'new' || this.isCopyMode; // Update header immediately for better UX

      this.updatePageHeader(currentDescription); // Show loading state

      this.showLoadingState(); // Load provider data from REST API

      ProvidersAPI.getRecord(requestId, this.providerType, function (response) {
        _this.hideLoadingState();

        if (response.result && response.data) {
          // Store provider data for later use
          _this.providerData = response.data;

          _this.populateFormData(response.data);
        } else if (providerId && providerId !== 'new') {
          UserMessage.showMultiString(response.messages);
        } // Initialize dynamic dropdowns with API data (V5.0 pattern)
        // For both new and existing records - API provides complete data with defaults


        var dropdownData = response.result && response.data ? response.data : {};

        _this.initializeDropdownsWithData(dropdownData); // Continue with initialization


        _this.initializeUIComponents();

        _this.initializeEventHandlers();

        _this.initializeForm();

        _this.updateVisibilityElements(); // Mark form as changed if in copy mode to enable save button


        if (_this.isCopyMode) {
          Form.dataChanged();
        } // Initialize tooltip popups


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
      var _this2 = this;

      var $dropdown = $('#registration_type-dropdown');

      if ($dropdown.length === 0) {
        return;
      } // For static dropdowns rendered by PHP, use simple Fomantic UI initialization
      // This dropdown needs custom onChange for complex field visibility logic


      $dropdown.dropdown({
        onChange: function onChange(value) {
          _this2.updateVisibilityElements(); // Update validation rules based on registration type


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
     * Initialize network filter dropdown following V5.0 clean data pattern
     * @param {object} data - Provider data from API containing networkfilterid and networkfilterid_represent
     */

  }, {
    key: "initializeNetworkFilterDropdown",
    value: function initializeNetworkFilterDropdown() {
      var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var category = this.providerType || 'SIP'; // V5.0 pattern: Complete automation - no custom onChange needed

      DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
        apiUrl: "/pbxcore/api/v2/network-filters/getForSelect?categories[]=".concat(category),
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
  DESCRIPTION: '#description',
  PASSWORD_TOOLTIP_ICON: '.password-tooltip-icon',
  POPUPED: '.popuped'
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXItYmFzZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiUHJvdmlkZXJCYXNlIiwicHJvdmlkZXJUeXBlIiwiJGZvcm1PYmoiLCIkIiwiU0VMRUNUT1JTIiwiRk9STSIsIiRzZWNyZXQiLCJTRUNSRVQiLCIkY2hlY2tCb3hlcyIsIkNIRUNLQk9YRVMiLCIkYWNjb3JkaW9ucyIsIkFDQ09SRElPTlMiLCIkZGVzY3JpcHRpb24iLCJERVNDUklQVElPTiIsIiRwYXNzd29yZFRvb2x0aXBJY29uIiwiUEFTU1dPUkRfVE9PTFRJUF9JQ09OIiwiJHBvcHVwZWQiLCJQT1BVUEVEIiwiaXNOZXdQcm92aWRlciIsImZvcm1Jbml0aWFsaXplZCIsImhvc3RJbnB1dFZhbGlkYXRpb24iLCJSZWdFeHAiLCJwcm92aWRlcklkIiwidmFsIiwiY3VycmVudERlc2NyaXB0aW9uIiwiY29weUZyb21JZCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiY29weVBhcmFtIiwiZ2V0IiwicmVxdWVzdElkIiwiaXNDb3B5TW9kZSIsInVwZGF0ZVBhZ2VIZWFkZXIiLCJzaG93TG9hZGluZ1N0YXRlIiwiUHJvdmlkZXJzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJoaWRlTG9hZGluZ1N0YXRlIiwicmVzdWx0IiwiZGF0YSIsInByb3ZpZGVyRGF0YSIsInBvcHVsYXRlRm9ybURhdGEiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiZHJvcGRvd25EYXRhIiwiaW5pdGlhbGl6ZURyb3Bkb3duc1dpdGhEYXRhIiwiaW5pdGlhbGl6ZVVJQ29tcG9uZW50cyIsImluaXRpYWxpemVFdmVudEhhbmRsZXJzIiwiaW5pdGlhbGl6ZUZvcm0iLCJ1cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJwb3B1cCIsIm9uIiwiYXR0ciIsImNoZWNrYm94IiwiaW5pdGlhbGl6ZUFjY29yZGlvbiIsImluaXRpYWxpemVOZXR3b3JrRmlsdGVyRHJvcGRvd24iLCJpbml0aWFsaXplUmVnaXN0cmF0aW9uVHlwZURyb3Bkb3duIiwiJGRyb3Bkb3duIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInZhbHVlIiwidmFsaWRhdGVSdWxlcyIsImdldFZhbGlkYXRlUnVsZXMiLCJzZWxmIiwiYWNjb3JkaW9uIiwib25PcGVuIiwic2V0VGltZW91dCIsImNhdGVnb3J5IiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJhcGlVcmwiLCJwbGFjZWhvbGRlciIsImdsb2JhbFRyYW5zbGF0ZSIsInByX05ldHdvcmtGaWx0ZXIiLCJjYWNoZSIsImluaXRpYWxpemVQYXNzd29yZFdpZGdldCIsImhpZGUiLCJ3aWRnZXQiLCJQYXNzd29yZFdpZGdldCIsImluaXQiLCJ2YWxpZGF0aW9uIiwiVkFMSURBVElPTiIsIlNPRlQiLCJnZW5lcmF0ZUJ1dHRvbiIsInNob3dQYXNzd29yZEJ1dHRvbiIsImNsaXBib2FyZEJ1dHRvbiIsInNob3dTdHJlbmd0aEJhciIsInNob3dXYXJuaW5ncyIsInZhbGlkYXRlT25JbnB1dCIsImNoZWNrT25Mb2FkIiwibWluU2NvcmUiLCJnZW5lcmF0ZUxlbmd0aCIsInBhc3N3b3JkV2lkZ2V0Iiwic2hvdyIsImNiQmVmb3JlU2VuZEZvcm0iLCJiaW5kIiwiY2JBZnRlclNlbmRGb3JtIiwiaW5pdGlhbGl6ZSIsInNldHRpbmdzIiwiZm9ybSIsImFkZENsYXNzIiwicmVtb3ZlQ2xhc3MiLCJpZCIsImRlc2NyaXB0aW9uIiwibm90ZSIsInVzZXJuYW1lIiwic2VjcmV0IiwiaG9zdCIsInJlZ2lzdHJhdGlvbl90eXBlIiwibmV0d29ya2ZpbHRlcmlkIiwibWFudWFsYXR0cmlidXRlcyIsInBvcnQiLCJwcm9wIiwicXVhbGlmeSIsInJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoIiwibm9yZWdpc3RlciIsImRpc2FibGVkIiwidG9vbHRpcERhdGEiLCJUb29sdGlwQnVpbGRlciIsImJ1aWxkQ29udGVudCIsInByb3ZpZGVyTmFtZSIsInByb3ZpZGVyVHlwZVRleHQiLCJoZWFkZXJUZXh0IiwidHJpbSIsIm5ld1Byb3ZpZGVyVGV4dCIsInByX05ld1Byb3ZpZGVyIiwidGV4dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsWTtBQUNGOztBQVlBO0FBQ0o7QUFDQTtBQUNBO0FBQ0ksd0JBQVlDLFlBQVosRUFBMEI7QUFBQTs7QUFDdEIsU0FBS0EsWUFBTCxHQUFvQkEsWUFBcEIsQ0FEc0IsQ0FFdEI7O0FBQ0EsU0FBS0MsUUFBTCxHQUFnQkMsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJDLElBQXhCLENBQWpCO0FBQ0EsU0FBS0MsT0FBTCxHQUFlSCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QkcsTUFBeEIsQ0FBaEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CTCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QkssVUFBeEIsQ0FBcEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CUCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1Qk8sVUFBeEIsQ0FBcEI7QUFDQSxTQUFLQyxZQUFMLEdBQW9CVCxDQUFDLENBQUNILFlBQVksQ0FBQ0ksU0FBYixDQUF1QlMsV0FBeEIsQ0FBckI7QUFDQSxTQUFLQyxvQkFBTCxHQUE0QlgsQ0FBQyxDQUFDSCxZQUFZLENBQUNJLFNBQWIsQ0FBdUJXLHFCQUF4QixDQUE3QjtBQUNBLFNBQUtDLFFBQUwsR0FBZ0JiLENBQUMsQ0FBQ0gsWUFBWSxDQUFDSSxTQUFiLENBQXVCYSxPQUF4QixDQUFqQixDQVRzQixDQVd0Qjs7QUFDQSxT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RyxlQUFlLEdBQUdwRCxlQUFlLENBQUNxRCxjQUFoQixJQUFrQyxjQUExRDtBQUNBSCxRQUFBQSxVQUFVLGFBQU1FLGVBQU4sZUFBMEJILGdCQUExQixNQUFWO0FBQ0gsT0FYMEIsQ0FhM0I7OztBQUNBN0gsTUFBQUEsQ0FBQyxDQUFDLGFBQUQsQ0FBRCxDQUFpQmtJLElBQWpCLENBQXNCSixVQUF0QjtBQUNIOzs7Ozs7Z0JBeFpDakksWSxlQUVpQjtBQUNmSyxFQUFBQSxJQUFJLEVBQUUscUJBRFM7QUFFZkUsRUFBQUEsTUFBTSxFQUFFLFNBRk87QUFHZkUsRUFBQUEsVUFBVSxFQUFFLCtCQUhHO0FBSWZFLEVBQUFBLFVBQVUsRUFBRSxtQ0FKRztBQUtmRSxFQUFBQSxXQUFXLEVBQUUsY0FMRTtBQU1mRSxFQUFBQSxxQkFBcUIsRUFBRSx3QkFOUjtBQU9mRSxFQUFBQSxPQUFPLEVBQUU7QUFQTSxDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBDbGlwYm9hcmRKUywgTmV0d29ya0ZpbHRlcnNBUEksIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIsIFRvb2x0aXBCdWlsZGVyLCBQYXNzd29yZFNjb3JlLCBpMThuLCBQcm92aWRlcnNBUEksIFBhc3N3b3JkV2lkZ2V0ICovXG5cbi8qKlxuICogQmFzZSBjbGFzcyBmb3IgcHJvdmlkZXIgbWFuYWdlbWVudCBmb3Jtc1xuICogQGNsYXNzIFByb3ZpZGVyQmFzZVxuICovXG5jbGFzcyBQcm92aWRlckJhc2Uge1xuICAgIC8vIENsYXNzIGNvbnN0YW50cyBmb3Igc2VsZWN0b3JzXG4gICAgc3RhdGljIFNFTEVDVE9SUyA9IHtcbiAgICAgICAgRk9STTogJyNzYXZlLXByb3ZpZGVyLWZvcm0nLFxuICAgICAgICBTRUNSRVQ6ICcjc2VjcmV0JyxcbiAgICAgICAgQ0hFQ0tCT1hFUzogJyNzYXZlLXByb3ZpZGVyLWZvcm0gLmNoZWNrYm94JyxcbiAgICAgICAgQUNDT1JESU9OUzogJyNzYXZlLXByb3ZpZGVyLWZvcm0gLnVpLmFjY29yZGlvbicsXG4gICAgICAgIERFU0NSSVBUSU9OOiAnI2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgUEFTU1dPUkRfVE9PTFRJUF9JQ09OOiAnLnBhc3N3b3JkLXRvb2x0aXAtaWNvbicsXG4gICAgICAgIFBPUFVQRUQ6ICcucG9wdXBlZCdcbiAgICB9O1xuXG5cbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RvclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlclR5cGUgLSBUeXBlIG9mIHByb3ZpZGVyIChTSVAgb3IgSUFYKVxuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKHByb3ZpZGVyVHlwZSkge1xuICAgICAgICB0aGlzLnByb3ZpZGVyVHlwZSA9IHByb3ZpZGVyVHlwZTtcbiAgICAgICAgLy8gQ2FjaGUgalF1ZXJ5IG9iamVjdHNcbiAgICAgICAgdGhpcy4kZm9ybU9iaiA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5GT1JNKTtcbiAgICAgICAgdGhpcy4kc2VjcmV0ID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLlNFQ1JFVCk7XG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuQ0hFQ0tCT1hFUyk7XG4gICAgICAgIHRoaXMuJGFjY29yZGlvbnMgPSAkKFByb3ZpZGVyQmFzZS5TRUxFQ1RPUlMuQUNDT1JESU9OUyk7XG4gICAgICAgIHRoaXMuJGRlc2NyaXB0aW9uID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLkRFU0NSSVBUSU9OKTtcbiAgICAgICAgdGhpcy4kcGFzc3dvcmRUb29sdGlwSWNvbiA9ICQoUHJvdmlkZXJCYXNlLlNFTEVDVE9SUy5QQVNTV09SRF9UT09MVElQX0lDT04pO1xuICAgICAgICB0aGlzLiRwb3B1cGVkID0gJChQcm92aWRlckJhc2UuU0VMRUNUT1JTLlBPUFVQRUQpO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJhY2sgaWYgdGhpcyBpcyBhIG5ldyBwcm92aWRlciAobm90IGV4aXN0aW5nIGluIGRhdGFiYXNlKVxuICAgICAgICB0aGlzLmlzTmV3UHJvdmlkZXIgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyYWNrIGlmIGZvcm0gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhvc3QgaW5wdXQgdmFsaWRhdGlvbiByZWdleFxuICAgICAgICB0aGlzLmhvc3RJbnB1dFZhbGlkYXRpb24gPSBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgJ14oKChcXFxcZHxbMS05XVxcXFxkfDFcXFxcZHsyfXwyWzAtNF1cXFxcZHwyNVswLTVdKVxcXFwuKXszfSdcbiAgICAgICAgICAgICsgJyhcXFxcZHxbMS05XVxcXFxkfDFcXFxcZHsyfXwyWzAtNF1cXFxcZHwyNVswLTVdKSdcbiAgICAgICAgICAgICsgJyhcXFxcLyhcXGR8WzEtMl1cXGR8M1swLTJdKSk/J1xuICAgICAgICAgICAgKyAnfFthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKD86XFxcXC5bYS16QS1aXXsyLH0pKykkJyxcbiAgICAgICAgICAgICdnbSdcbiAgICAgICAgKTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBwcm92aWRlciBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc3QgcHJvdmlkZXJJZCA9ICQoJyNpZCcpLnZhbCgpIHx8ICcnO1xuICAgICAgICBjb25zdCBjdXJyZW50RGVzY3JpcHRpb24gPSB0aGlzLiRkZXNjcmlwdGlvbi52YWwoKSB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGZvciBjb3B5IG1vZGUgZnJvbSBVUkwgcGFyYW1ldGVyIG9yIGhpZGRlbiBmaWVsZFxuICAgICAgICBjb25zdCBjb3B5RnJvbUlkID0gJCgnI2NvcHktZnJvbS1pZCcpLnZhbCgpO1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjb3B5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG4gICAgICAgIFxuICAgICAgICBsZXQgcmVxdWVzdElkID0gcHJvdmlkZXJJZDtcbiAgICAgICAgdGhpcy5pc0NvcHlNb2RlID0gZmFsc2U7IC8vIFNhdmUgYXMgY2xhc3MgcHJvcGVydHlcbiAgICAgICAgXG4gICAgICAgIGlmIChjb3B5UGFyYW0gfHwgY29weUZyb21JZCkge1xuICAgICAgICAgICAgcmVxdWVzdElkID0gJ2NvcHktJyArIChjb3B5UGFyYW0gfHwgY29weUZyb21JZCk7XG4gICAgICAgICAgICB0aGlzLmlzQ29weU1vZGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyBwcm92aWRlclxuICAgICAgICAvLyBOZXcgcHJvdmlkZXJzIGhhdmUgZW1wdHkgSUQgb3IgJ25ldycgYXMgSUQgaW4gdGhlIFVSTCwgb3IgYXJlIGluIGNvcHkgbW9kZVxuICAgICAgICB0aGlzLmlzTmV3UHJvdmlkZXIgPSAhcHJvdmlkZXJJZCB8fCBwcm92aWRlcklkID09PSAnJyB8fCBwcm92aWRlcklkID09PSAnbmV3JyB8fCB0aGlzLmlzQ29weU1vZGU7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGVhZGVyIGltbWVkaWF0ZWx5IGZvciBiZXR0ZXIgVVhcbiAgICAgICAgdGhpcy51cGRhdGVQYWdlSGVhZGVyKGN1cnJlbnREZXNjcmlwdGlvbik7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgdGhpcy5zaG93TG9hZGluZ1N0YXRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIHByb3ZpZGVyIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAgICBQcm92aWRlcnNBUEkuZ2V0UmVjb3JkKHJlcXVlc3RJZCwgdGhpcy5wcm92aWRlclR5cGUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5oaWRlTG9hZGluZ1N0YXRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFN0b3JlIHByb3ZpZGVyIGRhdGEgZm9yIGxhdGVyIHVzZVxuICAgICAgICAgICAgICAgIHRoaXMucHJvdmlkZXJEYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgICAgICB0aGlzLnBvcHVsYXRlRm9ybURhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb3ZpZGVySWQgJiYgcHJvdmlkZXJJZCAhPT0gJ25ldycpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIGR5bmFtaWMgZHJvcGRvd25zIHdpdGggQVBJIGRhdGEgKFY1LjAgcGF0dGVybilcbiAgICAgICAgICAgIC8vIEZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3JkcyAtIEFQSSBwcm92aWRlcyBjb21wbGV0ZSBkYXRhIHdpdGggZGVmYXVsdHNcbiAgICAgICAgICAgIGNvbnN0IGRyb3Bkb3duRGF0YSA9IChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkgPyByZXNwb25zZS5kYXRhIDoge307XG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkcm9wZG93bkRhdGEpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDb250aW51ZSB3aXRoIGluaXRpYWxpemF0aW9uXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVVSUNvbXBvbmVudHMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRXZlbnRIYW5kbGVycygpO1xuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgaWYgaW4gY29weSBtb2RlIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNDb3B5TW9kZSkge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwIHBvcHVwc1xuICAgICAgICAgICAgdGhpcy4kcG9wdXBlZC5wb3B1cCgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IGJyb3dzZXIgcGFzc3dvcmQgbWFuYWdlciBmb3IgZ2VuZXJhdGVkIHBhc3N3b3Jkc1xuICAgICAgICAgICAgdGhpcy4kc2VjcmV0Lm9uKCdmb2N1cycsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLiRzZWNyZXQuYXR0cignYXV0b2NvbXBsZXRlJywgJ25ldy1wYXNzd29yZCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVUkgY29tcG9uZW50c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVVSUNvbXBvbmVudHMoKSB7XG4gICAgICAgIHRoaXMuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQWNjb3JkaW9uKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBEeW5hbWljIGRyb3Bkb3ducyBhcmUgaW5pdGlhbGl6ZWQgYWZ0ZXIgZGF0YSBpcyBsb2FkZWQgd2l0aCBwcm92aWRlciBkYXRhXG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWxsIGRyb3Bkb3ducyBmb2xsb3dpbmcgVjUuMCBjbGVhbiBkYXRhIHBhdHRlcm5cbiAgICAgKiBDYWxsZWQgQUZURVIgcG9wdWxhdGVGb3JtRGF0YSB0byBlbnN1cmUgY2xlYW4gZGF0YSBmbG93XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBQcm92aWRlciBkYXRhIGZyb20gQVBJIGNvbnRhaW5pbmcgY29tcGxldGUgZmllbGQgdmFsdWVzIGFuZCByZXByZXNlbnQgdGV4dFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcm9wZG93bnNXaXRoRGF0YShkYXRhID0ge30pIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkeW5hbWljIGRyb3Bkb3ducyAoQVBJLWJhc2VkIC0gdXNlcyBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHdpdGggY29tcGxldGUgZGF0YSlcbiAgICAgICAgdGhpcy5pbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duKGRhdGEpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdGF0aWMgZHJvcGRvd25zIChyZW5kZXJlZCBieSBQSFAgLSB1c2Ugc3RhbmRhcmQgRm9tYW50aWMgVUkpXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcmVnaXN0cmF0aW9uIHR5cGUgZHJvcGRvd24gd2l0aCBzdGFuZGFyZCBGb21hbnRpYyBVSSAoUEhQLXJlbmRlcmVkKVxuICAgICAqIFRoaXMgZHJvcGRvd24gbmVlZHMgY3VzdG9tIG9uQ2hhbmdlIGZvciBwcm92aWRlci1zcGVjaWZpYyB2aXNpYmlsaXR5IGxvZ2ljXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVJlZ2lzdHJhdGlvblR5cGVEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnI3JlZ2lzdHJhdGlvbl90eXBlLWRyb3Bkb3duJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGb3Igc3RhdGljIGRyb3Bkb3ducyByZW5kZXJlZCBieSBQSFAsIHVzZSBzaW1wbGUgRm9tYW50aWMgVUkgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgLy8gVGhpcyBkcm9wZG93biBuZWVkcyBjdXN0b20gb25DaGFuZ2UgZm9yIGNvbXBsZXggZmllbGQgdmlzaWJpbGl0eSBsb2dpY1xuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCk7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZhbGlkYXRpb24gcnVsZXMgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhY2NvcmRpb24gd2l0aCBjYWxsYmFja3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNjb3JkaW9uKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy4kYWNjb3JkaW9ucy5hY2NvcmRpb24oe1xuICAgICAgICAgICAgb25PcGVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZmllbGQgdmlzaWJpbGl0eSB3aGVuIGFjY29yZGlvbiBvcGVuc1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHNlbGYudXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgNTApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBuZXR3b3JrIGZpbHRlciBkcm9wZG93biBmb2xsb3dpbmcgVjUuMCBjbGVhbiBkYXRhIHBhdHRlcm5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFByb3ZpZGVyIGRhdGEgZnJvbSBBUEkgY29udGFpbmluZyBuZXR3b3JrZmlsdGVyaWQgYW5kIG5ldHdvcmtmaWx0ZXJpZF9yZXByZXNlbnRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTmV0d29ya0ZpbHRlckRyb3Bkb3duKGRhdGEgPSB7fSkge1xuICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHRoaXMucHJvdmlkZXJUeXBlIHx8ICdTSVAnO1xuICAgICAgICBcbiAgICAgICAgLy8gVjUuMCBwYXR0ZXJuOiBDb21wbGV0ZSBhdXRvbWF0aW9uIC0gbm8gY3VzdG9tIG9uQ2hhbmdlIG5lZWRlZFxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ25ldHdvcmtmaWx0ZXJpZCcsIGRhdGEsIHtcbiAgICAgICAgICAgIGFwaVVybDogYC9wYnhjb3JlL2FwaS92Mi9uZXR3b3JrLWZpbHRlcnMvZ2V0Rm9yU2VsZWN0P2NhdGVnb3JpZXNbXT0ke2NhdGVnb3J5fWAsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLnByX05ldHdvcmtGaWx0ZXIsXG4gICAgICAgICAgICBjYWNoZTogZmFsc2VcbiAgICAgICAgICAgIC8vIE5vIG9uQ2hhbmdlIGNhbGxiYWNrIC0gRHluYW1pY0Ryb3Bkb3duQnVpbGRlciBoYW5kbGVzIGV2ZXJ5dGhpbmcgYXV0b21hdGljYWxseTpcbiAgICAgICAgICAgIC8vIC0gSGlkZGVuIGlucHV0IHN5bmNocm9uaXphdGlvblxuICAgICAgICAgICAgLy8gLSBDaGFuZ2UgZXZlbnQgdHJpZ2dlcmluZyAgXG4gICAgICAgICAgICAvLyAtIEZvcm0uZGF0YUNoYW5nZWQoKSBub3RpZmljYXRpb25cbiAgICAgICAgICAgIC8vIC0gVmFsaWRhdGlvbiBlcnJvciBjbGVhcmluZ1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUV2ZW50SGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhlYWRlciB3aGVuIHByb3ZpZGVyIG5hbWUgY2hhbmdlc1xuICAgICAgICB0aGlzLiRkZXNjcmlwdGlvbi5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHNlbGYudXBkYXRlUGFnZUhlYWRlcigkKHRoaXMpLnZhbCgpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHBhc3N3b3JkIHdpZGdldFxuICAgICAgICB0aGlzLmluaXRpYWxpemVQYXNzd29yZFdpZGdldCgpO1xuICAgIH1cblxuXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBwYXNzd29yZCB3aWRnZXQgd2l0aCBkZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGFzc3dvcmRXaWRnZXQoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIHBhc3N3b3JkIHdpZGdldCB3aXRoIGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgICAgICBpZiAodGhpcy4kc2VjcmV0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEhpZGUgbGVnYWN5IEhUTUwgYnV0dG9ucyAtIFBhc3N3b3JkV2lkZ2V0IHdpbGwgbWFuYWdlIGl0cyBvd24gYnV0dG9uc1xuICAgICAgICAgICAgJCgnLmNsaXBib2FyZCcpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNzaG93LWhpZGUtcGFzc3dvcmQnKS5oaWRlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIERlZmF1bHQgY29uZmlndXJhdGlvbiBmb3IgcHJvdmlkZXJzIC0gd2lsbCBiZSB1cGRhdGVkIGJhc2VkIG9uIHJlZ2lzdHJhdGlvbiB0eXBlXG4gICAgICAgICAgICBjb25zdCB3aWRnZXQgPSBQYXNzd29yZFdpZGdldC5pbml0KHRoaXMuJHNlY3JldCwge1xuICAgICAgICAgICAgICAgIHZhbGlkYXRpb246IFBhc3N3b3JkV2lkZ2V0LlZBTElEQVRJT04uU09GVCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUJ1dHRvbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93UGFzc3dvcmRCdXR0b246IHRydWUsICAvLyBXaWxsIGJlIHVwZGF0ZWQgYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgICAgICAgICBjbGlwYm9hcmRCdXR0b246IHRydWUsICAgICAgLy8gS2VlcCBjb3B5IGJ1dHRvbiBmb3IgYWxsIG1vZGVzXG4gICAgICAgICAgICAgICAgc2hvd1N0cmVuZ3RoQmFyOiB0cnVlLFxuICAgICAgICAgICAgICAgIHNob3dXYXJuaW5nczogdHJ1ZSxcbiAgICAgICAgICAgICAgICB2YWxpZGF0ZU9uSW5wdXQ6IHRydWUsXG4gICAgICAgICAgICAgICAgY2hlY2tPbkxvYWQ6IGZhbHNlLCAvLyBEb24ndCB2YWxpZGF0ZSBvbiBsb2FkLCBsZXQgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzIGhhbmRsZSBpdFxuICAgICAgICAgICAgICAgIG1pblNjb3JlOiA2MCxcbiAgICAgICAgICAgICAgICBnZW5lcmF0ZUxlbmd0aDogMzIgLy8gUHJvdmlkZXIgcGFzc3dvcmRzIHNob3VsZCBiZSAzMiBjaGFycyBmb3IgYmV0dGVyIHNlY3VyaXR5XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgd2lkZ2V0IGluc3RhbmNlIGZvciBsYXRlciB1c2VcbiAgICAgICAgICAgIHRoaXMucGFzc3dvcmRXaWRnZXQgPSB3aWRnZXQ7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSB2aXNpYmlsaXR5IGVsZW1lbnRzIG5vdyB0aGF0IHdpZGdldCBpcyBpbml0aWFsaXplZFxuICAgICAgICAgICAgLy8gVGhpcyB3aWxsIGFwcGx5IHRoZSBjb3JyZWN0IGNvbmZpZ3VyYXRpb24gYmFzZWQgb24gcmVnaXN0cmF0aW9uIHR5cGVcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy51cGRhdGVWaXNpYmlsaXR5RWxlbWVudHMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVZpc2liaWxpdHlFbGVtZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHZpc2liaWxpdHkgb2YgZWxlbWVudHMgYmFzZWQgb24gcHJvdmlkZXIgc2V0dGluZ3NcbiAgICAgKiBUaGlzIG1ldGhvZCBzaG91bGQgYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eUVsZW1lbnRzKCkge1xuICAgICAgICAvLyBPdmVycmlkZSBpbiBjaGlsZCBjbGFzc2VzIHRvIGNvbmZpZ3VyZSBQYXNzd29yZFdpZGdldCBiYXNlZCBvbiByZWdpc3RyYXRpb24gdHlwZVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IHBhc3N3b3JkIHRvb2x0aXAgaWNvbiB3aGVuIGluICdub25lJyByZWdpc3RyYXRpb24gbW9kZVxuICAgICAqL1xuICAgIHNob3dQYXNzd29yZFRvb2x0aXAoKSB7XG4gICAgICAgIHRoaXMuJHBhc3N3b3JkVG9vbHRpcEljb24uc2hvdygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIHBhc3N3b3JkIHRvb2x0aXAgaWNvblxuICAgICAqL1xuICAgIGhpZGVQYXNzd29yZFRvb2x0aXAoKSB7XG4gICAgICAgIHRoaXMuJHBhc3N3b3JkVG9vbHRpcEljb24uaGlkZSgpO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIEdldCB2YWxpZGF0aW9uIHJ1bGVzIGJhc2VkIG9uIHByb3ZpZGVyIHNldHRpbmdzXG4gICAgICogVGhpcyBtZXRob2Qgc2hvdWxkIGJlIG92ZXJyaWRkZW4gaW4gY2hpbGQgY2xhc3Nlc1xuICAgICAqIEByZXR1cm5zIHtvYmplY3R9IFZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICBnZXRWYWxpZGF0ZVJ1bGVzKCkge1xuICAgICAgICAvLyBPdmVycmlkZSBpbiBjaGlsZCBjbGFzc2VzXG4gICAgICAgIHJldHVybiB7fTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZvcm0gd2l0aCB2YWxpZGF0aW9uIGFuZCBjYWxsYmFja3NcbiAgICAgKiBOb3RlOiBUaGlzIG1ldGhvZCBpcyBvdmVycmlkZGVuIGluIHByb3ZpZGVyLW1vZGlmeS5qcyB0byBjb25maWd1cmUgUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHRoaXMuJGZvcm1PYmo7XG4gICAgICAgIC8vIFVSTCBpcyBub3Qgc2V0IGhlcmUgLSBjaGlsZCBjbGFzc2VzIGNvbmZpZ3VyZSBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSB0aGlzLmdldFZhbGlkYXRlUnVsZXMoKTtcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gdGhpcy5jYkJlZm9yZVNlbmRGb3JtLmJpbmQodGhpcyk7XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gdGhpcy5jYkFmdGVyU2VuZEZvcm0uYmluZCh0aGlzKTtcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBNYXJrIGZvcm0gYXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgdGhpcy5mb3JtSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge29iamVjdH0gTW9kaWZpZWQgc2V0dGluZ3NcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAvLyBJTVBPUlRBTlQ6IERvbid0IG92ZXJ3cml0ZSByZXN1bHQuZGF0YSAtIGl0IGFscmVhZHkgY29udGFpbnMgcHJvY2Vzc2VkIGNoZWNrYm94IHZhbHVlcyBmcm9tIEZvcm0uanNcbiAgICAgICAgLy8gV2Ugc2hvdWxkIG9ubHkgYWRkIG9yIG1vZGlmeSBzcGVjaWZpYyBmaWVsZHNcbiAgICAgICAgXG4gICAgICAgIC8vIElmIHJlc3VsdC5kYXRhIGlzIG5vdCBkZWZpbmVkIChzaG91bGRuJ3QgaGFwcGVuKSwgaW5pdGlhbGl6ZSBpdFxuICAgICAgICBpZiAoIXJlc3VsdC5kYXRhKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBOZXR3b3JrIGZpbHRlciB2YWx1ZSBpcyBhdXRvbWF0aWNhbGx5IGhhbmRsZWQgYnkgZm9ybSBzZXJpYWxpemF0aW9uXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBDYW4gYmUgb3ZlcnJpZGRlbiBpbiBjaGlsZCBjbGFzc2VzXG4gICAgfVxuXG5cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRpbmcgc3RhdGUgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgc2hvd0xvYWRpbmdTdGF0ZSgpIHtcbiAgICAgICAgdGhpcy4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIGxvYWRpbmcgc3RhdGUgZm9yIHRoZSBmb3JtXG4gICAgICovXG4gICAgaGlkZUxvYWRpbmdTdGF0ZSgpIHtcbiAgICAgICAgdGhpcy4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gUHJvdmlkZXIgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBcbiAgICAgICAgLy8gQ29tbW9uIGZpZWxkc1xuICAgICAgICBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgJCgnI2lkJykudmFsKGRhdGEuaWQpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICB0aGlzLiRkZXNjcmlwdGlvbi52YWwoZGF0YS5kZXNjcmlwdGlvbik7XG4gICAgICAgICAgICAvLyBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCBwcm92aWRlciBuYW1lIGFuZCB0eXBlXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBhZ2VIZWFkZXIoZGF0YS5kZXNjcmlwdGlvbik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEubm90ZSkge1xuICAgICAgICAgICAgJCgnI25vdGUnKS52YWwoZGF0YS5ub3RlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQ29tbW9uIHByb3ZpZGVyIGZpZWxkcyAtIGJhY2tlbmQgcHJvdmlkZXMgZGVmYXVsdHNcbiAgICAgICAgJCgnI3VzZXJuYW1lJykudmFsKGRhdGEudXNlcm5hbWUgfHwgJycpO1xuICAgICAgICB0aGlzLiRzZWNyZXQudmFsKGRhdGEuc2VjcmV0IHx8ICcnKTtcbiAgICAgICAgJCgnI2hvc3QnKS52YWwoZGF0YS5ob3N0IHx8ICcnKTtcbiAgICAgICAgJCgnI3JlZ2lzdHJhdGlvbl90eXBlJykudmFsKGRhdGEucmVnaXN0cmF0aW9uX3R5cGUgfHwgJycpO1xuICAgICAgICAkKCcjbmV0d29ya2ZpbHRlcmlkJykudmFsKGRhdGEubmV0d29ya2ZpbHRlcmlkIHx8ICcnKTtcbiAgICAgICAgJCgnI21hbnVhbGF0dHJpYnV0ZXMnKS52YWwoZGF0YS5tYW51YWxhdHRyaWJ1dGVzIHx8ICcnKTtcbiAgICAgICAgJCgnI3BvcnQnKS52YWwoZGF0YS5wb3J0IHx8ICcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbW1vbiBjaGVja2JveGVzIC0gaGFuZGxlIGJvdGggc3RyaW5nICcxJyBhbmQgYm9vbGVhbiB0cnVlXG4gICAgICAgIC8vIFRoZXNlIGNoZWNrYm94ZXMgdXNlIHN0YW5kYXJkIEhUTUwgY2hlY2tib3ggYmVoYXZpb3JcbiAgICAgICAgJCgnI3F1YWxpZnknKS5wcm9wKCdjaGVja2VkJywgZGF0YS5xdWFsaWZ5ID09PSAnMScgfHwgZGF0YS5xdWFsaWZ5ID09PSB0cnVlKTtcbiAgICAgICAgJCgnI3JlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoJykucHJvcCgnY2hlY2tlZCcsIGRhdGEucmVjZWl2ZV9jYWxsc193aXRob3V0X2F1dGggPT09ICcxJyB8fCBkYXRhLnJlY2VpdmVfY2FsbHNfd2l0aG91dF9hdXRoID09PSB0cnVlKTtcbiAgICAgICAgJCgnI25vcmVnaXN0ZXInKS5wcm9wKCdjaGVja2VkJywgZGF0YS5ub3JlZ2lzdGVyID09PSAnMScgfHwgZGF0YS5ub3JlZ2lzdGVyID09PSB0cnVlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERpc2FibGVkIHN0YXRlIC0gdGhpcyBpcyBhIGhpZGRlbiBmaWVsZCwgbm90IGEgY2hlY2tib3hcbiAgICAgICAgJCgnI2Rpc2FibGVkJykudmFsKGRhdGEuZGlzYWJsZWQgPyAnMScgOiAnMCcpO1xuICAgIH1cblxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcHMgZnJvbSBzdHJ1Y3R1cmVkIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdG9vbHRpcERhdGEgLSBUb29sdGlwIGRhdGEgb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0b29sdGlwXG4gICAgICogQGRlcHJlY2F0ZWQgVXNlIFRvb2x0aXBCdWlsZGVyLmJ1aWxkQ29udGVudCgpIGluc3RlYWRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KHRvb2x0aXBEYXRhKSB7XG4gICAgICAgIHJldHVybiBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGFnZSBoZWFkZXIgd2l0aCBwcm92aWRlciBuYW1lIGFuZCB0eXBlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyTmFtZSAtIFByb3ZpZGVyIG5hbWVcbiAgICAgKi9cbiAgICB1cGRhdGVQYWdlSGVhZGVyKHByb3ZpZGVyTmFtZSkge1xuICAgICAgICBjb25zdCBwcm92aWRlclR5cGVUZXh0ID0gdGhpcy5wcm92aWRlclR5cGUgPT09ICdTSVAnID8gJ1NJUCcgOiAnSUFYJztcbiAgICAgICAgbGV0IGhlYWRlclRleHQ7XG4gICAgICAgIFxuICAgICAgICBpZiAocHJvdmlkZXJOYW1lICYmIHByb3ZpZGVyTmFtZS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICAvLyBFeGlzdGluZyBwcm92aWRlciB3aXRoIG5hbWVcbiAgICAgICAgICAgIGhlYWRlclRleHQgPSBgJHtwcm92aWRlck5hbWV9ICgke3Byb3ZpZGVyVHlwZVRleHR9KWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBOZXcgcHJvdmlkZXIgb3Igbm8gbmFtZVxuICAgICAgICAgICAgY29uc3QgbmV3UHJvdmlkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnByX05ld1Byb3ZpZGVyIHx8ICdOZXcgUHJvdmlkZXInO1xuICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGAke25ld1Byb3ZpZGVyVGV4dH0gKCR7cHJvdmlkZXJUeXBlVGV4dH0pYDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIG1haW4gaGVhZGVyIGNvbnRlbnRcbiAgICAgICAgJCgnaDEgLmNvbnRlbnQnKS50ZXh0KGhlYWRlclRleHQpO1xuICAgIH1cbn0iXX0=