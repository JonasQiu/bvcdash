import FactoryMaker from '../../../core/FactoryMaker';
import ObjectIron from '../../../dash/parser/objectiron';
import RepresentationBaseValuesMap from '../../../dash/parser/maps/RepresentationBaseValuesMap';
import SegmentValuesMap from '../../../dash/parser/maps/SegmentValuesMap';
import Debug from '../../../core/Debug';

function DashBilibiliParser() {

    const context = this.context;

    let logger,
        instance,
        objectIron;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        objectIron = ObjectIron(context).create({
            adaptationset: new RepresentationBaseValuesMap(),
            period: new SegmentValuesMap()
        });
    }

    function getMatchers() {
        return null;
    }

    function getIron() {
        return objectIron;
    }

    function parse(data, forceSSLStream) {
        let manifest = {};

        const startTime = window.performance.now();

        try {
            const convertCamelCaseToUnderlineCase = function (obj) {
                let res = {};

                if (obj instanceof Object) {
                    for (let key in obj) {
                        let underlineKey = key.replace(/[\x41-\x5A]/g, (char, index) => {
                            let lowChar = String.fromCharCode(char.charCodeAt(0) + 32);
                            return index ? '_' + lowChar : lowChar;
                        });

                        if (Object.prototype.toString.call(obj[key]) === '[object Array]') {
                            res[underlineKey] = [];
                            obj[key].forEach(item => {
                                res[underlineKey].push(convertCamelCaseToUnderlineCase(item));
                            });
                        } else if (Object.prototype.toString.call(obj[key]) === '[object Object]') {
                            res[underlineKey] = convertCamelCaseToUnderlineCase(obj[key]);
                        } else {
                            res[underlineKey] = obj[key];
                        }
                    }
                } else {
                    res = obj;
                }

                return res;
            };

            data = convertCamelCaseToUnderlineCase(data);
        } catch (err) {
            throw new Error('Convert bilibili mpd failed, ' + err);
        }

        manifest.ProgramInformation = {
            Title: ''
        };
        manifest.loadedTime = new Date();
        manifest.mediaPresentationDuration = data.duration;
        manifest.minBufferTime = data.min_buffer_time;
        manifest.profiles = 'urn:mpeg:dash:profile:isoff-on-demand:2011';
        manifest.xmlns = 'urn:mpeg:dash:profile:isoff-on-demand:2011';
        manifest.type = 'static';
        manifest.interactive = data.type === 'interactive';
        manifest.originalUrl = location.href;
        manifest.url = location.href;

        manifest.Period = {
            duration: data.duration,
            AdaptationSet: []
        };
        // video
        if (data.video) {
            manifest.Period.AdaptationSet[0] = {};
            manifest.Period.AdaptationSet[0].Representation = data.video.map((item) => {
                const BaseURL = {
                    __text: replaceSSLStreamURL(item.base_url, forceSSLStream)
                };
                if (item.backup_url) {
                    item.backup_url.forEach((url, index) => {
                        BaseURL['backupUrl' + (index + 1)] = replaceSSLStreamURL(url, forceSSLStream);
                    });
                }
                return {
                    BaseURL,
                    SegmentBase: {
                        Initialization: {
                            range: item.segment_base.initialization
                        },
                        indexRange: item.segment_base.index_range,
                        indexRangeExact: 'true'
                    },
                    bandwidth: item.bandwidth,
                    codecs: item.codecs,
                    frameRate: item.frame_rate,
                    height: item.height,
                    width: item.width,
                    id: item.id + '',
                    mimeType: item.mime_type,
                    sar: item.sar,
                    startWithSAP: item.start_with_sap
                };
            });
        }
        // audio
        if (data.audio) {
            manifest.Period.AdaptationSet[1] = {};
            manifest.Period.AdaptationSet[1].Representation = data.audio.map((item) => {
                const BaseURL = {
                    __text: replaceSSLStreamURL(item.base_url, forceSSLStream)
                };
                if (item.backup_url) {
                    item.backup_url.forEach((url, index) => {
                        BaseURL['backupUrl' + (index + 1)] = replaceSSLStreamURL(url, forceSSLStream);
                    });
                }
                return {
                    BaseURL,
                    SegmentBase: {
                        Initialization: {
                            range: item.segment_base.initialization
                        },
                        indexRange: item.segment_base.index_range,
                        indexRangeExact: 'true'
                    },
                    bandwidth: item.bandwidth,
                    codecs: item.codecs,
                    id: item.id + '',
                    mimeType: item.mime_type
                };
            });
        }

        manifest.ProgramInformation = {
            Title: ''
        };

        const addArray = (object) => {
            const shouldAdd = Object.prototype.toString.call(object) !== '[object Array]';
            for (const key in object) {
                if (typeof object[key] === 'object') {
                    addArray(object[key]);
                    if (shouldAdd) {
                        object[`${key}_asArray`] = Object.prototype.toString.call(object[key]) === '[object Array]' ? object[key] : [object[key]];
                    }
                }
            }
        };
        addArray(manifest);

        if (!manifest) {
            throw new Error('parsing the manifest failed');
        }

        const jsonTime = window.performance.now();

        // TODO
        // objectIron.run(manifest);

        const ironedTime = window.performance.now();

        logger.debug('Parsing complete: ( xml2json: ' + (jsonTime - startTime).toPrecision(3) + 'ms, objectiron: ' + (ironedTime - jsonTime).toPrecision(3) + 'ms, total: ' + ((ironedTime - startTime) / 1000).toPrecision(3) + 's)');

        return manifest;
    }

    function replaceSSLStreamURL(url, enableSSLStream) {
        if (enableSSLStream) {
            return url && url.replace(/http:\/\//g, 'https://');
        }

        return url;
    }

    instance = {
        parse: parse,
        getMatchers: getMatchers,
        getIron: getIron
    };

    setup();

    return instance;
}

DashBilibiliParser.__dashjs_factory_name = 'DashBilibiliParser';
export default FactoryMaker.getClassFactory(DashBilibiliParser);
