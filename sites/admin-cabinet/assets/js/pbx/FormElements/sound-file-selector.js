"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
var SoundFileSelector = {
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
    category: 'custom',
    // Sound file category (custom/moh)
    includeEmpty: true,
    // Include empty/none option
    placeholder: null,
    // Placeholder text (auto-detected)
    showPlayButton: true,
    // Show play button
    showAddButton: true,
    // Show add new file button
    onChange: null,
    // Change callback function
    onPlay: null // Play callback function

  },

  /**
   * Initialize sound file selector
   * 
   * @param {string} fieldId - Field ID (e.g., 'audio_message_id')
   * @param {object} options - Configuration options
   * @returns {object|null} Selector instance
   */
  init: function init(fieldId) {
    var _this = this;

    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    // Check if already initialized
    if (this.instances.has(fieldId)) {
      return this.instances.get(fieldId);
    } // Find hidden input element


    var $hiddenInput = $("#".concat(fieldId));

    if (!$hiddenInput.length) {
      return null;
    } // Merge options with defaults


    var config = _objectSpread(_objectSpread({}, this.defaults), options); // Get current value and represent text from data object if provided


    var currentValue = options.data && options.data[fieldId] || $hiddenInput.val() || config.defaultValue || '';
    var currentText = this.detectInitialText(fieldId, options.data) || config.placeholder; // Create dropdown configuration for DynamicDropdownBuilder

    var dropdownConfig = {
      apiUrl: "/pbxcore/api/v3/sound-files:getForSelect",
      apiParams: {
        category: config.category,
        includeEmpty: config.includeEmpty ? 'true' : 'false'
      },
      placeholder: config.placeholder || globalTranslate.sf_SelectAudioFile,
      onChange: function onChange(value, text, $choice) {
        _this.handleSelectionChange(fieldId, value, text, $choice, config);
      }
    }; // Build dropdown using DynamicDropdownBuilder

    var dropdownData = _defineProperty({}, fieldId, currentValue); // Add represent text if available and we have a value


    if (currentValue && currentText) {
      dropdownData["".concat(fieldId, "_represent")] = currentText;
    }

    DynamicDropdownBuilder.buildDropdown(fieldId, dropdownData, dropdownConfig); // Create instance for audio functionality

    var instance = {
      fieldId: fieldId,
      config: config,
      currentValue: currentValue,
      currentText: currentText,
      $hiddenInput: $hiddenInput,
      playButton: null,
      addButton: null
    }; // Initialize audio-specific features

    this.initializeAudioFeatures(instance); // Store instance

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
  detectInitialText: function detectInitialText(fieldId, data) {
    if (data && data["".concat(fieldId, "_represent")]) {
      return data["".concat(fieldId, "_represent")];
    } // Try to get from existing dropdown text


    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      var $text = $dropdown.find('.text:not(.default)');

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
  handleSelectionChange: function handleSelectionChange(fieldId, value, text, $choice, config) {
    var instance = this.instances.get(fieldId);
    if (!instance) return; // Update instance state

    instance.currentValue = value;
    instance.currentText = text; // CRITICAL: Update hidden input field to maintain synchronization

    var $hiddenInput = $("#".concat(fieldId));

    if ($hiddenInput.length) {
      $hiddenInput.val(value);
    } // Update play button state


    this.updatePlayButtonState(instance); // Call custom onChange if provided

    if (typeof config.onChange === 'function') {
      config.onChange(value, text, $choice);
    } // Notify form of changes


    if (typeof Form !== 'undefined' && Form.dataChanged) {
      Form.dataChanged();
    }
  },

  /**
   * Initialize audio-specific features
   * 
   * @param {object} instance - Selector instance
   */
  initializeAudioFeatures: function initializeAudioFeatures(instance) {
    // Initialize global audio player
    this.initializeAudioPlayer(); // Find and initialize buttons

    this.initializeButtons(instance); // Update initial button state

    this.updatePlayButtonState(instance);
  },

  /**
   * Initialize control buttons (play/add)
   * 
   * @param {object} instance - Selector instance
   */
  initializeButtons: function initializeButtons(instance) {
    var _this2 = this;

    var fieldId = instance.fieldId,
        config = instance.config; // Find button container by looking near the dropdown

    var $dropdown = $("#".concat(fieldId, "-dropdown"));
    if (!$dropdown.length) return; // Look for buttons in the same parent container (unstackable fields)

    var $buttonContainer = $dropdown.closest('.unstackable.fields').find('.ui.buttons'); // Fallback: look in the same field

    if (!$buttonContainer.length) {
      $buttonContainer = $dropdown.closest('.field').find('.ui.buttons');
    }

    if ($buttonContainer.length > 0) {
      // Initialize play button
      if (config.showPlayButton) {
        instance.playButton = $buttonContainer.find('.action-playback-button').first();

        if (instance.playButton.length > 0) {
          instance.playButton.off('click').on('click', function (e) {
            e.preventDefault();

            _this2.handlePlayClick(instance);
          });
        }
      } // Find add button (no additional handling needed - has href)


      if (config.showAddButton) {
        instance.addButton = $buttonContainer.find('a[href*="sound-files/modify"]').first();
      }
    }
  },

  /**
   * Initialize audio player
   */
  initializeAudioPlayer: function initializeAudioPlayer() {
    var _this3 = this;

    if (!this.audioPlayer) {
      this.audioPlayer = document.createElement('audio');
      this.audioPlayer.preload = 'none';
      this.audioPlayer.style.display = 'none';
      document.body.appendChild(this.audioPlayer); // Handle play/pause events

      this.audioPlayer.addEventListener('ended', function () {
        _this3.stopPlayback();
      });
      this.audioPlayer.addEventListener('error', function (e) {
        _this3.stopPlayback();
      });
    }
  },

  /**
   * Handle play button click
   * 
   * @param {object} instance - Selector instance
   */
  handlePlayClick: function handlePlayClick(instance) {
    var currentValue = instance.currentValue,
        config = instance.config,
        playButton = instance.playButton;

    if (!currentValue || currentValue === '-1' || currentValue === -1) {
      return;
    } // Check if already playing this file


    if (this.currentlyPlayingId === currentValue && !this.audioPlayer.paused) {
      this.stopPlayback();
      return;
    } // Stop any current playback


    this.stopPlayback(); // Update UI to show pause icon

    if (playButton) {
      playButton.find('i').removeClass('play').addClass('pause');
    } // Get file path and play


    this.playFile(currentValue, instance); // Call custom onPlay callback

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
  playFile: function playFile(fileId, instance) {
    var _this4 = this;

    // Get file record to get the path
    SoundFilesAPI.getRecord(fileId, function (response) {
      if (response.result && response.data && response.data.path) {
        _this4.currentlyPlayingId = fileId;
        _this4.audioPlayer.src = "/pbxcore/api/v3/sound-files:playback?view=".concat(encodeURIComponent(response.data.path));

        _this4.audioPlayer.play()["catch"](function (error) {
          _this4.stopPlayback();
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
  stopPlayback: function stopPlayback() {
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
    }

    this.currentlyPlayingId = null; // Update all play buttons back to play icon

    this.instances.forEach(function (instance) {
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
  updatePlayButtonState: function updatePlayButtonState(instance) {
    if (!instance.playButton || !instance.playButton.length) return;
    var currentValue = instance.currentValue;

    if (!currentValue || currentValue === '' || currentValue === '-') {
      // Disable button and ensure play icon
      instance.playButton.addClass('disabled');
      instance.playButton.find('i').removeClass('pause').addClass('play');
    } else {
      // Enable button
      instance.playButton.removeClass('disabled'); // Set appropriate icon based on playback state

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
  setValue: function setValue(fieldId, value) {
    var text = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
    var instance = this.instances.get(fieldId);

    if (!instance) {
      return;
    } // Use DynamicDropdownBuilder to set the value


    DynamicDropdownBuilder.setValue(fieldId, value); // Update instance state

    instance.currentValue = value;
    instance.currentText = text || ''; // Update play button state

    this.updatePlayButtonState(instance);
  },

  /**
   * Get current value
   * 
   * @param {string} fieldId - Field ID
   * @returns {string|null} Current value
   */
  getValue: function getValue(fieldId) {
    var instance = this.instances.get(fieldId);
    return instance ? instance.currentValue : null;
  },

  /**
   * Refresh dropdown data
   * 
   * @param {string} fieldId - Field ID
   */
  refresh: function refresh(fieldId) {
    // Delegate to DynamicDropdownBuilder
    // (DynamicDropdownBuilder would need a refresh method)
    var $dropdown = $("#".concat(fieldId, "-dropdown"));

    if ($dropdown.length) {
      $dropdown.dropdown('refresh');
    }
  },

  /**
   * Destroy instance
   * 
   * @param {string} fieldId - Field ID
   */
  destroy: function destroy(fieldId) {
    var instance = this.instances.get(fieldId);

    if (instance) {
      // Stop playback if playing
      if (this.currentlyPlayingId === instance.currentValue) {
        this.stopPlayback();
      } // Remove event handlers


      if (instance.playButton) {
        instance.playButton.off('click');
      } // Remove from instances


      this.instances["delete"](fieldId);
    }
  },

  /**
   * Clear dropdown selection
   * 
   * @param {string} fieldId - Field ID
   */
  clear: function clear(fieldId) {
    var instance = this.instances.get(fieldId);

    if (instance) {
      // Use DynamicDropdownBuilder to clear
      DynamicDropdownBuilder.clear(fieldId); // Update instance state

      instance.currentValue = null;
      instance.currentText = null; // Update play button state

      this.updatePlayButtonState(instance);
    }
  },

  /**
   * Clear cache for sound files API
   * Call this after sound file operations (add/edit/delete)
   * @param {string} category - Optional: specific category to clear ('custom', 'moh')
   */
  clearCache: function clearCache() {
    var category = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

    if (category) {
      // Clear cache for specific category
      DynamicDropdownBuilder.clearCacheFor('/pbxcore/api/v3/sound-files:getForSelect', {
        category: category
      });
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
  refreshAll: function refreshAll() {
    var category = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    // Clear cache first
    this.clearCache(category); // Refresh each active instance

    this.instances.forEach(function (instance, fieldId) {
      if (!category || instance.config.category === category) {
        // Clear dropdown and reload
        DynamicDropdownBuilder.clear(fieldId); // Reinitialize dropdown to trigger new API request

        var $dropdown = $("#".concat(fieldId, "-dropdown"));

        if ($dropdown.length) {
          $dropdown.dropdown('refresh');
        }
      }
    });
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvc291bmQtZmlsZS1zZWxlY3Rvci5qcyJdLCJuYW1lcyI6WyJTb3VuZEZpbGVTZWxlY3RvciIsImluc3RhbmNlcyIsIk1hcCIsImF1ZGlvUGxheWVyIiwiY3VycmVudGx5UGxheWluZ0lkIiwiZGVmYXVsdHMiLCJjYXRlZ29yeSIsImluY2x1ZGVFbXB0eSIsInBsYWNlaG9sZGVyIiwic2hvd1BsYXlCdXR0b24iLCJzaG93QWRkQnV0dG9uIiwib25DaGFuZ2UiLCJvblBsYXkiLCJpbml0IiwiZmllbGRJZCIsIm9wdGlvbnMiLCJoYXMiLCJnZXQiLCIkaGlkZGVuSW5wdXQiLCIkIiwibGVuZ3RoIiwiY29uZmlnIiwiY3VycmVudFZhbHVlIiwiZGF0YSIsInZhbCIsImRlZmF1bHRWYWx1ZSIsImN1cnJlbnRUZXh0IiwiZGV0ZWN0SW5pdGlhbFRleHQiLCJkcm9wZG93bkNvbmZpZyIsImFwaVVybCIsImFwaVBhcmFtcyIsImdsb2JhbFRyYW5zbGF0ZSIsInNmX1NlbGVjdEF1ZGlvRmlsZSIsInZhbHVlIiwidGV4dCIsIiRjaG9pY2UiLCJoYW5kbGVTZWxlY3Rpb25DaGFuZ2UiLCJkcm9wZG93bkRhdGEiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImluc3RhbmNlIiwicGxheUJ1dHRvbiIsImFkZEJ1dHRvbiIsImluaXRpYWxpemVBdWRpb0ZlYXR1cmVzIiwic2V0IiwiJGRyb3Bkb3duIiwiJHRleHQiLCJmaW5kIiwidHJpbSIsImh0bWwiLCJ1cGRhdGVQbGF5QnV0dG9uU3RhdGUiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplQXVkaW9QbGF5ZXIiLCJpbml0aWFsaXplQnV0dG9ucyIsIiRidXR0b25Db250YWluZXIiLCJjbG9zZXN0IiwiZmlyc3QiLCJvZmYiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhbmRsZVBsYXlDbGljayIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInByZWxvYWQiLCJzdHlsZSIsImRpc3BsYXkiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJhZGRFdmVudExpc3RlbmVyIiwic3RvcFBsYXliYWNrIiwicGF1c2VkIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInBsYXlGaWxlIiwiZmlsZUlkIiwiU291bmRGaWxlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVzdWx0IiwicGF0aCIsInNyYyIsImVuY29kZVVSSUNvbXBvbmVudCIsInBsYXkiLCJlcnJvciIsInBhdXNlIiwiY3VycmVudFRpbWUiLCJmb3JFYWNoIiwic2V0VmFsdWUiLCJnZXRWYWx1ZSIsInJlZnJlc2giLCJkcm9wZG93biIsImRlc3Ryb3kiLCJjbGVhciIsImNsZWFyQ2FjaGUiLCJjbGVhckNhY2hlRm9yIiwicmVmcmVzaEFsbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBRXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQUFJQyxHQUFKLEVBTlc7O0FBUXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFdBQVcsRUFBRSxJQVpTOztBQWN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRSxJQWxCRTs7QUFvQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRTtBQUNOQyxJQUFBQSxRQUFRLEVBQUUsUUFESjtBQUNvQjtBQUMxQkMsSUFBQUEsWUFBWSxFQUFFLElBRlI7QUFFb0I7QUFDMUJDLElBQUFBLFdBQVcsRUFBRSxJQUhQ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QixDQUFDd0QsS0FBdkIsQ0FBNkJoRixPQUE3QixFQUZvRCxDQUlwRDs7QUFDQSxZQUFNK0IsU0FBUyxHQUFHMUIsQ0FBQyxZQUFLTCxPQUFMLGVBQW5COztBQUNBLFlBQUkrQixTQUFTLENBQUN6QixNQUFkLEVBQXNCO0FBQ2xCeUIsVUFBQUEsU0FBUyxDQUFDK0MsUUFBVixDQUFtQixTQUFuQjtBQUNIO0FBQ0o7QUFDSixLQVhEO0FBWUg7QUEvZHFCLENBQTFCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsICQsIGdsb2JhbFRyYW5zbGF0ZSwgU291bmRGaWxlc0FQSSwgRm9ybSwgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciwgU2VjdXJpdHlVdGlscyAqL1xuXG4vKipcbiAqIFNvdW5kRmlsZVNlbGVjdG9yIC0gQXVkaW8tc3BlY2lmaWMgZXh0ZW5zaW9uIG9mIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAqIFxuICogVGhpcyBjb21wb25lbnQgYnVpbGRzIHVwb24gRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB0byBhZGQgYXVkaW8tc3BlY2lmaWMgZmVhdHVyZXM6XG4gKiAtIEJ1aWx0LWluIGF1ZGlvIHBsYXliYWNrIGZ1bmN0aW9uYWxpdHlcbiAqIC0gUGxheS9wYXVzZSBidXR0b24gaW50ZWdyYXRpb25cbiAqIC0gU3VwcG9ydCBmb3IgY3VzdG9tL21vaCBzb3VuZCBmaWxlIGNhdGVnb3JpZXNcbiAqIC0gQXVkaW8gcHJldmlldyBjYXBhYmlsaXRpZXNcbiAqIFxuICogVXNhZ2U6XG4gKiBTb3VuZEZpbGVTZWxlY3Rvci5pbml0KCdhdWRpb19tZXNzYWdlX2lkJywge1xuICogICAgIGNhdGVnb3J5OiAnY3VzdG9tJywgICAgICAgICAgIC8vIEZpbGUgY2F0ZWdvcnkgKGN1c3RvbS9tb2gpXG4gKiAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLCAgICAgICAgICAgLy8gU2hvdyBlbXB0eSBvcHRpb25cbiAqICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7IC4uLiB9ICAvLyBDaGFuZ2UgY2FsbGJhY2tcbiAqIH0pO1xuICogXG4gKiBAbW9kdWxlIFNvdW5kRmlsZVNlbGVjdG9yXG4gKi9cbmNvbnN0IFNvdW5kRmlsZVNlbGVjdG9yID0ge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEFjdGl2ZSBzZWxlY3RvciBpbnN0YW5jZXMgd2l0aCBhdWRpbyBjYXBhYmlsaXRpZXNcbiAgICAgKiBAdHlwZSB7TWFwfVxuICAgICAqL1xuICAgIGluc3RhbmNlczogbmV3IE1hcCgpLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdsb2JhbCBhdWRpbyBwbGF5ZXIgZWxlbWVudFxuICAgICAqIEB0eXBlIHtIVE1MQXVkaW9FbGVtZW50fG51bGx9XG4gICAgICovXG4gICAgYXVkaW9QbGF5ZXI6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3VycmVudGx5IHBsYXlpbmcgZmlsZSBJRFxuICAgICAqIEB0eXBlIHtzdHJpbmd8bnVsbH1cbiAgICAgKi9cbiAgICBjdXJyZW50bHlQbGF5aW5nSWQ6IG51bGwsXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBjb25maWd1cmF0aW9uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICBkZWZhdWx0czoge1xuICAgICAgICBjYXRlZ29yeTogJ2N1c3RvbScsICAgICAgIC8vIFNvdW5kIGZpbGUgY2F0ZWdvcnkgKGN1c3RvbS9tb2gpXG4gICAgICAgIGluY2x1ZGVFbXB0eTogdHJ1ZSwgICAgICAgLy8gSW5jbHVkZSBlbXB0eS9ub25lIG9wdGlvblxuICAgICAgICBwbGFjZWhvbGRlcjogbnVsbCwgICAgICAgIC8vIFBsYWNlaG9sZGVyIHRleHQgKGF1dG8tZGV0ZWN0ZWQpXG4gICAgICAgIHNob3dQbGF5QnV0dG9uOiB0cnVlLCAgICAgLy8gU2hvdyBwbGF5IGJ1dHRvblxuICAgICAgICBzaG93QWRkQnV0dG9uOiB0cnVlLCAgICAgIC8vIFNob3cgYWRkIG5ldyBmaWxlIGJ1dHRvblxuICAgICAgICBvbkNoYW5nZTogbnVsbCwgICAgICAgICAgIC8vIENoYW5nZSBjYWxsYmFjayBmdW5jdGlvblxuICAgICAgICBvblBsYXk6IG51bGwsICAgICAgICAgICAgLy8gUGxheSBjYWxsYmFjayBmdW5jdGlvblxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBzb3VuZCBmaWxlIHNlbGVjdG9yXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRCAoZS5nLiwgJ2F1ZGlvX21lc3NhZ2VfaWQnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIC0gQ29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICogQHJldHVybnMge29iamVjdHxudWxsfSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXQoZmllbGRJZCwgb3B0aW9ucyA9IHt9KSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgaWYgKHRoaXMuaW5zdGFuY2VzLmhhcyhmaWVsZElkKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBoaWRkZW4gaW5wdXQgZWxlbWVudFxuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBNZXJnZSBvcHRpb25zIHdpdGggZGVmYXVsdHNcbiAgICAgICAgY29uc3QgY29uZmlnID0geyAuLi50aGlzLmRlZmF1bHRzLCAuLi5vcHRpb25zIH07XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgY3VycmVudCB2YWx1ZSBhbmQgcmVwcmVzZW50IHRleHQgZnJvbSBkYXRhIG9iamVjdCBpZiBwcm92aWRlZFxuICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSAob3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YVtmaWVsZElkXSkgfHwgJGhpZGRlbklucHV0LnZhbCgpIHx8IGNvbmZpZy5kZWZhdWx0VmFsdWUgfHwgJyc7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRUZXh0ID0gdGhpcy5kZXRlY3RJbml0aWFsVGV4dChmaWVsZElkLCBvcHRpb25zLmRhdGEpIHx8IGNvbmZpZy5wbGFjZWhvbGRlcjtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBjb25maWd1cmF0aW9uIGZvciBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duQ29uZmlnID0ge1xuICAgICAgICAgICAgYXBpVXJsOiBgL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzOmdldEZvclNlbGVjdGAsXG4gICAgICAgICAgICBhcGlQYXJhbXM6IHtcbiAgICAgICAgICAgICAgICBjYXRlZ29yeTogY29uZmlnLmNhdGVnb3J5LFxuICAgICAgICAgICAgICAgIGluY2x1ZGVFbXB0eTogY29uZmlnLmluY2x1ZGVFbXB0eSA/ICd0cnVlJyA6ICdmYWxzZSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwbGFjZWhvbGRlcjogY29uZmlnLnBsYWNlaG9sZGVyIHx8IGdsb2JhbFRyYW5zbGF0ZS5zZl9TZWxlY3RBdWRpb0ZpbGUsXG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTZWxlY3Rpb25DaGFuZ2UoZmllbGRJZCwgdmFsdWUsIHRleHQsICRjaG9pY2UsIGNvbmZpZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCBkcm9wZG93biB1c2luZyBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duRGF0YSA9IHtcbiAgICAgICAgICAgIFtmaWVsZElkXTogY3VycmVudFZhbHVlXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcmVwcmVzZW50IHRleHQgaWYgYXZhaWxhYmxlIGFuZCB3ZSBoYXZlIGEgdmFsdWVcbiAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSAmJiBjdXJyZW50VGV4dCkge1xuICAgICAgICAgICAgZHJvcGRvd25EYXRhW2Ake2ZpZWxkSWR9X3JlcHJlc2VudGBdID0gY3VycmVudFRleHQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oZmllbGRJZCwgZHJvcGRvd25EYXRhLCBkcm9wZG93bkNvbmZpZyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDcmVhdGUgaW5zdGFuY2UgZm9yIGF1ZGlvIGZ1bmN0aW9uYWxpdHlcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB7XG4gICAgICAgICAgICBmaWVsZElkLFxuICAgICAgICAgICAgY29uZmlnLFxuICAgICAgICAgICAgY3VycmVudFZhbHVlLFxuICAgICAgICAgICAgY3VycmVudFRleHQsXG4gICAgICAgICAgICAkaGlkZGVuSW5wdXQsXG4gICAgICAgICAgICBwbGF5QnV0dG9uOiBudWxsLFxuICAgICAgICAgICAgYWRkQnV0dG9uOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGF1ZGlvLXNwZWNpZmljIGZlYXR1cmVzXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUF1ZGlvRmVhdHVyZXMoaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gU3RvcmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuc2V0KGZpZWxkSWQsIGluc3RhbmNlKTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERldGVjdCBpbml0aWFsIHRleHQgZnJvbSBkYXRhIG9iamVjdCBvciBkcm9wZG93blxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIERhdGEgb2JqZWN0IHdpdGggcmVwcmVzZW50IGZpZWxkc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gSW5pdGlhbCB0ZXh0XG4gICAgICovXG4gICAgZGV0ZWN0SW5pdGlhbFRleHQoZmllbGRJZCwgZGF0YSkge1xuICAgICAgICBpZiAoZGF0YSAmJiBkYXRhW2Ake2ZpZWxkSWR9X3JlcHJlc2VudGBdKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YVtgJHtmaWVsZElkfV9yZXByZXNlbnRgXTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gVHJ5IHRvIGdldCBmcm9tIGV4aXN0aW5nIGRyb3Bkb3duIHRleHRcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0ZXh0ID0gJGRyb3Bkb3duLmZpbmQoJy50ZXh0Om5vdCguZGVmYXVsdCknKTtcbiAgICAgICAgICAgIGlmICgkdGV4dC5sZW5ndGggJiYgJHRleHQudGV4dCgpLnRyaW0oKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkdGV4dC5odG1sKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGRyb3Bkb3duIHNlbGVjdGlvbiBjaGFuZ2VcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gU2VsZWN0ZWQgdmFsdWVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFNlbGVjdGVkIHRleHRcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGNob2ljZSAtIFNlbGVjdGVkIGNob2ljZSBlbGVtZW50XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb25cbiAgICAgKi9cbiAgICBoYW5kbGVTZWxlY3Rpb25DaGFuZ2UoZmllbGRJZCwgdmFsdWUsIHRleHQsICRjaG9pY2UsIGNvbmZpZykge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGluc3RhbmNlIHN0YXRlXG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQ7XG4gICAgICAgIFxuICAgICAgICAvLyBDUklUSUNBTDogVXBkYXRlIGhpZGRlbiBpbnB1dCBmaWVsZCB0byBtYWludGFpbiBzeW5jaHJvbml6YXRpb25cbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJChgIyR7ZmllbGRJZH1gKTtcbiAgICAgICAgaWYgKCRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGxheSBidXR0b24gc3RhdGVcbiAgICAgICAgdGhpcy51cGRhdGVQbGF5QnV0dG9uU3RhdGUoaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FsbCBjdXN0b20gb25DaGFuZ2UgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub25DaGFuZ2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbmZpZy5vbkNoYW5nZSh2YWx1ZSwgdGV4dCwgJGNob2ljZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE5vdGlmeSBmb3JtIG9mIGNoYW5nZXNcbiAgICAgICAgaWYgKHR5cGVvZiBGb3JtICE9PSAndW5kZWZpbmVkJyAmJiBGb3JtLmRhdGFDaGFuZ2VkKSB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYXVkaW8tc3BlY2lmaWMgZmVhdHVyZXNcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVBdWRpb0ZlYXR1cmVzKGluc3RhbmNlKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZ2xvYmFsIGF1ZGlvIHBsYXllclxuICAgICAgICB0aGlzLmluaXRpYWxpemVBdWRpb1BsYXllcigpO1xuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBhbmQgaW5pdGlhbGl6ZSBidXR0b25zXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUJ1dHRvbnMoaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGluaXRpYWwgYnV0dG9uIHN0YXRlXG4gICAgICAgIHRoaXMudXBkYXRlUGxheUJ1dHRvblN0YXRlKGluc3RhbmNlKTtcbiAgICB9LFxuICAgIFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgY29udHJvbCBidXR0b25zIChwbGF5L2FkZClcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGluaXRpYWxpemVCdXR0b25zKGluc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IHsgZmllbGRJZCwgY29uZmlnIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZpbmQgYnV0dG9uIGNvbnRhaW5lciBieSBsb29raW5nIG5lYXIgdGhlIGRyb3Bkb3duXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICghJGRyb3Bkb3duLmxlbmd0aCkgcmV0dXJuO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9vayBmb3IgYnV0dG9ucyBpbiB0aGUgc2FtZSBwYXJlbnQgY29udGFpbmVyICh1bnN0YWNrYWJsZSBmaWVsZHMpXG4gICAgICAgIGxldCAkYnV0dG9uQ29udGFpbmVyID0gJGRyb3Bkb3duLmNsb3Nlc3QoJy51bnN0YWNrYWJsZS5maWVsZHMnKS5maW5kKCcudWkuYnV0dG9ucycpO1xuICAgICAgICBcbiAgICAgICAgLy8gRmFsbGJhY2s6IGxvb2sgaW4gdGhlIHNhbWUgZmllbGRcbiAgICAgICAgaWYgKCEkYnV0dG9uQ29udGFpbmVyLmxlbmd0aCkge1xuICAgICAgICAgICAgJGJ1dHRvbkNvbnRhaW5lciA9ICRkcm9wZG93bi5jbG9zZXN0KCcuZmllbGQnKS5maW5kKCcudWkuYnV0dG9ucycpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoJGJ1dHRvbkNvbnRhaW5lci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHBsYXkgYnV0dG9uXG4gICAgICAgICAgICBpZiAoY29uZmlnLnNob3dQbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbiA9ICRidXR0b25Db250YWluZXIuZmluZCgnLmFjdGlvbi1wbGF5YmFjay1idXR0b24nKS5maXJzdCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5wbGF5QnV0dG9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5vZmYoJ2NsaWNrJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlUGxheUNsaWNrKGluc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGaW5kIGFkZCBidXR0b24gKG5vIGFkZGl0aW9uYWwgaGFuZGxpbmcgbmVlZGVkIC0gaGFzIGhyZWYpXG4gICAgICAgICAgICBpZiAoY29uZmlnLnNob3dBZGRCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5hZGRCdXR0b24gPSAkYnV0dG9uQ29udGFpbmVyLmZpbmQoJ2FbaHJlZio9XCJzb3VuZC1maWxlcy9tb2RpZnlcIl0nKS5maXJzdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGF1ZGlvIHBsYXllclxuICAgICAqL1xuICAgIGluaXRpYWxpemVBdWRpb1BsYXllcigpIHtcbiAgICAgICAgaWYgKCF0aGlzLmF1ZGlvUGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYXVkaW8nKTtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucHJlbG9hZCA9ICdub25lJztcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5hdWRpb1BsYXllcik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEhhbmRsZSBwbGF5L3BhdXNlIGV2ZW50c1xuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIHBsYXkgYnV0dG9uIGNsaWNrXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBoYW5kbGVQbGF5Q2xpY2soaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyBjdXJyZW50VmFsdWUsIGNvbmZpZywgcGxheUJ1dHRvbiB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWN1cnJlbnRWYWx1ZSB8fCBjdXJyZW50VmFsdWUgPT09ICctMScgfHwgY3VycmVudFZhbHVlID09PSAtMSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiBhbHJlYWR5IHBsYXlpbmcgdGhpcyBmaWxlXG4gICAgICAgIGlmICh0aGlzLmN1cnJlbnRseVBsYXlpbmdJZCA9PT0gY3VycmVudFZhbHVlICYmICF0aGlzLmF1ZGlvUGxheWVyLnBhdXNlZCkge1xuICAgICAgICAgICAgdGhpcy5zdG9wUGxheWJhY2soKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU3RvcCBhbnkgY3VycmVudCBwbGF5YmFja1xuICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIFVJIHRvIHNob3cgcGF1c2UgaWNvblxuICAgICAgICBpZiAocGxheUJ1dHRvbikge1xuICAgICAgICAgICAgcGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gR2V0IGZpbGUgcGF0aCBhbmQgcGxheVxuICAgICAgICB0aGlzLnBsYXlGaWxlKGN1cnJlbnRWYWx1ZSwgaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2FsbCBjdXN0b20gb25QbGF5IGNhbGxiYWNrXG4gICAgICAgIGlmICh0eXBlb2YgY29uZmlnLm9uUGxheSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY29uZmlnLm9uUGxheShjdXJyZW50VmFsdWUpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQbGF5IHNvdW5kIGZpbGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZUlkIC0gRmlsZSBJRCB0byBwbGF5XG4gICAgICogQHBhcmFtIHtvYmplY3R9IGluc3RhbmNlIC0gU2VsZWN0b3IgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBwbGF5RmlsZShmaWxlSWQsIGluc3RhbmNlKSB7XG4gICAgICAgIC8vIEdldCBmaWxlIHJlY29yZCB0byBnZXQgdGhlIHBhdGhcbiAgICAgICAgU291bmRGaWxlc0FQSS5nZXRSZWNvcmQoZmlsZUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLnBhdGgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRseVBsYXlpbmdJZCA9IGZpbGVJZDtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IGAvcGJ4Y29yZS9hcGkvdjMvc291bmQtZmlsZXM6cGxheWJhY2s/dmlldz0ke2VuY29kZVVSSUNvbXBvbmVudChyZXNwb25zZS5kYXRhLnBhdGgpfWA7XG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmYWlsZWQgdG8gZ2V0IGZpbGUgaW5mbywgcmV2ZXJ0IGljb24gYmFjayB0byBwbGF5XG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLnBsYXlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU3RvcCBhdWRpbyBwbGF5YmFja1xuICAgICAqL1xuICAgIHN0b3BQbGF5YmFjaygpIHtcbiAgICAgICAgaWYgKHRoaXMuYXVkaW9QbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIucGF1c2UoKTtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIuY3VycmVudFRpbWUgPSAwO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aGlzLmN1cnJlbnRseVBsYXlpbmdJZCA9IG51bGw7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgYWxsIHBsYXkgYnV0dG9ucyBiYWNrIHRvIHBsYXkgaWNvblxuICAgICAgICB0aGlzLmluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSkgPT4ge1xuICAgICAgICAgICAgaWYgKGluc3RhbmNlLnBsYXlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwbGF5IGJ1dHRvbiBzdGF0ZSBiYXNlZCBvbiBjdXJyZW50IHNlbGVjdGlvblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgdXBkYXRlUGxheUJ1dHRvblN0YXRlKGluc3RhbmNlKSB7XG4gICAgICAgIGlmICghaW5zdGFuY2UucGxheUJ1dHRvbiB8fCAhaW5zdGFuY2UucGxheUJ1dHRvbi5sZW5ndGgpIHJldHVybjtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHsgY3VycmVudFZhbHVlIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY3VycmVudFZhbHVlIHx8IGN1cnJlbnRWYWx1ZSA9PT0gJycgfHwgY3VycmVudFZhbHVlID09PSAnLScpIHtcbiAgICAgICAgICAgIC8vIERpc2FibGUgYnV0dG9uIGFuZCBlbnN1cmUgcGxheSBpY29uXG4gICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEVuYWJsZSBidXR0b25cbiAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNldCBhcHByb3ByaWF0ZSBpY29uIGJhc2VkIG9uIHBsYXliYWNrIHN0YXRlXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPT09IGN1cnJlbnRWYWx1ZSAmJiAhdGhpcy5hdWRpb1BsYXllci5wYXVzZWQpIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBTZXQgdmFsdWUgcHJvZ3JhbW1hdGljYWxseVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBWYWx1ZSB0byBzZXRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIERpc3BsYXkgdGV4dCAob3B0aW9uYWwpXG4gICAgICovXG4gICAgc2V0VmFsdWUoZmllbGRJZCwgdmFsdWUsIHRleHQgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVzZSBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHRvIHNldCB0aGUgdmFsdWVcbiAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5zZXRWYWx1ZShmaWVsZElkLCB2YWx1ZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2Ugc3RhdGVcbiAgICAgICAgaW5zdGFuY2UuY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gdGV4dCB8fCAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwbGF5IGJ1dHRvbiBzdGF0ZVxuICAgICAgICB0aGlzLnVwZGF0ZVBsYXlCdXR0b25TdGF0ZShpbnN0YW5jZSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCB2YWx1ZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IEN1cnJlbnQgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRWYWx1ZShmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICByZXR1cm4gaW5zdGFuY2UgPyBpbnN0YW5jZS5jdXJyZW50VmFsdWUgOiBudWxsO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCBkcm9wZG93biBkYXRhXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIHJlZnJlc2goZmllbGRJZCkge1xuICAgICAgICAvLyBEZWxlZ2F0ZSB0byBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIC8vIChEeW5hbWljRHJvcGRvd25CdWlsZGVyIHdvdWxkIG5lZWQgYSByZWZyZXNoIG1ldGhvZClcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICRkcm9wZG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZXN0cm95IGluc3RhbmNlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGRlc3Ryb3koZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKGluc3RhbmNlKSB7XG4gICAgICAgICAgICAvLyBTdG9wIHBsYXliYWNrIGlmIHBsYXlpbmdcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRseVBsYXlpbmdJZCA9PT0gaW5zdGFuY2UuY3VycmVudFZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdG9wUGxheWJhY2soKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGV2ZW50IGhhbmRsZXJzXG4gICAgICAgICAgICBpZiAoaW5zdGFuY2UucGxheUJ1dHRvbikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24ub2ZmKCdjbGljaycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgZnJvbSBpbnN0YW5jZXNcbiAgICAgICAgICAgIHRoaXMuaW5zdGFuY2VzLmRlbGV0ZShmaWVsZElkKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2xlYXIgZHJvcGRvd24gc2VsZWN0aW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqL1xuICAgIGNsZWFyKGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgLy8gVXNlIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIgdG8gY2xlYXJcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXIoZmllbGRJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBpbnN0YW5jZSBzdGF0ZVxuICAgICAgICAgICAgaW5zdGFuY2UuY3VycmVudFZhbHVlID0gbnVsbDtcbiAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gbnVsbDtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHBsYXkgYnV0dG9uIHN0YXRlXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBsYXlCdXR0b25TdGF0ZShpbnN0YW5jZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGNhY2hlIGZvciBzb3VuZCBmaWxlcyBBUElcbiAgICAgKiBDYWxsIHRoaXMgYWZ0ZXIgc291bmQgZmlsZSBvcGVyYXRpb25zIChhZGQvZWRpdC9kZWxldGUpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IC0gT3B0aW9uYWw6IHNwZWNpZmljIGNhdGVnb3J5IHRvIGNsZWFyICgnY3VzdG9tJywgJ21vaCcpXG4gICAgICovXG4gICAgY2xlYXJDYWNoZShjYXRlZ29yeSA9IG51bGwpIHtcbiAgICAgICAgaWYgKGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAvLyBDbGVhciBjYWNoZSBmb3Igc3BlY2lmaWMgY2F0ZWdvcnlcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXJDYWNoZUZvcignL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzOmdldEZvclNlbGVjdCcsIHsgY2F0ZWdvcnkgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDbGVhciBhbGwgc291bmQgZmlsZXMgY2FjaGVcbiAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXJDYWNoZUZvcignL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzOmdldEZvclNlbGVjdCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZWZyZXNoIGFsbCBzb3VuZCBmaWxlIGRyb3Bkb3ducyBvbiB0aGUgcGFnZVxuICAgICAqIFRoaXMgd2lsbCBmb3JjZSB0aGVtIHRvIHJlbG9hZCBkYXRhIGZyb20gc2VydmVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNhdGVnb3J5IC0gT3B0aW9uYWw6IHNwZWNpZmljIGNhdGVnb3J5IHRvIHJlZnJlc2ggKCdjdXN0b20nLCAnbW9oJylcbiAgICAgKi9cbiAgICByZWZyZXNoQWxsKGNhdGVnb3J5ID0gbnVsbCkge1xuICAgICAgICAvLyBDbGVhciBjYWNoZSBmaXJzdFxuICAgICAgICB0aGlzLmNsZWFyQ2FjaGUoY2F0ZWdvcnkpO1xuICAgICAgICBcbiAgICAgICAgLy8gUmVmcmVzaCBlYWNoIGFjdGl2ZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5mb3JFYWNoKChpbnN0YW5jZSwgZmllbGRJZCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFjYXRlZ29yeSB8fCBpbnN0YW5jZS5jb25maWcuY2F0ZWdvcnkgPT09IGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgZHJvcGRvd24gYW5kIHJlbG9hZFxuICAgICAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuY2xlYXIoZmllbGRJZCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVpbml0aWFsaXplIGRyb3Bkb3duIHRvIHRyaWdnZXIgbmV3IEFQSSByZXF1ZXN0XG4gICAgICAgICAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07Il19