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
      if (response.result === true) {
        // Reload table data
        this.dataTable.ajax.reload(); // Update related components

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
      var _this6 = this;

      this.$table.on('dblclick', 'tbody td:not(.right.aligned)', function (e) {
        var data = _this6.dataTable.row(e.currentTarget).data(); // Get the record ID - check for both uniqid and id fields


        var recordId = data && (data.uniqid || data.id);

        if (recordId && (_this6.permissions.modify || _this6.permissions.edit)) {
          // Use custom getModifyUrl if provided, otherwise use default
          var modifyUrl = _this6.getModifyUrl ? _this6.getModifyUrl(recordId) : "".concat(globalRootUrl).concat(_this6.routePrefix, "/modify/").concat(recordId);
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
      var _this7 = this;

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

          var maxLines = _this7.descriptionSettings.maxLines;

          if (_this7.descriptionSettings.dynamicHeight && _this7.descriptionSettings.calculateLines) {
            maxLines = _this7.descriptionSettings.calculateLines(row);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1BieERhdGFUYWJsZUluZGV4LmpzIl0sIm5hbWVzIjpbIlBieERhdGFUYWJsZUluZGV4IiwiY29uZmlnIiwidGFibGVJZCIsImFwaU1vZHVsZSIsInJvdXRlUHJlZml4IiwidHJhbnNsYXRpb25zIiwiY29sdW1ucyIsInNob3dTdWNjZXNzTWVzc2FnZXMiLCJzaG93SW5mbyIsIm9yZGVyYWJsZSIsInVuZGVmaW5lZCIsIm9yZGVyIiwicGVybWlzc2lvbnMiLCJzYXZlIiwibW9kaWZ5IiwiZWRpdCIsImNvcHkiLCJjdXN0b20iLCJhY3Rpb25CdXR0b25zIiwiY3VzdG9tQWN0aW9uQnV0dG9ucyIsImRlc2NyaXB0aW9uU2V0dGluZ3MiLCJPYmplY3QiLCJhc3NpZ24iLCJtYXhMaW5lcyIsImR5bmFtaWNIZWlnaHQiLCJjYWxjdWxhdGVMaW5lcyIsIiR0YWJsZSIsIiQiLCJkYXRhVGFibGUiLCJvbkRhdGFMb2FkZWQiLCJvbkRyYXdDYWxsYmFjayIsIm9uUGVybWlzc2lvbnNMb2FkZWQiLCJjdXN0b21EZWxldGVIYW5kbGVyIiwiZ2V0TW9kaWZ5VXJsIiwiYWpheERhdGEiLCJzaG93TG9hZGVyIiwibG9hZFBlcm1pc3Npb25zIiwiaW5pdGlhbGl6ZURhdGFUYWJsZSIsImVycm9yIiwiY29uc29sZSIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXhfRXJyb3JJbml0aWFsaXppbmdUYWJsZSIsImhpZGVMb2FkZXIiLCJ0b2dnbGVFbXB0eVBsYWNlaG9sZGVyIiwicmVzcG9uc2UiLCJhamF4IiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsIm1ldGhvZCIsImRhdGEiLCJjb250cm9sbGVyIiwiZGF0YVR5cGUiLCJzdWNjZXNzIiwid2FybiIsImFkZENsYXNzIiwicHJvY2Vzc2VkQ29sdW1ucyIsInByb2Nlc3NDb2x1bW5zIiwiZW5kcG9pbnRzIiwiZ2V0TGlzdCIsInR5cGUiLCJkYXRhU3JjIiwianNvbiIsImhhbmRsZURhdGFMb2FkIiwieGhyIiwidGhyb3duIiwiZXhfRXJyb3JMb2FkaW5nRGF0YSIsIm9yZGVyaW5nIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwic2VhcmNoaW5nIiwiaW5mbyIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJkcmF3Q2FsbGJhY2siLCJoYW5kbGVEcmF3Q2FsbGJhY2siLCJEYXRhVGFibGUiLCJpbml0aWFsaXplRGVsZXRlSGFuZGxlciIsImluaXRpYWxpemVDb3B5SGFuZGxlciIsImluaXRpYWxpemVDdXN0b21IYW5kbGVycyIsImZvckVhY2giLCJjb2wiLCJmaW5kIiwiaXNBY3Rpb25Db2x1bW4iLCJwdXNoIiwiY3JlYXRlQWN0aW9uQ29sdW1uIiwic2VhcmNoYWJsZSIsImNsYXNzTmFtZSIsInJlbmRlciIsInJvdyIsImJ1dHRvbnMiLCJyZWNvcmRJZCIsInVuaXFpZCIsImlkIiwiaW5jbHVkZXMiLCJtb2RpZnlVcmwiLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBDb3B5IiwiY3VzdG9tQnV0dG9uIiwibmFtZSIsImhyZWYiLCJkYXRhVmFsdWUiLCJpbmNsdWRlSWQiLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsInRvb2x0aXAiLCJpY29uIiwiYnRfVG9vbFRpcERlbGV0ZSIsImxlbmd0aCIsImpvaW4iLCJpc0VtcHR5IiwicmVzdWx0IiwicG9wdXAiLCJyZXBvc2l0aW9uQWRkQnV0dG9uIiwiaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCIsIiRhZGRCdXR0b24iLCIkd3JhcHBlciIsIiRsZWZ0Q29sdW1uIiwiZmlyc3QiLCJhcHBlbmQiLCJzaG93Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwiY3VycmVudFRhcmdldCIsImF0dHIiLCJkZWxldGVSZWNvcmQiLCJjYkFmdGVyRGVsZXRlUmVjb3JkIiwid2luZG93IiwibG9jYXRpb24iLCJvbkNsaWNrIiwicmVsb2FkIiwiRXh0ZW5zaW9ucyIsImNiT25EYXRhQ2hhbmdlZCIsImRlbGV0ZVN1Y2Nlc3MiLCJzaG93U3VjY2VzcyIsImVycm9yTWVzc2FnZSIsIm1lc3NhZ2VzIiwiZGVsZXRlRXJyb3IiLCJleF9JbXBvc3NpYmxlVG9EZWxldGVSZWNvcmQiLCJyZW1vdmVDbGFzcyIsImNsb3Nlc3QiLCIkY29udGFpbmVyIiwicGFyZW50IiwiJHBsYWNlaG9sZGVyIiwiaGlkZSIsIiRsb2FkZXIiLCJleF9Mb2FkaW5nRGF0YSIsImJlZm9yZSIsIiRwYXJlbnQiLCJ0cmltIiwic2FmZURlc2MiLCJkZXNjcmlwdGlvbkxpbmVzIiwic3BsaXQiLCJmaWx0ZXIiLCJsaW5lIiwiZm9ybWF0dGVkRGVzYyIsInZpc2libGVMaW5lcyIsInNsaWNlIiwidHJ1bmNhdGVkRGVzYyIsImZ1bGxEZXNjIiwib2ZmIiwiZGVzdHJveSIsInJlbW92ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7SUFDTUEsaUI7QUFDRjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0ksNkJBQVlDLE1BQVosRUFBb0I7QUFBQTs7QUFDaEI7QUFDQSxTQUFLQyxPQUFMLEdBQWVELE1BQU0sQ0FBQ0MsT0FBdEI7QUFDQSxTQUFLQyxTQUFMLEdBQWlCRixNQUFNLENBQUNFLFNBQXhCO0FBQ0EsU0FBS0MsV0FBTCxHQUFtQkgsTUFBTSxDQUFDRyxXQUExQjtBQUNBLFNBQUtDLFlBQUwsR0FBb0JKLE1BQU0sQ0FB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bkMsTUFBTSxDQUFDbkksaUJBQVAsR0FBMkJBLGlCQUEzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXh0ZW5zaW9ucywgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIE1pa29QQlggaW5kZXggdGFibGUgbWFuYWdlbWVudCB3aXRoIEFDTCBzdXBwb3J0XG4gKiBcbiAqIFByb3ZpZGVzIGNvbW1vbiBmdW5jdGlvbmFsaXR5IGZvciBEYXRhVGFibGUtYmFzZWQgaW5kZXggcGFnZXMgaW5jbHVkaW5nOlxuICogLSBTZXJ2ZXItc2lkZSBBQ0wgcGVybWlzc2lvbiBjaGVja2luZ1xuICogLSBEeW5hbWljIGFjdGlvbiBidXR0b24gcmVuZGVyaW5nIGJhc2VkIG9uIHBlcm1pc3Npb25zXG4gKiAtIFVuaWZpZWQgZGVzY3JpcHRpb24gdHJ1bmNhdGlvbiB3aXRoIHBvcHVwIHN1cHBvcnRcbiAqIC0gQ29weSBmdW5jdGlvbmFsaXR5IHN1cHBvcnRcbiAqIC0gQ3VzdG9tIGFjdGlvbiBidXR0b25zXG4gKiAtIFR3by1zdGVwIGRlbGV0ZSBjb25maXJtYXRpb25cbiAqIC0gRG91YmxlLWNsaWNrIGVkaXRpbmdcbiAqIFxuICogQGNsYXNzIFBieERhdGFUYWJsZUluZGV4XG4gKi9cbmNsYXNzIFBieERhdGFUYWJsZUluZGV4IHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXggaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLnRhYmxlSWQgLSBIVE1MIHRhYmxlIGVsZW1lbnQgSURcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnLmFwaU1vZHVsZSAtIEFQSSBtb2R1bGUgZm9yIGRhdGEgb3BlcmF0aW9uc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcucm91dGVQcmVmaXggLSBVUkwgcm91dGUgcHJlZml4IChlLmcuLCAnY2FsbC1xdWV1ZXMnKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcudHJhbnNsYXRpb25zIC0gVHJhbnNsYXRpb24ga2V5cyBmb3IgbWVzc2FnZXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb25maWcuY29sdW1ucyAtIERhdGFUYWJsZSBjb2x1bW4gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2hvd1N1Y2Nlc3NNZXNzYWdlcz1mYWxzZV0gLSBTaG93IHN1Y2Nlc3MgbWVzc2FnZXMgb24gZGVsZXRlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNob3dJbmZvPWZhbHNlXSAtIFNob3cgRGF0YVRhYmxlIGluZm9cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmFjdGlvbkJ1dHRvbnM9WydlZGl0JywgJ2RlbGV0ZSddXSAtIFN0YW5kYXJkIGFjdGlvbiBidXR0b25zIHRvIHNob3dcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmN1c3RvbUFjdGlvbkJ1dHRvbnM9W11dIC0gQ3VzdG9tIGFjdGlvbiBidXR0b24gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5kZXNjcmlwdGlvblNldHRpbmdzXSAtIERlc2NyaXB0aW9uIHRydW5jYXRpb24gc2V0dGluZ3NcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLm9uRGF0YUxvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBkYXRhIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25EcmF3Q2FsbGJhY2tdIC0gQ2FsbGJhY2sgYWZ0ZXIgdGFibGUgZHJhd1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25QZXJtaXNzaW9uc0xvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBwZXJtaXNzaW9ucyBsb2FkZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmN1c3RvbURlbGV0ZUhhbmRsZXJdIC0gQ3VzdG9tIGRlbGV0ZSBoYW5kbGVyXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5nZXRNb2RpZnlVcmxdIC0gQ3VzdG9tIFVSTCBnZW5lcmF0b3IgZm9yIG1vZGlmeS9lZGl0IGFjdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcub3JkZXJhYmxlPXRydWVdIC0gRW5hYmxlL2Rpc2FibGUgc29ydGluZyBmb3IgYWxsIGNvbHVtbnNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLm9yZGVyPVtbMCwgJ2FzYyddXV0gLSBEZWZhdWx0IHNvcnQgb3JkZXJcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5hamF4RGF0YV0gLSBBZGRpdGlvbmFsIGRhdGEgcGFyYW1ldGVycyBmb3IgQUpBWCByZXF1ZXN0c1xuICAgICAqL1xuICAgIGNvbnN0cnVjdG9yKGNvbmZpZykge1xuICAgICAgICAvLyBDb3JlIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy50YWJsZUlkID0gY29uZmlnLnRhYmxlSWQ7XG4gICAgICAgIHRoaXMuYXBpTW9kdWxlID0gY29uZmlnLmFwaU1vZHVsZTtcbiAgICAgICAgdGhpcy5yb3V0ZVByZWZpeCA9IGNvbmZpZy5yb3V0ZVByZWZpeDtcbiAgICAgICAgdGhpcy50cmFuc2xhdGlvbnMgPSBjb25maWcudHJhbnNsYXRpb25zIHx8IHt9O1xuICAgICAgICB0aGlzLmNvbHVtbnMgPSBjb25maWcuY29sdW1ucyB8fCBbXTtcbiAgICAgICAgdGhpcy5zaG93U3VjY2Vzc01lc3NhZ2VzID0gY29uZmlnLnNob3dTdWNjZXNzTWVzc2FnZXMgfHwgZmFsc2U7XG4gICAgICAgIHRoaXMuc2hvd0luZm8gPSBjb25maWcuc2hvd0luZm8gfHwgZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBTb3J0aW5nIGNvbmZpZ3VyYXRpb24gKGJhY2t3YXJkIGNvbXBhdGlibGUpXG4gICAgICAgIHRoaXMub3JkZXJhYmxlID0gY29uZmlnLm9yZGVyYWJsZSAhPT0gdW5kZWZpbmVkID8gY29uZmlnLm9yZGVyYWJsZSA6IHRydWU7XG4gICAgICAgIHRoaXMub3JkZXIgPSBjb25maWcub3JkZXIgfHwgW1swLCAnYXNjJ11dO1xuICAgICAgICBcbiAgICAgICAgLy8gUGVybWlzc2lvbiBzdGF0ZSAobG9hZGVkIGZyb20gc2VydmVyKVxuICAgICAgICB0aGlzLnBlcm1pc3Npb25zID0ge1xuICAgICAgICAgICAgc2F2ZTogZmFsc2UsXG4gICAgICAgICAgICBtb2RpZnk6IGZhbHNlLFxuICAgICAgICAgICAgZWRpdDogZmFsc2UsXG4gICAgICAgICAgICBkZWxldGU6IGZhbHNlLFxuICAgICAgICAgICAgY29weTogZmFsc2UsXG4gICAgICAgICAgICBjdXN0b206IHt9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBY3Rpb24gYnV0dG9ucyBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMuYWN0aW9uQnV0dG9ucyA9IGNvbmZpZy5hY3Rpb25CdXR0b25zIHx8IFsnZWRpdCcsICdkZWxldGUnXTtcbiAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zID0gY29uZmlnLmN1c3RvbUFjdGlvbkJ1dHRvbnMgfHwgW107XG4gICAgICAgIFxuICAgICAgICAvLyBEZXNjcmlwdGlvbiB0cnVuY2F0aW9uIHNldHRpbmdzXG4gICAgICAgIHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe1xuICAgICAgICAgICAgbWF4TGluZXM6IDMsXG4gICAgICAgICAgICBkeW5hbWljSGVpZ2h0OiBmYWxzZSxcbiAgICAgICAgICAgIGNhbGN1bGF0ZUxpbmVzOiBudWxsXG4gICAgICAgIH0sIGNvbmZpZy5kZXNjcmlwdGlvblNldHRpbmdzIHx8IHt9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEludGVybmFsIHByb3BlcnRpZXNcbiAgICAgICAgdGhpcy4kdGFibGUgPSAkKGAjJHt0aGlzLnRhYmxlSWR9YCk7XG4gICAgICAgIHRoaXMuZGF0YVRhYmxlID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBPcHRpb25hbCBjYWxsYmFja3NcbiAgICAgICAgdGhpcy5vbkRhdGFMb2FkZWQgPSBjb25maWcub25EYXRhTG9hZGVkO1xuICAgICAgICB0aGlzLm9uRHJhd0NhbGxiYWNrID0gY29uZmlnLm9uRHJhd0NhbGxiYWNrO1xuICAgICAgICB0aGlzLm9uUGVybWlzc2lvbnNMb2FkZWQgPSBjb25maWcub25QZXJtaXNzaW9uc0xvYWRlZDtcbiAgICAgICAgdGhpcy5jdXN0b21EZWxldGVIYW5kbGVyID0gY29uZmlnLmN1c3RvbURlbGV0ZUhhbmRsZXI7XG4gICAgICAgIHRoaXMuZ2V0TW9kaWZ5VXJsID0gY29uZmlnLmdldE1vZGlmeVVybDtcbiAgICAgICAgdGhpcy5hamF4RGF0YSA9IGNvbmZpZy5hamF4RGF0YSB8fCB7fTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlIHdpdGggcGVybWlzc2lvbiBsb2FkaW5nXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFNob3cgbG9hZGVyIHdoaWxlIGluaXRpYWxpemluZ1xuICAgICAgICAgICAgdGhpcy5zaG93TG9hZGVyKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpcnN0LCBsb2FkIHBlcm1pc3Npb25zIGZyb20gc2VydmVyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRQZXJtaXNzaW9ucygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIERhdGFUYWJsZSAod2lsbCBoYW5kbGUgbG9hZGVyL2VtcHR5IHN0YXRlIGluIGRhdGEgY2FsbGJhY2spXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIFBieERhdGFUYWJsZUluZGV4OicsIGVycm9yKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JJbml0aWFsaXppbmdUYWJsZSB8fCAnRmFpbGVkIHRvIGluaXRpYWxpemUgdGFibGUnKTtcbiAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcGVybWlzc2lvbnMgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBhc3luYyBsb2FkUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWFjbC9jaGVja1Blcm1pc3Npb25zYCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogdGhpcy5yb3V0ZVByZWZpeFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMucGVybWlzc2lvbnMsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uUGVybWlzc2lvbnNMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkKHRoaXMucGVybWlzc2lvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGxvYWQgcGVybWlzc2lvbnMsIHVzaW5nIGRlZmF1bHRzOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIE9uIGVycm9yLCBkZWZhdWx0IHRvIG5vIHBlcm1pc3Npb25zIGZvciBzYWZldHlcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIGNvbW1vbiBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgLy8gQWRkIHRoZSBkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQgY2xhc3MgdG8gdGhlIHRhYmxlXG4gICAgICAgIHRoaXMuJHRhYmxlLmFkZENsYXNzKCdkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQnKTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHByb2Nlc3NlZENvbHVtbnMgPSB0aGlzLnByb2Nlc3NDb2x1bW5zKCk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBjb25maWcgPSB7XG4gICAgICAgICAgICBhamF4OiB7XG4gICAgICAgICAgICAgICAgdXJsOiB0aGlzLmFwaU1vZHVsZS5lbmRwb2ludHMuZ2V0TGlzdCxcbiAgICAgICAgICAgICAgICB0eXBlOiAnR0VUJyxcbiAgICAgICAgICAgICAgICBkYXRhOiB0aGlzLmFqYXhEYXRhLFxuICAgICAgICAgICAgICAgIGRhdGFTcmM6IChqc29uKSA9PiB0aGlzLmhhbmRsZURhdGFMb2FkKGpzb24pLFxuICAgICAgICAgICAgICAgIGVycm9yOiAoeGhyLCBlcnJvciwgdGhyb3duKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JMb2FkaW5nRGF0YSB8fCAnRmFpbGVkIHRvIGxvYWQgZGF0YScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb2x1bW5zOiBwcm9jZXNzZWRDb2x1bW5zLFxuICAgICAgICAgICAgb3JkZXI6IHRoaXMub3JkZXIsXG4gICAgICAgICAgICBvcmRlcmluZzogdGhpcy5vcmRlcmFibGUsXG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IHRoaXMuc2hvd0luZm8sXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrOiAoKSA9PiB0aGlzLmhhbmRsZURyYXdDYWxsYmFjaygpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLmRhdGFUYWJsZSA9IHRoaXMuJHRhYmxlLkRhdGFUYWJsZShjb25maWcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBoYW5kbGVyc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEZWxldGVIYW5kbGVyKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNvcHlIYW5kbGVyKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUN1c3RvbUhhbmRsZXJzKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgY29sdW1uIGRlZmluaXRpb25zIGFuZCBhZGQgYWN0aW9uIGNvbHVtbiBpZiBuZWVkZWRcbiAgICAgKi9cbiAgICBwcm9jZXNzQ29sdW1ucygpIHtcbiAgICAgICAgY29uc3QgY29sdW1ucyA9IFsuLi50aGlzLmNvbHVtbnNdO1xuICAgICAgICBcbiAgICAgICAgLy8gSWYgc29ydGluZyBpcyBnbG9iYWxseSBkaXNhYmxlZCwgZW5zdXJlIGFsbCBjb2x1bW5zIHJlc3BlY3QgaXRcbiAgICAgICAgaWYgKCF0aGlzLm9yZGVyYWJsZSkge1xuICAgICAgICAgICAgY29sdW1ucy5mb3JFYWNoKGNvbCA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUHJlc2VydmUgZXhwbGljaXQgb3JkZXJhYmxlOiBmYWxzZSwgYnV0IG92ZXJyaWRlIHRydWUgb3IgdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgaWYgKGNvbC5vcmRlcmFibGUgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbC5vcmRlcmFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0YW5kYXJkIGFjdGlvbiBjb2x1bW4gaWYgbm90IGFscmVhZHkgcHJlc2VudFxuICAgICAgICBpZiAoIWNvbHVtbnMuZmluZChjb2wgPT4gY29sLmlzQWN0aW9uQ29sdW1uKSkge1xuICAgICAgICAgICAgY29sdW1ucy5wdXNoKHRoaXMuY3JlYXRlQWN0aW9uQ29sdW1uKCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY29sdW1ucztcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHN0YW5kYXJkIGFjdGlvbiBjb2x1bW4gd2l0aCBwZXJtaXNzaW9uLWJhc2VkIHJlbmRlcmluZ1xuICAgICAqL1xuICAgIGNyZWF0ZUFjdGlvbkNvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBjbGFzc05hbWU6ICdyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmcnLFxuICAgICAgICAgICAgaXNBY3Rpb25Db2x1bW46IHRydWUsXG4gICAgICAgICAgICByZW5kZXI6IChkYXRhLCB0eXBlLCByb3cpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBidXR0b25zID0gW107XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSByZWNvcmQgSUQgLSBjaGVjayBmb3IgYm90aCB1bmlxaWQgYW5kIGlkIGZpZWxkc1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gcm93LnVuaXFpZCB8fCByb3cuaWQgfHwgJyc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRWRpdCBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdlZGl0JykgJiYgXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLnBlcm1pc3Npb25zLm1vZGlmeSB8fCB0aGlzLnBlcm1pc3Npb25zLmVkaXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgY3VzdG9tIGdldE1vZGlmeVVybCBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsID8gXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdldE1vZGlmeVVybChyZWNvcmRJZCkgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvJHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke21vZGlmeVVybH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGVkaXQgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGVkaXQgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uQnV0dG9ucy5pbmNsdWRlcygnY29weScpICYmIHRoaXMucGVybWlzc2lvbnMuY29weSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke3JlY29yZElkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBjb3B5IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBjb3B5IG91dGxpbmUgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEN1c3RvbSBidXR0b25zXG4gICAgICAgICAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zLmZvckVhY2goY3VzdG9tQnV0dG9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvbnMuY3VzdG9tICYmIHRoaXMucGVybWlzc2lvbnMuY3VzdG9tW2N1c3RvbUJ1dHRvbi5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaHJlZiA9IGN1c3RvbUJ1dHRvbi5ocmVmIHx8ICcjJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFWYWx1ZSA9IGN1c3RvbUJ1dHRvbi5pbmNsdWRlSWQgPyBgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCJgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2hyZWZ9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtkYXRhVmFsdWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gJHtjdXN0b21CdXR0b24uY2xhc3N9IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChjdXN0b21CdXR0b24udG9vbHRpcCl9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtjdXN0b21CdXR0b24uaWNvbn1cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBEZWxldGUgYnV0dG9uIChhbHdheXMgbGFzdClcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdkZWxldGUnKSAmJiB0aGlzLnBlcm1pc3Npb25zLmRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke3JlY29yZElkfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZGVsZXRlIHR3by1zdGVwcy1kZWxldGUgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcERlbGV0ZX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJ1dHRvbnMubGVuZ3RoID4gMCA/IFxuICAgICAgICAgICAgICAgICAgICBgPGRpdiBjbGFzcz1cInVpIHRpbnkgYmFzaWMgaWNvbiBidXR0b25zIGFjdGlvbi1idXR0b25zXCI+JHtidXR0b25zLmpvaW4oJycpfTwvZGl2PmAgOiBcbiAgICAgICAgICAgICAgICAgICAgJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBkYXRhIGxvYWQgYW5kIGVtcHR5IHN0YXRlIG1hbmFnZW1lbnRcbiAgICAgKi9cbiAgICBoYW5kbGVEYXRhTG9hZChqc29uKSB7XG4gICAgICAgIC8vIEhpZGUgbG9hZGVyIGZpcnN0XG4gICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgaXNFbXB0eSA9ICFqc29uLnJlc3VsdCB8fCAhanNvbi5kYXRhIHx8IGpzb24uZGF0YS5sZW5ndGggPT09IDA7XG4gICAgICAgIHRoaXMudG9nZ2xlRW1wdHlQbGFjZWhvbGRlcihpc0VtcHR5KTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm9uRGF0YUxvYWRlZCkge1xuICAgICAgICAgICAgdGhpcy5vbkRhdGFMb2FkZWQoanNvbik7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBqc29uLnJlc3VsdCA/IGpzb24uZGF0YSA6IFtdO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZHJhdyBjYWxsYmFjayBmb3IgcG9zdC1yZW5kZXIgb3BlcmF0aW9uc1xuICAgICAqL1xuICAgIGhhbmRsZURyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBwb3B1cHNcbiAgICAgICAgdGhpcy4kdGFibGUuZmluZCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTW92ZSBBZGQgTmV3IGJ1dHRvbiB0byBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgdGhpcy5yZXBvc2l0aW9uQWRkQnV0dG9uKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRvdWJsZS1jbGljayBlZGl0aW5nXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3VzdG9tIGRyYXcgY2FsbGJhY2tcbiAgICAgICAgaWYgKHRoaXMub25EcmF3Q2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRoaXMub25EcmF3Q2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXBvc2l0aW9uIEFkZCBOZXcgYnV0dG9uIHRvIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAqL1xuICAgIHJlcG9zaXRpb25BZGRCdXR0b24oKSB7XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHdyYXBwZXIgPSAkKGAjJHt0aGlzLnRhYmxlSWR9X3dyYXBwZXJgKTtcbiAgICAgICAgY29uc3QgJGxlZnRDb2x1bW4gPSAkd3JhcHBlci5maW5kKCcuZWlnaHQud2lkZS5jb2x1bW4nKS5maXJzdCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRhZGRCdXR0b24ubGVuZ3RoICYmICRsZWZ0Q29sdW1uLmxlbmd0aCAmJiB0aGlzLnBlcm1pc3Npb25zLnNhdmUpIHtcbiAgICAgICAgICAgICRsZWZ0Q29sdW1uLmFwcGVuZCgkYWRkQnV0dG9uKTtcbiAgICAgICAgICAgICRhZGRCdXR0b24uc2hvdygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVsZXRlIGhhbmRsZXIgd2l0aCB0d28tc3RlcCBjb25maXJtYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVsZXRlSGFuZGxlcigpIHtcbiAgICAgICAgLy8gRGVsZXRlU29tZXRoaW5nLmpzIGhhbmRsZXMgZmlyc3QgY2xpY2tcbiAgICAgICAgLy8gV2UgaGFuZGxlIHNlY29uZCBjbGljayB3aGVuIHR3by1zdGVwcy1kZWxldGUgY2xhc3MgaXMgcmVtb3ZlZFxuICAgICAgICB0aGlzLiR0YWJsZS5vbignY2xpY2snLCAnYS5kZWxldGU6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlcihyZWNvcmRJZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBpTW9kdWxlLmRlbGV0ZVJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB0aGlzLmNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY29weSBoYW5kbGVyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUNvcHlIYW5kbGVyKCkge1xuICAgICAgICB0aGlzLiR0YWJsZS5vbignY2xpY2snLCAnYS5jb3B5JywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gbW9kaWZ5IHBhZ2Ugd2l0aCBjb3B5IHBhcmFtZXRlclxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH0ke3RoaXMucm91dGVQcmVmaXh9L21vZGlmeS8/Y29weT0ke3JlY29yZElkfWA7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGN1c3RvbSBidXR0b24gaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ3VzdG9tSGFuZGxlcnMoKSB7XG4gICAgICAgIHRoaXMuY3VzdG9tQWN0aW9uQnV0dG9ucy5mb3JFYWNoKGN1c3RvbUJ1dHRvbiA9PiB7XG4gICAgICAgICAgICBpZiAoY3VzdG9tQnV0dG9uLm9uQ2xpY2spIHtcbiAgICAgICAgICAgICAgICB0aGlzLiR0YWJsZS5vbignY2xpY2snLCBgYS4ke2N1c3RvbUJ1dHRvbi5jbGFzc31gLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tQnV0dG9uLm9uQ2xpY2socmVjb3JkSWQpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgcmVjb3JkIGRlbGV0aW9uXG4gICAgICovXG4gICAgY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgdGFibGUgZGF0YVxuICAgICAgICAgICAgdGhpcy5kYXRhVGFibGUuYWpheC5yZWxvYWQoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHJlbGF0ZWQgY29tcG9uZW50c1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBFeHRlbnNpb25zICE9PSAndW5kZWZpbmVkJyAmJiBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCkge1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2JPbkRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNob3cgc3VjY2VzcyBtZXNzYWdlIGlmIGNvbmZpZ3VyZWRcbiAgICAgICAgICAgIGlmICh0aGlzLnNob3dTdWNjZXNzTWVzc2FnZXMgJiYgdGhpcy50cmFuc2xhdGlvbnMuZGVsZXRlU3VjY2Vzcykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dTdWNjZXNzKHRoaXMudHJhbnNsYXRpb25zLmRlbGV0ZVN1Y2Nlc3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBtZXNzYWdlXG4gICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJhbnNsYXRpb25zLmRlbGV0ZUVycm9yIHx8IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZXhfSW1wb3NzaWJsZVRvRGVsZXRlUmVjb3JkO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlIGZyb20gYWxsIGRlbGV0ZSBidXR0b25zXG4gICAgICAgIHRoaXMuJHRhYmxlLmZpbmQoJ2EuZGVsZXRlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogU2hvdyBsb2FkZXIgd2hpbGUgbG9hZGluZyBkYXRhXG4gICAgICovXG4gICAgc2hvd0xvYWRlcigpIHtcbiAgICAgICAgLy8gSGlkZSBldmVyeXRoaW5nIGZpcnN0XG4gICAgICAgIC8vIEZpbmQgdGhlIHRhYmxlJ3MgcGFyZW50IGNvbnRhaW5lciAtIG5lZWQgdGhlIG9yaWdpbmFsIGNvbnRhaW5lciwgbm90IHRoZSBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgY29uc3QgJHdyYXBwZXIgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCdkaXZbaWQkPVwiX3dyYXBwZXJcIl0nKTtcbiAgICAgICAgbGV0ICRjb250YWluZXI7XG4gICAgICAgIGlmICgkd3JhcHBlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgcGFyZW50IG9mIHRoZSB3cmFwcGVyIChzaG91bGQgYmUgdGhlIG9yaWdpbmFsIGNvbnRhaW5lcilcbiAgICAgICAgICAgICRjb250YWluZXIgPSAkd3JhcHBlci5wYXJlbnQoJ2RpdltpZF0nKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBGYWxsYmFjayBpZiBzdHJ1Y3R1cmUgaXMgZGlmZmVyZW50XG4gICAgICAgIGlmICghJGNvbnRhaW5lciB8fCAhJGNvbnRhaW5lci5sZW5ndGgpIHtcbiAgICAgICAgICAgICRjb250YWluZXIgPSB0aGlzLiR0YWJsZS5jbG9zZXN0KCdkaXZbaWRdOm5vdChbaWQkPVwiX3dyYXBwZXJcIl0pJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgJHBsYWNlaG9sZGVyID0gJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJyk7XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgXG4gICAgICAgICRjb250YWluZXIuaGlkZSgpO1xuICAgICAgICAkcGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAkYWRkQnV0dG9uLmhpZGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBhbmQgc2hvdyBsb2FkZXIgaWYgbm90IGV4aXN0c1xuICAgICAgICBsZXQgJGxvYWRlciA9ICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpO1xuICAgICAgICBpZiAoISRsb2FkZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBDcmVhdGUgYSBzZWdtZW50IHdpdGggbG9hZGVyIGZvciBiZXR0ZXIgdmlzdWFsIGFwcGVhcmFuY2VcbiAgICAgICAgICAgICRsb2FkZXIgPSAkKGBcbiAgICAgICAgICAgICAgICA8ZGl2IGlkPVwidGFibGUtZGF0YS1sb2FkZXJcIiBjbGFzcz1cInVpIHNlZ21lbnRcIiBzdHlsZT1cIm1pbi1oZWlnaHQ6IDIwMHB4OyBwb3NpdGlvbjogcmVsYXRpdmU7XCI+XG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSBhY3RpdmUgaW52ZXJ0ZWQgZGltbWVyXCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgdGV4dCBsb2FkZXJcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leF9Mb2FkaW5nRGF0YSB8fCAnTG9hZGluZy4uLid9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAvLyBJbnNlcnQgbG9hZGVyIGluIHRoZSBhcHByb3ByaWF0ZSBwbGFjZVxuICAgICAgICAgICAgaWYgKCRjb250YWluZXIubGVuZ3RoICYmICRjb250YWluZXIucGFyZW50KCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJGNvbnRhaW5lci5iZWZvcmUoJGxvYWRlcik7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGggJiYgJHBsYWNlaG9sZGVyLnBhcmVudCgpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5iZWZvcmUoJGxvYWRlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBhcHBlbmQgdG8gYm9keSBvciBwYXJlbnQgY29udGFpbmVyXG4gICAgICAgICAgICAgICAgY29uc3QgJHBhcmVudCA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJy5wdXNoZXInKSB8fCB0aGlzLiR0YWJsZS5wYXJlbnQoKTtcbiAgICAgICAgICAgICAgICAkcGFyZW50LmFwcGVuZCgkbG9hZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkbG9hZGVyLnNob3coKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGlkZSBsb2FkZXJcbiAgICAgKi9cbiAgICBoaWRlTG9hZGVyKCkge1xuICAgICAgICAkKCcjdGFibGUtZGF0YS1sb2FkZXInKS5oaWRlKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBlbXB0eSB0YWJsZSBwbGFjZWhvbGRlciB2aXNpYmlsaXR5XG4gICAgICovXG4gICAgdG9nZ2xlRW1wdHlQbGFjZWhvbGRlcihpc0VtcHR5KSB7XG4gICAgICAgIC8vIEZpbmQgdGhlIHRhYmxlJ3MgcGFyZW50IGNvbnRhaW5lciAtIG5lZWQgdGhlIG9yaWdpbmFsIGNvbnRhaW5lciwgbm90IHRoZSBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgLy8gRGF0YVRhYmxlcyB3cmFwcyB0aGUgdGFibGUgaW4gYSBkaXYgd2l0aCBpZCBlbmRpbmcgaW4gJ193cmFwcGVyJ1xuICAgICAgICAvLyBXZSBuZWVkIHRvIGZpbmQgdGhlIHBhcmVudCBvZiB0aGF0IHdyYXBwZXIgd2hpY2ggaXMgdGhlIG9yaWdpbmFsIGNvbnRhaW5lclxuICAgICAgICBjb25zdCAkd3JhcHBlciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZCQ9XCJfd3JhcHBlclwiXScpO1xuICAgICAgICBsZXQgJGNvbnRhaW5lcjtcbiAgICAgICAgaWYgKCR3cmFwcGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBwYXJlbnQgb2YgdGhlIHdyYXBwZXIgKHNob3VsZCBiZSB0aGUgb3JpZ2luYWwgY29udGFpbmVyKVxuICAgICAgICAgICAgJGNvbnRhaW5lciA9ICR3cmFwcGVyLnBhcmVudCgnZGl2W2lkXScpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZhbGxiYWNrIGlmIHN0cnVjdHVyZSBpcyBkaWZmZXJlbnRcbiAgICAgICAgaWYgKCEkY29udGFpbmVyIHx8ICEkY29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgJGNvbnRhaW5lciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZF06bm90KFtpZCQ9XCJfd3JhcHBlclwiXSknKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCAkYWRkQnV0dG9uID0gJCgnI2FkZC1uZXctYnV0dG9uJyk7XG4gICAgICAgIGNvbnN0ICRwbGFjZWhvbGRlciA9ICQoJyNlbXB0eS10YWJsZS1wbGFjZWhvbGRlcicpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRW1wdHkpIHtcbiAgICAgICAgICAgICRjb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgJGFkZEJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgcGxhY2Vob2xkZXIgaXMgdmlzaWJsZVxuICAgICAgICAgICAgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkcGxhY2Vob2xkZXIuc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKCRwbGFjZWhvbGRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkcGxhY2Vob2xkZXIuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvbnMuc2F2ZSkge1xuICAgICAgICAgICAgICAgICRhZGRCdXR0b24uc2hvdygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGNvbnRhaW5lci5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBkb3VibGUtY2xpY2sgZm9yIGVkaXRpbmdcbiAgICAgKiBFeGNsdWRlcyBhY3Rpb24gYnV0dG9uIGNlbGxzIHRvIGF2b2lkIGNvbmZsaWN0c1xuICAgICAqL1xuICAgIGluaXRpYWxpemVEb3VibGVDbGlja0VkaXQoKSB7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9uKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLmRhdGFUYWJsZS5yb3coZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCk7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHJlY29yZCBJRCAtIGNoZWNrIGZvciBib3RoIHVuaXFpZCBhbmQgaWQgZmllbGRzXG4gICAgICAgICAgICBjb25zdCByZWNvcmRJZCA9IGRhdGEgJiYgKGRhdGEudW5pcWlkIHx8IGRhdGEuaWQpO1xuICAgICAgICAgICAgaWYgKHJlY29yZElkICYmICh0aGlzLnBlcm1pc3Npb25zLm1vZGlmeSB8fCB0aGlzLnBlcm1pc3Npb25zLmVkaXQpKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBnZXRNb2RpZnlVcmwgaWYgcHJvdmlkZWQsIG90aGVyd2lzZSB1c2UgZGVmYXVsdFxuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsID8gXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0TW9kaWZ5VXJsKHJlY29yZElkKSA6IFxuICAgICAgICAgICAgICAgICAgICBgJHtnbG9iYWxSb290VXJsfSR7dGhpcy5yb3V0ZVByZWZpeH0vbW9kaWZ5LyR7cmVjb3JkSWR9YDtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBtb2RpZnlVcmw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSB1bmlmaWVkIGRlc2NyaXB0aW9uIHJlbmRlcmVyIHdpdGggdHJ1bmNhdGlvbiBzdXBwb3J0XG4gICAgICogXG4gICAgICogQHJldHVybnMge0Z1bmN0aW9ufSBSZW5kZXJlciBmdW5jdGlvbiBmb3IgRGF0YVRhYmxlc1xuICAgICAqL1xuICAgIGNyZWF0ZURlc2NyaXB0aW9uUmVuZGVyZXIoKSB7XG4gICAgICAgIHJldHVybiAoZGF0YSwgdHlwZSwgcm93KSA9PiB7XG4gICAgICAgICAgICBpZiAoIWRhdGEgfHwgZGF0YS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICfigJQnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAodHlwZSA9PT0gJ2Rpc3BsYXknKSB7XG4gICAgICAgICAgICAgICAgLy8gRXNjYXBlIEhUTUwgdG8gcHJldmVudCBYU1NcbiAgICAgICAgICAgICAgICBjb25zdCBzYWZlRGVzYyA9IHdpbmRvdy5TZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZGF0YSk7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRpb25MaW5lcyA9IHNhZmVEZXNjLnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKSAhPT0gJycpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBtYXggbGluZXNcbiAgICAgICAgICAgICAgICBsZXQgbWF4TGluZXMgPSB0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MubWF4TGluZXM7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5keW5hbWljSGVpZ2h0ICYmIHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5jYWxjdWxhdGVMaW5lcykge1xuICAgICAgICAgICAgICAgICAgICBtYXhMaW5lcyA9IHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5jYWxjdWxhdGVMaW5lcyhyb3cpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoZGVzY3JpcHRpb25MaW5lcy5sZW5ndGggPD0gbWF4TGluZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVzY3JpcHRpb24gZml0cyAtIHNob3cgd2l0aCBwcmVzZXJ2ZWQgZm9ybWF0dGluZ1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtYXR0ZWREZXNjID0gZGVzY3JpcHRpb25MaW5lcy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uLXRleHRcIiBzdHlsZT1cImxpbmUtaGVpZ2h0OiAxLjM7XCI+JHtmb3JtYXR0ZWREZXNjfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVzY3JpcHRpb24gdG9vIGxvbmcgLSB0cnVuY2F0ZSB3aXRoIHBvcHVwXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZpc2libGVMaW5lcyA9IGRlc2NyaXB0aW9uTGluZXMuc2xpY2UoMCwgbWF4TGluZXMpO1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlTGluZXNbbWF4TGluZXMgLSAxXSArPSAnLi4uJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRydW5jYXRlZERlc2MgPSB2aXNpYmxlTGluZXMuam9pbignPGJyPicpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsRGVzYyA9IGRlc2NyaXB0aW9uTGluZXMuam9pbignXFxuJyk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJkZXNjcmlwdGlvbi10ZXh0IHRydW5jYXRlZCBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtmdWxsRGVzY31cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXBvc2l0aW9uPVwidG9wIHJpZ2h0XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YXJpYXRpb249XCJ3aWRlXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHlsZT1cImN1cnNvcjogaGVscDsgYm9yZGVyLWJvdHRvbTogMXB4IGRvdHRlZCAjOTk5OyBsaW5lLWhlaWdodDogMS4zO1wiPlxuICAgICAgICAgICAgICAgICAgICAgICAgJHt0cnVuY2F0ZWREZXNjfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gRm9yIHNlYXJjaCBhbmQgb3RoZXIgb3BlcmF0aW9ucywgcmV0dXJuIHBsYWluIHRleHRcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9O1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IHRoZSBEYXRhVGFibGUgYW5kIGNsZWFudXBcbiAgICAgKi9cbiAgICBkZXN0cm95KCkge1xuICAgICAgICAvLyBSZW1vdmUgZXZlbnQgaGFuZGxlcnNcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdjbGljaycsICdhLmRlbGV0ZTpub3QoLnR3by1zdGVwcy1kZWxldGUpJyk7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9mZignY2xpY2snLCAnYS5jb3B5Jyk7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9mZignZGJsY2xpY2snLCAndGJvZHkgdGQ6bm90KC5yaWdodC5hbGlnbmVkKScpO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzdHJveSBEYXRhVGFibGUgaWYgZXhpc3RzXG4gICAgICAgIGlmICh0aGlzLmRhdGFUYWJsZSAmJiB0eXBlb2YgdGhpcy5kYXRhVGFibGUuZGVzdHJveSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhpcy5kYXRhVGFibGUuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBSZW1vdmUgbG9hZGVyXG4gICAgICAgICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpLnJlbW92ZSgpO1xuICAgIH1cbn1cblxuLy8gTWFrZSBhdmFpbGFibGUgZ2xvYmFsbHlcbndpbmRvdy5QYnhEYXRhVGFibGVJbmRleCA9IFBieERhdGFUYWJsZUluZGV4OyJdfQ==