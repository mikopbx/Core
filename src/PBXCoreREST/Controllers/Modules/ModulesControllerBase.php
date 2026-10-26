<?php

namespace MikoPBX\PBXCoreREST\Controllers\Modules;

use MikoPBX\Core\System\Directories;
use MikoPBX\PBXCoreREST\Controllers\BaseController;
use MikoPBX\PBXCoreREST\Lib\PbxExtensionsProcessor;
use Pheanstalk\Contract\PheanstalkPublisherInterface;

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
        $priority = max(PheanstalkPublisherInterface::DEFAULT_PRIORITY, $this->request->getRequestPriority());
        // Old style modules, we can remove it after 2025
        $payload =$this->request->getData();
        $payload['ip_srv'] = $_SERVER['SERVER_ADDR'];

        $this->sendRequestToBackendWorker(PbxExtensionsProcessor::class, $actionName, $payload, $moduleName, $maxTimeout, $priority);

        $response = json_decode($this->response->getContent(), true);
        $this->handleResponse($response, $moduleName);
    }

    /**
     * Handles the response from the backend worker.
     *
     * @param mixed $response The response content decoded as an associative array.
     * @param string $moduleName The module that answered, its own directory may be streamed.
     * @return void
     */
    private function handleResponse(mixed $response, string $moduleName = ''): void
    {
        // BaseController may have answered already: a core-format file is streamed with the
        // content left empty, a raw body may not be a JSON object. Nothing to route then (#1167).
        if (!is_array($response)) {
            return;
        }
        if (isset($response['data']['fpassthru'])) {
            $this->handleFilePassThrough($response['data'], $moduleName);
        } else {
            // Rebuild the payload without the assoc flag: nested empty objects ({}) and objects with
            // numeric keys must not be re-encoded as JSON arrays (#1162). The HTTP status stays the
            // one BaseController::sendRequestToBackendWorker() already set (422/409/503 for a failed
            // result, 200 otherwise); setPayloadSuccess() would reset it to 200 (#1166).
            $this->response->setPayloadSuccess(
                (array) json_decode($this->response->getContent()),
                $this->response->getStatusCode() ?? 200
            );
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
     * Both are flat: the keys sit on `data` next to the `fpassthru => true` flag, so BaseController
     * leaves them on the normal payload path. The core format (`'fpassthru' => ['filename' => ...]`,
     * used by ModuleAutoprovision since 2026-05) never reaches this method: BaseController streams
     * it itself (handleFileStreaming()).
     *
     * Only files under the temp directories or the module's own directory are streamed or
     * deleted (#1264); anything else, or a file that cannot be opened, answers 404 without the path.
     *
     * @param array $data Response data from module
     * @param string $moduleName The module that answered
     * @return void
     */
    private function handleFilePassThrough(array $data, string $moduleName = ''): void
    {
        // WHY: Resolve symlinks and "..", then check the real path against the allowed directories
        $filename = self::resolveAllowedFile((string)($data['filename'] ?? ''), $moduleName);
        $fp = $filename !== null ? @fopen($filename, 'rb') : false;
        if ($fp === false) {
            $this->response->setPayloadError('File not found', 404);
            return;
        }
        // WHY: Get file size for Content-Length header
        $size = filesize($filename);

        // WHY BACKWARD COMPATIBLE: Use download_name if provided, fallback to basename()
        // Old modules don't set download_name
        // New modules can specify custom filename
        $name = $data['download_name'] ?? basename($filename);

        // WHY BACKWARD COMPATIBLE: Use content_type if provided, fallback to text/plain
        // Old modules don't set content_type
        // New modules can specify proper MIME type (application/x-gzip, application/zip, etc.)
        $contentType = $data['content_type'] ?? 'text/plain';

        // WHY: Set standard download headers
        $this->response->setHeader('Content-Description', "config file");
        $safeName = self::sanitizeContentDispositionName($name);
        $this->response->setHeader('Content-Disposition', "attachment; filename=\"$safeName\"");
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

        // WHY: Clean up temporary files after sending
        if (!empty($data['need_delete'])) {
            unlink($filename);
        }
    }

    /**
     * Returns the real path of a module-supplied file if it lies under an allowed directory.
     *
     * @param string $filename Path returned by the module
     * @param string $moduleName The module that answered
     * @return string|null Real path, or null when the file is missing or outside the allowed directories
     */
    private static function resolveAllowedFile(string $filename, string $moduleName): ?string
    {
        $realPath = $filename !== '' ? realpath($filename) : false;
        if ($realPath === false || !is_file($realPath)) {
            return null;
        }
        $allowedDirs = [
            Directories::getDir(Directories::CORE_TEMP_DIR),
            Directories::getDir(Directories::WWW_DOWNLOAD_CACHE_DIR),
            sys_get_temp_dir(),
        ];
        if ($moduleName !== '' && basename($moduleName) === $moduleName) {
            $allowedDirs[] = Directories::getDir(Directories::CORE_MODULES_DIR) . '/' . $moduleName;
        }
        foreach ($allowedDirs as $dir) {
            $realDir = realpath($dir);
            if ($realDir !== false && str_starts_with($realPath, rtrim($realDir, '/') . '/')) {
                return $realPath;
            }
        }
        return null;
    }
}
