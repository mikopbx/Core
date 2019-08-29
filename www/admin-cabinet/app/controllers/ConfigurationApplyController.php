<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */


/**
 * ConfigurationApplyController
 *
 * Хранит историю применения изменений конфигурации.
 */
class ConfigurationApplyController extends BaseController
{


    /**
     * Сбрасывает параметры сессии после успешного применения параметров на
     * стороне PBX
     *
     * @param $appliedFunction
     */
    public function resetConfigurationChangedAction($appliedFunction): void
    {
        if ($this->session->has('configuration-has-changes')) {
            $arrActions                   = $this->session->get('configuration-has-changes');
            $arrActions[$appliedFunction] = false;
            $this->session->set('configuration-has-changes', $arrActions);
        }
        $this->view->success = true;
    }

    /**
     * Проверка на наличие непераданных в PBX изменений
     *
     */
    public function getNewConfigurationChangesAction(): void
    {
        $this->view->changed = false;
        if ($this->session->has('configuration-has-changes')) {
            $arrActions     = $this->session->get('configuration-has-changes');
            $arrNeedActions = [];
            foreach ($arrActions as $action => $state) {
                if ($state) {
                    $arrNeedActions[] = $action;
                }
            }
            if (count($arrNeedActions) > 0) {
                $this->view->changed = true;
                usort($arrNeedActions,
                    ['ConfigurationApplyController', 'sortActionsArray']);
                $this->view->actions = json_encode($arrNeedActions);
            }
        }
        $this->view->success = true;
    }

    /**
     * Сортировка массива действий
     * Перезагрузка сети и firewall должна быть всегда последней
     *
     * @return bool
     */
    private function sortActionsArray($a, $b): bool
    {
        if ($b === 'ReloadFirewall' && $a !== 'ReloadNetwork') {
            return false;
        }
        if ($b === 'ReloadNetwork') {
            return false;
        }

        return true;
    }
}
