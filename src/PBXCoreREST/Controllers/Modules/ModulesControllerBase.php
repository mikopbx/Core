<?php

namespace MikoPBX\PBXCoreREST\Controllers\Modules;

use MikoPBX\Common\Handlers\CriticalErrorsHandler;
use MikoPBX\Common\Providers\BeanstalkConnectionWorkerApiProvider;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Http\Response;
use MikoPBX\PBXCoreREST\Lib\PbxExtensionsProcessor;
use Pheanstalk\Contract\PheanstalkInterface;

/**
 * Base controller for handling module-related actions.
 *
 * @package MikoPBX\PBXCoreREST\Controllers\Modules
 *
 * @RoutePrefix("/pbxcore/api/modules/{moduleUniqueID}/{action}")
 *
 * @example
 * API for additional modules.
 * Module check:
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleSmartIVR/check
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleCTIClient/check
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleTelegramNotify/check
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleBitrix24Notify/check
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleBitrix24Integration/check
 *
 * Module restart with config regeneration:
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleSmartIVR/reload
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleCTIClient/reload
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleBitrix24Integration/reload
 *
 * Execution of actions without main authorization.
 * curl http://127.0.0.1/pbxcore/api/modules/ModuleAutoprovision/getcfg?mac=00135E874B49&solt=test
 * curl http://127.0.0.1/pbxcore/api/modules/ModuleAutoprovision/getimg?file=logo-yealink-132x32.dob
 *
 * curl http://84.201.142.45/pbxcore/api/modules/ModuleBitrix24Notify/customAction?portal=b24-uve4uz.bitrix24.ru
 * curl http://84.201.142.45/pbxcore/api/modules/ModuleBitrix24Notify/customAction?portal=miko24.ru
 * curl http://84.201.142.45/pbxcore/api/modules/ModuleBitrix24Notify/customAction
 *
 */
class ModulesControllerBase extends BaseController
{
    /**
     * Handles the call action for a specific module.
     *
     * @param string $moduleName The name of the module.
     * @param string $actionName The name of the action.
     * @return void
     */
    public function callActionForModule(string $moduleName, string $actionName): void
    {
        $maxTimeout = max(10, $this->request->getRequestTimeout());
        $priority = max(PheanstalkInterface::DEFAULT_PRIORITY, $this->request->getRequestPriority());
        // Old style modules, we can remove it after 2025
        $_REQUEST['ip_srv'] = $_SERVER['SERVER_ADDR'];

        $payload = file_get_contents('php://input');
        list($debug, $requestMessage) = $this->prepareRequestMessage(
            PbxExtensionsProcessor::class,
            $payload,
            $actionName,
            $moduleName
        );

        try {
            $message = json_encode($requestMessage, JSON_THROW_ON_ERROR);
            /** @var BeanstalkConnectionWorkerApiProvider $beanstalkQueue */
            $beanstalkQueue = $this->di->getShared(BeanstalkConnectionWorkerApiProvider::SERVICE_NAME);
            if ($debug) {
                $maxTimeout = 9999;
            }
            $response = $beanstalkQueue->request($message, $maxTimeout, $priority);

            if ($response !== false) {
                $response = json_decode($response, true);
                $this->handleResponse($response);
            } else {
                $this->sendError(Response::INTERNAL_SERVER_ERROR);
            }
        } catch (\Throwable $e) {
            CriticalErrorsHandler::handleExceptionWithSyslog($e);
            $this->sendError(Response::BAD_REQUEST, $e->getMessage());
        }
    }

    /**
     * Prepare a request message for sending to a backend worker.
     *
     * @param string $processor
     * @param mixed $payload
     * @param string $actionName
     * @param string $moduleName
     * @return array
     */
    public function prepareRequestMessage(
        string $processor,
        mixed $payload,
        string $actionName,
        string $moduleName
    ): array {

        $requestMessage = [
            'data' => $_REQUEST,
            'module' => $moduleName,
            'input' => $payload,
            'action' => $actionName,
            'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'],
            'processor' => $processor,
            'async' => false,
            'asyncChannelId' => ''
        ];

        if ($this->request->isAsyncRequest()) {
            $requestMessage['async'] = true;
            $requestMessage['asyncChannelId'] = $this->request->getAsyncRequestChannelId();
        }

        $requestMessage['debug'] = $this->request->isDebugRequest();
        return [$requestMessage['debug'], $requestMessage];
    }

    /**
     * Handles the response from the backend worker.
     *
     * @param array $response
     * @return void
     */
    private function handleResponse(array $response): void
    {
        if (isset($response['data']['fpassthru'])) {
            $this->handleFilePassThrough($response['data']);
        } elseif (isset($response['html'])) {
            echo $response['html'];
            $this->response->sendRaw();
        } elseif (isset($response['redirect'])) {
            $this->response->redirect($response['redirect'], true);
            $this->response->sendRaw();
        } elseif (isset($response['echo'], $response['headers'])) {
            foreach ($response['headers'] as $name => $value) {
                $this->response->setHeader($name, $value);
            }
            $this->response->setPayloadSuccess($response['echo']);
        } elseif (isset($response['echo_file'])) {
            $this->response->setStatusCode(Response::OK, 'OK')->sendHeaders();
            $this->response->setFileToSend($response['echo_file']);
            $this->response->sendRaw();
        } else {
            $this->response->setPayloadSuccess($response);
        }
    }

    /**
     * Handles file pass-through responses.
     *
     * @param array $data
     * @return void
     */
    private function handleFilePassThrough(array $data): void
    {
        $filename = $data['filename'] ?? '';
        $fp = fopen($filename, "rb");
        if ($fp !== false) {
            $size = filesize($filename);
            $name = basename($filename);
            $this->response->setHeader('Content-Description', "config file");
            $this->response->setHeader('Content-Disposition', "attachment; filename=$name");
            $this->response->setHeader('Content-Type', "text/plain");
            $this->response->setHeader('Content-Transfer-Encoding', "binary");
            $this->response->setContentLength($size);
            $this->response->sendHeaders();
            fpassthru($fp);
            fclose($fp);
        }
        if (!empty($data['need_delete'])) {
            unlink($filename);
        }
    }
}
