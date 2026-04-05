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
            var title = column.header().textContent; // Create compact search input in Fomantic UI style

            var wrapper = document.createElement('div');
            wrapper.className = 'ui mini icon input';
            var input = document.createElement('input');
            input.placeholder = title;
            input.type = 'text';
            input.style.width = '200px';
            var icon = document.createElement('i');
            icon.className = 'search icon';
            wrapper.appendChild(input);
            wrapper.appendChild(icon); // Keep the header text for sorting, add input next to it

            column.header().textContent = '';
            column.header().appendChild(wrapper); // Prevent input clicks from triggering column sort

            wrapper.addEventListener('click', function (e) {
              return e.stopPropagation();
            }); // Event listener for user input

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLW1hcmtldHBsYWNlLmpzIl0sIm5hbWVzIjpbIm1hcmtldHBsYWNlIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG1hcmtldHBsYWNlTG9hZGVyIiwiJG5vTmV3TW9kdWxlc1NlZ21lbnQiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCIkYnRuVXBkYXRlQWxsTW9kdWxlcyIsImlzSW5pdGlhbGl6ZWQiLCJpbml0aWFsaXplIiwiTW9kdWxlc0FQSSIsImdldEF2YWlsYWJsZSIsImNiUGFyc2VNb2R1bGVVcGRhdGVzIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwiYXV0b1dpZHRoIiwic0RvbSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJpbml0Q29tcGxldGUiLCJhcGkiLCJldmVyeSIsImNvbHVtbiIsImluZGV4IiwidGl0bGUiLCJoZWFkZXIiLCJ0ZXh0Q29udGVudCIsIndyYXBwZXIiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJjbGFzc05hbWUiLCJpbnB1dCIsInBsYWNlaG9sZGVyIiwidHlwZSIsInN0eWxlIiwid2lkdGgiLCJpY29uIiwiYXBwZW5kQ2hpbGQiLCJhZGRFdmVudExpc3RlbmVyIiwiZSIsInN0b3BQcm9wYWdhdGlvbiIsInNlYXJjaCIsInZhbHVlIiwiZHJhdyIsInJlc3BvbnNlRGF0YSIsImlzU3VjY2Vzc2Z1bCIsImhpZGUiLCJzaG93IiwibW9kdWxlcyIsIkFycmF5IiwiaXNBcnJheSIsImxlbmd0aCIsImZvckVhY2giLCJvYmoiLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJuZXdNb2R1bGVWZXJzaW9uIiwidmVyc2lvbiIsImN1cnJlbnRWZXJzaW9uUEJYIiwidmVyc2lvbkNvbXBhcmUiLCJhZGRNb2R1bGVEZXNjcmlwdGlvbiIsIiRtb2R1bGVSb3ciLCJ1bmlxaWQiLCJpbnN0YWxsZWRWZXIiLCJmaW5kIiwidGV4dCIsInRyaW0iLCJ2ZXJzaW9uQ29tcGFyZVJlc3VsdCIsImFkZFVwZGF0ZUJ1dHRvblRvUm93IiwiY2hhbmdlRG93bmxvYWRCdXR0b25PblJvdyIsImZuIiwiaXNEYXRhVGFibGUiLCJvcGVuTW9kdWxlRnJvbVF1ZXJ5UGFyYW0iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdldCIsImZpcnN0IiwidHJpZ2dlciIsImNsZWFuVXJsIiwicGF0aG5hbWUiLCJoYXNoIiwiaGlzdG9yeSIsInJlcGxhY2VTdGF0ZSIsInByb21vTGluayIsInByb21vX2xpbmsiLCJ1bmRlZmluZWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfRXh0ZXJuYWxEZXNjcmlwdGlvbiIsImFkZGl0aW9uYWxJY29uIiwiY29tbWVyY2lhbCIsImR5bmFtaWNSb3ciLCJkZWNvZGVVUklDb21wb25lbnQiLCJuYW1lIiwiZGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJleHRfSW5zdGFsbE1vZHVsZSIsInNpemUiLCJyZWxlYXNlX2lkIiwiYXBwZW5kIiwiJHRhYmxlIiwidGFibGUiLCJkdFJvdyIsInJvdyIsImFueSIsIiRyb3dOb2RlIiwibm9kZSIsIiRsYXN0Q2VsbCIsImNsb25lIiwicmVtb3ZlIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwiY2VsbEluZGV4IiwiY2VsbCIsImRhdGEiLCJodG1sIiwic2V0VGltZW91dCIsImV4dGVuc2lvbk1vZHVsZXMiLCJpbml0aWFsaXplUG9wdXBzIiwiYWRkVXBkYXRlQnV0dG9uRGlyZWN0bHkiLCIkY3VycmVudERvd25sb2FkQnV0dG9uIiwiJGFjdGlvbkJ1dHRvbnMiLCJleHRfU2hvd01vZHVsZVJlcG9EZXRhaWxzIiwiY2xvc2VzdCIsImFkZENsYXNzIiwidjEiLCJ2MiIsIm9wdGlvbnMiLCJsZXhpY29ncmFwaGljYWwiLCJ6ZXJvRXh0ZW5kIiwidjFwYXJ0cyIsIlN0cmluZyIsInNwbGl0IiwidjJwYXJ0cyIsImlzVmFsaWRQYXJ0IiwieCIsInRlc3QiLCJOYU4iLCJwdXNoIiwibWFwIiwiTnVtYmVyIiwiaSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxXQUFXLEdBQUc7QUFFaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUVDLENBQUMsQ0FBQyxvQkFBRCxDQU5KOztBQVFoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRUQsQ0FBQyxDQUFDLHFCQUFELENBWkw7O0FBY2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLG9CQUFvQixFQUFFRixDQUFDLENBQUMseUJBQUQsQ0FsQlA7O0FBb0JoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxVQUFVLEVBQUVDLGdCQUFnQixDQUFDQyxPQUFqQixDQUF5QixPQUF6QixFQUFrQyxFQUFsQyxDQXhCSTs7QUEwQmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG9CQUFvQixFQUFFTixDQUFDLENBQUMsNEJBQUQsQ0E5QlA7O0FBZ0NoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJTyxFQUFBQSxhQUFhLEVBQUUsS0FwQ0M7O0FBc0NoQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUF6Q2dCLHdCQXlDSDtBQUNULFFBQUlWLFdBQVcsQ0FBQ1MsYUFBaEIsRUFBK0I7QUFDM0I7QUFDSDs7QUFDRFQsSUFBQUEsV0FBVyxDQUFDUyxhQUFaLEdBQTRCLElBQTVCO0FB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VjtBQUNBUCxNQUFBQSxPQUFPLEdBQUdBLE9BQU8sQ0FBQ00sR0FBUixDQUFZQyxNQUFaLENBQVY7QUFDSDs7QUFFRCxTQUFLLElBQUlDLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdYLE9BQU8sQ0FBQ2pGLE1BQTVCLEVBQW9DNEYsQ0FBQyxJQUFJLENBQXpDLEVBQTRDO0FBQ3hDLFVBQUlSLE9BQU8sQ0FBQ3BGLE1BQVIsS0FBbUI0RixDQUF2QixFQUEwQjtBQUN0QixlQUFPLENBQVA7QUFDSDs7QUFDRCxVQUFJWCxPQUFPLENBQUNXLENBQUQsQ0FBUCxLQUFlUixPQUFPLENBQUNRLENBQUQsQ0FBMUIsRUFBK0IsQ0FDM0I7QUFDSCxPQUZELE1BRU8sSUFBSVgsT0FBTyxDQUFDVyxDQUFELENBQVAsR0FBYVIsT0FBTyxDQUFDUSxDQUFELENBQXhCLEVBQTZCO0FBQ2hDLGVBQU8sQ0FBUDtBQUNILE9BRk0sTUFFQTtBQUNILGVBQU8sQ0FBQyxDQUFSO0FBQ0g7QUFDSjs7QUFFRCxRQUFJWCxPQUFPLENBQUNqRixNQUFSLEtBQW1Cb0YsT0FBTyxDQUFDcEYsTUFBL0IsRUFBdUM7QUFDbkMsYUFBTyxDQUFDLENBQVI7QUFDSDs7QUFFRCxXQUFPLENBQVA7QUFDSDtBQXRYZSxDQUFwQixDLENBMFhBOztBQUNBd0IsTUFBTSxDQUFDbEYsV0FBUCxHQUFxQkEsV0FBckIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFBCWFZlcnNpb24sIE1vZHVsZXNBUEkgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIGxpc3Qgb2YgZXh0ZW5zaW9uIG1vZHVsZXMuXG4gKiBAY2xhc3MgbWFya2V0cGxhY2VcbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBtYXJrZXRwbGFjZSA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJsZSB3aXRoIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlVGFibGU6ICQoJyNuZXctbW9kdWxlcy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvYWRlciBpbnN0ZWFkIG9mIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlTG9hZGVyOiAkKCcjbmV3LW1vZHVsZXMtbG9hZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaW5mb3JtYXRpb24gd2hlbiBubyBhbnkgbW9kdWxlcyBhdmFpbGFibGUgdG8gaW5zdGFsbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub05ld01vZHVsZXNTZWdtZW50OiAkKCcjbm8tbmV3LW1vZHVsZXMtc2VnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogU3RvcmUgY3VycmVudCBpbnN0YWxsZWQgYSBQQlggdmVyc2lvbiB3aXRob3V0IGEgZGl2IHBvc3RmaXhcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYnV0dG9uIHdoaWNoIHJlc3BvbnNpYmxlIGZvciB1cGRhdGUgYWxsIGluc3RhbGxlZCBtb2R1bGVzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYnRuVXBkYXRlQWxsTW9kdWxlczogJCgnI3VwZGF0ZS1hbGwtbW9kdWxlcy1idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgaW5pdGlhbGl6ZWQgZmxhZ1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbk1vZHVsZXNTaG93QXZhaWxhYmxlIGNsYXNzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKG1hcmtldHBsYWNlLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtYXJrZXRwbGFjZS5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgTW9kdWxlc0FQSS5nZXRBdmFpbGFibGUobWFya2V0cGxhY2UuY2JQYXJzZU1vZHVsZVVwZGF0ZXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRhdGEgdGFibGVzIG9uIHRhYmxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBhdXRvV2lkdGg6IGZhbHNlLFxuICAgICAgICAgICAgc0RvbTogJ2xydGlwJyxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBpbml0Q29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaSgpXG4gICAgICAgICAgICAgICAgICAgIC5jb2x1bW5zKClcbiAgICAgICAgICAgICAgICAgICAgLmV2ZXJ5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb2x1bW4gPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbHVtbi5pbmRleCgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRpdGxlID0gY29sdW1uLmhlYWRlcigpLnRleHRDb250ZW50O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGNvbXBhY3Qgc2VhcmNoIGlucHV0IGluIEZvbWFudGljIFVJIHN0eWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHdyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cmFwcGVyLmNsYXNzTmFtZSA9ICd1aSBtaW5pIGljb24gaW5wdXQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQucGxhY2Vob2xkZXIgPSB0aXRsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC50eXBlID0gJ3RleHQnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnN0eWxlLndpZHRoID0gJzIwMHB4JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaWNvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2knKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpY29uLmNsYXNzTmFtZSA9ICdzZWFyY2ggaWNvbic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JhcHBlci5hcHBlbmRDaGlsZChpbnB1dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JhcHBlci5hcHBlbmRDaGlsZChpY29uKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEtlZXAgdGhlIGhlYWRlciB0ZXh0IGZvciBzb3J0aW5nLCBhZGQgaW5wdXQgbmV4dCB0byBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbi5oZWFkZXIoKS50ZXh0Q29udGVudCA9ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbi5oZWFkZXIoKS5hcHBlbmRDaGlsZCh3cmFwcGVyKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByZXZlbnQgaW5wdXQgY2xpY2tzIGZyb20gdHJpZ2dlcmluZyBjb2x1bW4gc29ydFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyYXBwZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4gZS5zdG9wUHJvcGFnYXRpb24oKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgdXNlciBpbnB1dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29sdW1uLnNlYXJjaCgpICE9PSB0aGlzLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW4uc2VhcmNoKGlucHV0LnZhbHVlKS5kcmF3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHRoZSBsaXN0IG9mIG1vZHVsZXMgcmVjZWl2ZWQgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGlzdCBvZiBtb2R1bGVzLlxuICAgICAqL1xuICAgIGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlRGF0YSwgaXNTdWNjZXNzZnVsKSB7XG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZUxvYWRlci5oaWRlKCk7XG5cbiAgICAgICAgLy8gV2hlbiBzdWNjZXNzLCByZXNwb25zZURhdGEgaXMgcmVzcG9uc2UuZGF0YSBmcm9tIEFQSVxuICAgICAgICAvLyBXaGVuIGZhaWx1cmUsIHJlc3BvbnNlRGF0YSBpcyB0aGUgZnVsbCByZXNwb25zZSBvYmplY3RcbiAgICAgICAgaWYgKCFpc1N1Y2Nlc3NmdWwpIHtcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLiRub05ld01vZHVsZXNTZWdtZW50LnNob3coKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluIHN1Y2Nlc3MgY2FzZSwgcmVzcG9uc2VEYXRhIGlzIHJlc3BvbnNlLmRhdGEgd2hpY2ggc2hvdWxkIGNvbnRhaW4gbW9kdWxlc1xuICAgICAgICBjb25zdCBtb2R1bGVzID0gcmVzcG9uc2VEYXRhPy5tb2R1bGVzIHx8IFtdO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG1vZHVsZXMpICYmIG1vZHVsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIG1vZHVsZSBpcyBjb21wYXRpYmxlIHdpdGggdGhlIFBCWCBiYXNlZCBvbiB2ZXJzaW9uIG51bWJlclxuICAgICAgICAgICAgICAgIGNvbnN0IG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCA9IG9iai5taW5fcGJ4X3ZlcnNpb247XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3TW9kdWxlVmVyc2lvbiA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWZXJzaW9uUEJYID0gbWFya2V0cGxhY2UucGJ4VmVyc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAobWFya2V0cGxhY2UudmVyc2lvbkNvbXBhcmUoY3VycmVudFZlcnNpb25QQlgsIG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgbmV3IG1vZHVsZSByb3dcbiAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vZHVsZSBpcyBhbHJlYWR5IGluc3RhbGxlZCBhbmQgb2ZmZXIgYW4gdXBkYXRlXG4gICAgICAgICAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICAgICAgICAgIGlmICgkbW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5zdGFsbGVkVmVyID0gJG1vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVyc2lvbkNvbXBhcmVSZXN1bHQgPSBtYXJrZXRwbGFjZS52ZXJzaW9uQ29tcGFyZShuZXdNb2R1bGVWZXJzaW9uLCBpbnN0YWxsZWRWZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmVyc2lvbkNvbXBhcmVSZXN1bHQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5hZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZlcnNpb25Db21wYXJlUmVzdWx0ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5jaGFuZ2VEb3dubG9hZEJ1dHRvbk9uUm93KG9iaik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgkKCd0ci5uZXctbW9kdWxlLXJvdycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLiRub05ld01vZHVsZXNTZWdtZW50LmhpZGUoKTtcbiAgICAgICAgICAgIC8vIE9ubHkgaW5pdGlhbGl6ZSBpZiBEYXRhVGFibGUgaXMgbm90IGFscmVhZHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIGlmICghJC5mbi5EYXRhVGFibGUuaXNEYXRhVGFibGUobWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUpKSB7XG4gICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0YWJsZSBpcyBhbHJlYWR5IGluaXRpYWxpemVkLCBqdXN0IHJlZHJhdyBpdFxuICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlLkRhdGFUYWJsZSgpLmRyYXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLiRub05ld01vZHVsZXNTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIFVSTCBoYXMgYSBtb2R1bGUgcXVlcnkgcGFyYW1ldGVyIHRvIGF1dG8tb3BlbiBpdHMgZGV0YWlsIG1vZGFsXG4gICAgICAgIG1hcmtldHBsYWNlLm9wZW5Nb2R1bGVGcm9tUXVlcnlQYXJhbSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIFVSTCBxdWVyeSBwYXJhbWV0ZXIgZm9yIGEgbW9kdWxlIHVuaXFpZCBhbmQgb3BlbnMgaXRzIGRldGFpbCBtb2RhbC5cbiAgICAgKiBVUkwgZm9ybWF0OiA/bW9kdWxlPU1vZHVsZVVuaXFpZCMvbWFya2V0cGxhY2VcbiAgICAgKi9cbiAgICBvcGVuTW9kdWxlRnJvbVF1ZXJ5UGFyYW0oKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IHVuaXFpZCA9IHVybFBhcmFtcy5nZXQoJ21vZHVsZScpO1xuICAgICAgICBpZiAoIXVuaXFpZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvd1tkYXRhLWlkPSR7dW5pcWlkfV1gKTtcbiAgICAgICAgaWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJG1vZHVsZVJvdy5maW5kKCd0ZC5zaG93LWRldGFpbHMtb24tY2xpY2snKS5maXJzdCgpLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2xlYW4gdXAgdGhlIFVSTCBwYXJhbWV0ZXIgYWZ0ZXIgb3BlbmluZyB0aGUgbW9kYWxcbiAgICAgICAgY29uc3QgY2xlYW5VcmwgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgKyB3aW5kb3cubG9jYXRpb24uaGFzaDtcbiAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsICcnLCBjbGVhblVybCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBkZXNjcmlwdGlvbiBmb3IgYW4gYXZhaWxhYmxlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBhZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopIHtcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuc2hvdygpO1xuICAgICAgICBsZXQgcHJvbW9MaW5rID0gJyc7XG4gICAgICAgIGlmIChvYmoucHJvbW9fbGluayAhPT0gdW5kZWZpbmVkICYmIG9iai5wcm9tb19saW5rICE9PSBudWxsKSB7XG4gICAgICAgICAgICBwcm9tb0xpbmsgPSBgPGJyPjxhIGhyZWY9XCIke29iai5wcm9tb19saW5rfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9FeHRlcm5hbERlc2NyaXB0aW9ufTwvYT5gO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGFkZGl0aW9uYWxJY29uID0gJzxpIGNsYXNzPVwicHV6emxlIHBpZWNlIGljb25cIj48L2k+JztcbiAgICAgICAgaWYgKG9iai5jb21tZXJjaWFsICE9PSAwKSB7XG4gICAgICAgICAgICBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInVpIGRvbmF0ZSBpY29uXCI+PC9pPic7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZHluYW1pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgZGF0YS1pZD1cIiR7b2JqLnVuaXFpZH1cIiBkYXRhLW5hbWU9XCIke2RlY29kZVVSSUNvbXBvbmVudChvYmoubmFtZSl9XCI+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJzaG93LWRldGFpbHMtb24tY2xpY2tcIj4ke2FkZGl0aW9uYWxJY29ufSAke2RlY29kZVVSSUNvbXBvbmVudChvYmoubmFtZSl9PGJyPlxuXHRcdFx0XHRcdFx0ICAgIDxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pfSAke3Byb21vTGlua308L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwic2hvdy1kZXRhaWxzLW9uLWNsaWNrXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRldmVsb3Blcil9PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkIHZlcnNpb24gc2hvdy1kZXRhaWxzLW9uLWNsaWNrXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwidWkgc21hbGwgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgaWNvbiBiYXNpYyBidXR0b24gZG93bmxvYWQgcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmVyc2lvbiA9XCIke29iai52ZXJzaW9ufVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1yZWxlYXNlaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG5cdFx0XHRcdFx0XHRcdFx0PC9kaXY+XG4gICAgXHRcdFx0XHQgICAgPC90ZD5cdFx0XG5cdFx0XHQ8L3RyPmA7XG4gICAgICAgICQoJyNuZXctbW9kdWxlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW5hbWljUm93KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhbiB1cGRhdGUgYnV0dG9uIHRvIHRoZSBtb2R1bGUgcm93IGZvciB1cGRhdGluZyBhbiBvbGQgdmVyc2lvbiBvZiBQQlguXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKSB7XG4gICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93W2RhdGEtaWQ9JHtvYmoudW5pcWlkfV1gKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdlJ3JlIHdvcmtpbmcgd2l0aCBhIERhdGFUYWJsZVxuICAgICAgICBjb25zdCAkdGFibGUgPSAkKCcjaW5zdGFsbGVkLW1vZHVsZXMtdGFibGUnKTtcbiAgICAgICAgaWYgKCQuZm4uRGF0YVRhYmxlICYmICQuZm4uRGF0YVRhYmxlLmlzRGF0YVRhYmxlKCR0YWJsZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHRhYmxlID0gJHRhYmxlLkRhdGFUYWJsZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2UgalF1ZXJ5IGVsZW1lbnQgdG8gZmluZCB0aGUgcm93IGluIERhdGFUYWJsZSBpbnN0ZWFkIG9mIGluZGV4XG4gICAgICAgICAgICBjb25zdCBkdFJvdyA9IHRhYmxlLnJvdygkbW9kdWxlUm93KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGR0Um93LmFueSgpKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSByb3cgbm9kZSB0byB3b3JrIHdpdGhcbiAgICAgICAgICAgICAgICBjb25zdCAkcm93Tm9kZSA9ICQoZHRSb3cubm9kZSgpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDbG9uZSB0aGUgcm93J3MgbGFzdCBjZWxsIChhY3Rpb24gYnV0dG9ucyBjZWxsKVxuICAgICAgICAgICAgICAgIGNvbnN0ICRsYXN0Q2VsbCA9ICRyb3dOb2RlLmZpbmQoJ3RkOmxhc3QnKS5jbG9uZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkb3dubG9hZCBidXR0b24gaWYgZXhpc3RzXG4gICAgICAgICAgICAgICAgJGxhc3RDZWxsLmZpbmQoJ2EuZG93bmxvYWQnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdXBkYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b24gPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIHVwZGF0ZSBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuICAgICAgICAgICAgICAgICAgICBkYXRhLXZlcnNpb24gPVwiJHtvYmoudmVyc2lvbn1cIlxuICAgICAgICAgICAgICAgICAgICBkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLXJlbGVhc2VpZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcbiAgICAgICAgICAgICAgICAgICAgPC9hPmA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUHJlcGVuZCBidXR0b24gdG8gYWN0aW9uLWJ1dHRvbnMgZGl2XG4gICAgICAgICAgICAgICAgJGxhc3RDZWxsLmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBjZWxsIGluIERhdGFUYWJsZSB1c2luZyB0aGUgcm93IEFQSVxuICAgICAgICAgICAgICAgIGNvbnN0IGNlbGxJbmRleCA9ICRyb3dOb2RlLmZpbmQoJ3RkJykubGVuZ3RoIC0gMTsgLy8gTGFzdCBjZWxsXG4gICAgICAgICAgICAgICAgdGFibGUuY2VsbChkdFJvdywgY2VsbEluZGV4KS5kYXRhKCRsYXN0Q2VsbC5odG1sKCkpLmRyYXcoZmFsc2UpO1xuXG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBhbGwgcG9wdXBzIGFmdGVyIERPTSB1cGRhdGVcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplUG9wdXBzKCk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgcm93IG5vdCBmb3VuZCBpbiBEYXRhVGFibGUsIHVzZSBkaXJlY3QgRE9NIG1hbmlwdWxhdGlvblxuICAgICAgICAgICAgICAgIHRoaXMuYWRkVXBkYXRlQnV0dG9uRGlyZWN0bHkoJG1vZHVsZVJvdywgb2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIGZvciBub24tRGF0YVRhYmxlIHNjZW5hcmlvXG4gICAgICAgICAgICB0aGlzLmFkZFVwZGF0ZUJ1dHRvbkRpcmVjdGx5KCRtb2R1bGVSb3csIG9iaik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIG1hcmtldHBsYWNlLiRidG5VcGRhdGVBbGxNb2R1bGVzLnNob3coKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZHMgdXBkYXRlIGJ1dHRvbiBkaXJlY3RseSB0byBET00gd2l0aG91dCBEYXRhVGFibGUgQVBJXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRtb2R1bGVSb3cgLSBUaGUgbW9kdWxlIHJvdyBqUXVlcnkgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgYWRkVXBkYXRlQnV0dG9uRGlyZWN0bHkoJG1vZHVsZVJvdywgb2JqKSB7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50RG93bmxvYWRCdXR0b24gPSAkbW9kdWxlUm93LmZpbmQoJ2EuZG93bmxvYWQnKTtcbiAgICAgICAgJGN1cnJlbnREb3dubG9hZEJ1dHRvbi5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b24gPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIHVwZGF0ZSBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcbiAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGV9XCJcbiAgICAgICAgICAgIGRhdGEtdmVyc2lvbiA9XCIke29iai52ZXJzaW9ufVwiXG4gICAgICAgICAgICBkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcbiAgICAgICAgICAgIGRhdGEtdW5pcWlkID1cIiR7b2JqLnVuaXFpZH1cIiBcbiAgICAgICAgICAgIGRhdGEtcmVsZWFzZWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcbiAgICAgICAgICAgIDwvYT5gO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJGFjdGlvbkJ1dHRvbnMgPSAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpO1xuICAgICAgICAkYWN0aW9uQnV0dG9ucy5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuXG4gICAgICAgIC8vIFJlLWluaXRpYWxpemUgYWxsIHBvcHVwcyBhZnRlciBET00gdXBkYXRlXG4gICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZVBvcHVwcygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGNoYW5nZURvd25sb2FkQnV0dG9uT25Sb3cob2JqKSB7XG4gICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvd1tkYXRhLWlkPSR7b2JqLnVuaXFpZH1dYCk7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50RG93bmxvYWRCdXR0b24gPSAkbW9kdWxlUm93LmZpbmQoJ2EuZG93bmxvYWQnKTtcbiAgICAgICAgJGN1cnJlbnREb3dubG9hZEJ1dHRvbi5yZW1vdmUoKTtcbiAgICAgICAgY29uc3QgZHluYW1pY0J1dHRvblxuICAgICAgICAgICAgPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1Nob3dNb2R1bGVSZXBvRGV0YWlsc31cIj5cblx0XHRcdDxpIGNsYXNzPVwiaWNvbiBzZWFyY2ggYmx1ZVwiPjwvaT4gXG5cdFx0XHQ8L2E+YDtcbiAgICAgICAgJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKVxuICAgICAgICAgICAgLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG4gICAgICAgICRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJykuY2xvc2VzdCgndGQnKS5hZGRDbGFzcygnc2hvdy1kZXRhaWxzLW9uLWNsaWNrJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbXBhcmUgdmVyc2lvbnMgb2YgbW9kdWxlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdjEgLSBUaGUgZmlyc3QgdmVyc2lvbiB0byBjb21wYXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2MiAtIFRoZSBzZWNvbmQgdmVyc2lvbiB0byBjb21wYXJlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gLSBPcHRpb25hbCBjb25maWd1cmF0aW9uIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZXhpY29ncmFwaGljYWxdIC0gV2hldGhlciB0byBwZXJmb3JtIGxleGljb2dyYXBoaWNhbCBjb21wYXJpc29uIChkZWZhdWx0OiBmYWxzZSkuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy56ZXJvRXh0ZW5kXSAtIFdlYXRoZXIgdG8gemVyby1leHRlbmQgdGhlIHNob3J0ZXIgdmVyc2lvbiAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IC0gQSBudW1iZXIgaW5kaWNhdGluZyB0aGUgY29tcGFyaXNvbiByZXN1bHQ6IDAgaWYgdmVyc2lvbnMgYXJlIGVxdWFsLCAxIGlmIHYxIGlzIGdyZWF0ZXIsIC0xIGlmIHYyIGlzIGdyZWF0ZXIsIG9yIE5hTiBpZiB0aGUgdmVyc2lvbnMgYXJlIGludmFsaWQuXG4gICAgICovXG4gICAgdmVyc2lvbkNvbXBhcmUodjEsIHYyLCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGxleGljb2dyYXBoaWNhbCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5sZXhpY29ncmFwaGljYWw7XG4gICAgICAgIGNvbnN0IHplcm9FeHRlbmQgPSBvcHRpb25zICYmIG9wdGlvbnMuemVyb0V4dGVuZDtcbiAgICAgICAgbGV0IHYxcGFydHMgPSBTdHJpbmcodjEpLnNwbGl0KCcuJyk7XG4gICAgICAgIGxldCB2MnBhcnRzID0gU3RyaW5nKHYyKS5zcGxpdCgnLicpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGlzVmFsaWRQYXJ0KHgpIHtcbiAgICAgICAgICAgIHJldHVybiAobGV4aWNvZ3JhcGhpY2FsID8gL15cXGQrW0EtWmEtel0qJC8gOiAvXlxcZCskLykudGVzdCh4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHplcm9FeHRlbmQpIHtcbiAgICAgICAgICAgIHdoaWxlICh2MXBhcnRzLmxlbmd0aCA8IHYycGFydHMubGVuZ3RoKSB2MXBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgICAgIHdoaWxlICh2MnBhcnRzLmxlbmd0aCA8IHYxcGFydHMubGVuZ3RoKSB2MnBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbGV4aWNvZ3JhcGhpY2FsKSB7XG4gICAgICAgICAgICB2MXBhcnRzID0gdjFwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgICAgIHYycGFydHMgPSB2MnBhcnRzLm1hcChOdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2MXBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2MXBhcnRzW2ldID09PSB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodjFwYXJ0c1tpXSA+IHYycGFydHNbaV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHYxcGFydHMubGVuZ3RoICE9PSB2MnBhcnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSxcblxufTtcblxuLy8gTWFrZSBtYXJrZXRwbGFjZSBnbG9iYWxseSBhY2Nlc3NpYmxlXG53aW5kb3cubWFya2V0cGxhY2UgPSBtYXJrZXRwbGFjZTsiXX0=