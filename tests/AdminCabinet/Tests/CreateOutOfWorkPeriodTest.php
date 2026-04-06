<?php

namespace MikoPBX\Tests\AdminCabinet\Tests;

use MikoPBX\Tests\AdminCabinet\Lib\MikoPBXTestsBase;
use MikoPBX\Tests\AdminCabinet\Tests\Traits\OutOfWorkPeriodsTrait;

/**
 * Base class for Out of Work Periods creation tests
 */
abstract class CreateOutOfWorkPeriodTest extends MikoPBXTestsBase
{
    use OutOfWorkPeriodsTrait;
    private static bool $isTableCleared = false;

    protected function setUp(): void
    {
        parent::setUp();

        if (!self::$isTableCleared) {
            $this->clearOutOfWorkTable();
            self::$isTableCleared = true;
        }

        $this->setSessionName("Test: Create Out of Work Period");
    }

    /**
     * Clear out of work table
     */
    protected function clearOutOfWorkTable(): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/off-work-times/index/');
        $this->deleteAllRecordsOnTable('time-frames-table');
    }

    /**
     * Get period data
     */
    abstract protected function getPeriodData(): array;

    /**
     * Test creating out of work period
     */
    public function testCreateOutOfWorkPeriod(): void
    {
        $params = $this->getPeriodData();
        self::annotate("Creating Out of Work Period: {$params['description']}");

        try {
            $this->createPeriod($params);
            $this->verifyPeriod($params);
            self::annotate("Successfully created Out of Work Period", 'success');
        } catch (\Exception $e) {
            self::annotate("Failed to create Out of Work Period", 'error');
            throw $e;
        }
    }

    /**
     * Create period
     */
    protected function createPeriod(array $params): void
    {
        $this->clickSidebarMenuItemByHref('/admin-cabinet/off-work-times/index/');
        $this->clickButtonByHref('/admin-cabinet/off-work-times/modify');

        $this->changeTextAreaValue('description', $params['description']);

        $this->clearDates();
        $this->setDateValues($params['date_from'], $params['date_to']);

        $this->clearWeekdays();
        if ($params['weekday_from'] > 0) {
            $this->selectDropdownItem('weekday_from', $params['weekday_from']);
        }
        if ($params['weekday_to'] > 0) {
            $this->selectDropdownItem('weekday_to', $params['weekday_to']);
        }

        $this->clearTimePeriod();
        $this->setTimeValues($params['time_from'], $params['time_to']);

        $this->configureAction($params);
        $this->configureRestrictions($params);

        $this->submitForm('save-outoffwork-form');
    }

    /**
     * Verify period
     */
    protected function verifyPeriod(array $params): void
    {
        $id = $this->getCurrentRecordID();

        $this->clickSidebarMenuItemByHref('/admin-cabinet/off-work-times/index/');
        $this->clickModifyButtonOnRowWithID($id);

        $this->verifyPeriodSettings($params);
    }
}
