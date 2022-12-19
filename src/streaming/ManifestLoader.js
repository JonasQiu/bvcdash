/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
import Constants from './constants/Constants';
import DashConstants from '../dash/constants/DashConstants';
import XlinkController from './controllers/XlinkController';
import URLLoader from './net/URLLoader';
import URLUtils from './utils/URLUtils';
import TextRequest from './vo/TextRequest';
import DashJSError from './vo/DashJSError';
import {HTTPRequest} from './vo/metrics/HTTPRequest';
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import Errors from '../core/errors/Errors';
import FactoryMaker from '../core/FactoryMaker';
import DashParser from '../dash/parser/DashParser';
import ErrorCodeConstants from './constants/ErrorCodeConstants';
import DashBilibiliParser from './utils/parser/DashBilibiliParser';

const MANIFEST_LOADER_ERROR_PARSING_FAILURE = 1;

function ManifestLoader(config) {

    config = config || {};
    const context = this.context;
    const debug = config.debug;
    // const settings = config.settings;
    const eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();

    let instance,
        logger,
        urlLoader,
        xlinkController,
        parser;

    let mssHandler = config.mssHandler;
    let errHandler = config.errHandler;

    function setup() {
        logger = debug.getLogger(instance);
        eventBus.on(Events.XLINK_READY, onXlinkReady, instance);

        urlLoader = URLLoader(context).create({
            errHandler: config.errHandler,
            dashMetrics: config.dashMetrics,
            mediaPlayerModel: config.mediaPlayerModel,
            requestModifier: config.requestModifier,
            urlUtils: urlUtils,
            constants: Constants,
            dashConstants: DashConstants,
            errors: Errors
        });

        xlinkController = XlinkController(context).create({
            errHandler: errHandler,
            dashMetrics: config.dashMetrics,
            mediaPlayerModel: config.mediaPlayerModel,
            requestModifier: config.requestModifier,
            settings: config.settings
        });

        parser = null;
    }

    function onXlinkReady(event) {
        eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, { manifest: event.manifest });
    }

    function createParser(data) {
        let parser = null;
        // Analyze manifest content to detect protocol and select appropriate parser
        if (data.video || data.audio) {
            return DashBilibiliParser(context).create();
        } else if (data.indexOf('SmoothStreamingMedia') > -1) {
            //do some business to transform it into a Dash Manifest
            if (mssHandler) {
                parser = mssHandler.createMssParser();
                mssHandler.registerEvents();
            }
            return parser;
        } else if (data.indexOf('MPD') > -1 || data.indexOf('Patch') > -1) {
            return DashParser(context).create({debug: debug});
        } else {
            return parser;
        }
    }

    function load(url) {
        if (url && typeof url === 'string' && (url.indexOf('http') === 0 || url.indexOf('/') === 0)) {
            const request = new TextRequest(url, HTTPRequest.MPD_TYPE);

            urlLoader.load({
                request: request,
                success: function (data, textStatus, responseURL) {
                    onLoaded(url, data, textStatus, responseURL);
                },
                error: function (request, statusText, errorText) {
                    eventBus.trigger(Events.INTERNAL_MANIFEST_LOADED, {
                        manifest: null,
                        error: new DashJSError(
                            Errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE,
                            Errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_MESSAGE + `${url}, ${errorText}`
                        )
                    });
                }
            });
        } else {
            // 传入的是已请求好的MPD XML String
            onLoaded('', url, 'OK', '');
        }
    }

    function onLoaded(url, data, textStatus, responseURL) {
        if (!xlinkController) return;

        let actualUrl,
            baseUri,
            manifest;

        // // 设置强制执行使用 HTTPS 流
        // if (window.location && window.location && window.location.protocol === 'https:') {
        //     enforceSSLStream = true;
        // }

        if (responseURL && responseURL !== url) {
            baseUri = urlUtils.parseBaseUrl(responseURL);
            actualUrl = responseURL;
        } else {
            if (urlUtils.isRelative(url)) {
                url = urlUtils.resolve(url, window.location.href);
            }

            baseUri = urlUtils.parseBaseUrl(url);
        }

        if (parser === null) {
            parser = createParser(data);
        }
        if (parser === null) {
            eventBus.trigger(
                Events.INTERNAL_MANIFEST_LOADED, {
                    manifest: null,
                    error: new DashJSError(
                        MANIFEST_LOADER_ERROR_PARSING_FAILURE,
                        `Failed detecting manifest type or manifest type unsupported : ${responseURL ? url : 'MPD String'}`,
                        null,
                        ErrorCodeConstants.MANIFEST_TYPE_ERROR
                    )
                }
            );
            return;
        }

        // init xlinkcontroller with matchers and iron object from created parser
        xlinkController.setMatchers(parser.getMatchers());
        xlinkController.setIron(parser.getIron());

        try {
            if (data.video || data.audio) {
                manifest = parser.parse(data, true);
            } else {
                manifest = parser.parse(data, false);
            }
        } catch (e) {
            eventBus.trigger(
                Events.INTERNAL_MANIFEST_LOADED, {
                    manifest: null,
                    error: new DashJSError(
                        MANIFEST_LOADER_ERROR_PARSING_FAILURE,
                        `Failed parsing manifest : ${responseURL ? url : 'MPD String'}`,
                        null,
                        ErrorCodeConstants.MANIFEST_RESOLVE_ERROR
                    )
                }
            );
            return;
        }

        if (manifest) {
            manifest.url = actualUrl || url;

            if (!manifest.originalUrl) {
                manifest.originalUrl = manifest.url;
            }

            if (manifest.hasOwnProperty(Constants.LOCATION)) {
                baseUri = urlUtils.parseBaseUrl(manifest.Location_asArray[0]);
                logger('BaseURI set by Location to: ' + baseUri);
            }
            
            if (data.video || data.audio) {
                manifest.baseUri = replaceSSLStreamURL(baseUri, true);
            } else {
                manifest.baseUri = replaceSSLStreamURL(baseUri, false);
            }
            manifest.loadedTime = new Date();

            xlinkController.resolveManifestOnLoad(manifest);
            // eventBus.trigger(Events.ORIGINAL_MANIFEST_LOADED, { originalManifest: data });
        } else {
            eventBus.trigger(
                Events.INTERNAL_MANIFEST_LOADED, {
                    manifest: null,
                    error: new DashJSError(
                        new DashJSError(
                            Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE,
                            Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_MESSAGE + `${url}`,
                        )
                    )
                },
            );
        }
    }

    function replaceSSLStreamURL(url, enableSSLStream) {
        if (enableSSLStream) {
            return url && url.replace(/http:\/\//g, 'https://');
        }
        return url;
    }

    function reset() {
        eventBus.off(Events.XLINK_READY, onXlinkReady, instance);

        if (mssHandler) {
            mssHandler.reset();
        }

        if (xlinkController) {
            xlinkController.reset();
            xlinkController = null;
        }

        if (urlLoader) {
            urlLoader.abort();
            urlLoader = null;
        }
    }

    instance = {
        load: load,
        reset: reset
    };

    setup();

    return instance;
}

ManifestLoader.__dashjs_factory_name = 'ManifestLoader';

const factory = FactoryMaker.getClassFactory(ManifestLoader);
export default factory;
