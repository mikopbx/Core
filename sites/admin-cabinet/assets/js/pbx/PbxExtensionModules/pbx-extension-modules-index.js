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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlcy1pbmRleC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVzIiwiJGNoZWNrYm94ZXMiLCIkIiwiJGRlbGV0ZU1vZGFsRm9ybSIsIiRrZWVwU2V0dGluZ3NDaGVja2JveCIsIiRtb2R1bGVzVGFibGUiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCJjaGVja0JveGVzIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIlVwZGF0ZUFwaSIsImdldE1vZHVsZXNVcGRhdGVzIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJ1bmlxSWQiLCJhdHRyIiwicGFnZVN0YXR1cyIsIlBieEV4dGVuc2lvblN0YXR1cyIsInB1c2giLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJhcHBlbmRUbyIsInJlc3BvbnNlIiwibW9kdWxlcyIsImZvckVhY2giLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJjdXJyZW50VmVyc2lvblBCWCIsInZlcnNpb25Db21wYXJlIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsIm9sZFZlciIsImZpbmQiLCJ0ZXh0IiwibmV3VmVyIiwidmVyc2lvbiIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiJG5ld01vZHVsZVJvdyIsInJlbW92ZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJhZGRDbGFzcyIsInBhcmFtcyIsIiRhTGluayIsInRhcmdldCIsImNsb3Nlc3QiLCJyZW1vdmVDbGFzcyIsInJlbGVhc2VJZCIsInNpemUiLCJsaWNQcm9kdWN0SWQiLCJsaWNGZWF0dXJlSWQiLCJhY3Rpb24iLCJhTGluayIsIlBieEFwaSIsIkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZCIsImNiQWZ0ZXJMaWNlbnNlQ2hlY2siLCJkZWxldGVNb2R1bGUiLCJwb3B1cCIsInNob3ciLCJwcm9tb0xpbmsiLCJwcm9tb19saW5rIiwidW5kZWZpbmVkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJkeW1hbmljUm93IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibmFtZSIsImRlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwiZXh0X0luc3RhbGxNb2R1bGUiLCJsaWNfcHJvZHVjdF9pZCIsImxpY19mZWF0dXJlX2lkIiwicmVsZWFzZV9pZCIsImFwcGVuZCIsIiRjdXJyZW50VXBkYXRlQnV0dG9uIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwicmVzdWx0IiwiR2V0TW9kdWxlSW5zdGFsbExpbmsiLCJjYkdldE1vZHVsZUluc3RhbGxMaW5rU3VjY2VzcyIsImNiR2V0TW9kdWxlSW5zdGFsbExpbmtGYWlsdXJlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJleHRfTm9MaWNlbnNlQXZhaWxhYmxlIiwibmV3UGFyYW1zIiwibWQ1IiwidXBkYXRlTGluayIsImhyZWYiLCJ1cGRhdGVNb2R1bGUiLCJpbnN0YWxsTW9kdWxlIiwiZXh0X0dldExpbmtFcnJvciIsInN0YXR1cyIsImNoZWNrYm94IiwiU3lzdGVtRGlzYWJsZU1vZHVsZSIsIm5lZWRFbmFibGUiLCJGaWxlc0Rvd25sb2FkTmV3TW9kdWxlIiwidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJtZXNzYWdlcyIsImV4dF9JbnN0YWxsYXRpb25FcnJvciIsImNsb3NhYmxlIiwib25EZW55Iiwib25BcHByb3ZlIiwia2VlcFNldHRpbmdzIiwiU3lzdGVtRGVsZXRlTW9kdWxlIiwiY2JBZnRlckRlbGV0ZSIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsImVycm9yTWVzc2FnZSIsImRhdGEiLCJleHRfRGVsZXRlTW9kdWxlRXJyb3IiLCJ2MSIsInYyIiwib3B0aW9ucyIsImxleGljb2dyYXBoaWNhbCIsInplcm9FeHRlbmQiLCJ2MXBhcnRzIiwic3BsaXQiLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsImV2ZXJ5IiwiTmFOIiwibWFwIiwiTnVtYmVyIiwiaSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFHQSxJQUFNQSxnQkFBZ0IsR0FBRztBQUN4QkMsRUFBQUEsV0FBVyxFQUFFQyxDQUFDLENBQUMsdUJBQUQsQ0FEVTtBQUV4QkMsRUFBQUEsZ0JBQWdCLEVBQUVELENBQUMsQ0FBQyxvQkFBRCxDQUZLO0FBR3hCRSxFQUFBQSxxQkFBcUIsRUFBRUYsQ0FBQyxDQUFDLHFCQUFELENBSEE7QUFJeEJHLEVBQUFBLGFBQWEsRUFBRUgsQ0FBQyxDQUFDLGdCQUFELENBSlE7QUFLeEJJLEVBQUFBLFVBQVUsRUFBRUMsZ0JBQWdCLENBQUNDLE9BQWpCLENBQXlCLE9BQXpCLEVBQWtDLEVBQWxDLENBTFk7QUFNeEJDLEVBQUFBLFVBQVUsRUFBRSxFQU5ZO0FBT3hCQyxFQUFBQSxVQVB3QjtBQUFBLDBCQU9YO0FBQ1pWLE1BQUFBLGdCQUFnQixDQUFDRyxnQkFBakIsQ0FBa0NRLEtBQWxDO0FBQ0FYLE1BQUFBLGdCQUFnQixDQUFDWSxtQkFBakI7QUFDQUMsTUFBQUEsU0FBUyxDQUFDQyxpQkFBVixDQUE0QmQsZ0JBQWdCLENBQUNlLG9CQUE3QztBQUNBZixNQUFBQSxnQkFBZ0IsQ0FBQ0MsV0FBakIsQ0FBNkJlLElBQTdCLENBQWtDLFVBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUNqRCxZQUFNQyxNQUFNLEdBQUdqQixDQUFDLENBQUNnQixHQUFELENBQUQsQ0FBT0Us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RyxDQUFDLElBQUksQ0FBekMsRUFBNEM7QUFDM0MsWUFBSVIsT0FBTyxDQUFDM0YsTUFBUixLQUFtQm1HLENBQXZCLEVBQTBCO0FBQ3pCLGlCQUFPLENBQVA7QUFDQTs7QUFDRCxZQUFJVixPQUFPLENBQUNVLENBQUQsQ0FBUCxLQUFlUixPQUFPLENBQUNRLENBQUQsQ0FBMUIsRUFBK0IsQ0FDOUI7QUFDQSxTQUZELE1BRU8sSUFBSVYsT0FBTyxDQUFDVSxDQUFELENBQVAsR0FBYVIsT0FBTyxDQUFDUSxDQUFELENBQXhCLEVBQTZCO0FBQ25DLGlCQUFPLENBQVA7QUFDQSxTQUZNLE1BRUE7QUFDTixpQkFBTyxDQUFDLENBQVI7QUFDQTtBQUNEOztBQUVELFVBQUlWLE9BQU8sQ0FBQ3pGLE1BQVIsS0FBbUIyRixPQUFPLENBQUMzRixNQUEvQixFQUF1QztBQUN0QyxlQUFPLENBQUMsQ0FBUjtBQUNBOztBQUVELGFBQU8sQ0FBUDtBQUNBOztBQWhYdUI7QUFBQTtBQUFBLENBQXpCO0FBb1hBekMsQ0FBQyxDQUFDNkksUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QmhKLEVBQUFBLGdCQUFnQixDQUFDVSxVQUFqQjtBQUNBLENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBVcGRhdGVBcGksIFVzZXJNZXNzYWdlLCBnbG9iYWxQQlhWZXJzaW9uLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIsIFBieEV4dGVuc2lvblN0YXR1cyAqL1xuXG5cbmNvbnN0IGV4dGVuc2lvbk1vZHVsZXMgPSB7XG5cdCRjaGVja2JveGVzOiAkKCcubW9kdWxlLXJvdyAuY2hlY2tib3gnKSxcblx0JGRlbGV0ZU1vZGFsRm9ybTogJCgnI2RlbGV0ZS1tb2RhbC1mb3JtJyksXG5cdCRrZWVwU2V0dGluZ3NDaGVja2JveDogJCgnI2tlZXBNb2R1bGVTZXR0aW5ncycpLFxuXHQkbW9kdWxlc1RhYmxlOiAkKCcjbW9kdWxlcy10YWJsZScpLFxuXHRwYnhWZXJzaW9uOiBnbG9iYWxQQlhWZXJzaW9uLnJlcGxhY2UoLy1kZXYvaSwgJycpLFxuXHRjaGVja0JveGVzOiBbXSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRkZWxldGVNb2RhbEZvcm0ubW9kYWwoKTtcblx0XHRleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcblx0XHRVcGRhdGVBcGkuZ2V0TW9kdWxlc1VwZGF0ZXMoZXh0ZW5zaW9uTW9kdWxlcy5jYlBhcnNlTW9kdWxlVXBkYXRlcyk7XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kY2hlY2tib3hlcy5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRjb25zdCB1bmlxSWQgPSAkKG9iaikuYXR0cignZGF0YS12YWx1ZScpO1xuXHRcdFx0Y29uc3QgcGFnZVN0YXR1cyA9IG5ldyBQYnhFeHRlbnNpb25TdGF0dXMoKTtcblx0XHRcdHBhZ2VTdGF0dXMuaW5pdGlhbGl6ZSh1bmlxSWQsIGZhbHNlKTtcblx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuY2hlY2tCb3hlcy5wdXNoKHBhZ2VTdGF0dXMpO1xuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuXHQgKi9cblx0aW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcblx0XHRleHRlbnNpb25Nb2R1bGVzLiRtb2R1bGVzVGFibGUuRGF0YVRhYmxlKHtcblx0XHRcdGxlbmd0aENoYW5nZTogZmFsc2UsXG5cdFx0XHRwYWdpbmc6IGZhbHNlLFxuXHRcdFx0Y29sdW1uczogW1xuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdHsgb3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2UgfSxcblx0XHRcdF0sXG5cdFx0XHQvLyBvcmRlcjogWzEsICdhc2MnXSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0fSk7XG5cdFx0JCgnLmFkZC1uZXcnKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuXHR9LFxuXHQvKipcblx0ICog0J7QsdGA0LDQsdC+0YLQutCwINGB0L/QuNGB0LrQsCDQvNC+0LTRg9C70LXQuSDQv9C+0LvRg9GH0LXQvdC90YUg0YEg0YHQsNC50YLQsFxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlKSB7XG5cdFx0cmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcblx0XHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0L/QvtC00YXQvtC00LjRgiDQu9C4INC/0L4g0L3QvtC80LXRgNGDINCy0LXRgNGB0LjQuCDRjdGC0L7RgiDQvNC+0LTRg9C70Ywg0Log0JDQotChXG5cdFx0XHRjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuXHRcdFx0Y29uc3QgY3VycmVudFZlcnNpb25QQlggPSBleHRlbnNpb25Nb2R1bGVzLnBieFZlcnNpb247XG5cdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShjdXJyZW50VmVyc2lvblBCWCwgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYKSA8IDApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Ly8g0JjRidC10Lwg0YHRgNC10LTQuCDRg9GB0YLQsNC90L7QstC70LXQvdC90YvRhSwg0L/RgNC10LTQu9C+0LbQuNC8INC+0LHQvdC+0LLQu9C10L3QuNC1XG5cdFx0XHRjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG5cdFx0XHRpZiAoJG1vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGNvbnN0IG9sZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcblx0XHRcdFx0Y29uc3QgbmV3VmVyID0gb2JqLnZlcnNpb247XG5cdFx0XHRcdGlmIChleHRlbnNpb25Nb2R1bGVzLnZlcnNpb25Db21wYXJlKG5ld1Zlciwgb2xkVmVyKSA+IDApIHtcblx0XHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaik7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbnN0ICRuZXdNb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG5cdFx0XHRcdGlmICgkbmV3TW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRjb25zdCBvbGRWZXIgPSAkbmV3TW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCk7XG5cdFx0XHRcdFx0Y29uc3QgbmV3VmVyID0gb2JqLnZlcnNpb247XG5cdFx0XHRcdFx0aWYgKGV4dGVuc2lvbk1vZHVsZXMudmVyc2lvbkNvbXBhcmUobmV3VmVyLCBvbGRWZXIpID4gMCkge1xuXHRcdFx0XHRcdFx0JG5ld01vZHVsZVJvdy5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHQkKCdhLmRvd25sb2FkJykub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSB7fTtcblx0XHRcdGNvbnN0ICRhTGluayA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcblx0XHRcdCRhTGluay5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignZGF0YS11bmlxaWQnKTtcblx0XHRcdHBhcmFtcy5yZWxlYXNlSWQgPSAkYUxpbmsuYXR0cignZGF0YS1pZCcpO1xuXHRcdFx0cGFyYW1zLnNpemUgPSAkYUxpbmsuYXR0cignZGF0YS1zaXplJyk7XG5cdFx0XHRwYXJhbXMubGljUHJvZHVjdElkID0gJGFMaW5rLmF0dHIoJ2RhdGEtcHJvZHVjdGlkJyk7XG5cdFx0XHRwYXJhbXMubGljRmVhdHVyZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtZmVhdHVyZWlkJyk7XG5cdFx0XHRwYXJhbXMuYWN0aW9uID0gJ2luc3RhbGwnO1xuXHRcdFx0cGFyYW1zLmFMaW5rID0gJGFMaW5rO1xuXG5cdFx0XHRQYnhBcGkuTGljZW5zZUNhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyTGljZW5zZUNoZWNrKTtcblx0XHR9KTtcblx0XHQkKCdhLnVwZGF0ZScpLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0Y29uc3QgcGFyYW1zID0ge307XG5cdFx0XHRjb25zdCAkYUxpbmsgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJyk7XG5cdFx0XHQkYUxpbmsucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRwYXJhbXMubGljUHJvZHVjdElkID0gJGFMaW5rLmF0dHIoJ2RhdGEtcHJvZHVjdGlkJyk7XG5cdFx0XHRwYXJhbXMubGljRmVhdHVyZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtZmVhdHVyZWlkJyk7XG5cdFx0XHRwYXJhbXMuYWN0aW9uID0gJ3VwZGF0ZSc7XG5cdFx0XHRwYXJhbXMucmVsZWFzZUlkID0gJGFMaW5rLmF0dHIoJ2RhdGEtaWQnKTtcblx0XHRcdHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignZGF0YS11bmlxaWQnKTtcblx0XHRcdHBhcmFtcy5zaXplID0gJGFMaW5rLmF0dHIoJ2RhdGEtc2l6ZScpO1xuXHRcdFx0cGFyYW1zLmFMaW5rID0gJGFMaW5rO1xuXHRcdFx0UGJ4QXBpLkxpY2Vuc2VDYXB0dXJlRmVhdHVyZUZvclByb2R1Y3RJZChwYXJhbXMsIGV4dGVuc2lvbk1vZHVsZXMuY2JBZnRlckxpY2Vuc2VDaGVjayk7XG5cdFx0fSk7XG5cdFx0JCgnYS5kZWxldGUnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdCQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IFtdO1xuXHRcdFx0Y29uc3QgJGFMaW5rID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKTtcblx0XHRcdHBhcmFtcy51bmlxaWQgPSAkYUxpbmsuYXR0cignaWQnKTtcblx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuZGVsZXRlTW9kdWxlKHBhcmFtcyk7XG5cdFx0fSk7XG5cdFx0JCgnYVtkYXRhLWNvbnRlbnRdJykucG9wdXAoKTtcblx0fSxcblx0LyoqXG5cdCAqINCU0L7QsdCw0LLQu9GP0LXRgiDQvtC/0LjRgdCw0L3QuNC1INC00L7RgdGC0YPQv9C90L7Qs9C+INC80L7QtNGD0LvRj1xuXHQgKiBAcGFyYW0gb2JqXG5cdCAqL1xuXHRhZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopIHtcblx0XHQkKCcjb25saW5lLXVwZGF0ZXMtYmxvY2snKS5zaG93KCk7XG5cdFx0bGV0IHByb21vTGluayA9ICcnO1xuXHRcdGlmIChvYmoucHJvbW9fbGluayAhPT0gdW5kZWZpbmVkICYmIG9iai5wcm9tb19saW5rICE9PSBudWxsKSB7XG5cdFx0XHRwcm9tb0xpbmsgPSBgPGJyPjxhIGhyZWY9XCIke29iai5wcm9tb19saW5rfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9FeHRlcm5hbERlc2NyaXB0aW9ufTwvYT5gO1xuXHRcdH1cblx0XHRjb25zdCBkeW1hbmljUm93ID0gYFxuXHRcdFx0PHRyIGNsYXNzPVwibmV3LW1vZHVsZS1yb3dcIiBpZD1cIiR7b2JqLnVuaXFpZH1cIj5cblx0XHRcdFx0XHRcdDx0ZD4ke2RlY29kZVVSSUNvbXBvbmVudChvYmoubmFtZSl9PGJyPlxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXNjcmlwdGlvbil9ICR7cHJvbW9MaW5rfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQ+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRldmVsb3Blcil9PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkIHZlcnNpb25cIj4ke29iai52ZXJzaW9ufTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICBcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwidWkgc21hbGwgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+XG4gICAgXHRcdFx0XHRcdFx0XHQ8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYnV0dG9uIGRvd25sb2FkXCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWNvbnRlbnQ9IFwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGV9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtdW5pcWlkID0gXCIke29iai51bmlxaWR9XCJcblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1wcm9kdWN0SWQgPSBcIiR7b2JqLmxpY19wcm9kdWN0X2lkfVwiXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWZlYXR1cmVJZCA9IFwiJHtvYmoubGljX2ZlYXR1cmVfaWR9XCIgXG5cdFx0XHRcdFx0XHRcdFx0XHRkYXRhLWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT4gXG5cdFx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHRcdFx0XHRcdFx0PC9hPlxuICAgIFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC90cj5gO1xuXHRcdCQoJyNuZXctbW9kdWxlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW1hbmljUm93KTtcblx0fSxcblxuXHQvKipcblx0ICog0JTQvtCx0LDQstC70Y/QtdGCINC60L3QvtC/0LrRgyDQvtCx0L3QvtCy0LvQtdC90LjRjyDRgdGC0LDRgNC+0Lkg0LLQtdGA0YHQuNC4IFBCWFxuXHQgKiBAcGFyYW0gb2JqXG5cdCAqL1xuXHRhZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopIHtcblx0XHRjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvdyMke29iai51bmlxaWR9YCk7XG5cdFx0Y29uc3QgJGN1cnJlbnRVcGRhdGVCdXR0b24gPSAkKGB0ci5tb2R1bGUtcm93IyR7b2JqLnVuaXFpZH1gKS5maW5kKCdhLnVwZGF0ZScpO1xuXHRcdGlmICgkY3VycmVudFVwZGF0ZUJ1dHRvbi5sZW5ndGggPiAwKSB7XG5cdFx0XHRjb25zdCBvbGRWZXIgPSAkY3VycmVudFVwZGF0ZUJ1dHRvbi5hdHRyKCdkYXRhLXZlcicpO1xuXHRcdFx0Y29uc3QgbmV3VmVyID0gb2JqLnZlcnNpb247XG5cdFx0XHRpZiAoZXh0ZW5zaW9uTW9kdWxlcy52ZXJzaW9uQ29tcGFyZShuZXdWZXIsIG9sZFZlcikgPD0gMCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXHRcdCRjdXJyZW50VXBkYXRlQnV0dG9uLnJlbW92ZSgpO1xuXHRcdGNvbnN0IGR5bmFtaWNCdXR0b25cblx0XHRcdD0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBidXR0b24gdXBkYXRlIHBvcHVwZWRcIiBcblx0XHRcdGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGV9XCJcblx0XHRcdGRhdGEtdmVyID1cIiR7b2JqLnZlcnNpb259XCJcblx0XHRcdGRhdGEtdW5pcWlkID1cIiR7b2JqLnVuaXFpZH1cIiBcblx0XHRcdGRhdGEtcHJvZHVjdElkID0gXCIke29iai5saWNfcHJvZHVjdF9pZH1cIlxuXHRcdFx0ZGF0YS1mZWF0dXJlSWQgPSBcIiR7b2JqLmxpY19mZWF0dXJlX2lkfVwiIFxuXHRcdFx0ZGF0YS1pZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuXHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG5cdFx0XHQ8c3BhbiBjbGFzcz1cInBlcmNlbnRcIj48L3NwYW4+XG5cdFx0XHQ8L2E+YDtcblx0XHQkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG5cdH0sXG5cdC8qKlxuXHQgKiDQldGB0LvQuCDRhNC40YfQsCDQt9Cw0YXQstCw0YfQtdC90LAsINC+0LHRgNCw0YnQsNC10LzRgdGPINC6INGB0LXRgNCy0LXRgNGDXG5cdCAqINC+0LHQvdC+0LLQu9C10L3QuNC5INC30LAg0L/QvtC70YPRh9C10L3QuNC40LXQvCDQtNC40YHRgtGA0LjQsdGD0YLQuNCy0LBcblx0ICogQHBhcmFtIHBhcmFtc1xuXHQgKiBAcGFyYW0gcmVzdWx0XG5cdCAqL1xuXHRjYkFmdGVyTGljZW5zZUNoZWNrKHBhcmFtcywgcmVzdWx0KSB7XG5cdFx0aWYgKHJlc3VsdD09PXRydWUpe1xuXHRcdFx0VXBkYXRlQXBpLkdldE1vZHVsZUluc3RhbGxMaW5rKFxuXHRcdFx0XHRwYXJhbXMsXG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuY2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MsXG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuY2JHZXRNb2R1bGVJbnN0YWxsTGlua0ZhaWx1cmUsXG5cdFx0XHQpO1xuXHRcdH0gZWxzZSBpZiAocmVzdWx0PT09ZmFsc2UgJiYgcGFyYW1zLmxlbmd0aCA+IDApe1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcyk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Ob0xpY2Vuc2VBdmFpbGFibGUpO1xuXHRcdFx0JCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHR9XG5cblx0fSxcblx0LyoqXG5cdCAqINCV0YHQu9C4INGB0LDQudGCINCy0LXRgNC90YPQuyDRgdGB0YvQu9C60YMg0L3QsCDQvtCx0L3QvtCy0LvQtdC90LjQtVxuXHQgKiBAcGFyYW0gcGFyYW1zXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JHZXRNb2R1bGVJbnN0YWxsTGlua1N1Y2Nlc3MocGFyYW1zLCByZXNwb25zZSkge1xuXHRcdGNvbnN0IG5ld1BhcmFtcyA9IHBhcmFtcztcblx0XHRyZXNwb25zZS5tb2R1bGVzLmZvckVhY2goKG9iaikgPT4ge1xuXHRcdFx0bmV3UGFyYW1zLm1kNSA9IG9iai5tZDU7XG5cdFx0XHRuZXdQYXJhbXMudXBkYXRlTGluayA9IG9iai5ocmVmO1xuXHRcdFx0aWYgKG5ld1BhcmFtcy5hY3Rpb24gPT09ICd1cGRhdGUnKSB7XG5cdFx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy51cGRhdGVNb2R1bGUobmV3UGFyYW1zKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHBhcmFtcy5hTGluay5maW5kKCdpJykuYWRkQ2xhc3MoJ2xvYWRpbmcgcmVkbycpLnJlbW92ZUNsYXNzKCdkb3dubG9hZCcpO1xuXHRcdFx0XHRleHRlbnNpb25Nb2R1bGVzLmluc3RhbGxNb2R1bGUobmV3UGFyYW1zLCBmYWxzZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQldGB0LvQuCDRgdCw0LnRgiDQvtGC0LrQsNC30LDQuyDQsiDQvtCx0L3QvtCy0LvQtdC90LjQuCwg0L3QtSDQt9Cw0YXQstCw0YfQtdC90LAg0L3Rg9C20L3QsNGPINGE0LjRh9CwXG5cdCAqL1xuXHRjYkdldE1vZHVsZUluc3RhbGxMaW5rRmFpbHVyZShwYXJhbXMpIHtcblx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdGlmIChwYXJhbXMuYWN0aW9uID09PSAndXBkYXRlJykge1xuXHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIHJlZG8nKS5hZGRDbGFzcygnZG93bmxvYWQnKTtcblx0XHR9XG5cdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5leHRfR2V0TGlua0Vycm9yKTtcblx0fSxcblx0LyoqXG5cdCAqINCh0L3QsNGH0LDQu9CwINC+0YLQutC70Y7Rh9C40Lwg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQv9C+0LvRg9GH0LjRgtGB0Y8sINGC0L4g0L7RgtC/0YDQsNCy0LjQvCDQutC+0LzQsNC90LTRgyDQvdCwINC+0LHQvdC+0LLQu9C10L3QuNC1XG5cdCAqINC4INC+0LHQvdC+0LLQuNC8INGB0YLRgNCw0L3QuNGH0LrRg1xuXHQgKiBAcGFyYW0gcGFyYW1zIC0g0L/QsNGA0LDQvNC10YLRgNGLINC30LDQv9GA0L7RgdCwXG5cdCAqL1xuXHR1cGRhdGVNb2R1bGUocGFyYW1zKSB7XG5cdFx0Ly8g0J/RgNC+0LLQtdGA0LjQvCDQstC60LvRjtGH0LXQvSDQu9C4INC80L7QtNGD0LvRjCwg0LXRgdC70Lgg0LLQutC70Y7Rh9C10L0sINCy0YvRgNGD0LHQuNC8INC10LPQvlxuXHRcdGNvbnN0IHN0YXR1cyA9ICQoYCMke3BhcmFtcy51bmlxaWR9YCkuZmluZCgnLmNoZWNrYm94JykuY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRpZiAoc3RhdHVzID09PSB0cnVlKSB7XG5cdFx0XHRQYnhBcGkuU3lzdGVtRGlzYWJsZU1vZHVsZShwYXJhbXMudW5pcWlkLCAoKSA9PiB7XG5cdFx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5zdGFsbE1vZHVsZShwYXJhbXMsIHRydWUpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGV4dGVuc2lvbk1vZHVsZXMuaW5zdGFsbE1vZHVsZShwYXJhbXMsIGZhbHNlKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0L3QvtCy0LvQtdC90LjQtSDQvNC+0LTRg9C70Y9cblx0ICogQHBhcmFtIHBhcmFtcyAtINC/0LDRgNCw0LzQtdGC0YDRiyDQt9Cw0L/RgNC+0YHQsFxuXHQgKiBAcGFyYW0gbmVlZEVuYWJsZSAtINCy0LrQu9GO0YfQuNGC0Ywg0LvQuCDQvNC+0LTRg9C70Ywg0L/QvtGB0LvQtSDRg9GB0YLQsNC90L7QstC60Lg/XG5cdCAqL1xuXHRpbnN0YWxsTW9kdWxlKHBhcmFtcywgbmVlZEVuYWJsZSkge1xuXHRcdFBieEFwaS5GaWxlc0Rvd25sb2FkTmV3TW9kdWxlKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRpZiAocmVzcG9uc2UgPT09IHRydWUpIHtcblx0XHRcdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZShwYXJhbXMudW5pcWlkLCBuZWVkRW5hYmxlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcik7XG5cdFx0XHRcdH1cblx0XHRcdFx0cGFyYW1zLmFMaW5rLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRpZiAocGFyYW1zLmFjdGlvbiA9PT0gJ3VwZGF0ZScpIHtcblx0XHRcdFx0XHRwYXJhbXMuYUxpbmsuZmluZCgnaScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cGFyYW1zLmFMaW5rLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZyByZWRvJykuYWRkQ2xhc3MoJ2Rvd25sb2FkJyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSxcblx0LyoqXG5cdCAqINCh0L3QsNGH0LDQu9CwINC+0YLQutC70Y7Rh9C40Lwg0LzQvtC00YPQu9GMLCDQtdGB0LvQuCDQv9C+0LvRg9GH0LjRgtGB0Y8sINGC0L4g0L7RgtC/0YDQsNCy0LjQvCDQutC+0LzQsNC90LTRgyDQvdCwINGD0LTQsNC70LXQvdC40LVcblx0ICog0Lgg0L7QsdC90L7QstC40Lwg0YHRgtGA0LDQvdC40YfQutGDXG5cdCAqIEBwYXJhbSBwYXJhbXMgLSDQv9Cw0YDQsNC80LXRgtGA0Ysg0LfQsNC/0YDQvtGB0LAuXG5cdCAqL1xuXHRkZWxldGVNb2R1bGUocGFyYW1zKSB7XG5cdFx0Ly8gQ9C/0YDQvtGB0LjQvCDQv9C+0LvRjNC30L7QstCw0YLQtdC70Y8g0YHQvtGF0YDQsNC90Y/RgtGMINC70Lgg0L3QsNGB0YLRgNC+0LnQutC4XG5cdFx0ZXh0ZW5zaW9uTW9kdWxlcy4kZGVsZXRlTW9kYWxGb3JtXG5cdFx0XHQubW9kYWwoe1xuXHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdG9uRGVueTogKCkgPT4ge1xuXHRcdFx0XHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdC8vINCf0YDQvtCy0LXRgNC40Lwg0LLQutC70Y7Rh9C10L0g0LvQuCDQvNC+0LTRg9C70YwsINC10YHQu9C4INCy0LrQu9GO0YfQtdC9LCDQstGL0YDRg9Cx0LjQvCDQtdCz0L5cblx0XHRcdFx0XHRjb25zdCBzdGF0dXMgPSAkKGAjJHtwYXJhbXMudW5pcWlkfWApLmZpbmQoJy5jaGVja2JveCcpLmNoZWNrYm94KCdpcyBjaGVja2VkJyk7XG5cdFx0XHRcdFx0Y29uc3Qga2VlcFNldHRpbmdzID0gZXh0ZW5zaW9uTW9kdWxlcy4ka2VlcFNldHRpbmdzQ2hlY2tib3guY2hlY2tib3goJ2lzIGNoZWNrZWQnKTtcblx0XHRcdFx0XHRpZiAoc3RhdHVzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0XHRQYnhBcGkuU3lzdGVtRGlzYWJsZU1vZHVsZShwYXJhbXMudW5pcWlkLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EZWxldGVNb2R1bGUoXG5cdFx0XHRcdFx0XHRcdFx0cGFyYW1zLnVuaXFpZCxcblx0XHRcdFx0XHRcdFx0XHRrZWVwU2V0dGluZ3MsXG5cdFx0XHRcdFx0XHRcdFx0ZXh0ZW5zaW9uTW9kdWxlcy5jYkFmdGVyRGVsZXRlLFxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFBieEFwaS5TeXN0ZW1EZWxldGVNb2R1bGUocGFyYW1zLnVuaXFpZCwga2VlcFNldHRpbmdzLCBleHRlbnNpb25Nb2R1bGVzLmNiQWZ0ZXJEZWxldGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0fSxcblx0XHRcdH0pXG5cdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHRgNCw0LHQvtGC0YfQuNC6INC60L7QvNCw0L3QtNGLIHVuaW5zdGFsbCDQtNC70Y8g0LzQvtC00YPQu9GPXG5cdCAqINCV0YHQu9C4INGD0YHQv9C10YjQvdC+LCDQv9C10YDQtdCz0YDRg9C30LjQvCDRgdGC0YDQsNC90LjRhtGDLCDQtdGB0LvQuCDQvdC10YIsINGC0L4g0YHQvtC+0LHRidC40Lwg0L7QsSDQvtGI0LjQsdC60LVcblx0ICogQHBhcmFtIHJlc3VsdCAtINGA0LXQt9GD0LvRjNGC0LDRgiDRg9C00LDQu9C10L3QuNGPINC80L7QtNGD0LvRj1xuXHQgKi9cblx0Y2JBZnRlckRlbGV0ZShyZXN1bHQpIHtcblx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdGlmIChyZXN1bHQgPT09IHRydWUpIHtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4L2A7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoJy51aS5tZXNzYWdlLmFqYXgnKS5yZW1vdmUoKTtcblx0XHRcdGxldCBlcnJvck1lc3NhZ2UgPSAocmVzdWx0LmRhdGEgIT09IHVuZGVmaW5lZCkgPyByZXN1bHQuZGF0YSA6ICcnO1xuXHRcdFx0ZXJyb3JNZXNzYWdlID0gZXJyb3JNZXNzYWdlLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGVycm9yTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLmV4dF9EZWxldGVNb2R1bGVFcnJvcik7XG5cdFx0fVxuXHR9LFxuXHQvKipcblx0ICog0KHRgNCw0LLQvdC10L3QuNC1INCy0LXRgNGB0LjQuSDQvNC+0LTRg9C70LXQuVxuXHQgKiBAcGFyYW0gdjFcblx0ICogQHBhcmFtIHYyXG5cdCAqIEBwYXJhbSBvcHRpb25zXG5cdCAqIEByZXR1cm5zIHtudW1iZXJ9XG5cdCAqL1xuXHR2ZXJzaW9uQ29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIHtcblx0XHRjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuXHRcdGNvbnN0IHplcm9FeHRlbmQgPSBvcHRpb25zICYmIG9wdGlvbnMuemVyb0V4dGVuZDtcblx0XHRsZXQgdjFwYXJ0cyA9IHYxLnNwbGl0KCcuJyk7XG5cdFx0bGV0IHYycGFydHMgPSB2Mi5zcGxpdCgnLicpO1xuXG5cdFx0ZnVuY3Rpb24gaXNWYWxpZFBhcnQoeCkge1xuXHRcdFx0cmV0dXJuIChsZXhpY29ncmFwaGljYWwgPyAvXlxcZCtbQS1aYS16XSokLyA6IC9eXFxkKyQvKS50ZXN0KHgpO1xuXHRcdH1cblxuXHRcdGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG5cdFx0XHRyZXR1cm4gTmFOO1xuXHRcdH1cblxuXHRcdGlmICh6ZXJvRXh0ZW5kKSB7XG5cdFx0XHR3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG5cdFx0XHR3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFsZXhpY29ncmFwaGljYWwpIHtcblx0XHRcdHYxcGFydHMgPSB2MXBhcnRzLm1hcChOdW1iZXIpO1xuXHRcdFx0djJwYXJ0cyA9IHYycGFydHMubWFwKE51bWJlcik7XG5cdFx0fVxuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB2MXBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG5cdFx0XHRpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cdFx0XHRpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuXHRcdFx0XHQvL1xuXHRcdFx0fSBlbHNlIGlmICh2MXBhcnRzW2ldID4gdjJwYXJ0c1tpXSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiAtMTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAodjFwYXJ0cy5sZW5ndGggIT09IHYycGFydHMubGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm4gLTE7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIDA7XG5cdH0sXG5cbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0ZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==