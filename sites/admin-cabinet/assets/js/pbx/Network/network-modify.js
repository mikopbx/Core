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

/* global globalRootUrl,globalTranslate, Form, PbxApi, NetworkAPI, UserMessage, DynamicDropdownBuilder */

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
      PbxApi.GetExternalIp(networks.cbAfterGetExternalIp);
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
      placeholder: globalTranslate.nw_SelectInternetInterface || 'Select internet interface'
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
        placeholder: globalTranslate.nw_SelectInterface || 'Select interface',
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCIkbm90U2hvd09uRG9ja2VyRGl2cyIsInZhbGlkYXRlUnVsZXMiLCJnYXRld2F5Iiwib3B0aW9uYWwiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCIsInByaW1hcnlkbnMiLCJzZWNvbmRhcnlkbnMiLCJleHRpcGFkZHIiLCJud19WYWxpZGF0ZUV4dElwcGFkZHJOb3RSaWdodCIsIm53X1ZhbGlkYXRlRXh0SXBwYWRkck9ySG9zdElzRW1wdHkiLCJleHRob3N0bmFtZSIsImRlcGVuZHMiLCJpbml0aWFsaXplIiwibG9hZENvbmZpZ3VyYXRpb24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwiZHJvcGRvd24iLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZENsYXNzIiwiUGJ4QXBpIiwiR2V0RXh0ZXJuYWxJcCIsImNiQWZ0ZXJHZXRFeHRlcm5hbElwIiwiJGJ1dHRvbiIsImludGVyZmFjZUlkIiwiYXR0ciIsIk5ldHdvcmtBUEkiLCJkZWxldGVSZWNvcmQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwicmVzdWx0Iiwid2luZG93IiwibG9jYXRpb24iLCJyZWxvYWQiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsIm1lc3NhZ2VzIiwiaW5pdGlhbFZhbHVlcyIsImludGVyZmFjZV8wIiwibmFtZV8wIiwiZGhjcF8wIiwiaXBhZGRyXzAiLCJzdWJuZXRfMCIsImZvcm0iLCJ0YWIiLCJmaXJzdCIsImlucHV0bWFzayIsImFsaWFzIiwiaW5pdGlhbGl6ZUZvcm0iLCJoaWRlIiwiY3VycmVudEV4dElwQWRkciIsInBvcnRNYXRjaCIsIm1hdGNoIiwicG9ydCIsIm5ld0V4dElwQWRkciIsImlwIiwidHJpZ2dlciIsInVwZGF0ZU5BVEhlbHBUZXh0IiwicG9ydHMiLCJTSVBfUE9SVCIsIlRMU19QT1JUIiwiUlRQX1BPUlRfRlJPTSIsIlJUUF9QT1JUX1RPIiwiJHNpcFBvcnRWYWx1ZXMiLCJsZW5ndGgiLCJzaXBUZXh0IiwiaTE4biIsImh0bWwiLCIkcnRwUG9ydFZhbHVlcyIsInJ0cFRleHQiLCJ1cGRhdGVQb3J0TGFiZWxzIiwiJHNpcExhYmVsIiwic2lwTGFiZWxUZXh0IiwidGV4dCIsIiR0bHNMYWJlbCIsInRsc0xhYmVsVGV4dCIsImVhY2giLCJpbmRleCIsIm9iaiIsImV0aCIsInZhbCIsImFkZE5ld0Zvcm1SdWxlcyIsIm5ld1Jvd0lkIiwibmFtZUNsYXNzIiwiaWRlbnRpZmllciIsIm53X1ZhbGlkYXRlTmFtZUlzTm90QmVFbXB0eSIsInZsYW5DbGFzcyIsIm53X1ZhbGlkYXRlVmxhblJhbmdlIiwibndfVmFsaWRhdGVWbGFuQ3Jvc3MiLCJpcGFkZHJDbGFzcyIsIm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHkiLCJkaGNwQ2xhc3MiLCJud19WYWxpZGF0ZURIQ1BPblZsYW5zRG9udFN1cHBvcnQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjb25zb2xlIiwibG9nIiwiT2JqZWN0IiwiYXNzaWduIiwiZGF0YSIsImZpbmQiLCIkaW5wdXQiLCJuYW1lIiwidmFsdWUiLCJ1bmRlZmluZWQiLCJTdHJpbmciLCIkc2VsZWN0IiwidXNlbmF0IiwiJGF1dG9VcGRhdGVEaXYiLCJwYXJlbnQiLCJhdXRvVXBkYXRlRXh0ZXJuYWxJcCIsImlucHV0SWQiLCJyb3dJZCIsInJlcGxhY2UiLCJpbnRlcm5ldEludGVyZmFjZVZhbHVlIiwiaW50ZXJuZXRfaW50ZXJmYWNlIiwicG9ydEZpZWxkTWFwcGluZyIsImtleXMiLCJmb3JFYWNoIiwiZm9ybUZpZWxkIiwiYXBpRmllbGQiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJnZXRDb25maWciLCJwb3B1bGF0ZUZvcm0iLCJpc0RvY2tlciIsImVycm9yIiwiaW50ZXJmYWNlcyIsImlmYWNlIiwiaWQiLCJrZXkiLCJmaWVsZE5hbWUiLCJkaGNwIiwidGVtcGxhdGUiLCJpbnRlcm5ldEludGVyZmFjZU9wdGlvbnMiLCJtYXAiLCJ0b1N0cmluZyIsInZsYW5pZCIsImZvcm1EYXRhIiwiaW50ZXJuZXRJbnRlcmZhY2VJZCIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwic3RhdGljT3B0aW9ucyIsInBsYWNlaG9sZGVyIiwibndfU2VsZWN0SW50ZXJuZXRJbnRlcmZhY2UiLCJwaHlzaWNhbEludGVyZmFjZXMiLCJwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMiLCJ2YWx1ZXMiLCJud19TZWxlY3RJbnRlcmZhY2UiLCJhbGxvd0VtcHR5IiwibmF0IiwiJGF1dG9VcGRhdGVDaGVja2JveCIsIkFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQIiwiZm9ybUZpZWxkTmFtZSIsImVuYWJsZURpcnJpdHkiLCJzYXZlSW5pdGlhbFZhbHVlcyIsImZuIiwiaXBhZGRyIiwiZiIsImkiLCJhIiwiaXBhZGRyV2l0aFBvcnRPcHRpb25hbCIsImNoZWNrVmxhbiIsInZsYW5WYWx1ZSIsInBhcmFtIiwiYWxsVmFsdWVzIiwibmV3RXRoTmFtZSIsInZsYW5pZF8wIiwiaW5kZXhPZiIsImV0aE5hbWUiLCJzcGxpdCIsImluQXJyYXkiLCJwdXNoIiwiZGhjcE9uVmxhbk5ldHdvcmtzIiwiZGhjcFZhbHVlIiwiZXh0ZW5hbElwSG9zdCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7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aUJBQTRDaUksS0FBNUMsRUFBbEI7O0FBQ0EsTUFBSUQsU0FBUyxHQUFHLENBQVosSUFBaUJXLFNBQVMsS0FBSyxJQUFuQyxFQUF5QztBQUNyQ3hKLElBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7O0FBQ0QsU0FBT0EsTUFBUDtBQUNILENBUkQ7QUFVQTtBQUNBO0FBQ0E7QUFDQTs7O0FBQ0ExQyxDQUFDLENBQUNnTCxFQUFGLENBQUt6SCxJQUFMLENBQVVtRCxRQUFWLENBQW1CaEcsS0FBbkIsQ0FBeUJ5TCxhQUF6QixHQUF5QyxZQUFNO0FBQzNDLE1BQU1WLFNBQVMsR0FBRzNMLFFBQVEsQ0FBQ0csUUFBVCxDQUFrQnNELElBQWxCLENBQXVCLFlBQXZCLENBQWxCOztBQUNBLE1BQUlrSSxTQUFTLENBQUNsRSxNQUFWLEtBQXFCLElBQXpCLEVBQStCO0FBQzNCLFFBQUlrRSxTQUFTLENBQUNySyxXQUFWLEtBQTBCLEVBQTFCLElBQWdDcUssU0FBUyxDQUFDeEssU0FBVixLQUF3QixFQUE1RCxFQUFnRTtBQUM1RCxhQUFPLEtBQVA7QUFDSDtBQUNKOztBQUNELFNBQU8sSUFBUDtBQUNILENBUkQ7QUFXQTtBQUNBO0FBQ0E7OztBQUNBakIsQ0FBQyxDQUFDb00sUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnZNLEVBQUFBLFFBQVEsQ0FBQ3dCLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGksIE5ldHdvcmtBUEksIFVzZXJNZXNzYWdlLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBuZXR3b3JrIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBuZXR3b3Jrc1xuICovXG5jb25zdCBuZXR3b3JrcyA9IHtcbiAgICAkZ2V0TXlJcEJ1dHRvbjogJCgnI2dldG15aXAnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNuZXR3b3JrLWZvcm0nKSxcblxuICAgICRkcm9wRG93bnM6ICQoJyNuZXR3b3JrLWZvcm0gLmRyb3Bkb3duJyksXG4gICAgJGV4dGlwYWRkcjogJCgnI2V4dGlwYWRkcicpLFxuICAgICRpcGFkZHJlc3NJbnB1dDogJCgnLmlwYWRkcmVzcycpLFxuICAgIHZsYW5zQXJyYXk6IHt9LFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGVsZW1lbnRzIHdpdGggd2Ugc2hvdWxkIGhpZGUgZnJvbSB0aGUgZm9ybSBmb3IgZG9ja2VyIGluc3RhbGxhdGlvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub3RTaG93T25Eb2NrZXJEaXZzOiAkKCcuZG8tbm90LXNob3ctaWYtZG9ja2VyJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZ2F0ZXdheToge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwcmltYXJ5ZG5zOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlY29uZGFyeWRuczoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRpcGFkZHI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHJXaXRoUG9ydE9wdGlvbmFsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0aG9zdG5hbWU6IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICd1c2VuYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG5ldHdvcmsgc2V0dGluZ3MgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBMb2FkIGNvbmZpZ3VyYXRpb24gdmlhIFJFU1QgQVBJXG4gICAgICAgIG5ldHdvcmtzLmxvYWRDb25maWd1cmF0aW9uKCk7XG5cbiAgICAgICAgLy8gSGFuZGxlcyB0aGUgY2hhbmdlIGV2ZW50IG9mIHRoZSAndXNlbmF0LWNoZWNrYm94Jy5cbiAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIG5ldHdvcmtzLiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBIYW5kbGVzIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlICdkaGNwLWNoZWNrYm94Jy5cbiAgICAgICAgJCgnLmRoY3AtY2hlY2tib3gnKVxuICAgICAgICAgICAgLmNoZWNrYm94KHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgUGJ4QXBpLkdldEV4dGVybmFsSXAobmV0d29ya3MuY2JBZnRlckdldEV4dGVybmFsSXApO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZWxldGUgYWRkaXRpb25hbCBuZXR3b3JrIGludGVyZmFjZSB1c2luZyBSRVNUIEFQSVxuICAgICAgICAkKCcuZGVsZXRlLWludGVyZmFjZScpLm9uKCdjbGljaycsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblxuICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBOZXR3b3JrQVBJLmRlbGV0ZVJlY29yZChpbnRlcmZhY2VJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2xlYXIgYWRkaXRpb25hbCBuZXR3b3JrIHNldHRpbmdzXG4gICAgICAgICQoJy5kZWxldGUtaW50ZXJmYWNlLTAnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbml0aWFsVmFsdWVzID0ge1xuICAgICAgICAgICAgICAgIGludGVyZmFjZV8wOiAnJyxcbiAgICAgICAgICAgICAgICBuYW1lXzA6ICcnLFxuICAgICAgICAgICAgICAgIGRoY3BfMDogJ29uJyxcbiAgICAgICAgICAgICAgICBpcGFkZHJfMDogJycsXG4gICAgICAgICAgICAgICAgc3VibmV0XzA6ICcwJyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgaW5pdGlhbFZhbHVlcyk7XG4gICAgICAgICAgICAkKCcjaW50ZXJmYWNlXzAnKS5kcm9wZG93bigncmVzdG9yZSBkZWZhdWx0cycpO1xuICAgICAgICAgICAgJCgnI2RoY3AtMC1jaGVja2JveCcpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgLml0ZW0nKS50YWIoJ2NoYW5nZSB0YWInLCAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhLml0ZW0nKS5maXJzdCgpLmF0dHIoJ2RhdGEtdGFiJykpO1xuICAgICAgICB9KTtcbiAgICAgICAgbmV0d29ya3MuJGlwYWRkcmVzc0lucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIG5ldHdvcmtzLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSGlkZSBmb3JtIGVsZW1lbnRzIGNvbm5lY3RlZCB3aXRoIG5vbiBkb2NrZXIgaW5zdGFsbGF0aW9uc1xuICAgICAgICBpZiAobmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywnaXMtZG9ja2VyJyk9PT1cIjFcIikge1xuICAgICAgICAgICAgbmV0d29ya3MuJG5vdFNob3dPbkRvY2tlckRpdnMuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGdldHRpbmcgdGhlIGV4dGVybmFsIElQIGZyb20gYSByZW1vdGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci4gSWYgZmFsc2UsIGluZGljYXRlcyBhbiBlcnJvciBvY2N1cnJlZC5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0RXh0ZXJuYWxJcChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudEV4dElwQWRkciA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRpcGFkZHInKTtcbiAgICAgICAgICAgIGNvbnN0IHBvcnRNYXRjaCA9IGN1cnJlbnRFeHRJcEFkZHIubWF0Y2goLzooXFxkKykkLyk7XG4gICAgICAgICAgICBjb25zdCBwb3J0ID0gcG9ydE1hdGNoID8gJzonICsgcG9ydE1hdGNoWzFdIDogJyc7XG4gICAgICAgICAgICBjb25zdCBuZXdFeHRJcEFkZHIgPSByZXNwb25zZS5pcCArIHBvcnQ7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0aXBhZGRyJywgbmV3RXh0SXBBZGRyKTtcbiAgICAgICAgICAgIC8vIENsZWFyIGV4dGVybmFsIGhvc3RuYW1lIHdoZW4gZ2V0dGluZyBleHRlcm5hbCBJUFxuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGhvc3RuYW1lJywgJycpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGV4dGlwYWRkci50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIE5BVCBoZWxwIHRleHQgd2l0aCBhY3R1YWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVOQVRIZWxwVGV4dChwb3J0cykge1xuICAgICAgICAvLyBPbmx5IHVwZGF0ZSBpZiB3ZSBoYXZlIHBvcnQgdmFsdWVzIGZyb20gc2VydmVyXG4gICAgICAgIGlmICghcG9ydHMuU0lQX1BPUlQgfHwgIXBvcnRzLlRMU19QT1JUIHx8ICFwb3J0cy5SVFBfUE9SVF9GUk9NIHx8ICFwb3J0cy5SVFBfUE9SVF9UTykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFNJUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRzaXBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXNpcC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRzaXBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHNpcFRleHQgPSBpMThuKCdud19OQVRJbmZvMycsIHtcbiAgICAgICAgICAgICAgICAnU0lQX1BPUlQnOiBwb3J0cy5TSVBfUE9SVCxcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkc2lwUG9ydFZhbHVlcy5odG1sKHNpcFRleHQpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIFJUUCBwb3J0cyB0ZXh0IHVzaW5nIElEXG4gICAgICAgIGNvbnN0ICRydHBQb3J0VmFsdWVzID0gJCgnI25hdC1oZWxwLXJ0cC1wb3J0cyAucG9ydC12YWx1ZXMnKTtcbiAgICAgICAgaWYgKCRydHBQb3J0VmFsdWVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHJ0cFRleHQgPSBpMThuKCdud19OQVRJbmZvNCcsIHtcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6IHBvcnRzLlJUUF9QT1JUX0ZST00sXG4gICAgICAgICAgICAgICAgJ1JUUF9QT1JUX1RPJzogcG9ydHMuUlRQX1BPUlRfVE9cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgJHJ0cFBvcnRWYWx1ZXMuaHRtbChydHBUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcG9ydCBmaWVsZCBsYWJlbHMgd2l0aCBhY3R1YWwgaW50ZXJuYWwgcG9ydCB2YWx1ZXMgZnJvbSBSRVNUIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwb3J0cyAtIFBvcnQgY29uZmlndXJhdGlvbiBvYmplY3QgZnJvbSBBUElcbiAgICAgKi9cbiAgICB1cGRhdGVQb3J0TGFiZWxzKHBvcnRzKSB7XG4gICAgICAgIC8vIE9ubHkgdXBkYXRlIGlmIHdlIGhhdmUgcG9ydCB2YWx1ZXMgZnJvbSBzZXJ2ZXJcbiAgICAgICAgaWYgKCFwb3J0cy5TSVBfUE9SVCB8fCAhcG9ydHMuVExTX1BPUlQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBleHRlcm5hbCBTSVAgcG9ydCBsYWJlbCB1c2luZyBJRFxuICAgICAgICBjb25zdCAkc2lwTGFiZWwgPSAkKCcjZXh0ZXJuYWwtc2lwLXBvcnQtbGFiZWwnKTtcbiAgICAgICAgaWYgKCRzaXBMYWJlbC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzaXBMYWJlbFRleHQgPSBpMThuKCdud19QdWJsaWNTSVBQb3J0Jywge1xuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6IHBvcnRzLlNJUF9QT1JUXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRzaXBMYWJlbC50ZXh0KHNpcExhYmVsVGV4dCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZXh0ZXJuYWwgVExTIHBvcnQgbGFiZWwgdXNpbmcgSURcbiAgICAgICAgY29uc3QgJHRsc0xhYmVsID0gJCgnI2V4dGVybmFsLXRscy1wb3J0LWxhYmVsJyk7XG4gICAgICAgIGlmICgkdGxzTGFiZWwubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgdGxzTGFiZWxUZXh0ID0gaTE4bignbndfUHVibGljVExTUG9ydCcsIHtcbiAgICAgICAgICAgICAgICAnVExTX1BPUlQnOiBwb3J0cy5UTFNfUE9SVFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkdGxzTGFiZWwudGV4dCh0bHNMYWJlbFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlICdkaXNhYmxlZCcgY2xhc3MgZm9yIHNwZWNpZmljIGZpZWxkcyBiYXNlZCBvbiB0aGVpciBjaGVja2JveCBzdGF0ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBldGggPSAkKG9iaikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGlmICgkKGAjZGhjcC0ke2V0aH0tY2hlY2tib3hgKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAkKGAjaXAtYWRkcmVzcy1ncm91cC0ke2V0aH1gKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKGAjbm90LWRoY3AtJHtldGh9YCkudmFsKCcxJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoYCNpcC1hZGRyZXNzLWdyb3VwLSR7ZXRofWApLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuYWRkTmV3Rm9ybVJ1bGVzKGV0aCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIG5ldyBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIGEgc3BlY2lmaWMgcm93IGluIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gZm9ybS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Um93SWQgLSBUaGUgSUQgb2YgdGhlIG5ldyByb3cgdG8gYWRkIHRoZSBmb3JtIHJ1bGVzIGZvci5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ25hbWUnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IG5hbWVDbGFzcyA9IGBuYW1lXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICduYW1lJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW25hbWVDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBuYW1lQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgdmxhbkNsYXNzID0gYHZsYW5pZF8ke25ld1Jvd0lkfWA7XG5cblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbdmxhbkNsYXNzXSA9IHtcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogdmxhbkNsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjQwOTVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBjaGVja1ZsYW5bJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuQ3Jvc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2lwYWRkcicgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgaXBhZGRyQ2xhc3MgPSBgaXBhZGRyXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbaXBhZGRyQ2xhc3NdID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgbm90LWRoY3AtJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2RoY3AnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IGRoY3BDbGFzcyA9IGBkaGNwXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdkaGNwJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2RoY3BDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBkaGNwQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBgZGhjcE9uVmxhbk5ldHdvcmtzWyR7bmV3Um93SWR9XWAsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlREhDUE9uVmxhbnNEb250U3VwcG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjYkJlZm9yZVNlbmRGb3JtIGNhbGxlZCB3aXRoIHNldHRpbmdzOicsIHNldHRpbmdzKTtcblxuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgb2JqZWN0IHdpdGggYWxsIHNldHRpbmdzIHByb3BlcnRpZXNcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gT2JqZWN0LmFzc2lnbih7fSwgc2V0dGluZ3MpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHt9O1xuXG4gICAgICAgIC8vIE1hbnVhbGx5IGNvbGxlY3QgZm9ybSB2YWx1ZXMgdG8gYXZvaWQgYW55IERPTS1yZWxhdGVkIGlzc3Vlc1xuICAgICAgICAvLyBDb2xsZWN0IGFsbCByZWd1bGFyIGlucHV0IGZpZWxkc1xuICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5maW5kKCdpbnB1dFt0eXBlPVwidGV4dFwiXSwgaW5wdXRbdHlwZT1cImhpZGRlblwiXSwgaW5wdXRbdHlwZT1cIm51bWJlclwiXSwgdGV4dGFyZWEnKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGlucHV0ID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSAkaW5wdXQuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRpbnB1dC52YWwoKTtcbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgd2Ugb25seSBnZXQgc3RyaW5nIHZhbHVlc1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW25hbWVdID0gKHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQpID8gU3RyaW5nKHZhbHVlKSA6ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDb2xsZWN0IHNlbGVjdCBkcm9wZG93bnNcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnc2VsZWN0JykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWxlY3QgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9ICRzZWxlY3QuYXR0cignbmFtZScpO1xuICAgICAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9ICRzZWxlY3QudmFsKCk7XG4gICAgICAgICAgICAgICAgLy8gRW5zdXJlIHdlIG9ubHkgZ2V0IHN0cmluZyB2YWx1ZXNcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YVtuYW1lXSA9ICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSA/IFN0cmluZyh2YWx1ZSkgOiAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ29udmVydCBjaGVja2JveCB2YWx1ZXMgdG8gYm9vbGVhblxuICAgICAgICAvLyBQYnhBcGlDbGllbnQgd2lsbCBoYW5kbGUgY29udmVyc2lvbiB0byBzdHJpbmdzIGZvciBqUXVlcnlcbiAgICAgICAgcmVzdWx0LmRhdGEudXNlbmF0ID0gJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cbiAgICAgICAgLy8gVXNlIGNvcnJlY3QgZmllbGQgbmFtZSBmcm9tIHRoZSBmb3JtIChhdXRvVXBkYXRlRXh0ZXJuYWxJcCwgbm90IEFVVE9fVVBEQVRFX0VYVEVSTkFMX0lQKVxuICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZURpdiA9IG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoJ2lucHV0W25hbWU9XCJhdXRvVXBkYXRlRXh0ZXJuYWxJcFwiXScpLnBhcmVudCgnLmNoZWNrYm94Jyk7XG4gICAgICAgIGlmICgkYXV0b1VwZGF0ZURpdi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9ICRhdXRvVXBkYXRlRGl2LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5hdXRvVXBkYXRlRXh0ZXJuYWxJcCA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29udmVydCBESENQIGNoZWNrYm94ZXMgdG8gYm9vbGVhbiBmb3IgZWFjaCBpbnRlcmZhY2VcbiAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZmluZCgnLmRoY3AtY2hlY2tib3gnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbnB1dElkID0gJChvYmopLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBjb25zdCByb3dJZCA9IGlucHV0SWQucmVwbGFjZSgnZGhjcC0nLCAnJykucmVwbGFjZSgnLWNoZWNrYm94JywgJycpO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGFbYGRoY3BfJHtyb3dJZH1gXSA9ICQob2JqKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFbnN1cmUgaW50ZXJuZXRfaW50ZXJmYWNlIGlzIGluY2x1ZGVkIChmcm9tIGR5bmFtaWMgZHJvcGRvd24pXG4gICAgICAgIGNvbnN0IGludGVybmV0SW50ZXJmYWNlVmFsdWUgPSAkKCcjaW50ZXJuZXRfaW50ZXJmYWNlJykudmFsKCk7XG4gICAgICAgIGlmIChpbnRlcm5ldEludGVyZmFjZVZhbHVlKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pbnRlcm5ldF9pbnRlcmZhY2UgPSBTdHJpbmcoaW50ZXJuZXRJbnRlcmZhY2VWYWx1ZSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXAgZm9ybSBmaWVsZCBuYW1lcyB0byBBUEkgZmllbGQgbmFtZXMgZm9yIHBvcnRzXG4gICAgICAgIGNvbnN0IHBvcnRGaWVsZE1hcHBpbmcgPSB7XG4gICAgICAgICAgICAnZXh0ZXJuYWxTSVBQb3J0JzogJ0VYVEVSTkFMX1NJUF9QT1JUJyxcbiAgICAgICAgICAgICdleHRlcm5hbFRMU1BvcnQnOiAnRVhURVJOQUxfVExTX1BPUlQnXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQXBwbHkgcG9ydCBmaWVsZCBtYXBwaW5nXG4gICAgICAgIE9iamVjdC5rZXlzKHBvcnRGaWVsZE1hcHBpbmcpLmZvckVhY2goZm9ybUZpZWxkID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFwaUZpZWxkID0gcG9ydEZpZWxkTWFwcGluZ1tmb3JtRmllbGRdO1xuICAgICAgICAgICAgaWYgKHJlc3VsdC5kYXRhW2Zvcm1GaWVsZF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhW2FwaUZpZWxkXSA9IHJlc3VsdC5kYXRhW2Zvcm1GaWVsZF07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhW2Zvcm1GaWVsZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKCdjYkJlZm9yZVNlbmRGb3JtIHJldHVybmluZyByZXN1bHQ6JywgcmVzdWx0KTtcbiAgICAgICAgY29uc29sZS5sb2coJ2NiQmVmb3JlU2VuZEZvcm0gcmVzdWx0LmRhdGE6JywgcmVzdWx0LmRhdGEpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnY2JBZnRlclNlbmRGb3JtIGNhbGxlZCB3aXRoIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbmV0d29ya3MuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ldHdvcmtzLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbmV0d29ya3MuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUElcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBOZXR3b3JrQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZUNvbmZpZyc7XG5cbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9bmV0d29yay9pbmRleC9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL21vZGlmeS9gO1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG5ldHdvcmsgY29uZmlndXJhdGlvbiB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkQ29uZmlndXJhdGlvbigpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0xvYWRpbmcgY29uZmlndXJhdGlvbiBmcm9tIFJFU1QgQVBJLi4uJyk7XG4gICAgICAgIE5ldHdvcmtBUEkuZ2V0Q29uZmlnKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05ldHdvcmtBUEkuZ2V0Q29uZmlnIHJlc3BvbnNlOicsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDb25maWd1cmF0aW9uIGRhdGEgcmVjZWl2ZWQ6JywgcmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBVSSBhZnRlciBsb2FkaW5nIGRhdGFcbiAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgICAgICAkKCcjZXRoLWludGVyZmFjZXMtbWVudSAuaXRlbScpLnRhYigpO1xuXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBmb3JtIGVsZW1lbnRzIGNvbm5lY3RlZCB3aXRoIG5vbiBkb2NrZXIgaW5zdGFsbGF0aW9uc1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmlzRG9ja2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdpcy1kb2NrZXInLCAnMScpO1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kbm90U2hvd09uRG9ja2VyRGl2cy5oaWRlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gbG9hZCBjb25maWd1cmF0aW9uOicsIHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGNvbmZpZ3VyYXRpb24gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdwb3B1bGF0ZUZvcm0gY2FsbGVkIHdpdGggZGF0YTonLCBkYXRhKTtcbiAgICAgICAgLy8gU2V0IGludGVyZmFjZXMgZGF0YVxuICAgICAgICBpZiAoZGF0YS5pbnRlcmZhY2VzKSB7XG4gICAgICAgICAgICBkYXRhLmludGVyZmFjZXMuZm9yRWFjaChpZmFjZSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBpZmFjZS5pZDtcbiAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhpZmFjZSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ICE9PSAnaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSBgJHtrZXl9XyR7aWR9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXR3b3Jrcy4kZm9ybU9iai5maW5kKGBbbmFtZT1cIiR7ZmllbGROYW1lfVwiXWApLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCBmaWVsZE5hbWUsIGlmYWNlW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgY2hlY2tib3ggc3RhdGVzIChib29sZWFuIHZhbHVlcyBmcm9tIEFQSSlcbiAgICAgICAgICAgICAgICBpZiAoaWZhY2UuZGhjcCkge1xuICAgICAgICAgICAgICAgICAgICAkKGAjZGhjcC0ke2lkfS1jaGVja2JveGApLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICQoYCNkaGNwLSR7aWR9LWNoZWNrYm94YCkuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0ZW1wbGF0ZSBmb3IgbmV3IGludGVyZmFjZVxuICAgICAgICBpZiAoZGF0YS50ZW1wbGF0ZSkge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS50ZW1wbGF0ZSkuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChrZXkgIT09ICdpZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gYCR7a2V5fV8wYDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5ldHdvcmtzLiRmb3JtT2JqLmZpbmQoYFtuYW1lPVwiJHtmaWVsZE5hbWV9XCJdYCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgZmllbGROYW1lLCBkYXRhLnRlbXBsYXRlW2tleV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBpbnRlcm5ldCBpbnRlcmZhY2UgZHJvcGRvd24gZHluYW1pY2FsbHlcbiAgICAgICAgLy8gUHJlcGFyZSBvcHRpb25zIGZyb20gaW50ZXJmYWNlc1xuICAgICAgICBjb25zdCBpbnRlcm5ldEludGVyZmFjZU9wdGlvbnMgPSBkYXRhLmludGVyZmFjZXMubWFwKGlmYWNlID0+ICh7XG4gICAgICAgICAgICB2YWx1ZTogaWZhY2UuaWQudG9TdHJpbmcoKSxcbiAgICAgICAgICAgIHRleHQ6IGlmYWNlLm5hbWUgfHwgYCR7aWZhY2UuaW50ZXJmYWNlfSR7aWZhY2UudmxhbmlkICE9PSAnMCcgPyBgLiR7aWZhY2UudmxhbmlkfWAgOiAnJ31gLFxuICAgICAgICAgICAgbmFtZTogaWZhY2UubmFtZSB8fCBgJHtpZmFjZS5pbnRlcmZhY2V9JHtpZmFjZS52bGFuaWQgIT09ICcwJyA/IGAuJHtpZmFjZS52bGFuaWR9YCA6ICcnfWBcbiAgICAgICAgfSkpO1xuXG4gICAgICAgIC8vIEJ1aWxkIGRyb3Bkb3duIHdpdGggRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHtcbiAgICAgICAgICAgIGludGVybmV0X2ludGVyZmFjZTogZGF0YS5pbnRlcm5ldEludGVyZmFjZUlkPy50b1N0cmluZygpIHx8ICcnXG4gICAgICAgIH07XG5cbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCdpbnRlcm5ldF9pbnRlcmZhY2UnLCBmb3JtRGF0YSwge1xuICAgICAgICAgICAgc3RhdGljT3B0aW9uczogaW50ZXJuZXRJbnRlcmZhY2VPcHRpb25zLFxuICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5ud19TZWxlY3RJbnRlcm5ldEludGVyZmFjZSB8fCAnU2VsZWN0IGludGVybmV0IGludGVyZmFjZSdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgaW50ZXJmYWNlIHNlbGVjdG9yIGZvciBuZXcgVkxBTiBvbmx5IGlmIHRoZSBmaWVsZCBleGlzdHNcbiAgICAgICAgaWYgKCQoJyNpbnRlcmZhY2VfMCcpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEdldCB1bmlxdWUgcGh5c2ljYWwgaW50ZXJmYWNlcyAod2l0aG91dCBWTEFOcylcbiAgICAgICAgICAgIGNvbnN0IHBoeXNpY2FsSW50ZXJmYWNlcyA9IHt9O1xuICAgICAgICAgICAgZGF0YS5pbnRlcmZhY2VzLmZvckVhY2goaWZhY2UgPT4ge1xuICAgICAgICAgICAgICAgIGlmICghcGh5c2ljYWxJbnRlcmZhY2VzW2lmYWNlLmludGVyZmFjZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgcGh5c2ljYWxJbnRlcmZhY2VzW2lmYWNlLmludGVyZmFjZV0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaWZhY2UuaWQudG9TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IGlmYWNlLmludGVyZmFjZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGlmYWNlLmludGVyZmFjZVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjb25zdCBwaHlzaWNhbEludGVyZmFjZU9wdGlvbnMgPSBPYmplY3QudmFsdWVzKHBoeXNpY2FsSW50ZXJmYWNlcyk7XG5cbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bignaW50ZXJmYWNlXzAnLCB7IGludGVyZmFjZV8wOiAnJyB9LCB7XG4gICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogcGh5c2ljYWxJbnRlcmZhY2VPcHRpb25zLFxuICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUubndfU2VsZWN0SW50ZXJmYWNlIHx8ICdTZWxlY3QgaW50ZXJmYWNlJyxcbiAgICAgICAgICAgICAgICBhbGxvd0VtcHR5OiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBOQVQgc2V0dGluZ3NcbiAgICAgICAgaWYgKGRhdGEubmF0KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZyBOQVQgc2V0dGluZ3M6JywgZGF0YS5uYXQpO1xuICAgICAgICAgICAgLy8gQm9vbGVhbiB2YWx1ZXMgZnJvbSBBUElcbiAgICAgICAgICAgIGlmIChkYXRhLm5hdC51c2VuYXQpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnQ2hlY2tpbmcgdXNlbmF0IGNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgJCgnI3VzZW5hdC1jaGVja2JveCcpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnVW5jaGVja2luZyB1c2VuYXQgY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ3VuY2hlY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRpcGFkZHInLCBkYXRhLm5hdC5leHRpcGFkZHIgfHwgJycpO1xuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGhvc3RuYW1lJywgZGF0YS5uYXQuZXh0aG9zdG5hbWUgfHwgJycpO1xuXG4gICAgICAgICAgICAvLyBhdXRvVXBkYXRlRXh0ZXJuYWxJcCBib29sZWFuIChmaWVsZCBuYW1lIGZyb20gdGhlIGZvcm0pXG4gICAgICAgICAgICBjb25zdCAkYXV0b1VwZGF0ZUNoZWNrYm94ID0gbmV0d29ya3MuJGZvcm1PYmouZmluZCgnaW5wdXRbbmFtZT1cImF1dG9VcGRhdGVFeHRlcm5hbElwXCJdJykucGFyZW50KCcuY2hlY2tib3gnKTtcbiAgICAgICAgICAgIGlmICgkYXV0b1VwZGF0ZUNoZWNrYm94Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5uYXQuQVVUT19VUERBVEVfRVhURVJOQUxfSVAgfHwgZGF0YS5uYXQuYXV0b1VwZGF0ZUV4dGVybmFsSXApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ0NoZWNraW5nIGF1dG9VcGRhdGVFeHRlcm5hbElwIGNoZWNrYm94Jyk7XG4gICAgICAgICAgICAgICAgICAgICRhdXRvVXBkYXRlQ2hlY2tib3guY2hlY2tib3goJ2NoZWNrJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1VuY2hlY2tpbmcgYXV0b1VwZGF0ZUV4dGVybmFsSXAgY2hlY2tib3gnKTtcbiAgICAgICAgICAgICAgICAgICAgJGF1dG9VcGRhdGVDaGVja2JveC5jaGVja2JveCgndW5jaGVjaycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBwb3J0IHNldHRpbmdzXG4gICAgICAgIGlmIChkYXRhLnBvcnRzKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnU2V0dGluZyBwb3J0IHZhbHVlczonLCBkYXRhLnBvcnRzKTtcblxuICAgICAgICAgICAgLy8gTWFwIEFQSSBmaWVsZCBuYW1lcyB0byBmb3JtIGZpZWxkIG5hbWVzXG4gICAgICAgICAgICBjb25zdCBwb3J0RmllbGRNYXBwaW5nID0ge1xuICAgICAgICAgICAgICAgICdFWFRFUk5BTF9TSVBfUE9SVCc6ICdleHRlcm5hbFNJUFBvcnQnLFxuICAgICAgICAgICAgICAgICdFWFRFUk5BTF9UTFNfUE9SVCc6ICdleHRlcm5hbFRMU1BvcnQnLFxuICAgICAgICAgICAgICAgICdTSVBfUE9SVCc6ICdTSVBfUE9SVCcsXG4gICAgICAgICAgICAgICAgJ1RMU19QT1JUJzogJ1RMU19QT1JUJyxcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfRlJPTSc6ICdSVFBfUE9SVF9GUk9NJyxcbiAgICAgICAgICAgICAgICAnUlRQX1BPUlRfVE8nOiAnUlRQX1BPUlRfVE8nXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhkYXRhLnBvcnRzKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgZm9ybUZpZWxkTmFtZSA9IHBvcnRGaWVsZE1hcHBpbmdba2V5XSB8fCBrZXk7XG4gICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBkYXRhLnBvcnRzW2tleV07XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFNldHRpbmcgcG9ydCBmaWVsZCAke2Zvcm1GaWVsZE5hbWV9IHRvIHZhbHVlICR7dmFsdWV9YCk7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgZm9ybUZpZWxkTmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgTkFUIGhlbHAgdGV4dCBhbmQgbGFiZWxzIHdpdGggYWN0dWFsIHBvcnQgdmFsdWVzXG4gICAgICAgICAgICBuZXR3b3Jrcy51cGRhdGVOQVRIZWxwVGV4dChkYXRhLnBvcnRzKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLnVwZGF0ZVBvcnRMYWJlbHMoZGF0YS5wb3J0cyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgYWRkaXRpb25hbCBzZXR0aW5nc1xuICAgICAgICBpZiAoZGF0YS5zZXR0aW5ncykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXMoZGF0YS5zZXR0aW5ncykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgIG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsIGtleSwgZGF0YS5zZXR0aW5nc1trZXldKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2F2ZSBpbml0aWFsIHZhbHVlcyBmb3IgZGlydHkgY2hlY2tpbmdcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3MuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHJXaXRoUG9ydE9wdGlvbmFsID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSg6WzAtOV0rKT8kLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIGEgZ2l2ZW4gaW50ZXJmYWNlLlxuICogQHBhcmFtIHtzdHJpbmd9IHZsYW5WYWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgVkxBTiBJRCBpbnB1dCBmaWVsZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBwYXJhbWV0ZXIgZm9yIHRoZSBydWxlLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIHRoZSBpbnRlcmZhY2UsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrVmxhbiA9ICh2bGFuVmFsdWUsIHBhcmFtKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgdmxhbnNBcnJheSA9IHt9O1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLmludGVyZmFjZV8wICE9PSB1bmRlZmluZWQgJiYgYWxsVmFsdWVzLmludGVyZmFjZV8wID4gMCkge1xuICAgICAgICBjb25zdCBuZXdFdGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHthbGxWYWx1ZXMuaW50ZXJmYWNlXzB9YF07XG4gICAgICAgIHZsYW5zQXJyYXlbbmV3RXRoTmFtZV0gPSBbYWxsVmFsdWVzLnZsYW5pZF8wXTtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy52bGFuaWRfMCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgICQuZWFjaChhbGxWYWx1ZXMsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAnaW50ZXJmYWNlXzAnIHx8IGluZGV4ID09PSAndmxhbmlkXzAnKSByZXR1cm47XG4gICAgICAgIGlmIChpbmRleC5pbmRleE9mKCd2bGFuaWQnKSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBldGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHtpbmRleC5zcGxpdCgnXycpWzFdfWBdO1xuICAgICAgICAgICAgaWYgKCQuaW5BcnJheSh2YWx1ZSwgdmxhbnNBcnJheVtldGhOYW1lXSkgPj0gMFxuICAgICAgICAgICAgICAgICYmIHZsYW5WYWx1ZSA9PT0gdmFsdWVcbiAgICAgICAgICAgICAgICAmJiBwYXJhbSA9PT0gaW5kZXguc3BsaXQoJ18nKVsxXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIShldGhOYW1lIGluIHZsYW5zQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgREhDUCBpcyBlbmFibGVkIG9uIFZMQU4gbmV0d29ya3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGlucHV0IGZpZWxkLlxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIHBhcmFtZXRlciBmb3IgdGhlIHJ1bGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBESENQIGlzIG5vdCBlbmFibGVkIG9uIHRoZSBWTEFOIG5ldHdvcmssIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmRoY3BPblZsYW5OZXR3b3JrcyA9ICh2YWx1ZSwgcGFyYW0pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCB2bGFuVmFsdWUgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgdmxhbmlkXyR7cGFyYW19YCk7XG4gICAgY29uc3QgZGhjcFZhbHVlID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGRoY3BfJHtwYXJhbX1gKTtcbiAgICBpZiAodmxhblZhbHVlID4gMCAmJiBkaGNwVmFsdWUgPT09ICdvbicpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdGhlIHByZXNlbmNlIG9mIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uIGlzIHByb3ZpZGVkIHdoZW4gTkFUIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuYWxJcEhvc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMudXNlbmF0ID09PSAnb24nKSB7XG4gICAgICAgIGlmIChhbGxWYWx1ZXMuZXh0aG9zdG5hbWUgPT09ICcnICYmIGFsbFZhbHVlcy5leHRpcGFkZHIgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogIEluaXRpYWxpemUgbmV0d29yayBzZXR0aW5ncyBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBuZXR3b3Jrcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==