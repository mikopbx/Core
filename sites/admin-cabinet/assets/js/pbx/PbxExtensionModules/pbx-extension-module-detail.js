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

/* global globalRootUrl, PbxApi, globalTranslate */

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
          PbxApi.ModulesGetModuleInfo(params, extensionModuleDetail.cbAfterGetModuleDetails);
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
   * @param {boolean} result - A boolean indicating if the API request was successful.
   * @param {Object} response - The data returned from the API request, expected to contain module details such as name,
   *                            logo URL, version, and other relevant information.
   */
  cbAfterGetModuleDetails: function cbAfterGetModuleDetails(result, response) {
    if (result) {
      var repoData = response.data;
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


      if (repoData.screenshots !== undefined && repoData.screenshots.length > 0) {
        var screenshotsView = extensionModuleDetail.prepareScreenshotsView(repoData.screenshots);
        $newPopup.find('.module-screenshots').html(screenshotsView);
      } else {
        $newPopup.find('.module-screenshots').remove();
      } // Description


      var descriptionView = extensionModuleDetail.prepareDescriptionView(repoData);
      $newPopup.find('.module-description').html(descriptionView); // Changelog

      var changelogView = extensionModuleDetail.prepareChangeLogView(repoData);
      $newPopup.find('.module-changelog').html(changelogView); // Initialize the image slider for screenshots, if any

      extensionModuleDetail.initializeSlider($newPopup); // Total count of installations

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
      releaseDate = releaseDate.split(" ")[0];
      var sizeText = extensionModuleDetail.convertBytesToReadableFormat(release.size);
      var changeLogText = UserMessage.convertToText(release.changelog);

      if (changeLogText === 'null') {
        changeLogText = '';
      }

      html += '<div class="ui clearing segment">';
      html += "<div class=\"ui top attached label\">".concat(globalTranslate.ext_InstallModuleReleaseTag, ": ").concat(release.version, " ").concat(globalTranslate.ext_FromDate, " ").concat(releaseDate, "</div>");
      html += "<div class=\"ui top right attached label\"><i class=\"icon grey download\"></i> <span class=\"ui mini gray text\">".concat(release.downloads, "</span></div>");
      html += "<div class='ui basic segment'><p>".concat(changeLogText, "</p>");
      html += "<p><b>".concat(globalTranslate.ext_SystemVersionRequired, ": ").concat(release.require_version, "</b></p>");
      html += "<a href=\"#\" class=\"ui icon labeled small blue right floated button download\"\n               data-uniqid = \"".concat(repoData.uniqid, "\"\n               data-version = \"").concat(release.version, "\"\n               data-releaseid =\"").concat(release.releaseID, "\">\n                <i class=\"icon download\"></i>\n                ").concat(globalTranslate.ext_InstallModuleVersion, " ").concat(release.version, " (").concat(sizeText, ")\n            </a>");
      html += '</div></div>';
    });
    return html;
  }
}; // When the document is ready, initialize the external modules detail page

$(document).ready(function () {
  extensionModuleDetail.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWRldGFpbC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVEZXRhaWwiLCIkbW9kdWxlRGV0YWlsUG9wdXBUcGwiLCIkIiwiJG1vZHVsZURldGFpbFBvcHVwIiwidW5kZWZpbmVkIiwiaW5pdGlhbGl6ZSIsImRvY3VtZW50Iiwib24iLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwicGFyYW1zIiwiJHRhcmdldCIsInRhcmdldCIsImNsb3Nlc3QiLCJoYXNDbGFzcyIsInVuaXFpZCIsImRhdGEiLCJjbG9uZSIsImF0dHIiLCJtb2RhbCIsInBvc2l0aW9uIiwiY2xvc2FibGUiLCJQYnhBcGkiLCJNb2R1bGVzR2V0TW9kdWxlSW5mbyIsImNiQWZ0ZXJHZXRNb2R1bGVEZXRhaWxzIiwiaW5pdGlhbGl6ZVNsaWRlciIsIm1vZGFsRm9ybSIsImZpbmQiLCJzaWJsaW5ncyIsInJlbW92ZUNsYXNzIiwibmV4dCIsImFkZENsYXNzIiwicHJldiIsInJlc3VsdCIsInJlc3BvbnNlIiwicmVwb0RhdGEiLCIkbmV3UG9wdXAiLCJuYW1lIiwidGV4dCIsImxvZ290eXBlIiwiZG93bmxvYWRzIiwiaHRtbCIsInJlbGVhc2VzIiwidmVyc2lvbiIsImN1cnJlbnRWZXJzaW9uIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X1VwZGF0ZU1vZHVsZVNob3J0IiwiZGV2ZWxvcGVyVmlldyIsInByZXBhcmVEZXZlbG9wZXJWaWV3IiwiY29tbWVyY2lhbCIsImNvbW1lcmNpYWxWaWV3IiwicHJlcGFyZUNvbW1lcmNpYWxWaWV3Iiwic2l6ZSIsInNpemVUZXh0IiwiY29udmVydEJ5dGVzVG9SZWFkYWJsZUZvcm1hdCIsInNjcmVlbnNob3RzIiwibGVuZ3RoIiwic2NyZWVuc2hvdHNWaWV3IiwicHJlcGFyZVNjcmVlbnNob3RzVmlldyIsInJlbW92ZSIsImRlc2NyaXB0aW9uVmlldyIsInByZXBhcmVEZXNjcmlwdGlvblZpZXciLCJjaGFuZ2Vsb2dWaWV3IiwicHJlcGFyZUNoYW5nZUxvZ1ZpZXciLCJldWxhIiwiVXNlck1lc3NhZ2UiLCJjb252ZXJ0VG9UZXh0IiwiaGlkZSIsInRhYiIsImJ5dGVzIiwibWVnYWJ5dGVzIiwicm91bmRlZE1lZ2FieXRlcyIsInRvRml4ZWQiLCJleHRfQ29tbWVyY2lhbE1vZHVsZSIsImV4dF9GcmVlTW9kdWxlIiwiZWFjaCIsImluZGV4Iiwic2NyZWVuc2hvdCIsInVybCIsImRlc2NyaXB0aW9uIiwiZXh0X1VzZWZ1bExpbmtzIiwicHJvbW9fbGluayIsImV4dF9FeHRlcm5hbERlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwicmVsZWFzZSIsInJlbGVhc2VEYXRlIiwiY3JlYXRlZCIsInNwbGl0IiwiY2hhbmdlTG9nVGV4dCIsImNoYW5nZWxvZyIsImV4dF9JbnN0YWxsTW9kdWxlUmVsZWFzZVRhZyIsImV4dF9Gcm9tRGF0ZSIsImV4dF9TeXN0ZW1WZXJzaW9uUmVxdWlyZWQiLCJyZXF1aXJlX3ZlcnNpb24iLCJyZWxlYXNlSUQiLCJleHRfSW5zdGFsbE1vZHVsZVZlcnNpb24iLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxxQkFBcUIsR0FBRztBQUMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxxQkFBcUIsRUFBRUMsQ0FBQyxDQUFDLDBCQUFELENBTEU7O0FBTzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFQyxTQVhNOztBQWMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBbkIwQix3QkFtQmI7QUFDVDtBQUNBSCxJQUFBQSxDQUFDLENBQUNJLFFBQUQsQ0FBRCxDQUFZQyxFQUFaLENB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SyxNQUF0QixFQUE4QjtBQUMxQkEsUUFBQUEsYUFBYSxHQUFHLEVBQWhCO0FBQ0g7O0FBQ0QvQyxNQUFBQSxJQUFJLElBQUksbUNBQVI7QUFDQUEsTUFBQUEsSUFBSSxtREFBMENJLGVBQWUsQ0FBQzZDLDJCQUExRCxlQUEwRk4sT0FBTyxDQUFDekMsT0FBbEcsY0FBNkdFLGVBQWUsQ0FBQzhDLFlBQTdILGNBQTZJTixXQUE3SSxXQUFKO0FBQ0E1QyxNQUFBQSxJQUFJLGdJQUFtSDJDLE9BQU8sQ0FBQzVDLFNBQTNILGtCQUFKO0FBQ0FDLE1BQUFBLElBQUksK0NBQXdDK0MsYUFBeEMsU0FBSjtBQUVBL0MsTUFBQUEsSUFBSSxvQkFBYUksZUFBZSxDQUFDK0MseUJBQTdCLGVBQTJEUixPQUFPLENBQUNTLGVBQW5FLGFBQUo7QUFDQXBELE1BQUFBLElBQUksK0hBQ2dCTixRQUFRLENBQUNwQixNQUR6QixpREFFaUJxRSxPQUFPLENBQUN6QyxPQUZ6QixrREFHa0J5QyxPQUFPLENBQUNVLFNBSDFCLG1GQUtFakQsZUFBZSxDQUFDa0Qsd0JBTGxCLGNBSzhDWCxPQUFPLENBQUN6QyxPQUx0RCxlQUtrRVUsUUFMbEUsd0JBQUo7QUFPQVosTUFBQUEsSUFBSSxJQUFJLGNBQVI7QUFDSCxLQXRCRDtBQXVCQSxXQUFPQSxJQUFQO0FBQ0g7QUE5UnlCLENBQTlCLEMsQ0FpU0E7O0FBQ0F2QyxDQUFDLENBQUNJLFFBQUQsQ0FBRCxDQUFZMEYsS0FBWixDQUFrQixZQUFNO0FBQ3BCaEcsRUFBQUEscUJBQXFCLENBQUNLLFVBQXRCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI0IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBQYnhBcGksIGdsb2JhbFRyYW5zbGF0ZSAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIGV4dGVuc2lvbiBtb2R1bGUgcG9wdXAuXG4gKiBAY2xhc3MgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsXG4gKiBAbWVtYmVyb2YgbW9kdWxlOlBieEV4dGVuc2lvbk1vZHVsZXNcbiAqL1xuY29uc3QgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtb2R1bGUgZGV0YWlsIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbW9kdWxlRGV0YWlsUG9wdXBUcGw6ICQoJyNtb2R1bGUtZGV0YWlscy10ZW1wbGF0ZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1vZHVsZSBkZXRhaWwgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtb2R1bGVEZXRhaWxQb3B1cDogdW5kZWZpbmVkLFxuXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsIG9iamVjdC5cbiAgICAgKiBUaGlzIG1ldGhvZCBzZXRzIHVwIHRoZSBuZWNlc3NhcnkgZXZlbnQgaGFuZGxlcnMgdG8gdHJpZ2dlciB0aGUgZGlzcGxheSBvZiBtb2R1bGUgZGV0YWlsc1xuICAgICAqIHdoZW4gYSB1c2VyIGNsaWNrcyBvbiBhIG1vZHVsZSByb3cgd2l0aGluIHRoZSBQQlggc3lzdGVtIGludGVyZmFjZS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBUaGUgdGFibGUgcm93cyB3aGljaCBhY3RpdmF0ZSBhIGRldGFpbCBwb3B1cC5cbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJ3RyLm5ldy1tb2R1bGUtcm93JywgKGV2ZW50KT0+e1xuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgY29uc3QgJHRhcmdldCA9ICQoZXZlbnQudGFyZ2V0KTtcbiAgICAgICAgICAgIGlmICgkdGFyZ2V0LmNsb3Nlc3QoJ3RkJykuaGFzQ2xhc3MoJ3Nob3ctZGV0YWlscy1vbi1jbGljaycpKXtcbiAgICAgICAgICAgICAgICBwYXJhbXMudW5pcWlkID0gJHRhcmdldC5jbG9zZXN0KCd0cicpLmRhdGEoJ2lkJyk7XG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtcy51bmlxaWQhPT11bmRlZmluZWQpe1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIE1vZHVsZSBkZXRhaWwgcG9wdXAgZm9ybVxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVEZXRhaWwuJG1vZHVsZURldGFpbFBvcHVwID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLiRtb2R1bGVEZXRhaWxQb3B1cFRwbC5jbG9uZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLiRtb2R1bGVEZXRhaWxQb3B1cC5hdHRyKCdpZCcsICdtb2RhbC0nK3BhcmFtcy51bmlxaWQpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNob3cgdGhlIHBvcHVwXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZURldGFpbC4kbW9kdWxlRGV0YWlsUG9wdXBcbiAgICAgICAgICAgICAgICAgICAgICAgIC5tb2RhbCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICdjZW50ZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsb3NhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5tb2RhbCgnc2hvdycpO1xuICAgICAgICAgICAgICAgICAgICBQYnhBcGkuTW9kdWxlc0dldE1vZHVsZUluZm8ocGFyYW1zLCBleHRlbnNpb25Nb2R1bGVEZXRhaWwuY2JBZnRlckdldE1vZHVsZURldGFpbHMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzbGlkZXIgZnVuY3Rpb25hbGl0eSB3aXRoaW4gdGhlIG1vZHVsZSBkZXRhaWwgbW9kYWwuXG4gICAgICogVGhpcyBhbGxvd3MgdXNlcnMgdG8gbmF2aWdhdGUgdGhyb3VnaCBhbnkgYXZhaWxhYmxlIHNjcmVlbnNob3RzIG9yIGFkZGl0aW9uYWwgaW5mb3JtYXRpb25hbCBzbGlkZXNcbiAgICAgKiBieSBjbGlja2luZyBsZWZ0IG9yIHJpZ2h0IGFycm93cyB3aXRoaW4gdGhlIG1vZGFsLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9IG1vZGFsRm9ybSAtIFRoZSBtb2RhbCBmb3JtIHdpdGhpbiB3aGljaCB0aGUgc2xpZGVyIGlzIHRvIGJlIGluaXRpYWxpemVkLlxuICAgICAqIFRoaXMgZm9ybSBzaG91bGQgY29udGFpbiBlbGVtZW50cyB3aXRoIGNsYXNzZXMgYC5zbGlkZXNgLCBgLnJpZ2h0YCwgYC5sZWZ0YCwgYW5kIGAuc2xpZGVgIGZvciB0aGUgc2xpZGVyIHRvIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVTbGlkZXIobW9kYWxGb3JtKXtcbiAgICAgICAgbW9kYWxGb3JtLmZpbmQoJy5zbGlkZXMgLnJpZ2h0JylcbiAgICAgICAgICAgIC5vbignY2xpY2snLCAoKT0+IHtcbiAgICAgICAgICAgICAgICBtb2RhbEZvcm0uZmluZCgnLnNsaWRlJylcbiAgICAgICAgICAgICAgICAgICAgLnNpYmxpbmdzKCcuYWN0aXZlOm5vdCg6bGFzdC1vZi10eXBlKScpXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLm5leHQoKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbW9kYWxGb3JtLmZpbmQoJy5zbGlkZXMgLmxlZnQnKVxuICAgICAgICAgICAgLm9uKCdjbGljaycsICgpPT4ge1xuICAgICAgICAgICAgICAgIG1vZGFsRm9ybS5maW5kKCcuc2xpZGUnKVxuICAgICAgICAgICAgICAgICAgICAuc2libGluZ3MoJy5hY3RpdmU6bm90KDpmaXJzdC1vZi10eXBlKScpXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnYWN0aXZlJylcbiAgICAgICAgICAgICAgICAgICAgLnByZXYoKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgcmVzcG9uc2UgYWZ0ZXIgZmV0Y2hpbmcgbW9kdWxlIGRldGFpbHMgZnJvbSB0aGUgQVBJLlxuICAgICAqIEl0IHBvcHVsYXRlcyB0aGUgbW9kdWxlIGRldGFpbCBwb3B1cCB3aXRoIHRoZSByZXRyaWV2ZWQgZGF0YSwgaW5jbHVkaW5nIG5hbWUsIGxvZ28sIHZlcnNpb24sIGFuZCBvdGhlciBtb2R1bGUtc3BlY2lmaWMgaW5mb3JtYXRpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHJlc3VsdCAtIEEgYm9vbGVhbiBpbmRpY2F0aW5nIGlmIHRoZSBBUEkgcmVxdWVzdCB3YXMgc3VjY2Vzc2Z1bC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgZGF0YSByZXR1cm5lZCBmcm9tIHRoZSBBUEkgcmVxdWVzdCwgZXhwZWN0ZWQgdG8gY29udGFpbiBtb2R1bGUgZGV0YWlscyBzdWNoIGFzIG5hbWUsXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nbyBVUkwsIHZlcnNpb24sIGFuZCBvdGhlciByZWxldmFudCBpbmZvcm1hdGlvbi5cbiAgICAgKi9cbiAgICBjYkFmdGVyR2V0TW9kdWxlRGV0YWlscyhyZXN1bHQsIHJlc3BvbnNlKSB7XG4gICAgICAgIGlmKHJlc3VsdCkge1xuICAgICAgICAgICAgY29uc3QgcmVwb0RhdGEgPSByZXNwb25zZS5kYXRhO1xuXG4gICAgICAgICAgICBjb25zdCAkbmV3UG9wdXAgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwuJG1vZHVsZURldGFpbFBvcHVwO1xuXG5cbiAgICAgICAgICAgIC8vIFBvcHVsYXRlIHZhcmlvdXMgZWxlbWVudHMgaW4gdGhlIHBvcHVwIHdpdGggZGF0YSBmcm9tIHRoZSByZXNwb25zZVxuICAgICAgICAgICAgLy8gTW9kdWxlIG5hbWVcbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5uYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1uYW1lJykudGV4dChyZXBvRGF0YS5uYW1lKTtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1sb2dvJykuYXR0cignYWx0JywgcmVwb0RhdGEubmFtZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1vZHVsZSBsb2dvXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEubG9nb3R5cGUgJiYgcmVwb0RhdGEubG9nb3R5cGUhPT0nJykge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWxvZ28nKS5hdHRyKCdzcmMnLCByZXBvRGF0YS5sb2dvdHlwZSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1vZHVsZSB1bmlxaWRcbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS51bmlxaWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWlkJykudGV4dChyZXBvRGF0YS51bmlxaWQpO1xuXG4gICAgICAgICAgICAgICAgLy8gSW5zdGFsbCBsYXN0IHJlbGVhc2UgYnV0dG9uXG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tYWluLWluc3RhbGwtYnV0dG9uJykuZGF0YSgndW5pcWlkJywgcmVwb0RhdGEudW5pcWlkKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVG90YWwgY291bnQgb2YgaW5zdGFsbGF0aW9uc1xuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLmRvd25sb2FkcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtY291bnQtaW5zdGFsbGVkJykuaHRtbChyZXBvRGF0YS5kb3dubG9hZHMpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBMYXN0IHJlbGVhc2UgdmVyc2lvblxuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLnJlbGVhc2VzWzBdLnZlcnNpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWxhdGVzdC1yZWxlYXNlJykudGV4dChyZXBvRGF0YS5yZWxlYXNlc1swXS52ZXJzaW9uKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50VmVyc2lvbiA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke3JlcG9EYXRhLnVuaXFpZH1dYCkuZGF0YSgndmVyc2lvbicpO1xuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VmVyc2lvbiE9PXVuZGVmaW5lZCl7XG4gICAgICAgICAgICAgICAgICAgICQoJ2EubWFpbi1pbnN0YWxsLWJ1dHRvbiBzcGFuLmJ1dHRvbi10ZXh0JykudGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZVNob3J0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERldmVsb3BlclxuICAgICAgICAgICAgY29uc3QgZGV2ZWxvcGVyVmlldyA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5wcmVwYXJlRGV2ZWxvcGVyVmlldyhyZXBvRGF0YSk7XG4gICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1wdWJsaXNoZXInKS5odG1sKGRldmVsb3BlclZpZXcpO1xuXG4gICAgICAgICAgICAvLyBDb21tZXJjaWFsXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEuY29tbWVyY2lhbCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29tbWVyY2lhbFZpZXcgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwucHJlcGFyZUNvbW1lcmNpYWxWaWV3KHJlcG9EYXRhLmNvbW1lcmNpYWwpO1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWNvbW1lcmNpYWwnKS5odG1sKGNvbW1lcmNpYWxWaWV3KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmVsZWFzZSBzaXplXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEucmVsZWFzZXNbMF0uc2l6ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2l6ZVRleHQgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwuY29udmVydEJ5dGVzVG9SZWFkYWJsZUZvcm1hdChyZXBvRGF0YS5yZWxlYXNlc1swXS5zaXplKTtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1sYXRlc3QtcmVsZWFzZS1zaXplJykudGV4dChzaXplVGV4dCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFNjcmVlbnNob3RzXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEuc2NyZWVuc2hvdHMgIT09IHVuZGVmaW5lZCAmJiByZXBvRGF0YS5zY3JlZW5zaG90cy5sZW5ndGg+MCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNjcmVlbnNob3RzVmlldyA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5wcmVwYXJlU2NyZWVuc2hvdHNWaWV3KHJlcG9EYXRhLnNjcmVlbnNob3RzKTtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1zY3JlZW5zaG90cycpLmh0bWwoc2NyZWVuc2hvdHNWaWV3KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtc2NyZWVuc2hvdHMnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGVzY3JpcHRpb25cbiAgICAgICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uVmlldyA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5wcmVwYXJlRGVzY3JpcHRpb25WaWV3KHJlcG9EYXRhKTtcbiAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWRlc2NyaXB0aW9uJykuaHRtbChkZXNjcmlwdGlvblZpZXcpO1xuXG4gICAgICAgICAgICAvLyBDaGFuZ2Vsb2dcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZWxvZ1ZpZXcgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwucHJlcGFyZUNoYW5nZUxvZ1ZpZXcocmVwb0RhdGEpO1xuICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtY2hhbmdlbG9nJykuaHRtbChjaGFuZ2Vsb2dWaWV3KTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgaW1hZ2Ugc2xpZGVyIGZvciBzY3JlZW5zaG90cywgaWYgYW55XG4gICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVEZXRhaWwuaW5pdGlhbGl6ZVNsaWRlcigkbmV3UG9wdXApO1xuXG4gICAgICAgICAgICAvLyBUb3RhbCBjb3VudCBvZiBpbnN0YWxsYXRpb25zXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEuZXVsYSkge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWV1bGEnKS5odG1sKFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQocmVwb0RhdGEuZXVsYSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnYVtkYXRhLXRhYj1cImV1bGFcIl0nKS5oaWRlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdGFiIG1lbnVcbiAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWRldGFpbHMtbWVudSAuaXRlbScpLnRhYigpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgdG8gcmV2ZWFsIHRoZSBwb3B1cCBjb250ZW50XG4gICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyBhIGJ5dGUgdmFsdWUgdG8gYSBodW1hbi1yZWFkYWJsZSBmb3JtYXQgaW4gbWVnYWJ5dGVzIChNYikuXG4gICAgICogVGhpcyBtZXRob2QgaXMgdXNlZnVsIGZvciBkaXNwbGF5aW5nIGZpbGUgc2l6ZXMgaW4gYSBtb3JlIHVuZGVyc3RhbmRhYmxlIGZvcm1hdCB0byB1c2Vycy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBieXRlcyAtIFRoZSBzaXplIGluIGJ5dGVzIHRvIGJlIGNvbnZlcnRlZC5cbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBmb3JtYXR0ZWQgc2l6ZSBpbiBtZWdhYnl0ZXMgKE1iKSB3aXRoIHR3byBkZWNpbWFsIHBsYWNlcy5cbiAgICAgKi9cbiAgICAgY29udmVydEJ5dGVzVG9SZWFkYWJsZUZvcm1hdChieXRlcykge1xuICAgICAgICBjb25zdCBtZWdhYnl0ZXMgPSBieXRlcyAvICgxMDI0KjEwMjQpO1xuICAgICAgICBjb25zdCByb3VuZGVkTWVnYWJ5dGVzID0gbWVnYWJ5dGVzLnRvRml4ZWQoMik7XG4gICAgICAgIHJldHVybiBgJHtyb3VuZGVkTWVnYWJ5dGVzfSBNYmA7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBhbmQgcmV0dXJucyBIVE1MIGNvbnRlbnQgdG8gZGlzcGxheSBjb21tZXJjaWFsIGluZm9ybWF0aW9uIGFib3V0IHRoZSBtb2R1bGUuXG4gICAgICogVGhpcyBkaXN0aW5ndWlzaGVzIGJldHdlZW4gY29tbWVyY2lhbCBhbmQgZnJlZSBtb2R1bGVzIHdpdGggYW4gYXBwcm9wcmlhdGUgaWNvbiBhbmQgdGV4dC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjb21tZXJjaWFsIC0gQSBzdHJpbmcgaW5kaWNhdGluZyB0aGUgY29tbWVyY2lhbCBzdGF0dXMgb2YgdGhlIG1vZHVsZSAoJzEnIGZvciBjb21tZXJjaWFsLCBvdGhlcndpc2UgZnJlZSkuXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGNvbW1lcmNpYWwgc3RhdHVzIG9mIHRoZSBtb2R1bGUuXG4gICAgICovXG4gICAgcHJlcGFyZUNvbW1lcmNpYWxWaWV3KGNvbW1lcmNpYWwpIHtcbiAgICAgICAgaWYoY29tbWVyY2lhbD09PTEpe1xuICAgICAgICAgICAgcmV0dXJuICc8aSBjbGFzcz1cInVpIGRvbmF0ZSBpY29uXCI+PC9pPiAnK2dsb2JhbFRyYW5zbGF0ZS5leHRfQ29tbWVyY2lhbE1vZHVsZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJzxpIGNsYXNzPVwicHV6emxlIHBpZWNlIGljb25cIj48L2k+ICcrZ2xvYmFsVHJhbnNsYXRlLmV4dF9GcmVlTW9kdWxlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCBmb3IgZGlzcGxheWluZyBtb2R1bGUgc2NyZWVuc2hvdHMuXG4gICAgICogSWYgdGhlcmUgYXJlIG11bHRpcGxlIHNjcmVlbnNob3RzLCB0aGV5IHdpbGwgYmUgaW5jbHVkZWQgaW4gYSBuYXZpZ2FibGUgc2xpZGVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gc2NyZWVuc2hvdHMgLSBBbiBhcnJheSBvZiBvYmplY3RzIHJlcHJlc2VudGluZyBzY3JlZW5zaG90cywgZWFjaCBjb250YWluaW5nIFVSTCBhbmQgbmFtZSBwcm9wZXJ0aWVzLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0aGUgc2NyZWVuc2hvdCBzbGlkZXIuXG4gICAgICovXG4gICAgcHJlcGFyZVNjcmVlbnNob3RzVmlldyhzY3JlZW5zaG90cykge1xuICAgICAgICBsZXQgaHRtbCA9XG4gICAgICAgICAgICAnICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNvbnRhaW5lciBzbGlkZXNcIj5cXG4nICtcbiAgICAgICAgICAgICcgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJiaWcgbGVmdCBhbmdsZSBpY29uXCI+PC9pPlxcbicgK1xuICAgICAgICAgICAgJyAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImJpZyByaWdodCBhbmdsZSBpY29uXCI+PC9pPic7XG4gICAgICAgICQuZWFjaChzY3JlZW5zaG90cywgZnVuY3Rpb24gKGluZGV4LCBzY3JlZW5zaG90KSB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cInNsaWRlXCI+PGltZyBjbGFzcz1cInVpIGZsdWlkIGltYWdlXCIgc3JjPVwiJHtzY3JlZW5zaG90LnVybH1cIiBhbHQ9XCIke3NjcmVlbnNob3QubmFtZX1cIj48L2Rpdj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwic2xpZGUgYWN0aXZlXCI+PGltZyBjbGFzcz1cInVpIGZsdWlkIGltYWdlXCIgc3JjPVwiJHtzY3JlZW5zaG90LnVybH1cIiBhbHQ9XCIke3NjcmVlbnNob3QubmFtZX1cIj48L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBhbmQgcmV0dXJucyBIVE1MIGNvbnRlbnQgZm9yIHRoZSBtb2R1bGUncyBkZXNjcmlwdGlvbiBzZWN0aW9uLlxuICAgICAqIFRoaXMgaW5jbHVkZXMgdGhlIG1vZHVsZSBuYW1lLCBhIHRleHR1YWwgZGVzY3JpcHRpb24sIGFuZCBhbnkgdXNlZnVsIGxpbmtzIHByb3ZpZGVkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlcG9EYXRhIC0gQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1vZHVsZSdzIG1ldGFkYXRhLCBpbmNsdWRpbmcgbmFtZSwgZGVzY3JpcHRpb24sIGFuZCBwcm9tb3Rpb25hbCBsaW5rLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0aGUgbW9kdWxlJ3MgZGVzY3JpcHRpb24gc2VjdGlvbi5cbiAgICAgKi9cbiAgICBwcmVwYXJlRGVzY3JpcHRpb25WaWV3KHJlcG9EYXRhKSB7XG4gICAgICAgIGxldCBodG1sID0gYDxkaXYgY2xhc3M9XCJ1aSBoZWFkZXJcIj4ke3JlcG9EYXRhLm5hbWV9PC9kaXY+YDtcbiAgICAgICAgaHRtbCArPSBgPHA+JHtyZXBvRGF0YS5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cInVpIGhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Vc2VmdWxMaW5rc308L2Rpdj5gO1xuICAgICAgICBodG1sICs9ICc8dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgaHRtbCArPSBgPGxpIGNsYXNzPVwiaXRlbVwiPjxhIGhyZWY9XCIke3JlcG9EYXRhLnByb21vX2xpbmt9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0V4dGVybmFsRGVzY3JpcHRpb259PC9hPjwvbGk+YDtcbiAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCB0byBkaXNwbGF5IHRoZSBkZXZlbG9wZXIncyBpbmZvcm1hdGlvbiBmb3IgdGhlIG1vZHVsZS5cbiAgICAgKiBUaGlzIGlzIHR5cGljYWxseSBhIHNpbXBsZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBkZXZlbG9wZXIncyBuYW1lIG9yIGlkZW50aWZpZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVwb0RhdGEgLSBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEsIGluY2x1ZGluZyBkZXZlbG9wZXIgaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRoZSBkZXZlbG9wZXIgaW5mb3JtYXRpb24gc2VjdGlvbi5cbiAgICAgKi9cbiAgICBwcmVwYXJlRGV2ZWxvcGVyVmlldyhyZXBvRGF0YSkge1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBodG1sICs9IGAke3JlcG9EYXRhLmRldmVsb3Blcn1gO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCBmb3IgZGlzcGxheWluZyB0aGUgbW9kdWxlJ3MgY2hhbmdlbG9nLlxuICAgICAqIEVhY2ggcmVsZWFzZSB3aXRoaW4gdGhlIG1vZHVsZSdzIGhpc3RvcnkgaXMgcHJlc2VudGVkIHdpdGggdmVyc2lvbiBpbmZvcm1hdGlvbiwgZG93bmxvYWQgY291bnQsIGFuZCBhIGRldGFpbGVkIGNoYW5nZWxvZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXBvRGF0YSAtIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtb2R1bGUncyBtZXRhZGF0YSwgaW5jbHVkaW5nIGFuIGFycmF5IG9mIHJlbGVhc2Ugb2JqZWN0cyB3aXRoIHZlcnNpb24sIGRvd25sb2FkIGNvdW50LCBhbmQgY2hhbmdlbG9nIGluZm9ybWF0aW9uLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0aGUgbW9kdWxlJ3MgY2hhbmdlbG9nIHNlY3Rpb24uXG4gICAgICovXG4gICAgcHJlcGFyZUNoYW5nZUxvZ1ZpZXcocmVwb0RhdGEpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgJC5lYWNoKHJlcG9EYXRhLnJlbGVhc2VzLCBmdW5jdGlvbiAoaW5kZXgsIHJlbGVhc2UpIHtcbiAgICAgICAgICAgIGxldCByZWxlYXNlRGF0ZSA9IHJlbGVhc2UuY3JlYXRlZDtcbiAgICAgICAgICAgIHJlbGVhc2VEYXRlID0gcmVsZWFzZURhdGUuc3BsaXQoXCIgXCIpWzBdO1xuICAgICAgICAgICAgY29uc3Qgc2l6ZVRleHQgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwuY29udmVydEJ5dGVzVG9SZWFkYWJsZUZvcm1hdChyZWxlYXNlLnNpemUpO1xuICAgICAgICAgICAgbGV0IGNoYW5nZUxvZ1RleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KHJlbGVhc2UuY2hhbmdlbG9nKTtcbiAgICAgICAgICAgIGlmIChjaGFuZ2VMb2dUZXh0ID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VMb2dUZXh0ID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgY2xlYXJpbmcgc2VnbWVudFwiPic7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwidWkgdG9wIGF0dGFjaGVkIGxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGVSZWxlYXNlVGFnfTogJHtyZWxlYXNlLnZlcnNpb259ICR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Gcm9tRGF0ZX0gJHtyZWxlYXNlRGF0ZX08L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cInVpIHRvcCByaWdodCBhdHRhY2hlZCBsYWJlbFwiPjxpIGNsYXNzPVwiaWNvbiBncmV5IGRvd25sb2FkXCI+PC9pPiA8c3BhbiBjbGFzcz1cInVpIG1pbmkgZ3JheSB0ZXh0XCI+JHtyZWxlYXNlLmRvd25sb2Fkc308L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9J3VpIGJhc2ljIHNlZ21lbnQnPjxwPiR7Y2hhbmdlTG9nVGV4dH08L3A+YDtcblxuICAgICAgICAgICAgaHRtbCArPSBgPHA+PGI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X1N5c3RlbVZlcnNpb25SZXF1aXJlZH06ICR7cmVsZWFzZS5yZXF1aXJlX3ZlcnNpb259PC9iPjwvcD5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGljb24gbGFiZWxlZCBzbWFsbCBibHVlIHJpZ2h0IGZsb2F0ZWQgYnV0dG9uIGRvd25sb2FkXCJcbiAgICAgICAgICAgICAgIGRhdGEtdW5pcWlkID0gXCIke3JlcG9EYXRhLnVuaXFpZH1cIlxuICAgICAgICAgICAgICAgZGF0YS12ZXJzaW9uID0gXCIke3JlbGVhc2UudmVyc2lvbn1cIlxuICAgICAgICAgICAgICAgZGF0YS1yZWxlYXNlaWQgPVwiJHtyZWxlYXNlLnJlbGVhc2VJRH1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZG93bmxvYWRcIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGVWZXJzaW9ufSAke3JlbGVhc2UudmVyc2lvbn0gKCR7c2l6ZVRleHR9KVxuICAgICAgICAgICAgPC9hPmA7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxufVxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZXh0ZXJuYWwgbW9kdWxlcyBkZXRhaWwgcGFnZVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbk1vZHVsZURldGFpbC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==