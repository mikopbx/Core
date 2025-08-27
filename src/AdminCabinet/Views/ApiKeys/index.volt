<div id="add-new-button">
    {% if isAllowed('save') %}
        {{ link_to("api-keys/modify", '<i class="add circle icon"></i> '~t._('ak_AddNewApiKey'), "class": "ui blue button") }}
    {% endif %}
</div>

<div id="api-keys-table-container">
    <table class="ui selectable compact unstackable table" id="api-keys-table">
        <thead>
            <tr>
                <th>{{ t._('ak_ColumnName') }}</th>
                <th class="hide-on-mobile">{{ t._('ak_ColumnRestrictions') }}</th>
                <th class="hide-on-mobile">{{ t._('ak_ColumnLastUsed') }}</th>
                <th class="hide-on-mobile">{{ t._('ak_ColumnDescription') }}</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            <!-- DataTable will populate this -->
        </tbody>
    </table>
</div>

<div id="empty-table-placeholder" style="display: none;">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'key',
        'title': t._('ak_EmptyTableTitle'),
        'description': t._('ak_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('ak_AddNewApiKey'),
        'addButtonLink': 'api-keys/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/api-keys'
    ]) }}
</div>