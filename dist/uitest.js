/*! uitest.js - v0.10.0-SNAPSHOT - 2013-06-16
* https://github.com/tigbro/uitest.js
* Copyright (c) 2013 Tobias Bosch; Licensed MIT */
/**
 * Simple implementation of AMD require/define assuming all
 * modules are named and loaded explicitly, and require is called
 * after all needed modules have been loaded.
 */
(function (window) {
    var ns = window.uitest = window.uitest || {};

    var define = function (name, deps, value) {
        var dotJs = name.indexOf('.js');
        if (dotJs !== -1) {
            name = name.substring(0, dotJs);
        }
        if (arguments.length === 2) {
            // No deps...
            value = deps;
            deps = [];
        }
        var def = {
            name:name,
            deps:deps,
            value:value
        };
        for (var i = 0; i < define.moduleDefs.length; i++) {
            var mod = define.moduleDefs[i];
            if (mod.name === name) {
                define.moduleDefs[i] = def;
                return;
            }
        }
        define.moduleDefs.push(def);
    };
    define.moduleDefs = [];

    function findModuleDefinition(name) {
        for (var i = 0; i < define.moduleDefs.length; i++) {
            var mod = define.moduleDefs[i];
            if (mod.name === name) {
                return mod;
            }
        }
        throw new Error("Could not find the module " + name);
    }

    define.findModuleDefinition = findModuleDefinition;

    function factory(name, instanceCache) {
        if (!instanceCache) {
            instanceCache = {};
        }
        if (name==="moduleCache") {
            return instanceCache;
        }
        if (!(name in instanceCache)) {
            var resolvedValue;
            var mod = findModuleDefinition(name);
            var resolvedDeps = listFactory(mod.deps, instanceCache);
            resolvedValue = mod.value;
            if (typeof mod.value === 'function') {
                resolvedValue = mod.value.apply(window, resolvedDeps);
            }

            instanceCache[name] = resolvedValue;
            if (resolvedValue && resolvedValue.global) {
                var global = factory('global', instanceCache);
                mergeObjects(resolvedValue.global, global);

            }

        }
        return instanceCache[name];
    }

    function mergeObjects(source, target) {
        var prop, oldValue, newValue;
        for (prop in source) {
            newValue = source[prop];
            oldValue = target[prop];
            if (typeof oldValue === 'object') {
                mergeObjects(newValue, oldValue);
            } else {
                target[prop] = newValue;
            }
        }
    }

    function listFactory(deps, instanceCache) {
        if (!instanceCache) {
            instanceCache = {};
        }
        var resolvedDeps = [];
        for (var i = 0; i < deps.length; i++) {
            resolvedDeps.push(factory(deps[i], instanceCache));
        }
        return resolvedDeps;
    }

    var require = function (cache, deps, callback) {
        var filteredDeps = [],
            i, def;
        if (arguments.length===1) {
            deps = cache;
            cache = {};
            callback = null;
        } else if (arguments.length===2) {
            if (typeof cache === 'function' || cache.slice) {
                callback = deps;
                deps = cache;
            }
        }
        if (deps.apply) {
            // if deps is a function, treat it as a filter function.
            for (i = 0; i < define.moduleDefs.length; i++) {
                def = define.moduleDefs[i];
                if (deps(def.name)) {
                    filteredDeps.push(def.name);
                }
            }
            deps = filteredDeps;
        }
        var resolvedDeps = listFactory(deps, cache);

        if (callback) {
            callback.apply(this, resolvedDeps);
        }

        return cache;
    };

    ns.require = require;
    ns.define = define;

})(window);

uitest.define('annotate', ['utils'], function(utils) {

    // Copied from https://github.com/angular
    var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
    var FN_ARG_SPLIT = /,/;
    var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
    var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

    function annotate(fn) {
        var $inject, fnText, argDecl, last, args, i;

        if(typeof fn === 'function') {
            if(!($inject = fn.$inject)) {
                $inject = [];
                fnText = fn.toString().replace(STRIP_COMMENTS, '');
                argDecl = fnText.match(FN_ARGS);
                args = argDecl[1].split(FN_ARG_SPLIT);
                for(i = 0; i < args.length; i++) {
                    args[i].replace(FN_ARG, addFnArgTo$Inject);
                }
                fn.$inject = $inject;
            }
        } else if(utils.isArray(fn)) {
            last = fn.length - 1;
            assertArgFn(fn[last], 'fn');
            $inject = fn.slice(0, last);
        } else {
            assertArgFn(fn, 'fn', true);
        }
        return $inject;

        function addFnArgTo$Inject(all, underscore, name) {
            $inject.push(name);
        }
    }

    /**
     * throw error of the argument is falsy.
     */
    function assertArg(arg, name, reason) {
        if(!arg) {
            throw new Error("Argument '" + (name || '?') + "' is " + (reason || "required"));
        }
        return arg;
    }

    function assertArgFn(arg, name, acceptArrayAnnotation) {
        if(acceptArrayAnnotation && utils.isArray(arg)) {
            arg = arg[arg.length - 1];
        }
        assertArg(utils.isFunction(arg), name, 'not a function, got ' + (arg && typeof arg === 'object' ? arg.constructor.name || 'Object' : typeof arg));
        return arg;
    }

    return annotate;
});
uitest.define('config', [], function() {
	function create() {
		return new Create();
	}

	function Create() {
		this._data = {};
	}

	Create.prototype = {
		parent: simpleProp("_parent"),
		sealed: simpleProp("_sealed"),
		url: dataProp("url"),
		trace: dataProp("trace"),
		feature: dataAdder("features", featureValidator),
		append: dataAdder("appends"),
		prepend: dataAdder("prepends"),
		intercept: dataAdder("intercepts"),
		buildConfig: buildConfig
	};

	function getterSetter(getter, setter) {
		return result;

		function result() {
			if(arguments.length === 0) {
				return getter.call(this);
			} else {
				setter.apply(this, arguments);
				return this;
			}
		}
	}

	function simpleProp(name) {
		return getterSetter(function() {
			return this[name];
		}, function(newValue) {
			this[name] = newValue;
		});
	}

	function dataProp(name, checkFn) {
		return getterSetter(function() {
			return this._data[name];
		}, function(newValue) {
			checkNotSealed(this);
			if (checkFn) {
				checkFn(newValue);
			}
			this._data[name] = newValue;
		});
	}

	function dataAdder(name, checkFn) {
		return getterSetter(function() {
			return this._data[name];
		}, function() {
			var values = Array.prototype.slice.call(arguments),
				arr = this._data[name];
			checkNotSealed(this);
			if (checkFn) {
				checkFn(values);
			}
			if (!arr) {
				arr = this._data[name] = [];
			}
			arr.push.apply(arr, values);
		});
	}

	function featureValidator(features) {
		var i;
		for (i=0; i<features.length; i++) {
			if (!uitest.define.findModuleDefinition("run/feature/"+features[i])) {
				throw new Error("Unknown feature: "+features[i]);
			}
		}
	}

	function checkNotSealed(self) {
		if (self.sealed()) {
			throw new Error("This configuration cannot be modified.");
		}
	}

	function buildConfig(target) {
		target = target || {
			features: [],
			appends: [],
			prepends: [],
			intercepts: []
		};
		if (this.parent()) {
			this.parent().buildConfig(target);
		}
		var prop, value, oldValue,
            data = this._data;
		for(prop in data) {
			value = data[prop];
			if(isArray(value)) {
				value = (target[prop] || []).concat(value);
			}
			target[prop] = value;
		}
		return target;
	}

	function isArray(obj) {
		return obj && obj.push;
	}

	return {
		create: create
	};
});
uitest.define('eventSourceFactory', ['utils'], function(utils) {

    return eventSourceFactory;

    function eventSourceFactory() {
        var listeners = {};
        return {
            on: on,
            emit: emit,
            emitSync: emitSync
        };


        function on(eventName, listener) {
            var eventListeners = listeners[eventName] = listeners[eventName] || [];
            eventListeners.push(listener);
            utils.orderByPriority(eventListeners);
        }

        function emit(event, emitDone) {
            var eventName,
                eventListeners,
                anyEventListeners = listeners['*'],
                i;
            event = event || {};
            if (typeof event === "string") {
                eventName = event;
                event = {
                    type: eventName
                };
            } else {
                eventName = event.type;
            }
            if (!eventName) {
                throw new Error("No event type given");
            }
            eventListeners = listeners[eventName] || [];
            if (anyEventListeners) {
                eventListeners = anyEventListeners.concat(eventListeners);
            }
            emitDone = emitDone || utils.noop;
            utils.asyncLoop(eventListeners, asyncLoopHandler, asyncLoopDone);

            function asyncLoopHandler(loopData, done) {
                var eventListener = loopData.item;
                event.stop = loopData.stop;
                eventListener(event, done);
            }

            function asyncLoopDone(error) {
                emitDone(error, event);
            }

        }

        function emitSync(event) {
            var result;
            emit(event, done);
            return result;

            function done(error, _result) {
                if (error) {
                    throw error;
                }
                result = _result;
            }
        }
    }
});
uitest.define('facade', ['config', 'global'], function(config, global) {
    var CONFIG_FUNCTIONS = ['parent', 'url', 'loadMode', 'feature', 'append', 'prepend', 'intercept', 'trace'],
        _currentIdAccessor = function() { return ''; }, current;

    function create() {
        var res = {
            ready: ready,
            inject: inject
        },
            i, fnName, configInstance;
        configInstance = res._config = config.create();
        for(i = 0; i < CONFIG_FUNCTIONS.length; i++) {
            fnName = CONFIG_FUNCTIONS[i];
            res[fnName] = delegate(configInstance[fnName], configAccessor);
        }
        return res;

        function configAccessor(uit) {
            return uit && uit._config;
        }
    }

    function createDispatcherFacade(dispatcher) {
        // create a dummy uitest instance,
        // so we know which functions we can delegate...
        var res = {};
        var dummy = create(),
            prop;
        for (prop in dummy) {
            if (typeof dummy[prop] === 'function') {
                res[prop] = delegate(dummy[prop], dispatcherWrapper);
            }
        }

        return res;

        function dispatcherWrapper(caller) {
            if (caller===res) {
                return dispatcher();
            }
        }
    }

    function createCurrentFacade() {
        var uitCache = {};
        return createDispatcherFacade(currentDispatcher);

        function currentDispatcher() {
            var currentId = currentIdAccessor()(),
                uit = uitCache[currentId],
                parentUit = findParentUit(currentId);
            if (!uit) {
                uit = create();
                if (parentUit) {
                    uit.parent(parentUit);
                }
                uitCache[currentId] = uit;
            }
            return uit;
        }

        function findParentUit(childId) {
            var id, parentId;
            for (id in uitCache) {
                if (id!==childId && childId.indexOf(id)===0) {
                    if (!parentId || id.length>parentId.length) {
                        parentId = id;
                    }
                }
            }
            return uitCache[parentId];
        }
    }

    function currentIdAccessor(value) {
        if (typeof value === 'function') {
            _currentIdAccessor = value;
        }
        return _currentIdAccessor;
    }

    function delegate(fn, targetAccessor) {
        return function() {
            var i,
                args = Array.prototype.slice.call(arguments),
                target = targetAccessor(this),
                otherTarget;
            for (i=0; i<args.length; i++) {
                otherTarget = targetAccessor(args[i]);
                if (otherTarget) {
                    args[i] = otherTarget;
                }
            }
            var res = fn.apply(target, args);
            if(res === target) {
                res = this;
            }
            return res;
        };
    }

    function ready(callback) {
        var self = this;
        if(!self._runModules) {
            run(self, function() {
                self._runModules["run/ready"].ready(callback);
            });
        } else {
            self._runModules["run/ready"].ready(callback);
        }
    }

    function run(self, finishedCb) {
        var config, featureName, featureModules, i;
        self._config.sealed(true);
        config = self._config.buildConfig();
        self._runModules = {
            "run/config": config
        };

        uitest.require(self._runModules, function(moduleName) {
            if (moduleName.indexOf('run/')!==0) {
                return false;
            }
            if (moduleName.indexOf('run/feature/')===0) {
                return false;
            }
            return true;
        });
        featureModules = [];
        for (i=0; i<config.features.length; i++) {
            featureName = config.features[i];
            featureModules.push(featureModule(featureName));
        }
        uitest.require(self._runModules, featureModules);
        finishedCb();
    }

    function featureModule(featureName) {
        return "run/feature/"+featureName;
    }

    function inject(callback) {
        checkRunning(this);
        var injector = this._runModules["run/injector"];
        return injector.inject(callback);
    }

    function checkRunning(self) {
        if(!self._runModules) {
            throw new Error("The test page has not yet loaded. Please call ready first");
        }
    }

    current = createCurrentFacade();

    return {
        create: create,
        current: current,
        currentIdAccessor: currentIdAccessor,
        global: {
            uitest: {
                create: create,
                current: current
            }
        }
    };
});
uitest.define('fileLoader', ['global','sniffer','urlParser'], function(global, sniffer, urlParser) {
    return loadFile;

    // ---------
    function loadFile(url, resultCallback) {
        var xhr;
        if (!urlParser.isAbsoluteUrl(url)) {
            throw new Error("expected an absolute url!");
        }
        var parsedBaseUrl = urlParser.parseUrl(global.location.href),
            parsedLoadUrl = urlParser.parseUrl(url);
        if (parsedBaseUrl.domain && parsedLoadUrl.domain && parsedBaseUrl.domain !== parsedLoadUrl.domain) {
            parsedLoadUrl.path = '/' + parsedLoadUrl.domain + parsedLoadUrl.path;
            parsedLoadUrl.domain = "www.corsproxy.com";
            xhr = createCORSRequest('GET', urlParser.serializeUrl(parsedLoadUrl));
        } else {
            xhr = new global.XMLHttpRequest();
            xhr.open("GET", url, true);
        }
        if (typeof xhr.onload !== "undefined") {
            // For XDomainRequest...
            xhr.onload = onload;
            xhr.onerror = function(error) {
                resultCallback(new Error("Error loading url " + url + ":" + xhr.statusText));
            };
        } else {
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    onload();
                }
            };
        }
        xhr.send();

        function onload() {
            // Note: for IE XDomainRequest xhr has no status,
            // and for file access xhr.status is always 0.
            if (xhr.status === 200 || !xhr.status) {
                resultCallback(null, xhr.responseText);
            } else {
                resultCallback(new Error("Error loading url " + url + ":" + xhr.statusText));
            }
        }
    }

    function createCORSRequest(method, url) {
        if (sniffer.corsXhrForceCacheBusting) {
            url = urlParser.cacheBustingUrl(url, new global.Date().getTime());
        }
        var xhr = new global.XMLHttpRequest();
        if ("withCredentials" in xhr) {
            // Check if the XMLHttpRequest object has a "withCredentials" property.
            // "withCredentials" only exists on XMLHTTPRequest2 objects.
            xhr.open(method, url, true);
        } else if (typeof global.XDomainRequest !== "undefined") {
            // Otherwise, check if XDomainRequest.
            // XDomainRequest only exists in IE, and is IE's way of making CORS requests.
            xhr = new global.XDomainRequest();
            xhr.open(method, url);
        } else {
            // Otherwise, CORS is not supported by the browser.
            throw new Error("No CORS support in this browser!");
        }
        return xhr;
    }
});
uitest.define('global', [], function() {
	return window;
});

uitest.define('htmlParser', ['utils'], function (utils) {
    var ATTR_RE = /([\w_-]+)(\s*=\s*"([^"]*))?/g,
        TAG_MULTI_RE = [
            {
                type: "start",
                re: '<\\s*(\\w+)([^>]*?)(/)?>',
                groupCount: 3,
                parse: parseStartTag
            },
            {
                type: "end",
                re: '</\\s*(\\w+)\\s*>',
                groupCount: 1,
                parse: parseEndTag
            }
        ],
        simpleTags = {
            script: true
        };

    return transform;

    function parseStartTag(match, tokens) {
        var name = match[1],
            attrsUnparsed = match[2],
            empty = match[3],
            attrs = {},
            attrMatch;
        while (attrMatch = ATTR_RE.exec(attrsUnparsed)) {
            attrs[attrMatch[1]] = attrMatch[3];
        }
        tokens.push({
            type: 'start',
            name: name,
            attrs: attrs
        });
        if (empty) {
            tokens.push({
                name: name,
                type: 'end'
            });
        }
    }

    function parseEndTag(match, tokens) {
        var name = match[1];
        tokens.push({
            type: 'end',
            name: name
        });
    }

    function transform(data, transformDone) {
        var input = data.input,
            state = data.state || {},
            eventSource = data.eventSource,
            tokens = parse(input),
            resultTokens = [];

        loopTokens(tokens, function (error) {
            transformDone(error, serialize(resultTokens));
        });

        function loopTokens(tokens, loopDone) {
            utils.asyncLoop(tokens, loopHandler, loopDone);

            function loopHandler(entry, loopHandlerDone) {
                var token = entry.item;
                if (stringTokenDone(token)) {
                    return;
                }
                eventSource.emit(createEvent(token), eventDone);

                function stringTokenDone(token) {
                    if (typeof token === 'string') {
                        resultTokens.push(token);
                        loopHandlerDone(null);
                        return true;
                    }
                }

                function createEvent(token) {
                    return {
                        type: 'html:' + token.name + ':' + token.type,
                        token: token,
                        state: state,
                        prepend: [],
                        append: []
                    };
                }

                function eventDone(error, event) {
                    if (error) {
                        loopHandlerDone(error);
                        return;
                    }
                    loopTokens(event.prepend, function (error) {
                        if (error) {
                            loopHandlerDone(error);
                            return;
                        }
                        resultTokens.push(event.token);
                        loopTokens(event.append, function (error) {
                            if (error) {
                                loopHandlerDone(error);
                                return;
                            }
                            loopHandlerDone();
                        });
                    });
                }
            }
        }
    }

    function parse(input) {
        var tokens = splitIntoOpenCloseTags(input);
        return joinSimpleTags(tokens);
    }

    function splitIntoOpenCloseTags(input) {
        var multiRe = utils.multiRegex(TAG_MULTI_RE, "ig"),
            match,
            parsedMatch,
            tokens = [],
            lastMatchEnd = 0;
        while (match = multiRe.regex.exec(input)) {
            addOtherIfNeeded(match.index, match[0].length);
            parsedMatch = multiRe.parseMatch(match);
            parsedMatch.spec.parse(parsedMatch.match, tokens);
        }
        addOtherIfNeeded(input.length, 0);
        return tokens;

        function addOtherIfNeeded(matchStart, matchLen) {
            if (matchStart > lastMatchEnd) {
                tokens.push(input.substring(lastMatchEnd, matchStart));
            }
            lastMatchEnd = matchStart + matchLen;
        }
    }

    function joinSimpleTags(tokens) {
        var i = 0,
            token,
            resultTokens = [];
        while (token = readToken()) {
            if (token.type === 'start' && simpleTags[token.name.toLowerCase()]) {
                resultTokens.push(readSimpleTag(token));
            } else {
                resultTokens.push(token);
            }
        }
        return resultTokens;

        function readToken() {
            return tokens[i++];
        }

        function readSimpleTag(startTagToken) {
            var name = startTagToken.name,
                content = [],
                nextToken;
            startTagToken.type = 'simple';
            nextToken = readToken();
            if (typeof nextToken === 'string') {
                startTagToken.content = nextToken;
                nextToken = readToken();
            }
            if (nextToken.type !== 'end' || nextToken.name !== name) {
                throw new Error("expected end tag " + name + " but got " + nextToken);
            }
            return startTagToken;
        }
    }

    function serialize(tokens) {
        var i,
            token,
            result = [];
        for (i = 0; i < tokens.length; i++) {
            token = tokens[i];
            if (typeof token === 'string') {
                result.push(token);
            } else if (token.type === 'start') {
                serializeStartTag(token);
            } else if (token.type === 'simple') {
                serializeSimpleTag(token);
            } else if (token.type === 'end') {
                serializeEndTag(token);
            }
        }
        return result.join('');

        function serializeStartTag(token) {
            var attrName, attrValue;
            result.push('<', token.name);
            for (attrName in token.attrs) {
                attrValue = token.attrs[attrName];
                result.push(' ', attrName);
                if (attrValue) {
                    result.push('="', attrValue, '"');
                }
            }
            result.push('>');
        }

        function serializeEndTag(token) {
            result.push('</', token.name, '>');
        }

        function serializeSimpleTag(token) {
            serializeStartTag(token);
            if (token.content) {
                result.push(token.content);
            }
            serializeEndTag(token);
        }

    }
});

uitest.define('jsParser', ['utils'], function (utils) {
    var TOKENS_MULTI_RE = [
        {
            type: "location",
            re: "([\\s,;]|^)location\\.((href|hash)\\s*=|replace|assign|reload)",
            callback: onLocationMatch,
            groupCount: 3
        },
        {
            type: "location",
            re: "[=|return]\\s*window\\.location([;,]|$)",
            callback: onLocationMatch,
            groupCount: 1
        },
        {
            type: "namedFunctionStart",
            re: "\\bfunction\\s*(\\w+)[^\\{]*\\{",
            callback: onNamedFunctionStartMatch,
            groupCount: 1
        }
    ];
    return transform;

    function transform(data, done) {
        var input = data.input,
            eventSource = data.eventSource,
            state = data.state,
            multiRe = utils.multiRegex(TOKENS_MULTI_RE, "gm");
        var result = data.input.replace(multiRe.regex, function () {
            var match = Array.prototype.slice.call(arguments),
                parsedMatch = multiRe.parseMatch(match),
                reSpec = parsedMatch.spec,
                localMatch = parsedMatch.match;
            var baseEvent = {
                type: 'js:' + reSpec.type,
                state: state
            };
            return reSpec.callback(eventSource, baseEvent, localMatch);
        });
        done(null, result);
    }

    function onLocationMatch(eventSource, baseEvent, match) {
        eventSource.emitSync(baseEvent);
        if (baseEvent.replace) {
            return match[0].replace("location", baseEvent.replace);
        }
        return match[0];
    }

    function onNamedFunctionStartMatch(eventSource, baseEvent, match) {
        baseEvent.name = match[1];
        eventSource.emitSync(baseEvent);
        if (baseEvent.append) {
            return match[0] + baseEvent.append;
        }
        return match[0];
    }
});

uitest.define('proxyFactory', ['global'], function(global) {

    return createProxy;

    function createProxy(original, interceptors) {
        var propName, proxy;
        proxy = newProxyObject();
        for (propName in original) {
            if (typeof original[propName] === 'function') {
                addFunction(original, proxy, propName, interceptors.fn);
            } else {
                addProperty(original, proxy, propName, interceptors.get, interceptors.set);
            }
        }
        return proxy;
    }

    function newProxyObject() {
        try {
            addProperty({}, {}, 'test');
            return {};
        } catch (e) {
            // For IE 8: Getter/Setters only supported on DOM nodes...
            return global.document.createElement('div');
        }
    }

    function addFunction(original, proxy, propName, interceptor) {
        var oldFn = original[propName];
        return proxy[propName] = interceptedFn;

        function interceptedFn() {
            return interceptor({
                self: original,
                name: propName,
                args: arguments,
                delegate: oldFn
            });
        }
    }

    function addProperty(original, proxy, propName, getInterceptor, setInterceptor) {
        // Modern browsers, IE9+, and IE8 (must be a DOM object),
        if (Object.defineProperty) {
            Object.defineProperty(proxy, propName, {
                get: getFn,
                set: setFn
            });
            // Older Mozilla
        } else if (proxy.__defineGetter__) {
            proxy.__defineGetter__(propName, getFn);
            proxy.__defineSetter__(propName, setFn);
        } else {
            throw new Error("This browser does not support getters or setters!");
        }

        function getFn() {
            return getInterceptor({
                self: original,
                name: propName
            });
        }

        function setFn(value) {
            return setInterceptor({
                self: original,
                name: propName,
                value: value
            });
        }
    }
});
uitest.define('run/eventSource', ['eventSourceFactory'], function(eventSourceFactory) {
    return eventSourceFactory();
});

uitest.define("run/feature/angularIntegration", ["run/injector", "run/eventSource"], function(injector, eventSource) {

    eventSource.on('addAppends', function addAppends(event, done) {
        event.handlers.push(install);
        done();
    });

    function install(angular, window) {
        if(!angular) {
            throw new Error("Angular is not loaded!");
        }

        var ng = angular.module("ng");

        installE2eMock(angular, ng);
        adaptPrototypes(ng, window);
        addAngularInjector(ng);
    }

    function addAngularInjector(ng) {
        ng.run(function($injector) {
            injector.addDefaultResolver(angularResolver);

            function angularResolver(argName) {
                try {
                    return $injector.get(argName);
                } catch(e) {
                    return undefined;
                }
            }
        });
    }

    function installE2eMock(angular, ng) {
        ng.config(function($provide) {
            if(angular.mock) {
                // disable auto-flushing by removing the $browser argument,
                // so we can control flushing using $httpBackend.flush()!
                angular.mock.e2e.$httpBackendDecorator.splice(1, 1);
                // enable the mock backend
                $provide.decorator('$httpBackend', angular.mock.e2e.$httpBackendDecorator);
            }
        });
    }

    // -----
    // Angular uses "instanceof Array" only at 3 places,
    // which can generically be decorated.
    function adaptPrototypes(ng, win) {
        function convertArr(inArr) {
            // On Android 2.3, just calling new win.Array() is not enough
            // to yield outArr instanceof win.Array.
            // Also, every call to "push" will also change the prototype somehow...
            /*jshint evil:true*/
            if (!inArr) {
                return inArr;
            }
            var outArr = win["eval"]("new Array("+inArr.length+")"),
                i;
            for (i=0; i<inArr.length; i++) {
                outArr[i] = inArr[i];
            }
            return outArr;
        }

        function adaptPrototypesInFilter($provide, filterName) {
            $provide.decorator(filterName, function($delegate) {
                return function() {
                    var args = Array.prototype.slice.call(arguments);
                    args[0] = convertArr(args[0]);
                    return $delegate.apply(this, args);
                };
            });
        }

        ng.config(function($provide) {
            adaptPrototypesInFilter($provide, "filterFilter");
            adaptPrototypesInFilter($provide, "limitToFilter");
            adaptPrototypesInFilter($provide, "orderByFilter");
        });
    }
});
uitest.define('run/feature/cacheBuster', ['run/eventSource', 'run/logger', 'utils', 'urlParser'], function(eventSource, logger, utils, urlParser) {

    var now = utils.testRunTimestamp();
    logger.log("forcing script refresh with timestamp "+now);
    eventSource.on('instrumentScript', instrumentScript);

    return instrumentScript;

    function instrumentScript(event, done) {
        if (event.src) {
            event.src = urlParser.cacheBustingUrl(event.src, now);
        }
        done();
    }
});


uitest.define('run/feature/fakeHistory', ['run/eventSource', 'run/main', 'run/feature/locationProxy', 'urlParser', 'sniffer'], function(eventSource, main, locationProxy, urlParser, sniffer) {
    var historyStack = [],
        currentIndex = -1,
        testWin,
        testWinInitUrl;
    eventSource.on('addPrepends', function(event, done) {
        event.handlers.push(initFakeHistory);
        done();
    });

    eventSource.on('loc:reload', function(event, done) {
        addNonPushStateEntry(event.newHref, event.newHref, event.replace);
        done();
    });
    eventSource.on('loc:hash', function(event, done) {
        addNonPushStateEntry(testWinInitUrl, event.newHref, event.replace);
        done();
    });

    function initFakeHistory(window, location) {
        var history = window.history;
        testWinInitUrl = location.href;
        testWin = window;
        if (currentIndex===-1) {
            addNonPushStateEntry(testWinInitUrl, location.href, false);
        }
        // Note: Can't replace the whole window.history in IE10 :-(        
        history.go = go;
        history.back = back;
        history.forward = forward;
        if (sniffer.history) {
            history._pushState = history.pushState;
            history.pushState = function(state, title, href) {
                // TODO make href absolute!
                addEntry({
                    href: href,
                    state: state,
                    title: title,
                    initHref: testWinInitUrl
                }, false);
                history._pushState(state, title, href);
            };
            history.replaceState = function(state, title, href) {
                // TODO make href absolute!
                addEntry({
                    href: href,
                    state: state,
                    title: title,
                    initHref: testWinInitUrl
                }, true);
                history._pushState(state, title, href);
            };
        }
        function go(relativeIndex) {
            var newIndex = currentIndex+relativeIndex,
                oldEntry = historyStack[currentIndex],
                entry,
                evt;
            if (newIndex<0) {
                throw new Error("Cannot go before the first history entry!");
            } else if (newIndex>=historyStack.length) {
                newIndex = historyStack.length-1;
            }
            currentIndex = newIndex;
            entry = historyStack[currentIndex];
            if (sniffer.history && oldEntry.initHref === entry.initHref) {
                // See http://www.whatwg.org/specs/web-apps/current-work/#traverse-the-history
                window.setTimeout(function() {
                    history._pushState(entry.state, entry.title, entry.href);
                    evt = createEvent(window, "PopStateEvent", "popstate");
                    evt.state = entry.state;
                    window.dispatchEvent(evt);
                    if (hashChanged(oldEntry.href, entry.href)) {
                        evt = createEvent(window, "HashChangeEvent", "hashchange");
                        evt.oldURL = oldEntry.href;
                        evt.newURL = entry.href;
                        window.dispatchEvent(evt);
                    }
                },0);
            } else {
                // TODO: if initHref changed, manually trigger a reload
                // TODO: Otherwise use window.location, and not window.locationProxy,
                // as we don't want another entry in the history!
                window.locationProxy.href = entry.href;
            }
        }
        function back() {
            go(-1);
        }
        function forward() {
            go(1);
        }
    }

    function createEvent(win, eventObjName, eventName) {
        var evt;
        try {
            evt = win.document.createEvent(eventObjName);
        } catch (e) {
            // For IE: creating "HashChangeEvent" needs a normal "Event"
            eventObjName = 'Event';
            evt = win.document.createEvent(eventObjName);
        }
        evt.initEvent(eventName, true, false);
        return evt;
    }

    function addNonPushStateEntry(initHref, href, replace) {
        var currentEntry = historyStack[currentIndex];
        if (currentEntry && href===currentEntry.href) {
            return;
        }
        addEntry({
            initHref: initHref,
            href: addHashIfNeeded(href),
            state: testWin.history.state,
            title: testWin.document.title
        }, replace);
    }

    function addEntry(entry, replace) {
        historyStack.splice(currentIndex+1, historyStack.length-currentIndex-1);
        if (currentIndex>=0 && replace) {
            historyStack[currentIndex] = entry;
        } else {
            historyStack.push(entry);
            currentIndex = historyStack.length-1;
        }
    }

    function addHashIfNeeded(href) {
        if (sniffer.history) {
            return href;
        }
        var index = href.indexOf('#');
        if (index===-1) {
            return href+'#';
        }
        return href;
    }

    function hashChanged(href1, href2) {
        return removeHash(href1)===removeHash(href2) && href1!==href2;
    }

    function removeHash(href) {
        var hashPos = href.indexOf('#');
        if (hashPos === -1) {
            return href;
        }
        return href.substring(0, hashPos);
    }
});
uitest.define('run/feature/intervalSensor', ['run/eventSource', 'run/ready'], function(eventSource, readyModule) {
    var intervals = {},
        intervalStartCounter = 0;

    eventSource.on('addPrepends', function(event, done) {
        event.handlers.push(install);
        done();
    });
    readyModule.addSensor('interval', state);
    return state;

    function install(window) {
        var oldInterval = window.setInterval;
        window.setInterval = function (fn, time) {
            var handle = oldInterval(fn, time);
            intervals[handle] = true;
            intervalStartCounter++;
            return handle;
        };

        var oldClearInterval = window.clearInterval;
        window.clearInterval = function (code) {
            oldClearInterval(code);
            delete intervals[code];
        };
    }

    function isReady() {
        var x;
        for (x in intervals) {
            return false;
        }
        return true;
    }

    function state() {
        return {
            count: intervalStartCounter,
            ready: isReady()
        };
    }
});

uitest.define('run/feature/jqmAnimationSensor', ['run/eventSource', 'run/ready'], function(eventSource, readyModule) {

    var ready = true,
        startCounter = 0;

    eventSource.on('addAppends', function(event,done) {
        event.handlers.push(install);
        done();
    });

    readyModule.addSensor('jqmAnimationSensor', state);

    return state;

    function install(window) {
        var jQuery = window.jQuery;
        if(!(jQuery && jQuery.fn && jQuery.fn.animationComplete)) {
            return;
        }

        var oldFn = jQuery.fn.animationComplete;
        jQuery.fn.animationComplete = function(callback) {
            startCounter++;
            ready = false;
            return oldFn.call(this, function() {
                ready = true;
                return callback.apply(this, arguments);
            });
        };
    }

    function state() {
        return {
            count: startCounter,
            ready: ready
        };
    }
});
uitest.define('run/feature/locationProxy', ['proxyFactory', 'run/scriptInstrumentor', 'run/eventSource', 'run/injector', 'run/testframe', 'sniffer'], function(proxyFactory, scriptInstrumentor, eventSource, injector, testframe, sniffer) {
    eventSource.on('addPrepends', function(event, done) {
        event.handlers.push(initFrame);
        done();
    });
    eventSource.on('js:location', function (event, done) {
        event.replace = 'location[locationProxy.test()]()';
        done();
    });

    // Override window.location!
    locationResolver.priority = 99999;
    injector.addDefaultResolver(locationResolver);

    return;

    function initFrame(window, location) {
        instrumentLinks(window);
        createLocationProxy(window, location);
    }

    function instrumentLinks(window) {
        var elProto = window.HTMLElement ? window.HTMLElement.prototype : window.Element.prototype;
        instrumentElementProto(elProto);
        if (window.HTMLButtonElement) {
            // In FF, Buttons have their own dispatchEvent, ... methods
            // In IE10, HTMLButtonElement exists but has the same methods
            // as HTMLElement.
            instrumentElementProto(window.HTMLButtonElement.prototype);
        }

        function instrumentElementProto(elProto) {
            var _fireEvent = elProto.fireEvent,
                _dispatchEvent = elProto.dispatchEvent;
            if (_fireEvent && !_fireEvent.uitest) {
                elProto.fireEvent = checkAfterClick(fixFF684208(_fireEvent));
            }
            if (_dispatchEvent && !_dispatchEvent.uitest) {
                elProto.dispatchEvent = checkAfterClick(fixFF684208(_dispatchEvent));
            }
            // Need to instrument click to use triggerEvent / fireEvent,
            // as .click does not tell us if the default has been prevented!
            // Note: Some browsers do note support .click, we add it here
            // for all of them :-)
            elProto.click = newClick;
        }

        function newClick() {
            fireEvent(this, 'click');
        }

        function findLinkInParents(elm) {
            while (elm !== null) {
                if (elm.nodeName.toLowerCase() === 'a') {
                    return elm;
                }
                elm = elm.parentNode;
            }
            return elm;
        }

        function fixFF684208(origTriggerFn) {
            if (!sniffer.dispatchEventDoesNotReturnPreventDefault) {
                return origTriggerFn;
            }
            result.uitest = true;
            return result;

            function result() {
                var el = this,
                    defaultPrevented = false,
                    originalDefaultExecuted,
                    evtObj = typeof arguments[0] === 'object' ? arguments[0] : arguments[1];

                // TODO care for DOM-Level-0 handlers that return false!
                var _preventDefault = evtObj.preventDefault;
                evtObj.preventDefault = function() {
                    defaultPrevented = true;
                    return _preventDefault.apply(this, arguments);
                };
                origTriggerFn.apply(this, arguments);
                return !defaultPrevented;
            }
        }

        function checkAfterClick(origTriggerFn) {
            result.uitest = true;
            return result;

            function result() {
                var el = this,
                    link = findLinkInParents(el),
                    origHref = window.location.href,
                    defaultExecuted;
                defaultExecuted = origTriggerFn.apply(this, arguments);
                if (defaultExecuted && link) {
                    // Note: calling stopPropagation on a click event that has
                    // been triggered for a child of a link still fires up
                    // the link, although the event is not propagated to the
                    // listeners of the link!
                    // So we don't need to check for stopPropagation here!
                    triggerHrefChange(origHref, link.href);
                }
                return defaultExecuted;
            }

        }
    }

    function createLocationProxy(window, location) {
        var urlResolverLink = window.document.createElement('a');
        var locationProxy = proxyFactory(location, {
            fn: fnInterceptor,
            get: getInterceptor,
            set: setInterceptor
        });
        locationProxy.test = createTestFn(window, location, locationProxy);
        window.locationProxy = locationProxy;

        function makeAbsolute(url) {
            urlResolverLink.href = url;
            return urlResolverLink.href;
        }

        function fnInterceptor(data) {
            var newHref,
            replace = false;
            if (data.name === 'reload') {
                newHref = location.href;
            } else if (data.name === 'replace') {
                newHref = data.args[0] || location.href;
                replace = true;
            } else if (data.name === 'assign') {
                newHref = data.args[0] || location.href;
            }
            if (newHref) {
                triggerLocationChange({
                    oldHref: location.href,
                    newHref: makeAbsolute(newHref),
                    type: 'loc:reload',
                    replace: replace
                });
            }
            return data.delegate.apply(data.self, data.args);
        }

        function getInterceptor(data) {
            return data.self[data.name];
        }

        function setInterceptor(data) {
            var value = data.value,
                oldHref = location.href,
                absHref,
                change = false,
                changeType;
            if (data.name === 'href') {
                change = true;
            } else if (data.name === 'hash') {
                if (!value) {
                    value = '#';
                } else if (value.charAt(0) !== '#') {
                    value = '#' + value;
                }
                change = true;
            }
            if (change) {
                triggerHrefChange(oldHref, makeAbsolute(value));
            }
            data.self[data.name] = data.value;
        }
    }

    function triggerHrefChange(oldHref, newHref) {
        var changeType;
        if (newHref.indexOf('#') === -1 || removeHash(newHref) !== removeHash(oldHref)) {
            changeType = 'loc:reload';
        } else {
            changeType = 'loc:hash';
        }
        triggerLocationChange({
            oldHref: oldHref,
            newHref: newHref,
            type: changeType,
            replace: false
        });
    }

    function removeHash(url) {
        var hashPos = url.indexOf('#');
        if (hashPos === -1) {
            return url;
        }
        return url.substring(0, hashPos);
    }

    function triggerLocationChange(changeEvent) {
        eventSource.emit(changeEvent);
    }

    function createTestFn(window, location, locationProxy) {
        // In IE8: location does not inherit from Object.prototype...
        location.testLocation = testLocation;
        // If the locationProxy is copied in a variable named "location".
        locationProxy.testLocation = testLocation;

        return function() {
            window.Object.prototype.testLocation = testLocation;
            return 'testLocation';

        };

        function testLocation() {
            // Note: Calling delete location.testLocation yields
            // to an Error in IE8...
            delete window.Object.prototype.testLocation;
            // Note: In IE8 we can't do a this === location,
            // as this seems to be some wrapper object...
            this.testFlag = true;
            try {
                if (location.testFlag) {
                    return locationProxy;
                }
            } finally {
                delete this.testFlag;
            }
            return this;
        }
    }

    function fireEvent(obj, evt) {
        var fireOnThis = obj,
            doc = obj.ownerDocument,
            evtObj;

        if (doc.createEvent) {
            evtObj = doc.createEvent('MouseEvents');
            evtObj.initEvent(evt, true, true);
            return fireOnThis.dispatchEvent(evtObj);
        } else if (doc.createEventObject) {
            evtObj = doc.createEventObject();
            return fireOnThis.fireEvent('on' + evt, evtObj);
        }
    }

    function locationResolver(propName) {
        var locationProxy = testframe.win().locationProxy;
        if (propName === 'location' && locationProxy) {
            return locationProxy;
        }
    }
});
uitest.define('run/feature/mobileViewport', ['run/eventSource'], function(eventSource) {
    eventSource.on('addAppends', function(event, done) {
        event.handlers.push(install);
        done();
    });

    function install(window) {
        var doc = window.document,
            topDoc = window.top.document,
            viewportMeta = findViewportMeta(doc),
            topViewportMeta = findViewportMeta(topDoc),
            newMeta;
        if (topViewportMeta) {
            topViewportMeta.parentNode.removeChild(topViewportMeta);
        }

        if (viewportMeta) {
            newMeta = topDoc.createElement("meta");
            newMeta.setAttribute("name", "viewport");
            newMeta.setAttribute("content", viewportMeta.getAttribute("content"));
            topDoc.getElementsByTagName("head")[0].appendChild(newMeta);
        }
    }

    function findViewportMeta(doc) {
        var metas = doc.getElementsByTagName("meta"),
            meta,
            i;
        for (i=0; i<metas.length; i++) {
            meta = metas[i];
            if (meta.getAttribute('name')==='viewport') {
                return meta;
            }
        }
        return null;
    }
});
uitest.define('run/feature/multiPage', ['run/eventSource', 'run/main', 'run/feature/locationProxy', 'run/feature/fakeHistory', 'global'], function(eventSource, main, locationProxy, fakeHistory, global) {
    eventSource.on('loc:reload', function(event, done) {
        global.setTimeout(function() {
            main.start(event.newHref);
        });
        done();
    });
});
uitest.define('run/feature/timeoutSensor', ['run/eventSource', 'run/ready'], function(eventSource, readyModule) {

    var timeouts = {},
        timoutStartCounter = 0;

    eventSource.on('addPrepends', function(event, done) {
        event.handlers.push(install);
        done();
    });
    readyModule.addSensor('timeout', state);
    return state;

    function install(window) {
        var oldTimeout = window.setTimeout;
        window.setTimeout = function (fn, time) {
            var handle;
            var callback = function () {
                delete timeouts[handle];
                if (typeof fn === 'string') {
                    /*jshint evil:true*/
                    window['eval'](fn);
                } else {
                    fn();
                }
            };
            handle = oldTimeout(callback, time);
            timeouts[handle] = true;
            timoutStartCounter++;
            return handle;
        };

        var oldClearTimeout = window.clearTimeout;
        window.clearTimeout = function (code) {
            oldClearTimeout(code);
            delete timeouts[code];
        };
    }

    function isReady() {
        var x;
        for (x in timeouts) {
            return false;
        }
        return true;
    }

    function state() {
        return {
            count: timoutStartCounter,
            ready: isReady()
        };
    }
});

uitest.define('run/feature/xhrSensor', ['run/eventSource', 'run/ready'], function(eventSource, readyModule) {

    var ready = true,
        startCounter = 0;

    eventSource.on('addPrepends', function(event, done) {
        event.handlers.push(install);
        done();
    });

    readyModule.addSensor('xhr', state);
    return state;

    function install(window) {
        var copyStateFields = ['readyState', 'responseText', 'responseXML', 'status', 'statusText'];
        var proxyMethods = ['abort', 'getAllResponseHeaders', 'getResponseHeader', 'open', 'send', 'setRequestHeader'];

        var OldXHR = window.XMLHttpRequest;
        var DONE = 4;
        var newXhr = function() {
                var self = this;
                this.origin = new OldXHR();

                function copyState() {
                    for(var i = 0; i < copyStateFields.length; i++) {
                        var field = copyStateFields[i];
                        try {
                            self[field] = self.origin[field];
                        } catch(_) {}
                    }
                }

                function proxyMethod(name) {
                    self[name] = function() {
                        if(name === 'send') {
                            ready = false;
                            startCounter++;
                        } else if(name === 'abort') {
                            ready = true;
                        }
                        // Note: Can't use apply here, as IE7 does not
                        // support apply for XHR methods...
                        var res;
                        if (arguments.length===0) {
                            res = self.origin[name]();
                        } else if (arguments.length===1) {
                            res = self.origin[name](arguments[0]);
                        } else if (arguments.length===2) {
                            res = self.origin[name](arguments[0], arguments[1]);
                        } else if (arguments.length===3) {
                            res = self.origin[name](arguments[0], arguments[1], arguments[2]);
                        } else {
                            throw new Error("Too many arguments for the xhr proxy: "+arguments.length);
                        }
                        copyState();
                        return res;
                    };
                }

                for(var i = 0; i < proxyMethods.length; i++) {
                    proxyMethod(proxyMethods[i]);
                }
                this.origin.onreadystatechange = function() {
                    if(self.origin.readyState === DONE) {
                        ready = true;
                    }
                    copyState();
                    if(self.onreadystatechange) {
                        self.onreadystatechange.apply(self.origin, arguments);
                    }
                };
                copyState();
            };
        window.XMLHttpRequest = newXhr;
    }

    function state() {
        return {
            count: startCounter,
            ready: ready
        };
    }
});
uitest.define('run/htmlInstrumentor', ['fileLoader', 'run/logger', 'global', 'htmlParser', 'run/eventSource', 'run/testframe', 'urlParser', 'utils', 'run/injector'], function (fileLoader, logger, global, htmlParser, eventSource, testframe, urlParser, utils, injector) {

    var exports;

    exports = {
        htmlParser: htmlParser,
        processHtml: processHtml
    };
    eventSource.on('html:head:start', emitAddPrepends);
    eventSource.on('html:body:start', emitAddPrepends);
    eventSource.on('html:body:end', emitAddAppends);
    eventSource.on('html:script:simple', emitInstrumentScript);

    return exports;

    function emitAddPrepends(htmlEvent, htmlEventDone) {
        var state = htmlEvent.state;
        if (state.addedPrepends) {
            htmlEventDone();
            return;
        }
        state.addedPrepends = true;
        emitAddPrependsAndAppends(htmlEvent, 'addPrepends', htmlEvent.append, htmlEventDone);
    }

    function emitAddAppends(htmlEvent, htmlEventDone) {
        if (htmlEvent.token.addedAppends) {
            htmlEventDone();
            return;
        }
        htmlEvent.token.addedAppends = true;
        emitAddPrependsAndAppends(htmlEvent, 'addAppends', htmlEvent.prepend, htmlEventDone);
    }

    function emitAddPrependsAndAppends(htmlEvent, type, addArray, htmlEventDone) {
        logger.log(type + " after " + htmlEvent.type);
        eventSource.emit({
            type: type,
            handlers: [],
            state: htmlEvent.state
        }, done);

        function done(error, addPrependsOrAppendsEvent) {
            var i, handler;
            if (error) {
                htmlEventDone(error);
                return;
            }
            createScriptTokensForPrependsOrAppends(addArray, addPrependsOrAppendsEvent.handlers);
            htmlEventDone();
        }
    }

    function createScriptTokensForPrependsOrAppends(addArray, prependsOrAppends) {
        var i, prependOrAppend, lastCallbackArr;
        for (i = 0; i < prependsOrAppends.length; i++) {
            prependOrAppend = prependsOrAppends[i];
            if (utils.isString(prependOrAppend)) {
                addArray.push({
                    type: 'simple',
                    name: 'script',
                    attrs: {
                        src: prependOrAppend
                    },
                    content: ''
                });
                lastCallbackArr = null;
            } else {
                if (!lastCallbackArr) {
                    lastCallbackArr = [];
                    addArray.push({
                        type: 'simple',
                        name: 'script',
                        attrs: {},
                        content: testframe.createRemoteCallExpression(injectedCallbacks(lastCallbackArr))
                    });
                }
                lastCallbackArr.push(prependOrAppend);
            }
        }
    }

    function injectedCallbacks(callbacks) {
        return function () {
            var i;
            for (i = 0; i < callbacks.length; i++) {
                injector.inject(callbacks[i]);
            }
        };
    }

    function emitInstrumentScript(htmlEvent, htmlEventDone) {
        if (htmlEvent.token.name !== 'script') {
            htmlEventDone();
            return;
        }
        var absUrl;
        if (htmlEvent.token.attrs.src) {
            absUrl = urlParser.makeAbsoluteUrl(htmlEvent.token.attrs.src, htmlEvent.state.htmlUrl);
        }
        eventSource.emit({
            type: 'instrumentScript',
            content: htmlEvent.token.content,
            src: absUrl,
            changed: false
        }, done);

        function done(error, instrumentScriptEvent) {
            if (error) {
                htmlEventDone(error);
                return;
            }
            if (instrumentScriptEvent.changed) {
                htmlEvent.token.content = testframe.createRemoteCallExpression(execScript);
                delete htmlEvent.token.attrs.src;
            } else {
                // Still allow event listeners to change the src of the script
                if (htmlEvent.token.attrs.src) {
                    htmlEvent.token.attrs.src = instrumentScriptEvent.src;
                }
            }
            htmlEventDone();

            function execScript() {
                utils.evalScript(testframe.win(), absUrl, instrumentScriptEvent.content);
            }
        }
    }

    function processHtml(url, finishedCallback) {
        fileLoader(url, function (error, html) {
            if (error) {
                finishedCallback(error);
                return;
            }

            htmlParser({
                input: html,
                state: {
                    htmlUrl: url
                },
                eventPrefix: 'html:',
                eventSource: eventSource
            }, finishedCallback);
        });
    }
});
uitest.define('run/initialHistoryFix', ['run/eventSource'], function(eventSource) {
    // needs to be executed before the normal prepends
    addPrepends.priority = 99999;
    eventSource.on("addPrepends", addPrepends);

    function addPrepends(event, done) {
        var originalUrl = event.state.htmlUrl;
        event.handlers.unshift(fixHistory);
        done();

        function fixHistory(history, location) {
            // Bugs fixed here:
            // - IE looses the hash when rewriting using a js url
            // - Rewriting using a js url or doc.open/write/close deletes the current history entry.
            //   This yields to problems when using history.back()!
            //   (at least in a fresh Chrome in Inkognito mode)
            // - PhantomJS: creating a history entry using hash change does not work correctly.
            //   Using history.pushState however does work...
            if (history.pushState) {
                history.pushState(null, "", originalUrl);
            } else {
                var currHash = hash(originalUrl);
                location.hash = "someUniqueHashToCreateAHistoryEntry";
                location.hash = currHash;
            }
        }
    }

    function hash(url) {
        var hashPos = url.indexOf('#');
        if (hashPos !== -1) {
            return url.substring(hashPos);
        } else {
            return '';
        }
    }
});
uitest.define('run/injector', ['annotate', 'utils'], function(annotate, utils) {

	var defaultResolvers = [];

	function inject(fn, self, values) {
		var argNames = annotate(fn),
			argValues = [],
			i;
		values = values||[];
		fn = utils.isArray(fn)?fn[fn.length-1]:fn;
		for (i=0; i<argNames.length; i++) {
			argValues.push(resolveArgIncludingDefaultResolvers(argNames[i], values));
		}
		return fn.apply(self, argValues);
	}

	function resolveArgIncludingDefaultResolvers(argName, resolvers) {
		var resolved = resolveArg(argName, resolvers);
		if (resolved===undefined) {
			resolved = resolveArg(argName, defaultResolvers);
		}
		return resolved;
	}

	function resolveArg(argName, resolvers) {
		var i, resolver, resolved;
		for (i=0; i<resolvers.length && !resolved; i++) {
			resolver = resolvers[i];
			if (utils.isFunction(resolver)) {
				resolved = resolver(argName);
			} else {
				resolved = resolver[argName];
			}
		}
		return resolved;
	}

	function addDefaultResolver(resolver) {
		defaultResolvers.push(resolver);
		utils.orderByPriority(defaultResolvers);
	}

	return {
		inject: inject,
		addDefaultResolver: addDefaultResolver
	};
});
uitest.define('run/loadSensor', ['run/ready', 'run/eventSource'], function(readyModule, eventSource) {

	var count = -1,
		ready, win, doc, waitForDocComplete;

	eventSource.on('addAppends', function(event, done) {
		event.handlers.push(function(window, document) {
			win = window;
			doc = document;
			waitForDocComplete = true;
		});
		done();
	});

	loadSensor.init = init;
	init();

	readyModule.addSensor("load", loadSensor);
	return loadSensor;

	function init() {
		count++;
		ready = false;
		waitForDocComplete = false;
	}

	function loadSensor() {
		if (waitForDocComplete && docReady(doc)) {
			waitForDocComplete = false;
			// this timeout is required for IE, as it sets the
			// readyState to "interactive" before the DOMContentLoaded event.
			win.setTimeout(function() {
				ready = true;
			},1);
		}
		return {
			count: count,
			ready: ready
		};
	}

	function docReady(doc) {
		return doc.readyState==='complete' || doc.readyState==='interactive';
	}
});

uitest.define('run/logger', ['global', 'run/config'], function(global, runConfig) {

    var lastMsg;
    function log(msg) {
        if (runConfig.trace && lastMsg!==msg) {
            lastMsg = msg;
            global.console.log(msg);
        }
    }

    return {
        log: log
    };
});

uitest.define('run/main', ['urlParser', 'global','run/logger', 'run/config', 'run/htmlInstrumentor', 'run/testframe', 'run/loadSensor', 'utils'], function(urlParser, global, logger, runConfig, htmlInstrumentor, testframe, loadSensor, utils) {

    start(runConfig.url);
    return {
        start: start
    };

    // -------

    function start(url) {
        var now = utils.testRunTimestamp();
        loadSensor.init();
        url = urlParser.makeAbsoluteUrl(url, urlParser.uitestUrl());
        url = urlParser.cacheBustingUrl(url, now);
        url = url.replace("{now}",now);
        logger.log("opening url "+url);
        htmlInstrumentor.processHtml(url, function(error, html) {
            if (error) {
                logger.log("Error: "+JSON.stringify(error));
                throw error;
            }
            logger.log("rewriting url "+url);
            testframe.load(url, html);
        });
    }

});
uitest.define('run/namedFunctionInstrumentor', ['run/eventSource', 'run/injector', 'annotate', 'run/config', 'urlParser', 'run/testframe', 'run/scriptInstrumentor'], function(eventSource, injector, annotate, runConfig, urlParser, testframe, scriptInstrumentor) {
    eventSource.on('js:namedFunctionStart', onFunctionStart);

    return onFunctionStart;

    function onFunctionStart(event, done) {
        var state = event.state;
        var intercept = findMatchingInterceptByName(event.name, state.scriptUrl);
        if (!intercept) {
            done();
            return;
        }
        event.append = 'if (!' + event.name + '.delegate)return ' + testframe.createRemoteCallExpression(fnCallback, "window", event.name, "this", "arguments");
        done();
        return;

        function fnCallback(win, fn, self, args) {
            var originalArgNames = annotate(fn),
                originalArgsByName = {},
                $delegate = {
                    fn: fn,
                    name: event.name,
                    self: self,
                    args: args
                },
                i;
            for(i = 0; i < args.length; i++) {
                originalArgsByName[originalArgNames[i]] = args[i];
            }
            fn.delegate = true;
            try {
                return injector.inject(intercept.callback, self, [originalArgsByName,
                {
                    $delegate: $delegate
                },
                win]);
            } finally {
                fn.delegate = false;
            }
        }
    }

    function findMatchingInterceptByName(fnName, scriptUrl) {
        var i,
            intercepts = runConfig.intercepts,
            fileName = urlParser.filenameFor(scriptUrl||'');

        if(intercepts) {
            for(i = 0; i < intercepts.length; i++) {
                if(intercepts[i].fn === fnName && intercepts[i].script === fileName) {
                    return intercepts[i];
                }
            }
        }
    }
});

uitest.define('run/ready', ['run/injector', 'global', 'run/logger'], function(injector, global, logger) {

	var sensorInstances = {};

	function addSensor(name, sensor) {
		sensorInstances[name] = sensor;
	}

	// Goal:
	// - Detect async work started by events that cannot be tracked
	//   (e.g. scroll event, hashchange event, popState event).
	// - Detect the situation where async work starts another async work
	//
	// Algorithm:
	// Wait until all readySensors did not change for 50ms.
	// Note: We already tested with 10ms, but that did not work well
	// for popState events...

	function ready(listener) {
		var sensorStatus;

		function restart() {
			sensorStatus = aggregateSensorStatus(sensorInstances);
			if(sensorStatus.busySensors.length !== 0) {
				logger.log("ready waiting for [" + sensorStatus.busySensors + "]");
				global.setTimeout(restart, 10);
			} else {
				global.setTimeout(ifNoAsyncWorkCallListenerElseRestart, 50);
			}
		}

		function ifNoAsyncWorkCallListenerElseRestart() {
			var currentSensorStatus = aggregateSensorStatus(sensorInstances);
			if(currentSensorStatus.busySensors.length === 0 && currentSensorStatus.count === sensorStatus.count) {
				logger.log("ready");
				injector.inject(listener);
			} else {
				restart();
			}
		}

		restart();
	}

	function aggregateSensorStatus(sensorInstances) {
		var count = 0,
			busySensors = [],
			sensorName, sensor, sensorStatus;
		for(sensorName in sensorInstances) {
			sensor = sensorInstances[sensorName];
			sensorStatus = sensor();
			count += sensorStatus.count;
			if(!sensorStatus.ready) {
				busySensors.push(sensorName);
			}
		}
		return {
			count: count,
			busySensors: busySensors
		};
	}

	return {
		addSensor: addSensor,
		ready: ready
	};
});
uitest.define('run/requirejsInstrumentor', ['run/eventSource', 'run/injector', 'run/logger', 'utils', 'run/testframe', 'urlParser'], function (eventSource, injector, logger, utils, testframe, urlParser) {
    var REQUIRE_JS_RE = /require[\W]/,
        eventHandlers = [];

    // Needs to be before any other listener for 'addAppends',
    // as it stops the event if the page is using requirejs.
    addAppendsSuppressor.priority = 99999;
    eventSource.on('addAppends', addAppendsSuppressor);

    eventSource.on('html:script:simple', checkAndHandleRequireJsScriptToken);

    return;

    function addAppendsSuppressor(event, done) {
        if (event.state && event.state.requirejs) {
            event.stop();
        }
        done();
    }

    function checkAndHandleRequireJsScriptToken(htmlEvent, htmlEventDone) {
        var token = htmlEvent.token,
            state = htmlEvent.state;

        if (!token.attrs.src || !token.attrs.src.match(REQUIRE_JS_RE)) {
            htmlEventDone();
            return;
        }
        logger.log("detected requirejs with script url " + token.attrs.src);

        var content = testframe.createRemoteCallExpression(function (win) {
            afterRequireJsScript(win);
        }, "window");

        // Used by addAppendsSuppressor to see if
        // requirejs is used.
        state.requirejs = true;
        htmlEvent.append.push({
            type: 'simple',
            name: 'script',
            attrs: {},
            content: content
        });
        htmlEventDone();
    }

    function afterRequireJsScript(win) {
        if (!win.require) {
            throw new Error("requirejs script was detected by url matching, but no global require function found!");
        }

        var _require = patchRequire(win);
        patchLoad(_require);
    }

    function patchRequire(win) {
        var _require = win.require;
        win.require = function (deps, originalCallback) {
            _require.onResourceLoad = win.require.onResourceLoad;
            _require(deps, function () {
                var depsValues = arguments;
                collectAndExecuteAppends(_require, win, function (error) {
                    if (error) {
                        throw error;
                    }
                    originalCallback.apply(win, depsValues);
                });
            });
        };
        win.require.config = _require.config;
        return _require;
    }

    function collectAndExecuteAppends(require, win, done) {
        logger.log("adding appends using requirejs");

        eventSource.emit({
            type: 'addAppends',
            handlers: []
        }, addAppendsDone);

        function addAppendsDone(error, addAppendsEvent) {
            var appends = addAppendsEvent.handlers,
                i = 0;
            if (error) {
                done(error);
            }
            logger.log("adding appends using requirejs");
            execNext();

            function execNext() {
                var append;
                if (i >= appends.length) {
                    done();
                } else {
                    append = appends[i++];
                    if (utils.isString(append)) {
                        require([append], execNext);
                    } else {
                        injector.inject(append);
                        execNext();
                    }
                }
            }
        }
    }

    function patchLoad(_require) {
        var _load = _require.load;
        _require.load = function (context, moduleName, url) {
            var self = this;
            var absUrl = urlParser.makeAbsoluteUrl(url, testframe.win().location.href);
            eventSource.emit({
                type: 'instrumentScript',
                src: absUrl,
                content: null,
                changed: false
            }, instrumentScriptDone);

            function instrumentScriptDone(error, instrumentScriptEvent) {
                var src = instrumentScriptEvent.src;
                if (error) {
                    //Set error on module, so it skips timeout checks.
                    context.registry[moduleName].error = true;
                    throw error;
                }
                if (instrumentScriptEvent.changed) {
                    try {
                        utils.evalScript(testframe.win(), src, instrumentScriptEvent.content);
                        context.completeLoad(moduleName);
                    } catch (e) {
                        //Set error on module, so it skips timeout checks.
                        context.registry[moduleName].error = true;
                        throw e;
                    }
                } else {
                    // use the src from the event
                    // so listeners are able to change this.
                    _load.call(self, context, moduleName, src);
                }
            }
        };
    }
});
uitest.define('run/scriptAdder', ['run/config', 'run/eventSource'], function(runConfig, eventSource) {
    addPrepends.priority = -100;
    eventSource.on('addPrepends', addPrepends);
    addAppends.priority = -100;
    eventSource.on('addAppends', addAppends);
    return;

    function addPrepends(event, done) {
        var i;
        for (i=0; i<runConfig.prepends.length; i++) {
            event.handlers.push(runConfig.prepends[i]);
        }
        done();
    }

    function addAppends(event, done) {
        var i;
        for (i=0; i<runConfig.appends.length; i++) {
            event.handlers.push(runConfig.appends[i]);
        }
        done();
    }
});
uitest.define('run/scriptInstrumentor', ['run/eventSource', 'fileLoader', 'run/logger', 'jsParser'], function(eventSource, fileLoader, logger, jsParser) {
    eventSource.on('instrumentScript', instrumentScript);

    return {
        jsParser: jsParser
    };

    function instrumentScript(event, done) {
        if (!event.content && event.src) {
            fileLoader(event.src, function(error, scriptContent) {
                if (error) {
                    done(error);
                } else {
                    scriptContentLoaded(scriptContent);
                }
            });
        } else {
            scriptContentLoaded(event.content);
        }

        function scriptContentLoaded(scriptContent) {
            jsParser({
                input: scriptContent,
                eventSource: eventSource,
                eventPrefix: 'js:',
                state: {
                    scriptUrl: event.src
                }
            }, jsTransformDone);

            function jsTransformDone(error, newScriptContent) {
                event.content = newScriptContent;
                event.changed = newScriptContent !== scriptContent;
                done(error, event);
            }
        }
    }
});
uitest.define('run/testframe', ['urlParser', 'global', 'run/injector', 'run/logger', 'utils', 'sniffer'], function(urlParser, global, injector, logger, utils, sniffer) {
    var WINDOW_ID = 'uitestwindow',
        BUTTON_ID = WINDOW_ID+'Btn',
        BUTTON_LISTENER_ID = BUTTON_ID+"Listener",
        frameElement,
        callbacks = {},
        nextCallbackId = 0;

    global.uitest.callbacks = callbacks;
    injector.addDefaultResolver(function(argName) {
        return getIframeWindow()[argName];
    });

    return {
        win: getIframeWindow,
        load: load,
        createRemoteCallExpression: createRemoteCallExpression
    };

    function getIframeWindow() {
        return frameElement.contentWindow || frameElement.contentDocument;
    }

    function load(url, html) {
        if (sniffer.history) {
            loadUsingHistoryApi(url, html);
        } else {
            loadWithoutHistoryApi(url, html);
        }
    }

    function loadUsingHistoryApi(url, html) {
        var fr, win;
        if (sniffer.documentWriteOnlyInOnload) {
            createFrame(urlParser.uitestUrl());
            win = getIframeWindow();
            utils.addEventListener(win, 'load', afterFrameCreate);
        } else {
            createFrame('');
            win = getIframeWindow();
            // Using doc.open/close empties the iframe, gives it a real url
            // and makes it different compared to about:blank!
            win.document.open();
            win.document.close();

            afterFrameCreate();
        }

        function afterFrameCreate() {
            var win = getIframeWindow();
            win.history.pushState(null, '', url);
            if (sniffer.browser.jsUrlWithPushState) {
                rewriteUsingJsUrl(win,html);
            } else {
                rewriteUsingDocOpen(win, html);
            }
        }
    }

    function loadWithoutHistoryApi(url, html) {
        createFrame(url);
        var win = getIframeWindow();
        utils.addEventListener(win, 'load', onload);
        deactivateWindow(win);

        function onload() {
            // Need to use javascript urls here to support xhtml,
            // as we loaded the document into the browser, and in xhtml
            // documents we can't open/write/close the document after this any more!
            // Note: Older browser (e.g. IE8) tend to implement js urls better
            // than new ones (e.g. FF oder Android) :-(
            rewriteUsingJsUrl(win, html);
        }
    }

    function createFrame(url) {
        var doc = global.document,
            wrapper,
            zIndex = 100;
        frameElement = doc.getElementById(WINDOW_ID);
        if (frameElement) {
            zIndex = frameElement.style.zIndex;
            frameElement.parentNode.removeChild(frameElement);
        }
        wrapper = doc.createElement("div");
        wrapper.innerHTML = '<iframe id="'+WINDOW_ID+'" '+
                            'src="'+url+'" '+
                            'width="100%" height="100%" '+
                            'style="position: absolute; top: 0; left: 0; background-color:white; border: 0px;"></iframe>';

        frameElement = wrapper.firstChild;
        frameElement.style.zIndex = zIndex;
        doc.body.appendChild(frameElement);

        createToggleButtonIfNeeded();

        return frameElement;
    }

    function createToggleButtonIfNeeded() {
        var doc = global.document,
            button = doc.getElementById(BUTTON_ID);

        if (button) {
            // resuse an existing button...
            return button;
        }
        var wrapper = doc.createElement("div");
        wrapper.innerHTML = '<button id="'+BUTTON_ID+'" '+
            'style="position: absolute; z-index: 1000; width: auto; top: 0; right: 0; cursor: pointer;" '+
            'onclick="('+toggleListener.toString()+')(\''+WINDOW_ID+'\');"'+
            '>Toggle testframe</button>';
        button = wrapper.firstChild;
        doc.body.appendChild(button);

        return button;

        function toggleListener(frameId) {
            var el = document.getElementById(frameId);
            el.style.zIndex = el.style.zIndex * -1;
        }
    }

    function rewriteUsingDocOpen(win, html) {
        // If the iframe already has a valid url,
        // wo don't want to change it by this rewrite.
        // By using an inline script this does what we want.
        // Calling win.document.open() directly would give the iframe
        // the url of the current window, i.e. a new url.
        win.newContent = html;
        var sn = win.document.createElement("script");
        sn.setAttribute("id", "rewriteScript");
        sn.setAttribute("type", "text/javascript");
        utils.textContent(sn, rewrite.toString()+';rewrite(window, window.newContent);');

        win.document.body.appendChild(sn);

        function rewrite(win, newContent) {
            /*jshint evil:true*/
            win.document.open();
            win.document.write(newContent);
            win.document.close();
        }
    }

    function rewriteUsingJsUrl(win, html) {
        win.newContent = html;
        /*jshint scripturl:true*/
        win.location.href = 'javascript:window.newContent';
    }

    function deactivateWindow(win) {
        var elProto = win.HTMLElement?win.HTMLElement.prototype:win.Element.prototype,
            docProto = win.HTMLDocument?win.HTMLDocument.prototype:win.Document.prototype,
            eventSources = [win, elProto, docProto],
            eventFnNames = [];

        noop(win, 'setTimeout');
        noop(win, 'clearTimeout');
        noop(win, 'setInterval');
        noop(win, 'clearInterval');
        win.XMLHttpRequest = noopXhr;
        if (win.attachEvent) {
            eventFnNames.push('attachEvent');
            eventFnNames.push('detachEvent');
        } else {
            eventFnNames.push('addEventListener');
            eventFnNames.push('removeEventListener');
        }
        var eventFnIndex, eventSourceIndex;
        for (eventFnIndex = 0; eventFnIndex<eventFnNames.length; eventFnIndex++) {
            for (eventSourceIndex=0; eventSourceIndex<eventSources.lenght; eventSourceIndex++) {
                noop(eventSources[eventSourceIndex], eventFnNames[eventFnIndex]);
            }
        }

        function noop(obj, name) {
            // Note: Preserve the toString() as some frameworks react on it
            // (e.g. requirejs...)
            var original = obj[name];
            var oldToString = ""+original;
            res.toString = function() {
                return oldToString();
            };
            obj[name] = res;
            return res;

            function res() { }
        }
        function noopXhr() {
            this.open=noop;
            this.send=noop;
            this.setRequestAttribute=noop;
            this.cancel=noop;
        }
    }

    function createRemoteCallExpression(callback) {
        var argExpressions = global.Array.prototype.slice.call(arguments, 1) || [],
            callbackId = nextCallbackId++;
        callbacks[callbackId] = callback;
        return "parent.uitest.callbacks[" + callbackId + "](" + argExpressions.join(",") + ");";
    }
});

uitest.define('sniffer', ['global'], function(global) {

    var browser = browserSniffer();
    return {
        browser: browser,
        history: !!global.history.pushState,
        // android has problems with internal caching when 
        // doing cors requests. So we need to do cache busting every time!
        // See http://opensourcehacker.com/2011/03/20/android-webkit-xhr-status-code-0-and-expires-headers/
        corsXhrForceCacheBusting: browser.android,
        // ff always returns false when calling dispatchEvent on links.
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=684208:        
        dispatchEventDoesNotReturnPreventDefault: browser.ff,
        // In FF, we can't just juse an empty iframe and rewrite
        // it's content, as then the history api will throw errors
        // whenever history.pushState is used within the frame.
        // We need to do doc.open/write/close in the onload event
        // to prevent this problem!        
        documentWriteOnlyInOnload: browser.ff,
        // Firefox does not support javascript urls for rewriting documents:
        // it does not revert back to the previous url
        // Android does not set the location correctly when
        // using js urls and a pushState before.
        jsUrlWithPushState: !browser.ff && !browser.android
    };

    function browserSniffer() {
        var useragent = global.navigator.userAgent.toLowerCase(),
            android = /android/i.test(useragent),
            ieMatch = /MSIE\s+(\d+)/i.exec(useragent),
            ff = /firefox/i.test(useragent);

        return {
            android: android,
            ie: ieMatch && parseInt(ieMatch[1],10),
            ff: ff
        };
    }
});
uitest.define('jasmineSugar', ['facade', 'global'], function(facade, global) {

    if (!global.jasmine) {
        return {};
    }

    function currentIdAccessor() {
        var ids = [],
            env = global.jasmine.getEnv(),
            spec = env.currentSpec,
            suite = env.currentSuite;
        // Note for the check of spec.queue.running:
        // Jasmine leaves env.currentSpec filled even if outside
        // of any spec from the last run!
        if (spec && spec.queue.running) {
            ids.unshift("sp"+spec.id);
            suite = spec.suite;
        }
        while (suite) {
            ids.unshift("su"+suite.id);
            suite = suite.parentSuite;
        }
        return ids.join(".");
    }

    facade.currentIdAccessor(currentIdAccessor);

    function runs(callback, timeout) {
        var ready = false;
        global.runs(function() {
            facade.current.ready(function() {
                ready = true;
            });
        });
        global.waitsFor(function() {
            return ready;
        }, "uitest.ready", timeout);
        global.runs(function() {
            facade.current.inject(callback);
        });
    }

    return {
        currentIdAccessor: currentIdAccessor,
        runs: runs,
        global: {
            uitest: {
                current: {
                    runs: runs
                }
            }
        }
    };
});
uitest.define('urlParser', ['global'], function (global) {
    var URL_RE = /(((\w+)\:)?\/\/([^\/]+))?([^\?#]*)(\?([^#]*))?(#.*)?/,
        UI_TEST_RE = /(uitest)[^\w\/][^\/]*$/,
        NUMBER_RE = /^\d+$/;

    return {
        parseUrl:parseUrl,
        serializeUrl:serializeUrl,
        isAbsoluteUrl: isAbsoluteUrl,
        makeAbsoluteUrl: makeAbsoluteUrl,
        filenameFor: filenameFor,
        uitestUrl: uitestUrl,
        cacheBustingUrl: cacheBustingUrl
    };

    function parseUrl(url) {
        var match = url.match(URL_RE);
        return {
            protocol: match[3] || '',
            domain: match[4] || '',
            path: match[5] || '',
            query: match[7] ? match[7].split('&'):[],
            hash: match[8]?match[8].substring(1):undefined
        };
    }

    function serializeUrl(parsedUrl) {
        var res = [];
        if (parsedUrl.protocol) {
            res.push(parsedUrl.protocol);
            res.push(":");
        }
        if (parsedUrl.domain) {
            res.push("//");
            res.push(parsedUrl.domain);
        }
        if (parsedUrl.path) {
            res.push(parsedUrl.path);
        }
        if (parsedUrl.query && parsedUrl.query.length) {
            res.push('?');
            res.push(parsedUrl.query.join('&'));
        }
        if (typeof parsedUrl.hash === "string") {
            res.push('#');
            res.push(parsedUrl.hash);
        }
        return res.join('');
    }

    function uitestUrl() {
        var scriptNodes = global.document.getElementsByTagName("script"),
            i, src;
        for(i = 0; i < scriptNodes.length; i++) {
            src = scriptNodes[i].src;
            if(src && src.match(UI_TEST_RE)) {
                return src;
            }
        }
        throw new Error("Could not locate uitest.js in the script tags of the browser");
    }

    function basePath(url) {
        var lastSlash = url.lastIndexOf('/');
        if(lastSlash === -1) {
            return '';
        }
        return url.substring(0, lastSlash);
    }

    function makeAbsoluteUrl(url, baseUrl) {
        if(isAbsoluteUrl(url)) {
            return url;
        }
        var parsedBase = parseUrl(baseUrl);
        var parsedUrl = parseUrl(url);
        parsedUrl.protocol = parsedBase.protocol;
        parsedUrl.domain = parsedBase.domain;
        parsedUrl.path = basePath(parsedBase.path) + '/' + parsedUrl.path;
        return serializeUrl(parsedUrl);
    }

    function isAbsoluteUrl(url) {
        return url.charAt(0) === '/' || url.indexOf('://') !== -1;
    }

    function filenameFor(url) {
        var parsedUrl = parseUrl(url),
            path = parsedUrl.path;
        var lastSlash = path.lastIndexOf('/');
        if(lastSlash !== -1) {
            return path.substring(lastSlash + 1);
        }
        return path;
    }

    function cacheBustingUrl(url, timestamp) {
        var parsedUrl = parseUrl(url),
            query = parsedUrl.query,
            i, foundOldEntry = false;
        for (i = 0; i < query.length && !foundOldEntry; i++) {
            if (query[i].match(NUMBER_RE)) {
                query[i] = timestamp;
                foundOldEntry = true;
            }
        }
        if (!foundOldEntry) {
            query.push(timestamp);
        }
        return serializeUrl(parsedUrl);
    }
});
(function() {
    // Note: We only want to call this once,
    // and not on every module instantiation!
    var now = new Date().getTime();

    uitest.define('utils', ['global'], function(global) {
        return {
            isString: isString,
            isFunction: isFunction,
            isArray: isArray,
            testRunTimestamp: testRunTimestamp,
            asyncLoop: asyncLoop,
            orderByPriority: orderByPriority,
            evalScript: evalScript,
            addEventListener: addEventListener,
            removeEventListener: removeEventListener,
            textContent: textContent,
            multiRegex: multiRegex,
            noop: noop
        };

        function noop() {

        }

        function isString(obj) {
            return !!(obj && obj.slice && !obj.splice);
        }

        function isFunction(value) {
            return typeof value === 'function';
        }

        function isArray(value) {
            return global.Object.prototype.toString.apply(value) === '[object Array]';
        }

        function testRunTimestamp() {
            return now;
        }

        function compareByPriority(entry1, entry2) {
            return (entry2.priority || 0) - (entry1.priority || 0);
        }

        function orderByPriority(arr) {
            arr.sort(compareByPriority);
            return arr;
        }

        function asyncLoop(items, handler, loopDone) {
            var i = 0,
                steps = [],
                trampolineRunning = false;

            nextStep();

            // We are using the trampoline pattern from lisp here,
            // to prevent long stack calls when the handler
            // is calling handlerDone in sync!

            function trampoline() {
                if (trampolineRunning) {
                    return;
                }
                trampolineRunning = true;
                while (steps.length) {
                    execStep(steps.shift());
                }
                trampolineRunning = false;
            }

            function execStep(step) {
                handler(step, handlerDone);

                function handlerDone(error) {
                    if (error || step.stopped) {
                        loopDone(error);
                    } else {
                        nextStep();
                    }
                }
            }

            function nextStep() {
                var step;
                if (i < items.length) {
                    i++;
                    step = {
                        item: items[i - 1],
                        index: i - 1,
                        stop: function() {
                            step.stopped = true;
                            this.stopped = true;
                        }
                    };
                    steps.push(step);
                    trampoline();
                } else {
                    loopDone();
                }
            }
        }

        function evalScript(win, scriptUrl, scriptContent) { /*jshint evil:true*/
            if (scriptUrl) {
                scriptContent += "//@ sourceURL=" + scriptUrl;
            }
            win["eval"].call(win, scriptContent);
        }

        function addEventListener(target, type, callback) {
            if (target.nodeName && target.nodeName.toLowerCase() === 'iframe' && type === 'load') {
                // Cross browser way for onload iframe handler
                if (target.attachEvent) {
                    target.attachEvent('onload', callback);
                } else {
                    target.onload = callback;
                }
            } else if (target.addEventListener) {
                target.addEventListener(type, callback, false);
            } else {
                target.attachEvent("on" + type, callback);
            }
        }

        function removeEventListener(target, type, callback) {
            if (target[type] === callback) {
                target[type] = null;
            }
            if (target.removeEventListener) {
                target.removeEventListener(type, callback, false);
            } else {
                target.detachEvent("on" + type, callback);
            }
        }

        function textContent(el, val) {
            if ("text" in el) {
                el.text = val;
            } else {
                if ("innerText" in el) {
                    el.innerHTML = val;
                } else {
                    el.textContent = val;
                }
            }
        }

        function multiRegex(specs, flags) {
            return {
                regex: createRegex(),
                parseMatch: parseMatch
            };

            function createRegex() {
                var reParts = [],
                    i;
                for (i = 0; i < specs.length; i++) {
                    reParts.push(specs[i].re);
                }
                return new RegExp("(" + reParts.join(')|(') + ")", flags);
            }

            function parseMatch(match) {
                var reParts = [],
                    i, groupIndex = 1;
                for (i = 0; i < specs.length; i++) {
                    if (match[groupIndex]) {
                        return {
                            spec: specs[i],
                            match: match.slice(groupIndex)
                        };
                    }
                    groupIndex += specs[i].groupCount + 1;
                }
                throw new Error("Internal Error: Could not find the spec for the match " + match);

            }
        }

    });

})();
(function () {
    uitest.require(["facade", "jasmineSugar"]);
})();
