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

/* global globalRootUrl, ClipboardJS, PbxApi, SemanticLocalization, DebuggerInfo, InputMaskPatterns */
var extensionsTable = {
  maskList: null,
  initialize: function () {
    function initialize() {
      $('.avatar').each(function () {
        if ($(this).attr('src') === '') {
          $(this).attr('src', "".concat(globalRootUrl, "assets/img/unknownPerson.jpg"));
        }
      });
      extensionsTable.initializeInputmask($('input.mobile-number-input'));
      $('#extensions-table').DataTable({
        lengthChange: false,
        paging: false,
        columns: [{
          orderable: false,
          searchable: false
        }, null, null, null, null, {
          orderable: false,
          searchable: false
        }],
        order: [1, 'asc'],
        language: SemanticLocalization.dataTableLocalisation,
        drawCallback: function () {
          function drawCallback() {}

          return drawCallback;
        }()
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
  }(),

  /**
   * Инициализирует красивое представление номеров
   */
  initializeInputmask: function () {
    function initializeInputmask($el) {
      if (extensionsTable.maskList === null) {
        // Подготовим таблицу для сортировки
        extensionsTable.maskList = $.masksSort(InputMaskPatterns, ['#'], /[0-9]|#/, 'mask');
      }

      $el.inputmasks({
        inputmask: {
          definitions: {
            '#': {
              validator: '[0-9]',
              cardinality: 1
            }
          }
        },
        match: /[0-9]/,
        replace: '9',
        list: extensionsTable.maskList,
        listKey: 'mask'
      });
    }

    return initializeInputmask;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc1RhYmxlIiwibWFza0xpc3QiLCJpbml0aWFsaXplIiwiJCIsImVhY2giLCJhdHRyIiwiZ2xvYmFsUm9vdFVybCIsImluaXRpYWxpemVJbnB1dG1hc2siLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsIm9yZGVyIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImRyYXdDYWxsYmFjayIsImFwcGVuZFRvIiwib24iLCJlIiwiaWQiLCJ0YXJnZXQiLCJjbG9zZXN0Iiwid2luZG93IiwibG9jYXRpb24iLCJjbGlwYm9hcmQiLCJDbGlwYm9hcmRKUyIsInBvcHVwIiwidHJpZ2dlciIsInNldFRpbWVvdXQiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsImNoZWNrYm94Iiwib25DaGVja2VkIiwibnVtYmVyIiwiYXBpIiwidXJsIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwicmVtb3ZlQ2xhc3MiLCJvblVuY2hlY2tlZCIsImFkZENsYXNzIiwiJGVsIiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5IiwiZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsImdyZWVuIiwiZ3JleSIsIkRlYnVnZ2VySW5mbyIsInJlc3RhcnRXb3JrZXIiLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4QXBpIiwiR2V0UGVlcnNTdGF0dXMiLCJjYlJlZnJlc2hFeHRlbnNpb25zU3RhdHVzIiwibGVuZ3RoIiwiaHRtbFRhYmxlIiwia2V5IiwidmFsdWUiLCJzdGF0ZSIsIlVwZGF0ZUNvbnRlbnQiLCJpbmRleCIsIm9iaiIsInJlc3VsdCIsImdyZXAiLCJmaW5kIiwiaHRtbCIsInRvVXBwZXJDYXNlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JBO0FBRUEsSUFBTUEsZUFBZSxHQUFHO0FBQ3ZCQyxFQUFBQSxRQUFRLEVBQUUsSUFEYTtBQUV2QkMsRUFBQUEsVUFGdUI7QUFBQSwwQkFFVjtBQUNaQyxNQUFBQSxDQUFDLENBQUMsU0FBRCxDQUFELENBQWFDLElBQWIsQ0FBa0IsWUFBWTtBQUM3QixZQUFJRCxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFFLElBQVIsQ0FBYSxLQUFiLE1BQXdCLEVBQTVCLEVBQWdDO0FBQy9CRixVQUFBQSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFFLElBQVIsQ0FBYSxLQUFiLFlBQXVCQyxhQUF2QjtBQUNBO0FBQ0QsT0FKRDtBQUtBTixNQUFBQSxlQUFlLENBQUNPLG1CQUFoQixDQUFvQ0osQ0FBQyxDQUFDLDJCQUFELENBQXJDO0FBQ0FBLE1BQUFBLENBQUMsQ0FBQyxtQkFBRCxDQUFELENBQXVCSyxTQUF2QixDQUFpQztBQUNoQ0MsUUFBQUEsWUFBWSxFQUFFLEtBRGtCO0FBRWhDQyxRQUFBQSxNQUFNLEVBQUUsS0FGd0I7QUFHaENDLFFBQUFBLE9BQU8sRUFBRSxDQUNSO0FBQUNDLFVBQUFBLFNBQVMsRUFBRSxLQUFaO0FBQW1CQyxVQUFBQSxVQUFVLEVBQUU7QUFBL0IsU0FEUSxFQUVSLElBRlEsRUFHUixJQUhRLEVBSVIsSUFKUSxFQUtSLElBTFEsRUFNUjtBQUFFRCxVQUFBQSxTQUFTLEVBQUUsS0FBYjtBQUFvQkMsVUFBQUEsVUFBVSxFQUFFO0FBQWhDLFNBTlEsQ0FIdUI7QUFXaENDLFFBQUFBLEtBQUssRUFBRSxDQUFDLENBQUQsRUFBSSxLQUFKLENBWHlCO0FBWWhDQyxRQUFBQSxRQUFRLEVBQUVDLG9CQUFvQixDQUFDQyxxQkFaQztBQWFoQ0MsUUFBQUEsWUFiZ0M7QUFBQSxrQ0FhakIsQ0FDZDs7QUFkK0I7QUFBQTtBQUFBLE9BQWpDO0FBaUJBZixNQUFBQSxDQUFDLENBQUMsaUJBQUQsQ0FBRCxDQUFxQmdCLFFBQXJCLENBQThCaEIsQ0FBQyxDQUFDLHdCQUFELENBQS9CO0FBRUFBLE1BQUFBLENBQUMsQ0FBQyxtQkFBRCxDQUFELENBQXVCaUIsRUFBdkIsQ0FBMEIsVUFBMUIsRUFBc0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQzVDLFlBQU1DLEVBQUUsR0FBR25CLENBQUMsQ0FBQ2tCLENBQUMsQ0FBQ0UsTUFBSCxDQUFELENBQVlDLE9BQVosQ0FBb0IsSUFBcEIsRUFBMEJuQixJQUExQixDQUErQixJQUEvQixDQUFYO0FBQ0FvQixRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJwQixhQUFyQiwrQkFBdURnQixFQUF2RDtBQUNBLE9BSEQ7QUFJQSxVQUFNSyxTQUFTLEdBQUcsSUFBSUMsV0FBSixDQUFnQixZQUFoQixDQUFsQjtBQUNBekIsTUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQjBCLEtBQWhCLENBQXNCO0FBQ3JCVCxRQUFBQSxFQUFFLEVBQUU7QUFEaUIsT0FBdEI7QUFHQU8sTUFBQUEsU0FBUyxDQUFDUCxFQUFWLENBQWEsU0FBYixFQUF3QixVQUFDQyxDQUFELEVBQU87QUFDOUJsQixRQUFBQSxDQUFDLENBQUNrQixDQUFDLENBQUNTLE9BQUgsQ0FBRCxDQUFhRCxLQUFiLENBQW1CLE1BQW5CO0FBQ0FFLFFBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2hCNUIsVUFBQUEsQ0FBQyxDQUFDa0IsQ0FBQyxDQUFDUyxPQUFILENBQUQsQ0FBYUQsS0FBYixDQUFtQixNQUFuQjtBQUNBLFNBRlMsRUFFUCxJQUZPLENBQVY7QUFHQVIsUUFBQUEsQ0FBQyxDQUFDVyxjQUFGO0FBQ0EsT0FORDtBQVFBTCxNQUFBQSxTQUFTLENBQUNQLEVBQVYsQ0FBYSxPQUFiLEVBQXNCLFVBQUNDLENBQUQsRUFBTztBQUM1QlksUUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsU0FBZCxFQUF5QmIsQ0FBQyxDQUFDYyxNQUEzQjtBQUNBRixRQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyxVQUFkLEVBQTBCYixDQUFDLENBQUNTLE9BQTVCO0FBQ0EsT0FIRDtBQUlBM0IsTUFBQUEsQ0FBQyxDQUFDLDBCQUFELENBQUQsQ0FDRWlDLFFBREYsQ0FDVztBQUNUQyxRQUFBQSxTQURTO0FBQUEsK0JBQ0c7QUFDWCxnQkFBTUMsTUFBTSxHQUFHbkMsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRRSxJQUFSLENBQWEsWUFBYixDQUFmO0FBQ0FGLFlBQUFBLENBQUMsQ0FBQ29DLEdBQUYsQ0FBTTtBQUNMQyxjQUFBQSxHQUFHLFlBQUtsQyxhQUFMLCtCQUF1Q2dDLE1BQXZDLENBREU7QUFFTGxCLGNBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xxQixjQUFBQSxTQUhLO0FBQUEsbUNBR0tDLFFBSEwsRUFHZTtBQUNuQixzQkFBSUEsUUFBUSxDQUFDQyxPQUFiLEVBQXNCO0FBQ3JCeEMsb0JBQUFBLENBQUMsWUFBS21DLE1BQUwsa0JBQUQsQ0FBNEJNLFdBQTVCLENBQXdDLFVBQXhDO0FBQ0E7QUFDRDs7QUFQSTtBQUFBO0FBQUEsYUFBTjtBQVNBOztBQVpRO0FBQUE7QUFhVEMsUUFBQUEsV0FiUztBQUFBLGlDQWFLO0FBQ2IsZ0JBQU1QLE1BQU0sR0FBR25DLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUUUsSUFBUixDQUFhLFlBQWIsQ0FBZjtBQUNBRixZQUFBQSxDQUFDLENBQUNvQyxHQUFGLENBQU07QUFDTEMsY0FBQUEsR0FBRyxZQUFLbEMsYUFBTCxnQ0FBd0NnQyxNQUF4QyxDQURFO0FBRUxsQixjQUFBQSxFQUFFLEVBQUUsS0FGQztBQUdMcUIsY0FBQUEsU0FISztBQUFBLG1DQUdLQyxRQUhMLEVBR2U7QUFDbkIsc0JBQUlBLFFBQVEsQ0FBQ0MsT0FBYixFQUFzQjtBQUNyQnhDLG9CQUFBQSxDQUFDLFlBQUttQyxNQUFMLGtCQUFELENBQTRCUSxRQUE1QixDQUFxQyxVQUFyQztBQUNBO0FBQ0Q7O0FBUEk7QUFBQTtBQUFBLGFBQU47QUFTQTs7QUF4QlE7QUFBQTtBQUFBLE9BRFg7QUEyQkE7O0FBM0VzQjtBQUFBOztBQTRFdkI7OztBQUdBdkMsRUFBQUEsbUJBL0V1QjtBQUFBLGlDQStFSHdDLEdBL0VHLEVBK0VFO0FBQ3hCLFVBQUkvQyxlQUFlLENBQUNDLFFBQWhCLEtBQTZCLElBQWpDLEVBQXVDO0FBQ3RDO0FBQ0FELFFBQUFBLGVBQWUsQ0FBQ0MsUUFBaEIsR0FBMkJFLENBQUMsQ0FBQzZDLFNBQUYsQ0FBWUMsaUJBQVosRUFBK0IsQ0FBQyxHQUFELENBQS9CLEVBQXNDLFNBQXRDLEVBQWlELE1BQWpELENBQTNCO0FBQ0E7O0FBQ0RGLE1BQUFBLEdBQUcsQ0FBQ0csVUFBSixDQUFlO0FBQ2RDLFFBQUFBLFNBQVMsRUFBRTtBQUNWQyxVQUFBQSxXQUFXLEVBQUU7QUFDWixpQkFBSztBQUNKQyxjQUFBQSxTQUFTLEVBQUUsT0FEUDtBQUVKQyxjQUFBQSxXQUFXLEVBQUU7QUFGVDtBQURPO0FBREgsU0FERztBQVNkQyxRQUFBQSxLQUFLLEVBQUUsT0FUTztBQVVkQyxRQUFBQSxPQUFPLEVBQUUsR0FWSztBQVdkQyxRQUFBQSxJQUFJLEVBQUV6RCxlQUFlLENBQUNDLFFBWFI7QUFZZHlELFFBQUFBLE9BQU8sRUFBRTtBQVpLLE9BQWY7QUFjQTs7QUFsR3NCO0FBQUE7QUFBQSxDQUF4QjtBQXNHQSxJQUFNQywwQkFBMEIsR0FBRztBQUNsQ0MsRUFBQUEsT0FBTyxFQUFFLElBRHlCO0FBRWxDQyxFQUFBQSxhQUFhLEVBQUUsRUFGbUI7QUFHbENDLEVBQUFBLEtBQUssRUFBRSxtRkFIMkI7QUFJbENDLEVBQUFBLElBQUksRUFBRSxrRkFKNEI7QUFLbEM3RCxFQUFBQSxVQUxrQztBQUFBLDBCQUtyQjtBQUNaO0FBQ0E4RCxNQUFBQSxZQUFZLENBQUM5RCxVQUFiO0FBQ0F5RCxNQUFBQSwwQkFBMEIsQ0FBQ00sYUFBM0I7QUFDQTs7QUFUaUM7QUFBQTtBQVVsQ0EsRUFBQUEsYUFWa0M7QUFBQSw2QkFVbEI7QUFDZnhDLE1BQUFBLE1BQU0sQ0FBQ3lDLFlBQVAsQ0FBb0JQLDBCQUEwQixDQUFDUSxhQUEvQztBQUNBUixNQUFBQSwwQkFBMEIsQ0FBQ1MsTUFBM0I7QUFDQTs7QUFiaUM7QUFBQTtBQWNsQ0EsRUFBQUEsTUFka0M7QUFBQSxzQkFjekI7QUFDUjNDLE1BQUFBLE1BQU0sQ0FBQ3lDLFlBQVAsQ0FBb0JQLDBCQUEwQixDQUFDUSxhQUEvQztBQUNBRSxNQUFBQSxNQUFNLENBQUNDLGNBQVAsQ0FBc0JYLDBCQUEwQixDQUFDWSx5QkFBakQ7QUFDQTs7QUFqQmlDO0FBQUE7QUFrQmxDQSxFQUFBQSx5QkFsQmtDO0FBQUEsdUNBa0JSN0IsUUFsQlEsRUFrQkU7QUFDbkNpQixNQUFBQSwwQkFBMEIsQ0FBQ1EsYUFBM0IsR0FDQzFDLE1BQU0sQ0FBQ00sVUFBUCxDQUFrQjRCLDBCQUEwQixDQUFDUyxNQUE3QyxFQUFxRFQsMEJBQTBCLENBQUNDLE9BQWhGLENBREQ7QUFFQSxVQUFJbEIsUUFBUSxDQUFDOEIsTUFBVCxLQUFvQixDQUFwQixJQUF5QjlCLFFBQVEsS0FBSyxLQUExQyxFQUFpRDtBQUNqRCxVQUFJK0IsU0FBUyxHQUFHLHVDQUFoQjtBQUNBdEUsTUFBQUEsQ0FBQyxDQUFDQyxJQUFGLENBQU9zQyxRQUFQLEVBQWlCLFVBQUNnQyxHQUFELEVBQU1DLEtBQU4sRUFBZ0I7QUFDaENGLFFBQUFBLFNBQVMsSUFBSSxNQUFiO0FBQ0FBLFFBQUFBLFNBQVMsa0JBQVdFLEtBQUssQ0FBQ3JELEVBQWpCLFVBQVQ7QUFDQW1ELFFBQUFBLFNBQVMsa0JBQVdFLEtBQUssQ0FBQ0MsS0FBakIsVUFBVDtBQUNBSCxRQUFBQSxTQUFTLElBQUksT0FBYjtBQUNBLE9BTEQ7QUFNQUEsTUFBQUEsU0FBUyxJQUFJLFVBQWI7QUFDQVQsTUFBQUEsWUFBWSxDQUFDYSxhQUFiLENBQTJCSixTQUEzQjtBQUNBdEUsTUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JDLElBQXBCLENBQXlCLFVBQUMwRSxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDeEMsWUFBTXpDLE1BQU0sR0FBR25DLENBQUMsQ0FBQzRFLEdBQUQsQ0FBRCxDQUFPMUUsSUFBUCxDQUFZLFlBQVosQ0FBZjtBQUNBLFlBQU0yRSxNQUFNLEdBQUc3RSxDQUFDLENBQUM4RSxJQUFGLENBQU92QyxRQUFQLEVBQWlCLFVBQUFyQixDQUFDO0FBQUEsaUJBQUlBLENBQUMsQ0FBQ0MsRUFBRixLQUFTZ0IsTUFBYjtBQUFBLFNBQWxCLENBQWY7O0FBQ0EsWUFBSTBDLE1BQU0sQ0FBQ1IsTUFBUCxLQUFrQixDQUF0QixFQUF5QjtBQUN4QjtBQUNBckUsVUFBQUEsQ0FBQyxDQUFDNEUsR0FBRCxDQUFELENBQU9HLElBQVAsQ0FBWSxtQkFBWixFQUFpQ0MsSUFBakMsQ0FBc0N4QiwwQkFBMEIsQ0FBQ0ksSUFBakU7QUFDQSxTQUhELE1BR08sSUFBSWlCLE1BQU0sQ0FBQyxDQUFELENBQU4sQ0FBVUosS0FBVixDQUFnQlEsV0FBaEIsT0FBa0MsSUFBdEMsRUFBNEM7QUFDbERqRixVQUFBQSxDQUFDLENBQUM0RSxHQUFELENBQUQsQ0FBT0csSUFBUCxDQUFZLG1CQUFaLEVBQWlDQyxJQUFqQyxDQUFzQ3hCLDBCQUEwQixDQUFDRyxLQUFqRTtBQUNBLFNBRk0sTUFFQTtBQUNOM0QsVUFBQUEsQ0FBQyxDQUFDNEUsR0FBRCxDQUFELENBQU9HLElBQVAsQ0FBWSxtQkFBWixFQUFpQ0MsSUFBakMsQ0FBc0N4QiwwQkFBMEIsQ0FBQ0ksSUFBakU7QUFDQTtBQUNELE9BWEQ7QUFZQTs7QUEzQ2lDO0FBQUE7QUFBQSxDQUFuQztBQStDQTVELENBQUMsQ0FBQ2tGLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJ0RixFQUFBQSxlQUFlLENBQUNFLFVBQWhCO0FBQ0F5RCxFQUFBQSwwQkFBMEIsQ0FBQ3pELFVBQTNCO0FBQ0EsQ0FIRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgQ2xpcGJvYXJkSlMsIFBieEFwaSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIERlYnVnZ2VySW5mbywgSW5wdXRNYXNrUGF0dGVybnMgKi9cblxuY29uc3QgZXh0ZW5zaW9uc1RhYmxlID0ge1xuXHRtYXNrTGlzdDogbnVsbCxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcuYXZhdGFyJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoJCh0aGlzKS5hdHRyKCdzcmMnKSA9PT0gJycpIHtcblx0XHRcdFx0JCh0aGlzKS5hdHRyKCdzcmMnLCBgJHtnbG9iYWxSb290VXJsfWFzc2V0cy9pbWcvdW5rbm93blBlcnNvbi5qcGdgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRleHRlbnNpb25zVGFibGUuaW5pdGlhbGl6ZUlucHV0bWFzaygkKCdpbnB1dC5tb2JpbGUtbnVtYmVyLWlucHV0JykpO1xuXHRcdCQoJyNleHRlbnNpb25zLXRhYmxlJykuRGF0YVRhYmxlKHtcblx0XHRcdGxlbmd0aENoYW5nZTogZmFsc2UsXG5cdFx0XHRwYWdpbmc6IGZhbHNlLFxuXHRcdFx0Y29sdW1uczogW1xuXHRcdFx0XHR7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRdLFxuXHRcdFx0b3JkZXI6IFsxLCAnYXNjJ10sXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdFx0ZHJhd0NhbGxiYWNrKCkge1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdCQoJyNhZGQtbmV3LWJ1dHRvbicpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cblx0XHQkKCcuZXh0ZW5zaW9uLXJvdyB0ZCcpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG5cdFx0XHRjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtpZH1gO1xuXHRcdH0pO1xuXHRcdGNvbnN0IGNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNsaXBib2FyZCcpO1xuXHRcdCQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG5cdFx0XHRvbjogJ21hbnVhbCcsXG5cdFx0fSk7XG5cdFx0Y2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcblx0XHRcdCQoZS50cmlnZ2VyKS5wb3B1cCgnc2hvdycpO1xuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdCQoZS50cmlnZ2VyKS5wb3B1cCgnaGlkZScpO1xuXHRcdFx0fSwgMTUwMCk7XG5cdFx0XHRlLmNsZWFyU2VsZWN0aW9uKCk7XG5cdFx0fSk7XG5cblx0XHRjbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ0FjdGlvbjonLCBlLmFjdGlvbik7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdUcmlnZ2VyOicsIGUudHJpZ2dlcik7XG5cdFx0fSk7XG5cdFx0JCgnLmV4dGVuc2lvbi1yb3cgLmNoZWNrYm94Jylcblx0XHRcdC5jaGVja2JveCh7XG5cdFx0XHRcdG9uQ2hlY2tlZCgpIHtcblx0XHRcdFx0XHRjb25zdCBudW1iZXIgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHRcdFx0XHQkLmFwaSh7XG5cdFx0XHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9lbmFibGUvJHtudW1iZXJ9YCxcblx0XHRcdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuXHRcdFx0XHRcdFx0XHRcdCQoYCMke251bWJlcn0gLmRpc2FiaWxpdHlgKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25VbmNoZWNrZWQoKSB7XG5cdFx0XHRcdFx0Y29uc3QgbnVtYmVyID0gJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRcdFx0JC5hcGkoe1xuXHRcdFx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZGlzYWJsZS8ke251bWJlcn1gLFxuXHRcdFx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0XHRcdFx0JChgIyR7bnVtYmVyfSAuZGlzYWJpbGl0eWApLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQmNC90LjRhtC40LDQu9C40LfQuNGA0YPQtdGCINC60YDQsNGB0LjQstC+0LUg0L/RgNC10LTRgdGC0LDQstC70LXQvdC40LUg0L3QvtC80LXRgNC+0LJcblx0ICovXG5cdGluaXRpYWxpemVJbnB1dG1hc2soJGVsKSB7XG5cdFx0aWYgKGV4dGVuc2lvbnNUYWJsZS5tYXNrTGlzdCA9PT0gbnVsbCkge1xuXHRcdFx0Ly8g0J/QvtC00LPQvtGC0L7QstC40Lwg0YLQsNCx0LvQuNGG0YMg0LTQu9GPINGB0L7RgNGC0LjRgNC+0LLQutC4XG5cdFx0XHRleHRlbnNpb25zVGFibGUubWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcblx0XHR9XG5cdFx0JGVsLmlucHV0bWFza3Moe1xuXHRcdFx0aW5wdXRtYXNrOiB7XG5cdFx0XHRcdGRlZmluaXRpb25zOiB7XG5cdFx0XHRcdFx0JyMnOiB7XG5cdFx0XHRcdFx0XHR2YWxpZGF0b3I6ICdbMC05XScsXG5cdFx0XHRcdFx0XHRjYXJkaW5hbGl0eTogMSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdG1hdGNoOiAvWzAtOV0vLFxuXHRcdFx0cmVwbGFjZTogJzknLFxuXHRcdFx0bGlzdDogZXh0ZW5zaW9uc1RhYmxlLm1hc2tMaXN0LFxuXHRcdFx0bGlzdEtleTogJ21hc2snLFxuXHRcdH0pO1xuXHR9LFxufTtcblxuXG5jb25zdCBleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGdyZWVuOiAnPGRpdiBjbGFzcz1cInVpIGdyZWVuIGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2PicsXG5cdGdyZXk6ICc8ZGl2IGNsYXNzPVwidWkgZ3JleSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIj48L2Rpdj4nLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdC8vINCX0LDQv9GD0YHRgtC40Lwg0L7QsdC90L7QstC70LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0L/RgNC+0LLQsNC50LTQtdGA0LBcblx0XHREZWJ1Z2dlckluZm8uaW5pdGlhbGl6ZSgpO1xuXHRcdGV4dGVuc2lvbnNTdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGV4dGVuc2lvbnNTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdGV4dGVuc2lvbnNTdGF0dXNMb29wV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRQYnhBcGkuR2V0UGVlcnNTdGF0dXMoZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIuY2JSZWZyZXNoRXh0ZW5zaW9uc1N0YXR1cyk7XG5cdH0sXG5cdGNiUmVmcmVzaEV4dGVuc2lvbnNTdGF0dXMocmVzcG9uc2UpIHtcblx0XHRleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlID1cblx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGV4dGVuc2lvbnNTdGF0dXNMb29wV29ya2VyLndvcmtlciwgZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIudGltZU91dCk7XG5cdFx0aWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCB8fCByZXNwb25zZSA9PT0gZmFsc2UpIHJldHVybjtcblx0XHRsZXQgaHRtbFRhYmxlID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgY29tcGFjdCB0YWJsZVwiPic7XG5cdFx0JC5lYWNoKHJlc3BvbnNlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8dHI+Jztcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7dmFsdWUuaWR9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dGQ+JHt2YWx1ZS5zdGF0ZX08L3RkPmA7XG5cdFx0XHRodG1sVGFibGUgKz0gJzwvdHI+Jztcblx0XHR9KTtcblx0XHRodG1sVGFibGUgKz0gJzwvdGFibGU+Jztcblx0XHREZWJ1Z2dlckluZm8uVXBkYXRlQ29udGVudChodG1sVGFibGUpO1xuXHRcdCQoJy5leHRlbnNpb24tcm93JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0Y29uc3QgbnVtYmVyID0gJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHRcdGNvbnN0IHJlc3VsdCA9ICQuZ3JlcChyZXNwb25zZSwgZSA9PiBlLmlkID09PSBudW1iZXIpO1xuXHRcdFx0aWYgKHJlc3VsdC5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0Ly8gbm90IGZvdW5kXG5cdFx0XHRcdCQob2JqKS5maW5kKCcuZXh0ZW5zaW9uLXN0YXR1cycpLmh0bWwoZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIuZ3JleSk7XG5cdFx0XHR9IGVsc2UgaWYgKHJlc3VsdFswXS5zdGF0ZS50b1VwcGVyQ2FzZSgpID09PSAnT0snKSB7XG5cdFx0XHRcdCQob2JqKS5maW5kKCcuZXh0ZW5zaW9uLXN0YXR1cycpLmh0bWwoZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIuZ3JlZW4pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JChvYmopLmZpbmQoJy5leHRlbnNpb24tc3RhdHVzJykuaHRtbChleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci5ncmV5KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRleHRlbnNpb25zVGFibGUuaW5pdGlhbGl6ZSgpO1xuXHRleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG59KTtcblxuIl19