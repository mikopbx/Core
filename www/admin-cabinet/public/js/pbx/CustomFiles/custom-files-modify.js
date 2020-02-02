"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, ace, Form, PbxApi */
var customFile = {
  $formObj: $('#custom-file-form'),
  $appCode: $('#application-code'),
  $appCodeFromServer: $('#application-code-readonly'),
  editor: '',
  viewer: '',
  validateRules: {
    name: {
      identifier: 'filepath',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.cf_ValidateNameIsEmpty
      }]
    }
  },
  initialize: function () {
    function initialize() {
      $('.type-select').dropdown({
        onChange: function () {
          function onChange() {
            customFile.hideShowCode();
            customFile.getFileContentFromServer();
          }

          return onChange;
        }()
      });
      customFile.initializeAce();
      customFile.initializeForm();
      customFile.getFileContentFromServer();
    }

    return initialize;
  }(),
  hideShowCode: function () {
    function hideShowCode() {
      switch (customFile.$formObj.form('get value', 'mode')) {
        case 'none':
          customFile.viewer.navigateFileStart();
          customFile.$appCodeFromServer.show();
          customFile.$appCode.hide();
          break;

        case 'append':
          customFile.$appCodeFromServer.show();
          customFile.viewer.navigateFileEnd();
          customFile.editor.setValue(customFile.$formObj.form('get value', 'content'));
          customFile.$appCode.show();
          break;

        case 'override':
          customFile.editor.navigateFileStart();
          customFile.$appCodeFromServer.hide();
          customFile.editor.setValue(customFile.viewer.getValue());
          customFile.$appCode.show();
          break;

        default:
          break;
      }
    }

    return hideShowCode;
  }(),
  cbGetFileContentFromServer: function () {
    function cbGetFileContentFromServer(response) {
      if (response !== undefined && response.data.length > 0) {
        var fileContent = decodeURIComponent(response.data);
        customFile.viewer.setValue(fileContent);
        customFile.hideShowCode();
      }
    }

    return cbGetFileContentFromServer;
  }(),
  getFileContentFromServer: function () {
    function getFileContentFromServer() {
      var filePath = customFile.$formObj.form('get value', 'filepath');
      var mode = customFile.$formObj.form('get value', 'mode') !== 'override';
      var data = {
        filename: filePath,
        needOriginal: mode
      };
      PbxApi.GetFileContent(data, customFile.cbGetFileContentFromServer);
    }

    return getFileContentFromServer;
  }(),
  initializeAce: function () {
    function initializeAce() {
      var IniMode = ace.require('ace/mode/julia').Mode;

      customFile.viewer = ace.edit('application-code-readonly');
      customFile.viewer.setReadOnly(true);
      customFile.viewer.session.setMode(new IniMode());
      customFile.viewer.setTheme('ace/theme/monokai');
      customFile.viewer.resize();
      customFile.editor = ace.edit('application-code');
      customFile.editor.setTheme('ace/theme/monokai');
      customFile.editor.session.setMode(new IniMode());
      customFile.editor.resize();
    }

    return initializeAce;
  }(),
  cbBeforeSendForm: function () {
    function cbBeforeSendForm(settings) {
      var result = settings;
      result.data = customFile.$formObj.form('get values');

      switch (customFile.$formObj.form('get value', 'mode')) {
        case 'append':
        case 'override':
          result.data.content = customFile.editor.getValue();
          break;

        default:
          result.data.content = '';
      }

      return result;
    }

    return cbBeforeSendForm;
  }(),
  cbAfterSendForm: function () {
    function cbAfterSendForm() {}

    return cbAfterSendForm;
  }(),
  initializeForm: function () {
    function initializeForm() {
      Form.$formObj = customFile.$formObj;
      Form.url = "".concat(globalRootUrl, "custom-files/save");
      Form.validateRules = customFile.validateRules;
      Form.cbBeforeSendForm = customFile.cbBeforeSendForm;
      Form.cbAfterSendForm = customFile.cbAfterSendForm;
      Form.enableDirrity = false;
      Form.initialize();
    }

    return initializeForm;
  }()
};
$(document).ready(function () {
  customFile.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiQiLCIkYXBwQ29kZSIsIiRhcHBDb2RlRnJvbVNlcnZlciIsImVkaXRvciIsInZpZXdlciIsInZhbGlkYXRlUnVsZXMiLCJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImNmX1ZhbGlkYXRlTmFtZUlzRW1wdHkiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImhpZGVTaG93Q29kZSIsImdldEZpbGVDb250ZW50RnJvbVNlcnZlciIsImluaXRpYWxpemVBY2UiLCJpbml0aWFsaXplRm9ybSIsImZvcm0iLCJuYXZpZ2F0ZUZpbGVTdGFydCIsInNob3ciLCJoaWRlIiwibmF2aWdhdGVGaWxlRW5kIiwic2V0VmFsdWUiLCJnZXRWYWx1ZSIsImNiR2V0RmlsZUNvbnRlbnRGcm9tU2VydmVyIiwicmVzcG9uc2UiLCJ1bmRlZmluZWQiLCJkYXRhIiwibGVuZ3RoIiwiZmlsZUNvbnRlbnQiLCJkZWNvZGVVUklDb21wb25lbnQiLCJmaWxlUGF0aCIsIm1vZGUiLCJmaWxlbmFtZSIsIm5lZWRPcmlnaW5hbCIsIlBieEFwaSIsIkdldEZpbGVDb250ZW50IiwiSW5pTW9kZSIsImFjZSIsInJlcXVpcmUiLCJNb2RlIiwiZWRpdCIsInNldFJlYWRPbmx5Iiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXRUaGVtZSIsInJlc2l6ZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImNvbnRlbnQiLCJjYkFmdGVyU2VuZEZvcm0iLCJGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImVuYWJsZURpcnJpdHkiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBOzs7Ozs7OztBQVFBO0FBRUEsSUFBTUEsVUFBVSxH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QnhELFVBQVUsQ0FBQ3dELGVBQWxDO0FBQ0FDLE1BQUFBLElBQUksQ0FBQ0csYUFBTCxHQUFxQixLQUFyQjtBQUNBSCxNQUFBQSxJQUFJLENBQUMxQyxVQUFMO0FBQ0E7O0FBdEdpQjtBQUFBO0FBQUEsQ0FBbkI7QUF5R0FiLENBQUMsQ0FBQzJELFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDdkI5RCxFQUFBQSxVQUFVLENBQUNlLFVBQVg7QUFDQSxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIENvcHlyaWdodCAoQykgTUlLTyBMTEMgLSBBbGwgUmlnaHRzIFJlc2VydmVkXG4gKiBVbmF1dGhvcml6ZWQgY29weWluZyBvZiB0aGlzIGZpbGUsIHZpYSBhbnkgbWVkaXVtIGlzIHN0cmljdGx5IHByb2hpYml0ZWRcbiAqIFByb3ByaWV0YXJ5IGFuZCBjb25maWRlbnRpYWxcbiAqIFdyaXR0ZW4gYnkgTmlrb2xheSBCZWtldG92LCAxMiAyMDE5XG4gKlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgYWNlLCBGb3JtLCBQYnhBcGkgKi9cblxuY29uc3QgY3VzdG9tRmlsZSA9IHtcblx0JGZvcm1PYmo6ICQoJyNjdXN0b20tZmlsZS1mb3JtJyksXG5cdCRhcHBDb2RlOiAkKCcjYXBwbGljYXRpb24tY29kZScpLFxuXHQkYXBwQ29kZUZyb21TZXJ2ZXI6ICQoJyNhcHBsaWNhdGlvbi1jb2RlLXJlYWRvbmx5JyksXG5cdGVkaXRvcjogJycsXG5cdHZpZXdlcjogJycsXG5cdHZhbGlkYXRlUnVsZXM6IHtcblx0XHRuYW1lOiB7XG5cdFx0XHRpZGVudGlmaWVyOiAnZmlsZXBhdGgnLFxuXHRcdFx0cnVsZXM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHR5cGU6ICdlbXB0eScsXG5cdFx0XHRcdFx0cHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY2ZfVmFsaWRhdGVOYW1lSXNFbXB0eSxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fSxcblx0fSxcblx0aW5pdGlhbGl6ZSgpIHtcblx0XHQkKCcudHlwZS1zZWxlY3QnKS5kcm9wZG93bih7XG5cdFx0XHRvbkNoYW5nZSgpIHtcblx0XHRcdFx0Y3VzdG9tRmlsZS5oaWRlU2hvd0NvZGUoKTtcblx0XHRcdFx0Y3VzdG9tRmlsZS5nZXRGaWxlQ29udGVudEZyb21TZXJ2ZXIoKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHRjdXN0b21GaWxlLmluaXRpYWxpemVBY2UoKTtcblx0XHRjdXN0b21GaWxlLmluaXRpYWxpemVGb3JtKCk7XG5cdFx0Y3VzdG9tRmlsZS5nZXRGaWxlQ29udGVudEZyb21TZXJ2ZXIoKTtcblx0fSxcblx0aGlkZVNob3dDb2RlKCkge1xuXHRcdHN3aXRjaCAoY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9kZScpKSB7XG5cdFx0XHRjYXNlICdub25lJzpcblx0XHRcdFx0Y3VzdG9tRmlsZS52aWV3ZXIubmF2aWdhdGVGaWxlU3RhcnQoKTtcblx0XHRcdFx0Y3VzdG9tRmlsZS4kYXBwQ29kZUZyb21TZXJ2ZXIuc2hvdygpO1xuXHRcdFx0XHRjdXN0b21GaWxlLiRhcHBDb2RlLmhpZGUoKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdhcHBlbmQnOlxuXHRcdFx0XHRjdXN0b21GaWxlLiRhcHBDb2RlRnJvbVNlcnZlci5zaG93KCk7XG5cdFx0XHRcdGN1c3RvbUZpbGUudmlld2VyLm5hdmlnYXRlRmlsZUVuZCgpO1xuXHRcdFx0XHRjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjb250ZW50JykpO1xuXHRcdFx0XHRjdXN0b21GaWxlLiRhcHBDb2RlLnNob3coKTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdvdmVycmlkZSc6XG5cdFx0XHRcdGN1c3RvbUZpbGUuZWRpdG9yLm5hdmlnYXRlRmlsZVN0YXJ0KCk7XG5cdFx0XHRcdGN1c3RvbUZpbGUuJGFwcENvZGVGcm9tU2VydmVyLmhpZGUoKTtcblx0XHRcdFx0Y3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoY3VzdG9tRmlsZS52aWV3ZXIuZ2V0VmFsdWUoKSk7XG5cdFx0XHRcdGN1c3RvbUZpbGUuJGFwcENvZGUuc2hvdygpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fSxcblx0Y2JHZXRGaWxlQ29udGVudEZyb21TZXJ2ZXIocmVzcG9uc2UpIHtcblx0XHRpZiAocmVzcG9uc2UgIT09IHVuZGVmaW5lZCAmJiByZXNwb25zZS5kYXRhLmxlbmd0aCA+IDApIHtcblx0XHRcdGNvbnN0IGZpbGVDb250ZW50ID0gZGVjb2RlVVJJQ29tcG9uZW50KHJlc3BvbnNlLmRhdGEpO1xuXHRcdFx0Y3VzdG9tRmlsZS52aWV3ZXIuc2V0VmFsdWUoZmlsZUNvbnRlbnQpO1xuXHRcdFx0Y3VzdG9tRmlsZS5oaWRlU2hvd0NvZGUoKTtcblx0XHR9XG5cdH0sXG5cdGdldEZpbGVDb250ZW50RnJvbVNlcnZlcigpIHtcblx0XHRjb25zdCBmaWxlUGF0aCA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVwYXRoJyk7XG5cdFx0Y29uc3QgbW9kZSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vZGUnKSAhPT0gJ292ZXJyaWRlJztcblx0XHRjb25zdCBkYXRhID0geyBmaWxlbmFtZTogZmlsZVBhdGgsIG5lZWRPcmlnaW5hbDogbW9kZSB9O1xuXHRcdFBieEFwaS5HZXRGaWxlQ29udGVudChkYXRhLCBjdXN0b21GaWxlLmNiR2V0RmlsZUNvbnRlbnRGcm9tU2VydmVyKTtcblx0fSxcblx0aW5pdGlhbGl6ZUFjZSgpIHtcblx0XHRjb25zdCBJbmlNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL2p1bGlhJykuTW9kZTtcblx0XHRjdXN0b21GaWxlLnZpZXdlciA9IGFjZS5lZGl0KCdhcHBsaWNhdGlvbi1jb2RlLXJlYWRvbmx5Jyk7XG5cdFx0Y3VzdG9tRmlsZS52aWV3ZXIuc2V0UmVhZE9ubHkodHJ1ZSk7XG5cdFx0Y3VzdG9tRmlsZS52aWV3ZXIuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuXHRcdGN1c3RvbUZpbGUudmlld2VyLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuXHRcdGN1c3RvbUZpbGUudmlld2VyLnJlc2l6ZSgpO1xuXG5cdFx0Y3VzdG9tRmlsZS5lZGl0b3IgPSBhY2UuZWRpdCgnYXBwbGljYXRpb24tY29kZScpO1xuXHRcdGN1c3RvbUZpbGUuZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuXHRcdGN1c3RvbUZpbGUuZWRpdG9yLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcblx0XHRjdXN0b21GaWxlLmVkaXRvci5yZXNpemUoKTtcblx0fSxcblx0Y2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuXHRcdGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXHRcdHJlc3VsdC5kYXRhID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cdFx0c3dpdGNoIChjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2RlJykpIHtcblx0XHRcdGNhc2UgJ2FwcGVuZCc6XG5cdFx0XHRjYXNlICdvdmVycmlkZSc6XG5cdFx0XHRcdHJlc3VsdC5kYXRhLmNvbnRlbnQgPSBjdXN0b21GaWxlLmVkaXRvci5nZXRWYWx1ZSgpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdHJlc3VsdC5kYXRhLmNvbnRlbnQgPSAnJztcblx0XHR9XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblx0Y2JBZnRlclNlbmRGb3JtKCkge1xuXG5cdH0sXG5cdGluaXRpYWxpemVGb3JtKCkge1xuXHRcdEZvcm0uJGZvcm1PYmogPSBjdXN0b21GaWxlLiRmb3JtT2JqO1xuXHRcdEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1jdXN0b20tZmlsZXMvc2F2ZWA7XG5cdFx0Rm9ybS52YWxpZGF0ZVJ1bGVzID0gY3VzdG9tRmlsZS52YWxpZGF0ZVJ1bGVzO1xuXHRcdEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGN1c3RvbUZpbGUuY2JCZWZvcmVTZW5kRm9ybTtcblx0XHRGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGN1c3RvbUZpbGUuY2JBZnRlclNlbmRGb3JtO1xuXHRcdEZvcm0uZW5hYmxlRGlycml0eSA9IGZhbHNlO1xuXHRcdEZvcm0uaW5pdGlhbGl6ZSgpO1xuXHR9LFxufTtcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuXHRjdXN0b21GaWxlLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=