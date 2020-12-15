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

/* global globalRootUrl, PbxApi, DebuggerInfo, SemanticLocalization, sessionStorage */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbInByb3ZpZGVycyIsIiRkZWxldGVNb2RhbEZvcm0iLCIkIiwiJHByb3ZpZGVyc1RhYmxlIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJ1bmlxaWQiLCJjbG9zZXN0IiwiYXR0ciIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJvbiIsInVybERhdGEiLCJ0eXBlIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwicmVtb3ZlQ2xhc3MiLCJvblVuY2hlY2tlZCIsImFkZENsYXNzIiwiZSIsImlkIiwidGFyZ2V0Iiwid2luZG93IiwibG9jYXRpb24iLCJwcmV2ZW50RGVmYXVsdCIsImxpbmtzRXhpc3QiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImluaXRpYWxpemVEYXRhVGFibGUiLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsIm9yZGVyIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImFwcGVuZFRvIiwicHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwicHJvdmlkZXJTdGF0dXNlcyIsIkRlYnVnZ2VySW5mbyIsInByZXZpb3VzU3RhdHVzZXMiLCJzZXNzaW9uU3RvcmFnZSIsImdldEl0ZW0iLCJKU09OIiwicGFyc2UiLCJyZXN0YXJ0V29ya2VyIiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlBieEFwaSIsIkdldFNpcFByb3ZpZGVyc1N0YXR1c2VzIiwiY2JSZWZyZXNoUHJvdmlkZXJzU3RhdHVzIiwiR2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMiLCJzZXRUaW1lb3V0IiwibGVuZ3RoIiwiZWFjaCIsImtleSIsInZhbHVlIiwic3RhdGUiLCJ1bmRlZmluZWQiLCJ0b1VwcGVyQ2FzZSIsInNldEl0ZW0iLCJzdHJpbmdpZnkiLCJyZWZyZXNoVmlzdWFsaXNhdGlvbiIsImh0bWxUYWJsZSIsIlVwZGF0ZUNvbnRlbnQiLCJncmVlbiIsImdyZXkiLCJ5ZWxsb3ciLCJpbmRleCIsIm9iaiIsImZpbmQiLCJodG1sIiwidGV4dCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTtBQUVBLElBQU1BLFNBQVMsR0FBRztBQUNqQkMsRUFBQUEsZ0JBQWdCLEVBQUVDLENBQUMsQ0FBQyxvQkFBRCxDQURGO0FBRWpCQyxFQUFBQSxlQUFlLEVBQUVELENBQUMsQ0FBQyxrQkFBRCxDQUZEO0FBR2pCRSxFQUFBQSxVQUhpQjtBQUFBLDBCQUdKO0FBQ1pKLE1BQUFBLFNBQVMsQ0FBQ0MsZ0JBQVYsQ0FBMkJJLEtBQTNCO0FBQ0FILE1BQUFBLENBQUMsQ0FBQyx5QkFBRCxDQUFELENBQ0VJLFFBREYsQ0FDVztBQUNUQyxRQUFBQSxTQURTO0FBQUEsK0JBQ0c7QUFDWCxnQkFBTUMsTUFBTSxHQUFHTixDQUFDLENBQUMsSUFBRCxDQUFELENBQVFPLE9BQVIsQ0FBZ0IsSUFBaEIsRUFBc0JDLElBQXRCLENBQTJCLElBQTNCLENBQWY7QUFDQVIsWUFBQUEsQ0FBQyxDQUFDUyxHQUFGLENBQU07QUFDTEMsY0FBQUEsR0FBRyxZQUFLQyxhQUFMLHFDQURFO0FBRUxDLGNBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xDLGNBQUFBLE9BQU8sRUFBRTtBQUNSQyxnQkFBQUEsSUFBSSxFQUFFZCxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFPLE9BQVIsQ0FBZ0IsSUFBaEIsRUFBc0JDLElBQXRCLENBQTJCLFlBQTNCLENBREU7QUFFUkYsZ0JBQUFBLE1BQU0sRUFBTkE7QUFGUSxlQUhKO0FBT0xTLGNBQUFBLFNBUEs7QUFBQSxtQ0FPS0MsUUFQTCxFQU9lO0FB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LENBQXFDTCxJQUFyQztBQUNBO0FBQ0QsT0F4QkQ7QUF5QkE7O0FBOUVnQztBQUFBO0FBQUEsQ0FBbEM7QUFpRkEzRSxDQUFDLENBQUNrRixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCckYsRUFBQUEsU0FBUyxDQUFDSSxVQUFWO0FBQ0F5QyxFQUFBQSx5QkFBeUIsQ0FBQ3pDLFVBQTFCO0FBQ0EsQ0FIRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpLCBEZWJ1Z2dlckluZm8sIFNlbWFudGljTG9jYWxpemF0aW9uLCBzZXNzaW9uU3RvcmFnZSAqL1xuXG5jb25zdCBwcm92aWRlcnMgPSB7XG5cdCRkZWxldGVNb2RhbEZvcm06ICQoJyNkZWxldGUtbW9kYWwtZm9ybScpLFxuXHQkcHJvdmlkZXJzVGFibGU6ICQoJyNwcm92aWRlcnMtdGFibGUnKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRwcm92aWRlcnMuJGRlbGV0ZU1vZGFsRm9ybS5tb2RhbCgpO1xuXHRcdCQoJy5wcm92aWRlci1yb3cgLmNoZWNrYm94Jylcblx0XHRcdC5jaGVja2JveCh7XG5cdFx0XHRcdG9uQ2hlY2tlZCgpIHtcblx0XHRcdFx0XHRjb25zdCB1bmlxaWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdFx0XHQkLmFwaSh7XG5cdFx0XHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2VuYWJsZS97dHlwZX0ve3VuaXFpZH1gLFxuXHRcdFx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRcdFx0XHR0eXBlOiAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS12YWx1ZScpLFxuXHRcdFx0XHRcdFx0XHR1bmlxaWQsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0XHRcdFx0JChgIyR7dW5pcWlkfSAuZGlzYWJpbGl0eWApLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVW5jaGVja2VkKCkge1xuXHRcdFx0XHRcdGNvbnN0IHVuaXFpZCA9ICQodGhpcykuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0XHRcdCQuYXBpKHtcblx0XHRcdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvZGlzYWJsZS97dHlwZX0ve3VuaXFpZH1gLFxuXHRcdFx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHRcdFx0dXJsRGF0YToge1xuXHRcdFx0XHRcdFx0XHR0eXBlOiAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS12YWx1ZScpLFxuXHRcdFx0XHRcdFx0XHR1bmlxaWQsXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0XHRcdFx0JChgIyR7dW5pcWlkfSAuZGlzYWJpbGl0eWApLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sXG5cdFx0XHR9KTtcblxuXHRcdCQoJy5wcm92aWRlci1yb3cgdGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHRjb25zdCB0eXBlID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9tb2RpZnkke3R5cGV9LyR7aWR9YDtcblx0XHR9KTtcblxuXHRcdCQoJ2JvZHknKS5vbignY2xpY2snLCAnLnByb3ZpZGVyLXJvdyBhLmRlbGV0ZScsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRjb25zdCBsaW5rc0V4aXN0ID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLWxpbmtzJyk7XG5cdFx0XHRpZiAobGlua3NFeGlzdCA9PT0gJ3RydWUnKSB7XG5cdFx0XHRcdHByb3ZpZGVycy4kZGVsZXRlTW9kYWxGb3JtXG5cdFx0XHRcdFx0Lm1vZGFsKHtcblx0XHRcdFx0XHRcdGNsb3NhYmxlOiBmYWxzZSxcblx0XHRcdFx0XHRcdG9uRGVueTogKCkgPT4gdHJ1ZSxcblx0XHRcdFx0XHRcdG9uQXBwcm92ZTogKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykuYXR0cignaHJlZicpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQubW9kYWwoJ3Nob3cnKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKS5hdHRyKCdocmVmJyk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cHJvdmlkZXJzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcblx0fSxcblx0LyoqXG5cdCAqIEluaXRpYWxpemUgZGF0YSB0YWJsZXMgb24gdGFibGVcblx0ICovXG5cdGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG5cdFx0cHJvdmlkZXJzLiRwcm92aWRlcnNUYWJsZS5EYXRhVGFibGUoe1xuXHRcdFx0bGVuZ3RoQ2hhbmdlOiBmYWxzZSxcblx0XHRcdHBhZ2luZzogZmFsc2UsXG5cdFx0XHRjb2x1bW5zOiBbXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdG51bGwsXG5cdFx0XHRcdHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG5cdFx0XHRdLFxuXHRcdFx0b3JkZXI6IFsxLCAnYXNjJ10sXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdH0pO1xuXHRcdCQoJy5hZGQtbmV3LWJ1dHRvbicpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cdH0sXG59O1xuY29uc3QgcHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdHByb3ZpZGVyU3RhdHVzZXM6IHt9LFxuXHRpbml0aWFsaXplKCkge1xuXHRcdC8vINCX0LDQv9GD0YHRgtC40Lwg0L7QsdC90L7QstC70LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0L/RgNC+0LLQsNC50LTQtdGA0LBcblx0XHREZWJ1Z2dlckluZm8uaW5pdGlhbGl6ZSgpO1xuXHRcdGNvbnN0IHByZXZpb3VzU3RhdHVzZXMgPSBzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKCdQcm92aWRlclN0YXR1c2VzJyk7XG5cdFx0aWYgKHByZXZpb3VzU3RhdHVzZXMgIT09IG51bGwpIHtcblx0XHRcdHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIucHJvdmlkZXJTdGF0dXNlcyA9IEpTT04ucGFyc2UocHJldmlvdXNTdGF0dXNlcyk7XG5cdFx0fVxuXHRcdHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFBieEFwaS5HZXRTaXBQcm92aWRlcnNTdGF0dXNlcyhwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaFByb3ZpZGVyc1N0YXR1cyk7XG5cdFx0UGJ4QXBpLkdldElheFByb3ZpZGVyc1N0YXR1c2VzKHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIuY2JSZWZyZXNoUHJvdmlkZXJzU3RhdHVzKTtcblx0fSxcblx0LyoqXG5cdCAqINCd0LDQutC+0L/Qu9C10L3QuNC1INC40L3RhNC+0YDQvNCw0YbQuNC4INC+INGB0YLQsNGC0YPRgdCw0YUg0L/RgNC+0LLQsNC50LTQtdGA0L7QslxuXHQgKi9cblx0Y2JSZWZyZXNoUHJvdmlkZXJzU3RhdHVzKHJlc3BvbnNlKSB7XG5cdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlID1cblx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIud29ya2VyLCBwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnRpbWVPdXQpO1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0JC5lYWNoKHJlc3BvbnNlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aWYgKHZhbHVlLnN0YXRlICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5wcm92aWRlclN0YXR1c2VzW3ZhbHVlLmlkXSA9IHZhbHVlLnN0YXRlLnRvVXBwZXJDYXNlKCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnUHJvdmlkZXJTdGF0dXNlcycsIEpTT04uc3RyaW5naWZ5KHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIucHJvdmlkZXJTdGF0dXNlcykpO1xuXHRcdHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIucmVmcmVzaFZpc3VhbGlzYXRpb24oKTtcblx0fSxcblx0LyoqXG5cdCAqINCe0LHQvdC+0LLQu9C10L3QuNC1INC40L3RhNC+0YDQvNCw0YbQuNC4INCyINGC0LDQsdC70LjRhtC1INC/0YDQvtCy0LDQudC00LXRgNC+0LJcblx0ICovXG5cdHJlZnJlc2hWaXN1YWxpc2F0aW9uKCkge1xuXHRcdGxldCBodG1sVGFibGUgPSAnPHRhYmxlIGNsYXNzPVwidWkgdmVyeSBjb21wYWN0IHRhYmxlXCI+Jztcblx0XHQkLmVhY2gocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5wcm92aWRlclN0YXR1c2VzLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8dHI+Jztcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7a2V5fTwvdGQ+YDtcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7dmFsdWV9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8L3RyPic7XG5cdFx0fSk7XG5cdFx0aHRtbFRhYmxlICs9ICc8L3RhYmxlPic7XG5cdFx0RGVidWdnZXJJbmZvLlVwZGF0ZUNvbnRlbnQoaHRtbFRhYmxlKTtcblx0XHRjb25zdCBncmVlbiA9ICc8ZGl2IGNsYXNzPVwidWkgZ3JlZW4gZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCI+PC9kaXY+Jztcblx0XHRjb25zdCBncmV5ID0gJzxkaXYgY2xhc3M9XCJ1aSBncmV5IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG5cdFx0Y29uc3QgeWVsbG93ID0gJzxkaXYgY2xhc3M9XCJ1aSB5ZWxsb3cgZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCI+PC9kaXY+Jztcblx0XHQkKCd0ci5wcm92aWRlci1yb3cnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG5cdFx0XHRjb25zdCB1bmlxaWQgPSAkKG9iaikuYXR0cignaWQnKTtcblx0XHRcdGlmIChwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnByb3ZpZGVyU3RhdHVzZXNbdW5pcWlkXSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHN3aXRjaCAocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5wcm92aWRlclN0YXR1c2VzW3VuaXFpZF0pIHtcblx0XHRcdFx0XHRjYXNlICdSRUdJU1RFUkVEJzpcblx0XHRcdFx0XHRcdCQob2JqKS5maW5kKCcucHJvdmlkZXItc3RhdHVzJykuaHRtbChncmVlbik7XG5cdFx0XHRcdFx0XHQkKG9iaikuZmluZCgnLmZhaWx1cmUnKS50ZXh0KCcnKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ09LJzpcblx0XHRcdFx0XHRcdCQob2JqKS5maW5kKCcucHJvdmlkZXItc3RhdHVzJykuaHRtbCh5ZWxsb3cpO1xuXHRcdFx0XHRcdFx0JChvYmopLmZpbmQoJy5mYWlsdXJlJykudGV4dCgnJyk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlICdPRkYnOlxuXHRcdFx0XHRcdFx0JChvYmopLmZpbmQoJy5wcm92aWRlci1zdGF0dXMnKS5odG1sKGdyZXkpO1xuXHRcdFx0XHRcdFx0JChvYmopLmZpbmQoJy5mYWlsdXJlJykudGV4dCgnJyk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdFx0JChvYmopLmZpbmQoJy5wcm92aWRlci1zdGF0dXMnKS5odG1sKGdyZXkpO1xuXHRcdFx0XHRcdFx0JChvYmopLmZpbmQoJy5mYWlsdXJlJykudGV4dChwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnByb3ZpZGVyU3RhdHVzZXNbdW5pcWlkXSk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JChvYmopLmZpbmQoJy5wcm92aWRlci1zdGF0dXMnKS5odG1sKGdyZXkpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRwcm92aWRlcnMuaW5pdGlhbGl6ZSgpO1xuXHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLmluaXRpYWxpemUoKTtcbn0pO1xuIl19