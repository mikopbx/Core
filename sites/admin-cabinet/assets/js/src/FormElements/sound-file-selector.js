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

/* global $, globalTranslate, SoundFilesAPI, Form, globalRootUrl */

/**
 * SoundFileSelector - Unified component for sound file dropdown selection with playback
 * 
 * Provides consistent sound file selection functionality across the application:
 * - Unified initialization and configuration
 * - REST API integration for loading sound files
 * - Built-in audio playback functionality
 * - Support for custom/moh categories
 * - Integration with play and add buttons
 * 
 * Usage:
 * SoundFileSelector.init('#audio_message_id', {
 *     category: 'custom',           // File category (custom/moh)
 *     includeEmpty: true,           // Show empty option
 *     onChange: (value) => { ... }  // Change callback
 * });
 * 
 * @module SoundFileSelector
 */
const SoundFileSelector = {
    
    /**
     * Active selector instances
     * @type {Map}
     */
    instances: new Map(),
    
    /**
     * Audio player element
     * @type {HTMLAudioElement|null}
     */
    audioPlayer: null,
    
    /**
     * Currently playing file ID
     * @type {string|null}
     */
    currentlyPlayingId: null,
    
    /**
     * Default configuration
     * @type {object}
     */
    defaults: {
        category: 'custom',       // Sound file category (custom/moh)
        includeEmpty: true,       // Include empty option
        forceSelection: false,    // Force user to select a file
        clearable: false,         // Allow clearing selection
        fullTextSearch: true,     // Enable full text search
        onChange: null,           // Change callback function
        onPlay: null,            // Play callback function
        placeholder: null,        // Placeholder text (auto-detected)
        showPlayButton: true,     // Show play button
        showAddButton: true,      // Show add new file button
    },
    
    /**
     * Initialize sound file selector
     * 
     * @param {string} fieldId - Field ID (e.g., 'audio_message_id')
     * @param {object} options - Configuration options
     * @returns {object|null} Selector instance
     */
    init(fieldId, options = {}) {
        // Find elements - try multiple ways to find container
        let $container = $(`#${fieldId}-container, .${fieldId}-container`).first();
        if ($container.length === 0) {
            $container = $(`[data-field-id="${fieldId}"]`).first();
        }
        if ($container.length === 0) {
            $container = $(`.${fieldId}-dropdown`).closest('.field').parent();
        }
        
        const $dropdown = $(`.${fieldId}-dropdown`);
        const $hiddenInput = $(`input[name="${fieldId}"]`);
        
        
        if ($dropdown.length === 0) {
            console.warn(`SoundFileSelector: Dropdown not found for field: ${fieldId}`);
            return null;
        }
        
        // Check if already initialized
        if (this.instances.has(fieldId)) {
            return this.instances.get(fieldId);
        }
        
        // Merge options with defaults
        const config = { ...this.defaults, ...options };
        
        // Auto-detect placeholder
        if (!config.placeholder) {
            config.placeholder = this.detectPlaceholder($dropdown);
        }
        
        // Create instance
        const instance = {
            fieldId,
            $container,
            $dropdown,
            $hiddenInput,
            config,
            initialized: false,
            currentValue: null,
            currentText: null,
            playButton: null,
            addButton: null
        };
        
        // Initialize components
        this.initializeDropdown(instance);
        this.initializeButtons(instance);
        this.initializeAudioPlayer();
        
        // Store instance
        this.instances.set(fieldId, instance);
        instance.initialized = true;
        
        return instance;
    },
    
    /**
     * Detect placeholder text
     * 
     * @param {jQuery} $dropdown - Dropdown element
     * @returns {string} Detected text
     */
    detectPlaceholder($dropdown) {
        const $defaultText = $dropdown.find('.default.text');
        if ($defaultText.length > 0) {
            return $defaultText.text();
        }
        return globalTranslate.sf_SelectAudioFile || 'Select audio file';
    },
    
    /**
     * Initialize dropdown with sound file data
     * 
     * @param {object} instance - Selector instance
     */
    initializeDropdown(instance) {
        const { $dropdown, $hiddenInput, config, fieldId } = instance;
        
        // Dropdown configuration with no caching
        const dropdownSettings = {
            apiSettings: {
                url: SoundFilesAPI.endpoints.getForSelect,
                method: 'GET',
                cache: false,
                beforeSend(settings) {
                    // Add timestamp to prevent caching
                    settings.data = { 
                        category: config.category,
                        _t: Date.now()
                    };
                    return settings;
                },
                onResponse(response) {
                    return SoundFileSelector.formatDropdownResults(response, config.includeEmpty);
                }
            },
            onChange(value, text, $selectedItem) {
                // Update instance
                instance.currentValue = value;
                instance.currentText = text;
                
                // Update hidden input
                if ($hiddenInput.length > 0) {
                    $hiddenInput.val(value).trigger('change');
                }
                
                // Update play button state
                SoundFileSelector.updatePlayButtonState(instance, value);
                
                // Call custom onChange
                if (typeof config.onChange === 'function') {
                    config.onChange(value, text, $selectedItem);
                }
                
                // Mark form as changed
                if (typeof Form !== 'undefined' && Form.dataChanged) {
                    Form.dataChanged();
                }
            },
            clearable: config.clearable,
            fullTextSearch: config.fullTextSearch,
            forceSelection: config.forceSelection,
            placeholder: config.placeholder,
            ignoreCase: true,
            filterRemoteData: true,
            saveRemoteData: false,
            cache: false,
            hideDividers: 'empty'
        };
        
        // Clear any existing initialization and data
        $dropdown.dropdown('destroy');
        
        // Clear dropdown menu content
        $dropdown.find('.menu').empty();
        
        // Clear any cached data
        $dropdown.removeData();
        
        // Initialize dropdown
        $dropdown.dropdown(dropdownSettings);
    },
    
    /**
     * Initialize control buttons (play/add)
     * 
     * @param {object} instance - Selector instance
     */
    initializeButtons(instance) {
        const { $container, config, fieldId } = instance;
        
        // Find button container
        let $buttonContainer = $container.find('.ui.buttons').first();
        if ($buttonContainer.length === 0) {
            $buttonContainer = $container.find('.field').last().find('.ui.buttons');
        }
        
        if ($buttonContainer.length > 0) {
            // Play button
            if (config.showPlayButton) {
                instance.playButton = $buttonContainer.find('.action-playback-button').first();
                
                if (instance.playButton.length > 0) {
                    // Initially disable the button
                    instance.playButton.addClass('disabled');
                    
                    instance.playButton.off('click').on('click', (e) => {
                        e.preventDefault();
                        this.handlePlayClick(instance);
                    });
                }
            }
            
            // Add button
            if (config.showAddButton) {
                instance.addButton = $buttonContainer.find('a[href*="sound-files/modify"]').first();
                // Add button already has href, no additional handling needed
            }
        }
    },
    
    /**
     * Initialize audio player
     */
    initializeAudioPlayer() {
        if (!this.audioPlayer) {
            this.audioPlayer = document.createElement('audio');
            this.audioPlayer.preload = 'none';
            this.audioPlayer.style.display = 'none';
            document.body.appendChild(this.audioPlayer);
            
            // Handle play/pause events
            this.audioPlayer.addEventListener('ended', () => {
                this.stopPlayback();
            });
            
            this.audioPlayer.addEventListener('error', (e) => {
                console.error('Audio playback error:', e);
                this.stopPlayback();
            });
        }
    },
    
    /**
     * Format dropdown results
     * 
     * @param {object} response - API response
     * @param {boolean} includeEmpty - Include empty option
     * @returns {object} Formatted results
     */
    formatDropdownResults(response, includeEmpty) {
        const formattedResponse = {
            success: false,
            results: []
        };
        
        if (includeEmpty) {
            formattedResponse.results.push({
                name: '-',
                value: -1,
                text: '-'
            });
        }
        
        if (response && response.result && response.data) {
            formattedResponse.success = true;
            response.data.forEach((item) => {
                // Use represent field which already contains the icon
                const displayName = item.represent;
                
                formattedResponse.results.push({
                    name: displayName,
                    value: item.id,
                    text: displayName,
                    raw: displayName // Store raw text for search
                });
            });
        }
        
        return formattedResponse;
    },
    
    /**
     * Handle play button click
     * 
     * @param {object} instance - Selector instance
     */
    handlePlayClick(instance) {
        const { currentValue, config, playButton } = instance;
        
        if (!currentValue || currentValue === '-1' || currentValue === -1) {
            return;
        }
        
        // Check if already playing this file
        if (this.currentlyPlayingId === currentValue && !this.audioPlayer.paused) {
            this.stopPlayback();
            return;
        }
        
        // Stop any current playback
        this.stopPlayback();
        
        // Update UI to show pause icon
        if (playButton) {
            playButton.find('i').removeClass('play').addClass('pause');
        }
        
        // Get file path and play
        this.playFile(currentValue, instance);
        
        // Call custom onPlay callback
        if (typeof config.onPlay === 'function') {
            config.onPlay(currentValue);
        }
    },
    
    /**
     * Play sound file
     * 
     * @param {string} fileId - File ID to play
     * @param {object} instance - Selector instance
     */
    playFile(fileId, instance) {
        // Get file record to get the path
        SoundFilesAPI.getRecord(fileId, (response) => {
            if (response.result && response.data && response.data.path) {
                this.currentlyPlayingId = fileId;
                this.audioPlayer.src = `/pbxcore/api/v2/sound-files/playback?view=${encodeURIComponent(response.data.path)}`;
                this.audioPlayer.play().catch(error => {
                    console.error('Failed to play audio:', error);
                    this.stopPlayback();
                });
            } else {
                // If failed to get file info, revert icon back to play
                if (instance.playButton) {
                    instance.playButton.find('i').removeClass('pause').addClass('play');
                }
            }
        });
    },
    
    /**
     * Stop audio playback
     */
    stopPlayback() {
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer.currentTime = 0;
        }
        
        this.currentlyPlayingId = null;
        
        // Update all play buttons back to play icon
        this.instances.forEach((instance) => {
            if (instance.playButton) {
                instance.playButton.find('i').removeClass('pause').addClass('play');
            }
        });
    },
    
    /**
     * Update play button state based on selection
     * 
     * @param {object} instance - Selector instance
     * @param {string} value - Selected value
     */
    updatePlayButtonState(instance, value) {
        if (instance.playButton) {
            if (!value || value === '-1' || value === -1) {
                instance.playButton.addClass('disabled');
                // Make sure icon is in play state when disabled
                instance.playButton.find('i').removeClass('pause').addClass('play');
            } else {
                instance.playButton.removeClass('disabled');
            }
        }
    },
    
    /**
     * Set value programmatically
     * 
     * @param {string} fieldId - Field ID
     * @param {string} value - Value to set
     * @param {string} text - Display text (optional)
     */
    setValue(fieldId, value, text = null) {
        const instance = this.instances.get(fieldId);
        if (!instance) {
            console.warn(`SoundFileSelector: Instance not found for field: ${fieldId}`);
            return;
        }
        
        const { $dropdown, $hiddenInput } = instance;
        
        // Set dropdown value
        $dropdown.dropdown('set value', value);
        
        // Set text if provided
        if (text) {
            $dropdown.dropdown('set text', text);
            instance.currentText = text;
        }
        
        // Update hidden input
        if ($hiddenInput.length > 0) {
            $hiddenInput.val(value);
        }
        
        instance.currentValue = value;
        this.updatePlayButtonState(instance, value);
    },
    
    /**
     * Get current value
     * 
     * @param {string} fieldId - Field ID
     * @returns {string|null} Current value
     */
    getValue(fieldId) {
        const instance = this.instances.get(fieldId);
        return instance ? instance.currentValue : null;
    },
    
    /**
     * Refresh dropdown data
     * 
     * @param {string} fieldId - Field ID
     */
    refresh(fieldId) {
        const instance = this.instances.get(fieldId);
        if (instance && instance.$dropdown) {
            instance.$dropdown.dropdown('clear cache');
            instance.$dropdown.dropdown('restore defaults');
        }
    },
    
    /**
     * Destroy instance
     * 
     * @param {string} fieldId - Field ID
     */
    destroy(fieldId) {
        const instance = this.instances.get(fieldId);
        if (instance) {
            // Stop playback if playing
            if (this.currentlyPlayingId === instance.currentValue) {
                this.stopPlayback();
            }
            
            // Destroy dropdown
            if (instance.$dropdown) {
                instance.$dropdown.dropdown('destroy');
            }
            
            // Remove event handlers
            if (instance.playButton) {
                instance.playButton.off('click');
            }
            
            // Remove from instances
            this.instances.delete(fieldId);
        }
    },
    
    /**
     * Clear dropdown selection
     * 
     * @param {string} fieldId - Field ID
     */
    clear(fieldId) {
        const instance = this.instances.get(fieldId);
        if (instance && instance.$dropdown) {
            instance.$dropdown.dropdown('clear');
            instance.currentValue = null;
            instance.currentText = null;
            this.updatePlayButtonState(instance, null);
            
            // Update hidden input
            if (instance.$hiddenInput.length > 0) {
                instance.$hiddenInput.val('');
            }
        }
    },
    
    /**
     * Set dropdown selection by value (without representation text)
     * 
     * @param {string} fieldId - Field ID
     * @param {string} value - Value to select
     */
    setSelected(fieldId, value) {
        const instance = this.instances.get(fieldId);
        if (instance && instance.$dropdown) {
            instance.$dropdown.dropdown('set selected', value);
            instance.currentValue = value;
            this.updatePlayButtonState(instance, value);
            
            // Update hidden input
            if (instance.$hiddenInput.length > 0) {
                instance.$hiddenInput.val(value);
            }
        }
    },
    
    /**
     * Refresh dropdown data and clear cache
     * 
     * @param {string} fieldId - Field ID
     */
    clearCache(fieldId) {
        const instance = this.instances.get(fieldId);
        if (instance && instance.$dropdown) {
            // Clear Semantic UI cache
            instance.$dropdown.dropdown('clear cache');
            
            // Clear dropdown menu content
            instance.$dropdown.find('.menu').empty();
            
            // Clear jQuery data cache
            instance.$dropdown.removeData();
            
            // Force refresh on next interaction
            instance.$dropdown.dropdown('refresh');
        }
    },
    
    /**
     * Check if field has a value selected
     * 
     * @param {string} fieldId - Field ID
     * @returns {boolean} True if has value
     */
    hasValue(fieldId) {
        const instance = this.instances.get(fieldId);
        return instance && instance.currentValue && instance.currentValue !== '-1' && instance.currentValue !== -1;
    },
    
    /**
     * Get dropdown jQuery object (for advanced operations)
     * 
     * @param {string} fieldId - Field ID
     * @returns {jQuery|null} Dropdown jQuery object
     */
    getDropdown(fieldId) {
        const instance = this.instances.get(fieldId);
        return instance ? instance.$dropdown : null;
    },
    
    /**
     * Destroy all instances
     */
    destroyAll() {
        this.stopPlayback();
        this.instances.forEach((instance, fieldId) => {
            this.destroy(fieldId);
        });
    }
};