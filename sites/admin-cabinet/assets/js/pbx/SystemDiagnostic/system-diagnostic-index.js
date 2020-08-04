/*
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2020
 */

"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global sessionStorage, ace, PbxApi */
var systemDiagnostic = {
  $startBtn: $('#start-capture-button'),
  $stopBtn: $('#stop-capture-button'),
  $showBtn:  $('#show-last-log'),
  viewer: '',
  $tabMenuItems: $('#system-diagnostic-menu .item'),
  $fileSelectDropDown: $('#system-diagnostic-form .type-select'),

  initialize: function () {
    function initialize() {
      systemDiagnostic.$tabMenuItems.tab();
      systemDiagnostic.$tabMenuItems.tab('change tab', 'show-log');
      systemDiagnostic.$fileSelectDropDown.dropdown({
        onChange: function () {
          function onChange() {
            // customFile.getFileContentFromServer();
            console.log('Change filename...');
          }
          return onChange;
        }()
      });
      systemDiagnostic.$showBtn.on('click', function (e) {
        e.preventDefault();
        let Lines = $('#lines').val();
        if(!jQuery.isNumeric( Lines)){
          Lines = 500;
        }
        PbxApi.GetLogFromFile($('#filenames').val(), $('#filter').val(), Lines , systemDiagnostic.cbUpdateLogText)
      });

      if (sessionStorage.getItem('LogsCaptureStatus') === 'started') {
        systemDiagnostic.$startBtn.addClass('disabled loading');
        systemDiagnostic.$stopBtn.removeClass('disabled');
      } else {
        systemDiagnostic.$startBtn.removeClass('disabled loading');
        systemDiagnostic.$stopBtn.addClass('disabled');
      }

      systemDiagnostic.$startBtn.on('click', function (e) {
        e.preventDefault();
        systemDiagnostic.$startBtn.addClass('disabled loading');
        systemDiagnostic.$stopBtn.removeClass('disabled');
        PbxApi.SystemStartLogsCapture();
      });
      systemDiagnostic.$stopBtn.on('click', function (e) {
        e.preventDefault();
        systemDiagnostic.$startBtn.removeClass('disabled loading');
        systemDiagnostic.$stopBtn.addClass('disabled');
        PbxApi.SystemStopLogsCapture(systemDiagnostic.cbAfterStopLogsCapture);
      });

      systemDiagnostic.initializeAce();
    }

    return initialize;
  }(),
  initializeAce: function () {
    function initializeAce() {
      var IniMode = ace.require('ace/mode/julia').Mode;
      systemDiagnostic.viewer = ace.edit('application-code-readonly');
      systemDiagnostic.viewer.setReadOnly(true);
      systemDiagnostic.viewer.session.setMode(new IniMode());
      systemDiagnostic.viewer.setTheme('ace/theme/monokai');
      systemDiagnostic.viewer.resize();

      var $codeElement = $('#application-code-readonly');
      var Length = $codeElement.height() * 0.80;
      $codeElement.height(Length);
      $('.ace_gutter').hide();

      setTimeout(systemDiagnostic.cbUpdateLogText, 100);
    }

    return initializeAce;
  }(),
  cbAfterStopLogsCapture: function () {
    function cbAfterStopLogsCapture(response) {
      console.log(response);
    }

    return cbAfterStopLogsCapture;
  }()
  ,
  cbUpdateLogText: function () {
    function cbUpdateLogText(data) {
      if (data !== undefined && data.length > 0) {
        systemDiagnostic.viewer.setValue(data[0]);
      }
      systemDiagnostic.viewer.gotoLine($('#lines').val())
    }

    return cbUpdateLogText;
  }()
};
$(document).ready(function () {
  systemDiagnostic.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWMiLCIkc3RhcnRCdG4iLCIkIiwiJHN0b3BCdG4iLCJpbml0aWFsaXplIiwic2Vzc2lvblN0b3JhZ2UiLCJnZXRJdGVtIiwiYWRkQ2xhc3MiLCJyZW1vdmVDbGFzcyIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiUGJ4QXBpIiwiU3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSIsIlN5c3RlbVN0b3BMb2dzQ2FwdHVyZSIsImNiQWZ0ZXJTdG9wTG9nc0NhcHR1cmUiLCJyZXNwb25zZSIsImNvbnNvbGUiLCJsb2ciLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQU9BO0FBRUEsSUFBTUEsZ0JBQWdCLEdBQUc7QUFDeEJDLEVBQUFBLFNBQVMsRUFBRUMsQ0FBQyxDQUFDLHVCQUFELENBRFk7QUFFeEJDLEVBQUFBLFFBQVEsRUFBRUQsQ0FBQyxDQUFDLHNCQUFELENBRmE7QUFHeEJFLEVBQUFBLFVBSHdCO0FBQUEsMEJBR1g7QUFDWixVQUFJQyxjQUFjLENBQUNDLE9BQWYsQ0FBdUIsbUJBQXZCLE1BQWdELFNBQXBELEVBQStEO0FBQzlETixRQUFBQSxnQkFBZ0IsQ0FBQ0MsU0FBakIsQ0FBMkJNLFFBQTNCLENBQW9DLGtCQUFwQztBQUNBUCxRQUFBQSxnQkFBZ0IsQ0FBQ0csUUFBakIsQ0FBMEJLLFdBQTFCLENBQXNDLFVBQXRDO0FBQ0EsT0FIRCxNQUdPO0FBQ05SLFFBQUFBLGdCQUFnQixDQUFDQyxTQUFqQixDQUEyQk8sV0FBM0IsQ0FBdUMsa0JBQXZDO0FBQ0FSLFFBQUFBLGdCQUFnQixDQUFDRyxRQUFqQixDQUEwQkksUUFBMUIsQ0FBbUMsVUFBbkM7QUFDQTs7QUFDRFAsTUFBQUEsZ0JBQWdCLENBQUNDLFNBQWpCLENBQTJCUSxFQUEzQixDQUE4QixPQUE5QixFQUF1QyxVQUFDQyxDQUFELEVBQU87QUFDN0NBLFFBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBWCxRQUFBQSxnQkFBZ0IsQ0FBQ0MsU0FBakIsQ0FBMkJNLFFBQTNCLENBQW9DLGtCQUFwQztBQUNBUCxRQUFBQSxnQkFBZ0IsQ0FBQ0csUUFBakIsQ0FBMEJLLFdBQTFCLENBQXNDLFVBQXRDO0FBQ0FJLFFBQUFBLE1BQU0sQ0FBQ0Msc0JBQVA7QUFDQSxPQUxEO0FBTUFiLE1BQUFBLGdCQUFnQixDQUFDRyxRQUFqQixDQUEwQk0sRUFBMUIsQ0FBNkIsT0FBN0IsRUFBc0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQzVDQSxRQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQVgsUUFBQUEsZ0JBQWdCLENBQUNDLFNBQWpCLENBQTJCTyxXQUEzQixDQUF1QyxrQkFBdkM7QUFDQVIsUUFBQUEsZ0JBQWdCLENBQUNHLFFBQWpCLENBQTBCSSxRQUExQixDQUFtQyxVQUFuQztBQUNBSyxRQUFBQSxNQUFNLENBQUNFLHFCQUFQLENBQTZCZCxnQkFBZ0IsQ0FBQ2Usc0JBQTlDO0FBQ0EsT0FMRDtBQU1BOztBQXZCdUI7QUFBQTtBQXdCeEJBLEVBQUFBLHNCQXhCd0I7QUFBQSxvQ0F3QkRDLFFBeEJDLEVBd0JTO0FBQ2hDQyxNQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWUYsUUFBWjtBQUNBOztBQTFCdUI7QUFBQTtBQUFBLENBQXpCO0FBNkJBZCxDQUFDLENBQUNpQixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCcEIsRUFBQUEsZ0JBQWdCLENBQUNJLFVBQWpCO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuLyogZ2xvYmFsIHNlc3Npb25TdG9yYWdlLCBQYnhBcGkgKi9cblxuY29uc3Qgc3lzdGVtRGlhZ25vc3RpYyA9IHtcblx0JHN0YXJ0QnRuOiAkKCcjc3RhcnQtY2FwdHVyZS1idXR0b24nKSxcblx0JHN0b3BCdG46ICQoJyNzdG9wLWNhcHR1cmUtYnV0dG9uJyksXG5cdGluaXRpYWxpemUoKSB7XG5cdFx0aWYgKHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oJ0xvZ3NDYXB0dXJlU3RhdHVzJykgPT09ICdzdGFydGVkJykge1xuXHRcdFx0c3lzdGVtRGlhZ25vc3RpYy4kc3RhcnRCdG4uYWRkQ2xhc3MoJ2Rpc2FibGVkIGxvYWRpbmcnKTtcblx0XHRcdHN5c3RlbURpYWdub3N0aWMuJHN0b3BCdG4ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHN5c3RlbURpYWdub3N0aWMuJHN0YXJ0QnRuLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCBsb2FkaW5nJyk7XG5cdFx0XHRzeXN0ZW1EaWFnbm9zdGljLiRzdG9wQnRuLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH1cblx0XHRzeXN0ZW1EaWFnbm9zdGljLiRzdGFydEJ0bi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0c3lzdGVtRGlhZ25vc3RpYy4kc3RhcnRCdG4uYWRkQ2xhc3MoJ2Rpc2FibGVkIGxvYWRpbmcnKTtcblx0XHRcdHN5c3RlbURpYWdub3N0aWMuJHN0b3BCdG4ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtU3RhcnRMb2dzQ2FwdHVyZSgpO1xuXHRcdH0pO1xuXHRcdHN5c3RlbURpYWdub3N0aWMuJHN0b3BCdG4ub24oJ2NsaWNrJywgKGUpID0+IHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHN5c3RlbURpYWdub3N0aWMuJHN0YXJ0QnRuLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCBsb2FkaW5nJyk7XG5cdFx0XHRzeXN0ZW1EaWFnbm9zdGljLiRzdG9wQnRuLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0UGJ4QXBpLlN5c3RlbVN0b3BMb2dzQ2FwdHVyZShzeXN0ZW1EaWFnbm9zdGljLmNiQWZ0ZXJTdG9wTG9nc0NhcHR1cmUpO1xuXHRcdH0pO1xuXHR9LFxuXHRjYkFmdGVyU3RvcExvZ3NDYXB0dXJlKHJlc3BvbnNlKSB7XG5cdFx0Y29uc29sZS5sb2cocmVzcG9uc2UpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRzeXN0ZW1EaWFnbm9zdGljLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=