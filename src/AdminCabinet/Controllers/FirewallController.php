<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\FirewallEditForm;
use MikoPBX\AdminCabinet\Library\Cidr;
use MikoPBX\Common\Models\{FirewallRules, LanInterfaces, NetworkFilters, PbxSettings};

class FirewallController extends BaseController
{


    /**
     * Построение таблицы доступа к ресурсам системы
     */
    public function indexAction(): void
    {
        $calculator        = new Cidr();
        $localAddresses[]  = '0.0.0.0/0';
        $conditions        = 'disabled=0 AND internet=0'; // Нам нужны только локальные включенные сети
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


            // Заполним значениями по умолчанию
            foreach ($defaultRules as $key => $value) {
                $networksTable[$filter->id]['category'][$key] = [
                    'name'   => empty($value['shortName']) ? $key : $value['shortName'],
                    'action' => $value['action'],
                ];
            }

            // Заполним сохраненными ранее значениями
            $firewallRules = $filter->FirewallRules;
            foreach ($firewallRules as $rule) {
                $networksTable[$filter->id]['category'][$rule->category]['action'] = $rule->action;
                if ( ! array_key_exists('name', $networksTable[$filter->id]['category'][$rule->category])) {
                    $networksTable[$filter->id]['category'][$rule->category]['name'] = $rule->category;
                }
            }
        }

        // Добавиим фильтры по умолчанию, если они еще не добавлены.
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
        $this->view->PBXFirewallEnabled = PbxSettings::getValueByKey('PBXFirewallEnabled');
    }


    /**
     * Форма редактирования карточки сетевого фильтра
     *
     * @param null $networkId
     */
    public function modifyAction($networkId = null): void
    {
        $networkFilter = NetworkFilters::findFirstById($networkId);
        $firewallRules = FirewallRules::getDefaultRules();
        $data          = $this->request->getPost();
        if ($networkFilter === null) {
            $networkFilter         = new NetworkFilters();
            $networkFilter->permit = empty($data['permit']) ? '0.0.0.0/0' : $data['permit'];
        } else {
            // Заполним сохраненными ранее значениями
            foreach ($networkFilter->FirewallRules as $rule) {
                $firewallRules[$rule->category]['action'] = $rule->action;
            }
        }
        $permitParts = explode('/', $networkFilter->permit);

        $this->view->form          = new FirewallEditForm(
            $networkFilter,
            ['network' => $permitParts[0], 'subnet' => $permitParts[1]]
        );
        $this->view->firewallRules = $firewallRules;
        $this->view->represent     = $networkFilter->getRepresent();
    }


    /**
     * Проверка на доступность номера
     */
    public function saveAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }

        $this->db->begin();

        $data         = $this->request->getPost();
        $networkId    = $this->request->getPost('id');
        $filterRecord = NetworkFilters::findFirstById($networkId);
        if ($filterRecord === null) {
            $filterRecord = new NetworkFilters();
        }

        // Заполним параметры записи Network Filter
        if ( ! $this->updateNetworkFilters($filterRecord, $data)) {
            $this->view->success = false;
            $this->db->rollback();

            return;
        }

        // If it was new entity we will reload page with new ID
        if (empty($data['id'])) {
            $this->view->reload = "firewall/modify/{$filterRecord->id}";
        }

        // Заполним параметры Firewall
        $data['id'] = $filterRecord->id;
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
     * Заполним параметры записи Network Filter
     *
     * @param \MikoPBX\Common\Models\NetworkFilters $filterRecord
     * @param array                                 $data массив полей из POST запроса
     *
     * @return bool update result
     */
    private function updateNetworkFilters(NetworkFilters $filterRecord, array $data): bool
    {
        $calculator = new Cidr();
        // Заполним параметры записи Network Filter
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

            return false;
        }

        return true;
    }

    /**
     * Обновление параметров firewall
     *
     * @param array $data массив полей из POST запроса
     *
     * @return bool update result
     */
    private function updateFirewallRules(array $data): bool
    {
        // Получим правила по умолчанию
        $defaultRules      = FirewallRules::getDefaultRules();
        $countDefaultRules = 0;
        foreach ($defaultRules as $key => $value) {
            foreach ($value['rules'] as $rule) {
                $countDefaultRules++;
            }
        }


        // Удалим все предыдущие правила
        $parameters        = [
            'conditions' => 'networkfilterid=:networkfilterid:',
            'bind'       => [
                'networkfilterid' => $data['id'],
            ],
        ];
        $firewallRules     = FirewallRules::find($parameters);
        $currentRulesCount = $firewallRules->count();
        while ($countDefaultRules < $currentRulesCount) {
            $firewallRules->next();
            if ($firewallRules->current()->delete() === false) {
                $errors = $firewallRules->getMessages();
                $this->flash->error(implode('<br>', $errors));
                $this->view->success = false;

                return false;
            } else {
                $currentRulesCount--;
            }
        }
        $firewallRules = FirewallRules::find($parameters);
        $rowId         = 0;
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
     * Удаление правил настройки firewall
     *
     * @param null $networkId
     */
    public function deleteAction($networkId = null)
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
     * Включение firewall
     */
    public function enableAction(): void
    {
        $fail2BanEnabled = PbxSettings::findFirstByKey('PBXFail2BanEnabled');
        if ($fail2BanEnabled === null) {
            $fail2BanEnabled      = new PbxSettings();
            $fail2BanEnabled->key = 'PBXFail2BanEnabled';
        }
        $fail2BanEnabled->value = '1';
        if ($fail2BanEnabled->save() === false) {
            $errors = $fail2BanEnabled->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            $this->view->success = false;

            return;
        }

        $firewallEnabled = PbxSettings::findFirstByKey('PBXFirewallEnabled');
        if ($firewallEnabled === null) {
            $firewallEnabled      = new PbxSettings();
            $firewallEnabled->key = 'PBXFail2BanEnabled';
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
     * Выключение firewall
     */
    public function disableAction(): void
    {
        $fail2BanEnabled = PbxSettings::findFirstByKey('PBXFail2BanEnabled');
        if ($fail2BanEnabled === null) {
            $fail2BanEnabled      = new PbxSettings();
            $fail2BanEnabled->key = 'PBXFail2BanEnabled';
        }
        $fail2BanEnabled->value = '0';
        if ($fail2BanEnabled->save() === false) {
            $errors = $fail2BanEnabled->getMessages();
            $this->flash->warning(implode('<br>', $errors));
            $this->view->success = false;

            return;
        }

        $firewallEnabled = PbxSettings::findFirstByKey('PBXFirewallEnabled');
        if ($firewallEnabled === null) {
            $firewallEnabled      = new PbxSettings();
            $firewallEnabled->key = 'PBXFail2BanEnabled';
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
     * Метод сортировки, локальная сеть и 0 сеть всегда сверху списка должны быть
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