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
    var downloadPath = file.path ? "/pbxcore/api/v3/sound-files:playback?view=".concat(file.path, "&download=1&filename=").concat(file.name, ".mp3") : '';
    return "<tr class=\"file-row\" id=\"".concat(file.id, "\" data-value=\"").concat(file.path || '', "\">\n            <td><i class=\"file audio outline icon\"></i>").concat(file.name, "</td>\n            <td class=\"six wide cdr-player hide-on-mobile\">\n                <table>\n                    <tr>\n                        <td class=\"one wide\">\n                            ").concat(file.path ? "<button class=\"ui tiny basic icon button play-button\">\n                                     <i class=\"ui icon play\"></i>\n                                 </button>\n                                 <audio preload=\"metadata\" id=\"audio-player-".concat(file.id, "\">\n                                     <source src=\"").concat(playPath, "\"/>\n                                 </audio>") : "<button class=\"ui tiny basic icon button play-button disabled\">\n                                     <i class=\"ui icon play disabled\"></i>\n                                 </button>\n                                 <audio preload=\"none\" id=\"audio-player-".concat(file.id, "\">\n                                     <source src=\"\"/>\n                                 </audio>"), "\n                        </td>\n                        <td>\n                            <div class=\"ui range cdr-player\"></div>\n                        </td>\n                        <td class=\"one wide\"><span class=\"cdr-duration\"></span></td>\n                        <td class=\"one wide\">\n                            ").concat(file.path ? "<button class=\"ui tiny basic icon button download-button\" data-value=\"".concat(downloadPath, "\">\n                                     <i class=\"ui icon download\"></i>\n                                 </button>") : "<button class=\"ui tiny basic icon button download-button disabled\">\n                                     <i class=\"ui icon download disabled\"></i>\n                                 </button>", "\n                        </td>\n                    </tr>\n                </table>\n            </td>\n            <td class=\"collapsing\">\n                <div class=\"ui tiny basic icon buttons action-buttons\">\n                    <a href=\"").concat(globalRootUrl, "sound-files/modify/").concat(file.id, "\" \n                       class=\"ui button edit popuped\"\n                       data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                        <i class=\"icon edit blue\"></i>\n                    </a>\n                    <a href=\"").concat(globalRootUrl, "sound-files/delete/").concat(file.id, "\" \n                       data-value=\"").concat(file.id, "\"\n                       class=\"ui button delete two-steps-delete popuped\"\n                       data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                        <i class=\"icon trash red\"></i>\n                    </a>\n                </div>\n            </td>\n        </tr>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGVzLWluZGV4LmpzIl0sIm5hbWVzIjpbInNvdW5kRmlsZXNUYWJsZSIsIiRjdXN0b21UYWIiLCIkIiwiJG1vaFRhYiIsImFjdGl2ZUNhdGVnb3J5Iiwic291bmRQbGF5ZXJzIiwiY3VzdG9tRGF0YVRhYmxlIiwibW9oRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJsb2FkU291bmRGaWxlcyIsImNhdGVnb3J5IiwiJGNvbnRhaW5lciIsImFkZENsYXNzIiwiU291bmRGaWxlc0FQSSIsImdldExpc3QiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJyZW5kZXJTb3VuZEZpbGVzIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImVycm9yIiwicmVtb3ZlQ2xhc3MiLCJmaWxlcyIsInRhYmxlSWQiLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsInBsYXllcklkIiwicGxheWVyIiwiaHRtbDVBdWRpbyIsInBhdXNlIiwic3JjIiwiZXhpc3RpbmdUYWJsZSIsImxlbmd0aCIsImZuIiwiRGF0YVRhYmxlIiwiaXNEYXRhVGFibGUiLCJkZXN0cm95IiwiZmluZCIsInJlbW92ZSIsIiRncmlkUm93IiwiZmlyc3QiLCIkdGFibGVDb250YWluZXIiLCIkZXhpc3RpbmdDb250YWluZXIiLCJuZXh0IiwiYWZ0ZXIiLCJlbXB0eSIsImVtcHR5SHRtbCIsImdldEVtcHR5UGxhY2Vob2xkZXIiLCJhcHBlbmQiLCJ0YWJsZUh0bWwiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9Db2x1bW5GaWxlIiwic2ZfQ29sdW1uUGxheWVyIiwiZmlsZSIsInJlbmRlckZpbGVSb3ciLCIkdGFibGUiLCJkYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJzZWFyY2hpbmciLCJpbmZvIiwib3JkZXJpbmciLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwib3JkZXIiLCJwYXRoIiwiaWQiLCJJbmRleFNvdW5kUGxheWVyIiwiJHdyYXBwZXIiLCIkc2VhcmNoRGl2IiwiJHJpZ2h0Q29sdW1uIiwiYXBwZW5kVG8iLCJpbml0aWFsaXplRGVsZXRlSGFuZGxlciIsImluaXRpYWxpemVEb3VibGVDbGlja0VkaXQiLCJwbGF5UGF0aCIsImRvd25sb2FkUGF0aCIsIm5hbWUiLCJnbG9iYWxSb290VXJsIiwiYnRfVG9vbFRpcEVkaXQiLCJidF9Ub29sVGlwRGVsZXRlIiwibGlua1BhdGgiLCJzZl9FbXB0eVRhYmxlVGl0bGUiLCJzZl9FbXB0eVRhYmxlRGVzY3JpcHRpb24iLCJzZl9BZGROZXdTb3VuZEZpbGUiLCJvZmYiLCJvbiIsImUiLCIkdGFyZ2V0IiwidGFyZ2V0IiwiY2xvc2VzdCIsInByZXZlbnREZWZhdWx0Iiwic3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uIiwiZmlsZUlkIiwiYXR0ciIsImRlbGV0ZVJlY29yZCIsImNiQWZ0ZXJEZWxldGVSZWNvcmQiLCJzZl9JbXBvc3NpYmxlVG9EZWxldGVTb3VuZEZpbGUiLCJoYXNDbGFzcyIsIiRyb3ciLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxlQUFlLEdBQUc7QUFDcEJDLEVBQUFBLFVBQVUsRUFBRUMsQ0FBQyxDQUFDLDJCQUFELENBRE87QUFFcEJDLEVBQUFBLE9BQU8sRUFBRUQsQ0FBQyxDQUFDLHdCQUFELENBRlU7QUFHcEJFLEVBQUFBLGNBQWMsRUFBRSxRQUhJO0FBSXBCQyxFQUFBQSxZQUFZLEVBQUUsRUFKTTtBQUtwQkMsRUFBQUEsZUFBZSxF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RUFBQUEseUJBelNvQixxQ0F5U01sRSxVQXpTTixFQXlTa0I7QUFDbENBLElBQUFBLFVBQVUsQ0FBQzhFLEVBQVgsQ0FBYyxVQUFkLEVBQTBCLGdCQUExQixFQUE0QyxVQUFTQyxDQUFULEVBQVk7QUFDcEQ7QUFDQSxVQUFJN0YsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRd0csUUFBUixDQUFpQixZQUFqQixLQUFrQ3hHLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUTJDLElBQVIsQ0FBYSxpQkFBYixFQUFnQ0wsTUFBaEMsR0FBeUMsQ0FBL0UsRUFBa0Y7QUFDOUU7QUFDSCxPQUptRCxDQU1wRDs7O0FBQ0EsVUFBSXRDLENBQUMsQ0FBQzZGLENBQUMsQ0FBQ0UsTUFBSCxDQUFELENBQVlDLE9BQVosQ0FBb0IsY0FBcEIsRUFBb0MxRCxNQUFwQyxHQUE2QyxDQUFqRCxFQUFvRDtBQUNoRDtBQUNIOztBQUVELFVBQU1tRSxJQUFJLEdBQUd6RyxDQUFDLENBQUMsSUFBRCxDQUFELENBQVFnRyxPQUFSLENBQWdCLElBQWhCLENBQWI7QUFDQSxVQUFNRyxNQUFNLEdBQUdNLElBQUksQ0FBQ0wsSUFBTCxDQUFVLElBQVYsQ0FBZjs7QUFDQSxVQUFJRCxNQUFKLEVBQVk7QUFDUk8sUUFBQUEsTUFBTSxDQUFDQyxRQUFQLGFBQXFCdkIsYUFBckIsZ0NBQXdEZSxNQUF4RDtBQUNIO0FBQ0osS0FoQkQ7QUFpQkg7QUEzVG1CLENBQXhCO0FBOFRBO0FBQ0E7QUFDQTs7QUFDQW5HLENBQUMsQ0FBQzRHLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIvRyxFQUFBQSxlQUFlLENBQUNRLFVBQWhCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTb3VuZEZpbGVzQVBJLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBJbmRleFNvdW5kUGxheWVyLCBTZW1hbnRpY0xvY2FsaXphdGlvbiAqL1xuXG4vKipcbiAqIFNvdW5kIGZpbGVzIHRhYmxlIG1hbmFnZW1lbnQgbW9kdWxlIHdpdGggdGVtcGxhdGUgcHJlc2VydmF0aW9uXG4gKi9cbmNvbnN0IHNvdW5kRmlsZXNUYWJsZSA9IHtcbiAgICAkY3VzdG9tVGFiOiAkKCcjY3VzdG9tLXNvdW5kLWZpbGVzLXRhYmxlJyksXG4gICAgJG1vaFRhYjogJCgnI21vaC1zb3VuZC1maWxlcy10YWJsZScpLFxuICAgIGFjdGl2ZUNhdGVnb3J5OiAnY3VzdG9tJyxcbiAgICBzb3VuZFBsYXllcnM6IHt9LFxuICAgIGN1c3RvbURhdGFUYWJsZTogbnVsbCxcbiAgICBtb2hEYXRhVGFibGU6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRhYnNcbiAgICAgICAgJCgnI3NvdW5kLWZpbGVzLW1lbnUgLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgICAgICBvblZpc2libGU6ICh0YWJQYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlc1RhYmxlLmFjdGl2ZUNhdGVnb3J5ID0gdGFiUGF0aDtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVzVGFibGUubG9hZFNvdW5kRmlsZXModGFiUGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBpbml0aWFsIGRhdGFcbiAgICAgICAgc291bmRGaWxlc1RhYmxlLmxvYWRTb3VuZEZpbGVzKCdjdXN0b20nKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgc291bmQgZmlsZXMgZnJvbSBSRVNUIEFQSSBhbmQgcmVuZGVyIHVzaW5nIHRlbXBsYXRlc1xuICAgICAqL1xuICAgIGxvYWRTb3VuZEZpbGVzKGNhdGVnb3J5KSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gY2F0ZWdvcnkgPT09ICdjdXN0b20nID8gJCgnLnVpLnRhYltkYXRhLXRhYj1cImN1c3RvbVwiXScpIDogJCgnLnVpLnRhYltkYXRhLXRhYj1cIm1vaFwiXScpO1xuICAgICAgICAkY29udGFpbmVyLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICAgIFNvdW5kRmlsZXNBUEkuZ2V0TGlzdCh7IGNhdGVnb3J5OiBjYXRlZ29yeSB9LCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZXNUYWJsZS5yZW5kZXJTb3VuZEZpbGVzKHJlc3BvbnNlLmRhdGEsIGNhdGVnb3J5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgc291bmQgZmlsZXMnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRjb250YWluZXIucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgc291bmQgZmlsZXMgdXNpbmcgdGVtcGxhdGUgc3RydWN0dXJlXG4gICAgICovXG4gICAgcmVuZGVyU291bmRGaWxlcyhmaWxlcywgY2F0ZWdvcnkpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9IGNhdGVnb3J5ID09PSAnY3VzdG9tJyA/ICQoJy51aS50YWJbZGF0YS10YWI9XCJjdXN0b21cIl0nKSA6ICQoJy51aS50YWJbZGF0YS10YWI9XCJtb2hcIl0nKTtcbiAgICAgICAgY29uc3QgdGFibGVJZCA9IGNhdGVnb3J5ID09PSAnY3VzdG9tJyA/ICdjdXN0b20tc291bmQtZmlsZXMtdGFibGUnIDogJ21vaC1zb3VuZC1maWxlcy10YWJsZSc7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbiB1cCBleGlzdGluZyBzb3VuZCBwbGF5ZXJzXG4gICAgICAgIE9iamVjdC5rZXlzKHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnMpLmZvckVhY2gocGxheWVySWQgPT4ge1xuICAgICAgICAgICAgaWYgKHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnNbcGxheWVySWRdKSB7XG4gICAgICAgICAgICAgICAgLy8gU3RvcCBhbnkgcGxheWluZyBhdWRpb1xuICAgICAgICAgICAgICAgIGNvbnN0IHBsYXllciA9IHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnNbcGxheWVySWRdO1xuICAgICAgICAgICAgICAgIGlmIChwbGF5ZXIuaHRtbDVBdWRpbykge1xuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuaHRtbDVBdWRpby5wYXVzZSgpO1xuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIuaHRtbDVBdWRpby5zcmMgPSAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGVsZXRlIHNvdW5kRmlsZXNUYWJsZS5zb3VuZFBsYXllcnNbcGxheWVySWRdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3RpbmcgRGF0YVRhYmxlIGlmIGV4aXN0c1xuICAgICAgICBjb25zdCBleGlzdGluZ1RhYmxlID0gJChgIyR7dGFibGVJZH1gKTtcbiAgICAgICAgaWYgKGV4aXN0aW5nVGFibGUubGVuZ3RoICYmICQuZm4uRGF0YVRhYmxlLmlzRGF0YVRhYmxlKGV4aXN0aW5nVGFibGUpKSB7XG4gICAgICAgICAgICBleGlzdGluZ1RhYmxlLkRhdGFUYWJsZSgpLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIG9ubHkgdGhlIHRhYmxlIGFuZCBpdHMgd3JhcHBlciwgcHJlc2VydmUgdGhlIGdyaWQgc3RydWN0dXJlXG4gICAgICAgICRjb250YWluZXIuZmluZCgnLmRhdGFUYWJsZXNfd3JhcHBlcicpLnJlbW92ZSgpO1xuICAgICAgICAkY29udGFpbmVyLmZpbmQoJz4gdGFibGUnKS5yZW1vdmUoKTsgLy8gRGlyZWN0IGNoaWxkIHRhYmxlcyBvbmx5XG4gICAgICAgICRjb250YWluZXIuZmluZCgnLnVpLnBsYWNlaG9sZGVyLnNlZ21lbnQnKS5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgdGhlIGdyaWQgc3RydWN0dXJlIG9yIGNyZWF0ZSBhIHBsYWNlaG9sZGVyIGZvciB0YWJsZVxuICAgICAgICBsZXQgJGdyaWRSb3cgPSAkY29udGFpbmVyLmZpbmQoJy51aS5ncmlkJykuZmlyc3QoKTtcbiAgICAgICAgbGV0ICR0YWJsZUNvbnRhaW5lciA9ICRjb250YWluZXI7XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBncmlkIGV4aXN0cywgcGxhY2UgdGFibGUgYWZ0ZXIgaXRcbiAgICAgICAgaWYgKCRncmlkUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHdlIGFscmVhZHkgaGF2ZSBhIHRhYmxlIGNvbnRhaW5lciBkaXYgYWZ0ZXIgZ3JpZFxuICAgICAgICAgICAgbGV0ICRleGlzdGluZ0NvbnRhaW5lciA9ICRncmlkUm93Lm5leHQoJy50YWJsZS1jb250ZW50Jyk7XG4gICAgICAgICAgICBpZiAoJGV4aXN0aW5nQ29udGFpbmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICRleGlzdGluZ0NvbnRhaW5lciA9ICQoJzxkaXYgY2xhc3M9XCJ0YWJsZS1jb250ZW50XCI+PC9kaXY+Jyk7XG4gICAgICAgICAgICAgICAgJGdyaWRSb3cuYWZ0ZXIoJGV4aXN0aW5nQ29udGFpbmVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICR0YWJsZUNvbnRhaW5lciA9ICRleGlzdGluZ0NvbnRhaW5lcjtcbiAgICAgICAgICAgICR0YWJsZUNvbnRhaW5lci5lbXB0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoZmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBTaG93IGVtcHR5IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICBjb25zdCBlbXB0eUh0bWwgPSBzb3VuZEZpbGVzVGFibGUuZ2V0RW1wdHlQbGFjZWhvbGRlcihjYXRlZ29yeSk7XG4gICAgICAgICAgICAkdGFibGVDb250YWluZXIuYXBwZW5kKGVtcHR5SHRtbCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHRhYmxlIHVzaW5nIHRlbXBsYXRlIHN0cnVjdHVyZVxuICAgICAgICBsZXQgdGFibGVIdG1sID0gYDx0YWJsZSBjbGFzcz1cInVpIHNlbGVjdGFibGUgdmVyeSBjb21wYWN0IHVuc3RhY2thYmxlIHRhYmxlXCIgaWQ9XCIke3RhYmxlSWR9XCI+XG4gICAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICA8dGg+JHtnbG9iYWxUcmFuc2xhdGUuc2ZfQ29sdW1uRmlsZX08L3RoPlxuICAgICAgICAgICAgICAgICAgICA8dGggY2xhc3M9XCJzaXggd2lkZSBoaWRlLW9uLW1vYmlsZVwiPiR7Z2xvYmFsVHJhbnNsYXRlLnNmX0NvbHVtblBsYXllcn08L3RoPlxuICAgICAgICAgICAgICAgICAgICA8dGggY2xhc3M9XCJjb2xsYXBzaW5nXCI+PC90aD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgPC90aGVhZD5cbiAgICAgICAgICAgIDx0Ym9keT5gO1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgcm93cyB1c2luZyB0ZW1wbGF0ZSBzdHJ1Y3R1cmUgZnJvbSBjdXN0b21UYWIudm9sdFxuICAgICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgICB0YWJsZUh0bWwgKz0gc291bmRGaWxlc1RhYmxlLnJlbmRlckZpbGVSb3coZmlsZSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgdGFibGVIdG1sICs9IGA8L3Rib2R5PjwvdGFibGU+YDtcbiAgICAgICAgJHRhYmxlQ29udGFpbmVyLmFwcGVuZCh0YWJsZUh0bWwpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBEYXRhVGFibGVcbiAgICAgICAgY29uc3QgJHRhYmxlID0gJChgIyR7dGFibGVJZH1gKTtcbiAgICAgICAgY29uc3QgZGF0YVRhYmxlID0gJHRhYmxlLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IGZhbHNlLFxuICAgICAgICAgICAgb3JkZXJpbmc6IHRydWUsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgb3JkZXI6IFtbMCwgJ2FzYyddXVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYXVkaW8gcGxheWVycyBpbW1lZGlhdGVseSBhZnRlciB0YWJsZSBjcmVhdGlvblxuICAgICAgICBmaWxlcy5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgICAgICBpZiAoZmlsZS5wYXRoICYmIGZpbGUuaWQpIHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVzVGFibGUuc291bmRQbGF5ZXJzW2ZpbGUuaWRdID0gbmV3IEluZGV4U291bmRQbGF5ZXIoZmlsZS5pZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gTW92ZSB0aGUgRGF0YVRhYmxlIHNlYXJjaCBmaWx0ZXIgdG8gdGhlIGdyaWQgbmV4dCB0byB0aGUgYnV0dG9uXG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gJChgIyR7dGFibGVJZH1fd3JhcHBlcmApO1xuICAgICAgICBpZiAoJHdyYXBwZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCAkc2VhcmNoRGl2ID0gJHdyYXBwZXIuZmluZCgnLmRhdGFUYWJsZXNfZmlsdGVyJyk7XG4gICAgICAgICAgICBpZiAoJHNlYXJjaERpdi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBGaW5kIHRoZSByaWdodCBjb2x1bW4gaW4gdGhlIGdyaWRcbiAgICAgICAgICAgICAgICBjb25zdCAkcmlnaHRDb2x1bW4gPSAkY29udGFpbmVyLmZpbmQoJy51aS5ncmlkIC5yaWdodC5hbGlnbmVkLmNvbHVtbicpLmZpcnN0KCk7XG4gICAgICAgICAgICAgICAgaWYgKCRyaWdodENvbHVtbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBzZWFyY2ggZmlsdGVycyBmaXJzdFxuICAgICAgICAgICAgICAgICAgICAkcmlnaHRDb2x1bW4uZmluZCgnLmRhdGFUYWJsZXNfZmlsdGVyJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgICRzZWFyY2hEaXYuYXBwZW5kVG8oJHJpZ2h0Q29sdW1uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFN0b3JlIERhdGFUYWJsZSByZWZlcmVuY2VcbiAgICAgICAgaWYgKGNhdGVnb3J5ID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgc291bmRGaWxlc1RhYmxlLmN1c3RvbURhdGFUYWJsZSA9IGRhdGFUYWJsZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvdW5kRmlsZXNUYWJsZS5tb2hEYXRhVGFibGUgPSBkYXRhVGFibGU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZGVsZXRlIGhhbmRsZXIgZm9yIFJFU1QgQVBJXG4gICAgICAgIHNvdW5kRmlsZXNUYWJsZS5pbml0aWFsaXplRGVsZXRlSGFuZGxlcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgICAgc291bmRGaWxlc1RhYmxlLmluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoJGNvbnRhaW5lcik7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgc2luZ2xlIGZpbGUgcm93IHVzaW5nIHRlbXBsYXRlIHN0cnVjdHVyZVxuICAgICAqL1xuICAgIHJlbmRlckZpbGVSb3coZmlsZSkge1xuICAgICAgICAvLyBVc2UgbmV3IHNvdW5kLWZpbGVzIGVuZHBvaW50IGZvciBNT0gvSVZSL3N5c3RlbSBzb3VuZHMgKG5vdCBDRFIgcmVjb3JkaW5ncylcbiAgICAgICAgY29uc3QgcGxheVBhdGggPSBmaWxlLnBhdGggPyBgL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzOnBsYXliYWNrP3ZpZXc9JHtmaWxlLnBhdGh9YCA6ICcnO1xuICAgICAgICBjb25zdCBkb3dubG9hZFBhdGggPSBmaWxlLnBhdGggPyBgL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzOnBsYXliYWNrP3ZpZXc9JHtmaWxlLnBhdGh9JmRvd25sb2FkPTEmZmlsZW5hbWU9JHtmaWxlLm5hbWV9Lm1wM2AgOiAnJztcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBgPHRyIGNsYXNzPVwiZmlsZS1yb3dcIiBpZD1cIiR7ZmlsZS5pZH1cIiBkYXRhLXZhbHVlPVwiJHtmaWxlLnBhdGggfHwgJyd9XCI+XG4gICAgICAgICAgICA8dGQ+PGkgY2xhc3M9XCJmaWxlIGF1ZGlvIG91dGxpbmUgaWNvblwiPjwvaT4ke2ZpbGUubmFtZX08L3RkPlxuICAgICAgICAgICAgPHRkIGNsYXNzPVwic2l4IHdpZGUgY2RyLXBsYXllciBoaWRlLW9uLW1vYmlsZVwiPlxuICAgICAgICAgICAgICAgIDx0YWJsZT5cbiAgICAgICAgICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2ZpbGUucGF0aCA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgPGJ1dHRvbiBjbGFzcz1cInVpIHRpbnkgYmFzaWMgaWNvbiBidXR0b24gcGxheS1idXR0b25cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cInVpIGljb24gcGxheVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGF1ZGlvIHByZWxvYWQ9XCJtZXRhZGF0YVwiIGlkPVwiYXVkaW8tcGxheWVyLSR7ZmlsZS5pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c291cmNlIHNyYz1cIiR7cGxheVBhdGh9XCIvPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hdWRpbz5gIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGA8YnV0dG9uIGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbiBwbGF5LWJ1dHRvbiBkaXNhYmxlZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwidWkgaWNvbiBwbGF5IGRpc2FibGVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YXVkaW8gcHJlbG9hZD1cIm5vbmVcIiBpZD1cImF1ZGlvLXBsYXllci0ke2ZpbGUuaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNvdXJjZSBzcmM9XCJcIi8+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2F1ZGlvPmBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSByYW5nZSBjZHItcGxheWVyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj48c3BhbiBjbGFzcz1cImNkci1kdXJhdGlvblwiPjwvc3Bhbj48L3RkPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwib25lIHdpZGVcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2ZpbGUucGF0aCA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgPGJ1dHRvbiBjbGFzcz1cInVpIHRpbnkgYmFzaWMgaWNvbiBidXR0b24gZG93bmxvYWQtYnV0dG9uXCIgZGF0YS12YWx1ZT1cIiR7ZG93bmxvYWRQYXRofVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPmAgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYDxidXR0b24gY2xhc3M9XCJ1aSB0aW55IGJhc2ljIGljb24gYnV0dG9uIGRvd25sb2FkLWJ1dHRvbiBkaXNhYmxlZFwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwidWkgaWNvbiBkb3dubG9hZCBkaXNhYmxlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPmBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgPHRkIGNsYXNzPVwiY29sbGFwc2luZ1wiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0aW55IGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL21vZGlmeS8ke2ZpbGUuaWR9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGVkaXQgcG9wdXBlZFwiXG4gICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFZGl0fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGVkaXQgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2RlbGV0ZS8ke2ZpbGUuaWR9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke2ZpbGUuaWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlIHR3by1zdGVwcy1kZWxldGUgcG9wdXBlZFwiXG4gICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEZWxldGV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L3RkPlxuICAgICAgICA8L3RyPmA7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgZW1wdHkgcGxhY2Vob2xkZXIgSFRNTFxuICAgICAqL1xuICAgIGdldEVtcHR5UGxhY2Vob2xkZXIoY2F0ZWdvcnkpIHtcbiAgICAgICAgY29uc3QgbGlua1BhdGggPSBjYXRlZ29yeSA9PT0gJ2N1c3RvbScgPyAnc291bmQtZmlsZXMvbW9kaWZ5L2N1c3RvbScgOiAnc291bmQtZmlsZXMvbW9kaWZ5L21vaCc7XG4gICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInVpIHBsYWNlaG9sZGVyIHNlZ21lbnRcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBpY29uIGhlYWRlclwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwibXVzaWMgaWNvblwiPjwvaT5cbiAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5zZl9FbXB0eVRhYmxlVGl0bGV9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxwPiR7Z2xvYmFsVHJhbnNsYXRlLnNmX0VtcHR5VGFibGVEZXNjcmlwdGlvbn08L3A+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgcHJpbWFyeSBidXR0b25cIiBvbmNsaWNrPVwid2luZG93LmxvY2F0aW9uPScke2dsb2JhbFJvb3RVcmx9JHtsaW5rUGF0aH0nXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJhZGQgY2lyY2xlIGljb25cIj48L2k+ICR7Z2xvYmFsVHJhbnNsYXRlLnNmX0FkZE5ld1NvdW5kRmlsZX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5gO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkZWxldGUgaGFuZGxlciBmb3IgUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVsZXRlSGFuZGxlcigpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGFueSBleGlzdGluZyBoYW5kbGVycyB0byBwcmV2ZW50IGR1cGxpY2F0ZXNcbiAgICAgICAgJCgnYm9keScpLm9mZignY2xpY2suc291bmRmaWxlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gSGFuZGxlIGFjdHVhbCBkZWxldGlvbiBhZnRlciB0d28tc3RlcHMgY29uZmlybWF0aW9uXG4gICAgICAgICQoJ2JvZHknKS5vbignY2xpY2suc291bmRmaWxlcycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EuZGVsZXRlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgZGVsZXRlIGJ1dHRvbiBpcyBpbiBvdXIgc291bmQgZmlsZXMgdGFibGVcbiAgICAgICAgICAgIGlmICgkdGFyZ2V0LmNsb3Nlc3QoJyNjdXN0b20tc291bmQtZmlsZXMtdGFibGUsICNtb2gtc291bmQtZmlsZXMtdGFibGUnKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGNvbnN0IGZpbGVJZCA9ICR0YXJnZXQuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkdGFyZ2V0LmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFNvdW5kRmlsZXNBUEkuZGVsZXRlUmVjb3JkKGZpbGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlc1RhYmxlLmNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgcmVjb3JkIGRlbGV0aW9uXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgY3VycmVudCB0YWJcbiAgICAgICAgICAgIHNvdW5kRmlsZXNUYWJsZS5sb2FkU291bmRGaWxlcyhzb3VuZEZpbGVzVGFibGUuYWN0aXZlQ2F0ZWdvcnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCBcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc2ZfSW1wb3NzaWJsZVRvRGVsZXRlU291bmRGaWxlXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBpbmRpY2F0b3JcbiAgICAgICAgJCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0KCRjb250YWluZXIpIHtcbiAgICAgICAgJGNvbnRhaW5lci5vbignZGJsY2xpY2snLCAndHIuZmlsZS1yb3cgdGQnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAvLyBTa2lwIGlmIGNsaWNraW5nIG9uIGFjdGlvbiBidXR0b25zIGNvbHVtblxuICAgICAgICAgICAgaWYgKCQodGhpcykuaGFzQ2xhc3MoJ2NvbGxhcHNpbmcnKSB8fCAkKHRoaXMpLmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNraXAgaWYgY2xpY2tpbmcgb24gYW55IGJ1dHRvbiBvciBpY29uXG4gICAgICAgICAgICBpZiAoJChlLnRhcmdldCkuY2xvc2VzdCgnYnV0dG9uLCBhLCBpJykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgJHJvdyA9ICQodGhpcykuY2xvc2VzdCgndHInKTtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVJZCA9ICRyb3cuYXR0cignaWQnKTtcbiAgICAgICAgICAgIGlmIChmaWxlSWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL21vZGlmeS8ke2ZpbGVJZH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHNvdW5kRmlsZXNUYWJsZS5pbml0aWFsaXplKCk7XG59KTsiXX0=