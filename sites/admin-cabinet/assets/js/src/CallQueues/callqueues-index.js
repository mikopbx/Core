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
 * Call queues table management module
 *
 * Implements DataTable with Semantic UI following guidelines,
 * comprehensive XSS protection using SecurityUtils, and follows
 * MikoPBX standards for user interface (no success messages).
 */

/* global globalRootUrl, CallQueuesAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization, SecurityUtils */

const queueTable = {
    $queuesTable: $('#call-queues-table'),
    dataTable: {},

    /**
     * Initialize the call queues index module
     */
    initialize() {
        // Show placeholder until data loads
        queueTable.toggleEmptyPlaceholder(true);

        queueTable.initializeDataTable();
    },

    /**
     * Initialize DataTable with proper Semantic UI integration
     *
     * Following DataTable Semantic UI Guidelines to prevent sizing issues
     * and ensure proper responsive behavior.
     */
    initializeDataTable() {
        queueTable.dataTable = queueTable.$queuesTable.DataTable({
            ajax: {
                url: CallQueuesAPI.endpoints.getList,
                dataSrc: function(json) {
                    // Manage empty state
                    queueTable.toggleEmptyPlaceholder(
                        !json.result || !json.data || json.data.length === 0
                    );
                    return json.result ? json.data : [];
                }
            },
            columns: [
                {
                    data: 'represent',
                    className: 'collapsing', // Without 'ui' prefix as per guidelines
                    render: function(data, type, row) {
                        if (type === 'display') {
                            // For display, show the represent with hidden searchable content
                            const searchableContent = [
                                row.name || '',
                                row.extension || '',
                                row.uniqid || ''
                            ].join(' ').toLowerCase();
                            
                            return `${data || '—'}<span style="display:none;">${searchableContent}</span>`;
                        }
                        // For search and other operations, return plain text
                        return [data, row.name, row.extension, row.uniqid].filter(Boolean).join(' ');
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
                            
                            // SECURITY: Sanitize member representations allowing safe icons
                            const membersList = data.map(member => {
                                return SecurityUtils.sanitizeExtensionsApiContent(member.represent || member.extension);
                            }).join('<br>');

                            // Create searchable content with member extensions and names
                            const searchableContent = data.map(member => {
                                return [member.extension, member.represent || ''].join(' ');
                            }).join(' ').toLowerCase();

                            return `<div style="color: #999; font-size: 0.8em; margin-bottom: 3px;">${strategyDesc}</div>
                                    <small>${membersList}</small>
                                    <span style="display:none;">${searchableContent}</span>`;
                        }
                        
                        // For search, return plain text with all member info
                        return data.map(member => {
                            return [member.extension, member.represent || ''].filter(Boolean).join(' ');
                        }).join(' ');
                    }
                },
                {
                    data: 'description',
                    className: 'hide-on-mobile',
                    orderable: false,
                    render: function(data, type, row) {
                        if (!data || data.trim() === '') return '—';

                        // SECURITY: Preserve line breaks but escape HTML
                        const safeDesc = SecurityUtils.escapeHtml(data);
                        const descriptionLines = safeDesc.split('\n').filter(line => line.trim() !== '');
                        
                        // Calculate available lines based on queue members count
                        const membersCount = (row.members && row.members.length) || 0;
                        const maxLines = Math.max(2, Math.min(6, membersCount || 3)); // Min 2 lines, max 6, default 3
                        
                        if (descriptionLines.length <= maxLines) {
                            // Description fits in available lines - show with preserved formatting
                            const formattedDesc = descriptionLines.join('<br>');
                            return `<div class="description-text" style="line-height: 1.3;">${formattedDesc}</div>`;
                        } else {
                            // Description is too long - show truncated with popup
                            const visibleLines = descriptionLines.slice(0, maxLines);
                            const lastLine = visibleLines[maxLines - 1];
                            visibleLines[maxLines - 1] = lastLine + '...';
                            
                            const truncatedDesc = visibleLines.join('<br>');
                            const fullDesc = descriptionLines.join('\n'); // For popup data-content
                            
                            return `<div class="description-text truncated popuped" 
                                         data-content="${fullDesc}" 
                                         data-position="top right" 
                                         data-variation="wide"
                                         style="cursor: help; border-bottom: 1px dotted #999; line-height: 1.3;">
                                ${truncatedDesc}
                            </div>`;
                        }
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'right aligned collapsing', // Action buttons column
                    render: function(data, type, row) {
                        return `<div class="ui tiny basic icon buttons action-buttons">
                            <a href="${globalRootUrl}call-queues/modify/${row.uniqid}"
                               class="ui button edit popuped"
                               data-content="${globalTranslate.bt_ToolTipEdit}">
                                <i class="icon edit blue"></i>
                            </a>
                            <a href="#"
                               data-value="${row.uniqid}"
                               class="ui button delete two-steps-delete popuped"
                               data-content="${globalTranslate.bt_ToolTipDelete}">
                                <i class="icon trash red"></i>
                            </a>
                        </div>`;
                    }
                }
            ],
            order: [[0, 'asc']],
            lengthChange: false,
            paging: false,
            info: true,
            searching: true,
            language: SemanticLocalization.dataTableLocalisation,
            drawCallback: function() {
                // Initialize Semantic UI elements after table draw
                queueTable.$queuesTable.find('.popuped').popup({
                    position: 'top right',
                    variation: 'wide',
                    hoverable: true,
                    delay: {
                        show: 300,
                        hide: 100
                    }
                });

                // Move Add New button to the correct DataTables grid position (like in IVR Menu)
                const $addButton = $('#add-new-button');
                const $wrapper = $('#call-queues-table_wrapper');
                const $leftColumn = $wrapper.find('.eight.wide.column').first();
                
                if ($addButton.length && $leftColumn.length) {
                    // Move button to the left column of DataTables grid
                    $leftColumn.append($addButton);
                    $addButton.show();
                }

                // Initialize double-click editing
                queueTable.initializeDoubleClickEdit();
            }
        });

        // Handle deletion using existing DeleteSomething.js integration
        queueTable.$queuesTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const queueId = $button.attr('data-value');

            // Add loading state
            $button.addClass('loading disabled');

            CallQueuesAPI.deleteRecord(queueId, queueTable.cbAfterDeleteRecord);
        });
    },

    /**
     * Handle record deletion response (following MikoPBX standards - no success messages)
     *
     * @param {object|boolean} response API response
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Just reload table data - NO success message (following MikoPBX standards)
            queueTable.dataTable.ajax.reload();

            // Update related components
            if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
                Extensions.cbOnDataChanged();
            }

            // NO UserMessage.showSuccess() call - following MikoPBX standards
        } else {
            // Only show error messages
            const errorMessage = response.messages?.error || [globalTranslate.cq_ImpossibleToDeleteQueue];
            UserMessage.showMultiString(errorMessage, globalTranslate.cq_DeletionError);
        }

        // Remove loading state
        $('a.delete').removeClass('loading disabled');
    },

    /**
     * Toggle empty table placeholder visibility
     *
     * @param {boolean} isEmpty Whether the table is empty
     */
    toggleEmptyPlaceholder(isEmpty) {
        if (isEmpty) {
            $('#queue-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-button').show();
            $('#queue-table-container').show();
        }
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
    },

    /**
     * Initialize double-click editing
     *
     * IMPORTANT: Exclude action buttons cells to avoid conflicts with DeleteSomething.js
     */
    initializeDoubleClickEdit() {
        queueTable.$queuesTable.on('dblclick', 'tbody td:not(.right.aligned)', function() {
            const data = queueTable.dataTable.row(this).data();
            if (data && data.uniqid) {
                window.location.href = `${globalRootUrl}call-queues/modify/${data.uniqid}`;
            }
        });
    }
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    queueTable.initialize();
});

