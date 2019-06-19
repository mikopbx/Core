"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 10 2018
 *
 */

/* global globalRootUrl, PbxApi, globalTranslate */
var pbxExtesionStatus = {
  $toggle: $('#module-status-toggle'),
  $ajaxMessagesDiv: $('#ajax-messages'),
  initialize: function () {
    function initialize() {
      pbxExtesionStatus.$toggle.checkbox({
        onChecked: function () {
          function onChecked() {
            var uniqid = $(this).closest('.ui.toggle.checkbox').attr('data-value');
            pbxExtesionStatus.$toggle.addClass('disabled');
            pbxExtesionStatus.$toggle.find('label').text(globalTranslate.ext_ModuleStatusChanging);
            pbxExtesionStatus.enableModule(uniqid, PbxApi.SystemReloadModule);
          }

          return onChecked;
        }(),
        onUnchecked: function () {
          function onUnchecked() {
            var uniqid = $(this).closest('.ui.toggle.checkbox').attr('data-value');
            pbxExtesionStatus.$toggle.find('label').text(globalTranslate.ext_ModuleStatusChanging);
            pbxExtesionStatus.$toggle.addClass('disabled');
            pbxExtesionStatus.disableModule(uniqid, PbxApi.SystemReloadModule);
          }

          return onUnchecked;
        }()
      });
    }

    return initialize;
  }(),

  /**
   * Включить модуль, с проверкой ссылочной целостности
   * @param params - параметры запроса.
   * @param cbAfterEnable - колбек функция
   */
  enableModule: function () {
    function enableModule(uniqid, cbAfterEnable) {
      $('.ui.message.ajax').remove();
      $.api({
        url: "".concat(globalRootUrl, "pbx-extension-modules/enable/{uniqid}"),
        on: 'now',
        urlData: {
          uniqid: uniqid
        },
        onSuccess: function () {
          function onSuccess(response) {
            if (response.success) {
              pbxExtesionStatus.$toggle.checkbox('set checked');
              cbAfterEnable(uniqid);
              pbxExtesionStatus.$toggle.find('label').text(globalTranslate.ext_ModuleDisabledStatusEnabled);
            } else {
              pbxExtesionStatus.$toggle.checkbox('set unchecked');
              pbxExtesionStatus.$toggle.find('label').text(globalTranslate.ext_ModuleDisabledStatusDisabled);
              var previousMessage = '';
              $.each(response.message, function (index, value) {
                if (previousMessage !== value) {
                  pbxExtesionStatus.$ajaxMessagesDiv.after("<div class=\"ui ".concat(index, " message ajax\">").concat(value, "</div>"));
                }

                previousMessage = value;
              });
            }

            pbxExtesionStatus.$toggle.removeClass('disabled');
          }

          return onSuccess;
        }()
      });
    }

    return enableModule;
  }(),

  /**
   * Выключить модуль, с проверкой ссылочной целостности
   * @param uniqid - ID модуля
   * @param cbAfterDisable - колбек функция
   */
  disableModule: function () {
    function disableModule(uniqid, cbAfterDisable) {
      $('.ui.message.ajax').remove();
      $.api({
        url: "".concat(globalRootUrl, "pbx-extension-modules/disable/{uniqid}"),
        on: 'now',
        urlData: {
          uniqid: uniqid
        },
        onSuccess: function () {
          function onSuccess(response) {
            if (response.success) {
              pbxExtesionStatus.$toggle.checkbox('set unchecked');
              cbAfterDisable(uniqid);
              pbxExtesionStatus.$toggle.find('label').text(globalTranslate.ext_ModuleDisabledStatusDisabled);
            } else {
              pbxExtesionStatus.$toggle.checkbox('set checked');
              pbxExtesionStatus.$toggle.find('label').text(globalTranslate.ext_ModuleDisabledStatusEnabled);
              var previousMessage = '';
              $.each(response.message, function (index, value) {
                if (previousMessage !== value) {
                  pbxExtesionStatus.$ajaxMessagesDiv.after("<div class=\"ui ".concat(index, " message ajax\">").concat(value, "</div>"));
                }

                previousMessage = value;
              });
            }

            pbxExtesionStatus.$toggle.removeClass('disabled');
          }

          return onSuccess;
        }()
      });
    }

    return disableModule;
  }()
};
$(document).ready(function () {
  pbxExtesionStatus.initialize();
});
//# sourceMappingURL=pbx-extension-module-status.js.map