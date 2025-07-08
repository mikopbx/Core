    
    <div class="ui top attached tabular menu" id="storage-menu">
        <a class="item active" data-tab="storage-info">{{ t._('st_TabStorageInfo') }}</a>
        <a class="item" data-tab="storage-settings">{{ t._('st_TabStorageSettings') }}</a>
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
    
    <!-- Storage Settings Tab -->
    <div class="ui bottom attached tab segment" data-tab="storage-settings">
        {{ form(['action' : 'storage/save', 'method': 'post', 'role': 'form', 'class': 'ui form large', 'id':'storage-form']) }}
        <div class="field">
            <label>{{ t._('st_PBXRecordSavePeriodLabel') }}</label>
            <div class="ui segment" id="pbx-records-term-slider">
                <div class="ui bottom aligned ticked labeled slider" id="PBXRecordSavePeriodSlider"></div>
                {{ form.render('PBXRecordSavePeriod') }}
            </div>
        </div>
        
        {{ partial("partials/submitbutton", ['indexurl': '', 'submitMode': submitMode]) }}
         <div class="ui clearing hidden divider"></div>
        {{ close('form') }}
    </div>

   
