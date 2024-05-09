<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\NetworkEditForm;
use MikoPBX\Common\Models\LanInterfaces;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Util;

class NetworkController extends BaseController
{

    /**
     * Lan cards settings form
     */
    public function modifyAction(): void
    {
        $networkInterfaces = LanInterfaces::find();
        foreach ($networkInterfaces as $record) {
            if ($record->disabled !== '1') {
                $arrEth[] = $record;
            }
        }

        $template = new LanInterfaces();
        $template->id = 0;
        $template->dhcp = '1';
        $template->vlanid = '4095';

        $arrEth[] = $template;

        $internetInterface = LanInterfaces::findFirstByInternet('1');
        if ($internetInterface === null) {
            $internetInterface = new LanInterfaces();
            $internetInterface->id = 1;
        }

        // We will find additional interfaces which we can delete
        $deletableInterfaces = [];
        $countInterfaces = LanInterfaces::count(['group' => 'interface']);
        foreach ($countInterfaces as $record) {
            if ($record->rowcount > 1) {
                $deletableInterfaces[] = $record->interface;
            }
        }
        $form = new NetworkEditForm($internetInterface, ['eths' => $arrEth]);

        $this->view->setVars(
            [
                'SIP_PORT' => PbxSettings::getValueByKey(PbxSettingsConstants::SIP_PORT),
                'EXTERNAL_SIP_PORT' => PbxSettings::getValueByKey(PbxSettingsConstants::EXTERNAL_SIP_PORT),
                'TLS_PORT' => PbxSettings::getValueByKey(PbxSettingsConstants::TLS_PORT),
                'EXTERNAL_TLS_PORT' => PbxSettings::getValueByKey(PbxSettingsConstants::EXTERNAL_TLS_PORT),
                'RTP_PORT_FROM' => PbxSettings::getValueByKey(PbxSettingsConstants::RTP_PORT_FROM),
                'RTP_PORT_TO' => PbxSettings::getValueByKey(PbxSettingsConstants::RTP_PORT_TO),
                'form' => $form,
                'eths' => $arrEth,
                'deletableEths' => $deletableInterfaces,
                'isDocker' => Util::isDocker(),
                'submitMode' => null,
            ]
        );
    }

    /**
     * Saves the lan cards settings
     */
    public function saveAction(): void
    {
        if (!$this->request->isPost()) {
            return;
        }

        $data = $this->request->getPost();
        $this->db->begin();


        list($result, $messages) = $this->saveLanInterfaces($data);
        if (!$result) {
            $this->flash->warning(implode('<br>', $messages));
            $this->view->success = false;
            $this->db->rollback();
            return;
        }

        list($result, $messages) = $this->saveNatSettings($data);
        if (!$result) {
            $this->flash->warning(implode('<br>', $messages));
            $this->view->success = false;
            $this->db->rollback();
            return;
        }

        $this->view->reload = 'network/modify';
        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();
    }

    /**
     * Saves the LAN interface configurations.
     *
     * This method iterates through each existing LAN interface, updates its configuration based on the provided data,
     * and saves the changes. If a new interface needs to be added (specified by 'interface_0'), it creates and saves this
     * new interface as well. If any save operation fails, the method returns an array containing `false` and the error messages.
     *
     * @param array $data Array containing the interface configurations.
     *                    Expected to contain interface settings such as IP, mask, etc., and a special key 'interface_0' for new interfaces.
     * @return array Returns an array with a boolean success flag and an array of error messages if applicable.
     */
    private function saveLanInterfaces(array $data): array
    {
        $networkInterfaces = LanInterfaces::find();

        // Update interface settings
        foreach ($networkInterfaces as $eth) {
            $this->fillEthStructure($eth, $data);
            if ($eth->save() === false) {
                $errors = $eth->getMessages();
                return [false, $errors];
            }
        }

        // Save additional interface settings if it exists
        if ($data['interface_0'] !== '') {
            $eth = new LanInterfaces();
            $eth->id = 0;
            $this->fillEthStructure($eth, $data);
            $eth->id = null;
            $eth->disabled = '0';
            if ($eth->create() === false) {
                $errors = $eth->getMessages();
                return [false, $errors];
            }
        }

        return [true, []];
    }

    /**
     * Fills network interface settings
     *
     * @param LanInterfaces $eth
     * @param array $data post data
     */
    private function fillEthStructure(LanInterfaces $eth, array $data): void
    {
        $isDocker = Util::isDocker();
        foreach ($eth as $name => $value) {
            $itIsInternetInterfce = $eth->id === $data['internet_interface'];
            switch ($name) {
                case 'topology':
                    if ($itIsInternetInterfce) {
                        $eth->$name = ($data['usenat'] === 'on') ? LanInterfaces::TOPOLOGY_PRIVATE : LanInterfaces::TOPOLOGY_PUBLIC;
                    } else {
                        $eth->$name = '';
                    }
                    break;
                case 'extipaddr':
                    if ($itIsInternetInterfce) {
                        if (array_key_exists($name, $data)) {
                            $eth->$name = ($data['usenat'] === 'on') ? $data[$name] : $data['ipaddr_' . $eth->id];
                        } else {
                            $eth->$name = $data['ipaddr_' . $eth->id];
                        }
                    } else {
                        $eth->$name = '';
                    }

                    break;
                case 'exthostname':
                    if ($itIsInternetInterfce) {
                        if (array_key_exists($name, $data)) {
                            $eth->$name = ($data['usenat'] === 'on') ? $data[$name] : $data['hostname'];
                        } else {
                            $eth->$name = $data['hostname'];
                        }
                    } else {
                        $eth->$name = '';
                    }
                    break;
                case 'dhcp':
                    if (array_key_exists($name . '_' . $eth->id, $data)) {
                        $eth->$name = ($data['dhcp_' . $eth->id]) === 'on' ? '1' : '0';
                    }
                    if ($isDocker) {
                        $eth->dhcp = '1';
                    }
                    break;
                case 'internet':
                    $eth->$name = $itIsInternetInterfce ? '1' : '0';
                    break;
                case 'ipaddr':
                case 'subnet':
                    $eth->$name = '';
                    if (array_key_exists($name . '_' . $eth->id, $data)) {
                        $eth->$name = ($data['dhcp_' . $eth->id]) === 'on' ? '' : $data[$name . '_' . $eth->id];
                    }
                    break;
                case 'interface':
                    if ($eth->id === 0) {
                        $eth->$name = LanInterfaces::findFirstById($data[$name . '_' . $eth->id])->interface;
                    }
                    break;
                case 'domain':
                case 'hostname':
                case 'gateway':
                case 'primarydns':
                case 'secondarydns':
                    if (array_key_exists($name, $data) && $itIsInternetInterfce) {
                        $eth->$name = $data[$name];
                    } else {
                        $eth->$name = '';
                    }
                    break;
                default:
                    if (array_key_exists($name . '_' . $eth->id, $data)) {
                        $eth->$name = $data[$name . '_' . $eth->id];
                    }
            }
        }
    }

    /**
     * Saves the NAT-related settings for external access.
     *
     * Iterates through a list of predefined setting keys related to NAT configuration (like external SIP and TLS ports),
     * and updates these settings with new values from the provided data. If a setting fails to save, the method returns
     * immediately with an error.
     *
     * @param array $data Associative array where keys are setting names and values are the new settings to be saved.
     * @return array Returns an array with a boolean success flag and, if unsuccessful, an array of error messages.
     */
    private function saveNatSettings(array $data): array
    {
        $messages = [];
        foreach ($data as $key => $value) {
            switch ($key) {
                case PbxSettingsConstants::AUTO_UPDATE_EXTERNAL_IP:
                    PbxSettings::setValue($key, $value === 'on' ? '1' : '0', $messages);
                    break;
                case PbxSettingsConstants::EXTERNAL_SIP_PORT:
                    if (empty($value)) {
                        $value = PbxSettings::getValueByKey(PbxSettingsConstants::SIP_PORT);
                    }
                    PbxSettings::setValue($key, trim($value), $messages);
                    break;
                case PbxSettingsConstants::EXTERNAL_TLS_PORT:
                    if (empty($value)) {
                        $value = PbxSettings::getValueByKey(PbxSettingsConstants::TLS_PORT);
                    }
                    PbxSettings::setValue($key, trim($value), $messages);
                    break;
                default:
            }
        }
        $result = count($messages) === 0;
        return [$result, ['error'=>$messages]];
    }

    /**
     * Delete a lan interface by ID
     *
     * @param string $ethId interface id
     */
    public function deleteAction(string $ethId = ''): void
    {
        $eth = LanInterfaces::findFirstById($ethId);
        if ($eth !== null && $eth->delete() === false) {
            $errors = $eth->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            $this->view->success = false;
            return;
        }
        $this->view->success = true;
    }
}
