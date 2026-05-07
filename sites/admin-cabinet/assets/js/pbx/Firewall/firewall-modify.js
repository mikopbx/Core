"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

/* global globalRootUrl,globalTranslate, Form, firewallTooltips, FirewallAPI, FormElements, UserMessage */

/**
 * The firewall object contains methods and variables for managing the Firewall form
 *
 * @module firewall
 */
var firewall = {
  /**
   * jQuery object for the form.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * Firewall record ID.
   * @type {string}
   */
  recordId: '',

  /**
   * Firewall data from API.
   * @type {Object}
   */
  firewallData: null,

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    ipv4_network: {
      identifier: 'ipv4_network',
      optional: true,
      rules: [{
        type: 'regExp',
        // Strict IPv4: each octet 0-255
        value: /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
        prompt: globalTranslate.fw_ValidateIPv4Address
      }]
    },
    ipv6_network: {
      identifier: 'ipv6_network',
      optional: true,
      rules: [{
        type: 'regExp',
        // Strict IPv6: RFC 4291 compliant (all standard notations including compressed ::)
        value: /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/,
        prompt: globalTranslate.fw_ValidateIPv6Address
      }]
    },
    description: {
      identifier: 'description',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.fw_ValidateRuleName
      }]
    }
  },
  // Initialization function to set up form behavior
  initialize: function initialize() {
    firewall.$formObj = $('#firewall-form'); // Initialize global variables for tooltips and Docker detection
    // These will be updated when data is loaded from API

    window.servicePortInfo = {};
    window.serviceNameMapping = {};
    window.isDocker = false;
    window.dockerSupportedServices = [];
    window.currentNetwork = '';
    window.currentSubnet = ''; // Get record ID from URL or form

    var urlParts = window.location.pathname.split('/');
    var lastSegment = urlParts[urlParts.length - 1] || ''; // Check if the last segment is 'modify' (new record) or an actual ID

    if (lastSegment === 'modify' || lastSegment === '') {
      firewall.recordId = '';
    } else {
      firewall.recordId = lastSegment;
    } // Read URL parameters for prefilling (e.g., ?network=0.0.0.0&subnet=0)


    firewall.urlParameters = firewall.getUrlParameters(); // Initialize Form BEFORE loading data (like extension-modify.js pattern)

    firewall.initializeForm(); // Load firewall data from API

    firewall.loadFirewallData();
  },

  /**
   * Get URL parameters for prefilling the form
   * @returns {Object} Object with network, subnet, and ruleName parameters
   */
  getUrlParameters: function getUrlParameters() {
    var params = new URLSearchParams(window.location.search);
    return {
      network: params.get('network') || '',
      subnet: params.get('subnet') || '',
      ruleName: params.get('ruleName') || ''
    };
  },

  /**
   * Load firewall data from API.
   * Unified method for both new and existing records.
   * API returns defaults for new records when ID is empty.
   */
  loadFirewallData: function loadFirewallData() {
    firewall.$formObj.addClass('loading'); // Always call API - it returns defaults for new records (when ID is empty)

    FirewallAPI.getRecord(firewall.recordId || '', function (response) {
      firewall.$formObj.removeClass('loading');

      if (!response || !response.result) {
        // Show error and stop
        UserMessage.showError(globalTranslate.fw_ErrorLoadingRecord);
        return;
      }

      firewall.firewallData = response.data; // Generate dynamic rules HTML first

      firewall.generateRulesHTML(response.data); // Prepare data for form population

      var formData = firewall.prepareFormData(response.data); // Use Form.populateFormSilently() like extension-modify.js pattern

      Form.populateFormSilently(formData, {
        afterPopulate: function afterPopulate(populatedData) {
          // Initialize UI elements AFTER form is populated
          firewall.initializeUIElements();
          firewall.initializeTooltips();
          firewall.initializeDockerLimitedCheckboxes(); // Update window variables for tooltips

          window.currentNetwork = response.data.network;
          window.currentSubnet = response.data.subnet;
          window.isDocker = response.data.isDocker || false;
          window.dockerSupportedServices = response.data.dockerSupportedServices || []; // For new records prefilled from URL parameters (e.g. "Allow my IP" helper)
          // mark the form dirty so Save activates. populateFormSilently resets dirty
          // state and re-disables the Save button AFTER this callback returns, so we
          // defer the call to the next tick.

          if (!response.data.id && firewall.urlParameters.network) {
            setTimeout(function () {
              return Form.dataChanged();
            }, 0);
          }
        }
      });
    });
  },

  /**
   * Check if address is IPv6.
   * @param {string} address - IP address to check.
   * @returns {boolean} True if IPv6, false if IPv4.
   */
  isIPv6Address: function isIPv6Address(address) {
    // IPv6 contains colons
    return address && address.includes(':');
  },

  /**
   * Prepare form data from API response
   * Converts API fields to form field names (network/subnet -> ipv4/ipv6 fields)
   * @param {Object} data - API response data
   * @returns {Object} Form data ready for Form.populateFormSilently()
   */
  prepareFormData: function prepareFormData(data) {
    var formData = {
      id: data.id || '',
      description: data.description || '',
      newer_block_ip: data.newer_block_ip === true,
      local_network: data.local_network === true
    }; // For new records, override network/subnet/description with URL parameters if provided

    var network = data.network || '';
    var subnet = data.subnet; // Default to /32 for new records (data.subnet is '0' from API defaults)

    if (!data.id && (!subnet || subnet === '0')) {
      subnet = '32';
    }

    if (!data.id && firewall.urlParameters.network) {
      network = firewall.urlParameters.network;
      subnet = firewall.urlParameters.subnet || '32'; // Override description with ruleName from URL if provided

      if (firewall.urlParameters.ruleName) {
        formData.description = firewall.urlParameters.ruleName;
      }
    } // Detect IP version and populate appropriate fields


    var isIPv6 = firewall.isIPv6Address(network);

    if (isIPv6) {
      // IPv6 data
      formData.ipv6_network = network;
      formData.ipv6_subnet = subnet;
      formData.ipv4_network = '';
      formData.ipv4_subnet = '';
    } else {
      // IPv4 data
      formData.ipv4_network = network;
      formData.ipv4_subnet = subnet;
      formData.ipv6_network = '';
      formData.ipv6_subnet = '';
    } // Add rule checkboxes from currentRules


    if (data.currentRules && _typeof(data.currentRules) === 'object') {
      Object.keys(data.currentRules).forEach(function (category) {
        formData["rule_".concat(category)] = data.currentRules[category] === true;
      });
    } // Build service port info and name mapping from availableRules


    window.servicePortInfo = {};
    window.serviceNameMapping = {};

    if (data.availableRules && _typeof(data.availableRules) === 'object') {
      Object.keys(data.availableRules).forEach(function (category) {
        var ruleTemplate = data.availableRules[category]; // Extract port info from rule template

        window.servicePortInfo[category] = firewall.extractPortsFromTemplate(ruleTemplate); // Map display name to category key

        var shortName = ruleTemplate.shortName || category;
        window.serviceNameMapping[shortName] = category;
      });
    }

    return formData;
  },

  /**
   * Extract port information from rule template.
   * @param {Object} ruleTemplate - Rule template from availableRules.
   * @returns {Array} Array of port information objects.
   */
  extractPortsFromTemplate: function extractPortsFromTemplate(ruleTemplate) {
    var ports = [];

    if (ruleTemplate.rules && Array.isArray(ruleTemplate.rules)) {
      ruleTemplate.rules.forEach(function (rule) {
        if (rule.protocol === 'icmp') {
          ports.push({
            protocol: 'ICMP'
          });
        } else if (rule.portfrom === rule.portto) {
          ports.push({
            port: rule.portfrom,
            protocol: rule.protocol.toUpperCase()
          });
        } else {
          ports.push({
            range: "".concat(rule.portfrom, "-").concat(rule.portto),
            protocol: rule.protocol.toUpperCase()
          });
        }
      });
    }

    return ports;
  },

  /**
   * Generate HTML for firewall rules based on API data.
   * @param {Object} data - Firewall data from API.
   */
  generateRulesHTML: function generateRulesHTML(data) {
    var $container = $('#firewall-rules-container');
    $container.empty().removeClass('loading'); // Use new naming: availableRules for templates, currentRules for actual values

    var availableRules = data.availableRules;
    var currentRules = data.currentRules || {};

    if (!availableRules) {
      console.error('No available rules data received from API');
      $container.html('<div class="ui warning message">Unable to load firewall rules. Please refresh the page.</div>');
      return;
    }

    var isDocker = data.isDocker || false;
    var dockerSupportedServices = data.dockerSupportedServices || []; // Generate HTML for each rule

    Object.keys(availableRules).forEach(function (name) {
      var ruleTemplate = availableRules[name];
      var shortName = ruleTemplate.shortName || name;
      var isLimited = isDocker && !dockerSupportedServices.includes(shortName); // Get actual value from currentRules, default to template default

      var isChecked = currentRules[name] !== undefined ? currentRules[name] : ruleTemplate.action === 'allow';
      var segmentClass = isLimited ? 'docker-limited-segment' : '';
      var checkboxClass = isLimited ? 'docker-limited-checkbox' : '';
      var iconClass = isLimited ? 'yellow exclamation triangle' : 'small info circle';
      var html = "\n                <div class=\"ui segment ".concat(segmentClass, "\">\n                    <div class=\"field\">\n                        <div class=\"ui toggle checkbox rules ").concat(checkboxClass, "\">\n                            <input type=\"checkbox\"\n                                   id=\"rule_").concat(name, "\"\n                                   name=\"rule_").concat(name, "\"\n                                   ").concat(isLimited || isChecked ? 'checked' : '', "\n                                   ").concat(isLimited ? 'disabled' : '', "\n                                   tabindex=\"0\" class=\"hidden\">\n                            <label for=\"rule_").concat(name, "\">\n                                ").concat(globalTranslate["fw_".concat(name.toLowerCase(), "Description")] || shortName, "\n                                <i class=\"").concat(iconClass, " icon service-info-icon\"\n                                   data-service=\"").concat(name, "\"\n                                   data-action=\"").concat(ruleTemplate.action, "\"\n                                   ").concat(isLimited ? 'data-limited="true"' : '', "></i>\n                            </label>\n                        </div>\n                    </div>\n                </div>\n            ");
      $container.append(html);
    }); // Re-initialize checkboxes for dynamically added elements with onChange handler

    $('#firewall-rules-container .checkbox').checkbox({
      onChange: function onChange() {
        Form.dataChanged();
      }
    });
  },

  /**
   * Initialize UI elements.
   */
  initializeUIElements: function initializeUIElements() {
    // Initialize checkboxes (excluding dynamically added rules which are handled in generateRulesHTML)
    $('#firewall-form .checkbox').not('#firewall-rules-container .checkbox').checkbox(); // Initialize dropdowns

    $('#firewall-form .dropdown').dropdown(); // Initialize input mask for IPv4 network field only (IPv6 doesn't need input mask)

    $('input[name="ipv4_network"]').inputmask({
      alias: 'ip',
      'placeholder': '_'
    }); // Auto-clear opposite protocol fields when user types

    this.setupProtocolAutoClear();
  },

  /**
   * Setup auto-clear logic for IPv4/IPv6 fields
   * When user types in IPv4 fields -> clear IPv6 fields
   * When user types in IPv6 fields -> clear IPv4 fields
   */
  setupProtocolAutoClear: function setupProtocolAutoClear() {
    var $ipv4Network = $('input[name="ipv4_network"]');
    var $ipv4Subnet = $('select[name="ipv4_subnet"]');
    var $ipv6Network = $('input[name="ipv6_network"]');
    var $ipv6Subnet = $('select[name="ipv6_subnet"]'); // When user types in IPv4 network field -> clear IPv6 fields

    $ipv4Network.on('input', function () {
      var value = $ipv4Network.val().trim();

      if (value && value !== '') {
        $ipv6Network.val('');
        $ipv6Subnet.dropdown('clear');
      }
    }); // When user selects IPv4 subnet -> clear IPv6 fields

    $ipv4Subnet.on('change', function () {
      var networkValue = $ipv4Network.val().trim();

      if (networkValue && networkValue !== '') {
        $ipv6Network.val('');
        $ipv6Subnet.dropdown('clear');
      }
    }); // When user types in IPv6 network field -> clear IPv4 fields

    $ipv6Network.on('input', function () {
      var value = $ipv6Network.val().trim();

      if (value && value !== '') {
        $ipv4Network.val('');
        $ipv4Subnet.dropdown('clear');
      }
    }); // When user selects IPv6 subnet -> clear IPv4 fields

    $ipv6Subnet.on('change', function () {
      var networkValue = $ipv6Network.val().trim();

      if (networkValue && networkValue !== '') {
        $ipv4Network.val('');
        $ipv4Subnet.dropdown('clear');
      }
    });
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    var formData = result.data || firewall.$formObj.form('get values'); // Get IPv4 and IPv6 values

    var ipv4Network = formData.ipv4_network || '';
    var ipv4Subnet = formData.ipv4_subnet || '';
    var ipv6Network = formData.ipv6_network || '';
    var ipv6Subnet = formData.ipv6_subnet || ''; // Validate: either IPv4 OR IPv6, not both, not neither

    var hasIPv4 = ipv4Network && ipv4Network !== '';
    var hasIPv6 = ipv6Network && ipv6Network !== '';

    if (!hasIPv4 && !hasIPv6) {
      UserMessage.showError(globalTranslate.fw_ValidateEitherIPv4OrIPv6Required);
      return false;
    }

    if (hasIPv4 && hasIPv6) {
      UserMessage.showError(globalTranslate.fw_ValidateOnlyOneProtocol);
      return false;
    } // Combine selected IPv4 or IPv6 into backend-compatible network/subnet format


    formData.network = hasIPv4 ? ipv4Network : ipv6Network;
    formData.subnet = hasIPv4 ? ipv4Subnet : ipv6Subnet; // Remove separate IPv4/IPv6 fields (backend expects unified network/subnet)

    delete formData.ipv4_network;
    delete formData.ipv4_subnet;
    delete formData.ipv6_network;
    delete formData.ipv6_subnet; // Prepare currentRules data for API (simple boolean map)

    var currentRules = {};
    Object.keys(formData).forEach(function (key) {
      if (key.startsWith('rule_')) {
        var category = key.replace('rule_', ''); // Send as boolean - true = allow, false = block

        currentRules[category] = formData[key] === true;
        delete formData[key];
      }
    }); // Add currentRules to formData

    formData.currentRules = currentRules; // newer_block_ip and local_network are already boolean thanks to convertCheckboxesToBool
    // Mark as new record if we don't have an ID (for correct POST/PUT selection)
    // This is critical for creating records with predefined IDs

    if (!firewall.recordId || firewall.recordId === '') {
      formData._isNew = true;
    }

    result.data = formData;
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {},

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    // Configure Form.js
    Form.$formObj = firewall.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = firewall.validateRules;
    Form.cbBeforeSendForm = firewall.cbBeforeSendForm;
    Form.cbAfterSendForm = firewall.cbAfterSendForm; // Enable checkbox to boolean conversion

    Form.convertCheckboxesToBool = true; // Setup REST API

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = FirewallAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Important settings for correct save modes operation

    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "firewall/index/");
    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "firewall/modify/"); // Initialize Form with all standard features:
    // - Dirty checking (change tracking)
    // - Dropdown submit (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
    // - Form validation
    // - AJAX response handling

    Form.initialize(); // Add change handlers for dynamically added checkboxes
    // This must be done AFTER Form.initialize() to ensure proper tracking

    $('#firewall-rules-container input[type="checkbox"]').on('change', function () {
      // Trigger form change event for dirty checking
      Form.dataChanged();
    });
  },

  /**
   * Initialize tooltips for service information
   */
  initializeTooltips: function initializeTooltips() {
    var self = this; // Initialize tooltips for service rules

    $('.service-info-icon').each(function () {
      var $icon = $(this);
      var service = $icon.data('service');
      var isLimited = $icon.data('limited') === true; // Find the checkbox for this service

      var $checkbox = $icon.closest('.field').find('input[type="checkbox"]'); // Get initial action based on checkbox state

      var action = $checkbox.prop('checked') ? 'allow' : 'block'; // Generate initial tooltip content

      var network = "".concat(window.currentNetwork, "/").concat(window.currentSubnet);
      var portInfo = window.servicePortInfo[service] || [];
      var tooltipContent = firewallTooltips.generateContent(service, action, network, window.isDocker, isLimited, portInfo, isLimited && window.isDocker // Show copy button only for Docker limited services
      ); // Initialize tooltip

      firewallTooltips.initializeTooltip($icon, {
        html: tooltipContent,
        position: 'top right'
      }); // Store reference to icon on checkbox for updates

      $checkbox.data('tooltipIcon', $icon);
    }); // Initialize tooltips for special checkboxes

    $('.special-checkbox-info').each(function () {
      var $icon = $(this);
      var type = $icon.data('type'); // Find the checkbox for this type

      var $checkbox = $icon.closest('.field').find("input[name=\"".concat(type, "\"]")); // Get initial state

      var isChecked = $checkbox.prop('checked');
      var network = "".concat(window.currentNetwork, "/").concat(window.currentSubnet); // Generate initial tooltip content

      var tooltipContent = firewallTooltips.generateSpecialCheckboxContent(type, network, isChecked); // Initialize tooltip with compact width for special checkboxes

      firewallTooltips.initializeTooltip($icon, {
        html: tooltipContent,
        position: 'top right',
        variation: 'very wide'
      }); // Store reference to icon on checkbox for updates

      $checkbox.data('specialTooltipIcon', $icon);
    }); // Listen for checkbox changes to update tooltips (use delegation for dynamic elements)

    $('#firewall-form').on('change', '.rules input[type="checkbox"]', function () {
      var $checkbox = $(this);
      var $icon = $checkbox.data('tooltipIcon');
      var $specialIcon = $checkbox.data('specialTooltipIcon');

      if ($icon && $icon.length) {
        var service = $icon.data('service');
        var isLimited = $icon.data('limited') === true;
        var action = $checkbox.prop('checked') ? 'allow' : 'block';
        var network = "".concat(window.currentNetwork, "/").concat(window.currentSubnet);
        var portInfo = window.servicePortInfo[service] || []; // Generate new tooltip content

        var newContent = firewallTooltips.generateContent(service, action, network, window.isDocker, isLimited, portInfo, isLimited && window.isDocker); // Update tooltip

        firewallTooltips.updateContent($icon, newContent);
      }

      if ($specialIcon && $specialIcon.length) {
        var type = $specialIcon.data('type');
        var isChecked = $checkbox.prop('checked');

        var _network = "".concat(window.currentNetwork, "/").concat(window.currentSubnet); // Generate new tooltip content


        var _newContent = firewallTooltips.generateSpecialCheckboxContent(type, _network, isChecked); // Update tooltip with compact width


        firewallTooltips.updateContent($specialIcon, _newContent, {
          position: 'top right',
          variation: 'very wide'
        });
      }
    });
  },

  /**
   * Initialize Docker limited checkboxes - prevent them from being toggled
   */
  initializeDockerLimitedCheckboxes: function initializeDockerLimitedCheckboxes() {
    if (!window.isDocker) {
      return;
    }

    $('.docker-limited-checkbox').each(function () {
      var $checkbox = $(this);
      var $input = $checkbox.find('input[type="checkbox"]'); // Ensure checkbox is always checked

      $input.prop('checked', true); // Add visual disabled state

      $checkbox.addClass('disabled'); // Prevent click events

      $checkbox.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation(); // Show a temporary message

        var $label = $checkbox.find('label');
        var $icon = $label.find('.service-info-icon'); // Trigger the tooltip to show

        $icon.popup('show');
        return false;
      }); // Prevent checkbox state changes

      $input.on('change', function (e) {
        e.preventDefault();
        $(this).prop('checked', true);
        return false;
      });
    });
  }
}; // Custom form validation rule to check if a string is a valid IP address

$.fn.form.settings.rules.ipaddr = function (value) {
  var result = true;
  var f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (f === null) {
    result = false;
  } else {
    for (var i = 1; i < 5; i += 1) {
      var a = f[i];

      if (a > 255) {
        result = false;
      }
    }

    if (f[5] > 32) {
      result = false;
    }
  }

  return result;
}; // Initialize the firewall form when the document is ready


$(document).ready(function () {
  firewall.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1tb2RpZnkuanMiXSwibmFtZXMiOlsiZmlyZXdhbGwiLCIkZm9ybU9iaiIsInJlY29yZElkIiwiZmlyZXdhbGxEYXRhIiwidmFsaWRhdGVSdWxlcyIsImlwdjRfbmV0d29yayIsImlkZW50aWZpZXIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInZhbHVlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZndfVmFsaWRhdGVJUHY0QWRkcmVzcyIsImlwdjZfbmV0d29yayIsImZ3X1ZhbGlkYXRlSVB2NkFkZHJlc3MiLCJkZXNjcmlwdGlvbiIsImZ3X1ZhbGlkYXRlUnVsZU5hbWUiLCJpbml0aWFsaXplIiwiJCIsIndpbmRvdyIsInNlcnZpY2VQb3J0SW5mbyIsInNlcnZpY2VOYW1lTWFwcGluZyIsImlzRG9ja2VyIiwiZG9ja2VyU3VwcG9ydGVkU2VydmljZXMiLCJjdXJyZW50TmV0d29yayIsImN1cnJlbnRTdWJuZXQiLCJ1cmxQYXJ0cyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsImxhc3RTZWdtZW50IiwibGVuZ3RoIiwidXJsUGFyYW1ldGVycyIsImdldFVybFBhcmFtZXRlcnMiLCJpbml0aWFsaXplRm9ybSIsImxvYWRGaXJld2FsbERhdGEiLCJwYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJuZXR3b3JrIiwiZ2V0Iiwic3VibmV0IiwicnVsZU5hbWUiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlc3VsdCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZndfRXJyb3JMb2FkaW5nUmVjb3JkIiwiZGF0YSIsImdlbmVyYXRlUnVsZXNIVE1MIiwiZm9ybURhdGEiLCJwcmVwYXJlRm9ybURhdGEiLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwicG9wdWxhdGVkRGF0YSIsImluaXRpYWxpemVVSUVsZW1lbnRzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZURvY2tlckxpbWl0ZWRDaGVja2JveGVzIiwiaWQiLCJzZXRUaW1lb3V0IiwiZGF0YUNoYW5nZWQiLCJpc0lQdjZBZGRyZXNzIiwiYWRkcmVzcyIsImluY2x1ZGVzIiwibmV3ZXJfYmxvY2tfaXAiLCJsb2NhbF9uZXR3b3JrIiwiaXNJUHY2IiwiaXB2Nl9zdWJuZXQiLCJpcHY0X3N1Ym5ldCIsImN1cnJlbnRSdWxlcyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwiY2F0ZWdvcnkiLCJhdmFpbGFibGVSdWxlcyIsInJ1bGVUZW1wbGF0ZSIsImV4dHJhY3RQb3J0c0Zyb21UZW1wbGF0ZSIsInNob3J0TmFtZSIsInBvcnRzIiwiQXJyYXkiLCJpc0FycmF5IiwicnVsZSIsInByb3RvY29sIiwicHVzaCIsInBvcnRmcm9tIiwicG9ydHRvIiwicG9ydCIsInRvVXBwZXJDYXNlIiwicmFuZ2UiLCIkY29udGFpbmVyIiwiZW1wdHkiLCJjb25zb2xlIiwiZXJyb3IiLCJodG1sIiwibmFtZSIsImlzTGltaXRlZCIsImlzQ2hlY2tlZCIsInVuZGVmaW5lZCIsImFjdGlvbiIsInNlZ21lbnRDbGFzcyIsImNoZWNrYm94Q2xhc3MiLCJpY29uQ2xhc3MiLCJ0b0xvd2VyQ2FzZSIsImFwcGVuZCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJub3QiLCJkcm9wZG93biIsImlucHV0bWFzayIsImFsaWFzIiwic2V0dXBQcm90b2NvbEF1dG9DbGVhciIsIiRpcHY0TmV0d29yayIsIiRpcHY0U3VibmV0IiwiJGlwdjZOZXR3b3JrIiwiJGlwdjZTdWJuZXQiLCJvbiIsInZhbCIsInRyaW0iLCJuZXR3b3JrVmFsdWUiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJmb3JtIiwiaXB2NE5ldHdvcmsiLCJpcHY0U3VibmV0IiwiaXB2Nk5ldHdvcmsiLCJpcHY2U3VibmV0IiwiaGFzSVB2NCIsImhhc0lQdjYiLCJmd19WYWxpZGF0ZUVpdGhlcklQdjRPcklQdjZSZXF1aXJlZCIsImZ3X1ZhbGlkYXRlT25seU9uZVByb3RvY29sIiwia2V5Iiwic3RhcnRzV2l0aCIsInJlcGxhY2UiLCJfaXNOZXciLCJjYkFmdGVyU2VuZEZvcm0iLCJ1cmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwic2VsZiIsImVhY2giLCIkaWNvbiIsInNlcnZpY2UiLCIkY2hlY2tib3giLCJjbG9zZXN0IiwiZmluZCIsInByb3AiLCJwb3J0SW5mbyIsInRvb2x0aXBDb250ZW50IiwiZmlyZXdhbGxUb29sdGlwcyIsImdlbmVyYXRlQ29udGVudCIsImluaXRpYWxpemVUb29sdGlwIiwicG9zaXRpb24iLCJnZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQiLCJ2YXJpYXRpb24iLCIkc3BlY2lhbEljb24iLCJuZXdDb250ZW50IiwidXBkYXRlQ29udGVudCIsIiRpbnB1dCIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BQcm9wYWdhdGlvbiIsIiRsYWJlbCIsInBvcHVwIiwiZm4iLCJpcGFkZHIiLCJmIiwibWF0Y2giLCJpIiwiYSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQU5HOztBQVFiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxFQVpHOztBQWNiO0FB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bWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIGZpcmV3YWxsVG9vbHRpcHMsIEZpcmV3YWxsQVBJLCBGb3JtRWxlbWVudHMsIFVzZXJNZXNzYWdlICovXG5cbi8qKlxuICogVGhlIGZpcmV3YWxsIG9iamVjdCBjb250YWlucyBtZXRob2RzIGFuZCB2YXJpYWJsZXMgZm9yIG1hbmFnaW5nIHRoZSBGaXJld2FsbCBmb3JtXG4gKlxuICogQG1vZHVsZSBmaXJld2FsbFxuICovXG5jb25zdCBmaXJld2FsbCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGaXJld2FsbCByZWNvcmQgSUQuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICByZWNvcmRJZDogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogRmlyZXdhbGwgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGZpcmV3YWxsRGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBpcHY0X25ldHdvcms6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdpcHY0X25ldHdvcmsnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIC8vIFN0cmljdCBJUHY0OiBlYWNoIG9jdGV0IDAtMjU1XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAvXigyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pXFwuKDI1WzAtNV18MlswLTRdWzAtOV18WzAxXT9bMC05XVswLTldPylcXC4oMjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KVxcLigyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pJC8sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlSVB2NEFkZHJlc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGlwdjZfbmV0d29yazoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2lwdjZfbmV0d29yaycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RyaWN0IElQdjY6IFJGQyA0MjkxIGNvbXBsaWFudCAoYWxsIHN0YW5kYXJkIG5vdGF0aW9ucyBpbmNsdWRpbmcgY29tcHJlc3NlZCA6OilcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IC9eKChbMC05YS1mQS1GXXsxLDR9Oil7N31bMC05YS1mQS1GXXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw3fTp8KFswLTlhLWZBLUZdezEsNH06KXsxLDZ9OlswLTlhLWZBLUZdezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDV9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDJ9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw0fSg6WzAtOWEtZkEtRl17MSw0fSl7MSwzfXwoWzAtOWEtZkEtRl17MSw0fTopezEsM30oOlswLTlhLWZBLUZdezEsNH0pezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDJ9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDV9fFswLTlhLWZBLUZdezEsNH06KCg6WzAtOWEtZkEtRl17MSw0fSl7MSw2fSl8OigoOlswLTlhLWZBLUZdezEsNH0pezEsN318OikpJC8sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlSVB2NkFkZHJlc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlUnVsZU5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIEluaXRpYWxpemF0aW9uIGZ1bmN0aW9uIHRvIHNldCB1cCBmb3JtIGJlaGF2aW9yXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgZmlyZXdhbGwuJGZvcm1PYmogPSAkKCcjZmlyZXdhbGwtZm9ybScpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZ2xvYmFsIHZhcmlhYmxlcyBmb3IgdG9vbHRpcHMgYW5kIERvY2tlciBkZXRlY3Rpb25cbiAgICAgICAgLy8gVGhlc2Ugd2lsbCBiZSB1cGRhdGVkIHdoZW4gZGF0YSBpcyBsb2FkZWQgZnJvbSBBUElcbiAgICAgICAgd2luZG93LnNlcnZpY2VQb3J0SW5mbyA9IHt9O1xuICAgICAgICB3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nID0ge307XG4gICAgICAgIHdpbmRvdy5pc0RvY2tlciA9IGZhbHNlO1xuICAgICAgICB3aW5kb3cuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgPSBbXTtcbiAgICAgICAgd2luZG93LmN1cnJlbnROZXR3b3JrID0gJyc7XG4gICAgICAgIHdpbmRvdy5jdXJyZW50U3VibmV0ID0gJyc7XG5cbiAgICAgICAgLy8gR2V0IHJlY29yZCBJRCBmcm9tIFVSTCBvciBmb3JtXG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGxhc3RTZWdtZW50ID0gdXJsUGFydHNbdXJsUGFydHMubGVuZ3RoIC0gMV0gfHwgJyc7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxhc3Qgc2VnbWVudCBpcyAnbW9kaWZ5JyAobmV3IHJlY29yZCkgb3IgYW4gYWN0dWFsIElEXG4gICAgICAgIGlmIChsYXN0U2VnbWVudCA9PT0gJ21vZGlmeScgfHwgbGFzdFNlZ21lbnQgPT09ICcnKSB7XG4gICAgICAgICAgICBmaXJld2FsbC5yZWNvcmRJZCA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZmlyZXdhbGwucmVjb3JkSWQgPSBsYXN0U2VnbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlYWQgVVJMIHBhcmFtZXRlcnMgZm9yIHByZWZpbGxpbmcgKGUuZy4sID9uZXR3b3JrPTAuMC4wLjAmc3VibmV0PTApXG4gICAgICAgIGZpcmV3YWxsLnVybFBhcmFtZXRlcnMgPSBmaXJld2FsbC5nZXRVcmxQYXJhbWV0ZXJzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIEJFRk9SRSBsb2FkaW5nIGRhdGEgKGxpa2UgZXh0ZW5zaW9uLW1vZGlmeS5qcyBwYXR0ZXJuKVxuICAgICAgICBmaXJld2FsbC5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIExvYWQgZmlyZXdhbGwgZGF0YSBmcm9tIEFQSVxuICAgICAgICBmaXJld2FsbC5sb2FkRmlyZXdhbGxEYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBVUkwgcGFyYW1ldGVycyBmb3IgcHJlZmlsbGluZyB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIG5ldHdvcmssIHN1Ym5ldCwgYW5kIHJ1bGVOYW1lIHBhcmFtZXRlcnNcbiAgICAgKi9cbiAgICBnZXRVcmxQYXJhbWV0ZXJzKCkge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmV0d29yazogcGFyYW1zLmdldCgnbmV0d29yaycpIHx8ICcnLFxuICAgICAgICAgICAgc3VibmV0OiBwYXJhbXMuZ2V0KCdzdWJuZXQnKSB8fCAnJyxcbiAgICAgICAgICAgIHJ1bGVOYW1lOiBwYXJhbXMuZ2V0KCdydWxlTmFtZScpIHx8ICcnXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZmlyZXdhbGwgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBVbmlmaWVkIG1ldGhvZCBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHMuXG4gICAgICogQVBJIHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzIHdoZW4gSUQgaXMgZW1wdHkuXG4gICAgICovXG4gICAgbG9hZEZpcmV3YWxsRGF0YSgpIHtcbiAgICAgICAgZmlyZXdhbGwuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBBbHdheXMgY2FsbCBBUEkgLSBpdCByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyAod2hlbiBJRCBpcyBlbXB0eSlcbiAgICAgICAgRmlyZXdhbGxBUEkuZ2V0UmVjb3JkKGZpcmV3YWxsLnJlY29yZElkIHx8ICcnLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGZpcmV3YWxsLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmZ3X0Vycm9yTG9hZGluZ1JlY29yZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmaXJld2FsbC5maXJld2FsbERhdGEgPSByZXNwb25zZS5kYXRhO1xuXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBkeW5hbWljIHJ1bGVzIEhUTUwgZmlyc3RcbiAgICAgICAgICAgIGZpcmV3YWxsLmdlbmVyYXRlUnVsZXNIVE1MKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAvLyBQcmVwYXJlIGRhdGEgZm9yIGZvcm0gcG9wdWxhdGlvblxuICAgICAgICAgICAgY29uc3QgZm9ybURhdGEgPSBmaXJld2FsbC5wcmVwYXJlRm9ybURhdGEocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFVzZSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KCkgbGlrZSBleHRlbnNpb24tbW9kaWZ5LmpzIHBhdHRlcm5cbiAgICAgICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAocG9wdWxhdGVkRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGVsZW1lbnRzIEFGVEVSIGZvcm0gaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAgICAgICAgIGZpcmV3YWxsLmluaXRpYWxpemVVSUVsZW1lbnRzKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcmV3YWxsLmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICAgICAgICAgICAgICBmaXJld2FsbC5pbml0aWFsaXplRG9ja2VyTGltaXRlZENoZWNrYm94ZXMoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgd2luZG93IHZhcmlhYmxlcyBmb3IgdG9vbHRpcHNcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmN1cnJlbnROZXR3b3JrID0gcmVzcG9uc2UuZGF0YS5uZXR3b3JrO1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY3VycmVudFN1Ym5ldCA9IHJlc3BvbnNlLmRhdGEuc3VibmV0O1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuaXNEb2NrZXIgPSByZXNwb25zZS5kYXRhLmlzRG9ja2VyIHx8IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgPSByZXNwb25zZS5kYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIHx8IFtdO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcyBwcmVmaWxsZWQgZnJvbSBVUkwgcGFyYW1ldGVycyAoZS5nLiBcIkFsbG93IG15IElQXCIgaGVscGVyKVxuICAgICAgICAgICAgICAgICAgICAvLyBtYXJrIHRoZSBmb3JtIGRpcnR5IHNvIFNhdmUgYWN0aXZhdGVzLiBwb3B1bGF0ZUZvcm1TaWxlbnRseSByZXNldHMgZGlydHlcbiAgICAgICAgICAgICAgICAgICAgLy8gc3RhdGUgYW5kIHJlLWRpc2FibGVzIHRoZSBTYXZlIGJ1dHRvbiBBRlRFUiB0aGlzIGNhbGxiYWNrIHJldHVybnMsIHNvIHdlXG4gICAgICAgICAgICAgICAgICAgIC8vIGRlZmVyIHRoZSBjYWxsIHRvIHRoZSBuZXh0IHRpY2suXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5pZCAmJiBmaXJld2FsbC51cmxQYXJhbWV0ZXJzLm5ldHdvcmspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gRm9ybS5kYXRhQ2hhbmdlZCgpLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGFkZHJlc3MgaXMgSVB2Ni5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWRkcmVzcyAtIElQIGFkZHJlc3MgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgSVB2NiwgZmFsc2UgaWYgSVB2NC5cbiAgICAgKi9cbiAgICBpc0lQdjZBZGRyZXNzKGFkZHJlc3MpIHtcbiAgICAgICAgLy8gSVB2NiBjb250YWlucyBjb2xvbnNcbiAgICAgICAgcmV0dXJuIGFkZHJlc3MgJiYgYWRkcmVzcy5pbmNsdWRlcygnOicpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGZvcm0gZGF0YSBmcm9tIEFQSSByZXNwb25zZVxuICAgICAqIENvbnZlcnRzIEFQSSBmaWVsZHMgdG8gZm9ybSBmaWVsZCBuYW1lcyAobmV0d29yay9zdWJuZXQgLT4gaXB2NC9pcHY2IGZpZWxkcylcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEFQSSByZXNwb25zZSBkYXRhXG4gICAgICogQHJldHVybnMge09iamVjdH0gRm9ybSBkYXRhIHJlYWR5IGZvciBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KClcbiAgICAgKi9cbiAgICBwcmVwYXJlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkIHx8ICcnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgICBuZXdlcl9ibG9ja19pcDogZGF0YS5uZXdlcl9ibG9ja19pcCA9PT0gdHJ1ZSxcbiAgICAgICAgICAgIGxvY2FsX25ldHdvcms6IGRhdGEubG9jYWxfbmV0d29yayA9PT0gdHJ1ZVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEZvciBuZXcgcmVjb3Jkcywgb3ZlcnJpZGUgbmV0d29yay9zdWJuZXQvZGVzY3JpcHRpb24gd2l0aCBVUkwgcGFyYW1ldGVycyBpZiBwcm92aWRlZFxuICAgICAgICBsZXQgbmV0d29yayA9IGRhdGEubmV0d29yayB8fCAnJztcbiAgICAgICAgbGV0IHN1Ym5ldCA9IGRhdGEuc3VibmV0O1xuXG4gICAgICAgIC8vIERlZmF1bHQgdG8gLzMyIGZvciBuZXcgcmVjb3JkcyAoZGF0YS5zdWJuZXQgaXMgJzAnIGZyb20gQVBJIGRlZmF1bHRzKVxuICAgICAgICBpZiAoIWRhdGEuaWQgJiYgKCFzdWJuZXQgfHwgc3VibmV0ID09PSAnMCcpKSB7XG4gICAgICAgICAgICBzdWJuZXQgPSAnMzInO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFkYXRhLmlkICYmIGZpcmV3YWxsLnVybFBhcmFtZXRlcnMubmV0d29yaykge1xuICAgICAgICAgICAgbmV0d29yayA9IGZpcmV3YWxsLnVybFBhcmFtZXRlcnMubmV0d29yaztcbiAgICAgICAgICAgIHN1Ym5ldCA9IGZpcmV3YWxsLnVybFBhcmFtZXRlcnMuc3VibmV0IHx8ICczMic7XG5cbiAgICAgICAgICAgIC8vIE92ZXJyaWRlIGRlc2NyaXB0aW9uIHdpdGggcnVsZU5hbWUgZnJvbSBVUkwgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmIChmaXJld2FsbC51cmxQYXJhbWV0ZXJzLnJ1bGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgZm9ybURhdGEuZGVzY3JpcHRpb24gPSBmaXJld2FsbC51cmxQYXJhbWV0ZXJzLnJ1bGVOYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZWN0IElQIHZlcnNpb24gYW5kIHBvcHVsYXRlIGFwcHJvcHJpYXRlIGZpZWxkc1xuICAgICAgICBjb25zdCBpc0lQdjYgPSBmaXJld2FsbC5pc0lQdjZBZGRyZXNzKG5ldHdvcmspO1xuXG4gICAgICAgIGlmIChpc0lQdjYpIHtcbiAgICAgICAgICAgIC8vIElQdjYgZGF0YVxuICAgICAgICAgICAgZm9ybURhdGEuaXB2Nl9uZXR3b3JrID0gbmV0d29yaztcbiAgICAgICAgICAgIGZvcm1EYXRhLmlwdjZfc3VibmV0ID0gc3VibmV0O1xuICAgICAgICAgICAgZm9ybURhdGEuaXB2NF9uZXR3b3JrID0gJyc7XG4gICAgICAgICAgICBmb3JtRGF0YS5pcHY0X3N1Ym5ldCA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSVB2NCBkYXRhXG4gICAgICAgICAgICBmb3JtRGF0YS5pcHY0X25ldHdvcmsgPSBuZXR3b3JrO1xuICAgICAgICAgICAgZm9ybURhdGEuaXB2NF9zdWJuZXQgPSBzdWJuZXQ7XG4gICAgICAgICAgICBmb3JtRGF0YS5pcHY2X25ldHdvcmsgPSAnJztcbiAgICAgICAgICAgIGZvcm1EYXRhLmlwdjZfc3VibmV0ID0gJyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgcnVsZSBjaGVja2JveGVzIGZyb20gY3VycmVudFJ1bGVzXG4gICAgICAgIGlmIChkYXRhLmN1cnJlbnRSdWxlcyAmJiB0eXBlb2YgZGF0YS5jdXJyZW50UnVsZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLmN1cnJlbnRSdWxlcykuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICAgICAgZm9ybURhdGFbYHJ1bGVfJHtjYXRlZ29yeX1gXSA9IGRhdGEuY3VycmVudFJ1bGVzW2NhdGVnb3J5XSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgc2VydmljZSBwb3J0IGluZm8gYW5kIG5hbWUgbWFwcGluZyBmcm9tIGF2YWlsYWJsZVJ1bGVzXG4gICAgICAgIHdpbmRvdy5zZXJ2aWNlUG9ydEluZm8gPSB7fTtcbiAgICAgICAgd2luZG93LnNlcnZpY2VOYW1lTWFwcGluZyA9IHt9O1xuICAgICAgICBpZiAoZGF0YS5hdmFpbGFibGVSdWxlcyAmJiB0eXBlb2YgZGF0YS5hdmFpbGFibGVSdWxlcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEuYXZhaWxhYmxlUnVsZXMpLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJ1bGVUZW1wbGF0ZSA9IGRhdGEuYXZhaWxhYmxlUnVsZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgcG9ydCBpbmZvIGZyb20gcnVsZSB0ZW1wbGF0ZVxuICAgICAgICAgICAgICAgIHdpbmRvdy5zZXJ2aWNlUG9ydEluZm9bY2F0ZWdvcnldID0gZmlyZXdhbGwuZXh0cmFjdFBvcnRzRnJvbVRlbXBsYXRlKHJ1bGVUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgLy8gTWFwIGRpc3BsYXkgbmFtZSB0byBjYXRlZ29yeSBrZXlcbiAgICAgICAgICAgICAgICBjb25zdCBzaG9ydE5hbWUgPSBydWxlVGVtcGxhdGUuc2hvcnROYW1lIHx8IGNhdGVnb3J5O1xuICAgICAgICAgICAgICAgIHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmdbc2hvcnROYW1lXSA9IGNhdGVnb3J5O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybURhdGE7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgcG9ydCBpbmZvcm1hdGlvbiBmcm9tIHJ1bGUgdGVtcGxhdGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJ1bGVUZW1wbGF0ZSAtIFJ1bGUgdGVtcGxhdGUgZnJvbSBhdmFpbGFibGVSdWxlcy5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHBvcnQgaW5mb3JtYXRpb24gb2JqZWN0cy5cbiAgICAgKi9cbiAgICBleHRyYWN0UG9ydHNGcm9tVGVtcGxhdGUocnVsZVRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnN0IHBvcnRzID0gW107XG5cbiAgICAgICAgaWYgKHJ1bGVUZW1wbGF0ZS5ydWxlcyAmJiBBcnJheS5pc0FycmF5KHJ1bGVUZW1wbGF0ZS5ydWxlcykpIHtcbiAgICAgICAgICAgIHJ1bGVUZW1wbGF0ZS5ydWxlcy5mb3JFYWNoKHJ1bGUgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChydWxlLnByb3RvY29sID09PSAnaWNtcCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogJ0lDTVAnXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocnVsZS5wb3J0ZnJvbSA9PT0gcnVsZS5wb3J0dG8pIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiBydWxlLnBvcnRmcm9tLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHJ1bGUucHJvdG9jb2wudG9VcHBlckNhc2UoKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwb3J0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiBgJHtydWxlLnBvcnRmcm9tfS0ke3J1bGUucG9ydHRvfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogcnVsZS5wcm90b2NvbC50b1VwcGVyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBvcnRzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBIVE1MIGZvciBmaXJld2FsbCBydWxlcyBiYXNlZCBvbiBBUEkgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGEgZnJvbSBBUEkuXG4gICAgICovXG4gICAgZ2VuZXJhdGVSdWxlc0hUTUwoZGF0YSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJCgnI2ZpcmV3YWxsLXJ1bGVzLWNvbnRhaW5lcicpO1xuICAgICAgICAkY29udGFpbmVyLmVtcHR5KCkucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBVc2UgbmV3IG5hbWluZzogYXZhaWxhYmxlUnVsZXMgZm9yIHRlbXBsYXRlcywgY3VycmVudFJ1bGVzIGZvciBhY3R1YWwgdmFsdWVzXG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVJ1bGVzID0gZGF0YS5hdmFpbGFibGVSdWxlcztcbiAgICAgICAgY29uc3QgY3VycmVudFJ1bGVzID0gZGF0YS5jdXJyZW50UnVsZXMgfHwge307XG5cbiAgICAgICAgaWYgKCFhdmFpbGFibGVSdWxlcykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gYXZhaWxhYmxlIHJ1bGVzIGRhdGEgcmVjZWl2ZWQgZnJvbSBBUEknKTtcbiAgICAgICAgICAgICRjb250YWluZXIuaHRtbCgnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiPlVuYWJsZSB0byBsb2FkIGZpcmV3YWxsIHJ1bGVzLiBQbGVhc2UgcmVmcmVzaCB0aGUgcGFnZS48L2Rpdj4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlzRG9ja2VyID0gZGF0YS5pc0RvY2tlciB8fCBmYWxzZTtcbiAgICAgICAgY29uc3QgZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgPSBkYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIHx8IFtdO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIEhUTUwgZm9yIGVhY2ggcnVsZVxuICAgICAgICBPYmplY3Qua2V5cyhhdmFpbGFibGVSdWxlcykuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJ1bGVUZW1wbGF0ZSA9IGF2YWlsYWJsZVJ1bGVzW25hbWVdO1xuICAgICAgICAgICAgY29uc3Qgc2hvcnROYW1lID0gcnVsZVRlbXBsYXRlLnNob3J0TmFtZSB8fCBuYW1lO1xuICAgICAgICAgICAgY29uc3QgaXNMaW1pdGVkID0gaXNEb2NrZXIgJiYgIWRvY2tlclN1cHBvcnRlZFNlcnZpY2VzLmluY2x1ZGVzKHNob3J0TmFtZSk7XG4gICAgICAgICAgICAvLyBHZXQgYWN0dWFsIHZhbHVlIGZyb20gY3VycmVudFJ1bGVzLCBkZWZhdWx0IHRvIHRlbXBsYXRlIGRlZmF1bHRcbiAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IGN1cnJlbnRSdWxlc1tuYW1lXSAhPT0gdW5kZWZpbmVkID8gY3VycmVudFJ1bGVzW25hbWVdIDogKHJ1bGVUZW1wbGF0ZS5hY3Rpb24gPT09ICdhbGxvdycpO1xuXG4gICAgICAgICAgICBjb25zdCBzZWdtZW50Q2xhc3MgPSBpc0xpbWl0ZWQgPyAnZG9ja2VyLWxpbWl0ZWQtc2VnbWVudCcgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGNoZWNrYm94Q2xhc3MgPSBpc0xpbWl0ZWQgPyAnZG9ja2VyLWxpbWl0ZWQtY2hlY2tib3gnIDogJyc7XG4gICAgICAgICAgICBjb25zdCBpY29uQ2xhc3MgPSBpc0xpbWl0ZWQgPyAneWVsbG93IGV4Y2xhbWF0aW9uIHRyaWFuZ2xlJyA6ICdzbWFsbCBpbmZvIGNpcmNsZSc7XG5cbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnQgJHtzZWdtZW50Q2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBydWxlcyAke2NoZWNrYm94Q2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkPVwicnVsZV8ke25hbWV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInJ1bGVfJHtuYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aXNMaW1pdGVkIHx8IGlzQ2hlY2tlZCA/ICdjaGVja2VkJyA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2lzTGltaXRlZCA/ICdkaXNhYmxlZCcgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFiaW5kZXg9XCIwXCIgY2xhc3M9XCJoaWRkZW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPVwicnVsZV8ke25hbWV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlW2Bmd18ke25hbWUudG9Mb3dlckNhc2UoKX1EZXNjcmlwdGlvbmBdIHx8IHNob3J0TmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2ljb25DbGFzc30gaWNvbiBzZXJ2aWNlLWluZm8taWNvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtc2VydmljZT1cIiR7bmFtZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWFjdGlvbj1cIiR7cnVsZVRlbXBsYXRlLmFjdGlvbn1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2lzTGltaXRlZCA/ICdkYXRhLWxpbWl0ZWQ9XCJ0cnVlXCInIDogJyd9PjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcblxuICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoaHRtbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2hlY2tib3hlcyBmb3IgZHluYW1pY2FsbHkgYWRkZWQgZWxlbWVudHMgd2l0aCBvbkNoYW5nZSBoYW5kbGVyXG4gICAgICAgICQoJyNmaXJld2FsbC1ydWxlcy1jb250YWluZXIgLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBlbGVtZW50cy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzIChleGNsdWRpbmcgZHluYW1pY2FsbHkgYWRkZWQgcnVsZXMgd2hpY2ggYXJlIGhhbmRsZWQgaW4gZ2VuZXJhdGVSdWxlc0hUTUwpXG4gICAgICAgICQoJyNmaXJld2FsbC1mb3JtIC5jaGVja2JveCcpLm5vdCgnI2ZpcmV3YWxsLXJ1bGVzLWNvbnRhaW5lciAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgICQoJyNmaXJld2FsbC1mb3JtIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dCBtYXNrIGZvciBJUHY0IG5ldHdvcmsgZmllbGQgb25seSAoSVB2NiBkb2Vzbid0IG5lZWQgaW5wdXQgbWFzaylcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImlwdjRfbmV0d29ya1wiXScpLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIC8vIEF1dG8tY2xlYXIgb3Bwb3NpdGUgcHJvdG9jb2wgZmllbGRzIHdoZW4gdXNlciB0eXBlc1xuICAgICAgICB0aGlzLnNldHVwUHJvdG9jb2xBdXRvQ2xlYXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0dXAgYXV0by1jbGVhciBsb2dpYyBmb3IgSVB2NC9JUHY2IGZpZWxkc1xuICAgICAqIFdoZW4gdXNlciB0eXBlcyBpbiBJUHY0IGZpZWxkcyAtPiBjbGVhciBJUHY2IGZpZWxkc1xuICAgICAqIFdoZW4gdXNlciB0eXBlcyBpbiBJUHY2IGZpZWxkcyAtPiBjbGVhciBJUHY0IGZpZWxkc1xuICAgICAqL1xuICAgIHNldHVwUHJvdG9jb2xBdXRvQ2xlYXIoKSB7XG4gICAgICAgIGNvbnN0ICRpcHY0TmV0d29yayA9ICQoJ2lucHV0W25hbWU9XCJpcHY0X25ldHdvcmtcIl0nKTtcbiAgICAgICAgY29uc3QgJGlwdjRTdWJuZXQgPSAkKCdzZWxlY3RbbmFtZT1cImlwdjRfc3VibmV0XCJdJyk7XG4gICAgICAgIGNvbnN0ICRpcHY2TmV0d29yayA9ICQoJ2lucHV0W25hbWU9XCJpcHY2X25ldHdvcmtcIl0nKTtcbiAgICAgICAgY29uc3QgJGlwdjZTdWJuZXQgPSAkKCdzZWxlY3RbbmFtZT1cImlwdjZfc3VibmV0XCJdJyk7XG5cbiAgICAgICAgLy8gV2hlbiB1c2VyIHR5cGVzIGluIElQdjQgbmV0d29yayBmaWVsZCAtPiBjbGVhciBJUHY2IGZpZWxkc1xuICAgICAgICAkaXB2NE5ldHdvcmsub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkaXB2NE5ldHdvcmsudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlICE9PSAnJykge1xuICAgICAgICAgICAgICAgICRpcHY2TmV0d29yay52YWwoJycpO1xuICAgICAgICAgICAgICAgICRpcHY2U3VibmV0LmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBXaGVuIHVzZXIgc2VsZWN0cyBJUHY0IHN1Ym5ldCAtPiBjbGVhciBJUHY2IGZpZWxkc1xuICAgICAgICAkaXB2NFN1Ym5ldC5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV0d29ya1ZhbHVlID0gJGlwdjROZXR3b3JrLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChuZXR3b3JrVmFsdWUgJiYgbmV0d29ya1ZhbHVlICE9PSAnJykge1xuICAgICAgICAgICAgICAgICRpcHY2TmV0d29yay52YWwoJycpO1xuICAgICAgICAgICAgICAgICRpcHY2U3VibmV0LmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBXaGVuIHVzZXIgdHlwZXMgaW4gSVB2NiBuZXR3b3JrIGZpZWxkIC0+IGNsZWFyIElQdjQgZmllbGRzXG4gICAgICAgICRpcHY2TmV0d29yay5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRpcHY2TmV0d29yay52YWwoKS50cmltKCk7XG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJGlwdjROZXR3b3JrLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgJGlwdjRTdWJuZXQuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFdoZW4gdXNlciBzZWxlY3RzIElQdjYgc3VibmV0IC0+IGNsZWFyIElQdjQgZmllbGRzXG4gICAgICAgICRpcHY2U3VibmV0Lm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrVmFsdWUgPSAkaXB2Nk5ldHdvcmsudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKG5ldHdvcmtWYWx1ZSAmJiBuZXR3b3JrVmFsdWUgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJGlwdjROZXR3b3JrLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgJGlwdjRTdWJuZXQuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSByZXN1bHQuZGF0YSB8fCBmaXJld2FsbC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gR2V0IElQdjQgYW5kIElQdjYgdmFsdWVzXG4gICAgICAgIGNvbnN0IGlwdjROZXR3b3JrID0gZm9ybURhdGEuaXB2NF9uZXR3b3JrIHx8ICcnO1xuICAgICAgICBjb25zdCBpcHY0U3VibmV0ID0gZm9ybURhdGEuaXB2NF9zdWJuZXQgfHwgJyc7XG4gICAgICAgIGNvbnN0IGlwdjZOZXR3b3JrID0gZm9ybURhdGEuaXB2Nl9uZXR3b3JrIHx8ICcnO1xuICAgICAgICBjb25zdCBpcHY2U3VibmV0ID0gZm9ybURhdGEuaXB2Nl9zdWJuZXQgfHwgJyc7XG5cbiAgICAgICAgLy8gVmFsaWRhdGU6IGVpdGhlciBJUHY0IE9SIElQdjYsIG5vdCBib3RoLCBub3QgbmVpdGhlclxuICAgICAgICBjb25zdCBoYXNJUHY0ID0gaXB2NE5ldHdvcmsgJiYgaXB2NE5ldHdvcmsgIT09ICcnO1xuICAgICAgICBjb25zdCBoYXNJUHY2ID0gaXB2Nk5ldHdvcmsgJiYgaXB2Nk5ldHdvcmsgIT09ICcnO1xuXG4gICAgICAgIGlmICghaGFzSVB2NCAmJiAhaGFzSVB2Nikge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5md19WYWxpZGF0ZUVpdGhlcklQdjRPcklQdjZSZXF1aXJlZCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhhc0lQdjQgJiYgaGFzSVB2Nikge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5md19WYWxpZGF0ZU9ubHlPbmVQcm90b2NvbCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb21iaW5lIHNlbGVjdGVkIElQdjQgb3IgSVB2NiBpbnRvIGJhY2tlbmQtY29tcGF0aWJsZSBuZXR3b3JrL3N1Ym5ldCBmb3JtYXRcbiAgICAgICAgZm9ybURhdGEubmV0d29yayA9IGhhc0lQdjQgPyBpcHY0TmV0d29yayA6IGlwdjZOZXR3b3JrO1xuICAgICAgICBmb3JtRGF0YS5zdWJuZXQgPSBoYXNJUHY0ID8gaXB2NFN1Ym5ldCA6IGlwdjZTdWJuZXQ7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHNlcGFyYXRlIElQdjQvSVB2NiBmaWVsZHMgKGJhY2tlbmQgZXhwZWN0cyB1bmlmaWVkIG5ldHdvcmsvc3VibmV0KVxuICAgICAgICBkZWxldGUgZm9ybURhdGEuaXB2NF9uZXR3b3JrO1xuICAgICAgICBkZWxldGUgZm9ybURhdGEuaXB2NF9zdWJuZXQ7XG4gICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5pcHY2X25ldHdvcms7XG4gICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5pcHY2X3N1Ym5ldDtcblxuICAgICAgICAvLyBQcmVwYXJlIGN1cnJlbnRSdWxlcyBkYXRhIGZvciBBUEkgKHNpbXBsZSBib29sZWFuIG1hcClcbiAgICAgICAgY29uc3QgY3VycmVudFJ1bGVzID0ge307XG4gICAgICAgIE9iamVjdC5rZXlzKGZvcm1EYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ3J1bGVfJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IGtleS5yZXBsYWNlKCdydWxlXycsICcnKTtcbiAgICAgICAgICAgICAgICAvLyBTZW5kIGFzIGJvb2xlYW4gLSB0cnVlID0gYWxsb3csIGZhbHNlID0gYmxvY2tcbiAgICAgICAgICAgICAgICBjdXJyZW50UnVsZXNbY2F0ZWdvcnldID0gZm9ybURhdGFba2V5XSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBkZWxldGUgZm9ybURhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGN1cnJlbnRSdWxlcyB0byBmb3JtRGF0YVxuICAgICAgICBmb3JtRGF0YS5jdXJyZW50UnVsZXMgPSBjdXJyZW50UnVsZXM7XG5cbiAgICAgICAgLy8gbmV3ZXJfYmxvY2tfaXAgYW5kIGxvY2FsX25ldHdvcmsgYXJlIGFscmVhZHkgYm9vbGVhbiB0aGFua3MgdG8gY29udmVydENoZWNrYm94ZXNUb0Jvb2xcblxuICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRCAoZm9yIGNvcnJlY3QgUE9TVC9QVVQgc2VsZWN0aW9uKVxuICAgICAgICAvLyBUaGlzIGlzIGNyaXRpY2FsIGZvciBjcmVhdGluZyByZWNvcmRzIHdpdGggcHJlZGVmaW5lZCBJRHNcbiAgICAgICAgaWYgKCFmaXJld2FsbC5yZWNvcmRJZCB8fCBmaXJld2FsbC5yZWNvcmRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgIGZvcm1EYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQuZGF0YSA9IGZvcm1EYXRhO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZmlyZXdhbGwuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGZpcmV3YWxsLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGZpcmV3YWxsLmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmlyZXdhbGwuY2JBZnRlclNlbmRGb3JtO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG5cbiAgICAgICAgLy8gU2V0dXAgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBGaXJld2FsbEFQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS9gO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBBZGQgY2hhbmdlIGhhbmRsZXJzIGZvciBkeW5hbWljYWxseSBhZGRlZCBjaGVja2JveGVzXG4gICAgICAgIC8vIFRoaXMgbXVzdCBiZSBkb25lIEFGVEVSIEZvcm0uaW5pdGlhbGl6ZSgpIHRvIGVuc3VyZSBwcm9wZXIgdHJhY2tpbmdcbiAgICAgICAgJCgnI2ZpcmV3YWxsLXJ1bGVzLWNvbnRhaW5lciBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIGV2ZW50IGZvciBkaXJ0eSBjaGVja2luZ1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIHNlcnZpY2UgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3Igc2VydmljZSBydWxlc1xuICAgICAgICAkKCcuc2VydmljZS1pbmZvLWljb24nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3Qgc2VydmljZSA9ICRpY29uLmRhdGEoJ3NlcnZpY2UnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9ICRpY29uLmRhdGEoJ2xpbWl0ZWQnKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmluZCB0aGUgY2hlY2tib3ggZm9yIHRoaXMgc2VydmljZVxuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJGljb24uY2xvc2VzdCgnLmZpZWxkJykuZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBpbml0aWFsIGFjdGlvbiBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gJGNoZWNrYm94LnByb3AoJ2NoZWNrZWQnKSA/ICdhbGxvdycgOiAnYmxvY2snO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBpbml0aWFsIHRvb2x0aXAgY29udGVudFxuICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgY29uc3QgcG9ydEluZm8gPSB3aW5kb3cuc2VydmljZVBvcnRJbmZvW3NlcnZpY2VdIHx8IFtdO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBmaXJld2FsbFRvb2x0aXBzLmdlbmVyYXRlQ29udGVudChcbiAgICAgICAgICAgICAgICBzZXJ2aWNlLCBcbiAgICAgICAgICAgICAgICBhY3Rpb24sIFxuICAgICAgICAgICAgICAgIG5ldHdvcmssIFxuICAgICAgICAgICAgICAgIHdpbmRvdy5pc0RvY2tlciwgXG4gICAgICAgICAgICAgICAgaXNMaW1pdGVkLCBcbiAgICAgICAgICAgICAgICBwb3J0SW5mbywgXG4gICAgICAgICAgICAgICAgaXNMaW1pdGVkICYmIHdpbmRvdy5pc0RvY2tlciAvLyBTaG93IGNvcHkgYnV0dG9uIG9ubHkgZm9yIERvY2tlciBsaW1pdGVkIHNlcnZpY2VzXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBcbiAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMuaW5pdGlhbGl6ZVRvb2x0aXAoJGljb24sIHtcbiAgICAgICAgICAgICAgICBodG1sOiB0b29sdGlwQ29udGVudCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSByZWZlcmVuY2UgdG8gaWNvbiBvbiBjaGVja2JveCBmb3IgdXBkYXRlc1xuICAgICAgICAgICAgJGNoZWNrYm94LmRhdGEoJ3Rvb2x0aXBJY29uJywgJGljb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIHNwZWNpYWwgY2hlY2tib3hlc1xuICAgICAgICAkKCcuc3BlY2lhbC1jaGVja2JveC1pbmZvJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSAkaWNvbi5kYXRhKCd0eXBlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIGNoZWNrYm94IGZvciB0aGlzIHR5cGVcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICRpY29uLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoYGlucHV0W25hbWU9XCIke3R5cGV9XCJdYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBpbml0aWFsIHN0YXRlXG4gICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpO1xuICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBpbml0aWFsIHRvb2x0aXAgY29udGVudFxuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBmaXJld2FsbFRvb2x0aXBzLmdlbmVyYXRlU3BlY2lhbENoZWNrYm94Q29udGVudChcbiAgICAgICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgICAgIG5ldHdvcmssXG4gICAgICAgICAgICAgICAgaXNDaGVja2VkXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXAgd2l0aCBjb21wYWN0IHdpZHRoIGZvciBzcGVjaWFsIGNoZWNrYm94ZXNcbiAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMuaW5pdGlhbGl6ZVRvb2x0aXAoJGljb24sIHtcbiAgICAgICAgICAgICAgICBodG1sOiB0b29sdGlwQ29udGVudCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAndmVyeSB3aWRlJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIHJlZmVyZW5jZSB0byBpY29uIG9uIGNoZWNrYm94IGZvciB1cGRhdGVzXG4gICAgICAgICAgICAkY2hlY2tib3guZGF0YSgnc3BlY2lhbFRvb2x0aXBJY29uJywgJGljb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbiBmb3IgY2hlY2tib3ggY2hhbmdlcyB0byB1cGRhdGUgdG9vbHRpcHMgKHVzZSBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGVsZW1lbnRzKVxuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybScpLm9uKCdjaGFuZ2UnLCAnLnJ1bGVzIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJGNoZWNrYm94LmRhdGEoJ3Rvb2x0aXBJY29uJyk7XG4gICAgICAgICAgICBjb25zdCAkc3BlY2lhbEljb24gPSAkY2hlY2tib3guZGF0YSgnc3BlY2lhbFRvb2x0aXBJY29uJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkaWNvbiAmJiAkaWNvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZXJ2aWNlID0gJGljb24uZGF0YSgnc2VydmljZScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9ICRpY29uLmRhdGEoJ2xpbWl0ZWQnKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb24gPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpID8gJ2FsbG93JyA6ICdibG9jayc7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBvcnRJbmZvID0gd2luZG93LnNlcnZpY2VQb3J0SW5mb1tzZXJ2aWNlXSB8fCBbXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBuZXcgdG9vbHRpcCBjb250ZW50XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVDb250ZW50KFxuICAgICAgICAgICAgICAgICAgICBzZXJ2aWNlLCBcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgbmV0d29yaywgXG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5pc0RvY2tlciwgXG4gICAgICAgICAgICAgICAgICAgIGlzTGltaXRlZCwgXG4gICAgICAgICAgICAgICAgICAgIHBvcnRJbmZvLCBcbiAgICAgICAgICAgICAgICAgICAgaXNMaW1pdGVkICYmIHdpbmRvdy5pc0RvY2tlclxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRvb2x0aXBzLnVwZGF0ZUNvbnRlbnQoJGljb24sIG5ld0NvbnRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJHNwZWNpYWxJY29uICYmICRzcGVjaWFsSWNvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gJHNwZWNpYWxJY29uLmRhdGEoJ3R5cGUnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSBgJHt3aW5kb3cuY3VycmVudE5ldHdvcmt9LyR7d2luZG93LmN1cnJlbnRTdWJuZXR9YDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBuZXcgdG9vbHRpcCBjb250ZW50XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVTcGVjaWFsQ2hlY2tib3hDb250ZW50KFxuICAgICAgICAgICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgICAgICAgICBuZXR3b3JrLFxuICAgICAgICAgICAgICAgICAgICBpc0NoZWNrZWRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0b29sdGlwIHdpdGggY29tcGFjdCB3aWR0aFxuICAgICAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMudXBkYXRlQ29udGVudCgkc3BlY2lhbEljb24sIG5ld0NvbnRlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICd2ZXJ5IHdpZGUnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEb2NrZXIgbGltaXRlZCBjaGVja2JveGVzIC0gcHJldmVudCB0aGVtIGZyb20gYmVpbmcgdG9nZ2xlZFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEb2NrZXJMaW1pdGVkQ2hlY2tib3hlcygpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaXNEb2NrZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCgnLmRvY2tlci1saW1pdGVkLWNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEVuc3VyZSBjaGVja2JveCBpcyBhbHdheXMgY2hlY2tlZFxuICAgICAgICAgICAgJGlucHV0LnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIHZpc3VhbCBkaXNhYmxlZCBzdGF0ZVxuICAgICAgICAgICAgJGNoZWNrYm94LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IGNsaWNrIGV2ZW50c1xuICAgICAgICAgICAgJGNoZWNrYm94Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTaG93IGEgdGVtcG9yYXJ5IG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkY2hlY2tib3guZmluZCgnbGFiZWwnKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkaWNvbiA9ICRsYWJlbC5maW5kKCcuc2VydmljZS1pbmZvLWljb24nKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSB0b29sdGlwIHRvIHNob3dcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IGNoZWNrYm94IHN0YXRlIGNoYW5nZXNcbiAgICAgICAgICAgICRpbnB1dC5vbignY2hhbmdlJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLy8gQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIHRvIGNoZWNrIGlmIGEgc3RyaW5nIGlzIGEgdmFsaWQgSVAgYWRkcmVzc1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT09IG51bGwpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSBmW2ldO1xuICAgICAgICAgICAgaWYgKGEgPiAyNTUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZls1XSA+IDMyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgZmlyZXdhbGwgZm9ybSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGZpcmV3YWxsLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=