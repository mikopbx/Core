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
        PbxApi.ModuleDisable(params.uniqid, function () {
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
              PbxApi.ModuleDisable(params.uniqid, function () {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicHVzaCIsIlBieEV4dGVuc2lvblN0YXR1cyIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImFwcGVuZFRvIiwicmVzcG9uc2UiLCJtb2R1bGVzIiwiZm9yRWFjaCIsIm1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCIsIm1pbl9wYnhfdmVyc2lvbiIsImN1cnJlbnRWZXJzaW9uUEJYIiwidmVyc2lvbkNvbXBhcmUiLCIkbW9kdWxlUm93IiwidW5pcWlkIiwibGVuZ3RoIiwib2xkVmVyIiwiZmluZCIsInRleHQiLCJuZXdWZXIiLCJ2ZXJzaW9uIiwiYWRkVXBkYXRlQnV0dG9uVG9Sb3ciLCIkbmV3TW9kdWxlUm93IiwicmVtb3ZlIiwiYWRkTW9kdWxlRGVzY3JpcHRpb24iLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZENsYXNzIiwicGFyYW1zIiwiJGFMaW5rIiwidGFyZ2V0IiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwicmVsZWFzZUlkIiwic2l6ZSIsImxpY1Byb2R1Y3RJZCIsImxpY0ZlYXR1cmVJZCIsImFjdGlvbiIsImFMaW5rIiwibGljZW5zaW5nIiwiY2FwdHVyZUZlYXR1cmUiLCJjYkFmdGVyTGljZW5zZUNoZWNrIiwiZGVsZXRlTW9kdWxlIiwicG9wdXAiLCJzaG93IiwicHJvbW9MaW5rIiwicHJvbW9fbGluayIsInVuZGVmaW5lZCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9FeHRlcm5hbERlc2NyaXB0aW9uIiwiZHltYW5pY1JvdyIsImRlY29kZVVSSUNvbXBvbmVudCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsImRldmVsb3BlciIsImV4dF9JbnN0YWxsTW9kdWxlIiwibGljX3Byb2R1Y3RfaWQiLCJsaWNfZmVhdHVyZV9pZCIsInJlbGVhc2VfaWQiLCJhcHBlbmQiLCIkY3VycmVudFVwZGF0ZUJ1dHRvbiIsImR5bmFtaWNCdXR0b24iLCJleHRfVXBkYXRlTW9kdWxlIiwicHJlcGVuZCIsIkdldE1vZHVsZUluc3RhbGxMaW5rIiwiY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZSIsIm5ld1BhcmFtcyIsIm1kNSIsInVwZGF0ZUxpbmsiLCJocmVmIiwidXBkYXRlTW9kdWxlIiwiaW5zdGFsbE1vZHVsZSIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZXh0X0dldExpbmtFcnJvciIsInN0YXR1cyIsImNoZWNrYm94IiwiUGJ4QXBpIiwiTW9kdWxlRGlzYWJsZSIsIm5lZWRFbmFibGUiLCJTeXN0ZW1JbnN0YWxsTW9kdWxlIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJtZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZXh0X0luc3RhbGxhdGlvbkVycm9yIiwicmVsb2FkTW9kdWxlQW5kUGFnZSIsIlN5c3RlbVJlbG9hZE1vZHVsZSIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwia2VlcFNldHRpbmdzIiwiU3lzdGVtRGVsZXRlTW9kdWxlIiwiY2JBZnRlckRlbGV0ZSIsInJlc3VsdCIsImVycm9yTWVzc2FnZSIsImRhdGEiLCJleHRfRGVsZXRlTW9kdWxlRXJyb3IiLCJ2MSIsInYyIiwib3B0aW9ucyIsImxleGljb2dyYXBoaWNhbCIsInplcm9FeHRlbmQiLCJ2MXBhcnRzIiwic3BsaXQiLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsImV2ZXJ5IiwiTmFOIiwibWFwIiwiTnVtYmVyIiwiaSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7OztBQUtBLElBQU1BLGdCQUFnQixHQUFHO0FBQ3hCQyxFQUFBQSxXQUFXLEVBQUVDLENBQUMsQ0FBQyx1QkFBRCxDQURVO0FBRXhCQyxFQUFBQSxnQkFBZ0IsRUFBRUQsQ0FBQyxDQUFDLG9CQUFELENBRks7QUFHeEJFLEVBQUFBLHFCQUFxQixFQUFFRixDQUFDLENBQUMscUJBQUQsQ0FIQTtBQUl4QkcsRUFBQUEsYUFBYSxFQUFFSCxDQUFDLENBQUMsZ0JBQUQsQ0FKUTtBQUt4QkksRUFBQUEsVUFBVSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FMWTtBQU14QkMsRUFBQUEsVUFBVSxFQUFFLEVBTlk7QUFPeEJDLEVBQUFBLFVBUHdCO0FBQUEsMEJBT1g7QUFDWlYsTUFBQUEsZ0JBQWdCLENBQUNHLGdCQUFqQixDQUFrQ1EsS0FBbEM7QUFDQVgsTUFBQUEsZ0JBQWdCLENBQUNZLG1CQUFqQjtBQUNBQyxNQUFBQSxTQUFTLENBQUNDLGlCQUFWLENBQTRCZCxnQkFBZ0IsQ0FBQ2Usb0JBQTdDO0FBQ0FmLE1BQUFBLGdCQUFnQixDQUFDQyxXQUFqQixDQUE2QmUsSUFBN0IsQ0FBa0MsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQ2pELFlBQU1DLE1BQU0sR0FBR2pCLENBQUMsQ0FBQ2dCLEdBQUQsQ0FBRCxDQUFP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O0FBQ0EsU0FGTSxNQUVBO0FBQ04saUJBQU8sQ0FBQyxDQUFSO0FBQ0E7QUFDRDs7QUFFRCxVQUFJVixPQUFPLENBQUM1RixNQUFSLEtBQW1COEYsT0FBTyxDQUFDOUYsTUFBL0IsRUFBdUM7QUFDdEMsZUFBTyxDQUFDLENBQVI7QUFDQTs7QUFFRCxhQUFPLENBQVA7QUFDQTs7QUE3V3VCO0FBQUE7QUFBQSxDQUF6QjtBQWlYQXhDLENBQUMsQ0FBQytJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJsSixFQUFBQSxnQkFBZ0IsQ0FBQ1UsVUFBakI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSxcblVwZGF0ZUFwaSwgVXNlck1lc3NhZ2UsIGdsb2JhbFBCWFZlcnNpb24sIFNlbWFudGljTG9jYWxpemF0aW9uLFxudXBncmFkZVN0YXR1c0xvb3BXb3JrZXIsIGxpY2Vuc2luZywgUGJ4RXh0ZW5zaW9uU3RhdHVzICovXG5cblxuY29uc3QgZXh0ZW5zaW9uTW9kdWxlcyA9IHtcblx0JGNoZWNrYm94ZXM6ICQoJy5tb2R1bGUtcm93IC5jaGVja2JveCcpLFxuXHQkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblx0JGtlZXBTZXR0aW5nc0NoZWNrYm94OiAkKCcja2VlcE1vZHVsZVNldHRpbmdzJyksXG5cdCRtb2R1bGVzVGFibGU6ICQoJyNtb2R1bGVzLXRhYmxlJyksXG5cdHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cdGNoZWNrQm94ZXM6IFtdLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXHRcdFVwZGF0ZUFwaS5nZXRNb2R1bGVzVXBkYXRlcyhleHRlbnNpb25Nb2R1bGVzLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRjaGVja2JveGVzLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdGNvbnN0IHVuaXFJZCA9ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNoZWNrQm94ZXMucHVzaChuZXcgUGJ4RXh0ZW5zaW9uU3RhdHVzKHVuaXFJZCwgZmFsc2UpKTtcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEluaXRpYWxpemUgZGF0YSB0YWJsZXMgb24gdGFibGVcblx0ICovXG5cdGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kbW9kdWxlc1RhYmxlLkRhdGFUYWJsZSh7XG5cdFx0XHRsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuXHRcdFx0cGFnaW5nOiBmYWxzZSxcblx0XHRcdGNvbHVtbnM6IFtcblx0XHRcdFx0eyBvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZSB9LFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRdLFxuXHRcdFx0Ly8gb3JkZXI6IFsxLCAnYXNjJ10sXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdH0pO1xuXHRcdCQoJy5hZGQtbmV3JykuYXBwZW5kVG8oJCgnZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDRgdC/0LjRgdC60LAg0LzQvtC00YPQu9C10Lkg0L/QvtC70YPRh9C10L3QvdGFINGBINGB0LDQudGC0LBcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYlBhcnNlTW9kdWxlVXBkYXRlcyhyZXNwb25zZSkge1xuXHRcdHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC/0L7QtNGF0L7QtNC40YIg0LvQuCDQv9C+INC90L7QvNC10YDRgyDQstC10YDRgdC40Lgg0Y3RgtC+0YIg0LzQvtC00YPQu9GMINC6INCQ0KLQoVxuXHRcdFx0Y29uc3QgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYID0gb2JqLm1pbl9wYnhfdmVyc2lvbjtcblx0XHRcdGNvbnN0IGN1cnJlbnRWZXJzaW9uUEJYID0gZXh0ZW5zaW9uTW9kdWxlcy5wYnhWZXJzaW9uO1xuXHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUoY3VycmVudFZlcnNpb25QQlgsIG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCkgPCAwKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdC8vINCY0YnQtdC8INGB0YDQtdC00Lgg0YPRgdGC0LDQvdC+0LLQu9C10L3QvdGL0YUsINC/0YDQtdC00LvQvtC20LjQvCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHRcdFx0Y29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdFx0aWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRjb25zdCBvbGRWZXIgPSAkbW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG5cdFx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5hZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCAkbmV3TW9kdWxlUm93ID0gJChgdHIubmV3LW1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdFx0XHRpZiAoJG5ld01vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0Y29uc3Qgb2xkVmVyID0gJG5ld01vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuXHRcdFx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA+IDApIHtcblx0XHRcdFx0XHRcdCRuZXdNb2R1bGVSb3cucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0JCgnYS5kb3dubG9hZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0ge307XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHQkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtdW5pcWlkJyk7XG5cdFx0XHRwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcblx0XHRcdHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuXHRcdFx0cGFyYW1zLmxpY1Byb2R1Y3RJZCA9ICRhTGluay5hdHRyKCdkYXRhLXByb2R1Y3RpZCcpO1xuXHRcdFx0cGFyYW1zLmxpY0ZlYXR1cmVJZCA9ICRhTGluay5hdHRyKCdkYXRhLWZlYXR1cmVpZCcpO1xuXHRcdFx0cGFyYW1zLmFjdGlvbiA9ICdpbnN0YWxsJztcblx0XHRcdHBhcmFtcy5hTGluayA9ICRhTGluaztcblxuXHRcdFx0bGljZW5zaW5nLmNhcHR1cmVGZWF0dXJlKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcblx0XHR9KTtcblx0XHQkKCdhLnVwZGF0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0ge307XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHQkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRwYXJhbXMubGljUHJvZHVjdElkID0gJGFMaW5rLmF0dHIoJ2RhdGEtcHJvZHVjdGlkJyk7XG5cdFx0XHRwYXJhbXMubGljRmVhdHVyZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtZmVhdHVyZWlkJyk7XG5cdFx0XHRwYXJhbXMuYWN0aW9uID0gJ3VwZGF0ZSc7XG5cdFx0XHRwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcblx0XHRcdHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignZGF0YS11bmlxaWQnKTtcblx0XHRcdHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuXHRcdFx0cGFyYW1zLmFMaW5rID0gJGFMaW5rO1xuXHRcdFx0bGljZW5zaW5nLmNhcHR1cmVGZWF0dXJlKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcblx0XHR9KTtcblx0XHQkKCdhLmRlbGV0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0JChlLnRhcmdldCkuY2xvc2VzdCgnYScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0gW107XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdpZCcpO1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5kZWxldGVNb2R1bGUocGFyYW1zKTtcblx0XHR9KTtcblx0XHQkKCdhW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuXHR9LFxuXHQvKipcblx0ICog0JTQvtCx0LDQstC70Y/QtdGCINC+0L/QuNGB0LDQvdC40LUg0LTQvtGB0YLRg9C/0L3QvtCz0L4g0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBvYmpcblx0ICovXG5cdGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuXHRcdCQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcblx0XHRsZXQgcHJvbW9MaW5rID0gJyc7XG5cdFx0aWYgKG9iai5wcm9tb19saW5rICE9PSB1bmRlZmluZWQgJiYgb2JqLnByb21vX2xpbmsgIT09IG51bGwpIHtcblx0XHRcdHByb21vTGluayA9IGA8YnI+PGEgaHJlZj1cIiR7b2JqLnByb21vX2xpbmt9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0V4dGVybmFsRGVzY3JpcHRpb259PC9hPmA7XG5cdFx0fVxuXHRcdGNvbnN0IGR5bWFuaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGlkPVwiJHtvYmoudW5pcWlkfVwiPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX08YnI+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZD4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGV2ZWxvcGVyKX08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgdmVyc2lvblwiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHRcdFx0XHRcdDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWRcIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPiBcblx0XHRcdFx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdFx0XHRcdFx0XHQ8L2E+XG4gICAgXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L3RyPmA7XG5cdFx0JCgnI25ldy1tb2R1bGVzLXRhYmxlIHRib2R5JykuYXBwZW5kKGR5bWFuaWNSb3cpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQlNC+0LHQsNCy0LvRj9C10YIg0LrQvdC+0L/QutGDINC+0LHQvdC+0LLQu9C10L3QuNGPINGB0YLQsNGA0L7QuSDQstC10YDRgdC40LggUEJYXG5cdCAqIEBwYXJhbSBvYmpcblx0ICovXG5cdGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuXHRcdGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcblx0XHRjb25zdCAkY3VycmVudFVwZGF0ZUJ1dHRvbiA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApLmZpbmQoJ2EudXBkYXRlJyk7XG5cdFx0aWYgKCRjdXJyZW50VXBkYXRlQnV0dG9uLmxlbmd0aCA+IDApIHtcblx0XHRcdGNvbnN0IG9sZFZlciA9ICRjdXJyZW50VXBkYXRlQnV0dG9uLmF0dHIoJ2RhdGEtdmVyJyk7XG5cdFx0XHRjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcblx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA8PSAwKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cdFx0JGN1cnJlbnRVcGRhdGVCdXR0b24ucmVtb3ZlKCk7XG5cdFx0Y29uc3QgZHluYW1pY0J1dHRvblxuXHRcdFx0PSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuXHRcdFx0ZGF0YS12ZXIgPVwiJHtvYmoudmVyc2lvbn1cIlxuXHRcdFx0ZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuXHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcblx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdDwvYT5gO1xuXHRcdCRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJykucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcblx0fSxcblx0LyoqXG5cdCAqINCV0YHQu9C4INGE0LjRh9CwINC30LDRhdCy0LDRh9C10L3QsCwg0L7QsdGA0LDRidCw0LXQvNGB0Y8g0Log0YHQtdGA0LLQtdGA0YNcblx0ICog0L7QsdC90L7QstC70LXQvdC40Lkg0LfQsCDQv9C+0LvRg9GH0LXQvdC40LjQtdC8INC00LjRgdGC0YDQuNCx0YPRgtC40LLQsFxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0Y2JBZnRlckxpY2Vuc2VDaGVjayhwYXJhbXMpIHtcblx0XHRVcGRhdGVBcGkuR2V0TW9kdWxlSW5zdGFsbExpbmsoXG5cdFx0XHRwYXJhbXMsXG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzLFxuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZSxcblx0XHQpO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YHQsNC50YIg0LLQtdGA0L3Rg9C7INGB0YHRi9C70LrRgyDQvdCwINC+0LHQvdC+0LLQu9C10L3QuNC1XG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlKSB7XG5cdFx0Y29uc3QgbmV3UGFyYW1zID0gcGFyYW1zO1xuXHRcdHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHRuZXdQYXJhbXMubWQ1ID0gb2JqLm1kNTtcblx0XHRcdG5ld1BhcmFtcy51cGRhdGVMaW5rID0gb2JqLmhyZWY7XG5cdFx0XHRpZiAobmV3UGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLnVwZGF0ZU1vZHVsZShuZXdQYXJhbXMpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZyByZWRvJykucmVtb3ZlQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5zdGFsbE1vZHVsZShuZXdQYXJhbXMsIGZhbHNlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCV0YHQu9C4INGB0LDQudGCINC+0YLQutCw0LfQsNC7INCyINC+0LHQvdC+0LLQu9C10L3QuNC4LCDQvdC1INC30LDRhdCy0LDRh9C10L3QsCDQvdGD0LbQvdCw0Y8g0YTQuNGH0LBcblx0ICovXG5cdGNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlKHBhcmFtcykge1xuXHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0aWYgKHBhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG5cdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLmFkZENsYXNzKCdkb3dubG9hZCcpO1xuXHRcdH1cblx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4dF9HZXRMaW5rRXJyb3IpO1xuXHR9LFxuXHQvKipcblx0ICog0KHQvdCw0YfQsNC70LAg0L7RgtC60LvRjtGH0LjQvCDQvNC+0LTRg9C70YwsINC10YHQu9C4INC/0L7Qu9GD0YfQuNGC0YHRjywg0YLQviDQvtGC0L/RgNCw0LLQuNC8INC60L7QvNCw0L3QtNGDINC90LAg0L7QsdC90L7QstC70LXQvdC40LVcblx0ICog0Lgg0L7QsdC90L7QstC40Lwg0YHRgtGA0LDQvdC40YfQutGDXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LBcblx0ICovXG5cdHVwZGF0ZU1vZHVsZShwYXJhbXMpIHtcblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INCy0LrQu9GO0YfQtdC9INC70Lgg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQstC60LvRjtGH0LXQvSwg0LLRi9GA0YPQsdC40Lwg0LXQs9C+XG5cdFx0Y29uc3Qgc3RhdHVzID0gJChgIyR7cGFyYW1zLnVuaXFpZH1gKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXHRcdGlmIChzdGF0dXMgPT09IHRydWUpIHtcblx0XHRcdFBieEFwaS5Nb2R1bGVEaXNhYmxlKHBhcmFtcy51bmlxaWQsICgpID0+IHtcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKHBhcmFtcywgdHJ1ZSk7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKHBhcmFtcywgZmFsc2UpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9C10L3QuNC1INC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gcGFyYW1zIC0g0L/QsNGA0LDQvNC10YLRgNGLINC30LDQv9GA0L7RgdCwXG5cdCAqIEBwYXJhbSBuZWVkRW5hYmxlIC0g0LLQutC70Y7Rh9C40YLRjCDQu9C4INC80L7QtNGD0LvRjCDQv9C+0YHQu9C1INGD0YHRgtCw0L3QvtCy0LrQuD9cblx0ICovXG5cdGluc3RhbGxNb2R1bGUocGFyYW1zLCBuZWVkRW5hYmxlKSB7XG5cdFx0UGJ4QXBpLlN5c3RlbUluc3RhbGxNb2R1bGUocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcblx0XHRcdGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuXHRcdFx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKHBhcmFtcy51bmlxaWQsIG5lZWRFbmFibGUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLm1lc3NhZ2UgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0aWYgKHBhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG5cdFx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLmFkZENsYXNzKCdkb3dubG9hZCcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQn9C10YDQtdC30LDQv9GD0YHQuiDQvNC+0LTRg9C70Y8g0Lgg0L/QtdGA0LXQt9Cw0LPRgNGD0LfQutCwINGB0YLRgNCw0L3QuNGG0Ytcblx0ICogQHBhcmFtIHVuaXFpZCAtIElEINC80L7QtNGD0LvRj1xuXHQgKi9cblx0cmVsb2FkTW9kdWxlQW5kUGFnZSh1bmlxaWQpIHtcblx0XHRQYnhBcGkuU3lzdGVtUmVsb2FkTW9kdWxlKHVuaXFpZCk7XG5cdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcblx0fSxcblx0LyoqXG5cdCAqINCh0L3QsNGH0LDQu9CwINC+0YLQutC70Y7Rh9C40Lwg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQv9C+0LvRg9GH0LjRgtGB0Y8sINGC0L4g0L7RgtC/0YDQsNCy0LjQvCDQutC+0LzQsNC90LTRgyDQvdCwINGD0LTQsNC70LXQvdC40LVcblx0ICog0Lgg0L7QsdC90L7QstC40Lwg0YHRgtGA0LDQvdC40YfQutGDXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LAuXG5cdCAqL1xuXHRkZWxldGVNb2R1bGUocGFyYW1zKSB7XG5cdFx0Ly8gQ9C/0YDQvtGB0LjQvCDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y8g0YHQvtGF0YDQsNC90Y/RgtGMINC70Lgg0L3QsNGB0YLRgNC+0LnQutC4XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kZGVsZXRlTW9kYWxGb3JtXG5cdFx0XHQubW9kYWwoe1xuXHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdG9uRGVueTogKCkgPT4ge1xuXHRcdFx0XHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0LLQutC70Y7Rh9C10L0g0LvQuCDQvNC+0LTRg9C70YwsINC10YHQu9C4INCy0LrQu9GO0YfQtdC9LCDQstGL0YDRg9Cx0LjQvCDQtdCz0L5cblx0XHRcdFx0XHRjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0XHRcdFx0Y29uc3Qga2VlcFNldHRpbmdzID0gZXh0ZW5zaW9uTW9kdWxlcy4ka2VlcFNldHRpbmdzQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRcdFx0XHRpZiAoc3RhdHVzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0XHRQYnhBcGkuTW9kdWxlRGlzYWJsZShwYXJhbXMudW5pcWlkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EZWxldGVNb2R1bGUoXG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnVuaXFpZCxcblx0XHRcdFx0XHRcdFx0XHRrZWVwU2V0dGluZ3MsXG5cdFx0XHRcdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlLFxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EZWxldGVNb2R1bGUocGFyYW1zLnVuaXFpZCwga2VlcFNldHRpbmdzLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSxcblx0XHRcdH0pXG5cdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC60L7QvNCw0L3QtNGLIHVuaW5zdGFsbCDQtNC70Y8g0LzQvtC00YPQu9GPXG5cdCAqINCV0YHQu9C4INGD0YHQv9C10YjQvdC+LCDQv9C10YDQtdCz0YDRg9C30LjQvCDRgdGC0YDQsNC90LjRhtGDLCDQtdGB0LvQuCDQvdC10YIsINGC0L4g0YHQvtC+0LHRidC40Lwg0L7QsSDQvtGI0LjQsdC60LVcblx0ICogQHBhcmFtIHJlc3VsdCAtINGA0LXQt9GD0LvRjNGC0LDRgiDRg9C00LDQu9C10L3QuNGPINC80L7QtNGD0LvRj1xuXHQgKi9cblx0Y2JBZnRlckRlbGV0ZShyZXN1bHQpIHtcblx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdGlmIChyZXN1bHQgPT09IHRydWUpIHtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblx0XHRcdGxldCBlcnJvck1lc3NhZ2UgPSAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkgPyByZXN1bHQuZGF0YSA6ICcnO1xuXHRcdFx0ZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9EZWxldGVNb2R1bGVFcnJvcik7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0KHRgNCw0LLQvdC10L3QuNC1INCy0LXRgNGB0LjQuSDQvNC+0LTRg9C70LXQuVxuXHQgKiBAcGFyYW0gdjFcblx0ICogQHBhcmFtIHYyXG5cdCAqIEBwYXJhbSBvcHRpb25zXG5cdCAqIEByZXR1cm5zIHtudW1iZXJ9XG5cdCAqL1xuXHR2ZXJzaW9uQ29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIHtcblx0XHRjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuXHRcdGNvbnN0IHplcm9FeHRlbmQgPSBvcHRpb25zICYmIG9wdGlvbnMuemVyb0V4dGVuZDtcblx0XHRsZXQgdjFwYXJ0cyA9IHYxLnNwbGl0KCcuJyk7XG5cdFx0bGV0IHYycGFydHMgPSB2Mi5zcGxpdCgnLicpO1xuXG5cdFx0ZnVuY3Rpb24gaXNWYWxpZFBhcnQoeCkge1xuXHRcdFx0cmV0dXJuIChsZXhpY29ncmFwaGljYWwgPyAvXlxcZCtbQS1aYS16XSokLyA6IC9eXFxkKyQvKS50ZXN0KHgpO1xuXHRcdH1cblxuXHRcdGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG5cdFx0XHRyZXR1cm4gTmFOO1xuXHRcdH1cblxuXHRcdGlmICh6ZXJvRXh0ZW5kKSB7XG5cdFx0XHR3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG5cdFx0XHR3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFsZXhpY29ncmFwaGljYWwpIHtcblx0XHRcdHYxcGFydHMgPSB2MXBhcnRzLm1hcChOdW1iZXIpO1xuXHRcdFx0djJwYXJ0cyA9IHYycGFydHMubWFwKE51bWJlcik7XG5cdFx0fVxuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB2MXBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0XHRpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuXHRcdFx0XHQvL1xuXHRcdFx0fSBlbHNlIGlmICh2MXBhcnRzW2ldID4gdjJwYXJ0c1tpXSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodjFwYXJ0cy5sZW5ndGggIT09IHYycGFydHMubGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm4gLTE7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIDA7XG5cdH0sXG5cbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0ZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==