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
 
namespace MikoPBX\Tests\AdminCabinet\Tests\AudioFiles;

use MikoPBX\Tests\AdminCabinet\Tests\CreateAudioFileTest;
use MikoPBX\Tests\AdminCabinet\Tests\Data\AudioFilesDataFactory;

/**
 * Test class for creating First Audio audio file
 *
 * Name: The first audio record
 * File: 250Hz_44100Hz_16bit_05sec.wav
 * Description: 250Hz Test Tone
 * Purpose: Production File
 */
class FirstAudioTest extends CreateAudioFileTest
{
    protected function getAudioFileData(): array
    {
        return AudioFilesDataFactory::getAudioFileData('first.audio');
    }

    public function testCreateAudioFile(): void
    {
        parent::testCreateAudioFile();
    }
}
