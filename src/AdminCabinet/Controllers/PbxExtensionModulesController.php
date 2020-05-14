<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 7 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\PbxExtensionModuleSettingsForm;
use MikoPBX\Common\Models\{FirewallRules, NetworkFilters, PbxExtensionModules, PbxSettings};
use Phalcon\Text;

class PbxExtensionModulesController extends BaseController
{

    /**
     * Построение списка модулей
     */
    public function indexAction(): void
    {
        $licKey = PbxSettings::getValueByKey('PBXLicense');
        if (strlen($licKey) !== 28
            || ! Text::startsWith($licKey, 'MIKO-')) {
            $this->forward('licensing/modify/pbx-extension-modules');
        }
        // Очистим кеш хранилища для получения актульной информации о свободном месте
        $this->session->remove('checkStorage');

        $modules     = PbxExtensionModules::find();
        $modulesList = [];
        foreach ($modules as $module) {
            $unCamelizedControllerName = Text::uncamelize($module->uniqid, '-');
            $modulesList[]             = [
                'uniqid'      => $module->uniqid,
                'name'        => $module->name,
                'description' => $module->description,
                'developer'   => $module->developer,
                'version'     => $module->version,
                'classname'   => $unCamelizedControllerName,
                'status'      => ($module->disabled === '1') ? 'disabled' : '',
                'permanent'   => true,
            ];
        }
        $this->view->modulelist = $modulesList;

        $licKey                 = PbxSettings::getValueByKey('PBXLicense');
        $this->view->licenseKey = $licKey;
    }

    /**
     * Страница с настройкой параметров модуля
     * @param $uniqid - string идентификатор модуля
     *
     */
    public function modifyAction($uniqid): void
    {
        $menuSettings               = "AdditionalMenuItem{$uniqid}";
        $unCamelizedControllerName  = Text::uncamelize($uniqid, '-');
        $previousMenuSettings       = PbxSettings::findFirstByKey($menuSettings);
        $this->view->showAtMainMenu = $previousMenuSettings !== false;
        if ($previousMenuSettings === null) {
            $previousMenuSettings        = new PbxSettings();
            $previousMenuSettings->key   = $menuSettings;
            $value                       = [
                'uniqid'        => $uniqid,
                'href'          => $this->url->get($unCamelizedControllerName),
                'group'         => '',
                'iconClass'     => 'puzzle piece',
                'caption'       => "Breadcrumb$uniqid",
                'showAtSidebar' => false,
            ];
            $previousMenuSettings->value = json_encode($value);
        }
        $options                = json_decode($previousMenuSettings->value, true);
        $this->view->form       = new PbxExtensionModuleSettingsForm($previousMenuSettings, $options);
        $this->view->title      = $this->translation->_('ext_SettingsForModule') . ' ' . $this->translation->_(
                "Breadcrumb$uniqid"
            );
        $this->view->submitMode = null;
        $this->view->indexUrl   = $unCamelizedControllerName;
    }

    /**
     * Сохранение настроек отображения модуля в боковом меню
     * сохраняет настройку отображения в PbxSettings
     */
    public function saveModuleSettingsAction(): void
    {
        if ( ! $this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();

        $record = PbxSettings::findFirstByKey($data['key']);
        if ($record === null) {
            $record      = new PbxSettings();
            $record->key = $data['key'];
        }
        $value         = [
            'uniqid'        => $data['uniqid'],
            'href'          => $data['href'],
            'group'         => $data['menu-group'],
            'iconClass'     => $data['iconClass'],
            'caption'       => $data['caption'],
            'showAtSidebar' => $data['show-at-sidebar'] === 'on',
        ];
        $record->value = json_encode($value);
        if ($record->save() === false) {
            $errors = $record->getMessages();
            $this->flash->error(implode('<br>', $errors));
            $this->view->success = false;

            return;
        }
        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
    }



    /**
     * Генерирует дополнительные пункты меню в интерфейс
     */
    public function sidebarIncludeAction(): void
    {
        $result  = [];
        $modules = PbxExtensionModules::find('disabled="0"');
        foreach ($modules as $module) {
            $menuSettings         = "AdditionalMenuItem{$module->uniqid}";
            $previousMenuSettings = PbxSettings::findFirstByKey($menuSettings);
            if ($previousMenuSettings !== null) {
                $result['items'][] = json_decode($previousMenuSettings->value, true);
            }
        }
        $this->view->message = $result;
        $this->view->success = true;
    }

}