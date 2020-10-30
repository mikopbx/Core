"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Qcm92aWRlcnMvcHJvdmlkZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbInByb3ZpZGVycyIsIiRkZWxldGVNb2RhbEZvcm0iLCIkIiwiJHByb3ZpZGVyc1RhYmxlIiwiaW5pdGlhbGl6ZSIsIm1vZGFsIiwiY2hlY2tib3giLCJvbkNoZWNrZWQiLCJ1bmlxaWQiLCJjbG9zZXN0IiwiYXR0ciIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJvbiIsInVybERhdGEiLCJ0eXBlIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwicmVtb3ZlQ2xhc3MiLCJvblVuY2hlY2tlZCIsImFkZENsYXNzIiwiZSIsImlkIiwidGFyZ2V0Iiwid2luZG93IiwibG9jYXRpb24iLCJwcmV2ZW50RGVmYXVsdCIsImxpbmtzRXhpc3QiLCJjbG9zYWJsZSIsIm9uRGVueSIsIm9uQXBwcm92ZSIsImluaXRpYWxpemVEYXRhVGFibGUiLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsIm9yZGVyIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImFwcGVuZFRvIiwicHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwicHJvdmlkZXJTdGF0dXNlcyIsIkRlYnVnZ2VySW5mbyIsInByZXZpb3VzU3RhdHVzZXMiLCJzZXNzaW9uU3RvcmFnZSIsImdldEl0ZW0iLCJKU09OIiwicGFyc2UiLCJyZXN0YXJ0V29ya2VyIiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlBieEFwaSIsIkdldFNpcFByb3ZpZGVyc1N0YXR1c2VzIiwiY2JSZWZyZXNoUHJvdmlkZXJzU3RhdHVzIiwiR2V0SWF4UHJvdmlkZXJzU3RhdHVzZXMiLCJzZXRUaW1lb3V0IiwibGVuZ3RoIiwiZWFjaCIsImtleSIsInZhbHVlIiwic3RhdGUiLCJ1bmRlZmluZWQiLCJ0b1VwcGVyQ2FzZSIsInNldEl0ZW0iLCJzdHJpbmdpZnkiLCJyZWZyZXNoVmlzdWFsaXNhdGlvbiIsImh0bWxUYWJsZSIsIlVwZGF0ZUNvbnRlbnQiLCJncmVlbiIsImdyZXkiLCJ5ZWxsb3ciLCJpbmRleCIsIm9iaiIsImZpbmQiLCJodG1sIiwidGV4dCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSxTQUFTLEdBQUc7QUFDakJDLEVBQUFBLGdCQUFnQixFQUFFQyxDQUFDLENBQUMsb0JBQUQsQ0FERjtBQUVqQkMsRUFBQUEsZUFBZSxFQUFFRCxDQUFDLENBQUMsa0JBQUQsQ0FGRDtBQUdqQkUsRUFBQUEsVUFIaUI7QUFBQSwwQkFHSjtBQUNaSixNQUFBQSxTQUFTLENBQUNDLGdCQUFWLENBQTJCSSxLQUEzQjtBQUNBSCxNQUFBQSxDQUFDLENBQUMseUJBQUQsQ0FBRCxDQUNFSSxRQURGLENBQ1c7QUFDVEMsUUFBQUEsU0FEUztBQUFBLCtCQUNHO0FBQ1gsZ0JBQU1DLE1BQU0sR0FBR04sQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRTyxPQUFSLENBQWdCLElBQWhCLEVBQXNCQyxJQUF0QixDQUEyQixJQUEzQixDQUFmO0FBQ0FSLFlBQUFBLENBQUMsQ0FBQ1MsR0FBRixDQUFNO0FBQ0xDLGNBQUFBLEdBQUcsWUFBS0MsYUFBTCxxQ0FERTtBQUVMQyxjQUFBQSxFQUFFLEVBQUUsS0FGQztBQUdMQyxjQUFBQSxPQUFPLEVBQUU7QUFDUkMsZ0JBQUFBLElBQUksRUFBRWQsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRTyxPQUFSLENBQWdCLElBQWhCLEVBQXNCQyxJQUF0QixDQUEyQixZQUEzQixDQURFO0FBRVJGLGdCQUFBQSxNQUFNLEVBQU5BO0FBRlEsZUFISjtBQU9MUyxjQUFBQSxTQVBLO0FBQUEsbUNBT0tDLFFBUEwsRUFPZTtBQUNuQixzQkFBSUEs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ckM7QUFDQTtBQUNELE9BeEJEO0FBeUJBOztBQTlFZ0M7QUFBQTtBQUFBLENBQWxDO0FBaUZBM0UsQ0FBQyxDQUFDa0YsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnJGLEVBQUFBLFNBQVMsQ0FBQ0ksVUFBVjtBQUNBeUMsRUFBQUEseUJBQXlCLENBQUN6QyxVQUExQjtBQUNBLENBSEQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQ29weXJpZ2h0IChDKSBNSUtPIExMQyAtIEFsbCBSaWdodHMgUmVzZXJ2ZWRcbiAqIFVuYXV0aG9yaXplZCBjb3B5aW5nIG9mIHRoaXMgZmlsZSwgdmlhIGFueSBtZWRpdW0gaXMgc3RyaWN0bHkgcHJvaGliaXRlZFxuICogUHJvcHJpZXRhcnkgYW5kIGNvbmZpZGVudGlhbFxuICogV3JpdHRlbiBieSBOaWtvbGF5IEJla2V0b3YsIDEyIDIwMTlcbiAqXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgRGVidWdnZXJJbmZvLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgc2Vzc2lvblN0b3JhZ2UgKi9cblxuY29uc3QgcHJvdmlkZXJzID0ge1xuXHQkZGVsZXRlTW9kYWxGb3JtOiAkKCcjZGVsZXRlLW1vZGFsLWZvcm0nKSxcblx0JHByb3ZpZGVyc1RhYmxlOiAkKCcjcHJvdmlkZXJzLXRhYmxlJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0cHJvdmlkZXJzLiRkZWxldGVNb2RhbEZvcm0ubW9kYWwoKTtcblx0XHQkKCcucHJvdmlkZXItcm93IC5jaGVja2JveCcpXG5cdFx0XHQuY2hlY2tib3goe1xuXHRcdFx0XHRvbkNoZWNrZWQoKSB7XG5cdFx0XHRcdFx0Y29uc3QgdW5pcWlkID0gJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHRcdFx0JC5hcGkoe1xuXHRcdFx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXByb3ZpZGVycy9lbmFibGUve3R5cGV9L3t1bmlxaWR9YCxcblx0XHRcdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0XHRcdFx0dHlwZTogJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKSxcblx0XHRcdFx0XHRcdFx0dW5pcWlkLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuXHRcdFx0XHRcdFx0XHRcdCQoYCMke3VuaXFpZH0gLmRpc2FiaWxpdHlgKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRvblVuY2hlY2tlZCgpIHtcblx0XHRcdFx0XHRjb25zdCB1bmlxaWQgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdFx0XHQkLmFwaSh7XG5cdFx0XHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9cHJvdmlkZXJzL2Rpc2FibGUve3R5cGV9L3t1bmlxaWR9YCxcblx0XHRcdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0XHRcdHVybERhdGE6IHtcblx0XHRcdFx0XHRcdFx0dHlwZTogJCh0aGlzKS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKSxcblx0XHRcdFx0XHRcdFx0dW5pcWlkLFxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuXHRcdFx0XHRcdFx0XHRcdCQoYCMke3VuaXFpZH0gLmRpc2FiaWxpdHlgKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cblx0XHQkKCcucHJvdmlkZXItcm93IHRkJykub24oJ2RibGNsaWNrJywgKGUpID0+IHtcblx0XHRcdGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdpZCcpO1xuXHRcdFx0Y29uc3QgdHlwZSA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS12YWx1ZScpO1xuXHRcdFx0d2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wcm92aWRlcnMvbW9kaWZ5JHt0eXBlfS8ke2lkfWA7XG5cdFx0fSk7XG5cblx0XHQkKCdib2R5Jykub24oJ2NsaWNrJywgJy5wcm92aWRlci1yb3cgYS5kZWxldGUnLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y29uc3QgbGlua3NFeGlzdCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS1saW5rcycpO1xuXHRcdFx0aWYgKGxpbmtzRXhpc3QgPT09ICd0cnVlJykge1xuXHRcdFx0XHRwcm92aWRlcnMuJGRlbGV0ZU1vZGFsRm9ybVxuXHRcdFx0XHRcdC5tb2RhbCh7XG5cdFx0XHRcdFx0XHRjbG9zYWJsZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRvbkRlbnk6ICgpID0+IHRydWUsXG5cdFx0XHRcdFx0XHRvbkFwcHJvdmU6ICgpID0+IHtcblx0XHRcdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpLmF0dHIoJ2hyZWYnKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0Lm1vZGFsKCdzaG93Jyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR3aW5kb3cubG9jYXRpb24gPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhJykuYXR0cignaHJlZicpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHByb3ZpZGVycy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiBJbml0aWFsaXplIGRhdGEgdGFibGVzIG9uIHRhYmxlXG5cdCAqL1xuXHRpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuXHRcdHByb3ZpZGVycy4kcHJvdmlkZXJzVGFibGUuRGF0YVRhYmxlKHtcblx0XHRcdGxlbmd0aENoYW5nZTogZmFsc2UsXG5cdFx0XHRwYWdpbmc6IGZhbHNlLFxuXHRcdFx0Y29sdW1uczogW1xuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHR7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuXHRcdFx0XSxcblx0XHRcdG9yZGVyOiBbMSwgJ2FzYyddLFxuXHRcdFx0bGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcblx0XHR9KTtcblx0XHQkKCcuYWRkLW5ldy1idXR0b24nKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuXHR9LFxufTtcbmNvbnN0IHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHRwcm92aWRlclN0YXR1c2VzOiB7fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQvLyDQl9Cw0L/Rg9GB0YLQuNC8INC+0LHQvdC+0LLQu9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC/0YDQvtCy0LDQudC00LXRgNCwXG5cdFx0RGVidWdnZXJJbmZvLmluaXRpYWxpemUoKTtcblx0XHRjb25zdCBwcmV2aW91c1N0YXR1c2VzID0gc2Vzc2lvblN0b3JhZ2UuZ2V0SXRlbSgnUHJvdmlkZXJTdGF0dXNlcycpO1xuXHRcdGlmIChwcmV2aW91c1N0YXR1c2VzICE9PSBudWxsKSB7XG5cdFx0XHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnByb3ZpZGVyU3RhdHVzZXMgPSBKU09OLnBhcnNlKHByZXZpb3VzU3RhdHVzZXMpO1xuXHRcdH1cblx0XHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci53b3JrZXIoKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRQYnhBcGkuR2V0U2lwUHJvdmlkZXJzU3RhdHVzZXMocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5jYlJlZnJlc2hQcm92aWRlcnNTdGF0dXMpO1xuXHRcdFBieEFwaS5HZXRJYXhQcm92aWRlcnNTdGF0dXNlcyhwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaFByb3ZpZGVyc1N0YXR1cyk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQndCw0LrQvtC/0LvQtdC90LjQtSDQuNC90YTQvtGA0LzQsNGG0LjQuCDQviDRgdGC0LDRgtGD0YHQsNGFINC/0YDQvtCy0LDQudC00LXRgNC+0LJcblx0ICovXG5cdGNiUmVmcmVzaFByb3ZpZGVyc1N0YXR1cyhyZXNwb25zZSkge1xuXHRcdHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSA9XG5cdFx0XHR3aW5kb3cuc2V0VGltZW91dChwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLndvcmtlciwgcHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci50aW1lT3V0KTtcblx0XHRpZiAocmVzcG9uc2UubGVuZ3RoID09PSAwIHx8IHJlc3BvbnNlID09PSBmYWxzZSkgcmV0dXJuO1xuXHRcdCQuZWFjaChyZXNwb25zZSwgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGlmICh2YWx1ZS5zdGF0ZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIucHJvdmlkZXJTdGF0dXNlc1t2YWx1ZS5pZF0gPSB2YWx1ZS5zdGF0ZS50b1VwcGVyQ2FzZSgpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHNlc3Npb25TdG9yYWdlLnNldEl0ZW0oJ1Byb3ZpZGVyU3RhdHVzZXMnLCBKU09OLnN0cmluZ2lmeShwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnByb3ZpZGVyU3RhdHVzZXMpKTtcblx0XHRwcm92aWRlcnNTdGF0dXNMb29wV29ya2VyLnJlZnJlc2hWaXN1YWxpc2F0aW9uKCk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQntCx0L3QvtCy0LvQtdC90LjQtSDQuNC90YTQvtGA0LzQsNGG0LjQuCDQsiDRgtCw0LHQu9C40YbQtSDQv9GA0L7QstCw0LnQtNC10YDQvtCyXG5cdCAqL1xuXHRyZWZyZXNoVmlzdWFsaXNhdGlvbigpIHtcblx0XHRsZXQgaHRtbFRhYmxlID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgY29tcGFjdCB0YWJsZVwiPic7XG5cdFx0JC5lYWNoKHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIucHJvdmlkZXJTdGF0dXNlcywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGh0bWxUYWJsZSArPSAnPHRyPic7XG5cdFx0XHRodG1sVGFibGUgKz0gYDx0ZD4ke2tleX08L3RkPmA7XG5cdFx0XHRodG1sVGFibGUgKz0gYDx0ZD4ke3ZhbHVlfTwvdGQ+YDtcblx0XHRcdGh0bWxUYWJsZSArPSAnPC90cj4nO1xuXHRcdH0pO1xuXHRcdGh0bWxUYWJsZSArPSAnPC90YWJsZT4nO1xuXHRcdERlYnVnZ2VySW5mby5VcGRhdGVDb250ZW50KGh0bWxUYWJsZSk7XG5cdFx0Y29uc3QgZ3JlZW4gPSAnPGRpdiBjbGFzcz1cInVpIGdyZWVuIGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG5cdFx0Y29uc3QgZ3JleSA9ICc8ZGl2IGNsYXNzPVwidWkgZ3JleSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIj48L2Rpdj4nO1xuXHRcdGNvbnN0IHllbGxvdyA9ICc8ZGl2IGNsYXNzPVwidWkgeWVsbG93IGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2Pic7XG5cdFx0JCgndHIucHJvdmlkZXItcm93JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0Y29uc3QgdW5pcWlkID0gJChvYmopLmF0dHIoJ2lkJyk7XG5cdFx0XHRpZiAocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5wcm92aWRlclN0YXR1c2VzW3VuaXFpZF0gIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRzd2l0Y2ggKHByb3ZpZGVyc1N0YXR1c0xvb3BXb3JrZXIucHJvdmlkZXJTdGF0dXNlc1t1bmlxaWRdKSB7XG5cdFx0XHRcdFx0Y2FzZSAnUkVHSVNURVJFRCc6XG5cdFx0XHRcdFx0XHQkKG9iaikuZmluZCgnLnByb3ZpZGVyLXN0YXR1cycpLmh0bWwoZ3JlZW4pO1xuXHRcdFx0XHRcdFx0JChvYmopLmZpbmQoJy5mYWlsdXJlJykudGV4dCgnJyk7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRjYXNlICdPSyc6XG5cdFx0XHRcdFx0XHQkKG9iaikuZmluZCgnLnByb3ZpZGVyLXN0YXR1cycpLmh0bWwoeWVsbG93KTtcblx0XHRcdFx0XHRcdCQob2JqKS5maW5kKCcuZmFpbHVyZScpLnRleHQoJycpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAnT0ZGJzpcblx0XHRcdFx0XHRcdCQob2JqKS5maW5kKCcucHJvdmlkZXItc3RhdHVzJykuaHRtbChncmV5KTtcblx0XHRcdFx0XHRcdCQob2JqKS5maW5kKCcuZmFpbHVyZScpLnRleHQoJycpO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdCQob2JqKS5maW5kKCcucHJvdmlkZXItc3RhdHVzJykuaHRtbChncmV5KTtcblx0XHRcdFx0XHRcdCQob2JqKS5maW5kKCcuZmFpbHVyZScpLnRleHQocHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5wcm92aWRlclN0YXR1c2VzW3VuaXFpZF0pO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQob2JqKS5maW5kKCcucHJvdmlkZXItc3RhdHVzJykuaHRtbChncmV5KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0cHJvdmlkZXJzLmluaXRpYWxpemUoKTtcblx0cHJvdmlkZXJzU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==