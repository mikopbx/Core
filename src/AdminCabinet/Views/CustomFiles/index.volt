{# Main table container - initially hidden, will be shown by JavaScript when data loads #}
<div id="custom-files-table-container" style="display: none;">
    <div class="ui grid">
        <div class="ui row">
            <div class="ui seven wide column">
                {% if isAllowed('save') %}
                    {{ link_to("custom-files/modify", '<i class="add circle icon"></i> '~t._('cf_AddNewFile'), "class": "ui blue button", "id":"add-new-button") }}
                {% endif %}
            </div>
            <div class="ui nine wide column">
                <div class="ui right action left icon fluid input">
                    <i class="search link icon" id="search-icon"></i>
                    <input type="search" id="global-search" name="global-search" placeholder="{{ t._('cf_EnterSearchPhrase') }}"
                           aria-controls="custom-files-table" class="prompt" autocomplete="off">
                    <div class="ui basic floating dropdown button" id="page-length-select">
                        <div class="text">{{ t._('cf_CalculateAutomatically') }}</div>
                        <i class="dropdown icon"></i>
                        <div class="menu">
                            <div class="item" data-value="auto">{{ t._('cf_CalculateAutomatically') }}</div>
                            <div class="item" data-value="25">{{ t._('cf_ShowOnlyRows', ['rows':25]) }}</div>
                            <div class="item" data-value="100">{{ t._('cf_ShowOnlyRows', ['rows':100]) }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <br>
    <table class="ui selectable very compact unstackable table" id="custom-files-table">
        <thead>
        <tr>
            <th>{{ t._('cf_ColumnPath') }}</th>
            <th class="collapsing">{{ t._('cf_ColumnMode') }}</th>
            <th class="hide-on-mobile">{{ t._('cf_ColumnNote') }}</th>
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
        'icon': 'file alternate',
        'title': t._('cf_EmptyTableTitle'),
        'description': t._('cf_EmptyTableDescription'),
        'addButtonText': '<i class="add circle icon"></i> '~t._('cf_AddNewFile'),
        'addButtonLink': 'custom-files/modify',
        'showButton': isAllowed('save')
    ]) }}
</div>