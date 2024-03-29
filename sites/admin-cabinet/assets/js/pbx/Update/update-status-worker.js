"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi, globalTranslate, UserMessage, updatePBX */

/**
 * Worker object for checking file merging status.
 *
 * @module upgradeStatusLoopWorker
 */
var upgradeStatusLoopWorker = {
  /**
   * Time in milliseconds before fetching new status request.
   * @type {number}
   */
  timeOut: 1000,

  /**
   * The id of the timer function for the worker.
   * @type {number}
   */
  timeOutHandle: 0,
  iterations: 0,
  filename: '',
  initialize: function initialize(filename) {
    upgradeStatusLoopWorker.filename = filename;
    upgradeStatusLoopWorker.iterations = 0;
    upgradeStatusLoopWorker.restartWorker();
  },
  restartWorker: function restartWorker() {
    window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
    upgradeStatusLoopWorker.worker();
  },
  worker: function worker() {
    window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
    PbxApi.FilesFirmwareDownloadStatus(upgradeStatusLoopWorker.filename, upgradeStatusLoopWorker.cbRefreshUpgradeStatus);
  },
  cbRefreshUpgradeStatus: function cbRefreshUpgradeStatus(response) {
    upgradeStatusLoopWorker.iterations += 1;
    upgradeStatusLoopWorker.timeoutHandle = window.setTimeout(upgradeStatusLoopWorker.worker, upgradeStatusLoopWorker.timeOut);
    if (response.length === 0 || response === false) return;

    if (response.d_status === 'DOWNLOAD_IN_PROGRESS') {
      $('i.loading.redo').closest('a').find('.percent').text("".concat(response.d_status_progress, "%"));
    } else if (response.d_status === 'DOWNLOAD_COMPLETE') {
      window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
      $('i.loading.redo').closest('a').find('.percent').text("".concat(response.d_status_progress, "%"));
      $('i.loading.redo').addClass('sync').removeClass('redo');
      PbxApi.SystemUpgrade(response.filePath, updatePBX.cbAfterStartUpdate);
    } else if (response.d_status === 'DOWNLOAD_ERROR') {
      window.clearTimeout(upgradeStatusLoopWorker.timeoutHandle);
      UserMessage.showMultiString(globalTranslate.upd_DownloadUpgradeError);
      $('i.loading.redo').addClass('redo').removeClass('loading');
    }
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9VcGRhdGUvdXBkYXRlLXN0YXR1cy13b3JrZXIuanMiXSwibmFtZXMiOlsidXBncmFkZVN0YXR1c0xvb3BXb3JrZXIiLCJ0aW1lT3V0IiwidGltZU91dEhhbmRsZSIsIml0ZXJhdGlvbnMiLCJmaWxlbmFtZSIsImluaXRpYWxpemUiLCJyZXN0YXJ0V29ya2VyIiwid2luZG93IiwiY2xlYXJUaW1lb3V0IiwidGltZW91dEhhbmRsZSIsIndvcmtlciIsIlBieEFwaSIsIkZpbGVzRmlybXdhcmVEb3dubG9hZFN0YXR1cyIsImNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMiLCJyZXNwb25zZSIsInNldFRpbWVvdXQiLCJsZW5ndGgiLCJkX3N0YXR1cyIsIiQiLCJjbG9zZXN0IiwiZmluZCIsInRleHQiLCJkX3N0YXR1c19wcm9ncmVzcyIsImFkZENsYXNzIiwicmVtb3ZlQ2xhc3MiLCJTeXN0ZW1VcGdyYWRlIiwiZmlsZVBhdGgiLCJ1cGRhdGVQQlgiLCJjYkFmdGVyU3RhcnRVcGRhdGUiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImdsb2JhbFRyYW5zbGF0ZSIsInVwZF9Eb3dubG9hZFVwZ3JhZGVFcnJvciJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSx1QkFBdUIsR0FBRztBQUU1QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUUsSUFObUI7O0FBUTVCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxDQVphO0FBYzVCQyxFQUFBQSxVQUFVLEVBQUUsQ0FkZ0I7QUFlNUJDLEVBQUFBLFFBQVEsRUFBRSxFQWZrQjtBQWdCNUJDLEVBQUFBLFVBaEI0QixzQkFnQmpCRCxRQWhCaUIsRUFnQlA7QUFDakJKLElBQUFBLHVCQUF1QixDQUFDSSxRQUF4QixHQUFtQ0EsUUFBbkM7QUFDQUosSUFBQUEsdUJBQXVCLENBQUNHLFVBQXhCLEdBQXFDLENBQXJDO0FBQ0FILElBQUFBLHVCQUF1QixDQUFDTSxhQUF4QjtBQUNILEdBcEIyQjtBQXFCNUJBLEVBQUFBLGFBckI0QiwyQkFxQlo7QUFDWkMsSUFBQUEsTUFBTSxDQUFDQyxZQUFQLENBQW9CUix1QkFBdUIsQ0FBQ1MsYUFBNUM7QUFDQVQsSUFBQUEsdUJBQXVCLENBQUNVLE1BQXhCO0FBQ0gsR0F4QjJCO0FBeUI1QkEsRUFBQUEsTUF6QjRCLG9CQXlCbkI7QUFDTEgsSUFBQUEsTUFBTSxDQUFDQyxZQUFQLENBQW9CUix1QkFBdUIsQ0FBQ1MsYUFBNUM7QUFDQUUsSUFBQUEsTUFBTSxDQUFDQywyQkFBUCxDQUFtQ1osdUJBQXVCLENBQUNJLFFBQTNELEVBQXFFSix1QkFBdUIsQ0FBQ2Esc0JBQTdGO0FBQ0gsR0E1QjJCO0FBNkI1QkEsRUFBQUEsc0JBN0I0QixrQ0E2QkxDLFFBN0JLLEVBNkJLO0FBQzdCZCxJQUFBQSx1QkFBdUIsQ0FBQ0csVUFBeEIsSUFBc0MsQ0FBdEM7QUFDQUgsSUFBQUEsdUJBQXVCLENBQUNTLGFBQXhCLEdBQ0lGLE1BQU0sQ0FBQ1EsVUFBUCxDQUFrQmYsdUJBQXVCLENBQUNVLE1BQTFDLEVBQWtEVix1QkFBdUIsQ0FBQ0MsT0FBMUUsQ0FESjtBQUVBLFFBQUlhLFFBQVEsQ0FBQ0UsTUFBVCxLQUFvQixDQUFwQixJQUF5QkYsUUFBUSxLQUFLLEtBQTFDLEVBQWlEOztBQUNqRCxRQUFJQSxRQUFRLENBQUNHLFFBQVQsS0FBc0Isc0JBQTFCLEVBQWtEO0FBQzlDQyxNQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQkMsT0FBcEIsQ0FBNEIsR0FBNUIsRUFBaUNDLElBQWpDLENBQXNDLFVBQXRDLEVBQWtEQyxJQUFsRCxXQUEwRFAsUUFBUSxDQUFDUSxpQkFBbkU7QUFDSCxLQUZELE1BRU8sSUFBSVIsUUFBUSxDQUFDRyxRQUFULEtBQXNCLG1CQUExQixFQUErQztBQUNsRFYsTUFBQUEsTUFBTSxDQUFDQyxZQUFQLENBQW9CUix1QkFBdUIsQ0FBQ1MsYUFBNUM7QUFDQVMsTUFBQUEsQ0FBQyxDQUFDLGdCQUFELENBQUQsQ0FBb0JDLE9BQXBCLENBQTRCLEdBQTVCLEVBQWlDQyxJQUFqQyxDQUFzQyxVQUF0QyxFQUFrREMsSUFBbEQsV0FBMERQLFFBQVEsQ0FBQ1EsaUJBQW5FO0FBQ0FKLE1BQUFBLENBQUMsQ0FBQyxnQkFBRCxDQUFELENBQW9CSyxRQUFwQixDQUE2QixNQUE3QixFQUFxQ0MsV0FBckMsQ0FBaUQsTUFBakQ7QUFDQWIsTUFBQUEsTUFBTSxDQUFDYyxhQUFQLENBQXFCWCxRQUFRLENBQUNZLFFBQTlCLEVBQXdDQyxTQUFTLENBQUNDLGtCQUFsRDtBQUNILEtBTE0sTUFLQSxJQUFJZCxRQUFRLENBQUNHLFFBQVQsS0FBc0IsZ0JBQTFCLEVBQTRDO0FBQy9DVixNQUFBQSxNQUFNLENBQUNDLFlBQVAsQ0FBb0JSLHVCQUF1QixDQUFDUyxhQUE1QztBQUNBb0IsTUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCQyxlQUFlLENBQUNDLHdCQUE1QztBQUNBZCxNQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQkssUUFBcEIsQ0FBNkIsTUFBN0IsRUFBcUNDLFdBQXJDLENBQWlELFNBQWpEO0FBQ0g7QUFDSjtBQTlDMkIsQ0FBaEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCB1cGRhdGVQQlggKi9cblxuLyoqXG4gKiBXb3JrZXIgb2JqZWN0IGZvciBjaGVja2luZyBmaWxlIG1lcmdpbmcgc3RhdHVzLlxuICpcbiAqIEBtb2R1bGUgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXJcbiAqL1xuY29uc3QgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIgPSB7XG5cbiAgICAvKipcbiAgICAgKiBUaW1lIGluIG1pbGxpc2Vjb25kcyBiZWZvcmUgZmV0Y2hpbmcgbmV3IHN0YXR1cyByZXF1ZXN0LlxuICAgICAqIEB0eXBlIHtudW1iZXJ9XG4gICAgICovXG4gICAgdGltZU91dDogMTAwMCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBpZCBvZiB0aGUgdGltZXIgZnVuY3Rpb24gZm9yIHRoZSB3b3JrZXIuXG4gICAgICogQHR5cGUge251bWJlcn1cbiAgICAgKi9cbiAgICB0aW1lT3V0SGFuZGxlOiAwLFxuICAgIFxuICAgIGl0ZXJhdGlvbnM6IDAsXG4gICAgZmlsZW5hbWU6ICcnLFxuICAgIGluaXRpYWxpemUoZmlsZW5hbWUpIHtcbiAgICAgICAgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuZmlsZW5hbWUgPSBmaWxlbmFtZTtcbiAgICAgICAgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaXRlcmF0aW9ucyA9IDA7XG4gICAgICAgIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnJlc3RhcnRXb3JrZXIoKTtcbiAgICB9LFxuICAgIHJlc3RhcnRXb3JrZXIoKSB7XG4gICAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZW91dEhhbmRsZSk7XG4gICAgICAgIHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLndvcmtlcigpO1xuICAgIH0sXG4gICAgd29ya2VyKCkge1xuICAgICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLnRpbWVvdXRIYW5kbGUpO1xuICAgICAgICBQYnhBcGkuRmlsZXNGaXJtd2FyZURvd25sb2FkU3RhdHVzKHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLmZpbGVuYW1lLCB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci5jYlJlZnJlc2hVcGdyYWRlU3RhdHVzKTtcbiAgICB9LFxuICAgIGNiUmVmcmVzaFVwZ3JhZGVTdGF0dXMocmVzcG9uc2UpIHtcbiAgICAgICAgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIuaXRlcmF0aW9ucyArPSAxO1xuICAgICAgICB1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlID1cbiAgICAgICAgICAgIHdpbmRvdy5zZXRUaW1lb3V0KHVwZ3JhZGVTdGF0dXNMb29wV29ya2VyLndvcmtlciwgdXBncmFkZVN0YXR1c0xvb3BXb3JrZXIudGltZU91dCk7XG4gICAgICAgIGlmIChyZXNwb25zZS5sZW5ndGggPT09IDAgfHwgcmVzcG9uc2UgPT09IGZhbHNlKSByZXR1cm47XG4gICAgICAgIGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0lOX1BST0dSRVNTJykge1xuICAgICAgICAgICAgJCgnaS5sb2FkaW5nLnJlZG8nKS5jbG9zZXN0KCdhJykuZmluZCgnLnBlcmNlbnQnKS50ZXh0KGAke3Jlc3BvbnNlLmRfc3RhdHVzX3Byb2dyZXNzfSVgKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0NPTVBMRVRFJykge1xuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcbiAgICAgICAgICAgICQoJ2kubG9hZGluZy5yZWRvJykuY2xvc2VzdCgnYScpLmZpbmQoJy5wZXJjZW50JykudGV4dChgJHtyZXNwb25zZS5kX3N0YXR1c19wcm9ncmVzc30lYCk7XG4gICAgICAgICAgICAkKCdpLmxvYWRpbmcucmVkbycpLmFkZENsYXNzKCdzeW5jJykucmVtb3ZlQ2xhc3MoJ3JlZG8nKTtcbiAgICAgICAgICAgIFBieEFwaS5TeXN0ZW1VcGdyYWRlKHJlc3BvbnNlLmZpbGVQYXRoLCB1cGRhdGVQQlguY2JBZnRlclN0YXJ0VXBkYXRlKTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5kX3N0YXR1cyA9PT0gJ0RPV05MT0FEX0VSUk9SJykge1xuICAgICAgICAgICAgd2luZG93LmNsZWFyVGltZW91dCh1cGdyYWRlU3RhdHVzTG9vcFdvcmtlci50aW1lb3V0SGFuZGxlKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUudXBkX0Rvd25sb2FkVXBncmFkZUVycm9yKTtcbiAgICAgICAgICAgICQoJ2kubG9hZGluZy5yZWRvJykuYWRkQ2xhc3MoJ3JlZG8nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9XG4gICAgfSxcbn07Il19