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
/* global ace, PbxApi, SyslogAPI, updateLogViewWorker, Ace, UserMessage, SVGTimeline */

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
    $fileSelectDropDown: null,

    /**
     * Array of log items.
     * @type {Array}
     */
    logsItems: [],

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
     * Flag to prevent duplicate API calls during initialization
     * @type {boolean}
     */
    isInitializing: true,

    /**
     * Flag indicating if time slider mode is enabled
     * @type {boolean}
     */
    timeSliderEnabled: false,

    /**
     * Current time range for the selected log file
     * @type {object|null}
     */
    currentTimeRange: null,

    /**
     * Flag indicating if auto-update mode is active
     * @type {boolean}
     */
    isAutoUpdateActive: false,

    /**
     * Initializes the system diagnostic logs.
     */
    initialize() {
        const aceHeight = window.innerHeight - 250;

        // Set the minimum height of the log container
        systemDiagnosticLogs.$dimmer.closest('div').css('min-height', `${aceHeight}px`);

        // Create dropdown UI from hidden input (V5.0 pattern)
        systemDiagnosticLogs.createDropdownFromHiddenInput();

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

        // Initialize folder collapse/expand handlers (uses event delegation)
        systemDiagnosticLogs.initializeFolderHandlers();

        // Initialize the ACE editor for log content
        systemDiagnosticLogs.initializeAce();

        // Fetch the list of log files
        SyslogAPI.getLogsList(systemDiagnosticLogs.cbFormatDropdownResults);

        // Initialize log level dropdown - V5.0 pattern with DynamicDropdownBuilder
        systemDiagnosticLogs.initializeLogLevelDropdown();

        // Event listener for quick period buttons
        $(document).on('click', '.period-btn', (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const period = $btn.data('period');

            // Update active state
            $('.period-btn').removeClass('active');
            $btn.addClass('active');

            systemDiagnosticLogs.applyQuickPeriod(period);
        });

        // Event listener for "Now" button
        $(document).on('click', '.now-btn', (e) => {
            e.preventDefault();
            if (systemDiagnosticLogs.currentTimeRange) {
                const end = systemDiagnosticLogs.currentTimeRange.end;
                const oneHour = 3600;
                const start = Math.max(end - oneHour, systemDiagnosticLogs.currentTimeRange.start);
                SVGTimeline.setRange(start, end);
                systemDiagnosticLogs.loadLogByTimeRange(start, end);
                $('.period-btn').removeClass('active');
                $('.period-btn[data-period="3600"]').addClass('active');
            }
        });

        // Event listener for log level filter buttons
        $(document).on('click', '.level-btn', (e) => {
            e.preventDefault();
            const $btn = $(e.currentTarget);
            const level = $btn.data('level');

            // Update active state
            $('.level-btn').removeClass('active');
            $btn.addClass('active');

            systemDiagnosticLogs.applyLogLevelFilter(level);
        });

        // Event listener for "Show Log" button click (delegated)
        $(document).on('click', '#show-last-log', (e) => {
            e.preventDefault();
            systemDiagnosticLogs.updateLogFromServer();
        });

        // Listen for hash changes to update selected file
        $(window).on('hashchange', () => {
            systemDiagnosticLogs.handleHashChange();
        });

        // Event listener for "Download Log" button click (delegated)
        $(document).on('click', '#download-file', (e) => {
            e.preventDefault();
            const data = systemDiagnosticLogs.$formObj.form('get values');
            SyslogAPI.downloadLogFile(data.filename, true, systemDiagnosticLogs.cbDownloadFile);
        });

        // Event listener for "Auto Refresh" button click (delegated)
        $(document).on('click', '#show-last-log-auto', (e) => {
            e.preventDefault();
            const $button = $('#show-last-log-auto');
            const $reloadIcon = $button.find('.icons i.refresh');
            if ($reloadIcon.hasClass('loading')) {
                $reloadIcon.removeClass('loading');
                systemDiagnosticLogs.isAutoUpdateActive = false;
                updateLogViewWorker.stop();
            } else {
                $reloadIcon.addClass('loading');
                systemDiagnosticLogs.isAutoUpdateActive = true;
                updateLogViewWorker.initialize();
            }
        });

        // Event listener for the "Erase file" button click (delegated)
        $(document).on('click', '#erase-file', (e) => {
            e.preventDefault();
            systemDiagnosticLogs.eraseCurrentFileContent();
        });

        // Event listener for "Clear Filter" button click (delegated)
        $(document).on('click', '#clear-filter-btn', (e) => {
            e.preventDefault();
            systemDiagnosticLogs.$formObj.form('set value', 'filter', '');
            systemDiagnosticLogs.updateLogFromServer();
        });

        // Event listener for Enter keypress only on filter input field
        $(document).on('keyup', '#filter', (event) => {
            if (event.key === 'Enter') {
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
            let aceHeight = window.innerHeight - systemDiagnosticLogs.$logContent.offset().top - 55;
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
     * Initialize log level dropdown - V5.0 pattern with HTML icons
     * Static dropdown with colored icons and translations
     */
    initializeLogLevelDropdown() {
        const $hiddenInput = $('#logLevel');

        // Check if dropdown already exists
        if ($('#logLevel-dropdown').length) {
            return;
        }

        // Create dropdown HTML with colored icons
        const $dropdown = $('<div>', {
            id: 'logLevel-dropdown',
            class: 'ui selection dropdown'
        });

        const $text = $('<div>', { class: 'text' }).text(globalTranslate.sd_AllLevels);
        const $icon = $('<i>', { class: 'dropdown icon' });
        const $menu = $('<div>', { class: 'menu' });

        // Build menu items with colored icons
        const items = [
            { value: '', text: globalTranslate.sd_AllLevels, icon: '' },
            { value: 'ERROR', text: globalTranslate.sd_Error, icon: '<i class="exclamation circle red icon"></i>' },
            { value: 'WARNING', text: globalTranslate.sd_Warning, icon: '<i class="exclamation triangle orange icon"></i>' },
            { value: 'NOTICE', text: globalTranslate.sd_Notice, icon: '<i class="info circle blue icon"></i>' },
            { value: 'INFO', text: globalTranslate.sd_Info, icon: '<i class="circle grey icon"></i>' },
            { value: 'DEBUG', text: globalTranslate.sd_Debug, icon: '<i class="bug purple icon"></i>' }
        ];

        items.forEach(item => {
            const $item = $('<div>', {
                class: 'item',
                'data-value': item.value
            }).html(item.icon + item.text);
            $menu.append($item);
        });

        $dropdown.append($text, $icon, $menu);
        $hiddenInput.after($dropdown);

        // Initialize Semantic UI dropdown
        $dropdown.dropdown({
            onChange: (value) => {
                $hiddenInput.val(value).trigger('change');
                systemDiagnosticLogs.updateLogFromServer();
            }
        });
    },

    /**
     * Creates dropdown UI element from hidden input field (V5.0 pattern)
     */
    createDropdownFromHiddenInput() {
        const $hiddenInput = $('#filenames');

        if (!$hiddenInput.length) {
            console.error('Hidden input #filenames not found');
            return;
        }

        const $dropdown = $('<div>', {
            id: 'filenames-dropdown',
            class: 'ui search selection dropdown filenames-select fluid'
        });

        $dropdown.append(
            $('<i>', { class: 'dropdown icon' }),
            $('<input>', { type: 'text', class: 'search', tabindex: 0 }),
            $('<div>', { class: 'default text' }).text('Select log file'),
            $('<div>', { class: 'menu' })
        );

        $hiddenInput.before($dropdown);
        $hiddenInput.hide();

        systemDiagnosticLogs.$fileSelectDropDown = $dropdown;
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
     * @param {string} parentFolder - Parent folder name for grouping
     * @returns {Array} Formatted dropdown items
     */
    treeToDropdownItems(tree, prefix, parentFolder = '') {
        const items = [];

        // Sort entries: folders first, then files
        const entries = Object.entries(tree).sort(([aKey, aVal], [bKey, bVal]) => {
            if (aVal.type === 'folder' && bVal.type === 'file') return -1;
            if (aVal.type === 'file' && bVal.type === 'folder') return 1;
            return aKey.localeCompare(bKey);
        });

        entries.forEach(([key, value]) => {
            if (value.type === 'folder') {
                // Add folder header with toggle capability
                items.push({
                    name: `<i class="caret down icon folder-toggle"></i><i class="folder icon"></i> ${key}`,
                    value: '',
                    disabled: true,
                    type: 'folder',
                    folderName: key
                });

                // Add children with increased indentation and parent folder reference
                const childItems = this.treeToDropdownItems(value.children, prefix + '&nbsp;&nbsp;&nbsp;&nbsp;', key);
                items.push(...childItems);
            } else {
                // Add file item with parent folder reference
                items.push({
                    name: `${prefix}<i class="file outline icon"></i> ${key} (${value.size})`,
                    value: value.path,
                    selected: value.default,
                    type: 'file',
                    parentFolder: parentFolder
                });
            }
        });

        return items;
    },
    
    /**
     * Creates custom dropdown menu HTML for log files with collapsible folders
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
                    // Folder item - clickable header for collapse/expand
                    // Not using 'disabled' class as it blocks pointer events
                    html += `<div class="folder-header item" data-folder="${item.folderName}" data-value="" style="pointer-events: auto !important; cursor: pointer; font-weight: bold; background: #f9f9f9;">${item.name}</div>`;
                } else {
                    // File item with parent folder reference for collapse
                    const selected = item.selected ? 'selected active' : '';
                    const parentAttr = item.parentFolder ? `data-parent="${item.parentFolder}"` : '';
                    html += `<div class="item file-item ${selected}" data-value="${option[fields.value]}" ${parentAttr}>${item.name}</div>`;
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
     * Initializes folder collapse/expand handlers and search behavior
     */
    initializeFolderHandlers() {
        const $dropdown = systemDiagnosticLogs.$fileSelectDropDown;

        // Handle folder header clicks for collapse/expand
        // Use document-level handler with capture phase to intercept before Fomantic
        document.addEventListener('click', (e) => {
            // Check if click is inside our dropdown's folder-header
            const folderHeader = e.target.closest('#filenames-dropdown .folder-header');
            if (!folderHeader) return;

            e.stopImmediatePropagation();
            e.preventDefault();

            const $folder = $(folderHeader);
            const folderName = $folder.data('folder');
            const $toggle = $folder.find('.folder-toggle');
            const $menu = $dropdown.find('.menu');
            const $files = $menu.find(`.file-item[data-parent="${folderName}"]`);

            // Toggle folder state
            const isCollapsed = $toggle.hasClass('right');

            if (isCollapsed) {
                // Expand folder
                $toggle.removeClass('right').addClass('down');
                $files.show();
            } else {
                // Collapse folder
                $toggle.removeClass('down').addClass('right');
                $files.hide();
            }
        }, true); // capture phase - fires before bubbling

        // Handle search input - show all items when searching
        $dropdown.on('input', 'input.search', (e) => {
            const searchValue = $(e.target).val().trim();
            const $menu = $dropdown.find('.menu');

            if (searchValue.length > 0) {
                // Show all items and expand all folders during search
                $menu.find('.file-item').show();
                $menu.find('.folder-toggle').removeClass('right').addClass('down');
            } else {
                // Restore collapsed state when search is cleared
                $menu.find('.folder-header').each((_, folder) => {
                    const $folder = $(folder);
                    const folderName = $folder.data('folder');
                    const isCollapsed = $folder.find('.folder-toggle').hasClass('right');
                    if (isCollapsed) {
                        $menu.find(`.file-item[data-parent="${folderName}"]`).hide();
                    }
                });
            }
        });
    },

    /**
     * Expands the folder containing the specified file
     * @param {string} filePath - The file path to find and expand its parent folder
     */
    expandFolderForFile(filePath) {
        if (!filePath) return;

        const $menu = systemDiagnosticLogs.$fileSelectDropDown.find('.menu');
        const $fileItem = $menu.find(`.file-item[data-value="${filePath}"]`);

        if ($fileItem.length) {
            const parentFolder = $fileItem.data('parent');
            if (parentFolder) {
                const $folder = $menu.find(`.folder-header[data-folder="${parentFolder}"]`);
                const $toggle = $folder.find('.folder-toggle');

                // Expand if collapsed
                if ($toggle.hasClass('right')) {
                    $toggle.removeClass('right').addClass('down');
                    $menu.find(`.file-item[data-parent="${parentFolder}"]`).show();
                }
            }
        }
    },

    /**
     * Handles hash changes to update the selected file
     */
    handleHashChange() {
        // Skip during initialization to prevent duplicate API calls
        if (systemDiagnosticLogs.isInitializing) {
            return;
        }

        const hash = window.location.hash;
        if (hash && hash.startsWith('#file=')) {
            const filePath = decodeURIComponent(hash.substring(6));
            if (filePath && systemDiagnosticLogs.$fileSelectDropDown.dropdown('get value') !== filePath) {
                // Check if the file exists in dropdown items
                const fileExists = systemDiagnosticLogs.logsItems.some(item =>
                    item.type === 'file' && item.value === filePath
                );
                if (fileExists) {
                    // Expand parent folder before selecting file
                    systemDiagnosticLogs.expandFolderForFile(filePath);
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', filePath);
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', filePath);
                    systemDiagnosticLogs.$formObj.form('set value', 'filename', filePath);
                    systemDiagnosticLogs.updateLogFromServer();
                }
            }
        }
    },

    /**
     * Gets the file path from URL hash if present
     */
    getFileFromHash() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#file=')) {
            return decodeURIComponent(hash.substring(6));
        }
        return '';
    },

    /**
     * Callback function to format the dropdown menu structure based on the response.
     * @param {Object} response - The response data.
     */
    cbFormatDropdownResults(response) {
        // Check if response is valid
        if (!response || !response.result || !response.data || !response.data.files) {
            // Hide dimmer only if not in auto-update mode
            if (!systemDiagnosticLogs.isAutoUpdateActive) {
                systemDiagnosticLogs.$dimmer.removeClass('active');
            }
            return;
        }

        const files = response.data.files;

        // Check for file from hash first
        let defVal = systemDiagnosticLogs.getFileFromHash();

        // If no hash value, check if there is a default value set for the filename input field
        if (!defVal) {
            const fileName = systemDiagnosticLogs.$formObj.form('get value', 'filename');
            if (fileName !== '') {
                defVal = fileName.trim();
            }
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
                // Expand parent folder before selecting file
                systemDiagnosticLogs.expandFolderForFile(selectedItem.value);
                // Setting selected value will trigger onChange callback which calls updateLogFromServer()
                systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', selectedItem.value);
                // Force refresh the dropdown to show the selected value
                systemDiagnosticLogs.$fileSelectDropDown.dropdown('refresh');
                // Also set the text to show full path
                systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', selectedItem.value);
                systemDiagnosticLogs.$formObj.form('set value', 'filename', selectedItem.value);
            }, 100);
        } else if (defVal) {
            // If we have a default value but no item was marked as selected,
            // try to find and select it manually
            const itemToSelect = systemDiagnosticLogs.logsItems.find(item =>
                item.type === 'file' && item.value === defVal
            );
            if (itemToSelect) {
                setTimeout(() => {
                    // Expand parent folder before selecting file
                    systemDiagnosticLogs.expandFolderForFile(itemToSelect.value);
                    // Setting selected value will trigger onChange callback which calls updateLogFromServer()
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', itemToSelect.value);
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('refresh');
                    systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', itemToSelect.value);
                    systemDiagnosticLogs.$formObj.form('set value', 'filename', itemToSelect.value);
                }, 100);
            } else {
                // Hide the dimmer after loading only if no file is selected
                if (!systemDiagnosticLogs.isAutoUpdateActive) {
                    systemDiagnosticLogs.$dimmer.removeClass('active');
                }
            }
        } else {
            // Hide the dimmer after loading only if no file is selected
            if (!systemDiagnosticLogs.isAutoUpdateActive) {
                systemDiagnosticLogs.$dimmer.removeClass('active');
            }
        }

        // Mark initialization as complete to allow hashchange handler to work
        setTimeout(() => {
            systemDiagnosticLogs.isInitializing = false;
        }, 200);
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

        // Update URL hash with the selected file
        window.location.hash = 'file=' + encodeURIComponent(value);

        // Reset filters only if user manually changed the file (not during initialization)
        if (!systemDiagnosticLogs.isInitializing) {
            systemDiagnosticLogs.resetFilters();
        }

        // Hide auto-refresh button for rotated log files (they don't change)
        systemDiagnosticLogs.updateAutoRefreshVisibility(value);

        // Check if time range is available for this file
        systemDiagnosticLogs.checkTimeRangeAvailability(value);
    },

    /**
     * Check if file is a rotated log file (archived, no longer being written to)
     * Rotated files have suffixes like: .0, .1, .2, .gz, .1.gz, .2.gz, etc.
     * @param {string} filename - Log file path
     * @returns {boolean} True if file is rotated/archived
     */
    isRotatedLogFile(filename) {
        if (!filename) {
            return false;
        }
        // Match patterns: .0, .1, .2, ..., .gz, .0.gz, .1.gz, etc.
        return /\.\d+($|\.gz$)|\.gz$/.test(filename);
    },

    /**
     * Update auto-refresh button visibility based on file type
     * Hide for rotated files, show for active log files
     * @param {string} filename - Log file path
     */
    updateAutoRefreshVisibility(filename) {
        const $autoBtn = $('#show-last-log-auto');
        const isRotated = systemDiagnosticLogs.isRotatedLogFile(filename);

        if (isRotated) {
            // Stop auto-refresh if it was active
            if (systemDiagnosticLogs.isAutoUpdateActive) {
                $autoBtn.find('.icons i.refresh').removeClass('loading');
                systemDiagnosticLogs.isAutoUpdateActive = false;
                updateLogViewWorker.stop();
            }
            $autoBtn.hide();
        } else {
            $autoBtn.show();
        }
    },

    /**
     * Reset all filters when changing log files
     */
    resetFilters() {
        // Deactivate all quick-period buttons
        $('.period-btn').removeClass('active');

        // Reset logLevel dropdown to default (All Levels - empty value)
        $('#logLevel-dropdown').dropdown('set selected', '');
        systemDiagnosticLogs.$formObj.form('set value', 'logLevel', '');

        // Clear filter input field
        systemDiagnosticLogs.$formObj.form('set value', 'filter', '');
    },

    /**
     * Update period buttons visibility based on log file duration
     * Shows only buttons for periods that are <= log file duration
     * Hides entire container if no buttons are visible
     * @param {number} logDuration - Log file duration in seconds
     */
    updatePeriodButtonsVisibility(logDuration) {
        const $periodButtons = $('.period-btn');
        const $periodContainer = $('#period-buttons');
        let largestVisiblePeriod = 0;
        let $largestVisibleButton = null;
        let visibleCount = 0;

        $periodButtons.each((index, button) => {
            const $button = $(button);
            const period = parseInt($button.data('period'), 10);

            // Show button if period is less than or equal to log duration
            // Add 10% tolerance for rounding/edge cases
            if (period <= logDuration * 1.1) {
                $button.show();
                visibleCount++;
                // Track the largest visible period for default selection
                if (period > largestVisiblePeriod) {
                    largestVisiblePeriod = period;
                    $largestVisibleButton = $button;
                }
            } else {
                $button.hide();
            }
        });

        // Hide entire container if no buttons are visible
        // Also toggle class on parent to remove gap for proper alignment
        const $timeControlsInline = $('.time-controls-inline');
        if (visibleCount === 0) {
            $periodContainer.hide();
            $timeControlsInline.addClass('no-period-buttons');
        } else {
            $periodContainer.show();
            $timeControlsInline.removeClass('no-period-buttons');
        }

        // Set largest visible button as active (if no button is currently active)
        if ($largestVisibleButton && !$periodButtons.filter('.active').is(':visible')) {
            $periodButtons.removeClass('active');
            $largestVisibleButton.addClass('active');
        }
    },

    /**
     * Check if time range is available for the selected log file
     * @param {string} filename - Log file path
     */
    checkTimeRangeAvailability(filename) {
        // Show dimmer only if not in auto-update mode
        if (!systemDiagnosticLogs.isAutoUpdateActive) {
            systemDiagnosticLogs.$dimmer.addClass('active');
        }

        try {
            // Try to get time range for this file
            SyslogAPI.getLogTimeRange(filename, (response) => {
                if (response && response.result && response.data && response.data.time_range) {
                    // Time range is available - use time-based navigation
                    systemDiagnosticLogs.initializeNavigation(response.data);
                } else {
                    // Time range not available - use line number fallback
                    systemDiagnosticLogs.initializeNavigation(null);
                }
            });
        } catch (error) {
            console.error('Error checking time range:', error);
            // Fallback to line number mode
            systemDiagnosticLogs.initializeNavigation(null);
        }
    },

    /**
     * Initialize universal navigation with time or line number mode
     * @param {object} timeRangeData - Time range data from API (optional)
     */
    initializeNavigation(timeRangeData) {
        // Check if we have valid time range with actual timestamps (not null)
        const hasValidTimeRange = timeRangeData &&
            timeRangeData.time_range &&
            typeof timeRangeData.time_range.start === 'number' &&
            typeof timeRangeData.time_range.end === 'number';

        // Check if time range is meaningful (more than 1 second of data)
        const hasMultipleTimestamps = hasValidTimeRange &&
            (timeRangeData.time_range.end - timeRangeData.time_range.start) > 1;

        if (hasValidTimeRange && hasMultipleTimestamps) {
            // Time-based mode
            this.timeSliderEnabled = true;
            this.currentTimeRange = timeRangeData.time_range;

            // Calculate log file duration and update period buttons visibility
            const logDuration = this.currentTimeRange.end - this.currentTimeRange.start;
            this.updatePeriodButtonsVisibility(logDuration);

            // Show period buttons for time-based navigation
            $('#period-buttons').show();

            // Set server timezone offset
            if (timeRangeData.server_timezone_offset !== undefined) {
                SVGTimeline.serverTimezoneOffset = timeRangeData.server_timezone_offset;
            }

            // Initialize SVG timeline with time range
            SVGTimeline.initialize('#time-slider-container', this.currentTimeRange);

            // Set callback for time window changes
            // Always use latest=true so the most recent log entries are displayed
            // Truncation (if any) happens on the left side, which is less disruptive
            SVGTimeline.onRangeChange = (start, end, draggedHandle) => {
                systemDiagnosticLogs.loadLogByTimeRange(start, end, true);
            };

            // Set callback for truncated zone clicks
            // Left zones (timeline-truncated-left): data was cut from beginning, load with latest=true
            // Right zones (timeline-truncated-right): data was cut from end, load with latest=false
            SVGTimeline.onTruncatedZoneClick = (start, end, isLeftZone) => {
                systemDiagnosticLogs.loadLogByTimeRange(start, end, isLeftZone);
            };

            // Load initial chunk with latest=true to show newest entries
            // Pass isInitialLoad=true to suppress truncated zone display on first load
            // Use the largest visible period button or 1 hour as fallback
            const $activeButton = $('.period-btn.active:visible');
            const initialPeriod = $activeButton.length > 0
                ? parseInt($activeButton.data('period'), 10)
                : Math.min(3600, logDuration);
            const initialStart = Math.max(this.currentTimeRange.end - initialPeriod, this.currentTimeRange.start);
            this.loadLogByTimeRange(initialStart, this.currentTimeRange.end, true, true);
        } else {
            // Line number fallback mode
            this.timeSliderEnabled = false;
            this.currentTimeRange = null;

            // Hide period buttons in line number mode
            $('#period-buttons').hide();

            // Initialize SVG timeline with line numbers
            // For now, use default range until we get total line count
            const lineRange = { start: 0, end: 10000 };
            SVGTimeline.initialize('#time-slider-container', lineRange, 'lines');

            // Set callback for line range changes
            SVGTimeline.onRangeChange = (start, end) => {
                // Load by line numbers (offset/lines)
                systemDiagnosticLogs.loadLogByLines(Math.floor(start), Math.ceil(end - start));
            };

            // Load initial lines
            this.updateLogFromServer();
        }
    },

    /**
     * Load log by line numbers (for files without timestamps)
     * @param {number} offset - Starting line number
     * @param {number} lines - Number of lines to load
     */
    loadLogByLines(offset, lines) {
        // Show dimmer only if not in auto-update mode
        if (!systemDiagnosticLogs.isAutoUpdateActive) {
            systemDiagnosticLogs.$dimmer.addClass('active');
        }

        const params = {
            filename: this.$formObj.form('get value', 'filename'),
            filter: this.$formObj.form('get value', 'filter') || '',
            logLevel: this.$formObj.form('get value', 'logLevel') || '',
            offset: Math.max(0, offset),
            lines: Math.min(5000, Math.max(100, lines))
        };

        SyslogAPI.getLogFromFile(params, (response) => {
            // Hide dimmer only if not in auto-update mode
            if (!systemDiagnosticLogs.isAutoUpdateActive) {
                systemDiagnosticLogs.$dimmer.removeClass('active');
            }
            if (response && response.result && response.data && 'content' in response.data) {
                // Set content in editor (even if empty)
                this.viewer.setValue(response.data.content || '', -1);

                // Go to the beginning
                this.viewer.gotoLine(1);
                this.viewer.scrollToLine(0, true, true, () => {});
            }
        });
    },

    /**
     * Load log by time range
     * @param {number} startTimestamp - Start timestamp
     * @param {number} endTimestamp - End timestamp
     * @param {boolean} latest - If true, return newest lines first (for initial load)
     * @param {boolean} isInitialLoad - If true, suppress truncated zone display
     * @param {boolean} isAutoUpdate - If true, skip timeline recalculation (only update content)
     */
    loadLogByTimeRange(startTimestamp, endTimestamp, latest = false, isInitialLoad = false, isAutoUpdate = false) {
        // Show dimmer only if not in auto-update mode
        if (!systemDiagnosticLogs.isAutoUpdateActive) {
            systemDiagnosticLogs.$dimmer.addClass('active');
        }

        const params = {
            filename: this.$formObj.form('get value', 'filename'),
            filter: this.$formObj.form('get value', 'filter') || '',
            logLevel: this.$formObj.form('get value', 'logLevel') || '',
            dateFrom: startTimestamp,
            dateTo: endTimestamp,
            lines: 5000, // Maximum lines to load
            latest: latest // If true, return newest lines (tail | tac)
        };

        try {
            SyslogAPI.getLogFromFile(params, (response) => {
                if (response && response.result && response.data && 'content' in response.data) {
                    const newContent = response.data.content || '';

                    if (isAutoUpdate && newContent.length > 0) {
                        // Auto-update mode: append only new lines
                        const currentContent = this.viewer.getValue();
                        const newLines = this.findNewLines(currentContent, newContent);

                        if (newLines.length > 0) {
                            // Append new lines at the end
                            const session = this.viewer.session;
                            const lastRow = session.getLength();
                            session.insert({ row: lastRow, column: 0 }, '\n' + newLines.join('\n'));

                            // Go to the last line to follow new entries
                            const finalRow = session.getLength() - 1;
                            const finalColumn = session.getLine(finalRow).length;
                            this.viewer.gotoLine(finalRow + 1, finalColumn);
                        }
                    } else {
                        // Normal mode: set content and go to end
                        this.viewer.setValue(newContent, -1);

                        // Go to the end of the log
                        const row = this.viewer.session.getLength() - 1;
                        const column = this.viewer.session.getLine(row).length;
                        this.viewer.gotoLine(row + 1, column);
                    }

                    // Adjust slider to actual loaded time range (silently)
                    if (response.data.actual_range) {
                        const actual = response.data.actual_range;

                        // Always update fullRange boundary based on actual data from server
                        // This ensures no-data zones display correctly after refresh
                        if (actual.end) {
                            SVGTimeline.updateDataBoundary(actual.end);
                        }

                        // Always update timeline with server response (except during auto-update)
                        // updateFromServerResponse() handles:
                        // - Updating selectedRange to actual data boundaries
                        // - Preserving visibleRange.end if it was extended to current time (for no-data zones)
                        // - Managing truncation zones display
                        if (!isAutoUpdate) {
                            SVGTimeline.updateFromServerResponse(actual, startTimestamp, endTimestamp, isInitialLoad);
                        }
                    }
                }

                // Hide dimmer only if not in auto-update mode
                if (!systemDiagnosticLogs.isAutoUpdateActive) {
                    systemDiagnosticLogs.$dimmer.removeClass('active');
                }
            });
        } catch (error) {
            console.error('Error loading log by time range:', error);
            // Hide dimmer only if not in auto-update mode
            if (!systemDiagnosticLogs.isAutoUpdateActive) {
                systemDiagnosticLogs.$dimmer.removeClass('active');
            }
        }
    },

    /**
     * Apply quick period selection (Yandex Cloud LogViewer style)
     * @param {number} periodSeconds - Period in seconds
     */
    applyQuickPeriod(periodSeconds) {
        if (!this.currentTimeRange) {
            return;
        }

        // Use new applyPeriod method that handles visible range and auto-centering
        SVGTimeline.applyPeriod(periodSeconds);
        // Callback will be triggered automatically by SVGTimeline
    },

    /**
     * Apply log level filter
     * @param {string} level - Log level (all, error, warning, info, debug)
     */
    applyLogLevelFilter(level) {
        let filterPattern = '';

        // Create regex pattern based on level
        switch (level) {
            case 'error':
                filterPattern = 'ERROR|CRITICAL|FATAL';
                break;
            case 'warning':
                filterPattern = 'WARNING|WARN';
                break;
            case 'info':
                filterPattern = 'INFO';
                break;
            case 'debug':
                filterPattern = 'DEBUG';
                break;
            case 'all':
            default:
                filterPattern = '';
                break;
        }

        // Update filter field
        this.$formObj.form('set value', 'filter', filterPattern);

        // Reload logs with new filter
        this.updateLogFromServer();
    },

    /**
     * Fetches the log file content from the server.
     */
    updateLogFromServer() {
        if (this.timeSliderEnabled) {
            // In time slider mode, reload current window
            if (this.currentTimeRange) {
                const oneHour = 3600;

                // Get current filename to check if it's a rotated log file
                const filename = this.$formObj.form('get value', 'filename');
                const isRotated = this.isRotatedLogFile(filename);

                let endTimestamp;
                let startTimestamp;

                if (isRotated) {
                    // For rotated files: use the file's actual time range
                    // Rotated files don't receive new data, so currentTimeRange is fixed
                    endTimestamp = this.currentTimeRange.end;
                    startTimestamp = Math.max(this.currentTimeRange.end - oneHour, this.currentTimeRange.start);
                } else {
                    // For active log files: use current time to capture new entries
                    endTimestamp = Math.floor(Date.now() / 1000);
                    startTimestamp = endTimestamp - oneHour;

                    // Update currentTimeRange.end to reflect new data availability
                    this.currentTimeRange.end = endTimestamp;

                    // FORCE update the SVG timeline visible range to current time
                    // force=true ensures visibleRange.end is set even if it was already >= endTimestamp
                    // This handles timezone differences where server time might appear "in the future"
                    SVGTimeline.extendRange(endTimestamp, true);
                }

                // Use latest=true to show newest entries (for show-last-log / auto-update buttons)
                // Pass isAutoUpdate=true when auto-refresh is active to prevent timeline flickering
                this.loadLogByTimeRange(startTimestamp, endTimestamp, true, false, this.isAutoUpdateActive);
            }
        } else {
            // Line number mode
            const params = systemDiagnosticLogs.$formObj.form('get values');
            params.lines = 5000; // Max lines
            SyslogAPI.getLogFromFile(params, systemDiagnosticLogs.cbUpdateLogText);
        }
    },

    /**
     * Find new lines that are not in current content
     * Compares last lines of current content with new content to find overlap
     * @param {string} currentContent - Current editor content
     * @param {string} newContent - New content from server
     * @returns {Array} Array of new lines to append
     */
    findNewLines(currentContent, newContent) {
        if (!currentContent || currentContent.trim().length === 0) {
            // If editor is empty, all lines are new
            return newContent.split('\n').filter(line => line.trim().length > 0);
        }

        const currentLines = currentContent.split('\n');
        const newLines = newContent.split('\n');

        // Get last non-empty line from current content as anchor
        let anchorLine = '';
        for (let i = currentLines.length - 1; i >= 0; i--) {
            if (currentLines[i].trim().length > 0) {
                anchorLine = currentLines[i];
                break;
            }
        }

        if (!anchorLine) {
            return newLines.filter(line => line.trim().length > 0);
        }

        // Find anchor line in new content
        let anchorIndex = -1;
        for (let i = newLines.length - 1; i >= 0; i--) {
            if (newLines[i] === anchorLine) {
                anchorIndex = i;
                break;
            }
        }

        if (anchorIndex === -1) {
            // Anchor not found - content changed significantly, return empty
            // This prevents duplicates when log rotates or filter changes
            return [];
        }

        // Return lines after anchor
        const result = newLines.slice(anchorIndex + 1).filter(line => line.trim().length > 0);
        return result;
    },

    /**
     * Updates the log view.
     * @param {Object} response - The response from API.
     */
    cbUpdateLogText(response) {
        // Hide dimmer only if not in auto-update mode
        if (!systemDiagnosticLogs.isAutoUpdateActive) {
            systemDiagnosticLogs.$dimmer.removeClass('active');
        }

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
        const column = systemDiagnosticLogs.viewer.session.getLine(row).length;
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