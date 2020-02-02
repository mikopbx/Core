"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl, globalTranslate, UserMessage */
var licensing = {
  params: undefined,
  callback: undefined,
  captureFeature: function () {
    function captureFeature(params, callback) {
      licensing.params = params;
      licensing.callback = callback;
      $.api({
        url: "".concat(globalRootUrl, "licensing/captureFeatureForProductId"),
        on: 'now',
        method: 'POST',
        data: {
          licFeatureId: licensing.params.licFeatureId,
          licProductId: licensing.params.licProductId
        },
        successTest: function () {
          function successTest(response) {
            // test whether a JSON response is valid
            return response !== undefined && Object.keys(response).length > 0 && response.success === true;
          }

          return successTest;
        }(),
        onSuccess: licensing.cbAfterFeatureCaptured,
        onFailure: licensing.cbAfterFailureFeatureCaptured
      });
    }

    return captureFeature;
  }(),
  cbAfterFeatureCaptured: function () {
    function cbAfterFeatureCaptured() {
      licensing.callback(licensing.params);
    }

    return cbAfterFeatureCaptured;
  }(),
  cbAfterFailureFeatureCaptured: function () {
    function cbAfterFailureFeatureCaptured(response) {
      if (response !== undefined && Object.keys(response).length > 0 && response.message.length > 0) {
        UserMessage.showError(response.message);
      } else {
        UserMessage.showError(globalTranslate.ext_NoLicenseAvailable);
      }

      $('a.button').removeClass('disabled');
    }

    return cbAfterFailureFeatureCaptured;
  }()
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWxpY2Vuc2luZy5qcyJdLCJuYW1lcyI6WyJsaWNlbnNpbmciLCJwYXJhbXMiLCJ1bmRlZmluZWQiLCJjYWxsYmFjayIsImNhcHR1cmVGZWF0dXJlIiwiJCIsImFwaSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJvbiIsIm1ldGhvZCIsImRhdGEiLCJsaWNGZWF0dXJlSWQiLCJsaWNQcm9kdWN0SWQiLCJzdWNjZXNzVGVzdCIsInJlc3BvbnNlIiwiT2JqZWN0Iiwia2V5cyIsImxlbmd0aCIsInN1Y2Nlc3MiLCJvblN1Y2Nlc3MiLCJjYkFmdGVyRmVhdHVyZUNhcHR1cmVkIiwib25GYWlsdXJlIiwiY2JBZnRlckZhaWx1cmVGZWF0dXJlQ2FwdHVyZWQiLCJtZXNzYWdlIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJnbG9iYWxUcmFuc2xhdGUiLCJleHRfTm9MaWNlbnNlQXZhaWxhYmxlIiwicmVtb3ZlQ2xhc3MiXSwibWFwcGluZ3MiOiI7O0FBQUE7Ozs7Ozs7O0FBUUE7QUFFQSxJQUFNQSxTQUFTLEdBQUc7QUFDakJDLEVBQUFBLE1BQU0sRUFBRUMsU0FEUztBQUVqQkMsRUFBQUEsUUFBUSxFQUFFRCxTQUZPO0FBR2pCRSxFQUFBQSxjQUhpQjtBQUFBLDRCQUdGSCxNQUhFLEVBR01FLFFBSE4sRUFHZ0I7QUFDaENILE1BQUFBLFNBQVMsQ0FBQ0MsTUFBVixHQUFtQkEsTUFBbkI7QUFDQUQsTUFBQUEsU0FBUyxDQUFDRyxRQUFWLEdBQXFCQSxRQUFyQjtBQUNBRSxNQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNMQyxRQUFBQSxHQUFHLFlBQUtDLGFBQUwseUNBREU7QUFFTEMsUUFBQUEsRUFBRSxFQUFFLEtBRkM7QUFHTEMsUUFBQUEsTUFBTSxFQUFFLE1BSEg7QUFJTEMsUUFBQUEsSUFBSSxFQUFFO0FBQ0xDLFVBQUFBLFlBQVksRUFBRVosU0FBUyxDQUFDQyxNQUFWLENBQWlCVyxZQUQxQjtBQUVMQyxVQUFBQSxZQUFZLEVBQUViLFNBQVMsQ0FBQ0MsTUFBVixDQUFpQlk7QUFGMUIsU0FKRDtBQVFMQyxRQUFBQSxXQVJLO0FBQUEsK0JBUU9DLFFBUlAsRUFRaUI7QUFDckI7QUFDQSxtQkFBT0EsUUFBUSxLQUFLYixTQUFiLElBQ0hjLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZRixRQUFaLEVBQXNCRyxNQUF0QixHQUErQixDQUQ1QixJQUVISCxRQUFRLENBQUNJLE9BQVQsS0FBcUIsSUFGekI7QUFHQTs7QUFiSTtBQUFBO0FBY0xDLFFBQUFBLFNBQVMsRUFBRXBCLFNBQVMsQ0FBQ3FCLHNCQWRoQjtBQWVMQyxRQUFBQSxTQUFTLEVBQUV0QixTQUFTLENBQUN1QjtBQWZoQixPQUFOO0FBa0JBOztBQXhCZ0I7QUFBQTtBQXlCakJGLEVBQUFBLHNCQXpCaUI7QUFBQSxzQ0F5QlE7QUFDeEJyQixNQUFBQSxTQUFTLENBQUNHLFFBQVYsQ0FBbUJILFNBQVMsQ0FBQ0MsTUFBN0I7QUFDQTs7QUEzQmdCO0FBQUE7QUE0QmpCc0IsRUFBQUEsNkJBNUJpQjtBQUFBLDJDQTRCYVIsUUE1QmIsRUE0QnVCO0FBQ3ZDLFVBQUlBLFFBQVEsS0FBS2IsU0FBYixJQUNBYyxNQUFNLENBQUNDLElBQVAsQ0FBWUYsUUFBWixFQUFzQkcsTUFBdEIsR0FBK0IsQ0FEL0IsSUFFQUgsUUFBUSxDQUFDUyxPQUFULENBQWlCTixNQUFqQixHQUEwQixDQUY5QixFQUVpQztBQUNoQ08sUUFBQUEsV0FBVyxDQUFDQyxTQUFaLENBQXNCWCxRQUFRLENBQUNTLE9BQS9CO0FBQ0EsT0FKRCxNQUlPO0FBQ05DLFFBQUFBLFdBQVcsQ0FBQ0MsU0FBWixDQUFzQkMsZUFBZSxDQUFDQyxzQkFBdEM7QUFDQTs7QUFDRHZCLE1BQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBY3dCLFdBQWQsQ0FBMEIsVUFBMUI7QUFDQTs7QUFyQ2dCO0FBQUE7QUFBQSxDQUFsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBDb3B5cmlnaHQgKEMpIE1JS08gTExDIC0gQWxsIFJpZ2h0cyBSZXNlcnZlZFxuICogVW5hdXRob3JpemVkIGNvcHlpbmcgb2YgdGhpcyBmaWxlLCB2aWEgYW55IG1lZGl1bSBpcyBzdHJpY3RseSBwcm9oaWJpdGVkXG4gKiBQcm9wcmlldGFyeSBhbmQgY29uZmlkZW50aWFsXG4gKiBXcml0dGVuIGJ5IE5pa29sYXkgQmVrZXRvdiwgMTIgMjAxOVxuICpcbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSAqL1xuXG5jb25zdCBsaWNlbnNpbmcgPSB7XG5cdHBhcmFtczogdW5kZWZpbmVkLFxuXHRjYWxsYmFjazogdW5kZWZpbmVkLFxuXHRjYXB0dXJlRmVhdHVyZShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cdFx0bGljZW5zaW5nLnBhcmFtcyA9IHBhcmFtcztcblx0XHRsaWNlbnNpbmcuY2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHQkLmFwaSh7XG5cdFx0XHR1cmw6IGAke2dsb2JhbFJvb3RVcmx9bGljZW5zaW5nL2NhcHR1cmVGZWF0dXJlRm9yUHJvZHVjdElkYCxcblx0XHRcdG9uOiAnbm93Jyxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRsaWNGZWF0dXJlSWQ6IGxpY2Vuc2luZy5wYXJhbXMubGljRmVhdHVyZUlkLFxuXHRcdFx0XHRsaWNQcm9kdWN0SWQ6IGxpY2Vuc2luZy5wYXJhbXMubGljUHJvZHVjdElkLFxuXHRcdFx0fSxcblx0XHRcdHN1Y2Nlc3NUZXN0KHJlc3BvbnNlKSB7XG5cdFx0XHRcdC8vIHRlc3Qgd2hldGhlciBhIEpTT04gcmVzcG9uc2UgaXMgdmFsaWRcblx0XHRcdFx0cmV0dXJuIHJlc3BvbnNlICE9PSB1bmRlZmluZWRcblx0XHRcdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0XHRcdCYmIHJlc3BvbnNlLnN1Y2Nlc3MgPT09IHRydWU7XG5cdFx0XHR9LFxuXHRcdFx0b25TdWNjZXNzOiBsaWNlbnNpbmcuY2JBZnRlckZlYXR1cmVDYXB0dXJlZCxcblx0XHRcdG9uRmFpbHVyZTogbGljZW5zaW5nLmNiQWZ0ZXJGYWlsdXJlRmVhdHVyZUNhcHR1cmVkLFxuXG5cdFx0fSk7XG5cdH0sXG5cdGNiQWZ0ZXJGZWF0dXJlQ2FwdHVyZWQoKSB7XG5cdFx0bGljZW5zaW5nLmNhbGxiYWNrKGxpY2Vuc2luZy5wYXJhbXMpO1xuXHR9LFxuXHRjYkFmdGVyRmFpbHVyZUZlYXR1cmVDYXB0dXJlZChyZXNwb25zZSkge1xuXHRcdGlmIChyZXNwb25zZSAhPT0gdW5kZWZpbmVkXG5cdFx0XHQmJiBPYmplY3Qua2V5cyhyZXNwb25zZSkubGVuZ3RoID4gMFxuXHRcdFx0JiYgcmVzcG9uc2UubWVzc2FnZS5sZW5ndGggPiAwKSB7XG5cdFx0XHRVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdFVzZXJNZXNzYWdlLnNob3dFcnJvcihnbG9iYWxUcmFuc2xhdGUuZXh0X05vTGljZW5zZUF2YWlsYWJsZSk7XG5cdFx0fVxuXHRcdCQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cdH0sXG59OyJdfQ==