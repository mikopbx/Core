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

    var network = data.network || '0.0.0.0';
    var subnet = data.subnet || '0';

    if (!data.id && firewall.urlParameters.network) {
      network = firewall.urlParameters.network;
      subnet = firewall.urlParameters.subnet || '0'; // Override description with ruleName from URL if provided

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1tb2RpZnkuanMiXSwibmFtZXMiOlsiZmlyZXdhbGwiLCIkZm9ybU9iaiIsIiQiLCJyZWNvcmRJZCIsImZpcmV3YWxsRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJpcHY0X25ldHdvcmsiLCJpZGVudGlmaWVyIiwib3B0aW9uYWwiLCJydWxlcyIsInR5cGUiLCJ2YWx1ZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X1ZhbGlkYXRlSVB2NEFkZHJlc3MiLCJpcHY2X25ldHdvcmsiLCJmd19WYWxpZGF0ZUlQdjZBZGRyZXNzIiwiZGVzY3JpcHRpb24iLCJmd19WYWxpZGF0ZVJ1bGVOYW1lIiwiaW5pdGlhbGl6ZSIsIndpbmRvdyIsInNlcnZpY2VQb3J0SW5mbyIsInNlcnZpY2VOYW1lTWFwcGluZyIsImlzRG9ja2VyIiwiZG9ja2VyU3VwcG9ydGVkU2VydmljZXMiLCJjdXJyZW50TmV0d29yayIsImN1cnJlbnRTdWJuZXQiLCJ1cmxQYXJ0cyIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJzcGxpdCIsImxhc3RTZWdtZW50IiwibGVuZ3RoIiwidXJsUGFyYW1ldGVycyIsImdldFVybFBhcmFtZXRlcnMiLCJpbml0aWFsaXplRm9ybSIsImxvYWRGaXJld2FsbERhdGEiLCJwYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJuZXR3b3JrIiwiZ2V0Iiwic3VibmV0IiwicnVsZU5hbWUiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlc3VsdCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZndfRXJyb3JMb2FkaW5nUmVjb3JkIiwiZGF0YSIsImdlbmVyYXRlUnVsZXNIVE1MIiwiZm9ybURhdGEiLCJwcmVwYXJlRm9ybURhdGEiLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwicG9wdWxhdGVkRGF0YSIsImluaXRpYWxpemVVSUVsZW1lbnRzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZURvY2tlckxpbWl0ZWRDaGVja2JveGVzIiwiaXNJUHY2QWRkcmVzcyIsImFkZHJlc3MiLCJpbmNsdWRlcyIsImlkIiwibmV3ZXJfYmxvY2tfaXAiLCJsb2NhbF9uZXR3b3JrIiwiaXNJUHY2IiwiaXB2Nl9zdWJuZXQiLCJpcHY0X3N1Ym5ldCIsImN1cnJlbnRSdWxlcyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwiY2F0ZWdvcnkiLCJhdmFpbGFibGVSdWxlcyIsInJ1bGVUZW1wbGF0ZSIsImV4dHJhY3RQb3J0c0Zyb21UZW1wbGF0ZSIsInNob3J0TmFtZSIsInBvcnRzIiwiQXJyYXkiLCJpc0FycmF5IiwicnVsZSIsInByb3RvY29sIiwicHVzaCIsInBvcnRmcm9tIiwicG9ydHRvIiwicG9ydCIsInRvVXBwZXJDYXNlIiwicmFuZ2UiLCIkY29udGFpbmVyIiwiZW1wdHkiLCJjb25zb2xlIiwiZXJyb3IiLCJodG1sIiwibmFtZSIsImlzTGltaXRlZCIsImlzQ2hlY2tlZCIsInVuZGVmaW5lZCIsImFjdGlvbiIsInNlZ21lbnRDbGFzcyIsImNoZWNrYm94Q2xhc3MiLCJpY29uQ2xhc3MiLCJ0b0xvd2VyQ2FzZSIsImFwcGVuZCIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJkYXRhQ2hhbmdlZCIsIm5vdCIsImRyb3Bkb3duIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJzZXR1cFByb3RvY29sQXV0b0NsZWFyIiwiJGlwdjROZXR3b3JrIiwiJGlwdjRTdWJuZXQiLCIkaXB2Nk5ldHdvcmsiLCIkaXB2NlN1Ym5ldCIsIm9uIiwidmFsIiwidHJpbSIsIm5ldHdvcmtWYWx1ZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImZvcm0iLCJpcHY0TmV0d29yayIsImlwdjRTdWJuZXQiLCJpcHY2TmV0d29yayIsImlwdjZTdWJuZXQiLCJoYXNJUHY0IiwiaGFzSVB2NiIsImZ3X1ZhbGlkYXRlRWl0aGVySVB2NE9ySVB2NlJlcXVpcmVkIiwiZndfVmFsaWRhdGVPbmx5T25lUHJvdG9jb2wiLCJrZXkiLCJzdGFydHNXaXRoIiwicmVwbGFjZSIsIl9pc05ldyIsImNiQWZ0ZXJTZW5kRm9ybSIsInVybCIsImNvbnZlcnRDaGVja2JveGVzVG9Cb29sIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJzZWxmIiwiZWFjaCIsIiRpY29uIiwic2VydmljZSIsIiRjaGVja2JveCIsImNsb3Nlc3QiLCJmaW5kIiwicHJvcCIsInBvcnRJbmZvIiwidG9vbHRpcENvbnRlbnQiLCJmaXJld2FsbFRvb2x0aXBzIiwiZ2VuZXJhdGVDb250ZW50IiwiaW5pdGlhbGl6ZVRvb2x0aXAiLCJwb3NpdGlvbiIsImdlbmVyYXRlU3BlY2lhbENoZWNrYm94Q29udGVudCIsInZhcmlhdGlvbiIsIiRzcGVjaWFsSWNvbiIsIm5ld0NvbnRlbnQiLCJ1cGRhdGVDb250ZW50IiwiJGlucHV0IiwiZSIsInByZXZlbnREZWZhdWx0Iiwic3RvcFByb3BhZ2F0aW9uIiwiJGxhYmVsIiwicG9wdXAiLCJmbiIsImlwYWRkciIsImYiLCJtYXRjaCIsImkiLCJhIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEU7O0FBT2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLEVBWEc7O0FBYWI7QUFD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QUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0gsR0FGRCxNQUVPO0FBQ0gsU0FBSyxJQUFJaUksQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBRyxDQUFwQixFQUF1QkEsQ0FBQyxJQUFJLENBQTVCLEVBQStCO0FBQzNCLFVBQU1DLENBQUMsR0FBR0gsQ0FBQyxDQUFDRSxDQUFELENBQVg7O0FBQ0EsVUFBSUMsQ0FBQyxHQUFHLEdBQVIsRUFBYTtBQUNUbEksUUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSDtBQUNKOztBQUNELFFBQUkrSCxDQUFDLENBQUMsQ0FBRCxDQUFELEdBQU8sRUFBWCxFQUFlO0FBQ1gvSCxNQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNIO0FBQ0o7O0FBQ0QsU0FBT0EsTUFBUDtBQUNILENBakJELEMsQ0FtQkE7OztBQUNBL0MsQ0FBQyxDQUFDa0wsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnJMLEVBQUFBLFFBQVEsQ0FBQ21CLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBmaXJld2FsbFRvb2x0aXBzLCBGaXJld2FsbEFQSSwgRm9ybUVsZW1lbnRzLCBVc2VyTWVzc2FnZSAqL1xuXG4vKipcbiAqIFRoZSBmaXJld2FsbCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmlyZXdhbGwgZm9ybVxuICpcbiAqIEBtb2R1bGUgZmlyZXdhbGxcbiAqL1xuY29uc3QgZmlyZXdhbGwgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2ZpcmV3YWxsLWZvcm0nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGaXJld2FsbCByZWNvcmQgSUQuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICByZWNvcmRJZDogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogRmlyZXdhbGwgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGZpcmV3YWxsRGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBpcHY0X25ldHdvcms6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdpcHY0X25ldHdvcmsnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIC8vIFN0cmljdCBJUHY0OiBlYWNoIG9jdGV0IDAtMjU1XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAvXigyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pXFwuKDI1WzAtNV18MlswLTRdWzAtOV18WzAxXT9bMC05XVswLTldPylcXC4oMjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KVxcLigyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pJC8sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlSVB2NEFkZHJlc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGlwdjZfbmV0d29yazoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2lwdjZfbmV0d29yaycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RyaWN0IElQdjY6IFJGQyA0MjkxIGNvbXBsaWFudCAoYWxsIHN0YW5kYXJkIG5vdGF0aW9ucyBpbmNsdWRpbmcgY29tcHJlc3NlZCA6OilcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IC9eKChbMC05YS1mQS1GXXsxLDR9Oil7N31bMC05YS1mQS1GXXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw3fTp8KFswLTlhLWZBLUZdezEsNH06KXsxLDZ9OlswLTlhLWZBLUZdezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDV9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDJ9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw0fSg6WzAtOWEtZkEtRl17MSw0fSl7MSwzfXwoWzAtOWEtZkEtRl17MSw0fTopezEsM30oOlswLTlhLWZBLUZdezEsNH0pezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDJ9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDV9fFswLTlhLWZBLUZdezEsNH06KCg6WzAtOWEtZkEtRl17MSw0fSl7MSw2fSl8OigoOlswLTlhLWZBLUZdezEsNH0pezEsN318OikpJC8sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlSVB2NkFkZHJlc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGRlc2NyaXB0aW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZGVzY3JpcHRpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlUnVsZU5hbWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIEluaXRpYWxpemF0aW9uIGZ1bmN0aW9uIHRvIHNldCB1cCBmb3JtIGJlaGF2aW9yXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBnbG9iYWwgdmFyaWFibGVzIGZvciB0b29sdGlwcyBhbmQgRG9ja2VyIGRldGVjdGlvblxuICAgICAgICAvLyBUaGVzZSB3aWxsIGJlIHVwZGF0ZWQgd2hlbiBkYXRhIGlzIGxvYWRlZCBmcm9tIEFQSVxuICAgICAgICB3aW5kb3cuc2VydmljZVBvcnRJbmZvID0ge307XG4gICAgICAgIHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmcgPSB7fTtcbiAgICAgICAgd2luZG93LmlzRG9ja2VyID0gZmFsc2U7XG4gICAgICAgIHdpbmRvdy5kb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcyA9IFtdO1xuICAgICAgICB3aW5kb3cuY3VycmVudE5ldHdvcmsgPSAnJztcbiAgICAgICAgd2luZG93LmN1cnJlbnRTdWJuZXQgPSAnJztcblxuICAgICAgICAvLyBHZXQgcmVjb3JkIElEIGZyb20gVVJMIG9yIGZvcm1cbiAgICAgICAgY29uc3QgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgY29uc3QgbGFzdFNlZ21lbnQgPSB1cmxQYXJ0c1t1cmxQYXJ0cy5sZW5ndGggLSAxXSB8fCAnJztcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgbGFzdCBzZWdtZW50IGlzICdtb2RpZnknIChuZXcgcmVjb3JkKSBvciBhbiBhY3R1YWwgSURcbiAgICAgICAgaWYgKGxhc3RTZWdtZW50ID09PSAnbW9kaWZ5JyB8fCBsYXN0U2VnbWVudCA9PT0gJycpIHtcbiAgICAgICAgICAgIGZpcmV3YWxsLnJlY29yZElkID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaXJld2FsbC5yZWNvcmRJZCA9IGxhc3RTZWdtZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVhZCBVUkwgcGFyYW1ldGVycyBmb3IgcHJlZmlsbGluZyAoZS5nLiwgP25ldHdvcms9MC4wLjAuMCZzdWJuZXQ9MClcbiAgICAgICAgZmlyZXdhbGwudXJsUGFyYW1ldGVycyA9IGZpcmV3YWxsLmdldFVybFBhcmFtZXRlcnMoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gQkVGT1JFIGxvYWRpbmcgZGF0YSAobGlrZSBleHRlbnNpb24tbW9kaWZ5LmpzIHBhdHRlcm4pXG4gICAgICAgIGZpcmV3YWxsLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gQVBJXG4gICAgICAgIGZpcmV3YWxsLmxvYWRGaXJld2FsbERhdGEoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IFVSTCBwYXJhbWV0ZXJzIGZvciBwcmVmaWxsaW5nIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGggbmV0d29yaywgc3VibmV0LCBhbmQgcnVsZU5hbWUgcGFyYW1ldGVyc1xuICAgICAqL1xuICAgIGdldFVybFBhcmFtZXRlcnMoKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuZXR3b3JrOiBwYXJhbXMuZ2V0KCduZXR3b3JrJykgfHwgJycsXG4gICAgICAgICAgICBzdWJuZXQ6IHBhcmFtcy5nZXQoJ3N1Ym5ldCcpIHx8ICcnLFxuICAgICAgICAgICAgcnVsZU5hbWU6IHBhcmFtcy5nZXQoJ3J1bGVOYW1lJykgfHwgJydcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmaXJld2FsbCBkYXRhIGZyb20gQVBJLlxuICAgICAqIFVuaWZpZWQgbWV0aG9kIGZvciBib3RoIG5ldyBhbmQgZXhpc3RpbmcgcmVjb3Jkcy5cbiAgICAgKiBBUEkgcmV0dXJucyBkZWZhdWx0cyBmb3IgbmV3IHJlY29yZHMgd2hlbiBJRCBpcyBlbXB0eS5cbiAgICAgKi9cbiAgICBsb2FkRmlyZXdhbGxEYXRhKCkge1xuICAgICAgICBmaXJld2FsbC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIEFsd2F5cyBjYWxsIEFQSSAtIGl0IHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzICh3aGVuIElEIGlzIGVtcHR5KVxuICAgICAgICBGaXJld2FsbEFQSS5nZXRSZWNvcmQoZmlyZXdhbGwucmVjb3JkSWQgfHwgJycsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgZmlyZXdhbGwuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZndfRXJyb3JMb2FkaW5nUmVjb3JkKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZpcmV3YWxsLmZpcmV3YWxsRGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgIC8vIEdlbmVyYXRlIGR5bmFtaWMgcnVsZXMgSFRNTCBmaXJzdFxuICAgICAgICAgICAgZmlyZXdhbGwuZ2VuZXJhdGVSdWxlc0hUTUwocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFByZXBhcmUgZGF0YSBmb3IgZm9ybSBwb3B1bGF0aW9uXG4gICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IGZpcmV3YWxsLnByZXBhcmVGb3JtRGF0YShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgLy8gVXNlIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKSBsaWtlIGV4dGVuc2lvbi1tb2RpZnkuanMgcGF0dGVyblxuICAgICAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShmb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChwb3B1bGF0ZWREYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgVUkgZWxlbWVudHMgQUZURVIgZm9ybSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICAgICAgZmlyZXdhbGwuaW5pdGlhbGl6ZVVJRWxlbWVudHMoKTtcbiAgICAgICAgICAgICAgICAgICAgZmlyZXdhbGwuaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG4gICAgICAgICAgICAgICAgICAgIGZpcmV3YWxsLmluaXRpYWxpemVEb2NrZXJMaW1pdGVkQ2hlY2tib3hlcygpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB3aW5kb3cgdmFyaWFibGVzIGZvciB0b29sdGlwc1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuY3VycmVudE5ldHdvcmsgPSByZXNwb25zZS5kYXRhLm5ldHdvcms7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5jdXJyZW50U3VibmV0ID0gcmVzcG9uc2UuZGF0YS5zdWJuZXQ7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5pc0RvY2tlciA9IHJlc3BvbnNlLmRhdGEuaXNEb2NrZXIgfHwgZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5kb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcyA9IHJlc3BvbnNlLmRhdGEuZG9ja2VyU3VwcG9ydGVkU2VydmljZXMgfHwgW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgYWRkcmVzcyBpcyBJUHY2LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhZGRyZXNzIC0gSVAgYWRkcmVzcyB0byBjaGVjay5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBJUHY2LCBmYWxzZSBpZiBJUHY0LlxuICAgICAqL1xuICAgIGlzSVB2NkFkZHJlc3MoYWRkcmVzcykge1xuICAgICAgICAvLyBJUHY2IGNvbnRhaW5zIGNvbG9uc1xuICAgICAgICByZXR1cm4gYWRkcmVzcyAmJiBhZGRyZXNzLmluY2x1ZGVzKCc6Jyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFByZXBhcmUgZm9ybSBkYXRhIGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICogQ29udmVydHMgQVBJIGZpZWxkcyB0byBmb3JtIGZpZWxkIG5hbWVzIChuZXR3b3JrL3N1Ym5ldCAtPiBpcHY0L2lwdjYgZmllbGRzKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gQVBJIHJlc3BvbnNlIGRhdGFcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBGb3JtIGRhdGEgcmVhZHkgZm9yIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoKVxuICAgICAqL1xuICAgIHByZXBhcmVGb3JtRGF0YShkYXRhKSB7XG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0ge1xuICAgICAgICAgICAgaWQ6IGRhdGEuaWQgfHwgJycsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZGF0YS5kZXNjcmlwdGlvbiB8fCAnJyxcbiAgICAgICAgICAgIG5ld2VyX2Jsb2NrX2lwOiBkYXRhLm5ld2VyX2Jsb2NrX2lwID09PSB0cnVlLFxuICAgICAgICAgICAgbG9jYWxfbmV0d29yazogZGF0YS5sb2NhbF9uZXR3b3JrID09PSB0cnVlXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBvdmVycmlkZSBuZXR3b3JrL3N1Ym5ldC9kZXNjcmlwdGlvbiB3aXRoIFVSTCBwYXJhbWV0ZXJzIGlmIHByb3ZpZGVkXG4gICAgICAgIGxldCBuZXR3b3JrID0gZGF0YS5uZXR3b3JrIHx8ICcwLjAuMC4wJztcbiAgICAgICAgbGV0IHN1Ym5ldCA9IGRhdGEuc3VibmV0IHx8ICcwJztcblxuICAgICAgICBpZiAoIWRhdGEuaWQgJiYgZmlyZXdhbGwudXJsUGFyYW1ldGVycy5uZXR3b3JrKSB7XG4gICAgICAgICAgICBuZXR3b3JrID0gZmlyZXdhbGwudXJsUGFyYW1ldGVycy5uZXR3b3JrO1xuICAgICAgICAgICAgc3VibmV0ID0gZmlyZXdhbGwudXJsUGFyYW1ldGVycy5zdWJuZXQgfHwgJzAnO1xuXG4gICAgICAgICAgICAvLyBPdmVycmlkZSBkZXNjcmlwdGlvbiB3aXRoIHJ1bGVOYW1lIGZyb20gVVJMIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAoZmlyZXdhbGwudXJsUGFyYW1ldGVycy5ydWxlTmFtZSkge1xuICAgICAgICAgICAgICAgIGZvcm1EYXRhLmRlc2NyaXB0aW9uID0gZmlyZXdhbGwudXJsUGFyYW1ldGVycy5ydWxlTmFtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERldGVjdCBJUCB2ZXJzaW9uIGFuZCBwb3B1bGF0ZSBhcHByb3ByaWF0ZSBmaWVsZHNcbiAgICAgICAgY29uc3QgaXNJUHY2ID0gZmlyZXdhbGwuaXNJUHY2QWRkcmVzcyhuZXR3b3JrKTtcblxuICAgICAgICBpZiAoaXNJUHY2KSB7XG4gICAgICAgICAgICAvLyBJUHY2IGRhdGFcbiAgICAgICAgICAgIGZvcm1EYXRhLmlwdjZfbmV0d29yayA9IG5ldHdvcms7XG4gICAgICAgICAgICBmb3JtRGF0YS5pcHY2X3N1Ym5ldCA9IHN1Ym5ldDtcbiAgICAgICAgICAgIGZvcm1EYXRhLmlwdjRfbmV0d29yayA9ICcnO1xuICAgICAgICAgICAgZm9ybURhdGEuaXB2NF9zdWJuZXQgPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIElQdjQgZGF0YVxuICAgICAgICAgICAgZm9ybURhdGEuaXB2NF9uZXR3b3JrID0gbmV0d29yaztcbiAgICAgICAgICAgIGZvcm1EYXRhLmlwdjRfc3VibmV0ID0gc3VibmV0O1xuICAgICAgICAgICAgZm9ybURhdGEuaXB2Nl9uZXR3b3JrID0gJyc7XG4gICAgICAgICAgICBmb3JtRGF0YS5pcHY2X3N1Ym5ldCA9ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHJ1bGUgY2hlY2tib3hlcyBmcm9tIGN1cnJlbnRSdWxlc1xuICAgICAgICBpZiAoZGF0YS5jdXJyZW50UnVsZXMgJiYgdHlwZW9mIGRhdGEuY3VycmVudFJ1bGVzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5jdXJyZW50UnVsZXMpLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgICAgIGZvcm1EYXRhW2BydWxlXyR7Y2F0ZWdvcnl9YF0gPSBkYXRhLmN1cnJlbnRSdWxlc1tjYXRlZ29yeV0gPT09IHRydWU7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIHNlcnZpY2UgcG9ydCBpbmZvIGFuZCBuYW1lIG1hcHBpbmcgZnJvbSBhdmFpbGFibGVSdWxlc1xuICAgICAgICB3aW5kb3cuc2VydmljZVBvcnRJbmZvID0ge307XG4gICAgICAgIHdpbmRvdy5zZXJ2aWNlTmFtZU1hcHBpbmcgPSB7fTtcbiAgICAgICAgaWYgKGRhdGEuYXZhaWxhYmxlUnVsZXMgJiYgdHlwZW9mIGRhdGEuYXZhaWxhYmxlUnVsZXMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLmF2YWlsYWJsZVJ1bGVzKS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBydWxlVGVtcGxhdGUgPSBkYXRhLmF2YWlsYWJsZVJ1bGVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IHBvcnQgaW5mbyBmcm9tIHJ1bGUgdGVtcGxhdGVcbiAgICAgICAgICAgICAgICB3aW5kb3cuc2VydmljZVBvcnRJbmZvW2NhdGVnb3J5XSA9IGZpcmV3YWxsLmV4dHJhY3RQb3J0c0Zyb21UZW1wbGF0ZShydWxlVGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgIC8vIE1hcCBkaXNwbGF5IG5hbWUgdG8gY2F0ZWdvcnkga2V5XG4gICAgICAgICAgICAgICAgY29uc3Qgc2hvcnROYW1lID0gcnVsZVRlbXBsYXRlLnNob3J0TmFtZSB8fCBjYXRlZ29yeTtcbiAgICAgICAgICAgICAgICB3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nW3Nob3J0TmFtZV0gPSBjYXRlZ29yeTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZvcm1EYXRhO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0IHBvcnQgaW5mb3JtYXRpb24gZnJvbSBydWxlIHRlbXBsYXRlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBydWxlVGVtcGxhdGUgLSBSdWxlIHRlbXBsYXRlIGZyb20gYXZhaWxhYmxlUnVsZXMuXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBwb3J0IGluZm9ybWF0aW9uIG9iamVjdHMuXG4gICAgICovXG4gICAgZXh0cmFjdFBvcnRzRnJvbVRlbXBsYXRlKHJ1bGVUZW1wbGF0ZSkge1xuICAgICAgICBjb25zdCBwb3J0cyA9IFtdO1xuXG4gICAgICAgIGlmIChydWxlVGVtcGxhdGUucnVsZXMgJiYgQXJyYXkuaXNBcnJheShydWxlVGVtcGxhdGUucnVsZXMpKSB7XG4gICAgICAgICAgICBydWxlVGVtcGxhdGUucnVsZXMuZm9yRWFjaChydWxlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocnVsZS5wcm90b2NvbCA9PT0gJ2ljbXAnKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6ICdJQ01QJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJ1bGUucG9ydGZyb20gPT09IHJ1bGUucG9ydHRvKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogcnVsZS5wb3J0ZnJvbSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiBydWxlLnByb3RvY29sLnRvVXBwZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogYCR7cnVsZS5wb3J0ZnJvbX0tJHtydWxlLnBvcnR0b31gLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHJ1bGUucHJvdG9jb2wudG9VcHBlckNhc2UoKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwb3J0cztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgSFRNTCBmb3IgZmlyZXdhbGwgcnVsZXMgYmFzZWQgb24gQVBJIGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaXJld2FsbCBkYXRhIGZyb20gQVBJLlxuICAgICAqL1xuICAgIGdlbmVyYXRlUnVsZXNIVE1MKGRhdGEpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICQoJyNmaXJld2FsbC1ydWxlcy1jb250YWluZXInKTtcbiAgICAgICAgJGNvbnRhaW5lci5lbXB0eSgpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gVXNlIG5ldyBuYW1pbmc6IGF2YWlsYWJsZVJ1bGVzIGZvciB0ZW1wbGF0ZXMsIGN1cnJlbnRSdWxlcyBmb3IgYWN0dWFsIHZhbHVlc1xuICAgICAgICBjb25zdCBhdmFpbGFibGVSdWxlcyA9IGRhdGEuYXZhaWxhYmxlUnVsZXM7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRSdWxlcyA9IGRhdGEuY3VycmVudFJ1bGVzIHx8IHt9O1xuXG4gICAgICAgIGlmICghYXZhaWxhYmxlUnVsZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ05vIGF2YWlsYWJsZSBydWxlcyBkYXRhIHJlY2VpdmVkIGZyb20gQVBJJyk7XG4gICAgICAgICAgICAkY29udGFpbmVyLmh0bWwoJzxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIj5VbmFibGUgdG8gbG9hZCBmaXJld2FsbCBydWxlcy4gUGxlYXNlIHJlZnJlc2ggdGhlIHBhZ2UuPC9kaXY+Jyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpc0RvY2tlciA9IGRhdGEuaXNEb2NrZXIgfHwgZmFsc2U7XG4gICAgICAgIGNvbnN0IGRvY2tlclN1cHBvcnRlZFNlcnZpY2VzID0gZGF0YS5kb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcyB8fCBbXTtcblxuICAgICAgICAvLyBHZW5lcmF0ZSBIVE1MIGZvciBlYWNoIHJ1bGVcbiAgICAgICAgT2JqZWN0LmtleXMoYXZhaWxhYmxlUnVsZXMpLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBydWxlVGVtcGxhdGUgPSBhdmFpbGFibGVSdWxlc1tuYW1lXTtcbiAgICAgICAgICAgIGNvbnN0IHNob3J0TmFtZSA9IHJ1bGVUZW1wbGF0ZS5zaG9ydE5hbWUgfHwgbmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9IGlzRG9ja2VyICYmICFkb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcy5pbmNsdWRlcyhzaG9ydE5hbWUpO1xuICAgICAgICAgICAgLy8gR2V0IGFjdHVhbCB2YWx1ZSBmcm9tIGN1cnJlbnRSdWxlcywgZGVmYXVsdCB0byB0ZW1wbGF0ZSBkZWZhdWx0XG4gICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBjdXJyZW50UnVsZXNbbmFtZV0gIT09IHVuZGVmaW5lZCA/IGN1cnJlbnRSdWxlc1tuYW1lXSA6IChydWxlVGVtcGxhdGUuYWN0aW9uID09PSAnYWxsb3cnKTtcblxuICAgICAgICAgICAgY29uc3Qgc2VnbWVudENsYXNzID0gaXNMaW1pdGVkID8gJ2RvY2tlci1saW1pdGVkLXNlZ21lbnQnIDogJyc7XG4gICAgICAgICAgICBjb25zdCBjaGVja2JveENsYXNzID0gaXNMaW1pdGVkID8gJ2RvY2tlci1saW1pdGVkLWNoZWNrYm94JyA6ICcnO1xuICAgICAgICAgICAgY29uc3QgaWNvbkNsYXNzID0gaXNMaW1pdGVkID8gJ3llbGxvdyBleGNsYW1hdGlvbiB0cmlhbmdsZScgOiAnc21hbGwgaW5mbyBjaXJjbGUnO1xuXG4gICAgICAgICAgICBjb25zdCBodG1sID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50ICR7c2VnbWVudENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggcnVsZXMgJHtjaGVja2JveENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZD1cInJ1bGVfJHtuYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJydWxlXyR7bmFtZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2lzTGltaXRlZCB8fCBpc0NoZWNrZWQgPyAnY2hlY2tlZCcgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0xpbWl0ZWQgPyAnZGlzYWJsZWQnIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmluZGV4PVwiMFwiIGNsYXNzPVwiaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj1cInJ1bGVfJHtuYW1lfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZVtgZndfJHtuYW1lLnRvTG93ZXJDYXNlKCl9RGVzY3JpcHRpb25gXSB8fCBzaG9ydE5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtpY29uQ2xhc3N9IGljb24gc2VydmljZS1pbmZvLWljb25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXNlcnZpY2U9XCIke25hbWV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1hY3Rpb249XCIke3J1bGVUZW1wbGF0ZS5hY3Rpb259XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0xpbWl0ZWQgPyAnZGF0YS1saW1pdGVkPVwidHJ1ZVwiJyA6ICcnfT48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG5cbiAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGh0bWwpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGNoZWNrYm94ZXMgZm9yIGR5bmFtaWNhbGx5IGFkZGVkIGVsZW1lbnRzIHdpdGggb25DaGFuZ2UgaGFuZGxlclxuICAgICAgICAkKCcjZmlyZXdhbGwtcnVsZXMtY29udGFpbmVyIC5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVUkgZWxlbWVudHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJRWxlbWVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlcyAoZXhjbHVkaW5nIGR5bmFtaWNhbGx5IGFkZGVkIHJ1bGVzIHdoaWNoIGFyZSBoYW5kbGVkIGluIGdlbmVyYXRlUnVsZXNIVE1MKVxuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybSAuY2hlY2tib3gnKS5ub3QoJyNmaXJld2FsbC1ydWxlcy1jb250YWluZXIgLmNoZWNrYm94JykuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybSAuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW5wdXQgbWFzayBmb3IgSVB2NCBuZXR3b3JrIGZpZWxkIG9ubHkgKElQdjYgZG9lc24ndCBuZWVkIGlucHV0IG1hc2spXG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJpcHY0X25ldHdvcmtcIl0nKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICAvLyBBdXRvLWNsZWFyIG9wcG9zaXRlIHByb3RvY29sIGZpZWxkcyB3aGVuIHVzZXIgdHlwZXNcbiAgICAgICAgdGhpcy5zZXR1cFByb3RvY29sQXV0b0NsZWFyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldHVwIGF1dG8tY2xlYXIgbG9naWMgZm9yIElQdjQvSVB2NiBmaWVsZHNcbiAgICAgKiBXaGVuIHVzZXIgdHlwZXMgaW4gSVB2NCBmaWVsZHMgLT4gY2xlYXIgSVB2NiBmaWVsZHNcbiAgICAgKiBXaGVuIHVzZXIgdHlwZXMgaW4gSVB2NiBmaWVsZHMgLT4gY2xlYXIgSVB2NCBmaWVsZHNcbiAgICAgKi9cbiAgICBzZXR1cFByb3RvY29sQXV0b0NsZWFyKCkge1xuICAgICAgICBjb25zdCAkaXB2NE5ldHdvcmsgPSAkKCdpbnB1dFtuYW1lPVwiaXB2NF9uZXR3b3JrXCJdJyk7XG4gICAgICAgIGNvbnN0ICRpcHY0U3VibmV0ID0gJCgnc2VsZWN0W25hbWU9XCJpcHY0X3N1Ym5ldFwiXScpO1xuICAgICAgICBjb25zdCAkaXB2Nk5ldHdvcmsgPSAkKCdpbnB1dFtuYW1lPVwiaXB2Nl9uZXR3b3JrXCJdJyk7XG4gICAgICAgIGNvbnN0ICRpcHY2U3VibmV0ID0gJCgnc2VsZWN0W25hbWU9XCJpcHY2X3N1Ym5ldFwiXScpO1xuXG4gICAgICAgIC8vIFdoZW4gdXNlciB0eXBlcyBpbiBJUHY0IG5ldHdvcmsgZmllbGQgLT4gY2xlYXIgSVB2NiBmaWVsZHNcbiAgICAgICAgJGlwdjROZXR3b3JrLm9uKCdpbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJGlwdjROZXR3b3JrLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiB2YWx1ZSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAkaXB2Nk5ldHdvcmsudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAkaXB2NlN1Ym5ldC5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gV2hlbiB1c2VyIHNlbGVjdHMgSVB2NCBzdWJuZXQgLT4gY2xlYXIgSVB2NiBmaWVsZHNcbiAgICAgICAgJGlwdjRTdWJuZXQub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5ldHdvcmtWYWx1ZSA9ICRpcHY0TmV0d29yay52YWwoKS50cmltKCk7XG4gICAgICAgICAgICBpZiAobmV0d29ya1ZhbHVlICYmIG5ldHdvcmtWYWx1ZSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAkaXB2Nk5ldHdvcmsudmFsKCcnKTtcbiAgICAgICAgICAgICAgICAkaXB2NlN1Ym5ldC5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gV2hlbiB1c2VyIHR5cGVzIGluIElQdjYgbmV0d29yayBmaWVsZCAtPiBjbGVhciBJUHY0IGZpZWxkc1xuICAgICAgICAkaXB2Nk5ldHdvcmsub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkaXB2Nk5ldHdvcmsudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlICE9PSAnJykge1xuICAgICAgICAgICAgICAgICRpcHY0TmV0d29yay52YWwoJycpO1xuICAgICAgICAgICAgICAgICRpcHY0U3VibmV0LmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBXaGVuIHVzZXIgc2VsZWN0cyBJUHY2IHN1Ym5ldCAtPiBjbGVhciBJUHY0IGZpZWxkc1xuICAgICAgICAkaXB2NlN1Ym5ldC5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV0d29ya1ZhbHVlID0gJGlwdjZOZXR3b3JrLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGlmIChuZXR3b3JrVmFsdWUgJiYgbmV0d29ya1ZhbHVlICE9PSAnJykge1xuICAgICAgICAgICAgICAgICRpcHY0TmV0d29yay52YWwoJycpO1xuICAgICAgICAgICAgICAgICRpcHY0U3VibmV0LmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0gcmVzdWx0LmRhdGEgfHwgZmlyZXdhbGwuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIEdldCBJUHY0IGFuZCBJUHY2IHZhbHVlc1xuICAgICAgICBjb25zdCBpcHY0TmV0d29yayA9IGZvcm1EYXRhLmlwdjRfbmV0d29yayB8fCAnJztcbiAgICAgICAgY29uc3QgaXB2NFN1Ym5ldCA9IGZvcm1EYXRhLmlwdjRfc3VibmV0IHx8ICcnO1xuICAgICAgICBjb25zdCBpcHY2TmV0d29yayA9IGZvcm1EYXRhLmlwdjZfbmV0d29yayB8fCAnJztcbiAgICAgICAgY29uc3QgaXB2NlN1Ym5ldCA9IGZvcm1EYXRhLmlwdjZfc3VibmV0IHx8ICcnO1xuXG4gICAgICAgIC8vIFZhbGlkYXRlOiBlaXRoZXIgSVB2NCBPUiBJUHY2LCBub3QgYm90aCwgbm90IG5laXRoZXJcbiAgICAgICAgY29uc3QgaGFzSVB2NCA9IGlwdjROZXR3b3JrICYmIGlwdjROZXR3b3JrICE9PSAnJztcbiAgICAgICAgY29uc3QgaGFzSVB2NiA9IGlwdjZOZXR3b3JrICYmIGlwdjZOZXR3b3JrICE9PSAnJztcblxuICAgICAgICBpZiAoIWhhc0lQdjQgJiYgIWhhc0lQdjYpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZndfVmFsaWRhdGVFaXRoZXJJUHY0T3JJUHY2UmVxdWlyZWQpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChoYXNJUHY0ICYmIGhhc0lQdjYpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZndfVmFsaWRhdGVPbmx5T25lUHJvdG9jb2wpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29tYmluZSBzZWxlY3RlZCBJUHY0IG9yIElQdjYgaW50byBiYWNrZW5kLWNvbXBhdGlibGUgbmV0d29yay9zdWJuZXQgZm9ybWF0XG4gICAgICAgIGZvcm1EYXRhLm5ldHdvcmsgPSBoYXNJUHY0ID8gaXB2NE5ldHdvcmsgOiBpcHY2TmV0d29yaztcbiAgICAgICAgZm9ybURhdGEuc3VibmV0ID0gaGFzSVB2NCA/IGlwdjRTdWJuZXQgOiBpcHY2U3VibmV0O1xuXG4gICAgICAgIC8vIFJlbW92ZSBzZXBhcmF0ZSBJUHY0L0lQdjYgZmllbGRzIChiYWNrZW5kIGV4cGVjdHMgdW5pZmllZCBuZXR3b3JrL3N1Ym5ldClcbiAgICAgICAgZGVsZXRlIGZvcm1EYXRhLmlwdjRfbmV0d29yaztcbiAgICAgICAgZGVsZXRlIGZvcm1EYXRhLmlwdjRfc3VibmV0O1xuICAgICAgICBkZWxldGUgZm9ybURhdGEuaXB2Nl9uZXR3b3JrO1xuICAgICAgICBkZWxldGUgZm9ybURhdGEuaXB2Nl9zdWJuZXQ7XG5cbiAgICAgICAgLy8gUHJlcGFyZSBjdXJyZW50UnVsZXMgZGF0YSBmb3IgQVBJIChzaW1wbGUgYm9vbGVhbiBtYXApXG4gICAgICAgIGNvbnN0IGN1cnJlbnRSdWxlcyA9IHt9O1xuICAgICAgICBPYmplY3Qua2V5cyhmb3JtRGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdydWxlXycpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBrZXkucmVwbGFjZSgncnVsZV8nLCAnJyk7XG4gICAgICAgICAgICAgICAgLy8gU2VuZCBhcyBib29sZWFuIC0gdHJ1ZSA9IGFsbG93LCBmYWxzZSA9IGJsb2NrXG4gICAgICAgICAgICAgICAgY3VycmVudFJ1bGVzW2NhdGVnb3J5XSA9IGZvcm1EYXRhW2tleV0gPT09IHRydWU7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGZvcm1EYXRhW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBjdXJyZW50UnVsZXMgdG8gZm9ybURhdGFcbiAgICAgICAgZm9ybURhdGEuY3VycmVudFJ1bGVzID0gY3VycmVudFJ1bGVzO1xuXG4gICAgICAgIC8vIG5ld2VyX2Jsb2NrX2lwIGFuZCBsb2NhbF9uZXR3b3JrIGFyZSBhbHJlYWR5IGJvb2xlYW4gdGhhbmtzIHRvIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sXG5cbiAgICAgICAgLy8gTWFyayBhcyBuZXcgcmVjb3JkIGlmIHdlIGRvbid0IGhhdmUgYW4gSUQgKGZvciBjb3JyZWN0IFBPU1QvUFVUIHNlbGVjdGlvbilcbiAgICAgICAgLy8gVGhpcyBpcyBjcml0aWNhbCBmb3IgY3JlYXRpbmcgcmVjb3JkcyB3aXRoIHByZWRlZmluZWQgSURzXG4gICAgICAgIGlmICghZmlyZXdhbGwucmVjb3JkSWQgfHwgZmlyZXdhbGwucmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICBmb3JtRGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0LmRhdGEgPSBmb3JtRGF0YTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanNcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGZpcmV3YWxsLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBmaXJld2FsbC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBmaXJld2FsbC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGZpcmV3YWxsLmNiQWZ0ZXJTZW5kRm9ybTtcblxuICAgICAgICAvLyBFbmFibGUgY2hlY2tib3ggdG8gYm9vbGVhbiBjb252ZXJzaW9uXG4gICAgICAgIEZvcm0uY29udmVydENoZWNrYm94ZXNUb0Jvb2wgPSB0cnVlO1xuXG4gICAgICAgIC8vIFNldHVwIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gRmlyZXdhbGxBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcblxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1maXJld2FsbC9tb2RpZnkvYDtcblxuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gd2l0aCBhbGwgc3RhbmRhcmQgZmVhdHVyZXM6XG4gICAgICAgIC8vIC0gRGlydHkgY2hlY2tpbmcgKGNoYW5nZSB0cmFja2luZylcbiAgICAgICAgLy8gLSBEcm9wZG93biBzdWJtaXQgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgICAgICAvLyAtIEZvcm0gdmFsaWRhdGlvblxuICAgICAgICAvLyAtIEFKQVggcmVzcG9uc2UgaGFuZGxpbmdcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gQWRkIGNoYW5nZSBoYW5kbGVycyBmb3IgZHluYW1pY2FsbHkgYWRkZWQgY2hlY2tib3hlc1xuICAgICAgICAvLyBUaGlzIG11c3QgYmUgZG9uZSBBRlRFUiBGb3JtLmluaXRpYWxpemUoKSB0byBlbnN1cmUgcHJvcGVyIHRyYWNraW5nXG4gICAgICAgICQoJyNmaXJld2FsbC1ydWxlcy1jb250YWluZXIgaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gVHJpZ2dlciBmb3JtIGNoYW5nZSBldmVudCBmb3IgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBzZXJ2aWNlIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIHNlcnZpY2UgcnVsZXNcbiAgICAgICAgJCgnLnNlcnZpY2UtaW5mby1pY29uJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHNlcnZpY2UgPSAkaWNvbi5kYXRhKCdzZXJ2aWNlJyk7XG4gICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSAkaWNvbi5kYXRhKCdsaW1pdGVkJykgPT09IHRydWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIGNoZWNrYm94IGZvciB0aGlzIHNlcnZpY2VcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICRpY29uLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgaW5pdGlhbCBhY3Rpb24gYmFzZWQgb24gY2hlY2tib3ggc3RhdGVcbiAgICAgICAgICAgIGNvbnN0IGFjdGlvbiA9ICRjaGVja2JveC5wcm9wKCdjaGVja2VkJykgPyAnYWxsb3cnIDogJ2Jsb2NrJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2VuZXJhdGUgaW5pdGlhbCB0b29sdGlwIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSBgJHt3aW5kb3cuY3VycmVudE5ldHdvcmt9LyR7d2luZG93LmN1cnJlbnRTdWJuZXR9YDtcbiAgICAgICAgICAgIGNvbnN0IHBvcnRJbmZvID0gd2luZG93LnNlcnZpY2VQb3J0SW5mb1tzZXJ2aWNlXSB8fCBbXTtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZUNvbnRlbnQoXG4gICAgICAgICAgICAgICAgc2VydmljZSwgXG4gICAgICAgICAgICAgICAgYWN0aW9uLCBcbiAgICAgICAgICAgICAgICBuZXR3b3JrLCBcbiAgICAgICAgICAgICAgICB3aW5kb3cuaXNEb2NrZXIsIFxuICAgICAgICAgICAgICAgIGlzTGltaXRlZCwgXG4gICAgICAgICAgICAgICAgcG9ydEluZm8sIFxuICAgICAgICAgICAgICAgIGlzTGltaXRlZCAmJiB3aW5kb3cuaXNEb2NrZXIgLy8gU2hvdyBjb3B5IGJ1dHRvbiBvbmx5IGZvciBEb2NrZXIgbGltaXRlZCBzZXJ2aWNlc1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwXG4gICAgICAgICAgICBmaXJld2FsbFRvb2x0aXBzLmluaXRpYWxpemVUb29sdGlwKCRpY29uLCB7XG4gICAgICAgICAgICAgICAgaHRtbDogdG9vbHRpcENvbnRlbnQsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3RvcmUgcmVmZXJlbmNlIHRvIGljb24gb24gY2hlY2tib3ggZm9yIHVwZGF0ZXNcbiAgICAgICAgICAgICRjaGVja2JveC5kYXRhKCd0b29sdGlwSWNvbicsICRpY29uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBzcGVjaWFsIGNoZWNrYm94ZXNcbiAgICAgICAgJCgnLnNwZWNpYWwtY2hlY2tib3gtaW5mbycpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCB0eXBlID0gJGljb24uZGF0YSgndHlwZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaW5kIHRoZSBjaGVja2JveCBmb3IgdGhpcyB0eXBlXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkaWNvbi5jbG9zZXN0KCcuZmllbGQnKS5maW5kKGBpbnB1dFtuYW1lPVwiJHt0eXBlfVwiXWApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgaW5pdGlhbCBzdGF0ZVxuICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LnByb3AoJ2NoZWNrZWQnKTtcbiAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSBgJHt3aW5kb3cuY3VycmVudE5ldHdvcmt9LyR7d2luZG93LmN1cnJlbnRTdWJuZXR9YDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gR2VuZXJhdGUgaW5pdGlhbCB0b29sdGlwIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gZmlyZXdhbGxUb29sdGlwcy5nZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQoXG4gICAgICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgICAgICBuZXR3b3JrLFxuICAgICAgICAgICAgICAgIGlzQ2hlY2tlZFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwIHdpdGggY29tcGFjdCB3aWR0aCBmb3Igc3BlY2lhbCBjaGVja2JveGVzXG4gICAgICAgICAgICBmaXJld2FsbFRvb2x0aXBzLmluaXRpYWxpemVUb29sdGlwKCRpY29uLCB7XG4gICAgICAgICAgICAgICAgaHRtbDogdG9vbHRpcENvbnRlbnQsXG4gICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ3Zlcnkgd2lkZSdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSByZWZlcmVuY2UgdG8gaWNvbiBvbiBjaGVja2JveCBmb3IgdXBkYXRlc1xuICAgICAgICAgICAgJGNoZWNrYm94LmRhdGEoJ3NwZWNpYWxUb29sdGlwSWNvbicsICRpY29uKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBMaXN0ZW4gZm9yIGNoZWNrYm94IGNoYW5nZXMgdG8gdXBkYXRlIHRvb2x0aXBzICh1c2UgZGVsZWdhdGlvbiBmb3IgZHluYW1pYyBlbGVtZW50cylcbiAgICAgICAgJCgnI2ZpcmV3YWxsLWZvcm0nKS5vbignY2hhbmdlJywgJy5ydWxlcyBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICRjaGVja2JveC5kYXRhKCd0b29sdGlwSWNvbicpO1xuICAgICAgICAgICAgY29uc3QgJHNwZWNpYWxJY29uID0gJGNoZWNrYm94LmRhdGEoJ3NwZWNpYWxUb29sdGlwSWNvbicpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJGljb24gJiYgJGljb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VydmljZSA9ICRpY29uLmRhdGEoJ3NlcnZpY2UnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0xpbWl0ZWQgPSAkaWNvbi5kYXRhKCdsaW1pdGVkJykgPT09IHRydWU7XG4gICAgICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gJGNoZWNrYm94LnByb3AoJ2NoZWNrZWQnKSA/ICdhbGxvdycgOiAnYmxvY2snO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSBgJHt3aW5kb3cuY3VycmVudE5ldHdvcmt9LyR7d2luZG93LmN1cnJlbnRTdWJuZXR9YDtcbiAgICAgICAgICAgICAgICBjb25zdCBwb3J0SW5mbyA9IHdpbmRvdy5zZXJ2aWNlUG9ydEluZm9bc2VydmljZV0gfHwgW107XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgbmV3IHRvb2x0aXAgY29udGVudFxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0NvbnRlbnQgPSBmaXJld2FsbFRvb2x0aXBzLmdlbmVyYXRlQ29udGVudChcbiAgICAgICAgICAgICAgICAgICAgc2VydmljZSwgXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbiwgXG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmssIFxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cuaXNEb2NrZXIsIFxuICAgICAgICAgICAgICAgICAgICBpc0xpbWl0ZWQsIFxuICAgICAgICAgICAgICAgICAgICBwb3J0SW5mbywgXG4gICAgICAgICAgICAgICAgICAgIGlzTGltaXRlZCAmJiB3aW5kb3cuaXNEb2NrZXJcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0b29sdGlwXG4gICAgICAgICAgICAgICAgZmlyZXdhbGxUb29sdGlwcy51cGRhdGVDb250ZW50KCRpY29uLCBuZXdDb250ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCRzcGVjaWFsSWNvbiAmJiAkc3BlY2lhbEljb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdHlwZSA9ICRzcGVjaWFsSWNvbi5kYXRhKCd0eXBlJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNDaGVja2VkID0gJGNoZWNrYm94LnByb3AoJ2NoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXR3b3JrID0gYCR7d2luZG93LmN1cnJlbnROZXR3b3JrfS8ke3dpbmRvdy5jdXJyZW50U3VibmV0fWA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgbmV3IHRvb2x0aXAgY29udGVudFxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0NvbnRlbnQgPSBmaXJld2FsbFRvb2x0aXBzLmdlbmVyYXRlU3BlY2lhbENoZWNrYm94Q29udGVudChcbiAgICAgICAgICAgICAgICAgICAgdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgbmV0d29yayxcbiAgICAgICAgICAgICAgICAgICAgaXNDaGVja2VkXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdG9vbHRpcCB3aXRoIGNvbXBhY3Qgd2lkdGhcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRvb2x0aXBzLnVwZGF0ZUNvbnRlbnQoJHNwZWNpYWxJY29uLCBuZXdDb250ZW50LCB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAndmVyeSB3aWRlJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRG9ja2VyIGxpbWl0ZWQgY2hlY2tib3hlcyAtIHByZXZlbnQgdGhlbSBmcm9tIGJlaW5nIHRvZ2dsZWRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRG9ja2VyTGltaXRlZENoZWNrYm94ZXMoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlzRG9ja2VyKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgICQoJy5kb2NrZXItbGltaXRlZC1jaGVja2JveCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJGNoZWNrYm94LmZpbmQoJ2lucHV0W3R5cGU9XCJjaGVja2JveFwiXScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBFbnN1cmUgY2hlY2tib3ggaXMgYWx3YXlzIGNoZWNrZWRcbiAgICAgICAgICAgICRpbnB1dC5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCB2aXN1YWwgZGlzYWJsZWQgc3RhdGVcbiAgICAgICAgICAgICRjaGVja2JveC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUHJldmVudCBjbGljayBldmVudHNcbiAgICAgICAgICAgICRjaGVja2JveC5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhIHRlbXBvcmFyeSBtZXNzYWdlXG4gICAgICAgICAgICAgICAgY29uc3QgJGxhYmVsID0gJGNoZWNrYm94LmZpbmQoJ2xhYmVsJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgJGljb24gPSAkbGFiZWwuZmluZCgnLnNlcnZpY2UtaW5mby1pY29uJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVHJpZ2dlciB0aGUgdG9vbHRpcCB0byBzaG93XG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUHJldmVudCBjaGVja2JveCBzdGF0ZSBjaGFuZ2VzXG4gICAgICAgICAgICAkaW5wdXQub24oJ2NoYW5nZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgJCh0aGlzKS5wcm9wKCdjaGVja2VkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8vIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSB0byBjaGVjayBpZiBhIHN0cmluZyBpcyBhIHZhbGlkIElQIGFkZHJlc3NcbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHIgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCBmID0gdmFsdWUubWF0Y2goL14oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pJC8pO1xuICAgIGlmIChmID09PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8vIEluaXRpYWxpemUgdGhlIGZpcmV3YWxsIGZvcm0gd2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBmaXJld2FsbC5pbml0aWFsaXplKCk7XG59KTtcblxuIl19