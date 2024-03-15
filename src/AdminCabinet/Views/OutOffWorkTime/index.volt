{% if isAllowed('save') %}
    {{ link_to("out-off-work-time/modify", '<i class="add circle icon"></i> '~t._('tf_AddNewTimeFrame'), "class": "ui blue button", "id":"add-new-button") }}
{% endif %}
    {% for record in indexTable %}
        {% if loop.first %}
            <table class="ui structured very compact unstackable table" id="time-frames-table">
            <thead>
            <tr>
                <th></th>
                <th>{{ t._('tf_TableColumnDatePeriod') }}</th>
                <th></th>
                <th class="hide-on-mobile">{{ t._('tf_TableColumnNotes') }}</th>
                <th class="right aligned">{{ t._('tf_TableColumnAction') }}</th>
                <th></th>
            </tr>
            </thead>
            <tbody>
        {% endif %}

        <tr class="frame-row" id="{{ record['id'] }}">
            <td class="collapsing dragHandle"><i class="sort grey icon"></i></td>
            <td class="collapsing">
                <div class="ui bulleted list">

                {% if (record['calType']=='') %}
                       {% if (record['date_from']!='') %}
                           <div class="item"><i class="icon outline calendar alternate"></i>
                           {{ record['date_from'] }}
                           {% if record['date_from']!=record['date_to'] %}
                           - {{ record['date_to'] }}
                           {% endif %}
                           </div>
                       {% endif %}
                       {% if (record['weekday_from']!='') %}
                           <div class="item"><i class="icon outline calendar minus"></i>
                           {{ record['weekday_from'] }}
                           {% if record['weekday_from']!=record['weekday_to'] %}
                            - {{ record['weekday_to'] }}
                           {% endif %}
                           </div>
                       {% endif %}
                       {% if (record['time_from']!='') %}
                           <div class="item"><i class="icon clock outline"></i>
                           {{ record['time_from'] }}
                           {% if record['time_from']!=record['time_to'] %}
                            - {{ record['time_to'] }}
                           {% endif %}
                           </div>
                       {% endif %}
                {% else %}
                       <div class="item"><i class="icon outline calendar alternate"></i>
                       {{ record['calType'] }}
                       </div>
                {% endif %}


                </div>
            </td>
            <td class="collapsing">
                {% if (record['allowRestriction']=='1') %}
                    <div class="ui basic icon button" data-variation="wide" data-content="{{ t._('tf_AllowRestriction') }}" data-position="top right">
                        <i class="filter icon"></i>
                    </div>
                {% endif %}
            </td>
            <td class="hide-on-mobile">
                {% if not (record['description'] is empty) %}
                    <div class="ui basic icon button" data-variation="wide" data-content="{{ record['description'] }}" data-position="top right">
                        <i class="file text  icon"></i>
                        {{record['shot_description']}}
                    </div>
                {% endif %}
            </td>
            <td class="right aligned">
                {% if (record['action'] =='playmessage') %}
                    {{ t._('tf_ActionPlayMessage',['message': record['audio_message_id']]) }}
                {% elseif (record['action']  =='extension') %}
                    {{ t._('tf_ActionTransferToExtension',['extension' : record['extension']]) }}
                {% endif %}
            </td>
            {{ partial("partials/tablesbuttons",
                [
                    'id': record['id'],
                    'edit' : 'out-off-work-time/modify/',
                    'delete': 'out-off-work-time/delete/'
                ]) }}
        </tr>

        {% if loop.last %}

            </tbody>
            </table>
        {% endif %}
    {% endfor %}
