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
      PbxApi.SystemDownloadNewModule(params, function (response) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicHVzaCIsIlBieEV4dGVuc2lvblN0YXR1cyIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImFwcGVuZFRvIiwicmVzcG9uc2UiLCJtb2R1bGVzIiwiZm9yRWFjaCIsIm1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCIsIm1pbl9wYnhfdmVyc2lvbiIsImN1cnJlbnRWZXJzaW9uUEJYIiwidmVyc2lvbkNvbXBhcmUiLCIkbW9kdWxlUm93IiwidW5pcWlkIiwibGVuZ3RoIiwib2xkVmVyIiwiZmluZCIsInRleHQiLCJuZXdWZXIiLCJ2ZXJzaW9uIiwiYWRkVXBkYXRlQnV0dG9uVG9Sb3ciLCIkbmV3TW9kdWxlUm93IiwicmVtb3ZlIiwiYWRkTW9kdWxlRGVzY3JpcHRpb24iLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImFkZENsYXNzIiwicGFyYW1zIiwiJGFMaW5rIiwidGFyZ2V0IiwiY2xvc2VzdCIsInJlbW92ZUNsYXNzIiwicmVsZWFzZUlkIiwic2l6ZSIsImxpY1Byb2R1Y3RJZCIsImxpY0ZlYXR1cmVJZCIsImFjdGlvbiIsImFMaW5rIiwibGljZW5zaW5nIiwiY2FwdHVyZUZlYXR1cmUiLCJjYkFmdGVyTGljZW5zZUNoZWNrIiwiZGVsZXRlTW9kdWxlIiwicG9wdXAiLCJzaG93IiwicHJvbW9MaW5rIiwicHJvbW9fbGluayIsInVuZGVmaW5lZCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9FeHRlcm5hbERlc2NyaXB0aW9uIiwiZHltYW5pY1JvdyIsImRlY29kZVVSSUNvbXBvbmVudCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsImRldmVsb3BlciIsImV4dF9JbnN0YWxsTW9kdWxlIiwibGljX3Byb2R1Y3RfaWQiLCJsaWNfZmVhdHVyZV9pZCIsInJlbGVhc2VfaWQiLCJhcHBlbmQiLCIkY3VycmVudFVwZGF0ZUJ1dHRvbiIsImR5bmFtaWNCdXR0b24iLCJleHRfVXBkYXRlTW9kdWxlIiwicHJlcGVuZCIsIkdldE1vZHVsZUluc3RhbGxMaW5rIiwiY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZSIsIm5ld1BhcmFtcyIsIm1kNSIsInVwZGF0ZUxpbmsiLCJocmVmIiwidXBkYXRlTW9kdWxlIiwiaW5zdGFsbE1vZHVsZSIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZXh0X0dldExpbmtFcnJvciIsInN0YXR1cyIsImNoZWNrYm94IiwiUGJ4QXBpIiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsIm5lZWRFbmFibGUiLCJTeXN0ZW1Eb3dubG9hZE5ld01vZHVsZSIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwibWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImV4dF9JbnN0YWxsYXRpb25FcnJvciIsInJlbG9hZE1vZHVsZUFuZFBhZ2UiLCJTeXN0ZW1SZWxvYWRNb2R1bGUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImtlZXBTZXR0aW5ncyIsIlN5c3RlbURlbGV0ZU1vZHVsZSIsImNiQWZ0ZXJEZWxldGUiLCJyZXN1bHQiLCJlcnJvck1lc3NhZ2UiLCJkYXRhIiwiZXh0X0RlbGV0ZU1vZHVsZUVycm9yIiwidjEiLCJ2MiIsIm9wdGlvbnMiLCJsZXhpY29ncmFwaGljYWwiLCJ6ZXJvRXh0ZW5kIiwidjFwYXJ0cyIsInNwbGl0IiwidjJwYXJ0cyIsImlzVmFsaWRQYXJ0IiwieCIsInRlc3QiLCJldmVyeSIsIk5hTiIsIm1hcCIsIk51bWJlciIsImkiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBOzs7QUFLQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUN4QkMsRUFBQUEsV0FBVyxFQUFFQyxDQUFDLENBQUMsdUJBQUQsQ0FEVTtBQUV4QkMsRUFBQUEsZ0JBQWdCLEVBQUVELENBQUMsQ0FBQyxvQkFBRCxDQUZLO0FBR3hCRSxFQUFBQSxxQkFBcUIsRUFBRUYsQ0FBQyxDQUFDLHFCQUFELENBSEE7QUFJeEJHLEVBQUFBLGFBQWEsRUFBRUgsQ0FBQyxDQUFDLGdCQUFELENBSlE7QUFLeEJJLEVBQUFBLFVBQVUsRUFBRUMsZ0JBQWdCLENBQUNDLE9BQWpCLENBQXlCLE9BQXpCLEVBQWtDLEVBQWxDLENBTFk7QUFNeEJDLEVBQUFBLFVBQVUsRUFBRSxFQU5ZO0FBT3hCQyxFQUFBQSxVQVB3QjtBQUFBLDBCQU9YO0FBQ1pWLE1BQUFBLGdCQUFnQixDQUFDRyxnQkFBakIsQ0FBa0NRLEtBQWxDO0FBQ0FYLE1BQUFBLGdCQUFnQixDQUFDWSxtQkFBakI7QUFDQUMsTUFBQUEsU0FBUyxDQUFDQyxpQkFBVixDQUE0QmQsZ0JBQWdCLENBQUNlLG9CQUE3QztBQUNBZixNQUFBQSxnQkFBZ0IsQ0FBQ0MsV0FBakIsQ0FBNkJlLElBQTdCLENBQWtDLFVBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUNqRCxZQUFNQyxNQUFNLEdBQUdqQixDQUFDLENBQUNnQixHQUFE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QyxpQkFBTyxDQUFQO0FBQ0EsU0FGTSxNQUVBO0FBQ04saUJBQU8sQ0FBQyxDQUFSO0FBQ0E7QUFDRDs7QUFFRCxVQUFJVixPQUFPLENBQUM1RixNQUFSLEtBQW1COEYsT0FBTyxDQUFDOUYsTUFBL0IsRUFBdUM7QUFDdEMsZUFBTyxDQUFDLENBQVI7QUFDQTs7QUFFRCxhQUFPLENBQVA7QUFDQTs7QUE3V3VCO0FBQUE7QUFBQSxDQUF6QjtBQWlYQXhDLENBQUMsQ0FBQytJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJsSixFQUFBQSxnQkFBZ0IsQ0FBQ1UsVUFBakI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSxcblVwZGF0ZUFwaSwgVXNlck1lc3NhZ2UsIGdsb2JhbFBCWFZlcnNpb24sIFNlbWFudGljTG9jYWxpemF0aW9uLFxudXBncmFkZVN0YXR1c0xvb3BXb3JrZXIsIGxpY2Vuc2luZywgUGJ4RXh0ZW5zaW9uU3RhdHVzICovXG5cblxuY29uc3QgZXh0ZW5zaW9uTW9kdWxlcyA9IHtcblx0JGNoZWNrYm94ZXM6ICQoJy5tb2R1bGUtcm93IC5jaGVja2JveCcpLFxuXHQkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblx0JGtlZXBTZXR0aW5nc0NoZWNrYm94OiAkKCcja2VlcE1vZHVsZVNldHRpbmdzJyksXG5cdCRtb2R1bGVzVGFibGU6ICQoJyNtb2R1bGVzLXRhYmxlJyksXG5cdHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cdGNoZWNrQm94ZXM6IFtdLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXHRcdFVwZGF0ZUFwaS5nZXRNb2R1bGVzVXBkYXRlcyhleHRlbnNpb25Nb2R1bGVzLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRjaGVja2JveGVzLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdGNvbnN0IHVuaXFJZCA9ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNoZWNrQm94ZXMucHVzaChuZXcgUGJ4RXh0ZW5zaW9uU3RhdHVzKHVuaXFJZCwgZmFsc2UpKTtcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEluaXRpYWxpemUgZGF0YSB0YWJsZXMgb24gdGFibGVcblx0ICovXG5cdGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kbW9kdWxlc1RhYmxlLkRhdGFUYWJsZSh7XG5cdFx0XHRsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuXHRcdFx0cGFnaW5nOiBmYWxzZSxcblx0XHRcdGNvbHVtbnM6IFtcblx0XHRcdFx0eyBvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZSB9LFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRdLFxuXHRcdFx0Ly8gb3JkZXI6IFsxLCAnYXNjJ10sXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdH0pO1xuXHRcdCQoJy5hZGQtbmV3JykuYXBwZW5kVG8oJCgnZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDRgdC/0LjRgdC60LAg0LzQvtC00YPQu9C10Lkg0L/QvtC70YPRh9C10L3QvdGFINGBINGB0LDQudGC0LBcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYlBhcnNlTW9kdWxlVXBkYXRlcyhyZXNwb25zZSkge1xuXHRcdHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC/0L7QtNGF0L7QtNC40YIg0LvQuCDQv9C+INC90L7QvNC10YDRgyDQstC10YDRgdC40Lgg0Y3RgtC+0YIg0LzQvtC00YPQu9GMINC6INCQ0KLQoVxuXHRcdFx0Y29uc3QgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYID0gb2JqLm1pbl9wYnhfdmVyc2lvbjtcblx0XHRcdGNvbnN0IGN1cnJlbnRWZXJzaW9uUEJYID0gZXh0ZW5zaW9uTW9kdWxlcy5wYnhWZXJzaW9uO1xuXHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUoY3VycmVudFZlcnNpb25QQlgsIG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCkgPCAwKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdC8vINCY0YnQtdC8INGB0YDQtdC00Lgg0YPRgdGC0LDQvdC+0LLQu9C10L3QvdGL0YUsINC/0YDQtdC00LvQvtC20LjQvCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHRcdFx0Y29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdFx0aWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRjb25zdCBvbGRWZXIgPSAkbW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG5cdFx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5hZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCAkbmV3TW9kdWxlUm93ID0gJChgdHIubmV3LW1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdFx0XHRpZiAoJG5ld01vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0Y29uc3Qgb2xkVmVyID0gJG5ld01vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuXHRcdFx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA+IDApIHtcblx0XHRcdFx0XHRcdCRuZXdNb2R1bGVSb3cucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0JCgnYS5kb3dubG9hZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0ge307XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHQkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtdW5pcWlkJyk7XG5cdFx0XHRwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcblx0XHRcdHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuXHRcdFx0cGFyYW1zLmxpY1Byb2R1Y3RJZCA9ICRhTGluay5hdHRyKCdkYXRhLXByb2R1Y3RpZCcpO1xuXHRcdFx0cGFyYW1zLmxpY0ZlYXR1cmVJZCA9ICRhTGluay5hdHRyKCdkYXRhLWZlYXR1cmVpZCcpO1xuXHRcdFx0cGFyYW1zLmFjdGlvbiA9ICdpbnN0YWxsJztcblx0XHRcdHBhcmFtcy5hTGluayA9ICRhTGluaztcblxuXHRcdFx0bGljZW5zaW5nLmNhcHR1cmVGZWF0dXJlKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcblx0XHR9KTtcblx0XHQkKCdhLnVwZGF0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0ge307XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHQkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRwYXJhbXMubGljUHJvZHVjdElkID0gJGFMaW5rLmF0dHIoJ2RhdGEtcHJvZHVjdGlkJyk7XG5cdFx0XHRwYXJhbXMubGljRmVhdHVyZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtZmVhdHVyZWlkJyk7XG5cdFx0XHRwYXJhbXMuYWN0aW9uID0gJ3VwZGF0ZSc7XG5cdFx0XHRwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcblx0XHRcdHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignZGF0YS11bmlxaWQnKTtcblx0XHRcdHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuXHRcdFx0cGFyYW1zLmFMaW5rID0gJGFMaW5rO1xuXHRcdFx0bGljZW5zaW5nLmNhcHR1cmVGZWF0dXJlKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcblx0XHR9KTtcblx0XHQkKCdhLmRlbGV0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0JChlLnRhcmdldCkuY2xvc2VzdCgnYScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0gW107XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdpZCcpO1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5kZWxldGVNb2R1bGUocGFyYW1zKTtcblx0XHR9KTtcblx0XHQkKCdhW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuXHR9LFxuXHQvKipcblx0ICog0JTQvtCx0LDQstC70Y/QtdGCINC+0L/QuNGB0LDQvdC40LUg0LTQvtGB0YLRg9C/0L3QvtCz0L4g0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBvYmpcblx0ICovXG5cdGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuXHRcdCQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcblx0XHRsZXQgcHJvbW9MaW5rID0gJyc7XG5cdFx0aWYgKG9iai5wcm9tb19saW5rICE9PSB1bmRlZmluZWQgJiYgb2JqLnByb21vX2xpbmsgIT09IG51bGwpIHtcblx0XHRcdHByb21vTGluayA9IGA8YnI+PGEgaHJlZj1cIiR7b2JqLnByb21vX2xpbmt9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0V4dGVybmFsRGVzY3JpcHRpb259PC9hPmA7XG5cdFx0fVxuXHRcdGNvbnN0IGR5bWFuaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGlkPVwiJHtvYmoudW5pcWlkfVwiPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX08YnI+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZD4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGV2ZWxvcGVyKX08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgdmVyc2lvblwiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHRcdFx0XHRcdDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWRcIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPiBcblx0XHRcdFx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdFx0XHRcdFx0XHQ8L2E+XG4gICAgXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L3RyPmA7XG5cdFx0JCgnI25ldy1tb2R1bGVzLXRhYmxlIHRib2R5JykuYXBwZW5kKGR5bWFuaWNSb3cpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQlNC+0LHQsNCy0LvRj9C10YIg0LrQvdC+0L/QutGDINC+0LHQvdC+0LLQu9C10L3QuNGPINGB0YLQsNGA0L7QuSDQstC10YDRgdC40LggUEJYXG5cdCAqIEBwYXJhbSBvYmpcblx0ICovXG5cdGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuXHRcdGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcblx0XHRjb25zdCAkY3VycmVudFVwZGF0ZUJ1dHRvbiA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApLmZpbmQoJ2EudXBkYXRlJyk7XG5cdFx0aWYgKCRjdXJyZW50VXBkYXRlQnV0dG9uLmxlbmd0aCA+IDApIHtcblx0XHRcdGNvbnN0IG9sZFZlciA9ICRjdXJyZW50VXBkYXRlQnV0dG9uLmF0dHIoJ2RhdGEtdmVyJyk7XG5cdFx0XHRjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcblx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA8PSAwKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cdFx0JGN1cnJlbnRVcGRhdGVCdXR0b24ucmVtb3ZlKCk7XG5cdFx0Y29uc3QgZHluYW1pY0J1dHRvblxuXHRcdFx0PSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuXHRcdFx0ZGF0YS12ZXIgPVwiJHtvYmoudmVyc2lvbn1cIlxuXHRcdFx0ZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuXHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcblx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdDwvYT5gO1xuXHRcdCRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJykucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcblx0fSxcblx0LyoqXG5cdCAqINCV0YHQu9C4INGE0LjRh9CwINC30LDRhdCy0LDRh9C10L3QsCwg0L7QsdGA0LDRidCw0LXQvNGB0Y8g0Log0YHQtdGA0LLQtdGA0YNcblx0ICog0L7QsdC90L7QstC70LXQvdC40Lkg0LfQsCDQv9C+0LvRg9GH0LXQvdC40LjQtdC8INC00LjRgdGC0YDQuNCx0YPRgtC40LLQsFxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxuXHQgKi9cblx0Y2JBZnRlckxpY2Vuc2VDaGVjayhwYXJhbXMpIHtcblx0XHRVcGRhdGVBcGkuR2V0TW9kdWxlSW5zdGFsbExpbmsoXG5cdFx0XHRwYXJhbXMsXG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzLFxuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZSxcblx0XHQpO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YHQsNC50YIg0LLQtdGA0L3Rg9C7INGB0YHRi9C70LrRgyDQvdCwINC+0LHQvdC+0LLQu9C10L3QuNC1XG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlKSB7XG5cdFx0Y29uc3QgbmV3UGFyYW1zID0gcGFyYW1zO1xuXHRcdHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHRuZXdQYXJhbXMubWQ1ID0gb2JqLm1kNTtcblx0XHRcdG5ld1BhcmFtcy51cGRhdGVMaW5rID0gb2JqLmhyZWY7XG5cdFx0XHRpZiAobmV3UGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLnVwZGF0ZU1vZHVsZShuZXdQYXJhbXMpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZyByZWRvJykucmVtb3ZlQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5zdGFsbE1vZHVsZShuZXdQYXJhbXMsIGZhbHNlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCV0YHQu9C4INGB0LDQudGCINC+0YLQutCw0LfQsNC7INCyINC+0LHQvdC+0LLQu9C10L3QuNC4LCDQvdC1INC30LDRhdCy0LDRh9C10L3QsCDQvdGD0LbQvdCw0Y8g0YTQuNGH0LBcblx0ICovXG5cdGNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlKHBhcmFtcykge1xuXHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0aWYgKHBhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG5cdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLmFkZENsYXNzKCdkb3dubG9hZCcpO1xuXHRcdH1cblx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4dF9HZXRMaW5rRXJyb3IpO1xuXHR9LFxuXHQvKipcblx0ICog0KHQvdCw0YfQsNC70LAg0L7RgtC60LvRjtGH0LjQvCDQvNC+0LTRg9C70YwsINC10YHQu9C4INC/0L7Qu9GD0YfQuNGC0YHRjywg0YLQviDQvtGC0L/RgNCw0LLQuNC8INC60L7QvNCw0L3QtNGDINC90LAg0L7QsdC90L7QstC70LXQvdC40LVcblx0ICog0Lgg0L7QsdC90L7QstC40Lwg0YHRgtGA0LDQvdC40YfQutGDXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LBcblx0ICovXG5cdHVwZGF0ZU1vZHVsZShwYXJhbXMpIHtcblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INCy0LrQu9GO0YfQtdC9INC70Lgg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQstC60LvRjtGH0LXQvSwg0LLRi9GA0YPQsdC40Lwg0LXQs9C+XG5cdFx0Y29uc3Qgc3RhdHVzID0gJChgIyR7cGFyYW1zLnVuaXFpZH1gKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXHRcdGlmIChzdGF0dXMgPT09IHRydWUpIHtcblx0XHRcdFBieEFwaS5TeXN0ZW1EaXNhYmxlTW9kdWxlKHBhcmFtcy51bmlxaWQsICgpID0+IHtcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKHBhcmFtcywgdHJ1ZSk7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKHBhcmFtcywgZmFsc2UpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9C10L3QuNC1INC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gcGFyYW1zIC0g0L/QsNGA0LDQvNC10YLRgNGLINC30LDQv9GA0L7RgdCwXG5cdCAqIEBwYXJhbSBuZWVkRW5hYmxlIC0g0LLQutC70Y7Rh9C40YLRjCDQu9C4INC80L7QtNGD0LvRjCDQv9C+0YHQu9C1INGD0YHRgtCw0L3QvtCy0LrQuD9cblx0ICovXG5cdGluc3RhbGxNb2R1bGUocGFyYW1zLCBuZWVkRW5hYmxlKSB7XG5cdFx0UGJ4QXBpLlN5c3RlbURvd25sb2FkTmV3TW9kdWxlKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRpZiAocmVzcG9uc2UgPT09IHRydWUpIHtcblx0XHRcdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZShwYXJhbXMudW5pcWlkLCBuZWVkRW5hYmxlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdGlmIChwYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuXHRcdFx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIHJlZG8nKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QtdGA0LXQt9Cw0L/Rg9GB0Log0LzQvtC00YPQu9GPINC4INC/0LXRgNC10LfQsNCz0YDRg9C30LrQsCDRgdGC0YDQsNC90LjRhtGLXG5cdCAqIEBwYXJhbSB1bmlxaWQgLSBJRCDQvNC+0LTRg9C70Y9cblx0ICovXG5cdHJlbG9hZE1vZHVsZUFuZFBhZ2UodW5pcWlkKSB7XG5cdFx0UGJ4QXBpLlN5c3RlbVJlbG9hZE1vZHVsZSh1bmlxaWQpO1xuXHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG5cdH0sXG5cdC8qKlxuXHQgKiDQodC90LDRh9Cw0LvQsCDQvtGC0LrQu9GO0YfQuNC8INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0L/QvtC70YPRh9C40YLRgdGPLCDRgtC+INC+0YLQv9GA0LDQstC40Lwg0LrQvtC80LDQvdC00YMg0L3QsCDRg9C00LDQu9C10L3QuNC1XG5cdCAqINC4INC+0LHQvdC+0LLQuNC8INGB0YLRgNCw0L3QuNGH0LrRg1xuXHQgKiBAcGFyYW0gcGFyYW1zIC0g0L/QsNGA0LDQvNC10YLRgNGLINC30LDQv9GA0L7RgdCwLlxuXHQgKi9cblx0ZGVsZXRlTW9kdWxlKHBhcmFtcykge1xuXHRcdC8vIEPQv9GA0L7RgdC40Lwg0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GPINGB0L7RhdGA0LDQvdGP0YLRjCDQu9C4INC90LDRgdGC0YDQvtC50LrQuFxuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybVxuXHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0Y2xvc2FibGU6IGZhbHNlLFxuXHRcdFx0XHRvbkRlbnk6ICgpID0+IHtcblx0XHRcdFx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHQvLyDQn9GA0L7QstC10YDQuNC8INCy0LrQu9GO0YfQtdC9INC70Lgg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQstC60LvRjtGH0LXQvSwg0LLRi9GA0YPQsdC40Lwg0LXQs9C+XG5cdFx0XHRcdFx0Y29uc3Qgc3RhdHVzID0gJChgIyR7cGFyYW1zLnVuaXFpZH1gKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXHRcdFx0XHRcdGNvbnN0IGtlZXBTZXR0aW5ncyA9IGV4dGVuc2lvbk1vZHVsZXMuJGtlZXBTZXR0aW5nc0NoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0XHRcdFx0aWYgKHN0YXR1cyA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbURpc2FibGVNb2R1bGUocGFyYW1zLnVuaXFpZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtRGVsZXRlTW9kdWxlKFxuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy51bmlxaWQsXG5cdFx0XHRcdFx0XHRcdFx0a2VlcFNldHRpbmdzLFxuXHRcdFx0XHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSxcblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtRGVsZXRlTW9kdWxlKHBhcmFtcy51bmlxaWQsIGtlZXBTZXR0aW5ncywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KVxuXHRcdFx0Lm1vZGFsKCdzaG93Jyk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQutC+0LzQsNC90LTRiyB1bmluc3RhbGwg0LTQu9GPINC80L7QtNGD0LvRj1xuXHQgKiDQldGB0LvQuCDRg9GB0L/QtdGI0L3Qviwg0L/QtdGA0LXQs9GA0YPQt9C40Lwg0YHRgtGA0LDQvdC40YbRgywg0LXRgdC70Lgg0L3QtdGCLCDRgtC+INGB0L7QvtCx0YnQuNC8INC+0LEg0L7RiNC40LHQutC1XG5cdCAqIEBwYXJhbSByZXN1bHQgLSDRgNC10LfRg9C70YzRgtCw0YIg0YPQtNCw0LvQtdC90LjRjyDQvNC+0LTRg9C70Y9cblx0ICovXG5cdGNiQWZ0ZXJEZWxldGUocmVzdWx0KSB7XG5cdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRpZiAocmVzdWx0ID09PSB0cnVlKSB7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleC9gO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cdFx0XHRsZXQgZXJyb3JNZXNzYWdlID0gKHJlc3VsdC5kYXRhICE9PSB1bmRlZmluZWQpID8gcmVzdWx0LmRhdGEgOiAnJztcblx0XHRcdGVycm9yTWVzc2FnZSA9IGVycm9yTWVzc2FnZS5yZXBsYWNlKC9cXG4vZywgJzxicj4nKTtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5leHRfRGVsZXRlTW9kdWxlRXJyb3IpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqINCh0YDQsNCy0L3QtdC90LjQtSDQstC10YDRgdC40Lkg0LzQvtC00YPQu9C10Llcblx0ICogQHBhcmFtIHYxXG5cdCAqIEBwYXJhbSB2MlxuXHQgKiBAcGFyYW0gb3B0aW9uc1xuXHQgKiBAcmV0dXJucyB7bnVtYmVyfVxuXHQgKi9cblx0dmVyc2lvbkNvbXBhcmUodjEsIHYyLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgbGV4aWNvZ3JhcGhpY2FsID0gb3B0aW9ucyAmJiBvcHRpb25zLmxleGljb2dyYXBoaWNhbDtcblx0XHRjb25zdCB6ZXJvRXh0ZW5kID0gb3B0aW9ucyAmJiBvcHRpb25zLnplcm9FeHRlbmQ7XG5cdFx0bGV0IHYxcGFydHMgPSB2MS5zcGxpdCgnLicpO1xuXHRcdGxldCB2MnBhcnRzID0gdjIuc3BsaXQoJy4nKTtcblxuXHRcdGZ1bmN0aW9uIGlzVmFsaWRQYXJ0KHgpIHtcblx0XHRcdHJldHVybiAobGV4aWNvZ3JhcGhpY2FsID8gL15cXGQrW0EtWmEtel0qJC8gOiAvXlxcZCskLykudGVzdCh4KTtcblx0XHR9XG5cblx0XHRpZiAoIXYxcGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpIHx8ICF2MnBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSkge1xuXHRcdFx0cmV0dXJuIE5hTjtcblx0XHR9XG5cblx0XHRpZiAoemVyb0V4dGVuZCkge1xuXHRcdFx0d2hpbGUgKHYxcGFydHMubGVuZ3RoIDwgdjJwYXJ0cy5sZW5ndGgpIHYxcGFydHMucHVzaCgnMCcpO1xuXHRcdFx0d2hpbGUgKHYycGFydHMubGVuZ3RoIDwgdjFwYXJ0cy5sZW5ndGgpIHYycGFydHMucHVzaCgnMCcpO1xuXHRcdH1cblxuXHRcdGlmICghbGV4aWNvZ3JhcGhpY2FsKSB7XG5cdFx0XHR2MXBhcnRzID0gdjFwYXJ0cy5tYXAoTnVtYmVyKTtcblx0XHRcdHYycGFydHMgPSB2MnBhcnRzLm1hcChOdW1iZXIpO1xuXHRcdH1cblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdjFwYXJ0cy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0aWYgKHYycGFydHMubGVuZ3RoID09PSBpKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHYxcGFydHNbaV0gPT09IHYycGFydHNbaV0pIHtcblx0XHRcdFx0Ly9cblx0XHRcdH0gZWxzZSBpZiAodjFwYXJ0c1tpXSA+IHYycGFydHNbaV0pIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHYxcGFydHMubGVuZ3RoICE9PSB2MnBhcnRzLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblxuXHRcdHJldHVybiAwO1xuXHR9LFxuXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=