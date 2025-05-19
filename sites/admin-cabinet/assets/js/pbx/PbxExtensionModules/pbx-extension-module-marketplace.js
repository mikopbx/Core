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
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLW1hcmtldHBsYWNlLmpzIl0sIm5hbWVzIjpbIm1hcmtldHBsYWNlIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkIiwiJG1hcmtldHBsYWNlTG9hZGVyIiwiJG5vTmV3TW9kdWxlc1NlZ21lbnQiLCJwYnhWZXJzaW9uIiwiZ2xvYmFsUEJYVmVyc2lvbiIsInJlcGxhY2UiLCIkYnRuVXBkYXRlQWxsTW9kdWxlcyIsInJlc2V0VGFibGUiLCJmbiIsIkRhdGFUYWJsZSIsImlzRGF0YVRhYmxlIiwiZGVzdHJveSIsImZpbmQiLCJlbXB0eSIsImhpZGUiLCJzaG93IiwiaW5pdGlhbGl6ZSIsIlBieEFwaSIsIk1vZHVsZXNHZXRBdmFpbGFibGUiLCJjYlBhcnNlTW9kdWxlVXBkYXRlcyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsInNEb20iLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiaW5pdENvbXBsZXRlIiwiYXBpIiwiZXZlcnkiLCJjb2x1bW4iLCJpbmRleCIsInRpdGxlIiwiaGVhZGVyIiwidGV4dENvbnRlbnQiLCJpbnB1dCIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInBsYWNlaG9sZGVyIiwicmVwbGFjZUNoaWxkcmVuIiwiYWRkRXZlbnRMaXN0ZW5lciIsInNlYXJjaCIsInZhbHVlIiwiZHJhdyIsInJlc3BvbnNlIiwiQXJyYXkiLCJpc0FycmF5IiwibW9kdWxlcyIsImZvckVhY2giLCJvYmoiLCJtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgiLCJtaW5fcGJ4X3ZlcnNpb24iLCJuZXdNb2R1bGVWZXJzaW9uIiwidmVyc2lvbiIsImN1cnJlbnRWZXJzaW9uUEJYIiwidmVyc2lvbkNvbXBhcmUiLCJhZGRNb2R1bGVEZXNjcmlwdGlvbiIsIiRtb2R1bGVSb3ciLCJ1bmlxaWQiLCJsZW5ndGgiLCJpbnN0YWxsZWRWZXIiLCJ0ZXh0IiwidmVyc2lvbkNvbXBhcmVSZXN1bHQiLCJhZGRVcGRhdGVCdXR0b25Ub1JvdyIsImNoYW5nZURvd25sb2FkQnV0dG9uT25Sb3ciLCJwcm9tb0xpbmsiLCJwcm9tb19saW5rIiwidW5kZWZpbmVkIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJhZGRpdGlvbmFsSWNvbiIsImNvbW1lcmNpYWwiLCJkeW5hbWljUm93IiwiZGVjb2RlVVJJQ29tcG9uZW50IiwibmFtZSIsImRlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwiZXh0X0luc3RhbGxNb2R1bGUiLCJzaXplIiwicmVsZWFzZV9pZCIsImFwcGVuZCIsIiRjdXJyZW50RG93bmxvYWRCdXR0b24iLCJyZW1vdmUiLCJkeW5hbWljQnV0dG9uIiwiZXh0X1VwZGF0ZU1vZHVsZSIsInByZXBlbmQiLCJleHRfU2hvd01vZHVsZVJlcG9EZXRhaWxzIiwiY2xvc2VzdCIsImFkZENsYXNzIiwidjEiLCJ2MiIsIm9wdGlvbnMiLCJsZXhpY29ncmFwaGljYWwiLCJ6ZXJvRXh0ZW5kIiwidjFwYXJ0cyIsIlN0cmluZyIsInNwbGl0IiwidjJwYXJ0cyIsImlzVmFsaWRQYXJ0IiwieCIsInRlc3QiLCJOYU4iLCJwdXNoIiwibWFwIiwiTnVtYmVyIiwiaSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxXQUFXLEdBQUc7QUFFaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUVDLENBQUMsQ0FBQyxvQkFBRCxDQU5KOztBQVFoQjtBQUNKO0FBQ0E7QUFD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QXZCLEVBQTBCO0FBQ3RCLGVBQU8sQ0FBUDtBQUNIOztBQUNELFVBQUlYLE9BQU8sQ0FBQ1csQ0FBRCxDQUFQLEtBQWVSLE9BQU8sQ0FBQ1EsQ0FBRCxDQUExQixFQUErQixDQUMzQjtBQUNILE9BRkQsTUFFTyxJQUFJWCxPQUFPLENBQUNXLENBQUQsQ0FBUCxHQUFhUixPQUFPLENBQUNRLENBQUQsQ0FBeEIsRUFBNkI7QUFDaEMsZUFBTyxDQUFQO0FBQ0gsT0FGTSxNQUVBO0FBQ0gsZUFBTyxDQUFDLENBQVI7QUFDSDtBQUNKOztBQUVELFFBQUlYLE9BQU8sQ0FBQ25DLE1BQVIsS0FBbUJzQyxPQUFPLENBQUN0QyxNQUEvQixFQUF1QztBQUNuQyxhQUFPLENBQUMsQ0FBUjtBQUNIOztBQUVELFdBQU8sQ0FBUDtBQUNIO0FBblJlLENBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBnbG9iYWxQQlhWZXJzaW9uICovXG5cbi8qKlxuICogUmVwcmVzZW50cyBsaXN0IG9mIGV4dGVuc2lvbiBtb2R1bGVzLlxuICogQGNsYXNzIG1hcmtldHBsYWNlXG4gKiBAbWVtYmVyb2YgbW9kdWxlOlBieEV4dGVuc2lvbk1vZHVsZXNcbiAqL1xuY29uc3QgbWFya2V0cGxhY2UgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFibGUgd2l0aCBhdmFpbGFibGUgbW9kdWxlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYXJrZXRwbGFjZVRhYmxlOiAkKCcjbmV3LW1vZHVsZXMtdGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2FkZXIgaW5zdGVhZCBvZiBhdmFpbGFibGUgbW9kdWxlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYXJrZXRwbGFjZUxvYWRlcjogJCgnI25ldy1tb2R1bGVzLWxvYWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGluZm9ybWF0aW9uIHdoZW4gbm8gYW55IG1vZHVsZXMgYXZhaWxhYmxlIHRvIGluc3RhbGwuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbm9OZXdNb2R1bGVzU2VnbWVudDogJCgnI25vLW5ldy1tb2R1bGVzLXNlZ21lbnQnKSxcblxuICAgIC8qKlxuICAgICAqIFN0b3JlIGN1cnJlbnQgaW5zdGFsbGVkIGEgUEJYIHZlcnNpb24gd2l0aG91dCBhIGRpdiBwb3N0Zml4XG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBwYnhWZXJzaW9uOiBnbG9iYWxQQlhWZXJzaW9uLnJlcGxhY2UoLy1kZXYvaSwgJycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGJ1dHRvbiB3aGljaCByZXNwb25zaWJsZSBmb3IgdXBkYXRlIGFsbCBpbnN0YWxsZWQgbW9kdWxlc1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJ0blVwZGF0ZUFsbE1vZHVsZXM6ICQoJyN1cGRhdGUtYWxsLW1vZHVsZXMtYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBSZXNldCB0aGUgdGFibGUgYnkgZGVzdHJveWluZyBEYXRhVGFibGUgaW5zdGFuY2UgYW5kIGNsZWFyaW5nIGNvbnRlbnRcbiAgICAgKi9cbiAgICByZXNldFRhYmxlKCkge1xuICAgICAgICAvLyBEZXN0cm95IERhdGFUYWJsZSBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKCQuZm4uRGF0YVRhYmxlLmlzRGF0YVRhYmxlKG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlKSkge1xuICAgICAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuRGF0YVRhYmxlKCkuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIENsZWFyIHRhYmxlIGNvbnRlbnRcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuZmluZCgndGJvZHknKS5lbXB0eSgpO1xuICAgICAgICAvLyBIaWRlIHRhYmxlIGFuZCBzaG93IGxvYWRlclxuICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZS5oaWRlKCk7XG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZUxvYWRlci5zaG93KCk7XG4gICAgICAgIG1hcmtldHBsYWNlLiRidG5VcGRhdGVBbGxNb2R1bGVzLmhpZGUoKTtcbiAgICAgICAgbWFya2V0cGxhY2UuJG5vTmV3TW9kdWxlc1NlZ21lbnQuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbk1vZHVsZXNTaG93QXZhaWxhYmxlIGNsYXNzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gUmVzZXQgdGFibGUgYmVmb3JlIGZldGNoaW5nIG5ldyBkYXRhXG4gICAgICAgIG1hcmtldHBsYWNlLnJlc2V0VGFibGUoKTtcbiAgICAgICAgUGJ4QXBpLk1vZHVsZXNHZXRBdmFpbGFibGUobWFya2V0cGxhY2UuY2JQYXJzZU1vZHVsZVVwZGF0ZXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRhdGEgdGFibGVzIG9uIHRhYmxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuRGF0YVRhYmxlKHtcbiAgICAgICAgICAgIGxlbmd0aENoYW5nZTogZmFsc2UsXG4gICAgICAgICAgICBwYWdpbmc6IGZhbHNlLFxuICAgICAgICAgICAgY29sdW1uczogW1xuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBhdXRvV2lkdGg6IGZhbHNlLFxuICAgICAgICAgICAgc0RvbTogJ2xydGlwJyxcbiAgICAgICAgICAgIGxhbmd1YWdlOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5kYXRhVGFibGVMb2NhbGlzYXRpb24sXG4gICAgICAgICAgICBpbml0Q29tcGxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaSgpXG4gICAgICAgICAgICAgICAgICAgIC5jb2x1bW5zKClcbiAgICAgICAgICAgICAgICAgICAgLmV2ZXJ5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb2x1bW4gPSB0aGlzO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbHVtbi5pbmRleCgpID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRpdGxlID0gY29sdW1uLmhlYWRlcigpLnRleHRDb250ZW50O1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGlucHV0IGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnBsYWNlaG9sZGVyID0gdGl0bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uLmhlYWRlcigpLnJlcGxhY2VDaGlsZHJlbihpbnB1dCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgdXNlciBpbnB1dFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29sdW1uLnNlYXJjaCgpICE9PSB0aGlzLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW4uc2VhcmNoKGlucHV0LnZhbHVlKS5kcmF3KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHRoZSBsaXN0IG9mIG1vZHVsZXMgcmVjZWl2ZWQgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGlzdCBvZiBtb2R1bGVzLlxuICAgICAqL1xuICAgIGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlKSB7XG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZUxvYWRlci5oaWRlKCk7XG5cbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UubW9kdWxlcykpIHtcbiAgICAgICAgICAgIHJlc3BvbnNlLm1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBtb2R1bGUgaXMgY29tcGF0aWJsZSB3aXRoIHRoZSBQQlggYmFzZWQgb24gdmVyc2lvbiBudW1iZXJcbiAgICAgICAgICAgICAgICBjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld01vZHVsZVZlcnNpb24gPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50VmVyc2lvblBCWCA9IG1hcmtldHBsYWNlLnBieFZlcnNpb247XG4gICAgICAgICAgICAgICAgaWYgKG1hcmtldHBsYWNlLnZlcnNpb25Db21wYXJlKGN1cnJlbnRWZXJzaW9uUEJYLCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgpIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQWRkIG5ldyBtb2R1bGUgcm93XG4gICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgYWxyZWFkeSBpbnN0YWxsZWQgYW5kIG9mZmVyIGFuIHVwZGF0ZVxuICAgICAgICAgICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93W2RhdGEtaWQ9JHtvYmoudW5pcWlkfV1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJG1vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluc3RhbGxlZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVyc2lvbkNvbXBhcmVSZXN1bHQgPSBtYXJrZXRwbGFjZS52ZXJzaW9uQ29tcGFyZShuZXdNb2R1bGVWZXJzaW9uLCBpbnN0YWxsZWRWZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmVyc2lvbkNvbXBhcmVSZXN1bHQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5hZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZlcnNpb25Db21wYXJlUmVzdWx0ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5jaGFuZ2VEb3dubG9hZEJ1dHRvbk9uUm93KG9iaik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgkKCd0ci5uZXctbW9kdWxlLXJvdycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLiRub05ld01vZHVsZXNTZWdtZW50LmhpZGUoKTtcbiAgICAgICAgICAgIC8vIE9ubHkgaW5pdGlhbGl6ZSBpZiBEYXRhVGFibGUgaXMgbm90IGFscmVhZHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIGlmICghJC5mbi5EYXRhVGFibGUuaXNEYXRhVGFibGUobWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUpKSB7XG4gICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0YWJsZSBpcyBhbHJlYWR5IGluaXRpYWxpemVkLCBqdXN0IHJlZHJhdyBpdFxuICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlLkRhdGFUYWJsZSgpLmRyYXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLiRub05ld01vZHVsZXNTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgZGVzY3JpcHRpb24gZm9yIGFuIGF2YWlsYWJsZSBtb2R1bGUuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKSB7XG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlLnNob3coKTtcbiAgICAgICAgbGV0IHByb21vTGluayA9ICcnO1xuICAgICAgICBpZiAob2JqLnByb21vX2xpbmsgIT09IHVuZGVmaW5lZCAmJiBvYmoucHJvbW9fbGluayAhPT0gbnVsbCkge1xuICAgICAgICAgICAgcHJvbW9MaW5rID0gYDxicj48YSBocmVmPVwiJHtvYmoucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInB1enpsZSBwaWVjZSBpY29uXCI+PC9pPic7XG4gICAgICAgIGlmIChvYmouY29tbWVyY2lhbCAhPT0gMCkge1xuICAgICAgICAgICAgYWRkaXRpb25hbEljb24gPSAnPGkgY2xhc3M9XCJ1aSBkb25hdGUgaWNvblwiPjwvaT4nO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGR5bmFtaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGRhdGEtaWQ9XCIke29iai51bmlxaWR9XCIgZGF0YS1uYW1lPVwiJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfVwiPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwic2hvdy1kZXRhaWxzLW9uLWNsaWNrXCI+JHthZGRpdGlvbmFsSWNvbn0gJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdCAgICA8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uIHNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGljb24gYmFzaWMgYnV0dG9uIGRvd25sb2FkIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdW5pcWlkID0gXCIke29iai51bmlxaWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZlcnNpb24gPVwiJHtvYmoudmVyc2lvbn1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcmVsZWFzZWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuXHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxuICAgIFx0XHRcdFx0ICAgIDwvdGQ+XHRcdFxuXHRcdFx0PC90cj5gO1xuICAgICAgICAkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHluYW1pY1Jvdyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gdXBkYXRlIGJ1dHRvbiB0byB0aGUgbW9kdWxlIHJvdyBmb3IgdXBkYXRpbmcgYW4gb2xkIHZlcnNpb24gb2YgUEJYLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHJbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICBjb25zdCAkY3VycmVudERvd25sb2FkQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLmRvd25sb2FkJyk7XG4gICAgICAgICRjdXJyZW50RG93bmxvYWRCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b25cbiAgICAgICAgICAgID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG5cdFx0XHRkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlfVwiXG5cdFx0XHRkYXRhLXZlcnNpb24gPVwiJHtvYmoudmVyc2lvbn1cIlxuXHRcdFx0ZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG5cdFx0XHRkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG5cdFx0XHRkYXRhLXJlbGVhc2VpZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuXHRcdFx0PGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG5cdFx0XHQ8L2E+YDtcbiAgICAgICAgJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgICAgICBtYXJrZXRwbGFjZS4kYnRuVXBkYXRlQWxsTW9kdWxlcy5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgY2hhbmdlRG93bmxvYWRCdXR0b25PblJvdyhvYmopIHtcbiAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm5ldy1tb2R1bGUtcm93W2RhdGEtaWQ9JHtvYmoudW5pcWlkfV1gKTtcbiAgICAgICAgY29uc3QgJGN1cnJlbnREb3dubG9hZEJ1dHRvbiA9ICRtb2R1bGVSb3cuZmluZCgnYS5kb3dubG9hZCcpO1xuICAgICAgICAkY3VycmVudERvd25sb2FkQnV0dG9uLnJlbW92ZSgpO1xuICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uXG4gICAgICAgICAgICA9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG5cdFx0XHRkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfU2hvd01vZHVsZVJlcG9EZXRhaWxzfVwiPlxuXHRcdFx0PGkgY2xhc3M9XCJpY29uIHNlYXJjaCBibHVlXCI+PC9pPiBcblx0XHRcdDwvYT5gO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpXG4gICAgICAgICAgICAucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcbiAgICAgICAgJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5jbG9zZXN0KCd0ZCcpLmFkZENsYXNzKCdzaG93LWRldGFpbHMtb24tY2xpY2snKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZSB2ZXJzaW9ucyBvZiBtb2R1bGVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2MSAtIFRoZSBmaXJzdCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYyIC0gVGhlIHNlY29uZCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxleGljb2dyYXBoaWNhbF0gLSBXaGV0aGVyIHRvIHBlcmZvcm0gbGV4aWNvZ3JhcGhpY2FsIGNvbXBhcmlzb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnplcm9FeHRlbmRdIC0gV2VhdGhlciB0byB6ZXJvLWV4dGVuZCB0aGUgc2hvcnRlciB2ZXJzaW9uIChkZWZhdWx0OiBmYWxzZSkuXG4gICAgICogQHJldHVybnMge251bWJlcn0gLSBBIG51bWJlciBpbmRpY2F0aW5nIHRoZSBjb21wYXJpc29uIHJlc3VsdDogMCBpZiB2ZXJzaW9ucyBhcmUgZXF1YWwsIDEgaWYgdjEgaXMgZ3JlYXRlciwgLTEgaWYgdjIgaXMgZ3JlYXRlciwgb3IgTmFOIGlmIHRoZSB2ZXJzaW9ucyBhcmUgaW52YWxpZC5cbiAgICAgKi9cbiAgICB2ZXJzaW9uQ29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgbGV4aWNvZ3JhcGhpY2FsID0gb3B0aW9ucyAmJiBvcHRpb25zLmxleGljb2dyYXBoaWNhbDtcbiAgICAgICAgY29uc3QgemVyb0V4dGVuZCA9IG9wdGlvbnMgJiYgb3B0aW9ucy56ZXJvRXh0ZW5kO1xuICAgICAgICBsZXQgdjFwYXJ0cyA9IFN0cmluZyh2MSkuc3BsaXQoJy4nKTtcbiAgICAgICAgbGV0IHYycGFydHMgPSBTdHJpbmcodjIpLnNwbGl0KCcuJyk7XG5cbiAgICAgICAgZnVuY3Rpb24gaXNWYWxpZFBhcnQoeCkge1xuICAgICAgICAgICAgcmV0dXJuIChsZXhpY29ncmFwaGljYWwgPyAvXlxcZCtbQS1aYS16XSokLyA6IC9eXFxkKyQvKS50ZXN0KHgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF2MXBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSB8fCAhdjJwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkpIHtcbiAgICAgICAgICAgIHJldHVybiBOYU47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoemVyb0V4dGVuZCkge1xuICAgICAgICAgICAgd2hpbGUgKHYxcGFydHMubGVuZ3RoIDwgdjJwYXJ0cy5sZW5ndGgpIHYxcGFydHMucHVzaCgnMCcpO1xuICAgICAgICAgICAgd2hpbGUgKHYycGFydHMubGVuZ3RoIDwgdjFwYXJ0cy5sZW5ndGgpIHYycGFydHMucHVzaCgnMCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFsZXhpY29ncmFwaGljYWwpIHtcbiAgICAgICAgICAgIHYxcGFydHMgPSB2MXBhcnRzLm1hcChOdW1iZXIpO1xuICAgICAgICAgICAgdjJwYXJ0cyA9IHYycGFydHMubWFwKE51bWJlcik7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHYxcGFydHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGlmICh2MnBhcnRzLmxlbmd0aCA9PT0gaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHYxcGFydHNbaV0gPT09IHYycGFydHNbaV0pIHtcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2MXBhcnRzW2ldID4gdjJwYXJ0c1tpXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodjFwYXJ0cy5sZW5ndGggIT09IHYycGFydHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LFxuXG59OyJdfQ==