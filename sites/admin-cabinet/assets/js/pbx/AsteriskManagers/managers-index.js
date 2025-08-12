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

    AsteriskManagersAPI.getList(function (data) {
      if (data && Array.isArray(data)) {
        if (data.length === 0) {
          // Hide the table container and add button, show placeholder
          $('#asterisk-managers-table-container').hide();
          $('.add-new-button').hide();
          $('#empty-table-placeholder').show();
        } else {
          // Show the table container and add button, hide placeholder
          $('#empty-table-placeholder').hide();
          $('.add-new-button').show();
          $('#asterisk-managers-table-container').show();

          _this.renderPermissionsTable(data);
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
        tableHtml += "\n                    <a href=\"".concat(globalRootUrl, "asterisk-managers/modify/").concat(manager.id, "\" \n                       class=\"ui button view popuped\" data-content=\"").concat(globalTranslate.bt_View || 'View', "\">\n                        <i class=\"icon eye blue\"></i>\n                    </a>\n                ");
      } else {
        tableHtml += "\n                    <a href=\"".concat(globalRootUrl, "asterisk-managers/modify/").concat(manager.id, "\" \n                       class=\"ui button edit popuped\" data-content=\"").concat(globalTranslate.bt_ToolTipEdit || 'Edit', "\">\n                        <i class=\"icon edit blue\"></i>\n                    </a>\n                    <a href=\"#\" data-value=\"").concat(manager.id, "\" \n                       class=\"ui button copy popuped\" data-content=\"").concat(globalTranslate.bt_ToolTipCopy || 'Copy', "\">\n                        <i class=\"icon copy outline blue\"></i>\n                    </a>\n                    <a href=\"#\" data-value=\"").concat(manager.id, "\" \n                       class=\"ui button delete two-steps-delete popuped\" data-content=\"").concat(globalTranslate.bt_ToolTipDelete || 'Delete', "\">\n                        <i class=\"icon trash red\"></i>\n                    </a>\n                ");
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
        read: globalTranslate.am_tooltip_call_read || 'View active calls and channel states',
        write: globalTranslate.am_tooltip_call_write || 'Hangup calls, transfer, park'
      },
      cdr: {
        read: globalTranslate.am_tooltip_cdr_read || 'Access call detail records',
        write: globalTranslate.am_tooltip_cdr_write || 'Modify CDR records'
      },
      originate: {
        read: globalTranslate.am_tooltip_originate_read || 'View origination status',
        write: globalTranslate.am_tooltip_originate_write || 'Create new calls, initiate outbound calls'
      },
      reporting: {
        read: globalTranslate.am_tooltip_reporting_read || 'Access system reports and statistics',
        write: globalTranslate.am_tooltip_reporting_write || 'Generate and export reports'
      },
      agent: {
        read: globalTranslate.am_tooltip_agent_read || 'View queue agents status',
        write: globalTranslate.am_tooltip_agent_write || 'Login/logout agents, pause/unpause'
      },
      config: {
        read: globalTranslate.am_tooltip_config_read || 'View configuration files',
        write: globalTranslate.am_tooltip_config_write || 'Modify system configuration, reload modules'
      },
      dialplan: {
        read: globalTranslate.am_tooltip_dialplan_read || 'View dialplan contexts and extensions',
        write: globalTranslate.am_tooltip_dialplan_write || 'Modify dialplan in real-time'
      },
      dtmf: {
        read: globalTranslate.am_tooltip_dtmf_read || 'Monitor DTMF events',
        write: globalTranslate.am_tooltip_dtmf_write || 'Send DTMF tones to channels'
      },
      log: {
        read: globalTranslate.am_tooltip_log_read || 'View system and application logs',
        write: globalTranslate.am_tooltip_log_write || 'Rotate logs, change log levels'
      },
      system: {
        read: globalTranslate.am_tooltip_system_read || 'View system status and information',
        write: globalTranslate.am_tooltip_system_write || 'Execute system commands, restart services'
      },
      user: {
        read: globalTranslate.am_tooltip_user_read || 'View user events and device states',
        write: globalTranslate.am_tooltip_user_write || 'Send user events, update device states'
      },
      verbose: {
        read: globalTranslate.am_tooltip_verbose_read || 'View verbose messages and debug output',
        write: globalTranslate.am_tooltip_verbose_write || 'Set verbose levels'
      },
      command: {
        read: globalTranslate.am_tooltip_command_read || 'View CLI command output',
        write: globalTranslate.am_tooltip_command_write || 'Execute Asterisk CLI commands'
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
      accessLevel = globalTranslate.am_tooltip_access_read_write || 'Read/Write';
      accessColor = 'green';
    } else if (hasRead) {
      accessLevel = globalTranslate.am_tooltip_access_read_only || 'Read Only';
      accessColor = 'blue';
    } else if (hasWrite) {
      accessLevel = globalTranslate.am_tooltip_access_write_only || 'Write Only';
      accessColor = 'orange';
    }

    var currentAccessLabel = globalTranslate.am_tooltip_current_access || 'Current Access';
    tooltipData.description = "<span class=\"ui ".concat(accessColor, " text\"><strong>").concat(currentAccessLabel, ": ").concat(accessLevel, "</strong></span>"); // Add permission details

    var allowedOperationsLabel = globalTranslate.am_tooltip_allowed_operations || 'Allowed Operations';
    tooltipData.list.push({
      term: allowedOperationsLabel,
      definition: null
    });

    if (hasRead) {
      var readLabel = globalTranslate.am_Read || 'Read';
      tooltipData.list.push({
        term: readLabel,
        definition: permDesc.read
      });
    }

    if (hasWrite) {
      var writeLabel = globalTranslate.am_Write || 'Write';
      tooltipData.list.push({
        term: writeLabel,
        definition: permDesc.write
      });
    } // Add restrictions if any


    if (!hasRead || !hasWrite) {
      var restrictionsLabel = globalTranslate.am_tooltip_restrictions || 'Restrictions';
      tooltipData.list.push({
        term: restrictionsLabel,
        definition: null
      });

      if (!hasRead) {
        var cannotReadLabel = globalTranslate.am_tooltip_cannot_read || 'Cannot read';
        tooltipData.list.push("".concat(cannotReadLabel, ": ").concat(permDesc.read));
      }

      if (!hasWrite) {
        var cannotWriteLabel = globalTranslate.am_tooltip_cannot_write || 'Cannot write';
        tooltipData.list.push("".concat(cannotWriteLabel, ": ").concat(permDesc.write));
      }
    } // Add system manager warning if applicable


    if (isSystem) {
      tooltipData.warning = {
        header: globalTranslate.am_tooltip_system_manager_warning || 'System Manager',
        text: globalTranslate.am_tooltip_system_manager_warning_text || 'This is a system manager account. Modifying permissions may affect system operations.'
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
            UserMessage.showMultiString((response === null || response === void 0 ? void 0 : response.messages) || globalTranslate.am_ErrorDeletingManager || 'Error deleting manager');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Bc3Rlcmlza01hbmFnZXJzL21hbmFnZXJzLWluZGV4LmpzIl0sIm5hbWVzIjpbImFzdGVyaXNrTWFuYWdlcnNJbmRleCIsImRhdGFUYWJsZUluc3RhbmNlIiwiaW5pdGlhbGl6ZSIsImluaXRpYWxpemVUYWJsZUV2ZW50cyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJsb2FkQW5kUmVuZGVyVGFibGUiLCIkIiwiaHRtbCIsIkFzdGVyaXNrTWFuYWdlcnNBUEkiLCJnZXRMaXN0IiwiZGF0YSIsIkFycmF5IiwiaXNBcnJheSIsImxlbmd0aCIsImhpZGUiLCJzaG93IiwicmVuZGVyUGVybWlzc2lvbnNUYWJsZSIsIm1hbmFnZXJzIiwicGVybWlzc2lvbnMiLCJ0YWJsZUh0bWwiLCJtYXAiLCJwZXJtIiwiam9pbiIsImZvckVhY2giLCJtYW5hZ2VyIiwicmVhZFBlcm1zIiwicmVhZFBlcm1pc3Npb25zU3VtbWFyeSIsIndyaXRlUGVybXMiLCJ3cml0ZVBlcm1pc3Npb25zU3VtbWFyeSIsInN5c3RlbUljb24iLCJpc1N5c3RlbSIsImRlc2NyaXB0aW9uIiwiZGVzY3JpcHRpb25UZXh0IiwiaWQiLCJ3aW5kb3ciLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsInVzZXJuYW1lIiwiaGFzUmVhZCIsImluY2x1ZGVzIiwiaGFzV3JpdGUiLCJoYXNQZXJtaXNzaW9uIiwiZ2xvYmFsUm9vdFVybCIsImdsb2JhbFRyYW5zbGF0ZSIsImJ0X1ZpZXciLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBDb3B5IiwiYnRfVG9vbFRpcERlbGV0ZSIsImluaXRpYWxpemVQZXJtaXNzaW9uVG9vbHRpcHMiLCJwZXJtaXNzaW9uRGVzY3JpcHRpb25zIiwiZ2V0UGVybWlzc2lvbkRlc2NyaXB0aW9ucyIsImVhY2giLCIkY2VsbCIsInBlcm1pc3Npb24iLCJ0b29sdGlwRGF0YSIsImJ1aWxkVG9vbHRpcERhdGEiLCJ0b29sdGlwQ29udGVudCIsIlRvb2x0aXBCdWlsZGVyIiwiYnVpbGRDb250ZW50IiwicG9wdXAiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5IiwidmFyaWF0aW9uIiwiY2FsbCIsInJlYWQiLCJhbV90b29sdGlwX2NhbGxfcmVhZCIsIndyaXRlIiwiYW1fdG9vbHRpcF9jYWxsX3dyaXRlIiwiY2RyIiwiYW1fdG9vbHRpcF9jZHJfcmVhZCIsImFtX3Rvb2x0aXBfY2RyX3dyaXRlIiwib3JpZ2luYXRlIiwiYW1fdG9vbHRpcF9vcmlnaW5hdGVfcmVhZCIsImFtX3Rvb2x0aXBfb3JpZ2luYXRlX3dyaXRlIiwicmVwb3J0aW5nIiwiYW1fdG9vbHRpcF9yZXBvcnRpbmdfcmVhZCIsImFtX3Rvb2x0aXBfcmVwb3J0aW5nX3dyaXRlIiwiYWdlbnQiLCJhbV90b29sdGlwX2FnZW50X3JlYWQiLCJhbV90b29sdGlwX2FnZW50X3dyaXRlIiwiY29uZmlnIiwiYW1fdG9vbHRpcF9jb25maWdfcmVhZCIsImFtX3Rvb2x0aXBfY29uZmlnX3dyaXRlIiwiZGlhbHBsYW4iLCJhbV90b29sdGlwX2RpYWxwbGFuX3JlYWQiLCJhbV90b29sdGlwX2RpYWxwbGFuX3dyaXRlIiwiZHRtZiIsImFtX3Rvb2x0aXBfZHRtZl9yZWFkIiwiYW1fdG9vbHRpcF9kdG1mX3dyaXRlIiwibG9nIiwiYW1fdG9vbHRpcF9sb2dfcmVhZCIsImFtX3Rvb2x0aXBfbG9nX3dyaXRlIiwic3lzdGVtIiwiYW1fdG9vbHRpcF9zeXN0ZW1fcmVhZCIsImFtX3Rvb2x0aXBfc3lzdGVtX3dyaXRlIiwidXNlciIsImFtX3Rvb2x0aXBfdXNlcl9yZWFkIiwiYW1fdG9vbHRpcF91c2VyX3dyaXRlIiwidmVyYm9zZSIsImFtX3Rvb2x0aXBfdmVyYm9zZV9yZWFkIiwiYW1fdG9vbHRpcF92ZXJib3NlX3dyaXRlIiwiY29tbWFuZCIsImFtX3Rvb2x0aXBfY29tbWFuZF9yZWFkIiwiYW1fdG9vbHRpcF9jb21tYW5kX3dyaXRlIiwicGVybURlc2MiLCJoZWFkZXIiLCJ0b1VwcGVyQ2FzZSIsImxpc3QiLCJhY2Nlc3NMZXZlbCIsImFjY2Vzc0NvbG9yIiwiYW1fdG9vbHRpcF9hY2Nlc3NfcmVhZF93cml0ZSIsImFtX3Rvb2x0aXBfYWNjZXNzX3JlYWRfb25seSIsImFtX3Rvb2x0aXBfYWNjZXNzX3dyaXRlX29ubHkiLCJjdXJyZW50QWNjZXNzTGFiZWwiLCJhbV90b29sdGlwX2N1cnJlbnRfYWNjZXNzIiwiYWxsb3dlZE9wZXJhdGlvbnNMYWJlbCIsImFtX3Rvb2x0aXBfYWxsb3dlZF9vcGVyYXRpb25zIiwicHVzaCIsInRlcm0iLCJkZWZpbml0aW9uIiwicmVhZExhYmVsIiwiYW1fUmVhZCIsIndyaXRlTGFiZWwiLCJhbV9Xcml0ZSIsInJlc3RyaWN0aW9uc0xhYmVsIiwiYW1fdG9vbHRpcF9yZXN0cmljdGlvbnMiLCJjYW5ub3RSZWFkTGFiZWwiLCJhbV90b29sdGlwX2Nhbm5vdF9yZWFkIiwiY2Fubm90V3JpdGVMYWJlbCIsImFtX3Rvb2x0aXBfY2Fubm90X3dyaXRlIiwid2FybmluZyIsImFtX3Rvb2x0aXBfc3lzdGVtX21hbmFnZXJfd2FybmluZyIsInRleHQiLCJhbV90b29sdGlwX3N5c3RlbV9tYW5hZ2VyX3dhcm5pbmdfdGV4dCIsIiRjb250YWluZXIiLCJvbiIsImUiLCJ0YXJnZXQiLCJjbG9zZXN0IiwiYXR0ciIsImxvY2F0aW9uIiwicHJldmVudERlZmF1bHQiLCJjdXJyZW50VGFyZ2V0IiwiJGJ1dHRvbiIsImFkZENsYXNzIiwiZGVsZXRlUmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJocmVmIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJtZXNzYWdlcyIsImFtX0Vycm9yRGVsZXRpbmdNYW5hZ2VyIiwicmVtb3ZlQ2xhc3MiLCJmaW5kIiwib25EYXRhTG9hZGVkIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QUF0QyxJQUFpRSx3QkFBN0Y7QUFDQVQsWUFBQUEsT0FBTyxDQUFDVSxXQUFSLENBQW9CLGtCQUFwQixFQUZHLENBR0g7O0FBQ0FWLFlBQUFBLE9BQU8sQ0FBQ0MsUUFBUixDQUFpQixrQkFBakI7QUFDQUQsWUFBQUEsT0FBTyxDQUFDVyxJQUFSLENBQWEsR0FBYixFQUFrQkQsV0FBbEIsQ0FBOEIsT0FBOUIsRUFBdUNULFFBQXZDLENBQWdELE9BQWhEO0FBQ0g7QUFDSixTQVhEO0FBWUg7QUFDSixLQXBCRDtBQXFCSCxHQTdaeUI7O0FBK1oxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJVyxFQUFBQSxZQW5hMEIsd0JBbWFibEosSUFuYWEsRUFtYVAsQ0FDZjtBQUNIO0FBcmF5QixDQUE5QjtBQXdhQTtBQUNBO0FBQ0E7O0FBQ0FKLENBQUMsQ0FBQ3VKLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEI5SixFQUFBQSxxQkFBcUIsQ0FBQ0UsVUFBdEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgQXN0ZXJpc2tNYW5hZ2Vyc0FQSSwgU2VjdXJpdHlVdGlscywgUGJ4RGF0YVRhYmxlSW5kZXgsIFRvb2x0aXBCdWlsZGVyICovXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBBc3RlcmlzayBtYW5hZ2VycyB0YWJsZSB1c2luZyBQYnhEYXRhVGFibGVJbmRleFxuICpcbiAqIEBtb2R1bGUgYXN0ZXJpc2tNYW5hZ2Vyc0luZGV4XG4gKi9cbmNvbnN0IGFzdGVyaXNrTWFuYWdlcnNJbmRleCA9IHtcbiAgICAvKipcbiAgICAgKiBEYXRhVGFibGUgaW5zdGFuY2UgZnJvbSBiYXNlIGNsYXNzXG4gICAgICovXG4gICAgZGF0YVRhYmxlSW5zdGFuY2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBvYmplY3RcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGV2ZW50IGhhbmRsZXJzIG9uY2UgKHVzaW5nIGRlbGVnYXRpb24pXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZVRhYmxlRXZlbnRzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBBc3RlcmlzayBtYW5hZ2VycyB0YWJsZSB3aXRoIFJFU1QgQVBJXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURhdGFUYWJsZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEYXRhVGFibGUgdXNpbmcgY3VzdG9tIHRhYmxlIHJlbmRlcmluZ1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIC8vIExvYWQgZGF0YSBhbmQgcmVuZGVyIGN1c3RvbSB0YWJsZVxuICAgICAgICB0aGlzLmxvYWRBbmRSZW5kZXJUYWJsZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGRhdGEgYW5kIHJlbmRlciBjdXN0b20gdGFibGVcbiAgICAgKi9cbiAgICBsb2FkQW5kUmVuZGVyVGFibGUoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkKCcjYXN0ZXJpc2stbWFuYWdlcnMtdGFibGUtY29udGFpbmVyJykuaHRtbCgnPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBjZW50ZXJlZCBpbmxpbmUgbG9hZGVyXCI+PC9kaXY+Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGRhdGEgZnJvbSBBUElcbiAgICAgICAgQXN0ZXJpc2tNYW5hZ2Vyc0FQSS5nZXRMaXN0KChkYXRhKSA9PiB7XG4gICAgICAgICAgICBpZiAoZGF0YSAmJiBBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIHRhYmxlIGNvbnRhaW5lciBhbmQgYWRkIGJ1dHRvbiwgc2hvdyBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAgICAgICAkKCcjYXN0ZXJpc2stbWFuYWdlcnMtdGFibGUtY29udGFpbmVyJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkKCcuYWRkLW5ldy1idXR0b24nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpLnNob3coKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSB0YWJsZSBjb250YWluZXIgYW5kIGFkZCBidXR0b24sIGhpZGUgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgICAgICAgJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAkKCcuYWRkLW5ldy1idXR0b24nKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICQoJyNhc3Rlcmlzay1tYW5hZ2Vycy10YWJsZS1jb250YWluZXInKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbmRlclBlcm1pc3Npb25zVGFibGUoZGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjYXN0ZXJpc2stbWFuYWdlcnMtdGFibGUtY29udGFpbmVyJykuaHRtbCgnPGRpdiBjbGFzcz1cInVpIGVycm9yIG1lc3NhZ2VcIj5GYWlsZWQgdG8gbG9hZCBkYXRhPC9kaXY+Jyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIGZhbHNlKTsgLy8gRG9uJ3QgdXNlIGNhY2hlIGZvciBub3dcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciBjdXN0b20gcGVybWlzc2lvbnMgdGFibGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBtYW5hZ2VycyAtIEFycmF5IG9mIG1hbmFnZXIgb2JqZWN0c1xuICAgICAqL1xuICAgIHJlbmRlclBlcm1pc3Npb25zVGFibGUobWFuYWdlcnMpIHtcbiAgICAgICAgY29uc3QgcGVybWlzc2lvbnMgPSBbJ2NhbGwnLCAnY2RyJywgJ29yaWdpbmF0ZScsICdyZXBvcnRpbmcnLCAnYWdlbnQnLCAnY29uZmlnJywgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2RpYWxwbGFuJywgJ2R0bWYnLCAnbG9nJywgJ3N5c3RlbScsICd1c2VyJywgJ3ZlcmJvc2UnLCAnY29tbWFuZCddO1xuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGxldCB0YWJsZUh0bWwgPSBgXG4gICAgICAgICAgICA8dGFibGUgY2xhc3M9XCJ1aSBzZWxlY3RhYmxlIHZlcnkgYmFzaWMgY29tcGFjdCB1bnN0YWNrYWJsZSB0YWJsZVwiIGlkPVwiYXN0ZXJpc2stbWFuYWdlcnMtdGFibGVcIj5cbiAgICAgICAgICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDx0aD48L3RoPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtwZXJtaXNzaW9ucy5tYXAocGVybSA9PiBgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHRoIHdpZHRoPVwiMjBweFwiIGNsYXNzPVwicGVybWlzc2lvbi1jYXRlZ29yeSBoaWRlLW9uLW1vYmlsZVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2PjxzcGFuPiR7cGVybX08L3NwYW4+PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC90aD5cbiAgICAgICAgICAgICAgICAgICAgICAgIGApLmpvaW4oJycpfVxuICAgICAgICAgICAgICAgICAgICAgICAgPHRoPjwvdGg+XG4gICAgICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICAgICAgPC90aGVhZD5cbiAgICAgICAgICAgICAgICA8dGJvZHk+XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW5kZXIgcm93c1xuICAgICAgICBtYW5hZ2Vycy5mb3JFYWNoKG1hbmFnZXIgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVhZFBlcm1zID0gbWFuYWdlci5yZWFkUGVybWlzc2lvbnNTdW1tYXJ5IHx8ICcnO1xuICAgICAgICAgICAgY29uc3Qgd3JpdGVQZXJtcyA9IG1hbmFnZXIud3JpdGVQZXJtaXNzaW9uc1N1bW1hcnkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCBzeXN0ZW1JY29uID0gbWFuYWdlci5pc1N5c3RlbSA/ICc8aSBjbGFzcz1cInllbGxvdyBsb2NrIGljb25cIj48L2k+ICcgOiAnJztcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9ybWF0IGRlc2NyaXB0aW9uIGxpa2UgaW4gRmlyZXdhbGxcbiAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gbWFuYWdlci5kZXNjcmlwdGlvbiB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uVGV4dCA9IGRlc2NyaXB0aW9uID8gYCAtICR7ZGVzY3JpcHRpb259YCA6ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0YWJsZUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgIDx0ciBjbGFzcz1cIm1hbmFnZXItcm93XCIgZGF0YS1pZD1cIiR7bWFuYWdlci5pZH1cIj5cbiAgICAgICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHtzeXN0ZW1JY29ufVxuICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJibHVlIGFzdGVyaXNrIGljb25cIj48L2k+IFxuICAgICAgICAgICAgICAgICAgICAgICAgPHN0cm9uZz4ke3dpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwobWFuYWdlci51c2VybmFtZSl9PC9zdHJvbmc+JHt3aW5kb3cuU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGRlc2NyaXB0aW9uVGV4dCl9XG4gICAgICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBZGQgcGVybWlzc2lvbiBjZWxscyAtIHNob3cgY2hlY2ttYXJrIGlmIGhhcyBhbnkgcGVybWlzc2lvbiAocmVhZCBvciB3cml0ZSlcbiAgICAgICAgICAgIHBlcm1pc3Npb25zLmZvckVhY2gocGVybSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGFzUmVhZCA9IHJlYWRQZXJtcyA9PT0gJ2FsbCcgfHwgcmVhZFBlcm1zLmluY2x1ZGVzKHBlcm0pO1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc1dyaXRlID0gd3JpdGVQZXJtcyA9PT0gJ2FsbCcgfHwgd3JpdGVQZXJtcy5pbmNsdWRlcyhwZXJtKTtcbiAgICAgICAgICAgICAgICBjb25zdCBoYXNQZXJtaXNzaW9uID0gaGFzUmVhZCB8fCBoYXNXcml0ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoaGFzUGVybWlzc2lvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBBZGQgZGF0YSBhdHRyaWJ1dGVzIGZvciBkeW5hbWljIHRvb2x0aXAgaW5pdGlhbGl6YXRpb25cbiAgICAgICAgICAgICAgICAgICAgdGFibGVIdG1sICs9IGA8dGQgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZCBwZXJtaXNzaW9uLWNlbGwgaGlkZS1vbi1tb2JpbGVcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtbWFuYWdlcj1cIiR7d2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChtYW5hZ2VyLnVzZXJuYW1lKX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1wZXJtaXNzaW9uPVwiJHtwZXJtfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWlzLXN5c3RlbT1cIiR7bWFuYWdlci5pc1N5c3RlbX1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1oYXMtcmVhZD1cIiR7aGFzUmVhZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1oYXMtd3JpdGU9XCIke2hhc1dyaXRlfVwiPmA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgdGV4dCBsYWJlbHMgd2l0aCBjb2xvcnMgKG5vIGlubGluZSB0b29sdGlwIGRhdGEpXG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNSZWFkICYmIGhhc1dyaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGdWxsIGFjY2VzcyAoYm90aCByZWFkIGFuZCB3cml0ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhYmxlSHRtbCArPSAnPHNwYW4gY2xhc3M9XCJ1aSBncmVlbiB0ZXh0XCI+PHN0cm9uZz5SVzwvc3Ryb25nPjwvc3Bhbj4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhhc1JlYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlYWQgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgdGFibGVIdG1sICs9ICc8c3BhbiBjbGFzcz1cInVpIGJsdWUgdGV4dFwiPjxzdHJvbmc+Ujwvc3Ryb25nPjwvc3Bhbj4nO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGhhc1dyaXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBXcml0ZSBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICB0YWJsZUh0bWwgKz0gJzxzcGFuIGNsYXNzPVwidWkgb3JhbmdlIHRleHRcIj48c3Ryb25nPlc8L3N0cm9uZz48L3NwYW4+JztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE5vIHBlcm1pc3Npb24gLSBlbXB0eSBjZWxsIHdpdGhvdXQgdG9vbHRpcFxuICAgICAgICAgICAgICAgICAgICB0YWJsZUh0bWwgKz0gJzx0ZCBjbGFzcz1cImNlbnRlciBhbGlnbmVkIHBlcm1pc3Npb24tY2VsbCBoaWRlLW9uLW1vYmlsZVwiPic7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHRhYmxlSHRtbCArPSAnPC90ZD4nO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBhY3Rpb24gYnV0dG9uc1xuICAgICAgICAgICAgdGFibGVIdG1sICs9IGBcbiAgICAgICAgICAgICAgICA8dGQgY2xhc3M9XCJyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmdcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIHRpbnkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+XG4gICAgICAgICAgICBgO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAobWFuYWdlci5pc1N5c3RlbSkge1xuICAgICAgICAgICAgICAgIHRhYmxlSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvbW9kaWZ5LyR7bWFuYWdlci5pZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gdmlldyBwb3B1cGVkXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVmlldyB8fCAnVmlldyd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZXllIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0YWJsZUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLW1hbmFnZXJzL21vZGlmeS8ke21hbmFnZXIuaWR9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGVkaXQgcG9wdXBlZFwiIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFZGl0IHx8ICdFZGl0J31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBkYXRhLXZhbHVlPVwiJHttYW5hZ2VyLmlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBjb3B5IHBvcHVwZWRcIiBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weSB8fCAnQ29weSd9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gY29weSBvdXRsaW5lIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBkYXRhLXZhbHVlPVwiJHttYW5hZ2VyLmlkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCIgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZSB8fCAnRGVsZXRlJ31cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICBgO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0YWJsZUh0bWwgKz0gYFxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgICBgO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHRhYmxlSHRtbCArPSBgXG4gICAgICAgICAgICAgICAgPC90Ym9keT5cbiAgICAgICAgICAgIDwvdGFibGU+XG4gICAgICAgIGA7XG4gICAgICAgIFxuICAgICAgICAvLyBSZW5kZXIgdGFibGVcbiAgICAgICAgJCgnI2FzdGVyaXNrLW1hbmFnZXJzLXRhYmxlLWNvbnRhaW5lcicpLmh0bWwodGFibGVIdG1sKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZHluYW1pY2FsbHkgbGlrZSBpbiBGaXJld2FsbFxuICAgICAgICB0aGlzLmluaXRpYWxpemVQZXJtaXNzaW9uVG9vbHRpcHMoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgcGVybWlzc2lvbiB0b29sdGlwcyBkeW5hbWljYWxseVxuICAgICAqL1xuICAgIGluaXRpYWxpemVQZXJtaXNzaW9uVG9vbHRpcHMoKSB7XG4gICAgICAgIGNvbnN0IHBlcm1pc3Npb25EZXNjcmlwdGlvbnMgPSB0aGlzLmdldFBlcm1pc3Npb25EZXNjcmlwdGlvbnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGFsbCBwZXJtaXNzaW9uIGNlbGxzXG4gICAgICAgICQoJy5wZXJtaXNzaW9uLWNlbGxbZGF0YS1tYW5hZ2VyXScpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCAkY2VsbCA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCBtYW5hZ2VyID0gJGNlbGwuZGF0YSgnbWFuYWdlcicpO1xuICAgICAgICAgICAgY29uc3QgcGVybWlzc2lvbiA9ICRjZWxsLmRhdGEoJ3Blcm1pc3Npb24nKTtcbiAgICAgICAgICAgIGNvbnN0IGlzU3lzdGVtID0gJGNlbGwuZGF0YSgnaXMtc3lzdGVtJyk7XG4gICAgICAgICAgICBjb25zdCBoYXNSZWFkID0gJGNlbGwuZGF0YSgnaGFzLXJlYWQnKTtcbiAgICAgICAgICAgIGNvbnN0IGhhc1dyaXRlID0gJGNlbGwuZGF0YSgnaGFzLXdyaXRlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChtYW5hZ2VyICYmIHBlcm1pc3Npb24gJiYgcGVybWlzc2lvbkRlc2NyaXB0aW9uc1twZXJtaXNzaW9uXSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBEYXRhID0gYXN0ZXJpc2tNYW5hZ2Vyc0luZGV4LmJ1aWxkVG9vbHRpcERhdGEoXG4gICAgICAgICAgICAgICAgICAgIG1hbmFnZXIsIHBlcm1pc3Npb24sIGlzU3lzdGVtLCBoYXNSZWFkLCBoYXNXcml0ZSwgcGVybWlzc2lvbkRlc2NyaXB0aW9uc1twZXJtaXNzaW9uXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbHRpcENvbnRlbnQgPSBUb29sdGlwQnVpbGRlci5idWlsZENvbnRlbnQodG9vbHRpcERhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcFxuICAgICAgICAgICAgICAgICRjZWxsLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogdG9vbHRpcENvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGNlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBwZXJtaXNzaW9uIGRlc2NyaXB0aW9ucyBvYmplY3RcbiAgICAgKi9cbiAgICBnZXRQZXJtaXNzaW9uRGVzY3JpcHRpb25zKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2FsbDoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2NhbGxfcmVhZCB8fCAnVmlldyBhY3RpdmUgY2FsbHMgYW5kIGNoYW5uZWwgc3RhdGVzJyxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY2FsbF93cml0ZSB8fCAnSGFuZ3VwIGNhbGxzLCB0cmFuc2ZlciwgcGFyaydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjZHI6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jZHJfcmVhZCB8fCAnQWNjZXNzIGNhbGwgZGV0YWlsIHJlY29yZHMnLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jZHJfd3JpdGUgfHwgJ01vZGlmeSBDRFIgcmVjb3JkcydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcmlnaW5hdGU6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9vcmlnaW5hdGVfcmVhZCB8fCAnVmlldyBvcmlnaW5hdGlvbiBzdGF0dXMnLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9vcmlnaW5hdGVfd3JpdGUgfHwgJ0NyZWF0ZSBuZXcgY2FsbHMsIGluaXRpYXRlIG91dGJvdW5kIGNhbGxzJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlcG9ydGluZzoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3JlcG9ydGluZ19yZWFkIHx8ICdBY2Nlc3Mgc3lzdGVtIHJlcG9ydHMgYW5kIHN0YXRpc3RpY3MnLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9yZXBvcnRpbmdfd3JpdGUgfHwgJ0dlbmVyYXRlIGFuZCBleHBvcnQgcmVwb3J0cydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZ2VudDoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2FnZW50X3JlYWQgfHwgJ1ZpZXcgcXVldWUgYWdlbnRzIHN0YXR1cycsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2FnZW50X3dyaXRlIHx8ICdMb2dpbi9sb2dvdXQgYWdlbnRzLCBwYXVzZS91bnBhdXNlJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2NvbmZpZ19yZWFkIHx8ICdWaWV3IGNvbmZpZ3VyYXRpb24gZmlsZXMnLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jb25maWdfd3JpdGUgfHwgJ01vZGlmeSBzeXN0ZW0gY29uZmlndXJhdGlvbiwgcmVsb2FkIG1vZHVsZXMnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGlhbHBsYW46IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9kaWFscGxhbl9yZWFkIHx8ICdWaWV3IGRpYWxwbGFuIGNvbnRleHRzIGFuZCBleHRlbnNpb25zJyxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfZGlhbHBsYW5fd3JpdGUgfHwgJ01vZGlmeSBkaWFscGxhbiBpbiByZWFsLXRpbWUnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHRtZjoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2R0bWZfcmVhZCB8fCAnTW9uaXRvciBEVE1GIGV2ZW50cycsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2R0bWZfd3JpdGUgfHwgJ1NlbmQgRFRNRiB0b25lcyB0byBjaGFubmVscydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsb2c6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9sb2dfcmVhZCB8fCAnVmlldyBzeXN0ZW0gYW5kIGFwcGxpY2F0aW9uIGxvZ3MnLFxuICAgICAgICAgICAgICAgIHdyaXRlOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9sb2dfd3JpdGUgfHwgJ1JvdGF0ZSBsb2dzLCBjaGFuZ2UgbG9nIGxldmVscydcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzeXN0ZW06IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9zeXN0ZW1fcmVhZCB8fCAnVmlldyBzeXN0ZW0gc3RhdHVzIGFuZCBpbmZvcm1hdGlvbicsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3N5c3RlbV93cml0ZSB8fCAnRXhlY3V0ZSBzeXN0ZW0gY29tbWFuZHMsIHJlc3RhcnQgc2VydmljZXMnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdXNlcjoge1xuICAgICAgICAgICAgICAgIHJlYWQ6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3VzZXJfcmVhZCB8fCAnVmlldyB1c2VyIGV2ZW50cyBhbmQgZGV2aWNlIHN0YXRlcycsXG4gICAgICAgICAgICAgICAgd3JpdGU6IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3VzZXJfd3JpdGUgfHwgJ1NlbmQgdXNlciBldmVudHMsIHVwZGF0ZSBkZXZpY2Ugc3RhdGVzJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZlcmJvc2U6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF92ZXJib3NlX3JlYWQgfHwgJ1ZpZXcgdmVyYm9zZSBtZXNzYWdlcyBhbmQgZGVidWcgb3V0cHV0JyxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfdmVyYm9zZV93cml0ZSB8fCAnU2V0IHZlcmJvc2UgbGV2ZWxzJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNvbW1hbmQ6IHtcbiAgICAgICAgICAgICAgICByZWFkOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9jb21tYW5kX3JlYWQgfHwgJ1ZpZXcgQ0xJIGNvbW1hbmQgb3V0cHV0JyxcbiAgICAgICAgICAgICAgICB3cml0ZTogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY29tbWFuZF93cml0ZSB8fCAnRXhlY3V0ZSBBc3RlcmlzayBDTEkgY29tbWFuZHMnXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCB0b29sdGlwIGRhdGEgc3RydWN0dXJlXG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwRGF0YShtYW5hZ2VyLCBwZXJtaXNzaW9uLCBpc1N5c3RlbSwgaGFzUmVhZCwgaGFzV3JpdGUsIHBlcm1EZXNjKSB7XG4gICAgICAgIGNvbnN0IHRvb2x0aXBEYXRhID0ge1xuICAgICAgICAgICAgaGVhZGVyOiBgJHttYW5hZ2VyfSAtICR7cGVybWlzc2lvbi50b1VwcGVyQ2FzZSgpfWAsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogbnVsbCxcbiAgICAgICAgICAgIGxpc3Q6IFtdXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY3VycmVudCBhY2Nlc3MgbGV2ZWxcbiAgICAgICAgbGV0IGFjY2Vzc0xldmVsID0gJyc7XG4gICAgICAgIGxldCBhY2Nlc3NDb2xvciA9ICcnO1xuICAgICAgICBpZiAoaGFzUmVhZCAmJiBoYXNXcml0ZSkge1xuICAgICAgICAgICAgYWNjZXNzTGV2ZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9hY2Nlc3NfcmVhZF93cml0ZSB8fCAnUmVhZC9Xcml0ZSc7XG4gICAgICAgICAgICBhY2Nlc3NDb2xvciA9ICdncmVlbic7XG4gICAgICAgIH0gZWxzZSBpZiAoaGFzUmVhZCkge1xuICAgICAgICAgICAgYWNjZXNzTGV2ZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9hY2Nlc3NfcmVhZF9vbmx5IHx8ICdSZWFkIE9ubHknO1xuICAgICAgICAgICAgYWNjZXNzQ29sb3IgPSAnYmx1ZSc7XG4gICAgICAgIH0gZWxzZSBpZiAoaGFzV3JpdGUpIHtcbiAgICAgICAgICAgIGFjY2Vzc0xldmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfYWNjZXNzX3dyaXRlX29ubHkgfHwgJ1dyaXRlIE9ubHknO1xuICAgICAgICAgICAgYWNjZXNzQ29sb3IgPSAnb3JhbmdlJztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgY29uc3QgY3VycmVudEFjY2Vzc0xhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY3VycmVudF9hY2Nlc3MgfHwgJ0N1cnJlbnQgQWNjZXNzJztcbiAgICAgICAgdG9vbHRpcERhdGEuZGVzY3JpcHRpb24gPSBgPHNwYW4gY2xhc3M9XCJ1aSAke2FjY2Vzc0NvbG9yfSB0ZXh0XCI+PHN0cm9uZz4ke2N1cnJlbnRBY2Nlc3NMYWJlbH06ICR7YWNjZXNzTGV2ZWx9PC9zdHJvbmc+PC9zcGFuPmA7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcGVybWlzc2lvbiBkZXRhaWxzXG4gICAgICAgIGNvbnN0IGFsbG93ZWRPcGVyYXRpb25zTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9hbGxvd2VkX29wZXJhdGlvbnMgfHwgJ0FsbG93ZWQgT3BlcmF0aW9ucyc7XG4gICAgICAgIHRvb2x0aXBEYXRhLmxpc3QucHVzaCh7XG4gICAgICAgICAgICB0ZXJtOiBhbGxvd2VkT3BlcmF0aW9uc0xhYmVsLFxuICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGlmIChoYXNSZWFkKSB7XG4gICAgICAgICAgICBjb25zdCByZWFkTGFiZWwgPSBnbG9iYWxUcmFuc2xhdGUuYW1fUmVhZCB8fCAnUmVhZCc7XG4gICAgICAgICAgICB0b29sdGlwRGF0YS5saXN0LnB1c2goe1xuICAgICAgICAgICAgICAgIHRlcm06IHJlYWRMYWJlbCxcbiAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBwZXJtRGVzYy5yZWFkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgaWYgKGhhc1dyaXRlKSB7XG4gICAgICAgICAgICBjb25zdCB3cml0ZUxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX1dyaXRlIHx8ICdXcml0ZSc7XG4gICAgICAgICAgICB0b29sdGlwRGF0YS5saXN0LnB1c2goe1xuICAgICAgICAgICAgICAgIHRlcm06IHdyaXRlTGFiZWwsXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogcGVybURlc2Mud3JpdGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcmVzdHJpY3Rpb25zIGlmIGFueVxuICAgICAgICBpZiAoIWhhc1JlYWQgfHwgIWhhc1dyaXRlKSB7XG4gICAgICAgICAgICBjb25zdCByZXN0cmljdGlvbnNMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX3Jlc3RyaWN0aW9ucyB8fCAnUmVzdHJpY3Rpb25zJztcbiAgICAgICAgICAgIHRvb2x0aXBEYXRhLmxpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgdGVybTogcmVzdHJpY3Rpb25zTGFiZWwsXG4gICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICghaGFzUmVhZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhbm5vdFJlYWRMYWJlbCA9IGdsb2JhbFRyYW5zbGF0ZS5hbV90b29sdGlwX2Nhbm5vdF9yZWFkIHx8ICdDYW5ub3QgcmVhZCc7XG4gICAgICAgICAgICAgICAgdG9vbHRpcERhdGEubGlzdC5wdXNoKGAke2Nhbm5vdFJlYWRMYWJlbH06ICR7cGVybURlc2MucmVhZH1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghaGFzV3JpdGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYW5ub3RXcml0ZUxhYmVsID0gZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfY2Fubm90X3dyaXRlIHx8ICdDYW5ub3Qgd3JpdGUnO1xuICAgICAgICAgICAgICAgIHRvb2x0aXBEYXRhLmxpc3QucHVzaChgJHtjYW5ub3RXcml0ZUxhYmVsfTogJHtwZXJtRGVzYy53cml0ZX1gKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN5c3RlbSBtYW5hZ2VyIHdhcm5pbmcgaWYgYXBwbGljYWJsZVxuICAgICAgICBpZiAoaXNTeXN0ZW0pIHtcbiAgICAgICAgICAgIHRvb2x0aXBEYXRhLndhcm5pbmcgPSB7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuYW1fdG9vbHRpcF9zeXN0ZW1fbWFuYWdlcl93YXJuaW5nIHx8ICdTeXN0ZW0gTWFuYWdlcicsXG4gICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmFtX3Rvb2x0aXBfc3lzdGVtX21hbmFnZXJfd2FybmluZ190ZXh0IHx8ICdUaGlzIGlzIGEgc3lzdGVtIG1hbmFnZXIgYWNjb3VudC4gTW9kaWZ5aW5nIHBlcm1pc3Npb25zIG1heSBhZmZlY3Qgc3lzdGVtIG9wZXJhdGlvbnMuJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHRvb2x0aXBEYXRhO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0YWJsZSBldmVudCBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUYWJsZUV2ZW50cygpIHtcbiAgICAgICAgLy8gVXNlIGV2ZW50IGRlbGVnYXRpb24gZm9yIGR5bmFtaWNhbGx5IGdlbmVyYXRlZCBjb250ZW50XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkKCcjYXN0ZXJpc2stbWFuYWdlcnMtdGFibGUtY29udGFpbmVyJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEb3VibGUgY2xpY2sgdG8gZWRpdCAoZXhjbHVkZSBhY3Rpb24gYnV0dG9ucyBjb2x1bW4pXG4gICAgICAgICRjb250YWluZXIub24oJ2RibGNsaWNrJywgJy5tYW5hZ2VyLXJvdyB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJChlLnRhcmdldCkuY2xvc2VzdCgndHInKS5hdHRyKCdkYXRhLWlkJyk7XG4gICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWFzdGVyaXNrLW1hbmFnZXJzL21vZGlmeS8ke2lkfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29weSBidXR0b24gaGFuZGxlclxuICAgICAgICAkY29udGFpbmVyLm9uKCdjbGljaycsICdhLmNvcHknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgaWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgICAgICAvLyBSZWRpcmVjdCB0byBtb2RpZnkgcGFnZSB3aXRoIGNvcHktc291cmNlIHBhcmFtZXRlclxuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvbW9kaWZ5P2NvcHktc291cmNlPSR7aWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBMZXQgZGVsZXRlLXNvbWV0aGluZy5qcyBoYW5kbGUgdGhlIGZpcnN0IGNsaWNrLCB3ZSBqdXN0IHByZXZlbnQgZGVmYXVsdCBuYXZpZ2F0aW9uXG4gICAgICAgICRjb250YWluZXIub24oJ2NsaWNrJywgJ2EuZGVsZXRlLnR3by1zdGVwcy1kZWxldGUnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAvLyBEb24ndCBzdG9wIHByb3BhZ2F0aW9uIC0gYWxsb3cgZGVsZXRlLXNvbWV0aGluZy5qcyB0byB3b3JrXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiBoYW5kbGVyIC0gd29ya3Mgd2l0aCB0d28tc3RlcHMtZGVsZXRlIGxvZ2ljXG4gICAgICAgIC8vIFRoaXMgd2lsbCBiZSB0cmlnZ2VyZWQgYWZ0ZXIgZGVsZXRlLXNvbWV0aGluZy5qcyByZW1vdmVzIHRoZSB0d28tc3RlcHMtZGVsZXRlIGNsYXNzXG4gICAgICAgICRjb250YWluZXIub24oJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IGlkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpZCkge1xuICAgICAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICBBc3Rlcmlza01hbmFnZXJzQVBJLmRlbGV0ZVJlY29yZChpZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlbG9hZCB0aGUgZW50aXJlIHBhZ2UgdG8gZW5zdXJlIGNsZWFuIHN0YXRlXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGAke2dsb2JhbFJvb3RVcmx9YXN0ZXJpc2stbWFuYWdlcnMvaW5kZXhgO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlPy5tZXNzYWdlcyB8fCBnbG9iYWxUcmFuc2xhdGUuYW1fRXJyb3JEZWxldGluZ01hbmFnZXIgfHwgJ0Vycm9yIGRlbGV0aW5nIG1hbmFnZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRidXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlc3RvcmUgdHdvLXN0ZXBzLWRlbGV0ZSBjbGFzcyBpZiBkZWxldGlvbiBmYWlsZWRcbiAgICAgICAgICAgICAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ3R3by1zdGVwcy1kZWxldGUnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICRidXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdjbG9zZScpLmFkZENsYXNzKCd0cmFzaCcpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7QXJyYXl9IGRhdGEgLSBBcnJheSBvZiBtYW5hZ2VyIG9iamVjdHNcbiAgICAgKi9cbiAgICBvbkRhdGFMb2FkZWQoZGF0YSkge1xuICAgICAgICAvLyBBZGRpdGlvbmFsIHByb2Nlc3NpbmcgYWZ0ZXIgZGF0YSBsb2FkIGlmIG5lZWRlZFxuICAgIH1cbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBBc3RlcmlzayBNYW5hZ2VycyB0YWJsZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgYXN0ZXJpc2tNYW5hZ2Vyc0luZGV4LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==