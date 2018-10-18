const axios = require('axios');

const Startdeliver = function (settings) {
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
	this.settings.apiUrl = this.settings.apiUrl || 'https://api.startdeliver.com/';
	this.settings.debug = this.settings.debug || false;
	this.settings.debugShowApiKey = this.settings.debugShowApiKey || false;

	if (this.settings.apiUrl.slice(-1) !== '/') {
		this.settings.apiUrl = this.settings.apiUrl + '/';
	}
	this.settings.apiUrl += 'api/';
	this.settings.apiUrl += (this.settings.version + '/');
};

Startdeliver.prototype.setApiKey = function(apiKey) {
	this.settings.apiKey = apiKey;
};

Startdeliver.prototype.setDefaultHeader = function(header, str) {
	this.settings.headers[header] = str;
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

	this.debug('config', config);

	return new Promise((resolve, reject) => {
		axios(config)
			.then((res) => {
				this.debug('res', res);
				return cb ? cb(null, res.data) : resolve(res.data);

			})
			.catch((err) => {
				this.debug('err', err);
				err = { statusCode: err.response.status, data: err.response.data };
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
		if (!params.filter) {
			params = {
				filter: params
			};
			if (params.filter.limit) {
				params.limit = params.filter.limit;
				delete params.filter.limit;
			}
			if (params.filter.offset) {
				params.offset = params.filter.offset;
				delete params.filter.offset;
			}
			if (params.filter.flat) {
				params.flat = params.filter.flat;
				delete params.filter.flat;
			}
			if (params.filter.sort) {
				params.sort = params.filter.sort;
				delete params.filter.sort;
			}
			if (params.filter.report) {
				params.report = params.filter.report;
				delete params.filter.report;
			}
			if (params.filter.expand) {
				params.expand = params.filter.expand;
				delete params.filter.expand;
			}
		}
		opts.endpoint += '?query=' + encodeURIComponent(JSON.stringify(params));
	}

	return self.doRequest(opts);
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

Startdeliver.prototype.replace = function (entity, params) {
	const self = this;
	const cb = typeof arguments[arguments.length - 1] === 'function' ? arguments[arguments.length - 1] : null;
	const id = params.id;

	const opts = {
		cb: cb,
		endpoint: entity + '/' + id,
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
		endpoint: entity + '/' + id,
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

		let objCopy = JSON.parse(JSON.stringify(obj));

		if (!this.settings.debugShowApiKey) {
			if (objCopy && typeof objCopy === 'object' && objCopy.headers && objCopy.headers.Authorization) {
				objCopy.headers.Authorization = objCopy.headers.Authorization.substr(0,5) + ' ******* masking-rest-of-the-api-key *******';
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
Startdeliver.prototype.patch = Startdeliver.prototype.save;
Startdeliver.prototype.put = Startdeliver.prototype.replace;
Startdeliver.prototype.remove = Startdeliver.prototype.delete;

module.exports = Startdeliver;
