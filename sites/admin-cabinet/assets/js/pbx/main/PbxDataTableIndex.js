"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

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

/* global globalRootUrl, SemanticLocalization, globalTranslate, UserMessage, Extensions, SecurityUtils */

/**
 * Base class for MikoPBX index table management with ACL support
 * 
 * Provides common functionality for DataTable-based index pages including:
 * - Server-side ACL permission checking
 * - Dynamic action button rendering based on permissions
 * - Unified description truncation with popup support
 * - Copy functionality support
 * - Custom action buttons
 * - Two-step delete confirmation
 * - Double-click editing
 * 
 * @class PbxDataTableIndex
 */
var PbxDataTableIndex = /*#__PURE__*/function () {
  /**
   * Create a new PbxDataTableIndex instance
   * 
   * @param {Object} config - Configuration object
   * @param {string} config.tableId - HTML table element ID
   * @param {Object} config.apiModule - API module for data operations
   * @param {string} config.routePrefix - URL route prefix (e.g., 'call-queues')
   * @param {Object} config.translations - Translation keys for messages
   * @param {Array} config.columns - DataTable column definitions
   * @param {boolean} [config.showSuccessMessages=false] - Show success messages on delete
   * @param {boolean} [config.showInfo=false] - Show DataTable info
   * @param {Array} [config.actionButtons=['edit', 'delete']] - Standard action buttons to show
   * @param {Array} [config.customActionButtons=[]] - Custom action button definitions
   * @param {Object} [config.descriptionSettings] - Description truncation settings
   * @param {Function} [config.onDataLoaded] - Callback after data loaded
   * @param {Function} [config.onDrawCallback] - Callback after table draw
   * @param {Function} [config.onPermissionsLoaded] - Callback after permissions loaded
   * @param {Function} [config.customDeleteHandler] - Custom delete handler
   * @param {Function} [config.onAfterDelete] - Callback after successful deletion
   * @param {Function} [config.getModifyUrl] - Custom URL generator for modify/edit actions
   * @param {boolean} [config.orderable=true] - Enable/disable sorting for all columns
   * @param {Array} [config.order=[[0, 'asc']]] - Default sort order
   * @param {Object} [config.ajaxData] - Additional data parameters for AJAX requests
   */
  function PbxDataTableIndex(config) {
    _classCallCheck(this, PbxDataTableIndex);

    // Core configuration
    this.tableId = config.tableId;
    this.apiModule = config.apiModule;
    this.routePrefix = config.routePrefix;
    this.translations = config.translations || {};
    this.columns = config.columns || [];
    this.showSuccessMessages = config.showSuccessMessages || false;
    this.showInfo = config.showInfo || false; // Sorting configuration (backward compatible)

    this.orderable = config.orderable !== undefined ? config.orderable : true;
    this.order = config.order || [[0, 'asc']]; // Permission state (loaded from server)

    this.permissions = {
      save: false,
      modify: false,
      edit: false,
      "delete": false,
      copy: false,
      custom: {}
    }; // Action buttons configuration

    this.actionButtons = config.actionButtons || ['edit', 'delete'];
    this.customActionButtons = config.customActionButtons || []; // Description truncation settings

    this.descriptionSettings = Object.assign({
      maxLines: 3,
      dynamicHeight: false,
      calculateLines: null
    }, config.descriptionSettings || {}); // Internal properties

    this.$table = $("#".concat(this.tableId));
    this.dataTable = {}; // Optional callbacks

    this.onDataLoaded = config.onDataLoaded;
    this.onDrawCallback = config.onDrawCallback;
    this.onPermissionsLoaded = config.onPermissionsLoaded;
    this.customDeleteHandler = config.customDeleteHandler;
    this.onAfterDelete = config.onAfterDelete;
    this.getModifyUrl = config.getModifyUrl;
    this.ajaxData = config.ajaxData || {};
  }
  /**
   * Initialize the module with permission loading
   */


  _createClass(PbxDataTableIndex, [{
    key: "initialize",
    value: async function initialize() {
      try {
        // Show loader while initializing
        this.showLoader(); // First, load permissions from server

        await this.loadPermissions(); // Initialize DataTable (will handle loader/empty state in data callback)

        this.initializeDataTable();
      } catch (error) {
        console.error('Failed to initialize PbxDataTableIndex:', error);
        UserMessage.showError(globalTranslate.ex_ErrorInitializingTable || 'Failed to initialize table');
        this.hideLoader();
        this.toggleEmptyPlaceholder(true);
      }
    }
    /**
     * Load permissions from server
     */

  }, {
    key: "loadPermissions",
    value: async function loadPermissions() {
      try {
        var response = await $.ajax({
          url: "".concat(globalRootUrl, "acl/checkPermissions"),
          method: 'GET',
          data: {
            controller: this.routePrefix
          },
          dataType: 'json'
        });

        if (response.success && response.data) {
          Object.assign(this.permissions, response.data);

          if (this.onPermissionsLoaded) {
            this.onPermissionsLoaded(this.permissions);
          }
        }
      } catch (error) {
        console.warn('Failed to load permissions, using defaults:', error); // On error, default to no permissions for safety
      }
    }
    /**
     * Initialize DataTable with common configuration
     */

  }, {
    key: "initializeDataTable",
    value: function initializeDataTable() {
      var _this = this;

      // Add the datatable-width-constrained class to the table
      this.$table.addClass('datatable-width-constrained');
      var processedColumns = this.processColumns();
      var config = {
        ajax: {
          url: this.apiModule.endpoints.getList,
          type: 'GET',
          data: this.ajaxData,
          dataSrc: function dataSrc(json) {
            return _this.handleDataLoad(json);
          },
          error: function error(xhr, _error, thrown) {
            _this.hideLoader();

            _this.toggleEmptyPlaceholder(true);

            UserMessage.showError(globalTranslate.ex_ErrorLoadingData || 'Failed to load data');
          }
        },
        columns: processedColumns,
        order: this.order,
        ordering: this.orderable,
        lengthChange: false,
        paging: false,
        searching: true,
        info: this.showInfo,
        language: SemanticLocalization.dataTableLocalisation,
        drawCallback: function drawCallback() {
          return _this.handleDrawCallback();
        }
      };
      this.dataTable = this.$table.DataTable(config); // Initialize handlers

      this.initializeDeleteHandler();
      this.initializeCopyHandler();
      this.initializeCustomHandlers();
    }
    /**
     * Process column definitions and add action column if needed
     */

  }, {
    key: "processColumns",
    value: function processColumns() {
      var columns = _toConsumableArray(this.columns); // If sorting is globally disabled, ensure all columns respect it


      if (!this.orderable) {
        columns.forEach(function (col) {
          // Preserve explicit orderable: false, but override true or undefined
          if (col.orderable !== false) {
            col.orderable = false;
          }
        });
      } // Add standard action column if not already present


      if (!columns.find(function (col) {
        return col.isActionColumn;
      })) {
        columns.push(this.createActionColumn());
      }

      return columns;
    }
    /**
     * Create standard action column with permission-based rendering
     */

  }, {
    key: "createActionColumn",
    value: function createActionColumn() {
      var _this2 = this;

      return {
        data: null,
        orderable: false,
        searchable: false,
        className: 'right aligned collapsing',
        isActionColumn: true,
        render: function render(data, type, row) {
          var buttons = []; // Get the record ID - check for both uniqid and id fields

          var recordId = row.uniqid || row.id || ''; // Edit button

          if (_this2.actionButtons.includes('edit') && (_this2.permissions.modify || _this2.permissions.edit)) {
            // Use custom getModifyUrl if provided, otherwise use default
            var modifyUrl = _this2.getModifyUrl ? _this2.getModifyUrl(recordId) : "".concat(globalRootUrl).concat(_this2.routePrefix, "/modify/").concat(recordId);
            buttons.push("\n                        <a href=\"".concat(modifyUrl, "\" \n                           class=\"ui button edit popuped\" \n                           data-content=\"").concat(globalTranslate.bt_ToolTipEdit, "\">\n                            <i class=\"icon edit blue\"></i>\n                        </a>\n                    "));
          } // Copy button


          if (_this2.actionButtons.includes('copy') && _this2.permissions.copy) {
            buttons.push("\n                        <a href=\"#\" \n                           data-value=\"".concat(recordId, "\"\n                           class=\"ui button copy popuped\" \n                           data-content=\"").concat(globalTranslate.bt_ToolTipCopy, "\">\n                            <i class=\"icon copy outline blue\"></i>\n                        </a>\n                    "));
          } // Custom buttons


          _this2.customActionButtons.forEach(function (customButton) {
            if (_this2.permissions.custom && _this2.permissions.custom[customButton.name]) {
              var href = customButton.href || '#';
              var dataValue = customButton.includeId ? "data-value=\"".concat(recordId, "\"") : '';
              buttons.push("\n                            <a href=\"".concat(href, "\" \n                               ").concat(dataValue, "\n                               class=\"ui button ").concat(customButton["class"], " popuped\" \n                               data-content=\"").concat(SecurityUtils.escapeHtml(customButton.tooltip), "\">\n                                <i class=\"").concat(customButton.icon, "\"></i>\n                            </a>\n                        "));
            }
          }); // Delete button (always last)


          if (_this2.actionButtons.includes('delete') && _this2.permissions["delete"]) {
            buttons.push("\n                        <a href=\"#\" \n                           data-value=\"".concat(recordId, "\" \n                           class=\"ui button delete two-steps-delete popuped\" \n                           data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                            <i class=\"icon trash red\"></i>\n                        </a>\n                    "));
          }

          return buttons.length > 0 ? "<div class=\"ui tiny basic icon buttons action-buttons\">".concat(buttons.join(''), "</div>") : '';
        }
      };
    }
    /**
     * Handle data load and empty state management
     */

  }, {
    key: "handleDataLoad",
    value: function handleDataLoad(json) {
      // Hide loader first
      this.hideLoader();
      var isEmpty = !json.result || !json.data || json.data.length === 0;
      this.toggleEmptyPlaceholder(isEmpty);

      if (this.onDataLoaded) {
        this.onDataLoaded(json);
      }

      return json.result ? json.data : [];
    }
    /**
     * Handle draw callback for post-render operations
     */

  }, {
    key: "handleDrawCallback",
    value: function handleDrawCallback() {
      // Initialize Semantic UI popups
      this.$table.find('.popuped').popup(); // Move Add New button to DataTables wrapper

      this.repositionAddButton(); // Initialize double-click editing

      this.initializeDoubleClickEdit(); // Custom draw callback

      if (this.onDrawCallback) {
        this.onDrawCallback();
      }
    }
    /**
     * Reposition Add New button to DataTables wrapper
     */

  }, {
    key: "repositionAddButton",
    value: function repositionAddButton() {
      var $addButton = $('#add-new-button');
      var $wrapper = $("#".concat(this.tableId, "_wrapper"));
      var $leftColumn = $wrapper.find('.eight.wide.column').first();

      if ($addButton.length && $leftColumn.length && this.permissions.save) {
        $leftColumn.append($addButton);
        $addButton.show();
      }
    }
    /**
     * Initialize delete handler with two-step confirmation
     */

  }, {
    key: "initializeDeleteHandler",
    value: function initializeDeleteHandler() {
      var _this3 = this;

      // DeleteSomething.js handles first click
      // We handle second click when two-steps-delete class is removed
      this.$table.on('click', 'a.delete:not(.two-steps-delete)', function (e) {
        e.preventDefault();
        var $button = $(e.currentTarget);
        var recordId = $button.attr('data-value'); // Add loading state

        $button.addClass('loading disabled');

        if (_this3.customDeleteHandler) {
          _this3.customDeleteHandler(recordId);
        } else {
          _this3.apiModule.deleteRecord(recordId, function (response) {
            return _this3.cbAfterDeleteRecord(response);
          });
        }
      });
    }
    /**
     * Initialize copy handler
     */

  }, {
    key: "initializeCopyHandler",
    value: function initializeCopyHandler() {
      var _this4 = this;

      this.$table.on('click', 'a.copy', function (e) {
        e.preventDefault();
        var recordId = $(e.currentTarget).attr('data-value'); // Use same logic as modify URL but add copy parameter

        var copyUrl;

        if (_this4.getModifyUrl) {
          // Use custom getModifyUrl and add copy parameter
          var modifyUrl = _this4.getModifyUrl(recordId);

          if (modifyUrl) {
            // Remove recordId from URL and add copy parameter
            var baseUrl = modifyUrl.replace("/".concat(recordId), '');
            copyUrl = "".concat(baseUrl, "/?copy=").concat(recordId);
          }
        } else {
          // Default URL pattern
          copyUrl = "".concat(globalRootUrl).concat(_this4.routePrefix, "/modify/?copy=").concat(recordId);
        } // Redirect to copy URL


        if (copyUrl) {
          window.location = copyUrl;
        }
      });
    }
    /**
     * Initialize custom button handlers
     */

  }, {
    key: "initializeCustomHandlers",
    value: function initializeCustomHandlers() {
      var _this5 = this;

      this.customActionButtons.forEach(function (customButton) {
        if (customButton.onClick) {
          _this5.$table.on('click', "a.".concat(customButton["class"]), function (e) {
            e.preventDefault();
            var recordId = $(e.currentTarget).attr('data-value');
            customButton.onClick(recordId);
          });
        }
      });
    }
    /**
     * Callback after record deletion
     */

  }, {
    key: "cbAfterDeleteRecord",
    value: function cbAfterDeleteRecord(response) {
      var _this6 = this;

      if (response.result === true) {
        // Reload table data with callback support
        var reloadCallback = function reloadCallback() {
          // Call custom after-delete callback if provided
          if (typeof _this6.onAfterDelete === 'function') {
            _this6.onAfterDelete(response);
          }
        }; // Reload table and execute callback


        this.dataTable.ajax.reload(reloadCallback, false); // Update related components

        if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
          Extensions.cbOnDataChanged();
        } // Success message removed - no need to show success for deletion operations

      } else {
        var _response$messages;

        // Show error message
        var errorMessage = ((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || this.translations.deleteError || globalTranslate.ex_ImpossibleToDeleteRecord;
        UserMessage.showError(errorMessage);
      } // Remove loading state from all delete buttons


      this.$table.find('a.delete').removeClass('loading disabled');
    }
    /**
     * Show loader while loading data
     */

  }, {
    key: "showLoader",
    value: function showLoader() {
      // Hide everything first
      // Find the table's parent container - need the original container, not the DataTables wrapper
      var $wrapper = this.$table.closest('div[id$="_wrapper"]');
      var $container;

      if ($wrapper.length) {
        // Get the parent of the wrapper (should be the original container)
        $container = $wrapper.parent('div[id]');
      } // Fallback if structure is different


      if (!$container || !$container.length) {
        $container = this.$table.closest('div[id]:not([id$="_wrapper"])');
      }

      var $placeholder = $('#empty-table-placeholder');
      var $addButton = $('#add-new-button');
      $container.hide();
      $placeholder.hide();
      $addButton.hide(); // Create and show loader if not exists

      var $loader = $('#table-data-loader');

      if (!$loader.length) {
        // Create a segment with loader for better visual appearance
        $loader = $("\n                <div id=\"table-data-loader\" class=\"ui segment\" style=\"min-height: 200px; position: relative;\">\n                    <div class=\"ui active inverted dimmer\">\n                        <div class=\"ui text loader\">".concat(globalTranslate.ex_LoadingData || 'Loading...', "</div>\n                    </div>\n                </div>\n            ")); // Insert loader in the appropriate place

        if ($container.length && $container.parent().length) {
          $container.before($loader);
        } else if ($placeholder.length && $placeholder.parent().length) {
          $placeholder.before($loader);
        } else {
          // Fallback: append to body or parent container
          var $parent = this.$table.closest('.pusher') || this.$table.parent();
          $parent.append($loader);
        }
      }

      $loader.show();
    }
    /**
     * Hide loader
     */

  }, {
    key: "hideLoader",
    value: function hideLoader() {
      $('#table-data-loader').hide();
    }
    /**
     * Toggle empty table placeholder visibility
     */

  }, {
    key: "toggleEmptyPlaceholder",
    value: function toggleEmptyPlaceholder(isEmpty) {
      // Find the table's parent container - need the original container, not the DataTables wrapper
      // DataTables wraps the table in a div with id ending in '_wrapper'
      // We need to find the parent of that wrapper which is the original container
      var $wrapper = this.$table.closest('div[id$="_wrapper"]');
      var $container;

      if ($wrapper.length) {
        // Get the parent of the wrapper (should be the original container)
        $container = $wrapper.parent('div[id]');
      } // Fallback if structure is different


      if (!$container || !$container.length) {
        $container = this.$table.closest('div[id]:not([id$="_wrapper"])');
      }

      var $addButton = $('#add-new-button');
      var $placeholder = $('#empty-table-placeholder');

      if (isEmpty) {
        $container.hide();
        $addButton.hide(); // Make sure placeholder is visible

        if ($placeholder.length) {
          $placeholder.show();
        }
      } else {
        if ($placeholder.length) {
          $placeholder.hide();
        }

        if (this.permissions.save) {
          $addButton.show();
        }

        $container.show();
      }
    }
    /**
     * Initialize double-click for editing
     * Excludes action button cells to avoid conflicts
     */

  }, {
    key: "initializeDoubleClickEdit",
    value: function initializeDoubleClickEdit() {
      var _this7 = this;

      this.$table.on('dblclick', 'tbody td:not(.right.aligned)', function (e) {
        var data = _this7.dataTable.row(e.currentTarget).data(); // Get the record ID - check for both uniqid and id fields


        var recordId = data && (data.uniqid || data.id);

        if (recordId && (_this7.permissions.modify || _this7.permissions.edit)) {
          // Use custom getModifyUrl if provided, otherwise use default
          var modifyUrl = _this7.getModifyUrl ? _this7.getModifyUrl(recordId) : "".concat(globalRootUrl).concat(_this7.routePrefix, "/modify/").concat(recordId);
          window.location = modifyUrl;
        }
      });
    }
    /**
     * Create a unified description renderer with truncation support
     * 
     * @returns {Function} Renderer function for DataTables
     */

  }, {
    key: "createDescriptionRenderer",
    value: function createDescriptionRenderer() {
      var _this8 = this;

      return function (data, type, row) {
        if (!data || data.trim() === '') {
          return '—';
        }

        if (type === 'display') {
          // Escape HTML to prevent XSS
          var safeDesc = window.SecurityUtils.escapeHtml(data);
          var descriptionLines = safeDesc.split('\n').filter(function (line) {
            return line.trim() !== '';
          }); // Calculate max lines

          var maxLines = _this8.descriptionSettings.maxLines;

          if (_this8.descriptionSettings.dynamicHeight && _this8.descriptionSettings.calculateLines) {
            maxLines = _this8.descriptionSettings.calculateLines(row);
          }

          if (descriptionLines.length <= maxLines) {
            // Description fits - show with preserved formatting
            var formattedDesc = descriptionLines.join('<br>');
            return "<div class=\"description-text\" style=\"line-height: 1.3;\">".concat(formattedDesc, "</div>");
          } else {
            // Description too long - truncate with popup
            var visibleLines = descriptionLines.slice(0, maxLines);
            visibleLines[maxLines - 1] += '...';
            var truncatedDesc = visibleLines.join('<br>');
            var fullDesc = descriptionLines.join('\n');
            return "<div class=\"description-text truncated popuped\" \n                               data-content=\"".concat(fullDesc, "\" \n                               data-position=\"top right\" \n                               data-variation=\"wide\"\n                               style=\"cursor: help; border-bottom: 1px dotted #999; line-height: 1.3;\">\n                        ").concat(truncatedDesc, "\n                    </div>");
          }
        } // For search and other operations, return plain text


        return data;
      };
    }
    /**
     * Destroy the DataTable and cleanup
     */

  }, {
    key: "destroy",
    value: function destroy() {
      // Remove event handlers
      this.$table.off('click', 'a.delete:not(.two-steps-delete)');
      this.$table.off('click', 'a.copy');
      this.$table.off('dblclick', 'tbody td:not(.right.aligned)'); // Destroy DataTable if exists

      if (this.dataTable && typeof this.dataTable.destroy === 'function') {
        this.dataTable.destroy();
      } // Remove loader


      $('#table-data-loader').remove();
    }
  }]);

  return PbxDataTableIndex;
}(); // Make available globally


window.PbxDataTableIndex = PbxDataTableIndex;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1BieERhdGFUYWJsZUluZGV4LmpzIl0sIm5hbWVzIjpbIlBieERhdGFUYWJsZUluZGV4IiwiY29uZmlnIiwidGFibGVJZCIsImFwaU1vZHVsZSIsInJvdXRlUHJlZml4IiwidHJhbnNsYXRpb25zIiwiY29sdW1ucyIsInNob3dTdWNjZXNzTWVzc2FnZXMiLCJzaG93SW5mbyIsIm9yZGVyYWJsZSIsInVuZGVmaW5lZCIsIm9yZGVyIiwicGVybWlzc2lvbnMiLCJzYXZlIiwibW9kaWZ5IiwiZWRpdCIsImNvcHkiLCJjdXN0b20iLCJhY3Rpb25CdXR0b25zIiwiY3VzdG9tQWN0aW9uQnV0dG9ucyIsImRlc2NyaXB0aW9uU2V0dGluZ3MiLCJPYmplY3QiLCJhc3NpZ24iLCJtYXhMaW5lcyIsImR5bmFtaWNIZWlnaHQiLCJjYWxjdWxhdGVMaW5lcyIsIiR0YWJsZSIsIiQiLCJkYXRhVGFibGUiLCJvbkRhdGFMb2FkZWQiLCJvbkRyYXdDYWxsYmFjayIsIm9uUGVybWlzc2lvbnNMb2FkZWQiLCJjdXN0b21EZWxldGVIYW5kbGVyIiwib25BZnRlckRlbGV0ZSIsImdldE1vZGlmeVVybCIsImFqYXhEYXRhIiwic2hvd0xvYWRlciIsImxvYWRQZXJtaXNzaW9ucyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJlcnJvciIsImNvbnNvbGUiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X0Vycm9ySW5pdGlhbGl6aW5nVGFibGUiLCJoaWRlTG9hZGVyIiwidG9nZ2xlRW1wdHlQbGFjZWhvbGRlciIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJtZXRob2QiLCJkYXRhIiwiY29udHJvbGxlciIsImRhdGFUeXBlIiwic3VjY2VzcyIsIndhcm4iLCJhZGRDbGFzcyIsInByb2Nlc3NlZENvbHVtbnMiLCJwcm9jZXNzQ29sdW1ucyIsImVuZHBvaW50cyIsImdldExpc3QiLCJ0eXBlIiwiZGF0YVNyYyIsImpzb24iLCJoYW5kbGVEYXRhTG9hZCIsInhociIsInRocm93biIsImV4X0Vycm9yTG9hZGluZ0RhdGEiLCJvcmRlcmluZyIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInNlYXJjaGluZyIsImluZm8iLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZHJhd0NhbGxiYWNrIiwiaGFuZGxlRHJhd0NhbGxiYWNrIiwiRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIiLCJpbml0aWFsaXplQ29weUhhbmRsZXIiLCJpbml0aWFsaXplQ3VzdG9tSGFuZGxlcnMiLCJmb3JFYWNoIiwiY29sIiwiZmluZCIsImlzQWN0aW9uQ29sdW1uIiwicHVzaCIsImNyZWF0ZUFjdGlvbkNvbHVtbiIsInNlYXJjaGFibGUiLCJjbGFzc05hbWUiLCJyZW5kZXIiLCJyb3ciLCJidXR0b25zIiwicmVjb3JkSWQiLCJ1bmlxaWQiLCJpZCIsImluY2x1ZGVzIiwibW9kaWZ5VXJsIiwiYnRfVG9vbFRpcEVkaXQiLCJidF9Ub29sVGlwQ29weSIsImN1c3RvbUJ1dHRvbiIsIm5hbWUiLCJocmVmIiwiZGF0YVZhbHVlIiwiaW5jbHVkZUlkIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJ0b29sdGlwIiwiaWNvbiIsImJ0X1Rvb2xUaXBEZWxldGUiLCJsZW5ndGgiLCJqb2luIiwiaXNFbXB0eSIsInJlc3VsdCIsInBvcHVwIiwicmVwb3NpdGlvbkFkZEJ1dHRvbiIsImluaXRpYWxpemVEb3VibGVDbGlja0VkaXQiLCIkYWRkQnV0dG9uIiwiJHdyYXBwZXIiLCIkbGVmdENvbHVtbiIsImZpcnN0IiwiYXBwZW5kIiwic2hvdyIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCJhdHRyIiwiZGVsZXRlUmVjb3JkIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsImNvcHlVcmwiLCJiYXNlVXJsIiwicmVwbGFjZSIsIndpbmRvdyIsImxvY2F0aW9uIiwib25DbGljayIsInJlbG9hZENhbGxiYWNrIiwicmVsb2FkIiwiRXh0ZW5zaW9ucyIsImNiT25EYXRhQ2hhbmdlZCIsImVycm9yTWVzc2FnZSIsIm1lc3NhZ2VzIiwiZGVsZXRlRXJyb3IiLCJleF9JbXBvc3NpYmxlVG9EZWxldGVSZWNvcmQiLCJyZW1vdmVDbGFzcyIsImNsb3Nlc3QiLCIkY29udGFpbmVyIiwicGFyZW50IiwiJHBsYWNlaG9sZGVyIiwiaGlkZSIsIiRsb2FkZXIiLCJleF9Mb2FkaW5nRGF0YSIsImJlZm9yZSIsIiRwYXJlbnQiLCJ0cmltIiwic2FmZURlc2MiLCJkZXNjcmlwdGlvbkxpbmVzIiwic3BsaXQiLCJmaWx0ZXIiLCJsaW5lIiwiZm9ybWF0dGVkRGVzYyIsInZpc2libGVMaW5lcyIsInNsaWNlIiwidHJ1bmNhdGVkRGVzYyIsImZ1bGxEZXNjIiwib2ZmIiwiZGVzdHJveSIsInJlbW92ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsaUI7QUFDRjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSSw2QkFBWUMsTUFBWixFQUFvQjtBQUFBOztBQUNoQjtBQUNBLFNBQUtDLE9BQUwsR0FBZUQsTUFBTSxDQUFDQyxPQUF0QjtBQUNBLFNBQUtDLFNBQUwsR0FBaUJGLE1BQU0sQ0FBQ0UsU0FBeEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CSCxNQUFNLENBQUNH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Z0JBQWdCLENBQUM5QyxJQUFqQixDQUFzQixJQUF0QixDQUFqQjtBQUVBLCtIQUMyQnNELFFBRDNCLDBRQUtNRCxhQUxOO0FBT0g7QUFDSixTQXBDdUIsQ0FzQ3hCOzs7QUFDQSxlQUFPakgsSUFBUDtBQUNILE9BeENEO0FBeUNIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksbUJBQVU7QUFDTjtBQUNBLFdBQUsxQixNQUFMLENBQVk2SSxHQUFaLENBQWdCLE9BQWhCLEVBQXlCLGlDQUF6QjtBQUNBLFdBQUs3SSxNQUFMLENBQVk2SSxHQUFaLENBQWdCLE9BQWhCLEVBQXlCLFFBQXpCO0FBQ0EsV0FBSzdJLE1BQUwsQ0FBWTZJLEdBQVosQ0FBZ0IsVUFBaEIsRUFBNEIsOEJBQTVCLEVBSk0sQ0FNTjs7QUFDQSxVQUFJLEtBQUszSSxTQUFMLElBQWtCLE9BQU8sS0FBS0EsU0FBTCxDQUFlNEksT0FBdEIsS0FBa0MsVUFBeEQsRUFBb0U7QUFDaEUsYUFBSzVJLFNBQUwsQ0FBZTRJLE9BQWY7QUFDSCxPQVRLLENBV047OztBQUNBN0ksTUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0I4SSxNQUF4QjtBQUNIOzs7O0tBR0w7OztBQUNBbEMsTUFBTSxDQUFDdkksaUJBQVAsR0FBMkJBLGlCQUEzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXh0ZW5zaW9ucywgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIE1pa29QQlggaW5kZXggdGFibGUgbWFuYWdlbWVudCB3aXRoIEFDTCBzdXBwb3J0XG4gKiBcbiAqIFByb3ZpZGVzIGNvbW1vbiBmdW5jdGlvbmFsaXR5IGZvciBEYXRhVGFibGUtYmFzZWQgaW5kZXggcGFnZXMgaW5jbHVkaW5nOlxuICogLSBTZXJ2ZXItc2lkZSBBQ0wgcGVybWlzc2lvbiBjaGVja2luZ1xuICogLSBEeW5hbWljIGFjdGlvbiBidXR0b24gcmVuZGVyaW5nIGJhc2VkIG9uIHBlcm1pc3Npb25zXG4gKiAtIFVuaWZpZWQgZGVzY3JpcHRpb24gdHJ1bmNhdGlvbiB3aXRoIHBvcHVwIHN1cHBvcnRcbiAqIC0gQ29weSBmdW5jdGlvbmFsaXR5IHN1cHBvcnRcbiAqIC0gQ3VzdG9tIGFjdGlvbiBidXR0b25zXG4gKiAtIFR3by1zdGVwIGRlbGV0ZSBjb25maXJtYXRpb25cbiAqIC0gRG91YmxlLWNsaWNrIGVkaXRpbmdcbiAqIFxuICogQGNsYXNzIFBieERhdGFUYWJsZUluZGV4XG4gKi9cbmNsYXNzIFBieERhdGFUYWJsZUluZGV4IHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXggaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLnRhYmxlSWQgLSBIVE1MIHRhYmxlIGVsZW1lbnQgSURcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnLmFwaU1vZHVsZSAtIEFQSSBtb2R1bGUgZm9yIGRhdGEgb3BlcmF0aW9uc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcucm91dGVQcmVmaXggLSBVUkwgcm91dGUgcHJlZml4IChlLmcuLCAnY2FsbC1xdWV1ZXMnKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcudHJhbnNsYXRpb25zIC0gVHJhbnNsYXRpb24ga2V5cyBmb3IgbWVzc2FnZXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb25maWcuY29sdW1ucyAtIERhdGFUYWJsZSBjb2x1bW4gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2hvd1N1Y2Nlc3NNZXNzYWdlcz1mYWxzZV0gLSBTaG93IHN1Y2Nlc3MgbWVzc2FnZXMgb24gZGVsZXRlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNob3dJbmZvPWZhbHNlXSAtIFNob3cgRGF0YVRhYmxlIGluZm9cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmFjdGlvbkJ1dHRvbnM9WydlZGl0JywgJ2RlbGV0ZSddXSAtIFN0YW5kYXJkIGFjdGlvbiBidXR0b25zIHRvIHNob3dcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmN1c3RvbUFjdGlvbkJ1dHRvbnM9W11dIC0gQ3VzdG9tIGFjdGlvbiBidXR0b24gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5kZXNjcmlwdGlvblNldHRpbmdzXSAtIERlc2NyaXB0aW9uIHRydW5jYXRpb24gc2V0dGluZ3NcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLm9uRGF0YUxvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBkYXRhIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25EcmF3Q2FsbGJhY2tdIC0gQ2FsbGJhY2sgYWZ0ZXIgdGFibGUgZHJhd1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25QZXJtaXNzaW9uc0xvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBwZXJtaXNzaW9ucyBsb2FkZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmN1c3RvbURlbGV0ZUhhbmRsZXJdIC0gQ3VzdG9tIGRlbGV0ZSBoYW5kbGVyXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5vbkFmdGVyRGVsZXRlXSAtIENhbGxiYWNrIGFmdGVyIHN1Y2Nlc3NmdWwgZGVsZXRpb25cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmdldE1vZGlmeVVybF0gLSBDdXN0b20gVVJMIGdlbmVyYXRvciBmb3IgbW9kaWZ5L2VkaXQgYWN0aW9uc1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5vcmRlcmFibGU9dHJ1ZV0gLSBFbmFibGUvZGlzYWJsZSBzb3J0aW5nIGZvciBhbGwgY29sdW1uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtjb25maWcub3JkZXI9W1swLCAnYXNjJ11dXSAtIERlZmF1bHQgc29ydCBvcmRlclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnLmFqYXhEYXRhXSAtIEFkZGl0aW9uYWwgZGF0YSBwYXJhbWV0ZXJzIGZvciBBSkFYIHJlcXVlc3RzXG4gICAgICovXG4gICAgY29uc3RydWN0b3IoY29uZmlnKSB7XG4gICAgICAgIC8vIENvcmUgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLnRhYmxlSWQgPSBjb25maWcudGFibGVJZDtcbiAgICAgICAgdGhpcy5hcGlNb2R1bGUgPSBjb25maWcuYXBpTW9kdWxlO1xuICAgICAgICB0aGlzLnJvdXRlUHJlZml4ID0gY29uZmlnLnJvdXRlUHJlZml4O1xuICAgICAgICB0aGlzLnRyYW5zbGF0aW9ucyA9IGNvbmZpZy50cmFuc2xhdGlvbnMgfHwge307XG4gICAgICAgIHRoaXMuY29sdW1ucyA9IGNvbmZpZy5jb2x1bW5zIHx8IFtdO1xuICAgICAgICB0aGlzLnNob3dTdWNjZXNzTWVzc2FnZXMgPSBjb25maWcuc2hvd1N1Y2Nlc3NNZXNzYWdlcyB8fCBmYWxzZTtcbiAgICAgICAgdGhpcy5zaG93SW5mbyA9IGNvbmZpZy5zaG93SW5mbyB8fCBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNvcnRpbmcgY29uZmlndXJhdGlvbiAoYmFja3dhcmQgY29tcGF0aWJsZSlcbiAgICAgICAgdGhpcy5vcmRlcmFibGUgPSBjb25maWcub3JkZXJhYmxlICE9PSB1bmRlZmluZWQgPyBjb25maWcub3JkZXJhYmxlIDogdHJ1ZTtcbiAgICAgICAgdGhpcy5vcmRlciA9IGNvbmZpZy5vcmRlciB8fCBbWzAsICdhc2MnXV07XG4gICAgICAgIFxuICAgICAgICAvLyBQZXJtaXNzaW9uIHN0YXRlIChsb2FkZWQgZnJvbSBzZXJ2ZXIpXG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSB7XG4gICAgICAgICAgICBzYXZlOiBmYWxzZSxcbiAgICAgICAgICAgIG1vZGlmeTogZmFsc2UsXG4gICAgICAgICAgICBlZGl0OiBmYWxzZSxcbiAgICAgICAgICAgIGRlbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICBjb3B5OiBmYWxzZSxcbiAgICAgICAgICAgIGN1c3RvbToge31cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFjdGlvbiBidXR0b25zIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy5hY3Rpb25CdXR0b25zID0gY29uZmlnLmFjdGlvbkJ1dHRvbnMgfHwgWydlZGl0JywgJ2RlbGV0ZSddO1xuICAgICAgICB0aGlzLmN1c3RvbUFjdGlvbkJ1dHRvbnMgPSBjb25maWcuY3VzdG9tQWN0aW9uQnV0dG9ucyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlc2NyaXB0aW9uIHRydW5jYXRpb24gc2V0dGluZ3NcbiAgICAgICAgdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICBtYXhMaW5lczogMyxcbiAgICAgICAgICAgIGR5bmFtaWNIZWlnaHQ6IGZhbHNlLFxuICAgICAgICAgICAgY2FsY3VsYXRlTGluZXM6IG51bGxcbiAgICAgICAgfSwgY29uZmlnLmRlc2NyaXB0aW9uU2V0dGluZ3MgfHwge30pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW50ZXJuYWwgcHJvcGVydGllc1xuICAgICAgICB0aGlzLiR0YWJsZSA9ICQoYCMke3RoaXMudGFibGVJZH1gKTtcbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIE9wdGlvbmFsIGNhbGxiYWNrc1xuICAgICAgICB0aGlzLm9uRGF0YUxvYWRlZCA9IGNvbmZpZy5vbkRhdGFMb2FkZWQ7XG4gICAgICAgIHRoaXMub25EcmF3Q2FsbGJhY2sgPSBjb25maWcub25EcmF3Q2FsbGJhY2s7XG4gICAgICAgIHRoaXMub25QZXJtaXNzaW9uc0xvYWRlZCA9IGNvbmZpZy5vblBlcm1pc3Npb25zTG9hZGVkO1xuICAgICAgICB0aGlzLmN1c3RvbURlbGV0ZUhhbmRsZXIgPSBjb25maWcuY3VzdG9tRGVsZXRlSGFuZGxlcjtcbiAgICAgICAgdGhpcy5vbkFmdGVyRGVsZXRlID0gY29uZmlnLm9uQWZ0ZXJEZWxldGU7XG4gICAgICAgIHRoaXMuZ2V0TW9kaWZ5VXJsID0gY29uZmlnLmdldE1vZGlmeVVybDtcbiAgICAgICAgdGhpcy5hamF4RGF0YSA9IGNvbmZpZy5hamF4RGF0YSB8fCB7fTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlIHdpdGggcGVybWlzc2lvbiBsb2FkaW5nXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFNob3cgbG9hZGVyIHdoaWxlIGluaXRpYWxpemluZ1xuICAgICAgICAgICAgdGhpcy5zaG93TG9hZGVyKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpcnN0LCBsb2FkIHBlcm1pc3Npb25zIGZyb20gc2VydmVyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRQZXJtaXNzaW9ucygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIERhdGFUYWJsZSAod2lsbCBoYW5kbGUgbG9hZGVyL2VtcHR5IHN0YXRlIGluIGRhdGEgY2FsbGJhY2spXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIFBieERhdGFUYWJsZUluZGV4OicsIGVycm9yKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JJbml0aWFsaXppbmdUYWJsZSB8fCAnRmFpbGVkIHRvIGluaXRpYWxpemUgdGFibGUnKTtcbiAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcGVybWlzc2lvbnMgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBhc3luYyBsb2FkUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWFjbC9jaGVja1Blcm1pc3Npb25zYCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogdGhpcy5yb3V0ZVByZWZpeFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMucGVybWlzc2lvbnMsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uUGVybWlzc2lvbnNMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkKHRoaXMucGVybWlzc2lvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGxvYWQgcGVybWlzc2lvbnMsIHVzaW5nIGRlZmF1bHRzOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIE9uIGVycm9yLCBkZWZhdWx0IHRvIG5vIHBlcm1pc3Npb25zIGZvciBzYWZldHlcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIGNvbW1vbiBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgLy8gQWRkIHRoZSBkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQgY2xhc3MgdG8gdGhlIHRhYmxlXG4gICAgICAgIHRoaXMuJHRhYmxlLmFkZENsYXNzKCdkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQnKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb2Nlc3NlZENvbHVtbnMgPSB0aGlzLnByb2Nlc3NDb2x1bW5zKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb25maWcgPSB7XG4gICAgICAgICAgICBhamF4OiB7XG4gICAgICAgICAgICAgICAgdXJsOiB0aGlzLmFwaU1vZHVsZS5lbmRwb2ludHMuZ2V0TGlzdCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB0aGlzLmFqYXhEYXRhLFxuICAgICAgICAgICAgICAgIGRhdGFTcmM6IChqc29uKSA9PiB0aGlzLmhhbmRsZURhdGFMb2FkKGpzb24pLFxuICAgICAgICAgICAgICAgIGVycm9yOiAoeGhyLCBlcnJvciwgdGhyb3duKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JMb2FkaW5nRGF0YSB8fCAnRmFpbGVkIHRvIGxvYWQgZGF0YScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBwcm9jZXNzZWRDb2x1bW5zLFxuICAgICAgICAgICAgb3JkZXI6IHRoaXMub3JkZXIsXG4gICAgICAgICAgICBvcmRlcmluZzogdGhpcy5vcmRlcmFibGUsXG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IHRoaXMuc2hvd0luZm8sXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrOiAoKSA9PiB0aGlzLmhhbmRsZURyYXdDYWxsYmFjaygpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLmRhdGFUYWJsZSA9IHRoaXMuJHRhYmxlLkRhdGFUYWJsZShjb25maWcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBoYW5kbGVyc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEZWxldGVIYW5kbGVyKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNvcHlIYW5kbGVyKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUN1c3RvbUhhbmRsZXJzKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgY29sdW1uIGRlZmluaXRpb25zIGFuZCBhZGQgYWN0aW9uIGNvbHVtbiBpZiBuZWVkZWRcbiAgICAgKi9cbiAgICBwcm9jZXNzQ29sdW1ucygpIHtcbiAgICAgICAgY29uc3QgY29sdW1ucyA9IFsuLi50aGlzLmNvbHVtbnNdO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgc29ydGluZyBpcyBnbG9iYWxseSBkaXNhYmxlZCwgZW5zdXJlIGFsbCBjb2x1bW5zIHJlc3BlY3QgaXRcbiAgICAgICAgaWYgKCF0aGlzLm9yZGVyYWJsZSkge1xuICAgICAgICAgICAgY29sdW1ucy5mb3JFYWNoKGNvbCA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUHJlc2VydmUgZXhwbGljaXQgb3JkZXJhYmxlOiBmYWxzZSwgYnV0IG92ZXJyaWRlIHRydWUgb3IgdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgaWYgKGNvbC5vcmRlcmFibGUgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbC5vcmRlcmFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0YW5kYXJkIGFjdGlvbiBjb2x1bW4gaWYgbm90IGFscmVhZHkgcHJlc2VudFxuICAgICAgICBpZiAoIWNvbHVtbnMuZmluZChjb2wgPT4gY29sLmlzQWN0aW9uQ29sdW1uKSkge1xuICAgICAgICAgICAgY29sdW1ucy5wdXNoKHRoaXMuY3JlYXRlQWN0aW9uQ29sdW1uKCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY29sdW1ucztcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHN0YW5kYXJkIGFjdGlvbiBjb2x1bW4gd2l0aCBwZXJtaXNzaW9uLWJhc2VkIHJlbmRlcmluZ1xuICAgICAqL1xuICAgIGNyZWF0ZUFjdGlvbkNvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBjbGFzc05hbWU6ICdyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmcnLFxuICAgICAgICAgICAgaXNBY3Rpb25Db2x1bW46IHRydWUsXG4gICAgICAgICAgICByZW5kZXI6IChkYXRhLCB0eXBlLCByb3cpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBidXR0b25zID0gW107XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSByZWNvcmQgSUQgLSBjaGVjayBmb3IgYm90aCB1bmlxaWQgYW5kIGlkIGZpZWxkc1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gcm93LnVuaXFpZCB8fCByb3cuaWQgfHwgJyc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRWRpdCBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdlZGl0JykgJiYgXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLnBlcm1pc3Npb25zLm1vZGlmeSB8fCB0aGlzLnBlcm1pc3Npb25zLmVkaXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgY3VzdG9tIGdldE1vZGlmeVVybCBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsID8gXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdldE1vZGlmeVVybChyZWNvcmRJZCkgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvJHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke21vZGlmeVVybH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGVkaXQgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGVkaXQgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uQnV0dG9ucy5pbmNsdWRlcygnY29weScpICYmIHRoaXMucGVybWlzc2lvbnMuY29weSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke3JlY29yZElkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBjb3B5IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBjb3B5IG91dGxpbmUgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEN1c3RvbSBidXR0b25zXG4gICAgICAgICAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zLmZvckVhY2goY3VzdG9tQnV0dG9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvbnMuY3VzdG9tICYmIHRoaXMucGVybWlzc2lvbnMuY3VzdG9tW2N1c3RvbUJ1dHRvbi5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaHJlZiA9IGN1c3RvbUJ1dHRvbi5ocmVmIHx8ICcjJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFWYWx1ZSA9IGN1c3RvbUJ1dHRvbi5pbmNsdWRlSWQgPyBgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCJgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2hyZWZ9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtkYXRhVmFsdWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gJHtjdXN0b21CdXR0b24uY2xhc3N9IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChjdXN0b21CdXR0b24udG9vbHRpcCl9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtjdXN0b21CdXR0b24uaWNvbn1cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBEZWxldGUgYnV0dG9uIChhbHdheXMgbGFzdClcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdkZWxldGUnKSAmJiB0aGlzLnBlcm1pc3Npb25zLmRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke3JlY29yZElkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlIHR3by1zdGVwcy1kZWxldGUgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1dHRvbnMubGVuZ3RoID4gMCA/IFxuICAgICAgICAgICAgICAgICAgICBgPGRpdiBjbGFzcz1cInVpIHRpbnkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+JHtidXR0b25zLmpvaW4oJycpfTwvZGl2PmAgOiBcbiAgICAgICAgICAgICAgICAgICAgJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBkYXRhIGxvYWQgYW5kIGVtcHR5IHN0YXRlIG1hbmFnZW1lbnRcbiAgICAgKi9cbiAgICBoYW5kbGVEYXRhTG9hZChqc29uKSB7XG4gICAgICAgIC8vIEhpZGUgbG9hZGVyIGZpcnN0XG4gICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgaXNFbXB0eSA9ICFqc29uLnJlc3VsdCB8fCAhanNvbi5kYXRhIHx8IGpzb24uZGF0YS5sZW5ndGggPT09IDA7XG4gICAgICAgIHRoaXMudG9nZ2xlRW1wdHlQbGFjZWhvbGRlcihpc0VtcHR5KTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm9uRGF0YUxvYWRlZCkge1xuICAgICAgICAgICAgdGhpcy5vbkRhdGFMb2FkZWQoanNvbik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBqc29uLnJlc3VsdCA/IGpzb24uZGF0YSA6IFtdO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZHJhdyBjYWxsYmFjayBmb3IgcG9zdC1yZW5kZXIgb3BlcmF0aW9uc1xuICAgICAqL1xuICAgIGhhbmRsZURyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBwb3B1cHNcbiAgICAgICAgdGhpcy4kdGFibGUuZmluZCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTW92ZSBBZGQgTmV3IGJ1dHRvbiB0byBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgdGhpcy5yZXBvc2l0aW9uQWRkQnV0dG9uKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRvdWJsZS1jbGljayBlZGl0aW5nXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3VzdG9tIGRyYXcgY2FsbGJhY2tcbiAgICAgICAgaWYgKHRoaXMub25EcmF3Q2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRoaXMub25EcmF3Q2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXBvc2l0aW9uIEFkZCBOZXcgYnV0dG9uIHRvIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAqL1xuICAgIHJlcG9zaXRpb25BZGRCdXR0b24oKSB7XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHdyYXBwZXIgPSAkKGAjJHt0aGlzLnRhYmxlSWR9X3dyYXBwZXJgKTtcbiAgICAgICAgY29uc3QgJGxlZnRDb2x1bW4gPSAkd3JhcHBlci5maW5kKCcuZWlnaHQud2lkZS5jb2x1bW4nKS5maXJzdCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRhZGRCdXR0b24ubGVuZ3RoICYmICRsZWZ0Q29sdW1uLmxlbmd0aCAmJiB0aGlzLnBlcm1pc3Npb25zLnNhdmUpIHtcbiAgICAgICAgICAgICRsZWZ0Q29sdW1uLmFwcGVuZCgkYWRkQnV0dG9uKTtcbiAgICAgICAgICAgICRhZGRCdXR0b24uc2hvdygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVsZXRlIGhhbmRsZXIgd2l0aCB0d28tc3RlcCBjb25maXJtYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVsZXRlSGFuZGxlcigpIHtcbiAgICAgICAgLy8gRGVsZXRlU29tZXRoaW5nLmpzIGhhbmRsZXMgZmlyc3QgY2xpY2tcbiAgICAgICAgLy8gV2UgaGFuZGxlIHNlY29uZCBjbGljayB3aGVuIHR3by1zdGVwcy1kZWxldGUgY2xhc3MgaXMgcmVtb3ZlZFxuICAgICAgICB0aGlzLiR0YWJsZS5vbignY2xpY2snLCAnYS5kZWxldGU6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlcihyZWNvcmRJZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBpTW9kdWxlLmRlbGV0ZVJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB0aGlzLmNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY29weSBoYW5kbGVyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNvcHlIYW5kbGVyKCkge1xuICAgICAgICB0aGlzLiR0YWJsZS5vbignY2xpY2snLCAnYS5jb3B5JywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXNlIHNhbWUgbG9naWMgYXMgbW9kaWZ5IFVSTCBidXQgYWRkIGNvcHkgcGFyYW1ldGVyXG4gICAgICAgICAgICBsZXQgY29weVVybDtcbiAgICAgICAgICAgIGlmICh0aGlzLmdldE1vZGlmeVVybCkge1xuICAgICAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gZ2V0TW9kaWZ5VXJsIGFuZCBhZGQgY29weSBwYXJhbWV0ZXJcbiAgICAgICAgICAgICAgICBjb25zdCBtb2RpZnlVcmwgPSB0aGlzLmdldE1vZGlmeVVybChyZWNvcmRJZCk7XG4gICAgICAgICAgICAgICAgaWYgKG1vZGlmeVVybCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgcmVjb3JkSWQgZnJvbSBVUkwgYW5kIGFkZCBjb3B5IHBhcmFtZXRlclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlVXJsID0gbW9kaWZ5VXJsLnJlcGxhY2UoYC8ke3JlY29yZElkfWAsICcnKTtcbiAgICAgICAgICAgICAgICAgICAgY29weVVybCA9IGAke2Jhc2VVcmx9Lz9jb3B5PSR7cmVjb3JkSWR9YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIERlZmF1bHQgVVJMIHBhdHRlcm5cbiAgICAgICAgICAgICAgICBjb3B5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH0ke3RoaXMucm91dGVQcmVmaXh9L21vZGlmeS8/Y29weT0ke3JlY29yZElkfWA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIGNvcHkgVVJMXG4gICAgICAgICAgICBpZiAoY29weVVybCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGNvcHlVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGN1c3RvbSBidXR0b24gaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ3VzdG9tSGFuZGxlcnMoKSB7XG4gICAgICAgIHRoaXMuY3VzdG9tQWN0aW9uQnV0dG9ucy5mb3JFYWNoKGN1c3RvbUJ1dHRvbiA9PiB7XG4gICAgICAgICAgICBpZiAoY3VzdG9tQnV0dG9uLm9uQ2xpY2spIHtcbiAgICAgICAgICAgICAgICB0aGlzLiR0YWJsZS5vbignY2xpY2snLCBgYS4ke2N1c3RvbUJ1dHRvbi5jbGFzc31gLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tQnV0dG9uLm9uQ2xpY2socmVjb3JkSWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgcmVjb3JkIGRlbGV0aW9uXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgdGFibGUgZGF0YSB3aXRoIGNhbGxiYWNrIHN1cHBvcnRcbiAgICAgICAgICAgIGNvbnN0IHJlbG9hZENhbGxiYWNrID0gKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIENhbGwgY3VzdG9tIGFmdGVyLWRlbGV0ZSBjYWxsYmFjayBpZiBwcm92aWRlZFxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5vbkFmdGVyRGVsZXRlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25BZnRlckRlbGV0ZShyZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVsb2FkIHRhYmxlIGFuZCBleGVjdXRlIGNhbGxiYWNrXG4gICAgICAgICAgICB0aGlzLmRhdGFUYWJsZS5hamF4LnJlbG9hZChyZWxvYWRDYWxsYmFjaywgZmFsc2UpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcmVsYXRlZCBjb21wb25lbnRzXG4gICAgICAgICAgICBpZiAodHlwZW9mIEV4dGVuc2lvbnMgIT09ICd1bmRlZmluZWQnICYmIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gU3VjY2VzcyBtZXNzYWdlIHJlbW92ZWQgLSBubyBuZWVkIHRvIHNob3cgc3VjY2VzcyBmb3IgZGVsZXRpb24gb3BlcmF0aW9uc1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJhbnNsYXRpb25zLmRlbGV0ZUVycm9yIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvRGVsZXRlUmVjb3JkO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlIGZyb20gYWxsIGRlbGV0ZSBidXR0b25zXG4gICAgICAgIHRoaXMuJHRhYmxlLmZpbmQoJ2EuZGVsZXRlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkZXIgd2hpbGUgbG9hZGluZyBkYXRhXG4gICAgICovXG4gICAgc2hvd0xvYWRlcigpIHtcbiAgICAgICAgLy8gSGlkZSBldmVyeXRoaW5nIGZpcnN0XG4gICAgICAgIC8vIEZpbmQgdGhlIHRhYmxlJ3MgcGFyZW50IGNvbnRhaW5lciAtIG5lZWQgdGhlIG9yaWdpbmFsIGNvbnRhaW5lciwgbm90IHRoZSBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgY29uc3QgJHdyYXBwZXIgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCdkaXZbaWQkPVwiX3dyYXBwZXJcIl0nKTtcbiAgICAgICAgbGV0ICRjb250YWluZXI7XG4gICAgICAgIGlmICgkd3JhcHBlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgcGFyZW50IG9mIHRoZSB3cmFwcGVyIChzaG91bGQgYmUgdGhlIG9yaWdpbmFsIGNvbnRhaW5lcilcbiAgICAgICAgICAgICRjb250YWluZXIgPSAkd3JhcHBlci5wYXJlbnQoJ2RpdltpZF0nKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGYWxsYmFjayBpZiBzdHJ1Y3R1cmUgaXMgZGlmZmVyZW50XG4gICAgICAgIGlmICghJGNvbnRhaW5lciB8fCAhJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICRjb250YWluZXIgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCdkaXZbaWRdOm5vdChbaWQkPVwiX3dyYXBwZXJcIl0pJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgJHBsYWNlaG9sZGVyID0gJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJyk7XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgXG4gICAgICAgICRjb250YWluZXIuaGlkZSgpO1xuICAgICAgICAkcGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAkYWRkQnV0dG9uLmhpZGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBhbmQgc2hvdyBsb2FkZXIgaWYgbm90IGV4aXN0c1xuICAgICAgICBsZXQgJGxvYWRlciA9ICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpO1xuICAgICAgICBpZiAoISRsb2FkZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBzZWdtZW50IHdpdGggbG9hZGVyIGZvciBiZXR0ZXIgdmlzdWFsIGFwcGVhcmFuY2VcbiAgICAgICAgICAgICRsb2FkZXIgPSAkKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVwidGFibGUtZGF0YS1sb2FkZXJcIiBjbGFzcz1cInVpIHNlZ21lbnRcIiBzdHlsZT1cIm1pbi1oZWlnaHQ6IDIwMHB4OyBwb3NpdGlvbjogcmVsYXRpdmU7XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3RpdmUgaW52ZXJ0ZWQgZGltbWVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dCBsb2FkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leF9Mb2FkaW5nRGF0YSB8fCAnTG9hZGluZy4uLid9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAvLyBJbnNlcnQgbG9hZGVyIGluIHRoZSBhcHByb3ByaWF0ZSBwbGFjZVxuICAgICAgICAgICAgaWYgKCRjb250YWluZXIubGVuZ3RoICYmICRjb250YWluZXIucGFyZW50KCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5iZWZvcmUoJGxvYWRlcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGggJiYgJHBsYWNlaG9sZGVyLnBhcmVudCgpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5iZWZvcmUoJGxvYWRlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBhcHBlbmQgdG8gYm9keSBvciBwYXJlbnQgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgY29uc3QgJHBhcmVudCA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJy5wdXNoZXInKSB8fCB0aGlzLiR0YWJsZS5wYXJlbnQoKTtcbiAgICAgICAgICAgICAgICAkcGFyZW50LmFwcGVuZCgkbG9hZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkbG9hZGVyLnNob3coKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBsb2FkZXJcbiAgICAgKi9cbiAgICBoaWRlTG9hZGVyKCkge1xuICAgICAgICAkKCcjdGFibGUtZGF0YS1sb2FkZXInKS5oaWRlKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBlbXB0eSB0YWJsZSBwbGFjZWhvbGRlciB2aXNpYmlsaXR5XG4gICAgICovXG4gICAgdG9nZ2xlRW1wdHlQbGFjZWhvbGRlcihpc0VtcHR5KSB7XG4gICAgICAgIC8vIEZpbmQgdGhlIHRhYmxlJ3MgcGFyZW50IGNvbnRhaW5lciAtIG5lZWQgdGhlIG9yaWdpbmFsIGNvbnRhaW5lciwgbm90IHRoZSBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgLy8gRGF0YVRhYmxlcyB3cmFwcyB0aGUgdGFibGUgaW4gYSBkaXYgd2l0aCBpZCBlbmRpbmcgaW4gJ193cmFwcGVyJ1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGZpbmQgdGhlIHBhcmVudCBvZiB0aGF0IHdyYXBwZXIgd2hpY2ggaXMgdGhlIG9yaWdpbmFsIGNvbnRhaW5lclxuICAgICAgICBjb25zdCAkd3JhcHBlciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZCQ9XCJfd3JhcHBlclwiXScpO1xuICAgICAgICBsZXQgJGNvbnRhaW5lcjtcbiAgICAgICAgaWYgKCR3cmFwcGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBwYXJlbnQgb2YgdGhlIHdyYXBwZXIgKHNob3VsZCBiZSB0aGUgb3JpZ2luYWwgY29udGFpbmVyKVxuICAgICAgICAgICAgJGNvbnRhaW5lciA9ICR3cmFwcGVyLnBhcmVudCgnZGl2W2lkXScpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZhbGxiYWNrIGlmIHN0cnVjdHVyZSBpcyBkaWZmZXJlbnRcbiAgICAgICAgaWYgKCEkY29udGFpbmVyIHx8ICEkY29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgJGNvbnRhaW5lciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZF06bm90KFtpZCQ9XCJfd3JhcHBlclwiXSknKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRwbGFjZWhvbGRlciA9ICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRW1wdHkpIHtcbiAgICAgICAgICAgICRjb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgJGFkZEJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgcGxhY2Vob2xkZXIgaXMgdmlzaWJsZVxuICAgICAgICAgICAgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkcGxhY2Vob2xkZXIuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkcGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvbnMuc2F2ZSkge1xuICAgICAgICAgICAgICAgICRhZGRCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGNvbnRhaW5lci5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgKiBFeGNsdWRlcyBhY3Rpb24gYnV0dG9uIGNlbGxzIHRvIGF2b2lkIGNvbmZsaWN0c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKSB7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9uKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmRhdGFUYWJsZS5yb3coZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCk7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHJlY29yZCBJRCAtIGNoZWNrIGZvciBib3RoIHVuaXFpZCBhbmQgaWQgZmllbGRzXG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9IGRhdGEgJiYgKGRhdGEudW5pcWlkIHx8IGRhdGEuaWQpO1xuICAgICAgICAgICAgaWYgKHJlY29yZElkICYmICh0aGlzLnBlcm1pc3Npb25zLm1vZGlmeSB8fCB0aGlzLnBlcm1pc3Npb25zLmVkaXQpKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBnZXRNb2RpZnlVcmwgaWYgcHJvdmlkZWQsIG90aGVyd2lzZSB1c2UgZGVmYXVsdFxuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsID8gXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0TW9kaWZ5VXJsKHJlY29yZElkKSA6IFxuICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxSb290VXJsfSR7dGhpcy5yb3V0ZVByZWZpeH0vbW9kaWZ5LyR7cmVjb3JkSWR9YDtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBtb2RpZnlVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSB1bmlmaWVkIGRlc2NyaXB0aW9uIHJlbmRlcmVyIHdpdGggdHJ1bmNhdGlvbiBzdXBwb3J0XG4gICAgICogXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZW5kZXJlciBmdW5jdGlvbiBmb3IgRGF0YVRhYmxlc1xuICAgICAqL1xuICAgIGNyZWF0ZURlc2NyaXB0aW9uUmVuZGVyZXIoKSB7XG4gICAgICAgIHJldHVybiAoZGF0YSwgdHlwZSwgcm93KSA9PiB7XG4gICAgICAgICAgICBpZiAoIWRhdGEgfHwgZGF0YS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICfigJQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Rpc3BsYXknKSB7XG4gICAgICAgICAgICAgICAgLy8gRXNjYXBlIEhUTUwgdG8gcHJldmVudCBYU1NcbiAgICAgICAgICAgICAgICBjb25zdCBzYWZlRGVzYyA9IHdpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRpb25MaW5lcyA9IHNhZmVEZXNjLnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKSAhPT0gJycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBtYXggbGluZXNcbiAgICAgICAgICAgICAgICBsZXQgbWF4TGluZXMgPSB0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MubWF4TGluZXM7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5keW5hbWljSGVpZ2h0ICYmIHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5jYWxjdWxhdGVMaW5lcykge1xuICAgICAgICAgICAgICAgICAgICBtYXhMaW5lcyA9IHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5jYWxjdWxhdGVMaW5lcyhyb3cpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZGVzY3JpcHRpb25MaW5lcy5sZW5ndGggPD0gbWF4TGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVzY3JpcHRpb24gZml0cyAtIHNob3cgd2l0aCBwcmVzZXJ2ZWQgZm9ybWF0dGluZ1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREZXNjID0gZGVzY3JpcHRpb25MaW5lcy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uLXRleHRcIiBzdHlsZT1cImxpbmUtaGVpZ2h0OiAxLjM7XCI+JHtmb3JtYXR0ZWREZXNjfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVzY3JpcHRpb24gdG9vIGxvbmcgLSB0cnVuY2F0ZSB3aXRoIHBvcHVwXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpc2libGVMaW5lcyA9IGRlc2NyaXB0aW9uTGluZXMuc2xpY2UoMCwgbWF4TGluZXMpO1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlTGluZXNbbWF4TGluZXMgLSAxXSArPSAnLi4uJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZERlc2MgPSB2aXNpYmxlTGluZXMuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsRGVzYyA9IGRlc2NyaXB0aW9uTGluZXMuam9pbignXFxuJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvbi10ZXh0IHRydW5jYXRlZCBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtmdWxsRGVzY31cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBvc2l0aW9uPVwidG9wIHJpZ2h0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJ3aWRlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogaGVscDsgYm9yZGVyLWJvdHRvbTogMXB4IGRvdHRlZCAjOTk5OyBsaW5lLWhlaWdodDogMS4zO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHt0cnVuY2F0ZWREZXNjfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIHNlYXJjaCBhbmQgb3RoZXIgb3BlcmF0aW9ucywgcmV0dXJuIHBsYWluIHRleHRcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IHRoZSBEYXRhVGFibGUgYW5kIGNsZWFudXBcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBSZW1vdmUgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJyk7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9mZignY2xpY2snLCAnYS5jb3B5Jyk7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9mZignZGJsY2xpY2snLCAndGJvZHkgdGQ6bm90KC5yaWdodC5hbGlnbmVkKScpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBEYXRhVGFibGUgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0aGlzLmRhdGFUYWJsZSAmJiB0eXBlb2YgdGhpcy5kYXRhVGFibGUuZGVzdHJveSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhpcy5kYXRhVGFibGUuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGVyXG4gICAgICAgICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpLnJlbW92ZSgpO1xuICAgIH1cbn1cblxuLy8gTWFrZSBhdmFpbGFibGUgZ2xvYmFsbHlcbndpbmRvdy5QYnhEYXRhVGFibGVJbmRleCA9IFBieERhdGFUYWJsZUluZGV4OyJdfQ==