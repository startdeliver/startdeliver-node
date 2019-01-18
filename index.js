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
	this.settings.apiUrl += (this.settings.version + '/');

	if (this.settings.appApi) {
		this.settings.apiUrl += 'app/';
	}
};

Startdeliver.prototype.setApiKey = function(apiKey) {
	this.settings.apiKey = apiKey;
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

	if (self.settings.apiKey) {
		config.headers.Authorization = self.settings.apiKey;
	}

	/* eslint-disable */
	if (typeof window === undefined) {
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

	this.debug('config', config);

	return new Promise((resolve, reject) => {
		axios(config)
			.then((res) => {
				this.debug('res', (res ? { data: res.data, status: res.status, headers: res.headers } : null));

				return cb ? cb(null, res.data) : resolve(res.data);

			})
			.catch((err) => {
				this.debug('err', (err && err.response ? { data: err.response.data, status: err.response.status, headers: err.response.headers, sent: err.response.config } : null));
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

	if (!arguments[0]) {
		throw new Error('Invalid arguments for login method');
	}

	if (typeof arguments[0] === 'object') {
		username = arguments[0].username || arguments[0].user || arguments[0].email || arguments[0].u;
		password = arguments[0].password || arguments[0].pass || arguments[0].p;
		remember = arguments[0].remember || arguments[0].r || false;
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
			remember: remember ? true : false
		}
	};

	return new Promise((resolve, reject) => {

		self.doRequest(opts).then((res) => {

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
						opts.endpoint += (key + '>=' + (params[key] + 1));
					}
					if (params[key].hasOwnProperty('gte')) {
						opts.endpoint += (key + '>=' + (params[key]));
					}
					if (params[key].hasOwnProperty('lt')) {
						opts.endpoint += (key + '<=' + (params[key] - 1));
					}
					if (params[key].hasOwnProperty('lte')) {
						opts.endpoint += (key + '<=' + (params[key]));
					}
					if (params[key].hasOwnProperty('eq')) {
						opts.endpoint += (key + '=' + params[key]);
					}
					if (params[key].hasOwnProperty('ne')) {
						opts.endpoint += (key + '!=' + params[key]);
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
			}
			opts.endpoint += '?query=' + encodeURIComponent(JSON.stringify(params));
		}
	}

	return self.doRequest(opts);
};

Startdeliver.prototype.findOne = function (entity, params) {
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;
	const id = typeof params === 'number' ? params : null;

	params = params || {};

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
			params.limit = 500;
			params.offset = offset;

			self.get(entity, params, function (err, res) {
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
		body: params.body
	};

	return self.doRequest(opts);

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
					authHeader.Authorization = authHeader.Authorization.substr(0,5) + ' ******* masking-rest-of-the-api-key *******';
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
