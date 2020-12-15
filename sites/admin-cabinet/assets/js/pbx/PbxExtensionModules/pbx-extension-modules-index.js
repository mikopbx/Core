"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, PbxApi, globalTranslate, UpdateApi, UserMessage, globalPBXVersion, SemanticLocalization, upgradeStatusLoopWorker, PbxExtensionStatus */
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
        var pageStatus = new PbxExtensionStatus();
        pageStatus.initialize(uniqId, false);
        extensionModules.checkBoxes.push(pageStatus);
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
        PbxApi.LicenseCaptureFeatureForProductId(params, extensionModules.cbAfterLicenseCheck);
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
        PbxApi.LicenseCaptureFeatureForProductId(params, extensionModules.cbAfterLicenseCheck);
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
   * @param result
   */
  cbAfterLicenseCheck: function () {
    function cbAfterLicenseCheck(params, result) {
      if (result === true) {
        UpdateApi.GetModuleInstallLink(params, extensionModules.cbGetModuleInstallLinkSuccess, extensionModules.cbGetModuleInstallLinkFailure);
      } else if (result === false && params.length > 0) {
        UserMessage.showMultiString(params);
        $('a.button').removeClass('disabled');
      } else {
        UserMessage.showMultiString(globalTranslate.ext_NoLicenseAvailable);
        $('a.button').removeClass('disabled');
      }
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

      UserMessage.showMultiString(globalTranslate.ext_GetLinkError);
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
      PbxApi.FilesDownloadNewModule(params, function (response) {
        if (response === true) {
          upgradeStatusLoopWorker.initialize(params.uniqid, needEnable);
        } else {
          if (response.messages !== undefined) {
            UserMessage.showMultiString(response.messages);
          } else {
            UserMessage.showMultiString(globalTranslate.ext_InstallationError);
          }

          params.aLink.removeClass('disabled');

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
        UserMessage.showMultiString(errorMessage, globalTranslate.ext_DeleteModuleError);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsIlBieEFwaSIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImNiQWZ0ZXJMaWNlbnNlQ2hlY2siLCJkZWxldGVNb2R1bGUiLCJwb3B1cCIsInNob3ciLCJwcm9tb0xpbmsiLCJwcm9tb19saW5rIiwidW5kZWZpbmVkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJkeW1hbmljUm93IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibmFtZSIsImRlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwiZXh0X0luc3RhbGxNb2R1bGUiLCJsaWNfcHJvZHVjdF9pZCIsImxpY19mZWF0dXJlX2lkIiwicmVsZWFzZV9pZCIsImFwcGVuZCIsIiRjdXJyZW50VXBkYXRlQnV0dG9uIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwicmVzdWx0IiwiR2V0TW9kdWxlSW5zdGFsbExpbmsiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyIsImNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfTm9MaWNlbnNlQXZhaWxhYmxlIiwibmV3UGFyYW1zIiwibWQ1IiwidXBkYXRlTGluayIsImhyZWYiLCJ1cGRhdGVNb2R1bGUiLCJpbnN0YWxsTW9kdWxlIiwiZXh0X0dldExpbmtFcnJvciIsInN0YXR1cyIsImNoZWNrYm94IiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsIm5lZWRFbmFibGUiLCJGaWxlc0Rvd25sb2FkTmV3TW9kdWxlIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJtZXNzYWdlcyIsImV4dF9JbnN0YWxsYXRpb25FcnJvciIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwia2VlcFNldHRpbmdzIiwiU3lzdGVtRGVsZXRlTW9kdWxlIiwiY2JBZnRlckRlbGV0ZSIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsImVycm9yTWVzc2FnZSIsImRhdGEiLCJleHRfRGVsZXRlTW9kdWxlRXJyb3IiLCJ2MSIsInYyIiwib3B0aW9ucyIsImxleGljb2dyYXBoaWNhbCIsInplcm9FeHRlbmQiLCJ2MXBhcnRzIiwic3BsaXQiLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsImV2ZXJ5IiwiTmFOIiwibWFwIiwiTnVtYmVyIiwiaSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTtBQUdBLElBQU1BLGdCQUFnQixHQUFHO0FBQ3hCQyxFQUFBQSxXQUFXLEVBQUVDLENBQUMsQ0FBQyx1QkFBRCxDQURVO0FBRXhCQyxFQUFBQSxnQkFBZ0IsRUFBRUQsQ0FBQyxDQUFDLG9CQUFELENBRks7QUFHeEJFLEVBQUFBLHFCQUFxQixFQUFFRixDQUFDLENBQUMscUJBQUQsQ0FIQTtBQUl4QkcsRUFBQUEsYUFBYSxFQUFFSCxDQUFDLENBQUMsZ0JBQUQsQ0FKUTtBQUt4QkksRUFBQUEsVUFBVSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FMWTtBQU14QkMsRUFBQUEsVUFBVSxFQUFFLEVBTlk7QUFPeEJDLEVBQUFBLFVBUHdCO0FBQUEsMEJBT1g7QUFDWlYsTUFBQUEsZ0JBQWdCLENBQUNHLGdCQUFqQixDQUFrQ1EsS0FBbEM7QUFDQVgsTUFBQUEsZ0JBQWdCLENBQUNZLG1CQUFqQjtBQUNBQyxNQUFBQSxTQUFTLENBQUNDLGlCQUFWLENBQTRCZCxnQkFBZ0IsQ0FBQ2Usb0JBQTdDO0FBQ0FmLE1BQUFBLGdCQUFnQixDQUFDQyxXQUFqQixDQUE2QmUsSUFBN0IsQ0FBa0MsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQ2pELFlBQU1DLE1BQU0sR0FBR2pCLENBQUMsQ0FBQ2dCLEdBQUQs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QUE1QixFQUFvQ21HLENBQUMsSUFBSSxDQUF6QyxFQUE0QztBQUMzQyxZQUFJUixPQUFPLENBQUMzRixNQUFSLEtBQW1CbUcsQ0FBdkIsRUFBMEI7QUFDekIsaUJBQU8sQ0FBUDtBQUNBOztBQUNELFlBQUlWLE9BQU8sQ0FBQ1UsQ0FBRCxDQUFQLEtBQWVSLE9BQU8sQ0FBQ1EsQ0FBRCxDQUExQixFQUErQixDQUM5QjtBQUNBLFNBRkQsTUFFTyxJQUFJVixPQUFPLENBQUNVLENBQUQsQ0FBUCxHQUFhUixPQUFPLENBQUNRLENBQUQsQ0FBeEIsRUFBNkI7QUFDbkMsaUJBQU8sQ0FBUDtBQUNBLFNBRk0sTUFFQTtBQUNOLGlCQUFPLENBQUMsQ0FBUjtBQUNBO0FBQ0Q7O0FBRUQsVUFBSVYsT0FBTyxDQUFDekYsTUFBUixLQUFtQjJGLE9BQU8sQ0FBQzNGLE1BQS9CLEVBQXVDO0FBQ3RDLGVBQU8sQ0FBQyxDQUFSO0FBQ0E7O0FBRUQsYUFBTyxDQUFQO0FBQ0E7O0FBaFh1QjtBQUFBO0FBQUEsQ0FBekI7QUFvWEF6QyxDQUFDLENBQUM2SSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCaEosRUFBQUEsZ0JBQWdCLENBQUNVLFVBQWpCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVwZGF0ZUFwaSwgVXNlck1lc3NhZ2UsIGdsb2JhbFBCWFZlcnNpb24sIFNlbWFudGljTG9jYWxpemF0aW9uLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciwgUGJ4RXh0ZW5zaW9uU3RhdHVzICovXG5cblxuY29uc3QgZXh0ZW5zaW9uTW9kdWxlcyA9IHtcblx0JGNoZWNrYm94ZXM6ICQoJy5tb2R1bGUtcm93IC5jaGVja2JveCcpLFxuXHQkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblx0JGtlZXBTZXR0aW5nc0NoZWNrYm94OiAkKCcja2VlcE1vZHVsZVNldHRpbmdzJyksXG5cdCRtb2R1bGVzVGFibGU6ICQoJyNtb2R1bGVzLXRhYmxlJyksXG5cdHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cdGNoZWNrQm94ZXM6IFtdLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXHRcdFVwZGF0ZUFwaS5nZXRNb2R1bGVzVXBkYXRlcyhleHRlbnNpb25Nb2R1bGVzLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRjaGVja2JveGVzLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdGNvbnN0IHVuaXFJZCA9ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cygpO1xuXHRcdFx0cGFnZVN0YXR1cy5pbml0aWFsaXplKHVuaXFJZCwgZmFsc2UpO1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jaGVja0JveGVzLnB1c2gocGFnZVN0YXR1cyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIGRhdGEgdGFibGVzIG9uIHRhYmxlXG5cdCAqL1xuXHRpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJG1vZHVsZXNUYWJsZS5EYXRhVGFibGUoe1xuXHRcdFx0bGVuZ3RoQ2hhbmdlOiBmYWxzZSxcblx0XHRcdHBhZ2luZzogZmFsc2UsXG5cdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdHsgb3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2UgfSxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0eyBvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZSB9LFxuXHRcdFx0XSxcblx0XHRcdC8vIG9yZGVyOiBbMSwgJ2FzYyddLFxuXHRcdFx0bGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcblx0XHR9KTtcblx0XHQkKCcuYWRkLW5ldycpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtC60LAg0YHQv9C40YHQutCwINC80L7QtNGD0LvQtdC5INC/0L7Qu9GD0YfQtdC90L3RhSDRgSDRgdCw0LnRgtCwXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JQYXJzZU1vZHVsZVVwZGF0ZXMocmVzcG9uc2UpIHtcblx0XHRyZXNwb25zZS5tb2R1bGVzLmZvckVhY2goKG9iaikgPT4ge1xuXHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQv9C+0LTRhdC+0LTQuNGCINC70Lgg0L/QviDQvdC+0LzQtdGA0YMg0LLQtdGA0YHQuNC4INGN0YLQvtGCINC80L7QtNGD0LvRjCDQuiDQkNCi0KFcblx0XHRcdGNvbnN0IG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCA9IG9iai5taW5fcGJ4X3ZlcnNpb247XG5cdFx0XHRjb25zdCBjdXJyZW50VmVyc2lvblBCWCA9IGV4dGVuc2lvbk1vZHVsZXMucGJ4VmVyc2lvbjtcblx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKGN1cnJlbnRWZXJzaW9uUEJYLCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgpIDwgMCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQvLyDQmNGJ0LXQvCDRgdGA0LXQtNC4INGD0YHRgtCw0L3QvtCy0LvQtdC90L3Ri9GFLCDQv9GA0LXQtNC70L7QttC40Lwg0L7QsdC90L7QstC70LXQvdC40LVcblx0XHRcdGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcblx0XHRcdGlmICgkbW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Y29uc3Qgb2xkVmVyID0gJG1vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuXHRcdFx0XHRjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcblx0XHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpID4gMCkge1xuXHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc3QgJG5ld01vZHVsZVJvdyA9ICQoYHRyLm5ldy1tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcblx0XHRcdFx0aWYgKCRuZXdNb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdGNvbnN0IG9sZFZlciA9ICRuZXdNb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcblx0XHRcdFx0XHRjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcblx0XHRcdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG5cdFx0XHRcdFx0XHQkbmV3TW9kdWxlUm93LnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdCQoJ2EuZG93bmxvYWQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHt9O1xuXHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuXHRcdFx0JGFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuXHRcdFx0cGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG5cdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcblx0XHRcdHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcblx0XHRcdHBhcmFtcy5hY3Rpb24gPSAnaW5zdGFsbCc7XG5cdFx0XHRwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG5cblx0XHRcdFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuXHRcdH0pO1xuXHRcdCQoJ2EudXBkYXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSB7fTtcblx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcblx0XHRcdCRhTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcblx0XHRcdHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcblx0XHRcdHBhcmFtcy5hY3Rpb24gPSAndXBkYXRlJztcblx0XHRcdHBhcmFtcy5yZWxlYXNlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1pZCcpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuXHRcdFx0cGFyYW1zLnNpemUgPSAkYUxpbmsuYXR0cignZGF0YS1zaXplJyk7XG5cdFx0XHRwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG5cdFx0XHRQYnhBcGkuTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcblx0XHR9KTtcblx0XHQkKCdhLmRlbGV0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0JChlLnRhcmdldCkuY2xvc2VzdCgnYScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0gW107XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdpZCcpO1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5kZWxldGVNb2R1bGUocGFyYW1zKTtcblx0XHR9KTtcblx0XHQkKCdhW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuXHR9LFxuXHQvKipcblx0ICog0JTQvtCx0LDQstC70Y/QtdGCINC+0L/QuNGB0LDQvdC40LUg0LTQvtGB0YLRg9C/0L3QvtCz0L4g0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBvYmpcblx0ICovXG5cdGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuXHRcdCQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcblx0XHRsZXQgcHJvbW9MaW5rID0gJyc7XG5cdFx0aWYgKG9iai5wcm9tb19saW5rICE9PSB1bmRlZmluZWQgJiYgb2JqLnByb21vX2xpbmsgIT09IG51bGwpIHtcblx0XHRcdHByb21vTGluayA9IGA8YnI+PGEgaHJlZj1cIiR7b2JqLnByb21vX2xpbmt9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0V4dGVybmFsRGVzY3JpcHRpb259PC9hPmA7XG5cdFx0fVxuXHRcdGNvbnN0IGR5bWFuaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGlkPVwiJHtvYmoudW5pcWlkfVwiPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX08YnI+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZD4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGV2ZWxvcGVyKX08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgdmVyc2lvblwiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHRcdFx0XHRcdDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWRcIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPiBcblx0XHRcdFx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdFx0XHRcdFx0XHQ8L2E+XG4gICAgXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L3RyPmA7XG5cdFx0JCgnI25ldy1tb2R1bGVzLXRhYmxlIHRib2R5JykuYXBwZW5kKGR5bWFuaWNSb3cpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQlNC+0LHQsNCy0LvRj9C10YIg0LrQvdC+0L/QutGDINC+0LHQvdC+0LLQu9C10L3QuNGPINGB0YLQsNGA0L7QuSDQstC10YDRgdC40LggUEJYXG5cdCAqIEBwYXJhbSBvYmpcblx0ICovXG5cdGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuXHRcdGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcblx0XHRjb25zdCAkY3VycmVudFVwZGF0ZUJ1dHRvbiA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApLmZpbmQoJ2EudXBkYXRlJyk7XG5cdFx0aWYgKCRjdXJyZW50VXBkYXRlQnV0dG9uLmxlbmd0aCA+IDApIHtcblx0XHRcdGNvbnN0IG9sZFZlciA9ICRjdXJyZW50VXBkYXRlQnV0dG9uLmF0dHIoJ2RhdGEtdmVyJyk7XG5cdFx0XHRjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcblx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA8PSAwKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cdFx0JGN1cnJlbnRVcGRhdGVCdXR0b24ucmVtb3ZlKCk7XG5cdFx0Y29uc3QgZHluYW1pY0J1dHRvblxuXHRcdFx0PSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuXHRcdFx0ZGF0YS12ZXIgPVwiJHtvYmoudmVyc2lvbn1cIlxuXHRcdFx0ZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuXHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcblx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdDwvYT5gO1xuXHRcdCRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJykucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcblx0fSxcblx0LyoqXG5cdCAqINCV0YHQu9C4INGE0LjRh9CwINC30LDRhdCy0LDRh9C10L3QsCwg0L7QsdGA0LDRidCw0LXQvNGB0Y8g0Log0YHQtdGA0LLQtdGA0YNcblx0ICog0L7QsdC90L7QstC70LXQvdC40Lkg0LfQsCDQv9C+0LvRg9GH0LXQvdC40LjQtdC8INC00LjRgdGC0YDQuNCx0YPRgtC40LLQsFxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSByZXN1bHRcblx0ICovXG5cdGNiQWZ0ZXJMaWNlbnNlQ2hlY2socGFyYW1zLCByZXN1bHQpIHtcblx0XHRpZiAocmVzdWx0PT09dHJ1ZSl7XG5cdFx0XHRVcGRhdGVBcGkuR2V0TW9kdWxlSW5zdGFsbExpbmsoXG5cdFx0XHRcdHBhcmFtcyxcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2Vzcyxcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZSxcblx0XHRcdCk7XG5cdFx0fSBlbHNlIGlmIChyZXN1bHQ9PT1mYWxzZSAmJiBwYXJhbXMubGVuZ3RoID4gMCl7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocGFyYW1zKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X05vTGljZW5zZUF2YWlsYWJsZSk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblxuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YHQsNC50YIg0LLQtdGA0L3Rg9C7INGB0YHRi9C70LrRgyDQvdCwINC+0LHQvdC+0LLQu9C10L3QuNC1XG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlKSB7XG5cdFx0Y29uc3QgbmV3UGFyYW1zID0gcGFyYW1zO1xuXHRcdHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHRuZXdQYXJhbXMubWQ1ID0gb2JqLm1kNTtcblx0XHRcdG5ld1BhcmFtcy51cGRhdGVMaW5rID0gb2JqLmhyZWY7XG5cdFx0XHRpZiAobmV3UGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLnVwZGF0ZU1vZHVsZShuZXdQYXJhbXMpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZyByZWRvJykucmVtb3ZlQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5zdGFsbE1vZHVsZShuZXdQYXJhbXMsIGZhbHNlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCV0YHQu9C4INGB0LDQudGCINC+0YLQutCw0LfQsNC7INCyINC+0LHQvdC+0LLQu9C10L3QuNC4LCDQvdC1INC30LDRhdCy0LDRh9C10L3QsCDQvdGD0LbQvdCw0Y8g0YTQuNGH0LBcblx0ICovXG5cdGNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlKHBhcmFtcykge1xuXHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0aWYgKHBhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG5cdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLmFkZENsYXNzKCdkb3dubG9hZCcpO1xuXHRcdH1cblx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9HZXRMaW5rRXJyb3IpO1xuXHR9LFxuXHQvKipcblx0ICog0KHQvdCw0YfQsNC70LAg0L7RgtC60LvRjtGH0LjQvCDQvNC+0LTRg9C70YwsINC10YHQu9C4INC/0L7Qu9GD0YfQuNGC0YHRjywg0YLQviDQvtGC0L/RgNCw0LLQuNC8INC60L7QvNCw0L3QtNGDINC90LAg0L7QsdC90L7QstC70LXQvdC40LVcblx0ICog0Lgg0L7QsdC90L7QstC40Lwg0YHRgtGA0LDQvdC40YfQutGDXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LBcblx0ICovXG5cdHVwZGF0ZU1vZHVsZShwYXJhbXMpIHtcblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INCy0LrQu9GO0YfQtdC9INC70Lgg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQstC60LvRjtGH0LXQvSwg0LLRi9GA0YPQsdC40Lwg0LXQs9C+XG5cdFx0Y29uc3Qgc3RhdHVzID0gJChgIyR7cGFyYW1zLnVuaXFpZH1gKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXHRcdGlmIChzdGF0dXMgPT09IHRydWUpIHtcblx0XHRcdFBieEFwaS5TeXN0ZW1EaXNhYmxlTW9kdWxlKHBhcmFtcy51bmlxaWQsICgpID0+IHtcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKHBhcmFtcywgdHJ1ZSk7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKHBhcmFtcywgZmFsc2UpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9C10L3QuNC1INC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gcGFyYW1zIC0g0L/QsNGA0LDQvNC10YLRgNGLINC30LDQv9GA0L7RgdCwXG5cdCAqIEBwYXJhbSBuZWVkRW5hYmxlIC0g0LLQutC70Y7Rh9C40YLRjCDQu9C4INC80L7QtNGD0LvRjCDQv9C+0YHQu9C1INGD0YHRgtCw0L3QvtCy0LrQuD9cblx0ICovXG5cdGluc3RhbGxNb2R1bGUocGFyYW1zLCBuZWVkRW5hYmxlKSB7XG5cdFx0UGJ4QXBpLkZpbGVzRG93bmxvYWROZXdNb2R1bGUocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcblx0XHRcdGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuXHRcdFx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKHBhcmFtcy51bmlxaWQsIG5lZWRFbmFibGUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRwYXJhbXMuYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdGlmIChwYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuXHRcdFx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIHJlZG8nKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0KHQvdCw0YfQsNC70LAg0L7RgtC60LvRjtGH0LjQvCDQvNC+0LTRg9C70YwsINC10YHQu9C4INC/0L7Qu9GD0YfQuNGC0YHRjywg0YLQviDQvtGC0L/RgNCw0LLQuNC8INC60L7QvNCw0L3QtNGDINC90LAg0YPQtNCw0LvQtdC90LjQtVxuXHQgKiDQuCDQvtCx0L3QvtCy0LjQvCDRgdGC0YDQsNC90LjRh9C60YNcblx0ICogQHBhcmFtIHBhcmFtcyAtINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsC5cblx0ICovXG5cdGRlbGV0ZU1vZHVsZShwYXJhbXMpIHtcblx0XHQvLyBD0L/RgNC+0YHQuNC8INC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjyDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LvQuCDQvdCw0YHRgtGA0L7QudC60Lhcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm1cblx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0b25EZW55OiAoKSA9PiB7XG5cdFx0XHRcdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BcHByb3ZlOiAoKSA9PiB7XG5cdFx0XHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQstC60LvRjtGH0LXQvSDQu9C4INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0LLQutC70Y7Rh9C10L0sINCy0YvRgNGD0LHQuNC8INC10LPQvlxuXHRcdFx0XHRcdGNvbnN0IHN0YXR1cyA9ICQoYCMke3BhcmFtcy51bmlxaWR9YCkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRcdFx0XHRjb25zdCBrZWVwU2V0dGluZ3MgPSBleHRlbnNpb25Nb2R1bGVzLiRrZWVwU2V0dGluZ3NDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXHRcdFx0XHRcdGlmIChzdGF0dXMgPT09IHRydWUpIHtcblx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EaXNhYmxlTW9kdWxlKHBhcmFtcy51bmlxaWQsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbURlbGV0ZU1vZHVsZShcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMudW5pcWlkLFxuXHRcdFx0XHRcdFx0XHRcdGtlZXBTZXR0aW5ncyxcblx0XHRcdFx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUsXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbURlbGV0ZU1vZHVsZShwYXJhbXMudW5pcWlkLCBrZWVwU2V0dGluZ3MsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSlcblx0XHRcdC5tb2RhbCgnc2hvdycpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLRh9C40Log0LrQvtC80LDQvdC00YsgdW5pbnN0YWxsINC00LvRjyDQvNC+0LTRg9C70Y9cblx0ICog0JXRgdC70Lgg0YPRgdC/0LXRiNC90L4sINC/0LXRgNC10LPRgNGD0LfQuNC8INGB0YLRgNCw0L3QuNGG0YMsINC10YHQu9C4INC90LXRgiwg0YLQviDRgdC+0L7QsdGJ0LjQvCDQvtCxINC+0YjQuNCx0LrQtVxuXHQgKiBAcGFyYW0gcmVzdWx0IC0g0YDQtdC30YPQu9GM0YLQsNGCINGD0LTQsNC70LXQvdC40Y8g0LzQvtC00YPQu9GPXG5cdCAqL1xuXHRjYkFmdGVyRGVsZXRlKHJlc3VsdCkge1xuXHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0aWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXHRcdFx0bGV0IGVycm9yTWVzc2FnZSA9IChyZXN1bHQuZGF0YSAhPT0gdW5kZWZpbmVkKSA/IHJlc3VsdC5kYXRhIDogJyc7XG5cdFx0XHRlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2UucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0RlbGV0ZU1vZHVsZUVycm9yKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQodGA0LDQstC90LXQvdC40LUg0LLQtdGA0YHQuNC5INC80L7QtNGD0LvQtdC5XG5cdCAqIEBwYXJhbSB2MVxuXHQgKiBAcGFyYW0gdjJcblx0ICogQHBhcmFtIG9wdGlvbnNcblx0ICogQHJldHVybnMge251bWJlcn1cblx0ICovXG5cdHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuXHRcdGNvbnN0IGxleGljb2dyYXBoaWNhbCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5sZXhpY29ncmFwaGljYWw7XG5cdFx0Y29uc3QgemVyb0V4dGVuZCA9IG9wdGlvbnMgJiYgb3B0aW9ucy56ZXJvRXh0ZW5kO1xuXHRcdGxldCB2MXBhcnRzID0gdjEuc3BsaXQoJy4nKTtcblx0XHRsZXQgdjJwYXJ0cyA9IHYyLnNwbGl0KCcuJyk7XG5cblx0XHRmdW5jdGlvbiBpc1ZhbGlkUGFydCh4KSB7XG5cdFx0XHRyZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXpdKiQvIDogL15cXGQrJC8pLnRlc3QoeCk7XG5cdFx0fVxuXG5cdFx0aWYgKCF2MXBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSB8fCAhdjJwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkpIHtcblx0XHRcdHJldHVybiBOYU47XG5cdFx0fVxuXG5cdFx0aWYgKHplcm9FeHRlbmQpIHtcblx0XHRcdHdoaWxlICh2MXBhcnRzLmxlbmd0aCA8IHYycGFydHMubGVuZ3RoKSB2MXBhcnRzLnB1c2goJzAnKTtcblx0XHRcdHdoaWxlICh2MnBhcnRzLmxlbmd0aCA8IHYxcGFydHMubGVuZ3RoKSB2MnBhcnRzLnB1c2goJzAnKTtcblx0XHR9XG5cblx0XHRpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuXHRcdFx0djFwYXJ0cyA9IHYxcGFydHMubWFwKE51bWJlcik7XG5cdFx0XHR2MnBhcnRzID0gdjJwYXJ0cy5tYXAoTnVtYmVyKTtcblx0XHR9XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHYxcGFydHMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGlmICh2MnBhcnRzLmxlbmd0aCA9PT0gaSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblx0XHRcdGlmICh2MXBhcnRzW2ldID09PSB2MnBhcnRzW2ldKSB7XG5cdFx0XHRcdC8vXG5cdFx0XHR9IGVsc2UgaWYgKHYxcGFydHNbaV0gPiB2MnBhcnRzW2ldKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcblx0XHRcdHJldHVybiAtMTtcblx0XHR9XG5cblx0XHRyZXR1cm4gMDtcblx0fSxcblxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19