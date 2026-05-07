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
  /**
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $getMyIpButton: null,

  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: null,
  $dropDowns: null,
  $extipaddr: null,
  $ipaddressInput: null,
  vlansArray: {},

  /**
   * jQuery object for the elements with we should hide from the form for docker installation.
   * @type {jQuery}
   */
  $notShowOnDockerDivs: null,

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
    networks.$getMyIpButton = $('#getmyip');
    networks.$formObj = $('#network-form');
    networks.$dropDowns = $('#network-form .dropdown');
    networks.$extipaddr = $('#extipaddr');
    networks.$ipaddressInput = $('.ipaddress');
    networks.$notShowOnDockerDivs = $('.do-not-show-if-docker'); // Load configuration via REST API

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
  /**
   * jQuery wrappers — resolved in initialize() to avoid module-load
   * `$ is not defined` (Sentry MIKOPBX-MG9 / issue #1054).
   */
  $table: null,
  $section: null,
  $addButton: null,
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
    StaticRoutesManager.$table = $('#static-routes-table');
    StaticRoutesManager.$section = $('#static-routes-section');
    StaticRoutesManager.$addButton = $('#add-new-route');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkZm9ybU9iaiIsIiRkcm9wRG93bnMiLCIkZXh0aXBhZGRyIiwiJGlwYWRkcmVzc0lucHV0IiwidmxhbnNBcnJheSIsIiRub3RTaG93T25Eb2NrZXJEaXZzIiwidmFsaWRhdGVSdWxlcyIsImV4dGlwYWRkciIsIm9wdGlvbmFsIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibndfVmFsaWRhdGVFeHRJcHBhZGRyTm90UmlnaHQiLCJud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5IiwiZXh0aG9zdG5hbWUiLCJkZXBlbmRzIiwibndfVmFsaWRhdGVIb3N0bmFtZUludmFsaWQiLCJpbml0aWFsaXplIiwiJCIsImxvYWRDb25maWd1cmF0aW9uIiwiY2hlY2tib3giLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImRyb3Bkb3duIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsIlN5c2luZm9BUEkiLCJnZXRFeHRlcm5hbElwSW5mbyIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsIlN0YXRpY1JvdXRlc01hbmFnZXIiLCJmb3JtIiwiaGlkZSIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaXAiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm53X0Vycm9yR2V0dGluZ0V4dGVybmFsSXAiLCJjdXJyZW50RXh0SXBBZGRyIiwicG9ydE1hdGNoIiwibWF0Y2giLCJwb3J0IiwibmV3RXh0SXBBZGRyIiwidHJpZ2dlciIsInVwZGF0ZU5BVEhlbHBUZXh0IiwicG9ydHMiLCJTSVBQb3J0IiwiVExTX1BPUlQiLCJSVFBQb3J0RnJvbSIsIlJUUFBvcnRUbyIsIiRzaXBQb3J0VmFsdWVzIiwibGVuZ3RoIiwic2lwVGV4dCIsImkxOG4iLCJodG1sIiwiJHJ0cFBvcnRWYWx1ZXMiLCJydHBUZXh0IiwiJGR1YWxTdGFja1NpcFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tTaXBUZXh0IiwiJGR1YWxTdGFja1J0cFBvcnRWYWx1ZXMiLCJkdWFsU3RhY2tSdHBUZXh0IiwidXBkYXRlUG9ydExhYmVscyIsIiRzaXBMYWJlbCIsInNpcExhYmVsVGV4dCIsInRleHQiLCIkdGxzTGFiZWwiLCJ0bHNMYWJlbFRleHQiLCIkZHVhbFN0YWNrU2lwTGFiZWwiLCJkdWFsU3RhY2tTaXBMYWJlbFRleHQiLCIkZHVhbFN0YWNrVGxzTGFiZWwiLCJkdWFsU3RhY2tUbHNMYWJlbFRleHQiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJldGgiLCJhdHRyIiwiJGlwdjRNb2RlRHJvcGRvd24iLCJpcHY0TW9kZSIsImlzRGhjcEVuYWJsZWQiLCIkaXBBZGRyZXNzR3JvdXAiLCIkZ2F0ZXdheUZpZWxkIiwiJGRoY3BJbmZvTWVzc2FnZSIsImlzSW50ZXJuZXRJbnRlcmZhY2UiLCJ2YWwiLCJpc0RvY2tlckludGVyZmFjZSIsInNob3ciLCJhZGROZXdGb3JtUnVsZXMiLCJ1cGRhdGVEdWFsU3RhY2tOYXRMb2dpYyIsInRvZ2dsZUlQdjZGaWVsZHMiLCJpbnRlcmZhY2VJZCIsIiRpcHY2TW9kZURyb3Bkb3duIiwiaXB2Nk1vZGUiLCIkbWFudWFsRmllbGRzQ29udGFpbmVyIiwiJGF1dG9JbmZvTWVzc2FnZSIsIiRpcHY2SW50ZXJuZXRTZXR0aW5ncyIsImlzRHVhbFN0YWNrTW9kZSIsImlwdjRhZGRyIiwiJGRoY3BDaGVja2JveCIsImRoY3BFbmFibGVkIiwiZ2F0ZXdheSIsImlwdjZhZGRyTWFudWFsIiwiaXB2NmFkZHJBdXRvIiwiaXB2NmFkZHIiLCJoYXNJcHY0IiwidHJpbSIsImhhc0lwdjYiLCJpcHY2TG93ZXIiLCJ0b0xvd2VyQ2FzZSIsImlwdjZXaXRob3V0Q2lkciIsInNwbGl0IiwiaXNHbG9iYWxVbmljYXN0IiwidGVzdCIsImlzTmF0RW5hYmxlZCIsImFueUR1YWxTdGFjayIsInRhYiIsIiRzdGFuZGFyZE5hdFNlY3Rpb24iLCIkZHVhbFN0YWNrU2VjdGlvbiIsIiRleHRob3N0bmFtZUlucHV0IiwiJHN0YW5kYXJkSG9zdG5hbWVXcmFwcGVyIiwiZmluZCIsImhhcyIsImZpcnN0IiwiJGR1YWxTdGFja0hvc3RuYW1lV3JhcHBlciIsIiRleHRlcm5hbFNpcFBvcnRJbnB1dCIsIiRleHRlcm5hbFRsc1BvcnRJbnB1dCIsIiRzdGFuZGFyZFNpcFBvcnRXcmFwcGVyIiwiJHN0YW5kYXJkVGxzUG9ydFdyYXBwZXIiLCIkZHVhbFN0YWNrU2lwUG9ydFdyYXBwZXIiLCIkZHVhbFN0YWNrVGxzUG9ydFdyYXBwZXIiLCJhcHBlbmRUbyIsIiRhdXRvVXBkYXRlQ2hlY2tib3giLCJwYXJlbnQiLCJob3N0bmFtZSIsIm53X1ZhbGlkYXRlRXh0ZXJuYWxIb3N0bmFtZUVtcHR5IiwiZmllbGRzIiwibmV3Um93SWQiLCJuYW1lQ2xhc3MiLCJpZGVudGlmaWVyIiwibndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5IiwidmxhbkNsYXNzIiwibndfVmFsaWRhdGVWbGFuUmFuZ2UiLCJud19WYWxpZGF0ZVZsYW5Dcm9zcyIsImlwYWRkckNsYXNzIiwibndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSIsIm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiT2JqZWN0IiwiYXNzaWduIiwic3RhdGljUm91dGVzIiwiY29sbGVjdFJvdXRlcyIsIiRpbnB1dCIsIm5hbWUiLCJwcm9wIiwidmFsdWUiLCJ1bmRlZmluZWQiLCJTdHJpbmciLCIkc2VsZWN0IiwidXNlbmF0IiwiJGF1dG9VcGRhdGVEaXYiLCJhdXRvVXBkYXRlRXh0ZXJuYWxJcCIsImtleXMiLCJmb3JFYWNoIiwia2V5IiwiaXB2NE1vZGVNYXRjaCIsIm1vZGUiLCIkY2hlY2tlZFJhZGlvIiwiaW50ZXJuZXRfaW50ZXJmYWNlIiwiaXB2Nk1vZGVNYXRjaCIsInN1Ym5ldEtleSIsImdsb2JhbEhvc3RuYW1lIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsInVybCIsImlubGluZSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIk5ldHdvcmtBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsImlzRG9ja2VyIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJzaG93RG9ja2VyTmV0d29ya0luZm8iLCJjb25zb2xlIiwid2FybiIsImNpZHJUb05ldG1hc2siLCJjaWRyIiwibWFzayIsImpvaW4iLCJjcmVhdGVJbnRlcmZhY2VUYWJzIiwiJG1lbnUiLCIkY29udGVudCIsImVtcHR5IiwiaW50ZXJmYWNlcyIsImlmYWNlIiwidGFiSWQiLCJpZCIsInRhYkxhYmVsIiwidmxhbmlkIiwiaXNBY3RpdmUiLCJhcHBlbmQiLCJjYW5EZWxldGUiLCJwYXJzZUludCIsImRlbGV0ZUJ1dHRvbiIsIm53X0RlbGV0ZUN1cnJlbnRJbnRlcmZhY2UiLCJjcmVhdGVJbnRlcmZhY2VGb3JtIiwidGVtcGxhdGUiLCJjcmVhdGVUZW1wbGF0ZUZvcm0iLCJwaHlzaWNhbEludGVyZmFjZXMiLCJ0b1N0cmluZyIsInBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyIsInZhbHVlcyIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwiaW50ZXJmYWNlXzAiLCJzdGF0aWNPcHRpb25zIiwicGxhY2Vob2xkZXIiLCJud19TZWxlY3RJbnRlcmZhY2UiLCJhbGxvd0VtcHR5IiwiaXB2NE1vZGVPcHRpb25zIiwibndfSVB2NE1vZGVNYW51YWwiLCJud19JUHY0TW9kZURIQ1AiLCJpcHY0X21vZGVfMCIsIm53X1NlbGVjdElQdjRNb2RlIiwiZGF0YUNoYW5nZWQiLCJzdWJuZXRfMCIsImdldFN1Ym5ldE9wdGlvbnNBcnJheSIsIm53X1NlbGVjdE5ldHdvcmtNYXNrIiwiYWRkaXRpb25hbENsYXNzZXMiLCJmaWVsZE5hbWUiLCJmb3JtRGF0YSIsInN1Ym5ldCIsImlwdjRNb2RlRmllbGROYW1lIiwiaXB2NE1vZGVGb3JtRGF0YSIsImRoY3AiLCJpcHY2TW9kZUZpZWxkTmFtZSIsImlwdjZNb2RlRm9ybURhdGEiLCJpcHY2X21vZGUiLCJpc1ZsYW4iLCJpcHY2TW9kZU9wdGlvbnMiLCJud19JUHY2TW9kZU9mZiIsIm53X0lQdjZNb2RlTWFudWFsIiwibndfSVB2Nk1vZGVBdXRvIiwibndfU2VsZWN0SVB2Nk1vZGUiLCJpcHY2U3VibmV0RmllbGROYW1lIiwiaXB2NlN1Ym5ldEZvcm1EYXRhIiwiaXB2Nl9zdWJuZXQiLCJnZXRJcHY2U3VibmV0T3B0aW9uc0FycmF5IiwibndfU2VsZWN0SVB2NlN1Ym5ldCIsInVwZGF0ZVZpc2liaWxpdHkiLCJvZmYiLCIkYnV0dG9uIiwicmVtb3ZlIiwiJHRhYkNvbnRlbnQiLCIkZmlyc3RUYWIiLCJlbmFibGVEaXJyaXR5IiwiY2hlY2tWYWx1ZXMiLCIkdmxhbklucHV0IiwicmVwbGFjZSIsInZsYW5WYWx1ZSIsInNlbGVjdGVkSW50ZXJmYWNlSWQiLCIkdGFiIiwicHJlcGVuZCIsIiRkcm9wZG93biIsIm9yaWdpbmFsU2F2ZUluaXRpYWxWYWx1ZXMiLCJzYXZlSW5pdGlhbFZhbHVlcyIsIm9yaWdpbmFsQ2hlY2tWYWx1ZXMiLCJmb21hbnRpY1ZhbHVlcyIsIm1hbnVhbFZhbHVlcyIsIiRmaWVsZCIsImlzIiwib2xkRm9ybVZhbHVlcyIsIm5ld0Zvcm1WYWx1ZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsInNldEV2ZW50cyIsImludGVybmV0IiwiZG5zR2F0ZXdheVZpc2libGUiLCJkaGNwRGlzYWJsZWQiLCJkaGNwQ2hlY2tlZCIsImhvc3RuYW1lUGxhY2Vob2xkZXIiLCJud19QbGFjZWhvbGRlckRoY3BIb3N0bmFtZSIsInByaW1hcnlEbnNQbGFjZWhvbGRlciIsIm53X1BsYWNlaG9sZGVyRGhjcERucyIsImN1cnJlbnRQcmltYXJ5ZG5zIiwicHJpbWFyeWRucyIsInNlY29uZGFyeURuc1BsYWNlaG9sZGVyIiwiY3VycmVudFNlY29uZGFyeWRucyIsInNlY29uZGFyeWRucyIsImlwdjZQcmltYXJ5RG5zUGxhY2Vob2xkZXIiLCJud19QbGFjZWhvbGRlcklQdjZEbnMiLCJpcHY2U2Vjb25kYXJ5RG5zUGxhY2Vob2xkZXIiLCJpcGFkZHIiLCJud19JbnRlcmZhY2VOYW1lIiwibndfSW50ZXJuZXRJbnRlcmZhY2UiLCJud19WbGFuSUQiLCJud19JUHY0Q29uZmlndXJhdGlvbiIsIm53X0lQdjRNb2RlIiwibndfSVBBZGRyZXNzIiwibndfTmV0d29ya01hc2siLCJud19HYXRld2F5IiwibndfSW50ZXJuZXRJUHY0IiwibndfUHJpbWFyeUROUyIsIm53X1NlY29uZGFyeUROUyIsIm53X0RIQ1BJbmZvSGVhZGVyIiwibndfREhDUEluZm9JUCIsImN1cnJlbnRJcGFkZHIiLCJud19ESENQSW5mb1N1Ym5ldCIsImN1cnJlbnRTdWJuZXQiLCJud19ESENQSW5mb0dhdGV3YXkiLCJjdXJyZW50R2F0ZXdheSIsIm53X0RIQ1BJbmZvRE5TIiwiZG9tYWluIiwibndfREhDUEluZm9Eb21haW4iLCJud19Eb2NrZXJJUHY0SW5mbyIsIm53X0RvY2tlcklQdjRJbmZvTm90ZSIsIm53X0lQdjZDb25maWd1cmF0aW9uIiwibndfSVB2Nk1vZGUiLCJjdXJyZW50SXB2NmFkZHIiLCJud19JUHY2QWRkcmVzcyIsIm53X0lQdjZTdWJuZXQiLCJud19JUHY2R2F0ZXdheSIsImlwdjZfZ2F0ZXdheSIsIm53X0ludGVybmV0SVB2NiIsIm53X0lQdjZQcmltYXJ5RE5TIiwiY3VycmVudFByaW1hcnlkbnM2IiwicHJpbWFyeWRuczYiLCJud19JUHY2U2Vjb25kYXJ5RE5TIiwiY3VycmVudFNlY29uZGFyeWRuczYiLCJzZWNvbmRhcnlkbnM2IiwibndfSVB2NkF1dG9JbmZvSGVhZGVyIiwibndfSVB2NkF1dG9JbmZvQWRkcmVzcyIsIm53X0lQdjZBdXRvSW5mb1ByZWZpeCIsImN1cnJlbnRJcHY2X3N1Ym5ldCIsImN1cnJlbnRJcHY2X2dhdGV3YXkiLCJud19JUHY2QXV0b0luZm9HYXRld2F5IiwibndfVXNlREhDUCIsIm9wdGlvbnMiLCJpIiwiZGVzY3JpcHRpb24iLCJwdXNoIiwiZmlyc3RJbnRlcmZhY2UiLCJjdXJyZW50SG9zdG5hbWUiLCJuYXQiLCJBVVRPX1VQREFURV9FWFRFUk5BTF9JUCIsImF2YWlsYWJsZUludGVyZmFjZXMiLCJsb2FkUm91dGVzIiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJmbiIsImYiLCJhIiwiaXB2NlBhdHRlcm4iLCJpcGFkZHJlc3MiLCJpcGFkZHJXaXRoUG9ydE9wdGlvbmFsIiwiY2hlY2tWbGFuIiwicGFyYW0iLCJhbGxWYWx1ZXMiLCJuZXdFdGhOYW1lIiwidmxhbmlkXzAiLCJpbmRleE9mIiwiZXRoTmFtZSIsImluQXJyYXkiLCJleHRlbmFsSXBIb3N0IiwidmFsaWRIb3N0bmFtZSIsImhvc3RuYW1lUmVnZXgiLCIkdGFibGUiLCIkc2VjdGlvbiIsIiRhZGRCdXR0b24iLCIkdGFibGVDb250YWluZXIiLCIkZW1wdHlQbGFjZWhvbGRlciIsInJvdXRlcyIsImluaXRpYWxpemVEcmFnQW5kRHJvcCIsImFkZFJvdXRlIiwiZG9jdW1lbnQiLCJ0YXJnZXQiLCJjbG9zZXN0IiwidXBkYXRlUHJpb3JpdGllcyIsInVwZGF0ZUVtcHR5U3RhdGUiLCIkc291cmNlUm93IiwiY29weVJvdXRlIiwicGFzdGVkRGF0YSIsIm9yaWdpbmFsRXZlbnQiLCJjbGlwYm9hcmREYXRhIiwiZ2V0RGF0YSIsIndpbmRvdyIsImNsZWFuZWREYXRhIiwic2V0VGltZW91dCIsInRhYmxlRG5EVXBkYXRlIiwidGFibGVEbkQiLCJvbkRyb3AiLCJkcmFnSGFuZGxlIiwicm91dGVJZCIsInN1Ym5ldERyb3Bkb3duSWQiLCJpbnRlcmZhY2VEcm9wZG93bklkIiwicm91dGVEYXRhIiwibmV0d29yayIsIiRleGlzdGluZ1Jvd3MiLCIkdGVtcGxhdGUiLCJsYXN0IiwiJG5ld1JvdyIsImNsb25lIiwiRGF0ZSIsIm5vdyIsImFmdGVyIiwiaW5pdGlhbGl6ZVN1Ym5ldERyb3Bkb3duIiwiaW5pdGlhbGl6ZUludGVyZmFjZURyb3Bkb3duIiwiJHJvdyIsInNlbGVjdGVkVmFsdWUiLCIkY29udGFpbmVyIiwiZHJvcGRvd25JZCIsIm53X0F1dG8iLCJtYXAiLCJsYWJlbCIsInJvdyIsInJvdXRlc0RhdGEiLCJyb3V0ZSIsInN0YXJ0c1dpdGgiLCJwcmlvcml0eSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsUUFBUSxHQUFHO0FBQ2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLElBTEg7O0FBT2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLElBWEc7QUFhYkMsRUFBQUEsVUFBVSxFQUFFLElBYkM7QUFjYkMsRUFBQUEsVUFBVSxFQUFFLElBZEM7QUFlYkMsRUFBQUEsZUFBZSxFQUFFLElBZko7QUFnQmJDLEVBQUFBLFVBQVUsRUFBRSxFQWhCQzs7QUFrQmI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsb0JBQW9CLEVBQUUsSUF0QlQ7O0FBd0JiO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLFNBQVMsRUFBRTtBQUNQQyxNQUFBQSxRQUFRLEVBQUUsSUFESDtBQUVQQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsd0JBRFY7QUFFSUMsUUFB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QUFDOUIsSUFBUCxDQUFZO0FBQ1JsSixRQUFBQSxFQUFFLEVBQUVxTSxPQUFPLENBQUN5QixVQUFSLENBQW1CLE1BQW5CLElBQTZCLElBQTdCLEdBQW9DekIsT0FEaEM7QUFFUkksUUFBQUEsT0FBTyxFQUFFVyxJQUFJLENBQUN2UyxJQUFMLENBQVUsZ0JBQVYsRUFBNEJwQyxHQUE1QixFQUZEO0FBR1IwSixRQUFBQSxNQUFNLEVBQUVsTyxDQUFDLFlBQUtxWSxnQkFBTCxFQUFELENBQTBCN1QsR0FBMUIsRUFIQTtBQUlSZ0IsUUFBQUEsT0FBTyxFQUFFMlQsSUFBSSxDQUFDdlMsSUFBTCxDQUFVLGdCQUFWLEVBQTRCcEMsR0FBNUIsRUFKRDtBQUtSLHFCQUFXeEUsQ0FBQyxZQUFLc1ksbUJBQUwsRUFBRCxDQUE2QjlULEdBQTdCLE1BQXNDLEVBTHpDO0FBTVJ3USxRQUFBQSxXQUFXLEVBQUVtRSxJQUFJLENBQUN2UyxJQUFMLENBQVUsb0JBQVYsRUFBZ0NwQyxHQUFoQyxFQU5MO0FBT1JzVixRQUFBQSxRQUFRLEVBQUVqVyxLQUFLLEdBQUc7QUFQVixPQUFaO0FBU0gsS0FmRDtBQWdCQSxXQUFPa1QsTUFBUDtBQUNIO0FBblV1QixDQUE1QjtBQXNVQTtBQUNBO0FBQ0E7O0FBQ0EvVyxDQUFDLENBQUNrWCxRQUFELENBQUQsQ0FBWTZDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnBiLEVBQUFBLFFBQVEsQ0FBQ29CLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBTeXNpbmZvQVBJLCBOZXR3b3JrQVBJLCBVc2VyTWVzc2FnZSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciAqL1xuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgbmV0d29yayBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgbmV0d29ya3NcbiAqL1xuY29uc3QgbmV0d29ya3MgPSB7XG4gICAgLyoqXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGdldE15SXBCdXR0b246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgJGRyb3BEb3duczogbnVsbCxcbiAgICAkZXh0aXBhZGRyOiBudWxsLFxuICAgICRpcGFkZHJlc3NJbnB1dDogbnVsbCxcbiAgICB2bGFuc0FycmF5OiB7fSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbGVtZW50cyB3aXRoIHdlIHNob3VsZCBoaWRlIGZyb20gdGhlIGZvcm0gZm9yIGRvY2tlciBpbnN0YWxsYXRpb24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbm90U2hvd09uRG9ja2VyRGl2czogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBleHRpcGFkZHI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHJXaXRoUG9ydE9wdGlvbmFsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0aG9zdG5hbWU6IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICd1c2VuYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3ZhbGlkSG9zdG5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUhvc3RuYW1lSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG5ldHdvcmsgc2V0dGluZ3MgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbiA9ICQoJyNnZXRteWlwJyk7XG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqID0gJCgnI25ldHdvcmstZm9ybScpO1xuICAgICAgICBuZXR3b3Jrcy4kZHJvcERvd25zID0gJCgnI25ldHdvcmstZm9ybSAuZHJvcGRvd24nKTtcbiAgICAgICAgbmV0d29ya3MuJGV4dGlwYWRkciA9ICQoJyNleHRpcGFkZHInKTtcbiAgICAgICAgbmV0d29ya3MuJGlwYWRkcmVzc0lucHV0ID0gJCgnLmlwYWRkcmVzcycpO1xuICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cyA9ICQoJy5kby1ub3Qtc2hvdy1pZi1kb2NrZXInKTtcblxuICAgICAgICAvLyBMb2FkIGNvbmZpZ3VyYXRpb24gdmlhIFJFU1QgQVBJXG4gICAgICAgIG5ldHdvcmtzLmxvYWRDb25maWd1cmF0aW9uKCk7XG5cbiAgICAgICAgLy8gSGFuZGxlcyB0aGUgY2hhbmdlIGV2ZW50IG9mIHRoZSAndXNlbmF0LWNoZWNrYm94Jy5cbiAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIG5ldHdvcmtzLiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBESENQIGNoZWNrYm94IGhhbmRsZXJzIHdpbGwgYmUgYm91bmQgYWZ0ZXIgdGFicyBhcmUgY3JlYXRlZCBkeW5hbWljYWxseVxuXG4gICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgU3lzaW5mb0FQSS5nZXRFeHRlcm5hbElwSW5mbyhuZXR3b3Jrcy5jYkFmdGVyR2V0RXh0ZXJuYWxJcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciB3aWxsIGJlIGJvdW5kIGFmdGVyIHRhYnMgYXJlIGNyZWF0ZWQgZHluYW1pY2FsbHlcbiAgICAgICAgbmV0d29ya3MuJGlwYWRkcmVzc0lucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIC8vIEFwcGx5IElQIG1hc2sgZm9yIGV4dGVybmFsIElQIGFkZHJlc3MgZmllbGRcbiAgICAgICAgbmV0d29ya3MuJGV4dGlwYWRkci5pbnB1dG1hc2soe2FsaWFzOiAnaXAnLCAncGxhY2Vob2xkZXInOiAnXyd9KTtcblxuICAgICAgICBuZXR3b3Jrcy5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3RhdGljIHJvdXRlcyBtYW5hZ2VyXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZSgpO1xuXG4gICAgICAgIC8vIEhpZGUgc3RhdGljIHJvdXRlcyBzZWN0aW9uIGluIERvY2tlciAobWFuYWdlZCB2aWEgZG8tbm90LXNob3ctaWYtZG9ja2VyIGNsYXNzKVxuICAgICAgICBpZiAobmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywnaXMtZG9ja2VyJyk9PT1cIjFcIikge1xuICAgICAgICAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGdldHRpbmcgdGhlIGV4dGVybmFsIElQIGZyb20gYSByZW1vdGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci4gSWYgZmFsc2UsIGluZGljYXRlcyBhbiBlcnJvciBvY2N1cnJlZC5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0RXh0ZXJuYWxJcChyZXNwb25zZSkge1xuICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCB8fCAhcmVzcG9uc2UuZGF0YSB8fCAhcmVzcG9uc2UuZGF0YS5pcCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5ud19FcnJvckdldHRpbmdFeHRlcm5hbElwKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGN1cnJlbnRFeHRJcEFkZHIgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0aXBhZGRyJyk7XG4gICAgICAgIGNvbnN0IHBvcnRNYXRjaCA9IGN1cnJlbnRFeHRJcEFkZHIubWF0Y2goLzooXFxkKykkLyk7XG4gICAgICAgIGNvbnN0IHBvcnQgPSBwb3J0TWF0Y2ggPyAnOicgKyBwb3J0TWF0Y2hbMV0gOiAnJztcbiAgICAgICAgY29uc3QgbmV3RXh0SXBBZGRyID0gcmVzcG9uc2UuZGF0YS5pcCArIHBvcnQ7XG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRpcGFkZHInLCBuZXdFeHRJcEFkZHIpO1xuICAgICAgICAvLyBDbGVhciBleHRlcm5hbCBob3N0bmFtZSB3aGVuIGdldHRpbmcgZXh0ZXJuYWwgSVBcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGhvc3RuYW1lJywgJycpO1xuICAgICAgICBuZXR3b3Jrcy4kZXh0aXBhZGRyLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgTkFUIGhlbHAgdGV4dCB3aXRoIGFjdHVhbCBwb3J0IHZhbHVlcyBmcm9tIFJFU1QgQVBJXG4gICAgICogVXBkYXRlcyBib3RoIHN0YW5kYXJkIE5BVCBzZWN0aW9uIGFuZCBEdWFsLVN0YWNrIHNlY3Rpb25cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcG9ydHMgLSBQb3J0IGNvbmZpZ3VyYXRpb24gb2JqZWN0IGZyb20gQVBJXG4gICAgICovXG4gICAgdXBkYXRlTkFUSGVscFRleHQocG9ydHMpIHtcbiAgICAgICAgLy8gV0hZOiBQb3J0IGtleXMgbWF0Y2ggUGJ4U2V0dGluZ3MgY29uc3RhbnRzIChTSVBQb3J0LCBUTFNfUE9SVCwgUlRQUG9ydEZyb20sIFJUUFBvcnRUbylcbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgd2UgaGF2ZSBwb3J0IHZhbHVlcyBmcm9tIHNlcnZlclxuICAgICAgICBpZiAoIXBvcnRzLlNJUFBvcnQgfHwgIXBvcnRzLlRMU19QT1JUIHx8ICFwb3J0cy5SVFBQb3J0RnJvbSB8fCAhcG9ydHMuUlRQUG9ydFRvKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgc3RhbmRhcmQgTkFUIHNlY3Rpb24gLSBTSVAgcG9ydHMgaW5mbyB0ZXh0XG4gICAgICAgIGNvbnN0ICRzaXBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXNpcC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRzaXBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcFRleHQgPSBpMThuKCdud19OQVRJbmZvMycsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBQb3J0LFxuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzaXBQb3J0VmFsdWVzLmh0bWwoc2lwVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgc3RhbmRhcmQgTkFUIHNlY3Rpb24gLSBSVFAgcG9ydHMgaW5mbyB0ZXh0XG4gICAgICAgIGNvbnN0ICRydHBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXJ0cC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRydHBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJ0cFRleHQgPSBpMThuKCdud19OQVRJbmZvNCcsIHtcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6IHBvcnRzLlJUUFBvcnRGcm9tLFxuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9UTyc6IHBvcnRzLlJUUFBvcnRUb1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkcnRwUG9ydFZhbHVlcy5odG1sKHJ0cFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIER1YWwtU3RhY2sgc2VjdGlvbiAtIFNJUCBwb3J0cyBpbmZvIHRleHRcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1NpcFBvcnRWYWx1ZXMgPSAkKCcjZHVhbC1zdGFjay1zaXAtcG9ydHMgLnBvcnQtdmFsdWVzJyk7XG4gICAgICAgIGlmICgkZHVhbFN0YWNrU2lwUG9ydFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkdWFsU3RhY2tTaXBUZXh0ID0gaTE4bignbndfTkFUSW5mbzMnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQUG9ydCxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkZHVhbFN0YWNrU2lwUG9ydFZhbHVlcy5odG1sKGR1YWxTdGFja1NpcFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIER1YWwtU3RhY2sgc2VjdGlvbiAtIFJUUCBwb3J0cyBpbmZvIHRleHRcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1J0cFBvcnRWYWx1ZXMgPSAkKCcjZHVhbC1zdGFjay1ydHAtcG9ydHMgLnBvcnQtdmFsdWVzJyk7XG4gICAgICAgIGlmICgkZHVhbFN0YWNrUnRwUG9ydFZhbHVlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkdWFsU3RhY2tSdHBUZXh0ID0gaTE4bignbndfTkFUSW5mbzQnLCB7XG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX0ZST00nOiBwb3J0cy5SVFBQb3J0RnJvbSxcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfVE8nOiBwb3J0cy5SVFBQb3J0VG9cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJGR1YWxTdGFja1J0cFBvcnRWYWx1ZXMuaHRtbChkdWFsU3RhY2tSdHBUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcG9ydCBmaWVsZCBsYWJlbHMgd2l0aCBhY3R1YWwgaW50ZXJuYWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIFVwZGF0ZXMgYm90aCBzdGFuZGFyZCBOQVQgc2VjdGlvbiBhbmQgRHVhbC1TdGFjayBzZWN0aW9uXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBvcnRzIC0gUG9ydCBjb25maWd1cmF0aW9uIG9iamVjdCBmcm9tIEFQSVxuICAgICAqL1xuICAgIHVwZGF0ZVBvcnRMYWJlbHMocG9ydHMpIHtcbiAgICAgICAgLy8gV0hZOiBQb3J0IGtleXMgbWF0Y2ggUGJ4U2V0dGluZ3MgY29uc3RhbnRzIChTSVBQb3J0LCBUTFNfUE9SVClcbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgd2UgaGF2ZSBwb3J0IHZhbHVlcyBmcm9tIHNlcnZlclxuICAgICAgICBpZiAoIXBvcnRzLlNJUFBvcnQgfHwgIXBvcnRzLlRMU19QT1JUKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgc3RhbmRhcmQgTkFUIHNlY3Rpb24gLSBleHRlcm5hbCBTSVAgcG9ydCBsYWJlbFxuICAgICAgICBjb25zdCAkc2lwTGFiZWwgPSAkKCcjZXh0ZXJuYWwtc2lwLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRzaXBMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNTSVBQb3J0Jywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUFBvcnRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNpcExhYmVsLnRleHQoc2lwTGFiZWxUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBzdGFuZGFyZCBOQVQgc2VjdGlvbiAtIGV4dGVybmFsIFRMUyBwb3J0IGxhYmVsXG4gICAgICAgIGNvbnN0ICR0bHNMYWJlbCA9ICQoJyNleHRlcm5hbC10bHMtcG9ydC1sYWJlbCcpO1xuICAgICAgICBpZiAoJHRsc0xhYmVsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHRsc0xhYmVsVGV4dCA9IGkxOG4oJ253X1B1YmxpY1RMU1BvcnQnLCB7XG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogcG9ydHMuVExTX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHRsc0xhYmVsLnRleHQodGxzTGFiZWxUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBEdWFsLVN0YWNrIHNlY3Rpb24gLSBTSVAgcG9ydCBsYWJlbFxuICAgICAgICBjb25zdCAkZHVhbFN0YWNrU2lwTGFiZWwgPSAkKCcjZHVhbC1zdGFjay1zaXAtcG9ydC1sYWJlbCcpO1xuICAgICAgICBpZiAoJGR1YWxTdGFja1NpcExhYmVsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGR1YWxTdGFja1NpcExhYmVsVGV4dCA9IGkxOG4oJ253X1B1YmxpY1NJUFBvcnQnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQUG9ydFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkZHVhbFN0YWNrU2lwTGFiZWwudGV4dChkdWFsU3RhY2tTaXBMYWJlbFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIER1YWwtU3RhY2sgc2VjdGlvbiAtIFRMUyBwb3J0IGxhYmVsXG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tUbHNMYWJlbCA9ICQoJyNkdWFsLXN0YWNrLXRscy1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkZHVhbFN0YWNrVGxzTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZHVhbFN0YWNrVGxzTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljVExTUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkZHVhbFN0YWNrVGxzTGFiZWwudGV4dChkdWFsU3RhY2tUbHNMYWJlbFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdmlzaWJpbGl0eSBvZiBJUCBhZGRyZXNzIGZpZWxkcyBiYXNlZCBvbiBJUHY0IG1vZGUgZHJvcGRvd24gc3RhdGUuXG4gICAgICovXG4gICAgdG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgZXRoID0gJChvYmopLmF0dHIoJ2RhdGEtdGFiJyk7XG4gICAgICAgICAgICBjb25zdCAkaXB2NE1vZGVEcm9wZG93biA9ICQoYCNpcHY0X21vZGVfJHtldGh9LWRyb3Bkb3duYCk7XG5cbiAgICAgICAgICAgIC8vIEluIERvY2tlciBtb2RlLCB0aGUgSVB2NCBtb2RlIGRyb3Bkb3duIGlzIG5vdCByZW5kZXJlZC5cbiAgICAgICAgICAgIC8vIERlZmF1bHQgdG8gREhDUCBlbmFibGVkIHNvIElQIHZhbGlkYXRpb24gaXMgc2tpcHBlZCAoRG9ja2VyIG1hbmFnZXMgbmV0d29ya2luZykuXG4gICAgICAgICAgICBjb25zdCBpcHY0TW9kZSA9ICRpcHY0TW9kZURyb3Bkb3duLmxlbmd0aCA+IDAgPyAkaXB2NE1vZGVEcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJykgOiAnMSc7XG4gICAgICAgICAgICBjb25zdCBpc0RoY3BFbmFibGVkID0gaXB2NE1vZGUgPT09ICcxJztcblxuICAgICAgICAgICAgLy8gRmluZCBJUCBhZGRyZXNzIGFuZCBzdWJuZXQgZmllbGRzIGdyb3VwXG4gICAgICAgICAgICBjb25zdCAkaXBBZGRyZXNzR3JvdXAgPSAkKGAjaXAtYWRkcmVzcy1ncm91cC0ke2V0aH1gKTtcbiAgICAgICAgICAgIGNvbnN0ICRnYXRld2F5RmllbGQgPSAkKGAuaXB2NC1nYXRld2F5LWZpZWxkLSR7ZXRofWApO1xuICAgICAgICAgICAgY29uc3QgJGRoY3BJbmZvTWVzc2FnZSA9ICQoYC5kaGNwLWluZm8tbWVzc2FnZS0ke2V0aH1gKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyB0aGUgaW50ZXJuZXQgaW50ZXJmYWNlXG4gICAgICAgICAgICBjb25zdCBpc0ludGVybmV0SW50ZXJmYWNlID0gJChgaW5wdXRbbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiXTpjaGVja2VkYCkudmFsKCkgPT09IGV0aDtcblxuICAgICAgICAgICAgLy8gSW4gRG9ja2VyIG1vZGUsIHRoZSBkZWRpY2F0ZWQgRG9ja2VyIGluZm8gbWVzc2FnZSBpcyBzaG93biBpbnN0ZWFkIG9mIERIQ1AgaW5mb1xuICAgICAgICAgICAgY29uc3QgaXNEb2NrZXJJbnRlcmZhY2UgPSAkaXB2NE1vZGVEcm9wZG93bi5sZW5ndGggPT09IDA7XG5cbiAgICAgICAgICAgIGlmIChpc0RoY3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gREhDUCBlbmFibGVkIC0+IGhpZGUgSVAvc3VibmV0IGZpZWxkcyBncm91cCBhbmQgZ2F0ZXdheSBmaWVsZCwgc2hvdyBESENQIGluZm9cbiAgICAgICAgICAgICAgICAkaXBBZGRyZXNzR3JvdXAuaGlkZSgpO1xuICAgICAgICAgICAgICAgICRnYXRld2F5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGlmICghaXNEb2NrZXJJbnRlcmZhY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgJGRoY3BJbmZvTWVzc2FnZS5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBESENQIGRpc2FibGVkIC0+IHNob3cgSVAvc3VibmV0IGZpZWxkcyBncm91cCwgaGlkZSBESENQIGluZm9cbiAgICAgICAgICAgICAgICAkaXBBZGRyZXNzR3JvdXAuc2hvdygpO1xuICAgICAgICAgICAgICAgICRkaGNwSW5mb01lc3NhZ2UuaGlkZSgpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJzEnKTtcblxuICAgICAgICAgICAgICAgIC8vIFNob3cgZ2F0ZXdheSBmaWVsZCBPTkxZIGlmIHRoaXMgaXMgdGhlIGludGVybmV0IGludGVyZmFjZVxuICAgICAgICAgICAgICAgIGlmIChpc0ludGVybmV0SW50ZXJmYWNlKSB7XG4gICAgICAgICAgICAgICAgICAgICRnYXRld2F5RmllbGQuc2hvdygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRnYXRld2F5RmllbGQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmV0d29ya3MuYWRkTmV3Rm9ybVJ1bGVzKGV0aCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhpZGUvc2hvdyBOQVQgc2VjdGlvbnMgaW5zdGVhZCBvZiBkaXNhYmxpbmcgdG8gc2ltcGxpZnkgVUlcbiAgICAgICAgaWYgKCQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5zaG93KCk7XG4gICAgICAgICAgICAvLyBBZnRlciBzaG93aW5nIGFsbCBzZWN0aW9ucywgZGV0ZXJtaW5lIHdoaWNoIG9uZSB0byBhY3R1YWxseSBkaXNwbGF5XG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSB2aXNpYmlsaXR5IG9mIElQdjYgbWFudWFsIGNvbmZpZ3VyYXRpb24gZmllbGRzIGJhc2VkIG9uIHNlbGVjdGVkIG1vZGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gaW50ZXJmYWNlSWQgLSBJbnRlcmZhY2UgSURcbiAgICAgKi9cbiAgICB0b2dnbGVJUHY2RmllbGRzKGludGVyZmFjZUlkKSB7XG4gICAgICAgIGNvbnN0ICRpcHY2TW9kZURyb3Bkb3duID0gJChgI2lwdjZfbW9kZV8ke2ludGVyZmFjZUlkfWApO1xuICAgICAgICBjb25zdCBpcHY2TW9kZSA9ICRpcHY2TW9kZURyb3Bkb3duLnZhbCgpO1xuICAgICAgICBjb25zdCAkbWFudWFsRmllbGRzQ29udGFpbmVyID0gJChgLmlwdjYtbWFudWFsLWZpZWxkcy0ke2ludGVyZmFjZUlkfWApO1xuICAgICAgICBjb25zdCAkYXV0b0luZm9NZXNzYWdlID0gJChgLmlwdjYtYXV0by1pbmZvLW1lc3NhZ2UtJHtpbnRlcmZhY2VJZH1gKTtcbiAgICAgICAgY29uc3QgJGlwdjZJbnRlcm5ldFNldHRpbmdzID0gJChgLmlwdjYtaW50ZXJuZXQtc2V0dGluZ3MtJHtpbnRlcmZhY2VJZH1gKTtcblxuICAgICAgICAvLyBTaG93IG1hbnVhbCBmaWVsZHMgb25seSB3aGVuIG1vZGUgaXMgJzInIChNYW51YWwpXG4gICAgICAgIGlmIChpcHY2TW9kZSA9PT0gJzInKSB7XG4gICAgICAgICAgICAkbWFudWFsRmllbGRzQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgICAgICRhdXRvSW5mb01lc3NhZ2UuaGlkZSgpO1xuICAgICAgICAgICAgJGlwdjZJbnRlcm5ldFNldHRpbmdzLnNob3coKTtcbiAgICAgICAgfSBlbHNlIGlmIChpcHY2TW9kZSA9PT0gJzEnKSB7XG4gICAgICAgICAgICAvLyBTaG93IEF1dG8gKFNMQUFDL0RIQ1B2NikgaW5mbyBtZXNzYWdlIHdoZW4gbW9kZSBpcyAnMScgKEF1dG8pXG4gICAgICAgICAgICAkbWFudWFsRmllbGRzQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgICRhdXRvSW5mb01lc3NhZ2Uuc2hvdygpO1xuICAgICAgICAgICAgJGlwdjZJbnRlcm5ldFNldHRpbmdzLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgYWxsIElQdjYgZmllbGRzIGZvciBtb2RlICcwJyAoT2ZmKVxuICAgICAgICAgICAgJG1hbnVhbEZpZWxkc0NvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICAkYXV0b0luZm9NZXNzYWdlLmhpZGUoKTtcbiAgICAgICAgICAgICRpcHY2SW50ZXJuZXRTZXR0aW5ncy5oaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZHVhbC1zdGFjayBOQVQgbG9naWMgd2hlbiBJUHY2IG1vZGUgY2hhbmdlc1xuICAgICAgICBuZXR3b3Jrcy51cGRhdGVEdWFsU3RhY2tOYXRMb2dpYygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBkdWFsLXN0YWNrIG1vZGUgaXMgYWN0aXZlIChJUHY0ICsgSVB2NiBwdWJsaWMgYWRkcmVzcyBib3RoIGNvbmZpZ3VyZWQpXG4gICAgICogRHVhbC1zdGFjayBOQVQgc2VjdGlvbiBpcyBzaG93biB3aGVuIGJvdGggSVB2NCBhbmQgcHVibGljIElQdjYgYXJlIHByZXNlbnQuXG4gICAgICogUHVibGljIElQdjYgPSBHbG9iYWwgVW5pY2FzdCBhZGRyZXNzZXMgKDIwMDA6Oi8zKSB0aGF0IHN0YXJ0IHdpdGggMiBvciAzLlxuICAgICAqIFByaXZhdGUgSVB2NiBhZGRyZXNzZXMgKFVMQSBmZDAwOjovOCwgbGluay1sb2NhbCBmZTgwOjovMTApIGRvIE5PVCB0cmlnZ2VyIGR1YWwtc3RhY2suXG4gICAgICpcbiAgICAgKiBJUHY0IGRldGVjdGlvbiB3b3JrcyBmb3IgYm90aCBzdGF0aWMgYW5kIERIQ1AgY29uZmlndXJhdGlvbnM6XG4gICAgICogLSBTdGF0aWM6IGNoZWNrcyBpcGFkZHJfWCBmaWVsZFxuICAgICAqIC0gREhDUDogY2hlY2tzIGlmIERIQ1AgaXMgZW5hYmxlZCBBTkQgZ2F0ZXdheSBpcyBvYnRhaW5lZFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGludGVyZmFjZUlkIC0gSW50ZXJmYWNlIElEXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgZHVhbC1zdGFjayB3aXRoIHB1YmxpYyBJUHY2LCBmYWxzZSBvdGhlcndpc2VcbiAgICAgKi9cbiAgICBpc0R1YWxTdGFja01vZGUoaW50ZXJmYWNlSWQpIHtcbiAgICAgICAgLy8gR2V0IElQdjQgY29uZmlndXJhdGlvbiAoc3RhdGljIG9yIERIQ1ApXG4gICAgICAgIGNvbnN0IGlwdjRhZGRyID0gJChgaW5wdXRbbmFtZT1cImlwYWRkcl8ke2ludGVyZmFjZUlkfVwiXWApLnZhbCgpO1xuICAgICAgICBjb25zdCAkZGhjcENoZWNrYm94ID0gJChgI2RoY3AtJHtpbnRlcmZhY2VJZH0tY2hlY2tib3hgKTtcbiAgICAgICAgY29uc3QgZGhjcEVuYWJsZWQgPSAkZGhjcENoZWNrYm94Lmxlbmd0aCA+IDAgJiYgJGRoY3BDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICBjb25zdCBnYXRld2F5ID0gJChgaW5wdXRbbmFtZT1cImdhdGV3YXlfJHtpbnRlcmZhY2VJZH1cIl1gKS52YWwoKTtcblxuICAgICAgICAvLyBHZXQgSVB2NiBjb25maWd1cmF0aW9uXG4gICAgICAgIGNvbnN0IGlwdjZNb2RlID0gJChgI2lwdjZfbW9kZV8ke2ludGVyZmFjZUlkfWApLnZhbCgpO1xuICAgICAgICAvLyBGb3IgTWFudWFsIG1vZGUgdXNlIGZvcm0gZmllbGQsIGZvciBBdXRvIG1vZGUgdXNlIGN1cnJlbnQgKGF1dG9jb25maWd1cmVkKSB2YWx1ZSBmcm9tIGhpZGRlbiBmaWVsZFxuICAgICAgICBjb25zdCBpcHY2YWRkck1hbnVhbCA9ICQoYGlucHV0W25hbWU9XCJpcHY2YWRkcl8ke2ludGVyZmFjZUlkfVwiXWApLnZhbCgpO1xuICAgICAgICBjb25zdCBpcHY2YWRkckF1dG8gPSAkKGAjY3VycmVudC1pcHY2YWRkci0ke2ludGVyZmFjZUlkfWApLnZhbCgpO1xuICAgICAgICBjb25zdCBpcHY2YWRkciA9IGlwdjZNb2RlID09PSAnMScgPyBpcHY2YWRkckF1dG8gOiBpcHY2YWRkck1hbnVhbDtcblxuICAgICAgICAvLyBDaGVjayBpZiBJUHY0IGlzIHByZXNlbnQgKGVpdGhlciBzdGF0aWMgYWRkcmVzcyBvciBESENQIHdpdGggZ2F0ZXdheSlcbiAgICAgICAgLy8gR2F0ZXdheSBwcmVzZW5jZSBpbmRpY2F0ZXMgREhDUCBzdWNjZXNzZnVsbHkgb2J0YWluZWQgYW4gSVB2NCBhZGRyZXNzXG4gICAgICAgIGNvbnN0IGhhc0lwdjQgPSAoaXB2NGFkZHIgJiYgaXB2NGFkZHIudHJpbSgpICE9PSAnJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIChkaGNwRW5hYmxlZCAmJiBnYXRld2F5ICYmIGdhdGV3YXkudHJpbSgpICE9PSAnJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgSVB2NiBpcyBlbmFibGVkIChBdXRvIFNMQUFDL0RIQ1B2NiBvciBNYW51YWwpXG4gICAgICAgIC8vIEZvciBBdXRvIG1vZGUgKCcxJyksIHdlIGNoZWNrIGN1cnJlbnRJcHY2YWRkciB3aGljaCBzaG93cyBhdXRvY29uZmlndXJlZCBhZGRyZXNzXG4gICAgICAgIGNvbnN0IGhhc0lwdjYgPSAoaXB2Nk1vZGUgPT09ICcxJyB8fCBpcHY2TW9kZSA9PT0gJzInKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgaXB2NmFkZHIgJiYgaXB2NmFkZHIudHJpbSgpICE9PSAnJyAmJiBpcHY2YWRkciAhPT0gJ0F1dG9jb25maWd1cmVkJztcblxuICAgICAgICBpZiAoIWhhc0lwdjQgfHwgIWhhc0lwdjYpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIElQdjYgYWRkcmVzcyBpcyBnbG9iYWwgdW5pY2FzdCAocHVibGljKVxuICAgICAgICAvLyBHbG9iYWwgdW5pY2FzdDogMjAwMDo6LzMgKGFkZHJlc3NlcyBzdGFydGluZyB3aXRoIDIgb3IgMylcbiAgICAgICAgLy8gRXhjbHVkZSBVTEEgKGZkMDA6Oi84KSBhbmQgbGluay1sb2NhbCAoZmU4MDo6LzEwKVxuICAgICAgICBjb25zdCBpcHY2TG93ZXIgPSBpcHY2YWRkci50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcblxuICAgICAgICAvLyBSZW1vdmUgQ0lEUiBub3RhdGlvbiBpZiBwcmVzZW50IChlLmcuLCBcIjIwMDE6ZGI4OjoxLzY0XCIgLT4gXCIyMDAxOmRiODo6MVwiKVxuICAgICAgICBjb25zdCBpcHY2V2l0aG91dENpZHIgPSBpcHY2TG93ZXIuc3BsaXQoJy8nKVswXTtcblxuICAgICAgICAvLyBDaGVjayBpZiBmaXJzdCBjaGFyYWN0ZXIgaXMgMiBvciAzIChnbG9iYWwgdW5pY2FzdCByYW5nZSlcbiAgICAgICAgY29uc3QgaXNHbG9iYWxVbmljYXN0ID0gL15bMjNdLy50ZXN0KGlwdjZXaXRob3V0Q2lkcik7XG5cbiAgICAgICAgcmV0dXJuIGlzR2xvYmFsVW5pY2FzdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE5BVCBzZWN0aW9uIFVJIGJhc2VkIG9uIGR1YWwtc3RhY2sgZGV0ZWN0aW9uXG4gICAgICogU3dpdGNoZXMgYmV0d2VlbiBzdGFuZGFyZCBOQVQgc2VjdGlvbiBhbmQgRHVhbC1TdGFjayBzZWN0aW9uXG4gICAgICogTWFrZXMgZXh0aG9zdG5hbWUgcmVxdWlyZWQgaW4gZHVhbC1zdGFjayBtb2RlXG4gICAgICovXG4gICAgdXBkYXRlRHVhbFN0YWNrTmF0TG9naWMoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIE5BVCBpcyBlbmFibGVkIC0gaWYgbm90LCBkb24ndCBzaG93IGFueSBOQVQgc2VjdGlvbnNcbiAgICAgICAgY29uc3QgaXNOYXRFbmFibGVkID0gJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIGlmICghaXNOYXRFbmFibGVkKSB7XG4gICAgICAgICAgICByZXR1cm47IC8vIE5BVCBkaXNhYmxlZCwgc2VjdGlvbnMgYWxyZWFkeSBoaWRkZW4gYnkgdG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzXG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBhbnkgaW50ZXJmYWNlIGlzIGluIGR1YWwtc3RhY2sgbW9kZVxuICAgICAgICBsZXQgYW55RHVhbFN0YWNrID0gZmFsc2U7XG5cbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCB0YWIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJCh0YWIpLmF0dHIoJ2RhdGEtdGFiJyk7XG4gICAgICAgICAgICBpZiAobmV0d29ya3MuaXNEdWFsU3RhY2tNb2RlKGludGVyZmFjZUlkKSkge1xuICAgICAgICAgICAgICAgIGFueUR1YWxTdGFjayA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyBCcmVhayBsb29wXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0ICRzdGFuZGFyZE5hdFNlY3Rpb24gPSAkKCcjc3RhbmRhcmQtbmF0LXNlY3Rpb24nKTtcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1NlY3Rpb24gPSAkKCcjZHVhbC1zdGFjay1zZWN0aW9uJyk7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBleHRob3N0bmFtZSBpbnB1dCBlbGVtZW50IGFuZCBpdHMgb3JpZ2luYWwgcGFyZW50XG4gICAgICAgIGNvbnN0ICRleHRob3N0bmFtZUlucHV0ID0gJCgnI2V4dGhvc3RuYW1lJyk7XG4gICAgICAgIGNvbnN0ICRzdGFuZGFyZEhvc3RuYW1lV3JhcHBlciA9ICRzdGFuZGFyZE5hdFNlY3Rpb24uZmluZCgnLm1heC13aWR0aC01MDAnKS5oYXMoJyNleHRob3N0bmFtZScpLmZpcnN0KCk7XG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tIb3N0bmFtZVdyYXBwZXIgPSAkKCcjZXh0aG9zdG5hbWUtZHVhbC1zdGFjay1pbnB1dC13cmFwcGVyJyk7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBwb3J0IGlucHV0IGVsZW1lbnRzIGFuZCB0aGVpciB3cmFwcGVyc1xuICAgICAgICBjb25zdCAkZXh0ZXJuYWxTaXBQb3J0SW5wdXQgPSAkKCdpbnB1dFtuYW1lPVwiZXh0ZXJuYWxTSVBQb3J0XCJdJyk7XG4gICAgICAgIGNvbnN0ICRleHRlcm5hbFRsc1BvcnRJbnB1dCA9ICQoJ2lucHV0W25hbWU9XCJleHRlcm5hbFRMU1BvcnRcIl0nKTtcbiAgICAgICAgY29uc3QgJHN0YW5kYXJkU2lwUG9ydFdyYXBwZXIgPSAkKCcjZXh0ZXJuYWwtc2lwLXBvcnQtc3RhbmRhcmQtd3JhcHBlcicpO1xuICAgICAgICBjb25zdCAkc3RhbmRhcmRUbHNQb3J0V3JhcHBlciA9ICQoJyNleHRlcm5hbC10bHMtcG9ydC1zdGFuZGFyZC13cmFwcGVyJyk7XG4gICAgICAgIGNvbnN0ICRkdWFsU3RhY2tTaXBQb3J0V3JhcHBlciA9ICQoJyNleHRlcm5hbC1zaXAtcG9ydC1kdWFsLXN0YWNrLXdyYXBwZXInKTtcbiAgICAgICAgY29uc3QgJGR1YWxTdGFja1Rsc1BvcnRXcmFwcGVyID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWR1YWwtc3RhY2std3JhcHBlcicpO1xuXG4gICAgICAgIGlmIChhbnlEdWFsU3RhY2spIHtcbiAgICAgICAgICAgIC8vIER1YWwtc3RhY2sgZGV0ZWN0ZWQ6IEhpZGUgc3RhbmRhcmQgTkFUIHNlY3Rpb24sIHNob3cgRHVhbC1TdGFjayBzZWN0aW9uXG4gICAgICAgICAgICAkc3RhbmRhcmROYXRTZWN0aW9uLmhpZGUoKTtcbiAgICAgICAgICAgICRkdWFsU3RhY2tTZWN0aW9uLnNob3coKTtcblxuICAgICAgICAgICAgLy8gTW92ZSBleHRob3N0bmFtZSBpbnB1dCB0byBkdWFsLXN0YWNrIHNlY3Rpb24gKGF2b2lkIGR1cGxpY2F0ZSBpbnB1dHMpXG4gICAgICAgICAgICBpZiAoJGV4dGhvc3RuYW1lSW5wdXQubGVuZ3RoID4gMCAmJiAkZHVhbFN0YWNrSG9zdG5hbWVXcmFwcGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZXh0aG9zdG5hbWVJbnB1dC5hcHBlbmRUbygkZHVhbFN0YWNrSG9zdG5hbWVXcmFwcGVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTW92ZSBwb3J0IGlucHV0cyB0byBkdWFsLXN0YWNrIHNlY3Rpb24gKGF2b2lkIGR1cGxpY2F0ZSBpbnB1dHMpXG4gICAgICAgICAgICBpZiAoJGV4dGVybmFsU2lwUG9ydElucHV0Lmxlbmd0aCA+IDAgJiYgJGR1YWxTdGFja1NpcFBvcnRXcmFwcGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAkZXh0ZXJuYWxTaXBQb3J0SW5wdXQuYXBwZW5kVG8oJGR1YWxTdGFja1NpcFBvcnRXcmFwcGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICgkZXh0ZXJuYWxUbHNQb3J0SW5wdXQubGVuZ3RoID4gMCAmJiAkZHVhbFN0YWNrVGxzUG9ydFdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRlcm5hbFRsc1BvcnRJbnB1dC5hcHBlbmRUbygkZHVhbFN0YWNrVGxzUG9ydFdyYXBwZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbGVhciBleHRpcGFkZHIgKGV4dGVybmFsIElQIG5vdCBuZWVkZWQgaW4gZHVhbC1zdGFjaywgb25seSBob3N0bmFtZSlcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRpcGFkZHInLCAnJyk7XG5cbiAgICAgICAgICAgIC8vIERpc2FibGUgYXV0b1VwZGF0ZUV4dGVybmFsSXAgKG5vdCBuZWVkZWQgaW4gZHVhbC1zdGFjaylcbiAgICAgICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlQ2hlY2tib3ggPSBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFtuYW1lPVwiYXV0b1VwZGF0ZUV4dGVybmFsSXBcIl0nKS5wYXJlbnQoJy5jaGVja2JveCcpO1xuICAgICAgICAgICAgaWYgKCRhdXRvVXBkYXRlQ2hlY2tib3gubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGhvc3RuYW1lIGRpc3BsYXkgaW4gZHVhbC1zdGFjayBpbmZvIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0IGhvc3RuYW1lID0gJGV4dGhvc3RuYW1lSW5wdXQudmFsKCkgfHwgJ21pa29wYnguY29tcGFueS5jb20nO1xuICAgICAgICAgICAgJCgnI2hvc3RuYW1lLWRpc3BsYXknKS50ZXh0KGhvc3RuYW1lKTtcblxuICAgICAgICAgICAgLy8gTWFrZSBleHRob3N0bmFtZSByZXF1aXJlZCBpbiBkdWFsLXN0YWNrXG4gICAgICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzLmV4dGhvc3RuYW1lLnJ1bGVzID0gW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRlcm5hbEhvc3RuYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd2YWxpZEhvc3RuYW1lJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVIb3N0bmFtZUludmFsaWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBObyBkdWFsLXN0YWNrOiBTaG93IHN0YW5kYXJkIE5BVCBzZWN0aW9uLCBoaWRlIER1YWwtU3RhY2sgc2VjdGlvblxuICAgICAgICAgICAgJHN0YW5kYXJkTmF0U2VjdGlvbi5zaG93KCk7XG4gICAgICAgICAgICAkZHVhbFN0YWNrU2VjdGlvbi5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIE1vdmUgZXh0aG9zdG5hbWUgaW5wdXQgYmFjayB0byBzdGFuZGFyZCBzZWN0aW9uXG4gICAgICAgICAgICBpZiAoJGV4dGhvc3RuYW1lSW5wdXQubGVuZ3RoID4gMCAmJiAkc3RhbmRhcmRIb3N0bmFtZVdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRob3N0bmFtZUlucHV0LmFwcGVuZFRvKCRzdGFuZGFyZEhvc3RuYW1lV3JhcHBlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1vdmUgcG9ydCBpbnB1dHMgYmFjayB0byBzdGFuZGFyZCBzZWN0aW9uXG4gICAgICAgICAgICBpZiAoJGV4dGVybmFsU2lwUG9ydElucHV0Lmxlbmd0aCA+IDAgJiYgJHN0YW5kYXJkU2lwUG9ydFdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRlcm5hbFNpcFBvcnRJbnB1dC5hcHBlbmRUbygkc3RhbmRhcmRTaXBQb3J0V3JhcHBlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoJGV4dGVybmFsVGxzUG9ydElucHV0Lmxlbmd0aCA+IDAgJiYgJHN0YW5kYXJkVGxzUG9ydFdyYXBwZXIubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICRleHRlcm5hbFRsc1BvcnRJbnB1dC5hcHBlbmRUbygkc3RhbmRhcmRUbHNQb3J0V3JhcHBlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgZXh0aG9zdG5hbWUgdmFsaWRhdGlvbiAob3B0aW9uYWwgd2l0aCB1c2VuYXQgZGVwZW5kZW5jeSlcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXMuZXh0aG9zdG5hbWUuZGVwZW5kcyA9ICd1c2VuYXQnO1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlcy5leHRob3N0bmFtZS5ydWxlcyA9IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3ZhbGlkSG9zdG5hbWUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUhvc3RuYW1lSW52YWxpZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb25cbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZGVzdHJveScpLmZvcm0oe1xuICAgICAgICAgICAgb246ICdibHVyJyxcbiAgICAgICAgICAgIGZpZWxkczogbmV0d29ya3MudmFsaWRhdGVSdWxlc1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBuZXcgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciBhIHNwZWNpZmljIHJvdyBpbiB0aGUgbmV0d29yayBjb25maWd1cmF0aW9uIGZvcm0uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld1Jvd0lkIC0gVGhlIElEIG9mIHRoZSBuZXcgcm93IHRvIGFkZCB0aGUgZm9ybSBydWxlcyBmb3IuXG4gICAgICovXG4gICAgYWRkTmV3Rm9ybVJ1bGVzKG5ld1Jvd0lkKSB7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICduYW1lJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCBuYW1lQ2xhc3MgPSBgbmFtZV8ke25ld1Jvd0lkfWA7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAnbmFtZScgZmllbGRcbiAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tuYW1lQ2xhc3NdID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogbmFtZUNsYXNzLFxuICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IHZsYW5DbGFzcyA9IGB2bGFuaWRfJHtuZXdSb3dJZH1gO1xuXG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAndmxhbmlkJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW3ZsYW5DbGFzc10gPSB7XG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IHZsYW5DbGFzcyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclswLi40MDk1XScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlVmxhblJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBgY2hlY2tWbGFuWyR7bmV3Um93SWR9XWAsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlVmxhbkNyb3NzLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBjbGFzcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IGlwYWRkckNsYXNzID0gYGlwYWRkcl8ke25ld1Jvd0lkfWA7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSAnaXBhZGRyJyBmaWVsZFxuICAgICAgICAvLyBGb3IgdGVtcGxhdGUgaW50ZXJmYWNlIChpZD0wKSwgYWRkIGRlcGVuZGVuY3kgb24gaW50ZXJmYWNlIHNlbGVjdGlvblxuICAgICAgICBpZiAobmV3Um93SWQgPT09IDAgfHwgbmV3Um93SWQgPT09ICcwJykge1xuICAgICAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsICAvLyBUZW1wbGF0ZTogdmFsaWRhdGUgb25seSBpZiBpbnRlcmZhY2UgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbaXBhZGRyQ2xhc3NdID0ge1xuICAgICAgICAgICAgICAgIGlkZW50aWZpZXI6IGlwYWRkckNsYXNzLFxuICAgICAgICAgICAgICAgIGRlcGVuZHM6IGBub3RkaGNwXyR7bmV3Um93SWR9YCwgIC8vIFJlYWwgaW50ZXJmYWNlOiB2YWxpZGF0ZSBvbmx5IGlmIERIQ1AgaXMgT0ZGXG4gICAgICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHksXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBESENQIHZhbGlkYXRpb24gcmVtb3ZlZCAtIERIQ1AgY2hlY2tib3ggaXMgZGlzYWJsZWQgZm9yIFZMQU4gaW50ZXJmYWNlc1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgbmV3IG9iamVjdCB3aXRoIGFsbCBzZXR0aW5ncyBwcm9wZXJ0aWVzXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IE9iamVjdC5hc3NpZ24oe30sIHNldHRpbmdzKTtcbiAgICAgICAgcmVzdWx0LmRhdGEgPSB7fTtcblxuICAgICAgICAvLyBDb2xsZWN0IHN0YXRpYyByb3V0ZXNcbiAgICAgICAgcmVzdWx0LmRhdGEuc3RhdGljUm91dGVzID0gU3RhdGljUm91dGVzTWFuYWdlci5jb2xsZWN0Um91dGVzKCk7XG5cbiAgICAgICAgLy8gTWFudWFsbHkgY29sbGVjdCBmb3JtIHZhbHVlcyB0byBhdm9pZCBhbnkgRE9NLXJlbGF0ZWQgaXNzdWVzXG4gICAgICAgIC8vIENvbGxlY3QgYWxsIHJlZ3VsYXIgaW5wdXQgZmllbGRzIChza2lwIHJlYWRvbmx5IGZpZWxkcyB0byBwcmV2ZW50IG92ZXJ3cml0aW5nIERIQ1AtcHJvdmlkZWQgdmFsdWVzKVxuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFt0eXBlPVwidGV4dFwiXSwgaW5wdXRbdHlwZT1cImhpZGRlblwiXSwgaW5wdXRbdHlwZT1cIm51bWJlclwiXSwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkaW5wdXQuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgLy8gU2tpcCByZWFkb25seSBmaWVsZHMgLSB0aGV5IGNvbnRhaW4gY3VycmVudCBESENQL0F1dG8gdmFsdWVzIGFuZCBzaG91bGQgbm90IGJlIHNhdmVkXG4gICAgICAgICAgICBpZiAobmFtZSAmJiAhJGlucHV0LnByb3AoJ3JlYWRvbmx5JykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRpbnB1dC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBnZXQgc3RyaW5nIHZhbHVlc1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW25hbWVdID0gKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IHNlbGVjdCBkcm9wZG93bnNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnc2VsZWN0JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWxlY3QgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRzZWxlY3QuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRzZWxlY3QudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhblxuICAgICAgICAvLyBQYnhBcGlDbGllbnQgd2lsbCBoYW5kbGUgY29udmVyc2lvbiB0byBzdHJpbmdzIGZvciBqUXVlcnlcbiAgICAgICAgcmVzdWx0LmRhdGEudXNlbmF0ID0gJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgLy8gVXNlIGNvcnJlY3QgZmllbGQgbmFtZSBmcm9tIHRoZSBmb3JtIChhdXRvVXBkYXRlRXh0ZXJuYWxJcCwgbm90IEFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQKVxuICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZURpdiA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgIGlmICgkYXV0b1VwZGF0ZURpdi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9ICRhdXRvVXBkYXRlRGl2LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29udmVydCBJUHY0IG1vZGUgZHJvcGRvd24gdmFsdWVzIHRvIERIQ1AgYm9vbGVhbiBmb3IgUkVTVCBBUEkgY29tcGF0aWJpbGl0eVxuICAgICAgICAvLyBXSFk6IFVJIHVzZXMgZHJvcGRvd24gd2l0aCB2YWx1ZXMgMD1NYW51YWwsIDE9REhDUCBidXQgUkVTVCBBUEkgZXhwZWN0cyBkaGNwXyR7aWR9IGJvb2xlYW5cbiAgICAgICAgT2JqZWN0LmtleXMocmVzdWx0LmRhdGEpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlTWF0Y2ggPSBrZXkubWF0Y2goL15pcHY0X21vZGVfKFxcZCspJC8pO1xuICAgICAgICAgICAgaWYgKGlwdjRNb2RlTWF0Y2gpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9IGlwdjRNb2RlTWF0Y2hbMV07XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IHJlc3VsdC5kYXRhW2tleV07XG5cbiAgICAgICAgICAgICAgICAvLyBDb252ZXJ0IGRyb3Bkb3duIHZhbHVlIHRvIGJvb2xlYW46ICcxJyA9IERIQ1AgZW5hYmxlZCwgJzAnID0gTWFudWFsIChESENQIGRpc2FibGVkKVxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2BkaGNwXyR7aW50ZXJmYWNlSWR9YF0gPSBtb2RlID09PSAnMSc7XG5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgaXB2NF9tb2RlXyR7aWR9IGtleSBhcyBpdCdzIG5vdCBuZWVkZWQgYnkgUkVTVCBBUElcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBpbnRlcm5ldCByYWRpbyBidXR0b25cbiAgICAgICAgY29uc3QgJGNoZWNrZWRSYWRpbyA9ICQoJ2lucHV0W25hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIl06Y2hlY2tlZCcpO1xuICAgICAgICBpZiAoJGNoZWNrZWRSYWRpby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pbnRlcm5ldF9pbnRlcmZhY2UgPSBTdHJpbmcoJGNoZWNrZWRSYWRpby52YWwoKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXSFk6IE5vIHBvcnQgZmllbGQgbWFwcGluZyBuZWVkZWQgLSBmb3JtIGZpZWxkIG5hbWVzIG1hdGNoIEFQSSBjb25zdGFudHNcbiAgICAgICAgLy8gKGV4dGVybmFsU0lQUG9ydCA9IFBieFNldHRpbmdzOjpFWFRFUk5BTF9TSVBfUE9SVClcblxuICAgICAgICAvLyBTZXQgZGVmYXVsdCBJUHY2IHN1Ym5ldCBmb3IgQXV0byBtb2RlIChTTEFBQy9ESENQdjYpXG4gICAgICAgIE9iamVjdC5rZXlzKHJlc3VsdC5kYXRhKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpcHY2TW9kZU1hdGNoID0ga2V5Lm1hdGNoKC9eaXB2Nl9tb2RlXyhcXGQrKSQvKTtcbiAgICAgICAgICAgIGlmIChpcHY2TW9kZU1hdGNoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSBpcHY2TW9kZU1hdGNoWzFdO1xuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXN1bHQuZGF0YVtrZXldO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN1Ym5ldEtleSA9IGBpcHY2X3N1Ym5ldF8ke2ludGVyZmFjZUlkfWA7XG5cbiAgICAgICAgICAgICAgICAvLyBJZiBtb2RlIGlzIEF1dG8gKCcxJykgYW5kIHN1Ym5ldCBpcyBlbXB0eSwgc2V0IGRlZmF1bHQgdG8gJzY0J1xuICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnMScgJiYgKCFyZXN1bHQuZGF0YVtzdWJuZXRLZXldIHx8IHJlc3VsdC5kYXRhW3N1Ym5ldEtleV0gPT09ICcnKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtzdWJuZXRLZXldID0gJzY0JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFN5bmNocm9uaXplIGdsb2JhbCBob3N0bmFtZSB0byBhbGwgaW50ZXJmYWNlc1xuICAgICAgICAvLyBXSFk6IFNpbmdsZSBob3N0bmFtZSBmaWVsZCBmb3IgYWxsIGludGVyZmFjZXMsIGJ1dCBSRVNUIEFQSSBleHBlY3RzIGhvc3RuYW1lXyR7aWR9IGZvciBlYWNoIGludGVyZmFjZVxuICAgICAgICBjb25zdCBnbG9iYWxIb3N0bmFtZSA9ICQoJyNnbG9iYWwtaG9zdG5hbWUnKS52YWwoKSB8fCAnJztcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCB0YWIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGludGVyZmFjZUlkID0gJCh0YWIpLmF0dHIoJ2RhdGEtdGFiJyk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YVtgaG9zdG5hbWVfJHtpbnRlcmZhY2VJZH1gXSA9IGdsb2JhbEhvc3RuYW1lO1xuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gUmVzcG9uc2UgaGFuZGxlZCBieSBGb3JtXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG5ldHdvcmtzLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gbmV0d29ya3MuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG5ldHdvcmtzLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5saW5lID0gdHJ1ZTsgLy8gU2hvdyBpbmxpbmUgZXJyb3JzIG5leHQgdG8gZmllbGRzXG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gTmV0d29ya0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVDb25maWcnO1xuXG4gICAgICAgIC8vIEltcG9ydGFudCBzZXR0aW5ncyBmb3IgY29ycmVjdCBzYXZlIG1vZGVzIG9wZXJhdGlvblxuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfW5ldHdvcmsvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9tb2RpZnkvYDtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZENvbmZpZ3VyYXRpb24oKSB7XG4gICAgICAgIE5ldHdvcmtBUEkuZ2V0Q29uZmlnKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBhZnRlciBsb2FkaW5nIGRhdGFcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZm9ybSBlbGVtZW50cyBjb25uZWN0ZWQgd2l0aCBub24gZG9ja2VyIGluc3RhbGxhdGlvbnNcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5pc0RvY2tlcikge1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnaXMtZG9ja2VyJywgJzEnKTtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgRG9ja2VyIG5ldHdvcmsgaW5mbyBhcyByZWFkLW9ubHlcbiAgICAgKiBERVBSRUNBVEVEOiBEb2NrZXIgbm93IHVzZXMgc2FtZSBpbnRlcmZhY2UgdGFicyBhcyByZWd1bGFyIGluc3RhbGxhdGlvblxuICAgICAqL1xuICAgIHNob3dEb2NrZXJOZXR3b3JrSW5mbyhkYXRhKSB7XG4gICAgICAgIC8vIFRoaXMgZnVuY3Rpb24gaXMgbm8gbG9uZ2VyIHVzZWQgLSBEb2NrZXIgdXNlcyBjcmVhdGVJbnRlcmZhY2VUYWJzIGluc3RlYWRcbiAgICAgICAgY29uc29sZS53YXJuKCdzaG93RG9ja2VyTmV0d29ya0luZm8gaXMgZGVwcmVjYXRlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0IENJRFIgbm90YXRpb24gdG8gZG90dGVkIGRlY2ltYWwgbmV0bWFza1xuICAgICAqL1xuICAgIGNpZHJUb05ldG1hc2soY2lkcikge1xuICAgICAgICBjb25zdCBtYXNrID0gfigyICoqICgzMiAtIGNpZHIpIC0gMSk7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAobWFzayA+Pj4gMjQpICYgMjU1LFxuICAgICAgICAgICAgKG1hc2sgPj4+IDE2KSAmIDI1NSxcbiAgICAgICAgICAgIChtYXNrID4+PiA4KSAmIDI1NSxcbiAgICAgICAgICAgIG1hc2sgJiAyNTVcbiAgICAgICAgXS5qb2luKCcuJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBpbnRlcmZhY2UgdGFicyBhbmQgZm9ybXMgZHluYW1pY2FsbHkgZnJvbSBSRVNUIEFQSSBkYXRhXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGRhdGEgLSBJbnRlcmZhY2UgZGF0YSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNEb2NrZXIgLSBXaGV0aGVyIHJ1bm5pbmcgaW4gRG9ja2VyIGVudmlyb25tZW50XG4gICAgICovXG4gICAgY3JlYXRlSW50ZXJmYWNlVGFicyhkYXRhLCBpc0RvY2tlciA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUnKTtcbiAgICAgICAgY29uc3QgJGNvbnRlbnQgPSAkKCcjZXRoLWludGVyZmFjZXMtY29udGVudCcpO1xuXG4gICAgICAgIC8vIENsZWFyIGV4aXN0aW5nIGNvbnRlbnRcbiAgICAgICAgJG1lbnUuZW1wdHkoKTtcbiAgICAgICAgJGNvbnRlbnQuZW1wdHkoKTtcblxuICAgICAgICAvLyBDcmVhdGUgdGFicyBmb3IgZXhpc3RpbmcgaW50ZXJmYWNlc1xuICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaCgoaWZhY2UsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0YWJJZCA9IGlmYWNlLmlkO1xuICAgICAgICAgICAgY29uc3QgdGFiTGFiZWwgPSBgJHtpZmFjZS5uYW1lIHx8IGlmYWNlLmludGVyZmFjZX0gKCR7aWZhY2UuaW50ZXJmYWNlfSR7aWZhY2UudmxhbmlkICE9PSAnMCcgJiYgaWZhY2UudmxhbmlkICE9PSAwID8gYC4ke2lmYWNlLnZsYW5pZH1gIDogJyd9KWA7XG4gICAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IGluZGV4ID09PSAwO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIG1lbnUgaXRlbVxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cIml0ZW0gJHtpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJyd9XCIgZGF0YS10YWI9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICAke3RhYkxhYmVsfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIGApO1xuXG4gICAgICAgICAgICAvLyBDcmVhdGUgdGFiIGNvbnRlbnRcbiAgICAgICAgICAgIC8vIE9ubHkgVkxBTiBpbnRlcmZhY2VzIGNhbiBiZSBkZWxldGVkICh2bGFuaWQgPiAwKVxuICAgICAgICAgICAgLy8gSW4gRG9ja2VyLCBkaXNhYmxlIGRlbGV0ZSBmb3IgYWxsIGludGVyZmFjZXNcbiAgICAgICAgICAgIGNvbnN0IGNhbkRlbGV0ZSA9ICFpc0RvY2tlciAmJiBwYXJzZUludChpZmFjZS52bGFuaWQsIDEwKSA+IDA7XG4gICAgICAgICAgICBjb25zdCBkZWxldGVCdXR0b24gPSBjYW5EZWxldGUgPyBgXG4gICAgICAgICAgICAgICAgPGEgY2xhc3M9XCJ1aSBpY29uIGxlZnQgbGFiZWxlZCBidXR0b24gZGVsZXRlLWludGVyZmFjZVwiIGRhdGEtdmFsdWU9XCIke3RhYklkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2hcIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubndfRGVsZXRlQ3VycmVudEludGVyZmFjZX1cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICBgIDogJyc7XG5cbiAgICAgICAgICAgICRjb250ZW50LmFwcGVuZChuZXR3b3Jrcy5jcmVhdGVJbnRlcmZhY2VGb3JtKGlmYWNlLCBpc0FjdGl2ZSwgZGVsZXRlQnV0dG9uLCBpc0RvY2tlcikpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgdGVtcGxhdGUgdGFiIGZvciBuZXcgVkxBTiAobm90IGZvciBEb2NrZXIpXG4gICAgICAgIGlmIChkYXRhLnRlbXBsYXRlICYmICFpc0RvY2tlcikge1xuICAgICAgICAgICAgY29uc3QgdGVtcGxhdGUgPSBkYXRhLnRlbXBsYXRlO1xuICAgICAgICAgICAgdGVtcGxhdGUuaWQgPSAwO1xuXG4gICAgICAgICAgICAvLyBBZGQgXCIrXCIgdGFiIG1lbnUgaXRlbVxuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKGBcbiAgICAgICAgICAgICAgICA8YSBjbGFzcz1cIml0ZW1cIiBkYXRhLXRhYj1cIjBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHBsdXNcIj48L2k+XG4gICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgYCk7XG5cbiAgICAgICAgICAgIC8vIENyZWF0ZSB0ZW1wbGF0ZSBmb3JtIHdpdGggaW50ZXJmYWNlIHNlbGVjdG9yXG4gICAgICAgICAgICAkY29udGVudC5hcHBlbmQobmV0d29ya3MuY3JlYXRlVGVtcGxhdGVGb3JtKHRlbXBsYXRlLCBkYXRhLmludGVyZmFjZXMpKTtcblxuICAgICAgICAgICAgLy8gQnVpbGQgaW50ZXJmYWNlIHNlbGVjdG9yIGRyb3Bkb3duIGZvciB0ZW1wbGF0ZVxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VzID0ge307XG4gICAgICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaChpZmFjZSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFwaHlzaWNhbEludGVyZmFjZXNbaWZhY2UuaW50ZXJmYWNlXSkge1xuICAgICAgICAgICAgICAgICAgICBwaHlzaWNhbEludGVyZmFjZXNbaWZhY2UuaW50ZXJmYWNlXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpZmFjZS5pZC50b1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGV4dDogaWZhY2UuaW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogaWZhY2UuaW50ZXJmYWNlXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGNvbnN0IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyA9IE9iamVjdC52YWx1ZXMocGh5c2ljYWxJbnRlcmZhY2VzKTtcblxuICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdpbnRlcmZhY2VfMCcsIHsgaW50ZXJmYWNlXzA6ICcnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMsXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogdHJ1ZVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgSVB2NCBtb2RlIGRyb3Bkb3duIGZvciB0ZW1wbGF0ZSAoSUQ9MClcbiAgICAgICAgICAgIGNvbnN0IGlwdjRNb2RlT3B0aW9ucyA9IFtcbiAgICAgICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjRNb2RlTWFudWFsfSxcbiAgICAgICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjRNb2RlREhDUH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignaXB2NF9tb2RlXzAnLCB7IGlwdjRfbW9kZV8wOiAnMScgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IGlwdjRNb2RlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdElQdjRNb2RlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3duIGZvciB0ZW1wbGF0ZSAoSUQ9MClcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignc3VibmV0XzAnLCB7IHN1Ym5ldF8wOiAnMjQnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgc3VibmV0IGRyb3Bkb3ducyB1c2luZyBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKChpZmFjZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gYHN1Ym5ldF8ke2lmYWNlLmlkfWA7XG4gICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHt9O1xuICAgICAgICAgICAgLy8gQ29udmVydCBzdWJuZXQgdG8gc3RyaW5nIGZvciBkcm9wZG93biBtYXRjaGluZ1xuICAgICAgICAgICAgZm9ybURhdGFbZmllbGROYW1lXSA9IFN0cmluZyhpZmFjZS5zdWJuZXQgfHwgJzI0Jyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihmaWVsZE5hbWUsIGZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogbmV0d29ya3MuZ2V0U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3ROZXR3b3JrTWFzayxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhZGRpdGlvbmFsQ2xhc3NlczogWydzZWFyY2gnXSAgLy8gQWRkIHNlYXJjaCBjbGFzcyBmb3Igc2VhcmNoYWJsZSBkcm9wZG93blxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgSVB2NCBtb2RlIGRyb3Bkb3duIChNYW51YWwvREhDUCkgZm9yIG5vbi1Eb2NrZXIgZW52aXJvbm1lbnRzXG4gICAgICAgICAgICBpZiAoIWlmYWNlLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXB2NE1vZGVGaWVsZE5hbWUgPSBgaXB2NF9tb2RlXyR7aWZhY2UuaWR9YDtcbiAgICAgICAgICAgICAgICBjb25zdCBpcHY0TW9kZUZvcm1EYXRhID0ge307XG4gICAgICAgICAgICAgICAgLy8gV0hZOiBpZmFjZS5kaGNwIGNhbiBiZSBib29sZWFuIChmcm9tIFJFU1QgQVBJKSBvciBzdHJpbmcgKGZyb20gZm9ybSlcbiAgICAgICAgICAgICAgICBpcHY0TW9kZUZvcm1EYXRhW2lwdjRNb2RlRmllbGROYW1lXSA9IChpZmFjZS5kaGNwID09PSAnMScgfHwgaWZhY2UuZGhjcCA9PT0gdHJ1ZSkgPyAnMScgOiAnMCc7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBpcHY0TW9kZU9wdGlvbnMgPSBbXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzAnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2NE1vZGVNYW51YWx9LFxuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcxJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjRNb2RlREhDUH1cbiAgICAgICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGlwdjRNb2RlRmllbGROYW1lLCBpcHY0TW9kZUZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IGlwdjRNb2RlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJUHY0TW9kZSxcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIElQdjYgbW9kZSBkcm9wZG93biAoT2ZmL0F1dG8vTWFudWFsKVxuICAgICAgICAgICAgLy8gRm9yIFZMQU4gaW50ZXJmYWNlczogb25seSBPZmYgYW5kIE1hbnVhbCBtb2RlcyAobm8gREhDUHY2IEF1dG8pXG4gICAgICAgICAgICBjb25zdCBpcHY2TW9kZUZpZWxkTmFtZSA9IGBpcHY2X21vZGVfJHtpZmFjZS5pZH1gO1xuICAgICAgICAgICAgY29uc3QgaXB2Nk1vZGVGb3JtRGF0YSA9IHt9O1xuICAgICAgICAgICAgaXB2Nk1vZGVGb3JtRGF0YVtpcHY2TW9kZUZpZWxkTmFtZV0gPSBTdHJpbmcoaWZhY2UuaXB2Nl9tb2RlIHx8ICcwJyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGlzVmxhbiA9IGlmYWNlLnZsYW5pZCAmJiBwYXJzZUludChpZmFjZS52bGFuaWQsIDEwKSA+IDA7XG4gICAgICAgICAgICBjb25zdCBpcHY2TW9kZU9wdGlvbnMgPSBpc1ZsYW5cbiAgICAgICAgICAgICAgICA/IFtcbiAgICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnMCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19JUHY2TW9kZU9mZn0sXG4gICAgICAgICAgICAgICAgICAgIHt2YWx1ZTogJzInLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfSVB2Nk1vZGVNYW51YWx9XG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgICAgIDogW1xuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcwJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlT2ZmfSxcbiAgICAgICAgICAgICAgICAgICAge3ZhbHVlOiAnMScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19JUHY2TW9kZUF1dG99LFxuICAgICAgICAgICAgICAgICAgICB7dmFsdWU6ICcyJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLm53X0lQdjZNb2RlTWFudWFsfVxuICAgICAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihpcHY2TW9kZUZpZWxkTmFtZSwgaXB2Nk1vZGVGb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IGlwdjZNb2RlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdElQdjZNb2RlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZUlQdjZGaWVsZHMoaWZhY2UuaWQpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgSVB2NiBzdWJuZXQgZHJvcGRvd25cbiAgICAgICAgICAgIGNvbnN0IGlwdjZTdWJuZXRGaWVsZE5hbWUgPSBgaXB2Nl9zdWJuZXRfJHtpZmFjZS5pZH1gO1xuICAgICAgICAgICAgY29uc3QgaXB2NlN1Ym5ldEZvcm1EYXRhID0ge307XG4gICAgICAgICAgICBpcHY2U3VibmV0Rm9ybURhdGFbaXB2NlN1Ym5ldEZpZWxkTmFtZV0gPSBTdHJpbmcoaWZhY2UuaXB2Nl9zdWJuZXQgfHwgJzY0Jyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihpcHY2U3VibmV0RmllbGROYW1lLCBpcHY2U3VibmV0Rm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRJcHY2U3VibmV0T3B0aW9uc0FycmF5KCksXG4gICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJUHY2U3VibmV0LFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gU2V0IGluaXRpYWwgdmlzaWJpbGl0eSBvZiBJUHY2IG1hbnVhbCBmaWVsZHNcbiAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZUlQdjZGaWVsZHMoaWZhY2UuaWQpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgdGVtcGxhdGUgKGlkID0gMClcbiAgICAgICAgaWYgKGRhdGEudGVtcGxhdGUpIHtcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignc3VibmV0XzAnLCB7IHN1Ym5ldF8wOiAnMjQnIH0sIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBuZXR3b3Jrcy5nZXRTdWJuZXRPcHRpb25zQXJyYXkoKSxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdE5ldHdvcmtNYXNrLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxDbGFzc2VzOiBbJ3NlYXJjaCddICAvLyBBZGQgc2VhcmNoIGNsYXNzIGZvciBzZWFyY2hhYmxlIGRyb3Bkb3duXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLnRhYigpO1xuICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLmZpcnN0KCkudHJpZ2dlcignY2xpY2snKTtcblxuICAgICAgICAvLyBVcGRhdGUgc3RhdGljIHJvdXRlcyBzZWN0aW9uIHZpc2liaWxpdHlcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVWaXNpYmlsaXR5KCk7XG5cbiAgICAgICAgLy8gUmUtYmluZCBkZWxldGUgYnV0dG9uIGhhbmRsZXJzXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gcmVtb3ZlcyBUQUIgZnJvbSBmb3JtIGFuZCBtYXJrcyBpbnRlcmZhY2UgYXMgZGlzYWJsZWRcbiAgICAgICAgLy8gQWN0dWFsIGRlbGV0aW9uIGhhcHBlbnMgb24gZm9ybSBzdWJtaXRcbiAgICAgICAgJCgnLmRlbGV0ZS1pbnRlcmZhY2UnKS5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIFRBQiBtZW51IGl0ZW1cbiAgICAgICAgICAgICQoYCNldGgtaW50ZXJmYWNlcy1tZW51IGFbZGF0YS10YWI9XCIke2ludGVyZmFjZUlkfVwiXWApLnJlbW92ZSgpO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgdGhlIFRBQiBjb250ZW50XG4gICAgICAgICAgICBjb25zdCAkdGFiQ29udGVudCA9ICQoYCNldGgtaW50ZXJmYWNlcy1jb250ZW50IC50YWJbZGF0YS10YWI9XCIke2ludGVyZmFjZUlkfVwiXWApO1xuICAgICAgICAgICAgJHRhYkNvbnRlbnQucmVtb3ZlKCk7XG5cbiAgICAgICAgICAgIC8vIEFkZCBoaWRkZW4gZmllbGQgdG8gbWFyayB0aGlzIGludGVyZmFjZSBhcyBkaXNhYmxlZFxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouYXBwZW5kKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJkaXNhYmxlZF8ke2ludGVyZmFjZUlkfVwiIHZhbHVlPVwiMVwiIC8+YCk7XG5cbiAgICAgICAgICAgIC8vIFN3aXRjaCB0byBmaXJzdCBhdmFpbGFibGUgdGFiXG4gICAgICAgICAgICBjb25zdCAkZmlyc3RUYWIgPSAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhLml0ZW0nKS5maXJzdCgpO1xuICAgICAgICAgICAgaWYgKCRmaXJzdFRhYi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgJGZpcnN0VGFiLnRhYignY2hhbmdlIHRhYicsICRmaXJzdFRhYi5hdHRyKCdkYXRhLXRhYicpKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgdG8gZW5hYmxlIHN1Ym1pdCBidXR0b25cbiAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmNoZWNrVmFsdWVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIElQdjQgbW9kZSBkcm9wZG93bnMgbm93IGluaXRpYWxpemVkIHZpYSBEeW5hbWljRHJvcGRvd25CdWlsZGVyIGluIGZvckVhY2ggbG9vcCAobGluZSB+ODQwKVxuXG4gICAgICAgIC8vIFJlLWJpbmQgSVAgYWRkcmVzcyBpbnB1dCBtYXNrc1xuICAgICAgICAkKCcuaXBhZGRyZXNzJykuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgLy8gQWRkIFZMQU4gSUQgY2hhbmdlIGhhbmRsZXJzIHRvIGNvbnRyb2wgREhDUCBjaGVja2JveCBzdGF0ZVxuICAgICAgICAkKCdpbnB1dFtuYW1lXj1cInZsYW5pZF9cIl0nKS5vZmYoJ2lucHV0IGNoYW5nZScpLm9uKCdpbnB1dCBjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICR2bGFuSW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkdmxhbklucHV0LmF0dHIoJ25hbWUnKS5yZXBsYWNlKCd2bGFuaWRfJywgJycpO1xuICAgICAgICAgICAgY29uc3QgdmxhblZhbHVlID0gcGFyc2VJbnQoJHZsYW5JbnB1dC52YWwoKSwgMTApIHx8IDA7XG4gICAgICAgICAgICBjb25zdCAkZGhjcENoZWNrYm94ID0gJChgI2RoY3AtJHtpbnRlcmZhY2VJZH0tY2hlY2tib3hgKTtcblxuICAgICAgICAgICAgaWYgKHZsYW5WYWx1ZSA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBEaXNhYmxlIERIQ1AgY2hlY2tib3ggZm9yIFZMQU4gaW50ZXJmYWNlc1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guY2hlY2tib3goJ3NldCBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3guZmluZCgnaW5wdXQnKS5wcm9wKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFbmFibGUgREhDUCBjaGVja2JveCBmb3Igbm9uLVZMQU4gaW50ZXJmYWNlc1xuICAgICAgICAgICAgICAgICRkaGNwQ2hlY2tib3gucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGRoY3BDaGVja2JveC5jaGVja2JveCgnc2V0IGVuYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkZGhjcENoZWNrYm94LmZpbmQoJ2lucHV0JykucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBVcGRhdGUgZGlzYWJsZWQgZmllbGQgY2xhc3Nlc1xuICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgdGhlIGhhbmRsZXIgZm9yIGV4aXN0aW5nIFZMQU4gaW50ZXJmYWNlcyB0byBhcHBseSBpbml0aWFsIHN0YXRlXG4gICAgICAgICQoJ2lucHV0W25hbWVePVwidmxhbmlkX1wiXScpLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG4gICAgICAgIC8vIEFkZCBJUHY2IGFkZHJlc3MgY2hhbmdlIGhhbmRsZXJzIHRvIHVwZGF0ZSBkdWFsLXN0YWNrIE5BVCBsb2dpY1xuICAgICAgICAkKCdpbnB1dFtuYW1lXj1cImlwdjZhZGRyX1wiXScpLm9mZignaW5wdXQgYmx1cicpLm9uKCdpbnB1dCBibHVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZHVhbC1zdGFjayBOQVQgbG9naWMgd2hlbiBJUHY2IGFkZHJlc3MgY2hhbmdlc1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlRHVhbFN0YWNrTmF0TG9naWMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIElQdjQgYWRkcmVzcyBjaGFuZ2UgaGFuZGxlcnMgdG8gdXBkYXRlIGR1YWwtc3RhY2sgTkFUIGxvZ2ljXG4gICAgICAgICQoJ2lucHV0W25hbWVePVwiaXBhZGRyX1wiXScpLm9mZignaW5wdXQgYmx1cicpLm9uKCdpbnB1dCBibHVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBVcGRhdGUgZHVhbC1zdGFjayBOQVQgbG9naWMgd2hlbiBJUHY0IGFkZHJlc3MgY2hhbmdlc1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlRHVhbFN0YWNrTmF0TG9naWMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnRlcm5ldCByYWRpbyBidXR0b25zIHdpdGggRm9tYW50aWMgVUlcbiAgICAgICAgJCgnLmludGVybmV0LXJhZGlvJykuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBBZGQgaW50ZXJuZXQgcmFkaW8gYnV0dG9uIGNoYW5nZSBoYW5kbGVyXG4gICAgICAgICQoJ2lucHV0W25hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIl0nKS5vZmYoJ2NoYW5nZScpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkSW50ZXJmYWNlSWQgPSAkKHRoaXMpLnZhbCgpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIGFsbCBETlMvR2F0ZXdheSBncm91cHNcbiAgICAgICAgICAgICQoJ1tjbGFzc149XCJkbnMtZ2F0ZXdheS1ncm91cC1cIl0nKS5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgRE5TL0dhdGV3YXkgZ3JvdXAgZm9yIHNlbGVjdGVkIGludGVybmV0IGludGVyZmFjZVxuICAgICAgICAgICAgJChgLmRucy1nYXRld2F5LWdyb3VwLSR7c2VsZWN0ZWRJbnRlcmZhY2VJZH1gKS5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBUQUIgaWNvbnMgLSBhZGQgZ2xvYmUgaWNvbiB0byBzZWxlY3RlZCwgcmVtb3ZlIGZyb20gb3RoZXJzXG4gICAgICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhJykuZWFjaCgoaW5kZXgsIHRhYikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0YWIgPSAkKHRhYik7XG4gICAgICAgICAgICAgICAgY29uc3QgdGFiSWQgPSAkdGFiLmF0dHIoJ2RhdGEtdGFiJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZXhpc3RpbmcgZ2xvYmUgaWNvblxuICAgICAgICAgICAgICAgICR0YWIuZmluZCgnLmdsb2JlLmljb24nKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBnbG9iZSBpY29uIHRvIHNlbGVjdGVkIGludGVybmV0IGludGVyZmFjZSBUQUJcbiAgICAgICAgICAgICAgICBpZiAodGFiSWQgPT09IHNlbGVjdGVkSW50ZXJmYWNlSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRhYi5wcmVwZW5kKCc8aSBjbGFzcz1cImdsb2JlIGljb25cIj48L2k+Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkXG4gICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcygpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgR2F0ZXdheSBmaWVsZCB2aXNpYmlsaXR5IGZvciBhbGwgaW50ZXJmYWNlc1xuICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBESENQIGluZm8gbWVzc2FnZSB2aXNpYmlsaXR5IHdoZW4gSVB2NCBtb2RlIGNoYW5nZXNcbiAgICAgICAgJCgnLmlwdjQtbW9kZS1kcm9wZG93bicpLm9mZignY2hhbmdlLmRuc2dhdGV3YXknKS5vbignY2hhbmdlLmRuc2dhdGV3YXknLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRkcm9wZG93bi5hdHRyKCdpZCcpLnJlcGxhY2UoJ2lwdjQtbW9kZS0nLCAnJyk7XG4gICAgICAgICAgICBjb25zdCBpcHY0TW9kZSA9ICRkcm9wZG93bi5kcm9wZG93bignZ2V0IHZhbHVlJyk7XG4gICAgICAgICAgICBjb25zdCBpc0RoY3BFbmFibGVkID0gaXB2NE1vZGUgPT09ICcxJztcblxuICAgICAgICAgICAgLy8gRmluZCBESENQIGluZm8gbWVzc2FnZVxuICAgICAgICAgICAgY29uc3QgJGRoY3BJbmZvTWVzc2FnZSA9ICQoYC5kaGNwLWluZm8tbWVzc2FnZS0ke2ludGVyZmFjZUlkfWApO1xuXG4gICAgICAgICAgICBpZiAoaXNEaGNwRW5hYmxlZCkge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZW5hYmxlZCAtPiBzaG93IERIQ1AgaW5mbyBtZXNzYWdlXG4gICAgICAgICAgICAgICAgJGRoY3BJbmZvTWVzc2FnZS5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIERIQ1AgZGlzYWJsZWQgLT4gaGlkZSBESENQIGluZm8gbWVzc2FnZVxuICAgICAgICAgICAgICAgICRkaGNwSW5mb01lc3NhZ2UuaGlkZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgSVAgYWRkcmVzcyBncm91cCB2aXNpYmlsaXR5IChoaWRlIHdoZW4gREhDUCBvbiwgc2hvdyB3aGVuIG9mZilcbiAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZHVhbC1zdGFjayBOQVQgbG9naWMgd2hlbiBJUHY0IG1vZGUgY2hhbmdlc1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlRHVhbFN0YWNrTmF0TG9naWMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBpbml0aWFsIFRBQiBpY29uIHVwZGF0ZSBmb3IgY2hlY2tlZCByYWRpbyBidXR0b25cbiAgICAgICAgY29uc3QgJGNoZWNrZWRSYWRpbyA9ICQoJ2lucHV0W25hbWU9XCJpbnRlcm5ldF9pbnRlcmZhY2VcIl06Y2hlY2tlZCcpO1xuICAgICAgICBpZiAoJGNoZWNrZWRSYWRpby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkY2hlY2tlZFJhZGlvLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwbHkgaW5pdGlhbCBkaXNhYmxlZCBzdGF0ZSBmb3IgREhDUC1lbmFibGVkIGludGVyZmFjZXNcbiAgICAgICAgLy8gQ2FsbCBhZnRlciBhbGwgZHJvcGRvd25zIGFyZSBjcmVhdGVkXG4gICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG4gICAgICAgIC8vIFJlLXNhdmUgaW5pdGlhbCBmb3JtIHZhbHVlcyBhbmQgcmUtYmluZCBldmVudCBoYW5kbGVycyBmb3IgZHluYW1pY2FsbHkgY3JlYXRlZCBpbnB1dHNcbiAgICAgICAgLy8gVGhpcyBpcyBlc3NlbnRpYWwgZm9yIGZvcm0gY2hhbmdlIGRldGVjdGlvbiB0byB3b3JrIHdpdGggZHluYW1pYyB0YWJzXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIC8vIE92ZXJyaWRlIEZvcm0gbWV0aG9kcyB0byBtYW51YWxseSBjb2xsZWN0IGFsbCBmaWVsZCB2YWx1ZXMgKGluY2x1ZGluZyBmcm9tIHRhYnMpXG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbFNhdmVJbml0aWFsVmFsdWVzID0gRm9ybS5zYXZlSW5pdGlhbFZhbHVlcztcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsQ2hlY2tWYWx1ZXMgPSBGb3JtLmNoZWNrVmFsdWVzO1xuXG4gICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHZhbHVlcyBmcm9tIEZvbWFudGljIFVJIChtYXkgbWlzcyBkeW5hbWljYWxseSBjcmVhdGVkIHRhYiBmaWVsZHMpXG4gICAgICAgICAgICAgICAgY29uc3QgZm9tYW50aWNWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBNYW51YWxseSBjb2xsZWN0IGFsbCBmaWVsZCB2YWx1ZXMgdG8gY2F0Y2ggZmllbGRzIHRoYXQgRm9tYW50aWMgVUkgbWlzc2VzXG4gICAgICAgICAgICAgICAgY29uc3QgbWFudWFsVmFsdWVzID0ge307XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCAkZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAncmFkaW8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5pcygnOmNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIE1lcmdlIGJvdGggKG1hbnVhbCB2YWx1ZXMgb3ZlcnJpZGUgRm9tYW50aWMgdmFsdWVzIGZvciBmaWVsZHMgdGhhdCBleGlzdCBpbiBib3RoKVxuICAgICAgICAgICAgICAgIEZvcm0ub2xkRm9ybVZhbHVlcyA9IE9iamVjdC5hc3NpZ24oe30sIGZvbWFudGljVmFsdWVzLCBtYW51YWxWYWx1ZXMpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgRm9ybS5jaGVja1ZhbHVlcyA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB2YWx1ZXMgZnJvbSBGb21hbnRpYyBVSVxuICAgICAgICAgICAgICAgIGNvbnN0IGZvbWFudGljVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgICAgICAgICAgLy8gTWFudWFsbHkgY29sbGVjdCBhbGwgZmllbGQgdmFsdWVzXG4gICAgICAgICAgICAgICAgY29uc3QgbWFudWFsVmFsdWVzID0ge307XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXQsIHNlbGVjdCwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZmllbGQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gJGZpZWxkLmF0dHIoJ25hbWUnKSB8fCAkZmllbGQuYXR0cignaWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAnY2hlY2tib3gnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFudWFsVmFsdWVzW25hbWVdID0gJGZpZWxkLmlzKCc6Y2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgkZmllbGQuYXR0cigndHlwZScpID09PSAncmFkaW8nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCRmaWVsZC5pcygnOmNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYW51YWxWYWx1ZXNbbmFtZV0gPSAkZmllbGQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIE1lcmdlIGJvdGhcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdGb3JtVmFsdWVzID0gT2JqZWN0LmFzc2lnbih7fSwgZm9tYW50aWNWYWx1ZXMsIG1hbnVhbFZhbHVlcyk7XG5cbiAgICAgICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkoRm9ybS5vbGRGb3JtVmFsdWVzKSA9PT0gSlNPTi5zdHJpbmdpZnkobmV3Rm9ybVZhbHVlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlb2YgRm9ybS5zZXRFdmVudHMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBGb3JtLnNldEV2ZW50cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBmb3JtIGZvciBleGlzdGluZyBpbnRlcmZhY2VcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gaWZhY2UgLSBJbnRlcmZhY2UgZGF0YVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNBY3RpdmUgLSBXaGV0aGVyIHRoaXMgdGFiIGlzIGFjdGl2ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkZWxldGVCdXR0b24gLSBIVE1MIGZvciBkZWxldGUgYnV0dG9uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0RvY2tlciAtIFdoZXRoZXIgcnVubmluZyBpbiBEb2NrZXIgZW52aXJvbm1lbnRcbiAgICAgKi9cbiAgICBjcmVhdGVJbnRlcmZhY2VGb3JtKGlmYWNlLCBpc0FjdGl2ZSwgZGVsZXRlQnV0dG9uLCBpc0RvY2tlciA9IGZhbHNlKSB7XG4gICAgICAgIGNvbnN0IGlkID0gaWZhY2UuaWQ7XG4gICAgICAgIGNvbnN0IGlzSW50ZXJuZXRJbnRlcmZhY2UgPSBpZmFjZS5pbnRlcm5ldCB8fCBmYWxzZTtcblxuICAgICAgICAvLyBETlMvR2F0ZXdheSBmaWVsZHMgdmlzaWJpbGl0eVxuICAgICAgICBjb25zdCBkbnNHYXRld2F5VmlzaWJsZSA9IGlzSW50ZXJuZXRJbnRlcmZhY2UgPyAnJyA6ICdzdHlsZT1cImRpc3BsYXk6bm9uZTtcIic7XG5cbiAgICAgICAgLy8gUmVhZG9ubHkvUGxhY2Vob2xkZXIgbG9naWMgZm9yIERIQ1AtY29udHJvbGxlZCBmaWVsZHNcbiAgICAgICAgY29uc3QgZGhjcERpc2FibGVkID0gaXNEb2NrZXIgfHwgaWZhY2UudmxhbmlkID4gMDtcbiAgICAgICAgY29uc3QgZGhjcENoZWNrZWQgPSBpc0RvY2tlciB8fCAoaWZhY2UudmxhbmlkID4gMCA/IGZhbHNlIDogaWZhY2UuZGhjcCk7XG5cbiAgICAgICAgLy8gSVB2NCBwbGFjZWhvbGRlcnMgd2hlbiBESENQIGVuYWJsZWRcbiAgICAgICAgY29uc3QgaG9zdG5hbWVQbGFjZWhvbGRlciA9IGRoY3BDaGVja2VkID8gZ2xvYmFsVHJhbnNsYXRlLm53X1BsYWNlaG9sZGVyRGhjcEhvc3RuYW1lIDogJ21pa29wYngnO1xuICAgICAgICBjb25zdCBwcmltYXJ5RG5zUGxhY2Vob2xkZXIgPSBkaGNwQ2hlY2tlZCA/IGAke2dsb2JhbFRyYW5zbGF0ZS5ud19QbGFjZWhvbGRlckRoY3BEbnN9ICR7aWZhY2UuY3VycmVudFByaW1hcnlkbnMgfHwgaWZhY2UucHJpbWFyeWRucyB8fCAnOC44LjguOCd9YCA6ICc4LjguOC44JztcbiAgICAgICAgY29uc3Qgc2Vjb25kYXJ5RG5zUGxhY2Vob2xkZXIgPSBkaGNwQ2hlY2tlZCA/IGAke2dsb2JhbFRyYW5zbGF0ZS5ud19QbGFjZWhvbGRlckRoY3BEbnN9ICR7aWZhY2UuY3VycmVudFNlY29uZGFyeWRucyB8fCBpZmFjZS5zZWNvbmRhcnlkbnMgfHwgJzguOC40LjQnfWAgOiAnOC44LjQuNCc7XG5cbiAgICAgICAgLy8gSVB2NiBETlMgcGxhY2Vob2xkZXJzIChhbHdheXMgZWRpdGFibGUpXG4gICAgICAgIGNvbnN0IGlwdjZQcmltYXJ5RG5zUGxhY2Vob2xkZXIgPSBnbG9iYWxUcmFuc2xhdGUubndfUGxhY2Vob2xkZXJJUHY2RG5zO1xuICAgICAgICBjb25zdCBpcHY2U2Vjb25kYXJ5RG5zUGxhY2Vob2xkZXIgPSBnbG9iYWxUcmFuc2xhdGUubndfUGxhY2Vob2xkZXJJUHY2RG5zO1xuXG4gICAgICAgIHJldHVybiBgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgYm90dG9tIGF0dGFjaGVkIHRhYiBzZWdtZW50ICR7aXNBY3RpdmUgPyAnYWN0aXZlJyA6ICcnfVwiIGRhdGEtdGFiPVwiJHtpZH1cIj5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJpbnRlcmZhY2VfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaW50ZXJmYWNlfVwiIC8+XG5cbiAgICAgICAgICAgICAgICA8IS0tIENvbW1vbiBTZXR0aW5ncyBTZWN0aW9uIChvdXRzaWRlIGNvbHVtbnMpIC0tPlxuICAgICAgICAgICAgICAgICR7aXNEb2NrZXIgPyBgXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibmFtZV8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5uYW1lIHx8ICcnfVwiIC8+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiaW50ZXJuZXRfaW50ZXJmYWNlXCIgdmFsdWU9XCIke2lkfVwiIC8+XG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwiZGhjcF8ke2lkfVwiIHZhbHVlPVwib25cIiAvPlxuICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImlwYWRkcl8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5pcGFkZHIgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCJzdWJuZXRfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2Uuc3VibmV0IHx8ICcyNCd9XCIgLz5cbiAgICAgICAgICAgICAgICBgIDogYFxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJmYWNlTmFtZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIm5hbWVfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UubmFtZSB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBpbnRlcm5ldC1yYWRpb1wiIGlkPVwiaW50ZXJuZXQtJHtpZH0tcmFkaW9cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInJhZGlvXCIgbmFtZT1cImludGVybmV0X2ludGVyZmFjZVwiIHZhbHVlPVwiJHtpZH1cIiAke2lzSW50ZXJuZXRJbnRlcmZhY2UgPyAnY2hlY2tlZCcgOiAnJ30gLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+PGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5ud19JbnRlcm5ldEludGVyZmFjZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19WbGFuSUR9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC0xMDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwibnVtYmVyXCIgbmFtZT1cInZsYW5pZF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS52bGFuaWQgfHwgJzAnfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIGB9XG5cbiAgICAgICAgICAgICAgICA8IS0tIFR3byBDb2x1bW4gR3JpZDogSVB2NCAobGVmdCkgYW5kIElQdjYgKHJpZ2h0KSAtLT5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdHdvIGNvbHVtbiBzdGFja2FibGUgZ3JpZFwiPlxuXG4gICAgICAgICAgICAgICAgICAgIDwhLS0gSVB2NCBDb25maWd1cmF0aW9uIENvbHVtbiAtLT5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbHVtblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGg0IGNsYXNzPVwidWkgZGl2aWRpbmcgaGVhZGVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJnbG9iZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjRDb25maWd1cmF0aW9ufVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9oND5cblxuICAgICAgICAgICAgICAgICAgICAgICAgJHtpc0RvY2tlciA/ICcnIDogYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjRNb2RlfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cImlwdjRfbW9kZV8ke2lkfVwiIG5hbWU9XCJpcHY0X21vZGVfJHtpZH1cIiB2YWx1ZT1cIiR7ZGhjcENoZWNrZWQgPyAnMScgOiAnMCd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgYH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibm90ZGhjcF8ke2lkfVwiIGlkPVwibm90LWRoY3AtJHtpZH1cIi8+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7aXNEb2NrZXIgPyAnJyA6IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZHNcIiBpZD1cImlwLWFkZHJlc3MtZ3JvdXAtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQQWRkcmVzc308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcGFkZHJlc3NcIiBuYW1lPVwiaXBhZGRyXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwYWRkciB8fCAnJ31cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X05ldHdvcmtNYXNrfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwic3VibmV0XyR7aWR9XCIgbmFtZT1cInN1Ym5ldF8ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5zdWJuZXQgfHwgJyd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIGB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICR7aXNEb2NrZXIgPyAnJyA6IGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpcHY0LWdhdGV3YXktZmllbGQtJHtpZH1cIiBzdHlsZT1cImRpc3BsYXk6ICR7aXNJbnRlcm5ldEludGVyZmFjZSAmJiAhZGhjcENoZWNrZWQgPyAnYmxvY2snIDogJ25vbmUnfTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0dhdGV3YXl9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXBhZGRyZXNzXCIgbmFtZT1cImdhdGV3YXlfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuZ2F0ZXdheSB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIjE5Mi4xNjguMS4xXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIGB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwhLS0gSVB2NCBJbnRlcm5ldCBTZXR0aW5ncyAob25seSBpZiBJbnRlcm5ldCBpbnRlcmZhY2UpIC0tPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlwdjQtaW50ZXJuZXQtc2V0dGluZ3MtJHtpZH1cIiAke2Ruc0dhdGV3YXlWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaG9yaXpvbnRhbCBkaXZpZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJuZXRJUHY0fTwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19QcmltYXJ5RE5TfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJwcmltYXJ5ZG5zXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmN1cnJlbnRQcmltYXJ5ZG5zIHx8IGlmYWNlLnByaW1hcnlkbnMgfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCIke3ByaW1hcnlEbnNQbGFjZWhvbGRlcn1cIiAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfU2Vjb25kYXJ5RE5TfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJzZWNvbmRhcnlkbnNfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuY3VycmVudFNlY29uZGFyeWRucyB8fCBpZmFjZS5zZWNvbmRhcnlkbnMgfHwgJyd9XCIgcGxhY2Vob2xkZXI9XCIke3NlY29uZGFyeURuc1BsYWNlaG9sZGVyfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBoaWRkZW4gZGl2aWRlclwiPjwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZGhjcC1pbmZvLW1lc3NhZ2UtJHtpZH1cIiBzdHlsZT1cImRpc3BsYXk6ICR7ZGhjcENoZWNrZWQgJiYgIWlzRG9ja2VyID8gJ2Jsb2NrJyA6ICdub25lJ307XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNvbXBhY3QgaW5mbyBtZXNzYWdlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9IZWFkZXJ9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8dWwgY2xhc3M9XCJsaXN0XCIgc3R5bGU9XCJtYXJnaW4tdG9wOiAwLjVlbTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9JUH06IDxzdHJvbmc+JHtpZmFjZS5jdXJyZW50SXBhZGRyIHx8IGlmYWNlLmlwYWRkciB8fCAnTi9BJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb1N1Ym5ldH06IDxzdHJvbmc+LyR7aWZhY2UuY3VycmVudFN1Ym5ldCB8fCBpZmFjZS5zdWJuZXQgfHwgJ04vQSd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9HYXRld2F5fTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRHYXRld2F5IHx8IGlmYWNlLmdhdGV3YXkgfHwgJ04vQSd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9ETlN9OiA8c3Ryb25nPiR7aWZhY2UucHJpbWFyeWRucyB8fCAnTi9BJ30ke2lmYWNlLnNlY29uZGFyeWRucyA/ICcsICcgKyBpZmFjZS5zZWNvbmRhcnlkbnMgOiAnJ308L3N0cm9uZz48L2xpPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7aWZhY2UuZG9tYWluID8gYDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19ESENQSW5mb0RvbWFpbn06IDxzdHJvbmc+JHtpZmFjZS5kb21haW59PC9zdHJvbmc+PC9saT5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAke2lzRG9ja2VyID8gYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImRvY2tlci1pbmZvLW1lc3NhZ2UtJHtpZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY29tcGFjdCBpbmZvIG1lc3NhZ2VcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Eb2NrZXJJUHY0SW5mbyB8fCAnQ3VycmVudCBJUHY0IENvbmZpZ3VyYXRpb24nfTwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHVsIGNsYXNzPVwibGlzdFwiIHN0eWxlPVwibWFyZ2luLXRvcDogMC41ZW07XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvSVB9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudElwYWRkciB8fCBpZmFjZS5pcGFkZHIgfHwgJ04vQSd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGk+JHtnbG9iYWxUcmFuc2xhdGUubndfREhDUEluZm9TdWJuZXR9OiA8c3Ryb25nPi8ke2lmYWNlLmN1cnJlbnRTdWJuZXQgfHwgaWZhY2Uuc3VibmV0IHx8ICdOL0EnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0RIQ1BJbmZvR2F0ZXdheX06IDxzdHJvbmc+JHtpZmFjZS5jdXJyZW50R2F0ZXdheSB8fCBpZmFjZS5nYXRld2F5IHx8ICdOL0EnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHAgc3R5bGU9XCJtYXJnaW4tdG9wOiAwLjVlbTtcIj48aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb25cIj48L2k+JHtnbG9iYWxUcmFuc2xhdGUubndfRG9ja2VySVB2NEluZm9Ob3RlIHx8ICdOZXR3b3JrIHNldHRpbmdzIGFyZSBtYW5hZ2VkIGJ5IERvY2tlciBydW50aW1lLiBPbmx5IEROUyBzZXJ2ZXJzIGNhbiBiZSBjb25maWd1cmVkLid9PC9wPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgYCA6ICcnfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICAgICA8IS0tIElQdjYgQ29uZmlndXJhdGlvbiBDb2x1bW4gLS0+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb2x1bW5cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxoNCBjbGFzcz1cInVpIGRpdmlkaW5nIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwid29ybGQgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2Q29uZmlndXJhdGlvbn1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvaDQ+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2TW9kZX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJpcHY2X21vZGVfJHtpZH1cIiBuYW1lPVwiaXB2Nl9tb2RlXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwdjZfbW9kZSB8fCAnMCd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICA8IS0tIEhpZGRlbiBmaWVsZCB0byBzdG9yZSBjdXJyZW50IGF1dG8tY29uZmlndXJlZCBJUHY2IGFkZHJlc3MgLS0+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiY3VycmVudC1pcHY2YWRkci0ke2lkfVwiIHZhbHVlPVwiJHtpZmFjZS5jdXJyZW50SXB2NmFkZHIgfHwgJyd9XCIgLz5cblxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlwdjYtbWFudWFsLWZpZWxkcy0ke2lkfVwiIHN0eWxlPVwiZGlzcGxheTogbm9uZTtcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBZGRyZXNzfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNjAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwdjZhZGRyZXNzXCIgbmFtZT1cImlwdjZhZGRyXyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwdjZhZGRyIHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiZmQwMDo6MVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NlN1Ym5ldH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cImlwdjZfc3VibmV0XyR7aWR9XCIgbmFtZT1cImlwdjZfc3VibmV0XyR7aWR9XCIgdmFsdWU9XCIke2lmYWNlLmlwdjZfc3VibmV0IHx8ICc2NCd9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCIgJHtkbnNHYXRld2F5VmlzaWJsZX0+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2R2F0ZXdheX08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTYwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgY2xhc3M9XCJpcHY2YWRkcmVzc1wiIG5hbWU9XCJpcHY2X2dhdGV3YXlfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuaXB2Nl9nYXRld2F5IHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiZmU4MDo6MVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwhLS0gSVB2NiBJbnRlcm5ldCBTZXR0aW5ncyAob25seSBpZiBJbnRlcm5ldCBpbnRlcmZhY2UpIC0tPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlwdjYtaW50ZXJuZXQtc2V0dGluZ3MtJHtpZH1cIiAke2Ruc0dhdGV3YXlWaXNpYmxlfT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaG9yaXpvbnRhbCBkaXZpZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUubndfSW50ZXJuZXRJUHY2fTwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIGlwdjYtcHJpbWFyeWRucy1maWVsZC0ke2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+JHtnbG9iYWxUcmFuc2xhdGUubndfSVB2NlByaW1hcnlETlN9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIGNsYXNzPVwiaXB2NmFkZHJlc3NcIiBuYW1lPVwicHJpbWFyeWRuczZfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuY3VycmVudFByaW1hcnlkbnM2IHx8IGlmYWNlLnByaW1hcnlkbnM2IHx8ICcnfVwiIHBsYWNlaG9sZGVyPVwiJHtpcHY2UHJpbWFyeURuc1BsYWNlaG9sZGVyfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIGlwdjYtc2Vjb25kYXJ5ZG5zLWZpZWxkLSR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2U2Vjb25kYXJ5RE5TfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwdjZhZGRyZXNzXCIgbmFtZT1cInNlY29uZGFyeWRuczZfJHtpZH1cIiB2YWx1ZT1cIiR7aWZhY2UuY3VycmVudFNlY29uZGFyeWRuczYgfHwgaWZhY2Uuc2Vjb25kYXJ5ZG5zNiB8fCAnJ31cIiBwbGFjZWhvbGRlcj1cIiR7aXB2NlNlY29uZGFyeURuc1BsYWNlaG9sZGVyfVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBoaWRkZW4gZGl2aWRlclwiPjwvZGl2PlxuXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaXB2Ni1hdXRvLWluZm8tbWVzc2FnZS0ke2lkfVwiIHN0eWxlPVwiZGlzcGxheTogJHtpZmFjZS5pcHY2X21vZGUgPT09ICcxJyA/ICdibG9jaycgOiAnbm9uZSd9O1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBjb21wYWN0IGluZm8gbWVzc2FnZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBdXRvSW5mb0hlYWRlcn08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx1bCBjbGFzcz1cImxpc3RcIiBzdHlsZT1cIm1hcmdpbi10b3A6IDAuNWVtO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsaT4ke2dsb2JhbFRyYW5zbGF0ZS5ud19JUHY2QXV0b0luZm9BZGRyZXNzfTogPHN0cm9uZz4ke2lmYWNlLmN1cnJlbnRJcHY2YWRkciB8fCBpZmFjZS5pcHY2YWRkciB8fCAnQXV0b2NvbmZpZ3VyZWQnfTwvc3Ryb25nPjwvbGk+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBdXRvSW5mb1ByZWZpeH06IDxzdHJvbmc+LyR7aWZhY2UuY3VycmVudElwdjZfc3VibmV0IHx8IGlmYWNlLmlwdjZfc3VibmV0IHx8ICc2NCd9PC9zdHJvbmc+PC9saT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkeyhpZmFjZS5jdXJyZW50SXB2Nl9nYXRld2F5IHx8IGlmYWNlLmlwdjZfZ2F0ZXdheSkgPyBgPGxpPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjZBdXRvSW5mb0dhdGV3YXl9OiA8c3Ryb25nPiR7aWZhY2UuY3VycmVudElwdjZfZ2F0ZXdheSB8fCBpZmFjZS5pcHY2X2dhdGV3YXl9PC9zdHJvbmc+PC9saT5gIDogJyd9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgICR7ZGVsZXRlQnV0dG9ufVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIGA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBmb3JtIGZvciBuZXcgVkxBTiB0ZW1wbGF0ZVxuICAgICAqL1xuICAgIGNyZWF0ZVRlbXBsYXRlRm9ybSh0ZW1wbGF0ZSwgaW50ZXJmYWNlcykge1xuICAgICAgICBjb25zdCBpZCA9IDA7XG5cbiAgICAgICAgcmV0dXJuIGBcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBib3R0b20gYXR0YWNoZWQgdGFiIHNlZ21lbnRcIiBkYXRhLXRhYj1cIiR7aWR9XCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkXCI+XG4gICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcmZhY2V9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgbmFtZT1cImludGVyZmFjZV8ke2lkfVwiIGlkPVwiaW50ZXJmYWNlXyR7aWR9XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0ludGVyZmFjZU5hbWV9PC9sYWJlbD5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJuYW1lXyR7aWR9XCIgaWQ9XCJuYW1lXyR7aWR9XCIgdmFsdWU9XCJcIiAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRvZ2dsZSBjaGVja2JveCBkaGNwLWNoZWNrYm94XCIgaWQ9XCJkaGNwLSR7aWR9LWNoZWNrYm94XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG5hbWU9XCJkaGNwXyR7aWR9XCIgY2hlY2tlZCAvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbD4ke2dsb2JhbFRyYW5zbGF0ZS5ud19Vc2VESENQfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQdjRNb2RlfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZCBtYXgtd2lkdGgtNDAwXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiaXB2NF9tb2RlXyR7aWR9XCIgbmFtZT1cImlwdjRfbW9kZV8ke2lkfVwiIHZhbHVlPVwiMVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBuYW1lPVwibm90ZGhjcF8ke2lkfVwiIGlkPVwibm90LWRoY3AtJHtpZH1cIi8+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRzXCIgaWQ9XCJpcC1hZGRyZXNzLWdyb3VwLSR7aWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X0lQQWRkcmVzc308L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpZWxkIG1heC13aWR0aC00MDBcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBjbGFzcz1cImlwYWRkcmVzc1wiIG5hbWU9XCJpcGFkZHJfJHtpZH1cIiB2YWx1ZT1cIlwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJmaWVsZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X05ldHdvcmtNYXNrfTwvbGFiZWw+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTQwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiaGlkZGVuXCIgaWQ9XCJzdWJuZXRfJHtpZH1cIiBuYW1lPVwic3VibmV0XyR7aWR9XCIgdmFsdWU9XCIyNFwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGRcIj5cbiAgICAgICAgICAgICAgICAgICAgPGxhYmVsPiR7Z2xvYmFsVHJhbnNsYXRlLm53X1ZsYW5JRH08L2xhYmVsPlxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZmllbGQgbWF4LXdpZHRoLTEwMFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJudW1iZXJcIiBuYW1lPVwidmxhbmlkXyR7aWR9XCIgdmFsdWU9XCI0MDk1XCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IElQdjYgc3VibmV0IHByZWZpeCBvcHRpb25zIGFycmF5IGZvciBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBJUHY2IHN1Ym5ldCBwcmVmaXggb3B0aW9ucyAoLzEgdG8gLzEyOClcbiAgICAgKi9cbiAgICBnZXRJcHY2U3VibmV0T3B0aW9uc0FycmF5KCkge1xuICAgICAgICBjb25zdCBvcHRpb25zID0gW107XG4gICAgICAgIC8vIEdlbmVyYXRlIC8xIHRvIC8xMjggKGNvbW1vbjogLzY0LCAvNDgsIC81NiwgLzEyOClcbiAgICAgICAgZm9yIChsZXQgaSA9IDEyODsgaSA+PSAxOyBpLS0pIHtcbiAgICAgICAgICAgIGxldCBkZXNjcmlwdGlvbiA9IGAvJHtpfWA7XG4gICAgICAgICAgICAvLyBBZGQgZGVzY3JpcHRpb25zIGZvciBjb21tb24gcHJlZml4ZXNcbiAgICAgICAgICAgIGlmIChpID09PSAxMjgpIGRlc2NyaXB0aW9uICs9ICcgKFNpbmdsZSBob3N0KSc7XG4gICAgICAgICAgICBlbHNlIGlmIChpID09PSA2NCkgZGVzY3JpcHRpb24gKz0gJyAoU3RhbmRhcmQgc3VibmV0KSc7XG4gICAgICAgICAgICBlbHNlIGlmIChpID09PSA1NikgZGVzY3JpcHRpb24gKz0gJyAoU21hbGwgbmV0d29yayknO1xuICAgICAgICAgICAgZWxzZSBpZiAoaSA9PT0gNDgpIGRlc2NyaXB0aW9uICs9ICcgKExhcmdlIG5ldHdvcmspJztcbiAgICAgICAgICAgIGVsc2UgaWYgKGkgPT09IDMyKSBkZXNjcmlwdGlvbiArPSAnIChJU1AgYXNzaWdubWVudCknO1xuXG4gICAgICAgICAgICBvcHRpb25zLnB1c2goe1xuICAgICAgICAgICAgICAgIHZhbHVlOiBpLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgdGV4dDogZGVzY3JpcHRpb25cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvcHRpb25zO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgc3VibmV0IG1hc2sgb3B0aW9ucyBhcnJheSBmb3IgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygc3VibmV0IG1hc2sgb3B0aW9uc1xuICAgICAqL1xuICAgIGdldFN1Ym5ldE9wdGlvbnNBcnJheSgpIHtcbiAgICAgICAgLy8gTmV0d29yayBtYXNrcyBmcm9tIENpZHI6OmdldE5ldE1hc2tzKCkgKGtyc29ydCBTT1JUX05VTUVSSUMpXG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7dmFsdWU6ICczMicsIHRleHQ6ICczMiAtIDI1NS4yNTUuMjU1LjI1NSd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMzEnLCB0ZXh0OiAnMzEgLSAyNTUuMjU1LjI1NS4yNTQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzMwJywgdGV4dDogJzMwIC0gMjU1LjI1NS4yNTUuMjUyJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyOScsIHRleHQ6ICcyOSAtIDI1NS4yNTUuMjU1LjI0OCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjgnLCB0ZXh0OiAnMjggLSAyNTUuMjU1LjI1NS4yNDAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI3JywgdGV4dDogJzI3IC0gMjU1LjI1NS4yNTUuMjI0J30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyNicsIHRleHQ6ICcyNiAtIDI1NS4yNTUuMjU1LjE5Mid9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjUnLCB0ZXh0OiAnMjUgLSAyNTUuMjU1LjI1NS4xMjgnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzI0JywgdGV4dDogJzI0IC0gMjU1LjI1NS4yNTUuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjMnLCB0ZXh0OiAnMjMgLSAyNTUuMjU1LjI1NS4yNTQnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzIyJywgdGV4dDogJzIyIC0gMjU1LjI1NS4yNTIuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMjEnLCB0ZXh0OiAnMjEgLSAyNTUuMjU1LjI0OC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyMCcsIHRleHQ6ICcyMCAtIDI1NS4yNTUuMjQwLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE5JywgdGV4dDogJzE5IC0gMjU1LjI1NS4yMjQuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMTgnLCB0ZXh0OiAnMTggLSAyNTUuMjU1LjE5Mi4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcxNycsIHRleHQ6ICcxNyAtIDI1NS4yNTUuMTI4LjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE2JywgdGV4dDogJzE2IC0gMjU1LjI1NS4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE1JywgdGV4dDogJzE1IC0gMjU1LjI1NC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzE0JywgdGV4dDogJzE0IC0gMjU1LjI1Mi4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEzJywgdGV4dDogJzEzIC0gMjU1LjI0OC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEyJywgdGV4dDogJzEyIC0gMjU1LjI0MC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzExJywgdGV4dDogJzExIC0gMjU1LjIyNC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEwJywgdGV4dDogJzEwIC0gMjU1LjE5Mi4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzknLCB0ZXh0OiAnOSAtIDI1NS4xMjguMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc4JywgdGV4dDogJzggLSAyNTUuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzcnLCB0ZXh0OiAnNyAtIDI1NC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnNicsIHRleHQ6ICc2IC0gMjUyLjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICc1JywgdGV4dDogJzUgLSAyNDguMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzQnLCB0ZXh0OiAnNCAtIDI0MC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMycsIHRleHQ6ICczIC0gMjI0LjAuMC4wJ30sXG4gICAgICAgICAgICB7dmFsdWU6ICcyJywgdGV4dDogJzIgLSAxOTIuMC4wLjAnfSxcbiAgICAgICAgICAgIHt2YWx1ZTogJzEnLCB0ZXh0OiAnMSAtIDEyOC4wLjAuMCd9LFxuICAgICAgICAgICAge3ZhbHVlOiAnMCcsIHRleHQ6ICcwIC0gMC4wLjAuMCd9LFxuICAgICAgICBdO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggY29uZmlndXJhdGlvbiBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gV0hZOiBCb3RoIERvY2tlciBhbmQgbm9uLURvY2tlciBub3cgdXNlIGludGVyZmFjZSB0YWJzXG4gICAgICAgIC8vIERvY2tlciBoYXMgcmVzdHJpY3Rpb25zOiBESENQIGxvY2tlZCwgSVAvc3VibmV0L1ZMQU4gcmVhZG9ubHksIEROUyBlZGl0YWJsZVxuICAgICAgICBuZXR3b3Jrcy5jcmVhdGVJbnRlcmZhY2VUYWJzKGRhdGEsIGRhdGEuaXNEb2NrZXIgfHwgZmFsc2UpO1xuXG4gICAgICAgIC8vIFBvcHVsYXRlIGdsb2JhbCBob3N0bmFtZSBmcm9tIGZpcnN0IGludGVyZmFjZSAoc2luZ2xlIHZhbHVlIGZvciBhbGwgaW50ZXJmYWNlcylcbiAgICAgICAgaWYgKGRhdGEuaW50ZXJmYWNlcyAmJiBkYXRhLmludGVyZmFjZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZmlyc3RJbnRlcmZhY2UgPSBkYXRhLmludGVyZmFjZXNbMF07XG4gICAgICAgICAgICBjb25zdCBob3N0bmFtZSA9IGZpcnN0SW50ZXJmYWNlLmN1cnJlbnRIb3N0bmFtZSB8fCBmaXJzdEludGVyZmFjZS5ob3N0bmFtZSB8fCAnJztcbiAgICAgICAgICAgICQoJyNnbG9iYWwtaG9zdG5hbWUnKS52YWwoaG9zdG5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IE5BVCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5uYXQpIHtcbiAgICAgICAgICAgIC8vIEJvb2xlYW4gdmFsdWVzIGZyb20gQVBJXG4gICAgICAgICAgICBpZiAoZGF0YS5uYXQudXNlbmF0KSB7XG4gICAgICAgICAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRpcGFkZHInLCBkYXRhLm5hdC5leHRpcGFkZHIgfHwgJycpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGhvc3RuYW1lJywgZGF0YS5uYXQuZXh0aG9zdG5hbWUgfHwgJycpO1xuXG4gICAgICAgICAgICAvLyBhdXRvVXBkYXRlRXh0ZXJuYWxJcCBib29sZWFuIChmaWVsZCBuYW1lIGZyb20gdGhlIGZvcm0pXG4gICAgICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZUNoZWNrYm94ID0gbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImF1dG9VcGRhdGVFeHRlcm5hbElwXCJdJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgIGlmICgkYXV0b1VwZGF0ZUNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5uYXQuQVVUT19VUERBVEVfRVhURVJOQUxfSVAgfHwgZGF0YS5uYXQuYXV0b1VwZGF0ZUV4dGVybmFsSXApIHtcbiAgICAgICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgnY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkYXV0b1VwZGF0ZUNoZWNrYm94LmNoZWNrYm94KCd1bmNoZWNrJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHBvcnQgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEucG9ydHMpIHtcbiAgICAgICAgICAgIC8vIFdIWTogTm8gbWFwcGluZyBuZWVkZWQgLSBBUEkgcmV0dXJucyBrZXlzIG1hdGNoaW5nIGZvcm0gZmllbGQgbmFtZXNcbiAgICAgICAgICAgIC8vIChlLmcuLCAnZXh0ZXJuYWxTSVBQb3J0JyBmcm9tIFBieFNldHRpbmdzOjpFWFRFUk5BTF9TSVBfUE9SVCBjb25zdGFudClcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEucG9ydHMpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGRhdGEucG9ydHNba2V5XTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCBrZXksIHZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIE5BVCBoZWxwIHRleHQgYW5kIGxhYmVscyB3aXRoIGFjdHVhbCBwb3J0IHZhbHVlc1xuICAgICAgICAgICAgbmV0d29ya3MudXBkYXRlTkFUSGVscFRleHQoZGF0YS5wb3J0cyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVQb3J0TGFiZWxzKGRhdGEucG9ydHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IGFkZGl0aW9uYWwgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEuc2V0dGluZ3MpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGRhdGEuc2V0dGluZ3MpLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCBrZXksIGRhdGEuc2V0dGluZ3Nba2V5XSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFN0b3JlIGF2YWlsYWJsZSBpbnRlcmZhY2VzIGZvciBzdGF0aWMgcm91dGVzIEZJUlNUIChiZWZvcmUgbG9hZGluZyByb3V0ZXMpXG4gICAgICAgIGlmIChkYXRhLmF2YWlsYWJsZUludGVyZmFjZXMpIHtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuYXZhaWxhYmxlSW50ZXJmYWNlcyA9IGRhdGEuYXZhaWxhYmxlSW50ZXJmYWNlcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIExvYWQgc3RhdGljIHJvdXRlcyBBRlRFUiBhdmFpbGFibGVJbnRlcmZhY2VzIGFyZSBzZXRcbiAgICAgICAgaWYgKGRhdGEuc3RhdGljUm91dGVzKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmxvYWRSb3V0ZXMoZGF0YS5zdGF0aWNSb3V0ZXMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBkaXJ0eSBjaGVja2luZyBhZnRlciBwb3B1bGF0aW9uIGlzIGNvbXBsZXRlXG4gICAgICAgIC8vIFRoaXMgZW5zdXJlcyB0aGUgYnV0dG9uIGlzIGRpc2FibGVkIGFuZCBhbGwgZHluYW1pY2FsbHkgY3JlYXRlZCBmaWVsZHMgYXJlIHRyYWNrZWRcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3MuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVB2NiBhZGRyZXNzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQdjYgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVB2NiBhZGRyZXNzLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcHY2YWRkciA9ICh2YWx1ZSkgPT4ge1xuICAgIC8vIElQdjYgcmVnZXggcGF0dGVyblxuICAgIC8vIFN1cHBvcnRzIGZ1bGwgZm9ybSwgY29tcHJlc3NlZCBmb3JtICg6OiksIElQdjQtbWFwcGVkICg6OmZmZmY6MTkyLjAuMi4xKSwgbGluay1sb2NhbCAoZmU4MDo6MSVldGgwKVxuICAgIGNvbnN0IGlwdjZQYXR0ZXJuID0gL14oKFswLTlhLWZBLUZdezEsNH06KXs3fVswLTlhLWZBLUZdezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDd9OnwoWzAtOWEtZkEtRl17MSw0fTopezEsNn06WzAtOWEtZkEtRl17MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsNX0oOlswLTlhLWZBLUZdezEsNH0pezEsMn18KFswLTlhLWZBLUZdezEsNH06KXsxLDR9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDN9fChbMC05YS1mQS1GXXsxLDR9Oil7MSwzfSg6WzAtOWEtZkEtRl17MSw0fSl7MSw0fXwoWzAtOWEtZkEtRl17MSw0fTopezEsMn0oOlswLTlhLWZBLUZdezEsNH0pezEsNX18WzAtOWEtZkEtRl17MSw0fTooKDpbMC05YS1mQS1GXXsxLDR9KXsxLDZ9KXw6KCg6WzAtOWEtZkEtRl17MSw0fSl7MSw3fXw6KXxmZTgwOig6WzAtOWEtZkEtRl17MCw0fSl7MCw0fSVbMC05YS16QS1aXXsxLH18OjooZmZmZig6MHsxLDR9KXswLDF9Oil7MCwxfSgoMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pXFwuKXszfSgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSl8KFswLTlhLWZBLUZdezEsNH06KXsxLDR9OigoMjVbMC01XXwoMlswLTRdfDF7MCwxfVswLTldKXswLDF9WzAtOV0pXFwuKXszfSgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSkpJC87XG4gICAgcmV0dXJuIGlwdjZQYXR0ZXJuLnRlc3QodmFsdWUpO1xufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MgKElQdjQgb3IgSVB2NikuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcy5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVB2NCBvciBJUHY2IGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkcmVzcyA9ICh2YWx1ZSkgPT4ge1xuICAgIHJldHVybiAkLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyKHZhbHVlKSB8fCAkLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXB2NmFkZHIodmFsdWUpO1xufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzIHdpdGggYW4gb3B0aW9uYWwgcG9ydCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuaXBhZGRyV2l0aFBvcnRPcHRpb25hbCA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkoOlswLTldKyk/JC8pO1xuICAgIGlmIChmID09IG51bGwpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSBmW2ldO1xuICAgICAgICAgICAgaWYgKGEgPiAyNTUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZls1XSA+IDMyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIFZMQU4gSUQgaXMgdW5pcXVlIGZvciBhIGdpdmVuIGludGVyZmFjZS5cbiAqIEBwYXJhbSB7c3RyaW5nfSB2bGFuVmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIFZMQU4gSUQgaW5wdXQgZmllbGQuXG4gKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gLSBUaGUgcGFyYW1ldGVyIGZvciB0aGUgcnVsZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSAtIFRydWUgaWYgdGhlIFZMQU4gSUQgaXMgdW5pcXVlIGZvciB0aGUgaW50ZXJmYWNlLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jaGVja1ZsYW4gPSAodmxhblZhbHVlLCBwYXJhbSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IHZsYW5zQXJyYXkgPSB7fTtcbiAgICBjb25zdCBhbGxWYWx1ZXMgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgaWYgKGFsbFZhbHVlcy5pbnRlcmZhY2VfMCAhPT0gdW5kZWZpbmVkICYmIGFsbFZhbHVlcy5pbnRlcmZhY2VfMCA+IDApIHtcbiAgICAgICAgY29uc3QgbmV3RXRoTmFtZSA9IGFsbFZhbHVlc1tgaW50ZXJmYWNlXyR7YWxsVmFsdWVzLmludGVyZmFjZV8wfWBdO1xuICAgICAgICB2bGFuc0FycmF5W25ld0V0aE5hbWVdID0gW2FsbFZhbHVlcy52bGFuaWRfMF07XG4gICAgICAgIGlmIChhbGxWYWx1ZXMudmxhbmlkXzAgPT09ICcnKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAkLmVhY2goYWxsVmFsdWVzLCAoaW5kZXgsIHZhbHVlKSA9PiB7XG4gICAgICAgIGlmIChpbmRleCA9PT0gJ2ludGVyZmFjZV8wJyB8fCBpbmRleCA9PT0gJ3ZsYW5pZF8wJykgcmV0dXJuO1xuICAgICAgICBpZiAoaW5kZXguaW5kZXhPZigndmxhbmlkJykgPj0gMCkge1xuICAgICAgICAgICAgY29uc3QgZXRoTmFtZSA9IGFsbFZhbHVlc1tgaW50ZXJmYWNlXyR7aW5kZXguc3BsaXQoJ18nKVsxXX1gXTtcbiAgICAgICAgICAgIGlmICgkLmluQXJyYXkodmFsdWUsIHZsYW5zQXJyYXlbZXRoTmFtZV0pID49IDBcbiAgICAgICAgICAgICAgICAmJiB2bGFuVmFsdWUgPT09IHZhbHVlXG4gICAgICAgICAgICAgICAgJiYgcGFyYW0gPT09IGluZGV4LnNwbGl0KCdfJylbMV0pIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKCEoZXRoTmFtZSBpbiB2bGFuc0FycmF5KSkge1xuICAgICAgICAgICAgICAgICAgICB2bGFuc0FycmF5W2V0aE5hbWVdID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0ucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy8gREhDUCB2YWxpZGF0aW9uIHJ1bGUgcmVtb3ZlZCAtIERIQ1AgY2hlY2tib3ggaXMgZGlzYWJsZWQgZm9yIFZMQU4gaW50ZXJmYWNlcywgbm8gdmFsaWRhdGlvbiBuZWVkZWRcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIHRoZSBwcmVzZW5jZSBvZiBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgZXh0ZXJuYWwgSVAgaG9zdCBpbmZvcm1hdGlvbiBpcyBwcm92aWRlZCB3aGVuIE5BVCBpcyBlbmFibGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leHRlbmFsSXBIb3N0ID0gKCkgPT4ge1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLnVzZW5hdCA9PT0gJ29uJykge1xuICAgICAgICAvLyBHZXQgdW5tYXNrZWQgdmFsdWUgZm9yIGV4dGlwYWRkciAoaW5wdXRtYXNrIG1heSByZXR1cm4gXCJfLl8uXy5fXCIgZm9yIGVtcHR5KVxuICAgICAgICBjb25zdCBleHRpcGFkZHIgPSBuZXR3b3Jrcy4kZXh0aXBhZGRyLmlucHV0bWFzaygndW5tYXNrZWR2YWx1ZScpIHx8ICcnO1xuICAgICAgICBjb25zdCBleHRob3N0bmFtZSA9IChhbGxWYWx1ZXMuZXh0aG9zdG5hbWUgfHwgJycpLnRyaW0oKTtcbiAgICAgICAgaWYgKGV4dGhvc3RuYW1lID09PSAnJyAmJiBleHRpcGFkZHIgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdmFsdWUgaXMgYSB2YWxpZCBob3N0bmFtZVxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGhvc3RuYW1lXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHZhbGlkIGhvc3RuYW1lLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLnZhbGlkSG9zdG5hbWUgPSAodmFsdWUpID0+IHtcbiAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09PSAnJykge1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gRW1wdHkgaXMgaGFuZGxlZCBieSBleHRlbmFsSXBIb3N0IHJ1bGVcbiAgICB9XG5cbiAgICAvLyBSRkMgOTUyL1JGQyAxMTIzIGhvc3RuYW1lIHZhbGlkYXRpb25cbiAgICAvLyAtIExhYmVscyBzZXBhcmF0ZWQgYnkgZG90c1xuICAgIC8vIC0gRWFjaCBsYWJlbCAxLTYzIGNoYXJzXG4gICAgLy8gLSBPbmx5IGFscGhhbnVtZXJpYyBhbmQgaHlwaGVuc1xuICAgIC8vIC0gQ2Fubm90IHN0YXJ0L2VuZCB3aXRoIGh5cGhlblxuICAgIC8vIC0gVG90YWwgbGVuZ3RoIG1heCAyNTMgY2hhcnNcbiAgICBjb25zdCBob3N0bmFtZVJlZ2V4ID0gL14oPz0uezEsMjUzfSQpKD8hLSlbYS16QS1aMC05LV17MSw2M30oPzwhLSkoXFwuW2EtekEtWjAtOS1dezEsNjN9KD88IS0pKSokLztcbiAgICByZXR1cm4gaG9zdG5hbWVSZWdleC50ZXN0KHZhbHVlKTtcbn07XG5cblxuLyoqXG4gKiBTdGF0aWMgUm91dGVzIE1hbmFnZXIgTW9kdWxlXG4gKlxuICogTWFuYWdlcyBzdGF0aWMgcm91dGUgY29uZmlndXJhdGlvbiB3aGVuIG11bHRpcGxlIG5ldHdvcmsgaW50ZXJmYWNlcyBleGlzdFxuICovXG5jb25zdCBTdGF0aWNSb3V0ZXNNYW5hZ2VyID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSB3cmFwcGVycyDigJQgcmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIHRvIGF2b2lkIG1vZHVsZS1sb2FkXG4gICAgICogYCQgaXMgbm90IGRlZmluZWRgIChTZW50cnkgTUlLT1BCWC1NRzkgLyBpc3N1ZSAjMTA1NCkuXG4gICAgICovXG4gICAgJHRhYmxlOiBudWxsLFxuICAgICRzZWN0aW9uOiBudWxsLFxuICAgICRhZGRCdXR0b246IG51bGwsXG4gICAgJHRhYmxlQ29udGFpbmVyOiBudWxsLFxuICAgICRlbXB0eVBsYWNlaG9sZGVyOiBudWxsLFxuICAgIHJvdXRlczogW10sXG4gICAgYXZhaWxhYmxlSW50ZXJmYWNlczogW10sIC8vIFdpbGwgYmUgcG9wdWxhdGVkIGZyb20gUkVTVCBBUElcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgc3RhdGljIHJvdXRlcyBtYW5hZ2VtZW50XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gQ2FjaGUgZWxlbWVudHNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUgPSAkKCcjc3RhdGljLXJvdXRlcy10YWJsZScpO1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRzZWN0aW9uID0gJCgnI3N0YXRpYy1yb3V0ZXMtc2VjdGlvbicpO1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1yb3V0ZScpO1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiRlbXB0eVBsYWNlaG9sZGVyID0gJCgnI3N0YXRpYy1yb3V0ZXMtZW1wdHktcGxhY2Vob2xkZXInKTtcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGVDb250YWluZXIgPSAkKCcjc3RhdGljLXJvdXRlcy10YWJsZS1jb250YWluZXInKTtcblxuICAgICAgICAvLyBIaWRlIHNlY3Rpb24gaWYgbGVzcyB0aGFuIDIgaW50ZXJmYWNlc1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZVZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGRyYWctYW5kLWRyb3BcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcblxuICAgICAgICAvLyBBZGQgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kYWRkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBmaXJzdCByb3V0ZSBidXR0b24gaGFuZGxlciAoaW4gZW1wdHkgcGxhY2Vob2xkZXIpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjYWRkLWZpcnN0LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciAoZGVsZWdhdGVkKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbignY2xpY2snLCAnLmRlbGV0ZS1yb3V0ZS1idXR0b24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci51cGRhdGVFbXB0eVN0YXRlKCk7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvcHkgYnV0dG9uIGhhbmRsZXIgKGRlbGVnYXRlZClcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2NsaWNrJywgJy5jb3B5LXJvdXRlLWJ1dHRvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkc291cmNlUm93ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuY29weVJvdXRlKCRzb3VyY2VSb3cpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbnB1dCBjaGFuZ2UgaGFuZGxlcnNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kdGFibGUub24oJ2lucHV0IGNoYW5nZScsICcubmV0d29yay1pbnB1dCwgLmdhdGV3YXktaW5wdXQsIC5kZXNjcmlwdGlvbi1pbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUGFzdGUgaGFuZGxlcnMgZm9yIElQIGFkZHJlc3MgZmllbGRzIChlbmFibGUgY2xpcGJvYXJkIHBhc3RlIHdpdGggaW5wdXRtYXNrKVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5vbigncGFzdGUnLCAnLm5ldHdvcmstaW5wdXQsIC5nYXRld2F5LWlucHV0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBHZXQgcGFzdGVkIGRhdGEgZnJvbSBjbGlwYm9hcmRcbiAgICAgICAgICAgIGxldCBwYXN0ZWREYXRhID0gJyc7XG4gICAgICAgICAgICBpZiAoZS5vcmlnaW5hbEV2ZW50ICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhICYmIGUub3JpZ2luYWxFdmVudC5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5vcmlnaW5hbEV2ZW50LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChlLmNsaXBib2FyZERhdGEgJiYgZS5jbGlwYm9hcmREYXRhLmdldERhdGEpIHtcbiAgICAgICAgICAgICAgICBwYXN0ZWREYXRhID0gZS5jbGlwYm9hcmREYXRhLmdldERhdGEoJ3RleHQnKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod2luZG93LmNsaXBib2FyZERhdGEgJiYgd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSkge1xuICAgICAgICAgICAgICAgIHBhc3RlZERhdGEgPSB3aW5kb3cuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0Jyk7IC8vIEZvciBJRVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBDbGVhbiB0aGUgcGFzdGVkIGRhdGEgKHJlbW92ZSBleHRyYSBzcGFjZXMsIGtlZXAgb25seSB2YWxpZCBJUCBjaGFyYWN0ZXJzKVxuICAgICAgICAgICAgY29uc3QgY2xlYW5lZERhdGEgPSBwYXN0ZWREYXRhLnRyaW0oKS5yZXBsYWNlKC9bXjAtOS5dL2csICcnKTtcblxuICAgICAgICAgICAgLy8gR2V0IHRoZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuXG4gICAgICAgICAgICAvLyBUZW1wb3JhcmlseSByZW1vdmUgbWFza1xuICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzaygncmVtb3ZlJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCB0aGUgY2xlYW5lZCB2YWx1ZVxuICAgICAgICAgICAgJGlucHV0LnZhbChjbGVhbmVkRGF0YSk7XG5cbiAgICAgICAgICAgIC8vIFJlYXBwbHkgdGhlIG1hc2sgYWZ0ZXIgYSBzaG9ydCBkZWxheVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgJGlucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsIHBsYWNlaG9sZGVyOiAnXyd9KTtcbiAgICAgICAgICAgICAgICAkaW5wdXQudHJpZ2dlcignaW5wdXQnKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LCAxMCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG9yIHJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGZ1bmN0aW9uYWxpdHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJhZ0FuZERyb3AoKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgdGFibGVEbkQgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS5kYXRhKCd0YWJsZURuRCcpKSB7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZS50YWJsZURuRFVwZGF0ZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHRhYmxlLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcDogKCkgPT4ge1xuICAgICAgICAgICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkcmFnSGFuZGxlOiAnLmRyYWdIYW5kbGUnXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdmlzaWJpbGl0eSBvZiBzdGF0aWMgcm91dGVzIHNlY3Rpb24uXG4gICAgICogU2VjdGlvbiBpcyBoaWRkZW4gYnkgZGVmYXVsdCBpbiBWb2x0IHRlbXBsYXRlOyBzaG93IGl0IG9uY2UgSlMgaXMgcmVhZHkuXG4gICAgICogRG9ja2VyIGhpZGluZyBpcyBoYW5kbGVkIHNlcGFyYXRlbHkgdmlhIHRoZSBwYXJlbnQgLmRvLW5vdC1zaG93LWlmLWRvY2tlciB3cmFwcGVyLlxuICAgICAqL1xuICAgIHVwZGF0ZVZpc2liaWxpdHkoKSB7XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuJHNlY3Rpb24uc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb3B5IGEgcm91dGUgcm93IChjcmVhdGUgZHVwbGljYXRlKVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkc291cmNlUm93IC0gU291cmNlIHJvdyB0byBjb3B5XG4gICAgICovXG4gICAgY29weVJvdXRlKCRzb3VyY2VSb3cpIHtcbiAgICAgICAgY29uc3Qgcm91dGVJZCA9ICRzb3VyY2VSb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpO1xuICAgICAgICBjb25zdCBzdWJuZXREcm9wZG93bklkID0gYHN1Ym5ldC1yb3V0ZS0ke3JvdXRlSWR9YDtcbiAgICAgICAgY29uc3QgaW50ZXJmYWNlRHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHtyb3V0ZUlkfWA7XG5cbiAgICAgICAgLy8gQ29sbGVjdCBkYXRhIGZyb20gc291cmNlIHJvd1xuICAgICAgICBjb25zdCByb3V0ZURhdGEgPSB7XG4gICAgICAgICAgICBuZXR3b3JrOiAkc291cmNlUm93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICBzdWJuZXQ6ICQoYCMke3N1Ym5ldERyb3Bkb3duSWR9YCkudmFsKCksXG4gICAgICAgICAgICBnYXRld2F5OiAkc291cmNlUm93LmZpbmQoJy5nYXRld2F5LWlucHV0JykudmFsKCksXG4gICAgICAgICAgICBpbnRlcmZhY2U6ICQoYCMke2ludGVyZmFjZURyb3Bkb3duSWR9YCkudmFsKCkgfHwgJycsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJHNvdXJjZVJvdy5maW5kKCcuZGVzY3JpcHRpb24taW5wdXQnKS52YWwoKVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEFkZCBuZXcgcm91dGUgd2l0aCBjb3BpZWQgZGF0YVxuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLmFkZFJvdXRlKHJvdXRlRGF0YSk7XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIGRyYWctYW5kLWRyb3AgYWZ0ZXIgYWRkaW5nIHJvdXRlXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZURyYWdBbmREcm9wKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBlbXB0eSBzdGF0ZSB2aXNpYmlsaXR5XG4gICAgICovXG4gICAgdXBkYXRlRW1wdHlTdGF0ZSgpIHtcbiAgICAgICAgY29uc3QgJGV4aXN0aW5nUm93cyA9ICQoJy5yb3V0ZS1yb3cnKTtcbiAgICAgICAgaWYgKCRleGlzdGluZ1Jvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBTaG93IGVtcHR5IHBsYWNlaG9sZGVyLCBoaWRlIHRhYmxlIGNvbnRhaW5lclxuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kZW1wdHlQbGFjZWhvbGRlci5zaG93KCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZUNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIGVtcHR5IHBsYWNlaG9sZGVyLCBzaG93IHRhYmxlIGNvbnRhaW5lclxuICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci4kZW1wdHlQbGFjZWhvbGRlci5oaWRlKCk7XG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLiR0YWJsZUNvbnRhaW5lci5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgbmV3IHJvdXRlIHJvd1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByb3V0ZURhdGEgLSBSb3V0ZSBkYXRhIChvcHRpb25hbClcbiAgICAgKi9cbiAgICBhZGRSb3V0ZShyb3V0ZURhdGEgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0ICR0ZW1wbGF0ZSA9ICQoJy5yb3V0ZS1yb3ctdGVtcGxhdGUnKS5sYXN0KCk7XG4gICAgICAgIGNvbnN0ICRuZXdSb3cgPSAkdGVtcGxhdGUuY2xvbmUodHJ1ZSk7XG4gICAgICAgIGNvbnN0IHJvdXRlSWQgPSByb3V0ZURhdGE/LmlkIHx8IGBuZXdfJHtEYXRlLm5vdygpfWA7XG5cbiAgICAgICAgJG5ld1Jvd1xuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdyb3V0ZS1yb3ctdGVtcGxhdGUnKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdyb3V0ZS1yb3cnKVxuICAgICAgICAgICAgLmF0dHIoJ2RhdGEtcm91dGUtaWQnLCByb3V0ZUlkKVxuICAgICAgICAgICAgLnNob3coKTtcblxuICAgICAgICAvLyBTZXQgdmFsdWVzIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChyb3V0ZURhdGEpIHtcbiAgICAgICAgICAgICRuZXdSb3cuZmluZCgnLm5ldHdvcmstaW5wdXQnKS52YWwocm91dGVEYXRhLm5ldHdvcmspO1xuICAgICAgICAgICAgJG5ld1Jvdy5maW5kKCcuZ2F0ZXdheS1pbnB1dCcpLnZhbChyb3V0ZURhdGEuZ2F0ZXdheSk7XG4gICAgICAgICAgICAkbmV3Um93LmZpbmQoJy5kZXNjcmlwdGlvbi1pbnB1dCcpLnZhbChyb3V0ZURhdGEuZGVzY3JpcHRpb24gfHwgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkIHRvIHRhYmxlXG4gICAgICAgIGNvbnN0ICRleGlzdGluZ1Jvd3MgPSAkKCcucm91dGUtcm93Jyk7XG4gICAgICAgIGlmICgkZXhpc3RpbmdSb3dzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgJHRlbXBsYXRlLmFmdGVyKCRuZXdSb3cpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGV4aXN0aW5nUm93cy5sYXN0KCkuYWZ0ZXIoJG5ld1Jvdyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgdGhpcyByb3dcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplU3VibmV0RHJvcGRvd24oJG5ld1Jvdywgcm91dGVEYXRhPy5zdWJuZXQgfHwgJzI0Jyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBpbnRlcmZhY2UgZHJvcGRvd24gZm9yIHRoaXMgcm93XG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIuaW5pdGlhbGl6ZUludGVyZmFjZURyb3Bkb3duKCRuZXdSb3csIHJvdXRlRGF0YT8uaW50ZXJmYWNlIHx8ICcnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGlucHV0bWFzayBmb3IgSVAgYWRkcmVzcyBmaWVsZHNcbiAgICAgICAgJG5ld1Jvdy5maW5kKCcuaXBhZGRyZXNzJykuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgcGxhY2Vob2xkZXI6ICdfJ30pO1xuXG4gICAgICAgIFN0YXRpY1JvdXRlc01hbmFnZXIudXBkYXRlUHJpb3JpdGllcygpO1xuICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZUVtcHR5U3RhdGUoKTtcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHN1Ym5ldCBkcm9wZG93biBmb3IgYSByb3V0ZSByb3dcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHJvdyAtIFJvdyBlbGVtZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdGVkVmFsdWUgLSBTZWxlY3RlZCBzdWJuZXQgdmFsdWVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU3VibmV0RHJvcGRvd24oJHJvdywgc2VsZWN0ZWRWYWx1ZSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJHJvdy5maW5kKCcuc3VibmV0LWRyb3Bkb3duLWNvbnRhaW5lcicpO1xuICAgICAgICBjb25zdCBkcm9wZG93bklkID0gYHN1Ym5ldC1yb3V0ZS0keyRyb3cuYXR0cignZGF0YS1yb3V0ZS1pZCcpfWA7XG5cbiAgICAgICAgJGNvbnRhaW5lci5odG1sKGA8aW5wdXQgdHlwZT1cImhpZGRlblwiIGlkPVwiJHtkcm9wZG93bklkfVwiIC8+YCk7XG5cbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGRyb3Bkb3duSWQsXG4gICAgICAgICAgICB7IFtkcm9wZG93bklkXTogc2VsZWN0ZWRWYWx1ZSB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IG5ldHdvcmtzLmdldFN1Ym5ldE9wdGlvbnNBcnJheSgpLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0TmV0d29ya01hc2ssXG4gICAgICAgICAgICAgICAgYWxsb3dFbXB0eTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWRkaXRpb25hbENsYXNzZXM6IFsnc2VhcmNoJ10sXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6ICgpID0+IEZvcm0uZGF0YUNoYW5nZWQoKVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGludGVyZmFjZSBkcm9wZG93biBmb3IgYSByb3V0ZSByb3dcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJHJvdyAtIFJvdyBlbGVtZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdGVkVmFsdWUgLSBTZWxlY3RlZCBpbnRlcmZhY2UgdmFsdWUgKGVtcHR5IHN0cmluZyA9IGF1dG8pXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUludGVyZmFjZURyb3Bkb3duKCRyb3csIHNlbGVjdGVkVmFsdWUpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICRyb3cuZmluZCgnLmludGVyZmFjZS1kcm9wZG93bi1jb250YWluZXInKTtcbiAgICAgICAgY29uc3QgZHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHskcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKX1gO1xuXG4gICAgICAgICRjb250YWluZXIuaHRtbChgPGlucHV0IHR5cGU9XCJoaWRkZW5cIiBpZD1cIiR7ZHJvcGRvd25JZH1cIiAvPmApO1xuXG4gICAgICAgIC8vIEJ1aWxkIGRyb3Bkb3duIG9wdGlvbnM6IFwiQXV0b1wiICsgYXZhaWxhYmxlIGludGVyZmFjZXNcbiAgICAgICAgY29uc3Qgb3B0aW9ucyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUubndfQXV0byB9LFxuICAgICAgICAgICAgLi4uU3RhdGljUm91dGVzTWFuYWdlci5hdmFpbGFibGVJbnRlcmZhY2VzLm1hcChpZmFjZSA9PiAoe1xuICAgICAgICAgICAgICAgIHZhbHVlOiBpZmFjZS52YWx1ZSxcbiAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5sYWJlbFxuICAgICAgICAgICAgfSkpXG4gICAgICAgIF07XG5cbiAgICAgICAgLy8gUHJlcGFyZSBmb3JtIGRhdGEgZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7fTtcbiAgICAgICAgZm9ybURhdGFbZHJvcGRvd25JZF0gPSBzZWxlY3RlZFZhbHVlIHx8ICcnOyAvLyBFbnN1cmUgd2UgcGFzcyBlbXB0eSBzdHJpbmcgZm9yIFwiQXV0b1wiXG5cbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKGRyb3Bkb3duSWQsXG4gICAgICAgICAgICBmb3JtRGF0YSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBvcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlLFxuICAgICAgICAgICAgICAgIGFsbG93RW1wdHk6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiAoKSA9PiBGb3JtLmRhdGFDaGFuZ2VkKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHJvdXRlIHByaW9yaXRpZXMgYmFzZWQgb24gdGFibGUgb3JkZXJcbiAgICAgKi9cbiAgICB1cGRhdGVQcmlvcml0aWVzKCkge1xuICAgICAgICAkKCcucm91dGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgJChyb3cpLmF0dHIoJ2RhdGEtcHJpb3JpdHknLCBpbmRleCArIDEpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCByb3V0ZXMgZnJvbSBkYXRhXG4gICAgICogQHBhcmFtIHtBcnJheX0gcm91dGVzRGF0YSAtIEFycmF5IG9mIHJvdXRlIG9iamVjdHNcbiAgICAgKi9cbiAgICBsb2FkUm91dGVzKHJvdXRlc0RhdGEpIHtcbiAgICAgICAgLy8gQ2xlYXIgZXhpc3Rpbmcgcm91dGVzXG4gICAgICAgICQoJy5yb3V0ZS1yb3cnKS5yZW1vdmUoKTtcblxuICAgICAgICAvLyBBZGQgZWFjaCByb3V0ZVxuICAgICAgICBpZiAocm91dGVzRGF0YSAmJiByb3V0ZXNEYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJvdXRlc0RhdGEuZm9yRWFjaChyb3V0ZSA9PiB7XG4gICAgICAgICAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5hZGRSb3V0ZShyb3V0ZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFNob3cgZW1wdHkgc3RhdGUgaWYgbm8gcm91dGVzXG4gICAgICAgICAgICBTdGF0aWNSb3V0ZXNNYW5hZ2VyLnVwZGF0ZUVtcHR5U3RhdGUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcmFnLWFuZC1kcm9wIGFmdGVyIGFkZGluZyByb3V0ZXNcbiAgICAgICAgU3RhdGljUm91dGVzTWFuYWdlci5pbml0aWFsaXplRHJhZ0FuZERyb3AoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29sbGVjdCByb3V0ZXMgZnJvbSB0YWJsZVxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygcm91dGUgb2JqZWN0c1xuICAgICAqL1xuICAgIGNvbGxlY3RSb3V0ZXMoKSB7XG4gICAgICAgIGNvbnN0IHJvdXRlcyA9IFtdO1xuICAgICAgICAkKCcucm91dGUtcm93JykuZWFjaCgoaW5kZXgsIHJvdykgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQocm93KTtcbiAgICAgICAgICAgIGNvbnN0IHJvdXRlSWQgPSAkcm93LmF0dHIoJ2RhdGEtcm91dGUtaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHN1Ym5ldERyb3Bkb3duSWQgPSBgc3VibmV0LXJvdXRlLSR7cm91dGVJZH1gO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlRHJvcGRvd25JZCA9IGBpbnRlcmZhY2Utcm91dGUtJHtyb3V0ZUlkfWA7XG5cbiAgICAgICAgICAgIHJvdXRlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICBpZDogcm91dGVJZC5zdGFydHNXaXRoKCduZXdfJykgPyBudWxsIDogcm91dGVJZCxcbiAgICAgICAgICAgICAgICBuZXR3b3JrOiAkcm93LmZpbmQoJy5uZXR3b3JrLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgc3VibmV0OiAkKGAjJHtzdWJuZXREcm9wZG93bklkfWApLnZhbCgpLFxuICAgICAgICAgICAgICAgIGdhdGV3YXk6ICRyb3cuZmluZCgnLmdhdGV3YXktaW5wdXQnKS52YWwoKSxcbiAgICAgICAgICAgICAgICBpbnRlcmZhY2U6ICQoYCMke2ludGVyZmFjZURyb3Bkb3duSWR9YCkudmFsKCkgfHwgJycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICRyb3cuZmluZCgnLmRlc2NyaXB0aW9uLWlucHV0JykudmFsKCksXG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4ICsgMVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcm91dGVzO1xuICAgIH1cbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgbmV0d29yayBzZXR0aW5ncyBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBuZXR3b3Jrcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==