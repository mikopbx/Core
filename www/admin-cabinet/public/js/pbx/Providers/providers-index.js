"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalRootUrl, PbxApi, DebuggerInfo */
var providers = {
  $deleteModalForm: $('#delete-modal-form'),
  initialize: function () {
    function initialize() {
      providers.$deleteModalForm.modal();
      $('.provider-row .checkbox').checkbox({
        onChecked: function () {
          function onChecked() {
            var uniqid = $(this).closest('tr').attr('id');
            $.api({
              url: "".concat(globalRootUrl, "providers/enable/{type}/{uniqid}"),
              on: 'now',
              urlData: {
                type: $(this).closest('tr').attr('data-value'),
                uniqid: uniqid
              },
              onSuccess: function () {
                function onSuccess(response) {
                  if (response.success) {
                    $("#".concat(uniqid, " .disability")).removeClass('disabled');
                  }
                }

                return onSuccess;
              }()
            });
          }

          return onChecked;
        }(),
        onUnchecked: function () {
          function onUnchecked() {
            var uniqid = $(this).closest('tr').attr('id');
            $.api({
              url: "".concat(globalRootUrl, "providers/disable/{type}/{uniqid}"),
              on: 'now',
              urlData: {
                type: $(this).closest('tr').attr('data-value'),
                uniqid: uniqid
              },
              onSuccess: function () {
                function onSuccess(response) {
                  if (response.success) {
                    $("#".concat(uniqid, " .disability")).addClass('disabled');
                  }
                }

                return onSuccess;
              }()
            });
          }

          return onUnchecked;
        }()
      });
      $('.provider-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        var type = $(e.target).closest('tr').attr('data-value');
        window.location = "".concat(globalRootUrl, "providers/modify").concat(type, "/").concat(id);
      });
      $('body').on('click', '.provider-row a.delete', function (e) {
        e.preventDefault();
        var linksExist = $(e.target).closest('tr').attr('data-links');

        if (linksExist === 'true') {
          providers.$deleteModalForm.modal({
            closable: false,
            onDeny: function () {
              function onDeny() {
                return true;
              }

              return onDeny;
            }(),
            onApprove: function () {
              function onApprove() {
                window.location = $(e.target).closest('a').attr('href');
                return true;
              }

              return onApprove;
            }()
          }).modal('show');
        } else {
          window.location = $(e.target).closest('a').attr('href');
        }
      });
    }

    return initialize;
  }()
};
var providersStatusLoopWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  providerStatuses: {},
  initialize: function () {
    function initialize() {
      // Запустим обновление статуса провайдера
      DebuggerInfo.initialize();
      var previousStatuses = sessionStorage.getItem('ProviderStatuses');

      if (previousStatuses !== null) {
        providersStatusLoopWorker.providerStatuses = JSON.parse(previousStatuses);
      }

      providersStatusLoopWorker.restartWorker();
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
      providersStatusLoopWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      window.clearTimeout(providersStatusLoopWorker.timeoutHandle);
      PbxApi.GetSipProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
      PbxApi.GetIaxProvidersStatuses(providersStatusLoopWorker.cbRefreshProvidersStatus);
    }

    return worker;
  }(),

  /**
   * Накопление информации о статусах провайдеров
   */
  cbRefreshProvidersStatus: function () {
    function cbRefreshProvidersStatus(response) {
      providersStatusLoopWorker.timeoutHandle = window.setTimeout(providersStatusLoopWorker.worker, providersStatusLoopWorker.timeOut);
      if (response.length === 0 || response === false) return;
      $.each(response, function (key, value) {
        if (value.state !== undefined) {
          providersStatusLoopWorker.providerStatuses[value.id] = value.state.toUpperCase();
        }
      });
      sessionStorage.setItem('ProviderStatuses', JSON.stringify(providersStatusLoopWorker.providerStatuses));
      providersStatusLoopWorker.refreshVisualisation();
    }

    return cbRefreshProvidersStatus;
  }(),

  /**
   * Обновление информации в таблице провайдеров
   */
  refreshVisualisation: function () {
    function refreshVisualisation() {
      var htmlTable = '<table class="ui very compact table">';
      $.each(providersStatusLoopWorker.providerStatuses, function (key, value) {
        htmlTable += '<tr>';
        htmlTable += "<td>".concat(key, "</td>");
        htmlTable += "<td>".concat(value, "</td>");
        htmlTable += '</tr>';
      });
      htmlTable += '</table>';
      DebuggerInfo.UpdateContent(htmlTable);
      var green = '<a class="ui green empty circular label "></a>';
      var grey = '<a class="ui grey empty circular label "></a>';
      var yellow = '<a class="ui yellow empty circular label "></a>';
      $('tr.provider-row').each(function (index, obj) {
        var uniqid = $(obj).attr('id');

        if (providersStatusLoopWorker.providerStatuses[uniqid] !== undefined) {
          switch (providersStatusLoopWorker.providerStatuses[uniqid]) {
            case 'REGISTERED':
              $(obj).find('.provider-status').html(green);
              $(obj).find('.failure').text('');
              break;

            case 'OK':
              $(obj).find('.provider-status').html(yellow);
              $(obj).find('.failure').text('');
              break;

            case 'OFF':
              $(obj).find('.provider-status').html(grey);
              $(obj).find('.failure').text('');
              break;

            default:
              $(obj).find('.provider-status').html(grey);
              $(obj).find('.failure').text(providersStatusLoopWorker.providerStatuses[uniqid]);
              break;
          }
        } else {
          $(obj).find('.provider-status').html(grey);
        }
      });
    }

    return refreshVisualisation;
  }()
};
$(document).ready(function () {
  providers.initialize();
  providersStatusLoopWorker.initialize();
});
//# sourceMappingURL=providers-index.js.map