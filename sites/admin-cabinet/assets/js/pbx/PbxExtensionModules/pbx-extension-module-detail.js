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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWRldGFpbC5qcyJdLCJuYW1lcyI6WyJleHRlbnNpb25Nb2R1bGVEZXRhaWwiLCIkbW9kdWxlRGV0YWlsUG9wdXBUcGwiLCIkIiwiJG1vZHVsZURldGFpbFBvcHVwIiwidW5kZWZpbmVkIiwiaW5pdGlhbGl6ZSIsImRvY3VtZW50Iiwib24iLCJldmVudCIsInByZXZlbnREZWZhdWx0IiwicGFyYW1zIiwiJHRhcmdldCIsInRhcmdldCIsImNsb3Nlc3QiLCJoYXNDbGFzcyIsInVuaXFpZCIsImRhdGEiLCJjbG9uZSIsImF0dHIiLCJtb2RhbCIsInBvc2l0aW9uIiwiY2xvc2FibGUiLCJNb2R1bGVzQVBJIiwiZ2V0TW9kdWxlSW5mbyIsImNiQWZ0ZXJHZXRNb2R1bGVEZXRhaWxzIiwiaW5pdGlhbGl6ZVNsaWRlciIsIm1vZGFsRm9ybSIsImZpbmQiLCJzaWJsaW5ncyIsInJlbW92ZUNsYXNzIiwibmV4dCIsImFkZENsYXNzIiwicHJldiIsInJlcG9EYXRhIiwic3VjY2VzcyIsIiRuZXdQb3B1cCIsIm5hbWUiLCJ0ZXh0IiwibG9nb3R5cGUiLCJkb3dubG9hZHMiLCJodG1sIiwicmVsZWFzZXMiLCJ2ZXJzaW9uIiwiY3VycmVudFZlcnNpb24iLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfVXBkYXRlTW9kdWxlU2hvcnQiLCJkZXZlbG9wZXJWaWV3IiwicHJlcGFyZURldmVsb3BlclZpZXciLCJjb21tZXJjaWFsIiwiY29tbWVyY2lhbFZpZXciLCJwcmVwYXJlQ29tbWVyY2lhbFZpZXciLCJzaXplIiwic2l6ZVRleHQiLCJjb252ZXJ0Qnl0ZXNUb1JlYWRhYmxlRm9ybWF0Iiwic2NyZWVuc2hvdHMiLCJsZW5ndGgiLCJzY3JlZW5zaG90c1ZpZXciLCJwcmVwYXJlU2NyZWVuc2hvdHNWaWV3IiwicmVtb3ZlIiwiZGVzY3JpcHRpb25WaWV3IiwicHJlcGFyZURlc2NyaXB0aW9uVmlldyIsImNoYW5nZWxvZ1ZpZXciLCJwcmVwYXJlQ2hhbmdlTG9nVmlldyIsImV1bGEiLCJVc2VyTWVzc2FnZSIsImNvbnZlcnRUb1RleHQiLCJoaWRlIiwidGFiIiwiYnl0ZXMiLCJtZWdhYnl0ZXMiLCJyb3VuZGVkTWVnYWJ5dGVzIiwidG9GaXhlZCIsImV4dF9Db21tZXJjaWFsTW9kdWxlIiwiZXh0X0ZyZWVNb2R1bGUiLCJlYWNoIiwiaW5kZXgiLCJzY3JlZW5zaG90IiwidXJsIiwiZGVzY3JpcHRpb24iLCJleHRfVXNlZnVsTGlua3MiLCJwcm9tb19saW5rIiwiZXh0X0V4dGVybmFsRGVzY3JpcHRpb24iLCJkZXZlbG9wZXIiLCJyZWxlYXNlIiwicmVsZWFzZURhdGUiLCJjcmVhdGVkIiwic3BsaXQiLCJjaGFuZ2VMb2dUZXh0IiwiY2hhbmdlbG9nIiwiZXh0X0luc3RhbGxNb2R1bGVSZWxlYXNlVGFnIiwiZXh0X0Zyb21EYXRlIiwiZXh0X1N5c3RlbVZlcnNpb25SZXF1aXJlZCIsInJlcXVpcmVfdmVyc2lvbiIsInJlbGVhc2VJRCIsImV4dF9JbnN0YWxsTW9kdWxlVmVyc2lvbiIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLHFCQUFxQixHQUFHO0FBQzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHFCQUFxQixFQUFFQyxDQUFDLENBQUMsMEJBQUQsQ0FMRTs7QUFPMUI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsa0JBQWtCLEVBQUVDLFNBWE07O0FBYzFCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFuQjBCLHdCQW1CYjtBQUNUO0FBQ0FILElBQUFBLENBQUMsQ0FBQ0ksUUFBRCxDQUFELENBQVlDLEVBQVosQ0FBZSxPQUFmLEVBQXdC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LG1DQUFSO0FBQ0FBLE1BQUFBLElBQUksbURBQTBDSSxlQUFlLENBQUM2QywyQkFBMUQsZUFBMEZOLE9BQU8sQ0FBQ3pDLE9BQWxHLGNBQTZHRSxlQUFlLENBQUM4QyxZQUE3SCxjQUE2SU4sV0FBN0ksV0FBSjtBQUNBNUMsTUFBQUEsSUFBSSxnSUFBbUgyQyxPQUFPLENBQUM1QyxTQUEzSCxrQkFBSjtBQUNBQyxNQUFBQSxJQUFJLCtDQUF3QytDLGFBQXhDLFNBQUo7QUFFQS9DLE1BQUFBLElBQUksb0JBQWFJLGVBQWUsQ0FBQytDLHlCQUE3QixlQUEyRFIsT0FBTyxDQUFDUyxlQUFuRSxhQUFKO0FBQ0FwRCxNQUFBQSxJQUFJLCtIQUNnQlAsUUFBUSxDQUFDbEIsTUFEekIsaURBRWlCb0UsT0FBTyxDQUFDekMsT0FGekIsa0RBR2tCeUMsT0FBTyxDQUFDVSxTQUgxQixtRkFLRWpELGVBQWUsQ0FBQ2tELHdCQUxsQixjQUs4Q1gsT0FBTyxDQUFDekMsT0FMdEQsZUFLa0VVLFFBTGxFLHdCQUFKO0FBT0FaLE1BQUFBLElBQUksSUFBSSxjQUFSO0FBQ0gsS0F0QkQ7QUF1QkEsV0FBT0EsSUFBUDtBQUNIO0FBN1J5QixDQUE5QixDLENBZ1NBOztBQUNBdEMsQ0FBQyxDQUFDSSxRQUFELENBQUQsQ0FBWXlGLEtBQVosQ0FBa0IsWUFBTTtBQUNwQi9GLEVBQUFBLHFCQUFxQixDQUFDSyxVQUF0QjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgTW9kdWxlc0FQSSwgZ2xvYmFsVHJhbnNsYXRlICovXG5cbi8qKlxuICogUmVwcmVzZW50cyB0aGUgZXh0ZW5zaW9uIG1vZHVsZSBwb3B1cC5cbiAqIEBjbGFzcyBleHRlbnNpb25Nb2R1bGVEZXRhaWxcbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBleHRlbnNpb25Nb2R1bGVEZXRhaWwgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1vZHVsZSBkZXRhaWwgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtb2R1bGVEZXRhaWxQb3B1cFRwbDogJCgnI21vZHVsZS1kZXRhaWxzLXRlbXBsYXRlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbW9kdWxlIGRldGFpbCBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZHVsZURldGFpbFBvcHVwOiB1bmRlZmluZWQsXG5cblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBleHRlbnNpb25Nb2R1bGVEZXRhaWwgb2JqZWN0LlxuICAgICAqIFRoaXMgbWV0aG9kIHNldHMgdXAgdGhlIG5lY2Vzc2FyeSBldmVudCBoYW5kbGVycyB0byB0cmlnZ2VyIHRoZSBkaXNwbGF5IG9mIG1vZHVsZSBkZXRhaWxzXG4gICAgICogd2hlbiBhIHVzZXIgY2xpY2tzIG9uIGEgbW9kdWxlIHJvdyB3aXRoaW4gdGhlIFBCWCBzeXN0ZW0gaW50ZXJmYWNlLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFRoZSB0YWJsZSByb3dzIHdoaWNoIGFjdGl2YXRlIGEgZGV0YWlsIHBvcHVwLlxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAndHIubmV3LW1vZHVsZS1yb3cnLCAoZXZlbnQpPT57XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0ge307XG4gICAgICAgICAgICBjb25zdCAkdGFyZ2V0ID0gJChldmVudC50YXJnZXQpO1xuICAgICAgICAgICAgaWYgKCR0YXJnZXQuY2xvc2VzdCgndGQnKS5oYXNDbGFzcygnc2hvdy1kZXRhaWxzLW9uLWNsaWNrJykpe1xuICAgICAgICAgICAgICAgIHBhcmFtcy51bmlxaWQgPSAkdGFyZ2V0LmNsb3Nlc3QoJ3RyJykuZGF0YSgnaWQnKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1zLnVuaXFpZCE9PXVuZGVmaW5lZCl7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gTW9kdWxlIGRldGFpbCBwb3B1cCBmb3JtXG4gICAgICAgICAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZURldGFpbC4kbW9kdWxlRGV0YWlsUG9wdXAgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwuJG1vZHVsZURldGFpbFBvcHVwVHBsLmNsb25lKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb25Nb2R1bGVEZXRhaWwuJG1vZHVsZURldGFpbFBvcHVwLmF0dHIoJ2lkJywgJ21vZGFsLScrcGFyYW1zLnVuaXFpZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgcG9wdXBcbiAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLiRtb2R1bGVEZXRhaWxQb3B1cFxuICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ2NlbnRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2FibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgICAgICAgICAgICAgICAgIE1vZHVsZXNBUEkuZ2V0TW9kdWxlSW5mbyhwYXJhbXMsIGV4dGVuc2lvbk1vZHVsZURldGFpbC5jYkFmdGVyR2V0TW9kdWxlRGV0YWlscyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHNsaWRlciBmdW5jdGlvbmFsaXR5IHdpdGhpbiB0aGUgbW9kdWxlIGRldGFpbCBtb2RhbC5cbiAgICAgKiBUaGlzIGFsbG93cyB1c2VycyB0byBuYXZpZ2F0ZSB0aHJvdWdoIGFueSBhdmFpbGFibGUgc2NyZWVuc2hvdHMgb3IgYWRkaXRpb25hbCBpbmZvcm1hdGlvbmFsIHNsaWRlc1xuICAgICAqIGJ5IGNsaWNraW5nIGxlZnQgb3IgcmlnaHQgYXJyb3dzIHdpdGhpbiB0aGUgbW9kYWwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gbW9kYWxGb3JtIC0gVGhlIG1vZGFsIGZvcm0gd2l0aGluIHdoaWNoIHRoZSBzbGlkZXIgaXMgdG8gYmUgaW5pdGlhbGl6ZWQuXG4gICAgICogVGhpcyBmb3JtIHNob3VsZCBjb250YWluIGVsZW1lbnRzIHdpdGggY2xhc3NlcyBgLnNsaWRlc2AsIGAucmlnaHRgLCBgLmxlZnRgLCBhbmQgYC5zbGlkZWAgZm9yIHRoZSBzbGlkZXIgdG8gZnVuY3Rpb24uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNsaWRlcihtb2RhbEZvcm0pe1xuICAgICAgICBtb2RhbEZvcm0uZmluZCgnLnNsaWRlcyAucmlnaHQnKVxuICAgICAgICAgICAgLm9uKCdjbGljaycsICgpPT4ge1xuICAgICAgICAgICAgICAgIG1vZGFsRm9ybS5maW5kKCcuc2xpZGUnKVxuICAgICAgICAgICAgICAgICAgICAuc2libGluZ3MoJy5hY3RpdmU6bm90KDpsYXN0LW9mLXR5cGUpJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICAgICAgICAgICAgICAgICAubmV4dCgpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBtb2RhbEZvcm0uZmluZCgnLnNsaWRlcyAubGVmdCcpXG4gICAgICAgICAgICAub24oJ2NsaWNrJywgKCk9PiB7XG4gICAgICAgICAgICAgICAgbW9kYWxGb3JtLmZpbmQoJy5zbGlkZScpXG4gICAgICAgICAgICAgICAgICAgIC5zaWJsaW5ncygnLmFjdGl2ZTpub3QoOmZpcnN0LW9mLXR5cGUpJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdhY3RpdmUnKVxuICAgICAgICAgICAgICAgICAgICAucHJldigpXG4gICAgICAgICAgICAgICAgICAgIC5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHRoZSByZXNwb25zZSBhZnRlciBmZXRjaGluZyBtb2R1bGUgZGV0YWlscyBmcm9tIHRoZSBBUEkuXG4gICAgICogSXQgcG9wdWxhdGVzIHRoZSBtb2R1bGUgZGV0YWlsIHBvcHVwIHdpdGggdGhlIHJldHJpZXZlZCBkYXRhLCBpbmNsdWRpbmcgbmFtZSwgbG9nbywgdmVyc2lvbiwgYW5kIG90aGVyIG1vZHVsZS1zcGVjaWZpYyBpbmZvcm1hdGlvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXBvRGF0YSAtIFRoZSBtb2R1bGUgZGF0YSByZXR1cm5lZCBmcm9tIHRoZSBBUEkgcmVxdWVzdCwgY29udGFpbmluZyBtb2R1bGUgZGV0YWlscyBzdWNoIGFzIG5hbWUsXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9nbyBVUkwsIHZlcnNpb24sIHJlbGVhc2VzLCBhbmQgb3RoZXIgcmVsZXZhbnQgaW5mb3JtYXRpb24uXG4gICAgICogQHBhcmFtIHtib29sZWFufSBzdWNjZXNzIC0gQSBib29sZWFuIGluZGljYXRpbmcgaWYgdGhlIEFQSSByZXF1ZXN0IHdhcyBzdWNjZXNzZnVsLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJHZXRNb2R1bGVEZXRhaWxzKHJlcG9EYXRhLCBzdWNjZXNzKSB7XG4gICAgICAgIGlmKHN1Y2Nlc3MpIHtcblxuICAgICAgICAgICAgY29uc3QgJG5ld1BvcHVwID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLiRtb2R1bGVEZXRhaWxQb3B1cDtcblxuXG4gICAgICAgICAgICAvLyBQb3B1bGF0ZSB2YXJpb3VzIGVsZW1lbnRzIGluIHRoZSBwb3B1cCB3aXRoIGRhdGEgZnJvbSB0aGUgcmVzcG9uc2VcbiAgICAgICAgICAgIC8vIE1vZHVsZSBuYW1lXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEubmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtbmFtZScpLnRleHQocmVwb0RhdGEubmFtZSk7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtbG9nbycpLmF0dHIoJ2FsdCcsIHJlcG9EYXRhLm5hbWUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb2R1bGUgbG9nb1xuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLmxvZ290eXBlICYmIHJlcG9EYXRhLmxvZ290eXBlIT09JycpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1sb2dvJykuYXR0cignc3JjJywgcmVwb0RhdGEubG9nb3R5cGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNb2R1bGUgdW5pcWlkXG4gICAgICAgICAgICBpZiAocmVwb0RhdGEudW5pcWlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1pZCcpLnRleHQocmVwb0RhdGEudW5pcWlkKTtcblxuICAgICAgICAgICAgICAgIC8vIEluc3RhbGwgbGFzdCByZWxlYXNlIGJ1dHRvblxuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubWFpbi1pbnN0YWxsLWJ1dHRvbicpLmRhdGEoJ3VuaXFpZCcsIHJlcG9EYXRhLnVuaXFpZCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFRvdGFsIGNvdW50IG9mIGluc3RhbGxhdGlvbnNcbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5kb3dubG9hZHMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLWNvdW50LWluc3RhbGxlZCcpLmh0bWwocmVwb0RhdGEuZG93bmxvYWRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTGFzdCByZWxlYXNlIHZlcnNpb25cbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5yZWxlYXNlc1swXS52ZXJzaW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1sYXRlc3QtcmVsZWFzZScpLnRleHQocmVwb0RhdGEucmVsZWFzZXNbMF0udmVyc2lvbik7XG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFZlcnNpb24gPSAkKGB0ci5tb2R1bGUtcm93W2RhdGEtaWQ9JHtyZXBvRGF0YS51bmlxaWR9XWApLmRhdGEoJ3ZlcnNpb24nKTtcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFZlcnNpb24hPT11bmRlZmluZWQpe1xuICAgICAgICAgICAgICAgICAgICAkKCdhLm1haW4taW5zdGFsbC1idXR0b24gc3Bhbi5idXR0b24tdGV4dCcpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGVTaG9ydCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEZXZlbG9wZXJcbiAgICAgICAgICAgIGNvbnN0IGRldmVsb3BlclZpZXcgPSBleHRlbnNpb25Nb2R1bGVEZXRhaWwucHJlcGFyZURldmVsb3BlclZpZXcocmVwb0RhdGEpO1xuICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtcHVibGlzaGVyJykuaHRtbChkZXZlbG9wZXJWaWV3KTtcblxuICAgICAgICAgICAgLy8gQ29tbWVyY2lhbFxuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLmNvbW1lcmNpYWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNvbW1lcmNpYWxWaWV3ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLnByZXBhcmVDb21tZXJjaWFsVmlldyhyZXBvRGF0YS5jb21tZXJjaWFsKTtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1jb21tZXJjaWFsJykuaHRtbChjb21tZXJjaWFsVmlldyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFJlbGVhc2Ugc2l6ZVxuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLnJlbGVhc2VzWzBdLnNpemUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHNpemVUZXh0ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmNvbnZlcnRCeXRlc1RvUmVhZGFibGVGb3JtYXQocmVwb0RhdGEucmVsZWFzZXNbMF0uc2l6ZSk7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtbGF0ZXN0LXJlbGVhc2Utc2l6ZScpLnRleHQoc2l6ZVRleHQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTY3JlZW5zaG90c1xuICAgICAgICAgICAgaWYgKHJlcG9EYXRhLnNjcmVlbnNob3RzICYmIHJlcG9EYXRhLnNjcmVlbnNob3RzLmxlbmd0aD4wKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2NyZWVuc2hvdHNWaWV3ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLnByZXBhcmVTY3JlZW5zaG90c1ZpZXcocmVwb0RhdGEuc2NyZWVuc2hvdHMpO1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcubW9kdWxlLXNjcmVlbnNob3RzJykuaHRtbChzY3JlZW5zaG90c1ZpZXcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1zY3JlZW5zaG90cycpLnJlbW92ZSgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEZXNjcmlwdGlvblxuICAgICAgICAgICAgY29uc3QgZGVzY3JpcHRpb25WaWV3ID0gZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLnByZXBhcmVEZXNjcmlwdGlvblZpZXcocmVwb0RhdGEpO1xuICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtZGVzY3JpcHRpb24nKS5odG1sKGRlc2NyaXB0aW9uVmlldyk7XG5cbiAgICAgICAgICAgIC8vIENoYW5nZWxvZ1xuICAgICAgICAgICAgY29uc3QgY2hhbmdlbG9nVmlldyA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5wcmVwYXJlQ2hhbmdlTG9nVmlldyhyZXBvRGF0YSk7XG4gICAgICAgICAgICAkbmV3UG9wdXAuZmluZCgnLm1vZHVsZS1jaGFuZ2Vsb2cnKS5odG1sKGNoYW5nZWxvZ1ZpZXcpO1xuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBpbWFnZSBzbGlkZXIgZm9yIHNjcmVlbnNob3RzLCBpZiBhbnlcbiAgICAgICAgICAgIGV4dGVuc2lvbk1vZHVsZURldGFpbC5pbml0aWFsaXplU2xpZGVyKCRuZXdQb3B1cCk7XG5cbiAgICAgICAgICAgIC8vIEV1bGFcbiAgICAgICAgICAgIGlmIChyZXBvRGF0YS5ldWxhKSB7XG4gICAgICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtZXVsYScpLmh0bWwoVXNlck1lc3NhZ2UuY29udmVydFRvVGV4dChyZXBvRGF0YS5ldWxhKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCdhW2RhdGEtdGFiPVwiZXVsYVwiXScpLmhpZGUoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgbWVudVxuICAgICAgICAgICAgJG5ld1BvcHVwLmZpbmQoJy5tb2R1bGUtZGV0YWlscy1tZW51IC5pdGVtJykudGFiKCk7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgdGhlIGRpbW1lciB0byByZXZlYWwgdGhlIHBvcHVwIGNvbnRlbnRcbiAgICAgICAgICAgICRuZXdQb3B1cC5maW5kKCcuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIGEgYnl0ZSB2YWx1ZSB0byBhIGh1bWFuLXJlYWRhYmxlIGZvcm1hdCBpbiBtZWdhYnl0ZXMgKE1iKS5cbiAgICAgKiBUaGlzIG1ldGhvZCBpcyB1c2VmdWwgZm9yIGRpc3BsYXlpbmcgZmlsZSBzaXplcyBpbiBhIG1vcmUgdW5kZXJzdGFuZGFibGUgZm9ybWF0IHRvIHVzZXJzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJ5dGVzIC0gVGhlIHNpemUgaW4gYnl0ZXMgdG8gYmUgY29udmVydGVkLlxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIGZvcm1hdHRlZCBzaXplIGluIG1lZ2FieXRlcyAoTWIpIHdpdGggdHdvIGRlY2ltYWwgcGxhY2VzLlxuICAgICAqL1xuICAgICBjb252ZXJ0Qnl0ZXNUb1JlYWRhYmxlRm9ybWF0KGJ5dGVzKSB7XG4gICAgICAgIGNvbnN0IG1lZ2FieXRlcyA9IGJ5dGVzIC8gKDEwMjQqMTAyNCk7XG4gICAgICAgIGNvbnN0IHJvdW5kZWRNZWdhYnl0ZXMgPSBtZWdhYnl0ZXMudG9GaXhlZCgyKTtcbiAgICAgICAgcmV0dXJuIGAke3JvdW5kZWRNZWdhYnl0ZXN9IE1iYDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCB0byBkaXNwbGF5IGNvbW1lcmNpYWwgaW5mb3JtYXRpb24gYWJvdXQgdGhlIG1vZHVsZS5cbiAgICAgKiBUaGlzIGRpc3Rpbmd1aXNoZXMgYmV0d2VlbiBjb21tZXJjaWFsIGFuZCBmcmVlIG1vZHVsZXMgd2l0aCBhbiBhcHByb3ByaWF0ZSBpY29uIGFuZCB0ZXh0LlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbW1lcmNpYWwgLSBBIHN0cmluZyBpbmRpY2F0aW5nIHRoZSBjb21tZXJjaWFsIHN0YXR1cyBvZiB0aGUgbW9kdWxlICgnMScgZm9yIGNvbW1lcmNpYWwsIG90aGVyd2lzZSBmcmVlKS5cbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEhUTUwgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgY29tbWVyY2lhbCBzdGF0dXMgb2YgdGhlIG1vZHVsZS5cbiAgICAgKi9cbiAgICBwcmVwYXJlQ29tbWVyY2lhbFZpZXcoY29tbWVyY2lhbCkge1xuICAgICAgICBpZihjb21tZXJjaWFsPT09MSl7XG4gICAgICAgICAgICByZXR1cm4gJzxpIGNsYXNzPVwidWkgZG9uYXRlIGljb25cIj48L2k+ICcrZ2xvYmFsVHJhbnNsYXRlLmV4dF9Db21tZXJjaWFsTW9kdWxlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnPGkgY2xhc3M9XCJwdXp6bGUgcGllY2UgaWNvblwiPjwvaT4gJytnbG9iYWxUcmFuc2xhdGUuZXh0X0ZyZWVNb2R1bGU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYW5kIHJldHVybnMgSFRNTCBjb250ZW50IGZvciBkaXNwbGF5aW5nIG1vZHVsZSBzY3JlZW5zaG90cy5cbiAgICAgKiBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgc2NyZWVuc2hvdHMsIHRoZXkgd2lsbCBiZSBpbmNsdWRlZCBpbiBhIG5hdmlnYWJsZSBzbGlkZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBzY3JlZW5zaG90cyAtIEFuIGFycmF5IG9mIG9iamVjdHMgcmVwcmVzZW50aW5nIHNjcmVlbnNob3RzLCBlYWNoIGNvbnRhaW5pbmcgVVJMIGFuZCBuYW1lIHByb3BlcnRpZXMuXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRoZSBzY3JlZW5zaG90IHNsaWRlci5cbiAgICAgKi9cbiAgICBwcmVwYXJlU2NyZWVuc2hvdHNWaWV3KHNjcmVlbnNob3RzKSB7XG4gICAgICAgIGxldCBodG1sID1cbiAgICAgICAgICAgICcgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidWkgY29udGFpbmVyIHNsaWRlc1wiPlxcbicgK1xuICAgICAgICAgICAgJyAgICAgICAgICAgICAgICA8aSBjbGFzcz1cImJpZyBsZWZ0IGFuZ2xlIGljb25cIj48L2k+XFxuJyArXG4gICAgICAgICAgICAnICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiYmlnIHJpZ2h0IGFuZ2xlIGljb25cIj48L2k+JztcbiAgICAgICAgJC5lYWNoKHNjcmVlbnNob3RzLCBmdW5jdGlvbiAoaW5kZXgsIHNjcmVlbnNob3QpIHtcbiAgICAgICAgICAgIGlmIChpbmRleCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwic2xpZGVcIj48aW1nIGNsYXNzPVwidWkgZmx1aWQgaW1hZ2VcIiBzcmM9XCIke3NjcmVlbnNob3QudXJsfVwiIGFsdD1cIiR7c2NyZWVuc2hvdC5uYW1lfVwiPjwvZGl2PmA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJzbGlkZSBhY3RpdmVcIj48aW1nIGNsYXNzPVwidWkgZmx1aWQgaW1hZ2VcIiBzcmM9XCIke3NjcmVlbnNob3QudXJsfVwiIGFsdD1cIiR7c2NyZWVuc2hvdC5uYW1lfVwiPjwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2VuZXJhdGVzIGFuZCByZXR1cm5zIEhUTUwgY29udGVudCBmb3IgdGhlIG1vZHVsZSdzIGRlc2NyaXB0aW9uIHNlY3Rpb24uXG4gICAgICogVGhpcyBpbmNsdWRlcyB0aGUgbW9kdWxlIG5hbWUsIGEgdGV4dHVhbCBkZXNjcmlwdGlvbiwgYW5kIGFueSB1c2VmdWwgbGlua3MgcHJvdmlkZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVwb0RhdGEgLSBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgbW9kdWxlJ3MgbWV0YWRhdGEsIGluY2x1ZGluZyBuYW1lLCBkZXNjcmlwdGlvbiwgYW5kIHByb21vdGlvbmFsIGxpbmsuXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRoZSBtb2R1bGUncyBkZXNjcmlwdGlvbiBzZWN0aW9uLlxuICAgICAqL1xuICAgIHByZXBhcmVEZXNjcmlwdGlvblZpZXcocmVwb0RhdGEpIHtcbiAgICAgICAgbGV0IGh0bWwgPSBgPGRpdiBjbGFzcz1cInVpIGhlYWRlclwiPiR7cmVwb0RhdGEubmFtZX08L2Rpdj5gO1xuICAgICAgICBodG1sICs9IGA8cD4ke3JlcG9EYXRhLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwidWkgaGVhZGVyXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X1VzZWZ1bExpbmtzfTwvZGl2PmA7XG4gICAgICAgIGh0bWwgKz0gJzx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICBodG1sICs9IGA8bGkgY2xhc3M9XCJpdGVtXCI+PGEgaHJlZj1cIiR7cmVwb0RhdGEucHJvbW9fbGlua31cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRXh0ZXJuYWxEZXNjcmlwdGlvbn08L2E+PC9saT5gO1xuICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYW5kIHJldHVybnMgSFRNTCBjb250ZW50IHRvIGRpc3BsYXkgdGhlIGRldmVsb3BlcidzIGluZm9ybWF0aW9uIGZvciB0aGUgbW9kdWxlLlxuICAgICAqIFRoaXMgaXMgdHlwaWNhbGx5IGEgc2ltcGxlIHRleHR1YWwgcmVwcmVzZW50YXRpb24gb2YgdGhlIGRldmVsb3BlcidzIG5hbWUgb3IgaWRlbnRpZmllci5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXBvRGF0YSAtIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBtb2R1bGUncyBtZXRhZGF0YSwgaW5jbHVkaW5nIGRldmVsb3BlciBpbmZvcm1hdGlvbi5cbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IEhUTUwgY29udGVudCBmb3IgdGhlIGRldmVsb3BlciBpbmZvcm1hdGlvbiBzZWN0aW9uLlxuICAgICAqL1xuICAgIHByZXBhcmVEZXZlbG9wZXJWaWV3KHJlcG9EYXRhKSB7XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIGh0bWwgKz0gYCR7cmVwb0RhdGEuZGV2ZWxvcGVyfWA7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZXMgYW5kIHJldHVybnMgSFRNTCBjb250ZW50IGZvciBkaXNwbGF5aW5nIHRoZSBtb2R1bGUncyBjaGFuZ2Vsb2cuXG4gICAgICogRWFjaCByZWxlYXNlIHdpdGhpbiB0aGUgbW9kdWxlJ3MgaGlzdG9yeSBpcyBwcmVzZW50ZWQgd2l0aCB2ZXJzaW9uIGluZm9ybWF0aW9uLCBkb3dubG9hZCBjb3VudCwgYW5kIGEgZGV0YWlsZWQgY2hhbmdlbG9nLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlcG9EYXRhIC0gQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIG1vZHVsZSdzIG1ldGFkYXRhLCBpbmNsdWRpbmcgYW4gYXJyYXkgb2YgcmVsZWFzZSBvYmplY3RzIHdpdGggdmVyc2lvbiwgZG93bmxvYWQgY291bnQsIGFuZCBjaGFuZ2Vsb2cgaW5mb3JtYXRpb24uXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBIVE1MIGNvbnRlbnQgZm9yIHRoZSBtb2R1bGUncyBjaGFuZ2Vsb2cgc2VjdGlvbi5cbiAgICAgKi9cbiAgICBwcmVwYXJlQ2hhbmdlTG9nVmlldyhyZXBvRGF0YSkge1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICAkLmVhY2gocmVwb0RhdGEucmVsZWFzZXMsIGZ1bmN0aW9uIChpbmRleCwgcmVsZWFzZSkge1xuICAgICAgICAgICAgbGV0IHJlbGVhc2VEYXRlID0gcmVsZWFzZS5jcmVhdGVkO1xuICAgICAgICAgICAgcmVsZWFzZURhdGUgPSByZWxlYXNlRGF0ZS5zcGxpdChcIiBcIilbMF07XG4gICAgICAgICAgICBjb25zdCBzaXplVGV4dCA9IGV4dGVuc2lvbk1vZHVsZURldGFpbC5jb252ZXJ0Qnl0ZXNUb1JlYWRhYmxlRm9ybWF0KHJlbGVhc2Uuc2l6ZSk7XG4gICAgICAgICAgICBsZXQgY2hhbmdlTG9nVGV4dCA9IFVzZXJNZXNzYWdlLmNvbnZlcnRUb1RleHQocmVsZWFzZS5jaGFuZ2Vsb2cpO1xuICAgICAgICAgICAgaWYgKGNoYW5nZUxvZ1RleHQgPT09ICdudWxsJykge1xuICAgICAgICAgICAgICAgIGNoYW5nZUxvZ1RleHQgPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBjbGVhcmluZyBzZWdtZW50XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJ1aSB0b3AgYXR0YWNoZWQgbGFiZWxcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZVJlbGVhc2VUYWd9OiAke3JlbGVhc2UudmVyc2lvbn0gJHtnbG9iYWxUcmFuc2xhdGUuZXh0X0Zyb21EYXRlfSAke3JlbGVhc2VEYXRlfTwvZGl2PmA7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwidWkgdG9wIHJpZ2h0IGF0dGFjaGVkIGxhYmVsXCI+PGkgY2xhc3M9XCJpY29uIGdyZXkgZG93bmxvYWRcIj48L2k+IDxzcGFuIGNsYXNzPVwidWkgbWluaSBncmF5IHRleHRcIj4ke3JlbGVhc2UuZG93bmxvYWRzfTwvc3Bhbj48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz0ndWkgYmFzaWMgc2VnbWVudCc+PHA+JHtjaGFuZ2VMb2dUZXh0fTwvcD5gO1xuXG4gICAgICAgICAgICBodG1sICs9IGA8cD48Yj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfU3lzdGVtVmVyc2lvblJlcXVpcmVkfTogJHtyZWxlYXNlLnJlcXVpcmVfdmVyc2lvbn08L2I+PC9wPmA7XG4gICAgICAgICAgICBodG1sICs9IGA8YSBocmVmPVwiI1wiIGNsYXNzPVwidWkgaWNvbiBsYWJlbGVkIHNtYWxsIGJsdWUgcmlnaHQgZmxvYXRlZCBidXR0b24gZG93bmxvYWRcIlxuICAgICAgICAgICAgICAgZGF0YS11bmlxaWQgPSBcIiR7cmVwb0RhdGEudW5pcWlkfVwiXG4gICAgICAgICAgICAgICBkYXRhLXZlcnNpb24gPSBcIiR7cmVsZWFzZS52ZXJzaW9ufVwiXG4gICAgICAgICAgICAgICBkYXRhLXJlbGVhc2VpZCA9XCIke3JlbGVhc2UucmVsZWFzZUlEfVwiPlxuICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwiaWNvbiBkb3dubG9hZFwiPjwvaT5cbiAgICAgICAgICAgICAgICAke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZVZlcnNpb259ICR7cmVsZWFzZS52ZXJzaW9ufSAoJHtzaXplVGV4dH0pXG4gICAgICAgICAgICA8L2E+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9XG59XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBleHRlcm5hbCBtb2R1bGVzIGRldGFpbCBwYWdlXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgZXh0ZW5zaW9uTW9kdWxlRGV0YWlsLmluaXRpYWxpemUoKTtcbn0pO1xuIl19