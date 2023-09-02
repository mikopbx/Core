<div class="ui hidden divider"></div>
<div class="ui grid">
    <div class="ui left floated middle aligned thirteen wide column">
        <h1 class="ui header">
            {{ elements.getIconByController(controllerClass) }}
            <div class="content">
                {{ t._('Breadcrumb'~controllerName) }}
                <div class="sub header">{{ t._('SubHeader'~controllerName) }}
                    ( {{ t._('ext_Version') }} {{ module['version'] }})
                    {% if not urlToWiki is empty %}
                        <a href="{{ urlToWiki }}" target="_blank"
                           data-content="{{ t._("GoToWikiDocumentation") }}"
                           data-variation="wide"><i class="small blue question icon circular label"></i></a>
                    {% endif %}
                </div>
            </div>
        </h1>
        {{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Header')]) }}
    </div>

    <div class="ui right floated middle aligned three wide column">
        {% if logoImagePath is not empty %}
            <img class="ui tiny right floated image" src="{{ logoImagePath }}" />
        {% endif %}
    </div>
</div>
<div class="ui clearing hidden divider"></div>