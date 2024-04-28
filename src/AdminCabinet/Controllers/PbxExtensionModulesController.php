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

use MikoPBX\AdminCabinet\Forms\LicensingActivateCouponForm;
use MikoPBX\AdminCabinet\Forms\LicensingChangeLicenseKeyForm;
use MikoPBX\AdminCabinet\Forms\LicensingGetKeyForm;
use MikoPBX\AdminCabinet\Forms\PbxExtensionModuleSettingsForm;
use MikoPBX\Common\Providers\MarketPlaceProvider;
use MikoPBX\Common\Models\{PbxExtensionModules, PbxSettings, PbxSettingsConstants};
use MikoPBX\Modules\PbxExtensionState;
use Phalcon\Text;

class PbxExtensionModulesController extends BaseController
{
    /**
     * Builds installed modules list
     */
    public function indexAction(): void
    {

        // Installed modules tab //
        $modules = PbxExtensionModules::getModulesArray();
        $moduleList = [];
        foreach ($modules as $module) {
            $unCamelizedControllerName = Text::uncamelize($module['uniqid'], '-');
            $moduleRecord = [
                'uniqid' => $module['uniqid'],
                'name' => $module['name'],
                'description' => $module['description'],
                'developer' => $module['developer'],
                'version' => $module['version'],
                'classname' => $unCamelizedControllerName,
                'status' => '',
                'disableReason' => '',
                'disableReasonText' => '',
                'permanent' => true,
            ];

            if ($module['disabled'] === '1'){
                $moduleRecord['status'] = 'disabled';
                $moduleRecord['disableReason'] = $module['disableReason'];
                $moduleRecord['disableReasonText'] = $module['disableReasonText'];
                // Translate the license message
                if ($moduleRecord['disableReason'] === PbxExtensionState::DISABLED_BY_LICENSE
                    && isset($moduleRecord['disableReasonText'])) {
                    $lic = $this->di->getShared(MarketPlaceProvider::SERVICE_NAME);
                    $moduleRecord['disableReasonText'] = $lic->translateLicenseErrorMessage((string)$moduleRecord['disableReasonText']);
                }
            }
            $moduleList[] = $moduleRecord;
        }
        $this->view->modulelist = $moduleList;

        // License key management tab //
        $licKey = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_LICENSE);
        if (strlen($licKey) !== 28
            || !Text::startsWith($licKey, 'MIKO-')) {
            $licKey = '';
        }

        // License key form
        $this->view->setVar('changeLicenseKeyForm',
            new LicensingChangeLicenseKeyForm(null, ['licKey' => $licKey]));

        // Coupon form
        $this->view->setVar('activateCouponForm', new LicensingActivateCouponForm());

        // Get new license key form
        $this->view->setVar('getKeyForm', new LicensingGetKeyForm());

        $this->view->setVar('submitMode', null);

    }

    /**
     * Builds page for modify how to show the module in sidebar
     *
     * @param $uniqid string of module
     */
    public function modifyAction(string $uniqid): void
    {
        $menuSettings = "AdditionalMenuItem{$uniqid}";
        $unCamelizedControllerName = Text::uncamelize($uniqid, '-');
        $previousMenuSettings = PbxSettings::findFirstByKey($menuSettings);
        $this->view->showAtMainMenu = $previousMenuSettings !== false;
        if ($previousMenuSettings === null) {
            $previousMenuSettings = new PbxSettings();
            $previousMenuSettings->key = $menuSettings;
            $value = [
                'uniqid' => $uniqid,
                'href' => $this->url->get($unCamelizedControllerName),
                'group' => 'modules',
                'iconClass' => 'puzzle piece',
                'caption' => "Breadcrumb$uniqid",
                'showAtSidebar' => false,
            ];
            $previousMenuSettings->value = json_encode($value);
        }
        $options = [];
        if ($previousMenuSettings->value !== null) {
            $options = json_decode($previousMenuSettings->value, true);
        }
        $this->view->form = new PbxExtensionModuleSettingsForm($previousMenuSettings, $options);
        $this->view->title = $this->translation->_('ext_SettingsForModule') . ' ' . $this->translation->_(
                "Breadcrumb$uniqid"
            );
        $this->view->submitMode = null;
        $this->view->indexUrl = 'pbx-extension-modules/index/';
    }

    /**
     * Saves how to show the module in sidebar settings into PbxSettings
     */
    public function saveAction(): void
    {
        if (!$this->request->isPost()) {
            return;
        }
        $data = $this->request->getPost();

        $record = PbxSettings::findFirstByKey($data['key']);
        if ($record === null) {
            $record = new PbxSettings();
            $record->key = $data['key'];
        }
        $value = [
            'uniqid' => $data['uniqid'],
            'href' => $data['href'],
            'group' => $data['menu-group'],
            'iconClass' => $data['iconClass'],
            'caption' => $data['caption'],
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