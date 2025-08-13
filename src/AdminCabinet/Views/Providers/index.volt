<div class="ui modal" id="delete-modal-form">
    <div class="header">
        {{ t._('pr_DeleteTitle') }}
    </div>
    <div class="image content">
        <div class="image">
            <i class="icon attention"></i>
        </div>
        <div class="description">
            {{ t._('pr_DeleteDescription_v2') }}
        </div>
    </div>
    <div class="actions">
        <div class="ui cancel button">{{ t._('pr_Cancel') }}</div>
        <div class="ui red approve button">{{ t._('pr_Delete') }}</div>
    </div>
</div>

{% if isAllowed('save') %}
    <div id="add-buttons-group" class="ui buttons" style="display:none; margin-bottom: 1em;">
        {{ link_to("providers/modifysip", '<i class="add circle icon"></i> '~t._('pr_AddSIPProvider'), "class": "ui blue button") }}
        {{ link_to("providers/modifyiax", '<i class="add circle icon"></i> '~t._('pr_AddIAXProvider'), "class": "ui blue button") }}
    </div>
{% endif %}

{# Table container - hidden by default #}
<div id="providers-table-container" style="display:none">
    <table class="ui selectable compact unstackable table" id="providers-table">
        <thead>
        <tr>
            <th></th>
            <th class="center aligned"></th>
            <th>{{ t._('pr_TableColumnProviderName') }}</th>
            <th>{{ t._('pr_TableColumnProviderHostName') }}</th>
            <th class="hide-on-mobile">{{ t._('pr_TableColumnProviderLogin') }}</th>
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
    <div class="ui placeholder segment">
        <div class="ui icon header">
            <i class="server icon"></i>
            {{ t._('pr_EmptyTableTitle') }}
        </div>
        <div class="inline">
            <div class="ui text">
                {{ t._('pr_EmptyTableDescription') }}
            </div>
        </div>
        <div class="inline" style="margin-top: 1em; margin-bottom: 1em;">
            <a href="https://wiki.mikopbx.com/providers" target="_blank" class="ui basic tiny button prevent-word-wrap">
                <i class="question circle outline icon"></i>
                {{ t._('et_ReadDocumentation') }}
            </a>
        </div>
        {% if isAllowed('save') %}
            <div class="inline">
                <div class="ui buttons">
                    {{ link_to("providers/modifysip", '<i class="add circle icon"></i> '~t._('pr_AddSIPProvider'), "class": "ui blue button prevent-word-wrap") }}
                    {{ link_to("providers/modifyiax", '<i class="add circle icon"></i> '~t._('pr_AddIAXProvider'), "class": "ui blue button prevent-word-wrap") }}
                </div>
            </div>
        {% endif %}
    </div>
</div>