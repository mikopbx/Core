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

/* global $, globalTranslate, SoundFilesAPI, Form, DynamicDropdownBuilder, SecurityUtils */

/**
 * SoundFileSelector - Audio-specific extension of DynamicDropdownBuilder
 * 
 * This component builds upon DynamicDropdownBuilder to add audio-specific features:
 * - Built-in audio playback functionality
 * - Play/pause button integration
 * - Support for custom/moh sound file categories
 * - Audio preview capabilities
 * 
 * Usage:
 * SoundFileSelector.init('audio_message_id', {
 *     category: 'custom',           // File category (custom/moh)
 *     includeEmpty: true,           // Show empty option
 *     onChange: (value) => { ... }  // Change callback
 * });
 * 
 * @module SoundFileSelector
 */
const SoundFileSelector = {
    
    /**
     * Active selector instances with audio capabilities
     * @type {Map}
     */
    instances: new Map(),
    
    /**
     * Global audio player element
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
        includeEmpty: true,       // Include empty/none option
        placeholder: null,        // Placeholder text (auto-detected)
        showPlayButton: true,     // Show play button
        showAddButton: true,      // Show add new file button
        onChange: null,           // Change callback function
        onPlay: null,            // Play callback function
    },
    
    /**
     * Initialize sound file selector
     * 
     * @param {string} fieldId - Field ID (e.g., 'audio_message_id')
     * @param {object} options - Configuration options
     * @returns {object|null} Selector instance
     */
    init(fieldId, options = {}) {
        // Check if already initialized
        if (this.instances.has(fieldId)) {
            return this.instances.get(fieldId);
        }
        
        // Find hidden input element
        const $hiddenInput = $(`#${fieldId}`);
        if (!$hiddenInput.length) {
            return null;
        }
        
        // Merge options with defaults
        const config = { ...this.defaults, ...options };
        
        // Get current value and represent text from data object if provided
        const currentValue = (options.data && options.data[fieldId]) || $hiddenInput.val() || config.defaultValue || '';
        const currentText = this.detectInitialText(fieldId, options.data) || config.placeholder;
        
        // Create dropdown configuration for DynamicDropdownBuilder
        const dropdownConfig = {
            apiUrl: `/pbxcore/api/v3/sound-files:getForSelect`,
            apiParams: {
                category: config.category,
                includeEmpty: config.includeEmpty ? 'true' : 'false'
            },
            placeholder: config.placeholder || globalTranslate.sf_SelectAudioFile || 'Select audio file',
            onChange: (value, text, $choice) => {
                this.handleSelectionChange(fieldId, value, text, $choice, config);
            }
        };
        
        // Build dropdown using DynamicDropdownBuilder
        const dropdownData = {
            [fieldId]: currentValue
        };
        
        // Add represent text if available and we have a value
        if (currentValue && currentText) {
            dropdownData[`${fieldId}_represent`] = currentText;
        }
        
        
        DynamicDropdownBuilder.buildDropdown(fieldId, dropdownData, dropdownConfig);
        
        // Create instance for audio functionality
        const instance = {
            fieldId,
            config,
            currentValue,
            currentText,
            $hiddenInput,
            playButton: null,
            addButton: null
        };
        
        // Initialize audio-specific features
        this.initializeAudioFeatures(instance);
        
        // Store instance
        this.instances.set(fieldId, instance);
        
        return instance;
    },
    
    /**
     * Detect initial text from data object or dropdown
     * 
     * @param {string} fieldId - Field ID
     * @param {object} data - Data object with represent fields
     * @returns {string|null} Initial text
     */
    detectInitialText(fieldId, data) {
        if (data && data[`${fieldId}_represent`]) {
            return data[`${fieldId}_represent`];
        }
        
        // Try to get from existing dropdown text
        const $dropdown = $(`#${fieldId}-dropdown`);
        if ($dropdown.length) {
            const $text = $dropdown.find('.text:not(.default)');
            if ($text.length && $text.text().trim()) {
                return $text.html();
            }
        }
        
        return null;
    },
    
    /**
     * Handle dropdown selection change
     * 
     * @param {string} fieldId - Field ID
     * @param {string} value - Selected value
     * @param {string} text - Selected text
     * @param {jQuery} $choice - Selected choice element
     * @param {object} config - Configuration
     */
    handleSelectionChange(fieldId, value, text, $choice, config) {
        const instance = this.instances.get(fieldId);
        if (!instance) return;
        
        // Update instance state
        instance.currentValue = value;
        instance.currentText = text;
        
        // CRITICAL: Update hidden input field to maintain synchronization
        const $hiddenInput = $(`#${fieldId}`);
        if ($hiddenInput.length) {
            $hiddenInput.val(value);
        }
        
        // Update play button state
        this.updatePlayButtonState(instance);
        
        // Call custom onChange if provided
        if (typeof config.onChange === 'function') {
            config.onChange(value, text, $choice);
        }
        
        // Notify form of changes
        if (typeof Form !== 'undefined' && Form.dataChanged) {
            Form.dataChanged();
        }
    },
    
    /**
     * Initialize audio-specific features
     * 
     * @param {object} instance - Selector instance
     */
    initializeAudioFeatures(instance) {
        // Initialize global audio player
        this.initializeAudioPlayer();
        
        // Find and initialize buttons
        this.initializeButtons(instance);
        
        // Update initial button state
        this.updatePlayButtonState(instance);
    },
    
    
    /**
     * Initialize control buttons (play/add)
     * 
     * @param {object} instance - Selector instance
     */
    initializeButtons(instance) {
        const { fieldId, config } = instance;
        
        // Find button container by looking near the dropdown
        const $dropdown = $(`#${fieldId}-dropdown`);
        if (!$dropdown.length) return;
        
        // Look for buttons in the same parent container (unstackable fields)
        let $buttonContainer = $dropdown.closest('.unstackable.fields').find('.ui.buttons');
        
        // Fallback: look in the same field
        if (!$buttonContainer.length) {
            $buttonContainer = $dropdown.closest('.field').find('.ui.buttons');
        }
        
        if ($buttonContainer.length > 0) {
            // Initialize play button
            if (config.showPlayButton) {
                instance.playButton = $buttonContainer.find('.action-playback-button').first();
                
                if (instance.playButton.length > 0) {
                    instance.playButton.off('click').on('click', (e) => {
                        e.preventDefault();
                        this.handlePlayClick(instance);
                    });
                }
            }
            
            // Find add button (no additional handling needed - has href)
            if (config.showAddButton) {
                instance.addButton = $buttonContainer.find('a[href*="sound-files/modify"]').first();
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
                this.stopPlayback();
            });
        }
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
                this.audioPlayer.src = `/pbxcore/api/v3/sound-files:playback?view=${encodeURIComponent(response.data.path)}`;
                this.audioPlayer.play().catch(error => {
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
     * Update play button state based on current selection
     * 
     * @param {object} instance - Selector instance
     */
    updatePlayButtonState(instance) {
        if (!instance.playButton || !instance.playButton.length) return;
        
        const { currentValue } = instance;
        
        if (!currentValue || currentValue === '' || currentValue === '-') {
            // Disable button and ensure play icon
            instance.playButton.addClass('disabled');
            instance.playButton.find('i').removeClass('pause').addClass('play');
        } else {
            // Enable button
            instance.playButton.removeClass('disabled');
            
            // Set appropriate icon based on playback state
            if (this.currentlyPlayingId === currentValue && !this.audioPlayer.paused) {
                instance.playButton.find('i').removeClass('play').addClass('pause');
            } else {
                instance.playButton.find('i').removeClass('pause').addClass('play');
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
            return;
        }
        
        // Use DynamicDropdownBuilder to set the value
        DynamicDropdownBuilder.setValue(fieldId, value);
        
        // Update instance state
        instance.currentValue = value;
        instance.currentText = text || '';
        
        // Update play button state
        this.updatePlayButtonState(instance);
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
        // Delegate to DynamicDropdownBuilder
        // (DynamicDropdownBuilder would need a refresh method)
        const $dropdown = $(`#${fieldId}-dropdown`);
        if ($dropdown.length) {
            $dropdown.dropdown('refresh');
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
        if (instance) {
            // Use DynamicDropdownBuilder to clear
            DynamicDropdownBuilder.clear(fieldId);
            
            // Update instance state
            instance.currentValue = null;
            instance.currentText = null;
            
            // Update play button state
            this.updatePlayButtonState(instance);
        }
    },
    
    /**
     * Clear cache for sound files API
     * Call this after sound file operations (add/edit/delete)
     * @param {string} category - Optional: specific category to clear ('custom', 'moh')
     */
    clearCache(category = null) {
        if (category) {
            // Clear cache for specific category
            DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v3/sound-files:getForSelect', { category });
        } else {
            // Clear all sound files cache
            DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v3/sound-files:getForSelect');
        }
    },
    
    /**
     * Refresh all sound file dropdowns on the page
     * This will force them to reload data from server
     * @param {string} category - Optional: specific category to refresh ('custom', 'moh')
     */
    refreshAll(category = null) {
        // Clear cache first
        this.clearCache(category);
        
        // Refresh each active instance
        this.instances.forEach((instance, fieldId) => {
            if (!category || instance.config.category === category) {
                // Clear dropdown and reload
                DynamicDropdownBuilder.clear(fieldId);
                
                // Reinitialize dropdown to trigger new API request
                const $dropdown = $(`#${fieldId}-dropdown`);
                if ($dropdown.length) {
                    $dropdown.dropdown('refresh');
                }
            }
        });
    }
};