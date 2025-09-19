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
    network: {
      identifier: 'network',
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.fw_ValidatePermitAddress
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
    } // DON'T initialize Form here - wait until after dynamic content is loaded
    // firewall.initializeForm();
    // Load firewall data from API


    firewall.loadFirewallData();
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
        UserMessage.showError(globalTranslate.fw_ErrorLoadingRecord || 'Error loading firewall rule');
        return;
      }

      firewall.firewallData = response.data; // Populate form and initialize elements

      firewall.populateForm(response.data); // Initialize UI elements after data is loaded

      firewall.initializeUIElements();
      firewall.initializeTooltips();
      firewall.initializeDockerLimitedCheckboxes(); // Initialize Form AFTER all dynamic content is loaded

      firewall.initializeForm();
    });
  },

  /**
   * Populate form with firewall data.
   * @param {Object} data - Firewall data.
   */
  populateForm: function populateForm(data) {
    // Generate rules HTML first
    firewall.generateRulesHTML(data); // Populate form fields manually since Form.js is not initialized yet
    // Set basic fields

    if (data.id) {
      $('#firewall-form input[name="id"]').val(data.id);
    }

    $('#firewall-form input[name="network"]').val(data.network || '0.0.0.0');
    $('#firewall-form input[name="subnet"]').val(data.subnet || '0');
    $('#firewall-form input[name="description"]').val(data.description || ''); // Set checkboxes

    var $newerBlockIp = $('#firewall-form input[name="newer_block_ip"]');

    if ($newerBlockIp.length) {
      $newerBlockIp.prop('checked', data.newer_block_ip === true);
    }

    var $localNetwork = $('#firewall-form input[name="local_network"]');

    if ($localNetwork.length) {
      $localNetwork.prop('checked', data.local_network === true);
    } // Set rule checkboxes from currentRules


    if (data.currentRules && _typeof(data.currentRules) === 'object') {
      Object.keys(data.currentRules).forEach(function (category) {
        var $checkbox = $("#rule_".concat(category));

        if ($checkbox.length) {
          $checkbox.prop('checked', data.currentRules[category] === true);
        }
      });
    } // Update window variables for tooltips


    window.currentNetwork = data.network;
    window.currentSubnet = data.subnet;
    window.isDocker = data.isDocker || false;
    window.dockerSupportedServices = data.dockerSupportedServices || []; // Build service port info and name mapping from availableRules

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
    }); // Re-initialize checkboxes for dynamically added elements

    $('#firewall-rules-container .checkbox').checkbox();
  },

  /**
   * Initialize UI elements.
   */
  initializeUIElements: function initializeUIElements() {
    // Initialize checkboxes (excluding dynamically added rules which are handled in generateRulesHTML)
    $('#firewall-form .checkbox').not('#firewall-rules-container .checkbox').checkbox(); // Initialize dropdowns

    $('#firewall-form .dropdown').dropdown(); // Initialize input mask for network field (IP address)

    $('input[name="network"]').inputmask({
      alias: 'ip',
      'placeholder': '_'
    });
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    var formData = result.data || firewall.$formObj.form('get values'); // Prepare currentRules data for API (simple boolean map)

    var currentRules = {};
    Object.keys(formData).forEach(function (key) {
      if (key.startsWith('rule_')) {
        var category = key.replace('rule_', ''); // Send as boolean - true = allow, false = block

        currentRules[category] = formData[key] === true;
        delete formData[key];
      }
    }); // Add currentRules to formData

    formData.currentRules = currentRules; // newer_block_ip and local_network are already boolean thanks to convertCheckboxesToBool

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1tb2RpZnkuanMiXSwibmFtZXMiOlsiZmlyZXdhbGwiLCIkZm9ybU9iaiIsIiQiLCJyZWNvcmRJZCIsImZpcmV3YWxsRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJuZXR3b3JrIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImZ3X1ZhbGlkYXRlUGVybWl0QWRkcmVzcyIsImRlc2NyaXB0aW9uIiwiZndfVmFsaWRhdGVSdWxlTmFtZSIsImluaXRpYWxpemUiLCJ3aW5kb3ciLCJzZXJ2aWNlUG9ydEluZm8iLCJzZXJ2aWNlTmFtZU1hcHBpbmciLCJpc0RvY2tlciIsImRvY2tlclN1cHBvcnRlZFNlcnZpY2VzIiwiY3VycmVudE5ldHdvcmsiLCJjdXJyZW50U3VibmV0IiwidXJsUGFydHMiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwic3BsaXQiLCJsYXN0U2VnbWVudCIsImxlbmd0aCIsImxvYWRGaXJld2FsbERhdGEiLCJhZGRDbGFzcyIsIkZpcmV3YWxsQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlc3VsdCIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZndfRXJyb3JMb2FkaW5nUmVjb3JkIiwiZGF0YSIsInBvcHVsYXRlRm9ybSIsImluaXRpYWxpemVVSUVsZW1lbnRzIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiaW5pdGlhbGl6ZURvY2tlckxpbWl0ZWRDaGVja2JveGVzIiwiaW5pdGlhbGl6ZUZvcm0iLCJnZW5lcmF0ZVJ1bGVzSFRNTCIsImlkIiwidmFsIiwic3VibmV0IiwiJG5ld2VyQmxvY2tJcCIsInByb3AiLCJuZXdlcl9ibG9ja19pcCIsIiRsb2NhbE5ldHdvcmsiLCJsb2NhbF9uZXR3b3JrIiwiY3VycmVudFJ1bGVzIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJjYXRlZ29yeSIsIiRjaGVja2JveCIsImF2YWlsYWJsZVJ1bGVzIiwicnVsZVRlbXBsYXRlIiwiZXh0cmFjdFBvcnRzRnJvbVRlbXBsYXRlIiwic2hvcnROYW1lIiwicG9ydHMiLCJBcnJheSIsImlzQXJyYXkiLCJydWxlIiwicHJvdG9jb2wiLCJwdXNoIiwicG9ydGZyb20iLCJwb3J0dG8iLCJwb3J0IiwidG9VcHBlckNhc2UiLCJyYW5nZSIsIiRjb250YWluZXIiLCJlbXB0eSIsImNvbnNvbGUiLCJlcnJvciIsImh0bWwiLCJuYW1lIiwiaXNMaW1pdGVkIiwiaW5jbHVkZXMiLCJpc0NoZWNrZWQiLCJ1bmRlZmluZWQiLCJhY3Rpb24iLCJzZWdtZW50Q2xhc3MiLCJjaGVja2JveENsYXNzIiwiaWNvbkNsYXNzIiwidG9Mb3dlckNhc2UiLCJhcHBlbmQiLCJjaGVja2JveCIsIm5vdCIsImRyb3Bkb3duIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJmb3JtRGF0YSIsImZvcm0iLCJrZXkiLCJzdGFydHNXaXRoIiwicmVwbGFjZSIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJ1cmwiLCJjb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwib24iLCJkYXRhQ2hhbmdlZCIsInNlbGYiLCJlYWNoIiwiJGljb24iLCJzZXJ2aWNlIiwiY2xvc2VzdCIsImZpbmQiLCJwb3J0SW5mbyIsInRvb2x0aXBDb250ZW50IiwiZmlyZXdhbGxUb29sdGlwcyIsImdlbmVyYXRlQ29udGVudCIsImluaXRpYWxpemVUb29sdGlwIiwicG9zaXRpb24iLCJnZW5lcmF0ZVNwZWNpYWxDaGVja2JveENvbnRlbnQiLCJ2YXJpYXRpb24iLCIkc3BlY2lhbEljb24iLCJuZXdDb250ZW50IiwidXBkYXRlQ29udGVudCIsIiRpbnB1dCIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInN0b3BQcm9wYWdhdGlvbiIsIiRsYWJlbCIsInBvcHVwIiwiZm4iLCJpcGFkZHIiLCJ2YWx1ZSIsImYiLCJtYXRjaCIsImkiLCJhIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFFBQVEsR0FBRztBQUNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEU7O0FBT2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLEVBWEc7O0FBYWI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBakJEOztBQW1CYjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxPQUFPLEVBQUU7QUFDTEMsTUFBQUEsVUFBVSxFQUFFLFNBRFA7QUFFTEMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLFFBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREc7QUFGRixLQURFO0FBVVhDLElBQUFBLFdBQVcsRUFBRTtBQUNUTixNQUFBQSxVQUFVLEVBQUUsYUFESDtBQUVUQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0c7QUFGNUIsT0FERztBQUZFO0FBVkYsR0F4QkY7QUE2Q2I7QUFDQUMsRUFBQUEsVUE5Q2Esd0JBOENBO0FBQ1Q7QUFDQTtBQUNBQyxJQUFBQSxNQUFNLENBQUNDLGVBQVAsR0FBeUIsRUFBekI7QUFDQUQsSUFBQUEsTUFB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VixDQUFtQnpGLEtBQW5CLENBQXlCb0ksTUFBekIsR0FBa0MsVUFBVUMsS0FBVixFQUFpQjtBQUMvQyxNQUFJMUcsTUFBTSxHQUFHLElBQWI7QUFDQSxNQUFNMkcsQ0FBQyxHQUFHRCxLQUFLLENBQUNFLEtBQU4sQ0FBWSw4Q0FBWixDQUFWOztBQUNBLE1BQUlELENBQUMsS0FBSyxJQUFWLEVBQWdCO0FBQ1ozRyxJQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNILEdBRkQsTUFFTztBQUNILFNBQUssSUFBSTZHLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUcsQ0FBcEIsRUFBdUJBLENBQUMsSUFBSSxDQUE1QixFQUErQjtBQUMzQixVQUFNQyxDQUFDLEdBQUdILENBQUMsQ0FBQ0UsQ0FBRCxDQUFYOztBQUNBLFVBQUlDLENBQUMsR0FBRyxHQUFSLEVBQWE7QUFDVDlHLFFBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7QUFDSjs7QUFDRCxRQUFJMkcsQ0FBQyxDQUFDLENBQUQsQ0FBRCxHQUFPLEVBQVgsRUFBZTtBQUNYM0csTUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSDtBQUNKOztBQUNELFNBQU9BLE1BQVA7QUFDSCxDQWpCRCxDLENBbUJBOzs7QUFDQWpDLENBQUMsQ0FBQ2dKLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJuSixFQUFBQSxRQUFRLENBQUNlLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBmaXJld2FsbFRvb2x0aXBzLCBGaXJld2FsbEFQSSwgRm9ybUVsZW1lbnRzLCBVc2VyTWVzc2FnZSAqL1xuXG4vKipcbiAqIFRoZSBmaXJld2FsbCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmlyZXdhbGwgZm9ybVxuICpcbiAqIEBtb2R1bGUgZmlyZXdhbGxcbiAqL1xuY29uc3QgZmlyZXdhbGwgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2ZpcmV3YWxsLWZvcm0nKSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBGaXJld2FsbCByZWNvcmQgSUQuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICByZWNvcmRJZDogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogRmlyZXdhbGwgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGZpcmV3YWxsRGF0YTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuZXR3b3JrOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmV0d29yaycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlUGVybWl0QWRkcmVzcyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZndfVmFsaWRhdGVSdWxlTmFtZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gSW5pdGlhbGl6YXRpb24gZnVuY3Rpb24gdG8gc2V0IHVwIGZvcm0gYmVoYXZpb3JcbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGdsb2JhbCB2YXJpYWJsZXMgZm9yIHRvb2x0aXBzIGFuZCBEb2NrZXIgZGV0ZWN0aW9uXG4gICAgICAgIC8vIFRoZXNlIHdpbGwgYmUgdXBkYXRlZCB3aGVuIGRhdGEgaXMgbG9hZGVkIGZyb20gQVBJXG4gICAgICAgIHdpbmRvdy5zZXJ2aWNlUG9ydEluZm8gPSB7fTtcbiAgICAgICAgd2luZG93LnNlcnZpY2VOYW1lTWFwcGluZyA9IHt9O1xuICAgICAgICB3aW5kb3cuaXNEb2NrZXIgPSBmYWxzZTtcbiAgICAgICAgd2luZG93LmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzID0gW107XG4gICAgICAgIHdpbmRvdy5jdXJyZW50TmV0d29yayA9ICcnO1xuICAgICAgICB3aW5kb3cuY3VycmVudFN1Ym5ldCA9ICcnO1xuXG4gICAgICAgIC8vIEdldCByZWNvcmQgSUQgZnJvbSBVUkwgb3IgZm9ybVxuICAgICAgICBjb25zdCB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICBjb25zdCBsYXN0U2VnbWVudCA9IHVybFBhcnRzW3VybFBhcnRzLmxlbmd0aCAtIDFdIHx8ICcnO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBsYXN0IHNlZ21lbnQgaXMgJ21vZGlmeScgKG5ldyByZWNvcmQpIG9yIGFuIGFjdHVhbCBJRFxuICAgICAgICBpZiAobGFzdFNlZ21lbnQgPT09ICdtb2RpZnknIHx8IGxhc3RTZWdtZW50ID09PSAnJykge1xuICAgICAgICAgICAgZmlyZXdhbGwucmVjb3JkSWQgPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZpcmV3YWxsLnJlY29yZElkID0gbGFzdFNlZ21lbnQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBET04nVCBpbml0aWFsaXplIEZvcm0gaGVyZSAtIHdhaXQgdW50aWwgYWZ0ZXIgZHluYW1pYyBjb250ZW50IGlzIGxvYWRlZFxuICAgICAgICAvLyBmaXJld2FsbC5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIExvYWQgZmlyZXdhbGwgZGF0YSBmcm9tIEFQSVxuICAgICAgICBmaXJld2FsbC5sb2FkRmlyZXdhbGxEYXRhKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZmlyZXdhbGwgZGF0YSBmcm9tIEFQSS5cbiAgICAgKiBVbmlmaWVkIG1ldGhvZCBmb3IgYm90aCBuZXcgYW5kIGV4aXN0aW5nIHJlY29yZHMuXG4gICAgICogQVBJIHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzIHdoZW4gSUQgaXMgZW1wdHkuXG4gICAgICovXG4gICAgbG9hZEZpcmV3YWxsRGF0YSgpIHtcbiAgICAgICAgZmlyZXdhbGwuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFsd2F5cyBjYWxsIEFQSSAtIGl0IHJldHVybnMgZGVmYXVsdHMgZm9yIG5ldyByZWNvcmRzICh3aGVuIElEIGlzIGVtcHR5KVxuICAgICAgICBGaXJld2FsbEFQSS5nZXRSZWNvcmQoZmlyZXdhbGwucmVjb3JkSWQgfHwgJycsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgZmlyZXdhbGwuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBhbmQgc3RvcFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZndfRXJyb3JMb2FkaW5nUmVjb3JkIHx8ICdFcnJvciBsb2FkaW5nIGZpcmV3YWxsIHJ1bGUnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZpcmV3YWxsLmZpcmV3YWxsRGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFBvcHVsYXRlIGZvcm0gYW5kIGluaXRpYWxpemUgZWxlbWVudHNcbiAgICAgICAgICAgIGZpcmV3YWxsLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBlbGVtZW50cyBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgZmlyZXdhbGwuaW5pdGlhbGl6ZVVJRWxlbWVudHMoKTtcbiAgICAgICAgICAgIGZpcmV3YWxsLmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgICAgICAgICAgZmlyZXdhbGwuaW5pdGlhbGl6ZURvY2tlckxpbWl0ZWRDaGVja2JveGVzKCk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSBBRlRFUiBhbGwgZHluYW1pYyBjb250ZW50IGlzIGxvYWRlZFxuICAgICAgICAgICAgZmlyZXdhbGwuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZmlyZXdhbGwgZGF0YS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEZpcmV3YWxsIGRhdGEuXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gR2VuZXJhdGUgcnVsZXMgSFRNTCBmaXJzdFxuICAgICAgICBmaXJld2FsbC5nZW5lcmF0ZVJ1bGVzSFRNTChkYXRhKTtcblxuICAgICAgICAvLyBQb3B1bGF0ZSBmb3JtIGZpZWxkcyBtYW51YWxseSBzaW5jZSBGb3JtLmpzIGlzIG5vdCBpbml0aWFsaXplZCB5ZXRcbiAgICAgICAgLy8gU2V0IGJhc2ljIGZpZWxkc1xuICAgICAgICBpZiAoZGF0YS5pZCkge1xuICAgICAgICAgICAgJCgnI2ZpcmV3YWxsLWZvcm0gaW5wdXRbbmFtZT1cImlkXCJdJykudmFsKGRhdGEuaWQpO1xuICAgICAgICB9XG4gICAgICAgICQoJyNmaXJld2FsbC1mb3JtIGlucHV0W25hbWU9XCJuZXR3b3JrXCJdJykudmFsKGRhdGEubmV0d29yayB8fCAnMC4wLjAuMCcpO1xuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybSBpbnB1dFtuYW1lPVwic3VibmV0XCJdJykudmFsKGRhdGEuc3VibmV0IHx8ICcwJyk7XG4gICAgICAgICQoJyNmaXJld2FsbC1mb3JtIGlucHV0W25hbWU9XCJkZXNjcmlwdGlvblwiXScpLnZhbChkYXRhLmRlc2NyaXB0aW9uIHx8ICcnKTtcblxuICAgICAgICAvLyBTZXQgY2hlY2tib3hlc1xuICAgICAgICBjb25zdCAkbmV3ZXJCbG9ja0lwID0gJCgnI2ZpcmV3YWxsLWZvcm0gaW5wdXRbbmFtZT1cIm5ld2VyX2Jsb2NrX2lwXCJdJyk7XG4gICAgICAgIGlmICgkbmV3ZXJCbG9ja0lwLmxlbmd0aCkge1xuICAgICAgICAgICAgJG5ld2VyQmxvY2tJcC5wcm9wKCdjaGVja2VkJywgZGF0YS5uZXdlcl9ibG9ja19pcCA9PT0gdHJ1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkbG9jYWxOZXR3b3JrID0gJCgnI2ZpcmV3YWxsLWZvcm0gaW5wdXRbbmFtZT1cImxvY2FsX25ldHdvcmtcIl0nKTtcbiAgICAgICAgaWYgKCRsb2NhbE5ldHdvcmsubGVuZ3RoKSB7XG4gICAgICAgICAgICAkbG9jYWxOZXR3b3JrLnByb3AoJ2NoZWNrZWQnLCBkYXRhLmxvY2FsX25ldHdvcmsgPT09IHRydWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHJ1bGUgY2hlY2tib3hlcyBmcm9tIGN1cnJlbnRSdWxlc1xuICAgICAgICBpZiAoZGF0YS5jdXJyZW50UnVsZXMgJiYgdHlwZW9mIGRhdGEuY3VycmVudFJ1bGVzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5jdXJyZW50UnVsZXMpLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQoYCNydWxlXyR7Y2F0ZWdvcnl9YCk7XG4gICAgICAgICAgICAgICAgaWYgKCRjaGVja2JveC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGNoZWNrYm94LnByb3AoJ2NoZWNrZWQnLCBkYXRhLmN1cnJlbnRSdWxlc1tjYXRlZ29yeV0gPT09IHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHdpbmRvdyB2YXJpYWJsZXMgZm9yIHRvb2x0aXBzXG4gICAgICAgIHdpbmRvdy5jdXJyZW50TmV0d29yayA9IGRhdGEubmV0d29yaztcbiAgICAgICAgd2luZG93LmN1cnJlbnRTdWJuZXQgPSBkYXRhLnN1Ym5ldDtcbiAgICAgICAgd2luZG93LmlzRG9ja2VyID0gZGF0YS5pc0RvY2tlciB8fCBmYWxzZTtcbiAgICAgICAgd2luZG93LmRvY2tlclN1cHBvcnRlZFNlcnZpY2VzID0gZGF0YS5kb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcyB8fCBbXTtcblxuICAgICAgICAvLyBCdWlsZCBzZXJ2aWNlIHBvcnQgaW5mbyBhbmQgbmFtZSBtYXBwaW5nIGZyb20gYXZhaWxhYmxlUnVsZXNcbiAgICAgICAgd2luZG93LnNlcnZpY2VQb3J0SW5mbyA9IHt9O1xuICAgICAgICB3aW5kb3cuc2VydmljZU5hbWVNYXBwaW5nID0ge307XG4gICAgICAgIGlmIChkYXRhLmF2YWlsYWJsZVJ1bGVzICYmIHR5cGVvZiBkYXRhLmF2YWlsYWJsZVJ1bGVzID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5hdmFpbGFibGVSdWxlcykuZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcnVsZVRlbXBsYXRlID0gZGF0YS5hdmFpbGFibGVSdWxlc1tjYXRlZ29yeV07XG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBwb3J0IGluZm8gZnJvbSBydWxlIHRlbXBsYXRlXG4gICAgICAgICAgICAgICAgd2luZG93LnNlcnZpY2VQb3J0SW5mb1tjYXRlZ29yeV0gPSBmaXJld2FsbC5leHRyYWN0UG9ydHNGcm9tVGVtcGxhdGUocnVsZVRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICAvLyBNYXAgZGlzcGxheSBuYW1lIHRvIGNhdGVnb3J5IGtleVxuICAgICAgICAgICAgICAgIGNvbnN0IHNob3J0TmFtZSA9IHJ1bGVUZW1wbGF0ZS5zaG9ydE5hbWUgfHwgY2F0ZWdvcnk7XG4gICAgICAgICAgICAgICAgd2luZG93LnNlcnZpY2VOYW1lTWFwcGluZ1tzaG9ydE5hbWVdID0gY2F0ZWdvcnk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHRyYWN0IHBvcnQgaW5mb3JtYXRpb24gZnJvbSBydWxlIHRlbXBsYXRlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBydWxlVGVtcGxhdGUgLSBSdWxlIHRlbXBsYXRlIGZyb20gYXZhaWxhYmxlUnVsZXMuXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBwb3J0IGluZm9ybWF0aW9uIG9iamVjdHMuXG4gICAgICovXG4gICAgZXh0cmFjdFBvcnRzRnJvbVRlbXBsYXRlKHJ1bGVUZW1wbGF0ZSkge1xuICAgICAgICBjb25zdCBwb3J0cyA9IFtdO1xuXG4gICAgICAgIGlmIChydWxlVGVtcGxhdGUucnVsZXMgJiYgQXJyYXkuaXNBcnJheShydWxlVGVtcGxhdGUucnVsZXMpKSB7XG4gICAgICAgICAgICBydWxlVGVtcGxhdGUucnVsZXMuZm9yRWFjaChydWxlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocnVsZS5wcm90b2NvbCA9PT0gJ2ljbXAnKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6ICdJQ01QJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJ1bGUucG9ydGZyb20gPT09IHJ1bGUucG9ydHRvKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnRzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogcnVsZS5wb3J0ZnJvbSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiBydWxlLnByb3RvY29sLnRvVXBwZXJDYXNlKClcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICByYW5nZTogYCR7cnVsZS5wb3J0ZnJvbX0tJHtydWxlLnBvcnR0b31gLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHJ1bGUucHJvdG9jb2wudG9VcHBlckNhc2UoKVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwb3J0cztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGUgSFRNTCBmb3IgZmlyZXdhbGwgcnVsZXMgYmFzZWQgb24gQVBJIGRhdGEuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBGaXJld2FsbCBkYXRhIGZyb20gQVBJLlxuICAgICAqL1xuICAgIGdlbmVyYXRlUnVsZXNIVE1MKGRhdGEpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICQoJyNmaXJld2FsbC1ydWxlcy1jb250YWluZXInKTtcbiAgICAgICAgJGNvbnRhaW5lci5lbXB0eSgpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gVXNlIG5ldyBuYW1pbmc6IGF2YWlsYWJsZVJ1bGVzIGZvciB0ZW1wbGF0ZXMsIGN1cnJlbnRSdWxlcyBmb3IgYWN0dWFsIHZhbHVlc1xuICAgICAgICBjb25zdCBhdmFpbGFibGVSdWxlcyA9IGRhdGEuYXZhaWxhYmxlUnVsZXM7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRSdWxlcyA9IGRhdGEuY3VycmVudFJ1bGVzIHx8IHt9O1xuXG4gICAgICAgIGlmICghYXZhaWxhYmxlUnVsZXMpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ05vIGF2YWlsYWJsZSBydWxlcyBkYXRhIHJlY2VpdmVkIGZyb20gQVBJJyk7XG4gICAgICAgICAgICAkY29udGFpbmVyLmh0bWwoJzxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIj5VbmFibGUgdG8gbG9hZCBmaXJld2FsbCBydWxlcy4gUGxlYXNlIHJlZnJlc2ggdGhlIHBhZ2UuPC9kaXY+Jyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBpc0RvY2tlciA9IGRhdGEuaXNEb2NrZXIgfHwgZmFsc2U7XG4gICAgICAgIGNvbnN0IGRvY2tlclN1cHBvcnRlZFNlcnZpY2VzID0gZGF0YS5kb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcyB8fCBbXTtcblxuICAgICAgICAvLyBHZW5lcmF0ZSBIVE1MIGZvciBlYWNoIHJ1bGVcbiAgICAgICAgT2JqZWN0LmtleXMoYXZhaWxhYmxlUnVsZXMpLmZvckVhY2gobmFtZSA9PiB7XG4gICAgICAgICAgICBjb25zdCBydWxlVGVtcGxhdGUgPSBhdmFpbGFibGVSdWxlc1tuYW1lXTtcbiAgICAgICAgICAgIGNvbnN0IHNob3J0TmFtZSA9IHJ1bGVUZW1wbGF0ZS5zaG9ydE5hbWUgfHwgbmFtZTtcbiAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9IGlzRG9ja2VyICYmICFkb2NrZXJTdXBwb3J0ZWRTZXJ2aWNlcy5pbmNsdWRlcyhzaG9ydE5hbWUpO1xuICAgICAgICAgICAgLy8gR2V0IGFjdHVhbCB2YWx1ZSBmcm9tIGN1cnJlbnRSdWxlcywgZGVmYXVsdCB0byB0ZW1wbGF0ZSBkZWZhdWx0XG4gICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSBjdXJyZW50UnVsZXNbbmFtZV0gIT09IHVuZGVmaW5lZCA/IGN1cnJlbnRSdWxlc1tuYW1lXSA6IChydWxlVGVtcGxhdGUuYWN0aW9uID09PSAnYWxsb3cnKTtcblxuICAgICAgICAgICAgY29uc3Qgc2VnbWVudENsYXNzID0gaXNMaW1pdGVkID8gJ2RvY2tlci1saW1pdGVkLXNlZ21lbnQnIDogJyc7XG4gICAgICAgICAgICBjb25zdCBjaGVja2JveENsYXNzID0gaXNMaW1pdGVkID8gJ2RvY2tlci1saW1pdGVkLWNoZWNrYm94JyA6ICcnO1xuICAgICAgICAgICAgY29uc3QgaWNvbkNsYXNzID0gaXNMaW1pdGVkID8gJ3llbGxvdyBleGNsYW1hdGlvbiB0cmlhbmdsZScgOiAnc21hbGwgaW5mbyBjaXJjbGUnO1xuXG4gICAgICAgICAgICBjb25zdCBodG1sID0gYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50ICR7c2VnbWVudENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0b2dnbGUgY2hlY2tib3ggcnVsZXMgJHtjaGVja2JveENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZD1cInJ1bGVfJHtuYW1lfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJydWxlXyR7bmFtZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2lzTGltaXRlZCB8fCBpc0NoZWNrZWQgPyAnY2hlY2tlZCcgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0xpbWl0ZWQgPyAnZGlzYWJsZWQnIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhYmluZGV4PVwiMFwiIGNsYXNzPVwiaGlkZGVuXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj1cInJ1bGVfJHtuYW1lfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZVtgZndfJHtuYW1lLnRvTG93ZXJDYXNlKCl9RGVzY3JpcHRpb25gXSB8fCBzaG9ydE5hbWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtpY29uQ2xhc3N9IGljb24gc2VydmljZS1pbmZvLWljb25cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXNlcnZpY2U9XCIke25hbWV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1hY3Rpb249XCIke3J1bGVUZW1wbGF0ZS5hY3Rpb259XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0xpbWl0ZWQgPyAnZGF0YS1saW1pdGVkPVwidHJ1ZVwiJyA6ICcnfT48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIGA7XG5cbiAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKGh0bWwpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGNoZWNrYm94ZXMgZm9yIGR5bmFtaWNhbGx5IGFkZGVkIGVsZW1lbnRzXG4gICAgICAgICQoJyNmaXJld2FsbC1ydWxlcy1jb250YWluZXIgLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgVUkgZWxlbWVudHMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVVJRWxlbWVudHMoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgY2hlY2tib3hlcyAoZXhjbHVkaW5nIGR5bmFtaWNhbGx5IGFkZGVkIHJ1bGVzIHdoaWNoIGFyZSBoYW5kbGVkIGluIGdlbmVyYXRlUnVsZXNIVE1MKVxuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybSAuY2hlY2tib3gnKS5ub3QoJyNmaXJld2FsbC1ydWxlcy1jb250YWluZXIgLmNoZWNrYm94JykuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybSAuZHJvcGRvd24nKS5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW5wdXQgbWFzayBmb3IgbmV0d29yayBmaWVsZCAoSVAgYWRkcmVzcylcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cIm5ldHdvcmtcIl0nKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0gcmVzdWx0LmRhdGEgfHwgZmlyZXdhbGwuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIFByZXBhcmUgY3VycmVudFJ1bGVzIGRhdGEgZm9yIEFQSSAoc2ltcGxlIGJvb2xlYW4gbWFwKVxuICAgICAgICBjb25zdCBjdXJyZW50UnVsZXMgPSB7fTtcbiAgICAgICAgT2JqZWN0LmtleXMoZm9ybURhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgncnVsZV8nKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5ID0ga2V5LnJlcGxhY2UoJ3J1bGVfJywgJycpO1xuICAgICAgICAgICAgICAgIC8vIFNlbmQgYXMgYm9vbGVhbiAtIHRydWUgPSBhbGxvdywgZmFsc2UgPSBibG9ja1xuICAgICAgICAgICAgICAgIGN1cnJlbnRSdWxlc1tjYXRlZ29yeV0gPSBmb3JtRGF0YVtrZXldID09PSB0cnVlO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBmb3JtRGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgY3VycmVudFJ1bGVzIHRvIGZvcm1EYXRhXG4gICAgICAgIGZvcm1EYXRhLmN1cnJlbnRSdWxlcyA9IGN1cnJlbnRSdWxlcztcbiAgICAgICAgXG4gICAgICAgIC8vIG5ld2VyX2Jsb2NrX2lwIGFuZCBsb2NhbF9uZXR3b3JrIGFyZSBhbHJlYWR5IGJvb2xlYW4gdGhhbmtzIHRvIGNvbnZlcnRDaGVja2JveGVzVG9Cb29sXG4gICAgICAgIFxuICAgICAgICByZXN1bHQuZGF0YSA9IGZvcm1EYXRhO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZmlyZXdhbGwuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGZpcmV3YWxsLnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGZpcmV3YWxsLmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZmlyZXdhbGwuY2JBZnRlclNlbmRGb3JtO1xuXG4gICAgICAgIC8vIEVuYWJsZSBjaGVja2JveCB0byBib29sZWFuIGNvbnZlcnNpb25cbiAgICAgICAgRm9ybS5jb252ZXJ0Q2hlY2tib3hlc1RvQm9vbCA9IHRydWU7XG5cbiAgICAgICAgLy8gU2V0dXAgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBGaXJld2FsbEFQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfWZpcmV3YWxsL21vZGlmeS9gO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgRm9ybSB3aXRoIGFsbCBzdGFuZGFyZCBmZWF0dXJlczpcbiAgICAgICAgLy8gLSBEaXJ0eSBjaGVja2luZyAoY2hhbmdlIHRyYWNraW5nKVxuICAgICAgICAvLyAtIERyb3Bkb3duIHN1Ym1pdCAoU2F2ZVNldHRpbmdzLCBTYXZlU2V0dGluZ3NBbmRBZGROZXcsIFNhdmVTZXR0aW5nc0FuZEV4aXQpXG4gICAgICAgIC8vIC0gRm9ybSB2YWxpZGF0aW9uXG4gICAgICAgIC8vIC0gQUpBWCByZXNwb25zZSBoYW5kbGluZ1xuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcblxuICAgICAgICAvLyBBZGQgY2hhbmdlIGhhbmRsZXJzIGZvciBkeW5hbWljYWxseSBhZGRlZCBjaGVja2JveGVzXG4gICAgICAgIC8vIFRoaXMgbXVzdCBiZSBkb25lIEFGVEVSIEZvcm0uaW5pdGlhbGl6ZSgpIHRvIGVuc3VyZSBwcm9wZXIgdHJhY2tpbmdcbiAgICAgICAgJCgnI2ZpcmV3YWxsLXJ1bGVzLWNvbnRhaW5lciBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGZvcm0gY2hhbmdlIGV2ZW50IGZvciBkaXJ0eSBjaGVja2luZ1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIHNlcnZpY2UgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3Igc2VydmljZSBydWxlc1xuICAgICAgICAkKCcuc2VydmljZS1pbmZvLWljb24nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3Qgc2VydmljZSA9ICRpY29uLmRhdGEoJ3NlcnZpY2UnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9ICRpY29uLmRhdGEoJ2xpbWl0ZWQnKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRmluZCB0aGUgY2hlY2tib3ggZm9yIHRoaXMgc2VydmljZVxuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJGljb24uY2xvc2VzdCgnLmZpZWxkJykuZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBpbml0aWFsIGFjdGlvbiBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgY29uc3QgYWN0aW9uID0gJGNoZWNrYm94LnByb3AoJ2NoZWNrZWQnKSA/ICdhbGxvdycgOiAnYmxvY2snO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBpbml0aWFsIHRvb2x0aXAgY29udGVudFxuICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgY29uc3QgcG9ydEluZm8gPSB3aW5kb3cuc2VydmljZVBvcnRJbmZvW3NlcnZpY2VdIHx8IFtdO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBmaXJld2FsbFRvb2x0aXBzLmdlbmVyYXRlQ29udGVudChcbiAgICAgICAgICAgICAgICBzZXJ2aWNlLCBcbiAgICAgICAgICAgICAgICBhY3Rpb24sIFxuICAgICAgICAgICAgICAgIG5ldHdvcmssIFxuICAgICAgICAgICAgICAgIHdpbmRvdy5pc0RvY2tlciwgXG4gICAgICAgICAgICAgICAgaXNMaW1pdGVkLCBcbiAgICAgICAgICAgICAgICBwb3J0SW5mbywgXG4gICAgICAgICAgICAgICAgaXNMaW1pdGVkICYmIHdpbmRvdy5pc0RvY2tlciAvLyBTaG93IGNvcHkgYnV0dG9uIG9ubHkgZm9yIERvY2tlciBsaW1pdGVkIHNlcnZpY2VzXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBcbiAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMuaW5pdGlhbGl6ZVRvb2x0aXAoJGljb24sIHtcbiAgICAgICAgICAgICAgICBodG1sOiB0b29sdGlwQ29udGVudCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCdcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdG9yZSByZWZlcmVuY2UgdG8gaWNvbiBvbiBjaGVja2JveCBmb3IgdXBkYXRlc1xuICAgICAgICAgICAgJGNoZWNrYm94LmRhdGEoJ3Rvb2x0aXBJY29uJywgJGljb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIHNwZWNpYWwgY2hlY2tib3hlc1xuICAgICAgICAkKCcuc3BlY2lhbC1jaGVja2JveC1pbmZvJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSAkaWNvbi5kYXRhKCd0eXBlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIGNoZWNrYm94IGZvciB0aGlzIHR5cGVcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICRpY29uLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoYGlucHV0W25hbWU9XCIke3R5cGV9XCJdYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEdldCBpbml0aWFsIHN0YXRlXG4gICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpO1xuICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZW5lcmF0ZSBpbml0aWFsIHRvb2x0aXAgY29udGVudFxuICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBmaXJld2FsbFRvb2x0aXBzLmdlbmVyYXRlU3BlY2lhbENoZWNrYm94Q29udGVudChcbiAgICAgICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgICAgIG5ldHdvcmssXG4gICAgICAgICAgICAgICAgaXNDaGVja2VkXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXAgd2l0aCBjb21wYWN0IHdpZHRoIGZvciBzcGVjaWFsIGNoZWNrYm94ZXNcbiAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMuaW5pdGlhbGl6ZVRvb2x0aXAoJGljb24sIHtcbiAgICAgICAgICAgICAgICBodG1sOiB0b29sdGlwQ29udGVudCxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAndmVyeSB3aWRlJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFN0b3JlIHJlZmVyZW5jZSB0byBpY29uIG9uIGNoZWNrYm94IGZvciB1cGRhdGVzXG4gICAgICAgICAgICAkY2hlY2tib3guZGF0YSgnc3BlY2lhbFRvb2x0aXBJY29uJywgJGljb24pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbiBmb3IgY2hlY2tib3ggY2hhbmdlcyB0byB1cGRhdGUgdG9vbHRpcHMgKHVzZSBkZWxlZ2F0aW9uIGZvciBkeW5hbWljIGVsZW1lbnRzKVxuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybScpLm9uKCdjaGFuZ2UnLCAnLnJ1bGVzIGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNoZWNrYm94ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJGNoZWNrYm94LmRhdGEoJ3Rvb2x0aXBJY29uJyk7XG4gICAgICAgICAgICBjb25zdCAkc3BlY2lhbEljb24gPSAkY2hlY2tib3guZGF0YSgnc3BlY2lhbFRvb2x0aXBJY29uJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICgkaWNvbiAmJiAkaWNvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzZXJ2aWNlID0gJGljb24uZGF0YSgnc2VydmljZScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzTGltaXRlZCA9ICRpY29uLmRhdGEoJ2xpbWl0ZWQnKSA9PT0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBjb25zdCBhY3Rpb24gPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpID8gJ2FsbG93JyA6ICdibG9jayc7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV0d29yayA9IGAke3dpbmRvdy5jdXJyZW50TmV0d29ya30vJHt3aW5kb3cuY3VycmVudFN1Ym5ldH1gO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBvcnRJbmZvID0gd2luZG93LnNlcnZpY2VQb3J0SW5mb1tzZXJ2aWNlXSB8fCBbXTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBuZXcgdG9vbHRpcCBjb250ZW50XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVDb250ZW50KFxuICAgICAgICAgICAgICAgICAgICBzZXJ2aWNlLCBcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9uLCBcbiAgICAgICAgICAgICAgICAgICAgbmV0d29yaywgXG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5pc0RvY2tlciwgXG4gICAgICAgICAgICAgICAgICAgIGlzTGltaXRlZCwgXG4gICAgICAgICAgICAgICAgICAgIHBvcnRJbmZvLCBcbiAgICAgICAgICAgICAgICAgICAgaXNMaW1pdGVkICYmIHdpbmRvdy5pc0RvY2tlclxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBmaXJld2FsbFRvb2x0aXBzLnVwZGF0ZUNvbnRlbnQoJGljb24sIG5ld0NvbnRlbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoJHNwZWNpYWxJY29uICYmICRzcGVjaWFsSWNvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gJHNwZWNpYWxJY29uLmRhdGEoJ3R5cGUnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc0NoZWNrZWQgPSAkY2hlY2tib3gucHJvcCgnY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ldHdvcmsgPSBgJHt3aW5kb3cuY3VycmVudE5ldHdvcmt9LyR7d2luZG93LmN1cnJlbnRTdWJuZXR9YDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBuZXcgdG9vbHRpcCBjb250ZW50XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IGZpcmV3YWxsVG9vbHRpcHMuZ2VuZXJhdGVTcGVjaWFsQ2hlY2tib3hDb250ZW50KFxuICAgICAgICAgICAgICAgICAgICB0eXBlLFxuICAgICAgICAgICAgICAgICAgICBuZXR3b3JrLFxuICAgICAgICAgICAgICAgICAgICBpc0NoZWNrZWRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0b29sdGlwIHdpdGggY29tcGFjdCB3aWR0aFxuICAgICAgICAgICAgICAgIGZpcmV3YWxsVG9vbHRpcHMudXBkYXRlQ29udGVudCgkc3BlY2lhbEljb24sIG5ld0NvbnRlbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICd2ZXJ5IHdpZGUnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEb2NrZXIgbGltaXRlZCBjaGVja2JveGVzIC0gcHJldmVudCB0aGVtIGZyb20gYmVpbmcgdG9nZ2xlZFxuICAgICAqL1xuICAgIGluaXRpYWxpemVEb2NrZXJMaW1pdGVkQ2hlY2tib3hlcygpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaXNEb2NrZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgJCgnLmRvY2tlci1saW1pdGVkLWNoZWNrYm94JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGVja2JveCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEVuc3VyZSBjaGVja2JveCBpcyBhbHdheXMgY2hlY2tlZFxuICAgICAgICAgICAgJGlucHV0LnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIHZpc3VhbCBkaXNhYmxlZCBzdGF0ZVxuICAgICAgICAgICAgJGNoZWNrYm94LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IGNsaWNrIGV2ZW50c1xuICAgICAgICAgICAgJGNoZWNrYm94Lm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTaG93IGEgdGVtcG9yYXJ5IG1lc3NhZ2VcbiAgICAgICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkY2hlY2tib3guZmluZCgnbGFiZWwnKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkaWNvbiA9ICRsYWJlbC5maW5kKCcuc2VydmljZS1pbmZvLWljb24nKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIHRoZSB0b29sdGlwIHRvIHNob3dcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCgnc2hvdycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBQcmV2ZW50IGNoZWNrYm94IHN0YXRlIGNoYW5nZXNcbiAgICAgICAgICAgICRpbnB1dC5vbignY2hhbmdlJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAkKHRoaXMpLnByb3AoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLy8gQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIHRvIGNoZWNrIGlmIGEgc3RyaW5nIGlzIGEgdmFsaWQgSVAgYWRkcmVzc1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT09IG51bGwpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSBmW2ldO1xuICAgICAgICAgICAgaWYgKGEgPiAyNTUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZls1XSA+IDMyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgZmlyZXdhbGwgZm9ybSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGZpcmV3YWxsLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=