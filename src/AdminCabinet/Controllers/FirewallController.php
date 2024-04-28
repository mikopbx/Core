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

use MikoPBX\AdminCabinet\Forms\FirewallEditForm;
use MikoPBX\AdminCabinet\Library\Cidr;
use MikoPBX\Common\Models\{FirewallRules, LanInterfaces, NetworkFilters, PbxSettings, PbxSettingsConstants};

class FirewallController extends BaseController
{

    /**
     * Prepares index page
     */
    public function indexAction(): void
    {
        $calculator        = new Cidr();
        $localAddresses    = [];
        $localAddresses[]  = '0.0.0.0/0';
        $conditions        = 'disabled=0 AND internet=0'; // We need only local networks here
        $networkInterfaces = LanInterfaces::find($conditions);
        foreach ($networkInterfaces as $interface) {
            if (empty($interface->ipaddr)) {
                continue;
            }

            if (strpos($interface->subnet, '.') === false) {
                $localAddresses[] = $calculator->cidr2network(
                        $interface->ipaddr,
                        $interface->subnet
                    ) . '/' . $interface->subnet;
            } else {
                $cidr             = $calculator->netmask2cidr($interface->subnet);
                $localAddresses[] = $calculator->cidr2network($interface->ipaddr, $cidr) . '/' . $cidr;
            }
        }

        $defaultRules             = FirewallRules::getDefaultRules();
        $networksTable            = [];
        $networkFilters           = NetworkFilters::find();
        $networkFiltersStoredInDB = ($networkFilters->count() > 0);
        foreach ($networkFilters as $filter) {
            $networksTable[$filter->id]['id']          = $filter->id;
            $networksTable[$filter->id]['description'] = $filter->description;

            $permitParts = explode('/', $filter->permit);

            if (strpos($permitParts[1], '.') === false) {
                $networksTable[$filter->id]['network'] = $calculator->cidr2network(
                        $permitParts[0],
                        $permitParts[1]
                    ) . '/' . $permitParts[1];
            } else {
                $cidr                                  = $calculator->netmask2cidr($permitParts[1]);
                $networksTable[$filter->id]['network'] = $calculator->cidr2network(
                        $permitParts[0],
                        $cidr
                    ) . '/' . $cidr;
            }
            $networksTable[$filter->id]['permanent'] = false;


            // Fill the default walues
            foreach ($defaultRules as $key => $value) {
                $networksTable[$filter->id]['category'][$key] = [
                    'name'   => empty($value['shortName']) ? $key : $value['shortName'],
                    'action' => $value['action'],
                ];
            }

            // Fill previous saved values
            $firewallRules = $filter->FirewallRules;
            foreach ($firewallRules as $rule) {
                $networksTable[$filter->id]['category'][$rule->category]['action'] = $rule->action;
                if ( ! array_key_exists('name', $networksTable[$filter->id]['category'][$rule->category])) {
                    $networksTable[$filter->id]['category'][$rule->category]['name'] = $rule->category;
                }
            }
        }

        // Add default filters
        foreach ($localAddresses as $localAddress) {
            $existsPersistentRecord = false;
            foreach ($networksTable as $key => $value) {
                if ($value['network'] === $localAddress) {
                    $networksTable[$key]['permanent'] = true;
                    $existsPersistentRecord           = true;
                    break;
                }
            }
            if ( ! $existsPersistentRecord) {
                foreach ($defaultRules as $key => $value) {
                    $networksTableNewRecord['category'][$key] = [
                        'name'   => $key,
                        'action' => $networkFiltersStoredInDB ? 'block' : $value['action'],
                    ];
                }
                $networksTableNewRecord['id']        = '';
                $networksTableNewRecord['permanent'] = true;
                $networksTableNewRecord['network']   = $localAddress;
                if ($localAddress === '0.0.0.0/0') {
                    $networksTableNewRecord['description'] = $this->translation->_('fw_AllNetworksRule');
                } else {
                    $networksTableNewRecord['description'] = $this->translation->_('fw_LocalNetworksRule');
                }
                $networksTable[] = $networksTableNewRecord;
            }
        }

        usort($networksTable, [__CLASS__, 'sortArrayByNetwork']);

        $this->view->rulesTable         = $networksTable;
        $this->view->PBXFirewallEnabled = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_FIREWALL_ENABLED);
    }


    /**
     * Prepares forms to edit firewall rules
     *
     * @param string $networkId
     */
    public function modifyAction(string $networkId = ''): void
    {
        $networkFilter = NetworkFilters::findFirstById($networkId);
        $firewallRules = FirewallRules::getDefaultRules();
        $data          = $this->request->getPost();
        if ($networkFilter === null) {
            $networkFilter         = new NetworkFilters();
            $networkFilter->permit = empty($data['permit']) ? '0.0.0.0/0' : $data['permit'];
        } else {
            // Fill previous saved values
            foreach ($networkFilter->FirewallRules as $rule) {
                $firewallRules[$rule->category]['action'] = $rule->action;
            }
        }
        $permitParts = explode('/', $networkFilter->permit ?? '0.0.0.0/0');

        $this->view->form          = new FirewallEditForm(
            $networkFilter,
            ['network' => $permitParts[0], 'subnet' => $permitParts[1]]
        );
        $this->view->firewallRules = $firewallRules;
        $this->view->represent     = $networkFilter->getRepresent();
    }


    /**
     * Save request from the form
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }

        $this->db->begin();
        $data      = $this->request->getPost();
        $networkId = $this->request->getPost('id');
        // Update network filters Network Filter
        $filterRecordId = $this->updateNetworkFilters($networkId, $data);
        if (empty($filterRecordId)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // If it was new entity we will reload page with new ID
        if (empty($data['id'])) {
            $this->view->reload = "firewall/modify/{$filterRecordId}";
        }

        // Update firewall rules Firewall
        $data['id'] = $filterRecordId;
        if ( ! $this->updateFirewallRules($data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();
    }

    /**
     * Fills Network Filter record
     *
     * @param string $networkId
     * @param array  $data POST parameters array
     *
     * @return string update result
     */
    private function updateNetworkFilters(string $networkId, array $data): string
    {
        $filterRecord = NetworkFilters::findFirstById($networkId);
        if ($filterRecord === null) {
            $filterRecord = new NetworkFilters();
        }

        $calculator = new Cidr();
        // Fills Network Filter record
        foreach ($filterRecord as $name => $value) {
            switch ($name) {
                case 'permit':
                    $filterRecord->$name = $calculator->cidr2network(
                            $data['network'],
                            $data['subnet']
                        ) . '/' . $data['subnet'];
                    break;
                case 'deny':
                    $filterRecord->$name = '0.0.0.0/0';
                    break;
                case 'local_network':
                case 'newer_block_ip':
                    if (array_key_exists($name, $data) && $data[$name] === 'on') {
                        $filterRecord->$name = 1;
                    } else {
                        $filterRecord->$name = 0;
                    }
                    break;
                default:
                    if (array_key_exists($name, $data)) {
                        $filterRecord->$name = $data[$name];
                    }
            }
        }

        if ($filterRecord->save() === false) {
            $errors = $filterRecord->getMessages();
            $this->flash->error(implode('<br>', $errors));

            return '';
        }

        return $filterRecord->toArray()['id'];
    }

    /**
     * Updates firewall rules
     *
     * @param array $data POST parameters array
     *
     * @return bool update result
     */
    private function updateFirewallRules(array $data): bool
    {
        // Get default rules
        $defaultRules      = FirewallRules::getDefaultRules();
        $countDefaultRules = 0;
        foreach ($defaultRules as $key => $value) {
            foreach ($value['rules'] as $rule) {
                $countDefaultRules++;
            }
        }

        // Delete outdated records
        $parameters        = [
            'conditions' => 'networkfilterid=:networkfilterid:',
            'bind'       => [
                'networkfilterid' => $data['id'],
            ],
        ];
        $firewallRules     = FirewallRules::find($parameters);
        $currentRulesCount = $firewallRules->count();

        $needUpdateFirewallRules = false;
        while ($countDefaultRules < $currentRulesCount) {
            $firewallRules->next();
            if ($firewallRules->current()->delete() === false) {
                $errors = $firewallRules->getMessages();
                $this->flash->error(implode('<br>', $errors));
                $this->view->success = false;

                return false;
            }
            $currentRulesCount--;
            $needUpdateFirewallRules = true;
        }

        if ($needUpdateFirewallRules) {
            $firewallRules = FirewallRules::find($parameters);
        }
        $rowId = 0;
        foreach ($defaultRules as $key => $value) {
            foreach ($value['rules'] as $rule) {
                if ($firewallRules->offsetExists($rowId)) {
                    $newRule = $firewallRules->offsetGet($rowId);
                } else {
                    $newRule = new FirewallRules();
                }
                $newRule->networkfilterid = $data['id'];
                $newRule->protocol        = $rule['protocol'];
                $newRule->portfrom        = $rule['portfrom'];
                $newRule->portto          = $rule['portto'];
                $newRule->category        = $key;
                $newRule->portFromKey     = $rule['portFromKey'];
                $newRule->portToKey       = $rule['portToKey'];

                if (array_key_exists('rule_' . $key, $data) && $data['rule_' . $key]) {
                    $newRule->action = $data['rule_' . $key] === 'on' ? 'allow' : 'block';
                } else {
                    $newRule->action = 'block';
                }
                $newRule->description = "{$newRule->action} connection from network: {$data['network']} / {$data['subnet']}";

                if ($newRule->save() === false) {
                    $errors = $newRule->getMessages();
                    $this->flash->error(implode('<br>', $errors));
                    $this->view->success = false;

                    return false;
                }
                $rowId++;
            }
        }

        return true;
    }

    /**
     * Deletes NetworkFilters record
     *
     * @param string $networkId
     */
    public function deleteAction(string $networkId = '')
    {
        $this->db->begin();
        $filterRecord = NetworkFilters::findFirstById($networkId);

        $errors = null;
        if ($filterRecord !== null && ! $filterRecord->delete()) {
            $errors = $filterRecord->getMessages();
        }

        if ($errors) {
            $this->flash->warning(implode('<br>', $errors));
            $this->db->rollback();
        } else {
            $this->db->commit();
        }

        $this->forward('firewall/index');
    }

    /**
     * Enables Fail2Ban and Firewall
     */
    public function enableAction(): void
    {
        $fail2BanEnabled = PbxSettings::findFirstByKey(PbxSettingsConstants::PBX_FAIL2BAN_ENABLED);
        if ($fail2BanEnabled === null) {
            $fail2BanEnabled      = new PbxSettings();
            $fail2BanEnabled->key = PbxSettingsConstants::PBX_FAIL2BAN_ENABLED;
        }
        $fail2BanEnabled->value = '1';
        if ($fail2BanEnabled->save() === false) {
            $errors = $fail2BanEnabled->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            $this->view->success = false;

            return;
        }

        $firewallEnabled = PbxSettings::findFirstByKey(PbxSettingsConstants::PBX_FIREWALL_ENABLED);
        if ($firewallEnabled === null) {
            $firewallEnabled      = new PbxSettings();
            $firewallEnabled->key = PbxSettingsConstants::PBX_FAIL2BAN_ENABLED;
        }
        $firewallEnabled->value = '1';
        if ($firewallEnabled->save() === false) {
            $errors = $firewallEnabled->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            $this->view->success = false;

            return;
        }
        $this->view->success = true;
    }

    /**
     * Disables Fail2Ban and Firewall
     */
    public function disableAction(): void
    {
        $fail2BanEnabled = PbxSettings::findFirstByKey(PbxSettingsConstants::PBX_FAIL2BAN_ENABLED);
        if ($fail2BanEnabled === null) {
            $fail2BanEnabled      = new PbxSettings();
            $fail2BanEnabled->key = PbxSettingsConstants::PBX_FAIL2BAN_ENABLED;
        }
        $fail2BanEnabled->value = '0';
        if ($fail2BanEnabled->save() === false) {
            $errors = $fail2BanEnabled->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            $this->view->success = false;

            return;
        }

        $firewallEnabled = PbxSettings::findFirstByKey(PbxSettingsConstants::PBX_FIREWALL_ENABLED);
        if ($firewallEnabled === null) {
            $firewallEnabled      = new PbxSettings();
            $firewallEnabled->key = PbxSettingsConstants::PBX_FAIL2BAN_ENABLED;
        }
        $firewallEnabled->value = '0';
        if ($firewallEnabled->save() === false) {
            $errors = $firewallEnabled->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            $this->view->success = false;

            return;
        }
        $this->view->success = true;
    }

    /**
     * Sort array. The localnet and 0.0.0.0 should be at the first position on the list
     *
     * @param $a
     * @param $b
     *
     * @return bool
     */
    private function sortArrayByNetwork($a, $b): bool
    {
        if ($b['permanent'] && $a['network'] !== '0.0.0.0/0') {
            return true;
        }
        if ($b['network'] === '0.0.0.0/0') {
            return true;
        }

        return false;
    }
}