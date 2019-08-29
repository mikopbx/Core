"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 11 2018
 *
 */

/* global globalRootUrl, globalTranslate */
var firewallTable = {
  $statusToggle: $('#status-toggle'),
  $addNewButton: $('#add-new-button'),
  $settings: $('#firewall-settings'),
  initialize: function () {
    function initialize() {
      $('.rule-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "firewall/modify/").concat(id);
      });
      firewallTable.$statusToggle.checkbox({
        onChecked: function () {
          function onChecked() {
            firewallTable.enableFirewall();
          }

          return onChecked;
        }(),
        onUnchecked: function () {
          function onUnchecked() {
            firewallTable.disableFirewall();
          }

          return onUnchecked;
        }()
      });
    }

    return initialize;
  }(),

  /**
   * Включить firewall
   */
  enableFirewall: function () {
    function enableFirewall() {
      $.api({
        url: "".concat(globalRootUrl, "firewall/enable"),
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            if (response.success) {
              firewallTable.cbAfterEnabled(true);
            } else {
              firewallTable.cbAfterDisabled();
            }
          }

          return onSuccess;
        }()
      });
    }

    return enableFirewall;
  }(),

  /**
   * Включить firewall
   */
  disableFirewall: function () {
    function disableFirewall() {
      $.api({
        url: "".concat(globalRootUrl, "firewall/disable"),
        on: 'now',
        onSuccess: function () {
          function onSuccess(response) {
            if (response.success) {
              firewallTable.cbAfterDisabled(true);
            } else {
              firewallTable.cbAfterEnabled();
            }
          }

          return onSuccess;
        }()
      });
    }

    return disableFirewall;
  }(),

  /**
   * Обработчки после включения firewall
   */
  cbAfterEnabled: function () {
    function cbAfterEnabled() {
      var sendEvent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      firewallTable.$statusToggle.find('label').text(globalTranslate.fw_StatusEnabled);
      firewallTable.$statusToggle.checkbox('set checked');
      $('i.icon.checkmark.green[data-value="off"]').removeClass('checkmark green').addClass('close red');
      $('i.icon.corner.close').hide();

      if (sendEvent) {
        var event = document.createEvent('Event');
        event.initEvent('ConfigDataChanged', false, true);
        window.dispatchEvent(event);
      }
    }

    return cbAfterEnabled;
  }(),

  /**
   * Обработчки после выключения firewall
   */
  cbAfterDisabled: function () {
    function cbAfterDisabled() {
      var sendEvent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      firewallTable.$statusToggle.find('label').text(globalTranslate.fw_StatusDisabled);
      firewallTable.$statusToggle.checkbox('set unchecked');
      $('i.icon.close.red[data-value="off"]').removeClass('close red').addClass('checkmark green');
      $('i.icon.corner.close').show();

      if (sendEvent) {
        var event = document.createEvent('Event');
        event.initEvent('ConfigDataChanged', false, true);
        window.dispatchEvent(event);
      }
    }

    return cbAfterDisabled;
  }()
};
$(document).ready(function () {
  firewallTable.initialize();
});
//# sourceMappingURL=firewall-index.js.map