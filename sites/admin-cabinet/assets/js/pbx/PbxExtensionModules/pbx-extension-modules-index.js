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
      PbxApi.SystemDownloadNewModule(params, function (response) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsIlBieEFwaSIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImNiQWZ0ZXJMaWNlbnNlQ2hlY2siLCJkZWxldGVNb2R1bGUiLCJwb3B1cCIsInNob3ciLCJwcm9tb0xpbmsiLCJwcm9tb19saW5rIiwidW5kZWZpbmVkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJkeW1hbmljUm93IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibmFtZSIsImRlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwiZXh0X0luc3RhbGxNb2R1bGUiLCJsaWNfcHJvZHVjdF9pZCIsImxpY19mZWF0dXJlX2lkIiwicmVsZWFzZV9pZCIsImFwcGVuZCIsIiRjdXJyZW50VXBkYXRlQnV0dG9uIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwicmVzdWx0IiwiR2V0TW9kdWxlSW5zdGFsbExpbmsiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyIsImNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfTm9MaWNlbnNlQXZhaWxhYmxlIiwibmV3UGFyYW1zIiwibWQ1IiwidXBkYXRlTGluayIsImhyZWYiLCJ1cGRhdGVNb2R1bGUiLCJpbnN0YWxsTW9kdWxlIiwiZXh0X0dldExpbmtFcnJvciIsInN0YXR1cyIsImNoZWNrYm94IiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsIm5lZWRFbmFibGUiLCJTeXN0ZW1Eb3dubG9hZE5ld01vZHVsZSIsInVwZ3JhZGVTdGF0dXNMb29wV29ya2VyIiwibWVzc2FnZXMiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiLCJyZWxvYWRNb2R1bGVBbmRQYWdlIiwiU3lzdGVtUmVsb2FkTW9kdWxlIiwid2luZG93IiwibG9jYXRpb24iLCJnbG9iYWxSb290VXJsIiwiY2xvc2FibGUiLCJvbkRlbnkiLCJvbkFwcHJvdmUiLCJrZWVwU2V0dGluZ3MiLCJTeXN0ZW1EZWxldGVNb2R1bGUiLCJjYkFmdGVyRGVsZXRlIiwiZXJyb3JNZXNzYWdlIiwiZGF0YSIsImV4dF9EZWxldGVNb2R1bGVFcnJvciIsInYxIiwidjIiLCJvcHRpb25zIiwibGV4aWNvZ3JhcGhpY2FsIiwiemVyb0V4dGVuZCIsInYxcGFydHMiLCJzcGxpdCIsInYycGFydHMiLCJpc1ZhbGlkUGFydCIsIngiLCJ0ZXN0IiwiZXZlcnkiLCJOYU4iLCJtYXAiLCJOdW1iZXIiLCJpIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTtBQUdBLElBQU1BLGdCQUFnQixHQUFHO0FBQ3hCQyxFQUFBQSxXQUFXLEVBQUVDLENBQUMsQ0FBQyx1QkFBRCxDQURVO0FBRXhCQyxFQUFBQSxnQkFBZ0IsRUFBRUQsQ0FBQyxDQUFDLG9CQUFELENBRks7QUFHeEJFLEVBQUFBLHFCQUFxQixFQUFFRixDQUFDLENBQUMscUJBQUQsQ0FIQTtBQUl4QkcsRUFBQUEsYUFBYSxFQUFFSCxDQUFDLENBQUMsZ0JBQUQsQ0FKUTtBQUt4QkksRUFBQUEsVUFBVSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FMWTtBQU14QkMsRUFBQUEsVUFBVSxFQUFFLEVBTlk7QUFPeEJDLEVBQUFBLFVBUHdCO0FBQUEsMEJBT1g7QUFDWlYsTUFBQUEsZ0JBQWdCLENBQUNHLGdCQUFqQixDQUFrQ1EsS0FBbEM7QUFDQVgsTUFBQUEsZ0JBQWdCLENBQUNZLG1CQUFqQjtBQUNBQyxNQUFBQSxTQUFTLENBQUNDLGlCQUFWLENBQTRCZCxnQkFBZ0IsQ0FBQ2Usb0JBQTdDO0FBQ0FmLE1BQUFBLGdCQUFnQixDQUFDQyxXQUFqQixDQUE2QmUsSUFBN0IsQ0FBa0MsVUFBQ0MsS0FBRCxFQUFRQyxHQUFSLEVBQWdCO0FBQ2pELFlB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Q1EsR0FBUixDQUFZQyxNQUFaLENBQVY7QUFDQVAsUUFBQUEsT0FBTyxHQUFHQSxPQUFPLENBQUNNLEdBQVIsQ0FBWUMsTUFBWixDQUFWO0FBQ0E7O0FBRUQsV0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHVixPQUFPLENBQUMzRixNQUE1QixFQUFvQ3FHLENBQUMsSUFBSSxDQUF6QyxFQUE0QztBQUMzQyxZQUFJUixPQUFPLENBQUM3RixNQUFSLEtBQW1CcUcsQ0FBdkIsRUFBMEI7QUFDekIsaUJBQU8sQ0FBUDtBQUNBOztBQUNELFlBQUlWLE9BQU8sQ0FBQ1UsQ0FBRCxDQUFQLEtBQWVSLE9BQU8sQ0FBQ1EsQ0FBRCxDQUExQixFQUErQixDQUM5QjtBQUNBLFNBRkQsTUFFTyxJQUFJVixPQUFPLENBQUNVLENBQUQsQ0FBUCxHQUFhUixPQUFPLENBQUNRLENBQUQsQ0FBeEIsRUFBNkI7QUFDbkMsaUJBQU8sQ0FBUDtBQUNBLFNBRk0sTUFFQTtBQUNOLGlCQUFPLENBQUMsQ0FBUjtBQUNBO0FBQ0Q7O0FBRUQsVUFBSVYsT0FBTyxDQUFDM0YsTUFBUixLQUFtQjZGLE9BQU8sQ0FBQzdGLE1BQS9CLEVBQXVDO0FBQ3RDLGVBQU8sQ0FBQyxDQUFSO0FBQ0E7O0FBRUQsYUFBTyxDQUFQO0FBQ0E7O0FBdFh1QjtBQUFBO0FBQUEsQ0FBekI7QUEwWEF6QyxDQUFDLENBQUMrSSxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCbEosRUFBQUEsZ0JBQWdCLENBQUNVLFVBQWpCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVwZGF0ZUFwaSwgVXNlck1lc3NhZ2UsIGdsb2JhbFBCWFZlcnNpb24sIFNlbWFudGljTG9jYWxpemF0aW9uLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciwgUGJ4RXh0ZW5zaW9uU3RhdHVzICovXG5cblxuY29uc3QgZXh0ZW5zaW9uTW9kdWxlcyA9IHtcblx0JGNoZWNrYm94ZXM6ICQoJy5tb2R1bGUtcm93IC5jaGVja2JveCcpLFxuXHQkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblx0JGtlZXBTZXR0aW5nc0NoZWNrYm94OiAkKCcja2VlcE1vZHVsZVNldHRpbmdzJyksXG5cdCRtb2R1bGVzVGFibGU6ICQoJyNtb2R1bGVzLXRhYmxlJyksXG5cdHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cdGNoZWNrQm94ZXM6IFtdLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuXHRcdFVwZGF0ZUFwaS5nZXRNb2R1bGVzVXBkYXRlcyhleHRlbnNpb25Nb2R1bGVzLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRjaGVja2JveGVzLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdGNvbnN0IHVuaXFJZCA9ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRjb25zdCBwYWdlU3RhdHVzID0gbmV3IFBieEV4dGVuc2lvblN0YXR1cygpO1xuXHRcdFx0cGFnZVN0YXR1cy5pbml0aWFsaXplKHVuaXFJZCwgZmFsc2UpO1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jaGVja0JveGVzLnB1c2gocGFnZVN0YXR1cyk7XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIGRhdGEgdGFibGVzIG9uIHRhYmxlXG5cdCAqL1xuXHRpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJG1vZHVsZXNUYWJsZS5EYXRhVGFibGUoe1xuXHRcdFx0bGVuZ3RoQ2hhbmdlOiBmYWxzZSxcblx0XHRcdHBhZ2luZzogZmFsc2UsXG5cdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdHsgb3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2UgfSxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0eyBvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZSB9LFxuXHRcdFx0XSxcblx0XHRcdC8vIG9yZGVyOiBbMSwgJ2FzYyddLFxuXHRcdFx0bGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcblx0XHR9KTtcblx0XHQkKCcuYWRkLW5ldycpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtC60LAg0YHQv9C40YHQutCwINC80L7QtNGD0LvQtdC5INC/0L7Qu9GD0YfQtdC90L3RhSDRgSDRgdCw0LnRgtCwXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JQYXJzZU1vZHVsZVVwZGF0ZXMocmVzcG9uc2UpIHtcblx0XHRyZXNwb25zZS5tb2R1bGVzLmZvckVhY2goKG9iaikgPT4ge1xuXHRcdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQv9C+0LTRhdC+0LTQuNGCINC70Lgg0L/QviDQvdC+0LzQtdGA0YMg0LLQtdGA0YHQuNC4INGN0YLQvtGCINC80L7QtNGD0LvRjCDQuiDQkNCi0KFcblx0XHRcdGNvbnN0IG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCA9IG9iai5taW5fcGJ4X3ZlcnNpb247XG5cdFx0XHRjb25zdCBjdXJyZW50VmVyc2lvblBCWCA9IGV4dGVuc2lvbk1vZHVsZXMucGJ4VmVyc2lvbjtcblx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKGN1cnJlbnRWZXJzaW9uUEJYLCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgpIDwgMCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQvLyDQmNGJ0LXQvCDRgdGA0LXQtNC4INGD0YHRgtCw0L3QvtCy0LvQtdC90L3Ri9GFLCDQv9GA0LXQtNC70L7QttC40Lwg0L7QsdC90L7QstC70LXQvdC40LVcblx0XHRcdGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcblx0XHRcdGlmICgkbW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Y29uc3Qgb2xkVmVyID0gJG1vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuXHRcdFx0XHRjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcblx0XHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpID4gMCkge1xuXHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc3QgJG5ld01vZHVsZVJvdyA9ICQoYHRyLm5ldy1tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcblx0XHRcdFx0aWYgKCRuZXdNb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdGNvbnN0IG9sZFZlciA9ICRuZXdNb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcblx0XHRcdFx0XHRjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcblx0XHRcdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPiAwKSB7XG5cdFx0XHRcdFx0XHQkbmV3TW9kdWxlUm93LnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdCQoJ2EuZG93bmxvYWQnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHt9O1xuXHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuXHRcdFx0JGFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuXHRcdFx0cGFyYW1zLnJlbGVhc2VJZCA9ICRhTGluay5hdHRyKCdkYXRhLWlkJyk7XG5cdFx0XHRwYXJhbXMuc2l6ZSA9ICRhTGluay5hdHRyKCdkYXRhLXNpemUnKTtcblx0XHRcdHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcblx0XHRcdHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcblx0XHRcdHBhcmFtcy5hY3Rpb24gPSAnaW5zdGFsbCc7XG5cdFx0XHRwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG5cblx0XHRcdFBieEFwaS5MaWNlbnNlQ2FwdHVyZUZlYXR1cmVGb3JQcm9kdWN0SWQocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJMaWNlbnNlQ2hlY2spO1xuXHRcdH0pO1xuXHRcdCQoJ2EudXBkYXRlJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSB7fTtcblx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcblx0XHRcdCRhTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHBhcmFtcy5saWNQcm9kdWN0SWQgPSAkYUxpbmsuYXR0cignZGF0YS1wcm9kdWN0aWQnKTtcblx0XHRcdHBhcmFtcy5saWNGZWF0dXJlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1mZWF0dXJlaWQnKTtcblx0XHRcdHBhcmFtcy5hY3Rpb24gPSAndXBkYXRlJztcblx0XHRcdHBhcmFtcy5yZWxlYXNlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1pZCcpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdkYXRhLXVuaXFpZCcpO1xuXHRcdFx0cGFyYW1zLnNpemUgPSAkYUxpbmsuYXR0cignZGF0YS1zaXplJyk7XG5cdFx0XHRwYXJhbXMuYUxpbmsgPSAkYUxpbms7XG5cdFx0XHRQYnhBcGkuTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcblx0XHR9KTtcblx0XHQkKCdhLmRlbGV0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0JChlLnRhcmdldCkuY2xvc2VzdCgnYScpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0gW107XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuXHRcdFx0cGFyYW1zLnVuaXFpZCA9ICRhTGluay5hdHRyKCdpZCcpO1xuXHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5kZWxldGVNb2R1bGUocGFyYW1zKTtcblx0XHR9KTtcblx0XHQkKCdhW2RhdGEtY29udGVudF0nKS5wb3B1cCgpO1xuXHR9LFxuXHQvKipcblx0ICog0JTQvtCx0LDQstC70Y/QtdGCINC+0L/QuNGB0LDQvdC40LUg0LTQvtGB0YLRg9C/0L3QvtCz0L4g0LzQvtC00YPQu9GPXG5cdCAqIEBwYXJhbSBvYmpcblx0ICovXG5cdGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuXHRcdCQoJyNvbmxpbmUtdXBkYXRlcy1ibG9jaycpLnNob3coKTtcblx0XHRsZXQgcHJvbW9MaW5rID0gJyc7XG5cdFx0aWYgKG9iai5wcm9tb19saW5rICE9PSB1bmRlZmluZWQgJiYgb2JqLnByb21vX2xpbmsgIT09IG51bGwpIHtcblx0XHRcdHByb21vTGluayA9IGA8YnI+PGEgaHJlZj1cIiR7b2JqLnByb21vX2xpbmt9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0V4dGVybmFsRGVzY3JpcHRpb259PC9hPmA7XG5cdFx0fVxuXHRcdGNvbnN0IGR5bWFuaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGlkPVwiJHtvYmoudW5pcWlkfVwiPlxuXHRcdFx0XHRcdFx0PHRkPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX08YnI+XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZD4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGV2ZWxvcGVyKX08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgdmVyc2lvblwiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICBcdFx0XHRcdFx0XHRcdDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gZG93bmxvYWRcIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLXByb2R1Y3RJZCA9IFwiJHtvYmoubGljX3Byb2R1Y3RfaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtZmVhdHVyZUlkID0gXCIke29iai5saWNfZmVhdHVyZV9pZH1cIiBcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdFx0XHRcdFx0XHRcdDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPiBcblx0XHRcdFx0XHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdFx0XHRcdFx0XHQ8L2E+XG4gICAgXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L3RyPmA7XG5cdFx0JCgnI25ldy1tb2R1bGVzLXRhYmxlIHRib2R5JykuYXBwZW5kKGR5bWFuaWNSb3cpO1xuXHR9LFxuXG5cdC8qKlxuXHQgKiDQlNC+0LHQsNCy0LvRj9C10YIg0LrQvdC+0L/QutGDINC+0LHQvdC+0LLQu9C10L3QuNGPINGB0YLQsNGA0L7QuSDQstC10YDRgdC40LggUEJYXG5cdCAqIEBwYXJhbSBvYmpcblx0ICovXG5cdGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuXHRcdGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKTtcblx0XHRjb25zdCAkY3VycmVudFVwZGF0ZUJ1dHRvbiA9ICQoYHRyLm1vZHVsZS1yb3cjJHtvYmoudW5pcWlkfWApLmZpbmQoJ2EudXBkYXRlJyk7XG5cdFx0aWYgKCRjdXJyZW50VXBkYXRlQnV0dG9uLmxlbmd0aCA+IDApIHtcblx0XHRcdGNvbnN0IG9sZFZlciA9ICRjdXJyZW50VXBkYXRlQnV0dG9uLmF0dHIoJ2RhdGEtdmVyJyk7XG5cdFx0XHRjb25zdCBuZXdWZXIgPSBvYmoudmVyc2lvbjtcblx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA8PSAwKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cdFx0JGN1cnJlbnRVcGRhdGVCdXR0b24ucmVtb3ZlKCk7XG5cdFx0Y29uc3QgZHluYW1pY0J1dHRvblxuXHRcdFx0PSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuXHRcdFx0ZGF0YS12ZXIgPVwiJHtvYmoudmVyc2lvbn1cIlxuXHRcdFx0ZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuXHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcblx0XHRcdDxzcGFuIGNsYXNzPVwicGVyY2VudFwiPjwvc3Bhbj5cblx0XHRcdDwvYT5gO1xuXHRcdCRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJykucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcblx0fSxcblx0LyoqXG5cdCAqINCV0YHQu9C4INGE0LjRh9CwINC30LDRhdCy0LDRh9C10L3QsCwg0L7QsdGA0LDRidCw0LXQvNGB0Y8g0Log0YHQtdGA0LLQtdGA0YNcblx0ICog0L7QsdC90L7QstC70LXQvdC40Lkg0LfQsCDQv9C+0LvRg9GH0LXQvdC40LjQtdC8INC00LjRgdGC0YDQuNCx0YPRgtC40LLQsFxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSByZXN1bHRcblx0ICovXG5cdGNiQWZ0ZXJMaWNlbnNlQ2hlY2socGFyYW1zLCByZXN1bHQpIHtcblx0XHRpZiAocmVzdWx0PT09dHJ1ZSl7XG5cdFx0XHRVcGRhdGVBcGkuR2V0TW9kdWxlSW5zdGFsbExpbmsoXG5cdFx0XHRcdHBhcmFtcyxcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2Vzcyxcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZSxcblx0XHRcdCk7XG5cdFx0fSBlbHNlIGlmIChyZXN1bHQ9PT1mYWxzZSAmJiBwYXJhbXMubGVuZ3RoID4gMCl7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocGFyYW1zKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfTm9MaWNlbnNlQXZhaWxhYmxlKTtcblx0XHR9XG5cdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0fSxcblx0LyoqXG5cdCAqINCV0YHQu9C4INGB0LDQudGCINCy0LXRgNC90YPQuyDRgdGB0YvQu9C60YMg0L3QsCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MocGFyYW1zLCByZXNwb25zZSkge1xuXHRcdGNvbnN0IG5ld1BhcmFtcyA9IHBhcmFtcztcblx0XHRyZXNwb25zZS5tb2R1bGVzLmZvckVhY2goKG9iaikgPT4ge1xuXHRcdFx0bmV3UGFyYW1zLm1kNSA9IG9iai5tZDU7XG5cdFx0XHRuZXdQYXJhbXMudXBkYXRlTGluayA9IG9iai5ocmVmO1xuXHRcdFx0aWYgKG5ld1BhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG5cdFx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy51cGRhdGVNb2R1bGUobmV3UGFyYW1zKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLnJlbW92ZUNsYXNzKCdkb3dubG9hZCcpO1xuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUobmV3UGFyYW1zLCBmYWxzZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQldGB0LvQuCDRgdCw0LnRgiDQvtGC0LrQsNC30LDQuyDQsiDQvtCx0L3QvtCy0LvQtdC90LjQuCwg0L3QtSDQt9Cw0YXQstCw0YfQtdC90LAg0L3Rg9C20L3QsNGPINGE0LjRh9CwXG5cdCAqL1xuXHRjYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZShwYXJhbXMpIHtcblx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdGlmIChwYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuXHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIHJlZG8nKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcblx0XHR9XG5cdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfR2V0TGlua0Vycm9yKTtcblx0fSxcblx0LyoqXG5cdCAqINCh0L3QsNGH0LDQu9CwINC+0YLQutC70Y7Rh9C40Lwg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQv9C+0LvRg9GH0LjRgtGB0Y8sINGC0L4g0L7RgtC/0YDQsNCy0LjQvCDQutC+0LzQsNC90LTRgyDQvdCwINC+0LHQvdC+0LLQu9C10L3QuNC1XG5cdCAqINC4INC+0LHQvdC+0LLQuNC8INGB0YLRgNCw0L3QuNGH0LrRg1xuXHQgKiBAcGFyYW0gcGFyYW1zIC0g0L/QsNGA0LDQvNC10YLRgNGLINC30LDQv9GA0L7RgdCwXG5cdCAqL1xuXHR1cGRhdGVNb2R1bGUocGFyYW1zKSB7XG5cdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQstC60LvRjtGH0LXQvSDQu9C4INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0LLQutC70Y7Rh9C10L0sINCy0YvRgNGD0LHQuNC8INC10LPQvlxuXHRcdGNvbnN0IHN0YXR1cyA9ICQoYCMke3BhcmFtcy51bmlxaWR9YCkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRpZiAoc3RhdHVzID09PSB0cnVlKSB7XG5cdFx0XHRQYnhBcGkuU3lzdGVtRGlzYWJsZU1vZHVsZShwYXJhbXMudW5pcWlkLCAoKSA9PiB7XG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5zdGFsbE1vZHVsZShwYXJhbXMsIHRydWUpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5zdGFsbE1vZHVsZShwYXJhbXMsIGZhbHNlKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0L3QvtCy0LvQtdC90LjQtSDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIHBhcmFtcyAtINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsFxuXHQgKiBAcGFyYW0gbmVlZEVuYWJsZSAtINCy0LrQu9GO0YfQuNGC0Ywg0LvQuCDQvNC+0LTRg9C70Ywg0L/QvtGB0LvQtSDRg9GB0YLQsNC90L7QstC60Lg/XG5cdCAqL1xuXHRpbnN0YWxsTW9kdWxlKHBhcmFtcywgbmVlZEVuYWJsZSkge1xuXHRcdFBieEFwaS5TeXN0ZW1Eb3dubG9hZE5ld01vZHVsZShwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuXHRcdFx0aWYgKHJlc3BvbnNlID09PSB0cnVlKSB7XG5cdFx0XHRcdHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUocGFyYW1zLnVuaXFpZCwgbmVlZEVuYWJsZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpZiAocmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbGF0aW9uRXJyb3IpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdGlmIChwYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuXHRcdFx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIHJlZG8nKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0J/QtdGA0LXQt9Cw0L/Rg9GB0Log0LzQvtC00YPQu9GPINC4INC/0LXRgNC10LfQsNCz0YDRg9C30LrQsCDRgdGC0YDQsNC90LjRhtGLXG5cdCAqIEBwYXJhbSB1bmlxaWQgLSBJRCDQvNC+0LTRg9C70Y9cblx0ICovXG5cdHJlbG9hZE1vZHVsZUFuZFBhZ2UodW5pcWlkKSB7XG5cdFx0UGJ4QXBpLlN5c3RlbVJlbG9hZE1vZHVsZSh1bmlxaWQpO1xuXHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG5cdH0sXG5cdC8qKlxuXHQgKiDQodC90LDRh9Cw0LvQsCDQvtGC0LrQu9GO0YfQuNC8INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0L/QvtC70YPRh9C40YLRgdGPLCDRgtC+INC+0YLQv9GA0LDQstC40Lwg0LrQvtC80LDQvdC00YMg0L3QsCDRg9C00LDQu9C10L3QuNC1XG5cdCAqINC4INC+0LHQvdC+0LLQuNC8INGB0YLRgNCw0L3QuNGH0LrRg1xuXHQgKiBAcGFyYW0gcGFyYW1zIC0g0L/QsNGA0LDQvNC10YLRgNGLINC30LDQv9GA0L7RgdCwLlxuXHQgKi9cblx0ZGVsZXRlTW9kdWxlKHBhcmFtcykge1xuXHRcdC8vIEPQv9GA0L7RgdC40Lwg0L/QvtC70YzQt9C+0LLQsNGC0LXQu9GPINGB0L7RhdGA0LDQvdGP0YLRjCDQu9C4INC90LDRgdGC0YDQvtC50LrQuFxuXHRcdGV4dGVuc2lvbk1vZHVsZXMuJGRlbGV0ZU1vZGFsRm9ybVxuXHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0Y2xvc2FibGU6IGZhbHNlLFxuXHRcdFx0XHRvbkRlbnk6ICgpID0+IHtcblx0XHRcdFx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHQvLyDQn9GA0L7QstC10YDQuNC8INCy0LrQu9GO0YfQtdC9INC70Lgg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQstC60LvRjtGH0LXQvSwg0LLRi9GA0YPQsdC40Lwg0LXQs9C+XG5cdFx0XHRcdFx0Y29uc3Qgc3RhdHVzID0gJChgIyR7cGFyYW1zLnVuaXFpZH1gKS5maW5kKCcuY2hlY2tib3gnKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpO1xuXHRcdFx0XHRcdGNvbnN0IGtlZXBTZXR0aW5ncyA9IGV4dGVuc2lvbk1vZHVsZXMuJGtlZXBTZXR0aW5nc0NoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0XHRcdFx0aWYgKHN0YXR1cyA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0UGJ4QXBpLlN5c3RlbURpc2FibGVNb2R1bGUocGFyYW1zLnVuaXFpZCwgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtRGVsZXRlTW9kdWxlKFxuXHRcdFx0XHRcdFx0XHRcdHBhcmFtcy51bmlxaWQsXG5cdFx0XHRcdFx0XHRcdFx0a2VlcFNldHRpbmdzLFxuXHRcdFx0XHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckRlbGV0ZSxcblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtRGVsZXRlTW9kdWxlKHBhcmFtcy51bmlxaWQsIGtlZXBTZXR0aW5ncywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KVxuXHRcdFx0Lm1vZGFsKCdzaG93Jyk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0YDQsNCx0L7RgtGH0LjQuiDQutC+0LzQsNC90LTRiyB1bmluc3RhbGwg0LTQu9GPINC80L7QtNGD0LvRj1xuXHQgKiDQldGB0LvQuCDRg9GB0L/QtdGI0L3Qviwg0L/QtdGA0LXQs9GA0YPQt9C40Lwg0YHRgtGA0LDQvdC40YbRgywg0LXRgdC70Lgg0L3QtdGCLCDRgtC+INGB0L7QvtCx0YnQuNC8INC+0LEg0L7RiNC40LHQutC1XG5cdCAqIEBwYXJhbSByZXN1bHQgLSDRgNC10LfRg9C70YzRgtCw0YIg0YPQtNCw0LvQtdC90LjRjyDQvNC+0LTRg9C70Y9cblx0ICovXG5cdGNiQWZ0ZXJEZWxldGUocmVzdWx0KSB7XG5cdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRpZiAocmVzdWx0ID09PSB0cnVlKSB7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleC9gO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCcudWkubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cdFx0XHRsZXQgZXJyb3JNZXNzYWdlID0gKHJlc3VsdC5kYXRhICE9PSB1bmRlZmluZWQpID8gcmVzdWx0LmRhdGEgOiAnJztcblx0XHRcdGVycm9yTWVzc2FnZSA9IGVycm9yTWVzc2FnZS5yZXBsYWNlKC9cXG4vZywgJzxicj4nKTtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhlcnJvck1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5leHRfRGVsZXRlTW9kdWxlRXJyb3IpO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqINCh0YDQsNCy0L3QtdC90LjQtSDQstC10YDRgdC40Lkg0LzQvtC00YPQu9C10Llcblx0ICogQHBhcmFtIHYxXG5cdCAqIEBwYXJhbSB2MlxuXHQgKiBAcGFyYW0gb3B0aW9uc1xuXHQgKiBAcmV0dXJucyB7bnVtYmVyfVxuXHQgKi9cblx0dmVyc2lvbkNvbXBhcmUodjEsIHYyLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgbGV4aWNvZ3JhcGhpY2FsID0gb3B0aW9ucyAmJiBvcHRpb25zLmxleGljb2dyYXBoaWNhbDtcblx0XHRjb25zdCB6ZXJvRXh0ZW5kID0gb3B0aW9ucyAmJiBvcHRpb25zLnplcm9FeHRlbmQ7XG5cdFx0bGV0IHYxcGFydHMgPSB2MS5zcGxpdCgnLicpO1xuXHRcdGxldCB2MnBhcnRzID0gdjIuc3BsaXQoJy4nKTtcblxuXHRcdGZ1bmN0aW9uIGlzVmFsaWRQYXJ0KHgpIHtcblx0XHRcdHJldHVybiAobGV4aWNvZ3JhcGhpY2FsID8gL15cXGQrW0EtWmEtel0qJC8gOiAvXlxcZCskLykudGVzdCh4KTtcblx0XHR9XG5cblx0XHRpZiAoIXYxcGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpIHx8ICF2MnBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSkge1xuXHRcdFx0cmV0dXJuIE5hTjtcblx0XHR9XG5cblx0XHRpZiAoemVyb0V4dGVuZCkge1xuXHRcdFx0d2hpbGUgKHYxcGFydHMubGVuZ3RoIDwgdjJwYXJ0cy5sZW5ndGgpIHYxcGFydHMucHVzaCgnMCcpO1xuXHRcdFx0d2hpbGUgKHYycGFydHMubGVuZ3RoIDwgdjFwYXJ0cy5sZW5ndGgpIHYycGFydHMucHVzaCgnMCcpO1xuXHRcdH1cblxuXHRcdGlmICghbGV4aWNvZ3JhcGhpY2FsKSB7XG5cdFx0XHR2MXBhcnRzID0gdjFwYXJ0cy5tYXAoTnVtYmVyKTtcblx0XHRcdHYycGFydHMgPSB2MnBhcnRzLm1hcChOdW1iZXIpO1xuXHRcdH1cblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdjFwYXJ0cy5sZW5ndGg7IGkgKz0gMSkge1xuXHRcdFx0aWYgKHYycGFydHMubGVuZ3RoID09PSBpKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHYxcGFydHNbaV0gPT09IHYycGFydHNbaV0pIHtcblx0XHRcdFx0Ly9cblx0XHRcdH0gZWxzZSBpZiAodjFwYXJ0c1tpXSA+IHYycGFydHNbaV0pIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gLTE7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHYxcGFydHMubGVuZ3RoICE9PSB2MnBhcnRzLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIC0xO1xuXHRcdH1cblxuXHRcdHJldHVybiAwO1xuXHR9LFxuXG59O1xuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=