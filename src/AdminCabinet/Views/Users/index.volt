{{ content() }}
<div class="ui  container">
    <h1 class="ui header">{{ t._('Users settings') }}</h1>

    {% for user in userslist %}
        {% if loop.first %}
            <table class="ui small very compact selectable celled table">
            <thead>
            <tr>
                <th>{{ t._('User email') }}</th>
                <th>{{ t._('User name') }}</th>
                <th>{{ t._('Role') }}</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}

        <tr class="{% if user.active==0 %} negative {% endif %} userrow" id="{{ user.id }}">
            <td>{{ user.email }}</td>
            <td>{{ user.name }}</td>
            <td>{{ user.role }}</td>
            <td class="right aligned">{{ link_to("settings/useredit/" ~ user.id, '<i class="icon edit blue"></i> ', "class": "ui icon") }}</td>
        </tr>

        {% if loop.last %}

            <tfoot class="full-width">
            {% if allowadduser %}
                <tr>
                    <th colspan="4">
                        {{ link_to("settings/useredit/new", '<i class="user icon"></i> '~t._('Add user'), "class": "ui right floated small primary labeled icon button") }}
                    </th>
                </tr>
            {% endif %}
            </tfoot>


            </tbody>
            </table>
        {% endif %}
    {% endfor %}

</div>

<script type="application/javascript">
	$(".userrow").on('dblclick', function () {
		location.href = "useredit/" + $(this).attr('id');
	});
</script>