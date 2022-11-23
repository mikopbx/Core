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

      if ($('#license-key').val().trim() === '' && params.licProductId !== '0') {
        window.location = "".concat(globalRootUrl, "licensing/modify/pbx-extension-modules");
      } else {
        PbxApi.LicenseCaptureFeatureForProductId(params, extensionModules.cbAfterLicenseCheck);
      }
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

    var additionalIcon = '';

    if (obj.lic_feature_id !== 0) {
      additionalIcon = '<i class="icon red cart arrow down"></i>';
    }

    var dymanicRow = "\n\t\t\t<tr class=\"new-module-row\" id=\"".concat(obj.uniqid, "\">\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.name), "<br>\n\t\t\t\t\t\t<span class=\"features\">").concat(decodeURIComponent(obj.description), " ").concat(promoLink, "</span>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.developer), "</td>\n\t\t\t\t\t\t<td class=\"center aligned version\">").concat(obj.version, "</td>\n\t\t\t\t\t\t<td class=\"right aligned collapsing\">\n    \t\t\t\t\t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t\t\t\t\t<a href=\"#\" class=\"ui button download\" \n\t\t\t\t\t\t\t\t\tdata-content= \"").concat(globalTranslate.ext_InstallModule, "\"\n\t\t\t\t\t\t\t\t\tdata-uniqid = \"").concat(obj.uniqid, "\"\n\t\t\t\t\t\t\t\t\tdata-size = \"").concat(obj.size, "\"\n\t\t\t\t\t\t\t\t\tdata-productId = \"").concat(obj.lic_product_id, "\"\n\t\t\t\t\t\t\t\t\tdata-featureId = \"").concat(obj.lic_feature_id, "\" \n\t\t\t\t\t\t\t\t\tdata-id =\"").concat(obj.release_id, "\">\n\t\t\t\t\t\t\t\t\t") + additionalIcon + "\n\t\t\t\t\t\t\t\t\t<i class=\"icon download blue\"></i> \n\t\t\t\t\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t\t\t\t\t</a>\n    \t\t\t\t\t\t</div>\n\t\t\t</tr>";
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

        if (window.pbxExtensionMenuAddition !== undefined) {
          pbxExtensionMenuAddition.updateSidebarMenu();
        }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsInZhbCIsInRyaW0iLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJQYnhBcGkiLCJMaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQiLCJjYkFmdGVyTGljZW5zZUNoZWNrIiwiZGVsZXRlTW9kdWxlIiwicG9wdXAiLCJzaG93IiwicHJvbW9MaW5rIiwicHJvbW9fbGluayIsInVuZGVmaW5lZCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9FeHRlcm5hbERlc2NyaXB0aW9uIiwiYWRkaXRpb25hbEljb24iLCJsaWNfZmVhdHVyZV9pZCIsImR5bWFuaWNSb3ciLCJkZWNvZGVVUklDb21wb25lbnQiLCJuYW1lIiwiZGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJleHRfSW5zdGFsbE1vZHVsZSIsImxpY19wcm9kdWN0X2lkIiwicmVsZWFzZV9pZCIsImFwcGVuZCIsIiRjdXJyZW50VXBkYXRlQnV0dG9uIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwicmVzdWx0IiwiR2V0TW9kdWxlSW5zdGFsbExpbmsiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyIsImNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfTm9MaWNlbnNlQXZhaWxhYmxlIiwibmV3UGFyYW1zIiwibWQ1IiwidXBkYXRlTGluayIsImhyZWYiLCJ1cGRhdGVNb2R1bGUiLCJpbnN0YWxsTW9kdWxlIiwiZXh0X0dldExpbmtFcnJvciIsInN0YXR1cyIsImNoZWNrYm94IiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsIm5lZWRFbmFibGUiLCJGaWxlc0Rvd25sb2FkTmV3TW9kdWxlIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJwYnhFeHRlbnNpb25NZW51QWRkaXRpb24iLCJ1cGRhdGVTaWRlYmFyTWVudSIsIm1lc3NhZ2VzIiwiZXh0X0luc3RhbGxhdGlvbkVycm9yIiwiY2xvc2FibGUiLCJvbkRlbnkiLCJvbkFwcHJvdmUiLCJrZWVwU2V0dGluZ3MiLCJTeXN0ZW1EZWxldGVNb2R1bGUiLCJjYkFmdGVyRGVsZXRlIiwiZXJyb3JNZXNzYWdlIiwiZGF0YSIsImV4dF9EZWxldGVNb2R1bGVFcnJvciIsInYxIiwidjIiLCJvcHRpb25zIiwibGV4aWNvZ3JhcGhpY2FsIiwiemVyb0V4dGVuZCIsInYxcGFydHMiLCJzcGxpdCIsInYycGFydHMiLCJpc1ZhbGlkUGFydCIsIngiLCJ0ZXN0IiwiZXZlcnkiLCJOYU4iLCJtYXAiLCJOdW1iZXIiLCJpIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBR0EsSUFBTUEsZ0JBQWdCLEdBQUc7QUFDeEJDLEVBQUFBLFdBQVcsRUFBRUMsQ0FBQyxDQUFDLHVCQUFELENBRFU7QUFFeEJDLEVBQUFBLGdCQUFnQixFQUFFRCxDQUFDLENBQUMsb0JBQUQsQ0FGSztBQUd4QkUsRUFBQUEscUJBQXFCLEVBQUVGLENBQUMsQ0FBQyxxQkFBRCxDQUhBO0FBSXhCRyxFQUFBQSxhQUFhLEVBQUVILENBQUMsQ0FBQyxnQkFBRCxDQUpRO0FBS3hCSSxFQUFBQSxVQUFVLEVBQUVDLGdCQUFnQixDQUFDQyxPQUFqQixDQUF5QixPQUF6QixFQUFrQyxFQUFsQyxDQUxZO0FBTXhCQyxFQUFBQSxVQUFVLEVBQUUsRUFOWTtBQU94QkMsRUFBQUEsVUFQd0Isd0JBT1g7QUFDWlYsSUFBQUEsZ0JBQWdCLENBQUNHLGdCQUFqQixDQUFrQ1EsS0FBbEM7QUFDQVgsSUFBQUEsZ0JBQWdCLENBQUNZLG1CQUFqQjtBQUNBQyxJQUFBQSxTQUFTLENBQUNDLGlCQUFW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O0FBRUQsUUFBSVYsT0FBTyxDQUFDOUYsTUFBUixLQUFtQmdHLE9BQU8sQ0FBQ2hHLE1BQS9CLEVBQXVDO0FBQ3RDLGFBQU8sQ0FBQyxDQUFSO0FBQ0E7O0FBRUQsV0FBTyxDQUFQO0FBQ0E7QUE1WHVCLENBQXpCO0FBZ1lBMUMsQ0FBQyxDQUFDbUosUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnRKLEVBQUFBLGdCQUFnQixDQUFDVSxVQUFqQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IChDKSAyMDE3LTIwMjAgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBVcGRhdGVBcGksIFVzZXJNZXNzYWdlLCBnbG9iYWxQQlhWZXJzaW9uLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIsIFBieEV4dGVuc2lvblN0YXR1cyAqL1xuXG5cbmNvbnN0IGV4dGVuc2lvbk1vZHVsZXMgPSB7XG5cdCRjaGVja2JveGVzOiAkKCcubW9kdWxlLXJvdyAuY2hlY2tib3gnKSxcblx0JGRlbGV0ZU1vZGFsRm9ybTogJCgnI2RlbGV0ZS1tb2RhbC1mb3JtJyksXG5cdCRrZWVwU2V0dGluZ3NDaGVja2JveDogJCgnI2tlZXBNb2R1bGVTZXR0aW5ncycpLFxuXHQkbW9kdWxlc1RhYmxlOiAkKCcjbW9kdWxlcy10YWJsZScpLFxuXHRwYnhWZXJzaW9uOiBnbG9iYWxQQlhWZXJzaW9uLnJlcGxhY2UoLy1kZXYvaSwgJycpLFxuXHRjaGVja0JveGVzOiBbXSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm0ubW9kYWwoKTtcblx0XHRleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcblx0XHRVcGRhdGVBcGkuZ2V0TW9kdWxlc1VwZGF0ZXMoZXh0ZW5zaW9uTW9kdWxlcy5jYlBhcnNlTW9kdWxlVXBkYXRlcyk7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kY2hlY2tib3hlcy5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRjb25zdCB1bmlxSWQgPSAkKG9iaikuYXR0cignZGF0YS12YWx1ZScpO1xuXHRcdFx0Y29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXMoKTtcblx0XHRcdHBhZ2VTdGF0dXMuaW5pdGlhbGl6ZSh1bmlxSWQsIGZhbHNlKTtcblx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuY2hlY2tCb3hlcy5wdXNoKHBhZ2VTdGF0dXMpO1xuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuXHQgKi9cblx0aW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRtb2R1bGVzVGFibGUuRGF0YVRhYmxlKHtcblx0XHRcdGxlbmd0aENoYW5nZTogZmFsc2UsXG5cdFx0XHRwYWdpbmc6IGZhbHNlLFxuXHRcdFx0Y29sdW1uczogW1xuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdHsgb3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2UgfSxcblx0XHRcdF0sXG5cdFx0XHRhdXRvV2lkdGg6IGZhbHNlLFxuXHRcdFx0bGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcblx0XHR9KTtcblx0XHQkKCcuYWRkLW5ldycpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtC60LAg0YHQv9C40YHQutCwINC80L7QtNGD0LvQtdC5INC/0L7Qu9GD0YfQtdC90L3RhSDRgSDRgdCw0LnRgtCwXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JQYXJzZU1vZHVsZVVwZGF0ZXMocmVzcG9uc2UpIHtcblx0XHRyZXNwb25zZS5tb2R1bGVzLmZvckVhY2goKG9iaikgPT4ge1xuXHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQv9C+0LTRhdC+0LTQuNGCINC70Lgg0L/QviDQvdC+0LzQtdGA0YMg0LLQtdGA0YHQuNC4INGN0YLQvtGCINC80L7QtNGD0LvRjCDQuiDQkNCi0KFcblx0XHRcdGNvbnN0IG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCA9IG9iai5taW5fcGJ4X3ZlcnNpb247XG5cdFx0XHRjb25zdCBjdXJyZW50VmVyc2lvblBCWCA9IGV4dGVuc2lvbk1vZHVsZXMucGJ4VmVyc2lvbjtcblx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKGN1cnJlbnRWZXJzaW9uUEJYLCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgpIDwgMCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQvLyDQmNGJ0LXQvCDRgdGA0LXQtNC4INGD0YHRgtCw0L3QvtCy0LvQtdC90L3Ri9GFLCDQv9GA0LXQtNC70L7QttC40Lwg0L7QsdC90L7QstC70LXQvdC40LVcblx0XHRcdGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcblx0XHRcdGlmICgkbW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Y29uc3Qgb2xkVmVyID0gJG1vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuXHRcdFx0XHRjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcblx0XHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpID4gMCkge1xuXHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc3QgJG5ld01vZHVsZVJvdyA9ICQoYHRyLm5ldy1tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcblx0XHRcdFx0aWYgKCRuZXdNb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdGNvbnN0IG9sZFZlciA9ICRuZXdNb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcblx0XHRcdFx0XHRjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcblx0XHRcdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG5cdFx0XHRcdFx0XHQkbmV3TW9kdWxlUm93LnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdCQoJ2EuZG93bmxvYWQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHt9O1xuXHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuXHRcdFx0JGFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuXHRcdFx0cGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG5cdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcblx0XHRcdHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcblx0XHRcdHBhcmFtcy5hY3Rpb24gPSAnaW5zdGFsbCc7XG5cdFx0XHRwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG5cdFx0XHRpZigkKCcjbGljZW5zZS1rZXknKS52YWwoKS50cmltKCkgPT09ICcnICYmIHBhcmFtcy5saWNQcm9kdWN0SWQgIT09ICcwJyl7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL21vZGlmeS9wYngtZXh0ZW5zaW9uLW1vZHVsZXNgO1xuXHRcdFx0fWVsc2V7XG5cdFx0XHRcdFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdCQoJ2EudXBkYXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSB7fTtcblx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcblx0XHRcdCRhTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcblx0XHRcdHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcblx0XHRcdHBhcmFtcy5hY3Rpb24gPSAndXBkYXRlJztcblx0XHRcdHBhcmFtcy5yZWxlYXNlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1pZCcpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuXHRcdFx0cGFyYW1zLnNpemUgPSAkYUxpbmsuYXR0cignZGF0YS1zaXplJyk7XG5cdFx0XHRwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG5cdFx0XHRQYnhBcGkuTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcblx0XHR9KTtcblx0XHQkKCdhLmRlbGV0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0JChlLnRhcmdldCkuY2xvc2VzdCgnYScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0gW107XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdpZCcpO1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5kZWxldGVNb2R1bGUocGFyYW1zKTtcblx0XHR9KTtcblx0XHQkKCdhW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuXHR9LFxuXHQvKipcblx0ICog0JTQvtCx0LDQstC70Y/QtdGCINC+0L/QuNGB0LDQvdC40LUg0LTQvtGB0YLRg9C/0L3QvtCz0L4g0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBvYmpcblx0ICovXG5cdGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuXHRcdCQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcblx0XHRsZXQgcHJvbW9MaW5rID0gJyc7XG5cdFx0aWYgKG9iai5wcm9tb19saW5rICE9PSB1bmRlZmluZWQgJiYgb2JqLnByb21vX2xpbmsgIT09IG51bGwpIHtcblx0XHRcdHByb21vTGluayA9IGA8YnI+PGEgaHJlZj1cIiR7b2JqLnByb21vX2xpbmt9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0V4dGVybmFsRGVzY3JpcHRpb259PC9hPmA7XG5cdFx0fVxuXG5cdFx0bGV0IGFkZGl0aW9uYWxJY29uID0gJyc7XG5cdFx0aWYob2JqLmxpY19mZWF0dXJlX2lkICE9PSAwKXtcblx0XHRcdGFkZGl0aW9uYWxJY29uID0gJzxpIGNsYXNzPVwiaWNvbiByZWQgY2FydCBhcnJvdyBkb3duXCI+PC9pPic7XG5cdFx0fVxuXHRcdGNvbnN0IGR5bWFuaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGlkPVwiJHtvYmoudW5pcWlkfVwiPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX08YnI+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZD4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGV2ZWxvcGVyKX08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgdmVyc2lvblwiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHRcdFx0XHRcdDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWRcIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdFx0XHRcdFx0XHRcdGArYWRkaXRpb25hbEljb24rYFxuXHRcdFx0XHRcdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+IFxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0XHRcdFx0XHRcdDwvYT5cbiAgICBcdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvdHI+YDtcblx0XHQkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCU0L7QsdCw0LLQu9GP0LXRgiDQutC90L7Qv9C60YMg0L7QsdC90L7QstC70LXQvdC40Y8g0YHRgtCw0YDQvtC5INCy0LXRgNGB0LjQuCBQQlhcblx0ICogQHBhcmFtIG9ialxuXHQgKi9cblx0YWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKSB7XG5cdFx0Y29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdGNvbnN0ICRjdXJyZW50VXBkYXRlQnV0dG9uID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCkuZmluZCgnYS51cGRhdGUnKTtcblx0XHRpZiAoJGN1cnJlbnRVcGRhdGVCdXR0b24ubGVuZ3RoID4gMCkge1xuXHRcdFx0Y29uc3Qgb2xkVmVyID0gJGN1cnJlbnRVcGRhdGVCdXR0b24uYXR0cignZGF0YS12ZXInKTtcblx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpIDw9IDApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQkY3VycmVudFVwZGF0ZUJ1dHRvbi5yZW1vdmUoKTtcblx0XHRjb25zdCBkeW5hbWljQnV0dG9uXG5cdFx0XHQ9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYnV0dG9uIHVwZGF0ZSBwb3B1cGVkXCIgXG5cdFx0XHRkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlfVwiXG5cdFx0XHRkYXRhLXZlciA9XCIke29iai52ZXJzaW9ufVwiXG5cdFx0XHRkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG5cdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+IFxuXHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0PC9hPmA7XG5cdFx0JG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YTQuNGH0LAg0LfQsNGF0LLQsNGH0LXQvdCwLCDQvtCx0YDQsNGJ0LDQtdC80YHRjyDQuiDRgdC10YDQstC10YDRg1xuXHQgKiDQvtCx0L3QvtCy0LvQtdC90LjQuSDQt9CwINC/0L7Qu9GD0YfQtdC90LjQuNC10Lwg0LTQuNGB0YLRgNC40LHRg9GC0LjQstCwXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIHJlc3VsdFxuXHQgKi9cblx0Y2JBZnRlckxpY2Vuc2VDaGVjayhwYXJhbXMsIHJlc3VsdCkge1xuXHRcdGlmIChyZXN1bHQ9PT10cnVlKXtcblx0XHRcdFVwZGF0ZUFwaS5HZXRNb2R1bGVJbnN0YWxsTGluayhcblx0XHRcdFx0cGFyYW1zLFxuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzLFxuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlLFxuXHRcdFx0KTtcblx0XHR9IGVsc2UgaWYgKHJlc3VsdD09PWZhbHNlICYmIHBhcmFtcy5sZW5ndGggPiAwKXtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfTm9MaWNlbnNlQXZhaWxhYmxlKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXG5cdH0sXG5cdC8qKlxuXHQgKiDQldGB0LvQuCDRgdCw0LnRgiDQstC10YDQvdGD0Lsg0YHRgdGL0LvQutGDINC90LAg0L7QsdC90L7QstC70LXQvdC40LVcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzKHBhcmFtcywgcmVzcG9uc2UpIHtcblx0XHRjb25zdCBuZXdQYXJhbXMgPSBwYXJhbXM7XG5cdFx0cmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdG5ld1BhcmFtcy5tZDUgPSBvYmoubWQ1O1xuXHRcdFx0bmV3UGFyYW1zLnVwZGF0ZUxpbmsgPSBvYmouaHJlZjtcblx0XHRcdGlmIChuZXdQYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuXHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMudXBkYXRlTW9kdWxlKG5ld1BhcmFtcyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLmFkZENsYXNzKCdsb2FkaW5nIHJlZG8nKS5yZW1vdmVDbGFzcygnZG93bmxvYWQnKTtcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKG5ld1BhcmFtcywgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YHQsNC50YIg0L7RgtC60LDQt9Cw0Lsg0LIg0L7QsdC90L7QstC70LXQvdC40LgsINC90LUg0LfQsNGF0LLQsNGH0LXQvdCwINC90YPQttC90LDRjyDRhNC40YfQsFxuXHQgKi9cblx0Y2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUocGFyYW1zKSB7XG5cdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0fVxuXHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X0dldExpbmtFcnJvcik7XG5cdH0sXG5cdC8qKlxuXHQgKiDQodC90LDRh9Cw0LvQsCDQvtGC0LrQu9GO0YfQuNC8INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0L/QvtC70YPRh9C40YLRgdGPLCDRgtC+INC+0YLQv9GA0LDQstC40Lwg0LrQvtC80LDQvdC00YMg0L3QsCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHQgKiDQuCDQvtCx0L3QvtCy0LjQvCDRgdGC0YDQsNC90LjRh9C60YNcblx0ICogQHBhcmFtIHBhcmFtcyAtINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsFxuXHQgKi9cblx0dXBkYXRlTW9kdWxlKHBhcmFtcykge1xuXHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0LLQutC70Y7Rh9C10L0g0LvQuCDQvNC+0LTRg9C70YwsINC10YHQu9C4INCy0LrQu9GO0YfQtdC9LCDQstGL0YDRg9Cx0LjQvCDQtdCz0L5cblx0XHRjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0aWYgKHN0YXR1cyA9PT0gdHJ1ZSkge1xuXHRcdFx0UGJ4QXBpLlN5c3RlbURpc2FibGVNb2R1bGUocGFyYW1zLnVuaXFpZCwgKCkgPT4ge1xuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUocGFyYW1zLCB0cnVlKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUocGFyYW1zLCBmYWxzZSk7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0J7QsdC90L7QstC70LXQvdC40LUg0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LBcblx0ICogQHBhcmFtIG5lZWRFbmFibGUgLSDQstC60LvRjtGH0LjRgtGMINC70Lgg0LzQvtC00YPQu9GMINC/0L7RgdC70LUg0YPRgdGC0LDQvdC+0LLQutC4P1xuXHQgKi9cblx0aW5zdGFsbE1vZHVsZShwYXJhbXMsIG5lZWRFbmFibGUpIHtcblx0XHRQYnhBcGkuRmlsZXNEb3dubG9hZE5ld01vZHVsZShwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuXHRcdFx0aWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG5cdFx0XHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUocGFyYW1zLnVuaXFpZCwgbmVlZEVuYWJsZSk7XG5cdFx0XHRcdGlmKHdpbmRvdy5wYnhFeHRlbnNpb25NZW51QWRkaXRpb24gIT09IHVuZGVmaW5lZCl7XG5cdFx0XHRcdFx0cGJ4RXh0ZW5zaW9uTWVudUFkZGl0aW9uLnVwZGF0ZVNpZGViYXJNZW51KCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0cGFyYW1zLmFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCh0L3QsNGH0LDQu9CwINC+0YLQutC70Y7Rh9C40Lwg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQv9C+0LvRg9GH0LjRgtGB0Y8sINGC0L4g0L7RgtC/0YDQsNCy0LjQvCDQutC+0LzQsNC90LTRgyDQvdCwINGD0LTQsNC70LXQvdC40LVcblx0ICog0Lgg0L7QsdC90L7QstC40Lwg0YHRgtGA0LDQvdC40YfQutGDXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LAuXG5cdCAqL1xuXHRkZWxldGVNb2R1bGUocGFyYW1zKSB7XG5cdFx0Ly8gQ9C/0YDQvtGB0LjQvCDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y8g0YHQvtGF0YDQsNC90Y/RgtGMINC70Lgg0L3QsNGB0YLRgNC+0LnQutC4XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kZGVsZXRlTW9kYWxGb3JtXG5cdFx0XHQubW9kYWwoe1xuXHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdG9uRGVueTogKCkgPT4ge1xuXHRcdFx0XHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0LLQutC70Y7Rh9C10L0g0LvQuCDQvNC+0LTRg9C70YwsINC10YHQu9C4INCy0LrQu9GO0YfQtdC9LCDQstGL0YDRg9Cx0LjQvCDQtdCz0L5cblx0XHRcdFx0XHRjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0XHRcdFx0Y29uc3Qga2VlcFNldHRpbmdzID0gZXh0ZW5zaW9uTW9kdWxlcy4ka2VlcFNldHRpbmdzQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRcdFx0XHRpZiAoc3RhdHVzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtRGlzYWJsZU1vZHVsZShwYXJhbXMudW5pcWlkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EZWxldGVNb2R1bGUoXG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnVuaXFpZCxcblx0XHRcdFx0XHRcdFx0XHRrZWVwU2V0dGluZ3MsXG5cdFx0XHRcdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlLFxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EZWxldGVNb2R1bGUocGFyYW1zLnVuaXFpZCwga2VlcFNldHRpbmdzLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSxcblx0XHRcdH0pXG5cdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC60L7QvNCw0L3QtNGLIHVuaW5zdGFsbCDQtNC70Y8g0LzQvtC00YPQu9GPXG5cdCAqINCV0YHQu9C4INGD0YHQv9C10YjQvdC+LCDQv9C10YDQtdCz0YDRg9C30LjQvCDRgdGC0YDQsNC90LjRhtGDLCDQtdGB0LvQuCDQvdC10YIsINGC0L4g0YHQvtC+0LHRidC40Lwg0L7QsSDQvtGI0LjQsdC60LVcblx0ICogQHBhcmFtIHJlc3VsdCAtINGA0LXQt9GD0LvRjNGC0LDRgiDRg9C00LDQu9C10L3QuNGPINC80L7QtNGD0LvRj1xuXHQgKi9cblx0Y2JBZnRlckRlbGV0ZShyZXN1bHQpIHtcblx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdGlmIChyZXN1bHQgPT09IHRydWUpIHtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblx0XHRcdGxldCBlcnJvck1lc3NhZ2UgPSAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkgPyByZXN1bHQuZGF0YSA6ICcnO1xuXHRcdFx0ZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9EZWxldGVNb2R1bGVFcnJvcik7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0KHRgNCw0LLQvdC10L3QuNC1INCy0LXRgNGB0LjQuSDQvNC+0LTRg9C70LXQuVxuXHQgKiBAcGFyYW0gdjFcblx0ICogQHBhcmFtIHYyXG5cdCAqIEBwYXJhbSBvcHRpb25zXG5cdCAqIEByZXR1cm5zIHtudW1iZXJ9XG5cdCAqL1xuXHR2ZXJzaW9uQ29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIHtcblx0XHRjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuXHRcdGNvbnN0IHplcm9FeHRlbmQgPSBvcHRpb25zICYmIG9wdGlvbnMuemVyb0V4dGVuZDtcblx0XHRsZXQgdjFwYXJ0cyA9IHYxLnNwbGl0KCcuJyk7XG5cdFx0bGV0IHYycGFydHMgPSB2Mi5zcGxpdCgnLicpO1xuXG5cdFx0ZnVuY3Rpb24gaXNWYWxpZFBhcnQoeCkge1xuXHRcdFx0cmV0dXJuIChsZXhpY29ncmFwaGljYWwgPyAvXlxcZCtbQS1aYS16XSokLyA6IC9eXFxkKyQvKS50ZXN0KHgpO1xuXHRcdH1cblxuXHRcdGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG5cdFx0XHRyZXR1cm4gTmFOO1xuXHRcdH1cblxuXHRcdGlmICh6ZXJvRXh0ZW5kKSB7XG5cdFx0XHR3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG5cdFx0XHR3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFsZXhpY29ncmFwaGljYWwpIHtcblx0XHRcdHYxcGFydHMgPSB2MXBhcnRzLm1hcChOdW1iZXIpO1xuXHRcdFx0djJwYXJ0cyA9IHYycGFydHMubWFwKE51bWJlcik7XG5cdFx0fVxuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB2MXBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0XHRpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuXHRcdFx0XHQvL1xuXHRcdFx0fSBlbHNlIGlmICh2MXBhcnRzW2ldID4gdjJwYXJ0c1tpXSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodjFwYXJ0cy5sZW5ndGggIT09IHYycGFydHMubGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm4gLTE7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIDA7XG5cdH0sXG5cbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0ZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==