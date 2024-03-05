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

    var dynamicRow = "\n\t\t\t<tr class=\"new-module-row\" data-id=\"".concat(obj.uniqid, "\" data-name=\"").concat(decodeURIComponent(obj.name), "\">\n\t\t\t\t\t\t<td class=\"show-details-on-click\">").concat(additionalIcon, " ").concat(decodeURIComponent(obj.name), "<br>\n\t\t\t\t\t\t    <span class=\"features\">").concat(decodeURIComponent(obj.description), " ").concat(promoLink, "</span>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td class=\"show-details-on-click\">").concat(decodeURIComponent(obj.developer), "</td>\n\t\t\t\t\t\t<td class=\"center aligned version show-details-on-click\">").concat(obj.version, "</td>\n\t\t\t\t\t\t<td class=\"right aligned collapsing\">\n    \t\t\t\t\t\t\t<div class=\"ui small basic icon buttons action-buttons\">\n                                    <a href=\"#\" class=\"ui icon basic button download popuped disable-if-no-internet\" \n                                        data-content= \"").concat(globalTranslate.ext_InstallModule, "\"\n                                        data-uniqid = \"").concat(obj.uniqid, "\"\n                                        data-size = \"").concat(obj.size, "\"\n                                        data-releaseid =\"").concat(obj.release_id, "\">\n                                        <i class=\"icon download blue\"></i> \n                                    </a>\n\t\t\t\t\t\t\t\t</div>\n    \t\t\t\t    </td>\t\t\n\t\t\t</tr>");
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
    var dynamicButton = "<a href=\"#\" class=\"ui basic icon button update popuped disable-if-no-internet\" \n\t\t\tdata-content=\"".concat(globalTranslate.ext_UpdateModule, "\"\n\t\t\tdata-ver =\"").concat(obj.version, "\"\n\t\t\tdata-size = \"").concat(obj.size, "\"\n\t\t\tdata-uniqid =\"").concat(obj.uniqid, "\" \n\t\t\tdata-releaseid =\"").concat(obj.release_id, "\">\n\t\t\t<i class=\"icon redo blue\"></i> \n\t\t\t</a>");
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
    var v1parts = v1.split('.');
    var v2parts = v2.split('.');

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLW1hcmtldHBsYWNlLmpzIl0sIm5hbWVzIjpbIm1hcmtldHBsYWNlIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG1hcmtldHBsYWNlTG9hZGVyIiwiJG5vTmV3TW9kdWxlc1NlZ21lbnQiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCIkYnRuVXBkYXRlQWxsTW9kdWxlcyIsImluaXRpYWxpemUiLCJQYnhBcGkiLCJNb2R1bGVzR2V0QXZhaWxhYmxlIiwiY2JQYXJzZU1vZHVsZVVwZGF0ZXMiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiRGF0YVRhYmxlIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwiY29sdW1ucyIsIm9yZGVyYWJsZSIsInNlYXJjaGFibGUiLCJhdXRvV2lkdGgiLCJzRG9tIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImluaXRDb21wbGV0ZSIsImFwaSIsImV2ZXJ5IiwiY29sdW1uIiwiaW5kZXgiLCJ0aXRsZSIsImhlYWRlciIsInRleHRDb250ZW50IiwiaW5wdXQiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJwbGFjZWhvbGRlciIsInJlcGxhY2VDaGlsZHJlbiIsImFkZEV2ZW50TGlzdGVuZXIiLCJzZWFyY2giLCJ2YWx1ZSIsImRyYXciLCJyZXNwb25zZSIsImhpZGUiLCJtb2R1bGVzIiwiZm9yRWFjaCIsIm9iaiIsIm1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCIsIm1pbl9wYnhfdmVyc2lvbiIsIm5ld01vZHVsZVZlcnNpb24iLCJ2ZXJzaW9uIiwiY3VycmVudFZlcnNpb25QQlgiLCJ2ZXJzaW9uQ29tcGFyZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImxlbmd0aCIsImluc3RhbGxlZFZlciIsImZpbmQiLCJ0ZXh0IiwidmVyc2lvbkNvbXBhcmVSZXN1bHQiLCJhZGRVcGRhdGVCdXR0b25Ub1JvdyIsImNoYW5nZURvd25sb2FkQnV0dG9uT25Sb3ciLCJzaG93IiwicHJvbW9MaW5rIiwicHJvbW9fbGluayIsInVuZGVmaW5lZCIsImdsb2JhbFRyYW5zbGF0ZSIsImV4dF9FeHRlcm5hbERlc2NyaXB0aW9uIiwiYWRkaXRpb25hbEljb24iLCJjb21tZXJjaWFsIiwiZHluYW1pY1JvdyIsImRlY29kZVVSSUNvbXBvbmVudCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsImRldmVsb3BlciIsImV4dF9JbnN0YWxsTW9kdWxlIiwic2l6ZSIsInJlbGVhc2VfaWQiLCJhcHBlbmQiLCIkY3VycmVudERvd25sb2FkQnV0dG9uIiwicmVtb3ZlIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwiZXh0X1Nob3dNb2R1bGVSZXBvRGV0YWlscyIsImNsb3Nlc3QiLCJhZGRDbGFzcyIsInYxIiwidjIiLCJvcHRpb25zIiwibGV4aWNvZ3JhcGhpY2FsIiwiemVyb0V4dGVuZCIsInYxcGFydHMiLCJzcGxpdCIsInYycGFydHMiLCJpc1ZhbGlkUGFydCIsIngiLCJ0ZXN0IiwiTmFOIiwicHVzaCIsIm1hcCIsIk51bWJlciIsImkiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxXQUFXLEdBQUc7QUFFaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUVDLENBQUMsQ0FBQyxvQkFBRCxDQU5KOztBQVFoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRUQsQ0FBQyxDQUFDLHFCQUFELENBWkw7O0FBY2hCO0FBQ0o7QUFDQTtBQUNB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RUFBMEI7QUFDdEIsZUFBTyxDQUFQO0FBQ0g7O0FBQ0QsVUFBSVYsT0FBTyxDQUFDVSxDQUFELENBQVAsS0FBZVIsT0FBTyxDQUFDUSxDQUFELENBQTFCLEVBQStCLENBQzNCO0FBQ0gsT0FGRCxNQUVPLElBQUlWLE9BQU8sQ0FBQ1UsQ0FBRCxDQUFQLEdBQWFSLE9BQU8sQ0FBQ1EsQ0FBRCxDQUF4QixFQUE2QjtBQUNoQyxlQUFPLENBQVA7QUFDSCxPQUZNLE1BRUE7QUFDSCxlQUFPLENBQUMsQ0FBUjtBQUNIO0FBQ0o7O0FBRUQsUUFBSVYsT0FBTyxDQUFDckMsTUFBUixLQUFtQnVDLE9BQU8sQ0FBQ3ZDLE1BQS9CLEVBQXVDO0FBQ25DLGFBQU8sQ0FBQyxDQUFSO0FBQ0g7O0FBRUQsV0FBTyxDQUFQO0FBQ0g7QUF2UGUsQ0FBcEIsQyxDQTJQQTs7QUFDQXRELENBQUMsQ0FBQ2dDLFFBQUQsQ0FBRCxDQUFZc0UsS0FBWixDQUFrQixZQUFNO0FBQ3BCeEcsRUFBQUEsV0FBVyxDQUFDUyxVQUFaO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSwgZ2xvYmFsUEJYVmVyc2lvbiAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgbGlzdCBvZiBleHRlbnNpb24gbW9kdWxlcy5cbiAqIEBjbGFzcyBtYXJrZXRwbGFjZVxuICogQG1lbWJlcm9mIG1vZHVsZTpQYnhFeHRlbnNpb25Nb2R1bGVzXG4gKi9cbmNvbnN0IG1hcmtldHBsYWNlID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYmxlIHdpdGggYXZhaWxhYmxlIG1vZHVsZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFya2V0cGxhY2VUYWJsZTogJCgnI25ldy1tb2R1bGVzLXRhYmxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbG9hZGVyIGluc3RlYWQgb2YgYXZhaWxhYmxlIG1vZHVsZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFya2V0cGxhY2VMb2FkZXI6ICQoJyNuZXctbW9kdWxlcy1sb2FkZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBpbmZvcm1hdGlvbiB3aGVuIG5vIGFueSBtb2R1bGVzIGF2YWlsYWJsZSB0byBpbnN0YWxsLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG5vTmV3TW9kdWxlc1NlZ21lbnQ6ICQoJyNuby1uZXctbW9kdWxlcy1zZWdtZW50JyksXG5cbiAgICAvKipcbiAgICAgKiBTdG9yZSBjdXJyZW50IGluc3RhbGxlZCBhIFBCWCB2ZXJzaW9uIHdpdGhvdXQgYSBkaXYgcG9zdGZpeFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBidXR0b24gd2hpY2ggcmVzcG9uc2libGUgZm9yIHVwZGF0ZSBhbGwgaW5zdGFsbGVkIG1vZHVsZXNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRidG5VcGRhdGVBbGxNb2R1bGVzOiAkKCcjdXBkYXRlLWFsbC1tb2R1bGVzLWJ1dHRvbicpLFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbk1vZHVsZXNTaG93QXZhaWxhYmxlIGNsYXNzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgUGJ4QXBpLk1vZHVsZXNHZXRBdmFpbGFibGUobWFya2V0cGxhY2UuY2JQYXJzZU1vZHVsZVVwZGF0ZXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRhdGEgdGFibGVzIG9uIHRhYmxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBhdXRvV2lkdGg6IGZhbHNlLFxuICAgICAgICAgICAgc0RvbTogJ2xydGlwJyxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBpbml0Q29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaSgpXG4gICAgICAgICAgICAgICAgICAgIC5jb2x1bW5zKClcbiAgICAgICAgICAgICAgICAgICAgLmV2ZXJ5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb2x1bW4gPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbHVtbi5pbmRleCgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRpdGxlID0gY29sdW1uLmhlYWRlcigpLnRleHRDb250ZW50O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGlucHV0IGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnBsYWNlaG9sZGVyID0gdGl0bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uLmhlYWRlcigpLnJlcGxhY2VDaGlsZHJlbihpbnB1dCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgdXNlciBpbnB1dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29sdW1uLnNlYXJjaCgpICE9PSB0aGlzLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW4uc2VhcmNoKGlucHV0LnZhbHVlKS5kcmF3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHRoZSBsaXN0IG9mIG1vZHVsZXMgcmVjZWl2ZWQgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGlzdCBvZiBtb2R1bGVzLlxuICAgICAqL1xuICAgIGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlKSB7XG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZUxvYWRlci5oaWRlKCk7XG4gICAgICAgIHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIG1vZHVsZSBpcyBjb21wYXRpYmxlIHdpdGggdGhlIFBCWCBiYXNlZCBvbiB2ZXJzaW9uIG51bWJlclxuICAgICAgICAgICAgY29uc3QgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYID0gb2JqLm1pbl9wYnhfdmVyc2lvbjtcbiAgICAgICAgICAgIGNvbnN0IG5ld01vZHVsZVZlcnNpb24gPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWZXJzaW9uUEJYID0gbWFya2V0cGxhY2UucGJ4VmVyc2lvbjtcbiAgICAgICAgICAgIGlmIChtYXJrZXRwbGFjZS52ZXJzaW9uQ29tcGFyZShjdXJyZW50VmVyc2lvblBCWCwgbWluQXBwcm9wcmlhdGVWZXJzaW9uUEJYKSA8IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFkZCBuZXcgbW9kdWxlIHJvd1xuICAgICAgICAgICAgbWFya2V0cGxhY2UuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vZHVsZSBpcyBhbHJlYWR5IGluc3RhbGxlZCBhbmQgb2ZmZXIgYW4gdXBkYXRlXG4gICAgICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvd1tkYXRhLWlkPSR7b2JqLnVuaXFpZH1dYCk7XG4gICAgICAgICAgICBpZiAoJG1vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5zdGFsbGVkVmVyID0gJG1vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZlcnNpb25Db21wYXJlUmVzdWx0ID0gbWFya2V0cGxhY2UudmVyc2lvbkNvbXBhcmUobmV3TW9kdWxlVmVyc2lvbiwgaW5zdGFsbGVkVmVyKTtcbiAgICAgICAgICAgICAgICBpZiAoIHZlcnNpb25Db21wYXJlUmVzdWx0ID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5hZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopO1xuICAgICAgICAgICAgICAgIH0gIGVsc2UgaWYgKCB2ZXJzaW9uQ29tcGFyZVJlc3VsdCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5jaGFuZ2VEb3dubG9hZEJ1dHRvbk9uUm93KG9iaik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoJCgndHIubmV3LW1vZHVsZS1yb3cnKS5sZW5ndGg+MCl7XG4gICAgICAgICAgICBtYXJrZXRwbGFjZS4kbm9OZXdNb2R1bGVzU2VnbWVudC5oaWRlKCk7XG4gICAgICAgICAgICBtYXJrZXRwbGFjZS5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBtYXJrZXRwbGFjZS4kbm9OZXdNb2R1bGVzU2VnbWVudC5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGRlc2NyaXB0aW9uIGZvciBhbiBhdmFpbGFibGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZS5zaG93KCk7XG4gICAgICAgIGxldCBwcm9tb0xpbmsgPSAnJztcbiAgICAgICAgaWYgKG9iai5wcm9tb19saW5rICE9PSB1bmRlZmluZWQgJiYgb2JqLnByb21vX2xpbmsgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHByb21vTGluayA9IGA8YnI+PGEgaHJlZj1cIiR7b2JqLnByb21vX2xpbmt9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0V4dGVybmFsRGVzY3JpcHRpb259PC9hPmA7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYWRkaXRpb25hbEljb24gPSAnPGkgY2xhc3M9XCJwdXp6bGUgcGllY2UgaWNvblwiPjwvaT4nO1xuICAgICAgICBpZiAob2JqLmNvbW1lcmNpYWwgIT09ICcwJykge1xuICAgICAgICAgICAgYWRkaXRpb25hbEljb24gPSAnPGkgY2xhc3M9XCJ1aSBkb25hdGUgaWNvblwiPjwvaT4nO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGR5bmFtaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGRhdGEtaWQ9XCIke29iai51bmlxaWR9XCIgZGF0YS1uYW1lPVwiJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfVwiPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwic2hvdy1kZXRhaWxzLW9uLWNsaWNrXCI+JHthZGRpdGlvbmFsSWNvbn0gJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdCAgICA8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uIHNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGljb24gYmFzaWMgYnV0dG9uIGRvd25sb2FkIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdW5pcWlkID0gXCIke29iai51bmlxaWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXJlbGVhc2VpZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cblx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5cbiAgICBcdFx0XHRcdCAgICA8L3RkPlx0XHRcblx0XHRcdDwvdHI+YDtcbiAgICAgICAgJCgnI25ldy1tb2R1bGVzLXRhYmxlIHRib2R5JykuYXBwZW5kKGR5bmFtaWNSb3cpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGFuIHVwZGF0ZSBidXR0b24gdG8gdGhlIG1vZHVsZSByb3cgZm9yIHVwZGF0aW5nIGFuIG9sZCB2ZXJzaW9uIG9mIFBCWC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBhZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopIHtcbiAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyW2RhdGEtaWQ9JHtvYmoudW5pcWlkfV1gKTtcbiAgICAgICAgY29uc3QgJGN1cnJlbnREb3dubG9hZEJ1dHRvbiA9ICRtb2R1bGVSb3cuZmluZCgnYS5kb3dubG9hZCcpO1xuICAgICAgICAkY3VycmVudERvd25sb2FkQnV0dG9uLnJlbW92ZSgpO1xuICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uXG4gICAgICAgICAgICA9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gdXBkYXRlIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuXHRcdFx0ZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuXHRcdFx0ZGF0YS12ZXIgPVwiJHtvYmoudmVyc2lvbn1cIlxuXHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG5cdFx0XHRkYXRhLXJlbGVhc2VpZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuXHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG5cdFx0XHQ8L2E+YDtcbiAgICAgICAgJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgICAgICBtYXJrZXRwbGFjZS4kYnRuVXBkYXRlQWxsTW9kdWxlcy5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgY2hhbmdlRG93bmxvYWRCdXR0b25PblJvdyhvYmopIHtcbiAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm5ldy1tb2R1bGUtcm93W2RhdGEtaWQ9JHtvYmoudW5pcWlkfV1gKTtcbiAgICAgICAgY29uc3QgJGN1cnJlbnREb3dubG9hZEJ1dHRvbiA9ICRtb2R1bGVSb3cuZmluZCgnYS5kb3dubG9hZCcpO1xuICAgICAgICAkY3VycmVudERvd25sb2FkQnV0dG9uLnJlbW92ZSgpO1xuICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uXG4gICAgICAgICAgICA9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG5cdFx0XHRkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfU2hvd01vZHVsZVJlcG9EZXRhaWxzfVwiPlxuXHRcdFx0PGkgY2xhc3M9XCJpY29uIHNlYXJjaCBibHVlXCI+PC9pPiBcblx0XHRcdDwvYT5gO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpXG4gICAgICAgICAgICAucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcbiAgICAgICAgJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5jbG9zZXN0KCd0ZCcpLmFkZENsYXNzKCdzaG93LWRldGFpbHMtb24tY2xpY2snKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZSB2ZXJzaW9ucyBvZiBtb2R1bGVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2MSAtIFRoZSBmaXJzdCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYyIC0gVGhlIHNlY29uZCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxleGljb2dyYXBoaWNhbF0gLSBXaGV0aGVyIHRvIHBlcmZvcm0gbGV4aWNvZ3JhcGhpY2FsIGNvbXBhcmlzb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnplcm9FeHRlbmRdIC0gV2VhdGhlciB0byB6ZXJvLWV4dGVuZCB0aGUgc2hvcnRlciB2ZXJzaW9uIChkZWZhdWx0OiBmYWxzZSkuXG4gICAgICogQHJldHVybnMge251bWJlcn0gLSBBIG51bWJlciBpbmRpY2F0aW5nIHRoZSBjb21wYXJpc29uIHJlc3VsdDogMCBpZiB2ZXJzaW9ucyBhcmUgZXF1YWwsIDEgaWYgdjEgaXMgZ3JlYXRlciwgLTEgaWYgdjIgaXMgZ3JlYXRlciwgb3IgTmFOIGlmIHRoZSB2ZXJzaW9ucyBhcmUgaW52YWxpZC5cbiAgICAgKi9cbiAgICB2ZXJzaW9uQ29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgbGV4aWNvZ3JhcGhpY2FsID0gb3B0aW9ucyAmJiBvcHRpb25zLmxleGljb2dyYXBoaWNhbDtcbiAgICAgICAgY29uc3QgemVyb0V4dGVuZCA9IG9wdGlvbnMgJiYgb3B0aW9ucy56ZXJvRXh0ZW5kO1xuICAgICAgICBsZXQgdjFwYXJ0cyA9IHYxLnNwbGl0KCcuJyk7XG4gICAgICAgIGxldCB2MnBhcnRzID0gdjIuc3BsaXQoJy4nKTtcblxuICAgICAgICBmdW5jdGlvbiBpc1ZhbGlkUGFydCh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXpdKiQvIDogL15cXGQrJC8pLnRlc3QoeCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXYxcGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpIHx8ICF2MnBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSkge1xuICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh6ZXJvRXh0ZW5kKSB7XG4gICAgICAgICAgICB3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgICAgICB3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuICAgICAgICAgICAgdjFwYXJ0cyA9IHYxcGFydHMubWFwKE51bWJlcik7XG4gICAgICAgICAgICB2MnBhcnRzID0gdjJwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdjFwYXJ0cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgaWYgKHYycGFydHMubGVuZ3RoID09PSBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYxcGFydHNbaV0gPiB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sXG5cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBleHRlcm5hbCBtb2R1bGVzIHRhYmxlIGFuZCBmZXRjaCBhIGxpc3Qgb2YgYXZhaWxhYmxlIG1vZHVsZXMgZnJvbSB0aGUgcmVwb1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG1hcmtldHBsYWNlLmluaXRpYWxpemUoKTtcbn0pO1xuIl19