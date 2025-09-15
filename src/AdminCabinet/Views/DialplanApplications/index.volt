{% if isAllowed('save') %}
    {{ link_to("dialplan-applications/modify", '<i class="add circle icon"></i> '~t._('da_AddNewDialplanApp'), "class": "ui blue button", "id":"add-new-button") }}
{% endif %}

<div id="dialplan-applications-table-container">
    <table class="ui selectable compact unstackable table" id="dialplan-applications-table">
        <thead>
            <tr>
                <th class="collapsing">{{ t._('da_ColumnName') }}</th>
                <th class="hide-on-mobile">{{ t._('da_ColumnNote') }}</th>
                <th class="right aligned collapsing"></th>
            </tr>
        </thead>
        <tbody>
            <!-- Data will be loaded via Ajax -->
        </tbody>
    </table>
</div>

<div id="empty-table-placeholder" style="display: none;">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'code',
        'title': t._('da_NoDialplanApplicationsFound'),
        'description': t._('da_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('da_CreateFirstDialplanApp'),
        'addButtonLink': 'dialplan-applications/modify',
        'showButton': isAllowed('save')
    ]) }}
</div>

