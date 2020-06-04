<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2020
 *
 */

namespace MikoPBX\Tests\AdminCabinet\Tests;

use Facebook\WebDriver\WebDriverBy;
use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;

class CreateOutOfWorkPeriodsTest extends MikoPBXTestsBase
{

    public static function setUpBeforeClass():void
    {
        parent::setUpBeforeClass();
        $basic= new MikoPBXTestsBase();
        $basic->deleteAllRecordsOnTable('time-frames-table');
    }

    /**
     * @depends testLogin
     * @dataProvider additionProvider
     *
     * @param array $params
     */
    public function testCreateOutOfWorkTimePeriod(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/out-off-work-time/index/');
        $this->clickButtonByHref('/admin-cabinet/out-off-work-time/modify');
        $this->changeTextAreaValue('description', $params['description']);

        $xpath        = '//div[@id="erase-dates"]';
        $addNewMenuItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $addNewMenuItem->click();

        if(! empty($params['date_from'])){
            self::$driver->executeScript('outOfWorkTimeRecord.$rangeDaysStart.calendar("set date","'.$params['date_from'].'")');
        }

        if(! empty($params['date_to'])){
            self::$driver->executeScript('outOfWorkTimeRecord.$rangeDaysEnd.calendar("set date","'.$params['date_to'].'")');
        }

        $xpath        = '//div[@id="erase-weekdays"]';
        $addNewMenuItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $addNewMenuItem->click();
        if($params['weekday_from']>0){
            $this->selectDropdownItem('weekday_from', $params['weekday_from']);
        }
        if($params['weekday_to']>0){
            $this->selectDropdownItem('weekday_to', $params['weekday_to']);
        }

        $xpath        = '//div[@id="erase-timeperiod"]';
        $addNewMenuItem = self::$driver->findElement(WebDriverBy::xpath($xpath));
        $addNewMenuItem->click();

        if(! empty($params['time_from'])){
            self::$driver->executeScript('$("#time_from").val("'.$params['time_from'].'")');
        }

        if(! empty($params['time_to'])){
            self::$driver->executeScript('$("#time_to").val("'.$params['time_to'].'")');
        }

        $this->selectDropdownItem('action', $params['action']);

        switch ($params['action']){
            case 'extension':
                $this->selectDropdownItem('extension', $params['extension']);
                break;
            case 'playmessage':
                $this->selectDropdownItem('audio_message_id', $params['audio_message_id']);
                break;
            default:

        }

        $this->submitForm('save-outoffwork-form');

        //Remember ID
        $id = $this->getCurrentRecordID();

        $this->clickSidebarMenuItemByHref('/admin-cabinet/out-off-work-time/index/');

        $this->clickModifyButtonOnRowWithID($id);

        // Asserts

        $this->assertTextAreaValueIsEqual('description', $params['description']);
        $this->assertInputFieldValueEqual('date_from', $params['date_from']);
        $this->assertInputFieldValueEqual('date_to', $params['date_to']);
        $this->assertMenuItemSelected('weekday_from', $params['weekday_from']);
        $this->assertMenuItemSelected('weekday_to', $params['weekday_to']);
        $this->assertInputFieldValueEqual('time_from', $params['time_from']);
        $this->assertInputFieldValueEqual('time_to', $params['time_to']);

        $this->assertMenuItemSelected('action', $params['action']);

        switch ($params['action']){
            case 'extension':
                $this->assertMenuItemSelected('extension', $params['extension']);
                break;
            case 'playmessage':
                $this->assertMenuItemSelected('audio_message_id', $params['audio_message_id']);
                break;
            default:
        }
    }

    /**
     * Dataset provider
     * @return array
     */
    public function additionProvider():array
    {
        $params=[];
        $params[] = [[
            'description' => 'New year holidays',
            'date_from'        => '1 January, 2020',
            'date_to'   => '5 January, 2020',
            'weekday_from'=>'-1',
            'weekday_to'=>'-1',
            'time_from'=> '',
            'time_to'=>'',
            'action'=> 'extension',
            'extension'=>'201',
            'audio_message_id'=>''
        ]];

        $params[] = [[
            'description' => 'First may holidays',
            'date_from'        => '1 May, 2020',
            'date_to'   => '3 May, 2020',
            'weekday_from'=>'-1',
            'weekday_to'=>'-1',
            'time_from'=> '',
            'time_to'=>'',
            'action'=> 'playmessage',
            'extension'=>'',
            'audio_message_id'=>'1'
        ]];

        $params[] = [[
            'description' => 'WeekEnd',
            'date_from'        => '',
            'date_to'   => '',
            'weekday_from'=>'6',
            'weekday_to'=>'7',
            'time_from'=> '',
            'time_to'=>'',
            'action'=> 'playmessage',
            'extension'=>'',
            'audio_message_id'=>'1'
        ]];

        $params[] = [[
            'description' => 'OutOfWork morning',
            'date_from'        => '',
            'date_to'   => '',
            'weekday_from'=>'1',
            'weekday_to'=>'5',
            'time_from'=> '0:00',
            'time_to'=>'9:00',
            'action'=> 'playmessage',
            'extension'=>'',
            'audio_message_id'=>'1'
        ]];

        $params[] = [[
            'description' => 'OutOfWork evening',
            'date_from'        => '',
            'date_to'   => '',
            'weekday_from'=>'1',
            'weekday_to'=>'5',
            'time_from'=> '19:00',
            'time_to'=>'23:59',
            'action'=> 'playmessage',
            'extension'=>'',
            'audio_message_id'=>'1'
        ]];

        return $params;
    }
}