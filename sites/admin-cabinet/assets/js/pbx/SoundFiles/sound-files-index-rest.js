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
    return "<tr class=\"file-row\" id=\"".concat(file.id, "\" data-value=\"").concat(file.path || '', "\">\n            <td><i class=\"file audio outline icon\"></i>").concat(file.name, "</td>\n            <td class=\"six wide cdr-player\">\n                <table>\n                    <tr>\n                        <td class=\"one wide\">\n                            ").concat(file.path ? "<button class=\"ui tiny basic icon button play-button\">\n                                     <i class=\"ui icon play\"></i>\n                                 </button>\n                                 <audio preload=\"metadata\" id=\"audio-player-".concat(file.id, "\">\n                                     <source src=\"").concat(playPath, "\"/>\n                                 </audio>") : "<button class=\"ui tiny basic icon button play-button disabled\">\n                                     <i class=\"ui icon play disabled\"></i>\n                                 </button>\n                                 <audio preload=\"none\" id=\"audio-player-".concat(file.id, "\">\n                                     <source src=\"\"/>\n                                 </audio>"), "\n                        </td>\n                        <td>\n                            <div class=\"ui range cdr-player\"></div>\n                        </td>\n                        <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n                        <td class=\"one wide\">\n                            ").concat(file.path ? "<button class=\"ui tiny basic icon button download-button\" data-value=\"".concat(downloadPath, "\">\n                                     <i class=\"ui icon download\"></i>\n                                 </button>") : "<button class=\"ui tiny basic icon button download-button disabled\">\n                                     <i class=\"ui icon download disabled\"></i>\n                                 </button>", "\n                        </td>\n                    </tr>\n                </table>\n            </td>\n            <td class=\"collapsing\">\n                <div class=\"ui tiny basic icon buttons action-buttons\">\n                    <a href=\"").concat(globalRootUrl, "sound-files/modify/").concat(file.id, "\" \n                       class=\"ui button edit popuped\"\n                       data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                        <i class=\"icon edit blue\"></i>\n                    </a>\n                    <a href=\"").concat(globalRootUrl, "sound-files/delete/").concat(file.id, "\" \n                       data-value=\"").concat(file.id, "\"\n                       class=\"ui button delete two-steps-delete popuped\"\n                       data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                        <i class=\"icon trash red\"></i>\n                    </a>\n                </div>\n            </td>\n        </tr>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LXJlc3QuanMiXSwibmFtZXMiOlsic291bmRGaWxlc1RhYmxlIiwiJGN1c3RvbVRhYiIsIiQiLCIkbW9oVGFiIiwiYWN0aXZlQ2F0ZWdvcnkiLCJzb3VuZFBsYXllcnMiLCJjdXN0b21EYXRhVGFibGUiLCJtb2hEYXRhVGFibGUiLCJpbml0aWFsaXplIiwidGFiIiwib25WaXNpYmxlIiwidGFiUGF0aCIsImxvYWRTb3VuZEZpbGVzIiwiY2F0ZWdvcnkiLCIkY29udGFpbmVyIiwiYWRkQ2xhc3MiLCJTb3VuZEZpbGVzQVBJIiwiZ2V0TGlzdCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsInJlbmRlclNvdW5kRmlsZXMiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJyZW1vdmVDbGFzcyIsImZpbGVzIiwidGFibGVJZCIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwicGxheWVySWQiLCJwbGF5ZXIiLCJodG1sNUF1ZGlvIiwicGF1c2UiLCJzcmMiLCJleGlzdGluZ1RhYmxlIiwibGVuZ3RoIiwiZm4iLCJEYXRhVGFibGUiLCJpc0RhdGFUYWJsZSIsImRlc3Ryb3kiLCJmaW5kIiwicmVtb3ZlIiwiJGdyaWRSb3ciLCJmaXJzdCIsIiR0YWJsZUNvbnRhaW5lciIsIiRleGlzdGluZ0NvbnRhaW5lciIsIm5leHQiLCJhZnRlciIsImVtcHR5IiwiZW1wdHlIdG1sIiwiZ2V0RW1wdHlQbGFjZWhvbGRlciIsImFwcGVuZCIsInRhYmxlSHRtbCIsImdsb2JhbFRyYW5zbGF0ZSIsInNmX0NvbHVtbkZpbGUiLCJzZl9Db2x1bW5QbGF5ZXIiLCJmaWxlIiwicmVuZGVyRmlsZVJvdyIsIiR0YWJsZSIsImRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInNlYXJjaGluZyIsImluZm8iLCJvcmRlcmluZyIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJvcmRlciIsInBhdGgiLCJpZCIsIkluZGV4U291bmRQbGF5ZXIiLCIkd3JhcHBlciIsIiRzZWFyY2hEaXYiLCIkcmlnaHRDb2x1bW4iLCJhcHBlbmRUbyIsImluaXRpYWxpemVEZWxldGVIYW5kbGVyIiwiaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCIsInBsYXlQYXRoIiwiZG93bmxvYWRQYXRoIiwibmFtZSIsImdsb2JhbFJvb3RVcmwiLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBEZWxldGUiLCJsaW5rUGF0aCIsInNmX0VtcHR5VGFibGVUaXRsZSIsInNmX0VtcHR5VGFibGVEZXNjcmlwdGlvbiIsInNmX0FkZE5ld1NvdW5kRmlsZSIsIm9mZiIsIm9uIiwiZSIsIiR0YXJnZXQiLCJ0YXJnZXQiLCJjbG9zZXN0IiwicHJldmVudERlZmF1bHQiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCJmaWxlSWQiLCJhdHRyIiwiZGVsZXRlUmVjb3JkIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsInNmX0ltcG9zc2libGVUb0RlbGV0ZVNvdW5kRmlsZSIsImhhc0NsYXNzIiwiJHJvdyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGVBQWUsR0FBRztBQUNwQkMsRUFBQUEsVUFBVSxFQUFFQyxDQUFDLENBQUMsMkJBQUQsQ0FETztBQUVwQkMsRUFBQUEsT0FBTyxFQUFFRCxDQUFDLENBQUMsd0JBQUQsQ0FGVTtBQUdwQkUsRUFBQUEsY0FBYyxFQUFFLFFBSEk7QUFJcEJDLEVBQUFBLFlBQVksRUFBRSxFQUpNO0FBS3BCQyxFQUFBQSxlQUFlLEVBQUUsSUFMRztBQU1wQkMsRUFB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Z0JBQTFCLEVBQTRDLFVBQVNDLENBQVQsRUFBWTtBQUNwRDtBQUNBLFVBQUkzRixDQUFDLENBQUMsSUFBRCxDQUFELENBQVFzRyxRQUFSLENBQWlCLFlBQWpCLEtBQWtDdEcsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFReUMsSUFBUixDQUFhLGlCQUFiLEVBQWdDTCxNQUFoQyxHQUF5QyxDQUEvRSxFQUFrRjtBQUM5RTtBQUNILE9BSm1ELENBTXBEOzs7QUFDQSxVQUFJcEMsQ0FBQyxDQUFDMkYsQ0FBQyxDQUFDRSxNQUFILENBQUQsQ0FBWUMsT0FBWixDQUFvQixjQUFwQixFQUFvQzFELE1BQXBDLEdBQTZDLENBQWpELEVBQW9EO0FBQ2hEO0FBQ0g7O0FBRUQsVUFBTW1FLElBQUksR0FBR3ZHLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUThGLE9BQVIsQ0FBZ0IsSUFBaEIsQ0FBYjtBQUNBLFVBQU1HLE1BQU0sR0FBR00sSUFBSSxDQUFDTCxJQUFMLENBQVUsSUFBVixDQUFmOztBQUNBLFVBQUlELE1BQUosRUFBWTtBQUNSTyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJ2QixhQUFyQixnQ0FBd0RlLE1BQXhEO0FBQ0g7QUFDSixLQWhCRDtBQWlCSDtBQXhUbUIsQ0FBeEI7QUEyVEE7QUFDQTtBQUNBOztBQUNBakcsQ0FBQyxDQUFDMEcsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjdHLEVBQUFBLGVBQWUsQ0FBQ1EsVUFBaEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNvdW5kRmlsZXNBUEksIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIEluZGV4U291bmRQbGF5ZXIsIFNlbWFudGljTG9jYWxpemF0aW9uICovXG5cbi8qKlxuICogU291bmQgZmlsZXMgdGFibGUgbWFuYWdlbWVudCBtb2R1bGUgd2l0aCB0ZW1wbGF0ZSBwcmVzZXJ2YXRpb25cbiAqL1xuY29uc3Qgc291bmRGaWxlc1RhYmxlID0ge1xuICAgICRjdXN0b21UYWI6ICQoJyNjdXN0b20tc291bmQtZmlsZXMtdGFibGUnKSxcbiAgICAkbW9oVGFiOiAkKCcjbW9oLXNvdW5kLWZpbGVzLXRhYmxlJyksXG4gICAgYWN0aXZlQ2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgIHNvdW5kUGxheWVyczoge30sXG4gICAgY3VzdG9tRGF0YVRhYmxlOiBudWxsLFxuICAgIG1vaERhdGFUYWJsZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICAkKCcjc291bmQtZmlsZXMtbWVudSAuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBvblZpc2libGU6ICh0YWJQYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlc1RhYmxlLmFjdGl2ZUNhdGVnb3J5ID0gdGFiUGF0aDtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVzVGFibGUubG9hZFNvdW5kRmlsZXModGFiUGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBpbml0aWFsIGRhdGFcbiAgICAgICAgc291bmRGaWxlc1RhYmxlLmxvYWRTb3VuZEZpbGVzKCdjdXN0b20nKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgc291bmQgZmlsZXMgZnJvbSBSRVNUIEFQSSBhbmQgcmVuZGVyIHVzaW5nIHRlbXBsYXRlc1xuICAgICAqL1xuICAgIGxvYWRTb3VuZEZpbGVzKGNhdGVnb3J5KSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gY2F0ZWdvcnkgPT09ICdjdXN0b20nID8gJCgnLnVpLnRhYltkYXRhLXRhYj1cImN1c3RvbVwiXScpIDogJCgnLnVpLnRhYltkYXRhLXRhYj1cIm1vaFwiXScpO1xuICAgICAgICAkY29udGFpbmVyLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICAgIFNvdW5kRmlsZXNBUEkuZ2V0TGlzdCh7IGNhdGVnb3J5OiBjYXRlZ29yeSB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZXNUYWJsZS5yZW5kZXJTb3VuZEZpbGVzKHJlc3BvbnNlLmRhdGEsIGNhdGVnb3J5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgc291bmQgZmlsZXMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRjb250YWluZXIucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgc291bmQgZmlsZXMgdXNpbmcgdGVtcGxhdGUgc3RydWN0dXJlXG4gICAgICovXG4gICAgcmVuZGVyU291bmRGaWxlcyhmaWxlcywgY2F0ZWdvcnkpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9IGNhdGVnb3J5ID09PSAnY3VzdG9tJyA/ICQoJy51aS50YWJbZGF0YS10YWI9XCJjdXN0b21cIl0nKSA6ICQoJy51aS50YWJbZGF0YS10YWI9XCJtb2hcIl0nKTtcbiAgICAgICAgY29uc3QgdGFibGVJZCA9IGNhdGVnb3J5ID09PSAnY3VzdG9tJyA/ICdjdXN0b20tc291bmQtZmlsZXMtdGFibGUnIDogJ21vaC1zb3VuZC1maWxlcy10YWJsZSc7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbiB1cCBleGlzdGluZyBzb3VuZCBwbGF5ZXJzXG4gICAgICAgIE9iamVjdC5rZXlzKHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnMpLmZvckVhY2gocGxheWVySWQgPT4ge1xuICAgICAgICAgICAgaWYgKHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnNbcGxheWVySWRdKSB7XG4gICAgICAgICAgICAgICAgLy8gU3RvcCBhbnkgcGxheWluZyBhdWRpb1xuICAgICAgICAgICAgICAgIGNvbnN0IHBsYXllciA9IHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnNbcGxheWVySWRdO1xuICAgICAgICAgICAgICAgIGlmIChwbGF5ZXIuaHRtbDVBdWRpbykge1xuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuaHRtbDVBdWRpby5wYXVzZSgpO1xuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuaHRtbDVBdWRpby5zcmMgPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVsZXRlIHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnNbcGxheWVySWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgRGF0YVRhYmxlIGlmIGV4aXN0c1xuICAgICAgICBjb25zdCBleGlzdGluZ1RhYmxlID0gJChgIyR7dGFibGVJZH1gKTtcbiAgICAgICAgaWYgKGV4aXN0aW5nVGFibGUubGVuZ3RoICYmICQuZm4uRGF0YVRhYmxlLmlzRGF0YVRhYmxlKGV4aXN0aW5nVGFibGUpKSB7XG4gICAgICAgICAgICBleGlzdGluZ1RhYmxlLkRhdGFUYWJsZSgpLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIG9ubHkgdGhlIHRhYmxlIGFuZCBpdHMgd3JhcHBlciwgcHJlc2VydmUgdGhlIGdyaWQgc3RydWN0dXJlXG4gICAgICAgICRjb250YWluZXIuZmluZCgnLmRhdGFUYWJsZXNfd3JhcHBlcicpLnJlbW92ZSgpO1xuICAgICAgICAkY29udGFpbmVyLmZpbmQoJz4gdGFibGUnKS5yZW1vdmUoKTsgLy8gRGlyZWN0IGNoaWxkIHRhYmxlcyBvbmx5XG4gICAgICAgICRjb250YWluZXIuZmluZCgnLnVpLnBsYWNlaG9sZGVyLnNlZ21lbnQnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgdGhlIGdyaWQgc3RydWN0dXJlIG9yIGNyZWF0ZSBhIHBsYWNlaG9sZGVyIGZvciB0YWJsZVxuICAgICAgICBsZXQgJGdyaWRSb3cgPSAkY29udGFpbmVyLmZpbmQoJy51aS5ncmlkJykuZmlyc3QoKTtcbiAgICAgICAgbGV0ICR0YWJsZUNvbnRhaW5lciA9ICRjb250YWluZXI7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBncmlkIGV4aXN0cywgcGxhY2UgdGFibGUgYWZ0ZXIgaXRcbiAgICAgICAgaWYgKCRncmlkUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlIGFscmVhZHkgaGF2ZSBhIHRhYmxlIGNvbnRhaW5lciBkaXYgYWZ0ZXIgZ3JpZFxuICAgICAgICAgICAgbGV0ICRleGlzdGluZ0NvbnRhaW5lciA9ICRncmlkUm93Lm5leHQoJy50YWJsZS1jb250ZW50Jyk7XG4gICAgICAgICAgICBpZiAoJGV4aXN0aW5nQ29udGFpbmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICRleGlzdGluZ0NvbnRhaW5lciA9ICQoJzxkaXYgY2xhc3M9XCJ0YWJsZS1jb250ZW50XCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgJGdyaWRSb3cuYWZ0ZXIoJGV4aXN0aW5nQ29udGFpbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICR0YWJsZUNvbnRhaW5lciA9ICRleGlzdGluZ0NvbnRhaW5lcjtcbiAgICAgICAgICAgICR0YWJsZUNvbnRhaW5lci5lbXB0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBTaG93IGVtcHR5IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICBjb25zdCBlbXB0eUh0bWwgPSBzb3VuZEZpbGVzVGFibGUuZ2V0RW1wdHlQbGFjZWhvbGRlcihjYXRlZ29yeSk7XG4gICAgICAgICAgICAkdGFibGVDb250YWluZXIuYXBwZW5kKGVtcHR5SHRtbCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHRhYmxlIHVzaW5nIHRlbXBsYXRlIHN0cnVjdHVyZVxuICAgICAgICBsZXQgdGFibGVIdG1sID0gYDx0YWJsZSBjbGFzcz1cInVpIHNlbGVjdGFibGUgdmVyeSBjb21wYWN0IHVuc3RhY2thYmxlIHRhYmxlXCIgaWQ9XCIke3RhYmxlSWR9XCI+XG4gICAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICA8dGg+JHtnbG9iYWxUcmFuc2xhdGUuc2ZfQ29sdW1uRmlsZX08L3RoPlxuICAgICAgICAgICAgICAgICAgICA8dGggY2xhc3M9XCJzaXggd2lkZVwiPiR7Z2xvYmFsVHJhbnNsYXRlLnNmX0NvbHVtblBsYXllcn08L3RoPlxuICAgICAgICAgICAgICAgICAgICA8dGggY2xhc3M9XCJjb2xsYXBzaW5nXCI+PC90aD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgPC90aGVhZD5cbiAgICAgICAgICAgIDx0Ym9keT5gO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgcm93cyB1c2luZyB0ZW1wbGF0ZSBzdHJ1Y3R1cmUgZnJvbSBjdXN0b21UYWIudm9sdFxuICAgICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgICB0YWJsZUh0bWwgKz0gc291bmRGaWxlc1RhYmxlLnJlbmRlckZpbGVSb3coZmlsZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGFibGVIdG1sICs9IGA8L3Rib2R5PjwvdGFibGU+YDtcbiAgICAgICAgJHRhYmxlQ29udGFpbmVyLmFwcGVuZCh0YWJsZUh0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBEYXRhVGFibGVcbiAgICAgICAgY29uc3QgJHRhYmxlID0gJChgIyR7dGFibGVJZH1gKTtcbiAgICAgICAgY29uc3QgZGF0YVRhYmxlID0gJHRhYmxlLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IGZhbHNlLFxuICAgICAgICAgICAgb3JkZXJpbmc6IHRydWUsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgb3JkZXI6IFtbMCwgJ2FzYyddXVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYXVkaW8gcGxheWVycyBpbW1lZGlhdGVseSBhZnRlciB0YWJsZSBjcmVhdGlvblxuICAgICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZmlsZS5wYXRoICYmIGZpbGUuaWQpIHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVzVGFibGUuc291bmRQbGF5ZXJzW2ZpbGUuaWRdID0gbmV3IEluZGV4U291bmRQbGF5ZXIoZmlsZS5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gTW92ZSB0aGUgRGF0YVRhYmxlIHNlYXJjaCBmaWx0ZXIgdG8gdGhlIGdyaWQgbmV4dCB0byB0aGUgYnV0dG9uXG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gJChgIyR7dGFibGVJZH1fd3JhcHBlcmApO1xuICAgICAgICBpZiAoJHdyYXBwZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCAkc2VhcmNoRGl2ID0gJHdyYXBwZXIuZmluZCgnLmRhdGFUYWJsZXNfZmlsdGVyJyk7XG4gICAgICAgICAgICBpZiAoJHNlYXJjaERpdi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBGaW5kIHRoZSByaWdodCBjb2x1bW4gaW4gdGhlIGdyaWRcbiAgICAgICAgICAgICAgICBjb25zdCAkcmlnaHRDb2x1bW4gPSAkY29udGFpbmVyLmZpbmQoJy51aS5ncmlkIC5yaWdodC5hbGlnbmVkLmNvbHVtbicpLmZpcnN0KCk7XG4gICAgICAgICAgICAgICAgaWYgKCRyaWdodENvbHVtbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBzZWFyY2ggZmlsdGVycyBmaXJzdFxuICAgICAgICAgICAgICAgICAgICAkcmlnaHRDb2x1bW4uZmluZCgnLmRhdGFUYWJsZXNfZmlsdGVyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICRzZWFyY2hEaXYuYXBwZW5kVG8oJHJpZ2h0Q29sdW1uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIERhdGFUYWJsZSByZWZlcmVuY2VcbiAgICAgICAgaWYgKGNhdGVnb3J5ID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgc291bmRGaWxlc1RhYmxlLmN1c3RvbURhdGFUYWJsZSA9IGRhdGFUYWJsZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvdW5kRmlsZXNUYWJsZS5tb2hEYXRhVGFibGUgPSBkYXRhVGFibGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVsZXRlIGhhbmRsZXIgZm9yIFJFU1QgQVBJXG4gICAgICAgIHNvdW5kRmlsZXNUYWJsZS5pbml0aWFsaXplRGVsZXRlSGFuZGxlcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgICAgc291bmRGaWxlc1RhYmxlLmluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoJGNvbnRhaW5lcik7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgc2luZ2xlIGZpbGUgcm93IHVzaW5nIHRlbXBsYXRlIHN0cnVjdHVyZVxuICAgICAqL1xuICAgIHJlbmRlckZpbGVSb3coZmlsZSkge1xuICAgICAgICBjb25zdCBwbGF5UGF0aCA9IGZpbGUucGF0aCA/IGAvcGJ4Y29yZS9hcGkvY2RyL3YyL3BsYXliYWNrP3ZpZXc9JHtmaWxlLnBhdGh9YCA6ICcnO1xuICAgICAgICBjb25zdCBkb3dubG9hZFBhdGggPSBmaWxlLnBhdGggPyBgL3BieGNvcmUvYXBpL2Nkci92Mi9wbGF5YmFjaz92aWV3PSR7ZmlsZS5wYXRofSZkb3dubG9hZD0xJmZpbGVuYW1lPSR7ZmlsZS5uYW1lfS5tcDNgIDogJyc7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYDx0ciBjbGFzcz1cImZpbGUtcm93XCIgaWQ9XCIke2ZpbGUuaWR9XCIgZGF0YS12YWx1ZT1cIiR7ZmlsZS5wYXRoIHx8ICcnfVwiPlxuICAgICAgICAgICAgPHRkPjxpIGNsYXNzPVwiZmlsZSBhdWRpbyBvdXRsaW5lIGljb25cIj48L2k+JHtmaWxlLm5hbWV9PC90ZD5cbiAgICAgICAgICAgIDx0ZCBjbGFzcz1cInNpeCB3aWRlIGNkci1wbGF5ZXJcIj5cbiAgICAgICAgICAgICAgICA8dGFibGU+XG4gICAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtmaWxlLnBhdGggPyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYDxidXR0b24gY2xhc3M9XCJ1aSB0aW55IGJhc2ljIGljb24gYnV0dG9uIHBsYXktYnV0dG9uXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ1aSBpY29uIHBsYXlcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhdWRpbyBwcmVsb2FkPVwibWV0YWRhdGFcIiBpZD1cImF1ZGlvLXBsYXllci0ke2ZpbGUuaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNvdXJjZSBzcmM9XCIke3BsYXlQYXRofVwiLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYXVkaW8+YCA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgPGJ1dHRvbiBjbGFzcz1cInVpIHRpbnkgYmFzaWMgaWNvbiBidXR0b24gcGxheS1idXR0b24gZGlzYWJsZWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInVpIGljb24gcGxheSBkaXNhYmxlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGF1ZGlvIHByZWxvYWQ9XCJub25lXCIgaWQ9XCJhdWRpby1wbGF5ZXItJHtmaWxlLmlkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzb3VyY2Ugc3JjPVwiXCIvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hdWRpbz5gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcmFuZ2UgY2RyLXBsYXllclwiPjwvZGl2PlxuICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+PHNwYW4gY2xhc3M9XCJjZHItZHVyYXRpb25cIj48L3NwYW4+PC90ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cIm9uZSB3aWRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtmaWxlLnBhdGggPyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYDxidXR0b24gY2xhc3M9XCJ1aSB0aW55IGJhc2ljIGljb24gYnV0dG9uIGRvd25sb2FkLWJ1dHRvblwiIGRhdGEtdmFsdWU9XCIke2Rvd25sb2FkUGF0aH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5gIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGA8YnV0dG9uIGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbiBkb3dubG9hZC1idXR0b24gZGlzYWJsZWRcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInVpIGljb24gZG93bmxvYWQgZGlzYWJsZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgIDx0ZCBjbGFzcz1cImNvbGxhcHNpbmdcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9tb2RpZnkvJHtmaWxlLmlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBlZGl0IHBvcHVwZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9kZWxldGUvJHtmaWxlLmlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtmaWxlLmlkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZSB0d28tc3RlcHMtZGVsZXRlIHBvcHVwZWRcIlxuICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgPC90cj5gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGVtcHR5IHBsYWNlaG9sZGVyIEhUTUxcbiAgICAgKi9cbiAgICBnZXRFbXB0eVBsYWNlaG9sZGVyKGNhdGVnb3J5KSB7XG4gICAgICAgIGNvbnN0IGxpbmtQYXRoID0gY2F0ZWdvcnkgPT09ICdjdXN0b20nID8gJ3NvdW5kLWZpbGVzL21vZGlmeS9jdXN0b20nIDogJ3NvdW5kLWZpbGVzL21vZGlmeS9tb2gnO1xuICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJ1aSBwbGFjZWhvbGRlciBzZWdtZW50XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgaWNvbiBoZWFkZXJcIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIm11c2ljIGljb25cIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfRW1wdHlUYWJsZVRpdGxlfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cD4ke2dsb2JhbFRyYW5zbGF0ZS5zZl9FbXB0eVRhYmxlRGVzY3JpcHRpb259PC9wPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHByaW1hcnkgYnV0dG9uXCIgb25jbGljaz1cIndpbmRvdy5sb2NhdGlvbj0nJHtnbG9iYWxSb290VXJsfSR7bGlua1BhdGh9J1wiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiYWRkIGNpcmNsZSBpY29uXCI+PC9pPiAke2dsb2JhbFRyYW5zbGF0ZS5zZl9BZGROZXdTb3VuZEZpbGV9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVsZXRlIGhhbmRsZXIgZm9yIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3RpbmcgaGFuZGxlcnMgdG8gcHJldmVudCBkdXBsaWNhdGVzXG4gICAgICAgICQoJ2JvZHknKS5vZmYoJ2NsaWNrLnNvdW5kZmlsZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhhbmRsZSBhY3R1YWwgZGVsZXRpb24gYWZ0ZXIgdHdvLXN0ZXBzIGNvbmZpcm1hdGlvblxuICAgICAgICAkKCdib2R5Jykub24oJ2NsaWNrLnNvdW5kZmlsZXMnLCAnYS5kZWxldGU6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhLmRlbGV0ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIGRlbGV0ZSBidXR0b24gaXMgaW4gb3VyIHNvdW5kIGZpbGVzIHRhYmxlXG4gICAgICAgICAgICBpZiAoJHRhcmdldC5jbG9zZXN0KCcjY3VzdG9tLXNvdW5kLWZpbGVzLXRhYmxlLCAjbW9oLXNvdW5kLWZpbGVzLXRhYmxlJykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBjb25zdCBmaWxlSWQgPSAkdGFyZ2V0LmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJHRhcmdldC5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBTb3VuZEZpbGVzQVBJLmRlbGV0ZVJlY29yZChmaWxlSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZXNUYWJsZS5jYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHJlY29yZCBkZWxldGlvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gUmVsb2FkIGN1cnJlbnQgdGFiXG4gICAgICAgICAgICBzb3VuZEZpbGVzVGFibGUubG9hZFNvdW5kRmlsZXMoc291bmRGaWxlc1RhYmxlLmFjdGl2ZUNhdGVnb3J5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihcbiAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnNmX0ltcG9zc2libGVUb0RlbGV0ZVNvdW5kRmlsZVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgaW5kaWNhdG9yXG4gICAgICAgICQoJ2EuZGVsZXRlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZG91YmxlLWNsaWNrIGZvciBlZGl0aW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgkY29udGFpbmVyKSB7XG4gICAgICAgICRjb250YWluZXIub24oJ2RibGNsaWNrJywgJ3RyLmZpbGUtcm93IHRkJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgLy8gU2tpcCBpZiBjbGlja2luZyBvbiBhY3Rpb24gYnV0dG9ucyBjb2x1bW5cbiAgICAgICAgICAgIGlmICgkKHRoaXMpLmhhc0NsYXNzKCdjb2xsYXBzaW5nJykgfHwgJCh0aGlzKS5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTa2lwIGlmIGNsaWNraW5nIG9uIGFueSBidXR0b24gb3IgaWNvblxuICAgICAgICAgICAgaWYgKCQoZS50YXJnZXQpLmNsb3Nlc3QoJ2J1dHRvbiwgYSwgaScpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0ICRyb3cgPSAkKHRoaXMpLmNsb3Nlc3QoJ3RyJyk7XG4gICAgICAgICAgICBjb25zdCBmaWxlSWQgPSAkcm93LmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBpZiAoZmlsZUlkKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9tb2RpZnkvJHtmaWxlSWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzb3VuZEZpbGVzVGFibGUuaW5pdGlhbGl6ZSgpO1xufSk7Il19