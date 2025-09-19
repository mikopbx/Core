"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
   * @param {Function} [config.customDeletePermissionCheck] - Function to check if delete is allowed for a row
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
    this.showInfo = config.showInfo || false;
    this.dataTableOptions = config.dataTableOptions || {}; // Sorting configuration (backward compatible)

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
    this.customDeletePermissionCheck = config.customDeletePermissionCheck;
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

      var config = _objectSpread({
        ajax: ajaxConfig,
        columns: processedColumns,
        order: this.order,
        ordering: this.orderable,
        lengthChange: false,
        paging: false,
        searching: true,
        info: this.showInfo,
        autoWidth: false,
        language: SemanticLocalization.dataTableLocalisation,
        drawCallback: function drawCallback() {
          return _this.handleDrawCallback();
        }
      }, this.dataTableOptions);

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
            // Check if custom delete permission check is needed
            var canDelete = true;

            if (_this2.customDeletePermissionCheck && typeof _this2.customDeletePermissionCheck === 'function') {
              canDelete = _this2.customDeletePermissionCheck(row);
            }

            if (canDelete) {
              buttons.push("\n                            <a href=\"#\"\n                               data-value=\"".concat(recordId, "\"\n                               class=\"ui button delete two-steps-delete popuped\"\n                               data-content=\"").concat(globalTranslate.bt_ToolTipDelete, "\">\n                                <i class=\"icon trash red\"></i>\n                            </a>\n                        "));
            } else {
              // Show disabled delete button with explanation
              buttons.push("\n                            <a href=\"#\"\n                               class=\"ui button delete disabled popuped\"\n                               data-content=\"".concat(_this2.translations.deleteDisabledTooltip || globalTranslate.bt_CannotDelete, "\">\n                                <i class=\"icon trash grey\"></i>\n                            </a>\n                        "));
            }
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

      this.initializeDoubleClickEdit(); // Hide pagination controls when all records fit on one page

      this.togglePaginationVisibility(); // Custom draw callback

      if (this.onDrawCallback) {
        this.onDrawCallback();
      }
    }
    /**
     * Toggle pagination visibility based on page count
     * Hides pagination when all records fit on a single page
     */

  }, {
    key: "togglePaginationVisibility",
    value: function togglePaginationVisibility() {
      var _this3 = this;

      // Use setTimeout to ensure DataTable is fully initialized
      setTimeout(function () {
        // Get the DataTable instance
        var table = _this3.$table.DataTable();

        if (table && table.page) {
          var info = table.page.info();

          var tableId = _this3.$table.attr('id');

          var $paginateContainer = $("#".concat(tableId, "_paginate"));

          if ($paginateContainer.length) {
            if (info.pages <= 1) {
              // Hide pagination when there's only one page
              $paginateContainer.hide();
            } else {
              // Show pagination when there are multiple pages
              $paginateContainer.show();
            }
          }
        }
      }, 0);
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
      var _this4 = this;

      // DeleteSomething.js handles first click
      // We handle second click when two-steps-delete class is removed
      this.$table.on('click', 'a.delete:not(.two-steps-delete)', function (e) {
        e.preventDefault();
        var $button = $(e.currentTarget);
        var recordId = $button.attr('data-value'); // Add loading state

        $button.addClass('loading disabled');

        if (_this4.customDeleteHandler) {
          _this4.customDeleteHandler(recordId, function (response) {
            return _this4.cbAfterDeleteRecord(response);
          });
        } else {
          _this4.apiModule.deleteRecord(recordId, function (response) {
            return _this4.cbAfterDeleteRecord(response);
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
      var _this5 = this;

      this.$table.on('click', 'a.copy', function (e) {
        e.preventDefault();
        var recordId = $(e.currentTarget).attr('data-value'); // Use same logic as modify URL but add copy parameter

        var copyUrl;

        if (_this5.getModifyUrl) {
          // Use custom getModifyUrl and add copy parameter
          var modifyUrl = _this5.getModifyUrl(recordId);

          if (modifyUrl) {
            // Remove recordId from URL and add copy parameter
            var baseUrl = modifyUrl.replace("/".concat(recordId), '');
            copyUrl = "".concat(baseUrl, "/?copy=").concat(recordId);
          }
        } else {
          // Default URL pattern
          copyUrl = "".concat(globalRootUrl).concat(_this5.routePrefix, "/modify/?copy=").concat(recordId);
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
      var _this6 = this;

      this.customActionButtons.forEach(function (customButton) {
        if (customButton.onClick) {
          _this6.$table.on('click', "a.".concat(customButton["class"]), function (e) {
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
      var _this7 = this;

      if (response.result === true) {
        // Reload table data with callback support
        var reloadCallback = function reloadCallback() {
          // Call custom after-delete callback if provided
          if (typeof _this7.onAfterDelete === 'function') {
            _this7.onAfterDelete(response);
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
      var _this8 = this;

      this.$table.on('dblclick', 'tbody td:not(.right.aligned)', function (e) {
        var data = _this8.dataTable.row(e.currentTarget).data(); // Get the record ID - check for both uniqid and id fields


        var recordId = data && (data.uniqid || data.id);

        if (recordId && (_this8.permissions.modify || _this8.permissions.edit)) {
          // Use custom getModifyUrl if provided, otherwise use default
          var modifyUrl = _this8.getModifyUrl ? _this8.getModifyUrl(recordId) : "".concat(globalRootUrl).concat(_this8.routePrefix, "/modify/").concat(recordId);
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
      var _this9 = this;

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

          var maxLines = _this9.descriptionSettings.maxLines;

          if (_this9.descriptionSettings.dynamicHeight && _this9.descriptionSettings.calculateLines) {
            maxLines = _this9.descriptionSettings.calculateLines(row);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL1BieERhdGFUYWJsZUluZGV4LmpzIl0sIm5hbWVzIjpbIlBieERhdGFUYWJsZUluZGV4IiwiY29uZmlnIiwidGFibGVJZCIsImFwaU1vZHVsZSIsInJvdXRlUHJlZml4IiwidHJhbnNsYXRpb25zIiwiY29sdW1ucyIsInNob3dTdWNjZXNzTWVzc2FnZXMiLCJzaG93SW5mbyIsImRhdGFUYWJsZU9wdGlvbnMiLCJvcmRlcmFibGUiLCJ1bmRlZmluZWQiLCJlbmFibGVTZWFyY2hJbmRleCIsIm9yZGVyIiwicGVybWlzc2lvbnMiLCJzYXZlIiwibW9kaWZ5IiwiZWRpdCIsImNvcHkiLCJjdXN0b20iLCJhY3Rpb25CdXR0b25zIiwiY3VzdG9tQWN0aW9uQnV0dG9ucyIsImRlc2NyaXB0aW9uU2V0dGluZ3MiLCJPYmplY3QiLCJhc3NpZ24iLCJtYXhMaW5lcyIsImR5bmFtaWNIZWlnaHQiLCJjYWxjdWxhdGVMaW5lcyIsIiR0YWJsZSIsIiQiLCJkYXRhVGFibGUiLCJvbkRhdGFMb2FkZWQiLCJvbkRyYXdDYWxsYmFjayIsIm9uUGVybWlzc2lvbnNMb2FkZWQiLCJjdXN0b21EZWxldGVIYW5kbGVyIiwib25BZnRlckRlbGV0ZSIsImdldE1vZGlmeVVybCIsImN1c3RvbURlbGV0ZVBlcm1pc3Npb25DaGVjayIsImFqYXhEYXRhIiwic2VydmVyU2lkZSIsInNob3dMb2FkZXIiLCJsb2FkUGVybWlzc2lvbnMiLCJpbml0aWFsaXplRGF0YVRhYmxlIiwiZXJyb3IiLCJjb25zb2xlIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJleF9FcnJvckluaXRpYWxpemluZ1RhYmxlIiwiaGlkZUxvYWRlciIsInRvZ2dsZUVtcHR5UGxhY2Vob2xkZXIiLCJyZXNwb25zZSIsImFqYXgiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwibWV0aG9kIiwiZGF0YSIsImNvbnRyb2xsZXIiLCJkYXRhVHlwZSIsInN1Y2Nlc3MiLCJ3YXJuIiwiYWRkQ2xhc3MiLCJlbnN1cmVIZWFkZXJDZWxscyIsInByb2Nlc3NlZENvbHVtbnMiLCJwcm9jZXNzQ29sdW1ucyIsImFqYXhDb25maWciLCJnZXRMaXN0IiwiY2FsbGJhY2siLCJzZXR0aW5ncyIsInByb2Nlc3NlZERhdGEiLCJoYW5kbGVEYXRhTG9hZCIsIm9yZGVyaW5nIiwibGVuZ3RoQ2hhbmdlIiwicGFnaW5nIiwic2VhcmNoaW5nIiwiaW5mbyIsImF1dG9XaWR0aCIsImxhbmd1YWdlIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJkYXRhVGFibGVMb2NhbGlzYXRpb24iLCJkcmF3Q2FsbGJhY2siLCJoYW5kbGVEcmF3Q2FsbGJhY2siLCJEYXRhVGFibGUiLCJpbml0aWFsaXplRGVsZXRlSGFuZGxlciIsImluaXRpYWxpemVDb3B5SGFuZGxlciIsImluaXRpYWxpemVDdXN0b21IYW5kbGVycyIsImZpbmQiLCJjb2wiLCJ1bnNoaWZ0IiwidmlzaWJsZSIsInNlYXJjaGFibGUiLCJkZWZhdWx0Q29udGVudCIsInJlbmRlciIsInR5cGUiLCJyb3ciLCJzZWFyY2hhYmxlRmllbGRzIiwia2V5cyIsImZvckVhY2giLCJrZXkiLCJlbmRzV2l0aCIsInZhbHVlIiwiY2xlYW5WYWx1ZSIsInJlcGxhY2UiLCJ0cmltIiwicHVzaCIsInRvU3RyaW5nIiwiU3RyaW5nIiwiam9pbiIsInRvTG93ZXJDYXNlIiwiaXNBY3Rpb25Db2x1bW4iLCJjcmVhdGVBY3Rpb25Db2x1bW4iLCJjbGFzc05hbWUiLCJidXR0b25zIiwicmVjb3JkSWQiLCJ1bmlxaWQiLCJpZCIsImluY2x1ZGVzIiwibW9kaWZ5VXJsIiwiYnRfVG9vbFRpcEVkaXQiLCJidF9Ub29sVGlwQ29weSIsImN1c3RvbUJ1dHRvbiIsIm5hbWUiLCJocmVmIiwiZGF0YVZhbHVlIiwiaW5jbHVkZUlkIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJ0b29sdGlwIiwiaWNvbiIsImNhbkRlbGV0ZSIsImJ0X1Rvb2xUaXBEZWxldGUiLCJkZWxldGVEaXNhYmxlZFRvb2x0aXAiLCJidF9DYW5ub3REZWxldGUiLCJsZW5ndGgiLCJpc1N1Y2Nlc3MiLCJyZXN1bHQiLCJBcnJheSIsImlzQXJyYXkiLCJpdGVtcyIsImlzRW1wdHkiLCJleF9FcnJvckxvYWRpbmdEYXRhIiwibm9ybWFsaXplZFJlc3BvbnNlIiwicG9wdXAiLCJyZXBvc2l0aW9uQWRkQnV0dG9uIiwiaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCIsInRvZ2dsZVBhZ2luYXRpb25WaXNpYmlsaXR5Iiwic2V0VGltZW91dCIsInRhYmxlIiwicGFnZSIsImF0dHIiLCIkcGFnaW5hdGVDb250YWluZXIiLCJwYWdlcyIsImhpZGUiLCJzaG93IiwiJHRoZWFkIiwicHJlcGVuZCIsIiRoZWFkZXJSb3ciLCJmaXJzdCIsIiRhZGRCdXR0b24iLCIkd3JhcHBlciIsIiRsZWZ0Q29sdW1uIiwiYXBwZW5kIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwiY3VycmVudFRhcmdldCIsImNiQWZ0ZXJEZWxldGVSZWNvcmQiLCJkZWxldGVSZWNvcmQiLCJjb3B5VXJsIiwiYmFzZVVybCIsIndpbmRvdyIsImxvY2F0aW9uIiwib25DbGljayIsInJlbG9hZENhbGxiYWNrIiwicmVsb2FkIiwiRXh0ZW5zaW9ucyIsImNiT25EYXRhQ2hhbmdlZCIsImVycm9yTWVzc2FnZSIsIm1lc3NhZ2VzIiwiZGVsZXRlRXJyb3IiLCJleF9JbXBvc3NpYmxlVG9EZWxldGVSZWNvcmQiLCJyZW1vdmVDbGFzcyIsImNsb3Nlc3QiLCIkY29udGFpbmVyIiwicGFyZW50IiwiJHBsYWNlaG9sZGVyIiwiJGxvYWRlciIsImV4X0xvYWRpbmdEYXRhIiwiYmVmb3JlIiwiJHBhcmVudCIsInNhZmVEZXNjIiwiZGVzY3JpcHRpb25MaW5lcyIsInNwbGl0IiwiZmlsdGVyIiwibGluZSIsImZvcm1hdHRlZERlc2MiLCJ2aXNpYmxlTGluZXMiLCJzbGljZSIsInRydW5jYXRlZERlc2MiLCJmdWxsRGVzYyIsIm9mZiIsImRl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QUdMLGdCQUFnQixDQUFDTSxLQUFqQixDQUF1QixDQUF2QixFQUEwQjdLLFFBQTFCLENBQXJCO0FBQ0E0SyxZQUFBQSxZQUFZLENBQUM1SyxRQUFRLEdBQUcsQ0FBWixDQUFaLElBQThCLEtBQTlCO0FBRUEsZ0JBQU04SyxhQUFhLEdBQUdGLFlBQVksQ0FBQzFGLElBQWIsQ0FBa0IsTUFBbEIsQ0FBdEI7QUFDQSxnQkFBTTZGLFFBQVEsR0FBR1IsZ0JBQWdCLENBQUNyRixJQUFqQixDQUFzQixJQUF0QixDQUFqQjtBQUVBLCtIQUMyQjZGLFFBRDNCLDBRQUtNRCxhQUxOO0FBT0g7QUFDSixTQXBDdUIsQ0FzQ3hCOzs7QUFDQSxlQUFPL0ksSUFBUDtBQUNILE9BeENEO0FBeUNIO0FBRUQ7QUFDSjtBQUNBOzs7O1dBQ0ksbUJBQVU7QUFDTjtBQUNBLFdBQUs1QixNQUFMLENBQVk2SyxHQUFaLENBQWdCLE9BQWhCLEVBQXlCLGlDQUF6QjtBQUNBLFdBQUs3SyxNQUFMLENBQVk2SyxHQUFaLENBQWdCLE9BQWhCLEVBQXlCLFFBQXpCO0FBQ0EsV0FBSzdLLE1BQUwsQ0FBWTZLLEdBQVosQ0FBZ0IsVUFBaEIsRUFBNEIsOEJBQTVCLEVBSk0sQ0FNTjs7QUFDQSxVQUFJLEtBQUszSyxTQUFMLElBQWtCLE9BQU8sS0FBS0EsU0FBTCxDQUFlNEssT0FBdEIsS0FBa0MsVUFBeEQsRUFBb0U7QUFDaEUsYUFBSzVLLFNBQUwsQ0FBZTRLLE9BQWY7QUFDSCxPQVRLLENBV047OztBQUNBN0ssTUFBQUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0I4SyxNQUF4QjtBQUNIOzs7O0tBR0w7OztBQUNBaEMsTUFBTSxDQUFDM0ssaUJBQVAsR0FBMkJBLGlCQUEzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBTZW1hbnRpY0xvY2FsaXphdGlvbiwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXh0ZW5zaW9ucywgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIEJhc2UgY2xhc3MgZm9yIE1pa29QQlggaW5kZXggdGFibGUgbWFuYWdlbWVudCB3aXRoIEFDTCBzdXBwb3J0XG4gKiBcbiAqIFByb3ZpZGVzIGNvbW1vbiBmdW5jdGlvbmFsaXR5IGZvciBEYXRhVGFibGUtYmFzZWQgaW5kZXggcGFnZXMgaW5jbHVkaW5nOlxuICogLSBTZXJ2ZXItc2lkZSBBQ0wgcGVybWlzc2lvbiBjaGVja2luZ1xuICogLSBEeW5hbWljIGFjdGlvbiBidXR0b24gcmVuZGVyaW5nIGJhc2VkIG9uIHBlcm1pc3Npb25zXG4gKiAtIFVuaWZpZWQgZGVzY3JpcHRpb24gdHJ1bmNhdGlvbiB3aXRoIHBvcHVwIHN1cHBvcnRcbiAqIC0gQ29weSBmdW5jdGlvbmFsaXR5IHN1cHBvcnRcbiAqIC0gQ3VzdG9tIGFjdGlvbiBidXR0b25zXG4gKiAtIFR3by1zdGVwIGRlbGV0ZSBjb25maXJtYXRpb25cbiAqIC0gRG91YmxlLWNsaWNrIGVkaXRpbmdcbiAqIFxuICogQGNsYXNzIFBieERhdGFUYWJsZUluZGV4XG4gKi9cbmNsYXNzIFBieERhdGFUYWJsZUluZGV4IHtcbiAgICAvKipcbiAgICAgKiBDcmVhdGUgYSBuZXcgUGJ4RGF0YVRhYmxlSW5kZXggaW5zdGFuY2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29uZmlnLnRhYmxlSWQgLSBIVE1MIHRhYmxlIGVsZW1lbnQgSURcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnLmFwaU1vZHVsZSAtIEFQSSBtb2R1bGUgZm9yIGRhdGEgb3BlcmF0aW9uc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb25maWcucm91dGVQcmVmaXggLSBVUkwgcm91dGUgcHJlZml4IChlLmcuLCAnY2FsbC1xdWV1ZXMnKVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcudHJhbnNsYXRpb25zIC0gVHJhbnNsYXRpb24ga2V5cyBmb3IgbWVzc2FnZXNcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBjb25maWcuY29sdW1ucyAtIERhdGFUYWJsZSBjb2x1bW4gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtjb25maWcuc2hvd1N1Y2Nlc3NNZXNzYWdlcz1mYWxzZV0gLSBTaG93IHN1Y2Nlc3MgbWVzc2FnZXMgb24gZGVsZXRlXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNob3dJbmZvPWZhbHNlXSAtIFNob3cgRGF0YVRhYmxlIGluZm9cbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmFjdGlvbkJ1dHRvbnM9WydlZGl0JywgJ2RlbGV0ZSddXSAtIFN0YW5kYXJkIGFjdGlvbiBidXR0b25zIHRvIHNob3dcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBbY29uZmlnLmN1c3RvbUFjdGlvbkJ1dHRvbnM9W11dIC0gQ3VzdG9tIGFjdGlvbiBidXR0b24gZGVmaW5pdGlvbnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gW2NvbmZpZy5kZXNjcmlwdGlvblNldHRpbmdzXSAtIERlc2NyaXB0aW9uIHRydW5jYXRpb24gc2V0dGluZ3NcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLm9uRGF0YUxvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBkYXRhIGxvYWRlZFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25EcmF3Q2FsbGJhY2tdIC0gQ2FsbGJhY2sgYWZ0ZXIgdGFibGUgZHJhd1xuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjb25maWcub25QZXJtaXNzaW9uc0xvYWRlZF0gLSBDYWxsYmFjayBhZnRlciBwZXJtaXNzaW9ucyBsb2FkZWRcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmN1c3RvbURlbGV0ZUhhbmRsZXJdIC0gQ3VzdG9tIGRlbGV0ZSBoYW5kbGVyXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbn0gW2NvbmZpZy5vbkFmdGVyRGVsZXRlXSAtIENhbGxiYWNrIGFmdGVyIHN1Y2Nlc3NmdWwgZGVsZXRpb25cbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmdldE1vZGlmeVVybF0gLSBDdXN0b20gVVJMIGdlbmVyYXRvciBmb3IgbW9kaWZ5L2VkaXQgYWN0aW9uc1xuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2NvbmZpZy5vcmRlcmFibGU9dHJ1ZV0gLSBFbmFibGUvZGlzYWJsZSBzb3J0aW5nIGZvciBhbGwgY29sdW1uc1xuICAgICAqIEBwYXJhbSB7QXJyYXl9IFtjb25maWcub3JkZXI9W1swLCAnYXNjJ11dXSAtIERlZmF1bHQgc29ydCBvcmRlclxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBbY29uZmlnLmFqYXhEYXRhXSAtIEFkZGl0aW9uYWwgZGF0YSBwYXJhbWV0ZXJzIGZvciBBSkFYIHJlcXVlc3RzXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbY29uZmlnLnNlcnZlclNpZGU9ZmFsc2VdIC0gRW5hYmxlIHNlcnZlci1zaWRlIHByb2Nlc3NpbmdcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY29uZmlnLmN1c3RvbURlbGV0ZVBlcm1pc3Npb25DaGVja10gLSBGdW5jdGlvbiB0byBjaGVjayBpZiBkZWxldGUgaXMgYWxsb3dlZCBmb3IgYSByb3dcbiAgICAgKi9cbiAgICBjb25zdHJ1Y3Rvcihjb25maWcpIHtcbiAgICAgICAgLy8gQ29yZSBjb25maWd1cmF0aW9uXG4gICAgICAgIHRoaXMudGFibGVJZCA9IGNvbmZpZy50YWJsZUlkO1xuICAgICAgICB0aGlzLmFwaU1vZHVsZSA9IGNvbmZpZy5hcGlNb2R1bGU7XG4gICAgICAgIHRoaXMucm91dGVQcmVmaXggPSBjb25maWcucm91dGVQcmVmaXg7XG4gICAgICAgIHRoaXMudHJhbnNsYXRpb25zID0gY29uZmlnLnRyYW5zbGF0aW9ucyB8fCB7fTtcbiAgICAgICAgdGhpcy5jb2x1bW5zID0gY29uZmlnLmNvbHVtbnMgfHwgW107XG4gICAgICAgIHRoaXMuc2hvd1N1Y2Nlc3NNZXNzYWdlcyA9IGNvbmZpZy5zaG93U3VjY2Vzc01lc3NhZ2VzIHx8IGZhbHNlO1xuICAgICAgICB0aGlzLnNob3dJbmZvID0gY29uZmlnLnNob3dJbmZvIHx8IGZhbHNlO1xuICAgICAgICB0aGlzLmRhdGFUYWJsZU9wdGlvbnMgPSBjb25maWcuZGF0YVRhYmxlT3B0aW9ucyB8fCB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNvcnRpbmcgY29uZmlndXJhdGlvbiAoYmFja3dhcmQgY29tcGF0aWJsZSlcbiAgICAgICAgdGhpcy5vcmRlcmFibGUgPSBjb25maWcub3JkZXJhYmxlICE9PSB1bmRlZmluZWQgPyBjb25maWcub3JkZXJhYmxlIDogdHJ1ZTtcbiAgICAgICAgdGhpcy5lbmFibGVTZWFyY2hJbmRleCA9IGNvbmZpZy5lbmFibGVTZWFyY2hJbmRleCAhPT0gZmFsc2U7IC8vIERlZmF1bHQgdHJ1ZVxuICAgICAgICAvLyBBZGp1c3QgZGVmYXVsdCBzb3J0IG9yZGVyIGlmIHNlYXJjaF9pbmRleCBpcyBhZGRlZCAoaXQgd2lsbCBiZSBjb2x1bW4gMClcbiAgICAgICAgdGhpcy5vcmRlciA9IGNvbmZpZy5vcmRlciB8fCAodGhpcy5lbmFibGVTZWFyY2hJbmRleCA/IFtbMSwgJ2FzYyddXSA6IFtbMCwgJ2FzYyddXSk7XG4gICAgICAgIFxuICAgICAgICAvLyBQZXJtaXNzaW9uIHN0YXRlIChsb2FkZWQgZnJvbSBzZXJ2ZXIpXG4gICAgICAgIHRoaXMucGVybWlzc2lvbnMgPSB7XG4gICAgICAgICAgICBzYXZlOiBmYWxzZSxcbiAgICAgICAgICAgIG1vZGlmeTogZmFsc2UsXG4gICAgICAgICAgICBlZGl0OiBmYWxzZSxcbiAgICAgICAgICAgIGRlbGV0ZTogZmFsc2UsXG4gICAgICAgICAgICBjb3B5OiBmYWxzZSxcbiAgICAgICAgICAgIGN1c3RvbToge31cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFjdGlvbiBidXR0b25zIGNvbmZpZ3VyYXRpb25cbiAgICAgICAgdGhpcy5hY3Rpb25CdXR0b25zID0gY29uZmlnLmFjdGlvbkJ1dHRvbnMgfHwgWydlZGl0JywgJ2RlbGV0ZSddO1xuICAgICAgICB0aGlzLmN1c3RvbUFjdGlvbkJ1dHRvbnMgPSBjb25maWcuY3VzdG9tQWN0aW9uQnV0dG9ucyB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlc2NyaXB0aW9uIHRydW5jYXRpb24gc2V0dGluZ3NcbiAgICAgICAgdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7XG4gICAgICAgICAgICBtYXhMaW5lczogMyxcbiAgICAgICAgICAgIGR5bmFtaWNIZWlnaHQ6IGZhbHNlLFxuICAgICAgICAgICAgY2FsY3VsYXRlTGluZXM6IG51bGxcbiAgICAgICAgfSwgY29uZmlnLmRlc2NyaXB0aW9uU2V0dGluZ3MgfHwge30pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW50ZXJuYWwgcHJvcGVydGllc1xuICAgICAgICB0aGlzLiR0YWJsZSA9ICQoYCMke3RoaXMudGFibGVJZH1gKTtcbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIE9wdGlvbmFsIGNhbGxiYWNrc1xuICAgICAgICB0aGlzLm9uRGF0YUxvYWRlZCA9IGNvbmZpZy5vbkRhdGFMb2FkZWQ7XG4gICAgICAgIHRoaXMub25EcmF3Q2FsbGJhY2sgPSBjb25maWcub25EcmF3Q2FsbGJhY2s7XG4gICAgICAgIHRoaXMub25QZXJtaXNzaW9uc0xvYWRlZCA9IGNvbmZpZy5vblBlcm1pc3Npb25zTG9hZGVkO1xuICAgICAgICB0aGlzLmN1c3RvbURlbGV0ZUhhbmRsZXIgPSBjb25maWcuY3VzdG9tRGVsZXRlSGFuZGxlcjtcbiAgICAgICAgdGhpcy5vbkFmdGVyRGVsZXRlID0gY29uZmlnLm9uQWZ0ZXJEZWxldGU7XG4gICAgICAgIHRoaXMuZ2V0TW9kaWZ5VXJsID0gY29uZmlnLmdldE1vZGlmeVVybDtcbiAgICAgICAgdGhpcy5jdXN0b21EZWxldGVQZXJtaXNzaW9uQ2hlY2sgPSBjb25maWcuY3VzdG9tRGVsZXRlUGVybWlzc2lvbkNoZWNrO1xuICAgICAgICB0aGlzLmFqYXhEYXRhID0gY29uZmlnLmFqYXhEYXRhIHx8IHt9O1xuICAgICAgICB0aGlzLnNlcnZlclNpZGUgPSBjb25maWcuc2VydmVyU2lkZSB8fCBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlIHdpdGggcGVybWlzc2lvbiBsb2FkaW5nXG4gICAgICovXG4gICAgYXN5bmMgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFNob3cgbG9hZGVyIHdoaWxlIGluaXRpYWxpemluZ1xuICAgICAgICAgICAgdGhpcy5zaG93TG9hZGVyKCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpcnN0LCBsb2FkIHBlcm1pc3Npb25zIGZyb20gc2VydmVyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmxvYWRQZXJtaXNzaW9ucygpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIERhdGFUYWJsZSAod2lsbCBoYW5kbGUgbG9hZGVyL2VtcHR5IHN0YXRlIGluIGRhdGEgY2FsbGJhY2spXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxpemVEYXRhVGFibGUoKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBpbml0aWFsaXplIFBieERhdGFUYWJsZUluZGV4OicsIGVycm9yKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXhfRXJyb3JJbml0aWFsaXppbmdUYWJsZSB8fCAnRmFpbGVkIHRvIGluaXRpYWxpemUgdGFibGUnKTtcbiAgICAgICAgICAgIHRoaXMuaGlkZUxvYWRlcigpO1xuICAgICAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKHRydWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgcGVybWlzc2lvbnMgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBhc3luYyBsb2FkUGVybWlzc2lvbnMoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0ICQuYWpheCh7XG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWFjbC9jaGVja1Blcm1pc3Npb25zYCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY29udHJvbGxlcjogdGhpcy5yb3V0ZVByZWZpeFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduKHRoaXMucGVybWlzc2lvbnMsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm9uUGVybWlzc2lvbnNMb2FkZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vblBlcm1pc3Npb25zTG9hZGVkKHRoaXMucGVybWlzc2lvbnMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGxvYWQgcGVybWlzc2lvbnMsIHVzaW5nIGRlZmF1bHRzOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIE9uIGVycm9yLCBkZWZhdWx0IHRvIG5vIHBlcm1pc3Npb25zIGZvciBzYWZldHlcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIERhdGFUYWJsZSB3aXRoIGNvbW1vbiBjb25maWd1cmF0aW9uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURhdGFUYWJsZSgpIHtcbiAgICAgICAgLy8gQWRkIHRoZSBkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQgY2xhc3MgdG8gdGhlIHRhYmxlXG4gICAgICAgIHRoaXMuJHRhYmxlLmFkZENsYXNzKCdkYXRhdGFibGUtd2lkdGgtY29uc3RyYWluZWQnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBtaXNzaW5nIGhlYWRlciBjZWxscyBpZiBuZWVkZWQgZm9yIHNlYXJjaF9pbmRleCBjb2x1bW5cbiAgICAgICAgdGhpcy5lbnN1cmVIZWFkZXJDZWxscygpO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgcHJvY2Vzc2VkQ29sdW1ucyA9IHRoaXMucHJvY2Vzc0NvbHVtbnMoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIHYzIEFQSSBmb3JtYXQgd2l0aCBnZXRMaXN0IG1ldGhvZFxuICAgICAgICBsZXQgYWpheENvbmZpZztcbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2YgdGhpcy5hcGlNb2R1bGUuZ2V0TGlzdCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgLy8gdjMgZm9ybWF0IHdpdGggZ2V0TGlzdCBtZXRob2QgLSB1c2UgY3VzdG9tIGFqYXggZnVuY3Rpb25cbiAgICAgICAgICAgIGFqYXhDb25maWcgPSAoZGF0YSwgY2FsbGJhY2ssIHNldHRpbmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGlNb2R1bGUuZ2V0TGlzdCh0aGlzLmFqYXhEYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvY2Vzc2VkRGF0YSA9IHRoaXMuaGFuZGxlRGF0YUxvYWQocmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayh7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBwcm9jZXNzZWREYXRhXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0FQSSBtb2R1bGUgZG9lcyBub3QgaGF2ZSBnZXRMaXN0IG1ldGhvZCcpO1xuICAgICAgICAgICAgYWpheENvbmZpZyA9IHtkYXRhOiBbXX07XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGNvbmZpZyA9IHtcbiAgICAgICAgICAgIGFqYXg6IGFqYXhDb25maWcsXG4gICAgICAgICAgICBjb2x1bW5zOiBwcm9jZXNzZWRDb2x1bW5zLFxuICAgICAgICAgICAgb3JkZXI6IHRoaXMub3JkZXIsXG4gICAgICAgICAgICBvcmRlcmluZzogdGhpcy5vcmRlcmFibGUsXG4gICAgICAgICAgICBsZW5ndGhDaGFuZ2U6IGZhbHNlLFxuICAgICAgICAgICAgcGFnaW5nOiBmYWxzZSxcbiAgICAgICAgICAgIHNlYXJjaGluZzogdHJ1ZSxcbiAgICAgICAgICAgIGluZm86IHRoaXMuc2hvd0luZm8sXG4gICAgICAgICAgICBhdXRvV2lkdGg6IGZhbHNlLFxuICAgICAgICAgICAgbGFuZ3VhZ2U6IFNlbWFudGljTG9jYWxpemF0aW9uLmRhdGFUYWJsZUxvY2FsaXNhdGlvbixcbiAgICAgICAgICAgIGRyYXdDYWxsYmFjazogKCkgPT4gdGhpcy5oYW5kbGVEcmF3Q2FsbGJhY2soKSxcbiAgICAgICAgICAgIC8vIEFwcGx5IGN1c3RvbSBEYXRhVGFibGUgb3B0aW9ucywgb3ZlcnJpZGluZyBkZWZhdWx0cyBpZiBwcm92aWRlZFxuICAgICAgICAgICAgLi4udGhpcy5kYXRhVGFibGVPcHRpb25zXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kYXRhVGFibGUgPSB0aGlzLiR0YWJsZS5EYXRhVGFibGUoY29uZmlnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgaGFuZGxlcnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRGVsZXRlSGFuZGxlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDb3B5SGFuZGxlcigpO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVDdXN0b21IYW5kbGVycygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBQcm9jZXNzIGNvbHVtbiBkZWZpbml0aW9ucyBhbmQgYWRkIGFjdGlvbiBjb2x1bW4gaWYgbmVlZGVkXG4gICAgICovXG4gICAgcHJvY2Vzc0NvbHVtbnMoKSB7XG4gICAgICAgIGNvbnN0IGNvbHVtbnMgPSBbLi4udGhpcy5jb2x1bW5zXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoaWRkZW4gc2VhcmNoX2luZGV4IGNvbHVtbiBhdCB0aGUgYmVnaW5uaW5nIGlmIGVuYWJsZWQgYW5kIG5vdCBwcmVzZW50XG4gICAgICAgIC8vIFRoaXMgY29sdW1uIGNvbnRhaW5zIGFsbCBzZWFyY2hhYmxlIHRleHQgd2l0aG91dCBIVE1MIGZvcm1hdHRpbmdcbiAgICAgICAgaWYgKHRoaXMuZW5hYmxlU2VhcmNoSW5kZXggJiYgIWNvbHVtbnMuZmluZChjb2wgPT4gY29sLmRhdGEgPT09ICdzZWFyY2hfaW5kZXgnKSkge1xuICAgICAgICAgICAgY29sdW1ucy51bnNoaWZ0KHtcbiAgICAgICAgICAgICAgICBkYXRhOiAnc2VhcmNoX2luZGV4JyxcbiAgICAgICAgICAgICAgICB2aXNpYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBzZWFyY2hhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIG9yZGVyYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGVmYXVsdENvbnRlbnQ6ICcnLFxuICAgICAgICAgICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSwgdHlwZSwgcm93KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHNlYXJjaF9pbmRleCBpcyBub3QgcHJvdmlkZWQgYnkgYmFja2VuZCwgZ2VuZXJhdGUgaXQgZnJvbSByb3cgZGF0YVxuICAgICAgICAgICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBnZW5lcmF0ZSBzZWFyY2ggaW5kZXggZnJvbSB2aXNpYmxlIGZpZWxkc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWFyY2hhYmxlRmllbGRzID0gW107XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHJvdykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2tpcCBpbnRlcm5hbCBmaWVsZHMgYW5kIHJlcHJlc2VudCBmaWVsZHMgKHRoZXkncmUgb2Z0ZW4gZHVwbGljYXRlcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgIT09ICdzZWFyY2hfaW5kZXgnICYmIGtleSAhPT0gJ2lkJyAmJiBrZXkgIT09ICd1bmlxaWQnICYmIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSAhPT0gJ0RUX1Jvd0lkJyAmJiAha2V5LmVuZHNXaXRoKCdfcmVwcmVzZW50JykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IHJvd1trZXldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0cmlwIEhUTUwgdGFncyBhbmQgYWRkIHRvIHNlYXJjaGFibGUgZmllbGRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuVmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC88W14+XSo+L2csICcnKS50cmltKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGVhblZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2hhYmxlRmllbGRzLnB1c2goY2xlYW5WYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VhcmNoYWJsZUZpZWxkcy5wdXNoKHZhbHVlLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFsc28gcHJvY2VzcyBfcmVwcmVzZW50IGZpZWxkcyBhcyB0aGV5IGNvbnRhaW4gdXNlci1mcmllbmRseSB0ZXh0XG4gICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHJvdykuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleS5lbmRzV2l0aCgnX3JlcHJlc2VudCcpICYmIHJvd1trZXldKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xlYW5WYWx1ZSA9IFN0cmluZyhyb3dba2V5XSkucmVwbGFjZSgvPFtePl0qPi9nLCAnJykudHJpbSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGVhblZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaGFibGVGaWVsZHMucHVzaChjbGVhblZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VhcmNoYWJsZUZpZWxkcy5qb2luKCcgJykudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gSWYgc29ydGluZyBpcyBnbG9iYWxseSBkaXNhYmxlZCwgZW5zdXJlIGFsbCBjb2x1bW5zIHJlc3BlY3QgaXRcbiAgICAgICAgaWYgKCF0aGlzLm9yZGVyYWJsZSkge1xuICAgICAgICAgICAgY29sdW1ucy5mb3JFYWNoKGNvbCA9PiB7XG4gICAgICAgICAgICAgICAgLy8gUHJlc2VydmUgZXhwbGljaXQgb3JkZXJhYmxlOiBmYWxzZSwgYnV0IG92ZXJyaWRlIHRydWUgb3IgdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgaWYgKGNvbC5vcmRlcmFibGUgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbC5vcmRlcmFibGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHN0YW5kYXJkIGFjdGlvbiBjb2x1bW4gaWYgbm90IGFscmVhZHkgcHJlc2VudFxuICAgICAgICBpZiAoIWNvbHVtbnMuZmluZChjb2wgPT4gY29sLmlzQWN0aW9uQ29sdW1uKSkge1xuICAgICAgICAgICAgY29sdW1ucy5wdXNoKHRoaXMuY3JlYXRlQWN0aW9uQ29sdW1uKCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gY29sdW1ucztcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIHN0YW5kYXJkIGFjdGlvbiBjb2x1bW4gd2l0aCBwZXJtaXNzaW9uLWJhc2VkIHJlbmRlcmluZ1xuICAgICAqL1xuICAgIGNyZWF0ZUFjdGlvbkNvbHVtbigpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGRhdGE6IG51bGwsXG4gICAgICAgICAgICBvcmRlcmFibGU6IGZhbHNlLFxuICAgICAgICAgICAgc2VhcmNoYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBjbGFzc05hbWU6ICdyaWdodCBhbGlnbmVkIGNvbGxhcHNpbmcnLFxuICAgICAgICAgICAgaXNBY3Rpb25Db2x1bW46IHRydWUsXG4gICAgICAgICAgICByZW5kZXI6IChkYXRhLCB0eXBlLCByb3cpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBidXR0b25zID0gW107XG4gICAgICAgICAgICAgICAgLy8gR2V0IHRoZSByZWNvcmQgSUQgLSBjaGVjayBmb3IgYm90aCB1bmlxaWQgYW5kIGlkIGZpZWxkc1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gcm93LnVuaXFpZCB8fCByb3cuaWQgfHwgJyc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gRWRpdCBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdlZGl0JykgJiYgXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLnBlcm1pc3Npb25zLm1vZGlmeSB8fCB0aGlzLnBlcm1pc3Npb25zLmVkaXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgY3VzdG9tIGdldE1vZGlmeVVybCBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsID8gXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmdldE1vZGlmeVVybChyZWNvcmRJZCkgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgIGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvJHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGBcbiAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke21vZGlmeVVybH1cIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGVkaXQgcG9wdXBlZFwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS1jb250ZW50PVwiJHtnbG9iYWxUcmFuc2xhdGUuYnRfVG9vbFRpcEVkaXR9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGVkaXQgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENvcHkgYnV0dG9uXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYWN0aW9uQnV0dG9ucy5pbmNsdWRlcygnY29weScpICYmIHRoaXMucGVybWlzc2lvbnMuY29weSkge1xuICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtdmFsdWU9XCIke3JlY29yZElkfVwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBjb3B5IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtY29udGVudD1cIiR7Z2xvYmFsVHJhbnNsYXRlLmJ0X1Rvb2xUaXBDb3B5fVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBjb3B5IG91dGxpbmUgYmx1ZVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEN1c3RvbSBidXR0b25zXG4gICAgICAgICAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zLmZvckVhY2goY3VzdG9tQnV0dG9uID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucGVybWlzc2lvbnMuY3VzdG9tICYmIHRoaXMucGVybWlzc2lvbnMuY3VzdG9tW2N1c3RvbUJ1dHRvbi5uYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaHJlZiA9IGN1c3RvbUJ1dHRvbi5ocmVmIHx8ICcjJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFWYWx1ZSA9IGN1c3RvbUJ1dHRvbi5pbmNsdWRlSWQgPyBgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCJgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBidXR0b25zLnB1c2goYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxhIGhyZWY9XCIke2hyZWZ9XCIgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHtkYXRhVmFsdWV9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJ1aSBidXR0b24gJHtjdXN0b21CdXR0b24uY2xhc3N9IHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke1NlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChjdXN0b21CdXR0b24udG9vbHRpcCl9XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiJHtjdXN0b21CdXR0b24uaWNvbn1cIj48L2k+XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgICAgICAgICAgICAgYCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBEZWxldGUgYnV0dG9uIChhbHdheXMgbGFzdClcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hY3Rpb25CdXR0b25zLmluY2x1ZGVzKCdkZWxldGUnKSAmJiB0aGlzLnBlcm1pc3Npb25zLmRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBjdXN0b20gZGVsZXRlIHBlcm1pc3Npb24gY2hlY2sgaXMgbmVlZGVkXG4gICAgICAgICAgICAgICAgICAgIGxldCBjYW5EZWxldGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXN0b21EZWxldGVQZXJtaXNzaW9uQ2hlY2sgJiYgdHlwZW9mIHRoaXMuY3VzdG9tRGVsZXRlUGVybWlzc2lvbkNoZWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5EZWxldGUgPSB0aGlzLmN1c3RvbURlbGV0ZVBlcm1pc3Npb25DaGVjayhyb3cpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNhbkRlbGV0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9ucy5wdXNoKGBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YSBocmVmPVwiI1wiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS12YWx1ZT1cIiR7cmVjb3JkSWR9XCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInVpIGJ1dHRvbiBkZWxldGUgdHdvLXN0ZXBzLWRlbGV0ZSBwb3B1cGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2dsb2JhbFRyYW5zbGF0ZS5idF9Ub29sVGlwRGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggcmVkXCI+PC9pPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICAgICAgICAgIGApO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBkaXNhYmxlZCBkZWxldGUgYnV0dG9uIHdpdGggZXhwbGFuYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1dHRvbnMucHVzaChgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidWkgYnV0dG9uIGRlbGV0ZSBkaXNhYmxlZCBwb3B1cGVkXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke3RoaXMudHJhbnNsYXRpb25zLmRlbGV0ZURpc2FibGVkVG9vbHRpcCB8fCBnbG9iYWxUcmFuc2xhdGUuYnRfQ2Fubm90RGVsZXRlfVwiPlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gdHJhc2ggZ3JleVwiPjwvaT5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2E+XG4gICAgICAgICAgICAgICAgICAgICAgICBgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXR1cm4gYnV0dG9ucy5sZW5ndGggPiAwID8gXG4gICAgICAgICAgICAgICAgICAgIGA8ZGl2IGNsYXNzPVwidWkgdGlueSBiYXNpYyBpY29uIGJ1dHRvbnMgYWN0aW9uLWJ1dHRvbnNcIj4ke2J1dHRvbnMuam9pbignJyl9PC9kaXY+YCA6IFxuICAgICAgICAgICAgICAgICAgICAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRhdGEgbG9hZCBhbmQgZW1wdHkgc3RhdGUgbWFuYWdlbWVudFxuICAgICAqIHYzIEFQSSBmb3JtYXQ6IHtyZXN1bHQ6IGJvb2xlYW4sIGRhdGE6IGFycmF5fSBvciB7ZGF0YToge2l0ZW1zOiBhcnJheX19XG4gICAgICovXG4gICAgaGFuZGxlRGF0YUxvYWQocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGlkZSBsb2FkZXIgZmlyc3RcbiAgICAgICAgdGhpcy5oaWRlTG9hZGVyKCk7XG4gICAgICAgIFxuICAgICAgICBsZXQgZGF0YSA9IFtdO1xuICAgICAgICBsZXQgaXNTdWNjZXNzID0gZmFsc2U7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBmb3IgZXJyb3IgcmVzcG9uc2VcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCByZXNwb25zZS5yZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBpc1N1Y2Nlc3MgPSBmYWxzZTtcbiAgICAgICAgICAgIGRhdGEgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICAvLyBTdGFuZGFyZCB2MyBmb3JtYXQgd2l0aCBkYXRhIGFycmF5XG4gICAgICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkpIHtcbiAgICAgICAgICAgIGlzU3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfVxuICAgICAgICAvLyB2MyBmb3JtYXQgd2l0aCBpdGVtcyBwcm9wZXJ0eVxuICAgICAgICBlbHNlIGlmIChyZXNwb25zZS5kYXRhICYmIEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YS5pdGVtcykpIHtcbiAgICAgICAgICAgIGlzU3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICBkYXRhID0gcmVzcG9uc2UuZGF0YS5pdGVtcztcbiAgICAgICAgfVxuICAgICAgICAvLyBGYWxsYmFjayBmb3IgcmVzcG9uc2VzIHdpdGggcmVzdWx0OnRydWUgYnV0IG5vIGRhdGFcbiAgICAgICAgZWxzZSBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpc1N1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgZGF0YSA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCBpc0VtcHR5ID0gIWlzU3VjY2VzcyB8fCBkYXRhLmxlbmd0aCA9PT0gMDtcbiAgICAgICAgdGhpcy50b2dnbGVFbXB0eVBsYWNlaG9sZGVyKGlzRW1wdHkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzRW1wdHkgJiYgIWlzU3VjY2Vzcykge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGdsb2JhbFRyYW5zbGF0ZS5leF9FcnJvckxvYWRpbmdEYXRhIHx8ICdGYWlsZWQgdG8gbG9hZCBkYXRhJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm9uRGF0YUxvYWRlZCkge1xuICAgICAgICAgICAgLy8gUGFzcyBub3JtYWxpemVkIHJlc3BvbnNlIHRvIGNhbGxiYWNrXG4gICAgICAgICAgICBjb25zdCBub3JtYWxpemVkUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0OiBpc1N1Y2Nlc3MsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMub25EYXRhTG9hZGVkKG5vcm1hbGl6ZWRSZXNwb25zZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZHJhdyBjYWxsYmFjayBmb3IgcG9zdC1yZW5kZXIgb3BlcmF0aW9uc1xuICAgICAqL1xuICAgIGhhbmRsZURyYXdDYWxsYmFjaygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBwb3B1cHNcbiAgICAgICAgdGhpcy4kdGFibGUuZmluZCgnLnBvcHVwZWQnKS5wb3B1cCgpO1xuXG4gICAgICAgIC8vIE1vdmUgQWRkIE5ldyBidXR0b24gdG8gRGF0YVRhYmxlcyB3cmFwcGVyXG4gICAgICAgIHRoaXMucmVwb3NpdGlvbkFkZEJ1dHRvbigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZG91YmxlLWNsaWNrIGVkaXRpbmdcbiAgICAgICAgdGhpcy5pbml0aWFsaXplRG91YmxlQ2xpY2tFZGl0KCk7XG5cbiAgICAgICAgLy8gSGlkZSBwYWdpbmF0aW9uIGNvbnRyb2xzIHdoZW4gYWxsIHJlY29yZHMgZml0IG9uIG9uZSBwYWdlXG4gICAgICAgIHRoaXMudG9nZ2xlUGFnaW5hdGlvblZpc2liaWxpdHkoKTtcblxuICAgICAgICAvLyBDdXN0b20gZHJhdyBjYWxsYmFja1xuICAgICAgICBpZiAodGhpcy5vbkRyYXdDYWxsYmFjaykge1xuICAgICAgICAgICAgdGhpcy5vbkRyYXdDYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIHBhZ2luYXRpb24gdmlzaWJpbGl0eSBiYXNlZCBvbiBwYWdlIGNvdW50XG4gICAgICogSGlkZXMgcGFnaW5hdGlvbiB3aGVuIGFsbCByZWNvcmRzIGZpdCBvbiBhIHNpbmdsZSBwYWdlXG4gICAgICovXG4gICAgdG9nZ2xlUGFnaW5hdGlvblZpc2liaWxpdHkoKSB7XG4gICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBEYXRhVGFibGUgaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIERhdGFUYWJsZSBpbnN0YW5jZVxuICAgICAgICAgICAgY29uc3QgdGFibGUgPSB0aGlzLiR0YWJsZS5EYXRhVGFibGUoKTtcbiAgICAgICAgICAgIGlmICh0YWJsZSAmJiB0YWJsZS5wYWdlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbyA9IHRhYmxlLnBhZ2UuaW5mbygpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRhYmxlSWQgPSB0aGlzLiR0YWJsZS5hdHRyKCdpZCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0ICRwYWdpbmF0ZUNvbnRhaW5lciA9ICQoYCMke3RhYmxlSWR9X3BhZ2luYXRlYCk7XG5cbiAgICAgICAgICAgICAgICBpZiAoJHBhZ2luYXRlQ29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5mby5wYWdlcyA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIHBhZ2luYXRpb24gd2hlbiB0aGVyZSdzIG9ubHkgb25lIHBhZ2VcbiAgICAgICAgICAgICAgICAgICAgICAgICRwYWdpbmF0ZUNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHBhZ2luYXRpb24gd2hlbiB0aGVyZSBhcmUgbXVsdGlwbGUgcGFnZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICRwYWdpbmF0ZUNvbnRhaW5lci5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDApO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBFbnN1cmUgdGFibGUgaGFzIGVub3VnaCBoZWFkZXIgY2VsbHMgZm9yIGFsbCBjb2x1bW5zXG4gICAgICogVGhpcyBpcyBuZWVkZWQgd2hlbiB3ZSBhZGQgdGhlIGhpZGRlbiBzZWFyY2hfaW5kZXggY29sdW1uIHByb2dyYW1tYXRpY2FsbHlcbiAgICAgKi9cbiAgICBlbnN1cmVIZWFkZXJDZWxscygpIHtcbiAgICAgICAgaWYgKCF0aGlzLmVuYWJsZVNlYXJjaEluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGNvbnN0ICR0aGVhZCA9IHRoaXMuJHRhYmxlLmZpbmQoJ3RoZWFkJyk7XG4gICAgICAgIGlmICghJHRoZWFkLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZWFkIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgIHRoaXMuJHRhYmxlLnByZXBlbmQoJzx0aGVhZD48dHI+PC90cj48L3RoZWFkPicpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zdCAkaGVhZGVyUm93ID0gdGhpcy4kdGFibGUuZmluZCgndGhlYWQgdHInKS5maXJzdCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGEgaGlkZGVuIGhlYWRlciBjZWxsIGF0IHRoZSBiZWdpbm5pbmcgZm9yIHNlYXJjaF9pbmRleFxuICAgICAgICAvLyBEYXRhVGFibGVzIHJlcXVpcmVzIG1hdGNoaW5nIG51bWJlciBvZiB0aCBlbGVtZW50cyBhbmQgY29sdW1uc1xuICAgICAgICAkaGVhZGVyUm93LnByZXBlbmQoJzx0aCBzdHlsZT1cImRpc3BsYXk6bm9uZTtcIj5TZWFyY2ggSW5kZXg8L3RoPicpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBSZXBvc2l0aW9uIEFkZCBOZXcgYnV0dG9uIHRvIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAqL1xuICAgIHJlcG9zaXRpb25BZGRCdXR0b24oKSB7XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHdyYXBwZXIgPSAkKGAjJHt0aGlzLnRhYmxlSWR9X3dyYXBwZXJgKTtcbiAgICAgICAgY29uc3QgJGxlZnRDb2x1bW4gPSAkd3JhcHBlci5maW5kKCcuZWlnaHQud2lkZS5jb2x1bW4nKS5maXJzdCgpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCRhZGRCdXR0b24ubGVuZ3RoICYmICRsZWZ0Q29sdW1uLmxlbmd0aCAmJiB0aGlzLnBlcm1pc3Npb25zLnNhdmUpIHtcbiAgICAgICAgICAgICRsZWZ0Q29sdW1uLmFwcGVuZCgkYWRkQnV0dG9uKTtcbiAgICAgICAgICAgICRhZGRCdXR0b24uc2hvdygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZGVsZXRlIGhhbmRsZXIgd2l0aCB0d28tc3RlcCBjb25maXJtYXRpb25cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGVsZXRlSGFuZGxlcigpIHtcbiAgICAgICAgLy8gRGVsZXRlU29tZXRoaW5nLmpzIGhhbmRsZXMgZmlyc3QgY2xpY2tcbiAgICAgICAgLy8gV2UgaGFuZGxlIHNlY29uZCBjbGljayB3aGVuIHR3by1zdGVwcy1kZWxldGUgY2xhc3MgaXMgcmVtb3ZlZFxuICAgICAgICB0aGlzLiR0YWJsZS5vbignY2xpY2snLCAnYS5kZWxldGU6bm90KC50d28tc3RlcHMtZGVsZXRlKScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkYnV0dG9uLmF0dHIoJ2RhdGEtdmFsdWUnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWRkIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgICRidXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlcikge1xuICAgICAgICAgICAgICAgIHRoaXMuY3VzdG9tRGVsZXRlSGFuZGxlcihyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB0aGlzLmNiQWZ0ZXJEZWxldGVSZWNvcmQocmVzcG9uc2UpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcGlNb2R1bGUuZGVsZXRlUmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHRoaXMuY2JBZnRlckRlbGV0ZVJlY29yZChyZXNwb25zZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjb3B5IGhhbmRsZXJcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQ29weUhhbmRsZXIoKSB7XG4gICAgICAgIHRoaXMuJHRhYmxlLm9uKCdjbGljaycsICdhLmNvcHknLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVc2Ugc2FtZSBsb2dpYyBhcyBtb2RpZnkgVVJMIGJ1dCBhZGQgY29weSBwYXJhbWV0ZXJcbiAgICAgICAgICAgIGxldCBjb3B5VXJsO1xuICAgICAgICAgICAgaWYgKHRoaXMuZ2V0TW9kaWZ5VXJsKSB7XG4gICAgICAgICAgICAgICAgLy8gVXNlIGN1c3RvbSBnZXRNb2RpZnlVcmwgYW5kIGFkZCBjb3B5IHBhcmFtZXRlclxuICAgICAgICAgICAgICAgIGNvbnN0IG1vZGlmeVVybCA9IHRoaXMuZ2V0TW9kaWZ5VXJsKHJlY29yZElkKTtcbiAgICAgICAgICAgICAgICBpZiAobW9kaWZ5VXJsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSByZWNvcmRJZCBmcm9tIFVSTCBhbmQgYWRkIGNvcHkgcGFyYW1ldGVyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VVcmwgPSBtb2RpZnlVcmwucmVwbGFjZShgLyR7cmVjb3JkSWR9YCwgJycpO1xuICAgICAgICAgICAgICAgICAgICBjb3B5VXJsID0gYCR7YmFzZVVybH0vP2NvcHk9JHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRGVmYXVsdCBVUkwgcGF0dGVyblxuICAgICAgICAgICAgICAgIGNvcHlVcmwgPSBgJHtnbG9iYWxSb290VXJsfSR7dGhpcy5yb3V0ZVByZWZpeH0vbW9kaWZ5Lz9jb3B5PSR7cmVjb3JkSWR9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gY29weSBVUkxcbiAgICAgICAgICAgIGlmIChjb3B5VXJsKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gY29weVVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY3VzdG9tIGJ1dHRvbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVDdXN0b21IYW5kbGVycygpIHtcbiAgICAgICAgdGhpcy5jdXN0b21BY3Rpb25CdXR0b25zLmZvckVhY2goY3VzdG9tQnV0dG9uID0+IHtcbiAgICAgICAgICAgIGlmIChjdXN0b21CdXR0b24ub25DbGljaykge1xuICAgICAgICAgICAgICAgIHRoaXMuJHRhYmxlLm9uKCdjbGljaycsIGBhLiR7Y3VzdG9tQnV0dG9uLmNsYXNzfWAsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkSWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21CdXR0b24ub25DbGljayhyZWNvcmRJZCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciByZWNvcmQgZGVsZXRpb25cbiAgICAgKi9cbiAgICBjYkFmdGVyRGVsZXRlUmVjb3JkKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgIC8vIFJlbG9hZCB0YWJsZSBkYXRhIHdpdGggY2FsbGJhY2sgc3VwcG9ydFxuICAgICAgICAgICAgY29uc3QgcmVsb2FkQ2FsbGJhY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gQ2FsbCBjdXN0b20gYWZ0ZXItZGVsZXRlIGNhbGxiYWNrIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiB0aGlzLm9uQWZ0ZXJEZWxldGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vbkFmdGVyRGVsZXRlKHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZWxvYWQgdGFibGUgYW5kIGV4ZWN1dGUgY2FsbGJhY2tcbiAgICAgICAgICAgIHRoaXMuZGF0YVRhYmxlLmFqYXgucmVsb2FkKHJlbG9hZENhbGxiYWNrLCBmYWxzZSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSByZWxhdGVkIGNvbXBvbmVudHNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgRXh0ZW5zaW9ucyAhPT0gJ3VuZGVmaW5lZCcgJiYgRXh0ZW5zaW9ucy5jYk9uRGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNiT25EYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdWNjZXNzIG1lc3NhZ2UgcmVtb3ZlZCAtIG5vIG5lZWQgdG8gc2hvdyBzdWNjZXNzIGZvciBkZWxldGlvbiBvcGVyYXRpb25zXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTaG93IGVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50cmFuc2xhdGlvbnMuZGVsZXRlRXJyb3IgfHwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5leF9JbXBvc3NpYmxlVG9EZWxldGVSZWNvcmQ7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGUgZnJvbSBhbGwgZGVsZXRlIGJ1dHRvbnNcbiAgICAgICAgdGhpcy4kdGFibGUuZmluZCgnYS5kZWxldGUnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBTaG93IGxvYWRlciB3aGlsZSBsb2FkaW5nIGRhdGFcbiAgICAgKi9cbiAgICBzaG93TG9hZGVyKCkge1xuICAgICAgICAvLyBIaWRlIGV2ZXJ5dGhpbmcgZmlyc3RcbiAgICAgICAgLy8gRmluZCB0aGUgdGFibGUncyBwYXJlbnQgY29udGFpbmVyIC0gbmVlZCB0aGUgb3JpZ2luYWwgY29udGFpbmVyLCBub3QgdGhlIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAgICBjb25zdCAkd3JhcHBlciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZCQ9XCJfd3JhcHBlclwiXScpO1xuICAgICAgICBsZXQgJGNvbnRhaW5lcjtcbiAgICAgICAgaWYgKCR3cmFwcGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gR2V0IHRoZSBwYXJlbnQgb2YgdGhlIHdyYXBwZXIgKHNob3VsZCBiZSB0aGUgb3JpZ2luYWwgY29udGFpbmVyKVxuICAgICAgICAgICAgJGNvbnRhaW5lciA9ICR3cmFwcGVyLnBhcmVudCgnZGl2W2lkXScpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEZhbGxiYWNrIGlmIHN0cnVjdHVyZSBpcyBkaWZmZXJlbnRcbiAgICAgICAgaWYgKCEkY29udGFpbmVyIHx8ICEkY29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgJGNvbnRhaW5lciA9IHRoaXMuJHRhYmxlLmNsb3Nlc3QoJ2RpdltpZF06bm90KFtpZCQ9XCJfd3JhcHBlclwiXSknKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCAkcGxhY2Vob2xkZXIgPSAkKCcjZW1wdHktdGFibGUtcGxhY2Vob2xkZXInKTtcbiAgICAgICAgY29uc3QgJGFkZEJ1dHRvbiA9ICQoJyNhZGQtbmV3LWJ1dHRvbicpO1xuICAgICAgICBcbiAgICAgICAgJGNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICRwbGFjZWhvbGRlci5oaWRlKCk7XG4gICAgICAgICRhZGRCdXR0b24uaGlkZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGFuZCBzaG93IGxvYWRlciBpZiBub3QgZXhpc3RzXG4gICAgICAgIGxldCAkbG9hZGVyID0gJCgnI3RhYmxlLWRhdGEtbG9hZGVyJyk7XG4gICAgICAgIGlmICghJGxvYWRlci5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIHNlZ21lbnQgd2l0aCBsb2FkZXIgZm9yIGJldHRlciB2aXN1YWwgYXBwZWFyYW5jZVxuICAgICAgICAgICAgJGxvYWRlciA9ICQoYFxuICAgICAgICAgICAgICAgIDxkaXYgaWQ9XCJ0YWJsZS1kYXRhLWxvYWRlclwiIGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwibWluLWhlaWdodDogMjAwcHg7IHBvc2l0aW9uOiByZWxhdGl2ZTtcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGFjdGl2ZSBpbnZlcnRlZCBkaW1tZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1aSB0ZXh0IGxvYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4X0xvYWRpbmdEYXRhIHx8ICdMb2FkaW5nLi4uJ308L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBgKTtcbiAgICAgICAgICAgIC8vIEluc2VydCBsb2FkZXIgaW4gdGhlIGFwcHJvcHJpYXRlIHBsYWNlXG4gICAgICAgICAgICBpZiAoJGNvbnRhaW5lci5sZW5ndGggJiYgJGNvbnRhaW5lci5wYXJlbnQoKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAkY29udGFpbmVyLmJlZm9yZSgkbG9hZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoJHBsYWNlaG9sZGVyLmxlbmd0aCAmJiAkcGxhY2Vob2xkZXIucGFyZW50KCkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgJHBsYWNlaG9sZGVyLmJlZm9yZSgkbG9hZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2s6IGFwcGVuZCB0byBib2R5IG9yIHBhcmVudCBjb250YWluZXJcbiAgICAgICAgICAgICAgICBjb25zdCAkcGFyZW50ID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnLnB1c2hlcicpIHx8IHRoaXMuJHRhYmxlLnBhcmVudCgpO1xuICAgICAgICAgICAgICAgICRwYXJlbnQuYXBwZW5kKCRsb2FkZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICRsb2FkZXIuc2hvdygpO1xuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBIaWRlIGxvYWRlclxuICAgICAqL1xuICAgIGhpZGVMb2FkZXIoKSB7XG4gICAgICAgICQoJyN0YWJsZS1kYXRhLWxvYWRlcicpLmhpZGUoKTtcbiAgICB9XG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGVtcHR5IHRhYmxlIHBsYWNlaG9sZGVyIHZpc2liaWxpdHlcbiAgICAgKi9cbiAgICB0b2dnbGVFbXB0eVBsYWNlaG9sZGVyKGlzRW1wdHkpIHtcbiAgICAgICAgLy8gRmluZCB0aGUgdGFibGUncyBwYXJlbnQgY29udGFpbmVyIC0gbmVlZCB0aGUgb3JpZ2luYWwgY29udGFpbmVyLCBub3QgdGhlIERhdGFUYWJsZXMgd3JhcHBlclxuICAgICAgICAvLyBEYXRhVGFibGVzIHdyYXBzIHRoZSB0YWJsZSBpbiBhIGRpdiB3aXRoIGlkIGVuZGluZyBpbiAnX3dyYXBwZXInXG4gICAgICAgIC8vIFdlIG5lZWQgdG8gZmluZCB0aGUgcGFyZW50IG9mIHRoYXQgd3JhcHBlciB3aGljaCBpcyB0aGUgb3JpZ2luYWwgY29udGFpbmVyXG4gICAgICAgIGNvbnN0ICR3cmFwcGVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkJD1cIl93cmFwcGVyXCJdJyk7XG4gICAgICAgIGxldCAkY29udGFpbmVyO1xuICAgICAgICBpZiAoJHdyYXBwZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBHZXQgdGhlIHBhcmVudCBvZiB0aGUgd3JhcHBlciAoc2hvdWxkIGJlIHRoZSBvcmlnaW5hbCBjb250YWluZXIpXG4gICAgICAgICAgICAkY29udGFpbmVyID0gJHdyYXBwZXIucGFyZW50KCdkaXZbaWRdJyk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRmFsbGJhY2sgaWYgc3RydWN0dXJlIGlzIGRpZmZlcmVudFxuICAgICAgICBpZiAoISRjb250YWluZXIgfHwgISRjb250YWluZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAkY29udGFpbmVyID0gdGhpcy4kdGFibGUuY2xvc2VzdCgnZGl2W2lkXTpub3QoW2lkJD1cIl93cmFwcGVyXCJdKScpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0ICRhZGRCdXR0b24gPSAkKCcjYWRkLW5ldy1idXR0b24nKTtcbiAgICAgICAgY29uc3QgJHBsYWNlaG9sZGVyID0gJCgnI2VtcHR5LXRhYmxlLXBsYWNlaG9sZGVyJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAoaXNFbXB0eSkge1xuICAgICAgICAgICAgJGNvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICAkYWRkQnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSBwbGFjZWhvbGRlciBpcyB2aXNpYmxlXG4gICAgICAgICAgICBpZiAoJHBsYWNlaG9sZGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoJHBsYWNlaG9sZGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICRwbGFjZWhvbGRlci5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodGhpcy5wZXJtaXNzaW9ucy5zYXZlKSB7XG4gICAgICAgICAgICAgICAgJGFkZEJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkY29udGFpbmVyLnNob3coKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGRvdWJsZS1jbGljayBmb3IgZWRpdGluZ1xuICAgICAqIEV4Y2x1ZGVzIGFjdGlvbiBidXR0b24gY2VsbHMgdG8gYXZvaWQgY29uZmxpY3RzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURvdWJsZUNsaWNrRWRpdCgpIHtcbiAgICAgICAgdGhpcy4kdGFibGUub24oJ2RibGNsaWNrJywgJ3Rib2R5IHRkOm5vdCgucmlnaHQuYWxpZ25lZCknLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHRoaXMuZGF0YVRhYmxlLnJvdyhlLmN1cnJlbnRUYXJnZXQpLmRhdGEoKTtcbiAgICAgICAgICAgIC8vIEdldCB0aGUgcmVjb3JkIElEIC0gY2hlY2sgZm9yIGJvdGggdW5pcWlkIGFuZCBpZCBmaWVsZHNcbiAgICAgICAgICAgIGNvbnN0IHJlY29yZElkID0gZGF0YSAmJiAoZGF0YS51bmlxaWQgfHwgZGF0YS5pZCk7XG4gICAgICAgICAgICBpZiAocmVjb3JkSWQgJiYgKHRoaXMucGVybWlzc2lvbnMubW9kaWZ5IHx8IHRoaXMucGVybWlzc2lvbnMuZWRpdCkpIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgY3VzdG9tIGdldE1vZGlmeVVybCBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSBkZWZhdWx0XG4gICAgICAgICAgICAgICAgY29uc3QgbW9kaWZ5VXJsID0gdGhpcy5nZXRNb2RpZnlVcmwgPyBcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5nZXRNb2RpZnlVcmwocmVjb3JkSWQpIDogXG4gICAgICAgICAgICAgICAgICAgIGAke2dsb2JhbFJvb3RVcmx9JHt0aGlzLnJvdXRlUHJlZml4fS9tb2RpZnkvJHtyZWNvcmRJZH1gO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IG1vZGlmeVVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZSBhIHVuaWZpZWQgZGVzY3JpcHRpb24gcmVuZGVyZXIgd2l0aCB0cnVuY2F0aW9uIHN1cHBvcnRcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259IFJlbmRlcmVyIGZ1bmN0aW9uIGZvciBEYXRhVGFibGVzXG4gICAgICovXG4gICAgY3JlYXRlRGVzY3JpcHRpb25SZW5kZXJlcigpIHtcbiAgICAgICAgcmV0dXJuIChkYXRhLCB0eXBlLCByb3cpID0+IHtcbiAgICAgICAgICAgIGlmICghZGF0YSB8fCBkYXRhLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ+KAlCc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmICh0eXBlID09PSAnZGlzcGxheScpIHtcbiAgICAgICAgICAgICAgICAvLyBFc2NhcGUgSFRNTCB0byBwcmV2ZW50IFhTU1xuICAgICAgICAgICAgICAgIGNvbnN0IHNhZmVEZXNjID0gd2luZG93LlNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChkYXRhKTtcbiAgICAgICAgICAgICAgICBjb25zdCBkZXNjcmlwdGlvbkxpbmVzID0gc2FmZURlc2Muc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpICE9PSAnJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIG1heCBsaW5lc1xuICAgICAgICAgICAgICAgIGxldCBtYXhMaW5lcyA9IHRoaXMuZGVzY3JpcHRpb25TZXR0aW5ncy5tYXhMaW5lcztcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmR5bmFtaWNIZWlnaHQgJiYgdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmNhbGN1bGF0ZUxpbmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIG1heExpbmVzID0gdGhpcy5kZXNjcmlwdGlvblNldHRpbmdzLmNhbGN1bGF0ZUxpbmVzKHJvdyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChkZXNjcmlwdGlvbkxpbmVzLmxlbmd0aCA8PSBtYXhMaW5lcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiBmaXRzIC0gc2hvdyB3aXRoIHByZXNlcnZlZCBmb3JtYXR0aW5nXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdHRlZERlc2MgPSBkZXNjcmlwdGlvbkxpbmVzLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwiZGVzY3JpcHRpb24tdGV4dFwiIHN0eWxlPVwibGluZS1oZWlnaHQ6IDEuMztcIj4ke2Zvcm1hdHRlZERlc2N9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBEZXNjcmlwdGlvbiB0b28gbG9uZyAtIHRydW5jYXRlIHdpdGggcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmlzaWJsZUxpbmVzID0gZGVzY3JpcHRpb25MaW5lcy5zbGljZSgwLCBtYXhMaW5lcyk7XG4gICAgICAgICAgICAgICAgICAgIHZpc2libGVMaW5lc1ttYXhMaW5lcyAtIDFdICs9ICcuLi4nO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJ1bmNhdGVkRGVzYyA9IHZpc2libGVMaW5lcy5qb2luKCc8YnI+Jyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxEZXNjID0gZGVzY3JpcHRpb25MaW5lcy5qb2luKCdcXG4nKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cImRlc2NyaXB0aW9uLXRleHQgdHJ1bmNhdGVkIHBvcHVwZWRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLWNvbnRlbnQ9XCIke2Z1bGxEZXNjfVwiIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEtcG9zaXRpb249XCJ0b3AgcmlnaHRcIiBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhLXZhcmlhdGlvbj1cIndpZGVcIlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0eWxlPVwiY3Vyc29yOiBoZWxwOyBib3JkZXItYm90dG9tOiAxcHggZG90dGVkICM5OTk7IGxpbmUtaGVpZ2h0OiAxLjM7XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICAke3RydW5jYXRlZERlc2N9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3Igc2VhcmNoIGFuZCBvdGhlciBvcGVyYXRpb25zLCByZXR1cm4gcGxhaW4gdGV4dFxuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH07XG4gICAgfVxuICAgIFxuICAgIC8qKlxuICAgICAqIERlc3Ryb3kgdGhlIERhdGFUYWJsZSBhbmQgY2xlYW51cFxuICAgICAqL1xuICAgIGRlc3Ryb3koKSB7XG4gICAgICAgIC8vIFJlbW92ZSBldmVudCBoYW5kbGVyc1xuICAgICAgICB0aGlzLiR0YWJsZS5vZmYoJ2NsaWNrJywgJ2EuZGVsZXRlOm5vdCgudHdvLXN0ZXBzLWRlbGV0ZSknKTtcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdjbGljaycsICdhLmNvcHknKTtcbiAgICAgICAgdGhpcy4kdGFibGUub2ZmKCdkYmxjbGljaycsICd0Ym9keSB0ZDpub3QoLnJpZ2h0LmFsaWduZWQpJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBEZXN0cm95IERhdGFUYWJsZSBpZiBleGlzdHNcbiAgICAgICAgaWYgKHRoaXMuZGF0YVRhYmxlICYmIHR5cGVvZiB0aGlzLmRhdGFUYWJsZS5kZXN0cm95ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB0aGlzLmRhdGFUYWJsZS5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFJlbW92ZSBsb2FkZXJcbiAgICAgICAgJCgnI3RhYmxlLWRhdGEtbG9hZGVyJykucmVtb3ZlKCk7XG4gICAgfVxufVxuXG4vLyBNYWtlIGF2YWlsYWJsZSBnbG9iYWxseVxud2luZG93LlBieERhdGFUYWJsZUluZGV4ID0gUGJ4RGF0YVRhYmxlSW5kZXg7Il19