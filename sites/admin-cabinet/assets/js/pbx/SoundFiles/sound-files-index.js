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
      history: true,
      historyType: 'hash',
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
    var tableId = category === 'custom' ? 'custom-sound-files-table' : 'moh-sound-files-table';
    var $addButton = category === 'custom' ? $('#add-new-custom-button') : $('#add-new-moh-button'); // Clean up existing sound players

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
      // Hide the add button when showing empty placeholder
      $addButton.hide(); // Show empty placeholder

      var emptyHtml = soundFilesTable.getEmptyPlaceholder(category);
      $tableContainer.append(emptyHtml);
      return;
    } // Show the add button when displaying data


    $addButton.show(); // Build table using template structure

    var tableHtml = "<table class=\"ui selectable very compact unstackable table\" id=\"".concat(tableId, "\">\n            <thead>\n                <tr>\n                    <th>").concat(globalTranslate.sf_ColumnFile, "</th>\n                    <th class=\"six wide hide-on-mobile\">").concat(globalTranslate.sf_ColumnPlayer, "</th>\n                    <th class=\"collapsing\"></th>\n                </tr>\n            </thead>\n            <tbody>"); // Build rows using template structure from customTab.volt

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
    // Use new sound-files endpoint for MOH/IVR/system sounds (not CDR recordings)
    var playPath = file.path ? "/pbxcore/api/v3/sound-files:playback?view=".concat(file.path) : '';
    var downloadPath = file.path ? "/pbxcore/api/v3/sound-files:playback?view=".concat(file.path, "&download=1&filename=").concat(file.name) : '';
    return "<tr class=\"file-row\" id=\"".concat(file.id, "\" data-value=\"").concat(file.path || '', "\">\n            <td><i class=\"file audio outline icon\"></i>").concat(file.name, "</td>\n            <td class=\"six wide cdr-player hide-on-mobile\">\n                <table>\n                    <tr>\n                        <td class=\"one wide\">\n                            ").concat(file.path ? "<button class=\"ui tiny basic icon button play-button\">\n                                     <i class=\"ui icon play\"></i>\n                                 </button>\n                                 <audio preload=\"none\" id=\"audio-player-".concat(file.id, "\" data-src=\"").concat(playPath, "\">\n                                     <source src=\"\"/>\n                                 </audio>") : "<button class=\"ui tiny basic icon button play-button disabled\">\n                                     <i class=\"ui icon play disabled\"></i>\n                                 </button>\n                                 <audio preload=\"none\" id=\"audio-player-".concat(file.id, "\">\n                                     <source src=\"\"/>\n                                 </audio>"), "\n                        </td>\n                        <td>\n                            <div class=\"ui range cdr-player\"></div>\n                        </td>\n                        <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n                        <td class=\"one wide\">\n                            ").concat(file.path ? "<button class=\"ui tiny basic icon button download-button\" data-value=\"".concat(downloadPath, "\">\n                                     <i class=\"ui icon download\"></i>\n                                 </button>") : "<button class=\"ui tiny basic icon button download-button disabled\">\n                                     <i class=\"ui icon download disabled\"></i>\n                                 </button>", "\n                        </td>\n                    </tr>\n                </table>\n            </td>\n            <td class=\"collapsing\">\n                <div class=\"ui tiny basic icon buttons action-buttons\">\n                    <a href=\"").concat(globalRootUrl, "sound-files/modify/").concat(file.id, "\" \n                       class=\"ui button edit popuped\"\n                       data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                        <i class=\"icon edit blue\"></i>\n                    </a>\n                    <a href=\"").concat(globalRootUrl, "sound-files/delete/").concat(file.id, "\" \n                       data-value=\"").concat(file.id, "\"\n                       class=\"ui button delete two-steps-delete popuped\"\n                       data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                        <i class=\"icon trash red\"></i>\n                    </a>\n                </div>\n            </td>\n        </tr>");
  },

  /**
   * Get empty placeholder HTML matching partials/emptyTablePlaceholder.volt structure
   */
  getEmptyPlaceholder: function getEmptyPlaceholder(category) {
    var linkPath = category === 'custom' ? 'sound-files/modify/custom' : 'sound-files/modify/moh';
    return "<div class=\"ui placeholder segment\">\n            <div class=\"ui icon header\">\n                <i class=\"music icon\"></i>\n                ".concat(globalTranslate.sf_EmptyTableTitle, "\n            </div>\n            <div class=\"inline\">\n                <div class=\"ui text\">\n                    ").concat(globalTranslate.sf_EmptyTableDescription, "\n                </div>\n            </div>\n            <div style=\"margin-top: 1em;\">\n                <a href=\"https://wiki.mikopbx.com/sound-files\" target=\"_blank\" class=\"ui basic tiny button prevent-word-wrap\">\n                    <i class=\"question circle outline icon\"></i>\n                    ").concat(globalTranslate.et_ReadDocumentation, "\n                </a>\n            </div>\n            <div style=\"margin-top: 1em; text-align: center;\">\n                <a href=\"").concat(globalRootUrl).concat(linkPath, "\" class=\"ui blue button prevent-word-wrap\">\n                    <i class=\"add circle icon\"></i> ").concat(globalTranslate.sf_AddNewSoundFile, "\n                </a>\n            </div>\n        </div>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LmpzIl0sIm5hbWVzIjpbInNvdW5kRmlsZXNUYWJsZSIsIiRjdXN0b21UYWIiLCIkIiwiJG1vaFRhYiIsImFjdGl2ZUNhdGVnb3J5Iiwic291bmRQbGF5ZXJzIiwiY3VzdG9tRGF0YVRhYmxlIiwibW9oRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJsb2FkU291bmRGaWxlcyIsImNhdGVnb3J5IiwiJGNvbnRhaW5lciIsImFkZENsYXNzIiwiU291bmRGaWxlc0FQSSIsImdldExpc3QiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJyZW5kZXJTb3VuZEZpbGVzIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImVycm9yIiwicmVtb3ZlQ2xhc3MiLCJmaWxlcyIsInRhYmxlSWQiLCIkYWRkQnV0dG9uIiwiT2JqZWN0Iiwia2V5cyIsImZvckVhY2giLCJwbGF5ZXJJZCIsInBsYXllciIsImh0bWw1QXVkaW8iLCJwYXVzZSIsInNyYyIsImV4aXN0aW5nVGFibGUiLCJsZW5ndGgiLCJmbiIsIkRhdGFUYWJsZSIsImlzRGF0YVRhYmxlIiwiZGVzdHJveSIsImZpbmQiLCJyZW1vdmUiLCIkZ3JpZFJvdyIsImZpcnN0IiwiJHRhYmxlQ29udGFpbmVyIiwiJGV4aXN0aW5nQ29udGFpbmVyIiwibmV4dCIsImFmdGVyIiwiZW1wdHkiLCJoaWRlIiwiZW1wdHlIdG1sIiwiZ2V0RW1wdHlQbGFjZWhvbGRlciIsImFwcGVuZCIsInNob3ciLCJ0YWJsZUh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9Db2x1bW5GaWxlIiwic2ZfQ29sdW1uUGxheWVyIiwiZmlsZSIsInJlbmRlckZpbGVSb3ciLCIkdGFibGUiLCJkYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJzZWFyY2hpbmciLCJpbmZvIiwib3JkZXJpbmciLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwib3JkZXIiLCJwYXRoIiwiaWQiLCJJbmRleFNvdW5kUGxheWVyIiwiJHdyYXBwZXIiLCIkc2VhcmNoRGl2IiwiJHJpZ2h0Q29sdW1uIiwiYXBwZW5kVG8iLCJpbml0aWFsaXplRGVsZXRlSGFuZGxlciIsImluaXRpYWxpemVEb3VibGVDbGlja0VkaXQiLCJwbGF5UGF0aCIsImRvd25sb2FkUGF0aCIsIm5hbWUiLCJnbG9iYWxSb290VXJsIiwiYnRfVG9vbFRpcEVkaXQiLCJidF9Ub29sVGlwRGVsZXRlIiwibGlua1BhdGgiLCJzZl9FbXB0eVRhYmxlVGl0bGUiLCJzZl9FbXB0eVRhYmxlRGVzY3JpcHRpb24iLCJldF9SZWFkRG9jdW1lbnRhdGlvbiIsInNmX0FkZE5ld1NvdW5kRmlsZSIsIm9mZiIsIm9uIiwiZSIsIiR0YXJnZXQiLCJ0YXJnZXQiLCJjbG9zZXN0IiwicHJldmVudERlZmF1bHQiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCJmaWxlSWQiLCJhdHRyIiwiZGVsZXRlUmVjb3JkIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsInNmX0ltcG9zc2libGVUb0RlbGV0ZVNvdW5kRmlsZSIsImhhc0NsYXNzIiwiJHJvdyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGVBQWUsR0FBRztBQUNwQkMsRUFBQUEsVUFBVSxFQUFFQyxDQUFDLENBQUMsMkJBQUQsQ0FETztBQUVwQkMsRUFBQUEsT0FBTyxFQUFFRCxDQUFDLENBQUMsd0JBQUQsQ0FGVTtBQUdwQkUsRUFBQUEsY0FBYyxFQUFFLFFB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QUFnVkE7QUFDQTtBQUNBOztBQUNBdkcsQ0FBQyxDQUFDZ0gsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQm5ILEVBQUFBLGVBQWUsQ0FBQ1EsVUFBaEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFNvdW5kRmlsZXNBUEksIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIEluZGV4U291bmRQbGF5ZXIsIFNlbWFudGljTG9jYWxpemF0aW9uICovXG5cbi8qKlxuICogU291bmQgZmlsZXMgdGFibGUgbWFuYWdlbWVudCBtb2R1bGUgd2l0aCB0ZW1wbGF0ZSBwcmVzZXJ2YXRpb25cbiAqL1xuY29uc3Qgc291bmRGaWxlc1RhYmxlID0ge1xuICAgICRjdXN0b21UYWI6ICQoJyNjdXN0b20tc291bmQtZmlsZXMtdGFibGUnKSxcbiAgICAkbW9oVGFiOiAkKCcjbW9oLXNvdW5kLWZpbGVzLXRhYmxlJyksXG4gICAgYWN0aXZlQ2F0ZWdvcnk6ICdjdXN0b20nLFxuICAgIHNvdW5kUGxheWVyczoge30sXG4gICAgY3VzdG9tRGF0YVRhYmxlOiBudWxsLFxuICAgIG1vaERhdGFUYWJsZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFic1xuICAgICAgICAkKCcjc291bmQtZmlsZXMtbWVudSAuaXRlbScpLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgICAgIG9uVmlzaWJsZTogKHRhYlBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVzVGFibGUuYWN0aXZlQ2F0ZWdvcnkgPSB0YWJQYXRoO1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZXNUYWJsZS5sb2FkU291bmRGaWxlcyh0YWJQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGluaXRpYWwgZGF0YVxuICAgICAgICBzb3VuZEZpbGVzVGFibGUubG9hZFNvdW5kRmlsZXMoJ2N1c3RvbScpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBzb3VuZCBmaWxlcyBmcm9tIFJFU1QgQVBJIGFuZCByZW5kZXIgdXNpbmcgdGVtcGxhdGVzXG4gICAgICovXG4gICAgbG9hZFNvdW5kRmlsZXMoY2F0ZWdvcnkpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSBjYXRlZ29yeSA9PT0gJ2N1c3RvbScgPyAkKCcudWkudGFiW2RhdGEtdGFiPVwiY3VzdG9tXCJdJykgOiAkKCcudWkudGFiW2RhdGEtdGFiPVwibW9oXCJdJyk7XG4gICAgICAgICRjb250YWluZXIuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgU291bmRGaWxlc0FQSS5nZXRMaXN0KHsgY2F0ZWdvcnk6IGNhdGVnb3J5IH0sIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlc1RhYmxlLnJlbmRlclNvdW5kRmlsZXMocmVzcG9uc2UuZGF0YSwgY2F0ZWdvcnkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBzb3VuZCBmaWxlcycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGNvbnRhaW5lci5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciBzb3VuZCBmaWxlcyB1c2luZyB0ZW1wbGF0ZSBzdHJ1Y3R1cmVcbiAgICAgKi9cbiAgICByZW5kZXJTb3VuZEZpbGVzKGZpbGVzLCBjYXRlZ29yeSkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gY2F0ZWdvcnkgPT09ICdjdXN0b20nID8gJCgnLnVpLnRhYltkYXRhLXRhYj1cImN1c3RvbVwiXScpIDogJCgnLnVpLnRhYltkYXRhLXRhYj1cIm1vaFwiXScpO1xuICAgICAgICBjb25zdCB0YWJsZUlkID0gY2F0ZWdvcnkgPT09ICdjdXN0b20nID8gJ2N1c3RvbS1zb3VuZC1maWxlcy10YWJsZScgOiAnbW9oLXNvdW5kLWZpbGVzLXRhYmxlJztcbiAgICAgICAgY29uc3QgJGFkZEJ1dHRvbiA9IGNhdGVnb3J5ID09PSAnY3VzdG9tJyA/ICQoJyNhZGQtbmV3LWN1c3RvbS1idXR0b24nKSA6ICQoJyNhZGQtbmV3LW1vaC1idXR0b24nKTtcblxuICAgICAgICAvLyBDbGVhbiB1cCBleGlzdGluZyBzb3VuZCBwbGF5ZXJzXG4gICAgICAgIE9iamVjdC5rZXlzKHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnMpLmZvckVhY2gocGxheWVySWQgPT4ge1xuICAgICAgICAgICAgaWYgKHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnNbcGxheWVySWRdKSB7XG4gICAgICAgICAgICAgICAgLy8gU3RvcCBhbnkgcGxheWluZyBhdWRpb1xuICAgICAgICAgICAgICAgIGNvbnN0IHBsYXllciA9IHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnNbcGxheWVySWRdO1xuICAgICAgICAgICAgICAgIGlmIChwbGF5ZXIuaHRtbDVBdWRpbykge1xuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuaHRtbDVBdWRpby5wYXVzZSgpO1xuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuaHRtbDVBdWRpby5zcmMgPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVsZXRlIHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnNbcGxheWVySWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIERhdGFUYWJsZSBpZiBleGlzdHNcbiAgICAgICAgY29uc3QgZXhpc3RpbmdUYWJsZSA9ICQoYCMke3RhYmxlSWR9YCk7XG4gICAgICAgIGlmIChleGlzdGluZ1RhYmxlLmxlbmd0aCAmJiAkLmZuLkRhdGFUYWJsZS5pc0RhdGFUYWJsZShleGlzdGluZ1RhYmxlKSkge1xuICAgICAgICAgICAgZXhpc3RpbmdUYWJsZS5EYXRhVGFibGUoKS5kZXN0cm95KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW1vdmUgb25seSB0aGUgdGFibGUgYW5kIGl0cyB3cmFwcGVyLCBwcmVzZXJ2ZSB0aGUgZ3JpZCBzdHJ1Y3R1cmVcbiAgICAgICAgJGNvbnRhaW5lci5maW5kKCcuZGF0YVRhYmxlc193cmFwcGVyJykucmVtb3ZlKCk7XG4gICAgICAgICRjb250YWluZXIuZmluZCgnPiB0YWJsZScpLnJlbW92ZSgpOyAvLyBEaXJlY3QgY2hpbGQgdGFibGVzIG9ubHlcbiAgICAgICAgJGNvbnRhaW5lci5maW5kKCcudWkucGxhY2Vob2xkZXIuc2VnbWVudCcpLnJlbW92ZSgpO1xuXG4gICAgICAgIC8vIEZpbmQgdGhlIGdyaWQgc3RydWN0dXJlIG9yIGNyZWF0ZSBhIHBsYWNlaG9sZGVyIGZvciB0YWJsZVxuICAgICAgICBsZXQgJGdyaWRSb3cgPSAkY29udGFpbmVyLmZpbmQoJy51aS5ncmlkJykuZmlyc3QoKTtcbiAgICAgICAgbGV0ICR0YWJsZUNvbnRhaW5lciA9ICRjb250YWluZXI7XG5cbiAgICAgICAgLy8gSWYgZ3JpZCBleGlzdHMsIHBsYWNlIHRhYmxlIGFmdGVyIGl0XG4gICAgICAgIGlmICgkZ3JpZFJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB3ZSBhbHJlYWR5IGhhdmUgYSB0YWJsZSBjb250YWluZXIgZGl2IGFmdGVyIGdyaWRcbiAgICAgICAgICAgIGxldCAkZXhpc3RpbmdDb250YWluZXIgPSAkZ3JpZFJvdy5uZXh0KCcudGFibGUtY29udGVudCcpO1xuICAgICAgICAgICAgaWYgKCRleGlzdGluZ0NvbnRhaW5lci5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAkZXhpc3RpbmdDb250YWluZXIgPSAkKCc8ZGl2IGNsYXNzPVwidGFibGUtY29udGVudFwiPjwvZGl2PicpO1xuICAgICAgICAgICAgICAgICRncmlkUm93LmFmdGVyKCRleGlzdGluZ0NvbnRhaW5lcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkdGFibGVDb250YWluZXIgPSAkZXhpc3RpbmdDb250YWluZXI7XG4gICAgICAgICAgICAkdGFibGVDb250YWluZXIuZW1wdHkoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChmaWxlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIEhpZGUgdGhlIGFkZCBidXR0b24gd2hlbiBzaG93aW5nIGVtcHR5IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAkYWRkQnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIC8vIFNob3cgZW1wdHkgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIGNvbnN0IGVtcHR5SHRtbCA9IHNvdW5kRmlsZXNUYWJsZS5nZXRFbXB0eVBsYWNlaG9sZGVyKGNhdGVnb3J5KTtcbiAgICAgICAgICAgICR0YWJsZUNvbnRhaW5lci5hcHBlbmQoZW1wdHlIdG1sKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNob3cgdGhlIGFkZCBidXR0b24gd2hlbiBkaXNwbGF5aW5nIGRhdGFcbiAgICAgICAgJGFkZEJ1dHRvbi5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCB0YWJsZSB1c2luZyB0ZW1wbGF0ZSBzdHJ1Y3R1cmVcbiAgICAgICAgbGV0IHRhYmxlSHRtbCA9IGA8dGFibGUgY2xhc3M9XCJ1aSBzZWxlY3RhYmxlIHZlcnkgY29tcGFjdCB1bnN0YWNrYWJsZSB0YWJsZVwiIGlkPVwiJHt0YWJsZUlkfVwiPlxuICAgICAgICAgICAgPHRoZWFkPlxuICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgPHRoPiR7Z2xvYmFsVHJhbnNsYXRlLnNmX0NvbHVtbkZpbGV9PC90aD5cbiAgICAgICAgICAgICAgICAgICAgPHRoIGNsYXNzPVwic2l4IHdpZGUgaGlkZS1vbi1tb2JpbGVcIj4ke2dsb2JhbFRyYW5zbGF0ZS5zZl9Db2x1bW5QbGF5ZXJ9PC90aD5cbiAgICAgICAgICAgICAgICAgICAgPHRoIGNsYXNzPVwiY29sbGFwc2luZ1wiPjwvdGg+XG4gICAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIDwvdGhlYWQ+XG4gICAgICAgICAgICA8dGJvZHk+YDtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHJvd3MgdXNpbmcgdGVtcGxhdGUgc3RydWN0dXJlIGZyb20gY3VzdG9tVGFiLnZvbHRcbiAgICAgICAgZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgdGFibGVIdG1sICs9IHNvdW5kRmlsZXNUYWJsZS5yZW5kZXJGaWxlUm93KGZpbGUpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRhYmxlSHRtbCArPSBgPC90Ym9keT48L3RhYmxlPmA7XG4gICAgICAgICR0YWJsZUNvbnRhaW5lci5hcHBlbmQodGFibGVIdG1sKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgRGF0YVRhYmxlXG4gICAgICAgIGNvbnN0ICR0YWJsZSA9ICQoYCMke3RhYmxlSWR9YCk7XG4gICAgICAgIGNvbnN0IGRhdGFUYWJsZSA9ICR0YWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hpbmc6IHRydWUsXG4gICAgICAgICAgICBpbmZvOiBmYWxzZSxcbiAgICAgICAgICAgIG9yZGVyaW5nOiB0cnVlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIG9yZGVyOiBbWzAsICdhc2MnXV1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGF1ZGlvIHBsYXllcnMgaW1tZWRpYXRlbHkgYWZ0ZXIgdGFibGUgY3JlYXRpb25cbiAgICAgICAgZmlsZXMuZm9yRWFjaCgoZmlsZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGZpbGUucGF0aCAmJiBmaWxlLmlkKSB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlc1RhYmxlLnNvdW5kUGxheWVyc1tmaWxlLmlkXSA9IG5ldyBJbmRleFNvdW5kUGxheWVyKGZpbGUuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1vdmUgdGhlIERhdGFUYWJsZSBzZWFyY2ggZmlsdGVyIHRvIHRoZSBncmlkIG5leHQgdG8gdGhlIGJ1dHRvblxuICAgICAgICBjb25zdCAkd3JhcHBlciA9ICQoYCMke3RhYmxlSWR9X3dyYXBwZXJgKTtcbiAgICAgICAgaWYgKCR3cmFwcGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgJHNlYXJjaERpdiA9ICR3cmFwcGVyLmZpbmQoJy5kYXRhVGFibGVzX2ZpbHRlcicpO1xuICAgICAgICAgICAgaWYgKCRzZWFyY2hEaXYubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgcmlnaHQgY29sdW1uIGluIHRoZSBncmlkXG4gICAgICAgICAgICAgICAgY29uc3QgJHJpZ2h0Q29sdW1uID0gJGNvbnRhaW5lci5maW5kKCcudWkuZ3JpZCAucmlnaHQuYWxpZ25lZC5jb2x1bW4nKS5maXJzdCgpO1xuICAgICAgICAgICAgICAgIGlmICgkcmlnaHRDb2x1bW4ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBhbnkgZXhpc3Rpbmcgc2VhcmNoIGZpbHRlcnMgZmlyc3RcbiAgICAgICAgICAgICAgICAgICAgJHJpZ2h0Q29sdW1uLmZpbmQoJy5kYXRhVGFibGVzX2ZpbHRlcicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICAgICAkc2VhcmNoRGl2LmFwcGVuZFRvKCRyaWdodENvbHVtbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBEYXRhVGFibGUgcmVmZXJlbmNlXG4gICAgICAgIGlmIChjYXRlZ29yeSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIHNvdW5kRmlsZXNUYWJsZS5jdXN0b21EYXRhVGFibGUgPSBkYXRhVGFibGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzb3VuZEZpbGVzVGFibGUubW9oRGF0YVRhYmxlID0gZGF0YVRhYmxlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRlbGV0ZSBoYW5kbGVyIGZvciBSRVNUIEFQSVxuICAgICAgICBzb3VuZEZpbGVzVGFibGUuaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZG91YmxlLWNsaWNrIGZvciBlZGl0aW5nXG4gICAgICAgIHNvdW5kRmlsZXNUYWJsZS5pbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0KCRjb250YWluZXIpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHNpbmdsZSBmaWxlIHJvdyB1c2luZyB0ZW1wbGF0ZSBzdHJ1Y3R1cmVcbiAgICAgKi9cbiAgICByZW5kZXJGaWxlUm93KGZpbGUpIHtcbiAgICAgICAgLy8gVXNlIG5ldyBzb3VuZC1maWxlcyBlbmRwb2ludCBmb3IgTU9IL0lWUi9zeXN0ZW0gc291bmRzIChub3QgQ0RSIHJlY29yZGluZ3MpXG4gICAgICAgIGNvbnN0IHBsYXlQYXRoID0gZmlsZS5wYXRoID8gYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpwbGF5YmFjaz92aWV3PSR7ZmlsZS5wYXRofWAgOiAnJztcbiAgICAgICAgY29uc3QgZG93bmxvYWRQYXRoID0gZmlsZS5wYXRoID8gYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpwbGF5YmFjaz92aWV3PSR7ZmlsZS5wYXRofSZkb3dubG9hZD0xJmZpbGVuYW1lPSR7ZmlsZS5uYW1lfWAgOiAnJztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgPHRyIGNsYXNzPVwiZmlsZS1yb3dcIiBpZD1cIiR7ZmlsZS5pZH1cIiBkYXRhLXZhbHVlPVwiJHtmaWxlLnBhdGggfHwgJyd9XCI+XG4gICAgICAgICAgICA8dGQ+PGkgY2xhc3M9XCJmaWxlIGF1ZGlvIG91dGxpbmUgaWNvblwiPjwvaT4ke2ZpbGUubmFtZX08L3RkPlxuICAgICAgICAgICAgPHRkIGNsYXNzPVwic2l4IHdpZGUgY2RyLXBsYXllciBoaWRlLW9uLW1vYmlsZVwiPlxuICAgICAgICAgICAgICAgIDx0YWJsZT5cbiAgICAgICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2ZpbGUucGF0aCA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGA8YnV0dG9uIGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbiBwbGF5LWJ1dHRvblwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5XCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YXVkaW8gcHJlbG9hZD1cIm5vbmVcIiBpZD1cImF1ZGlvLXBsYXllci0ke2ZpbGUuaWR9XCIgZGF0YS1zcmM9XCIke3BsYXlQYXRofVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzb3VyY2Ugc3JjPVwiXCIvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hdWRpbz5gIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYDxidXR0b24gY2xhc3M9XCJ1aSB0aW55IGJhc2ljIGljb24gYnV0dG9uIHBsYXktYnV0dG9uIGRpc2FibGVkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ1aSBpY29uIHBsYXkgZGlzYWJsZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhdWRpbyBwcmVsb2FkPVwibm9uZVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7ZmlsZS5pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c291cmNlIHNyYz1cIlwiLz5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYXVkaW8+YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHJhbmdlIGNkci1wbGF5ZXJcIj48L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPjxzcGFuIGNsYXNzPVwiY2RyLWR1cmF0aW9uXCI+PC9zcGFuPjwvdGQ+XG4gICAgICAgICAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJvbmUgd2lkZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZmlsZS5wYXRoID8gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGA8YnV0dG9uIGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbiBkb3dubG9hZC1idXR0b25cIiBkYXRhLXZhbHVlPVwiJHtkb3dubG9hZFBhdGh9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+YCA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgPGJ1dHRvbiBjbGFzcz1cInVpIHRpbnkgYmFzaWMgaWNvbiBidXR0b24gZG93bmxvYWQtYnV0dG9uIGRpc2FibGVkXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJ1aSBpY29uIGRvd25sb2FkIGRpc2FibGVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+YFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgPC90YWJsZT5cbiAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICA8dGQgY2xhc3M9XCJjb2xsYXBzaW5nXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRpbnkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+XG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvbW9kaWZ5LyR7ZmlsZS5pZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZWRpdCBwb3B1cGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZWRpdCBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvZGVsZXRlLyR7ZmlsZS5pZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7ZmlsZS5pZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgIDwvdHI+YDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBlbXB0eSBwbGFjZWhvbGRlciBIVE1MIG1hdGNoaW5nIHBhcnRpYWxzL2VtcHR5VGFibGVQbGFjZWhvbGRlci52b2x0IHN0cnVjdHVyZVxuICAgICAqL1xuICAgIGdldEVtcHR5UGxhY2Vob2xkZXIoY2F0ZWdvcnkpIHtcbiAgICAgICAgY29uc3QgbGlua1BhdGggPSBjYXRlZ29yeSA9PT0gJ2N1c3RvbScgPyAnc291bmQtZmlsZXMvbW9kaWZ5L2N1c3RvbScgOiAnc291bmQtZmlsZXMvbW9kaWZ5L21vaCc7XG4gICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInVpIHBsYWNlaG9sZGVyIHNlZ21lbnRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwibXVzaWMgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5zZl9FbXB0eVRhYmxlVGl0bGV9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpbmxpbmVcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dFwiPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5zZl9FbXB0eVRhYmxlRGVzY3JpcHRpb259XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJtYXJnaW4tdG9wOiAxZW07XCI+XG4gICAgICAgICAgICAgICAgPGEgaHJlZj1cImh0dHBzOi8vd2lraS5taWtvcGJ4LmNvbS9zb3VuZC1maWxlc1wiIHRhcmdldD1cIl9ibGFua1wiIGNsYXNzPVwidWkgYmFzaWMgdGlueSBidXR0b24gcHJldmVudC13b3JkLXdyYXBcIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJxdWVzdGlvbiBjaXJjbGUgb3V0bGluZSBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5ldF9SZWFkRG9jdW1lbnRhdGlvbn1cbiAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgc3R5bGU9XCJtYXJnaW4tdG9wOiAxZW07IHRleHQtYWxpZ246IGNlbnRlcjtcIj5cbiAgICAgICAgICAgICAgICA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfSR7bGlua1BhdGh9XCIgY2xhc3M9XCJ1aSBibHVlIGJ1dHRvbiBwcmV2ZW50LXdvcmQtd3JhcFwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImFkZCBjaXJjbGUgaWNvblwiPjwvaT4gJHtnbG9iYWxUcmFuc2xhdGUuc2ZfQWRkTmV3U291bmRGaWxlfVxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZWxldGUgaGFuZGxlciBmb3IgUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVsZXRlSGFuZGxlcigpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBoYW5kbGVycyB0byBwcmV2ZW50IGR1cGxpY2F0ZXNcbiAgICAgICAgJCgnYm9keScpLm9mZignY2xpY2suc291bmRmaWxlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGFjdHVhbCBkZWxldGlvbiBhZnRlciB0d28tc3RlcHMgY29uZmlybWF0aW9uXG4gICAgICAgICQoJ2JvZHknKS5vbignY2xpY2suc291bmRmaWxlcycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EuZGVsZXRlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgZGVsZXRlIGJ1dHRvbiBpcyBpbiBvdXIgc291bmQgZmlsZXMgdGFibGVcbiAgICAgICAgICAgIGlmICgkdGFyZ2V0LmNsb3Nlc3QoJyNjdXN0b20tc291bmQtZmlsZXMtdGFibGUsICNtb2gtc291bmQtZmlsZXMtdGFibGUnKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGZpbGVJZCA9ICR0YXJnZXQuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkdGFyZ2V0LmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFNvdW5kRmlsZXNBUEkuZGVsZXRlUmVjb3JkKGZpbGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlc1RhYmxlLmNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgcmVjb3JkIGRlbGV0aW9uXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgY3VycmVudCB0YWJcbiAgICAgICAgICAgIHNvdW5kRmlsZXNUYWJsZS5sb2FkU291bmRGaWxlcyhzb3VuZEZpbGVzVGFibGUuYWN0aXZlQ2F0ZWdvcnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCBcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc2ZfSW1wb3NzaWJsZVRvRGVsZXRlU291bmRGaWxlXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBpbmRpY2F0b3JcbiAgICAgICAgJCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0KCRjb250YWluZXIpIHtcbiAgICAgICAgJGNvbnRhaW5lci5vbignZGJsY2xpY2snLCAndHIuZmlsZS1yb3cgdGQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAvLyBTa2lwIGlmIGNsaWNraW5nIG9uIGFjdGlvbiBidXR0b25zIGNvbHVtblxuICAgICAgICAgICAgaWYgKCQodGhpcykuaGFzQ2xhc3MoJ2NvbGxhcHNpbmcnKSB8fCAkKHRoaXMpLmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNraXAgaWYgY2xpY2tpbmcgb24gYW55IGJ1dHRvbiBvciBpY29uXG4gICAgICAgICAgICBpZiAoJChlLnRhcmdldCkuY2xvc2VzdCgnYnV0dG9uLCBhLCBpJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVJZCA9ICRyb3cuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChmaWxlSWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL21vZGlmeS8ke2ZpbGVJZH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHNvdW5kRmlsZXNUYWJsZS5pbml0aWFsaXplKCk7XG59KTsiXX0=