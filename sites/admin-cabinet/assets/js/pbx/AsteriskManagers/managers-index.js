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
      var writePerms = manager.writePermissionsSummary || ''; // Format description like in Firewall

      var description = manager.description || '';
      var descriptionText = description ? " - ".concat(description) : '';
      tableHtml += "\n                <tr class=\"manager-row\" data-id=\"".concat(manager.id, "\">\n                    <td>\n                        <i class=\"blue asterisk icon\"></i>\n                        <strong>").concat(window.SecurityUtils.escapeHtml(manager.username), "</strong>").concat(window.SecurityUtils.escapeHtml(descriptionText), "\n                    </td>\n            "); // Add permission cells - show checkmark if has any permission (read or write)

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
        // System managers cannot be edited - show lock icon with tooltip
        tableHtml += "\n                    <div class=\"ui button disabled popuped\"\n                         data-content=\"".concat(globalTranslate.am_SystemManagerCannotBeEdited || 'System manager cannot be edited', "\">\n                        <i class=\"icon lock yellow\"></i>\n                    </div>\n                ");
      } else {
        tableHtml += "\n                    <a href=\"".concat(globalRootUrl, "asterisk-managers/modify/").concat(manager.id, "\"\n                       class=\"ui button edit popuped\" data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                        <i class=\"icon edit blue\"></i>\n                    </a>\n                    <a href=\"#\" data-value=\"").concat(manager.id, "\"\n                       class=\"ui button copy popuped\" data-content=\"").concat(globalTranslate.bt_ToolTipCopy, "\">\n                        <i class=\"icon copy outline blue\"></i>\n                    </a>\n                    <a href=\"#\" data-value=\"").concat(manager.id, "\"\n                       class=\"ui button delete two-steps-delete popuped\" data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                        <i class=\"icon trash red\"></i>\n                    </a>\n                ");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbImFzdGVyaXNrTWFuYWdlcnNJbmRleCIsImRhdGFUYWJsZUluc3RhbmNlIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVUYWJsZUV2ZW50cyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJsb2FkQW5kUmVuZGVyVGFibGUiLCIkIiwiaHRtbCIsIkFzdGVyaXNrTWFuYWdlcnNBUEkiLCJnZXRMaXN0IiwicmVzcG9uc2UiLCJyZXN1bHQiLCJBcnJheSIsImlzQXJyYXkiLCJkYXRhIiwibGVuZ3RoIiwiaGlkZSIsInNob3ciLCJyZW5kZXJQZXJtaXNzaW9uc1RhYmxlIiwibWFuYWdlcnMiLCJwZXJtaXNzaW9ucyIsInRhYmxlSHRtbCIsIm1hcCIsInBlcm0iLCJqb2luIiwiZm9yRWFjaCIsIm1hbmFnZXIiLCJyZWFkUGVybXMiLCJyZWFkUGVybWlzc2lvbnNTdW1tYXJ5Iiwid3JpdGVQZXJtcyIsIndyaXRlUGVybWlzc2lvbnNTdW1tYXJ5IiwiZGVzY3JpcHRpb24iLCJkZXNjcmlwdGlvblRleHQiLCJpZCIsIndpbmRvdyIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwidXNlcm5hbWUiLCJoYXNSZWFkIiwiaW5jbHVkZXMiLCJoYXNXcml0ZSIsImhhc1Blcm1pc3Npb24iLCJpc1N5c3RlbSIsImdsb2JhbFRyYW5zbGF0ZSIsImFtX1N5c3RlbU1hbmFnZXJDYW5ub3RCZUVkaXRlZCIsImdsb2JhbFJvb3RVcmwiLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBDb3B5IiwiYnRfVG9vbFRpcERlbGV0ZSIsImluaXRpYWxpemVQZXJtaXNzaW9uVG9vbHRpcHMiLCJwZXJtaXNzaW9uRGVzY3JpcHRpb25zIiwiZ2V0UGVybWlzc2lvbkRlc2NyaXB0aW9ucyIsImVhY2giLCIkY2VsbCIsInBlcm1pc3Npb24iLCJ0b29sdGlwRGF0YSIsImJ1aWxkVG9vbHRpcERhdGEiLCJ0b29sdGlwQ29udGVudCIsIlRvb2x0aXBCdWlsZGVyIiwiYnVpbGRDb250ZW50IiwicG9wdXAiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5IiwidmFyaWF0aW9uIiwiY2FsbCIsInJlYWQiLCJhbV90b29sdGlwX2NhbGxfcmVhZCIsIndyaXRlIiwiYW1fdG9vbHRpcF9jYWxsX3dyaXRlIiwiY2RyIiwiYW1fdG9vbHRpcF9jZHJfcmVhZCIsImFtX3Rvb2x0aXBfY2RyX3dyaXRlIiwib3JpZ2luYXRlIiwiYW1fdG9vbHRpcF9vcmlnaW5hdGVfcmVhZCIsImFtX3Rvb2x0aXBfb3JpZ2luYXRlX3dyaXRlIiwicmVwb3J0aW5nIiwiYW1fdG9vbHRpcF9yZXBvcnRpbmdfcmVhZCIsImFtX3Rvb2x0aXBfcmVwb3J0aW5nX3dyaXRlIiwiYWdlbnQiLCJhbV90b29sdGlwX2FnZW50X3JlYWQiLCJhbV90b29sdGlwX2FnZW50X3dyaXRlIiwiY29uZmlnIiwiYW1fdG9vbHRpcF9jb25maWdfcmVhZCIsImFtX3Rvb2x0aXBfY29uZmlnX3dyaXRlIiwiZGlhbHBsYW4iLCJhbV90b29sdGlwX2RpYWxwbGFuX3JlYWQiLCJhbV90b29sdGlwX2RpYWxwbGFuX3dyaXRlIiwiZHRtZiIsImFtX3Rvb2x0aXBfZHRtZl9yZWFkIiwiYW1fdG9vbHRpcF9kdG1mX3dyaXRlIiwibG9nIiwiYW1fdG9vbHRpcF9sb2dfcmVhZCIsImFtX3Rvb2x0aXBfbG9nX3dyaXRlIiwic3lzdGVtIiwiYW1fdG9vbHRpcF9zeXN0ZW1fcmVhZCIsImFtX3Rvb2x0aXBfc3lzdGVtX3dyaXRlIiwidXNlciIsImFtX3Rvb2x0aXBfdXNlcl9yZWFkIiwiYW1fdG9vbHRpcF91c2VyX3dyaXRlIiwidmVyYm9zZSIsImFtX3Rvb2x0aXBfdmVyYm9zZV9yZWFkIiwiYW1fdG9vbHRpcF92ZXJib3NlX3dyaXRlIiwiY29tbWFuZCIsImFtX3Rvb2x0aXBfY29tbWFuZF9yZWFkIiwiYW1fdG9vbHRpcF9jb21tYW5kX3dyaXRlIiwicGVybURlc2MiLCJoZWFkZXIiLCJ0b1VwcGVyQ2FzZSIsImxpc3QiLCJhY2Nlc3NMZXZlbCIsImFjY2Vzc0NvbG9yIiwiYW1fdG9vbHRpcF9hY2Nlc3NfcmVhZF93cml0ZSIsImFtX3Rvb2x0aXBfYWNjZXNzX3JlYWRfb25seSIsImFtX3Rvb2x0aXBfYWNjZXNzX3dyaXRlX29ubHkiLCJjdXJyZW50QWNjZXNzTGFiZWwiLCJhbV90b29sdGlwX2N1cnJlbnRfYWNjZXNzIiwiYWxsb3dlZE9wZXJhdGlvbnNMYWJlbCIsImFtX3Rvb2x0aXBfYWxsb3dlZF9vcGVyYXRpb25zIiwicHVzaCIsInRlcm0iLCJkZWZpbml0aW9uIiwicmVhZExhYmVsIiwiYW1fUmVhZCIsIndyaXRlTGFiZWwiLCJhbV9Xcml0ZSIsInJlc3RyaWN0aW9uc0xhYmVsIiwiYW1fdG9vbHRpcF9yZXN0cmljdGlvbnMiLCJjYW5ub3RSZWFkTGFiZWwiLCJhbV90b29sdGlwX2Nhbm5vdF9yZWFkIiwiY2Fubm90V3JpdGVMYWJlbCIsImFtX3Rvb2x0aXBfY2Fubm90X3dyaXRlIiwid2FybmluZyIsImFtX3Rvb2x0aXBfc3lzdGVtX21hbmFnZXJfd2FybmluZyIsInRleHQiLCJhbV90b29sdGlwX3N5c3RlbV9tYW5hZ2VyX3dhcm5pbmdfdGV4dCIsIiRjb250YWluZXIiLCJvbiIsImUiLCJ0YXJnZXQiLCJjbG9zZXN0IiwiYXR0ciIsImxvY2F0aW9uIiwicHJldmVudERlZmF1bHQiLCJjdXJyZW50VGFyZ2V0IiwiJGJ1dHRvbiIsImFkZENsYXNzIiwiZGVsZXRlUmVjb3JkIiwiaHJlZiIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJhbV9FcnJvckRlbGV0aW5nTWFuYWdlciIsInJlbW92ZUNsYXNzIiwiZmluZCIsIm9uRGF0YUxvYWRlZCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEscUJBQXFCLEdBQUc7QUFDMUI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLElBSk87O0FBTTFCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQVQwQix3QkFTYjtBQUNUO0FBQ0EsU0FBS0MscUJBQUwsR0FGUyxDQUlUOztBQUNBLFNBQUtDLG1CQUFMO0FBQ0gsR0FmeUI7O0FBaUIxQjtBQUNKO0FBQ0E7QUFDSUEsRUFBQUEsbUJBcEIwQixpQ0FvQko7QUFDbEI7QUFDQSxTQUFLQyxrQkFBTDtBQUNILEdBdkJ5Qjs7QUF5QjFCO0FBQ0o7QUFDQTtBQUNJQSxFQUFBQSxrQkE1QjBCLGdDQTRCTDtBQUFBOztBQUNqQjtBQUNBQyxJQUFBQSxDQUFDLENBQUMsb0NBQUQsQ0FBRCxDQUF3Q0MsSUFBeEMsQ0FBNkMsc0RBQTdDLEVBRmlCLENBSWpCOztBQUNBQyxJQUFBQSxtQkFBbUIsQ0FBQ0MsT0FBcEIsQ0FBNEIsVUFBQ0MsUUFBRCxFQUFjO0FBQ3RDLFVBQUlBLFFBQVEsSUFBSUEsUUFBUSxDQUFDQyxNQUFyQixJQUErQkMsS0FBSyxDQUFDQyxPQUFOLENBQWNILFFBQVEsQ0FBQ0ksSUFBdkIsQ0FBbkMsRUFBaUU7QUFDN0QsWUFBSUosUUFBUSxDQUFDSSxJQUFULENBQWNDLE1BQWQsS0FBeUIsQ0FBN0IsRUFBZ0M7QUFDNUI7QUFDQVQsVUFBQUEsQ0FBQyxDQUFDLG9DQUFELENBQUQsQ0FBd0NVLElBQXhDO0FBQ0FWLFVBQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCVSxJQUFyQjtBQUNBVixVQUFBQSxDQUFDLENBQUMsMEJBQUQsQ0FBRCxDQUE4QlcsSUFBOUI7QUFDSCxTQUxELE1BS087QUFDSDtBQUNBWCxVQUFBQSxDQUFDLENBQUMsMEJBQUQsQ0FBRCxDQUE4QlUsSUFBOUI7QUFDQVYsVUFBQUEsQ0FBQyxDQUFDLGlCQUFELENBQUQsQ0FBcUJXLElBQXJCO0FBQ0FYLFVBQUFBLENBQUMsQ0FBQyxvQ0FBRCxDQUFELENBQXdDVyxJQUF4Qzs7QUFFQSxVQUFBLEtBQUksQ0FBQ0Msc0JBQUwsQ0FBNEJSLFFBQVEsQ0FBQ0ksSUFBckM7QUFDSDtBQUNKLE9BZEQsTUFjTztBQUNIUixRQUFBQSxDQUFDLENBQUMsb0NBQUQsQ0FBRCxDQUF3Q0MsSUFBeEMsQ0FBNkMseURBQTdDO0FBQ0g7QUFDSixLQWxCRCxFQWtCRyxLQWxCSCxFQUxpQixDQXVCTjtBQUNkLEdBcER5Qjs7QUF1RDFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lXLEVBQUFBLHNCQTNEMEIsa0NBMkRIQyxRQTNERyxFQTJETztBQUM3QixRQUFNQyxXQUFXLEdBQUcsQ0FBQyxNQUFELEVBQVMsS0FBVCxFQUFnQixXQUFoQixFQUE2QixXQUE3QixFQUEwQyxPQUExQyxFQUFtRCxRQUFuRCxFQUNBLFVBREEsRUFDWSxNQURaLEVBQ29CLEtBRHBCLEVBQzJCLFFBRDNCLEVBQ3FDLE1BRHJDLEVBQzZDLFNBRDdDLEVBQ3dELFNBRHhELENBQXBCO0FBSUEsUUFBSUMsU0FBUyw4T0FLS0QsV0FBVyxDQUFDRSxHQUFaLENBQWdCLFVBQUFDLElBQUk7QUFBQSxrS0FFREEsSUFGQztBQUFBLEtBQXBCLEVBSUNDLElBSkQsQ0FJTSxFQUpOLENBTEwsZ0lBQWIsQ0FMNkIsQ0FxQjdCOztBQUNBTCxJQUFBQSxRQUFRLENBQUNNLE9BQVQsQ0FBaUIsVUFBQUMsT0FBTyxFQUFJO0FBQ3hCLFVBQU1DLFNBQVMsR0FBR0QsT0FBTyxDQUFDRSxzQkFBUixJQUFrQyxFQUFwRDtBQUNBLFVBQU1DLFVBQVUsR0FBR0gsT0FBTyxDQUFDSSx1QkFBUixJQUFtQyxFQUF0RCxDQUZ3QixDQUl4Qjs7QUFDQSxVQUFNQyxXQUFXLEdBQUdMLE9BQU8sQ0FBQ0ssV0FBUixJQUF1QixFQUEzQztBQUNBLFVBQU1DLGVBQWUsR0FBR0QsV0FBVyxnQkFBU0EsV0FBVCxJQUF5QixFQUE1RDtBQUVBVixNQUFBQSxTQUFTLG9FQUM4QkssT0FBTyxDQUFDTyxFQUR0QywwSUFJYUMsTUFBTSxDQUFDQyxhQUFQLENBQXFCQyxVQUFyQixDQUFnQ1YsT0FBTyxDQUFDVyxRQUF4QyxDQUpiLHNCQUkwRUgsTUFBTSxDQUFDQyxhQUFQLENBQXFCQyxVQUFyQixDQUFnQ0osZUFBaEMsQ0FKMUUsOENBQVQsQ0FSd0IsQ0FnQnhCOztBQUNBWixNQUFBQSxXQUFXLENBQUNLLE9BQVosQ0FBb0IsVUFBQUYsSUFBSSxFQUFJO0FBQ3hCLFlBQU1lLE9BQU8sR0FBR1gsU0FBUyxLQUFLLEtBQWQsSUFBdUJBLFNBQVMsQ0FBQ1ksUUFBVixDQUFtQmhCLElBQW5CLENBQXZDO0FBQ0EsWUFBTWlCLFFBQVEsR0FBR1gsVUFBVSxLQUFLLEtBQWYsSUFBd0JBLFVBQVUsQ0FBQ1UsUUFBWCxDQUFvQmhCLElBQXBCLENBQXpDO0FBQ0EsWUFBTWtCLGFBQWEsR0FBR0gsT0FBTyxJQUFJRSxRQUFqQzs7QUFFQSxZQUFJQyxhQUFKLEVBQW1CO0FBQ2Y7QUFDQXBCLFVBQUFBLFNBQVMsbUhBQ1dhLE1BQU0sQ0FBQ0MsYUFBUCxDQUFxQkMsVUFBckIsQ0FBZ0NWLE9BQU8sQ0FBQ1csUUFBeEMsQ0FEWCwyREFFY2QsSUFGZCwwREFHYUcsT0FBTyxDQUFDZ0IsUUFIckIseURBSVlKLE9BSlosMERBS2FFLFFBTGIsUUFBVCxDQUZlLENBU2Y7O0FBQ0EsY0FBSUYsT0FBTyxJQUFJRSxRQUFmLEVBQXlCO0FBQ3JCO0FBQ0FuQixZQUFBQSxTQUFTLElBQUksd0RBQWI7QUFDSCxXQUhELE1BR08sSUFBSWlCLE9BQUosRUFBYTtBQUNoQjtBQUNBakIsWUFBQUEsU0FBUyxJQUFJLHNEQUFiO0FBQ0gsV0FITSxNQUdBLElBQUltQixRQUFKLEVBQWM7QUFDakI7QUFDQW5CLFlBQUFBLFNBQVMsSUFBSSx3REFBYjtBQUNIO0FBQ0osU0FwQkQsTUFvQk87QUFDSDtBQUNBQSxVQUFBQSxTQUFTLElBQUksNERBQWI7QUFDSDs7QUFFREEsUUFBQUEsU0FBUyxJQUFJLE9BQWI7QUFDSCxPQS9CRCxFQWpCd0IsQ0FrRHhCOztBQUNBQSxNQUFBQSxTQUFTLDRKQUFUOztBQUtBLFVBQUlLLE9BQU8sQ0FBQ2dCLFFBQVosRUFBc0I7QUFDbEI7QUFDQXJCLFFBQUFBLFNBQVMsdUhBRWdCc0IsZUFBZSxDQUFDQyw4QkFBaEIsSUFBa0QsaUNBRmxFLGtIQUFUO0FBTUgsT0FSRCxNQVFPO0FBQ0h2QixRQUFBQSxTQUFTLDhDQUNNd0IsYUFETixzQ0FDK0NuQixPQUFPLENBQUNPLEVBRHZELHdGQUU2Q1UsZUFBZSxDQUFDRyxjQUY3RCxxSkFLcUJwQixPQUFPLENBQUNPLEVBTDdCLHdGQU02Q1UsZUFBZSxDQUFDSSxjQU43RCw2SkFTcUJyQixPQUFPLENBQUNPLEVBVDdCLDJHQVVnRVUsZUFBZSxDQUFDSyxnQkFWaEYsOEdBQVQ7QUFjSDs7QUFFRDNCLE1BQUFBLFNBQVMsOEZBQVQ7QUFLSCxLQXRGRDtBQXdGQUEsSUFBQUEsU0FBUyxnRUFBVCxDQTlHNkIsQ0FtSDdCOztBQUNBZixJQUFBQSxDQUFDLENBQUMsb0NBQUQsQ0FBRCxDQUF3Q0MsSUFBeEMsQ0FBNkNjLFNBQTdDLEVBcEg2QixDQXNIN0I7O0FBQ0EsU0FBSzRCLDRCQUFMO0FBQ0gsR0FuTHlCOztBQXFMMUI7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLDRCQXhMMEIsMENBd0xLO0FBQzNCLFFBQU1DLHNCQUFzQixHQUFHLEtBQUtDLHlCQUFMLEVBQS9CLENBRDJCLENBRzNCOztBQUNBN0MsSUFBQUEsQ0FBQyxDQUFDLGdDQUFELENBQUQsQ0FBb0M4QyxJQUFwQyxDQUF5QyxZQUFXO0FBQ2hELFVBQU1DLEtBQUssR0FBRy9DLENBQUMsQ0FBQyxJQUFELENBQWY7QUFDQSxVQUFNb0IsT0FBTyxHQUFHMkIsS0FBSyxDQUFDdkMsSUFBTixDQUFXLFNBQVgsQ0FBaEI7QUFDQSxVQUFNd0MsVUFBVSxHQUFHRCxLQUFLLENBQUN2QyxJQUFOLENBQVcsWUFBWCxDQUFuQjtBQUNBLFVBQU00QixRQUFRLEdBQUdXLEtBQUssQ0FBQ3ZDLElBQU4sQ0FBVyxXQUFYLENBQWpCO0FBQ0EsVUFBTXdCLE9BQU8sR0FBR2UsS0FBSyxDQUFDdkMsSUFBTixDQUFXLFVBQVgsQ0FBaEI7QUFDQSxVQUFNMEIsUUFBUSxHQUFHYSxLQUFLLENBQUN2QyxJQUFOLENBQVcsV0FBWCxDQUFqQjs7QUFFQSxVQUFJWSxPQUFPLElBQUk0QixVQUFYLElBQXlCSixzQkFBc0IsQ0FBQ0ksVUFBRCxDQUFuRCxFQUFpRTtBQUM3RCxZQUFNQyxXQUFXLEdBQUd2RCxxQkFBcUIsQ0FBQ3dELGdCQUF0QixDQUNoQjlCLE9BRGdCLEVBQ1A0QixVQURPLEVBQ0taLFFBREwsRUFDZUosT0FEZixFQUN3QkUsUUFEeEIsRUFDa0NVLHNCQUFzQixDQUFDSSxVQUFELENBRHhELENBQXBCO0FBSUEsWUFBTUcsY0FBYyxHQUFHQyxjQUFjLENBQUNDLFlBQWYsQ0FBNEJKLFdBQTVCLENBQXZCLENBTDZELENBTzdEOztBQUNBRixRQUFBQSxLQUFLLENBQUNPLEtBQU4sQ0FBWTtBQUNSckQsVUFBQUEsSUFBSSxFQUFFa0QsY0FERTtBQUVSSSxVQUFBQSxRQUFRLEVBQUUsWUFGRjtBQUdSQyxVQUFBQSxTQUFTLEVBQUUsSUFISDtBQUlSQyxVQUFBQSxLQUFLLEVBQUU7QUFDSDlDLFlBQUFBLElBQUksRUFBRSxHQURIO0FBRUhELFlBQUFBLElBQUksRUFBRTtBQUZILFdBSkM7QUFRUmdELFVBQUFBLFNBQVMsRUFBRTtBQVJILFNBQVo7QUFVSDtBQUNKLEtBM0JEO0FBNEJILEdBeE55Qjs7QUEwTjFCO0FBQ0o7QUFDQTtBQUNJYixFQUFBQSx5QkE3TjBCLHVDQTZORTtBQUN4QixXQUFPO0FBQ0hjLE1BQUFBLElBQUksRUFBRTtBQUNGQyxRQUFBQSxJQUFJLEVBQUV2QixlQUFlLENBQUN3QixvQkFEcEI7QUFFRkMsUUFBQUEsS0FBSyxFQUFFekIsZUFBZSxDQUFDMEI7QUFGckIsT0FESDtBQUtIQyxNQUFBQSxHQUFHLEVBQUU7QUFDREosUUFBQUEsSUFBSSxFQUFFdkIsZUFBZSxDQUFDNEIsbUJBRHJCO0FBRURILFFBQUFBLEtBQUssRUFBRXpCLGVBQWUsQ0FBQzZCO0FBRnRCLE9BTEY7QUFTSEMsTUFBQUEsU0FBUyxFQUFFO0FBQ1BQLFFBQUFBLElBQUksRUFBRXZCLGVBQWUsQ0FBQytCLHlCQURmO0FBRVBOLFFBQUFBLEtBQUssRUFBRXpCLGVBQWUsQ0FBQ2dDO0FBRmhCLE9BVFI7QUFhSEMsTUFBQUEsU0FBUyxFQUFFO0FBQ1BWLFFBQUFBLElBQUksRUFBRXZCLGVBQWUsQ0FBQ2tDLHlCQURmO0FBRVBULFFBQUFBLEtBQUssRUFBRXpCLGVBQWUsQ0FBQ21DO0FBRmhCLE9BYlI7QUFpQkhDLE1BQUFBLEtBQUssRUFBRTtBQUNIYixRQUFBQSxJQUFJLEVBQUV2QixlQUFlLENBQUNxQyxxQkFEbkI7QUFFSFosUUFBQUEsS0FBSyxFQUFFekIsZUFBZSxDQUFDc0M7QUFGcEIsT0FqQko7QUFxQkhDLE1BQUFBLE1BQU0sRUFBRTtBQUNKaEIsUUFBQUEsSUFBSSxFQUFFdkIsZUFBZSxDQUFDd0Msc0JBRGxCO0FBRUpmLFFBQUFBLEtBQUssRUFBRXpCLGVBQWUsQ0FBQ3lDO0FBRm5CLE9BckJMO0FBeUJIQyxNQUFBQSxRQUFRLEVBQUU7QUFDTm5CLFFBQUFBLElBQUksRUFBRXZCLGVBQWUsQ0FBQzJDLHdCQURoQjtBQUVObEIsUUFBQUEsS0FBSyxFQUFFekIsZUFBZSxDQUFDNEM7QUFGakIsT0F6QlA7QUE2QkhDLE1BQUFBLElBQUksRUFBRTtBQUNGdEIsUUFBQUEsSUFBSSxFQUFFdkIsZUFBZSxDQUFDOEMsb0JBRHBCO0FBRUZyQixRQUFBQSxLQUFLLEVBQUV6QixlQUFlLENBQUMrQztBQUZyQixPQTdCSDtBQWlDSEMsTUFBQUEsR0FBRyxFQUFFO0FBQ0R6QixRQUFBQSxJQUFJLEVBQUV2QixlQUFlLENBQUNpRCxtQkFEckI7QUFFRHhCLFFBQUFBLEtBQUssRUFBRXpCLGVBQWUsQ0FBQ2tEO0FBRnRCLE9BakNGO0FBcUNIQyxNQUFBQSxNQUFNLEVBQUU7QUFDSjVCLFFBQUFBLElBQUksRUFBRXZCLGVBQWUsQ0FBQ29ELHNCQURsQjtBQUVKM0IsUUFBQUEsS0FBSyxFQUFFekIsZUFBZSxDQUFDcUQ7QUFGbkIsT0FyQ0w7QUF5Q0hDLE1BQUFBLElBQUksRUFBRTtBQUNGL0IsUUFBQUEsSUFBSSxFQUFFdkIsZUFBZSxDQUFDdUQsb0JBRHBCO0FBRUY5QixRQUFBQSxLQUFLLEVBQUV6QixlQUFlLENBQUN3RDtBQUZyQixPQXpDSDtBQTZDSEMsTUFBQUEsT0FBTyxFQUFFO0FBQ0xsQyxRQUFBQSxJQUFJLEVBQUV2QixlQUFlLENBQUMwRCx1QkFEakI7QUFFTGpDLFFBQUFBLEtBQUssRUFBRXpCLGVBQWUsQ0FBQzJEO0FBRmxCLE9BN0NOO0FBaURIQyxNQUFBQSxPQUFPLEVBQUU7QUFDTHJDLFFBQUFBLElBQUksRUFBRXZCLGVBQWUsQ0FBQzZELHVCQURqQjtBQUVMcEMsUUFBQUEsS0FBSyxFQUFFekIsZUFBZSxDQUFDOEQ7QUFGbEI7QUFqRE4sS0FBUDtBQXNESCxHQXBSeUI7O0FBc1IxQjtBQUNKO0FBQ0E7QUFDSWpELEVBQUFBLGdCQXpSMEIsNEJBeVJUOUIsT0F6UlMsRUF5UkE0QixVQXpSQSxFQXlSWVosUUF6UlosRUF5UnNCSixPQXpSdEIsRUF5UitCRSxRQXpSL0IsRUF5UnlDa0UsUUF6UnpDLEVBeVJtRDtBQUN6RSxRQUFNbkQsV0FBVyxHQUFHO0FBQ2hCb0QsTUFBQUEsTUFBTSxZQUFLakYsT0FBTCxnQkFBa0I0QixVQUFVLENBQUNzRCxXQUFYLEVBQWxCLENBRFU7QUFFaEI3RSxNQUFBQSxXQUFXLEVBQUUsSUFGRztBQUdoQjhFLE1BQUFBLElBQUksRUFBRTtBQUhVLEtBQXBCLENBRHlFLENBT3pFOztBQUNBLFFBQUlDLFdBQVcsR0FBRyxFQUFsQjtBQUNBLFFBQUlDLFdBQVcsR0FBRyxFQUFsQjs7QUFDQSxRQUFJekUsT0FBTyxJQUFJRSxRQUFmLEVBQXlCO0FBQ3JCc0UsTUFBQUEsV0FBVyxHQUFHbkUsZUFBZSxDQUFDcUUsNEJBQTlCO0FBQ0FELE1BQUFBLFdBQVcsR0FBRyxPQUFkO0FBQ0gsS0FIRCxNQUdPLElBQUl6RSxPQUFKLEVBQWE7QUFDaEJ3RSxNQUFBQSxXQUFXLEdBQUduRSxlQUFlLENBQUNzRSwyQkFBOUI7QUFDQUYsTUFBQUEsV0FBVyxHQUFHLE1BQWQ7QUFDSCxLQUhNLE1BR0EsSUFBSXZFLFFBQUosRUFBYztBQUNqQnNFLE1BQUFBLFdBQVcsR0FBR25FLGVBQWUsQ0FBQ3VFLDRCQUE5QjtBQUNBSCxNQUFBQSxXQUFXLEdBQUcsUUFBZDtBQUNIOztBQUVELFFBQU1JLGtCQUFrQixHQUFHeEUsZUFBZSxDQUFDeUUseUJBQTNDO0FBQ0E3RCxJQUFBQSxXQUFXLENBQUN4QixXQUFaLDhCQUE2Q2dGLFdBQTdDLDZCQUEwRUksa0JBQTFFLGVBQWlHTCxXQUFqRyxzQkF0QnlFLENBd0J6RTs7QUFDQSxRQUFNTyxzQkFBc0IsR0FBRzFFLGVBQWUsQ0FBQzJFLDZCQUEvQztBQUNBL0QsSUFBQUEsV0FBVyxDQUFDc0QsSUFBWixDQUFpQlUsSUFBakIsQ0FBc0I7QUFDbEJDLE1BQUFBLElBQUksRUFBRUgsc0JBRFk7QUFFbEJJLE1BQUFBLFVBQVUsRUFBRTtBQUZNLEtBQXRCOztBQUtBLFFBQUluRixPQUFKLEVBQWE7QUFDVCxVQUFNb0YsU0FBUyxHQUFHL0UsZUFBZSxDQUFDZ0YsT0FBbEM7QUFDQXBFLE1BQUFBLFdBQVcsQ0FBQ3NELElBQVosQ0FBaUJVLElBQWpCLENBQXNCO0FBQ2xCQyxRQUFBQSxJQUFJLEVBQUVFLFNBRFk7QUFFbEJELFFBQUFBLFVBQVUsRUFBRWYsUUFBUSxDQUFDeEM7QUFGSCxPQUF0QjtBQUlIOztBQUVELFFBQUkxQixRQUFKLEVBQWM7QUFDVixVQUFNb0YsVUFBVSxHQUFHakYsZUFBZSxDQUFDa0YsUUFBbkM7QUFDQXRFLE1BQUFBLFdBQVcsQ0FBQ3NELElBQVosQ0FBaUJVLElBQWpCLENBQXNCO0FBQ2xCQyxRQUFBQSxJQUFJLEVBQUVJLFVBRFk7QUFFbEJILFFBQUFBLFVBQVUsRUFBRWYsUUFBUSxDQUFDdEM7QUFGSCxPQUF0QjtBQUlILEtBN0N3RSxDQStDekU7OztBQUNBLFFBQUksQ0FBQzlCLE9BQUQsSUFBWSxDQUFDRSxRQUFqQixFQUEyQjtBQUN2QixVQUFNc0YsaUJBQWlCLEdBQUduRixlQUFlLENBQUNvRix1QkFBMUM7QUFDQXhFLE1BQUFBLFdBQVcsQ0FBQ3NELElBQVosQ0FBaUJVLElBQWpCLENBQXNCO0FBQ2xCQyxRQUFBQSxJQUFJLEVBQUVNLGlCQURZO0FBRWxCTCxRQUFBQSxVQUFVLEVBQUU7QUFGTSxPQUF0Qjs7QUFLQSxVQUFJLENBQUNuRixPQUFMLEVBQWM7QUFDVixZQUFNMEYsZUFBZSxHQUFHckYsZUFBZSxDQUFDc0Ysc0JBQXhDO0FBQ0ExRSxRQUFBQSxXQUFXLENBQUNzRCxJQUFaLENBQWlCVSxJQUFqQixXQUF5QlMsZUFBekIsZUFBNkN0QixRQUFRLENBQUN4QyxJQUF0RDtBQUNIOztBQUNELFVBQUksQ0FBQzFCLFFBQUwsRUFBZTtBQUNYLFlBQU0wRixnQkFBZ0IsR0FBR3ZGLGVBQWUsQ0FBQ3dGLHVCQUF6QztBQUNBNUUsUUFBQUEsV0FBVyxDQUFDc0QsSUFBWixDQUFpQlUsSUFBakIsV0FBeUJXLGdCQUF6QixlQUE4Q3hCLFFBQVEsQ0FBQ3RDLEtBQXZEO0FBQ0g7QUFDSixLQS9Ed0UsQ0FpRXpFOzs7QUFDQSxRQUFJMUIsUUFBSixFQUFjO0FBQ1ZhLE1BQUFBLFdBQVcsQ0FBQzZFLE9BQVosR0FBc0I7QUFDbEJ6QixRQUFBQSxNQUFNLEVBQUVoRSxlQUFlLENBQUMwRixpQ0FETjtBQUVsQkMsUUFBQUEsSUFBSSxFQUFFM0YsZUFBZSxDQUFDNEY7QUFGSixPQUF0QjtBQUlIOztBQUVELFdBQU9oRixXQUFQO0FBQ0gsR0FuV3lCOztBQXFXMUI7QUFDSjtBQUNBO0FBQ0lwRCxFQUFBQSxxQkF4VzBCLG1DQXdXRjtBQUNwQjtBQUNBLFFBQU1xSSxVQUFVLEdBQUdsSSxDQUFDLENBQUMsb0NBQUQsQ0FBcEIsQ0FGb0IsQ0FJcEI7O0FBQ0FrSSxJQUFBQSxVQUFVLENBQUNDLEVBQVgsQ0FBYyxVQUFkLEVBQTBCLHFDQUExQixFQUFpRSxVQUFDQyxDQUFELEVBQU87QUFDcEUsVUFBTXpHLEVBQUUsR0FBRzNCLENBQUMsQ0FBQ29JLENBQUMsQ0FBQ0MsTUFBSCxDQUFELENBQVlDLE9BQVosQ0FBb0IsSUFBcEIsRUFBMEJDLElBQTFCLENBQStCLFNBQS9CLENBQVg7O0FBQ0EsVUFBSTVHLEVBQUosRUFBUTtBQUNKQyxRQUFBQSxNQUFNLENBQUM0RyxRQUFQLGFBQXFCakcsYUFBckIsc0NBQThEWixFQUE5RDtBQUNIO0FBQ0osS0FMRCxFQUxvQixDQVlwQjs7QUFDQXVHLElBQUFBLFVBQVUsQ0FBQ0MsRUFBWCxDQUFjLE9BQWQsRUFBdUIsUUFBdkIsRUFBaUMsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3BDQSxNQUFBQSxDQUFDLENBQUNLLGNBQUY7QUFDQSxVQUFNOUcsRUFBRSxHQUFHM0IsQ0FBQyxDQUFDb0ksQ0FBQyxDQUFDTSxhQUFILENBQUQsQ0FBbUJILElBQW5CLENBQXdCLFlBQXhCLENBQVg7O0FBRUEsVUFBSTVHLEVBQUosRUFBUTtBQUNKO0FBQ0FDLFFBQUFBLE1BQU0sQ0FBQzRHLFFBQVAsYUFBcUJqRyxhQUFyQixrREFBMEVaLEVBQTFFO0FBQ0g7QUFDSixLQVJELEVBYm9CLENBdUJwQjs7QUFDQXVHLElBQUFBLFVBQVUsQ0FBQ0MsRUFBWCxDQUFjLE9BQWQsRUFBdUIsMkJBQXZCLEVBQW9ELFVBQVNDLENBQVQsRUFBWTtBQUM1REEsTUFBQUEsQ0FBQyxDQUFDSyxjQUFGLEdBRDRELENBRTVEO0FBQ0gsS0FIRCxFQXhCb0IsQ0E2QnBCO0FBQ0E7O0FBQ0FQLElBQUFBLFVBQVUsQ0FBQ0MsRUFBWCxDQUFjLE9BQWQsRUFBdUIsaUNBQXZCLEVBQTBELFVBQVNDLENBQVQsRUFBWTtBQUNsRUEsTUFBQUEsQ0FBQyxDQUFDSyxjQUFGO0FBQ0EsVUFBTUUsT0FBTyxHQUFHM0ksQ0FBQyxDQUFDLElBQUQsQ0FBakI7QUFDQSxVQUFNMkIsRUFBRSxHQUFHZ0gsT0FBTyxDQUFDSixJQUFSLENBQWEsWUFBYixDQUFYOztBQUVBLFVBQUk1RyxFQUFKLEVBQVE7QUFDSmdILFFBQUFBLE9BQU8sQ0FBQ0MsUUFBUixDQUFpQixrQkFBakI7QUFDQTFJLFFBQUFBLG1CQUFtQixDQUFDMkksWUFBcEIsQ0FBaUNsSCxFQUFqQyxFQUFxQyxVQUFDdkIsUUFBRCxFQUFjO0FBQy9DLGNBQUlBLFFBQVEsSUFBSUEsUUFBUSxDQUFDQyxNQUFULEtBQW9CLElBQXBDLEVBQTBDO0FBQ3RDO0FBQ0F1QixZQUFBQSxNQUFNLENBQUM0RyxRQUFQLENBQWdCTSxJQUFoQixhQUEwQnZHLGFBQTFCO0FBQ0gsV0FIRCxNQUdPO0FBQ0h3RyxZQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEIsQ0FBQTVJLFFBQVEsU0FBUixJQUFBQSxRQUFRLFdBQVIsWUFBQUEsUUFBUSxDQUFFNkksUUFBVixLQUFzQjVHLGVBQWUsQ0FBQzZHLHVCQUFsRTtBQUNBUCxZQUFBQSxPQUFPLENBQUNRLFdBQVIsQ0FBb0Isa0JBQXBCLEVBRkcsQ0FHSDs7QUFDQVIsWUFBQUEsT0FBTyxDQUFDQyxRQUFSLENBQWlCLGtCQUFqQjtBQUNBRCxZQUFBQSxPQUFPLENBQUNTLElBQVIsQ0FBYSxHQUFiLEVBQWtCRCxXQUFsQixDQUE4QixPQUE5QixFQUF1Q1AsUUFBdkMsQ0FBZ0QsT0FBaEQ7QUFDSDtBQUNKLFNBWEQ7QUFZSDtBQUNKLEtBcEJEO0FBcUJILEdBNVp5Qjs7QUE4WjFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lTLEVBQUFBLFlBbGEwQix3QkFrYWI3SSxJQWxhYSxFQWthUCxDQUNmO0FBQ0g7QUFwYXlCLENBQTlCO0FBdWFBO0FBQ0E7QUFDQTs7QUFDQVIsQ0FBQyxDQUFDc0osUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjdKLEVBQUFBLHFCQUFxQixDQUFDRSxVQUF0QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBBc3Rlcmlza01hbmFnZXJzQVBJLCBTZWN1cml0eVV0aWxzLCBQYnhEYXRhVGFibGVJbmRleCwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBPYmplY3QgZm9yIG1hbmFnaW5nIEFzdGVyaXNrIG1hbmFnZXJzIHRhYmxlIHVzaW5nIFBieERhdGFUYWJsZUluZGV4XG4gKlxuICogQG1vZHVsZSBhc3Rlcmlza01hbmFnZXJzSW5kZXhcbiAqL1xuY29uc3QgYXN0ZXJpc2tNYW5hZ2Vyc0luZGV4ID0ge1xuICAgIC8qKlxuICAgICAqIERhdGFUYWJsZSBpbnN0YW5jZSBmcm9tIGJhc2UgY2xhc3NcbiAgICAgKi9cbiAgICBkYXRhVGFibGVJbnN0YW5jZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG9iamVjdFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZXZlbnQgaGFuZGxlcnMgb25jZSAodXNpbmcgZGVsZWdhdGlvbilcbiAgICAgICAgdGhpcy5pbml0aWFsaXplVGFibGVFdmVudHMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIEFzdGVyaXNrIG1hbmFnZXJzIHRhYmxlIHdpdGggUkVTVCBBUElcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSB1c2luZyBjdXN0b20gdGFibGUgcmVuZGVyaW5nXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgLy8gTG9hZCBkYXRhIGFuZCByZW5kZXIgY3VzdG9tIHRhYmxlXG4gICAgICAgIHRoaXMubG9hZEFuZFJlbmRlclRhYmxlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZGF0YSBhbmQgcmVuZGVyIGN1c3RvbSB0YWJsZVxuICAgICAqL1xuICAgIGxvYWRBbmRSZW5kZXJUYWJsZSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICQoJyNhc3Rlcmlzay1tYW5hZ2Vycy10YWJsZS1jb250YWluZXInKS5odG1sKCc8ZGl2IGNsYXNzPVwidWkgYWN0aXZlIGNlbnRlcmVkIGlubGluZSBsb2FkZXJcIj48L2Rpdj4nKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZGF0YSBmcm9tIEFQSVxuICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmdldExpc3QoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgdGFibGUgY29udGFpbmVyIGFuZCBhZGQgYnV0dG9uLCBzaG93IHBsYWNlaG9sZGVyXG4gICAgICAgICAgICAgICAgICAgICQoJyNhc3Rlcmlzay1tYW5hZ2Vycy10YWJsZS1jb250YWluZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICQoJy5hZGQtbmV3LWJ1dHRvbicpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJykuc2hvdygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIHRhYmxlIGNvbnRhaW5lciBhbmQgYWRkIGJ1dHRvbiwgaGlkZSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICAgICAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICQoJy5hZGQtbmV3LWJ1dHRvbicpLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2FzdGVyaXNrLW1hbmFnZXJzLXRhYmxlLWNvbnRhaW5lcicpLnNob3coKTtcblxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclBlcm1pc3Npb25zVGFibGUocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjYXN0ZXJpc2stbWFuYWdlcnMtdGFibGUtY29udGFpbmVyJykuaHRtbCgnPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2VcIj5GYWlsZWQgdG8gbG9hZCBkYXRhPC9kaXY+Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTsgLy8gRG9uJ3QgdXNlIGNhY2hlIGZvciBub3dcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciBjdXN0b20gcGVybWlzc2lvbnMgdGFibGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBtYW5hZ2VycyAtIEFycmF5IG9mIG1hbmFnZXIgb2JqZWN0c1xuICAgICAqL1xuICAgIHJlbmRlclBlcm1pc3Npb25zVGFibGUobWFuYWdlcnMpIHtcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSBbJ2NhbGwnLCAnY2RyJywgJ29yaWdpbmF0ZScsICdyZXBvcnRpbmcnLCAnYWdlbnQnLCAnY29uZmlnJywgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2RpYWxwbGFuJywgJ2R0bWYnLCAnbG9nJywgJ3N5c3RlbScsICd1c2VyJywgJ3ZlcmJvc2UnLCAnY29tbWFuZCddO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGxldCB0YWJsZUh0bWwgPSBgXG4gICAgICAgICAgICA8dGFibGUgY2xhc3M9XCJ1aSBzZWxlY3RhYmxlIHZlcnkgYmFzaWMgY29tcGFjdCB1bnN0YWNrYWJsZSB0YWJsZVwiIGlkPVwiYXN0ZXJpc2stbWFuYWdlcnMtdGFibGVcIj5cbiAgICAgICAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0aD48L3RoPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtwZXJtaXNzaW9ucy5tYXAocGVybSA9PiBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRoIHdpZHRoPVwiMjBweFwiIGNsYXNzPVwicGVybWlzc2lvbi1jYXRlZ29yeSBoaWRlLW9uLW1vYmlsZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2PjxzcGFuPiR7cGVybX08L3NwYW4+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90aD5cbiAgICAgICAgICAgICAgICAgICAgICAgIGApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgICAgICAgICAgPHRoPjwvdGg+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgPC90aGVhZD5cbiAgICAgICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW5kZXIgcm93c1xuICAgICAgICBtYW5hZ2Vycy5mb3JFYWNoKG1hbmFnZXIgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVhZFBlcm1zID0gbWFuYWdlci5yZWFkUGVybWlzc2lvbnNTdW1tYXJ5IHx8ICcnO1xuICAgICAgICAgICAgY29uc3Qgd3JpdGVQZXJtcyA9IG1hbmFnZXIud3JpdGVQZXJtaXNzaW9uc1N1bW1hcnkgfHwgJyc7XG5cbiAgICAgICAgICAgIC8vIEZvcm1hdCBkZXNjcmlwdGlvbiBsaWtlIGluIEZpcmV3YWxsXG4gICAgICAgICAgICBjb25zdCBkZXNjcmlwdGlvbiA9IG1hbmFnZXIuZGVzY3JpcHRpb24gfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBkZXNjcmlwdGlvblRleHQgPSBkZXNjcmlwdGlvbiA/IGAgLSAke2Rlc2NyaXB0aW9ufWAgOiAnJztcblxuICAgICAgICAgICAgdGFibGVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8dHIgY2xhc3M9XCJtYW5hZ2VyLXJvd1wiIGRhdGEtaWQ9XCIke21hbmFnZXIuaWR9XCI+XG4gICAgICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiYmx1ZSBhc3RlcmlzayBpY29uXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke3dpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwobWFuYWdlci51c2VybmFtZSl9PC9zdHJvbmc+JHt3aW5kb3cuU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRlc2NyaXB0aW9uVGV4dCl9XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgcGVybWlzc2lvbiBjZWxscyAtIHNob3cgY2hlY2ttYXJrIGlmIGhhcyBhbnkgcGVybWlzc2lvbiAocmVhZCBvciB3cml0ZSlcbiAgICAgICAgICAgIHBlcm1pc3Npb25zLmZvckVhY2gocGVybSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFzUmVhZCA9IHJlYWRQZXJtcyA9PT0gJ2FsbCcgfHwgcmVhZFBlcm1zLmluY2x1ZGVzKHBlcm0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc1dyaXRlID0gd3JpdGVQZXJtcyA9PT0gJ2FsbCcgfHwgd3JpdGVQZXJtcy5pbmNsdWRlcyhwZXJtKTtcbiAgICAgICAgICAgICAgICBjb25zdCBoYXNQZXJtaXNzaW9uID0gaGFzUmVhZCB8fCBoYXNXcml0ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoaGFzUGVybWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZGF0YSBhdHRyaWJ1dGVzIGZvciBkeW5hbWljIHRvb2x0aXAgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgICAgICAgdGFibGVIdG1sICs9IGA8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCBwZXJtaXNzaW9uLWNlbGwgaGlkZS1vbi1tb2JpbGVcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtbWFuYWdlcj1cIiR7d2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChtYW5hZ2VyLnVzZXJuYW1lKX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wZXJtaXNzaW9uPVwiJHtwZXJtfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWlzLXN5c3RlbT1cIiR7bWFuYWdlci5pc1N5c3RlbX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1oYXMtcmVhZD1cIiR7aGFzUmVhZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1oYXMtd3JpdGU9XCIke2hhc1dyaXRlfVwiPmA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgdGV4dCBsYWJlbHMgd2l0aCBjb2xvcnMgKG5vIGlubGluZSB0b29sdGlwIGRhdGEpXG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNSZWFkICYmIGhhc1dyaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGdWxsIGFjY2VzcyAoYm90aCByZWFkIGFuZCB3cml0ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlSHRtbCArPSAnPHNwYW4gY2xhc3M9XCJ1aSBncmVlbiB0ZXh0XCI+PHN0cm9uZz5SVzwvc3Ryb25nPjwvc3Bhbj4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhhc1JlYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlYWQgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgdGFibGVIdG1sICs9ICc8c3BhbiBjbGFzcz1cInVpIGJsdWUgdGV4dFwiPjxzdHJvbmc+Ujwvc3Ryb25nPjwvc3Bhbj4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhhc1dyaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBXcml0ZSBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZUh0bWwgKz0gJzxzcGFuIGNsYXNzPVwidWkgb3JhbmdlIHRleHRcIj48c3Ryb25nPlc8L3N0cm9uZz48L3NwYW4+JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE5vIHBlcm1pc3Npb24gLSBlbXB0eSBjZWxsIHdpdGhvdXQgdG9vbHRpcFxuICAgICAgICAgICAgICAgICAgICB0YWJsZUh0bWwgKz0gJzx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkIHBlcm1pc3Npb24tY2VsbCBoaWRlLW9uLW1vYmlsZVwiPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRhYmxlSHRtbCArPSAnPC90ZD4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBhY3Rpb24gYnV0dG9uc1xuICAgICAgICAgICAgdGFibGVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRpbnkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+XG4gICAgICAgICAgICBgO1xuXG4gICAgICAgICAgICBpZiAobWFuYWdlci5pc1N5c3RlbSkge1xuICAgICAgICAgICAgICAgIC8vIFN5c3RlbSBtYW5hZ2VycyBjYW5ub3QgYmUgZWRpdGVkIC0gc2hvdyBsb2NrIGljb24gd2l0aCB0b29sdGlwXG4gICAgICAgICAgICAgICAgdGFibGVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGJ1dHRvbiBkaXNhYmxlZCBwb3B1cGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5hbV9TeXN0ZW1NYW5hZ2VyQ2Fubm90QmVFZGl0ZWQgfHwgJ1N5c3RlbSBtYW5hZ2VyIGNhbm5vdCBiZSBlZGl0ZWQnfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGxvY2sgeWVsbG93XCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0YWJsZUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLW1hbmFnZXJzL21vZGlmeS8ke21hbmFnZXIuaWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZWRpdCBwb3B1cGVkXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZWRpdCBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgZGF0YS12YWx1ZT1cIiR7bWFuYWdlci5pZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBjb3B5IHBvcHVwZWRcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBjb3B5IG91dGxpbmUgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIGRhdGEtdmFsdWU9XCIke21hbmFnZXIuaWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlIHR3by1zdGVwcy1kZWxldGUgcG9wdXBlZFwiIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEZWxldGV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgYDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGFibGVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgYDtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICB0YWJsZUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgICAgICA8L3RhYmxlPlxuICAgICAgICBgO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVuZGVyIHRhYmxlXG4gICAgICAgICQoJyNhc3Rlcmlzay1tYW5hZ2Vycy10YWJsZS1jb250YWluZXInKS5odG1sKHRhYmxlSHRtbCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGR5bmFtaWNhbGx5IGxpa2UgaW4gRmlyZXdhbGxcbiAgICAgICAgdGhpcy5pbml0aWFsaXplUGVybWlzc2lvblRvb2x0aXBzKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHBlcm1pc3Npb24gdG9vbHRpcHMgZHluYW1pY2FsbHlcbiAgICAgKi9cbiAgICBpbml0aWFsaXplUGVybWlzc2lvblRvb2x0aXBzKCkge1xuICAgICAgICBjb25zdCBwZXJtaXNzaW9uRGVzY3JpcHRpb25zID0gdGhpcy5nZXRQZXJtaXNzaW9uRGVzY3JpcHRpb25zKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBhbGwgcGVybWlzc2lvbiBjZWxsc1xuICAgICAgICAkKCcucGVybWlzc2lvbi1jZWxsW2RhdGEtbWFuYWdlcl0nKS5lYWNoKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgJGNlbGwgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgbWFuYWdlciA9ICRjZWxsLmRhdGEoJ21hbmFnZXInKTtcbiAgICAgICAgICAgIGNvbnN0IHBlcm1pc3Npb24gPSAkY2VsbC5kYXRhKCdwZXJtaXNzaW9uJyk7XG4gICAgICAgICAgICBjb25zdCBpc1N5c3RlbSA9ICRjZWxsLmRhdGEoJ2lzLXN5c3RlbScpO1xuICAgICAgICAgICAgY29uc3QgaGFzUmVhZCA9ICRjZWxsLmRhdGEoJ2hhcy1yZWFkJyk7XG4gICAgICAgICAgICBjb25zdCBoYXNXcml0ZSA9ICRjZWxsLmRhdGEoJ2hhcy13cml0ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobWFuYWdlciAmJiBwZXJtaXNzaW9uICYmIHBlcm1pc3Npb25EZXNjcmlwdGlvbnNbcGVybWlzc2lvbl0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sdGlwRGF0YSA9IGFzdGVyaXNrTWFuYWdlcnNJbmRleC5idWlsZFRvb2x0aXBEYXRhKFxuICAgICAgICAgICAgICAgICAgICBtYW5hZ2VyLCBwZXJtaXNzaW9uLCBpc1N5c3RlbSwgaGFzUmVhZCwgaGFzV3JpdGUsIHBlcm1pc3Npb25EZXNjcmlwdGlvbnNbcGVybWlzc2lvbl1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb250ZW50ID0gVG9vbHRpcEJ1aWxkZXIuYnVpbGRDb250ZW50KHRvb2x0aXBEYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBcbiAgICAgICAgICAgICAgICAkY2VsbC5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IHRvb2x0aXBDb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBjZW50ZXInLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcGVybWlzc2lvbiBkZXNjcmlwdGlvbnMgb2JqZWN0XG4gICAgICovXG4gICAgZ2V0UGVybWlzc2lvbkRlc2NyaXB0aW9ucygpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNhbGw6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jYWxsX3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2NhbGxfd3JpdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjZHI6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jZHJfcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY2RyX3dyaXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb3JpZ2luYXRlOiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfb3JpZ2luYXRlX3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX29yaWdpbmF0ZV93cml0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlcG9ydGluZzoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3JlcG9ydGluZ19yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9yZXBvcnRpbmdfd3JpdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZ2VudDoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2FnZW50X3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2FnZW50X3dyaXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29uZmlnOiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY29uZmlnX3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2NvbmZpZ193cml0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGRpYWxwbGFuOiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfZGlhbHBsYW5fcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfZGlhbHBsYW5fd3JpdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkdG1mOiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfZHRtZl9yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9kdG1mX3dyaXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbG9nOiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfbG9nX3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2xvZ193cml0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN5c3RlbToge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3N5c3RlbV9yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9zeXN0ZW1fd3JpdGVcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VyOiB7XG4gICAgICAgICAgICAgICAgcmVhZDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfdXNlcl9yZWFkLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF91c2VyX3dyaXRlXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdmVyYm9zZToge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3ZlcmJvc2VfcmVhZCxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfdmVyYm9zZV93cml0ZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbW1hbmQ6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jb21tYW5kX3JlYWQsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2NvbW1hbmRfd3JpdGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRvb2x0aXAgZGF0YSBzdHJ1Y3R1cmVcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBEYXRhKG1hbmFnZXIsIHBlcm1pc3Npb24sIGlzU3lzdGVtLCBoYXNSZWFkLCBoYXNXcml0ZSwgcGVybURlc2MpIHtcbiAgICAgICAgY29uc3QgdG9vbHRpcERhdGEgPSB7XG4gICAgICAgICAgICBoZWFkZXI6IGAke21hbmFnZXJ9IC0gJHtwZXJtaXNzaW9uLnRvVXBwZXJDYXNlKCl9YCxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBudWxsLFxuICAgICAgICAgICAgbGlzdDogW11cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBjdXJyZW50IGFjY2VzcyBsZXZlbFxuICAgICAgICBsZXQgYWNjZXNzTGV2ZWwgPSAnJztcbiAgICAgICAgbGV0IGFjY2Vzc0NvbG9yID0gJyc7XG4gICAgICAgIGlmIChoYXNSZWFkICYmIGhhc1dyaXRlKSB7XG4gICAgICAgICAgICBhY2Nlc3NMZXZlbCA9IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2FjY2Vzc19yZWFkX3dyaXRlO1xuICAgICAgICAgICAgYWNjZXNzQ29sb3IgPSAnZ3JlZW4nO1xuICAgICAgICB9IGVsc2UgaWYgKGhhc1JlYWQpIHtcbiAgICAgICAgICAgIGFjY2Vzc0xldmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfYWNjZXNzX3JlYWRfb25seTtcbiAgICAgICAgICAgIGFjY2Vzc0NvbG9yID0gJ2JsdWUnO1xuICAgICAgICB9IGVsc2UgaWYgKGhhc1dyaXRlKSB7XG4gICAgICAgICAgICBhY2Nlc3NMZXZlbCA9IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2FjY2Vzc193cml0ZV9vbmx5O1xuICAgICAgICAgICAgYWNjZXNzQ29sb3IgPSAnb3JhbmdlJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudEFjY2Vzc0xhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY3VycmVudF9hY2Nlc3M7XG4gICAgICAgIHRvb2x0aXBEYXRhLmRlc2NyaXB0aW9uID0gYDxzcGFuIGNsYXNzPVwidWkgJHthY2Nlc3NDb2xvcn0gdGV4dFwiPjxzdHJvbmc+JHtjdXJyZW50QWNjZXNzTGFiZWx9OiAke2FjY2Vzc0xldmVsfTwvc3Ryb25nPjwvc3Bhbj5gO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHBlcm1pc3Npb24gZGV0YWlsc1xuICAgICAgICBjb25zdCBhbGxvd2VkT3BlcmF0aW9uc0xhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfYWxsb3dlZF9vcGVyYXRpb25zO1xuICAgICAgICB0b29sdGlwRGF0YS5saXN0LnB1c2goe1xuICAgICAgICAgICAgdGVybTogYWxsb3dlZE9wZXJhdGlvbnNMYWJlbCxcbiAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaGFzUmVhZCkge1xuICAgICAgICAgICAgY29uc3QgcmVhZExhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX1JlYWQ7XG4gICAgICAgICAgICB0b29sdGlwRGF0YS5saXN0LnB1c2goe1xuICAgICAgICAgICAgICAgIHRlcm06IHJlYWRMYWJlbCxcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBwZXJtRGVzYy5yZWFkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGhhc1dyaXRlKSB7XG4gICAgICAgICAgICBjb25zdCB3cml0ZUxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX1dyaXRlO1xuICAgICAgICAgICAgdG9vbHRpcERhdGEubGlzdC5wdXNoKHtcbiAgICAgICAgICAgICAgICB0ZXJtOiB3cml0ZUxhYmVsLFxuICAgICAgICAgICAgICAgIGRlZmluaXRpb246IHBlcm1EZXNjLndyaXRlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHJlc3RyaWN0aW9ucyBpZiBhbnlcbiAgICAgICAgaWYgKCFoYXNSZWFkIHx8ICFoYXNXcml0ZSkge1xuICAgICAgICAgICAgY29uc3QgcmVzdHJpY3Rpb25zTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9yZXN0cmljdGlvbnM7XG4gICAgICAgICAgICB0b29sdGlwRGF0YS5saXN0LnB1c2goe1xuICAgICAgICAgICAgICAgIHRlcm06IHJlc3RyaWN0aW9uc0xhYmVsLFxuICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIWhhc1JlYWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYW5ub3RSZWFkTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jYW5ub3RfcmVhZDtcbiAgICAgICAgICAgICAgICB0b29sdGlwRGF0YS5saXN0LnB1c2goYCR7Y2Fubm90UmVhZExhYmVsfTogJHtwZXJtRGVzYy5yZWFkfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFoYXNXcml0ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhbm5vdFdyaXRlTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jYW5ub3Rfd3JpdGU7XG4gICAgICAgICAgICAgICAgdG9vbHRpcERhdGEubGlzdC5wdXNoKGAke2Nhbm5vdFdyaXRlTGFiZWx9OiAke3Blcm1EZXNjLndyaXRlfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgc3lzdGVtIG1hbmFnZXIgd2FybmluZyBpZiBhcHBsaWNhYmxlXG4gICAgICAgIGlmIChpc1N5c3RlbSkge1xuICAgICAgICAgICAgdG9vbHRpcERhdGEud2FybmluZyA9IHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3N5c3RlbV9tYW5hZ2VyX3dhcm5pbmcsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfc3lzdGVtX21hbmFnZXJfd2FybmluZ190ZXh0XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdG9vbHRpcERhdGE7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRhYmxlIGV2ZW50IGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRhYmxlRXZlbnRzKCkge1xuICAgICAgICAvLyBVc2UgZXZlbnQgZGVsZWdhdGlvbiBmb3IgZHluYW1pY2FsbHkgZ2VuZXJhdGVkIGNvbnRlbnRcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICQoJyNhc3Rlcmlzay1tYW5hZ2Vycy10YWJsZS1jb250YWluZXInKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERvdWJsZSBjbGljayB0byBlZGl0IChleGNsdWRlIGFjdGlvbiBidXR0b25zIGNvbHVtbilcbiAgICAgICAgJGNvbnRhaW5lci5vbignZGJsY2xpY2snLCAnLm1hbmFnZXItcm93IHRkOm5vdCgucmlnaHQuYWxpZ25lZCknLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLmF0dHIoJ2RhdGEtaWQnKTtcbiAgICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvbW9kaWZ5LyR7aWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb3B5IGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgICRjb250YWluZXIub24oJ2NsaWNrJywgJ2EuY29weScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIG1vZGlmeSBwYWdlIHdpdGggY29weS1zb3VyY2UgcGFyYW1ldGVyXG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1hc3Rlcmlzay1tYW5hZ2Vycy9tb2RpZnk/Y29weS1zb3VyY2U9JHtpZH1gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIExldCBkZWxldGUtc29tZXRoaW5nLmpzIGhhbmRsZSB0aGUgZmlyc3QgY2xpY2ssIHdlIGp1c3QgcHJldmVudCBkZWZhdWx0IG5hdmlnYXRpb25cbiAgICAgICAgJGNvbnRhaW5lci5vbignY2xpY2snLCAnYS5kZWxldGUudHdvLXN0ZXBzLWRlbGV0ZScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIC8vIERvbid0IHN0b3AgcHJvcGFnYXRpb24gLSBhbGxvdyBkZWxldGUtc29tZXRoaW5nLmpzIHRvIHdvcmtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZWxldGUgYnV0dG9uIGhhbmRsZXIgLSB3b3JrcyB3aXRoIHR3by1zdGVwcy1kZWxldGUgbG9naWNcbiAgICAgICAgLy8gVGhpcyB3aWxsIGJlIHRyaWdnZXJlZCBhZnRlciBkZWxldGUtc29tZXRoaW5nLmpzIHJlbW92ZXMgdGhlIHR3by1zdGVwcy1kZWxldGUgY2xhc3NcbiAgICAgICAgJGNvbnRhaW5lci5vbignY2xpY2snLCAnYS5kZWxldGU6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGlkKSB7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIEFzdGVyaXNrTWFuYWdlcnNBUEkuZGVsZXRlUmVjb3JkKGlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVsb2FkIHRoZSBlbnRpcmUgcGFnZSB0byBlbnN1cmUgY2xlYW4gc3RhdGVcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYCR7Z2xvYmFsUm9vdFVybH1hc3Rlcmlzay1tYW5hZ2Vycy9pbmRleGA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2U/Lm1lc3NhZ2VzIHx8IGdsb2JhbFRyYW5zbGF0ZS5hbV9FcnJvckRlbGV0aW5nTWFuYWdlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXN0b3JlIHR3by1zdGVwcy1kZWxldGUgY2xhc3MgaWYgZGVsZXRpb24gZmFpbGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCd0d28tc3RlcHMtZGVsZXRlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkYnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygnY2xvc2UnKS5hZGRDbGFzcygndHJhc2gnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBkYXRhIC0gQXJyYXkgb2YgbWFuYWdlciBvYmplY3RzXG4gICAgICovXG4gICAgb25EYXRhTG9hZGVkKGRhdGEpIHtcbiAgICAgICAgLy8gQWRkaXRpb25hbCBwcm9jZXNzaW5nIGFmdGVyIGRhdGEgbG9hZCBpZiBuZWVkZWRcbiAgICB9XG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgQXN0ZXJpc2sgTWFuYWdlcnMgdGFibGUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGFzdGVyaXNrTWFuYWdlcnNJbmRleC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==