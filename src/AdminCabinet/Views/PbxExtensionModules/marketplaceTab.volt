<div class="ui loading segment" id="new-modules-loader">
    <p></p>
    <p></p>
</div>

<table class="ui celled unstackable table" id="new-modules-table" style="display: none;">
    <thead>
    <tr>
        <th>{{ t._('ext_TableColumnDescription') }}</th>
        <th class="collapsing">{{ t._('ext_TableColumnDeveloper') }}</th>
        <th class="collapsing center aligned column">{{ t._('ext_TableColumnVersion') }}</th>
        <th class="collapsing column"></th>
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


