"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

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

/* global globalRootUrl,globalTranslate, Form, SysinfoAPI, NetworkAPI, UserMessage, DynamicDropdownBuilder */

/**
 * Object for managing network settings
 *
 * @module networks
 */
var networks = {
  $getMyIpButton: $('#getmyip'),

  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#network-form'),
  $dropDowns: $('#network-form .dropdown'),
  $extipaddr: $('#extipaddr'),
  $ipaddressInput: $('.ipaddress'),
  vlansArray: {},

  /**
   * jQuery object for the elements with we should hide from the form for docker installation.
   * @type {jQuery}
   */
  $notShowOnDockerDivs: $('.do-not-show-if-docker'),

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    extipaddr: {
      optional: true,
      rules: [{
        type: 'ipaddrWithPortOptional',
        prompt: globalTranslate.nw_ValidateExtIppaddrNotRight
      }, {
        type: 'extenalIpHost',
        prompt: globalTranslate.nw_ValidateExtIppaddrOrHostIsEmpty
      }]
    },
    exthostname: {
      depends: 'usenat',
      rules: [{
        type: 'extenalIpHost',
        prompt: globalTranslate.nw_ValidateExtIppaddrOrHostIsEmpty
      }, {
        type: 'validHostname',
        prompt: globalTranslate.nw_ValidateHostnameInvalid
      }]
    }
  },

  /**
   * Initializes the network settings form.
   */
  initialize: function initialize() {
    // Load configuration via REST API
    networks.loadConfiguration(); // Handles the change event of the 'usenat-checkbox'.

    $('#usenat-checkbox').checkbox({
      onChange: function onChange() {
        networks.toggleDisabledFieldClass();
      }
    });
    networks.$dropDowns.dropdown(); // DHCP checkbox handlers will be bound after tabs are created dynamically

    networks.$getMyIpButton.on('click', function (e) {
      e.preventDefault();
      networks.$getMyIpButton.addClass('loading disabled');
      SysinfoAPI.getExternalIpInfo(networks.cbAfterGetExternalIp);
    }); // Delete button handler will be bound after tabs are created dynamically

    networks.$ipaddressInput.inputmask({
      alias: 'ip',
      'placeholder': '_'
    }); // Apply IP mask for external IP address field

    networks.$extipaddr.inputmask({
      alias: 'ip',
      'placeholder': '_'
    });
    networks.initializeForm(); // Initialize static routes manager

    StaticRoutesManager.initialize(); // Hide static routes section in Docker (managed via do-not-show-if-docker class)

    if (networks.$formObj.form('get value', 'is-docker') === "1") {
      networks.$notShowOnDockerDivs.hide();
    }
  },

  /**
   * Callback function executed after getting the external IP from a remote server.
   * @param {boolean|Object} response - The response received from the server. If false, indicates an error occurred.
   */
  cbAfterGetExternalIp: function cbAfterGetExternalIp(response) {
    networks.$getMyIpButton.removeClass('loading disabled');

    if (response === false || !response.result || !response.data || !response.data.ip) {
      UserMessage.showError(globalTranslate.nw_ErrorGettingExternalIp || 'Failed to get external IP address');
      return;
    }

    var currentExtIpAddr = networks.$formObj.form('get value', 'extipaddr');
    var portMatch = currentExtIpAddr.match(/:(\d+)$/);
    var port = portMatch ? ':' + portMatch[1] : '';
    var newExtIpAddr = response.data.ip + port;
    networks.$formObj.form('set value', 'extipaddr', newExtIpAddr); // Clear external hostname when getting external IP

    networks.$formObj.form('set value', 'exthostname', '');
    networks.$extipaddr.trigger('change');
  },

  /**
   * Update NAT help text with actual port values from REST API
   * Updates both standard NAT section and Dual-Stack section
   * @param {object} ports - Port configuration object from API
   */
  updateNATHelpText: function updateNATHelpText(ports) {
    // WHY: Port keys match PbxSettings constants (SIPPort, TLS_PORT, RTPPortFrom, RTPPortTo)
    // Only update if we have port values from server
    if (!ports.SIPPort || !ports.TLS_PORT || !ports.RTPPortFrom || !ports.RTPPortTo) {
      return;
    } // Update standard NAT section - SIP ports info text


    var $sipPortValues = $('#nat-help-sip-ports .port-values');

    if ($sipPortValues.length > 0) {
      var sipText = i18n('nw_NATInfo3', {
        'SIP_PORT': ports.SIPPort,
        'TLS_PORT': ports.TLS_PORT
      });
      $sipPortValues.html(sipText);
    } // Update standard NAT section - RTP ports info text


    var $rtpPortValues = $('#nat-help-rtp-ports .port-values');

    if ($rtpPortValues.length > 0) {
      var rtpText = i18n('nw_NATInfo4', {
        'RTP_PORT_FROM': ports.RTPPortFrom,
        'RTP_PORT_TO': ports.RTPPortTo
      });
      $rtpPortValues.html(rtpText);
    } // Update Dual-Stack section - SIP ports info text


    var $dualStackSipPortValues = $('#dual-stack-sip-ports .port-values');

    if ($dualStackSipPortValues.length > 0) {
      var dualStackSipText = i18n('nw_NATInfo3', {
        'SIP_PORT': ports.SIPPort,
        'TLS_PORT': ports.TLS_PORT
      });
      $dualStackSipPortValues.html(dualStackSipText);
    } // Update Dual-Stack section - RTP ports info text


    var $dualStackRtpPortValues = $('#dual-stack-rtp-ports .port-values');

    if ($dualStackRtpPortValues.length > 0) {
      var dualStackRtpText = i18n('nw_NATInfo4', {
        'RTP_PORT_FROM': ports.RTPPortFrom,
        'RTP_PORT_TO': ports.RTPPortTo
      });
      $dualStackRtpPortValues.html(dualStackRtpText);
    }
  },

  /**
   * Update port field labels with actual internal port values from REST API
   * Updates both standard NAT section and Dual-Stack section
   * @param {object} ports - Port configuration object from API
   */
  updatePortLabels: function updatePortLabels(ports) {
    // WHY: Port keys match PbxSettings constants (SIPPort, TLS_PORT)
    // Only update if we have port values from server
    if (!ports.SIPPort || !ports.TLS_PORT) {
      return;
    } // Update standard NAT section - external SIP port label


    var $sipLabel = $('#external-sip-port-label');

    if ($sipLabel.length > 0) {
      var sipLabelText = i18n('nw_PublicSIPPort', {
        'SIP_PORT': ports.SIPPort
      });
      $sipLabel.text(sipLabelText);
    } // Update standard NAT section - external TLS port label


    var $tlsLabel = $('#external-tls-port-label');

    if ($tlsLabel.length > 0) {
      var tlsLabelText = i18n('nw_PublicTLSPort', {
        'TLS_PORT': ports.TLS_PORT
      });
      $tlsLabel.text(tlsLabelText);
    } // Update Dual-Stack section - SIP port label


    var $dualStackSipLabel = $('#dual-stack-sip-port-label');

    if ($dualStackSipLabel.length > 0) {
      var dualStackSipLabelText = i18n('nw_PublicSIPPort', {
        'SIP_PORT': ports.SIPPort
      });
      $dualStackSipLabel.text(dualStackSipLabelText);
    } // Update Dual-Stack section - TLS port label


    var $dualStackTlsLabel = $('#dual-stack-tls-port-label');

    if ($dualStackTlsLabel.length > 0) {
      var dualStackTlsLabelText = i18n('nw_PublicTLSPort', {
        'TLS_PORT': ports.TLS_PORT
      });
      $dualStackTlsLabel.text(dualStackTlsLabelText);
    }
  },

  /**
   * Toggles the 'disabled' class for specific fields based on their checkbox state.
   */
  toggleDisabledFieldClass: function toggleDisabledFieldClass() {
    $('#eth-interfaces-menu a').each(function (index, obj) {
      var eth = $(obj).attr('data-tab');
      var $dhcpCheckbox = $("#dhcp-".concat(eth, "-checkbox"));
      var isDhcpEnabled = $dhcpCheckbox.checkbox('is checked'); // Find IP address and subnet fields

      var $ipField = $("input[name=\"ipaddr_".concat(eth, "\"]")); // DynamicDropdownBuilder creates dropdown with id pattern: fieldName-dropdown

      var $subnetDropdown = $("#subnet_".concat(eth, "-dropdown"));

      if (isDhcpEnabled) {
        // DHCP enabled -> make IP/subnet read-only and add disabled class
        $ipField.prop('readonly', true);
        $ipField.closest('.field').addClass('disabled');
        $subnetDropdown.addClass('disabled');
        $("#not-dhcp-".concat(eth)).val('');
      } else {
        // DHCP disabled -> make IP/subnet editable
        $ipField.prop('readonly', false);
        $ipField.closest('.field').removeClass('disabled');
        $subnetDropdown.removeClass('disabled');
        $("#not-dhcp-".concat(eth)).val('1');
      }

      networks.addNewFormRules(eth);
    }); // Hide/show NAT sections instead of disabling to simplify UI

    if ($('#usenat-checkbox').checkbox('is checked')) {
      $('.nated-settings-group').show(); // After showing all sections, determine which one to actually display

      networks.updateDualStackNatLogic();
    } else {
      $('.nated-settings-group').hide();
    }
  },

  /**
   * Toggle visibility of IPv6 manual configuration fields based on selected mode
   * @param {string} interfaceId - Interface ID
   */
  toggleIPv6Fields: function toggleIPv6Fields(interfaceId) {
    var $ipv6ModeDropdown = $("#ipv6_mode_".concat(interfaceId));
    var ipv6Mode = $ipv6ModeDropdown.val();
    var $manualFieldsContainer = $(".ipv6-manual-fields-".concat(interfaceId));
    var $autoInfoMessage = $(".ipv6-auto-info-message-".concat(interfaceId));
    var $ipv6GatewayField = $(".ipv6-gateway-field-".concat(interfaceId));
    var $ipv6PrimaryDNSField = $(".ipv6-primarydns-field-".concat(interfaceId));
    var $ipv6SecondaryDNSField = $(".ipv6-secondarydns-field-".concat(interfaceId)); // Show manual fields only when mode is '2' (Manual)

    if (ipv6Mode === '2') {
      $manualFieldsContainer.show();
      $autoInfoMessage.hide();
      $ipv6GatewayField.show();
      $ipv6PrimaryDNSField.show();
      $ipv6SecondaryDNSField.show();
    } else if (ipv6Mode === '1') {
      // Show Auto (SLAAC) info message when mode is '1' (Auto)
      $manualFieldsContainer.hide();
      $autoInfoMessage.show();
      $ipv6GatewayField.show();
      $ipv6PrimaryDNSField.show();
      $ipv6SecondaryDNSField.show();
    } else {
      // Hide all IPv6 fields for mode '0' (Off)
      $manualFieldsContainer.hide();
      $autoInfoMessage.hide();
      $ipv6GatewayField.hide();
      $ipv6PrimaryDNSField.hide();
      $ipv6SecondaryDNSField.hide();
    } // Update dual-stack NAT logic when IPv6 mode changes


    networks.updateDualStackNatLogic();
  },

  /**
   * Check if dual-stack mode is active (IPv4 + IPv6 public address both configured)
   * Dual-stack NAT section is shown when both IPv4 and public IPv6 are present.
   * Public IPv6 = Global Unicast addresses (2000::/3) that start with 2 or 3.
   * Private IPv6 addresses (ULA fd00::/8, link-local fe80::/10) do NOT trigger dual-stack.
   *
   * IPv4 detection works for both static and DHCP configurations:
   * - Static: checks ipaddr_X field
   * - DHCP: checks if DHCP is enabled AND gateway is obtained
   *
   * @param {string} interfaceId - Interface ID
   * @returns {boolean} True if dual-stack with public IPv6, false otherwise
   */
  isDualStackMode: function isDualStackMode(interfaceId) {
    // Get IPv4 configuration (static or DHCP)
    var ipv4addr = $("input[name=\"ipaddr_".concat(interfaceId, "\"]")).val();
    var dhcpEnabled = $("input[name=\"dhcp_".concat(interfaceId, "\"]")).val() === 'on';
    var gateway = $("input[name=\"gateway_".concat(interfaceId, "\"]")).val(); // Get IPv6 configuration

    var ipv6Mode = $("#ipv6_mode_".concat(interfaceId)).val();
    var ipv6addr = $("input[name=\"ipv6addr_".concat(interfaceId, "\"]")).val(); // Check if IPv4 is present (either static address or DHCP with gateway)
    // Gateway presence indicates DHCP successfully obtained an IPv4 address

    var hasIpv4 = ipv4addr && ipv4addr.trim() !== '' || dhcpEnabled && gateway && gateway.trim() !== ''; // Check if IPv6 is enabled (Auto SLAAC/DHCPv6 or Manual)

    var hasIpv6 = (ipv6Mode === '1' || ipv6Mode === '2') && ipv6addr && ipv6addr.trim() !== '';

    if (!hasIpv4 || !hasIpv6) {
      return false;
    } // Check if IPv6 address is global unicast (public)
    // Global unicast: 2000::/3 (addresses starting with 2 or 3)
    // Exclude ULA (fd00::/8) and link-local (fe80::/10)


    var ipv6Lower = ipv6addr.toLowerCase().trim(); // Remove CIDR notation if present (e.g., "2001:db8::1/64" -> "2001:db8::1")

    var ipv6WithoutCidr = ipv6Lower.split('/')[0]; // Check if first character is 2 or 3 (global unicast range)

    var isGlobalUnicast = /^[23]/.test(ipv6WithoutCidr);
    return isGlobalUnicast;
  },

  /**
   * Update NAT section UI based on dual-stack detection
   * Switches between standard NAT section and Dual-Stack section
   * Makes exthostname required in dual-stack mode
   */
  updateDualStackNatLogic: function updateDualStackNatLogic() {
    // Check if NAT is enabled - if not, don't show any NAT sections
    var isNatEnabled = $('#usenat-checkbox').checkbox('is checked');

    if (!isNatEnabled) {
      return; // NAT disabled, sections already hidden by toggleDisabledFieldClass
    } // Check if any interface is in dual-stack mode


    var anyDualStack = false;
    $('#eth-interfaces-menu a').each(function (index, tab) {
      var interfaceId = $(tab).attr('data-tab');

      if (networks.isDualStackMode(interfaceId)) {
        anyDualStack = true;
        return false; // Break loop
      }
    });
    var $standardNatSection = $('#standard-nat-section');
    var $dualStackSection = $('#dual-stack-section');

    if (anyDualStack) {
      // Dual-stack detected: Hide standard NAT section, show Dual-Stack section
      $standardNatSection.hide();
      $dualStackSection.show(); // Clear extipaddr (external IP not needed in dual-stack, only hostname)

      networks.$formObj.form('set value', 'extipaddr', ''); // Disable autoUpdateExternalIp (not needed in dual-stack)

      var $autoUpdateCheckbox = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');

      if ($autoUpdateCheckbox.length > 0) {
        $autoUpdateCheckbox.checkbox('uncheck');
      } // Update hostname display in dual-stack info message


      var hostname = $('#exthostname').val() || 'mikopbx.company.com';
      $('#hostname-display').text(hostname); // Make exthostname required in dual-stack

      networks.validateRules.exthostname.rules = [{
        type: 'empty',
        prompt: globalTranslate.nw_ValidateExternalHostnameEmpty || 'External hostname is required in dual-stack mode'
      }, {
        type: 'validHostname',
        prompt: globalTranslate.nw_ValidateHostnameInvalid || 'Invalid hostname format'
      }];
    } else {
      // No dual-stack: Show standard NAT section, hide Dual-Stack section
      $standardNatSection.show();
      $dualStackSection.hide(); // Restore original exthostname validation (optional with usenat dependency)

      networks.validateRules.exthostname.depends = 'usenat';
      networks.validateRules.exthostname.rules = [{
        type: 'extenalIpHost',
        prompt: globalTranslate.nw_ValidateExtIppaddrOrHostIsEmpty
      }, {
        type: 'validHostname',
        prompt: globalTranslate.nw_ValidateHostnameInvalid
      }];
    } // Reinitialize form validation


    networks.$formObj.form('destroy').form({
      on: 'blur',
      fields: networks.validateRules
    });
  },

  /**
   * Adds new form validation rules for a specific row in the network configuration form.
   * @param {string} newRowId - The ID of the new row to add the form rules for.
   */
  addNewFormRules: function addNewFormRules(newRowId) {
    // Define the class for the 'name' field in the new row
    var nameClass = "name_".concat(newRowId); // Define the form validation rules for the 'name' field

    networks.validateRules[nameClass] = {
      identifier: nameClass,
      depends: "interface_".concat(newRowId),
      rules: [{
        type: 'empty',
        prompt: globalTranslate.nw_ValidateNameIsNotBeEmpty
      }]
    }; // Define the class for the 'vlanid' field in the new row

    var vlanClass = "vlanid_".concat(newRowId); // Define the form validation rules for the 'vlanid' field

    networks.validateRules[vlanClass] = {
      depends: "interface_".concat(newRowId),
      identifier: vlanClass,
      rules: [{
        type: 'integer[0..4095]',
        prompt: globalTranslate.nw_ValidateVlanRange
      }, {
        type: "checkVlan[".concat(newRowId, "]"),
        prompt: globalTranslate.nw_ValidateVlanCross
      }]
    }; // Define the class for the 'ipaddr' field in the new row

    var ipaddrClass = "ipaddr_".concat(newRowId); // Define the form validation rules for the 'ipaddr' field
    // For template interface (id=0), add dependency on interface selection

    if (newRowId === 0 || newRowId === '0') {
      networks.validateRules[ipaddrClass] = {
        identifier: ipaddrClass,
        depends: "interface_".concat(newRowId),
        // Template: validate only if interface is selected
        rules: [{
          type: 'empty',
          prompt: globalTranslate.nw_ValidateIppaddrIsEmpty
        }, {
          type: 'ipaddr',
          prompt: globalTranslate.nw_ValidateIppaddrNotRight
        }]
      };
    } else {
      networks.validateRules[ipaddrClass] = {
        identifier: ipaddrClass,
        depends: "notdhcp_".concat(newRowId),
        // Real interface: validate only if DHCP is OFF
        rules: [{
          type: 'empty',
          prompt: globalTranslate.nw_ValidateIppaddrIsEmpty
        }, {
          type: 'ipaddr',
          prompt: globalTranslate.nw_ValidateIppaddrNotRight
        }]
      };
    } // DHCP validation removed - DHCP checkbox is disabled for VLAN interfaces

  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    // Create a new object with all settings properties
    var result = Object.assign({}, settings);
    result.data = {}; // Collect static routes

    result.data.staticRoutes = StaticRoutesManager.collectRoutes(); // Manually collect form values to avoid any DOM-related issues
    // Collect all regular input fields

    networks.$formObj.find('input[type="text"], input[type="hidden"], input[type="number"], textarea').each(function () {
      var $input = $(this);
      var name = $input.attr('name');

      if (name) {
        var value = $input.val(); // Ensure we only get string values

        result.data[name] = value !== null && value !== undefined ? String(value) : '';
      }
    }); // Collect select dropdowns

    networks.$formObj.find('select').each(function () {
      var $select = $(this);
      var name = $select.attr('name');

      if (name) {
        var value = $select.val(); // Ensure we only get string values

        result.data[name] = value !== null && value !== undefined ? String(value) : '';
      }
    }); // Convert checkbox values to boolean
    // PbxApiClient will handle conversion to strings for jQuery

    result.data.usenat = $('#usenat-checkbox').checkbox('is checked'); // Use correct field name from the form (autoUpdateExternalIp, not AUTO_UPDATE_EXTERNAL_IP)

    var $autoUpdateDiv = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');

    if ($autoUpdateDiv.length > 0) {
      result.data.autoUpdateExternalIp = $autoUpdateDiv.checkbox('is checked');
    } else {
      result.data.autoUpdateExternalIp = false;
    } // Convert DHCP checkboxes to boolean for each interface


    networks.$formObj.find('.dhcp-checkbox').each(function (index, obj) {
      var inputId = $(obj).attr('id');
      var rowId = inputId.replace('dhcp-', '').replace('-checkbox', ''); // For disabled checkboxes, read actual input state instead of Fomantic UI API

      var $checkbox = $(obj);
      var $input = $checkbox.find('input[type="checkbox"]');
      var isDisabled = $checkbox.hasClass('disabled') || $input.prop('disabled');

      if (isDisabled) {
        // For disabled checkboxes, read the actual input checked state
        result.data["dhcp_".concat(rowId)] = $input.prop('checked') === true;
      } else {
        // For enabled checkboxes, use Fomantic UI API
        result.data["dhcp_".concat(rowId)] = $checkbox.checkbox('is checked');
      }
    }); // Collect internet radio button

    var $checkedRadio = $('input[name="internet_interface"]:checked');

    if ($checkedRadio.length > 0) {
      result.data.internet_interface = String($checkedRadio.val());
    } // WHY: No port field mapping needed - form field names match API constants
    // (externalSIPPort = PbxSettings::EXTERNAL_SIP_PORT)
    // Set default IPv6 subnet for Auto mode (SLAAC/DHCPv6)


    Object.keys(result.data).forEach(function (key) {
      var ipv6ModeMatch = key.match(/^ipv6_mode_(\d+)$/);

      if (ipv6ModeMatch) {
        var interfaceId = ipv6ModeMatch[1];
        var mode = result.data[key];
        var subnetKey = "ipv6_subnet_".concat(interfaceId); // If mode is Auto ('1') and subnet is empty, set default to '64'

        if (mode === '1' && (!result.data[subnetKey] || result.data[subnetKey] === '')) {
          result.data[subnetKey] = '64';
        }
      }
    });
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {// Response handled by Form
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = networks.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = networks.validateRules; // Form validation rules

    Form.cbBeforeSendForm = networks.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = networks.cbAfterSendForm; // Callback after form is sent

    Form.inline = true; // Show inline errors next to fields
    // Configure REST API

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = NetworkAPI;
    Form.apiSettings.saveMethod = 'saveConfig'; // Important settings for correct save modes operation

    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "network/index/");
    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "network/modify/");
    Form.initialize();
  },

  /**
   * Load network configuration via REST API
   */
  loadConfiguration: function loadConfiguration() {
    NetworkAPI.getConfig(function (response) {
      if (response.result && response.data) {
        networks.populateForm(response.data); // Initialize UI after loading data

        networks.toggleDisabledFieldClass(); // Hide form elements connected with non docker installations

        if (response.data.isDocker) {
          networks.$formObj.form('set value', 'is-docker', '1');
          networks.$notShowOnDockerDivs.hide();
        }
      } else {
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Show Docker network info as read-only
   * DEPRECATED: Docker now uses same interface tabs as regular installation
   */
  showDockerNetworkInfo: function showDockerNetworkInfo(data) {
    // This function is no longer used - Docker uses createInterfaceTabs instead
    console.warn('showDockerNetworkInfo is deprecated');
  },

  /**
   * Convert CIDR notation to dotted decimal netmask
   */
  cidrToNetmask: function cidrToNetmask(cidr) {
    var mask = ~(Math.pow(2, 32 - cidr) - 1);
    return [mask >>> 24 & 255, mask >>> 16 & 255, mask >>> 8 & 255, mask & 255].join('.');
  },

  /**
   * Create interface tabs and forms dynamically from REST API data
   * @param {Object} data - Interface data from API
   * @param {boolean} isDocker - Whether running in Docker environment
   */
  createInterfaceTabs: function createInterfaceTabs(data) {
    var isDocker = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    var $menu = $('#eth-interfaces-menu');
    var $content = $('#eth-interfaces-content'); // Clear existing content

    $menu.empty();
    $content.empty(); // Create tabs for existing interfaces

    data.interfaces.forEach(function (iface, index) {
      var tabId = iface.id;
      var tabLabel = "".concat(iface.name || iface["interface"], " (").concat(iface["interface"]).concat(iface.vlanid !== '0' && iface.vlanid !== 0 ? ".".concat(iface.vlanid) : '', ")");
      var isActive = index === 0; // Create tab menu item

      $menu.append("\n                <a class=\"item ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(tabId, "\">\n                    ").concat(tabLabel, "\n                </a>\n            ")); // Create tab content
      // Only VLAN interfaces can be deleted (vlanid > 0)
      // In Docker, disable delete for all interfaces

      var canDelete = !isDocker && parseInt(iface.vlanid, 10) > 0;
      var deleteButton = canDelete ? "\n                <a class=\"ui icon left labeled button delete-interface\" data-value=\"".concat(tabId, "\">\n                    <i class=\"icon trash\"></i>").concat(globalTranslate.nw_DeleteCurrentInterface, "\n                </a>\n            ") : '';
      $content.append(networks.createInterfaceForm(iface, isActive, deleteButton, isDocker));
    }); // Create template tab for new VLAN (not for Docker)

    if (data.template && !isDocker) {
      var template = data.template;
      template.id = 0; // Add "+" tab menu item

      $menu.append("\n                <a class=\"item\" data-tab=\"0\">\n                    <i class=\"icon plus\"></i>\n                </a>\n            "); // Create template form with interface selector

      $content.append(networks.createTemplateForm(template, data.interfaces)); // Build interface selector dropdown for template

      var physicalInterfaces = {};
      data.interfaces.forEach(function (iface) {
        if (!physicalInterfaces[iface["interface"]]) {
          physicalInterfaces[iface["interface"]] = {
            value: iface.id.toString(),
            text: iface["interface"],
            name: iface["interface"]
          };
        }
      });
      var physicalInterfaceOptions = Object.values(physicalInterfaces);
      DynamicDropdownBuilder.buildDropdown('interface_0', {
        interface_0: ''
      }, {
        staticOptions: physicalInterfaceOptions,
        placeholder: globalTranslate.nw_SelectInterface,
        allowEmpty: true
      });
    } // Initialize subnet dropdowns using DynamicDropdownBuilder


    data.interfaces.forEach(function (iface) {
      var fieldName = "subnet_".concat(iface.id);
      var formData = {}; // Convert subnet to string for dropdown matching

      formData[fieldName] = String(iface.subnet || '24');
      DynamicDropdownBuilder.buildDropdown(fieldName, formData, {
        staticOptions: networks.getSubnetOptionsArray(),
        placeholder: globalTranslate.nw_SelectNetworkMask,
        allowEmpty: false,
        additionalClasses: ['search'] // Add search class for searchable dropdown

      }); // Initialize IPv6 mode dropdown (Off/Auto/Manual)

      var ipv6ModeFieldName = "ipv6_mode_".concat(iface.id);
      var ipv6ModeFormData = {};
      ipv6ModeFormData[ipv6ModeFieldName] = String(iface.ipv6_mode || '0');
      DynamicDropdownBuilder.buildDropdown(ipv6ModeFieldName, ipv6ModeFormData, {
        staticOptions: [{
          value: '0',
          text: globalTranslate.nw_IPv6ModeOff || 'Off'
        }, {
          value: '1',
          text: globalTranslate.nw_IPv6ModeAuto || 'Auto (SLAAC/DHCPv6)'
        }, {
          value: '2',
          text: globalTranslate.nw_IPv6ModeManual || 'Manual'
        }],
        placeholder: globalTranslate.nw_SelectIPv6Mode || 'Select IPv6 Mode',
        allowEmpty: false,
        onChange: function onChange() {
          networks.toggleIPv6Fields(iface.id);
          Form.dataChanged();
        }
      }); // Initialize IPv6 subnet dropdown

      var ipv6SubnetFieldName = "ipv6_subnet_".concat(iface.id);
      var ipv6SubnetFormData = {};
      ipv6SubnetFormData[ipv6SubnetFieldName] = String(iface.ipv6_subnet || '64');
      DynamicDropdownBuilder.buildDropdown(ipv6SubnetFieldName, ipv6SubnetFormData, {
        staticOptions: networks.getIpv6SubnetOptionsArray(),
        placeholder: globalTranslate.nw_SelectIPv6Subnet || 'Select IPv6 Prefix',
        allowEmpty: false,
        additionalClasses: ['search']
      }); // Set initial visibility of IPv6 manual fields

      networks.toggleIPv6Fields(iface.id);
    }); // Initialize subnet dropdown for template (id = 0)

    if (data.template) {
      DynamicDropdownBuilder.buildDropdown('subnet_0', {
        subnet_0: '24'
      }, {
        staticOptions: networks.getSubnetOptionsArray(),
        placeholder: globalTranslate.nw_SelectNetworkMask,
        allowEmpty: false,
        additionalClasses: ['search'] // Add search class for searchable dropdown

      });
    } // Initialize tabs


    $('#eth-interfaces-menu .item').tab();
    $('#eth-interfaces-menu .item').first().trigger('click'); // Update static routes section visibility

    StaticRoutesManager.updateVisibility(); // Re-bind delete button handlers
    // Delete button removes TAB from form and marks interface as disabled
    // Actual deletion happens on form submit

    $('.delete-interface').off('click').on('click', function (e) {
      e.preventDefault();
      var $button = $(this);
      var interfaceId = $button.attr('data-value'); // Remove the TAB menu item

      $("#eth-interfaces-menu a[data-tab=\"".concat(interfaceId, "\"]")).remove(); // Remove the TAB content

      var $tabContent = $("#eth-interfaces-content .tab[data-tab=\"".concat(interfaceId, "\"]"));
      $tabContent.remove(); // Add hidden field to mark this interface as disabled

      networks.$formObj.append("<input type=\"hidden\" name=\"disabled_".concat(interfaceId, "\" value=\"1\" />")); // Switch to first available tab

      var $firstTab = $('#eth-interfaces-menu a.item').first();

      if ($firstTab.length > 0) {
        $firstTab.tab('change tab', $firstTab.attr('data-tab'));
      } // Mark form as changed to enable submit button


      if (Form.enableDirrity) {
        Form.checkValues();
      }
    }); // Re-bind DHCP checkbox handlers

    $('.dhcp-checkbox').checkbox({
      onChange: function onChange() {
        networks.toggleDisabledFieldClass();
      }
    }); // Re-bind IP address input masks

    $('.ipaddress').inputmask({
      alias: 'ip',
      'placeholder': '_'
    }); // Add VLAN ID change handlers to control DHCP checkbox state

    $('input[name^="vlanid_"]').off('input change').on('input change', function () {
      var $vlanInput = $(this);
      var interfaceId = $vlanInput.attr('name').replace('vlanid_', '');
      var vlanValue = parseInt($vlanInput.val(), 10) || 0;
      var $dhcpCheckbox = $("#dhcp-".concat(interfaceId, "-checkbox"));

      if (vlanValue > 0) {
        // Disable DHCP checkbox for VLAN interfaces
        $dhcpCheckbox.addClass('disabled');
        $dhcpCheckbox.checkbox('uncheck');
        $dhcpCheckbox.checkbox('set disabled');
        $dhcpCheckbox.find('input').prop('disabled', true);
      } else {
        // Enable DHCP checkbox for non-VLAN interfaces
        $dhcpCheckbox.removeClass('disabled');
        $dhcpCheckbox.checkbox('set enabled');
        $dhcpCheckbox.find('input').prop('disabled', false);
      } // Update disabled field classes


      networks.toggleDisabledFieldClass();
    }); // Trigger the handler for existing VLAN interfaces to apply initial state

    $('input[name^="vlanid_"]').trigger('change'); // Initialize internet radio buttons with Fomantic UI

    $('.internet-radio').checkbox(); // Add internet radio button change handler

    $('input[name="internet_interface"]').off('change').on('change', function () {
      var selectedInterfaceId = $(this).val(); // Hide all DNS/Gateway groups

      $('[class^="dns-gateway-group-"]').hide(); // Show DNS/Gateway group for selected internet interface

      $(".dns-gateway-group-".concat(selectedInterfaceId)).show(); // Update TAB icons - add globe icon to selected, remove from others

      $('#eth-interfaces-menu a').each(function (index, tab) {
        var $tab = $(tab);
        var tabId = $tab.attr('data-tab'); // Remove existing globe icon

        $tab.find('.globe.icon').remove(); // Add globe icon to selected internet interface TAB

        if (tabId === selectedInterfaceId) {
          $tab.prepend('<i class="globe icon"></i>');
        }
      }); // Mark form as changed

      if (Form.enableDirrity) {
        Form.checkValues();
      }
    }); // Update DNS/Gateway readonly state when DHCP changes

    $('.dhcp-checkbox').off('change.dnsgateway').on('change.dnsgateway', function () {
      var $checkbox = $(this);
      var interfaceId = $checkbox.attr('id').replace('dhcp-', '').replace('-checkbox', '');
      var isDhcpEnabled = $checkbox.checkbox('is checked'); // Find DNS/Gateway fields for this interface

      var $dnsGatewayGroup = $(".dns-gateway-group-".concat(interfaceId));
      var $dnsGatewayFields = $dnsGatewayGroup.find('input[name^="gateway_"], input[name^="primarydns_"], input[name^="secondarydns_"]');
      var $dhcpInfoMessage = $(".dhcp-info-message-".concat(interfaceId));

      if (isDhcpEnabled) {
        // DHCP enabled -> make DNS/Gateway read-only
        $dnsGatewayFields.prop('readonly', true);
        $dnsGatewayFields.closest('.field').addClass('disabled');
        $dhcpInfoMessage.show();
      } else {
        // DHCP disabled -> make DNS/Gateway editable
        $dnsGatewayFields.prop('readonly', false);
        $dnsGatewayFields.closest('.field').removeClass('disabled');
        $dhcpInfoMessage.hide();
      } // Update dual-stack NAT logic when DHCP changes


      networks.updateDualStackNatLogic();
    }); // Trigger initial TAB icon update for checked radio button

    var $checkedRadio = $('input[name="internet_interface"]:checked');

    if ($checkedRadio.length > 0) {
      $checkedRadio.trigger('change');
    } // Apply initial disabled state for DHCP-enabled interfaces
    // Call after all dropdowns are created


    networks.toggleDisabledFieldClass(); // Re-save initial form values and re-bind event handlers for dynamically created inputs
    // This is essential for form change detection to work with dynamic tabs

    if (Form.enableDirrity) {
      // Override Form methods to manually collect all field values (including from tabs)
      var originalSaveInitialValues = Form.saveInitialValues;
      var originalCheckValues = Form.checkValues;

      Form.saveInitialValues = function () {
        // Get values from Fomantic UI (may miss dynamically created tab fields)
        var fomanticValues = networks.$formObj.form('get values'); // Manually collect all field values to catch fields that Fomantic UI misses

        var manualValues = {};
        networks.$formObj.find('input, select, textarea').each(function () {
          var $field = $(this);
          var name = $field.attr('name') || $field.attr('id');

          if (name) {
            if ($field.attr('type') === 'checkbox') {
              manualValues[name] = $field.is(':checked');
            } else if ($field.attr('type') === 'radio') {
              if ($field.is(':checked')) {
                manualValues[name] = $field.val();
              }
            } else {
              manualValues[name] = $field.val();
            }
          }
        }); // Merge both (manual values override Fomantic values for fields that exist in both)

        Form.oldFormValues = Object.assign({}, fomanticValues, manualValues);
      };

      Form.checkValues = function () {
        // Get values from Fomantic UI
        var fomanticValues = networks.$formObj.form('get values'); // Manually collect all field values

        var manualValues = {};
        networks.$formObj.find('input, select, textarea').each(function () {
          var $field = $(this);
          var name = $field.attr('name') || $field.attr('id');

          if (name) {
            if ($field.attr('type') === 'checkbox') {
              manualValues[name] = $field.is(':checked');
            } else if ($field.attr('type') === 'radio') {
              if ($field.is(':checked')) {
                manualValues[name] = $field.val();
              }
            } else {
              manualValues[name] = $field.val();
            }
          }
        }); // Merge both

        var newFormValues = Object.assign({}, fomanticValues, manualValues);

        if (JSON.stringify(Form.oldFormValues) === JSON.stringify(newFormValues)) {
          Form.$submitButton.addClass('disabled');
          Form.$dropdownSubmit.addClass('disabled');
        } else {
          Form.$submitButton.removeClass('disabled');
          Form.$dropdownSubmit.removeClass('disabled');
        }
      };

      if (typeof Form.saveInitialValues === 'function') {
        Form.saveInitialValues();
      }

      if (typeof Form.setEvents === 'function') {
        Form.setEvents();
      }
    }
  },

  /**
   * Create form for existing interface
   * @param {Object} iface - Interface data
   * @param {boolean} isActive - Whether this tab is active
   * @param {string} deleteButton - HTML for delete button
   * @param {boolean} isDocker - Whether running in Docker environment
   */
  createInterfaceForm: function createInterfaceForm(iface, isActive, deleteButton) {
    var isDocker = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    var id = iface.id;
    var isInternetInterface = iface.internet || false; // DNS/Gateway fields visibility and read-only state

    var dnsGatewayVisible = isInternetInterface ? '' : 'style="display:none;"'; // In Docker: Gateway is always readonly, DNS fields are editable
    // In regular mode: All fields readonly if DHCP enabled

    var gatewayReadonly = isDocker || iface.dhcp ? 'readonly' : '';
    var gatewayDisabledClass = isDocker || iface.dhcp ? 'disabled' : '';
    var dnsReadonly = isDocker ? '' : iface.dhcp ? 'readonly' : '';
    var dnsDisabledClass = isDocker ? '' : iface.dhcp ? 'disabled' : ''; // IPv6 Gateway: readonly when ipv6_mode='1' (Auto/SLAAC), editable when ipv6_mode='2' (Manual) or '0' (Off)

    var ipv6GatewayReadonly = iface.ipv6_mode === '1' ? 'readonly' : '';
    var ipv6GatewayDisabledClass = iface.ipv6_mode === '1' ? 'disabled' : ''; // IPv6 fields visibility: hide when ipv6_mode='0' (Off), show when '1' (Auto) or '2' (Manual)

    var ipv6FieldsVisible = iface.ipv6_mode === '0' ? 'style="display:none;"' : ''; // In Docker: IP, subnet, VLAN are readonly

    var dockerReadonly = isDocker ? 'readonly' : '';
    var dockerDisabledClass = isDocker ? 'disabled' : ''; // In Docker: DHCP checkbox is disabled and always checked

    var dhcpDisabled = isDocker || iface.vlanid > 0;
    var dhcpChecked = isDocker || (iface.vlanid > 0 ? false : iface.dhcp);
    return "\n            <div class=\"ui bottom attached tab segment ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(id, "\">\n                <input type=\"hidden\" name=\"interface_").concat(id, "\" value=\"").concat(iface["interface"], "\" />\n\n                ").concat(isDocker ? "\n                <input type=\"hidden\" name=\"name_".concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                <input type=\"hidden\" name=\"internet_interface\" value=\"").concat(id, "\" />\n                <input type=\"hidden\" name=\"dhcp_").concat(id, "\" value=\"on\" />\n                <input type=\"hidden\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                <input type=\"hidden\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '24', "\" />\n                ") : "\n                <div class=\"field\">\n                    <label>".concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox internet-radio\" id=\"internet-").concat(id, "-radio\">\n                            <input type=\"radio\" name=\"internet_interface\" value=\"").concat(id, "\" ").concat(isInternetInterface ? 'checked' : '', " />\n                            <label><i class=\"globe icon\"></i> ").concat(globalTranslate.nw_InternetInterface || 'Internet Interface', "</label>\n                        </div>\n                    </div>\n                </div>\n                "), "\n\n                ").concat(isDocker ? '' : "\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox".concat(dhcpDisabled ? ' disabled' : '', "\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" ").concat(dhcpChecked ? 'checked' : '', " ").concat(dhcpDisabled ? 'disabled' : '', " />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n                "), "\n\n                <div class=\"dhcp-info-message-").concat(id, "\" style=\"display: ").concat(dhcpChecked ? 'block' : 'none', ";\">\n                    <div class=\"ui compact info message\">\n                        <div class=\"content\">\n                            <div class=\"header\">").concat(globalTranslate.nw_DHCPInfoHeader || 'DHCP Configuration Obtained', "</div>\n                            <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                <li>").concat(globalTranslate.nw_DHCPInfoIP || 'IP Address', ": <strong>").concat(iface.currentIpaddr || iface.ipaddr || 'N/A', "</strong></li>\n                                <li>").concat(globalTranslate.nw_DHCPInfoSubnet || 'Subnet', ": <strong>/").concat(iface.currentSubnet || iface.subnet || 'N/A', "</strong></li>\n                                <li>").concat(globalTranslate.nw_DHCPInfoGateway || 'Gateway', ": <strong>").concat(iface.currentGateway || iface.gateway || 'N/A', "</strong></li>\n                                <li>").concat(globalTranslate.nw_DHCPInfoDNS || 'DNS', ": <strong>").concat(iface.primarydns || 'N/A').concat(iface.secondarydns ? ', ' + iface.secondarydns : '', "</strong></li>\n                                ").concat(iface.domain ? "<li>".concat(globalTranslate.nw_DHCPInfoDomain || 'Domain', ": <strong>").concat(iface.domain, "</strong></li>") : '', "\n                                ").concat(iface.hostname ? "<li>".concat(globalTranslate.nw_DHCPInfoHostname || 'Hostname', ": <strong>").concat(iface.hostname, "</strong></li>") : '', "\n                            </ul>\n                        </div>\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                ").concat(isDocker ? '' : "\n                <div class=\"fields\" id=\"ip-address-group-".concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" ").concat(dockerReadonly, " />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '', "\" />\n                        </div>\n                    </div>\n                </div>\n                "), "\n\n                ").concat(isDocker ? '' : "\n                <div class=\"field\">\n                    <label>".concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"").concat(iface.vlanid || '0', "\" />\n                    </div>\n                </div>\n                "), "\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_IPv6Mode || 'IPv6 Mode', "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"hidden\" id=\"ipv6_mode_").concat(id, "\" name=\"ipv6_mode_").concat(id, "\" value=\"").concat(iface.ipv6_mode || '0', "\" />\n                    </div>\n                </div>\n\n                <div class=\"ipv6-auto-info-message-").concat(id, "\" style=\"display: ").concat(iface.ipv6_mode === '1' ? 'block' : 'none', ";\">\n                    <div class=\"ui compact info message\">\n                        <div class=\"content\">\n                            <div class=\"header\">").concat(globalTranslate.nw_IPv6AutoInfoHeader || 'IPv6 Autoconfiguration (SLAAC/DHCPv6)', "</div>\n                            <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                <li>").concat(globalTranslate.nw_IPv6AutoInfoAddress || 'IPv6 Address', ": <strong>").concat(iface.currentIpv6addr || iface.ipv6addr || 'Autoconfigured', "</strong></li>\n                                <li>").concat(globalTranslate.nw_IPv6AutoInfoPrefix || 'Prefix Length', ": <strong>/").concat(iface.currentIpv6_subnet || iface.ipv6_subnet || '64', "</strong></li>\n                                ").concat(iface.currentIpv6_gateway || iface.ipv6_gateway ? "<li>".concat(globalTranslate.nw_IPv6AutoInfoGateway || 'Gateway', ": <strong>").concat(iface.currentIpv6_gateway || iface.ipv6_gateway, "</strong></li>") : '', "\n                                ").concat(iface.currentPrimarydns6 || iface.primarydns6 ? "<li>".concat(globalTranslate.nw_IPv6AutoInfoDNS || 'DNS', ": <strong>").concat(iface.currentPrimarydns6 || iface.primarydns6).concat(iface.currentSecondarydns6 || iface.secondarydns6 ? ', ' + (iface.currentSecondarydns6 || iface.secondarydns6) : '', "</strong></li>") : '', "\n                            </ul>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"ipv6-manual-fields-").concat(id, "\" style=\"display: none;\">\n                    <div class=\"fields\">\n                        <div class=\"five wide field\">\n                            <label>").concat(globalTranslate.nw_IPv6Address || 'IPv6 Address', "</label>\n                            <div class=\"field max-width-600\">\n                                <input type=\"text\" class=\"ipv6address\" name=\"ipv6addr_").concat(id, "\" value=\"").concat(iface.ipv6addr || '', "\" placeholder=\"fd00::1\" />\n                            </div>\n                        </div>\n                        <div class=\"field\">\n                            <label>").concat(globalTranslate.nw_IPv6Subnet || 'IPv6 Prefix Length', "</label>\n                            <div class=\"field max-width-400\">\n                                <input type=\"hidden\" id=\"ipv6_subnet_").concat(id, "\" name=\"ipv6_subnet_").concat(id, "\" value=\"").concat(iface.ipv6_subnet || '64', "\" />\n                            </div>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"dns-gateway-group-").concat(id, "\" ").concat(dnsGatewayVisible, ">\n                    <div class=\"ui horizontal divider\">").concat(globalTranslate.nw_InternetSettings || 'Internet Settings', "</div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Hostname || 'Hostname', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" name=\"hostname_").concat(id, "\" value=\"").concat(iface.hostname || '', "\" placeholder=\"mikopbx\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Domain || 'Domain', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" name=\"domain_").concat(id, "\" value=\"").concat(iface.domain || '', "\" placeholder=\"example.com\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_Gateway, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"gateway_").concat(id, "\" value=\"").concat(iface.gateway || '', "\" ").concat(gatewayReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field ipv6-gateway-field-").concat(id, "\" ").concat(ipv6FieldsVisible, ">\n                        <label>").concat(globalTranslate.nw_IPv6Gateway || 'IPv6 Gateway', "</label>\n                        <div class=\"field max-width-400 ").concat(ipv6GatewayDisabledClass, "\">\n                            <input type=\"text\" class=\"ipv6address\" name=\"ipv6_gateway_").concat(id, "\" value=\"").concat(iface.currentIpv6_gateway || iface.ipv6_gateway || '', "\" ").concat(ipv6GatewayReadonly, " placeholder=\"fe80::1\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_PrimaryDNS, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"primarydns_").concat(id, "\" value=\"").concat(iface.primarydns || '', "\" ").concat(dnsReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_SecondaryDNS, "</label>\n                        <div class=\"field max-width-400 ").concat(dnsDisabledClass, "\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"secondarydns_").concat(id, "\" value=\"").concat(iface.secondarydns || '', "\" ").concat(dnsReadonly, " />\n                        </div>\n                    </div>\n\n                    <div class=\"field ipv6-primarydns-field-").concat(id, "\" ").concat(ipv6FieldsVisible, ">\n                        <label>").concat(globalTranslate.nw_IPv6PrimaryDNS || 'Primary IPv6 DNS', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipv6address\" name=\"primarydns6_").concat(id, "\" value=\"").concat(iface.currentPrimarydns6 || iface.primarydns6 || '', "\" placeholder=\"2001:4860:4860::8888\" />\n                        </div>\n                    </div>\n\n                    <div class=\"field ipv6-secondarydns-field-").concat(id, "\" ").concat(ipv6FieldsVisible, ">\n                        <label>").concat(globalTranslate.nw_IPv6SecondaryDNS || 'Secondary IPv6 DNS', "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipv6address\" name=\"secondarydns6_").concat(id, "\" value=\"").concat(iface.currentSecondarydns6 || iface.secondarydns6 || '', "\" placeholder=\"2001:4860:4860::8844\" />\n                        </div>\n                    </div>\n                </div>\n\n                ").concat(deleteButton, "\n            </div>\n        ");
  },

  /**
   * Create form for new VLAN template
   */
  createTemplateForm: function createTemplateForm(template, interfaces) {
    var id = 0;
    return "\n            <div class=\"ui bottom attached tab segment\" data-tab=\"".concat(id, "\">\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_SelectInterface, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"hidden\" name=\"interface_").concat(id, "\" id=\"interface_").concat(id, "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" id=\"name_").concat(id, "\" value=\"\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" checked />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                <div class=\"fields\" id=\"ip-address-group-").concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"\" />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"24\" />\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"4095\" />\n                    </div>\n                </div>\n            </div>\n        ");
  },

  /**
   * Get IPv6 subnet prefix options array for DynamicDropdownBuilder
   * @returns {Array} Array of IPv6 subnet prefix options (/1 to /128)
   */
  getIpv6SubnetOptionsArray: function getIpv6SubnetOptionsArray() {
    var options = []; // Generate /1 to /128 (common: /64, /48, /56, /128)

    for (var i = 128; i >= 1; i--) {
      var description = "/".concat(i); // Add descriptions for common prefixes

      if (i === 128) description += ' (Single host)';else if (i === 64) description += ' (Standard subnet)';else if (i === 56) description += ' (Small network)';else if (i === 48) description += ' (Large network)';else if (i === 32) description += ' (ISP assignment)';
      options.push({
        value: i.toString(),
        text: description
      });
    }

    return options;
  },

  /**
   * Get subnet mask options array for DynamicDropdownBuilder
   * @returns {Array} Array of subnet mask options
   */
  getSubnetOptionsArray: function getSubnetOptionsArray() {
    // Network masks from Cidr::getNetMasks() (krsort SORT_NUMERIC)
    return [{
      value: '32',
      text: '32 - 255.255.255.255'
    }, {
      value: '31',
      text: '31 - 255.255.255.254'
    }, {
      value: '30',
      text: '30 - 255.255.255.252'
    }, {
      value: '29',
      text: '29 - 255.255.255.248'
    }, {
      value: '28',
      text: '28 - 255.255.255.240'
    }, {
      value: '27',
      text: '27 - 255.255.255.224'
    }, {
      value: '26',
      text: '26 - 255.255.255.192'
    }, {
      value: '25',
      text: '25 - 255.255.255.128'
    }, {
      value: '24',
      text: '24 - 255.255.255.0'
    }, {
      value: '23',
      text: '23 - 255.255.255.254'
    }, {
      value: '22',
      text: '22 - 255.255.252.0'
    }, {
      value: '21',
      text: '21 - 255.255.248.0'
    }, {
      value: '20',
      text: '20 - 255.255.240.0'
    }, {
      value: '19',
      text: '19 - 255.255.224.0'
    }, {
      value: '18',
      text: '18 - 255.255.192.0'
    }, {
      value: '17',
      text: '17 - 255.255.128.0'
    }, {
      value: '16',
      text: '16 - 255.255.0.0'
    }, {
      value: '15',
      text: '15 - 255.254.0.0'
    }, {
      value: '14',
      text: '14 - 255.252.0.0'
    }, {
      value: '13',
      text: '13 - 255.248.0.0'
    }, {
      value: '12',
      text: '12 - 255.240.0.0'
    }, {
      value: '11',
      text: '11 - 255.224.0.0'
    }, {
      value: '10',
      text: '10 - 255.192.0.0'
    }, {
      value: '9',
      text: '9 - 255.128.0.0'
    }, {
      value: '8',
      text: '8 - 255.0.0.0'
    }, {
      value: '7',
      text: '7 - 254.0.0.0'
    }, {
      value: '6',
      text: '6 - 252.0.0.0'
    }, {
      value: '5',
      text: '5 - 248.0.0.0'
    }, {
      value: '4',
      text: '4 - 240.0.0.0'
    }, {
      value: '3',
      text: '3 - 224.0.0.0'
    }, {
      value: '2',
      text: '2 - 192.0.0.0'
    }, {
      value: '1',
      text: '1 - 128.0.0.0'
    }, {
      value: '0',
      text: '0 - 0.0.0.0'
    }];
  },

  /**
   * Populate form with configuration data
   */
  populateForm: function populateForm(data) {
    // WHY: Both Docker and non-Docker now use interface tabs
    // Docker has restrictions: DHCP locked, IP/subnet/VLAN readonly, DNS editable
    networks.createInterfaceTabs(data, data.isDocker || false); // Set NAT settings

    if (data.nat) {
      // Boolean values from API
      if (data.nat.usenat) {
        $('#usenat-checkbox').checkbox('check');
      } else {
        $('#usenat-checkbox').checkbox('uncheck');
      }

      networks.$formObj.form('set value', 'extipaddr', data.nat.extipaddr || '');
      networks.$formObj.form('set value', 'exthostname', data.nat.exthostname || ''); // autoUpdateExternalIp boolean (field name from the form)

      var $autoUpdateCheckbox = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');

      if ($autoUpdateCheckbox.length > 0) {
        if (data.nat.AUTO_UPDATE_EXTERNAL_IP || data.nat.autoUpdateExternalIp) {
          $autoUpdateCheckbox.checkbox('check');
        } else {
          $autoUpdateCheckbox.checkbox('uncheck');
        }
      }
    } // Set port settings


    if (data.ports) {
      // WHY: No mapping needed - API returns keys matching form field names
      // (e.g., 'externalSIPPort' from PbxSettings::EXTERNAL_SIP_PORT constant)
      Object.keys(data.ports).forEach(function (key) {
        var value = data.ports[key];
        networks.$formObj.form('set value', key, value);
      }); // Update the NAT help text and labels with actual port values

      networks.updateNATHelpText(data.ports);
      networks.updatePortLabels(data.ports);
    } // Set additional settings


    if (data.settings) {
      Object.keys(data.settings).forEach(function (key) {
        networks.$formObj.form('set value', key, data.settings[key]);
      });
    } // Store available interfaces for static routes FIRST (before loading routes)


    if (data.availableInterfaces) {
      StaticRoutesManager.availableInterfaces = data.availableInterfaces;
    } // Load static routes AFTER availableInterfaces are set


    if (data.staticRoutes) {
      StaticRoutesManager.loadRoutes(data.staticRoutes);
    } // Re-initialize dirty checking after population is complete
    // This ensures the button is disabled and all dynamically created fields are tracked


    if (Form.enableDirrity) {
      Form.initializeDirrity();
    }
  }
};
/**
 * Custom form validation rule for checking if the value is a valid IP address.
 * @param {string} value - The value to validate as an IP address.
 * @returns {boolean} - True if the value is a valid IP address, false otherwise.
 */

$.fn.form.settings.rules.ipaddr = function (value) {
  var result = true;
  var f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (f == null) {
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
};
/**
 * Custom form validation rule for checking if the value is a valid IPv6 address.
 * @param {string} value - The value to validate as an IPv6 address.
 * @returns {boolean} - True if the value is a valid IPv6 address, false otherwise.
 */


$.fn.form.settings.rules.ipv6addr = function (value) {
  // IPv6 regex pattern
  // Supports full form, compressed form (::), IPv4-mapped (::ffff:192.0.2.1), link-local (fe80::1%eth0)
  var ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  return ipv6Pattern.test(value);
};
/**
 * Custom form validation rule for checking if the value is a valid IP address (IPv4 or IPv6).
 * @param {string} value - The value to validate as an IP address.
 * @returns {boolean} - True if the value is a valid IPv4 or IPv6 address, false otherwise.
 */


$.fn.form.settings.rules.ipaddress = function (value) {
  return $.fn.form.settings.rules.ipaddr(value) || $.fn.form.settings.rules.ipv6addr(value);
};
/**
 * Custom form validation rule for checking if the value is a valid IP address with an optional port.
 * @param {string} value - The value to validate as an IP address with an optional port.
 * @returns {boolean} - True if the value is a valid IP address with an optional port, false otherwise.
 */


$.fn.form.settings.rules.ipaddrWithPortOptional = function (value) {
  var result = true;
  var f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(:[0-9]+)?$/);

  if (f == null) {
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
};
/**
 * Custom form validation rule for checking if the VLAN ID is unique for a given interface.
 * @param {string} vlanValue - The value of the VLAN ID input field.
 * @param {string} param - The parameter for the rule.
 * @returns {boolean} - True if the VLAN ID is unique for the interface, false otherwise.
 */


$.fn.form.settings.rules.checkVlan = function (vlanValue, param) {
  var result = true;
  var vlansArray = {};
  var allValues = networks.$formObj.form('get values');

  if (allValues.interface_0 !== undefined && allValues.interface_0 > 0) {
    var newEthName = allValues["interface_".concat(allValues.interface_0)];
    vlansArray[newEthName] = [allValues.vlanid_0];

    if (allValues.vlanid_0 === '') {
      result = false;
    }
  }

  $.each(allValues, function (index, value) {
    if (index === 'interface_0' || index === 'vlanid_0') return;

    if (index.indexOf('vlanid') >= 0) {
      var ethName = allValues["interface_".concat(index.split('_')[1])];

      if ($.inArray(value, vlansArray[ethName]) >= 0 && vlanValue === value && param === index.split('_')[1]) {
        result = false;
      } else {
        if (!(ethName in vlansArray)) {
          vlansArray[ethName] = [];
        }

        vlansArray[ethName].push(value);
      }
    }
  });
  return result;
}; // DHCP validation rule removed - DHCP checkbox is disabled for VLAN interfaces, no validation needed

/**
 * Custom form validation rule for checking the presence of external IP host information.
 * @returns {boolean} - True if the external IP host information is provided when NAT is enabled, false otherwise.
 */


$.fn.form.settings.rules.extenalIpHost = function () {
  var allValues = networks.$formObj.form('get values');

  if (allValues.usenat === 'on') {
    if (allValues.exthostname === '' && allValues.extipaddr === '') {
      return false;
    }
  }

  return true;
};
/**
 * Custom form validation rule for checking if value is a valid hostname
 * @param {string} value - The value to validate as hostname
 * @returns {boolean} - True if valid hostname, false otherwise
 */


$.fn.form.settings.rules.validHostname = function (value) {
  if (!value || value === '') {
    return true; // Empty is handled by extenalIpHost rule
  } // RFC 952/RFC 1123 hostname validation
  // - Labels separated by dots
  // - Each label 1-63 chars
  // - Only alphanumeric and hyphens
  // - Cannot start/end with hyphen
  // - Total length max 253 chars


  var hostnameRegex = /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63}(?<!-))*$/;
  return hostnameRegex.test(value);
};
/**
 * Static Routes Manager Module
 *
 * Manages static route configuration when multiple network interfaces exist
 */


var StaticRoutesManager = {
  $table: $('#static-routes-table'),
  $section: $('#static-routes-section'),
  $addButton: $('#add-new-route'),
  $tableContainer: null,
  $emptyPlaceholder: null,
  routes: [],
  availableInterfaces: [],
  // Will be populated from REST API

  /**
   * Initialize static routes management
   */
  initialize: function initialize() {
    // Cache elements
    StaticRoutesManager.$emptyPlaceholder = $('#static-routes-empty-placeholder');
    StaticRoutesManager.$tableContainer = $('#static-routes-table-container'); // Hide section if less than 2 interfaces

    StaticRoutesManager.updateVisibility(); // Initialize drag-and-drop

    StaticRoutesManager.initializeDragAndDrop(); // Add button handler

    StaticRoutesManager.$addButton.on('click', function (e) {
      e.preventDefault();
      StaticRoutesManager.addRoute();
    }); // Add first route button handler (in empty placeholder)

    $(document).on('click', '#add-first-route-button', function (e) {
      e.preventDefault();
      StaticRoutesManager.addRoute();
    }); // Delete button handler (delegated)

    StaticRoutesManager.$table.on('click', '.delete-route-button', function (e) {
      e.preventDefault();
      $(e.target).closest('tr').remove();
      StaticRoutesManager.updatePriorities();
      StaticRoutesManager.updateEmptyState();
      Form.dataChanged();
    }); // Copy button handler (delegated)

    StaticRoutesManager.$table.on('click', '.copy-route-button', function (e) {
      e.preventDefault();
      var $sourceRow = $(e.target).closest('tr');
      StaticRoutesManager.copyRoute($sourceRow);
    }); // Input change handlers

    StaticRoutesManager.$table.on('input change', '.network-input, .gateway-input, .description-input', function () {
      Form.dataChanged();
    }); // Paste handlers for IP address fields (enable clipboard paste with inputmask)

    StaticRoutesManager.$table.on('paste', '.network-input, .gateway-input', function (e) {
      e.preventDefault(); // Get pasted data from clipboard

      var pastedData = '';

      if (e.originalEvent && e.originalEvent.clipboardData && e.originalEvent.clipboardData.getData) {
        pastedData = e.originalEvent.clipboardData.getData('text');
      } else if (e.clipboardData && e.clipboardData.getData) {
        pastedData = e.clipboardData.getData('text');
      } else if (window.clipboardData && window.clipboardData.getData) {
        pastedData = window.clipboardData.getData('text'); // For IE
      } // Clean the pasted data (remove extra spaces, keep only valid IP characters)


      var cleanedData = pastedData.trim().replace(/[^0-9.]/g, ''); // Get the input element

      var $input = $(this); // Temporarily remove mask

      $input.inputmask('remove'); // Set the cleaned value

      $input.val(cleanedData); // Reapply the mask after a short delay

      setTimeout(function () {
        $input.inputmask({
          alias: 'ip',
          placeholder: '_'
        });
        $input.trigger('input');
        Form.dataChanged();
      }, 10);
    });
  },

  /**
   * Initialize or reinitialize drag-and-drop functionality
   */
  initializeDragAndDrop: function initializeDragAndDrop() {
    // Destroy existing tableDnD if it exists
    if (StaticRoutesManager.$table.data('tableDnD')) {
      StaticRoutesManager.$table.tableDnDUpdate();
    } // Initialize drag-and-drop


    StaticRoutesManager.$table.tableDnD({
      onDrop: function onDrop() {
        StaticRoutesManager.updatePriorities();
        Form.dataChanged();
      },
      dragHandle: '.dragHandle'
    });
  },

  /**
   * Update visibility based on number of interfaces
   */
  updateVisibility: function updateVisibility() {
    // Show/hide section based on number of interfaces
    var interfaceCount = $('#eth-interfaces-menu a.item').not('[data-tab="0"]').length;

    if (interfaceCount > 1) {
      StaticRoutesManager.$section.show();
    } else {
      StaticRoutesManager.$section.hide();
    }
  },

  /**
   * Copy a route row (create duplicate)
   * @param {jQuery} $sourceRow - Source row to copy
   */
  copyRoute: function copyRoute($sourceRow) {
    var routeId = $sourceRow.attr('data-route-id');
    var subnetDropdownId = "subnet-route-".concat(routeId);
    var interfaceDropdownId = "interface-route-".concat(routeId); // Collect data from source row

    var routeData = {
      network: $sourceRow.find('.network-input').val(),
      subnet: $("#".concat(subnetDropdownId)).val(),
      gateway: $sourceRow.find('.gateway-input').val(),
      "interface": $("#".concat(interfaceDropdownId)).val() || '',
      description: $sourceRow.find('.description-input').val()
    }; // Add new route with copied data

    StaticRoutesManager.addRoute(routeData); // Reinitialize drag-and-drop after adding route

    StaticRoutesManager.initializeDragAndDrop();
  },

  /**
   * Update empty state visibility
   */
  updateEmptyState: function updateEmptyState() {
    var $existingRows = $('.route-row');

    if ($existingRows.length === 0) {
      // Show empty placeholder, hide table container
      StaticRoutesManager.$emptyPlaceholder.show();
      StaticRoutesManager.$tableContainer.hide();
    } else {
      // Hide empty placeholder, show table container
      StaticRoutesManager.$emptyPlaceholder.hide();
      StaticRoutesManager.$tableContainer.show();
    }
  },

  /**
   * Add a new route row
   * @param {Object} routeData - Route data (optional)
   */
  addRoute: function addRoute() {
    var routeData = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    var $template = $('.route-row-template').last();
    var $newRow = $template.clone(true);
    var routeId = (routeData === null || routeData === void 0 ? void 0 : routeData.id) || "new_".concat(Date.now());
    $newRow.removeClass('route-row-template').addClass('route-row').attr('data-route-id', routeId).show(); // Set values if provided

    if (routeData) {
      $newRow.find('.network-input').val(routeData.network);
      $newRow.find('.gateway-input').val(routeData.gateway);
      $newRow.find('.description-input').val(routeData.description || '');
    } // Add to table


    var $existingRows = $('.route-row');

    if ($existingRows.length === 0) {
      $template.after($newRow);
    } else {
      $existingRows.last().after($newRow);
    } // Initialize subnet dropdown for this row


    StaticRoutesManager.initializeSubnetDropdown($newRow, (routeData === null || routeData === void 0 ? void 0 : routeData.subnet) || '24'); // Initialize interface dropdown for this row

    StaticRoutesManager.initializeInterfaceDropdown($newRow, (routeData === null || routeData === void 0 ? void 0 : routeData["interface"]) || ''); // Initialize inputmask for IP address fields

    $newRow.find('.ipaddress').inputmask({
      alias: 'ip',
      placeholder: '_'
    });
    StaticRoutesManager.updatePriorities();
    StaticRoutesManager.updateEmptyState();
    Form.dataChanged();
  },

  /**
   * Initialize subnet dropdown for a route row
   * @param {jQuery} $row - Row element
   * @param {string} selectedValue - Selected subnet value
   */
  initializeSubnetDropdown: function initializeSubnetDropdown($row, selectedValue) {
    var $container = $row.find('.subnet-dropdown-container');
    var dropdownId = "subnet-route-".concat($row.attr('data-route-id'));
    $container.html("<input type=\"hidden\" id=\"".concat(dropdownId, "\" />"));
    DynamicDropdownBuilder.buildDropdown(dropdownId, _defineProperty({}, dropdownId, selectedValue), {
      staticOptions: networks.getSubnetOptionsArray(),
      placeholder: globalTranslate.nw_SelectNetworkMask,
      allowEmpty: false,
      additionalClasses: ['search'],
      onChange: function onChange() {
        return Form.dataChanged();
      }
    });
  },

  /**
   * Initialize interface dropdown for a route row
   * @param {jQuery} $row - Row element
   * @param {string} selectedValue - Selected interface value (empty string = auto)
   */
  initializeInterfaceDropdown: function initializeInterfaceDropdown($row, selectedValue) {
    var $container = $row.find('.interface-dropdown-container');
    var dropdownId = "interface-route-".concat($row.attr('data-route-id'));
    $container.html("<input type=\"hidden\" id=\"".concat(dropdownId, "\" />")); // Build dropdown options: "Auto" + available interfaces

    var options = [{
      value: '',
      text: globalTranslate.nw_Auto || 'Auto'
    }].concat(_toConsumableArray(StaticRoutesManager.availableInterfaces.map(function (iface) {
      return {
        value: iface.value,
        text: iface.label
      };
    }))); // Prepare form data for DynamicDropdownBuilder

    var formData = {};
    formData[dropdownId] = selectedValue || ''; // Ensure we pass empty string for "Auto"

    DynamicDropdownBuilder.buildDropdown(dropdownId, formData, {
      staticOptions: options,
      placeholder: globalTranslate.nw_SelectInterface,
      allowEmpty: false,
      onChange: function onChange() {
        return Form.dataChanged();
      }
    });
  },

  /**
   * Update route priorities based on table order
   */
  updatePriorities: function updatePriorities() {
    $('.route-row').each(function (index, row) {
      $(row).attr('data-priority', index + 1);
    });
  },

  /**
   * Load routes from data
   * @param {Array} routesData - Array of route objects
   */
  loadRoutes: function loadRoutes(routesData) {
    // Clear existing routes
    $('.route-row').remove(); // Add each route

    if (routesData && routesData.length > 0) {
      routesData.forEach(function (route) {
        StaticRoutesManager.addRoute(route);
      });
    } else {
      // Show empty state if no routes
      StaticRoutesManager.updateEmptyState();
    } // Reinitialize drag-and-drop after adding routes


    StaticRoutesManager.initializeDragAndDrop();
  },

  /**
   * Collect routes from table
   * @returns {Array} Array of route objects
   */
  collectRoutes: function collectRoutes() {
    var routes = [];
    $('.route-row').each(function (index, row) {
      var $row = $(row);
      var routeId = $row.attr('data-route-id');
      var subnetDropdownId = "subnet-route-".concat(routeId);
      var interfaceDropdownId = "interface-route-".concat(routeId);
      routes.push({
        id: routeId.startsWith('new_') ? null : routeId,
        network: $row.find('.network-input').val(),
        subnet: $("#".concat(subnetDropdownId)).val(),
        gateway: $row.find('.gateway-input').val(),
        "interface": $("#".concat(interfaceDropdownId)).val() || '',
        description: $row.find('.description-input').val(),
        priority: index + 1
      });
    });
    return routes;
  }
};
/**
 *  Initialize network settings form on document ready
 */

$(document).ready(function () {
  networks.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJleHRpcGFkZHIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0IiwibndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSIsImV4dGhvc3RuYW1lIiwiZGVwZW5kcyIsIm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIiwiaW5pdGlhbGl6ZSIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJmb3JtIiwiaGlkZSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaXAiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXAiLCJjdXJyZW50RXh0SXBBZGRyIiwicG9ydE1hdGNoIiwibWF0Y2giLCJwb3J0IiwibmV3RXh0SXBBZGRyIiwidHJpZ2dlciIsInVwZGF0ZU5BVEhlbHBUZXh0IiwicG9ydHMiLCJTSVBQb3J0IiwiVExTX1BPUlQiLCJSVFBQb3J0RnJvbSIsIlJUUFBvcnRUbyIsIiRzaXBQb3J0VmFsdWVzIiwibGVuZ3RoIiwic2lwVGV4dCIsImkxOG4iLCJodG1sIiwiJHJ0cFBvcnRWYWx1ZXMiLCJydHBUZXh0IiwiJGR1YWxTdGFja1NpcFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tTaXBUZXh0IiwiJGR1YWxTdGFja1J0cFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tSdHBUZXh0IiwidXBkYXRlUG9ydExhYmVscyIsIiRzaXBMYWJlbCIsInNpcExhYmVsVGV4dCIsInRleHQiLCIkdGxzTGFiZWwiLCJ0bHNMYWJlbFRleHQiLCIkZHVhbFN0YWNrU2lwTGFiZWwiLCJkdWFsU3RhY2tTaXBMYWJlbFRleHQiLCIkZHVhbFN0YWNrVGxzTGFiZWwiLCJkdWFsU3RhY2tUbHNMYWJlbFRleHQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJldGgiLCJhdHRyIiwiJGRoY3BDaGVja2JveCIsImlzRGhjcEVuYWJsZWQiLCIkaXBGaWVsZCIsIiRzdWJuZXREcm9wZG93biIsInByb3AiLCJjbG9zZXN0IiwidmFsIiwiYWRkTmV3Rm9ybVJ1bGVzIiwic2hvdyIsInVwZGF0ZUR1YWxTdGFja05hdExvZ2ljIiwidG9nZ2xlSVB2NkZpZWxkcyIsImludGVyZmFjZUlkIiwiJGlwdjZNb2RlRHJvcGRvd24iLCJpcHY2TW9kZSIsIiRtYW51YWxGaWVsZHNDb250YWluZXIiLCIkYXV0b0luZm9NZXNzYWdlIiwiJGlwdjZHYXRld2F5RmllbGQiLCIkaXB2NlByaW1hcnlETlNGaWVsZCIsIiRpcHY2U2Vjb25kYXJ5RE5TRmllbGQiLCJpc0R1YWxTdGFja01vZGUiLCJpcHY0YWRkciIsImRoY3BFbmFibGVkIiwiZ2F0ZXdheSIsImlwdjZhZGRyIiwiaGFzSXB2NCIsInRyaW0iLCJoYXNJcHY2IiwiaXB2Nkxvd2VyIiwidG9Mb3dlckNhc2UiLCJpcHY2V2l0aG91dENpZHIiLCJzcGxpdCIsImlzR2xvYmFsVW5pY2FzdCIsInRlc3QiLCJpc05hdEVuYWJsZWQiLCJhbnlEdWFsU3RhY2siLCJ0YWIiLCIkc3RhbmRhcmROYXRTZWN0aW9uIiwiJGR1YWxTdGFja1NlY3Rpb24iLCIkYXV0b1VwZGF0ZUNoZWNrYm94IiwiZmluZCIsInBhcmVudCIsImhvc3RuYW1lIiwibndfVmFsaWRhdGVFeHRlcm5hbEhvc3RuYW1lRW1wdHkiLCJmaWVsZHMiLCJuZXdSb3dJZCIsIm5hbWVDbGFzcyIsImlkZW50aWZpZXIiLCJud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHkiLCJ2bGFuQ2xhc3MiLCJud19WYWxpZGF0ZVZsYW5SYW5nZSIsIm53X1ZhbGlkYXRlVmxhbkNyb3NzIiwiaXBhZGRyQ2xhc3MiLCJud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5IiwibndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJPYmplY3QiLCJhc3NpZ24iLCJzdGF0aWNSb3V0ZXMiLCJjb2xsZWN0Um91dGVzIiwiJGlucHV0IiwibmFtZSIsInZhbHVlIiwidW5kZWZpbmVkIiwiU3RyaW5nIiwiJHNlbGVjdCIsInVzZW5hdCIsIiRhdXRvVXBkYXRlRGl2IiwiYXV0b1VwZGF0ZUV4dGVybmFsSXAiLCJpbnB1dElkIiwicm93SWQiLCJyZXBsYWNlIiwiJGNoZWNrYm94IiwiaXNEaXNhYmxlZCIsImhhc0NsYXNzIiwiJGNoZWNrZWRSYWRpbyIsImludGVybmV0X2ludGVyZmFjZSIsImtleXMiLCJmb3JFYWNoIiwia2V5IiwiaXB2Nk1vZGVNYXRjaCIsIm1vZGUiLCJzdWJuZXRLZXkiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiaW5saW5lIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0IiwiTmV0d29ya0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiZ2V0Q29uZmlnIiwicG9wdWxhdGVGb3JtIiwiaXNEb2NrZXIiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsInNob3dEb2NrZXJOZXR3b3JrSW5mbyIsImNvbnNvbGUiLCJ3YXJuIiwiY2lkclRvTmV0bWFzayIsImNpZHIiLCJtYXNrIiwiam9pbiIsImNyZWF0ZUludGVyZmFjZVRhYnMiLCIkbWVudSIsIiRjb250ZW50IiwiZW1wdHkiLCJpbnRlcmZhY2VzIiwiaWZhY2UiLCJ0YWJJZCIsImlkIiwidGFiTGFiZWwiLCJ2bGFuaWQiLCJpc0FjdGl2ZSIsImFwcGVuZCIsImNhbkRlbGV0ZSIsInBhcnNlSW50IiwiZGVsZXRlQnV0dG9uIiwibndfRGVsZXRlQ3VycmVudEludGVyZmFjZSIsImNyZWF0ZUludGVyZmFjZUZvcm0iLCJ0ZW1wbGF0ZSIsImNyZWF0ZVRlbXBsYXRlRm9ybSIsInBoeXNpY2FsSW50ZXJmYWNlcyIsInRvU3RyaW5nIiwicGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zIiwidmFsdWVzIiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJpbnRlcmZhY2VfMCIsInN0YXRpY09wdGlvbnMiLCJwbGFjZWhvbGRlciIsIm53X1NlbGVjdEludGVyZmFjZSIsImFsbG93RW1wdHkiLCJmaWVsZE5hbWUiLCJmb3JtRGF0YSIsInN1Ym5ldCIsImdldFN1Ym5ldE9wdGlvbnNBcnJheSIsIm53X1NlbGVjdE5ldHdvcmtNYXNrIiwiYWRkaXRpb25hbENsYXNzZXMiLCJpcHY2TW9kZUZpZWxkTmFtZSIsImlwdjZNb2RlRm9ybURhdGEiLCJpcHY2X21vZGUiLCJud19JUHY2TW9kZU9mZiIsIm53X0lQdjZNb2RlQXV0byIsIm53X0lQdjZNb2RlTWFudWFsIiwibndfU2VsZWN0SVB2Nk1vZGUiLCJkYXRhQ2hhbmdlZCIsImlwdjZTdWJuZXRGaWVsZE5hbWUiLCJpcHY2U3VibmV0Rm9ybURhdGEiLCJpcHY2X3N1Ym5ldCIsImdldElwdjZTdWJuZXRPcHRpb25zQXJyYXkiLCJud19TZWxlY3RJUHY2U3VibmV0Iiwic3VibmV0XzAiLCJmaXJzdCIsInVwZGF0ZVZpc2liaWxpdHkiLCJvZmYiLCIkYnV0dG9uIiwicmVtb3ZlIiwiJHRhYkNvbnRlbnQiLCIkZmlyc3RUYWIiLCJlbmFibGVEaXJyaXR5IiwiY2hlY2tWYWx1ZXMiLCIkdmxhbklucHV0IiwidmxhblZhbHVlIiwic2VsZWN0ZWRJbnRlcmZhY2VJZCIsIiR0YWIiLCJwcmVwZW5kIiwiJGRuc0dhdGV3YXlHcm91cCIsIiRkbnNHYXRld2F5RmllbGRzIiwiJGRoY3BJbmZvTWVzc2FnZSIsIm9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMiLCJzYXZlSW5pdGlhbFZhbHVlcyIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJmb21hbnRpY1ZhbHVlcyIsIm1hbnVhbFZhbHVlcyIsIiRmaWVsZCIsImlzIiwib2xkRm9ybVZhbHVlcyIsIm5ld0Zvcm1WYWx1ZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsInNldEV2ZW50cyIsImlzSW50ZXJuZXRJbnRlcmZhY2UiLCJpbnRlcm5ldCIsImRuc0dhdGV3YXlWaXNpYmxlIiwiZ2F0ZXdheVJlYWRvbmx5IiwiZGhjcCIsImdhdGV3YXlEaXNhYmxlZENsYXNzIiwiZG5zUmVhZG9ubHkiLCJkbnNEaXNhYmxlZENsYXNzIiwiaXB2NkdhdGV3YXlSZWFkb25seSIsImlwdjZHYXRld2F5RGlzYWJsZWRDbGFzcyIsImlwdjZGaWVsZHNWaXNpYmxlIiwiZG9ja2VyUmVhZG9ubHkiLCJkb2NrZXJEaXNhYmxlZENsYXNzIiwiZGhjcERpc2FibGVkIiwiZGhjcENoZWNrZWQiLCJpcGFkZHIiLCJud19JbnRlcmZhY2VOYW1lIiwibndfSW50ZXJuZXRJbnRlcmZhY2UiLCJud19Vc2VESENQIiwibndfREhDUEluZm9IZWFkZXIiLCJud19ESENQSW5mb0lQIiwiY3VycmVudElwYWRkciIsIm53X0RIQ1BJbmZvU3VibmV0IiwiY3VycmVudFN1Ym5ldCIsIm53X0RIQ1BJbmZvR2F0ZXdheSIsImN1cnJlbnRHYXRld2F5IiwibndfREhDUEluZm9ETlMiLCJwcmltYXJ5ZG5zIiwic2Vjb25kYXJ5ZG5zIiwiZG9tYWluIiwibndfREhDUEluZm9Eb21haW4iLCJud19ESENQSW5mb0hvc3RuYW1lIiwibndfSVBBZGRyZXNzIiwibndfTmV0d29ya01hc2siLCJud19WbGFuSUQiLCJud19JUHY2TW9kZSIsIm53X0lQdjZBdXRvSW5mb0hlYWRlciIsIm53X0lQdjZBdXRvSW5mb0FkZHJlc3MiLCJjdXJyZW50SXB2NmFkZHIiLCJud19JUHY2QXV0b0luZm9QcmVmaXgiLCJjdXJyZW50SXB2Nl9zdWJuZXQiLCJjdXJyZW50SXB2Nl9nYXRld2F5IiwiaXB2Nl9nYXRld2F5IiwibndfSVB2NkF1dG9JbmZvR2F0ZXdheSIsImN1cnJlbnRQcmltYXJ5ZG5zNiIsInByaW1hcnlkbnM2IiwibndfSVB2NkF1dG9JbmZvRE5TIiwiY3VycmVudFNlY29uZGFyeWRuczYiLCJzZWNvbmRhcnlkbnM2IiwibndfSVB2NkFkZHJlc3MiLCJud19JUHY2U3VibmV0IiwibndfSW50ZXJuZXRTZXR0aW5ncyIsIm53X0hvc3RuYW1lIiwibndfRG9tYWluIiwibndfR2F0ZXdheSIsIm53X0lQdjZHYXRld2F5IiwibndfUHJpbWFyeUROUyIsIm53X1NlY29uZGFyeUROUyIsIm53X0lQdjZQcmltYXJ5RE5TIiwibndfSVB2NlNlY29uZGFyeUROUyIsIm9wdGlvbnMiLCJpIiwiZGVzY3JpcHRpb24iLCJwdXNoIiwibmF0IiwiQVVUT19VUERBVEVfRVhURVJOQUxfSVAiLCJhdmFpbGFibGVJbnRlcmZhY2VzIiwibG9hZFJvdXRlcyIsImluaXRpYWxpemVEaXJyaXR5IiwiZm4iLCJmIiwiYSIsImlwdjZQYXR0ZXJuIiwiaXBhZGRyZXNzIiwiaXBhZGRyV2l0aFBvcnRPcHRpb25hbCIsImNoZWNrVmxhbiIsInBhcmFtIiwiYWxsVmFsdWVzIiwibmV3RXRoTmFtZSIsInZsYW5pZF8wIiwiaW5kZXhPZiIsImV0aE5hbWUiLCJpbkFycmF5IiwiZXh0ZW5hbElwSG9zdCIsInZhbGlkSG9zdG5hbWUiLCJob3N0bmFtZVJlZ2V4IiwiJHRhYmxlIiwiJHNlY3Rpb24iLCIkYWRkQnV0dG9uIiwiJHRhYmxlQ29udGFpbmVyIiwiJGVtcHR5UGxhY2Vob2xkZXIiLCJyb3V0ZXMiLCJpbml0aWFsaXplRHJhZ0FuZERyb3AiLCJhZGRSb3V0ZSIsImRvY3VtZW50IiwidGFyZ2V0IiwidXBkYXRlUHJpb3JpdGllcyIsInVwZGF0ZUVtcHR5U3RhdGUiLCIkc291cmNlUm93IiwiY29weVJvdXRlIiwicGFzdGVkRGF0YSIsIm9yaWdpbmFsRXZlbnQiLCJjbGlwYm9hcmREYXRhIiwiZ2V0RGF0YSIsIndpbmRvdyIsImNsZWFuZWREYXRhIiwic2V0VGltZW91dCIsInRhYmxlRG5EVXBkYXRlIiwidGFibGVEbkQiLCJvbkRyb3AiLCJkcmFnSGFuZGxlIiwiaW50ZXJmYWNlQ291bnQiLCJub3QiLCJyb3V0ZUlkIiwic3VibmV0RHJvcGRvd25JZCIsImludGVyZmFjZURyb3Bkb3duSWQiLCJyb3V0ZURhdGEiLCJuZXR3b3JrIiwiJGV4aXN0aW5nUm93cyIsIiR0ZW1wbGF0ZSIsImxhc3QiLCIkbmV3Um93IiwiY2xvbmUiLCJEYXRlIiwibm93IiwiYWZ0ZXIiLCJpbml0aWFsaXplU3VibmV0RHJvcGRvd24iLCJpbml0aWFsaXplSW50ZXJmYWNlRHJvcGRvd24iLCIkcm93Iiwic2VsZWN0ZWRWYWx1ZSIsIiRjb250YWluZXIiLCJkcm9wZG93bklkIiwibndfQXV0byIsIm1hcCIsImxhYmVsIiwicm93Iiwicm91dGVzRGF0YSIsInJvdXRlIiwic3RhcnRzV2l0aCIsInByaW9yaXR5IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYkMsRUFBQUEsY0FBYyxFQUFFQyxDQUFDLENBQUMsVUFBRCxDQURKOztB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QyxHQUFoQyxFQU5MO0FBT1JpVSxRQUFBQSxRQUFRLEVBQUUzVSxLQUFLLEdBQUc7QUFQVixPQUFaO0FBU0gsS0FmRDtBQWdCQSxXQUFPMlIsTUFBUDtBQUNIO0FBaFV1QixDQUE1QjtBQW1VQTtBQUNBO0FBQ0E7O0FBQ0EzVyxDQUFDLENBQUM4VyxRQUFELENBQUQsQ0FBWThDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjlaLEVBQUFBLFFBQVEsQ0FBQ3FCLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBTeXNpbmZvQVBJLCBOZXR3b3JrQVBJLCBVc2VyTWVzc2FnZSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbmV0d29yayBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgbmV0d29ya3NcbiAqL1xuY29uc3QgbmV0d29ya3MgPSB7XG4gICAgJGdldE15SXBCdXR0b246ICQoJyNnZXRteWlwJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbmV0d29yay1mb3JtJyksXG5cbiAgICAkZHJvcERvd25zOiAkKCcjbmV0d29yay1mb3JtIC5kcm9wZG93bicpLFxuICAgICRleHRpcGFkZHI6ICQoJyNleHRpcGFkZHInKSxcbiAgICAkaXBhZGRyZXNzSW5wdXQ6ICQoJy5pcGFkZHJlc3MnKSxcbiAgICB2bGFuc0FycmF5OiB7fSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50cyB3aXRoIHdlIHNob3VsZCBoaWRlIGZyb20gdGhlIGZvcm0gZm9yIGRvY2tlciBpbnN0YWxsYXRpb24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbm90U2hvd09uRG9ja2VyRGl2czogJCgnLmRvLW5vdC1zaG93LWlmLWRvY2tlcicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGlwYWRkcjoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcldpdGhQb3J0T3B0aW9uYWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRob3N0bmFtZToge1xuICAgICAgICAgICAgZGVwZW5kczogJ3VzZW5hdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndmFsaWRIb3N0bmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbmV0d29yayBzZXR0aW5ncyBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIExvYWQgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgICAgbmV0d29ya3MubG9hZENvbmZpZ3VyYXRpb24oKTtcblxuICAgICAgICAvLyBIYW5kbGVzIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlICd1c2VuYXQtY2hlY2tib3gnLlxuICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgbmV0d29ya3MuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIERIQ1AgY2hlY2tib3ggaGFuZGxlcnMgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG5cbiAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBTeXNpbmZvQVBJLmdldEV4dGVybmFsSXBJbmZvKG5ldHdvcmtzLmNiQWZ0ZXJHZXRFeHRlcm5hbElwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIHdpbGwgYmUgYm91bmQgYWZ0ZXIgdGFicyBhcmUgY3JlYXRlZCBkeW5hbWljYWxseVxuICAgICAgICBuZXR3b3Jrcy4kaXBhZGRyZXNzSW5wdXQuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgLy8gQXBwbHkgSVAgbWFzayBmb3IgZXh0ZXJuYWwgSVAgYWRkcmVzcyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy4kZXh0aXBhZGRyLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIG5ldHdvcmtzLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdGF0aWMgcm91dGVzIG1hbmFnZXJcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gSGlkZSBzdGF0aWMgcm91dGVzIHNlY3Rpb24gaW4gRG9ja2VyIChtYW5hZ2VkIHZpYSBkby1ub3Qtc2hvdy1pZi1kb2NrZXIgY2xhc3MpXG4gICAgICAgIGlmIChuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpcy1kb2NrZXInKT09PVwiMVwiKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZ2V0dGluZyB0aGUgZXh0ZXJuYWwgSVAgZnJvbSBhIHJlbW90ZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufE9iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyLiBJZiBmYWxzZSwgaW5kaWNhdGVzIGFuIGVycm9yIG9jY3VycmVkLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRFeHRlcm5hbElwKHJlc3BvbnNlKSB7XG4gICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhIHx8ICFyZXNwb25zZS5kYXRhLmlwKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXAgfHwgJ0ZhaWxlZCB0byBnZXQgZXh0ZXJuYWwgSVAgYWRkcmVzcycpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3VycmVudEV4dElwQWRkciA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRpcGFkZHInKTtcbiAgICAgICAgY29uc3QgcG9ydE1hdGNoID0gY3VycmVudEV4dElwQWRkci5tYXRjaCgvOihcXGQrKSQvKTtcbiAgICAgICAgY29uc3QgcG9ydCA9IHBvcnRNYXRjaCA/ICc6JyArIHBvcnRNYXRjaFsxXSA6ICcnO1xuICAgICAgICBjb25zdCBuZXdFeHRJcEFkZHIgPSByZXNwb25zZS5kYXRhLmlwICsgcG9ydDtcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIG5ld0V4dElwQWRkcik7XG4gICAgICAgIC8vIENsZWFyIGV4dGVybmFsIGhvc3RuYW1lIHdoZW4gZ2V0dGluZyBleHRlcm5hbCBJUFxuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCAnJyk7XG4gICAgICAgIG5ldHdvcmtzLiRleHRpcGFkZHIudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBOQVQgaGVscCB0ZXh0IHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzIGZyb20gUkVTVCBBUElcbiAgICAgKiBVcGRhdGVzIGJvdGggc3RhbmRhcmQgTkFUIHNlY3Rpb24gYW5kIER1YWwtU3RhY2sgc2VjdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVOQVRIZWxwVGV4dChwb3J0cykge1xuICAgICAgICAvLyBXSFk6IFBvcnQga2V5cyBtYXRjaCBQYnhTZXR0aW5ncyBjb25zdGFudHMgKFNJUFBvcnQsIFRMU19QT1JULCBSVFBQb3J0RnJvbSwgUlRQUG9ydFRvKVxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQUG9ydCB8fCAhcG9ydHMuVExTX1BPUlQgfHwgIXBvcnRzLlJUUFBvcnRGcm9tIHx8ICFwb3J0cy5SVFBQb3J0VG8pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIFNJUCBwb3J0cyBpbmZvIHRleHRcbiAgICAgICAgY29uc3QgJHNpcFBvcnRWYWx1ZXMgPSAkKCcjbmF0LWhlbHAtc2lwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJHNpcFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2lwVGV4dCA9IGkxOG4oJ253X05BVEluZm8zJywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUFBvcnQsXG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNpcFBvcnRWYWx1ZXMuaHRtbChzaXBUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIFJUUCBwb3J0cyBpbmZvIHRleHRcbiAgICAgICAgY29uc3QgJHJ0cFBvcnRWYWx1ZXMgPSAkKCcjbmF0LWhlbHAtcnRwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJHJ0cFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgcnRwVGV4dCA9IGkxOG4oJ253X05BVEluZm80Jywge1xuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9GUk9NJzogcG9ydHMuUlRQUG9ydEZyb20sXG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX1RPJzogcG9ydHMuUlRQUG9ydFRvXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRydHBQb3J0VmFsdWVzLmh0bWwocnRwVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gU0lQIHBvcnRzIGluZm8gdGV4dFxuICAgICAgICBjb25zdCAkZHVhbFN0YWNrU2lwUG9ydFZhbHVlcyA9ICQoJyNkdWFsLXN0YWNrLXNpcC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tTaXBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGR1YWxTdGFja1NpcFRleHQgPSBpMThuKCdud19OQVRJbmZvMycsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0LFxuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTaXBQb3J0VmFsdWVzLmh0bWwoZHVhbFN0YWNrU2lwVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gUlRQIHBvcnRzIGluZm8gdGV4dFxuICAgICAgICBjb25zdCAkZHVhbFN0YWNrUnRwUG9ydFZhbHVlcyA9ICQoJyNkdWFsLXN0YWNrLXJ0cC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tSdHBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGR1YWxTdGFja1J0cFRleHQgPSBpMThuKCdud19OQVRJbmZvNCcsIHtcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6IHBvcnRzLlJUUFBvcnRGcm9tLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6IHBvcnRzLlJUUFBvcnRUb1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkZHVhbFN0YWNrUnRwUG9ydFZhbHVlcy5odG1sKGR1YWxTdGFja1J0cFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwb3J0IGZpZWxkIGxhYmVscyB3aXRoIGFjdHVhbCBpbnRlcm5hbCBwb3J0IHZhbHVlcyBmcm9tIFJFU1QgQVBJXG4gICAgICogVXBkYXRlcyBib3RoIHN0YW5kYXJkIE5BVCBzZWN0aW9uIGFuZCBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcG9ydHMgLSBQb3J0IGNvbmZpZ3VyYXRpb24gb2JqZWN0IGZyb20gQVBJXG4gICAgICovXG4gICAgdXBkYXRlUG9ydExhYmVscyhwb3J0cykge1xuICAgICAgICAvLyBXSFk6IFBvcnQga2V5cyBtYXRjaCBQYnhTZXR0aW5ncyBjb25zdGFudHMgKFNJUFBvcnQsIFRMU19QT1JUKVxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQUG9ydCB8fCAhcG9ydHMuVExTX1BPUlQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIGV4dGVybmFsIFNJUCBwb3J0IGxhYmVsXG4gICAgICAgIGNvbnN0ICRzaXBMYWJlbCA9ICQoJyNleHRlcm5hbC1zaXAtcG9ydC1sYWJlbCcpO1xuICAgICAgICBpZiAoJHNpcExhYmVsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcExhYmVsVGV4dCA9IGkxOG4oJ253X1B1YmxpY1NJUFBvcnQnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQUG9ydFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwTGFiZWwudGV4dChzaXBMYWJlbFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YW5kYXJkIE5BVCBzZWN0aW9uIC0gZXh0ZXJuYWwgVExTIHBvcnQgbGFiZWxcbiAgICAgICAgY29uc3QgJHRsc0xhYmVsID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkdGxzTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGxzTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljVExTUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkdGxzTGFiZWwudGV4dCh0bHNMYWJlbFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIER1YWwtU3RhY2sgc2VjdGlvbiAtIFNJUCBwb3J0IGxhYmVsXG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tTaXBMYWJlbCA9ICQoJyNkdWFsLXN0YWNrLXNpcC1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkZHVhbFN0YWNrU2lwTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZHVhbFN0YWNrU2lwTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljU0lQUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTaXBMYWJlbC50ZXh0KGR1YWxTdGFja1NpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gVExTIHBvcnQgbGFiZWxcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1Rsc0xhYmVsID0gJCgnI2R1YWwtc3RhY2stdGxzLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tUbHNMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkdWFsU3RhY2tUbHNMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNUTFNQb3J0Jywge1xuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tUbHNMYWJlbC50ZXh0KGR1YWxTdGFja1Rsc0xhYmVsVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgJ2Rpc2FibGVkJyBjbGFzcyBmb3Igc3BlY2lmaWMgZmllbGRzIGJhc2VkIG9uIHRoZWlyIGNoZWNrYm94IHN0YXRlLlxuICAgICAqL1xuICAgIHRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpIHtcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV0aCA9ICQob2JqKS5hdHRyKCdkYXRhLXRhYicpO1xuICAgICAgICAgICAgY29uc3QgJGRoY3BDaGVja2JveCA9ICQoYCNkaGNwLSR7ZXRofS1jaGVja2JveGApO1xuICAgICAgICAgICAgY29uc3QgaXNEaGNwRW5hYmxlZCA9ICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAgICAgLy8gRmluZCBJUCBhZGRyZXNzIGFuZCBzdWJuZXQgZmllbGRzXG4gICAgICAgICAgICBjb25zdCAkaXBGaWVsZCA9ICQoYGlucHV0W25hbWU9XCJpcGFkZHJfJHtldGh9XCJdYCk7XG4gICAgICAgICAgICAvLyBEeW5hbWljRHJvcGRvd25CdWlsZGVyIGNyZWF0ZXMgZHJvcGRvd24gd2l0aCBpZCBwYXR0ZXJuOiBmaWVsZE5hbWUtZHJvcGRvd25cbiAgICAgICAgICAgIGNvbnN0ICRzdWJuZXREcm9wZG93biA9ICQoYCNzdWJuZXRfJHtldGh9LWRyb3Bkb3duYCk7XG5cbiAgICAgICAgICAgIGlmIChpc0RoY3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBlbmFibGVkIC0+IG1ha2UgSVAvc3VibmV0IHJlYWQtb25seSBhbmQgYWRkIGRpc2FibGVkIGNsYXNzXG4gICAgICAgICAgICAgICAgJGlwRmllbGQucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAkaXBGaWVsZC5jbG9zZXN0KCcuZmllbGQnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkc3VibmV0RHJvcGRvd24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZGlzYWJsZWQgLT4gbWFrZSBJUC9zdWJuZXQgZWRpdGFibGVcbiAgICAgICAgICAgICAgICAkaXBGaWVsZC5wcm9wKCdyZWFkb25seScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAkaXBGaWVsZC5jbG9zZXN0KCcuZmllbGQnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkc3VibmV0RHJvcGRvd24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnMScpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXR3b3Jrcy5hZGROZXdGb3JtUnVsZXMoZXRoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGlkZS9zaG93IE5BVCBzZWN0aW9ucyBpbnN0ZWFkIG9mIGRpc2FibGluZyB0byBzaW1wbGlmeSBVSVxuICAgICAgICBpZiAoJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICQoJy5uYXRlZC1zZXR0aW5ncy1ncm91cCcpLnNob3coKTtcbiAgICAgICAgICAgIC8vIEFmdGVyIHNob3dpbmcgYWxsIHNlY3Rpb25zLCBkZXRlcm1pbmUgd2hpY2ggb25lIHRvIGFjdHVhbGx5IGRpc3BsYXlcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZUR1YWxTdGFja05hdExvZ2ljKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHZpc2liaWxpdHkgb2YgSVB2NiBtYW51YWwgY29uZmlndXJhdGlvbiBmaWVsZHMgYmFzZWQgb24gc2VsZWN0ZWQgbW9kZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnRlcmZhY2VJZCAtIEludGVyZmFjZSBJRFxuICAgICAqL1xuICAgIHRvZ2dsZUlQdjZGaWVsZHMoaW50ZXJmYWNlSWQpIHtcbiAgICAgICAgY29uc3QgJGlwdjZNb2RlRHJvcGRvd24gPSAkKGAjaXB2Nl9tb2RlXyR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgIGNvbnN0IGlwdjZNb2RlID0gJGlwdjZNb2RlRHJvcGRvd24udmFsKCk7XG4gICAgICAgIGNvbnN0ICRtYW51YWxGaWVsZHNDb250YWluZXIgPSAkKGAuaXB2Ni1tYW51YWwtZmllbGRzLSR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgIGNvbnN0ICRhdXRvSW5mb01lc3NhZ2UgPSAkKGAuaXB2Ni1hdXRvLWluZm8tbWVzc2FnZS0ke2ludGVyZmFjZUlkfWApO1xuICAgICAgICBjb25zdCAkaXB2NkdhdGV3YXlGaWVsZCA9ICQoYC5pcHY2LWdhdGV3YXktZmllbGQtJHtpbnRlcmZhY2VJZH1gKTtcbiAgICAgICAgY29uc3QgJGlwdjZQcmltYXJ5RE5TRmllbGQgPSAkKGAuaXB2Ni1wcmltYXJ5ZG5zLWZpZWxkLSR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgIGNvbnN0ICRpcHY2U2Vjb25kYXJ5RE5TRmllbGQgPSAkKGAuaXB2Ni1zZWNvbmRhcnlkbnMtZmllbGQtJHtpbnRlcmZhY2VJZH1gKTtcblxuICAgICAgICAvLyBTaG93IG1hbnVhbCBmaWVsZHMgb25seSB3aGVuIG1vZGUgaXMgJzInIChNYW51YWwpXG4gICAgICAgIGlmIChpcHY2TW9kZSA9PT0gJzInKSB7XG4gICAgICAgICAgICAkbWFudWFsRmllbGRzQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgICAgICRhdXRvSW5mb01lc3NhZ2UuaGlkZSgpO1xuICAgICAgICAgICAgJGlwdjZHYXRld2F5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJGlwdjZQcmltYXJ5RE5TRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJGlwdjZTZWNvbmRhcnlETlNGaWVsZC5zaG93KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXB2Nk1vZGUgPT09ICcxJykge1xuICAgICAgICAgICAgLy8gU2hvdyBBdXRvIChTTEFBQykgaW5mbyBtZXNzYWdlIHdoZW4gbW9kZSBpcyAnMScgKEF1dG8pXG4gICAgICAgICAgICAkbWFudWFsRmllbGRzQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgICRhdXRvSW5mb01lc3NhZ2Uuc2hvdygpO1xuICAgICAgICAgICAgJGlwdjZHYXRld2F5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJGlwdjZQcmltYXJ5RE5TRmllbGQuc2hvdygpO1xuICAgICAgICAgICAgJGlwdjZTZWNvbmRhcnlETlNGaWVsZC5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGFsbCBJUHY2IGZpZWxkcyBmb3IgbW9kZSAnMCcgKE9mZilcbiAgICAgICAgICAgICRtYW51YWxGaWVsZHNDb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgJGF1dG9JbmZvTWVzc2FnZS5oaWRlKCk7XG4gICAgICAgICAgICAkaXB2NkdhdGV3YXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAkaXB2NlByaW1hcnlETlNGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAkaXB2NlNlY29uZGFyeUROU0ZpZWxkLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpYyB3aGVuIElQdjYgbW9kZSBjaGFuZ2VzXG4gICAgICAgIG5ldHdvcmtzLnVwZGF0ZUR1YWxTdGFja05hdExvZ2ljKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGR1YWwtc3RhY2sgbW9kZSBpcyBhY3RpdmUgKElQdjQgKyBJUHY2IHB1YmxpYyBhZGRyZXNzIGJvdGggY29uZmlndXJlZClcbiAgICAgKiBEdWFsLXN0YWNrIE5BVCBzZWN0aW9uIGlzIHNob3duIHdoZW4gYm90aCBJUHY0IGFuZCBwdWJsaWMgSVB2NiBhcmUgcHJlc2VudC5cbiAgICAgKiBQdWJsaWMgSVB2NiA9IEdsb2JhbCBVbmljYXN0IGFkZHJlc3NlcyAoMjAwMDo6LzMpIHRoYXQgc3RhcnQgd2l0aCAyIG9yIDMuXG4gICAgICogUHJpdmF0ZSBJUHY2IGFkZHJlc3NlcyAoVUxBIGZkMDA6Oi84LCBsaW5rLWxvY2FsIGZlODA6Oi8xMCkgZG8gTk9UIHRyaWdnZXIgZHVhbC1zdGFjay5cbiAgICAgKlxuICAgICAqIElQdjQgZGV0ZWN0aW9uIHdvcmtzIGZvciBib3RoIHN0YXRpYyBhbmQgREhDUCBjb25maWd1cmF0aW9uczpcbiAgICAgKiAtIFN0YXRpYzogY2hlY2tzIGlwYWRkcl9YIGZpZWxkXG4gICAgICogLSBESENQOiBjaGVja3MgaWYgREhDUCBpcyBlbmFibGVkIEFORCBnYXRld2F5IGlzIG9idGFpbmVkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW50ZXJmYWNlSWQgLSBJbnRlcmZhY2UgSURcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBkdWFsLXN0YWNrIHdpdGggcHVibGljIElQdjYsIGZhbHNlIG90aGVyd2lzZVxuICAgICAqL1xuICAgIGlzRHVhbFN0YWNrTW9kZShpbnRlcmZhY2VJZCkge1xuICAgICAgICAvLyBHZXQgSVB2NCBjb25maWd1cmF0aW9uIChzdGF0aWMgb3IgREhDUClcbiAgICAgICAgY29uc3QgaXB2NGFkZHIgPSAkKGBpbnB1dFtuYW1lPVwiaXBhZGRyXyR7aW50ZXJmYWNlSWR9XCJdYCkudmFsKCk7XG4gICAgICAgIGNvbnN0IGRoY3BFbmFibGVkID0gJChgaW5wdXRbbmFtZT1cImRoY3BfJHtpbnRlcmZhY2VJZH1cIl1gKS52YWwoKSA9PT0gJ29uJztcbiAgICAgICAgY29uc3QgZ2F0ZXdheSA9ICQoYGlucHV0W25hbWU9XCJnYXRld2F5XyR7aW50ZXJmYWNlSWR9XCJdYCkudmFsKCk7XG5cbiAgICAgICAgLy8gR2V0IElQdjYgY29uZmlndXJhdGlvblxuICAgICAgICBjb25zdCBpcHY2TW9kZSA9ICQoYCNpcHY2X21vZGVfJHtpbnRlcmZhY2VJZH1gKS52YWwoKTtcbiAgICAgICAgY29uc3QgaXB2NmFkZHIgPSAkKGBpbnB1dFtuYW1lPVwiaXB2NmFkZHJfJHtpbnRlcmZhY2VJZH1cIl1gKS52YWwoKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBJUHY0IGlzIHByZXNlbnQgKGVpdGhlciBzdGF0aWMgYWRkcmVzcyBvciBESENQIHdpdGggZ2F0ZXdheSlcbiAgICAgICAgLy8gR2F0ZXdheSBwcmVzZW5jZSBpbmRpY2F0ZXMgREhDUCBzdWNjZXNzZnVsbHkgb2J0YWluZWQgYW4gSVB2NCBhZGRyZXNzXG4gICAgICAgIGNvbnN0IGhhc0lwdjQgPSAoaXB2NGFkZHIgJiYgaXB2NGFkZHIudHJpbSgpICE9PSAnJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChkaGNwRW5hYmxlZCAmJiBnYXRld2F5ICYmIGdhdGV3YXkudHJpbSgpICE9PSAnJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgSVB2NiBpcyBlbmFibGVkIChBdXRvIFNMQUFDL0RIQ1B2NiBvciBNYW51YWwpXG4gICAgICAgIGNvbnN0IGhhc0lwdjYgPSAoaXB2Nk1vZGUgPT09ICcxJyB8fCBpcHY2TW9kZSA9PT0gJzInKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgaXB2NmFkZHIgJiYgaXB2NmFkZHIudHJpbSgpICE9PSAnJztcblxuICAgICAgICBpZiAoIWhhc0lwdjQgfHwgIWhhc0lwdjYpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIElQdjYgYWRkcmVzcyBpcyBnbG9iYWwgdW5pY2FzdCAocHVibGljKVxuICAgICAgICAvLyBHbG9iYWwgdW5pY2FzdDogMjAwMDo6LzMgKGFkZHJlc3NlcyBzdGFydGluZyB3aXRoIDIgb3IgMylcbiAgICAgICAgLy8gRXhjbHVkZSBVTEEgKGZkMDA6Oi84KSBhbmQgbGluay1sb2NhbCAoZmU4MDo6LzEwKVxuICAgICAgICBjb25zdCBpcHY2TG93ZXIgPSBpcHY2YWRkci50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcblxuICAgICAgICAvLyBSZW1vdmUgQ0lEUiBub3RhdGlvbiBpZiBwcmVzZW50IChlLmcuLCBcIjIwMDE6ZGI4OjoxLzY0XCIgLT4gXCIyMDAxOmRiODo6MVwiKVxuICAgICAgICBjb25zdCBpcHY2V2l0aG91dENpZHIgPSBpcHY2TG93ZXIuc3BsaXQoJy8nKVswXTtcblxuICAgICAgICAvLyBDaGVjayBpZiBmaXJzdCBjaGFyYWN0ZXIgaXMgMiBvciAzIChnbG9iYWwgdW5pY2FzdCByYW5nZSlcbiAgICAgICAgY29uc3QgaXNHbG9iYWxVbmljYXN0ID0gL15bMjNdLy50ZXN0KGlwdjZXaXRob3V0Q2lkcik7XG5cbiAgICAgICAgcmV0dXJuIGlzR2xvYmFsVW5pY2FzdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE5BVCBzZWN0aW9uIFVJIGJhc2VkIG9uIGR1YWwtc3RhY2sgZGV0ZWN0aW9uXG4gICAgICogU3dpdGNoZXMgYmV0d2VlbiBzdGFuZGFyZCBOQVQgc2VjdGlvbiBhbmQgRHVhbC1TdGFjayBzZWN0aW9uXG4gICAgICogTWFrZXMgZXh0aG9zdG5hbWUgcmVxdWlyZWQgaW4gZHVhbC1zdGFjayBtb2RlXG4gICAgICovXG4gICAgdXBkYXRlRHVhbFN0YWNrTmF0TG9naWMoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIE5BVCBpcyBlbmFibGVkIC0gaWYgbm90LCBkb24ndCBzaG93IGFueSBOQVQgc2VjdGlvbnNcbiAgICAgICAgY29uc3QgaXNOYXRFbmFibGVkID0gJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIGlmICghaXNOYXRFbmFibGVkKSB7XG4gICAgICAgICAgICByZXR1cm47IC8vIE5BVCBkaXNhYmxlZCwgc2VjdGlvbnMgYWxyZWFkeSBoaWRkZW4gYnkgdG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzXG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBhbnkgaW50ZXJmYWNlIGlzIGluIGR1YWwtc3RhY2sgbW9kZVxuICAgICAgICBsZXQgYW55RHVhbFN0YWNrID0gZmFsc2U7XG5cbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCB0YWIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJCh0YWIpLmF0dHIoJ2RhdGEtdGFiJyk7XG4gICAgICAgICAgICBpZiAobmV0d29ya3MuaXNEdWFsU3RhY2tNb2RlKGludGVyZmFjZUlkKSkge1xuICAgICAgICAgICAgICAgIGFueUR1YWxTdGFjayA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBCcmVhayBsb29wXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0ICRzdGFuZGFyZE5hdFNlY3Rpb24gPSAkKCcjc3RhbmRhcmQtbmF0LXNlY3Rpb24nKTtcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1NlY3Rpb24gPSAkKCcjZHVhbC1zdGFjay1zZWN0aW9uJyk7XG5cbiAgICAgICAgaWYgKGFueUR1YWxTdGFjaykge1xuICAgICAgICAgICAgLy8gRHVhbC1zdGFjayBkZXRlY3RlZDogSGlkZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiwgc2hvdyBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgICAgICAgICRzdGFuZGFyZE5hdFNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgJGR1YWxTdGFja1NlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBDbGVhciBleHRpcGFkZHIgKGV4dGVybmFsIElQIG5vdCBuZWVkZWQgaW4gZHVhbC1zdGFjaywgb25seSBob3N0bmFtZSlcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRpcGFkZHInLCAnJyk7XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgYXV0b1VwZGF0ZUV4dGVybmFsSXAgKG5vdCBuZWVkZWQgaW4gZHVhbC1zdGFjaylcbiAgICAgICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlQ2hlY2tib3ggPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRhdXRvVXBkYXRlQ2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGhvc3RuYW1lIGRpc3BsYXkgaW4gZHVhbC1zdGFjayBpbmZvIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0IGhvc3RuYW1lID0gJCgnI2V4dGhvc3RuYW1lJykudmFsKCkgfHwgJ21pa29wYnguY29tcGFueS5jb20nO1xuICAgICAgICAgICAgJCgnI2hvc3RuYW1lLWRpc3BsYXknKS50ZXh0KGhvc3RuYW1lKTtcblxuICAgICAgICAgICAgLy8gTWFrZSBleHRob3N0bmFtZSByZXF1aXJlZCBpbiBkdWFsLXN0YWNrXG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzLmV4dGhvc3RuYW1lLnJ1bGVzID0gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRlcm5hbEhvc3RuYW1lRW1wdHkgfHwgJ0V4dGVybmFsIGhvc3RuYW1lIGlzIHJlcXVpcmVkIGluIGR1YWwtc3RhY2sgbW9kZScsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd2YWxpZEhvc3RuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVIb3N0bmFtZUludmFsaWQgfHwgJ0ludmFsaWQgaG9zdG5hbWUgZm9ybWF0JyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vIGR1YWwtc3RhY2s6IFNob3cgc3RhbmRhcmQgTkFUIHNlY3Rpb24sIGhpZGUgRHVhbC1TdGFjayBzZWN0aW9uXG4gICAgICAgICAgICAkc3RhbmRhcmROYXRTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTZWN0aW9uLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gUmVzdG9yZSBvcmlnaW5hbCBleHRob3N0bmFtZSB2YWxpZGF0aW9uIChvcHRpb25hbCB3aXRoIHVzZW5hdCBkZXBlbmRlbmN5KVxuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlcy5leHRob3N0bmFtZS5kZXBlbmRzID0gJ3VzZW5hdCc7XG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzLmV4dGhvc3RuYW1lLnJ1bGVzID0gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndmFsaWRIb3N0bmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdkZXN0cm95JykuZm9ybSh7XG4gICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgZmllbGRzOiBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIG5ldyBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIGEgc3BlY2lmaWMgcm93IGluIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gZm9ybS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Um93SWQgLSBUaGUgSUQgb2YgdGhlIG5ldyByb3cgdG8gYWRkIHRoZSBmb3JtIHJ1bGVzIGZvci5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ25hbWUnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IG5hbWVDbGFzcyA9IGBuYW1lXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICduYW1lJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW25hbWVDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBuYW1lQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgdmxhbkNsYXNzID0gYHZsYW5pZF8ke25ld1Jvd0lkfWA7XG5cblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbdmxhbkNsYXNzXSA9IHtcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogdmxhbkNsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjQwOTVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBjaGVja1ZsYW5bJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuQ3Jvc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2lwYWRkcicgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgaXBhZGRyQ2xhc3MgPSBgaXBhZGRyXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkXG4gICAgICAgIC8vIEZvciB0ZW1wbGF0ZSBpbnRlcmZhY2UgKGlkPTApLCBhZGQgZGVwZW5kZW5jeSBvbiBpbnRlcmZhY2Ugc2VsZWN0aW9uXG4gICAgICAgIGlmIChuZXdSb3dJZCA9PT0gMCB8fCBuZXdSb3dJZCA9PT0gJzAnKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2lwYWRkckNsYXNzXSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpcGFkZHJDbGFzcyxcbiAgICAgICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCwgIC8vIFRlbXBsYXRlOiB2YWxpZGF0ZSBvbmx5IGlmIGludGVyZmFjZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICAgICAgZGVwZW5kczogYG5vdGRoY3BfJHtuZXdSb3dJZH1gLCAgLy8gUmVhbCBpbnRlcmZhY2U6IHZhbGlkYXRlIG9ubHkgaWYgREhDUCBpcyBPRkZcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERIQ1AgdmFsaWRhdGlvbiByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgb2JqZWN0IHdpdGggYWxsIHNldHRpbmdzIHByb3BlcnRpZXNcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHt9O1xuXG4gICAgICAgIC8vIENvbGxlY3Qgc3RhdGljIHJvdXRlc1xuICAgICAgICByZXN1bHQuZGF0YS5zdGF0aWNSb3V0ZXMgPSBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmNvbGxlY3RSb3V0ZXMoKTtcblxuICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGZvcm0gdmFsdWVzIHRvIGF2b2lkIGFueSBET00tcmVsYXRlZCBpc3N1ZXNcbiAgICAgICAgLy8gQ29sbGVjdCBhbGwgcmVndWxhciBpbnB1dCBmaWVsZHNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbdHlwZT1cInRleHRcIl0sIGlucHV0W3R5cGU9XCJoaWRkZW5cIl0sIGlucHV0W3R5cGU9XCJudW1iZXJcIl0sIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gJGlucHV0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkaW5wdXQudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBzZWxlY3QgZHJvcGRvd25zXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ3NlbGVjdCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkc2VsZWN0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkc2VsZWN0LmF0dHIoJ25hbWUnKTtcbiAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSAkc2VsZWN0LnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBvbmx5IGdldCBzdHJpbmcgdmFsdWVzXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbbmFtZV0gPSAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkgPyBTdHJpbmcodmFsdWUpIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbnZlcnQgY2hlY2tib3ggdmFsdWVzIHRvIGJvb2xlYW5cbiAgICAgICAgLy8gUGJ4QXBpQ2xpZW50IHdpbGwgaGFuZGxlIGNvbnZlcnNpb24gdG8gc3RyaW5ncyBmb3IgalF1ZXJ5XG4gICAgICAgIHJlc3VsdC5kYXRhLnVzZW5hdCA9ICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXG4gICAgICAgIC8vIFVzZSBjb3JyZWN0IGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSAoYXV0b1VwZGF0ZUV4dGVybmFsSXAsIG5vdCBBVVRPX1VQREFURV9FWFRFUk5BTF9JUClcbiAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVEaXYgPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICBpZiAoJGF1dG9VcGRhdGVEaXYubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXV0b1VwZGF0ZUV4dGVybmFsSXAgPSAkYXV0b1VwZGF0ZURpdi5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYXV0b1VwZGF0ZUV4dGVybmFsSXAgPSBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbnZlcnQgREhDUCBjaGVja2JveGVzIHRvIGJvb2xlYW4gZm9yIGVhY2ggaW50ZXJmYWNlXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJy5kaGNwLWNoZWNrYm94JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5wdXRJZCA9ICQob2JqKS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgY29uc3Qgcm93SWQgPSBpbnB1dElkLnJlcGxhY2UoJ2RoY3AtJywgJycpLnJlcGxhY2UoJy1jaGVja2JveCcsICcnKTtcblxuICAgICAgICAgICAgLy8gRm9yIGRpc2FibGVkIGNoZWNrYm94ZXMsIHJlYWQgYWN0dWFsIGlucHV0IHN0YXRlIGluc3RlYWQgb2YgRm9tYW50aWMgVUkgQVBJXG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKG9iaik7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkY2hlY2tib3guZmluZCgnaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJyk7XG4gICAgICAgICAgICBjb25zdCBpc0Rpc2FibGVkID0gJGNoZWNrYm94Lmhhc0NsYXNzKCdkaXNhYmxlZCcpIHx8ICRpbnB1dC5wcm9wKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBpZiAoaXNEaXNhYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIEZvciBkaXNhYmxlZCBjaGVja2JveGVzLCByZWFkIHRoZSBhY3R1YWwgaW5wdXQgY2hlY2tlZCBzdGF0ZVxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2BkaGNwXyR7cm93SWR9YF0gPSAkaW5wdXQucHJvcCgnY2hlY2tlZCcpID09PSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZW5hYmxlZCBjaGVja2JveGVzLCB1c2UgRm9tYW50aWMgVUkgQVBJXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbYGRoY3BfJHtyb3dJZH1gXSA9ICRjaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IGludGVybmV0IHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmludGVybmV0X2ludGVyZmFjZSA9IFN0cmluZygkY2hlY2tlZFJhZGlvLnZhbCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdIWTogTm8gcG9ydCBmaWVsZCBtYXBwaW5nIG5lZWRlZCAtIGZvcm0gZmllbGQgbmFtZXMgbWF0Y2ggQVBJIGNvbnN0YW50c1xuICAgICAgICAvLyAoZXh0ZXJuYWxTSVBQb3J0ID0gUGJ4U2V0dGluZ3M6OkVYVEVSTkFMX1NJUF9QT1JUKVxuXG4gICAgICAgIC8vIFNldCBkZWZhdWx0IElQdjYgc3VibmV0IGZvciBBdXRvIG1vZGUgKFNMQUFDL0RIQ1B2NilcbiAgICAgICAgT2JqZWN0LmtleXMocmVzdWx0LmRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlwdjZNb2RlTWF0Y2ggPSBrZXkubWF0Y2goL15pcHY2X21vZGVfKFxcZCspJC8pO1xuICAgICAgICAgICAgaWYgKGlwdjZNb2RlTWF0Y2gpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9IGlwdjZNb2RlTWF0Y2hbMV07XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IHJlc3VsdC5kYXRhW2tleV07XG4gICAgICAgICAgICAgICAgY29uc3Qgc3VibmV0S2V5ID0gYGlwdjZfc3VibmV0XyR7aW50ZXJmYWNlSWR9YDtcblxuICAgICAgICAgICAgICAgIC8vIElmIG1vZGUgaXMgQXV0byAoJzEnKSBhbmQgc3VibmV0IGlzIGVtcHR5LCBzZXQgZGVmYXVsdCB0byAnNjQnXG4gICAgICAgICAgICAgICAgaWYgKG1vZGUgPT09ICcxJyAmJiAoIXJlc3VsdC5kYXRhW3N1Ym5ldEtleV0gfHwgcmVzdWx0LmRhdGFbc3VibmV0S2V5XSA9PT0gJycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW3N1Ym5ldEtleV0gPSAnNjQnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIFJlc3BvbnNlIGhhbmRsZWQgYnkgRm9ybVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBuZXR3b3Jrcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbmV0d29ya3MudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG5ldHdvcmtzLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmlubGluZSA9IHRydWU7IC8vIFNob3cgaW5saW5lIGVycm9ycyBuZXh0IHRvIGZpZWxkc1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IE5ldHdvcmtBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlQ29uZmlnJztcblxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfW5ldHdvcmsvbW9kaWZ5L2A7XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbmV0d29yayBjb25maWd1cmF0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRDb25maWd1cmF0aW9uKCkge1xuICAgICAgICBOZXR3b3JrQVBJLmdldENvbmZpZygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgVUkgYWZ0ZXIgbG9hZGluZyBkYXRhXG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIGZvcm0gZWxlbWVudHMgY29ubmVjdGVkIHdpdGggbm9uIGRvY2tlciBpbnN0YWxsYXRpb25zXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuaXNEb2NrZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2lzLWRvY2tlcicsICcxJyk7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRub3RTaG93T25Eb2NrZXJEaXZzLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IERvY2tlciBuZXR3b3JrIGluZm8gYXMgcmVhZC1vbmx5XG4gICAgICogREVQUkVDQVRFRDogRG9ja2VyIG5vdyB1c2VzIHNhbWUgaW50ZXJmYWNlIHRhYnMgYXMgcmVndWxhciBpbnN0YWxsYXRpb25cbiAgICAgKi9cbiAgICBzaG93RG9ja2VyTmV0d29ya0luZm8oZGF0YSkge1xuICAgICAgICAvLyBUaGlzIGZ1bmN0aW9uIGlzIG5vIGxvbmdlciB1c2VkIC0gRG9ja2VyIHVzZXMgY3JlYXRlSW50ZXJmYWNlVGFicyBpbnN0ZWFkXG4gICAgICAgIGNvbnNvbGUud2Fybignc2hvd0RvY2tlck5ldHdvcmtJbmZvIGlzIGRlcHJlY2F0ZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydCBDSURSIG5vdGF0aW9uIHRvIGRvdHRlZCBkZWNpbWFsIG5ldG1hc2tcbiAgICAgKi9cbiAgICBjaWRyVG9OZXRtYXNrKGNpZHIpIHtcbiAgICAgICAgY29uc3QgbWFzayA9IH4oMiAqKiAoMzIgLSBjaWRyKSAtIDEpO1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgKG1hc2sgPj4+IDI0KSAmIDI1NSxcbiAgICAgICAgICAgIChtYXNrID4+PiAxNikgJiAyNTUsXG4gICAgICAgICAgICAobWFzayA+Pj4gOCkgJiAyNTUsXG4gICAgICAgICAgICBtYXNrICYgMjU1XG4gICAgICAgIF0uam9pbignLicpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgaW50ZXJmYWNlIHRhYnMgYW5kIGZvcm1zIGR5bmFtaWNhbGx5IGZyb20gUkVTVCBBUEkgZGF0YVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gSW50ZXJmYWNlIGRhdGEgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzRG9ja2VyIC0gV2hldGhlciBydW5uaW5nIGluIERvY2tlciBlbnZpcm9ubWVudFxuICAgICAqL1xuICAgIGNyZWF0ZUludGVyZmFjZVRhYnMoZGF0YSwgaXNEb2NrZXIgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCAkbWVudSA9ICQoJyNldGgtaW50ZXJmYWNlcy1tZW51Jyk7XG4gICAgICAgIGNvbnN0ICRjb250ZW50ID0gJCgnI2V0aC1pbnRlcmZhY2VzLWNvbnRlbnQnKTtcblxuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBjb250ZW50XG4gICAgICAgICRtZW51LmVtcHR5KCk7XG4gICAgICAgICRjb250ZW50LmVtcHR5KCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRhYnMgZm9yIGV4aXN0aW5nIGludGVyZmFjZXNcbiAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goKGlmYWNlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdGFiSWQgPSBpZmFjZS5pZDtcbiAgICAgICAgICAgIGNvbnN0IHRhYkxhYmVsID0gYCR7aWZhY2UubmFtZSB8fCBpZmFjZS5pbnRlcmZhY2V9ICgke2lmYWNlLmludGVyZmFjZX0ke2lmYWNlLnZsYW5pZCAhPT0gJzAnICYmIGlmYWNlLnZsYW5pZCAhPT0gMCA/IGAuJHtpZmFjZS52bGFuaWR9YCA6ICcnfSlgO1xuICAgICAgICAgICAgY29uc3QgaXNBY3RpdmUgPSBpbmRleCA9PT0gMDtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRhYiBtZW51IGl0ZW1cbiAgICAgICAgICAgICRtZW51LmFwcGVuZChgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJpdGVtICR7aXNBY3RpdmUgPyAnYWN0aXZlJyA6ICcnfVwiIGRhdGEtdGFiPVwiJHt0YWJJZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgJHt0YWJMYWJlbH1cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRhYiBjb250ZW50XG4gICAgICAgICAgICAvLyBPbmx5IFZMQU4gaW50ZXJmYWNlcyBjYW4gYmUgZGVsZXRlZCAodmxhbmlkID4gMClcbiAgICAgICAgICAgIC8vIEluIERvY2tlciwgZGlzYWJsZSBkZWxldGUgZm9yIGFsbCBpbnRlcmZhY2VzXG4gICAgICAgICAgICBjb25zdCBjYW5EZWxldGUgPSAhaXNEb2NrZXIgJiYgcGFyc2VJbnQoaWZhY2UudmxhbmlkLCAxMCkgPiAwO1xuICAgICAgICAgICAgY29uc3QgZGVsZXRlQnV0dG9uID0gY2FuRGVsZXRlID8gYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwidWkgaWNvbiBsZWZ0IGxhYmVsZWQgYnV0dG9uIGRlbGV0ZS1pbnRlcmZhY2VcIiBkYXRhLXZhbHVlPVwiJHt0YWJJZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoXCI+PC9pPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RlbGV0ZUN1cnJlbnRJbnRlcmZhY2V9XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCA6ICcnO1xuXG4gICAgICAgICAgICAkY29udGVudC5hcHBlbmQobmV0d29ya3MuY3JlYXRlSW50ZXJmYWNlRm9ybShpZmFjZSwgaXNBY3RpdmUsIGRlbGV0ZUJ1dHRvbiwgaXNEb2NrZXIpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHRlbXBsYXRlIHRhYiBmb3IgbmV3IFZMQU4gKG5vdCBmb3IgRG9ja2VyKVxuICAgICAgICBpZiAoZGF0YS50ZW1wbGF0ZSAmJiAhaXNEb2NrZXIpIHtcbiAgICAgICAgICAgIGNvbnN0IHRlbXBsYXRlID0gZGF0YS50ZW1wbGF0ZTtcbiAgICAgICAgICAgIHRlbXBsYXRlLmlkID0gMDtcblxuICAgICAgICAgICAgLy8gQWRkIFwiK1wiIHRhYiBtZW51IGl0ZW1cbiAgICAgICAgICAgICRtZW51LmFwcGVuZChgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJpdGVtXCIgZGF0YS10YWI9XCIwXCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBwbHVzXCI+PC9pPlxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGVtcGxhdGUgZm9ybSB3aXRoIGludGVyZmFjZSBzZWxlY3RvclxuICAgICAgICAgICAgJGNvbnRlbnQuYXBwZW5kKG5ldHdvcmtzLmNyZWF0ZVRlbXBsYXRlRm9ybSh0ZW1wbGF0ZSwgZGF0YS5pbnRlcmZhY2VzKSk7XG5cbiAgICAgICAgICAgIC8vIEJ1aWxkIGludGVyZmFjZSBzZWxlY3RvciBkcm9wZG93biBmb3IgdGVtcGxhdGVcbiAgICAgICAgICAgIGNvbnN0IHBoeXNpY2FsSW50ZXJmYWNlcyA9IHt9O1xuICAgICAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goaWZhY2UgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcGh5c2ljYWxJbnRlcmZhY2VzW2lmYWNlLmludGVyZmFjZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgcGh5c2ljYWxJbnRlcmZhY2VzW2lmYWNlLmludGVyZmFjZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaWZhY2UuaWQudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGlmYWNlLmludGVyZmFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGlmYWNlLmludGVyZmFjZVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMgPSBPYmplY3QudmFsdWVzKHBoeXNpY2FsSW50ZXJmYWNlcyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignaW50ZXJmYWNlXzAnLCB7IGludGVyZmFjZV8wOiAnJyB9LCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd25zIHVzaW5nIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goKGlmYWNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBgc3VibmV0XyR7aWZhY2UuaWR9YDtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1EYXRhID0ge307XG4gICAgICAgICAgICAvLyBDb252ZXJ0IHN1Ym5ldCB0byBzdHJpbmcgZm9yIGRyb3Bkb3duIG1hdGNoaW5nXG4gICAgICAgICAgICBmb3JtRGF0YVtmaWVsZE5hbWVdID0gU3RyaW5nKGlmYWNlLnN1Ym5ldCB8fCAnMjQnKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGZpZWxkTmFtZSwgZm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddICAvLyBBZGQgc2VhcmNoIGNsYXNzIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBJUHY2IG1vZGUgZHJvcGRvd24gKE9mZi9BdXRvL01hbnVhbClcbiAgICAgICAgICAgIGNvbnN0IGlwdjZNb2RlRmllbGROYW1lID0gYGlwdjZfbW9kZV8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBpcHY2TW9kZUZvcm1EYXRhID0ge307XG4gICAgICAgICAgICBpcHY2TW9kZUZvcm1EYXRhW2lwdjZNb2RlRmllbGROYW1lXSA9IFN0cmluZyhpZmFjZS5pcHY2X21vZGUgfHwgJzAnKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGlwdjZNb2RlRmllbGROYW1lLCBpcHY2TW9kZUZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlT2ZmIHx8ICdPZmYnfSxcbiAgICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnMScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19JUHY2TW9kZUF1dG8gfHwgJ0F1dG8gKFNMQUFDL0RIQ1B2NiknfSxcbiAgICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnMicsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19JUHY2TW9kZU1hbnVhbCB8fCAnTWFudWFsJ31cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SVB2Nk1vZGUgfHwgJ1NlbGVjdCBJUHY2IE1vZGUnLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZUlQdjZGaWVsZHMoaWZhY2UuaWQpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgSVB2NiBzdWJuZXQgZHJvcGRvd25cbiAgICAgICAgICAgIGNvbnN0IGlwdjZTdWJuZXRGaWVsZE5hbWUgPSBgaXB2Nl9zdWJuZXRfJHtpZmFjZS5pZH1gO1xuICAgICAgICAgICAgY29uc3QgaXB2NlN1Ym5ldEZvcm1EYXRhID0ge307XG4gICAgICAgICAgICBpcHY2U3VibmV0Rm9ybURhdGFbaXB2NlN1Ym5ldEZpZWxkTmFtZV0gPSBTdHJpbmcoaWZhY2UuaXB2Nl9zdWJuZXQgfHwgJzY0Jyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihpcHY2U3VibmV0RmllbGROYW1lLCBpcHY2U3VibmV0Rm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRJcHY2U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJUHY2U3VibmV0IHx8ICdTZWxlY3QgSVB2NiBQcmVmaXgnLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gU2V0IGluaXRpYWwgdmlzaWJpbGl0eSBvZiBJUHY2IG1hbnVhbCBmaWVsZHNcbiAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZUlQdjZGaWVsZHMoaWZhY2UuaWQpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgdGVtcGxhdGUgKGlkID0gMClcbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUpIHtcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignc3VibmV0XzAnLCB7IHN1Ym5ldF8wOiAnMjQnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddICAvLyBBZGQgc2VhcmNoIGNsYXNzIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLnRhYigpO1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLmZpcnN0KCkudHJpZ2dlcignY2xpY2snKTtcblxuICAgICAgICAvLyBVcGRhdGUgc3RhdGljIHJvdXRlcyBzZWN0aW9uIHZpc2liaWxpdHlcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVWaXNpYmlsaXR5KCk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBkZWxldGUgYnV0dG9uIGhhbmRsZXJzXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gcmVtb3ZlcyBUQUIgZnJvbSBmb3JtIGFuZCBtYXJrcyBpbnRlcmZhY2UgYXMgZGlzYWJsZWRcbiAgICAgICAgLy8gQWN0dWFsIGRlbGV0aW9uIGhhcHBlbnMgb24gZm9ybSBzdWJtaXRcbiAgICAgICAgJCgnLmRlbGV0ZS1pbnRlcmZhY2UnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIFRBQiBtZW51IGl0ZW1cbiAgICAgICAgICAgICQoYCNldGgtaW50ZXJmYWNlcy1tZW51IGFbZGF0YS10YWI9XCIke2ludGVyZmFjZUlkfVwiXWApLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIFRBQiBjb250ZW50XG4gICAgICAgICAgICBjb25zdCAkdGFiQ29udGVudCA9ICQoYCNldGgtaW50ZXJmYWNlcy1jb250ZW50IC50YWJbZGF0YS10YWI9XCIke2ludGVyZmFjZUlkfVwiXWApO1xuICAgICAgICAgICAgJHRhYkNvbnRlbnQucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBoaWRkZW4gZmllbGQgdG8gbWFyayB0aGlzIGludGVyZmFjZSBhcyBkaXNhYmxlZFxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouYXBwZW5kKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkaXNhYmxlZF8ke2ludGVyZmFjZUlkfVwiIHZhbHVlPVwiMVwiIC8+YCk7XG5cbiAgICAgICAgICAgIC8vIFN3aXRjaCB0byBmaXJzdCBhdmFpbGFibGUgdGFiXG4gICAgICAgICAgICBjb25zdCAkZmlyc3RUYWIgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhLml0ZW0nKS5maXJzdCgpO1xuICAgICAgICAgICAgaWYgKCRmaXJzdFRhYi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGZpcnN0VGFiLnRhYignY2hhbmdlIHRhYicsICRmaXJzdFRhYi5hdHRyKCdkYXRhLXRhYicpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHN1Ym1pdCBidXR0b25cbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlLWJpbmQgREhDUCBjaGVja2JveCBoYW5kbGVyc1xuICAgICAgICAkKCcuZGhjcC1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBJUCBhZGRyZXNzIGlucHV0IG1hc2tzXG4gICAgICAgICQoJy5pcGFkZHJlc3MnKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICAvLyBBZGQgVkxBTiBJRCBjaGFuZ2UgaGFuZGxlcnMgdG8gY29udHJvbCBESENQIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICQoJ2lucHV0W25hbWVePVwidmxhbmlkX1wiXScpLm9mZignaW5wdXQgY2hhbmdlJykub24oJ2lucHV0IGNoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHZsYW5JbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICR2bGFuSW5wdXQuYXR0cignbmFtZScpLnJlcGxhY2UoJ3ZsYW5pZF8nLCAnJyk7XG4gICAgICAgICAgICBjb25zdCB2bGFuVmFsdWUgPSBwYXJzZUludCgkdmxhbklucHV0LnZhbCgpLCAxMCkgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0ICRkaGNwQ2hlY2tib3ggPSAkKGAjZGhjcC0ke2ludGVyZmFjZUlkfS1jaGVja2JveGApO1xuXG4gICAgICAgICAgICBpZiAodmxhblZhbHVlID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIERpc2FibGUgREhDUCBjaGVja2JveCBmb3IgVkxBTiBpbnRlcmZhY2VzXG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgnc2V0IGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5maW5kKCdpbnB1dCcpLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEVuYWJsZSBESENQIGNoZWNrYm94IGZvciBub24tVkxBTiBpbnRlcmZhY2VzXG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdzZXQgZW5hYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guZmluZCgnaW5wdXQnKS5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkaXNhYmxlZCBmaWVsZCBjbGFzc2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciB0aGUgaGFuZGxlciBmb3IgZXhpc3RpbmcgVkxBTiBpbnRlcmZhY2VzIHRvIGFwcGx5IGluaXRpYWwgc3RhdGVcbiAgICAgICAgJCgnaW5wdXRbbmFtZV49XCJ2bGFuaWRfXCJdJykudHJpZ2dlcignY2hhbmdlJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnRlcm5ldCByYWRpbyBidXR0b25zIHdpdGggRm9tYW50aWMgVUlcbiAgICAgICAgJCgnLmludGVybmV0LXJhZGlvJykuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBBZGQgaW50ZXJuZXQgcmFkaW8gYnV0dG9uIGNoYW5nZSBoYW5kbGVyXG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIl0nKS5vZmYoJ2NoYW5nZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkSW50ZXJmYWNlSWQgPSAkKHRoaXMpLnZhbCgpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIGFsbCBETlMvR2F0ZXdheSBncm91cHNcbiAgICAgICAgICAgICQoJ1tjbGFzc149XCJkbnMtZ2F0ZXdheS1ncm91cC1cIl0nKS5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgRE5TL0dhdGV3YXkgZ3JvdXAgZm9yIHNlbGVjdGVkIGludGVybmV0IGludGVyZmFjZVxuICAgICAgICAgICAgJChgLmRucy1nYXRld2F5LWdyb3VwLSR7c2VsZWN0ZWRJbnRlcmZhY2VJZH1gKS5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBUQUIgaWNvbnMgLSBhZGQgZ2xvYmUgaWNvbiB0byBzZWxlY3RlZCwgcmVtb3ZlIGZyb20gb3RoZXJzXG4gICAgICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIHRhYikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0YWIgPSAkKHRhYik7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFiSWQgPSAkdGFiLmF0dHIoJ2RhdGEtdGFiJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZXhpc3RpbmcgZ2xvYmUgaWNvblxuICAgICAgICAgICAgICAgICR0YWIuZmluZCgnLmdsb2JlLmljb24nKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBnbG9iZSBpY29uIHRvIHNlbGVjdGVkIGludGVybmV0IGludGVyZmFjZSBUQUJcbiAgICAgICAgICAgICAgICBpZiAodGFiSWQgPT09IHNlbGVjdGVkSW50ZXJmYWNlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRhYi5wcmVwZW5kKCc8aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGRhdGUgRE5TL0dhdGV3YXkgcmVhZG9ubHkgc3RhdGUgd2hlbiBESENQIGNoYW5nZXNcbiAgICAgICAgJCgnLmRoY3AtY2hlY2tib3gnKS5vZmYoJ2NoYW5nZS5kbnNnYXRld2F5Jykub24oJ2NoYW5nZS5kbnNnYXRld2F5JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2hlY2tib3ggPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkY2hlY2tib3guYXR0cignaWQnKS5yZXBsYWNlKCdkaGNwLScsICcnKS5yZXBsYWNlKCctY2hlY2tib3gnLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBpc0RoY3BFbmFibGVkID0gJGNoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgICAgIC8vIEZpbmQgRE5TL0dhdGV3YXkgZmllbGRzIGZvciB0aGlzIGludGVyZmFjZVxuICAgICAgICAgICAgY29uc3QgJGRuc0dhdGV3YXlHcm91cCA9ICQoYC5kbnMtZ2F0ZXdheS1ncm91cC0ke2ludGVyZmFjZUlkfWApO1xuICAgICAgICAgICAgY29uc3QgJGRuc0dhdGV3YXlGaWVsZHMgPSAkZG5zR2F0ZXdheUdyb3VwLmZpbmQoJ2lucHV0W25hbWVePVwiZ2F0ZXdheV9cIl0sIGlucHV0W25hbWVePVwicHJpbWFyeWRuc19cIl0sIGlucHV0W25hbWVePVwic2Vjb25kYXJ5ZG5zX1wiXScpO1xuICAgICAgICAgICAgY29uc3QgJGRoY3BJbmZvTWVzc2FnZSA9ICQoYC5kaGNwLWluZm8tbWVzc2FnZS0ke2ludGVyZmFjZUlkfWApO1xuXG4gICAgICAgICAgICBpZiAoaXNEaGNwRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZW5hYmxlZCAtPiBtYWtlIEROUy9HYXRld2F5IHJlYWQtb25seVxuICAgICAgICAgICAgICAgICRkbnNHYXRld2F5RmllbGRzLnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgJGRuc0dhdGV3YXlGaWVsZHMuY2xvc2VzdCgnLmZpZWxkJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BJbmZvTWVzc2FnZS5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZGlzYWJsZWQgLT4gbWFrZSBETlMvR2F0ZXdheSBlZGl0YWJsZVxuICAgICAgICAgICAgICAgICRkbnNHYXRld2F5RmllbGRzLnByb3AoJ3JlYWRvbmx5JywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICRkbnNHYXRld2F5RmllbGRzLmNsb3Nlc3QoJy5maWVsZCcpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwSW5mb01lc3NhZ2UuaGlkZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZHVhbC1zdGFjayBOQVQgbG9naWMgd2hlbiBESENQIGNoYW5nZXNcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZUR1YWxTdGFja05hdExvZ2ljKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgaW5pdGlhbCBUQUIgaWNvbiB1cGRhdGUgZm9yIGNoZWNrZWQgcmFkaW8gYnV0dG9uXG4gICAgICAgIGNvbnN0ICRjaGVja2VkUmFkaW8gPSAkKCdpbnB1dFtuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCJdOmNoZWNrZWQnKTtcbiAgICAgICAgaWYgKCRjaGVja2VkUmFkaW8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJGNoZWNrZWRSYWRpby50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFwcGx5IGluaXRpYWwgZGlzYWJsZWQgc3RhdGUgZm9yIERIQ1AtZW5hYmxlZCBpbnRlcmZhY2VzXG4gICAgICAgIC8vIENhbGwgYWZ0ZXIgYWxsIGRyb3Bkb3ducyBhcmUgY3JlYXRlZFxuICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuICAgICAgICAvLyBSZS1zYXZlIGluaXRpYWwgZm9ybSB2YWx1ZXMgYW5kIHJlLWJpbmQgZXZlbnQgaGFuZGxlcnMgZm9yIGR5bmFtaWNhbGx5IGNyZWF0ZWQgaW5wdXRzXG4gICAgICAgIC8vIFRoaXMgaXMgZXNzZW50aWFsIGZvciBmb3JtIGNoYW5nZSBkZXRlY3Rpb24gdG8gd29yayB3aXRoIGR5bmFtaWMgdGFic1xuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAvLyBPdmVycmlkZSBGb3JtIG1ldGhvZHMgdG8gbWFudWFsbHkgY29sbGVjdCBhbGwgZmllbGQgdmFsdWVzIChpbmNsdWRpbmcgZnJvbSB0YWJzKVxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxTYXZlSW5pdGlhbFZhbHVlcyA9IEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXM7XG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbENoZWNrVmFsdWVzID0gRm9ybS5jaGVja1ZhbHVlcztcblxuICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB2YWx1ZXMgZnJvbSBGb21hbnRpYyBVSSAobWF5IG1pc3MgZHluYW1pY2FsbHkgY3JlYXRlZCB0YWIgZmllbGRzKVxuICAgICAgICAgICAgICAgIGNvbnN0IGZvbWFudGljVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgY29sbGVjdCBhbGwgZmllbGQgdmFsdWVzIHRvIGNhdGNoIGZpZWxkcyB0aGF0IEZvbWFudGljIFVJIG1pc3Nlc1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hbnVhbFZhbHVlcyA9IHt9O1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QsIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgJGZpZWxkLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBNZXJnZSBib3RoIChtYW51YWwgdmFsdWVzIG92ZXJyaWRlIEZvbWFudGljIHZhbHVlcyBmb3IgZmllbGRzIHRoYXQgZXhpc3QgaW4gYm90aClcbiAgICAgICAgICAgICAgICBGb3JtLm9sZEZvcm1WYWx1ZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmb21hbnRpY1ZhbHVlcywgbWFudWFsVmFsdWVzKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdmFsdWVzIGZyb20gRm9tYW50aWMgVUlcbiAgICAgICAgICAgICAgICBjb25zdCBmb21hbnRpY1ZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlc1xuICAgICAgICAgICAgICAgIGNvbnN0IG1hbnVhbFZhbHVlcyA9IHt9O1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0LCBzZWxlY3QsIHRleHRhcmVhJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZpZWxkID0gJCh0aGlzKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRmaWVsZC5hdHRyKCduYW1lJykgfHwgJGZpZWxkLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ2NoZWNrYm94Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC5pcygnOmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoJGZpZWxkLmF0dHIoJ3R5cGUnKSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuaXMoJzpjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLnZhbCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBNZXJnZSBib3RoXG4gICAgICAgICAgICAgICAgY29uc3QgbmV3Rm9ybVZhbHVlcyA9IE9iamVjdC5hc3NpZ24oe30sIGZvbWFudGljVmFsdWVzLCBtYW51YWxWYWx1ZXMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KEZvcm0ub2xkRm9ybVZhbHVlcykgPT09IEpTT04uc3RyaW5naWZ5KG5ld0Zvcm1WYWx1ZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZW9mIEZvcm0uc2V0RXZlbnRzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5zZXRFdmVudHMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGUgZm9ybSBmb3IgZXhpc3RpbmcgaW50ZXJmYWNlXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGlmYWNlIC0gSW50ZXJmYWNlIGRhdGFcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzQWN0aXZlIC0gV2hldGhlciB0aGlzIHRhYiBpcyBhY3RpdmVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGVsZXRlQnV0dG9uIC0gSFRNTCBmb3IgZGVsZXRlIGJ1dHRvblxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNEb2NrZXIgLSBXaGV0aGVyIHJ1bm5pbmcgaW4gRG9ja2VyIGVudmlyb25tZW50XG4gICAgICovXG4gICAgY3JlYXRlSW50ZXJmYWNlRm9ybShpZmFjZSwgaXNBY3RpdmUsIGRlbGV0ZUJ1dHRvbiwgaXNEb2NrZXIgPSBmYWxzZSkge1xuICAgICAgICBjb25zdCBpZCA9IGlmYWNlLmlkO1xuICAgICAgICBjb25zdCBpc0ludGVybmV0SW50ZXJmYWNlID0gaWZhY2UuaW50ZXJuZXQgfHwgZmFsc2U7XG5cbiAgICAgICAgLy8gRE5TL0dhdGV3YXkgZmllbGRzIHZpc2liaWxpdHkgYW5kIHJlYWQtb25seSBzdGF0ZVxuICAgICAgICBjb25zdCBkbnNHYXRld2F5VmlzaWJsZSA9IGlzSW50ZXJuZXRJbnRlcmZhY2UgPyAnJyA6ICdzdHlsZT1cImRpc3BsYXk6bm9uZTtcIic7XG5cbiAgICAgICAgLy8gSW4gRG9ja2VyOiBHYXRld2F5IGlzIGFsd2F5cyByZWFkb25seSwgRE5TIGZpZWxkcyBhcmUgZWRpdGFibGVcbiAgICAgICAgLy8gSW4gcmVndWxhciBtb2RlOiBBbGwgZmllbGRzIHJlYWRvbmx5IGlmIERIQ1AgZW5hYmxlZFxuICAgICAgICBjb25zdCBnYXRld2F5UmVhZG9ubHkgPSBpc0RvY2tlciB8fCBpZmFjZS5kaGNwID8gJ3JlYWRvbmx5JyA6ICcnO1xuICAgICAgICBjb25zdCBnYXRld2F5RGlzYWJsZWRDbGFzcyA9IGlzRG9ja2VyIHx8IGlmYWNlLmRoY3AgPyAnZGlzYWJsZWQnIDogJyc7XG4gICAgICAgIGNvbnN0IGRuc1JlYWRvbmx5ID0gaXNEb2NrZXIgPyAnJyA6IChpZmFjZS5kaGNwID8gJ3JlYWRvbmx5JyA6ICcnKTtcbiAgICAgICAgY29uc3QgZG5zRGlzYWJsZWRDbGFzcyA9IGlzRG9ja2VyID8gJycgOiAoaWZhY2UuZGhjcCA/ICdkaXNhYmxlZCcgOiAnJyk7XG5cbiAgICAgICAgLy8gSVB2NiBHYXRld2F5OiByZWFkb25seSB3aGVuIGlwdjZfbW9kZT0nMScgKEF1dG8vU0xBQUMpLCBlZGl0YWJsZSB3aGVuIGlwdjZfbW9kZT0nMicgKE1hbnVhbCkgb3IgJzAnIChPZmYpXG4gICAgICAgIGNvbnN0IGlwdjZHYXRld2F5UmVhZG9ubHkgPSBpZmFjZS5pcHY2X21vZGUgPT09ICcxJyA/ICdyZWFkb25seScgOiAnJztcbiAgICAgICAgY29uc3QgaXB2NkdhdGV3YXlEaXNhYmxlZENsYXNzID0gaWZhY2UuaXB2Nl9tb2RlID09PSAnMScgPyAnZGlzYWJsZWQnIDogJyc7XG5cbiAgICAgICAgLy8gSVB2NiBmaWVsZHMgdmlzaWJpbGl0eTogaGlkZSB3aGVuIGlwdjZfbW9kZT0nMCcgKE9mZiksIHNob3cgd2hlbiAnMScgKEF1dG8pIG9yICcyJyAoTWFudWFsKVxuICAgICAgICBjb25zdCBpcHY2RmllbGRzVmlzaWJsZSA9IGlmYWNlLmlwdjZfbW9kZSA9PT0gJzAnID8gJ3N0eWxlPVwiZGlzcGxheTpub25lO1wiJyA6ICcnO1xuXG4gICAgICAgIC8vIEluIERvY2tlcjogSVAsIHN1Ym5ldCwgVkxBTiBhcmUgcmVhZG9ubHlcbiAgICAgICAgY29uc3QgZG9ja2VyUmVhZG9ubHkgPSBpc0RvY2tlciA/ICdyZWFkb25seScgOiAnJztcbiAgICAgICAgY29uc3QgZG9ja2VyRGlzYWJsZWRDbGFzcyA9IGlzRG9ja2VyID8gJ2Rpc2FibGVkJyA6ICcnO1xuXG4gICAgICAgIC8vIEluIERvY2tlcjogREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBhbmQgYWx3YXlzIGNoZWNrZWRcbiAgICAgICAgY29uc3QgZGhjcERpc2FibGVkID0gaXNEb2NrZXIgfHwgaWZhY2UudmxhbmlkID4gMDtcbiAgICAgICAgY29uc3QgZGhjcENoZWNrZWQgPSBpc0RvY2tlciB8fCAoaWZhY2UudmxhbmlkID4gMCA/IGZhbHNlIDogaWZhY2UuZGhjcCk7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnQgJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pbnRlcmZhY2V9XCIgLz5cblxuICAgICAgICAgICAgICAgICR7aXNEb2NrZXIgPyBgXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5uYW1lIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCIgdmFsdWU9XCIke2lkfVwiIC8+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiZGhjcF8ke2lkfVwiIHZhbHVlPVwib25cIiAvPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImlwYWRkcl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcGFkZHIgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJzdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2Uuc3VibmV0IHx8ICcyNCd9XCIgLz5cbiAgICAgICAgICAgICAgICBgIDogYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UubmFtZSB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBpbnRlcm5ldC1yYWRpb1wiIGlkPVwiaW50ZXJuZXQtJHtpZH0tcmFkaW9cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInJhZGlvXCIgbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiIHZhbHVlPVwiJHtpZH1cIiAke2lzSW50ZXJuZXRJbnRlcmZhY2UgPyAnY2hlY2tlZCcgOiAnJ30gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcm5ldEludGVyZmFjZSB8fCAnSW50ZXJuZXQgSW50ZXJmYWNlJ308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGB9XG5cbiAgICAgICAgICAgICAgICAke2lzRG9ja2VyID8gJycgOiBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGRoY3AtY2hlY2tib3gke2RoY3BEaXNhYmxlZCA/ICcgZGlzYWJsZWQnIDogJyd9XCIgaWQ9XCJkaGNwLSR7aWR9LWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgJHtkaGNwQ2hlY2tlZCA/ICdjaGVja2VkJyA6ICcnfSAke2RoY3BEaXNhYmxlZCA/ICdkaXNhYmxlZCcgOiAnJ30gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVXNlREhDUH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGB9XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGhjcC1pbmZvLW1lc3NhZ2UtJHtpZH1cIiBzdHlsZT1cImRpc3BsYXk6ICR7ZGhjcENoZWNrZWQgPyAnYmxvY2snIDogJ25vbmUnfTtcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNvbXBhY3QgaW5mbyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0hlYWRlciB8fCAnREhDUCBDb25maWd1cmF0aW9uIE9idGFpbmVkJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dWwgY2xhc3M9XCJsaXN0XCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAwLjVlbTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvSVAgfHwgJ0lQIEFkZHJlc3MnfTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRJcGFkZHIgfHwgaWZhY2UuaXBhZGRyIHx8ICdOL0EnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb1N1Ym5ldCB8fCAnU3VibmV0J306IDxzdHJvbmc+LyR7aWZhY2UuY3VycmVudFN1Ym5ldCB8fCBpZmFjZS5zdWJuZXQgfHwgJ04vQSd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvR2F0ZXdheSB8fCAnR2F0ZXdheSd9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudEdhdGV3YXkgfHwgaWZhY2UuZ2F0ZXdheSB8fCAnTi9BJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9ETlMgfHwgJ0ROUyd9OiA8c3Ryb25nPiR7aWZhY2UucHJpbWFyeWRucyB8fCAnTi9BJ30ke2lmYWNlLnNlY29uZGFyeWRucyA/ICcsICcgKyBpZmFjZS5zZWNvbmRhcnlkbnMgOiAnJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2lmYWNlLmRvbWFpbiA/IGA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9Eb21haW4gfHwgJ0RvbWFpbid9OiA8c3Ryb25nPiR7aWZhY2UuZG9tYWlufTwvc3Ryb25nPjwvbGk+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2lmYWNlLmhvc3RuYW1lID8gYDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0hvc3RuYW1lIHx8ICdIb3N0bmFtZSd9OiA8c3Ryb25nPiR7aWZhY2UuaG9zdG5hbWV9PC9zdHJvbmc+PC9saT5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC91bD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cIm5vdGRoY3BfJHtpZH1cIiBpZD1cIm5vdC1kaGNwLSR7aWR9XCIvPlxuXG4gICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/ICcnIDogYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZHNcIiBpZD1cImlwLWFkZHJlc3MtZ3JvdXAtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVBBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImlwYWRkcl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcGFkZHIgfHwgJyd9XCIgJHtkb2NrZXJSZWFkb25seX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfTmV0d29ya01hc2t9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cInN1Ym5ldF8ke2lkfVwiIG5hbWU9XCJzdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2Uuc3VibmV0IHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgICR7aXNEb2NrZXIgPyAnJyA6IGBcbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ZsYW5JRH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiBuYW1lPVwidmxhbmlkXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnZsYW5pZCB8fCAnMCd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2Nk1vZGUgfHwgJ0lQdjYgTW9kZSd9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJpcHY2X21vZGVfJHtpZH1cIiBuYW1lPVwiaXB2Nl9tb2RlXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwdjZfbW9kZSB8fCAnMCd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXB2Ni1hdXRvLWluZm8tbWVzc2FnZS0ke2lkfVwiIHN0eWxlPVwiZGlzcGxheTogJHtpZmFjZS5pcHY2X21vZGUgPT09ICcxJyA/ICdibG9jaycgOiAnbm9uZSd9O1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY29tcGFjdCBpbmZvIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBdXRvSW5mb0hlYWRlciB8fCAnSVB2NiBBdXRvY29uZmlndXJhdGlvbiAoU0xBQUMvREhDUHY2KSd9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzPVwibGlzdFwiIHN0eWxlPVwibWFyZ2luLXRvcDogMC41ZW07XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2QXV0b0luZm9BZGRyZXNzIHx8ICdJUHY2IEFkZHJlc3MnfTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRJcHY2YWRkciB8fCBpZmFjZS5pcHY2YWRkciB8fCAnQXV0b2NvbmZpZ3VyZWQnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2QXV0b0luZm9QcmVmaXggfHwgJ1ByZWZpeCBMZW5ndGgnfTogPHN0cm9uZz4vJHtpZmFjZS5jdXJyZW50SXB2Nl9zdWJuZXQgfHwgaWZhY2UuaXB2Nl9zdWJuZXQgfHwgJzY0J308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkeyhpZmFjZS5jdXJyZW50SXB2Nl9nYXRld2F5IHx8IGlmYWNlLmlwdjZfZ2F0ZXdheSkgPyBgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBdXRvSW5mb0dhdGV3YXkgfHwgJ0dhdGV3YXknfTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRJcHY2X2dhdGV3YXkgfHwgaWZhY2UuaXB2Nl9nYXRld2F5fTwvc3Ryb25nPjwvbGk+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkeyhpZmFjZS5jdXJyZW50UHJpbWFyeWRuczYgfHwgaWZhY2UucHJpbWFyeWRuczYpID8gYDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2QXV0b0luZm9ETlMgfHwgJ0ROUyd9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudFByaW1hcnlkbnM2IHx8IGlmYWNlLnByaW1hcnlkbnM2fSR7KGlmYWNlLmN1cnJlbnRTZWNvbmRhcnlkbnM2IHx8IGlmYWNlLnNlY29uZGFyeWRuczYpID8gJywgJyArIChpZmFjZS5jdXJyZW50U2Vjb25kYXJ5ZG5zNiB8fCBpZmFjZS5zZWNvbmRhcnlkbnM2KSA6ICcnfTwvc3Ryb25nPjwvbGk+YCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXB2Ni1tYW51YWwtZmllbGRzLSR7aWR9XCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRzXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZml2ZSB3aWRlIGZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBZGRyZXNzIHx8ICdJUHY2IEFkZHJlc3MnfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC02MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcHY2YWRkcmVzc1wiIG5hbWU9XCJpcHY2YWRkcl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcHY2YWRkciB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cImZkMDA6OjFcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NlN1Ym5ldCB8fCAnSVB2NiBQcmVmaXggTGVuZ3RoJ308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJpcHY2X3N1Ym5ldF8ke2lkfVwiIG5hbWU9XCJpcHY2X3N1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcHY2X3N1Ym5ldCB8fCAnNjQnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZG5zLWdhdGV3YXktZ3JvdXAtJHtpZH1cIiAke2Ruc0dhdGV3YXlWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGhvcml6b250YWwgZGl2aWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVybmV0U2V0dGluZ3MgfHwgJ0ludGVybmV0IFNldHRpbmdzJ308L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Ib3N0bmFtZSB8fCAnSG9zdG5hbWUnfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJob3N0bmFtZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5ob3N0bmFtZSB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIm1pa29wYnhcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RvbWFpbiB8fCAnRG9tYWluJ308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwiZG9tYWluXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmRvbWFpbiB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cImV4YW1wbGUuY29tXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19HYXRld2F5fTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImdhdGV3YXlfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuZ2F0ZXdheSB8fCAnJ31cIiAke2dhdGV3YXlSZWFkb25seX0gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgaXB2Ni1nYXRld2F5LWZpZWxkLSR7aWR9XCIgJHtpcHY2RmllbGRzVmlzaWJsZX0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkdhdGV3YXkgfHwgJ0lQdjYgR2F0ZXdheSd9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwICR7aXB2NkdhdGV3YXlEaXNhYmxlZENsYXNzfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXB2NmFkZHJlc3NcIiBuYW1lPVwiaXB2Nl9nYXRld2F5XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmN1cnJlbnRJcHY2X2dhdGV3YXkgfHwgaWZhY2UuaXB2Nl9nYXRld2F5IHx8ICcnfVwiICR7aXB2NkdhdGV3YXlSZWFkb25seX0gcGxhY2Vob2xkZXI9XCJmZTgwOjoxXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19QcmltYXJ5RE5TfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMCAke2Ruc0Rpc2FibGVkQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwicHJpbWFyeWRuc18ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5wcmltYXJ5ZG5zIHx8ICcnfVwiICR7ZG5zUmVhZG9ubHl9IC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfU2Vjb25kYXJ5RE5TfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMCAke2Ruc0Rpc2FibGVkQ2xhc3N9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwic2Vjb25kYXJ5ZG5zXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnNlY29uZGFyeWRucyB8fCAnJ31cIiAke2Ruc1JlYWRvbmx5fSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBpcHY2LXByaW1hcnlkbnMtZmllbGQtJHtpZH1cIiAke2lwdjZGaWVsZHNWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2UHJpbWFyeUROUyB8fCAnUHJpbWFyeSBJUHY2IEROUyd9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcHY2YWRkcmVzc1wiIG5hbWU9XCJwcmltYXJ5ZG5zNl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5jdXJyZW50UHJpbWFyeWRuczYgfHwgaWZhY2UucHJpbWFyeWRuczYgfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCIyMDAxOjQ4NjA6NDg2MDo6ODg4OFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIGlwdjYtc2Vjb25kYXJ5ZG5zLWZpZWxkLSR7aWR9XCIgJHtpcHY2RmllbGRzVmlzaWJsZX0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NlNlY29uZGFyeUROUyB8fCAnU2Vjb25kYXJ5IElQdjYgRE5TJ308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwdjZhZGRyZXNzXCIgbmFtZT1cInNlY29uZGFyeWRuczZfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuY3VycmVudFNlY29uZGFyeWRuczYgfHwgaWZhY2Uuc2Vjb25kYXJ5ZG5zNiB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIjIwMDE6NDg2MDo0ODYwOjo4ODQ0XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICR7ZGVsZXRlQnV0dG9ufVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBmb3JtIGZvciBuZXcgVkxBTiB0ZW1wbGF0ZVxuICAgICAqL1xuICAgIGNyZWF0ZVRlbXBsYXRlRm9ybSh0ZW1wbGF0ZSwgaW50ZXJmYWNlcykge1xuICAgICAgICBjb25zdCBpZCA9IDA7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnRcIiBkYXRhLXRhYj1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2V9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIGlkPVwiaW50ZXJmYWNlXyR7aWR9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVyZmFjZU5hbWV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgaWQ9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCJcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBkaGNwLWNoZWNrYm94XCIgaWQ9XCJkaGNwLSR7aWR9LWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgY2hlY2tlZCAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Vc2VESENQfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJub3RkaGNwXyR7aWR9XCIgaWQ9XCJub3QtZGhjcC0ke2lkfVwiLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZHNcIiBpZD1cImlwLWFkZHJlc3MtZ3JvdXAtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVBBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImlwYWRkcl8ke2lkfVwiIHZhbHVlPVwiXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfTmV0d29ya01hc2t9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cInN1Ym5ldF8ke2lkfVwiIG5hbWU9XCJzdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIjI0XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVmxhbklEfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cIm51bWJlclwiIG5hbWU9XCJ2bGFuaWRfJHtpZH1cIiB2YWx1ZT1cIjQwOTVcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgSVB2NiBzdWJuZXQgcHJlZml4IG9wdGlvbnMgYXJyYXkgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIElQdjYgc3VibmV0IHByZWZpeCBvcHRpb25zICgvMSB0byAvMTI4KVxuICAgICAqL1xuICAgIGdldElwdjZTdWJuZXRPcHRpb25zQXJyYXkoKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXTtcbiAgICAgICAgLy8gR2VuZXJhdGUgLzEgdG8gLzEyOCAoY29tbW9uOiAvNjQsIC80OCwgLzU2LCAvMTI4KVxuICAgICAgICBmb3IgKGxldCBpID0gMTI4OyBpID49IDE7IGktLSkge1xuICAgICAgICAgICAgbGV0IGRlc2NyaXB0aW9uID0gYC8ke2l9YDtcbiAgICAgICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvbnMgZm9yIGNvbW1vbiBwcmVmaXhlc1xuICAgICAgICAgICAgaWYgKGkgPT09IDEyOCkgZGVzY3JpcHRpb24gKz0gJyAoU2luZ2xlIGhvc3QpJztcbiAgICAgICAgICAgIGVsc2UgaWYgKGkgPT09IDY0KSBkZXNjcmlwdGlvbiArPSAnIChTdGFuZGFyZCBzdWJuZXQpJztcbiAgICAgICAgICAgIGVsc2UgaWYgKGkgPT09IDU2KSBkZXNjcmlwdGlvbiArPSAnIChTbWFsbCBuZXR3b3JrKSc7XG4gICAgICAgICAgICBlbHNlIGlmIChpID09PSA0OCkgZGVzY3JpcHRpb24gKz0gJyAoTGFyZ2UgbmV0d29yayknO1xuICAgICAgICAgICAgZWxzZSBpZiAoaSA9PT0gMzIpIGRlc2NyaXB0aW9uICs9ICcgKElTUCBhc3NpZ25tZW50KSc7XG5cbiAgICAgICAgICAgIG9wdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGkudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICB0ZXh0OiBkZXNjcmlwdGlvblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzdWJuZXQgbWFzayBvcHRpb25zIGFycmF5IGZvciBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBzdWJuZXQgbWFzayBvcHRpb25zXG4gICAgICovXG4gICAgZ2V0U3VibmV0T3B0aW9uc0FycmF5KCkge1xuICAgICAgICAvLyBOZXR3b3JrIG1hc2tzIGZyb20gQ2lkcjo6Z2V0TmV0TWFza3MoKSAoa3Jzb3J0IFNPUlRfTlVNRVJJQylcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHt2YWx1ZTogJzMyJywgdGV4dDogJzMyIC0gMjU1LjI1NS4yNTUuMjU1J30sXG4gICAgICAgICAgICB7dmFsdWU6ICczMScsIHRleHQ6ICczMSAtIDI1NS4yNTUuMjU1LjI1NCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMzAnLCB0ZXh0OiAnMzAgLSAyNTUuMjU1LjI1NS4yNTInfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI5JywgdGV4dDogJzI5IC0gMjU1LjI1NS4yNTUuMjQ4J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyOCcsIHRleHQ6ICcyOCAtIDI1NS4yNTUuMjU1LjI0MCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjcnLCB0ZXh0OiAnMjcgLSAyNTUuMjU1LjI1NS4yMjQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI2JywgdGV4dDogJzI2IC0gMjU1LjI1NS4yNTUuMTkyJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNScsIHRleHQ6ICcyNSAtIDI1NS4yNTUuMjU1LjEyOCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjQnLCB0ZXh0OiAnMjQgLSAyNTUuMjU1LjI1NS4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMycsIHRleHQ6ICcyMyAtIDI1NS4yNTUuMjU1LjI1NCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjInLCB0ZXh0OiAnMjIgLSAyNTUuMjU1LjI1Mi4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMScsIHRleHQ6ICcyMSAtIDI1NS4yNTUuMjQ4LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIwJywgdGV4dDogJzIwIC0gMjU1LjI1NS4yNDAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTknLCB0ZXh0OiAnMTkgLSAyNTUuMjU1LjIyNC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxOCcsIHRleHQ6ICcxOCAtIDI1NS4yNTUuMTkyLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE3JywgdGV4dDogJzE3IC0gMjU1LjI1NS4xMjguMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTYnLCB0ZXh0OiAnMTYgLSAyNTUuMjU1LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTUnLCB0ZXh0OiAnMTUgLSAyNTUuMjU0LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTQnLCB0ZXh0OiAnMTQgLSAyNTUuMjUyLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTMnLCB0ZXh0OiAnMTMgLSAyNTUuMjQ4LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTInLCB0ZXh0OiAnMTIgLSAyNTUuMjQwLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTEnLCB0ZXh0OiAnMTEgLSAyNTUuMjI0LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTAnLCB0ZXh0OiAnMTAgLSAyNTUuMTkyLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnOScsIHRleHQ6ICc5IC0gMjU1LjEyOC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzgnLCB0ZXh0OiAnOCAtIDI1NS4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNycsIHRleHQ6ICc3IC0gMjU0LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc2JywgdGV4dDogJzYgLSAyNTIuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzUnLCB0ZXh0OiAnNSAtIDI0OC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNCcsIHRleHQ6ICc0IC0gMjQwLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICczJywgdGV4dDogJzMgLSAyMjQuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzInLCB0ZXh0OiAnMiAtIDE5Mi4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMScsIHRleHQ6ICcxIC0gMTI4LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogJzAgLSAwLjAuMC4wJ30sXG4gICAgICAgIF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBjb25maWd1cmF0aW9uIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBXSFk6IEJvdGggRG9ja2VyIGFuZCBub24tRG9ja2VyIG5vdyB1c2UgaW50ZXJmYWNlIHRhYnNcbiAgICAgICAgLy8gRG9ja2VyIGhhcyByZXN0cmljdGlvbnM6IERIQ1AgbG9ja2VkLCBJUC9zdWJuZXQvVkxBTiByZWFkb25seSwgRE5TIGVkaXRhYmxlXG4gICAgICAgIG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZVRhYnMoZGF0YSwgZGF0YS5pc0RvY2tlciB8fCBmYWxzZSk7XG5cbiAgICAgICAgLy8gU2V0IE5BVCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5uYXQpIHtcbiAgICAgICAgICAgIC8vIEJvb2xlYW4gdmFsdWVzIGZyb20gQVBJXG4gICAgICAgICAgICBpZiAoZGF0YS5uYXQudXNlbmF0KSB7XG4gICAgICAgICAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRpcGFkZHInLCBkYXRhLm5hdC5leHRpcGFkZHIgfHwgJycpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGhvc3RuYW1lJywgZGF0YS5uYXQuZXh0aG9zdG5hbWUgfHwgJycpO1xuXG4gICAgICAgICAgICAvLyBhdXRvVXBkYXRlRXh0ZXJuYWxJcCBib29sZWFuIChmaWVsZCBuYW1lIGZyb20gdGhlIGZvcm0pXG4gICAgICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZUNoZWNrYm94ID0gbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImF1dG9VcGRhdGVFeHRlcm5hbElwXCJdJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgIGlmICgkYXV0b1VwZGF0ZUNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5uYXQuQVVUT19VUERBVEVfRVhURVJOQUxfSVAgfHwgZGF0YS5uYXQuYXV0b1VwZGF0ZUV4dGVybmFsSXApIHtcbiAgICAgICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkYXV0b1VwZGF0ZUNoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHBvcnQgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEucG9ydHMpIHtcbiAgICAgICAgICAgIC8vIFdIWTogTm8gbWFwcGluZyBuZWVkZWQgLSBBUEkgcmV0dXJucyBrZXlzIG1hdGNoaW5nIGZvcm0gZmllbGQgbmFtZXNcbiAgICAgICAgICAgIC8vIChlLmcuLCAnZXh0ZXJuYWxTSVBQb3J0JyBmcm9tIFBieFNldHRpbmdzOjpFWFRFUk5BTF9TSVBfUE9SVCBjb25zdGFudClcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEucG9ydHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGEucG9ydHNba2V5XTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCBrZXksIHZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIE5BVCBoZWxwIHRleHQgYW5kIGxhYmVscyB3aXRoIGFjdHVhbCBwb3J0IHZhbHVlc1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlTkFUSGVscFRleHQoZGF0YS5wb3J0cyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVQb3J0TGFiZWxzKGRhdGEucG9ydHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IGFkZGl0aW9uYWwgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEuc2V0dGluZ3MpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEuc2V0dGluZ3MpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCBrZXksIGRhdGEuc2V0dGluZ3Nba2V5XSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN0b3JlIGF2YWlsYWJsZSBpbnRlcmZhY2VzIGZvciBzdGF0aWMgcm91dGVzIEZJUlNUIChiZWZvcmUgbG9hZGluZyByb3V0ZXMpXG4gICAgICAgIGlmIChkYXRhLmF2YWlsYWJsZUludGVyZmFjZXMpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYXZhaWxhYmxlSW50ZXJmYWNlcyA9IGRhdGEuYXZhaWxhYmxlSW50ZXJmYWNlcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIExvYWQgc3RhdGljIHJvdXRlcyBBRlRFUiBhdmFpbGFibGVJbnRlcmZhY2VzIGFyZSBzZXRcbiAgICAgICAgaWYgKGRhdGEuc3RhdGljUm91dGVzKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmxvYWRSb3V0ZXMoZGF0YS5zdGF0aWNSb3V0ZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBhZnRlciBwb3B1bGF0aW9uIGlzIGNvbXBsZXRlXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyB0aGUgYnV0dG9uIGlzIGRpc2FibGVkIGFuZCBhbGwgZHluYW1pY2FsbHkgY3JlYXRlZCBmaWVsZHMgYXJlIHRyYWNrZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3MuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVB2NiBhZGRyZXNzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQdjYgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVB2NiBhZGRyZXNzLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcHY2YWRkciA9ICh2YWx1ZSkgPT4ge1xuICAgIC8vIElQdjYgcmVnZXggcGF0dGVyblxuICAgIC8vIFN1cHBvcnRzIGZ1bGwgZm9ybSwgY29tcHJlc3NlZCBmb3JtICg6OiksIElQdjQtbWFwcGVkICg6OmZmZmY6MTkyLjAuMi4xKSwgbGluay1sb2NhbCAoZmU4MDo6MSVldGgwKVxuICAgIGNvbnN0IGlwdjZQYXR0ZXJuID0gL14oKFswLTlhLWZBLUZdezEsNH06KXs3fVswLTlhLWZBLUZdezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDd9OnwoWzAtOWEtZkEtRl17MSw0fTopezEsNn06WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsNX0oOlswLTlhLWZBLUZdezEsNH0pezEsMn18KFswLTlhLWZBLUZdezEsNH06KXsxLDR9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDN9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwzfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsMn0oOlswLTlhLWZBLUZdezEsNH0pezEsNX18WzAtOWEtZkEtRl17MSw0fTooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDZ9KXw6KCg6WzAtOWEtZkEtRl17MSw0fSl7MSw3fXw6KXxmZTgwOig6WzAtOWEtZkEtRl17MCw0fSl7MCw0fSVbMC05YS16QS1aXXsxLH18OjooZmZmZig6MHsxLDR9KXswLDF9Oil7MCwxfSgoMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pXFwuKXszfSgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSl8KFswLTlhLWZBLUZdezEsNH06KXsxLDR9OigoMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pXFwuKXszfSgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSkpJC87XG4gICAgcmV0dXJuIGlwdjZQYXR0ZXJuLnRlc3QodmFsdWUpO1xufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MgKElQdjQgb3IgSVB2NikuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVB2NCBvciBJUHY2IGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkcmVzcyA9ICh2YWx1ZSkgPT4ge1xuICAgIHJldHVybiAkLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyKHZhbHVlKSB8fCAkLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXB2NmFkZHIodmFsdWUpO1xufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyV2l0aFBvcnRPcHRpb25hbCA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkoOlswLTldKyk/JC8pO1xuICAgIGlmIChmID09IG51bGwpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSBmW2ldO1xuICAgICAgICAgICAgaWYgKGEgPiAyNTUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZls1XSA+IDMyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIFZMQU4gSUQgaXMgdW5pcXVlIGZvciBhIGdpdmVuIGludGVyZmFjZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2bGFuVmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIFZMQU4gSUQgaW5wdXQgZmllbGQuXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgcGFyYW1ldGVyIGZvciB0aGUgcnVsZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIFZMQU4gSUQgaXMgdW5pcXVlIGZvciB0aGUgaW50ZXJmYWNlLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja1ZsYW4gPSAodmxhblZhbHVlLCBwYXJhbSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IHZsYW5zQXJyYXkgPSB7fTtcbiAgICBjb25zdCBhbGxWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgaWYgKGFsbFZhbHVlcy5pbnRlcmZhY2VfMCAhPT0gdW5kZWZpbmVkICYmIGFsbFZhbHVlcy5pbnRlcmZhY2VfMCA+IDApIHtcbiAgICAgICAgY29uc3QgbmV3RXRoTmFtZSA9IGFsbFZhbHVlc1tgaW50ZXJmYWNlXyR7YWxsVmFsdWVzLmludGVyZmFjZV8wfWBdO1xuICAgICAgICB2bGFuc0FycmF5W25ld0V0aE5hbWVdID0gW2FsbFZhbHVlcy52bGFuaWRfMF07XG4gICAgICAgIGlmIChhbGxWYWx1ZXMudmxhbmlkXzAgPT09ICcnKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAkLmVhY2goYWxsVmFsdWVzLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gJ2ludGVyZmFjZV8wJyB8fCBpbmRleCA9PT0gJ3ZsYW5pZF8wJykgcmV0dXJuO1xuICAgICAgICBpZiAoaW5kZXguaW5kZXhPZigndmxhbmlkJykgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgZXRoTmFtZSA9IGFsbFZhbHVlc1tgaW50ZXJmYWNlXyR7aW5kZXguc3BsaXQoJ18nKVsxXX1gXTtcbiAgICAgICAgICAgIGlmICgkLmluQXJyYXkodmFsdWUsIHZsYW5zQXJyYXlbZXRoTmFtZV0pID49IDBcbiAgICAgICAgICAgICAgICAmJiB2bGFuVmFsdWUgPT09IHZhbHVlXG4gICAgICAgICAgICAgICAgJiYgcGFyYW0gPT09IGluZGV4LnNwbGl0KCdfJylbMV0pIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZXRoTmFtZSBpbiB2bGFuc0FycmF5KSkge1xuICAgICAgICAgICAgICAgICAgICB2bGFuc0FycmF5W2V0aE5hbWVdID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0ucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy8gREhDUCB2YWxpZGF0aW9uIHJ1bGUgcmVtb3ZlZCAtIERIQ1AgY2hlY2tib3ggaXMgZGlzYWJsZWQgZm9yIFZMQU4gaW50ZXJmYWNlcywgbm8gdmFsaWRhdGlvbiBuZWVkZWRcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIHRoZSBwcmVzZW5jZSBvZiBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgZXh0ZXJuYWwgSVAgaG9zdCBpbmZvcm1hdGlvbiBpcyBwcm92aWRlZCB3aGVuIE5BVCBpcyBlbmFibGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbmFsSXBIb3N0ID0gKCkgPT4ge1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLnVzZW5hdCA9PT0gJ29uJykge1xuICAgICAgICBpZiAoYWxsVmFsdWVzLmV4dGhvc3RuYW1lID09PSAnJyAmJiBhbGxWYWx1ZXMuZXh0aXBhZGRyID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHZhbHVlIGlzIGEgdmFsaWQgaG9zdG5hbWVcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBob3N0bmFtZVxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB2YWxpZCBob3N0bmFtZSwgZmFsc2Ugb3RoZXJ3aXNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy52YWxpZEhvc3RuYW1lID0gKHZhbHVlKSA9PiB7XG4gICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZSA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIEVtcHR5IGlzIGhhbmRsZWQgYnkgZXh0ZW5hbElwSG9zdCBydWxlXG4gICAgfVxuXG4gICAgLy8gUkZDIDk1Mi9SRkMgMTEyMyBob3N0bmFtZSB2YWxpZGF0aW9uXG4gICAgLy8gLSBMYWJlbHMgc2VwYXJhdGVkIGJ5IGRvdHNcbiAgICAvLyAtIEVhY2ggbGFiZWwgMS02MyBjaGFyc1xuICAgIC8vIC0gT25seSBhbHBoYW51bWVyaWMgYW5kIGh5cGhlbnNcbiAgICAvLyAtIENhbm5vdCBzdGFydC9lbmQgd2l0aCBoeXBoZW5cbiAgICAvLyAtIFRvdGFsIGxlbmd0aCBtYXggMjUzIGNoYXJzXG4gICAgY29uc3QgaG9zdG5hbWVSZWdleCA9IC9eKD89LnsxLDI1M30kKSg/IS0pW2EtekEtWjAtOS1dezEsNjN9KD88IS0pKFxcLlthLXpBLVowLTktXXsxLDYzfSg/PCEtKSkqJC87XG4gICAgcmV0dXJuIGhvc3RuYW1lUmVnZXgudGVzdCh2YWx1ZSk7XG59O1xuXG5cbi8qKlxuICogU3RhdGljIFJvdXRlcyBNYW5hZ2VyIE1vZHVsZVxuICpcbiAqIE1hbmFnZXMgc3RhdGljIHJvdXRlIGNvbmZpZ3VyYXRpb24gd2hlbiBtdWx0aXBsZSBuZXR3b3JrIGludGVyZmFjZXMgZXhpc3RcbiAqL1xuY29uc3QgU3RhdGljUm91dGVzTWFuYWdlciA9IHtcbiAgICAkdGFibGU6ICQoJyNzdGF0aWMtcm91dGVzLXRhYmxlJyksXG4gICAgJHNlY3Rpb246ICQoJyNzdGF0aWMtcm91dGVzLXNlY3Rpb24nKSxcbiAgICAkYWRkQnV0dG9uOiAkKCcjYWRkLW5ldy1yb3V0ZScpLFxuICAgICR0YWJsZUNvbnRhaW5lcjogbnVsbCxcbiAgICAkZW1wdHlQbGFjZWhvbGRlcjogbnVsbCxcbiAgICByb3V0ZXM6IFtdLFxuICAgIGF2YWlsYWJsZUludGVyZmFjZXM6IFtdLCAvLyBXaWxsIGJlIHBvcHVsYXRlZCBmcm9tIFJFU1QgQVBJXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHN0YXRpYyByb3V0ZXMgbWFuYWdlbWVudFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIENhY2hlIGVsZW1lbnRzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGVtcHR5UGxhY2Vob2xkZXIgPSAkKCcjc3RhdGljLXJvdXRlcy1lbXB0eS1wbGFjZWhvbGRlcicpO1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZUNvbnRhaW5lciA9ICQoJyNzdGF0aWMtcm91dGVzLXRhYmxlLWNvbnRhaW5lcicpO1xuXG4gICAgICAgIC8vIEhpZGUgc2VjdGlvbiBpZiBsZXNzIHRoYW4gMiBpbnRlcmZhY2VzXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlVmlzaWJpbGl0eSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJhZy1hbmQtZHJvcFxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuXG4gICAgICAgIC8vIEFkZCBidXR0b24gaGFuZGxlclxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRhZGRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGZpcnN0IHJvdXRlIGJ1dHRvbiBoYW5kbGVyIChpbiBlbXB0eSBwbGFjZWhvbGRlcilcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNhZGQtZmlyc3Qtcm91dGUtYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYWRkUm91dGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIChkZWxlZ2F0ZWQpXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdjbGljaycsICcuZGVsZXRlLXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZUVtcHR5U3RhdGUoKTtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29weSBidXR0b24gaGFuZGxlciAoZGVsZWdhdGVkKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignY2xpY2snLCAnLmNvcHktcm91dGUtYnV0dG9uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRzb3VyY2VSb3cgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5jb3B5Um91dGUoJHNvdXJjZVJvdyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIElucHV0IGNoYW5nZSBoYW5kbGVyc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignaW5wdXQgY2hhbmdlJywgJy5uZXR3b3JrLWlucHV0LCAuZ2F0ZXdheS1pbnB1dCwgLmRlc2NyaXB0aW9uLWlucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBQYXN0ZSBoYW5kbGVycyBmb3IgSVAgYWRkcmVzcyBmaWVsZHMgKGVuYWJsZSBjbGlwYm9hcmQgcGFzdGUgd2l0aCBpbnB1dG1hc2spXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLm9uKCdwYXN0ZScsICcubmV0d29yay1pbnB1dCwgLmdhdGV3YXktaW5wdXQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIC8vIEdldCBwYXN0ZWQgZGF0YSBmcm9tIGNsaXBib2FyZFxuICAgICAgICAgICAgbGV0IHBhc3RlZERhdGEgPSAnJztcbiAgICAgICAgICAgIGlmIChlLm9yaWdpbmFsRXZlbnQgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEgJiYgZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLm9yaWdpbmFsRXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUuY2xpcGJvYXJkRGF0YSAmJiBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSBlLmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh3aW5kb3cuY2xpcGJvYXJkRGF0YSAmJiB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKSB7XG4gICAgICAgICAgICAgICAgcGFzdGVkRGF0YSA9IHdpbmRvdy5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTsgLy8gRm9yIElFXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsZWFuIHRoZSBwYXN0ZWQgZGF0YSAocmVtb3ZlIGV4dHJhIHNwYWNlcywga2VlcCBvbmx5IHZhbGlkIElQIGNoYXJhY3RlcnMpXG4gICAgICAgICAgICBjb25zdCBjbGVhbmVkRGF0YSA9IHBhc3RlZERhdGEudHJpbSgpLnJlcGxhY2UoL1teMC05Ll0vZywgJycpO1xuXG4gICAgICAgICAgICAvLyBHZXQgdGhlIGlucHV0IGVsZW1lbnRcbiAgICAgICAgICAgIGNvbnN0ICRpbnB1dCA9ICQodGhpcyk7XG5cbiAgICAgICAgICAgIC8vIFRlbXBvcmFyaWx5IHJlbW92ZSBtYXNrXG4gICAgICAgICAgICAkaW5wdXQuaW5wdXRtYXNrKCdyZW1vdmUnKTtcblxuICAgICAgICAgICAgLy8gU2V0IHRoZSBjbGVhbmVkIHZhbHVlXG4gICAgICAgICAgICAkaW5wdXQudmFsKGNsZWFuZWREYXRhKTtcblxuICAgICAgICAgICAgLy8gUmVhcHBseSB0aGUgbWFzayBhZnRlciBhIHNob3J0IGRlbGF5XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAkaW5wdXQuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgcGxhY2Vob2xkZXI6ICdfJ30pO1xuICAgICAgICAgICAgICAgICRpbnB1dC50cmlnZ2VyKCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sIDEwKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgb3IgcmVpbml0aWFsaXplIGRyYWctYW5kLWRyb3AgZnVuY3Rpb25hbGl0eVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEcmFnQW5kRHJvcCgpIHtcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyB0YWJsZURuRCBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLmRhdGEoJ3RhYmxlRG5EJykpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLnRhYmxlRG5EVXBkYXRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3BcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUudGFibGVEbkQoe1xuICAgICAgICAgICAgb25Ecm9wOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVQcmlvcml0aWVzKCk7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZSdcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB2aXNpYmlsaXR5IGJhc2VkIG9uIG51bWJlciBvZiBpbnRlcmZhY2VzXG4gICAgICovXG4gICAgdXBkYXRlVmlzaWJpbGl0eSgpIHtcbiAgICAgICAgLy8gU2hvdy9oaWRlIHNlY3Rpb24gYmFzZWQgb24gbnVtYmVyIG9mIGludGVyZmFjZXNcbiAgICAgICAgY29uc3QgaW50ZXJmYWNlQ291bnQgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhLml0ZW0nKS5ub3QoJ1tkYXRhLXRhYj1cIjBcIl0nKS5sZW5ndGg7XG4gICAgICAgIGlmIChpbnRlcmZhY2VDb3VudCA+IDEpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHNlY3Rpb24uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kc2VjdGlvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29weSBhIHJvdXRlIHJvdyAoY3JlYXRlIGR1cGxpY2F0ZSlcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHNvdXJjZVJvdyAtIFNvdXJjZSByb3cgdG8gY29weVxuICAgICAqL1xuICAgIGNvcHlSb3V0ZSgkc291cmNlUm93KSB7XG4gICAgICAgIGNvbnN0IHJvdXRlSWQgPSAkc291cmNlUm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKTtcbiAgICAgICAgY29uc3Qgc3VibmV0RHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHtyb3V0ZUlkfWA7XG4gICAgICAgIGNvbnN0IGludGVyZmFjZURyb3Bkb3duSWQgPSBgaW50ZXJmYWNlLXJvdXRlLSR7cm91dGVJZH1gO1xuXG4gICAgICAgIC8vIENvbGxlY3QgZGF0YSBmcm9tIHNvdXJjZSByb3dcbiAgICAgICAgY29uc3Qgcm91dGVEYXRhID0ge1xuICAgICAgICAgICAgbmV0d29yazogJHNvdXJjZVJvdy5maW5kKCcubmV0d29yay1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgc3VibmV0OiAkKGAjJHtzdWJuZXREcm9wZG93bklkfWApLnZhbCgpLFxuICAgICAgICAgICAgZ2F0ZXdheTogJHNvdXJjZVJvdy5maW5kKCcuZ2F0ZXdheS1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgaW50ZXJmYWNlOiAkKGAjJHtpbnRlcmZhY2VEcm9wZG93bklkfWApLnZhbCgpIHx8ICcnLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICRzb3VyY2VSb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKClcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBZGQgbmV3IHJvdXRlIHdpdGggY29waWVkIGRhdGFcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZShyb3V0ZURhdGEpO1xuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGFmdGVyIGFkZGluZyByb3V0ZVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZW1wdHkgc3RhdGUgdmlzaWJpbGl0eVxuICAgICAqL1xuICAgIHVwZGF0ZUVtcHR5U3RhdGUoKSB7XG4gICAgICAgIGNvbnN0ICRleGlzdGluZ1Jvd3MgPSAkKCcucm91dGUtcm93Jyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdSb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBwbGFjZWhvbGRlciwgaGlkZSB0YWJsZSBjb250YWluZXJcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGVtcHR5UGxhY2Vob2xkZXIuc2hvdygpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBlbXB0eSBwbGFjZWhvbGRlciwgc2hvdyB0YWJsZSBjb250YWluZXJcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJGVtcHR5UGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIG5ldyByb3V0ZSByb3dcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcm91dGVEYXRhIC0gUm91dGUgZGF0YSAob3B0aW9uYWwpXG4gICAgICovXG4gICAgYWRkUm91dGUocm91dGVEYXRhID0gbnVsbCkge1xuICAgICAgICBjb25zdCAkdGVtcGxhdGUgPSAkKCcucm91dGUtcm93LXRlbXBsYXRlJykubGFzdCgpO1xuICAgICAgICBjb25zdCAkbmV3Um93ID0gJHRlbXBsYXRlLmNsb25lKHRydWUpO1xuICAgICAgICBjb25zdCByb3V0ZUlkID0gcm91dGVEYXRhPy5pZCB8fCBgbmV3XyR7RGF0ZS5ub3coKX1gO1xuXG4gICAgICAgICRuZXdSb3dcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncm91dGUtcm93LXRlbXBsYXRlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygncm91dGUtcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdkYXRhLXJvdXRlLWlkJywgcm91dGVJZClcbiAgICAgICAgICAgIC5zaG93KCk7XG5cbiAgICAgICAgLy8gU2V0IHZhbHVlcyBpZiBwcm92aWRlZFxuICAgICAgICBpZiAocm91dGVEYXRhKSB7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKHJvdXRlRGF0YS5uZXR3b3JrKTtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwocm91dGVEYXRhLmdhdGV3YXkpO1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcuZGVzY3JpcHRpb24taW5wdXQnKS52YWwocm91dGVEYXRhLmRlc2NyaXB0aW9uIHx8ICcnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZCB0byB0YWJsZVxuICAgICAgICBjb25zdCAkZXhpc3RpbmdSb3dzID0gJCgnLnJvdXRlLXJvdycpO1xuICAgICAgICBpZiAoJGV4aXN0aW5nUm93cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICR0ZW1wbGF0ZS5hZnRlcigkbmV3Um93KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRleGlzdGluZ1Jvd3MubGFzdCgpLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIHRoaXMgcm93XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duKCRuZXdSb3csIHJvdXRlRGF0YT8uc3VibmV0IHx8ICcyNCcpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgaW50ZXJmYWNlIGRyb3Bkb3duIGZvciB0aGlzIHJvd1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93bigkbmV3Um93LCByb3V0ZURhdGE/LmludGVyZmFjZSB8fCAnJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnB1dG1hc2sgZm9yIElQIGFkZHJlc3MgZmllbGRzXG4gICAgICAgICRuZXdSb3cuZmluZCgnLmlwYWRkcmVzcycpLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsIHBsYWNlaG9sZGVyOiAnXyd9KTtcblxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVByaW9yaXRpZXMoKTtcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVFbXB0eVN0YXRlKCk7XG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIGEgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBSb3cgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RlZFZhbHVlIC0gU2VsZWN0ZWQgc3VibmV0IHZhbHVlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duKCRyb3csIHNlbGVjdGVkVmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRyb3cuZmluZCgnLnN1Ym5ldC1kcm9wZG93bi1jb250YWluZXInKTtcbiAgICAgICAgY29uc3QgZHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHskcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKX1gO1xuXG4gICAgICAgICRjb250YWluZXIuaHRtbChgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIiR7ZHJvcGRvd25JZH1cIiAvPmApO1xuXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihkcm9wZG93bklkLFxuICAgICAgICAgICAgeyBbZHJvcGRvd25JZF06IHNlbGVjdGVkVmFsdWUgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBpbnRlcmZhY2UgZHJvcGRvd24gZm9yIGEgcm91dGUgcm93XG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRyb3cgLSBSb3cgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RlZFZhbHVlIC0gU2VsZWN0ZWQgaW50ZXJmYWNlIHZhbHVlIChlbXB0eSBzdHJpbmcgPSBhdXRvKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVJbnRlcmZhY2VEcm9wZG93bigkcm93LCBzZWxlY3RlZFZhbHVlKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkcm93LmZpbmQoJy5pbnRlcmZhY2UtZHJvcGRvd24tY29udGFpbmVyJyk7XG4gICAgICAgIGNvbnN0IGRyb3Bkb3duSWQgPSBgaW50ZXJmYWNlLXJvdXRlLSR7JHJvdy5hdHRyKCdkYXRhLXJvdXRlLWlkJyl9YDtcblxuICAgICAgICAkY29udGFpbmVyLmh0bWwoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCIke2Ryb3Bkb3duSWR9XCIgLz5gKTtcblxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biBvcHRpb25zOiBcIkF1dG9cIiArIGF2YWlsYWJsZSBpbnRlcmZhY2VzXG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0F1dG8gfHwgJ0F1dG8nIH0sXG4gICAgICAgICAgICAuLi5TdGF0aWNSb3V0ZXNNYW5hZ2VyLmF2YWlsYWJsZUludGVyZmFjZXMubWFwKGlmYWNlID0+ICh7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLnZhbHVlLFxuICAgICAgICAgICAgICAgIHRleHQ6IGlmYWNlLmxhYmVsXG4gICAgICAgICAgICB9KSlcbiAgICAgICAgXTtcblxuICAgICAgICAvLyBQcmVwYXJlIGZvcm0gZGF0YSBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHt9O1xuICAgICAgICBmb3JtRGF0YVtkcm9wZG93bklkXSA9IHNlbGVjdGVkVmFsdWUgfHwgJyc7IC8vIEVuc3VyZSB3ZSBwYXNzIGVtcHR5IHN0cmluZyBmb3IgXCJBdXRvXCJcblxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZHJvcGRvd25JZCxcbiAgICAgICAgICAgIGZvcm1EYXRhLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG9wdGlvbnMsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcm91dGUgcHJpb3JpdGllcyBiYXNlZCBvbiB0YWJsZSBvcmRlclxuICAgICAqL1xuICAgIHVwZGF0ZVByaW9yaXRpZXMoKSB7XG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICAkKHJvdykuYXR0cignZGF0YS1wcmlvcml0eScsIGluZGV4ICsgMSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIHJvdXRlcyBmcm9tIGRhdGFcbiAgICAgKiBAcGFyYW0ge0FycmF5fSByb3V0ZXNEYXRhIC0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqL1xuICAgIGxvYWRSb3V0ZXMocm91dGVzRGF0YSkge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyByb3V0ZXNcbiAgICAgICAgJCgnLnJvdXRlLXJvdycpLnJlbW92ZSgpO1xuXG4gICAgICAgIC8vIEFkZCBlYWNoIHJvdXRlXG4gICAgICAgIGlmIChyb3V0ZXNEYXRhICYmIHJvdXRlc0RhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcm91dGVzRGF0YS5mb3JFYWNoKHJvdXRlID0+IHtcbiAgICAgICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKHJvdXRlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBzdGF0ZSBpZiBubyByb3V0ZXNcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlRW1wdHlTdGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGRyYWctYW5kLWRyb3AgYWZ0ZXIgYWRkaW5nIHJvdXRlc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmluaXRpYWxpemVEcmFnQW5kRHJvcCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb2xsZWN0IHJvdXRlcyBmcm9tIHRhYmxlXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiByb3V0ZSBvYmplY3RzXG4gICAgICovXG4gICAgY29sbGVjdFJvdXRlcygpIHtcbiAgICAgICAgY29uc3Qgcm91dGVzID0gW107XG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5lYWNoKChpbmRleCwgcm93KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcm93ID0gJChyb3cpO1xuICAgICAgICAgICAgY29uc3Qgcm91dGVJZCA9ICRyb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpO1xuICAgICAgICAgICAgY29uc3Qgc3VibmV0RHJvcGRvd25JZCA9IGBzdWJuZXQtcm91dGUtJHtyb3V0ZUlkfWA7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VEcm9wZG93bklkID0gYGludGVyZmFjZS1yb3V0ZS0ke3JvdXRlSWR9YDtcblxuICAgICAgICAgICAgcm91dGVzLnB1c2goe1xuICAgICAgICAgICAgICAgIGlkOiByb3V0ZUlkLnN0YXJ0c1dpdGgoJ25ld18nKSA/IG51bGwgOiByb3V0ZUlkLFxuICAgICAgICAgICAgICAgIG5ldHdvcms6ICRyb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBzdWJuZXQ6ICQoYCMke3N1Ym5ldERyb3Bkb3duSWR9YCkudmFsKCksXG4gICAgICAgICAgICAgICAgZ2F0ZXdheTogJHJvdy5maW5kKCcuZ2F0ZXdheS1pbnB1dCcpLnZhbCgpLFxuICAgICAgICAgICAgICAgIGludGVyZmFjZTogJChgIyR7aW50ZXJmYWNlRHJvcGRvd25JZH1gKS52YWwoKSB8fCAnJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJHJvdy5maW5kKCcuZGVzY3JpcHRpb24taW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogaW5kZXggKyAxXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByb3V0ZXM7XG4gICAgfVxufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBuZXR3b3JrIHNldHRpbmdzIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG5ldHdvcmtzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19