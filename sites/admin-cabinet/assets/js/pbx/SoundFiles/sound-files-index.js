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

/* global globalTranslate, SemanticLocalization, PbxApi, globalRootUrl, IndexSoundPlayer*/
var soundFiles = {
  $audioFilesList: $('#custom-sound-files-table, #moh-sound-files-table'),
  $contentFrame: $('#content-frame'),
  $tabMenuItems: $('#sound-files-menu .item'),
  initialize: function () {
    function initialize() {
      soundFiles.$tabMenuItems.tab({
        history: true,
        historyType: 'hash'
      });
      soundFiles.$audioFilesList.DataTable({
        lengthChange: false,
        paging: false,
        columns: [null, {
          orderable: false,
          searchable: false
        }, {
          orderable: false,
          searchable: false
        }],
        order: [0, 'asc'],
        initComplete: function () {
          function initComplete() {
            $('.file-row').each(function (index, row) {
              var id = $(row).attr('id');
              return new IndexSoundPlayer(id);
            });
          }

          return initComplete;
        }(),
        language: SemanticLocalization.dataTableLocalisation
      });
      soundFiles.dataTable = soundFiles.$audioFilesList.DataTable();
      soundFiles.dataTable.on('draw', function () {
        $('.file-row').each(function (index, row) {
          var id = $(row).attr('id');
          return new IndexSoundPlayer(id);
        });
      });
      $('#add-new-custom-button').appendTo($('#custom-sound-files-table_wrapper div.eight.column:eq(0)'));
      $('#add-new-moh-button').appendTo($('#moh-sound-files-table_wrapper div.eight.column:eq(0)'));
      var toArray = Array.prototype.slice;
      toArray.apply(document.getElementsByTagName('audio')).forEach(function (audio) {
        audio.addEventListener('error', soundFiles.handleMediaError);
      });
      $('body').on('click', 'a.delete', function (e) {
        e.preventDefault();
        var fileName = $(e.target).closest('tr').attr('data-value');
        var fileId = $(e.target).closest('tr').attr('id');
        PbxApi.FilesRemoveAudioFile(fileName, fileId, soundFiles.cbAfterDelete);
      });
    }

    return initialize;
  }(),

  /**
   * Callback after success file delete
   * @param id
   * @returns {boolean|boolean}
   */
  cbAfterDelete: function () {
    function cbAfterDelete(id) {
      $('.message.ajax').remove();
      $.api({
        url: "".concat(globalRootUrl, "sound-files/delete/").concat(id),
        on: 'now',
        successTest: function () {
          function successTest(response) {
            // test whether a JSON response is valid
            return response !== undefined && Object.keys(response).length > 0;
          }

          return successTest;
        }(),
        onSuccess: function () {
          function onSuccess(response) {
            if (response.success === true) {
              soundFiles.$audioFilesList.find("tr[id=".concat(id, "]")).remove();
            } else {
              soundFiles.$contentFrame.before("<div class=\"ui error message ajax\">".concat(response.message.error, "</div>"));
            }
          }

          return onSuccess;
        }()
      });
    }

    return cbAfterDelete;
  }(),
  handleMediaError: function () {
    function handleMediaError(e) {
      switch (e.target.error.code) {
        case e.target.error.MEDIA_ERR_ABORTED:
          console.log('You aborted the media playback.');
          break;

        case e.target.error.MEDIA_ERR_NETWORK:
          console.log('A network error caused the media download to fail.');
          break;

        case e.target.error.MEDIA_ERR_DECODE:
          console.log('The media playback was aborted due to a corruption problem or because the media used features your browser did not support.');
          break;

        case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          console.log('The media could not be loaded, either because the server or network failed or because the format is not supported.');
          break;

        default:
          console.log('An unknown media error occurred.');
      }

      var $row = $(e.target).closest('tr');
      $row.addClass('negative');
      $row.find('td.player').html(globalTranslate.sf_FileNotFound);
    }

    return handleMediaError;
  }()
};
$(document).ready(function () {
  soundFiles.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LmpzIl0sIm5hbWVzIjpbInNvdW5kRmlsZXMiLCIkYXVkaW9GaWxlc0xpc3QiLCIkIiwiJGNvbnRlbnRGcmFtZSIsIiR0YWJNZW51SXRlbXMiLCJpbml0aWFsaXplIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwiRGF0YVRhYmxlIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJvcmRlciIsImluaXRDb21wbGV0ZSIsImVhY2giLCJpbmRleCIsInJvdyIsImlkIiwiYXR0ciIsIkluZGV4U291bmRQbGF5ZXIiLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZGF0YVRhYmxlIiwib24iLCJhcHBlbmRUbyIsInRvQXJyYXkiLCJBcnJheSIsInByb3RvdHlwZSIsInNsaWNlIiwiYXBwbHkiLCJkb2N1bWVudCIsImdldEVsZW1lbnRzQnlUYWdOYW1lIiwiZm9yRWFjaCIsImF1ZGlvIiwiYWRkRXZlbnRMaXN0ZW5lciIsImhhbmRsZU1lZGlhRXJyb3IiLCJlIiwicHJldmVudERlZmF1bHQiLCJmaWxlTmFtZSIsInRhcmdldCIsImNsb3Nlc3QiLCJmaWxlSWQiLCJQYnhBcGkiLCJGaWxlc1JlbW92ZUF1ZGlvRmlsZSIsImNiQWZ0ZXJEZWxldGUiLCJyZW1vdmUiLCJhcGkiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwic3VjY2Vzc1Rlc3QiLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsIk9iamVjdCIsImtleXMiLCJsZW5ndGgiLCJvblN1Y2Nlc3MiLCJzdWNjZXNzIiwiZmluZCIsImJlZm9yZSIsIm1lc3NhZ2UiLCJlcnJvciIsImNvZGUiLCJNRURJQV9FUlJfQUJPUlRFRCIsImNvbnNvbGUiLCJsb2ciLCJNRURJQV9FUlJfTkVUV09SSyIsIk1FRElBX0VSUl9ERUNPREUiLCJNRURJQV9FUlJfU1JDX05PVF9TVVBQT1JURUQiLCIkcm93IiwiYWRkQ2xhc3MiLCJodG1sIiwiZ2xvYmFsVHJhbnNsYXRlIiwic2ZfRmlsZU5vdEZvdW5kIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQWtCQTtBQUdBLElBQU1BLFVBQVUsR0FBRztBQUNsQkMsRUFBQUEsZUFBZSxFQUFFQyxDQUFDLENBQUMsbURBQUQsQ0FEQTtBQUVsQkMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsZ0JBQUQsQ0FGRTtBQUdsQkUsRUFBQUEsYUFBYSxFQUFFRixDQUFDLENBQUMseUJBQUQsQ0FIRTtBQUlsQkcsRUFBQUEsVUFKa0I7QUFBQSwwQkFJTDtBQUNaTCxNQUFBQSxVQUFVLENBQUNJLGFBQVgsQ0FBeUJFLEdBQXpCLENBQTZCO0FBQzVCQyxRQUFBQSxPQUFPLEVBQUUsSUFEbUI7QUFFNUJDLFFBQUFBLFdBQVcsRUFBRTtBQUZlLE9BQTdCO0FBSUFSLE1BQUFBLFVBQVUsQ0FBQ0MsZUFBWCxDQUEyQlEsU0FBM0IsQ0FBcUM7QUFDcENDLFFBQUFBLFlBQVksRUFBRSxLQURzQjtBQUVwQ0MsUUFBQUEsTUFBTSxFQUFFLEtBRjRCO0FBR3BDQyxRQUFBQSxPQUFPLEVBQUUsQ0FDUixJQURRLEVBRVI7QUFBRUMsVUFBQUEsU0FBUyxFQUFFLEtBQWI7QUFBb0JDLFVBQUFBLFVBQVUsRUFBRTtBQUFoQyxTQUZRLEVBR1I7QUFBRUQsVUFBQUEsU0FBUyxFQUFFLEtBQWI7QUFBb0JDLFVBQUFBLFVBQVUsRUFBRTtBQUFoQyxTQUhRLENBSDJCO0FBUXBDQyxRQUFBQSxLQUFLLEVBQUUsQ0FBQyxDQUFELEVBQUksS0FBSixDQVI2QjtBQVNwQ0MsUUFBQUEsWUFUb0M7QUFBQSxrQ0FTckI7QUFDZGQsWUFBQUEsQ0FBQyxDQUFDLFdBQUQsQ0FBRCxDQUFlZSxJQUFmLENBQW9CLFVBQUNDLEtBQUQsRUFBUUMsR0FBUixFQUFnQjtBQUNuQyxrQkFBTUMsRUFBRSxHQUFHbEIsQ0FB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SSxDQUFDWCxJQUFMLENBQVUsV0FBVixFQUF1QmEsSUFBdkIsQ0FBNEJDLGVBQWUsQ0FBQ0MsZUFBNUM7QUFDQTs7QUExRmlCO0FBQUE7QUFBQSxDQUFuQjtBQThGQTFFLENBQUMsQ0FBQ2dDLFFBQUQsQ0FBRCxDQUFZMkMsS0FBWixDQUFrQixZQUFNO0FBQ3ZCN0UsRUFBQUEsVUFBVSxDQUFDSyxVQUFYO0FBQ0EsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgKEMpIDIwMTctMjAyMCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsVHJhbnNsYXRlLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgUGJ4QXBpLCBnbG9iYWxSb290VXJsLCBJbmRleFNvdW5kUGxheWVyKi9cblxuXG5jb25zdCBzb3VuZEZpbGVzID0ge1xuXHQkYXVkaW9GaWxlc0xpc3Q6ICQoJyNjdXN0b20tc291bmQtZmlsZXMtdGFibGUsICNtb2gtc291bmQtZmlsZXMtdGFibGUnKSxcblx0JGNvbnRlbnRGcmFtZTogJCgnI2NvbnRlbnQtZnJhbWUnKSxcblx0JHRhYk1lbnVJdGVtczogJCgnI3NvdW5kLWZpbGVzLW1lbnUgLml0ZW0nKSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHRzb3VuZEZpbGVzLiR0YWJNZW51SXRlbXMudGFiKHtcblx0XHRcdGhpc3Rvcnk6IHRydWUsXG5cdFx0XHRoaXN0b3J5VHlwZTogJ2hhc2gnLFxuXHRcdH0pO1xuXHRcdHNvdW5kRmlsZXMuJGF1ZGlvRmlsZXNMaXN0LkRhdGFUYWJsZSh7XG5cdFx0XHRsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuXHRcdFx0cGFnaW5nOiBmYWxzZSxcblx0XHRcdGNvbHVtbnM6IFtcblx0XHRcdFx0bnVsbCxcblx0XHRcdFx0eyBvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZSB9LFxuXHRcdFx0XHR7IG9yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlIH0sXG5cdFx0XHRdLFxuXHRcdFx0b3JkZXI6IFswLCAnYXNjJ10sXG5cdFx0XHRpbml0Q29tcGxldGUoKSB7XG5cdFx0XHRcdCQoJy5maWxlLXJvdycpLmVhY2goKGluZGV4LCByb3cpID0+IHtcblx0XHRcdFx0XHRjb25zdCBpZCA9ICQocm93KS5hdHRyKCdpZCcpO1xuXHRcdFx0XHRcdHJldHVybiBuZXcgSW5kZXhTb3VuZFBsYXllcihpZCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG5cdFx0fSk7XG5cdFx0c291bmRGaWxlcy5kYXRhVGFibGUgPSBzb3VuZEZpbGVzLiRhdWRpb0ZpbGVzTGlzdC5EYXRhVGFibGUoKTtcblx0XHRzb3VuZEZpbGVzLmRhdGFUYWJsZS5vbignZHJhdycsICgpID0+IHtcblx0XHRcdCQoJy5maWxlLXJvdycpLmVhY2goKGluZGV4LCByb3cpID0+IHtcblx0XHRcdFx0Y29uc3QgaWQgPSAkKHJvdykuYXR0cignaWQnKTtcblx0XHRcdFx0cmV0dXJuIG5ldyBJbmRleFNvdW5kUGxheWVyKGlkKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHRcdCQoJyNhZGQtbmV3LWN1c3RvbS1idXR0b24nKS5hcHBlbmRUbygkKCcjY3VzdG9tLXNvdW5kLWZpbGVzLXRhYmxlX3dyYXBwZXIgZGl2LmVpZ2h0LmNvbHVtbjplcSgwKScpKTtcblx0XHQkKCcjYWRkLW5ldy1tb2gtYnV0dG9uJykuYXBwZW5kVG8oJCgnI21vaC1zb3VuZC1maWxlcy10YWJsZV93cmFwcGVyIGRpdi5laWdodC5jb2x1bW46ZXEoMCknKSk7XG5cdFx0Y29uc3QgdG9BcnJheSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblx0XHR0b0FycmF5LmFwcGx5KGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdhdWRpbycpKS5mb3JFYWNoKChhdWRpbykgPT4ge1xuXHRcdFx0YXVkaW8uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBzb3VuZEZpbGVzLmhhbmRsZU1lZGlhRXJyb3IpO1xuXHRcdH0pO1xuXHRcdCQoJ2JvZHknKS5vbignY2xpY2snLCAnYS5kZWxldGUnLCAoZSkgPT4ge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y29uc3QgZmlsZU5hbWUgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblx0XHRcdGNvbnN0IGZpbGVJZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcblx0XHRcdFBieEFwaS5GaWxlc1JlbW92ZUF1ZGlvRmlsZShmaWxlTmFtZSwgZmlsZUlkLCBzb3VuZEZpbGVzLmNiQWZ0ZXJEZWxldGUpO1xuXHRcdH0pO1xuXHR9LFxuXHQvKipcblx0ICogQ2FsbGJhY2sgYWZ0ZXIgc3VjY2VzcyBmaWxlIGRlbGV0ZVxuXHQgKiBAcGFyYW0gaWRcblx0ICogQHJldHVybnMge2Jvb2xlYW58Ym9vbGVhbn1cblx0ICovXG5cdGNiQWZ0ZXJEZWxldGUoaWQpIHtcblx0XHQkKCcubWVzc2FnZS5hamF4JykucmVtb3ZlKCk7XG5cdFx0JC5hcGkoe1xuXHRcdFx0dXJsOiBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2RlbGV0ZS8ke2lkfWAsXG5cdFx0XHRvbjogJ25vdycsXG5cdFx0XHRzdWNjZXNzVGVzdChyZXNwb25zZSkge1xuXHRcdFx0XHQvLyB0ZXN0IHdoZXRoZXIgYSBKU09OIHJlc3BvbnNlIGlzIHZhbGlkXG5cdFx0XHRcdHJldHVybiByZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHRcdFx0JiYgT2JqZWN0LmtleXMocmVzcG9uc2UpLmxlbmd0aCA+IDA7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzKHJlc3BvbnNlKSB7XG5cdFx0XHRcdGlmIChyZXNwb25zZS5zdWNjZXNzID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0c291bmRGaWxlcy4kYXVkaW9GaWxlc0xpc3QuZmluZChgdHJbaWQ9JHtpZH1dYCkucmVtb3ZlKCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0c291bmRGaWxlcy4kY29udGVudEZyYW1lLmJlZm9yZShgPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2UgYWpheFwiPiR7cmVzcG9uc2UubWVzc2FnZS5lcnJvcn08L2Rpdj5gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSxcblx0aGFuZGxlTWVkaWFFcnJvcihlKSB7XG5cdFx0c3dpdGNoIChlLnRhcmdldC5lcnJvci5jb2RlKSB7XG5cdFx0XHRjYXNlIGUudGFyZ2V0LmVycm9yLk1FRElBX0VSUl9BQk9SVEVEOlxuXHRcdFx0XHRjb25zb2xlLmxvZygnWW91IGFib3J0ZWQgdGhlIG1lZGlhIHBsYXliYWNrLicpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgZS50YXJnZXQuZXJyb3IuTUVESUFfRVJSX05FVFdPUks6XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdBIG5ldHdvcmsgZXJyb3IgY2F1c2VkIHRoZSBtZWRpYSBkb3dubG9hZCB0byBmYWlsLicpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgZS50YXJnZXQuZXJyb3IuTUVESUFfRVJSX0RFQ09ERTpcblx0XHRcdFx0Y29uc29sZS5sb2coJ1RoZSBtZWRpYSBwbGF5YmFjayB3YXMgYWJvcnRlZCBkdWUgdG8gYSBjb3JydXB0aW9uIHByb2JsZW0gb3IgYmVjYXVzZSB0aGUgbWVkaWEgdXNlZCBmZWF0dXJlcyB5b3VyIGJyb3dzZXIgZGlkIG5vdCBzdXBwb3J0LicpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgZS50YXJnZXQuZXJyb3IuTUVESUFfRVJSX1NSQ19OT1RfU1VQUE9SVEVEOlxuXHRcdFx0XHRjb25zb2xlLmxvZygnVGhlIG1lZGlhIGNvdWxkIG5vdCBiZSBsb2FkZWQsIGVpdGhlciBiZWNhdXNlIHRoZSBzZXJ2ZXIgb3IgbmV0d29yayBmYWlsZWQgb3IgYmVjYXVzZSB0aGUgZm9ybWF0IGlzIG5vdCBzdXBwb3J0ZWQuJyk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0Y29uc29sZS5sb2coJ0FuIHVua25vd24gbWVkaWEgZXJyb3Igb2NjdXJyZWQuJyk7XG5cdFx0fVxuXHRcdGNvbnN0ICRyb3cgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpO1xuXHRcdCRyb3cuYWRkQ2xhc3MoJ25lZ2F0aXZlJyk7XG5cdFx0JHJvdy5maW5kKCd0ZC5wbGF5ZXInKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS5zZl9GaWxlTm90Rm91bmQpO1xuXHR9LFxufTtcblxuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG5cdHNvdW5kRmlsZXMuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==