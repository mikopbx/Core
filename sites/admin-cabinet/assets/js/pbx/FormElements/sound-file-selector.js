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
        var apiUrl = "/pbxcore/api/v3/sound-files:playback?view=".concat(encodeURIComponent(response.data.path)); // Load authenticated audio source

        _this4.loadAuthenticatedAudio(apiUrl, instance);
      } else {
        // If failed to get file info, revert icon back to play
        if (instance.playButton) {
          instance.playButton.find('i').removeClass('pause').addClass('play');
        }
      }
    });
  },

  /**
   * Load audio from authenticated API endpoint
   *
   * @param {string} apiUrl - API URL requiring Bearer token
   * @param {object} instance - Selector instance
   */
  loadAuthenticatedAudio: function loadAuthenticatedAudio(apiUrl, instance) {
    var _this5 = this;

    // Build full URL
    var fullUrl;

    if (apiUrl.startsWith('http')) {
      fullUrl = apiUrl;
    } else if (apiUrl.startsWith('/pbxcore/')) {
      // API path - use base URL without admin-cabinet path
      var baseUrl = window.location.origin;
      fullUrl = "".concat(baseUrl).concat(apiUrl);
    } else {
      fullUrl = "".concat(globalRootUrl).concat(apiUrl.replace(/^\//, ''));
    } // Prepare headers with Bearer token


    var headers = {
      'X-Requested-With': 'XMLHttpRequest'
    };

    if (typeof TokenManager !== 'undefined' && TokenManager.accessToken) {
      headers['Authorization'] = "Bearer ".concat(TokenManager.accessToken);
    } // Fetch audio file with authentication


    fetch(fullUrl, {
      headers: headers
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP ".concat(response.status, ": ").concat(response.statusText));
      } // Extract duration from header if available


      var duration = response.headers.get('X-Audio-Duration');

      if (duration) {
        console.log("Audio duration: ".concat(duration, "s"));
      }

      return response.blob();
    }).then(function (blob) {
      // Revoke previous blob URL if exists
      if (_this5.audioPlayer.src && _this5.audioPlayer.src.startsWith('blob:')) {
        URL.revokeObjectURL(_this5.audioPlayer.src);
      } // Create and set new blob URL


      var blobUrl = URL.createObjectURL(blob);
      _this5.audioPlayer.src = blobUrl; // Play audio

      _this5.audioPlayer.play()["catch"](function (error) {
        console.error('Audio playback failed:', error);

        _this5.stopPlayback();
      });
    })["catch"](function (error) {
      console.error('Failed to load audio:', error);

      _this5.stopPlayback(); // Revert play button icon


      if (instance.playButton) {
        instance.playButton.find('i').removeClass('pause').addClass('play');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Gb3JtRWxlbWVudHMvc291bmQtZmlsZS1zZWxlY3Rvci5qcyJdLCJuYW1lcyI6WyJTb3VuZEZpbGVTZWxlY3RvciIsImluc3RhbmNlcyIsIk1hcCIsImF1ZGlvUGxheWVyIiwiY3VycmVudGx5UGxheWluZ0lkIiwiZGVmYXVsdHMiLCJjYXRlZ29yeSIsImluY2x1ZGVFbXB0eSIsInBsYWNlaG9sZGVyIiwic2hvd1BsYXlCdXR0b24iLCJzaG93QWRkQnV0dG9uIiwib25DaGFuZ2UiLCJvblBsYXkiLCJpbml0IiwiZmllbGRJZCIsIm9wdGlvbnMiLCJoYXMiLCJnZXQiLCIkaGlkZGVuSW5wdXQiLCIkIiwibGVuZ3RoIiwiY29uZmlnIiwiY3VycmVudFZhbHVlIiwiZGF0YSIsInZhbCIsImRlZmF1bHRWYWx1ZSIsImN1cnJlbnRUZXh0IiwiZGV0ZWN0SW5pdGlhbFRleHQiLCJkcm9wZG93bkNvbmZpZyIsImFwaVVybCIsImFwaVBhcmFtcyIsImdsb2JhbFRyYW5zbGF0ZSIsInNmX1NlbGVjdEF1ZGlvRmlsZSIsInZhbHVlIiwidGV4dCIsIiRjaG9pY2UiLCJoYW5kbGVTZWxlY3Rpb25DaGFuZ2UiLCJkcm9wZG93bkRhdGEiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsImluc3RhbmNlIiwicGxheUJ1dHRvbiIsImFkZEJ1dHRvbiIsImluaXRpYWxpemVBdWRpb0ZlYXR1cmVzIiwic2V0IiwiJGRyb3Bkb3duIiwiJHRleHQiLCJmaW5kIiwidHJpbSIsImh0bWwiLCJ1cGRhdGVQbGF5QnV0dG9uU3RhdGUiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJpbml0aWFsaXplQXVkaW9QbGF5ZXIiLCJpbml0aWFsaXplQnV0dG9ucyIsIiRidXR0b25Db250YWluZXIiLCJjbG9zZXN0IiwiZmlyc3QiLCJvZmYiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsImhhbmRsZVBsYXlDbGljayIsImRvY3VtZW50IiwiY3JlYXRlRWxlbWVudCIsInByZWxvYWQiLCJzdHlsZSIsImRpc3BsYXkiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJhZGRFdmVudExpc3RlbmVyIiwic3RvcFBsYXliYWNrIiwicGF1c2VkIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInBsYXlGaWxlIiwiZmlsZUlkIiwiU291bmRGaWxlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVzdWx0IiwicGF0aCIsImVuY29kZVVSSUNvbXBvbmVudCIsImxvYWRBdXRoZW50aWNhdGVkQXVkaW8iLCJmdWxsVXJsIiwic3RhcnRzV2l0aCIsImJhc2VVcmwiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsIm9yaWdpbiIsImdsb2JhbFJvb3RVcmwiLCJyZXBsYWNlIiwiaGVhZGVycyIsIlRva2VuTWFuYWdlciIsImFjY2Vzc1Rva2VuIiwiZmV0Y2giLCJ0aGVuIiwib2siLCJFcnJvciIsInN0YXR1cyIsInN0YXR1c1RleHQiLCJkdXJhdGlvbiIsImNvbnNvbGUiLCJsb2ciLCJibG9iIiwic3JjIiwiVVJMIiwicmV2b2tlT2JqZWN0VVJMIiwiYmxvYlVybCIsImNyZWF0ZU9iamVjdFVSTCIsInBsYXkiLCJlcnJvciIsInBhdXNlIiwiY3VycmVudFRpbWUiLCJmb3JFYWNoIiwic2V0VmFsdWUiLCJnZXRWYWx1ZSIsInJlZnJlc2giLCJkcm9wZG93biIsImRlc3Ryb3kiLCJjbGVhciIsImNsZWFyQ2FjaGUiLCJjbGVhckNhY2hlRm9yIiwicmVmcmVzaEFsbCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGlCQUFpQixHQUFHO0FBRXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQUFJQyxHQUFKLEVBTlc7O0FBUXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFdBQVcsRUFBRSxJQVpTOztBQWN0QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxrQkFBa0IsRUFBRSxJQWxCRTs7QUFvQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRTtBQUNOQyxJQUFBQSxRQUFRLEVBQUUsUUFESjtBQUNvQjtBQUMxQkMsSUFBQUEsWUFBWSxFQUFFLElBRlI7QUFFb0I7QUFDMUJDLElBQUFBLFdBQVcsRUFBRSxJQUhQO0FBR29CO0FBQzFCQyxJQUFBQSxjQUFjLEVBQUUsSUFKVjtBQUlvQjtBQUMxQkMsSUFBQUEsYUFBYSxFQUFFLElBTFQ7QUFLb0I7QUFDMUJDLElBQUFBLFFBQVEsRUFBRSxJQU5KO0FBTW9CO0FBQzFCQyxJQUFBQSxNQUFNLEVBQUUsSUFQRixDQU9tQjs7QUFQbkIsR0F4Qlk7O0FBa0N0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxJQXpDc0IsZ0JBeUNqQkMsT0F6Q2lCLEVBeUNNO0FBQUE7O0FBQUEsUUFBZEMsT0FBYyx1RUFBSixFQUFJOztBQUN4QjtBQUNBLFFBQUksS0FBS2QsU0FBTCxDQUFlZSxHQUFmLENBQW1CRixPQUFuQixDQUFKLEVBQWlDO0FBQzdCLGFBQU8sS0FBS2IsU0FBTCxDQUFlZ0IsR0FBZixDQUFtQkgsT0FBbkIsQ0FBUDtBQUNILEtBSnVCLENBTXhCOzs7QUFDQSxRQUFNSSxZQUFZLEdBQUdDLENBQUMsWUFBS0wsT0FBTCxFQUF0Qjs7QUFDQSxRQUFJLENBQUNJLFlBQVksQ0FBQ0UsTUFBbEIsRUFBMEI7QUFDdEIsYUFBTyxJQUFQO0FBQ0gsS0FWdUIsQ0FZeEI7OztBQUNBLFFBQU1DLE1BQU0sbUNBQVEsS0FBS2hCLFFBQWIsR0FBMEJVLE9BQTFCLENBQVosQ0Fid0IsQ0FleEI7OztBQUNBLFFBQU1PLFlBQVksR0FBSVAsT0FBTyxDQUFDUSxJQUFSLElBQWdCUixPQUFPLENBQUNRLElBQVIsQ0FBYVQsT0FBYixDQUFqQixJQUEyQ0ksWUFBWSxDQUFDTSxHQUFiLEVBQTNDLElBQWlFSCxNQUFNLENBQUNJLFlBQXhFLElBQXdGLEVBQTdHO0FBQ0EsUUFBTUMsV0FBVyxHQUFHLEtBQUtDLGlCQUFMLENBQXVCYixPQUF2QixFQUFnQ0MsT0FBTyxDQUFDUSxJQUF4QyxLQUFpREYsTUFBTSxDQUFDYixXQUE1RSxDQWpCd0IsQ0FtQnhCOztBQUNBLFFBQU1vQixjQUFjLEdBQUc7QUFDbkJDLE1BQUFBLE1BQU0sNENBRGE7QUFFbkJDLE1BQUFBLFNBQVMsRUFBRTtBQUNQeEIsUUFBQUEsUUFBUSxFQUFFZSxNQUFNLENBQUNmLFFBRFY7QUFFUEMsUUFBQUEsWUFBWSxFQUFFYyxNQUFNLENBQUNkLFlBQVAsR0FBc0IsTUFBdEIsR0FBK0I7QUFGdEMsT0FGUTtBQU1uQkMsTUFBQUEsV0FBVyxFQUFFYSxNQUFNLENBQUNiLFdBQVAsSUFBc0J1QixlQUFlLENBQUNDLGtCQU5oQztBQU9uQnJCLE1BQUFBLFFBQVEsRUFBRSxrQkFBQ3NCLEtBQUQsRUFBUUMsSUFBUixFQUFjQyxPQUFkLEVBQTBCO0FBQ2hDLFFBQUEsS0FBSSxDQUFDQyxxQkFBTCxDQUEyQnRCLE9BQTNCLEVBQW9DbUIsS0FBcEMsRUFBMkNDLElBQTNDLEVBQWlEQyxPQUFqRCxFQUEwRGQsTUFBMUQ7QUFDSDtBQVRrQixLQUF2QixDQXBCd0IsQ0FnQ3hCOztBQUNBLFFBQU1nQixZQUFZLHVCQUNidkIsT0FEYSxFQUNIUSxZQURHLENBQWxCLENBakN3QixDQXFDeEI7OztBQUNBLFFBQUlBLFlBQVksSUFBSUksV0FBcEIsRUFBaUM7QUFDN0JXLE1BQUFBLFlBQVksV0FBSXZCLE9BQUosZ0JBQVosR0FBdUNZLFdBQXZDO0FBQ0g7O0FBR0RZLElBQUFBLHNCQUFzQixDQUFDQyxhQUF2QixDQUFxQ3pCLE9BQXJDLEVBQThDdUIsWUFBOUMsRUFBNERULGNBQTVELEVBM0N3QixDQTZDeEI7O0FBQ0EsUUFBTVksUUFBUSxHQUFHO0FBQ2IxQixNQUFBQSxPQUFPLEVBQVBBLE9BRGE7QUFFYk8sTUFBQUEsTUFBTSxFQUFOQSxNQUZhO0FBR2JDLE1BQUFBLFlBQVksRUFBWkEsWUFIYTtBQUliSSxNQUFBQSxXQUFXLEVBQVhBLFdBSmE7QUFLYlIsTUFBQUEsWUFBWSxFQUFaQSxZQUxhO0FBTWJ1QixNQUFBQSxVQUFVLEVBQUUsSUFOQztBQU9iQyxNQUFBQSxTQUFTLEVBQUU7QUFQRSxLQUFqQixDQTlDd0IsQ0F3RHhCOztBQUNBLFNBQUtDLHVCQUFMLENBQTZCSCxRQUE3QixFQXpEd0IsQ0EyRHhCOztBQUNBLFNBQUt2QyxTQUFMLENBQWUyQyxHQUFmLENBQW1COUIsT0FBbkIsRUFBNEIwQixRQUE1QjtBQUVBLFdBQU9BLFFBQVA7QUFDSCxHQXhHcUI7O0FBMEd0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJYixFQUFBQSxpQkFqSHNCLDZCQWlISmIsT0FqSEksRUFpSEtTLElBakhMLEVBaUhXO0FBQzdCLFFBQUlBLElBQUksSUFBSUEsSUFBSSxXQUFJVCxPQUFKLGdCQUFoQixFQUEwQztBQUN0QyxhQUFPUyxJQUFJLFdBQUlULE9BQUosZ0JBQVg7QUFDSCxLQUg0QixDQUs3Qjs7O0FBQ0EsUUFBTStCLFNBQVMsR0FBRzFCLENBQUMsWUFBS0wsT0FBTCxlQUFuQjs7QUFDQSxRQUFJK0IsU0FBUyxDQUFDekIsTUFBZCxFQUFzQjtBQUNsQixVQUFNMEIsS0FBSyxHQUFHRCxTQUFTLENBQUNFLElBQVYsQ0FBZSxxQkFBZixDQUFkOztBQUNBLFVBQUlELEtBQUssQ0FBQzFCLE1BQU4sSUFBZ0IwQixLQUFLLENBQUNaLElBQU4sR0FBYWMsSUFBYixFQUFwQixFQUF5QztBQUNyQyxlQUFPRixLQUFLLENBQUNHLElBQU4sRUFBUDtBQUNIO0FBQ0o7O0FBRUQsV0FBTyxJQUFQO0FBQ0gsR0FoSXFCOztBQWtJdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0liLEVBQUFBLHFCQTNJc0IsaUNBMklBdEIsT0EzSUEsRUEySVNtQixLQTNJVCxFQTJJZ0JDLElBM0loQixFQTJJc0JDLE9BM0l0QixFQTJJK0JkLE1BM0kvQixFQTJJdUM7QUFDekQsUUFBTW1CLFFBQVEsR0FBRyxLQUFLdkMsU0FBTCxDQUFlZ0IsR0FBZixDQUFtQkgsT0FBbkIsQ0FBakI7QUFDQSxRQUFJLENBQUMwQixRQUFMLEVBQWUsT0FGMEMsQ0FJekQ7O0FBQ0FBLElBQUFBLFFBQVEsQ0FBQ2xCLFlBQVQsR0FBd0JXLEtBQXhCO0FBQ0FPLElBQUFBLFFBQVEsQ0FBQ2QsV0FBVCxHQUF1QlEsSUFBdkIsQ0FOeUQsQ0FRekQ7O0FBQ0EsUUFBTWhCLFlBQVksR0FBR0MsQ0FBQyxZQUFLTCxPQUFMLEVBQXRCOztBQUNBLFFBQUlJLFlBQVksQ0FBQ0UsTUFBakIsRUFBeUI7QUFDckJGLE1BQUFBLFlBQVksQ0FBQ00sR0FBYixDQUFpQlMsS0FBakI7QUFDSCxLQVp3RCxDQWN6RDs7O0FBQ0EsU0FBS2lCLHFCQUFMLENBQTJCVixRQUEzQixFQWZ5RCxDQWlCekQ7O0FBQ0EsUUFBSSxPQUFPbkIsTUFBTSxDQUFDVixRQUFkLEtBQTJCLFVBQS9CLEVBQTJDO0FBQ3ZDVSxNQUFBQSxNQUFNLENBQUNWLFFBQVAsQ0FBZ0JzQixLQUFoQixFQUF1QkMsSUFBdkIsRUFBNkJDLE9BQTdCO0FBQ0gsS0FwQndELENBc0J6RDs7O0FBQ0EsUUFBSSxPQUFPZ0IsSUFBUCxLQUFnQixXQUFoQixJQUErQkEsSUFBSSxDQUFDQyxXQUF4QyxFQUFxRDtBQUNqREQsTUFBQUEsSUFBSSxDQUFDQyxXQUFMO0FBQ0g7QUFDSixHQXJLcUI7O0FBdUt0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lULEVBQUFBLHVCQTVLc0IsbUNBNEtFSCxRQTVLRixFQTRLWTtBQUM5QjtBQUNBLFNBQUthLHFCQUFMLEdBRjhCLENBSTlCOztBQUNBLFNBQUtDLGlCQUFMLENBQXVCZCxRQUF2QixFQUw4QixDQU85Qjs7QUFDQSxTQUFLVSxxQkFBTCxDQUEyQlYsUUFBM0I7QUFDSCxHQXJMcUI7O0FBd0x0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0ljLEVBQUFBLGlCQTdMc0IsNkJBNkxKZCxRQTdMSSxFQTZMTTtBQUFBOztBQUN4QixRQUFRMUIsT0FBUixHQUE0QjBCLFFBQTVCLENBQVExQixPQUFSO0FBQUEsUUFBaUJPLE1BQWpCLEdBQTRCbUIsUUFBNUIsQ0FBaUJuQixNQUFqQixDQUR3QixDQUd4Qjs7QUFDQSxRQUFNd0IsU0FBUyxHQUFHMUIsQ0FBQyxZQUFLTCxPQUFMLGVBQW5CO0FBQ0EsUUFBSSxDQUFDK0IsU0FBUyxDQUFDekIsTUFBZixFQUF1QixPQUxDLENBT3hCOztBQUNBLFFBQUltQyxnQkFBZ0IsR0FBR1YsU0FBUyxDQUFDVyxPQUFWLENBQWtCLHFCQUFsQixFQUF5Q1QsSUFBekMsQ0FBOEMsYUFBOUMsQ0FBdkIsQ0FSd0IsQ0FVeEI7O0FBQ0EsUUFBSSxDQUFDUSxnQkFBZ0IsQ0FBQ25DLE1BQXRCLEVBQThCO0FBQzFCbUMsTUFBQUEsZ0JBQWdCLEdBQUdWLFNBQVMsQ0FBQ1csT0FBVixDQUFrQixRQUFsQixFQUE0QlQsSUFBNUIsQ0FBaUMsYUFBakMsQ0FBbkI7QUFDSDs7QUFFRCxRQUFJUSxnQkFBZ0IsQ0FBQ25DLE1BQWpCLEdBQTBCLENBQTlCLEVBQWlDO0FBQzdCO0FBQ0EsVUFBSUMsTUFBTSxDQUFDWixjQUFYLEVBQTJCO0FBQ3ZCK0IsUUFBQUEsUUFBUSxDQUFDQyxVQUFULEdBQXNCYyxnQkFBZ0IsQ0FBQ1IsSUFBakIsQ0FBc0IseUJBQXRCLEVBQWlEVSxLQUFqRCxFQUF0Qjs7QUFFQSxZQUFJakIsUUFBUSxDQUFDQyxVQUFULENBQW9CckIsTUFBcEIsR0FBNkIsQ0FBakMsRUFBb0M7QUFDaENvQixVQUFBQSxRQUFRLENBQUNDLFVBQVQsQ0FBb0JpQixHQUFwQixDQUF3QixPQUF4QixFQUFpQ0MsRUFBakMsQ0FBb0MsT0FBcEMsRUFBNkMsVUFBQ0MsQ0FBRCxFQUFPO0FBQ2hEQSxZQUFBQSxDQUFDLENBQUNDLGNBQUY7O0FBQ0EsWUFBQSxNQUFJLENBQUNDLGVBQUwsQ0FBcUJ0QixRQUFyQjtBQUNILFdBSEQ7QUFJSDtBQUNKLE9BWDRCLENBYTdCOzs7QUFDQSxVQUFJbkIsTUFBTSxDQUFDWCxhQUFYLEVBQTBCO0FBQ3RCOEIsUUFBQUEsUUFBUSxDQUFDRSxTQUFULEdBQXFCYSxnQkFBZ0IsQ0FBQ1IsSUFBakIsQ0FBc0IsK0JBQXRCLEVBQXVEVSxLQUF2RCxFQUFyQjtBQUNIO0FBQ0o7QUFDSixHQTlOcUI7O0FBZ090QjtBQUNKO0FBQ0E7QUFDSUosRUFBQUEscUJBbk9zQixtQ0FtT0U7QUFBQTs7QUFDcEIsUUFBSSxDQUFDLEtBQUtsRCxXQUFWLEVBQXVCO0FBQ25CLFdBQUtBLFdBQUwsR0FBbUI0RCxRQUFRLENBQUNDLGFBQVQsQ0FBdUIsT0FBdkIsQ0FBbkI7QUFDQSxXQUFLN0QsV0FBTCxDQUFpQjhELE9BQWpCLEdBQTJCLE1BQTNCO0FBQ0EsV0FBSzlELFdBQUwsQ0FBaUIrRCxLQUFqQixDQUF1QkMsT0FBdkIsR0FBaUMsTUFBakM7QUFDQUosTUFBQUEsUUFBUSxDQUFDSyxJQUFULENBQWNDLFdBQWQsQ0FBMEIsS0FBS2xFLFdBQS9CLEVBSm1CLENBTW5COztBQUNBLFdBQUtBLFdBQUwsQ0FBaUJtRSxnQkFBakIsQ0FBa0MsT0FBbEMsRUFBMkMsWUFBTTtBQUM3QyxRQUFBLE1BQUksQ0FBQ0MsWUFBTDtBQUNILE9BRkQ7QUFJQSxXQUFLcEUsV0FBTCxDQUFpQm1FLGdCQUFqQixDQUFrQyxPQUFsQyxFQUEyQyxVQUFDVixDQUFELEVBQU87QUFDOUMsUUFBQSxNQUFJLENBQUNXLFlBQUw7QUFDSCxPQUZEO0FBR0g7QUFDSixHQW5QcUI7O0FBcVB0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lULEVBQUFBLGVBMVBzQiwyQkEwUE50QixRQTFQTSxFQTBQSTtBQUN0QixRQUFRbEIsWUFBUixHQUE2Q2tCLFFBQTdDLENBQVFsQixZQUFSO0FBQUEsUUFBc0JELE1BQXRCLEdBQTZDbUIsUUFBN0MsQ0FBc0JuQixNQUF0QjtBQUFBLFFBQThCb0IsVUFBOUIsR0FBNkNELFFBQTdDLENBQThCQyxVQUE5Qjs7QUFFQSxRQUFJLENBQUNuQixZQUFELElBQWlCQSxZQUFZLEtBQUssSUFBbEMsSUFBMENBLFlBQVksS0FBSyxDQUFDLENBQWhFLEVBQW1FO0FBQy9EO0FBQ0gsS0FMcUIsQ0FPdEI7OztBQUNBLFFBQUksS0FBS2xCLGtCQUFMLEtBQTRCa0IsWUFBNUIsSUFBNEMsQ0FBQyxLQUFLbkIsV0FBTCxDQUFpQnFFLE1BQWxFLEVBQTBFO0FBQ3RFLFdBQUtELFlBQUw7QUFDQTtBQUNILEtBWHFCLENBYXRCOzs7QUFDQSxTQUFLQSxZQUFMLEdBZHNCLENBZ0J0Qjs7QUFDQSxRQUFJOUIsVUFBSixFQUFnQjtBQUNaQSxNQUFBQSxVQUFVLENBQUNNLElBQVgsQ0FBZ0IsR0FBaEIsRUFBcUIwQixXQUFyQixDQUFpQyxNQUFqQyxFQUF5Q0MsUUFBekMsQ0FBa0QsT0FBbEQ7QUFDSCxLQW5CcUIsQ0FxQnRCOzs7QUFDQSxTQUFLQyxRQUFMLENBQWNyRCxZQUFkLEVBQTRCa0IsUUFBNUIsRUF0QnNCLENBd0J0Qjs7QUFDQSxRQUFJLE9BQU9uQixNQUFNLENBQUNULE1BQWQsS0FBeUIsVUFBN0IsRUFBeUM7QUFDckNTLE1BQUFBLE1BQU0sQ0FBQ1QsTUFBUCxDQUFjVSxZQUFkO0FBQ0g7QUFDSixHQXRScUI7O0FBd1J0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXFELEVBQUFBLFFBOVJzQixvQkE4UmJDLE1BOVJhLEVBOFJMcEMsUUE5UkssRUE4Uks7QUFBQTs7QUFDdkI7QUFDQXFDLElBQUFBLGFBQWEsQ0FBQ0MsU0FBZCxDQUF3QkYsTUFBeEIsRUFBZ0MsVUFBQ0csUUFBRCxFQUFjO0FBQzFDLFVBQUlBLFFBQVEsQ0FBQ0MsTUFBVCxJQUFtQkQsUUFBUSxDQUFDeEQsSUFBNUIsSUFBb0N3RCxRQUFRLENBQUN4RCxJQUFULENBQWMwRCxJQUF0RCxFQUE0RDtBQUN4RCxRQUFBLE1BQUksQ0FBQzdFLGtCQUFMLEdBQTBCd0UsTUFBMUI7QUFDQSxZQUFNL0MsTUFBTSx1REFBZ0RxRCxrQkFBa0IsQ0FBQ0gsUUFBUSxDQUFDeEQsSUFBVCxDQUFjMEQsSUFBZixDQUFsRSxDQUFaLENBRndELENBSXhEOztBQUNBLFFBQUEsTUFBSSxDQUFDRSxzQkFBTCxDQUE0QnRELE1BQTVCLEVBQW9DVyxRQUFwQztBQUNILE9BTkQsTUFNTztBQUNIO0FBQ0EsWUFBSUEsUUFBUSxDQUFDQyxVQUFiLEVBQXlCO0FBQ3JCRCxVQUFBQSxRQUFRLENBQUNDLFVBQVQsQ0FBb0JNLElBQXBCLENBQXlCLEdBQXpCLEVBQThCMEIsV0FBOUIsQ0FBMEMsT0FBMUMsRUFBbURDLFFBQW5ELENBQTRELE1BQTVEO0FBQ0g7QUFDSjtBQUNKLEtBYkQ7QUFjSCxHQTlTcUI7O0FBZ1R0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVMsRUFBQUEsc0JBdFRzQixrQ0FzVEN0RCxNQXRURCxFQXNUU1csUUF0VFQsRUFzVG1CO0FBQUE7O0FBQ3JDO0FBQ0EsUUFBSTRDLE9BQUo7O0FBQ0EsUUFBSXZELE1BQU0sQ0FBQ3dELFVBQVAsQ0FBa0IsTUFBbEIsQ0FBSixFQUErQjtBQUMzQkQsTUFBQUEsT0FBTyxHQUFHdkQsTUFBVjtBQUNILEtBRkQsTUFFTyxJQUFJQSxNQUFNLENBQUN3RCxVQUFQLENBQWtCLFdBQWxCLENBQUosRUFBb0M7QUFDdkM7QUFDQSxVQUFNQyxPQUFPLEdBQUdDLE1BQU0sQ0FBQ0MsUUFBUCxDQUFnQkMsTUFBaEM7QUFDQUwsTUFBQUEsT0FBTyxhQUFNRSxPQUFOLFNBQWdCekQsTUFBaEIsQ0FBUDtBQUNILEtBSk0sTUFJQTtBQUNIdUQsTUFBQUEsT0FBTyxhQUFNTSxhQUFOLFNBQXNCN0QsTUFBTSxDQUFDOEQsT0FBUCxDQUFlLEtBQWYsRUFBc0IsRUFBdEIsQ0FBdEIsQ0FBUDtBQUNILEtBWG9DLENBYXJDOzs7QUFDQSxRQUFNQyxPQUFPLEdBQUc7QUFDWiwwQkFBb0I7QUFEUixLQUFoQjs7QUFJQSxRQUFJLE9BQU9DLFlBQVAsS0FBd0IsV0FBeEIsSUFBdUNBLFlBQVksQ0FBQ0MsV0FBeEQsRUFBcUU7QUFDakVGLE1BQUFBLE9BQU8sQ0FBQyxlQUFELENBQVAsb0JBQXFDQyxZQUFZLENBQUNDLFdBQWxEO0FBQ0gsS0FwQm9DLENBc0JyQzs7O0FBQ0FDLElBQUFBLEtBQUssQ0FBQ1gsT0FBRCxFQUFVO0FBQUVRLE1BQUFBLE9BQU8sRUFBUEE7QUFBRixLQUFWLENBQUwsQ0FDS0ksSUFETCxDQUNVLFVBQUFqQixRQUFRLEVBQUk7QUFDZCxVQUFJLENBQUNBLFFBQVEsQ0FBQ2tCLEVBQWQsRUFBa0I7QUFDZCxjQUFNLElBQUlDLEtBQUosZ0JBQWtCbkIsUUFBUSxDQUFDb0IsTUFBM0IsZUFBc0NwQixRQUFRLENBQUNxQixVQUEvQyxFQUFOO0FBQ0gsT0FIYSxDQUtkOzs7QUFDQSxVQUFNQyxRQUFRLEdBQUd0QixRQUFRLENBQUNhLE9BQVQsQ0FBaUIzRSxHQUFqQixDQUFxQixrQkFBckIsQ0FBakI7O0FBQ0EsVUFBSW9GLFFBQUosRUFBYztBQUNWQyxRQUFBQSxPQUFPLENBQUNDLEdBQVIsMkJBQStCRixRQUEvQjtBQUNIOztBQUVELGFBQU90QixRQUFRLENBQUN5QixJQUFULEVBQVA7QUFDSCxLQWJMLEVBY0tSLElBZEwsQ0FjVSxVQUFBUSxJQUFJLEVBQUk7QUFDVjtBQUNBLFVBQUksTUFBSSxDQUFDckcsV0FBTCxDQUFpQnNHLEdBQWpCLElBQXdCLE1BQUksQ0FBQ3RHLFdBQUwsQ0FBaUJzRyxHQUFqQixDQUFxQnBCLFVBQXJCLENBQWdDLE9BQWhDLENBQTVCLEVBQXNFO0FBQ2xFcUIsUUFBQUEsR0FBRyxDQUFDQyxlQUFKLENBQW9CLE1BQUksQ0FBQ3hHLFdBQUwsQ0FBaUJzRyxHQUFyQztBQUNILE9BSlMsQ0FNVjs7O0FBQ0EsVUFBTUcsT0FBTyxHQUFHRixHQUFHLENBQUNHLGVBQUosQ0FBb0JMLElBQXBCLENBQWhCO0FBQ0EsTUFBQSxNQUFJLENBQUNyRyxXQUFMLENBQWlCc0csR0FBakIsR0FBdUJHLE9BQXZCLENBUlUsQ0FVVjs7QUFDQSxNQUFBLE1BQUksQ0FBQ3pHLFdBQUwsQ0FBaUIyRyxJQUFqQixZQUE4QixVQUFBQyxLQUFLLEVBQUk7QUFDbkNULFFBQUFBLE9BQU8sQ0FBQ1MsS0FBUixDQUFjLHdCQUFkLEVBQXdDQSxLQUF4Qzs7QUFDQSxRQUFBLE1BQUksQ0FBQ3hDLFlBQUw7QUFDSCxPQUhEO0FBSUgsS0E3QkwsV0E4QlcsVUFBQXdDLEtBQUssRUFBSTtBQUNaVCxNQUFBQSxPQUFPLENBQUNTLEtBQVIsQ0FBYyx1QkFBZCxFQUF1Q0EsS0FBdkM7O0FBQ0EsTUFBQSxNQUFJLENBQUN4QyxZQUFMLEdBRlksQ0FJWjs7O0FBQ0EsVUFBSS9CLFFBQVEsQ0FBQ0MsVUFBYixFQUF5QjtBQUNyQkQsUUFBQUEsUUFBUSxDQUFDQyxVQUFULENBQW9CTSxJQUFwQixDQUF5QixHQUF6QixFQUE4QjBCLFdBQTlCLENBQTBDLE9BQTFDLEVBQW1EQyxRQUFuRCxDQUE0RCxNQUE1RDtBQUNIO0FBQ0osS0F0Q0w7QUF1Q0gsR0FwWHFCOztBQXVYdEI7QUFDSjtBQUNBO0FBQ0lILEVBQUFBLFlBMVhzQiwwQkEwWFA7QUFDWCxRQUFJLEtBQUtwRSxXQUFULEVBQXNCO0FBQ2xCLFdBQUtBLFdBQUwsQ0FBaUI2RyxLQUFqQjtBQUNBLFdBQUs3RyxXQUFMLENBQWlCOEcsV0FBakIsR0FBK0IsQ0FBL0I7QUFDSDs7QUFFRCxTQUFLN0csa0JBQUwsR0FBMEIsSUFBMUIsQ0FOVyxDQVFYOztBQUNBLFNBQUtILFNBQUwsQ0FBZWlILE9BQWYsQ0FBdUIsVUFBQzFFLFFBQUQsRUFBYztBQUNqQyxVQUFJQSxRQUFRLENBQUNDLFVBQWIsRUFBeUI7QUFDckJELFFBQUFBLFFBQVEsQ0FBQ0MsVUFBVCxDQUFvQk0sSUFBcEIsQ0FBeUIsR0FBekIsRUFBOEIwQixXQUE5QixDQUEwQyxPQUExQyxFQUFtREMsUUFBbkQsQ0FBNEQsTUFBNUQ7QUFDSDtBQUNKLEtBSkQ7QUFLSCxHQXhZcUI7O0FBMFl0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0l4QixFQUFBQSxxQkEvWXNCLGlDQStZQVYsUUEvWUEsRUErWVU7QUFDNUIsUUFBSSxDQUFDQSxRQUFRLENBQUNDLFVBQVYsSUFBd0IsQ0FBQ0QsUUFBUSxDQUFDQyxVQUFULENBQW9CckIsTUFBakQsRUFBeUQ7QUFFekQsUUFBUUUsWUFBUixHQUF5QmtCLFFBQXpCLENBQVFsQixZQUFSOztBQUVBLFFBQUksQ0FBQ0EsWUFBRCxJQUFpQkEsWUFBWSxLQUFLLEVBQWxDLElBQXdDQSxZQUFZLEtBQUssR0FBN0QsRUFBa0U7QUFDOUQ7QUFDQWtCLE1BQUFBLFFBQVEsQ0FBQ0MsVUFBVCxDQUFvQmlDLFFBQXBCLENBQTZCLFVBQTdCO0FBQ0FsQyxNQUFBQSxRQUFRLENBQUNDLFVBQVQsQ0FBb0JNLElBQXBCLENBQXlCLEdBQXpCLEVBQThCMEIsV0FBOUIsQ0FBMEMsT0FBMUMsRUFBbURDLFFBQW5ELENBQTRELE1BQTVEO0FBQ0gsS0FKRCxNQUlPO0FBQ0g7QUFDQWxDLE1BQUFBLFFBQVEsQ0FBQ0MsVUFBVCxDQUFvQmdDLFdBQXBCLENBQWdDLFVBQWhDLEVBRkcsQ0FJSDs7QUFDQSxVQUFJLEtBQUtyRSxrQkFBTCxLQUE0QmtCLFlBQTVCLElBQTRDLENBQUMsS0FBS25CLFdBQUwsQ0FBaUJxRSxNQUFsRSxFQUEwRTtBQUN0RWhDLFFBQUFBLFFBQVEsQ0FBQ0MsVUFBVCxDQUFvQk0sSUFBcEIsQ0FBeUIsR0FBekIsRUFBOEIwQixXQUE5QixDQUEwQyxNQUExQyxFQUFrREMsUUFBbEQsQ0FBMkQsT0FBM0Q7QUFDSCxPQUZELE1BRU87QUFDSGxDLFFBQUFBLFFBQVEsQ0FBQ0MsVUFBVCxDQUFvQk0sSUFBcEIsQ0FBeUIsR0FBekIsRUFBOEIwQixXQUE5QixDQUEwQyxPQUExQyxFQUFtREMsUUFBbkQsQ0FBNEQsTUFBNUQ7QUFDSDtBQUNKO0FBQ0osR0FuYXFCOztBQXFhdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXlDLEVBQUFBLFFBNWFzQixvQkE0YWJyRyxPQTVhYSxFQTRhSm1CLEtBNWFJLEVBNGFnQjtBQUFBLFFBQWJDLElBQWEsdUVBQU4sSUFBTTtBQUNsQyxRQUFNTSxRQUFRLEdBQUcsS0FBS3ZDLFNBQUwsQ0FBZWdCLEdBQWYsQ0FBbUJILE9BQW5CLENBQWpCOztBQUNBLFFBQUksQ0FBQzBCLFFBQUwsRUFBZTtBQUNYO0FBQ0gsS0FKaUMsQ0FNbEM7OztBQUNBRixJQUFBQSxzQkFBc0IsQ0FBQzZFLFFBQXZCLENBQWdDckcsT0FBaEMsRUFBeUNtQixLQUF6QyxFQVBrQyxDQVNsQzs7QUFDQU8sSUFBQUEsUUFBUSxDQUFDbEIsWUFBVCxHQUF3QlcsS0FBeEI7QUFDQU8sSUFBQUEsUUFBUSxDQUFDZCxXQUFULEdBQXVCUSxJQUFJLElBQUksRUFBL0IsQ0FYa0MsQ0FhbEM7O0FBQ0EsU0FBS2dCLHFCQUFMLENBQTJCVixRQUEzQjtBQUNILEdBM2JxQjs7QUE2YnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJNEUsRUFBQUEsUUFuY3NCLG9CQW1jYnRHLE9BbmNhLEVBbWNKO0FBQ2QsUUFBTTBCLFFBQVEsR0FBRyxLQUFLdkMsU0FBTCxDQUFlZ0IsR0FBZixDQUFtQkgsT0FBbkIsQ0FBakI7QUFDQSxXQUFPMEIsUUFBUSxHQUFHQSxRQUFRLENBQUNsQixZQUFaLEdBQTJCLElBQTFDO0FBQ0gsR0F0Y3FCOztBQXdjdEI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJK0YsRUFBQUEsT0E3Y3NCLG1CQTZjZHZHLE9BN2NjLEVBNmNMO0FBQ2I7QUFDQTtBQUNBLFFBQU0rQixTQUFTLEdBQUcxQixDQUFDLFlBQUtMLE9BQUwsZUFBbkI7O0FBQ0EsUUFBSStCLFNBQVMsQ0FBQ3pCLE1BQWQsRUFBc0I7QUFDbEJ5QixNQUFBQSxTQUFTLENBQUN5RSxRQUFWLENBQW1CLFNBQW5CO0FBQ0g7QUFDSixHQXBkcUI7O0FBc2R0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE9BM2RzQixtQkEyZGR6RyxPQTNkYyxFQTJkTDtBQUNiLFFBQU0wQixRQUFRLEdBQUcsS0FBS3ZDLFNBQUwsQ0FBZWdCLEdBQWYsQ0FBbUJILE9BQW5CLENBQWpCOztBQUNBLFFBQUkwQixRQUFKLEVBQWM7QUFDVjtBQUNBLFVBQUksS0FBS3BDLGtCQUFMLEtBQTRCb0MsUUFBUSxDQUFDbEIsWUFBekMsRUFBdUQ7QUFDbkQsYUFBS2lELFlBQUw7QUFDSCxPQUpTLENBTVY7OztBQUNBLFVBQUkvQixRQUFRLENBQUNDLFVBQWIsRUFBeUI7QUFDckJELFFBQUFBLFFBQVEsQ0FBQ0MsVUFBVCxDQUFvQmlCLEdBQXBCLENBQXdCLE9BQXhCO0FBQ0gsT0FUUyxDQVdWOzs7QUFDQSxXQUFLekQsU0FBTCxXQUFzQmEsT0FBdEI7QUFDSDtBQUNKLEdBM2VxQjs7QUE2ZXRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTBHLEVBQUFBLEtBbGZzQixpQkFrZmhCMUcsT0FsZmdCLEVBa2ZQO0FBQ1gsUUFBTTBCLFFBQVEsR0FBRyxLQUFLdkMsU0FBTCxDQUFlZ0IsR0FBZixDQUFtQkgsT0FBbkIsQ0FBakI7O0FBQ0EsUUFBSTBCLFFBQUosRUFBYztBQUNWO0FBQ0FGLE1BQUFBLHNCQUFzQixDQUFDa0YsS0FBdkIsQ0FBNkIxRyxPQUE3QixFQUZVLENBSVY7O0FBQ0EwQixNQUFBQSxRQUFRLENBQUNsQixZQUFULEdBQXdCLElBQXhCO0FBQ0FrQixNQUFBQSxRQUFRLENBQUNkLFdBQVQsR0FBdUIsSUFBdkIsQ0FOVSxDQVFWOztBQUNBLFdBQUt3QixxQkFBTCxDQUEyQlYsUUFBM0I7QUFDSDtBQUNKLEdBL2ZxQjs7QUFpZ0J0QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lpRixFQUFBQSxVQXRnQnNCLHdCQXNnQk07QUFBQSxRQUFqQm5ILFFBQWlCLHVFQUFOLElBQU07O0FBQ3hCLFFBQUlBLFFBQUosRUFBYztBQUNWO0FBQ0FnQyxNQUFBQSxzQkFBc0IsQ0FBQ29GLGFBQXZCLENBQXFDLDBDQUFyQyxFQUFpRjtBQUFFcEgsUUFBQUEsUUFBUSxFQUFSQTtBQUFGLE9BQWpGO0FBQ0gsS0FIRCxNQUdPO0FBQ0g7QUFDQWdDLE1BQUFBLHNCQUFzQixDQUFDb0YsYUFBdkIsQ0FBcUMsMENBQXJDO0FBQ0g7QUFDSixHQTlnQnFCOztBQWdoQnRCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFyaEJzQix3QkFxaEJNO0FBQUEsUUFBakJySCxRQUFpQix1RUFBTixJQUFNO0FBQ3hCO0FBQ0EsU0FBS21ILFVBQUwsQ0FBZ0JuSCxRQUFoQixFQUZ3QixDQUl4Qjs7QUFDQSxTQUFLTCxTQUFMLENBQWVpSCxPQUFmLENBQXVCLFVBQUMxRSxRQUFELEVBQVcxQixPQUFYLEVBQXVCO0FBQzFDLFVBQUksQ0FBQ1IsUUFBRCxJQUFha0MsUUFBUSxDQUFDbkIsTUFBVCxDQUFnQmYsUUFBaEIsS0FBNkJBLFFBQTlDLEVBQXdEO0FBQ3BEO0FBQ0FnQyxRQUFBQSxzQkFBc0IsQ0FBQ2tGLEtBQXZCLENBQTZCMUcsT0FBN0IsRUFGb0QsQ0FJcEQ7O0FBQ0EsWUFBTStCLFNBQVMsR0FBRzFCLENBQUMsWUFBS0wsT0FBTCxlQUFuQjs7QUFDQSxZQUFJK0IsU0FBUyxDQUFDekIsTUFBZCxFQUFzQjtBQUNsQnlCLFVBQUFBLFNBQVMsQ0FBQ3lFLFFBQVYsQ0FBbUIsU0FBbkI7QUFDSDtBQUNKO0FBQ0osS0FYRDtBQVlIO0FBdGlCcUIsQ0FBMUIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgJCwgZ2xvYmFsVHJhbnNsYXRlLCBTb3VuZEZpbGVzQVBJLCBGb3JtLCBEeW5hbWljRHJvcGRvd25CdWlsZGVyLCBTZWN1cml0eVV0aWxzICovXG5cbi8qKlxuICogU291bmRGaWxlU2VsZWN0b3IgLSBBdWRpby1zcGVjaWZpYyBleHRlbnNpb24gb2YgRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICogXG4gKiBUaGlzIGNvbXBvbmVudCBidWlsZHMgdXBvbiBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHRvIGFkZCBhdWRpby1zcGVjaWZpYyBmZWF0dXJlczpcbiAqIC0gQnVpbHQtaW4gYXVkaW8gcGxheWJhY2sgZnVuY3Rpb25hbGl0eVxuICogLSBQbGF5L3BhdXNlIGJ1dHRvbiBpbnRlZ3JhdGlvblxuICogLSBTdXBwb3J0IGZvciBjdXN0b20vbW9oIHNvdW5kIGZpbGUgY2F0ZWdvcmllc1xuICogLSBBdWRpbyBwcmV2aWV3IGNhcGFiaWxpdGllc1xuICogXG4gKiBVc2FnZTpcbiAqIFNvdW5kRmlsZVNlbGVjdG9yLmluaXQoJ2F1ZGlvX21lc3NhZ2VfaWQnLCB7XG4gKiAgICAgY2F0ZWdvcnk6ICdjdXN0b20nLCAgICAgICAgICAgLy8gRmlsZSBjYXRlZ29yeSAoY3VzdG9tL21vaClcbiAqICAgICBpbmNsdWRlRW1wdHk6IHRydWUsICAgICAgICAgICAvLyBTaG93IGVtcHR5IG9wdGlvblxuICogICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHsgLi4uIH0gIC8vIENoYW5nZSBjYWxsYmFja1xuICogfSk7XG4gKiBcbiAqIEBtb2R1bGUgU291bmRGaWxlU2VsZWN0b3JcbiAqL1xuY29uc3QgU291bmRGaWxlU2VsZWN0b3IgPSB7XG4gICAgXG4gICAgLyoqXG4gICAgICogQWN0aXZlIHNlbGVjdG9yIGluc3RhbmNlcyB3aXRoIGF1ZGlvIGNhcGFiaWxpdGllc1xuICAgICAqIEB0eXBlIHtNYXB9XG4gICAgICovXG4gICAgaW5zdGFuY2VzOiBuZXcgTWFwKCksXG4gICAgXG4gICAgLyoqXG4gICAgICogR2xvYmFsIGF1ZGlvIHBsYXllciBlbGVtZW50XG4gICAgICogQHR5cGUge0hUTUxBdWRpb0VsZW1lbnR8bnVsbH1cbiAgICAgKi9cbiAgICBhdWRpb1BsYXllcjogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDdXJyZW50bHkgcGxheWluZyBmaWxlIElEXG4gICAgICogQHR5cGUge3N0cmluZ3xudWxsfVxuICAgICAqL1xuICAgIGN1cnJlbnRseVBsYXlpbmdJZDogbnVsbCxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWZhdWx0IGNvbmZpZ3VyYXRpb25cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIGRlZmF1bHRzOiB7XG4gICAgICAgIGNhdGVnb3J5OiAnY3VzdG9tJywgICAgICAgLy8gU291bmQgZmlsZSBjYXRlZ29yeSAoY3VzdG9tL21vaClcbiAgICAgICAgaW5jbHVkZUVtcHR5OiB0cnVlLCAgICAgICAvLyBJbmNsdWRlIGVtcHR5L25vbmUgb3B0aW9uXG4gICAgICAgIHBsYWNlaG9sZGVyOiBudWxsLCAgICAgICAgLy8gUGxhY2Vob2xkZXIgdGV4dCAoYXV0by1kZXRlY3RlZClcbiAgICAgICAgc2hvd1BsYXlCdXR0b246IHRydWUsICAgICAvLyBTaG93IHBsYXkgYnV0dG9uXG4gICAgICAgIHNob3dBZGRCdXR0b246IHRydWUsICAgICAgLy8gU2hvdyBhZGQgbmV3IGZpbGUgYnV0dG9uXG4gICAgICAgIG9uQ2hhbmdlOiBudWxsLCAgICAgICAgICAgLy8gQ2hhbmdlIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICAgIG9uUGxheTogbnVsbCwgICAgICAgICAgICAvLyBQbGF5IGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEIChlLmcuLCAnYXVkaW9fbWVzc2FnZV9pZCcpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyB7b2JqZWN0fG51bGx9IFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgaW5pdChmaWVsZElkLCBvcHRpb25zID0ge30pIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBpbml0aWFsaXplZFxuICAgICAgICBpZiAodGhpcy5pbnN0YW5jZXMuaGFzKGZpZWxkSWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGhpZGRlbiBpbnB1dCBlbGVtZW50XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoYCMke2ZpZWxkSWR9YCk7XG4gICAgICAgIGlmICghJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIE1lcmdlIG9wdGlvbnMgd2l0aCBkZWZhdWx0c1xuICAgICAgICBjb25zdCBjb25maWcgPSB7IC4uLnRoaXMuZGVmYXVsdHMsIC4uLm9wdGlvbnMgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlIGFuZCByZXByZXNlbnQgdGV4dCBmcm9tIGRhdGEgb2JqZWN0IGlmIHByb3ZpZGVkXG4gICAgICAgIGNvbnN0IGN1cnJlbnRWYWx1ZSA9IChvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhW2ZpZWxkSWRdKSB8fCAkaGlkZGVuSW5wdXQudmFsKCkgfHwgY29uZmlnLmRlZmF1bHRWYWx1ZSB8fCAnJztcbiAgICAgICAgY29uc3QgY3VycmVudFRleHQgPSB0aGlzLmRldGVjdEluaXRpYWxUZXh0KGZpZWxkSWQsIG9wdGlvbnMuZGF0YSkgfHwgY29uZmlnLnBsYWNlaG9sZGVyO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIGNvbmZpZ3VyYXRpb24gZm9yIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgY29uc3QgZHJvcGRvd25Db25maWcgPSB7XG4gICAgICAgICAgICBhcGlVcmw6IGAvcGJ4Y29yZS9hcGkvdjMvc291bmQtZmlsZXM6Z2V0Rm9yU2VsZWN0YCxcbiAgICAgICAgICAgIGFwaVBhcmFtczoge1xuICAgICAgICAgICAgICAgIGNhdGVnb3J5OiBjb25maWcuY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgaW5jbHVkZUVtcHR5OiBjb25maWcuaW5jbHVkZUVtcHR5ID8gJ3RydWUnIDogJ2ZhbHNlJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBjb25maWcucGxhY2Vob2xkZXIgfHwgZ2xvYmFsVHJhbnNsYXRlLnNmX1NlbGVjdEF1ZGlvRmlsZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUsIHRleHQsICRjaG9pY2UpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNlbGVjdGlvbkNoYW5nZShmaWVsZElkLCB2YWx1ZSwgdGV4dCwgJGNob2ljZSwgY29uZmlnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIGRyb3Bkb3duIHVzaW5nIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgY29uc3QgZHJvcGRvd25EYXRhID0ge1xuICAgICAgICAgICAgW2ZpZWxkSWRdOiBjdXJyZW50VmFsdWVcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCByZXByZXNlbnQgdGV4dCBpZiBhdmFpbGFibGUgYW5kIHdlIGhhdmUgYSB2YWx1ZVxuICAgICAgICBpZiAoY3VycmVudFZhbHVlICYmIGN1cnJlbnRUZXh0KSB7XG4gICAgICAgICAgICBkcm9wZG93bkRhdGFbYCR7ZmllbGRJZH1fcmVwcmVzZW50YF0gPSBjdXJyZW50VGV4dDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bihmaWVsZElkLCBkcm9wZG93bkRhdGEsIGRyb3Bkb3duQ29uZmlnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENyZWF0ZSBpbnN0YW5jZSBmb3IgYXVkaW8gZnVuY3Rpb25hbGl0eVxuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHtcbiAgICAgICAgICAgIGZpZWxkSWQsXG4gICAgICAgICAgICBjb25maWcsXG4gICAgICAgICAgICBjdXJyZW50VmFsdWUsXG4gICAgICAgICAgICBjdXJyZW50VGV4dCxcbiAgICAgICAgICAgICRoaWRkZW5JbnB1dCxcbiAgICAgICAgICAgIHBsYXlCdXR0b246IG51bGwsXG4gICAgICAgICAgICBhZGRCdXR0b246IG51bGxcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYXVkaW8tc3BlY2lmaWMgZmVhdHVyZXNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQXVkaW9GZWF0dXJlcyhpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9yZSBpbnN0YW5jZVxuICAgICAgICB0aGlzLmluc3RhbmNlcy5zZXQoZmllbGRJZCwgaW5zdGFuY2UpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGV0ZWN0IGluaXRpYWwgdGV4dCBmcm9tIGRhdGEgb2JqZWN0IG9yIGRyb3Bkb3duXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkSWQgLSBGaWVsZCBJRFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRGF0YSBvYmplY3Qgd2l0aCByZXByZXNlbnQgZmllbGRzXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBJbml0aWFsIHRleHRcbiAgICAgKi9cbiAgICBkZXRlY3RJbml0aWFsVGV4dChmaWVsZElkLCBkYXRhKSB7XG4gICAgICAgIGlmIChkYXRhICYmIGRhdGFbYCR7ZmllbGRJZH1fcmVwcmVzZW50YF0pIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhW2Ake2ZpZWxkSWR9X3JlcHJlc2VudGBdO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBUcnkgdG8gZ2V0IGZyb20gZXhpc3RpbmcgZHJvcGRvd24gdGV4dFxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKGAjJHtmaWVsZElkfS1kcm9wZG93bmApO1xuICAgICAgICBpZiAoJGRyb3Bkb3duLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgJHRleHQgPSAkZHJvcGRvd24uZmluZCgnLnRleHQ6bm90KC5kZWZhdWx0KScpO1xuICAgICAgICAgICAgaWYgKCR0ZXh0Lmxlbmd0aCAmJiAkdGV4dC50ZXh0KCkudHJpbSgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICR0ZXh0Lmh0bWwoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZHJvcGRvd24gc2VsZWN0aW9uIGNoYW5nZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBTZWxlY3RlZCB2YWx1ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gU2VsZWN0ZWQgdGV4dFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkY2hvaWNlIC0gU2VsZWN0ZWQgY2hvaWNlIGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIC0gQ29uZmlndXJhdGlvblxuICAgICAqL1xuICAgIGhhbmRsZVNlbGVjdGlvbkNoYW5nZShmaWVsZElkLCB2YWx1ZSwgdGV4dCwgJGNob2ljZSwgY29uZmlnKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoIWluc3RhbmNlKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2Ugc3RhdGVcbiAgICAgICAgaW5zdGFuY2UuY3VycmVudFZhbHVlID0gdmFsdWU7XG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRUZXh0ID0gdGV4dDtcbiAgICAgICAgXG4gICAgICAgIC8vIENSSVRJQ0FMOiBVcGRhdGUgaGlkZGVuIGlucHV0IGZpZWxkIHRvIG1haW50YWluIHN5bmNocm9uaXphdGlvblxuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKGAjJHtmaWVsZElkfWApO1xuICAgICAgICBpZiAoJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwbGF5IGJ1dHRvbiBzdGF0ZVxuICAgICAgICB0aGlzLnVwZGF0ZVBsYXlCdXR0b25TdGF0ZShpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxsIGN1c3RvbSBvbkNoYW5nZSBpZiBwcm92aWRlZFxuICAgICAgICBpZiAodHlwZW9mIGNvbmZpZy5vbkNoYW5nZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY29uZmlnLm9uQ2hhbmdlKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gTm90aWZ5IGZvcm0gb2YgY2hhbmdlc1xuICAgICAgICBpZiAodHlwZW9mIEZvcm0gIT09ICd1bmRlZmluZWQnICYmIEZvcm0uZGF0YUNoYW5nZWQpIHtcbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhdWRpby1zcGVjaWZpYyBmZWF0dXJlc1xuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUF1ZGlvRmVhdHVyZXMoaW5zdGFuY2UpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBnbG9iYWwgYXVkaW8gcGxheWVyXG4gICAgICAgIHRoaXMuaW5pdGlhbGl6ZUF1ZGlvUGxheWVyKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBGaW5kIGFuZCBpbml0aWFsaXplIGJ1dHRvbnNcbiAgICAgICAgdGhpcy5pbml0aWFsaXplQnV0dG9ucyhpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaW5pdGlhbCBidXR0b24gc3RhdGVcbiAgICAgICAgdGhpcy51cGRhdGVQbGF5QnV0dG9uU3RhdGUoaW5zdGFuY2UpO1xuICAgIH0sXG4gICAgXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBjb250cm9sIGJ1dHRvbnMgKHBsYXkvYWRkKVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUJ1dHRvbnMoaW5zdGFuY2UpIHtcbiAgICAgICAgY29uc3QgeyBmaWVsZElkLCBjb25maWcgfSA9IGluc3RhbmNlO1xuICAgICAgICBcbiAgICAgICAgLy8gRmluZCBidXR0b24gY29udGFpbmVyIGJ5IGxvb2tpbmcgbmVhciB0aGUgZHJvcGRvd25cbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJChgIyR7ZmllbGRJZH0tZHJvcGRvd25gKTtcbiAgICAgICAgaWYgKCEkZHJvcGRvd24ubGVuZ3RoKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICAvLyBMb29rIGZvciBidXR0b25zIGluIHRoZSBzYW1lIHBhcmVudCBjb250YWluZXIgKHVuc3RhY2thYmxlIGZpZWxkcylcbiAgICAgICAgbGV0ICRidXR0b25Db250YWluZXIgPSAkZHJvcGRvd24uY2xvc2VzdCgnLnVuc3RhY2thYmxlLmZpZWxkcycpLmZpbmQoJy51aS5idXR0b25zJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBGYWxsYmFjazogbG9vayBpbiB0aGUgc2FtZSBmaWVsZFxuICAgICAgICBpZiAoISRidXR0b25Db250YWluZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAkYnV0dG9uQ29udGFpbmVyID0gJGRyb3Bkb3duLmNsb3Nlc3QoJy5maWVsZCcpLmZpbmQoJy51aS5idXR0b25zJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICgkYnV0dG9uQ29udGFpbmVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgcGxheSBidXR0b25cbiAgICAgICAgICAgIGlmIChjb25maWcuc2hvd1BsYXlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uID0gJGJ1dHRvbkNvbnRhaW5lci5maW5kKCcuYWN0aW9uLXBsYXliYWNrLWJ1dHRvbicpLmZpcnN0KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGluc3RhbmNlLnBsYXlCdXR0b24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLm9mZignY2xpY2snKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVQbGF5Q2xpY2soaW5zdGFuY2UpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEZpbmQgYWRkIGJ1dHRvbiAobm8gYWRkaXRpb25hbCBoYW5kbGluZyBuZWVkZWQgLSBoYXMgaHJlZilcbiAgICAgICAgICAgIGlmIChjb25maWcuc2hvd0FkZEJ1dHRvbikge1xuICAgICAgICAgICAgICAgIGluc3RhbmNlLmFkZEJ1dHRvbiA9ICRidXR0b25Db250YWluZXIuZmluZCgnYVtocmVmKj1cInNvdW5kLWZpbGVzL21vZGlmeVwiXScpLmZpcnN0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYXVkaW8gcGxheWVyXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUF1ZGlvUGxheWVyKCkge1xuICAgICAgICBpZiAoIXRoaXMuYXVkaW9QbGF5ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuYXVkaW9QbGF5ZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhdWRpbycpO1xuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wcmVsb2FkID0gJ25vbmUnO1xuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmF1ZGlvUGxheWVyKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSGFuZGxlIHBsYXkvcGF1c2UgZXZlbnRzXG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLmFkZEV2ZW50TGlzdGVuZXIoJ2VuZGVkJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zdG9wUGxheWJhY2soKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgcGxheSBidXR0b24gY2xpY2tcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIGhhbmRsZVBsYXlDbGljayhpbnN0YW5jZSkge1xuICAgICAgICBjb25zdCB7IGN1cnJlbnRWYWx1ZSwgY29uZmlnLCBwbGF5QnV0dG9uIH0gPSBpbnN0YW5jZTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY3VycmVudFZhbHVlIHx8IGN1cnJlbnRWYWx1ZSA9PT0gJy0xJyB8fCBjdXJyZW50VmFsdWUgPT09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFscmVhZHkgcGxheWluZyB0aGlzIGZpbGVcbiAgICAgICAgaWYgKHRoaXMuY3VycmVudGx5UGxheWluZ0lkID09PSBjdXJyZW50VmFsdWUgJiYgIXRoaXMuYXVkaW9QbGF5ZXIucGF1c2VkKSB7XG4gICAgICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTdG9wIGFueSBjdXJyZW50IHBsYXliYWNrXG4gICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgVUkgdG8gc2hvdyBwYXVzZSBpY29uXG4gICAgICAgIGlmIChwbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICBwbGF5QnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGxheScpLmFkZENsYXNzKCdwYXVzZScpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBHZXQgZmlsZSBwYXRoIGFuZCBwbGF5XG4gICAgICAgIHRoaXMucGxheUZpbGUoY3VycmVudFZhbHVlLCBpbnN0YW5jZSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDYWxsIGN1c3RvbSBvblBsYXkgY2FsbGJhY2tcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcub25QbGF5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjb25maWcub25QbGF5KGN1cnJlbnRWYWx1ZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBsYXkgc291bmQgZmlsZVxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVJZCAtIEZpbGUgSUQgdG8gcGxheVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgcGxheUZpbGUoZmlsZUlkLCBpbnN0YW5jZSkge1xuICAgICAgICAvLyBHZXQgZmlsZSByZWNvcmQgdG8gZ2V0IHRoZSBwYXRoXG4gICAgICAgIFNvdW5kRmlsZXNBUEkuZ2V0UmVjb3JkKGZpbGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPSBmaWxlSWQ7XG4gICAgICAgICAgICAgICAgY29uc3QgYXBpVXJsID0gYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpwbGF5YmFjaz92aWV3PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHJlc3BvbnNlLmRhdGEucGF0aCl9YDtcblxuICAgICAgICAgICAgICAgIC8vIExvYWQgYXV0aGVudGljYXRlZCBhdWRpbyBzb3VyY2VcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRBdXRoZW50aWNhdGVkQXVkaW8oYXBpVXJsLCBpbnN0YW5jZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIElmIGZhaWxlZCB0byBnZXQgZmlsZSBpbmZvLCByZXZlcnQgaWNvbiBiYWNrIHRvIHBsYXlcbiAgICAgICAgICAgICAgICBpZiAoaW5zdGFuY2UucGxheUJ1dHRvbikge1xuICAgICAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLmZpbmQoJ2knKS5yZW1vdmVDbGFzcygncGF1c2UnKS5hZGRDbGFzcygncGxheScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgYXVkaW8gZnJvbSBhdXRoZW50aWNhdGVkIEFQSSBlbmRwb2ludFxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFwaVVybCAtIEFQSSBVUkwgcmVxdWlyaW5nIEJlYXJlciB0b2tlblxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpbnN0YW5jZSAtIFNlbGVjdG9yIGluc3RhbmNlXG4gICAgICovXG4gICAgbG9hZEF1dGhlbnRpY2F0ZWRBdWRpbyhhcGlVcmwsIGluc3RhbmNlKSB7XG4gICAgICAgIC8vIEJ1aWxkIGZ1bGwgVVJMXG4gICAgICAgIGxldCBmdWxsVXJsO1xuICAgICAgICBpZiAoYXBpVXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSkge1xuICAgICAgICAgICAgZnVsbFVybCA9IGFwaVVybDtcbiAgICAgICAgfSBlbHNlIGlmIChhcGlVcmwuc3RhcnRzV2l0aCgnL3BieGNvcmUvJykpIHtcbiAgICAgICAgICAgIC8vIEFQSSBwYXRoIC0gdXNlIGJhc2UgVVJMIHdpdGhvdXQgYWRtaW4tY2FiaW5ldCBwYXRoXG4gICAgICAgICAgICBjb25zdCBiYXNlVXJsID0gd2luZG93LmxvY2F0aW9uLm9yaWdpbjtcbiAgICAgICAgICAgIGZ1bGxVcmwgPSBgJHtiYXNlVXJsfSR7YXBpVXJsfWA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmdWxsVXJsID0gYCR7Z2xvYmFsUm9vdFVybH0ke2FwaVVybC5yZXBsYWNlKC9eXFwvLywgJycpfWA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQcmVwYXJlIGhlYWRlcnMgd2l0aCBCZWFyZXIgdG9rZW5cbiAgICAgICAgY29uc3QgaGVhZGVycyA9IHtcbiAgICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJzogJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICh0eXBlb2YgVG9rZW5NYW5hZ2VyICE9PSAndW5kZWZpbmVkJyAmJiBUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW4pIHtcbiAgICAgICAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtUb2tlbk1hbmFnZXIuYWNjZXNzVG9rZW59YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZldGNoIGF1ZGlvIGZpbGUgd2l0aCBhdXRoZW50aWNhdGlvblxuICAgICAgICBmZXRjaChmdWxsVXJsLCB7IGhlYWRlcnMgfSlcbiAgICAgICAgICAgIC50aGVuKHJlc3BvbnNlID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSFRUUCAke3Jlc3BvbnNlLnN0YXR1c306ICR7cmVzcG9uc2Uuc3RhdHVzVGV4dH1gKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBFeHRyYWN0IGR1cmF0aW9uIGZyb20gaGVhZGVyIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ1gtQXVkaW8tRHVyYXRpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYEF1ZGlvIGR1cmF0aW9uOiAke2R1cmF0aW9ufXNgKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuYmxvYigpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKGJsb2IgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFJldm9rZSBwcmV2aW91cyBibG9iIFVSTCBpZiBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hdWRpb1BsYXllci5zcmMgJiYgdGhpcy5hdWRpb1BsYXllci5zcmMuc3RhcnRzV2l0aCgnYmxvYjonKSkge1xuICAgICAgICAgICAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHRoaXMuYXVkaW9QbGF5ZXIuc3JjKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYW5kIHNldCBuZXcgYmxvYiBVUkxcbiAgICAgICAgICAgICAgICBjb25zdCBibG9iVXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcbiAgICAgICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnNyYyA9IGJsb2JVcmw7XG5cbiAgICAgICAgICAgICAgICAvLyBQbGF5IGF1ZGlvXG4gICAgICAgICAgICAgICAgdGhpcy5hdWRpb1BsYXllci5wbGF5KCkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdBdWRpbyBwbGF5YmFjayBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0b3BQbGF5YmFjaygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgYXVkaW86JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG5cbiAgICAgICAgICAgICAgICAvLyBSZXZlcnQgcGxheSBidXR0b24gaWNvblxuICAgICAgICAgICAgICAgIGlmIChpbnN0YW5jZS5wbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIFxuICAgIC8qKlxuICAgICAqIFN0b3AgYXVkaW8gcGxheWJhY2tcbiAgICAgKi9cbiAgICBzdG9wUGxheWJhY2soKSB7XG4gICAgICAgIGlmICh0aGlzLmF1ZGlvUGxheWVyKSB7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICAgICAgICB0aGlzLmF1ZGlvUGxheWVyLmN1cnJlbnRUaW1lID0gMDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPSBudWxsO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGFsbCBwbGF5IGJ1dHRvbnMgYmFjayB0byBwbGF5IGljb25cbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UpID0+IHtcbiAgICAgICAgICAgIGlmIChpbnN0YW5jZS5wbGF5QnV0dG9uKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGxheSBidXR0b24gc3RhdGUgYmFzZWQgb24gY3VycmVudCBzZWxlY3Rpb25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gaW5zdGFuY2UgLSBTZWxlY3RvciBpbnN0YW5jZVxuICAgICAqL1xuICAgIHVwZGF0ZVBsYXlCdXR0b25TdGF0ZShpbnN0YW5jZSkge1xuICAgICAgICBpZiAoIWluc3RhbmNlLnBsYXlCdXR0b24gfHwgIWluc3RhbmNlLnBsYXlCdXR0b24ubGVuZ3RoKSByZXR1cm47XG4gICAgICAgIFxuICAgICAgICBjb25zdCB7IGN1cnJlbnRWYWx1ZSB9ID0gaW5zdGFuY2U7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWN1cnJlbnRWYWx1ZSB8fCBjdXJyZW50VmFsdWUgPT09ICcnIHx8IGN1cnJlbnRWYWx1ZSA9PT0gJy0nKSB7XG4gICAgICAgICAgICAvLyBEaXNhYmxlIGJ1dHRvbiBhbmQgZW5zdXJlIHBsYXkgaWNvblxuICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIGluc3RhbmNlLnBsYXlCdXR0b24uZmluZCgnaScpLnJlbW92ZUNsYXNzKCdwYXVzZScpLmFkZENsYXNzKCdwbGF5Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBFbmFibGUgYnV0dG9uXG4gICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTZXQgYXBwcm9wcmlhdGUgaWNvbiBiYXNlZCBvbiBwbGF5YmFjayBzdGF0ZVxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudGx5UGxheWluZ0lkID09PSBjdXJyZW50VmFsdWUgJiYgIXRoaXMuYXVkaW9QbGF5ZXIucGF1c2VkKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BsYXknKS5hZGRDbGFzcygncGF1c2UnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5zdGFuY2UucGxheUJ1dHRvbi5maW5kKCdpJykucmVtb3ZlQ2xhc3MoJ3BhdXNlJykuYWRkQ2xhc3MoJ3BsYXknKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2V0IHZhbHVlIHByb2dyYW1tYXRpY2FsbHlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVmFsdWUgdG8gc2V0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBEaXNwbGF5IHRleHQgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIHNldFZhbHVlKGZpZWxkSWQsIHZhbHVlLCB0ZXh0ID0gbnVsbCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgaWYgKCFpbnN0YW5jZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBVc2UgRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB0byBzZXQgdGhlIHZhbHVlXG4gICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuc2V0VmFsdWUoZmllbGRJZCwgdmFsdWUpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGluc3RhbmNlIHN0YXRlXG4gICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IHZhbHVlO1xuICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IHRleHQgfHwgJyc7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcGxheSBidXR0b24gc3RhdGVcbiAgICAgICAgdGhpcy51cGRhdGVQbGF5QnV0dG9uU3RhdGUoaW5zdGFuY2UpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgdmFsdWVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmllbGRJZCAtIEZpZWxkIElEXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBDdXJyZW50IHZhbHVlXG4gICAgICovXG4gICAgZ2V0VmFsdWUoZmllbGRJZCkge1xuICAgICAgICBjb25zdCBpbnN0YW5jZSA9IHRoaXMuaW5zdGFuY2VzLmdldChmaWVsZElkKTtcbiAgICAgICAgcmV0dXJuIGluc3RhbmNlID8gaW5zdGFuY2UuY3VycmVudFZhbHVlIDogbnVsbDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlZnJlc2ggZHJvcGRvd24gZGF0YVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICByZWZyZXNoKGZpZWxkSWQpIHtcbiAgICAgICAgLy8gRGVsZWdhdGUgdG8gRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICAvLyAoRHluYW1pY0Ryb3Bkb3duQnVpbGRlciB3b3VsZCBuZWVkIGEgcmVmcmVzaCBtZXRob2QpXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgIGlmICgkZHJvcGRvd24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzdHJveSBpbnN0YW5jZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICBkZXN0cm95KGZpZWxkSWQpIHtcbiAgICAgICAgY29uc3QgaW5zdGFuY2UgPSB0aGlzLmluc3RhbmNlcy5nZXQoZmllbGRJZCk7XG4gICAgICAgIGlmIChpbnN0YW5jZSkge1xuICAgICAgICAgICAgLy8gU3RvcCBwbGF5YmFjayBpZiBwbGF5aW5nXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50bHlQbGF5aW5nSWQgPT09IGluc3RhbmNlLmN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgICAgIHRoaXMuc3RvcFBsYXliYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBldmVudCBoYW5kbGVyc1xuICAgICAgICAgICAgaWYgKGluc3RhbmNlLnBsYXlCdXR0b24pIHtcbiAgICAgICAgICAgICAgICBpbnN0YW5jZS5wbGF5QnV0dG9uLm9mZignY2xpY2snKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGZyb20gaW5zdGFuY2VzXG4gICAgICAgICAgICB0aGlzLmluc3RhbmNlcy5kZWxldGUoZmllbGRJZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENsZWFyIGRyb3Bkb3duIHNlbGVjdGlvblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWVsZElkIC0gRmllbGQgSURcbiAgICAgKi9cbiAgICBjbGVhcihmaWVsZElkKSB7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gdGhpcy5pbnN0YW5jZXMuZ2V0KGZpZWxkSWQpO1xuICAgICAgICBpZiAoaW5zdGFuY2UpIHtcbiAgICAgICAgICAgIC8vIFVzZSBEeW5hbWljRHJvcGRvd25CdWlsZGVyIHRvIGNsZWFyXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyKGZpZWxkSWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgaW5zdGFuY2Ugc3RhdGVcbiAgICAgICAgICAgIGluc3RhbmNlLmN1cnJlbnRWYWx1ZSA9IG51bGw7XG4gICAgICAgICAgICBpbnN0YW5jZS5jdXJyZW50VGV4dCA9IG51bGw7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwbGF5IGJ1dHRvbiBzdGF0ZVxuICAgICAgICAgICAgdGhpcy51cGRhdGVQbGF5QnV0dG9uU3RhdGUoaW5zdGFuY2UpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDbGVhciBjYWNoZSBmb3Igc291bmQgZmlsZXMgQVBJXG4gICAgICogQ2FsbCB0aGlzIGFmdGVyIHNvdW5kIGZpbGUgb3BlcmF0aW9ucyAoYWRkL2VkaXQvZGVsZXRlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSAtIE9wdGlvbmFsOiBzcGVjaWZpYyBjYXRlZ29yeSB0byBjbGVhciAoJ2N1c3RvbScsICdtb2gnKVxuICAgICAqL1xuICAgIGNsZWFyQ2FjaGUoY2F0ZWdvcnkgPSBudWxsKSB7XG4gICAgICAgIGlmIChjYXRlZ29yeSkge1xuICAgICAgICAgICAgLy8gQ2xlYXIgY2FjaGUgZm9yIHNwZWNpZmljIGNhdGVnb3J5XG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyQ2FjaGVGb3IoJy9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpnZXRGb3JTZWxlY3QnLCB7IGNhdGVnb3J5IH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2xlYXIgYWxsIHNvdW5kIGZpbGVzIGNhY2hlXG4gICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyQ2FjaGVGb3IoJy9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpnZXRGb3JTZWxlY3QnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVmcmVzaCBhbGwgc291bmQgZmlsZSBkcm9wZG93bnMgb24gdGhlIHBhZ2VcbiAgICAgKiBUaGlzIHdpbGwgZm9yY2UgdGhlbSB0byByZWxvYWQgZGF0YSBmcm9tIHNlcnZlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjYXRlZ29yeSAtIE9wdGlvbmFsOiBzcGVjaWZpYyBjYXRlZ29yeSB0byByZWZyZXNoICgnY3VzdG9tJywgJ21vaCcpXG4gICAgICovXG4gICAgcmVmcmVzaEFsbChjYXRlZ29yeSA9IG51bGwpIHtcbiAgICAgICAgLy8gQ2xlYXIgY2FjaGUgZmlyc3RcbiAgICAgICAgdGhpcy5jbGVhckNhY2hlKGNhdGVnb3J5KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJlZnJlc2ggZWFjaCBhY3RpdmUgaW5zdGFuY2VcbiAgICAgICAgdGhpcy5pbnN0YW5jZXMuZm9yRWFjaCgoaW5zdGFuY2UsIGZpZWxkSWQpID0+IHtcbiAgICAgICAgICAgIGlmICghY2F0ZWdvcnkgfHwgaW5zdGFuY2UuY29uZmlnLmNhdGVnb3J5ID09PSBjYXRlZ29yeSkge1xuICAgICAgICAgICAgICAgIC8vIENsZWFyIGRyb3Bkb3duIGFuZCByZWxvYWRcbiAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmNsZWFyKGZpZWxkSWQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBkcm9wZG93biB0byB0cmlnZ2VyIG5ldyBBUEkgcmVxdWVzdFxuICAgICAgICAgICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoYCMke2ZpZWxkSWR9LWRyb3Bkb3duYCk7XG4gICAgICAgICAgICAgICAgaWYgKCRkcm9wZG93bi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59OyJdfQ==