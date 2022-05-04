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
  initialize: function initialize() {
    extensionModules.$deleteModalForm.modal();
    extensionModules.initializeDataTable();
    UpdateApi.getModulesUpdates(extensionModules.cbParseModuleUpdates);
    extensionModules.$checkboxes.each(function (index, obj) {
      var uniqId = $(obj).attr('data-value');
      var pageStatus = new PbxExtensionStatus();
      pageStatus.initialize(uniqId, false);
      extensionModules.checkBoxes.push(pageStatus);
    });
  },

  /**
   * Initialize data tables on table
   */
  initializeDataTable: function initializeDataTable() {
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
      autoWidth: false,
      language: SemanticLocalization.dataTableLocalisation
    });
    $('.add-new').appendTo($('div.eight.column:eq(0)'));
  },

  /**
   * Обработка списка модулей полученнх с сайта
   * @param response
   */
  cbParseModuleUpdates: function cbParseModuleUpdates(response) {
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
  },

  /**
   * Добавляет описание доступного модуля
   * @param obj
   */
  addModuleDescription: function addModuleDescription(obj) {
    $('#online-updates-block').show();
    var promoLink = '';

    if (obj.promo_link !== undefined && obj.promo_link !== null) {
      promoLink = "<br><a href=\"".concat(obj.promo_link, "\" target=\"_blank\">").concat(globalTranslate.ext_ExternalDescription, "</a>");
    }

    var dymanicRow = "\n\t\t\t<tr class=\"new-module-row\" id=\"".concat(obj.uniqid, "\">\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.name), "<br>\n\t\t\t\t\t\t<span class=\"features\">").concat(decodeURIComponent(obj.description), " ").concat(promoLink, "</span>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.developer), "</td>\n\t\t\t\t\t\t<td class=\"center aligned version\">").concat(obj.version, "</td>\n\t\t\t\t\t\t<td class=\"right aligned collapsing\">\n    \t\t\t\t\t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t\t\t\t\t<a href=\"#\" class=\"ui button download\" \n\t\t\t\t\t\t\t\t\tdata-content= \"").concat(globalTranslate.ext_InstallModule, "\"\n\t\t\t\t\t\t\t\t\tdata-uniqid = \"").concat(obj.uniqid, "\"\n\t\t\t\t\t\t\t\t\tdata-size = \"").concat(obj.size, "\"\n\t\t\t\t\t\t\t\t\tdata-productId = \"").concat(obj.lic_product_id, "\"\n\t\t\t\t\t\t\t\t\tdata-featureId = \"").concat(obj.lic_feature_id, "\" \n\t\t\t\t\t\t\t\t\tdata-id =\"").concat(obj.release_id, "\">\n\t\t\t\t\t\t\t\t\t<i class=\"icon download blue\"></i> \n\t\t\t\t\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t\t\t\t\t</a>\n    \t\t\t\t\t\t</div>\n\t\t\t</tr>");
    $('#new-modules-table tbody').append(dymanicRow);
  },

  /**
   * Добавляет кнопку обновления старой версии PBX
   * @param obj
   */
  addUpdateButtonToRow: function addUpdateButtonToRow(obj) {
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
  },

  /**
   * Если фича захвачена, обращаемся к серверу
   * обновлений за получениием дистрибутива
   * @param params
   * @param result
   */
  cbAfterLicenseCheck: function cbAfterLicenseCheck(params, result) {
    if (result === true) {
      UpdateApi.GetModuleInstallLink(params, extensionModules.cbGetModuleInstallLinkSuccess, extensionModules.cbGetModuleInstallLinkFailure);
    } else if (result === false && params.length > 0) {
      UserMessage.showMultiString(params);
      $('a.button').removeClass('disabled');
    } else {
      UserMessage.showMultiString(globalTranslate.ext_NoLicenseAvailable);
      $('a.button').removeClass('disabled');
    }
  },

  /**
   * Если сайт вернул ссылку на обновление
   * @param params
   * @param response
   */
  cbGetModuleInstallLinkSuccess: function cbGetModuleInstallLinkSuccess(params, response) {
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
  },

  /**
   * Если сайт отказал в обновлении, не захвачена нужная фича
   */
  cbGetModuleInstallLinkFailure: function cbGetModuleInstallLinkFailure(params) {
    $('a.button').removeClass('disabled');

    if (params.action === 'update') {
      params.aLink.find('i').removeClass('loading');
    } else {
      params.aLink.find('i').removeClass('loading redo').addClass('download');
    }

    UserMessage.showMultiString(globalTranslate.ext_GetLinkError);
  },

  /**
   * Сначала отключим модуль, если получится, то отправим команду на обновление
   * и обновим страничку
   * @param params - параметры запроса
   */
  updateModule: function updateModule(params) {
    // Проверим включен ли модуль, если включен, вырубим его
    var status = $("#".concat(params.uniqid)).find('.checkbox').checkbox('is checked');

    if (status === true) {
      PbxApi.SystemDisableModule(params.uniqid, function () {
        extensionModules.installModule(params, true);
      });
    } else {
      extensionModules.installModule(params, false);
    }
  },

  /**
   * Обновление модуля
   * @param params - параметры запроса
   * @param needEnable - включить ли модуль после установки?
   */
  installModule: function installModule(params, needEnable) {
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
  },

  /**
   * Сначала отключим модуль, если получится, то отправим команду на удаление
   * и обновим страничку
   * @param params - параметры запроса.
   */
  deleteModule: function deleteModule(params) {
    // Cпросим пользователя сохранять ли настройки
    extensionModules.$deleteModalForm.modal({
      closable: false,
      onDeny: function onDeny() {
        $('a.button').removeClass('disabled');
        return true;
      },
      onApprove: function onApprove() {
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
    }).modal('show');
  },

  /**
   * Обработчик команды uninstall для модуля
   * Если успешно, перегрузим страницу, если нет, то сообщим об ошибке
   * @param result - результат удаления модуля
   */
  cbAfterDelete: function cbAfterDelete(result) {
    $('a.button').removeClass('disabled');

    if (result === true) {
      window.location = "".concat(globalRootUrl, "pbx-extension-modules/index/");
    } else {
      $('.ui.message.ajax').remove();
      var errorMessage = result.data !== undefined ? result.data : '';
      errorMessage = errorMessage.replace(/\n/g, '<br>');
      UserMessage.showMultiString(errorMessage, globalTranslate.ext_DeleteModuleError);
    }
  },

  /**
   * Сравнение версий модулей
   * @param v1
   * @param v2
   * @param options
   * @returns {number}
   */
  versionCompare: function versionCompare(v1, v2, options) {
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
};
$(document).ready(function () {
  extensionModules.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsIlBieEFwaSIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImNiQWZ0ZXJMaWNlbnNlQ2hlY2siLCJkZWxldGVNb2R1bGUiLCJwb3B1cCIsInNob3ciLCJwcm9tb0xpbmsiLCJwcm9tb19saW5rIiwidW5kZWZpbmVkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJkeW1hbmljUm93IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibmFtZSIsImRlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwiZXh0X0luc3RhbGxNb2R1bGUiLCJsaWNfcHJvZHVjdF9pZCIsImxpY19mZWF0dXJlX2lkIiwicmVsZWFzZV9pZCIsImFwcGVuZCIsIiRjdXJyZW50VXBkYXRlQnV0dG9uIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwicmVzdWx0IiwiR2V0TW9kdWxlSW5zdGFsbExpbmsiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyIsImNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfTm9MaWNlbnNlQXZhaWxhYmxlIiwibmV3UGFyYW1zIiwibWQ1IiwidXBkYXRlTGluayIsImhyZWYiLCJ1cGRhdGVNb2R1bGUiLCJpbnN0YWxsTW9kdWxlIiwiZXh0X0dldExpbmtFcnJvciIsInN0YXR1cyIsImNoZWNrYm94IiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsIm5lZWRFbmFibGUiLCJGaWxlc0Rvd25sb2FkTmV3TW9kdWxlIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJtZXNzYWdlcyIsImV4dF9JbnN0YWxsYXRpb25FcnJvciIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwia2VlcFNldHRpbmdzIiwiU3lzdGVtRGVsZXRlTW9kdWxlIiwiY2JBZnRlckRlbGV0ZSIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsImVycm9yTWVzc2FnZSIsImRhdGEiLCJleHRfRGVsZXRlTW9kdWxlRXJyb3IiLCJ2MSIsInYyIiwib3B0aW9ucyIsImxleGljb2dyYXBoaWNhbCIsInplcm9FeHRlbmQiLCJ2MXBhcnRzIiwic3BsaXQiLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsImV2ZXJ5IiwiTmFOIiwibWFwIiwiTnVtYmVyIiwiaSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUdBLElBQU1BLGdCQUFnQixHQUFHO0FBQ3hCQyxFQUFBQSxXQUFXLEVBQUVDLENBQUMsQ0FBQyx1QkFBRCxDQURVO0FBRXhCQyxFQUFBQSxnQkFBZ0IsRUFBRUQsQ0FBQyxDQUFDLG9CQUFELENBRks7QUFHeEJFLEVBQUFBLHFCQUFxQixFQUFFRixDQUFDLENBQUMscUJBQUQsQ0FIQTtBQUl4QkcsRUFBQUEsYUFBYSxFQUFFSCxDQUFDLENBQUMsZ0JBQUQsQ0FKUTtBQUt4QkksRUFBQUEsVUFBVSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FMWTtBQU14QkMsRUFBQUEsVUFBVSxFQUFFLEVBTlk7QUFPeEJDLEVBQUFBLFVBUHdCLHdCQU9YO0FBQ1pWLElBQUFBLGdCQUFnQixDQUFDRyxnQkFBakIsQ0FBa0NRLEtBQWxDO0FBQ0FYLElBQUFBLGdCQUFnQixDQUFDWSxtQkFBakI7QUFDQUMsSUFBQUEsU0FBUyxDQUFDQyxpQkFBVixDQUE0QmQsZ0JBQWdCLENBQUNlLG9CQUE3QztBQUNBZixJQUFBQSxnQkFBZ0IsQ0FBQ0MsV0FBakIsQ0FBNkJlLElBQTdCLENBQWtD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LEdBQUdBLE9BQU8sQ0FBQ00sR0FBUixDQUFZQyxNQUFaLENBQVY7QUFDQTs7QUFFRCxTQUFLLElBQUlDLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdWLE9BQU8sQ0FBQ3pGLE1BQTVCLEVBQW9DbUcsQ0FBQyxJQUFJLENBQXpDLEVBQTRDO0FBQzNDLFVBQUlSLE9BQU8sQ0FBQzNGLE1BQVIsS0FBbUJtRyxDQUF2QixFQUEwQjtBQUN6QixlQUFPLENBQVA7QUFDQTs7QUFDRCxVQUFJVixPQUFPLENBQUNVLENBQUQsQ0FBUCxLQUFlUixPQUFPLENBQUNRLENBQUQsQ0FBMUIsRUFBK0IsQ0FDOUI7QUFDQSxPQUZELE1BRU8sSUFBSVYsT0FBTyxDQUFDVSxDQUFELENBQVAsR0FBYVIsT0FBTyxDQUFDUSxDQUFELENBQXhCLEVBQTZCO0FBQ25DLGVBQU8sQ0FBUDtBQUNBLE9BRk0sTUFFQTtBQUNOLGVBQU8sQ0FBQyxDQUFSO0FBQ0E7QUFDRDs7QUFFRCxRQUFJVixPQUFPLENBQUN6RixNQUFSLEtBQW1CMkYsT0FBTyxDQUFDM0YsTUFBL0IsRUFBdUM7QUFDdEMsYUFBTyxDQUFDLENBQVI7QUFDQTs7QUFFRCxXQUFPLENBQVA7QUFDQTtBQWhYdUIsQ0FBekI7QUFvWEExQyxDQUFDLENBQUM4SSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCakosRUFBQUEsZ0JBQWdCLENBQUNVLFVBQWpCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVwZGF0ZUFwaSwgVXNlck1lc3NhZ2UsIGdsb2JhbFBCWFZlcnNpb24sIFNlbWFudGljTG9jYWxpemF0aW9uLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciwgUGJ4RXh0ZW5zaW9uU3RhdHVzICovXG5cblxuY29uc3QgZXh0ZW5zaW9uTW9kdWxlcyA9IHtcblx0JGNoZWNrYm94ZXM6ICQoJy5tb2R1bGUtcm93IC5jaGVja2JveCcpLFxuXHQkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblx0JGtlZXBTZXR0aW5nc0NoZWNrYm94OiAkKCcja2VlcE1vZHVsZVNldHRpbmdzJyksXG5cdCRtb2R1bGVzVGFibGU6ICQoJyNtb2R1bGVzLXRhYmxlJyksXG5cdHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cdGNoZWNrQm94ZXM6IFtdLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXHRcdFVwZGF0ZUFwaS5nZXRNb2R1bGVzVXBkYXRlcyhleHRlbnNpb25Nb2R1bGVzLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRjaGVja2JveGVzLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdGNvbnN0IHVuaXFJZCA9ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cygpO1xuXHRcdFx0cGFnZVN0YXR1cy5pbml0aWFsaXplKHVuaXFJZCwgZmFsc2UpO1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jaGVja0JveGVzLnB1c2gocGFnZVN0YXR1cyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIGRhdGEgdGFibGVzIG9uIHRhYmxlXG5cdCAqL1xuXHRpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJG1vZHVsZXNUYWJsZS5EYXRhVGFibGUoe1xuXHRcdFx0bGVuZ3RoQ2hhbmdlOiBmYWxzZSxcblx0XHRcdHBhZ2luZzogZmFsc2UsXG5cdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdHsgb3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2UgfSxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0eyBvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZSB9LFxuXHRcdFx0XSxcblx0XHRcdGF1dG9XaWR0aDogZmFsc2UsXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdH0pO1xuXHRcdCQoJy5hZGQtbmV3JykuYXBwZW5kVG8oJCgnZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDRgdC/0LjRgdC60LAg0LzQvtC00YPQu9C10Lkg0L/QvtC70YPRh9C10L3QvdGFINGBINGB0LDQudGC0LBcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYlBhcnNlTW9kdWxlVXBkYXRlcyhyZXNwb25zZSkge1xuXHRcdHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC/0L7QtNGF0L7QtNC40YIg0LvQuCDQv9C+INC90L7QvNC10YDRgyDQstC10YDRgdC40Lgg0Y3RgtC+0YIg0LzQvtC00YPQu9GMINC6INCQ0KLQoVxuXHRcdFx0Y29uc3QgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYID0gb2JqLm1pbl9wYnhfdmVyc2lvbjtcblx0XHRcdGNvbnN0IGN1cnJlbnRWZXJzaW9uUEJYID0gZXh0ZW5zaW9uTW9kdWxlcy5wYnhWZXJzaW9uO1xuXHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUoY3VycmVudFZlcnNpb25QQlgsIG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCkgPCAwKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdC8vINCY0YnQtdC8INGB0YDQtdC00Lgg0YPRgdGC0LDQvdC+0LLQu9C10L3QvdGL0YUsINC/0YDQtdC00LvQvtC20LjQvCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHRcdFx0Y29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdFx0aWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRjb25zdCBvbGRWZXIgPSAkbW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG5cdFx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5hZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCAkbmV3TW9kdWxlUm93ID0gJChgdHIubmV3LW1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdFx0XHRpZiAoJG5ld01vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0Y29uc3Qgb2xkVmVyID0gJG5ld01vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuXHRcdFx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA+IDApIHtcblx0XHRcdFx0XHRcdCRuZXdNb2R1bGVSb3cucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0JCgnYS5kb3dubG9hZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0ge307XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHQkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtdW5pcWlkJyk7XG5cdFx0XHRwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcblx0XHRcdHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuXHRcdFx0cGFyYW1zLmxpY1Byb2R1Y3RJZCA9ICRhTGluay5hdHRyKCdkYXRhLXByb2R1Y3RpZCcpO1xuXHRcdFx0cGFyYW1zLmxpY0ZlYXR1cmVJZCA9ICRhTGluay5hdHRyKCdkYXRhLWZlYXR1cmVpZCcpO1xuXHRcdFx0cGFyYW1zLmFjdGlvbiA9ICdpbnN0YWxsJztcblx0XHRcdHBhcmFtcy5hTGluayA9ICRhTGluaztcblxuXHRcdFx0UGJ4QXBpLkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckxpY2Vuc2VDaGVjayk7XG5cdFx0fSk7XG5cdFx0JCgnYS51cGRhdGUnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHt9O1xuXHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuXHRcdFx0JGFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0cGFyYW1zLmxpY1Byb2R1Y3RJZCA9ICRhTGluay5hdHRyKCdkYXRhLXByb2R1Y3RpZCcpO1xuXHRcdFx0cGFyYW1zLmxpY0ZlYXR1cmVJZCA9ICRhTGluay5hdHRyKCdkYXRhLWZlYXR1cmVpZCcpO1xuXHRcdFx0cGFyYW1zLmFjdGlvbiA9ICd1cGRhdGUnO1xuXHRcdFx0cGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtdW5pcWlkJyk7XG5cdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdHBhcmFtcy5hTGluayA9ICRhTGluaztcblx0XHRcdFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuXHRcdH0pO1xuXHRcdCQoJ2EuZGVsZXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHQkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSBbXTtcblx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2lkJyk7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmRlbGV0ZU1vZHVsZShwYXJhbXMpO1xuXHRcdH0pO1xuXHRcdCQoJ2FbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQlNC+0LHQsNCy0LvRj9C10YIg0L7Qv9C40YHQsNC90LjQtSDQtNC+0YHRgtGD0L/QvdC+0LPQviDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIG9ialxuXHQgKi9cblx0YWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKSB7XG5cdFx0JCgnI29ubGluZS11cGRhdGVzLWJsb2NrJykuc2hvdygpO1xuXHRcdGxldCBwcm9tb0xpbmsgPSAnJztcblx0XHRpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuXHRcdFx0cHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcblx0XHR9XG5cdFx0Y29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgaWQ9XCIke29iai51bmlxaWR9XCI+XG5cdFx0XHRcdFx0XHQ8dGQ+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pfSAke3Byb21vTGlua308L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L3RkPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZFwiIFxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1jb250ZW50PSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXVuaXFpZCA9IFwiJHtvYmoudW5pcWlkfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtcHJvZHVjdElkID0gXCIke29iai5saWNfcHJvZHVjdF9pZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1mZWF0dXJlSWQgPSBcIiR7b2JqLmxpY19mZWF0dXJlX2lkfVwiIFxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1pZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuXHRcdFx0XHRcdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+IFxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0XHRcdFx0XHRcdDwvYT5cbiAgICBcdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvdHI+YDtcblx0XHQkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCU0L7QsdCw0LLQu9GP0LXRgiDQutC90L7Qv9C60YMg0L7QsdC90L7QstC70LXQvdC40Y8g0YHRgtCw0YDQvtC5INCy0LXRgNGB0LjQuCBQQlhcblx0ICogQHBhcmFtIG9ialxuXHQgKi9cblx0YWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKSB7XG5cdFx0Y29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdGNvbnN0ICRjdXJyZW50VXBkYXRlQnV0dG9uID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCkuZmluZCgnYS51cGRhdGUnKTtcblx0XHRpZiAoJGN1cnJlbnRVcGRhdGVCdXR0b24ubGVuZ3RoID4gMCkge1xuXHRcdFx0Y29uc3Qgb2xkVmVyID0gJGN1cnJlbnRVcGRhdGVCdXR0b24uYXR0cignZGF0YS12ZXInKTtcblx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpIDw9IDApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQkY3VycmVudFVwZGF0ZUJ1dHRvbi5yZW1vdmUoKTtcblx0XHRjb25zdCBkeW5hbWljQnV0dG9uXG5cdFx0XHQ9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYnV0dG9uIHVwZGF0ZSBwb3B1cGVkXCIgXG5cdFx0XHRkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlfVwiXG5cdFx0XHRkYXRhLXZlciA9XCIke29iai52ZXJzaW9ufVwiXG5cdFx0XHRkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG5cdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+IFxuXHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0PC9hPmA7XG5cdFx0JG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YTQuNGH0LAg0LfQsNGF0LLQsNGH0LXQvdCwLCDQvtCx0YDQsNGJ0LDQtdC80YHRjyDQuiDRgdC10YDQstC10YDRg1xuXHQgKiDQvtCx0L3QvtCy0LvQtdC90LjQuSDQt9CwINC/0L7Qu9GD0YfQtdC90LjQuNC10Lwg0LTQuNGB0YLRgNC40LHRg9GC0LjQstCwXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIHJlc3VsdFxuXHQgKi9cblx0Y2JBZnRlckxpY2Vuc2VDaGVjayhwYXJhbXMsIHJlc3VsdCkge1xuXHRcdGlmIChyZXN1bHQ9PT10cnVlKXtcblx0XHRcdFVwZGF0ZUFwaS5HZXRNb2R1bGVJbnN0YWxsTGluayhcblx0XHRcdFx0cGFyYW1zLFxuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzLFxuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlLFxuXHRcdFx0KTtcblx0XHR9IGVsc2UgaWYgKHJlc3VsdD09PWZhbHNlICYmIHBhcmFtcy5sZW5ndGggPiAwKXtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfTm9MaWNlbnNlQXZhaWxhYmxlKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXG5cdH0sXG5cdC8qKlxuXHQgKiDQldGB0LvQuCDRgdCw0LnRgiDQstC10YDQvdGD0Lsg0YHRgdGL0LvQutGDINC90LAg0L7QsdC90L7QstC70LXQvdC40LVcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzKHBhcmFtcywgcmVzcG9uc2UpIHtcblx0XHRjb25zdCBuZXdQYXJhbXMgPSBwYXJhbXM7XG5cdFx0cmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdG5ld1BhcmFtcy5tZDUgPSBvYmoubWQ1O1xuXHRcdFx0bmV3UGFyYW1zLnVwZGF0ZUxpbmsgPSBvYmouaHJlZjtcblx0XHRcdGlmIChuZXdQYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuXHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMudXBkYXRlTW9kdWxlKG5ld1BhcmFtcyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nIHJlZG8nKS5yZW1vdmVDbGFzcygnZG93bmxvYWQnKTtcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKG5ld1BhcmFtcywgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YHQsNC50YIg0L7RgtC60LDQt9Cw0Lsg0LIg0L7QsdC90L7QstC70LXQvdC40LgsINC90LUg0LfQsNGF0LLQsNGH0LXQvdCwINC90YPQttC90LDRjyDRhNC40YfQsFxuXHQgKi9cblx0Y2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUocGFyYW1zKSB7XG5cdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0fVxuXHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X0dldExpbmtFcnJvcik7XG5cdH0sXG5cdC8qKlxuXHQgKiDQodC90LDRh9Cw0LvQsCDQvtGC0LrQu9GO0YfQuNC8INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0L/QvtC70YPRh9C40YLRgdGPLCDRgtC+INC+0YLQv9GA0LDQstC40Lwg0LrQvtC80LDQvdC00YMg0L3QsCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHQgKiDQuCDQvtCx0L3QvtCy0LjQvCDRgdGC0YDQsNC90LjRh9C60YNcblx0ICogQHBhcmFtIHBhcmFtcyAtINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsFxuXHQgKi9cblx0dXBkYXRlTW9kdWxlKHBhcmFtcykge1xuXHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0LLQutC70Y7Rh9C10L0g0LvQuCDQvNC+0LTRg9C70YwsINC10YHQu9C4INCy0LrQu9GO0YfQtdC9LCDQstGL0YDRg9Cx0LjQvCDQtdCz0L5cblx0XHRjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0aWYgKHN0YXR1cyA9PT0gdHJ1ZSkge1xuXHRcdFx0UGJ4QXBpLlN5c3RlbURpc2FibGVNb2R1bGUocGFyYW1zLnVuaXFpZCwgKCkgPT4ge1xuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUocGFyYW1zLCB0cnVlKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUocGFyYW1zLCBmYWxzZSk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70LXQvdC40LUg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LBcblx0ICogQHBhcmFtIG5lZWRFbmFibGUgLSDQstC60LvRjtGH0LjRgtGMINC70Lgg0LzQvtC00YPQu9GMINC/0L7RgdC70LUg0YPRgdGC0LDQvdC+0LLQutC4P1xuXHQgKi9cblx0aW5zdGFsbE1vZHVsZShwYXJhbXMsIG5lZWRFbmFibGUpIHtcblx0XHRQYnhBcGkuRmlsZXNEb3dubG9hZE5ld01vZHVsZShwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuXHRcdFx0aWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG5cdFx0XHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUocGFyYW1zLnVuaXFpZCwgbmVlZEVuYWJsZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBhcmFtcy5hTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0aWYgKHBhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG5cdFx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLmFkZENsYXNzKCdkb3dubG9hZCcpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQodC90LDRh9Cw0LvQsCDQvtGC0LrQu9GO0YfQuNC8INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0L/QvtC70YPRh9C40YLRgdGPLCDRgtC+INC+0YLQv9GA0LDQstC40Lwg0LrQvtC80LDQvdC00YMg0L3QsCDRg9C00LDQu9C10L3QuNC1XG5cdCAqINC4INC+0LHQvdC+0LLQuNC8INGB0YLRgNCw0L3QuNGH0LrRg1xuXHQgKiBAcGFyYW0gcGFyYW1zIC0g0L/QsNGA0LDQvNC10YLRgNGLINC30LDQv9GA0L7RgdCwLlxuXHQgKi9cblx0ZGVsZXRlTW9kdWxlKHBhcmFtcykge1xuXHRcdC8vIEPQv9GA0L7RgdC40Lwg0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GPINGB0L7RhdGA0LDQvdGP0YLRjCDQu9C4INC90LDRgdGC0YDQvtC50LrQuFxuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybVxuXHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0Y2xvc2FibGU6IGZhbHNlLFxuXHRcdFx0XHRvbkRlbnk6ICgpID0+IHtcblx0XHRcdFx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHQvLyDQn9GA0L7QstC10YDQuNC8INCy0LrQu9GO0YfQtdC9INC70Lgg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQstC60LvRjtGH0LXQvSwg0LLRi9GA0YPQsdC40Lwg0LXQs9C+XG5cdFx0XHRcdFx0Y29uc3Qgc3RhdHVzID0gJChgIyR7cGFyYW1zLnVuaXFpZH1gKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXHRcdFx0XHRcdGNvbnN0IGtlZXBTZXR0aW5ncyA9IGV4dGVuc2lvbk1vZHVsZXMuJGtlZXBTZXR0aW5nc0NoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0XHRcdFx0aWYgKHN0YXR1cyA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbURpc2FibGVNb2R1bGUocGFyYW1zLnVuaXFpZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtRGVsZXRlTW9kdWxlKFxuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy51bmlxaWQsXG5cdFx0XHRcdFx0XHRcdFx0a2VlcFNldHRpbmdzLFxuXHRcdFx0XHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSxcblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtRGVsZXRlTW9kdWxlKHBhcmFtcy51bmlxaWQsIGtlZXBTZXR0aW5ncywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KVxuXHRcdFx0Lm1vZGFsKCdzaG93Jyk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQutC+0LzQsNC90LTRiyB1bmluc3RhbGwg0LTQu9GPINC80L7QtNGD0LvRj1xuXHQgKiDQldGB0LvQuCDRg9GB0L/QtdGI0L3Qviwg0L/QtdGA0LXQs9GA0YPQt9C40Lwg0YHRgtGA0LDQvdC40YbRgywg0LXRgdC70Lgg0L3QtdGCLCDRgtC+INGB0L7QvtCx0YnQuNC8INC+0LEg0L7RiNC40LHQutC1XG5cdCAqIEBwYXJhbSByZXN1bHQgLSDRgNC10LfRg9C70YzRgtCw0YIg0YPQtNCw0LvQtdC90LjRjyDQvNC+0LTRg9C70Y9cblx0ICovXG5cdGNiQWZ0ZXJEZWxldGUocmVzdWx0KSB7XG5cdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRpZiAocmVzdWx0ID09PSB0cnVlKSB7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleC9gO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cdFx0XHRsZXQgZXJyb3JNZXNzYWdlID0gKHJlc3VsdC5kYXRhICE9PSB1bmRlZmluZWQpID8gcmVzdWx0LmRhdGEgOiAnJztcblx0XHRcdGVycm9yTWVzc2FnZSA9IGVycm9yTWVzc2FnZS5yZXBsYWNlKC9cXG4vZywgJzxicj4nKTtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhlcnJvck1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5leHRfRGVsZXRlTW9kdWxlRXJyb3IpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqINCh0YDQsNCy0L3QtdC90LjQtSDQstC10YDRgdC40Lkg0LzQvtC00YPQu9C10Llcblx0ICogQHBhcmFtIHYxXG5cdCAqIEBwYXJhbSB2MlxuXHQgKiBAcGFyYW0gb3B0aW9uc1xuXHQgKiBAcmV0dXJucyB7bnVtYmVyfVxuXHQgKi9cblx0dmVyc2lvbkNvbXBhcmUodjEsIHYyLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgbGV4aWNvZ3JhcGhpY2FsID0gb3B0aW9ucyAmJiBvcHRpb25zLmxleGljb2dyYXBoaWNhbDtcblx0XHRjb25zdCB6ZXJvRXh0ZW5kID0gb3B0aW9ucyAmJiBvcHRpb25zLnplcm9FeHRlbmQ7XG5cdFx0bGV0IHYxcGFydHMgPSB2MS5zcGxpdCgnLicpO1xuXHRcdGxldCB2MnBhcnRzID0gdjIuc3BsaXQoJy4nKTtcblxuXHRcdGZ1bmN0aW9uIGlzVmFsaWRQYXJ0KHgpIHtcblx0XHRcdHJldHVybiAobGV4aWNvZ3JhcGhpY2FsID8gL15cXGQrW0EtWmEtel0qJC8gOiAvXlxcZCskLykudGVzdCh4KTtcblx0XHR9XG5cblx0XHRpZiAoIXYxcGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpIHx8ICF2MnBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSkge1xuXHRcdFx0cmV0dXJuIE5hTjtcblx0XHR9XG5cblx0XHRpZiAoemVyb0V4dGVuZCkge1xuXHRcdFx0d2hpbGUgKHYxcGFydHMubGVuZ3RoIDwgdjJwYXJ0cy5sZW5ndGgpIHYxcGFydHMucHVzaCgnMCcpO1xuXHRcdFx0d2hpbGUgKHYycGFydHMubGVuZ3RoIDwgdjFwYXJ0cy5sZW5ndGgpIHYycGFydHMucHVzaCgnMCcpO1xuXHRcdH1cblxuXHRcdGlmICghbGV4aWNvZ3JhcGhpY2FsKSB7XG5cdFx0XHR2MXBhcnRzID0gdjFwYXJ0cy5tYXAoTnVtYmVyKTtcblx0XHRcdHYycGFydHMgPSB2MnBhcnRzLm1hcChOdW1iZXIpO1xuXHRcdH1cblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdjFwYXJ0cy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0aWYgKHYycGFydHMubGVuZ3RoID09PSBpKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHYxcGFydHNbaV0gPT09IHYycGFydHNbaV0pIHtcblx0XHRcdFx0Ly9cblx0XHRcdH0gZWxzZSBpZiAodjFwYXJ0c1tpXSA+IHYycGFydHNbaV0pIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHYxcGFydHMubGVuZ3RoICE9PSB2MnBhcnRzLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblxuXHRcdHJldHVybiAwO1xuXHR9LFxuXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=