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

/* global sessionStorage, PbxApi */
var archivePackingCheckWorker = {
  timeOut: 3000,
  timeOutHandle: '',
  errorCounts: 0,
  filename: '',
  $progress: $('#capture-log-dimmer span.progress'),
  initialize: function initialize(filename) {
    archivePackingCheckWorker.filename = filename;
    archivePackingCheckWorker.restartWorker(filename);
  },
  restartWorker: function restartWorker() {
    window.clearTimeout(archivePackingCheckWorker.timeoutHandle);
    archivePackingCheckWorker.worker();
  },
  worker: function worker() {
    PbxApi.SyslogDownloadLogsArchive(archivePackingCheckWorker.filename, archivePackingCheckWorker.cbAfterResponse);
    archivePackingCheckWorker.timeoutHandle = window.setTimeout(archivePackingCheckWorker.worker, archivePackingCheckWorker.timeOut);
  },
  cbAfterResponse: function cbAfterResponse(response) {
    if (archivePackingCheckWorker.errorCounts > 50) {
      UserMessage.showMultiString(globalTranslate.sd_DownloadPcapFileError);
      systemDiagnosticCapture.$stopBtn.removeClass('disabled loading').addClass('disabled');
      systemDiagnosticCapture.$startBtn.removeClass('disabled loading');
      window.clearTimeout(archivePackingCheckWorker.timeoutHandle);
    }

    if (response === undefined || Object.keys(response).length === 0) {
      archivePackingCheckWorker.errorCounts += 1;
      return;
    }

    if (response.status === 'READY') {
      systemDiagnosticCapture.$stopBtn.removeClass('disabled loading').addClass('disabled');
      systemDiagnosticCapture.$startBtn.removeClass('disabled loading');
      systemDiagnosticCapture.$downloadBtn.removeClass('disabled loading');
      window.location = response.filename;
      window.clearTimeout(archivePackingCheckWorker.timeoutHandle);
      systemDiagnosticCapture.$dimmer.removeClass('active');
    } else if (response.status === 'PREPARING') {
      archivePackingCheckWorker.errorCounts = 0;
      archivePackingCheckWorker.$progress.text("".concat(response.progress, "%"));
    } else {
      archivePackingCheckWorker.errorCounts += 1;
    }
  }
};
var systemDiagnosticCapture = {
  $startBtn: $('#start-capture-button'),
  $downloadBtn: $('#download-logs-button'),
  $stopBtn: $('#stop-capture-button'),
  $showBtn: $('#show-last-log'),
  $dimmer: $('#capture-log-dimmer'),
  initialize: function initialize() {
    var segmentHeight = window.innerHeight - 300;
    $(window).load(function () {
      systemDiagnosticCapture.$dimmer.closest('div').css('min-height', "".concat(segmentHeight, "px"));
    });

    if (sessionStorage.getItem('PCAPCaptureStatus') === 'started') {
      systemDiagnosticCapture.$startBtn.addClass('disabled loading');
      systemDiagnosticCapture.$stopBtn.removeClass('disabled');
    } else {
      systemDiagnosticCapture.$startBtn.removeClass('disabled loading');
      systemDiagnosticCapture.$stopBtn.addClass('disabled');
    }

    systemDiagnosticCapture.$startBtn.on('click', function (e) {
      e.preventDefault();
      systemDiagnosticCapture.$startBtn.addClass('disabled loading');
      systemDiagnosticCapture.$stopBtn.removeClass('disabled');
      PbxApi.SyslogStartLogsCapture(systemDiagnosticCapture.cbAfterStartCapture);
    });
    systemDiagnosticCapture.$stopBtn.on('click', function (e) {
      e.preventDefault();
      systemDiagnosticCapture.$startBtn.removeClass('loading');
      systemDiagnosticCapture.$stopBtn.addClass('loading');
      systemDiagnosticCapture.$dimmer.addClass('active');
      PbxApi.SyslogStopLogsCapture(systemDiagnosticCapture.cbAfterStopCapture);
    });
    systemDiagnosticCapture.$downloadBtn.on('click', function (e) {
      e.preventDefault();
      systemDiagnosticCapture.$downloadBtn.addClass('disabled loading');
      systemDiagnosticCapture.$dimmer.addClass('active');
      PbxApi.SyslogPrepareLog(systemDiagnosticCapture.cbAfterDownloadCapture);
    });
  },

  /**
   *  Callback after push start logs collect button
   * @param response
   */
  cbAfterStartCapture: function cbAfterStartCapture(response) {
    if (response !== false) {
      sessionStorage.setItem('PCAPCaptureStatus', 'started');
      setTimeout(function () {
        sessionStorage.setItem('PCAPCaptureStatus', 'stopped');
      }, 300000);
    }
  },

  /**
   *  Callback after push start logs collect button
   * @param response
   */
  cbAfterDownloadCapture: function cbAfterDownloadCapture(response) {
    if (response !== false) {
      archivePackingCheckWorker.initialize(response.filename);
    }
  },

  /**
   * Callback after push stop logs collect button
   * @param response
   */
  cbAfterStopCapture: function cbAfterStopCapture(response) {
    if (response !== false) {
      archivePackingCheckWorker.initialize(response.filename);
    }
  }
};
$(document).ready(function () {
  systemDiagnosticCapture.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LWxvZ2NhcHR1cmUuanMiXSwibmFtZXMiOlsiYXJjaGl2ZVBhY2tpbmdDaGVja1dvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwiZXJyb3JDb3VudHMiLCJmaWxlbmFtZSIsIiRwcm9ncmVzcyIsIiQiLCJpbml0aWFsaXplIiwicmVzdGFydFdvcmtlciIsIndpbmRvdyIsImNsZWFyVGltZW91dCIsInRpbWVvdXRIYW5kbGUiLCJ3b3JrZXIiLCJQYnhBcGkiLCJTeXNsb2dEb3dubG9hZExvZ3NBcmNoaXZlIiwiY2JBZnRlclJlc3BvbnNlIiwic2V0VGltZW91dCIsInJlc3BvbnNlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJnbG9iYWxUcmFuc2xhdGUiLCJzZF9Eb3dubG9hZFBjYXBGaWxlRXJyb3IiLCJzeXN0ZW1EaWFnbm9zdGljQ2FwdHVyZSIsIiRzdG9wQnRuIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIiRzdGFydEJ0biIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJzdGF0dXMiLCIkZG93bmxvYWRCdG4iLCJsb2NhdGlvbiIsIiRkaW1tZXIiLCJ0ZXh0IiwicHJvZ3Jlc3MiLCIkc2hvd0J0biIsInNlZ21lbnRIZWlnaHQiLCJpbm5lckhlaWdodCIsImxvYWQiLCJjbG9zZXN0IiwiY3NzIiwic2Vzc2lvblN0b3JhZ2UiLCJnZXRJdGVtIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJTeXNsb2dTdGFydExvZ3NDYXB0dXJlIiwiY2JBZnRlclN0YXJ0Q2FwdHVyZSIsIlN5c2xvZ1N0b3BMb2dzQ2FwdHVyZSIsImNiQWZ0ZXJTdG9wQ2FwdHVyZSIsIlN5c2xvZ1ByZXBhcmVMb2ciLCJjYkFmdGVyRG93bmxvYWRDYXB0dXJlIiwic2V0SXRlbSIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7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LGdCQUFQLENBQXdCOUIsdUJBQXVCLENBQUMrQixzQkFBaEQ7QUFDQSxLQUxEO0FBTUEsR0F0QzhCOztBQXVDL0I7QUFDRDtBQUNBO0FBQ0E7QUFDQ0osRUFBQUEsbUJBM0MrQiwrQkEyQ1hoQyxRQTNDVyxFQTJDRjtBQUM1QixRQUFJQSxRQUFRLEtBQUcsS0FBZixFQUFzQjtBQUNyQjBCLE1BQUFBLGNBQWMsQ0FBQ1csT0FBZixDQUF1QixtQkFBdkIsRUFBNEMsU0FBNUM7QUFDQXRDLE1BQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2hCMkIsUUFBQUEsY0FBYyxDQUFDVyxPQUFmLENBQXVCLG1CQUF2QixFQUE0QyxTQUE1QztBQUNBLE9BRlMsRUFFUCxNQUZPLENBQVY7QUFHQTtBQUNELEdBbEQ4Qjs7QUFtRC9CO0FBQ0Q7QUFDQTtBQUNBO0FBQ0NELEVBQUFBLHNCQXZEK0Isa0NBdURScEMsUUF2RFEsRUF1REM7QUFDL0IsUUFBSUEsUUFBUSxLQUFHLEtBQWYsRUFBcUI7QUFDcEJqQixNQUFBQSx5QkFBeUIsQ0FBQ08sVUFBMUIsQ0FBcUNVLFFBQVEsQ0FBQ2IsUUFBOUM7QUFDQTtBQUNELEdBM0Q4Qjs7QUE0RC9CO0FBQ0Q7QUFDQTtBQUNBO0FBQ0MrQyxFQUFBQSxrQkFoRStCLDhCQWdFWmxDLFFBaEVZLEVBZ0VIO0FBQzNCLFFBQUlBLFFBQVEsS0FBRyxLQUFmLEVBQXFCO0FBQ3BCakIsTUFBQUEseUJBQXlCLENBQUNPLFVBQTFCLENBQXFDVSxRQUFRLENBQUNiLFFBQTlDO0FBQ0E7QUFDRDtBQXBFOEIsQ0FBaEM7QUF1RUFFLENBQUMsQ0FBQ2lELFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkJsQyxFQUFBQSx1QkFBdUIsQ0FBQ2YsVUFBeEI7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCAoQykgMjAxNy0yMDIwIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgc2Vzc2lvblN0b3JhZ2UsIFBieEFwaSAqL1xuXG5jb25zdCBhcmNoaXZlUGFja2luZ0NoZWNrV29ya2VyID0ge1xuXHR0aW1lT3V0OiAzMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0ZXJyb3JDb3VudHM6IDAsXG5cdGZpbGVuYW1lOiAnJyxcblx0JHByb2dyZXNzOiAkKCcjY2FwdHVyZS1sb2ctZGltbWVyIHNwYW4ucHJvZ3Jlc3MnKSxcblx0aW5pdGlhbGl6ZShmaWxlbmFtZSkge1xuXHRcdGFyY2hpdmVQYWNraW5nQ2hlY2tXb3JrZXIuZmlsZW5hbWUgPSBmaWxlbmFtZTtcblx0XHRhcmNoaXZlUGFja2luZ0NoZWNrV29ya2VyLnJlc3RhcnRXb3JrZXIoZmlsZW5hbWUpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQoYXJjaGl2ZVBhY2tpbmdDaGVja1dvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRhcmNoaXZlUGFja2luZ0NoZWNrV29ya2VyLndvcmtlcigpO1xuXHR9LFxuXHR3b3JrZXIoKSB7XG5cdFx0UGJ4QXBpLlN5c2xvZ0Rvd25sb2FkTG9nc0FyY2hpdmUoYXJjaGl2ZVBhY2tpbmdDaGVja1dvcmtlci5maWxlbmFtZSwgYXJjaGl2ZVBhY2tpbmdDaGVja1dvcmtlci5jYkFmdGVyUmVzcG9uc2UpO1xuXHRcdGFyY2hpdmVQYWNraW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSA9IHdpbmRvdy5zZXRUaW1lb3V0KFxuXHRcdFx0YXJjaGl2ZVBhY2tpbmdDaGVja1dvcmtlci53b3JrZXIsXG5cdFx0XHRhcmNoaXZlUGFja2luZ0NoZWNrV29ya2VyLnRpbWVPdXQsXG5cdFx0KTtcblx0fSxcblx0Y2JBZnRlclJlc3BvbnNlKHJlc3BvbnNlKSB7XG5cdFx0aWYgKGFyY2hpdmVQYWNraW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgPiA1MCkge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5zZF9Eb3dubG9hZFBjYXBGaWxlRXJyb3IpO1xuXHRcdFx0c3lzdGVtRGlhZ25vc3RpY0NhcHR1cmUuJHN0b3BCdG5cblx0XHRcdFx0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCBsb2FkaW5nJylcblx0XHRcdFx0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0c3lzdGVtRGlhZ25vc3RpY0NhcHR1cmUuJHN0YXJ0QnRuLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCBsb2FkaW5nJyk7XG5cdFx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KGFyY2hpdmVQYWNraW5nQ2hlY2tXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0fVxuXHRcdGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IE9iamVjdC5rZXlzKHJlc3BvbnNlKS5sZW5ndGggPT09IDApIHtcblx0XHRcdGFyY2hpdmVQYWNraW5nQ2hlY2tXb3JrZXIuZXJyb3JDb3VudHMgKz0gMTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0aWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gJ1JFQURZJykge1xuXHRcdFx0c3lzdGVtRGlhZ25vc3RpY0NhcHR1cmUuJHN0b3BCdG5cblx0XHRcdFx0LnJlbW92ZUNsYXNzKCdkaXNhYmxlZCBsb2FkaW5nJylcblx0XHRcdFx0LmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdFx0c3lzdGVtRGlhZ25vc3RpY0NhcHR1cmUuJHN0YXJ0QnRuLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCBsb2FkaW5nJyk7XG5cdFx0XHRzeXN0ZW1EaWFnbm9zdGljQ2FwdHVyZS4kZG93bmxvYWRCdG4ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkIGxvYWRpbmcnKTtcblx0XHRcdHdpbmRvdy5sb2NhdGlvbiA9IHJlc3BvbnNlLmZpbGVuYW1lO1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dChhcmNoaXZlUGFja2luZ0NoZWNrV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFx0c3lzdGVtRGlhZ25vc3RpY0NhcHR1cmUuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT09ICdQUkVQQVJJTkcnKSB7XG5cdFx0XHRhcmNoaXZlUGFja2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzID0gMDtcblx0XHRcdGFyY2hpdmVQYWNraW5nQ2hlY2tXb3JrZXIuJHByb2dyZXNzLnRleHQoYCR7cmVzcG9uc2UucHJvZ3Jlc3N9JWApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRhcmNoaXZlUGFja2luZ0NoZWNrV29ya2VyLmVycm9yQ291bnRzICs9IDE7XG5cdFx0fVxuXHR9LFxufTtcblxuY29uc3Qgc3lzdGVtRGlhZ25vc3RpY0NhcHR1cmUgPSB7XG5cdCRzdGFydEJ0bjogJCgnI3N0YXJ0LWNhcHR1cmUtYnV0dG9uJyksXG5cdCRkb3dubG9hZEJ0bjogJCgnI2Rvd25sb2FkLWxvZ3MtYnV0dG9uJyksXG5cdCRzdG9wQnRuOiAkKCcjc3RvcC1jYXB0dXJlLWJ1dHRvbicpLFxuXHQkc2hvd0J0bjogJCgnI3Nob3ctbGFzdC1sb2cnKSxcblx0JGRpbW1lcjogICQoJyNjYXB0dXJlLWxvZy1kaW1tZXInKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRjb25zdCBzZWdtZW50SGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0LTMwMDtcblx0XHQkKHdpbmRvdykubG9hZChmdW5jdGlvbigpIHtcblx0XHRcdHN5c3RlbURpYWdub3N0aWNDYXB0dXJlLiRkaW1tZXIuY2xvc2VzdCgnZGl2JykuY3NzKCdtaW4taGVpZ2h0JywgYCR7c2VnbWVudEhlaWdodH1weGApO1xuXHRcdH0pO1xuXHRcdGlmIChzZXNzaW9uU3RvcmFnZS5nZXRJdGVtKCdQQ0FQQ2FwdHVyZVN0YXR1cycpID09PSAnc3RhcnRlZCcpIHtcblx0XHRcdHN5c3RlbURpYWdub3N0aWNDYXB0dXJlLiRzdGFydEJ0bi5hZGRDbGFzcygnZGlzYWJsZWQgbG9hZGluZycpO1xuXHRcdFx0c3lzdGVtRGlhZ25vc3RpY0NhcHR1cmUuJHN0b3BCdG4ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHN5c3RlbURpYWdub3N0aWNDYXB0dXJlLiRzdGFydEJ0bi5yZW1vdmVDbGFzcygnZGlzYWJsZWQgbG9hZGluZycpO1xuXHRcdFx0c3lzdGVtRGlhZ25vc3RpY0NhcHR1cmUuJHN0b3BCdG4uYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdFx0fVxuXHRcdHN5c3RlbURpYWdub3N0aWNDYXB0dXJlLiRzdGFydEJ0bi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0c3lzdGVtRGlhZ25vc3RpY0NhcHR1cmUuJHN0YXJ0QnRuLmFkZENsYXNzKCdkaXNhYmxlZCBsb2FkaW5nJyk7XG5cdFx0XHRzeXN0ZW1EaWFnbm9zdGljQ2FwdHVyZS4kc3RvcEJ0bi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblx0XHRcdFBieEFwaS5TeXNsb2dTdGFydExvZ3NDYXB0dXJlKHN5c3RlbURpYWdub3N0aWNDYXB0dXJlLmNiQWZ0ZXJTdGFydENhcHR1cmUpO1xuXHRcdH0pO1xuXHRcdHN5c3RlbURpYWdub3N0aWNDYXB0dXJlLiRzdG9wQnRuLm9uKCdjbGljaycsIChlKSA9PiB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRzeXN0ZW1EaWFnbm9zdGljQ2FwdHVyZS4kc3RhcnRCdG4ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblx0XHRcdHN5c3RlbURpYWdub3N0aWNDYXB0dXJlLiRzdG9wQnRuLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cdFx0XHRzeXN0ZW1EaWFnbm9zdGljQ2FwdHVyZS4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFBieEFwaS5TeXNsb2dTdG9wTG9nc0NhcHR1cmUoc3lzdGVtRGlhZ25vc3RpY0NhcHR1cmUuY2JBZnRlclN0b3BDYXB0dXJlKTtcblxuXHRcdH0pO1xuXHRcdHN5c3RlbURpYWdub3N0aWNDYXB0dXJlLiRkb3dubG9hZEJ0bi5vbignY2xpY2snLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0c3lzdGVtRGlhZ25vc3RpY0NhcHR1cmUuJGRvd25sb2FkQnRuLmFkZENsYXNzKCdkaXNhYmxlZCBsb2FkaW5nJyk7XG5cdFx0XHRzeXN0ZW1EaWFnbm9zdGljQ2FwdHVyZS4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcblx0XHRcdFBieEFwaS5TeXNsb2dQcmVwYXJlTG9nKHN5c3RlbURpYWdub3N0aWNDYXB0dXJlLmNiQWZ0ZXJEb3dubG9hZENhcHR1cmUpO1xuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogIENhbGxiYWNrIGFmdGVyIHB1c2ggc3RhcnQgbG9ncyBjb2xsZWN0IGJ1dHRvblxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJTdGFydENhcHR1cmUocmVzcG9uc2Upe1xuXHRcdGlmIChyZXNwb25zZSE9PWZhbHNlKSB7XG5cdFx0XHRzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdQQ0FQQ2FwdHVyZVN0YXR1cycsICdzdGFydGVkJyk7XG5cdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0c2Vzc2lvblN0b3JhZ2Uuc2V0SXRlbSgnUENBUENhcHR1cmVTdGF0dXMnLCAnc3RvcHBlZCcpO1xuXHRcdFx0fSwgMzAwMDAwKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiAgQ2FsbGJhY2sgYWZ0ZXIgcHVzaCBzdGFydCBsb2dzIGNvbGxlY3QgYnV0dG9uXG5cdCAqIEBwYXJhbSByZXNwb25zZVxuXHQgKi9cblx0Y2JBZnRlckRvd25sb2FkQ2FwdHVyZShyZXNwb25zZSl7XG5cdFx0aWYgKHJlc3BvbnNlIT09ZmFsc2Upe1xuXHRcdFx0YXJjaGl2ZVBhY2tpbmdDaGVja1dvcmtlci5pbml0aWFsaXplKHJlc3BvbnNlLmZpbGVuYW1lKTtcblx0XHR9XG5cdH0sXG5cdC8qKlxuXHQgKiBDYWxsYmFjayBhZnRlciBwdXNoIHN0b3AgbG9ncyBjb2xsZWN0IGJ1dHRvblxuXHQgKiBAcGFyYW0gcmVzcG9uc2Vcblx0ICovXG5cdGNiQWZ0ZXJTdG9wQ2FwdHVyZShyZXNwb25zZSl7XG5cdFx0aWYgKHJlc3BvbnNlIT09ZmFsc2Upe1xuXHRcdFx0YXJjaGl2ZVBhY2tpbmdDaGVja1dvcmtlci5pbml0aWFsaXplKHJlc3BvbnNlLmZpbGVuYW1lKTtcblx0XHR9XG5cdH1cbn07XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcblx0c3lzdGVtRGlhZ25vc3RpY0NhcHR1cmUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==