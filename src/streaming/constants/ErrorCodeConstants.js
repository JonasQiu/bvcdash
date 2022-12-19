/**
 * Constants declaration
 * @class
 * @ignore
 */
class ErrorCode {

    init () {

        // Download Error
        this.DOWNLOAD_ERROR                        = 4;
        this.DOWNLOAD_MPD_ERROR                    = 4001; // MPD 下载错误
        this.DOWNLOAD_XINK_ERROR                   = 4002; // XINK 下载错误
        this.DOWNLOAD_INIT_SEGMENT_ERROR           = 4003; // INIT SEGMENT 下载错误
        this.DOWNLOAD_MEDIA_SEGMENT_ERROR          = 4004; // MEDIA SEGMENT 下载错误
        this.DOWNLOAD_INDEX_SEGMENT_ERROR          = 4005; // INDEX SEGMENT 下载错误
        this.DOWNLOAD_SWITCHING_SEGMENT_ERROR      = 4006; // SWITCHING SEGMENT 下载错误
        this.DOWNLOAD_OTHER_ERROR                  = 4007; // OTHER 下载错误

        this.DOWNLOAD_FRAGMENT_ERROR               = 4101; // 下载的fragment返回错误
        this.DOWNLOAD_FRAGMENT_ERROR_RETRY_SUCCESS = 4102; // 下载的fragment返回错误后重试成功
        this.DOWNLOAD_FRAGMENT_ERROR_RETRY_FAILURE = 4103; // 下载的fragment返回错误后重试失败
        this.DOWNLOAD_FRAGMENT_ERROR_RANGE         = 4104; // 下载的fragment返回成功，但Range较大 (> 30M)
        this.DOWNLOAD_FRAGMENT_ERROR_TIMEOUT       = 4105; // 下载的fragment超时
        this.CONNECT_FRAGMENT_ERROR_TIMEOUT        = 4106; // 下载的fragment建联超时
        this.CONNECT_NC_FRAGMENT_ERROR_TIMEOUT     = 4107; // 下载的 nc fragment 建联超时

        // Manifest Error
        this.MANIFEST_ERROR                        = 5;    // MPD 错误
        this.MANIFEST_TYPE_ERROR                   = 5001; // MPD 格式错误
        this.MANIFEST_RESOLVE_ERROR                = 5002; // MPD 解析错误

        // Media Error
        this.MEDIA_ERROR                           = 6;    // 媒体错误
        this.MEDIA_ABORTED_ERROR                   = 6001; // 媒体中断错误
        this.MEDIA_NETWORK_ERROR                   = 6002; // 媒体网络错误
        this.MEDIA_DECODE_ERROR                    = 6003; // 媒体解码错误
        this.MEDIA_SUPPORTED_ERROR                 = 6004; // 媒体格式支持错误
        this.MEDIA_ENCRYPTED_ERROR                 = 6005; // 媒体加密错误（未使用到？）
        this.MEDIA_UNKNOWN_ERROR                   = 6000; // 媒体未知错误
    }

    constructor () {
        this.init();
    }
}

let errorCode = new ErrorCode();
export default errorCode;
