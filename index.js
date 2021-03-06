const axios = require('axios');

const Startdeliver = function (settings) {

	if (settings && typeof settings === 'object') {
		settings = JSON.parse(JSON.stringify(settings));
	}

	this.settings = settings || {};

	if (typeof this.settings === 'string') {
		this.settings = {
			apiKey: this.settings
		};
	}

	this.settings.headers = {};

	if (this.settings.account) {
		this.settings.apiKey = this.settings.account.apiKey;
	}

	this.settings.version = this.settings.version || 'v1';
	this.settings.apiUrl = this.settings.apiUrl || 'https://app.startdeliver.com/';
	this.settings.debug = this.settings.debug || false;
	this.settings.debugOnlyError = this.settings.debugOnlyError || false;
	this.settings.debugShowApiKey = this.settings.debugShowApiKey || false;
	this.settings.stripUpdatedFields = this.settings.stripUpdatedFields || true;

	if (this.settings.apiUrl.slice(-1) !== '/') {
		this.settings.apiUrl = this.settings.apiUrl + '/';
	}

	this.settings.apiUrl += 'api/';
	this.settings.apiBaseUrl = this.settings.apiUrl;
	this.settings.apiUrl += (this.settings.version + '/');

	if (this.settings.apiKey && this.settings.apiKey.indexOf('appapi') === 0) {
		this.settings.appApi = true;
	}

	if (this.settings.appApi) {
		this.settings.apiUrl += 'app/';
	}
};

Startdeliver.prototype.setApiKey = function(apiKey) {
	this.settings.apiKey = apiKey;
};

Startdeliver.prototype.setConfig = function(key, value) {
	this.settings[key] = value;
};

Startdeliver.prototype.setDefaultHeader = function(header, str) {
	this.settings.headers[header] = str;
};

Startdeliver.prototype.removeDefaultHeader = function(header) {
	delete this.settings.headers[header];
};

Startdeliver.prototype.setToken = this.setApiKey;

Startdeliver.prototype.doRequest = function (opts) {
	const self = this;
	const cb = opts.cb;

	if (opts.endpoint[0] === '/') {
		opts.endpoint = opts.endpoint.split('/')[1];
	}

	const config = {
		method: opts.method || 'get',
		url: this.settings.apiUrl + opts.endpoint,
		data: opts.body || null,
		timeout: 120 * 1000,
		withCredentials: true,
		headers: JSON.parse(JSON.stringify(this.settings.headers)),
	};

	if (opts.headers) {
		Object.keys(opts.headers).forEach((header) => {
			config.headers[header] = opts.headers[header];
		});
	}

	if (opts.endpoint.indexOf('service/') === 0 || opts.endpoint.indexOf('app/') === 0) {
		config.url = this.settings.apiBaseUrl + opts.endpoint;
	}

	if (self.settings.apiKey) {
		config.headers.Authorization = self.settings.apiKey;
	}

	/* eslint-disable */
	if (typeof window === 'undefined') {
		/* eslint-enable */
		config.headers['User-Agent'] = config.headers['User-Agent'] || 'Startdeliver-JS';
	}

	if (config.data && this.settings.stripUpdatedFields) {
		if (config.data.updatedAt) {
			config.data.updatedAt = undefined;
		}
		if (config.data.updatedBy) {
			config.data.updatedBy = undefined;
		}
	}

	if (opts.pipe) {
		config.responseType = 'stream';
	}

	this.debug('config', config);

	return new Promise((resolve, reject) => {

		axios(config)
			.then((res) => {
				if (opts.pipe && typeof window === 'undefined') {
					this.debug('res pipe', (res ? { path: opts.pipe, status: res.status, headers: res.headers } : null));
					res.data.pipe(require('fs').createWriteStream(opts.pipe));
					res.data.on('end', () => {
						cb ? cb() : resolve();
					});
					return;
				}

				this.debug('res', (res ? { data: res.data, status: res.status, headers: res.headers } : null));

				return cb ? cb(null, res.data) : resolve(res.data);

			})
			.catch((err) => {
				this.debug('err', (err && err.response ? { data: opts.pipe ? null : err.response.data, status: err.response.status, headers: err.response.headers, sent: err.response.config } : null));
				if (err.response) {
					err = { statusCode: err.response.status, data: err.response.data };

					if (err.statusCode === 401) {
						if (self.onUnauthorized && typeof self.onUnauthorized === 'function') {
							self.onUnauthorized(opts.endpoint);
						}
					}
				}

				return cb ? cb(err) : reject(err);

			});

	});

};

Startdeliver.prototype.login = function () {
	const self = this;
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;

	let username;
	let password;
	let remember = false;
	let setCookie = false;

	if (!arguments[0]) {
		throw new Error('Invalid arguments for login method');
	}

	if (typeof arguments[0] === 'object') {
		username = arguments[0].username || arguments[0].user || arguments[0].email || arguments[0].u;
		password = arguments[0].password || arguments[0].pass || arguments[0].p;
		remember = arguments[0].remember || arguments[0].r || false;
		setCookie = arguments[0].setCookie;
	} else {
		username = arguments[0];
		password = arguments[1];
		remember = arguments[2];
	}

	const opts = {
		endpoint: 'login',
		method: 'post',
		body: {
			email: username,
			password: password,
			remember: remember ? true : false,
			setCookie: setCookie
		}
	};

	return new Promise((resolve, reject) => {

		self.doRequest(opts).then((res) => {

			if (!setCookie) {
				self.setApiKey(res.apiKey);
			}

			return cb ? cb(null, res) : resolve(res);

		}).catch(cb ? cb : reject);

	});

};


Startdeliver.prototype.get = function (entity, params) {
	const self = this;
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;
	const id = typeof params === 'number' ? params : null;

	const opts = {
		cb: cb,
		endpoint: entity + (id ? ('/' + id) : ''),
		method: 'get'
	};

	if (params && typeof params === 'object') {

		if (this.settings.appApi) {

			Object.keys(params).forEach(function (key) {

				if (opts.endpoint.indexOf('?') === -1) {
					opts.endpoint += '?';
				} else {
					opts.endpoint += '&';
				}

				if (params[key] && typeof params[key] === 'object') {
					if (params[key].hasOwnProperty('gt')) {
						opts.endpoint += (key + '>=' + (params[key].gt + 1));
					}
					if (params[key].hasOwnProperty('gte')) {
						opts.endpoint += (key + '>=' + (params[key].gte));
					}
					if (params[key].hasOwnProperty('lt')) {
						opts.endpoint += (key + '<=' + (params[key].lt - 1));
					}
					if (params[key].hasOwnProperty('lte')) {
						opts.endpoint += (key + '<=' + (params[key].lte));
					}
					if (params[key].hasOwnProperty('eq')) {
						opts.endpoint += (key + '=' + params[key].eq);
					}
					if (params[key].hasOwnProperty('ne')) {
						opts.endpoint += (key + '!=' + params[key].ne);
					}
				} else {
					opts.endpoint += (key + '=' + params[key]);
				}

			});

		} else {

			if (!params.filter) {
				params = {
					filter: params
				};
				if (params.filter.hasOwnProperty('limit')) {
					params.limit = params.filter.limit;
					params.filter.limit = undefined;
				}
				if (params.filter.hasOwnProperty('offset')) {
					params.offset = params.filter.offset;
					params.filter.offset = undefined;
				}
				if (params.filter.hasOwnProperty('flat')) {
					params.flat = params.filter.flat;
					params.filter.flat = undefined;
				}
				if (params.filter.hasOwnProperty('sort')) {
					params.sort = params.filter.sort;
					params.filter.sort = undefined;
				}
				if (params.filter.hasOwnProperty('report')) {
					params.report = params.filter.report;
					params.filter.report = undefined;
				}
				if (params.filter.hasOwnProperty('expand')) {
					params.expand = params.filter.expand;
					params.filter.expand = undefined;
				}
				if (params.filter.hasOwnProperty('history')) {
					params.history = params.filter.history;
					params.filter.history = undefined;
				}
			}

			opts.endpoint += '?query=' + encodeURIComponent(JSON.stringify(params));

			if (opts.endpoint.length > 7500) {
				opts.headers = { 'X-HTTP-Method-Override': 'GET' };
				opts.method = 'post';
				opts.body = { query: params };
				opts.endpoint = opts.endpoint.split('?query=')[0];
			}

		}
	}

	return self.doRequest(opts);
};

Startdeliver.prototype.findOne = function (entity, params) {
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;
	const id = typeof params === 'number' ? params : null;

	params = params || {};
	params = JSON.parse(JSON.stringify(params));

	if (id) {
		return this.get(entity, params);
	}
	params.limit = 1;

	return new Promise((resolve, reject) => {
		this.get(entity, params, function (err, res) {
			if (err) {
				return cb ? cb(err) : reject(err);
			}
			if (!res.result[0]) {
				return cb ? cb(null, null) : resolve(null);
			}
			return cb ? cb(null, res.result[0]) : resolve(res.result[0]);
		});
	});

};

Startdeliver.prototype.findAll = function (entity, params) {
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;
	const self = this;

	params = params || {};

	let result = [];

	return new Promise((resolve, reject) => {

		if (entity === 'usage') {
			const err = 'findAll not available for entity usage';
			return cb ? cb(err) : reject(err);
		}

		function getMatches(offset) {
			const paramsCopy = JSON.parse(JSON.stringify(params));
			paramsCopy.limit = 500;
			paramsCopy.offset = offset;

			self.get(entity, paramsCopy, function (err, res) {
				if (err) {
					return cb ? cb(err) : reject(err);
				}

				result = result.concat(res.result);

				if (res.result.length === 500) {
					return getMatches(offset + 500);
				}

				return cb ? cb(null, result) : resolve(result);
			});

		}
		getMatches(0);

	});

};



Startdeliver.prototype.findWithHistory = function (entity, params, history) {
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;
	const self = this;

	function getHistory (tmpObj, history, historyParams, i, historyCb) {

		let currentHistory = history[i];

		historyParams.history = currentHistory === 'now' ? null : currentHistory;

		self.find(entity, historyParams, function (err, res) {
			if (err) {
				return historyCb(err);
			}
			if (i === history.length) {
				return historyCb();
			}

			for (let i = 0; i < res.result.length; i++) {
				tmpObj[res.result[i].id].$history[currentHistory] = res.result[i];
			}

			return getHistory(tmpObj, history, historyParams, i + 1, historyCb);

		});
	}


	return new Promise((resolve, reject) => {

		if (!history) {
			const err = 'no history item provided';
			return cb ? cb(err) : reject(err);
		}

		if (!Array.isArray(history)) {
			history = [history];
		}

		if (entity !== 'customer') {
			const err = 'findWithHistory only available for entity customer';
			return cb ? cb(err) : reject(err);
		}

		self.find(entity, params, (err, res) => {
			if (err) {
				return cb ? cb(err) : reject(err);
			}

			const historyParams = {
				filter: {
					id: []
				}
			};

			const tmpObj = {};

			for (let i = 0; i < res.result.length; i++) {
				historyParams.filter.id.push(res.result[i].id);
				tmpObj[res.result[i].id] = res.result[i];
				res.result[i].$history = {};
			}

			historyParams.limit = res.result.length;

			getHistory(tmpObj, history, historyParams, 0, function (err) {
				if (err) {
					return cb ? cb(err) : reject(err);
				}
				return cb ? cb(null, res) : resolve(res);
			});

		});

	});

};

Startdeliver.prototype.save = function (entity, params) {
	const self = this;
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;
	const id = params.id;

	const opts = {
		cb: cb,
		endpoint: entity + (id ? ('/' + id) : ''),
		method: id ? 'patch' : 'post',
		body: params
	};

	return self.doRequest(opts);
};

Startdeliver.prototype.patch = function (entity, params) {
	const self = this;
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;
	const id = params.id;

	const opts = {
		cb: cb,
		endpoint: entity + (id ? ('/' + id) : ''),
		method: 'patch',
		body: params
	};

	return self.doRequest(opts);
};

Startdeliver.prototype.replace = function (entity, params) {
	const self = this;
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;
	const id = params.id;

	const opts = {
		cb: cb,
		endpoint: entity + '/' + (id ? id : ''),
		method: 'put',
		body: params
	};

	return self.doRequest(opts);

};


Startdeliver.prototype.delete = function (entity, id) {
	const self = this;
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;

	if (id && typeof id === 'object') {
		id = id.id;
	}

	const opts = {
		cb: cb,
		endpoint: entity + '/' + (id ? id : ''),
		method: 'delete'
	};

	return self.doRequest(opts);

};

Startdeliver.prototype.me = function () {
	return this.get('me');
};

Startdeliver.prototype.raw = function (params) {
	const self = this;
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;

	const opts = {
		cb: cb,
		endpoint: params.endpoint,
		method: params.method || 'get',
		headers: params.headers,
		body: params.body
	};

	return self.doRequest(opts);

};


Startdeliver.prototype.download = function (fileId, params) {
	const self = this;
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;

	const opts = {
		cb: cb,
		endpoint: 'download' + '/' + fileId,
		method: 'get'
	};

	if (typeof params === 'string') {
		params = {
			path: params
		};
	}
	params = params || {};

	return new Promise((resolve, reject) => {

		self.findOne('file', fileId).then(function (file) {

			if (!file) {
				return (cb ? cb('No such file') : reject('No such file'));
			}

			if (params.path) {
				if (params.path[0] === '/' || params.path.indexOf('./') === 0) {
					opts.pipe = params.path;
				} else {
					opts.pipe = ('./' + params.path);
				}
			} else {
				opts.pipe = ('./' + file.name);
			}

			if (params.byteEnd) {
				opts.endpoint += ('?byteStart=' + params.byteStart);
				opts.endpoint += ('&byteEnd=' + params.byteEnd);
			}
			console.log(opts);
			return self.doRequest(opts);

		}).then(function (res) {
			cb ? cb(null, res) : resolve(res);
		}).catch(function (err) {
			cb ? cb(err) : reject(err);
		});

	});

};



Startdeliver.prototype.use = function (m) {
	Object.keys(m).forEach((key) => {
		Startdeliver.prototype[key] = m[key];
	});
};

Startdeliver.prototype.debug = function (msg, obj) {

	if (this.settings && this.settings.debug) {

		if (this.settings.debugOnlyError) {
			if (msg !== 'err') {
				return;
			}
		}

		let objCopy;

		if (obj) {
			objCopy = JSON.parse(JSON.stringify(obj));
			if (objCopy.url) {
				objCopy.urlDecoded = decodeURIComponent(objCopy.url);
			}

			if (!this.settings.debugShowApiKey) {
				let authHeader;

				if (objCopy && typeof objCopy === 'object' && objCopy.headers) {
					authHeader = objCopy.headers;
				}
				if (objCopy && typeof objCopy === 'object' && objCopy.sent && objCopy.sent.headers) {
					authHeader = objCopy.sent.headers;
				}
				if (authHeader.Authorization) {
					authHeader.Authorization = authHeader.Authorization.substr(0,9) + ' ******* masking-rest-of-the-api-key *******';
				}
			}
		}

		console.log();
		console.log('----- startdeliver-node debug -----');
		console.log(msg);
		console.log(JSON.stringify(objCopy, null, '  '));
		console.log('-----------------------------------');
		console.log();

	}

};

Startdeliver.prototype.find = Startdeliver.prototype.get;
Startdeliver.prototype.create = Startdeliver.prototype.save;
Startdeliver.prototype.update = Startdeliver.prototype.save;
Startdeliver.prototype.post = Startdeliver.prototype.save;
Startdeliver.prototype.patch = Startdeliver.prototype.patch;
Startdeliver.prototype.put = Startdeliver.prototype.replace;
Startdeliver.prototype.remove = Startdeliver.prototype.delete;

module.exports = Startdeliver;
