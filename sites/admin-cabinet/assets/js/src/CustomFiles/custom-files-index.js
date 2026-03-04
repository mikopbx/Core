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

/*
 * Custom Files table management module using unified base class
 *
 * Implements DataTable with Semantic UI following guidelines,
 * loads data via REST API v3, and follows MikoPBX standards.
 */

/* global globalRootUrl, customFilesAPI, globalTranslate, UserMessage, SemanticLocalization, PbxDataTableIndex */

/**
 * Module for handling interactions with the custom files table.
 * @module customFilesTable
 */
const customFilesTable = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,

    /**
     * jQuery object for the page length dropdown
     */
    $pageLengthDropdown: $('#page-length-select'),

    /**
     * Initializes the custom files table, applying DataTable features and setting up event handlers.
     */
    initialize() {
        // Initialize dropdown for page length selection
        customFilesTable.initializePageLengthDropdown();

        // Create instance of base class with Custom Files specific configuration
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'custom-files-table',
            apiModule: customFilesAPI,
            apiMethod: 'getRecords', // Use the standard method name
            routePrefix: 'custom-files',
            showSuccessMessages: false, // Silent operation - following MikoPBX standards
            showInfo: true, // Show DataTable info for pagination
            actionButtons: ['edit', 'delete'], // Edit and delete buttons for custom files
            translations: {
                deleteError: globalTranslate.cf_ImpossibleToDeleteFile,
                deleteDisabledTooltip: globalTranslate.cf_CannotDeleteSystemFile
            },
            // Custom delete permission check - only allow delete for custom mode files
            customDeletePermissionCheck: (row) => {
                // Only allow deletion of files with mode === 'custom'
                return row.mode === 'custom';
            },
            dataTableOptions: {
                paging: true, // Enable pagination
                pageLength: customFilesTable.calculatePageLength(), // Calculate initial page length
                lengthMenu: [[25, 100], [25, 100]], // Page size options - simplified
                lengthChange: false, // We use custom dropdown instead of built-in
                pagingType: 'simple_numbers', // Show page numbers
                searching: true, // Enable searching functionality
                dom: 'rtip' // Remove filter (f) and length (l) from DOM, keep only processing (r), table (t), info (i), pagination (p)
            },
            columns: [
                {
                    data: 'filepath',
                    render: function(data, type, row) {
                        if (type === 'display') {
                            return data || '—';
                        }
                        return data || '';
                    }
                },
                {
                    data: 'mode',
                    className: 'collapsing',
                    render: function(data, type, row) {
                        if (type === 'display') {
                            // Translate mode values
                            const modeKey = 'cf_FileActions' + (data || 'None').charAt(0).toUpperCase() + (data || 'none').slice(1);
                            return globalTranslate[modeKey] || data || '—';
                        }
                        return data || '';
                    }
                },
                {
                    data: 'description',
                    className: 'hide-on-mobile',
                    orderable: false,
                    render: function(data, type, row) {
                        if (type === 'display') {
                            if (!data) {
                                return '—';
                            }

                            // If description is long, show it in a popup
                            if (data.length > 80) {
                                return `<div class="ui basic icon button popuped" data-content="${data}" data-variation="wide">
                                            <i class="file text icon"></i>
                                        </div>`;
                            }

                            return data;
                        }
                        return data || '';
                    }
                }
            ],
            onDrawCallback: function() {
                // Initialize popups for long descriptions
                this.$table.find('.popuped').popup({
                    position: 'top right',
                    variation: 'wide',
                    hoverable: true,
                    delay: {
                        show: 300,
                        hide: 100
                    }
                });

            }
        });

        // Initialize the base class
        this.dataTableInstance.initialize();
    },

    /**
     * Initialize the page length dropdown with Semantic UI
     */
    initializePageLengthDropdown() {
        // Get saved page length from localStorage
        const savedPageLength = localStorage.getItem('customFilesTablePageLength');

        // Set initial value of dropdown
        if (savedPageLength && savedPageLength !== 'auto') {
            customFilesTable.$pageLengthDropdown.dropdown('set selected', savedPageLength);
        }

        // Initialize Semantic UI dropdown with change handler
        customFilesTable.$pageLengthDropdown.dropdown({
            onChange(pageLength) {
                if (pageLength === 'auto') {
                    pageLength = customFilesTable.calculatePageLength();
                    localStorage.removeItem('customFilesTablePageLength');
                } else {
                    localStorage.setItem('customFilesTablePageLength', pageLength);
                }

                // Update DataTable page length if it's initialized
                if (customFilesTable.dataTableInstance && customFilesTable.dataTableInstance.dataTable) {
                    customFilesTable.dataTableInstance.dataTable.page.len(pageLength).draw();
                }
            }
        });

        // Prevent dropdown from closing the search input
        customFilesTable.$pageLengthDropdown.on('click', function(event) {
            event.stopPropagation();
        });

        // Start the search when clicking on the icon
        $('#search-icon').on('click', function() {
            $('#global-search').focus();
        });

        // Handle search input
        $('#global-search').on('keyup change', function() {
            const searchValue = $(this).val();
            // Use DataTables built-in search
            if (customFilesTable.dataTableInstance && customFilesTable.dataTableInstance.dataTable) {
                customFilesTable.dataTableInstance.dataTable.search(searchValue).draw();
            }
        });
    },

    /**
     * Calculate optimal page length based on window height.
     * Uses a conservative estimate since the table container is hidden at init time.
     * Subtracts one extra row to guarantee pagination fits without scrolling.
     * @returns {number} The calculated page length
     */
    calculatePageLength() {
        // User preference takes priority
        const savedPageLength = localStorage.getItem('customFilesTablePageLength');
        if (savedPageLength && savedPageLength !== 'auto') {
            return parseInt(savedPageLength, 10);
        }

        const windowHeight = window.innerHeight;
        const rowHeight = 38; // Very compact table row height including borders and sub-pixel gaps

        // 450 accounts for: top menu, page header, controls row, thead, pagination, info, version footer
        // On large screens (>1080) margins/paddings scale up, so we add proportional overhead
        const overhead = 450 + Math.max(0, windowHeight - 1080) * 0.15;

        return Math.max(Math.floor((windowHeight - overhead) / rowHeight), 8);
    }
};

// Initialize the custom files table when the document is ready.
$(document).ready(() => {
    customFilesTable.initialize();
});
