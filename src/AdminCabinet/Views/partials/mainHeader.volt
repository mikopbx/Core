<h1 class="ui {% if (actionName=='index') %}dividing{% endif %} header">
    {% if represent is empty %}
        {{ elements.getIconByController(controllerClass) }}
        <div class="content">
            {{ t._('Breadcrumb'~controllerName) }}
            <div class="sub header">{{ t._('SubHeader'~controllerName) }}
                {% if not urlToWiki is empty %}
                    <a href="{{ urlToWiki }}" target="_blank"
                       data-content="{{ t._("GoToWikiDocumentation") }}"
                       data-variation="wide"> <i class="blue question circle outline icon"></i></a>
                {% endif %}
            </div>
        </div>
    {% else %}
        <div class="content">
            {{ represent }} {% if not urlToWiki is empty %}
                <a href="{{ urlToWiki }}" target="_blank"
                   data-content="{{ t._("GoToWikiDocumentation") }}"
                   data-variation="wide"> <i class="small blue question icon"></i></a>
            {% endif %}
        </div>
    {% endif %}
</h1>
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Header')]) }}