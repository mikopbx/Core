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
   * Initialize extensionModulesShowAvailable class
   */
  initialize: function initialize() {
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

    if ($('tr.new-module-row').length > 0) {
      marketplace.$noNewModulesSegment.hide();
      marketplace.initializeDataTable();
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

    if (obj.commercial !== '0') {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLW1hcmtldHBsYWNlLmpzIl0sIm5hbWVzIjpbIm1hcmtldHBsYWNlIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG1hcmtldHBsYWNlTG9hZGVyIiwiJG5vTmV3TW9kdWxlc1NlZ21lbnQiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCIkYnRuVXBkYXRlQWxsTW9kdWxlcyIsImluaXRpYWxpemUiLCJQYnhBcGkiLCJNb2R1bGVzR2V0QXZhaWxhYmxlIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiRGF0YVRhYmxlIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJhdXRvV2lkdGgiLCJzRG9tIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImluaXRDb21wbGV0ZSIsImFwaSIsImV2ZXJ5IiwiY29sdW1uIiwiaW5kZXgiLCJ0aXRsZSIsImhlYWRlciIsInRleHRDb250ZW50IiwiaW5wdXQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJwbGFjZWhvbGRlciIsInJlcGxhY2VDaGlsZHJlbiIsImFkZEV2ZW50TGlzdGVuZXIiLCJzZWFyY2giLCJ2YWx1ZSIsImRyYXciLCJyZXNwb25zZSIsImhpZGUiLCJtb2R1bGVzIiwiZm9yRWFjaCIsIm9iaiIsIm1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCIsIm1pbl9wYnhfdmVyc2lvbiIsIm5ld01vZHVsZVZlcnNpb24iLCJ2ZXJzaW9uIiwiY3VycmVudFZlcnNpb25QQlgiLCJ2ZXJzaW9uQ29tcGFyZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsImluc3RhbGxlZFZlciIsImZpbmQiLCJ0ZXh0IiwidmVyc2lvbkNvbXBhcmVSZXN1bHQiLCJhZGRVcGRhdGVCdXR0b25Ub1JvdyIsImNoYW5nZURvd25sb2FkQnV0dG9uT25Sb3ciLCJzaG93IiwicHJvbW9MaW5rIiwicHJvbW9fbGluayIsInVuZGVmaW5lZCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9FeHRlcm5hbERlc2NyaXB0aW9uIiwiYWRkaXRpb25hbEljb24iLCJjb21tZXJjaWFsIiwiZHluYW1pY1JvdyIsImRlY29kZVVSSUNvbXBvbmVudCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsImRldmVsb3BlciIsImV4dF9JbnN0YWxsTW9kdWxlIiwic2l6ZSIsInJlbGVhc2VfaWQiLCJhcHBlbmQiLCIkY3VycmVudERvd25sb2FkQnV0dG9uIiwicmVtb3ZlIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwiZXh0X1Nob3dNb2R1bGVSZXBvRGV0YWlscyIsImNsb3Nlc3QiLCJhZGRDbGFzcyIsInYxIiwidjIiLCJvcHRpb25zIiwibGV4aWNvZ3JhcGhpY2FsIiwiemVyb0V4dGVuZCIsInYxcGFydHMiLCJTdHJpbmciLCJzcGxpdCIsInYycGFydHMiLCJpc1ZhbGlkUGFydCIsIngiLCJ0ZXN0IiwiTmFOIiwicHVzaCIsIm1hcCIsIk51bWJlciIsImkiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxXQUFXLEdBQUc7QUFFaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUVDLENBQUMsQ0FBQyxvQkFBRCxDQU5KOztBQVFoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRUQsQ0FBQyxDQUFDLHFCQUFELENBWkw7O0FBY2hCO0FBQ0o7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b0NnRCxDQUFDLElBQUksQ0FBekMsRUFBNEM7QUFDeEMsVUFBSVIsT0FBTyxDQUFDeEMsTUFBUixLQUFtQmdELENBQXZCLEVBQTBCO0FBQ3RCLGVBQU8sQ0FBUDtBQUNIOztBQUNELFVBQUlYLE9BQU8sQ0FBQ1csQ0FBRCxDQUFQLEtBQWVSLE9BQU8sQ0FBQ1EsQ0FBRCxDQUExQixFQUErQixDQUMzQjtBQUNILE9BRkQsTUFFTyxJQUFJWCxPQUFPLENBQUNXLENBQUQsQ0FBUCxHQUFhUixPQUFPLENBQUNRLENBQUQsQ0FBeEIsRUFBNkI7QUFDaEMsZUFBTyxDQUFQO0FBQ0gsT0FGTSxNQUVBO0FBQ0gsZUFBTyxDQUFDLENBQVI7QUFDSDtBQUNKOztBQUVELFFBQUlYLE9BQU8sQ0FBQ3JDLE1BQVIsS0FBbUJ3QyxPQUFPLENBQUN4QyxNQUEvQixFQUF1QztBQUNuQyxhQUFPLENBQUMsQ0FBUjtBQUNIOztBQUVELFdBQU8sQ0FBUDtBQUNIO0FBeFBlLENBQXBCLEMsQ0E0UEE7O0FBQ0F0RCxDQUFDLENBQUNnQyxRQUFELENBQUQsQ0FBWXVFLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnpHLEVBQUFBLFdBQVcsQ0FBQ1MsVUFBWjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFBCWFZlcnNpb24gKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIGxpc3Qgb2YgZXh0ZW5zaW9uIG1vZHVsZXMuXG4gKiBAY2xhc3MgbWFya2V0cGxhY2VcbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBtYXJrZXRwbGFjZSA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJsZSB3aXRoIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlVGFibGU6ICQoJyNuZXctbW9kdWxlcy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvYWRlciBpbnN0ZWFkIG9mIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlTG9hZGVyOiAkKCcjbmV3LW1vZHVsZXMtbG9hZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaW5mb3JtYXRpb24gd2hlbiBubyBhbnkgbW9kdWxlcyBhdmFpbGFibGUgdG8gaW5zdGFsbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub05ld01vZHVsZXNTZWdtZW50OiAkKCcjbm8tbmV3LW1vZHVsZXMtc2VnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogU3RvcmUgY3VycmVudCBpbnN0YWxsZWQgYSBQQlggdmVyc2lvbiB3aXRob3V0IGEgZGl2IHBvc3RmaXhcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYnV0dG9uIHdoaWNoIHJlc3BvbnNpYmxlIGZvciB1cGRhdGUgYWxsIGluc3RhbGxlZCBtb2R1bGVzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYnRuVXBkYXRlQWxsTW9kdWxlczogJCgnI3VwZGF0ZS1hbGwtbW9kdWxlcy1idXR0b24nKSxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb25Nb2R1bGVzU2hvd0F2YWlsYWJsZSBjbGFzc1xuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIFBieEFwaS5Nb2R1bGVzR2V0QXZhaWxhYmxlKG1hcmtldHBsYWNlLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYXV0b1dpZHRoOiBmYWxzZSxcbiAgICAgICAgICAgIHNEb206ICdscnRpcCcsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgaW5pdENvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGkoKVxuICAgICAgICAgICAgICAgICAgICAuY29sdW1ucygpXG4gICAgICAgICAgICAgICAgICAgIC5ldmVyeShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29sdW1uID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2x1bW4uaW5kZXgoKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0aXRsZSA9IGNvbHVtbi5oZWFkZXIoKS50ZXh0Q29udGVudDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBpbnB1dCBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5wbGFjZWhvbGRlciA9IHRpdGxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbi5oZWFkZXIoKS5yZXBsYWNlQ2hpbGRyZW4oaW5wdXQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHVzZXIgaW5wdXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbHVtbi5zZWFyY2goKSAhPT0gdGhpcy52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uLnNlYXJjaChpbnB1dC52YWx1ZSkuZHJhdygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcHJvY2VzcyB0aGUgbGlzdCBvZiBtb2R1bGVzIHJlY2VpdmVkIGZyb20gdGhlIHdlYnNpdGUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIGxpc3Qgb2YgbW9kdWxlcy5cbiAgICAgKi9cbiAgICBjYlBhcnNlTW9kdWxlVXBkYXRlcyhyZXNwb25zZSkge1xuICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VMb2FkZXIuaGlkZSgpO1xuICAgICAgICByZXNwb25zZS5tb2R1bGVzLmZvckVhY2goKG9iaikgPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBtb2R1bGUgaXMgY29tcGF0aWJsZSB3aXRoIHRoZSBQQlggYmFzZWQgb24gdmVyc2lvbiBudW1iZXJcbiAgICAgICAgICAgIGNvbnN0IG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCA9IG9iai5taW5fcGJ4X3ZlcnNpb247XG4gICAgICAgICAgICBjb25zdCBuZXdNb2R1bGVWZXJzaW9uID0gb2JqLnZlcnNpb247XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmVyc2lvblBCWCA9IG1hcmtldHBsYWNlLnBieFZlcnNpb247XG4gICAgICAgICAgICBpZiAobWFya2V0cGxhY2UudmVyc2lvbkNvbXBhcmUoY3VycmVudFZlcnNpb25QQlgsIG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBZGQgbmV3IG1vZHVsZSByb3dcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLmFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaik7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgYWxyZWFkeSBpbnN0YWxsZWQgYW5kIG9mZmVyIGFuIHVwZGF0ZVxuICAgICAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICAgICAgaWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGluc3RhbGxlZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB2ZXJzaW9uQ29tcGFyZVJlc3VsdCA9IG1hcmtldHBsYWNlLnZlcnNpb25Db21wYXJlKG5ld01vZHVsZVZlcnNpb24sIGluc3RhbGxlZFZlcik7XG4gICAgICAgICAgICAgICAgaWYgKCB2ZXJzaW9uQ29tcGFyZVJlc3VsdCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcbiAgICAgICAgICAgICAgICB9ICBlbHNlIGlmICggdmVyc2lvbkNvbXBhcmVSZXN1bHQgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuY2hhbmdlRG93bmxvYWRCdXR0b25PblJvdyhvYmopO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCQoJ3RyLm5ldy1tb2R1bGUtcm93JykubGVuZ3RoPjApe1xuICAgICAgICAgICAgbWFya2V0cGxhY2UuJG5vTmV3TW9kdWxlc1NlZ21lbnQuaGlkZSgpO1xuICAgICAgICAgICAgbWFya2V0cGxhY2UuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFya2V0cGxhY2UuJG5vTmV3TW9kdWxlc1NlZ21lbnQuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBkZXNjcmlwdGlvbiBmb3IgYW4gYXZhaWxhYmxlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBhZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopIHtcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuc2hvdygpO1xuICAgICAgICBsZXQgcHJvbW9MaW5rID0gJyc7XG4gICAgICAgIGlmIChvYmoucHJvbW9fbGluayAhPT0gdW5kZWZpbmVkICYmIG9iai5wcm9tb19saW5rICE9PSBudWxsKSB7XG4gICAgICAgICAgICBwcm9tb0xpbmsgPSBgPGJyPjxhIGhyZWY9XCIke29iai5wcm9tb19saW5rfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9FeHRlcm5hbERlc2NyaXB0aW9ufTwvYT5gO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGFkZGl0aW9uYWxJY29uID0gJzxpIGNsYXNzPVwicHV6emxlIHBpZWNlIGljb25cIj48L2k+JztcbiAgICAgICAgaWYgKG9iai5jb21tZXJjaWFsICE9PSAnMCcpIHtcbiAgICAgICAgICAgIGFkZGl0aW9uYWxJY29uID0gJzxpIGNsYXNzPVwidWkgZG9uYXRlIGljb25cIj48L2k+JztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkeW5hbWljUm93ID0gYFxuXHRcdFx0PHRyIGNsYXNzPVwibmV3LW1vZHVsZS1yb3dcIiBkYXRhLWlkPVwiJHtvYmoudW5pcWlkfVwiIGRhdGEtbmFtZT1cIiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX1cIj5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7YWRkaXRpb25hbEljb259ICR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX08YnI+XG5cdFx0XHRcdFx0XHQgICAgPHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXNjcmlwdGlvbil9ICR7cHJvbW9MaW5rfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJzaG93LWRldGFpbHMtb24tY2xpY2tcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGV2ZWxvcGVyKX08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgdmVyc2lvbiBzaG93LWRldGFpbHMtb24tY2xpY2tcIj4ke29iai52ZXJzaW9ufTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICBcdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBpY29uIGJhc2ljIGJ1dHRvbiBkb3dubG9hZCBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9IFwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXVuaXFpZCA9IFwiJHtvYmoudW5pcWlkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12ZXJzaW9uID1cIiR7b2JqLnZlcnNpb259XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXJlbGVhc2VpZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cblx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5cbiAgICBcdFx0XHRcdCAgICA8L3RkPlx0XHRcblx0XHRcdDwvdHI+YDtcbiAgICAgICAgJCgnI25ldy1tb2R1bGVzLXRhYmxlIHRib2R5JykuYXBwZW5kKGR5bmFtaWNSb3cpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGFuIHVwZGF0ZSBidXR0b24gdG8gdGhlIG1vZHVsZSByb3cgZm9yIHVwZGF0aW5nIGFuIG9sZCB2ZXJzaW9uIG9mIFBCWC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBhZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopIHtcbiAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyW2RhdGEtaWQ9JHtvYmoudW5pcWlkfV1gKTtcbiAgICAgICAgY29uc3QgJGN1cnJlbnREb3dubG9hZEJ1dHRvbiA9ICRtb2R1bGVSb3cuZmluZCgnYS5kb3dubG9hZCcpO1xuICAgICAgICAkY3VycmVudERvd25sb2FkQnV0dG9uLnJlbW92ZSgpO1xuICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uXG4gICAgICAgICAgICA9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gdXBkYXRlIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuXHRcdFx0ZGF0YS12ZXJzaW9uID1cIiR7b2JqLnZlcnNpb259XCJcblx0XHRcdGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuXHRcdFx0ZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuXHRcdFx0ZGF0YS1yZWxlYXNlaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cblx0XHRcdDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+IFxuXHRcdFx0PC9hPmA7XG4gICAgICAgICRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJykucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcbiAgICAgICAgbWFya2V0cGxhY2UuJGJ0blVwZGF0ZUFsbE1vZHVsZXMuc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGNoYW5nZURvd25sb2FkQnV0dG9uT25Sb3cob2JqKSB7XG4gICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvd1tkYXRhLWlkPSR7b2JqLnVuaXFpZH1dYCk7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50RG93bmxvYWRCdXR0b24gPSAkbW9kdWxlUm93LmZpbmQoJ2EuZG93bmxvYWQnKTtcbiAgICAgICAgJGN1cnJlbnREb3dubG9hZEJ1dHRvbi5yZW1vdmUoKTtcbiAgICAgICAgY29uc3QgZHluYW1pY0J1dHRvblxuICAgICAgICAgICAgPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGJhc2ljIGljb24gYnV0dG9uIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1Nob3dNb2R1bGVSZXBvRGV0YWlsc31cIj5cblx0XHRcdDxpIGNsYXNzPVwiaWNvbiBzZWFyY2ggYmx1ZVwiPjwvaT4gXG5cdFx0XHQ8L2E+YDtcbiAgICAgICAgJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKVxuICAgICAgICAgICAgLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG4gICAgICAgICRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJykuY2xvc2VzdCgndGQnKS5hZGRDbGFzcygnc2hvdy1kZXRhaWxzLW9uLWNsaWNrJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbXBhcmUgdmVyc2lvbnMgb2YgbW9kdWxlcy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdjEgLSBUaGUgZmlyc3QgdmVyc2lvbiB0byBjb21wYXJlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2MiAtIFRoZSBzZWNvbmQgdmVyc2lvbiB0byBjb21wYXJlLlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc10gLSBPcHRpb25hbCBjb25maWd1cmF0aW9uIG9wdGlvbnMuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5sZXhpY29ncmFwaGljYWxdIC0gV2hldGhlciB0byBwZXJmb3JtIGxleGljb2dyYXBoaWNhbCBjb21wYXJpc29uIChkZWZhdWx0OiBmYWxzZSkuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy56ZXJvRXh0ZW5kXSAtIFdlYXRoZXIgdG8gemVyby1leHRlbmQgdGhlIHNob3J0ZXIgdmVyc2lvbiAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IC0gQSBudW1iZXIgaW5kaWNhdGluZyB0aGUgY29tcGFyaXNvbiByZXN1bHQ6IDAgaWYgdmVyc2lvbnMgYXJlIGVxdWFsLCAxIGlmIHYxIGlzIGdyZWF0ZXIsIC0xIGlmIHYyIGlzIGdyZWF0ZXIsIG9yIE5hTiBpZiB0aGUgdmVyc2lvbnMgYXJlIGludmFsaWQuXG4gICAgICovXG4gICAgdmVyc2lvbkNvbXBhcmUodjEsIHYyLCBvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGxleGljb2dyYXBoaWNhbCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5sZXhpY29ncmFwaGljYWw7XG4gICAgICAgIGNvbnN0IHplcm9FeHRlbmQgPSBvcHRpb25zICYmIG9wdGlvbnMuemVyb0V4dGVuZDtcbiAgICAgICAgbGV0IHYxcGFydHMgPSBTdHJpbmcodjEpLnNwbGl0KCcuJyk7XG4gICAgICAgIGxldCB2MnBhcnRzID0gU3RyaW5nKHYyKS5zcGxpdCgnLicpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGlzVmFsaWRQYXJ0KHgpIHtcbiAgICAgICAgICAgIHJldHVybiAobGV4aWNvZ3JhcGhpY2FsID8gL15cXGQrW0EtWmEtel0qJC8gOiAvXlxcZCskLykudGVzdCh4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghdjFwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkgfHwgIXYycGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpKSB7XG4gICAgICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHplcm9FeHRlbmQpIHtcbiAgICAgICAgICAgIHdoaWxlICh2MXBhcnRzLmxlbmd0aCA8IHYycGFydHMubGVuZ3RoKSB2MXBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgICAgIHdoaWxlICh2MnBhcnRzLmxlbmd0aCA8IHYxcGFydHMubGVuZ3RoKSB2MnBhcnRzLnB1c2goJzAnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghbGV4aWNvZ3JhcGhpY2FsKSB7XG4gICAgICAgICAgICB2MXBhcnRzID0gdjFwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgICAgIHYycGFydHMgPSB2MnBhcnRzLm1hcChOdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB2MXBhcnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBpZiAodjJwYXJ0cy5sZW5ndGggPT09IGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2MXBhcnRzW2ldID09PSB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodjFwYXJ0c1tpXSA+IHYycGFydHNbaV0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHYxcGFydHMubGVuZ3RoICE9PSB2MnBhcnRzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSxcblxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIGV4dGVybmFsIG1vZHVsZXMgdGFibGUgYW5kIGZldGNoIGEgbGlzdCBvZiBhdmFpbGFibGUgbW9kdWxlcyBmcm9tIHRoZSByZXBvXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgbWFya2V0cGxhY2UuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=