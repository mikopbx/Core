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

/* global globalRootUrl,globalTranslate, Form, PbxApi */

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
    networks.toggleDisabledFieldClass();
    $('#eth-interfaces-menu .item').tab(); // Handles the change event of the 'usenat-checkbox'.

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
    }); // Delete additional network interface

    $('.delete-interface').api({
      url: "".concat(globalRootUrl, "network/delete/{value}"),
      method: 'POST',
      beforeSend: function beforeSend(settings) {
        $(this).addClass('loading disabled');
        return settings;
      },

      /**
       * Handles the successful response of the 'delete-interface' API request.
       * @param {object} response - The response object.
       */
      onSuccess: function onSuccess(response) {
        $(this).removeClass('loading disabled');
        $('.ui.message.ajax').remove();
        $.each(response.message, function (index, value) {
          networks.$formObj.after("<div class=\"ui ".concat(index, " message ajax\">").concat(value, "</div>"));
        });
        if (response.success) window.location.reload();
      },

      /**
       * Handles the failure response of the 'delete-interface' API request.
       * @param {object} response - The response object.
       */
      onFailure: function onFailure(response) {
        $(this).removeClass('loading disabled');
        $('form').after(response);
      }
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
    networks.initializeForm();
  },

  /**
   * Callback function executed after getting the external IP from a remote server.
   * @param {boolean|Object} response - The response received from the server. If false, indicates an error occurred.
   */
  cbAfterGetExternalIp: function cbAfterGetExternalIp(response) {
    if (response === false) {
      networks.$getMyIpButton.removeClass('loading disabled');
    } else {
      networks.$formObj.form('set value', 'extipaddr', response.ip);
      networks.$extipaddr.trigger('change');
      networks.$getMyIpButton.removeClass('loading disabled');
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
    var result = settings;
    result.data = networks.$formObj.form('get values');
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
    Form.$formObj = networks.$formObj;
    Form.url = "".concat(globalRootUrl, "network/save"); // Form submission URL

    Form.validateRules = networks.validateRules; // Form validation rules

    Form.cbBeforeSendForm = networks.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = networks.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9OZXR3b3JrL25ldHdvcmstbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIm5ldHdvcmtzIiwiJGdldE15SXBCdXR0b24iLCIkIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiJGV4dGlwYWRkciIsIiRpcGFkZHJlc3NJbnB1dCIsInZsYW5zQXJyYXkiLCJ2YWxpZGF0ZVJ1bGVzIiwiZ2F0ZXdheSIsIm9wdGlvbmFsIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwibndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQiLCJwcmltYXJ5ZG5zIiwic2Vjb25kYXJ5ZG5zIiwiZXh0aXBhZGRyIiwibndfVmFsaWRhdGVFeHRJcHBhZGRyTm90UmlnaHQiLCJud19WYWxpZGF0ZUV4dElwcGFkZHJPckhvc3RJc0VtcHR5IiwiZXh0aG9zdG5hbWUiLCJkZXBlbmRzIiwiaW5pdGlhbGl6ZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsInRhYiIsImNoZWNrYm94Iiwib25DaGFuZ2UiLCJkcm9wZG93biIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWRkQ2xhc3MiLCJQYnhBcGkiLCJHZXRFeHRlcm5hbElwIiwiY2JBZnRlckdldEV4dGVybmFsSXAiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiYmVmb3JlU2VuZCIsInNldHRpbmdzIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlbW92ZSIsImVhY2giLCJtZXNzYWdlIiwiaW5kZXgiLCJ2YWx1ZSIsImFmdGVyIiwic3VjY2VzcyIsIndpbmRvdyIsImxvY2F0aW9uIiwicmVsb2FkIiwib25GYWlsdXJlIiwiaW5pdGlhbFZhbHVlcyIsImludGVyZmFjZV8wIiwibmFtZV8wIiwiZGhjcF8wIiwiaXBhZGRyXzAiLCJzdWJuZXRfMCIsImZvcm0iLCJmaXJzdCIsImF0dHIiLCJpbnB1dG1hc2siLCJhbGlhcyIsImluaXRpYWxpemVGb3JtIiwiaXAiLCJ0cmlnZ2VyIiwib2JqIiwiZXRoIiwidmFsIiwiYWRkTmV3Rm9ybVJ1bGVzIiwibmV3Um93SWQiLCJuYW1lQ2xhc3MiLCJpZGVudGlmaWVyIiwibndfVmFsaWRhdGVOYW1lSXNOb3RCZUVtcHR5IiwidmxhbkNsYXNzIiwibndfVmFsaWRhdGVWbGFuUmFuZ2UiLCJud19WYWxpZGF0ZVZsYW5Dcm9zcyIsImlwYWRkckNsYXNzIiwibndfVmFsaWRhdGVJcHBhZGRySXNFbXB0eSIsImRoY3BDbGFzcyIsIm53X1ZhbGlkYXRlREhDUE9uVmxhbnNEb250U3VwcG9ydCIsImNiQmVmb3JlU2VuZEZvcm0iLCJyZXN1bHQiLCJkYXRhIiwiY2JBZnRlclNlbmRGb3JtIiwiRm9ybSIsImZuIiwiaXBhZGRyIiwiZiIsIm1hdGNoIiwiaSIsImEiLCJpcGFkZHJXaXRoUG9ydE9wdGlvbmFsIiwiY2hlY2tWbGFuIiwidmxhblZhbHVlIiwicGFyYW0iLCJhbGxWYWx1ZXMiLCJ1bmRlZmluZWQiLCJuZXdFdGhOYW1lIiwidmxhbmlkXzAiLCJpbmRleE9mIiwiZXRoTmFtZSIsInNwbGl0IiwiaW5BcnJheSIsInB1c2giLCJkaGNwT25WbGFuTmV0d29ya3MiLCJkaGNwVmFsdWUiLCJleHRlbmFsSXBIb3N0IiwidXNlbmF0IiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYkMsRUFBQUEsY0FBYyxFQUFFQyxDQUFDLENBQUMsVUFBRCxDQURKOztBQUdiO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUQsQ0FBQyxDQUFDLGVBQUQsQ0FQRTtBQVNiRSxFQUFBQSxVQUFVLEVBQUVGLENBQUMsQ0FBQyx5QkFBRCxDQVRBO0FBVWJH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QUNBaEIsQ0FBQyxDQUFDK0csUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmxILEVBQUFBLFFBQVEsQ0FBQ3VCLFVBQVQ7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGkgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIG5ldHdvcmsgc2V0dGluZ3NcbiAqXG4gKiBAbW9kdWxlIG5ldHdvcmtzXG4gKi9cbmNvbnN0IG5ldHdvcmtzID0ge1xuICAgICRnZXRNeUlwQnV0dG9uOiAkKCcjZ2V0bXlpcCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI25ldHdvcmstZm9ybScpLFxuXG4gICAgJGRyb3BEb3duczogJCgnI25ldHdvcmstZm9ybSAuZHJvcGRvd24nKSxcbiAgICAkZXh0aXBhZGRyOiAkKCcjZXh0aXBhZGRyJyksXG4gICAgJGlwYWRkcmVzc0lucHV0OiAkKCcuaXBhZGRyZXNzJyksXG4gICAgdmxhbnNBcnJheToge30sXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZ2F0ZXdheToge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwcmltYXJ5ZG5zOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaXBhZGRyJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHNlY29uZGFyeWRuczoge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkck5vdFJpZ2h0LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRpcGFkZHI6IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHJXaXRoUG9ydE9wdGlvbmFsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyTm90UmlnaHQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0aG9zdG5hbWU6IHtcbiAgICAgICAgICAgIGRlcGVuZHM6ICd1c2VuYXQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleHRlbmFsSXBIb3N0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVFeHRJcHBhZGRyT3JIb3N0SXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG5ldHdvcmsgc2V0dGluZ3MgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgLml0ZW0nKS50YWIoKTtcblxuICAgICAgICAvLyBIYW5kbGVzIHRoZSBjaGFuZ2UgZXZlbnQgb2YgdGhlICd1c2VuYXQtY2hlY2tib3gnLlxuICAgICAgICAkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgbmV0d29ya3MudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgbmV0d29ya3MuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEhhbmRsZXMgdGhlIGNoYW5nZSBldmVudCBvZiB0aGUgJ2RoY3AtY2hlY2tib3gnLlxuICAgICAgICAkKCcuZGhjcC1jaGVja2JveCcpXG4gICAgICAgICAgICAuY2hlY2tib3goe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgICAgICBuZXR3b3Jrcy50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbmV0d29ya3MuJGdldE15SXBCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRnZXRNeUlwQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBQYnhBcGkuR2V0RXh0ZXJuYWxJcChuZXR3b3Jrcy5jYkFmdGVyR2V0RXh0ZXJuYWxJcCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIERlbGV0ZSBhZGRpdGlvbmFsIG5ldHdvcmsgaW50ZXJmYWNlXG4gICAgICAgICQoJy5kZWxldGUtaW50ZXJmYWNlJykuYXBpKHtcbiAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL2RlbGV0ZS97dmFsdWV9YCxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgYmVmb3JlU2VuZChzZXR0aW5ncykge1xuICAgICAgICAgICAgICAgICQodGhpcykuYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2V0dGluZ3M7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEhhbmRsZXMgdGhlIHN1Y2Nlc3NmdWwgcmVzcG9uc2Ugb2YgdGhlICdkZWxldGUtaW50ZXJmYWNlJyBBUEkgcmVxdWVzdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgJC5lYWNoKHJlc3BvbnNlLm1lc3NhZ2UsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouYWZ0ZXIoYDxkaXYgY2xhc3M9XCJ1aSAke2luZGV4fSBtZXNzYWdlIGFqYXhcIj4ke3ZhbHVlfTwvZGl2PmApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzKSB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvKipcbiAgICAgICAgICAgICAqIEhhbmRsZXMgdGhlIGZhaWx1cmUgcmVzcG9uc2Ugb2YgdGhlICdkZWxldGUtaW50ZXJmYWNlJyBBUEkgcmVxdWVzdC5cbiAgICAgICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBvYmplY3QuXG4gICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICQodGhpcykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKCdmb3JtJykuYWZ0ZXIocmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2xlYXIgYWRkaXRpb25hbCBuZXR3b3JrIHNldHRpbmdzXG4gICAgICAgICQoJy5kZWxldGUtaW50ZXJmYWNlLTAnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpbml0aWFsVmFsdWVzID0ge1xuICAgICAgICAgICAgICAgIGludGVyZmFjZV8wOiAnJyxcbiAgICAgICAgICAgICAgICBuYW1lXzA6ICcnLFxuICAgICAgICAgICAgICAgIGRoY3BfMDogJ29uJyxcbiAgICAgICAgICAgICAgICBpcGFkZHJfMDogJycsXG4gICAgICAgICAgICAgICAgc3VibmV0XzA6ICcwJyxcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgaW5pdGlhbFZhbHVlcyk7XG4gICAgICAgICAgICAkKCcjaW50ZXJmYWNlXzAnKS5kcm9wZG93bigncmVzdG9yZSBkZWZhdWx0cycpO1xuICAgICAgICAgICAgJCgnI2RoY3AtMC1jaGVja2JveCcpLmNoZWNrYm94KCdjaGVjaycpO1xuICAgICAgICAgICAgJCgnI2V0aC1pbnRlcmZhY2VzLW1lbnUgLml0ZW0nKS50YWIoJ2NoYW5nZSB0YWInLCAkKCcjZXRoLWludGVyZmFjZXMtbWVudSBhLml0ZW0nKS5maXJzdCgpLmF0dHIoJ2RhdGEtdGFiJykpO1xuICAgICAgICB9KTtcbiAgICAgICAgbmV0d29ya3MuJGlwYWRkcmVzc0lucHV0LmlucHV0bWFzayh7YWxpYXM6ICdpcCcsICdwbGFjZWhvbGRlcic6ICdfJ30pO1xuXG4gICAgICAgIG5ldHdvcmtzLmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGV4ZWN1dGVkIGFmdGVyIGdldHRpbmcgdGhlIGV4dGVybmFsIElQIGZyb20gYSByZW1vdGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbnxPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIHJlY2VpdmVkIGZyb20gdGhlIHNlcnZlci4gSWYgZmFsc2UsIGluZGljYXRlcyBhbiBlcnJvciBvY2N1cnJlZC5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0RXh0ZXJuYWxJcChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGlwYWRkcicsIHJlc3BvbnNlLmlwKTtcbiAgICAgICAgICAgIG5ldHdvcmtzLiRleHRpcGFkZHIudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICBuZXR3b3Jrcy4kZ2V0TXlJcEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlICdkaXNhYmxlZCcgY2xhc3MgZm9yIHNwZWNpZmljIGZpZWxkcyBiYXNlZCBvbiB0aGVpciBjaGVja2JveCBzdGF0ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgICQoJyNldGgtaW50ZXJmYWNlcy1tZW51IGEnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBldGggPSAkKG9iaikuYXR0cignZGF0YS10YWInKTtcbiAgICAgICAgICAgIGlmICgkKGAjZGhjcC0ke2V0aH0tY2hlY2tib3hgKS5jaGVja2JveCgnaXMgdW5jaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAkKGAjaXAtYWRkcmVzcy1ncm91cC0ke2V0aH1gKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAkKGAjbm90LWRoY3AtJHtldGh9YCkudmFsKCcxJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoYCNpcC1hZGRyZXNzLWdyb3VwLSR7ZXRofWApLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICQoYCNub3QtZGhjcC0ke2V0aH1gKS52YWwoJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbmV0d29ya3MuYWRkTmV3Rm9ybVJ1bGVzKGV0aCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICgkKCcjdXNlbmF0LWNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJCgnLm5hdGVkLXNldHRpbmdzLWdyb3VwJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcubmF0ZWQtc2V0dGluZ3MtZ3JvdXAnKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIG5ldyBmb3JtIHZhbGlkYXRpb24gcnVsZXMgZm9yIGEgc3BlY2lmaWMgcm93IGluIHRoZSBuZXR3b3JrIGNvbmZpZ3VyYXRpb24gZm9ybS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Um93SWQgLSBUaGUgSUQgb2YgdGhlIG5ldyByb3cgdG8gYWRkIHRoZSBmb3JtIHJ1bGVzIGZvci5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ25hbWUnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IG5hbWVDbGFzcyA9IGBuYW1lXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICduYW1lJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW25hbWVDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBuYW1lQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZU5hbWVJc05vdEJlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ3ZsYW5pZCcgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgdmxhbkNsYXNzID0gYHZsYW5pZF8ke25ld1Jvd0lkfWA7XG5cblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICd2bGFuaWQnIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbdmxhbkNsYXNzXSA9IHtcbiAgICAgICAgICAgIGRlcGVuZHM6IGBpbnRlcmZhY2VfJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogdmxhbkNsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpbnRlZ2VyWzAuLjQwOTVdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuUmFuZ2UsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGBjaGVja1ZsYW5bJHtuZXdSb3dJZH1dYCxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUubndfVmFsaWRhdGVWbGFuQ3Jvc3MsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2lwYWRkcicgZmllbGQgaW4gdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgaXBhZGRyQ2xhc3MgPSBgaXBhZGRyXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdpcGFkZHInIGZpZWxkXG4gICAgICAgIG5ldHdvcmtzLnZhbGlkYXRlUnVsZXNbaXBhZGRyQ2xhc3NdID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogaXBhZGRyQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgbm90LWRoY3AtJHtuZXdSb3dJZH1gLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlSXBwYWRkcklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdpcGFkZHInLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5ud19WYWxpZGF0ZUlwcGFkZHJOb3RSaWdodCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGNsYXNzIGZvciB0aGUgJ2RoY3AnIGZpZWxkIGluIHRoZSBuZXcgcm93XG4gICAgICAgIGNvbnN0IGRoY3BDbGFzcyA9IGBkaGNwXyR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlICdkaGNwJyBmaWVsZFxuICAgICAgICBuZXR3b3Jrcy52YWxpZGF0ZVJ1bGVzW2RoY3BDbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBkaGNwQ2xhc3MsXG4gICAgICAgICAgICBkZXBlbmRzOiBgaW50ZXJmYWNlXyR7bmV3Um93SWR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiBgZGhjcE9uVmxhbk5ldHdvcmtzWyR7bmV3Um93SWR9XWAsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLm53X1ZhbGlkYXRlREhDUE9uVmxhbnNEb250U3VwcG9ydCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gbmV0d29ya3MuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1uZXR3b3JrL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG5ldHdvcmtzLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBuZXR3b3Jrcy5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gbmV0d29ya3MuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgdmFsdWUgaXMgYSB2YWxpZCBJUCBhZGRyZXNzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHZhbGlkYXRlIGFzIGFuIElQIGFkZHJlc3MuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3MsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9ICh2YWx1ZSkgPT4ge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgdGhlIHZhbHVlIGlzIGEgdmFsaWQgSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gdmFsaWRhdGUgYXMgYW4gSVAgYWRkcmVzcyB3aXRoIGFuIG9wdGlvbmFsIHBvcnQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyBhIHZhbGlkIElQIGFkZHJlc3Mgd2l0aCBhbiBvcHRpb25hbCBwb3J0LCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5pcGFkZHJXaXRoUG9ydE9wdGlvbmFsID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgZiA9IHZhbHVlLm1hdGNoKC9eKFxcZHsxLDN9KVxcLihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KSg6WzAtOV0rKT8kLyk7XG4gICAgaWYgKGYgPT0gbnVsbCkge1xuICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGxldCBpID0gMTsgaSA8IDU7IGkgKz0gMSkge1xuICAgICAgICAgICAgY29uc3QgYSA9IGZbaV07XG4gICAgICAgICAgICBpZiAoYSA+IDI1NSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmWzVdID4gMzIpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIGZvciBjaGVja2luZyBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIGEgZ2l2ZW4gaW50ZXJmYWNlLlxuICogQHBhcmFtIHtzdHJpbmd9IHZsYW5WYWx1ZSAtIFRoZSB2YWx1ZSBvZiB0aGUgVkxBTiBJRCBpbnB1dCBmaWVsZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbSAtIFRoZSBwYXJhbWV0ZXIgZm9yIHRoZSBydWxlLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGUgVkxBTiBJRCBpcyB1bmlxdWUgZm9yIHRoZSBpbnRlcmZhY2UsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmNoZWNrVmxhbiA9ICh2bGFuVmFsdWUsIHBhcmFtKSA9PiB7XG4gICAgbGV0IHJlc3VsdCA9IHRydWU7XG4gICAgY29uc3QgdmxhbnNBcnJheSA9IHt9O1xuICAgIGNvbnN0IGFsbFZhbHVlcyA9IG5ldHdvcmtzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICBpZiAoYWxsVmFsdWVzLmludGVyZmFjZV8wICE9PSB1bmRlZmluZWQgJiYgYWxsVmFsdWVzLmludGVyZmFjZV8wID4gMCkge1xuICAgICAgICBjb25zdCBuZXdFdGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHthbGxWYWx1ZXMuaW50ZXJmYWNlXzB9YF07XG4gICAgICAgIHZsYW5zQXJyYXlbbmV3RXRoTmFtZV0gPSBbYWxsVmFsdWVzLnZsYW5pZF8wXTtcbiAgICAgICAgaWYgKGFsbFZhbHVlcy52bGFuaWRfMCA9PT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgICQuZWFjaChhbGxWYWx1ZXMsIChpbmRleCwgdmFsdWUpID0+IHtcbiAgICAgICAgaWYgKGluZGV4ID09PSAnaW50ZXJmYWNlXzAnIHx8IGluZGV4ID09PSAndmxhbmlkXzAnKSByZXR1cm47XG4gICAgICAgIGlmIChpbmRleC5pbmRleE9mKCd2bGFuaWQnKSA+PSAwKSB7XG4gICAgICAgICAgICBjb25zdCBldGhOYW1lID0gYWxsVmFsdWVzW2BpbnRlcmZhY2VfJHtpbmRleC5zcGxpdCgnXycpWzFdfWBdO1xuICAgICAgICAgICAgaWYgKCQuaW5BcnJheSh2YWx1ZSwgdmxhbnNBcnJheVtldGhOYW1lXSkgPj0gMFxuICAgICAgICAgICAgICAgICYmIHZsYW5WYWx1ZSA9PT0gdmFsdWVcbiAgICAgICAgICAgICAgICAmJiBwYXJhbSA9PT0gaW5kZXguc3BsaXQoJ18nKVsxXSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoIShldGhOYW1lIGluIHZsYW5zQXJyYXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHZsYW5zQXJyYXlbZXRoTmFtZV0gPSBbXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmxhbnNBcnJheVtldGhOYW1lXS5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgaWYgREhDUCBpcyBlbmFibGVkIG9uIFZMQU4gbmV0d29ya3MuXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgb2YgdGhlIGlucHV0IGZpZWxkLlxuICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtIC0gVGhlIHBhcmFtZXRlciBmb3IgdGhlIHJ1bGUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBESENQIGlzIG5vdCBlbmFibGVkIG9uIHRoZSBWTEFOIG5ldHdvcmssIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmRoY3BPblZsYW5OZXR3b3JrcyA9ICh2YWx1ZSwgcGFyYW0pID0+IHtcbiAgICBsZXQgcmVzdWx0ID0gdHJ1ZTtcbiAgICBjb25zdCB2bGFuVmFsdWUgPSBuZXR3b3Jrcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCBgdmxhbmlkXyR7cGFyYW19YCk7XG4gICAgY29uc3QgZGhjcFZhbHVlID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGRoY3BfJHtwYXJhbX1gKTtcbiAgICBpZiAodmxhblZhbHVlID4gMCAmJiBkaGNwVmFsdWUgPT09ICdvbicpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSBmb3IgY2hlY2tpbmcgdGhlIHByZXNlbmNlIG9mIGV4dGVybmFsIElQIGhvc3QgaW5mb3JtYXRpb24uXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gLSBUcnVlIGlmIHRoZSBleHRlcm5hbCBJUCBob3N0IGluZm9ybWF0aW9uIGlzIHByb3ZpZGVkIHdoZW4gTkFUIGlzIGVuYWJsZWQsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuYWxJcEhvc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgYWxsVmFsdWVzID0gbmV0d29ya3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgIGlmIChhbGxWYWx1ZXMudXNlbmF0ID09PSAnb24nKSB7XG4gICAgICAgIGlmIChhbGxWYWx1ZXMuZXh0aG9zdG5hbWUgPT09ICcnICYmIGFsbFZhbHVlcy5leHRpcGFkZHIgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogIEluaXRpYWxpemUgbmV0d29yayBzZXR0aW5ncyBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBuZXR3b3Jrcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==