<div class="ui top attached tabular menu" id="storage-menu">
        <a class="item active" data-tab="storage-info">{{ t._('st_TabStorageInfo') }}</a>
        <a class="item" data-tab="storage-local">
            <i class="hdd outline icon"></i>
            {{ t._('st_TabStorageLocal') }}
        </a>
        <a class="item" data-tab="storage-cloud">
            <i class="cloud upload icon"></i>
            {{ t._('st_TabStorageCloud') }}
        </a>
    </div>

    <!-- Storage Information Tab -->
    <div class="ui bottom attached tab segment active" data-tab="storage-info">
        <div class="field">
            <div id="storage-usage-container">
                <div class="ui active inverted dimmer">
                    <div class="ui text loader">{{ t._("Loading") }}</div>
                </div>
                <p>&nbsp;</p>
            </div>
            
            <div id="storage-details" style="display: none;">
                <!-- macOS Style Storage Header -->
                <div class="storage-header">
                    <div class="storage-subtitle">
                        <span id="used-space-text">0 GB</span> {{ t._("st_Of") }} <span id="total-size-text">0 GB</span> {{ t._("st_Used") }}
                    </div>
                </div>
                
                <!-- macOS Style Progress Bar -->
                <div class="macos-progress-bar" id="storage-progress">
                    <div class="progress-segment call-recordings-segment" data-category="call_recordings"></div>
                    <div class="progress-segment cdr-database-segment" data-category="cdr_database"></div>
                    <div class="progress-segment system-logs-segment" data-category="system_logs"></div>
                    <div class="progress-segment modules-segment" data-category="modules"></div>
                    <div class="progress-segment backups-segment" data-category="backups"></div>
                    <div class="progress-segment system-caches-segment" data-category="system_caches"></div>
                    <div class="progress-segment other-segment" data-category="other"></div>
                </div>
                
                <!-- Legend -->
                <div class="storage-legend">
                    <div class="legend-item">
                        <span class="legend-color call-recordings-color"></span>
                        <span class="legend-text">{{ t._("st_CategoryCallRecordings") }}</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color cdr-database-color"></span>
                        <span class="legend-text">{{ t._("st_CategoryCdrDatabase") }}</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color system-logs-color"></span>
                        <span class="legend-text">{{ t._("st_CategorySystemLogs") }}</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color modules-color"></span>
                        <span class="legend-text">{{ t._("st_CategoryModules") }}</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color backups-color"></span>
                        <span class="legend-text">{{ t._("st_CategoryBackups") }}</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color system-caches-color"></span>
                        <span class="legend-text">{{ t._("st_CategorySystemCaches") }}</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-color other-color"></span>
                        <span class="legend-text">{{ t._("st_CategoryOther") }}</span>
                    </div>
                </div>
                
                <div class="ui divider"></div>
                
                <!-- Categories List -->
                <div class="storage-categories">
                    <div class="category-item" data-category="call_recordings">
                        <i class="microphone icon"></i>
                        <div class="category-info">
                            <div class="category-name">{{ t._("st_CategoryCallRecordings") }}</div>
                        </div>
                        <div class="category-size" id="call_recordings-size">0 MB</div>
                    </div>
                    
                    <div class="category-item" data-category="cdr_database">
                        <i class="database icon"></i>
                        <div class="category-info">
                            <div class="category-name">{{ t._("st_CategoryCdrDatabase") }}</div>
                        </div>
                        <div class="category-size" id="cdr_database-size">0 MB</div>
                    </div>
                    
                    <div class="category-item" data-category="system_logs">
                        <i class="file alternate outline icon"></i>
                        <div class="category-info">
                            <div class="category-name">{{ t._("st_CategorySystemLogs") }}</div>
                        </div>
                        <div class="category-size" id="system_logs-size">0 MB</div>
                    </div>
                    
                    <div class="category-item" data-category="modules">
                        <i class="puzzle piece icon"></i>
                        <div class="category-info">
                            <div class="category-name">{{ t._("st_CategoryModules") }}</div>
                        </div>
                        <div class="category-size" id="modules-size">0 MB</div>
                    </div>
                    
                    <div class="category-item" data-category="backups">
                        <i class="archive icon"></i>
                        <div class="category-info">
                            <div class="category-name">{{ t._("st_CategoryBackups") }}</div>
                        </div>
                        <div class="category-size" id="backups-size">0 MB</div>
                    </div>
                    
                    <div class="category-item" data-category="system_caches">
                        <i class="hdd outline icon"></i>
                        <div class="category-info">
                            <div class="category-name">{{ t._("st_CategorySystemCaches") }}</div>
                        </div>
                        <div class="category-size" id="system_caches-size">0 MB</div>
                    </div>
                    
                    <div class="category-item" data-category="other">
                        <i class="folder icon"></i>
                        <div class="category-info">
                            <div class="category-name">{{ t._("st_CategoryOther") }}</div>
                        </div>
                        <div class="category-size" id="other-size">0 MB</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Local Storage Settings Tab -->
    <div class="ui bottom attached tab segment" data-tab="storage-local">
        {{ form(['action' : 'storage/save', 'method': 'post', 'role': 'form', 'class': 'ui form large', 'id':'local-storage-form']) }}
            <!-- Total Recording Retention Period Slider -->
            <div class="field">
                <label>{{ t._('st_RecordingRetentionPeriod') }}
                    <i class="small info circle icon field-info-icon" data-field="record_retention_period"></i>
                </label>
                <div class="ui segment" id="pbx-records-term-slider">
                    <div class="ui bottom aligned ticked labeled slider" id="PBXRecordSavePeriodSlider"></div>
                    {{ localStorageForm.render('PBXRecordSavePeriod') }}
                </div>
            </div>

            {{ partial("partials/submitbutton", ['indexurl': '', 'submitMode': submitMode, 'formId': 'local']) }}
            <div class="ui clearing hidden divider"></div>
        {{ close('form') }}
    </div>

    <!-- Cloud Storage Settings Tab -->
    <div class="ui bottom attached tab segment" data-tab="storage-cloud">
        {{ form(['action' : 'storage/save', 'method': 'post', 'role': 'form', 'class': 'ui form large', 'id':'s3-storage-form']) }}
            <div class="field">
                <div class="ui toggle checkbox" id="s3-enabled-checkbox">
                    {{ s3StorageForm.render('s3_enabled') }}
                    <label>{{ t._('st_S3AutoUploadLabel') }}
                        <i class="small info circle icon field-info-icon" data-field="s3_enabled"></i>
                    </label>
                </div>
            </div>

            <!-- S3 Configuration Fields (visible when S3 enabled) -->
            <div id="s3-settings-group" style="display: none;">

                <div class="two fields">
                    <div class="field">
                        <label>{{ t._('st_S3Endpoint') }}
                            <i class="small info circle icon field-info-icon" data-field="s3_endpoint"></i>
                        </label>
                        {{ s3StorageForm.render('s3_endpoint') }}
                    </div>
                    <div class="field">
                        <label>{{ t._('st_S3Region') }}
                            <i class="small info circle icon field-info-icon" data-field="s3_region"></i>
                        </label>
                        {{ s3StorageForm.render('s3_region') }}
                    </div>
                </div>

                <div class="field">
                    <label>{{ t._('st_S3Bucket') }}
                        <i class="small info circle icon field-info-icon" data-field="s3_bucket"></i>
                    </label>
                    {{ s3StorageForm.render('s3_bucket') }}
                </div>

                <div class="two fields">
                    <div class="field">
                        <label>{{ t._('st_S3AccessKey') }}
                            <i class="small info circle icon field-info-icon" data-field="s3_access_key"></i>
                        </label>
                        {{ s3StorageForm.render('s3_access_key') }}
                    </div>
                    <div class="field">
                        <label>{{ t._('st_S3SecretKey') }}
                            <i class="small info circle icon field-info-icon" data-field="s3_secret_key"></i>
                        </label>
                        {{ s3StorageForm.render('s3_secret_key') }}
                    </div>
                </div>

                <div class="field">
                    <button type="button" id="test-s3-connection" class="ui blue button">
                        <i class="plug icon"></i>
                        {{ t._('st_TestS3Connection') }}
                    </button>
                </div>

                <div class="ui divider"></div>

                <!-- Local Retention Slider (only when S3 enabled) -->
                <div class="field">
                    <label>{{ t._('st_LocalRetentionPeriod') }}
                        <i class="small info circle icon field-info-icon" data-field="local_retention_period"></i>
                    </label>
                    <div class="ui segment" id="pbx-s3-local-days-slider">
                        <div class="ui bottom aligned ticked labeled slider" id="PBXRecordS3LocalDaysSlider"></div>
                        {{ s3StorageForm.render('PBXRecordS3LocalDays') }}
                    </div>
                </div>
                <div class="ui hidden divider"></div>

                <!-- S3 Sync Status Message -->
                <div id="s3-stats-container" style="display: none;">
                    <div class="ui icon info message" id="s3-stats-message">
                        <i class="cloud icon"></i>
                        <div class="content">
                            <div class="header" id="s3-stats-header"></div>
                            <p id="s3-stats-details"></p>
                        </div>
                    </div>
                    <div class="ui hidden divider"></div>
                </div>
            </div>

            {{ partial("partials/submitbutton", ['indexurl': '', 'submitMode': submitMode, 'formId': 's3']) }}
            <div class="ui clearing hidden divider"></div>
        {{ close('form') }}
    </div>
