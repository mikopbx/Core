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

/* global PbxApi, globalTranslate, globalPBXVersion */

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
    PbxApi.ModulesGetAvailable(marketplace.cbParseModuleUpdates);
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
    }
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

        table.cell(dtRow, cellIndex).data($lastCell.html()).draw(false); // Re-initialize popups

        setTimeout(function () {
          $("tr.module-row[data-id=".concat(obj.uniqid, "] .popuped")).popup();
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
    $actionButtons.prepend(dynamicButton);
    $moduleRow.find('.popuped').popup();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLW1hcmtldHBsYWNlLmpzIl0sIm5hbWVzIjpbIm1hcmtldHBsYWNlIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG1hcmtldHBsYWNlTG9hZGVyIiwiJG5vTmV3TW9kdWxlc1NlZ21lbnQiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCIkYnRuVXBkYXRlQWxsTW9kdWxlcyIsImlzSW5pdGlhbGl6ZWQiLCJpbml0aWFsaXplIiwiUGJ4QXBpIiwiTW9kdWxlc0dldEF2YWlsYWJsZSIsImNiUGFyc2VNb2R1bGVVcGRhdGVzIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwiYXV0b1dpZHRoIiwic0RvbSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJpbml0Q29tcGxldGUiLCJhcGkiLCJldmVyeSIsImNvbHVtbiIsImluZGV4IiwidGl0bGUiLCJoZWFkZXIiLCJ0ZXh0Q29udGVudCIsImlucHV0IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwicGxhY2Vob2xkZXIiLCJyZXBsYWNlQ2hpbGRyZW4iLCJhZGRFdmVudExpc3RlbmVyIiwic2VhcmNoIiwidmFsdWUiLCJkcmF3IiwicmVzcG9uc2VEYXRhIiwiaXNTdWNjZXNzZnVsIiwiaGlkZSIsInNob3ciLCJtb2R1bGVzIiwiQXJyYXkiLCJpc0FycmF5IiwibGVuZ3RoIiwiZm9yRWFjaCIsIm9iaiIsIm1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCIsIm1pbl9wYnhfdmVyc2lvbiIsIm5ld01vZHVsZVZlcnNpb24iLCJ2ZXJzaW9uIiwiY3VycmVudFZlcnNpb25QQlgiLCJ2ZXJzaW9uQ29tcGFyZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImluc3RhbGxlZFZlciIsImZpbmQiLCJ0ZXh0IiwidHJpbSIsInZlcnNpb25Db21wYXJlUmVzdWx0IiwiYWRkVXBkYXRlQnV0dG9uVG9Sb3ciLCJjaGFuZ2VEb3dubG9hZEJ1dHRvbk9uUm93IiwiZm4iLCJpc0RhdGFUYWJsZSIsInByb21vTGluayIsInByb21vX2xpbmsiLCJ1bmRlZmluZWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfRXh0ZXJuYWxEZXNjcmlwdGlvbiIsImFkZGl0aW9uYWxJY29uIiwiY29tbWVyY2lhbCIsImR5bmFtaWNSb3ciLCJkZWNvZGVVUklDb21wb25lbnQiLCJuYW1lIiwiZGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJleHRfSW5zdGFsbE1vZHVsZSIsInNpemUiLCJyZWxlYXNlX2lkIiwiYXBwZW5kIiwiJHRhYmxlIiwidGFibGUiLCJkdFJvdyIsInJvdyIsImFueSIsIiRyb3dOb2RlIiwibm9kZSIsIiRsYXN0Q2VsbCIsImNsb25lIiwicmVtb3ZlIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwiY2VsbEluZGV4IiwiY2VsbCIsImRhdGEiLCJodG1sIiwic2V0VGltZW91dCIsInBvcHVwIiwiYWRkVXBkYXRlQnV0dG9uRGlyZWN0bHkiLCIkY3VycmVudERvd25sb2FkQnV0dG9uIiwiJGFjdGlvbkJ1dHRvbnMiLCJleHRfU2hvd01vZHVsZVJlcG9EZXRhaWxzIiwiY2xvc2VzdCIsImFkZENsYXNzIiwidjEiLCJ2MiIsIm9wdGlvbnMiLCJsZXhpY29ncmFwaGljYWwiLCJ6ZXJvRXh0ZW5kIiwidjFwYXJ0cyIsIlN0cmluZyIsInNwbGl0IiwidjJwYXJ0cyIsImlzVmFsaWRQYXJ0IiwieCIsInRlc3QiLCJOYU4iLCJwdXNoIiwibWFwIiwiTnVtYmVyIiwiaSIsIndpbmRvdyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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TUFBL0IsRUFBdUM7QUFDbkMsYUFBTyxDQUFDLENBQVI7QUFDSDs7QUFFRCxXQUFPLENBQVA7QUFDSDtBQWhWZSxDQUFwQixDLENBb1ZBOztBQUNBK0UsTUFBTSxDQUFDakksV0FBUCxHQUFxQkEsV0FBckIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFBCWFZlcnNpb24gKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIGxpc3Qgb2YgZXh0ZW5zaW9uIG1vZHVsZXMuXG4gKiBAY2xhc3MgbWFya2V0cGxhY2VcbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBtYXJrZXRwbGFjZSA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJsZSB3aXRoIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlVGFibGU6ICQoJyNuZXctbW9kdWxlcy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvYWRlciBpbnN0ZWFkIG9mIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlTG9hZGVyOiAkKCcjbmV3LW1vZHVsZXMtbG9hZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaW5mb3JtYXRpb24gd2hlbiBubyBhbnkgbW9kdWxlcyBhdmFpbGFibGUgdG8gaW5zdGFsbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub05ld01vZHVsZXNTZWdtZW50OiAkKCcjbm8tbmV3LW1vZHVsZXMtc2VnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogU3RvcmUgY3VycmVudCBpbnN0YWxsZWQgYSBQQlggdmVyc2lvbiB3aXRob3V0IGEgZGl2IHBvc3RmaXhcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYnV0dG9uIHdoaWNoIHJlc3BvbnNpYmxlIGZvciB1cGRhdGUgYWxsIGluc3RhbGxlZCBtb2R1bGVzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYnRuVXBkYXRlQWxsTW9kdWxlczogJCgnI3VwZGF0ZS1hbGwtbW9kdWxlcy1idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgaW5pdGlhbGl6ZWQgZmxhZ1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbk1vZHVsZXNTaG93QXZhaWxhYmxlIGNsYXNzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKG1hcmtldHBsYWNlLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtYXJrZXRwbGFjZS5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbiAgICAgICAgUGJ4QXBpLk1vZHVsZXNHZXRBdmFpbGFibGUobWFya2V0cGxhY2UuY2JQYXJzZU1vZHVsZVVwZGF0ZXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRhdGEgdGFibGVzIG9uIHRhYmxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBhdXRvV2lkdGg6IGZhbHNlLFxuICAgICAgICAgICAgc0RvbTogJ2xydGlwJyxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBpbml0Q29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaSgpXG4gICAgICAgICAgICAgICAgICAgIC5jb2x1bW5zKClcbiAgICAgICAgICAgICAgICAgICAgLmV2ZXJ5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb2x1bW4gPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbHVtbi5pbmRleCgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRpdGxlID0gY29sdW1uLmhlYWRlcigpLnRleHRDb250ZW50O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGlucHV0IGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnBsYWNlaG9sZGVyID0gdGl0bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uLmhlYWRlcigpLnJlcGxhY2VDaGlsZHJlbihpbnB1dCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgdXNlciBpbnB1dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29sdW1uLnNlYXJjaCgpICE9PSB0aGlzLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW4uc2VhcmNoKGlucHV0LnZhbHVlKS5kcmF3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHRoZSBsaXN0IG9mIG1vZHVsZXMgcmVjZWl2ZWQgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGlzdCBvZiBtb2R1bGVzLlxuICAgICAqL1xuICAgIGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlRGF0YSwgaXNTdWNjZXNzZnVsKSB7XG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZUxvYWRlci5oaWRlKCk7XG5cbiAgICAgICAgLy8gV2hlbiBzdWNjZXNzLCByZXNwb25zZURhdGEgaXMgcmVzcG9uc2UuZGF0YSBmcm9tIEFQSVxuICAgICAgICAvLyBXaGVuIGZhaWx1cmUsIHJlc3BvbnNlRGF0YSBpcyB0aGUgZnVsbCByZXNwb25zZSBvYmplY3RcbiAgICAgICAgaWYgKCFpc1N1Y2Nlc3NmdWwpIHtcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLiRub05ld01vZHVsZXNTZWdtZW50LnNob3coKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluIHN1Y2Nlc3MgY2FzZSwgcmVzcG9uc2VEYXRhIGlzIHJlc3BvbnNlLmRhdGEgd2hpY2ggc2hvdWxkIGNvbnRhaW4gbW9kdWxlc1xuICAgICAgICBjb25zdCBtb2R1bGVzID0gcmVzcG9uc2VEYXRhPy5tb2R1bGVzIHx8IFtdO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG1vZHVsZXMpICYmIG1vZHVsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIG1vZHVsZSBpcyBjb21wYXRpYmxlIHdpdGggdGhlIFBCWCBiYXNlZCBvbiB2ZXJzaW9uIG51bWJlclxuICAgICAgICAgICAgICAgIGNvbnN0IG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCA9IG9iai5taW5fcGJ4X3ZlcnNpb247XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3TW9kdWxlVmVyc2lvbiA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWZXJzaW9uUEJYID0gbWFya2V0cGxhY2UucGJ4VmVyc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAobWFya2V0cGxhY2UudmVyc2lvbkNvbXBhcmUoY3VycmVudFZlcnNpb25QQlgsIG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgbmV3IG1vZHVsZSByb3dcbiAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vZHVsZSBpcyBhbHJlYWR5IGluc3RhbGxlZCBhbmQgb2ZmZXIgYW4gdXBkYXRlXG4gICAgICAgICAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICAgICAgICAgIGlmICgkbW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5zdGFsbGVkVmVyID0gJG1vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVyc2lvbkNvbXBhcmVSZXN1bHQgPSBtYXJrZXRwbGFjZS52ZXJzaW9uQ29tcGFyZShuZXdNb2R1bGVWZXJzaW9uLCBpbnN0YWxsZWRWZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmVyc2lvbkNvbXBhcmVSZXN1bHQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5hZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZlcnNpb25Db21wYXJlUmVzdWx0ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5jaGFuZ2VEb3dubG9hZEJ1dHRvbk9uUm93KG9iaik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgkKCd0ci5uZXctbW9kdWxlLXJvdycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLiRub05ld01vZHVsZXNTZWdtZW50LmhpZGUoKTtcbiAgICAgICAgICAgIC8vIE9ubHkgaW5pdGlhbGl6ZSBpZiBEYXRhVGFibGUgaXMgbm90IGFscmVhZHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIGlmICghJC5mbi5EYXRhVGFibGUuaXNEYXRhVGFibGUobWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUpKSB7XG4gICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0YWJsZSBpcyBhbHJlYWR5IGluaXRpYWxpemVkLCBqdXN0IHJlZHJhdyBpdFxuICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlLkRhdGFUYWJsZSgpLmRyYXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLiRub05ld01vZHVsZXNTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgZGVzY3JpcHRpb24gZm9yIGFuIGF2YWlsYWJsZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKSB7XG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlLnNob3coKTtcbiAgICAgICAgbGV0IHByb21vTGluayA9ICcnO1xuICAgICAgICBpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInB1enpsZSBwaWVjZSBpY29uXCI+PC9pPic7XG4gICAgICAgIGlmIChvYmouY29tbWVyY2lhbCAhPT0gMCkge1xuICAgICAgICAgICAgYWRkaXRpb25hbEljb24gPSAnPGkgY2xhc3M9XCJ1aSBkb25hdGUgaWNvblwiPjwvaT4nO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGR5bmFtaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGRhdGEtaWQ9XCIke29iai51bmlxaWR9XCIgZGF0YS1uYW1lPVwiJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfVwiPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwic2hvdy1kZXRhaWxzLW9uLWNsaWNrXCI+JHthZGRpdGlvbmFsSWNvbn0gJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdCAgICA8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uIHNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGljb24gYmFzaWMgYnV0dG9uIGRvd25sb2FkIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdW5pcWlkID0gXCIke29iai51bmlxaWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZlcnNpb24gPVwiJHtvYmoudmVyc2lvbn1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcmVsZWFzZWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuXHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxuICAgIFx0XHRcdFx0ICAgIDwvdGQ+XHRcdFxuXHRcdFx0PC90cj5gO1xuICAgICAgICAkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHluYW1pY1Jvdyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gdXBkYXRlIGJ1dHRvbiB0byB0aGUgbW9kdWxlIHJvdyBmb3IgdXBkYXRpbmcgYW4gb2xkIHZlcnNpb24gb2YgUEJYLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvd1tkYXRhLWlkPSR7b2JqLnVuaXFpZH1dYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB3ZSdyZSB3b3JraW5nIHdpdGggYSBEYXRhVGFibGVcbiAgICAgICAgY29uc3QgJHRhYmxlID0gJCgnI2luc3RhbGxlZC1tb2R1bGVzLXRhYmxlJyk7XG4gICAgICAgIGlmICgkLmZuLkRhdGFUYWJsZSAmJiAkLmZuLkRhdGFUYWJsZS5pc0RhdGFUYWJsZSgkdGFibGUpKSB7XG4gICAgICAgICAgICBjb25zdCB0YWJsZSA9ICR0YWJsZS5EYXRhVGFibGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIGpRdWVyeSBlbGVtZW50IHRvIGZpbmQgdGhlIHJvdyBpbiBEYXRhVGFibGUgaW5zdGVhZCBvZiBpbmRleFxuICAgICAgICAgICAgY29uc3QgZHRSb3cgPSB0YWJsZS5yb3coJG1vZHVsZVJvdyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChkdFJvdy5hbnkoKSkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgcm93IG5vZGUgdG8gd29yayB3aXRoXG4gICAgICAgICAgICAgICAgY29uc3QgJHJvd05vZGUgPSAkKGR0Um93Lm5vZGUoKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2xvbmUgdGhlIHJvdydzIGxhc3QgY2VsbCAoYWN0aW9uIGJ1dHRvbnMgY2VsbClcbiAgICAgICAgICAgICAgICBjb25zdCAkbGFzdENlbGwgPSAkcm93Tm9kZS5maW5kKCd0ZDpsYXN0JykuY2xvbmUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZG93bmxvYWQgYnV0dG9uIGlmIGV4aXN0c1xuICAgICAgICAgICAgICAgICRsYXN0Q2VsbC5maW5kKCdhLmRvd25sb2FkJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHVwZGF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGV9XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS12ZXJzaW9uID1cIiR7b2JqLnZlcnNpb259XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtdW5pcWlkID1cIiR7b2JqLnVuaXFpZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1yZWxlYXNlaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG4gICAgICAgICAgICAgICAgICAgIDwvYT5gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFByZXBlbmQgYnV0dG9uIHRvIGFjdGlvbi1idXR0b25zIGRpdlxuICAgICAgICAgICAgICAgICRsYXN0Q2VsbC5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY2VsbCBpbiBEYXRhVGFibGUgdXNpbmcgdGhlIHJvdyBBUElcbiAgICAgICAgICAgICAgICBjb25zdCBjZWxsSW5kZXggPSAkcm93Tm9kZS5maW5kKCd0ZCcpLmxlbmd0aCAtIDE7IC8vIExhc3QgY2VsbFxuICAgICAgICAgICAgICAgIHRhYmxlLmNlbGwoZHRSb3csIGNlbGxJbmRleCkuZGF0YSgkbGFzdENlbGwuaHRtbCgpKS5kcmF3KGZhbHNlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIHBvcHVwc1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkKGB0ci5tb2R1bGUtcm93W2RhdGEtaWQ9JHtvYmoudW5pcWlkfV0gLnBvcHVwZWRgKS5wb3B1cCgpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIHJvdyBub3QgZm91bmQgaW4gRGF0YVRhYmxlLCB1c2UgZGlyZWN0IERPTSBtYW5pcHVsYXRpb25cbiAgICAgICAgICAgICAgICB0aGlzLmFkZFVwZGF0ZUJ1dHRvbkRpcmVjdGx5KCRtb2R1bGVSb3csIG9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayBmb3Igbm9uLURhdGFUYWJsZSBzY2VuYXJpb1xuICAgICAgICAgICAgdGhpcy5hZGRVcGRhdGVCdXR0b25EaXJlY3RseSgkbW9kdWxlUm93LCBvYmopO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBtYXJrZXRwbGFjZS4kYnRuVXBkYXRlQWxsTW9kdWxlcy5zaG93KCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGRzIHVwZGF0ZSBidXR0b24gZGlyZWN0bHkgdG8gRE9NIHdpdGhvdXQgRGF0YVRhYmxlIEFQSVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkbW9kdWxlUm93IC0gVGhlIG1vZHVsZSByb3cgalF1ZXJ5IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvbkRpcmVjdGx5KCRtb2R1bGVSb3csIG9iaikge1xuICAgICAgICBjb25zdCAkY3VycmVudERvd25sb2FkQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLmRvd25sb2FkJyk7XG4gICAgICAgICRjdXJyZW50RG93bmxvYWRCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG4gICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlfVwiXG4gICAgICAgICAgICBkYXRhLXZlcnNpb24gPVwiJHtvYmoudmVyc2lvbn1cIlxuICAgICAgICAgICAgZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG4gICAgICAgICAgICBkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG4gICAgICAgICAgICBkYXRhLXJlbGVhc2VpZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG4gICAgICAgICAgICA8L2E+YDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRhY3Rpb25CdXR0b25zID0gJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKTtcbiAgICAgICAgJGFjdGlvbkJ1dHRvbnMucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcbiAgICAgICAgJG1vZHVsZVJvdy5maW5kKCcucG9wdXBlZCcpLnBvcHVwKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgY2hhbmdlRG93bmxvYWRCdXR0b25PblJvdyhvYmopIHtcbiAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm5ldy1tb2R1bGUtcm93W2RhdGEtaWQ9JHtvYmoudW5pcWlkfV1gKTtcbiAgICAgICAgY29uc3QgJGN1cnJlbnREb3dubG9hZEJ1dHRvbiA9ICRtb2R1bGVSb3cuZmluZCgnYS5kb3dubG9hZCcpO1xuICAgICAgICAkY3VycmVudERvd25sb2FkQnV0dG9uLnJlbW92ZSgpO1xuICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uXG4gICAgICAgICAgICA9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG5cdFx0XHRkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfU2hvd01vZHVsZVJlcG9EZXRhaWxzfVwiPlxuXHRcdFx0PGkgY2xhc3M9XCJpY29uIHNlYXJjaCBibHVlXCI+PC9pPiBcblx0XHRcdDwvYT5gO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpXG4gICAgICAgICAgICAucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcbiAgICAgICAgJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5jbG9zZXN0KCd0ZCcpLmFkZENsYXNzKCdzaG93LWRldGFpbHMtb24tY2xpY2snKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZSB2ZXJzaW9ucyBvZiBtb2R1bGVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2MSAtIFRoZSBmaXJzdCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYyIC0gVGhlIHNlY29uZCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxleGljb2dyYXBoaWNhbF0gLSBXaGV0aGVyIHRvIHBlcmZvcm0gbGV4aWNvZ3JhcGhpY2FsIGNvbXBhcmlzb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnplcm9FeHRlbmRdIC0gV2VhdGhlciB0byB6ZXJvLWV4dGVuZCB0aGUgc2hvcnRlciB2ZXJzaW9uIChkZWZhdWx0OiBmYWxzZSkuXG4gICAgICogQHJldHVybnMge251bWJlcn0gLSBBIG51bWJlciBpbmRpY2F0aW5nIHRoZSBjb21wYXJpc29uIHJlc3VsdDogMCBpZiB2ZXJzaW9ucyBhcmUgZXF1YWwsIDEgaWYgdjEgaXMgZ3JlYXRlciwgLTEgaWYgdjIgaXMgZ3JlYXRlciwgb3IgTmFOIGlmIHRoZSB2ZXJzaW9ucyBhcmUgaW52YWxpZC5cbiAgICAgKi9cbiAgICB2ZXJzaW9uQ29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgbGV4aWNvZ3JhcGhpY2FsID0gb3B0aW9ucyAmJiBvcHRpb25zLmxleGljb2dyYXBoaWNhbDtcbiAgICAgICAgY29uc3QgemVyb0V4dGVuZCA9IG9wdGlvbnMgJiYgb3B0aW9ucy56ZXJvRXh0ZW5kO1xuICAgICAgICBsZXQgdjFwYXJ0cyA9IFN0cmluZyh2MSkuc3BsaXQoJy4nKTtcbiAgICAgICAgbGV0IHYycGFydHMgPSBTdHJpbmcodjIpLnNwbGl0KCcuJyk7XG5cbiAgICAgICAgZnVuY3Rpb24gaXNWYWxpZFBhcnQoeCkge1xuICAgICAgICAgICAgcmV0dXJuIChsZXhpY29ncmFwaGljYWwgPyAvXlxcZCtbQS1aYS16XSokLyA6IC9eXFxkKyQvKS50ZXN0KHgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF2MXBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSB8fCAhdjJwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkpIHtcbiAgICAgICAgICAgIHJldHVybiBOYU47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoemVyb0V4dGVuZCkge1xuICAgICAgICAgICAgd2hpbGUgKHYxcGFydHMubGVuZ3RoIDwgdjJwYXJ0cy5sZW5ndGgpIHYxcGFydHMucHVzaCgnMCcpO1xuICAgICAgICAgICAgd2hpbGUgKHYycGFydHMubGVuZ3RoIDwgdjFwYXJ0cy5sZW5ndGgpIHYycGFydHMucHVzaCgnMCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFsZXhpY29ncmFwaGljYWwpIHtcbiAgICAgICAgICAgIHYxcGFydHMgPSB2MXBhcnRzLm1hcChOdW1iZXIpO1xuICAgICAgICAgICAgdjJwYXJ0cyA9IHYycGFydHMubWFwKE51bWJlcik7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHYxcGFydHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGlmICh2MnBhcnRzLmxlbmd0aCA9PT0gaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHYxcGFydHNbaV0gPT09IHYycGFydHNbaV0pIHtcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2MXBhcnRzW2ldID4gdjJwYXJ0c1tpXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodjFwYXJ0cy5sZW5ndGggIT09IHYycGFydHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LFxuXG59O1xuXG4vLyBNYWtlIG1hcmtldHBsYWNlIGdsb2JhbGx5IGFjY2Vzc2libGVcbndpbmRvdy5tYXJrZXRwbGFjZSA9IG1hcmtldHBsYWNlOyJdfQ==