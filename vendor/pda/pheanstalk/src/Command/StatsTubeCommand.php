<?php

namespace Pheanstalk\Command;

use Pheanstalk\Contract\ResponseParserInterface;
use Pheanstalk\YamlResponseParser;

/**
 * The 'stats-tube' command.
 * Gives statistical information about the specified tube if it exists.
 */
class StatsTubeCommand extends TubeCommand
{
    public function getCommandLine(): string
    {
        return sprintf('stats-tube %s', $this->tube);
    }

    public function getResponseParser(): ResponseParserInterface
    {
        return new YamlResponseParser(
            YamlResponseParser::MODE_DICT
        );
    }
}
