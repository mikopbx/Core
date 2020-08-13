<?php
/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2020
 *
 */

namespace MikoPBX\Tests\AdminCabinet\Tests;


use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class ChangeCallQueueTest extends MikoPBXTestsBase
{
    /**
     * @depends      testLogin
     * @dataProvider additionProvider
     *
     * @param array $params ;
     */
    public function testChangeExtension($params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');
        $this->clickModifyButtonOnRowWithText($params['OldExtension']);
        $this->changeTextAreaValue('description', $params['description']);
        $this->changeInputField('name', $params['name']);

        // Удаляем старых агентов
        $xpath         = ('//a[contains(@class,"delete-row-button")]');
        $deleteButtons = self::$driver->findElements(WebDriverBy::xpath($xpath));
        foreach ($deleteButtons as $deleteButton) {
            $deleteButton->click();
            sleep(2);
        }

        // Добавляем агентов очереди
        foreach ($params['agents'] as $agent) {
            $this->selectDropdownItem('extensionselect', $agent);
        }

        $this->selectDropdownItem('strategy', $params['strategy']);

        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();

        // Заполняем поля из базы данных с исходными данными
        $this->changeInputField('extension', $params['extension']);
        $this->changeInputField('seconds_to_ring_each_member', $params['seconds_to_ring_each_member']);
        $this->changeInputField('seconds_for_wrapup', $params['seconds_for_wrapup']);
        $this->changeCheckBoxState('recive_calls_while_on_a_call', $params['recive_calls_while_on_a_call']);

        $this->selectDropdownItem('caller_hear', $params['caller_hear']);
        $this->changeCheckBoxState('announce_position', $params['announce_position']);
        $this->changeCheckBoxState('announce_hold_time', $params['announce_hold_time']);

        $this->selectDropdownItem('periodic_announce_sound_id', $params['periodic_announce_sound_id']);

        $this->changeInputField('periodic_announce_frequency', $params['periodic_announce_frequency']);
        $this->changeInputField('timeout_to_redirect_to_extension', $params['timeout_to_redirect_to_extension']);

        $this->selectDropdownItem('timeout_extension', $params['timeout_extension']);
        $this->selectDropdownItem('redirect_to_extension_if_empty', $params['redirect_to_extension_if_empty']);

        $this->submitForm('queue-form');
        $this->clickSidebarMenuItemByHref('/admin-cabinet/call-queues/index/');

        $this->clickModifyButtonOnRowWithText($params['name']);
        $this->assertInputFieldValueEqual('name', $params['name']);
        $this->assertInputFieldValueEqual('extension', $params['extension']);
        $this->assertTextAreaValueIsEqual('description', $params['description']);

        // Обойдем всех членов очереди, проверим что они есть
        foreach ($params['agents'] as $agent) {
            $xpath   = '//table[@id="extensionsTable"]//td[contains(text(), "' . $agent . '")]';
            $members = self::$driver->findElements(WebDriverBy::xpath($xpath));
            if (count($members) === 0) {
                $this->assertTrue(false, 'Not found agent ' . $agent . ' in queue agents list');
            }
        }
        $this->assertMenuItemSelected('strategy', $params['strategy']);

        // Раскрываем расширенные опции
        $this->openAccordionOnThePage();

        $this->assertInputFieldValueEqual('seconds_to_ring_each_member', $params['seconds_to_ring_each_member']);
        $this->assertInputFieldValueEqual('seconds_for_wrapup', $params['seconds_for_wrapup']);
        $this->assertCheckBoxStageIsEqual('recive_calls_while_on_a_call', $params['recive_calls_while_on_a_call']);

        $this->assertMenuItemSelected('caller_hear', $params['caller_hear']);
        $this->assertCheckBoxStageIsEqual('announce_position', $params['announce_position']);
        $this->assertCheckBoxStageIsEqual('announce_hold_time', $params['announce_hold_time']);

        $this->assertMenuItemSelected('periodic_announce_sound_id', $params['periodic_announce_sound_id']);

        $this->assertInputFieldValueEqual('periodic_announce_frequency', $params['periodic_announce_frequency']);
        $this->assertInputFieldValueEqual(
            'timeout_to_redirect_to_extension',
            $params['timeout_to_redirect_to_extension']
        );

        $this->assertMenuItemSelected('timeout_extension', $params['timeout_extension']);
        $this->assertMenuItemSelected('redirect_to_extension_if_empty', $params['redirect_to_extension_if_empty']);
    }

    /**
     * Dataset provider
     *
     * @return array
     */
    public function additionProvider(): array
    {
        $params   = [];
        $params[] = [
            [
                'description'                      => 'Sales department queue, the first line of agents2',
                'name'                             => 'Sales department2',
                'OldExtension'                        => 20020,
                'extension'                     => 20021,
                'seconds_to_ring_each_member'      => 15,
                'seconds_for_wrapup'               => 14,
                'recive_calls_while_on_a_call'     => false,
                'caller_hear'                      => 'moh',
                'announce_position'                => false,
                'announce_hold_time'               => true,
                'periodic_announce_sound_id'       => '1',
                'periodic_announce_frequency'      => 25,
                'timeout_to_redirect_to_extension' => 19,
                'timeout_extension'                => '202',
                'redirect_to_extension_if_empty'   => '201',
                'agents'                           => [
                    '202',
                    '203',
                ],
                'strategy'                         => 'random',
            ],
        ];

        return $params;
    }
}