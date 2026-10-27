{% if isDocker %}
    {{ partial("Update/docker")}}
{% elseif isLxc %}
    {{ partial("Update/lxc")}}
{% else %}
    {{ partial("Update/common")}}
{% endif %}