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
   * Reset the table by destroying DataTable instance and clearing content
   */
  resetTable: function resetTable() {
    // Destroy DataTable if it exists
    if ($.fn.DataTable.isDataTable(marketplace.$marketplaceTable)) {
      marketplace.$marketplaceTable.DataTable().destroy();
    } // Clear table content


    marketplace.$marketplaceTable.find('tbody').empty(); // Hide table and show loader

    marketplace.$marketplaceTable.hide();
    marketplace.$marketplaceLoader.show();
    marketplace.$btnUpdateAllModules.hide();
    marketplace.$noNewModulesSegment.hide();
  },

  /**
   * Initialize extensionModulesShowAvailable class
   */
  initialize: function initialize() {
    // Reset table before fetching new data
    marketplace.resetTable();
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
  cbParseModuleUpdates: function cbParseModuleUpdates(response) {
    marketplace.$marketplaceLoader.hide();

    if (response && Array.isArray(response.modules)) {
      response.modules.forEach(function (obj) {
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
          var installedVer = $moduleRow.find('td.version').text();
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
    var $moduleRow = $("tr[data-id=".concat(obj.uniqid, "]"));
    var $currentDownloadButton = $moduleRow.find('a.download');
    $currentDownloadButton.remove();
    var dynamicButton = "<a href=\"#\" class=\"ui basic icon button update popuped disable-if-no-internet\" \n\t\t\tdata-content=\"".concat(globalTranslate.ext_UpdateModule, "\"\n\t\t\tdata-version =\"").concat(obj.version, "\"\n\t\t\tdata-size = \"").concat(obj.size, "\"\n\t\t\tdata-uniqid =\"").concat(obj.uniqid, "\" \n\t\t\tdata-releaseid =\"").concat(obj.release_id, "\">\n\t\t\t<i class=\"icon redo blue\"></i> \n\t\t\t</a>");
    $moduleRow.find('.action-buttons').prepend(dynamicButton);
    marketplace.$btnUpdateAllModules.show();
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
}; // When the document is ready, initialize the external modules table and fetch a list of available modules from the repo

$(document).ready(function () {
  marketplace.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLW1hcmtldHBsYWNlLmpzIl0sIm5hbWVzIjpbIm1hcmtldHBsYWNlIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG1hcmtldHBsYWNlTG9hZGVyIiwiJG5vTmV3TW9kdWxlc1NlZ21lbnQiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCIkYnRuVXBkYXRlQWxsTW9kdWxlcyIsInJlc2V0VGFibGUiLCJmbiIsIkRhdGFUYWJsZSIsImlzRGF0YVRhYmxlIiwiZGVzdHJveSIsImZpbmQiLCJlbXB0eSIsImhpZGUiLCJzaG93IiwiaW5pdGlhbGl6ZSIsIlBieEFwaSIsIk1vZHVsZXNHZXRBdmFpbGFibGUiLCJjYlBhcnNlTW9kdWxlVXBkYXRlcyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsInNEb20iLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiaW5pdENvbXBsZXRlIiwiYXBpIiwiZXZlcnkiLCJjb2x1bW4iLCJpbmRleCIsInRpdGxlIiwiaGVhZGVyIiwidGV4dENvbnRlbnQiLCJpbnB1dCIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInBsYWNlaG9sZGVyIiwicmVwbGFjZUNoaWxkcmVuIiwiYWRkRXZlbnRMaXN0ZW5lciIsInNlYXJjaCIsInZhbHVlIiwiZHJhdyIsInJlc3BvbnNlIiwiQXJyYXkiLCJpc0FycmF5IiwibW9kdWxlcyIsImZvckVhY2giLCJvYmoiLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJuZXdNb2R1bGVWZXJzaW9uIiwidmVyc2lvbiIsImN1cnJlbnRWZXJzaW9uUEJYIiwidmVyc2lvbkNvbXBhcmUiLCJhZGRNb2R1bGVEZXNjcmlwdGlvbiIsIiRtb2R1bGVSb3ciLCJ1bmlxaWQiLCJsZW5ndGgiLCJpbnN0YWxsZWRWZXIiLCJ0ZXh0IiwidmVyc2lvbkNvbXBhcmVSZXN1bHQiLCJhZGRVcGRhdGVCdXR0b25Ub1JvdyIsImNoYW5nZURvd25sb2FkQnV0dG9uT25Sb3ciLCJwcm9tb0xpbmsiLCJwcm9tb19saW5rIiwidW5kZWZpbmVkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJhZGRpdGlvbmFsSWNvbiIsImNvbW1lcmNpYWwiLCJkeW5hbWljUm93IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibmFtZSIsImRlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwiZXh0X0luc3RhbGxNb2R1bGUiLCJzaXplIiwicmVsZWFzZV9pZCIsImFwcGVuZCIsIiRjdXJyZW50RG93bmxvYWRCdXR0b24iLCJyZW1vdmUiLCJkeW5hbWljQnV0dG9uIiwiZXh0X1VwZGF0ZU1vZHVsZSIsInByZXBlbmQiLCJleHRfU2hvd01vZHVsZVJlcG9EZXRhaWxzIiwiY2xvc2VzdCIsImFkZENsYXNzIiwidjEiLCJ2MiIsIm9wdGlvbnMiLCJsZXhpY29ncmFwaGljYWwiLCJ6ZXJvRXh0ZW5kIiwidjFwYXJ0cyIsIlN0cmluZyIsInNwbGl0IiwidjJwYXJ0cyIsImlzVmFsaWRQYXJ0IiwieCIsInRlc3QiLCJOYU4iLCJwdXNoIiwibWFwIiwiTnVtYmVyIiwiaSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFdBQVcsR0FBRztBQUVoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRUMsQ0FBQyxDQUFDLG9CQUFELENBTko7O0FBUWhCO0FBQ0o7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QW1COEMsQ0FBdkIsRUFBMEI7QUFDdEIsZUFBTyxDQUFQO0FBQ0g7O0FBQ0QsVUFBSVgsT0FBTyxDQUFDVyxDQUFELENBQVAsS0FBZVIsT0FBTyxDQUFDUSxDQUFELENBQTFCLEVBQStCLENBQzNCO0FBQ0gsT0FGRCxNQUVPLElBQUlYLE9BQU8sQ0FBQ1csQ0FBRCxDQUFQLEdBQWFSLE9BQU8sQ0FBQ1EsQ0FBRCxDQUF4QixFQUE2QjtBQUNoQyxlQUFPLENBQVA7QUFDSCxPQUZNLE1BRUE7QUFDSCxlQUFPLENBQUMsQ0FBUjtBQUNIO0FBQ0o7O0FBRUQsUUFBSVgsT0FBTyxDQUFDbkMsTUFBUixLQUFtQnNDLE9BQU8sQ0FBQ3RDLE1BQS9CLEVBQXVDO0FBQ25DLGFBQU8sQ0FBQyxDQUFSO0FBQ0g7O0FBRUQsV0FBTyxDQUFQO0FBQ0g7QUFuUmUsQ0FBcEIsQyxDQXVSQTs7QUFDQS9ELENBQUMsQ0FBQ3dDLFFBQUQsQ0FBRCxDQUFZc0UsS0FBWixDQUFrQixZQUFNO0FBQ3BCaEgsRUFBQUEsV0FBVyxDQUFDa0IsVUFBWjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFBCWFZlcnNpb24gKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIGxpc3Qgb2YgZXh0ZW5zaW9uIG1vZHVsZXMuXG4gKiBAY2xhc3MgbWFya2V0cGxhY2VcbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBtYXJrZXRwbGFjZSA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJsZSB3aXRoIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlVGFibGU6ICQoJyNuZXctbW9kdWxlcy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvYWRlciBpbnN0ZWFkIG9mIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlTG9hZGVyOiAkKCcjbmV3LW1vZHVsZXMtbG9hZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaW5mb3JtYXRpb24gd2hlbiBubyBhbnkgbW9kdWxlcyBhdmFpbGFibGUgdG8gaW5zdGFsbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub05ld01vZHVsZXNTZWdtZW50OiAkKCcjbm8tbmV3LW1vZHVsZXMtc2VnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogU3RvcmUgY3VycmVudCBpbnN0YWxsZWQgYSBQQlggdmVyc2lvbiB3aXRob3V0IGEgZGl2IHBvc3RmaXhcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYnV0dG9uIHdoaWNoIHJlc3BvbnNpYmxlIGZvciB1cGRhdGUgYWxsIGluc3RhbGxlZCBtb2R1bGVzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYnRuVXBkYXRlQWxsTW9kdWxlczogJCgnI3VwZGF0ZS1hbGwtbW9kdWxlcy1idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IHRoZSB0YWJsZSBieSBkZXN0cm95aW5nIERhdGFUYWJsZSBpbnN0YW5jZSBhbmQgY2xlYXJpbmcgY29udGVudFxuICAgICAqL1xuICAgIHJlc2V0VGFibGUoKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgRGF0YVRhYmxlIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoJC5mbi5EYXRhVGFibGUuaXNEYXRhVGFibGUobWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUpKSB7XG4gICAgICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZS5EYXRhVGFibGUoKS5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2xlYXIgdGFibGUgY29udGVudFxuICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZS5maW5kKCd0Ym9keScpLmVtcHR5KCk7XG4gICAgICAgIC8vIEhpZGUgdGFibGUgYW5kIHNob3cgbG9hZGVyXG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlLmhpZGUoKTtcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlTG9hZGVyLnNob3coKTtcbiAgICAgICAgbWFya2V0cGxhY2UuJGJ0blVwZGF0ZUFsbE1vZHVsZXMuaGlkZSgpO1xuICAgICAgICBtYXJrZXRwbGFjZS4kbm9OZXdNb2R1bGVzU2VnbWVudC5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZXh0ZW5zaW9uTW9kdWxlc1Nob3dBdmFpbGFibGUgY2xhc3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBSZXNldCB0YWJsZSBiZWZvcmUgZmV0Y2hpbmcgbmV3IGRhdGFcbiAgICAgICAgbWFya2V0cGxhY2UucmVzZXRUYWJsZSgpO1xuICAgICAgICBQYnhBcGkuTW9kdWxlc0dldEF2YWlsYWJsZShtYXJrZXRwbGFjZS5jYlBhcnNlTW9kdWxlVXBkYXRlcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGF0YSB0YWJsZXMgb24gdGFibGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogZmFsc2UsXG4gICAgICAgICAgICBzRG9tOiAnbHJ0aXAnLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGluaXRDb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBpKClcbiAgICAgICAgICAgICAgICAgICAgLmNvbHVtbnMoKVxuICAgICAgICAgICAgICAgICAgICAuZXZlcnkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbHVtbiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29sdW1uLmluZGV4KCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGl0bGUgPSBjb2x1bW4uaGVhZGVyKCkudGV4dENvbnRlbnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgaW5wdXQgZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQucGxhY2Vob2xkZXIgPSB0aXRsZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW4uaGVhZGVyKCkucmVwbGFjZUNoaWxkcmVuKGlucHV0KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciB1c2VyIGlucHV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2x1bW4uc2VhcmNoKCkgIT09IHRoaXMudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbi5zZWFyY2goaW5wdXQudmFsdWUpLmRyYXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIHByb2Nlc3MgdGhlIGxpc3Qgb2YgbW9kdWxlcyByZWNlaXZlZCBmcm9tIHRoZSB3ZWJzaXRlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIHRoZSBsaXN0IG9mIG1vZHVsZXMuXG4gICAgICovXG4gICAgY2JQYXJzZU1vZHVsZVVwZGF0ZXMocmVzcG9uc2UpIHtcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlTG9hZGVyLmhpZGUoKTtcblxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgQXJyYXkuaXNBcnJheShyZXNwb25zZS5tb2R1bGVzKSkge1xuICAgICAgICAgICAgcmVzcG9uc2UubW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIG1vZHVsZSBpcyBjb21wYXRpYmxlIHdpdGggdGhlIFBCWCBiYXNlZCBvbiB2ZXJzaW9uIG51bWJlclxuICAgICAgICAgICAgICAgIGNvbnN0IG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCA9IG9iai5taW5fcGJ4X3ZlcnNpb247XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3TW9kdWxlVmVyc2lvbiA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWZXJzaW9uUEJYID0gbWFya2V0cGxhY2UucGJ4VmVyc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAobWFya2V0cGxhY2UudmVyc2lvbkNvbXBhcmUoY3VycmVudFZlcnNpb25QQlgsIG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgbmV3IG1vZHVsZSByb3dcbiAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vZHVsZSBpcyBhbHJlYWR5IGluc3RhbGxlZCBhbmQgb2ZmZXIgYW4gdXBkYXRlXG4gICAgICAgICAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICAgICAgICAgIGlmICgkbW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5zdGFsbGVkVmVyID0gJG1vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ZXJzaW9uQ29tcGFyZVJlc3VsdCA9IG1hcmtldHBsYWNlLnZlcnNpb25Db21wYXJlKG5ld01vZHVsZVZlcnNpb24sIGluc3RhbGxlZFZlcik7XG4gICAgICAgICAgICAgICAgICAgIGlmICh2ZXJzaW9uQ29tcGFyZVJlc3VsdCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlLmFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmVyc2lvbkNvbXBhcmVSZXN1bHQgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlLmNoYW5nZURvd25sb2FkQnV0dG9uT25Sb3cob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCQoJ3RyLm5ldy1tb2R1bGUtcm93JykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbWFya2V0cGxhY2UuJG5vTmV3TW9kdWxlc1NlZ21lbnQuaGlkZSgpO1xuICAgICAgICAgICAgLy8gT25seSBpbml0aWFsaXplIGlmIERhdGFUYWJsZSBpcyBub3QgYWxyZWFkeSBpbml0aWFsaXplZFxuICAgICAgICAgICAgaWYgKCEkLmZuLkRhdGFUYWJsZS5pc0RhdGFUYWJsZShtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZSkpIHtcbiAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIHRhYmxlIGlzIGFscmVhZHkgaW5pdGlhbGl6ZWQsIGp1c3QgcmVkcmF3IGl0XG4gICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuRGF0YVRhYmxlKCkuZHJhdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFya2V0cGxhY2UuJG5vTmV3TW9kdWxlc1NlZ21lbnQuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBkZXNjcmlwdGlvbiBmb3IgYW4gYXZhaWxhYmxlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBhZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopIHtcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuc2hvdygpO1xuICAgICAgICBsZXQgcHJvbW9MaW5rID0gJyc7XG4gICAgICAgIGlmIChvYmoucHJvbW9fbGluayAhPT0gdW5kZWZpbmVkICYmIG9iai5wcm9tb19saW5rICE9PSBudWxsKSB7XG4gICAgICAgICAgICBwcm9tb0xpbmsgPSBgPGJyPjxhIGhyZWY9XCIke29iai5wcm9tb19saW5rfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9FeHRlcm5hbERlc2NyaXB0aW9ufTwvYT5gO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGFkZGl0aW9uYWxJY29uID0gJzxpIGNsYXNzPVwicHV6emxlIHBpZWNlIGljb25cIj48L2k+JztcbiAgICAgICAgaWYgKG9iai5jb21tZXJjaWFsICE9PSAwKSB7XG4gICAgICAgICAgICBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInVpIGRvbmF0ZSBpY29uXCI+PC9pPic7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZHluYW1pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgZGF0YS1pZD1cIiR7b2JqLnVuaXFpZH1cIiBkYXRhLW5hbWU9XCIke2RlY29kZVVSSUNvbXBvbmVudChvYmoubmFtZSl9XCI+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJzaG93LWRldGFpbHMtb24tY2xpY2tcIj4ke2FkZGl0aW9uYWxJY29ufSAke2RlY29kZVVSSUNvbXBvbmVudChvYmoubmFtZSl9PGJyPlxuXHRcdFx0XHRcdFx0ICAgIDxzcGFuIGNsYXNzPVwiZmVhdHVyZXNcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGVzY3JpcHRpb24pfSAke3Byb21vTGlua308L3NwYW4+XG5cdFx0XHRcdFx0XHQ8L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwic2hvdy1kZXRhaWxzLW9uLWNsaWNrXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRldmVsb3Blcil9PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkIHZlcnNpb24gc2hvdy1kZXRhaWxzLW9uLWNsaWNrXCI+JHtvYmoudmVyc2lvbn08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nXCI+XG4gICAgXHRcdFx0XHRcdFx0XHQ8ZGl2IGNsYXNzPVwidWkgc21hbGwgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgaWNvbiBiYXNpYyBidXR0b24gZG93bmxvYWQgcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PSBcIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS11bmlxaWQgPSBcIiR7b2JqLnVuaXFpZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmVyc2lvbiA9XCIke29iai52ZXJzaW9ufVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1yZWxlYXNlaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZG93bmxvYWQgYmx1ZVwiPjwvaT4gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG5cdFx0XHRcdFx0XHRcdFx0PC9kaXY+XG4gICAgXHRcdFx0XHQgICAgPC90ZD5cdFx0XG5cdFx0XHQ8L3RyPmA7XG4gICAgICAgICQoJyNuZXctbW9kdWxlcy10YWJsZSB0Ym9keScpLmFwcGVuZChkeW5hbWljUm93KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhbiB1cGRhdGUgYnV0dG9uIHRvIHRoZSBtb2R1bGUgcm93IGZvciB1cGRhdGluZyBhbiBvbGQgdmVyc2lvbiBvZiBQQlguXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKSB7XG4gICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0cltkYXRhLWlkPSR7b2JqLnVuaXFpZH1dYCk7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50RG93bmxvYWRCdXR0b24gPSAkbW9kdWxlUm93LmZpbmQoJ2EuZG93bmxvYWQnKTtcbiAgICAgICAgJGN1cnJlbnREb3dubG9hZEJ1dHRvbi5yZW1vdmUoKTtcbiAgICAgICAgY29uc3QgZHluYW1pY0J1dHRvblxuICAgICAgICAgICAgPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIHVwZGF0ZSBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcblx0XHRcdGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGV9XCJcblx0XHRcdGRhdGEtdmVyc2lvbiA9XCIke29iai52ZXJzaW9ufVwiXG5cdFx0XHRkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcblx0XHRcdGRhdGEtdW5pcWlkID1cIiR7b2JqLnVuaXFpZH1cIiBcblx0XHRcdGRhdGEtcmVsZWFzZWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gcmVkbyBibHVlXCI+PC9pPiBcblx0XHRcdDwvYT5gO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG4gICAgICAgIG1hcmtldHBsYWNlLiRidG5VcGRhdGVBbGxNb2R1bGVzLnNob3coKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjaGFuZ2VEb3dubG9hZEJ1dHRvbk9uUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubmV3LW1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICBjb25zdCAkY3VycmVudERvd25sb2FkQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLmRvd25sb2FkJyk7XG4gICAgICAgICRjdXJyZW50RG93bmxvYWRCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b25cbiAgICAgICAgICAgID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcblx0XHRcdGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9TaG93TW9kdWxlUmVwb0RldGFpbHN9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gc2VhcmNoIGJsdWVcIj48L2k+IFxuXHRcdFx0PC9hPmA7XG4gICAgICAgICRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJylcbiAgICAgICAgICAgIC5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLmNsb3Nlc3QoJ3RkJykuYWRkQ2xhc3MoJ3Nob3ctZGV0YWlscy1vbi1jbGljaycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlIHZlcnNpb25zIG9mIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYxIC0gVGhlIGZpcnN0IHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdjIgLSBUaGUgc2Vjb25kIHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGV4aWNvZ3JhcGhpY2FsXSAtIFdoZXRoZXIgdG8gcGVyZm9ybSBsZXhpY29ncmFwaGljYWwgY29tcGFyaXNvbiAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuemVyb0V4dGVuZF0gLSBXZWF0aGVyIHRvIHplcm8tZXh0ZW5kIHRoZSBzaG9ydGVyIHZlcnNpb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSAtIEEgbnVtYmVyIGluZGljYXRpbmcgdGhlIGNvbXBhcmlzb24gcmVzdWx0OiAwIGlmIHZlcnNpb25zIGFyZSBlcXVhbCwgMSBpZiB2MSBpcyBncmVhdGVyLCAtMSBpZiB2MiBpcyBncmVhdGVyLCBvciBOYU4gaWYgdGhlIHZlcnNpb25zIGFyZSBpbnZhbGlkLlxuICAgICAqL1xuICAgIHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuICAgICAgICBjb25zdCB6ZXJvRXh0ZW5kID0gb3B0aW9ucyAmJiBvcHRpb25zLnplcm9FeHRlbmQ7XG4gICAgICAgIGxldCB2MXBhcnRzID0gU3RyaW5nKHYxKS5zcGxpdCgnLicpO1xuICAgICAgICBsZXQgdjJwYXJ0cyA9IFN0cmluZyh2Mikuc3BsaXQoJy4nKTtcblxuICAgICAgICBmdW5jdGlvbiBpc1ZhbGlkUGFydCh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXpdKiQvIDogL15cXGQrJC8pLnRlc3QoeCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXYxcGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpIHx8ICF2MnBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSkge1xuICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh6ZXJvRXh0ZW5kKSB7XG4gICAgICAgICAgICB3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgICAgICB3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuICAgICAgICAgICAgdjFwYXJ0cyA9IHYxcGFydHMubWFwKE51bWJlcik7XG4gICAgICAgICAgICB2MnBhcnRzID0gdjJwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdjFwYXJ0cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgaWYgKHYycGFydHMubGVuZ3RoID09PSBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYxcGFydHNbaV0gPiB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sXG5cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBleHRlcm5hbCBtb2R1bGVzIHRhYmxlIGFuZCBmZXRjaCBhIGxpc3Qgb2YgYXZhaWxhYmxlIG1vZHVsZXMgZnJvbSB0aGUgcmVwb1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG1hcmtldHBsYWNlLmluaXRpYWxpemUoKTtcbn0pO1xuIl19