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

/* global globalRootUrl, PbxApi, globalTranslate, UserMessage, installStatusLoopWorker */

/**
 * Processes download module form MikoPBX repository
 *
 */
var upgradeStatusLoopWorker = {
  timeOut: 1000,
  timeOutHandle: '',
  moduleUniqid: '',
  iterations: 0,
  oldPercent: '0',
  needEnableAfterInstall: false,
  initialize: function initialize(uniqid) {
    var needEnable = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    upgradeStatusLoopWorker.moduleUniqid = uniqid;
    upgradeStatusLoopWorker.iterations = 0;
    upgradeStatusLoopWorker.needEnableAfterInstall = needEnable;
    upgradeStatusLoopWorker.restartWorker();
  },
  restartWorker: function restartWorker() {
    window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
    upgradeStatusLoopWorker.worker();
  },
  worker: function worker() {
    window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
    PbxApi.FilesModuleDownloadStatus(upgradeStatusLoopWorker.moduleUniqid, upgradeStatusLoopWorker.cbRefreshModuleStatus, upgradeStatusLoopWorker.restartWorker);
  },
  cbRefreshModuleStatus: function cbRefreshModuleStatus(response) {
    upgradeStatusLoopWorker.iterations += 1;
    upgradeStatusLoopWorker.timeoutHandle = window.setTimeout(upgradeStatusLoopWorker.worker, upgradeStatusLoopWorker.timeOut); // Check download status

    if (response === false && upgradeStatusLoopWorker.iterations < 50) {
      window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
    } else if (upgradeStatusLoopWorker.iterations > 50 || response.d_status === 'PROGRESS_FILE_NOT_FOUND' || response.d_status === 'NOT_FOUND') {
      window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
      var errorMessage = response.d_error !== undefined ? response.d_error : '';
      errorMessage = errorMessage.replace(/\n/g, '<br>');
      UserMessage.showMultiString(errorMessage, globalTranslate.ext_UpdateModuleError);
      $("#".concat(upgradeStatusLoopWorker.moduleUniqid)).find('i').removeClass('loading');
      $('.new-module-row').find('i').addClass('download').removeClass('redo');
      $('a.button').removeClass('disabled');
    } else if (response.d_status === 'DOWNLOAD_IN_PROGRESS') {
      if (upgradeStatusLoopWorker.oldPercent !== response.d_status_progress) {
        upgradeStatusLoopWorker.iterations = 0;
      }

      $('i.loading.redo').closest('a').find('.percent').text("".concat(response.d_status_progress, "%"));
      upgradeStatusLoopWorker.oldPercent = response.d_status_progress;
    } else if (response.d_status === 'DOWNLOAD_COMPLETE') {
      $('i.loading.redo').closest('a').find('.percent').text('100%');
      PbxApi.SystemInstallModule(response.filePath, upgradeStatusLoopWorker.cbAfterModuleInstall);
      window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
    }
  },
  cbAfterModuleInstall: function cbAfterModuleInstall(response) {
    if (response.result === true) {
      installStatusLoopWorker.initialize(response.data.filePath, upgradeStatusLoopWorker.needEnableAfterInstall);
    } else {
      UserMessage.showMultiString(response, globalTranslate.ext_InstallationError);
    }
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLXVwZ3JhZGUtc3RhdHVzLXdvcmtlci5qcyJdLCJuYW1lcyI6WyJ1cGdyYWRlU3RhdHVzTG9vcFdvcmtlciIsInRpbWVPdXQiLCJ0aW1lT3V0SGFuZGxlIiwibW9kdWxlVW5pcWlkIiwiaXRlcmF0aW9ucyIsIm9sZFBlcmNlbnQiLCJuZWVkRW5hYmxlQWZ0ZXJJbnN0YWxsIiwiaW5pdGlhbGl6ZSIsInVuaXFpZCIsIm5lZWRFbmFibGUiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlBieEFwaSIsIkZpbGVzTW9kdWxlRG93bmxvYWRTdGF0dXMiLCJjYlJlZnJlc2hNb2R1bGVTdGF0dXMiLCJyZXNwb25zZSIsInNldFRpbWVvdXQiLCJkX3N0YXR1cyIsImVycm9yTWVzc2FnZSIsImRfZXJyb3IiLCJ1bmRlZmluZWQiLCJyZXBsYWNlIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfVXBkYXRlTW9kdWxlRXJyb3IiLCIkIiwiZmluZCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJkX3N0YXR1c19wcm9ncmVzcyIsImNsb3Nlc3QiLCJ0ZXh0IiwiU3lzdGVtSW5zdGFsbE1vZHVsZSIsImZpbGVQYXRoIiwiY2JBZnRlck1vZHVsZUluc3RhbGwiLCJyZXN1bHQiLCJpbnN0YWxsU3RhdHVzTG9vcFdvcmtlciIsImRhdGEiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHVCQUF1QixHQUFHO0FBQy9CQyxF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InNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlciAqL1xuXG4vKipcbiAqIFByb2Nlc3NlcyBkb3dubG9hZCBtb2R1bGUgZm9ybSBNaWtvUEJYIHJlcG9zaXRvcnlcbiAqXG4gKi9cbmNvbnN0IHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyID0ge1xuXHR0aW1lT3V0OiAxMDAwLFxuXHR0aW1lT3V0SGFuZGxlOiAnJyxcblx0bW9kdWxlVW5pcWlkOiAnJyxcblx0aXRlcmF0aW9uczogMCxcblx0b2xkUGVyY2VudDogJzAnLFxuXHRuZWVkRW5hYmxlQWZ0ZXJJbnN0YWxsOiBmYWxzZSxcblx0aW5pdGlhbGl6ZSh1bmlxaWQsIG5lZWRFbmFibGU9ZmFsc2UpIHtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5tb2R1bGVVbmlxaWQgPSB1bmlxaWQ7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaXRlcmF0aW9ucyA9IDA7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIubmVlZEVuYWJsZUFmdGVySW5zdGFsbCA9IG5lZWRFbmFibGU7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIucmVzdGFydFdvcmtlcigpO1xuXHR9LFxuXHRyZXN0YXJ0V29ya2VyKCkge1xuXHRcdHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIud29ya2VyKCk7XG5cdH0sXG5cdHdvcmtlcigpIHtcblx0XHR3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuXHRcdFBieEFwaS5GaWxlc01vZHVsZURvd25sb2FkU3RhdHVzKFxuXHRcdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIubW9kdWxlVW5pcWlkLFxuXHRcdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuY2JSZWZyZXNoTW9kdWxlU3RhdHVzLFxuXHRcdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIucmVzdGFydFdvcmtlcixcblx0XHQpO1xuXHR9LFxuXHRjYlJlZnJlc2hNb2R1bGVTdGF0dXMocmVzcG9uc2UpIHtcblx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pdGVyYXRpb25zICs9IDE7XG5cdFx0dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSA9XG5cdFx0XHR3aW5kb3cuc2V0VGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci53b3JrZXIsIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVPdXQpO1xuXHRcdC8vIENoZWNrIGRvd25sb2FkIHN0YXR1c1xuXHRcdGlmIChyZXNwb25zZSA9PT0gZmFsc2Vcblx0XHRcdCYmIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLml0ZXJhdGlvbnMgPCA1MCkge1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR9IGVsc2UgaWYgKHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLml0ZXJhdGlvbnMgPiA1MFxuXHRcdFx0fHwgcmVzcG9uc2UuZF9zdGF0dXMgPT09ICdQUk9HUkVTU19GSUxFX05PVF9GT1VORCdcblx0XHRcdHx8IHJlc3BvbnNlLmRfc3RhdHVzID09PSAnTk9UX0ZPVU5EJ1xuXHRcdCkge1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHRcdGxldCBlcnJvck1lc3NhZ2UgPSAocmVzcG9uc2UuZF9lcnJvciAhPT0gdW5kZWZpbmVkKSA/IHJlc3BvbnNlLmRfZXJyb3IgOiAnJztcblx0XHRcdGVycm9yTWVzc2FnZSA9IGVycm9yTWVzc2FnZS5yZXBsYWNlKC9cXG4vZywgJzxicj4nKTtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhlcnJvck1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlRXJyb3IpO1xuXHRcdFx0JChgIyR7dXBncmFkZVN0YXR1c0xvb3BXb3JrZXIubW9kdWxlVW5pcWlkfWApLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXHRcdFx0JCgnLm5ldy1tb2R1bGUtcm93JykuZmluZCgnaScpLmFkZENsYXNzKCdkb3dubG9hZCcpLnJlbW92ZUNsYXNzKCdyZWRvJyk7XG5cdFx0XHQkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXHRcdH0gZWxzZSBpZiAocmVzcG9uc2UuZF9zdGF0dXMgPT09ICdET1dOTE9BRF9JTl9QUk9HUkVTUycpIHtcblx0XHRcdGlmICh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5vbGRQZXJjZW50ICE9PSByZXNwb25zZS5kX3N0YXR1c19wcm9ncmVzcykge1xuXHRcdFx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5pdGVyYXRpb25zID0gMDtcblx0XHRcdH1cblx0XHRcdCQoJ2kubG9hZGluZy5yZWRvJykuY2xvc2VzdCgnYScpLmZpbmQoJy5wZXJjZW50JykudGV4dChgJHtyZXNwb25zZS5kX3N0YXR1c19wcm9ncmVzc30lYCk7XG5cdFx0XHR1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5vbGRQZXJjZW50ID0gcmVzcG9uc2UuZF9zdGF0dXNfcHJvZ3Jlc3M7XG5cdFx0fSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0NPTVBMRVRFJykge1xuXHRcdFx0JCgnaS5sb2FkaW5nLnJlZG8nKS5jbG9zZXN0KCdhJykuZmluZCgnLnBlcmNlbnQnKS50ZXh0KCcxMDAlJyk7XG5cdFx0XHRQYnhBcGkuU3lzdGVtSW5zdGFsbE1vZHVsZShyZXNwb25zZS5maWxlUGF0aCwgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuY2JBZnRlck1vZHVsZUluc3RhbGwpO1xuXHRcdFx0d2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcblx0XHR9XG5cdH0sXG5cdGNiQWZ0ZXJNb2R1bGVJbnN0YWxsKHJlc3BvbnNlKSB7XG5cdFx0aWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuXHRcdFx0aW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuaW5pdGlhbGl6ZShyZXNwb25zZS5kYXRhLmZpbGVQYXRoLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5uZWVkRW5hYmxlQWZ0ZXJJbnN0YWxsKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0VXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yKTtcblx0XHR9XG5cblx0fSxcbn07XG4iXX0=