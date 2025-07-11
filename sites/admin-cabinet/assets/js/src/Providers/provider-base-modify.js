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

/* global globalRootUrl, globalTranslate, Form, PbxApi, ClipboardJS */

/**
 * Base class for provider management forms
 * @class ProviderBase
 */
class ProviderBase { 
    /**  
     * Constructor
     * @param {string} providerType - Type of provider (SIP or IAX)
     */
    constructor(providerType) {
        this.providerType = providerType;
        this.$formObj = $('#save-provider-form');
        this.$secret = $('#secret');
        this.$additionalHostsDummy = $('#additional-hosts-table .dummy');
        this.$checkBoxes = $('#save-provider-form .checkbox');
        this.$accordions = $('#save-provider-form .ui.accordion');
        this.$dropDowns = $('#save-provider-form .ui.dropdown');
        this.$deleteRowButton = $('#additional-hosts-table .delete-row-button');
        this.$additionalHostInput = $('#additional-host input');
        this.hostRow = '#save-provider-form .host-row';
        
        this.hostInputValidation = new RegExp(
            '^(((\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])\\.){3}'
            + '(\\d|[1-9]\\d|1\\d{2}|2[0-4]\\d|25[0-5])'
            + '(\\/(\d|[1-2]\d|3[0-2]))?'
            + '|[a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+)$',
            'gm'
        );
    }

    /**
     * Initialize the provider form
     */
    initialize() {
        this.initializeUIComponents();
        this.initializeEventHandlers();
        this.initializeForm();
        this.updateVisibilityElements();
        
        // Initialize all tooltip popups
        $('.popuped').popup();
        
        this.initializeClipboard();
        
        // Prevent browser password manager for generated passwords
        this.$secret.on('focus', function() {
            $(this).attr('autocomplete', 'new-password');
        });
    }

    /**
     * Initialize UI components
     */
    initializeUIComponents() {
        this.$checkBoxes.checkbox();
        this.$dropDowns.dropdown();
        this.$accordions.accordion();
        this.updateHostsTableView();
    }

    /**
     * Initialize event handlers
     */
    initializeEventHandlers() {
        const self = this;
        
        // Add new string to additional-hosts-table table
        this.$additionalHostInput.keypress((e) => {
            if (e.which === 13) {
                self.cbOnCompleteHostAddress();
            }
        });

        // Delete host from additional-hosts-table
        this.$deleteRowButton.on('click', (e) => {
            e.preventDefault();
            $(e.target).closest('tr').remove();
            self.updateHostsTableView();
            Form.dataChanged();
            return false;
        });
        
        $('#registration_type').on('change', () => {
            self.updateVisibilityElements();
            // Remove all validation error prompts without clearing field values
            self.$formObj.find('.field').removeClass('error');
            self.$formObj.find('.ui.error.message').remove();
            self.$formObj.find('.prompt').remove();
            // Update validation rules for dynamic fields
            Form.validateRules = self.getValidateRules();
            // Mark form as changed to enable save button
            Form.dataChanged();
            // Don't auto-submit, just check if form is valid to update UI
            setTimeout(() => {
                self.$formObj.form('is valid');
            }, 100);
        });

        // Show/hide password toggle
        $('#show-hide-password').on('click', (e) => {
            e.preventDefault();
            const $button = $(e.currentTarget);
            const $icon = $button.find('i');
            
            if (self.$secret.attr('type') === 'password') {
                self.$secret.attr('type', 'text');
                $icon.removeClass('eye').addClass('eye slash');
            } else {
                self.$secret.attr('type', 'password');
                $icon.removeClass('eye slash').addClass('eye');
            }
        });

        $('#generate-new-password').on('click', (e) => {
            e.preventDefault();
            self.generatePassword();
        });
    }

    /**
     * Initialize clipboard functionality
     */
    initializeClipboard() {
        const clipboard = new ClipboardJS('.clipboard');
        $('.clipboard').popup({
            on: 'manual',
        });

        clipboard.on('success', (e) => {
            $(e.trigger).popup('show');
            setTimeout(() => {
                $(e.trigger).popup('hide');
            }, 1500);
            e.clearSelection();
        });

        clipboard.on('error', (e) => {
            console.error('Action:', e.action);
            console.error('Trigger:', e.trigger);
        });
    }

    /**
     * Generate password using REST API
     */
    generatePassword() {
        // For IAX use moderate password length (16 chars), for SIP use 16
        const length = 16;
        const self = this;
        
        PbxApi.PasswordGenerate(length, (password) => {
            // Use Fomantic UI Form API
            self.$formObj.form('set value', 'secret', password);
            
            // Update clipboard button attribute
            $('#elSecret .ui.button.clipboard').attr('data-clipboard-text', password);
            
            // Mark form as changed
            Form.dataChanged();
        });
    }

    /**
     * Updates the hosts table view based on the presence of additional hosts
     */
    updateHostsTableView() {
        if ($(this.hostRow).length === 0) {
            this.$additionalHostsDummy.show();
        } else {
            this.$additionalHostsDummy.hide();
        }
    }

    /**
     * Callback function when completing the host address input
     */
    cbOnCompleteHostAddress() {
        const value = this.$formObj.form('get value', 'additional-host');

        if (value) {
            const validation = value.match(this.hostInputValidation);

            // Validate the input value
            if (validation === null || validation.length === 0) {
                this.$additionalHostInput.transition('shake');
                return;
            }

            // Check if the host address already exists
            if ($(`.host-row[data-value="${value}"]`).length === 0) {
                const $tr = $('.host-row-tpl').last();
                const $clone = $tr.clone(true);
                $clone
                    .removeClass('host-row-tpl')
                    .addClass('host-row')
                    .show();
                $clone.attr('data-value', value);
                $clone.find('.address').html(value);
                if ($(this.hostRow).last().length === 0) {
                    $tr.after($clone);
                } else {
                    $(this.hostRow).last().after($clone);
                }
                this.updateHostsTableView();
                Form.dataChanged();
            }
            this.$additionalHostInput.val('');
        }
    }

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = this.$formObj.form('get values');

        const arrAdditionalHosts = [];
        $(this.hostRow).each((_, obj) => {
            if ($(obj).attr('data-value')) {
                arrAdditionalHosts.push({ address: $(obj).attr('data-value') });
            }
        });
        result.data.additionalHosts = JSON.stringify(arrAdditionalHosts);
        return result;
    }

    /**
     * Callback function to be called after the form has been sent
     */
    cbAfterSendForm() {
        // Response handled by Form module
    }

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        const self = this;
        Form.$formObj = this.$formObj;
        
        // Prevent auto-submit on validation
        Form.$formObj.form({
            on: 'blur',
            inline: true,
            keyboardShortcuts: false,
            onSuccess: function(event) {
                // Prevent auto-submit, only submit via button click
                if (event) {
                    event.preventDefault();
                }
                return false;
            }
        });
        
        Form.url = `${globalRootUrl}providers/save/${this.providerType.toLowerCase()}`;
        Form.validateRules = this.getValidateRules();
        Form.cbBeforeSendForm = this.cbBeforeSendForm.bind(this);
        Form.cbAfterSendForm = this.cbAfterSendForm.bind(this);
        Form.initialize();
    }

    /**
     * Get validation rules - must be implemented by subclasses
     * @abstract
     * @returns {object} Validation rules
     */
    getValidateRules() {
        throw new Error('getValidateRules must be implemented by subclass');
    }

    /**
     * Update visibility of elements - must be implemented by subclasses
     * @abstract
     */
    updateVisibilityElements() {
        throw new Error('updateVisibilityElements must be implemented by subclass');
    }

    /**
     * Show informational message about password usage in "none" mode
     * @param {string} providerType - Provider type (sip or iax)
     */
    showPasswordInfoMessage(providerType) {
        const $secretField = this.$secret.closest('.field');
        const messageKey = providerType === 'sip' ? 'pr_PasswordOptionalForNoneType' : 'iax_PasswordOptionalForNoneType';
        
        // Remove existing info message
        $secretField.find('.ui.info.message').remove();
        
        // Add info message
        const $infoMessage = $(`
            <div class="ui info message">
                <i class="info circle icon"></i>
                ${globalTranslate[messageKey]}
            </div>
        `);
        
        $secretField.append($infoMessage);
    }

    /**
     * Hide informational message about password
     */
    hidePasswordInfoMessage() {
        this.$secret.closest('.field').find('.ui.info.message').remove();
    }

    /**
     * Build HTML content for tooltips from structured data
     * @param {Object} tooltipData - Tooltip data object
     * @returns {string} HTML content for tooltip
     */
    buildTooltipContent(tooltipData) {
        if (!tooltipData) return '';
        
        let html = '';
        
        // Add header if exists
        if (tooltipData.header) {
            html += `<div class="header"><strong>${tooltipData.header}</strong></div>`;
            html += '<div class="ui divider"></div>';
        }
        
        // Add description if exists
        if (tooltipData.description) {
            html += `<p>${tooltipData.description}</p>`;
        }
        
        // Add list items if exist
        if (tooltipData.list && tooltipData.list.length > 0) {
            html += '<ul>';
            tooltipData.list.forEach(item => {
                if (typeof item === 'string') {
                    html += `<li>${item}</li>`;
                } else if (item.term && item.definition === null) {
                    // Header item without definition
                    html += `</ul><p><strong>${item.term}</strong></p><ul>`;
                } else if (item.term && item.definition) {
                    html += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                }
            });
            html += '</ul>';
        }
        
        // Add additional lists (list2, list3, etc.)
        for (let i = 2; i <= 10; i++) {
            const listName = `list${i}`;
            if (tooltipData[listName] && tooltipData[listName].length > 0) {
                html += '<ul>';
                tooltipData[listName].forEach(item => {
                    if (typeof item === 'string') {
                        html += `<li>${item}</li>`;
                    } else if (item.term && item.definition === null) {
                        html += `</ul><p><strong>${item.term}</strong></p><ul>`;
                    } else if (item.term && item.definition) {
                        html += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                    }
                });
                html += '</ul>';
            }
        }
        
        // Add warning if exists
        if (tooltipData.warning) {
            html += '<div class="ui orange message">';
            html += '<i class="exclamation triangle icon"></i>';
            if (tooltipData.warning.header) {
                html += `<strong>${tooltipData.warning.header}:</strong> `;
            }
            html += tooltipData.warning.text;
            html += '</div>';
        }
        
        // Add code examples if exist
        if (tooltipData.examples && tooltipData.examples.length > 0) {
            if (tooltipData.examplesHeader) {
                html += `<p><strong>${tooltipData.examplesHeader}:</strong></p>`;
            }
            html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
            html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">';
            
            // Process examples with syntax highlighting for sections
            tooltipData.examples.forEach((line, index) => {
                if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
                    // Section header
                    if (index > 0) html += '\n';
                    html += `<span style="color: #0084b4; font-weight: bold;">${line}</span>`;
                } else if (line.includes('=')) {
                    // Parameter line
                    const [param, value] = line.split('=', 2);
                    html += `\n<span style="color: #7a3e9d;">${param}</span>=<span style="color: #cf4a4c;">${value}</span>`;
                } else {
                    // Regular line
                    html += line ? `\n${line}` : '';
                }
            });
            
            html += '</pre>';
            html += '</div>';
        }
        
        // Add note if exists
        if (tooltipData.note) {
            html += `<p><em>${tooltipData.note}</em></p>`;
        }
        
        return html;
    }
}

// Export for use in other modules
window.ProviderBase = ProviderBase;