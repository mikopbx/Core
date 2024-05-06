{% if isDocker %}
    {{ partial("Update/docker")}}
{% else %}
    {{ partial("Update/common")}}
{% endif %}