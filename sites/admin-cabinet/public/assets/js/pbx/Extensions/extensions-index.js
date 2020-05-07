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
          $(this).attr('src', "".concat(globalRootUrl, "public/assets/img/unknownPerson.jpg"));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9FeHRlbnNpb25zL2V4dGVuc2lvbnMtaW5kZXguanMiXSwibmFtZXMiOlsiZXh0ZW5zaW9uc1RhYmxlIiwibWFza0xpc3QiLCJpbml0aWFsaXplIiwiJCIsImVhY2giLCJhdHRyIiwiZ2xvYmFsUm9vdFVybCIsImluaXRpYWxpemVJbnB1dG1hc2siLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsIm9yZGVyIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImRyYXdDYWxsYmFjayIsImFwcGVuZFRvIiwib24iLCJlIiwiaWQiLCJ0YXJnZXQiLCJjbG9zZXN0Iiwid2luZG93IiwibG9jYXRpb24iLCJjbGlwYm9hcmQiLCJDbGlwYm9hcmRKUyIsInBvcHVwIiwidHJpZ2dlciIsInNldFRpbWVvdXQiLCJjbGVhclNlbGVjdGlvbiIsImNvbnNvbGUiLCJlcnJvciIsImFjdGlvbiIsImNoZWNrYm94Iiwib25DaGVja2VkIiwibnVtYmVyIiwiYXBpIiwidXJsIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwicmVtb3ZlQ2xhc3MiLCJvblVuY2hlY2tlZCIsImFkZENsYXNzIiwiJGVsIiwibWFza3NTb3J0IiwiSW5wdXRNYXNrUGF0dGVybnMiLCJpbnB1dG1hc2tzIiwiaW5wdXRtYXNrIiwiZGVmaW5pdGlvbnMiLCJ2YWxpZGF0b3IiLCJjYXJkaW5hbGl0eSIsIm1hdGNoIiwicmVwbGFjZSIsImxpc3QiLCJsaXN0S2V5IiwiZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsImdyZWVuIiwiZ3JleSIsIkRlYnVnZ2VySW5mbyIsInJlc3RhcnRXb3JrZXIiLCJjbGVhclRpbWVvdXQiLCJ0aW1lb3V0SGFuZGxlIiwid29ya2VyIiwiUGJ4QXBpIiwiR2V0UGVlcnNTdGF0dXMiLCJjYlJlZnJlc2hFeHRlbnNpb25zU3RhdHVzIiwibGVuZ3RoIiwiaHRtbFRhYmxlIiwia2V5IiwidmFsdWUiLCJzdGF0ZSIsIlVwZGF0ZUNvbnRlbnQiLCJpbmRleCIsIm9iaiIsInJlc3VsdCIsImdyZXAiLCJmaW5kIiwiaHRtbCIsInRvVXBwZXJDYXNlIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7Ozs7Ozs7QUFRQTs7QUFHQSxJQUFNQSxlQUFlLEdBQUc7QUFDdkJDLEVBQUFBLFFBQVEsRUFBRSxJQURhO0FBRXZCQyxFQUFBQSxVQUZ1QjtBQUFBLDBCQUVWO0FBQ1pDLE1BQUFBLENBQUMsQ0FBQyxTQUFELENBQUQsQ0FBYUMsSUFBYixDQUFrQixZQUFZO0FBQzdCLFlBQUlELENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUUUsSUFBUixDQUFhLEtBQWIsTUFBd0IsRUFBNUIsRUFBZ0M7QUFDL0JGLFVBQUFBLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUUUsSUFBUixDQUFhLEtBQWIsWUFBdUJDLGFBQXZCO0FBQ0E7QUFDRCxPQUpEO0FBS0FOLE1BQUFBLGVBQWUsQ0FBQ08sbUJBQWhCLENBQW9DSixDQUFDLENBQUMsMkJBQUQsQ0FBckM7QUFDQUEsTUFBQUEsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJLLFNBQXZCLENBQWlDO0FBQ2hDQyxRQUFBQSxZQUFZLEVBQUUsS0FEa0I7QUFFaENDLFFBQUFBLE1BQU0sRUFBRSxLQUZ3QjtBQUdoQ0MsUUFBQUEsT0FBTyxFQUFFLENBQ1I7QUFBQ0MsVUFBQUEsU0FBUyxFQUFFLEtBQVo7QUFBbUJDLFVBQUFBLFVBQVUsRUFBRTtBQUEvQixTQURRLEVBRVIsSUFGUSxFQUdSLElBSFEsRUFJUixJQUpRLEVBS1IsSUFMUSxFQU1SO0FBQUVELFVBQUFBLFNBQVMsRUFBRSxLQUFiO0FBQW9CQyxVQUFBQSxVQUFVLEVBQUU7QUFBaEMsU0FOUSxDQUh1QjtBQVdoQ0MsUUFBQUEsS0FBSyxFQUFFLENBQUMsQ0FBRCxF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QUFDQSxDQUhEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBDbGlwYm9hcmRKUywgUGJ4QXBpLCBTZW1hbnRpY0xvY2FsaXphdGlvbixcbkRlYnVnZ2VySW5mbywgSW5wdXRNYXNrUGF0dGVybnMgKi9cblxuY29uc3QgZXh0ZW5zaW9uc1RhYmxlID0ge1xuXHRtYXNrTGlzdDogbnVsbCxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcuYXZhdGFyJykuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoJCh0aGlzKS5hdHRyKCdzcmMnKSA9PT0gJycpIHtcblx0XHRcdFx0JCh0aGlzKS5hdHRyKCdzcmMnLCBgJHtnbG9iYWxSb290VXJsfXB1YmxpYy9hc3NldHMvaW1nL3Vua25vd25QZXJzb24uanBnYCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0ZXh0ZW5zaW9uc1RhYmxlLmluaXRpYWxpemVJbnB1dG1hc2soJCgnaW5wdXQubW9iaWxlLW51bWJlci1pbnB1dCcpKTtcblx0XHQkKCcjZXh0ZW5zaW9ucy10YWJsZScpLkRhdGFUYWJsZSh7XG5cdFx0XHRsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuXHRcdFx0cGFnaW5nOiBmYWxzZSxcblx0XHRcdGNvbHVtbnM6IFtcblx0XHRcdFx0e29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0eyBvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZSB9LFxuXHRcdFx0XSxcblx0XHRcdG9yZGVyOiBbMSwgJ2FzYyddLFxuXHRcdFx0bGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcblx0XHRcdGRyYXdDYWxsYmFjaygpIHtcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHQkKCcjYWRkLW5ldy1idXR0b24nKS5hcHBlbmRUbygkKCdkaXYuZWlnaHQuY29sdW1uOmVxKDApJykpO1xuXG5cdFx0JCgnLmV4dGVuc2lvbi1yb3cgdGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0Y29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2lkJyk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvbW9kaWZ5LyR7aWR9YDtcblx0XHR9KTtcblx0XHRjb25zdCBjbGlwYm9hcmQgPSBuZXcgQ2xpcGJvYXJkSlMoJy5jbGlwYm9hcmQnKTtcblx0XHQkKCcuY2xpcGJvYXJkJykucG9wdXAoe1xuXHRcdFx0b246ICdtYW51YWwnLFxuXHRcdH0pO1xuXHRcdGNsaXBib2FyZC5vbignc3VjY2VzcycsIChlKSA9PiB7XG5cdFx0XHQkKGUudHJpZ2dlcikucG9wdXAoJ3Nob3cnKTtcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0XHQkKGUudHJpZ2dlcikucG9wdXAoJ2hpZGUnKTtcblx0XHRcdH0sIDE1MDApO1xuXHRcdFx0ZS5jbGVhclNlbGVjdGlvbigpO1xuXHRcdH0pO1xuXG5cdFx0Y2xpcGJvYXJkLm9uKCdlcnJvcicsIChlKSA9PiB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdBY3Rpb246JywgZS5hY3Rpb24pO1xuXHRcdFx0Y29uc29sZS5lcnJvcignVHJpZ2dlcjonLCBlLnRyaWdnZXIpO1xuXHRcdH0pO1xuXHRcdCQoJy5leHRlbnNpb24tcm93IC5jaGVja2JveCcpXG5cdFx0XHQuY2hlY2tib3goe1xuXHRcdFx0XHRvbkNoZWNrZWQoKSB7XG5cdFx0XHRcdFx0Y29uc3QgbnVtYmVyID0gJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRcdFx0JC5hcGkoe1xuXHRcdFx0XHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfWV4dGVuc2lvbnMvZW5hYmxlLyR7bnVtYmVyfWAsXG5cdFx0XHRcdFx0XHRvbjogJ25vdycsXG5cdFx0XHRcdFx0XHRvblN1Y2Nlc3MocmVzcG9uc2UpIHtcblx0XHRcdFx0XHRcdFx0aWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcblx0XHRcdFx0XHRcdFx0XHQkKGAjJHtudW1iZXJ9IC5kaXNhYmlsaXR5YCkucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG9uVW5jaGVja2VkKCkge1xuXHRcdFx0XHRcdGNvbnN0IG51bWJlciA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuXHRcdFx0XHRcdCQuYXBpKHtcblx0XHRcdFx0XHRcdHVybDogYCR7Z2xvYmFsUm9vdFVybH1leHRlbnNpb25zL2Rpc2FibGUvJHtudW1iZXJ9YCxcblx0XHRcdFx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdFx0XHRcdG9uU3VjY2VzcyhyZXNwb25zZSkge1xuXHRcdFx0XHRcdFx0XHRpZiAocmVzcG9uc2Uuc3VjY2Vzcykge1xuXHRcdFx0XHRcdFx0XHRcdCQoYCMke251bWJlcn0gLmRpc2FiaWxpdHlgKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSxcblx0XHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICog0JjQvdC40YbQuNCw0LvQuNC30LjRgNGD0LXRgiDQutGA0LDRgdC40LLQvtC1INC/0YDQtdC00YHRgtCw0LLQu9C10L3QuNC1INC90L7QvNC10YDQvtCyXG5cdCAqL1xuXHRpbml0aWFsaXplSW5wdXRtYXNrKCRlbCkge1xuXHRcdGlmIChleHRlbnNpb25zVGFibGUubWFza0xpc3QgPT09IG51bGwpIHtcblx0XHRcdC8vINCf0L7QtNCz0L7RgtC+0LLQuNC8INGC0LDQsdC70LjRhtGDINC00LvRjyDRgdC+0YDRgtC40YDQvtCy0LrQuFxuXHRcdFx0ZXh0ZW5zaW9uc1RhYmxlLm1hc2tMaXN0ID0gJC5tYXNrc1NvcnQoSW5wdXRNYXNrUGF0dGVybnMsIFsnIyddLCAvWzAtOV18Iy8sICdtYXNrJyk7XG5cdFx0fVxuXHRcdCRlbC5pbnB1dG1hc2tzKHtcblx0XHRcdGlucHV0bWFzazoge1xuXHRcdFx0XHRkZWZpbml0aW9uczoge1xuXHRcdFx0XHRcdCcjJzoge1xuXHRcdFx0XHRcdFx0dmFsaWRhdG9yOiAnWzAtOV0nLFxuXHRcdFx0XHRcdFx0Y2FyZGluYWxpdHk6IDEsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRtYXRjaDogL1swLTldLyxcblx0XHRcdHJlcGxhY2U6ICc5Jyxcblx0XHRcdGxpc3Q6IGV4dGVuc2lvbnNUYWJsZS5tYXNrTGlzdCxcblx0XHRcdGxpc3RLZXk6ICdtYXNrJyxcblx0XHR9KTtcblx0fSxcbn07XG5cblxuY29uc3QgZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIgPSB7XG5cdHRpbWVPdXQ6IDMwMDAsXG5cdHRpbWVPdXRIYW5kbGU6ICcnLFxuXHRncmVlbjogJzxkaXYgY2xhc3M9XCJ1aSBncmVlbiBlbXB0eSBjaXJjdWxhciBsYWJlbFwiIHN0eWxlPVwid2lkdGg6IDFweDtoZWlnaHQ6IDFweDtcIj48L2Rpdj4nLFxuXHRncmV5OiAnPGRpdiBjbGFzcz1cInVpIGdyZXkgZW1wdHkgY2lyY3VsYXIgbGFiZWxcIiBzdHlsZT1cIndpZHRoOiAxcHg7aGVpZ2h0OiAxcHg7XCI+PC9kaXY+Jyxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQvLyDQl9Cw0L/Rg9GB0YLQuNC8INC+0LHQvdC+0LLQu9C10L3QuNC1INGB0YLQsNGC0YPRgdCwINC/0YDQvtCy0LDQudC00LXRgNCwXG5cdFx0RGVidWdnZXJJbmZvLmluaXRpYWxpemUoKTtcblx0XHRleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci5yZXN0YXJ0V29ya2VyKCk7XG5cdH0sXG5cdHJlc3RhcnRXb3JrZXIoKSB7XG5cdFx0d2luZG93LmNsZWFyVGltZW91dChleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci53b3JrZXIoKTtcblx0fSxcblx0d29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0UGJ4QXBpLkdldFBlZXJzU3RhdHVzKGV4dGVuc2lvbnNTdGF0dXNMb29wV29ya2VyLmNiUmVmcmVzaEV4dGVuc2lvbnNTdGF0dXMpO1xuXHR9LFxuXHRjYlJlZnJlc2hFeHRlbnNpb25zU3RhdHVzKHJlc3BvbnNlKSB7XG5cdFx0ZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSA9XG5cdFx0XHR3aW5kb3cuc2V0VGltZW91dChleHRlbnNpb25zU3RhdHVzTG9vcFdvcmtlci53b3JrZXIsIGV4dGVuc2lvbnNTdGF0dXNMb29wV29ya2VyLnRpbWVPdXQpO1xuXHRcdGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSByZXR1cm47XG5cdFx0bGV0IGh0bWxUYWJsZSA9ICc8dGFibGUgY2xhc3M9XCJ1aSB2ZXJ5IGNvbXBhY3QgdGFibGVcIj4nO1xuXHRcdCQuZWFjaChyZXNwb25zZSwgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdGh0bWxUYWJsZSArPSAnPHRyPic7XG5cdFx0XHRodG1sVGFibGUgKz0gYDx0ZD4ke3ZhbHVlLmlkfTwvdGQ+YDtcblx0XHRcdGh0bWxUYWJsZSArPSBgPHRkPiR7dmFsdWUuc3RhdGV9PC90ZD5gO1xuXHRcdFx0aHRtbFRhYmxlICs9ICc8L3RyPic7XG5cdFx0fSk7XG5cdFx0aHRtbFRhYmxlICs9ICc8L3RhYmxlPic7XG5cdFx0RGVidWdnZXJJbmZvLlVwZGF0ZUNvbnRlbnQoaHRtbFRhYmxlKTtcblx0XHQkKCcuZXh0ZW5zaW9uLXJvdycpLmVhY2goKGluZGV4LCBvYmopID0+IHtcblx0XHRcdGNvbnN0IG51bWJlciA9ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cdFx0XHRjb25zdCByZXN1bHQgPSAkLmdyZXAocmVzcG9uc2UsIGUgPT4gZS5pZCA9PT0gbnVtYmVyKTtcblx0XHRcdGlmIChyZXN1bHQubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdC8vIG5vdCBmb3VuZFxuXHRcdFx0XHQkKG9iaikuZmluZCgnLmV4dGVuc2lvbi1zdGF0dXMnKS5odG1sKGV4dGVuc2lvbnNTdGF0dXNMb29wV29ya2VyLmdyZXkpO1xuXHRcdFx0fSBlbHNlIGlmIChyZXN1bHRbMF0uc3RhdGUudG9VcHBlckNhc2UoKSA9PT0gJ09LJykge1xuXHRcdFx0XHQkKG9iaikuZmluZCgnLmV4dGVuc2lvbi1zdGF0dXMnKS5odG1sKGV4dGVuc2lvbnNTdGF0dXNMb29wV29ya2VyLmdyZWVuKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQob2JqKS5maW5kKCcuZXh0ZW5zaW9uLXN0YXR1cycpLmh0bWwoZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIuZ3JleSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG59O1xuXG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0ZXh0ZW5zaW9uc1RhYmxlLmluaXRpYWxpemUoKTtcblx0ZXh0ZW5zaW9uc1N0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==