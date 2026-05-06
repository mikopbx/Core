"use strict";

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

/* global globalRootUrl, ModulesAPI, globalTranslate */

/**
 * Represents the extension module popup.
 * @class extensionModuleDetail
 * @memberof module:PbxExtensionModules
 */
var extensionModuleDetail = {
  /**
   * jQuery object for the module detail form.
   * @type {jQuery}
   */
  $moduleDetailPopupTpl: $('#module-details-template'),

  /**
   * jQuery object for the module detail form.
   * @type {jQuery}
   */
  $moduleDetailPopup: undefined,

  /**
   * Initializes the extensionModuleDetail object.
   * This method sets up the necessary event handlers to trigger the display of module details
   * when a user clicks on a module row within the PBX system interface.
   */
  initialize: function initialize() {
    // The table rows which activate a detail popup.
    $(document).on('click', 'tr.new-module-row', function (event) {
      event.preventDefault();
      var params = {};
      var $target = $(event.target);

      if ($target.closest('td').hasClass('show-details-on-click')) {
        params.uniqid = $target.closest('tr').data('id');

        if (params.uniqid !== undefined) {
          // Module detail popup form
          extensionModuleDetail.$moduleDetailPopup = extensionModuleDetail.$moduleDetailPopupTpl.clone(true);
          extensionModuleDetail.$moduleDetailPopup.attr('id', 'modal-' + params.uniqid); // Show the popup

          extensionModuleDetail.$moduleDetailPopup.modal({
            position: 'center',
            closable: true
          }).modal('show');
          ModulesAPI.getModuleInfo(params, extensionModuleDetail.cbAfterGetModuleDetails);
        }
      }
    });
  },

  /**
   * Initializes the slider functionality within the module detail modal.
   * This allows users to navigate through any available screenshots or additional informational slides
   * by clicking left or right arrows within the modal.
   *
   * @param {jQuery} modalForm - The modal form within which the slider is to be initialized.
   * This form should contain elements with classes `.slides`, `.right`, `.left`, and `.slide` for the slider to function.
   */
  initializeSlider: function initializeSlider(modalForm) {
    modalForm.find('.slides .right').on('click', function () {
      modalForm.find('.slide').siblings('.active:not(:last-of-type)').removeClass('active').next().addClass('active');
    });
    modalForm.find('.slides .left').on('click', function () {
      modalForm.find('.slide').siblings('.active:not(:first-of-type)').removeClass('active').prev().addClass('active');
    });
  },

  /**
   * Callback function to handle the response after fetching module details from the API.
   * It populates the module detail popup with the retrieved data, including name, logo, version, and other module-specific information.
   *
   * @param {Object} repoData - The module data returned from the API request, containing module details such as name,
   *                            logo URL, version, releases, and other relevant information.
   * @param {boolean} success - A boolean indicating if the API request was successful.
   */
  cbAfterGetModuleDetails: function cbAfterGetModuleDetails(repoData, success) {
    if (success) {
      var $newPopup = extensionModuleDetail.$moduleDetailPopup; // Populate various elements in the popup with data from the response
      // Module name

      if (repoData.name !== undefined) {
        $newPopup.find('.module-name').text(repoData.name);
        $newPopup.find('.module-logo').attr('alt', repoData.name);
      } // Module logo


      if (repoData.logotype && repoData.logotype !== '') {
        $newPopup.find('.module-logo').attr('src', repoData.logotype);
      } // Module uniqid


      if (repoData.uniqid !== undefined) {
        $newPopup.find('.module-id').text(repoData.uniqid); // Install last release button

        $newPopup.find('.main-install-button').data('uniqid', repoData.uniqid);
      } // Total count of installations


      if (repoData.downloads !== undefined) {
        $newPopup.find('.module-count-installed').html(repoData.downloads);
      } // Last release version


      if (repoData.releases[0].version !== undefined) {
        $newPopup.find('.module-latest-release').text(repoData.releases[0].version);
        var currentVersion = $("tr.module-row[data-id=".concat(repoData.uniqid, "]")).data('version');

        if (currentVersion !== undefined) {
          $('a.main-install-button span.button-text').text(globalTranslate.ext_UpdateModuleShort);
        }
      } // Developer


      var developerView = extensionModuleDetail.prepareDeveloperView(repoData);
      $newPopup.find('.module-publisher').html(developerView); // Commercial

      if (repoData.commercial !== undefined) {
        var commercialView = extensionModuleDetail.prepareCommercialView(repoData.commercial);
        $newPopup.find('.module-commercial').html(commercialView);
      } // Release size


      if (repoData.releases[0].size !== undefined) {
        var sizeText = extensionModuleDetail.convertBytesToReadableFormat(repoData.releases[0].size);
        $newPopup.find('.module-latest-release-size').text(sizeText);
      } // Screenshots


      if (repoData.screenshots && repoData.screenshots.length > 0) {
        var screenshotsView = extensionModuleDetail.prepareScreenshotsView(repoData.screenshots);
        $newPopup.find('.module-screenshots').html(screenshotsView);
      } else {
        $newPopup.find('.module-screenshots').remove();
      } // Description


      var descriptionView = extensionModuleDetail.prepareDescriptionView(repoData);
      $newPopup.find('.module-description').html(descriptionView); // Changelog

      var changelogView = extensionModuleDetail.prepareChangeLogView(repoData);
      $newPopup.find('.module-changelog').html(changelogView); // Initialize the image slider for screenshots, if any

      extensionModuleDetail.initializeSlider($newPopup); // Eula

      if (repoData.eula) {
        $newPopup.find('.module-eula').html(UserMessage.convertToText(repoData.eula));
      } else {
        $newPopup.find('a[data-tab="eula"]').hide();
      } // Initialize tab menu


      $newPopup.find('.module-details-menu .item').tab(); // Hide the dimmer to reveal the popup content

      $newPopup.find('.dimmer').removeClass('active');
    }
  },

  /**
   * Converts a byte value to a human-readable format in megabytes (Mb).
   * This method is useful for displaying file sizes in a more understandable format to users.
   *
   * @param {number} bytes - The size in bytes to be converted.
   * @return {string} The formatted size in megabytes (Mb) with two decimal places.
   */
  convertBytesToReadableFormat: function convertBytesToReadableFormat(bytes) {
    var megabytes = bytes / (1024 * 1024);
    var roundedMegabytes = megabytes.toFixed(2);
    return "".concat(roundedMegabytes, " Mb");
  },

  /**
   * Generates and returns HTML content to display commercial information about the module.
   * This distinguishes between commercial and free modules with an appropriate icon and text.
   *
   * @param {string} commercial - A string indicating the commercial status of the module ('1' for commercial, otherwise free).
   * @return {string} HTML string representing the commercial status of the module.
   */
  prepareCommercialView: function prepareCommercialView(commercial) {
    if (commercial === 1) {
      return '<i class="ui donate icon"></i> ' + globalTranslate.ext_CommercialModule;
    }

    return '<i class="puzzle piece icon"></i> ' + globalTranslate.ext_FreeModule;
  },

  /**
   * Creates and returns HTML content for displaying module screenshots.
   * If there are multiple screenshots, they will be included in a navigable slider.
   *
   * @param {Array} screenshots - An array of objects representing screenshots, each containing URL and name properties.
   * @return {string} HTML content for the screenshot slider.
   */
  prepareScreenshotsView: function prepareScreenshotsView(screenshots) {
    var html = '            <div class="ui container slides">\n' + '                <i class="big left angle icon"></i>\n' + '                <i class="big right angle icon"></i>';
    $.each(screenshots, function (index, screenshot) {
      if (index > 0) {
        html += "<div class=\"slide\"><img class=\"ui fluid image\" src=\"".concat(screenshot.url, "\" alt=\"").concat(screenshot.name, "\"></div>");
      } else {
        html += "<div class=\"slide active\"><img class=\"ui fluid image\" src=\"".concat(screenshot.url, "\" alt=\"").concat(screenshot.name, "\"></div>");
      }
    });
    html += '</div>';
    return html;
  },

  /**
   * Generates and returns HTML content for the module's description section.
   * This includes the module name, a textual description, and any useful links provided.
   *
   * @param {Object} repoData - An object containing the module's metadata, including name, description, and promotional link.
   * @return {string} HTML content for the module's description section.
   */
  prepareDescriptionView: function prepareDescriptionView(repoData) {
    var html = "<div class=\"ui header\">".concat(repoData.name, "</div>");
    html += "<p>".concat(repoData.description, "</p>");
    html += "<div class=\"ui header\">".concat(globalTranslate.ext_UsefulLinks, "</div>");
    html += '<ul class="ui list">';
    html += "<li class=\"item\"><a href=\"".concat(repoData.promo_link, "\" target=\"_blank\">").concat(globalTranslate.ext_ExternalDescription, "</a></li>");
    html += '</ul>';
    return html;
  },

  /**
   * Generates and returns HTML content to display the developer's information for the module.
   * This is typically a simple textual representation of the developer's name or identifier.
   *
   * @param {Object} repoData - An object containing the module's metadata, including developer information.
   * @return {string} HTML content for the developer information section.
   */
  prepareDeveloperView: function prepareDeveloperView(repoData) {
    var html = '';
    html += "".concat(repoData.developer);
    return html;
  },

  /**
   * Generates and returns HTML content for displaying the module's changelog.
   * Each release within the module's history is presented with version information, download count, and a detailed changelog.
   *
   * @param {Object} repoData - An object containing the module's metadata, including an array of release objects with version, download count, and changelog information.
   * @return {string} HTML content for the module's changelog section.
   */
  prepareChangeLogView: function prepareChangeLogView(repoData) {
    var html = '';
    $.each(repoData.releases, function (index, release) {
      var releaseDate = release.created;
      releaseDate = releaseDate ? String(releaseDate).split(' ')[0] : '';
      var sizeText = extensionModuleDetail.convertBytesToReadableFormat(release.size);
      var changeLogText = extensionModuleDetail.formatChangelogText(release.changelog);
      var safeVersion = extensionModuleDetail.escapeHtml(release.version);
      var safeDate = extensionModuleDetail.escapeHtml(releaseDate);
      var safeDownloads = extensionModuleDetail.escapeHtml(release.downloads);
      var safeRequire = extensionModuleDetail.escapeHtml(release.require_version);
      var safeUniqid = extensionModuleDetail.escapeHtml(repoData.uniqid);
      var safeReleaseId = extensionModuleDetail.escapeHtml(release.releaseID);
      html += '<div class="ui clearing segment">';
      html += "<div class=\"ui top attached label\">".concat(globalTranslate.ext_InstallModuleReleaseTag, ": ").concat(safeVersion, " ").concat(globalTranslate.ext_FromDate, " ").concat(safeDate, "</div>");
      html += "<div class=\"ui top right attached label\"><i class=\"icon grey download\"></i> <span class=\"ui mini gray text\">".concat(safeDownloads, "</span></div>");
      html += "<div class='ui basic segment'><p>".concat(changeLogText, "</p>");
      html += "<p><b>".concat(globalTranslate.ext_SystemVersionRequired, ": ").concat(safeRequire, "</b></p>");
      html += "<a href=\"#\" class=\"ui icon labeled small blue right floated button download\"\n               data-uniqid = \"".concat(safeUniqid, "\"\n               data-version = \"").concat(safeVersion, "\"\n               data-releaseid =\"").concat(safeReleaseId, "\">\n                <i class=\"icon download\"></i>\n                ").concat(globalTranslate.ext_InstallModuleVersion, " ").concat(safeVersion, " (").concat(extensionModuleDetail.escapeHtml(sizeText), ")\n            </a>");
      html += '</div></div>';
    });
    return html;
  },

  /**
   * Safely formats a repository-provided changelog value for HTML insertion.
   * HTML-escapes the raw text, treats missing/null/undefined as a placeholder,
   * and converts newlines to <br>.
   */
  formatChangelogText: function formatChangelogText(raw) {
    if (raw === null || raw === undefined) {
      return "<i>".concat(globalTranslate.ext_NoChangelogAvailable || '', "</i>");
    }

    var text = String(raw);

    if (text === '' || text === 'null' || text === 'undefined') {
      return "<i>".concat(globalTranslate.ext_NoChangelogAvailable || '', "</i>");
    }

    var escaped = extensionModuleDetail.escapeHtml(text);

    if (escaped.trim() === '') {
      return "<i>".concat(globalTranslate.ext_NoChangelogAvailable || '', "</i>");
    }

    return escaped.replace(/\n/g, '<br>');
  },

  /**
   * Minimal HTML escape for values injected into the detail popup.
   */
  escapeHtml: function escapeHtml(value) {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}; // When the document is ready, initialize the external modules detail page

$(document).ready(function () {
  extensionModuleDetail.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWRldGFpbC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVEZXRhaWwiLCIkbW9kdWxlRGV0YWlsUG9wdXBUcGwiLCIkIiwiJG1vZHVsZURldGFpbFBvcHVwIiwidW5kZWZpbmVkIiwiaW5pdGlhbGl6ZSIsImRvY3VtZW50Iiwib24iLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwicGFyYW1zIiwiJHRhcmdldCIsInRhcmdldCIsImNsb3Nlc3QiLCJoYXNDbGFzcyIsInVuaXFpZCIsImRhdGEiLCJjbG9uZSIsImF0dHIiLCJtb2RhbCIsInBvc2l0aW9uIiwiY2xvc2FibGUiLCJNb2R1bGVzQVBJIiwiZ2V0TW9kdWxlSW5mbyIsImNiQWZ0ZXJHZXRNb2R1bGVEZXRhaWxzIiwiaW5pdGlhbGl6ZVNsaWRlciIsIm1vZGFsRm9ybSIsImZpbmQiLCJzaWJsaW5ncyIsInJlbW92ZUNsYXNzIiwibmV4dCIsImFkZENsYXNzIiwicHJldiIsInJlcG9EYXRhIiwic3VjY2VzcyIsIiRuZXdQb3B1cCIsIm5hbWUiLCJ0ZXh0IiwibG9nb3R5cGUiLCJkb3dubG9hZHMiLCJodG1sIiwicmVsZWFzZXMiLCJ2ZXJzaW9uIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfVXBkYXRlTW9kdWxlU2hvcnQiLCJkZXZlbG9wZXJWaWV3IiwicHJlcGFyZURldmVsb3BlclZpZXciLCJjb21tZXJjaWFsIiwiY29tbWVyY2lhbFZpZXciLCJwcmVwYXJlQ29tbWVyY2lhbFZpZXciLCJzaXplIiwic2l6ZVRleHQiLCJjb252ZXJ0Qnl0ZXNUb1JlYWRhYmxlRm9ybWF0Iiwic2NyZWVuc2hvdHMiLCJsZW5ndGgiLCJzY3JlZW5zaG90c1ZpZXciLCJwcmVwYXJlU2NyZWVuc2hvdHNWaWV3IiwicmVtb3ZlIiwiZGVzY3JpcHRpb25WaWV3IiwicHJlcGFyZURlc2NyaXB0aW9uVmlldyIsImNoYW5nZWxvZ1ZpZXciLCJwcmVwYXJlQ2hhbmdlTG9nVmlldyIsImV1bGEiLCJVc2VyTWVzc2FnZSIsImNvbnZlcnRUb1RleHQiLCJoaWRlIiwidGFiIiwiYnl0ZXMiLCJtZWdhYnl0ZXMiLCJyb3VuZGVkTWVnYWJ5dGVzIiwidG9GaXhlZCIsImV4dF9Db21tZXJjaWFsTW9kdWxlIiwiZXh0X0ZyZWVNb2R1bGUiLCJlYWNoIiwiaW5kZXgiLCJzY3JlZW5zaG90IiwidXJsIiwiZGVzY3JpcHRpb24iLCJleHRfVXNlZnVsTGlua3MiLCJwcm9tb19saW5rIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJyZWxlYXNlIiwicmVsZWFzZURhdGUiLCJjcmVhdGVkIiwiU3RyaW5nIiwic3BsaXQiLCJjaGFuZ2VMb2dUZXh0IiwiZm9ybWF0Q2hhbmdlbG9nVGV4dCIsImNoYW5nZWxvZyIsInNhZmVWZXJzaW9uIiwiZXNjYXBlSHRtbCIsInNhZmVEYXRlIiwic2FmZURvd25sb2FkcyIsInNhZmVSZXF1aXJlIiwicmVxdWlyZV92ZXJzaW9uIiwic2FmZVVuaXFpZCIsInNhZmVSZWxlYXNlSWQiLCJyZWxlYXNlSUQiLCJleHRfSW5zdGFsbE1vZHVsZVJlbGVhc2VUYWciLCJleHRfRnJvbURhdGUiLCJleHRfU3lzdGVtVmVyc2lvblJlcXVpcmVkIiwiZXh0X0luc3RhbGxNb2R1bGVWZXJzaW9uIiwicmF3IiwiZXh0X05vQ2hhbmdlbG9nQXZhaWxhYmxlIiwiZXNjYXBlZCIsInRyaW0iLCJyZXBsYWNlIiwidmFsdWUiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxxQkFBcUIsR0FBRztBQUMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxxQkFBcUIs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RCxXQUFPa0YsTUFBTSxDQUFDdUIsS0FBRCxDQUFOLENBQ0ZELE9BREUsQ0FDTSxJQUROLEVBQ1ksT0FEWixFQUVGQSxPQUZFLENBRU0sSUFGTixFQUVZLE1BRlosRUFHRkEsT0FIRSxDQUdNLElBSE4sRUFHWSxNQUhaLEVBSUZBLE9BSkUsQ0FJTSxJQUpOLEVBSVksUUFKWixFQUtGQSxPQUxFLENBS00sSUFMTixFQUtZLE9BTFosQ0FBUDtBQU1IO0FBblV5QixDQUE5QixDLENBc1VBOztBQUNBMUcsQ0FBQyxDQUFDSSxRQUFELENBQUQsQ0FBWXdHLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjlHLEVBQUFBLHFCQUFxQixDQUFDSyxVQUF0QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgTW9kdWxlc0FQSSwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgZXh0ZW5zaW9uIG1vZHVsZSBwb3B1cC5cbiAqIEBjbGFzcyBleHRlbnNpb25Nb2R1bGVEZXRhaWxcbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBleHRlbnNpb25Nb2R1bGVEZXRhaWwgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1vZHVsZSBkZXRhaWwgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtb2R1bGVEZXRhaWxQb3B1cFRwbDogJCgnI21vZHVsZS1kZXRhaWxzLXRlbXBsYXRlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbW9kdWxlIGRldGFpbCBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZHVsZURldGFpbFBvcHVwOiB1bmRlZmluZWQsXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb25Nb2R1bGVEZXRhaWwgb2JqZWN0LlxuICAgICAqIFRoaXMgbWV0aG9kIHNldHMgdXAgdGhlIG5lY2Vzc2FyeSBldmVudCBoYW5kbGVycyB0byB0cmlnZ2VyIHRoZSBkaXNwbGF5IG9mIG1vZHVsZSBkZXRhaWxzXG4gICAgICogd2hlbiBhIHVzZXIgY2xpY2tzIG9uIGEgbW9kdWxlIHJvdyB3aXRoaW4gdGhlIFBCWCBzeXN0ZW0gaW50ZXJmYWNlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFRoZSB0YWJsZSByb3dzIHdoaWNoIGFjdGl2YXRlIGEgZGV0YWlsIHBvcHVwLlxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAndHIubmV3LW1vZHVsZS1yb3cnLCAoZXZlbnQpPT57XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpO1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuY2xvc2VzdCgndGQnKS5oYXNDbGFzcygnc2hvdy1kZXRhaWxzLW9uLWNsaWNrJykpe1xuICAgICAgICAgICAgICAgIHBhcmFtcy51bmlxaWQgPSAkdGFyZ2V0LmNsb3Nlc3QoJ3RyJykuZGF0YSgnaWQnKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zLnVuaXFpZCE9PXVuZGVmaW5lZCl7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTW9kdWxlIGRldGFpbCBwb3B1cCBmb3JtXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZURldGFpbC4kbW9kdWxlRGV0YWlsUG9wdXAgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwuJG1vZHVsZURldGFpbFBvcHVwVHBsLmNsb25lKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVEZXRhaWwuJG1vZHVsZURldGFpbFBvcHVwLmF0dHIoJ2lkJywgJ21vZGFsLScrcGFyYW1zLnVuaXFpZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLiRtb2R1bGVEZXRhaWxQb3B1cFxuICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ2NlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2FibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgIE1vZHVsZXNBUEkuZ2V0TW9kdWxlSW5mbyhwYXJhbXMsIGV4dGVuc2lvbk1vZHVsZURldGFpbC5jYkFmdGVyR2V0TW9kdWxlRGV0YWlscyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHNsaWRlciBmdW5jdGlvbmFsaXR5IHdpdGhpbiB0aGUgbW9kdWxlIGRldGFpbCBtb2RhbC5cbiAgICAgKiBUaGlzIGFsbG93cyB1c2VycyB0byBuYXZpZ2F0ZSB0aHJvdWdoIGFueSBhdmFpbGFibGUgc2NyZWVuc2hvdHMgb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbmFsIHNsaWRlc1xuICAgICAqIGJ5IGNsaWNraW5nIGxlZnQgb3IgcmlnaHQgYXJyb3dzIHdpdGhpbiB0aGUgbW9kYWwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gbW9kYWxGb3JtIC0gVGhlIG1vZGFsIGZvcm0gd2l0aGluIHdoaWNoIHRoZSBzbGlkZXIgaXMgdG8gYmUgaW5pdGlhbGl6ZWQuXG4gICAgICogVGhpcyBmb3JtIHNob3VsZCBjb250YWluIGVsZW1lbnRzIHdpdGggY2xhc3NlcyBgLnNsaWRlc2AsIGAucmlnaHRgLCBgLmxlZnRgLCBhbmQgYC5zbGlkZWAgZm9yIHRoZSBzbGlkZXIgdG8gZnVuY3Rpb24uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNsaWRlcihtb2RhbEZvcm0pe1xuICAgICAgICBtb2RhbEZvcm0uZmluZCgnLnNsaWRlcyAucmlnaHQnKVxuICAgICAgICAgICAgLm9uKCdjbGljaycsICgpPT4ge1xuICAgICAgICAgICAgICAgIG1vZGFsRm9ybS5maW5kKCcuc2xpZGUnKVxuICAgICAgICAgICAgICAgICAgICAuc2libGluZ3MoJy5hY3RpdmU6bm90KDpsYXN0LW9mLXR5cGUpJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICAgICAgICAgICAgICAgICAubmV4dCgpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBtb2RhbEZvcm0uZmluZCgnLnNsaWRlcyAubGVmdCcpXG4gICAgICAgICAgICAub24oJ2NsaWNrJywgKCk9PiB7XG4gICAgICAgICAgICAgICAgbW9kYWxGb3JtLmZpbmQoJy5zbGlkZScpXG4gICAgICAgICAgICAgICAgICAgIC5zaWJsaW5ncygnLmFjdGl2ZTpub3QoOmZpcnN0LW9mLXR5cGUpJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICAgICAgICAgICAgICAgICAucHJldigpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZSBhZnRlciBmZXRjaGluZyBtb2R1bGUgZGV0YWlscyBmcm9tIHRoZSBBUEkuXG4gICAgICogSXQgcG9wdWxhdGVzIHRoZSBtb2R1bGUgZGV0YWlsIHBvcHVwIHdpdGggdGhlIHJldHJpZXZlZCBkYXRhLCBpbmNsdWRpbmcgbmFtZSwgbG9nbywgdmVyc2lvbiwgYW5kIG90aGVyIG1vZHVsZS1zcGVjaWZpYyBpbmZvcm1hdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXBvRGF0YSAtIFRoZSBtb2R1bGUgZGF0YSByZXR1cm5lZCBmcm9tIHRoZSBBUEkgcmVxdWVzdCwgY29udGFpbmluZyBtb2R1bGUgZGV0YWlscyBzdWNoIGFzIG5hbWUsXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nbyBVUkwsIHZlcnNpb24sIHJlbGVhc2VzLCBhbmQgb3RoZXIgcmVsZXZhbnQgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdWNjZXNzIC0gQSBib29sZWFuIGluZGljYXRpbmcgaWYgdGhlIEFQSSByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRNb2R1bGVEZXRhaWxzKHJlcG9EYXRhLCBzdWNjZXNzKSB7XG4gICAgICAgIGlmKHN1Y2Nlc3MpIHtcblxuICAgICAgICAgICAgY29uc3QgJG5ld1BvcHVwID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLiRtb2R1bGVEZXRhaWxQb3B1cDtcblxuXG4gICAgICAgICAgICAvLyBQb3B1bGF0ZSB2YXJpb3VzIGVsZW1lbnRzIGluIHRoZSBwb3B1cCB3aXRoIGRhdGEgZnJvbSB0aGUgcmVzcG9uc2VcbiAgICAgICAgICAgIC8vIE1vZHVsZSBuYW1lXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEubmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtbmFtZScpLnRleHQocmVwb0RhdGEubmFtZSk7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtbG9nbycpLmF0dHIoJ2FsdCcsIHJlcG9EYXRhLm5hbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb2R1bGUgbG9nb1xuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLmxvZ290eXBlICYmIHJlcG9EYXRhLmxvZ290eXBlIT09JycpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1sb2dvJykuYXR0cignc3JjJywgcmVwb0RhdGEubG9nb3R5cGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb2R1bGUgdW5pcWlkXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEudW5pcWlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1pZCcpLnRleHQocmVwb0RhdGEudW5pcWlkKTtcblxuICAgICAgICAgICAgICAgIC8vIEluc3RhbGwgbGFzdCByZWxlYXNlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubWFpbi1pbnN0YWxsLWJ1dHRvbicpLmRhdGEoJ3VuaXFpZCcsIHJlcG9EYXRhLnVuaXFpZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRvdGFsIGNvdW50IG9mIGluc3RhbGxhdGlvbnNcbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5kb3dubG9hZHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWNvdW50LWluc3RhbGxlZCcpLmh0bWwocmVwb0RhdGEuZG93bmxvYWRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTGFzdCByZWxlYXNlIHZlcnNpb25cbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5yZWxlYXNlc1swXS52ZXJzaW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1sYXRlc3QtcmVsZWFzZScpLnRleHQocmVwb0RhdGEucmVsZWFzZXNbMF0udmVyc2lvbik7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb24gPSAkKGB0ci5tb2R1bGUtcm93W2RhdGEtaWQ9JHtyZXBvRGF0YS51bmlxaWR9XWApLmRhdGEoJ3ZlcnNpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFZlcnNpb24hPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkKCdhLm1haW4taW5zdGFsbC1idXR0b24gc3Bhbi5idXR0b24tdGV4dCcpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGVTaG9ydCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEZXZlbG9wZXJcbiAgICAgICAgICAgIGNvbnN0IGRldmVsb3BlclZpZXcgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwucHJlcGFyZURldmVsb3BlclZpZXcocmVwb0RhdGEpO1xuICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtcHVibGlzaGVyJykuaHRtbChkZXZlbG9wZXJWaWV3KTtcblxuICAgICAgICAgICAgLy8gQ29tbWVyY2lhbFxuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLmNvbW1lcmNpYWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbW1lcmNpYWxWaWV3ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLnByZXBhcmVDb21tZXJjaWFsVmlldyhyZXBvRGF0YS5jb21tZXJjaWFsKTtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1jb21tZXJjaWFsJykuaHRtbChjb21tZXJjaWFsVmlldyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlbGVhc2Ugc2l6ZVxuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLnJlbGVhc2VzWzBdLnNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemVUZXh0ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmNvbnZlcnRCeXRlc1RvUmVhZGFibGVGb3JtYXQocmVwb0RhdGEucmVsZWFzZXNbMF0uc2l6ZSk7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtbGF0ZXN0LXJlbGVhc2Utc2l6ZScpLnRleHQoc2l6ZVRleHQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTY3JlZW5zaG90c1xuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLnNjcmVlbnNob3RzICYmIHJlcG9EYXRhLnNjcmVlbnNob3RzLmxlbmd0aD4wKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuc2hvdHNWaWV3ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLnByZXBhcmVTY3JlZW5zaG90c1ZpZXcocmVwb0RhdGEuc2NyZWVuc2hvdHMpO1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLXNjcmVlbnNob3RzJykuaHRtbChzY3JlZW5zaG90c1ZpZXcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1zY3JlZW5zaG90cycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEZXNjcmlwdGlvblxuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRpb25WaWV3ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLnByZXBhcmVEZXNjcmlwdGlvblZpZXcocmVwb0RhdGEpO1xuICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtZGVzY3JpcHRpb24nKS5odG1sKGRlc2NyaXB0aW9uVmlldyk7XG5cbiAgICAgICAgICAgIC8vIENoYW5nZWxvZ1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlbG9nVmlldyA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5wcmVwYXJlQ2hhbmdlTG9nVmlldyhyZXBvRGF0YSk7XG4gICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1jaGFuZ2Vsb2cnKS5odG1sKGNoYW5nZWxvZ1ZpZXcpO1xuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBpbWFnZSBzbGlkZXIgZm9yIHNjcmVlbnNob3RzLCBpZiBhbnlcbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZURldGFpbC5pbml0aWFsaXplU2xpZGVyKCRuZXdQb3B1cCk7XG5cbiAgICAgICAgICAgIC8vIEV1bGFcbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5ldWxhKSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtZXVsYScpLmh0bWwoVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChyZXBvRGF0YS5ldWxhKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCdhW2RhdGEtdGFiPVwiZXVsYVwiXScpLmhpZGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgbWVudVxuICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtZGV0YWlscy1tZW51IC5pdGVtJykudGFiKCk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgdGhlIGRpbW1lciB0byByZXZlYWwgdGhlIHBvcHVwIGNvbnRlbnRcbiAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGEgYnl0ZSB2YWx1ZSB0byBhIGh1bWFuLXJlYWRhYmxlIGZvcm1hdCBpbiBtZWdhYnl0ZXMgKE1iKS5cbiAgICAgKiBUaGlzIG1ldGhvZCBpcyB1c2VmdWwgZm9yIGRpc3BsYXlpbmcgZmlsZSBzaXplcyBpbiBhIG1vcmUgdW5kZXJzdGFuZGFibGUgZm9ybWF0IHRvIHVzZXJzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJ5dGVzIC0gVGhlIHNpemUgaW4gYnl0ZXMgdG8gYmUgY29udmVydGVkLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIGZvcm1hdHRlZCBzaXplIGluIG1lZ2FieXRlcyAoTWIpIHdpdGggdHdvIGRlY2ltYWwgcGxhY2VzLlxuICAgICAqL1xuICAgICBjb252ZXJ0Qnl0ZXNUb1JlYWRhYmxlRm9ybWF0KGJ5dGVzKSB7XG4gICAgICAgIGNvbnN0IG1lZ2FieXRlcyA9IGJ5dGVzIC8gKDEwMjQqMTAyNCk7XG4gICAgICAgIGNvbnN0IHJvdW5kZWRNZWdhYnl0ZXMgPSBtZWdhYnl0ZXMudG9GaXhlZCgyKTtcbiAgICAgICAgcmV0dXJuIGAke3JvdW5kZWRNZWdhYnl0ZXN9IE1iYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCB0byBkaXNwbGF5IGNvbW1lcmNpYWwgaW5mb3JtYXRpb24gYWJvdXQgdGhlIG1vZHVsZS5cbiAgICAgKiBUaGlzIGRpc3Rpbmd1aXNoZXMgYmV0d2VlbiBjb21tZXJjaWFsIGFuZCBmcmVlIG1vZHVsZXMgd2l0aCBhbiBhcHByb3ByaWF0ZSBpY29uIGFuZCB0ZXh0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbW1lcmNpYWwgLSBBIHN0cmluZyBpbmRpY2F0aW5nIHRoZSBjb21tZXJjaWFsIHN0YXR1cyBvZiB0aGUgbW9kdWxlICgnMScgZm9yIGNvbW1lcmNpYWwsIG90aGVyd2lzZSBmcmVlKS5cbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEhUTUwgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgY29tbWVyY2lhbCBzdGF0dXMgb2YgdGhlIG1vZHVsZS5cbiAgICAgKi9cbiAgICBwcmVwYXJlQ29tbWVyY2lhbFZpZXcoY29tbWVyY2lhbCkge1xuICAgICAgICBpZihjb21tZXJjaWFsPT09MSl7XG4gICAgICAgICAgICByZXR1cm4gJzxpIGNsYXNzPVwidWkgZG9uYXRlIGljb25cIj48L2k+ICcrZ2xvYmFsVHJhbnNsYXRlLmV4dF9Db21tZXJjaWFsTW9kdWxlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnPGkgY2xhc3M9XCJwdXp6bGUgcGllY2UgaWNvblwiPjwvaT4gJytnbG9iYWxUcmFuc2xhdGUuZXh0X0ZyZWVNb2R1bGU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW5kIHJldHVybnMgSFRNTCBjb250ZW50IGZvciBkaXNwbGF5aW5nIG1vZHVsZSBzY3JlZW5zaG90cy5cbiAgICAgKiBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgc2NyZWVuc2hvdHMsIHRoZXkgd2lsbCBiZSBpbmNsdWRlZCBpbiBhIG5hdmlnYWJsZSBzbGlkZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBzY3JlZW5zaG90cyAtIEFuIGFycmF5IG9mIG9iamVjdHMgcmVwcmVzZW50aW5nIHNjcmVlbnNob3RzLCBlYWNoIGNvbnRhaW5pbmcgVVJMIGFuZCBuYW1lIHByb3BlcnRpZXMuXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRoZSBzY3JlZW5zaG90IHNsaWRlci5cbiAgICAgKi9cbiAgICBwcmVwYXJlU2NyZWVuc2hvdHNWaWV3KHNjcmVlbnNob3RzKSB7XG4gICAgICAgIGxldCBodG1sID1cbiAgICAgICAgICAgICcgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY29udGFpbmVyIHNsaWRlc1wiPlxcbicgK1xuICAgICAgICAgICAgJyAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImJpZyBsZWZ0IGFuZ2xlIGljb25cIj48L2k+XFxuJyArXG4gICAgICAgICAgICAnICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiYmlnIHJpZ2h0IGFuZ2xlIGljb25cIj48L2k+JztcbiAgICAgICAgJC5lYWNoKHNjcmVlbnNob3RzLCBmdW5jdGlvbiAoaW5kZXgsIHNjcmVlbnNob3QpIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwic2xpZGVcIj48aW1nIGNsYXNzPVwidWkgZmx1aWQgaW1hZ2VcIiBzcmM9XCIke3NjcmVlbnNob3QudXJsfVwiIGFsdD1cIiR7c2NyZWVuc2hvdC5uYW1lfVwiPjwvZGl2PmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJzbGlkZSBhY3RpdmVcIj48aW1nIGNsYXNzPVwidWkgZmx1aWQgaW1hZ2VcIiBzcmM9XCIke3NjcmVlbnNob3QudXJsfVwiIGFsdD1cIiR7c2NyZWVuc2hvdC5uYW1lfVwiPjwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCBmb3IgdGhlIG1vZHVsZSdzIGRlc2NyaXB0aW9uIHNlY3Rpb24uXG4gICAgICogVGhpcyBpbmNsdWRlcyB0aGUgbW9kdWxlIG5hbWUsIGEgdGV4dHVhbCBkZXNjcmlwdGlvbiwgYW5kIGFueSB1c2VmdWwgbGlua3MgcHJvdmlkZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVwb0RhdGEgLSBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEsIGluY2x1ZGluZyBuYW1lLCBkZXNjcmlwdGlvbiwgYW5kIHByb21vdGlvbmFsIGxpbmsuXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRoZSBtb2R1bGUncyBkZXNjcmlwdGlvbiBzZWN0aW9uLlxuICAgICAqL1xuICAgIHByZXBhcmVEZXNjcmlwdGlvblZpZXcocmVwb0RhdGEpIHtcbiAgICAgICAgbGV0IGh0bWwgPSBgPGRpdiBjbGFzcz1cInVpIGhlYWRlclwiPiR7cmVwb0RhdGEubmFtZX08L2Rpdj5gO1xuICAgICAgICBodG1sICs9IGA8cD4ke3JlcG9EYXRhLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwidWkgaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VzZWZ1bExpbmtzfTwvZGl2PmA7XG4gICAgICAgIGh0bWwgKz0gJzx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICBodG1sICs9IGA8bGkgY2xhc3M9XCJpdGVtXCI+PGEgaHJlZj1cIiR7cmVwb0RhdGEucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+PC9saT5gO1xuICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYW5kIHJldHVybnMgSFRNTCBjb250ZW50IHRvIGRpc3BsYXkgdGhlIGRldmVsb3BlcidzIGluZm9ybWF0aW9uIGZvciB0aGUgbW9kdWxlLlxuICAgICAqIFRoaXMgaXMgdHlwaWNhbGx5IGEgc2ltcGxlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRldmVsb3BlcidzIG5hbWUgb3IgaWRlbnRpZmllci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXBvRGF0YSAtIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtb2R1bGUncyBtZXRhZGF0YSwgaW5jbHVkaW5nIGRldmVsb3BlciBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdGhlIGRldmVsb3BlciBpbmZvcm1hdGlvbiBzZWN0aW9uLlxuICAgICAqL1xuICAgIHByZXBhcmVEZXZlbG9wZXJWaWV3KHJlcG9EYXRhKSB7XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGh0bWwgKz0gYCR7cmVwb0RhdGEuZGV2ZWxvcGVyfWA7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYW5kIHJldHVybnMgSFRNTCBjb250ZW50IGZvciBkaXNwbGF5aW5nIHRoZSBtb2R1bGUncyBjaGFuZ2Vsb2cuXG4gICAgICogRWFjaCByZWxlYXNlIHdpdGhpbiB0aGUgbW9kdWxlJ3MgaGlzdG9yeSBpcyBwcmVzZW50ZWQgd2l0aCB2ZXJzaW9uIGluZm9ybWF0aW9uLCBkb3dubG9hZCBjb3VudCwgYW5kIGEgZGV0YWlsZWQgY2hhbmdlbG9nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlcG9EYXRhIC0gQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1vZHVsZSdzIG1ldGFkYXRhLCBpbmNsdWRpbmcgYW4gYXJyYXkgb2YgcmVsZWFzZSBvYmplY3RzIHdpdGggdmVyc2lvbiwgZG93bmxvYWQgY291bnQsIGFuZCBjaGFuZ2Vsb2cgaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRoZSBtb2R1bGUncyBjaGFuZ2Vsb2cgc2VjdGlvbi5cbiAgICAgKi9cbiAgICBwcmVwYXJlQ2hhbmdlTG9nVmlldyhyZXBvRGF0YSkge1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICAkLmVhY2gocmVwb0RhdGEucmVsZWFzZXMsIGZ1bmN0aW9uIChpbmRleCwgcmVsZWFzZSkge1xuICAgICAgICAgICAgbGV0IHJlbGVhc2VEYXRlID0gcmVsZWFzZS5jcmVhdGVkO1xuICAgICAgICAgICAgcmVsZWFzZURhdGUgPSByZWxlYXNlRGF0ZSA/IFN0cmluZyhyZWxlYXNlRGF0ZSkuc3BsaXQoJyAnKVswXSA6ICcnO1xuICAgICAgICAgICAgY29uc3Qgc2l6ZVRleHQgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwuY29udmVydEJ5dGVzVG9SZWFkYWJsZUZvcm1hdChyZWxlYXNlLnNpemUpO1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlTG9nVGV4dCA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5mb3JtYXRDaGFuZ2Vsb2dUZXh0KHJlbGVhc2UuY2hhbmdlbG9nKTtcbiAgICAgICAgICAgIGNvbnN0IHNhZmVWZXJzaW9uID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmVzY2FwZUh0bWwocmVsZWFzZS52ZXJzaW9uKTtcbiAgICAgICAgICAgIGNvbnN0IHNhZmVEYXRlID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmVzY2FwZUh0bWwocmVsZWFzZURhdGUpO1xuICAgICAgICAgICAgY29uc3Qgc2FmZURvd25sb2FkcyA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5lc2NhcGVIdG1sKHJlbGVhc2UuZG93bmxvYWRzKTtcbiAgICAgICAgICAgIGNvbnN0IHNhZmVSZXF1aXJlID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmVzY2FwZUh0bWwocmVsZWFzZS5yZXF1aXJlX3ZlcnNpb24pO1xuICAgICAgICAgICAgY29uc3Qgc2FmZVVuaXFpZCA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5lc2NhcGVIdG1sKHJlcG9EYXRhLnVuaXFpZCk7XG4gICAgICAgICAgICBjb25zdCBzYWZlUmVsZWFzZUlkID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmVzY2FwZUh0bWwocmVsZWFzZS5yZWxlYXNlSUQpO1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInVpIGNsZWFyaW5nIHNlZ21lbnRcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cInVpIHRvcCBhdHRhY2hlZCBsYWJlbFwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlUmVsZWFzZVRhZ306ICR7c2FmZVZlcnNpb259ICR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Gcm9tRGF0ZX0gJHtzYWZlRGF0ZX08L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cInVpIHRvcCByaWdodCBhdHRhY2hlZCBsYWJlbFwiPjxpIGNsYXNzPVwiaWNvbiBncmV5IGRvd25sb2FkXCI+PC9pPiA8c3BhbiBjbGFzcz1cInVpIG1pbmkgZ3JheSB0ZXh0XCI+JHtzYWZlRG93bmxvYWRzfTwvc3Bhbj48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz0ndWkgYmFzaWMgc2VnbWVudCc+PHA+JHtjaGFuZ2VMb2dUZXh0fTwvcD5gO1xuXG4gICAgICAgICAgICBodG1sICs9IGA8cD48Yj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfU3lzdGVtVmVyc2lvblJlcXVpcmVkfTogJHtzYWZlUmVxdWlyZX08L2I+PC9wPmA7XG4gICAgICAgICAgICBodG1sICs9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgaWNvbiBsYWJlbGVkIHNtYWxsIGJsdWUgcmlnaHQgZmxvYXRlZCBidXR0b24gZG93bmxvYWRcIlxuICAgICAgICAgICAgICAgZGF0YS11bmlxaWQgPSBcIiR7c2FmZVVuaXFpZH1cIlxuICAgICAgICAgICAgICAgZGF0YS12ZXJzaW9uID0gXCIke3NhZmVWZXJzaW9ufVwiXG4gICAgICAgICAgICAgICBkYXRhLXJlbGVhc2VpZCA9XCIke3NhZmVSZWxlYXNlSWR9XCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJpY29uIGRvd25sb2FkXCI+PC9pPlxuICAgICAgICAgICAgICAgICR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlVmVyc2lvbn0gJHtzYWZlVmVyc2lvbn0gKCR7ZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmVzY2FwZUh0bWwoc2l6ZVRleHQpfSlcbiAgICAgICAgICAgIDwvYT5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYWZlbHkgZm9ybWF0cyBhIHJlcG9zaXRvcnktcHJvdmlkZWQgY2hhbmdlbG9nIHZhbHVlIGZvciBIVE1MIGluc2VydGlvbi5cbiAgICAgKiBIVE1MLWVzY2FwZXMgdGhlIHJhdyB0ZXh0LCB0cmVhdHMgbWlzc2luZy9udWxsL3VuZGVmaW5lZCBhcyBhIHBsYWNlaG9sZGVyLFxuICAgICAqIGFuZCBjb252ZXJ0cyBuZXdsaW5lcyB0byA8YnI+LlxuICAgICAqL1xuICAgIGZvcm1hdENoYW5nZWxvZ1RleHQocmF3KSB7XG4gICAgICAgIGlmIChyYXcgPT09IG51bGwgfHwgcmF3ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBgPGk+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X05vQ2hhbmdlbG9nQXZhaWxhYmxlIHx8ICcnfTwvaT5gO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRleHQgPSBTdHJpbmcocmF3KTtcbiAgICAgICAgaWYgKHRleHQgPT09ICcnIHx8IHRleHQgPT09ICdudWxsJyB8fCB0ZXh0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIGA8aT4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfTm9DaGFuZ2Vsb2dBdmFpbGFibGUgfHwgJyd9PC9pPmA7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZXNjYXBlZCA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5lc2NhcGVIdG1sKHRleHQpO1xuICAgICAgICBpZiAoZXNjYXBlZC50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gYDxpPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Ob0NoYW5nZWxvZ0F2YWlsYWJsZSB8fCAnJ308L2k+YDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXNjYXBlZC5yZXBsYWNlKC9cXG4vZywgJzxicj4nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTWluaW1hbCBIVE1MIGVzY2FwZSBmb3IgdmFsdWVzIGluamVjdGVkIGludG8gdGhlIGRldGFpbCBwb3B1cC5cbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFN0cmluZyh2YWx1ZSlcbiAgICAgICAgICAgIC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgICAgICAgICAucmVwbGFjZSgvPC9nLCAnJmx0OycpXG4gICAgICAgICAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgJyZxdW90OycpXG4gICAgICAgICAgICAucmVwbGFjZSgvJy9nLCAnJiMzOTsnKTtcbiAgICB9LFxufVxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZXh0ZXJuYWwgbW9kdWxlcyBkZXRhaWwgcGFnZVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbk1vZHVsZURldGFpbC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==