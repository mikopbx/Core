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
    Users};
use Phalcon\Text;

class TopMenuSearchController extends BaseController
{
    /**
     * Используется для генерации списка выбора пользователей из JS скрипта extensions.js
     *
     * @return void параметры помещаются в view и обрабатваются через ControllerBase::afterExecuteRoute()
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
            // IncomingRoutingTable',
            // OutgoingRoutingTable',
        ];
        $results    = [[]];
        foreach ($arrClasses as $itemClass) {
            $records = call_user_func([$itemClass, 'find']);
            $categoryItems = [];
            foreach ($records as $record) {
                if ($itemClass === Users::class && $record->id === '1') {
                    continue; // Админ
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
        $category = explode('\\', $itemClass)[3];
        $type     = Text::underscore(strtoupper($category));

        $represent        = $record->getRepresent();
        $link             = $record->getWebInterfaceLink();
        $clearedRepresent = strip_tags($represent);
        $result           = [
            'name'          => $represent,
            'value'         => $link,
            'type'          => $type,
            'typeLocalized' => $this->translation->_("ex_dropdownCategory_{$type}"),
            'sorter'        => $clearedRepresent,
        ];
        $items[]          = $result;
    }

    /**
     * Add non object menu items
     *
     * @param $items
     */
    private function addOtherMenuItems(&$items): void
    {
        $elements = $this->elements;

        $items[] = [
            'name'          => $elements->getIconByController('incoming-routes') . ' ' . $this->translation->_(
                    'mm_IncomingRoutes'
                ),
            'value'         => $this->url->get('incoming-routes'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('mm_IncomingRoutes')),
        ];
        $items[] = [
            'name'          => $elements->getIconByController('outbound-routes') . ' ' . $this->translation->_(
                    'mm_OutboundRoutes'
                ),
            'value'         => $this->url->get('outbound-routes'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('mm_OutboundRoutes')),
        ];
        $items[] = [
            'name'          => $elements->getIconByController('general-settings') . ' ' . $this->translation->_(
                    'mm_GeneralSettings'
                ),
            'value'         => $this->url->get('general-settings/modify'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('mm_GeneralSettings')),
        ];
        $items[] = [
            'name'          => $elements->getIconByController('time-settings') . ' ' . $this->translation->_(
                    'mm_SystemClock'
                ),
            'value'         => $this->url->get('time-settings/modify'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('mm_SystemClock')),
        ];
        $items[] = [
            'name'          => $elements->getIconByController('network') . ' ' . $this->translation->_('mm_Network'),
            'value'         => $this->url->get('network/modify/'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('mm_Network')),
        ];
        $items[] = [
            'name'          => $elements->getIconByController('mail-settings') . ' ' . $this->translation->_(
                    'mm_MailSettings'
                ),
            'value'         => $this->url->get('mail-settings/modify'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('mm_MailSettings')),
        ];
        $items[] = [
            'name'          => $elements->getIconByController('call-detail-records') . ' ' . $this->translation->_(
                    'mm_CallDetailRecords'
                ),
            'value'         => $this->url->get('call-detail-records'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('mm_CallDetailRecords')),
        ];
        $items[] = [
            'name'          => $elements->getIconByController('sound-files') . ' ' . $this->translation->_(
                    'mm_SoundFiles'
                ),
            'value'         => $this->url->get('sound-files'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('mm_SoundFiles')),
        ];

        $items[] = [
            'name'          => $elements->getIconByController('licensing') . ' ' . $this->translation->_(
                    'mm_Licensing'
                ),
            'value'         => $this->url->get('licensing/modify/'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('mm_Licensing')),
        ];

        $items[] = [
            'name'          => $elements->getIconByController('pbx-extension-modules') . ' ' . $this->translation->_(
                    'BreadcrumbPbxExtensionModules'
                ),
            'value'         => $this->url->get('pbx-extension-modules'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('BreadcrumbPbxExtensionModules')),
        ];

        $items[] = [
            'name'          => $elements->getIconByController('system-diagnostic') . ' ' . $this->translation->_(
                    'mm_SystemDiagnostic'
                ),
            'value'         => $this->url->get('system-diagnostic'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('mm_SystemDiagnostic')),
        ];

        $items[] = [
            'name'          => $elements->getIconByController('fail2-ban') . ' ' . $this->translation->_(
                    'mm_BruteForceProtection'
                ),
            'value'         => $this->url->get('fail2-ban'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('mm_BruteForceProtection')),
        ];
        $items[] = [
            'name'          => $elements->getIconByController('update') . ' ' . $this->translation->_(
                    'mm_UpdateSystem'
                ),
            'value'         => $this->url->get('update'),
            'type'          => 'MENUITEMS',
            'typeLocalized' => $this->translation->_('ex_dropdownCategory_MENUITEMS'),
            'sorter'        => strip_tags($this->translation->_('mm_UpdateSystem')),
        ];
    }

    /**
     * Сортировка массива extensions
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
}