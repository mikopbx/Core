<?php
namespace MikoPBX\Core\Workers\Libs\WorkerModelsEvents\Actions;
interface ReloadActionInterface {
    public function execute(array $parameters = []): void;
}