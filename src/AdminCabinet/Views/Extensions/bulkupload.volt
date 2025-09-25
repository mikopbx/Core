<div class="ui container">
 

    <!-- Tabs -->
    <div class="ui secondary menu" id="bulk-tabs">
        <a class="item active" data-tab="import">
            <i class="upload icon"></i>
            {{ t._('ex_ImportTab') }}
        </a>
        <a class="item" data-tab="export">
            <i class="download icon"></i>
            {{ t._('ex_ExportTab') }}
        </a>
        <a class="item" data-tab="template">
            <i class="file outline icon"></i>
            {{ t._('ex_TemplateTab') }}
        </a>
    </div>

    <!-- Import Tab -->
    <div class="ui tab active" data-tab="import">
        <!-- Upload Area -->
        <div class="ui placeholder segment" id="upload-segment">
            <div class="ui icon header">
                <i class="file excel outline icon"></i>
                {{ t._('ex_DropCSVHere') }}
            </div>
            <div class="ui primary button" id="upload-button">
                <i class="upload icon"></i>
                {{ t._('ex_SelectCSVFile') }}
            </div>
        </div>

        <!-- Preview Section (hidden initially) -->
        <div id="preview-section" style="display:none;">
            <h3 class="ui header">{{ t._('ex_PreviewTitle') }}</h3>
            
            <!-- Validation Summary -->
            <div class="ui four statistics" id="validation-stats">
                <div class="statistic">
                    <div class="value" id="total-count">0</div>
                    <div class="label">{{ t._('ex_TotalRecords') }}</div>
                </div>
                <div class="green statistic">
                    <div class="value" id="valid-count">0</div>
                    <div class="label">{{ t._('ex_ValidRecords') }}</div>
                </div>
                <div class="yellow statistic">
                    <div class="value" id="duplicate-count">0</div>
                    <div class="label">{{ t._('ex_Duplicates') }}</div>
                </div>
                <div class="red statistic">
                    <div class="value" id="error-count">0</div>
                    <div class="label">{{ t._('ex_Errors') }}</div>
                </div>
            </div>

            <!-- Preview Table -->
            <table class="ui celled striped table" id="preview-table">
                <thead>
                    <tr>
                        <th class="collapsing">{{ t._('ex_Number') }}</th>
                        <th class="collapsing">{{ t._('ex_Name') }}</th>
                        <th class="collapsing">{{ t._('ex_Mobile') }}</th>
                        <th class="collapsing">{{ t._('ex_Email') }}</th>
                        <th class="collapsing">{{ t._('ex_Status') }}</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>

            <!-- Import Strategy and Action Buttons -->
            <div class="ui form" id="import-controls" style="margin-top: 1em;">
                <div class="inline fields">
                    <div class="field">
                    <label style="margin-right: 1em;">{{ t._('ex_DuplicateStrategy') }}:</label>
                    <select class="ui dropdown" id="import-strategy" style="margin-right: 1em;">
                        <option value="skip_existing">{{ t._('ex_SkipExisting') }}</option>
                        <option value="update_different">{{ t._('ex_UpdateDifferent') }}</option>
                    </select>
                    </div>
                    <div class="field">
                        <div class="ui icon buttons">
                        <button class="ui primary button" id="confirm-import">
                            <i class="check icon"></i>
                            {{ t._('ex_ConfirmImport') }}
                        </button>
                        <button class="ui button" id="cancel-import">
                            <i class="times icon"></i>
                            {{ t._('ex_Cancel') }}
                        </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Progress Section (hidden initially) -->
        <div id="progress-section" style="display:none;">
            <h3 class="ui header">{{ t._('ex_ImportProgress') }}</h3>

            <div class="ui indicating progress" id="import-progress">
                <div class="bar">
                    <div class="progress"></div>
                </div>
                <div class="label" id="progress-label">{{ t._('ex_ProcessingEmployees') }}</div>
            </div>

            <!-- Progress Text (replaces log) -->
            <div class="ui basic segment" style="padding-top: 0.5em; padding-bottom: 0;">
                <div class="ui small text" id="progress-text">{{ t._('ex_ImportStarted') }}</div>
            </div>

            <!-- Cancel Button -->
            <button class="ui red button" id="cancel-import-process" style="margin-top: 0.5em;">
                <i class="stop icon"></i>
                {{ t._('ex_CancelImport') }}
            </button>
        </div>

        <!-- Results Section (hidden initially) -->
        <div id="results-section" style="display:none;">
            <h3 class="ui header">{{ t._('ex_ImportResults') }}</h3>
            
            <div class="ui message" id="result-message"></div>
            
            <button class="ui button" id="new-import">
                <i class="redo icon"></i>
                {{ t._('ex_NewImport') }}
            </button>
        </div>
    </div>

    <!-- Export Tab -->
    <div class="ui tab" data-tab="export">
        <div class="ui form">
            <h3 class="ui header">{{ t._('ex_ExportSettings') }}</h3>
            
            <div class="field">
                <label>{{ t._('ex_ExportFormat') }}</label>
                <select class="ui dropdown" id="export-format">
                    <option value="minimal">{{ t._('ex_FormatMinimal') }}</option>
                    <option value="standard" selected>{{ t._('ex_FormatStandard') }}</option>
                    <option value="full">{{ t._('ex_FormatFull') }}</option>
                </select>
            </div>
            
            <!-- Field description for selected format -->
            <div class="ui info message" id="export-format-fields-info">
                <div class="header">{{ t._('ex_FieldsInFormat') }}</div>
                <div id="export-format-fields-description"></div>
            </div>

            <div class="field">
                <label>{{ t._('ex_FilterByNumberRange') }}</label>
                <div class="two fields">
                    <div class="field">
                        <input type="text" id="number-from" placeholder="{{ t._('ex_FromNumber') }}">
                    </div>
                    <div class="field">
                        <input type="text" id="number-to" placeholder="{{ t._('ex_ToNumber') }}">
                    </div>
                </div>
            </div>

            <button class="ui primary button" id="export-button">
                <i class="download icon"></i>
                {{ t._('ex_ExportEmployees') }}
            </button>
        </div>
    </div>

    <!-- Template Tab -->
    <div class="ui tab" data-tab="template">
        <h3 class="ui header">{{ t._('ex_DownloadTemplate') }}</h3>
        <p>{{ t._('ex_TemplateDescription') }}</p>
        
        <div class="ui form">
            <div class="field">
                <label>{{ t._('ex_TemplateFormat') }}</label>
                <select class="ui dropdown" id="template-format">
                    <option value="minimal">{{ t._('ex_FormatMinimal') }}</option>
                    <option value="standard" selected>{{ t._('ex_FormatStandard') }}</option>
                    <option value="full">{{ t._('ex_FormatFull') }}</option>
                </select>
            </div>
            
            <!-- Field description for selected format -->
            <div class="ui info message" id="format-fields-info">
                <div class="header">{{ t._('ex_FieldsInFormat') }}</div>
                <div id="format-fields-description"></div>
            </div>

            <button class="ui primary button" id="download-template">
                <i class="download icon"></i>
                {{ t._('ex_DownloadCSVTemplate') }}
            </button>
        </div>
    </div>
</div>
<div class="ui hidden divider"></div>
<div class="ui section">
    {{ link_to('extensions/index', "<i class='list icon'></i>"~t._('bt_BackToList'), "class": "ui labeled large icon button", "id":"back-to-list-button") }}
</div>