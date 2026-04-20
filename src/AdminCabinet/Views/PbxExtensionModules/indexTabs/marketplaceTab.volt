<div class="ui loading segment" id="new-modules-loader">
    <p></p>
    <p></p>
</div>

<input type="file" name="update-file" accept=".zip" style="display: none!important;"/>

<div class="ui form module-type-filter-wrapper" id="module-type-filter-wrapper" style="display:none; margin: 0 0 10px 0;">
    <div class="inline field">
        <label for="module-type-filter">{{ t._('ext_ModuleTypeFilter') }}</label>
        <div class="ui selection dropdown" id="module-type-filter">
            <input type="hidden" name="module-type-filter-value" value="all">
            <i class="dropdown icon"></i>
            <div class="default text">{{ t._('ext_ModuleTypeAll') }}</div>
            <div class="menu"></div>
        </div>
    </div>
</div>

<table class="ui celled selectable unstackable very compact table" id="new-modules-table" style="display: none;">
    <thead>
    <tr>
        <th>{{ t._('ext_TableColumnDescription') }}</th>
        <th class="collapsing">{{ t._('ext_TableColumnDeveloper') }}</th>
        <th class="collapsing center aligned column">{{ t._('ext_TableColumnVersion') }}</th>
        <th class="collapsing column"><div class="ui small basic icon buttons action-buttons">
                <a class="ui button popuped disable-if-no-internet" data-content="{{ t._('ext_UpdateAllModules') }}" id="update-all-modules-button">
                    <i class="icon redo blue" ></i>
                </a>
            </div></th>
    </tr>
    </thead>
    <tbody>
    </tbody>
</table>


<div class="ui placeholder segment" id="no-new-modules-segment" style="display: none;">
    <div class="ui icon header">
        <i class="puzzle piece icon"></i>
        {{ t._('ext_NoAvailableModules') }}
    </div>
</div>


