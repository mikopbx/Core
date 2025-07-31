/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global DialplanApplicationsAPI, SecurityUtils, SemanticLocalization, globalTranslate, globalRootUrl, Extensions */

/**
 * Dialplan applications table management module with enhanced security
 */
var dialplanApplicationsTable = {
    $applicationsTable: $('#dialplan-applications-table'),
    dataTable: {},

    /**
     * Initialize the module
     */
    initialize() {
        // Show placeholder initially
        dialplanApplicationsTable.toggleEmptyPlaceholder(true);
        dialplanApplicationsTable.initializeDataTable();
    },
    
    /**
     * Initialize DataTable with proper Semantic UI integration
     */
    initializeDataTable() {
        dialplanApplicationsTable.dataTable = dialplanApplicationsTable.$applicationsTable.DataTable({
            ajax: {
                url: DialplanApplicationsAPI.endpoints.getList,
                dataSrc: function(json) {
                    // Manage empty state
                    const isEmpty = !json.result || !json.data || json.data.length === 0;
                    dialplanApplicationsTable.toggleEmptyPlaceholder(isEmpty);
                    
                    // Data is already sanitized in API module
                    return json.result ? json.data : [];
                }
            },
            columns: [
                {
                    data: null,
                    className: 'collapsing',
                    render: function(data, type, row) {
                        // Create single-line represent format with icon, name, and extension in <>
                        var icon = row.type === 'php' ? 
                            '<i class="php icon blue"></i>' : 
                            '<i class="code icon grey"></i>';
                        var name = '<strong>' + SecurityUtils.escapeHtml(row.name) + '</strong>';
                        var extension = row.extension ? ' &lt;' + SecurityUtils.escapeHtml(row.extension) + '&gt;' : '';
                        
                        return icon + ' ' + name + extension;
                    }
                },
                {
                    data: 'description',
                    className: 'hide-on-mobile',
                    orderable: false,
                    responsivePriority: 2,
                    render: function(data, type, row) {
                        if (!data || data.trim() === '') return '—';

                        if (type === 'display') {
                            // Сохраняем переводы строк и разбиваем на строки
                            var safeDesc = SecurityUtils.escapeHtml(data);
                            var descriptionLines = safeDesc.split('\n').filter(function(line) {
                                return line.trim() !== '';
                            });
                            
                            // Динамическое ограничение - для dialplan applications используем базовое значение 3 строки
                            var maxLines = 3;
                            
                            if (descriptionLines.length <= maxLines) {
                                // Помещается - показываем с форматированием
                                var formattedDesc = descriptionLines.join('<br>');
                                return '<div class="description-text" style="line-height: 1.3;">' + formattedDesc + '</div>';
                            } else {
                                // Не помещается - сокращаем с popup
                                var visibleLines = descriptionLines.slice(0, maxLines);
                                visibleLines[maxLines - 1] += '...';
                                
                                var truncatedDesc = visibleLines.join('<br>');
                                var fullDesc = descriptionLines.join('\n');
                                
                                return '<div class="description-text truncated popuped" ' +
                                       'data-content="' + fullDesc + '" ' +
                                       'data-position="top right" ' +
                                       'data-variation="wide" ' +
                                       'style="cursor: help; border-bottom: 1px dotted #999; line-height: 1.3;">' +
                                       truncatedDesc +
                                       '</div>';
                            }
                        }
                        return data; // Для поиска и сортировки
                    }
                },
                {
                    data: null,
                    orderable: false,
                    searchable: false,
                    className: 'right aligned collapsing',
                    responsivePriority: 1,
                    render: function(data, type, row) {
                        // Create secure action buttons
                        var editUrl = SecurityUtils.sanitizeAttribute(globalRootUrl + 'dialplan-applications/modify/' + row.uniqid);
                        var deleteId = SecurityUtils.sanitizeAttribute(row.uniqid);
                        var editTooltip = SecurityUtils.sanitizeAttribute(globalTranslate.bt_ToolTipEdit);
                        var deleteTooltip = SecurityUtils.sanitizeAttribute(globalTranslate.bt_ToolTipDelete);
                        
                        return '<div class="ui tiny basic icon buttons action-buttons">' +
                               '<a href="' + editUrl + '" ' +
                               'class="ui button edit popuped" ' +
                               'data-content="' + editTooltip + '">' +
                               '<i class="icon edit blue"></i>' +
                               '</a>' +
                               '<a href="#" ' +
                               'data-value="' + deleteId + '" ' +
                               'class="ui button delete two-steps-delete popuped" ' +
                               'data-content="' + deleteTooltip + '">' +
                               '<i class="icon trash red"></i>' +
                               '</a>' +
                               '</div>';
                    }
                }
            ],
            order: [[0, 'asc']],
            lengthChange: false,
            paging: false,
            searching: true,
            info: false,
            language: SemanticLocalization.dataTableLocalisation,
            drawCallback: function() {
                // Initialize Semantic UI components
                dialplanApplicationsTable.$applicationsTable.find('.popuped').popup();
                
                // Move Add New button to the correct DataTables grid position (like in IVR Menu)
                var $addButton = $('#add-new-button');
                var $wrapper = $('#dialplan-applications-table_wrapper');
                var $leftColumn = $wrapper.find('.eight.wide.column').first();
                
                if ($addButton.length && $leftColumn.length) {
                    // Move button to the left column of DataTables grid
                    $leftColumn.append($addButton);
                    $addButton.show();
                }
                
                dialplanApplicationsTable.initializeDoubleClickEdit();
            }
        });
        
        // Handle deletion with DeleteSomething.js integration
        dialplanApplicationsTable.$applicationsTable.on('click', 'a.delete:not(.two-steps-delete)', function(e) {
            e.preventDefault();
            var $button = $(this);
            var appId = $button.attr('data-value');
            
            $button.addClass('loading disabled');
            
            DialplanApplicationsAPI.deleteRecord(appId, dialplanApplicationsTable.cbAfterDeleteRecord);
        });
    },
    
    /**
     * Callback after record deletion (no success messages - UI updates only)
     * 
     * @param {object} response - Server response
     */
    cbAfterDeleteRecord(response) {
        if (response.result === true) {
            // Silent operation - just reload table
            dialplanApplicationsTable.dataTable.ajax.reload();
            
            // Update related components
            if (typeof Extensions !== 'undefined' && Extensions.cbOnDataChanged) {
                Extensions.cbOnDataChanged();
            }
            
            // No success message - silent operation
        } else {
            // Only show errors
            var errorMessage = response.messages && response.messages.error ? 
                response.messages.error.join(', ') : 
                globalTranslate.da_ImpossibleToDeleteDialplanApplication;
            UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
        
        // Remove loading state
        dialplanApplicationsTable.$applicationsTable.find('a.delete').removeClass('loading disabled');
    },
    
    /**
     * Toggle empty table placeholder visibility
     * 
     * @param {boolean} isEmpty - Whether table is empty
     */
    toggleEmptyPlaceholder(isEmpty) {
        if (isEmpty) {
            $('#dialplan-applications-table-container').hide();
            $('#add-new-button').hide();
            $('#empty-table-placeholder').show();
        } else {
            $('#empty-table-placeholder').hide();
            $('#add-new-button').show();
            $('#dialplan-applications-table-container').show();
        }
    },
    
    /**
     * Initialize double-click for editing (exclude action buttons)
     */
    initializeDoubleClickEdit: function() {
        dialplanApplicationsTable.$applicationsTable.on('dblclick', 'tbody td:not(.right.aligned)', function() {
            var data = dialplanApplicationsTable.dataTable.row(this).data();
            if (data && data.uniqid) {
                window.location = globalRootUrl + 'dialplan-applications/modify/' + data.uniqid;
            }
        });
    }
};

/**
 * Initialize on document ready
 */
$(document).ready(function() {
    dialplanApplicationsTable.initialize();
});

