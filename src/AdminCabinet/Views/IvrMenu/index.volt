{{ link_to("ivr-menu/modify", '<i class="add circle icon"></i> '~t._('iv_AddNewIvrMenu'), "class": "ui blue button", 'id':'add-new-button') }}

    {% for record in ivrmenu %}
        {% if loop.first %}
            <table class="ui selectable compact table" id="ivr-menu-table">
            <thead>
            <tr>
                <th class="centered">{{ t._('iv_Extension') }}</th>
                <th>{{ t._('iv_Name') }}</th>
                <th>{{ t._('iv_Actions') }}</th>
                <th>{{ t._('iv_TimeoutExtension') }}</th>
                <th>{{ t._('iv_Note') }}</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}


        <tr class="menu-row" id="{{ record['uniqid'] }}">
            <td class="centered">{{ record['extension'] }}</td>
            <td class="collapsing">{{ record['name'] }}</td>
            <td class="collapsing">
                <small>
                    {% for action in record['actions'] %}
                            {{ action['digits'] }} - {{ action['represent'] }}<br>
                    {% endfor %}
                </small>
            </td>
            <td class="collapsing">
                <small>
                    {% if record['timeoutExtension'] %}
                        {{ record['timeoutExtension'] }}
                    {% endif %}
                </small>
            </td>
            <td>
                {% if not (record['description'] is empty) %}
                    <div class="ui basic icon button" data-content="{{ record['description'] }}" data-position="top right"
                         data-variation="wide">
                        <i class="file text  icon"></i>
                    </div>
                {% endif %}
            </td>
            {{ partial("partials/tablesbuttons",
                [
                    'id': record['uniqid'],
                    'edit' : 'ivr-menu/modify/',
                    'delete': 'ivr-menu/delete/'
                ]) }}
        </tr>

        {% if loop.last %}

            </tbody>
            </table>
        {% endif %}
    {% endfor %}
