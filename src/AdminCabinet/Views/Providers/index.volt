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

{# Count providers by type for empty checks #}
{% set sipCount = 0 %}
{% set iaxCount = 0 %}
{% for provider in providerlist %}
    {% if provider['type'] == 'sip' %}
        {% set sipCount = sipCount + 1 %}
    {% elseif provider['type'] == 'iax' %}
        {% set iaxCount = iaxCount + 1 %}
    {% endif %}
{% endfor %}

<div class="ui top attached tabular menu" id="providers-menu">
    <a class="item active" data-tab="sip">{{ t._('pr_SIPProviders') }}</a>
    <a class="item" data-tab="iax">{{ t._('pr_IAXProviders') }}</a>
</div>

<div class="ui bottom attached tab segment active" data-tab="sip">
    {% if isAllowed('save') and sipCount > 0 %}
        {{ link_to("providers/modifysip", '<i class="add circle icon"></i> '~t._('pr_AddSIPProvider'), "class": "ui blue button add-new-button") }}
    {% endif %}
    
    {% for provider in providerlist if provider['type'] == 'sip' %}
        {% if loop.first %}
            {% set modifyClass = isAllowed('save') ? "" : "disabled" %}
            <table class="ui selectable unstackable very compact table" id="sip-providers-table">
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
    
    {% if sipCount == 0 %}
        {{ partial("partials/emptyTablePlaceholder", [
            'icon': 'server',
            'title': t._('pr_EmptySIPTableTitle'),
            'description': t._('pr_EmptySIPTableDescription'),
            'addButtonText': '<i class="add circle icon"></i> '~t._('pr_AddSIPProvider'),
            'addButtonLink': 'providers/modifysip',
            'showButton': isAllowed('save'),
            'documentationLink': 'https://wiki.mikopbx.com/providers#sip'
        ]) }}
    {% endif %}
</div>

<div class="ui bottom attached tab segment" data-tab="iax">
    {% if isAllowed('save') and iaxCount > 0 %}
        {{ link_to("providers/modifyiax", '<i class="add circle icon"></i> '~t._('pr_AddIAXProvider'), "class": "ui blue button add-new-button") }}
    {% endif %}
    
    {% for provider in providerlist if provider['type'] == 'iax' %}
        {% if loop.first %}
            {% set modifyClass = isAllowed('save') ? "" : "disabled" %}
            <table class="ui selectable unstackable very compact table" id="iax-providers-table">
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
    
    {% if iaxCount == 0 %}
        {{ partial("partials/emptyTablePlaceholder", [
            'icon': 'server',
            'title': t._('pr_EmptyIAXTableTitle'),
            'description': t._('pr_EmptyIAXTableDescription'),
            'addButtonText': '<i class="add circle icon"></i> '~t._('pr_AddIAXProvider'),
            'addButtonLink': 'providers/modifyiax',
            'showButton': isAllowed('save'),
            'documentationLink': 'https://wiki.mikopbx.com/providers#iax'
        ]) }}
    {% endif %}
</div>