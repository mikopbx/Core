"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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
      } else {
        UserMessage.showMultiString(globalTranslate.ext_NoLicenseAvailable);
      }

      $('a.button').removeClass('disabled');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsIlBieEFwaSIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImNiQWZ0ZXJMaWNlbnNlQ2hlY2siLCJkZWxldGVNb2R1bGUiLCJwb3B1cCIsInNob3ciLCJwcm9tb0xpbmsiLCJwcm9tb19saW5rIiwidW5kZWZpbmVkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJkeW1hbmljUm93IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibmFtZSIsImRlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwiZXh0X0luc3RhbGxNb2R1bGUiLCJsaWNfcHJvZHVjdF9pZCIsImxpY19mZWF0dXJlX2lkIiwicmVsZWFzZV9pZCIsImFwcGVuZCIsIiRjdXJyZW50VXBkYXRlQnV0dG9uIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwicmVzdWx0IiwiR2V0TW9kdWxlSW5zdGFsbExpbmsiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyIsImNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfTm9MaWNlbnNlQXZhaWxhYmxlIiwibmV3UGFyYW1zIiwibWQ1IiwidXBkYXRlTGluayIsImhyZWYiLCJ1cGRhdGVNb2R1bGUiLCJpbnN0YWxsTW9kdWxlIiwiZXh0X0dldExpbmtFcnJvciIsInN0YXR1cyIsImNoZWNrYm94IiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsIm5lZWRFbmFibGUiLCJGaWxlc0Rvd25sb2FkTmV3TW9kdWxlIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJtZXNzYWdlcyIsImV4dF9JbnN0YWxsYXRpb25FcnJvciIsInJlbG9hZE1vZHVsZUFuZFBhZ2UiLCJTeXN0ZW1SZWxvYWRNb2R1bGUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImtlZXBTZXR0aW5ncyIsIlN5c3RlbURlbGV0ZU1vZHVsZSIsImNiQWZ0ZXJEZWxldGUiLCJlcnJvck1lc3NhZ2UiLCJkYXRhIiwiZXh0X0RlbGV0ZU1vZHVsZUVycm9yIiwidjEiLCJ2MiIsIm9wdGlvbnMiLCJsZXhpY29ncmFwaGljYWwiLCJ6ZXJvRXh0ZW5kIiwidjFwYXJ0cyIsInNwbGl0IiwidjJwYXJ0cyIsImlzVmFsaWRQYXJ0IiwieCIsInRlc3QiLCJldmVyeSIsIk5hTiIsIm1hcCIsIk51bWJlciIsImkiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBR0EsSUFBTUEsZ0JBQWdCLEdBQUc7QUFDeEJDLEVBQUFBLFdBQVcsRUFBRUMsQ0FBQyxDQUFDLHVCQUFELENBRFU7QUFFeEJDLEVBQUFBLGdCQUFnQixFQUFFRCxDQUFDLENBQUMsb0JBQUQsQ0FGSztBQUd4QkUsRUFBQUEscUJBQXFCLEVBQUVGLENBQUMsQ0FBQyxxQkFBRCxDQUhBO0FBSXhCRyxFQUFBQSxhQUFhLEVBQUVILENBQUMsQ0FBQyxnQkFBRCxDQUpRO0FBS3hCSSxFQUFBQSxVQUFVLEVBQUVDLGdCQUFnQixDQUFDQyxPQUFqQixDQUF5QixPQUF6QixFQUFrQyxFQUFsQyxDQUxZO0FBTXhCQyxFQUFBQSxVQUFVLEVBQUUsRUFOWTtBQU94QkMsRUFBQUEsVUFQd0I7QUFBQSwwQkFPWDtBQUNaVixNQUFBQSxnQkFBZ0IsQ0FBQ0csZ0JBQWpCLENBQWtDUSxLQUFsQztBQUNBWCxNQUFBQSxnQkFBZ0IsQ0FBQ1ksbUJBQWpCO0FBQ0FDLE1BQUFBLFNBQVMsQ0FBQ0MsaUJBQVYsQ0FBNEJkLGdCQUFnQixDQUFDZSxvQkFBN0M7QUFDQWYsTUFBQUEsZ0JBQWdCLENBQUNDLFdBQWpCLENBQTZCZSxJQUE3QixDQUFrQyxVQUFDQyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDakQsWUFB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USxHQUFSLENBQVlDLE1BQVosQ0FBVjtBQUNBUCxRQUFBQSxPQUFPLEdBQUdBLE9BQU8sQ0FBQ00sR0FBUixDQUFZQyxNQUFaLENBQVY7QUFDQTs7QUFFRCxXQUFLLElBQUlDLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdWLE9BQU8sQ0FBQzNGLE1BQTVCLEVBQW9DcUcsQ0FBQyxJQUFJLENBQXpDLEVBQTRDO0FBQzNDLFlBQUlSLE9BQU8sQ0FBQzdGLE1BQVIsS0FBbUJxRyxDQUF2QixFQUEwQjtBQUN6QixpQkFBTyxDQUFQO0FBQ0E7O0FBQ0QsWUFBSVYsT0FBTyxDQUFDVSxDQUFELENBQVAsS0FBZVIsT0FBTyxDQUFDUSxDQUFELENBQTFCLEVBQStCLENBQzlCO0FBQ0EsU0FGRCxNQUVPLElBQUlWLE9BQU8sQ0FBQ1UsQ0FBRCxDQUFQLEdBQWFSLE9BQU8sQ0FBQ1EsQ0FBRCxDQUF4QixFQUE2QjtBQUNuQyxpQkFBTyxDQUFQO0FBQ0EsU0FGTSxNQUVBO0FBQ04saUJBQU8sQ0FBQyxDQUFSO0FBQ0E7QUFDRDs7QUFFRCxVQUFJVixPQUFPLENBQUMzRixNQUFSLEtBQW1CNkYsT0FBTyxDQUFDN0YsTUFBL0IsRUFBdUM7QUFDdEMsZUFBTyxDQUFDLENBQVI7QUFDQTs7QUFFRCxhQUFPLENBQVA7QUFDQTs7QUF0WHVCO0FBQUE7QUFBQSxDQUF6QjtBQTBYQXpDLENBQUMsQ0FBQytJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJsSixFQUFBQSxnQkFBZ0IsQ0FBQ1UsVUFBakI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgVXBkYXRlQXBpLCBVc2VyTWVzc2FnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgU2VtYW50aWNMb2NhbGl6YXRpb24sIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLCBQYnhFeHRlbnNpb25TdGF0dXMgKi9cblxuXG5jb25zdCBleHRlbnNpb25Nb2R1bGVzID0ge1xuXHQkY2hlY2tib3hlczogJCgnLm1vZHVsZS1yb3cgLmNoZWNrYm94JyksXG5cdCRkZWxldGVNb2RhbEZvcm06ICQoJyNkZWxldGUtbW9kYWwtZm9ybScpLFxuXHQka2VlcFNldHRpbmdzQ2hlY2tib3g6ICQoJyNrZWVwTW9kdWxlU2V0dGluZ3MnKSxcblx0JG1vZHVsZXNUYWJsZTogJCgnI21vZHVsZXMtdGFibGUnKSxcblx0cGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblx0Y2hlY2tCb3hlczogW10sXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kZGVsZXRlTW9kYWxGb3JtLm1vZGFsKCk7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG5cdFx0VXBkYXRlQXBpLmdldE1vZHVsZXNVcGRhdGVzKGV4dGVuc2lvbk1vZHVsZXMuY2JQYXJzZU1vZHVsZVVwZGF0ZXMpO1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJGNoZWNrYm94ZXMuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0Y29uc3QgdW5pcUlkID0gJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHRcdGNvbnN0IHBhZ2VTdGF0dXMgPSBuZXcgUGJ4RXh0ZW5zaW9uU3RhdHVzKCk7XG5cdFx0XHRwYWdlU3RhdHVzLmluaXRpYWxpemUodW5pcUlkLCBmYWxzZSk7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNoZWNrQm94ZXMucHVzaChwYWdlU3RhdHVzKTtcblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqIEluaXRpYWxpemUgZGF0YSB0YWJsZXMgb24gdGFibGVcblx0ICovXG5cdGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kbW9kdWxlc1RhYmxlLkRhdGFUYWJsZSh7XG5cdFx0XHRsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuXHRcdFx0cGFnaW5nOiBmYWxzZSxcblx0XHRcdGNvbHVtbnM6IFtcblx0XHRcdFx0eyBvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZSB9LFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRdLFxuXHRcdFx0Ly8gb3JkZXI6IFsxLCAnYXNjJ10sXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdH0pO1xuXHRcdCQoJy5hZGQtbmV3JykuYXBwZW5kVG8oJCgnZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0LrQsCDRgdC/0LjRgdC60LAg0LzQvtC00YPQu9C10Lkg0L/QvtC70YPRh9C10L3QvdGFINGBINGB0LDQudGC0LBcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYlBhcnNlTW9kdWxlVXBkYXRlcyhyZXNwb25zZSkge1xuXHRcdHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHQvLyDQn9GA0L7QstC10YDQuNC8INC/0L7QtNGF0L7QtNC40YIg0LvQuCDQv9C+INC90L7QvNC10YDRgyDQstC10YDRgdC40Lgg0Y3RgtC+0YIg0LzQvtC00YPQu9GMINC6INCQ0KLQoVxuXHRcdFx0Y29uc3QgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYID0gb2JqLm1pbl9wYnhfdmVyc2lvbjtcblx0XHRcdGNvbnN0IGN1cnJlbnRWZXJzaW9uUEJYID0gZXh0ZW5zaW9uTW9kdWxlcy5wYnhWZXJzaW9uO1xuXHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUoY3VycmVudFZlcnNpb25QQlgsIG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCkgPCAwKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdC8vINCY0YnQtdC8INGB0YDQtdC00Lgg0YPRgdGC0LDQvdC+0LLQu9C10L3QvdGL0YUsINC/0YDQtdC00LvQvtC20LjQvCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHRcdFx0Y29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdFx0aWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRjb25zdCBvbGRWZXIgPSAkbW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG5cdFx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5hZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb25zdCAkbmV3TW9kdWxlUm93ID0gJChgdHIubmV3LW1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdFx0XHRpZiAoJG5ld01vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0Y29uc3Qgb2xkVmVyID0gJG5ld01vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuXHRcdFx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA+IDApIHtcblx0XHRcdFx0XHRcdCRuZXdNb2R1bGVSb3cucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0JCgnYS5kb3dubG9hZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0ge307XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHQkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtdW5pcWlkJyk7XG5cdFx0XHRwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcblx0XHRcdHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuXHRcdFx0cGFyYW1zLmxpY1Byb2R1Y3RJZCA9ICRhTGluay5hdHRyKCdkYXRhLXByb2R1Y3RpZCcpO1xuXHRcdFx0cGFyYW1zLmxpY0ZlYXR1cmVJZCA9ICRhTGluay5hdHRyKCdkYXRhLWZlYXR1cmVpZCcpO1xuXHRcdFx0cGFyYW1zLmFjdGlvbiA9ICdpbnN0YWxsJztcblx0XHRcdHBhcmFtcy5hTGluayA9ICRhTGluaztcblxuXHRcdFx0UGJ4QXBpLkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckxpY2Vuc2VDaGVjayk7XG5cdFx0fSk7XG5cdFx0JCgnYS51cGRhdGUnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHt9O1xuXHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuXHRcdFx0JGFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0cGFyYW1zLmxpY1Byb2R1Y3RJZCA9ICRhTGluay5hdHRyKCdkYXRhLXByb2R1Y3RpZCcpO1xuXHRcdFx0cGFyYW1zLmxpY0ZlYXR1cmVJZCA9ICRhTGluay5hdHRyKCdkYXRhLWZlYXR1cmVpZCcpO1xuXHRcdFx0cGFyYW1zLmFjdGlvbiA9ICd1cGRhdGUnO1xuXHRcdFx0cGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtdW5pcWlkJyk7XG5cdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdHBhcmFtcy5hTGluayA9ICRhTGluaztcblx0XHRcdFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuXHRcdH0pO1xuXHRcdCQoJ2EuZGVsZXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHQkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSBbXTtcblx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJyk7XG5cdFx0XHRwYXJhbXMudW5pcWlkID0gJGFMaW5rLmF0dHIoJ2lkJyk7XG5cdFx0XHRleHRlbnNpb25Nb2R1bGVzLmRlbGV0ZU1vZHVsZShwYXJhbXMpO1xuXHRcdH0pO1xuXHRcdCQoJ2FbZGF0YS1jb250ZW50XScpLnBvcHVwKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQlNC+0LHQsNCy0LvRj9C10YIg0L7Qv9C40YHQsNC90LjQtSDQtNC+0YHRgtGD0L/QvdC+0LPQviDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIG9ialxuXHQgKi9cblx0YWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKSB7XG5cdFx0JCgnI29ubGluZS11cGRhdGVzLWJsb2NrJykuc2hvdygpO1xuXHRcdGxldCBwcm9tb0xpbmsgPSAnJztcblx0XHRpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuXHRcdFx0cHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcblx0XHR9XG5cdFx0Y29uc3QgZHltYW5pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgaWQ9XCIke29iai51bmlxaWR9XCI+XG5cdFx0XHRcdFx0XHQ8dGQ+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pfSAke3Byb21vTGlua308L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L3RkPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiBkb3dubG9hZFwiIFxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1jb250ZW50PSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXVuaXFpZCA9IFwiJHtvYmoudW5pcWlkfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtcHJvZHVjdElkID0gXCIke29iai5saWNfcHJvZHVjdF9pZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1mZWF0dXJlSWQgPSBcIiR7b2JqLmxpY19mZWF0dXJlX2lkfVwiIFxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1pZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuXHRcdFx0XHRcdFx0XHRcdFx0PGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+IFxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0XHRcdFx0XHRcdDwvYT5cbiAgICBcdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvdHI+YDtcblx0XHQkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHltYW5pY1Jvdyk7XG5cdH0sXG5cblx0LyoqXG5cdCAqINCU0L7QsdCw0LLQu9GP0LXRgiDQutC90L7Qv9C60YMg0L7QsdC90L7QstC70LXQvdC40Y8g0YHRgtCw0YDQvtC5INCy0LXRgNGB0LjQuCBQQlhcblx0ICogQHBhcmFtIG9ialxuXHQgKi9cblx0YWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKSB7XG5cdFx0Y29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApO1xuXHRcdGNvbnN0ICRjdXJyZW50VXBkYXRlQnV0dG9uID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCkuZmluZCgnYS51cGRhdGUnKTtcblx0XHRpZiAoJGN1cnJlbnRVcGRhdGVCdXR0b24ubGVuZ3RoID4gMCkge1xuXHRcdFx0Y29uc3Qgb2xkVmVyID0gJGN1cnJlbnRVcGRhdGVCdXR0b24uYXR0cignZGF0YS12ZXInKTtcblx0XHRcdGNvbnN0IG5ld1ZlciA9IG9iai52ZXJzaW9uO1xuXHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpIDw9IDApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblx0XHQkY3VycmVudFVwZGF0ZUJ1dHRvbi5yZW1vdmUoKTtcblx0XHRjb25zdCBkeW5hbWljQnV0dG9uXG5cdFx0XHQ9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYnV0dG9uIHVwZGF0ZSBwb3B1cGVkXCIgXG5cdFx0XHRkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlfVwiXG5cdFx0XHRkYXRhLXZlciA9XCIke29iai52ZXJzaW9ufVwiXG5cdFx0XHRkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG5cdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+IFxuXHRcdFx0PHNwYW4gY2xhc3M9XCJwZXJjZW50XCI+PC9zcGFuPlxuXHRcdFx0PC9hPmA7XG5cdFx0JG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YTQuNGH0LAg0LfQsNGF0LLQsNGH0LXQvdCwLCDQvtCx0YDQsNGJ0LDQtdC80YHRjyDQuiDRgdC10YDQstC10YDRg1xuXHQgKiDQvtCx0L3QvtCy0LvQtdC90LjQuSDQt9CwINC/0L7Qu9GD0YfQtdC90LjQuNC10Lwg0LTQuNGB0YLRgNC40LHRg9GC0LjQstCwXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIHJlc3VsdFxuXHQgKi9cblx0Y2JBZnRlckxpY2Vuc2VDaGVjayhwYXJhbXMsIHJlc3VsdCkge1xuXHRcdGlmIChyZXN1bHQ9PT10cnVlKXtcblx0XHRcdFVwZGF0ZUFwaS5HZXRNb2R1bGVJbnN0YWxsTGluayhcblx0XHRcdFx0cGFyYW1zLFxuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtTdWNjZXNzLFxuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlLFxuXHRcdFx0KTtcblx0XHR9IGVsc2UgaWYgKHJlc3VsdD09PWZhbHNlICYmIHBhcmFtcy5sZW5ndGggPiAwKXtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Ob0xpY2Vuc2VBdmFpbGFibGUpO1xuXHRcdH1cblx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHR9LFxuXHQvKipcblx0ICog0JXRgdC70Lgg0YHQsNC50YIg0LLQtdGA0L3Rg9C7INGB0YHRi9C70LrRgyDQvdCwINC+0LHQvdC+0LLQu9C10L3QuNC1XG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIHJlc3BvbnNlXG5cdCAqL1xuXHRjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyhwYXJhbXMsIHJlc3BvbnNlKSB7XG5cdFx0Y29uc3QgbmV3UGFyYW1zID0gcGFyYW1zO1xuXHRcdHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG5cdFx0XHRuZXdQYXJhbXMubWQ1ID0gb2JqLm1kNTtcblx0XHRcdG5ld1BhcmFtcy51cGRhdGVMaW5rID0gb2JqLmhyZWY7XG5cdFx0XHRpZiAobmV3UGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLnVwZGF0ZU1vZHVsZShuZXdQYXJhbXMpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5hZGRDbGFzcygnbG9hZGluZyByZWRvJykucmVtb3ZlQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5zdGFsbE1vZHVsZShuZXdQYXJhbXMsIGZhbHNlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCV0YHQu9C4INGB0LDQudGCINC+0YLQutCw0LfQsNC7INCyINC+0LHQvdC+0LLQu9C10L3QuNC4LCDQvdC1INC30LDRhdCy0LDRh9C10L3QsCDQvdGD0LbQvdCw0Y8g0YTQuNGH0LBcblx0ICovXG5cdGNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlKHBhcmFtcykge1xuXHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0aWYgKHBhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG5cdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLmFkZENsYXNzKCdkb3dubG9hZCcpO1xuXHRcdH1cblx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9HZXRMaW5rRXJyb3IpO1xuXHR9LFxuXHQvKipcblx0ICog0KHQvdCw0YfQsNC70LAg0L7RgtC60LvRjtGH0LjQvCDQvNC+0LTRg9C70YwsINC10YHQu9C4INC/0L7Qu9GD0YfQuNGC0YHRjywg0YLQviDQvtGC0L/RgNCw0LLQuNC8INC60L7QvNCw0L3QtNGDINC90LAg0L7QsdC90L7QstC70LXQvdC40LVcblx0ICog0Lgg0L7QsdC90L7QstC40Lwg0YHRgtGA0LDQvdC40YfQutGDXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LBcblx0ICovXG5cdHVwZGF0ZU1vZHVsZShwYXJhbXMpIHtcblx0XHQvLyDQn9GA0L7QstC10YDQuNC8INCy0LrQu9GO0YfQtdC9INC70Lgg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQstC60LvRjtGH0LXQvSwg0LLRi9GA0YPQsdC40Lwg0LXQs9C+XG5cdFx0Y29uc3Qgc3RhdHVzID0gJChgIyR7cGFyYW1zLnVuaXFpZH1gKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXHRcdGlmIChzdGF0dXMgPT09IHRydWUpIHtcblx0XHRcdFBieEFwaS5TeXN0ZW1EaXNhYmxlTW9kdWxlKHBhcmFtcy51bmlxaWQsICgpID0+IHtcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKHBhcmFtcywgdHJ1ZSk7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5pbnN0YWxsTW9kdWxlKHBhcmFtcywgZmFsc2UpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9C10L3QuNC1INC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gcGFyYW1zIC0g0L/QsNGA0LDQvNC10YLRgNGLINC30LDQv9GA0L7RgdCwXG5cdCAqIEBwYXJhbSBuZWVkRW5hYmxlIC0g0LLQutC70Y7Rh9C40YLRjCDQu9C4INC80L7QtNGD0LvRjCDQv9C+0YHQu9C1INGD0YHRgtCw0L3QvtCy0LrQuD9cblx0ICovXG5cdGluc3RhbGxNb2R1bGUocGFyYW1zLCBuZWVkRW5hYmxlKSB7XG5cdFx0UGJ4QXBpLkZpbGVzRG93bmxvYWROZXdNb2R1bGUocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcblx0XHRcdGlmIChyZXNwb25zZSA9PT0gdHJ1ZSkge1xuXHRcdFx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKHBhcmFtcy51bmlxaWQsIG5lZWRFbmFibGUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aWYgKHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCf0LXRgNC10LfQsNC/0YPRgdC6INC80L7QtNGD0LvRjyDQuCDQv9C10YDQtdC30LDQs9GA0YPQt9C60LAg0YHRgtGA0LDQvdC40YbRi1xuXHQgKiBAcGFyYW0gdW5pcWlkIC0gSUQg0LzQvtC00YPQu9GPXG5cdCAqL1xuXHRyZWxvYWRNb2R1bGVBbmRQYWdlKHVuaXFpZCkge1xuXHRcdFBieEFwaS5TeXN0ZW1SZWxvYWRNb2R1bGUodW5pcWlkKTtcblx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleC9gO1xuXHR9LFxuXHQvKipcblx0ICog0KHQvdCw0YfQsNC70LAg0L7RgtC60LvRjtGH0LjQvCDQvNC+0LTRg9C70YwsINC10YHQu9C4INC/0L7Qu9GD0YfQuNGC0YHRjywg0YLQviDQvtGC0L/RgNCw0LLQuNC8INC60L7QvNCw0L3QtNGDINC90LAg0YPQtNCw0LvQtdC90LjQtVxuXHQgKiDQuCDQvtCx0L3QvtCy0LjQvCDRgdGC0YDQsNC90LjRh9C60YNcblx0ICogQHBhcmFtIHBhcmFtcyAtINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsC5cblx0ICovXG5cdGRlbGV0ZU1vZHVsZShwYXJhbXMpIHtcblx0XHQvLyBD0L/RgNC+0YHQuNC8INC/0L7Qu9GM0LfQvtCy0LDRgtC10LvRjyDRgdC+0YXRgNCw0L3Rj9GC0Ywg0LvQuCDQvdCw0YHRgtGA0L7QudC60Lhcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm1cblx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0b25EZW55OiAoKSA9PiB7XG5cdFx0XHRcdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25BcHByb3ZlOiAoKSA9PiB7XG5cdFx0XHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQstC60LvRjtGH0LXQvSDQu9C4INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0LLQutC70Y7Rh9C10L0sINCy0YvRgNGD0LHQuNC8INC10LPQvlxuXHRcdFx0XHRcdGNvbnN0IHN0YXR1cyA9ICQoYCMke3BhcmFtcy51bmlxaWR9YCkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRcdFx0XHRjb25zdCBrZWVwU2V0dGluZ3MgPSBleHRlbnNpb25Nb2R1bGVzLiRrZWVwU2V0dGluZ3NDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXHRcdFx0XHRcdGlmIChzdGF0dXMgPT09IHRydWUpIHtcblx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EaXNhYmxlTW9kdWxlKHBhcmFtcy51bmlxaWQsICgpID0+IHtcblx0XHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbURlbGV0ZU1vZHVsZShcblx0XHRcdFx0XHRcdFx0XHRwYXJhbXMudW5pcWlkLFxuXHRcdFx0XHRcdFx0XHRcdGtlZXBTZXR0aW5ncyxcblx0XHRcdFx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUsXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbURlbGV0ZU1vZHVsZShwYXJhbXMudW5pcWlkLCBrZWVwU2V0dGluZ3MsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSlcblx0XHRcdC5tb2RhbCgnc2hvdycpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLRh9C40Log0LrQvtC80LDQvdC00YsgdW5pbnN0YWxsINC00LvRjyDQvNC+0LTRg9C70Y9cblx0ICog0JXRgdC70Lgg0YPRgdC/0LXRiNC90L4sINC/0LXRgNC10LPRgNGD0LfQuNC8INGB0YLRgNCw0L3QuNGG0YMsINC10YHQu9C4INC90LXRgiwg0YLQviDRgdC+0L7QsdGJ0LjQvCDQvtCxINC+0YjQuNCx0LrQtVxuXHQgKiBAcGFyYW0gcmVzdWx0IC0g0YDQtdC30YPQu9GM0YLQsNGCINGD0LTQsNC70LXQvdC40Y8g0LzQvtC00YPQu9GPXG5cdCAqL1xuXHRjYkFmdGVyRGVsZXRlKHJlc3VsdCkge1xuXHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0aWYgKHJlc3VsdCA9PT0gdHJ1ZSkge1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgvYDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCgnLnVpLm1lc3NhZ2UuYWpheCcpLnJlbW92ZSgpO1xuXHRcdFx0bGV0IGVycm9yTWVzc2FnZSA9IChyZXN1bHQuZGF0YSAhPT0gdW5kZWZpbmVkKSA/IHJlc3VsdC5kYXRhIDogJyc7XG5cdFx0XHRlcnJvck1lc3NhZ2UgPSBlcnJvck1lc3NhZ2UucmVwbGFjZSgvXFxuL2csICc8YnI+Jyk7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0RlbGV0ZU1vZHVsZUVycm9yKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQodGA0LDQstC90LXQvdC40LUg0LLQtdGA0YHQuNC5INC80L7QtNGD0LvQtdC5XG5cdCAqIEBwYXJhbSB2MVxuXHQgKiBAcGFyYW0gdjJcblx0ICogQHBhcmFtIG9wdGlvbnNcblx0ICogQHJldHVybnMge251bWJlcn1cblx0ICovXG5cdHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuXHRcdGNvbnN0IGxleGljb2dyYXBoaWNhbCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5sZXhpY29ncmFwaGljYWw7XG5cdFx0Y29uc3QgemVyb0V4dGVuZCA9IG9wdGlvbnMgJiYgb3B0aW9ucy56ZXJvRXh0ZW5kO1xuXHRcdGxldCB2MXBhcnRzID0gdjEuc3BsaXQoJy4nKTtcblx0XHRsZXQgdjJwYXJ0cyA9IHYyLnNwbGl0KCcuJyk7XG5cblx0XHRmdW5jdGlvbiBpc1ZhbGlkUGFydCh4KSB7XG5cdFx0XHRyZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXpdKiQvIDogL15cXGQrJC8pLnRlc3QoeCk7XG5cdFx0fVxuXG5cdFx0aWYgKCF2MXBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSB8fCAhdjJwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkpIHtcblx0XHRcdHJldHVybiBOYU47XG5cdFx0fVxuXG5cdFx0aWYgKHplcm9FeHRlbmQpIHtcblx0XHRcdHdoaWxlICh2MXBhcnRzLmxlbmd0aCA8IHYycGFydHMubGVuZ3RoKSB2MXBhcnRzLnB1c2goJzAnKTtcblx0XHRcdHdoaWxlICh2MnBhcnRzLmxlbmd0aCA8IHYxcGFydHMubGVuZ3RoKSB2MnBhcnRzLnB1c2goJzAnKTtcblx0XHR9XG5cblx0XHRpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuXHRcdFx0djFwYXJ0cyA9IHYxcGFydHMubWFwKE51bWJlcik7XG5cdFx0XHR2MnBhcnRzID0gdjJwYXJ0cy5tYXAoTnVtYmVyKTtcblx0XHR9XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHYxcGFydHMubGVuZ3RoOyBpICs9IDEpIHtcblx0XHRcdGlmICh2MnBhcnRzLmxlbmd0aCA9PT0gaSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblx0XHRcdGlmICh2MXBhcnRzW2ldID09PSB2MnBhcnRzW2ldKSB7XG5cdFx0XHRcdC8vXG5cdFx0XHR9IGVsc2UgaWYgKHYxcGFydHNbaV0gPiB2MnBhcnRzW2ldKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIC0xO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcblx0XHRcdHJldHVybiAtMTtcblx0XHR9XG5cblx0XHRyZXR1cm4gMDtcblx0fSxcblxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemUoKTtcbn0pO1xuIl19