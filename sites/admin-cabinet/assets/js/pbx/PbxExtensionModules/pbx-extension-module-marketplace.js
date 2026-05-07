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
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $marketplaceTable: null,

  /**
   * jQuery object for the loader instead of available modules.
   * @type {jQuery}
   */
  $marketplaceLoader: null,

  /**
   * jQuery object for the information when no any modules available to install.
   * @type {jQuery}
   */
  $noNewModulesSegment: null,

  /**
   * Store current installed a PBX version without a div postfix
   * @type {string}
   */
  pbxVersion: globalPBXVersion.replace(/-dev/i, ''),

  /**
   * jQuery object for the button which responsible for update all installed modules
   * @type {jQuery}
   */
  $btnUpdateAllModules: null,

  /**
   * jQuery object initialized flag
   * @type {jQuery}
   */
  isInitialized: false,

  /**
   * Currently selected module_type filter value ('all' shows every row).
   * @type {string}
   */
  selectedType: 'all',

  /**
   * Registered DataTable custom filter function (so it can be removed on re-init).
   * @type {?Function}
   */
  typeFilterFn: null,

  /**
   * Initialize extensionModulesShowAvailable class
   */
  initialize: function initialize() {
    if (marketplace.isInitialized) {
      return;
    }

    marketplace.$marketplaceTable = $('#new-modules-table');
    marketplace.$marketplaceLoader = $('#new-modules-loader');
    marketplace.$noNewModulesSegment = $('#no-new-modules-segment');
    marketplace.$btnUpdateAllModules = $('#update-all-modules-button');
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
   * Register DataTable custom filter for module_type.
   * Idempotent — if called multiple times, previous filter fn is removed first.
   */
  registerTypeFilter: function registerTypeFilter() {
    if (!$.fn.DataTable || !$.fn.DataTable.ext || !$.fn.DataTable.ext.search) {
      return;
    }

    var searchStack = $.fn.DataTable.ext.search;

    if (marketplace.typeFilterFn) {
      var idx = searchStack.indexOf(marketplace.typeFilterFn);

      if (idx !== -1) {
        searchStack.splice(idx, 1);
      }
    }

    marketplace.typeFilterFn = function (settings, data, dataIndex, rowData, invalidated, row) {
      // Only apply to the marketplace table.
      if (!settings || !settings.nTable || settings.nTable.id !== 'new-modules-table') {
        return true;
      }

      if (marketplace.selectedType === 'all') {
        return true;
      }

      var rowNode = row || (settings.aoData[dataIndex] ? settings.aoData[dataIndex].nTr : null);

      if (!rowNode) {
        return true;
      }

      var rowType = $(rowNode).attr('data-type') || 'general';
      return rowType === marketplace.selectedType;
    };

    searchStack.push(marketplace.typeFilterFn);
  },

  /**
   * Collect unique module_type values from rendered rows, (re-)populate dropdown.
   * Hides the filter UI entirely if only one category is present (nothing to filter).
   */
  populateTypeFilter: function populateTypeFilter() {
    var $wrapper = $('#module-type-filter-wrapper');
    var $dropdown = $('#module-type-filter');

    if ($wrapper.length === 0 || $dropdown.length === 0) {
      return;
    }

    var typesSet = {};
    $('tr.new-module-row').each(function () {
      var type = $(this).attr('data-type') || 'general';
      typesSet[type] = true;
    });
    var types = Object.keys(typesSet).sort();

    if (types.length <= 1) {
      $wrapper.hide();
      return;
    }

    var allLabel = globalTranslate && globalTranslate.ext_ModuleTypeAll || 'All';
    var menuHtml = '<div class="item" data-value="all">' + allLabel + '</div>';
    types.forEach(function (type) {
      var label = marketplace.moduleTypeLabel(type);
      menuHtml += '<div class="item" data-value="' + type + '">' + label + '</div>';
    });
    $dropdown.find('.menu').html(menuHtml); // Preserve current selection if the type is still present; otherwise fall back to 'all'.

    var previousType = marketplace.selectedType;
    var nextType = previousType === 'all' || typesSet[previousType] ? previousType : 'all';
    $dropdown.dropdown({
      onChange: function onChange(value) {
        marketplace.applyTypeFilter(value || 'all');
      }
    });
    $dropdown.dropdown('set selected', nextType);
    $wrapper.show();
  },

  /**
   * Set active filter value and redraw the table.
   * @param {string} type
   */
  applyTypeFilter: function applyTypeFilter(type) {
    marketplace.selectedType = type || 'all';

    if ($.fn.DataTable && $.fn.DataTable.isDataTable(marketplace.$marketplaceTable)) {
      marketplace.$marketplaceTable.DataTable().draw();
    }
  },

  /**
   * Resolve UI label for a module_type. Uses globalTranslate when a known key exists,
   * otherwise falls back to the raw type string (forward-compat with new server types).
   * @param {string} type
   * @returns {string}
   */
  moduleTypeLabel: function moduleTypeLabel(type) {
    if (!type) {
      return 'General';
    } // camelCase-ify snake_case: 'call_feature' -> 'CallFeature'


    var camel = type.split('_').map(function (part) {
      if (part.length === 0) {
        return '';
      }

      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join('');
    var key = 'ext_ModuleType' + camel;

    if (globalTranslate && typeof globalTranslate[key] === 'string' && globalTranslate[key].length > 0) {
      return globalTranslate[key];
    } // Fallback: capitalized raw type (keeps the UI readable for unknown categories).


    return type.charAt(0).toUpperCase() + type.slice(1);
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
        marketplace.registerTypeFilter();
      } else {
        // If table is already initialized, just redraw it
        marketplace.$marketplaceTable.DataTable().draw();
      }

      marketplace.populateTypeFilter();
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

    var moduleType = obj.module_type && typeof obj.module_type === 'string' ? obj.module_type : 'general';
    var dynamicRow = "\n\t\t\t<tr class=\"new-module-row\" data-id=\"".concat(obj.uniqid, "\" data-name=\"").concat(decodeURIComponent(obj.name), "\" data-type=\"").concat(moduleType, "\">\n\t\t\t\t\t\t<td class=\"show-details-on-click\">").concat(additionalIcon, " ").concat(decodeURIComponent(obj.name), "<br>\n\t\t\t\t\t\t    <span class=\"features\">").concat(decodeURIComponent(obj.description), " ").concat(promoLink, "</span>\n\t\t\t\t\t\t</td>\n\t\t\t\t\t\t<td class=\"show-details-on-click\">").concat(decodeURIComponent(obj.developer), "</td>\n\t\t\t\t\t\t<td class=\"center aligned version show-details-on-click\">").concat(obj.version, "</td>\n\t\t\t\t\t\t<td class=\"right aligned collapsing\">\n    \t\t\t\t\t\t\t<div class=\"ui small basic icon buttons action-buttons\">\n                                    <a href=\"#\" class=\"ui icon basic button download popuped disable-if-no-internet\" \n                                        data-content= \"").concat(globalTranslate.ext_InstallModule, "\"\n                                        data-uniqid = \"").concat(obj.uniqid, "\"\n                                        data-size = \"").concat(obj.size, "\"\n                                        data-version =\"").concat(obj.version, "\"\n                                        data-releaseid =\"").concat(obj.release_id, "\">\n                                        <i class=\"icon download blue\"></i> \n                                    </a>\n\t\t\t\t\t\t\t\t</div>\n    \t\t\t\t    </td>\t\t\n\t\t\t</tr>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLW1hcmtldHBsYWNlLmpzIl0sIm5hbWVzIjpbIm1hcmtldHBsYWNlIiwiJG1hcmtldHBsYWNlVGFibGUiLCIkbWFya2V0cGxhY2VMb2FkZXIiLCIkbm9OZXdNb2R1bGVzU2VnbWVudCIsInBieFZlcnNpb24iLCJnbG9iYWxQQlhWZXJzaW9uIiwicmVwbGFjZSIsIiRidG5VcGRhdGVBbGxNb2R1bGVzIiwiaXNJbml0aWFsaXplZCIsInNlbGVjdGVkVHlwZSIsInR5cGVGaWx0ZXJGbiIsImluaXRpYWxpemUiLCIkIiwiTW9kdWxlc0FQSSIsImdldEF2YWlsYWJsZSIsImNiUGFyc2VNb2R1bGVVcGRhdGVzIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsIkRhdGFUYWJsZSIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsImNvbHVtbnMiLCJvcmRlcmFibGUiLCJzZWFyY2hhYmxlIiwiYXV0b1dpZHRoIiwic0RvbSIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJpbml0Q29tcGxldGUiLCJhcGkiLCJldmVyeSIsImNvbHVtbiIsImluZGV4IiwidGl0bGUiLCJoZWFkZXIiLCJ0ZXh0Q29udGVudCIsIndyYXBwZXIiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJjbGFzc05hbWUiLCJpbnB1dCIsInBsYWNlaG9sZGVyIiwidHlwZSIsInN0eWxlIiwid2lkdGgiLCJpY29uIiwiYXBwZW5kQ2hpbGQiLCJhZGRFdmVudExpc3RlbmVyIiwiZSIsInN0b3BQcm9wYWdhdGlvbiIsInNlYXJjaCIsInZhbHVlIiwiZHJhdyIsInJlZ2lzdGVyVHlwZUZpbHRlciIsImZuIiwiZXh0Iiwic2VhcmNoU3RhY2siLCJpZHgiLCJpbmRleE9mIiwic3BsaWNlIiwic2V0dGluZ3MiLCJkYXRhIiwiZGF0YUluZGV4Iiwicm93RGF0YSIsImludmFsaWRhdGVkIiwicm93IiwiblRhYmxlIiwiaWQiLCJyb3dOb2RlIiwiYW9EYXRhIiwiblRyIiwicm93VHlwZSIsImF0dHIiLCJwdXNoIiwicG9wdWxhdGVUeXBlRmlsdGVyIiwiJHdyYXBwZXIiLCIkZHJvcGRvd24iLCJsZW5ndGgiLCJ0eXBlc1NldCIsImVhY2giLCJ0eXBlcyIsIk9iamVjdCIsImtleXMiLCJzb3J0IiwiaGlkZSIsImFsbExhYmVsIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X01vZHVsZVR5cGVBbGwiLCJtZW51SHRtbCIsImZvckVhY2giLCJsYWJlbCIsIm1vZHVsZVR5cGVMYWJlbCIsImZpbmQiLCJodG1sIiwicHJldmlvdXNUeXBlIiwibmV4dFR5cGUiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiYXBwbHlUeXBlRmlsdGVyIiwic2hvdyIsImlzRGF0YVRhYmxlIiwiY2FtZWwiLCJzcGxpdCIsIm1hcCIsInBhcnQiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwidG9Mb3dlckNhc2UiLCJqb2luIiwia2V5IiwicmVzcG9uc2VEYXRhIiwiaXNTdWNjZXNzZnVsIiwibW9kdWxlcyIsIkFycmF5IiwiaXNBcnJheSIsIm9iaiIsIm1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCIsIm1pbl9wYnhfdmVyc2lvbiIsIm5ld01vZHVsZVZlcnNpb24iLCJ2ZXJzaW9uIiwiY3VycmVudFZlcnNpb25QQlgiLCJ2ZXJzaW9uQ29tcGFyZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwiJG1vZHVsZVJvdyIsInVuaXFpZCIsImluc3RhbGxlZFZlciIsInRleHQiLCJ0cmltIiwidmVyc2lvbkNvbXBhcmVSZXN1bHQiLCJhZGRVcGRhdGVCdXR0b25Ub1JvdyIsImNoYW5nZURvd25sb2FkQnV0dG9uT25Sb3ciLCJvcGVuTW9kdWxlRnJvbVF1ZXJ5UGFyYW0iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdldCIsImZpcnN0IiwidHJpZ2dlciIsImNsZWFuVXJsIiwicGF0aG5hbWUiLCJoYXNoIiwiaGlzdG9yeSIsInJlcGxhY2VTdGF0ZSIsInByb21vTGluayIsInByb21vX2xpbmsiLCJ1bmRlZmluZWQiLCJleHRfRXh0ZXJuYWxEZXNjcmlwdGlvbiIsImFkZGl0aW9uYWxJY29uIiwiY29tbWVyY2lhbCIsIm1vZHVsZVR5cGUiLCJtb2R1bGVfdHlwZSIsImR5bmFtaWNSb3ciLCJkZWNvZGVVUklDb21wb25lbnQiLCJuYW1lIiwiZGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJleHRfSW5zdGFsbE1vZHVsZSIsInNpemUiLCJyZWxlYXNlX2lkIiwiYXBwZW5kIiwiJHRhYmxlIiwidGFibGUiLCJkdFJvdyIsImFueSIsIiRyb3dOb2RlIiwibm9kZSIsIiRsYXN0Q2VsbCIsImNsb25lIiwicmVtb3ZlIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwiY2VsbEluZGV4IiwiY2VsbCIsInNldFRpbWVvdXQiLCJleHRlbnNpb25Nb2R1bGVzIiwiaW5pdGlhbGl6ZVBvcHVwcyIsImFkZFVwZGF0ZUJ1dHRvbkRpcmVjdGx5IiwiJGN1cnJlbnREb3dubG9hZEJ1dHRvbiIsIiRhY3Rpb25CdXR0b25zIiwiZXh0X1Nob3dNb2R1bGVSZXBvRGV0YWlscyIsImNsb3Nlc3QiLCJhZGRDbGFzcyIsInYxIiwidjIiLCJvcHRpb25zIiwibGV4aWNvZ3JhcGhpY2FsIiwiemVyb0V4dGVuZCIsInYxcGFydHMiLCJTdHJpbmciLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsIk5hTiIsIk51bWJlciIsImkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsV0FBVyxHQUFHO0FBRWhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUUsSUFQSDs7QUFTaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsa0JBQWtCLEVBQUUsSUFiSjs7QUFlaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsb0JBQW9CLEVBQUUsSUFuQk47O0FBcUJoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUVDLGdCQUFnQixDQUFDQyxPQUFqQixDQUF5QixPQUF6QixFQUFrQyxFQUFsQyxDQXpCSTs7QUEyQmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG9CQUFvQixFQUFFLElBL0JOOztBQWlDaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLEtBckNDOztBQXVDaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLEtBM0NFOztBQTZDaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBakRFOztBQW1EaEI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFVBdERnQix3QkFzREg7QUFDVCxRQUFJWCxXQUFXLENBQUNRLGFBQWhCLEVBQStCO0FBQzNCO0FBQ0g7O0FBQ0RSLElBQUFBLFdBQVcsQ0FBQ0MsaUJBQVosR0FBZ0NXLENBQUMsQ0FBQyxvQkFBRCxDQUFqQztBQUNBWixJQUFBQSxXQUFXLENBQUNFLGtCQUFaLEdBQWlDVSxDQUFDLENBQUMscUJBQUQsQ0FBbEM7QUFDQVosSUFBQUEsV0FBVyxDQUFDRyxvQkFBWixHQUFtQ1MsQ0FBQyxDQUFDLHlCQUFELENBQXBDO0FBQ0FaLElBQUFBLFdBQVcsQ0FBQ08sb0JBQVosR0FBbUNLLENBQUMsQ0FBQyw0QkFBRCxDQUFwQztBQUVBWixJQUFBQSxXQUFXLENBQUNRLGFBQVosR0FBNEIsSUFBNUI7QUFDQUssSUFBQUEsVUFBVSxDQUFDQyxZQUFYLENBQXdCZCxXQUFXLENBQUNlLG9CQUFwQztBQUNILEdBakVlOztBQW1FaEI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLG1CQXRFZ0IsaUNBc0VNO0FBQ2xCaEIsSUFBQUEsV0FBVyxDQUFDQyxpQkFBWixDQUE4QmdCLFNBQTlCLENBQXdDO0FBQ3BDQyxNQUFBQSxZQUFZLEVBQUUsS0FEc0I7QUFFcENDLE1BQUFBLE1BQU0sRUFBRSxLQUY0QjtBQUdwQ0MsTUFBQUEsT0FBTyxFQUFFLENBQ0w7QUFBQ0MsUUFBQUEsU0FBUyxFQUFFO0FBQVosT0FESyxFQUVMLElBRkssRUFHTDtBQUFDQSxRQUFBQSxTQUFTLEVBQUUsS0FBWjtBQUFtQkMsUUFBQUEsVUFBVSxFQUFFO0FBQS9CLE9BSEssRUFJTDtBQUFDRCxRQUFBQSxTQUFTLEVBQUUsS0FBWjtBQUFtQkMsUUFBQUEsVUFBVSxFQUFFO0FBQS9CLE9BSkssQ0FIMkI7QUFTcENDLE1BQUFBLFNBQVMsRUFBRSxLQVR5QjtBQVVwQ0MsTUFBQUEsSUFBSSxFQUFFLE9BVjhCO0FBV3BDQyxNQUFBQSxRQUFRLEVBQUVDLG9CQUFvQixDQUFDQyxxQkFYSztBQVlwQ0MsTUFBQUEsWUFBWSxFQUFFLHdCQUFZO0FBQ3RCLGFBQUtDLEdBQUwsR0FDS1QsT0FETCxHQUVLVSxLQUZMLENBRVcsWUFBWTtBQUFBOztBQUNmLGNBQUlDLE1BQU0sR0FBRyxJQUFiOztBQUNBLGNBQUlBLE1BQU0sQ0FBQ0MsS0FBUCxPQUFtQixDQUF2QixFQUEwQjtBQUN0QixnQkFBSUMsS0FBSyxHQUFHRixNQUFNLENBQUNHLE1BQVAsR0FBZ0JDLFdBQTVCLENBRHNCLENBR3RCOztBQUNBLGdCQUFJQyxPQUFPLEdBQUdDLFFBQVEsQ0FBQ0MsYUFBVCxDQUF1QixLQUF2QixDQUFkO0FBQ0FGLFlBQUFBLE9BQU8sQ0FBQ0csU0FBUixHQUFvQixvQkFBcEI7QUFDQSxnQkFBSUMsS0FBSyxHQUFHSCxRQUFRLENBQUNDLGFBQVQsQ0FBdUIsT0FBdkIsQ0FBWjtBQUNBRSxZQUFBQSxLQUFLLENBQUNDLFdBQU4sR0FBb0JSLEtBQXBCO0FBQ0FPLFlBQUFBLEtBQUssQ0FBQ0UsSUFBTixHQUFhLE1BQWI7QUFDQUYsWUFBQUEsS0FBSyxDQUFDRyxLQUFOLENBQVlDLEtBQVosR0FBb0IsT0FBcEI7QUFDQSxnQkFBSUMsSUFBSSxHQUFHUixRQUFRLENBQUNDLGFBQVQsQ0FBdUIsR0FBdkIsQ0FBWDtBQUNBTyxZQUFBQSxJQUFJLENBQUNOLFNBQUwsR0FBaUIsYUFBakI7QUFDQUgsWUFBQUEsT0FBTyxDQUFDVSxXQUFSLENBQW9CTixLQUFwQjtBQUNBSixZQUFBQSxPQUFPLENBQUNVLFdBQVIsQ0FBb0JELElBQXBCLEVBYnNCLENBZXRCOztBQUNBZCxZQUFBQSxNQUFNLENBQUNHLE1BQVAsR0FBZ0JDLFdBQWhCLEdBQThCLEVBQTlCO0FBQ0FKLFlBQUFBLE1BQU0sQ0FBQ0csTUFBUCxHQUFnQlksV0FBaEIsQ0FBNEJWLE9BQTVCLEVBakJzQixDQW1CdEI7O0FBQ0FBLFlBQUFBLE9BQU8sQ0FBQ1csZ0JBQVIsQ0FBeUIsT0FBekIsRUFBa0MsVUFBQ0MsQ0FBRDtBQUFBLHFCQUFPQSxDQUFDLENBQUNDLGVBQUYsRUFBUDtBQUFBLGFBQWxDLEVBcEJzQixDQXNCdEI7O0FBQ0FULFlBQUFBLEtBQUssQ0FBQ08sZ0JBQU4sQ0FBdUIsT0FBdkIsRUFBZ0MsWUFBTTtBQUNsQyxrQkFBSWhCLE1BQU0sQ0FBQ21CLE1BQVAsT0FBb0IsS0FBSSxDQUFDQyxLQUE3QixFQUFvQztBQUNoQ3BCLGdCQUFBQSxNQUFNLENBQUNtQixNQUFQLENBQWNWLEtBQUssQ0FBQ1csS0FBcEIsRUFBMkJDLElBQTNCO0FBQ0g7QUFDSixhQUpEO0FBS0g7QUFDSixTQWpDTDtBQWtDSDtBQS9DbUMsS0FBeEM7QUFpREgsR0F4SGU7O0FBMEhoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkE5SGdCLGdDQThISztBQUNqQixRQUFJLENBQUN6QyxDQUFDLENBQUMwQyxFQUFGLENBQUtyQyxTQUFOLElBQW1CLENBQUNMLENBQUMsQ0FBQzBDLEVBQUYsQ0FBS3JDLFNBQUwsQ0FBZXNDLEdBQW5DLElBQTBDLENBQUMzQyxDQUFDLENBQUMwQyxFQUFGLENBQUtyQyxTQUFMLENBQWVzQyxHQUFmLENBQW1CTCxNQUFsRSxFQUEwRTtBQUN0RTtBQUNIOztBQUNELFFBQU1NLFdBQVcsR0FBRzVDLENBQUMsQ0FBQzBDLEVBQUYsQ0FBS3JDLFNBQUwsQ0FBZXNDLEdBQWYsQ0FBbUJMLE1BQXZDOztBQUNBLFFBQUlsRCxXQUFXLENBQUNVLFlBQWhCLEVBQThCO0FBQzFCLFVBQU0rQyxHQUFHLEdBQUdELFdBQVcsQ0FBQ0UsT0FBWixDQUFvQjFELFdBQVcsQ0FBQ1UsWUFBaEMsQ0FBWjs7QUFDQSxVQUFJK0MsR0FBRyxLQUFLLENBQUMsQ0FBYixFQUFnQjtBQUNaRCxRQUFBQSxXQUFXLENBQUNHLE1BQVosQ0FBbUJGLEdBQW5CLEVBQXdCLENBQXhCO0FBQ0g7QUFDSjs7QUFDRHpELElBQUFBLFdBQVcsQ0FBQ1UsWUFBWixHQUEyQixVQUFVa0QsUUFBVixFQUFvQkMsSUFBcEIsRUFBMEJDLFNBQTFCLEVBQXFDQyxPQUFyQyxFQUE4Q0MsV0FBOUMsRUFBMkRDLEdBQTNELEVBQWdFO0FBQ3ZGO0FBQ0EsVUFBSSxDQUFDTCxRQUFELElBQWEsQ0FBQ0EsUUFBUSxDQUFDTSxNQUF2QixJQUFpQ04sUUFBUSxDQUFDTSxNQUFULENBQWdCQyxFQUFoQixLQUF1QixtQkFBNUQsRUFBaUY7QUFDN0UsZUFBTyxJQUFQO0FBQ0g7O0FBQ0QsVUFBSW5FLFdBQVcsQ0FBQ1MsWUFBWixLQUE2QixLQUFqQyxFQUF3QztBQUNwQyxlQUFPLElBQVA7QUFDSDs7QUFDRCxVQUFNMkQsT0FBTyxHQUFHSCxHQUFHLEtBQUtMLFFBQVEsQ0FBQ1MsTUFBVCxDQUFnQlAsU0FBaEIsSUFBNkJGLFFBQVEsQ0FBQ1MsTUFBVCxDQUFnQlAsU0FBaEIsRUFBMkJRLEdBQXhELEdBQThELElBQW5FLENBQW5COztBQUNBLFVBQUksQ0FBQ0YsT0FBTCxFQUFjO0FBQ1YsZUFBTyxJQUFQO0FBQ0g7O0FBQ0QsVUFBTUcsT0FBTyxHQUFHM0QsQ0FBQyxDQUFDd0QsT0FBRCxDQUFELENBQVdJLElBQVgsQ0FBZ0IsV0FBaEIsS0FBZ0MsU0FBaEQ7QUFDQSxhQUFPRCxPQUFPLEtBQUt2RSxXQUFXLENBQUNTLFlBQS9CO0FBQ0gsS0FkRDs7QUFlQStDLElBQUFBLFdBQVcsQ0FBQ2lCLElBQVosQ0FBaUJ6RSxXQUFXLENBQUNVLFlBQTdCO0FBQ0gsR0F6SmU7O0FBMkpoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJZ0UsRUFBQUEsa0JBL0pnQixnQ0ErSks7QUFDakIsUUFBTUMsUUFBUSxHQUFHL0QsQ0FBQyxDQUFDLDZCQUFELENBQWxCO0FBQ0EsUUFBTWdFLFNBQVMsR0FBR2hFLENBQUMsQ0FBQyxxQkFBRCxDQUFuQjs7QUFDQSxRQUFJK0QsUUFBUSxDQUFDRSxNQUFULEtBQW9CLENBQXBCLElBQXlCRCxTQUFTLENBQUNDLE1BQVYsS0FBcUIsQ0FBbEQsRUFBcUQ7QUFDakQ7QUFDSDs7QUFFRCxRQUFNQyxRQUFRLEdBQUcsRUFBakI7QUFDQWxFLElBQUFBLENBQUMsQ0FBQyxtQkFBRCxDQUFELENBQXVCbUUsSUFBdkIsQ0FBNEIsWUFBWTtBQUNwQyxVQUFNckMsSUFBSSxHQUFHOUIsQ0FBQyxDQUFDLElBQUQsQ0FBRCxDQUFRNEQsSUFBUixDQUFhLFdBQWIsS0FBNkIsU0FBMUM7QUFDQU0sTUFBQUEsUUFBUSxDQUFDcEMsSUFBRCxDQUFSLEdBQWlCLElBQWpCO0FBQ0gsS0FIRDtBQUlBLFFBQU1zQyxLQUFLLEdBQUdDLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZSixRQUFaLEVBQXNCSyxJQUF0QixFQUFkOztBQUVBLFFBQUlILEtBQUssQ0FBQ0gsTUFBTixJQUFnQixDQUFwQixFQUF1QjtBQUNuQkYsTUFBQUEsUUFBUSxDQUFDUyxJQUFUO0FBQ0E7QUFDSDs7QUFFRCxRQUFNQyxRQUFRLEdBQUlDLGVBQWUsSUFBSUEsZUFBZSxDQUFDQyxpQkFBcEMsSUFBMEQsS0FBM0U7QUFDQSxRQUFJQyxRQUFRLEdBQUcsd0NBQXdDSCxRQUF4QyxHQUFtRCxRQUFsRTtBQUNBTCxJQUFBQSxLQUFLLENBQUNTLE9BQU4sQ0FBYyxVQUFDL0MsSUFBRCxFQUFVO0FBQ3BCLFVBQU1nRCxLQUFLLEdBQUcxRixXQUFXLENBQUMyRixlQUFaLENBQTRCakQsSUFBNUIsQ0FBZDtBQUNBOEMsTUFBQUEsUUFBUSxJQUFJLG1DQUFtQzlDLElBQW5DLEdBQTBDLElBQTFDLEdBQWlEZ0QsS0FBakQsR0FBeUQsUUFBckU7QUFDSCxLQUhEO0FBSUFkLElBQUFBLFNBQVMsQ0FBQ2dCLElBQVYsQ0FBZSxPQUFmLEVBQXdCQyxJQUF4QixDQUE2QkwsUUFBN0IsRUF6QmlCLENBMkJqQjs7QUFDQSxRQUFNTSxZQUFZLEdBQUc5RixXQUFXLENBQUNTLFlBQWpDO0FBQ0EsUUFBTXNGLFFBQVEsR0FBR0QsWUFBWSxLQUFLLEtBQWpCLElBQTBCaEIsUUFBUSxDQUFDZ0IsWUFBRCxDQUFsQyxHQUFtREEsWUFBbkQsR0FBa0UsS0FBbkY7QUFFQWxCLElBQUFBLFNBQVMsQ0FBQ29CLFFBQVYsQ0FBbUI7QUFDZkMsTUFBQUEsUUFBUSxFQUFFLGtCQUFVOUMsS0FBVixFQUFpQjtBQUN2Qm5ELFFBQUFBLFdBQVcsQ0FBQ2tHLGVBQVosQ0FBNEIvQyxLQUFLLElBQUksS0FBckM7QUFDSDtBQUhjLEtBQW5CO0FBS0F5QixJQUFBQSxTQUFTLENBQUNvQixRQUFWLENBQW1CLGNBQW5CLEVBQW1DRCxRQUFuQztBQUNBcEIsSUFBQUEsUUFBUSxDQUFDd0IsSUFBVDtBQUNILEdBck1lOztBQXVNaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUQsRUFBQUEsZUEzTWdCLDJCQTJNQXhELElBM01BLEVBMk1NO0FBQ2xCMUMsSUFBQUEsV0FBVyxDQUFDUyxZQUFaLEdBQTJCaUMsSUFBSSxJQUFJLEtBQW5DOztBQUNBLFFBQUk5QixDQUFDLENBQUMwQyxFQUFGLENBQUtyQyxTQUFMLElBQWtCTCxDQUFDLENBQUMwQyxFQUFGLENBQUtyQyxTQUFMLENBQWVtRixXQUFmLENBQTJCcEcsV0FBVyxDQUFDQyxpQkFBdkMsQ0FBdEIsRUFBaUY7QUFDN0VELE1BQUFBLFdBQVcsQ0FBQ0MsaUJBQVosQ0FBOEJnQixTQUE5QixHQUEwQ21DLElBQTFDO0FBQ0g7QUFDSixHQWhOZTs7QUFrTmhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJdUMsRUFBQUEsZUF4TmdCLDJCQXdOQWpELElBeE5BLEVBd05NO0FBQ2xCLFFBQUksQ0FBQ0EsSUFBTCxFQUFXO0FBQ1AsYUFBTyxTQUFQO0FBQ0gsS0FIaUIsQ0FJbEI7OztBQUNBLFFBQU0yRCxLQUFLLEdBQUczRCxJQUFJLENBQUM0RCxLQUFMLENBQVcsR0FBWCxFQUFnQkMsR0FBaEIsQ0FBb0IsVUFBQ0MsSUFBRCxFQUFVO0FBQ3hDLFVBQUlBLElBQUksQ0FBQzNCLE1BQUwsS0FBZ0IsQ0FBcEIsRUFBdUI7QUFDbkIsZUFBTyxFQUFQO0FBQ0g7O0FBQ0QsYUFBTzJCLElBQUksQ0FBQ0MsTUFBTCxDQUFZLENBQVosRUFBZUMsV0FBZixLQUErQkYsSUFBSSxDQUFDRyxLQUFMLENBQVcsQ0FBWCxFQUFjQyxXQUFkLEVBQXRDO0FBQ0gsS0FMYSxFQUtYQyxJQUxXLENBS04sRUFMTSxDQUFkO0FBTUEsUUFBTUMsR0FBRyxHQUFHLG1CQUFtQlQsS0FBL0I7O0FBQ0EsUUFBSWYsZUFBZSxJQUFJLE9BQU9BLGVBQWUsQ0FBQ3dCLEdBQUQsQ0FBdEIsS0FBZ0MsUUFBbkQsSUFBK0R4QixlQUFlLENBQUN3QixHQUFELENBQWYsQ0FBcUJqQyxNQUFyQixHQUE4QixDQUFqRyxFQUFvRztBQUNoRyxhQUFPUyxlQUFlLENBQUN3QixHQUFELENBQXRCO0FBQ0gsS0FkaUIsQ0FlbEI7OztBQUNBLFdBQU9wRSxJQUFJLENBQUMrRCxNQUFMLENBQVksQ0FBWixFQUFlQyxXQUFmLEtBQStCaEUsSUFBSSxDQUFDaUUsS0FBTCxDQUFXLENBQVgsQ0FBdEM7QUFDSCxHQXpPZTs7QUEyT2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0k1RixFQUFBQSxvQkEvT2dCLGdDQStPS2dHLFlBL09MLEVBK09tQkMsWUEvT25CLEVBK09pQztBQUM3Q2hILElBQUFBLFdBQVcsQ0FBQ0Usa0JBQVosQ0FBK0JrRixJQUEvQixHQUQ2QyxDQUc3QztBQUNBOztBQUNBLFFBQUksQ0FBQzRCLFlBQUwsRUFBbUI7QUFDZmhILE1BQUFBLFdBQVcsQ0FBQ0csb0JBQVosQ0FBaUNnRyxJQUFqQztBQUNBO0FBQ0gsS0FSNEMsQ0FVN0M7OztBQUNBLFFBQU1jLE9BQU8sR0FBRyxDQUFBRixZQUFZLFNBQVosSUFBQUEsWUFBWSxXQUFaLFlBQUFBLFlBQVksQ0FBRUUsT0FBZCxLQUF5QixFQUF6Qzs7QUFFQSxRQUFJQyxLQUFLLENBQUNDLE9BQU4sQ0FBY0YsT0FBZCxLQUEwQkEsT0FBTyxDQUFDcEMsTUFBUixHQUFpQixDQUEvQyxFQUFrRDtBQUM5Q29DLE1BQUFBLE9BQU8sQ0FBQ3hCLE9BQVIsQ0FBZ0IsVUFBQzJCLEdBQUQsRUFBUztBQUNyQjtBQUNBLFlBQU1DLHdCQUF3QixHQUFHRCxHQUFHLENBQUNFLGVBQXJDO0FBQ0EsWUFBTUMsZ0JBQWdCLEdBQUdILEdBQUcsQ0FBQ0ksT0FBN0I7QUFDQSxZQUFNQyxpQkFBaUIsR0FBR3pILFdBQVcsQ0FBQ0ksVUFBdEM7O0FBQ0EsWUFBSUosV0FBVyxDQUFDMEgsY0FBWixDQUEyQkQsaUJBQTNCLEVBQThDSix3QkFBOUMsSUFBMEUsQ0FBOUUsRUFBaUY7QUFDN0U7QUFDSCxTQVBvQixDQVNyQjs7O0FBQ0FySCxRQUFBQSxXQUFXLENBQUMySCxvQkFBWixDQUFpQ1AsR0FBakMsRUFWcUIsQ0FZckI7O0FBQ0EsWUFBTVEsVUFBVSxHQUFHaEgsQ0FBQyxpQ0FBMEJ3RyxHQUFHLENBQUNTLE1BQTlCLE9BQXBCOztBQUNBLFlBQUlELFVBQVUsQ0FBQy9DLE1BQVgsR0FBb0IsQ0FBeEIsRUFBMkI7QUFDdkIsY0FBTWlELFlBQVksR0FBR0YsVUFBVSxDQUFDaEMsSUFBWCxDQUFnQixZQUFoQixFQUE4Qm1DLElBQTlCLEdBQXFDQyxJQUFyQyxFQUFyQjtBQUNBLGNBQU1DLG9CQUFvQixHQUFHakksV0FBVyxDQUFDMEgsY0FBWixDQUEyQkgsZ0JBQTNCLEVBQTZDTyxZQUE3QyxDQUE3Qjs7QUFDQSxjQUFJRyxvQkFBb0IsR0FBRyxDQUEzQixFQUE4QjtBQUMxQmpJLFlBQUFBLFdBQVcsQ0FBQ2tJLG9CQUFaLENBQWlDZCxHQUFqQztBQUNILFdBRkQsTUFFTyxJQUFJYSxvQkFBb0IsS0FBSyxDQUE3QixFQUFnQztBQUNuQ2pJLFlBQUFBLFdBQVcsQ0FBQ21JLHlCQUFaLENBQXNDZixHQUF0QztBQUNIO0FBQ0o7QUFDSixPQXZCRDtBQXdCSDs7QUFFRCxRQUFJeEcsQ0FBQyxDQUFDLG1CQUFELENBQUQsQ0FBdUJpRSxNQUF2QixHQUFnQyxDQUFwQyxFQUF1QztBQUNuQzdFLE1BQUFBLFdBQVcsQ0FBQ0csb0JBQVosQ0FBaUNpRixJQUFqQyxHQURtQyxDQUVuQzs7QUFDQSxVQUFJLENBQUN4RSxDQUFDLENBQUMwQyxFQUFGLENBQUtyQyxTQUFMLENBQWVtRixXQUFmLENBQTJCcEcsV0FBVyxDQUFDQyxpQkFBdkMsQ0FBTCxFQUFnRTtBQUM1REQsUUFBQUEsV0FBVyxDQUFDZ0IsbUJBQVo7QUFDQWhCLFFBQUFBLFdBQVcsQ0FBQ3FELGtCQUFaO0FBQ0gsT0FIRCxNQUdPO0FBQ0g7QUFDQXJELFFBQUFBLFdBQVcsQ0FBQ0MsaUJBQVosQ0FBOEJnQixTQUE5QixHQUEwQ21DLElBQTFDO0FBQ0g7O0FBQ0RwRCxNQUFBQSxXQUFXLENBQUMwRSxrQkFBWjtBQUNILEtBWEQsTUFXTztBQUNIMUUsTUFBQUEsV0FBVyxDQUFDRyxvQkFBWixDQUFpQ2dHLElBQWpDO0FBQ0gsS0FyRDRDLENBdUQ3Qzs7O0FBQ0FuRyxJQUFBQSxXQUFXLENBQUNvSSx3QkFBWjtBQUNILEdBeFNlOztBQTBTaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUEsRUFBQUEsd0JBOVNnQixzQ0E4U1c7QUFDdkIsUUFBTUMsU0FBUyxHQUFHLElBQUlDLGVBQUosQ0FBb0JDLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQnRGLE1BQXBDLENBQWxCO0FBQ0EsUUFBTTJFLE1BQU0sR0FBR1EsU0FBUyxDQUFDSSxHQUFWLENBQWMsUUFBZCxDQUFmOztBQUNBLFFBQUksQ0FBQ1osTUFBTCxFQUFhO0FBQ1Q7QUFDSDs7QUFDRCxRQUFNRCxVQUFVLEdBQUdoSCxDQUFDLHFDQUE4QmlILE1BQTlCLE9BQXBCOztBQUNBLFFBQUlELFVBQVUsQ0FBQy9DLE1BQVgsR0FBb0IsQ0FBeEIsRUFBMkI7QUFDdkIrQyxNQUFBQSxVQUFVLENBQUNoQyxJQUFYLENBQWdCLDBCQUFoQixFQUE0QzhDLEtBQTVDLEdBQW9EQyxPQUFwRCxDQUE0RCxPQUE1RDtBQUNILEtBVHNCLENBVXZCOzs7QUFDQSxRQUFNQyxRQUFRLEdBQUdMLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkssUUFBaEIsR0FBMkJOLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQk0sSUFBNUQ7QUFDQVAsSUFBQUEsTUFBTSxDQUFDUSxPQUFQLENBQWVDLFlBQWYsQ0FBNEIsSUFBNUIsRUFBa0MsRUFBbEMsRUFBc0NKLFFBQXRDO0FBQ0gsR0EzVGU7O0FBNlRoQjtBQUNKO0FBQ0E7QUFDQTtBQUNJakIsRUFBQUEsb0JBalVnQixnQ0FpVUtQLEdBalVMLEVBaVVVO0FBQ3RCcEgsSUFBQUEsV0FBVyxDQUFDQyxpQkFBWixDQUE4QmtHLElBQTlCO0FBQ0EsUUFBSThDLFNBQVMsR0FBRyxFQUFoQjs7QUFDQSxRQUFJN0IsR0FBRyxDQUFDOEIsVUFBSixLQUFtQkMsU0FBbkIsSUFBZ0MvQixHQUFHLENBQUM4QixVQUFKLEtBQW1CLElBQXZELEVBQTZEO0FBQ3pERCxNQUFBQSxTQUFTLDJCQUFtQjdCLEdBQUcsQ0FBQzhCLFVBQXZCLGtDQUFzRDVELGVBQWUsQ0FBQzhELHVCQUF0RSxTQUFUO0FBQ0g7O0FBRUQsUUFBSUMsY0FBYyxHQUFHLG1DQUFyQjs7QUFDQSxRQUFJakMsR0FBRyxDQUFDa0MsVUFBSixLQUFtQixDQUF2QixFQUEwQjtBQUN0QkQsTUFBQUEsY0FBYyxHQUFHLGdDQUFqQjtBQUNIOztBQUNELFFBQU1FLFVBQVUsR0FBSW5DLEdBQUcsQ0FBQ29DLFdBQUosSUFBbUIsT0FBT3BDLEdBQUcsQ0FBQ29DLFdBQVgsS0FBMkIsUUFBL0MsR0FDYnBDLEdBQUcsQ0FBQ29DLFdBRFMsR0FFYixTQUZOO0FBR0EsUUFBTUMsVUFBVSw0REFDaUJyQyxHQUFHLENBQUNTLE1BRHJCLDRCQUMyQzZCLGtCQUFrQixDQUFDdEMsR0FBRyxDQUFDdUMsSUFBTCxDQUQ3RCw0QkFDdUZKLFVBRHZGLGtFQUVrQkYsY0FGbEIsY0FFb0NLLGtCQUFrQixDQUFDdEMsR0FBRyxDQUFDdUMsSUFBTCxDQUZ0RCw0REFHV0Qsa0JBQWtCLENBQUN0QyxHQUFHLENBQUN3QyxXQUFMLENBSDdCLGNBR2tEWCxTQUhsRCx5RkFLa0JTLGtCQUFrQixDQUFDdEMsR0FBRyxDQUFDeUMsU0FBTCxDQUxwQywyRkFNeUN6QyxHQUFHLENBQUNJLE9BTjdDLDBVQVVpQ2xDLGVBQWUsQ0FBQ3dFLGlCQVZqRCx5RUFXaUMxQyxHQUFHLENBQUNTLE1BWHJDLHVFQVkrQlQsR0FBRyxDQUFDMkMsSUFabkMseUVBYWlDM0MsR0FBRyxDQUFDSSxPQWJyQywyRUFjbUNKLEdBQUcsQ0FBQzRDLFVBZHZDLGlNQUFoQjtBQW9CQXBKLElBQUFBLENBQUMsQ0FBQywwQkFBRCxDQUFELENBQThCcUosTUFBOUIsQ0FBcUNSLFVBQXJDO0FBQ0gsR0FwV2U7O0FBc1doQjtBQUNKO0FBQ0E7QUFDQTtBQUNJdkIsRUFBQUEsb0JBMVdnQixnQ0EwV0tkLEdBMVdMLEVBMFdVO0FBQ3RCLFFBQU1RLFVBQVUsR0FBR2hILENBQUMsaUNBQTBCd0csR0FBRyxDQUFDUyxNQUE5QixPQUFwQixDQURzQixDQUd0Qjs7QUFDQSxRQUFNcUMsTUFBTSxHQUFHdEosQ0FBQyxDQUFDLDBCQUFELENBQWhCOztBQUNBLFFBQUlBLENBQUMsQ0FBQzBDLEVBQUYsQ0FBS3JDLFNBQUwsSUFBa0JMLENBQUMsQ0FBQzBDLEVBQUYsQ0FBS3JDLFNBQUwsQ0FBZW1GLFdBQWYsQ0FBMkI4RCxNQUEzQixDQUF0QixFQUEwRDtBQUN0RCxVQUFNQyxLQUFLLEdBQUdELE1BQU0sQ0FBQ2pKLFNBQVAsRUFBZCxDQURzRCxDQUd0RDs7QUFDQSxVQUFNbUosS0FBSyxHQUFHRCxLQUFLLENBQUNsRyxHQUFOLENBQVUyRCxVQUFWLENBQWQ7O0FBRUEsVUFBSXdDLEtBQUssQ0FBQ0MsR0FBTixFQUFKLEVBQWlCO0FBQ2I7QUFDQSxZQUFNQyxRQUFRLEdBQUcxSixDQUFDLENBQUN3SixLQUFLLENBQUNHLElBQU4sRUFBRCxDQUFsQixDQUZhLENBSWI7O0FBQ0EsWUFBTUMsU0FBUyxHQUFHRixRQUFRLENBQUMxRSxJQUFULENBQWMsU0FBZCxFQUF5QjZFLEtBQXpCLEVBQWxCLENBTGEsQ0FPYjs7QUFDQUQsUUFBQUEsU0FBUyxDQUFDNUUsSUFBVixDQUFlLFlBQWYsRUFBNkI4RSxNQUE3QixHQVJhLENBVWI7O0FBQ0EsWUFBTUMsYUFBYSxxSUFDQ3JGLGVBQWUsQ0FBQ3NGLGdCQURqQixxREFFRXhELEdBQUcsQ0FBQ0ksT0FGTixtREFHQUosR0FBRyxDQUFDMkMsSUFISixvREFJQzNDLEdBQUcsQ0FBQ1MsTUFKTCx3REFLSVQsR0FBRyxDQUFDNEMsVUFMUix5RkFBbkIsQ0FYYSxDQW9CYjs7QUFDQVEsUUFBQUEsU0FBUyxDQUFDNUUsSUFBVixDQUFlLGlCQUFmLEVBQWtDaUYsT0FBbEMsQ0FBMENGLGFBQTFDLEVBckJhLENBdUJiOztBQUNBLFlBQU1HLFNBQVMsR0FBR1IsUUFBUSxDQUFDMUUsSUFBVCxDQUFjLElBQWQsRUFBb0JmLE1BQXBCLEdBQTZCLENBQS9DLENBeEJhLENBd0JxQzs7QUFDbERzRixRQUFBQSxLQUFLLENBQUNZLElBQU4sQ0FBV1gsS0FBWCxFQUFrQlUsU0FBbEIsRUFBNkJqSCxJQUE3QixDQUFrQzJHLFNBQVMsQ0FBQzNFLElBQVYsRUFBbEMsRUFBb0R6QyxJQUFwRCxDQUF5RCxLQUF6RCxFQXpCYSxDQTJCYjs7QUFDQTRILFFBQUFBLFVBQVUsQ0FBQyxZQUFNO0FBQ2JDLFVBQUFBLGdCQUFnQixDQUFDQyxnQkFBakI7QUFDSCxTQUZTLEVBRVAsR0FGTyxDQUFWO0FBR0gsT0EvQkQsTUErQk87QUFDSDtBQUNBLGFBQUtDLHVCQUFMLENBQTZCdkQsVUFBN0IsRUFBeUNSLEdBQXpDO0FBQ0g7QUFDSixLQXpDRCxNQXlDTztBQUNIO0FBQ0EsV0FBSytELHVCQUFMLENBQTZCdkQsVUFBN0IsRUFBeUNSLEdBQXpDO0FBQ0g7O0FBRURwSCxJQUFBQSxXQUFXLENBQUNPLG9CQUFaLENBQWlDNEYsSUFBakM7QUFDSCxHQTlaZTs7QUFnYWhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWdGLEVBQUFBLHVCQXJhZ0IsbUNBcWFRdkQsVUFyYVIsRUFxYW9CUixHQXJhcEIsRUFxYXlCO0FBQ3JDLFFBQU1nRSxzQkFBc0IsR0FBR3hELFVBQVUsQ0FBQ2hDLElBQVgsQ0FBZ0IsWUFBaEIsQ0FBL0I7QUFDQXdGLElBQUFBLHNCQUFzQixDQUFDVixNQUF2QjtBQUVBLFFBQU1DLGFBQWEsNkhBQ0NyRixlQUFlLENBQUNzRixnQkFEakIsNkNBRUV4RCxHQUFHLENBQUNJLE9BRk4sMkNBR0FKLEdBQUcsQ0FBQzJDLElBSEosNENBSUMzQyxHQUFHLENBQUNTLE1BSkwsZ0RBS0lULEdBQUcsQ0FBQzRDLFVBTFIseUVBQW5CO0FBU0EsUUFBTXFCLGNBQWMsR0FBR3pELFVBQVUsQ0FBQ2hDLElBQVgsQ0FBZ0IsaUJBQWhCLENBQXZCO0FBQ0F5RixJQUFBQSxjQUFjLENBQUNSLE9BQWYsQ0FBdUJGLGFBQXZCLEVBZHFDLENBZ0JyQzs7QUFDQU0sSUFBQUEsZ0JBQWdCLENBQUNDLGdCQUFqQjtBQUNILEdBdmJlOztBQXliaEI7QUFDSjtBQUNBO0FBQ0E7QUFDSS9DLEVBQUFBLHlCQTdiZ0IscUNBNmJVZixHQTdiVixFQTZiZTtBQUMzQixRQUFNUSxVQUFVLEdBQUdoSCxDQUFDLHFDQUE4QndHLEdBQUcsQ0FBQ1MsTUFBbEMsT0FBcEI7QUFDQSxRQUFNdUQsc0JBQXNCLEdBQUd4RCxVQUFVLENBQUNoQyxJQUFYLENBQWdCLFlBQWhCLENBQS9CO0FBQ0F3RixJQUFBQSxzQkFBc0IsQ0FBQ1YsTUFBdkI7QUFDQSxRQUFNQyxhQUFhLGdIQUVSckYsZUFBZSxDQUFDZ0cseUJBRlIsK0RBQW5CO0FBS0ExRCxJQUFBQSxVQUFVLENBQUNoQyxJQUFYLENBQWdCLGlCQUFoQixFQUNLaUYsT0FETCxDQUNhRixhQURiO0FBRUEvQyxJQUFBQSxVQUFVLENBQUNoQyxJQUFYLENBQWdCLGlCQUFoQixFQUFtQzJGLE9BQW5DLENBQTJDLElBQTNDLEVBQWlEQyxRQUFqRCxDQUEwRCx1QkFBMUQ7QUFDSCxHQXpjZTs7QUEyY2hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJOUQsRUFBQUEsY0FwZGdCLDBCQW9kRCtELEVBcGRDLEVBb2RHQyxFQXBkSCxFQW9kT0MsT0FwZFAsRUFvZGdCO0FBQzVCLFFBQU1DLGVBQWUsR0FBR0QsT0FBTyxJQUFJQSxPQUFPLENBQUNDLGVBQTNDO0FBQ0EsUUFBTUMsVUFBVSxHQUFHRixPQUFPLElBQUlBLE9BQU8sQ0FBQ0UsVUFBdEM7QUFDQSxRQUFJQyxPQUFPLEdBQUdDLE1BQU0sQ0FBQ04sRUFBRCxDQUFOLENBQVduRixLQUFYLENBQWlCLEdBQWpCLENBQWQ7QUFDQSxRQUFJMEYsT0FBTyxHQUFHRCxNQUFNLENBQUNMLEVBQUQsQ0FBTixDQUFXcEYsS0FBWCxDQUFpQixHQUFqQixDQUFkOztBQUVBLGFBQVMyRixXQUFULENBQXFCQyxDQUFyQixFQUF3QjtBQUNwQixhQUFPLENBQUNOLGVBQWUsR0FBRyxnQkFBSCxHQUFzQixPQUF0QyxFQUErQ08sSUFBL0MsQ0FBb0RELENBQXBELENBQVA7QUFDSDs7QUFFRCxRQUFJLENBQUNKLE9BQU8sQ0FBQ2hLLEtBQVIsQ0FBY21LLFdBQWQsQ0FBRCxJQUErQixDQUFDRCxPQUFPLENBQUNsSyxLQUFSLENBQWNtSyxXQUFkLENBQXBDLEVBQWdFO0FBQzVELGFBQU9HLEdBQVA7QUFDSDs7QUFFRCxRQUFJUCxVQUFKLEVBQWdCO0FBQ1osYUFBT0MsT0FBTyxDQUFDakgsTUFBUixHQUFpQm1ILE9BQU8sQ0FBQ25ILE1BQWhDO0FBQXdDaUgsUUFBQUEsT0FBTyxDQUFDckgsSUFBUixDQUFhLEdBQWI7QUFBeEM7O0FBQ0EsYUFBT3VILE9BQU8sQ0FBQ25ILE1BQVIsR0FBaUJpSCxPQUFPLENBQUNqSCxNQUFoQztBQUF3Q21ILFFBQUFBLE9BQU8sQ0FBQ3ZILElBQVIsQ0FBYSxHQUFiO0FBQXhDO0FBQ0g7O0FBRUQsUUFBSSxDQUFDbUgsZUFBTCxFQUFzQjtBQUNsQkUsTUFBQUEsT0FBTyxHQUFHQSxPQUFPLENBQUN2RixHQUFSLENBQVk4RixNQUFaLENBQVY7QUFDQUwsTUFBQUEsT0FBTyxHQUFHQSxPQUFPLENBQUN6RixHQUFSLENBQVk4RixNQUFaLENBQVY7QUFDSDs7QUFFRCxTQUFLLElBQUlDLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUdSLE9BQU8sQ0FBQ2pILE1BQTVCLEVBQW9DeUgsQ0FBQyxJQUFJLENBQXpDLEVBQTRDO0FBQ3hDLFVBQUlOLE9BQU8sQ0FBQ25ILE1BQVIsS0FBbUJ5SCxDQUF2QixFQUEwQjtBQUN0QixlQUFPLENBQVA7QUFDSDs7QUFDRCxVQUFJUixPQUFPLENBQUNRLENBQUQsQ0FBUCxLQUFlTixPQUFPLENBQUNNLENBQUQsQ0FBMUIsRUFBK0IsQ0FDM0I7QUFDSCxPQUZELE1BRU8sSUFBSVIsT0FBTyxDQUFDUSxDQUFELENBQVAsR0FBYU4sT0FBTyxDQUFDTSxDQUFELENBQXhCLEVBQTZCO0FBQ2hDLGVBQU8sQ0FBUDtBQUNILE9BRk0sTUFFQTtBQUNILGVBQU8sQ0FBQyxDQUFSO0FBQ0g7QUFDSjs7QUFFRCxRQUFJUixPQUFPLENBQUNqSCxNQUFSLEtBQW1CbUgsT0FBTyxDQUFDbkgsTUFBL0IsRUFBdUM7QUFDbkMsYUFBTyxDQUFDLENBQVI7QUFDSDs7QUFFRCxXQUFPLENBQVA7QUFDSDtBQTlmZSxDQUFwQixDLENBa2dCQTs7QUFDQTBELE1BQU0sQ0FBQ3ZJLFdBQVAsR0FBcUJBLFdBQXJCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIFBieEFwaSwgZ2xvYmFsVHJhbnNsYXRlLCBnbG9iYWxQQlhWZXJzaW9uLCBNb2R1bGVzQVBJICovXG5cbi8qKlxuICogUmVwcmVzZW50cyBsaXN0IG9mIGV4dGVuc2lvbiBtb2R1bGVzLlxuICogQGNsYXNzIG1hcmtldHBsYWNlXG4gKiBAbWVtYmVyb2YgbW9kdWxlOlBieEV4dGVuc2lvbk1vZHVsZXNcbiAqL1xuY29uc3QgbWFya2V0cGxhY2UgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFibGUgd2l0aCBhdmFpbGFibGUgbW9kdWxlcy5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFya2V0cGxhY2VUYWJsZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2FkZXIgaW5zdGVhZCBvZiBhdmFpbGFibGUgbW9kdWxlcy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYXJrZXRwbGFjZUxvYWRlcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBpbmZvcm1hdGlvbiB3aGVuIG5vIGFueSBtb2R1bGVzIGF2YWlsYWJsZSB0byBpbnN0YWxsLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG5vTmV3TW9kdWxlc1NlZ21lbnQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBTdG9yZSBjdXJyZW50IGluc3RhbGxlZCBhIFBCWCB2ZXJzaW9uIHdpdGhvdXQgYSBkaXYgcG9zdGZpeFxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBidXR0b24gd2hpY2ggcmVzcG9uc2libGUgZm9yIHVwZGF0ZSBhbGwgaW5zdGFsbGVkIG1vZHVsZXNcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRidG5VcGRhdGVBbGxNb2R1bGVzOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBpbml0aWFsaXplZCBmbGFnXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICBpc0luaXRpYWxpemVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnRseSBzZWxlY3RlZCBtb2R1bGVfdHlwZSBmaWx0ZXIgdmFsdWUgKCdhbGwnIHNob3dzIGV2ZXJ5IHJvdykuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBzZWxlY3RlZFR5cGU6ICdhbGwnLFxuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXJlZCBEYXRhVGFibGUgY3VzdG9tIGZpbHRlciBmdW5jdGlvbiAoc28gaXQgY2FuIGJlIHJlbW92ZWQgb24gcmUtaW5pdCkuXG4gICAgICogQHR5cGUgez9GdW5jdGlvbn1cbiAgICAgKi9cbiAgICB0eXBlRmlsdGVyRm46IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGV4dGVuc2lvbk1vZHVsZXNTaG93QXZhaWxhYmxlIGNsYXNzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaWYgKG1hcmtldHBsYWNlLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZSA9ICQoJyNuZXctbW9kdWxlcy10YWJsZScpO1xuICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VMb2FkZXIgPSAkKCcjbmV3LW1vZHVsZXMtbG9hZGVyJyk7XG4gICAgICAgIG1hcmtldHBsYWNlLiRub05ld01vZHVsZXNTZWdtZW50ID0gJCgnI25vLW5ldy1tb2R1bGVzLXNlZ21lbnQnKTtcbiAgICAgICAgbWFya2V0cGxhY2UuJGJ0blVwZGF0ZUFsbE1vZHVsZXMgPSAkKCcjdXBkYXRlLWFsbC1tb2R1bGVzLWJ1dHRvbicpO1xuXG4gICAgICAgIG1hcmtldHBsYWNlLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgICAgICBNb2R1bGVzQVBJLmdldEF2YWlsYWJsZShtYXJrZXRwbGFjZS5jYlBhcnNlTW9kdWxlVXBkYXRlcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGF0YSB0YWJsZXMgb24gdGFibGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGF0YVRhYmxlKCkge1xuICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZS5EYXRhVGFibGUoe1xuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBjb2x1bW5zOiBbXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgICAgIG51bGwsXG4gICAgICAgICAgICAgICAge29yZGVyYWJsZTogZmFsc2UsIHNlYXJjaGFibGU6IGZhbHNlfSxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGF1dG9XaWR0aDogZmFsc2UsXG4gICAgICAgICAgICBzRG9tOiAnbHJ0aXAnLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGluaXRDb21wbGV0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBpKClcbiAgICAgICAgICAgICAgICAgICAgLmNvbHVtbnMoKVxuICAgICAgICAgICAgICAgICAgICAuZXZlcnkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbHVtbiA9IHRoaXM7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29sdW1uLmluZGV4KCkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGl0bGUgPSBjb2x1bW4uaGVhZGVyKCkudGV4dENvbnRlbnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgY29tcGFjdCBzZWFyY2ggaW5wdXQgaW4gRm9tYW50aWMgVUkgc3R5bGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgd3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyYXBwZXIuY2xhc3NOYW1lID0gJ3VpIG1pbmkgaWNvbiBpbnB1dCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5wbGFjZWhvbGRlciA9IHRpdGxlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnR5cGUgPSAndGV4dCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuc3R5bGUud2lkdGggPSAnMjAwcHgnO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpY29uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGljb24uY2xhc3NOYW1lID0gJ3NlYXJjaCBpY29uJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cmFwcGVyLmFwcGVuZENoaWxkKGlucHV0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cmFwcGVyLmFwcGVuZENoaWxkKGljb24pO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gS2VlcCB0aGUgaGVhZGVyIHRleHQgZm9yIHNvcnRpbmcsIGFkZCBpbnB1dCBuZXh0IHRvIGl0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uLmhlYWRlcigpLnRleHRDb250ZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uLmhlYWRlcigpLmFwcGVuZENoaWxkKHdyYXBwZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUHJldmVudCBpbnB1dCBjbGlja3MgZnJvbSB0cmlnZ2VyaW5nIGNvbHVtbiBzb3J0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JhcHBlci5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiBlLnN0b3BQcm9wYWdhdGlvbigpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciB1c2VyIGlucHV0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2x1bW4uc2VhcmNoKCkgIT09IHRoaXMudmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbHVtbi5zZWFyY2goaW5wdXQudmFsdWUpLmRyYXcoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyIERhdGFUYWJsZSBjdXN0b20gZmlsdGVyIGZvciBtb2R1bGVfdHlwZS5cbiAgICAgKiBJZGVtcG90ZW50IOKAlCBpZiBjYWxsZWQgbXVsdGlwbGUgdGltZXMsIHByZXZpb3VzIGZpbHRlciBmbiBpcyByZW1vdmVkIGZpcnN0LlxuICAgICAqL1xuICAgIHJlZ2lzdGVyVHlwZUZpbHRlcigpIHtcbiAgICAgICAgaWYgKCEkLmZuLkRhdGFUYWJsZSB8fCAhJC5mbi5EYXRhVGFibGUuZXh0IHx8ICEkLmZuLkRhdGFUYWJsZS5leHQuc2VhcmNoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgc2VhcmNoU3RhY2sgPSAkLmZuLkRhdGFUYWJsZS5leHQuc2VhcmNoO1xuICAgICAgICBpZiAobWFya2V0cGxhY2UudHlwZUZpbHRlckZuKSB7XG4gICAgICAgICAgICBjb25zdCBpZHggPSBzZWFyY2hTdGFjay5pbmRleE9mKG1hcmtldHBsYWNlLnR5cGVGaWx0ZXJGbik7XG4gICAgICAgICAgICBpZiAoaWR4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgIHNlYXJjaFN0YWNrLnNwbGljZShpZHgsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG1hcmtldHBsYWNlLnR5cGVGaWx0ZXJGbiA9IGZ1bmN0aW9uIChzZXR0aW5ncywgZGF0YSwgZGF0YUluZGV4LCByb3dEYXRhLCBpbnZhbGlkYXRlZCwgcm93KSB7XG4gICAgICAgICAgICAvLyBPbmx5IGFwcGx5IHRvIHRoZSBtYXJrZXRwbGFjZSB0YWJsZS5cbiAgICAgICAgICAgIGlmICghc2V0dGluZ3MgfHwgIXNldHRpbmdzLm5UYWJsZSB8fCBzZXR0aW5ncy5uVGFibGUuaWQgIT09ICduZXctbW9kdWxlcy10YWJsZScpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtYXJrZXRwbGFjZS5zZWxlY3RlZFR5cGUgPT09ICdhbGwnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByb3dOb2RlID0gcm93IHx8IChzZXR0aW5ncy5hb0RhdGFbZGF0YUluZGV4XSA/IHNldHRpbmdzLmFvRGF0YVtkYXRhSW5kZXhdLm5UciA6IG51bGwpO1xuICAgICAgICAgICAgaWYgKCFyb3dOb2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByb3dUeXBlID0gJChyb3dOb2RlKS5hdHRyKCdkYXRhLXR5cGUnKSB8fCAnZ2VuZXJhbCc7XG4gICAgICAgICAgICByZXR1cm4gcm93VHlwZSA9PT0gbWFya2V0cGxhY2Uuc2VsZWN0ZWRUeXBlO1xuICAgICAgICB9O1xuICAgICAgICBzZWFyY2hTdGFjay5wdXNoKG1hcmtldHBsYWNlLnR5cGVGaWx0ZXJGbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbGxlY3QgdW5pcXVlIG1vZHVsZV90eXBlIHZhbHVlcyBmcm9tIHJlbmRlcmVkIHJvd3MsIChyZS0pcG9wdWxhdGUgZHJvcGRvd24uXG4gICAgICogSGlkZXMgdGhlIGZpbHRlciBVSSBlbnRpcmVseSBpZiBvbmx5IG9uZSBjYXRlZ29yeSBpcyBwcmVzZW50IChub3RoaW5nIHRvIGZpbHRlcikuXG4gICAgICovXG4gICAgcG9wdWxhdGVUeXBlRmlsdGVyKCkge1xuICAgICAgICBjb25zdCAkd3JhcHBlciA9ICQoJyNtb2R1bGUtdHlwZS1maWx0ZXItd3JhcHBlcicpO1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCcjbW9kdWxlLXR5cGUtZmlsdGVyJyk7XG4gICAgICAgIGlmICgkd3JhcHBlci5sZW5ndGggPT09IDAgfHwgJGRyb3Bkb3duLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdHlwZXNTZXQgPSB7fTtcbiAgICAgICAgJCgndHIubmV3LW1vZHVsZS1yb3cnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtdHlwZScpIHx8ICdnZW5lcmFsJztcbiAgICAgICAgICAgIHR5cGVzU2V0W3R5cGVdID0gdHJ1ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IHR5cGVzID0gT2JqZWN0LmtleXModHlwZXNTZXQpLnNvcnQoKTtcblxuICAgICAgICBpZiAodHlwZXMubGVuZ3RoIDw9IDEpIHtcbiAgICAgICAgICAgICR3cmFwcGVyLmhpZGUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGFsbExhYmVsID0gKGdsb2JhbFRyYW5zbGF0ZSAmJiBnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZVR5cGVBbGwpIHx8ICdBbGwnO1xuICAgICAgICBsZXQgbWVudUh0bWwgPSAnPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiYWxsXCI+JyArIGFsbExhYmVsICsgJzwvZGl2Pic7XG4gICAgICAgIHR5cGVzLmZvckVhY2goKHR5cGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGxhYmVsID0gbWFya2V0cGxhY2UubW9kdWxlVHlwZUxhYmVsKHR5cGUpO1xuICAgICAgICAgICAgbWVudUh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCIgZGF0YS12YWx1ZT1cIicgKyB0eXBlICsgJ1wiPicgKyBsYWJlbCArICc8L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgJGRyb3Bkb3duLmZpbmQoJy5tZW51JykuaHRtbChtZW51SHRtbCk7XG5cbiAgICAgICAgLy8gUHJlc2VydmUgY3VycmVudCBzZWxlY3Rpb24gaWYgdGhlIHR5cGUgaXMgc3RpbGwgcHJlc2VudDsgb3RoZXJ3aXNlIGZhbGwgYmFjayB0byAnYWxsJy5cbiAgICAgICAgY29uc3QgcHJldmlvdXNUeXBlID0gbWFya2V0cGxhY2Uuc2VsZWN0ZWRUeXBlO1xuICAgICAgICBjb25zdCBuZXh0VHlwZSA9IHByZXZpb3VzVHlwZSA9PT0gJ2FsbCcgfHwgdHlwZXNTZXRbcHJldmlvdXNUeXBlXSA/IHByZXZpb3VzVHlwZSA6ICdhbGwnO1xuXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuYXBwbHlUeXBlRmlsdGVyKHZhbHVlIHx8ICdhbGwnKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIG5leHRUeXBlKTtcbiAgICAgICAgJHdyYXBwZXIuc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgYWN0aXZlIGZpbHRlciB2YWx1ZSBhbmQgcmVkcmF3IHRoZSB0YWJsZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZVxuICAgICAqL1xuICAgIGFwcGx5VHlwZUZpbHRlcih0eXBlKSB7XG4gICAgICAgIG1hcmtldHBsYWNlLnNlbGVjdGVkVHlwZSA9IHR5cGUgfHwgJ2FsbCc7XG4gICAgICAgIGlmICgkLmZuLkRhdGFUYWJsZSAmJiAkLmZuLkRhdGFUYWJsZS5pc0RhdGFUYWJsZShtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZSkpIHtcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlLkRhdGFUYWJsZSgpLmRyYXcoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXNvbHZlIFVJIGxhYmVsIGZvciBhIG1vZHVsZV90eXBlLiBVc2VzIGdsb2JhbFRyYW5zbGF0ZSB3aGVuIGEga25vd24ga2V5IGV4aXN0cyxcbiAgICAgKiBvdGhlcndpc2UgZmFsbHMgYmFjayB0byB0aGUgcmF3IHR5cGUgc3RyaW5nIChmb3J3YXJkLWNvbXBhdCB3aXRoIG5ldyBzZXJ2ZXIgdHlwZXMpLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICogQHJldHVybnMge3N0cmluZ31cbiAgICAgKi9cbiAgICBtb2R1bGVUeXBlTGFiZWwodHlwZSkge1xuICAgICAgICBpZiAoIXR5cGUpIHtcbiAgICAgICAgICAgIHJldHVybiAnR2VuZXJhbCc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2FtZWxDYXNlLWlmeSBzbmFrZV9jYXNlOiAnY2FsbF9mZWF0dXJlJyAtPiAnQ2FsbEZlYXR1cmUnXG4gICAgICAgIGNvbnN0IGNhbWVsID0gdHlwZS5zcGxpdCgnXycpLm1hcCgocGFydCkgPT4ge1xuICAgICAgICAgICAgaWYgKHBhcnQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHBhcnQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBwYXJ0LnNsaWNlKDEpLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgIH0pLmpvaW4oJycpO1xuICAgICAgICBjb25zdCBrZXkgPSAnZXh0X01vZHVsZVR5cGUnICsgY2FtZWw7XG4gICAgICAgIGlmIChnbG9iYWxUcmFuc2xhdGUgJiYgdHlwZW9mIGdsb2JhbFRyYW5zbGF0ZVtrZXldID09PSAnc3RyaW5nJyAmJiBnbG9iYWxUcmFuc2xhdGVba2V5XS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2xvYmFsVHJhbnNsYXRlW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmFsbGJhY2s6IGNhcGl0YWxpemVkIHJhdyB0eXBlIChrZWVwcyB0aGUgVUkgcmVhZGFibGUgZm9yIHVua25vd24gY2F0ZWdvcmllcykuXG4gICAgICAgIHJldHVybiB0eXBlLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdHlwZS5zbGljZSgxKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gcHJvY2VzcyB0aGUgbGlzdCBvZiBtb2R1bGVzIHJlY2VpdmVkIGZyb20gdGhlIHdlYnNpdGUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgdGhlIGxpc3Qgb2YgbW9kdWxlcy5cbiAgICAgKi9cbiAgICBjYlBhcnNlTW9kdWxlVXBkYXRlcyhyZXNwb25zZURhdGEsIGlzU3VjY2Vzc2Z1bCkge1xuICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VMb2FkZXIuaGlkZSgpO1xuXG4gICAgICAgIC8vIFdoZW4gc3VjY2VzcywgcmVzcG9uc2VEYXRhIGlzIHJlc3BvbnNlLmRhdGEgZnJvbSBBUElcbiAgICAgICAgLy8gV2hlbiBmYWlsdXJlLCByZXNwb25zZURhdGEgaXMgdGhlIGZ1bGwgcmVzcG9uc2Ugb2JqZWN0XG4gICAgICAgIGlmICghaXNTdWNjZXNzZnVsKSB7XG4gICAgICAgICAgICBtYXJrZXRwbGFjZS4kbm9OZXdNb2R1bGVzU2VnbWVudC5zaG93KCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbiBzdWNjZXNzIGNhc2UsIHJlc3BvbnNlRGF0YSBpcyByZXNwb25zZS5kYXRhIHdoaWNoIHNob3VsZCBjb250YWluIG1vZHVsZXNcbiAgICAgICAgY29uc3QgbW9kdWxlcyA9IHJlc3BvbnNlRGF0YT8ubW9kdWxlcyB8fCBbXTtcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShtb2R1bGVzKSAmJiBtb2R1bGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1vZHVsZXMuZm9yRWFjaCgob2JqKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBtb2R1bGUgaXMgY29tcGF0aWJsZSB3aXRoIHRoZSBQQlggYmFzZWQgb24gdmVyc2lvbiBudW1iZXJcbiAgICAgICAgICAgICAgICBjb25zdCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlggPSBvYmoubWluX3BieF92ZXJzaW9uO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld01vZHVsZVZlcnNpb24gPSBvYmoudmVyc2lvbjtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50VmVyc2lvblBCWCA9IG1hcmtldHBsYWNlLnBieFZlcnNpb247XG4gICAgICAgICAgICAgICAgaWYgKG1hcmtldHBsYWNlLnZlcnNpb25Db21wYXJlKGN1cnJlbnRWZXJzaW9uUEJYLCBtaW5BcHByb3ByaWF0ZVZlcnNpb25QQlgpIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQWRkIG5ldyBtb2R1bGUgcm93XG4gICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuYWRkTW9kdWxlRGVzY3JpcHRpb24ob2JqKTtcblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgaXMgYWxyZWFkeSBpbnN0YWxsZWQgYW5kIG9mZmVyIGFuIHVwZGF0ZVxuICAgICAgICAgICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93W2RhdGEtaWQ9JHtvYmoudW5pcWlkfV1gKTtcbiAgICAgICAgICAgICAgICBpZiAoJG1vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluc3RhbGxlZFZlciA9ICRtb2R1bGVSb3cuZmluZCgndGQudmVyc2lvbicpLnRleHQoKS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZlcnNpb25Db21wYXJlUmVzdWx0ID0gbWFya2V0cGxhY2UudmVyc2lvbkNvbXBhcmUobmV3TW9kdWxlVmVyc2lvbiwgaW5zdGFsbGVkVmVyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHZlcnNpb25Db21wYXJlUmVzdWx0ID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuYWRkVXBkYXRlQnV0dG9uVG9Sb3cob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh2ZXJzaW9uQ29tcGFyZVJlc3VsdCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuY2hhbmdlRG93bmxvYWRCdXR0b25PblJvdyhvYmopO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoJCgndHIubmV3LW1vZHVsZS1yb3cnKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBtYXJrZXRwbGFjZS4kbm9OZXdNb2R1bGVzU2VnbWVudC5oaWRlKCk7XG4gICAgICAgICAgICAvLyBPbmx5IGluaXRpYWxpemUgaWYgRGF0YVRhYmxlIGlzIG5vdCBhbHJlYWR5IGluaXRpYWxpemVkXG4gICAgICAgICAgICBpZiAoISQuZm4uRGF0YVRhYmxlLmlzRGF0YVRhYmxlKG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlKSkge1xuICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5yZWdpc3RlclR5cGVGaWx0ZXIoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGFibGUgaXMgYWxyZWFkeSBpbml0aWFsaXplZCwganVzdCByZWRyYXcgaXRcbiAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZS5EYXRhVGFibGUoKS5kcmF3KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtYXJrZXRwbGFjZS5wb3B1bGF0ZVR5cGVGaWx0ZXIoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLiRub05ld01vZHVsZXNTZWdtZW50LnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIFVSTCBoYXMgYSBtb2R1bGUgcXVlcnkgcGFyYW1ldGVyIHRvIGF1dG8tb3BlbiBpdHMgZGV0YWlsIG1vZGFsXG4gICAgICAgIG1hcmtldHBsYWNlLm9wZW5Nb2R1bGVGcm9tUXVlcnlQYXJhbSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIFVSTCBxdWVyeSBwYXJhbWV0ZXIgZm9yIGEgbW9kdWxlIHVuaXFpZCBhbmQgb3BlbnMgaXRzIGRldGFpbCBtb2RhbC5cbiAgICAgKiBVUkwgZm9ybWF0OiA/bW9kdWxlPU1vZHVsZVVuaXFpZCMvbWFya2V0cGxhY2VcbiAgICAgKi9cbiAgICBvcGVuTW9kdWxlRnJvbVF1ZXJ5UGFyYW0oKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IHVuaXFpZCA9IHVybFBhcmFtcy5nZXQoJ21vZHVsZScpO1xuICAgICAgICBpZiAoIXVuaXFpZCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0ICRtb2R1bGVSb3cgPSAkKGB0ci5uZXctbW9kdWxlLXJvd1tkYXRhLWlkPSR7dW5pcWlkfV1gKTtcbiAgICAgICAgaWYgKCRtb2R1bGVSb3cubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgJG1vZHVsZVJvdy5maW5kKCd0ZC5zaG93LWRldGFpbHMtb24tY2xpY2snKS5maXJzdCgpLnRyaWdnZXIoJ2NsaWNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gQ2xlYW4gdXAgdGhlIFVSTCBwYXJhbWV0ZXIgYWZ0ZXIgb3BlbmluZyB0aGUgbW9kYWxcbiAgICAgICAgY29uc3QgY2xlYW5VcmwgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgKyB3aW5kb3cubG9jYXRpb24uaGFzaDtcbiAgICAgICAgd2luZG93Lmhpc3RvcnkucmVwbGFjZVN0YXRlKG51bGwsICcnLCBjbGVhblVybCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYSBkZXNjcmlwdGlvbiBmb3IgYW4gYXZhaWxhYmxlIG1vZHVsZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBhZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopIHtcbiAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuc2hvdygpO1xuICAgICAgICBsZXQgcHJvbW9MaW5rID0gJyc7XG4gICAgICAgIGlmIChvYmoucHJvbW9fbGluayAhPT0gdW5kZWZpbmVkICYmIG9iai5wcm9tb19saW5rICE9PSBudWxsKSB7XG4gICAgICAgICAgICBwcm9tb0xpbmsgPSBgPGJyPjxhIGhyZWY9XCIke29iai5wcm9tb19saW5rfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9FeHRlcm5hbERlc2NyaXB0aW9ufTwvYT5gO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGFkZGl0aW9uYWxJY29uID0gJzxpIGNsYXNzPVwicHV6emxlIHBpZWNlIGljb25cIj48L2k+JztcbiAgICAgICAgaWYgKG9iai5jb21tZXJjaWFsICE9PSAwKSB7XG4gICAgICAgICAgICBhZGRpdGlvbmFsSWNvbiA9ICc8aSBjbGFzcz1cInVpIGRvbmF0ZSBpY29uXCI+PC9pPic7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgbW9kdWxlVHlwZSA9IChvYmoubW9kdWxlX3R5cGUgJiYgdHlwZW9mIG9iai5tb2R1bGVfdHlwZSA9PT0gJ3N0cmluZycpXG4gICAgICAgICAgICA/IG9iai5tb2R1bGVfdHlwZVxuICAgICAgICAgICAgOiAnZ2VuZXJhbCc7XG4gICAgICAgIGNvbnN0IGR5bmFtaWNSb3cgPSBgXG5cdFx0XHQ8dHIgY2xhc3M9XCJuZXctbW9kdWxlLXJvd1wiIGRhdGEtaWQ9XCIke29iai51bmlxaWR9XCIgZGF0YS1uYW1lPVwiJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfVwiIGRhdGEtdHlwZT1cIiR7bW9kdWxlVHlwZX1cIj5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7YWRkaXRpb25hbEljb259ICR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5uYW1lKX08YnI+XG5cdFx0XHRcdFx0XHQgICAgPHNwYW4gY2xhc3M9XCJmZWF0dXJlc1wiPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXNjcmlwdGlvbil9ICR7cHJvbW9MaW5rfTwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJzaG93LWRldGFpbHMtb24tY2xpY2tcIj4ke2RlY29kZVVSSUNvbXBvbmVudChvYmouZGV2ZWxvcGVyKX08L3RkPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwiY2VudGVyIGFsaWduZWQgdmVyc2lvbiBzaG93LWRldGFpbHMtb24tY2xpY2tcIj4ke29iai52ZXJzaW9ufTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICBcdFx0XHRcdFx0XHRcdDxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBpY29uIGJhc2ljIGJ1dHRvbiBkb3dubG9hZCBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9IFwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXVuaXFpZCA9IFwiJHtvYmoudW5pcWlkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12ZXJzaW9uID1cIiR7b2JqLnZlcnNpb259XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXJlbGVhc2VpZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZCBibHVlXCI+PC9pPiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cblx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5cbiAgICBcdFx0XHRcdCAgICA8L3RkPlx0XHRcblx0XHRcdDwvdHI+YDtcbiAgICAgICAgJCgnI25ldy1tb2R1bGVzLXRhYmxlIHRib2R5JykuYXBwZW5kKGR5bmFtaWNSb3cpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGFuIHVwZGF0ZSBidXR0b24gdG8gdGhlIG1vZHVsZSByb3cgZm9yIHVwZGF0aW5nIGFuIG9sZCB2ZXJzaW9uIG9mIFBCWC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBhZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopIHtcbiAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UncmUgd29ya2luZyB3aXRoIGEgRGF0YVRhYmxlXG4gICAgICAgIGNvbnN0ICR0YWJsZSA9ICQoJyNpbnN0YWxsZWQtbW9kdWxlcy10YWJsZScpO1xuICAgICAgICBpZiAoJC5mbi5EYXRhVGFibGUgJiYgJC5mbi5EYXRhVGFibGUuaXNEYXRhVGFibGUoJHRhYmxlKSkge1xuICAgICAgICAgICAgY29uc3QgdGFibGUgPSAkdGFibGUuRGF0YVRhYmxlKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVzZSBqUXVlcnkgZWxlbWVudCB0byBmaW5kIHRoZSByb3cgaW4gRGF0YVRhYmxlIGluc3RlYWQgb2YgaW5kZXhcbiAgICAgICAgICAgIGNvbnN0IGR0Um93ID0gdGFibGUucm93KCRtb2R1bGVSb3cpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZHRSb3cuYW55KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIHJvdyBub2RlIHRvIHdvcmsgd2l0aFxuICAgICAgICAgICAgICAgIGNvbnN0ICRyb3dOb2RlID0gJChkdFJvdy5ub2RlKCkpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENsb25lIHRoZSByb3cncyBsYXN0IGNlbGwgKGFjdGlvbiBidXR0b25zIGNlbGwpXG4gICAgICAgICAgICAgICAgY29uc3QgJGxhc3RDZWxsID0gJHJvd05vZGUuZmluZCgndGQ6bGFzdCcpLmNsb25lKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGRvd25sb2FkIGJ1dHRvbiBpZiBleGlzdHNcbiAgICAgICAgICAgICAgICAkbGFzdENlbGwuZmluZCgnYS5kb3dubG9hZCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSB1cGRhdGUgYnV0dG9uXG4gICAgICAgICAgICAgICAgY29uc3QgZHluYW1pY0J1dHRvbiA9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gdXBkYXRlIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtdmVyc2lvbiA9XCIke29iai52ZXJzaW9ufVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuICAgICAgICAgICAgICAgICAgICBkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtcmVsZWFzZWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+IFxuICAgICAgICAgICAgICAgICAgICA8L2E+YDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBQcmVwZW5kIGJ1dHRvbiB0byBhY3Rpb24tYnV0dG9ucyBkaXZcbiAgICAgICAgICAgICAgICAkbGFzdENlbGwuZmluZCgnLmFjdGlvbi1idXR0b25zJykucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGNlbGwgaW4gRGF0YVRhYmxlIHVzaW5nIHRoZSByb3cgQVBJXG4gICAgICAgICAgICAgICAgY29uc3QgY2VsbEluZGV4ID0gJHJvd05vZGUuZmluZCgndGQnKS5sZW5ndGggLSAxOyAvLyBMYXN0IGNlbGxcbiAgICAgICAgICAgICAgICB0YWJsZS5jZWxsKGR0Um93LCBjZWxsSW5kZXgpLmRhdGEoJGxhc3RDZWxsLmh0bWwoKSkuZHJhdyhmYWxzZSk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGFsbCBwb3B1cHMgYWZ0ZXIgRE9NIHVwZGF0ZVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemVQb3B1cHMoKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJZiByb3cgbm90IGZvdW5kIGluIERhdGFUYWJsZSwgdXNlIGRpcmVjdCBET00gbWFuaXB1bGF0aW9uXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRVcGRhdGVCdXR0b25EaXJlY3RseSgkbW9kdWxlUm93LCBvYmopO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgZm9yIG5vbi1EYXRhVGFibGUgc2NlbmFyaW9cbiAgICAgICAgICAgIHRoaXMuYWRkVXBkYXRlQnV0dG9uRGlyZWN0bHkoJG1vZHVsZVJvdywgb2JqKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbWFya2V0cGxhY2UuJGJ0blVwZGF0ZUFsbE1vZHVsZXMuc2hvdygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQWRkcyB1cGRhdGUgYnV0dG9uIGRpcmVjdGx5IHRvIERPTSB3aXRob3V0IERhdGFUYWJsZSBBUElcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJG1vZHVsZVJvdyAtIFRoZSBtb2R1bGUgcm93IGpRdWVyeSBlbGVtZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb25cbiAgICAgKi9cbiAgICBhZGRVcGRhdGVCdXR0b25EaXJlY3RseSgkbW9kdWxlUm93LCBvYmopIHtcbiAgICAgICAgY29uc3QgJGN1cnJlbnREb3dubG9hZEJ1dHRvbiA9ICRtb2R1bGVSb3cuZmluZCgnYS5kb3dubG9hZCcpO1xuICAgICAgICAkY3VycmVudERvd25sb2FkQnV0dG9uLnJlbW92ZSgpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgZHluYW1pY0J1dHRvbiA9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gdXBkYXRlIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZX1cIlxuICAgICAgICAgICAgZGF0YS12ZXJzaW9uID1cIiR7b2JqLnZlcnNpb259XCJcbiAgICAgICAgICAgIGRhdGEtc2l6ZSA9IFwiJHtvYmouc2l6ZX1cIlxuICAgICAgICAgICAgZGF0YS11bmlxaWQgPVwiJHtvYmoudW5pcWlkfVwiIFxuICAgICAgICAgICAgZGF0YS1yZWxlYXNlaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cbiAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiByZWRvIGJsdWVcIj48L2k+IFxuICAgICAgICAgICAgPC9hPmA7XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkYWN0aW9uQnV0dG9ucyA9ICRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJyk7XG4gICAgICAgICRhY3Rpb25CdXR0b25zLnByZXBlbmQoZHluYW1pY0J1dHRvbik7XG5cbiAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBhbGwgcG9wdXBzIGFmdGVyIERPTSB1cGRhdGVcbiAgICAgICAgZXh0ZW5zaW9uTW9kdWxlcy5pbml0aWFsaXplUG9wdXBzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IG9iaiAtIFRoZSBtb2R1bGUgb2JqZWN0IGNvbnRhaW5pbmcgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgY2hhbmdlRG93bmxvYWRCdXR0b25PblJvdyhvYmopIHtcbiAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm5ldy1tb2R1bGUtcm93W2RhdGEtaWQ9JHtvYmoudW5pcWlkfV1gKTtcbiAgICAgICAgY29uc3QgJGN1cnJlbnREb3dubG9hZEJ1dHRvbiA9ICRtb2R1bGVSb3cuZmluZCgnYS5kb3dubG9hZCcpO1xuICAgICAgICAkY3VycmVudERvd25sb2FkQnV0dG9uLnJlbW92ZSgpO1xuICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uXG4gICAgICAgICAgICA9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgYmFzaWMgaWNvbiBidXR0b24gcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG5cdFx0XHRkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfU2hvd01vZHVsZVJlcG9EZXRhaWxzfVwiPlxuXHRcdFx0PGkgY2xhc3M9XCJpY29uIHNlYXJjaCBibHVlXCI+PC9pPiBcblx0XHRcdDwvYT5gO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpXG4gICAgICAgICAgICAucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcbiAgICAgICAgJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5jbG9zZXN0KCd0ZCcpLmFkZENsYXNzKCdzaG93LWRldGFpbHMtb24tY2xpY2snKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29tcGFyZSB2ZXJzaW9ucyBvZiBtb2R1bGVzLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2MSAtIFRoZSBmaXJzdCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYyIC0gVGhlIHNlY29uZCB2ZXJzaW9uIHRvIGNvbXBhcmUuXG4gICAgICogQHBhcmFtIHtvYmplY3R9IFtvcHRpb25zXSAtIE9wdGlvbmFsIGNvbmZpZ3VyYXRpb24gb3B0aW9ucy5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLmxleGljb2dyYXBoaWNhbF0gLSBXaGV0aGVyIHRvIHBlcmZvcm0gbGV4aWNvZ3JhcGhpY2FsIGNvbXBhcmlzb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtvcHRpb25zLnplcm9FeHRlbmRdIC0gV2VhdGhlciB0byB6ZXJvLWV4dGVuZCB0aGUgc2hvcnRlciB2ZXJzaW9uIChkZWZhdWx0OiBmYWxzZSkuXG4gICAgICogQHJldHVybnMge251bWJlcn0gLSBBIG51bWJlciBpbmRpY2F0aW5nIHRoZSBjb21wYXJpc29uIHJlc3VsdDogMCBpZiB2ZXJzaW9ucyBhcmUgZXF1YWwsIDEgaWYgdjEgaXMgZ3JlYXRlciwgLTEgaWYgdjIgaXMgZ3JlYXRlciwgb3IgTmFOIGlmIHRoZSB2ZXJzaW9ucyBhcmUgaW52YWxpZC5cbiAgICAgKi9cbiAgICB2ZXJzaW9uQ29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgbGV4aWNvZ3JhcGhpY2FsID0gb3B0aW9ucyAmJiBvcHRpb25zLmxleGljb2dyYXBoaWNhbDtcbiAgICAgICAgY29uc3QgemVyb0V4dGVuZCA9IG9wdGlvbnMgJiYgb3B0aW9ucy56ZXJvRXh0ZW5kO1xuICAgICAgICBsZXQgdjFwYXJ0cyA9IFN0cmluZyh2MSkuc3BsaXQoJy4nKTtcbiAgICAgICAgbGV0IHYycGFydHMgPSBTdHJpbmcodjIpLnNwbGl0KCcuJyk7XG5cbiAgICAgICAgZnVuY3Rpb24gaXNWYWxpZFBhcnQoeCkge1xuICAgICAgICAgICAgcmV0dXJuIChsZXhpY29ncmFwaGljYWwgPyAvXlxcZCtbQS1aYS16XSokLyA6IC9eXFxkKyQvKS50ZXN0KHgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF2MXBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSB8fCAhdjJwYXJ0cy5ldmVyeShpc1ZhbGlkUGFydCkpIHtcbiAgICAgICAgICAgIHJldHVybiBOYU47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoemVyb0V4dGVuZCkge1xuICAgICAgICAgICAgd2hpbGUgKHYxcGFydHMubGVuZ3RoIDwgdjJwYXJ0cy5sZW5ndGgpIHYxcGFydHMucHVzaCgnMCcpO1xuICAgICAgICAgICAgd2hpbGUgKHYycGFydHMubGVuZ3RoIDwgdjFwYXJ0cy5sZW5ndGgpIHYycGFydHMucHVzaCgnMCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFsZXhpY29ncmFwaGljYWwpIHtcbiAgICAgICAgICAgIHYxcGFydHMgPSB2MXBhcnRzLm1hcChOdW1iZXIpO1xuICAgICAgICAgICAgdjJwYXJ0cyA9IHYycGFydHMubWFwKE51bWJlcik7XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHYxcGFydHMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgIGlmICh2MnBhcnRzLmxlbmd0aCA9PT0gaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHYxcGFydHNbaV0gPT09IHYycGFydHNbaV0pIHtcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgfSBlbHNlIGlmICh2MXBhcnRzW2ldID4gdjJwYXJ0c1tpXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodjFwYXJ0cy5sZW5ndGggIT09IHYycGFydHMubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gLTE7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMDtcbiAgICB9LFxuXG59O1xuXG4vLyBNYWtlIG1hcmtldHBsYWNlIGdsb2JhbGx5IGFjY2Vzc2libGVcbndpbmRvdy5tYXJrZXRwbGFjZSA9IG1hcmtldHBsYWNlOyJdfQ==