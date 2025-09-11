<div class="ui container">
    <h2 class="ui header">
        <i class="file excel outline icon"></i>
        <div class="content">
            {{ t._('ex_BulkUploadTitle') }}
            <div class="sub header">{{ t._('ex_BulkUploadDescription') }}</div>
        </div>
    </h2>

    <!-- Tabs -->
    <div class="ui top attached tabular menu" id="bulk-tabs">
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
    <div class="ui bottom attached tab segment active" data-tab="import">
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
            <table class="ui celled table" id="preview-table">
                <thead>
                    <tr>
                        <th>{{ t._('ex_Status') }}</th>
                        <th>{{ t._('ex_Number') }}</th>
                        <th>{{ t._('ex_Name') }}</th>
                        <th>{{ t._('ex_Email') }}</th>
                        <th>{{ t._('ex_Mobile') }}</th>
                        <th>{{ t._('ex_ValidationMessage') }}</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>

            <!-- Import Options -->
            <div class="ui form segment">
                <h4 class="ui header">{{ t._('ex_ImportOptions') }}</h4>
                <div class="field">
                    <label>{{ t._('ex_DuplicateStrategy') }}</label>
                    <select class="ui dropdown" id="import-strategy">
                        <option value="skip_duplicates">{{ t._('ex_SkipDuplicates') }}</option>
                        <option value="update_existing">{{ t._('ex_UpdateExisting') }}</option>
                        <option value="fail_on_duplicate">{{ t._('ex_FailOnDuplicate') }}</option>
                    </select>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="ui buttons">
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

        <!-- Progress Section (hidden initially) -->
        <div id="progress-section" style="display:none;">
            <h3 class="ui header">{{ t._('ex_ImportProgress') }}</h3>
            
            <div class="ui indicating progress" id="import-progress">
                <div class="bar">
                    <div class="progress"></div>
                </div>
                <div class="label" id="progress-label">{{ t._('ex_ProcessingEmployees') }}</div>
            </div>

            <!-- Live Log -->
            <div class="ui segment" id="import-log">
                <h4 class="ui header">{{ t._('ex_ImportLog') }}</h4>
                <div class="ui list" id="log-messages"></div>
            </div>
        </div>

        <!-- Results Section (hidden initially) -->
        <div id="results-section" style="display:none;">
            <h3 class="ui header">{{ t._('ex_ImportResults') }}</h3>
            
            <div class="ui message" id="result-message"></div>
            
            <div class="ui buttons">
                <button class="ui button" id="new-import">
                    <i class="redo icon"></i>
                    {{ t._('ex_NewImport') }}
                </button>
                <a href="{{ url('extensions/index') }}" class="ui primary button">
                    <i class="list icon"></i>
                    {{ t._('ex_BackToList') }}
                </a>
            </div>
        </div>
    </div>

    <!-- Export Tab -->
    <div class="ui bottom attached tab segment" data-tab="export">
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
    <div class="ui bottom attached tab segment" data-tab="template">
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

            <button class="ui primary button" id="download-template">
                <i class="download icon"></i>
                {{ t._('ex_DownloadCSVTemplate') }}
            </button>
        </div>

        <div class="ui info message">
            <div class="header">{{ t._('ex_CSVFieldsInfo') }}</div>
            <ul class="list">
                <li><strong>number</strong> - {{ t._('ex_FieldNumber') }}</li>
                <li><strong>user_username</strong> - {{ t._('ex_FieldUsername') }}</li>
                <li><strong>user_email</strong> - {{ t._('ex_FieldEmail') }}</li>
                <li><strong>mobile_number</strong> - {{ t._('ex_FieldMobile') }}</li>
                <li><strong>sip_secret</strong> - {{ t._('ex_FieldPassword') }}</li>
                <li><strong>fwd_forwarding</strong> - {{ t._('ex_FieldForwarding') }}</li>
                <li><strong>fwd_ringlength</strong> - {{ t._('ex_FieldRingLength') }}</li>
            </ul>
        </div>
    </div>
</div>

{{ partial("partials/submitbutton", ['indexurl':'extensions/index']) }}