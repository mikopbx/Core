<div class="two fields">
    <div class="field">
        <h4 class="ui  header">{{ t._('cd_Audio') }}</h4>
        {% for codec in codecs %}
            {% if codec['type']=='audio' %}

        <div class="ui segment">
            <div class="field">
                    <div class="ui toggle checkbox codecs">
                        <input type="checkbox" name="codec_{{ codec['name'] }}" {% if codec['enabled'] %} checked {% endif %}  tabindex="0" class="hidden">
                        <label>{{ codec['description']}}</label>
                    </div>
                </div>
        </div>
            {% endif %}
        {% endfor %}
    </div>
    <div class="field">
        <h4 class="ui  header">{{ t._('cd_Video') }}</h4>

        {% for codec in codecs %}
            {% if codec['type']=='video' %}
        <div class="ui segment">
                <div class="field">
                    <div class="ui toggle checkbox codecs">
                        <input type="checkbox" name="codec_{{ codec['name'] }}" {% if codec['enabled'] %} checked {% endif %} tabindex="0" class="hidden">
                        <label>{{ codec['description']}}</label>
                    </div>
                </div>
        </div>
            {% endif %}
        {% endfor %}
    </div>
</div>

{#{% do assets.addinlinejs('$(".codecs").checkbox();') %}#}