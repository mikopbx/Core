"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi, globalTranslate, globalPBXVersion, ModulesAPI */

/**
 * Represents list of extension modules.
 * @class marketplace
 * @memberof module:PbxExtensionModules
 */
var marketplace = {
  /**
   * jQuery object for the table with available modules.
   * @type {jQuery}
   */
  $marketplaceTable: $('#new-modules-table'),

  /**
   * jQuery object for the loader instead of available modules.
   * @type {jQuery}
   */
  $marketplaceLoader: $('#new-modules-loader'),

  /**
   * jQuery object for the information when no any modules available to install.
   * @type {jQuery}
   */
  $noNewModulesSegment: $('#no-new-modules-segment'),

  /**
   * Store current installed a PBX version without a div postfix
   * @type {string}
   */
  pbxVersion: globalPBXVersion.replace(/-dev/i, ''),

  /**
   * jQuery object for the button which responsible for update all installed modules
   * @type {jQuery}
   */
  $btnUpdateAllModules: $('#update-all-modules-button'),

  /**
   * jQuery object initialized flag
   * @type {jQuery}
   */
  isInitialized: false,

  /**
   * Initialize extensionModulesShowAvailable class
   */
  initialize: function initialize() {
    if (marketplace.isInitialized) {
      return;
    }

    marketplace.isInitialized = true;
    ModulesAPI.getAvailable(marketplace.cbParseModuleUpdates);
  },

  /**
   * Initialize data tables on table
   */
  initializeDataTable: function initializeDataTable() {
    marketplace.$marketplaceTable.DataTable({
      lengthChange: false,
      paging: false,
      columns: [{
        orderable: false
      }, null, {
        orderable: false,
        searchable: false
      }, {
        orderable: false,
        searchable: false
      }],
      autoWidth: false,
      sDom: 'lrtip',
      language: SemanticLocalization.dataTableLocalisation,
      initComplete: function initComplete() {
        this.api().columns().every(function () {
          var _this = this;

          var column = this;

          if (column.index() === 0) {
            var title = column.header().textContent; // Create input element

            var input = document.createElement('input');
            input.placeholder = title;
            column.header().replaceChildren(input); // Event listener for user input

            input.addEventListener('keyup', function () {
              if (column.search() !== _this.value) {
                column.search(input.value).draw();
              }
            });
          }
        });
      }
    });
  },

  /**
   * Callback function to process the list of modules received from the website.
   * @param {object} response - The response containing the list of modules.
   */
  cbParseModuleUpdates: function cbParseModuleUpdates(responseData, isSuccessful) {
    marketplace.$marketplaceLoader.hide(); // When success, responseData is response.data from API
    // When failure, responseData is the full response object

    if (!isSuccessful) {
      marketplace.$noNewModulesSegment.show();
      return;
    } // In success case, responseData is response.data which should contain modules


    var modules = (responseData === null || responseData === void 0 ? void 0 : responseData.modules) || [];

    if (Array.isArray(modules) && modules.length > 0) {
      modules.forEach(function (obj) {
        // Check if this module is compatible with the PBX based on version number
        var minAppropriateVersionPBX = obj.min_pbx_version;
        var newModuleVersion = obj.version;
        var currentVersionPBX = marketplace.pbxVersion;

        if (marketplace.versionCompare(currentVersionPBX, minAppropriateVersionPBX) < 0) {
          return;
        } // Add new module row


        marketplace.addModuleDescription(obj); // Check if the module is already installed and offer an update

        var $moduleRow = $("tr.module-row[data-id=".concat(obj.uniqid, "]"));

        if ($moduleRow.length > 0) {
          var installedVer = $moduleRow.find('td.version').text().trim();
          var versionCompareResult = marketplace.versionCompare(newModuleVersion, installedVer);

          if (versionCompareResult > 0) {
            marketplace.addUpdateButtonToRow(obj);
          } else if (versionCompareResult === 0) {
            marketplace.changeDownloadButtonOnRow(obj);
          }
        }
      });
    }

    if ($('tr.new-module-row').length > 0) {
      marketplace.$noNewModulesSegment.hide(); // Only initialize if DataTable is not already initialized

      if (!$.fn.DataTable.isDataTable(marketplace.$marketplaceTable)) {
        marketplace.initializeDataTable();
      } else {
        // If table is already initialized, just redraw it
        marketplace.$marketplaceTable.DataTable().draw();
      }
    } else {
      marketplace.$noNewModulesSegment.show();
    } // Check if URL has a module query parameter to auto-open its detail modal


    marketplace.openModuleFromQueryParam();
  },

  /**
   * Checks the URL query parameter for a module uniqid and opens its detail modal.
   * URL format: ?module=ModuleUniqid#/marketplace
   */
  openModuleFromQueryParam: function openModuleFromQueryParam() {
    var urlParams = new URLSearchParams(window.location.search);
    var uniqid = urlParams.get('module');

    if (!uniqid) {
      return;
    }

    var $moduleRow = $("tr.new-module-row[data-id=".concat(uniqid, "]"));

    if ($moduleRow.length > 0) {
      $moduleRow.find('td.show-details-on-click').first().trigger('click');
    } // Clean up the URL parameter after opening the modal


    var cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState(null, '', cleanUrl);
  },

  /**
   * Adds a description for an available module.
   * @param {Object} obj - The module object containing information.
   */
  addModuleDescription: function addModuleDescription(obj) {
    marketplace.$marketplaceTable.show();
    var promoLink = '';

    if (obj.promo_link !== undefined && obj.promo_link !== null) {
      promoLink = "<br><a href=\"".concat(obj.promo_link, "\" target=\"_blank\">").concat(globalTranslate.ext_ExternalDescription, "</a>");
    }

    var additionalIcon = '<i class="puzzle piece icon"></i>';

    if (obj.commercial !== 0) {
      additionalIcon = '<i class="ui donate icon"></i>';
    }

    var dynamicRow = "\n\t\t\t<tr class=\"new-module-row\" data-id=\"".concat(obj.uniqid, "\" data-name=\"").concat(decodeURIComponent(obj.name), "\">\n\t\t\t\t\t\t<td class=\"show-details-on-click\">").concat(additionalIcon, " ").concat(decodeURIComponent(obj.name), "<br>\n\t\t\t\t\t\t    <span class=\"features\">").concat(decodeURIComponent(obj.description), " ").concat(promoLink, "</span>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td class=\"show-details-on-click\">").concat(decodeURIComponent(obj.developer), "</td>\n\t\t\t\t\t\t<td class=\"center aligned version show-details-on-click\">").concat(obj.version, "</td>\n\t\t\t\t\t\t<td class=\"right aligned collapsing\">\n    \t\t\t\t\t\t\t<div class=\"ui small basic icon buttons action-buttons\">\n                                    <a href=\"#\" class=\"ui icon basic button download popuped disable-if-no-internet\" \n                                        data-content= \"").concat(globalTranslate.ext_InstallModule, "\"\n                                        data-uniqid = \"").concat(obj.uniqid, "\"\n                                        data-size = \"").concat(obj.size, "\"\n                                        data-version =\"").concat(obj.version, "\"\n                                        data-releaseid =\"").concat(obj.release_id, "\">\n                                        <i class=\"icon download blue\"></i> \n                                    </a>\n\t\t\t\t\t\t\t\t</div>\n    \t\t\t\t    </td>\t\t\n\t\t\t</tr>");
    $('#new-modules-table tbody').append(dynamicRow);
  },

  /**
   * Adds an update button to the module row for updating an old version of PBX.
   * @param {Object} obj - The module object containing information.
   */
  addUpdateButtonToRow: function addUpdateButtonToRow(obj) {
    var $moduleRow = $("tr.module-row[data-id=".concat(obj.uniqid, "]")); // Check if we're working with a DataTable

    var $table = $('#installed-modules-table');

    if ($.fn.DataTable && $.fn.DataTable.isDataTable($table)) {
      var table = $table.DataTable(); // Use jQuery element to find the row in DataTable instead of index

      var dtRow = table.row($moduleRow);

      if (dtRow.any()) {
        // Get the row node to work with
        var $rowNode = $(dtRow.node()); // Clone the row's last cell (action buttons cell)

        var $lastCell = $rowNode.find('td:last').clone(); // Remove download button if exists

        $lastCell.find('a.download').remove(); // Create update button

        var dynamicButton = "<a href=\"#\" class=\"ui basic icon button update popuped disable-if-no-internet\" \n                    data-content=\"".concat(globalTranslate.ext_UpdateModule, "\"\n                    data-version =\"").concat(obj.version, "\"\n                    data-size = \"").concat(obj.size, "\"\n                    data-uniqid =\"").concat(obj.uniqid, "\" \n                    data-releaseid =\"").concat(obj.release_id, "\">\n                    <i class=\"icon redo blue\"></i> \n                    </a>"); // Prepend button to action-buttons div

        $lastCell.find('.action-buttons').prepend(dynamicButton); // Update the cell in DataTable using the row API

        var cellIndex = $rowNode.find('td').length - 1; // Last cell

        table.cell(dtRow, cellIndex).data($lastCell.html()).draw(false); // Re-initialize all popups after DOM update

        setTimeout(function () {
          extensionModules.initializePopups();
        }, 100);
      } else {
        // If row not found in DataTable, use direct DOM manipulation
        this.addUpdateButtonDirectly($moduleRow, obj);
      }
    } else {
      // Fallback for non-DataTable scenario
      this.addUpdateButtonDirectly($moduleRow, obj);
    }

    marketplace.$btnUpdateAllModules.show();
  },

  /**
   * Adds update button directly to DOM without DataTable API
   * @param {jQuery} $moduleRow - The module row jQuery element
   * @param {Object} obj - The module object containing information
   */
  addUpdateButtonDirectly: function addUpdateButtonDirectly($moduleRow, obj) {
    var $currentDownloadButton = $moduleRow.find('a.download');
    $currentDownloadButton.remove();
    var dynamicButton = "<a href=\"#\" class=\"ui basic icon button update popuped disable-if-no-internet\" \n            data-content=\"".concat(globalTranslate.ext_UpdateModule, "\"\n            data-version =\"").concat(obj.version, "\"\n            data-size = \"").concat(obj.size, "\"\n            data-uniqid =\"").concat(obj.uniqid, "\" \n            data-releaseid =\"").concat(obj.release_id, "\">\n            <i class=\"icon redo blue\"></i> \n            </a>");
    var $actionButtons = $moduleRow.find('.action-buttons');
    $actionButtons.prepend(dynamicButton); // Re-initialize all popups after DOM update

    extensionModules.initializePopups();
  },

  /**
   *
   * @param {Object} obj - The module object containing information.
   */
  changeDownloadButtonOnRow: function changeDownloadButtonOnRow(obj) {
    var $moduleRow = $("tr.new-module-row[data-id=".concat(obj.uniqid, "]"));
    var $currentDownloadButton = $moduleRow.find('a.download');
    $currentDownloadButton.remove();
    var dynamicButton = "<a href=\"#\" class=\"ui basic icon button popuped disable-if-no-internet\" \n\t\t\tdata-content=\"".concat(globalTranslate.ext_ShowModuleRepoDetails, "\">\n\t\t\t<i class=\"icon search blue\"></i> \n\t\t\t</a>");
    $moduleRow.find('.action-buttons').prepend(dynamicButton);
    $moduleRow.find('.action-buttons').closest('td').addClass('show-details-on-click');
  },

  /**
   * Compare versions of modules.
   * @param {string} v1 - The first version to compare.
   * @param {string} v2 - The second version to compare.
   * @param {object} [options] - Optional configuration options.
   * @param {boolean} [options.lexicographical] - Whether to perform lexicographical comparison (default: false).
   * @param {boolean} [options.zeroExtend] - Weather to zero-extend the shorter version (default: false).
   * @returns {number} - A number indicating the comparison result: 0 if versions are equal, 1 if v1 is greater, -1 if v2 is greater, or NaN if the versions are invalid.
   */
  versionCompare: function versionCompare(v1, v2, options) {
    var lexicographical = options && options.lexicographical;
    var zeroExtend = options && options.zeroExtend;
    var v1parts = String(v1).split('.');
    var v2parts = String(v2).split('.');

    function isValidPart(x) {
      return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
    }

    if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
      return NaN;
    }

    if (zeroExtend) {
      while (v1parts.length < v2parts.length) {
        v1parts.push('0');
      }

      while (v2parts.length < v1parts.length) {
        v2parts.push('0');
      }
    }

    if (!lexicographical) {
      v1parts = v1parts.map(Number);
      v2parts = v2parts.map(Number);
    }

    for (var i = 0; i < v1parts.length; i += 1) {
      if (v2parts.length === i) {
        return 1;
      }

      if (v1parts[i] === v2parts[i]) {//
      } else if (v1parts[i] > v2parts[i]) {
        return 1;
      } else {
        return -1;
      }
    }

    if (v1parts.length !== v2parts.length) {
      return -1;
    }

    return 0;
  }
}; // Make marketplace globally accessible

window.marketplace = marketplace;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLW1hcmtldHBsYWNlLmpzIl0sIm5hbWVzIjpbIm1hcmtldHBsYWNlIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG1hcmtldHBsYWNlTG9hZGVyIiwiJG5vTmV3TW9kdWxlc1NlZ21lbnQiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCIkYnRuVXBkYXRlQWxsTW9kdWxlcyIsImlzSW5pdGlhbGl6ZWQiLCJpbml0aWFsaXplIiwiTW9kdWxlc0FQSSIsImdldEF2YWlsYWJsZSIsImNiUGFyc2VNb2R1bGVVcGRhdGVzIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwiYXV0b1dpZHRoIiwic0RvbSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJpbml0Q29tcGxldGUiLCJhcGkiLCJldmVyeSIsImNvbHVtbiIsImluZGV4IiwidGl0bGUiLCJoZWFkZXIiLCJ0ZXh0Q29udGVudCIsImlucHV0IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwicGxhY2Vob2xkZXIiLCJyZXBsYWNlQ2hpbGRyZW4iLCJhZGRFdmVudExpc3RlbmVyIiwic2VhcmNoIiwidmFsdWUiLCJkcmF3IiwicmVzcG9uc2VEYXRhIiwiaXNTdWNjZXNzZnVsIiwiaGlkZSIsInNob3ciLCJtb2R1bGVzIiwiQXJyYXkiLCJpc0FycmF5IiwibGVuZ3RoIiwiZm9yRWFjaCIsIm9iaiIsIm1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCIsIm1pbl9wYnhfdmVyc2lvbiIsIm5ld01vZHVsZVZlcnNpb24iLCJ2ZXJzaW9uIiwiY3VycmVudFZlcnNpb25QQlgiLCJ2ZXJzaW9uQ29tcGFyZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImluc3RhbGxlZFZlciIsImZpbmQiLCJ0ZXh0IiwidHJpbSIsInZlcnNpb25Db21wYXJlUmVzdWx0IiwiYWRkVXBkYXRlQnV0dG9uVG9Sb3ciLCJjaGFuZ2VEb3dubG9hZEJ1dHRvbk9uUm93IiwiZm4iLCJpc0RhdGFUYWJsZSIsIm9wZW5Nb2R1bGVGcm9tUXVlcnlQYXJhbSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2V0IiwiZmlyc3QiLCJ0cmlnZ2VyIiwiY2xlYW5VcmwiLCJwYXRobmFtZSIsImhhc2giLCJoaXN0b3J5IiwicmVwbGFjZVN0YXRlIiwicHJvbW9MaW5rIiwicHJvbW9fbGluayIsInVuZGVmaW5lZCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9FeHRlcm5hbERlc2NyaXB0aW9uIiwiYWRkaXRpb25hbEljb24iLCJjb21tZXJjaWFsIiwiZHluYW1pY1JvdyIsImRlY29kZVVSSUNvbXBvbmVudCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsImRldmVsb3BlciIsImV4dF9JbnN0YWxsTW9kdWxlIiwic2l6ZSIsInJlbGVhc2VfaWQiLCJhcHBlbmQiLCIkdGFibGUiLCJ0YWJsZSIsImR0Um93Iiwicm93IiwiYW55IiwiJHJvd05vZGUiLCJub2RlIiwiJGxhc3RDZWxsIiwiY2xvbmUiLCJyZW1vdmUiLCJkeW5hbWljQnV0dG9uIiwiZXh0X1VwZGF0ZU1vZHVsZSIsInByZXBlbmQiLCJjZWxsSW5kZXgiLCJjZWxsIiwiZGF0YSIsImh0bWwiLCJzZXRUaW1lb3V0IiwiZXh0ZW5zaW9uTW9kdWxlcyIsImluaXRpYWxpemVQb3B1cHMiLCJhZGRVcGRhdGVCdXR0b25EaXJlY3RseSIsIiRjdXJyZW50RG93bmxvYWRCdXR0b24iLCIkYWN0aW9uQnV0dG9ucyIsImV4dF9TaG93TW9kdWxlUmVwb0RldGFpbHMiLCJjbG9zZXN0IiwiYWRkQ2xhc3MiLCJ2MSIsInYyIiwib3B0aW9ucyIsImxleGljb2dyYXBoaWNhbCIsInplcm9FeHRlbmQiLCJ2MXBhcnRzIiwiU3RyaW5nIiwic3BsaXQiLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsIk5hTiIsInB1c2giLCJtYXAiLCJOdW1iZXIiLCJpIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFdBQVcsR0FBRztBQUVoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRUMsQ0FBQyxDQUFDLG9CQUFELENBTko7O0FBUWhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFRCxDQUFDLENBQUMscUJBQUQsQ0FaTDs7QUFjaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsb0JBQW9CLEVBQUVGLENBQUMsQ0FBQyx5QkFBRCxDQWxCUDs7QUFvQmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFVBQVUsRUFBRUMsZ0JBQWdCLENBQUNDLE9BQWpCLENBQXlCLE9BQXpCLEVBQWtDLEVBQWxDLENBeEJJOztBQTBCaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsb0JBQW9CLEVBQUVOLENBQUMsQ0FBQyw0QkFBRCxDQTlCUDs7QUFnQ2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lPLEVBQUFBLGFBQWEsRUFBRSxLQXBDQzs7QUFzQ2hCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQXpDZ0Isd0JBeUNIO0FBQ1QsUUFBSVYsV0FBVyxDQUFDUyxhQUFoQixFQUErQjtBQUMzQjtBQUNIOztBQUNEVCxJQUFBQSxXQUFXLENBQUNTLGFBQVosR0FBNEIsSUFBNUI7QUFDQUUsSUFBQUEsVUFBVSxDQUFDQyxZQUFYLENBQXdCWixXQUFXLENBQUNhLG9CQUFwQztBQUNILEdBL0NlOztBQWlEaEI7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OlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBnbG9iYWxQQlhWZXJzaW9uLCBNb2R1bGVzQVBJICovXG5cbi8qKlxuICogUmVwcmVzZW50cyBsaXN0IG9mIGV4dGVuc2lvbiBtb2R1bGVzLlxuICogQGNsYXNzIG1hcmtldHBsYWNlXG4gKiBAbWVtYmVyb2YgbW9kdWxlOlBieEV4dGVuc2lvbk1vZHVsZXNcbiAqL1xuY29uc3QgbWFya2V0cGxhY2UgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFibGUgd2l0aCBhdmFpbGFibGUgbW9kdWxlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYXJrZXRwbGFjZVRhYmxlOiAkKCcjbmV3LW1vZHVsZXMtdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2FkZXIgaW5zdGVhZCBvZiBhdmFpbGFibGUgbW9kdWxlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYXJrZXRwbGFjZUxvYWRlcjogJCgnI25ldy1tb2R1bGVzLWxvYWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGluZm9ybWF0aW9uIHdoZW4gbm8gYW55IG1vZHVsZXMgYXZhaWxhYmxlIHRvIGluc3RhbGwuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbm9OZXdNb2R1bGVzU2VnbWVudDogJCgnI25vLW5ldy1tb2R1bGVzLXNlZ21lbnQnKSxcblxuICAgIC8qKlxuICAgICAqIFN0b3JlIGN1cnJlbnQgaW5zdGFsbGVkIGEgUEJYIHZlcnNpb24gd2l0aG91dCBhIGRpdiBwb3N0Zml4XG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBwYnhWZXJzaW9uOiBnbG9iYWxQQlhWZXJzaW9uLnJlcGxhY2UoLy1kZXYvaSwgJycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGJ1dHRvbiB3aGljaCByZXNwb25zaWJsZSBmb3IgdXBkYXRlIGFsbCBpbnN0YWxsZWQgbW9kdWxlc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJ0blVwZGF0ZUFsbE1vZHVsZXM6ICQoJyN1cGRhdGUtYWxsLW1vZHVsZXMtYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGluaXRpYWxpemVkIGZsYWdcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6ZWQ6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb25Nb2R1bGVzU2hvd0F2YWlsYWJsZSBjbGFzc1xuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmIChtYXJrZXRwbGFjZS5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbWFya2V0cGxhY2UuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIE1vZHVsZXNBUEkuZ2V0QXZhaWxhYmxlKG1hcmtldHBsYWNlLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYXV0b1dpZHRoOiBmYWxzZSxcbiAgICAgICAgICAgIHNEb206ICdscnRpcCcsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgaW5pdENvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGkoKVxuICAgICAgICAgICAgICAgICAgICAuY29sdW1ucygpXG4gICAgICAgICAgICAgICAgICAgIC5ldmVyeShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29sdW1uID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2x1bW4uaW5kZXgoKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0aXRsZSA9IGNvbHVtbi5oZWFkZXIoKS50ZXh0Q29udGVudDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5wbGFjZWhvbGRlciA9IHRpdGxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbi5oZWFkZXIoKS5yZXBsYWNlQ2hpbGRyZW4oaW5wdXQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHVzZXIgaW5wdXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbHVtbi5zZWFyY2goKSAhPT0gdGhpcy52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uLnNlYXJjaChpbnB1dC52YWx1ZSkuZHJhdygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcHJvY2VzcyB0aGUgbGlzdCBvZiBtb2R1bGVzIHJlY2VpdmVkIGZyb20gdGhlIHdlYnNpdGUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIGxpc3Qgb2YgbW9kdWxlcy5cbiAgICAgKi9cbiAgICBjYlBhcnNlTW9kdWxlVXBkYXRlcyhyZXNwb25zZURhdGEsIGlzU3VjY2Vzc2Z1bCkge1xuICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VMb2FkZXIuaGlkZSgpO1xuXG4gICAgICAgIC8vIFdoZW4gc3VjY2VzcywgcmVzcG9uc2VEYXRhIGlzIHJlc3BvbnNlLmRhdGEgZnJvbSBBUElcbiAgICAgICAgLy8gV2hlbiBmYWlsdXJlLCByZXNwb25zZURhdGEgaXMgdGhlIGZ1bGwgcmVzcG9uc2Ugb2JqZWN0XG4gICAgICAgIGlmICghaXNTdWNjZXNzZnVsKSB7XG4gICAgICAgICAgICBtYXJrZXRwbGFjZS4kbm9OZXdNb2R1bGVzU2VnbWVudC5zaG93KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbiBzdWNjZXNzIGNhc2UsIHJlc3BvbnNlRGF0YSBpcyByZXNwb25zZS5kYXRhIHdoaWNoIHNob3VsZCBjb250YWluIG1vZHVsZXNcbiAgICAgICAgY29uc3QgbW9kdWxlcyA9IHJlc3BvbnNlRGF0YT8ubW9kdWxlcyB8fCBbXTtcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShtb2R1bGVzKSAmJiBtb2R1bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBtb2R1bGUgaXMgY29tcGF0aWJsZSB3aXRoIHRoZSBQQlggYmFzZWQgb24gdmVyc2lvbiBudW1iZXJcbiAgICAgICAgICAgICAgICBjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld01vZHVsZVZlcnNpb24gPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50VmVyc2lvblBCWCA9IG1hcmtldHBsYWNlLnBieFZlcnNpb247XG4gICAgICAgICAgICAgICAgaWYgKG1hcmtldHBsYWNlLnZlcnNpb25Db21wYXJlKGN1cnJlbnRWZXJzaW9uUEJYLCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgpIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQWRkIG5ldyBtb2R1bGUgcm93XG4gICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgYWxyZWFkeSBpbnN0YWxsZWQgYW5kIG9mZmVyIGFuIHVwZGF0ZVxuICAgICAgICAgICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93W2RhdGEtaWQ9JHtvYmoudW5pcWlkfV1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJG1vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluc3RhbGxlZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZlcnNpb25Db21wYXJlUmVzdWx0ID0gbWFya2V0cGxhY2UudmVyc2lvbkNvbXBhcmUobmV3TW9kdWxlVmVyc2lvbiwgaW5zdGFsbGVkVmVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZlcnNpb25Db21wYXJlUmVzdWx0ID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2ZXJzaW9uQ29tcGFyZVJlc3VsdCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuY2hhbmdlRG93bmxvYWRCdXR0b25PblJvdyhvYmopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJCgndHIubmV3LW1vZHVsZS1yb3cnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBtYXJrZXRwbGFjZS4kbm9OZXdNb2R1bGVzU2VnbWVudC5oaWRlKCk7XG4gICAgICAgICAgICAvLyBPbmx5IGluaXRpYWxpemUgaWYgRGF0YVRhYmxlIGlzIG5vdCBhbHJlYWR5IGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISQuZm4uRGF0YVRhYmxlLmlzRGF0YVRhYmxlKG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlKSkge1xuICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGFibGUgaXMgYWxyZWFkeSBpbml0aWFsaXplZCwganVzdCByZWRyYXcgaXRcbiAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZS5EYXRhVGFibGUoKS5kcmF3KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYXJrZXRwbGFjZS4kbm9OZXdNb2R1bGVzU2VnbWVudC5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiBVUkwgaGFzIGEgbW9kdWxlIHF1ZXJ5IHBhcmFtZXRlciB0byBhdXRvLW9wZW4gaXRzIGRldGFpbCBtb2RhbFxuICAgICAgICBtYXJrZXRwbGFjZS5vcGVuTW9kdWxlRnJvbVF1ZXJ5UGFyYW0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBVUkwgcXVlcnkgcGFyYW1ldGVyIGZvciBhIG1vZHVsZSB1bmlxaWQgYW5kIG9wZW5zIGl0cyBkZXRhaWwgbW9kYWwuXG4gICAgICogVVJMIGZvcm1hdDogP21vZHVsZT1Nb2R1bGVVbmlxaWQjL21hcmtldHBsYWNlXG4gICAgICovXG4gICAgb3Blbk1vZHVsZUZyb21RdWVyeVBhcmFtKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCB1bmlxaWQgPSB1cmxQYXJhbXMuZ2V0KCdtb2R1bGUnKTtcbiAgICAgICAgaWYgKCF1bmlxaWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubmV3LW1vZHVsZS1yb3dbZGF0YS1pZD0ke3VuaXFpZH1dYCk7XG4gICAgICAgIGlmICgkbW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRtb2R1bGVSb3cuZmluZCgndGQuc2hvdy1kZXRhaWxzLW9uLWNsaWNrJykuZmlyc3QoKS50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICB9XG4gICAgICAgIC8vIENsZWFuIHVwIHRoZSBVUkwgcGFyYW1ldGVyIGFmdGVyIG9wZW5pbmcgdGhlIG1vZGFsXG4gICAgICAgIGNvbnN0IGNsZWFuVXJsID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lICsgd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZShudWxsLCAnJywgY2xlYW5VcmwpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgZGVzY3JpcHRpb24gZm9yIGFuIGF2YWlsYWJsZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKSB7XG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlLnNob3coKTtcbiAgICAgICAgbGV0IHByb21vTGluayA9ICcnO1xuICAgICAgICBpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInB1enpsZSBwaWVjZSBpY29uXCI+PC9pPic7XG4gICAgICAgIGlmIChvYmouY29tbWVyY2lhbCAhPT0gMCkge1xuICAgICAgICAgICAgYWRkaXRpb25hbEljb24gPSAnPGkgY2xhc3M9XCJ1aSBkb25hdGUgaWNvblwiPjwvaT4nO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGR5bmFtaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGRhdGEtaWQ9XCIke29iai51bmlxaWR9XCIgZGF0YS1uYW1lPVwiJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfVwiPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwic2hvdy1kZXRhaWxzLW9uLWNsaWNrXCI+JHthZGRpdGlvbmFsSWNvbn0gJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdCAgICA8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uIHNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGljb24gYmFzaWMgYnV0dG9uIGRvd25sb2FkIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdW5pcWlkID0gXCIke29iai51bmlxaWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZlcnNpb24gPVwiJHtvYmoudmVyc2lvbn1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcmVsZWFzZWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuXHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxuICAgIFx0XHRcdFx0ICAgIDwvdGQ+XHRcdFxuXHRcdFx0PC90cj5gO1xuICAgICAgICAkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHluYW1pY1Jvdyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gdXBkYXRlIGJ1dHRvbiB0byB0aGUgbW9kdWxlIHJvdyBmb3IgdXBkYXRpbmcgYW4gb2xkIHZlcnNpb24gb2YgUEJYLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvd1tkYXRhLWlkPSR7b2JqLnVuaXFpZH1dYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB3ZSdyZSB3b3JraW5nIHdpdGggYSBEYXRhVGFibGVcbiAgICAgICAgY29uc3QgJHRhYmxlID0gJCgnI2luc3RhbGxlZC1tb2R1bGVzLXRhYmxlJyk7XG4gICAgICAgIGlmICgkLmZuLkRhdGFUYWJsZSAmJiAkLmZuLkRhdGFUYWJsZS5pc0RhdGFUYWJsZSgkdGFibGUpKSB7XG4gICAgICAgICAgICBjb25zdCB0YWJsZSA9ICR0YWJsZS5EYXRhVGFibGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIGpRdWVyeSBlbGVtZW50IHRvIGZpbmQgdGhlIHJvdyBpbiBEYXRhVGFibGUgaW5zdGVhZCBvZiBpbmRleFxuICAgICAgICAgICAgY29uc3QgZHRSb3cgPSB0YWJsZS5yb3coJG1vZHVsZVJvdyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChkdFJvdy5hbnkoKSkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgcm93IG5vZGUgdG8gd29yayB3aXRoXG4gICAgICAgICAgICAgICAgY29uc3QgJHJvd05vZGUgPSAkKGR0Um93Lm5vZGUoKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2xvbmUgdGhlIHJvdydzIGxhc3QgY2VsbCAoYWN0aW9uIGJ1dHRvbnMgY2VsbClcbiAgICAgICAgICAgICAgICBjb25zdCAkbGFzdENlbGwgPSAkcm93Tm9kZS5maW5kKCd0ZDpsYXN0JykuY2xvbmUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZG93bmxvYWQgYnV0dG9uIGlmIGV4aXN0c1xuICAgICAgICAgICAgICAgICRsYXN0Q2VsbC5maW5kKCdhLmRvd25sb2FkJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHVwZGF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGV9XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS12ZXJzaW9uID1cIiR7b2JqLnZlcnNpb259XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtdW5pcWlkID1cIiR7b2JqLnVuaXFpZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1yZWxlYXNlaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG4gICAgICAgICAgICAgICAgICAgIDwvYT5gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFByZXBlbmQgYnV0dG9uIHRvIGFjdGlvbi1idXR0b25zIGRpdlxuICAgICAgICAgICAgICAgICRsYXN0Q2VsbC5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY2VsbCBpbiBEYXRhVGFibGUgdXNpbmcgdGhlIHJvdyBBUElcbiAgICAgICAgICAgICAgICBjb25zdCBjZWxsSW5kZXggPSAkcm93Tm9kZS5maW5kKCd0ZCcpLmxlbmd0aCAtIDE7IC8vIExhc3QgY2VsbFxuICAgICAgICAgICAgICAgIHRhYmxlLmNlbGwoZHRSb3csIGNlbGxJbmRleCkuZGF0YSgkbGFzdENlbGwuaHRtbCgpKS5kcmF3KGZhbHNlKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgYWxsIHBvcHVwcyBhZnRlciBET00gdXBkYXRlXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZVBvcHVwcygpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIHJvdyBub3QgZm91bmQgaW4gRGF0YVRhYmxlLCB1c2UgZGlyZWN0IERPTSBtYW5pcHVsYXRpb25cbiAgICAgICAgICAgICAgICB0aGlzLmFkZFVwZGF0ZUJ1dHRvbkRpcmVjdGx5KCRtb2R1bGVSb3csIG9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayBmb3Igbm9uLURhdGFUYWJsZSBzY2VuYXJpb1xuICAgICAgICAgICAgdGhpcy5hZGRVcGRhdGVCdXR0b25EaXJlY3RseSgkbW9kdWxlUm93LCBvYmopO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBtYXJrZXRwbGFjZS4kYnRuVXBkYXRlQWxsTW9kdWxlcy5zaG93KCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGRzIHVwZGF0ZSBidXR0b24gZGlyZWN0bHkgdG8gRE9NIHdpdGhvdXQgRGF0YVRhYmxlIEFQSVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkbW9kdWxlUm93IC0gVGhlIG1vZHVsZSByb3cgalF1ZXJ5IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvbkRpcmVjdGx5KCRtb2R1bGVSb3csIG9iaikge1xuICAgICAgICBjb25zdCAkY3VycmVudERvd25sb2FkQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLmRvd25sb2FkJyk7XG4gICAgICAgICRjdXJyZW50RG93bmxvYWRCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG4gICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlfVwiXG4gICAgICAgICAgICBkYXRhLXZlcnNpb24gPVwiJHtvYmoudmVyc2lvbn1cIlxuICAgICAgICAgICAgZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG4gICAgICAgICAgICBkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG4gICAgICAgICAgICBkYXRhLXJlbGVhc2VpZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG4gICAgICAgICAgICA8L2E+YDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRhY3Rpb25CdXR0b25zID0gJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKTtcbiAgICAgICAgJGFjdGlvbkJ1dHRvbnMucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGFsbCBwb3B1cHMgYWZ0ZXIgRE9NIHVwZGF0ZVxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemVQb3B1cHMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjaGFuZ2VEb3dubG9hZEJ1dHRvbk9uUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubmV3LW1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICBjb25zdCAkY3VycmVudERvd25sb2FkQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLmRvd25sb2FkJyk7XG4gICAgICAgICRjdXJyZW50RG93bmxvYWRCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b25cbiAgICAgICAgICAgID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcblx0XHRcdGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9TaG93TW9kdWxlUmVwb0RldGFpbHN9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gc2VhcmNoIGJsdWVcIj48L2k+IFxuXHRcdFx0PC9hPmA7XG4gICAgICAgICRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJylcbiAgICAgICAgICAgIC5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLmNsb3Nlc3QoJ3RkJykuYWRkQ2xhc3MoJ3Nob3ctZGV0YWlscy1vbi1jbGljaycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlIHZlcnNpb25zIG9mIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYxIC0gVGhlIGZpcnN0IHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdjIgLSBUaGUgc2Vjb25kIHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGV4aWNvZ3JhcGhpY2FsXSAtIFdoZXRoZXIgdG8gcGVyZm9ybSBsZXhpY29ncmFwaGljYWwgY29tcGFyaXNvbiAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuemVyb0V4dGVuZF0gLSBXZWF0aGVyIHRvIHplcm8tZXh0ZW5kIHRoZSBzaG9ydGVyIHZlcnNpb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSAtIEEgbnVtYmVyIGluZGljYXRpbmcgdGhlIGNvbXBhcmlzb24gcmVzdWx0OiAwIGlmIHZlcnNpb25zIGFyZSBlcXVhbCwgMSBpZiB2MSBpcyBncmVhdGVyLCAtMSBpZiB2MiBpcyBncmVhdGVyLCBvciBOYU4gaWYgdGhlIHZlcnNpb25zIGFyZSBpbnZhbGlkLlxuICAgICAqL1xuICAgIHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuICAgICAgICBjb25zdCB6ZXJvRXh0ZW5kID0gb3B0aW9ucyAmJiBvcHRpb25zLnplcm9FeHRlbmQ7XG4gICAgICAgIGxldCB2MXBhcnRzID0gU3RyaW5nKHYxKS5zcGxpdCgnLicpO1xuICAgICAgICBsZXQgdjJwYXJ0cyA9IFN0cmluZyh2Mikuc3BsaXQoJy4nKTtcblxuICAgICAgICBmdW5jdGlvbiBpc1ZhbGlkUGFydCh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXpdKiQvIDogL15cXGQrJC8pLnRlc3QoeCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXYxcGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpIHx8ICF2MnBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSkge1xuICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh6ZXJvRXh0ZW5kKSB7XG4gICAgICAgICAgICB3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgICAgICB3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuICAgICAgICAgICAgdjFwYXJ0cyA9IHYxcGFydHMubWFwKE51bWJlcik7XG4gICAgICAgICAgICB2MnBhcnRzID0gdjJwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdjFwYXJ0cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgaWYgKHYycGFydHMubGVuZ3RoID09PSBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYxcGFydHNbaV0gPiB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sXG5cbn07XG5cbi8vIE1ha2UgbWFya2V0cGxhY2UgZ2xvYmFsbHkgYWNjZXNzaWJsZVxud2luZG93Lm1hcmtldHBsYWNlID0gbWFya2V0cGxhY2U7Il19