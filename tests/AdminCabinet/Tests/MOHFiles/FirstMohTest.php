<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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
 
namespace MikoPBX\Tests\AdminCabinet\Tests\MOHFiles;

use MikoPBX\Tests\AdminCabinet\Tests\CreateMOHAudioFileTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\MOHAudioFilesDataFactory;

/**
 * Test class for creating First Moh MOH audio file
 * 
 * Name: The first MOH audio record
 * File: 250Hz_44100Hz_16bit_05sec.wav
 * Description: 250Hz Test Tone
 */
class FirstMohTest extends CreateMOHAudioFileTest
{
    protected function getAudioFileData(): array
    {
        return MOHAudioFilesDataFactory::getAudioFileData('first.moh');
    }
    
    public function testCreateMOHFile(): void
    {
        parent::testCreateMOHFile();
    }
}