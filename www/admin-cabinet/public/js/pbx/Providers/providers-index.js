"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, PbxApi, DebuggerInfo, SemanticLocalization */
var providers = {
  $deleteModalForm: $('#delete-modal-form'),
  $providersTable: $('#providers-table'),
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
      providers.initializeDataTable();
    }

    return initialize;
  }(),

  /**
   * Initialize data tables on table
   */
  initializeDataTable: function () {
    function initializeDataTable() {
      providers.$providersTable.DataTable({
        lengthChange: false,
        paging: false,
        columns: [null, null, null, null, null, null, {
          orderable: false,
          searchable: false
        }],
        order: [1, 'asc'],
        language: SemanticLocalization.dataTableLocalisation
      });
      $('.add-new-button').appendTo($('div.eight.column:eq(0)'));
    }

    return initializeDataTable;
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
      var green = '<div class="ui green empty circular label" style="width: 1px;height: 1px;"></div>';
      var grey = '<div class="ui grey empty circular label" style="width: 1px;height: 1px;"></div>';
      var yellow = '<div class="ui yellow empty circular label" style="width: 1px;height: 1px;"></div>';
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbInByb3ZpZGVycyIsIiRkZWxldGVNb2RhbEZvcm0iLCIkIiwiJHByb3ZpZGVyc1RhYmxlIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJ1bmlxaWQiLCJjbG9zZXN0IiwiYXR0ciIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJvbiIsInVybERhdGEiLCJ0eXBlIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwicmVtb3ZlQ2xhc3MiLCJvblVuY2hlY2tlZCIsImFkZENsYXNzIiwiZSIsImlkIiwidGFyZ2V0Iiwid2luZG93IiwibG9jYXRpb24iLCJwcmV2ZW50RGVmYXVsdCIsImxpbmtzRXhpc3QiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImluaXRpYWxpemVEYXRhVGFibGUiLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsIm9yZGVyIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImFwcGVuZFRvIiwicHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwicHJvdmlkZXJTdGF0dXNlcyIsIkRlYnVnZ2VySW5mbyIsInByZXZpb3VzU3RhdHVzZXMiLCJzZXNzaW9uU3RvcmFnZSIsImdldEl0ZW0iLCJKU09OIiwicGFyc2UiLCJyZXN0YXJ0V29ya2VyIiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlBieEFwaSIsIkdldFNpcFByb3ZpZGVyc1N0YXR1c2VzIiwiY2JSZWZyZXNoUHJvdmlkZXJzU3RhdHVzIiwiR2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMiLCJzZXRUaW1lb3V0IiwibGVuZ3RoIiwiZWFjaCIsImtleSIsInZhbHVlIiwic3RhdGUiLCJ1bmRlZmluZWQiLCJ0b1VwcGVyQ2FzZSIsInNldEl0ZW0iLCJzdHJpbmdpZnkiLCJyZWZyZXNoVmlzdWFsaXNhdGlvbiIsImh0bWxUYWJsZSIsIlVwZGF0ZUNvbnRlbnQiLCJncmVlbiIsImdyZXkiLCJ5ZWxsb3ciLCJpbmRleCIsIm9iaiIsImZpbmQiLCJodG1sIiwidGV4dCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSxTQUFTLEdBQUc7QUFDakJDLEVBQUFBLGdCQUFnQixFQUFFQyxDQUFDLENBQUMsb0JBQUQsQ0FERjtBQUVqQkMsRUFBQUEsZUFBZSxFQUFFRCxDQUFDLENBQUMsa0JBQUQsQ0FGRDtBQUdqQkUsRUFBQUEsVUFIaUI7QUFBQSwwQkFHSjtBQUNaSixNQUFBQSxTQUFTLENBQUNDLGdCQUFWLENBQTJCSSxLQUEzQjtBQUNBSCxNQUFBQSxDQUFDLENBQUMseUJBQUQsQ0FBRCxDQUNFSSxRQURGLENBQ1c7QUFDVEMsUUFBQUEsU0FEUztBQUFBLCtCQUNHO0FBQ1gsZ0JBQU1DLE1BQU0sR0FBR04sQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRTyxPQUFSLENBQWdCLElBQWhCLEVBQXNCQyxJQUF0QixDQUEyQixJQUEzQixDQUFmO0FBQ0FSLFlBQUFBLENBQUMsQ0FBQ1MsR0FBRixDQUFNO0FBQ0xDLGNBQUFBLEdBQUcsWUFBS0MsYUFBTCxxQ0FERTtBQUVMQyxjQUFBQSxFQUFFLEVBQUUsS0FGQztBQUdMQyxjQUFBQSxPQUFPLEVBQUU7QUFDUkMsZ0JBQUFBLElBQUksRUFBRWQsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRTyxPQUFSLENBQWdCLElBQWhCLEVBQXNCQyxJQUF0QixDQUEyQixZQUEzQixDQURFO0FBRVJGLGdCQUFBQSxNQUFNLEVBQU5BO0FBRlEsZUFISjtBQU9MUyxjQUFBQSxTQVBLO0FBQUEsbUNBT0tDLFFBUEwsRUFPZTtBQUNuQixzQkFBSUEs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ckM7QUFDQTtBQUNELE9BeEJEO0FBeUJBOztBQTlFZ0M7QUFBQTtBQUFBLENBQWxDO0FBaUZBM0UsQ0FBQyxDQUFDa0YsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnJGLEVBQUFBLFNBQVMsQ0FBQ0ksVUFBVjtBQUNBeUMsRUFBQUEseUJBQXlCLENBQUN6QyxVQUExQjtBQUNBLENBSEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgRGVidWdnZXJJbmZvLCBTZW1hbnRpY0xvY2FsaXphdGlvbiAqL1xuXG5jb25zdCBwcm92aWRlcnMgPSB7XG5cdCRkZWxldGVNb2RhbEZvcm06ICQoJyNkZWxldGUtbW9kYWwtZm9ybScpLFxuXHQkcHJvdmlkZXJzVGFibGU6ICQoJyNwcm92aWRlcnMtdGFibGUnKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRwcm92aWRlcnMuJGRlbGV0ZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdCQoJy5wcm92aWRlci1yb3cgLmNoZWNrYm94Jylcblx0XHRcdC5jaGVja2JveCh7XG5cdFx0XHRcdG9uQ2hlY2tlZCgpIHtcblx0XHRcdFx0XHRjb25zdCB1bmlxaWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdFx0XHQkLmFwaSh7XG5cdFx0XHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2VuYWJsZS97dHlwZX0ve3VuaXFpZH1gLFxuXHRcdFx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRcdFx0XHR0eXBlOiAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS12YWx1ZScpLFxuXHRcdFx0XHRcdFx0XHR1bmlxaWQsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0XHRcdFx0JChgIyR7dW5pcWlkfSAuZGlzYWJpbGl0eWApLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVW5jaGVja2VkKCkge1xuXHRcdFx0XHRcdGNvbnN0IHVuaXFpZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0XHRcdCQuYXBpKHtcblx0XHRcdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvZGlzYWJsZS97dHlwZX0ve3VuaXFpZH1gLFxuXHRcdFx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRcdFx0XHR0eXBlOiAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS12YWx1ZScpLFxuXHRcdFx0XHRcdFx0XHR1bmlxaWQsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0XHRcdFx0JChgIyR7dW5pcWlkfSAuZGlzYWJpbGl0eWApLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblxuXHRcdCQoJy5wcm92aWRlci1yb3cgdGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHRjb25zdCB0eXBlID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnkke3R5cGV9LyR7aWR9YDtcblx0XHR9KTtcblxuXHRcdCQoJ2JvZHknKS5vbignY2xpY2snLCAnLnByb3ZpZGVyLXJvdyBhLmRlbGV0ZScsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRjb25zdCBsaW5rc0V4aXN0ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLWxpbmtzJyk7XG5cdFx0XHRpZiAobGlua3NFeGlzdCA9PT0gJ3RydWUnKSB7XG5cdFx0XHRcdHByb3ZpZGVycy4kZGVsZXRlTW9kYWxGb3JtXG5cdFx0XHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0XHRcdG9uRGVueTogKCkgPT4gdHJ1ZSxcblx0XHRcdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykuYXR0cignaHJlZicpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKS5hdHRyKCdocmVmJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cHJvdmlkZXJzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcblx0fSxcblx0LyoqXG5cdCAqIEluaXRpYWxpemUgZGF0YSB0YWJsZXMgb24gdGFibGVcblx0ICovXG5cdGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG5cdFx0cHJvdmlkZXJzLiRwcm92aWRlcnNUYWJsZS5EYXRhVGFibGUoe1xuXHRcdFx0bGVuZ3RoQ2hhbmdlOiBmYWxzZSxcblx0XHRcdHBhZ2luZzogZmFsc2UsXG5cdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG5cdFx0XHRdLFxuXHRcdFx0b3JkZXI6IFsxLCAnYXNjJ10sXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdH0pO1xuXHRcdCQoJy5hZGQtbmV3LWJ1dHRvbicpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cdH0sXG59O1xuY29uc3QgcHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdHByb3ZpZGVyU3RhdHVzZXM6IHt9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdC8vINCX0LDQv9GD0YHRgtC40Lwg0L7QsdC90L7QstC70LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0L/RgNC+0LLQsNC50LTQtdGA0LBcblx0XHREZWJ1Z2dlckluZm8uaW5pdGlhbGl6ZSgpO1xuXHRcdGNvbnN0IHByZXZpb3VzU3RhdHVzZXMgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKCdQcm92aWRlclN0YXR1c2VzJyk7XG5cdFx0aWYgKHByZXZpb3VzU3RhdHVzZXMgIT09IG51bGwpIHtcblx0XHRcdHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIucHJvdmlkZXJTdGF0dXNlcyA9IEpTT04ucGFyc2UocHJldmlvdXNTdGF0dXNlcyk7XG5cdFx0fVxuXHRcdHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFBieEFwaS5HZXRTaXBQcm92aWRlcnNTdGF0dXNlcyhwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaFByb3ZpZGVyc1N0YXR1cyk7XG5cdFx0UGJ4QXBpLkdldElheFByb3ZpZGVyc1N0YXR1c2VzKHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIuY2JSZWZyZXNoUHJvdmlkZXJzU3RhdHVzKTtcblx0fSxcblx0LyoqXG5cdCAqINCd0LDQutC+0L/Qu9C10L3QuNC1INC40L3RhNC+0YDQvNCw0YbQuNC4INC+INGB0YLQsNGC0YPRgdCw0YUg0L/RgNC+0LLQsNC50LTQtdGA0L7QslxuXHQgKi9cblx0Y2JSZWZyZXNoUHJvdmlkZXJzU3RhdHVzKHJlc3BvbnNlKSB7XG5cdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlID1cblx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIud29ya2VyLCBwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnRpbWVPdXQpO1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0JC5lYWNoKHJlc3BvbnNlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aWYgKHZhbHVlLnN0YXRlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5wcm92aWRlclN0YXR1c2VzW3ZhbHVlLmlkXSA9IHZhbHVlLnN0YXRlLnRvVXBwZXJDYXNlKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnUHJvdmlkZXJTdGF0dXNlcycsIEpTT04uc3RyaW5naWZ5KHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIucHJvdmlkZXJTdGF0dXNlcykpO1xuXHRcdHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIucmVmcmVzaFZpc3VhbGlzYXRpb24oKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9C10L3QuNC1INC40L3RhNC+0YDQvNCw0YbQuNC4INCyINGC0LDQsdC70LjRhtC1INC/0YDQvtCy0LDQudC00LXRgNC+0LJcblx0ICovXG5cdHJlZnJlc2hWaXN1YWxpc2F0aW9uKCkge1xuXHRcdGxldCBodG1sVGFibGUgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHRhYmxlXCI+Jztcblx0XHQkLmVhY2gocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5wcm92aWRlclN0YXR1c2VzLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8dHI+Jztcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7a2V5fTwvdGQ+YDtcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7dmFsdWV9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8L3RyPic7XG5cdFx0fSk7XG5cdFx0aHRtbFRhYmxlICs9ICc8L3RhYmxlPic7XG5cdFx0RGVidWdnZXJJbmZvLlVwZGF0ZUNvbnRlbnQoaHRtbFRhYmxlKTtcblx0XHRjb25zdCBncmVlbiA9ICc8ZGl2IGNsYXNzPVwidWkgZ3JlZW4gZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCI+PC9kaXY+Jztcblx0XHRjb25zdCBncmV5ID0gJzxkaXYgY2xhc3M9XCJ1aSBncmV5IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG5cdFx0Y29uc3QgeWVsbG93ID0gJzxkaXYgY2xhc3M9XCJ1aSB5ZWxsb3cgZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCI+PC9kaXY+Jztcblx0XHQkKCd0ci5wcm92aWRlci1yb3cnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRjb25zdCB1bmlxaWQgPSAkKG9iaikuYXR0cignaWQnKTtcblx0XHRcdGlmIChwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnByb3ZpZGVyU3RhdHVzZXNbdW5pcWlkXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHN3aXRjaCAocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5wcm92aWRlclN0YXR1c2VzW3VuaXFpZF0pIHtcblx0XHRcdFx0XHRjYXNlICdSRUdJU1RFUkVEJzpcblx0XHRcdFx0XHRcdCQob2JqKS5maW5kKCcucHJvdmlkZXItc3RhdHVzJykuaHRtbChncmVlbik7XG5cdFx0XHRcdFx0XHQkKG9iaikuZmluZCgnLmZhaWx1cmUnKS50ZXh0KCcnKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ09LJzpcblx0XHRcdFx0XHRcdCQob2JqKS5maW5kKCcucHJvdmlkZXItc3RhdHVzJykuaHRtbCh5ZWxsb3cpO1xuXHRcdFx0XHRcdFx0JChvYmopLmZpbmQoJy5mYWlsdXJlJykudGV4dCgnJyk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlICdPRkYnOlxuXHRcdFx0XHRcdFx0JChvYmopLmZpbmQoJy5wcm92aWRlci1zdGF0dXMnKS5odG1sKGdyZXkpO1xuXHRcdFx0XHRcdFx0JChvYmopLmZpbmQoJy5mYWlsdXJlJykudGV4dCgnJyk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0JChvYmopLmZpbmQoJy5wcm92aWRlci1zdGF0dXMnKS5odG1sKGdyZXkpO1xuXHRcdFx0XHRcdFx0JChvYmopLmZpbmQoJy5mYWlsdXJlJykudGV4dChwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnByb3ZpZGVyU3RhdHVzZXNbdW5pcWlkXSk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JChvYmopLmZpbmQoJy5wcm92aWRlci1zdGF0dXMnKS5odG1sKGdyZXkpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRwcm92aWRlcnMuaW5pdGlhbGl6ZSgpO1xuXHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19