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
    {{ link_to("providers/modifysip", '<i class="add circle icon"></i> '~t._('pr_AddSIPProvider'), "class": " ui blue button add-new-button") }}
    {{ link_to("providers/modifyiax", '<i class="add circle icon"></i> '~t._('pr_AddIAXProvider'), "class": " ui blue button add-new-button") }}
    {% set modifyClass="" %}
{% else %}
    {% set modifyClass="disabled" %}
{% endif %}

    {% for provider in providerlist %}
        {% if loop.first %}
            <table class="ui selectable unstackable table" id="providers-table">
            <thead>
            <tr>
                <th></th>
                <th class="center aligned"></th>
                <th>{{ t._('pr_TableColumnProviderName') }}</th>
                <th class="hide-on-mobile">{{ t._('pr_TableColumnProviderType') }}</th>
                <th>{{ t._('pr_TableColumnProviderHostName') }}</th>
                <th class="hide-on-mobile">{{ t._('pr_TableColumnProviderLogin') }}</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}


        <tr class="provider-row" id="{{ provider['uniqid'] }}" data-value="{{ provider['type']|lower }}"
            data-links="{{ provider['existLinks']|lower }}">

            <td class="no-modify-columns collapsing">
                <div class="ui  toggle checkbox {{ modifyClass }}">
                    <input type="checkbox" {% if provider['status']!='disabled' %} checked {% endif %}> <label></label>
                </div>
            </td>
            <td class="{{ provider['status'] }} disability center aligned provider-status"><i
                        class="spinner loading icon"></i></td>
            <td class="{{ provider['status'] }} disability collapsing">{{ provider['name'] }} <br><span
                        class="features failure"></span></td>
            <td class="{{ provider['status'] }} disability hide-on-mobile">{{ provider['type'] }}</td>
            <td class="{{ provider['status'] }} disability">{{ provider['hostname'] }}</td>
            <td class="{{ provider['status'] }} disability hide-on-mobile">{{ provider['username'] }}</td>
            {{ partial("partials/tablesbuttons",
                [
                    'id': provider['uniqid'],
                    'edit' : 'providers/modify'~ provider['type']|lower~'/',
                    'copy' : 'providers/modify'~ provider['type']|lower~'?copy-source=',
                    'delete': 'providers/delete/'
                ]) }}
        </tr>

        {% if loop.last %}
            </tbody>
            </table>
        {% endif %}
    {% endfor %}
