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
   * @type {jQuery}
   */
  $formObj: $('#firewall-form'),

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
    // Initialize global variables for tooltips and Docker detection
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
          window.dockerSupportedServices = response.data.dockerSupportedServices || [];
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1tb2RpZnkuanMiXSwibmFtZXMiOlsiZmlyZXdhbGwiLCIkZm9ybU9iaiIsIiQiLCJyZWNvcmRJZCIsImZpcmV3YWxsRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJpcHY0X25ldHdvcmsiLCJpZGVudGlmaWVyIiwib3B0aW9uYWwiLCJydWxlcyIsInR5cGUiLCJ2YWx1ZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X1ZhbGlkYXRlSVB2NEFkZHJlc3MiLCJpcHY2X25ldHdvcmsiLCJmd19WYWxpZGF0ZUlQdjZBZGRyZXNzIiwiZGVzY3JpcHRpb24iLCJmd19WYWxpZGF0ZVJ1bGVOYW1lIiwiaW5pdGlhbGl6ZSIsIndpbmRvdyIsInNlcnZpY2VQb3J0SW5mbyIsInNlcnZpY2VOYW1lTWFwcGluZyIsImlzRG9ja2VyIiwiZG9ja2VyU3VwcG9ydGVkU2VydmljZXMiLCJjdXJyZW50TmV0d29yayIsImN1cnJlbnRTdWJuZXQiLCJ1cmxQYXJ0cyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsImxhc3RTZWdtZW50IiwibGVuZ3RoIiwidXJsUGFyYW1ldGVycyIsImdldFVybFBhcmFtZXRlcnMiLCJpbml0aWFsaXplRm9ybSIsImxvYWRGaXJld2FsbERhdGEiLCJwYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJuZXR3b3JrIiwiZ2V0Iiwic3VibmV0IiwicnVsZU5hbWUiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlc3VsdCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZndfRXJyb3JMb2FkaW5nUmVjb3JkIiwiZGF0YSIsImdlbmVyYXRlUnVsZXNIVE1MIiwiZm9ybURhdGEiLCJwcmVwYXJlRm9ybURhdGEiLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwicG9wdWxhdGVkRGF0YSIsImluaXRpYWxpemVVSUVsZW1lbnRzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZURvY2tlckxpbWl0ZWRDaGVja2JveGVzIiwiaXNJUHY2QWRkcmVzcyIsImFkZHJlc3MiLCJpbmNsdWRlcyIsImlkIiwibmV3ZXJfYmxvY2tfaXAiLCJsb2NhbF9uZXR3b3JrIiwiaXNJUHY2IiwiaXB2Nl9zdWJuZXQiLCJpcHY0X3N1Ym5ldCIsImN1cnJlbnRSdWxlcyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwiY2F0ZWdvcnkiLCJhdmFpbGFibGVSdWxlcyIsInJ1bGVUZW1wbGF0ZSIsImV4dHJhY3RQb3J0c0Zyb21UZW1wbGF0ZSIsInNob3J0TmFtZSIsInBvcnRzIiwiQXJyYXkiLCJpc0FycmF5IiwicnVsZSIsInByb3RvY29sIiwicHVzaCIsInBvcnRmcm9tIiwicG9ydHRvIiwicG9ydCIsInRvVXBwZXJDYXNlIiwicmFuZ2UiLCIkY29udGFpbmVyIiwiZW1wdHkiLCJjb25zb2xlIiwiZXJyb3IiLCJodG1sIiwibmFtZSIsImlzTGltaXRlZCIsImlzQ2hlY2tlZCIsInVuZGVmaW5lZCIsImFjdGlvbiIsInNlZ21lbnRDbGFzcyIsImNoZWNrYm94Q2xhc3MiLCJpY29uQ2xhc3MiLCJ0b0xvd2VyQ2FzZSIsImFwcGVuZCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJkYXRhQ2hhbmdlZCIsIm5vdCIsImRyb3Bkb3duIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJzZXR1cFByb3RvY29sQXV0b0NsZWFyIiwiJGlwdjROZXR3b3JrIiwiJGlwdjRTdWJuZXQiLCIkaXB2Nk5ldHdvcmsiLCIkaXB2NlN1Ym5ldCIsIm9uIiwidmFsIiwidHJpbSIsIm5ldHdvcmtWYWx1ZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImZvcm0iLCJpcHY0TmV0d29yayIsImlwdjRTdWJuZXQiLCJpcHY2TmV0d29yayIsImlwdjZTdWJuZXQiLCJoYXNJUHY0IiwiaGFzSVB2NiIsImZ3X1ZhbGlkYXRlRWl0aGVySVB2NE9ySVB2NlJlcXVpcmVkIiwiZndfVmFsaWRhdGVPbmx5T25lUHJvdG9jb2wiLCJrZXkiLCJzdGFydHNXaXRoIiwicmVwbGFjZSIsIl9pc05ldyIsImNiQWZ0ZXJTZW5kRm9ybSIsInVybCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJzZWxmIiwiZWFjaCIsIiRpY29uIiwic2VydmljZSIsIiRjaGVja2JveCIsImNsb3Nlc3QiLCJmaW5kIiwicHJvcCIsInBvcnRJbmZvIiwidG9vbHRpcENvbnRlbnQiLCJmaXJld2FsbFRvb2x0aXBzIiwiZ2VuZXJhdGVDb250ZW50IiwiaW5pdGlhbGl6ZVRvb2x0aXAiLCJwb3NpdGlvbiIsImdlbmVyYXRlU3BlY2lhbENoZWNrYm94Q29udGVudCIsInZhcmlhdGlvbiIsIiRzcGVjaWFsSWNvbiIsIm5ld0NvbnRlbnQiLCJ1cGRhdGVDb250ZW50IiwiJGlucHV0IiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcFByb3BhZ2F0aW9uIiwiJGxhYmVsIiwicG9wdXAiLCJmbiIsImlwYWRkciIsImYiLCJtYXRjaCIsImkiLCJhIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEU7O0FBT2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLEVBWEc7O0FBYWI7QUFD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SXNDLE1BQU0sR0FBRyxJQUFiO0FBQ0EsTUFBTStILENBQUMsR0FBR3JLLEtBQUssQ0FBQ3NLLEtBQU4sQ0FBWSw4Q0FBWixDQUFWOztBQUNBLE1BQUlELENBQUMsS0FBSyxJQUFWLEVBQWdCO0FBQ1ovSCxJQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNILEdBRkQsTUFFTztBQUNILFNBQUssSUFBSWlJLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUcsQ0FBcEIsRUFBdUJBLENBQUMsSUFBSSxDQUE1QixFQUErQjtBQUMzQixVQUFNQyxDQUFDLEdBQUdILENBQUMsQ0FBQ0UsQ0FBRCxDQUFYOztBQUNBLFVBQUlDLENBQUMsR0FBRyxHQUFSLEVBQWE7QUFDVGxJLFFBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7QUFDSjs7QUFDRCxRQUFJK0gsQ0FBQyxDQUFDLENBQUQsQ0FBRCxHQUFPLEVBQVgsRUFBZTtBQUNYL0gsTUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSDtBQUNKOztBQUNELFNBQU9BLE1BQVA7QUFDSCxDQWpCRCxDLENBbUJBOzs7QUFDQS9DLENBQUMsQ0FBQ2tMLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJyTCxFQUFBQSxRQUFRLENBQUNtQixVQUFUO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgZmlyZXdhbGxUb29sdGlwcywgRmlyZXdhbGxBUEksIEZvcm1FbGVtZW50cywgVXNlck1lc3NhZ2UgKi9cblxuLyoqXG4gKiBUaGUgZmlyZXdhbGwgb2JqZWN0IGNvbnRhaW5zIG1ldGhvZHMgYW5kIHZhcmlhYmxlcyBmb3IgbWFuYWdpbmcgdGhlIEZpcmV3YWxsIGZvcm1cbiAqXG4gKiBAbW9kdWxlIGZpcmV3YWxsXG4gKi9cbmNvbnN0IGZpcmV3YWxsID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNmaXJld2FsbC1mb3JtJyksXG4gICAgXG4gICAgLyoqXG4gICAgICogRmlyZXdhbGwgcmVjb3JkIElELlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcmVjb3JkSWQ6ICcnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEZpcmV3YWxsIGRhdGEgZnJvbSBBUEkuXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBmaXJld2FsbERhdGE6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgaXB2NF9uZXR3b3JrOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnaXB2NF9uZXR3b3JrJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICAvLyBTdHJpY3QgSVB2NDogZWFjaCBvY3RldCAwLTI1NVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogL14oMjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KVxcLigyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pXFwuKDI1WzAtNV18MlswLTRdWzAtOV18WzAxXT9bMC05XVswLTldPylcXC4oMjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KSQvLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5md19WYWxpZGF0ZUlQdjRBZGRyZXNzLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBpcHY2X25ldHdvcms6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdpcHY2X25ldHdvcmsnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIC8vIFN0cmljdCBJUHY2OiBSRkMgNDI5MSBjb21wbGlhbnQgKGFsbCBzdGFuZGFyZCBub3RhdGlvbnMgaW5jbHVkaW5nIGNvbXByZXNzZWQgOjopXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAvXigoWzAtOWEtZkEtRl17MSw0fTopezd9WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsN306fChbMC05YS1mQS1GXXsxLDR9Oil7MSw2fTpbMC05YS1mQS1GXXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw1fSg6WzAtOWEtZkEtRl17MSw0fSl7MSwyfXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH0oOlswLTlhLWZBLUZdezEsNH0pezEsM318KFswLTlhLWZBLUZdezEsNH06KXsxLDN9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwyfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw1fXxbMC05YS1mQS1GXXsxLDR9OigoOlswLTlhLWZBLUZdezEsNH0pezEsNn0pfDooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDd9fDopKSQvLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5md19WYWxpZGF0ZUlQdjZBZGRyZXNzLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBkZXNjcmlwdGlvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2Rlc2NyaXB0aW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5md19WYWxpZGF0ZVJ1bGVOYW1lLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBJbml0aWFsaXphdGlvbiBmdW5jdGlvbiB0byBzZXQgdXAgZm9ybSBiZWhhdmlvclxuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZ2xvYmFsIHZhcmlhYmxlcyBmb3IgdG9vbHRpcHMgYW5kIERvY2tlciBkZXRlY3Rpb25cbiAgICAgICAgLy8gVGhlc2Ugd2lsbCBiZSB1cGRhdGVkIHdoZW4gZGF0YSBpcyBsb2FkZWQgZnJvbSBBUElcbiAgICAgICAgd2luZG93LnNlcnZpY2VQb3J0SW5mbyA9IHt9O1xuICAgICAgICB3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nID0ge307XG4gICAgICAgIHdpbmRvdy5pc0RvY2tlciA9IGZhbHNlO1xuICAgICAgICB3aW5kb3cuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgPSBbXTtcbiAgICAgICAgd2luZG93LmN1cnJlbnROZXR3b3JrID0gJyc7XG4gICAgICAgIHdpbmRvdy5jdXJyZW50U3VibmV0ID0gJyc7XG5cbiAgICAgICAgLy8gR2V0IHJlY29yZCBJRCBmcm9tIFVSTCBvciBmb3JtXG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IGxhc3RTZWdtZW50ID0gdXJsUGFydHNbdXJsUGFydHMubGVuZ3RoIC0gMV0gfHwgJyc7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGxhc3Qgc2VnbWVudCBpcyAnbW9kaWZ5JyAobmV3IHJlY29yZCkgb3IgYW4gYWN0dWFsIElEXG4gICAgICAgIGlmIChsYXN0U2VnbWVudCA9PT0gJ21vZGlmeScgfHwgbGFzdFNlZ21lbnQgPT09ICcnKSB7XG4gICAgICAgICAgICBmaXJld2FsbC5yZWNvcmRJZCA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZmlyZXdhbGwucmVjb3JkSWQgPSBsYXN0U2VnbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlYWQgVVJMIHBhcmFtZXRlcnMgZm9yIHByZWZpbGxpbmcgKGUuZy4sID9uZXR3b3JrPTAuMC4wLjAmc3VibmV0PTApXG4gICAgICAgIGZpcmV3YWxsLnVybFBhcmFtZXRlcnMgPSBmaXJld2FsbC5nZXRVcmxQYXJhbWV0ZXJzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBGb3JtIEJFRk9SRSBsb2FkaW5nIGRhdGEgKGxpa2UgZXh0ZW5zaW9uLW1vZGlmeS5qcyBwYXR0ZXJuKVxuICAgICAgICBmaXJld2FsbC5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIExvYWQgZmlyZXdhbGwgZGF0YSBmcm9tIEFQSVxuICAgICAgICBmaXJld2FsbC5sb2FkRmlyZXdhbGxEYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBVUkwgcGFyYW1ldGVycyBmb3IgcHJlZmlsbGluZyB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIG5ldHdvcmssIHN1Ym5ldCwgYW5kIHJ1bGVOYW1lIHBhcmFtZXRlcnNcbiAgICAgKi9cbiAgICBnZXRVcmxQYXJhbWV0ZXJzKCkge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmV0d29yazogcGFyYW1zLmdldCgnbmV0d29yaycpIHx8ICcnLFxuICAgICAgICAgICAgc3VibmV0OiBwYXJhbXMuZ2V0KCdzdWJuZXQnKSB8fCAnJyxcbiAgICAgICAgICAgIHJ1bGVOYW1lOiBwYXJhbXMuZ2V0KCdydWxlTmFtZScpIHx8ICcnXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZmlyZXdhbGwgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBVbmlmaWVkIG1ldGhvZCBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHMuXG4gICAgICogQVBJIHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzIHdoZW4gSUQgaXMgZW1wdHkuXG4gICAgICovXG4gICAgbG9hZEZpcmV3YWxsRGF0YSgpIHtcbiAgICAgICAgZmlyZXdhbGwuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBBbHdheXMgY2FsbCBBUEkgLSBpdCByZXR1cm5zIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcyAod2hlbiBJRCBpcyBlbXB0eSlcbiAgICAgICAgRmlyZXdhbGxBUEkuZ2V0UmVjb3JkKGZpcmV3YWxsLnJlY29yZElkIHx8ICcnLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGZpcmV3YWxsLiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgYW5kIHN0b3BcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmZ3X0Vycm9yTG9hZGluZ1JlY29yZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmaXJld2FsbC5maXJld2FsbERhdGEgPSByZXNwb25zZS5kYXRhO1xuXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBkeW5hbWljIHJ1bGVzIEhUTUwgZmlyc3RcbiAgICAgICAgICAgIGZpcmV3YWxsLmdlbmVyYXRlUnVsZXNIVE1MKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAvLyBQcmVwYXJlIGRhdGEgZm9yIGZvcm0gcG9wdWxhdGlvblxuICAgICAgICAgICAgY29uc3QgZm9ybURhdGEgPSBmaXJld2FsbC5wcmVwYXJlRm9ybURhdGEocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFVzZSBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KCkgbGlrZSBleHRlbnNpb24tbW9kaWZ5LmpzIHBhdHRlcm5cbiAgICAgICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAocG9wdWxhdGVkRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGVsZW1lbnRzIEFGVEVSIGZvcm0gaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAgICAgICAgIGZpcmV3YWxsLmluaXRpYWxpemVVSUVsZW1lbnRzKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcmV3YWxsLmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICAgICAgICAgICAgICBmaXJld2FsbC5pbml0aWFsaXplRG9ja2VyTGltaXRlZENoZWNrYm94ZXMoKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgd2luZG93IHZhcmlhYmxlcyBmb3IgdG9vbHRpcHNcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmN1cnJlbnROZXR3b3JrID0gcmVzcG9uc2UuZGF0YS5uZXR3b3JrO1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY3VycmVudFN1Ym5ldCA9IHJlc3BvbnNlLmRhdGEuc3VibmV0O1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuaXNEb2NrZXIgPSByZXNwb25zZS5kYXRhLmlzRG9ja2VyIHx8IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgPSByZXNwb25zZS5kYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIHx8IFtdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGFkZHJlc3MgaXMgSVB2Ni5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWRkcmVzcyAtIElQIGFkZHJlc3MgdG8gY2hlY2suXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgSVB2NiwgZmFsc2UgaWYgSVB2NC5cbiAgICAgKi9cbiAgICBpc0lQdjZBZGRyZXNzKGFkZHJlc3MpIHtcbiAgICAgICAgLy8gSVB2NiBjb250YWlucyBjb2xvbnNcbiAgICAgICAgcmV0dXJuIGFkZHJlc3MgJiYgYWRkcmVzcy5pbmNsdWRlcygnOicpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQcmVwYXJlIGZvcm0gZGF0YSBmcm9tIEFQSSByZXNwb25zZVxuICAgICAqIENvbnZlcnRzIEFQSSBmaWVsZHMgdG8gZm9ybSBmaWVsZCBuYW1lcyAobmV0d29yay9zdWJuZXQgLT4gaXB2NC9pcHY2IGZpZWxkcylcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEFQSSByZXNwb25zZSBkYXRhXG4gICAgICogQHJldHVybnMge09iamVjdH0gRm9ybSBkYXRhIHJlYWR5IGZvciBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KClcbiAgICAgKi9cbiAgICBwcmVwYXJlRm9ybURhdGEoZGF0YSkge1xuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHtcbiAgICAgICAgICAgIGlkOiBkYXRhLmlkIHx8ICcnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGRhdGEuZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgICBuZXdlcl9ibG9ja19pcDogZGF0YS5uZXdlcl9ibG9ja19pcCA9PT0gdHJ1ZSxcbiAgICAgICAgICAgIGxvY2FsX25ldHdvcms6IGRhdGEubG9jYWxfbmV0d29yayA9PT0gdHJ1ZVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEZvciBuZXcgcmVjb3Jkcywgb3ZlcnJpZGUgbmV0d29yay9zdWJuZXQvZGVzY3JpcHRpb24gd2l0aCBVUkwgcGFyYW1ldGVycyBpZiBwcm92aWRlZFxuICAgICAgICBsZXQgbmV0d29yayA9IGRhdGEubmV0d29yayB8fCAnJztcbiAgICAgICAgbGV0IHN1Ym5ldCA9IGRhdGEuc3VibmV0O1xuXG4gICAgICAgIC8vIERlZmF1bHQgdG8gLzMyIGZvciBuZXcgcmVjb3JkcyAoZGF0YS5zdWJuZXQgaXMgJzAnIGZyb20gQVBJIGRlZmF1bHRzKVxuICAgICAgICBpZiAoIWRhdGEuaWQgJiYgKCFzdWJuZXQgfHwgc3VibmV0ID09PSAnMCcpKSB7XG4gICAgICAgICAgICBzdWJuZXQgPSAnMzInO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFkYXRhLmlkICYmIGZpcmV3YWxsLnVybFBhcmFtZXRlcnMubmV0d29yaykge1xuICAgICAgICAgICAgbmV0d29yayA9IGZpcmV3YWxsLnVybFBhcmFtZXRlcnMubmV0d29yaztcbiAgICAgICAgICAgIHN1Ym5ldCA9IGZpcmV3YWxsLnVybFBhcmFtZXRlcnMuc3VibmV0IHx8ICczMic7XG5cbiAgICAgICAgICAgIC8vIE92ZXJyaWRlIGRlc2NyaXB0aW9uIHdpdGggcnVsZU5hbWUgZnJvbSBVUkwgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmIChmaXJld2FsbC51cmxQYXJhbWV0ZXJzLnJ1bGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgZm9ybURhdGEuZGVzY3JpcHRpb24gPSBmaXJld2FsbC51cmxQYXJhbWV0ZXJzLnJ1bGVOYW1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZWN0IElQIHZlcnNpb24gYW5kIHBvcHVsYXRlIGFwcHJvcHJpYXRlIGZpZWxkc1xuICAgICAgICBjb25zdCBpc0lQdjYgPSBmaXJld2FsbC5pc0lQdjZBZGRyZXNzKG5ldHdvcmspO1xuXG4gICAgICAgIGlmIChpc0lQdjYpIHtcbiAgICAgICAgICAgIC8vIElQdjYgZGF0YVxuICAgICAgICAgICAgZm9ybURhdGEuaXB2Nl9uZXR3b3JrID0gbmV0d29yaztcbiAgICAgICAgICAgIGZvcm1EYXRhLmlwdjZfc3VibmV0ID0gc3VibmV0O1xuICAgICAgICAgICAgZm9ybURhdGEuaXB2NF9uZXR3b3JrID0gJyc7XG4gICAgICAgICAgICBmb3JtRGF0YS5pcHY0X3N1Ym5ldCA9ICcnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSVB2NCBkYXRhXG4gICAgICAgICAgICBmb3JtRGF0YS5pcHY0X25ldHdvcmsgPSBuZXR3b3JrO1xuICAgICAgICAgICAgZm9ybURhdGEuaXB2NF9zdWJuZXQgPSBzdWJuZXQ7XG4gICAgICAgICAgICBmb3JtRGF0YS5pcHY2X25ldHdvcmsgPSAnJztcbiAgICAgICAgICAgIGZvcm1EYXRhLmlwdjZfc3VibmV0ID0gJyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGQgcnVsZSBjaGVja2JveGVzIGZyb20gY3VycmVudFJ1bGVzXG4gICAgICAgIGlmIChkYXRhLmN1cnJlbnRSdWxlcyAmJiB0eXBlb2YgZGF0YS5jdXJyZW50UnVsZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLmN1cnJlbnRSdWxlcykuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICAgICAgZm9ybURhdGFbYHJ1bGVfJHtjYXRlZ29yeX1gXSA9IGRhdGEuY3VycmVudFJ1bGVzW2NhdGVnb3J5XSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgc2VydmljZSBwb3J0IGluZm8gYW5kIG5hbWUgbWFwcGluZyBmcm9tIGF2YWlsYWJsZVJ1bGVzXG4gICAgICAgIHdpbmRvdy5zZXJ2aWNlUG9ydEluZm8gPSB7fTtcbiAgICAgICAgd2luZG93LnNlcnZpY2VOYW1lTWFwcGluZyA9IHt9O1xuICAgICAgICBpZiAoZGF0YS5hdmFpbGFibGVSdWxlcyAmJiB0eXBlb2YgZGF0YS5hdmFpbGFibGVSdWxlcyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEuYXZhaWxhYmxlUnVsZXMpLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJ1bGVUZW1wbGF0ZSA9IGRhdGEuYXZhaWxhYmxlUnVsZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgICAgIC8vIEV4dHJhY3QgcG9ydCBpbmZvIGZyb20gcnVsZSB0ZW1wbGF0ZVxuICAgICAgICAgICAgICAgIHdpbmRvdy5zZXJ2aWNlUG9ydEluZm9bY2F0ZWdvcnldID0gZmlyZXdhbGwuZXh0cmFjdFBvcnRzRnJvbVRlbXBsYXRlKHJ1bGVUZW1wbGF0ZSk7XG4gICAgICAgICAgICAgICAgLy8gTWFwIGRpc3BsYXkgbmFtZSB0byBjYXRlZ29yeSBrZXlcbiAgICAgICAgICAgICAgICBjb25zdCBzaG9ydE5hbWUgPSBydWxlVGVtcGxhdGUuc2hvcnROYW1lIHx8IGNhdGVnb3J5O1xuICAgICAgICAgICAgICAgIHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmdbc2hvcnROYW1lXSA9IGNhdGVnb3J5O1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZm9ybURhdGE7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4dHJhY3QgcG9ydCBpbmZvcm1hdGlvbiBmcm9tIHJ1bGUgdGVtcGxhdGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJ1bGVUZW1wbGF0ZSAtIFJ1bGUgdGVtcGxhdGUgZnJvbSBhdmFpbGFibGVSdWxlcy5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIHBvcnQgaW5mb3JtYXRpb24gb2JqZWN0cy5cbiAgICAgKi9cbiAgICBleHRyYWN0UG9ydHNGcm9tVGVtcGxhdGUocnVsZVRlbXBsYXRlKSB7XG4gICAgICAgIGNvbnN0IHBvcnRzID0gW107XG5cbiAgICAgICAgaWYgKHJ1bGVUZW1wbGF0ZS5ydWxlcyAmJiBBcnJheS5pc0FycmF5KHJ1bGVUZW1wbGF0ZS5ydWxlcykpIHtcbiAgICAgICAgICAgIHJ1bGVUZW1wbGF0ZS5ydWxlcy5mb3JFYWNoKHJ1bGUgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChydWxlLnByb3RvY29sID09PSAnaWNtcCcpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogJ0lDTVAnXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocnVsZS5wb3J0ZnJvbSA9PT0gcnVsZS5wb3J0dG8pIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiBydWxlLnBvcnRmcm9tLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHJ1bGUucHJvdG9jb2wudG9VcHBlckNhc2UoKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwb3J0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlOiBgJHtydWxlLnBvcnRmcm9tfS0ke3J1bGUucG9ydHRvfWAsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogcnVsZS5wcm90b2NvbC50b1VwcGVyQ2FzZSgpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHBvcnRzO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBIVE1MIGZvciBmaXJld2FsbCBydWxlcyBiYXNlZCBvbiBBUEkgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGEgZnJvbSBBUEkuXG4gICAgICovXG4gICAgZ2VuZXJhdGVSdWxlc0hUTUwoZGF0YSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJCgnI2ZpcmV3YWxsLXJ1bGVzLWNvbnRhaW5lcicpO1xuICAgICAgICAkY29udGFpbmVyLmVtcHR5KCkucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBVc2UgbmV3IG5hbWluZzogYXZhaWxhYmxlUnVsZXMgZm9yIHRlbXBsYXRlcywgY3VycmVudFJ1bGVzIGZvciBhY3R1YWwgdmFsdWVzXG4gICAgICAgIGNvbnN0IGF2YWlsYWJsZVJ1bGVzID0gZGF0YS5hdmFpbGFibGVSdWxlcztcbiAgICAgICAgY29uc3QgY3VycmVudFJ1bGVzID0gZGF0YS5jdXJyZW50UnVsZXMgfHwge307XG5cbiAgICAgICAgaWYgKCFhdmFpbGFibGVSdWxlcykge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignTm8gYXZhaWxhYmxlIHJ1bGVzIGRhdGEgcmVjZWl2ZWQgZnJvbSBBUEknKTtcbiAgICAgICAgICAgICRjb250YWluZXIuaHRtbCgnPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiPlVuYWJsZSB0byBsb2FkIGZpcmV3YWxsIHJ1bGVzLiBQbGVhc2UgcmVmcmVzaCB0aGUgcGFnZS48L2Rpdj4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGlzRG9ja2VyID0gZGF0YS5pc0RvY2tlciB8fCBmYWxzZTtcbiAgICAgICAgY29uc3QgZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgPSBkYXRhLmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIHx8IFtdO1xuXG4gICAgICAgIC8vIEdlbmVyYXRlIEhUTUwgZm9yIGVhY2ggcnVsZVxuICAgICAgICBPYmplY3Qua2V5cyhhdmFpbGFibGVSdWxlcykuZm9yRWFjaChuYW1lID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJ1bGVUZW1wbGF0ZSA9IGF2YWlsYWJsZVJ1bGVzW25hbWVdO1xuICAgICAgICAgICAgY29uc3Qgc2hvcnROYW1lID0gcnVsZVRlbXBsYXRlLnNob3J0TmFtZSB8fCBuYW1lO1xuICAgICAgICAgICAgY29uc3QgaXNMaW1pdGVkID0gaXNEb2NrZXIgJiYgIWRvY2tlclN1cHBvcnRlZFNlcnZpY2VzLmluY2x1ZGVzKHNob3J0TmFtZSk7XG4gICAgICAgICAgICAvLyBHZXQgYWN0dWFsIHZhbHVlIGZyb20gY3VycmVudFJ1bGVzLCBkZWZhdWx0IHRvIHRlbXBsYXRlIGRlZmF1bHRcbiAgICAgICAgICAgIGNvbnN0IGlzQ2hlY2tlZCA9IGN1cnJlbnRSdWxlc1tuYW1lXSAhPT0gdW5kZWZpbmVkID8gY3VycmVudFJ1bGVzW25hbWVdIDogKHJ1bGVUZW1wbGF0ZS5hY3Rpb24gPT09ICdhbGxvdycpO1xuXG4gICAgICAgICAgICBjb25zdCBzZWdtZW50Q2xhc3MgPSBpc0xpbWl0ZWQgPyAnZG9ja2VyLWxpbWl0ZWQtc2VnbWVudCcgOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGNoZWNrYm94Q2xhc3MgPSBpc0xpbWl0ZWQgPyAnZG9ja2VyLWxpbWl0ZWQtY2hlY2tib3gnIDogJyc7XG4gICAgICAgICAgICBjb25zdCBpY29uQ2xhc3MgPSBpc0xpbWl0ZWQgPyAneWVsbG93IGV4Y2xhbWF0aW9uIHRyaWFuZ2xlJyA6ICdzbWFsbCBpbmZvIGNpcmNsZSc7XG5cbiAgICAgICAgICAgIGNvbnN0IGh0bWwgPSBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHNlZ21lbnQgJHtzZWdtZW50Q2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBydWxlcyAke2NoZWNrYm94Q2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkPVwicnVsZV8ke25hbWV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZT1cInJ1bGVfJHtuYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aXNMaW1pdGVkIHx8IGlzQ2hlY2tlZCA/ICdjaGVja2VkJyA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2lzTGltaXRlZCA/ICdkaXNhYmxlZCcgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFiaW5kZXg9XCIwXCIgY2xhc3M9XCJoaWRkZW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPVwicnVsZV8ke25hbWV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlW2Bmd18ke25hbWUudG9Mb3dlckNhc2UoKX1EZXNjcmlwdGlvbmBdIHx8IHNob3J0TmFtZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2ljb25DbGFzc30gaWNvbiBzZXJ2aWNlLWluZm8taWNvblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtc2VydmljZT1cIiR7bmFtZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWFjdGlvbj1cIiR7cnVsZVRlbXBsYXRlLmFjdGlvbn1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2lzTGltaXRlZCA/ICdkYXRhLWxpbWl0ZWQ9XCJ0cnVlXCInIDogJyd9PjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYDtcblxuICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoaHRtbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgY2hlY2tib3hlcyBmb3IgZHluYW1pY2FsbHkgYWRkZWQgZWxlbWVudHMgd2l0aCBvbkNoYW5nZSBoYW5kbGVyXG4gICAgICAgICQoJyNmaXJld2FsbC1ydWxlcy1jb250YWluZXIgLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBVSSBlbGVtZW50cy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVUlFbGVtZW50cygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjaGVja2JveGVzIChleGNsdWRpbmcgZHluYW1pY2FsbHkgYWRkZWQgcnVsZXMgd2hpY2ggYXJlIGhhbmRsZWQgaW4gZ2VuZXJhdGVSdWxlc0hUTUwpXG4gICAgICAgICQoJyNmaXJld2FsbC1mb3JtIC5jaGVja2JveCcpLm5vdCgnI2ZpcmV3YWxsLXJ1bGVzLWNvbnRhaW5lciAuY2hlY2tib3gnKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgICQoJyNmaXJld2FsbC1mb3JtIC5kcm9wZG93bicpLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dCBtYXNrIGZvciBJUHY0IG5ldHdvcmsgZmllbGQgb25seSAoSVB2NiBkb2Vzbid0IG5lZWQgaW5wdXQgbWFzaylcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImlwdjRfbmV0d29ya1wiXScpLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIC8vIEF1dG8tY2xlYXIgb3Bwb3NpdGUgcHJvdG9jb2wgZmllbGRzIHdoZW4gdXNlciB0eXBlc1xuICAgICAgICB0aGlzLnNldHVwUHJvdG9jb2xBdXRvQ2xlYXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0dXAgYXV0by1jbGVhciBsb2dpYyBmb3IgSVB2NC9JUHY2IGZpZWxkc1xuICAgICAqIFdoZW4gdXNlciB0eXBlcyBpbiBJUHY0IGZpZWxkcyAtPiBjbGVhciBJUHY2IGZpZWxkc1xuICAgICAqIFdoZW4gdXNlciB0eXBlcyBpbiBJUHY2IGZpZWxkcyAtPiBjbGVhciBJUHY0IGZpZWxkc1xuICAgICAqL1xuICAgIHNldHVwUHJvdG9jb2xBdXRvQ2xlYXIoKSB7XG4gICAgICAgIGNvbnN0ICRpcHY0TmV0d29yayA9ICQoJ2lucHV0W25hbWU9XCJpcHY0X25ldHdvcmtcIl0nKTtcbiAgICAgICAgY29uc3QgJGlwdjRTdWJuZXQgPSAkKCdzZWxlY3RbbmFtZT1cImlwdjRfc3VibmV0XCJdJyk7XG4gICAgICAgIGNvbnN0ICRpcHY2TmV0d29yayA9ICQoJ2lucHV0W25hbWU9XCJpcHY2X25ldHdvcmtcIl0nKTtcbiAgICAgICAgY29uc3QgJGlwdjZTdWJuZXQgPSAkKCdzZWxlY3RbbmFtZT1cImlwdjZfc3VibmV0XCJdJyk7XG5cbiAgICAgICAgLy8gV2hlbiB1c2VyIHR5cGVzIGluIElQdjQgbmV0d29yayBmaWVsZCAtPiBjbGVhciBJUHY2IGZpZWxkc1xuICAgICAgICAkaXB2NE5ldHdvcmsub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkaXB2NE5ldHdvcmsudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlICE9PSAnJykge1xuICAgICAgICAgICAgICAgICRpcHY2TmV0d29yay52YWwoJycpO1xuICAgICAgICAgICAgICAgICRpcHY2U3VibmV0LmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBXaGVuIHVzZXIgc2VsZWN0cyBJUHY0IHN1Ym5ldCAtPiBjbGVhciBJUHY2IGZpZWxkc1xuICAgICAgICAkaXB2NFN1Ym5ldC5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV0d29ya1ZhbHVlID0gJGlwdjROZXR3b3JrLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChuZXR3b3JrVmFsdWUgJiYgbmV0d29ya1ZhbHVlICE9PSAnJykge1xuICAgICAgICAgICAgICAgICRpcHY2TmV0d29yay52YWwoJycpO1xuICAgICAgICAgICAgICAgICRpcHY2U3VibmV0LmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBXaGVuIHVzZXIgdHlwZXMgaW4gSVB2NiBuZXR3b3JrIGZpZWxkIC0+IGNsZWFyIElQdjQgZmllbGRzXG4gICAgICAgICRpcHY2TmV0d29yay5vbignaW5wdXQnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRpcHY2TmV0d29yay52YWwoKS50cmltKCk7XG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJGlwdjROZXR3b3JrLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgJGlwdjRTdWJuZXQuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFdoZW4gdXNlciBzZWxlY3RzIElQdjYgc3VibmV0IC0+IGNsZWFyIElQdjQgZmllbGRzXG4gICAgICAgICRpcHY2U3VibmV0Lm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXR3b3JrVmFsdWUgPSAkaXB2Nk5ldHdvcmsudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKG5ldHdvcmtWYWx1ZSAmJiBuZXR3b3JrVmFsdWUgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgJGlwdjROZXR3b3JrLnZhbCgnJyk7XG4gICAgICAgICAgICAgICAgJGlwdjRTdWJuZXQuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSByZXN1bHQuZGF0YSB8fCBmaXJld2FsbC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gR2V0IElQdjQgYW5kIElQdjYgdmFsdWVzXG4gICAgICAgIGNvbnN0IGlwdjROZXR3b3JrID0gZm9ybURhdGEuaXB2NF9uZXR3b3JrIHx8ICcnO1xuICAgICAgICBjb25zdCBpcHY0U3VibmV0ID0gZm9ybURhdGEuaXB2NF9zdWJuZXQgfHwgJyc7XG4gICAgICAgIGNvbnN0IGlwdjZOZXR3b3JrID0gZm9ybURhdGEuaXB2Nl9uZXR3b3JrIHx8ICcnO1xuICAgICAgICBjb25zdCBpcHY2U3VibmV0ID0gZm9ybURhdGEuaXB2Nl9zdWJuZXQgfHwgJyc7XG5cbiAgICAgICAgLy8gVmFsaWRhdGU6IGVpdGhlciBJUHY0IE9SIElQdjYsIG5vdCBib3RoLCBub3QgbmVpdGhlclxuICAgICAgICBjb25zdCBoYXNJUHY0ID0gaXB2NE5ldHdvcmsgJiYgaXB2NE5ldHdvcmsgIT09ICcnO1xuICAgICAgICBjb25zdCBoYXNJUHY2ID0gaXB2Nk5ldHdvcmsgJiYgaXB2Nk5ldHdvcmsgIT09ICcnO1xuXG4gICAgICAgIGlmICghaGFzSVB2NCAmJiAhaGFzSVB2Nikge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5md19WYWxpZGF0ZUVpdGhlcklQdjRPcklQdjZSZXF1aXJlZCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGhhc0lQdjQgJiYgaGFzSVB2Nikge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5md19WYWxpZGF0ZU9ubHlPbmVQcm90b2NvbCk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb21iaW5lIHNlbGVjdGVkIElQdjQgb3IgSVB2NiBpbnRvIGJhY2tlbmQtY29tcGF0aWJsZSBuZXR3b3JrL3N1Ym5ldCBmb3JtYXRcbiAgICAgICAgZm9ybURhdGEubmV0d29yayA9IGhhc0lQdjQgPyBpcHY0TmV0d29yayA6IGlwdjZOZXR3b3JrO1xuICAgICAgICBmb3JtRGF0YS5zdWJuZXQgPSBoYXNJUHY0ID8gaXB2NFN1Ym5ldCA6IGlwdjZTdWJuZXQ7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHNlcGFyYXRlIElQdjQvSVB2NiBmaWVsZHMgKGJhY2tlbmQgZXhwZWN0cyB1bmlmaWVkIG5ldHdvcmsvc3VibmV0KVxuICAgICAgICBkZWxldGUgZm9ybURhdGEuaXB2NF9uZXR3b3JrO1xuICAgICAgICBkZWxldGUgZm9ybURhdGEuaXB2NF9zdWJuZXQ7XG4gICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5pcHY2X25ldHdvcms7XG4gICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5pcHY2X3N1Ym5ldDtcblxuICAgICAgICAvLyBQcmVwYXJlIGN1cnJlbnRSdWxlcyBkYXRhIGZvciBBUEkgKHNpbXBsZSBib29sZWFuIG1hcClcbiAgICAgICAgY29uc3QgY3VycmVudFJ1bGVzID0ge307XG4gICAgICAgIE9iamVjdC5rZXlzKGZvcm1EYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ3J1bGVfJykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IGtleS5yZXBsYWNlKCdydWxlXycsICcnKTtcbiAgICAgICAgICAgICAgICAvLyBTZW5kIGFzIGJvb2xlYW4gLSB0cnVlID0gYWxsb3csIGZhbHNlID0gYmxvY2tcbiAgICAgICAgICAgICAgICBjdXJyZW50UnVsZXNbY2F0ZWdvcnldID0gZm9ybURhdGFba2V5XSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBkZWxldGUgZm9ybURhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGN1cnJlbnRSdWxlcyB0byBmb3JtRGF0YVxuICAgICAgICBmb3JtRGF0YS5jdXJyZW50UnVsZXMgPSBjdXJyZW50UnVsZXM7XG5cbiAgICAgICAgLy8gbmV3ZXJfYmxvY2tfaXAgYW5kIGxvY2FsX25ldHdvcmsgYXJlIGFscmVhZHkgYm9vbGVhbiB0aGFua3MgdG8gY29udmVydENoZWNrYm94ZXNUb0Jvb2xcblxuICAgICAgICAvLyBNYXJrIGFzIG5ldyByZWNvcmQgaWYgd2UgZG9uJ3QgaGF2ZSBhbiBJRCAoZm9yIGNvcnJlY3QgUE9TVC9QVVQgc2VsZWN0aW9uKVxuICAgICAgICAvLyBUaGlzIGlzIGNyaXRpY2FsIGZvciBjcmVhdGluZyByZWNvcmRzIHdpdGggcHJlZGVmaW5lZCBJRHNcbiAgICAgICAgaWYgKCFmaXJld2FsbC5yZWNvcmRJZCB8fCBmaXJld2FsbC5yZWNvcmRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgIGZvcm1EYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICByZXN1bHQuZGF0YSA9IGZvcm1EYXRhO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZmlyZXdhbGwuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGZpcmV3YWxsLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGZpcmV3YWxsLmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmlyZXdhbGwuY2JBZnRlclNlbmRGb3JtO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG5cbiAgICAgICAgLy8gU2V0dXAgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBGaXJld2FsbEFQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS9gO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBBZGQgY2hhbmdlIGhhbmRsZXJzIGZvciBkeW5hbWljYWxseSBhZGRlZCBjaGVja2JveGVzXG4gICAgICAgIC8vIFRoaXMgbXVzdCBiZSBkb25lIEFGVEVSIEZvcm0uaW5pdGlhbGl6ZSgpIHRvIGVuc3VyZSBwcm9wZXIgdHJhY2tpbmdcbiAgICAgICAgJCgnI2ZpcmV3YWxsLXJ1bGVzLWNvbnRhaW5lciBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIGV2ZW50IGZvciBkaXJ0eSBjaGVja2luZ1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIHNlcnZpY2UgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3Igc2VydmljZSBydWxlc1xuICAgICAgICAkKCcuc2VydmljZS1pbmZvLWljb24nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3Qgc2VydmljZSA9ICRpY29uLmRhdGEoJ3NlcnZpY2UnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9ICRpY29uLmRhdGEoJ2xpbWl0ZWQnKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmluZCB0aGUgY2hlY2tib3ggZm9yIHRoaXMgc2VydmljZVxuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJGljb24uY2xvc2VzdCgnLmZpZWxkJykuZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBpbml0aWFsIGFjdGlvbiBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gJGNoZWNrYm94LnByb3AoJ2NoZWNrZWQnKSA/ICdhbGxvdycgOiAnYmxvY2snO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBpbml0aWFsIHRvb2x0aXAgY29udGVudFxuICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgY29uc3QgcG9ydEluZm8gPSB3aW5kb3cuc2VydmljZVBvcnRJbmZvW3NlcnZpY2VdIHx8IFtdO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBmaXJld2FsbFRvb2x0aXBzLmdlbmVyYXRlQ29udGVudChcbiAgICAgICAgICAgICAgICBzZXJ2aWNlLCBcbiAgICAgICAgICAgICAgICBhY3Rpb24sIFxuICAgICAgICAgICAgICAgIG5ldHdvcmssIFxuICAgICAgICAgICAgICAgIHdpbmRvdy5pc0RvY2tlciwgXG4gICAgICAgICAgICAgICAgaXNMaW1pdGVkLCBcbiAgICAgICAgICAgICAgICBwb3J0SW5mbywgXG4gICAgICAgICAgICAgICAgaXNMaW1pdGVkICYmIHdpbmRvdy5pc0RvY2tlciAvLyBTaG93IGNvcHkgYnV0dG9uIG9ubHkgZm9yIERvY2tlciBsaW1pdGVkIHNlcnZpY2VzXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBcbiAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMuaW5pdGlhbGl6ZVRvb2x0aXAoJGljb24sIHtcbiAgICAgICAgICAgICAgICBodG1sOiB0b29sdGlwQ29udGVudCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSByZWZlcmVuY2UgdG8gaWNvbiBvbiBjaGVja2JveCBmb3IgdXBkYXRlc1xuICAgICAgICAgICAgJGNoZWNrYm94LmRhdGEoJ3Rvb2x0aXBJY29uJywgJGljb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIHNwZWNpYWwgY2hlY2tib3hlc1xuICAgICAgICAkKCcuc3BlY2lhbC1jaGVja2JveC1pbmZvJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSAkaWNvbi5kYXRhKCd0eXBlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIGNoZWNrYm94IGZvciB0aGlzIHR5cGVcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICRpY29uLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoYGlucHV0W25hbWU9XCIke3R5cGV9XCJdYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBpbml0aWFsIHN0YXRlXG4gICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpO1xuICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBpbml0aWFsIHRvb2x0aXAgY29udGVudFxuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBmaXJld2FsbFRvb2x0aXBzLmdlbmVyYXRlU3BlY2lhbENoZWNrYm94Q29udGVudChcbiAgICAgICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgICAgIG5ldHdvcmssXG4gICAgICAgICAgICAgICAgaXNDaGVja2VkXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXAgd2l0aCBjb21wYWN0IHdpZHRoIGZvciBzcGVjaWFsIGNoZWNrYm94ZXNcbiAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMuaW5pdGlhbGl6ZVRvb2x0aXAoJGljb24sIHtcbiAgICAgICAgICAgICAgICBodG1sOiB0b29sdGlwQ29udGVudCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAndmVyeSB3aWRlJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIHJlZmVyZW5jZSB0byBpY29uIG9uIGNoZWNrYm94IGZvciB1cGRhdGVzXG4gICAgICAgICAgICAkY2hlY2tib3guZGF0YSgnc3BlY2lhbFRvb2x0aXBJY29uJywgJGljb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbiBmb3IgY2hlY2tib3ggY2hhbmdlcyB0byB1cGRhdGUgdG9vbHRpcHMgKHVzZSBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGVsZW1lbnRzKVxuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybScpLm9uKCdjaGFuZ2UnLCAnLnJ1bGVzIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJGNoZWNrYm94LmRhdGEoJ3Rvb2x0aXBJY29uJyk7XG4gICAgICAgICAgICBjb25zdCAkc3BlY2lhbEljb24gPSAkY2hlY2tib3guZGF0YSgnc3BlY2lhbFRvb2x0aXBJY29uJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkaWNvbiAmJiAkaWNvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZXJ2aWNlID0gJGljb24uZGF0YSgnc2VydmljZScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9ICRpY29uLmRhdGEoJ2xpbWl0ZWQnKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb24gPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpID8gJ2FsbG93JyA6ICdibG9jayc7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBvcnRJbmZvID0gd2luZG93LnNlcnZpY2VQb3J0SW5mb1tzZXJ2aWNlXSB8fCBbXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBuZXcgdG9vbHRpcCBjb250ZW50XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVDb250ZW50KFxuICAgICAgICAgICAgICAgICAgICBzZXJ2aWNlLCBcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgbmV0d29yaywgXG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5pc0RvY2tlciwgXG4gICAgICAgICAgICAgICAgICAgIGlzTGltaXRlZCwgXG4gICAgICAgICAgICAgICAgICAgIHBvcnRJbmZvLCBcbiAgICAgICAgICAgICAgICAgICAgaXNMaW1pdGVkICYmIHdpbmRvdy5pc0RvY2tlclxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRvb2x0aXBzLnVwZGF0ZUNvbnRlbnQoJGljb24sIG5ld0NvbnRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJHNwZWNpYWxJY29uICYmICRzcGVjaWFsSWNvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gJHNwZWNpYWxJY29uLmRhdGEoJ3R5cGUnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSBgJHt3aW5kb3cuY3VycmVudE5ldHdvcmt9LyR7d2luZG93LmN1cnJlbnRTdWJuZXR9YDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBuZXcgdG9vbHRpcCBjb250ZW50XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVTcGVjaWFsQ2hlY2tib3hDb250ZW50KFxuICAgICAgICAgICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgICAgICAgICBuZXR3b3JrLFxuICAgICAgICAgICAgICAgICAgICBpc0NoZWNrZWRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0b29sdGlwIHdpdGggY29tcGFjdCB3aWR0aFxuICAgICAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMudXBkYXRlQ29udGVudCgkc3BlY2lhbEljb24sIG5ld0NvbnRlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICd2ZXJ5IHdpZGUnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEb2NrZXIgbGltaXRlZCBjaGVja2JveGVzIC0gcHJldmVudCB0aGVtIGZyb20gYmVpbmcgdG9nZ2xlZFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEb2NrZXJMaW1pdGVkQ2hlY2tib3hlcygpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaXNEb2NrZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCgnLmRvY2tlci1saW1pdGVkLWNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEVuc3VyZSBjaGVja2JveCBpcyBhbHdheXMgY2hlY2tlZFxuICAgICAgICAgICAgJGlucHV0LnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIHZpc3VhbCBkaXNhYmxlZCBzdGF0ZVxuICAgICAgICAgICAgJGNoZWNrYm94LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IGNsaWNrIGV2ZW50c1xuICAgICAgICAgICAgJGNoZWNrYm94Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTaG93IGEgdGVtcG9yYXJ5IG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkY2hlY2tib3guZmluZCgnbGFiZWwnKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkaWNvbiA9ICRsYWJlbC5maW5kKCcuc2VydmljZS1pbmZvLWljb24nKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSB0b29sdGlwIHRvIHNob3dcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IGNoZWNrYm94IHN0YXRlIGNoYW5nZXNcbiAgICAgICAgICAgICRpbnB1dC5vbignY2hhbmdlJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLy8gQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIHRvIGNoZWNrIGlmIGEgc3RyaW5nIGlzIGEgdmFsaWQgSVAgYWRkcmVzc1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT09IG51bGwpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSBmW2ldO1xuICAgICAgICAgICAgaWYgKGEgPiAyNTUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZls1XSA+IDMyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgZmlyZXdhbGwgZm9ybSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGZpcmV3YWxsLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=