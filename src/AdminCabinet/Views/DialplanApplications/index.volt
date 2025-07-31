{% if isAllowed('save') %}
    {{ link_to("dialplan-applications/modify", '<i class="add circle icon"></i> '~t._('da_AddNewDialplanApp'), "class": "ui blue button", "id":"add-new-button") }}
{% endif %}

<div id="dialplan-applications-table-container">
    <table class="ui selectable compact unstackable table datatable-width-constrained" id="dialplan-applications-table">
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

<div class="ui placeholder segment" id="empty-table-placeholder" style="display: none;">
    <div class="ui icon header">
        <i class="code icon"></i>
        {{ t._('da_NoDialplanApplicationsFound') }}
    </div>
    {% if isAllowed('save') %}
        <div class="inline">
            {{ link_to("dialplan-applications/modify", t._('da_CreateFirstDialplanApp'), "class": "ui primary button") }}
        </div>
    {% endif %}
</div>

