
    {{ link_to("providers/modifysip", '<i class="add circle icon"></i> '~t._('pr_AddSIPProvider'), "class": " ui blue button ") }}
    {{ link_to("providers/modifyiax", '<i class="add circle icon"></i> '~t._('pr_AddIAXProvider'), "class": " ui blue button ") }}


    {% for provider in providerlist %}
        {% if loop.first %}
            <table class="ui selectable table">
            <thead>
            <tr>

                <th></th>
                <th class="center aligned"></th>
                <th>{{ t._('pr_TableColumnProviderName') }}</th>
                <th>{{ t._('pr_TableColumnProviderType') }}</th>
                <th>{{ t._('pr_TableColumnProviderHostName') }}</th>
                <th>{{ t._('pr_TableColumnProviderLogin') }}</th>
                <th colspan="2"></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}


        <tr class="provider-row" id="{{ provider['uniqid'] }}" data-value="{{ provider['type']|lower }}">

            <td class="collapsing no-modify-columns">
                <div class="ui  toggle checkbox">
                    <input type="checkbox" {% if provider['status']!='disabled' %} checked {% endif %}> <label></label>
                </div>
            </td>
            <td class="{{ provider['status'] }} disability center aligned provider-status"><i class="spinner loading icon"></i></td>
            <td class="{{ provider['status'] }} disability">{{ provider['name'] }} <br><span class="features failure"></span></td>
            <td class="{{ provider['status'] }} disability">{{ provider['type'] }}</td>
            <td class="{{ provider['status'] }} disability">{{ provider['hostname'] }}</td>
            <td class="{{ provider['status'] }} disability">{{ provider['username'] }}</td>
            {{ partial("partials/tablesbuttons",
                [
                    'id': provider['uniqid'],
                    'edit' : 'providers/modify'~ provider['type']|lower~'/',
                    'delete': 'providers/delete/'
                ])
            }}
        </tr>

        {% if loop.last %}
           </tbody>
            </table>
        {% endif %}
    {% endfor %}
