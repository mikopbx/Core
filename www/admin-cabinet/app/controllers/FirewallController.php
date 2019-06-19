<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

use Models\FirewallRules;
use Models\NetworkFilters;
use Models\LanInterfaces;
use Models\PbxSettings;

class FirewallController extends BaseController {


	/**
	 * Построение таблицы доступа к ресурсам системы
	 */
	public function indexAction() {
		$calculator        = new Cidr;
		$localAddresses[]  = '0.0.0.0/0';
		$conditions        = "disabled=0 AND internet=0"; // Нам нужны только локальные включенные сети
		$networkinterfaces = LanInterfaces::find($conditions);
		foreach ($networkinterfaces as $interface) {
			if (empty($interface->ipaddr)) {
				continue;
			}

			if (strpos($interface->subnet, '.') == FALSE) {
				$localAddresses[] = $calculator->cidr2network($interface->ipaddr, $interface->subnet) . '/' . $interface->subnet;
			} else {
				$cidr             = $calculator->netmask2cidr($interface->subnet);
				$localAddresses[] = $calculator->cidr2network($interface->ipaddr, $cidr) . '/' . $cidr;
			}
		}

		$defaultRules   = FirewallRules::getDefaultRules();
		$networksTable  = [];
		$networkFilters = NetworkFilters::find();
		$networkFiltersStoredInDB = ($networkFilters->count()>0);
		foreach ($networkFilters as $filter) {
			$networksTable[ $filter->id ]['id']          = $filter->id;
			$networksTable[ $filter->id ]['description'] = $filter->description;

			$permitParts = explode('/', $filter->permit);

			if (strpos($permitParts[1], '.') == FALSE) {
				$networksTable[ $filter->id ]['network'] = $calculator->cidr2network($permitParts[0], $permitParts[1]) . '/' . $permitParts[1];
			} else {
				$cidr                                    = $calculator->netmask2cidr($permitParts[1]);
				$networksTable[ $filter->id ]['network'] = $calculator->cidr2network($permitParts[0], $cidr) . '/' . $cidr;
			}
			$networksTable[ $filter->id ]['permanent'] = FALSE;


			// Заполним значениями по умолчанию
			foreach ($defaultRules as $key => $value) {
				$networksTable[ $filter->id ]['category'][ $key ] = ['name' => $key, 'action' => $value['action']];
			}

			// Заполним сохраненными ранее значениями
			$firewallRules = $filter->FirewallRules;
			foreach ($firewallRules as $rule) {
				$networksTable[ $filter->id ]['category'][ $rule->category ] =
					[
						'name'   => $rule->category,
						'action' => $rule->action,
					];
			}
		}

		// Добавиим фильтры по умолчанию, если они еще не добавлены.
		foreach ($localAddresses as $localAddress) {
			$existsPersistentRecord = FALSE;
			foreach ($networksTable as $key => $value) {
				if ($value['network'] == $localAddress) {
					$networksTable[ $key ]['permanent'] = TRUE;
					$existsPersistentRecord             = TRUE;
					break;
				}
			}
			if ( ! $existsPersistentRecord) {
				foreach ($defaultRules as $key => $value) {
					$networksTableNewRecord['category'][ $key ] = [
						'name' => $key,
						'action' => $networkFiltersStoredInDB?'block' : $value['action']
					];
				}
				$networksTableNewRecord['id']        = '';
				$networksTableNewRecord['permanent'] = TRUE;
				$networksTableNewRecord['network']   = $localAddress;
				switch ($localAddress) {
					case '0.0.0.0/0':
						$networksTableNewRecord['description'] = $this->translation->_('fw_AllNetworksRule');
						break;
					default:
						$networksTableNewRecord['description'] = $this->translation->_('fw_LocalNetworksRule');

				}
				$networksTable[] = $networksTableNewRecord;
			}
		}

		usort($networksTable, ["FirewallController", "sortArrayByNetwork"]);

		$this->view->rulesTable = $networksTable;
		$this->view->PBXFirewallEnabled
								= PbxSettings::getValueByKey('PBXFirewallEnabled');

	}


	/**
	 * Форма редактирования карточки сетевого фильтра
	 *
	 * @param null $networkId
	 */
	public function modifyAction($networkId = NULL) {
		$networkFilter = NetworkFilters::findFirstById($networkId);
		$firewallRules = FirewallRules::getDefaultRules();
		$data         = $this->request->getPost();
		if ( ! $networkFilter) {
			$networkFilter         = new NetworkFilters();
			$networkFilter->permit = empty($data['permit'])?'0.0.0.0/0':$data['permit'];
		} else {
			// Заполним сохраненными ранее значениями
			foreach ($networkFilter->FirewallRules as $rule) {
				$firewallRules[ $rule->category ]['action'] = $rule->action;
			}
		}
		$permitParts = explode('/', $networkFilter->permit);

		$this->view->form          = new FirewallEditForm($networkFilter, ['network' => $permitParts[0], 'subnet' => $permitParts[1]]);
		$this->view->firewallRules = $firewallRules;
		$this->view->represent     = $networkFilter->getRepresent();
	}


	/**
	 * Проверка на доступность номера
	 */
	public function saveAction() {
		if ( ! $this->request->isPost()) return;

		$this->db->begin();

		$data         = $this->request->getPost();
		$networkId = $this->request->getPost('id');
		$filterRecord = NetworkFilters::findFirstById($networkId);
		if ($filterRecord == FALSE) {
			$filterRecord = new NetworkFilters();
		}

		// Заполним параметры записи Network Filter
		if ( ! $this->updateNetworkFilters($filterRecord, $data)) {
			$this->view->success = FALSE;
			$this->db->rollback();

			return;
		}

		// Заполним параметры Firewall
		$data['id'] = $filterRecord->id;
		if ( ! $this->updateFirewallRules($data)) {
			$this->view->success = FALSE;
			$this->db->rollback();

			return;
		}

		$this->flash->success($this->translation->_('ms_SuccessfulSaved'));
		$this->view->success = FALSE;
		$this->db->commit();
	}


	/**
	 * Удаление правил настройки firewall
	 *
	 * @param null $networkId
	 */
	public function deleteAction($networkId = NULL) {
		$this->db->begin();
		$filterRecord = NetworkFilters::findFirstById($networkId);

		$errors = FALSE;
		if ($filterRecord && ! $filterRecord->delete())
			$errors = $filterRecord->getMessages();

		if ($errors) {
			$this->flash->warning(implode('<br>', $errors));
			$this->db->rollback();
		} else {
			$this->db->commit();
		}

		return $this->forward('firewall/index');
	}


	/**
	 * Метод сортировки, локальная сеть и 0 сеть всегда сверху списка должны быть
	 *
	 * @param $a
	 * @param $b
	 *
	 * @return bool
	 */
	private function sortArrayByNetwork($a, $b) {
		if ($b["permanent"] and $a["network"] != '0.0.0.0/0') return TRUE;
		if ($b["network"] == '0.0.0.0/0') return TRUE;
	}


	/**
	 * Обновление параметров внутреннего номера
	 *
	 * @param \Models\NetworkFilters $filterRecord
	 * @param array                  $data массив полей из POST запроса
	 *
	 * @return bool update result
	 */
	private function updateNetworkFilters(NetworkFilters $filterRecord, array $data) {
		$calculator        = new Cidr;
		// Заполним параметры записи Network Filter
		foreach ($filterRecord as $name => $value) {
			switch ($name) {
				case "permit":
					$filterRecord->$name = $calculator->cidr2network($data['network'], $data['subnet']) . '/' . $data['subnet'];
					break;
				case "deny":
					$filterRecord->$name = '0.0.0.0/0';
					break;
				case "local_network":
				case "newer_block_ip":
					if (array_key_exists($name, $data) && $data[ $name ] == "on")
						$filterRecord->$name = 1;
					else
						$filterRecord->$name = 0;
					break;
				default:
					if ( ! array_key_exists($name, $data)) continue;
					$filterRecord->$name = $data[ $name ];
			}
		}

		if ($filterRecord->save() === FALSE) {
			$errors = $filterRecord->getMessages();
			$this->flash->error(implode('<br>', $errors));

			return FALSE;
		}

		return TRUE;

	}


	/**
	 * Обновление параметров внутреннего номера
	 *
	 * @param array $data массив полей из POST запроса
	 *
	 * @return bool update result
	 */
	private function updateFirewallRules(array $data) {
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
			if ($firewallRules->current()->delete() === FALSE) {
				$errors = $firewallRules->getMessages();
				$this->flash->error(implode('<br>', $errors));
				$this->view->success = FALSE;

				return FALSE;
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

				if (array_key_exists('rule_' . $key, $data) && $data[ 'rule_' . $key ]) {
					$newRule->action = $data[ 'rule_' . $key ] == "on" ? 'allow' : 'block';
				} else {
					$newRule->action = 'block';
				}
				$newRule->description = "{$newRule->action} connection from network: {$data['network']} / {$data['subnet']}";

				if ($newRule->save() === FALSE) {
					$errors = $newRule->getMessages();
					$this->flash->error(implode('<br>', $errors));
					$this->view->success = FALSE;

					return FALSE;
				}
				$rowId++;
			}

		}

		return TRUE;

	}

	/**
	 * Включение firewall
	 */
	public function enableAction() {
		$fail2BanEnabled = PbxSettings::findFirstByKey('PBXFail2BanEnabled');
		if ( ! $fail2BanEnabled) {
			$fail2BanEnabled      = new PbxSettings();
			$fail2BanEnabled->key = 'PBXFail2BanEnabled';
		}
		$fail2BanEnabled->value = "1";
		if ($fail2BanEnabled->save() === FALSE) {
			$errors = $fail2BanEnabled->getMessages();
			$this->flash->warning(implode('<br>', $errors));
			$this->view->success = FALSE;

			return;
		}

		$firewallEnabled = PbxSettings::findFirstByKey('PBXFirewallEnabled');
		if ( ! $firewallEnabled) {
			$firewallEnabled      = new PbxSettings();
			$firewallEnabled->key = 'PBXFail2BanEnabled';
		}
		$firewallEnabled->value = "1";
		if ($firewallEnabled->save() === FALSE) {
			$errors = $firewallEnabled->getMessages();
			$this->flash->warning(implode('<br>', $errors));
			$this->view->success = FALSE;

			return;
		}
		$this->view->success = TRUE;
	}

	/**
	 * Выключение firewall
	 */
	public function disableAction() {
		$fail2BanEnabled = PbxSettings::findFirstByKey('PBXFail2BanEnabled');
		if ( ! $fail2BanEnabled) {
			$fail2BanEnabled      = new PbxSettings();
			$fail2BanEnabled->key = 'PBXFail2BanEnabled';
		}
		$fail2BanEnabled->value = "0";
		if ($fail2BanEnabled->save() === FALSE) {
			$errors = $fail2BanEnabled->getMessages();
			$this->flash->warning(implode('<br>', $errors));
			$this->view->success = FALSE;

			return;
		}

		$firewallEnabled = PbxSettings::findFirstByKey('PBXFirewallEnabled');
		if ( ! $firewallEnabled) {
			$firewallEnabled      = new PbxSettings();
			$firewallEnabled->key = 'PBXFail2BanEnabled';
		}
		$firewallEnabled->value = "0";
		if ($firewallEnabled->save() === FALSE) {
			$errors = $firewallEnabled->getMessages();
			$this->flash->warning(implode('<br>', $errors));
			$this->view->success = FALSE;

			return;
		}
		$this->view->success = TRUE;
	}
}