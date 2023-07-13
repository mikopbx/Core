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

use MikoPBX\Common\Models\{AsteriskManagerUsers,
    CallQueues,
    ConferenceRooms,
    CustomFiles,
    DialplanApplications,
    IvrMenu,
    NetworkFilters,
    OutWorkTimes,
    PbxExtensionModules,
    Providers,
    Users
};
use MikoPBX\AdminCabinet\Providers\SecurityPluginProvider;
use Modules\ModuleUsersUI\App\Controllers\UsersCredentialsController;
use Phalcon\Text;

class TopMenuSearchController extends BaseController
{
    /**
     * Makes top search menu over AJAX request
     *
     * @return void The parameters are placed in the view and processed through ControllerBase::afterExecuteRoute().
     */
    public function getForSelectAction(): void
    {
        $arrClasses = [
            Users::class,
            Providers::class,
            CallQueues::class,
            IvrMenu::class,
            PbxExtensionModules::class,
            ConferenceRooms::class,
            DialplanApplications::class,
            NetworkFilters::class,
            OutWorkTimes::class,
            AsteriskManagerUsers::class,
            CustomFiles::class,
        ];
        $results = [[]];
        foreach ($arrClasses as $itemClass) {
            $records = call_user_func([$itemClass, 'find']);
            $categoryItems = [];
            foreach ($records as $record) {
                if ($itemClass === Users::class && $record->id === '1') {
                    continue; // Admin
                }
                $this->addMenuItem($categoryItems, $record, $itemClass);
            }
            usort($categoryItems, [__CLASS__, 'sortItemsArray']);
            $results[] = $categoryItems;
        }

        $results = array_merge(...$results);
        $this->addOtherMenuItems($results);


        $this->view->success = true;
        $this->view->results = $results;
    }

    /**
     * Add items to menu
     *
     * @param $items
     * @param $record
     * @param $itemClass
     */
    private function addMenuItem(&$items, $record, $itemClass): void
    {
        $link = $record->getWebInterfaceLink();
        if ($link === '#') {
            return;
        }

        $category = explode('\\', $itemClass)[3];
        $type = Text::underscore(strtoupper($category));
        $represent = $record->getRepresent();

        $clearedRepresent = strip_tags($represent);
        $items[] = [
            'name' => $represent,
            'value' => $link,
            'type' => $type,
            'typeLocalized' => $this->translation->_("ex_dropdownCategory_{$type}"),
            'sorter' => $clearedRepresent,
        ];
    }

    /**
     * Add non object menu items
     *
     * @param $items
     */
    private function addOtherMenuItems(&$items): void
    {

        $additionalMenuItems = [
            IncomingRoutesController::class => 'index',
            OutboundRoutesController::class => 'index',
            GeneralSettingsController::class => 'modify',
            TimeSettingsController::class => 'modify',
            NetworkController::class => 'modify',
            MailSettingsController::class => 'modify',
            CallDetailRecordsController::class => 'index',
            SoundFilesController::class => 'index',
            PbxExtensionModulesController::class => 'index',
            SystemDiagnosticController::class => 'index',
            Fail2BanController::class => 'index',
            UpdateController::class => 'index',
        ];

        foreach ($additionalMenuItems as $controllerClass => $action) {
            $this->addAdditionalMenuItem($controllerClass, $action, $items);
        }

    }

    /**
     * Sorts an array of items based on the 'sorter' value in each item.
     *
     * @param $a
     * @param $b
     *
     * @return int
     */
    private function sortItemsArray($a, $b): int
    {
        return strcmp($a['sorter'], $b['sorter']);
    }


    /**
     * Add a menu item if it allowed to be added.
     * @param string $controllerClass The controller class name.
     * @param string $action The action name.
     * @param array $items The array of menu items.
     * @return void
     */
    private function addAdditionalMenuItem(string $controllerClass, string $action, array &$items): void
    {
        if ($this->di->get(SecurityPluginProvider::SERVICE_NAME, [$controllerClass, $action])) {
            $controllerParts = explode('\\', $controllerClass);
            $controllerName = end($controllerParts);
            // Remove the "Controller" suffix if present
            $controllerName = str_replace("Controller", "", $controllerName);
            $unCamelizedControllerName = Text::uncamelize($controllerName, '-');
            $translatedControllerName = $this->translation->_('mm_' . $controllerName);

            $items[] = [
                'name' => $this->elements->getIconByController($controllerClass) . ' ' . $translatedControllerName,
                'value' => $this->url->get($unCamelizedControllerName . '/' . $action),
                'type' => 'MENUITEMS',
                'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
                'sorter' => strip_tags($translatedControllerName),
            ];
        }
    }
}