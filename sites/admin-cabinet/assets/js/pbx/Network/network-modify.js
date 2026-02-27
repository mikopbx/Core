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
      UserMessage.showError(globalTranslate.nw_ErrorGettingExternalIp);
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
   * Toggles visibility of IP address fields based on IPv4 mode dropdown state.
   */
  toggleDisabledFieldClass: function toggleDisabledFieldClass() {
    $('#eth-interfaces-menu a').each(function (index, obj) {
      var eth = $(obj).attr('data-tab');
      var $ipv4ModeDropdown = $("#ipv4_mode_".concat(eth, "-dropdown")); // In Docker mode, the IPv4 mode dropdown is not rendered.
      // Default to DHCP enabled so IP validation is skipped (Docker manages networking).

      var ipv4Mode = $ipv4ModeDropdown.length > 0 ? $ipv4ModeDropdown.dropdown('get value') : '1';
      var isDhcpEnabled = ipv4Mode === '1'; // Find IP address and subnet fields group

      var $ipAddressGroup = $("#ip-address-group-".concat(eth));
      var $gatewayField = $(".ipv4-gateway-field-".concat(eth));
      var $dhcpInfoMessage = $(".dhcp-info-message-".concat(eth)); // Check if this is the internet interface

      var isInternetInterface = $("input[name=\"internet_interface\"]:checked").val() === eth; // In Docker mode, the dedicated Docker info message is shown instead of DHCP info

      var isDockerInterface = $ipv4ModeDropdown.length === 0;

      if (isDhcpEnabled) {
        // DHCP enabled -> hide IP/subnet fields group and gateway field, show DHCP info
        $ipAddressGroup.hide();
        $gatewayField.hide();

        if (!isDockerInterface) {
          $dhcpInfoMessage.show();
        }

        $("#not-dhcp-".concat(eth)).val('');
      } else {
        // DHCP disabled -> show IP/subnet fields group, hide DHCP info
        $ipAddressGroup.show();
        $dhcpInfoMessage.hide();
        $("#not-dhcp-".concat(eth)).val('1'); // Show gateway field ONLY if this is the internet interface

        if (isInternetInterface) {
          $gatewayField.show();
        } else {
          $gatewayField.hide();
        }
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
    var $ipv6InternetSettings = $(".ipv6-internet-settings-".concat(interfaceId)); // Show manual fields only when mode is '2' (Manual)

    if (ipv6Mode === '2') {
      $manualFieldsContainer.show();
      $autoInfoMessage.hide();
      $ipv6InternetSettings.show();
    } else if (ipv6Mode === '1') {
      // Show Auto (SLAAC/DHCPv6) info message when mode is '1' (Auto)
      $manualFieldsContainer.hide();
      $autoInfoMessage.show();
      $ipv6InternetSettings.show();
    } else {
      // Hide all IPv6 fields for mode '0' (Off)
      $manualFieldsContainer.hide();
      $autoInfoMessage.hide();
      $ipv6InternetSettings.hide();
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
    var $dhcpCheckbox = $("#dhcp-".concat(interfaceId, "-checkbox"));
    var dhcpEnabled = $dhcpCheckbox.length > 0 && $dhcpCheckbox.checkbox('is checked');
    var gateway = $("input[name=\"gateway_".concat(interfaceId, "\"]")).val(); // Get IPv6 configuration

    var ipv6Mode = $("#ipv6_mode_".concat(interfaceId)).val(); // For Manual mode use form field, for Auto mode use current (autoconfigured) value from hidden field

    var ipv6addrManual = $("input[name=\"ipv6addr_".concat(interfaceId, "\"]")).val();
    var ipv6addrAuto = $("#current-ipv6addr-".concat(interfaceId)).val();
    var ipv6addr = ipv6Mode === '1' ? ipv6addrAuto : ipv6addrManual; // Check if IPv4 is present (either static address or DHCP with gateway)
    // Gateway presence indicates DHCP successfully obtained an IPv4 address

    var hasIpv4 = ipv4addr && ipv4addr.trim() !== '' || dhcpEnabled && gateway && gateway.trim() !== ''; // Check if IPv6 is enabled (Auto SLAAC/DHCPv6 or Manual)
    // For Auto mode ('1'), we check currentIpv6addr which shows autoconfigured address

    var hasIpv6 = (ipv6Mode === '1' || ipv6Mode === '2') && ipv6addr && ipv6addr.trim() !== '' && ipv6addr !== 'Autoconfigured';

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
    var $dualStackSection = $('#dual-stack-section'); // Get the exthostname input element and its original parent

    var $exthostnameInput = $('#exthostname');
    var $standardHostnameWrapper = $standardNatSection.find('.max-width-500').has('#exthostname').first();
    var $dualStackHostnameWrapper = $('#exthostname-dual-stack-input-wrapper'); // Get the port input elements and their wrappers

    var $externalSipPortInput = $('input[name="externalSIPPort"]');
    var $externalTlsPortInput = $('input[name="externalTLSPort"]');
    var $standardSipPortWrapper = $('#external-sip-port-standard-wrapper');
    var $standardTlsPortWrapper = $('#external-tls-port-standard-wrapper');
    var $dualStackSipPortWrapper = $('#external-sip-port-dual-stack-wrapper');
    var $dualStackTlsPortWrapper = $('#external-tls-port-dual-stack-wrapper');

    if (anyDualStack) {
      // Dual-stack detected: Hide standard NAT section, show Dual-Stack section
      $standardNatSection.hide();
      $dualStackSection.show(); // Move exthostname input to dual-stack section (avoid duplicate inputs)

      if ($exthostnameInput.length > 0 && $dualStackHostnameWrapper.length > 0) {
        $exthostnameInput.appendTo($dualStackHostnameWrapper);
      } // Move port inputs to dual-stack section (avoid duplicate inputs)


      if ($externalSipPortInput.length > 0 && $dualStackSipPortWrapper.length > 0) {
        $externalSipPortInput.appendTo($dualStackSipPortWrapper);
      }

      if ($externalTlsPortInput.length > 0 && $dualStackTlsPortWrapper.length > 0) {
        $externalTlsPortInput.appendTo($dualStackTlsPortWrapper);
      } // Clear extipaddr (external IP not needed in dual-stack, only hostname)


      networks.$formObj.form('set value', 'extipaddr', ''); // Disable autoUpdateExternalIp (not needed in dual-stack)

      var $autoUpdateCheckbox = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');

      if ($autoUpdateCheckbox.length > 0) {
        $autoUpdateCheckbox.checkbox('uncheck');
      } // Update hostname display in dual-stack info message


      var hostname = $exthostnameInput.val() || 'mikopbx.company.com';
      $('#hostname-display').text(hostname); // Make exthostname required in dual-stack

      networks.validateRules.exthostname.rules = [{
        type: 'empty',
        prompt: globalTranslate.nw_ValidateExternalHostnameEmpty
      }, {
        type: 'validHostname',
        prompt: globalTranslate.nw_ValidateHostnameInvalid
      }];
    } else {
      // No dual-stack: Show standard NAT section, hide Dual-Stack section
      $standardNatSection.show();
      $dualStackSection.hide(); // Move exthostname input back to standard section

      if ($exthostnameInput.length > 0 && $standardHostnameWrapper.length > 0) {
        $exthostnameInput.appendTo($standardHostnameWrapper);
      } // Move port inputs back to standard section


      if ($externalSipPortInput.length > 0 && $standardSipPortWrapper.length > 0) {
        $externalSipPortInput.appendTo($standardSipPortWrapper);
      }

      if ($externalTlsPortInput.length > 0 && $standardTlsPortWrapper.length > 0) {
        $externalTlsPortInput.appendTo($standardTlsPortWrapper);
      } // Restore original exthostname validation (optional with usenat dependency)


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
    // Collect all regular input fields (skip readonly fields to prevent overwriting DHCP-provided values)

    networks.$formObj.find('input[type="text"], input[type="hidden"], input[type="number"], textarea').each(function () {
      var $input = $(this);
      var name = $input.attr('name'); // Skip readonly fields - they contain current DHCP/Auto values and should not be saved

      if (name && !$input.prop('readonly')) {
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
    } // Convert IPv4 mode dropdown values to DHCP boolean for REST API compatibility
    // WHY: UI uses dropdown with values 0=Manual, 1=DHCP but REST API expects dhcp_${id} boolean


    Object.keys(result.data).forEach(function (key) {
      var ipv4ModeMatch = key.match(/^ipv4_mode_(\d+)$/);

      if (ipv4ModeMatch) {
        var interfaceId = ipv4ModeMatch[1];
        var mode = result.data[key]; // Convert dropdown value to boolean: '1' = DHCP enabled, '0' = Manual (DHCP disabled)

        result.data["dhcp_".concat(interfaceId)] = mode === '1'; // Remove ipv4_mode_${id} key as it's not needed by REST API

        delete result.data[key];
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
    }); // Synchronize global hostname to all interfaces
    // WHY: Single hostname field for all interfaces, but REST API expects hostname_${id} for each interface

    var globalHostname = $('#global-hostname').val() || '';
    $('#eth-interfaces-menu a').each(function (index, tab) {
      var interfaceId = $(tab).attr('data-tab');
      result.data["hostname_".concat(interfaceId)] = globalHostname;
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
      }); // Initialize IPv4 mode dropdown for template (ID=0)

      var ipv4ModeOptions = [{
        value: '0',
        text: globalTranslate.nw_IPv4ModeManual
      }, {
        value: '1',
        text: globalTranslate.nw_IPv4ModeDHCP
      }];
      DynamicDropdownBuilder.buildDropdown('ipv4_mode_0', {
        ipv4_mode_0: '1'
      }, {
        staticOptions: ipv4ModeOptions,
        placeholder: globalTranslate.nw_SelectIPv4Mode,
        allowEmpty: false,
        onChange: function onChange() {
          networks.toggleDisabledFieldClass();
          Form.dataChanged();
        }
      }); // Initialize subnet dropdown for template (ID=0)

      DynamicDropdownBuilder.buildDropdown('subnet_0', {
        subnet_0: '24'
      }, {
        staticOptions: networks.getSubnetOptionsArray(),
        placeholder: globalTranslate.nw_SelectNetworkMask,
        allowEmpty: false,
        additionalClasses: ['search']
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

      }); // Initialize IPv4 mode dropdown (Manual/DHCP) for non-Docker environments

      if (!iface.isDocker) {
        var ipv4ModeFieldName = "ipv4_mode_".concat(iface.id);
        var ipv4ModeFormData = {}; // WHY: iface.dhcp can be boolean (from REST API) or string (from form)

        ipv4ModeFormData[ipv4ModeFieldName] = iface.dhcp === '1' || iface.dhcp === true ? '1' : '0';
        var _ipv4ModeOptions = [{
          value: '0',
          text: globalTranslate.nw_IPv4ModeManual
        }, {
          value: '1',
          text: globalTranslate.nw_IPv4ModeDHCP
        }];
        DynamicDropdownBuilder.buildDropdown(ipv4ModeFieldName, ipv4ModeFormData, {
          staticOptions: _ipv4ModeOptions,
          placeholder: globalTranslate.nw_SelectIPv4Mode,
          allowEmpty: false,
          onChange: function onChange() {
            networks.toggleDisabledFieldClass();
            Form.dataChanged();
          }
        });
      } // Initialize IPv6 mode dropdown (Off/Auto/Manual)
      // For VLAN interfaces: only Off and Manual modes (no DHCPv6 Auto)


      var ipv6ModeFieldName = "ipv6_mode_".concat(iface.id);
      var ipv6ModeFormData = {};
      ipv6ModeFormData[ipv6ModeFieldName] = String(iface.ipv6_mode || '0');
      var isVlan = iface.vlanid && parseInt(iface.vlanid, 10) > 0;
      var ipv6ModeOptions = isVlan ? [{
        value: '0',
        text: globalTranslate.nw_IPv6ModeOff
      }, {
        value: '2',
        text: globalTranslate.nw_IPv6ModeManual
      }] : [{
        value: '0',
        text: globalTranslate.nw_IPv6ModeOff
      }, {
        value: '1',
        text: globalTranslate.nw_IPv6ModeAuto
      }, {
        value: '2',
        text: globalTranslate.nw_IPv6ModeManual
      }];
      DynamicDropdownBuilder.buildDropdown(ipv6ModeFieldName, ipv6ModeFormData, {
        staticOptions: ipv6ModeOptions,
        placeholder: globalTranslate.nw_SelectIPv6Mode,
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
        placeholder: globalTranslate.nw_SelectIPv6Subnet,
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
    }); // IPv4 mode dropdowns now initialized via DynamicDropdownBuilder in forEach loop (line ~840)
    // Re-bind IP address input masks

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

    $('input[name^="vlanid_"]').trigger('change'); // Add IPv6 address change handlers to update dual-stack NAT logic

    $('input[name^="ipv6addr_"]').off('input blur').on('input blur', function () {
      // Update dual-stack NAT logic when IPv6 address changes
      networks.updateDualStackNatLogic();
    }); // Add IPv4 address change handlers to update dual-stack NAT logic

    $('input[name^="ipaddr_"]').off('input blur').on('input blur', function () {
      // Update dual-stack NAT logic when IPv4 address changes
      networks.updateDualStackNatLogic();
    }); // Initialize internet radio buttons with Fomantic UI

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
      } // Update Gateway field visibility for all interfaces


      networks.toggleDisabledFieldClass();
    }); // Update DHCP info message visibility when IPv4 mode changes

    $('.ipv4-mode-dropdown').off('change.dnsgateway').on('change.dnsgateway', function () {
      var $dropdown = $(this);
      var interfaceId = $dropdown.attr('id').replace('ipv4-mode-', '');
      var ipv4Mode = $dropdown.dropdown('get value');
      var isDhcpEnabled = ipv4Mode === '1'; // Find DHCP info message

      var $dhcpInfoMessage = $(".dhcp-info-message-".concat(interfaceId));

      if (isDhcpEnabled) {
        // DHCP enabled -> show DHCP info message
        $dhcpInfoMessage.show();
      } else {
        // DHCP disabled -> hide DHCP info message
        $dhcpInfoMessage.hide();
      } // Update IP address group visibility (hide when DHCP on, show when off)


      networks.toggleDisabledFieldClass(); // Update dual-stack NAT logic when IPv4 mode changes

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
    var isInternetInterface = iface.internet || false; // DNS/Gateway fields visibility

    var dnsGatewayVisible = isInternetInterface ? '' : 'style="display:none;"'; // Readonly/Placeholder logic for DHCP-controlled fields

    var dhcpDisabled = isDocker || iface.vlanid > 0;
    var dhcpChecked = isDocker || (iface.vlanid > 0 ? false : iface.dhcp); // IPv4 placeholders when DHCP enabled

    var hostnamePlaceholder = dhcpChecked ? globalTranslate.nw_PlaceholderDhcpHostname : 'mikopbx';
    var primaryDnsPlaceholder = dhcpChecked ? "".concat(globalTranslate.nw_PlaceholderDhcpDns, " ").concat(iface.currentPrimarydns || iface.primarydns || '8.8.8.8') : '8.8.8.8';
    var secondaryDnsPlaceholder = dhcpChecked ? "".concat(globalTranslate.nw_PlaceholderDhcpDns, " ").concat(iface.currentSecondarydns || iface.secondarydns || '8.8.4.4') : '8.8.4.4'; // IPv6 DNS placeholders (always editable)

    var ipv6PrimaryDnsPlaceholder = globalTranslate.nw_PlaceholderIPv6Dns;
    var ipv6SecondaryDnsPlaceholder = globalTranslate.nw_PlaceholderIPv6Dns;
    return "\n            <div class=\"ui bottom attached tab segment ".concat(isActive ? 'active' : '', "\" data-tab=\"").concat(id, "\">\n                <input type=\"hidden\" name=\"interface_").concat(id, "\" value=\"").concat(iface["interface"], "\" />\n\n                <!-- Common Settings Section (outside columns) -->\n                ").concat(isDocker ? "\n                <input type=\"hidden\" name=\"name_".concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                <input type=\"hidden\" name=\"internet_interface\" value=\"").concat(id, "\" />\n                <input type=\"hidden\" name=\"dhcp_").concat(id, "\" value=\"on\" />\n                <input type=\"hidden\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                <input type=\"hidden\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '24', "\" />\n                ") : "\n                <div class=\"field\">\n                    <label>".concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" value=\"").concat(iface.name || '', "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox internet-radio\" id=\"internet-").concat(id, "-radio\">\n                            <input type=\"radio\" name=\"internet_interface\" value=\"").concat(id, "\" ").concat(isInternetInterface ? 'checked' : '', " />\n                            <label><i class=\"globe icon\"></i> ").concat(globalTranslate.nw_InternetInterface, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"").concat(iface.vlanid || '0', "\" />\n                    </div>\n                </div>\n                "), "\n\n                <!-- Two Column Grid: IPv4 (left) and IPv6 (right) -->\n                <div class=\"ui two column stackable grid\">\n\n                    <!-- IPv4 Configuration Column -->\n                    <div class=\"column\">\n                        <h4 class=\"ui dividing header\">\n                            <i class=\"globe icon\"></i>\n                            <div class=\"content\">\n                                ").concat(globalTranslate.nw_IPv4Configuration, "\n                            </div>\n                        </h4>\n\n                        ").concat(isDocker ? '' : "\n                        <div class=\"field\">\n                            <label>".concat(globalTranslate.nw_IPv4Mode, "</label>\n                            <div class=\"field max-width-400\">\n                                <input type=\"hidden\" id=\"ipv4_mode_").concat(id, "\" name=\"ipv4_mode_").concat(id, "\" value=\"").concat(dhcpChecked ? '1' : '0', "\" />\n                            </div>\n                        </div>\n                        "), "\n\n                        <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                        ").concat(isDocker ? '' : "\n                        <div class=\"fields\" id=\"ip-address-group-".concat(id, "\">\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"").concat(iface.ipaddr || '', "\" />\n                                </div>\n                            </div>\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"").concat(iface.subnet || '', "\" />\n                                </div>\n                            </div>\n                        </div>\n                        "), "\n\n                        ").concat(isDocker ? '' : "\n                        <div class=\"ipv4-gateway-field-".concat(id, "\" style=\"display: ").concat(isInternetInterface && !dhcpChecked ? 'block' : 'none', ";\">\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_Gateway, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipaddress\" name=\"gateway_").concat(id, "\" value=\"").concat(iface.gateway || '', "\" placeholder=\"192.168.1.1\" />\n                                </div>\n                            </div>\n                        </div>\n                        "), "\n\n                        <!-- IPv4 Internet Settings (only if Internet interface) -->\n                        <div class=\"ipv4-internet-settings-").concat(id, "\" ").concat(dnsGatewayVisible, ">\n                            <div class=\"ui horizontal divider\">").concat(globalTranslate.nw_InternetIPv4, "</div>\n\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_PrimaryDNS, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipaddress\" name=\"primarydns_").concat(id, "\" value=\"").concat(iface.currentPrimarydns || iface.primarydns || '', "\" placeholder=\"").concat(primaryDnsPlaceholder, "\" />\n                                </div>\n                            </div>\n\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_SecondaryDNS, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipaddress\" name=\"secondarydns_").concat(id, "\" value=\"").concat(iface.currentSecondarydns || iface.secondarydns || '', "\" placeholder=\"").concat(secondaryDnsPlaceholder, "\" />\n                                </div>\n                            </div>\n                        </div>\n\n                        <div class=\"ui hidden divider\"></div>\n\n                        <div class=\"dhcp-info-message-").concat(id, "\" style=\"display: ").concat(dhcpChecked && !isDocker ? 'block' : 'none', ";\">\n                            <div class=\"ui compact info message\">\n                                <div class=\"content\">\n                                    <div class=\"header\">").concat(globalTranslate.nw_DHCPInfoHeader, "</div>\n                                    <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                        <li>").concat(globalTranslate.nw_DHCPInfoIP, ": <strong>").concat(iface.currentIpaddr || iface.ipaddr || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoSubnet, ": <strong>/").concat(iface.currentSubnet || iface.subnet || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoGateway, ": <strong>").concat(iface.currentGateway || iface.gateway || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoDNS, ": <strong>").concat(iface.primarydns || 'N/A').concat(iface.secondarydns ? ', ' + iface.secondarydns : '', "</strong></li>\n                                        ").concat(iface.domain ? "<li>".concat(globalTranslate.nw_DHCPInfoDomain, ": <strong>").concat(iface.domain, "</strong></li>") : '', "\n                                    </ul>\n                                </div>\n                            </div>\n                        </div>\n\n                        ").concat(isDocker ? "\n                        <div class=\"docker-info-message-".concat(id, "\">\n                            <div class=\"ui compact info message\">\n                                <div class=\"content\">\n                                    <div class=\"header\">").concat(globalTranslate.nw_DockerIPv4Info || 'Current IPv4 Configuration', "</div>\n                                    <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                        <li>").concat(globalTranslate.nw_DHCPInfoIP, ": <strong>").concat(iface.currentIpaddr || iface.ipaddr || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoSubnet, ": <strong>/").concat(iface.currentSubnet || iface.subnet || 'N/A', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_DHCPInfoGateway, ": <strong>").concat(iface.currentGateway || iface.gateway || 'N/A', "</strong></li>\n                                    </ul>\n                                    <p style=\"margin-top: 0.5em;\"><i class=\"info circle icon\"></i>").concat(globalTranslate.nw_DockerIPv4InfoNote || 'Network settings are managed by Docker runtime. Only DNS servers can be configured.', "</p>\n                                </div>\n                            </div>\n                        </div>\n                        ") : '', "\n                    </div>\n\n                    <!-- IPv6 Configuration Column -->\n                    <div class=\"column\">\n                        <h4 class=\"ui dividing header\">\n                            <i class=\"world icon\"></i>\n                            <div class=\"content\">\n                                ").concat(globalTranslate.nw_IPv6Configuration, "\n                            </div>\n                        </h4>\n\n                        <div class=\"field\">\n                            <label>").concat(globalTranslate.nw_IPv6Mode, "</label>\n                            <div class=\"field max-width-400\">\n                                <input type=\"hidden\" id=\"ipv6_mode_").concat(id, "\" name=\"ipv6_mode_").concat(id, "\" value=\"").concat(iface.ipv6_mode || '0', "\" />\n                            </div>\n                        </div>\n\n                        <!-- Hidden field to store current auto-configured IPv6 address -->\n                        <input type=\"hidden\" id=\"current-ipv6addr-").concat(id, "\" value=\"").concat(iface.currentIpv6addr || '', "\" />\n\n                        <div class=\"ipv6-manual-fields-").concat(id, "\" style=\"display: none;\">\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_IPv6Address, "</label>\n                                <div class=\"field max-width-600\">\n                                    <input type=\"text\" class=\"ipv6address\" name=\"ipv6addr_").concat(id, "\" value=\"").concat(iface.ipv6addr || '', "\" placeholder=\"fd00::1\" />\n                                </div>\n                            </div>\n                            <div class=\"field\">\n                                <label>").concat(globalTranslate.nw_IPv6Subnet, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"hidden\" id=\"ipv6_subnet_").concat(id, "\" name=\"ipv6_subnet_").concat(id, "\" value=\"").concat(iface.ipv6_subnet || '64', "\" />\n                                </div>\n                            </div>\n                            <div class=\"field\" ").concat(dnsGatewayVisible, ">\n                                <label>").concat(globalTranslate.nw_IPv6Gateway, "</label>\n                                <div class=\"field max-width-600\">\n                                    <input type=\"text\" class=\"ipv6address\" name=\"ipv6_gateway_").concat(id, "\" value=\"").concat(iface.ipv6_gateway || '', "\" placeholder=\"fe80::1\" />\n                                </div>\n                            </div>\n                        </div>\n\n                        <!-- IPv6 Internet Settings (only if Internet interface) -->\n                        <div class=\"ipv6-internet-settings-").concat(id, "\" ").concat(dnsGatewayVisible, ">\n                            <div class=\"ui horizontal divider\">").concat(globalTranslate.nw_InternetIPv6, "</div>\n\n                            <div class=\"field ipv6-primarydns-field-").concat(id, "\">\n                                <label>").concat(globalTranslate.nw_IPv6PrimaryDNS, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipv6address\" name=\"primarydns6_").concat(id, "\" value=\"").concat(iface.currentPrimarydns6 || iface.primarydns6 || '', "\" placeholder=\"").concat(ipv6PrimaryDnsPlaceholder, "\" />\n                                </div>\n                            </div>\n\n                            <div class=\"field ipv6-secondarydns-field-").concat(id, "\">\n                                <label>").concat(globalTranslate.nw_IPv6SecondaryDNS, "</label>\n                                <div class=\"field max-width-400\">\n                                    <input type=\"text\" class=\"ipv6address\" name=\"secondarydns6_").concat(id, "\" value=\"").concat(iface.currentSecondarydns6 || iface.secondarydns6 || '', "\" placeholder=\"").concat(ipv6SecondaryDnsPlaceholder, "\" />\n                                </div>\n                            </div>\n                        </div>\n\n                        <div class=\"ui hidden divider\"></div>\n\n                        <div class=\"ipv6-auto-info-message-").concat(id, "\" style=\"display: ").concat(iface.ipv6_mode === '1' ? 'block' : 'none', ";\">\n                            <div class=\"ui compact info message\">\n                                <div class=\"content\">\n                                    <div class=\"header\">").concat(globalTranslate.nw_IPv6AutoInfoHeader, "</div>\n                                    <ul class=\"list\" style=\"margin-top: 0.5em;\">\n                                        <li>").concat(globalTranslate.nw_IPv6AutoInfoAddress, ": <strong>").concat(iface.currentIpv6addr || iface.ipv6addr || 'Autoconfigured', "</strong></li>\n                                        <li>").concat(globalTranslate.nw_IPv6AutoInfoPrefix, ": <strong>/").concat(iface.currentIpv6_subnet || iface.ipv6_subnet || '64', "</strong></li>\n                                        ").concat(iface.currentIpv6_gateway || iface.ipv6_gateway ? "<li>".concat(globalTranslate.nw_IPv6AutoInfoGateway, ": <strong>").concat(iface.currentIpv6_gateway || iface.ipv6_gateway, "</strong></li>") : '', "\n                                    </ul>\n                                </div>\n                            </div>\n                        </div>\n                    </div>\n                </div>\n\n                ").concat(deleteButton, "\n            </div>\n        ");
  },

  /**
   * Create form for new VLAN template
   */
  createTemplateForm: function createTemplateForm(template, interfaces) {
    var id = 0;
    return "\n            <div class=\"ui bottom attached tab segment\" data-tab=\"".concat(id, "\">\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_SelectInterface, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"hidden\" name=\"interface_").concat(id, "\" id=\"interface_").concat(id, "\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_InterfaceName, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"text\" name=\"name_").concat(id, "\" id=\"name_").concat(id, "\" value=\"\" />\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <div class=\"ui segment\">\n                        <div class=\"ui toggle checkbox dhcp-checkbox\" id=\"dhcp-").concat(id, "-checkbox\">\n                            <input type=\"checkbox\" name=\"dhcp_").concat(id, "\" checked />\n                            <label>").concat(globalTranslate.nw_UseDHCP, "</label>\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_IPv4Mode, "</label>\n                    <div class=\"field max-width-400\">\n                        <input type=\"hidden\" id=\"ipv4_mode_").concat(id, "\" name=\"ipv4_mode_").concat(id, "\" value=\"1\" />\n                    </div>\n                </div>\n\n                <input type=\"hidden\" name=\"notdhcp_").concat(id, "\" id=\"not-dhcp-").concat(id, "\"/>\n\n                <div class=\"fields\" id=\"ip-address-group-").concat(id, "\">\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_IPAddress, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"text\" class=\"ipaddress\" name=\"ipaddr_").concat(id, "\" value=\"\" />\n                        </div>\n                    </div>\n                    <div class=\"field\">\n                        <label>").concat(globalTranslate.nw_NetworkMask, "</label>\n                        <div class=\"field max-width-400\">\n                            <input type=\"hidden\" id=\"subnet_").concat(id, "\" name=\"subnet_").concat(id, "\" value=\"24\" />\n                        </div>\n                    </div>\n                </div>\n\n                <div class=\"field\">\n                    <label>").concat(globalTranslate.nw_VlanID, "</label>\n                    <div class=\"field max-width-100\">\n                        <input type=\"number\" name=\"vlanid_").concat(id, "\" value=\"4095\" />\n                    </div>\n                </div>\n            </div>\n        ");
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
    networks.createInterfaceTabs(data, data.isDocker || false); // Populate global hostname from first interface (single value for all interfaces)

    if (data.interfaces && data.interfaces.length > 0) {
      var firstInterface = data.interfaces[0];
      var hostname = firstInterface.currentHostname || firstInterface.hostname || '';
      $('#global-hostname').val(hostname);
    } // Set NAT settings


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
    // Get unmasked value for extipaddr (inputmask may return "_._._._" for empty)
    var extipaddr = networks.$extipaddr.inputmask('unmaskedvalue') || '';
    var exthostname = (allValues.exthostname || '').trim();

    if (exthostname === '' && extipaddr === '') {
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
   * Update visibility of static routes section.
   * Section is hidden by default in Volt template; show it once JS is ready.
   * Docker hiding is handled separately via the parent .do-not-show-if-docker wrapper.
   */
  updateVisibility: function updateVisibility() {
    StaticRoutesManager.$section.show();
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
      text: globalTranslate.nw_Auto
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJleHRpcGFkZHIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck5vdFJpZ2h0IiwibndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSIsImV4dGhvc3RuYW1lIiwiZGVwZW5kcyIsIm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkIiwiaW5pdGlhbGl6ZSIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJmb3JtIiwiaGlkZSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaXAiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXAiLCJjdXJyZW50RXh0SXBBZGRyIiwicG9ydE1hdGNoIiwibWF0Y2giLCJwb3J0IiwibmV3RXh0SXBBZGRyIiwidHJpZ2dlciIsInVwZGF0ZU5BVEhlbHBUZXh0IiwicG9ydHMiLCJTSVBQb3J0IiwiVExTX1BPUlQiLCJSVFBQb3J0RnJvbSIsIlJUUFBvcnRUbyIsIiRzaXBQb3J0VmFsdWVzIiwibGVuZ3RoIiwic2lwVGV4dCIsImkxOG4iLCJodG1sIiwiJHJ0cFBvcnRWYWx1ZXMiLCJydHBUZXh0IiwiJGR1YWxTdGFja1NpcFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tTaXBUZXh0IiwiJGR1YWxTdGFja1J0cFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tSdHBUZXh0IiwidXBkYXRlUG9ydExhYmVscyIsIiRzaXBMYWJlbCIsInNpcExhYmVsVGV4dCIsInRleHQiLCIkdGxzTGFiZWwiLCJ0bHNMYWJlbFRleHQiLCIkZHVhbFN0YWNrU2lwTGFiZWwiLCJkdWFsU3RhY2tTaXBMYWJlbFRleHQiLCIkZHVhbFN0YWNrVGxzTGFiZWwiLCJkdWFsU3RhY2tUbHNMYWJlbFRleHQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJldGgiLCJhdHRyIiwiJGlwdjRNb2RlRHJvcGRvd24iLCJpcHY0TW9kZSIsImlzRGhjcEVuYWJsZWQiLCIkaXBBZGRyZXNzR3JvdXAiLCIkZ2F0ZXdheUZpZWxkIiwiJGRoY3BJbmZvTWVzc2FnZSIsImlzSW50ZXJuZXRJbnRlcmZhY2UiLCJ2YWwiLCJpc0RvY2tlckludGVyZmFjZSIsInNob3ciLCJhZGROZXdGb3JtUnVsZXMiLCJ1cGRhdGVEdWFsU3RhY2tOYXRMb2dpYyIsInRvZ2dsZUlQdjZGaWVsZHMiLCJpbnRlcmZhY2VJZCIsIiRpcHY2TW9kZURyb3Bkb3duIiwiaXB2Nk1vZGUiLCIkbWFudWFsRmllbGRzQ29udGFpbmVyIiwiJGF1dG9JbmZvTWVzc2FnZSIsIiRpcHY2SW50ZXJuZXRTZXR0aW5ncyIsImlzRHVhbFN0YWNrTW9kZSIsImlwdjRhZGRyIiwiJGRoY3BDaGVja2JveCIsImRoY3BFbmFibGVkIiwiZ2F0ZXdheSIsImlwdjZhZGRyTWFudWFsIiwiaXB2NmFkZHJBdXRvIiwiaXB2NmFkZHIiLCJoYXNJcHY0IiwidHJpbSIsImhhc0lwdjYiLCJpcHY2TG93ZXIiLCJ0b0xvd2VyQ2FzZSIsImlwdjZXaXRob3V0Q2lkciIsInNwbGl0IiwiaXNHbG9iYWxVbmljYXN0IiwidGVzdCIsImlzTmF0RW5hYmxlZCIsImFueUR1YWxTdGFjayIsInRhYiIsIiRzdGFuZGFyZE5hdFNlY3Rpb24iLCIkZHVhbFN0YWNrU2VjdGlvbiIsIiRleHRob3N0bmFtZUlucHV0IiwiJHN0YW5kYXJkSG9zdG5hbWVXcmFwcGVyIiwiZmluZCIsImhhcyIsImZpcnN0IiwiJGR1YWxTdGFja0hvc3RuYW1lV3JhcHBlciIsIiRleHRlcm5hbFNpcFBvcnRJbnB1dCIsIiRleHRlcm5hbFRsc1BvcnRJbnB1dCIsIiRzdGFuZGFyZFNpcFBvcnRXcmFwcGVyIiwiJHN0YW5kYXJkVGxzUG9ydFdyYXBwZXIiLCIkZHVhbFN0YWNrU2lwUG9ydFdyYXBwZXIiLCIkZHVhbFN0YWNrVGxzUG9ydFdyYXBwZXIiLCJhcHBlbmRUbyIsIiRhdXRvVXBkYXRlQ2hlY2tib3giLCJwYXJlbnQiLCJob3N0bmFtZSIsIm53X1ZhbGlkYXRlRXh0ZXJuYWxIb3N0bmFtZUVtcHR5IiwiZmllbGRzIiwibmV3Um93SWQiLCJuYW1lQ2xhc3MiLCJpZGVudGlmaWVyIiwibndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5IiwidmxhbkNsYXNzIiwibndfVmFsaWRhdGVWbGFuUmFuZ2UiLCJud19WYWxpZGF0ZVZsYW5Dcm9zcyIsImlwYWRkckNsYXNzIiwibndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSIsIm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiT2JqZWN0IiwiYXNzaWduIiwic3RhdGljUm91dGVzIiwiY29sbGVjdFJvdXRlcyIsIiRpbnB1dCIsIm5hbWUiLCJwcm9wIiwidmFsdWUiLCJ1bmRlZmluZWQiLCJTdHJpbmciLCIkc2VsZWN0IiwidXNlbmF0IiwiJGF1dG9VcGRhdGVEaXYiLCJhdXRvVXBkYXRlRXh0ZXJuYWxJcCIsImtleXMiLCJmb3JFYWNoIiwia2V5IiwiaXB2NE1vZGVNYXRjaCIsIm1vZGUiLCIkY2hlY2tlZFJhZGlvIiwiaW50ZXJuZXRfaW50ZXJmYWNlIiwiaXB2Nk1vZGVNYXRjaCIsInN1Ym5ldEtleSIsImdsb2JhbEhvc3RuYW1lIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImlubGluZSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIk5ldHdvcmtBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsImlzRG9ja2VyIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJzaG93RG9ja2VyTmV0d29ya0luZm8iLCJjb25zb2xlIiwid2FybiIsImNpZHJUb05ldG1hc2siLCJjaWRyIiwibWFzayIsImpvaW4iLCJjcmVhdGVJbnRlcmZhY2VUYWJzIiwiJG1lbnUiLCIkY29udGVudCIsImVtcHR5IiwiaW50ZXJmYWNlcyIsImlmYWNlIiwidGFiSWQiLCJpZCIsInRhYkxhYmVsIiwidmxhbmlkIiwiaXNBY3RpdmUiLCJhcHBlbmQiLCJjYW5EZWxldGUiLCJwYXJzZUludCIsImRlbGV0ZUJ1dHRvbiIsIm53X0RlbGV0ZUN1cnJlbnRJbnRlcmZhY2UiLCJjcmVhdGVJbnRlcmZhY2VGb3JtIiwidGVtcGxhdGUiLCJjcmVhdGVUZW1wbGF0ZUZvcm0iLCJwaHlzaWNhbEludGVyZmFjZXMiLCJ0b1N0cmluZyIsInBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyIsInZhbHVlcyIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW50ZXJmYWNlXzAiLCJzdGF0aWNPcHRpb25zIiwicGxhY2Vob2xkZXIiLCJud19TZWxlY3RJbnRlcmZhY2UiLCJhbGxvd0VtcHR5IiwiaXB2NE1vZGVPcHRpb25zIiwibndfSVB2NE1vZGVNYW51YWwiLCJud19JUHY0TW9kZURIQ1AiLCJpcHY0X21vZGVfMCIsIm53X1NlbGVjdElQdjRNb2RlIiwiZGF0YUNoYW5nZWQiLCJzdWJuZXRfMCIsImdldFN1Ym5ldE9wdGlvbnNBcnJheSIsIm53X1NlbGVjdE5ldHdvcmtNYXNrIiwiYWRkaXRpb25hbENsYXNzZXMiLCJmaWVsZE5hbWUiLCJmb3JtRGF0YSIsInN1Ym5ldCIsImlwdjRNb2RlRmllbGROYW1lIiwiaXB2NE1vZGVGb3JtRGF0YSIsImRoY3AiLCJpcHY2TW9kZUZpZWxkTmFtZSIsImlwdjZNb2RlRm9ybURhdGEiLCJpcHY2X21vZGUiLCJpc1ZsYW4iLCJpcHY2TW9kZU9wdGlvbnMiLCJud19JUHY2TW9kZU9mZiIsIm53X0lQdjZNb2RlTWFudWFsIiwibndfSVB2Nk1vZGVBdXRvIiwibndfU2VsZWN0SVB2Nk1vZGUiLCJpcHY2U3VibmV0RmllbGROYW1lIiwiaXB2NlN1Ym5ldEZvcm1EYXRhIiwiaXB2Nl9zdWJuZXQiLCJnZXRJcHY2U3VibmV0T3B0aW9uc0FycmF5IiwibndfU2VsZWN0SVB2NlN1Ym5ldCIsInVwZGF0ZVZpc2liaWxpdHkiLCJvZmYiLCIkYnV0dG9uIiwicmVtb3ZlIiwiJHRhYkNvbnRlbnQiLCIkZmlyc3RUYWIiLCJlbmFibGVEaXJyaXR5IiwiY2hlY2tWYWx1ZXMiLCIkdmxhbklucHV0IiwicmVwbGFjZSIsInZsYW5WYWx1ZSIsInNlbGVjdGVkSW50ZXJmYWNlSWQiLCIkdGFiIiwicHJlcGVuZCIsIiRkcm9wZG93biIsIm9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMiLCJzYXZlSW5pdGlhbFZhbHVlcyIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJmb21hbnRpY1ZhbHVlcyIsIm1hbnVhbFZhbHVlcyIsIiRmaWVsZCIsImlzIiwib2xkRm9ybVZhbHVlcyIsIm5ld0Zvcm1WYWx1ZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsInNldEV2ZW50cyIsImludGVybmV0IiwiZG5zR2F0ZXdheVZpc2libGUiLCJkaGNwRGlzYWJsZWQiLCJkaGNwQ2hlY2tlZCIsImhvc3RuYW1lUGxhY2Vob2xkZXIiLCJud19QbGFjZWhvbGRlckRoY3BIb3N0bmFtZSIsInByaW1hcnlEbnNQbGFjZWhvbGRlciIsIm53X1BsYWNlaG9sZGVyRGhjcERucyIsImN1cnJlbnRQcmltYXJ5ZG5zIiwicHJpbWFyeWRucyIsInNlY29uZGFyeURuc1BsYWNlaG9sZGVyIiwiY3VycmVudFNlY29uZGFyeWRucyIsInNlY29uZGFyeWRucyIsImlwdjZQcmltYXJ5RG5zUGxhY2Vob2xkZXIiLCJud19QbGFjZWhvbGRlcklQdjZEbnMiLCJpcHY2U2Vjb25kYXJ5RG5zUGxhY2Vob2xkZXIiLCJpcGFkZHIiLCJud19JbnRlcmZhY2VOYW1lIiwibndfSW50ZXJuZXRJbnRlcmZhY2UiLCJud19WbGFuSUQiLCJud19JUHY0Q29uZmlndXJhdGlvbiIsIm53X0lQdjRNb2RlIiwibndfSVBBZGRyZXNzIiwibndfTmV0d29ya01hc2siLCJud19HYXRld2F5IiwibndfSW50ZXJuZXRJUHY0IiwibndfUHJpbWFyeUROUyIsIm53X1NlY29uZGFyeUROUyIsIm53X0RIQ1BJbmZvSGVhZGVyIiwibndfREhDUEluZm9JUCIsImN1cnJlbnRJcGFkZHIiLCJud19ESENQSW5mb1N1Ym5ldCIsImN1cnJlbnRTdWJuZXQiLCJud19ESENQSW5mb0dhdGV3YXkiLCJjdXJyZW50R2F0ZXdheSIsIm53X0RIQ1BJbmZvRE5TIiwiZG9tYWluIiwibndfREhDUEluZm9Eb21haW4iLCJud19Eb2NrZXJJUHY0SW5mbyIsIm53X0RvY2tlcklQdjRJbmZvTm90ZSIsIm53X0lQdjZDb25maWd1cmF0aW9uIiwibndfSVB2Nk1vZGUiLCJjdXJyZW50SXB2NmFkZHIiLCJud19JUHY2QWRkcmVzcyIsIm53X0lQdjZTdWJuZXQiLCJud19JUHY2R2F0ZXdheSIsImlwdjZfZ2F0ZXdheSIsIm53X0ludGVybmV0SVB2NiIsIm53X0lQdjZQcmltYXJ5RE5TIiwiY3VycmVudFByaW1hcnlkbnM2IiwicHJpbWFyeWRuczYiLCJud19JUHY2U2Vjb25kYXJ5RE5TIiwiY3VycmVudFNlY29uZGFyeWRuczYiLCJzZWNvbmRhcnlkbnM2IiwibndfSVB2NkF1dG9JbmZvSGVhZGVyIiwibndfSVB2NkF1dG9JbmZvQWRkcmVzcyIsIm53X0lQdjZBdXRvSW5mb1ByZWZpeCIsImN1cnJlbnRJcHY2X3N1Ym5ldCIsImN1cnJlbnRJcHY2X2dhdGV3YXkiLCJud19JUHY2QXV0b0luZm9HYXRld2F5IiwibndfVXNlREhDUCIsIm9wdGlvbnMiLCJpIiwiZGVzY3JpcHRpb24iLCJwdXNoIiwiZmlyc3RJbnRlcmZhY2UiLCJjdXJyZW50SG9zdG5hbWUiLCJuYXQiLCJBVVRPX1VQREFURV9FWFRFUk5BTF9JUCIsImF2YWlsYWJsZUludGVyZmFjZXMiLCJsb2FkUm91dGVzIiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJmbiIsImYiLCJhIiwiaXB2NlBhdHRlcm4iLCJpcGFkZHJlc3MiLCJpcGFkZHJXaXRoUG9ydE9wdGlvbmFsIiwiY2hlY2tWbGFuIiwicGFyYW0iLCJhbGxWYWx1ZXMiLCJuZXdFdGhOYW1lIiwidmxhbmlkXzAiLCJpbmRleE9mIiwiZXRoTmFtZSIsImluQXJyYXkiLCJleHRlbmFsSXBIb3N0IiwidmFsaWRIb3N0bmFtZSIsImhvc3RuYW1lUmVnZXgiLCIkdGFibGUiLCIkc2VjdGlvbiIsIiRhZGRCdXR0b24iLCIkdGFibGVDb250YWluZXIiLCIkZW1wdHlQbGFjZWhvbGRlciIsInJvdXRlcyIsImluaXRpYWxpemVEcmFnQW5kRHJvcCIsImFkZFJvdXRlIiwiZG9jdW1lbnQiLCJ0YXJnZXQiLCJjbG9zZXN0IiwidXBkYXRlUHJpb3JpdGllcyIsInVwZGF0ZUVtcHR5U3RhdGUiLCIkc291cmNlUm93IiwiY29weVJvdXRlIiwicGFzdGVkRGF0YSIsIm9yaWdpbmFsRXZlbnQiLCJjbGlwYm9hcmREYXRhIiwiZ2V0RGF0YSIsIndpbmRvdyIsImNsZWFuZWREYXRhIiwic2V0VGltZW91dCIsInRhYmxlRG5EVXBkYXRlIiwidGFibGVEbkQiLCJvbkRyb3AiLCJkcmFnSGFuZGxlIiwicm91dGVJZCIsInN1Ym5ldERyb3Bkb3duSWQiLCJpbnRlcmZhY2VEcm9wZG93bklkIiwicm91dGVEYXRhIiwibmV0d29yayIsIiRleGlzdGluZ1Jvd3MiLCIkdGVtcGxhdGUiLCJsYXN0IiwiJG5ld1JvdyIsImNsb25lIiwiRGF0ZSIsIm5vdyIsImFmdGVyIiwiaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duIiwiaW5pdGlhbGl6ZUludGVyZmFjZURyb3Bkb3duIiwiJHJvdyIsInNlbGVjdGVkVmFsdWUiLCIkY29udGFpbmVyIiwiZHJvcGRvd25JZCIsIm53X0F1dG8iLCJtYXAiLCJsYWJlbCIsInJvdyIsInJvdXRlc0RhdGEiLCJyb3V0ZSIsInN0YXJ0c1dpdGgiLCJwcmlvcml0eSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBQ2JDLEVBQUFBLGNBQWMsRUFBRUMsQ0FBQyxDQUFDLFVBQUQsQ0FESjs7QUFHYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVELENBQUMsQ0FBQyxlQUFELENBUEU7QUFTYkUsRUFBQUEsVUFBVSxFQUFFRixDQUFDLENBQUMseUJBQUQsQ0FUQTtBQVViRyxFQUFBQSxVQUFVLEVBQUVILENBQUMsQ0FBQyxZQUFELENBVkE7QUFXYkksRUFBQUEsZUFBZSxFQUFFSixDQUFDLENBQUMsWUFBRCxDQVhMO0FBWWJLLEVBQUFBLFVBQVUsRUFBRSxFQVpDOztBQWNiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG9CQUFvQixFQUFFTixDQUFDLENBQUMsd0JBQUQsQ0FsQlY7O0FBb0JiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSU8sRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFNBQVMsRUFBRTtBQUNQQyxNQUFBQSxRQUFR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QUFBYzFGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQWpCRyxFQWtCSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBYzFGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQWxCRyxFQW1CSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBYzFGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQW5CRyxFQW9CSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBYzFGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQXBCRyxFQXFCSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBYzFGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQXJCRyxFQXNCSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBYzFGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQXRCRyxFQXVCSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLElBQVI7QUFBYzFGLE1BQUFBLElBQUksRUFBRTtBQUFwQixLQXZCRyxFQXdCSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYTFGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQXhCRyxFQXlCSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYTFGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQXpCRyxFQTBCSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYTFGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTFCRyxFQTJCSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYTFGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTNCRyxFQTRCSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYTFGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTVCRyxFQTZCSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFBYTFGLE1BQUFBLElBQUksRUFBRTtBQUFuQixLQTdCRyxFQThCSDtBQUFDMEYsTUFBQUEsS0FBSyxFQUFFLEdBQVI7QUFB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RUFBZ0NwQyxHQUFoQyxFQU5MO0FBT1JzVixRQUFBQSxRQUFRLEVBQUVqVyxLQUFLLEdBQUc7QUFQVixPQUFaO0FBU0gsS0FmRDtBQWdCQSxXQUFPa1QsTUFBUDtBQUNIO0FBNVR1QixDQUE1QjtBQStUQTtBQUNBO0FBQ0E7O0FBQ0FsWSxDQUFDLENBQUNxWSxRQUFELENBQUQsQ0FBWTZDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnBiLEVBQUFBLFFBQVEsQ0FBQ3FCLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBTeXNpbmZvQVBJLCBOZXR3b3JrQVBJLCBVc2VyTWVzc2FnZSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbmV0d29yayBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgbmV0d29ya3NcbiAqL1xuY29uc3QgbmV0d29ya3MgPSB7XG4gICAgJGdldE15SXBCdXR0b246ICQoJyNnZXRteWlwJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbmV0d29yay1mb3JtJyksXG5cbiAgICAkZHJvcERvd25zOiAkKCcjbmV0d29yay1mb3JtIC5kcm9wZG93bicpLFxuICAgICRleHRpcGFkZHI6ICQoJyNleHRpcGFkZHInKSxcbiAgICAkaXBhZGRyZXNzSW5wdXQ6ICQoJy5pcGFkZHJlc3MnKSxcbiAgICB2bGFuc0FycmF5OiB7fSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50cyB3aXRoIHdlIHNob3VsZCBoaWRlIGZyb20gdGhlIGZvcm0gZm9yIGRvY2tlciBpbnN0YWxsYXRpb24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbm90U2hvd09uRG9ja2VyRGl2czogJCgnLmRvLW5vdC1zaG93LWlmLWRvY2tlcicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGV4dGlwYWRkcjoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcldpdGhQb3J0T3B0aW9uYWwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRob3N0bmFtZToge1xuICAgICAgICAgICAgZGVwZW5kczogJ3VzZW5hdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndmFsaWRIb3N0bmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgbmV0d29yayBzZXR0aW5ncyBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIExvYWQgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgICAgbmV0d29ya3MubG9hZENvbmZpZ3VyYXRpb24oKTtcblxuICAgICAgICAvLyBIYW5kbGVzIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlICd1c2VuYXQtY2hlY2tib3gnLlxuICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgbmV0d29ya3MuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIERIQ1AgY2hlY2tib3ggaGFuZGxlcnMgd2lsbCBiZSBib3VuZCBhZnRlciB0YWJzIGFyZSBjcmVhdGVkIGR5bmFtaWNhbGx5XG5cbiAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBTeXNpbmZvQVBJLmdldEV4dGVybmFsSXBJbmZvKG5ldHdvcmtzLmNiQWZ0ZXJHZXRFeHRlcm5hbElwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIHdpbGwgYmUgYm91bmQgYWZ0ZXIgdGFicyBhcmUgY3JlYXRlZCBkeW5hbWljYWxseVxuICAgICAgICBuZXR3b3Jrcy4kaXBhZGRyZXNzSW5wdXQuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgLy8gQXBwbHkgSVAgbWFzayBmb3IgZXh0ZXJuYWwgSVAgYWRkcmVzcyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy4kZXh0aXBhZGRyLmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIG5ldHdvcmtzLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdGF0aWMgcm91dGVzIG1hbmFnZXJcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplKCk7XG5cbiAgICAgICAgLy8gSGlkZSBzdGF0aWMgcm91dGVzIHNlY3Rpb24gaW4gRG9ja2VyIChtYW5hZ2VkIHZpYSBkby1ub3Qtc2hvdy1pZi1kb2NrZXIgY2xhc3MpXG4gICAgICAgIGlmIChuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpcy1kb2NrZXInKT09PVwiMVwiKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZ2V0dGluZyB0aGUgZXh0ZXJuYWwgSVAgZnJvbSBhIHJlbW90ZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufE9iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyLiBJZiBmYWxzZSwgaW5kaWNhdGVzIGFuIGVycm9yIG9jY3VycmVkLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRFeHRlcm5hbElwKHJlc3BvbnNlKSB7XG4gICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhIHx8ICFyZXNwb25zZS5kYXRhLmlwKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3VycmVudEV4dElwQWRkciA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRpcGFkZHInKTtcbiAgICAgICAgY29uc3QgcG9ydE1hdGNoID0gY3VycmVudEV4dElwQWRkci5tYXRjaCgvOihcXGQrKSQvKTtcbiAgICAgICAgY29uc3QgcG9ydCA9IHBvcnRNYXRjaCA/ICc6JyArIHBvcnRNYXRjaFsxXSA6ICcnO1xuICAgICAgICBjb25zdCBuZXdFeHRJcEFkZHIgPSByZXNwb25zZS5kYXRhLmlwICsgcG9ydDtcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIG5ld0V4dElwQWRkcik7XG4gICAgICAgIC8vIENsZWFyIGV4dGVybmFsIGhvc3RuYW1lIHdoZW4gZ2V0dGluZyBleHRlcm5hbCBJUFxuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCAnJyk7XG4gICAgICAgIG5ldHdvcmtzLiRleHRpcGFkZHIudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBOQVQgaGVscCB0ZXh0IHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzIGZyb20gUkVTVCBBUElcbiAgICAgKiBVcGRhdGVzIGJvdGggc3RhbmRhcmQgTkFUIHNlY3Rpb24gYW5kIER1YWwtU3RhY2sgc2VjdGlvblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVOQVRIZWxwVGV4dChwb3J0cykge1xuICAgICAgICAvLyBXSFk6IFBvcnQga2V5cyBtYXRjaCBQYnhTZXR0aW5ncyBjb25zdGFudHMgKFNJUFBvcnQsIFRMU19QT1JULCBSVFBQb3J0RnJvbSwgUlRQUG9ydFRvKVxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQUG9ydCB8fCAhcG9ydHMuVExTX1BPUlQgfHwgIXBvcnRzLlJUUFBvcnRGcm9tIHx8ICFwb3J0cy5SVFBQb3J0VG8pIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIFNJUCBwb3J0cyBpbmZvIHRleHRcbiAgICAgICAgY29uc3QgJHNpcFBvcnRWYWx1ZXMgPSAkKCcjbmF0LWhlbHAtc2lwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJHNpcFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2lwVGV4dCA9IGkxOG4oJ253X05BVEluZm8zJywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUFBvcnQsXG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNpcFBvcnRWYWx1ZXMuaHRtbChzaXBUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIFJUUCBwb3J0cyBpbmZvIHRleHRcbiAgICAgICAgY29uc3QgJHJ0cFBvcnRWYWx1ZXMgPSAkKCcjbmF0LWhlbHAtcnRwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJHJ0cFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgcnRwVGV4dCA9IGkxOG4oJ253X05BVEluZm80Jywge1xuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9GUk9NJzogcG9ydHMuUlRQUG9ydEZyb20sXG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX1RPJzogcG9ydHMuUlRQUG9ydFRvXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRydHBQb3J0VmFsdWVzLmh0bWwocnRwVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gU0lQIHBvcnRzIGluZm8gdGV4dFxuICAgICAgICBjb25zdCAkZHVhbFN0YWNrU2lwUG9ydFZhbHVlcyA9ICQoJyNkdWFsLXN0YWNrLXNpcC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tTaXBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGR1YWxTdGFja1NpcFRleHQgPSBpMThuKCdud19OQVRJbmZvMycsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0LFxuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTaXBQb3J0VmFsdWVzLmh0bWwoZHVhbFN0YWNrU2lwVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gUlRQIHBvcnRzIGluZm8gdGV4dFxuICAgICAgICBjb25zdCAkZHVhbFN0YWNrUnRwUG9ydFZhbHVlcyA9ICQoJyNkdWFsLXN0YWNrLXJ0cC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tSdHBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGR1YWxTdGFja1J0cFRleHQgPSBpMThuKCdud19OQVRJbmZvNCcsIHtcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6IHBvcnRzLlJUUFBvcnRGcm9tLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6IHBvcnRzLlJUUFBvcnRUb1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkZHVhbFN0YWNrUnRwUG9ydFZhbHVlcy5odG1sKGR1YWxTdGFja1J0cFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwb3J0IGZpZWxkIGxhYmVscyB3aXRoIGFjdHVhbCBpbnRlcm5hbCBwb3J0IHZhbHVlcyBmcm9tIFJFU1QgQVBJXG4gICAgICogVXBkYXRlcyBib3RoIHN0YW5kYXJkIE5BVCBzZWN0aW9uIGFuZCBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcG9ydHMgLSBQb3J0IGNvbmZpZ3VyYXRpb24gb2JqZWN0IGZyb20gQVBJXG4gICAgICovXG4gICAgdXBkYXRlUG9ydExhYmVscyhwb3J0cykge1xuICAgICAgICAvLyBXSFk6IFBvcnQga2V5cyBtYXRjaCBQYnhTZXR0aW5ncyBjb25zdGFudHMgKFNJUFBvcnQsIFRMU19QT1JUKVxuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQUG9ydCB8fCAhcG9ydHMuVExTX1BPUlQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIGV4dGVybmFsIFNJUCBwb3J0IGxhYmVsXG4gICAgICAgIGNvbnN0ICRzaXBMYWJlbCA9ICQoJyNleHRlcm5hbC1zaXAtcG9ydC1sYWJlbCcpO1xuICAgICAgICBpZiAoJHNpcExhYmVsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcExhYmVsVGV4dCA9IGkxOG4oJ253X1B1YmxpY1NJUFBvcnQnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQUG9ydFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwTGFiZWwudGV4dChzaXBMYWJlbFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIHN0YW5kYXJkIE5BVCBzZWN0aW9uIC0gZXh0ZXJuYWwgVExTIHBvcnQgbGFiZWxcbiAgICAgICAgY29uc3QgJHRsc0xhYmVsID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkdGxzTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGxzTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljVExTUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkdGxzTGFiZWwudGV4dCh0bHNMYWJlbFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIER1YWwtU3RhY2sgc2VjdGlvbiAtIFNJUCBwb3J0IGxhYmVsXG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tTaXBMYWJlbCA9ICQoJyNkdWFsLXN0YWNrLXNpcC1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkZHVhbFN0YWNrU2lwTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZHVhbFN0YWNrU2lwTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljU0lQUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTaXBMYWJlbC50ZXh0KGR1YWxTdGFja1NpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgRHVhbC1TdGFjayBzZWN0aW9uIC0gVExTIHBvcnQgbGFiZWxcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1Rsc0xhYmVsID0gJCgnI2R1YWwtc3RhY2stdGxzLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRkdWFsU3RhY2tUbHNMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkdWFsU3RhY2tUbHNMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNUTFNQb3J0Jywge1xuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tUbHNMYWJlbC50ZXh0KGR1YWxTdGFja1Rsc0xhYmVsVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB2aXNpYmlsaXR5IG9mIElQIGFkZHJlc3MgZmllbGRzIGJhc2VkIG9uIElQdjQgbW9kZSBkcm9wZG93biBzdGF0ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBldGggPSAkKG9iaikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGNvbnN0ICRpcHY0TW9kZURyb3Bkb3duID0gJChgI2lwdjRfbW9kZV8ke2V0aH0tZHJvcGRvd25gKTtcblxuICAgICAgICAgICAgLy8gSW4gRG9ja2VyIG1vZGUsIHRoZSBJUHY0IG1vZGUgZHJvcGRvd24gaXMgbm90IHJlbmRlcmVkLlxuICAgICAgICAgICAgLy8gRGVmYXVsdCB0byBESENQIGVuYWJsZWQgc28gSVAgdmFsaWRhdGlvbiBpcyBza2lwcGVkIChEb2NrZXIgbWFuYWdlcyBuZXR3b3JraW5nKS5cbiAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlID0gJGlwdjRNb2RlRHJvcGRvd24ubGVuZ3RoID4gMCA/ICRpcHY0TW9kZURyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKSA6ICcxJztcbiAgICAgICAgICAgIGNvbnN0IGlzRGhjcEVuYWJsZWQgPSBpcHY0TW9kZSA9PT0gJzEnO1xuXG4gICAgICAgICAgICAvLyBGaW5kIElQIGFkZHJlc3MgYW5kIHN1Ym5ldCBmaWVsZHMgZ3JvdXBcbiAgICAgICAgICAgIGNvbnN0ICRpcEFkZHJlc3NHcm91cCA9ICQoYCNpcC1hZGRyZXNzLWdyb3VwLSR7ZXRofWApO1xuICAgICAgICAgICAgY29uc3QgJGdhdGV3YXlGaWVsZCA9ICQoYC5pcHY0LWdhdGV3YXktZmllbGQtJHtldGh9YCk7XG4gICAgICAgICAgICBjb25zdCAkZGhjcEluZm9NZXNzYWdlID0gJChgLmRoY3AtaW5mby1tZXNzYWdlLSR7ZXRofWApO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGlzIHRoZSBpbnRlcm5ldCBpbnRlcmZhY2VcbiAgICAgICAgICAgIGNvbnN0IGlzSW50ZXJuZXRJbnRlcmZhY2UgPSAkKGBpbnB1dFtuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCJdOmNoZWNrZWRgKS52YWwoKSA9PT0gZXRoO1xuXG4gICAgICAgICAgICAvLyBJbiBEb2NrZXIgbW9kZSwgdGhlIGRlZGljYXRlZCBEb2NrZXIgaW5mbyBtZXNzYWdlIGlzIHNob3duIGluc3RlYWQgb2YgREhDUCBpbmZvXG4gICAgICAgICAgICBjb25zdCBpc0RvY2tlckludGVyZmFjZSA9ICRpcHY0TW9kZURyb3Bkb3duLmxlbmd0aCA9PT0gMDtcblxuICAgICAgICAgICAgaWYgKGlzRGhjcEVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGVuYWJsZWQgLT4gaGlkZSBJUC9zdWJuZXQgZmllbGRzIGdyb3VwIGFuZCBnYXRld2F5IGZpZWxkLCBzaG93IERIQ1AgaW5mb1xuICAgICAgICAgICAgICAgICRpcEFkZHJlc3NHcm91cC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJGdhdGV3YXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgaWYgKCFpc0RvY2tlckludGVyZmFjZSkge1xuICAgICAgICAgICAgICAgICAgICAkZGhjcEluZm9NZXNzYWdlLnNob3coKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZGlzYWJsZWQgLT4gc2hvdyBJUC9zdWJuZXQgZmllbGRzIGdyb3VwLCBoaWRlIERIQ1AgaW5mb1xuICAgICAgICAgICAgICAgICRpcEFkZHJlc3NHcm91cC5zaG93KCk7XG4gICAgICAgICAgICAgICAgJGRoY3BJbmZvTWVzc2FnZS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnMScpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyBnYXRld2F5IGZpZWxkIE9OTFkgaWYgdGhpcyBpcyB0aGUgaW50ZXJuZXQgaW50ZXJmYWNlXG4gICAgICAgICAgICAgICAgaWYgKGlzSW50ZXJuZXRJbnRlcmZhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgJGdhdGV3YXlGaWVsZC5zaG93KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGdhdGV3YXlGaWVsZC5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXR3b3Jrcy5hZGROZXdGb3JtUnVsZXMoZXRoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGlkZS9zaG93IE5BVCBzZWN0aW9ucyBpbnN0ZWFkIG9mIGRpc2FibGluZyB0byBzaW1wbGlmeSBVSVxuICAgICAgICBpZiAoJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICQoJy5uYXRlZC1zZXR0aW5ncy1ncm91cCcpLnNob3coKTtcbiAgICAgICAgICAgIC8vIEFmdGVyIHNob3dpbmcgYWxsIHNlY3Rpb25zLCBkZXRlcm1pbmUgd2hpY2ggb25lIHRvIGFjdHVhbGx5IGRpc3BsYXlcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZUR1YWxTdGFja05hdExvZ2ljKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHZpc2liaWxpdHkgb2YgSVB2NiBtYW51YWwgY29uZmlndXJhdGlvbiBmaWVsZHMgYmFzZWQgb24gc2VsZWN0ZWQgbW9kZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnRlcmZhY2VJZCAtIEludGVyZmFjZSBJRFxuICAgICAqL1xuICAgIHRvZ2dsZUlQdjZGaWVsZHMoaW50ZXJmYWNlSWQpIHtcbiAgICAgICAgY29uc3QgJGlwdjZNb2RlRHJvcGRvd24gPSAkKGAjaXB2Nl9tb2RlXyR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgIGNvbnN0IGlwdjZNb2RlID0gJGlwdjZNb2RlRHJvcGRvd24udmFsKCk7XG4gICAgICAgIGNvbnN0ICRtYW51YWxGaWVsZHNDb250YWluZXIgPSAkKGAuaXB2Ni1tYW51YWwtZmllbGRzLSR7aW50ZXJmYWNlSWR9YCk7XG4gICAgICAgIGNvbnN0ICRhdXRvSW5mb01lc3NhZ2UgPSAkKGAuaXB2Ni1hdXRvLWluZm8tbWVzc2FnZS0ke2ludGVyZmFjZUlkfWApO1xuICAgICAgICBjb25zdCAkaXB2NkludGVybmV0U2V0dGluZ3MgPSAkKGAuaXB2Ni1pbnRlcm5ldC1zZXR0aW5ncy0ke2ludGVyZmFjZUlkfWApO1xuXG4gICAgICAgIC8vIFNob3cgbWFudWFsIGZpZWxkcyBvbmx5IHdoZW4gbW9kZSBpcyAnMicgKE1hbnVhbClcbiAgICAgICAgaWYgKGlwdjZNb2RlID09PSAnMicpIHtcbiAgICAgICAgICAgICRtYW51YWxGaWVsZHNDb250YWluZXIuc2hvdygpO1xuICAgICAgICAgICAgJGF1dG9JbmZvTWVzc2FnZS5oaWRlKCk7XG4gICAgICAgICAgICAkaXB2NkludGVybmV0U2V0dGluZ3Muc2hvdygpO1xuICAgICAgICB9IGVsc2UgaWYgKGlwdjZNb2RlID09PSAnMScpIHtcbiAgICAgICAgICAgIC8vIFNob3cgQXV0byAoU0xBQUMvREhDUHY2KSBpbmZvIG1lc3NhZ2Ugd2hlbiBtb2RlIGlzICcxJyAoQXV0bylcbiAgICAgICAgICAgICRtYW51YWxGaWVsZHNDb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgJGF1dG9JbmZvTWVzc2FnZS5zaG93KCk7XG4gICAgICAgICAgICAkaXB2NkludGVybmV0U2V0dGluZ3Muc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSBhbGwgSVB2NiBmaWVsZHMgZm9yIG1vZGUgJzAnIChPZmYpXG4gICAgICAgICAgICAkbWFudWFsRmllbGRzQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgICRhdXRvSW5mb01lc3NhZ2UuaGlkZSgpO1xuICAgICAgICAgICAgJGlwdjZJbnRlcm5ldFNldHRpbmdzLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpYyB3aGVuIElQdjYgbW9kZSBjaGFuZ2VzXG4gICAgICAgIG5ldHdvcmtzLnVwZGF0ZUR1YWxTdGFja05hdExvZ2ljKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGR1YWwtc3RhY2sgbW9kZSBpcyBhY3RpdmUgKElQdjQgKyBJUHY2IHB1YmxpYyBhZGRyZXNzIGJvdGggY29uZmlndXJlZClcbiAgICAgKiBEdWFsLXN0YWNrIE5BVCBzZWN0aW9uIGlzIHNob3duIHdoZW4gYm90aCBJUHY0IGFuZCBwdWJsaWMgSVB2NiBhcmUgcHJlc2VudC5cbiAgICAgKiBQdWJsaWMgSVB2NiA9IEdsb2JhbCBVbmljYXN0IGFkZHJlc3NlcyAoMjAwMDo6LzMpIHRoYXQgc3RhcnQgd2l0aCAyIG9yIDMuXG4gICAgICogUHJpdmF0ZSBJUHY2IGFkZHJlc3NlcyAoVUxBIGZkMDA6Oi84LCBsaW5rLWxvY2FsIGZlODA6Oi8xMCkgZG8gTk9UIHRyaWdnZXIgZHVhbC1zdGFjay5cbiAgICAgKlxuICAgICAqIElQdjQgZGV0ZWN0aW9uIHdvcmtzIGZvciBib3RoIHN0YXRpYyBhbmQgREhDUCBjb25maWd1cmF0aW9uczpcbiAgICAgKiAtIFN0YXRpYzogY2hlY2tzIGlwYWRkcl9YIGZpZWxkXG4gICAgICogLSBESENQOiBjaGVja3MgaWYgREhDUCBpcyBlbmFibGVkIEFORCBnYXRld2F5IGlzIG9idGFpbmVkXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW50ZXJmYWNlSWQgLSBJbnRlcmZhY2UgSURcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBkdWFsLXN0YWNrIHdpdGggcHVibGljIElQdjYsIGZhbHNlIG90aGVyd2lzZVxuICAgICAqL1xuICAgIGlzRHVhbFN0YWNrTW9kZShpbnRlcmZhY2VJZCkge1xuICAgICAgICAvLyBHZXQgSVB2NCBjb25maWd1cmF0aW9uIChzdGF0aWMgb3IgREhDUClcbiAgICAgICAgY29uc3QgaXB2NGFkZHIgPSAkKGBpbnB1dFtuYW1lPVwiaXBhZGRyXyR7aW50ZXJmYWNlSWR9XCJdYCkudmFsKCk7XG4gICAgICAgIGNvbnN0ICRkaGNwQ2hlY2tib3ggPSAkKGAjZGhjcC0ke2ludGVyZmFjZUlkfS1jaGVja2JveGApO1xuICAgICAgICBjb25zdCBkaGNwRW5hYmxlZCA9ICRkaGNwQ2hlY2tib3gubGVuZ3RoID4gMCAmJiAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIGNvbnN0IGdhdGV3YXkgPSAkKGBpbnB1dFtuYW1lPVwiZ2F0ZXdheV8ke2ludGVyZmFjZUlkfVwiXWApLnZhbCgpO1xuXG4gICAgICAgIC8vIEdldCBJUHY2IGNvbmZpZ3VyYXRpb25cbiAgICAgICAgY29uc3QgaXB2Nk1vZGUgPSAkKGAjaXB2Nl9tb2RlXyR7aW50ZXJmYWNlSWR9YCkudmFsKCk7XG4gICAgICAgIC8vIEZvciBNYW51YWwgbW9kZSB1c2UgZm9ybSBmaWVsZCwgZm9yIEF1dG8gbW9kZSB1c2UgY3VycmVudCAoYXV0b2NvbmZpZ3VyZWQpIHZhbHVlIGZyb20gaGlkZGVuIGZpZWxkXG4gICAgICAgIGNvbnN0IGlwdjZhZGRyTWFudWFsID0gJChgaW5wdXRbbmFtZT1cImlwdjZhZGRyXyR7aW50ZXJmYWNlSWR9XCJdYCkudmFsKCk7XG4gICAgICAgIGNvbnN0IGlwdjZhZGRyQXV0byA9ICQoYCNjdXJyZW50LWlwdjZhZGRyLSR7aW50ZXJmYWNlSWR9YCkudmFsKCk7XG4gICAgICAgIGNvbnN0IGlwdjZhZGRyID0gaXB2Nk1vZGUgPT09ICcxJyA/IGlwdjZhZGRyQXV0byA6IGlwdjZhZGRyTWFudWFsO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIElQdjQgaXMgcHJlc2VudCAoZWl0aGVyIHN0YXRpYyBhZGRyZXNzIG9yIERIQ1Agd2l0aCBnYXRld2F5KVxuICAgICAgICAvLyBHYXRld2F5IHByZXNlbmNlIGluZGljYXRlcyBESENQIHN1Y2Nlc3NmdWxseSBvYnRhaW5lZCBhbiBJUHY0IGFkZHJlc3NcbiAgICAgICAgY29uc3QgaGFzSXB2NCA9IChpcHY0YWRkciAmJiBpcHY0YWRkci50cmltKCkgIT09ICcnKSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgKGRoY3BFbmFibGVkICYmIGdhdGV3YXkgJiYgZ2F0ZXdheS50cmltKCkgIT09ICcnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBJUHY2IGlzIGVuYWJsZWQgKEF1dG8gU0xBQUMvREhDUHY2IG9yIE1hbnVhbClcbiAgICAgICAgLy8gRm9yIEF1dG8gbW9kZSAoJzEnKSwgd2UgY2hlY2sgY3VycmVudElwdjZhZGRyIHdoaWNoIHNob3dzIGF1dG9jb25maWd1cmVkIGFkZHJlc3NcbiAgICAgICAgY29uc3QgaGFzSXB2NiA9IChpcHY2TW9kZSA9PT0gJzEnIHx8IGlwdjZNb2RlID09PSAnMicpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBpcHY2YWRkciAmJiBpcHY2YWRkci50cmltKCkgIT09ICcnICYmIGlwdjZhZGRyICE9PSAnQXV0b2NvbmZpZ3VyZWQnO1xuXG4gICAgICAgIGlmICghaGFzSXB2NCB8fCAhaGFzSXB2Nikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgSVB2NiBhZGRyZXNzIGlzIGdsb2JhbCB1bmljYXN0IChwdWJsaWMpXG4gICAgICAgIC8vIEdsb2JhbCB1bmljYXN0OiAyMDAwOjovMyAoYWRkcmVzc2VzIHN0YXJ0aW5nIHdpdGggMiBvciAzKVxuICAgICAgICAvLyBFeGNsdWRlIFVMQSAoZmQwMDo6LzgpIGFuZCBsaW5rLWxvY2FsIChmZTgwOjovMTApXG4gICAgICAgIGNvbnN0IGlwdjZMb3dlciA9IGlwdjZhZGRyLnRvTG93ZXJDYXNlKCkudHJpbSgpO1xuXG4gICAgICAgIC8vIFJlbW92ZSBDSURSIG5vdGF0aW9uIGlmIHByZXNlbnQgKGUuZy4sIFwiMjAwMTpkYjg6OjEvNjRcIiAtPiBcIjIwMDE6ZGI4OjoxXCIpXG4gICAgICAgIGNvbnN0IGlwdjZXaXRob3V0Q2lkciA9IGlwdjZMb3dlci5zcGxpdCgnLycpWzBdO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGZpcnN0IGNoYXJhY3RlciBpcyAyIG9yIDMgKGdsb2JhbCB1bmljYXN0IHJhbmdlKVxuICAgICAgICBjb25zdCBpc0dsb2JhbFVuaWNhc3QgPSAvXlsyM10vLnRlc3QoaXB2NldpdGhvdXRDaWRyKTtcblxuICAgICAgICByZXR1cm4gaXNHbG9iYWxVbmljYXN0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgTkFUIHNlY3Rpb24gVUkgYmFzZWQgb24gZHVhbC1zdGFjayBkZXRlY3Rpb25cbiAgICAgKiBTd2l0Y2hlcyBiZXR3ZWVuIHN0YW5kYXJkIE5BVCBzZWN0aW9uIGFuZCBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgKiBNYWtlcyBleHRob3N0bmFtZSByZXF1aXJlZCBpbiBkdWFsLXN0YWNrIG1vZGVcbiAgICAgKi9cbiAgICB1cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgTkFUIGlzIGVuYWJsZWQgLSBpZiBub3QsIGRvbid0IHNob3cgYW55IE5BVCBzZWN0aW9uc1xuICAgICAgICBjb25zdCBpc05hdEVuYWJsZWQgPSAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgaWYgKCFpc05hdEVuYWJsZWQpIHtcbiAgICAgICAgICAgIHJldHVybjsgLy8gTkFUIGRpc2FibGVkLCBzZWN0aW9ucyBhbHJlYWR5IGhpZGRlbiBieSB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3NcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIGFueSBpbnRlcmZhY2UgaXMgaW4gZHVhbC1zdGFjayBtb2RlXG4gICAgICAgIGxldCBhbnlEdWFsU3RhY2sgPSBmYWxzZTtcblxuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIHRhYikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkKHRhYikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGlmIChuZXR3b3Jrcy5pc0R1YWxTdGFja01vZGUoaW50ZXJmYWNlSWQpKSB7XG4gICAgICAgICAgICAgICAgYW55RHVhbFN0YWNrID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7IC8vIEJyZWFrIGxvb3BcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgJHN0YW5kYXJkTmF0U2VjdGlvbiA9ICQoJyNzdGFuZGFyZC1uYXQtc2VjdGlvbicpO1xuICAgICAgICBjb25zdCAkZHVhbFN0YWNrU2VjdGlvbiA9ICQoJyNkdWFsLXN0YWNrLXNlY3Rpb24nKTtcblxuICAgICAgICAvLyBHZXQgdGhlIGV4dGhvc3RuYW1lIGlucHV0IGVsZW1lbnQgYW5kIGl0cyBvcmlnaW5hbCBwYXJlbnRcbiAgICAgICAgY29uc3QgJGV4dGhvc3RuYW1lSW5wdXQgPSAkKCcjZXh0aG9zdG5hbWUnKTtcbiAgICAgICAgY29uc3QgJHN0YW5kYXJkSG9zdG5hbWVXcmFwcGVyID0gJHN0YW5kYXJkTmF0U2VjdGlvbi5maW5kKCcubWF4LXdpZHRoLTUwMCcpLmhhcygnI2V4dGhvc3RuYW1lJykuZmlyc3QoKTtcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja0hvc3RuYW1lV3JhcHBlciA9ICQoJyNleHRob3N0bmFtZS1kdWFsLXN0YWNrLWlucHV0LXdyYXBwZXInKTtcblxuICAgICAgICAvLyBHZXQgdGhlIHBvcnQgaW5wdXQgZWxlbWVudHMgYW5kIHRoZWlyIHdyYXBwZXJzXG4gICAgICAgIGNvbnN0ICRleHRlcm5hbFNpcFBvcnRJbnB1dCA9ICQoJ2lucHV0W25hbWU9XCJleHRlcm5hbFNJUFBvcnRcIl0nKTtcbiAgICAgICAgY29uc3QgJGV4dGVybmFsVGxzUG9ydElucHV0ID0gJCgnaW5wdXRbbmFtZT1cImV4dGVybmFsVExTUG9ydFwiXScpO1xuICAgICAgICBjb25zdCAkc3RhbmRhcmRTaXBQb3J0V3JhcHBlciA9ICQoJyNleHRlcm5hbC1zaXAtcG9ydC1zdGFuZGFyZC13cmFwcGVyJyk7XG4gICAgICAgIGNvbnN0ICRzdGFuZGFyZFRsc1BvcnRXcmFwcGVyID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LXN0YW5kYXJkLXdyYXBwZXInKTtcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1NpcFBvcnRXcmFwcGVyID0gJCgnI2V4dGVybmFsLXNpcC1wb3J0LWR1YWwtc3RhY2std3JhcHBlcicpO1xuICAgICAgICBjb25zdCAkZHVhbFN0YWNrVGxzUG9ydFdyYXBwZXIgPSAkKCcjZXh0ZXJuYWwtdGxzLXBvcnQtZHVhbC1zdGFjay13cmFwcGVyJyk7XG5cbiAgICAgICAgaWYgKGFueUR1YWxTdGFjaykge1xuICAgICAgICAgICAgLy8gRHVhbC1zdGFjayBkZXRlY3RlZDogSGlkZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiwgc2hvdyBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgICAgICAgICRzdGFuZGFyZE5hdFNlY3Rpb24uaGlkZSgpO1xuICAgICAgICAgICAgJGR1YWxTdGFja1NlY3Rpb24uc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBNb3ZlIGV4dGhvc3RuYW1lIGlucHV0IHRvIGR1YWwtc3RhY2sgc2VjdGlvbiAoYXZvaWQgZHVwbGljYXRlIGlucHV0cylcbiAgICAgICAgICAgIGlmICgkZXh0aG9zdG5hbWVJbnB1dC5sZW5ndGggPiAwICYmICRkdWFsU3RhY2tIb3N0bmFtZVdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRob3N0bmFtZUlucHV0LmFwcGVuZFRvKCRkdWFsU3RhY2tIb3N0bmFtZVdyYXBwZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb3ZlIHBvcnQgaW5wdXRzIHRvIGR1YWwtc3RhY2sgc2VjdGlvbiAoYXZvaWQgZHVwbGljYXRlIGlucHV0cylcbiAgICAgICAgICAgIGlmICgkZXh0ZXJuYWxTaXBQb3J0SW5wdXQubGVuZ3RoID4gMCAmJiAkZHVhbFN0YWNrU2lwUG9ydFdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRlcm5hbFNpcFBvcnRJbnB1dC5hcHBlbmRUbygkZHVhbFN0YWNrU2lwUG9ydFdyYXBwZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCRleHRlcm5hbFRsc1BvcnRJbnB1dC5sZW5ndGggPiAwICYmICRkdWFsU3RhY2tUbHNQb3J0V3JhcHBlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGV4dGVybmFsVGxzUG9ydElucHV0LmFwcGVuZFRvKCRkdWFsU3RhY2tUbHNQb3J0V3JhcHBlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIENsZWFyIGV4dGlwYWRkciAoZXh0ZXJuYWwgSVAgbm90IG5lZWRlZCBpbiBkdWFsLXN0YWNrLCBvbmx5IGhvc3RuYW1lKVxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsICcnKTtcblxuICAgICAgICAgICAgLy8gRGlzYWJsZSBhdXRvVXBkYXRlRXh0ZXJuYWxJcCAobm90IG5lZWRlZCBpbiBkdWFsLXN0YWNrKVxuICAgICAgICAgICAgY29uc3QgJGF1dG9VcGRhdGVDaGVja2JveCA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgICAgICBpZiAoJGF1dG9VcGRhdGVDaGVja2JveC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgaG9zdG5hbWUgZGlzcGxheSBpbiBkdWFsLXN0YWNrIGluZm8gbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgaG9zdG5hbWUgPSAkZXh0aG9zdG5hbWVJbnB1dC52YWwoKSB8fCAnbWlrb3BieC5jb21wYW55LmNvbSc7XG4gICAgICAgICAgICAkKCcjaG9zdG5hbWUtZGlzcGxheScpLnRleHQoaG9zdG5hbWUpO1xuXG4gICAgICAgICAgICAvLyBNYWtlIGV4dGhvc3RuYW1lIHJlcXVpcmVkIGluIGR1YWwtc3RhY2tcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXMuZXh0aG9zdG5hbWUucnVsZXMgPSBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dGVybmFsSG9zdG5hbWVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3ZhbGlkSG9zdG5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUhvc3RuYW1lSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE5vIGR1YWwtc3RhY2s6IFNob3cgc3RhbmRhcmQgTkFUIHNlY3Rpb24sIGhpZGUgRHVhbC1TdGFjayBzZWN0aW9uXG4gICAgICAgICAgICAkc3RhbmRhcmROYXRTZWN0aW9uLnNob3coKTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTZWN0aW9uLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gTW92ZSBleHRob3N0bmFtZSBpbnB1dCBiYWNrIHRvIHN0YW5kYXJkIHNlY3Rpb25cbiAgICAgICAgICAgIGlmICgkZXh0aG9zdG5hbWVJbnB1dC5sZW5ndGggPiAwICYmICRzdGFuZGFyZEhvc3RuYW1lV3JhcHBlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGV4dGhvc3RuYW1lSW5wdXQuYXBwZW5kVG8oJHN0YW5kYXJkSG9zdG5hbWVXcmFwcGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTW92ZSBwb3J0IGlucHV0cyBiYWNrIHRvIHN0YW5kYXJkIHNlY3Rpb25cbiAgICAgICAgICAgIGlmICgkZXh0ZXJuYWxTaXBQb3J0SW5wdXQubGVuZ3RoID4gMCAmJiAkc3RhbmRhcmRTaXBQb3J0V3JhcHBlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGV4dGVybmFsU2lwUG9ydElucHV0LmFwcGVuZFRvKCRzdGFuZGFyZFNpcFBvcnRXcmFwcGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkZXh0ZXJuYWxUbHNQb3J0SW5wdXQubGVuZ3RoID4gMCAmJiAkc3RhbmRhcmRUbHNQb3J0V3JhcHBlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGV4dGVybmFsVGxzUG9ydElucHV0LmFwcGVuZFRvKCRzdGFuZGFyZFRsc1BvcnRXcmFwcGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVzdG9yZSBvcmlnaW5hbCBleHRob3N0bmFtZSB2YWxpZGF0aW9uIChvcHRpb25hbCB3aXRoIHVzZW5hdCBkZXBlbmRlbmN5KVxuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlcy5leHRob3N0bmFtZS5kZXBlbmRzID0gJ3VzZW5hdCc7XG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzLmV4dGhvc3RuYW1lLnJ1bGVzID0gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4dGVuYWxJcEhvc3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndmFsaWRIb3N0bmFtZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSG9zdG5hbWVJbnZhbGlkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvblxuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdkZXN0cm95JykuZm9ybSh7XG4gICAgICAgICAgICBvbjogJ2JsdXInLFxuICAgICAgICAgICAgZmllbGRzOiBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIG5ldyBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIGEgc3BlY2lmaWMgcm93IGluIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gZm9ybS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Um93SWQgLSBUaGUgSUQgb2YgdGhlIG5ldyByb3cgdG8gYWRkIHRoZSBmb3JtIHJ1bGVzIGZvci5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ25hbWUnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IG5hbWVDbGFzcyA9IGBuYW1lXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICduYW1lJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW25hbWVDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBuYW1lQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgdmxhbkNsYXNzID0gYHZsYW5pZF8ke25ld1Jvd0lkfWA7XG5cblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbdmxhbkNsYXNzXSA9IHtcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogdmxhbkNsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjQwOTVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBjaGVja1ZsYW5bJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuQ3Jvc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2lwYWRkcicgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgaXBhZGRyQ2xhc3MgPSBgaXBhZGRyXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkXG4gICAgICAgIC8vIEZvciB0ZW1wbGF0ZSBpbnRlcmZhY2UgKGlkPTApLCBhZGQgZGVwZW5kZW5jeSBvbiBpbnRlcmZhY2Ugc2VsZWN0aW9uXG4gICAgICAgIGlmIChuZXdSb3dJZCA9PT0gMCB8fCBuZXdSb3dJZCA9PT0gJzAnKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2lwYWRkckNsYXNzXSA9IHtcbiAgICAgICAgICAgICAgICBpZGVudGlmaWVyOiBpcGFkZHJDbGFzcyxcbiAgICAgICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCwgIC8vIFRlbXBsYXRlOiB2YWxpZGF0ZSBvbmx5IGlmIGludGVyZmFjZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJJc0VtcHR5LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICAgICAgZGVwZW5kczogYG5vdGRoY3BfJHtuZXdSb3dJZH1gLCAgLy8gUmVhbCBpbnRlcmZhY2U6IHZhbGlkYXRlIG9ubHkgaWYgREhDUCBpcyBPRkZcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERIQ1AgdmFsaWRhdGlvbiByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzXG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgb2JqZWN0IHdpdGggYWxsIHNldHRpbmdzIHByb3BlcnRpZXNcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHt9O1xuXG4gICAgICAgIC8vIENvbGxlY3Qgc3RhdGljIHJvdXRlc1xuICAgICAgICByZXN1bHQuZGF0YS5zdGF0aWNSb3V0ZXMgPSBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmNvbGxlY3RSb3V0ZXMoKTtcblxuICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGZvcm0gdmFsdWVzIHRvIGF2b2lkIGFueSBET00tcmVsYXRlZCBpc3N1ZXNcbiAgICAgICAgLy8gQ29sbGVjdCBhbGwgcmVndWxhciBpbnB1dCBmaWVsZHMgKHNraXAgcmVhZG9ubHkgZmllbGRzIHRvIHByZXZlbnQgb3ZlcndyaXRpbmcgREhDUC1wcm92aWRlZCB2YWx1ZXMpXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W3R5cGU9XCJ0ZXh0XCJdLCBpbnB1dFt0eXBlPVwiaGlkZGVuXCJdLCBpbnB1dFt0eXBlPVwibnVtYmVyXCJdLCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRpbnB1dC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICAvLyBTa2lwIHJlYWRvbmx5IGZpZWxkcyAtIHRoZXkgY29udGFpbiBjdXJyZW50IERIQ1AvQXV0byB2YWx1ZXMgYW5kIHNob3VsZCBub3QgYmUgc2F2ZWRcbiAgICAgICAgICAgIGlmIChuYW1lICYmICEkaW5wdXQucHJvcCgncmVhZG9ubHknKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJGlucHV0LnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBvbmx5IGdldCBzdHJpbmcgdmFsdWVzXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbbmFtZV0gPSAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkgPyBTdHJpbmcodmFsdWUpIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3Qgc2VsZWN0IGRyb3Bkb3duc1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdzZWxlY3QnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHNlbGVjdCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gJHNlbGVjdC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJHNlbGVjdC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBnZXQgc3RyaW5nIHZhbHVlc1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW25hbWVdID0gKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuXG4gICAgICAgIC8vIFBieEFwaUNsaWVudCB3aWxsIGhhbmRsZSBjb252ZXJzaW9uIHRvIHN0cmluZ3MgZm9yIGpRdWVyeVxuICAgICAgICByZXN1bHQuZGF0YS51c2VuYXQgPSAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAvLyBVc2UgY29ycmVjdCBmaWVsZCBuYW1lIGZyb20gdGhlIGZvcm0gKGF1dG9VcGRhdGVFeHRlcm5hbElwLCBub3QgQVVUT19VUERBVEVfRVhURVJOQUxfSVApXG4gICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlRGl2ID0gbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImF1dG9VcGRhdGVFeHRlcm5hbElwXCJdJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgaWYgKCRhdXRvVXBkYXRlRGl2Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmF1dG9VcGRhdGVFeHRlcm5hbElwID0gJGF1dG9VcGRhdGVEaXYuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmF1dG9VcGRhdGVFeHRlcm5hbElwID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb252ZXJ0IElQdjQgbW9kZSBkcm9wZG93biB2YWx1ZXMgdG8gREhDUCBib29sZWFuIGZvciBSRVNUIEFQSSBjb21wYXRpYmlsaXR5XG4gICAgICAgIC8vIFdIWTogVUkgdXNlcyBkcm9wZG93biB3aXRoIHZhbHVlcyAwPU1hbnVhbCwgMT1ESENQIGJ1dCBSRVNUIEFQSSBleHBlY3RzIGRoY3BfJHtpZH0gYm9vbGVhblxuICAgICAgICBPYmplY3Qua2V5cyhyZXN1bHQuZGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaXB2NE1vZGVNYXRjaCA9IGtleS5tYXRjaCgvXmlwdjRfbW9kZV8oXFxkKykkLyk7XG4gICAgICAgICAgICBpZiAoaXB2NE1vZGVNYXRjaCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gaXB2NE1vZGVNYXRjaFsxXTtcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gcmVzdWx0LmRhdGFba2V5XTtcblxuICAgICAgICAgICAgICAgIC8vIENvbnZlcnQgZHJvcGRvd24gdmFsdWUgdG8gYm9vbGVhbjogJzEnID0gREhDUCBlbmFibGVkLCAnMCcgPSBNYW51YWwgKERIQ1AgZGlzYWJsZWQpXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbYGRoY3BfJHtpbnRlcmZhY2VJZH1gXSA9IG1vZGUgPT09ICcxJztcblxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBpcHY0X21vZGVfJHtpZH0ga2V5IGFzIGl0J3Mgbm90IG5lZWRlZCBieSBSRVNUIEFQSVxuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVtrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IGludGVybmV0IHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmludGVybmV0X2ludGVyZmFjZSA9IFN0cmluZygkY2hlY2tlZFJhZGlvLnZhbCgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdIWTogTm8gcG9ydCBmaWVsZCBtYXBwaW5nIG5lZWRlZCAtIGZvcm0gZmllbGQgbmFtZXMgbWF0Y2ggQVBJIGNvbnN0YW50c1xuICAgICAgICAvLyAoZXh0ZXJuYWxTSVBQb3J0ID0gUGJ4U2V0dGluZ3M6OkVYVEVSTkFMX1NJUF9QT1JUKVxuXG4gICAgICAgIC8vIFNldCBkZWZhdWx0IElQdjYgc3VibmV0IGZvciBBdXRvIG1vZGUgKFNMQUFDL0RIQ1B2NilcbiAgICAgICAgT2JqZWN0LmtleXMocmVzdWx0LmRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlwdjZNb2RlTWF0Y2ggPSBrZXkubWF0Y2goL15pcHY2X21vZGVfKFxcZCspJC8pO1xuICAgICAgICAgICAgaWYgKGlwdjZNb2RlTWF0Y2gpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9IGlwdjZNb2RlTWF0Y2hbMV07XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IHJlc3VsdC5kYXRhW2tleV07XG4gICAgICAgICAgICAgICAgY29uc3Qgc3VibmV0S2V5ID0gYGlwdjZfc3VibmV0XyR7aW50ZXJmYWNlSWR9YDtcblxuICAgICAgICAgICAgICAgIC8vIElmIG1vZGUgaXMgQXV0byAoJzEnKSBhbmQgc3VibmV0IGlzIGVtcHR5LCBzZXQgZGVmYXVsdCB0byAnNjQnXG4gICAgICAgICAgICAgICAgaWYgKG1vZGUgPT09ICcxJyAmJiAoIXJlc3VsdC5kYXRhW3N1Ym5ldEtleV0gfHwgcmVzdWx0LmRhdGFbc3VibmV0S2V5XSA9PT0gJycpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW3N1Ym5ldEtleV0gPSAnNjQnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU3luY2hyb25pemUgZ2xvYmFsIGhvc3RuYW1lIHRvIGFsbCBpbnRlcmZhY2VzXG4gICAgICAgIC8vIFdIWTogU2luZ2xlIGhvc3RuYW1lIGZpZWxkIGZvciBhbGwgaW50ZXJmYWNlcywgYnV0IFJFU1QgQVBJIGV4cGVjdHMgaG9zdG5hbWVfJHtpZH0gZm9yIGVhY2ggaW50ZXJmYWNlXG4gICAgICAgIGNvbnN0IGdsb2JhbEhvc3RuYW1lID0gJCgnI2dsb2JhbC1ob3N0bmFtZScpLnZhbCgpIHx8ICcnO1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIHRhYikgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkKHRhYikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhW2Bob3N0bmFtZV8ke2ludGVyZmFjZUlkfWBdID0gZ2xvYmFsSG9zdG5hbWU7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICAvLyBSZXNwb25zZSBoYW5kbGVkIGJ5IEZvcm1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbmV0d29ya3MuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ldHdvcmtzLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbmV0d29ya3MuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbmxpbmUgPSB0cnVlOyAvLyBTaG93IGlubGluZSBlcnJvcnMgbmV4dCB0byBmaWVsZHNcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBOZXR3b3JrQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZUNvbmZpZyc7XG5cbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL21vZGlmeS9gO1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG5ldHdvcmsgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQ29uZmlndXJhdGlvbigpIHtcbiAgICAgICAgTmV0d29ya0FQSS5nZXRDb25maWcoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGFmdGVyIGxvYWRpbmcgZGF0YVxuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBmb3JtIGVsZW1lbnRzIGNvbm5lY3RlZCB3aXRoIG5vbiBkb2NrZXIgaW5zdGFsbGF0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpcy1kb2NrZXInLCAnMScpO1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBEb2NrZXIgbmV0d29yayBpbmZvIGFzIHJlYWQtb25seVxuICAgICAqIERFUFJFQ0FURUQ6IERvY2tlciBub3cgdXNlcyBzYW1lIGludGVyZmFjZSB0YWJzIGFzIHJlZ3VsYXIgaW5zdGFsbGF0aW9uXG4gICAgICovXG4gICAgc2hvd0RvY2tlck5ldHdvcmtJbmZvKGRhdGEpIHtcbiAgICAgICAgLy8gVGhpcyBmdW5jdGlvbiBpcyBubyBsb25nZXIgdXNlZCAtIERvY2tlciB1c2VzIGNyZWF0ZUludGVyZmFjZVRhYnMgaW5zdGVhZFxuICAgICAgICBjb25zb2xlLndhcm4oJ3Nob3dEb2NrZXJOZXR3b3JrSW5mbyBpcyBkZXByZWNhdGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnQgQ0lEUiBub3RhdGlvbiB0byBkb3R0ZWQgZGVjaW1hbCBuZXRtYXNrXG4gICAgICovXG4gICAgY2lkclRvTmV0bWFzayhjaWRyKSB7XG4gICAgICAgIGNvbnN0IG1hc2sgPSB+KDIgKiogKDMyIC0gY2lkcikgLSAxKTtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIChtYXNrID4+PiAyNCkgJiAyNTUsXG4gICAgICAgICAgICAobWFzayA+Pj4gMTYpICYgMjU1LFxuICAgICAgICAgICAgKG1hc2sgPj4+IDgpICYgMjU1LFxuICAgICAgICAgICAgbWFzayAmIDI1NVxuICAgICAgICBdLmpvaW4oJy4nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGludGVyZmFjZSB0YWJzIGFuZCBmb3JtcyBkeW5hbWljYWxseSBmcm9tIFJFU1QgQVBJIGRhdGFcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIEludGVyZmFjZSBkYXRhIGZyb20gQVBJXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0RvY2tlciAtIFdoZXRoZXIgcnVubmluZyBpbiBEb2NrZXIgZW52aXJvbm1lbnRcbiAgICAgKi9cbiAgICBjcmVhdGVJbnRlcmZhY2VUYWJzKGRhdGEsIGlzRG9ja2VyID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudScpO1xuICAgICAgICBjb25zdCAkY29udGVudCA9ICQoJyNldGgtaW50ZXJmYWNlcy1jb250ZW50Jyk7XG5cbiAgICAgICAgLy8gQ2xlYXIgZXhpc3RpbmcgY29udGVudFxuICAgICAgICAkbWVudS5lbXB0eSgpO1xuICAgICAgICAkY29udGVudC5lbXB0eSgpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0YWJzIGZvciBleGlzdGluZyBpbnRlcmZhY2VzXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHRhYklkID0gaWZhY2UuaWQ7XG4gICAgICAgICAgICBjb25zdCB0YWJMYWJlbCA9IGAke2lmYWNlLm5hbWUgfHwgaWZhY2UuaW50ZXJmYWNlfSAoJHtpZmFjZS5pbnRlcmZhY2V9JHtpZmFjZS52bGFuaWQgIT09ICcwJyAmJiBpZmFjZS52bGFuaWQgIT09IDAgPyBgLiR7aWZhY2UudmxhbmlkfWAgOiAnJ30pYDtcbiAgICAgICAgICAgIGNvbnN0IGlzQWN0aXZlID0gaW5kZXggPT09IDA7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbSAke2lzQWN0aXZlID8gJ2FjdGl2ZScgOiAnJ31cIiBkYXRhLXRhYj1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICR7dGFiTGFiZWx9XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0YWIgY29udGVudFxuICAgICAgICAgICAgLy8gT25seSBWTEFOIGludGVyZmFjZXMgY2FuIGJlIGRlbGV0ZWQgKHZsYW5pZCA+IDApXG4gICAgICAgICAgICAvLyBJbiBEb2NrZXIsIGRpc2FibGUgZGVsZXRlIGZvciBhbGwgaW50ZXJmYWNlc1xuICAgICAgICAgICAgY29uc3QgY2FuRGVsZXRlID0gIWlzRG9ja2VyICYmIHBhcnNlSW50KGlmYWNlLnZsYW5pZCwgMTApID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUJ1dHRvbiA9IGNhbkRlbGV0ZSA/IGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cInVpIGljb24gbGVmdCBsYWJlbGVkIGJ1dHRvbiBkZWxldGUtaW50ZXJmYWNlXCIgZGF0YS12YWx1ZT1cIiR7dGFiSWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaFwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19EZWxldGVDdXJyZW50SW50ZXJmYWNlfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGAgOiAnJztcblxuICAgICAgICAgICAgJGNvbnRlbnQuYXBwZW5kKG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24sIGlzRG9ja2VyKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSB0YWIgZm9yIG5ldyBWTEFOIChub3QgZm9yIERvY2tlcilcbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUgJiYgIWlzRG9ja2VyKSB7XG4gICAgICAgICAgICBjb25zdCB0ZW1wbGF0ZSA9IGRhdGEudGVtcGxhdGU7XG4gICAgICAgICAgICB0ZW1wbGF0ZS5pZCA9IDA7XG5cbiAgICAgICAgICAgIC8vIEFkZCBcIitcIiB0YWIgbWVudSBpdGVtXG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoYFxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwiaXRlbVwiIGRhdGEtdGFiPVwiMFwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gcGx1c1wiPjwvaT5cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgKTtcblxuICAgICAgICAgICAgLy8gQ3JlYXRlIHRlbXBsYXRlIGZvcm0gd2l0aCBpbnRlcmZhY2Ugc2VsZWN0b3JcbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVUZW1wbGF0ZUZvcm0odGVtcGxhdGUsIGRhdGEuaW50ZXJmYWNlcykpO1xuXG4gICAgICAgICAgICAvLyBCdWlsZCBpbnRlcmZhY2Ugc2VsZWN0b3IgZHJvcGRvd24gZm9yIHRlbXBsYXRlXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZXMgPSB7fTtcbiAgICAgICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKGlmYWNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdKSB7XG4gICAgICAgICAgICAgICAgICAgIHBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLmlkLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5pbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpZmFjZS5pbnRlcmZhY2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zID0gT2JqZWN0LnZhbHVlcyhwaHlzaWNhbEludGVyZmFjZXMpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ2ludGVyZmFjZV8wJywgeyBpbnRlcmZhY2VfMDogJycgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZSxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiB0cnVlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBJUHY0IG1vZGUgZHJvcGRvd24gZm9yIHRlbXBsYXRlIChJRD0wKVxuICAgICAgICAgICAgY29uc3QgaXB2NE1vZGVPcHRpb25zID0gW1xuICAgICAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGVNYW51YWx9LFxuICAgICAgICAgICAgICAgIHt2YWx1ZTogJzEnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGVESENQfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdpcHY0X21vZGVfMCcsIHsgaXB2NF9tb2RlXzA6ICcxJyB9LCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogaXB2NE1vZGVPcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SVB2NE1vZGUsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd24gZm9yIHRlbXBsYXRlIChJRD0wKVxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdzdWJuZXRfMCcsIHsgc3VibmV0XzA6ICcyNCcgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBzdWJuZXQgZHJvcGRvd25zIHVzaW5nIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goKGlmYWNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBgc3VibmV0XyR7aWZhY2UuaWR9YDtcbiAgICAgICAgICAgIGNvbnN0IGZvcm1EYXRhID0ge307XG4gICAgICAgICAgICAvLyBDb252ZXJ0IHN1Ym5ldCB0byBzdHJpbmcgZm9yIGRyb3Bkb3duIG1hdGNoaW5nXG4gICAgICAgICAgICBmb3JtRGF0YVtmaWVsZE5hbWVdID0gU3RyaW5nKGlmYWNlLnN1Ym5ldCB8fCAnMjQnKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGZpZWxkTmFtZSwgZm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddICAvLyBBZGQgc2VhcmNoIGNsYXNzIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBJUHY0IG1vZGUgZHJvcGRvd24gKE1hbnVhbC9ESENQKSBmb3Igbm9uLURvY2tlciBlbnZpcm9ubWVudHNcbiAgICAgICAgICAgIGlmICghaWZhY2UuaXNEb2NrZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpcHY0TW9kZUZpZWxkTmFtZSA9IGBpcHY0X21vZGVfJHtpZmFjZS5pZH1gO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlRm9ybURhdGEgPSB7fTtcbiAgICAgICAgICAgICAgICAvLyBXSFk6IGlmYWNlLmRoY3AgY2FuIGJlIGJvb2xlYW4gKGZyb20gUkVTVCBBUEkpIG9yIHN0cmluZyAoZnJvbSBmb3JtKVxuICAgICAgICAgICAgICAgIGlwdjRNb2RlRm9ybURhdGFbaXB2NE1vZGVGaWVsZE5hbWVdID0gKGlmYWNlLmRoY3AgPT09ICcxJyB8fCBpZmFjZS5kaGNwID09PSB0cnVlKSA/ICcxJyA6ICcwJztcblxuICAgICAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlT3B0aW9ucyA9IFtcbiAgICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnMCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19JUHY0TW9kZU1hbnVhbH0sXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzEnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGVESENQfVxuICAgICAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oaXB2NE1vZGVGaWVsZE5hbWUsIGlwdjRNb2RlRm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogaXB2NE1vZGVPcHRpb25zLFxuICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdElQdjRNb2RlLFxuICAgICAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgSVB2NiBtb2RlIGRyb3Bkb3duIChPZmYvQXV0by9NYW51YWwpXG4gICAgICAgICAgICAvLyBGb3IgVkxBTiBpbnRlcmZhY2VzOiBvbmx5IE9mZiBhbmQgTWFudWFsIG1vZGVzIChubyBESENQdjYgQXV0bylcbiAgICAgICAgICAgIGNvbnN0IGlwdjZNb2RlRmllbGROYW1lID0gYGlwdjZfbW9kZV8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBpcHY2TW9kZUZvcm1EYXRhID0ge307XG4gICAgICAgICAgICBpcHY2TW9kZUZvcm1EYXRhW2lwdjZNb2RlRmllbGROYW1lXSA9IFN0cmluZyhpZmFjZS5pcHY2X21vZGUgfHwgJzAnKTtcblxuICAgICAgICAgICAgY29uc3QgaXNWbGFuID0gaWZhY2UudmxhbmlkICYmIHBhcnNlSW50KGlmYWNlLnZsYW5pZCwgMTApID4gMDtcbiAgICAgICAgICAgIGNvbnN0IGlwdjZNb2RlT3B0aW9ucyA9IGlzVmxhblxuICAgICAgICAgICAgICAgID8gW1xuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlT2ZmfSxcbiAgICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnMicsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19JUHY2TW9kZU1hbnVhbH1cbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICAgICAgOiBbXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2Nk1vZGVPZmZ9LFxuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlQXV0b30sXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzInLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2Nk1vZGVNYW51YWx9XG4gICAgICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGlwdjZNb2RlRmllbGROYW1lLCBpcHY2TW9kZUZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogaXB2Nk1vZGVPcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SVB2Nk1vZGUsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlSVB2NkZpZWxkcyhpZmFjZS5pZCk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBJUHY2IHN1Ym5ldCBkcm9wZG93blxuICAgICAgICAgICAgY29uc3QgaXB2NlN1Ym5ldEZpZWxkTmFtZSA9IGBpcHY2X3N1Ym5ldF8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBpcHY2U3VibmV0Rm9ybURhdGEgPSB7fTtcbiAgICAgICAgICAgIGlwdjZTdWJuZXRGb3JtRGF0YVtpcHY2U3VibmV0RmllbGROYW1lXSA9IFN0cmluZyhpZmFjZS5pcHY2X3N1Ym5ldCB8fCAnNjQnKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGlwdjZTdWJuZXRGaWVsZE5hbWUsIGlwdjZTdWJuZXRGb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldElwdjZTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdElQdjZTdWJuZXQsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ11cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBTZXQgaW5pdGlhbCB2aXNpYmlsaXR5IG9mIElQdjYgbWFudWFsIGZpZWxkc1xuICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlSVB2NkZpZWxkcyhpZmFjZS5pZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0ZW1wbGF0ZSAoaWQgPSAwKVxuICAgICAgICBpZiAoZGF0YS50ZW1wbGF0ZSkge1xuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdzdWJuZXRfMCcsIHsgc3VibmV0XzA6ICcyNCcgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10gIC8vIEFkZCBzZWFyY2ggY2xhc3MgZm9yIHNlYXJjaGFibGUgZHJvcGRvd25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykudGFiKCk7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykuZmlyc3QoKS50cmlnZ2VyKCdjbGljaycpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0aWMgcm91dGVzIHNlY3Rpb24gdmlzaWJpbGl0eVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBSZS1iaW5kIGRlbGV0ZSBidXR0b24gaGFuZGxlcnNcbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiByZW1vdmVzIFRBQiBmcm9tIGZvcm0gYW5kIG1hcmtzIGludGVyZmFjZSBhcyBkaXNhYmxlZFxuICAgICAgICAvLyBBY3R1YWwgZGVsZXRpb24gaGFwcGVucyBvbiBmb3JtIHN1Ym1pdFxuICAgICAgICAkKCcuZGVsZXRlLWludGVyZmFjZScpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgVEFCIG1lbnUgaXRlbVxuICAgICAgICAgICAgJChgI2V0aC1pbnRlcmZhY2VzLW1lbnUgYVtkYXRhLXRhYj1cIiR7aW50ZXJmYWNlSWR9XCJdYCkucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgVEFCIGNvbnRlbnRcbiAgICAgICAgICAgIGNvbnN0ICR0YWJDb250ZW50ID0gJChgI2V0aC1pbnRlcmZhY2VzLWNvbnRlbnQgLnRhYltkYXRhLXRhYj1cIiR7aW50ZXJmYWNlSWR9XCJdYCk7XG4gICAgICAgICAgICAkdGFiQ29udGVudC5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gQWRkIGhpZGRlbiBmaWVsZCB0byBtYXJrIHRoaXMgaW50ZXJmYWNlIGFzIGRpc2FibGVkXG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5hcHBlbmQoYDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImRpc2FibGVkXyR7aW50ZXJmYWNlSWR9XCIgdmFsdWU9XCIxXCIgLz5gKTtcblxuICAgICAgICAgICAgLy8gU3dpdGNoIHRvIGZpcnN0IGF2YWlsYWJsZSB0YWJcbiAgICAgICAgICAgIGNvbnN0ICRmaXJzdFRhYiA9ICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEuaXRlbScpLmZpcnN0KCk7XG4gICAgICAgICAgICBpZiAoJGZpcnN0VGFiLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZmlyc3RUYWIudGFiKCdjaGFuZ2UgdGFiJywgJGZpcnN0VGFiLmF0dHIoJ2RhdGEtdGFiJykpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCB0byBlbmFibGUgc3VibWl0IGJ1dHRvblxuICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgIEZvcm0uY2hlY2tWYWx1ZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSVB2NCBtb2RlIGRyb3Bkb3ducyBub3cgaW5pdGlhbGl6ZWQgdmlhIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgaW4gZm9yRWFjaCBsb29wIChsaW5lIH44NDApXG5cbiAgICAgICAgLy8gUmUtYmluZCBJUCBhZGRyZXNzIGlucHV0IG1hc2tzXG4gICAgICAgICQoJy5pcGFkZHJlc3MnKS5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICAvLyBBZGQgVkxBTiBJRCBjaGFuZ2UgaGFuZGxlcnMgdG8gY29udHJvbCBESENQIGNoZWNrYm94IHN0YXRlXG4gICAgICAgICQoJ2lucHV0W25hbWVePVwidmxhbmlkX1wiXScpLm9mZignaW5wdXQgY2hhbmdlJykub24oJ2lucHV0IGNoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHZsYW5JbnB1dCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICR2bGFuSW5wdXQuYXR0cignbmFtZScpLnJlcGxhY2UoJ3ZsYW5pZF8nLCAnJyk7XG4gICAgICAgICAgICBjb25zdCB2bGFuVmFsdWUgPSBwYXJzZUludCgkdmxhbklucHV0LnZhbCgpLCAxMCkgfHwgMDtcbiAgICAgICAgICAgIGNvbnN0ICRkaGNwQ2hlY2tib3ggPSAkKGAjZGhjcC0ke2ludGVyZmFjZUlkfS1jaGVja2JveGApO1xuXG4gICAgICAgICAgICBpZiAodmxhblZhbHVlID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIERpc2FibGUgREhDUCBjaGVja2JveCBmb3IgVkxBTiBpbnRlcmZhY2VzXG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgnc2V0IGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5maW5kKCdpbnB1dCcpLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEVuYWJsZSBESENQIGNoZWNrYm94IGZvciBub24tVkxBTiBpbnRlcmZhY2VzXG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmNoZWNrYm94KCdzZXQgZW5hYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guZmluZCgnaW5wdXQnKS5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkaXNhYmxlZCBmaWVsZCBjbGFzc2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciB0aGUgaGFuZGxlciBmb3IgZXhpc3RpbmcgVkxBTiBpbnRlcmZhY2VzIHRvIGFwcGx5IGluaXRpYWwgc3RhdGVcbiAgICAgICAgJCgnaW5wdXRbbmFtZV49XCJ2bGFuaWRfXCJdJykudHJpZ2dlcignY2hhbmdlJyk7XG5cbiAgICAgICAgLy8gQWRkIElQdjYgYWRkcmVzcyBjaGFuZ2UgaGFuZGxlcnMgdG8gdXBkYXRlIGR1YWwtc3RhY2sgTkFUIGxvZ2ljXG4gICAgICAgICQoJ2lucHV0W25hbWVePVwiaXB2NmFkZHJfXCJdJykub2ZmKCdpbnB1dCBibHVyJykub24oJ2lucHV0IGJsdXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpYyB3aGVuIElQdjYgYWRkcmVzcyBjaGFuZ2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgSVB2NCBhZGRyZXNzIGNoYW5nZSBoYW5kbGVycyB0byB1cGRhdGUgZHVhbC1zdGFjayBOQVQgbG9naWNcbiAgICAgICAgJCgnaW5wdXRbbmFtZV49XCJpcGFkZHJfXCJdJykub2ZmKCdpbnB1dCBibHVyJykub24oJ2lucHV0IGJsdXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpYyB3aGVuIElQdjQgYWRkcmVzcyBjaGFuZ2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGludGVybmV0IHJhZGlvIGJ1dHRvbnMgd2l0aCBGb21hbnRpYyBVSVxuICAgICAgICAkKCcuaW50ZXJuZXQtcmFkaW8nKS5jaGVja2JveCgpO1xuXG4gICAgICAgIC8vIEFkZCBpbnRlcm5ldCByYWRpbyBidXR0b24gY2hhbmdlIGhhbmRsZXJcbiAgICAgICAgJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXScpLm9mZignY2hhbmdlJykub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWRJbnRlcmZhY2VJZCA9ICQodGhpcykudmFsKCk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgYWxsIEROUy9HYXRld2F5IGdyb3Vwc1xuICAgICAgICAgICAgJCgnW2NsYXNzXj1cImRucy1nYXRld2F5LWdyb3VwLVwiXScpLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBETlMvR2F0ZXdheSBncm91cCBmb3Igc2VsZWN0ZWQgaW50ZXJuZXQgaW50ZXJmYWNlXG4gICAgICAgICAgICAkKGAuZG5zLWdhdGV3YXktZ3JvdXAtJHtzZWxlY3RlZEludGVyZmFjZUlkfWApLnNob3coKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIFRBQiBpY29ucyAtIGFkZCBnbG9iZSBpY29uIHRvIHNlbGVjdGVkLCByZW1vdmUgZnJvbSBvdGhlcnNcbiAgICAgICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgdGFiKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRhYiA9ICQodGFiKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0YWJJZCA9ICR0YWIuYXR0cignZGF0YS10YWInKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBleGlzdGluZyBnbG9iZSBpY29uXG4gICAgICAgICAgICAgICAgJHRhYi5maW5kKCcuZ2xvYmUuaWNvbicpLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGdsb2JlIGljb24gdG8gc2VsZWN0ZWQgaW50ZXJuZXQgaW50ZXJmYWNlIFRBQlxuICAgICAgICAgICAgICAgIGlmICh0YWJJZCA9PT0gc2VsZWN0ZWRJbnRlcmZhY2VJZCkge1xuICAgICAgICAgICAgICAgICAgICAkdGFiLnByZXBlbmQoJzxpIGNsYXNzPVwiZ2xvYmUgaWNvblwiPjwvaT4nKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWRcbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBHYXRld2F5IGZpZWxkIHZpc2liaWxpdHkgZm9yIGFsbCBpbnRlcmZhY2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIERIQ1AgaW5mbyBtZXNzYWdlIHZpc2liaWxpdHkgd2hlbiBJUHY0IG1vZGUgY2hhbmdlc1xuICAgICAgICAkKCcuaXB2NC1tb2RlLWRyb3Bkb3duJykub2ZmKCdjaGFuZ2UuZG5zZ2F0ZXdheScpLm9uKCdjaGFuZ2UuZG5zZ2F0ZXdheScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJGRyb3Bkb3duLmF0dHIoJ2lkJykucmVwbGFjZSgnaXB2NC1tb2RlLScsICcnKTtcbiAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlID0gJGRyb3Bkb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzRGhjcEVuYWJsZWQgPSBpcHY0TW9kZSA9PT0gJzEnO1xuXG4gICAgICAgICAgICAvLyBGaW5kIERIQ1AgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCAkZGhjcEluZm9NZXNzYWdlID0gJChgLmRoY3AtaW5mby1tZXNzYWdlLSR7aW50ZXJmYWNlSWR9YCk7XG5cbiAgICAgICAgICAgIGlmIChpc0RoY3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBlbmFibGVkIC0+IHNob3cgREhDUCBpbmZvIG1lc3NhZ2VcbiAgICAgICAgICAgICAgICAkZGhjcEluZm9NZXNzYWdlLnNob3coKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBkaXNhYmxlZCAtPiBoaWRlIERIQ1AgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgJGRoY3BJbmZvTWVzc2FnZS5oaWRlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBJUCBhZGRyZXNzIGdyb3VwIHZpc2liaWxpdHkgKGhpZGUgd2hlbiBESENQIG9uLCBzaG93IHdoZW4gb2ZmKVxuICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpYyB3aGVuIElQdjQgbW9kZSBjaGFuZ2VzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUcmlnZ2VyIGluaXRpYWwgVEFCIGljb24gdXBkYXRlIGZvciBjaGVja2VkIHJhZGlvIGJ1dHRvblxuICAgICAgICBjb25zdCAkY2hlY2tlZFJhZGlvID0gJCgnaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkJyk7XG4gICAgICAgIGlmICgkY2hlY2tlZFJhZGlvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRjaGVja2VkUmFkaW8udHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBcHBseSBpbml0aWFsIGRpc2FibGVkIHN0YXRlIGZvciBESENQLWVuYWJsZWQgaW50ZXJmYWNlc1xuICAgICAgICAvLyBDYWxsIGFmdGVyIGFsbCBkcm9wZG93bnMgYXJlIGNyZWF0ZWRcbiAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgLy8gUmUtc2F2ZSBpbml0aWFsIGZvcm0gdmFsdWVzIGFuZCByZS1iaW5kIGV2ZW50IGhhbmRsZXJzIGZvciBkeW5hbWljYWxseSBjcmVhdGVkIGlucHV0c1xuICAgICAgICAvLyBUaGlzIGlzIGVzc2VudGlhbCBmb3IgZm9ybSBjaGFuZ2UgZGV0ZWN0aW9uIHRvIHdvcmsgd2l0aCBkeW5hbWljIHRhYnNcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgLy8gT3ZlcnJpZGUgRm9ybSBtZXRob2RzIHRvIG1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlcyAoaW5jbHVkaW5nIGZyb20gdGFicylcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMgPSBGb3JtLnNhdmVJbml0aWFsVmFsdWVzO1xuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxDaGVja1ZhbHVlcyA9IEZvcm0uY2hlY2tWYWx1ZXM7XG5cbiAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdmFsdWVzIGZyb20gRm9tYW50aWMgVUkgKG1heSBtaXNzIGR5bmFtaWNhbGx5IGNyZWF0ZWQgdGFiIGZpZWxkcylcbiAgICAgICAgICAgICAgICBjb25zdCBmb21hbnRpY1ZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAgICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgYWxsIGZpZWxkIHZhbHVlcyB0byBjYXRjaCBmaWVsZHMgdGhhdCBGb21hbnRpYyBVSSBtaXNzZXNcbiAgICAgICAgICAgICAgICBjb25zdCBtYW51YWxWYWx1ZXMgPSB7fTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgYm90aCAobWFudWFsIHZhbHVlcyBvdmVycmlkZSBGb21hbnRpYyB2YWx1ZXMgZm9yIGZpZWxkcyB0aGF0IGV4aXN0IGluIGJvdGgpXG4gICAgICAgICAgICAgICAgRm9ybS5vbGRGb3JtVmFsdWVzID0gT2JqZWN0LmFzc2lnbih7fSwgZm9tYW50aWNWYWx1ZXMsIG1hbnVhbFZhbHVlcyk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHZhbHVlcyBmcm9tIEZvbWFudGljIFVJXG4gICAgICAgICAgICAgICAgY29uc3QgZm9tYW50aWNWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGFsbCBmaWVsZCB2YWx1ZXNcbiAgICAgICAgICAgICAgICBjb25zdCBtYW51YWxWYWx1ZXMgPSB7fTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dCwgc2VsZWN0LCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmaWVsZCA9ICQodGhpcyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkZmllbGQuYXR0cignbmFtZScpIHx8ICRmaWVsZC5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdjaGVja2JveCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQuaXMoJzpjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCRmaWVsZC5hdHRyKCd0eXBlJykgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJGZpZWxkLmlzKCc6Y2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hbnVhbFZhbHVlc1tuYW1lXSA9ICRmaWVsZC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gTWVyZ2UgYm90aFxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld0Zvcm1WYWx1ZXMgPSBPYmplY3QuYXNzaWduKHt9LCBmb21hbnRpY1ZhbHVlcywgbWFudWFsVmFsdWVzKTtcblxuICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShGb3JtLm9sZEZvcm1WYWx1ZXMpID09PSBKU09OLnN0cmluZ2lmeShuZXdGb3JtVmFsdWVzKSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtLnNhdmVJbml0aWFsVmFsdWVzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGVvZiBGb3JtLnNldEV2ZW50cyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIEZvcm0uc2V0RXZlbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIGV4aXN0aW5nIGludGVyZmFjZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBpZmFjZSAtIEludGVyZmFjZSBkYXRhXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0FjdGl2ZSAtIFdoZXRoZXIgdGhpcyB0YWIgaXMgYWN0aXZlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRlbGV0ZUJ1dHRvbiAtIEhUTUwgZm9yIGRlbGV0ZSBidXR0b25cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzRG9ja2VyIC0gV2hldGhlciBydW5uaW5nIGluIERvY2tlciBlbnZpcm9ubWVudFxuICAgICAqL1xuICAgIGNyZWF0ZUludGVyZmFjZUZvcm0oaWZhY2UsIGlzQWN0aXZlLCBkZWxldGVCdXR0b24sIGlzRG9ja2VyID0gZmFsc2UpIHtcbiAgICAgICAgY29uc3QgaWQgPSBpZmFjZS5pZDtcbiAgICAgICAgY29uc3QgaXNJbnRlcm5ldEludGVyZmFjZSA9IGlmYWNlLmludGVybmV0IHx8IGZhbHNlO1xuXG4gICAgICAgIC8vIEROUy9HYXRld2F5IGZpZWxkcyB2aXNpYmlsaXR5XG4gICAgICAgIGNvbnN0IGRuc0dhdGV3YXlWaXNpYmxlID0gaXNJbnRlcm5ldEludGVyZmFjZSA/ICcnIDogJ3N0eWxlPVwiZGlzcGxheTpub25lO1wiJztcblxuICAgICAgICAvLyBSZWFkb25seS9QbGFjZWhvbGRlciBsb2dpYyBmb3IgREhDUC1jb250cm9sbGVkIGZpZWxkc1xuICAgICAgICBjb25zdCBkaGNwRGlzYWJsZWQgPSBpc0RvY2tlciB8fCBpZmFjZS52bGFuaWQgPiAwO1xuICAgICAgICBjb25zdCBkaGNwQ2hlY2tlZCA9IGlzRG9ja2VyIHx8IChpZmFjZS52bGFuaWQgPiAwID8gZmFsc2UgOiBpZmFjZS5kaGNwKTtcblxuICAgICAgICAvLyBJUHY0IHBsYWNlaG9sZGVycyB3aGVuIERIQ1AgZW5hYmxlZFxuICAgICAgICBjb25zdCBob3N0bmFtZVBsYWNlaG9sZGVyID0gZGhjcENoZWNrZWQgPyBnbG9iYWxUcmFuc2xhdGUubndfUGxhY2Vob2xkZXJEaGNwSG9zdG5hbWUgOiAnbWlrb3BieCc7XG4gICAgICAgIGNvbnN0IHByaW1hcnlEbnNQbGFjZWhvbGRlciA9IGRoY3BDaGVja2VkID8gYCR7Z2xvYmFsVHJhbnNsYXRlLm53X1BsYWNlaG9sZGVyRGhjcERuc30gJHtpZmFjZS5jdXJyZW50UHJpbWFyeWRucyB8fCBpZmFjZS5wcmltYXJ5ZG5zIHx8ICc4LjguOC44J31gIDogJzguOC44LjgnO1xuICAgICAgICBjb25zdCBzZWNvbmRhcnlEbnNQbGFjZWhvbGRlciA9IGRoY3BDaGVja2VkID8gYCR7Z2xvYmFsVHJhbnNsYXRlLm53X1BsYWNlaG9sZGVyRGhjcERuc30gJHtpZmFjZS5jdXJyZW50U2Vjb25kYXJ5ZG5zIHx8IGlmYWNlLnNlY29uZGFyeWRucyB8fCAnOC44LjQuNCd9YCA6ICc4LjguNC40JztcblxuICAgICAgICAvLyBJUHY2IEROUyBwbGFjZWhvbGRlcnMgKGFsd2F5cyBlZGl0YWJsZSlcbiAgICAgICAgY29uc3QgaXB2NlByaW1hcnlEbnNQbGFjZWhvbGRlciA9IGdsb2JhbFRyYW5zbGF0ZS5ud19QbGFjZWhvbGRlcklQdjZEbnM7XG4gICAgICAgIGNvbnN0IGlwdjZTZWNvbmRhcnlEbnNQbGFjZWhvbGRlciA9IGdsb2JhbFRyYW5zbGF0ZS5ud19QbGFjZWhvbGRlcklQdjZEbnM7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnQgJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke2lkfVwiPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pbnRlcmZhY2V9XCIgLz5cblxuICAgICAgICAgICAgICAgIDwhLS0gQ29tbW9uIFNldHRpbmdzIFNlY3Rpb24gKG91dHNpZGUgY29sdW1ucykgLS0+XG4gICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/IGBcbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLm5hbWUgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIiB2YWx1ZT1cIiR7aWR9XCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgdmFsdWU9XCJvblwiIC8+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwYWRkciB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5zdWJuZXQgfHwgJzI0J31cIiAvPlxuICAgICAgICAgICAgICAgIGAgOiBgXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcmZhY2VOYW1lfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5uYW1lIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGludGVybmV0LXJhZGlvXCIgaWQ9XCJpbnRlcm5ldC0ke2lkfS1yYWRpb1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCIgdmFsdWU9XCIke2lkfVwiICR7aXNJbnRlcm5ldEludGVyZmFjZSA/ICdjaGVja2VkJyA6ICcnfSAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD48aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVybmV0SW50ZXJmYWNlfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ZsYW5JRH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiBuYW1lPVwidmxhbmlkXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnZsYW5pZCB8fCAnMCd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgIDwhLS0gVHdvIENvbHVtbiBHcmlkOiBJUHY0IChsZWZ0KSBhbmQgSVB2NiAocmlnaHQpIC0tPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0d28gY29sdW1uIHN0YWNrYWJsZSBncmlkXCI+XG5cbiAgICAgICAgICAgICAgICAgICAgPCEtLSBJUHY0IENvbmZpZ3VyYXRpb24gQ29sdW1uIC0tPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29sdW1uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aDQgY2xhc3M9XCJ1aSBkaXZpZGluZyBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NENvbmZpZ3VyYXRpb259XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2g0PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAke2lzRG9ja2VyID8gJycgOiBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiaXB2NF9tb2RlXyR7aWR9XCIgbmFtZT1cImlwdjRfbW9kZV8ke2lkfVwiIHZhbHVlPVwiJHtkaGNwQ2hlY2tlZCA/ICcxJyA6ICcwJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICBgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJub3RkaGNwXyR7aWR9XCIgaWQ9XCJub3QtZGhjcC0ke2lkfVwiLz5cblxuICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/ICcnIDogYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkc1wiIGlkPVwiaXAtYWRkcmVzcy1ncm91cC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVBBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXBhZGRyIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfTmV0d29ya01hc2t9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJzdWJuZXRfJHtpZH1cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLnN1Ym5ldCB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/ICcnIDogYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlwdjQtZ2F0ZXdheS1maWVsZC0ke2lkfVwiIHN0eWxlPVwiZGlzcGxheTogJHtpc0ludGVybmV0SW50ZXJmYWNlICYmICFkaGNwQ2hlY2tlZCA/ICdibG9jaycgOiAnbm9uZSd9O1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfR2F0ZXdheX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiZ2F0ZXdheV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5nYXRld2F5IHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiMTkyLjE2OC4xLjFcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSBJUHY0IEludGVybmV0IFNldHRpbmdzIChvbmx5IGlmIEludGVybmV0IGludGVyZmFjZSkgLS0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXB2NC1pbnRlcm5ldC1zZXR0aW5ncy0ke2lkfVwiICR7ZG5zR2F0ZXdheVZpc2libGV9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBob3Jpem9udGFsIGRpdmlkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcm5ldElQdjR9PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ByaW1hcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cInByaW1hcnlkbnNfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuY3VycmVudFByaW1hcnlkbnMgfHwgaWZhY2UucHJpbWFyeWRucyB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIiR7cHJpbWFyeURuc1BsYWNlaG9sZGVyfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19TZWNvbmRhcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cInNlY29uZGFyeWRuc18ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5jdXJyZW50U2Vjb25kYXJ5ZG5zIHx8IGlmYWNlLnNlY29uZGFyeWRucyB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIiR7c2Vjb25kYXJ5RG5zUGxhY2Vob2xkZXJ9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGhpZGRlbiBkaXZpZGVyXCI+PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJkaGNwLWluZm8tbWVzc2FnZS0ke2lkfVwiIHN0eWxlPVwiZGlzcGxheTogJHtkaGNwQ2hlY2tlZCAmJiAhaXNEb2NrZXIgPyAnYmxvY2snIDogJ25vbmUnfTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY29tcGFjdCBpbmZvIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0hlYWRlcn08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzcz1cImxpc3RcIiBzdHlsZT1cIm1hcmdpbi10b3A6IDAuNWVtO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0lQfTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRJcGFkZHIgfHwgaWZhY2UuaXBhZGRyIHx8ICdOL0EnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvU3VibmV0fTogPHN0cm9uZz4vJHtpZmFjZS5jdXJyZW50U3VibmV0IHx8IGlmYWNlLnN1Ym5ldCB8fCAnTi9BJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0dhdGV3YXl9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudEdhdGV3YXkgfHwgaWZhY2UuZ2F0ZXdheSB8fCAnTi9BJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0ROU306IDxzdHJvbmc+JHtpZmFjZS5wcmltYXJ5ZG5zIHx8ICdOL0EnfSR7aWZhY2Uuc2Vjb25kYXJ5ZG5zID8gJywgJyArIGlmYWNlLnNlY29uZGFyeWRucyA6ICcnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtpZmFjZS5kb21haW4gPyBgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvRG9tYWlufTogPHN0cm9uZz4ke2lmYWNlLmRvbWFpbn08L3N0cm9uZz48L2xpPmAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7aXNEb2NrZXIgPyBgXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZG9ja2VyLWluZm8tbWVzc2FnZS0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RvY2tlcklQdjRJbmZvIHx8ICdDdXJyZW50IElQdjQgQ29uZmlndXJhdGlvbid9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dWwgY2xhc3M9XCJsaXN0XCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAwLjVlbTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9JUH06IDxzdHJvbmc+JHtpZmFjZS5jdXJyZW50SXBhZGRyIHx8IGlmYWNlLmlwYWRkciB8fCAnTi9BJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb1N1Ym5ldH06IDxzdHJvbmc+LyR7aWZhY2UuY3VycmVudFN1Ym5ldCB8fCBpZmFjZS5zdWJuZXQgfHwgJ04vQSd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9HYXRld2F5fTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRHYXRld2F5IHx8IGlmYWNlLmdhdGV3YXkgfHwgJ04vQSd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8cCBzdHlsZT1cIm1hcmdpbi10b3A6IDAuNWVtO1wiPjxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgaWNvblwiPjwvaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Eb2NrZXJJUHY0SW5mb05vdGUgfHwgJ05ldHdvcmsgc2V0dGluZ3MgYXJlIG1hbmFnZWQgYnkgRG9ja2VyIHJ1bnRpbWUuIE9ubHkgRE5TIHNlcnZlcnMgY2FuIGJlIGNvbmZpZ3VyZWQuJ308L3A+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICBgIDogJyd9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgIDwhLS0gSVB2NiBDb25maWd1cmF0aW9uIENvbHVtbiAtLT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGg0IGNsYXNzPVwidWkgZGl2aWRpbmcgaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ3b3JsZCBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZDb25maWd1cmF0aW9ufVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9oND5cblxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cImlwdjZfbW9kZV8ke2lkfVwiIG5hbWU9XCJpcHY2X21vZGVfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXB2Nl9tb2RlIHx8ICcwJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwhLS0gSGlkZGVuIGZpZWxkIHRvIHN0b3JlIGN1cnJlbnQgYXV0by1jb25maWd1cmVkIElQdjYgYWRkcmVzcyAtLT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJjdXJyZW50LWlwdjZhZGRyLSR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmN1cnJlbnRJcHY2YWRkciB8fCAnJ31cIiAvPlxuXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXB2Ni1tYW51YWwtZmllbGRzLSR7aWR9XCIgc3R5bGU9XCJkaXNwbGF5OiBub25lO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkFkZHJlc3N9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC02MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXB2NmFkZHJlc3NcIiBuYW1lPVwiaXB2NmFkZHJfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXB2NmFkZHIgfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCJmZDAwOjoxXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2U3VibmV0fTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiaXB2Nl9zdWJuZXRfJHtpZH1cIiBuYW1lPVwiaXB2Nl9zdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXB2Nl9zdWJuZXQgfHwgJzY0J31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIiAke2Ruc0dhdGV3YXlWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZHYXRld2F5fTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNjAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwdjZhZGRyZXNzXCIgbmFtZT1cImlwdjZfZ2F0ZXdheV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcHY2X2dhdGV3YXkgfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCJmZTgwOjoxXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSBJUHY2IEludGVybmV0IFNldHRpbmdzIChvbmx5IGlmIEludGVybmV0IGludGVyZmFjZSkgLS0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXB2Ni1pbnRlcm5ldC1zZXR0aW5ncy0ke2lkfVwiICR7ZG5zR2F0ZXdheVZpc2libGV9PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBob3Jpem9udGFsIGRpdmlkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcm5ldElQdjZ9PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgaXB2Ni1wcmltYXJ5ZG5zLWZpZWxkLSR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2UHJpbWFyeUROU308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcHY2YWRkcmVzc1wiIG5hbWU9XCJwcmltYXJ5ZG5zNl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5jdXJyZW50UHJpbWFyeWRuczYgfHwgaWZhY2UucHJpbWFyeWRuczYgfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCIke2lwdjZQcmltYXJ5RG5zUGxhY2Vob2xkZXJ9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgaXB2Ni1zZWNvbmRhcnlkbnMtZmllbGQtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZTZWNvbmRhcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXB2NmFkZHJlc3NcIiBuYW1lPVwic2Vjb25kYXJ5ZG5zNl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5jdXJyZW50U2Vjb25kYXJ5ZG5zNiB8fCBpZmFjZS5zZWNvbmRhcnlkbnM2IHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiJHtpcHY2U2Vjb25kYXJ5RG5zUGxhY2Vob2xkZXJ9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGhpZGRlbiBkaXZpZGVyXCI+PC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpcHY2LWF1dG8taW5mby1tZXNzYWdlLSR7aWR9XCIgc3R5bGU9XCJkaXNwbGF5OiAke2lmYWNlLmlwdjZfbW9kZSA9PT0gJzEnID8gJ2Jsb2NrJyA6ICdub25lJ307XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNvbXBhY3QgaW5mbyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkF1dG9JbmZvSGVhZGVyfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzPVwibGlzdFwiIHN0eWxlPVwibWFyZ2luLXRvcDogMC41ZW07XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBdXRvSW5mb0FkZHJlc3N9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudElwdjZhZGRyIHx8IGlmYWNlLmlwdjZhZGRyIHx8ICdBdXRvY29uZmlndXJlZCd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkF1dG9JbmZvUHJlZml4fTogPHN0cm9uZz4vJHtpZmFjZS5jdXJyZW50SXB2Nl9zdWJuZXQgfHwgaWZhY2UuaXB2Nl9zdWJuZXQgfHwgJzY0J308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7KGlmYWNlLmN1cnJlbnRJcHY2X2dhdGV3YXkgfHwgaWZhY2UuaXB2Nl9nYXRld2F5KSA/IGA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NkF1dG9JbmZvR2F0ZXdheX06IDxzdHJvbmc+JHtpZmFjZS5jdXJyZW50SXB2Nl9nYXRld2F5IHx8IGlmYWNlLmlwdjZfZ2F0ZXdheX08L3N0cm9uZz48L2xpPmAgOiAnJ31cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgJHtkZWxldGVCdXR0b259XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGZvcm0gZm9yIG5ldyBWTEFOIHRlbXBsYXRlXG4gICAgICovXG4gICAgY3JlYXRlVGVtcGxhdGVGb3JtKHRlbXBsYXRlLCBpbnRlcmZhY2VzKSB7XG4gICAgICAgIGNvbnN0IGlkID0gMDtcblxuICAgICAgICByZXR1cm4gYFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJvdHRvbSBhdHRhY2hlZCB0YWIgc2VnbWVudFwiIGRhdGEtdGFiPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJmYWNlXyR7aWR9XCIgaWQ9XCJpbnRlcmZhY2VfJHtpZH1cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiBpZD1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIlwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBzZWdtZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdG9nZ2xlIGNoZWNrYm94IGRoY3AtY2hlY2tib3hcIiBpZD1cImRoY3AtJHtpZH0tY2hlY2tib3hcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgbmFtZT1cImRoY3BfJHtpZH1cIiBjaGVja2VkIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1VzZURIQ1B9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJpcHY0X21vZGVfJHtpZH1cIiBuYW1lPVwiaXB2NF9tb2RlXyR7aWR9XCIgdmFsdWU9XCIxXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJub3RkaGNwXyR7aWR9XCIgaWQ9XCJub3QtZGhjcC0ke2lkfVwiLz5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZHNcIiBpZD1cImlwLWFkZHJlc3MtZ3JvdXAtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVBBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImlwYWRkcl8ke2lkfVwiIHZhbHVlPVwiXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfTmV0d29ya01hc2t9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cInN1Ym5ldF8ke2lkfVwiIG5hbWU9XCJzdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIjI0XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfVmxhbklEfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtMTAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cIm51bWJlclwiIG5hbWU9XCJ2bGFuaWRfJHtpZH1cIiB2YWx1ZT1cIjQwOTVcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICBgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgSVB2NiBzdWJuZXQgcHJlZml4IG9wdGlvbnMgYXJyYXkgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIElQdjYgc3VibmV0IHByZWZpeCBvcHRpb25zICgvMSB0byAvMTI4KVxuICAgICAqL1xuICAgIGdldElwdjZTdWJuZXRPcHRpb25zQXJyYXkoKSB7XG4gICAgICAgIGNvbnN0IG9wdGlvbnMgPSBbXTtcbiAgICAgICAgLy8gR2VuZXJhdGUgLzEgdG8gLzEyOCAoY29tbW9uOiAvNjQsIC80OCwgLzU2LCAvMTI4KVxuICAgICAgICBmb3IgKGxldCBpID0gMTI4OyBpID49IDE7IGktLSkge1xuICAgICAgICAgICAgbGV0IGRlc2NyaXB0aW9uID0gYC8ke2l9YDtcbiAgICAgICAgICAgIC8vIEFkZCBkZXNjcmlwdGlvbnMgZm9yIGNvbW1vbiBwcmVmaXhlc1xuICAgICAgICAgICAgaWYgKGkgPT09IDEyOCkgZGVzY3JpcHRpb24gKz0gJyAoU2luZ2xlIGhvc3QpJztcbiAgICAgICAgICAgIGVsc2UgaWYgKGkgPT09IDY0KSBkZXNjcmlwdGlvbiArPSAnIChTdGFuZGFyZCBzdWJuZXQpJztcbiAgICAgICAgICAgIGVsc2UgaWYgKGkgPT09IDU2KSBkZXNjcmlwdGlvbiArPSAnIChTbWFsbCBuZXR3b3JrKSc7XG4gICAgICAgICAgICBlbHNlIGlmIChpID09PSA0OCkgZGVzY3JpcHRpb24gKz0gJyAoTGFyZ2UgbmV0d29yayknO1xuICAgICAgICAgICAgZWxzZSBpZiAoaSA9PT0gMzIpIGRlc2NyaXB0aW9uICs9ICcgKElTUCBhc3NpZ25tZW50KSc7XG5cbiAgICAgICAgICAgIG9wdGlvbnMucHVzaCh7XG4gICAgICAgICAgICAgICAgdmFsdWU6IGkudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICB0ZXh0OiBkZXNjcmlwdGlvblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBzdWJuZXQgbWFzayBvcHRpb25zIGFycmF5IGZvciBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBzdWJuZXQgbWFzayBvcHRpb25zXG4gICAgICovXG4gICAgZ2V0U3VibmV0T3B0aW9uc0FycmF5KCkge1xuICAgICAgICAvLyBOZXR3b3JrIG1hc2tzIGZyb20gQ2lkcjo6Z2V0TmV0TWFza3MoKSAoa3Jzb3J0IFNPUlRfTlVNRVJJQylcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHt2YWx1ZTogJzMyJywgdGV4dDogJzMyIC0gMjU1LjI1NS4yNTUuMjU1J30sXG4gICAgICAgICAgICB7dmFsdWU6ICczMScsIHRleHQ6ICczMSAtIDI1NS4yNTUuMjU1LjI1NCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMzAnLCB0ZXh0OiAnMzAgLSAyNTUuMjU1LjI1NS4yNTInfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI5JywgdGV4dDogJzI5IC0gMjU1LjI1NS4yNTUuMjQ4J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyOCcsIHRleHQ6ICcyOCAtIDI1NS4yNTUuMjU1LjI0MCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjcnLCB0ZXh0OiAnMjcgLSAyNTUuMjU1LjI1NS4yMjQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI2JywgdGV4dDogJzI2IC0gMjU1LjI1NS4yNTUuMTkyJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNScsIHRleHQ6ICcyNSAtIDI1NS4yNTUuMjU1LjEyOCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjQnLCB0ZXh0OiAnMjQgLSAyNTUuMjU1LjI1NS4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMycsIHRleHQ6ICcyMyAtIDI1NS4yNTUuMjU1LjI1NCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjInLCB0ZXh0OiAnMjIgLSAyNTUuMjU1LjI1Mi4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMScsIHRleHQ6ICcyMSAtIDI1NS4yNTUuMjQ4LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIwJywgdGV4dDogJzIwIC0gMjU1LjI1NS4yNDAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTknLCB0ZXh0OiAnMTkgLSAyNTUuMjU1LjIyNC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxOCcsIHRleHQ6ICcxOCAtIDI1NS4yNTUuMTkyLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE3JywgdGV4dDogJzE3IC0gMjU1LjI1NS4xMjguMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTYnLCB0ZXh0OiAnMTYgLSAyNTUuMjU1LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTUnLCB0ZXh0OiAnMTUgLSAyNTUuMjU0LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTQnLCB0ZXh0OiAnMTQgLSAyNTUuMjUyLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTMnLCB0ZXh0OiAnMTMgLSAyNTUuMjQ4LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTInLCB0ZXh0OiAnMTIgLSAyNTUuMjQwLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTEnLCB0ZXh0OiAnMTEgLSAyNTUuMjI0LjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTAnLCB0ZXh0OiAnMTAgLSAyNTUuMTkyLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnOScsIHRleHQ6ICc5IC0gMjU1LjEyOC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzgnLCB0ZXh0OiAnOCAtIDI1NS4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNycsIHRleHQ6ICc3IC0gMjU0LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc2JywgdGV4dDogJzYgLSAyNTIuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzUnLCB0ZXh0OiAnNSAtIDI0OC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNCcsIHRleHQ6ICc0IC0gMjQwLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICczJywgdGV4dDogJzMgLSAyMjQuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzInLCB0ZXh0OiAnMiAtIDE5Mi4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMScsIHRleHQ6ICcxIC0gMTI4LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogJzAgLSAwLjAuMC4wJ30sXG4gICAgICAgIF07XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBjb25maWd1cmF0aW9uIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBXSFk6IEJvdGggRG9ja2VyIGFuZCBub24tRG9ja2VyIG5vdyB1c2UgaW50ZXJmYWNlIHRhYnNcbiAgICAgICAgLy8gRG9ja2VyIGhhcyByZXN0cmljdGlvbnM6IERIQ1AgbG9ja2VkLCBJUC9zdWJuZXQvVkxBTiByZWFkb25seSwgRE5TIGVkaXRhYmxlXG4gICAgICAgIG5ldHdvcmtzLmNyZWF0ZUludGVyZmFjZVRhYnMoZGF0YSwgZGF0YS5pc0RvY2tlciB8fCBmYWxzZSk7XG5cbiAgICAgICAgLy8gUG9wdWxhdGUgZ2xvYmFsIGhvc3RuYW1lIGZyb20gZmlyc3QgaW50ZXJmYWNlIChzaW5nbGUgdmFsdWUgZm9yIGFsbCBpbnRlcmZhY2VzKVxuICAgICAgICBpZiAoZGF0YS5pbnRlcmZhY2VzICYmIGRhdGEuaW50ZXJmYWNlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBmaXJzdEludGVyZmFjZSA9IGRhdGEuaW50ZXJmYWNlc1swXTtcbiAgICAgICAgICAgIGNvbnN0IGhvc3RuYW1lID0gZmlyc3RJbnRlcmZhY2UuY3VycmVudEhvc3RuYW1lIHx8IGZpcnN0SW50ZXJmYWNlLmhvc3RuYW1lIHx8ICcnO1xuICAgICAgICAgICAgJCgnI2dsb2JhbC1ob3N0bmFtZScpLnZhbChob3N0bmFtZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgTkFUIHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLm5hdCkge1xuICAgICAgICAgICAgLy8gQm9vbGVhbiB2YWx1ZXMgZnJvbSBBUElcbiAgICAgICAgICAgIGlmIChkYXRhLm5hdC51c2VuYXQpIHtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIGRhdGEubmF0LmV4dGlwYWRkciB8fCAnJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCBkYXRhLm5hdC5leHRob3N0bmFtZSB8fCAnJyk7XG5cbiAgICAgICAgICAgIC8vIGF1dG9VcGRhdGVFeHRlcm5hbElwIGJvb2xlYW4gKGZpZWxkIG5hbWUgZnJvbSB0aGUgZm9ybSlcbiAgICAgICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlQ2hlY2tib3ggPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRhdXRvVXBkYXRlQ2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGlmIChkYXRhLm5hdC5BVVRPX1VQREFURV9FWFRFUk5BTF9JUCB8fCBkYXRhLm5hdC5hdXRvVXBkYXRlRXh0ZXJuYWxJcCkge1xuICAgICAgICAgICAgICAgICAgICAkYXV0b1VwZGF0ZUNoZWNrYm94LmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgcG9ydCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5wb3J0cykge1xuICAgICAgICAgICAgLy8gV0hZOiBObyBtYXBwaW5nIG5lZWRlZCAtIEFQSSByZXR1cm5zIGtleXMgbWF0Y2hpbmcgZm9ybSBmaWVsZCBuYW1lc1xuICAgICAgICAgICAgLy8gKGUuZy4sICdleHRlcm5hbFNJUFBvcnQnIGZyb20gUGJ4U2V0dGluZ3M6OkVYVEVSTkFMX1NJUF9QT1JUIGNvbnN0YW50KVxuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5wb3J0cykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gZGF0YS5wb3J0c1trZXldO1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgTkFUIGhlbHAgdGV4dCBhbmQgbGFiZWxzIHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVOQVRIZWxwVGV4dChkYXRhLnBvcnRzKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZVBvcnRMYWJlbHMoZGF0YS5wb3J0cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYWRkaXRpb25hbCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5zZXR0aW5ncykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5zZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgZGF0YS5zZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU3RvcmUgYXZhaWxhYmxlIGludGVyZmFjZXMgZm9yIHN0YXRpYyByb3V0ZXMgRklSU1QgKGJlZm9yZSBsb2FkaW5nIHJvdXRlcylcbiAgICAgICAgaWYgKGRhdGEuYXZhaWxhYmxlSW50ZXJmYWNlcykge1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzID0gZGF0YS5hdmFpbGFibGVJbnRlcmZhY2VzO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTG9hZCBzdGF0aWMgcm91dGVzIEFGVEVSIGF2YWlsYWJsZUludGVyZmFjZXMgYXJlIHNldFxuICAgICAgICBpZiAoZGF0YS5zdGF0aWNSb3V0ZXMpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIubG9hZFJvdXRlcyhkYXRhLnN0YXRpY1JvdXRlcyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGRpcnR5IGNoZWNraW5nIGFmdGVyIHBvcHVsYXRpb24gaXMgY29tcGxldGVcbiAgICAgICAgLy8gVGhpcyBlbnN1cmVzIHRoZSBidXR0b24gaXMgZGlzYWJsZWQgYW5kIGFsbCBkeW5hbWljYWxseSBjcmVhdGVkIGZpZWxkcyBhcmUgdHJhY2tlZFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSQvKTtcbiAgICBpZiAoZiA9PSBudWxsKSB7XG4gICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAobGV0IGkgPSAxOyBpIDwgNTsgaSArPSAxKSB7XG4gICAgICAgICAgICBjb25zdCBhID0gZltpXTtcbiAgICAgICAgICAgIGlmIChhID4gMjU1KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZbNV0gPiAzMikge1xuICAgICAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUHY2IGFkZHJlc3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVB2NiBhZGRyZXNzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUHY2IGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwdjZhZGRyID0gKHZhbHVlKSA9PiB7XG4gICAgLy8gSVB2NiByZWdleCBwYXR0ZXJuXG4gICAgLy8gU3VwcG9ydHMgZnVsbCBmb3JtLCBjb21wcmVzc2VkIGZvcm0gKDo6KSwgSVB2NC1tYXBwZWQgKDo6ZmZmZjoxOTIuMC4yLjEpLCBsaW5rLWxvY2FsIChmZTgwOjoxJWV0aDApXG4gICAgY29uc3QgaXB2NlBhdHRlcm4gPSAvXigoWzAtOWEtZkEtRl17MSw0fTopezd9WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsN306fChbMC05YS1mQS1GXXsxLDR9Oil7MSw2fTpbMC05YS1mQS1GXXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw1fSg6WzAtOWEtZkEtRl17MSw0fSl7MSwyfXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH0oOlswLTlhLWZBLUZdezEsNH0pezEsM318KFswLTlhLWZBLUZdezEsNH06KXsxLDN9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwyfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw1fXxbMC05YS1mQS1GXXsxLDR9OigoOlswLTlhLWZBLUZdezEsNH0pezEsNn0pfDooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDd9fDopfGZlODA6KDpbMC05YS1mQS1GXXswLDR9KXswLDR9JVswLTlhLXpBLVpdezEsfXw6OihmZmZmKDowezEsNH0pezAsMX06KXswLDF9KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKXwoWzAtOWEtZkEtRl17MSw0fTopezEsNH06KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXC4pezN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKSkkLztcbiAgICByZXR1cm4gaXB2NlBhdHRlcm4udGVzdCh2YWx1ZSk7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyAoSVB2NCBvciBJUHY2KS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byB2YWxpZGF0ZSBhcyBhbiBJUCBhZGRyZXNzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUHY0IG9yIElQdjYgYWRkcmVzcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyZXNzID0gKHZhbHVlKSA9PiB7XG4gICAgcmV0dXJuICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHIodmFsdWUpIHx8ICQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcHY2YWRkcih2YWx1ZSk7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHJXaXRoUG9ydE9wdGlvbmFsID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSg6WzAtOV0rKT8kLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIGEgZ2l2ZW4gaW50ZXJmYWNlLlxuICogQHBhcmFtIHtzdHJpbmd9IHZsYW5WYWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgVkxBTiBJRCBpbnB1dCBmaWVsZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBwYXJhbWV0ZXIgZm9yIHRoZSBydWxlLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIHRoZSBpbnRlcmZhY2UsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrVmxhbiA9ICh2bGFuVmFsdWUsIHBhcmFtKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgdmxhbnNBcnJheSA9IHt9O1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLmludGVyZmFjZV8wICE9PSB1bmRlZmluZWQgJiYgYWxsVmFsdWVzLmludGVyZmFjZV8wID4gMCkge1xuICAgICAgICBjb25zdCBuZXdFdGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHthbGxWYWx1ZXMuaW50ZXJmYWNlXzB9YF07XG4gICAgICAgIHZsYW5zQXJyYXlbbmV3RXRoTmFtZV0gPSBbYWxsVmFsdWVzLnZsYW5pZF8wXTtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy52bGFuaWRfMCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgICQuZWFjaChhbGxWYWx1ZXMsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAnaW50ZXJmYWNlXzAnIHx8IGluZGV4ID09PSAndmxhbmlkXzAnKSByZXR1cm47XG4gICAgICAgIGlmIChpbmRleC5pbmRleE9mKCd2bGFuaWQnKSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBldGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHtpbmRleC5zcGxpdCgnXycpWzFdfWBdO1xuICAgICAgICAgICAgaWYgKCQuaW5BcnJheSh2YWx1ZSwgdmxhbnNBcnJheVtldGhOYW1lXSkgPj0gMFxuICAgICAgICAgICAgICAgICYmIHZsYW5WYWx1ZSA9PT0gdmFsdWVcbiAgICAgICAgICAgICAgICAmJiBwYXJhbSA9PT0gaW5kZXguc3BsaXQoJ18nKVsxXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIShldGhOYW1lIGluIHZsYW5zQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vLyBESENQIHZhbGlkYXRpb24gcnVsZSByZW1vdmVkIC0gREhDUCBjaGVja2JveCBpcyBkaXNhYmxlZCBmb3IgVkxBTiBpbnRlcmZhY2VzLCBubyB2YWxpZGF0aW9uIG5lZWRlZFxuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdGhlIHByZXNlbmNlIG9mIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uIGlzIHByb3ZpZGVkIHdoZW4gTkFUIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuYWxJcEhvc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMudXNlbmF0ID09PSAnb24nKSB7XG4gICAgICAgIC8vIEdldCB1bm1hc2tlZCB2YWx1ZSBmb3IgZXh0aXBhZGRyIChpbnB1dG1hc2sgbWF5IHJldHVybiBcIl8uXy5fLl9cIiBmb3IgZW1wdHkpXG4gICAgICAgIGNvbnN0IGV4dGlwYWRkciA9IG5ldHdvcmtzLiRleHRpcGFkZHIuaW5wdXRtYXNrKCd1bm1hc2tlZHZhbHVlJykgfHwgJyc7XG4gICAgICAgIGNvbnN0IGV4dGhvc3RuYW1lID0gKGFsbFZhbHVlcy5leHRob3N0bmFtZSB8fCAnJykudHJpbSgpO1xuICAgICAgICBpZiAoZXh0aG9zdG5hbWUgPT09ICcnICYmIGV4dGlwYWRkciA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB2YWx1ZSBpcyBhIHZhbGlkIGhvc3RuYW1lXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgaG9zdG5hbWVcbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdmFsaWQgaG9zdG5hbWUsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMudmFsaWRIb3N0bmFtZSA9ICh2YWx1ZSkgPT4ge1xuICAgIGlmICghdmFsdWUgfHwgdmFsdWUgPT09ICcnKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBFbXB0eSBpcyBoYW5kbGVkIGJ5IGV4dGVuYWxJcEhvc3QgcnVsZVxuICAgIH1cblxuICAgIC8vIFJGQyA5NTIvUkZDIDExMjMgaG9zdG5hbWUgdmFsaWRhdGlvblxuICAgIC8vIC0gTGFiZWxzIHNlcGFyYXRlZCBieSBkb3RzXG4gICAgLy8gLSBFYWNoIGxhYmVsIDEtNjMgY2hhcnNcbiAgICAvLyAtIE9ubHkgYWxwaGFudW1lcmljIGFuZCBoeXBoZW5zXG4gICAgLy8gLSBDYW5ub3Qgc3RhcnQvZW5kIHdpdGggaHlwaGVuXG4gICAgLy8gLSBUb3RhbCBsZW5ndGggbWF4IDI1MyBjaGFyc1xuICAgIGNvbnN0IGhvc3RuYW1lUmVnZXggPSAvXig/PS57MSwyNTN9JCkoPyEtKVthLXpBLVowLTktXXsxLDYzfSg/PCEtKShcXC5bYS16QS1aMC05LV17MSw2M30oPzwhLSkpKiQvO1xuICAgIHJldHVybiBob3N0bmFtZVJlZ2V4LnRlc3QodmFsdWUpO1xufTtcblxuXG4vKipcbiAqIFN0YXRpYyBSb3V0ZXMgTWFuYWdlciBNb2R1bGVcbiAqXG4gKiBNYW5hZ2VzIHN0YXRpYyByb3V0ZSBjb25maWd1cmF0aW9uIHdoZW4gbXVsdGlwbGUgbmV0d29yayBpbnRlcmZhY2VzIGV4aXN0XG4gKi9cbmNvbnN0IFN0YXRpY1JvdXRlc01hbmFnZXIgPSB7XG4gICAgJHRhYmxlOiAkKCcjc3RhdGljLXJvdXRlcy10YWJsZScpLFxuICAgICRzZWN0aW9uOiAkKCcjc3RhdGljLXJvdXRlcy1zZWN0aW9uJyksXG4gICAgJGFkZEJ1dHRvbjogJCgnI2FkZC1uZXctcm91dGUnKSxcbiAgICAkdGFibGVDb250YWluZXI6IG51bGwsXG4gICAgJGVtcHR5UGxhY2Vob2xkZXI6IG51bGwsXG4gICAgcm91dGVzOiBbXSxcbiAgICBhdmFpbGFibGVJbnRlcmZhY2VzOiBbXSwgLy8gV2lsbCBiZSBwb3B1bGF0ZWQgZnJvbSBSRVNUIEFQSVxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzdGF0aWMgcm91dGVzIG1hbmFnZW1lbnRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBDYWNoZSBlbGVtZW50c1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyID0gJCgnI3N0YXRpYy1yb3V0ZXMtZW1wdHktcGxhY2Vob2xkZXInKTtcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIgPSAkKCcjc3RhdGljLXJvdXRlcy10YWJsZS1jb250YWluZXInKTtcblxuICAgICAgICAvLyBIaWRlIHNlY3Rpb24gaWYgbGVzcyB0aGFuIDIgaW50ZXJmYWNlc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3BcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcblxuICAgICAgICAvLyBBZGQgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kYWRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBmaXJzdCByb3V0ZSBidXR0b24gaGFuZGxlciAoaW4gZW1wdHkgcGxhY2Vob2xkZXIpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjYWRkLWZpcnN0LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciAoZGVsZWdhdGVkKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3V0ZS1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVFbXB0eVN0YXRlKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvcHkgYnV0dG9uIGhhbmRsZXIgKGRlbGVnYXRlZClcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2NsaWNrJywgJy5jb3B5LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkc291cmNlUm93ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuY29weVJvdXRlKCRzb3VyY2VSb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbnB1dCBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2lucHV0IGNoYW5nZScsICcubmV0d29yay1pbnB1dCwgLmdhdGV3YXktaW5wdXQsIC5kZXNjcmlwdGlvbi1pbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUGFzdGUgaGFuZGxlcnMgZm9yIElQIGFkZHJlc3MgZmllbGRzIChlbmFibGUgY2xpcGJvYXJkIHBhc3RlIHdpdGggaW5wdXRtYXNrKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbigncGFzdGUnLCAnLm5ldHdvcmstaW5wdXQsIC5nYXRld2F5LWlucHV0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBHZXQgcGFzdGVkIGRhdGEgZnJvbSBjbGlwYm9hcmRcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50ICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlLmNsaXBib2FyZERhdGEgJiYgZS5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LmNsaXBib2FyZERhdGEgJiYgd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7IC8vIEZvciBJRVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbGVhbiB0aGUgcGFzdGVkIGRhdGEgKHJlbW92ZSBleHRyYSBzcGFjZXMsIGtlZXAgb25seSB2YWxpZCBJUCBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgY29uc3QgY2xlYW5lZERhdGEgPSBwYXN0ZWREYXRhLnRyaW0oKS5yZXBsYWNlKC9bXjAtOS5dL2csICcnKTtcblxuICAgICAgICAgICAgLy8gR2V0IHRoZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBUZW1wb3JhcmlseSByZW1vdmUgbWFza1xuICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzaygncmVtb3ZlJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCB0aGUgY2xlYW5lZCB2YWx1ZVxuICAgICAgICAgICAgJGlucHV0LnZhbChjbGVhbmVkRGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFJlYXBwbHkgdGhlIG1hc2sgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsIHBsYWNlaG9sZGVyOiAnXyd9KTtcbiAgICAgICAgICAgICAgICAkaW5wdXQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG9yIHJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJhZ0FuZERyb3AoKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgdGFibGVEbkQgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5kYXRhKCd0YWJsZURuRCcpKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS50YWJsZURuRFVwZGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcDogKCkgPT4ge1xuICAgICAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmlzaWJpbGl0eSBvZiBzdGF0aWMgcm91dGVzIHNlY3Rpb24uXG4gICAgICogU2VjdGlvbiBpcyBoaWRkZW4gYnkgZGVmYXVsdCBpbiBWb2x0IHRlbXBsYXRlOyBzaG93IGl0IG9uY2UgSlMgaXMgcmVhZHkuXG4gICAgICogRG9ja2VyIGhpZGluZyBpcyBoYW5kbGVkIHNlcGFyYXRlbHkgdmlhIHRoZSBwYXJlbnQgLmRvLW5vdC1zaG93LWlmLWRvY2tlciB3cmFwcGVyLlxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHkoKSB7XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHNlY3Rpb24uc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3B5IGEgcm91dGUgcm93IChjcmVhdGUgZHVwbGljYXRlKVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkc291cmNlUm93IC0gU291cmNlIHJvdyB0byBjb3B5XG4gICAgICovXG4gICAgY29weVJvdXRlKCRzb3VyY2VSb3cpIHtcbiAgICAgICAgY29uc3Qgcm91dGVJZCA9ICRzb3VyY2VSb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpO1xuICAgICAgICBjb25zdCBzdWJuZXREcm9wZG93bklkID0gYHN1Ym5ldC1yb3V0ZS0ke3JvdXRlSWR9YDtcbiAgICAgICAgY29uc3QgaW50ZXJmYWNlRHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHtyb3V0ZUlkfWA7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBkYXRhIGZyb20gc291cmNlIHJvd1xuICAgICAgICBjb25zdCByb3V0ZURhdGEgPSB7XG4gICAgICAgICAgICBuZXR3b3JrOiAkc291cmNlUm93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICBzdWJuZXQ6ICQoYCMke3N1Ym5ldERyb3Bkb3duSWR9YCkudmFsKCksXG4gICAgICAgICAgICBnYXRld2F5OiAkc291cmNlUm93LmZpbmQoJy5nYXRld2F5LWlucHV0JykudmFsKCksXG4gICAgICAgICAgICBpbnRlcmZhY2U6ICQoYCMke2ludGVyZmFjZURyb3Bkb3duSWR9YCkudmFsKCkgfHwgJycsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJHNvdXJjZVJvdy5maW5kKCcuZGVzY3JpcHRpb24taW5wdXQnKS52YWwoKVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFkZCBuZXcgcm91dGUgd2l0aCBjb3BpZWQgZGF0YVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKHJvdXRlRGF0YSk7XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGRyYWctYW5kLWRyb3AgYWZ0ZXIgYWRkaW5nIHJvdXRlXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZURyYWdBbmREcm9wKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBlbXB0eSBzdGF0ZSB2aXNpYmlsaXR5XG4gICAgICovXG4gICAgdXBkYXRlRW1wdHlTdGF0ZSgpIHtcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nUm93cyA9ICQoJy5yb3V0ZS1yb3cnKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ1Jvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBTaG93IGVtcHR5IHBsYWNlaG9sZGVyLCBoaWRlIHRhYmxlIGNvbnRhaW5lclxuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kZW1wdHlQbGFjZWhvbGRlci5zaG93KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZUNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGVtcHR5IHBsYWNlaG9sZGVyLCBzaG93IHRhYmxlIGNvbnRhaW5lclxuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kZW1wdHlQbGFjZWhvbGRlci5oaWRlKCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZUNvbnRhaW5lci5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByb3V0ZURhdGEgLSBSb3V0ZSBkYXRhIChvcHRpb25hbClcbiAgICAgKi9cbiAgICBhZGRSb3V0ZShyb3V0ZURhdGEgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0ICR0ZW1wbGF0ZSA9ICQoJy5yb3V0ZS1yb3ctdGVtcGxhdGUnKS5sYXN0KCk7XG4gICAgICAgIGNvbnN0ICRuZXdSb3cgPSAkdGVtcGxhdGUuY2xvbmUodHJ1ZSk7XG4gICAgICAgIGNvbnN0IHJvdXRlSWQgPSByb3V0ZURhdGE/LmlkIHx8IGBuZXdfJHtEYXRlLm5vdygpfWA7XG5cbiAgICAgICAgJG5ld1Jvd1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdyb3V0ZS1yb3ctdGVtcGxhdGUnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdyb3V0ZS1yb3cnKVxuICAgICAgICAgICAgLmF0dHIoJ2RhdGEtcm91dGUtaWQnLCByb3V0ZUlkKVxuICAgICAgICAgICAgLnNob3coKTtcblxuICAgICAgICAvLyBTZXQgdmFsdWVzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChyb3V0ZURhdGEpIHtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwocm91dGVEYXRhLm5ldHdvcmspO1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcuZ2F0ZXdheS1pbnB1dCcpLnZhbChyb3V0ZURhdGEuZ2F0ZXdheSk7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5kZXNjcmlwdGlvbi1pbnB1dCcpLnZhbChyb3V0ZURhdGEuZGVzY3JpcHRpb24gfHwgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHRvIHRhYmxlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ1Jvd3MgPSAkKCcucm91dGUtcm93Jyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdSb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJHRlbXBsYXRlLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGV4aXN0aW5nUm93cy5sYXN0KCkuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgdGhpcyByb3dcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplU3VibmV0RHJvcGRvd24oJG5ld1Jvdywgcm91dGVEYXRhPy5zdWJuZXQgfHwgJzI0Jyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnRlcmZhY2UgZHJvcGRvd24gZm9yIHRoaXMgcm93XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZUludGVyZmFjZURyb3Bkb3duKCRuZXdSb3csIHJvdXRlRGF0YT8uaW50ZXJmYWNlIHx8ICcnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGlucHV0bWFzayBmb3IgSVAgYWRkcmVzcyBmaWVsZHNcbiAgICAgICAgJG5ld1Jvdy5maW5kKCcuaXBhZGRyZXNzJykuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgcGxhY2Vob2xkZXI6ICdfJ30pO1xuXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZUVtcHR5U3RhdGUoKTtcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgYSByb3V0ZSByb3dcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHJvdyAtIFJvdyBlbGVtZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdGVkVmFsdWUgLSBTZWxlY3RlZCBzdWJuZXQgdmFsdWVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU3VibmV0RHJvcGRvd24oJHJvdywgc2VsZWN0ZWRWYWx1ZSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJHJvdy5maW5kKCcuc3VibmV0LWRyb3Bkb3duLWNvbnRhaW5lcicpO1xuICAgICAgICBjb25zdCBkcm9wZG93bklkID0gYHN1Ym5ldC1yb3V0ZS0keyRyb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpfWA7XG5cbiAgICAgICAgJGNvbnRhaW5lci5odG1sKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiJHtkcm9wZG93bklkfVwiIC8+YCk7XG5cbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGRyb3Bkb3duSWQsXG4gICAgICAgICAgICB7IFtkcm9wZG93bklkXTogc2VsZWN0ZWRWYWx1ZSB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10sXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGludGVyZmFjZSBkcm9wZG93biBmb3IgYSByb3V0ZSByb3dcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHJvdyAtIFJvdyBlbGVtZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdGVkVmFsdWUgLSBTZWxlY3RlZCBpbnRlcmZhY2UgdmFsdWUgKGVtcHR5IHN0cmluZyA9IGF1dG8pXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUludGVyZmFjZURyb3Bkb3duKCRyb3csIHNlbGVjdGVkVmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRyb3cuZmluZCgnLmludGVyZmFjZS1kcm9wZG93bi1jb250YWluZXInKTtcbiAgICAgICAgY29uc3QgZHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHskcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKX1gO1xuXG4gICAgICAgICRjb250YWluZXIuaHRtbChgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIiR7ZHJvcGRvd25JZH1cIiAvPmApO1xuXG4gICAgICAgIC8vIEJ1aWxkIGRyb3Bkb3duIG9wdGlvbnM6IFwiQXV0b1wiICsgYXZhaWxhYmxlIGludGVyZmFjZXNcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfQXV0byB9LFxuICAgICAgICAgICAgLi4uU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzLm1hcChpZmFjZSA9PiAoe1xuICAgICAgICAgICAgICAgIHZhbHVlOiBpZmFjZS52YWx1ZSxcbiAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5sYWJlbFxuICAgICAgICAgICAgfSkpXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gUHJlcGFyZSBmb3JtIGRhdGEgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7fTtcbiAgICAgICAgZm9ybURhdGFbZHJvcGRvd25JZF0gPSBzZWxlY3RlZFZhbHVlIHx8ICcnOyAvLyBFbnN1cmUgd2UgcGFzcyBlbXB0eSBzdHJpbmcgZm9yIFwiQXV0b1wiXG5cbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGRyb3Bkb3duSWQsXG4gICAgICAgICAgICBmb3JtRGF0YSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBvcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHJvdXRlIHByaW9yaXRpZXMgYmFzZWQgb24gdGFibGUgb3JkZXJcbiAgICAgKi9cbiAgICB1cGRhdGVQcmlvcml0aWVzKCkge1xuICAgICAgICAkKCcucm91dGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtcHJpb3JpdHknLCBpbmRleCArIDEpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCByb3V0ZXMgZnJvbSBkYXRhXG4gICAgICogQHBhcmFtIHtBcnJheX0gcm91dGVzRGF0YSAtIEFycmF5IG9mIHJvdXRlIG9iamVjdHNcbiAgICAgKi9cbiAgICBsb2FkUm91dGVzKHJvdXRlc0RhdGEpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3Rpbmcgcm91dGVzXG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5yZW1vdmUoKTtcblxuICAgICAgICAvLyBBZGQgZWFjaCByb3V0ZVxuICAgICAgICBpZiAocm91dGVzRGF0YSAmJiByb3V0ZXNEYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJvdXRlc0RhdGEuZm9yRWFjaChyb3V0ZSA9PiB7XG4gICAgICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZShyb3V0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgZW1wdHkgc3RhdGUgaWYgbm8gcm91dGVzXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZUVtcHR5U3RhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGFmdGVyIGFkZGluZyByb3V0ZXNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29sbGVjdCByb3V0ZXMgZnJvbSB0YWJsZVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqL1xuICAgIGNvbGxlY3RSb3V0ZXMoKSB7XG4gICAgICAgIGNvbnN0IHJvdXRlcyA9IFtdO1xuICAgICAgICAkKCcucm91dGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQocm93KTtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlSWQgPSAkcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHN1Ym5ldERyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7cm91dGVJZH1gO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlRHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHtyb3V0ZUlkfWA7XG5cbiAgICAgICAgICAgIHJvdXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBpZDogcm91dGVJZC5zdGFydHNXaXRoKCduZXdfJykgPyBudWxsIDogcm91dGVJZCxcbiAgICAgICAgICAgICAgICBuZXR3b3JrOiAkcm93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgc3VibmV0OiAkKGAjJHtzdWJuZXREcm9wZG93bklkfWApLnZhbCgpLFxuICAgICAgICAgICAgICAgIGdhdGV3YXk6ICRyb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBpbnRlcmZhY2U6ICQoYCMke2ludGVyZmFjZURyb3Bkb3duSWR9YCkudmFsKCkgfHwgJycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICRyb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4ICsgMVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcm91dGVzO1xuICAgIH1cbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbmV0d29yayBzZXR0aW5ncyBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBuZXR3b3Jrcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==