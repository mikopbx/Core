{# Add button (initially hidden) #}
{% if isAllowed('save') %}
    {{ link_to("off-work-times/modify", '<i class="add circle icon"></i> '~t._('tf_AddNewTimeFrame'), "class": "ui blue button", "id": "add-new-button", "style": "display:none") }}
{% endif %}

{# Table container - hidden by default #}
<div id="time-frames-table-container" style="display:none">
    <table class="ui selectable compact unstackable table" id="time-frames-table">
        <thead>
        <tr>
            <th></th>
            <th>{{ t._('tf_TableColumnDatePeriod') }}</th>
            <th></th>
            <th class="hide-on-mobile">{{ t._('tf_TableColumnNotes') }}</th>
            <th class="right aligned">{{ t._('tf_TableColumnAction') }}</th>
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
        'icon': 'calendar times',
        'title': t._('tf_EmptyTableTitle'),
        'description': t._('tf_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('tf_AddNewTimeFrame'),
        'addButtonLink': 'off-work-times/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/off-work-times'
    ]) }}
</div>
