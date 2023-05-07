<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

use MikoPBX\AdminCabinet\Forms\PbxExtensionModuleSettingsForm;
use MikoPBX\AdminCabinet\Providers\SecurityPluginProvider;
use MikoPBX\Common\Models\{PbxExtensionModules, PbxSettings};
use Phalcon\Text;

class PbxExtensionModulesController extends BaseController
{
    /**
     * Builds installed modules list
     */
    public function indexAction(): void
    {
        $licKey = PbxSettings::getValueByKey('PBXLicense');
        if (strlen($licKey) !== 28
            || ! Text::startsWith($licKey, 'MIKO-')) {
            $licKey = '';
        }

        $modules     = PbxExtensionModules::getModulesArray();
        $modulesList = [];
        foreach ($modules as $module) {
            $unCamelizedControllerName = Text::uncamelize($module['uniqid'], '-');
            $modulesList[]             = [
                'uniqid'      => $module['uniqid'],
                'name'        => $module['name'],
                'description' => $module['description'],
                'developer'   => $module['developer'],
                'version'     => $module['version'],
                'classname'   => $unCamelizedControllerName,
                'status'      => ($module['disabled'] === '1') ? 'disabled' : '',
                'permanent'   => true,
            ];
        }
        $this->view->modulelist = $modulesList;
        $this->view->licenseKey = $licKey;
    }

    /**
     * Builds page for modify how to show the module in sidebar
     *
     * @param $uniqid string of module
     */
    public function modifyAction(string $uniqid): void
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
                'group'         => 'modules',
                'iconClass'     => 'puzzle piece',
                'caption'       => "Breadcrumb$uniqid",
                'showAtSidebar' => false,
            ];
            $previousMenuSettings->value = json_encode($value);
        }
        $options = [];
        if ($previousMenuSettings->value!==null){
            $options                = json_decode($previousMenuSettings->value, true);
        }
        $this->view->form       = new PbxExtensionModuleSettingsForm($previousMenuSettings, $options);
        $this->view->title      = $this->translation->_('ext_SettingsForModule') . ' ' . $this->translation->_(
                "Breadcrumb$uniqid"
            );
        $this->view->submitMode = null;
        $this->view->indexUrl   = $unCamelizedControllerName;
    }

    /**
     * Saves how to show the module in sidebar settings into PbxSettings
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

}