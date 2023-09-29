<div class="ui grid">
    <div class="ui row">
        <div class="ui nine wide column">
            {% if isAllowed('save') %}
                {{ link_to("extensions/modify", '<i class="add user icon"></i>  '~t._('ex_AddNewExtension'), "class": "ui blue button", "id":"add-new-button") }}
            {% endif %}
        </div>
        <div class="ui seven wide column">
            <div class="ui icon fluid input">
                <input type="search" id="global-search" name="global-search" placeholder="{{ t._('Enter search') }}"
                       aria-controls="KeysTable">
                <i class="icon search"></i>
            </div>
        </div>

    </div>
</div>
<div class="ui hidden divider"></div>
<table class="ui selectable unstackable compact table" id="extensions-table">
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
