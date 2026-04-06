<h1 id="page-header" class="ui {% if (actionName=='index') %}dividing{% endif %} header">
    {% if represent is empty %}
        {{ elements.getIconByController(controllerClass) }}
        <div class="content">
            {{ t._('Breadcrumb'~controllerName) }}
            <div class="sub header">{{ t._('SubHeader'~controllerName) }}
                <a class="wiki-help-link" href="#"
                   data-controller="{{ controllerName }}" data-action="{{ actionName }}"
                   {% if globalModuleUniqueId %}data-module-id="{{ globalModuleUniqueId }}"{% endif %}
                   data-content="{{ t._("GoToWikiDocumentation") }}"
                   data-variation="wide"> <i class="blue question circle outline icon"></i></a>
            </div>
        </div>
    {% else %}
        <div class="content">
            {{ represent }} 
            
            {% if not representSubHeader is empty %}
                <div class="sub header" id="page-sub-header">{{ representSubHeader }}
                    <a class="wiki-help-link" href="#"
                       data-controller="{{ controllerName }}" data-action="{{ actionName }}"
                       {% if globalModuleUniqueId %}data-module-id="{{ globalModuleUniqueId }}"{% endif %}
                       data-content="{{ t._("GoToWikiDocumentation") }}"
                       data-variation="wide"> <i class="small blue question icon"></i></a>
                </div>
            {% else %}
                <a class="wiki-help-link" href="#"
                   data-controller="{{ controllerName }}" data-action="{{ actionName }}"
                   {% if globalModuleUniqueId %}data-module-id="{{ globalModuleUniqueId }}"{% endif %}
                   data-content="{{ t._("GoToWikiDocumentation") }}"
                   data-variation="wide"> <i class="small blue question icon"></i></a>
            {% endif %}
        </div>
    {% endif %}
</h1>
{{ partial("PbxExtensionModules/hookVoltBlock",['arrayOfPartials':hookVoltBlock('Header')]) }}