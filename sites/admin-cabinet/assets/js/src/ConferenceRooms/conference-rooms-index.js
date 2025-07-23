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

/* global globalRootUrl, ConferenceRoomsAPI, Extensions, globalTranslate, UserMessage, SemanticLocalization */

/**
 * Модуль управления таблицей конференций
 */
const conferenceTable = {
    $conferencesTable: $('#conference-rooms-table'),
    dataTable: {},

    /**
     * Conference table management module
     */
    initialize() {
        // Initially show placeholder until data loads
        conferenceTable.toggleEmptyPlaceholder(true);
        
        conferenceTable.initializeDataTable();
    },
    
    /**
     * Initialize DataTable
     */
    initializeDataTable() {
        conferenceTable.dataTable = conferenceTable.$conferencesTable.DataTable({
            ajax: {
                url: ConferenceRoomsAPI.endpoints.getList,
                dataSrc: function(json) {                    
                    // Manage empty state
                    conferenceTable.toggleEmptyPlaceholder(
                        !json.result || !json.data || json.data.length === 0
                    );
                    return json.result ? json.data : [];
                }
            },
            columns: [
                {
                    data: 'name',
                    render: function(data, type, row) {
                        return `<strong>${data}</strong>`;
                    }
                },
                {
                    data: 'extension',
                    className: 'center aligned'
                },
                {
                    data: 'pinCode',
                    className: 'center aligned hide-on-mobile',
                    responsivePriority: 2,
                    render: function(data) {
                        return data || '—';
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'right aligned action-buttons', // Added class for identification
                    responsivePriority: 1,
                    render: function(data, type, row) {
                        return `<div class="ui basic icon buttons">
                            <a href="${globalRootUrl}conference-rooms/modify/${row.uniqid}" 
                               class="ui button popuped" 
                               data-content="${globalTranslate.bt_ToolTipEdit}">
                                <i class="edit icon"></i>
                            </a>
                            <a href="#" 
                               data-value="${row.uniqid}" 
                               class="ui button delete two-steps-delete popuped" 
                               data-content="${globalTranslate.bt_ToolTipDelete}">
                                <i class="trash red icon"></i>
                            </a>
                        </div>`;
                    }
                }
            ],
            order: [[0, 'asc']],
            responsive: true,
            searching: false,
            paging: false,
            info: false,
            language: SemanticLocalization.dataTableLocalisation,
            drawCallback: function() {
                console.log('DataTable drawCallback triggered'); // Debug log
                
                // Initialize Semantic UI elements
                conferenceTable.$conferencesTable.find('.popuped').popup();
                
                // Double-click for editing
                conferenceTable.initializeDoubleClickEdit();
            }
        });
        
        // Handle deletion using DeleteSomething.js
        // DeleteSomething.js automatically handles first click
        // We only listen for second click (when two-steps-delete class is removed)
        conferenceTable.$conferencesTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            const $button = $(this);
            const roomId = $button.attr('data-value');
            
            // Add loading indicator and disable button
            $button.addClass('loading disabled');
            
            ConferenceRoomsAPI.deleteRecord(roomId, conferenceTable.cbAfterDeleteRecord);
        });
    },
    
    /**
     * Callback after record deletion
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Reload table
            conferenceTable.dataTable.ajax.reload();
            
            // Update related components
            if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
                Extensions.cbOnDataChanged();
            }
            
            UserMessage.showSuccess(globalTranslate.cr_ConferenceRoomDeleted);
        } else {
            UserMessage.showError(
                response.messages?.error || 
                globalTranslate.cr_ImpossibleToDeleteConferenceRoom
            );
        }
        
        // Remove loading indicator and restore button to initial state
        $('a.delete').removeClass('loading disabled');
    },
    
    /**
     * Toggle empty table placeholder visibility
     */
    toggleEmptyPlaceholder(isEmpty) {
        if (isEmpty) {
            $('#conference-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-button').show();
            $('#conference-table-container').show();
        }
    },
    
  /**
     * Initialize double-click for editing
     * IMPORTANT: Exclude cells with action-buttons class to avoid conflict with delete-something.js
     */
    initializeDoubleClickEdit() {
        conferenceTable.$conferencesTable.on('dblclick', 'tbody td:not(.action-buttons)', function() {
            const data = conferenceTable.dataTable.row(this).data();
            if (data && data.uniqid) {
                window.location = `${globalRootUrl}conference-rooms/modify/${data.uniqid}`;
            }
        });
    }
};

/**
 *  Initialize on document ready
 */
$(document).ready(() => {
    conferenceTable.initialize();
});

