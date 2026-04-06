{# Add new button - initially hidden, will be shown by JavaScript when data loads #}
{% if isAllowed('save') %}
    {{ link_to("call-queues/modify", '<i class="add circle icon"></i> '~t._('cq_AddNewQueue'), "class": "ui blue button", 'id':'add-new-button', 'style': 'display: none;') }}
{% endif %}

{# Main table container - initially hidden, will be shown by JavaScript when data loads #}
<div id="queue-table-container" style="display: none;">
    <table class="ui selectable unstackable compact table" id="call-queues-table">
        <thead>
        <tr>
            <th class="collapsing">{{ t._('cq_ColumnQueue') }}</th>
            <th class="hide-on-tablet collapsing">{{ t._('cq_StaticAgents') }}</th>
            <th class="hide-on-mobile">{{ t._('cq_Note') }}</th>
            <th class="right aligned collapsing"></th>
        </tr>
        </thead>
        <tbody>
        {# Data will be populated by JavaScript via REST API #}
        </tbody>
    </table>
</div>

{# Empty state placeholder - initially hidden, will be shown by JavaScript if no data #}
<div id="empty-table-placeholder" style="display: none;">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'users',
        'title': t._('cq_EmptyTableTitle'),
        'description': t._('cq_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('cq_AddNewQueue'),
        'addButtonLink': 'call-queues/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://docs.mikopbx.com/mikopbx/v/english/manual/telefoniya/call-queues'
    ]) }}
</div>
