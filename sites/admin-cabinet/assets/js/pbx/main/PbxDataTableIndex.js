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
   * @param {boolean} [config.serverSide=false] - Enable server-side processing
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
    this.enableSearchIndex = config.enableSearchIndex !== false; // Default true
    // Adjust default sort order if search_index is added (it will be column 0)

    this.order = config.order || (this.enableSearchIndex ? [[1, 'asc']] : [[0, 'asc']]); // Permission state (loaded from server)

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
    this.serverSide = config.serverSide || false;
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
      this.$table.addClass('datatable-width-constrained'); // Add missing header cells if needed for search_index column

      this.ensureHeaderCells();
      var processedColumns = this.processColumns(); // v3 API format with getList method

      var ajaxConfig;

      if (typeof this.apiModule.getList === 'function') {
        // v3 format with getList method - use custom ajax function
        ajaxConfig = function ajaxConfig(data, callback, settings) {
          _this.apiModule.getList(_this.ajaxData, function (response) {
            var processedData = _this.handleDataLoad(response);

            callback({
              data: processedData
            });
          });
        };
      } else {
        console.error('API module does not have getList method');
        ajaxConfig = {
          data: []
        };
      }

      var config = {
        ajax: ajaxConfig,
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
      var columns = _toConsumableArray(this.columns); // Add hidden search_index column at the beginning if enabled and not present
      // This column contains all searchable text without HTML formatting


      if (this.enableSearchIndex && !columns.find(function (col) {
        return col.data === 'search_index';
      })) {
        columns.unshift({
          data: 'search_index',
          visible: false,
          searchable: true,
          orderable: false,
          defaultContent: '',
          render: function render(data, type, row) {
            // If search_index is not provided by backend, generate it from row data
            if (data) {
              return data;
            } // Fallback: generate search index from visible fields


            var searchableFields = [];
            Object.keys(row).forEach(function (key) {
              // Skip internal fields and represent fields (they're often duplicates)
              if (key !== 'search_index' && key !== 'id' && key !== 'uniqid' && key !== 'DT_RowId' && !key.endsWith('_represent')) {
                var value = row[key];

                if (value && typeof value === 'string') {
                  // Strip HTML tags and add to searchable fields
                  var cleanValue = value.replace(/<[^>]*>/g, '').trim();

                  if (cleanValue) {
                    searchableFields.push(cleanValue);
                  }
                } else if (value && typeof value === 'number') {
                  searchableFields.push(value.toString());
                }
              }
            }); // Also process _represent fields as they contain user-friendly text

            Object.keys(row).forEach(function (key) {
              if (key.endsWith('_represent') && row[key]) {
                var cleanValue = String(row[key]).replace(/<[^>]*>/g, '').trim();

                if (cleanValue) {
                  searchableFields.push(cleanValue);
                }
              }
            });
            return searchableFields.join(' ').toLowerCase();
          }
        });
      } // If sorting is globally disabled, ensure all columns respect it


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
     * v3 API format: {result: boolean, data: array} or {data: {items: array}}
     */

  }, {
    key: "handleDataLoad",
    value: function handleDataLoad(response) {
      // Hide loader first
      this.hideLoader();
      var data = [];
      var isSuccess = false; // Check for error response

      if (!response || response.result === false) {
        isSuccess = false;
        data = [];
      } // Standard v3 format with data array
      else if (Array.isArray(response.data)) {
        isSuccess = true;
        data = response.data;
      } // v3 format with items property
      else if (response.data && Array.isArray(response.data.items)) {
        isSuccess = true;
        data = response.data.items;
      } // Fallback for responses with result:true but no data
      else if (response.result === true) {
        isSuccess = true;
        data = [];
      }

      var isEmpty = !isSuccess || data.length === 0;
      this.toggleEmptyPlaceholder(isEmpty);

      if (isEmpty && !isSuccess) {
        UserMessage.showError(globalTranslate.ex_ErrorLoadingData || 'Failed to load data');
      }

      if (this.onDataLoaded) {
        // Pass normalized response to callback
        var normalizedResponse = {
          result: isSuccess,
          data: data
        };
        this.onDataLoaded(normalizedResponse);
      }

      return data;
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
     * Ensure table has enough header cells for all columns
     * This is needed when we add the hidden search_index column programmatically
     */

  }, {
    key: "ensureHeaderCells",
    value: function ensureHeaderCells() {
      if (!this.enableSearchIndex) {
        return;
      }

      var $thead = this.$table.find('thead');

      if (!$thead.length) {
        // Create thead if it doesn't exist
        this.$table.prepend('<thead><tr></tr></thead>');
      }

      var $headerRow = this.$table.find('thead tr').first(); // Add a hidden header cell at the beginning for search_index
      // DataTables requires matching number of th elements and columns

      $headerRow.prepend('<th style="display:none;">Search Index</th>');
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
          _this3.customDeleteHandler(recordId, function (response) {
            return _this3.cbAfterDeleteRecord(response);
          });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1BieERhdGFUYWJsZUluZGV4LmpzIl0sIm5hbWVzIjpbIlBieERhdGFUYWJsZUluZGV4IiwiY29uZmlnIiwidGFibGVJZCIsImFwaU1vZHVsZSIsInJvdXRlUHJlZml4IiwidHJhbnNsYXRpb25zIiwiY29sdW1ucyIsInNob3dTdWNjZXNzTWVzc2FnZXMiLCJzaG93SW5mbyIsIm9yZGVyYWJsZSIsInVuZGVmaW5lZCIsImVuYWJsZVNlYXJjaEluZGV4Iiwib3JkZXIiLCJwZXJtaXNzaW9ucyIsInNhdmUiLCJtb2RpZnkiLCJlZGl0IiwiY29weSIsImN1c3RvbSIsImFjdGlvbkJ1dHRvbnMiLCJjdXN0b21BY3Rpb25CdXR0b25zIiwiZGVzY3JpcHRpb25TZXR0aW5ncyIsIk9iamVjdCIsImFzc2lnbiIsIm1heExpbmVzIiwiZHluYW1pY0hlaWdodCIsImNhbGN1bGF0ZUxpbmVzIiwiJHRhYmxlIiwiJCIsImRhdGFUYWJsZSIsIm9uRGF0YUxvYWRlZCIsIm9uRHJhd0NhbGxiYWNrIiwib25QZXJtaXNzaW9uc0xvYWRlZCIsImN1c3RvbURlbGV0ZUhhbmRsZXIiLCJvbkFmdGVyRGVsZXRlIiwiZ2V0TW9kaWZ5VXJsIiwiYWpheERhdGEiLCJzZXJ2ZXJTaWRlIiwic2hvd0xvYWRlciIsImxvYWRQZXJtaXNzaW9ucyIsImluaXRpYWxpemVEYXRhVGFibGUiLCJlcnJvciIsImNvbnNvbGUiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsImdsb2JhbFRyYW5zbGF0ZSIsImV4X0Vycm9ySW5pdGlhbGl6aW5nVGFibGUiLCJoaWRlTG9hZGVyIiwidG9nZ2xlRW1wdHlQbGFjZWhvbGRlciIsInJlc3BvbnNlIiwiYWpheCIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJtZXRob2QiLCJkYXRhIiwiY29udHJvbGxlciIsImRhdGFUeXBlIiwic3VjY2VzcyIsIndhcm4iLCJhZGRDbGFzcyIsImVuc3VyZUhlYWRlckNlbGxzIiwicHJvY2Vzc2VkQ29sdW1ucyIsInByb2Nlc3NDb2x1bW5zIiwiYWpheENvbmZpZyIsImdldExpc3QiLCJjYWxsYmFjayIsInNldHRpbmdzIiwicHJvY2Vzc2VkRGF0YSIsImhhbmRsZURhdGFMb2FkIiwib3JkZXJpbmciLCJsZW5ndGhDaGFuZ2UiLCJwYWdpbmciLCJzZWFyY2hpbmciLCJpbmZvIiwibGFuZ3VhZ2UiLCJTZW1hbnRpY0xvY2FsaXphdGlvbiIsImRhdGFUYWJsZUxvY2FsaXNhdGlvbiIsImRyYXdDYWxsYmFjayIsImhhbmRsZURyYXdDYWxsYmFjayIsIkRhdGFUYWJsZSIsImluaXRpYWxpemVEZWxldGVIYW5kbGVyIiwiaW5pdGlhbGl6ZUNvcHlIYW5kbGVyIiwiaW5pdGlhbGl6ZUN1c3RvbUhhbmRsZXJzIiwiZmluZCIsImNvbCIsInVuc2hpZnQiLCJ2aXNpYmxlIiwic2VhcmNoYWJsZSIsImRlZmF1bHRDb250ZW50IiwicmVuZGVyIiwidHlwZSIsInJvdyIsInNlYXJjaGFibGVGaWVsZHMiLCJrZXlzIiwiZm9yRWFjaCIsImtleSIsImVuZHNXaXRoIiwidmFsdWUiLCJjbGVhblZhbHVlIiwicmVwbGFjZSIsInRyaW0iLCJwdXNoIiwidG9TdHJpbmciLCJTdHJpbmciLCJqb2luIiwidG9Mb3dlckNhc2UiLCJpc0FjdGlvbkNvbHVtbiIsImNyZWF0ZUFjdGlvbkNvbHVtbiIsImNsYXNzTmFtZSIsImJ1dHRvbnMiLCJyZWNvcmRJZCIsInVuaXFpZCIsImlkIiwiaW5jbHVkZXMiLCJtb2RpZnlVcmwiLCJidF9Ub29sVGlwRWRpdCIsImJ0X1Rvb2xUaXBDb3B5IiwiY3VzdG9tQnV0dG9uIiwibmFtZSIsImhyZWYiLCJkYXRhVmFsdWUiLCJpbmNsdWRlSWQiLCJTZWN1cml0eVV0aWxzIiwiZXNjYXBlSHRtbCIsInRvb2x0aXAiLCJpY29uIiwiYnRfVG9vbFRpcERlbGV0ZSIsImxlbmd0aCIsImlzU3VjY2VzcyIsInJlc3VsdCIsIkFycmF5IiwiaXNBcnJheSIsIml0ZW1zIiwiaXNFbXB0eSIsImV4X0Vycm9yTG9hZGluZ0RhdGEiLCJub3JtYWxpemVkUmVzcG9uc2UiLCJwb3B1cCIsInJlcG9zaXRpb25BZGRCdXR0b24iLCJpbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0IiwiJHRoZWFkIiwicHJlcGVuZCIsIiRoZWFkZXJSb3ciLCJmaXJzdCIsIiRhZGRCdXR0b24iLCIkd3JhcHBlciIsIiRsZWZ0Q29sdW1uIiwiYXBwZW5kIiwic2hvdyIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCJhdHRyIiwiY2JBZnRlckRlbGV0ZVJlY29yZCIsImRlbGV0ZVJlY29yZCIsImNvcHlVcmwiLCJiYXNlVXJsIiwid2luZG93IiwibG9jYXRpb24iLCJvbkNsaWNrIiwicmVsb2FkQ2FsbGJhY2siLCJyZWxvYWQiLCJFeHRlbnNpb25zIiwiY2JPbkRhdGFDaGFuZ2VkIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJkZWxldGVFcnJvciIsImV4X0ltcG9zc2libGVUb0RlbGV0ZVJlY29yZCIsInJlbW92ZUNsYXNzIiwiY2xvc2VzdCIsIiRjb250YWluZXIiLCJwYXJlbnQiLCIkcGxhY2Vob2xkZXIiLCJoaWRlIiwiJGxvYWRlciIsImV4X0xvYWRpbmdEYXRhIiwiYmVmb3JlIiwiJHBhcmVudCIsInNhZmVEZXNjIiwiZGVzY3JpcHRpb25MaW5lcyIsInNwbGl0IiwiZmlsdGVyIiwibGluZSIsImZvcm1hdHRlZERlc2MiLCJ2aXNpYmxlTGluZXMiLCJzbGljZSIsInRydW5jYXRlZERlc2MiLCJmdWxsRGVzYyIsIm9mZiIsImRlc3Ryb3kiLCJyZW1vdmUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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LE9BQWhCLEVBQXlCLGlDQUF6QjtBQUNBLFdBQUtsSyxNQUFMLENBQVlrSyxHQUFaLENBQWdCLE9BQWhCLEVBQXlCLFFBQXpCO0FBQ0EsV0FBS2xLLE1BQUwsQ0FBWWtLLEdBQVosQ0FBZ0IsVUFBaEIsRUFBNEIsOEJBQTVCLEVBSk0sQ0FNTjs7QUFDQSxVQUFJLEtBQUtoSyxTQUFMLElBQWtCLE9BQU8sS0FBS0EsU0FBTCxDQUFlaUssT0FBdEIsS0FBa0MsVUFBeEQsRUFBb0U7QUFDaEUsYUFBS2pLLFNBQUwsQ0FBZWlLLE9BQWY7QUFDSCxPQVRLLENBV047OztBQUNBbEssTUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0JtSyxNQUF4QjtBQUNIOzs7O0tBR0w7OztBQUNBakMsTUFBTSxDQUFDOUosaUJBQVAsR0FBMkJBLGlCQUEzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXh0ZW5zaW9ucywgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIE1pa29QQlggaW5kZXggdGFibGUgbWFuYWdlbWVudCB3aXRoIEFDTCBzdXBwb3J0XG4gKiBcbiAqIFByb3ZpZGVzIGNvbW1vbiBmdW5jdGlvbmFsaXR5IGZvciBEYXRhVGFibGUtYmFzZWQgaW5kZXggcGFnZXMgaW5jbHVkaW5nOlxuICogLSBTZXJ2ZXItc2lkZSBBQ0wgcGVybWlzc2lvbiBjaGVja2luZ1xuICogLSBEeW5hbWljIGFjdGlvbiBidXR0b24gcmVuZGVyaW5nIGJhc2VkIG9uIHBlcm1pc3Npb25zXG4gKiAtIFVuaWZpZWQgZGVzY3JpcHRpb24gdHJ1bmNhdGlvbiB3aXRoIHBvcHVwIHN1cHBvcnRcbiAqIC0gQ29weSBmdW5jdGlvbmFsaXR5IHN1cHBvcnRcbiAqIC0gQ3VzdG9tIGFjdGlvbiBidXR0b25zXG4gKiAtIFR3by1zdGVwIGRlbGV0ZSBjb25maXJtYXRpb25cbiAqIC0gRG91YmxlLWNsaWNrIGVkaXRpbmdcbiAqIFxuICogQGNsYXNzIFBieERhdGFUYWJsZUluZGV4XG4gKi9cbmNsYXNzIFBieERhdGFUYWJsZUluZGV4IHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXggaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLnRhYmxlSWQgLSBIVE1MIHRhYmxlIGVsZW1lbnQgSURcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnLmFwaU1vZHVsZSAtIEFQSSBtb2R1bGUgZm9yIGRhdGEgb3BlcmF0aW9uc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcucm91dGVQcmVmaXggLSBVUkwgcm91dGUgcHJlZml4IChlLmcuLCAnY2FsbC1xdWV1ZXMnKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcudHJhbnNsYXRpb25zIC0gVHJhbnNsYXRpb24ga2V5cyBmb3IgbWVzc2FnZXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb25maWcuY29sdW1ucyAtIERhdGFUYWJsZSBjb2x1bW4gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2hvd1N1Y2Nlc3NNZXNzYWdlcz1mYWxzZV0gLSBTaG93IHN1Y2Nlc3MgbWVzc2FnZXMgb24gZGVsZXRlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNob3dJbmZvPWZhbHNlXSAtIFNob3cgRGF0YVRhYmxlIGluZm9cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmFjdGlvbkJ1dHRvbnM9WydlZGl0JywgJ2RlbGV0ZSddXSAtIFN0YW5kYXJkIGFjdGlvbiBidXR0b25zIHRvIHNob3dcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmN1c3RvbUFjdGlvbkJ1dHRvbnM9W11dIC0gQ3VzdG9tIGFjdGlvbiBidXR0b24gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5kZXNjcmlwdGlvblNldHRpbmdzXSAtIERlc2NyaXB0aW9uIHRydW5jYXRpb24gc2V0dGluZ3NcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLm9uRGF0YUxvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBkYXRhIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25EcmF3Q2FsbGJhY2tdIC0gQ2FsbGJhY2sgYWZ0ZXIgdGFibGUgZHJhd1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25QZXJtaXNzaW9uc0xvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBwZXJtaXNzaW9ucyBsb2FkZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmN1c3RvbURlbGV0ZUhhbmRsZXJdIC0gQ3VzdG9tIGRlbGV0ZSBoYW5kbGVyXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5vbkFmdGVyRGVsZXRlXSAtIENhbGxiYWNrIGFmdGVyIHN1Y2Nlc3NmdWwgZGVsZXRpb25cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmdldE1vZGlmeVVybF0gLSBDdXN0b20gVVJMIGdlbmVyYXRvciBmb3IgbW9kaWZ5L2VkaXQgYWN0aW9uc1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5vcmRlcmFibGU9dHJ1ZV0gLSBFbmFibGUvZGlzYWJsZSBzb3J0aW5nIGZvciBhbGwgY29sdW1uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtjb25maWcub3JkZXI9W1swLCAnYXNjJ11dXSAtIERlZmF1bHQgc29ydCBvcmRlclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnLmFqYXhEYXRhXSAtIEFkZGl0aW9uYWwgZGF0YSBwYXJhbWV0ZXJzIGZvciBBSkFYIHJlcXVlc3RzXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNlcnZlclNpZGU9ZmFsc2VdIC0gRW5hYmxlIHNlcnZlci1zaWRlIHByb2Nlc3NpbmdcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICAgICAgLy8gQ29yZSBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMudGFibGVJZCA9IGNvbmZpZy50YWJsZUlkO1xuICAgICAgICB0aGlzLmFwaU1vZHVsZSA9IGNvbmZpZy5hcGlNb2R1bGU7XG4gICAgICAgIHRoaXMucm91dGVQcmVmaXggPSBjb25maWcucm91dGVQcmVmaXg7XG4gICAgICAgIHRoaXMudHJhbnNsYXRpb25zID0gY29uZmlnLnRyYW5zbGF0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpcy5jb2x1bW5zID0gY29uZmlnLmNvbHVtbnMgfHwgW107XG4gICAgICAgIHRoaXMuc2hvd1N1Y2Nlc3NNZXNzYWdlcyA9IGNvbmZpZy5zaG93U3VjY2Vzc01lc3NhZ2VzIHx8IGZhbHNlO1xuICAgICAgICB0aGlzLnNob3dJbmZvID0gY29uZmlnLnNob3dJbmZvIHx8IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gU29ydGluZyBjb25maWd1cmF0aW9uIChiYWNrd2FyZCBjb21wYXRpYmxlKVxuICAgICAgICB0aGlzLm9yZGVyYWJsZSA9IGNvbmZpZy5vcmRlcmFibGUgIT09IHVuZGVmaW5lZCA/IGNvbmZpZy5vcmRlcmFibGUgOiB0cnVlO1xuICAgICAgICB0aGlzLmVuYWJsZVNlYXJjaEluZGV4ID0gY29uZmlnLmVuYWJsZVNlYXJjaEluZGV4ICE9PSBmYWxzZTsgLy8gRGVmYXVsdCB0cnVlXG4gICAgICAgIC8vIEFkanVzdCBkZWZhdWx0IHNvcnQgb3JkZXIgaWYgc2VhcmNoX2luZGV4IGlzIGFkZGVkIChpdCB3aWxsIGJlIGNvbHVtbiAwKVxuICAgICAgICB0aGlzLm9yZGVyID0gY29uZmlnLm9yZGVyIHx8ICh0aGlzLmVuYWJsZVNlYXJjaEluZGV4ID8gW1sxLCAnYXNjJ11dIDogW1swLCAnYXNjJ11dKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBlcm1pc3Npb24gc3RhdGUgKGxvYWRlZCBmcm9tIHNlcnZlcilcbiAgICAgICAgdGhpcy5wZXJtaXNzaW9ucyA9IHtcbiAgICAgICAgICAgIHNhdmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9kaWZ5OiBmYWxzZSxcbiAgICAgICAgICAgIGVkaXQ6IGZhbHNlLFxuICAgICAgICAgICAgZGVsZXRlOiBmYWxzZSxcbiAgICAgICAgICAgIGNvcHk6IGZhbHNlLFxuICAgICAgICAgICAgY3VzdG9tOiB7fVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQWN0aW9uIGJ1dHRvbnMgY29uZmlndXJhdGlvblxuICAgICAgICB0aGlzLmFjdGlvbkJ1dHRvbnMgPSBjb25maWcuYWN0aW9uQnV0dG9ucyB8fCBbJ2VkaXQnLCAnZGVsZXRlJ107XG4gICAgICAgIHRoaXMuY3VzdG9tQWN0aW9uQnV0dG9ucyA9IGNvbmZpZy5jdXN0b21BY3Rpb25CdXR0b25zIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gRGVzY3JpcHRpb24gdHJ1bmNhdGlvbiBzZXR0aW5nc1xuICAgICAgICB0aGlzLmRlc2NyaXB0aW9uU2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHtcbiAgICAgICAgICAgIG1heExpbmVzOiAzLFxuICAgICAgICAgICAgZHluYW1pY0hlaWdodDogZmFsc2UsXG4gICAgICAgICAgICBjYWxjdWxhdGVMaW5lczogbnVsbFxuICAgICAgICB9LCBjb25maWcuZGVzY3JpcHRpb25TZXR0aW5ncyB8fCB7fSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbnRlcm5hbCBwcm9wZXJ0aWVzXG4gICAgICAgIHRoaXMuJHRhYmxlID0gJChgIyR7dGhpcy50YWJsZUlkfWApO1xuICAgICAgICB0aGlzLmRhdGFUYWJsZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gT3B0aW9uYWwgY2FsbGJhY2tzXG4gICAgICAgIHRoaXMub25EYXRhTG9hZGVkID0gY29uZmlnLm9uRGF0YUxvYWRlZDtcbiAgICAgICAgdGhpcy5vbkRyYXdDYWxsYmFjayA9IGNvbmZpZy5vbkRyYXdDYWxsYmFjaztcbiAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkID0gY29uZmlnLm9uUGVybWlzc2lvbnNMb2FkZWQ7XG4gICAgICAgIHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlciA9IGNvbmZpZy5jdXN0b21EZWxldGVIYW5kbGVyO1xuICAgICAgICB0aGlzLm9uQWZ0ZXJEZWxldGUgPSBjb25maWcub25BZnRlckRlbGV0ZTtcbiAgICAgICAgdGhpcy5nZXRNb2RpZnlVcmwgPSBjb25maWcuZ2V0TW9kaWZ5VXJsO1xuICAgICAgICB0aGlzLmFqYXhEYXRhID0gY29uZmlnLmFqYXhEYXRhIHx8IHt9O1xuICAgICAgICB0aGlzLnNlcnZlclNpZGUgPSBjb25maWcuc2VydmVyU2lkZSB8fCBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlIHdpdGggcGVybWlzc2lvbiBsb2FkaW5nXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFNob3cgbG9hZGVyIHdoaWxlIGluaXRpYWxpemluZ1xuICAgICAgICAgICAgdGhpcy5zaG93TG9hZGVyKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpcnN0LCBsb2FkIHBlcm1pc3Npb25zIGZyb20gc2VydmVyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRQZXJtaXNzaW9ucygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIERhdGFUYWJsZSAod2lsbCBoYW5kbGUgbG9hZGVyL2VtcHR5IHN0YXRlIGluIGRhdGEgY2FsbGJhY2spXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIFBieERhdGFUYWJsZUluZGV4OicsIGVycm9yKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JJbml0aWFsaXppbmdUYWJsZSB8fCAnRmFpbGVkIHRvIGluaXRpYWxpemUgdGFibGUnKTtcbiAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcGVybWlzc2lvbnMgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBhc3luYyBsb2FkUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWFjbC9jaGVja1Blcm1pc3Npb25zYCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogdGhpcy5yb3V0ZVByZWZpeFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMucGVybWlzc2lvbnMsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uUGVybWlzc2lvbnNMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkKHRoaXMucGVybWlzc2lvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGxvYWQgcGVybWlzc2lvbnMsIHVzaW5nIGRlZmF1bHRzOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIE9uIGVycm9yLCBkZWZhdWx0IHRvIG5vIHBlcm1pc3Npb25zIGZvciBzYWZldHlcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIGNvbW1vbiBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgLy8gQWRkIHRoZSBkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQgY2xhc3MgdG8gdGhlIHRhYmxlXG4gICAgICAgIHRoaXMuJHRhYmxlLmFkZENsYXNzKCdkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBtaXNzaW5nIGhlYWRlciBjZWxscyBpZiBuZWVkZWQgZm9yIHNlYXJjaF9pbmRleCBjb2x1bW5cbiAgICAgICAgdGhpcy5lbnN1cmVIZWFkZXJDZWxscygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJvY2Vzc2VkQ29sdW1ucyA9IHRoaXMucHJvY2Vzc0NvbHVtbnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHYzIEFQSSBmb3JtYXQgd2l0aCBnZXRMaXN0IG1ldGhvZFxuICAgICAgICBsZXQgYWpheENvbmZpZztcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5hcGlNb2R1bGUuZ2V0TGlzdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gdjMgZm9ybWF0IHdpdGggZ2V0TGlzdCBtZXRob2QgLSB1c2UgY3VzdG9tIGFqYXggZnVuY3Rpb25cbiAgICAgICAgICAgIGFqYXhDb25maWcgPSAoZGF0YSwgY2FsbGJhY2ssIHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGlNb2R1bGUuZ2V0TGlzdCh0aGlzLmFqYXhEYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc2VkRGF0YSA9IHRoaXMuaGFuZGxlRGF0YUxvYWQocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBwcm9jZXNzZWREYXRhXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBtb2R1bGUgZG9lcyBub3QgaGF2ZSBnZXRMaXN0IG1ldGhvZCcpO1xuICAgICAgICAgICAgYWpheENvbmZpZyA9IHtkYXRhOiBbXX07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgICAgICAgIGFqYXg6IGFqYXhDb25maWcsXG4gICAgICAgICAgICBjb2x1bW5zOiBwcm9jZXNzZWRDb2x1bW5zLFxuICAgICAgICAgICAgb3JkZXI6IHRoaXMub3JkZXIsXG4gICAgICAgICAgICBvcmRlcmluZzogdGhpcy5vcmRlcmFibGUsXG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IHRoaXMuc2hvd0luZm8sXG4gICAgICAgICAgICBsYW5ndWFnZTogU2VtYW50aWNMb2NhbGl6YXRpb24uZGF0YVRhYmxlTG9jYWxpc2F0aW9uLFxuICAgICAgICAgICAgZHJhd0NhbGxiYWNrOiAoKSA9PiB0aGlzLmhhbmRsZURyYXdDYWxsYmFjaygpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0aGlzLmRhdGFUYWJsZSA9IHRoaXMuJHRhYmxlLkRhdGFUYWJsZShjb25maWcpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBoYW5kbGVyc1xuICAgICAgICB0aGlzLmluaXRpYWxpemVEZWxldGVIYW5kbGVyKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUNvcHlIYW5kbGVyKCk7XG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUN1c3RvbUhhbmRsZXJzKCk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIFByb2Nlc3MgY29sdW1uIGRlZmluaXRpb25zIGFuZCBhZGQgYWN0aW9uIGNvbHVtbiBpZiBuZWVkZWRcbiAgICAgKi9cbiAgICBwcm9jZXNzQ29sdW1ucygpIHtcbiAgICAgICAgY29uc3QgY29sdW1ucyA9IFsuLi50aGlzLmNvbHVtbnNdO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhpZGRlbiBzZWFyY2hfaW5kZXggY29sdW1uIGF0IHRoZSBiZWdpbm5pbmcgaWYgZW5hYmxlZCBhbmQgbm90IHByZXNlbnRcbiAgICAgICAgLy8gVGhpcyBjb2x1bW4gY29udGFpbnMgYWxsIHNlYXJjaGFibGUgdGV4dCB3aXRob3V0IEhUTUwgZm9ybWF0dGluZ1xuICAgICAgICBpZiAodGhpcy5lbmFibGVTZWFyY2hJbmRleCAmJiAhY29sdW1ucy5maW5kKGNvbCA9PiBjb2wuZGF0YSA9PT0gJ3NlYXJjaF9pbmRleCcpKSB7XG4gICAgICAgICAgICBjb2x1bW5zLnVuc2hpZnQoe1xuICAgICAgICAgICAgICAgIGRhdGE6ICdzZWFyY2hfaW5kZXgnLFxuICAgICAgICAgICAgICAgIHZpc2libGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgIHNlYXJjaGFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgb3JkZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBkZWZhdWx0Q29udGVudDogJycsXG4gICAgICAgICAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhLCB0eXBlLCByb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgc2VhcmNoX2luZGV4IGlzIG5vdCBwcm92aWRlZCBieSBiYWNrZW5kLCBnZW5lcmF0ZSBpdCBmcm9tIHJvdyBkYXRhXG4gICAgICAgICAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gRmFsbGJhY2s6IGdlbmVyYXRlIHNlYXJjaCBpbmRleCBmcm9tIHZpc2libGUgZmllbGRzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlYXJjaGFibGVGaWVsZHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMocm93KS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIGludGVybmFsIGZpZWxkcyBhbmQgcmVwcmVzZW50IGZpZWxkcyAodGhleSdyZSBvZnRlbiBkdXBsaWNhdGVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleSAhPT0gJ3NlYXJjaF9pbmRleCcgJiYga2V5ICE9PSAnaWQnICYmIGtleSAhPT0gJ3VuaXFpZCcgJiYgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5ICE9PSAnRFRfUm93SWQnICYmICFrZXkuZW5kc1dpdGgoJ19yZXByZXNlbnQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gcm93W2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3RyaXAgSFRNTCB0YWdzIGFuZCBhZGQgdG8gc2VhcmNoYWJsZSBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xlYW5WYWx1ZSA9IHZhbHVlLnJlcGxhY2UoLzxbXj5dKj4vZywgJycpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsZWFuVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGVGaWVsZHMucHVzaChjbGVhblZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlRmllbGRzLnB1c2godmFsdWUudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWxzbyBwcm9jZXNzIF9yZXByZXNlbnQgZmllbGRzIGFzIHRoZXkgY29udGFpbiB1c2VyLWZyaWVuZGx5IHRleHRcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMocm93KS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5LmVuZHNXaXRoKCdfcmVwcmVzZW50JykgJiYgcm93W2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjbGVhblZhbHVlID0gU3RyaW5nKHJvd1trZXldKS5yZXBsYWNlKC88W14+XSo+L2csICcnKS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsZWFuVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZUZpZWxkcy5wdXNoKGNsZWFuVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzZWFyY2hhYmxlRmllbGRzLmpvaW4oJyAnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBJZiBzb3J0aW5nIGlzIGdsb2JhbGx5IGRpc2FibGVkLCBlbnN1cmUgYWxsIGNvbHVtbnMgcmVzcGVjdCBpdFxuICAgICAgICBpZiAoIXRoaXMub3JkZXJhYmxlKSB7XG4gICAgICAgICAgICBjb2x1bW5zLmZvckVhY2goY29sID0+IHtcbiAgICAgICAgICAgICAgICAvLyBQcmVzZXJ2ZSBleHBsaWNpdCBvcmRlcmFibGU6IGZhbHNlLCBidXQgb3ZlcnJpZGUgdHJ1ZSBvciB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICBpZiAoY29sLm9yZGVyYWJsZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAgICAgY29sLm9yZGVyYWJsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgc3RhbmRhcmQgYWN0aW9uIGNvbHVtbiBpZiBub3QgYWxyZWFkeSBwcmVzZW50XG4gICAgICAgIGlmICghY29sdW1ucy5maW5kKGNvbCA9PiBjb2wuaXNBY3Rpb25Db2x1bW4pKSB7XG4gICAgICAgICAgICBjb2x1bW5zLnB1c2godGhpcy5jcmVhdGVBY3Rpb25Db2x1bW4oKSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBjb2x1bW5zO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgc3RhbmRhcmQgYWN0aW9uIGNvbHVtbiB3aXRoIHBlcm1pc3Npb24tYmFzZWQgcmVuZGVyaW5nXG4gICAgICovXG4gICAgY3JlYXRlQWN0aW9uQ29sdW1uKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGF0YTogbnVsbCxcbiAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBzZWFyY2hhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgIGNsYXNzTmFtZTogJ3JpZ2h0IGFsaWduZWQgY29sbGFwc2luZycsXG4gICAgICAgICAgICBpc0FjdGlvbkNvbHVtbjogdHJ1ZSxcbiAgICAgICAgICAgIHJlbmRlcjogKGRhdGEsIHR5cGUsIHJvdykgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ1dHRvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIHJlY29yZCBJRCAtIGNoZWNrIGZvciBib3RoIHVuaXFpZCBhbmQgaWQgZmllbGRzXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSByb3cudW5pcWlkIHx8IHJvdy5pZCB8fCAnJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBFZGl0IGJ1dHRvblxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdGlvbkJ1dHRvbnMuaW5jbHVkZXMoJ2VkaXQnKSAmJiBcbiAgICAgICAgICAgICAgICAgICAgKHRoaXMucGVybWlzc2lvbnMubW9kaWZ5IHx8IHRoaXMucGVybWlzc2lvbnMuZWRpdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBjdXN0b20gZ2V0TW9kaWZ5VXJsIGlmIHByb3ZpZGVkLCBvdGhlcndpc2UgdXNlIGRlZmF1bHRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kaWZ5VXJsID0gdGhpcy5nZXRNb2RpZnlVcmwgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0TW9kaWZ5VXJsKHJlY29yZElkKSA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgYCR7Z2xvYmFsUm9vdFVybH0ke3RoaXMucm91dGVQcmVmaXh9L21vZGlmeS8ke3JlY29yZElkfWA7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7bW9kaWZ5VXJsfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gZWRpdCBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRWRpdH1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZWRpdCBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ29weSBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdjb3B5JykgJiYgdGhpcy5wZXJtaXNzaW9ucy5jb3B5KSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGNvcHkgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcENvcHl9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGNvcHkgb3V0bGluZSBibHVlXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ3VzdG9tIGJ1dHRvbnNcbiAgICAgICAgICAgICAgICB0aGlzLmN1c3RvbUFjdGlvbkJ1dHRvbnMuZm9yRWFjaChjdXN0b21CdXR0b24gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wZXJtaXNzaW9ucy5jdXN0b20gJiYgdGhpcy5wZXJtaXNzaW9ucy5jdXN0b21bY3VzdG9tQnV0dG9uLm5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBocmVmID0gY3VzdG9tQnV0dG9uLmhyZWYgfHwgJyMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YVZhbHVlID0gY3VzdG9tQnV0dG9uLmluY2x1ZGVJZCA/IGBkYXRhLXZhbHVlPVwiJHtyZWNvcmRJZH1cImAgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiR7aHJlZn1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAke2RhdGFWYWx1ZX1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiAke2N1c3RvbUJ1dHRvbi5jbGFzc30gcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7U2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGN1c3RvbUJ1dHRvbi50b29sdGlwKX1cIj5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCIke2N1c3RvbUJ1dHRvbi5pY29ufVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIERlbGV0ZSBidXR0b24gKGFsd2F5cyBsYXN0KVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFjdGlvbkJ1dHRvbnMuaW5jbHVkZXMoJ2RlbGV0ZScpICYmIHRoaXMucGVybWlzc2lvbnMuZGVsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiB0cmFzaCByZWRcIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gYnV0dG9ucy5sZW5ndGggPiAwID8gXG4gICAgICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj4ke2J1dHRvbnMuam9pbignJyl9PC9kaXY+YCA6IFxuICAgICAgICAgICAgICAgICAgICAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRhdGEgbG9hZCBhbmQgZW1wdHkgc3RhdGUgbWFuYWdlbWVudFxuICAgICAqIHYzIEFQSSBmb3JtYXQ6IHtyZXN1bHQ6IGJvb2xlYW4sIGRhdGE6IGFycmF5fSBvciB7ZGF0YToge2l0ZW1zOiBhcnJheX19XG4gICAgICovXG4gICAgaGFuZGxlRGF0YUxvYWQocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGlkZSBsb2FkZXIgZmlyc3RcbiAgICAgICAgdGhpcy5oaWRlTG9hZGVyKCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgZGF0YSA9IFtdO1xuICAgICAgICBsZXQgaXNTdWNjZXNzID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgZXJyb3IgcmVzcG9uc2VcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCByZXNwb25zZS5yZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBpc1N1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIGRhdGEgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTdGFuZGFyZCB2MyBmb3JtYXQgd2l0aCBkYXRhIGFycmF5XG4gICAgICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgIGlzU3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfVxuICAgICAgICAvLyB2MyBmb3JtYXQgd2l0aCBpdGVtcyBwcm9wZXJ0eVxuICAgICAgICBlbHNlIGlmIChyZXNwb25zZS5kYXRhICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YS5pdGVtcykpIHtcbiAgICAgICAgICAgIGlzU3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICBkYXRhID0gcmVzcG9uc2UuZGF0YS5pdGVtcztcbiAgICAgICAgfVxuICAgICAgICAvLyBGYWxsYmFjayBmb3IgcmVzcG9uc2VzIHdpdGggcmVzdWx0OnRydWUgYnV0IG5vIGRhdGFcbiAgICAgICAgZWxzZSBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpc1N1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgZGF0YSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBpc0VtcHR5ID0gIWlzU3VjY2VzcyB8fCBkYXRhLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKGlzRW1wdHkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRW1wdHkgJiYgIWlzU3VjY2Vzcykge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5leF9FcnJvckxvYWRpbmdEYXRhIHx8ICdGYWlsZWQgdG8gbG9hZCBkYXRhJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm9uRGF0YUxvYWRlZCkge1xuICAgICAgICAgICAgLy8gUGFzcyBub3JtYWxpemVkIHJlc3BvbnNlIHRvIGNhbGxiYWNrXG4gICAgICAgICAgICBjb25zdCBub3JtYWxpemVkUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBpc1N1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMub25EYXRhTG9hZGVkKG5vcm1hbGl6ZWRSZXNwb25zZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZHJhdyBjYWxsYmFjayBmb3IgcG9zdC1yZW5kZXIgb3BlcmF0aW9uc1xuICAgICAqL1xuICAgIGhhbmRsZURyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBwb3B1cHNcbiAgICAgICAgdGhpcy4kdGFibGUuZmluZCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gTW92ZSBBZGQgTmV3IGJ1dHRvbiB0byBEYXRhVGFibGVzIHdyYXBwZXJcbiAgICAgICAgdGhpcy5yZXBvc2l0aW9uQWRkQnV0dG9uKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGRvdWJsZS1jbGljayBlZGl0aW5nXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3VzdG9tIGRyYXcgY2FsbGJhY2tcbiAgICAgICAgaWYgKHRoaXMub25EcmF3Q2FsbGJhY2spIHtcbiAgICAgICAgICAgIHRoaXMub25EcmF3Q2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBFbnN1cmUgdGFibGUgaGFzIGVub3VnaCBoZWFkZXIgY2VsbHMgZm9yIGFsbCBjb2x1bW5zXG4gICAgICogVGhpcyBpcyBuZWVkZWQgd2hlbiB3ZSBhZGQgdGhlIGhpZGRlbiBzZWFyY2hfaW5kZXggY29sdW1uIHByb2dyYW1tYXRpY2FsbHlcbiAgICAgKi9cbiAgICBlbnN1cmVIZWFkZXJDZWxscygpIHtcbiAgICAgICAgaWYgKCF0aGlzLmVuYWJsZVNlYXJjaEluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICR0aGVhZCA9IHRoaXMuJHRhYmxlLmZpbmQoJ3RoZWFkJyk7XG4gICAgICAgIGlmICghJHRoZWFkLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZWFkIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgIHRoaXMuJHRhYmxlLnByZXBlbmQoJzx0aGVhZD48dHI+PC90cj48L3RoZWFkPicpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkaGVhZGVyUm93ID0gdGhpcy4kdGFibGUuZmluZCgndGhlYWQgdHInKS5maXJzdCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGEgaGlkZGVuIGhlYWRlciBjZWxsIGF0IHRoZSBiZWdpbm5pbmcgZm9yIHNlYXJjaF9pbmRleFxuICAgICAgICAvLyBEYXRhVGFibGVzIHJlcXVpcmVzIG1hdGNoaW5nIG51bWJlciBvZiB0aCBlbGVtZW50cyBhbmQgY29sdW1uc1xuICAgICAgICAkaGVhZGVyUm93LnByZXBlbmQoJzx0aCBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIj5TZWFyY2ggSW5kZXg8L3RoPicpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXBvc2l0aW9uIEFkZCBOZXcgYnV0dG9uIHRvIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAqL1xuICAgIHJlcG9zaXRpb25BZGRCdXR0b24oKSB7XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHdyYXBwZXIgPSAkKGAjJHt0aGlzLnRhYmxlSWR9X3dyYXBwZXJgKTtcbiAgICAgICAgY29uc3QgJGxlZnRDb2x1bW4gPSAkd3JhcHBlci5maW5kKCcuZWlnaHQud2lkZS5jb2x1bW4nKS5maXJzdCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRhZGRCdXR0b24ubGVuZ3RoICYmICRsZWZ0Q29sdW1uLmxlbmd0aCAmJiB0aGlzLnBlcm1pc3Npb25zLnNhdmUpIHtcbiAgICAgICAgICAgICRsZWZ0Q29sdW1uLmFwcGVuZCgkYWRkQnV0dG9uKTtcbiAgICAgICAgICAgICRhZGRCdXR0b24uc2hvdygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVsZXRlIGhhbmRsZXIgd2l0aCB0d28tc3RlcCBjb25maXJtYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVsZXRlSGFuZGxlcigpIHtcbiAgICAgICAgLy8gRGVsZXRlU29tZXRoaW5nLmpzIGhhbmRsZXMgZmlyc3QgY2xpY2tcbiAgICAgICAgLy8gV2UgaGFuZGxlIHNlY29uZCBjbGljayB3aGVuIHR3by1zdGVwcy1kZWxldGUgY2xhc3MgaXMgcmVtb3ZlZFxuICAgICAgICB0aGlzLiR0YWJsZS5vbignY2xpY2snLCAnYS5kZWxldGU6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlcihyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB0aGlzLmNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGlNb2R1bGUuZGVsZXRlUmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHRoaXMuY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjb3B5IGhhbmRsZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ29weUhhbmRsZXIoKSB7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9uKCdjbGljaycsICdhLmNvcHknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2Ugc2FtZSBsb2dpYyBhcyBtb2RpZnkgVVJMIGJ1dCBhZGQgY29weSBwYXJhbWV0ZXJcbiAgICAgICAgICAgIGxldCBjb3B5VXJsO1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0TW9kaWZ5VXJsKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBnZXRNb2RpZnlVcmwgYW5kIGFkZCBjb3B5IHBhcmFtZXRlclxuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsKHJlY29yZElkKTtcbiAgICAgICAgICAgICAgICBpZiAobW9kaWZ5VXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSByZWNvcmRJZCBmcm9tIFVSTCBhbmQgYWRkIGNvcHkgcGFyYW1ldGVyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VVcmwgPSBtb2RpZnlVcmwucmVwbGFjZShgLyR7cmVjb3JkSWR9YCwgJycpO1xuICAgICAgICAgICAgICAgICAgICBjb3B5VXJsID0gYCR7YmFzZVVybH0vP2NvcHk9JHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRGVmYXVsdCBVUkwgcGF0dGVyblxuICAgICAgICAgICAgICAgIGNvcHlVcmwgPSBgJHtnbG9iYWxSb290VXJsfSR7dGhpcy5yb3V0ZVByZWZpeH0vbW9kaWZ5Lz9jb3B5PSR7cmVjb3JkSWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gY29weSBVUkxcbiAgICAgICAgICAgIGlmIChjb3B5VXJsKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gY29weVVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY3VzdG9tIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDdXN0b21IYW5kbGVycygpIHtcbiAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zLmZvckVhY2goY3VzdG9tQnV0dG9uID0+IHtcbiAgICAgICAgICAgIGlmIChjdXN0b21CdXR0b24ub25DbGljaykge1xuICAgICAgICAgICAgICAgIHRoaXMuJHRhYmxlLm9uKCdjbGljaycsIGBhLiR7Y3VzdG9tQnV0dG9uLmNsYXNzfWAsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21CdXR0b24ub25DbGljayhyZWNvcmRJZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciByZWNvcmQgZGVsZXRpb25cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFJlbG9hZCB0YWJsZSBkYXRhIHdpdGggY2FsbGJhY2sgc3VwcG9ydFxuICAgICAgICAgICAgY29uc3QgcmVsb2FkQ2FsbGJhY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2FsbCBjdXN0b20gYWZ0ZXItZGVsZXRlIGNhbGxiYWNrIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLm9uQWZ0ZXJEZWxldGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkFmdGVyRGVsZXRlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWxvYWQgdGFibGUgYW5kIGV4ZWN1dGUgY2FsbGJhY2tcbiAgICAgICAgICAgIHRoaXMuZGF0YVRhYmxlLmFqYXgucmVsb2FkKHJlbG9hZENhbGxiYWNrLCBmYWxzZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZWxhdGVkIGNvbXBvbmVudHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9ucyAhPT0gJ3VuZGVmaW5lZCcgJiYgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdWNjZXNzIG1lc3NhZ2UgcmVtb3ZlZCAtIG5vIG5lZWQgdG8gc2hvdyBzdWNjZXNzIGZvciBkZWxldGlvbiBvcGVyYXRpb25zXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmFuc2xhdGlvbnMuZGVsZXRlRXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvc3NpYmxlVG9EZWxldGVSZWNvcmQ7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGUgZnJvbSBhbGwgZGVsZXRlIGJ1dHRvbnNcbiAgICAgICAgdGhpcy4kdGFibGUuZmluZCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRlciB3aGlsZSBsb2FkaW5nIGRhdGFcbiAgICAgKi9cbiAgICBzaG93TG9hZGVyKCkge1xuICAgICAgICAvLyBIaWRlIGV2ZXJ5dGhpbmcgZmlyc3RcbiAgICAgICAgLy8gRmluZCB0aGUgdGFibGUncyBwYXJlbnQgY29udGFpbmVyIC0gbmVlZCB0aGUgb3JpZ2luYWwgY29udGFpbmVyLCBub3QgdGhlIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAgICBjb25zdCAkd3JhcHBlciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZCQ9XCJfd3JhcHBlclwiXScpO1xuICAgICAgICBsZXQgJGNvbnRhaW5lcjtcbiAgICAgICAgaWYgKCR3cmFwcGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBwYXJlbnQgb2YgdGhlIHdyYXBwZXIgKHNob3VsZCBiZSB0aGUgb3JpZ2luYWwgY29udGFpbmVyKVxuICAgICAgICAgICAgJGNvbnRhaW5lciA9ICR3cmFwcGVyLnBhcmVudCgnZGl2W2lkXScpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZhbGxiYWNrIGlmIHN0cnVjdHVyZSBpcyBkaWZmZXJlbnRcbiAgICAgICAgaWYgKCEkY29udGFpbmVyIHx8ICEkY29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgJGNvbnRhaW5lciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZF06bm90KFtpZCQ9XCJfd3JhcHBlclwiXSknKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCAkcGxhY2Vob2xkZXIgPSAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKTtcbiAgICAgICAgY29uc3QgJGFkZEJ1dHRvbiA9ICQoJyNhZGQtbmV3LWJ1dHRvbicpO1xuICAgICAgICBcbiAgICAgICAgJGNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICRwbGFjZWhvbGRlci5oaWRlKCk7XG4gICAgICAgICRhZGRCdXR0b24uaGlkZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGFuZCBzaG93IGxvYWRlciBpZiBub3QgZXhpc3RzXG4gICAgICAgIGxldCAkbG9hZGVyID0gJCgnI3RhYmxlLWRhdGEtbG9hZGVyJyk7XG4gICAgICAgIGlmICghJGxvYWRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHNlZ21lbnQgd2l0aCBsb2FkZXIgZm9yIGJldHRlciB2aXN1YWwgYXBwZWFyYW5jZVxuICAgICAgICAgICAgJGxvYWRlciA9ICQoYFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJ0YWJsZS1kYXRhLWxvYWRlclwiIGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwibWluLWhlaWdodDogMjAwcHg7IHBvc2l0aW9uOiByZWxhdGl2ZTtcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmdEYXRhIHx8ICdMb2FkaW5nLi4uJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIC8vIEluc2VydCBsb2FkZXIgaW4gdGhlIGFwcHJvcHJpYXRlIHBsYWNlXG4gICAgICAgICAgICBpZiAoJGNvbnRhaW5lci5sZW5ndGggJiYgJGNvbnRhaW5lci5wYXJlbnQoKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmJlZm9yZSgkbG9hZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJHBsYWNlaG9sZGVyLmxlbmd0aCAmJiAkcGxhY2Vob2xkZXIucGFyZW50KCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJHBsYWNlaG9sZGVyLmJlZm9yZSgkbG9hZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2s6IGFwcGVuZCB0byBib2R5IG9yIHBhcmVudCBjb250YWluZXJcbiAgICAgICAgICAgICAgICBjb25zdCAkcGFyZW50ID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnLnB1c2hlcicpIHx8IHRoaXMuJHRhYmxlLnBhcmVudCgpO1xuICAgICAgICAgICAgICAgICRwYXJlbnQuYXBwZW5kKCRsb2FkZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRsb2FkZXIuc2hvdygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIGxvYWRlclxuICAgICAqL1xuICAgIGhpZGVMb2FkZXIoKSB7XG4gICAgICAgICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpLmhpZGUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGVtcHR5IHRhYmxlIHBsYWNlaG9sZGVyIHZpc2liaWxpdHlcbiAgICAgKi9cbiAgICB0b2dnbGVFbXB0eVBsYWNlaG9sZGVyKGlzRW1wdHkpIHtcbiAgICAgICAgLy8gRmluZCB0aGUgdGFibGUncyBwYXJlbnQgY29udGFpbmVyIC0gbmVlZCB0aGUgb3JpZ2luYWwgY29udGFpbmVyLCBub3QgdGhlIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAgICAvLyBEYXRhVGFibGVzIHdyYXBzIHRoZSB0YWJsZSBpbiBhIGRpdiB3aXRoIGlkIGVuZGluZyBpbiAnX3dyYXBwZXInXG4gICAgICAgIC8vIFdlIG5lZWQgdG8gZmluZCB0aGUgcGFyZW50IG9mIHRoYXQgd3JhcHBlciB3aGljaCBpcyB0aGUgb3JpZ2luYWwgY29udGFpbmVyXG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkJD1cIl93cmFwcGVyXCJdJyk7XG4gICAgICAgIGxldCAkY29udGFpbmVyO1xuICAgICAgICBpZiAoJHdyYXBwZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHBhcmVudCBvZiB0aGUgd3JhcHBlciAoc2hvdWxkIGJlIHRoZSBvcmlnaW5hbCBjb250YWluZXIpXG4gICAgICAgICAgICAkY29udGFpbmVyID0gJHdyYXBwZXIucGFyZW50KCdkaXZbaWRdJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmFsbGJhY2sgaWYgc3RydWN0dXJlIGlzIGRpZmZlcmVudFxuICAgICAgICBpZiAoISRjb250YWluZXIgfHwgISRjb250YWluZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAkY29udGFpbmVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkXTpub3QoW2lkJD1cIl93cmFwcGVyXCJdKScpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHBsYWNlaG9sZGVyID0gJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNFbXB0eSkge1xuICAgICAgICAgICAgJGNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICAkYWRkQnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSBwbGFjZWhvbGRlciBpcyB2aXNpYmxlXG4gICAgICAgICAgICBpZiAoJHBsYWNlaG9sZGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoJHBsYWNlaG9sZGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5wZXJtaXNzaW9ucy5zYXZlKSB7XG4gICAgICAgICAgICAgICAgJGFkZEJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkY29udGFpbmVyLnNob3coKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRvdWJsZS1jbGljayBmb3IgZWRpdGluZ1xuICAgICAqIEV4Y2x1ZGVzIGFjdGlvbiBidXR0b24gY2VsbHMgdG8gYXZvaWQgY29uZmxpY3RzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgpIHtcbiAgICAgICAgdGhpcy4kdGFibGUub24oJ2RibGNsaWNrJywgJ3Rib2R5IHRkOm5vdCgucmlnaHQuYWxpZ25lZCknLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuZGF0YVRhYmxlLnJvdyhlLmN1cnJlbnRUYXJnZXQpLmRhdGEoKTtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgcmVjb3JkIElEIC0gY2hlY2sgZm9yIGJvdGggdW5pcWlkIGFuZCBpZCBmaWVsZHNcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gZGF0YSAmJiAoZGF0YS51bmlxaWQgfHwgZGF0YS5pZCk7XG4gICAgICAgICAgICBpZiAocmVjb3JkSWQgJiYgKHRoaXMucGVybWlzc2lvbnMubW9kaWZ5IHx8IHRoaXMucGVybWlzc2lvbnMuZWRpdCkpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgY3VzdG9tIGdldE1vZGlmeVVybCBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kaWZ5VXJsID0gdGhpcy5nZXRNb2RpZnlVcmwgPyBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRNb2RpZnlVcmwocmVjb3JkSWQpIDogXG4gICAgICAgICAgICAgICAgICAgIGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvJHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IG1vZGlmeVVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHVuaWZpZWQgZGVzY3JpcHRpb24gcmVuZGVyZXIgd2l0aCB0cnVuY2F0aW9uIHN1cHBvcnRcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJlbmRlcmVyIGZ1bmN0aW9uIGZvciBEYXRhVGFibGVzXG4gICAgICovXG4gICAgY3JlYXRlRGVzY3JpcHRpb25SZW5kZXJlcigpIHtcbiAgICAgICAgcmV0dXJuIChkYXRhLCB0eXBlLCByb3cpID0+IHtcbiAgICAgICAgICAgIGlmICghZGF0YSB8fCBkYXRhLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ+KAlCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAvLyBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVEZXNjID0gd2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChkYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXNjcmlwdGlvbkxpbmVzID0gc2FmZURlc2Muc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpICE9PSAnJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG1heCBsaW5lc1xuICAgICAgICAgICAgICAgIGxldCBtYXhMaW5lcyA9IHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5tYXhMaW5lcztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmR5bmFtaWNIZWlnaHQgJiYgdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmNhbGN1bGF0ZUxpbmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heExpbmVzID0gdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmNhbGN1bGF0ZUxpbmVzKHJvdyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChkZXNjcmlwdGlvbkxpbmVzLmxlbmd0aCA8PSBtYXhMaW5lcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiBmaXRzIC0gc2hvdyB3aXRoIHByZXNlcnZlZCBmb3JtYXR0aW5nXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZERlc2MgPSBkZXNjcmlwdGlvbkxpbmVzLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb24tdGV4dFwiIHN0eWxlPVwibGluZS1oZWlnaHQ6IDEuMztcIj4ke2Zvcm1hdHRlZERlc2N9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiB0b28gbG9uZyAtIHRydW5jYXRlIHdpdGggcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlzaWJsZUxpbmVzID0gZGVzY3JpcHRpb25MaW5lcy5zbGljZSgwLCBtYXhMaW5lcyk7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVMaW5lc1ttYXhMaW5lcyAtIDFdICs9ICcuLi4nO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkRGVzYyA9IHZpc2libGVMaW5lcy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxEZXNjID0gZGVzY3JpcHRpb25MaW5lcy5qb2luKCdcXG4nKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uLXRleHQgdHJ1bmNhdGVkIHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2Z1bGxEZXNjfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcG9zaXRpb249XCJ0b3AgcmlnaHRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cIndpZGVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBoZWxwOyBib3JkZXItYm90dG9tOiAxcHggZG90dGVkICM5OTk7IGxpbmUtaGVpZ2h0OiAxLjM7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3RydW5jYXRlZERlc2N9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3Igc2VhcmNoIGFuZCBvdGhlciBvcGVyYXRpb25zLCByZXR1cm4gcGxhaW4gdGV4dFxuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgdGhlIERhdGFUYWJsZSBhbmQgY2xlYW51cFxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIFJlbW92ZSBldmVudCBoYW5kbGVyc1xuICAgICAgICB0aGlzLiR0YWJsZS5vZmYoJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknKTtcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdjbGljaycsICdhLmNvcHknKTtcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IERhdGFUYWJsZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRoaXMuZGF0YVRhYmxlICYmIHR5cGVvZiB0aGlzLmRhdGFUYWJsZS5kZXN0cm95ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGlzLmRhdGFUYWJsZS5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkZXJcbiAgICAgICAgJCgnI3RhYmxlLWRhdGEtbG9hZGVyJykucmVtb3ZlKCk7XG4gICAgfVxufVxuXG4vLyBNYWtlIGF2YWlsYWJsZSBnbG9iYWxseVxud2luZG93LlBieERhdGFUYWJsZUluZGV4ID0gUGJ4RGF0YVRhYmxlSW5kZXg7Il19