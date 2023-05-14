{% if isAllowed('modify') %}
    {{ link_to("extensions/modify", '<i class="add user icon"></i>  '~t._('ex_AddNewExtension'), "class": "ui blue button", "id":"add-new-button") }}
{% endif %}
    {% for extension in extensions %}
        {% if loop.first %}
            <table class="ui selectable unstackable compact table" id="extensions-table" data-page-length='12'>
            <thead>
            <tr>
                {# <th></th> #}
                <th></th>
                <th>{{ t._('ex_Name') }}</th>
                <th class="center aligned">{{ t._('ex_Extension') }}</th>
                <th class="center aligned">{{ t._('ex_Mobile') }}</th>
                <th class="hide-on-mobile">{{ t._('ex_Email') }}</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}

        <tr class="extension-row" id="{{ extension['id'] }}" data-value="{{ extension['number'] }}">
            {# <td class="collapsing"> #}
            {# <div class="ui fitted slider checkbox"> #}
            {# <input type="checkbox" {% if extension['status']!='disabled' %} checked {% endif %} data-value="{{ extension['number'] }}"> <label></label> #}
            {# </div> #}
            {# </td> #}
            <td class="center aligned {{ extension['status'] }} disability center aligned extension-status"><i
                        class="spinner loading icon"></i></td>
            <td class="{{ extension['status'] }} disability collapsing"><img src="{{ extension['avatar'] }}"
                                                                  class="ui avatar image"
                                                                  data-value="{{ extension['userid'] }}"> {{ extension['username'] }}
            </td>
            <td class="center aligned {{ extension['status'] }} disability">{{ extension['number'] }}</td>
            <td class="center aligned {{ extension['status'] }} disability" data-search="{{ extension['mobile'] }}">
                <div class="ui transparent input">
                    <input class="mobile-number-input" type="text" value="{{ extension['mobile'] }}">
                </div>
            </td>
            <td class="hide-on-mobile {{ extension['status'] }} disability">{{ extension['email'] }}</td>

            {{ partial("partials/tablesbuttons",
                [
                    'id': extension['id'],
                    'clipboard' : extension['secret'],
                    'edit' : 'extensions/modify/',
                    'delete': 'extensions/delete/'
                ]) }}

        </tr>
        {% if loop.last %}

            </tbody>
            </table>
        {% endif %}
    {% endfor %}

