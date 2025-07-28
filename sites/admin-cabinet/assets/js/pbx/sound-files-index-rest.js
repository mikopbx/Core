"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, SoundFilesAPI, globalTranslate, UserMessage, IndexSoundPlayer, SemanticLocalization */

/**
 * Sound files table management module with template preservation
 */
var soundFilesTable = {
  $customTab: $('#custom-sound-files-table'),
  $mohTab: $('#moh-sound-files-table'),
  activeCategory: 'custom',
  soundPlayers: {},
  customDataTable: null,
  mohDataTable: null,

  /**
   * Initialize the module
   */
  initialize: function initialize() {
    // Initialize tabs
    $('#sound-files-menu .item').tab({
      onVisible: function onVisible(tabPath) {
        soundFilesTable.activeCategory = tabPath;
        soundFilesTable.loadSoundFiles(tabPath);
      }
    }); // Load initial data

    soundFilesTable.loadSoundFiles('custom');
  },

  /**
   * Load sound files from REST API and render using templates
   */
  loadSoundFiles: function loadSoundFiles(category) {
    // Show loading state
    var $container = category === 'custom' ? $('.ui.tab[data-tab="custom"]') : $('.ui.tab[data-tab="moh"]');
    $container.addClass('loading'); // Get data from REST API

    SoundFilesAPI.getList({
      category: category
    }, function (response) {
      if (response.result && response.data) {
        soundFilesTable.renderSoundFiles(response.data, category);
      } else {
        var _response$messages;

        UserMessage.showError(((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || 'Failed to load sound files');
      }

      $container.removeClass('loading');
    });
  },

  /**
   * Render sound files using template structure
   */
  renderSoundFiles: function renderSoundFiles(files, category) {
    var $container = category === 'custom' ? $('.ui.tab[data-tab="custom"]') : $('.ui.tab[data-tab="moh"]');
    var tableId = category === 'custom' ? 'custom-sound-files-table' : 'moh-sound-files-table'; // Clean up existing sound players

    Object.keys(soundFilesTable.soundPlayers).forEach(function (playerId) {
      if (soundFilesTable.soundPlayers[playerId]) {
        // Stop any playing audio
        var player = soundFilesTable.soundPlayers[playerId];

        if (player.html5Audio) {
          player.html5Audio.pause();
          player.html5Audio.src = '';
        }

        delete soundFilesTable.soundPlayers[playerId];
      }
    }); // Destroy existing DataTable if exists

    var existingTable = $("#".concat(tableId));

    if (existingTable.length && $.fn.DataTable.isDataTable(existingTable)) {
      existingTable.DataTable().destroy();
    } // Remove only the table and its wrapper, preserve the grid structure


    $container.find('.dataTables_wrapper').remove();
    $container.find('> table').remove(); // Direct child tables only

    $container.find('.ui.placeholder.segment').remove(); // Find the grid structure or create a placeholder for table

    var $gridRow = $container.find('.ui.grid').first();
    var $tableContainer = $container; // If grid exists, place table after it

    if ($gridRow.length > 0) {
      // Check if we already have a table container div after grid
      var $existingContainer = $gridRow.next('.table-content');

      if ($existingContainer.length === 0) {
        $existingContainer = $('<div class="table-content"></div>');
        $gridRow.after($existingContainer);
      }

      $tableContainer = $existingContainer;
      $tableContainer.empty();
    }

    if (files.length === 0) {
      // Show empty placeholder
      var emptyHtml = soundFilesTable.getEmptyPlaceholder(category);
      $tableContainer.append(emptyHtml);
      return;
    } // Build table using template structure


    var tableHtml = "<table class=\"ui selectable very compact unstackable table\" id=\"".concat(tableId, "\">\n            <thead>\n                <tr>\n                    <th>").concat(globalTranslate.sf_ColumnFile, "</th>\n                    <th class=\"six wide\">").concat(globalTranslate.sf_ColumnPlayer, "</th>\n                    <th class=\"collapsing\"></th>\n                </tr>\n            </thead>\n            <tbody>"); // Build rows using template structure from customTab.volt

    files.forEach(function (file) {
      tableHtml += soundFilesTable.renderFileRow(file);
    });
    tableHtml += "</tbody></table>";
    $tableContainer.append(tableHtml); // Initialize DataTable

    var $table = $("#".concat(tableId));
    var dataTable = $table.DataTable({
      lengthChange: false,
      paging: false,
      searching: true,
      info: false,
      ordering: true,
      language: SemanticLocalization.dataTableLocalisation,
      order: [[0, 'asc']]
    }); // Initialize audio players immediately after table creation

    files.forEach(function (file) {
      if (file.path && file.id) {
        soundFilesTable.soundPlayers[file.id] = new IndexSoundPlayer(file.id);
      }
    }); // Move the DataTable search filter to the grid next to the button

    var $wrapper = $("#".concat(tableId, "_wrapper"));

    if ($wrapper.length) {
      var $searchDiv = $wrapper.find('.dataTables_filter');

      if ($searchDiv.length) {
        // Find the right column in the grid
        var $rightColumn = $container.find('.ui.grid .right.aligned.column').first();

        if ($rightColumn.length) {
          // Remove any existing search filters first
          $rightColumn.find('.dataTables_filter').remove();
          $searchDiv.appendTo($rightColumn);
        }
      }
    } // Store DataTable reference


    if (category === 'custom') {
      soundFilesTable.customDataTable = dataTable;
    } else {
      soundFilesTable.mohDataTable = dataTable;
    } // Initialize delete handler for REST API


    soundFilesTable.initializeDeleteHandler(); // Initialize double-click for editing

    soundFilesTable.initializeDoubleClickEdit($container);
  },

  /**
   * Render single file row using template structure
   */
  renderFileRow: function renderFileRow(file) {
    var playPath = file.path ? "/pbxcore/api/cdr/v2/playback?view=".concat(file.path) : '';
    var downloadPath = file.path ? "/pbxcore/api/cdr/v2/playback?view=".concat(file.path, "&download=1&filename=").concat(file.name, ".mp3") : '';
    return "<tr class=\"file-row\" id=\"".concat(file.id, "\" data-value=\"").concat(file.path || '', "\">\n            <td><i class=\"file audio outline icon\"></i>").concat(file.name, "</td>\n            <td class=\"six wide cdr-player\">\n                <table>\n                    <tr>\n                        <td class=\"one wide\">\n                            ").concat(file.path ? "<i class=\"ui icon play\"></i>\n                                 <audio preload=\"metadata\" id=\"audio-player-".concat(file.id, "\">\n                                     <source src=\"").concat(playPath, "\"/>\n                                 </audio>") : "<i class=\"ui icon play disabled\"></i>\n                                 <audio preload=\"none\" id=\"audio-player-".concat(file.id, "\">\n                                     <source src=\"\"/>\n                                 </audio>"), "\n                        </td>\n                        <td>\n                            <div class=\"ui range cdr-player\"></div>\n                        </td>\n                        <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n                        <td class=\"one wide\">\n                            <i class=\"ui icon download\" data-value=\"").concat(file.path ? downloadPath : '', "\"></i>\n                        </td>\n                    </tr>\n                </table>\n            </td>\n            <td class=\"collapsing\">\n                <div class=\"ui tiny basic icon buttons action-buttons\">\n                    <a href=\"").concat(globalRootUrl, "sound-files/modify/").concat(file.id, "\" \n                       class=\"ui button edit popuped\"\n                       data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                        <i class=\"icon edit blue\"></i>\n                    </a>\n                    <a href=\"").concat(globalRootUrl, "sound-files/delete/").concat(file.id, "\" \n                       data-value=\"").concat(file.id, "\"\n                       class=\"ui button delete two-steps-delete popuped\"\n                       data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                        <i class=\"icon trash red\"></i>\n                    </a>\n                </div>\n            </td>\n        </tr>");
  },

  /**
   * Get empty placeholder HTML
   */
  getEmptyPlaceholder: function getEmptyPlaceholder(category) {
    var linkPath = category === 'custom' ? 'sound-files/modify/custom' : 'sound-files/modify/moh';
    return "<div class=\"ui placeholder segment\">\n            <div class=\"ui icon header\">\n                <i class=\"music icon\"></i>\n                ".concat(globalTranslate.sf_EmptyTableTitle, "\n            </div>\n            <p>").concat(globalTranslate.sf_EmptyTableDescription, "</p>\n            <div class=\"ui primary button\" onclick=\"window.location='").concat(globalRootUrl).concat(linkPath, "'\">\n                <i class=\"add circle icon\"></i> ").concat(globalTranslate.sf_AddNewSoundFile, "\n            </div>\n        </div>");
  },

  /**
   * Initialize delete handler for REST API
   */
  initializeDeleteHandler: function initializeDeleteHandler() {
    // Remove any existing handlers to prevent duplicates
    $('body').off('click.soundfiles'); // Handle actual deletion after two-steps confirmation

    $('body').on('click.soundfiles', 'a.delete:not(.two-steps-delete)', function (e) {
      var $target = $(e.target).closest('a.delete'); // Check if this delete button is in our sound files table

      if ($target.closest('#custom-sound-files-table, #moh-sound-files-table').length === 0) {
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();
      var fileId = $target.attr('data-value');
      $target.addClass('loading disabled');
      SoundFilesAPI.deleteRecord(fileId, function (response) {
        soundFilesTable.cbAfterDeleteRecord(response);
      });
    });
  },

  /**
   * Callback after record deletion
   */
  cbAfterDeleteRecord: function cbAfterDeleteRecord(response) {
    if (response.result === true) {
      // Reload current tab
      soundFilesTable.loadSoundFiles(soundFilesTable.activeCategory);
    } else {
      var _response$messages2;

      UserMessage.showError(((_response$messages2 = response.messages) === null || _response$messages2 === void 0 ? void 0 : _response$messages2.error) || globalTranslate.sf_ImpossibleToDeleteSoundFile);
    } // Remove loading indicator


    $('a.delete').removeClass('loading disabled');
  },

  /**
   * Initialize double-click for editing
   */
  initializeDoubleClickEdit: function initializeDoubleClickEdit($container) {
    $container.on('dblclick', 'tr.file-row td', function (e) {
      // Skip if clicking on action buttons column
      if ($(this).hasClass('collapsing') || $(this).find('.action-buttons').length > 0) {
        return;
      } // Skip if clicking on any button or icon


      if ($(e.target).closest('button, a, i').length > 0) {
        return;
      }

      var $row = $(this).closest('tr');
      var fileId = $row.attr('id');

      if (fileId) {
        window.location = "".concat(globalRootUrl, "sound-files/modify/").concat(fileId);
      }
    });
  }
};
/**
 * Initialize on document ready
 */

$(document).ready(function () {
  soundFilesTable.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LXJlc3QuanMiXSwibmFtZXMiOlsic291bmRGaWxlc1RhYmxlIiwiJGN1c3RvbVRhYiIsIiQiLCIkbW9oVGFiIiwiYWN0aXZlQ2F0ZWdvcnkiLCJzb3VuZFBsYXllcnMiLCJjdXN0b21EYXRhVGFibGUiLCJtb2hEYXRhVGFibGUiLCJpbml0aWFsaXplIiwidGFiIiwib25WaXNpYmxlIiwidGFiUGF0aCIsImxvYWRTb3VuZEZpbGVzIiwiY2F0ZWdvcnkiLCIkY29udGFpbmVyIiwiYWRkQ2xhc3MiLCJTb3VuZEZpbGVzQVBJIiwiZ2V0TGlzdCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsInJlbmRlclNvdW5kRmlsZXMiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJyZW1vdmVDbGFzcyIsImZpbGVzIiwidGFibGVJZCIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwicGxheWVySWQiLCJwbGF5ZXIiLCJodG1sNUF1ZGlvIiwicGF1c2UiLCJzcmMiLCJleGlzdGluZ1RhYmxlIiwibGVuZ3RoIiwiZm4iLCJEYXRhVGFibGUiLCJpc0RhdGFUYWJsZSIsImRlc3Ryb3kiLCJmaW5kIiwicmVtb3ZlIiwiJGdyaWRSb3ciLCJmaXJzdCIsIiR0YWJsZUNvbnRhaW5lciIsIiRleGlzdGluZ0NvbnRhaW5lciIsIm5leHQiLCJhZnRlciIsImVtcHR5IiwiZW1wdHlIdG1sIiwiZ2V0RW1wdHlQbGFjZWhvbGRlciIsImFwcGVuZCIsInRhYmxlSHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsInNmX0NvbHVtbkZpbGUiLCJzZl9Db2x1bW5QbGF5ZXIiLCJmaWxlIiwicmVuZGVyRmlsZVJvdyIsIiR0YWJsZSIsImRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInNlYXJjaGluZyIsImluZm8iLCJvcmRlcmluZyIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJvcmRlciIsInBhdGgiLCJpZCIsIkluZGV4U291bmRQbGF5ZXIiLCIkd3JhcHBlciIsIiRzZWFyY2hEaXYiLCIkcmlnaHRDb2x1bW4iLCJhcHBlbmRUbyIsImluaXRpYWxpemVEZWxldGVIYW5kbGVyIiwiaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCIsInBsYXlQYXRoIiwiZG93bmxvYWRQYXRoIiwibmFtZSIsImdsb2JhbFJvb3RVcmwiLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBEZWxldGUiLCJsaW5rUGF0aCIsInNmX0VtcHR5VGFibGVUaXRsZSIsInNmX0VtcHR5VGFibGVEZXNjcmlwdGlvbiIsInNmX0FkZE5ld1NvdW5kRmlsZSIsIm9mZiIsIm9uIiwiZSIsIiR0YXJnZXQiLCJ0YXJnZXQiLCJjbG9zZXN0IiwicHJldmVudERlZmF1bHQiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCJmaWxlSWQiLCJhdHRyIiwiZGVsZXRlUmVjb3JkIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsInNmX0ltcG9zc2libGVUb0RlbGV0ZVNvdW5kRmlsZSIsImhhc0NsYXNzIiwiJHJvdyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGVBQWUsR0FBRztBQUNwQkMsRUFBQUEsVUFBVSxFQUFFQyxDQUFDLENBQUMsMkJBQUQsQ0FETztBQUVwQkMsRUFBQUEsT0FBTyxFQUFFRCxDQUFDLENBQUMsd0JBQUQsQ0FGVTtBQUdwQkUsRUFBQUEsY0FBYyxFQUFFLFFBSEk7QUFJcEJDLEVBQUFBLFlBQVksRUFBRSxFQUpNO0FBS3BCQyxFQUFBQSxlQUFlLEVBQUUsSUFMRztBQU1wQkMsRUFBQUEs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QkFBMUIsRUFBNEMsVUFBU0MsQ0FBVCxFQUFZO0FBQ3BEO0FBQ0EsVUFBSTNGLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUXNHLFFBQVIsQ0FBaUIsWUFBakIsS0FBa0N0RyxDQUFDLENBQUMsSUFBRCxDQUFELENBQVF5QyxJQUFSLENBQWEsaUJBQWIsRUFBZ0NMLE1BQWhDLEdBQXlDLENBQS9FLEVBQWtGO0FBQzlFO0FBQ0gsT0FKbUQsQ0FNcEQ7OztBQUNBLFVBQUlwQyxDQUFDLENBQUMyRixDQUFDLENBQUNFLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLGNBQXBCLEVBQW9DMUQsTUFBcEMsR0FBNkMsQ0FBakQsRUFBb0Q7QUFDaEQ7QUFDSDs7QUFFRCxVQUFNbUUsSUFBSSxHQUFHdkcsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFROEYsT0FBUixDQUFnQixJQUFoQixDQUFiO0FBQ0EsVUFBTUcsTUFBTSxHQUFHTSxJQUFJLENBQUNMLElBQUwsQ0FBVSxJQUFWLENBQWY7O0FBQ0EsVUFBSUQsTUFBSixFQUFZO0FBQ1JPLFFBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQnZCLGFBQXJCLGdDQUF3RGUsTUFBeEQ7QUFDSDtBQUNKLEtBaEJEO0FBaUJIO0FBN1NtQixDQUF4QjtBQWdUQTtBQUNBO0FBQ0E7O0FBQ0FqRyxDQUFDLENBQUMwRyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCN0csRUFBQUEsZUFBZSxDQUFDUSxVQUFoQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU291bmRGaWxlc0FQSSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgSW5kZXhTb3VuZFBsYXllciwgU2VtYW50aWNMb2NhbGl6YXRpb24gKi9cblxuLyoqXG4gKiBTb3VuZCBmaWxlcyB0YWJsZSBtYW5hZ2VtZW50IG1vZHVsZSB3aXRoIHRlbXBsYXRlIHByZXNlcnZhdGlvblxuICovXG5jb25zdCBzb3VuZEZpbGVzVGFibGUgPSB7XG4gICAgJGN1c3RvbVRhYjogJCgnI2N1c3RvbS1zb3VuZC1maWxlcy10YWJsZScpLFxuICAgICRtb2hUYWI6ICQoJyNtb2gtc291bmQtZmlsZXMtdGFibGUnKSxcbiAgICBhY3RpdmVDYXRlZ29yeTogJ2N1c3RvbScsXG4gICAgc291bmRQbGF5ZXJzOiB7fSxcbiAgICBjdXN0b21EYXRhVGFibGU6IG51bGwsXG4gICAgbW9oRGF0YVRhYmxlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWJzXG4gICAgICAgICQoJyNzb3VuZC1maWxlcy1tZW51IC5pdGVtJykudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogKHRhYlBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVzVGFibGUuYWN0aXZlQ2F0ZWdvcnkgPSB0YWJQYXRoO1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZXNUYWJsZS5sb2FkU291bmRGaWxlcyh0YWJQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGluaXRpYWwgZGF0YVxuICAgICAgICBzb3VuZEZpbGVzVGFibGUubG9hZFNvdW5kRmlsZXMoJ2N1c3RvbScpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBzb3VuZCBmaWxlcyBmcm9tIFJFU1QgQVBJIGFuZCByZW5kZXIgdXNpbmcgdGVtcGxhdGVzXG4gICAgICovXG4gICAgbG9hZFNvdW5kRmlsZXMoY2F0ZWdvcnkpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSBjYXRlZ29yeSA9PT0gJ2N1c3RvbScgPyAkKCcudWkudGFiW2RhdGEtdGFiPVwiY3VzdG9tXCJdJykgOiAkKCcudWkudGFiW2RhdGEtdGFiPVwibW9oXCJdJyk7XG4gICAgICAgICRjb250YWluZXIuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgU291bmRGaWxlc0FQSS5nZXRMaXN0KHsgY2F0ZWdvcnk6IGNhdGVnb3J5IH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlc1RhYmxlLnJlbmRlclNvdW5kRmlsZXMocmVzcG9uc2UuZGF0YSwgY2F0ZWdvcnkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBzb3VuZCBmaWxlcycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGNvbnRhaW5lci5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciBzb3VuZCBmaWxlcyB1c2luZyB0ZW1wbGF0ZSBzdHJ1Y3R1cmVcbiAgICAgKi9cbiAgICByZW5kZXJTb3VuZEZpbGVzKGZpbGVzLCBjYXRlZ29yeSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gY2F0ZWdvcnkgPT09ICdjdXN0b20nID8gJCgnLnVpLnRhYltkYXRhLXRhYj1cImN1c3RvbVwiXScpIDogJCgnLnVpLnRhYltkYXRhLXRhYj1cIm1vaFwiXScpO1xuICAgICAgICBjb25zdCB0YWJsZUlkID0gY2F0ZWdvcnkgPT09ICdjdXN0b20nID8gJ2N1c3RvbS1zb3VuZC1maWxlcy10YWJsZScgOiAnbW9oLXNvdW5kLWZpbGVzLXRhYmxlJztcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFuIHVwIGV4aXN0aW5nIHNvdW5kIHBsYXllcnNcbiAgICAgICAgT2JqZWN0LmtleXMoc291bmRGaWxlc1RhYmxlLnNvdW5kUGxheWVycykuZm9yRWFjaChwbGF5ZXJJZCA9PiB7XG4gICAgICAgICAgICBpZiAoc291bmRGaWxlc1RhYmxlLnNvdW5kUGxheWVyc1twbGF5ZXJJZF0pIHtcbiAgICAgICAgICAgICAgICAvLyBTdG9wIGFueSBwbGF5aW5nIGF1ZGlvXG4gICAgICAgICAgICAgICAgY29uc3QgcGxheWVyID0gc291bmRGaWxlc1RhYmxlLnNvdW5kUGxheWVyc1twbGF5ZXJJZF07XG4gICAgICAgICAgICAgICAgaWYgKHBsYXllci5odG1sNUF1ZGlvKSB7XG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5odG1sNUF1ZGlvLnBhdXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIHBsYXllci5odG1sNUF1ZGlvLnNyYyA9ICcnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkZWxldGUgc291bmRGaWxlc1RhYmxlLnNvdW5kUGxheWVyc1twbGF5ZXJJZF07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBEYXRhVGFibGUgaWYgZXhpc3RzXG4gICAgICAgIGNvbnN0IGV4aXN0aW5nVGFibGUgPSAkKGAjJHt0YWJsZUlkfWApO1xuICAgICAgICBpZiAoZXhpc3RpbmdUYWJsZS5sZW5ndGggJiYgJC5mbi5EYXRhVGFibGUuaXNEYXRhVGFibGUoZXhpc3RpbmdUYWJsZSkpIHtcbiAgICAgICAgICAgIGV4aXN0aW5nVGFibGUuRGF0YVRhYmxlKCkuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgb25seSB0aGUgdGFibGUgYW5kIGl0cyB3cmFwcGVyLCBwcmVzZXJ2ZSB0aGUgZ3JpZCBzdHJ1Y3R1cmVcbiAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZGF0YVRhYmxlc193cmFwcGVyJykucmVtb3ZlKCk7XG4gICAgICAgICRjb250YWluZXIuZmluZCgnPiB0YWJsZScpLnJlbW92ZSgpOyAvLyBEaXJlY3QgY2hpbGQgdGFibGVzIG9ubHlcbiAgICAgICAgJGNvbnRhaW5lci5maW5kKCcudWkucGxhY2Vob2xkZXIuc2VnbWVudCcpLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gRmluZCB0aGUgZ3JpZCBzdHJ1Y3R1cmUgb3IgY3JlYXRlIGEgcGxhY2Vob2xkZXIgZm9yIHRhYmxlXG4gICAgICAgIGxldCAkZ3JpZFJvdyA9ICRjb250YWluZXIuZmluZCgnLnVpLmdyaWQnKS5maXJzdCgpO1xuICAgICAgICBsZXQgJHRhYmxlQ29udGFpbmVyID0gJGNvbnRhaW5lcjtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIGdyaWQgZXhpc3RzLCBwbGFjZSB0YWJsZSBhZnRlciBpdFxuICAgICAgICBpZiAoJGdyaWRSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgd2UgYWxyZWFkeSBoYXZlIGEgdGFibGUgY29udGFpbmVyIGRpdiBhZnRlciBncmlkXG4gICAgICAgICAgICBsZXQgJGV4aXN0aW5nQ29udGFpbmVyID0gJGdyaWRSb3cubmV4dCgnLnRhYmxlLWNvbnRlbnQnKTtcbiAgICAgICAgICAgIGlmICgkZXhpc3RpbmdDb250YWluZXIubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgJGV4aXN0aW5nQ29udGFpbmVyID0gJCgnPGRpdiBjbGFzcz1cInRhYmxlLWNvbnRlbnRcIj48L2Rpdj4nKTtcbiAgICAgICAgICAgICAgICAkZ3JpZFJvdy5hZnRlcigkZXhpc3RpbmdDb250YWluZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJHRhYmxlQ29udGFpbmVyID0gJGV4aXN0aW5nQ29udGFpbmVyO1xuICAgICAgICAgICAgJHRhYmxlQ29udGFpbmVyLmVtcHR5KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmIChmaWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIFNob3cgZW1wdHkgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIGNvbnN0IGVtcHR5SHRtbCA9IHNvdW5kRmlsZXNUYWJsZS5nZXRFbXB0eVBsYWNlaG9sZGVyKGNhdGVnb3J5KTtcbiAgICAgICAgICAgICR0YWJsZUNvbnRhaW5lci5hcHBlbmQoZW1wdHlIdG1sKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgdGFibGUgdXNpbmcgdGVtcGxhdGUgc3RydWN0dXJlXG4gICAgICAgIGxldCB0YWJsZUh0bWwgPSBgPHRhYmxlIGNsYXNzPVwidWkgc2VsZWN0YWJsZSB2ZXJ5IGNvbXBhY3QgdW5zdGFja2FibGUgdGFibGVcIiBpZD1cIiR7dGFibGVJZH1cIj5cbiAgICAgICAgICAgIDx0aGVhZD5cbiAgICAgICAgICAgICAgICA8dHI+XG4gICAgICAgICAgICAgICAgICAgIDx0aD4ke2dsb2JhbFRyYW5zbGF0ZS5zZl9Db2x1bW5GaWxlfTwvdGg+XG4gICAgICAgICAgICAgICAgICAgIDx0aCBjbGFzcz1cInNpeCB3aWRlXCI+JHtnbG9iYWxUcmFuc2xhdGUuc2ZfQ29sdW1uUGxheWVyfTwvdGg+XG4gICAgICAgICAgICAgICAgICAgIDx0aCBjbGFzcz1cImNvbGxhcHNpbmdcIj48L3RoPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICA8L3RoZWFkPlxuICAgICAgICAgICAgPHRib2R5PmA7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCByb3dzIHVzaW5nIHRlbXBsYXRlIHN0cnVjdHVyZSBmcm9tIGN1c3RvbVRhYi52b2x0XG4gICAgICAgIGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICAgIHRhYmxlSHRtbCArPSBzb3VuZEZpbGVzVGFibGUucmVuZGVyRmlsZVJvdyhmaWxlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0YWJsZUh0bWwgKz0gYDwvdGJvZHk+PC90YWJsZT5gO1xuICAgICAgICAkdGFibGVDb250YWluZXIuYXBwZW5kKHRhYmxlSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIERhdGFUYWJsZVxuICAgICAgICBjb25zdCAkdGFibGUgPSAkKGAjJHt0YWJsZUlkfWApO1xuICAgICAgICBjb25zdCBkYXRhVGFibGUgPSAkdGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoaW5nOiB0cnVlLFxuICAgICAgICAgICAgaW5mbzogZmFsc2UsXG4gICAgICAgICAgICBvcmRlcmluZzogdHJ1ZSxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBvcmRlcjogW1swLCAnYXNjJ11dXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhdWRpbyBwbGF5ZXJzIGltbWVkaWF0ZWx5IGFmdGVyIHRhYmxlIGNyZWF0aW9uXG4gICAgICAgIGZpbGVzLmZvckVhY2goKGZpbGUpID0+IHtcbiAgICAgICAgICAgIGlmIChmaWxlLnBhdGggJiYgZmlsZS5pZCkge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnNbZmlsZS5pZF0gPSBuZXcgSW5kZXhTb3VuZFBsYXllcihmaWxlLmlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBNb3ZlIHRoZSBEYXRhVGFibGUgc2VhcmNoIGZpbHRlciB0byB0aGUgZ3JpZCBuZXh0IHRvIHRoZSBidXR0b25cbiAgICAgICAgY29uc3QgJHdyYXBwZXIgPSAkKGAjJHt0YWJsZUlkfV93cmFwcGVyYCk7XG4gICAgICAgIGlmICgkd3JhcHBlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICRzZWFyY2hEaXYgPSAkd3JhcHBlci5maW5kKCcuZGF0YVRhYmxlc19maWx0ZXInKTtcbiAgICAgICAgICAgIGlmICgkc2VhcmNoRGl2Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIEZpbmQgdGhlIHJpZ2h0IGNvbHVtbiBpbiB0aGUgZ3JpZFxuICAgICAgICAgICAgICAgIGNvbnN0ICRyaWdodENvbHVtbiA9ICRjb250YWluZXIuZmluZCgnLnVpLmdyaWQgLnJpZ2h0LmFsaWduZWQuY29sdW1uJykuZmlyc3QoKTtcbiAgICAgICAgICAgICAgICBpZiAoJHJpZ2h0Q29sdW1uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYW55IGV4aXN0aW5nIHNlYXJjaCBmaWx0ZXJzIGZpcnN0XG4gICAgICAgICAgICAgICAgICAgICRyaWdodENvbHVtbi5maW5kKCcuZGF0YVRhYmxlc19maWx0ZXInKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgJHNlYXJjaERpdi5hcHBlbmRUbygkcmlnaHRDb2x1bW4pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgRGF0YVRhYmxlIHJlZmVyZW5jZVxuICAgICAgICBpZiAoY2F0ZWdvcnkgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICBzb3VuZEZpbGVzVGFibGUuY3VzdG9tRGF0YVRhYmxlID0gZGF0YVRhYmxlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc291bmRGaWxlc1RhYmxlLm1vaERhdGFUYWJsZSA9IGRhdGFUYWJsZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkZWxldGUgaGFuZGxlciBmb3IgUkVTVCBBUElcbiAgICAgICAgc291bmRGaWxlc1RhYmxlLmluaXRpYWxpemVEZWxldGVIYW5kbGVyKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRvdWJsZS1jbGljayBmb3IgZWRpdGluZ1xuICAgICAgICBzb3VuZEZpbGVzVGFibGUuaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgkY29udGFpbmVyKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciBzaW5nbGUgZmlsZSByb3cgdXNpbmcgdGVtcGxhdGUgc3RydWN0dXJlXG4gICAgICovXG4gICAgcmVuZGVyRmlsZVJvdyhmaWxlKSB7XG4gICAgICAgIGNvbnN0IHBsYXlQYXRoID0gZmlsZS5wYXRoID8gYC9wYnhjb3JlL2FwaS9jZHIvdjIvcGxheWJhY2s/dmlldz0ke2ZpbGUucGF0aH1gIDogJyc7XG4gICAgICAgIGNvbnN0IGRvd25sb2FkUGF0aCA9IGZpbGUucGF0aCA/IGAvcGJ4Y29yZS9hcGkvY2RyL3YyL3BsYXliYWNrP3ZpZXc9JHtmaWxlLnBhdGh9JmRvd25sb2FkPTEmZmlsZW5hbWU9JHtmaWxlLm5hbWV9Lm1wM2AgOiAnJztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgPHRyIGNsYXNzPVwiZmlsZS1yb3dcIiBpZD1cIiR7ZmlsZS5pZH1cIiBkYXRhLXZhbHVlPVwiJHtmaWxlLnBhdGggfHwgJyd9XCI+XG4gICAgICAgICAgICA8dGQ+PGkgY2xhc3M9XCJmaWxlIGF1ZGlvIG91dGxpbmUgaWNvblwiPjwvaT4ke2ZpbGUubmFtZX08L3RkPlxuICAgICAgICAgICAgPHRkIGNsYXNzPVwic2l4IHdpZGUgY2RyLXBsYXllclwiPlxuICAgICAgICAgICAgICAgIDx0YWJsZT5cbiAgICAgICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2ZpbGUucGF0aCA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgPGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YXVkaW8gcHJlbG9hZD1cIm1ldGFkYXRhXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtmaWxlLmlkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzb3VyY2Ugc3JjPVwiJHtwbGF5UGF0aH1cIi8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2F1ZGlvPmAgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5IGRpc2FibGVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGF1ZGlvIHByZWxvYWQ9XCJub25lXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtmaWxlLmlkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzb3VyY2Ugc3JjPVwiXCIvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hdWRpbz5gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCIgZGF0YS12YWx1ZT1cIiR7ZmlsZS5wYXRoID8gZG93bmxvYWRQYXRoIDogJyd9XCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgIDx0ZCBjbGFzcz1cImNvbGxhcHNpbmdcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9tb2RpZnkvJHtmaWxlLmlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBlZGl0IHBvcHVwZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9kZWxldGUvJHtmaWxlLmlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtmaWxlLmlkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZSB0d28tc3RlcHMtZGVsZXRlIHBvcHVwZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgPC90cj5gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGVtcHR5IHBsYWNlaG9sZGVyIEhUTUxcbiAgICAgKi9cbiAgICBnZXRFbXB0eVBsYWNlaG9sZGVyKGNhdGVnb3J5KSB7XG4gICAgICAgIGNvbnN0IGxpbmtQYXRoID0gY2F0ZWdvcnkgPT09ICdjdXN0b20nID8gJ3NvdW5kLWZpbGVzL21vZGlmeS9jdXN0b20nIDogJ3NvdW5kLWZpbGVzL21vZGlmeS9tb2gnO1xuICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJ1aSBwbGFjZWhvbGRlciBzZWdtZW50XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaWNvbiBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIm11c2ljIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfRW1wdHlUYWJsZVRpdGxlfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5zZl9FbXB0eVRhYmxlRGVzY3JpcHRpb259PC9wPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHByaW1hcnkgYnV0dG9uXCIgb25jbGljaz1cIndpbmRvdy5sb2NhdGlvbj0nJHtnbG9iYWxSb290VXJsfSR7bGlua1BhdGh9J1wiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiYWRkIGNpcmNsZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5zZl9BZGROZXdTb3VuZEZpbGV9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVsZXRlIGhhbmRsZXIgZm9yIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgaGFuZGxlcnMgdG8gcHJldmVudCBkdXBsaWNhdGVzXG4gICAgICAgICQoJ2JvZHknKS5vZmYoJ2NsaWNrLnNvdW5kZmlsZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBhY3R1YWwgZGVsZXRpb24gYWZ0ZXIgdHdvLXN0ZXBzIGNvbmZpcm1hdGlvblxuICAgICAgICAkKCdib2R5Jykub24oJ2NsaWNrLnNvdW5kZmlsZXMnLCAnYS5kZWxldGU6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhLmRlbGV0ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGRlbGV0ZSBidXR0b24gaXMgaW4gb3VyIHNvdW5kIGZpbGVzIHRhYmxlXG4gICAgICAgICAgICBpZiAoJHRhcmdldC5jbG9zZXN0KCcjY3VzdG9tLXNvdW5kLWZpbGVzLXRhYmxlLCAjbW9oLXNvdW5kLWZpbGVzLXRhYmxlJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBmaWxlSWQgPSAkdGFyZ2V0LmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHRhcmdldC5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBTb3VuZEZpbGVzQVBJLmRlbGV0ZVJlY29yZChmaWxlSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZXNUYWJsZS5jYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHJlY29yZCBkZWxldGlvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gUmVsb2FkIGN1cnJlbnQgdGFiXG4gICAgICAgICAgICBzb3VuZEZpbGVzVGFibGUubG9hZFNvdW5kRmlsZXMoc291bmRGaWxlc1RhYmxlLmFjdGl2ZUNhdGVnb3J5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihcbiAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnNmX0ltcG9zc2libGVUb0RlbGV0ZVNvdW5kRmlsZVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgaW5kaWNhdG9yXG4gICAgICAgICQoJ2EuZGVsZXRlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZG91YmxlLWNsaWNrIGZvciBlZGl0aW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgkY29udGFpbmVyKSB7XG4gICAgICAgICRjb250YWluZXIub24oJ2RibGNsaWNrJywgJ3RyLmZpbGUtcm93IHRkJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgLy8gU2tpcCBpZiBjbGlja2luZyBvbiBhY3Rpb24gYnV0dG9ucyBjb2x1bW5cbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmhhc0NsYXNzKCdjb2xsYXBzaW5nJykgfHwgJCh0aGlzKS5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTa2lwIGlmIGNsaWNraW5nIG9uIGFueSBidXR0b24gb3IgaWNvblxuICAgICAgICAgICAgaWYgKCQoZS50YXJnZXQpLmNsb3Nlc3QoJ2J1dHRvbiwgYSwgaScpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCBmaWxlSWQgPSAkcm93LmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoZmlsZUlkKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9tb2RpZnkvJHtmaWxlSWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzb3VuZEZpbGVzVGFibGUuaW5pdGlhbGl6ZSgpO1xufSk7Il19