<?php

namespace MikoPBX\PBXCoreREST\Controllers\Modules;

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
        $payload =$this->request->getData();
        $payload['ip_srv'] = $_SERVER['SERVER_ADDR'];

        $this->sendRequestToBackendWorker(PbxExtensionsProcessor::class, $actionName, $payload, $moduleName, $maxTimeout, $priority);

        $response = json_decode($this->response->getContent(), true);
        $this->handleResponse($response);
        
        // list($debug, $requestMessage) = $this->prepareRequestMessage(
        //     PbxExtensionsProcessor::class,
        //     $payload,
        //     $actionName,
        //     $moduleName
        // );

        // try {
        //     $message = json_encode($requestMessage, JSON_THROW_ON_ERROR);
        //     /** @var BeanstalkConnectionWorkerApiProvider $beanstalkQueue */
        //     $beanstalkQueue = $this->di->getShared(BeanstalkConnectionWorkerApiProvider::SERVICE_NAME);
        //     if ($debug) {
        //         $maxTimeout = 9999;
        //     }
        //     $response = $beanstalkQueue->request($message, $maxTimeout, $priority);

        //     if ($response !== false) {
        //         $response = json_decode($response, true);
        //         $this->handleResponse($response);
        //     } else {
        //         $this->sendError(Response::INTERNAL_SERVER_ERROR);
        //     }
        // } catch (\Throwable $e) {
        //     CriticalErrorsHandler::handleExceptionWithSyslog($e);
        //     $this->sendError(Response::BAD_REQUEST, $e->getMessage());
        // }
    }

    // /**
    //  * Prepare a request message for sending to a backend worker.
    //  *
    //  * @param string $processor
    //  * @param mixed $payload
    //  * @param string $actionName
    //  * @param string $moduleName
    //  * @return array
    //  */
    // public function prepareRequestMessage(
    //     string $processor,
    //     mixed $payload,
    //     string $actionName,
    //     string $moduleName
    // ): array {

    //     $requestMessage = [
    //         'data' => $_REQUEST,
    //         'module' => $moduleName,
    //         'input' => $payload,
    //         'action' => $actionName,
    //         'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD'],
    //         'processor' => $processor,
    //         'async' => false,
    //         'asyncChannelId' => ''
    //     ];

    //     if ($this->request->isAsyncRequest()) {
    //         $requestMessage['async'] = true;
    //         $requestMessage['asyncChannelId'] = $this->request->getAsyncRequestChannelId();
    //     }

    //     $requestMessage['debug'] = $this->request->isDebugRequest();
    //     return [$requestMessage['debug'], $requestMessage];
    // }

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
     * Handles file pass-through responses from modules.
     *
     * WHY: Modules can return files without streaming through PHP memory.
     * This method streams files directly to client using fpassthru().
     *
     * BACKWARD COMPATIBLE FORMAT (since 2017):
     * [
     *     'filename' => '/path/to/file.txt',  // Required: server path
     *     'fpassthru' => true,                 // Required: enable streaming
     *     'need_delete' => true,               // Optional: delete after send
     * ]
     *
     * EXTENDED FORMAT (since 2025):
     * [
     *     'filename' => '/tmp/backup.tar.gz',         // Required: server path
     *     'fpassthru' => true,                        // Required: enable streaming
     *     'download_name' => 'backup.tar.gz',         // Optional: client filename (fallback: basename)
     *     'content_type' => 'application/x-gzip',     // Optional: MIME type (fallback: text/plain)
     *     'need_delete' => true,                      // Optional: delete after send
     *     'additional_headers' => [                   // Optional: custom headers
     *         'X-Generated-By' => 'ModuleName',
     *         'Cache-Control' => 'no-cache',
     *     ],
     * ]
     *
     * MODULES USING OLD FORMAT (still supported):
     * - ModuleAutoprovision (since 2017)
     * - All legacy modules (before 2025)
     *
     * MODULES USING NEW FORMAT:
     * - ModuleExampleRestAPIv2 (reference implementation)
     *
     * @param array $data Response data from module
     * @return void
     */
    private function handleFilePassThrough(array $data): void
    {
        // WHY: Extract server file path
        $filename = $data['filename'] ?? '';

        // WHY: Open file for binary reading
        $fp = fopen($filename, "rb");
        if ($fp !== false) {
            // WHY: Get file size for Content-Length header
            $size = filesize($filename);

            // WHY BACKWARD COMPATIBLE: Use download_name if provided, fallback to basename()
            // Old modules (ModuleAutoprovision) don't set download_name
            // New modules (ModuleExampleRestAPIv2) can specify custom filename
            $name = $data['download_name'] ?? basename($filename);

            // WHY BACKWARD COMPATIBLE: Use content_type if provided, fallback to text/plain
            // Old modules don't set content_type
            // New modules can specify proper MIME type (application/x-gzip, application/zip, etc.)
            $contentType = $data['content_type'] ?? 'text/plain';

            // WHY: Set standard download headers
            $this->response->setHeader('Content-Description', "config file");
            $this->response->setHeader('Content-Disposition', "attachment; filename=$name");
            $this->response->setHeader('Content-Type', $contentType);
            $this->response->setHeader('Content-Transfer-Encoding', "binary");
            $this->response->setContentLength($size);

            // WHY BACKWARD COMPATIBLE: Apply additional headers if provided
            // Old modules don't use additional_headers
            // New modules can add custom headers (X-Generated-By, Cache-Control, etc.)
            if (!empty($data['additional_headers']) && is_array($data['additional_headers'])) {
                foreach ($data['additional_headers'] as $headerName => $headerValue) {
                    $this->response->setHeader($headerName, $headerValue);
                }
            }

            // WHY: Send headers before streaming
            $this->response->sendHeaders();

            // WHY: Stream file directly to output (memory efficient)
            fpassthru($fp);
            fclose($fp);
        }

        // WHY: Clean up temporary files after sending
        if (!empty($data['need_delete'])) {
            unlink($filename);
        }
    }
}
