"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, ClipboardJS, PbxApi, SemanticLocalization,
DebuggerInfo, InputMaskPatterns */
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc1RhYmxlIiwibWFza0xpc3QiLCJpbml0aWFsaXplIiwiJCIsImVhY2giLCJhdHRyIiwiZ2xvYmFsUm9vdFVybCIsImluaXRpYWxpemVJbnB1dG1hc2siLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsIm9yZGVyIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImRyYXdDYWxsYmFjayIsImFwcGVuZFRvIiwib24iLCJlIiwiaWQiLCJ0YXJnZXQiLCJjbG9zZXN0Iiwid2luZG93IiwibG9jYXRpb24iLCJjbGlwYm9hcmQiLCJDbGlwYm9hcmRKUyIsInBvcHVwIiwidHJpZ2dlciIsInNldFRpbWVvdXQiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsImNoZWNrYm94Iiwib25DaGVja2VkIiwibnVtYmVyIiwiYXBpIiwidXJsIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwicmVtb3ZlQ2xhc3MiLCJvblVuY2hlY2tlZCIsImFkZENsYXNzIiwiJGVsIiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5IiwiZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsImdyZWVuIiwiZ3JleSIsIkRlYnVnZ2VySW5mbyIsInJlc3RhcnRXb3JrZXIiLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4QXBpIiwiR2V0UGVlcnNTdGF0dXMiLCJjYlJlZnJlc2hFeHRlbnNpb25zU3RhdHVzIiwibGVuZ3RoIiwiaHRtbFRhYmxlIiwia2V5IiwidmFsdWUiLCJzdGF0ZSIsIlVwZGF0ZUNvbnRlbnQiLCJpbmRleCIsIm9iaiIsInJlc3VsdCIsImdyZXAiLCJmaW5kIiwiaHRtbCIsInRvVXBwZXJDYXNlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTs7QUFHQSxJQUFNQSxlQUFlLEdBQUc7QUFDdkJDLEVBQUFBLFFBQVEsRUFBRSxJQURhO0FBRXZCQyxFQUFBQSxVQUZ1QjtBQUFBLDBCQUVWO0FBQ1pDLE1BQUFBLENBQUMsQ0FBQyxTQUFELENBQUQsQ0FBYUMsSUFBYixDQUFrQixZQUFZO0FBQzdCLFlBQUlELENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUUUsSUFBUixDQUFhLEtBQWIsTUFBd0IsRUFBNUIsRUFBZ0M7QUFDL0JGLFVBQUFBLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUUUsSUFBUixDQUFhLEtBQWIsWUFBdUJDLGFBQXZCO0FBQ0E7QUFDRCxPQUpEO0FBS0FOLE1BQUFBLGVBQWUsQ0FBQ08sbUJBQWhCLENBQW9DSixDQUFDLENBQUMsMkJBQUQsQ0FBckM7QUFDQUEsTUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJLLFNBQXZCLENBQWlDO0FBQ2hDQyxRQUFBQSxZQUFZLEVBQUUsS0FEa0I7QUFFaENDLFFBQUFBLE1BQU0sRUFBRSxLQUZ3QjtBQUdoQ0MsUUFBQUEsT0FBTyxFQUFFLENBQ1I7QUFBQ0MsVUFBQUEsU0FBUyxFQUFFLEtBQVo7QUFBbUJDLFVBQUFBLFVBQVUsRUFBRTtBQUEvQixTQURRLEVBRVIsSUFGUSxFQUdSLElBSFEsRUFJUixJQUpRLEVBS1IsSUFMUSxFQU1SO0FBQUVELFVBQUFBLFNBQVMsRUFBRSxLQUFiO0FBQW9CQyxVQUFBQSxVQUFVLEVBQUU7QUFBaEMsU0FOUSxDQUh1QjtBQVdoQ0MsUUFBQUEsS0FBSyxFQUFFLENBQUMsQ0FBRCxFQUFJLEtBQUosQ0FYeUI7QUFZaENDLFFBQUFBLFFBQVEsRUFBRUMsb0JBQW9CLENBQUNDLHFCQVpDO0FBYWhDQyxRQUFBQSxZQWJnQztBQUFBLGtDQWFqQixDQUNkOztBQWQrQjtBQUFBO0FBQUEsT0FBakM7QUFpQkFmLE1BQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCZ0IsUUFBckIsQ0FBOEJoQixDQUFDLENBQUMsd0JBQUQsQ0FBL0I7QUFFQUEsTUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJpQixFQUF2QixDQUEwQixVQUExQixFQUFzQyxVQUFDQyxDQUFELEVBQU87QUFDNUMsWUFBTUMsRUFBRSxHQUFHbkIsQ0FBQyxDQUFDa0IsQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixJQUFwQixFQUEwQm5CLElBQTFCLENBQStCLElBQS9CLENBQVg7QUFDQW9CLFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQnBCLGFBQXJCLCtCQUF1RGdCLEVBQXZEO0FBQ0EsT0FIRDtBQUlBLFVBQU1LLFNBQVMsR0FBRyxJQUFJQyxXQUFKLENBQWdCLFlBQWhCLENBQWxCO0FBQ0F6QixNQUFBQSxDQUFDLENBQUMsWUFBRCxDQUFELENBQWdCMEIsS0FBaEIsQ0FBc0I7QUFDckJULFFBQUFBLEVBQUUsRUFBRTtBQURpQixPQUF0QjtBQUdBTyxNQUFBQSxTQUFTLENBQUNQLEVBQVYsQ0FBYSxTQUFiLEVBQXdCLFVBQUNDLENBQUQsRUFBTztBQUM5QmxCLFFBQUFBLENBQUMsQ0FBQ2tCLENBQUMsQ0FBQ1MsT0FBSCxDQUFELENBQWFELEtBQWIsQ0FBbUIsTUFBbkI7QUFDQUUsUUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDaEI1QixVQUFBQSxDQUFDLENBQUNrQixDQUFDLENBQUNTLE9BQUgsQ0FBRCxDQUFhRCxLQUFiLENBQW1CLE1BQW5CO0FBQ0EsU0FGUyxFQUVQLElBRk8sQ0FBVjtBQUdBUixRQUFBQSxDQUFDLENBQUNXLGNBQUY7QUFDQSxPQU5EO0FBUUFMLE1BQUFBLFNBQVMsQ0FBQ1AsRUFBVixDQUFhLE9BQWIsRUFBc0IsVUFBQ0MsQ0FBRCxFQUFPO0FBQzVCWSxRQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBYyxTQUFkLEVBQXlCYixDQUFDLENBQUNjLE1BQTNCO0FBQ0FGLFFBQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLFVBQWQsRUFBMEJiLENBQUMsQ0FBQ1MsT0FBNUI7QUFDQSxPQUhEO0FBSUEzQixNQUFBQSxDQUFDLENBQUMsMEJBQUQsQ0FBRCxDQUNFaUMsUUFERixDQUNXO0FBQ1RDLFFBQUFBLFNBRFM7QUFBQSwrQkFDRztBQUNYLGdCQUFNQyxNQUFNLEdBQUduQyxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFFLElBQVIsQ0FBYSxZQUFiLENBQWY7QUFDQUYsWUFBQUEsQ0FBQyxDQUFDb0MsR0FBRixDQUFNO0FBQ0xDLGNBQUFBLEdBQUcsWUFBS2xDLGFBQUwsK0JBQXVDZ0MsTUFBdkMsQ0FERTtBQUVMbEIsY0FBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTHFCLGNBQUFBLFNBSEs7QUFBQSxtQ0FHS0MsUUFITCxFQUdlO0FBQ25CLHNCQUFJQSxRQUFRLENBQUNDLE9BQWIsRUFBc0I7QUFDckJ4QyxvQkFBQUEsQ0FBQyxZQUFLbUMsTUFBTCxrQkFBRCxDQUE0Qk0sV0FBNUIsQ0FBd0MsVUFBeEM7QUFDQTtBQUNEOztBQVBJO0FBQUE7QUFBQSxhQUFOO0FBU0E7O0FBWlE7QUFBQTtBQWFUQyxRQUFBQSxXQWJTO0FBQUEsaUNBYUs7QUFDYixnQkFBTVAsTUFBTSxHQUFHbkMsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRRSxJQUFSLENBQWEsWUFBYixDQUFmO0FBQ0FGLFlBQUFBLENBQUMsQ0FBQ29DLEdBQUYsQ0FBTTtBQUNMQyxjQUFBQSxHQUFHLFlBQUtsQyxhQUFMLGdDQUF3Q2dDLE1BQXhDLENBREU7QUFFTGxCLGNBQUFBLEVBQUUsRUFBRSxLQUZDO0FBR0xxQixjQUFBQSxTQUhLO0FBQUEsbUNBR0tDLFFBSEwsRUFHZTtBQUNuQixzQkFBSUEsUUFBUSxDQUFDQyxPQUFiLEVBQXNCO0FBQ3JCeEMsb0JBQUFBLENBQUMsWUFBS21DLE1BQUwsa0JBQUQsQ0FBNEJRLFFBQTVCLENBQXFDLFVBQXJDO0FBQ0E7QUFDRDs7QUFQSTtBQUFBO0FBQUEsYUFBTjtBQVNBOztBQXhCUTtBQUFBO0FBQUEsT0FEWDtBQTJCQTs7QUEzRXNCO0FBQUE7O0FBNEV2Qjs7O0FBR0F2QyxFQUFBQSxtQkEvRXVCO0FBQUEsaUNBK0VId0MsR0EvRUcsRUErRUU7QUFDeEIsVUFBSS9DLGVBQWUsQ0FBQ0MsUUFBaEIsS0FBNkIsSUFBakMsRUFBdUM7QUFDdEM7QUFDQUQsUUFBQUEsZUFBZSxDQUFDQyxRQUFoQixHQUEyQkUsQ0FBQyxDQUFDNkMsU0FBRixDQUFZQyxpQkFBWixFQUErQixDQUFDLEdBQUQsQ0FBL0IsRUFBc0MsU0FBdEMsRUFBaUQsTUFBakQsQ0FBM0I7QUFDQTs7QUFDREYsTUFBQUEsR0FBRyxDQUFDRyxVQUFKLENBQWU7QUFDZEMsUUFBQUEsU0FBUyxFQUFFO0FBQ1ZDLFVBQUFBLFdBQVcsRUFBRTtBQUNaLGlCQUFLO0FBQ0pDLGNBQUFBLFNBQVMsRUFBRSxPQURQO0FBRUpDLGNBQUFBLFdBQVcsRUFBRTtBQUZUO0FBRE87QUFESCxTQURHO0FBU2RDLFFBQUFBLEtBQUssRUFBRSxPQVRPO0FBVWRDLFFBQUFBLE9BQU8sRUFBRSxHQVZLO0FBV2RDLFFBQUFBLElBQUksRUFBRXpELGVBQWUsQ0FBQ0MsUUFYUjtBQVlkeUQsUUFBQUEsT0FBTyxFQUFFO0FBWkssT0FBZjtBQWNBOztBQWxHc0I7QUFBQTtBQUFBLENBQXhCO0FBc0dBLElBQU1DLDBCQUEwQixHQUFHO0FBQ2xDQyxFQUFBQSxPQUFPLEVBQUUsSUFEeUI7QUFFbENDLEVBQUFBLGFBQWEsRUFBRSxFQUZtQjtBQUdsQ0MsRUFBQUEsS0FBSyxFQUFFLG1GQUgyQjtBQUlsQ0MsRUFBQUEsSUFBSSxFQUFFLGtGQUo0QjtBQUtsQzdELEVBQUFBLFVBTGtDO0FBQUEsMEJBS3JCO0FBQ1o7QUFDQThELE1BQUFBLFlBQVksQ0FBQzlELFVBQWI7QUFDQXlELE1BQUFBLDBCQUEwQixDQUFDTSxhQUEzQjtBQUNBOztBQVRpQztBQUFBO0FBVWxDQSxFQUFBQSxhQVZrQztBQUFBLDZCQVVsQjtBQUNmeEMsTUFBQUEsTUFBTSxDQUFDeUMsWUFBUCxDQUFvQlAsMEJBQTBCLENBQUNRLGFBQS9DO0FBQ0FSLE1BQUFBLDBCQUEwQixDQUFDUyxNQUEzQjtBQUNBOztBQWJpQztBQUFBO0FBY2xDQSxFQUFBQSxNQWRrQztBQUFBLHNCQWN6QjtBQUNSM0MsTUFBQUEsTUFBTSxDQUFDeUMsWUFBUCxDQUFvQlAsMEJBQTBCLENBQUNRLGFBQS9DO0FBQ0FFLE1BQUFBLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQlgsMEJBQTBCLENBQUNZLHlCQUFqRDtBQUNBOztBQWpCaUM7QUFBQTtBQWtCbENBLEVBQUFBLHlCQWxCa0M7QUFBQSx1Q0FrQlI3QixRQWxCUSxFQWtCRTtBQUNuQ2lCLE1BQUFBLDBCQUEwQixDQUFDUSxhQUEzQixHQUNDMUMsTUFBTSxDQUFDTSxVQUFQLENBQWtCNEIsMEJBQTBCLENBQUNTLE1BQTdDLEVBQXFEVCwwQkFBMEIsQ0FBQ0MsT0FBaEYsQ0FERDtBQUVBLFVBQUlsQixRQUFRLENBQUM4QixNQUFULEtBQW9CLENBQXBCLElBQXlCOUIsUUFBUSxLQUFLLEtBQTFDLEVBQWlEO0FBQ2pELFVBQUkrQixTQUFTLEdBQUcsdUNBQWhCO0FBQ0F0RSxNQUFBQSxDQUFDLENBQUNDLElBQUYsQ0FBT3NDLFFBQVAsRUFBaUIsVUFBQ2dDLEdBQUQsRUFBTUMsS0FBTixFQUFnQjtBQUNoQ0YsUUFBQUEsU0FBUyxJQUFJLE1BQWI7QUFDQUEsUUFBQUEsU0FBUyxrQkFBV0UsS0FBSyxDQUFDckQsRUFBakIsVUFBVDtBQUNBbUQsUUFBQUEsU0FBUyxrQkFBV0UsS0FBSyxDQUFDQyxLQUFqQixVQUFUO0FBQ0FILFFBQUFBLFNBQVMsSUFBSSxPQUFiO0FBQ0EsT0FMRDtBQU1BQSxNQUFBQSxTQUFTLElBQUksVUFBYjtBQUNBVCxNQUFBQSxZQUFZLENBQUNhLGFBQWIsQ0FBMkJKLFNBQTNCO0FBQ0F0RSxNQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQkMsSUFBcEIsQ0FBeUIsVUFBQzBFLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUN4QyxZQUFNekMsTUFBTSxHQUFHbkMsQ0FBQyxDQUFDNEUsR0FBRCxDQUFELENBQU8xRSxJQUFQLENBQVksWUFBWixDQUFmO0FBQ0EsWUFBTTJFLE1BQU0sR0FBRzdFLENBQUMsQ0FBQzhFLElBQUYsQ0FBT3ZDLFFBQVAsRUFBaUIsVUFBQXJCLENBQUM7QUFBQSxpQkFBSUEsQ0FBQyxDQUFDQyxFQUFGLEtBQVNnQixNQUFiO0FBQUEsU0FBbEIsQ0FBZjs7QUFDQSxZQUFJMEMsTUFBTSxDQUFDUixNQUFQLEtBQWtCLENBQXRCLEVBQXlCO0FBQ3hCO0FBQ0FyRSxVQUFBQSxDQUFDLENBQUM0RSxHQUFELENBQUQsQ0FBT0csSUFBUCxDQUFZLG1CQUFaLEVBQWlDQyxJQUFqQyxDQUFzQ3hCLDBCQUEwQixDQUFDSSxJQUFqRTtBQUNBLFNBSEQsTUFHTyxJQUFJaUIsTUFBTSxDQUFDLENBQUQsQ0FBTixDQUFVSixLQUFWLENBQWdCUSxXQUFoQixPQUFrQyxJQUF0QyxFQUE0QztBQUNsRGpGLFVBQUFBLENBQUMsQ0FBQzRFLEdBQUQsQ0FBRCxDQUFPRyxJQUFQLENBQVksbUJBQVosRUFBaUNDLElBQWpDLENBQXNDeEIsMEJBQTBCLENBQUNHLEtBQWpFO0FBQ0EsU0FGTSxNQUVBO0FBQ04zRCxVQUFBQSxDQUFDLENBQUM0RSxHQUFELENBQUQsQ0FBT0csSUFBUCxDQUFZLG1CQUFaLEVBQWlDQyxJQUFqQyxDQUFzQ3hCLDBCQUEwQixDQUFDSSxJQUFqRTtBQUNBO0FBQ0QsT0FYRDtBQVlBOztBQTNDaUM7QUFBQTtBQUFBLENBQW5DO0FBK0NBNUQsQ0FBQyxDQUFDa0YsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUN2QnRGLEVBQUFBLGVBQWUsQ0FBQ0UsVUFBaEI7QUFDQXlELEVBQUFBLDBCQUEwQixDQUFDekQsVUFBM0I7QUFDQSxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBDbGlwYm9hcmRKUywgUGJ4QXBpLCBTZW1hbnRpY0xvY2FsaXphdGlvbixcbkRlYnVnZ2VySW5mbywgSW5wdXRNYXNrUGF0dGVybnMgKi9cblxuY29uc3QgZXh0ZW5zaW9uc1RhYmxlID0ge1xuXHRtYXNrTGlzdDogbnVsbCxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcuYXZhdGFyJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoJCh0aGlzKS5hdHRyKCdzcmMnKSA9PT0gJycpIHtcblx0XHRcdFx0JCh0aGlzKS5hdHRyKCdzcmMnLCBgJHtnbG9iYWxSb290VXJsfWFzc2V0cy9pbWcvdW5rbm93blBlcnNvbi5qcGdgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRleHRlbnNpb25zVGFibGUuaW5pdGlhbGl6ZUlucHV0bWFzaygkKCdpbnB1dC5tb2JpbGUtbnVtYmVyLWlucHV0JykpO1xuXHRcdCQoJyNleHRlbnNpb25zLXRhYmxlJykuRGF0YVRhYmxlKHtcblx0XHRcdGxlbmd0aENoYW5nZTogZmFsc2UsXG5cdFx0XHRwYWdpbmc6IGZhbHNlLFxuXHRcdFx0Y29sdW1uczogW1xuXHRcdFx0XHR7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHRudWxsLFxuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRdLFxuXHRcdFx0b3JkZXI6IFsxLCAnYXNjJ10sXG5cdFx0XHRsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuXHRcdFx0ZHJhd0NhbGxiYWNrKCkge1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdCQoJyNhZGQtbmV3LWJ1dHRvbicpLmFwcGVuZFRvKCQoJ2Rpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cblx0XHQkKCcuZXh0ZW5zaW9uLXJvdyB0ZCcpLm9uKCdkYmxjbGljaycsIChlKSA9PiB7XG5cdFx0XHRjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9tb2RpZnkvJHtpZH1gO1xuXHRcdH0pO1xuXHRcdGNvbnN0IGNsaXBib2FyZCA9IG5ldyBDbGlwYm9hcmRKUygnLmNsaXBib2FyZCcpO1xuXHRcdCQoJy5jbGlwYm9hcmQnKS5wb3B1cCh7XG5cdFx0XHRvbjogJ21hbnVhbCcsXG5cdFx0fSk7XG5cdFx0Y2xpcGJvYXJkLm9uKCdzdWNjZXNzJywgKGUpID0+IHtcblx0XHRcdCQoZS50cmlnZ2VyKS5wb3B1cCgnc2hvdycpO1xuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdCQoZS50cmlnZ2VyKS5wb3B1cCgnaGlkZScpO1xuXHRcdFx0fSwgMTUwMCk7XG5cdFx0XHRlLmNsZWFyU2VsZWN0aW9uKCk7XG5cdFx0fSk7XG5cblx0XHRjbGlwYm9hcmQub24oJ2Vycm9yJywgKGUpID0+IHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ0FjdGlvbjonLCBlLmFjdGlvbik7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdUcmlnZ2VyOicsIGUudHJpZ2dlcik7XG5cdFx0fSk7XG5cdFx0JCgnLmV4dGVuc2lvbi1yb3cgLmNoZWNrYm94Jylcblx0XHRcdC5jaGVja2JveCh7XG5cdFx0XHRcdG9uQ2hlY2tlZCgpIHtcblx0XHRcdFx0XHRjb25zdCBudW1iZXIgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHRcdFx0XHQkLmFwaSh7XG5cdFx0XHRcdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9ZXh0ZW5zaW9ucy9lbmFibGUvJHtudW1iZXJ9YCxcblx0XHRcdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuXHRcdFx0XHRcdFx0XHRcdCQoYCMke251bWJlcn0gLmRpc2FiaWxpdHlgKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0b25VbmNoZWNrZWQoKSB7XG5cdFx0XHRcdFx0Y29uc3QgbnVtYmVyID0gJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRcdFx0JC5hcGkoe1xuXHRcdFx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZGlzYWJsZS8ke251bWJlcn1gLFxuXHRcdFx0XHRcdFx0b246ICdub3cnLFxuXHRcdFx0XHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG5cdFx0XHRcdFx0XHRcdFx0JChgIyR7bnVtYmVyfSAuZGlzYWJpbGl0eWApLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiDQmNC90LjRhtC40LDQu9C40LfQuNGA0YPQtdGCINC60YDQsNGB0LjQstC+0LUg0L/RgNC10LTRgdGC0LDQstC70LXQvdC40LUg0L3QvtC80LXRgNC+0LJcblx0ICovXG5cdGluaXRpYWxpemVJbnB1dG1hc2soJGVsKSB7XG5cdFx0aWYgKGV4dGVuc2lvbnNUYWJsZS5tYXNrTGlzdCA9PT0gbnVsbCkge1xuXHRcdFx0Ly8g0J/QvtC00LPQvtGC0L7QstC40Lwg0YLQsNCx0LvQuNGG0YMg0LTQu9GPINGB0L7RgNGC0LjRgNC+0LLQutC4XG5cdFx0XHRleHRlbnNpb25zVGFibGUubWFza0xpc3QgPSAkLm1hc2tzU29ydChJbnB1dE1hc2tQYXR0ZXJucywgWycjJ10sIC9bMC05XXwjLywgJ21hc2snKTtcblx0XHR9XG5cdFx0JGVsLmlucHV0bWFza3Moe1xuXHRcdFx0aW5wdXRtYXNrOiB7XG5cdFx0XHRcdGRlZmluaXRpb25zOiB7XG5cdFx0XHRcdFx0JyMnOiB7XG5cdFx0XHRcdFx0XHR2YWxpZGF0b3I6ICdbMC05XScsXG5cdFx0XHRcdFx0XHRjYXJkaW5hbGl0eTogMSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHRcdG1hdGNoOiAvWzAtOV0vLFxuXHRcdFx0cmVwbGFjZTogJzknLFxuXHRcdFx0bGlzdDogZXh0ZW5zaW9uc1RhYmxlLm1hc2tMaXN0LFxuXHRcdFx0bGlzdEtleTogJ21hc2snLFxuXHRcdH0pO1xuXHR9LFxufTtcblxuXG5jb25zdCBleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlciA9IHtcblx0dGltZU91dDogMzAwMCxcblx0dGltZU91dEhhbmRsZTogJycsXG5cdGdyZWVuOiAnPGRpdiBjbGFzcz1cInVpIGdyZWVuIGVtcHR5IGNpcmN1bGFyIGxhYmVsXCIgc3R5bGU9XCJ3aWR0aDogMXB4O2hlaWdodDogMXB4O1wiPjwvZGl2PicsXG5cdGdyZXk6ICc8ZGl2IGNsYXNzPVwidWkgZ3JleSBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIj48L2Rpdj4nLFxuXHRpbml0aWFsaXplKCkge1xuXHRcdC8vINCX0LDQv9GD0YHRgtC40Lwg0L7QsdC90L7QstC70LXQvdC40LUg0YHRgtCw0YLRg9GB0LAg0L/RgNC+0LLQsNC50LTQtdGA0LBcblx0XHREZWJ1Z2dlckluZm8uaW5pdGlhbGl6ZSgpO1xuXHRcdGV4dGVuc2lvbnNTdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcblx0fSxcblx0cmVzdGFydFdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGV4dGVuc2lvbnNTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdGV4dGVuc2lvbnNTdGF0dXNMb29wV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRQYnhBcGkuR2V0UGVlcnNTdGF0dXMoZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIuY2JSZWZyZXNoRXh0ZW5zaW9uc1N0YXR1cyk7XG5cdH0sXG5cdGNiUmVmcmVzaEV4dGVuc2lvbnNTdGF0dXMocmVzcG9uc2UpIHtcblx0XHRleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlID1cblx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGV4dGVuc2lvbnNTdGF0dXNMb29wV29ya2VyLndvcmtlciwgZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIudGltZU91dCk7XG5cdFx0aWYgKHJlc3BvbnNlLmxlbmd0aCA9PT0gMCB8fCByZXNwb25zZSA9PT0gZmFsc2UpIHJldHVybjtcblx0XHRsZXQgaHRtbFRhYmxlID0gJzx0YWJsZSBjbGFzcz1cInVpIHZlcnkgY29tcGFjdCB0YWJsZVwiPic7XG5cdFx0JC5lYWNoKHJlc3BvbnNlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8dHI+Jztcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7dmFsdWUuaWR9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9IGA8dGQ+JHt2YWx1ZS5zdGF0ZX08L3RkPmA7XG5cdFx0XHRodG1sVGFibGUgKz0gJzwvdHI+Jztcblx0XHR9KTtcblx0XHRodG1sVGFibGUgKz0gJzwvdGFibGU+Jztcblx0XHREZWJ1Z2dlckluZm8uVXBkYXRlQ29udGVudChodG1sVGFibGUpO1xuXHRcdCQoJy5leHRlbnNpb24tcm93JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuXHRcdFx0Y29uc3QgbnVtYmVyID0gJChvYmopLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHRcdGNvbnN0IHJlc3VsdCA9ICQuZ3JlcChyZXNwb25zZSwgZSA9PiBlLmlkID09PSBudW1iZXIpO1xuXHRcdFx0aWYgKHJlc3VsdC5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0Ly8gbm90IGZvdW5kXG5cdFx0XHRcdCQob2JqKS5maW5kKCcuZXh0ZW5zaW9uLXN0YXR1cycpLmh0bWwoZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIuZ3JleSk7XG5cdFx0XHR9IGVsc2UgaWYgKHJlc3VsdFswXS5zdGF0ZS50b1VwcGVyQ2FzZSgpID09PSAnT0snKSB7XG5cdFx0XHRcdCQob2JqKS5maW5kKCcuZXh0ZW5zaW9uLXN0YXR1cycpLmh0bWwoZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIuZ3JlZW4pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JChvYmopLmZpbmQoJy5leHRlbnNpb24tc3RhdHVzJykuaHRtbChleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci5ncmV5KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fSxcbn07XG5cblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRleHRlbnNpb25zVGFibGUuaW5pdGlhbGl6ZSgpO1xuXHRleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci5pbml0aWFsaXplKCk7XG59KTtcblxuIl19