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
            var title = column.header().textContent;

            // Create compact search input in Fomantic UI style
            var wrapper = document.createElement('div');
            wrapper.className = 'ui mini icon input';
            var input = document.createElement('input');
            input.placeholder = title;
            input.type = 'text';
            input.style.width = '200px';
            var icon = document.createElement('i');
            icon.className = 'search icon';
            wrapper.appendChild(input);
            wrapper.appendChild(icon);

            // Keep the header text for sorting, add input next to it
            column.header().textContent = '';
            column.header().appendChild(wrapper);

            // Prevent input clicks from triggering column sort
            wrapper.addEventListener('click', function (e) {
              return e.stopPropagation();
            });

            // Event listener for user input
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
    $dropdown.find('.menu').html(menuHtml);

    // Preserve current selection if the type is still present; otherwise fall back to 'all'.
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
    }
    // camelCase-ify snake_case: 'call_feature' -> 'CallFeature'
    var camel = type.split('_').map(function (part) {
      if (part.length === 0) {
        return '';
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }).join('');
    var key = 'ext_ModuleType' + camel;
    if (globalTranslate && typeof globalTranslate[key] === 'string' && globalTranslate[key].length > 0) {
      return globalTranslate[key];
    }
    // Fallback: capitalized raw type (keeps the UI readable for unknown categories).
    return type.charAt(0).toUpperCase() + type.slice(1);
  },
  /**
   * Callback function to process the list of modules received from the website.
   * @param {object} response - The response containing the list of modules.
   */
  cbParseModuleUpdates: function cbParseModuleUpdates(responseData, isSuccessful) {
    marketplace.$marketplaceLoader.hide();

    // When success, responseData is response.data from API
    // When failure, responseData is the full response object
    if (!isSuccessful) {
      marketplace.$noNewModulesSegment.show();
      return;
    }

    // In success case, responseData is response.data which should contain modules
    var modules = (responseData === null || responseData === void 0 ? void 0 : responseData.modules) || [];
    if (Array.isArray(modules) && modules.length > 0) {
      modules.forEach(function (obj) {
        // Check if this module is compatible with the PBX based on version number
        var minAppropriateVersionPBX = obj.min_pbx_version;
        var newModuleVersion = obj.version;
        var currentVersionPBX = marketplace.pbxVersion;
        if (marketplace.versionCompare(currentVersionPBX, minAppropriateVersionPBX) < 0) {
          return;
        }

        // Add new module row
        marketplace.addModuleDescription(obj);

        // Check if the module is already installed and offer an update
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
      marketplace.$noNewModulesSegment.hide();
      // Only initialize if DataTable is not already initialized
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
    }

    // Check if URL has a module query parameter to auto-open its detail modal
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
    }
    // Clean up the URL parameter after opening the modal
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
    var $moduleRow = $("tr.module-row[data-id=".concat(obj.uniqid, "]"));

    // Check if we're working with a DataTable
    var $table = $('#installed-modules-table');
    if ($.fn.DataTable && $.fn.DataTable.isDataTable($table)) {
      var table = $table.DataTable();

      // Use jQuery element to find the row in DataTable instead of index
      var dtRow = table.row($moduleRow);
      if (dtRow.any()) {
        // Get the row node to work with
        var $rowNode = $(dtRow.node());

        // Clone the row's last cell (action buttons cell)
        var $lastCell = $rowNode.find('td:last').clone();

        // Remove download button if exists
        $lastCell.find('a.download').remove();

        // Create update button
        var dynamicButton = "<a href=\"#\" class=\"ui basic icon button update popuped disable-if-no-internet\" \n                    data-content=\"".concat(globalTranslate.ext_UpdateModule, "\"\n                    data-version =\"").concat(obj.version, "\"\n                    data-size = \"").concat(obj.size, "\"\n                    data-uniqid =\"").concat(obj.uniqid, "\" \n                    data-releaseid =\"").concat(obj.release_id, "\">\n                    <i class=\"icon redo blue\"></i> \n                    </a>");

        // Prepend button to action-buttons div
        $lastCell.find('.action-buttons').prepend(dynamicButton);

        // Update the cell in DataTable using the row API
        var cellIndex = $rowNode.find('td').length - 1; // Last cell
        table.cell(dtRow, cellIndex).data($lastCell.html()).draw(false);

        // Re-initialize all popups after DOM update
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
    $actionButtons.prepend(dynamicButton);

    // Re-initialize all popups after DOM update
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
      while (v1parts.length < v2parts.length) v1parts.push('0');
      while (v2parts.length < v1parts.length) v2parts.push('0');
    }
    if (!lexicographical) {
      v1parts = v1parts.map(Number);
      v2parts = v2parts.map(Number);
    }
    for (var i = 0; i < v1parts.length; i += 1) {
      if (v2parts.length === i) {
        return 1;
      }
      if (v1parts[i] === v2parts[i]) {
        //
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

// Make marketplace globally accessible
window.marketplace = marketplace;

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGJ4LWV4dGVuc2lvbi1tb2R1bGUtbWFya2V0cGxhY2UuanMiLCJuYW1lcyI6WyJtYXJrZXRwbGFjZSIsIiRtYXJrZXRwbGFjZVRhYmxlIiwiJCIsIiRtYXJrZXRwbGFjZUxvYWRlciIsIiRub05ld01vZHVsZXNTZWdtZW50IiwicGJ4VmVyc2lvbiIsImdsb2JhbFBCWFZlcnNpb24iLCJyZXBsYWNlIiwiJGJ0blVwZGF0ZUFsbE1vZHVsZXMiLCJpc0luaXRpYWxpemVkIiwic2VsZWN0ZWRUeXBlIiwidHlwZUZpbHRlckZuIiwiaW5pdGlhbGl6ZSIsIk1vZHVsZXNBUEkiLCJnZXRBdmFpbGFibGUiLCJjYlBhcnNlTW9kdWxlVXBkYXRlcyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJEYXRhVGFibGUiLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJjb2x1bW5zIiwib3JkZXJhYmxlIiwic2VhcmNoYWJsZSIsImF1dG9XaWR0aCIsInNEb20iLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiaW5pdENvbXBsZXRlIiwiYXBpIiwiZXZlcnkiLCJfdGhpcyIsImNvbHVtbiIsImluZGV4IiwidGl0bGUiLCJoZWFkZXIiLCJ0ZXh0Q29udGVudCIsIndyYXBwZXIiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJjbGFzc05hbWUiLCJpbnB1dCIsInBsYWNlaG9sZGVyIiwidHlwZSIsInN0eWxlIiwid2lkdGgiLCJpY29uIiwiYXBwZW5kQ2hpbGQiLCJhZGRFdmVudExpc3RlbmVyIiwiZSIsInN0b3BQcm9wYWdhdGlvbiIsInNlYXJjaCIsInZhbHVlIiwiZHJhdyIsInJlZ2lzdGVyVHlwZUZpbHRlciIsImZuIiwiZXh0Iiwic2VhcmNoU3RhY2siLCJpZHgiLCJpbmRleE9mIiwic3BsaWNlIiwic2V0dGluZ3MiLCJkYXRhIiwiZGF0YUluZGV4Iiwicm93RGF0YSIsImludmFsaWRhdGVkIiwicm93IiwiblRhYmxlIiwiaWQiLCJyb3dOb2RlIiwiYW9EYXRhIiwiblRyIiwicm93VHlwZSIsImF0dHIiLCJwdXNoIiwicG9wdWxhdGVUeXBlRmlsdGVyIiwiJHdyYXBwZXIiLCIkZHJvcGRvd24iLCJsZW5ndGgiLCJ0eXBlc1NldCIsImVhY2giLCJ0eXBlcyIsIk9iamVjdCIsImtleXMiLCJzb3J0IiwiaGlkZSIsImFsbExhYmVsIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X01vZHVsZVR5cGVBbGwiLCJtZW51SHRtbCIsImZvckVhY2giLCJsYWJlbCIsIm1vZHVsZVR5cGVMYWJlbCIsImZpbmQiLCJodG1sIiwicHJldmlvdXNUeXBlIiwibmV4dFR5cGUiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiYXBwbHlUeXBlRmlsdGVyIiwic2hvdyIsImlzRGF0YVRhYmxlIiwiY2FtZWwiLCJzcGxpdCIsIm1hcCIsInBhcnQiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwidG9Mb3dlckNhc2UiLCJqb2luIiwia2V5IiwicmVzcG9uc2VEYXRhIiwiaXNTdWNjZXNzZnVsIiwibW9kdWxlcyIsIkFycmF5IiwiaXNBcnJheSIsIm9iaiIsIm1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCIsIm1pbl9wYnhfdmVyc2lvbiIsIm5ld01vZHVsZVZlcnNpb24iLCJ2ZXJzaW9uIiwiY3VycmVudFZlcnNpb25QQlgiLCJ2ZXJzaW9uQ29tcGFyZSIsImFkZE1vZHVsZURlc2NyaXB0aW9uIiwiJG1vZHVsZVJvdyIsImNvbmNhdCIsInVuaXFpZCIsImluc3RhbGxlZFZlciIsInRleHQiLCJ0cmltIiwidmVyc2lvbkNvbXBhcmVSZXN1bHQiLCJhZGRVcGRhdGVCdXR0b25Ub1JvdyIsImNoYW5nZURvd25sb2FkQnV0dG9uT25Sb3ciLCJvcGVuTW9kdWxlRnJvbVF1ZXJ5UGFyYW0iLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdldCIsImZpcnN0IiwidHJpZ2dlciIsImNsZWFuVXJsIiwicGF0aG5hbWUiLCJoYXNoIiwiaGlzdG9yeSIsInJlcGxhY2VTdGF0ZSIsInByb21vTGluayIsInByb21vX2xpbmsiLCJ1bmRlZmluZWQiLCJleHRfRXh0ZXJuYWxEZXNjcmlwdGlvbiIsImFkZGl0aW9uYWxJY29uIiwiY29tbWVyY2lhbCIsIm1vZHVsZVR5cGUiLCJtb2R1bGVfdHlwZSIsImR5bmFtaWNSb3ciLCJkZWNvZGVVUklDb21wb25lbnQiLCJuYW1lIiwiZGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJleHRfSW5zdGFsbE1vZHVsZSIsInNpemUiLCJyZWxlYXNlX2lkIiwiYXBwZW5kIiwiJHRhYmxlIiwidGFibGUiLCJkdFJvdyIsImFueSIsIiRyb3dOb2RlIiwibm9kZSIsIiRsYXN0Q2VsbCIsImNsb25lIiwicmVtb3ZlIiwiZHluYW1pY0J1dHRvbiIsImV4dF9VcGRhdGVNb2R1bGUiLCJwcmVwZW5kIiwiY2VsbEluZGV4IiwiY2VsbCIsInNldFRpbWVvdXQiLCJleHRlbnNpb25Nb2R1bGVzIiwiaW5pdGlhbGl6ZVBvcHVwcyIsImFkZFVwZGF0ZUJ1dHRvbkRpcmVjdGx5IiwiJGN1cnJlbnREb3dubG9hZEJ1dHRvbiIsIiRhY3Rpb25CdXR0b25zIiwiZXh0X1Nob3dNb2R1bGVSZXBvRGV0YWlscyIsImNsb3Nlc3QiLCJhZGRDbGFzcyIsInYxIiwidjIiLCJvcHRpb25zIiwibGV4aWNvZ3JhcGhpY2FsIiwiemVyb0V4dGVuZCIsInYxcGFydHMiLCJTdHJpbmciLCJ2MnBhcnRzIiwiaXNWYWxpZFBhcnQiLCJ4IiwidGVzdCIsIk5hTiIsIk51bWJlciIsImkiXSwic291cmNlcyI6WyIuLi8uLi9zcmMvUGJ4RXh0ZW5zaW9uTW9kdWxlcy9wYngtZXh0ZW5zaW9uLW1vZHVsZS1tYXJrZXRwbGFjZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUsIGdsb2JhbFBCWFZlcnNpb24sIE1vZHVsZXNBUEkgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIGxpc3Qgb2YgZXh0ZW5zaW9uIG1vZHVsZXMuXG4gKiBAY2xhc3MgbWFya2V0cGxhY2VcbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBtYXJrZXRwbGFjZSA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWJsZSB3aXRoIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlVGFibGU6ICQoJyNuZXctbW9kdWxlcy10YWJsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvYWRlciBpbnN0ZWFkIG9mIGF2YWlsYWJsZSBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1hcmtldHBsYWNlTG9hZGVyOiAkKCcjbmV3LW1vZHVsZXMtbG9hZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaW5mb3JtYXRpb24gd2hlbiBubyBhbnkgbW9kdWxlcyBhdmFpbGFibGUgdG8gaW5zdGFsbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRub05ld01vZHVsZXNTZWdtZW50OiAkKCcjbm8tbmV3LW1vZHVsZXMtc2VnbWVudCcpLFxuXG4gICAgLyoqXG4gICAgICogU3RvcmUgY3VycmVudCBpbnN0YWxsZWQgYSBQQlggdmVyc2lvbiB3aXRob3V0IGEgZGl2IHBvc3RmaXhcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHBieFZlcnNpb246IGdsb2JhbFBCWFZlcnNpb24ucmVwbGFjZSgvLWRldi9pLCAnJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYnV0dG9uIHdoaWNoIHJlc3BvbnNpYmxlIGZvciB1cGRhdGUgYWxsIGluc3RhbGxlZCBtb2R1bGVzXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYnRuVXBkYXRlQWxsTW9kdWxlczogJCgnI3VwZGF0ZS1hbGwtbW9kdWxlcy1idXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgaW5pdGlhbGl6ZWQgZmxhZ1xuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgaXNJbml0aWFsaXplZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBDdXJyZW50bHkgc2VsZWN0ZWQgbW9kdWxlX3R5cGUgZmlsdGVyIHZhbHVlICgnYWxsJyBzaG93cyBldmVyeSByb3cpLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgc2VsZWN0ZWRUeXBlOiAnYWxsJyxcblxuICAgIC8qKlxuICAgICAqIFJlZ2lzdGVyZWQgRGF0YVRhYmxlIGN1c3RvbSBmaWx0ZXIgZnVuY3Rpb24gKHNvIGl0IGNhbiBiZSByZW1vdmVkIG9uIHJlLWluaXQpLlxuICAgICAqIEB0eXBlIHs/RnVuY3Rpb259XG4gICAgICovXG4gICAgdHlwZUZpbHRlckZuOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBleHRlbnNpb25Nb2R1bGVzU2hvd0F2YWlsYWJsZSBjbGFzc1xuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGlmIChtYXJrZXRwbGFjZS5pc0luaXRpYWxpemVkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgbWFya2V0cGxhY2UuaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgICAgIE1vZHVsZXNBUEkuZ2V0QXZhaWxhYmxlKG1hcmtldHBsYWNlLmNiUGFyc2VNb2R1bGVVcGRhdGVzKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkYXRhIHRhYmxlcyBvbiB0YWJsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlLkRhdGFUYWJsZSh7XG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIGNvbHVtbnM6IFtcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICAgICAgbnVsbCxcbiAgICAgICAgICAgICAgICB7b3JkZXJhYmxlOiBmYWxzZSwgc2VhcmNoYWJsZTogZmFsc2V9LFxuICAgICAgICAgICAgICAgIHtvcmRlcmFibGU6IGZhbHNlLCBzZWFyY2hhYmxlOiBmYWxzZX0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgYXV0b1dpZHRoOiBmYWxzZSxcbiAgICAgICAgICAgIHNEb206ICdscnRpcCcsXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgaW5pdENvbXBsZXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGkoKVxuICAgICAgICAgICAgICAgICAgICAuY29sdW1ucygpXG4gICAgICAgICAgICAgICAgICAgIC5ldmVyeShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29sdW1uID0gdGhpcztcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb2x1bW4uaW5kZXgoKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0aXRsZSA9IGNvbHVtbi5oZWFkZXIoKS50ZXh0Q29udGVudDtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBjb21wYWN0IHNlYXJjaCBpbnB1dCBpbiBGb21hbnRpYyBVSSBzdHlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB3cmFwcGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JhcHBlci5jbGFzc05hbWUgPSAndWkgbWluaSBpY29uIGlucHV0JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0LnBsYWNlaG9sZGVyID0gdGl0bGU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXQudHlwZSA9ICd0ZXh0JztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5zdHlsZS53aWR0aCA9ICcyMDBweCc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGljb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWNvbi5jbGFzc05hbWUgPSAnc2VhcmNoIGljb24nO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyYXBwZXIuYXBwZW5kQ2hpbGQoaW5wdXQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyYXBwZXIuYXBwZW5kQ2hpbGQoaWNvbik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBLZWVwIHRoZSBoZWFkZXIgdGV4dCBmb3Igc29ydGluZywgYWRkIGlucHV0IG5leHQgdG8gaXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW4uaGVhZGVyKCkudGV4dENvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2x1bW4uaGVhZGVyKCkuYXBwZW5kQ2hpbGQod3JhcHBlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBQcmV2ZW50IGlucHV0IGNsaWNrcyBmcm9tIHRyaWdnZXJpbmcgY29sdW1uIHNvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cmFwcGVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IGUuc3RvcFByb3BhZ2F0aW9uKCkpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHVzZXIgaW5wdXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbHVtbi5zZWFyY2goKSAhPT0gdGhpcy52YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29sdW1uLnNlYXJjaChpbnB1dC52YWx1ZSkuZHJhdygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgRGF0YVRhYmxlIGN1c3RvbSBmaWx0ZXIgZm9yIG1vZHVsZV90eXBlLlxuICAgICAqIElkZW1wb3RlbnQg4oCUIGlmIGNhbGxlZCBtdWx0aXBsZSB0aW1lcywgcHJldmlvdXMgZmlsdGVyIGZuIGlzIHJlbW92ZWQgZmlyc3QuXG4gICAgICovXG4gICAgcmVnaXN0ZXJUeXBlRmlsdGVyKCkge1xuICAgICAgICBpZiAoISQuZm4uRGF0YVRhYmxlIHx8ICEkLmZuLkRhdGFUYWJsZS5leHQgfHwgISQuZm4uRGF0YVRhYmxlLmV4dC5zZWFyY2gpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzZWFyY2hTdGFjayA9ICQuZm4uRGF0YVRhYmxlLmV4dC5zZWFyY2g7XG4gICAgICAgIGlmIChtYXJrZXRwbGFjZS50eXBlRmlsdGVyRm4pIHtcbiAgICAgICAgICAgIGNvbnN0IGlkeCA9IHNlYXJjaFN0YWNrLmluZGV4T2YobWFya2V0cGxhY2UudHlwZUZpbHRlckZuKTtcbiAgICAgICAgICAgIGlmIChpZHggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgc2VhcmNoU3RhY2suc3BsaWNlKGlkeCwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbWFya2V0cGxhY2UudHlwZUZpbHRlckZuID0gZnVuY3Rpb24gKHNldHRpbmdzLCBkYXRhLCBkYXRhSW5kZXgsIHJvd0RhdGEsIGludmFsaWRhdGVkLCByb3cpIHtcbiAgICAgICAgICAgIC8vIE9ubHkgYXBwbHkgdG8gdGhlIG1hcmtldHBsYWNlIHRhYmxlLlxuICAgICAgICAgICAgaWYgKCFzZXR0aW5ncyB8fCAhc2V0dGluZ3MublRhYmxlIHx8IHNldHRpbmdzLm5UYWJsZS5pZCAhPT0gJ25ldy1tb2R1bGVzLXRhYmxlJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1hcmtldHBsYWNlLnNlbGVjdGVkVHlwZSA9PT0gJ2FsbCcpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJvd05vZGUgPSByb3cgfHwgKHNldHRpbmdzLmFvRGF0YVtkYXRhSW5kZXhdID8gc2V0dGluZ3MuYW9EYXRhW2RhdGFJbmRleF0ublRyIDogbnVsbCk7XG4gICAgICAgICAgICBpZiAoIXJvd05vZGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IHJvd1R5cGUgPSAkKHJvd05vZGUpLmF0dHIoJ2RhdGEtdHlwZScpIHx8ICdnZW5lcmFsJztcbiAgICAgICAgICAgIHJldHVybiByb3dUeXBlID09PSBtYXJrZXRwbGFjZS5zZWxlY3RlZFR5cGU7XG4gICAgICAgIH07XG4gICAgICAgIHNlYXJjaFN0YWNrLnB1c2gobWFya2V0cGxhY2UudHlwZUZpbHRlckZuKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29sbGVjdCB1bmlxdWUgbW9kdWxlX3R5cGUgdmFsdWVzIGZyb20gcmVuZGVyZWQgcm93cywgKHJlLSlwb3B1bGF0ZSBkcm9wZG93bi5cbiAgICAgKiBIaWRlcyB0aGUgZmlsdGVyIFVJIGVudGlyZWx5IGlmIG9ubHkgb25lIGNhdGVnb3J5IGlzIHByZXNlbnQgKG5vdGhpbmcgdG8gZmlsdGVyKS5cbiAgICAgKi9cbiAgICBwb3B1bGF0ZVR5cGVGaWx0ZXIoKSB7XG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gJCgnI21vZHVsZS10eXBlLWZpbHRlci13cmFwcGVyJyk7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJyNtb2R1bGUtdHlwZS1maWx0ZXInKTtcbiAgICAgICAgaWYgKCR3cmFwcGVyLmxlbmd0aCA9PT0gMCB8fCAkZHJvcGRvd24ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0eXBlc1NldCA9IHt9O1xuICAgICAgICAkKCd0ci5uZXctbW9kdWxlLXJvdycpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9ICQodGhpcykuYXR0cignZGF0YS10eXBlJykgfHwgJ2dlbmVyYWwnO1xuICAgICAgICAgICAgdHlwZXNTZXRbdHlwZV0gPSB0cnVlO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgdHlwZXMgPSBPYmplY3Qua2V5cyh0eXBlc1NldCkuc29ydCgpO1xuXG4gICAgICAgIGlmICh0eXBlcy5sZW5ndGggPD0gMSkge1xuICAgICAgICAgICAgJHdyYXBwZXIuaGlkZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgYWxsTGFiZWwgPSAoZ2xvYmFsVHJhbnNsYXRlICYmIGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlVHlwZUFsbCkgfHwgJ0FsbCc7XG4gICAgICAgIGxldCBtZW51SHRtbCA9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiIGRhdGEtdmFsdWU9XCJhbGxcIj4nICsgYWxsTGFiZWwgKyAnPC9kaXY+JztcbiAgICAgICAgdHlwZXMuZm9yRWFjaCgodHlwZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbGFiZWwgPSBtYXJrZXRwbGFjZS5tb2R1bGVUeXBlTGFiZWwodHlwZSk7XG4gICAgICAgICAgICBtZW51SHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIiBkYXRhLXZhbHVlPVwiJyArIHR5cGUgKyAnXCI+JyArIGxhYmVsICsgJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICAkZHJvcGRvd24uZmluZCgnLm1lbnUnKS5odG1sKG1lbnVIdG1sKTtcblxuICAgICAgICAvLyBQcmVzZXJ2ZSBjdXJyZW50IHNlbGVjdGlvbiBpZiB0aGUgdHlwZSBpcyBzdGlsbCBwcmVzZW50OyBvdGhlcndpc2UgZmFsbCBiYWNrIHRvICdhbGwnLlxuICAgICAgICBjb25zdCBwcmV2aW91c1R5cGUgPSBtYXJrZXRwbGFjZS5zZWxlY3RlZFR5cGU7XG4gICAgICAgIGNvbnN0IG5leHRUeXBlID0gcHJldmlvdXNUeXBlID09PSAnYWxsJyB8fCB0eXBlc1NldFtwcmV2aW91c1R5cGVdID8gcHJldmlvdXNUeXBlIDogJ2FsbCc7XG5cbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5hcHBseVR5cGVGaWx0ZXIodmFsdWUgfHwgJ2FsbCcpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgbmV4dFR5cGUpO1xuICAgICAgICAkd3JhcHBlci5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCBhY3RpdmUgZmlsdGVyIHZhbHVlIGFuZCByZWRyYXcgdGhlIHRhYmxlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlXG4gICAgICovXG4gICAgYXBwbHlUeXBlRmlsdGVyKHR5cGUpIHtcbiAgICAgICAgbWFya2V0cGxhY2Uuc2VsZWN0ZWRUeXBlID0gdHlwZSB8fCAnYWxsJztcbiAgICAgICAgaWYgKCQuZm4uRGF0YVRhYmxlICYmICQuZm4uRGF0YVRhYmxlLmlzRGF0YVRhYmxlKG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlKSkge1xuICAgICAgICAgICAgbWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUuRGF0YVRhYmxlKCkuZHJhdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc29sdmUgVUkgbGFiZWwgZm9yIGEgbW9kdWxlX3R5cGUuIFVzZXMgZ2xvYmFsVHJhbnNsYXRlIHdoZW4gYSBrbm93biBrZXkgZXhpc3RzLFxuICAgICAqIG90aGVyd2lzZSBmYWxscyBiYWNrIHRvIHRoZSByYXcgdHlwZSBzdHJpbmcgKGZvcndhcmQtY29tcGF0IHdpdGggbmV3IHNlcnZlciB0eXBlcykuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGVcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgICAqL1xuICAgIG1vZHVsZVR5cGVMYWJlbCh0eXBlKSB7XG4gICAgICAgIGlmICghdHlwZSkge1xuICAgICAgICAgICAgcmV0dXJuICdHZW5lcmFsJztcbiAgICAgICAgfVxuICAgICAgICAvLyBjYW1lbENhc2UtaWZ5IHNuYWtlX2Nhc2U6ICdjYWxsX2ZlYXR1cmUnIC0+ICdDYWxsRmVhdHVyZSdcbiAgICAgICAgY29uc3QgY2FtZWwgPSB0eXBlLnNwbGl0KCdfJykubWFwKChwYXJ0KSA9PiB7XG4gICAgICAgICAgICBpZiAocGFydC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcGFydC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHBhcnQuc2xpY2UoMSkudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfSkuam9pbignJyk7XG4gICAgICAgIGNvbnN0IGtleSA9ICdleHRfTW9kdWxlVHlwZScgKyBjYW1lbDtcbiAgICAgICAgaWYgKGdsb2JhbFRyYW5zbGF0ZSAmJiB0eXBlb2YgZ2xvYmFsVHJhbnNsYXRlW2tleV0gPT09ICdzdHJpbmcnICYmIGdsb2JhbFRyYW5zbGF0ZVtrZXldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBnbG9iYWxUcmFuc2xhdGVba2V5XTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGYWxsYmFjazogY2FwaXRhbGl6ZWQgcmF3IHR5cGUgKGtlZXBzIHRoZSBVSSByZWFkYWJsZSBmb3IgdW5rbm93biBjYXRlZ29yaWVzKS5cbiAgICAgICAgcmV0dXJuIHR5cGUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB0eXBlLnNsaWNlKDEpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBwcm9jZXNzIHRoZSBsaXN0IG9mIG1vZHVsZXMgcmVjZWl2ZWQgZnJvbSB0aGUgd2Vic2l0ZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyB0aGUgbGlzdCBvZiBtb2R1bGVzLlxuICAgICAqL1xuICAgIGNiUGFyc2VNb2R1bGVVcGRhdGVzKHJlc3BvbnNlRGF0YSwgaXNTdWNjZXNzZnVsKSB7XG4gICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZUxvYWRlci5oaWRlKCk7XG5cbiAgICAgICAgLy8gV2hlbiBzdWNjZXNzLCByZXNwb25zZURhdGEgaXMgcmVzcG9uc2UuZGF0YSBmcm9tIEFQSVxuICAgICAgICAvLyBXaGVuIGZhaWx1cmUsIHJlc3BvbnNlRGF0YSBpcyB0aGUgZnVsbCByZXNwb25zZSBvYmplY3RcbiAgICAgICAgaWYgKCFpc1N1Y2Nlc3NmdWwpIHtcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLiRub05ld01vZHVsZXNTZWdtZW50LnNob3coKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluIHN1Y2Nlc3MgY2FzZSwgcmVzcG9uc2VEYXRhIGlzIHJlc3BvbnNlLmRhdGEgd2hpY2ggc2hvdWxkIGNvbnRhaW4gbW9kdWxlc1xuICAgICAgICBjb25zdCBtb2R1bGVzID0gcmVzcG9uc2VEYXRhPy5tb2R1bGVzIHx8IFtdO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG1vZHVsZXMpICYmIG1vZHVsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgbW9kdWxlcy5mb3JFYWNoKChvYmopID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGlzIG1vZHVsZSBpcyBjb21wYXRpYmxlIHdpdGggdGhlIFBCWCBiYXNlZCBvbiB2ZXJzaW9uIG51bWJlclxuICAgICAgICAgICAgICAgIGNvbnN0IG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCA9IG9iai5taW5fcGJ4X3ZlcnNpb247XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3TW9kdWxlVmVyc2lvbiA9IG9iai52ZXJzaW9uO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRWZXJzaW9uUEJYID0gbWFya2V0cGxhY2UucGJ4VmVyc2lvbjtcbiAgICAgICAgICAgICAgICBpZiAobWFya2V0cGxhY2UudmVyc2lvbkNvbXBhcmUoY3VycmVudFZlcnNpb25QQlgsIG1pbkFwcHJvcHJpYXRlVmVyc2lvblBCWCkgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgbmV3IG1vZHVsZSByb3dcbiAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5hZGRNb2R1bGVEZXNjcmlwdGlvbihvYmopO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIG1vZHVsZSBpcyBhbHJlYWR5IGluc3RhbGxlZCBhbmQgb2ZmZXIgYW4gdXBkYXRlXG4gICAgICAgICAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICAgICAgICAgIGlmICgkbW9kdWxlUm93Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5zdGFsbGVkVmVyID0gJG1vZHVsZVJvdy5maW5kKCd0ZC52ZXJzaW9uJykudGV4dCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVyc2lvbkNvbXBhcmVSZXN1bHQgPSBtYXJrZXRwbGFjZS52ZXJzaW9uQ29tcGFyZShuZXdNb2R1bGVWZXJzaW9uLCBpbnN0YWxsZWRWZXIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodmVyc2lvbkNvbXBhcmVSZXN1bHQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5hZGRVcGRhdGVCdXR0b25Ub1JvdyhvYmopO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZlcnNpb25Db21wYXJlUmVzdWx0ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXRwbGFjZS5jaGFuZ2VEb3dubG9hZEJ1dHRvbk9uUm93KG9iaik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICgkKCd0ci5uZXctbW9kdWxlLXJvdycpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG1hcmtldHBsYWNlLiRub05ld01vZHVsZXNTZWdtZW50LmhpZGUoKTtcbiAgICAgICAgICAgIC8vIE9ubHkgaW5pdGlhbGl6ZSBpZiBEYXRhVGFibGUgaXMgbm90IGFscmVhZHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIGlmICghJC5mbi5EYXRhVGFibGUuaXNEYXRhVGFibGUobWFya2V0cGxhY2UuJG1hcmtldHBsYWNlVGFibGUpKSB7XG4gICAgICAgICAgICAgICAgbWFya2V0cGxhY2UuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlLnJlZ2lzdGVyVHlwZUZpbHRlcigpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0YWJsZSBpcyBhbHJlYWR5IGluaXRpYWxpemVkLCBqdXN0IHJlZHJhdyBpdFxuICAgICAgICAgICAgICAgIG1hcmtldHBsYWNlLiRtYXJrZXRwbGFjZVRhYmxlLkRhdGFUYWJsZSgpLmRyYXcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1hcmtldHBsYWNlLnBvcHVsYXRlVHlwZUZpbHRlcigpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbWFya2V0cGxhY2UuJG5vTmV3TW9kdWxlc1NlZ21lbnQuc2hvdygpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgVVJMIGhhcyBhIG1vZHVsZSBxdWVyeSBwYXJhbWV0ZXIgdG8gYXV0by1vcGVuIGl0cyBkZXRhaWwgbW9kYWxcbiAgICAgICAgbWFya2V0cGxhY2Uub3Blbk1vZHVsZUZyb21RdWVyeVBhcmFtKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgVVJMIHF1ZXJ5IHBhcmFtZXRlciBmb3IgYSBtb2R1bGUgdW5pcWlkIGFuZCBvcGVucyBpdHMgZGV0YWlsIG1vZGFsLlxuICAgICAqIFVSTCBmb3JtYXQ6ID9tb2R1bGU9TW9kdWxlVW5pcWlkIy9tYXJrZXRwbGFjZVxuICAgICAqL1xuICAgIG9wZW5Nb2R1bGVGcm9tUXVlcnlQYXJhbSgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgdW5pcWlkID0gdXJsUGFyYW1zLmdldCgnbW9kdWxlJyk7XG4gICAgICAgIGlmICghdW5pcWlkKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgJG1vZHVsZVJvdyA9ICQoYHRyLm5ldy1tb2R1bGUtcm93W2RhdGEtaWQ9JHt1bmlxaWR9XWApO1xuICAgICAgICBpZiAoJG1vZHVsZVJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkbW9kdWxlUm93LmZpbmQoJ3RkLnNob3ctZGV0YWlscy1vbi1jbGljaycpLmZpcnN0KCkudHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBDbGVhbiB1cCB0aGUgVVJMIHBhcmFtZXRlciBhZnRlciBvcGVuaW5nIHRoZSBtb2RhbFxuICAgICAgICBjb25zdCBjbGVhblVybCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSArIHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgICAgICB3aW5kb3cuaGlzdG9yeS5yZXBsYWNlU3RhdGUobnVsbCwgJycsIGNsZWFuVXJsKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIGRlc2NyaXB0aW9uIGZvciBhbiBhdmFpbGFibGUgbW9kdWxlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZE1vZHVsZURlc2NyaXB0aW9uKG9iaikge1xuICAgICAgICBtYXJrZXRwbGFjZS4kbWFya2V0cGxhY2VUYWJsZS5zaG93KCk7XG4gICAgICAgIGxldCBwcm9tb0xpbmsgPSAnJztcbiAgICAgICAgaWYgKG9iai5wcm9tb19saW5rICE9PSB1bmRlZmluZWQgJiYgb2JqLnByb21vX2xpbmsgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHByb21vTGluayA9IGA8YnI+PGEgaHJlZj1cIiR7b2JqLnByb21vX2xpbmt9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0V4dGVybmFsRGVzY3JpcHRpb259PC9hPmA7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgYWRkaXRpb25hbEljb24gPSAnPGkgY2xhc3M9XCJwdXp6bGUgcGllY2UgaWNvblwiPjwvaT4nO1xuICAgICAgICBpZiAob2JqLmNvbW1lcmNpYWwgIT09IDApIHtcbiAgICAgICAgICAgIGFkZGl0aW9uYWxJY29uID0gJzxpIGNsYXNzPVwidWkgZG9uYXRlIGljb25cIj48L2k+JztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtb2R1bGVUeXBlID0gKG9iai5tb2R1bGVfdHlwZSAmJiB0eXBlb2Ygb2JqLm1vZHVsZV90eXBlID09PSAnc3RyaW5nJylcbiAgICAgICAgICAgID8gb2JqLm1vZHVsZV90eXBlXG4gICAgICAgICAgICA6ICdnZW5lcmFsJztcbiAgICAgICAgY29uc3QgZHluYW1pY1JvdyA9IGBcblx0XHRcdDx0ciBjbGFzcz1cIm5ldy1tb2R1bGUtcm93XCIgZGF0YS1pZD1cIiR7b2JqLnVuaXFpZH1cIiBkYXRhLW5hbWU9XCIke2RlY29kZVVSSUNvbXBvbmVudChvYmoubmFtZSl9XCIgZGF0YS10eXBlPVwiJHttb2R1bGVUeXBlfVwiPlxuXHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwic2hvdy1kZXRhaWxzLW9uLWNsaWNrXCI+JHthZGRpdGlvbmFsSWNvbn0gJHtkZWNvZGVVUklDb21wb25lbnQob2JqLm5hbWUpfTxicj5cblx0XHRcdFx0XHRcdCAgICA8c3BhbiBjbGFzcz1cImZlYXR1cmVzXCI+JHtkZWNvZGVVUklDb21wb25lbnQob2JqLmRlc2NyaXB0aW9uKX0gJHtwcm9tb0xpbmt9PC9zcGFuPlxuXHRcdFx0XHRcdFx0PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7ZGVjb2RlVVJJQ29tcG9uZW50KG9iai5kZXZlbG9wZXIpfTwvdGQ+XG5cdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCB2ZXJzaW9uIHNob3ctZGV0YWlscy1vbi1jbGlja1wiPiR7b2JqLnZlcnNpb259PC90ZD5cblx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJpZ2h0IGFsaWduZWQgY29sbGFwc2luZ1wiPlxuICAgIFx0XHRcdFx0XHRcdFx0PGRpdiBjbGFzcz1cInVpIHNtYWxsIGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGljb24gYmFzaWMgYnV0dG9uIGRvd25sb2FkIHBvcHVwZWQgZGlzYWJsZS1pZi1uby1pbnRlcm5ldFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD0gXCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdW5pcWlkID0gXCIke29iai51bmlxaWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXNpemUgPSBcIiR7b2JqLnNpemV9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZlcnNpb24gPVwiJHtvYmoudmVyc2lvbn1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcmVsZWFzZWlkID1cIiR7b2JqLnJlbGVhc2VfaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGRvd25sb2FkIGJsdWVcIj48L2k+IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuXHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxuICAgIFx0XHRcdFx0ICAgIDwvdGQ+XHRcdFxuXHRcdFx0PC90cj5gO1xuICAgICAgICAkKCcjbmV3LW1vZHVsZXMtdGFibGUgdGJvZHknKS5hcHBlbmQoZHluYW1pY1Jvdyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgYW4gdXBkYXRlIGJ1dHRvbiB0byB0aGUgbW9kdWxlIHJvdyBmb3IgdXBkYXRpbmcgYW4gb2xkIHZlcnNpb24gb2YgUEJYLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmogLSBUaGUgbW9kdWxlIG9iamVjdCBjb250YWluaW5nIGluZm9ybWF0aW9uLlxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvblRvUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvd1tkYXRhLWlkPSR7b2JqLnVuaXFpZH1dYCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB3ZSdyZSB3b3JraW5nIHdpdGggYSBEYXRhVGFibGVcbiAgICAgICAgY29uc3QgJHRhYmxlID0gJCgnI2luc3RhbGxlZC1tb2R1bGVzLXRhYmxlJyk7XG4gICAgICAgIGlmICgkLmZuLkRhdGFUYWJsZSAmJiAkLmZuLkRhdGFUYWJsZS5pc0RhdGFUYWJsZSgkdGFibGUpKSB7XG4gICAgICAgICAgICBjb25zdCB0YWJsZSA9ICR0YWJsZS5EYXRhVGFibGUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIGpRdWVyeSBlbGVtZW50IHRvIGZpbmQgdGhlIHJvdyBpbiBEYXRhVGFibGUgaW5zdGVhZCBvZiBpbmRleFxuICAgICAgICAgICAgY29uc3QgZHRSb3cgPSB0YWJsZS5yb3coJG1vZHVsZVJvdyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChkdFJvdy5hbnkoKSkge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgcm93IG5vZGUgdG8gd29yayB3aXRoXG4gICAgICAgICAgICAgICAgY29uc3QgJHJvd05vZGUgPSAkKGR0Um93Lm5vZGUoKSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2xvbmUgdGhlIHJvdydzIGxhc3QgY2VsbCAoYWN0aW9uIGJ1dHRvbnMgY2VsbClcbiAgICAgICAgICAgICAgICBjb25zdCAkbGFzdENlbGwgPSAkcm93Tm9kZS5maW5kKCd0ZDpsYXN0JykuY2xvbmUoKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZG93bmxvYWQgYnV0dG9uIGlmIGV4aXN0c1xuICAgICAgICAgICAgICAgICRsYXN0Q2VsbC5maW5kKCdhLmRvd25sb2FkJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHVwZGF0ZSBidXR0b25cbiAgICAgICAgICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGV9XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS12ZXJzaW9uID1cIiR7b2JqLnZlcnNpb259XCJcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG4gICAgICAgICAgICAgICAgICAgIGRhdGEtdW5pcWlkID1cIiR7b2JqLnVuaXFpZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgZGF0YS1yZWxlYXNlaWQgPVwiJHtvYmoucmVsZWFzZV9pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG4gICAgICAgICAgICAgICAgICAgIDwvYT5gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFByZXBlbmQgYnV0dG9uIHRvIGFjdGlvbi1idXR0b25zIGRpdlxuICAgICAgICAgICAgICAgICRsYXN0Q2VsbC5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKS5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0aGUgY2VsbCBpbiBEYXRhVGFibGUgdXNpbmcgdGhlIHJvdyBBUElcbiAgICAgICAgICAgICAgICBjb25zdCBjZWxsSW5kZXggPSAkcm93Tm9kZS5maW5kKCd0ZCcpLmxlbmd0aCAtIDE7IC8vIExhc3QgY2VsbFxuICAgICAgICAgICAgICAgIHRhYmxlLmNlbGwoZHRSb3csIGNlbGxJbmRleCkuZGF0YSgkbGFzdENlbGwuaHRtbCgpKS5kcmF3KGZhbHNlKTtcblxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgYWxsIHBvcHVwcyBhZnRlciBET00gdXBkYXRlXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZXMuaW5pdGlhbGl6ZVBvcHVwcygpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIHJvdyBub3QgZm91bmQgaW4gRGF0YVRhYmxlLCB1c2UgZGlyZWN0IERPTSBtYW5pcHVsYXRpb25cbiAgICAgICAgICAgICAgICB0aGlzLmFkZFVwZGF0ZUJ1dHRvbkRpcmVjdGx5KCRtb2R1bGVSb3csIG9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayBmb3Igbm9uLURhdGFUYWJsZSBzY2VuYXJpb1xuICAgICAgICAgICAgdGhpcy5hZGRVcGRhdGVCdXR0b25EaXJlY3RseSgkbW9kdWxlUm93LCBvYmopO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBtYXJrZXRwbGFjZS4kYnRuVXBkYXRlQWxsTW9kdWxlcy5zaG93KCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBBZGRzIHVwZGF0ZSBidXR0b24gZGlyZWN0bHkgdG8gRE9NIHdpdGhvdXQgRGF0YVRhYmxlIEFQSVxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkbW9kdWxlUm93IC0gVGhlIG1vZHVsZSByb3cgalF1ZXJ5IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvblxuICAgICAqL1xuICAgIGFkZFVwZGF0ZUJ1dHRvbkRpcmVjdGx5KCRtb2R1bGVSb3csIG9iaikge1xuICAgICAgICBjb25zdCAkY3VycmVudERvd25sb2FkQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLmRvd25sb2FkJyk7XG4gICAgICAgICRjdXJyZW50RG93bmxvYWRCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBkeW5hbWljQnV0dG9uID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiB1cGRhdGUgcG9wdXBlZCBkaXNhYmxlLWlmLW5vLWludGVybmV0XCIgXG4gICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlfVwiXG4gICAgICAgICAgICBkYXRhLXZlcnNpb24gPVwiJHtvYmoudmVyc2lvbn1cIlxuICAgICAgICAgICAgZGF0YS1zaXplID0gXCIke29iai5zaXplfVwiXG4gICAgICAgICAgICBkYXRhLXVuaXFpZCA9XCIke29iai51bmlxaWR9XCIgXG4gICAgICAgICAgICBkYXRhLXJlbGVhc2VpZCA9XCIke29iai5yZWxlYXNlX2lkfVwiPlxuICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHJlZG8gYmx1ZVwiPjwvaT4gXG4gICAgICAgICAgICA8L2E+YDtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICRhY3Rpb25CdXR0b25zID0gJG1vZHVsZVJvdy5maW5kKCcuYWN0aW9uLWJ1dHRvbnMnKTtcbiAgICAgICAgJGFjdGlvbkJ1dHRvbnMucHJlcGVuZChkeW5hbWljQnV0dG9uKTtcblxuICAgICAgICAvLyBSZS1pbml0aWFsaXplIGFsbCBwb3B1cHMgYWZ0ZXIgRE9NIHVwZGF0ZVxuICAgICAgICBleHRlbnNpb25Nb2R1bGVzLmluaXRpYWxpemVQb3B1cHMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gb2JqIC0gVGhlIG1vZHVsZSBvYmplY3QgY29udGFpbmluZyBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjaGFuZ2VEb3dubG9hZEJ1dHRvbk9uUm93KG9iaikge1xuICAgICAgICBjb25zdCAkbW9kdWxlUm93ID0gJChgdHIubmV3LW1vZHVsZS1yb3dbZGF0YS1pZD0ke29iai51bmlxaWR9XWApO1xuICAgICAgICBjb25zdCAkY3VycmVudERvd25sb2FkQnV0dG9uID0gJG1vZHVsZVJvdy5maW5kKCdhLmRvd25sb2FkJyk7XG4gICAgICAgICRjdXJyZW50RG93bmxvYWRCdXR0b24ucmVtb3ZlKCk7XG4gICAgICAgIGNvbnN0IGR5bmFtaWNCdXR0b25cbiAgICAgICAgICAgID0gYDxhIGhyZWY9XCIjXCIgY2xhc3M9XCJ1aSBiYXNpYyBpY29uIGJ1dHRvbiBwb3B1cGVkIGRpc2FibGUtaWYtbm8taW50ZXJuZXRcIiBcblx0XHRcdGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9TaG93TW9kdWxlUmVwb0RldGFpbHN9XCI+XG5cdFx0XHQ8aSBjbGFzcz1cImljb24gc2VhcmNoIGJsdWVcIj48L2k+IFxuXHRcdFx0PC9hPmA7XG4gICAgICAgICRtb2R1bGVSb3cuZmluZCgnLmFjdGlvbi1idXR0b25zJylcbiAgICAgICAgICAgIC5wcmVwZW5kKGR5bmFtaWNCdXR0b24pO1xuICAgICAgICAkbW9kdWxlUm93LmZpbmQoJy5hY3Rpb24tYnV0dG9ucycpLmNsb3Nlc3QoJ3RkJykuYWRkQ2xhc3MoJ3Nob3ctZGV0YWlscy1vbi1jbGljaycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb21wYXJlIHZlcnNpb25zIG9mIG1vZHVsZXMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHYxIC0gVGhlIGZpcnN0IHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdjIgLSBUaGUgc2Vjb25kIHZlcnNpb24gdG8gY29tcGFyZS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdIC0gT3B0aW9uYWwgY29uZmlndXJhdGlvbiBvcHRpb25zLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMubGV4aWNvZ3JhcGhpY2FsXSAtIFdoZXRoZXIgdG8gcGVyZm9ybSBsZXhpY29ncmFwaGljYWwgY29tcGFyaXNvbiAoZGVmYXVsdDogZmFsc2UpLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuemVyb0V4dGVuZF0gLSBXZWF0aGVyIHRvIHplcm8tZXh0ZW5kIHRoZSBzaG9ydGVyIHZlcnNpb24gKGRlZmF1bHQ6IGZhbHNlKS5cbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSAtIEEgbnVtYmVyIGluZGljYXRpbmcgdGhlIGNvbXBhcmlzb24gcmVzdWx0OiAwIGlmIHZlcnNpb25zIGFyZSBlcXVhbCwgMSBpZiB2MSBpcyBncmVhdGVyLCAtMSBpZiB2MiBpcyBncmVhdGVyLCBvciBOYU4gaWYgdGhlIHZlcnNpb25zIGFyZSBpbnZhbGlkLlxuICAgICAqL1xuICAgIHZlcnNpb25Db21wYXJlKHYxLCB2Miwgb3B0aW9ucykge1xuICAgICAgICBjb25zdCBsZXhpY29ncmFwaGljYWwgPSBvcHRpb25zICYmIG9wdGlvbnMubGV4aWNvZ3JhcGhpY2FsO1xuICAgICAgICBjb25zdCB6ZXJvRXh0ZW5kID0gb3B0aW9ucyAmJiBvcHRpb25zLnplcm9FeHRlbmQ7XG4gICAgICAgIGxldCB2MXBhcnRzID0gU3RyaW5nKHYxKS5zcGxpdCgnLicpO1xuICAgICAgICBsZXQgdjJwYXJ0cyA9IFN0cmluZyh2Mikuc3BsaXQoJy4nKTtcblxuICAgICAgICBmdW5jdGlvbiBpc1ZhbGlkUGFydCh4KSB7XG4gICAgICAgICAgICByZXR1cm4gKGxleGljb2dyYXBoaWNhbCA/IC9eXFxkK1tBLVphLXpdKiQvIDogL15cXGQrJC8pLnRlc3QoeCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXYxcGFydHMuZXZlcnkoaXNWYWxpZFBhcnQpIHx8ICF2MnBhcnRzLmV2ZXJ5KGlzVmFsaWRQYXJ0KSkge1xuICAgICAgICAgICAgcmV0dXJuIE5hTjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh6ZXJvRXh0ZW5kKSB7XG4gICAgICAgICAgICB3aGlsZSAodjFwYXJ0cy5sZW5ndGggPCB2MnBhcnRzLmxlbmd0aCkgdjFwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgICAgICB3aGlsZSAodjJwYXJ0cy5sZW5ndGggPCB2MXBhcnRzLmxlbmd0aCkgdjJwYXJ0cy5wdXNoKCcwJyk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWxleGljb2dyYXBoaWNhbCkge1xuICAgICAgICAgICAgdjFwYXJ0cyA9IHYxcGFydHMubWFwKE51bWJlcik7XG4gICAgICAgICAgICB2MnBhcnRzID0gdjJwYXJ0cy5tYXAoTnVtYmVyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdjFwYXJ0cy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgaWYgKHYycGFydHMubGVuZ3RoID09PSBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodjFwYXJ0c1tpXSA9PT0gdjJwYXJ0c1tpXSkge1xuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHYxcGFydHNbaV0gPiB2MnBhcnRzW2ldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2MXBhcnRzLmxlbmd0aCAhPT0gdjJwYXJ0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAwO1xuICAgIH0sXG5cbn07XG5cbi8vIE1ha2UgbWFya2V0cGxhY2UgZ2xvYmFsbHkgYWNjZXNzaWJsZVxud2luZG93Lm1hcmtldHBsYWNlID0gbWFya2V0cGxhY2U7Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFdBQVcsR0FBRztFQUVoQjtBQUNKO0FBQ0E7QUFDQTtFQUNJQyxpQkFBaUIsRUFBRUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO0VBRTFDO0FBQ0o7QUFDQTtBQUNBO0VBQ0lDLGtCQUFrQixFQUFFRCxDQUFDLENBQUMscUJBQXFCLENBQUM7RUFFNUM7QUFDSjtBQUNBO0FBQ0E7RUFDSUUsb0JBQW9CLEVBQUVGLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQztFQUVsRDtBQUNKO0FBQ0E7QUFDQTtFQUNJRyxVQUFVLEVBQUVDLGdCQUFnQixDQUFDQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztFQUVqRDtBQUNKO0FBQ0E7QUFDQTtFQUNJQyxvQkFBb0IsRUFBRU4sQ0FBQyxDQUFDLDRCQUE0QixDQUFDO0VBRXJEO0FBQ0o7QUFDQTtBQUNBO0VBQ0lPLGFBQWEsRUFBRSxLQUFLO0VBRXBCO0FBQ0o7QUFDQTtBQUNBO0VBQ0lDLFlBQVksRUFBRSxLQUFLO0VBRW5CO0FBQ0o7QUFDQTtBQUNBO0VBQ0lDLFlBQVksRUFBRSxJQUFJO0VBRWxCO0FBQ0o7QUFDQTtFQUNJQyxVQUFVLFdBQVZBLFVBQVVBLENBQUEsRUFBRztJQUNULElBQUlaLFdBQVcsQ0FBQ1MsYUFBYSxFQUFFO01BQzNCO0lBQ0o7SUFDQVQsV0FBVyxDQUFDUyxhQUFhLEdBQUcsSUFBSTtJQUNoQ0ksVUFBVSxDQUFDQyxZQUFZLENBQUNkLFdBQVcsQ0FBQ2Usb0JBQW9CLENBQUM7RUFDN0QsQ0FBQztFQUVEO0FBQ0o7QUFDQTtFQUNJQyxtQkFBbUIsV0FBbkJBLG1CQUFtQkEsQ0FBQSxFQUFHO0lBQ2xCaEIsV0FBVyxDQUFDQyxpQkFBaUIsQ0FBQ2dCLFNBQVMsQ0FBQztNQUNwQ0MsWUFBWSxFQUFFLEtBQUs7TUFDbkJDLE1BQU0sRUFBRSxLQUFLO01BQ2JDLE9BQU8sRUFBRSxDQUNMO1FBQUNDLFNBQVMsRUFBRTtNQUFLLENBQUMsRUFDbEIsSUFBSSxFQUNKO1FBQUNBLFNBQVMsRUFBRSxLQUFLO1FBQUVDLFVBQVUsRUFBRTtNQUFLLENBQUMsRUFDckM7UUFBQ0QsU0FBUyxFQUFFLEtBQUs7UUFBRUMsVUFBVSxFQUFFO01BQUssQ0FBQyxDQUN4QztNQUNEQyxTQUFTLEVBQUUsS0FBSztNQUNoQkMsSUFBSSxFQUFFLE9BQU87TUFDYkMsUUFBUSxFQUFFQyxvQkFBb0IsQ0FBQ0MscUJBQXFCO01BQ3BEQyxZQUFZLEVBQUUsU0FBZEEsWUFBWUEsQ0FBQSxFQUFjO1FBQ3RCLElBQUksQ0FBQ0MsR0FBRyxDQUFDLENBQUMsQ0FDTFQsT0FBTyxDQUFDLENBQUMsQ0FDVFUsS0FBSyxDQUFDLFlBQVk7VUFBQSxJQUFBQyxLQUFBO1VBQ2YsSUFBSUMsTUFBTSxHQUFHLElBQUk7VUFDakIsSUFBSUEsTUFBTSxDQUFDQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUN0QixJQUFJQyxLQUFLLEdBQUdGLE1BQU0sQ0FBQ0csTUFBTSxDQUFDLENBQUMsQ0FBQ0MsV0FBVzs7WUFFdkM7WUFDQSxJQUFJQyxPQUFPLEdBQUdDLFFBQVEsQ0FBQ0MsYUFBYSxDQUFDLEtBQUssQ0FBQztZQUMzQ0YsT0FBTyxDQUFDRyxTQUFTLEdBQUcsb0JBQW9CO1lBQ3hDLElBQUlDLEtBQUssR0FBR0gsUUFBUSxDQUFDQyxhQUFhLENBQUMsT0FBTyxDQUFDO1lBQzNDRSxLQUFLLENBQUNDLFdBQVcsR0FBR1IsS0FBSztZQUN6Qk8sS0FBSyxDQUFDRSxJQUFJLEdBQUcsTUFBTTtZQUNuQkYsS0FBSyxDQUFDRyxLQUFLLENBQUNDLEtBQUssR0FBRyxPQUFPO1lBQzNCLElBQUlDLElBQUksR0FBR1IsUUFBUSxDQUFDQyxhQUFhLENBQUMsR0FBRyxDQUFDO1lBQ3RDTyxJQUFJLENBQUNOLFNBQVMsR0FBRyxhQUFhO1lBQzlCSCxPQUFPLENBQUNVLFdBQVcsQ0FBQ04sS0FBSyxDQUFDO1lBQzFCSixPQUFPLENBQUNVLFdBQVcsQ0FBQ0QsSUFBSSxDQUFDOztZQUV6QjtZQUNBZCxNQUFNLENBQUNHLE1BQU0sQ0FBQyxDQUFDLENBQUNDLFdBQVcsR0FBRyxFQUFFO1lBQ2hDSixNQUFNLENBQUNHLE1BQU0sQ0FBQyxDQUFDLENBQUNZLFdBQVcsQ0FBQ1YsT0FBTyxDQUFDOztZQUVwQztZQUNBQSxPQUFPLENBQUNXLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxVQUFDQyxDQUFDO2NBQUEsT0FBS0EsQ0FBQyxDQUFDQyxlQUFlLENBQUMsQ0FBQztZQUFBLEVBQUM7O1lBRTdEO1lBQ0FULEtBQUssQ0FBQ08sZ0JBQWdCLENBQUMsT0FBTyxFQUFFLFlBQU07Y0FDbEMsSUFBSWhCLE1BQU0sQ0FBQ21CLE1BQU0sQ0FBQyxDQUFDLEtBQUtwQixLQUFJLENBQUNxQixLQUFLLEVBQUU7Z0JBQ2hDcEIsTUFBTSxDQUFDbUIsTUFBTSxDQUFDVixLQUFLLENBQUNXLEtBQUssQ0FBQyxDQUFDQyxJQUFJLENBQUMsQ0FBQztjQUNyQztZQUNKLENBQUMsQ0FBQztVQUNOO1FBQ0osQ0FBQyxDQUFDO01BQ1Y7SUFDSixDQUFDLENBQUM7RUFDTixDQUFDO0VBRUQ7QUFDSjtBQUNBO0FBQ0E7RUFDSUMsa0JBQWtCLFdBQWxCQSxrQkFBa0JBLENBQUEsRUFBRztJQUNqQixJQUFJLENBQUNwRCxDQUFDLENBQUNxRCxFQUFFLENBQUN0QyxTQUFTLElBQUksQ0FBQ2YsQ0FBQyxDQUFDcUQsRUFBRSxDQUFDdEMsU0FBUyxDQUFDdUMsR0FBRyxJQUFJLENBQUN0RCxDQUFDLENBQUNxRCxFQUFFLENBQUN0QyxTQUFTLENBQUN1QyxHQUFHLENBQUNMLE1BQU0sRUFBRTtNQUN0RTtJQUNKO0lBQ0EsSUFBTU0sV0FBVyxHQUFHdkQsQ0FBQyxDQUFDcUQsRUFBRSxDQUFDdEMsU0FBUyxDQUFDdUMsR0FBRyxDQUFDTCxNQUFNO0lBQzdDLElBQUluRCxXQUFXLENBQUNXLFlBQVksRUFBRTtNQUMxQixJQUFNK0MsR0FBRyxHQUFHRCxXQUFXLENBQUNFLE9BQU8sQ0FBQzNELFdBQVcsQ0FBQ1csWUFBWSxDQUFDO01BQ3pELElBQUkrQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUU7UUFDWkQsV0FBVyxDQUFDRyxNQUFNLENBQUNGLEdBQUcsRUFBRSxDQUFDLENBQUM7TUFDOUI7SUFDSjtJQUNBMUQsV0FBVyxDQUFDVyxZQUFZLEdBQUcsVUFBVWtELFFBQVEsRUFBRUMsSUFBSSxFQUFFQyxTQUFTLEVBQUVDLE9BQU8sRUFBRUMsV0FBVyxFQUFFQyxHQUFHLEVBQUU7TUFDdkY7TUFDQSxJQUFJLENBQUNMLFFBQVEsSUFBSSxDQUFDQSxRQUFRLENBQUNNLE1BQU0sSUFBSU4sUUFBUSxDQUFDTSxNQUFNLENBQUNDLEVBQUUsS0FBSyxtQkFBbUIsRUFBRTtRQUM3RSxPQUFPLElBQUk7TUFDZjtNQUNBLElBQUlwRSxXQUFXLENBQUNVLFlBQVksS0FBSyxLQUFLLEVBQUU7UUFDcEMsT0FBTyxJQUFJO01BQ2Y7TUFDQSxJQUFNMkQsT0FBTyxHQUFHSCxHQUFHLEtBQUtMLFFBQVEsQ0FBQ1MsTUFBTSxDQUFDUCxTQUFTLENBQUMsR0FBR0YsUUFBUSxDQUFDUyxNQUFNLENBQUNQLFNBQVMsQ0FBQyxDQUFDUSxHQUFHLEdBQUcsSUFBSSxDQUFDO01BQzNGLElBQUksQ0FBQ0YsT0FBTyxFQUFFO1FBQ1YsT0FBTyxJQUFJO01BQ2Y7TUFDQSxJQUFNRyxPQUFPLEdBQUd0RSxDQUFDLENBQUNtRSxPQUFPLENBQUMsQ0FBQ0ksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFNBQVM7TUFDekQsT0FBT0QsT0FBTyxLQUFLeEUsV0FBVyxDQUFDVSxZQUFZO0lBQy9DLENBQUM7SUFDRCtDLFdBQVcsQ0FBQ2lCLElBQUksQ0FBQzFFLFdBQVcsQ0FBQ1csWUFBWSxDQUFDO0VBQzlDLENBQUM7RUFFRDtBQUNKO0FBQ0E7QUFDQTtFQUNJZ0Usa0JBQWtCLFdBQWxCQSxrQkFBa0JBLENBQUEsRUFBRztJQUNqQixJQUFNQyxRQUFRLEdBQUcxRSxDQUFDLENBQUMsNkJBQTZCLENBQUM7SUFDakQsSUFBTTJFLFNBQVMsR0FBRzNFLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQztJQUMxQyxJQUFJMEUsUUFBUSxDQUFDRSxNQUFNLEtBQUssQ0FBQyxJQUFJRCxTQUFTLENBQUNDLE1BQU0sS0FBSyxDQUFDLEVBQUU7TUFDakQ7SUFDSjtJQUVBLElBQU1DLFFBQVEsR0FBRyxDQUFDLENBQUM7SUFDbkI3RSxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQzhFLElBQUksQ0FBQyxZQUFZO01BQ3BDLElBQU1yQyxJQUFJLEdBQUd6QyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUN1RSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksU0FBUztNQUNuRE0sUUFBUSxDQUFDcEMsSUFBSSxDQUFDLEdBQUcsSUFBSTtJQUN6QixDQUFDLENBQUM7SUFDRixJQUFNc0MsS0FBSyxHQUFHQyxNQUFNLENBQUNDLElBQUksQ0FBQ0osUUFBUSxDQUFDLENBQUNLLElBQUksQ0FBQyxDQUFDO0lBRTFDLElBQUlILEtBQUssQ0FBQ0gsTUFBTSxJQUFJLENBQUMsRUFBRTtNQUNuQkYsUUFBUSxDQUFDUyxJQUFJLENBQUMsQ0FBQztNQUNmO0lBQ0o7SUFFQSxJQUFNQyxRQUFRLEdBQUlDLGVBQWUsSUFBSUEsZUFBZSxDQUFDQyxpQkFBaUIsSUFBSyxLQUFLO0lBQ2hGLElBQUlDLFFBQVEsR0FBRyxxQ0FBcUMsR0FBR0gsUUFBUSxHQUFHLFFBQVE7SUFDMUVMLEtBQUssQ0FBQ1MsT0FBTyxDQUFDLFVBQUMvQyxJQUFJLEVBQUs7TUFDcEIsSUFBTWdELEtBQUssR0FBRzNGLFdBQVcsQ0FBQzRGLGVBQWUsQ0FBQ2pELElBQUksQ0FBQztNQUMvQzhDLFFBQVEsSUFBSSxnQ0FBZ0MsR0FBRzlDLElBQUksR0FBRyxJQUFJLEdBQUdnRCxLQUFLLEdBQUcsUUFBUTtJQUNqRixDQUFDLENBQUM7SUFDRmQsU0FBUyxDQUFDZ0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDQyxJQUFJLENBQUNMLFFBQVEsQ0FBQzs7SUFFdEM7SUFDQSxJQUFNTSxZQUFZLEdBQUcvRixXQUFXLENBQUNVLFlBQVk7SUFDN0MsSUFBTXNGLFFBQVEsR0FBR0QsWUFBWSxLQUFLLEtBQUssSUFBSWhCLFFBQVEsQ0FBQ2dCLFlBQVksQ0FBQyxHQUFHQSxZQUFZLEdBQUcsS0FBSztJQUV4RmxCLFNBQVMsQ0FBQ29CLFFBQVEsQ0FBQztNQUNmQyxRQUFRLEVBQUUsU0FBVkEsUUFBUUEsQ0FBWTlDLEtBQUssRUFBRTtRQUN2QnBELFdBQVcsQ0FBQ21HLGVBQWUsQ0FBQy9DLEtBQUssSUFBSSxLQUFLLENBQUM7TUFDL0M7SUFDSixDQUFDLENBQUM7SUFDRnlCLFNBQVMsQ0FBQ29CLFFBQVEsQ0FBQyxjQUFjLEVBQUVELFFBQVEsQ0FBQztJQUM1Q3BCLFFBQVEsQ0FBQ3dCLElBQUksQ0FBQyxDQUFDO0VBQ25CLENBQUM7RUFFRDtBQUNKO0FBQ0E7QUFDQTtFQUNJRCxlQUFlLFdBQWZBLGVBQWVBLENBQUN4RCxJQUFJLEVBQUU7SUFDbEIzQyxXQUFXLENBQUNVLFlBQVksR0FBR2lDLElBQUksSUFBSSxLQUFLO0lBQ3hDLElBQUl6QyxDQUFDLENBQUNxRCxFQUFFLENBQUN0QyxTQUFTLElBQUlmLENBQUMsQ0FBQ3FELEVBQUUsQ0FBQ3RDLFNBQVMsQ0FBQ29GLFdBQVcsQ0FBQ3JHLFdBQVcsQ0FBQ0MsaUJBQWlCLENBQUMsRUFBRTtNQUM3RUQsV0FBVyxDQUFDQyxpQkFBaUIsQ0FBQ2dCLFNBQVMsQ0FBQyxDQUFDLENBQUNvQyxJQUFJLENBQUMsQ0FBQztJQUNwRDtFQUNKLENBQUM7RUFFRDtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7RUFDSXVDLGVBQWUsV0FBZkEsZUFBZUEsQ0FBQ2pELElBQUksRUFBRTtJQUNsQixJQUFJLENBQUNBLElBQUksRUFBRTtNQUNQLE9BQU8sU0FBUztJQUNwQjtJQUNBO0lBQ0EsSUFBTTJELEtBQUssR0FBRzNELElBQUksQ0FBQzRELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQ0MsR0FBRyxDQUFDLFVBQUNDLElBQUksRUFBSztNQUN4QyxJQUFJQSxJQUFJLENBQUMzQixNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ25CLE9BQU8sRUFBRTtNQUNiO01BQ0EsT0FBTzJCLElBQUksQ0FBQ0MsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQyxHQUFHRixJQUFJLENBQUNHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7SUFDckUsQ0FBQyxDQUFDLENBQUNDLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDWCxJQUFNQyxHQUFHLEdBQUcsZ0JBQWdCLEdBQUdULEtBQUs7SUFDcEMsSUFBSWYsZUFBZSxJQUFJLE9BQU9BLGVBQWUsQ0FBQ3dCLEdBQUcsQ0FBQyxLQUFLLFFBQVEsSUFBSXhCLGVBQWUsQ0FBQ3dCLEdBQUcsQ0FBQyxDQUFDakMsTUFBTSxHQUFHLENBQUMsRUFBRTtNQUNoRyxPQUFPUyxlQUFlLENBQUN3QixHQUFHLENBQUM7SUFDL0I7SUFDQTtJQUNBLE9BQU9wRSxJQUFJLENBQUMrRCxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDLEdBQUdoRSxJQUFJLENBQUNpRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0VBQ3ZELENBQUM7RUFFRDtBQUNKO0FBQ0E7QUFDQTtFQUNJN0Ysb0JBQW9CLFdBQXBCQSxvQkFBb0JBLENBQUNpRyxZQUFZLEVBQUVDLFlBQVksRUFBRTtJQUM3Q2pILFdBQVcsQ0FBQ0csa0JBQWtCLENBQUNrRixJQUFJLENBQUMsQ0FBQzs7SUFFckM7SUFDQTtJQUNBLElBQUksQ0FBQzRCLFlBQVksRUFBRTtNQUNmakgsV0FBVyxDQUFDSSxvQkFBb0IsQ0FBQ2dHLElBQUksQ0FBQyxDQUFDO01BQ3ZDO0lBQ0o7O0lBRUE7SUFDQSxJQUFNYyxPQUFPLEdBQUcsQ0FBQUYsWUFBWSxhQUFaQSxZQUFZLHVCQUFaQSxZQUFZLENBQUVFLE9BQU8sS0FBSSxFQUFFO0lBRTNDLElBQUlDLEtBQUssQ0FBQ0MsT0FBTyxDQUFDRixPQUFPLENBQUMsSUFBSUEsT0FBTyxDQUFDcEMsTUFBTSxHQUFHLENBQUMsRUFBRTtNQUM5Q29DLE9BQU8sQ0FBQ3hCLE9BQU8sQ0FBQyxVQUFDMkIsR0FBRyxFQUFLO1FBQ3JCO1FBQ0EsSUFBTUMsd0JBQXdCLEdBQUdELEdBQUcsQ0FBQ0UsZUFBZTtRQUNwRCxJQUFNQyxnQkFBZ0IsR0FBR0gsR0FBRyxDQUFDSSxPQUFPO1FBQ3BDLElBQU1DLGlCQUFpQixHQUFHMUgsV0FBVyxDQUFDSyxVQUFVO1FBQ2hELElBQUlMLFdBQVcsQ0FBQzJILGNBQWMsQ0FBQ0QsaUJBQWlCLEVBQUVKLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFO1VBQzdFO1FBQ0o7O1FBRUE7UUFDQXRILFdBQVcsQ0FBQzRILG9CQUFvQixDQUFDUCxHQUFHLENBQUM7O1FBRXJDO1FBQ0EsSUFBTVEsVUFBVSxHQUFHM0gsQ0FBQywwQkFBQTRILE1BQUEsQ0FBMEJULEdBQUcsQ0FBQ1UsTUFBTSxNQUFHLENBQUM7UUFDNUQsSUFBSUYsVUFBVSxDQUFDL0MsTUFBTSxHQUFHLENBQUMsRUFBRTtVQUN2QixJQUFNa0QsWUFBWSxHQUFHSCxVQUFVLENBQUNoQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUNvQyxJQUFJLENBQUMsQ0FBQyxDQUFDQyxJQUFJLENBQUMsQ0FBQztVQUNoRSxJQUFNQyxvQkFBb0IsR0FBR25JLFdBQVcsQ0FBQzJILGNBQWMsQ0FBQ0gsZ0JBQWdCLEVBQUVRLFlBQVksQ0FBQztVQUN2RixJQUFJRyxvQkFBb0IsR0FBRyxDQUFDLEVBQUU7WUFDMUJuSSxXQUFXLENBQUNvSSxvQkFBb0IsQ0FBQ2YsR0FBRyxDQUFDO1VBQ3pDLENBQUMsTUFBTSxJQUFJYyxvQkFBb0IsS0FBSyxDQUFDLEVBQUU7WUFDbkNuSSxXQUFXLENBQUNxSSx5QkFBeUIsQ0FBQ2hCLEdBQUcsQ0FBQztVQUM5QztRQUNKO01BQ0osQ0FBQyxDQUFDO0lBQ047SUFFQSxJQUFJbkgsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUM0RSxNQUFNLEdBQUcsQ0FBQyxFQUFFO01BQ25DOUUsV0FBVyxDQUFDSSxvQkFBb0IsQ0FBQ2lGLElBQUksQ0FBQyxDQUFDO01BQ3ZDO01BQ0EsSUFBSSxDQUFDbkYsQ0FBQyxDQUFDcUQsRUFBRSxDQUFDdEMsU0FBUyxDQUFDb0YsV0FBVyxDQUFDckcsV0FBVyxDQUFDQyxpQkFBaUIsQ0FBQyxFQUFFO1FBQzVERCxXQUFXLENBQUNnQixtQkFBbUIsQ0FBQyxDQUFDO1FBQ2pDaEIsV0FBVyxDQUFDc0Qsa0JBQWtCLENBQUMsQ0FBQztNQUNwQyxDQUFDLE1BQU07UUFDSDtRQUNBdEQsV0FBVyxDQUFDQyxpQkFBaUIsQ0FBQ2dCLFNBQVMsQ0FBQyxDQUFDLENBQUNvQyxJQUFJLENBQUMsQ0FBQztNQUNwRDtNQUNBckQsV0FBVyxDQUFDMkUsa0JBQWtCLENBQUMsQ0FBQztJQUNwQyxDQUFDLE1BQU07TUFDSDNFLFdBQVcsQ0FBQ0ksb0JBQW9CLENBQUNnRyxJQUFJLENBQUMsQ0FBQztJQUMzQzs7SUFFQTtJQUNBcEcsV0FBVyxDQUFDc0ksd0JBQXdCLENBQUMsQ0FBQztFQUMxQyxDQUFDO0VBRUQ7QUFDSjtBQUNBO0FBQ0E7RUFDSUEsd0JBQXdCLFdBQXhCQSx3QkFBd0JBLENBQUEsRUFBRztJQUN2QixJQUFNQyxTQUFTLEdBQUcsSUFBSUMsZUFBZSxDQUFDQyxNQUFNLENBQUNDLFFBQVEsQ0FBQ3ZGLE1BQU0sQ0FBQztJQUM3RCxJQUFNNEUsTUFBTSxHQUFHUSxTQUFTLENBQUNJLEdBQUcsQ0FBQyxRQUFRLENBQUM7SUFDdEMsSUFBSSxDQUFDWixNQUFNLEVBQUU7TUFDVDtJQUNKO0lBQ0EsSUFBTUYsVUFBVSxHQUFHM0gsQ0FBQyw4QkFBQTRILE1BQUEsQ0FBOEJDLE1BQU0sTUFBRyxDQUFDO0lBQzVELElBQUlGLFVBQVUsQ0FBQy9DLE1BQU0sR0FBRyxDQUFDLEVBQUU7TUFDdkIrQyxVQUFVLENBQUNoQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQytDLEtBQUssQ0FBQyxDQUFDLENBQUNDLE9BQU8sQ0FBQyxPQUFPLENBQUM7SUFDeEU7SUFDQTtJQUNBLElBQU1DLFFBQVEsR0FBR0wsTUFBTSxDQUFDQyxRQUFRLENBQUNLLFFBQVEsR0FBR04sTUFBTSxDQUFDQyxRQUFRLENBQUNNLElBQUk7SUFDaEVQLE1BQU0sQ0FBQ1EsT0FBTyxDQUFDQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRUosUUFBUSxDQUFDO0VBQ25ELENBQUM7RUFFRDtBQUNKO0FBQ0E7QUFDQTtFQUNJbEIsb0JBQW9CLFdBQXBCQSxvQkFBb0JBLENBQUNQLEdBQUcsRUFBRTtJQUN0QnJILFdBQVcsQ0FBQ0MsaUJBQWlCLENBQUNtRyxJQUFJLENBQUMsQ0FBQztJQUNwQyxJQUFJK0MsU0FBUyxHQUFHLEVBQUU7SUFDbEIsSUFBSTlCLEdBQUcsQ0FBQytCLFVBQVUsS0FBS0MsU0FBUyxJQUFJaEMsR0FBRyxDQUFDK0IsVUFBVSxLQUFLLElBQUksRUFBRTtNQUN6REQsU0FBUyxvQkFBQXJCLE1BQUEsQ0FBbUJULEdBQUcsQ0FBQytCLFVBQVUsMkJBQUF0QixNQUFBLENBQXFCdkMsZUFBZSxDQUFDK0QsdUJBQXVCLFNBQU07SUFDaEg7SUFFQSxJQUFJQyxjQUFjLEdBQUcsbUNBQW1DO0lBQ3hELElBQUlsQyxHQUFHLENBQUNtQyxVQUFVLEtBQUssQ0FBQyxFQUFFO01BQ3RCRCxjQUFjLEdBQUcsZ0NBQWdDO0lBQ3JEO0lBQ0EsSUFBTUUsVUFBVSxHQUFJcEMsR0FBRyxDQUFDcUMsV0FBVyxJQUFJLE9BQU9yQyxHQUFHLENBQUNxQyxXQUFXLEtBQUssUUFBUSxHQUNwRXJDLEdBQUcsQ0FBQ3FDLFdBQVcsR0FDZixTQUFTO0lBQ2YsSUFBTUMsVUFBVSxxREFBQTdCLE1BQUEsQ0FDaUJULEdBQUcsQ0FBQ1UsTUFBTSxxQkFBQUQsTUFBQSxDQUFnQjhCLGtCQUFrQixDQUFDdkMsR0FBRyxDQUFDd0MsSUFBSSxDQUFDLHFCQUFBL0IsTUFBQSxDQUFnQjJCLFVBQVUsMkRBQUEzQixNQUFBLENBQy9FeUIsY0FBYyxPQUFBekIsTUFBQSxDQUFJOEIsa0JBQWtCLENBQUN2QyxHQUFHLENBQUN3QyxJQUFJLENBQUMscURBQUEvQixNQUFBLENBQ3JEOEIsa0JBQWtCLENBQUN2QyxHQUFHLENBQUN5QyxXQUFXLENBQUMsT0FBQWhDLE1BQUEsQ0FBSXFCLFNBQVMsa0ZBQUFyQixNQUFBLENBRXpDOEIsa0JBQWtCLENBQUN2QyxHQUFHLENBQUMwQyxTQUFTLENBQUMsb0ZBQUFqQyxNQUFBLENBQ1ZULEdBQUcsQ0FBQ0ksT0FBTyxtVUFBQUssTUFBQSxDQUluQnZDLGVBQWUsQ0FBQ3lFLGlCQUFpQixrRUFBQWxDLE1BQUEsQ0FDakNULEdBQUcsQ0FBQ1UsTUFBTSxnRUFBQUQsTUFBQSxDQUNaVCxHQUFHLENBQUM0QyxJQUFJLGtFQUFBbkMsTUFBQSxDQUNOVCxHQUFHLENBQUNJLE9BQU8sb0VBQUFLLE1BQUEsQ0FDVFQsR0FBRyxDQUFDNkMsVUFBVSxpTUFLaEU7SUFDRGhLLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDaUssTUFBTSxDQUFDUixVQUFVLENBQUM7RUFDcEQsQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0VBQ0l2QixvQkFBb0IsV0FBcEJBLG9CQUFvQkEsQ0FBQ2YsR0FBRyxFQUFFO0lBQ3RCLElBQU1RLFVBQVUsR0FBRzNILENBQUMsMEJBQUE0SCxNQUFBLENBQTBCVCxHQUFHLENBQUNVLE1BQU0sTUFBRyxDQUFDOztJQUU1RDtJQUNBLElBQU1xQyxNQUFNLEdBQUdsSyxDQUFDLENBQUMsMEJBQTBCLENBQUM7SUFDNUMsSUFBSUEsQ0FBQyxDQUFDcUQsRUFBRSxDQUFDdEMsU0FBUyxJQUFJZixDQUFDLENBQUNxRCxFQUFFLENBQUN0QyxTQUFTLENBQUNvRixXQUFXLENBQUMrRCxNQUFNLENBQUMsRUFBRTtNQUN0RCxJQUFNQyxLQUFLLEdBQUdELE1BQU0sQ0FBQ25KLFNBQVMsQ0FBQyxDQUFDOztNQUVoQztNQUNBLElBQU1xSixLQUFLLEdBQUdELEtBQUssQ0FBQ25HLEdBQUcsQ0FBQzJELFVBQVUsQ0FBQztNQUVuQyxJQUFJeUMsS0FBSyxDQUFDQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1FBQ2I7UUFDQSxJQUFNQyxRQUFRLEdBQUd0SyxDQUFDLENBQUNvSyxLQUFLLENBQUNHLElBQUksQ0FBQyxDQUFDLENBQUM7O1FBRWhDO1FBQ0EsSUFBTUMsU0FBUyxHQUFHRixRQUFRLENBQUMzRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM4RSxLQUFLLENBQUMsQ0FBQzs7UUFFbEQ7UUFDQUQsU0FBUyxDQUFDN0UsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDK0UsTUFBTSxDQUFDLENBQUM7O1FBRXJDO1FBQ0EsSUFBTUMsYUFBYSw4SEFBQS9DLE1BQUEsQ0FDQ3ZDLGVBQWUsQ0FBQ3VGLGdCQUFnQiw4Q0FBQWhELE1BQUEsQ0FDL0JULEdBQUcsQ0FBQ0ksT0FBTyw0Q0FBQUssTUFBQSxDQUNiVCxHQUFHLENBQUM0QyxJQUFJLDZDQUFBbkMsTUFBQSxDQUNQVCxHQUFHLENBQUNVLE1BQU0saURBQUFELE1BQUEsQ0FDUFQsR0FBRyxDQUFDNkMsVUFBVSx5RkFFNUI7O1FBRVQ7UUFDQVEsU0FBUyxDQUFDN0UsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUNrRixPQUFPLENBQUNGLGFBQWEsQ0FBQzs7UUFFeEQ7UUFDQSxJQUFNRyxTQUFTLEdBQUdSLFFBQVEsQ0FBQzNFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQ2YsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2xEdUYsS0FBSyxDQUFDWSxJQUFJLENBQUNYLEtBQUssRUFBRVUsU0FBUyxDQUFDLENBQUNsSCxJQUFJLENBQUM0RyxTQUFTLENBQUM1RSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUN6QyxJQUFJLENBQUMsS0FBSyxDQUFDOztRQUUvRDtRQUNBNkgsVUFBVSxDQUFDLFlBQU07VUFDYkMsZ0JBQWdCLENBQUNDLGdCQUFnQixDQUFDLENBQUM7UUFDdkMsQ0FBQyxFQUFFLEdBQUcsQ0FBQztNQUNYLENBQUMsTUFBTTtRQUNIO1FBQ0EsSUFBSSxDQUFDQyx1QkFBdUIsQ0FBQ3hELFVBQVUsRUFBRVIsR0FBRyxDQUFDO01BQ2pEO0lBQ0osQ0FBQyxNQUFNO01BQ0g7TUFDQSxJQUFJLENBQUNnRSx1QkFBdUIsQ0FBQ3hELFVBQVUsRUFBRVIsR0FBRyxDQUFDO0lBQ2pEO0lBRUFySCxXQUFXLENBQUNRLG9CQUFvQixDQUFDNEYsSUFBSSxDQUFDLENBQUM7RUFDM0MsQ0FBQztFQUVEO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7RUFDSWlGLHVCQUF1QixXQUF2QkEsdUJBQXVCQSxDQUFDeEQsVUFBVSxFQUFFUixHQUFHLEVBQUU7SUFDckMsSUFBTWlFLHNCQUFzQixHQUFHekQsVUFBVSxDQUFDaEMsSUFBSSxDQUFDLFlBQVksQ0FBQztJQUM1RHlGLHNCQUFzQixDQUFDVixNQUFNLENBQUMsQ0FBQztJQUUvQixJQUFNQyxhQUFhLHNIQUFBL0MsTUFBQSxDQUNDdkMsZUFBZSxDQUFDdUYsZ0JBQWdCLHNDQUFBaEQsTUFBQSxDQUMvQlQsR0FBRyxDQUFDSSxPQUFPLG9DQUFBSyxNQUFBLENBQ2JULEdBQUcsQ0FBQzRDLElBQUkscUNBQUFuQyxNQUFBLENBQ1BULEdBQUcsQ0FBQ1UsTUFBTSx5Q0FBQUQsTUFBQSxDQUNQVCxHQUFHLENBQUM2QyxVQUFVLHlFQUU1QjtJQUVULElBQU1xQixjQUFjLEdBQUcxRCxVQUFVLENBQUNoQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7SUFDekQwRixjQUFjLENBQUNSLE9BQU8sQ0FBQ0YsYUFBYSxDQUFDOztJQUVyQztJQUNBTSxnQkFBZ0IsQ0FBQ0MsZ0JBQWdCLENBQUMsQ0FBQztFQUN2QyxDQUFDO0VBRUQ7QUFDSjtBQUNBO0FBQ0E7RUFDSS9DLHlCQUF5QixXQUF6QkEseUJBQXlCQSxDQUFDaEIsR0FBRyxFQUFFO0lBQzNCLElBQU1RLFVBQVUsR0FBRzNILENBQUMsOEJBQUE0SCxNQUFBLENBQThCVCxHQUFHLENBQUNVLE1BQU0sTUFBRyxDQUFDO0lBQ2hFLElBQU11RCxzQkFBc0IsR0FBR3pELFVBQVUsQ0FBQ2hDLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDNUR5RixzQkFBc0IsQ0FBQ1YsTUFBTSxDQUFDLENBQUM7SUFDL0IsSUFBTUMsYUFBYSx5R0FBQS9DLE1BQUEsQ0FFUnZDLGVBQWUsQ0FBQ2lHLHlCQUF5QiwrREFFcEQ7SUFDQTNELFVBQVUsQ0FBQ2hDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUM3QmtGLE9BQU8sQ0FBQ0YsYUFBYSxDQUFDO0lBQzNCaEQsVUFBVSxDQUFDaEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM0RixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUNDLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQztFQUN0RixDQUFDO0VBRUQ7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0VBQ0kvRCxjQUFjLFdBQWRBLGNBQWNBLENBQUNnRSxFQUFFLEVBQUVDLEVBQUUsRUFBRUMsT0FBTyxFQUFFO0lBQzVCLElBQU1DLGVBQWUsR0FBR0QsT0FBTyxJQUFJQSxPQUFPLENBQUNDLGVBQWU7SUFDMUQsSUFBTUMsVUFBVSxHQUFHRixPQUFPLElBQUlBLE9BQU8sQ0FBQ0UsVUFBVTtJQUNoRCxJQUFJQyxPQUFPLEdBQUdDLE1BQU0sQ0FBQ04sRUFBRSxDQUFDLENBQUNwRixLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ25DLElBQUkyRixPQUFPLEdBQUdELE1BQU0sQ0FBQ0wsRUFBRSxDQUFDLENBQUNyRixLQUFLLENBQUMsR0FBRyxDQUFDO0lBRW5DLFNBQVM0RixXQUFXQSxDQUFDQyxDQUFDLEVBQUU7TUFDcEIsT0FBTyxDQUFDTixlQUFlLEdBQUcsZ0JBQWdCLEdBQUcsT0FBTyxFQUFFTyxJQUFJLENBQUNELENBQUMsQ0FBQztJQUNqRTtJQUVBLElBQUksQ0FBQ0osT0FBTyxDQUFDbEssS0FBSyxDQUFDcUssV0FBVyxDQUFDLElBQUksQ0FBQ0QsT0FBTyxDQUFDcEssS0FBSyxDQUFDcUssV0FBVyxDQUFDLEVBQUU7TUFDNUQsT0FBT0csR0FBRztJQUNkO0lBRUEsSUFBSVAsVUFBVSxFQUFFO01BQ1osT0FBT0MsT0FBTyxDQUFDbEgsTUFBTSxHQUFHb0gsT0FBTyxDQUFDcEgsTUFBTSxFQUFFa0gsT0FBTyxDQUFDdEgsSUFBSSxDQUFDLEdBQUcsQ0FBQztNQUN6RCxPQUFPd0gsT0FBTyxDQUFDcEgsTUFBTSxHQUFHa0gsT0FBTyxDQUFDbEgsTUFBTSxFQUFFb0gsT0FBTyxDQUFDeEgsSUFBSSxDQUFDLEdBQUcsQ0FBQztJQUM3RDtJQUVBLElBQUksQ0FBQ29ILGVBQWUsRUFBRTtNQUNsQkUsT0FBTyxHQUFHQSxPQUFPLENBQUN4RixHQUFHLENBQUMrRixNQUFNLENBQUM7TUFDN0JMLE9BQU8sR0FBR0EsT0FBTyxDQUFDMUYsR0FBRyxDQUFDK0YsTUFBTSxDQUFDO0lBQ2pDO0lBRUEsS0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBQyxFQUFFQSxDQUFDLEdBQUdSLE9BQU8sQ0FBQ2xILE1BQU0sRUFBRTBILENBQUMsSUFBSSxDQUFDLEVBQUU7TUFDeEMsSUFBSU4sT0FBTyxDQUFDcEgsTUFBTSxLQUFLMEgsQ0FBQyxFQUFFO1FBQ3RCLE9BQU8sQ0FBQztNQUNaO01BQ0EsSUFBSVIsT0FBTyxDQUFDUSxDQUFDLENBQUMsS0FBS04sT0FBTyxDQUFDTSxDQUFDLENBQUMsRUFBRTtRQUMzQjtNQUFBLENBQ0gsTUFBTSxJQUFJUixPQUFPLENBQUNRLENBQUMsQ0FBQyxHQUFHTixPQUFPLENBQUNNLENBQUMsQ0FBQyxFQUFFO1FBQ2hDLE9BQU8sQ0FBQztNQUNaLENBQUMsTUFBTTtRQUNILE9BQU8sQ0FBQyxDQUFDO01BQ2I7SUFDSjtJQUVBLElBQUlSLE9BQU8sQ0FBQ2xILE1BQU0sS0FBS29ILE9BQU8sQ0FBQ3BILE1BQU0sRUFBRTtNQUNuQyxPQUFPLENBQUMsQ0FBQztJQUNiO0lBRUEsT0FBTyxDQUFDO0VBQ1o7QUFFSixDQUFDOztBQUVEO0FBQ0EyRCxNQUFNLENBQUN6SSxXQUFXLEdBQUdBLFdBQVciLCJpZ25vcmVMaXN0IjpbXX0=