"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, PbxApi, globalTranslate,
UpdateApi, UserMessage, globalPBXVersion, SemanticLocalization,
upgradeStatusLoopWorker, licensing, PbxExtensionStatus */
var extensionModules = {
  $checkboxes: $('.module-row .checkbox'),
  $deleteModalForm: $('#delete-modal-form'),
  $keepSettingsCheckbox: $('#keepModuleSettings'),
  $modulesTable: $('#modules-table'),
  pbxVersion: globalPBXVersion.replace(/-dev/i, ''),
  checkBoxes: [],
  initialize: function () {
    function initialize() {
      extensionModules.$deleteModalForm.modal();
      extensionModules.initializeDataTable();
      UpdateApi.getModulesUpdates(extensionModules.cbParseModuleUpdates);
      extensionModules.$checkboxes.each(function (index, obj) {
        var uniqId = $(obj).attr('data-value');
        extensionModules.checkBoxes.push(new PbxExtensionStatus(uniqId, false));
      });
    }

    return initialize;
  }(),

  /**
   * Initialize data tables on table
   */
  initializeDataTable: function () {
    function initializeDataTable() {
      extensionModules.$modulesTable.DataTable({
        lengthChange: false,
        paging: false,
        columns: [{
          orderable: false,
          searchable: false
        }, null, null, null, {
          orderable: false,
          searchable: false
        }],
        // order: [1, 'asc'],
        language: SemanticLocalization.dataTableLocalisation
      });
      $('.add-new').appendTo($('div.eight.column:eq(0)'));
    }

    return initializeDataTable;
  }(),

  /**
   * Обработка списка модулей полученнх с сайта
   * @param response
   */
  cbParseModuleUpdates: function () {
    function cbParseModuleUpdates(response) {
      response.modules.forEach(function (obj) {
        // Проверим подходит ли по номеру версии этот модуль к АТС
        var minAppropriateVersionPBX = obj.min_pbx_version;
        var currentVersionPBX = extensionModules.pbxVersion;

        if (extensionModules.versionCompare(currentVersionPBX, minAppropriateVersionPBX) < 0) {
          return;
        } // Ищем среди установленных, предложим обновление


        var $moduleRow = $("tr.module-row#".concat(obj.uniqid));

        if ($moduleRow.length > 0) {
          var oldVer = $moduleRow.find('td.version').text();
          var newVer = obj.version;

          if (extensionModules.versionCompare(newVer, oldVer) > 0) {
            extensionModules.addUpdateButtonToRow(obj);
          }
        } else {
          var $newModuleRow = $("tr.new-module-row#".concat(obj.uniqid));

          if ($newModuleRow.length > 0) {
            var _oldVer = $newModuleRow.find('td.version').text();

            var _newVer = obj.version;

            if (extensionModules.versionCompare(_newVer, _oldVer) > 0) {
              $newModuleRow.remove();
              extensionModules.addModuleDescription(obj);
            }
          } else {
            extensionModules.addModuleDescription(obj);
          }
        }
      });
      $('a.download').on('click', function (e) {
        e.preventDefault();
        $('a.button').addClass('disabled');
        var params = {};
        var $aLink = $(e.target).closest('a');
        $aLink.removeClass('disabled');
        params.uniqid = $aLink.attr('data-uniqid');
        params.releaseId = $aLink.attr('data-id');
        params.size = $aLink.attr('data-size');
        params.licProductId = $aLink.attr('data-productid');
        params.licFeatureId = $aLink.attr('data-featureid');
        params.action = 'install';
        params.aLink = $aLink;
        licensing.captureFeature(params, extensionModules.cbAfterLicenseCheck);
      });
      $('a.update').on('click', function (e) {
        e.preventDefault();
        $('a.button').addClass('disabled');
        var params = {};
        var $aLink = $(e.target).closest('a');
        $aLink.removeClass('disabled');
        params.licProductId = $aLink.attr('data-productid');
        params.licFeatureId = $aLink.attr('data-featureid');
        params.action = 'update';
        params.releaseId = $aLink.attr('data-id');
        params.uniqid = $aLink.attr('data-uniqid');
        params.size = $aLink.attr('data-size');
        params.aLink = $aLink;
        licensing.captureFeature(params, extensionModules.cbAfterLicenseCheck);
      });
      $('a.delete').on('click', function (e) {
        e.preventDefault();
        $('a.button').addClass('disabled');
        $(e.target).closest('a').removeClass('disabled');
        var params = [];
        var $aLink = $(e.target).closest('tr');
        params.uniqid = $aLink.attr('id');
        extensionModules.deleteModule(params);
      });
      $('a[data-content]').popup();
    }

    return cbParseModuleUpdates;
  }(),

  /**
   * Добавляет описание доступного модуля
   * @param obj
   */
  addModuleDescription: function () {
    function addModuleDescription(obj) {
      $('#online-updates-block').show();
      var promoLink = '';

      if (obj.promo_link !== undefined && obj.promo_link !== null) {
        promoLink = "<br><a href=\"".concat(obj.promo_link, "\" target=\"_blank\">").concat(globalTranslate.ext_ExternalDescription, "</a>");
      }

      var dymanicRow = "\n\t\t\t<tr class=\"new-module-row\" id=\"".concat(obj.uniqid, "\">\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.name), "<br>\n\t\t\t\t\t\t<span class=\"features\">").concat(decodeURIComponent(obj.description), " ").concat(promoLink, "</span>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.developer), "</td>\n\t\t\t\t\t\t<td class=\"center aligned version\">").concat(obj.version, "</td>\n\t\t\t\t\t\t<td class=\"right aligned collapsing\">\n    \t\t\t\t\t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t\t\t\t\t<a href=\"#\" class=\"ui button download\" \n\t\t\t\t\t\t\t\t\tdata-content= \"").concat(globalTranslate.ext_InstallModule, "\"\n\t\t\t\t\t\t\t\t\tdata-uniqid = \"").concat(obj.uniqid, "\"\n\t\t\t\t\t\t\t\t\tdata-size = \"").concat(obj.size, "\"\n\t\t\t\t\t\t\t\t\tdata-productId = \"").concat(obj.lic_product_id, "\"\n\t\t\t\t\t\t\t\t\tdata-featureId = \"").concat(obj.lic_feature_id, "\" \n\t\t\t\t\t\t\t\t\tdata-id =\"").concat(obj.release_id, "\">\n\t\t\t\t\t\t\t\t\t<i class=\"icon download blue\"></i> \n\t\t\t\t\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t\t\t\t\t</a>\n    \t\t\t\t\t\t</div>\n\t\t\t</tr>");
      $('#new-modules-table tbody').append(dymanicRow);
    }

    return addModuleDescription;
  }(),

  /**
   * Добавляет кнопку обновления старой версии PBX
   * @param obj
   */
  addUpdateButtonToRow: function () {
    function addUpdateButtonToRow(obj) {
      var $moduleRow = $("tr.module-row#".concat(obj.uniqid));
      var $currentUpdateButton = $("tr.module-row#".concat(obj.uniqid)).find('a.update');

      if ($currentUpdateButton.length > 0) {
        var oldVer = $currentUpdateButton.attr('data-ver');
        var newVer = obj.version;

        if (extensionModules.versionCompare(newVer, oldVer) <= 0) {
          return;
        }
      }

      $currentUpdateButton.remove();
      var dynamicButton = "<a href=\"#\" class=\"ui button update popuped\" \n\t\t\tdata-content=\"".concat(globalTranslate.ext_UpdateModule, "\"\n\t\t\tdata-ver =\"").concat(obj.version, "\"\n\t\t\tdata-uniqid =\"").concat(obj.uniqid, "\" \n\t\t\tdata-productId = \"").concat(obj.lic_product_id, "\"\n\t\t\tdata-featureId = \"").concat(obj.lic_feature_id, "\" \n\t\t\tdata-id =\"").concat(obj.release_id, "\">\n\t\t\t<i class=\"icon redo blue\"></i> \n\t\t\t<span class=\"percent\"></span>\n\t\t\t</a>");
      $moduleRow.find('.action-buttons').prepend(dynamicButton);
    }

    return addUpdateButtonToRow;
  }(),

  /**
   * Если фича захвачена, обращаемся к серверу
   * обновлений за получениием дистрибутива
   * @param params
   * @returns {boolean}
   */
  cbAfterLicenseCheck: function () {
    function cbAfterLicenseCheck(params) {
      UpdateApi.GetModuleInstallLink(params, extensionModules.cbGetModuleInstallLinkSuccess, extensionModules.cbGetModuleInstallLinkFailure);
    }

    return cbAfterLicenseCheck;
  }(),

  /**
   * Если сайт вернул ссылку на обновление
   * @param params
   * @param response
   */
  cbGetModuleInstallLinkSuccess: function () {
    function cbGetModuleInstallLinkSuccess(params, response) {
      var newParams = params;
      response.modules.forEach(function (obj) {
        newParams.md5 = obj.md5;
        newParams.updateLink = obj.href;

        if (newParams.action === 'update') {
          params.aLink.find('i').addClass('loading');
          extensionModules.updateModule(newParams);
        } else {
          params.aLink.find('i').addClass('loading redo').removeClass('download');
          extensionModules.installModule(newParams, false);
        }
      });
    }

    return cbGetModuleInstallLinkSuccess;
  }(),

  /**
   * Если сайт отказал в обновлении, не захвачена нужная фича
   */
  cbGetModuleInstallLinkFailure: function () {
    function cbGetModuleInstallLinkFailure(params) {
      $('a.button').removeClass('disabled');

      if (params.action === 'update') {
        params.aLink.find('i').removeClass('loading');
      } else {
        params.aLink.find('i').removeClass('loading redo').addClass('download');
      }

      UserMessage.showError(globalTranslate.ext_GetLinkError);
    }

    return cbGetModuleInstallLinkFailure;
  }(),

  /**
   * Сначала отключим модуль, если получится, то отправим команду на обновление
   * и обновим страничку
   * @param params - параметры запроса
   */
  updateModule: function () {
    function updateModule(params) {
      // Проверим включен ли модуль, если включен, вырубим его
      var status = $("#".concat(params.uniqid)).find('.checkbox').checkbox('is checked');

      if (status === true) {
        PbxApi.SystemDisableModule(params.uniqid, function () {
          extensionModules.installModule(params, true);
        });
      } else {
        extensionModules.installModule(params, false);
      }
    }

    return updateModule;
  }(),

  /**
   * Обновление модуля
   * @param params - параметры запроса
   * @param needEnable - включить ли модуль после установки?
   */
  installModule: function () {
    function installModule(params, needEnable) {
      PbxApi.SystemInstallModule(params, function (response) {
        if (response === true) {
          upgradeStatusLoopWorker.initialize(params.uniqid, needEnable);
        } else {
          if (response.message !== undefined) {
            UserMessage.showMultiString(response.message);
          } else {
            UserMessage.showMultiString(globalTranslate.ext_InstallationError);
          }

          $('a.button').removeClass('disabled');

          if (params.action === 'update') {
            params.aLink.find('i').removeClass('loading');
          } else {
            params.aLink.find('i').removeClass('loading redo').addClass('download');
          }
        }
      });
    }

    return installModule;
  }(),

  /**
   * Перезапуск модуля и перезагрузка страницы
   * @param uniqid - ID модуля
   */
  reloadModuleAndPage: function () {
    function reloadModuleAndPage(uniqid) {
      PbxApi.SystemReloadModule(uniqid);
      window.location = "".concat(globalRootUrl, "pbx-extension-modules/index/");
    }

    return reloadModuleAndPage;
  }(),

  /**
   * Сначала отключим модуль, если получится, то отправим команду на удаление
   * и обновим страничку
   * @param params - параметры запроса.
   */
  deleteModule: function () {
    function deleteModule(params) {
      // Cпросим пользователя сохранять ли настройки
      extensionModules.$deleteModalForm.modal({
        closable: false,
        onDeny: function () {
          function onDeny() {
            $('a.button').removeClass('disabled');
            return true;
          }

          return onDeny;
        }(),
        onApprove: function () {
          function onApprove() {
            // Проверим включен ли модуль, если включен, вырубим его
            var status = $("#".concat(params.uniqid)).find('.checkbox').checkbox('is checked');
            var keepSettings = extensionModules.$keepSettingsCheckbox.checkbox('is checked');

            if (status === true) {
              PbxApi.SystemDisableModule(params.uniqid, function () {
                PbxApi.SystemDeleteModule(params.uniqid, keepSettings, extensionModules.cbAfterDelete);
              });
            } else {
              PbxApi.SystemDeleteModule(params.uniqid, keepSettings, extensionModules.cbAfterDelete);
            }

            return true;
          }

          return onApprove;
        }()
      }).modal('show');
    }

    return deleteModule;
  }(),

  /**
   * Обработчик команды uninstall для модуля
   * Если успешно, перегрузим страницу, если нет, то сообщим об ошибке
   * @param result - результат удаления модуля
   */
  cbAfterDelete: function () {
    function cbAfterDelete(result) {
      $('a.button').removeClass('disabled');

      if (result === true) {
        window.location = "".concat(globalRootUrl, "pbx-extension-modules/index/");
      } else {
        $('.ui.message.ajax').remove();
        var errorMessage = result.data !== undefined ? result.data : '';
        errorMessage = errorMessage.replace(/\n/g, '<br>');
        UserMessage.showError(errorMessage, globalTranslate.ext_DeleteModuleError);
      }
    }

    return cbAfterDelete;
  }(),

  /**
   * Сравнение версий модулей
   * @param v1
   * @param v2
   * @param options
   * @returns {number}
   */
  versionCompare: function () {
    function versionCompare(v1, v2, options) {
      var lexicographical = options && options.lexicographical;
      var zeroExtend = options && options.zeroExtend;
      var v1parts = v1.split('.');
      var v2parts = v2.split('.');

      function isValidPart(x) {
        return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
      }

      if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
        return NaN;
      }

      if (zeroExtend) {
        while (v1parts.length < v2parts.length) {
          v1parts.push('0');
        }

        while (v2parts.length < v1parts.length) {
          v2parts.push('0');
        }
      }

      if (!lexicographical) {
        v1parts = v1parts.map(Number);
        v2parts = v2parts.map(Number);
      }

      for (var i = 0; i < v1parts.length; i += 1) {
        if (v2parts.length === i) {
          return 1;
        }

        if (v1parts[i] === v2parts[i]) {//
        } else if (v1parts[i] > v2parts[i]) {
          return 1;
        } else {
          return -1;
        }
      }

      if (v1parts.length !== v2parts.length) {
        return -1;
      }

      return 0;
    }

    return versionCompare;
  }()
};
$(document).ready(function () {
  extensionModules.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicHVzaCIsIlBieEV4dGVuc2lvblN0YXR1cyIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImFwcGVuZFRvIiwicmVzcG9uc2UiLCJtb2R1bGVzIiwiZm9yRWFjaCIsIm1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCIsIm1pbl9wYnhfdmVyc2lvbiIsImN1cnJlbnRWZXJzaW9uUEJYIiwidmVyc2lvbkNvbXBhcmUiLCIkbW9kdWxlUm93IiwidW5pcWlkIiwibGVuZ3RoIiwib2xkVmVyIiwiZmluZCIsInRleHQiLCJuZXdWZXIiLCJ2ZXJzaW9uIiwiYWRkVXBkYXRlQnV0dG9uVG9Sb3ciLCIkbmV3TW9kdWxlUm93IiwicmVtb3ZlIiwiYWRkTW9kdWxlRGVzY3JpcHRpb24iLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZENsYXNzIiwicGFyYW1zIiwiJGFMaW5rIiwidGFyZ2V0IiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwicmVsZWFzZUlkIiwic2l6ZSIsImxpY1Byb2R1Y3RJZCIsImxpY0ZlYXR1cmVJZCIsImFjdGlvbiIsImFMaW5rIiwibGljZW5zaW5nIiwiY2FwdHVyZUZlYXR1cmUiLCJjYkFmdGVyTGljZW5zZUNoZWNrIiwiZGVsZXRlTW9kdWxlIiwicG9wdXAiLCJzaG93IiwicHJvbW9MaW5rIiwicHJvbW9fbGluayIsInVuZGVmaW5lZCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9FeHRlcm5hbERlc2NyaXB0aW9uIiwiZHltYW5pY1JvdyIsImRlY29kZVVSSUNvbXBvbmVudCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsImRldmVsb3BlciIsImV4dF9JbnN0YWxsTW9kdWxlIiwibGljX3Byb2R1Y3RfaWQiLCJsaWNfZmVhdHVyZV9pZCIsInJlbGVhc2VfaWQiLCJhcHBlbmQiLCIkY3VycmVudFVwZGF0ZUJ1dHRvbiIsImR5bmFtaWNCdXR0b24iLCJleHRfVXBkYXRlTW9kdWxlIiwicHJlcGVuZCIsIkdldE1vZHVsZUluc3RhbGxMaW5rIiwiY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZSIsIm5ld1BhcmFtcyIsIm1kNSIsInVwZGF0ZUxpbmsiLCJocmVmIiwidXBkYXRlTW9kdWxlIiwiaW5zdGFsbE1vZHVsZSIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZXh0X0dldExpbmtFcnJvciIsInN0YXR1cyIsImNoZWNrYm94IiwiUGJ4QXBpIiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsIm5lZWRFbmFibGUiLCJTeXN0ZW1JbnN0YWxsTW9kdWxlIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJtZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X0luc3RhbGxhdGlvbkVycm9yIiwicmVsb2FkTW9kdWxlQW5kUGFnZSIsIlN5c3RlbVJlbG9hZE1vZHVsZSIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwia2VlcFNldHRpbmdzIiwiU3lzdGVtRGVsZXRlTW9kdWxlIiwiY2JBZnRlckRlbGV0ZSIsInJlc3VsdCIsImVycm9yTWVzc2FnZSIsImRhdGEiLCJleHRfRGVsZXRlTW9kdWxlRXJyb3IiLCJ2MSIsInYyIiwib3B0aW9ucyIsImxleGljb2dyYXBoaWNhbCIsInplcm9FeHRlbmQiLCJ2MXBhcnRzIiwic3BsaXQiLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsImV2ZXJ5IiwiTmFOIiwibWFwIiwiTnVtYmVyIiwiaSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7OztBQUtBLElBQU1BLGdCQUFnQixHQUFHO0FBQ3hCQyxFQUFBQSxXQUFXLEVBQUVDLENBQUMsQ0FBQyx1QkFBRCxDQURVO0FBRXhCQyxFQUFBQSxnQkFBZ0IsRUFBRUQsQ0FBQyxDQUFDLG9CQUFELENBRks7QUFHeEJFLEVBQUFBLHFCQUFxQixFQUFFRixDQUFDLENBQUMscUJBQUQsQ0FIQTtBQUl4QkcsRUFBQUEsYUFBYSxFQUFFSCxDQUFDLENBQUMsZ0JBQUQsQ0FKUTtBQUt4QkksRUFBQUEsVUFBVSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FMWTtBQU14QkMsRUFBQUEsVUFBVSxFQUFFLEVBTlk7QUFPeEJDLEVBQUFBLFVBUHdCO0FBQUEsMEJBT1g7QUFDWlYsTUFBQUEsZ0JBQWdCLENBQUNHLGdCQUFqQixDQUFrQ1EsS0FBbEM7QUFDQVgsTUFBQUEsZ0JBQWdCLENBQUNZLG1CQUFqQjtBQUNBQyxNQUFBQSxTQUFTLENBQUNDLGlCQUFWLENBQTRCZCxnQkFBZ0IsQ0FBQ2Usb0JBQTdDO0FBQ0FmLE1BQUFBLGdCQUFnQixDQUFDQyxXQUFqQixDQUE2QmUsSUFBN0IsQ0FBa0MsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQ2pELFlBQU1DLE1BQU0sR0FBR2pCLENBQUMsQ0FBQ2dCLEdBQUQsQ0FB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QUFPLENBQVA7QUFDQSxTQUZNLE1BRUE7QUFDTixpQkFBTyxDQUFDLENBQVI7QUFDQTtBQUNEOztBQUVELFVBQUlWLE9BQU8sQ0FBQzVGLE1BQVIsS0FBbUI4RixPQUFPLENBQUM5RixNQUEvQixFQUF1QztBQUN0QyxlQUFPLENBQUMsQ0FBUjtBQUNBOztBQUVELGFBQU8sQ0FBUDtBQUNBOztBQTdXdUI7QUFBQTtBQUFBLENBQXpCO0FBaVhBeEMsQ0FBQyxDQUFDK0ksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QmxKLEVBQUFBLGdCQUFnQixDQUFDVSxVQUFqQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLFxuVXBkYXRlQXBpLCBVc2VyTWVzc2FnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgU2VtYW50aWNMb2NhbGl6YXRpb24sXG51cGdyYWRlU3RhdHVzTG9vcFdvcmtlciwgbGljZW5zaW5nLCBQYnhFeHRlbnNpb25TdGF0dXMgKi9cblxuXG5jb25zdCBleHRlbnNpb25Nb2R1bGVzID0ge1xuXHQkY2hlY2tib3hlczogJCgnLm1vZHVsZS1yb3cgLmNoZWNrYm94JyksXG5cdCRkZWxldGVNb2RhbEZvcm06ICQoJyNkZWxldGUtbW9kYWwtZm9ybScpLFxuXHQka2VlcFNldHRpbmdzQ2hlY2tib3g6ICQoJyNrZWVwTW9kdWxlU2V0dGluZ3MnKSxcblx0JG1vZHVsZXNUYWJsZTogJCgnI21vZHVsZXMtdGFibGUnKSxcblx0cGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblx0Y2hlY2tCb3hlczogW10sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kZGVsZXRlTW9kYWxGb3JtLm1vZGFsKCk7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG5cdFx0VXBkYXRlQXBpLmdldE1vZHVsZXNVcGRhdGVzKGV4dGVuc2lvbk1vZHVsZXMuY2JQYXJzZU1vZHVsZVVwZGF0ZXMpO1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJGNoZWNrYm94ZXMuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0Y29uc3QgdW5pcUlkID0gJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuY2hlY2tCb3hlcy5wdXNoKG5ldyBQYnhFeHRlbnNpb25TdGF0dXModW5pcUlkLCBmYWxzZSkpO1xuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuXHQgKi9cblx0aW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRtb2R1bGVzVGFibGUuRGF0YVRhYmxlKHtcblx0XHRcdGxlbmd0aENoYW5nZTogZmFsc2UsXG5cdFx0XHRwYWdpbmc6IGZhbHNlLFxuXHRcdFx0Y29sdW1uczogW1xuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdHsgb3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2UgfSxcblx0XHRcdF0sXG5cdFx0XHQvLyBvcmRlcjogWzEsICdhc2MnXSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0fSk7XG5cdFx0JCgnLmFkZC1uZXcnKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINGB0L/QuNGB0LrQsCDQvNC+0LTRg9C70LXQuSDQv9C+0LvRg9GH0LXQvdC90YUg0YEg0YHQsNC50YLQsFxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlKSB7XG5cdFx0cmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0L/QvtC00YXQvtC00LjRgiDQu9C4INC/0L4g0L3QvtC80LXRgNGDINCy0LXRgNGB0LjQuCDRjdGC0L7RgiDQvNC+0LTRg9C70Ywg0Log0JDQotChXG5cdFx0XHRjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuXHRcdFx0Y29uc3QgY3VycmVudFZlcnNpb25QQlggPSBleHRlbnNpb25Nb2R1bGVzLnBieFZlcnNpb247XG5cdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShjdXJyZW50VmVyc2lvblBCWCwgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYKSA8IDApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Ly8g0JjRidC10Lwg0YHRgNC10LTQuCDRg9GB0YLQsNC90L7QstC70LXQvdC90YvRhSwg0L/RgNC10LTQu9C+0LbQuNC8INC+0LHQvdC+0LLQu9C10L3QuNC1XG5cdFx0XHRjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG5cdFx0XHRpZiAoJG1vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGNvbnN0IG9sZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcblx0XHRcdFx0Y29uc3QgbmV3VmVyID0gb2JqLnZlcnNpb247XG5cdFx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA+IDApIHtcblx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaik7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnN0ICRuZXdNb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG5cdFx0XHRcdGlmICgkbmV3TW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRjb25zdCBvbGRWZXIgPSAkbmV3TW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG5cdFx0XHRcdFx0Y29uc3QgbmV3VmVyID0gb2JqLnZlcnNpb247XG5cdFx0XHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpID4gMCkge1xuXHRcdFx0XHRcdFx0JG5ld01vZHVsZVJvdy5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQkKCdhLmRvd25sb2FkJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSB7fTtcblx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcblx0XHRcdCRhTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignZGF0YS11bmlxaWQnKTtcblx0XHRcdHBhcmFtcy5yZWxlYXNlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1pZCcpO1xuXHRcdFx0cGFyYW1zLnNpemUgPSAkYUxpbmsuYXR0cignZGF0YS1zaXplJyk7XG5cdFx0XHRwYXJhbXMubGljUHJvZHVjdElkID0gJGFMaW5rLmF0dHIoJ2RhdGEtcHJvZHVjdGlkJyk7XG5cdFx0XHRwYXJhbXMubGljRmVhdHVyZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtZmVhdHVyZWlkJyk7XG5cdFx0XHRwYXJhbXMuYWN0aW9uID0gJ2luc3RhbGwnO1xuXHRcdFx0cGFyYW1zLmFMaW5rID0gJGFMaW5rO1xuXG5cdFx0XHRsaWNlbnNpbmcuY2FwdHVyZUZlYXR1cmUocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuXHRcdH0pO1xuXHRcdCQoJ2EudXBkYXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSB7fTtcblx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcblx0XHRcdCRhTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcblx0XHRcdHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcblx0XHRcdHBhcmFtcy5hY3Rpb24gPSAndXBkYXRlJztcblx0XHRcdHBhcmFtcy5yZWxlYXNlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1pZCcpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuXHRcdFx0cGFyYW1zLnNpemUgPSAkYUxpbmsuYXR0cignZGF0YS1zaXplJyk7XG5cdFx0XHRwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG5cdFx0XHRsaWNlbnNpbmcuY2FwdHVyZUZlYXR1cmUocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuXHRcdH0pO1xuXHRcdCQoJ2EuZGVsZXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHQkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSBbXTtcblx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2lkJyk7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmRlbGV0ZU1vZHVsZShwYXJhbXMpO1xuXHRcdH0pO1xuXHRcdCQoJ2FbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQlNC+0LHQsNCy0LvRj9C10YIg0L7Qv9C40YHQsNC90LjQtSDQtNC+0YHRgtGD0L/QvdC+0LPQviDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIG9ialxuXHQgKi9cblx0YWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKSB7XG5cdFx0JCgnI29ubGluZS11cGRhdGVzLWJsb2NrJykuc2hvdygpO1xuXHRcdGxldCBwcm9tb0xpbmsgPSAnJztcblx0XHRpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuXHRcdFx0cHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcblx0XHR9XG5cdFx0Y29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgaWQ9XCIke29iai51bmlxaWR9XCI+XG5cdFx0XHRcdFx0XHQ8dGQ+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pfSAke3Byb21vTGlua308L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L3RkPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZFwiIFxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1jb250ZW50PSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXVuaXFpZCA9IFwiJHtvYmoudW5pcWlkfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtcHJvZHVjdElkID0gXCIke29iai5saWNfcHJvZHVjdF9pZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1mZWF0dXJlSWQgPSBcIiR7b2JqLmxpY19mZWF0dXJlX2lkfVwiIFxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1pZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuXHRcdFx0XHRcdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+IFxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0XHRcdFx0XHRcdDwvYT5cbiAgICBcdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvdHI+YDtcblx0XHQkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCU0L7QsdCw0LLQu9GP0LXRgiDQutC90L7Qv9C60YMg0L7QsdC90L7QstC70LXQvdC40Y8g0YHRgtCw0YDQvtC5INCy0LXRgNGB0LjQuCBQQlhcblx0ICogQHBhcmFtIG9ialxuXHQgKi9cblx0YWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKSB7XG5cdFx0Y29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdGNvbnN0ICRjdXJyZW50VXBkYXRlQnV0dG9uID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCkuZmluZCgnYS51cGRhdGUnKTtcblx0XHRpZiAoJGN1cnJlbnRVcGRhdGVCdXR0b24ubGVuZ3RoID4gMCkge1xuXHRcdFx0Y29uc3Qgb2xkVmVyID0gJGN1cnJlbnRVcGRhdGVCdXR0b24uYXR0cignZGF0YS12ZXInKTtcblx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpIDw9IDApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQkY3VycmVudFVwZGF0ZUJ1dHRvbi5yZW1vdmUoKTtcblx0XHRjb25zdCBkeW5hbWljQnV0dG9uXG5cdFx0XHQ9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYnV0dG9uIHVwZGF0ZSBwb3B1cGVkXCIgXG5cdFx0XHRkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlfVwiXG5cdFx0XHRkYXRhLXZlciA9XCIke29iai52ZXJzaW9ufVwiXG5cdFx0XHRkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG5cdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+IFxuXHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0PC9hPmA7XG5cdFx0JG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YTQuNGH0LAg0LfQsNGF0LLQsNGH0LXQvdCwLCDQvtCx0YDQsNGJ0LDQtdC80YHRjyDQuiDRgdC10YDQstC10YDRg1xuXHQgKiDQvtCx0L3QvtCy0LvQtdC90LjQuSDQt9CwINC/0L7Qu9GD0YfQtdC90LjQuNC10Lwg0LTQuNGB0YLRgNC40LHRg9GC0LjQstCwXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRjYkFmdGVyTGljZW5zZUNoZWNrKHBhcmFtcykge1xuXHRcdFVwZGF0ZUFwaS5HZXRNb2R1bGVJbnN0YWxsTGluayhcblx0XHRcdHBhcmFtcyxcblx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MsXG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlLFxuXHRcdCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQldGB0LvQuCDRgdCw0LnRgiDQstC10YDQvdGD0Lsg0YHRgdGL0LvQutGDINC90LAg0L7QsdC90L7QstC70LXQvdC40LVcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzKHBhcmFtcywgcmVzcG9uc2UpIHtcblx0XHRjb25zdCBuZXdQYXJhbXMgPSBwYXJhbXM7XG5cdFx0cmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdG5ld1BhcmFtcy5tZDUgPSBvYmoubWQ1O1xuXHRcdFx0bmV3UGFyYW1zLnVwZGF0ZUxpbmsgPSBvYmouaHJlZjtcblx0XHRcdGlmIChuZXdQYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuXHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMudXBkYXRlTW9kdWxlKG5ld1BhcmFtcyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nIHJlZG8nKS5yZW1vdmVDbGFzcygnZG93bmxvYWQnKTtcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKG5ld1BhcmFtcywgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YHQsNC50YIg0L7RgtC60LDQt9Cw0Lsg0LIg0L7QsdC90L7QstC70LXQvdC40LgsINC90LUg0LfQsNGF0LLQsNGH0LXQvdCwINC90YPQttC90LDRjyDRhNC40YfQsFxuXHQgKi9cblx0Y2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUocGFyYW1zKSB7XG5cdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0fVxuXHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXh0X0dldExpbmtFcnJvcik7XG5cdH0sXG5cdC8qKlxuXHQgKiDQodC90LDRh9Cw0LvQsCDQvtGC0LrQu9GO0YfQuNC8INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0L/QvtC70YPRh9C40YLRgdGPLCDRgtC+INC+0YLQv9GA0LDQstC40Lwg0LrQvtC80LDQvdC00YMg0L3QsCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHQgKiDQuCDQvtCx0L3QvtCy0LjQvCDRgdGC0YDQsNC90LjRh9C60YNcblx0ICogQHBhcmFtIHBhcmFtcyAtINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsFxuXHQgKi9cblx0dXBkYXRlTW9kdWxlKHBhcmFtcykge1xuXHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0LLQutC70Y7Rh9C10L0g0LvQuCDQvNC+0LTRg9C70YwsINC10YHQu9C4INCy0LrQu9GO0YfQtdC9LCDQstGL0YDRg9Cx0LjQvCDQtdCz0L5cblx0XHRjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0aWYgKHN0YXR1cyA9PT0gdHJ1ZSkge1xuXHRcdFx0UGJ4QXBpLlN5c3RlbURpc2FibGVNb2R1bGUocGFyYW1zLnVuaXFpZCwgKCkgPT4ge1xuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUocGFyYW1zLCB0cnVlKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUocGFyYW1zLCBmYWxzZSk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70LXQvdC40LUg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LBcblx0ICogQHBhcmFtIG5lZWRFbmFibGUgLSDQstC60LvRjtGH0LjRgtGMINC70Lgg0LzQvtC00YPQu9GMINC/0L7RgdC70LUg0YPRgdGC0LDQvdC+0LLQutC4P1xuXHQgKi9cblx0aW5zdGFsbE1vZHVsZShwYXJhbXMsIG5lZWRFbmFibGUpIHtcblx0XHRQYnhBcGkuU3lzdGVtSW5zdGFsbE1vZHVsZShwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuXHRcdFx0aWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG5cdFx0XHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUocGFyYW1zLnVuaXFpZCwgbmVlZEVuYWJsZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UubWVzc2FnZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2UpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0LXRgNC10LfQsNC/0YPRgdC6INC80L7QtNGD0LvRjyDQuCDQv9C10YDQtdC30LDQs9GA0YPQt9C60LAg0YHRgtGA0LDQvdC40YbRi1xuXHQgKiBAcGFyYW0gdW5pcWlkIC0gSUQg0LzQvtC00YPQu9GPXG5cdCAqL1xuXHRyZWxvYWRNb2R1bGVBbmRQYWdlKHVuaXFpZCkge1xuXHRcdFBieEFwaS5TeXN0ZW1SZWxvYWRNb2R1bGUodW5pcWlkKTtcblx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleC9gO1xuXHR9LFxuXHQvKipcblx0ICog0KHQvdCw0YfQsNC70LAg0L7RgtC60LvRjtGH0LjQvCDQvNC+0LTRg9C70YwsINC10YHQu9C4INC/0L7Qu9GD0YfQuNGC0YHRjywg0YLQviDQvtGC0L/RgNCw0LLQuNC8INC60L7QvNCw0L3QtNGDINC90LAg0YPQtNCw0LvQtdC90LjQtVxuXHQgKiDQuCDQvtCx0L3QvtCy0LjQvCDRgdGC0YDQsNC90LjRh9C60YNcblx0ICogQHBhcmFtIHBhcmFtcyAtINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsC5cblx0ICovXG5cdGRlbGV0ZU1vZHVsZShwYXJhbXMpIHtcblx0XHQvLyBD0L/RgNC+0YHQuNC8INC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjyDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LvQuCDQvdCw0YHRgtGA0L7QudC60Lhcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm1cblx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0b25EZW55OiAoKSA9PiB7XG5cdFx0XHRcdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BcHByb3ZlOiAoKSA9PiB7XG5cdFx0XHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQstC60LvRjtGH0LXQvSDQu9C4INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0LLQutC70Y7Rh9C10L0sINCy0YvRgNGD0LHQuNC8INC10LPQvlxuXHRcdFx0XHRcdGNvbnN0IHN0YXR1cyA9ICQoYCMke3BhcmFtcy51bmlxaWR9YCkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRcdFx0XHRjb25zdCBrZWVwU2V0dGluZ3MgPSBleHRlbnNpb25Nb2R1bGVzLiRrZWVwU2V0dGluZ3NDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXHRcdFx0XHRcdGlmIChzdGF0dXMgPT09IHRydWUpIHtcblx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EaXNhYmxlTW9kdWxlKHBhcmFtcy51bmlxaWQsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbURlbGV0ZU1vZHVsZShcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMudW5pcWlkLFxuXHRcdFx0XHRcdFx0XHRcdGtlZXBTZXR0aW5ncyxcblx0XHRcdFx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUsXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbURlbGV0ZU1vZHVsZShwYXJhbXMudW5pcWlkLCBrZWVwU2V0dGluZ3MsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSlcblx0XHRcdC5tb2RhbCgnc2hvdycpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLRh9C40Log0LrQvtC80LDQvdC00YsgdW5pbnN0YWxsINC00LvRjyDQvNC+0LTRg9C70Y9cblx0ICog0JXRgdC70Lgg0YPRgdC/0LXRiNC90L4sINC/0LXRgNC10LPRgNGD0LfQuNC8INGB0YLRgNCw0L3QuNGG0YMsINC10YHQu9C4INC90LXRgiwg0YLQviDRgdC+0L7QsdGJ0LjQvCDQvtCxINC+0YjQuNCx0LrQtVxuXHQgKiBAcGFyYW0gcmVzdWx0IC0g0YDQtdC30YPQu9GM0YLQsNGCINGD0LTQsNC70LXQvdC40Y8g0LzQvtC00YPQu9GPXG5cdCAqL1xuXHRjYkFmdGVyRGVsZXRlKHJlc3VsdCkge1xuXHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0aWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXHRcdFx0bGV0IGVycm9yTWVzc2FnZSA9IChyZXN1bHQuZGF0YSAhPT0gdW5kZWZpbmVkKSA/IHJlc3VsdC5kYXRhIDogJyc7XG5cdFx0XHRlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2UucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0RlbGV0ZU1vZHVsZUVycm9yKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQodGA0LDQstC90LXQvdC40LUg0LLQtdGA0YHQuNC5INC80L7QtNGD0LvQtdC5XG5cdCAqIEBwYXJhbSB2MVxuXHQgKiBAcGFyYW0gdjJcblx0ICogQHBhcmFtIG9wdGlvbnNcblx0ICogQHJldHVybnMge251bWJlcn1cblx0ICovXG5cdHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuXHRcdGNvbnN0IGxleGljb2dyYXBoaWNhbCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5sZXhpY29ncmFwaGljYWw7XG5cdFx0Y29uc3QgemVyb0V4dGVuZCA9IG9wdGlvbnMgJiYgb3B0aW9ucy56ZXJvRXh0ZW5kO1xuXHRcdGxldCB2MXBhcnRzID0gdjEuc3BsaXQoJy4nKTtcblx0XHRsZXQgdjJwYXJ0cyA9IHYyLnNwbGl0KCcuJyk7XG5cblx0XHRmdW5jdGlvbiBpc1ZhbGlkUGFydCh4KSB7XG5cdFx0XHRyZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXpdKiQvIDogL15cXGQrJC8pLnRlc3QoeCk7XG5cdFx0fVxuXG5cdFx0aWYgKCF2MXBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSB8fCAhdjJwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkpIHtcblx0XHRcdHJldHVybiBOYU47XG5cdFx0fVxuXG5cdFx0aWYgKHplcm9FeHRlbmQpIHtcblx0XHRcdHdoaWxlICh2MXBhcnRzLmxlbmd0aCA8IHYycGFydHMubGVuZ3RoKSB2MXBhcnRzLnB1c2goJzAnKTtcblx0XHRcdHdoaWxlICh2MnBhcnRzLmxlbmd0aCA8IHYxcGFydHMubGVuZ3RoKSB2MnBhcnRzLnB1c2goJzAnKTtcblx0XHR9XG5cblx0XHRpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuXHRcdFx0djFwYXJ0cyA9IHYxcGFydHMubWFwKE51bWJlcik7XG5cdFx0XHR2MnBhcnRzID0gdjJwYXJ0cy5tYXAoTnVtYmVyKTtcblx0XHR9XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHYxcGFydHMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGlmICh2MnBhcnRzLmxlbmd0aCA9PT0gaSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblx0XHRcdGlmICh2MXBhcnRzW2ldID09PSB2MnBhcnRzW2ldKSB7XG5cdFx0XHRcdC8vXG5cdFx0XHR9IGVsc2UgaWYgKHYxcGFydHNbaV0gPiB2MnBhcnRzW2ldKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcblx0XHRcdHJldHVybiAtMTtcblx0XHR9XG5cblx0XHRyZXR1cm4gMDtcblx0fSxcblxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19