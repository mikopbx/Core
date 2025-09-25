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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLW1hcmtldHBsYWNlLmpzIl0sIm5hbWVzIjpbIm1hcmtldHBsYWNlIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG1hcmtldHBsYWNlTG9hZGVyIiwiJG5vTmV3TW9kdWxlc1NlZ21lbnQiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCIkYnRuVXBkYXRlQWxsTW9kdWxlcyIsImlzSW5pdGlhbGl6ZWQiLCJpbml0aWFsaXplIiwiTW9kdWxlc0FQSSIsImdldEF2YWlsYWJsZSIsImNiUGFyc2VNb2R1bGVVcGRhdGVzIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwiYXV0b1dpZHRoIiwic0RvbSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJpbml0Q29tcGxldGUiLCJhcGkiLCJldmVyeSIsImNvbHVtbiIsImluZGV4IiwidGl0bGUiLCJoZWFkZXIiLCJ0ZXh0Q29udGVudCIsImlucHV0IiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwicGxhY2Vob2xkZXIiLCJyZXBsYWNlQ2hpbGRyZW4iLCJhZGRFdmVudExpc3RlbmVyIiwic2VhcmNoIiwidmFsdWUiLCJkcmF3IiwicmVzcG9uc2VEYXRhIiwiaXNTdWNjZXNzZnVsIiwiaGlkZSIsInNob3ciLCJtb2R1bGVzIiwiQXJyYXkiLCJpc0FycmF5IiwibGVuZ3RoIiwiZm9yRWFjaCIsIm9iaiIsIm1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCIsIm1pbl9wYnhfdmVyc2lvbiIsIm5ld01vZHVsZVZlcnNpb24iLCJ2ZXJzaW9uIiwiY3VycmVudFZlcnNpb25QQlgiLCJ2ZXJzaW9uQ29tcGFyZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImluc3RhbGxlZFZlciIsImZpbmQiLCJ0ZXh0IiwidHJpbSIsInZlcnNpb25Db21wYXJlUmVzdWx0IiwiYWRkVXBkYXRlQnV0dG9uVG9Sb3ciLCJjaGFuZ2VEb3dubG9hZEJ1dHRvbk9uUm93IiwiZm4iLCJpc0RhdGFUYWJsZSIsInByb21vTGluayIsInByb21vX2xpbmsiLCJ1bmRlZmluZWQiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfRXh0ZXJuYWxEZXNjcmlwdGlvbiIsImFkZGl0aW9uYWxJY29uIiwiY29tbWVyY2lhbCIsImR5bmFtaWNSb3ciLCJkZWNvZGVVUklDb21wb25lbnQiLCJuYW1lIiwiZGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJleHRfSW5zdGFsbE1vZHVsZSIsInNpemUiLCJyZWxlYXNlX2lkIiwiYXBwZW5kIiwiJHRhYmxlIiwidGFibGUiLCJkdFJvdyIsInJvdyIsImFueSIsIiRyb3dOb2RlIiwibm9kZSIsIiRsYXN0Q2VsbCIsImNsb25lIiwicmVtb3ZlIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwiY2VsbEluZGV4IiwiY2VsbCIsImRhdGEiLCJodG1sIiwic2V0VGltZW91dCIsInBvcHVwIiwiYWRkVXBkYXRlQnV0dG9uRGlyZWN0bHkiLCIkY3VycmVudERvd25sb2FkQnV0dG9uIiwiJGFjdGlvbkJ1dHRvbnMiLCJleHRfU2hvd01vZHVsZVJlcG9EZXRhaWxzIiwiY2xvc2VzdCIsImFkZENsYXNzIiwidjEiLCJ2MiIsIm9wdGlvbnMiLCJsZXhpY29ncmFwaGljYWwiLCJ6ZXJvRXh0ZW5kIiwidjFwYXJ0cyIsIlN0cmluZyIsInNwbGl0IiwidjJwYXJ0cyIsImlzVmFsaWRQYXJ0IiwieCIsInRlc3QiLCJOYU4iLCJwdXNoIiwibWFwIiwiTnVtYmVyIiwiaSIsIndpbmRvdyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QixFQUF1QztBQUNuQyxhQUFPLENBQUMsQ0FBUjtBQUNIOztBQUVELFdBQU8sQ0FBUDtBQUNIO0FBaFZlLENBQXBCLEMsQ0FvVkE7O0FBQ0ErRSxNQUFNLENBQUNqSSxXQUFQLEdBQXFCQSxXQUFyQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgZ2xvYmFsUEJYVmVyc2lvbiwgTW9kdWxlc0FQSSAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgbGlzdCBvZiBleHRlbnNpb24gbW9kdWxlcy5cbiAqIEBjbGFzcyBtYXJrZXRwbGFjZVxuICogQG1lbWJlcm9mIG1vZHVsZTpQYnhFeHRlbnNpb25Nb2R1bGVzXG4gKi9cbmNvbnN0IG1hcmtldHBsYWNlID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYmxlIHdpdGggYXZhaWxhYmxlIG1vZHVsZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFya2V0cGxhY2VUYWJsZTogJCgnI25ldy1tb2R1bGVzLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbG9hZGVyIGluc3RlYWQgb2YgYXZhaWxhYmxlIG1vZHVsZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFya2V0cGxhY2VMb2FkZXI6ICQoJyNuZXctbW9kdWxlcy1sb2FkZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBpbmZvcm1hdGlvbiB3aGVuIG5vIGFueSBtb2R1bGVzIGF2YWlsYWJsZSB0byBpbnN0YWxsLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG5vTmV3TW9kdWxlc1NlZ21lbnQ6ICQoJyNuby1uZXctbW9kdWxlcy1zZWdtZW50JyksXG5cbiAgICAvKipcbiAgICAgKiBTdG9yZSBjdXJyZW50IGluc3RhbGxlZCBhIFBCWCB2ZXJzaW9uIHdpdGhvdXQgYSBkaXYgcG9zdGZpeFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBidXR0b24gd2hpY2ggcmVzcG9uc2libGUgZm9yIHVwZGF0ZSBhbGwgaW5zdGFsbGVkIG1vZHVsZXNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRidG5VcGRhdGVBbGxNb2R1bGVzOiAkKCcjdXBkYXRlLWFsbC1tb2R1bGVzLWJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBpbml0aWFsaXplZCBmbGFnXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICBpc0luaXRpYWxpemVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uTW9kdWxlc1Nob3dBdmFpbGFibGUgY2xhc3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBpZiAobWFya2V0cGxhY2UuaXNJbml0aWFsaXplZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIG1hcmtldHBsYWNlLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBNb2R1bGVzQVBJLmdldEF2YWlsYWJsZShtYXJrZXRwbGFjZS5jYlBhcnNlTW9kdWxlVXBkYXRlcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGF0YSB0YWJsZXMgb24gdGFibGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogZmFsc2UsXG4gICAgICAgICAgICBzRG9tOiAnbHJ0aXAnLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGluaXRDb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBpKClcbiAgICAgICAgICAgICAgICAgICAgLmNvbHVtbnMoKVxuICAgICAgICAgICAgICAgICAgICAuZXZlcnkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbHVtbiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29sdW1uLmluZGV4KCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGl0bGUgPSBjb2x1bW4uaGVhZGVyKCkudGV4dENvbnRlbnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgaW5wdXQgZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQucGxhY2Vob2xkZXIgPSB0aXRsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW4uaGVhZGVyKCkucmVwbGFjZUNoaWxkcmVuKGlucHV0KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciB1c2VyIGlucHV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2x1bW4uc2VhcmNoKCkgIT09IHRoaXMudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbi5zZWFyY2goaW5wdXQudmFsdWUpLmRyYXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHByb2Nlc3MgdGhlIGxpc3Qgb2YgbW9kdWxlcyByZWNlaXZlZCBmcm9tIHRoZSB3ZWJzaXRlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIHRoZSBsaXN0IG9mIG1vZHVsZXMuXG4gICAgICovXG4gICAgY2JQYXJzZU1vZHVsZVVwZGF0ZXMocmVzcG9uc2VEYXRhLCBpc1N1Y2Nlc3NmdWwpIHtcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlTG9hZGVyLmhpZGUoKTtcblxuICAgICAgICAvLyBXaGVuIHN1Y2Nlc3MsIHJlc3BvbnNlRGF0YSBpcyByZXNwb25zZS5kYXRhIGZyb20gQVBJXG4gICAgICAgIC8vIFdoZW4gZmFpbHVyZSwgcmVzcG9uc2VEYXRhIGlzIHRoZSBmdWxsIHJlc3BvbnNlIG9iamVjdFxuICAgICAgICBpZiAoIWlzU3VjY2Vzc2Z1bCkge1xuICAgICAgICAgICAgbWFya2V0cGxhY2UuJG5vTmV3TW9kdWxlc1NlZ21lbnQuc2hvdygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW4gc3VjY2VzcyBjYXNlLCByZXNwb25zZURhdGEgaXMgcmVzcG9uc2UuZGF0YSB3aGljaCBzaG91bGQgY29udGFpbiBtb2R1bGVzXG4gICAgICAgIGNvbnN0IG1vZHVsZXMgPSByZXNwb25zZURhdGE/Lm1vZHVsZXMgfHwgW107XG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobW9kdWxlcykgJiYgbW9kdWxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBtb2R1bGVzLmZvckVhY2goKG9iaikgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoaXMgbW9kdWxlIGlzIGNvbXBhdGlibGUgd2l0aCB0aGUgUEJYIGJhc2VkIG9uIHZlcnNpb24gbnVtYmVyXG4gICAgICAgICAgICAgICAgY29uc3QgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYID0gb2JqLm1pbl9wYnhfdmVyc2lvbjtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdNb2R1bGVWZXJzaW9uID0gb2JqLnZlcnNpb247XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb25QQlggPSBtYXJrZXRwbGFjZS5wYnhWZXJzaW9uO1xuICAgICAgICAgICAgICAgIGlmIChtYXJrZXRwbGFjZS52ZXJzaW9uQ29tcGFyZShjdXJyZW50VmVyc2lvblBCWCwgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEFkZCBuZXcgbW9kdWxlIHJvd1xuICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgbW9kdWxlIGlzIGFscmVhZHkgaW5zdGFsbGVkIGFuZCBvZmZlciBhbiB1cGRhdGVcbiAgICAgICAgICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvd1tkYXRhLWlkPSR7b2JqLnVuaXFpZH1dYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnN0YWxsZWRWZXIgPSAkbW9kdWxlUm93LmZpbmQoJ3RkLnZlcnNpb24nKS50ZXh0KCkudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ZXJzaW9uQ29tcGFyZVJlc3VsdCA9IG1hcmtldHBsYWNlLnZlcnNpb25Db21wYXJlKG5ld01vZHVsZVZlcnNpb24sIGluc3RhbGxlZFZlcik7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2ZXJzaW9uQ29tcGFyZVJlc3VsdCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlLmFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmVyc2lvbkNvbXBhcmVSZXN1bHQgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlLmNoYW5nZURvd25sb2FkQnV0dG9uT25Sb3cob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCQoJ3RyLm5ldy1tb2R1bGUtcm93JykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbWFya2V0cGxhY2UuJG5vTmV3TW9kdWxlc1NlZ21lbnQuaGlkZSgpO1xuICAgICAgICAgICAgLy8gT25seSBpbml0aWFsaXplIGlmIERhdGFUYWJsZSBpcyBub3QgYWxyZWFkeSBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkLmZuLkRhdGFUYWJsZS5pc0RhdGFUYWJsZShtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZSkpIHtcbiAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIHRhYmxlIGlzIGFscmVhZHkgaW5pdGlhbGl6ZWQsIGp1c3QgcmVkcmF3IGl0XG4gICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuRGF0YVRhYmxlKCkuZHJhdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFya2V0cGxhY2UuJG5vTmV3TW9kdWxlc1NlZ21lbnQuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBkZXNjcmlwdGlvbiBmb3IgYW4gYXZhaWxhYmxlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBhZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopIHtcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuc2hvdygpO1xuICAgICAgICBsZXQgcHJvbW9MaW5rID0gJyc7XG4gICAgICAgIGlmIChvYmoucHJvbW9fbGluayAhPT0gdW5kZWZpbmVkICYmIG9iai5wcm9tb19saW5rICE9PSBudWxsKSB7XG4gICAgICAgICAgICBwcm9tb0xpbmsgPSBgPGJyPjxhIGhyZWY9XCIke29iai5wcm9tb19saW5rfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9FeHRlcm5hbERlc2NyaXB0aW9ufTwvYT5gO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGFkZGl0aW9uYWxJY29uID0gJzxpIGNsYXNzPVwicHV6emxlIHBpZWNlIGljb25cIj48L2k+JztcbiAgICAgICAgaWYgKG9iai5jb21tZXJjaWFsICE9PSAwKSB7XG4gICAgICAgICAgICBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInVpIGRvbmF0ZSBpY29uXCI+PC9pPic7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZHluYW1pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgZGF0YS1pZD1cIiR7b2JqLnVuaXFpZH1cIiBkYXRhLW5hbWU9XCIke2RlY29kZVVSSUNvbXBvbmVudChvYmoubmFtZSl9XCI+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJzaG93LWRldGFpbHMtb24tY2xpY2tcIj4ke2FkZGl0aW9uYWxJY29ufSAke2RlY29kZVVSSUNvbXBvbmVudChvYmoubmFtZSl9PGJyPlxuXHRcdFx0XHRcdFx0ICAgIDxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pfSAke3Byb21vTGlua308L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwic2hvdy1kZXRhaWxzLW9uLWNsaWNrXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRldmVsb3Blcil9PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkIHZlcnNpb24gc2hvdy1kZXRhaWxzLW9uLWNsaWNrXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwidWkgc21hbGwgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgaWNvbiBiYXNpYyBidXR0b24gZG93bmxvYWQgcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmVyc2lvbiA9XCIke29iai52ZXJzaW9ufVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1yZWxlYXNlaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG5cdFx0XHRcdFx0XHRcdFx0PC9kaXY+XG4gICAgXHRcdFx0XHQgICAgPC90ZD5cdFx0XG5cdFx0XHQ8L3RyPmA7XG4gICAgICAgICQoJyNuZXctbW9kdWxlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW5hbWljUm93KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhbiB1cGRhdGUgYnV0dG9uIHRvIHRoZSBtb2R1bGUgcm93IGZvciB1cGRhdGluZyBhbiBvbGQgdmVyc2lvbiBvZiBQQlguXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKSB7XG4gICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93W2RhdGEtaWQ9JHtvYmoudW5pcWlkfV1gKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHdlJ3JlIHdvcmtpbmcgd2l0aCBhIERhdGFUYWJsZVxuICAgICAgICBjb25zdCAkdGFibGUgPSAkKCcjaW5zdGFsbGVkLW1vZHVsZXMtdGFibGUnKTtcbiAgICAgICAgaWYgKCQuZm4uRGF0YVRhYmxlICYmICQuZm4uRGF0YVRhYmxlLmlzRGF0YVRhYmxlKCR0YWJsZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IHRhYmxlID0gJHRhYmxlLkRhdGFUYWJsZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2UgalF1ZXJ5IGVsZW1lbnQgdG8gZmluZCB0aGUgcm93IGluIERhdGFUYWJsZSBpbnN0ZWFkIG9mIGluZGV4XG4gICAgICAgICAgICBjb25zdCBkdFJvdyA9IHRhYmxlLnJvdygkbW9kdWxlUm93KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGR0Um93LmFueSgpKSB7XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSByb3cgbm9kZSB0byB3b3JrIHdpdGhcbiAgICAgICAgICAgICAgICBjb25zdCAkcm93Tm9kZSA9ICQoZHRSb3cubm9kZSgpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDbG9uZSB0aGUgcm93J3MgbGFzdCBjZWxsIChhY3Rpb24gYnV0dG9ucyBjZWxsKVxuICAgICAgICAgICAgICAgIGNvbnN0ICRsYXN0Q2VsbCA9ICRyb3dOb2RlLmZpbmQoJ3RkOmxhc3QnKS5jbG9uZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBkb3dubG9hZCBidXR0b24gaWYgZXhpc3RzXG4gICAgICAgICAgICAgICAgJGxhc3RDZWxsLmZpbmQoJ2EuZG93bmxvYWQnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdXBkYXRlIGJ1dHRvblxuICAgICAgICAgICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b24gPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIHVwZGF0ZSBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuICAgICAgICAgICAgICAgICAgICBkYXRhLXZlcnNpb24gPVwiJHtvYmoudmVyc2lvbn1cIlxuICAgICAgICAgICAgICAgICAgICBkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLXJlbGVhc2VpZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcbiAgICAgICAgICAgICAgICAgICAgPC9hPmA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUHJlcGVuZCBidXR0b24gdG8gYWN0aW9uLWJ1dHRvbnMgZGl2XG4gICAgICAgICAgICAgICAgJGxhc3RDZWxsLmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBjZWxsIGluIERhdGFUYWJsZSB1c2luZyB0aGUgcm93IEFQSVxuICAgICAgICAgICAgICAgIGNvbnN0IGNlbGxJbmRleCA9ICRyb3dOb2RlLmZpbmQoJ3RkJykubGVuZ3RoIC0gMTsgLy8gTGFzdCBjZWxsXG4gICAgICAgICAgICAgICAgdGFibGUuY2VsbChkdFJvdywgY2VsbEluZGV4KS5kYXRhKCRsYXN0Q2VsbC5odG1sKCkpLmRyYXcoZmFsc2UpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgcG9wdXBzXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XSAucG9wdXBlZGApLnBvcHVwKCk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgcm93IG5vdCBmb3VuZCBpbiBEYXRhVGFibGUsIHVzZSBkaXJlY3QgRE9NIG1hbmlwdWxhdGlvblxuICAgICAgICAgICAgICAgIHRoaXMuYWRkVXBkYXRlQnV0dG9uRGlyZWN0bHkoJG1vZHVsZVJvdywgb2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIGZvciBub24tRGF0YVRhYmxlIHNjZW5hcmlvXG4gICAgICAgICAgICB0aGlzLmFkZFVwZGF0ZUJ1dHRvbkRpcmVjdGx5KCRtb2R1bGVSb3csIG9iaik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIG1hcmtldHBsYWNlLiRidG5VcGRhdGVBbGxNb2R1bGVzLnNob3coKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZHMgdXBkYXRlIGJ1dHRvbiBkaXJlY3RseSB0byBET00gd2l0aG91dCBEYXRhVGFibGUgQVBJXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRtb2R1bGVSb3cgLSBUaGUgbW9kdWxlIHJvdyBqUXVlcnkgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uXG4gICAgICovXG4gICAgYWRkVXBkYXRlQnV0dG9uRGlyZWN0bHkoJG1vZHVsZVJvdywgb2JqKSB7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50RG93bmxvYWRCdXR0b24gPSAkbW9kdWxlUm93LmZpbmQoJ2EuZG93bmxvYWQnKTtcbiAgICAgICAgJGN1cnJlbnREb3dubG9hZEJ1dHRvbi5yZW1vdmUoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b24gPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIHVwZGF0ZSBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcbiAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGV9XCJcbiAgICAgICAgICAgIGRhdGEtdmVyc2lvbiA9XCIke29iai52ZXJzaW9ufVwiXG4gICAgICAgICAgICBkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcbiAgICAgICAgICAgIGRhdGEtdW5pcWlkID1cIiR7b2JqLnVuaXFpZH1cIiBcbiAgICAgICAgICAgIGRhdGEtcmVsZWFzZWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG4gICAgICAgICAgICA8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcbiAgICAgICAgICAgIDwvYT5gO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgJGFjdGlvbkJ1dHRvbnMgPSAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpO1xuICAgICAgICAkYWN0aW9uQnV0dG9ucy5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjaGFuZ2VEb3dubG9hZEJ1dHRvbk9uUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubmV3LW1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICBjb25zdCAkY3VycmVudERvd25sb2FkQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLmRvd25sb2FkJyk7XG4gICAgICAgICRjdXJyZW50RG93bmxvYWRCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b25cbiAgICAgICAgICAgID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcblx0XHRcdGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9TaG93TW9kdWxlUmVwb0RldGFpbHN9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gc2VhcmNoIGJsdWVcIj48L2k+IFxuXHRcdFx0PC9hPmA7XG4gICAgICAgICRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJylcbiAgICAgICAgICAgIC5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLmNsb3Nlc3QoJ3RkJykuYWRkQ2xhc3MoJ3Nob3ctZGV0YWlscy1vbi1jbGljaycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlIHZlcnNpb25zIG9mIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYxIC0gVGhlIGZpcnN0IHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdjIgLSBUaGUgc2Vjb25kIHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGV4aWNvZ3JhcGhpY2FsXSAtIFdoZXRoZXIgdG8gcGVyZm9ybSBsZXhpY29ncmFwaGljYWwgY29tcGFyaXNvbiAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuemVyb0V4dGVuZF0gLSBXZWF0aGVyIHRvIHplcm8tZXh0ZW5kIHRoZSBzaG9ydGVyIHZlcnNpb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSAtIEEgbnVtYmVyIGluZGljYXRpbmcgdGhlIGNvbXBhcmlzb24gcmVzdWx0OiAwIGlmIHZlcnNpb25zIGFyZSBlcXVhbCwgMSBpZiB2MSBpcyBncmVhdGVyLCAtMSBpZiB2MiBpcyBncmVhdGVyLCBvciBOYU4gaWYgdGhlIHZlcnNpb25zIGFyZSBpbnZhbGlkLlxuICAgICAqL1xuICAgIHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuICAgICAgICBjb25zdCB6ZXJvRXh0ZW5kID0gb3B0aW9ucyAmJiBvcHRpb25zLnplcm9FeHRlbmQ7XG4gICAgICAgIGxldCB2MXBhcnRzID0gU3RyaW5nKHYxKS5zcGxpdCgnLicpO1xuICAgICAgICBsZXQgdjJwYXJ0cyA9IFN0cmluZyh2Mikuc3BsaXQoJy4nKTtcblxuICAgICAgICBmdW5jdGlvbiBpc1ZhbGlkUGFydCh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXpdKiQvIDogL15cXGQrJC8pLnRlc3QoeCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXYxcGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpIHx8ICF2MnBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSkge1xuICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh6ZXJvRXh0ZW5kKSB7XG4gICAgICAgICAgICB3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgICAgICB3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuICAgICAgICAgICAgdjFwYXJ0cyA9IHYxcGFydHMubWFwKE51bWJlcik7XG4gICAgICAgICAgICB2MnBhcnRzID0gdjJwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdjFwYXJ0cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgaWYgKHYycGFydHMubGVuZ3RoID09PSBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYxcGFydHNbaV0gPiB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sXG5cbn07XG5cbi8vIE1ha2UgbWFya2V0cGxhY2UgZ2xvYmFsbHkgYWNjZXNzaWJsZVxud2luZG93Lm1hcmtldHBsYWNlID0gbWFya2V0cGxhY2U7Il19