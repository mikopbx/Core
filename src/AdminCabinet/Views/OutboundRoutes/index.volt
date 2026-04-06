{% if isAllowed('save') %}
    {{ link_to("outbound-routes/modify", '<i class="add circle icon"></i> '~t._('or_AddNewRule'), "class": "ui blue button", "id": "add-new-button", "style": "display:none") }}
{% endif %}

{# Table container - hidden by default #}
<div id="routes-table-container" style="display:none">
    <table class="ui selectable compact unstackable table" id="outbound-routes-table">
        <thead>
        <tr>
            <th></th>
            <th>{{ t._('or_TableColumnName') }}</th>
            <th>{{ t._('or_TableColumnRule') }}</th>
            <th class="hide-on-mobile">{{ t._('or_TableColumnNote') }}</th>
            <th></th>
        </tr>
        </thead>
        <tbody>
        {# Table body will be filled by DataTables #}
        </tbody>
    </table>
</div>

{# Empty table placeholder - hidden by default #}
<div id="empty-table-placeholder" style="display:none">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'sign out alternate',
        'title': t._('or_EmptyTableTitle'),
        'description': t._('or_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('or_AddNewRule'),
        'addButtonLink': 'outbound-routes/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/outbound-routes'
    ]) }}
</div>

<div class="ui clearing hidden divider"></div>