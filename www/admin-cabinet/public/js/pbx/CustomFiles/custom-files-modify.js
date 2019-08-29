"use strict";

/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
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
//# sourceMappingURL=custom-files-modify.js.map