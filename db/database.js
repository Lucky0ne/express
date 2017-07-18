https://jsao.io/2015/03/making-a-wrapper-module-for-the-node-js-driver-for-oracle-database/

    var oracledb = require('oracledb');
var async = require('async');
var pool;
var schema;

const
    OBJECT = oracledb.OBJECT,
    ARRAY = oracledb.ARRAY,
    BIND_IN = oracledb.BIND_IN,
    BIND_INOUT = oracledb.BIND_INOUT,
    BIND_OUT = oracledb.BIND_OUT,
    BLOB = oracledb.BLOB,
    CLOB = oracledb.CLOB,
    BUFFER = oracledb.BUFFER,
    DATE = oracledb.DATE,
    NUMBER = oracledb.NUMBER,
    STRING = oracledb.STRING,
    DEFAULT = oracledb.DEFAULT,
    CURSOR = oracledb.CURSOR;

module.exports.OBJECT = OBJECT;
module.exports.ARRAY = ARRAY;

module.exports.BIND_IN = BIND_IN;
module.exports.BIND_INOUT = BIND_INOUT;
module.exports.BIND_OUT = BIND_OUT;

module.exports.BLOB = BLOB;  // Bind a BLOB to a Node.js Stream
module.exports.CLOB = CLOB;  // Bind a CLOB to a Node.js Stream
module.exports.BUFFER = BUFFER; // Bind a RAW to a Node.js Buffer
module.exports.DATE = DATE; // Bind as JavaScript date type.  Can also be used for fetchAsString and fetchInfo
module.exports.NUMBER = NUMBER; // Bind as JavaScript number type.  Can also be used for fetchAsString and fetchInfo
module.exports.STRING = STRING; // Bind as JavaScript string type
module.exports.DEFAULT = DEFAULT; //Used with fetchInfo to reset the fetch type to the database type
module.exports.CURSOR = CURSOR; // Bind a REF CURSOR to a node-oracledb ResultSet class


module.exports.OBJECT = oracledb.OBJECT;

function createPool(config, dbschema) {
    return new Promise(function (resolve, reject) {
        oracledb.fetchAsString = [oracledb.CLOB];
        oracledb.createPool(
            config,
            function (err, p) {
                if (err) {
                    return reject(err);
                }
                pool = p;
                schema = dbschema;
                resolve(pool);
            }
        );
    });
}

module.exports.createPool = createPool;

function terminatePool() {
    return new Promise(function (resolve, reject) {
        if (pool) {
            pool.terminate(function (err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        } else {
            resolve();
        }
    });
}

module.exports.terminatePool = terminatePool;

function getPool() {
    return pool;
}

module.exports.getPool = getPool;

function getConnection() {
    return new Promise(function (resolve, reject) {
        pool.getConnection(function (err, connection) {
            if (err) {
                return reject(err);
            }
            connection.execute(
                "alter session set CURRENT_SCHEMA = " + schema,
                {}, {},
                function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve(connection);
                }
            );
        });
    });
}

module.exports.getConnection = getConnection;

function execute(sql, bindParams, options, connection) {
    return new Promise(function (resolve, reject) {
        connection.execute(sql, bindParams, options, function (err, results) {
            if (err) {
                return reject(err);
            }
            resolve(results);
        });
    });
}

module.exports.execute = execute;

function releaseConnection(connection) {
    connection.release(function (err) {
        if (err) {
            console.error(err);
        }
    });
}

module.exports.releaseConnection = releaseConnection;

function simpleExecute(sql, bindParams, options) {
    options.isAutoCommit = true;

    return new Promise(function (resolve, reject) {
        getConnection()
            .then(function (connection) {
                execute(sql, bindParams, options, connection)
                    .then(function (results) {
                        resolve(results);

                        process.nextTick(function () {
                            releaseConnection(connection);
                        });
                    })
                    .catch(function (err) {
                        reject(err);

                        process.nextTick(function () {
                            releaseConnection(connection);
                        });
                    });
            })
            .catch(function (err) {
                reject(err);
            });
    });
}

module.exports.simpleExecute = simpleExecute;

/**
 * Выполнение хранимой процедуры
 * @param params
 * @param params.sql
 * @param params.binds
 * @param params.params.sessionID
 * @param params.results
 * @returns {Promise}
 */
function execProc(params) {
    return new Promise(function (resolve, reject) {
        getConnection().then(function (connection) {
            execute(
                "begin\n" +
                "  PKG_SESSION.VALIDATE_WEB(SCONNECT => :SCONNECT);\n" +
                "end;",
                {
                    SCONNECT: {dir: BIND_IN, type: STRING, maxSize: 255, val: params.sessionID}
                },
                {},
                connection
            ).then(function () {
                execute(
                    params.sql,
                    params.binds,
                    {isAutoCommit: true},
                    connection
                ).then(function (result) {
                    params.results = result.outBinds;
                    resolve(params);
                    process.nextTick(function () {
                        releaseConnection(connection);
                    });
                })
            }).catch(function (err) {
                reject(err);
                process.nextTick(function () {
                    releaseConnection(connection);
                });
            });
        }).catch(function (err) {
            reject(err);
        });
    });
}

module.exports.execProc = execProc;
/**
 * Выполнение sql запроса
 * @param {Object} params
 * @param {string} params.sql - текст запроса
 * @param {Object} params.binds - значения переменных запроса (see https://github.com/oracle/node-oracledb/blob/master/doc/api.md#-122-out-and-in-out-bind-parameters)
 * @param {boolean}[params.getArray] - возвращать в виде массива
 * @param {string} params.sessionID - результат запроса
 * @param {Object} params.dataset - результат запроса
 * @returns {Promise}
 */
function execSql(params) {
    var resultType = (params.getArray) ? ARRAY : OBJECT;
    return new Promise(function (resolve, reject) {
        getConnection()
            .then(function (connection) {
                execute(
                    "begin\n" +
                    "  PKG_SESSION.VALIDATE_WEB(SCONNECT => :SCONNECT);\n" +
                    "end;",
                    {
                        SCONNECT: {dir: BIND_IN, type: STRING, maxSize: 255, val: params.sessionID}
                    }, {}, connection
                ).then(function () {
                    execute(
                        params.sql,
                        params.binds,
                        {
                            isAutoCommit: true,
                            outFormat: resultType
                        },
                        connection)
                        .then(function (results) {
                            params.dataset = results;
                            resolve(params);
                            process.nextTick(function () {
                                releaseConnection(connection);
                            });
                        })
                }).catch(function (err) {
                    reject(err);
                    process.nextTick(function () {
                        releaseConnection(connection);
                    });
                });
            }).catch(function (err) {
            reject(err);
        });
    })
}

/**
 * Начало сеанса
 * @param params
 * @param params.username
 * @param params.password
 * @param params.session
 * @param params.sessionID
 * @param params.app
 * @param params.company
 * @param params.lang
 * @returns {Promise}
 */

module.exports.execSql = execSql;
function login(params) {
    return new Promise(function (resolve, reject) {
        simpleExecute(
            "begin\n" +
            "  PKG_SESSION.LOGON_WEB(SCONNECT        => :SCONNECT,\n" +
            "                        SUTILIZER       => :SUTILIZER,\n" +
            "                        SPASSWORD       => :SPASSWORD,\n" +
            "                        SIMPLEMENTATION => :SIMPLEMENTATION,\n" +
            "                        SAPPLICATION    => :SAPPLICATION,\n" +
            "                        SCOMPANY        => :SCOMPANY,\n" +
            "                        SBROWSER        => :SBROWSER,\n" +
            "                        SLANGUAGE       => :SLANGUAGE);\n" +
            "end;",
            {
                SCONNECT: {dir: BIND_IN, type: STRING, maxSize: 255, val: params.sessionID},
                SUTILIZER: {dir: BIND_IN, type: STRING, maxSize: 30, val: params.username},
                SPASSWORD: {dir: BIND_IN, type: STRING, maxSize: 200, val: params.password},
                SIMPLEMENTATION: {dir: BIND_IN, type: STRING, maxSize: 30, val: params.session.app},
                SAPPLICATION: {dir: BIND_IN, type: STRING, maxSize: 30, val: params.session.app},
                SCOMPANY: {dir: BIND_IN, type: STRING, maxSize: 20, val: params.session.company},
                SBROWSER: {dir: BIND_IN, type: STRING, maxSize: 2000, val: params.session.browser},
                SLANGUAGE: {dir: BIND_IN, type: STRING, maxSize: 30, val: params.session.lang}
            },
            {}).then(function (result) {
            params.session.isLogged = true;
            resolve(params);
        }).catch(reject);
    });
}

module.exports.login = login;

/**
 * Окончание сеанса
 * @param params
 * @param params.sessionID
 * @returns {Promise}
 */
function logoff(params) {
    return new Promise(function (resolve, reject) {
        simpleExecute(
            "begin\n" +
            "  PKG_SESSION.LOGOFF_WEB(SCONNECT => :SCONNECT);\n" +
            "end;",
            {
                SCONNECT: {dir: BIND_IN, type: STRING, maxSize: 255, val: params.sessionID}
            },
            {})
            .then(function (result) {
                params.session.isLogged = false;
                resolve(params);
            }).catch(reject);
    });
}

module.exports.logoff = logoff;


function simpleLogin(params){
    return new Promise(function (resolve, reject) {
        oracledb.getConnection(
        {
            user          : "parus",
            password      : "pp",
            connectString : "MVSOBL"
        }).then(console.log('Logged')
        );
    })
}
module.exports.simpleLogin=simpleLogin;

