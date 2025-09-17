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
/* global ace, PbxApi, SyslogAPI, updateLogViewWorker, Ace, UserMessage */
 
/**
 * Represents the system diagnostic logs object.
 *
 * @module systemDiagnosticLogs
 */
const systemDiagnosticLogs = {
    /**
     * jQuery object for the "Show Last Log" button.
     * @type {jQuery}
     */
    $showBtn: $('#show-last-log'),

    /**
     * jQuery object for the "Download File" button.
     * @type {jQuery}
     */
    $downloadBtn: $('#download-file'),

    /**
     * jQuery object for the "Show Last Log (Auto)" button.
     * @type {jQuery}
     */
    $showAutoBtn: $('#show-last-log-auto'),

    /**
     * jQuery object for the "Erase current file content" button.
     * @type {jQuery}
     */
    $eraseBtn: $('#erase-file'),

    /**
     * jQuery object for the log content.
     * @type {jQuery}
     */
    $logContent: $('#log-content-readonly'),

    /**
     * The viewer for displaying the log content.
     * @type {Ace}
     */
    viewer: '',

    /**
     * jQuery object for the file select dropdown.
     * @type {jQuery}
     */
    $fileSelectDropDown: $('#system-diagnostic-form .filenames-select'),

    /**
     * Array of log items.
     * @type {Array}
     */
    logsItems: [],

    /**
     * Default log item.
     * @type {Object}
     */
    defaultLogItem: null,

    /**
     * jQuery object for the dimmer.
     * @type {jQuery}
     */
    $dimmer: $('#get-logs-dimmer'),

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#system-diagnostic-form'),

    /**
     * jQuery object for the filename.
     * @type {jQuery}
     */
    $fileName: $('#system-diagnostic-form .filename'),

    /**
     * Initializes the system diagnostic logs.
     */
    initialize() {
        const aceHeight = window.innerHeight - 250;

        // Set the minimum height of the log container
        systemDiagnosticLogs.$dimmer.closest('div').css('min-height', `${aceHeight}px`);

        // Initialize the dropdown menu for log files with tree support
        // Initialize Semantic UI dropdown with custom menu generation
        systemDiagnosticLogs.$fileSelectDropDown.dropdown({
                onChange: systemDiagnosticLogs.cbOnChangeFile,
                ignoreCase: true,
                fullTextSearch: true,
                forceSelection: false,
                preserveHTML: true,
                allowCategorySelection: false,
                match: 'text',
                filterRemoteData: false,
                action: 'activate',
                templates: {
                    menu: systemDiagnosticLogs.customDropdownMenu
                }
        });

        // Initialize the ACE editor for log content
        systemDiagnosticLogs.initializeAce();

        // Fetch the list of log files
        SyslogAPI.getLogsList(systemDiagnosticLogs.cbFormatDropdownResults);

        // Event listener for "Show Log" button click
        systemDiagnosticLogs.$showBtn.on('click', (e) => {
            e.preventDefault();
            systemDiagnosticLogs.updateLogFromServer();
        });

        // Event listener for "Download Log" button click
        systemDiagnosticLogs.$downloadBtn.on('click', (e) => {
            e.preventDefault();
            const data = systemDiagnosticLogs.$formObj.form('get values');
            SyslogAPI.downloadLogFile(data.filename, true, systemDiagnosticLogs.cbDownloadFile);
        });

        // Event listener for "Auto Refresh" button click
        systemDiagnosticLogs.$showAutoBtn.on('click', (e) => {
            e.preventDefault();
            const $reloadIcon = systemDiagnosticLogs.$showAutoBtn.find('i.refresh');
            if ($reloadIcon.hasClass('loading')) {
                $reloadIcon.removeClass('loading');
                updateLogViewWorker.stop();
            } else {
                $reloadIcon.addClass('loading');
                updateLogViewWorker.initialize();
            }
        });

        // Event listener for the "Erase file" button click
        systemDiagnosticLogs.$eraseBtn.on('click', (e) => {
            e.preventDefault();
            systemDiagnosticLogs.eraseCurrentFileContent();
        });

        // Event listener for Enter keypress on input fields
        $('input').keyup((event) => {
            if (event.keyCode === 13) {
                systemDiagnosticLogs.updateLogFromServer();
            }
        });

        // Event listener for Fullscreen button click
        $('.fullscreen-toggle-btn').on('click', systemDiagnosticLogs.toggleFullScreen);

        // Listening for the fullscreen change event
        document.addEventListener('fullscreenchange', systemDiagnosticLogs.adjustLogHeight);

        // Initial height calculation
        systemDiagnosticLogs.adjustLogHeight();
    },

    /**
     * Toggles the full-screen mode of the 'system-logs-segment' element.
     * If the element is not in full-screen mode, it requests full-screen mode.
     * If the element is already in full-screen mode, it exits full-screen mode.
     * Logs an error message to the console if there is an issue enabling full-screen mode.
     *
     * @return {void}
     */
    toggleFullScreen() {
        const logContainer = document.getElementById('system-logs-segment');

        if (!document.fullscreenElement) {
            logContainer.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    },

    /**
     * Function to adjust the height of the logs depending on the screen mode.
     */
    adjustLogHeight() {
        setTimeout(() => {
            let aceHeight = window.innerHeight - systemDiagnosticLogs.$logContent.offset().top - 25;
            if (document.fullscreenElement) {
                // If fullscreen mode is active
                aceHeight = window.innerHeight - 80;
            }
            // Recalculate the size of the ACE editor
            $('.log-content-readonly').css('min-height',  `${aceHeight}px`);
            systemDiagnosticLogs.viewer.resize();
        }, 300);
    },
    /**
     * Initializes the ACE editor for log viewing.
     */
    initializeAce() {
        systemDiagnosticLogs.viewer = ace.edit('log-content-readonly');

        // Check if the Julia mode is available
        const julia = ace.require('ace/mode/julia');
        if (julia !== undefined) {
            // Set the mode to Julia if available
            const IniMode = julia.Mode;
            systemDiagnosticLogs.viewer.session.setMode(new IniMode());
        }

        // Set the theme and options for the ACE editor
        systemDiagnosticLogs.viewer.setTheme('ace/theme/monokai');
        systemDiagnosticLogs.viewer.renderer.setShowGutter(false);
        systemDiagnosticLogs.viewer.setOptions({
            showLineNumbers: false,
            showPrintMargin: false,
            readOnly: true,
        });

    },

    /**
     * Builds a hierarchical tree structure from flat file paths
     * @param {Object} files - The files object from API response
     * @param {string} defaultPath - The default selected file path
     * @returns {Array} Tree structure for the dropdown
     */
    buildTreeStructure(files, defaultPath) {
        const tree = {};
        
        // Build the tree structure
        Object.entries(files).forEach(([key, fileData]) => {
            // Use fileData.path as the actual file path
            const filePath = fileData.path || key;
            const parts = filePath.split('/');
            let current = tree;
            
            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    // This is a file
                    current[part] = {
                        type: 'file',
                        path: filePath,
                        size: fileData.size,
                        default: (defaultPath && defaultPath === filePath) || (!defaultPath && fileData.default)
                    };
                } else {
                    // This is a directory
                    if (!current[part]) {
                        current[part] = {
                            type: 'folder',
                            children: {}
                        };
                    }
                    current = current[part].children;
                }
            });
        });
        
        // Convert tree to dropdown items
        return this.treeToDropdownItems(tree, '');
    },
    
    /**
     * Converts tree structure to dropdown items with proper formatting
     * @param {Object} tree - The tree structure
     * @param {string} prefix - Prefix for indentation
     * @returns {Array} Formatted dropdown items
     */
    treeToDropdownItems(tree, prefix) {
        const items = [];
        
        // Sort entries: folders first, then files
        const entries = Object.entries(tree).sort(([aKey, aVal], [bKey, bVal]) => {
            if (aVal.type === 'folder' && bVal.type === 'file') return -1;
            if (aVal.type === 'file' && bVal.type === 'folder') return 1;
            return aKey.localeCompare(bKey);
        });
        
        entries.forEach(([key, value]) => {
            if (value.type === 'folder') {
                // Add folder header
                items.push({
                    name: `${prefix}<i class="folder icon"></i> ${key}`,
                    value: '',
                    disabled: true,
                    type: 'folder'
                });
                
                // Add children with increased indentation
                const childItems = this.treeToDropdownItems(value.children, prefix + '&nbsp;&nbsp;&nbsp;&nbsp;');
                items.push(...childItems);
            } else {
                // Add file item
                items.push({
                    name: `${prefix}<i class="file outline icon"></i> ${key} (${value.size})`,
                    value: value.path,
                    selected: value.default,
                    type: 'file'
                });
            }
        });
        
        return items;
    },
    
    /**
     * Creates custom dropdown menu HTML for log files
     * @param {Object} response - The response containing dropdown menu options
     * @param {Object} fields - The fields in the response to use for the menu options
     * @returns {string} The HTML string for the custom dropdown menu
     */
    customDropdownMenu(response, fields) {
        const values = response[fields.values] || {};
        let html = '';
        
        $.each(values, (index, option) => {
            // For tree structure items
            if (systemDiagnosticLogs.logsItems && systemDiagnosticLogs.logsItems[index]) {
                const item = systemDiagnosticLogs.logsItems[index];
                
                if (item.type === 'folder') {
                    // Folder item - disabled and with folder icon
                    html += `<div class="disabled item" data-value="">${item.name}</div>`;
                } else {
                    // File item with proper value
                    const selected = item.selected ? 'selected active' : '';
                    html += `<div class="item ${selected}" data-value="${option[fields.value]}">${item.name}</div>`;
                }
            } else {
                // Fallback to regular item
                const maybeDisabled = (option[fields.disabled]) ? 'disabled ' : '';
                html += `<div class="${maybeDisabled}item" data-value="${option[fields.value]}">${option[fields.name]}</div>`;
            }
        });
        
        return html;
    },

    /**
     * Callback function to format the dropdown menu structure based on the response.
     * @param {Object} response - The response data.
     */
    cbFormatDropdownResults(response) {
        // Check if response is valid
        if (!response || !response.result || !response.data || !response.data.files) {
            systemDiagnosticLogs.$dimmer.removeClass('active');
            return;
        }

        const files = response.data.files;
        
        // Check if there is a default value set for the filename input field
        let defVal = '';
        const fileName = systemDiagnosticLogs.$formObj.form('get value', 'filename');
        if (fileName !== '') {
            defVal = fileName.trim();
        }

        // Build tree structure from files
        systemDiagnosticLogs.logsItems = systemDiagnosticLogs.buildTreeStructure(files, defVal);

        // Create values array for dropdown with all items (including folders)
        const dropdownValues = systemDiagnosticLogs.logsItems.map((item, index) => {
            if (item.type === 'folder') {
                return {
                    name: item.name.replace(/<[^>]*>/g, ''), // Remove HTML tags for search
                    value: '',
                    disabled: true
                };
            } else {
                return {
                    name: item.name.replace(/<[^>]*>/g, ''), // Remove HTML tags for search
                    value: item.value,
                    selected: item.selected
                };
            }
        });
        
        // Update dropdown with values
        systemDiagnosticLogs.$fileSelectDropDown.dropdown('setup menu', {
            values: dropdownValues
        });
        
        // Set the default selected value if any
        const selectedItem = systemDiagnosticLogs.logsItems.find(item => item.selected);
        if (selectedItem) {
            // Use setTimeout to ensure dropdown is fully initialized
            setTimeout(() => {
                systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', selectedItem.value);
                // Force refresh the dropdown to show the selected value
                systemDiagnosticLogs.$fileSelectDropDown.dropdown('refresh');
                // Also set the text to show full path
                systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', selectedItem.value);
                // Automatically load the log content when a file is pre-selected
                systemDiagnosticLogs.$formObj.form('set value', 'filename', selectedItem.value);
                systemDiagnosticLogs.updateLogFromServer();
            }, 100);
        } else if (defVal) {
            // If we have a default value but no item was marked as selected,
            // try to find and select it manually
            const itemToSelect = systemDiagnosticLogs.logsItems.find(item => 
                item.type === 'file' && item.value === defVal
            );
            if (itemToSelect) {
                setTimeout(() => {
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', itemToSelect.value);
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('refresh');
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', itemToSelect.value);
                    systemDiagnosticLogs.$formObj.form('set value', 'filename', itemToSelect.value);
                    systemDiagnosticLogs.updateLogFromServer();
                }, 100);
            } else {
                // Hide the dimmer after loading only if no file is selected
                systemDiagnosticLogs.$dimmer.removeClass('active');
            }
        } else {
            // Hide the dimmer after loading only if no file is selected
            systemDiagnosticLogs.$dimmer.removeClass('active');
        }
    },

    /**
     * Callback after changing the log file in the select dropdown.
     * @param {string} value - The selected value.
     */
    cbOnChangeFile(value) {
        if (value.length === 0) {
            return;
        }
        
        // Set dropdown text to show the full file path
        systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', value);
        
        systemDiagnosticLogs.$formObj.form('set value', 'filename', value);
        systemDiagnosticLogs.updateLogFromServer();
    },

    /**
     * Fetches the log file content from the server.
     */
    updateLogFromServer() {
        const params = systemDiagnosticLogs.$formObj.form('get values');
        SyslogAPI.getLogFromFile(params, systemDiagnosticLogs.cbUpdateLogText);
    },

    /**
     * Updates the log view.
     * @param {Object} response - The response from API.
     */
    cbUpdateLogText(response) {
        systemDiagnosticLogs.$dimmer.removeClass('active');

        // Handle v3 API response structure
        if (!response || !response.result) {
            if (response && response.messages) {
                UserMessage.showMultiString(response.messages);
            }
            return;
        }

        const content = response.data?.content || '';
        systemDiagnosticLogs.viewer.getSession().setValue(content);
        const row = systemDiagnosticLogs.viewer.session.getLength() - 1;
        const column = systemDiagnosticLogs.viewer.session.getLine(row).length; // or simply Infinity
        systemDiagnosticLogs.viewer.gotoLine(row + 1, column);
    },

    /**
     * Callback after clicking the "Download File" button.
     * @param {Object} response - The response data.
     */
    cbDownloadFile(response) {
        // Handle v3 API response structure
        if (response && response.result && response.data) {
            window.location = response.data.filename || response.data;
        } else if (response && response.messages) {
            UserMessage.showMultiString(response.messages);
        }
    },

    /**
     * Callback after clicking the "Erase File" button.
     */
    eraseCurrentFileContent(){
        const fileName = systemDiagnosticLogs.$formObj.form('get value', 'filename');
        if (fileName.length>0){
            SyslogAPI.eraseFile(fileName, systemDiagnosticLogs.cbAfterFileErased)
        }
    },

    /**
     * Callback after clicking the "Erase File" button and calling REST API command
     * @param {Object} response - The response data.
     */
    cbAfterFileErased(response){
        if (response.result===false && response.messages !== undefined) {
            UserMessage.showMultiString(response.messages);
        } else {
            systemDiagnosticLogs.updateLogFromServer();
        }
    },
};

// When the document is ready, initialize the show system logs tab
$(document).ready(() => {
    systemDiagnosticLogs.initialize();
});