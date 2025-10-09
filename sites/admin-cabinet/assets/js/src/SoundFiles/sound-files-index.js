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

/* global globalRootUrl, SoundFilesAPI, globalTranslate, UserMessage, IndexSoundPlayer, SemanticLocalization */

/**
 * Sound files table management module with template preservation
 */
const soundFilesTable = {
    $customTab: $('#custom-sound-files-table'),
    $mohTab: $('#moh-sound-files-table'),
    activeCategory: 'custom',
    soundPlayers: {},
    customDataTable: null,
    mohDataTable: null,

    /**
     * Initialize the module
     */
    initialize() {
        // Initialize tabs
        $('#sound-files-menu .item').tab({
            history: true,
            historyType: 'hash',
            onVisible: (tabPath) => {
                soundFilesTable.activeCategory = tabPath;
                soundFilesTable.loadSoundFiles(tabPath);
            }
        });
        
        // Load initial data
        soundFilesTable.loadSoundFiles('custom');
    },
    
    /**
     * Load sound files from REST API and render using templates
     */
    loadSoundFiles(category) {
        // Show loading state
        const $container = category === 'custom' ? $('.ui.tab[data-tab="custom"]') : $('.ui.tab[data-tab="moh"]');
        $container.addClass('loading');
        
        // Get data from REST API
        SoundFilesAPI.getList({ category: category }, (response) => {
            if (response.result && response.data) {
                soundFilesTable.renderSoundFiles(response.data, category);
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load sound files');
            }
            $container.removeClass('loading');
        });
    },
    
    /**
     * Render sound files using template structure
     */
    renderSoundFiles(files, category) {
        const $container = category === 'custom' ? $('.ui.tab[data-tab="custom"]') : $('.ui.tab[data-tab="moh"]');
        const tableId = category === 'custom' ? 'custom-sound-files-table' : 'moh-sound-files-table';
        const $addButton = category === 'custom' ? $('#add-new-custom-button') : $('#add-new-moh-button');

        // Clean up existing sound players
        Object.keys(soundFilesTable.soundPlayers).forEach(playerId => {
            if (soundFilesTable.soundPlayers[playerId]) {
                // Stop any playing audio
                const player = soundFilesTable.soundPlayers[playerId];
                if (player.html5Audio) {
                    player.html5Audio.pause();
                    player.html5Audio.src = '';
                }
                delete soundFilesTable.soundPlayers[playerId];
            }
        });

        // Destroy existing DataTable if exists
        const existingTable = $(`#${tableId}`);
        if (existingTable.length && $.fn.DataTable.isDataTable(existingTable)) {
            existingTable.DataTable().destroy();
        }

        // Remove only the table and its wrapper, preserve the grid structure
        $container.find('.dataTables_wrapper').remove();
        $container.find('> table').remove(); // Direct child tables only
        $container.find('.ui.placeholder.segment').remove();

        // Find the grid structure or create a placeholder for table
        let $gridRow = $container.find('.ui.grid').first();
        let $tableContainer = $container;

        // If grid exists, place table after it
        if ($gridRow.length > 0) {
            // Check if we already have a table container div after grid
            let $existingContainer = $gridRow.next('.table-content');
            if ($existingContainer.length === 0) {
                $existingContainer = $('<div class="table-content"></div>');
                $gridRow.after($existingContainer);
            }
            $tableContainer = $existingContainer;
            $tableContainer.empty();
        }

        if (files.length === 0) {
            // Hide the add button when showing empty placeholder
            $addButton.hide();
            // Show empty placeholder
            const emptyHtml = soundFilesTable.getEmptyPlaceholder(category);
            $tableContainer.append(emptyHtml);
            return;
        }

        // Show the add button when displaying data
        $addButton.show();
        
        // Build table using template structure
        let tableHtml = `<table class="ui selectable very compact unstackable table" id="${tableId}">
            <thead>
                <tr>
                    <th>${globalTranslate.sf_ColumnFile}</th>
                    <th class="six wide hide-on-mobile">${globalTranslate.sf_ColumnPlayer}</th>
                    <th class="collapsing"></th>
                </tr>
            </thead>
            <tbody>`;
        
        // Build rows using template structure from customTab.volt
        files.forEach((file) => {
            tableHtml += soundFilesTable.renderFileRow(file);
        });
        
        tableHtml += `</tbody></table>`;
        $tableContainer.append(tableHtml);
        
        // Initialize DataTable
        const $table = $(`#${tableId}`);
        const dataTable = $table.DataTable({
            lengthChange: false,
            paging: false,
            searching: true,
            info: false,
            ordering: true,
            language: SemanticLocalization.dataTableLocalisation,
            order: [[0, 'asc']]
        });
        
        // Initialize audio players immediately after table creation
        files.forEach((file) => {
            if (file.path && file.id) {
                soundFilesTable.soundPlayers[file.id] = new IndexSoundPlayer(file.id);
            }
        });
        
        // Move the DataTable search filter to the grid next to the button
        const $wrapper = $(`#${tableId}_wrapper`);
        if ($wrapper.length) {
            const $searchDiv = $wrapper.find('.dataTables_filter');
            if ($searchDiv.length) {
                // Find the right column in the grid
                const $rightColumn = $container.find('.ui.grid .right.aligned.column').first();
                if ($rightColumn.length) {
                    // Remove any existing search filters first
                    $rightColumn.find('.dataTables_filter').remove();
                    $searchDiv.appendTo($rightColumn);
                }
            }
        }
        
        // Store DataTable reference
        if (category === 'custom') {
            soundFilesTable.customDataTable = dataTable;
        } else {
            soundFilesTable.mohDataTable = dataTable;
        }
        
        // Initialize delete handler for REST API
        soundFilesTable.initializeDeleteHandler();
        
        // Initialize double-click for editing
        soundFilesTable.initializeDoubleClickEdit($container);
    },
    
    /**
     * Render single file row using template structure
     */
    renderFileRow(file) {
        // Use new sound-files endpoint for MOH/IVR/system sounds (not CDR recordings)
        const playPath = file.path ? `/pbxcore/api/v3/sound-files:playback?view=${file.path}` : '';
        const downloadPath = file.path ? `/pbxcore/api/v3/sound-files:playback?view=${file.path}&download=1&filename=${file.name}.mp3` : '';
        
        return `<tr class="file-row" id="${file.id}" data-value="${file.path || ''}">
            <td><i class="file audio outline icon"></i>${file.name}</td>
            <td class="six wide cdr-player hide-on-mobile">
                <table>
                    <tr>
                        <td class="one wide">
                            ${file.path ?
                                `<button class="ui tiny basic icon button play-button">
                                     <i class="ui icon play"></i>
                                 </button>
                                 <audio preload="none" id="audio-player-${file.id}" data-src="${playPath}">
                                     <source src=""/>
                                 </audio>` :
                                `<button class="ui tiny basic icon button play-button disabled">
                                     <i class="ui icon play disabled"></i>
                                 </button>
                                 <audio preload="none" id="audio-player-${file.id}">
                                     <source src=""/>
                                 </audio>`
                            }
                        </td>
                        <td>
                            <div class="ui range cdr-player"></div>
                        </td>
                        <td class="one wide"><span class="cdr-duration"></span></td>
                        <td class="one wide">
                            ${file.path ? 
                                `<button class="ui tiny basic icon button download-button" data-value="${downloadPath}">
                                     <i class="ui icon download"></i>
                                 </button>` : 
                                `<button class="ui tiny basic icon button download-button disabled">
                                     <i class="ui icon download disabled"></i>
                                 </button>`
                            }
                        </td>
                    </tr>
                </table>
            </td>
            <td class="collapsing">
                <div class="ui tiny basic icon buttons action-buttons">
                    <a href="${globalRootUrl}sound-files/modify/${file.id}" 
                       class="ui button edit popuped"
                       data-content="${globalTranslate.bt_ToolTipEdit}">
                        <i class="icon edit blue"></i>
                    </a>
                    <a href="${globalRootUrl}sound-files/delete/${file.id}" 
                       data-value="${file.id}"
                       class="ui button delete two-steps-delete popuped"
                       data-content="${globalTranslate.bt_ToolTipDelete}">
                        <i class="icon trash red"></i>
                    </a>
                </div>
            </td>
        </tr>`;
    },
    
    /**
     * Get empty placeholder HTML matching partials/emptyTablePlaceholder.volt structure
     */
    getEmptyPlaceholder(category) {
        const linkPath = category === 'custom' ? 'sound-files/modify/custom' : 'sound-files/modify/moh';
        return `<div class="ui placeholder segment">
            <div class="ui icon header">
                <i class="music icon"></i>
                ${globalTranslate.sf_EmptyTableTitle}
            </div>
            <div class="inline">
                <div class="ui text">
                    ${globalTranslate.sf_EmptyTableDescription}
                </div>
            </div>
            <div style="margin-top: 1em;">
                <a href="https://wiki.mikopbx.com/sound-files" target="_blank" class="ui basic tiny button prevent-word-wrap">
                    <i class="question circle outline icon"></i>
                    ${globalTranslate.et_ReadDocumentation}
                </a>
            </div>
            <div style="margin-top: 1em; text-align: center;">
                <a href="${globalRootUrl}${linkPath}" class="ui blue button prevent-word-wrap">
                    <i class="add circle icon"></i> ${globalTranslate.sf_AddNewSoundFile}
                </a>
            </div>
        </div>`;
    },
    
    /**
     * Initialize delete handler for REST API
     */
    initializeDeleteHandler() {
        // Remove any existing handlers to prevent duplicates
        $('body').off('click.soundfiles');
        
        // Handle actual deletion after two-steps confirmation
        $('body').on('click.soundfiles', 'a.delete:not(.two-steps-delete)', function(e) {
            const $target = $(e.target).closest('a.delete');
            
            // Check if this delete button is in our sound files table
            if ($target.closest('#custom-sound-files-table, #moh-sound-files-table').length === 0) {
                return;
            }
            
            e.preventDefault();
            e.stopImmediatePropagation();
            
            const fileId = $target.attr('data-value');
            
            $target.addClass('loading disabled');
            
            SoundFilesAPI.deleteRecord(fileId, (response) => {
                soundFilesTable.cbAfterDeleteRecord(response);
            });
        });
    },
    
    /**
     * Callback after record deletion
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Reload current tab
            soundFilesTable.loadSoundFiles(soundFilesTable.activeCategory);
        } else {
            UserMessage.showError(
                response.messages?.error || 
                globalTranslate.sf_ImpossibleToDeleteSoundFile
            );
        }
        
        // Remove loading indicator
        $('a.delete').removeClass('loading disabled');
    },
    
    /**
     * Initialize double-click for editing
     */
    initializeDoubleClickEdit($container) {
        $container.on('dblclick', 'tr.file-row td', function(e) {
            // Skip if clicking on action buttons column
            if ($(this).hasClass('collapsing') || $(this).find('.action-buttons').length > 0) {
                return;
            }
            
            // Skip if clicking on any button or icon
            if ($(e.target).closest('button, a, i').length > 0) {
                return;
            }
            
            const $row = $(this).closest('tr');
            const fileId = $row.attr('id');
            if (fileId) {
                window.location = `${globalRootUrl}sound-files/modify/${fileId}`;
            }
        });
    }
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    soundFilesTable.initialize();
});