"use strict";

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
    gateway: {
      optional: true,
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.nw_ValidateIppaddrNotRight
      }]
    },
    primarydns: {
      optional: true,
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.nw_ValidateIppaddrNotRight
      }]
    },
    secondarydns: {
      optional: true,
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.nw_ValidateIppaddrNotRight
      }]
    },
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
    networks.$dropDowns.dropdown(); // Handles the change event of the 'dhcp-checkbox'.

    $('.dhcp-checkbox').checkbox({
      onChange: function onChange() {
        networks.toggleDisabledFieldClass();
      }
    });
    networks.$getMyIpButton.on('click', function (e) {
      e.preventDefault();
      networks.$getMyIpButton.addClass('loading disabled');
      SysinfoAPI.getExternalIpInfo(networks.cbAfterGetExternalIp);
    }); // Delete additional network interface using REST API

    $('.delete-interface').on('click', function (e) {
      e.preventDefault();
      var $button = $(this);
      var interfaceId = $button.attr('data-value');
      $button.addClass('loading disabled');
      NetworkAPI.deleteRecord(interfaceId, function (response) {
        $button.removeClass('loading disabled');

        if (response.result) {
          window.location.reload();
        } else {
          UserMessage.showMultiString(response.messages);
        }
      });
    }); // Clear additional network settings

    $('.delete-interface-0').on('click', function () {
      var initialValues = {
        interface_0: '',
        name_0: '',
        dhcp_0: 'on',
        ipaddr_0: '',
        subnet_0: '0'
      };
      networks.$formObj.form('set values', initialValues);
      $('#interface_0').dropdown('restore defaults');
      $('#dhcp-0-checkbox').checkbox('check');
      $('#eth-interfaces-menu .item').tab('change tab', $('#eth-interfaces-menu a.item').first().attr('data-tab'));
    });
    networks.$ipaddressInput.inputmask({
      alias: 'ip',
      'placeholder': '_'
    });
    networks.initializeForm(); // Hide form elements connected with non docker installations

    if (networks.$formObj.form('get value', 'is-docker') === "1") {
      networks.$notShowOnDockerDivs.hide();
    }
  },

  /**
   * Callback function executed after getting the external IP from a remote server.
   * @param {boolean|Object} response - The response received from the server. If false, indicates an error occurred.
   */
  cbAfterGetExternalIp: function cbAfterGetExternalIp(response) {
    if (response === false) {
      networks.$getMyIpButton.removeClass('loading disabled');
    } else {
      var currentExtIpAddr = networks.$formObj.form('get value', 'extipaddr');
      var portMatch = currentExtIpAddr.match(/:(\d+)$/);
      var port = portMatch ? ':' + portMatch[1] : '';
      var newExtIpAddr = response.ip + port;
      networks.$formObj.form('set value', 'extipaddr', newExtIpAddr); // Clear external hostname when getting external IP

      networks.$formObj.form('set value', 'exthostname', '');
      networks.$extipaddr.trigger('change');
      networks.$getMyIpButton.removeClass('loading disabled');
    }
  },

  /**
   * Update NAT help text with actual port values from REST API
   * @param {object} ports - Port configuration object from API
   */
  updateNATHelpText: function updateNATHelpText(ports) {
    // Only update if we have port values from server
    if (!ports.SIP_PORT || !ports.TLS_PORT || !ports.RTP_PORT_FROM || !ports.RTP_PORT_TO) {
      return;
    } // Update SIP ports text using ID


    var $sipPortValues = $('#nat-help-sip-ports .port-values');

    if ($sipPortValues.length > 0) {
      var sipText = i18n('nw_NATInfo3', {
        'SIP_PORT': ports.SIP_PORT,
        'TLS_PORT': ports.TLS_PORT
      });
      $sipPortValues.html(sipText);
    } // Update RTP ports text using ID


    var $rtpPortValues = $('#nat-help-rtp-ports .port-values');

    if ($rtpPortValues.length > 0) {
      var rtpText = i18n('nw_NATInfo4', {
        'RTP_PORT_FROM': ports.RTP_PORT_FROM,
        'RTP_PORT_TO': ports.RTP_PORT_TO
      });
      $rtpPortValues.html(rtpText);
    }
  },

  /**
   * Update port field labels with actual internal port values from REST API
   * @param {object} ports - Port configuration object from API
   */
  updatePortLabels: function updatePortLabels(ports) {
    // Only update if we have port values from server
    if (!ports.SIP_PORT || !ports.TLS_PORT) {
      return;
    } // Update external SIP port label using ID


    var $sipLabel = $('#external-sip-port-label');

    if ($sipLabel.length > 0) {
      var sipLabelText = i18n('nw_PublicSIPPort', {
        'SIP_PORT': ports.SIP_PORT
      });
      $sipLabel.text(sipLabelText);
    } // Update external TLS port label using ID


    var $tlsLabel = $('#external-tls-port-label');

    if ($tlsLabel.length > 0) {
      var tlsLabelText = i18n('nw_PublicTLSPort', {
        'TLS_PORT': ports.TLS_PORT
      });
      $tlsLabel.text(tlsLabelText);
    }
  },

  /**
   * Toggles the 'disabled' class for specific fields based on their checkbox state.
   */
  toggleDisabledFieldClass: function toggleDisabledFieldClass() {
    $('#eth-interfaces-menu a').each(function (index, obj) {
      var eth = $(obj).attr('data-tab');

      if ($("#dhcp-".concat(eth, "-checkbox")).checkbox('is unchecked')) {
        $("#ip-address-group-".concat(eth)).removeClass('disabled');
        $("#not-dhcp-".concat(eth)).val('1');
      } else {
        $("#ip-address-group-".concat(eth)).addClass('disabled');
        $("#not-dhcp-".concat(eth)).val('');
      }

      networks.addNewFormRules(eth);
    });

    if ($('#usenat-checkbox').checkbox('is checked')) {
      $('.nated-settings-group').removeClass('disabled');
    } else {
      $('.nated-settings-group').addClass('disabled');
    }
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

    networks.validateRules[ipaddrClass] = {
      identifier: ipaddrClass,
      depends: "not-dhcp-".concat(newRowId),
      rules: [{
        type: 'empty',
        prompt: globalTranslate.nw_ValidateIppaddrIsEmpty
      }, {
        type: 'ipaddr',
        prompt: globalTranslate.nw_ValidateIppaddrNotRight
      }]
    }; // Define the class for the 'dhcp' field in the new row

    var dhcpClass = "dhcp_".concat(newRowId); // Define the form validation rules for the 'dhcp' field

    networks.validateRules[dhcpClass] = {
      identifier: dhcpClass,
      depends: "interface_".concat(newRowId),
      rules: [{
        type: "dhcpOnVlanNetworks[".concat(newRowId, "]"),
        prompt: globalTranslate.nw_ValidateDHCPOnVlansDontSupport
      }]
    };
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    console.log('cbBeforeSendForm called with settings:', settings); // Create a new object with all settings properties

    var result = Object.assign({}, settings);
    result.data = {}; // Manually collect form values to avoid any DOM-related issues
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
      var rowId = inputId.replace('dhcp-', '').replace('-checkbox', '');
      result.data["dhcp_".concat(rowId)] = $(obj).checkbox('is checked');
    }); // Ensure internet_interface is included (from dynamic dropdown)

    var internetInterfaceValue = $('#internet_interface').val();

    if (internetInterfaceValue) {
      result.data.internet_interface = String(internetInterfaceValue);
    } // Map form field names to API field names for ports


    var portFieldMapping = {
      'externalSIPPort': 'EXTERNAL_SIP_PORT',
      'externalTLSPort': 'EXTERNAL_TLS_PORT'
    }; // Apply port field mapping

    Object.keys(portFieldMapping).forEach(function (formField) {
      var apiField = portFieldMapping[formField];

      if (result.data[formField] !== undefined) {
        result.data[apiField] = result.data[formField];
        delete result.data[formField];
      }
    });
    console.log('cbBeforeSendForm returning result:', result);
    console.log('cbBeforeSendForm result.data:', result.data);
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    console.log('cbAfterSendForm called with response:', response);
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
    console.log('Loading configuration from REST API...');
    NetworkAPI.getConfig(function (response) {
      console.log('NetworkAPI.getConfig response:', response);

      if (response.result && response.data) {
        console.log('Configuration data received:', response.data);
        networks.populateForm(response.data); // Initialize UI after loading data

        networks.toggleDisabledFieldClass();
        $('#eth-interfaces-menu .item').tab(); // Hide form elements connected with non docker installations

        if (response.data.isDocker) {
          networks.$formObj.form('set value', 'is-docker', '1');
          networks.$notShowOnDockerDivs.hide();
        }
      } else {
        console.error('Failed to load configuration:', response.messages);
        UserMessage.showMultiString(response.messages);
      }
    });
  },

  /**
   * Populate form with configuration data
   */
  populateForm: function populateForm(data) {
    var _data$internetInterfa;

    console.log('populateForm called with data:', data); // Set interfaces data

    if (data.interfaces) {
      data.interfaces.forEach(function (iface) {
        var id = iface.id;
        Object.keys(iface).forEach(function (key) {
          if (key !== 'id') {
            var fieldName = "".concat(key, "_").concat(id);

            if (networks.$formObj.find("[name=\"".concat(fieldName, "\"]")).length > 0) {
              networks.$formObj.form('set value', fieldName, iface[key]);
            }
          }
        }); // Set checkbox states (boolean values from API)

        if (iface.dhcp) {
          $("#dhcp-".concat(id, "-checkbox")).checkbox('check');
        } else {
          $("#dhcp-".concat(id, "-checkbox")).checkbox('uncheck');
        }
      });
    } // Set template for new interface


    if (data.template) {
      Object.keys(data.template).forEach(function (key) {
        if (key !== 'id') {
          var fieldName = "".concat(key, "_0");

          if (networks.$formObj.find("[name=\"".concat(fieldName, "\"]")).length > 0) {
            networks.$formObj.form('set value', fieldName, data.template[key]);
          }
        }
      });
    } // Build internet interface dropdown dynamically
    // Prepare options from interfaces


    var internetInterfaceOptions = data.interfaces.map(function (iface) {
      return {
        value: iface.id.toString(),
        text: iface.name || "".concat(iface["interface"]).concat(iface.vlanid !== '0' ? ".".concat(iface.vlanid) : ''),
        name: iface.name || "".concat(iface["interface"]).concat(iface.vlanid !== '0' ? ".".concat(iface.vlanid) : '')
      };
    }); // Build dropdown with DynamicDropdownBuilder

    var formData = {
      internet_interface: ((_data$internetInterfa = data.internetInterfaceId) === null || _data$internetInterfa === void 0 ? void 0 : _data$internetInterfa.toString()) || ''
    };
    DynamicDropdownBuilder.buildDropdown('internet_interface', formData, {
      staticOptions: internetInterfaceOptions,
      placeholder: globalTranslate.nw_SelectInternetInterface
    }); // Build interface selector for new VLAN only if the field exists

    if ($('#interface_0').length > 0) {
      // Get unique physical interfaces (without VLANs)
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
    } // Set NAT settings


    if (data.nat) {
      console.log('Setting NAT settings:', data.nat); // Boolean values from API

      if (data.nat.usenat) {
        console.log('Checking usenat checkbox');
        $('#usenat-checkbox').checkbox('check');
      } else {
        console.log('Unchecking usenat checkbox');
        $('#usenat-checkbox').checkbox('uncheck');
      }

      networks.$formObj.form('set value', 'extipaddr', data.nat.extipaddr || '');
      networks.$formObj.form('set value', 'exthostname', data.nat.exthostname || ''); // autoUpdateExternalIp boolean (field name from the form)

      var $autoUpdateCheckbox = networks.$formObj.find('input[name="autoUpdateExternalIp"]').parent('.checkbox');

      if ($autoUpdateCheckbox.length > 0) {
        if (data.nat.AUTO_UPDATE_EXTERNAL_IP || data.nat.autoUpdateExternalIp) {
          console.log('Checking autoUpdateExternalIp checkbox');
          $autoUpdateCheckbox.checkbox('check');
        } else {
          console.log('Unchecking autoUpdateExternalIp checkbox');
          $autoUpdateCheckbox.checkbox('uncheck');
        }
      }
    } // Set port settings


    if (data.ports) {
      console.log('Setting port values:', data.ports); // Map API field names to form field names

      var portFieldMapping = {
        'EXTERNAL_SIP_PORT': 'externalSIPPort',
        'EXTERNAL_TLS_PORT': 'externalTLSPort',
        'SIP_PORT': 'SIP_PORT',
        'TLS_PORT': 'TLS_PORT',
        'RTP_PORT_FROM': 'RTP_PORT_FROM',
        'RTP_PORT_TO': 'RTP_PORT_TO'
      };
      Object.keys(data.ports).forEach(function (key) {
        var formFieldName = portFieldMapping[key] || key;
        var value = data.ports[key];
        console.log("Setting port field ".concat(formFieldName, " to value ").concat(value));
        networks.$formObj.form('set value', formFieldName, value);
      }); // Update the NAT help text and labels with actual port values

      networks.updateNATHelpText(data.ports);
      networks.updatePortLabels(data.ports);
    } // Set additional settings


    if (data.settings) {
      Object.keys(data.settings).forEach(function (key) {
        networks.$formObj.form('set value', key, data.settings[key]);
      });
    } // Save initial values for dirty checking


    if (Form.enableDirrity) {
      Form.saveInitialValues();
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
};
/**
 * Custom form validation rule for checking if DHCP is enabled on VLAN networks.
 * @param {string} value - The value of the input field.
 * @param {string} param - The parameter for the rule.
 * @returns {boolean} - True if the DHCP is not enabled on the VLAN network, false otherwise.
 */


$.fn.form.settings.rules.dhcpOnVlanNetworks = function (value, param) {
  var result = true;
  var vlanValue = networks.$formObj.form('get value', "vlanid_".concat(param));
  var dhcpValue = networks.$formObj.form('get value', "dhcp_".concat(param));

  if (vlanValue > 0 && dhcpValue === 'on') {
    result = false;
  }

  return result;
};
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
 *  Initialize network settings form on document ready
 */


$(document).ready(function () {
  networks.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJnYXRld2F5Iiwib3B0aW9uYWwiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCIsInByaW1hcnlkbnMiLCJzZWNvbmRhcnlkbnMiLCJleHRpcGFkZHIiLCJud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHkiLCJleHRob3N0bmFtZSIsImRlcGVuZHMiLCJpbml0aWFsaXplIiwibG9hZENvbmZpZ3VyYXRpb24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwiZHJvcGRvd24iLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZENsYXNzIiwiU3lzaW5mb0FQSSIsImdldEV4dGVybmFsSXBJbmZvIiwiY2JBZnRlckdldEV4dGVybmFsSXAiLCIkYnV0dG9uIiwiaW50ZXJmYWNlSWQiLCJhdHRyIiwiTmV0d29ya0FQSSIsImRlbGV0ZVJlY29yZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInJlbG9hZCIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJpbml0aWFsVmFsdWVzIiwiaW50ZXJmYWNlXzAiLCJuYW1lXzAiLCJkaGNwXzAiLCJpcGFkZHJfMCIsInN1Ym5ldF8wIiwiZm9ybSIsInRhYiIsImZpcnN0IiwiaW5wdXRtYXNrIiwiYWxpYXMiLCJpbml0aWFsaXplRm9ybSIsImhpZGUiLCJjdXJyZW50RXh0SXBBZGRyIiwicG9ydE1hdGNoIiwibWF0Y2giLCJwb3J0IiwibmV3RXh0SXBBZGRyIiwiaXAiLCJ0cmlnZ2VyIiwidXBkYXRlTkFUSGVscFRleHQiLCJwb3J0cyIsIlNJUF9QT1JUIiwiVExTX1BPUlQiLCJSVFBfUE9SVF9GUk9NIiwiUlRQX1BPUlRfVE8iLCIkc2lwUG9ydFZhbHVlcyIsImxlbmd0aCIsInNpcFRleHQiLCJpMThuIiwiaHRtbCIsIiRydHBQb3J0VmFsdWVzIiwicnRwVGV4dCIsInVwZGF0ZVBvcnRMYWJlbHMiLCIkc2lwTGFiZWwiLCJzaXBMYWJlbFRleHQiLCJ0ZXh0IiwiJHRsc0xhYmVsIiwidGxzTGFiZWxUZXh0IiwiZWFjaCIsImluZGV4Iiwib2JqIiwiZXRoIiwidmFsIiwiYWRkTmV3Rm9ybVJ1bGVzIiwibmV3Um93SWQiLCJuYW1lQ2xhc3MiLCJpZGVudGlmaWVyIiwibndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5IiwidmxhbkNsYXNzIiwibndfVmFsaWRhdGVWbGFuUmFuZ2UiLCJud19WYWxpZGF0ZVZsYW5Dcm9zcyIsImlwYWRkckNsYXNzIiwibndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSIsImRoY3BDbGFzcyIsIm53X1ZhbGlkYXRlREhDUE9uVmxhbnNEb250U3VwcG9ydCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNvbnNvbGUiLCJsb2ciLCJPYmplY3QiLCJhc3NpZ24iLCJkYXRhIiwiZmluZCIsIiRpbnB1dCIsIm5hbWUiLCJ2YWx1ZSIsInVuZGVmaW5lZCIsIlN0cmluZyIsIiRzZWxlY3QiLCJ1c2VuYXQiLCIkYXV0b1VwZGF0ZURpdiIsInBhcmVudCIsImF1dG9VcGRhdGVFeHRlcm5hbElwIiwiaW5wdXRJZCIsInJvd0lkIiwicmVwbGFjZSIsImludGVybmV0SW50ZXJmYWNlVmFsdWUiLCJpbnRlcm5ldF9pbnRlcmZhY2UiLCJwb3J0RmllbGRNYXBwaW5nIiwia2V5cyIsImZvckVhY2giLCJmb3JtRmllbGQiLCJhcGlGaWVsZCIsImNiQWZ0ZXJTZW5kRm9ybSIsIkZvcm0iLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImdldENvbmZpZyIsInBvcHVsYXRlRm9ybSIsImlzRG9ja2VyIiwiZXJyb3IiLCJpbnRlcmZhY2VzIiwiaWZhY2UiLCJpZCIsImtleSIsImZpZWxkTmFtZSIsImRoY3AiLCJ0ZW1wbGF0ZSIsImludGVybmV0SW50ZXJmYWNlT3B0aW9ucyIsIm1hcCIsInRvU3RyaW5nIiwidmxhbmlkIiwiZm9ybURhdGEiLCJpbnRlcm5ldEludGVyZmFjZUlkIiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJzdGF0aWNPcHRpb25zIiwicGxhY2Vob2xkZXIiLCJud19TZWxlY3RJbnRlcm5ldEludGVyZmFjZSIsInBoeXNpY2FsSW50ZXJmYWNlcyIsInBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyIsInZhbHVlcyIsIm53X1NlbGVjdEludGVyZmFjZSIsImFsbG93RW1wdHkiLCJuYXQiLCIkYXV0b1VwZGF0ZUNoZWNrYm94IiwiQVVUT19VUERBVEVfRVhURVJOQUxfSVAiLCJmb3JtRmllbGROYW1lIiwiZW5hYmxlRGlycml0eSIsInNhdmVJbml0aWFsVmFsdWVzIiwiZm4iLCJpcGFkZHIiLCJmIiwiaSIsImEiLCJpcGFkZHJXaXRoUG9ydE9wdGlvbmFsIiwiY2hlY2tWbGFuIiwidmxhblZhbHVlIiwicGFyYW0iLCJhbGxWYWx1ZXMiLCJuZXdFdGhOYW1lIiwidmxhbmlkXzAiLCJpbmRleE9mIiwiZXRoTmFtZSIsInNwbGl0IiwiaW5BcnJheSIsInB1c2giLCJkaGNwT25WbGFuTmV0d29ya3MiLCJkaGNwVmFsdWUiLCJleHRlbmFsSXBIb3N0IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYkMsRUFBQUEsY0FBYyxFQUFFQyxDQUFDLENBQUMsVUFBRCxDQURKOztBQUdiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUQsQ0FBQyxDQUFDLGVBQUQsQ0FQRTtBQVNiRSxFQUFBQSxVQUFVLEVBQUVGLENBQUMsQ0FBQyx5QkFBRCxDQVRBO0FBVWJHLEVBQUFBLFVBQVUsRUFBRUgsQ0FBQyxDQUFDLFlBQUQsQ0FWQTtBQVdiSSxFQUFBQSxlQUFlLEVBQUVKLENBQUMsQ0FBQyxZQUFELENBWEw7QUFZYkssRUFBQUEsVUFBVSxFQUFFLEVBWkM7O0FBY2I7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsb0JBQW9CLEVBQUVOLENBQUMsQ0FBQyx3QkFBRCxDQWxCVjs7QUFvQmI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJTyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsT0FBTyxFQUFFO0FBQ0xDLE1BQUFBLFFBQVEsRUFBRSxJQURMO0FBRUxDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxRQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQURHO0FBRkYsS0FERTtBQVVYQyxJQUFBQSxVQUFVLEVBQUU7QUFDUk4sTUFBQUEsUUFBUSxFQUFFLElBREY7QUFFUkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLFFBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREc7QUFGQyxLQVZEO0FBbUJYRSxJQUFBQSxZQUFZLEVBQUU7QUFDVlAsTUFBQUEsUUFBUSxFQUFFLElBREE7QUFFVkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLFFBRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUNDO0FBRjVCLE9BREc7QUFGRyxLQW5CSDtBQTRCWEcsSUFBQUEsU0FBUyxFQUFFO0FBQ1BSLE1BQUFBLFFBQVEsRUFBRSxJQURIO0FBRVBDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSx3QkFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0s7QUFGNUIsT0FERyxFQUtIO0FBQ0lQLFFBQUFBLElBQUksRUFBRSxlQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDTTtBQUY1QixPQUxHO0FBRkEsS0E1QkE7QUF5Q1hDLElBQUFBLFdBQVcsRUFBRTtBQUNUQyxNQUFBQSxPQUFPLEVBQUUsUUFEQTtBQUVUWCxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsZUFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ007QUFGNUIsT0FERztBQUZFO0FBekNGLEdBekJGOztBQTZFYjtBQUNKO0FBQ0E7QUFDSUcsRUFBQUEsVUFoRmEsd0JBZ0ZBO0FBQ1Q7QUFDQXhCLElBQUFBLFFBQVEsQ0FBQ3lCLGlCQUFULEdBRlMsQ0FJVDs7QUFDQXZCLElBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCd0IsUUFBdEIsQ0FBK0I7QUFDM0JDLE1BQUFBLFFBRDJCLHNCQUNoQjtBQUNQM0IsUUFBQUEsUUFBUSxDQUFDNEIsd0JBQVQ7QUFDSDtBQUgwQixLQUEvQjtBQUtBNUIsSUFBQUEsUUFBUSxDQUFDSSxVQUFULENBQW9CeUIsUUFBcEIsR0FWUyxDQVlUOztBQUNBM0IsSUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FDS3dCLFFBREwsQ0FDYztBQUNOQyxNQUFBQSxRQURNLHNCQUNLO0FBQ1AzQixRQUFBQSxRQUFRLENBQUM0Qix3QkFBVDtBQUNIO0FBSEssS0FEZDtBQU9BNUIsSUFBQUEsUUFBUSxDQUFDQyxjQUFULENBQXdCNkIsRUFBeEIsQ0FBMkIsT0FBM0IsRUFBb0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3ZDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQWhDLE1BQUFBLFFBQVEsQ0FBQ0MsY0FBVCxDQUF3QmdDLFFBQXhCLENBQWlDLGtCQUFqQztBQUNBQyxNQUFBQSxVQUFVLENBQUNDLGlCQUFYLENBQTZCbkMsUUFBUSxDQUFDb0Msb0JBQXRDO0FBQ0gsS0FKRCxFQXBCUyxDQTBCVDs7QUFDQWxDLElBQUFBLENBQUMsQ0FBQyxtQkFBRCxDQUFELENBQXVCNEIsRUFBdkIsQ0FBMEIsT0FBMUIsRUFBbUMsVUFBU0MsQ0FBVCxFQUFZO0FBQzNDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxVQUFNSyxPQUFPLEdBQUduQyxDQUFDLENBQUMsSUFBRCxDQUFqQjtBQUNBLFVBQU1vQyxXQUFXLEdBQUdELE9BQU8sQ0FBQ0UsSUFBUixDQUFhLFlBQWIsQ0FBcEI7QUFFQUYsTUFBQUEsT0FBTyxDQUFDSixRQUFSLENBQWlCLGtCQUFqQjtBQUVBTyxNQUFBQSxVQUFVLENBQUNDLFlBQVgsQ0FBd0JILFdBQXhCLEVBQXFDLFVBQUNJLFFBQUQsRUFBYztBQUMvQ0wsUUFBQUEsT0FBTyxDQUFDTSxXQUFSLENBQW9CLGtCQUFwQjs7QUFFQSxZQUFJRCxRQUFRLENBQUNFLE1BQWIsRUFBcUI7QUFDakJDLFVBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsTUFBaEI7QUFDSCxTQUZELE1BRU87QUFDSEMsVUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCUCxRQUFRLENBQUNRLFFBQXJDO0FBQ0g7QUFDSixPQVJEO0FBU0gsS0FoQkQsRUEzQlMsQ0E2Q1Q7O0FBQ0FoRCxJQUFBQSxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5QjRCLEVBQXpCLENBQTRCLE9BQTVCLEVBQXFDLFlBQU07QUFDdkMsVUFBTXFCLGFBQWEsR0FBRztBQUNsQkMsUUFBQUEsV0FBVyxFQUFFLEVBREs7QUFFbEJDLFFBQUFBLE1BQU0sRUFBRSxFQUZVO0FBR2xCQyxRQUFBQSxNQUFNLEVBQUUsSUFIVTtBQUlsQkMsUUFBQUEsUUFBUSxFQUFFLEVBSlE7QUFLbEJDLFFBQUFBLFFBQVEsRUFBRTtBQUxRLE9BQXRCO0FBT0F4RCxNQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JzRCxJQUFsQixDQUF1QixZQUF2QixFQUFxQ04sYUFBckM7QUFDQWpELE1BQUFBLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0IyQixRQUFsQixDQUEyQixrQkFBM0I7QUFDQTNCLE1BQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCd0IsUUFBdEIsQ0FBK0IsT0FBL0I7QUFDQXhCLE1BQUFBLENBQUMsQ0FBQyw0QkFBRCxDQUFELENBQWdDd0QsR0FBaEMsQ0FBb0MsWUFBcEMsRUFBa0R4RCxDQUFDLENBQUMsNkJBQUQsQ0FBRCxDQUFpQ3lELEtBQWpDLEdBQXlDcEIsSUFBekMsQ0FBOEMsVUFBOUMsQ0FBbEQ7QUFDSCxLQVpEO0FBYUF2QyxJQUFBQSxRQUFRLENBQUNNLGVBQVQsQ0FBeUJzRCxTQUF6QixDQUFtQztBQUFDQyxNQUFBQSxLQUFLLEVBQUUsSUFBUjtBQUFjLHFCQUFlO0FBQTdCLEtBQW5DO0FBRUE3RCxJQUFBQSxRQUFRLENBQUM4RCxjQUFULEdBN0RTLENBK0RUOztBQUNBLFFBQUk5RCxRQUFRLENBQUNHLFFBQVQsQ0FBa0JzRCxJQUFsQixDQUF1QixXQUF2QixFQUFtQyxXQUFuQyxNQUFrRCxHQUF0RCxFQUEyRDtBQUN2RHpELE1BQUFBLFFBQVEsQ0FBQ1Esb0JBQVQsQ0FBOEJ1RCxJQUE5QjtBQUNIO0FBQ0osR0FuSlk7O0FBcUpiO0FBQ0o7QUFDQTtBQUNBO0FBQ0kzQixFQUFBQSxvQkF6SmEsZ0NBeUpRTSxRQXpKUixFQXlKa0I7QUFDM0IsUUFBSUEsUUFBUSxLQUFLLEtBQWpCLEVBQXdCO0FBQ3BCMUMsTUFBQUEsUUFBUSxDQUFDQyxjQUFULENBQXdCMEMsV0FBeEIsQ0FBb0Msa0JBQXBDO0FBQ0gsS0FGRCxNQUVPO0FBQ0gsVUFBTXFCLGdCQUFnQixHQUFHaEUsUUFBUSxDQUFDRyxRQUFULENBQWtCc0QsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0MsV0FBcEMsQ0FBekI7QUFDQSxVQUFNUSxTQUFTLEdBQUdELGdCQUFnQixDQUFDRSxLQUFqQixDQUF1QixTQUF2QixDQUFsQjtBQUNBLFVBQU1DLElBQUksR0FBR0YsU0FBUyxHQUFHLE1BQU1BLFNBQVMsQ0FBQyxDQUFELENBQWxCLEdBQXdCLEVBQTlDO0FBQ0EsVUFBTUcsWUFBWSxHQUFHMUIsUUFBUSxDQUFDMkIsRUFBVCxHQUFjRixJQUFuQztBQUNBbkUsTUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCc0QsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0MsV0FBcEMsRUFBaURXLFlBQWpELEVBTEcsQ0FNSDs7QUFDQXBFLE1BQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNELElBQWxCLENBQXVCLFdBQXZCLEVBQW9DLGFBQXBDLEVBQW1ELEVBQW5EO0FBQ0F6RCxNQUFBQSxRQUFRLENBQUNLLFVBQVQsQ0FBb0JpRSxPQUFwQixDQUE0QixRQUE1QjtBQUNBdEUsTUFBQUEsUUFBUSxDQUFDQyxjQUFULENBQXdCMEMsV0FBeEIsQ0FBb0Msa0JBQXBDO0FBQ0g7QUFDSixHQXZLWTs7QUF5S2I7QUFDSjtBQUNBO0FBQ0E7QUFDSTRCLEVBQUFBLGlCQTdLYSw2QkE2S0tDLEtBN0tMLEVBNktZO0FBQ3JCO0FBQ0EsUUFBSSxDQUFDQSxLQUFLLENBQUNDLFFBQVAsSUFBbUIsQ0FBQ0QsS0FBSyxDQUFDRSxRQUExQixJQUFzQyxDQUFDRixLQUFLLENBQUNHLGFBQTdDLElBQThELENBQUNILEtBQUssQ0FBQ0ksV0FBekUsRUFBc0Y7QUFDbEY7QUFDSCxLQUpvQixDQU1yQjs7O0FBQ0EsUUFBTUMsY0FBYyxHQUFHM0UsQ0FBQyxDQUFDLGtDQUFELENBQXhCOztBQUNBLFFBQUkyRSxjQUFjLENBQUNDLE1BQWYsR0FBd0IsQ0FBNUIsRUFBK0I7QUFDM0IsVUFBTUMsT0FBTyxHQUFHQyxJQUFJLENBQUMsYUFBRCxFQUFnQjtBQUNoQyxvQkFBWVIsS0FBSyxDQUFDQyxRQURjO0FBRWhDLG9CQUFZRCxLQUFLLENBQUNFO0FBRmMsT0FBaEIsQ0FBcEI7QUFJQUcsTUFBQUEsY0FBYyxDQUFDSSxJQUFmLENBQW9CRixPQUFwQjtBQUNILEtBZG9CLENBZ0JyQjs7O0FBQ0EsUUFBTUcsY0FBYyxHQUFHaEYsQ0FBQyxDQUFDLGtDQUFELENBQXhCOztBQUNBLFFBQUlnRixjQUFjLENBQUNKLE1BQWYsR0FBd0IsQ0FBNUIsRUFBK0I7QUFDM0IsVUFBTUssT0FBTyxHQUFHSCxJQUFJLENBQUMsYUFBRCxFQUFnQjtBQUNoQyx5QkFBaUJSLEtBQUssQ0FBQ0csYUFEUztBQUVoQyx1QkFBZUgsS0FBSyxDQUFDSTtBQUZXLE9BQWhCLENBQXBCO0FBSUFNLE1BQUFBLGNBQWMsQ0FBQ0QsSUFBZixDQUFvQkUsT0FBcEI7QUFDSDtBQUNKLEdBdE1ZOztBQXdNYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkE1TWEsNEJBNE1JWixLQTVNSixFQTRNVztBQUNwQjtBQUNBLFFBQUksQ0FBQ0EsS0FBSyxDQUFDQyxRQUFQLElBQW1CLENBQUNELEtBQUssQ0FBQ0UsUUFBOUIsRUFBd0M7QUFDcEM7QUFDSCxLQUptQixDQU1wQjs7O0FBQ0EsUUFBTVcsU0FBUyxHQUFHbkYsQ0FBQyxDQUFDLDBCQUFELENBQW5COztBQUNBLFFBQUltRixTQUFTLENBQUNQLE1BQVYsR0FBbUIsQ0FBdkIsRUFBMEI7QUFDdEIsVUFBTVEsWUFBWSxHQUFHTixJQUFJLENBQUMsa0JBQUQsRUFBcUI7QUFDMUMsb0JBQVlSLEtBQUssQ0FBQ0M7QUFEd0IsT0FBckIsQ0FBekI7QUFHQVksTUFBQUEsU0FBUyxDQUFDRSxJQUFWLENBQWVELFlBQWY7QUFDSCxLQWJtQixDQWVwQjs7O0FBQ0EsUUFBTUUsU0FBUyxHQUFHdEYsQ0FBQyxDQUFDLDBCQUFELENBQW5COztBQUNBLFFBQUlzRixTQUFTLENBQUNWLE1BQVYsR0FBbUIsQ0FBdkIsRUFBMEI7QUFDdEIsVUFBTVcsWUFBWSxHQUFHVCxJQUFJLENBQUMsa0JBQUQsRUFBcUI7QUFDMUMsb0JBQVlSLEtBQUssQ0FBQ0U7QUFEd0IsT0FBckIsQ0FBekI7QUFHQWMsTUFBQUEsU0FBUyxDQUFDRCxJQUFWLENBQWVFLFlBQWY7QUFDSDtBQUNKLEdBbk9ZOztBQXFPYjtBQUNKO0FBQ0E7QUFDSTdELEVBQUFBLHdCQXhPYSxzQ0F3T2M7QUFDdkIxQixJQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0QndGLElBQTVCLENBQWlDLFVBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUM3QyxVQUFNQyxHQUFHLEdBQUczRixDQUFDLENBQUMwRixHQUFELENBQUQsQ0FBT3JELElBQVAsQ0FBWSxVQUFaLENBQVo7O0FBQ0EsVUFBSXJDLENBQUMsaUJBQVUyRixHQUFWLGVBQUQsQ0FBMkJuRSxRQUEzQixDQUFvQyxjQUFwQyxDQUFKLEVBQXlEO0FBQ3JEeEIsUUFBQUEsQ0FBQyw2QkFBc0IyRixHQUF0QixFQUFELENBQThCbEQsV0FBOUIsQ0FBMEMsVUFBMUM7QUFDQXpDLFFBQUFBLENBQUMscUJBQWMyRixHQUFkLEVBQUQsQ0FBc0JDLEdBQXRCLENBQTBCLEdBQTFCO0FBQ0gsT0FIRCxNQUdPO0FBQ0g1RixRQUFBQSxDQUFDLDZCQUFzQjJGLEdBQXRCLEVBQUQsQ0FBOEI1RCxRQUE5QixDQUF1QyxVQUF2QztBQUNBL0IsUUFBQUEsQ0FBQyxxQkFBYzJGLEdBQWQsRUFBRCxDQUFzQkMsR0FBdEIsQ0FBMEIsRUFBMUI7QUFDSDs7QUFDRDlGLE1BQUFBLFFBQVEsQ0FBQytGLGVBQVQsQ0FBeUJGLEdBQXpCO0FBQ0gsS0FWRDs7QUFZQSxRQUFJM0YsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0J3QixRQUF0QixDQUErQixZQUEvQixDQUFKLEVBQWtEO0FBQzlDeEIsTUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkJ5QyxXQUEzQixDQUF1QyxVQUF2QztBQUNILEtBRkQsTUFFTztBQUNIekMsTUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkIrQixRQUEzQixDQUFvQyxVQUFwQztBQUNIO0FBQ0osR0ExUFk7O0FBNFBiO0FBQ0o7QUFDQTtBQUNBO0FBQ0k4RCxFQUFBQSxlQWhRYSwyQkFnUUdDLFFBaFFILEVBZ1FhO0FBRXRCO0FBQ0EsUUFBTUMsU0FBUyxrQkFBV0QsUUFBWCxDQUFmLENBSHNCLENBS3RCOztBQUNBaEcsSUFBQUEsUUFBUSxDQUFDUyxhQUFULENBQXVCd0YsU0FBdkIsSUFBb0M7QUFDaENDLE1BQUFBLFVBQVUsRUFBRUQsU0FEb0I7QUFFaEMxRSxNQUFBQSxPQUFPLHNCQUFleUUsUUFBZixDQUZ5QjtBQUdoQ3BGLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDb0Y7QUFGNUIsT0FERztBQUh5QixLQUFwQyxDQU5zQixDQWtCdEI7O0FBQ0EsUUFBTUMsU0FBUyxvQkFBYUosUUFBYixDQUFmLENBbkJzQixDQXNCdEI7O0FBQ0FoRyxJQUFBQSxRQUFRLENBQUNTLGFBQVQsQ0FBdUIyRixTQUF2QixJQUFvQztBQUNoQzdFLE1BQUFBLE9BQU8sc0JBQWV5RSxRQUFmLENBRHlCO0FBRWhDRSxNQUFBQSxVQUFVLEVBQUVFLFNBRm9CO0FBR2hDeEYsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLGtCQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDc0Y7QUFGNUIsT0FERyxFQUtIO0FBQ0l4RixRQUFBQSxJQUFJLHNCQUFlbUYsUUFBZixNQURSO0FBRUlsRixRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ3VGO0FBRjVCLE9BTEc7QUFIeUIsS0FBcEMsQ0F2QnNCLENBdUN0Qjs7QUFDQSxRQUFNQyxXQUFXLG9CQUFhUCxRQUFiLENBQWpCLENBeENzQixDQTBDdEI7O0FBQ0FoRyxJQUFBQSxRQUFRLENBQUNTLGFBQVQsQ0FBdUI4RixXQUF2QixJQUFzQztBQUNsQ0wsTUFBQUEsVUFBVSxFQUFFSyxXQURzQjtBQUVsQ2hGLE1BQUFBLE9BQU8scUJBQWN5RSxRQUFkLENBRjJCO0FBR2xDcEYsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUN5RjtBQUY1QixPQURHLEVBS0g7QUFDSTNGLFFBQUFBLElBQUksRUFBRSxRQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDQztBQUY1QixPQUxHO0FBSDJCLEtBQXRDLENBM0NzQixDQTBEdEI7O0FBQ0EsUUFBTXlGLFNBQVMsa0JBQVdULFFBQVgsQ0FBZixDQTNEc0IsQ0E2RHRCOztBQUNBaEcsSUFBQUEsUUFBUSxDQUFDUyxhQUFULENBQXVCZ0csU0FBdkIsSUFBb0M7QUFDaENQLE1BQUFBLFVBQVUsRUFBRU8sU0FEb0I7QUFFaENsRixNQUFBQSxPQUFPLHNCQUFleUUsUUFBZixDQUZ5QjtBQUdoQ3BGLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksK0JBQXdCbUYsUUFBeEIsTUFEUjtBQUVJbEYsUUFBQUEsTUFBTSxFQUFFQyxlQUFlLENBQUMyRjtBQUY1QixPQURHO0FBSHlCLEtBQXBDO0FBV0gsR0F6VVk7O0FBMlViO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBaFZhLDRCQWdWSUMsUUFoVkosRUFnVmM7QUFDdkJDLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLHdDQUFaLEVBQXNERixRQUF0RCxFQUR1QixDQUd2Qjs7QUFDQSxRQUFNaEUsTUFBTSxHQUFHbUUsTUFBTSxDQUFDQyxNQUFQLENBQWMsRUFBZCxFQUFrQkosUUFBbEIsQ0FBZjtBQUNBaEUsSUFBQUEsTUFBTSxDQUFDcUUsSUFBUCxHQUFjLEVBQWQsQ0FMdUIsQ0FPdkI7QUFDQTs7QUFDQWpILElBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQitHLElBQWxCLENBQXVCLDBFQUF2QixFQUFtR3hCLElBQW5HLENBQXdHLFlBQVc7QUFDL0csVUFBTXlCLE1BQU0sR0FBR2pILENBQUMsQ0FBQyxJQUFELENBQWhCO0FBQ0EsVUFBTWtILElBQUksR0FBR0QsTUFBTSxDQUFDNUUsSUFBUCxDQUFZLE1BQVosQ0FBYjs7QUFDQSxVQUFJNkUsSUFBSixFQUFVO0FBQ04sWUFBTUMsS0FBSyxHQUFHRixNQUFNLENBQUNyQixHQUFQLEVBQWQsQ0FETSxDQUVOOztBQUNBbEQsUUFBQUEsTUFBTSxDQUFDcUUsSUFBUCxDQUFZRyxJQUFaLElBQXFCQyxLQUFLLEtBQUssSUFBVixJQUFrQkEsS0FBSyxLQUFLQyxTQUE3QixHQUEwQ0MsTUFBTSxDQUFDRixLQUFELENBQWhELEdBQTBELEVBQTlFO0FBQ0g7QUFDSixLQVJELEVBVHVCLENBbUJ2Qjs7QUFDQXJILElBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQitHLElBQWxCLENBQXVCLFFBQXZCLEVBQWlDeEIsSUFBakMsQ0FBc0MsWUFBVztBQUM3QyxVQUFNOEIsT0FBTyxHQUFHdEgsQ0FBQyxDQUFDLElBQUQsQ0FBakI7QUFDQSxVQUFNa0gsSUFBSSxHQUFHSSxPQUFPLENBQUNqRixJQUFSLENBQWEsTUFBYixDQUFiOztBQUNBLFVBQUk2RSxJQUFKLEVBQVU7QUFDTixZQUFNQyxLQUFLLEdBQUdHLE9BQU8sQ0FBQzFCLEdBQVIsRUFBZCxDQURNLENBRU47O0FBQ0FsRCxRQUFBQSxNQUFNLENBQUNxRSxJQUFQLENBQVlHLElBQVosSUFBcUJDLEtBQUssS0FBSyxJQUFWLElBQWtCQSxLQUFLLEtBQUtDLFNBQTdCLEdBQTBDQyxNQUFNLENBQUNGLEtBQUQsQ0FBaEQsR0FBMEQsRUFBOUU7QUFDSDtBQUNKLEtBUkQsRUFwQnVCLENBOEJ2QjtBQUNBOztBQUNBekUsSUFBQUEsTUFBTSxDQUFDcUUsSUFBUCxDQUFZUSxNQUFaLEdBQXFCdkgsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0J3QixRQUF0QixDQUErQixZQUEvQixDQUFyQixDQWhDdUIsQ0FrQ3ZCOztBQUNBLFFBQU1nRyxjQUFjLEdBQUcxSCxRQUFRLENBQUNHLFFBQVQsQ0FBa0IrRyxJQUFsQixDQUF1QixvQ0FBdkIsRUFBNkRTLE1BQTdELENBQW9FLFdBQXBFLENBQXZCOztBQUNBLFFBQUlELGNBQWMsQ0FBQzVDLE1BQWYsR0FBd0IsQ0FBNUIsRUFBK0I7QUFDM0JsQyxNQUFBQSxNQUFNLENBQUNxRSxJQUFQLENBQVlXLG9CQUFaLEdBQW1DRixjQUFjLENBQUNoRyxRQUFmLENBQXdCLFlBQXhCLENBQW5DO0FBQ0gsS0FGRCxNQUVPO0FBQ0hrQixNQUFBQSxNQUFNLENBQUNxRSxJQUFQLENBQVlXLG9CQUFaLEdBQW1DLEtBQW5DO0FBQ0gsS0F4Q3NCLENBMEN2Qjs7O0FBQ0E1SCxJQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0IrRyxJQUFsQixDQUF1QixnQkFBdkIsRUFBeUN4QixJQUF6QyxDQUE4QyxVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDMUQsVUFBTWlDLE9BQU8sR0FBRzNILENBQUMsQ0FBQzBGLEdBQUQsQ0FBRCxDQUFPckQsSUFBUCxDQUFZLElBQVosQ0FBaEI7QUFDQSxVQUFNdUYsS0FBSyxHQUFHRCxPQUFPLENBQUNFLE9BQVIsQ0FBZ0IsT0FBaEIsRUFBeUIsRUFBekIsRUFBNkJBLE9BQTdCLENBQXFDLFdBQXJDLEVBQWtELEVBQWxELENBQWQ7QUFDQW5GLE1BQUFBLE1BQU0sQ0FBQ3FFLElBQVAsZ0JBQW9CYSxLQUFwQixLQUErQjVILENBQUMsQ0FBQzBGLEdBQUQsQ0FBRCxDQUFPbEUsUUFBUCxDQUFnQixZQUFoQixDQUEvQjtBQUNILEtBSkQsRUEzQ3VCLENBaUR2Qjs7QUFDQSxRQUFNc0csc0JBQXNCLEdBQUc5SCxDQUFDLENBQUMscUJBQUQsQ0FBRCxDQUF5QjRGLEdBQXpCLEVBQS9COztBQUNBLFFBQUlrQyxzQkFBSixFQUE0QjtBQUN4QnBGLE1BQUFBLE1BQU0sQ0FBQ3FFLElBQVAsQ0FBWWdCLGtCQUFaLEdBQWlDVixNQUFNLENBQUNTLHNCQUFELENBQXZDO0FBQ0gsS0FyRHNCLENBdUR2Qjs7O0FBQ0EsUUFBTUUsZ0JBQWdCLEdBQUc7QUFDckIseUJBQW1CLG1CQURFO0FBRXJCLHlCQUFtQjtBQUZFLEtBQXpCLENBeER1QixDQTZEdkI7O0FBQ0FuQixJQUFBQSxNQUFNLENBQUNvQixJQUFQLENBQVlELGdCQUFaLEVBQThCRSxPQUE5QixDQUFzQyxVQUFBQyxTQUFTLEVBQUk7QUFDL0MsVUFBTUMsUUFBUSxHQUFHSixnQkFBZ0IsQ0FBQ0csU0FBRCxDQUFqQzs7QUFDQSxVQUFJekYsTUFBTSxDQUFDcUUsSUFBUCxDQUFZb0IsU0FBWixNQUEyQmYsU0FBL0IsRUFBMEM7QUFDdEMxRSxRQUFBQSxNQUFNLENBQUNxRSxJQUFQLENBQVlxQixRQUFaLElBQXdCMUYsTUFBTSxDQUFDcUUsSUFBUCxDQUFZb0IsU0FBWixDQUF4QjtBQUNBLGVBQU96RixNQUFNLENBQUNxRSxJQUFQLENBQVlvQixTQUFaLENBQVA7QUFDSDtBQUNKLEtBTkQ7QUFRQXhCLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLG9DQUFaLEVBQWtEbEUsTUFBbEQ7QUFDQWlFLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLCtCQUFaLEVBQTZDbEUsTUFBTSxDQUFDcUUsSUFBcEQ7QUFFQSxXQUFPckUsTUFBUDtBQUNILEdBMVpZOztBQTRaYjtBQUNKO0FBQ0E7QUFDQTtBQUNJMkYsRUFBQUEsZUFoYWEsMkJBZ2FHN0YsUUFoYUgsRUFnYWE7QUFDdEJtRSxJQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSx1Q0FBWixFQUFxRHBFLFFBQXJEO0FBQ0gsR0FsYVk7O0FBb2FiO0FBQ0o7QUFDQTtBQUNJb0IsRUFBQUEsY0F2YWEsNEJBdWFJO0FBQ2IwRSxJQUFBQSxJQUFJLENBQUNySSxRQUFMLEdBQWdCSCxRQUFRLENBQUNHLFFBQXpCO0FBQ0FxSSxJQUFBQSxJQUFJLENBQUNDLEdBQUwsR0FBVyxHQUFYLENBRmEsQ0FFRzs7QUFDaEJELElBQUFBLElBQUksQ0FBQy9ILGFBQUwsR0FBcUJULFFBQVEsQ0FBQ1MsYUFBOUIsQ0FIYSxDQUdnQzs7QUFDN0MrSCxJQUFBQSxJQUFJLENBQUM3QixnQkFBTCxHQUF3QjNHLFFBQVEsQ0FBQzJHLGdCQUFqQyxDQUphLENBSXNDOztBQUNuRDZCLElBQUFBLElBQUksQ0FBQ0QsZUFBTCxHQUF1QnZJLFFBQVEsQ0FBQ3VJLGVBQWhDLENBTGEsQ0FLb0M7QUFFakQ7O0FBQ0FDLElBQUFBLElBQUksQ0FBQ0UsV0FBTCxDQUFpQkMsT0FBakIsR0FBMkIsSUFBM0I7QUFDQUgsSUFBQUEsSUFBSSxDQUFDRSxXQUFMLENBQWlCRSxTQUFqQixHQUE2QnBHLFVBQTdCO0FBQ0FnRyxJQUFBQSxJQUFJLENBQUNFLFdBQUwsQ0FBaUJHLFVBQWpCLEdBQThCLFlBQTlCLENBVmEsQ0FZYjs7QUFDQUwsSUFBQUEsSUFBSSxDQUFDTSxtQkFBTCxhQUE4QkMsYUFBOUI7QUFDQVAsSUFBQUEsSUFBSSxDQUFDUSxvQkFBTCxhQUErQkQsYUFBL0I7QUFFQVAsSUFBQUEsSUFBSSxDQUFDaEgsVUFBTDtBQUNILEdBeGJZOztBQTBiYjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsaUJBN2JhLCtCQTZiTztBQUNoQm9GLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLHdDQUFaO0FBQ0F0RSxJQUFBQSxVQUFVLENBQUN5RyxTQUFYLENBQXFCLFVBQUN2RyxRQUFELEVBQWM7QUFDL0JtRSxNQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxnQ0FBWixFQUE4Q3BFLFFBQTlDOztBQUNBLFVBQUlBLFFBQVEsQ0FBQ0UsTUFBVCxJQUFtQkYsUUFBUSxDQUFDdUUsSUFBaEMsRUFBc0M7QUFDbENKLFFBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLDhCQUFaLEVBQTRDcEUsUUFBUSxDQUFDdUUsSUFBckQ7QUFDQWpILFFBQUFBLFFBQVEsQ0FBQ2tKLFlBQVQsQ0FBc0J4RyxRQUFRLENBQUN1RSxJQUEvQixFQUZrQyxDQUlsQzs7QUFDQWpILFFBQUFBLFFBQVEsQ0FBQzRCLHdCQUFUO0FBQ0ExQixRQUFBQSxDQUFDLENBQUMsNEJBQUQsQ0FBRCxDQUFnQ3dELEdBQWhDLEdBTmtDLENBUWxDOztBQUNBLFlBQUloQixRQUFRLENBQUN1RSxJQUFULENBQWNrQyxRQUFsQixFQUE0QjtBQUN4Qm5KLFVBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNELElBQWxCLENBQXVCLFdBQXZCLEVBQW9DLFdBQXBDLEVBQWlELEdBQWpEO0FBQ0F6RCxVQUFBQSxRQUFRLENBQUNRLG9CQUFULENBQThCdUQsSUFBOUI7QUFDSDtBQUNKLE9BYkQsTUFhTztBQUNIOEMsUUFBQUEsT0FBTyxDQUFDdUMsS0FBUixDQUFjLCtCQUFkLEVBQStDMUcsUUFBUSxDQUFDUSxRQUF4RDtBQUNBRixRQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJQLFFBQVEsQ0FBQ1EsUUFBckM7QUFDSDtBQUNKLEtBbkJEO0FBb0JILEdBbmRZOztBQXFkYjtBQUNKO0FBQ0E7QUFDSWdHLEVBQUFBLFlBeGRhLHdCQXdkQWpDLElBeGRBLEVBd2RNO0FBQUE7O0FBQ2ZKLElBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLGdDQUFaLEVBQThDRyxJQUE5QyxFQURlLENBRWY7O0FBQ0EsUUFBSUEsSUFBSSxDQUFDb0MsVUFBVCxFQUFxQjtBQUNqQnBDLE1BQUFBLElBQUksQ0FBQ29DLFVBQUwsQ0FBZ0JqQixPQUFoQixDQUF3QixVQUFBa0IsS0FBSyxFQUFJO0FBQzdCLFlBQU1DLEVBQUUsR0FBR0QsS0FBSyxDQUFDQyxFQUFqQjtBQUNBeEMsUUFBQUEsTUFBTSxDQUFDb0IsSUFBUCxDQUFZbUIsS0FBWixFQUFtQmxCLE9BQW5CLENBQTJCLFVBQUFvQixHQUFHLEVBQUk7QUFDOUIsY0FBSUEsR0FBRyxLQUFLLElBQVosRUFBa0I7QUFDZCxnQkFBTUMsU0FBUyxhQUFNRCxHQUFOLGNBQWFELEVBQWIsQ0FBZjs7QUFDQSxnQkFBSXZKLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQitHLElBQWxCLG1CQUFpQ3VDLFNBQWpDLFVBQWdEM0UsTUFBaEQsR0FBeUQsQ0FBN0QsRUFBZ0U7QUFDNUQ5RSxjQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JzRCxJQUFsQixDQUF1QixXQUF2QixFQUFvQ2dHLFNBQXBDLEVBQStDSCxLQUFLLENBQUNFLEdBQUQsQ0FBcEQ7QUFDSDtBQUNKO0FBQ0osU0FQRCxFQUY2QixDQVc3Qjs7QUFDQSxZQUFJRixLQUFLLENBQUNJLElBQVYsRUFBZ0I7QUFDWnhKLFVBQUFBLENBQUMsaUJBQVVxSixFQUFWLGVBQUQsQ0FBMEI3SCxRQUExQixDQUFtQyxPQUFuQztBQUNILFNBRkQsTUFFTztBQUNIeEIsVUFBQUEsQ0FBQyxpQkFBVXFKLEVBQVYsZUFBRCxDQUEwQjdILFFBQTFCLENBQW1DLFNBQW5DO0FBQ0g7QUFDSixPQWpCRDtBQWtCSCxLQXRCYyxDQXdCZjs7O0FBQ0EsUUFBSXVGLElBQUksQ0FBQzBDLFFBQVQsRUFBbUI7QUFDZjVDLE1BQUFBLE1BQU0sQ0FBQ29CLElBQVAsQ0FBWWxCLElBQUksQ0FBQzBDLFFBQWpCLEVBQTJCdkIsT0FBM0IsQ0FBbUMsVUFBQW9CLEdBQUcsRUFBSTtBQUN0QyxZQUFJQSxHQUFHLEtBQUssSUFBWixFQUFrQjtBQUNkLGNBQU1DLFNBQVMsYUFBTUQsR0FBTixPQUFmOztBQUNBLGNBQUl4SixRQUFRLENBQUNHLFFBQVQsQ0FBa0IrRyxJQUFsQixtQkFBaUN1QyxTQUFqQyxVQUFnRDNFLE1BQWhELEdBQXlELENBQTdELEVBQWdFO0FBQzVEOUUsWUFBQUEsUUFBUSxDQUFDRyxRQUFULENBQWtCc0QsSUFBbEIsQ0FBdUIsV0FBdkIsRUFBb0NnRyxTQUFwQyxFQUErQ3hDLElBQUksQ0FBQzBDLFFBQUwsQ0FBY0gsR0FBZCxDQUEvQztBQUNIO0FBQ0o7QUFDSixPQVBEO0FBUUgsS0FsQ2MsQ0FvQ2Y7QUFDQTs7O0FBQ0EsUUFBTUksd0JBQXdCLEdBQUczQyxJQUFJLENBQUNvQyxVQUFMLENBQWdCUSxHQUFoQixDQUFvQixVQUFBUCxLQUFLO0FBQUEsYUFBSztBQUMzRGpDLFFBQUFBLEtBQUssRUFBRWlDLEtBQUssQ0FBQ0MsRUFBTixDQUFTTyxRQUFULEVBRG9EO0FBRTNEdkUsUUFBQUEsSUFBSSxFQUFFK0QsS0FBSyxDQUFDbEMsSUFBTixjQUFpQmtDLEtBQUssYUFBdEIsU0FBbUNBLEtBQUssQ0FBQ1MsTUFBTixLQUFpQixHQUFqQixjQUEyQlQsS0FBSyxDQUFDUyxNQUFqQyxJQUE0QyxFQUEvRSxDQUZxRDtBQUczRDNDLFFBQUFBLElBQUksRUFBRWtDLEtBQUssQ0FBQ2xDLElBQU4sY0FBaUJrQyxLQUFLLGFBQXRCLFNBQW1DQSxLQUFLLENBQUNTLE1BQU4sS0FBaUIsR0FBakIsY0FBMkJULEtBQUssQ0FBQ1MsTUFBakMsSUFBNEMsRUFBL0U7QUFIcUQsT0FBTDtBQUFBLEtBQXpCLENBQWpDLENBdENlLENBNENmOztBQUNBLFFBQU1DLFFBQVEsR0FBRztBQUNiL0IsTUFBQUEsa0JBQWtCLEVBQUUsMEJBQUFoQixJQUFJLENBQUNnRCxtQkFBTCxnRkFBMEJILFFBQTFCLE9BQXdDO0FBRC9DLEtBQWpCO0FBSUFJLElBQUFBLHNCQUFzQixDQUFDQyxhQUF2QixDQUFxQyxvQkFBckMsRUFBMkRILFFBQTNELEVBQXFFO0FBQ2pFSSxNQUFBQSxhQUFhLEVBQUVSLHdCQURrRDtBQUVqRVMsTUFBQUEsV0FBVyxFQUFFdEosZUFBZSxDQUFDdUo7QUFGb0MsS0FBckUsRUFqRGUsQ0FzRGY7O0FBQ0EsUUFBSXBLLENBQUMsQ0FBQyxjQUFELENBQUQsQ0FBa0I0RSxNQUFsQixHQUEyQixDQUEvQixFQUFrQztBQUM5QjtBQUNBLFVBQU15RixrQkFBa0IsR0FBRyxFQUEzQjtBQUNBdEQsTUFBQUEsSUFBSSxDQUFDb0MsVUFBTCxDQUFnQmpCLE9BQWhCLENBQXdCLFVBQUFrQixLQUFLLEVBQUk7QUFDN0IsWUFBSSxDQUFDaUIsa0JBQWtCLENBQUNqQixLQUFLLGFBQU4sQ0FBdkIsRUFBMEM7QUFDdENpQixVQUFBQSxrQkFBa0IsQ0FBQ2pCLEtBQUssYUFBTixDQUFsQixHQUFzQztBQUNsQ2pDLFlBQUFBLEtBQUssRUFBRWlDLEtBQUssQ0FBQ0MsRUFBTixDQUFTTyxRQUFULEVBRDJCO0FBRWxDdkUsWUFBQUEsSUFBSSxFQUFFK0QsS0FBSyxhQUZ1QjtBQUdsQ2xDLFlBQUFBLElBQUksRUFBRWtDLEtBQUs7QUFIdUIsV0FBdEM7QUFLSDtBQUNKLE9BUkQ7QUFVQSxVQUFNa0Isd0JBQXdCLEdBQUd6RCxNQUFNLENBQUMwRCxNQUFQLENBQWNGLGtCQUFkLENBQWpDO0FBRUFMLE1BQUFBLHNCQUFzQixDQUFDQyxhQUF2QixDQUFxQyxhQUFyQyxFQUFvRDtBQUFFL0csUUFBQUEsV0FBVyxFQUFFO0FBQWYsT0FBcEQsRUFBeUU7QUFDckVnSCxRQUFBQSxhQUFhLEVBQUVJLHdCQURzRDtBQUVyRUgsUUFBQUEsV0FBVyxFQUFFdEosZUFBZSxDQUFDMkosa0JBRndDO0FBR3JFQyxRQUFBQSxVQUFVLEVBQUU7QUFIeUQsT0FBekU7QUFLSCxLQTNFYyxDQTZFZjs7O0FBQ0EsUUFBSTFELElBQUksQ0FBQzJELEdBQVQsRUFBYztBQUNWL0QsTUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksdUJBQVosRUFBcUNHLElBQUksQ0FBQzJELEdBQTFDLEVBRFUsQ0FFVjs7QUFDQSxVQUFJM0QsSUFBSSxDQUFDMkQsR0FBTCxDQUFTbkQsTUFBYixFQUFxQjtBQUNqQlosUUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksMEJBQVo7QUFDQTVHLFFBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCd0IsUUFBdEIsQ0FBK0IsT0FBL0I7QUFDSCxPQUhELE1BR087QUFDSG1GLFFBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLDRCQUFaO0FBQ0E1RyxRQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQndCLFFBQXRCLENBQStCLFNBQS9CO0FBQ0g7O0FBQ0QxQixNQUFBQSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JzRCxJQUFsQixDQUF1QixXQUF2QixFQUFvQyxXQUFwQyxFQUFpRHdELElBQUksQ0FBQzJELEdBQUwsQ0FBU3pKLFNBQVQsSUFBc0IsRUFBdkU7QUFDQW5CLE1BQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNELElBQWxCLENBQXVCLFdBQXZCLEVBQW9DLGFBQXBDLEVBQW1Ed0QsSUFBSSxDQUFDMkQsR0FBTCxDQUFTdEosV0FBVCxJQUF3QixFQUEzRSxFQVhVLENBYVY7O0FBQ0EsVUFBTXVKLG1CQUFtQixHQUFHN0ssUUFBUSxDQUFDRyxRQUFULENBQWtCK0csSUFBbEIsQ0FBdUIsb0NBQXZCLEVBQTZEUyxNQUE3RCxDQUFvRSxXQUFwRSxDQUE1Qjs7QUFDQSxVQUFJa0QsbUJBQW1CLENBQUMvRixNQUFwQixHQUE2QixDQUFqQyxFQUFvQztBQUNoQyxZQUFJbUMsSUFBSSxDQUFDMkQsR0FBTCxDQUFTRSx1QkFBVCxJQUFvQzdELElBQUksQ0FBQzJELEdBQUwsQ0FBU2hELG9CQUFqRCxFQUF1RTtBQUNuRWYsVUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksd0NBQVo7QUFDQStELFVBQUFBLG1CQUFtQixDQUFDbkosUUFBcEIsQ0FBNkIsT0FBN0I7QUFDSCxTQUhELE1BR087QUFDSG1GLFVBQUFBLE9BQU8sQ0FBQ0MsR0FBUixDQUFZLDBDQUFaO0FBQ0ErRCxVQUFBQSxtQkFBbUIsQ0FBQ25KLFFBQXBCLENBQTZCLFNBQTdCO0FBQ0g7QUFDSjtBQUNKLEtBdEdjLENBd0dmOzs7QUFDQSxRQUFJdUYsSUFBSSxDQUFDekMsS0FBVCxFQUFnQjtBQUNacUMsTUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQVksc0JBQVosRUFBb0NHLElBQUksQ0FBQ3pDLEtBQXpDLEVBRFksQ0FHWjs7QUFDQSxVQUFNMEQsZ0JBQWdCLEdBQUc7QUFDckIsNkJBQXFCLGlCQURBO0FBRXJCLDZCQUFxQixpQkFGQTtBQUdyQixvQkFBWSxVQUhTO0FBSXJCLG9CQUFZLFVBSlM7QUFLckIseUJBQWlCLGVBTEk7QUFNckIsdUJBQWU7QUFOTSxPQUF6QjtBQVNBbkIsTUFBQUEsTUFBTSxDQUFDb0IsSUFBUCxDQUFZbEIsSUFBSSxDQUFDekMsS0FBakIsRUFBd0I0RCxPQUF4QixDQUFnQyxVQUFBb0IsR0FBRyxFQUFJO0FBQ25DLFlBQU11QixhQUFhLEdBQUc3QyxnQkFBZ0IsQ0FBQ3NCLEdBQUQsQ0FBaEIsSUFBeUJBLEdBQS9DO0FBQ0EsWUFBTW5DLEtBQUssR0FBR0osSUFBSSxDQUFDekMsS0FBTCxDQUFXZ0YsR0FBWCxDQUFkO0FBQ0EzQyxRQUFBQSxPQUFPLENBQUNDLEdBQVIsOEJBQWtDaUUsYUFBbEMsdUJBQTREMUQsS0FBNUQ7QUFDQXJILFFBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNELElBQWxCLENBQXVCLFdBQXZCLEVBQW9Dc0gsYUFBcEMsRUFBbUQxRCxLQUFuRDtBQUNILE9BTEQsRUFiWSxDQW9CWjs7QUFDQXJILE1BQUFBLFFBQVEsQ0FBQ3VFLGlCQUFULENBQTJCMEMsSUFBSSxDQUFDekMsS0FBaEM7QUFDQXhFLE1BQUFBLFFBQVEsQ0FBQ29GLGdCQUFULENBQTBCNkIsSUFBSSxDQUFDekMsS0FBL0I7QUFDSCxLQWhJYyxDQWtJZjs7O0FBQ0EsUUFBSXlDLElBQUksQ0FBQ0wsUUFBVCxFQUFtQjtBQUNmRyxNQUFBQSxNQUFNLENBQUNvQixJQUFQLENBQVlsQixJQUFJLENBQUNMLFFBQWpCLEVBQTJCd0IsT0FBM0IsQ0FBbUMsVUFBQW9CLEdBQUcsRUFBSTtBQUN0Q3hKLFFBQUFBLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNELElBQWxCLENBQXVCLFdBQXZCLEVBQW9DK0YsR0FBcEMsRUFBeUN2QyxJQUFJLENBQUNMLFFBQUwsQ0FBYzRDLEdBQWQsQ0FBekM7QUFDSCxPQUZEO0FBR0gsS0F2SWMsQ0F5SWY7OztBQUNBLFFBQUloQixJQUFJLENBQUN3QyxhQUFULEVBQXdCO0FBQ3BCeEMsTUFBQUEsSUFBSSxDQUFDeUMsaUJBQUw7QUFDSDtBQUNKO0FBcm1CWSxDQUFqQjtBQXdtQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQS9LLENBQUMsQ0FBQ2dMLEVBQUYsQ0FBS3pILElBQUwsQ0FBVW1ELFFBQVYsQ0FBbUJoRyxLQUFuQixDQUF5QnVLLE1BQXpCLEdBQWtDLFVBQUM5RCxLQUFELEVBQVc7QUFDekMsTUFBSXpFLE1BQU0sR0FBRyxJQUFiO0FBQ0EsTUFBTXdJLENBQUMsR0FBRy9ELEtBQUssQ0FBQ25ELEtBQU4sQ0FBWSw4Q0FBWixDQUFWOztBQUNBLE1BQUlrSCxDQUFDLElBQUksSUFBVCxFQUFlO0FBQ1h4SSxJQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNILEdBRkQsTUFFTztBQUNILFNBQUssSUFBSXlJLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUcsQ0FBcEIsRUFBdUJBLENBQUMsSUFBSSxDQUE1QixFQUErQjtBQUMzQixVQUFNQyxDQUFDLEdBQUdGLENBQUMsQ0FBQ0MsQ0FBRCxDQUFYOztBQUNBLFVBQUlDLENBQUMsR0FBRyxHQUFSLEVBQWE7QUFDVDFJLFFBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7QUFDSjs7QUFDRCxRQUFJd0ksQ0FBQyxDQUFDLENBQUQsQ0FBRCxHQUFPLEVBQVgsRUFBZTtBQUNYeEksTUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSDtBQUNKOztBQUNELFNBQU9BLE1BQVA7QUFDSCxDQWpCRDtBQW1CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQTFDLENBQUMsQ0FBQ2dMLEVBQUYsQ0FBS3pILElBQUwsQ0FBVW1ELFFBQVYsQ0FBbUJoRyxLQUFuQixDQUF5QjJLLHNCQUF6QixHQUFrRCxVQUFDbEUsS0FBRCxFQUFXO0FBQ3pELE1BQUl6RSxNQUFNLEdBQUcsSUFBYjtBQUNBLE1BQU13SSxDQUFDLEdBQUcvRCxLQUFLLENBQUNuRCxLQUFOLENBQVksd0RBQVosQ0FBVjs7QUFDQSxNQUFJa0gsQ0FBQyxJQUFJLElBQVQsRUFBZTtBQUNYeEksSUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSCxHQUZELE1BRU87QUFDSCxTQUFLLElBQUl5SSxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHLENBQXBCLEVBQXVCQSxDQUFDLElBQUksQ0FBNUIsRUFBK0I7QUFDM0IsVUFBTUMsQ0FBQyxHQUFHRixDQUFDLENBQUNDLENBQUQsQ0FBWDs7QUFDQSxVQUFJQyxDQUFDLEdBQUcsR0FBUixFQUFhO0FBQ1QxSSxRQUFBQSxNQUFNLEdBQUcsS0FBVDtBQUNIO0FBQ0o7O0FBQ0QsUUFBSXdJLENBQUMsQ0FBQyxDQUFELENBQUQsR0FBTyxFQUFYLEVBQWU7QUFDWHhJLE1BQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7QUFDSjs7QUFDRCxTQUFPQSxNQUFQO0FBQ0gsQ0FqQkQ7QUFvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQTFDLENBQUMsQ0FBQ2dMLEVBQUYsQ0FBS3pILElBQUwsQ0FBVW1ELFFBQVYsQ0FBbUJoRyxLQUFuQixDQUF5QjRLLFNBQXpCLEdBQXFDLFVBQUNDLFNBQUQsRUFBWUMsS0FBWixFQUFzQjtBQUN2RCxNQUFJOUksTUFBTSxHQUFHLElBQWI7QUFDQSxNQUFNckMsVUFBVSxHQUFHLEVBQW5CO0FBQ0EsTUFBTW9MLFNBQVMsR0FBRzNMLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNELElBQWxCLENBQXVCLFlBQXZCLENBQWxCOztBQUNBLE1BQUlrSSxTQUFTLENBQUN2SSxXQUFWLEtBQTBCa0UsU0FBMUIsSUFBdUNxRSxTQUFTLENBQUN2SSxXQUFWLEdBQXdCLENBQW5FLEVBQXNFO0FBQ2xFLFFBQU13SSxVQUFVLEdBQUdELFNBQVMscUJBQWNBLFNBQVMsQ0FBQ3ZJLFdBQXhCLEVBQTVCO0FBQ0E3QyxJQUFBQSxVQUFVLENBQUNxTCxVQUFELENBQVYsR0FBeUIsQ0FBQ0QsU0FBUyxDQUFDRSxRQUFYLENBQXpCOztBQUNBLFFBQUlGLFNBQVMsQ0FBQ0UsUUFBVixLQUF1QixFQUEzQixFQUErQjtBQUMzQmpKLE1BQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7QUFDSjs7QUFDRDFDLEVBQUFBLENBQUMsQ0FBQ3dGLElBQUYsQ0FBT2lHLFNBQVAsRUFBa0IsVUFBQ2hHLEtBQUQsRUFBUTBCLEtBQVIsRUFBa0I7QUFDaEMsUUFBSTFCLEtBQUssS0FBSyxhQUFWLElBQTJCQSxLQUFLLEtBQUssVUFBekMsRUFBcUQ7O0FBQ3JELFFBQUlBLEtBQUssQ0FBQ21HLE9BQU4sQ0FBYyxRQUFkLEtBQTJCLENBQS9CLEVBQWtDO0FBQzlCLFVBQU1DLE9BQU8sR0FBR0osU0FBUyxxQkFBY2hHLEtBQUssQ0FBQ3FHLEtBQU4sQ0FBWSxHQUFaLEVBQWlCLENBQWpCLENBQWQsRUFBekI7O0FBQ0EsVUFBSTlMLENBQUMsQ0FBQytMLE9BQUYsQ0FBVTVFLEtBQVYsRUFBaUI5RyxVQUFVLENBQUN3TCxPQUFELENBQTNCLEtBQXlDLENBQXpDLElBQ0dOLFNBQVMsS0FBS3BFLEtBRGpCLElBRUdxRSxLQUFLLEtBQUsvRixLQUFLLENBQUNxRyxLQUFOLENBQVksR0FBWixFQUFpQixDQUFqQixDQUZqQixFQUVzQztBQUNsQ3BKLFFBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0gsT0FKRCxNQUlPO0FBQ0gsWUFBSSxFQUFFbUosT0FBTyxJQUFJeEwsVUFBYixDQUFKLEVBQThCO0FBQzFCQSxVQUFBQSxVQUFVLENBQUN3TCxPQUFELENBQVYsR0FBc0IsRUFBdEI7QUFDSDs7QUFDRHhMLFFBQUFBLFVBQVUsQ0FBQ3dMLE9BQUQsQ0FBVixDQUFvQkcsSUFBcEIsQ0FBeUI3RSxLQUF6QjtBQUNIO0FBQ0o7QUFDSixHQWZEO0FBZ0JBLFNBQU96RSxNQUFQO0FBQ0gsQ0E1QkQ7QUE4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQTFDLENBQUMsQ0FBQ2dMLEVBQUYsQ0FBS3pILElBQUwsQ0FBVW1ELFFBQVYsQ0FBbUJoRyxLQUFuQixDQUF5QnVMLGtCQUF6QixHQUE4QyxVQUFDOUUsS0FBRCxFQUFRcUUsS0FBUixFQUFrQjtBQUM1RCxNQUFJOUksTUFBTSxHQUFHLElBQWI7QUFDQSxNQUFNNkksU0FBUyxHQUFHekwsUUFBUSxDQUFDRyxRQUFULENBQWtCc0QsSUFBbEIsQ0FBdUIsV0FBdkIsbUJBQThDaUksS0FBOUMsRUFBbEI7QUFDQSxNQUFNVSxTQUFTLEdBQUdwTSxRQUFRLENBQUNHLFFBQVQsQ0FBa0JzRCxJQUFsQixDQUF1QixXQUF2QixpQkFBNENpSSxLQUE1QyxFQUFsQjs7QUFDQSxNQUFJRCxTQUFTLEdBQUcsQ0FBWixJQUFpQlcsU0FBUyxLQUFLLElBQW5DLEVBQXlDO0FBQ3JDeEosSUFBQUEsTUFBTSxHQUFHLEtBQVQ7QUFDSDs7QUFDRCxTQUFPQSxNQUFQO0FBQ0gsQ0FSRDtBQVVBO0FBQ0E7QUFDQTtBQUNBOzs7QUFDQTFDLENBQUMsQ0FBQ2dMLEVBQUYsQ0FBS3pILElBQUwsQ0FBVW1ELFFBQVYsQ0FBbUJoRyxLQUFuQixDQUF5QnlMLGFBQXpCLEdBQXlDLFlBQU07QUFDM0MsTUFBTVYsU0FBUyxHQUFHM0wsUUFBUSxDQUFDRyxRQUFULENBQWtCc0QsSUFBbEIsQ0FBdUIsWUFBdkIsQ0FBbEI7O0FBQ0EsTUFBSWtJLFNBQVMsQ0FBQ2xFLE1BQVYsS0FBcUIsSUFBekIsRUFBK0I7QUFDM0IsUUFBSWtFLFNBQVMsQ0FBQ3JLLFdBQVYsS0FBMEIsRUFBMUIsSUFBZ0NxSyxTQUFTLENBQUN4SyxTQUFWLEtBQXdCLEVBQTVELEVBQWdFO0FBQzVELGFBQU8sS0FBUDtBQUNIO0FBQ0o7O0FBQ0QsU0FBTyxJQUFQO0FBQ0gsQ0FSRDtBQVdBO0FBQ0E7QUFDQTs7O0FBQ0FqQixDQUFDLENBQUNvTSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCdk0sRUFBQUEsUUFBUSxDQUFDd0IsVUFBVDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN5c2luZm9BUEksIE5ldHdvcmtBUEksIFVzZXJNZXNzYWdlLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBuZXR3b3JrIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBuZXR3b3Jrc1xuICovXG5jb25zdCBuZXR3b3JrcyA9IHtcbiAgICAkZ2V0TXlJcEJ1dHRvbjogJCgnI2dldG15aXAnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNuZXR3b3JrLWZvcm0nKSxcblxuICAgICRkcm9wRG93bnM6ICQoJyNuZXR3b3JrLWZvcm0gLmRyb3Bkb3duJyksXG4gICAgJGV4dGlwYWRkcjogJCgnI2V4dGlwYWRkcicpLFxuICAgICRpcGFkZHJlc3NJbnB1dDogJCgnLmlwYWRkcmVzcycpLFxuICAgIHZsYW5zQXJyYXk6IHt9LFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnRzIHdpdGggd2Ugc2hvdWxkIGhpZGUgZnJvbSB0aGUgZm9ybSBmb3IgZG9ja2VyIGluc3RhbGxhdGlvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub3RTaG93T25Eb2NrZXJEaXZzOiAkKCcuZG8tbm90LXNob3ctaWYtZG9ja2VyJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZ2F0ZXdheToge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwcmltYXJ5ZG5zOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlY29uZGFyeWRuczoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRpcGFkZHI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHJXaXRoUG9ydE9wdGlvbmFsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0aG9zdG5hbWU6IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICd1c2VuYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG5ldHdvcmsgc2V0dGluZ3MgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBMb2FkIGNvbmZpZ3VyYXRpb24gdmlhIFJFU1QgQVBJXG4gICAgICAgIG5ldHdvcmtzLmxvYWRDb25maWd1cmF0aW9uKCk7XG5cbiAgICAgICAgLy8gSGFuZGxlcyB0aGUgY2hhbmdlIGV2ZW50IG9mIHRoZSAndXNlbmF0LWNoZWNrYm94Jy5cbiAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIG5ldHdvcmtzLiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBIYW5kbGVzIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlICdkaGNwLWNoZWNrYm94Jy5cbiAgICAgICAgJCgnLmRoY3AtY2hlY2tib3gnKVxuICAgICAgICAgICAgLmNoZWNrYm94KHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgU3lzaW5mb0FQSS5nZXRFeHRlcm5hbElwSW5mbyhuZXR3b3Jrcy5jYkFmdGVyR2V0RXh0ZXJuYWxJcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBhZGRpdGlvbmFsIG5ldHdvcmsgaW50ZXJmYWNlIHVzaW5nIFJFU1QgQVBJXG4gICAgICAgICQoJy5kZWxldGUtaW50ZXJmYWNlJykub24oJ2NsaWNrJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpbnRlcmZhY2VJZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuXG4gICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIE5ldHdvcmtBUEkuZGVsZXRlUmVjb3JkKGludGVyZmFjZUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDbGVhciBhZGRpdGlvbmFsIG5ldHdvcmsgc2V0dGluZ3NcbiAgICAgICAgJCgnLmRlbGV0ZS1pbnRlcmZhY2UtMCcpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGluaXRpYWxWYWx1ZXMgPSB7XG4gICAgICAgICAgICAgICAgaW50ZXJmYWNlXzA6ICcnLFxuICAgICAgICAgICAgICAgIG5hbWVfMDogJycsXG4gICAgICAgICAgICAgICAgZGhjcF8wOiAnb24nLFxuICAgICAgICAgICAgICAgIGlwYWRkcl8wOiAnJyxcbiAgICAgICAgICAgICAgICBzdWJuZXRfMDogJzAnLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBpbml0aWFsVmFsdWVzKTtcbiAgICAgICAgICAgICQoJyNpbnRlcmZhY2VfMCcpLmRyb3Bkb3duKCdyZXN0b3JlIGRlZmF1bHRzJyk7XG4gICAgICAgICAgICAkKCcjZGhjcC0wLWNoZWNrYm94JykuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLnRhYignY2hhbmdlIHRhYicsICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEuaXRlbScpLmZpcnN0KCkuYXR0cignZGF0YS10YWInKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBuZXR3b3Jrcy4kaXBhZGRyZXNzSW5wdXQuaW5wdXRtYXNrKHthbGlhczogJ2lwJywgJ3BsYWNlaG9sZGVyJzogJ18nfSk7XG5cbiAgICAgICAgbmV0d29ya3MuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBIaWRlIGZvcm0gZWxlbWVudHMgY29ubmVjdGVkIHdpdGggbm9uIGRvY2tlciBpbnN0YWxsYXRpb25zXG4gICAgICAgIGlmIChuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdpcy1kb2NrZXInKT09PVwiMVwiKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZXhlY3V0ZWQgYWZ0ZXIgZ2V0dGluZyB0aGUgZXh0ZXJuYWwgSVAgZnJvbSBhIHJlbW90ZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufE9iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgcmVjZWl2ZWQgZnJvbSB0aGUgc2VydmVyLiBJZiBmYWxzZSwgaW5kaWNhdGVzIGFuIGVycm9yIG9jY3VycmVkLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRFeHRlcm5hbElwKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50RXh0SXBBZGRyID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGlwYWRkcicpO1xuICAgICAgICAgICAgY29uc3QgcG9ydE1hdGNoID0gY3VycmVudEV4dElwQWRkci5tYXRjaCgvOihcXGQrKSQvKTtcbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBwb3J0TWF0Y2ggPyAnOicgKyBwb3J0TWF0Y2hbMV0gOiAnJztcbiAgICAgICAgICAgIGNvbnN0IG5ld0V4dElwQWRkciA9IHJlc3BvbnNlLmlwICsgcG9ydDtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRpcGFkZHInLCBuZXdFeHRJcEFkZHIpO1xuICAgICAgICAgICAgLy8gQ2xlYXIgZXh0ZXJuYWwgaG9zdG5hbWUgd2hlbiBnZXR0aW5nIGV4dGVybmFsIElQXG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aG9zdG5hbWUnLCAnJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZXh0aXBhZGRyLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgTkFUIGhlbHAgdGV4dCB3aXRoIGFjdHVhbCBwb3J0IHZhbHVlcyBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBvcnRzIC0gUG9ydCBjb25maWd1cmF0aW9uIG9iamVjdCBmcm9tIEFQSVxuICAgICAqL1xuICAgIHVwZGF0ZU5BVEhlbHBUZXh0KHBvcnRzKSB7XG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHdlIGhhdmUgcG9ydCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgaWYgKCFwb3J0cy5TSVBfUE9SVCB8fCAhcG9ydHMuVExTX1BPUlQgfHwgIXBvcnRzLlJUUF9QT1JUX0ZST00gfHwgIXBvcnRzLlJUUF9QT1JUX1RPKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgU0lQIHBvcnRzIHRleHQgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHNpcFBvcnRWYWx1ZXMgPSAkKCcjbmF0LWhlbHAtc2lwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJHNpcFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3Qgc2lwVGV4dCA9IGkxOG4oJ253X05BVEluZm8zJywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUF9QT1JULFxuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzaXBQb3J0VmFsdWVzLmh0bWwoc2lwVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgUlRQIHBvcnRzIHRleHQgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHJ0cFBvcnRWYWx1ZXMgPSAkKCcjbmF0LWhlbHAtcnRwLXBvcnRzIC5wb3J0LXZhbHVlcycpO1xuICAgICAgICBpZiAoJHJ0cFBvcnRWYWx1ZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgcnRwVGV4dCA9IGkxOG4oJ253X05BVEluZm80Jywge1xuICAgICAgICAgICAgICAgICdSVFBfUE9SVF9GUk9NJzogcG9ydHMuUlRQX1BPUlRfRlJPTSxcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfVE8nOiBwb3J0cy5SVFBfUE9SVF9UT1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkcnRwUG9ydFZhbHVlcy5odG1sKHJ0cFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwb3J0IGZpZWxkIGxhYmVscyB3aXRoIGFjdHVhbCBpbnRlcm5hbCBwb3J0IHZhbHVlcyBmcm9tIFJFU1QgQVBJXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBvcnRzIC0gUG9ydCBjb25maWd1cmF0aW9uIG9iamVjdCBmcm9tIEFQSVxuICAgICAqL1xuICAgIHVwZGF0ZVBvcnRMYWJlbHMocG9ydHMpIHtcbiAgICAgICAgLy8gT25seSB1cGRhdGUgaWYgd2UgaGF2ZSBwb3J0IHZhbHVlcyBmcm9tIHNlcnZlclxuICAgICAgICBpZiAoIXBvcnRzLlNJUF9QT1JUIHx8ICFwb3J0cy5UTFNfUE9SVCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGV4dGVybmFsIFNJUCBwb3J0IGxhYmVsIHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRzaXBMYWJlbCA9ICQoJyNleHRlcm5hbC1zaXAtcG9ydC1sYWJlbCcpO1xuICAgICAgICBpZiAoJHNpcExhYmVsLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcExhYmVsVGV4dCA9IGkxOG4oJ253X1B1YmxpY1NJUFBvcnQnLCB7XG4gICAgICAgICAgICAgICAgJ1NJUF9QT1JUJzogcG9ydHMuU0lQX1BPUlRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHNpcExhYmVsLnRleHQoc2lwTGFiZWxUZXh0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBleHRlcm5hbCBUTFMgcG9ydCBsYWJlbCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkdGxzTGFiZWwgPSAkKCcjZXh0ZXJuYWwtdGxzLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCR0bHNMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCB0bHNMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNUTFNQb3J0Jywge1xuICAgICAgICAgICAgICAgICdUTFNfUE9SVCc6IHBvcnRzLlRMU19QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICR0bHNMYWJlbC50ZXh0KHRsc0xhYmVsVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgJ2Rpc2FibGVkJyBjbGFzcyBmb3Igc3BlY2lmaWMgZmllbGRzIGJhc2VkIG9uIHRoZWlyIGNoZWNrYm94IHN0YXRlLlxuICAgICAqL1xuICAgIHRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpIHtcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgYScpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGV0aCA9ICQob2JqKS5hdHRyKCdkYXRhLXRhYicpO1xuICAgICAgICAgICAgaWYgKCQoYCNkaGNwLSR7ZXRofS1jaGVja2JveGApLmNoZWNrYm94KCdpcyB1bmNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICQoYCNpcC1hZGRyZXNzLWdyb3VwLSR7ZXRofWApLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJzEnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJChgI2lwLWFkZHJlc3MtZ3JvdXAtJHtldGh9YCkuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJChgI25vdC1kaGNwLSR7ZXRofWApLnZhbCgnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXR3b3Jrcy5hZGROZXdGb3JtUnVsZXMoZXRoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCQoJyN1c2VuYXQtY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJy5uYXRlZC1zZXR0aW5ncy1ncm91cCcpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgbmV3IGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgYSBzcGVjaWZpYyByb3cgaW4gdGhlIG5ldHdvcmsgY29uZmlndXJhdGlvbiBmb3JtLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdSb3dJZCAtIFRoZSBJRCBvZiB0aGUgbmV3IHJvdyB0byBhZGQgdGhlIGZvcm0gcnVsZXMgZm9yLlxuICAgICAqL1xuICAgIGFkZE5ld0Zvcm1SdWxlcyhuZXdSb3dJZCkge1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAnbmFtZScgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgbmFtZUNsYXNzID0gYG5hbWVfJHtuZXdSb3dJZH1gO1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ25hbWUnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbbmFtZUNsYXNzXSA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IG5hbWVDbGFzcyxcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlTmFtZUlzTm90QmVFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcblxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAndmxhbmlkJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCB2bGFuQ2xhc3MgPSBgdmxhbmlkXyR7bmV3Um93SWR9YDtcblxuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGRcbiAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1t2bGFuQ2xhc3NdID0ge1xuICAgICAgICAgICAgZGVwZW5kczogYGludGVyZmFjZV8ke25ld1Jvd0lkfWAsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiB2bGFuQ2xhc3MsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMC4uNDA5NV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZVZsYW5SYW5nZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogYGNoZWNrVmxhblske25ld1Jvd0lkfV1gLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZVZsYW5Dcm9zcyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcblxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAnaXBhZGRyJyBmaWVsZCBpbiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCBpcGFkZHJDbGFzcyA9IGBpcGFkZHJfJHtuZXdSb3dJZH1gO1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ2lwYWRkcicgZmllbGRcbiAgICAgICAgbmV0d29ya3MudmFsaWRhdGVSdWxlc1tpcGFkZHJDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBpcGFkZHJDbGFzcyxcbiAgICAgICAgICAgIGRlcGVuZHM6IGBub3QtZGhjcC0ke25ld1Jvd0lkfWAsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgY2xhc3MgZm9yIHRoZSAnZGhjcCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgZGhjcENsYXNzID0gYGRoY3BfJHtuZXdSb3dJZH1gO1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgZm9ybSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgJ2RoY3AnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbZGhjcENsYXNzXSA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IGRoY3BDbGFzcyxcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBkaGNwT25WbGFuTmV0d29ya3NbJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVESENQT25WbGFuc0RvbnRTdXBwb3J0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9O1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2NiQmVmb3JlU2VuZEZvcm0gY2FsbGVkIHdpdGggc2V0dGluZ3M6Jywgc2V0dGluZ3MpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBhIG5ldyBvYmplY3Qgd2l0aCBhbGwgc2V0dGluZ3MgcHJvcGVydGllc1xuICAgICAgICBjb25zdCByZXN1bHQgPSBPYmplY3QuYXNzaWduKHt9LCBzZXR0aW5ncyk7XG4gICAgICAgIHJlc3VsdC5kYXRhID0ge307XG5cbiAgICAgICAgLy8gTWFudWFsbHkgY29sbGVjdCBmb3JtIHZhbHVlcyB0byBhdm9pZCBhbnkgRE9NLXJlbGF0ZWQgaXNzdWVzXG4gICAgICAgIC8vIENvbGxlY3QgYWxsIHJlZ3VsYXIgaW5wdXQgZmllbGRzXG4gICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W3R5cGU9XCJ0ZXh0XCJdLCBpbnB1dFt0eXBlPVwiaGlkZGVuXCJdLCBpbnB1dFt0eXBlPVwibnVtYmVyXCJdLCB0ZXh0YXJlYScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkaW5wdXQgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRpbnB1dC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJGlucHV0LnZhbCgpO1xuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSB3ZSBvbmx5IGdldCBzdHJpbmcgdmFsdWVzXG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbbmFtZV0gPSAodmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZCkgPyBTdHJpbmcodmFsdWUpIDogJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENvbGxlY3Qgc2VsZWN0IGRyb3Bkb3duc1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdzZWxlY3QnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJHNlbGVjdCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gJHNlbGVjdC5hdHRyKCduYW1lJyk7XG4gICAgICAgICAgICBpZiAobmFtZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gJHNlbGVjdC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBnZXQgc3RyaW5nIHZhbHVlc1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW25hbWVdID0gKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb252ZXJ0IGNoZWNrYm94IHZhbHVlcyB0byBib29sZWFuXG4gICAgICAgIC8vIFBieEFwaUNsaWVudCB3aWxsIGhhbmRsZSBjb252ZXJzaW9uIHRvIHN0cmluZ3MgZm9yIGpRdWVyeVxuICAgICAgICByZXN1bHQuZGF0YS51c2VuYXQgPSAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblxuICAgICAgICAvLyBVc2UgY29ycmVjdCBmaWVsZCBuYW1lIGZyb20gdGhlIGZvcm0gKGF1dG9VcGRhdGVFeHRlcm5hbElwLCBub3QgQVVUT19VUERBVEVfRVhURVJOQUxfSVApXG4gICAgICAgIGNvbnN0ICRhdXRvVXBkYXRlRGl2ID0gbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImF1dG9VcGRhdGVFeHRlcm5hbElwXCJdJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgaWYgKCRhdXRvVXBkYXRlRGl2Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmF1dG9VcGRhdGVFeHRlcm5hbElwID0gJGF1dG9VcGRhdGVEaXYuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmF1dG9VcGRhdGVFeHRlcm5hbElwID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb252ZXJ0IERIQ1AgY2hlY2tib3hlcyB0byBib29sZWFuIGZvciBlYWNoIGludGVyZmFjZVxuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCcuZGhjcC1jaGVja2JveCcpLmVhY2goKGluZGV4LCBvYmopID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlucHV0SWQgPSAkKG9iaikuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGNvbnN0IHJvd0lkID0gaW5wdXRJZC5yZXBsYWNlKCdkaGNwLScsICcnKS5yZXBsYWNlKCctY2hlY2tib3gnLCAnJyk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YVtgZGhjcF8ke3Jvd0lkfWBdID0gJChvYmopLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEVuc3VyZSBpbnRlcm5ldF9pbnRlcmZhY2UgaXMgaW5jbHVkZWQgKGZyb20gZHluYW1pYyBkcm9wZG93bilcbiAgICAgICAgY29uc3QgaW50ZXJuZXRJbnRlcmZhY2VWYWx1ZSA9ICQoJyNpbnRlcm5ldF9pbnRlcmZhY2UnKS52YWwoKTtcbiAgICAgICAgaWYgKGludGVybmV0SW50ZXJmYWNlVmFsdWUpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmludGVybmV0X2ludGVyZmFjZSA9IFN0cmluZyhpbnRlcm5ldEludGVyZmFjZVZhbHVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hcCBmb3JtIGZpZWxkIG5hbWVzIHRvIEFQSSBmaWVsZCBuYW1lcyBmb3IgcG9ydHNcbiAgICAgICAgY29uc3QgcG9ydEZpZWxkTWFwcGluZyA9IHtcbiAgICAgICAgICAgICdleHRlcm5hbFNJUFBvcnQnOiAnRVhURVJOQUxfU0lQX1BPUlQnLFxuICAgICAgICAgICAgJ2V4dGVybmFsVExTUG9ydCc6ICdFWFRFUk5BTF9UTFNfUE9SVCdcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBBcHBseSBwb3J0IGZpZWxkIG1hcHBpbmdcbiAgICAgICAgT2JqZWN0LmtleXMocG9ydEZpZWxkTWFwcGluZykuZm9yRWFjaChmb3JtRmllbGQgPT4ge1xuICAgICAgICAgICAgY29uc3QgYXBpRmllbGQgPSBwb3J0RmllbGRNYXBwaW5nW2Zvcm1GaWVsZF07XG4gICAgICAgICAgICBpZiAocmVzdWx0LmRhdGFbZm9ybUZpZWxkXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGFbYXBpRmllbGRdID0gcmVzdWx0LmRhdGFbZm9ybUZpZWxkXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbZm9ybUZpZWxkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ2NiQmVmb3JlU2VuZEZvcm0gcmV0dXJuaW5nIHJlc3VsdDonLCByZXN1bHQpO1xuICAgICAgICBjb25zb2xlLmxvZygnY2JCZWZvcmVTZW5kRm9ybSByZXN1bHQuZGF0YTonLCByZXN1bHQuZGF0YSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjYkFmdGVyU2VuZEZvcm0gY2FsbGVkIHdpdGggcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBuZXR3b3Jrcy4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gbmV0d29ya3MudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG5ldHdvcmtzLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IE5ldHdvcmtBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlQ29uZmlnJztcblxuICAgICAgICAvLyBJbXBvcnRhbnQgc2V0dGluZ3MgZm9yIGNvcnJlY3Qgc2F2ZSBtb2RlcyBvcGVyYXRpb25cbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL2luZGV4L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfW5ldHdvcmsvbW9kaWZ5L2A7XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbmV0d29yayBjb25maWd1cmF0aW9uIHZpYSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRDb25maWd1cmF0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmxvZygnTG9hZGluZyBjb25maWd1cmF0aW9uIGZyb20gUkVTVCBBUEkuLi4nKTtcbiAgICAgICAgTmV0d29ya0FQSS5nZXRDb25maWcoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTmV0d29ya0FQSS5nZXRDb25maWcgcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0NvbmZpZ3VyYXRpb24gZGF0YSByZWNlaXZlZDonLCByZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIFVJIGFmdGVyIGxvYWRpbmcgZGF0YVxuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IC5pdGVtJykudGFiKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIGZvcm0gZWxlbWVudHMgY29ubmVjdGVkIHdpdGggbm9uIGRvY2tlciBpbnN0YWxsYXRpb25zXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuaXNEb2NrZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2lzLWRvY2tlcicsICcxJyk7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRub3RTaG93T25Eb2NrZXJEaXZzLmhpZGUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBsb2FkIGNvbmZpZ3VyYXRpb246JywgcmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggY29uZmlndXJhdGlvbiBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3BvcHVsYXRlRm9ybSBjYWxsZWQgd2l0aCBkYXRhOicsIGRhdGEpO1xuICAgICAgICAvLyBTZXQgaW50ZXJmYWNlcyBkYXRhXG4gICAgICAgIGlmIChkYXRhLmludGVyZmFjZXMpIHtcbiAgICAgICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKGlmYWNlID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBpZCA9IGlmYWNlLmlkO1xuICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKGlmYWNlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXkgIT09ICdpZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9IGAke2tleX1fJHtpZH1gO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoYFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGZpZWxkTmFtZSwgaWZhY2Vba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBjaGVja2JveCBzdGF0ZXMgKGJvb2xlYW4gdmFsdWVzIGZyb20gQVBJKVxuICAgICAgICAgICAgICAgIGlmIChpZmFjZS5kaGNwKSB7XG4gICAgICAgICAgICAgICAgICAgICQoYCNkaGNwLSR7aWR9LWNoZWNrYm94YCkuY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJChgI2RoY3AtJHtpZH0tY2hlY2tib3hgKS5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRlbXBsYXRlIGZvciBuZXcgaW50ZXJmYWNlXG4gICAgICAgIGlmIChkYXRhLnRlbXBsYXRlKSB7XG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnRlbXBsYXRlKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGtleSAhPT0gJ2lkJykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBgJHtrZXl9XzBgO1xuICAgICAgICAgICAgICAgICAgICBpZiAobmV0d29ya3MuJGZvcm1PYmouZmluZChgW25hbWU9XCIke2ZpZWxkTmFtZX1cIl1gKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCBmaWVsZE5hbWUsIGRhdGEudGVtcGxhdGVba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGludGVybmV0IGludGVyZmFjZSBkcm9wZG93biBkeW5hbWljYWxseVxuICAgICAgICAvLyBQcmVwYXJlIG9wdGlvbnMgZnJvbSBpbnRlcmZhY2VzXG4gICAgICAgIGNvbnN0IGludGVybmV0SW50ZXJmYWNlT3B0aW9ucyA9IGRhdGEuaW50ZXJmYWNlcy5tYXAoaWZhY2UgPT4gKHtcbiAgICAgICAgICAgIHZhbHVlOiBpZmFjZS5pZC50b1N0cmluZygpLFxuICAgICAgICAgICAgdGV4dDogaWZhY2UubmFtZSB8fCBgJHtpZmFjZS5pbnRlcmZhY2V9JHtpZmFjZS52bGFuaWQgIT09ICcwJyA/IGAuJHtpZmFjZS52bGFuaWR9YCA6ICcnfWAsXG4gICAgICAgICAgICBuYW1lOiBpZmFjZS5uYW1lIHx8IGAke2lmYWNlLmludGVyZmFjZX0ke2lmYWNlLnZsYW5pZCAhPT0gJzAnID8gYC4ke2lmYWNlLnZsYW5pZH1gIDogJyd9YFxuICAgICAgICB9KSk7XG5cbiAgICAgICAgLy8gQnVpbGQgZHJvcGRvd24gd2l0aCBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGNvbnN0IGZvcm1EYXRhID0ge1xuICAgICAgICAgICAgaW50ZXJuZXRfaW50ZXJmYWNlOiBkYXRhLmludGVybmV0SW50ZXJmYWNlSWQ/LnRvU3RyaW5nKCkgfHwgJydcbiAgICAgICAgfTtcblxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ2ludGVybmV0X2ludGVyZmFjZScsIGZvcm1EYXRhLCB7XG4gICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBpbnRlcm5ldEludGVyZmFjZU9wdGlvbnMsXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVybmV0SW50ZXJmYWNlXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJ1aWxkIGludGVyZmFjZSBzZWxlY3RvciBmb3IgbmV3IFZMQU4gb25seSBpZiB0aGUgZmllbGQgZXhpc3RzXG4gICAgICAgIGlmICgkKCcjaW50ZXJmYWNlXzAnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBHZXQgdW5pcXVlIHBoeXNpY2FsIGludGVyZmFjZXMgKHdpdGhvdXQgVkxBTnMpXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZXMgPSB7fTtcbiAgICAgICAgICAgIGRhdGEuaW50ZXJmYWNlcy5mb3JFYWNoKGlmYWNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdKSB7XG4gICAgICAgICAgICAgICAgICAgIHBoeXNpY2FsSW50ZXJmYWNlc1tpZmFjZS5pbnRlcmZhY2VdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGlmYWNlLmlkLnRvU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0OiBpZmFjZS5pbnRlcmZhY2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBpZmFjZS5pbnRlcmZhY2VcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgY29uc3QgcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zID0gT2JqZWN0LnZhbHVlcyhwaHlzaWNhbEludGVyZmFjZXMpO1xuXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ2ludGVyZmFjZV8wJywgeyBpbnRlcmZhY2VfMDogJycgfSwge1xuICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IHBoeXNpY2FsSW50ZXJmYWNlT3B0aW9ucyxcbiAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLm53X1NlbGVjdEludGVyZmFjZSxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBOQVQgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEubmF0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZyBOQVQgc2V0dGluZ3M6JywgZGF0YS5uYXQpO1xuICAgICAgICAgICAgLy8gQm9vbGVhbiB2YWx1ZXMgZnJvbSBBUElcbiAgICAgICAgICAgIGlmIChkYXRhLm5hdC51c2VuYXQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ2hlY2tpbmcgdXNlbmF0IGNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVW5jaGVja2luZyB1c2VuYXQgY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRpcGFkZHInLCBkYXRhLm5hdC5leHRpcGFkZHIgfHwgJycpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGhvc3RuYW1lJywgZGF0YS5uYXQuZXh0aG9zdG5hbWUgfHwgJycpO1xuXG4gICAgICAgICAgICAvLyBhdXRvVXBkYXRlRXh0ZXJuYWxJcCBib29sZWFuIChmaWVsZCBuYW1lIGZyb20gdGhlIGZvcm0pXG4gICAgICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZUNoZWNrYm94ID0gbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImF1dG9VcGRhdGVFeHRlcm5hbElwXCJdJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgIGlmICgkYXV0b1VwZGF0ZUNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5uYXQuQVVUT19VUERBVEVfRVhURVJOQUxfSVAgfHwgZGF0YS5uYXQuYXV0b1VwZGF0ZUV4dGVybmFsSXApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0NoZWNraW5nIGF1dG9VcGRhdGVFeHRlcm5hbElwIGNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1VuY2hlY2tpbmcgYXV0b1VwZGF0ZUV4dGVybmFsSXAgY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBwb3J0IHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnBvcnRzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZyBwb3J0IHZhbHVlczonLCBkYXRhLnBvcnRzKTtcblxuICAgICAgICAgICAgLy8gTWFwIEFQSSBmaWVsZCBuYW1lcyB0byBmb3JtIGZpZWxkIG5hbWVzXG4gICAgICAgICAgICBjb25zdCBwb3J0RmllbGRNYXBwaW5nID0ge1xuICAgICAgICAgICAgICAgICdFWFRFUk5BTF9TSVBfUE9SVCc6ICdleHRlcm5hbFNJUFBvcnQnLFxuICAgICAgICAgICAgICAgICdFWFRFUk5BTF9UTFNfUE9SVCc6ICdleHRlcm5hbFRMU1BvcnQnLFxuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6ICdTSVBfUE9SVCcsXG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogJ1RMU19QT1JUJyxcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6ICdSVFBfUE9SVF9GUk9NJyxcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfVE8nOiAnUlRQX1BPUlRfVE8nXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnBvcnRzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm9ybUZpZWxkTmFtZSA9IHBvcnRGaWVsZE1hcHBpbmdba2V5XSB8fCBrZXk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBkYXRhLnBvcnRzW2tleV07XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFNldHRpbmcgcG9ydCBmaWVsZCAke2Zvcm1GaWVsZE5hbWV9IHRvIHZhbHVlICR7dmFsdWV9YCk7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgZm9ybUZpZWxkTmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgTkFUIGhlbHAgdGV4dCBhbmQgbGFiZWxzIHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVOQVRIZWxwVGV4dChkYXRhLnBvcnRzKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZVBvcnRMYWJlbHMoZGF0YS5wb3J0cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYWRkaXRpb25hbCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5zZXR0aW5ncykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5zZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgZGF0YS5zZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2F2ZSBpbml0aWFsIHZhbHVlcyBmb3IgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3MuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHJXaXRoUG9ydE9wdGlvbmFsID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSg6WzAtOV0rKT8kLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIGEgZ2l2ZW4gaW50ZXJmYWNlLlxuICogQHBhcmFtIHtzdHJpbmd9IHZsYW5WYWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgVkxBTiBJRCBpbnB1dCBmaWVsZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBwYXJhbWV0ZXIgZm9yIHRoZSBydWxlLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIHRoZSBpbnRlcmZhY2UsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrVmxhbiA9ICh2bGFuVmFsdWUsIHBhcmFtKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgdmxhbnNBcnJheSA9IHt9O1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLmludGVyZmFjZV8wICE9PSB1bmRlZmluZWQgJiYgYWxsVmFsdWVzLmludGVyZmFjZV8wID4gMCkge1xuICAgICAgICBjb25zdCBuZXdFdGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHthbGxWYWx1ZXMuaW50ZXJmYWNlXzB9YF07XG4gICAgICAgIHZsYW5zQXJyYXlbbmV3RXRoTmFtZV0gPSBbYWxsVmFsdWVzLnZsYW5pZF8wXTtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy52bGFuaWRfMCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgICQuZWFjaChhbGxWYWx1ZXMsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAnaW50ZXJmYWNlXzAnIHx8IGluZGV4ID09PSAndmxhbmlkXzAnKSByZXR1cm47XG4gICAgICAgIGlmIChpbmRleC5pbmRleE9mKCd2bGFuaWQnKSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBldGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHtpbmRleC5zcGxpdCgnXycpWzFdfWBdO1xuICAgICAgICAgICAgaWYgKCQuaW5BcnJheSh2YWx1ZSwgdmxhbnNBcnJheVtldGhOYW1lXSkgPj0gMFxuICAgICAgICAgICAgICAgICYmIHZsYW5WYWx1ZSA9PT0gdmFsdWVcbiAgICAgICAgICAgICAgICAmJiBwYXJhbSA9PT0gaW5kZXguc3BsaXQoJ18nKVsxXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIShldGhOYW1lIGluIHZsYW5zQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgREhDUCBpcyBlbmFibGVkIG9uIFZMQU4gbmV0d29ya3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGlucHV0IGZpZWxkLlxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIHBhcmFtZXRlciBmb3IgdGhlIHJ1bGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBESENQIGlzIG5vdCBlbmFibGVkIG9uIHRoZSBWTEFOIG5ldHdvcmssIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmRoY3BPblZsYW5OZXR3b3JrcyA9ICh2YWx1ZSwgcGFyYW0pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCB2bGFuVmFsdWUgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgdmxhbmlkXyR7cGFyYW19YCk7XG4gICAgY29uc3QgZGhjcFZhbHVlID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGRoY3BfJHtwYXJhbX1gKTtcbiAgICBpZiAodmxhblZhbHVlID4gMCAmJiBkaGNwVmFsdWUgPT09ICdvbicpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdGhlIHByZXNlbmNlIG9mIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uIGlzIHByb3ZpZGVkIHdoZW4gTkFUIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuYWxJcEhvc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMudXNlbmF0ID09PSAnb24nKSB7XG4gICAgICAgIGlmIChhbGxWYWx1ZXMuZXh0aG9zdG5hbWUgPT09ICcnICYmIGFsbFZhbHVlcy5leHRpcGFkZHIgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogIEluaXRpYWxpemUgbmV0d29yayBzZXR0aW5ncyBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBuZXR3b3Jrcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==