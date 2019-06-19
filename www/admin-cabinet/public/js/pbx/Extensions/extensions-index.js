"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

/* global globalRootUrl, ClipboardJS, PbxApi, SemanticLocalization, DebuggerInfo */
var extensionsTable = {
  initialize: function () {
    function initialize() {
      $('.avatar').each(function () {
        if ($(this).attr('src') === '') {
          $(this).attr('src', "".concat(globalRootUrl, "public/img/unknownPerson.jpg"));
        }
      });
      $('#extensions-table').DataTable({
        lengthChange: false,
        paging: false,
        columns: [{
          orderable: false,
          searchable: false
        }, null, null, null, null, // { orderable: false, searchable: false },
        {
          orderable: false,
          searchable: false
        }],
        order: [1, 'asc'],
        language: SemanticLocalization.dataTableLocalisation
      });
      $('#add-new-button').appendTo($('div.eight.column:eq(0)'));
      $('.extension-row td').on('dblclick', function (e) {
        var id = $(e.target).closest('tr').attr('id');
        window.location = "".concat(globalRootUrl, "extensions/modify/").concat(id);
      });
      var clipboard = new ClipboardJS('.clipboard');
      $('.clipboard').popup({
        on: 'manual'
      });
      clipboard.on('success', function (e) {
        $(e.trigger).popup('show');
        setTimeout(function () {
          $(e.trigger).popup('hide');
        }, 1500);
        e.clearSelection();
      });
      clipboard.on('error', function (e) {
        console.error('Action:', e.action);
        console.error('Trigger:', e.trigger);
      });
      $('.extension-row .checkbox').checkbox({
        onChecked: function () {
          function onChecked() {
            var number = $(this).attr('data-value');
            $.api({
              url: "".concat(globalRootUrl, "extensions/enable/").concat(number),
              on: 'now',
              onSuccess: function () {
                function onSuccess(response) {
                  if (response.success) {
                    $("#".concat(number, " .disability")).removeClass('disabled');
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
            var number = $(this).attr('data-value');
            $.api({
              url: "".concat(globalRootUrl, "extensions/disable/").concat(number),
              on: 'now',
              onSuccess: function () {
                function onSuccess(response) {
                  if (response.success) {
                    $("#".concat(number, " .disability")).addClass('disabled');
                  }
                }

                return onSuccess;
              }()
            });
          }

          return onUnchecked;
        }()
      });
    }

    return initialize;
  }()
};
var extensionsStatusLoopWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  green: '<div class="ui green empty circular label" style="width: 1px;height: 1px;"></div>',
  grey: '<div class="ui grey empty circular label" style="width: 1px;height: 1px;"></div>',
  initialize: function () {
    function initialize() {
      // Запустим обновление статуса провайдера
      DebuggerInfo.initialize();
      extensionsStatusLoopWorker.restartWorker();
    }

    return initialize;
  }(),
  restartWorker: function () {
    function restartWorker() {
      window.clearTimeout(extensionsStatusLoopWorker.timeoutHandle);
      extensionsStatusLoopWorker.worker();
    }

    return restartWorker;
  }(),
  worker: function () {
    function worker() {
      window.clearTimeout(extensionsStatusLoopWorker.timeoutHandle);
      PbxApi.GetPeersStatus(extensionsStatusLoopWorker.cbRefreshExtensionsStatus);
    }

    return worker;
  }(),
  cbRefreshExtensionsStatus: function () {
    function cbRefreshExtensionsStatus(response) {
      extensionsStatusLoopWorker.timeoutHandle = window.setTimeout(extensionsStatusLoopWorker.worker, extensionsStatusLoopWorker.timeOut);
      if (response.length === 0 || response === false) return;
      var htmlTable = '<table class="ui very compact table">';
      $.each(response, function (key, value) {
        htmlTable += '<tr>';
        htmlTable += "<td>".concat(value.id, "</td>");
        htmlTable += "<td>".concat(value.state, "</td>");
        htmlTable += '</tr>';
      });
      htmlTable += '</table>';
      DebuggerInfo.UpdateContent(htmlTable);
      $('.extension-row').each(function (index, obj) {
        var number = $(obj).attr('data-value');
        var result = $.grep(response, function (e) {
          return e.id === number;
        });

        if (result.length === 0) {
          // not found
          $(obj).find('.extension-status').html(extensionsStatusLoopWorker.grey);
        } else if (result[0].state.toUpperCase() === 'OK') {
          $(obj).find('.extension-status').html(extensionsStatusLoopWorker.green);
        } else {
          $(obj).find('.extension-status').html(extensionsStatusLoopWorker.grey);
        }
      });
    }

    return cbRefreshExtensionsStatus;
  }()
};
$(document).ready(function () {
  extensionsTable.initialize();
  extensionsStatusLoopWorker.initialize();
});
//# sourceMappingURL=extensions-index.js.map