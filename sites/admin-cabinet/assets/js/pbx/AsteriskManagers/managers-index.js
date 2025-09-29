"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, AsteriskManagersAPI, SecurityUtils, PbxDataTableIndex, TooltipBuilder */

/**
 * Object for managing Asterisk managers table using PbxDataTableIndex
 *
 * @module asteriskManagersIndex
 */
var asteriskManagersIndex = {
  /**
   * DataTable instance from base class
   */
  dataTableInstance: null,

  /**
   * Initialize the object
   */
  initialize: function initialize() {
    // Initialize event handlers once (using delegation)
    this.initializeTableEvents(); // Initialize the Asterisk managers table with REST API

    this.initializeDataTable();
  },

  /**
   * Initialize DataTable using custom table rendering
   */
  initializeDataTable: function initializeDataTable() {
    // Load data and render custom table
    this.loadAndRenderTable();
  },

  /**
   * Load data and render custom table
   */
  loadAndRenderTable: function loadAndRenderTable() {
    var _this = this;

    // Show loading state
    $('#asterisk-managers-table-container').html('<div class="ui active centered inline loader"></div>'); // Load data from API

    AsteriskManagersAPI.getList(function (response) {
      if (response && response.result && Array.isArray(response.data)) {
        if (response.data.length === 0) {
          // Hide the table container and add button, show placeholder
          $('#asterisk-managers-table-container').hide();
          $('.add-new-button').hide();
          $('#empty-table-placeholder').show();
        } else {
          // Show the table container and add button, hide placeholder
          $('#empty-table-placeholder').hide();
          $('.add-new-button').show();
          $('#asterisk-managers-table-container').show();

          _this.renderPermissionsTable(response.data);
        }
      } else {
        $('#asterisk-managers-table-container').html('<div class="ui error message">Failed to load data</div>');
      }
    }, false); // Don't use cache for now
  },

  /**
   * Render custom permissions table
   * @param {Array} managers - Array of manager objects
   */
  renderPermissionsTable: function renderPermissionsTable(managers) {
    var permissions = ['call', 'cdr', 'originate', 'reporting', 'agent', 'config', 'dialplan', 'dtmf', 'log', 'system', 'user', 'verbose', 'command'];
    var tableHtml = "\n            <table class=\"ui selectable very basic compact unstackable table\" id=\"asterisk-managers-table\">\n                <thead>\n                    <tr>\n                        <th></th>\n                        ".concat(permissions.map(function (perm) {
      return "\n                            <th width=\"20px\" class=\"permission-category hide-on-mobile\">\n                                <div><span>".concat(perm, "</span></div>\n                            </th>\n                        ");
    }).join(''), "\n                        <th></th>\n                    </tr>\n                </thead>\n                <tbody>\n        "); // Render rows

    managers.forEach(function (manager) {
      var readPerms = manager.readPermissionsSummary || '';
      var writePerms = manager.writePermissionsSummary || '';
      var systemIcon = manager.isSystem ? '<i class="yellow lock icon"></i> ' : ''; // Format description like in Firewall

      var description = manager.description || '';
      var descriptionText = description ? " - ".concat(description) : '';
      tableHtml += "\n                <tr class=\"manager-row\" data-id=\"".concat(manager.id, "\">\n                    <td>\n                        ").concat(systemIcon, "\n                        <i class=\"blue asterisk icon\"></i> \n                        <strong>").concat(window.SecurityUtils.escapeHtml(manager.username), "</strong>").concat(window.SecurityUtils.escapeHtml(descriptionText), "\n                    </td>\n            "); // Add permission cells - show checkmark if has any permission (read or write)

      permissions.forEach(function (perm) {
        var hasRead = readPerms === 'all' || readPerms.includes(perm);
        var hasWrite = writePerms === 'all' || writePerms.includes(perm);
        var hasPermission = hasRead || hasWrite;

        if (hasPermission) {
          // Add data attributes for dynamic tooltip initialization
          tableHtml += "<td class=\"center aligned permission-cell hide-on-mobile\" \n                        data-manager=\"".concat(window.SecurityUtils.escapeHtml(manager.username), "\"\n                        data-permission=\"").concat(perm, "\"\n                        data-is-system=\"").concat(manager.isSystem, "\"\n                        data-has-read=\"").concat(hasRead, "\"\n                        data-has-write=\"").concat(hasWrite, "\">"); // Use text labels with colors (no inline tooltip data)

          if (hasRead && hasWrite) {
            // Full access (both read and write)
            tableHtml += '<span class="ui green text"><strong>RW</strong></span>';
          } else if (hasRead) {
            // Read only
            tableHtml += '<span class="ui blue text"><strong>R</strong></span>';
          } else if (hasWrite) {
            // Write only
            tableHtml += '<span class="ui orange text"><strong>W</strong></span>';
          }
        } else {
          // No permission - empty cell without tooltip
          tableHtml += '<td class="center aligned permission-cell hide-on-mobile">';
        }

        tableHtml += '</td>';
      }); // Add action buttons

      tableHtml += "\n                <td class=\"right aligned collapsing\">\n                    <div class=\"ui tiny basic icon buttons action-buttons\">\n            ";

      if (manager.isSystem) {
        tableHtml += "\n                    <a href=\"".concat(globalRootUrl, "asterisk-managers/modify/").concat(manager.id, "\" \n                       class=\"ui button view popuped\" data-content=\"").concat(globalTranslate.bt_View, "\">\n                        <i class=\"icon eye blue\"></i>\n                    </a>\n                ");
      } else {
        tableHtml += "\n                    <a href=\"".concat(globalRootUrl, "asterisk-managers/modify/").concat(manager.id, "\" \n                       class=\"ui button edit popuped\" data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                        <i class=\"icon edit blue\"></i>\n                    </a>\n                    <a href=\"#\" data-value=\"").concat(manager.id, "\" \n                       class=\"ui button copy popuped\" data-content=\"").concat(globalTranslate.bt_ToolTipCopy, "\">\n                        <i class=\"icon copy outline blue\"></i>\n                    </a>\n                    <a href=\"#\" data-value=\"").concat(manager.id, "\" \n                       class=\"ui button delete two-steps-delete popuped\" data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                        <i class=\"icon trash red\"></i>\n                    </a>\n                ");
      }

      tableHtml += "\n                    </div>\n                </td>\n                </tr>\n            ";
    });
    tableHtml += "\n                </tbody>\n            </table>\n        "; // Render table

    $('#asterisk-managers-table-container').html(tableHtml); // Initialize tooltips dynamically like in Firewall

    this.initializePermissionTooltips();
  },

  /**
   * Initialize permission tooltips dynamically
   */
  initializePermissionTooltips: function initializePermissionTooltips() {
    var permissionDescriptions = this.getPermissionDescriptions(); // Initialize tooltips for all permission cells

    $('.permission-cell[data-manager]').each(function () {
      var $cell = $(this);
      var manager = $cell.data('manager');
      var permission = $cell.data('permission');
      var isSystem = $cell.data('is-system');
      var hasRead = $cell.data('has-read');
      var hasWrite = $cell.data('has-write');

      if (manager && permission && permissionDescriptions[permission]) {
        var tooltipData = asteriskManagersIndex.buildTooltipData(manager, permission, isSystem, hasRead, hasWrite, permissionDescriptions[permission]);
        var tooltipContent = TooltipBuilder.buildContent(tooltipData); // Initialize tooltip

        $cell.popup({
          html: tooltipContent,
          position: 'top center',
          hoverable: true,
          delay: {
            show: 300,
            hide: 100
          },
          variation: 'flowing'
        });
      }
    });
  },

  /**
   * Get permission descriptions object
   */
  getPermissionDescriptions: function getPermissionDescriptions() {
    return {
      call: {
        read: globalTranslate.am_tooltip_call_read,
        write: globalTranslate.am_tooltip_call_write
      },
      cdr: {
        read: globalTranslate.am_tooltip_cdr_read,
        write: globalTranslate.am_tooltip_cdr_write
      },
      originate: {
        read: globalTranslate.am_tooltip_originate_read,
        write: globalTranslate.am_tooltip_originate_write
      },
      reporting: {
        read: globalTranslate.am_tooltip_reporting_read,
        write: globalTranslate.am_tooltip_reporting_write
      },
      agent: {
        read: globalTranslate.am_tooltip_agent_read,
        write: globalTranslate.am_tooltip_agent_write
      },
      config: {
        read: globalTranslate.am_tooltip_config_read,
        write: globalTranslate.am_tooltip_config_write
      },
      dialplan: {
        read: globalTranslate.am_tooltip_dialplan_read,
        write: globalTranslate.am_tooltip_dialplan_write
      },
      dtmf: {
        read: globalTranslate.am_tooltip_dtmf_read,
        write: globalTranslate.am_tooltip_dtmf_write
      },
      log: {
        read: globalTranslate.am_tooltip_log_read,
        write: globalTranslate.am_tooltip_log_write
      },
      system: {
        read: globalTranslate.am_tooltip_system_read,
        write: globalTranslate.am_tooltip_system_write
      },
      user: {
        read: globalTranslate.am_tooltip_user_read,
        write: globalTranslate.am_tooltip_user_write
      },
      verbose: {
        read: globalTranslate.am_tooltip_verbose_read,
        write: globalTranslate.am_tooltip_verbose_write
      },
      command: {
        read: globalTranslate.am_tooltip_command_read,
        write: globalTranslate.am_tooltip_command_write
      }
    };
  },

  /**
   * Build tooltip data structure
   */
  buildTooltipData: function buildTooltipData(manager, permission, isSystem, hasRead, hasWrite, permDesc) {
    var tooltipData = {
      header: "".concat(manager, " - ").concat(permission.toUpperCase()),
      description: null,
      list: []
    }; // Add current access level

    var accessLevel = '';
    var accessColor = '';

    if (hasRead && hasWrite) {
      accessLevel = globalTranslate.am_tooltip_access_read_write;
      accessColor = 'green';
    } else if (hasRead) {
      accessLevel = globalTranslate.am_tooltip_access_read_only;
      accessColor = 'blue';
    } else if (hasWrite) {
      accessLevel = globalTranslate.am_tooltip_access_write_only;
      accessColor = 'orange';
    }

    var currentAccessLabel = globalTranslate.am_tooltip_current_access;
    tooltipData.description = "<span class=\"ui ".concat(accessColor, " text\"><strong>").concat(currentAccessLabel, ": ").concat(accessLevel, "</strong></span>"); // Add permission details

    var allowedOperationsLabel = globalTranslate.am_tooltip_allowed_operations;
    tooltipData.list.push({
      term: allowedOperationsLabel,
      definition: null
    });

    if (hasRead) {
      var readLabel = globalTranslate.am_Read;
      tooltipData.list.push({
        term: readLabel,
        definition: permDesc.read
      });
    }

    if (hasWrite) {
      var writeLabel = globalTranslate.am_Write;
      tooltipData.list.push({
        term: writeLabel,
        definition: permDesc.write
      });
    } // Add restrictions if any


    if (!hasRead || !hasWrite) {
      var restrictionsLabel = globalTranslate.am_tooltip_restrictions;
      tooltipData.list.push({
        term: restrictionsLabel,
        definition: null
      });

      if (!hasRead) {
        var cannotReadLabel = globalTranslate.am_tooltip_cannot_read;
        tooltipData.list.push("".concat(cannotReadLabel, ": ").concat(permDesc.read));
      }

      if (!hasWrite) {
        var cannotWriteLabel = globalTranslate.am_tooltip_cannot_write;
        tooltipData.list.push("".concat(cannotWriteLabel, ": ").concat(permDesc.write));
      }
    } // Add system manager warning if applicable


    if (isSystem) {
      tooltipData.warning = {
        header: globalTranslate.am_tooltip_system_manager_warning,
        text: globalTranslate.am_tooltip_system_manager_warning_text
      };
    }

    return tooltipData;
  },

  /**
   * Initialize table event handlers
   */
  initializeTableEvents: function initializeTableEvents() {
    // Use event delegation for dynamically generated content
    var $container = $('#asterisk-managers-table-container'); // Double click to edit (exclude action buttons column)

    $container.on('dblclick', '.manager-row td:not(.right.aligned)', function (e) {
      var id = $(e.target).closest('tr').attr('data-id');

      if (id) {
        window.location = "".concat(globalRootUrl, "asterisk-managers/modify/").concat(id);
      }
    }); // Copy button handler

    $container.on('click', 'a.copy', function (e) {
      e.preventDefault();
      var id = $(e.currentTarget).attr('data-value');

      if (id) {
        // Redirect to modify page with copy-source parameter
        window.location = "".concat(globalRootUrl, "asterisk-managers/modify?copy-source=").concat(id);
      }
    }); // Let delete-something.js handle the first click, we just prevent default navigation

    $container.on('click', 'a.delete.two-steps-delete', function (e) {
      e.preventDefault(); // Don't stop propagation - allow delete-something.js to work
    }); // Delete button handler - works with two-steps-delete logic
    // This will be triggered after delete-something.js removes the two-steps-delete class

    $container.on('click', 'a.delete:not(.two-steps-delete)', function (e) {
      e.preventDefault();
      var $button = $(this);
      var id = $button.attr('data-value');

      if (id) {
        $button.addClass('loading disabled');
        AsteriskManagersAPI.deleteRecord(id, function (response) {
          if (response && response.result === true) {
            // Reload the entire page to ensure clean state
            window.location.href = "".concat(globalRootUrl, "asterisk-managers/index");
          } else {
            UserMessage.showMultiString((response === null || response === void 0 ? void 0 : response.messages) || globalTranslate.am_ErrorDeletingManager);
            $button.removeClass('loading disabled'); // Restore two-steps-delete class if deletion failed

            $button.addClass('two-steps-delete');
            $button.find('i').removeClass('close').addClass('trash');
          }
        });
      }
    });
  },

  /**
   * Callback after data is loaded
   * @param {Array} data - Array of manager objects
   */
  onDataLoaded: function onDataLoaded(data) {// Additional processing after data load if needed
  }
};
/**
 * Initialize Asterisk Managers table on document ready
 */

$(document).ready(function () {
  asteriskManagersIndex.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbImFzdGVyaXNrTWFuYWdlcnNJbmRleCIsImRhdGFUYWJsZUluc3RhbmNlIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVUYWJsZUV2ZW50cyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJsb2FkQW5kUmVuZGVyVGFibGUiLCIkIiwiaHRtbCIsIkFzdGVyaXNrTWFuYWdlcnNBUEkiLCJnZXRMaXN0IiwicmVzcG9uc2UiLCJyZXN1bHQiLCJBcnJheSIsImlzQXJyYXkiLCJkYXRhIiwibGVuZ3RoIiwiaGlkZSIsInNob3ciLCJyZW5kZXJQZXJtaXNzaW9uc1RhYmxlIiwibWFuYWdlcnMiLCJwZXJtaXNzaW9ucyIsInRhYmxlSHRtbCIsIm1hcCIsInBlcm0iLCJqb2luIiwiZm9yRWFjaCIsIm1hbmFnZXIiLCJyZWFkUGVybXMiLCJyZWFkUGVybWlzc2lvbnNTdW1tYXJ5Iiwid3JpdGVQZXJtcyIsIndyaXRlUGVybWlzc2lvbnNTdW1tYXJ5Iiwic3lzdGVtSWNvbiIsImlzU3lzdGVtIiwiZGVzY3JpcHRpb24iLCJkZXNjcmlwdGlvblRleHQiLCJpZCIsIndpbmRvdyIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwidXNlcm5hbWUiLCJoYXNSZWFkIiwiaW5jbHVkZXMiLCJoYXNXcml0ZSIsImhhc1Blcm1pc3Npb24iLCJnbG9iYWxSb290VXJsIiwiZ2xvYmFsVHJhbnNsYXRlIiwiYnRfVmlldyIsImJ0X1Rvb2xUaXBFZGl0IiwiYnRfVG9vbFRpcENvcHkiLCJidF9Ub29sVGlwRGVsZXRlIiwiaW5pdGlhbGl6ZVBlcm1pc3Npb25Ub29sdGlwcyIsInBlcm1pc3Npb25EZXNjcmlwdGlvbnMiLCJnZXRQZXJtaXNzaW9uRGVzY3JpcHRpb25zIiwiZWFjaCIsIiRjZWxsIiwicGVybWlzc2lvbiIsInRvb2x0aXBEYXRhIiwiYnVpbGRUb29sdGlwRGF0YSIsInRvb2x0aXBDb250ZW50IiwiVG9vbHRpcEJ1aWxkZXIiLCJidWlsZENvbnRlbnQiLCJwb3B1cCIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwiZGVsYXkiLCJ2YXJpYXRpb24iLCJjYWxsIiwicmVhZCIsImFtX3Rvb2x0aXBfY2FsbF9yZWFkIiwid3JpdGUiLCJhbV90b29sdGlwX2NhbGxfd3JpdGUiLCJjZHIiLCJhbV90b29sdGlwX2Nkcl9yZWFkIiwiYW1fdG9vbHRpcF9jZHJfd3JpdGUiLCJvcmlnaW5hdGUiLCJhbV90b29sdGlwX29yaWdpbmF0ZV9yZWFkIiwiYW1fdG9vbHRpcF9vcmlnaW5hdGVfd3JpdGUiLCJyZXBvcnRpbmciLCJhbV90b29sdGlwX3JlcG9ydGluZ19yZWFkIiwiYW1fdG9vbHRpcF9yZXBvcnRpbmdfd3JpdGUiLCJhZ2VudCIsImFtX3Rvb2x0aXBfYWdlbnRfcmVhZCIsImFtX3Rvb2x0aXBfYWdlbnRfd3JpdGUiLCJjb25maWciLCJhbV90b29sdGlwX2NvbmZpZ19yZWFkIiwiYW1fdG9vbHRpcF9jb25maWdfd3JpdGUiLCJkaWFscGxhbiIsImFtX3Rvb2x0aXBfZGlhbHBsYW5fcmVhZCIsImFtX3Rvb2x0aXBfZGlhbHBsYW5fd3JpdGUiLCJkdG1mIiwiYW1fdG9vbHRpcF9kdG1mX3JlYWQiLCJhbV90b29sdGlwX2R0bWZfd3JpdGUiLCJsb2ciLCJhbV90b29sdGlwX2xvZ19yZWFkIiwiYW1fdG9vbHRpcF9sb2dfd3JpdGUiLCJzeXN0ZW0iLCJhbV90b29sdGlwX3N5c3RlbV9yZWFkIiwiYW1fdG9vbHRpcF9zeXN0ZW1fd3JpdGUiLCJ1c2VyIiwiYW1fdG9vbHRpcF91c2VyX3JlYWQiLCJhbV90b29sdGlwX3VzZXJfd3JpdGUiLCJ2ZXJib3NlIiwiYW1fdG9vbHRpcF92ZXJib3NlX3JlYWQiLCJhbV90b29sdGlwX3ZlcmJvc2Vfd3JpdGUiLCJjb21tYW5kIiwiYW1fdG9vbHRpcF9jb21tYW5kX3JlYWQiLCJhbV90b29sdGlwX2NvbW1hbmRfd3JpdGUiLCJwZXJtRGVzYyIsImhlYWRlciIsInRvVXBwZXJDYXNlIiwibGlzdCIsImFjY2Vzc0xldmVsIiwiYWNjZXNzQ29sb3IiLCJhbV90b29sdGlwX2FjY2Vzc19yZWFkX3dyaXRlIiwiYW1fdG9vbHRpcF9hY2Nlc3NfcmVhZF9vbmx5IiwiYW1fdG9vbHRpcF9hY2Nlc3Nfd3JpdGVfb25seSIsImN1cnJlbnRBY2Nlc3NMYWJlbCIsImFtX3Rvb2x0aXBfY3VycmVudF9hY2Nlc3MiLCJhbGxvd2VkT3BlcmF0aW9uc0xhYmVsIiwiYW1fdG9vbHRpcF9hbGxvd2VkX29wZXJhdGlvbnMiLCJwdXNoIiwidGVybSIsImRlZmluaXRpb24iLCJyZWFkTGFiZWwiLCJhbV9SZWFkIiwid3JpdGVMYWJlbCIsImFtX1dyaXRlIiwicmVzdHJpY3Rpb25zTGFiZWwiLCJhbV90b29sdGlwX3Jlc3RyaWN0aW9ucyIsImNhbm5vdFJlYWRMYWJlbCIsImFtX3Rvb2x0aXBfY2Fubm90X3JlYWQiLCJjYW5ub3RXcml0ZUxhYmVsIiwiYW1fdG9vbHRpcF9jYW5ub3Rfd3JpdGUiLCJ3YXJuaW5nIiwiYW1fdG9vbHRpcF9zeXN0ZW1fbWFuYWdlcl93YXJuaW5nIiwidGV4dCIsImFtX3Rvb2x0aXBfc3lzdGVtX21hbmFnZXJfd2FybmluZ190ZXh0IiwiJGNvbnRhaW5lciIsIm9uIiwiZSIsInRhcmdldCIsImNsb3Nlc3QiLCJhdHRyIiwibG9jYXRpb24iLCJwcmV2ZW50RGVmYXVsdCIsImN1cnJlbnRUYXJnZXQiLCIkYnV0dG9uIiwiYWRkQ2xhc3MiLCJkZWxldGVSZWNvcmQiLCJocmVmIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsImFtX0Vycm9yRGVsZXRpbmdNYW5hZ2VyIiwicmVtb3ZlQ2xhc3MiLCJmaW5kIiwib25EYXRhTG9hZGVkIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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dGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBBc3Rlcmlza01hbmFnZXJzQVBJLCBTZWN1cml0eVV0aWxzLCBQYnhEYXRhVGFibGVJbmRleCwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIEFzdGVyaXNrIG1hbmFnZXJzIHRhYmxlIHVzaW5nIFBieERhdGFUYWJsZUluZGV4XG4gKlxuICogQG1vZHVsZSBhc3Rlcmlza01hbmFnZXJzSW5kZXhcbiAqL1xuY29uc3QgYXN0ZXJpc2tNYW5hZ2Vyc0luZGV4ID0ge1xuICAgIC8qKlxuICAgICAqIERhdGFUYWJsZSBpbnN0YW5jZSBmcm9tIGJhc2UgY2xhc3NcbiAgICAgKi9cbiAgICBkYXRhVGFibGVJbnN0YW5jZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG9iamVjdFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZXZlbnQgaGFuZGxlcnMgb25jZSAodXNpbmcgZGVsZWdhdGlvbilcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGFibGVFdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIEFzdGVyaXNrIG1hbmFnZXJzIHRhYmxlIHdpdGggUkVTVCBBUElcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSB1c2luZyBjdXN0b20gdGFibGUgcmVuZGVyaW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgLy8gTG9hZCBkYXRhIGFuZCByZW5kZXIgY3VzdG9tIHRhYmxlXG4gICAgICAgIHRoaXMubG9hZEFuZFJlbmRlclRhYmxlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBhbmQgcmVuZGVyIGN1c3RvbSB0YWJsZVxuICAgICAqL1xuICAgIGxvYWRBbmRSZW5kZXJUYWJsZSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICQoJyNhc3Rlcmlzay1tYW5hZ2Vycy10YWJsZS1jb250YWluZXInKS5odG1sKCc8ZGl2IGNsYXNzPVwidWkgYWN0aXZlIGNlbnRlcmVkIGlubGluZSBsb2FkZXJcIj48L2Rpdj4nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZGF0YSBmcm9tIEFQSVxuICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgdGFibGUgY29udGFpbmVyIGFuZCBhZGQgYnV0dG9uLCBzaG93IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgICAgICQoJyNhc3Rlcmlzay1tYW5hZ2Vycy10YWJsZS1jb250YWluZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICQoJy5hZGQtbmV3LWJ1dHRvbicpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJykuc2hvdygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIHRhYmxlIGNvbnRhaW5lciBhbmQgYWRkIGJ1dHRvbiwgaGlkZSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICAgICAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICQoJy5hZGQtbmV3LWJ1dHRvbicpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2FzdGVyaXNrLW1hbmFnZXJzLXRhYmxlLWNvbnRhaW5lcicpLnNob3coKTtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclBlcm1pc3Npb25zVGFibGUocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjYXN0ZXJpc2stbWFuYWdlcnMtdGFibGUtY29udGFpbmVyJykuaHRtbCgnPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2VcIj5GYWlsZWQgdG8gbG9hZCBkYXRhPC9kaXY+Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTsgLy8gRG9uJ3QgdXNlIGNhY2hlIGZvciBub3dcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciBjdXN0b20gcGVybWlzc2lvbnMgdGFibGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBtYW5hZ2VycyAtIEFycmF5IG9mIG1hbmFnZXIgb2JqZWN0c1xuICAgICAqL1xuICAgIHJlbmRlclBlcm1pc3Npb25zVGFibGUobWFuYWdlcnMpIHtcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSBbJ2NhbGwnLCAnY2RyJywgJ29yaWdpbmF0ZScsICdyZXBvcnRpbmcnLCAnYWdlbnQnLCAnY29uZmlnJywgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2RpYWxwbGFuJywgJ2R0bWYnLCAnbG9nJywgJ3N5c3RlbScsICd1c2VyJywgJ3ZlcmJvc2UnLCAnY29tbWFuZCddO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGxldCB0YWJsZUh0bWwgPSBgXG4gICAgICAgICAgICA8dGFibGUgY2xhc3M9XCJ1aSBzZWxlY3RhYmxlIHZlcnkgYmFzaWMgY29tcGFjdCB1bnN0YWNrYWJsZSB0YWJsZVwiIGlkPVwiYXN0ZXJpc2stbWFuYWdlcnMtdGFibGVcIj5cbiAgICAgICAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0aD48L3RoPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtwZXJtaXNzaW9ucy5tYXAocGVybSA9PiBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRoIHdpZHRoPVwiMjBweFwiIGNsYXNzPVwicGVybWlzc2lvbi1jYXRlZ29yeSBoaWRlLW9uLW1vYmlsZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2PjxzcGFuPiR7cGVybX08L3NwYW4+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90aD5cbiAgICAgICAgICAgICAgICAgICAgICAgIGApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgICAgICAgICAgPHRoPjwvdGg+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgPC90aGVhZD5cbiAgICAgICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW5kZXIgcm93c1xuICAgICAgICBtYW5hZ2Vycy5mb3JFYWNoKG1hbmFnZXIgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVhZFBlcm1zID0gbWFuYWdlci5yZWFkUGVybWlzc2lvbnNTdW1tYXJ5IHx8ICcnO1xuICAgICAgICAgICAgY29uc3Qgd3JpdGVQZXJtcyA9IG1hbmFnZXIud3JpdGVQZXJtaXNzaW9uc1N1bW1hcnkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBzeXN0ZW1JY29uID0gbWFuYWdlci5pc1N5c3RlbSA/ICc8aSBjbGFzcz1cInllbGxvdyBsb2NrIGljb25cIj48L2k+ICcgOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9ybWF0IGRlc2NyaXB0aW9uIGxpa2UgaW4gRmlyZXdhbGxcbiAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gbWFuYWdlci5kZXNjcmlwdGlvbiB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uVGV4dCA9IGRlc2NyaXB0aW9uID8gYCAtICR7ZGVzY3JpcHRpb259YCA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0YWJsZUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cIm1hbmFnZXItcm93XCIgZGF0YS1pZD1cIiR7bWFuYWdlci5pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtzeXN0ZW1JY29ufVxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJibHVlIGFzdGVyaXNrIGljb25cIj48L2k+IFxuICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke3dpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwobWFuYWdlci51c2VybmFtZSl9PC9zdHJvbmc+JHt3aW5kb3cuU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRlc2NyaXB0aW9uVGV4dCl9XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgcGVybWlzc2lvbiBjZWxscyAtIHNob3cgY2hlY2ttYXJrIGlmIGhhcyBhbnkgcGVybWlzc2lvbiAocmVhZCBvciB3cml0ZSlcbiAgICAgICAgICAgIHBlcm1pc3Npb25zLmZvckVhY2gocGVybSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFzUmVhZCA9IHJlYWRQZXJtcyA9PT0gJ2FsbCcgfHwgcmVhZFBlcm1zLmluY2x1ZGVzKHBlcm0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc1dyaXRlID0gd3JpdGVQZXJtcyA9PT0gJ2FsbCcgfHwgd3JpdGVQZXJtcy5pbmNsdWRlcyhwZXJtKTtcbiAgICAgICAgICAgICAgICBjb25zdCBoYXNQZXJtaXNzaW9uID0gaGFzUmVhZCB8fCBoYXNXcml0ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoaGFzUGVybWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZGF0YSBhdHRyaWJ1dGVzIGZvciBkeW5hbWljIHRvb2x0aXAgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgICAgICAgdGFibGVIdG1sICs9IGA8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCBwZXJtaXNzaW9uLWNlbGwgaGlkZS1vbi1tb2JpbGVcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtbWFuYWdlcj1cIiR7d2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChtYW5hZ2VyLnVzZXJuYW1lKX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wZXJtaXNzaW9uPVwiJHtwZXJtfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWlzLXN5c3RlbT1cIiR7bWFuYWdlci5pc1N5c3RlbX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1oYXMtcmVhZD1cIiR7aGFzUmVhZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1oYXMtd3JpdGU9XCIke2hhc1dyaXRlfVwiPmA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgdGV4dCBsYWJlbHMgd2l0aCBjb2xvcnMgKG5vIGlubGluZSB0b29sdGlwIGRhdGEpXG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNSZWFkICYmIGhhc1dyaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGdWxsIGFjY2VzcyAoYm90aCByZWFkIGFuZCB3cml0ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlSHRtbCArPSAnPHNwYW4gY2xhc3M9XCJ1aSBncmVlbiB0ZXh0XCI+PHN0cm9uZz5SVzwvc3Ryb25nPjwvc3Bhbj4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhhc1JlYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlYWQgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgdGFibGVIdG1sICs9ICc8c3BhbiBjbGFzcz1cInVpIGJsdWUgdGV4dFwiPjxzdHJvbmc+Ujwvc3Ryb25nPjwvc3Bhbj4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhhc1dyaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBXcml0ZSBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZUh0bWwgKz0gJzxzcGFuIGNsYXNzPVwidWkgb3JhbmdlIHRleHRcIj48c3Ryb25nPlc8L3N0cm9uZz48L3NwYW4+JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE5vIHBlcm1pc3Npb24gLSBlbXB0eSBjZWxsIHdpdGhvdXQgdG9vbHRpcFxuICAgICAgICAgICAgICAgICAgICB0YWJsZUh0bWwgKz0gJzx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkIHBlcm1pc3Npb24tY2VsbCBoaWRlLW9uLW1vYmlsZVwiPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRhYmxlSHRtbCArPSAnPC90ZD4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBhY3Rpb24gYnV0dG9uc1xuICAgICAgICAgICAgdGFibGVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRpbnkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobWFuYWdlci5pc1N5c3RlbSkge1xuICAgICAgICAgICAgICAgIHRhYmxlSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvbW9kaWZ5LyR7bWFuYWdlci5pZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gdmlldyBwb3B1cGVkXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVmlld31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBleWUgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgIGA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRhYmxlSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvbW9kaWZ5LyR7bWFuYWdlci5pZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZWRpdCBwb3B1cGVkXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZWRpdCBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgZGF0YS12YWx1ZT1cIiR7bWFuYWdlci5pZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gY29weSBwb3B1cGVkXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHl9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gY29weSBvdXRsaW5lIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBkYXRhLXZhbHVlPVwiJHttYW5hZ2VyLmlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0YWJsZUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRhYmxlSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW5kZXIgdGFibGVcbiAgICAgICAgJCgnI2FzdGVyaXNrLW1hbmFnZXJzLXRhYmxlLWNvbnRhaW5lcicpLmh0bWwodGFibGVIdG1sKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZHluYW1pY2FsbHkgbGlrZSBpbiBGaXJld2FsbFxuICAgICAgICB0aGlzLmluaXRpYWxpemVQZXJtaXNzaW9uVG9vbHRpcHMoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGVybWlzc2lvbiB0b29sdGlwcyBkeW5hbWljYWxseVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQZXJtaXNzaW9uVG9vbHRpcHMoKSB7XG4gICAgICAgIGNvbnN0IHBlcm1pc3Npb25EZXNjcmlwdGlvbnMgPSB0aGlzLmdldFBlcm1pc3Npb25EZXNjcmlwdGlvbnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGFsbCBwZXJtaXNzaW9uIGNlbGxzXG4gICAgICAgICQoJy5wZXJtaXNzaW9uLWNlbGxbZGF0YS1tYW5hZ2VyXScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2VsbCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBtYW5hZ2VyID0gJGNlbGwuZGF0YSgnbWFuYWdlcicpO1xuICAgICAgICAgICAgY29uc3QgcGVybWlzc2lvbiA9ICRjZWxsLmRhdGEoJ3Blcm1pc3Npb24nKTtcbiAgICAgICAgICAgIGNvbnN0IGlzU3lzdGVtID0gJGNlbGwuZGF0YSgnaXMtc3lzdGVtJyk7XG4gICAgICAgICAgICBjb25zdCBoYXNSZWFkID0gJGNlbGwuZGF0YSgnaGFzLXJlYWQnKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1dyaXRlID0gJGNlbGwuZGF0YSgnaGFzLXdyaXRlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChtYW5hZ2VyICYmIHBlcm1pc3Npb24gJiYgcGVybWlzc2lvbkRlc2NyaXB0aW9uc1twZXJtaXNzaW9uXSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBEYXRhID0gYXN0ZXJpc2tNYW5hZ2Vyc0luZGV4LmJ1aWxkVG9vbHRpcERhdGEoXG4gICAgICAgICAgICAgICAgICAgIG1hbmFnZXIsIHBlcm1pc3Npb24sIGlzU3lzdGVtLCBoYXNSZWFkLCBoYXNXcml0ZSwgcGVybWlzc2lvbkRlc2NyaXB0aW9uc1twZXJtaXNzaW9uXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcFxuICAgICAgICAgICAgICAgICRjZWxsLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogdG9vbHRpcENvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBwZXJtaXNzaW9uIGRlc2NyaXB0aW9ucyBvYmplY3RcbiAgICAgKi9cbiAgICBnZXRQZXJtaXNzaW9uRGVzY3JpcHRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2FsbDoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2NhbGxfcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY2FsbF93cml0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNkcjoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2Nkcl9yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jZHJfd3JpdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcmlnaW5hdGU6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9vcmlnaW5hdGVfcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfb3JpZ2luYXRlX3dyaXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVwb3J0aW5nOiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfcmVwb3J0aW5nX3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3JlcG9ydGluZ193cml0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFnZW50OiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfYWdlbnRfcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfYWdlbnRfd3JpdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jb25maWdfcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY29uZmlnX3dyaXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGlhbHBsYW46IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9kaWFscGxhbl9yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9kaWFscGxhbl93cml0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGR0bWY6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9kdG1mX3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2R0bWZfd3JpdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsb2c6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9sb2dfcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfbG9nX3dyaXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3lzdGVtOiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfc3lzdGVtX3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3N5c3RlbV93cml0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF91c2VyX3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3VzZXJfd3JpdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB2ZXJib3NlOiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfdmVyYm9zZV9yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF92ZXJib3NlX3dyaXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29tbWFuZDoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2NvbW1hbmRfcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY29tbWFuZF93cml0ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgdG9vbHRpcCBkYXRhIHN0cnVjdHVyZVxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcERhdGEobWFuYWdlciwgcGVybWlzc2lvbiwgaXNTeXN0ZW0sIGhhc1JlYWQsIGhhc1dyaXRlLCBwZXJtRGVzYykge1xuICAgICAgICBjb25zdCB0b29sdGlwRGF0YSA9IHtcbiAgICAgICAgICAgIGhlYWRlcjogYCR7bWFuYWdlcn0gLSAke3Blcm1pc3Npb24udG9VcHBlckNhc2UoKX1gLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IG51bGwsXG4gICAgICAgICAgICBsaXN0OiBbXVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGN1cnJlbnQgYWNjZXNzIGxldmVsXG4gICAgICAgIGxldCBhY2Nlc3NMZXZlbCA9ICcnO1xuICAgICAgICBsZXQgYWNjZXNzQ29sb3IgPSAnJztcbiAgICAgICAgaWYgKGhhc1JlYWQgJiYgaGFzV3JpdGUpIHtcbiAgICAgICAgICAgIGFjY2Vzc0xldmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfYWNjZXNzX3JlYWRfd3JpdGU7XG4gICAgICAgICAgICBhY2Nlc3NDb2xvciA9ICdncmVlbic7XG4gICAgICAgIH0gZWxzZSBpZiAoaGFzUmVhZCkge1xuICAgICAgICAgICAgYWNjZXNzTGV2ZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9hY2Nlc3NfcmVhZF9vbmx5O1xuICAgICAgICAgICAgYWNjZXNzQ29sb3IgPSAnYmx1ZSc7XG4gICAgICAgIH0gZWxzZSBpZiAoaGFzV3JpdGUpIHtcbiAgICAgICAgICAgIGFjY2Vzc0xldmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfYWNjZXNzX3dyaXRlX29ubHk7XG4gICAgICAgICAgICBhY2Nlc3NDb2xvciA9ICdvcmFuZ2UnO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjdXJyZW50QWNjZXNzTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jdXJyZW50X2FjY2VzcztcbiAgICAgICAgdG9vbHRpcERhdGEuZGVzY3JpcHRpb24gPSBgPHNwYW4gY2xhc3M9XCJ1aSAke2FjY2Vzc0NvbG9yfSB0ZXh0XCI+PHN0cm9uZz4ke2N1cnJlbnRBY2Nlc3NMYWJlbH06ICR7YWNjZXNzTGV2ZWx9PC9zdHJvbmc+PC9zcGFuPmA7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcGVybWlzc2lvbiBkZXRhaWxzXG4gICAgICAgIGNvbnN0IGFsbG93ZWRPcGVyYXRpb25zTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9hbGxvd2VkX29wZXJhdGlvbnM7XG4gICAgICAgIHRvb2x0aXBEYXRhLmxpc3QucHVzaCh7XG4gICAgICAgICAgICB0ZXJtOiBhbGxvd2VkT3BlcmF0aW9uc0xhYmVsLFxuICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChoYXNSZWFkKSB7XG4gICAgICAgICAgICBjb25zdCByZWFkTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fUmVhZDtcbiAgICAgICAgICAgIHRvb2x0aXBEYXRhLmxpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgdGVybTogcmVhZExhYmVsLFxuICAgICAgICAgICAgICAgIGRlZmluaXRpb246IHBlcm1EZXNjLnJlYWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoaGFzV3JpdGUpIHtcbiAgICAgICAgICAgIGNvbnN0IHdyaXRlTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fV3JpdGU7XG4gICAgICAgICAgICB0b29sdGlwRGF0YS5saXN0LnB1c2goe1xuICAgICAgICAgICAgICAgIHRlcm06IHdyaXRlTGFiZWwsXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogcGVybURlc2Mud3JpdGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcmVzdHJpY3Rpb25zIGlmIGFueVxuICAgICAgICBpZiAoIWhhc1JlYWQgfHwgIWhhc1dyaXRlKSB7XG4gICAgICAgICAgICBjb25zdCByZXN0cmljdGlvbnNMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3Jlc3RyaWN0aW9ucztcbiAgICAgICAgICAgIHRvb2x0aXBEYXRhLmxpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgdGVybTogcmVzdHJpY3Rpb25zTGFiZWwsXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghaGFzUmVhZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhbm5vdFJlYWRMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2Nhbm5vdF9yZWFkO1xuICAgICAgICAgICAgICAgIHRvb2x0aXBEYXRhLmxpc3QucHVzaChgJHtjYW5ub3RSZWFkTGFiZWx9OiAke3Blcm1EZXNjLnJlYWR9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWhhc1dyaXRlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2Fubm90V3JpdGVMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2Nhbm5vdF93cml0ZTtcbiAgICAgICAgICAgICAgICB0b29sdGlwRGF0YS5saXN0LnB1c2goYCR7Y2Fubm90V3JpdGVMYWJlbH06ICR7cGVybURlc2Mud3JpdGV9YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzeXN0ZW0gbWFuYWdlciB3YXJuaW5nIGlmIGFwcGxpY2FibGVcbiAgICAgICAgaWYgKGlzU3lzdGVtKSB7XG4gICAgICAgICAgICB0b29sdGlwRGF0YS53YXJuaW5nID0ge1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfc3lzdGVtX21hbmFnZXJfd2FybmluZyxcbiAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9zeXN0ZW1fbWFuYWdlcl93YXJuaW5nX3RleHRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiB0b29sdGlwRGF0YTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGFibGUgZXZlbnQgaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVGFibGVFdmVudHMoKSB7XG4gICAgICAgIC8vIFVzZSBldmVudCBkZWxlZ2F0aW9uIGZvciBkeW5hbWljYWxseSBnZW5lcmF0ZWQgY29udGVudFxuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJCgnI2FzdGVyaXNrLW1hbmFnZXJzLXRhYmxlLWNvbnRhaW5lcicpO1xuICAgICAgICBcbiAgICAgICAgLy8gRG91YmxlIGNsaWNrIHRvIGVkaXQgKGV4Y2x1ZGUgYWN0aW9uIGJ1dHRvbnMgY29sdW1uKVxuICAgICAgICAkY29udGFpbmVyLm9uKCdkYmxjbGljaycsICcubWFuYWdlci1yb3cgdGQ6bm90KC5yaWdodC5hbGlnbmVkKScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignZGF0YS1pZCcpO1xuICAgICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1hc3Rlcmlzay1tYW5hZ2Vycy9tb2RpZnkvJHtpZH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvcHkgYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgJGNvbnRhaW5lci5vbignY2xpY2snLCAnYS5jb3B5JywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gbW9kaWZ5IHBhZ2Ugd2l0aCBjb3B5LXNvdXJjZSBwYXJhbWV0ZXJcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLW1hbmFnZXJzL21vZGlmeT9jb3B5LXNvdXJjZT0ke2lkfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gTGV0IGRlbGV0ZS1zb21ldGhpbmcuanMgaGFuZGxlIHRoZSBmaXJzdCBjbGljaywgd2UganVzdCBwcmV2ZW50IGRlZmF1bHQgbmF2aWdhdGlvblxuICAgICAgICAkY29udGFpbmVyLm9uKCdjbGljaycsICdhLmRlbGV0ZS50d28tc3RlcHMtZGVsZXRlJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgLy8gRG9uJ3Qgc3RvcCBwcm9wYWdhdGlvbiAtIGFsbG93IGRlbGV0ZS1zb21ldGhpbmcuanMgdG8gd29ya1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlbGV0ZSBidXR0b24gaGFuZGxlciAtIHdvcmtzIHdpdGggdHdvLXN0ZXBzLWRlbGV0ZSBsb2dpY1xuICAgICAgICAvLyBUaGlzIHdpbGwgYmUgdHJpZ2dlcmVkIGFmdGVyIGRlbGV0ZS1zb21ldGhpbmcuanMgcmVtb3ZlcyB0aGUgdHdvLXN0ZXBzLWRlbGV0ZSBjbGFzc1xuICAgICAgICAkY29udGFpbmVyLm9uKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICRidXR0b24uYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgQXN0ZXJpc2tNYW5hZ2Vyc0FQSS5kZWxldGVSZWNvcmQoaWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZWxvYWQgdGhlIGVudGlyZSBwYWdlIHRvIGVuc3VyZSBjbGVhbiBzdGF0ZVxuICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLW1hbmFnZXJzL2luZGV4YDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZT8ubWVzc2FnZXMgfHwgZ2xvYmFsVHJhbnNsYXRlLmFtX0Vycm9yRGVsZXRpbmdNYW5hZ2VyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlc3RvcmUgdHdvLXN0ZXBzLWRlbGV0ZSBjbGFzcyBpZiBkZWxldGlvbiBmYWlsZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ3R3by1zdGVwcy1kZWxldGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRidXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdjbG9zZScpLmFkZENsYXNzKCd0cmFzaCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBBcnJheSBvZiBtYW5hZ2VyIG9iamVjdHNcbiAgICAgKi9cbiAgICBvbkRhdGFMb2FkZWQoZGF0YSkge1xuICAgICAgICAvLyBBZGRpdGlvbmFsIHByb2Nlc3NpbmcgYWZ0ZXIgZGF0YSBsb2FkIGlmIG5lZWRlZFxuICAgIH1cbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBBc3RlcmlzayBNYW5hZ2VycyB0YWJsZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgYXN0ZXJpc2tNYW5hZ2Vyc0luZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuIl19