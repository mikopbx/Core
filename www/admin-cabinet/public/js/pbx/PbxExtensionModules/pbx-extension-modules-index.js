"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

/* global globalRootUrl, PbxApi, globalTranslate,
 globalPBXLanguage, globalPBXLicense, globalPBXVersion */
var upgradeStatusLoopWorker = {};
var extensionModules = {
  $ajaxMessgesDiv: $('#ajax-messages'),
  $checboxes: $('.module-row .checkbox'),
  updatesUrl: 'https://update.askozia.ru/',
  initialize: function () {
    function initialize() {
      extensionModules.getModulesUpdates();
      extensionModules.$checboxes.checkbox({
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
  addUpdateButtonToRow: function () {
    function addUpdateButtonToRow(obj) {
      var $moduleRow = $("tr#".concat(obj.uniqid));
      var dymanicButton = "<a href=\"".concat(obj.href, "\" class=\"ui button update popuped\" \n\t\t\tdata-content=\"").concat(globalTranslate.ext_UpdateModule, "\"\n\t\t\tdata-uniqid =\"").concat(obj.uniqid, "\" \n\t\t\tdata-md5 =\"").concat(obj.md5, "\">\n\t\t\t<i class=\"icon redo blue\"></i> \n\t\t\t<span class=\"percent\"></span>\n\t\t\t</a>");
      $moduleRow.find('.action-buttons').prepend(dymanicButton);
    }

    return addUpdateButtonToRow;
  }(),
  addModuleDescription: function () {
    function addModuleDescription(obj) {
      $('#online-updates-block').show();
      var promoLink = '';

      if (obj.promo_link !== undefined && obj.promo_link !== null) {
        promoLink = "<br><a href=\"".concat(obj.promo_link, "\" target=\"_blank\">").concat(globalTranslate.ext_ExternalDescription, "</a>");
      }

      var dymanicRow = "\n\t\t\t<tr class=\"new-module-row\" id=\"".concat(obj.uniqid, "\">\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.name), "<br>\n\t\t\t\t\t\t<span class=\"features\">").concat(decodeURIComponent(obj.description), " ").concat(promoLink, "</span>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td>").concat(decodeURIComponent(obj.developer), "</td>\n\t\t\t\t\t\t<td class=\"center aligned\">").concat(obj.version, "</td>\n\t\t\t\t\t\t<td class=\"right aligned collapsing\">\n    \t\t\t\t\t\t<div class=\"ui small basic icon buttons action-buttons\">\n    \t\t\t\t\t\t\t<a href=\"").concat(obj.href, "\" class=\"ui button download\" \n\t\t\t\t\t\t\t\t\tdata-content=\"").concat(globalTranslate.ext_InstallModule, "\"\n\t\t\t\t\t\t\t\t\tdata-uniqid =\"").concat(obj.uniqid, "\" \n\t\t\t\t\t\t\t\t\tdata-md5 =\"").concat(obj.md5, "\">\n\t\t\t\t\t\t\t\t\t<i class=\"icon download blue\"></i> \n\t\t\t\t\t\t\t\t\t<span class=\"percent\"></span>\n\t\t\t\t\t\t\t\t</a>\n    \t\t\t\t\t\t</div>\n\t\t\t</tr>");
      $('#new-modules-table tbody').append(dymanicRow);
    }

    return addModuleDescription;
  }(),
  getModulesUpdates: function () {
    function getModulesUpdates() {
      var requestData = {
        TYPE: 'MODULES',
        LICENSE: globalPBXLicense,
        PBXVER: globalPBXVersion,
        LANGUAGE: globalPBXLanguage
      };
      $.api({
        url: extensionModules.updatesUrl,
        on: 'now',
        method: 'POST',
        data: requestData,
        successTest: function () {
          function successTest(response) {
            // test whether a JSON response is valid
            return response !== undefined && Object.keys(response).length > 0 && response.result.toUpperCase() === 'SUCCESS';
          }

          return successTest;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            response.modules.forEach(function (obj) {
              var $moduleRow = $("tr#".concat(obj.uniqid));

              if ($moduleRow.length > 0) {
                var oldVer = $moduleRow.find('td.version').text().replace(/\D/g, '');
                var newVer = obj.version.replace(/\D/g, '');

                if (oldVer < newVer) {
                  extensionModules.addUpdateButtonToRow(obj);
                }
              } else {
                extensionModules.addModuleDescription(obj);
              }
            });
            $('a.download').on('click', function (e) {
              e.preventDefault();
              $('a.button').addClass('disabled');
              var params = [];
              var $aLink = $(e.target).closest('a');
              $aLink.removeClass('disabled');
              params.updateLink = $aLink.attr('href');
              params.uniqid = $aLink.attr('data-uniqid');
              params.md5 = $aLink.attr('data-md5');
              $aLink.find('i').addClass('loading redo').removeClass('download');
              extensionModules.installModule(params, false);
            });
            $('a.update').on('click', function (e) {
              e.preventDefault();
              $('a.button').addClass('disabled');
              var params = [];
              var $aLink = $(e.target).closest('a');
              $aLink.removeClass('disabled');
              params.updateLink = $aLink.attr('href');
              params.uniqid = $aLink.attr('data-uniqid');
              params.md5 = $aLink.attr('data-md5');
              $aLink.find('i').addClass('loading');
              extensionModules.updateModule(params);
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

          return onSuccess;
        }()
      });
    }

    return getModulesUpdates;
  }(),

  /**
   * Сначала отключим модуль, если получится, то отправим команду на удаление
   * и обновим страничку
   * @param params - параметры запроса.
   */
  deleteModule: function () {
    function deleteModule(params) {
      // Проверим включен ли модуль, если включен, вырубим его
      var status = $("#".concat(params.uniqid)).find('.checkbox').checkbox('is checked');

      if (status === true) {
        extensionModules.disableModule(params.uniqid, function () {
          PbxApi.SystemDeleteModule(params.uniqid, extensionModules.cbAfterDelete);
        });
      } else {
        PbxApi.SystemDeleteModule(params.uniqid, extensionModules.cbAfterDelete);
      }
    }

    return deleteModule;
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
              var previousMessage = '';
              $.each(response.message, function (index, value) {
                if (previousMessage !== value) {
                  extensionModules.$ajaxMessgesDiv.after("<div class=\"ui ".concat(index, " message ajax\">").concat(value, "</div>"));
                }

                previousMessage = value;
              });
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
              var previousMessage = '';
              $.each(response.message, function (index, value) {
                if (previousMessage !== value) {
                  extensionModules.$ajaxMessgesDiv.after("<div class=\"ui ".concat(index, " message ajax\">").concat(value, "</div>"));
                }

                previousMessage = value;
              });
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
      window.location = "".concat(globalRootUrl, "/pbx-extension-modules/index/");
    }

    return reloadModuleAndPage;
  }(),

  /**
   * Обработчик команды uninstall для модуля
   * Если успешно, перегрузим страницу, если нет, то сообщим об ошибке
   * @param result - результат удаления модуля
   */
  cbAfterDelete: function () {
    function cbAfterDelete(result) {
      $('a.button').removeClass('disabled');

      if (result) {
        window.location = "".concat(globalRootUrl, "pbx-extension-modules/index/");
      } else {
        $('.ui.message.ajax').remove();
        extensionModules.$ajaxMessgesDiv.after("<div class=\"ui error message ajax\">".concat(globalTranslate.ext_DeleteModuleError, "</div>"));
      }
    }

    return cbAfterDelete;
  }()
};
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
        localStorage.removeItem('globalTranslateVersion'); // Перезапустим формирование кеша перевода

        if (upgradeStatusLoopWorker.needEnableAfterInstall) {
          extensionModules.enableModule(upgradeStatusLoopWorker.moduleUniqid, extensionModules.reloadModuleAndPage);
        } else {
          window.location = "".concat(globalRootUrl, "pbx-extension-modules/index/");
        }

        window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
      }

      if (upgradeStatusLoopWorker.iterations > 50 || response.d_status === 'DOWNLOAD_ERROR') {
        window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
        $('.ui.message.ajax').remove();
        extensionModules.$ajaxMessgesDiv.after("<div class=\"ui error message ajax\">".concat(globalTranslate.ext_UpdateModuleError, "</div>"));
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