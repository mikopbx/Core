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
        var recordId = $(e.currentTarget).attr('data-value'); // Redirect to modify page with copy parameter

        window.location = "".concat(globalRootUrl).concat(_this4.routePrefix, "/modify/?copy=").concat(recordId);
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
        } // Show success message if configured


        if (this.showSuccessMessages && this.translations.deleteSuccess) {
          UserMessage.showSuccess(this.translations.deleteSuccess);
        }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1BieERhdGFUYWJsZUluZGV4LmpzIl0sIm5hbWVzIjpbIlBieERhdGFUYWJsZUluZGV4IiwiY29uZmlnIiwidGFibGVJZCIsImFwaU1vZHVsZSIsInJvdXRlUHJlZml4IiwidHJhbnNsYXRpb25zIiwiY29sdW1ucyIsInNob3dTdWNjZXNzTWVzc2FnZXMiLCJzaG93SW5mbyIsIm9yZGVyYWJsZSIsInVuZGVmaW5lZCIsIm9yZGVyIiwicGVybWlzc2lvbnMiLCJzYXZlIiwibW9kaWZ5IiwiZWRpdCIsImNvcHkiLCJjdXN0b20iLCJhY3Rpb25CdXR0b25zIiwiY3VzdG9tQWN0aW9uQnV0dG9ucyIsImRlc2NyaXB0aW9uU2V0dGluZ3MiLCJPYmplY3QiLCJhc3NpZ24iLCJtYXhMaW5lcyIsImR5bmFtaWNIZWlnaHQiLCJjYWxjdWxhdGVMaW5lcyIsIiR0YWJsZSIsIiQiLCJkYXRhVGFibGUiLCJvbkRhdGFMb2FkZWQiLCJvbkRyYXdDYWxsYmFjayIsIm9uUGVybWlzc2lvbnNMb2FkZWQiLCJjdXN0b21EZWxldGVIYW5kbGVyIiwib25BZnRlckRlbGV0ZSIsImdldE1vZGlmeVVybCIsImFqYXhEYXRhIiwic2hvd0xvYWRlciIsImxvYWRQZXJtaXNzaW9ucyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJlcnJvciIsImNvbnNvbGUiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X0Vycm9ySW5pdGlhbGl6aW5nVGFibGUiLCJoaWRlTG9hZGVyIiwidG9nZ2xlRW1wdHlQbGFjZWhvbGRlciIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJtZXRob2QiLCJkYXRhIiwiY29udHJvbGxlciIsImRhdGFUeXBlIiwic3VjY2VzcyIsIndhcm4iLCJhZGRDbGFzcyIsInByb2Nlc3NlZENvbHVtbnMiLCJwcm9jZXNzQ29sdW1ucyIsImVuZHBvaW50cyIsImdldExpc3QiLCJ0eXBlIiwiZGF0YVNyYyIsImpzb24iLCJoYW5kbGVEYXRhTG9hZCIsInhociIsInRocm93biIsImV4X0Vycm9yTG9hZGluZ0RhdGEiLCJvcmRlcmluZyIsImxlbmd0aENoYW5nZSIsInBhZ2luZyIsInNlYXJjaGluZyIsImluZm8iLCJsYW5ndWFnZSIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiZGF0YVRhYmxlTG9jYWxpc2F0aW9uIiwiZHJhd0NhbGxiYWNrIiwiaGFuZGxlRHJhd0NhbGxiYWNrIiwiRGF0YVRhYmxlIiwiaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIiLCJpbml0aWFsaXplQ29weUhhbmRsZXIiLCJpbml0aWFsaXplQ3VzdG9tSGFuZGxlcnMiLCJmb3JFYWNoIiwiY29sIiwiZmluZCIsImlzQWN0aW9uQ29sdW1uIiwicHVzaCIsImNyZWF0ZUFjdGlvbkNvbHVtbiIsInNlYXJjaGFibGUiLCJjbGFzc05hbWUiLCJyZW5kZXIiLCJyb3ciLCJidXR0b25zIiwicmVjb3JkSWQiLCJ1bmlxaWQiLCJpZCIsImluY2x1ZGVzIiwibW9kaWZ5VXJsIiwiYnRfVG9vbFRpcEVkaXQiLCJidF9Ub29sVGlwQ29weSIsImN1c3RvbUJ1dHRvbiIsIm5hbWUiLCJocmVmIiwiZGF0YVZhbHVlIiwiaW5jbHVkZUlkIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJ0b29sdGlwIiwiaWNvbiIsImJ0X1Rvb2xUaXBEZWxldGUiLCJsZW5ndGgiLCJqb2luIiwiaXNFbXB0eSIsInJlc3VsdCIsInBvcHVwIiwicmVwb3NpdGlvbkFkZEJ1dHRvbiIsImluaXRpYWxpemVEb3VibGVDbGlja0VkaXQiLCIkYWRkQnV0dG9uIiwiJHdyYXBwZXIiLCIkbGVmdENvbHVtbiIsImZpcnN0IiwiYXBwZW5kIiwic2hvdyIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCJhdHRyIiwiZGVsZXRlUmVjb3JkIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsIndpbmRvdyIsImxvY2F0aW9uIiwib25DbGljayIsInJlbG9hZENhbGxiYWNrIiwicmVsb2FkIiwiRXh0ZW5zaW9ucyIsImNiT25EYXRhQ2hhbmdlZCIsImRlbGV0ZVN1Y2Nlc3MiLCJzaG93U3VjY2VzcyIsImVycm9yTWVzc2FnZSIsIm1lc3NhZ2VzIiwiZGVsZXRlRXJyb3IiLCJleF9JbXBvc3NpYmxlVG9EZWxldGVSZWNvcmQiLCJyZW1vdmVDbGFzcyIsImNsb3Nlc3QiLCIkY29udGFpbmVyIiwicGFyZW50IiwiJHBsYWNlaG9sZGVyIiwiaGlkZSIsIiRsb2FkZXIiLCJleF9Mb2FkaW5nRGF0YSIsImJlZm9yZSIsIiRwYXJlbnQiLCJ0cmltIiwic2FmZURlc2MiLCJkZXNjcmlwdGlvbkxpbmVzIiwic3BsaXQiLCJmaWx0ZXIiLCJsaW5lIiwiZm9ybWF0dGVkRGVzYyIsInZpc2libGVMaW5lcyIsInNsaWNlIiwidHJ1bmNhdGVkRGVzYyIsImZ1bGxEZXNjIiwib2ZmIiwiZGVzdHJveSIsInJlbW92ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsaUI7QUFDRjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSSw2QkFBWUMsTUFBWixFQUFvQjtBQUFBOztBQUNoQjtBQUNBLFNBQUtDLE9BQUwsR0FBZUQsTUFBTSxDQUFDQyxPQUF0QjtBQUNBLFNBQUtDLFNBQUwsR0FBaUJGLE1BQU0sQ0FBQ0UsU0FBeEI7QUFDQSxTQUFLQyxXQUFMLEdBQW1CSCxNQUFNLENBQUNH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WixDQUFnQixPQUFoQixFQUF5QixRQUF6QjtBQUNBLFdBQUs1SSxNQUFMLENBQVk0SSxHQUFaLENBQWdCLFVBQWhCLEVBQTRCLDhCQUE1QixFQUpNLENBTU47O0FBQ0EsVUFBSSxLQUFLMUksU0FBTCxJQUFrQixPQUFPLEtBQUtBLFNBQUwsQ0FBZTJJLE9BQXRCLEtBQWtDLFVBQXhELEVBQW9FO0FBQ2hFLGFBQUszSSxTQUFMLENBQWUySSxPQUFmO0FBQ0gsT0FUSyxDQVdOOzs7QUFDQTVJLE1BQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCNkksTUFBeEI7QUFDSDs7OztLQUdMOzs7QUFDQXBDLE1BQU0sQ0FBQ3BJLGlCQUFQLEdBQTJCQSxpQkFBM0IiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgU2VtYW50aWNMb2NhbGl6YXRpb24sIGdsb2JhbFRyYW5zbGF0ZSwgVXNlck1lc3NhZ2UsIEV4dGVuc2lvbnMsIFNlY3VyaXR5VXRpbHMgKi9cblxuLyoqXG4gKiBCYXNlIGNsYXNzIGZvciBNaWtvUEJYIGluZGV4IHRhYmxlIG1hbmFnZW1lbnQgd2l0aCBBQ0wgc3VwcG9ydFxuICogXG4gKiBQcm92aWRlcyBjb21tb24gZnVuY3Rpb25hbGl0eSBmb3IgRGF0YVRhYmxlLWJhc2VkIGluZGV4IHBhZ2VzIGluY2x1ZGluZzpcbiAqIC0gU2VydmVyLXNpZGUgQUNMIHBlcm1pc3Npb24gY2hlY2tpbmdcbiAqIC0gRHluYW1pYyBhY3Rpb24gYnV0dG9uIHJlbmRlcmluZyBiYXNlZCBvbiBwZXJtaXNzaW9uc1xuICogLSBVbmlmaWVkIGRlc2NyaXB0aW9uIHRydW5jYXRpb24gd2l0aCBwb3B1cCBzdXBwb3J0XG4gKiAtIENvcHkgZnVuY3Rpb25hbGl0eSBzdXBwb3J0XG4gKiAtIEN1c3RvbSBhY3Rpb24gYnV0dG9uc1xuICogLSBUd28tc3RlcCBkZWxldGUgY29uZmlybWF0aW9uXG4gKiAtIERvdWJsZS1jbGljayBlZGl0aW5nXG4gKiBcbiAqIEBjbGFzcyBQYnhEYXRhVGFibGVJbmRleFxuICovXG5jbGFzcyBQYnhEYXRhVGFibGVJbmRleCB7XG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGEgbmV3IFBieERhdGFUYWJsZUluZGV4IGluc3RhbmNlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbmZpZy50YWJsZUlkIC0gSFRNTCB0YWJsZSBlbGVtZW50IElEXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZy5hcGlNb2R1bGUgLSBBUEkgbW9kdWxlIGZvciBkYXRhIG9wZXJhdGlvbnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLnJvdXRlUHJlZml4IC0gVVJMIHJvdXRlIHByZWZpeCAoZS5nLiwgJ2NhbGwtcXVldWVzJylcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnLnRyYW5zbGF0aW9ucyAtIFRyYW5zbGF0aW9uIGtleXMgZm9yIG1lc3NhZ2VzXG4gICAgICogQHBhcmFtIHtBcnJheX0gY29uZmlnLmNvbHVtbnMgLSBEYXRhVGFibGUgY29sdW1uIGRlZmluaXRpb25zXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNob3dTdWNjZXNzTWVzc2FnZXM9ZmFsc2VdIC0gU2hvdyBzdWNjZXNzIG1lc3NhZ2VzIG9uIGRlbGV0ZVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5zaG93SW5mbz1mYWxzZV0gLSBTaG93IERhdGFUYWJsZSBpbmZvXG4gICAgICogQHBhcmFtIHtBcnJheX0gW2NvbmZpZy5hY3Rpb25CdXR0b25zPVsnZWRpdCcsICdkZWxldGUnXV0gLSBTdGFuZGFyZCBhY3Rpb24gYnV0dG9ucyB0byBzaG93XG4gICAgICogQHBhcmFtIHtBcnJheX0gW2NvbmZpZy5jdXN0b21BY3Rpb25CdXR0b25zPVtdXSAtIEN1c3RvbSBhY3Rpb24gYnV0dG9uIGRlZmluaXRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IFtjb25maWcuZGVzY3JpcHRpb25TZXR0aW5nc10gLSBEZXNjcmlwdGlvbiB0cnVuY2F0aW9uIHNldHRpbmdzXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5vbkRhdGFMb2FkZWRdIC0gQ2FsbGJhY2sgYWZ0ZXIgZGF0YSBsb2FkZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLm9uRHJhd0NhbGxiYWNrXSAtIENhbGxiYWNrIGFmdGVyIHRhYmxlIGRyYXdcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLm9uUGVybWlzc2lvbnNMb2FkZWRdIC0gQ2FsbGJhY2sgYWZ0ZXIgcGVybWlzc2lvbnMgbG9hZGVkXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5jdXN0b21EZWxldGVIYW5kbGVyXSAtIEN1c3RvbSBkZWxldGUgaGFuZGxlclxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25BZnRlckRlbGV0ZV0gLSBDYWxsYmFjayBhZnRlciBzdWNjZXNzZnVsIGRlbGV0aW9uXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5nZXRNb2RpZnlVcmxdIC0gQ3VzdG9tIFVSTCBnZW5lcmF0b3IgZm9yIG1vZGlmeS9lZGl0IGFjdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcub3JkZXJhYmxlPXRydWVdIC0gRW5hYmxlL2Rpc2FibGUgc29ydGluZyBmb3IgYWxsIGNvbHVtbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLm9yZGVyPVtbMCwgJ2FzYyddXV0gLSBEZWZhdWx0IHNvcnQgb3JkZXJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5hamF4RGF0YV0gLSBBZGRpdGlvbmFsIGRhdGEgcGFyYW1ldGVycyBmb3IgQUpBWCByZXF1ZXN0c1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZykge1xuICAgICAgICAvLyBDb3JlIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy50YWJsZUlkID0gY29uZmlnLnRhYmxlSWQ7XG4gICAgICAgIHRoaXMuYXBpTW9kdWxlID0gY29uZmlnLmFwaU1vZHVsZTtcbiAgICAgICAgdGhpcy5yb3V0ZVByZWZpeCA9IGNvbmZpZy5yb3V0ZVByZWZpeDtcbiAgICAgICAgdGhpcy50cmFuc2xhdGlvbnMgPSBjb25maWcudHJhbnNsYXRpb25zIHx8IHt9O1xuICAgICAgICB0aGlzLmNvbHVtbnMgPSBjb25maWcuY29sdW1ucyB8fCBbXTtcbiAgICAgICAgdGhpcy5zaG93U3VjY2Vzc01lc3NhZ2VzID0gY29uZmlnLnNob3dTdWNjZXNzTWVzc2FnZXMgfHwgZmFsc2U7XG4gICAgICAgIHRoaXMuc2hvd0luZm8gPSBjb25maWcuc2hvd0luZm8gfHwgZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBTb3J0aW5nIGNvbmZpZ3VyYXRpb24gKGJhY2t3YXJkIGNvbXBhdGlibGUpXG4gICAgICAgIHRoaXMub3JkZXJhYmxlID0gY29uZmlnLm9yZGVyYWJsZSAhPT0gdW5kZWZpbmVkID8gY29uZmlnLm9yZGVyYWJsZSA6IHRydWU7XG4gICAgICAgIHRoaXMub3JkZXIgPSBjb25maWcub3JkZXIgfHwgW1swLCAnYXNjJ11dO1xuICAgICAgICBcbiAgICAgICAgLy8gUGVybWlzc2lvbiBzdGF0ZSAobG9hZGVkIGZyb20gc2VydmVyKVxuICAgICAgICB0aGlzLnBlcm1pc3Npb25zID0ge1xuICAgICAgICAgICAgc2F2ZTogZmFsc2UsXG4gICAgICAgICAgICBtb2RpZnk6IGZhbHNlLFxuICAgICAgICAgICAgZWRpdDogZmFsc2UsXG4gICAgICAgICAgICBkZWxldGU6IGZhbHNlLFxuICAgICAgICAgICAgY29weTogZmFsc2UsXG4gICAgICAgICAgICBjdXN0b206IHt9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBY3Rpb24gYnV0dG9ucyBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMuYWN0aW9uQnV0dG9ucyA9IGNvbmZpZy5hY3Rpb25CdXR0b25zIHx8IFsnZWRpdCcsICdkZWxldGUnXTtcbiAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zID0gY29uZmlnLmN1c3RvbUFjdGlvbkJ1dHRvbnMgfHwgW107XG4gICAgICAgIFxuICAgICAgICAvLyBEZXNjcmlwdGlvbiB0cnVuY2F0aW9uIHNldHRpbmdzXG4gICAgICAgIHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgbWF4TGluZXM6IDMsXG4gICAgICAgICAgICBkeW5hbWljSGVpZ2h0OiBmYWxzZSxcbiAgICAgICAgICAgIGNhbGN1bGF0ZUxpbmVzOiBudWxsXG4gICAgICAgIH0sIGNvbmZpZy5kZXNjcmlwdGlvblNldHRpbmdzIHx8IHt9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEludGVybmFsIHByb3BlcnRpZXNcbiAgICAgICAgdGhpcy4kdGFibGUgPSAkKGAjJHt0aGlzLnRhYmxlSWR9YCk7XG4gICAgICAgIHRoaXMuZGF0YVRhYmxlID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBPcHRpb25hbCBjYWxsYmFja3NcbiAgICAgICAgdGhpcy5vbkRhdGFMb2FkZWQgPSBjb25maWcub25EYXRhTG9hZGVkO1xuICAgICAgICB0aGlzLm9uRHJhd0NhbGxiYWNrID0gY29uZmlnLm9uRHJhd0NhbGxiYWNrO1xuICAgICAgICB0aGlzLm9uUGVybWlzc2lvbnNMb2FkZWQgPSBjb25maWcub25QZXJtaXNzaW9uc0xvYWRlZDtcbiAgICAgICAgdGhpcy5jdXN0b21EZWxldGVIYW5kbGVyID0gY29uZmlnLmN1c3RvbURlbGV0ZUhhbmRsZXI7XG4gICAgICAgIHRoaXMub25BZnRlckRlbGV0ZSA9IGNvbmZpZy5vbkFmdGVyRGVsZXRlO1xuICAgICAgICB0aGlzLmdldE1vZGlmeVVybCA9IGNvbmZpZy5nZXRNb2RpZnlVcmw7XG4gICAgICAgIHRoaXMuYWpheERhdGEgPSBjb25maWcuYWpheERhdGEgfHwge307XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZSB3aXRoIHBlcm1pc3Npb24gbG9hZGluZ1xuICAgICAqL1xuICAgIGFzeW5jIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBTaG93IGxvYWRlciB3aGlsZSBpbml0aWFsaXppbmdcbiAgICAgICAgICAgIHRoaXMuc2hvd0xvYWRlcigpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaXJzdCwgbG9hZCBwZXJtaXNzaW9ucyBmcm9tIHNlcnZlclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5sb2FkUGVybWlzc2lvbnMoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBEYXRhVGFibGUgKHdpbGwgaGFuZGxlIGxvYWRlci9lbXB0eSBzdGF0ZSBpbiBkYXRhIGNhbGxiYWNrKVxuICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplRGF0YVRhYmxlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBQYnhEYXRhVGFibGVJbmRleDonLCBlcnJvcik7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4X0Vycm9ySW5pdGlhbGl6aW5nVGFibGUgfHwgJ0ZhaWxlZCB0byBpbml0aWFsaXplIHRhYmxlJyk7XG4gICAgICAgICAgICB0aGlzLmhpZGVMb2FkZXIoKTtcbiAgICAgICAgICAgIHRoaXMudG9nZ2xlRW1wdHlQbGFjZWhvbGRlcih0cnVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIHBlcm1pc3Npb25zIGZyb20gc2VydmVyXG4gICAgICovXG4gICAgYXN5bmMgbG9hZFBlcm1pc3Npb25zKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCAkLmFqYXgoe1xuICAgICAgICAgICAgICAgIHVybDogYCR7Z2xvYmFsUm9vdFVybH1hY2wvY2hlY2tQZXJtaXNzaW9uc2AsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRyb2xsZXI6IHRoaXMucm91dGVQcmVmaXhcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbidcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3VjY2VzcyAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLnBlcm1pc3Npb25zLCByZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vblBlcm1pc3Npb25zTG9hZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub25QZXJtaXNzaW9uc0xvYWRlZCh0aGlzLnBlcm1pc3Npb25zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byBsb2FkIHBlcm1pc3Npb25zLCB1c2luZyBkZWZhdWx0czonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBPbiBlcnJvciwgZGVmYXVsdCB0byBubyBwZXJtaXNzaW9ucyBmb3Igc2FmZXR5XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBEYXRhVGFibGUgd2l0aCBjb21tb24gY29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGluaXRpYWxpemVEYXRhVGFibGUoKSB7XG4gICAgICAgIC8vIEFkZCB0aGUgZGF0YXRhYmxlLXdpZHRoLWNvbnN0cmFpbmVkIGNsYXNzIHRvIHRoZSB0YWJsZVxuICAgICAgICB0aGlzLiR0YWJsZS5hZGRDbGFzcygnZGF0YXRhYmxlLXdpZHRoLWNvbnN0cmFpbmVkJyk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBwcm9jZXNzZWRDb2x1bW5zID0gdGhpcy5wcm9jZXNzQ29sdW1ucygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgY29uZmlnID0ge1xuICAgICAgICAgICAgYWpheDoge1xuICAgICAgICAgICAgICAgIHVybDogdGhpcy5hcGlNb2R1bGUuZW5kcG9pbnRzLmdldExpc3QsXG4gICAgICAgICAgICAgICAgdHlwZTogJ0dFVCcsXG4gICAgICAgICAgICAgICAgZGF0YTogdGhpcy5hamF4RGF0YSxcbiAgICAgICAgICAgICAgICBkYXRhU3JjOiAoanNvbikgPT4gdGhpcy5oYW5kbGVEYXRhTG9hZChqc29uKSxcbiAgICAgICAgICAgICAgICBlcnJvcjogKHhociwgZXJyb3IsIHRocm93bikgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhpZGVMb2FkZXIoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZ2xvYmFsVHJhbnNsYXRlLmV4X0Vycm9yTG9hZGluZ0RhdGEgfHwgJ0ZhaWxlZCB0byBsb2FkIGRhdGEnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29sdW1uczogcHJvY2Vzc2VkQ29sdW1ucyxcbiAgICAgICAgICAgIG9yZGVyOiB0aGlzLm9yZGVyLFxuICAgICAgICAgICAgb3JkZXJpbmc6IHRoaXMub3JkZXJhYmxlLFxuICAgICAgICAgICAgbGVuZ3RoQ2hhbmdlOiBmYWxzZSxcbiAgICAgICAgICAgIHBhZ2luZzogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hpbmc6IHRydWUsXG4gICAgICAgICAgICBpbmZvOiB0aGlzLnNob3dJbmZvLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjazogKCkgPT4gdGhpcy5oYW5kbGVEcmF3Q2FsbGJhY2soKVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB0aGlzLiR0YWJsZS5EYXRhVGFibGUoY29uZmlnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGVsZXRlSGFuZGxlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDb3B5SGFuZGxlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDdXN0b21IYW5kbGVycygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGNvbHVtbiBkZWZpbml0aW9ucyBhbmQgYWRkIGFjdGlvbiBjb2x1bW4gaWYgbmVlZGVkXG4gICAgICovXG4gICAgcHJvY2Vzc0NvbHVtbnMoKSB7XG4gICAgICAgIGNvbnN0IGNvbHVtbnMgPSBbLi4udGhpcy5jb2x1bW5zXTtcbiAgICAgICAgXG4gICAgICAgIC8vIElmIHNvcnRpbmcgaXMgZ2xvYmFsbHkgZGlzYWJsZWQsIGVuc3VyZSBhbGwgY29sdW1ucyByZXNwZWN0IGl0XG4gICAgICAgIGlmICghdGhpcy5vcmRlcmFibGUpIHtcbiAgICAgICAgICAgIGNvbHVtbnMuZm9yRWFjaChjb2wgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFByZXNlcnZlIGV4cGxpY2l0IG9yZGVyYWJsZTogZmFsc2UsIGJ1dCBvdmVycmlkZSB0cnVlIG9yIHVuZGVmaW5lZFxuICAgICAgICAgICAgICAgIGlmIChjb2wub3JkZXJhYmxlICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICBjb2wub3JkZXJhYmxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBzdGFuZGFyZCBhY3Rpb24gY29sdW1uIGlmIG5vdCBhbHJlYWR5IHByZXNlbnRcbiAgICAgICAgaWYgKCFjb2x1bW5zLmZpbmQoY29sID0+IGNvbC5pc0FjdGlvbkNvbHVtbikpIHtcbiAgICAgICAgICAgIGNvbHVtbnMucHVzaCh0aGlzLmNyZWF0ZUFjdGlvbkNvbHVtbigpKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGNvbHVtbnM7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBzdGFuZGFyZCBhY3Rpb24gY29sdW1uIHdpdGggcGVybWlzc2lvbi1iYXNlZCByZW5kZXJpbmdcbiAgICAgKi9cbiAgICBjcmVhdGVBY3Rpb25Db2x1bW4oKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBkYXRhOiBudWxsLFxuICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGFibGU6IGZhbHNlLFxuICAgICAgICAgICAgY2xhc3NOYW1lOiAncmlnaHQgYWxpZ25lZCBjb2xsYXBzaW5nJyxcbiAgICAgICAgICAgIGlzQWN0aW9uQ29sdW1uOiB0cnVlLFxuICAgICAgICAgICAgcmVuZGVyOiAoZGF0YSwgdHlwZSwgcm93KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgYnV0dG9ucyA9IFtdO1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgcmVjb3JkIElEIC0gY2hlY2sgZm9yIGJvdGggdW5pcWlkIGFuZCBpZCBmaWVsZHNcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9IHJvdy51bmlxaWQgfHwgcm93LmlkIHx8ICcnO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEVkaXQgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uQnV0dG9ucy5pbmNsdWRlcygnZWRpdCcpICYmIFxuICAgICAgICAgICAgICAgICAgICAodGhpcy5wZXJtaXNzaW9ucy5tb2RpZnkgfHwgdGhpcy5wZXJtaXNzaW9ucy5lZGl0KSkge1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBnZXRNb2RpZnlVcmwgaWYgcHJvdmlkZWQsIG90aGVyd2lzZSB1c2UgZGVmYXVsdFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RpZnlVcmwgPSB0aGlzLmdldE1vZGlmeVVybCA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRNb2RpZnlVcmwocmVjb3JkSWQpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxSb290VXJsfSR7dGhpcy5yb3V0ZVByZWZpeH0vbW9kaWZ5LyR7cmVjb3JkSWR9YDtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiJHttb2RpZnlVcmx9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBlZGl0IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBFZGl0fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBlZGl0IGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDb3B5IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdGlvbkJ1dHRvbnMuaW5jbHVkZXMoJ2NvcHknKSAmJiB0aGlzLnBlcm1pc3Npb25zLmNvcHkpIHtcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtyZWNvcmRJZH1cIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gY29weSBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwQ29weX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gY29weSBvdXRsaW5lIGJsdWVcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBDdXN0b20gYnV0dG9uc1xuICAgICAgICAgICAgICAgIHRoaXMuY3VzdG9tQWN0aW9uQnV0dG9ucy5mb3JFYWNoKGN1c3RvbUJ1dHRvbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnBlcm1pc3Npb25zLmN1c3RvbSAmJiB0aGlzLnBlcm1pc3Npb25zLmN1c3RvbVtjdXN0b21CdXR0b24ubmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhyZWYgPSBjdXN0b21CdXR0b24uaHJlZiB8fCAnIyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhVmFsdWUgPSBjdXN0b21CdXR0b24uaW5jbHVkZUlkID8gYGRhdGEtdmFsdWU9XCIke3JlY29yZElkfVwiYCA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiJHtocmVmfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICR7ZGF0YVZhbHVlfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uICR7Y3VzdG9tQnV0dG9uLmNsYXNzfSBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoY3VzdG9tQnV0dG9uLnRvb2x0aXApfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cIiR7Y3VzdG9tQnV0dG9uLmljb259XCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRGVsZXRlIGJ1dHRvbiAoYWx3YXlzIGxhc3QpXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uQnV0dG9ucy5pbmNsdWRlcygnZGVsZXRlJykgJiYgdGhpcy5wZXJtaXNzaW9ucy5kZWxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhbHVlPVwiJHtyZWNvcmRJZH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZSB0d28tc3RlcHMtZGVsZXRlIHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBEZWxldGV9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIHRyYXNoIHJlZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiBidXR0b25zLmxlbmd0aCA+IDAgPyBcbiAgICAgICAgICAgICAgICAgICAgYDxkaXYgY2xhc3M9XCJ1aSB0aW55IGJhc2ljIGljb24gYnV0dG9ucyBhY3Rpb24tYnV0dG9uc1wiPiR7YnV0dG9ucy5qb2luKCcnKX08L2Rpdj5gIDogXG4gICAgICAgICAgICAgICAgICAgICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZGF0YSBsb2FkIGFuZCBlbXB0eSBzdGF0ZSBtYW5hZ2VtZW50XG4gICAgICovXG4gICAgaGFuZGxlRGF0YUxvYWQoanNvbikge1xuICAgICAgICAvLyBIaWRlIGxvYWRlciBmaXJzdFxuICAgICAgICB0aGlzLmhpZGVMb2FkZXIoKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGlzRW1wdHkgPSAhanNvbi5yZXN1bHQgfHwgIWpzb24uZGF0YSB8fCBqc29uLmRhdGEubGVuZ3RoID09PSAwO1xuICAgICAgICB0aGlzLnRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIoaXNFbXB0eSk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy5vbkRhdGFMb2FkZWQpIHtcbiAgICAgICAgICAgIHRoaXMub25EYXRhTG9hZGVkKGpzb24pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4ganNvbi5yZXN1bHQgPyBqc29uLmRhdGEgOiBbXTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRyYXcgY2FsbGJhY2sgZm9yIHBvc3QtcmVuZGVyIG9wZXJhdGlvbnNcbiAgICAgKi9cbiAgICBoYW5kbGVEcmF3Q2FsbGJhY2soKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgcG9wdXBzXG4gICAgICAgIHRoaXMuJHRhYmxlLmZpbmQoJy5wb3B1cGVkJykucG9wdXAoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIE1vdmUgQWRkIE5ldyBidXR0b24gdG8gRGF0YVRhYmxlcyB3cmFwcGVyXG4gICAgICAgIHRoaXMucmVwb3NpdGlvbkFkZEJ1dHRvbigpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZWRpdGluZ1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEN1c3RvbSBkcmF3IGNhbGxiYWNrXG4gICAgICAgIGlmICh0aGlzLm9uRHJhd0NhbGxiYWNrKSB7XG4gICAgICAgICAgICB0aGlzLm9uRHJhd0NhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogUmVwb3NpdGlvbiBBZGQgTmV3IGJ1dHRvbiB0byBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgKi9cbiAgICByZXBvc2l0aW9uQWRkQnV0dG9uKCkge1xuICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gJChgIyR7dGhpcy50YWJsZUlkfV93cmFwcGVyYCk7XG4gICAgICAgIGNvbnN0ICRsZWZ0Q29sdW1uID0gJHdyYXBwZXIuZmluZCgnLmVpZ2h0LndpZGUuY29sdW1uJykuZmlyc3QoKTtcbiAgICAgICAgXG4gICAgICAgIGlmICgkYWRkQnV0dG9uLmxlbmd0aCAmJiAkbGVmdENvbHVtbi5sZW5ndGggJiYgdGhpcy5wZXJtaXNzaW9ucy5zYXZlKSB7XG4gICAgICAgICAgICAkbGVmdENvbHVtbi5hcHBlbmQoJGFkZEJ1dHRvbik7XG4gICAgICAgICAgICAkYWRkQnV0dG9uLnNob3coKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRlbGV0ZSBoYW5kbGVyIHdpdGggdHdvLXN0ZXAgY29uZmlybWF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICAgIC8vIERlbGV0ZVNvbWV0aGluZy5qcyBoYW5kbGVzIGZpcnN0IGNsaWNrXG4gICAgICAgIC8vIFdlIGhhbmRsZSBzZWNvbmQgY2xpY2sgd2hlbiB0d28tc3RlcHMtZGVsZXRlIGNsYXNzIGlzIHJlbW92ZWRcbiAgICAgICAgdGhpcy4kdGFibGUub24oJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJGJ1dHRvbi5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEFkZCBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICAkYnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0aGlzLmN1c3RvbURlbGV0ZUhhbmRsZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1c3RvbURlbGV0ZUhhbmRsZXIocmVjb3JkSWQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwaU1vZHVsZS5kZWxldGVSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4gdGhpcy5jYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGNvcHkgaGFuZGxlclxuICAgICAqL1xuICAgIGluaXRpYWxpemVDb3B5SGFuZGxlcigpIHtcbiAgICAgICAgdGhpcy4kdGFibGUub24oJ2NsaWNrJywgJ2EuY29weScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIG1vZGlmeSBwYWdlIHdpdGggY29weSBwYXJhbWV0ZXJcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvP2NvcHk9JHtyZWNvcmRJZH1gO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjdXN0b20gYnV0dG9uIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUN1c3RvbUhhbmRsZXJzKCkge1xuICAgICAgICB0aGlzLmN1c3RvbUFjdGlvbkJ1dHRvbnMuZm9yRWFjaChjdXN0b21CdXR0b24gPT4ge1xuICAgICAgICAgICAgaWYgKGN1c3RvbUJ1dHRvbi5vbkNsaWNrKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kdGFibGUub24oJ2NsaWNrJywgYGEuJHtjdXN0b21CdXR0b24uY2xhc3N9YCwgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUJ1dHRvbi5vbkNsaWNrKHJlY29yZElkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIHJlY29yZCBkZWxldGlvblxuICAgICAqL1xuICAgIGNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gUmVsb2FkIHRhYmxlIGRhdGEgd2l0aCBjYWxsYmFjayBzdXBwb3J0XG4gICAgICAgICAgICBjb25zdCByZWxvYWRDYWxsYmFjayA9ICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBDYWxsIGN1c3RvbSBhZnRlci1kZWxldGUgY2FsbGJhY2sgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHRoaXMub25BZnRlckRlbGV0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9uQWZ0ZXJEZWxldGUocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbG9hZCB0YWJsZSBhbmQgZXhlY3V0ZSBjYWxsYmFja1xuICAgICAgICAgICAgdGhpcy5kYXRhVGFibGUuYWpheC5yZWxvYWQocmVsb2FkQ2FsbGJhY2ssIGZhbHNlKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHJlbGF0ZWQgY29tcG9uZW50c1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25zICE9PSAndW5kZWZpbmVkJyAmJiBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBtZXNzYWdlIGlmIGNvbmZpZ3VyZWRcbiAgICAgICAgICAgIGlmICh0aGlzLnNob3dTdWNjZXNzTWVzc2FnZXMgJiYgdGhpcy50cmFuc2xhdGlvbnMuZGVsZXRlU3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dTdWNjZXNzKHRoaXMudHJhbnNsYXRpb25zLmRlbGV0ZVN1Y2Nlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJhbnNsYXRpb25zLmRlbGV0ZUVycm9yIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvRGVsZXRlUmVjb3JkO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlIGZyb20gYWxsIGRlbGV0ZSBidXR0b25zXG4gICAgICAgIHRoaXMuJHRhYmxlLmZpbmQoJ2EuZGVsZXRlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkZXIgd2hpbGUgbG9hZGluZyBkYXRhXG4gICAgICovXG4gICAgc2hvd0xvYWRlcigpIHtcbiAgICAgICAgLy8gSGlkZSBldmVyeXRoaW5nIGZpcnN0XG4gICAgICAgIC8vIEZpbmQgdGhlIHRhYmxlJ3MgcGFyZW50IGNvbnRhaW5lciAtIG5lZWQgdGhlIG9yaWdpbmFsIGNvbnRhaW5lciwgbm90IHRoZSBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgY29uc3QgJHdyYXBwZXIgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCdkaXZbaWQkPVwiX3dyYXBwZXJcIl0nKTtcbiAgICAgICAgbGV0ICRjb250YWluZXI7XG4gICAgICAgIGlmICgkd3JhcHBlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgcGFyZW50IG9mIHRoZSB3cmFwcGVyIChzaG91bGQgYmUgdGhlIG9yaWdpbmFsIGNvbnRhaW5lcilcbiAgICAgICAgICAgICRjb250YWluZXIgPSAkd3JhcHBlci5wYXJlbnQoJ2RpdltpZF0nKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGYWxsYmFjayBpZiBzdHJ1Y3R1cmUgaXMgZGlmZmVyZW50XG4gICAgICAgIGlmICghJGNvbnRhaW5lciB8fCAhJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICRjb250YWluZXIgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCdkaXZbaWRdOm5vdChbaWQkPVwiX3dyYXBwZXJcIl0pJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgJHBsYWNlaG9sZGVyID0gJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJyk7XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgXG4gICAgICAgICRjb250YWluZXIuaGlkZSgpO1xuICAgICAgICAkcGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAkYWRkQnV0dG9uLmhpZGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBhbmQgc2hvdyBsb2FkZXIgaWYgbm90IGV4aXN0c1xuICAgICAgICBsZXQgJGxvYWRlciA9ICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpO1xuICAgICAgICBpZiAoISRsb2FkZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBzZWdtZW50IHdpdGggbG9hZGVyIGZvciBiZXR0ZXIgdmlzdWFsIGFwcGVhcmFuY2VcbiAgICAgICAgICAgICRsb2FkZXIgPSAkKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVwidGFibGUtZGF0YS1sb2FkZXJcIiBjbGFzcz1cInVpIHNlZ21lbnRcIiBzdHlsZT1cIm1pbi1oZWlnaHQ6IDIwMHB4OyBwb3NpdGlvbjogcmVsYXRpdmU7XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3RpdmUgaW52ZXJ0ZWQgZGltbWVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dCBsb2FkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leF9Mb2FkaW5nRGF0YSB8fCAnTG9hZGluZy4uLid9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAvLyBJbnNlcnQgbG9hZGVyIGluIHRoZSBhcHByb3ByaWF0ZSBwbGFjZVxuICAgICAgICAgICAgaWYgKCRjb250YWluZXIubGVuZ3RoICYmICRjb250YWluZXIucGFyZW50KCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5iZWZvcmUoJGxvYWRlcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGggJiYgJHBsYWNlaG9sZGVyLnBhcmVudCgpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5iZWZvcmUoJGxvYWRlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBhcHBlbmQgdG8gYm9keSBvciBwYXJlbnQgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgY29uc3QgJHBhcmVudCA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJy5wdXNoZXInKSB8fCB0aGlzLiR0YWJsZS5wYXJlbnQoKTtcbiAgICAgICAgICAgICAgICAkcGFyZW50LmFwcGVuZCgkbG9hZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkbG9hZGVyLnNob3coKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBsb2FkZXJcbiAgICAgKi9cbiAgICBoaWRlTG9hZGVyKCkge1xuICAgICAgICAkKCcjdGFibGUtZGF0YS1sb2FkZXInKS5oaWRlKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBlbXB0eSB0YWJsZSBwbGFjZWhvbGRlciB2aXNpYmlsaXR5XG4gICAgICovXG4gICAgdG9nZ2xlRW1wdHlQbGFjZWhvbGRlcihpc0VtcHR5KSB7XG4gICAgICAgIC8vIEZpbmQgdGhlIHRhYmxlJ3MgcGFyZW50IGNvbnRhaW5lciAtIG5lZWQgdGhlIG9yaWdpbmFsIGNvbnRhaW5lciwgbm90IHRoZSBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgLy8gRGF0YVRhYmxlcyB3cmFwcyB0aGUgdGFibGUgaW4gYSBkaXYgd2l0aCBpZCBlbmRpbmcgaW4gJ193cmFwcGVyJ1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGZpbmQgdGhlIHBhcmVudCBvZiB0aGF0IHdyYXBwZXIgd2hpY2ggaXMgdGhlIG9yaWdpbmFsIGNvbnRhaW5lclxuICAgICAgICBjb25zdCAkd3JhcHBlciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZCQ9XCJfd3JhcHBlclwiXScpO1xuICAgICAgICBsZXQgJGNvbnRhaW5lcjtcbiAgICAgICAgaWYgKCR3cmFwcGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBwYXJlbnQgb2YgdGhlIHdyYXBwZXIgKHNob3VsZCBiZSB0aGUgb3JpZ2luYWwgY29udGFpbmVyKVxuICAgICAgICAgICAgJGNvbnRhaW5lciA9ICR3cmFwcGVyLnBhcmVudCgnZGl2W2lkXScpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZhbGxiYWNrIGlmIHN0cnVjdHVyZSBpcyBkaWZmZXJlbnRcbiAgICAgICAgaWYgKCEkY29udGFpbmVyIHx8ICEkY29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgJGNvbnRhaW5lciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZF06bm90KFtpZCQ9XCJfd3JhcHBlclwiXSknKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRwbGFjZWhvbGRlciA9ICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRW1wdHkpIHtcbiAgICAgICAgICAgICRjb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgJGFkZEJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgcGxhY2Vob2xkZXIgaXMgdmlzaWJsZVxuICAgICAgICAgICAgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkcGxhY2Vob2xkZXIuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkcGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvbnMuc2F2ZSkge1xuICAgICAgICAgICAgICAgICRhZGRCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGNvbnRhaW5lci5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgKiBFeGNsdWRlcyBhY3Rpb24gYnV0dG9uIGNlbGxzIHRvIGF2b2lkIGNvbmZsaWN0c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKSB7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9uKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmRhdGFUYWJsZS5yb3coZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCk7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHJlY29yZCBJRCAtIGNoZWNrIGZvciBib3RoIHVuaXFpZCBhbmQgaWQgZmllbGRzXG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9IGRhdGEgJiYgKGRhdGEudW5pcWlkIHx8IGRhdGEuaWQpO1xuICAgICAgICAgICAgaWYgKHJlY29yZElkICYmICh0aGlzLnBlcm1pc3Npb25zLm1vZGlmeSB8fCB0aGlzLnBlcm1pc3Npb25zLmVkaXQpKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBnZXRNb2RpZnlVcmwgaWYgcHJvdmlkZWQsIG90aGVyd2lzZSB1c2UgZGVmYXVsdFxuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsID8gXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0TW9kaWZ5VXJsKHJlY29yZElkKSA6IFxuICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxSb290VXJsfSR7dGhpcy5yb3V0ZVByZWZpeH0vbW9kaWZ5LyR7cmVjb3JkSWR9YDtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBtb2RpZnlVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSB1bmlmaWVkIGRlc2NyaXB0aW9uIHJlbmRlcmVyIHdpdGggdHJ1bmNhdGlvbiBzdXBwb3J0XG4gICAgICogXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZW5kZXJlciBmdW5jdGlvbiBmb3IgRGF0YVRhYmxlc1xuICAgICAqL1xuICAgIGNyZWF0ZURlc2NyaXB0aW9uUmVuZGVyZXIoKSB7XG4gICAgICAgIHJldHVybiAoZGF0YSwgdHlwZSwgcm93KSA9PiB7XG4gICAgICAgICAgICBpZiAoIWRhdGEgfHwgZGF0YS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICfigJQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Rpc3BsYXknKSB7XG4gICAgICAgICAgICAgICAgLy8gRXNjYXBlIEhUTUwgdG8gcHJldmVudCBYU1NcbiAgICAgICAgICAgICAgICBjb25zdCBzYWZlRGVzYyA9IHdpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRpb25MaW5lcyA9IHNhZmVEZXNjLnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKSAhPT0gJycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBtYXggbGluZXNcbiAgICAgICAgICAgICAgICBsZXQgbWF4TGluZXMgPSB0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MubWF4TGluZXM7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5keW5hbWljSGVpZ2h0ICYmIHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5jYWxjdWxhdGVMaW5lcykge1xuICAgICAgICAgICAgICAgICAgICBtYXhMaW5lcyA9IHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5jYWxjdWxhdGVMaW5lcyhyb3cpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZGVzY3JpcHRpb25MaW5lcy5sZW5ndGggPD0gbWF4TGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVzY3JpcHRpb24gZml0cyAtIHNob3cgd2l0aCBwcmVzZXJ2ZWQgZm9ybWF0dGluZ1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREZXNjID0gZGVzY3JpcHRpb25MaW5lcy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uLXRleHRcIiBzdHlsZT1cImxpbmUtaGVpZ2h0OiAxLjM7XCI+JHtmb3JtYXR0ZWREZXNjfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVzY3JpcHRpb24gdG9vIGxvbmcgLSB0cnVuY2F0ZSB3aXRoIHBvcHVwXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpc2libGVMaW5lcyA9IGRlc2NyaXB0aW9uTGluZXMuc2xpY2UoMCwgbWF4TGluZXMpO1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlTGluZXNbbWF4TGluZXMgLSAxXSArPSAnLi4uJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZERlc2MgPSB2aXNpYmxlTGluZXMuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsRGVzYyA9IGRlc2NyaXB0aW9uTGluZXMuam9pbignXFxuJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvbi10ZXh0IHRydW5jYXRlZCBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtmdWxsRGVzY31cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBvc2l0aW9uPVwidG9wIHJpZ2h0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJ3aWRlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogaGVscDsgYm9yZGVyLWJvdHRvbTogMXB4IGRvdHRlZCAjOTk5OyBsaW5lLWhlaWdodDogMS4zO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHt0cnVuY2F0ZWREZXNjfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIHNlYXJjaCBhbmQgb3RoZXIgb3BlcmF0aW9ucywgcmV0dXJuIHBsYWluIHRleHRcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IHRoZSBEYXRhVGFibGUgYW5kIGNsZWFudXBcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBSZW1vdmUgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJyk7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9mZignY2xpY2snLCAnYS5jb3B5Jyk7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9mZignZGJsY2xpY2snLCAndGJvZHkgdGQ6bm90KC5yaWdodC5hbGlnbmVkKScpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBEYXRhVGFibGUgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0aGlzLmRhdGFUYWJsZSAmJiB0eXBlb2YgdGhpcy5kYXRhVGFibGUuZGVzdHJveSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhpcy5kYXRhVGFibGUuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGVyXG4gICAgICAgICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpLnJlbW92ZSgpO1xuICAgIH1cbn1cblxuLy8gTWFrZSBhdmFpbGFibGUgZ2xvYmFsbHlcbndpbmRvdy5QYnhEYXRhVGFibGVJbmRleCA9IFBieERhdGFUYWJsZUluZGV4OyJdfQ==