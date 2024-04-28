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
    if (commercial === '1') {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWRldGFpbC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVEZXRhaWwiLCIkbW9kdWxlRGV0YWlsUG9wdXBUcGwiLCIkIiwiJG1vZHVsZURldGFpbFBvcHVwIiwidW5kZWZpbmVkIiwiaW5pdGlhbGl6ZSIsImRvY3VtZW50Iiwib24iLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwicGFyYW1zIiwiJHRhcmdldCIsInRhcmdldCIsImNsb3Nlc3QiLCJoYXNDbGFzcyIsInVuaXFpZCIsImRhdGEiLCJjbG9uZSIsImF0dHIiLCJtb2RhbCIsInBvc2l0aW9uIiwiY2xvc2FibGUiLCJQYnhBcGkiLCJNb2R1bGVzR2V0TW9kdWxlSW5mbyIsImNiQWZ0ZXJHZXRNb2R1bGVEZXRhaWxzIiwiaW5pdGlhbGl6ZVNsaWRlciIsIm1vZGFsRm9ybSIsImZpbmQiLCJzaWJsaW5ncyIsInJlbW92ZUNsYXNzIiwibmV4dCIsImFkZENsYXNzIiwicHJldiIsInJlc3VsdCIsInJlc3BvbnNlIiwicmVwb0RhdGEiLCIkbmV3UG9wdXAiLCJuYW1lIiwidGV4dCIsImxvZ290eXBlIiwiZG93bmxvYWRzIiwiaHRtbCIsInJlbGVhc2VzIiwidmVyc2lvbiIsImN1cnJlbnRWZXJzaW9uIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X1VwZGF0ZU1vZHVsZVNob3J0IiwiZGV2ZWxvcGVyVmlldyIsInByZXBhcmVEZXZlbG9wZXJWaWV3IiwiY29tbWVyY2lhbCIsImNvbW1lcmNpYWxWaWV3IiwicHJlcGFyZUNvbW1lcmNpYWxWaWV3Iiwic2l6ZSIsInNpemVUZXh0IiwiY29udmVydEJ5dGVzVG9SZWFkYWJsZUZvcm1hdCIsInNjcmVlbnNob3RzIiwibGVuZ3RoIiwic2NyZWVuc2hvdHNWaWV3IiwicHJlcGFyZVNjcmVlbnNob3RzVmlldyIsInJlbW92ZSIsImRlc2NyaXB0aW9uVmlldyIsInByZXBhcmVEZXNjcmlwdGlvblZpZXciLCJjaGFuZ2Vsb2dWaWV3IiwicHJlcGFyZUNoYW5nZUxvZ1ZpZXciLCJldWxhIiwiVXNlck1lc3NhZ2UiLCJjb252ZXJ0VG9UZXh0IiwiaGlkZSIsInRhYiIsImJ5dGVzIiwibWVnYWJ5dGVzIiwicm91bmRlZE1lZ2FieXRlcyIsInRvRml4ZWQiLCJleHRfQ29tbWVyY2lhbE1vZHVsZSIsImV4dF9GcmVlTW9kdWxlIiwiZWFjaCIsImluZGV4Iiwic2NyZWVuc2hvdCIsInVybCIsImRlc2NyaXB0aW9uIiwiZXh0X1VzZWZ1bExpbmtzIiwicHJvbW9fbGluayIsImV4dF9FeHRlcm5hbERlc2NyaXB0aW9uIiwiZGV2ZWxvcGVyIiwicmVsZWFzZSIsInJlbGVhc2VEYXRlIiwiY3JlYXRlZCIsInNwbGl0IiwiY2hhbmdlTG9nVGV4dCIsImNoYW5nZWxvZyIsImV4dF9JbnN0YWxsTW9kdWxlUmVsZWFzZVRhZyIsImV4dF9Gcm9tRGF0ZSIsImV4dF9TeXN0ZW1WZXJzaW9uUmVxdWlyZWQiLCJyZXF1aXJlX3ZlcnNpb24iLCJyZWxlYXNlSUQiLCJleHRfSW5zdGFsbE1vZHVsZVZlcnNpb24iLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxxQkFBcUIsR0FBRztBQUMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxxQkFBcUIsRUFBRUMsQ0FBQyxDQUFDLDBCQUFELENBTEU7O0FBTzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGtCQUFrQixFQUFFQyxTQVhNOztBQWMxQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBbkIwQix3QkFtQmI7QUFDVDtBQUNBSCxJQUFBQSxDQUFDLENBQUNJLFFBQUQsQ0FBRCxDQUFZQyxFQUFaLENB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QUssTUFBdEIsRUFBOEI7QUFDMUJBLFFBQUFBLGFBQWEsR0FBRyxFQUFoQjtBQUNIOztBQUNEL0MsTUFBQUEsSUFBSSxJQUFJLG1DQUFSO0FBQ0FBLE1BQUFBLElBQUksbURBQTBDSSxlQUFlLENBQUM2QywyQkFBMUQsZUFBMEZOLE9BQU8sQ0FBQ3pDLE9BQWxHLGNBQTZHRSxlQUFlLENBQUM4QyxZQUE3SCxjQUE2SU4sV0FBN0ksV0FBSjtBQUNBNUMsTUFBQUEsSUFBSSxnSUFBbUgyQyxPQUFPLENBQUM1QyxTQUEzSCxrQkFBSjtBQUNBQyxNQUFBQSxJQUFJLCtDQUF3QytDLGFBQXhDLFNBQUo7QUFFQS9DLE1BQUFBLElBQUksb0JBQWFJLGVBQWUsQ0FBQytDLHlCQUE3QixlQUEyRFIsT0FBTyxDQUFDUyxlQUFuRSxhQUFKO0FBQ0FwRCxNQUFBQSxJQUFJLCtIQUNnQk4sUUFBUSxDQUFDcEIsTUFEekIsaURBRWlCcUUsT0FBTyxDQUFDekMsT0FGekIsa0RBR2tCeUMsT0FBTyxDQUFDVSxTQUgxQixtRkFLRWpELGVBQWUsQ0FBQ2tELHdCQUxsQixjQUs4Q1gsT0FBTyxDQUFDekMsT0FMdEQsZUFLa0VVLFFBTGxFLHdCQUFKO0FBT0FaLE1BQUFBLElBQUksSUFBSSxjQUFSO0FBQ0gsS0F0QkQ7QUF1QkEsV0FBT0EsSUFBUDtBQUNIO0FBOVJ5QixDQUE5QixDLENBaVNBOztBQUNBdkMsQ0FBQyxDQUFDSSxRQUFELENBQUQsQ0FBWTBGLEtBQVosQ0FBa0IsWUFBTTtBQUNwQmhHLEVBQUFBLHFCQUFxQixDQUFDSyxVQUF0QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpLCBnbG9iYWxUcmFuc2xhdGUgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBleHRlbnNpb24gbW9kdWxlIHBvcHVwLlxuICogQGNsYXNzIGV4dGVuc2lvbk1vZHVsZURldGFpbFxuICogQG1lbWJlcm9mIG1vZHVsZTpQYnhFeHRlbnNpb25Nb2R1bGVzXG4gKi9cbmNvbnN0IGV4dGVuc2lvbk1vZHVsZURldGFpbCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbW9kdWxlIGRldGFpbCBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZHVsZURldGFpbFBvcHVwVHBsOiAkKCcjbW9kdWxlLWRldGFpbHMtdGVtcGxhdGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtb2R1bGUgZGV0YWlsIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbW9kdWxlRGV0YWlsUG9wdXA6IHVuZGVmaW5lZCxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGV4dGVuc2lvbk1vZHVsZURldGFpbCBvYmplY3QuXG4gICAgICogVGhpcyBtZXRob2Qgc2V0cyB1cCB0aGUgbmVjZXNzYXJ5IGV2ZW50IGhhbmRsZXJzIHRvIHRyaWdnZXIgdGhlIGRpc3BsYXkgb2YgbW9kdWxlIGRldGFpbHNcbiAgICAgKiB3aGVuIGEgdXNlciBjbGlja3Mgb24gYSBtb2R1bGUgcm93IHdpdGhpbiB0aGUgUEJYIHN5c3RlbSBpbnRlcmZhY2UuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gVGhlIHRhYmxlIHJvd3Mgd2hpY2ggYWN0aXZhdGUgYSBkZXRhaWwgcG9wdXAuXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICd0ci5uZXctbW9kdWxlLXJvdycsIChldmVudCk9PntcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIGNvbnN0ICR0YXJnZXQgPSAkKGV2ZW50LnRhcmdldCk7XG4gICAgICAgICAgICBpZiAoJHRhcmdldC5jbG9zZXN0KCd0ZCcpLmhhc0NsYXNzKCdzaG93LWRldGFpbHMtb24tY2xpY2snKSl7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnVuaXFpZCA9ICR0YXJnZXQuY2xvc2VzdCgndHInKS5kYXRhKCdpZCcpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJhbXMudW5pcWlkIT09dW5kZWZpbmVkKXtcblxuICAgICAgICAgICAgICAgICAgICAvLyBNb2R1bGUgZGV0YWlsIHBvcHVwIGZvcm1cbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLiRtb2R1bGVEZXRhaWxQb3B1cCA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC4kbW9kdWxlRGV0YWlsUG9wdXBUcGwuY2xvbmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZURldGFpbC4kbW9kdWxlRGV0YWlsUG9wdXAuYXR0cignaWQnLCAnbW9kYWwtJytwYXJhbXMudW5pcWlkKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBwb3B1cFxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVEZXRhaWwuJG1vZHVsZURldGFpbFBvcHVwXG4gICAgICAgICAgICAgICAgICAgICAgICAubW9kYWwoe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAnY2VudGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9zYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICAgICAgICAgICAgICAgICAgUGJ4QXBpLk1vZHVsZXNHZXRNb2R1bGVJbmZvKHBhcmFtcywgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmNiQWZ0ZXJHZXRNb2R1bGVEZXRhaWxzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgc2xpZGVyIGZ1bmN0aW9uYWxpdHkgd2l0aGluIHRoZSBtb2R1bGUgZGV0YWlsIG1vZGFsLlxuICAgICAqIFRoaXMgYWxsb3dzIHVzZXJzIHRvIG5hdmlnYXRlIHRocm91Z2ggYW55IGF2YWlsYWJsZSBzY3JlZW5zaG90cyBvciBhZGRpdGlvbmFsIGluZm9ybWF0aW9uYWwgc2xpZGVzXG4gICAgICogYnkgY2xpY2tpbmcgbGVmdCBvciByaWdodCBhcnJvd3Mgd2l0aGluIHRoZSBtb2RhbC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSBtb2RhbEZvcm0gLSBUaGUgbW9kYWwgZm9ybSB3aXRoaW4gd2hpY2ggdGhlIHNsaWRlciBpcyB0byBiZSBpbml0aWFsaXplZC5cbiAgICAgKiBUaGlzIGZvcm0gc2hvdWxkIGNvbnRhaW4gZWxlbWVudHMgd2l0aCBjbGFzc2VzIGAuc2xpZGVzYCwgYC5yaWdodGAsIGAubGVmdGAsIGFuZCBgLnNsaWRlYCBmb3IgdGhlIHNsaWRlciB0byBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplU2xpZGVyKG1vZGFsRm9ybSl7XG4gICAgICAgIG1vZGFsRm9ybS5maW5kKCcuc2xpZGVzIC5yaWdodCcpXG4gICAgICAgICAgICAub24oJ2NsaWNrJywgKCk9PiB7XG4gICAgICAgICAgICAgICAgbW9kYWxGb3JtLmZpbmQoJy5zbGlkZScpXG4gICAgICAgICAgICAgICAgICAgIC5zaWJsaW5ncygnLmFjdGl2ZTpub3QoOmxhc3Qtb2YtdHlwZSknKVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5uZXh0KClcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIG1vZGFsRm9ybS5maW5kKCcuc2xpZGVzIC5sZWZ0JylcbiAgICAgICAgICAgIC5vbignY2xpY2snLCAoKT0+IHtcbiAgICAgICAgICAgICAgICBtb2RhbEZvcm0uZmluZCgnLnNsaWRlJylcbiAgICAgICAgICAgICAgICAgICAgLnNpYmxpbmdzKCcuYWN0aXZlOm5vdCg6Zmlyc3Qtb2YtdHlwZSknKVxuICAgICAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICAgICAgICAgICAgICAgIC5wcmV2KClcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIHJlc3BvbnNlIGFmdGVyIGZldGNoaW5nIG1vZHVsZSBkZXRhaWxzIGZyb20gdGhlIEFQSS5cbiAgICAgKiBJdCBwb3B1bGF0ZXMgdGhlIG1vZHVsZSBkZXRhaWwgcG9wdXAgd2l0aCB0aGUgcmV0cmlldmVkIGRhdGEsIGluY2x1ZGluZyBuYW1lLCBsb2dvLCB2ZXJzaW9uLCBhbmQgb3RoZXIgbW9kdWxlLXNwZWNpZmljIGluZm9ybWF0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtib29sZWFufSByZXN1bHQgLSBBIGJvb2xlYW4gaW5kaWNhdGluZyBpZiB0aGUgQVBJIHJlcXVlc3Qgd2FzIHN1Y2Nlc3NmdWwuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIGRhdGEgcmV0dXJuZWQgZnJvbSB0aGUgQVBJIHJlcXVlc3QsIGV4cGVjdGVkIHRvIGNvbnRhaW4gbW9kdWxlIGRldGFpbHMgc3VjaCBhcyBuYW1lLFxuICAgICAqICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvZ28gVVJMLCB2ZXJzaW9uLCBhbmQgb3RoZXIgcmVsZXZhbnQgaW5mb3JtYXRpb24uXG4gICAgICovXG4gICAgY2JBZnRlckdldE1vZHVsZURldGFpbHMocmVzdWx0LCByZXNwb25zZSkge1xuICAgICAgICBpZihyZXN1bHQpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlcG9EYXRhID0gcmVzcG9uc2UuZGF0YTtcblxuICAgICAgICAgICAgY29uc3QgJG5ld1BvcHVwID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLiRtb2R1bGVEZXRhaWxQb3B1cDtcblxuXG4gICAgICAgICAgICAvLyBQb3B1bGF0ZSB2YXJpb3VzIGVsZW1lbnRzIGluIHRoZSBwb3B1cCB3aXRoIGRhdGEgZnJvbSB0aGUgcmVzcG9uc2VcbiAgICAgICAgICAgIC8vIE1vZHVsZSBuYW1lXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEubmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtbmFtZScpLnRleHQocmVwb0RhdGEubmFtZSk7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtbG9nbycpLmF0dHIoJ2FsdCcsIHJlcG9EYXRhLm5hbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb2R1bGUgbG9nb1xuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLmxvZ290eXBlICYmIHJlcG9EYXRhLmxvZ290eXBlIT09JycpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1sb2dvJykuYXR0cignc3JjJywgcmVwb0RhdGEubG9nb3R5cGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb2R1bGUgdW5pcWlkXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEudW5pcWlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1pZCcpLnRleHQocmVwb0RhdGEudW5pcWlkKTtcblxuICAgICAgICAgICAgICAgIC8vIEluc3RhbGwgbGFzdCByZWxlYXNlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubWFpbi1pbnN0YWxsLWJ1dHRvbicpLmRhdGEoJ3VuaXFpZCcsIHJlcG9EYXRhLnVuaXFpZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRvdGFsIGNvdW50IG9mIGluc3RhbGxhdGlvbnNcbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5kb3dubG9hZHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWNvdW50LWluc3RhbGxlZCcpLmh0bWwocmVwb0RhdGEuZG93bmxvYWRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTGFzdCByZWxlYXNlIHZlcnNpb25cbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5yZWxlYXNlc1swXS52ZXJzaW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1sYXRlc3QtcmVsZWFzZScpLnRleHQocmVwb0RhdGEucmVsZWFzZXNbMF0udmVyc2lvbik7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb24gPSAkKGB0ci5tb2R1bGUtcm93W2RhdGEtaWQ9JHtyZXBvRGF0YS51bmlxaWR9XWApLmRhdGEoJ3ZlcnNpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFZlcnNpb24hPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkKCdhLm1haW4taW5zdGFsbC1idXR0b24gc3Bhbi5idXR0b24tdGV4dCcpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGVTaG9ydCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEZXZlbG9wZXJcbiAgICAgICAgICAgIGNvbnN0IGRldmVsb3BlclZpZXcgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwucHJlcGFyZURldmVsb3BlclZpZXcocmVwb0RhdGEpO1xuICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtcHVibGlzaGVyJykuaHRtbChkZXZlbG9wZXJWaWV3KTtcblxuICAgICAgICAgICAgLy8gQ29tbWVyY2lhbFxuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLmNvbW1lcmNpYWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbW1lcmNpYWxWaWV3ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLnByZXBhcmVDb21tZXJjaWFsVmlldyhyZXBvRGF0YS5jb21tZXJjaWFsKTtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1jb21tZXJjaWFsJykuaHRtbChjb21tZXJjaWFsVmlldyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlbGVhc2Ugc2l6ZVxuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLnJlbGVhc2VzWzBdLnNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemVUZXh0ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmNvbnZlcnRCeXRlc1RvUmVhZGFibGVGb3JtYXQocmVwb0RhdGEucmVsZWFzZXNbMF0uc2l6ZSk7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtbGF0ZXN0LXJlbGVhc2Utc2l6ZScpLnRleHQoc2l6ZVRleHQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTY3JlZW5zaG90c1xuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLnNjcmVlbnNob3RzICE9PSB1bmRlZmluZWQgJiYgcmVwb0RhdGEuc2NyZWVuc2hvdHMubGVuZ3RoPjApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBzY3JlZW5zaG90c1ZpZXcgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwucHJlcGFyZVNjcmVlbnNob3RzVmlldyhyZXBvRGF0YS5zY3JlZW5zaG90cyk7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtc2NyZWVuc2hvdHMnKS5odG1sKHNjcmVlbnNob3RzVmlldyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLXNjcmVlbnNob3RzJykucmVtb3ZlKCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIERlc2NyaXB0aW9uXG4gICAgICAgICAgICBjb25zdCBkZXNjcmlwdGlvblZpZXcgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwucHJlcGFyZURlc2NyaXB0aW9uVmlldyhyZXBvRGF0YSk7XG4gICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1kZXNjcmlwdGlvbicpLmh0bWwoZGVzY3JpcHRpb25WaWV3KTtcblxuICAgICAgICAgICAgLy8gQ2hhbmdlbG9nXG4gICAgICAgICAgICBjb25zdCBjaGFuZ2Vsb2dWaWV3ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLnByZXBhcmVDaGFuZ2VMb2dWaWV3KHJlcG9EYXRhKTtcbiAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWNoYW5nZWxvZycpLmh0bWwoY2hhbmdlbG9nVmlldyk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGltYWdlIHNsaWRlciBmb3Igc2NyZWVuc2hvdHMsIGlmIGFueVxuICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmluaXRpYWxpemVTbGlkZXIoJG5ld1BvcHVwKTtcblxuICAgICAgICAgICAgLy8gVG90YWwgY291bnQgb2YgaW5zdGFsbGF0aW9uc1xuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLmV1bGEpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1ldWxhJykuaHRtbChVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KHJlcG9EYXRhLmV1bGEpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJ2FbZGF0YS10YWI9XCJldWxhXCJdJykuaGlkZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRhYiBtZW51XG4gICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1kZXRhaWxzLW1lbnUgLml0ZW0nKS50YWIoKTtcblxuICAgICAgICAgICAgLy8gSGlkZSB0aGUgZGltbWVyIHRvIHJldmVhbCB0aGUgcG9wdXAgY29udGVudFxuICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgYSBieXRlIHZhbHVlIHRvIGEgaHVtYW4tcmVhZGFibGUgZm9ybWF0IGluIG1lZ2FieXRlcyAoTWIpLlxuICAgICAqIFRoaXMgbWV0aG9kIGlzIHVzZWZ1bCBmb3IgZGlzcGxheWluZyBmaWxlIHNpemVzIGluIGEgbW9yZSB1bmRlcnN0YW5kYWJsZSBmb3JtYXQgdG8gdXNlcnMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gYnl0ZXMgLSBUaGUgc2l6ZSBpbiBieXRlcyB0byBiZSBjb252ZXJ0ZWQuXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBUaGUgZm9ybWF0dGVkIHNpemUgaW4gbWVnYWJ5dGVzIChNYikgd2l0aCB0d28gZGVjaW1hbCBwbGFjZXMuXG4gICAgICovXG4gICAgIGNvbnZlcnRCeXRlc1RvUmVhZGFibGVGb3JtYXQoYnl0ZXMpIHtcbiAgICAgICAgY29uc3QgbWVnYWJ5dGVzID0gYnl0ZXMgLyAoMTAyNCoxMDI0KTtcbiAgICAgICAgY29uc3Qgcm91bmRlZE1lZ2FieXRlcyA9IG1lZ2FieXRlcy50b0ZpeGVkKDIpO1xuICAgICAgICByZXR1cm4gYCR7cm91bmRlZE1lZ2FieXRlc30gTWJgO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYW5kIHJldHVybnMgSFRNTCBjb250ZW50IHRvIGRpc3BsYXkgY29tbWVyY2lhbCBpbmZvcm1hdGlvbiBhYm91dCB0aGUgbW9kdWxlLlxuICAgICAqIFRoaXMgZGlzdGluZ3Vpc2hlcyBiZXR3ZWVuIGNvbW1lcmNpYWwgYW5kIGZyZWUgbW9kdWxlcyB3aXRoIGFuIGFwcHJvcHJpYXRlIGljb24gYW5kIHRleHQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29tbWVyY2lhbCAtIEEgc3RyaW5nIGluZGljYXRpbmcgdGhlIGNvbW1lcmNpYWwgc3RhdHVzIG9mIHRoZSBtb2R1bGUgKCcxJyBmb3IgY29tbWVyY2lhbCwgb3RoZXJ3aXNlIGZyZWUpLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBjb21tZXJjaWFsIHN0YXR1cyBvZiB0aGUgbW9kdWxlLlxuICAgICAqL1xuICAgIHByZXBhcmVDb21tZXJjaWFsVmlldyhjb21tZXJjaWFsKSB7XG4gICAgICAgIGlmKGNvbW1lcmNpYWw9PT0nMScpe1xuICAgICAgICAgICAgcmV0dXJuICc8aSBjbGFzcz1cInVpIGRvbmF0ZSBpY29uXCI+PC9pPiAnK2dsb2JhbFRyYW5zbGF0ZS5leHRfQ29tbWVyY2lhbE1vZHVsZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJzxpIGNsYXNzPVwicHV6emxlIHBpZWNlIGljb25cIj48L2k+ICcrZ2xvYmFsVHJhbnNsYXRlLmV4dF9GcmVlTW9kdWxlO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCBmb3IgZGlzcGxheWluZyBtb2R1bGUgc2NyZWVuc2hvdHMuXG4gICAgICogSWYgdGhlcmUgYXJlIG11bHRpcGxlIHNjcmVlbnNob3RzLCB0aGV5IHdpbGwgYmUgaW5jbHVkZWQgaW4gYSBuYXZpZ2FibGUgc2xpZGVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gc2NyZWVuc2hvdHMgLSBBbiBhcnJheSBvZiBvYmplY3RzIHJlcHJlc2VudGluZyBzY3JlZW5zaG90cywgZWFjaCBjb250YWluaW5nIFVSTCBhbmQgbmFtZSBwcm9wZXJ0aWVzLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0aGUgc2NyZWVuc2hvdCBzbGlkZXIuXG4gICAgICovXG4gICAgcHJlcGFyZVNjcmVlbnNob3RzVmlldyhzY3JlZW5zaG90cykge1xuICAgICAgICBsZXQgaHRtbCA9XG4gICAgICAgICAgICAnICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVpIGNvbnRhaW5lciBzbGlkZXNcIj5cXG4nICtcbiAgICAgICAgICAgICcgICAgICAgICAgICAgICAgPGkgY2xhc3M9XCJiaWcgbGVmdCBhbmdsZSBpY29uXCI+PC9pPlxcbicgK1xuICAgICAgICAgICAgJyAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImJpZyByaWdodCBhbmdsZSBpY29uXCI+PC9pPic7XG4gICAgICAgICQuZWFjaChzY3JlZW5zaG90cywgZnVuY3Rpb24gKGluZGV4LCBzY3JlZW5zaG90KSB7XG4gICAgICAgICAgICBpZiAoaW5kZXggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cInNsaWRlXCI+PGltZyBjbGFzcz1cInVpIGZsdWlkIGltYWdlXCIgc3JjPVwiJHtzY3JlZW5zaG90LnVybH1cIiBhbHQ9XCIke3NjcmVlbnNob3QubmFtZX1cIj48L2Rpdj5gO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwic2xpZGUgYWN0aXZlXCI+PGltZyBjbGFzcz1cInVpIGZsdWlkIGltYWdlXCIgc3JjPVwiJHtzY3JlZW5zaG90LnVybH1cIiBhbHQ9XCIke3NjcmVlbnNob3QubmFtZX1cIj48L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdlbmVyYXRlcyBhbmQgcmV0dXJucyBIVE1MIGNvbnRlbnQgZm9yIHRoZSBtb2R1bGUncyBkZXNjcmlwdGlvbiBzZWN0aW9uLlxuICAgICAqIFRoaXMgaW5jbHVkZXMgdGhlIG1vZHVsZSBuYW1lLCBhIHRleHR1YWwgZGVzY3JpcHRpb24sIGFuZCBhbnkgdXNlZnVsIGxpbmtzIHByb3ZpZGVkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlcG9EYXRhIC0gQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1vZHVsZSdzIG1ldGFkYXRhLCBpbmNsdWRpbmcgbmFtZSwgZGVzY3JpcHRpb24sIGFuZCBwcm9tb3Rpb25hbCBsaW5rLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0aGUgbW9kdWxlJ3MgZGVzY3JpcHRpb24gc2VjdGlvbi5cbiAgICAgKi9cbiAgICBwcmVwYXJlRGVzY3JpcHRpb25WaWV3KHJlcG9EYXRhKSB7XG4gICAgICAgIGxldCBodG1sID0gYDxkaXYgY2xhc3M9XCJ1aSBoZWFkZXJcIj4ke3JlcG9EYXRhLm5hbWV9PC9kaXY+YDtcbiAgICAgICAgaHRtbCArPSBgPHA+JHtyZXBvRGF0YS5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cInVpIGhlYWRlclwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Vc2VmdWxMaW5rc308L2Rpdj5gO1xuICAgICAgICBodG1sICs9ICc8dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgaHRtbCArPSBgPGxpIGNsYXNzPVwiaXRlbVwiPjxhIGhyZWY9XCIke3JlcG9EYXRhLnByb21vX2xpbmt9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0V4dGVybmFsRGVzY3JpcHRpb259PC9hPjwvbGk+YDtcbiAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCB0byBkaXNwbGF5IHRoZSBkZXZlbG9wZXIncyBpbmZvcm1hdGlvbiBmb3IgdGhlIG1vZHVsZS5cbiAgICAgKiBUaGlzIGlzIHR5cGljYWxseSBhIHNpbXBsZSB0ZXh0dWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBkZXZlbG9wZXIncyBuYW1lIG9yIGlkZW50aWZpZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVwb0RhdGEgLSBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEsIGluY2x1ZGluZyBkZXZlbG9wZXIgaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRoZSBkZXZlbG9wZXIgaW5mb3JtYXRpb24gc2VjdGlvbi5cbiAgICAgKi9cbiAgICBwcmVwYXJlRGV2ZWxvcGVyVmlldyhyZXBvRGF0YSkge1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBodG1sICs9IGAke3JlcG9EYXRhLmRldmVsb3Blcn1gO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCBmb3IgZGlzcGxheWluZyB0aGUgbW9kdWxlJ3MgY2hhbmdlbG9nLlxuICAgICAqIEVhY2ggcmVsZWFzZSB3aXRoaW4gdGhlIG1vZHVsZSdzIGhpc3RvcnkgaXMgcHJlc2VudGVkIHdpdGggdmVyc2lvbiBpbmZvcm1hdGlvbiwgZG93bmxvYWQgY291bnQsIGFuZCBhIGRldGFpbGVkIGNoYW5nZWxvZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXBvRGF0YSAtIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtb2R1bGUncyBtZXRhZGF0YSwgaW5jbHVkaW5nIGFuIGFycmF5IG9mIHJlbGVhc2Ugb2JqZWN0cyB3aXRoIHZlcnNpb24sIGRvd25sb2FkIGNvdW50LCBhbmQgY2hhbmdlbG9nIGluZm9ybWF0aW9uLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gSFRNTCBjb250ZW50IGZvciB0aGUgbW9kdWxlJ3MgY2hhbmdlbG9nIHNlY3Rpb24uXG4gICAgICovXG4gICAgcHJlcGFyZUNoYW5nZUxvZ1ZpZXcocmVwb0RhdGEpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgJC5lYWNoKHJlcG9EYXRhLnJlbGVhc2VzLCBmdW5jdGlvbiAoaW5kZXgsIHJlbGVhc2UpIHtcbiAgICAgICAgICAgIGxldCByZWxlYXNlRGF0ZSA9IHJlbGVhc2UuY3JlYXRlZDtcbiAgICAgICAgICAgIHJlbGVhc2VEYXRlID0gcmVsZWFzZURhdGUuc3BsaXQoXCIgXCIpWzBdO1xuICAgICAgICAgICAgY29uc3Qgc2l6ZVRleHQgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwuY29udmVydEJ5dGVzVG9SZWFkYWJsZUZvcm1hdChyZWxlYXNlLnNpemUpO1xuICAgICAgICAgICAgbGV0IGNoYW5nZUxvZ1RleHQgPSBVc2VyTWVzc2FnZS5jb252ZXJ0VG9UZXh0KHJlbGVhc2UuY2hhbmdlbG9nKTtcbiAgICAgICAgICAgIGlmIChjaGFuZ2VMb2dUZXh0ID09PSAnbnVsbCcpIHtcbiAgICAgICAgICAgICAgICBjaGFuZ2VMb2dUZXh0ID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgY2xlYXJpbmcgc2VnbWVudFwiPic7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwidWkgdG9wIGF0dGFjaGVkIGxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGVSZWxlYXNlVGFnfTogJHtyZWxlYXNlLnZlcnNpb259ICR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Gcm9tRGF0ZX0gJHtyZWxlYXNlRGF0ZX08L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cInVpIHRvcCByaWdodCBhdHRhY2hlZCBsYWJlbFwiPjxpIGNsYXNzPVwiaWNvbiBncmV5IGRvd25sb2FkXCI+PC9pPiA8c3BhbiBjbGFzcz1cInVpIG1pbmkgZ3JheSB0ZXh0XCI+JHtyZWxlYXNlLmRvd25sb2Fkc308L3NwYW4+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9J3VpIGJhc2ljIHNlZ21lbnQnPjxwPiR7Y2hhbmdlTG9nVGV4dH08L3A+YDtcblxuICAgICAgICAgICAgaHRtbCArPSBgPHA+PGI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X1N5c3RlbVZlcnNpb25SZXF1aXJlZH06ICR7cmVsZWFzZS5yZXF1aXJlX3ZlcnNpb259PC9iPjwvcD5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGEgaHJlZj1cIiNcIiBjbGFzcz1cInVpIGljb24gbGFiZWxlZCBzbWFsbCBibHVlIHJpZ2h0IGZsb2F0ZWQgYnV0dG9uIGRvd25sb2FkXCJcbiAgICAgICAgICAgICAgIGRhdGEtdW5pcWlkID0gXCIke3JlcG9EYXRhLnVuaXFpZH1cIlxuICAgICAgICAgICAgICAgZGF0YS12ZXJzaW9uID0gXCIke3JlbGVhc2UudmVyc2lvbn1cIlxuICAgICAgICAgICAgICAgZGF0YS1yZWxlYXNlaWQgPVwiJHtyZWxlYXNlLnJlbGVhc2VJRH1cIj5cbiAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImljb24gZG93bmxvYWRcIj48L2k+XG4gICAgICAgICAgICAgICAgJHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGVWZXJzaW9ufSAke3JlbGVhc2UudmVyc2lvbn0gKCR7c2l6ZVRleHR9KVxuICAgICAgICAgICAgPC9hPmA7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxufVxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgZXh0ZXJuYWwgbW9kdWxlcyBkZXRhaWwgcGFnZVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGV4dGVuc2lvbk1vZHVsZURldGFpbC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==