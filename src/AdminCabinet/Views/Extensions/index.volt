<div class="ui grid">
    <div class="ui row">
        <div class="ui seven wide column">
            {% if isAllowed('save') %}
                {{ link_to("extensions/modify", '<i class="add user icon"></i>  '~t._('ex_AddNewExtension'), "class": "ui blue button", "id":"add-new-button") }}
            {% endif %}
        </div>
        <div class="ui nine wide column">
            <div class="ui search right action left icon fluid input" id="search-extensions-input">
                <i class="search link icon" id="search-icon"></i>
                <input type="search" id="global-search" name="global-search" placeholder="{{ t._('ex_EnterSearchPhrase') }}"
                       aria-controls="KeysTable" class="prompt">
                <div class="results"></div>
                <div class="ui basic floating search dropdown button" id="page-length-select">
                    <div class="text">{{ t._('ex_CalculateAutomatically') }}</div>
                    <i class="dropdown icon"></i>
                    <div class="menu">
                        <div class="item" data-value="auto">{{ t._('ex_CalculateAutomatically') }}</div>
                        <div class="item" data-value="25">{{ t._('ex_ShowOnlyRows', {'rows':25}) }}</div>
                        <div class="item" data-value="50">{{ t._('ex_ShowOnlyRows', {'rows':50}) }}</div>
                        <div class="item" data-value="100">{{ t._('ex_ShowOnlyRows', {'rows':100}) }}</div>
                        <div class="item" data-value="500">{{ t._('ex_ShowOnlyRows', {'rows':500}) }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<br>
<table class="ui selectable unstackable very compact table" id="extensions-table">
    <thead>
    <tr>
        <th></th>
        <th>{{ t._('ex_Name') }}</th>
        <th class="center aligned">{{ t._('ex_Extension') }}</th>
        <th class="center aligned">{{ t._('ex_Mobile') }}</th>
        <th class="">{{ t._('ex_Email') }}</th>
        <th></th>
    </tr>
    </thead>
    <tbody>
    </tbody>
</table>

<table class="template" style="display: none">
    <tbody>
    <tr class="extension-row-tpl">
        <td class="disability center aligned extension-status"><i class="spinner loading icon"></i></td>
        <td class="disability collapsing"><img src="#" class="ui avatar image"></td>
        <td class="center aligned disability number"></td>
        <td class="center aligned disability mobile">
            <div class="ui transparent input">
                <input class="mobile-number-input" readonly="readonly" type="text" value="">
            </div>
        </td>
        <td class="disability email"></td>
        {{ partial("partials/tablesbuttons",
            [
                'id': '',
                'clipboard' : '#',
                'edit' : 'extensions/modify/',
                'delete': 'extensions/delete/']) }}
    </tr>
    </tbody>

</table>
