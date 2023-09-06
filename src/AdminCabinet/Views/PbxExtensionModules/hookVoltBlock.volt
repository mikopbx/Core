{% for moduleUniqueID, compiledVoltTemplate in arrayOfPartials %}
    <!-- Included by {{ moduleUniqueID }} begin-->
    {{ partial (compiledVoltTemplate) }}
    <!-- Included by {{ moduleUniqueID }} end-->
{% endfor %}