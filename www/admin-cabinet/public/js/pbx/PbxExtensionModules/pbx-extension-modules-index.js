"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

/* global globalRootUrl, PbxApi, globalTranslate, UpdateApi, UserMessage */
var licensing = {
  params: undefined,
  callback: undefined,
  captureFeature: function () {
    function captureFeature(params, callback) {
      licensing.params = params;
      licensing.callback = callback;
      $.api({
        url: "".concat(globalRootUrl, "licensing/captureFeatureForProductId"),
        on: 'now',
        method: 'POST',
        data: {
          licFeatureId: licensing.params.licFeatureId,
          licProductId: licensing.params.licProductId
        },
        successTest: function () {
          function successTest(response) {
            // test whether a JSON response is valid
            return response !== undefined && Object.keys(response).length > 0 && response.success === true;
          }

          return successTest;
        }(),
        onSuccess: licensing.cbAfterFeatureCaptured,
        onFailure: licensing.cbAfterFailureFeatureCaptured
      });
    }

    return captureFeature;
  }(),
  cbAfterFeatureCaptured: function () {
    function cbAfterFeatureCaptured() {
      licensing.callback(licensing.params);
    }

    return cbAfterFeatureCaptured;
  }(),
  cbAfterFailureFeatureCaptured: function () {
    function cbAfterFailureFeatureCaptured(response) {
      if (response !== undefined && Object.keys(response).length > 0 && response.message.length > 0) {
        UserMessage.showError(response.message);
      } else {
        UserMessage.showError(globalTranslate.ext_NoLicenseAvailable);
      }

      $('a.button').removeClass('disabled');
    }

    return cbAfterFailureFeatureCaptured;
  }()
};
var upgradeStatusLoopWorker = {};
var extensionModules = {
  $checkboxes: $('.module-row .checkbox'),
  $deleteModalForm: $('#delete-modal-form'),
  $keepSettingsCheckbox: $('#keepModuleSettings'),
  initialize: function () {
    function initialize() {
      extensionModules.$deleteModalForm.modal();
      UpdateApi.getModulesUpdates(extensionModules.cbParseModuleUpdates);
      extensionModules.$checkboxes.checkbox({
        onChecked: function () {
          function onChecked() {
            var uniqid = $(this).closest('tr').attr('id');
            extensionModules.enableModule(uniqid, PbxApi.SystemReloadModule);
          }

          return onChecked;
        }(),
        onUnchecked: function () {
          function onUnchecked() {
            var uniqid = $(this).closest('tr').attr('id');
            extensionModules.disableModule(uniqid, PbxApi.SystemReloadModule);
          }

          return onUnchecked;
        }()
      });
    }

    return initialize;
  }(),

  /**
   * Обработка списка модулей полученнх с сайта
   * @param response
   */
  cbParseModuleUpdates: function () {
    function cbParseModuleUpdates(response) {
      response.modules.forEach(function (obj) {
        // Ищем среди установленных
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
          extensionModules.updateModule(newParams);
          params.aLink.find('i').addClass('loading');
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
        extensionModules.disableModule(params.uniqid, function () {
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
   */
  installModule: function () {
    function installModule(params, needEnable) {
      PbxApi.SystemInstallModule(params);
      upgradeStatusLoopWorker.initialize(params.uniqid, needEnable);
    }

    return installModule;
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
              $("#".concat(uniqid, " .disability")).removeClass('disabled');
              $("#".concat(uniqid)).find('.checkbox').checkbox('set checked');
              cbAfterEnable(uniqid);
            } else {
              $("#".concat(uniqid)).find('.checkbox').checkbox('set unchecked');
              UserMessage.showMultiString(response.message);
            }
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
              $("#".concat(uniqid, " .disability")).addClass('disabled');
              $("#".concat(uniqid)).find('.checkbox').checkbox('set unchecked');
              cbAfterDisable(uniqid);
            } else {
              $("#".concat(uniqid)).find('.checkbox').checkbox('set checked');
              UserMessage.showMultiString(response.message);
              $("#".concat(uniqid)).find('i').removeClass('loading');
            }
          }

          return onSuccess;
        }()
      });
    }

    return disableModule;
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
              extensionModules.disableModule(params.uniqid, function () {
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
/**
 * Мониторинг статуса обновления или установки модуля
 *
 */

upgradeStatusLoopWorker = {
  timeOut: 1000,
  timeOutHandle: '',
  moduleUniqid: '',
  iterations: 0,
  oldPercent: 0,
  needEnableAfterInstall: false,
  initialize: function () {
    function initialize(uniqid, needEnable) {
      upgradeStatusLoopWorker.moduleUniqid = uniqid;
      upgradeStatusLoopWorker.iterations = 0;
      upgradeStatusLoopWorker.needEnableAfterInstall = needEnable;
      upgradeStatusLoopWorker.restartWorker();
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
      upgradeStatusLoopWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
      PbxApi.SystemGetModuleInstallStatus(upgradeStatusLoopWorker.moduleUniqid, upgradeStatusLoopWorker.cbRefreshModuleStatus);
    }

    return worker;
  }(),
  cbRefreshModuleStatus: function () {
    function cbRefreshModuleStatus(response) {
      upgradeStatusLoopWorker.iterations += 1;
      upgradeStatusLoopWorker.timeoutHandle = window.setTimeout(upgradeStatusLoopWorker.worker, upgradeStatusLoopWorker.timeOut);
      if (response.length === 0 || response === false) return;

      if (response.i_status === true) {
        $('a.button').removeClass('disabled');

        if (upgradeStatusLoopWorker.needEnableAfterInstall) {
          extensionModules.enableModule(upgradeStatusLoopWorker.moduleUniqid, extensionModules.reloadModuleAndPage);
        } else {
          window.location = "".concat(globalRootUrl, "pbx-extension-modules/index/");
        }

        window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
      }

      if (upgradeStatusLoopWorker.iterations > 50 || response.d_status === 'DOWNLOAD_ERROR') {
        window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
        var errorMessage = response.d_error !== undefined ? response.d_error : '';
        errorMessage = errorMessage.replace(/\n/g, '<br>');
        UserMessage.showError(errorMessage, globalTranslate.ext_UpdateModuleError);
        $("#".concat(upgradeStatusLoopWorker.moduleUniqid)).find('i').removeClass('loading');
        $('.new-module-row').find('i').addClass('download').removeClass('redo');
        $('a.button').removeClass('disabled');
      } else if (response.d_status === 'DOWNLOAD_IN_PROGRESS' || response.d_status === 'DOWNLOAD_COMPLETE') {
        if (upgradeStatusLoopWorker.oldPercent !== response.d_status_progress) {
          upgradeStatusLoopWorker.iterations = 0;
        }

        $('i.loading.redo').closest('a').find('.percent').text("".concat(response.d_status_progress, "%"));
        upgradeStatusLoopWorker.oldPercent = response.d_status_progress;
      }
    }

    return cbRefreshModuleStatus;
  }()
};
$(document).ready(function () {
  extensionModules.initialize();
});
//# sourceMappingURL=pbx-extension-modules-index.js.map