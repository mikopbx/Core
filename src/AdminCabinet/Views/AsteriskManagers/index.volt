{# Add new button with proper spacing #}
{% if isAllowed('save') %}
    {{ link_to("asterisk-managers/modify", 
              '<i class="add circle icon"></i> '~t._('am_AddNewUser'), 
              "class": "ui blue button add-new-button") }}
{% endif %}

{# Table container #}
<div id="asterisk-managers-table-container" style="margin-top: 1em;">
    {# JavaScript will populate this with custom table #}
</div>

{# Empty table placeholder #}
<div id="empty-table-placeholder" style="display: none;">
    {{ partial("partials/emptyTablePlaceholder", [
        'icon': 'asterisk',
        'title': t._('am_EmptyTableTitle'),
        'description': t._('am_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('am_AddNewUser'),
        'addButtonLink': 'asterisk-managers/modify',
        'showButton': isAllowed('save'),
        'documentationLink': 'https://wiki.mikopbx.com/asterisk-managers'
    ]) }}
</div>