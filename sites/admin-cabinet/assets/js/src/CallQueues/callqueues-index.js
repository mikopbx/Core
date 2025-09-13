/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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
 * Call queues table management module using unified base class
 *
 * Implements DataTable with Semantic UI following guidelines,
 * comprehensive XSS protection using SecurityUtils, and follows
 * MikoPBX standards for user interface (no success messages).
 */

/* global globalRootUrl, CallQueuesAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization, SecurityUtils, PbxDataTableIndex */

const queueTable = {
    /**
     * DataTable instance from base class
     */
    dataTableInstance: null,

    /**
     * Initialize the call queues index module
     */
    initialize() {
        // Create instance of base class with Call Queues specific configuration
        this.dataTableInstance = new PbxDataTableIndex({
            tableId: 'call-queues-table',
            apiModule: CallQueuesAPI,
            routePrefix: 'call-queues',
            showSuccessMessages: false, // Silent operation - following MikoPBX standards
            showInfo: true, // Show DataTable info
            actionButtons: ['edit', 'copy', 'delete'], // Include copy button
            translations: {
                deleteError: globalTranslate.cq_ImpossibleToDeleteQueue
            },
            descriptionSettings: {
                maxLines: 3,
                dynamicHeight: true,
                calculateLines: (row) => {
                    // Calculate available lines based on queue members count
                    const membersCount = (row.members && row.members.length) || 0;
                    return Math.max(2, Math.min(6, membersCount || 3)); // Min 2 lines, max 6, default 3
                }
            },
            columns: [
                {
                    data: 'represent',
                    className: 'collapsing', // Without 'ui' prefix as per guidelines
                    render: function(data, type, row) {
                        if (type === 'display') {
                            // Display the representation
                            return data || '—';
                        }
                        // For search, use the pre-generated search_index from backend
                        return row.search_index || data || '';
                    }
                },
                {
                    data: 'members',
                    className: 'hide-on-tablet collapsing',
                    render: function(data, type, row) {
                        if (!data || data.length === 0) {
                            return '<small>—</small>';
                        }

                        if (type === 'display') {
                            // Get strategy description
                            const strategyDesc = queueTable.getStrategyDescription(row.strategy);
                            
                            // Member representations need proper sanitization
                            const membersList = data.map(member => {
                                // Safely sanitize member representation with icon support
                                const representation = member.represent || member.extension;
                                return SecurityUtils.sanitizeExtensionsApiContent(representation);
                            }).join('<br>');

                            return `<div style="color: #999; font-size: 0.8em; margin-bottom: 3px;">${strategyDesc}</div>
                                    <small>${membersList}</small>`;
                        }
                        
                        // For search, backend provides search_index with all searchable content
                        return '';
                    }
                }
            ],
            onDrawCallback: () => {
                // Custom popup configuration
                queueTable.dataTableInstance.$table.find('.popuped').popup({
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
        
        // Add description column with unified renderer after instance is created
        this.dataTableInstance.columns.push({
            data: 'description',
            className: 'hide-on-mobile',
            orderable: false,
            // Use unified description renderer from base class
            render: this.dataTableInstance.createDescriptionRenderer()
        });
        
        // Override the delete callback to handle array of error messages using showMultiString
        const originalCallback = this.dataTableInstance.cbAfterDeleteRecord.bind(this.dataTableInstance);
        this.dataTableInstance.cbAfterDeleteRecord = function(response) {
            if (response.result === true) {
                // Just reload table data - NO success message (following MikoPBX standards)
                this.dataTable.ajax.reload();
                
                // Update related components
                if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
                    Extensions.cbOnDataChanged();
                }
            } else {
                // Show error message (matches conference room behavior)
                const errorMessage = response.messages?.error || globalTranslate.cq_ImpossibleToDeleteQueue;
                UserMessage.showError(errorMessage);
            }
            
            // Remove loading state
            this.$table.find('a.delete').removeClass('loading disabled');
        };
        
        // Initialize the base class
        this.dataTableInstance.initialize();
    },

    /**
     * Get human-readable description for queue strategy
     *
     * @param {string} strategy Technical strategy name
     * @returns {string} User-friendly description from translations
     */
    getStrategyDescription(strategy) {
        const translationKey = `cq_strategy_${strategy}_short`;
        
        // Use globalTranslate with fallback to strategy name
        return globalTranslate[translationKey] || strategy;
    }
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    queueTable.initialize();
});

