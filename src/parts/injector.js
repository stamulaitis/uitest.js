uitest.define('injector', [], function() {

	// Copied from https://github.com/angular
	var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
	var FN_ARG_SPLIT = /,/;
	var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
	var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;

	function annotate(fn) {
		var $inject, fnText, argDecl, last, args, i;

		if(typeof fn == 'function') {
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
		} else if(isArray(fn)) {
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

	function inject(fn, self, values) {
		var argNames = annotate(fn),
			argValues = [],
			i;
		fn = isArray(fn)?fn[fn.length-1]:fn;
		for (i=0; i<argNames.length; i++) {
			argValues.push(findValue(argNames[i]));
		}
		return fn.apply(self, argValues);

		function findValue(argName) {
			var i;
			for (i=0; i<values.length; i++) {
				if (argName in values[i]) {
					return values[i][argName];
				}
			}
			return undefined;
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
		if(acceptArrayAnnotation && isArray(arg)) {
			arg = arg[arg.length - 1];
		}

		assertArg(isFunction(arg), name, 'not a function, got ' + (arg && typeof arg == 'object' ? arg.constructor.name || 'Object' : typeof arg));
		return arg;
	}

	function isFunction(value) {
		return typeof value == 'function';
	}

	function isArray(value) {
		return toString.apply(value) == '[object Array]';
	}


	return {
		annotate: annotate,
		inject: inject
	};
});