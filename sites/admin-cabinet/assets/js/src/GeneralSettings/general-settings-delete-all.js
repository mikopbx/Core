/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, PbxApi, UserMessage, EventBus, Form, SystemAPI */

/**
 * Module for handling the "Delete All Settings" functionality
 * Manages the confirmation modal and statistics display
 */
const generalSettingsDeleteAll = {
    
    /**
     * jQuery objects - will be initialized in initialize()
     */
    $deleteAllModal: null,
    $statisticsContent: null,
    $deleteAllInput: null,
    
    /**
     * Async channel ID for WebSocket events
     */
    asyncChannelId: null,
    
    /**
     * Initialize the module
     */
    initialize() {
        // Generate unique channel ID for this session
        generalSettingsDeleteAll.asyncChannelId = `delete-all-${Date.now()}`;
        
        // Subscribe to WebSocket events
        EventBus.subscribe(generalSettingsDeleteAll.asyncChannelId, data => {
            generalSettingsDeleteAll.processDeleteProgress(data);
        });
        
        // Initialize jQuery objects when DOM is ready
        generalSettingsDeleteAll.$deleteAllModal = $('#delete-all-modal');
        generalSettingsDeleteAll.$statisticsContent = $('#delete-statistics-content');
        generalSettingsDeleteAll.$deleteAllInput = $('input[name="deleteAllInput"]');
        
        // Initialize modal settings
        generalSettingsDeleteAll.initializeModal();
        
        // Watch for input changes
        generalSettingsDeleteAll.initializeInputWatcher();
    },
    
    /**
     * Initialize the delete confirmation modal
     */
    initializeModal() {
        if (generalSettingsDeleteAll.$deleteAllModal && generalSettingsDeleteAll.$deleteAllModal.length > 0) {
            generalSettingsDeleteAll.$deleteAllModal.modal({
                closable: false,
                onShow: () => {
                    // Load statistics when modal is shown
                    generalSettingsDeleteAll.loadDeleteStatistics();
                },
                onApprove: () => {
                    // Show loading state in modal
                    generalSettingsDeleteAll.showDeletingProgress();
                    
                    // When user confirms deletion - pass async channel ID
                    SystemAPI.restoreDefault({asyncChannelId: generalSettingsDeleteAll.asyncChannelId}, generalSettingsDeleteAll.cbAfterRestoreDefaultSettings);
                    
                    // Return false to prevent automatic modal closing
                    return false;
                },
                onDeny: () => {
                    // When user cancels - mark form as changed to keep save button active
                    Form.dataChanged();
                }
            });
        }
    },
    
    /**
     * Check if the delete phrase was entered correctly and show modal
     * @returns {boolean} - true if phrase matches, false otherwise
     */
    checkDeleteConditions() {
        // Get the value of 'deleteAllInput' field and trim spaces
        const deleteAllInput = generalSettingsDeleteAll.$deleteAllInput.val().trim();
        
        // Check if the entered phrase matches the required phrase
        if (deleteAllInput === globalTranslate.gs_EnterDeleteAllPhrase) {
            generalSettingsDeleteAll.showDeleteConfirmationModal();
            return true;
        }
        
        return false;
    },
    
    /**
     * Show the delete confirmation modal with statistics
     */
    showDeleteConfirmationModal() {
        if (generalSettingsDeleteAll.$deleteAllModal && generalSettingsDeleteAll.$deleteAllModal.length > 0) {
            generalSettingsDeleteAll.$deleteAllModal.modal('show');
        }
    },
    
    /**
     * Load and display deletion statistics in the modal
     */
    loadDeleteStatistics() {
        const $statisticsContent = generalSettingsDeleteAll.$statisticsContent;
        
        // Show loading state
        $statisticsContent.html(`
            <div class="ui segment">
                <div class="ui active centered inline loader"></div>
                <p class="center aligned">${globalTranslate.gs_LoadingStatistics}</p>
            </div>
        `);
        
        // Get statistics from API
        SystemAPI.getDeleteStatistics((response) => {
            // Check for API errors
            if (!response || response.result === false) {
                // Show error if statistics couldn't be loaded
                $statisticsContent.html(`
                    <div class="ui segment">
                        <div class="ui error message">
                            <i class="exclamation triangle icon"></i>
                            ${globalTranslate.gs_ErrorLoadingStatistics}
                        </div>
                    </div>
                `);
                return;
            }

            // Extract data from response
            const data = response.data || {};

            // Build statistics HTML
            let statisticsHtml = '';

            // Users and extensions
            if (data.users > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'users',
                    globalTranslate.gs_StatUsers,
                    data.extensions || data.users,
                    'user icon'
                );
            }

            // Providers
            if (data.providers > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'providers',
                    globalTranslate.gs_StatProviders,
                    data.providers,
                    'server icon'
                );
            }

            // Call queues
            if (data.callQueues > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'queues',
                    globalTranslate.gs_StatCallQueues,
                    data.callQueues,
                    'users icon'
                );
            }

            // IVR Menus
            if (data.ivrMenus > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'ivr',
                    globalTranslate.gs_StatIvrMenus,
                    data.ivrMenus,
                    'sitemap icon'
                );
            }

            // Conference rooms
            if (data.conferenceRooms > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'conferences',
                    globalTranslate.gs_StatConferenceRooms,
                    data.conferenceRooms,
                    'video icon'
                );
            }

            // Dialplan applications
            if (data.dialplanApplications > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'dialplan',
                    globalTranslate.gs_StatDialplanApplications,
                    data.dialplanApplications,
                    'code icon'
                );
            }

            // Sound files
            if (data.customSoundFiles > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'sounds',
                    globalTranslate.gs_StatSoundFiles,
                    data.customSoundFiles,
                    'music icon'
                );
            }

            // MOH (Music On Hold) files
            if (data.mohFiles > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'moh',
                    globalTranslate.gs_StatMohFiles,
                    data.mohFiles,
                    'volume up icon'
                );
            }

            // Routes
            const totalRoutes = (data.incomingRoutes || 0) + (data.outgoingRoutes || 0);
            if (totalRoutes > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'routes',
                    globalTranslate.gs_StatRoutes,
                    totalRoutes,
                    'random icon'
                );
            }

            // Firewall rules
            if (data.firewallRules > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'firewall',
                    globalTranslate.gs_StatFirewallRules,
                    data.firewallRules,
                    'shield icon'
                );
            }

            // Modules
            if (data.modules > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'modules',
                    globalTranslate.gs_StatModules,
                    data.modules,
                    'puzzle piece icon'
                );
            }

            // Call history
            if (data.callHistory > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'cdr',
                    globalTranslate.gs_StatCallHistory,
                    data.callHistory.toLocaleString(),
                    'history icon'
                );
            }

            // Call recordings
            if (data.callRecordings > 0) {
                const sizeStr = generalSettingsDeleteAll.formatBytes(data.callRecordingsSize || 0);
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'recordings',
                    globalTranslate.gs_StatCallRecordings,
                    `${data.callRecordings.toLocaleString()} (${sizeStr})`,
                    'microphone icon'
                );
            }

            // Backups
            if (data.backups > 0) {
                const sizeStr = generalSettingsDeleteAll.formatBytes(data.backupsSize || 0);
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'backups',
                    globalTranslate.gs_StatBackups,
                    `${data.backups} (${sizeStr})`,
                    'archive icon'
                );
            }

            // Custom files
            if (data.customFiles > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'custom',
                    globalTranslate.gs_StatCustomFiles,
                    data.customFiles,
                    'file icon'
                );
            }

            // Out-of-Work Time conditions
            if (data.outWorkTimes > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'outWorkTimes',
                    globalTranslate.gs_StatOutWorkTimes,
                    data.outWorkTimes,
                    'clock outline icon'
                );
            }

            // Out-of-Work Time route associations
            if (data.outWorkTimesRouts > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'outWorkTimesRouts',
                    globalTranslate.gs_StatOutWorkTimesRouts,
                    data.outWorkTimesRouts,
                    'linkify icon'
                );
            }

            // REST API Keys
            if (data.apiKeys > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'apiKeys',
                    globalTranslate.gs_StatApiKeys,
                    data.apiKeys,
                    'key icon'
                );
            }

            // Asterisk REST Interface (ARI) Users
            if (data.asteriskRestUsers > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'asteriskRestUsers',
                    globalTranslate.gs_StatAsteriskRestUsers,
                    data.asteriskRestUsers,
                    'plug icon'
                );
            }

            // WebAuthn Passkeys
            if (data.userPasskeys > 0) {
                statisticsHtml += generalSettingsDeleteAll.createStatisticItem(
                    'userPasskeys',
                    globalTranslate.gs_StatUserPasskeys,
                    data.userPasskeys,
                    'fingerprint icon'
                );
            }

            // If no data will be deleted
            if (statisticsHtml === '') {
                statisticsHtml = `
                    <div class="ui segment">
                        <div class="ui info message">
                            <i class="info circle icon"></i>
                            ${globalTranslate.gs_NoDataToDelete}
                        </div>
                    </div>
                `;
            }

            // Update modal content
            $statisticsContent.html(statisticsHtml);
        });
    },
    
    /**
     * Create a statistic item HTML
     * @param {string} id - Item identifier
     * @param {string} label - Display label
     * @param {string|number} value - Display value
     * @param {string} icon - Icon class
     * @returns {string} HTML string
     */
    createStatisticItem(id, label, value, icon) {
        return `
            <div class="ui segment">
                <div class="ui two column grid">
                    <div class="column">
                        <i class="${icon}"></i> ${label}
                    </div>
                    <div class="right aligned column">
                        <strong>${value}</strong>
                    </div>
                </div>
            </div>
        `;
    },
    
    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted string
     */
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },
    
    /**
     * Show deleting progress in modal
     */
    showDeletingProgress() {
        const $content = generalSettingsDeleteAll.$deleteAllModal.find('.content');
        const $actions = generalSettingsDeleteAll.$deleteAllModal.find('.actions');

        // Hide action buttons initially
        $actions.hide();

        // Set initial stage
        generalSettingsDeleteAll.$deleteAllModal.attr('data-stage', 'starting');

        // Show loading state
        $content.html(`
            <div class="ui segment">
                <div class="ui active inverted dimmer">
                    <div class="ui large text loader">${globalTranslate.gs_DeletingAllSettings}</div>
                </div>
                <p>&nbsp;</p>
                <p>&nbsp;</p>
                <p>&nbsp;</p>
            </div>
        `);
    },
    
    /**
     * Process delete progress events from WebSocket
     */
    processDeleteProgress(response) {
        const stage = response.stage;
        const stageDetails = response.stageDetails;
        const $content = generalSettingsDeleteAll.$deleteAllModal.find('.content');
        const $actions = generalSettingsDeleteAll.$deleteAllModal.find('.actions');

        // Update data-stage attribute for testing
        generalSettingsDeleteAll.$deleteAllModal.attr('data-stage', stage);

        // Update progress display
        let progressHtml = `
            <div class="ui segment">
                <div class="ui progress" data-percent="${stageDetails.progress}">
                    <div class="bar">
                        <div class="progress">${stageDetails.progress}%</div>
                    </div>
                    <div class="label">${stageDetails.messageKey ? globalTranslate[stageDetails.messageKey] : stageDetails.message}</div>
                </div>
            </div>
        `;

        $content.html(progressHtml);
        $('.ui.progress').progress();

        // Handle final stage - completion
        if (stage === 'DeleteAll_Stage_Final' && stageDetails.progress === 100) {
            if (stageDetails.result === true) {
                // Process completed successfully
                // Do NOT close modal automatically - let user close it
                // Update content to show completion message
                progressHtml = `
                    <div class="ui segment">
                        <div class="ui success message">
                            <i class="check circle icon"></i>
                            ${globalTranslate.gs_DeleteAllStageCompleted}
                        </div>
                    </div>
                `;
                $content.html(progressHtml);
            } else if (stageDetails.result === false) {
                // Show error and restore modal
                UserMessage.showMultiString(stageDetails.messages || ['Unknown error']);
                $actions.show();
                generalSettingsDeleteAll.loadDeleteStatistics();
            }
            // If no result property, just update progress
        }

        // Handle restart stage
        if (stage === 'DeleteAll_Stage_Restart' && stageDetails.restart === true) {
            // Show restart message in modal content (not as popup)
            progressHtml = `
                <div class="ui segment">
                    <div class="ui success message">
                        <i class="check circle icon"></i>
                        ${globalTranslate.gs_DeleteAllStageCompleted}
                    </div>
                    <div class="ui info message">
                        <i class="info circle icon"></i>
                        ${globalTranslate.gs_DeleteAllStageRestarting}
                    </div>
                </div>
            `;
            $content.html(progressHtml);

            // Show Close button only after process completion
            // Use 'ok' class instead of 'positive' to avoid triggering onApprove callback
            const closeButton = $('<button class="ui ok positive button">' + globalTranslate.sl_Close + '</button>');

            // Add click handler to simply close the modal
            closeButton.on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                generalSettingsDeleteAll.$deleteAllModal.modal('hide');
            });

            $actions.empty().append(closeButton);
            $actions.show();

            // Make modal closable now
            generalSettingsDeleteAll.$deleteAllModal.modal('setting', 'closable', true);
        }
    },
    
    /**
     * Handle response after restoring default settings (updated for async)
     * @param {boolean|object} response - Response from the server
     */
    cbAfterRestoreDefaultSettings(response) {
        if (response === false) {
            // Error occurred
            UserMessage.showMultiString(response);
            
            // Restore modal
            const $actions = generalSettingsDeleteAll.$deleteAllModal.find('.actions');
            $actions.show();
            generalSettingsDeleteAll.loadDeleteStatistics();
        }
        // Success case will be handled by WebSocket events
    },
    
    /**
     * Initialize input watcher to monitor delete phrase input
     */
    initializeInputWatcher() {
        const $submitButton = $('#submitbutton');
        const originalButtonText = $submitButton.text();
        
        // Watch for input changes
        generalSettingsDeleteAll.$deleteAllInput.on('input', function() {
            const inputValue = $(this).val().trim();
            
            // Check if the entered phrase matches
            if (inputValue === globalTranslate.gs_EnterDeleteAllPhrase) {
                // Change button text to indicate deletion action
                $submitButton
                    .removeClass('positive')
                    .addClass('negative')
                    .html(`<i class="trash icon"></i> ${globalTranslate.gs_BtnDeleteAll}`);
            } else {
                // Restore original button text
                $submitButton
                    .removeClass('negative')
                    .addClass('positive')
                    .html(`<i class="save icon"></i> ${originalButtonText}`);
            }
        });
    }
};

// Initialize when DOM is ready
$(document).ready(() => {
    generalSettingsDeleteAll.initialize();
});