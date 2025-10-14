<div id="static-routes-section" style="display: none;">
    <h4 class="ui dividing header">{{ t._("nw_StaticRoutes") }}</h4>

    <div class="ui basic compact segment">
        <table class="ui selectable small very compact unstackable table" id="static-routes-table">
            <thead>
                <tr>
                    <th style="width: 30px;"></th>
                    <th>{{ t._("nw_Network") }}</th>
                    <th>{{ t._("nw_Subnet") }}</th>
                    <th>{{ t._("nw_Gateway") }}</th>
                    <th>{{ t._("nw_Interface") }}</th>
                    <th style="width: 50px;"></th>
                </tr>
            </thead>
            <tbody>
                <!-- Шаблонная строка для клонирования -->
                <tr class="route-row-template" style="display: none">
                    <td class="dragHandle"><i class="sort grey icon"></i></td>
                    <td>
                        <input type="text" class="network-input ipaddress" placeholder="192.168.10.0" />
                    </td>
                    <td>
                        <div class="subnet-dropdown-container"></div>
                    </td>
                    <td>
                        <input type="text" class="gateway-input ipaddress" placeholder="192.168.1.1" />
                    </td>
                    <td>
                        <div class="interface-dropdown-container"></div>
                    </td>
                    <td class="right aligned collapsing">
                        <div class="ui tiny basic icon buttons action-buttons">
                            <a class="ui button copy-route-button"
                               data-variation="basic"
                               data-content="{{ t._('bt_ToolTipCopyRoute') }}">
                                <i class="copy icon blue"></i>
                            </a>
                            <a class="ui button delete-route-button"
                               data-content="{{ t._('bt_ToolTipDelete') }}">
                                <i class="trash icon red"></i>
                            </a>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    <button type="button" class="ui labeled icon button" id="add-new-route">
        <i class="plus icon"></i>
        {{ t._("nw_AddNewRoute") }}
    </button>
</div>
