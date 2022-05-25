(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Set a title and a message which indicates that the page should only be
// accessed via an invisible iframe.
document.title = "kernel.skynet";
var header = document.createElement('h1');
header.textContent = "Something went wrong! You should not be visiting this page, this page should only be accessed via an invisible iframe.";
document.body.appendChild(header);
// NOTE: These imports are order-sensitive.
// parseJSON is a wrapper for JSON.parse that returns an error rather than
// throwing an error.
var parseJSON = function (json) {
    try {
        let obj = JSON.parse(json);
        return [obj, null];
    }
    catch (err) {
        return [null, err];
    }
};
// addContextToErr is a helper function that standardizes the formatting of
// adding context to an error. Within the world of go we discovered that being
// very persistent about layering context onto errors is incredibly helpful
// when debugging, even though it often creates comically verbose error
// messages. Trust me, it's well worth the tradeoff.
var addContextToErr = function (err, context) {
    return new Error(context + ": " + err.message);
};
// log, and logErr are helper functions that wrap a log messages with a string
// indicating where the log originates, and will also send a message to the
// parent requesting that the parent create a log.
//
// Anything being sent to the parent (through postMessage) will need to be sent
// as a string. Any inputs which cannot be converted to a string by
// JSON.stringify will be ignored when sent to the parent.
//
// wlog is used for code deduplication, users should call log and logErr.
//
// TODO: Instead of using localStorage, we should probably use live variables.
// At startup, localStorage will be used to set the live variables, and then a
// background sync routine will update the live variables and the localStorage
// both. That way we don't need to access localStorage with every call to log.
var wlog = function (isErr, logType, ...inputs) {
    // Fetch the log settings as a string.
    let logSettingsStr = localStorage.getItem("v1-logSettings");
    // If there is no logSettingsStr set yet, create one with the default
    // logging settings active. These don't get persisted, which makes
    // development easier (just wipe the log settings and make changes here
    // as needed, to avoid having to use the kernel api to change your log
    // settings as you develop).
    if (logSettingsStr === null) {
        logSettingsStr = JSON.stringify({
            ERROR: true,
            error: true,
            debug: true,
            auth: true,
            portal: true,
            workerMessage: true,
        });
        logSettingsStr = `{
			"ERROR":         true,
			"error":         true,
			"auth":          true,
			"portal":        true,
			"workerMessage": true}`;
    }
    // Parse the logSettingsStr.
    let [logSettings, errJSON] = parseJSON(logSettingsStr);
    if (errJSON !== null) {
        console.log("ERROR: logSettings item in localstorage is corrupt:", errJSON, "\n", logSettingsStr);
        return;
    }
    // Ignore logtypes that aren't explicitly enabled.
    if (logSettings[logType] !== true && logSettings.allLogsEnabled !== true) {
        return;
    }
    // Log the message.
    if (isErr === false) {
        console.log("[kernel]", ...inputs);
    }
    else {
        console.error("[kernel]", ...inputs);
    }
    // Send a message to the parent requesting a log.
    if (!window.parent) {
        return;
    }
    let message = "";
    for (let i = 0; i < inputs.length; i++) {
        // Separate each input by a newline.
        if (i !== 0) {
            message += "\n";
        }
        // Strings can be placed in directly.
        if (typeof inputs[i] === "string") {
            message += inputs[i];
            continue;
        }
        // Everything else needs to be stringified.
        try {
            // TODO: This doesn't work, a large amount of the time
            // we have important objects (mostly errors) that are
            // getting stringified to '{ }'. I'm not sure how we
            // can ensure we always display the thing we need to
            // display.
            let item = JSON.stringify(inputs[i]);
            message += item;
        }
        catch (_a) {
            message += "[input could not be stringified]";
        }
    }
    window.parent.postMessage({
        method: "log",
        data: {
            isErr,
            message,
        },
    }, window.parent.origin);
};
var log = function (logType, ...inputs) {
    wlog(false, logType, ...inputs);
};
var logErr = function (logType, ...inputs) {
    wlog(true, logType, ...inputs);
};
const HASH_SIZE = 64;
var K = [
    0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
    0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
    0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
    0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
    0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
    0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
    0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
    0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
    0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
    0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
    0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
    0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
    0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
    0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
    0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
    0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
    0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
    0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
    0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
    0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
    0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
    0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
    0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
    0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
    0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
    0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
    0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
    0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
    0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
    0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
    0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
    0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
    0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
    0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
    0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
    0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
    0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
    0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
    0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
    0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];
function ts64(x, i, h, l) {
    x[i] = (h >> 24) & 0xff;
    x[i + 1] = (h >> 16) & 0xff;
    x[i + 2] = (h >> 8) & 0xff;
    x[i + 3] = h & 0xff;
    x[i + 4] = (l >> 24) & 0xff;
    x[i + 5] = (l >> 16) & 0xff;
    x[i + 6] = (l >> 8) & 0xff;
    x[i + 7] = l & 0xff;
}
function crypto_hashblocks_hl(hh, hl, m, n) {
    var wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i, j, h, l, a, b, c, d;
    var ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
    var pos = 0;
    while (n >= 128) {
        for (i = 0; i < 16; i++) {
            j = 8 * i + pos;
            wh[i] = (m[j + 0] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3];
            wl[i] = (m[j + 4] << 24) | (m[j + 5] << 16) | (m[j + 6] << 8) | m[j + 7];
        }
        for (i = 0; i < 80; i++) {
            bh0 = ah0;
            bh1 = ah1;
            bh2 = ah2;
            bh3 = ah3;
            bh4 = ah4;
            bh5 = ah5;
            bh6 = ah6;
            bh7 = ah7;
            bl0 = al0;
            bl1 = al1;
            bl2 = al2;
            bl3 = al3;
            bl4 = al4;
            bl5 = al5;
            bl6 = al6;
            bl7 = al7;
            // add
            h = ah7;
            l = al7;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            // Sigma1
            h = ((ah4 >>> 14) | (al4 << (32 - 14))) ^ ((ah4 >>> 18) | (al4 << (32 - 18))) ^ ((al4 >>> (41 - 32)) | (ah4 << (32 - (41 - 32))));
            l = ((al4 >>> 14) | (ah4 << (32 - 14))) ^ ((al4 >>> 18) | (ah4 << (32 - 18))) ^ ((ah4 >>> (41 - 32)) | (al4 << (32 - (41 - 32))));
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            // Ch
            h = (ah4 & ah5) ^ (~ah4 & ah6);
            l = (al4 & al5) ^ (~al4 & al6);
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            // K
            h = K[i * 2];
            l = K[i * 2 + 1];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            // w
            h = wh[i % 16];
            l = wl[i % 16];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            th = c & 0xffff | d << 16;
            tl = a & 0xffff | b << 16;
            // add
            h = th;
            l = tl;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            // Sigma0
            h = ((ah0 >>> 28) | (al0 << (32 - 28))) ^ ((al0 >>> (34 - 32)) | (ah0 << (32 - (34 - 32)))) ^ ((al0 >>> (39 - 32)) | (ah0 << (32 - (39 - 32))));
            l = ((al0 >>> 28) | (ah0 << (32 - 28))) ^ ((ah0 >>> (34 - 32)) | (al0 << (32 - (34 - 32)))) ^ ((ah0 >>> (39 - 32)) | (al0 << (32 - (39 - 32))));
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            // Maj
            h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
            l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh7 = (c & 0xffff) | (d << 16);
            bl7 = (a & 0xffff) | (b << 16);
            // add
            h = bh3;
            l = bl3;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            h = th;
            l = tl;
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh3 = (c & 0xffff) | (d << 16);
            bl3 = (a & 0xffff) | (b << 16);
            ah1 = bh0;
            ah2 = bh1;
            ah3 = bh2;
            ah4 = bh3;
            ah5 = bh4;
            ah6 = bh5;
            ah7 = bh6;
            ah0 = bh7;
            al1 = bl0;
            al2 = bl1;
            al3 = bl2;
            al4 = bl3;
            al5 = bl4;
            al6 = bl5;
            al7 = bl6;
            al0 = bl7;
            if (i % 16 === 15) {
                for (j = 0; j < 16; j++) {
                    // add
                    h = wh[j];
                    l = wl[j];
                    a = l & 0xffff;
                    b = l >>> 16;
                    c = h & 0xffff;
                    d = h >>> 16;
                    h = wh[(j + 9) % 16];
                    l = wl[(j + 9) % 16];
                    a += l & 0xffff;
                    b += l >>> 16;
                    c += h & 0xffff;
                    d += h >>> 16;
                    // sigma0
                    th = wh[(j + 1) % 16];
                    tl = wl[(j + 1) % 16];
                    h = ((th >>> 1) | (tl << (32 - 1))) ^ ((th >>> 8) | (tl << (32 - 8))) ^ (th >>> 7);
                    l = ((tl >>> 1) | (th << (32 - 1))) ^ ((tl >>> 8) | (th << (32 - 8))) ^ ((tl >>> 7) | (th << (32 - 7)));
                    a += l & 0xffff;
                    b += l >>> 16;
                    c += h & 0xffff;
                    d += h >>> 16;
                    // sigma1
                    th = wh[(j + 14) % 16];
                    tl = wl[(j + 14) % 16];
                    h = ((th >>> 19) | (tl << (32 - 19))) ^ ((tl >>> (61 - 32)) | (th << (32 - (61 - 32)))) ^ (th >>> 6);
                    l = ((tl >>> 19) | (th << (32 - 19))) ^ ((th >>> (61 - 32)) | (tl << (32 - (61 - 32)))) ^ ((tl >>> 6) | (th << (32 - 6)));
                    a += l & 0xffff;
                    b += l >>> 16;
                    c += h & 0xffff;
                    d += h >>> 16;
                    b += a >>> 16;
                    c += b >>> 16;
                    d += c >>> 16;
                    wh[j] = (c & 0xffff) | (d << 16);
                    wl[j] = (a & 0xffff) | (b << 16);
                }
            }
        }
        // add
        h = ah0;
        l = al0;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[0];
        l = hl[0];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[0] = ah0 = (c & 0xffff) | (d << 16);
        hl[0] = al0 = (a & 0xffff) | (b << 16);
        h = ah1;
        l = al1;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[1];
        l = hl[1];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[1] = ah1 = (c & 0xffff) | (d << 16);
        hl[1] = al1 = (a & 0xffff) | (b << 16);
        h = ah2;
        l = al2;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[2];
        l = hl[2];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[2] = ah2 = (c & 0xffff) | (d << 16);
        hl[2] = al2 = (a & 0xffff) | (b << 16);
        h = ah3;
        l = al3;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[3];
        l = hl[3];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[3] = ah3 = (c & 0xffff) | (d << 16);
        hl[3] = al3 = (a & 0xffff) | (b << 16);
        h = ah4;
        l = al4;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[4];
        l = hl[4];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[4] = ah4 = (c & 0xffff) | (d << 16);
        hl[4] = al4 = (a & 0xffff) | (b << 16);
        h = ah5;
        l = al5;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[5];
        l = hl[5];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[5] = ah5 = (c & 0xffff) | (d << 16);
        hl[5] = al5 = (a & 0xffff) | (b << 16);
        h = ah6;
        l = al6;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[6];
        l = hl[6];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[6] = ah6 = (c & 0xffff) | (d << 16);
        hl[6] = al6 = (a & 0xffff) | (b << 16);
        h = ah7;
        l = al7;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[7];
        l = hl[7];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[7] = ah7 = (c & 0xffff) | (d << 16);
        hl[7] = al7 = (a & 0xffff) | (b << 16);
        pos += 128;
        n -= 128;
    }
    return n;
}
var sha512internal = function (out, m, n) {
    var hh = new Int32Array(8), hl = new Int32Array(8), x = new Uint8Array(256), i, b = n;
    hh[0] = 0x6a09e667;
    hh[1] = 0xbb67ae85;
    hh[2] = 0x3c6ef372;
    hh[3] = 0xa54ff53a;
    hh[4] = 0x510e527f;
    hh[5] = 0x9b05688c;
    hh[6] = 0x1f83d9ab;
    hh[7] = 0x5be0cd19;
    hl[0] = 0xf3bcc908;
    hl[1] = 0x84caa73b;
    hl[2] = 0xfe94f82b;
    hl[3] = 0x5f1d36f1;
    hl[4] = 0xade682d1;
    hl[5] = 0x2b3e6c1f;
    hl[6] = 0xfb41bd6b;
    hl[7] = 0x137e2179;
    crypto_hashblocks_hl(hh, hl, m, n);
    n %= 128;
    for (i = 0; i < n; i++)
        x[i] = m[b - n + i];
    x[n] = 128;
    n = 256 - 128 * (n < 112 ? 1 : 0);
    x[n - 9] = 0;
    ts64(x, n - 8, (b / 0x20000000) | 0, b << 3);
    crypto_hashblocks_hl(hh, hl, x, n);
    for (i = 0; i < 8; i++)
        ts64(out, 8 * i, hh[i], hl[i]);
    return 0;
};
// sha512 is the standard sha512 cryptographic hash function. This is the
// default choice for Skynet operations, though many of the Sia protocol
// standards use blake2b instead, so you will see both.
var sha512 = function (m) {
    let out = new Uint8Array(64);
    sha512internal(out, m, m.length);
    return out;
};
var crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32;
var gf = function () {
    var r = new Float64Array(16);
    return r;
};
var gfi = function (init) {
    var i, r = new Float64Array(16);
    if (init)
        for (i = 0; i < init.length; i++)
            r[i] = init[i];
    return r;
};
var gf0 = gf(), gf1 = gfi([1]), _121665 = gfi([0xdb41, 1]), D = gfi([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]), D2 = gfi([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]), X = gfi([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]), Y = gfi([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]), I = gfi([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);
function vn(x, xi, y, yi, n) {
    var i, d = 0;
    for (i = 0; i < n; i++)
        d |= x[xi + i] ^ y[yi + i];
    return (1 & ((d - 1) >>> 8)) - 1;
}
function crypto_verify_32(x, xi, y, yi) {
    return vn(x, xi, y, yi, 32);
}
function set25519(r, a) {
    var i;
    for (i = 0; i < 16; i++)
        r[i] = a[i] | 0;
}
function car25519(o) {
    var i, v, c = 1;
    for (i = 0; i < 16; i++) {
        v = o[i] + c + 65535;
        c = Math.floor(v / 65536);
        o[i] = v - c * 65536;
    }
    o[0] += c - 1 + 37 * (c - 1);
}
function sel25519(p, q, b) {
    var t, c = ~(b - 1);
    for (var i = 0; i < 16; i++) {
        t = c & (p[i] ^ q[i]);
        p[i] ^= t;
        q[i] ^= t;
    }
}
function pack25519(o, n) {
    var i, j, b;
    var m = gf(), t = gf();
    for (i = 0; i < 16; i++)
        t[i] = n[i];
    car25519(t);
    car25519(t);
    car25519(t);
    for (j = 0; j < 2; j++) {
        m[0] = t[0] - 0xffed;
        for (i = 1; i < 15; i++) {
            m[i] = t[i] - 0xffff - ((m[i - 1] >> 16) & 1);
            m[i - 1] &= 0xffff;
        }
        m[15] = t[15] - 0x7fff - ((m[14] >> 16) & 1);
        b = (m[15] >> 16) & 1;
        m[14] &= 0xffff;
        sel25519(t, m, 1 - b);
    }
    for (i = 0; i < 16; i++) {
        o[2 * i] = t[i] & 0xff;
        o[2 * i + 1] = t[i] >> 8;
    }
}
function neq25519(a, b) {
    var c = new Uint8Array(32), d = new Uint8Array(32);
    pack25519(c, a);
    pack25519(d, b);
    return crypto_verify_32(c, 0, d, 0);
}
function par25519(a) {
    var d = new Uint8Array(32);
    pack25519(d, a);
    return d[0] & 1;
}
function unpack25519(o, n) {
    var i;
    for (i = 0; i < 16; i++)
        o[i] = n[2 * i] + (n[2 * i + 1] << 8);
    o[15] &= 0x7fff;
}
function A(o, a, b) {
    for (var i = 0; i < 16; i++)
        o[i] = a[i] + b[i];
}
function Z(o, a, b) {
    for (var i = 0; i < 16; i++)
        o[i] = a[i] - b[i];
}
function M(o, a, b) {
    var v, c, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
    v = a[0];
    t0 += v * b0;
    t1 += v * b1;
    t2 += v * b2;
    t3 += v * b3;
    t4 += v * b4;
    t5 += v * b5;
    t6 += v * b6;
    t7 += v * b7;
    t8 += v * b8;
    t9 += v * b9;
    t10 += v * b10;
    t11 += v * b11;
    t12 += v * b12;
    t13 += v * b13;
    t14 += v * b14;
    t15 += v * b15;
    v = a[1];
    t1 += v * b0;
    t2 += v * b1;
    t3 += v * b2;
    t4 += v * b3;
    t5 += v * b4;
    t6 += v * b5;
    t7 += v * b6;
    t8 += v * b7;
    t9 += v * b8;
    t10 += v * b9;
    t11 += v * b10;
    t12 += v * b11;
    t13 += v * b12;
    t14 += v * b13;
    t15 += v * b14;
    t16 += v * b15;
    v = a[2];
    t2 += v * b0;
    t3 += v * b1;
    t4 += v * b2;
    t5 += v * b3;
    t6 += v * b4;
    t7 += v * b5;
    t8 += v * b6;
    t9 += v * b7;
    t10 += v * b8;
    t11 += v * b9;
    t12 += v * b10;
    t13 += v * b11;
    t14 += v * b12;
    t15 += v * b13;
    t16 += v * b14;
    t17 += v * b15;
    v = a[3];
    t3 += v * b0;
    t4 += v * b1;
    t5 += v * b2;
    t6 += v * b3;
    t7 += v * b4;
    t8 += v * b5;
    t9 += v * b6;
    t10 += v * b7;
    t11 += v * b8;
    t12 += v * b9;
    t13 += v * b10;
    t14 += v * b11;
    t15 += v * b12;
    t16 += v * b13;
    t17 += v * b14;
    t18 += v * b15;
    v = a[4];
    t4 += v * b0;
    t5 += v * b1;
    t6 += v * b2;
    t7 += v * b3;
    t8 += v * b4;
    t9 += v * b5;
    t10 += v * b6;
    t11 += v * b7;
    t12 += v * b8;
    t13 += v * b9;
    t14 += v * b10;
    t15 += v * b11;
    t16 += v * b12;
    t17 += v * b13;
    t18 += v * b14;
    t19 += v * b15;
    v = a[5];
    t5 += v * b0;
    t6 += v * b1;
    t7 += v * b2;
    t8 += v * b3;
    t9 += v * b4;
    t10 += v * b5;
    t11 += v * b6;
    t12 += v * b7;
    t13 += v * b8;
    t14 += v * b9;
    t15 += v * b10;
    t16 += v * b11;
    t17 += v * b12;
    t18 += v * b13;
    t19 += v * b14;
    t20 += v * b15;
    v = a[6];
    t6 += v * b0;
    t7 += v * b1;
    t8 += v * b2;
    t9 += v * b3;
    t10 += v * b4;
    t11 += v * b5;
    t12 += v * b6;
    t13 += v * b7;
    t14 += v * b8;
    t15 += v * b9;
    t16 += v * b10;
    t17 += v * b11;
    t18 += v * b12;
    t19 += v * b13;
    t20 += v * b14;
    t21 += v * b15;
    v = a[7];
    t7 += v * b0;
    t8 += v * b1;
    t9 += v * b2;
    t10 += v * b3;
    t11 += v * b4;
    t12 += v * b5;
    t13 += v * b6;
    t14 += v * b7;
    t15 += v * b8;
    t16 += v * b9;
    t17 += v * b10;
    t18 += v * b11;
    t19 += v * b12;
    t20 += v * b13;
    t21 += v * b14;
    t22 += v * b15;
    v = a[8];
    t8 += v * b0;
    t9 += v * b1;
    t10 += v * b2;
    t11 += v * b3;
    t12 += v * b4;
    t13 += v * b5;
    t14 += v * b6;
    t15 += v * b7;
    t16 += v * b8;
    t17 += v * b9;
    t18 += v * b10;
    t19 += v * b11;
    t20 += v * b12;
    t21 += v * b13;
    t22 += v * b14;
    t23 += v * b15;
    v = a[9];
    t9 += v * b0;
    t10 += v * b1;
    t11 += v * b2;
    t12 += v * b3;
    t13 += v * b4;
    t14 += v * b5;
    t15 += v * b6;
    t16 += v * b7;
    t17 += v * b8;
    t18 += v * b9;
    t19 += v * b10;
    t20 += v * b11;
    t21 += v * b12;
    t22 += v * b13;
    t23 += v * b14;
    t24 += v * b15;
    v = a[10];
    t10 += v * b0;
    t11 += v * b1;
    t12 += v * b2;
    t13 += v * b3;
    t14 += v * b4;
    t15 += v * b5;
    t16 += v * b6;
    t17 += v * b7;
    t18 += v * b8;
    t19 += v * b9;
    t20 += v * b10;
    t21 += v * b11;
    t22 += v * b12;
    t23 += v * b13;
    t24 += v * b14;
    t25 += v * b15;
    v = a[11];
    t11 += v * b0;
    t12 += v * b1;
    t13 += v * b2;
    t14 += v * b3;
    t15 += v * b4;
    t16 += v * b5;
    t17 += v * b6;
    t18 += v * b7;
    t19 += v * b8;
    t20 += v * b9;
    t21 += v * b10;
    t22 += v * b11;
    t23 += v * b12;
    t24 += v * b13;
    t25 += v * b14;
    t26 += v * b15;
    v = a[12];
    t12 += v * b0;
    t13 += v * b1;
    t14 += v * b2;
    t15 += v * b3;
    t16 += v * b4;
    t17 += v * b5;
    t18 += v * b6;
    t19 += v * b7;
    t20 += v * b8;
    t21 += v * b9;
    t22 += v * b10;
    t23 += v * b11;
    t24 += v * b12;
    t25 += v * b13;
    t26 += v * b14;
    t27 += v * b15;
    v = a[13];
    t13 += v * b0;
    t14 += v * b1;
    t15 += v * b2;
    t16 += v * b3;
    t17 += v * b4;
    t18 += v * b5;
    t19 += v * b6;
    t20 += v * b7;
    t21 += v * b8;
    t22 += v * b9;
    t23 += v * b10;
    t24 += v * b11;
    t25 += v * b12;
    t26 += v * b13;
    t27 += v * b14;
    t28 += v * b15;
    v = a[14];
    t14 += v * b0;
    t15 += v * b1;
    t16 += v * b2;
    t17 += v * b3;
    t18 += v * b4;
    t19 += v * b5;
    t20 += v * b6;
    t21 += v * b7;
    t22 += v * b8;
    t23 += v * b9;
    t24 += v * b10;
    t25 += v * b11;
    t26 += v * b12;
    t27 += v * b13;
    t28 += v * b14;
    t29 += v * b15;
    v = a[15];
    t15 += v * b0;
    t16 += v * b1;
    t17 += v * b2;
    t18 += v * b3;
    t19 += v * b4;
    t20 += v * b5;
    t21 += v * b6;
    t22 += v * b7;
    t23 += v * b8;
    t24 += v * b9;
    t25 += v * b10;
    t26 += v * b11;
    t27 += v * b12;
    t28 += v * b13;
    t29 += v * b14;
    t30 += v * b15;
    t0 += 38 * t16;
    t1 += 38 * t17;
    t2 += 38 * t18;
    t3 += 38 * t19;
    t4 += 38 * t20;
    t5 += 38 * t21;
    t6 += 38 * t22;
    t7 += 38 * t23;
    t8 += 38 * t24;
    t9 += 38 * t25;
    t10 += 38 * t26;
    t11 += 38 * t27;
    t12 += 38 * t28;
    t13 += 38 * t29;
    t14 += 38 * t30;
    // t15 left as is
    // first car
    c = 1;
    v = t0 + c + 65535;
    c = Math.floor(v / 65536);
    t0 = v - c * 65536;
    v = t1 + c + 65535;
    c = Math.floor(v / 65536);
    t1 = v - c * 65536;
    v = t2 + c + 65535;
    c = Math.floor(v / 65536);
    t2 = v - c * 65536;
    v = t3 + c + 65535;
    c = Math.floor(v / 65536);
    t3 = v - c * 65536;
    v = t4 + c + 65535;
    c = Math.floor(v / 65536);
    t4 = v - c * 65536;
    v = t5 + c + 65535;
    c = Math.floor(v / 65536);
    t5 = v - c * 65536;
    v = t6 + c + 65535;
    c = Math.floor(v / 65536);
    t6 = v - c * 65536;
    v = t7 + c + 65535;
    c = Math.floor(v / 65536);
    t7 = v - c * 65536;
    v = t8 + c + 65535;
    c = Math.floor(v / 65536);
    t8 = v - c * 65536;
    v = t9 + c + 65535;
    c = Math.floor(v / 65536);
    t9 = v - c * 65536;
    v = t10 + c + 65535;
    c = Math.floor(v / 65536);
    t10 = v - c * 65536;
    v = t11 + c + 65535;
    c = Math.floor(v / 65536);
    t11 = v - c * 65536;
    v = t12 + c + 65535;
    c = Math.floor(v / 65536);
    t12 = v - c * 65536;
    v = t13 + c + 65535;
    c = Math.floor(v / 65536);
    t13 = v - c * 65536;
    v = t14 + c + 65535;
    c = Math.floor(v / 65536);
    t14 = v - c * 65536;
    v = t15 + c + 65535;
    c = Math.floor(v / 65536);
    t15 = v - c * 65536;
    t0 += c - 1 + 37 * (c - 1);
    // second car
    c = 1;
    v = t0 + c + 65535;
    c = Math.floor(v / 65536);
    t0 = v - c * 65536;
    v = t1 + c + 65535;
    c = Math.floor(v / 65536);
    t1 = v - c * 65536;
    v = t2 + c + 65535;
    c = Math.floor(v / 65536);
    t2 = v - c * 65536;
    v = t3 + c + 65535;
    c = Math.floor(v / 65536);
    t3 = v - c * 65536;
    v = t4 + c + 65535;
    c = Math.floor(v / 65536);
    t4 = v - c * 65536;
    v = t5 + c + 65535;
    c = Math.floor(v / 65536);
    t5 = v - c * 65536;
    v = t6 + c + 65535;
    c = Math.floor(v / 65536);
    t6 = v - c * 65536;
    v = t7 + c + 65535;
    c = Math.floor(v / 65536);
    t7 = v - c * 65536;
    v = t8 + c + 65535;
    c = Math.floor(v / 65536);
    t8 = v - c * 65536;
    v = t9 + c + 65535;
    c = Math.floor(v / 65536);
    t9 = v - c * 65536;
    v = t10 + c + 65535;
    c = Math.floor(v / 65536);
    t10 = v - c * 65536;
    v = t11 + c + 65535;
    c = Math.floor(v / 65536);
    t11 = v - c * 65536;
    v = t12 + c + 65535;
    c = Math.floor(v / 65536);
    t12 = v - c * 65536;
    v = t13 + c + 65535;
    c = Math.floor(v / 65536);
    t13 = v - c * 65536;
    v = t14 + c + 65535;
    c = Math.floor(v / 65536);
    t14 = v - c * 65536;
    v = t15 + c + 65535;
    c = Math.floor(v / 65536);
    t15 = v - c * 65536;
    t0 += c - 1 + 37 * (c - 1);
    o[0] = t0;
    o[1] = t1;
    o[2] = t2;
    o[3] = t3;
    o[4] = t4;
    o[5] = t5;
    o[6] = t6;
    o[7] = t7;
    o[8] = t8;
    o[9] = t9;
    o[10] = t10;
    o[11] = t11;
    o[12] = t12;
    o[13] = t13;
    o[14] = t14;
    o[15] = t15;
}
function S(o, a) {
    M(o, a, a);
}
function inv25519(o, i) {
    var c = gf();
    var a;
    for (a = 0; a < 16; a++)
        c[a] = i[a];
    for (a = 253; a >= 0; a--) {
        S(c, c);
        if (a !== 2 && a !== 4)
            M(c, c, i);
    }
    for (a = 0; a < 16; a++)
        o[a] = c[a];
}
function pow2523(o, i) {
    var c = gf();
    var a;
    for (a = 0; a < 16; a++)
        c[a] = i[a];
    for (a = 250; a >= 0; a--) {
        S(c, c);
        if (a !== 1)
            M(c, c, i);
    }
    for (a = 0; a < 16; a++)
        o[a] = c[a];
}
function add(p, q) {
    var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h = gf(), t = gf();
    Z(a, p[1], p[0]);
    Z(t, q[1], q[0]);
    M(a, a, t);
    A(b, p[0], p[1]);
    A(t, q[0], q[1]);
    M(b, b, t);
    M(c, p[3], q[3]);
    M(c, c, D2);
    M(d, p[2], q[2]);
    A(d, d, d);
    Z(e, b, a);
    Z(f, d, c);
    A(g, d, c);
    A(h, b, a);
    M(p[0], e, f);
    M(p[1], h, g);
    M(p[2], g, f);
    M(p[3], e, h);
}
function cswap(p, q, b) {
    var i;
    for (i = 0; i < 4; i++) {
        sel25519(p[i], q[i], b);
    }
}
function pack(r, p) {
    var tx = gf(), ty = gf(), zi = gf();
    inv25519(zi, p[2]);
    M(tx, p[0], zi);
    M(ty, p[1], zi);
    pack25519(r, ty);
    r[31] ^= par25519(tx) << 7;
}
function scalarmult(p, q, s) {
    var b, i;
    set25519(p[0], gf0);
    set25519(p[1], gf1);
    set25519(p[2], gf1);
    set25519(p[3], gf0);
    for (i = 255; i >= 0; --i) {
        b = (s[(i / 8) | 0] >> (i & 7)) & 1;
        cswap(p, q, b);
        add(q, p);
        add(p, p);
        cswap(p, q, b);
    }
}
function scalarbase(p, s) {
    var q = [gf(), gf(), gf(), gf()];
    set25519(q[0], X);
    set25519(q[1], Y);
    set25519(q[2], gf1);
    M(q[3], X, Y);
    scalarmult(p, q, s);
}
var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);
function modL(r, x) {
    var carry, i, j, k;
    for (i = 63; i >= 32; --i) {
        carry = 0;
        for (j = i - 32, k = i - 12; j < k; ++j) {
            x[j] += carry - 16 * x[i] * L[j - (i - 32)];
            carry = Math.floor((x[j] + 128) / 256);
            x[j] -= carry * 256;
        }
        x[j] += carry;
        x[i] = 0;
    }
    carry = 0;
    for (j = 0; j < 32; j++) {
        x[j] += carry - (x[31] >> 4) * L[j];
        carry = x[j] >> 8;
        x[j] &= 255;
    }
    for (j = 0; j < 32; j++)
        x[j] -= carry * L[j];
    for (i = 0; i < 32; i++) {
        x[i + 1] += x[i] >> 8;
        r[i] = x[i] & 255;
    }
}
function unpackneg(r, p) {
    var t = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
    set25519(r[2], gf1);
    unpack25519(r[1], p);
    S(num, r[1]);
    M(den, num, D);
    Z(num, num, r[2]);
    A(den, r[2], den);
    S(den2, den);
    S(den4, den2);
    M(den6, den4, den2);
    M(t, den6, num);
    M(t, t, den);
    pow2523(t, t);
    M(t, t, num);
    M(t, t, den);
    M(t, t, den);
    M(r[0], t, den);
    S(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num))
        M(r[0], r[0], I);
    S(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num))
        return -1;
    if (par25519(r[0]) === (p[31] >> 7))
        Z(r[0], gf0, r[0]);
    M(r[3], r[0], r[1]);
    return 0;
}
function reduce(r) {
    var x = new Float64Array(64), i;
    for (i = 0; i < 64; i++)
        x[i] = r[i];
    for (i = 0; i < 64; i++)
        r[i] = 0;
    modL(r, x);
}
function crypto_sign_keypair(pk, sk) {
    var d = new Uint8Array(64);
    var p = [gf(), gf(), gf(), gf()];
    var i;
    sha512internal(d, sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
    scalarbase(p, d);
    pack(pk, p);
    for (i = 0; i < 32; i++)
        sk[i + 32] = pk[i];
    return 0;
}
function crypto_sign_open(m, sm, n, pk) {
    var i;
    var t = new Uint8Array(32), h = new Uint8Array(64);
    var p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
    if (n < 64)
        return -1;
    if (unpackneg(q, pk))
        return -1;
    for (i = 0; i < n; i++)
        m[i] = sm[i];
    for (i = 0; i < 32; i++)
        m[i + 32] = pk[i];
    sha512internal(h, m, n);
    reduce(h);
    scalarmult(p, q, h);
    scalarbase(q, sm.subarray(32));
    add(p, q);
    pack(t, p);
    n -= 64;
    if (crypto_verify_32(sm, 0, t, 0)) {
        for (i = 0; i < n; i++)
            m[i] = 0;
        return -1;
    }
    for (i = 0; i < n; i++)
        m[i] = sm[i + 64];
    return n;
}
// Note: difference from C - smlen returned, not passed as argument.
function crypto_sign(sm, m, n, sk) {
    var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
    var i, j, x = new Float64Array(64);
    var p = [gf(), gf(), gf(), gf()];
    sha512internal(d, sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
    var smlen = n + 64;
    for (i = 0; i < n; i++)
        sm[64 + i] = m[i];
    for (i = 0; i < 32; i++)
        sm[32 + i] = d[32 + i];
    sha512internal(r, sm.subarray(32), n + 32);
    reduce(r);
    scalarbase(p, r);
    pack(sm, p);
    for (i = 32; i < 64; i++)
        sm[i] = sk[i];
    sha512internal(h, sm, n + 64);
    reduce(h);
    for (i = 0; i < 64; i++)
        x[i] = 0;
    for (i = 0; i < 32; i++)
        x[i] = r[i];
    for (i = 0; i < 32; i++) {
        for (j = 0; j < 32; j++) {
            x[i + j] += h[i] * d[j];
        }
    }
    modL(sm.subarray(32), x);
    return smlen;
}
// checkAllUint8Array is a helper function to perform input checking on the
// crypto API functions. Because the kernel is often hot-loading untrusted
// code, we cannot depend on typescript to provide type safety.
var checkAllUint8Array = function (...args) {
    for (var i = 0; i < arguments.length; i++) {
        if (!(arguments[i] instanceof Uint8Array)) {
            return new TypeError("unexpected type, use Uint8Array");
        }
    }
    return null;
};
// keyPairFromSeed is a function that generates an ed25519 keypair from a
// provided seed. The seed will be hashed before being used as entropy.
var keyPairFromSeed = function (seed) {
    // Input checking.
    let errU8 = checkAllUint8Array(seed);
    if (errU8 !== null) {
        return [null, addContextToErr(errU8, "seed is invalid")];
    }
    if (seed.length !== crypto_sign_SEEDBYTES) {
        return [null, new Error("bad seed size")];
    }
    // Build the keypair.
    var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
    var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
    for (var i = 0; i < 32; i++) {
        sk[i] = seed[i];
    }
    crypto_sign_keypair(pk, sk);
    return [{
            publicKey: pk,
            secretKey: sk,
        }, null];
};
// sign will produce an ed25519 signature of a given input.
var sign = function (msg, secretKey) {
    // Input checking.
    let errU8 = checkAllUint8Array(msg, secretKey);
    if (errU8 !== null) {
        return [null, addContextToErr(errU8, "inputs are invalid")];
    }
    if (secretKey.length !== crypto_sign_SECRETKEYBYTES) {
        return [null, new Error("bad secret key size")];
    }
    // Build the signature.
    var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
    crypto_sign(signedMsg, msg, msg.length, secretKey);
    var sig = new Uint8Array(crypto_sign_BYTES);
    for (var i = 0; i < sig.length; i++) {
        sig[i] = signedMsg[i];
    }
    return [sig, null];
};
// verify will check whether a signature is valid against the given publicKey
// and message.
var verify = function (msg, sig, publicKey) {
    let errU8 = checkAllUint8Array(msg, sig, publicKey);
    if (errU8 !== null) {
        return false;
    }
    if (sig.length !== crypto_sign_BYTES) {
        return false;
    }
    if (publicKey.length !== crypto_sign_PUBLICKEYBYTES) {
        return false;
    }
    var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
    var m = new Uint8Array(crypto_sign_BYTES + msg.length);
    var i;
    for (i = 0; i < crypto_sign_BYTES; i++) {
        sm[i] = sig[i];
    }
    for (i = 0; i < msg.length; i++) {
        sm[i + crypto_sign_BYTES] = msg[i];
    }
    return (crypto_sign_open(m, sm, sm.length, publicKey) >= 0);
};
// Blake2B in pure Javascript
// Adapted from the reference implementation in RFC7693
// Ported to Javascript by DC - https://github.com/dcposch
// Adapted again for the Skynet Kernel browser extension
// 64-bit unsigned addition
// Sets v[a,a+1] += v[b,b+1]
// v should be a Uint32Array
function ADD64AA(v, a, b) {
    const o0 = v[a] + v[b];
    let o1 = v[a + 1] + v[b + 1];
    if (o0 >= 0x100000000) {
        o1++;
    }
    v[a] = o0;
    v[a + 1] = o1;
}
// 64-bit unsigned addition
// Sets v[a,a+1] += b
// b0 is the low 32 bits of b, b1 represents the high 32 bits
function ADD64AC(v, a, b0, b1) {
    let o0 = v[a] + b0;
    if (b0 < 0) {
        o0 += 0x100000000;
    }
    let o1 = v[a + 1] + b1;
    if (o0 >= 0x100000000) {
        o1++;
    }
    v[a] = o0;
    v[a + 1] = o1;
}
// Little-endian byte access
function B2B_GET32(arr, i) {
    return arr[i] ^ (arr[i + 1] << 8) ^ (arr[i + 2] << 16) ^ (arr[i + 3] << 24);
}
// G Mixing function
// The ROTRs are inlined for speed
function B2B_G(a, b, c, d, ix, iy, m, v) {
    const x0 = m[ix];
    const x1 = m[ix + 1];
    const y0 = m[iy];
    const y1 = m[iy + 1];
    ADD64AA(v, a, b); // v[a,a+1] += v[b,b+1] ... in JS we must store a uint64 as two uint32s
    ADD64AC(v, a, x0, x1); // v[a, a+1] += x ... x0 is the low 32 bits of x, x1 is the high 32 bits
    // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated to the right by 32 bits
    let xor0 = v[d] ^ v[a];
    let xor1 = v[d + 1] ^ v[a + 1];
    v[d] = xor1;
    v[d + 1] = xor0;
    ADD64AA(v, c, d);
    // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 24 bits
    xor0 = v[b] ^ v[c];
    xor1 = v[b + 1] ^ v[c + 1];
    v[b] = (xor0 >>> 24) ^ (xor1 << 8);
    v[b + 1] = (xor1 >>> 24) ^ (xor0 << 8);
    ADD64AA(v, a, b);
    ADD64AC(v, a, y0, y1);
    // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated right by 16 bits
    xor0 = v[d] ^ v[a];
    xor1 = v[d + 1] ^ v[a + 1];
    v[d] = (xor0 >>> 16) ^ (xor1 << 16);
    v[d + 1] = (xor1 >>> 16) ^ (xor0 << 16);
    ADD64AA(v, c, d);
    // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 63 bits
    xor0 = v[b] ^ v[c];
    xor1 = v[b + 1] ^ v[c + 1];
    v[b] = (xor1 >>> 31) ^ (xor0 << 1);
    v[b + 1] = (xor0 >>> 31) ^ (xor1 << 1);
}
// Initialization Vector
const BLAKE2B_IV32 = new Uint32Array([
    0xf3bcc908,
    0x6a09e667,
    0x84caa73b,
    0xbb67ae85,
    0xfe94f82b,
    0x3c6ef372,
    0x5f1d36f1,
    0xa54ff53a,
    0xade682d1,
    0x510e527f,
    0x2b3e6c1f,
    0x9b05688c,
    0xfb41bd6b,
    0x1f83d9ab,
    0x137e2179,
    0x5be0cd19
]);
const SIGMA8 = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    14,
    10,
    4,
    8,
    9,
    15,
    13,
    6,
    1,
    12,
    0,
    2,
    11,
    7,
    5,
    3,
    11,
    8,
    12,
    0,
    5,
    2,
    15,
    13,
    10,
    14,
    3,
    6,
    7,
    1,
    9,
    4,
    7,
    9,
    3,
    1,
    13,
    12,
    11,
    14,
    2,
    6,
    5,
    10,
    4,
    0,
    15,
    8,
    9,
    0,
    5,
    7,
    2,
    4,
    10,
    15,
    14,
    1,
    11,
    12,
    6,
    8,
    3,
    13,
    2,
    12,
    6,
    10,
    0,
    11,
    8,
    3,
    4,
    13,
    7,
    5,
    15,
    14,
    1,
    9,
    12,
    5,
    1,
    15,
    14,
    13,
    4,
    10,
    0,
    7,
    6,
    3,
    9,
    2,
    8,
    11,
    13,
    11,
    7,
    14,
    12,
    1,
    3,
    9,
    5,
    0,
    15,
    4,
    8,
    6,
    2,
    10,
    6,
    15,
    14,
    9,
    11,
    3,
    0,
    8,
    12,
    2,
    13,
    7,
    1,
    4,
    10,
    5,
    10,
    2,
    8,
    4,
    7,
    6,
    1,
    5,
    15,
    11,
    9,
    14,
    3,
    12,
    13,
    0,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    14,
    10,
    4,
    8,
    9,
    15,
    13,
    6,
    1,
    12,
    0,
    2,
    11,
    7,
    5,
    3
];
// These are offsets into a uint64 buffer.
// Multiply them all by 2 to make them offsets into a uint32 buffer,
// because this is Javascript and we don't have uint64s
const SIGMA82 = new Uint8Array(SIGMA8.map(function (x) {
    return x * 2;
}));
// Compression function. 'last' flag indicates last block.
// Note we're representing 16 uint64s as 32 uint32s
function blake2bCompress(ctx, last) {
    const v = new Uint32Array(32);
    const m = new Uint32Array(32);
    let i = 0;
    // init work variables
    for (i = 0; i < 16; i++) {
        v[i] = ctx.h[i];
        v[i + 16] = BLAKE2B_IV32[i];
    }
    // low 64 bits of offset
    v[24] = v[24] ^ ctx.t;
    v[25] = v[25] ^ (ctx.t / 0x100000000);
    // high 64 bits not supported, offset may not be higher than 2**53-1
    // last block flag set ?
    if (last) {
        v[28] = ~v[28];
        v[29] = ~v[29];
    }
    // get little-endian words
    for (i = 0; i < 32; i++) {
        m[i] = B2B_GET32(ctx.b, 4 * i);
    }
    // twelve rounds of mixing
    // uncomment the DebugPrint calls to log the computation
    // and match the RFC sample documentation
    for (i = 0; i < 12; i++) {
        B2B_G(0, 8, 16, 24, SIGMA82[i * 16 + 0], SIGMA82[i * 16 + 1], m, v);
        B2B_G(2, 10, 18, 26, SIGMA82[i * 16 + 2], SIGMA82[i * 16 + 3], m, v);
        B2B_G(4, 12, 20, 28, SIGMA82[i * 16 + 4], SIGMA82[i * 16 + 5], m, v);
        B2B_G(6, 14, 22, 30, SIGMA82[i * 16 + 6], SIGMA82[i * 16 + 7], m, v);
        B2B_G(0, 10, 20, 30, SIGMA82[i * 16 + 8], SIGMA82[i * 16 + 9], m, v);
        B2B_G(2, 12, 22, 24, SIGMA82[i * 16 + 10], SIGMA82[i * 16 + 11], m, v);
        B2B_G(4, 14, 16, 26, SIGMA82[i * 16 + 12], SIGMA82[i * 16 + 13], m, v);
        B2B_G(6, 8, 18, 28, SIGMA82[i * 16 + 14], SIGMA82[i * 16 + 15], m, v);
    }
    for (i = 0; i < 16; i++) {
        ctx.h[i] = ctx.h[i] ^ v[i] ^ v[i + 16];
    }
}
// Creates a BLAKE2b hashing context
// Requires an output length between 1 and 64 bytes
function blake2bInit() {
    // state, 'param block'
    const ctx = {
        b: new Uint8Array(128),
        h: new Uint32Array(16),
        t: 0,
        c: 0,
        outlen: 32 // output length in bytes
    };
    // initialize hash state
    for (let i = 0; i < 16; i++) {
        ctx.h[i] = BLAKE2B_IV32[i];
    }
    ctx.h[0] ^= 0x01010000 ^ 32;
    return ctx;
}
// Updates a BLAKE2b streaming hash
// Requires hash context and Uint8Array (byte array)
function blake2bUpdate(ctx, input) {
    for (let i = 0; i < input.length; i++) {
        if (ctx.c === 128) {
            // buffer full ?
            ctx.t += ctx.c; // add counters
            blake2bCompress(ctx, false); // compress (not last)
            ctx.c = 0; // counter to zero
        }
        ctx.b[ctx.c++] = input[i];
    }
}
// Completes a BLAKE2b streaming hash
// Returns a Uint8Array containing the message digest
function blake2bFinal(ctx) {
    ctx.t += ctx.c; // mark last block offset
    while (ctx.c < 128) {
        // fill up with zeros
        ctx.b[ctx.c++] = 0;
    }
    blake2bCompress(ctx, true); // final block flag = 1
    // little endian convert and store
    const out = new Uint8Array(ctx.outlen);
    for (let i = 0; i < ctx.outlen; i++) {
        out[i] = ctx.h[i >> 2] >> (8 * (i & 3));
    }
    return out;
}
// Computes the blake2b hash of the input. Returns 32 bytes.
var blake2b = function (input) {
    const ctx = blake2bInit();
    blake2bUpdate(ctx, input);
    return blake2bFinal(ctx);
};
// addSubtreeToBlake2bProofStack will add a subtree to a proof stack.
var addSubtreeToBlake2bProofStack = function (ps, subtreeRoot, subtreeHeight) {
    // Input checking.
    if (subtreeRoot.length !== 32) {
        return new Error("cannot add subtree because root is wrong length");
    }
    // If the blake2bProofStack has no elements in it yet, add the subtree
    // with no further checks.
    if (ps.subtreeRoots.length === 0) {
        ps.subtreeRoots.push(subtreeRoot);
        ps.subtreeHeights.push(subtreeHeight);
        return null;
    }
    // Check the height of the new subtree against the height of the
    // smallest subtree in the blake2bProofStack. If the new subtree is
    // larger, the subtree cannot be added.
    let maxHeight = ps.subtreeHeights[ps.subtreeHeights.length - 1];
    if (subtreeHeight > maxHeight) {
        return new Error(`cannot add a subtree that is taller ${subtreeHeight} than the smallest ${maxHeight} subtree in the stack`);
    }
    // If the new subtreeHeight is smaller than the max height, we can just
    // append the subtree height without doing anything more.
    if (subtreeHeight < maxHeight) {
        ps.subtreeRoots.push(subtreeRoot);
        ps.subtreeHeights.push(subtreeHeight);
        return null;
    }
    // If the new subtree is the same height as the smallest subtree, we
    // have to pull the smallest subtree out, combine it with the new
    // subtree, and push the result.
    let oldSTR = ps.subtreeRoots.pop();
    ps.subtreeHeights.pop(); // We already have the height.
    let combinedRoot = new Uint8Array(65);
    combinedRoot[0] = 1;
    combinedRoot.set(oldSTR, 1);
    combinedRoot.set(subtreeRoot, 33);
    let newSubtreeRoot = blake2b(combinedRoot);
    return addSubtreeToBlake2bProofStack(ps, newSubtreeRoot, subtreeHeight + 1);
};
// addLeafBytesToBlake2bProofStack will add a leaf to a proof stack.
var addLeafBytesToBlake2bProofStack = function (ps, leafBytes) {
    if (leafBytes.length !== 64) {
        return new Error("blake2bProofStack expects leafByte objects to be exactly 64 bytes");
    }
    let taggedBytes = new Uint8Array(65);
    taggedBytes.set(leafBytes, 1);
    let subtreeRoot = blake2b(taggedBytes);
    return addSubtreeToBlake2bProofStack(ps, subtreeRoot, 1);
};
// blake2bProofStackRoot returns the final Merkle root of the data in the
// current proof stack.
var blake2bProofStackRoot = function (ps) {
    // Input checking.
    if (ps.subtreeRoots.length === 0) {
        return [null, new Error("cannot compute the Merkle root of an empty data set")];
    }
    // Algorithm is pretty basic, start with the final tree, and then add
    // it to the previous tree. Repeat until there are no more trees.
    let baseSubtreeRoot = ps.subtreeRoots.pop();
    while (ps.subtreeRoots.length !== 0) {
        let nextSubtreeRoot = ps.subtreeRoots.pop();
        let combinedRoot = new Uint8Array(65);
        combinedRoot[0] = 1;
        combinedRoot.set(baseSubtreeRoot, 1);
        combinedRoot.set(nextSubtreeRoot, 33);
        baseSubtreeRoot = blake2b(combinedRoot);
    }
    return [baseSubtreeRoot, null];
};
// nextSubtreeHeight returns the height of the largest subtree that contains
// 'start', contains no elements prior to 'start', and also does not contain
// 'end'.
var nextSubtreeHeight = function (start, end) {
    // Input checking. We don't want start or end to be larger than 2^52
    // because they start to lose precision.
    let largestAllowed = 4500000000000000;
    if (start > largestAllowed || end > largestAllowed) {
        return [0, 0, new Error(`this library cannot work with Merkle trees that large (expected ${largestAllowed}, got ${start} and ${end}`)];
    }
    if (end <= start) {
        return [0, 0, new Error(`end (${end}) must be strictly larger than start (${start})`)];
    }
    // Merkle trees have a nice mathematical property that the largest tree
    // which contains a particular node and no nodes prior to it will have
    // a height that is equal to the number of trailing zeroes in the base
    // 2 representation of the index of that node.
    //
    // We are exploiting that property to compute the 'idealTreeHeight'. If
    // 'start' is zero, the ideal tree height will just keep counting up
    // forever, so we cut it off at 53.
    let idealTreeHeight = 1;
    let idealTreeSize = 1;
    // The conditional inside the loop tests if the next ideal tree size is
    // acceptable. If it is, we increment the height and double the size.
    while (start % (idealTreeSize * 2) === 0 && idealTreeHeight < 53) {
        idealTreeHeight++;
        idealTreeSize = idealTreeSize * 2;
    }
    // To compute the max tree height, we essentially just find the largest
    // power of 2 that is smaller than or equal to the gap between start
    // and end.
    let maxTreeHeight = 1;
    let maxTreeSize = 1;
    let range = (end - start) + 1;
    while (maxTreeSize * 2 < range) {
        maxTreeHeight++;
        maxTreeSize = maxTreeSize * 2;
    }
    // Return the smaller of the ideal height and the max height, as each
    // of them is an upper bound on how large things are allowed to be.
    if (idealTreeHeight < maxTreeHeight) {
        return [idealTreeHeight, idealTreeSize, null];
    }
    return [maxTreeHeight, maxTreeSize, null];
};
// verifyBlake2bSectorRangeProof will verify a merkle proof that the provided
// data exists within the provided sector at the provided range.
//
// NOTE: This implementation only handles a single range, but the transition to
// doing mulit-range proofs is not very large. The main reason I didn't extend
// this function was because it made the inputs a lot messier. The Sia merkle
// tree repo uses the same techniques and has the full implementation, use that
// as a reference if you need to extend this function to support multi-range
// proofs.
var verifyBlake2bSectorRangeProof = function (root, data, rangeStart, rangeEnd, proof) {
    // Verify the inputs.
    if (root.length !== 32) {
        return new Error("provided root is not a blake2b sector root");
    }
    if (rangeEnd <= rangeStart) {
        return new Error("provided has no data");
    }
    if (rangeStart < 0) {
        return new Error("cannot use negative ranges");
    }
    if (rangeEnd > 4194304) {
        return new Error("range is out of bounds");
    }
    if (proof.length % 32 !== 0) {
        return new Error("merkle proof has invalid length");
    }
    if (data.length !== rangeEnd - rangeStart) {
        return new Error("data length does not match provided range");
    }
    if (data.length % 64 !== 0) {
        return new Error("data must have a multiple of 64 bytes");
    }
    // We will consume proof elements until we get to the rangeStart of the
    // data.
    let ps = {
        subtreeRoots: [],
        subtreeHeights: [],
    };
    let currentOffset = 0;
    let proofOffset = 0;
    while (currentOffset < rangeStart) {
        if (proof.length < proofOffset + 32) {
            return new Error("merkle proof has insufficient data");
        }
        let [height, size, errNST] = nextSubtreeHeight(currentOffset / 64, rangeStart / 64);
        if (errNST !== null) {
            return addContextToErr(errNST, "error computing subtree height of initial proof stack");
        }
        let newSubtreeRoot = new Uint8Array(32);
        newSubtreeRoot.set(proof.slice(proofOffset, proofOffset + 32), 0);
        proofOffset += 32;
        let errSPS = addSubtreeToBlake2bProofStack(ps, newSubtreeRoot, height);
        if (errSPS !== null) {
            return addContextToErr(errSPS, "error adding subtree to initial proof stack");
        }
        currentOffset += (size * 64);
    }
    // We will consume data elements until we get to the end of the data.
    let dataOffset = 0;
    while (data.length > dataOffset) {
        let errLBPS = addLeafBytesToBlake2bProofStack(ps, data.slice(dataOffset, dataOffset + 64));
        if (errLBPS !== null) {
            return addContextToErr(errLBPS, "error adding leaves to proof stack");
        }
        dataOffset += 64;
        currentOffset += 64;
    }
    // Consume proof elements until the entire sector is proven.
    let sectorEnd = 4194304;
    while (currentOffset < sectorEnd) {
        if (proof.length < proofOffset + 32) {
            return new Error("merkle proof has insufficient data");
        }
        let [height, size, errNST] = nextSubtreeHeight(currentOffset / 64, sectorEnd / 64);
        if (errNST !== null) {
            return addContextToErr(errNST, "error computing subtree height of trailing proof stack");
        }
        let newSubtreeRoot = new Uint8Array(32);
        newSubtreeRoot.set(proof.slice(proofOffset, proofOffset + 32), 0);
        proofOffset += 32;
        let errSPS = addSubtreeToBlake2bProofStack(ps, newSubtreeRoot, height);
        if (errSPS !== null) {
            return addContextToErr(errSPS, "error adding subtree to trailing proof stack");
        }
        currentOffset += (size * 64);
    }
    return null;
};
// buf2hex takes a Uint8Array as input and returns the hex encoding of those
// bytes as a string.
var buf2hex = function (buf) {
    return [...buf]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
};
// hex2buf takes an untrusted string as input, verifies that the string is
// valid hex, and then converts the string to a Uint8Array.
var hex2buf = function (hex) {
    // Check that the length makes sense.
    if (hex.length % 2 != 0) {
        return [null, new Error("input has incorrect length")];
    }
    // Check that all of the characters are legal.
    let match = /[0-9A-Fa-f]*/g;
    if (!match.test(hex)) {
        return [null, new Error("input has invalid character")];
    }
    // Create the buffer and fill it.
    let matches = hex.match(/.{1,2}/g);
    if (matches === null) {
        return [null, new Error("input is incomplete")];
    }
    let u8 = new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
    return [u8, null];
};
// b64ToBuf will take an untrusted base64 string and convert it into a
// Uin8Array, returning an error if the input is not valid base64.
var b64ToBuf = function (b64) {
    // Check that the final string is valid base64.
    let b64regex = /^[0-9a-zA-Z-_/+=]*$/;
    if (!b64regex.test(b64)) {
        log("lifecycle", "not valid b64", b64);
        return [null, new Error("provided string is not valid base64")];
    }
    // Swap any '-' characters for '+', and swap any '_' characters for '/'
    // for use in the atob function.
    b64 = b64.replace(/-/g, "+").replace(/_/g, "/");
    // Perform the conversion.
    let binStr = atob(b64);
    let len = binStr.length;
    let buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        buf[i] = binStr.charCodeAt(i);
    }
    return [buf, null];
};
// bufToB64 will convert a Uint8Array to a base64 string with URL encoding and
// no padding characters.
var bufToB64 = function (buf) {
    let b64Str = btoa(String.fromCharCode.apply(null, buf));
    return b64Str.replace(/\+/g, "-").replace(/\//g, "_").replace(/\=/g, "");
};
// bufToStr takes an ArrayBuffer as input and returns a text string. bufToStr
// will check for invalid characters.
var bufToStr = function (buf) {
    try {
        let text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
        return [text, null];
    }
    catch (err) {
        return [null, addContextToErr(err, "unable to decode ArrayBuffer to string")];
    }
};
// decodeNumber will take an 8 byte Uint8Array and decode it as a number.
var decodeNumber = function (buf) {
    if (buf.length !== 8) {
        return [0, new Error("a number is expected to be 8 bytes")];
    }
    let num = 0;
    for (let i = 7; i >= 0; i--) {
        num *= 256;
        num += buf[i];
    }
    return [num, null];
};
// encodeNumber will take a number as input and return a corresponding
// Uint8Array.
var encodeNumber = function (num) {
    let encoded = new Uint8Array(8);
    for (let i = 0; i < encoded.length; i++) {
        let byte = num & 0xff;
        encoded[i] = byte;
        num = num >> 8;
    }
    return encoded;
};
// encodePrefixedBytes takes a Uint8Array as input and returns a Uint8Array
// that has the length prefixed as an 8 byte prefix. The input can be at most 4
// GiB.
var encodePrefixedBytes = function (bytes) {
    let len = bytes.length;
    if (len > 4294968295) {
        return [null, new Error("input is too large to be encoded")];
    }
    let buf = new ArrayBuffer(8 + len);
    let view = new DataView(buf);
    view.setUint32(0, len, true);
    let uint8Bytes = new Uint8Array(buf);
    uint8Bytes.set(bytes, 8);
    return [uint8Bytes, null];
};
var defaultPortalList = ["siasky.net", "eu-ger-12.siasky.net", "fileportal.org", "siasky.dev"];
// preferredPortals will determine the user's preferred portals by looking in
// localStorage. If no local list of portals is found, the hardcoded default
// list of portals will be set. This function does not check the network.
//
// Even if there is a list of preferred portals in localStorage, this function
// will append the list of default portals to that list (as lower priority
// portals) to increase the chance that a user is able to connect to Skynet.
// This is particularly useful for users who are reviving very old Skynet
// accounts and may have an outdated list of preferred portals. The user's
// kernel can overwrite this function so that the default portals aren't used
// except for bootloading.
var preferredPortals = function () {
    // Try to get the list of portals from localstorage. If there is no
    // list, just use the list hardcoded by the extension.
    let portalListStr = window.localStorage.getItem("v1-portalList");
    if (portalListStr === null) {
        // We can't return the default list directly because it may be
        // modified by the caller. Instead we return a copy.
        return Object.assign([], defaultPortalList);
    }
    let [portalList, errJSON] = parseJSON(portalListStr);
    if (errJSON !== null) {
        // We log an error but we don't change anything because the
        // data may have been placed there by a future version of the
        // kernel and we don't want to clear anything that might be
        // relevant or useful once the full kernel has finished
        // loading.
        log("error", errJSON, portalListStr);
        return Object.assign([], defaultPortalList);
    }
    // Append the list of default portals to the set of portals. In
    // the event that all of the user's portals are bad, they will
    // still be able to connect to Skynet. Because the portals are
    // trust minimized, there shouldn't be an issue with
    // potentially connecting to portals that the user hasn't
    // strictly authorized.
    for (let i = 0; i < defaultPortalList.length; i++) {
        // Check for duplicates between the default list and
        // the user's list. This deduplication is relevant for
        // performance, because lookups will sequentially check
        // every portal until a working portal is found. If
        // there are broken portals duplicated in the final
        // list, it will take longer to get through the list.
        let found = false;
        for (let j = 0; j < portalList.length; j++) {
            if (portalList[j] === defaultPortalList[i]) {
                found = true;
                break;
            }
        }
        if (!found) {
            portalList.push(defaultPortalList[i]);
        }
    }
    return portalList;
};
// processUserPortalPreferences will process the result of a call to
// downloadSkylink which fetches the user's portal preferences.
var processUserPortalPreferences = function (output) {
    // In the event of a 404, we want to store the default list as the set
    // of user's portals. We do this so that subsequent kernel iframes that
    // the user opens don't need to go to the network as part of the
    // startup process. The full kernel will set the localStorage item to
    // another value when the user selects portals.
    if (output.response.status === 404) {
        window.localStorage.setItem("v1-portalList", JSON.stringify(defaultPortalList));
        log("lifecycle", "user portalList set to the default list after getting 404 on registry lookup");
    }
    else {
        // TODO: Need to parse the data and correctly set the user's
        // portal list. Actually setting the user's portal preferences
        // list should be done by the full kernel, so this won't be
        // able to be updated until we have a full kernel.
        window.localStorage.setItem("v1-portalList", JSON.stringify(defaultPortalList));
        log("error", "user portalList set to the default list after getting a response but not bothering to check it");
    }
};
// initUserPortalPreferences will block until the user's portal preferences
// have been loaded. If a set of preferneces already exist in localStorage,
// those get used. If not, we try to fetch the user's portal preferences from
// the network.
var initUserPortalPreferences = function () {
    return new Promise((resolve, reject) => {
        // Try to get the list of portals from localstorage. If the
        // list already exists, we don't need to fetch the list from
        // the network.
        let portalListStr = window.localStorage.getItem("v1-portalList");
        if (portalListStr !== null) {
            resolve();
            return;
        }
        // Derive the resolver link where the user's portal preferences
        // are expected to be stored.
        let [skylink, errDRL] = deriveResolverLink("v1-skynet-portal-list", "v1-skynet-portal-list-datakey");
        if (errDRL !== null) {
            reject(addContextToErr(errDRL, "unable to get resolver link for users portal prefs"));
            return;
        }
        // Download the user's portal preferences from Skynet.
        downloadSkylink(skylink)
            .then(output => {
            processUserPortalPreferences(output);
            resolve();
        })
            .catch(err => {
            log("lifecycle", "unable to load the users list of preferred portals", err);
            resolve();
        });
    });
};
// progressiveFetch will query multiple portals until one returns with a
// non-error response. In the event of a 4XX response, progressiveFetch will
// keep querying additional portals to try and find a working 2XX response. In
// the event that no working 2XX response is found, the first 4XX response will
// be returned.
//
// This introduces significant latency overheads, especially for 404 responses.
// Future updates to this function could handle 404 responses by looking at a
// bunch of host signatures to be confident in the portal's response rather
// than going on and asking a bunch more portals.
//
// The reason that we don't blindly accept a 4XX response from a portal is that
// we have no way of verifying that the 4XX is legitimate. We don't trust the
// portal, and we can't give a rogue portal the opportunity to interrupt our
// user experience simply by returning a dishonest 404. So we need to keep
// querying more portals and gain confidence that the 404 a truthful response.
var progressiveFetch = function (endpoint, fetchOpts, remainingPortals, first4XX) {
    return new Promise((resolve, reject) => {
        // If we run out of portals and there's no 4XX response, return
        // an error.
        if (!remainingPortals.length && first4XX == null) {
            log("lifecycle", "progressiveFetch failed because all portals have been tried\n", endpoint, "\n", fetchOpts, "\n", remainingPortals);
            reject(new Error("no portals remaining"));
            return;
        }
        // If we run out of portals but there is a first 4XX response,
        // return the 4XX response.
        if (!remainingPortals.length) {
            resolve(first4XX);
            return;
        }
        // Grab the portal and query.
        let portal = remainingPortals.shift();
        let query = "https://" + portal + endpoint;
        // Define a helper function to try the next portal in the event
        // of an error, then perform the fetch.
        let nextPortal = function () {
            progressiveFetch(endpoint, fetchOpts, remainingPortals, first4XX)
                .then(output => resolve(output))
                .catch(err => reject(err));
        };
        fetch(query, fetchOpts)
            .then(response => {
            // Check for a 5XX error.
            if (!("status" in response) || typeof (response.status) !== "number") {
                log("portal", "portal has returned invalid response\n", portal, "\n", query, "\n", response);
                nextPortal();
                return;
            }
            if (response.status >= 500 && response.status < 600) {
                log("portal", "portal has returned 5XX status\n", portal, "\n", query, "\n", response);
                nextPortal();
                return;
            }
            // Special handling for 4XX. If we already have a
            // 'first4XX', we treat this call similarly to the 5XX
            // calls. If we don't yet have a 4XX, we need to create
            // a progressiveFetchResult object that serves as our
            // first 4XX and pass that to our next call to
            // progressiveFetch.
            if (response.status >= 400 && response.status < 500) {
                log("portal", "portal has returned 4XX status\n", portal, "\n", query, "\n", response);
                if (first4XX !== null) {
                    nextPortal();
                    return;
                }
                // Define 'new4XX' as our first4XX response can
                // call progressiveFetch.
                let new4XX = {
                    portal,
                    response,
                    remainingPortals,
                    first4XX: null,
                };
                progressiveFetch(endpoint, fetchOpts, remainingPortals, new4XX)
                    .then(output => resolve(output))
                    .catch(err => reject(err));
            }
            // Success! Resolve the response.
            log("allFetch", "fetch returned successfully\n", query, "\n", response);
            resolve({
                portal,
                response,
                remainingPortals,
                first4XX,
            });
        })
            .catch(err => {
            // This portal failed, try again with the next portal.
            log("portal", "error with fetch call", portal, query, err);
            nextPortal();
        });
    });
};
// ownRegistryEntryKeys will use the user's seed to derive a keypair and a
// datakey using the provided tags.
var ownRegistryEntryKeys = function (keyPairTagStr, datakeyTagStr) {
    // Use the user's seed to derive the registry entry that is going to contain
    // the user's portal list.
    let [userSeed, errGUS] = getUserSeed();
    if (errGUS !== null) {
        return [null, null, addContextToErr(errGUS, "unable to get the user seed")];
    }
    let keyPairTag = new TextEncoder().encode(keyPairTagStr);
    let entropyInput = new Uint8Array(keyPairTag.length + userSeed.length);
    entropyInput.set(keyPairTag);
    entropyInput.set(userSeed, keyPairTag.length);
    let keyPairEntropy = sha512(entropyInput);
    // Use the user's seed to dervie the datakey for the registry entry. We use
    // a different tag to ensure that the datakey is independently random, such
    // that the registry entry looks like it could be any other registry entry.
    let datakeyTag = new TextEncoder().encode(datakeyTagStr);
    let datakeyInput = new Uint8Array(datakeyTag.length + userSeed.length);
    datakeyInput.set(datakeyTag);
    datakeyInput.set(userSeed, datakeyTag.length);
    let datakeyEntropy = sha512(datakeyInput);
    // Create the private key for the registry entry.
    let [keyPair, errKPFS] = keyPairFromSeed(keyPairEntropy.slice(0, 32));
    if (errKPFS !== null) {
        return [null, null, addContextToErr(errKPFS, "unable to derive keypair")];
    }
    let datakey = datakeyEntropy.slice(0, 32);
    return [keyPair, datakey, null];
};
// deriveRegistryEntryID derives a registry entry ID from a provided pubkey and
// datakey.
var deriveRegistryEntryID = function (pubkey, datakey) {
    // Check the lengths of the inputs.
    if (pubkey.length !== 32) {
        return [null, new Error("pubkey is invalid, length is wrong")];
    }
    if (datakey.length !== 32) {
        return [null, new Error("datakey is not a valid hash, length is wrong")];
    }
    // Establish the encoding. First 16 bytes is a specifier, second 8
    // bytes declares the length of the pubkey, the next 32 bytes is the
    // pubkey and the final 32 bytes is the datakey. This encoding is
    // determined by the Sia protocol.
    let encoding = new Uint8Array(16 + 8 + 32 + 32);
    // Set the specifier.
    encoding[0] = "e".charCodeAt(0);
    encoding[1] = "d".charCodeAt(0);
    encoding[2] = "2".charCodeAt(0);
    encoding[3] = "5".charCodeAt(0);
    encoding[4] = "5".charCodeAt(0);
    encoding[5] = "1".charCodeAt(0);
    encoding[6] = "9".charCodeAt(0);
    // Set the pubkey.
    let encodedLen = encodeNumber(32);
    encoding.set(encodedLen, 16);
    encoding.set(pubkey, 16 + 8);
    encoding.set(datakey, 16 + 8 + 32);
    // Get the final ID by hashing the encoded data.
    let id = blake2b(encoding);
    return [id, null];
};
// deriveResolverLink will derive the resolver link from the tags that
// determine the pubkey and datakey.
var deriveResolverLink = function (keypairTagStr, datakeyTagStr) {
    // Compute the ID of the registry entry for the user's
    // preferences.
    let [keypair, datakey, errOREK] = ownRegistryEntryKeys(keypairTagStr, datakeyTagStr);
    if (errOREK !== null) {
        return [null, addContextToErr(errOREK, "unable to derive portal pref registry entry")];
    }
    let [entryID, errDREI] = deriveRegistryEntryID(keypair.publicKey, datakey);
    if (errDREI !== null) {
        return [null, addContextToErr(errDREI, "unable to derive portal entry id")];
    }
    // Build a v2 skylink from the entryID.
    let v2Skylink = new Uint8Array(34);
    v2Skylink.set(entryID, 2);
    v2Skylink[0] = 1;
    let skylink = bufToB64(v2Skylink);
    return [skylink, null];
};
// verifyRegistrySignature will verify the signature of a registry entry.
var verifyRegistrySignature = function (pubkey, datakey, data, revision, sig) {
    let [encodedData, errEPB] = encodePrefixedBytes(data);
    if (errEPB !== null) {
        return false;
    }
    let encodedRevision = encodeNumber(revision);
    let dataToVerify = new Uint8Array(32 + 8 + data.length + 8);
    dataToVerify.set(datakey, 0);
    dataToVerify.set(encodedData, 32);
    dataToVerify.set(encodedRevision, 32 + 8 + data.length);
    let sigHash = blake2b(dataToVerify);
    return verify(sigHash, sig, pubkey);
};
// verifyRegReadResp will check the response body of a registry read on a
// portal. The first return value indicates whether the error that gets
// returned is a problem with the portal, or a problem with the underlying
// registry entry. If the problem is with the portal, the caller should try the
// next portal. If the problem is with the underyling registry entry, the
// caller should handle the error and not try any more portals.
//
// The result has type 'any' because it the object was built from an untrusted
// blob of json.
var verifyRegReadResp = function (response, result, pubkey, datakey) {
    // A 404 is accepted as a non-malicious response and not an error.
    //
    // TODO: If we get a 404 we should keep checking with other portals
    // just to be certain, but also be ready to return a response to the
    // caller that says 404.
    if (response.status == 404) {
        return [false, null];
    }
    // Perform basic verification. If the portal returns the response as
    // successful, check the signature.
    if (response.status === 200) {
        // Verify the reponse has all required fields.
        if (!("data" in result) || !("revision" in result) || !("signature" in result)) {
            return [true, new Error("response is missing fields")];
        }
        // Verify the signature on the registry entry.
        if (!(typeof (result.data) === "string") || !(typeof (result.revision) === "number") || !(typeof (result.signature) === "string")) {
            return [true, new Error("portal response has invalid format")];
        }
        let revision = result.revision;
        // Attempt to decode the hex values of the results.
        let [data, err1] = hex2buf(result.data);
        if (err1 !== null) {
            return [true, new Error("portal result data did not decode from hex")];
        }
        let [sig, err3] = hex2buf(result.signature);
        if (err3 !== null) {
            return [true, new Error("portal result signature did not decode from hex")];
        }
        // Data is clean, check signature.
        if (!verifyRegistrySignature(pubkey, datakey, data, revision, sig)) {
            return [true, new Error("portal response has a signature mismatch")];
        }
        // TODO: If the registry entry has type 2, the signature here
        // will fail even if the portal is being honest, and we will
        // mistakenly assume that the portal is malicious. We need to
        // add a check that verifies the signature of a type 2 registry
        // entry correctly.
        // Verfifcation is complete!
        return [false, null];
    }
    // NOTE: 429's (request denied due to ratelimit) aren't handled by the
    // bootloader because the bootloader only makes five requests total in
    // the worst case (registry entry to get portal list, download for
    // portal list, registry entry for user's preferred portal, registry
    // entry resolving the user's preferred portal, download the user's
    // preferred portal) and those requests are split across two endpoints.
    //
    // The full kernel may overwrite this function to handle ratelimiting,
    // though premium portals may be able to eventually switch to a
    // pay-per-request model using ephemeral accounts that eliminates the
    // need for ratelimiting.
    return [true, new Error("portal response not recognized")];
};
// readOwnRegistryEntryHandleFetch will handle a resolved call to
// progressiveFetch.
var readOwnRegistryEntryHandleFetch = function (output, endpoint, pubkey, datakey) {
    return new Promise((resolve, reject) => {
        // Build a helper function that will continue attempting the
        // fetch call on other portals.
        let continueFetch = function () {
            progressiveFetch(endpoint, null, output.remainingPortals, output.first4XX)
                .then(output => {
                readOwnRegistryEntryHandleFetch(output, endpoint, pubkey, datakey)
                    .then(output => {
                    resolve(output);
                })
                    .catch(err => {
                    reject(addContextToErr(err, "registry read failed"));
                });
            })
                .catch(err => {
                reject(addContextToErr(err, "registry read failed"));
            });
        };
        // Read the response body.
        let response = output.response;
        response.json()
            .then(untrustedResult => {
            // Check whether the response is valid. The response
            // may be invalid in a way that indicates a
            // disfunctional or malicious portal, which means that
            // we should try another portal. Or the response may be
            // invalid in a way that indicates a more fundamental
            // error (portal is honest but the entry itself is
            // corrupt), and we can't make progress.
            let [portalIssue, errVRRR] = verifyRegReadResp(response, untrustedResult, pubkey, datakey);
            if (errVRRR !== null && portalIssue === true) {
                // The error is with the portal, so we want to keep
                // trying more portals.
                log("portal", "portal returned an invalid regread response\n", output.portal, "\n", errVRRR, "\n", response, "\n", untrustedResult);
                continueFetch();
                return;
            }
            if (errVRRR !== null && portalIssue === false) {
                log("lifecycle", "registry entry is corrupt or browser extension is out of date\n", errVRRR, "\n", response, "\n", untrustedResult);
                reject(addContextToErr(errVRRR, "registry entry appears corrupt"));
                return;
            }
            // Create a result with the correct typing.
            let result = untrustedResult;
            // The err is null, call the resolve callback.
            resolve({
                response,
                result,
            });
        })
            .catch(err => {
            log("portal", "unable to parse response body\n", output.portal, "\n", response, "\n", err);
            continueFetch();
            return;
        });
    });
};
// readOwnRegistryEntry will read and verify a registry entry that is owned by
// the user. The tag strings will be hashed with the user's seed to produce the
// correct entropy.
var readOwnRegistryEntry = function (keyPairTagStr, datakeyTagStr) {
    return new Promise((resolve, reject) => {
        // Fetch the keys and encode them to hex, then build the desired endpoint.
        let [keyPair, datakey, errREK] = ownRegistryEntryKeys(keyPairTagStr, datakeyTagStr);
        if (errREK !== null) {
            reject(addContextToErr(errREK, "unable to get user's registry keys"));
        }
        let pubkeyHex = buf2hex(keyPair.publicKey);
        let datakeyHex = buf2hex(datakey);
        let endpoint = "/skynet/registry?publickey=ed25519%3A" + pubkeyHex + "&datakey=" + datakeyHex;
        // Fetch the list of portals and call progressiveFetch.
        let portalList = preferredPortals();
        progressiveFetch(endpoint, null, portalList, null)
            .then(output => {
            readOwnRegistryEntryHandleFetch(output, endpoint, keyPair.publicKey, datakey)
                .then(output => {
                resolve(output);
            })
                .catch(err => {
                reject(addContextToErr(err, "unable to read registry entry"));
            });
        })
            .catch(err => {
            reject(addContextToErr(err, "unable to read registry entry"));
        });
    });
};
// writeNewOwnRegistryEntryHandleFetch is a recursive helper for
// writeNewOwnRegistryEntry that will repeat the call on successive portals if
// there are failures.
var writeNewOwnRegistryEntryHandleFetch = function (output, endpoint, fetchOpts) {
    return new Promise((resolve, reject) => {
        let response = output.response;
        if ("status" in response && response.status === 204) {
            log("writeRegistryAll", "successful registry write", response);
            resolve(response);
        }
        else {
            log("error", "unexpected response from server upon regwrite\n", response, "\n", fetchOpts);
            progressiveFetch(endpoint, fetchOpts, output.remainingPortals, output.first4XX)
                .then(fetchOutput => {
                writeNewOwnRegistryEntryHandleFetch(output, endpoint, fetchOpts)
                    .then(writeOutput => resolve(writeOutput))
                    .catch(err => reject(addContextToErr(err, "unable to perform registry write")));
            })
                .catch(err => {
                reject(addContextToErr(err, "unable to perform registry write"));
            });
        }
    });
};
// writeNewOwnRegistryEntry will write the provided data to a new registry
// entry. A revision number of 0 will be used, because this function is
// assuming that no data yet exists at that registry entry location.
var writeNewOwnRegistryEntry = function (keyPairTagStr, datakeyTagStr, data) {
    return new Promise((resolve, reject) => {
        // Check that the data is small enough to fit in a registry
        // entry. The actual limit for a type 2 entry is 90 bytes, but
        // we are leaving 4 bytes of room for potential extensions
        // later.
        if (data.length > 86) {
            reject("provided data is too large to fit in a registry entry");
            return;
        }
        // Fetch the keys.
        let [keyPair, datakey, errREK] = ownRegistryEntryKeys(keyPairTagStr, datakeyTagStr);
        if (errREK !== null) {
            reject(addContextToErr(errREK, "unable to get user's registry keys"));
            return;
        }
        let pubkeyHex = buf2hex(keyPair.publicKey);
        let datakeyHex = buf2hex(datakey);
        // Compute the signature of the new registry entry.
        let [encodedData, errEPB] = encodePrefixedBytes(data);
        if (errEPB !== null) {
            reject(addContextToErr(errEPB, "unable to encode the registry data"));
            return;
        }
        let encodedRevision = encodeNumber(0);
        let dataToSign = new Uint8Array(32 + 8 + data.length + 8);
        dataToSign.set(datakey, 0);
        dataToSign.set(encodedData, 32);
        dataToSign.set(encodedRevision, 32 + 8 + data.length);
        let sigHash = blake2b(dataToSign);
        let [sig, errS] = sign(sigHash, keyPair.secretKey);
        if (errS !== null) {
            reject(addContextToErr(errS, "unable to produce signature"));
            return;
        }
        // Compose the registry entry query.
        let postBody = {
            publickey: {
                algorithm: "ed25519",
                key: Array.from(keyPair.publicKey),
            },
            datakey: datakeyHex,
            revision: 0,
            data: Array.from(data),
            signature: Array.from(sig),
        };
        let fetchOpts = {
            method: 'post',
            body: JSON.stringify(postBody)
        };
        let endpoint = "/skynet/registry";
        // Perform the fetch call.
        let portalList = preferredPortals();
        progressiveFetch(endpoint, fetchOpts, portalList, null)
            .then(output => {
            writeNewOwnRegistryEntryHandleFetch(output, endpoint, fetchOpts)
                .then(output => {
                resolve(output);
            })
                .catch(errC => {
                reject(addContextToErr(errC, "unable to create new registry entry"));
            });
        })
            .catch(errC => {
            reject(addContextToErr(errC, "unable to create new registry entry"));
        });
    });
};
// parseSkylinkBitfield is a helper function to downloadSkylink which pulls
// the fetchSize out of the bitfield. parseSkylink will return an error if the
// offset is not zero.
var parseSkylinkBitfield = function (skylink) {
    // Validate the input.
    if (skylink.length !== 34) {
        return [0, 0, 0, new Error("provided skylink has incorrect length")];
    }
    // Extract the bitfield.
    let bitfield = new DataView(skylink.buffer).getUint16(0, true);
    // Extract the version.
    let version = (bitfield & 3) + 1;
    // Only versions 1 and 2 are recognized.
    if (version !== 1 && version !== 2) {
        return [0, 0, 0, new Error("provided skylink has unrecognized version")];
    }
    // Verify that the mode is valid, then fetch the mode.
    bitfield = bitfield >> 2;
    if ((bitfield & 255) === 255) {
        return [0, 0, 0, new Error("provided skylink has an unrecognized version")];
    }
    let mode = 0;
    for (let i = 0; i < 8; i++) {
        if ((bitfield & 1) === 0) {
            bitfield = bitfield >> 1;
            break;
        }
        bitfield = bitfield >> 1;
        mode++;
    }
    // If the mode is greater than 7, this is not a valid v1 skylink.
    if (mode > 7) {
        return [0, 0, 0, new Error("provided skylink has an invalid v1 bitfield")];
    }
    // Determine the offset and fetchSize increment.
    let offsetIncrement = 4096 << mode;
    let fetchSizeIncrement = 4096;
    let fetchSizeStart = 0;
    if (mode > 0) {
        fetchSizeIncrement = fetchSizeIncrement << (mode - 1);
        fetchSizeStart = (1 << 15) << (mode - 1);
    }
    // The next three bits decide the fetchSize.
    let fetchSizeBits = bitfield & 7;
    fetchSizeBits++; // semantic upstep, range should be [1,8] not [0,8).
    let fetchSize = fetchSizeBits * fetchSizeIncrement + fetchSizeStart;
    bitfield = bitfield >> 3;
    // The remaining bits determine the offset.
    let offset = bitfield * offsetIncrement;
    if (offset + fetchSize > 1 << 22) {
        return [0, 0, 0, new Error("provided skylink has an invalid v1 bitfield")];
    }
    // Return what we learned.
    return [version, offset, fetchSize, null];
};
// validSkylink returns true if the provided Uint8Array is a valid skylink.
// This is an alias for 'parseSkylinkBitfield', as both perform the same
// validation.
var validSkylink = function (skylink) {
    // Get the bitfield values. If the bitfield parsing doesn't return an error, 
    let [version, offset, fetchSize, errPSB] = parseSkylinkBitfield(skylink);
    if (errPSB !== null) {
        return false;
    }
    return true;
};
// verifyResolverLinkProof will check that the given resolver proof matches the
// provided skylink. If the proof is correct and the signature matches, the
// data will be returned. The returned link will be a verified skylink.
var verifyResolverLinkProof = function (skylink, proof) {
    // Verify the presented skylink is formatted correctly.
    if (skylink.length !== 34) {
        return [null, new Error("skylink is malformed, expecting 34 bytes")];
    }
    // Verify that all of the required fields are present in the proof.
    if (!("data" in proof) || !("datakey" in proof) || !("publickey" in proof) || !("signature" in proof) || !("type" in proof) || !("revision" in proof)) {
        return [null, new Error("proof is malformed, fields are missing")];
    }
    if (!("algorithm" in proof.publickey) || !("key" in proof.publickey)) {
        return [null, new Error("pubkey is malformed")];
    }
    // Verify the typing of the fields.
    if (typeof proof.data !== "string") {
        return [null, new Error("data is malformed")];
    }
    let dataStr = proof.data;
    if (typeof proof.datakey !== "string") {
        return [null, new Error("datakey is malformed")];
    }
    let datakeyStr = proof.datakey;
    if (proof.publickey.algorithm !== "ed25519") {
        return [null, new Error("pubkey has unrecognized algorithm")];
    }
    if (typeof proof.publickey.key !== "string") {
        return [null, new Error("pubkey key is malformed")];
    }
    let pubkeyStr = proof.publickey.key;
    if (typeof proof.signature !== "string") {
        return [null, new Error("signature is malformed")];
    }
    if (proof.type !== 1) {
        return [null, new Error("registry entry has unrecognized type")];
    }
    let sigStr = proof.signature;
    if (typeof proof.revision !== "number") {
        return [null, new Error("revision is malformed")];
    }
    let revision = proof.revision;
    // Decode all of the fields. They are presented in varied types and
    // encodings.
    let [data, errD] = hex2buf(dataStr);
    if (errD !== null) {
        return [null, addContextToErr(errD, "data is invalid hex")];
    }
    let [datakey, errDK] = hex2buf(datakeyStr);
    if (errDK !== null) {
        return [null, addContextToErr(errDK, "datakey is invalid hex")];
    }
    let [pubkey, errPK] = b64ToBuf(pubkeyStr);
    if (errPK !== null) {
        return [null, addContextToErr(errPK, "pubkey key is invalid base64")];
    }
    let [sig, errS] = hex2buf(sigStr);
    if (errS !== null) {
        return [null, addContextToErr(errS, "signature is invalid hex")];
    }
    // Verify that the data is a skylink - this is a proof for a resolver,
    // which means the proof is pointing to a specific skylink.
    if (!validSkylink(data)) {
        return [null, new Error("this skylink does not resolve to another skylink")];
    }
    // Verify that the combination of the datakey and the public key match
    // the skylink.
    let [entryID, errREID] = deriveRegistryEntryID(pubkey, datakey);
    if (errREID !== null) {
        return [null, addContextToErr(errREID, "proof pubkey is malformed")];
    }
    let linkID = skylink.slice(2, 34);
    for (let i = 0; i < entryID.length; i++) {
        if (entryID[i] !== linkID[i]) {
            return [null, new Error("proof pubkey and datakey do not match the skylink root")];
        }
    }
    // Verify the signature.
    if (!verifyRegistrySignature(pubkey, datakey, data, revision, sig)) {
        return [null, new Error("signature does not match")];
    }
    return [data, null];
};
// verifyResolverLinkProofs will verify a set of resolver link proofs provided
// by a portal after performing a resolver link lookup. Each proof corresponds
// to one level of resolution. The final value returned will be the V1 skylink
// at the end of the chain.
//
// This function treats the proof as untrusted data and will verify all of the
// fields that are provided.
var verifyResolverLinkProofs = function (skylink, proof) {
    // Check that the proof is an array.
    if (!Array.isArray(proof)) {
        return [null, new Error("provided proof is not an array")];
    }
    if (proof.length === 0) {
        return [null, new Error("proof array is empty")];
    }
    // Check each proof in the chain, returning the final skylink.
    for (let i = 0; i < proof.length; i++) {
        let errVRLP;
        [skylink, errVRLP] = verifyResolverLinkProof(skylink, proof[i]);
        if (errVRLP !== null) {
            return [null, addContextToErr(errVRLP, "one of the resolution proofs is invalid")];
        }
    }
    // Though it says 'skylink', the verifier is actually just returning
    // whatever the registry data is. We need to check that the final value
    // is a V1 skylink.
    if (skylink.length !== 34) {
        return [null, new Error("final value returned by the resolver link is not a skylink")];
    }
    let [version, x, xx, errPSB] = parseSkylinkBitfield(skylink);
    if (errPSB !== null) {
        return [null, addContextToErr(errPSB, "final value returned by resolver link is not a valid skylink")];
    }
    if (version !== 1) {
        return [null, new Error("final value returned by resolver link is not a v1 skylink")];
    }
    return [skylink, null];
};
// verifyDownload will verify a download response from a portal. The input is
// essentially components of a skylink - the offset, length, and merkle root.
// The output is the raw file data.
//
// The 'buf' input should match the standard response body of a verified
// download request to a portal, which is the skylink raw data followed by a
// merkle proof. The offset and length provided as input indicate the offset
// and length of the skylink raw data - not the offset and length of the
// request within the file (that would be a different set of params).
//
// The skylink raw data itself breaks down into a metadata component and a file
// component. The metadata component will contain information like the length
// of the real file, and any fanout structure for large files. The first step
// we need to take is verifying the Merkel proof, which will appear at the end
// of the buffer. We'll have to hash the data we received and then compare it
// against the Merkle proof and ensure it matches the data we are expecting.
// Then we'll have to look at the layout to figure out which pieces of the data
// are the full file, while also checking for corruption as the file can be
// malicious independent of the portal operator.
//
// As long as the Merkle proof matches the root, offset, and length that we
// have as input, the portal is considered non-malicious. Any additional errors
// we find after that can be considered malice or incompetence on the part of
// the person who uploaded the file.
var verifyDownload = function (root, offset, fetchSize, buf) {
    let u8 = new Uint8Array(buf);
    // Input checking. If any of this is incorrect, its safe to blame the
    // server because the skylink format fundamentally should enable these
    // to be correct.
    if (u8.length < fetchSize) {
        return [null, true, new Error("provided data is not large enough to cover fetchSize")];
    }
    if (u8.length < 99) {
        return [null, true, new Error("provided data is not large enough to contain a skyfile")];
    }
    // Grab the skylinkData and Merkle proof from the array, and then
    // verify the Merkle proof.
    let skylinkData = u8.slice(0, fetchSize);
    let merkleProof = u8.slice(fetchSize, u8.length);
    let errVBSRP = verifyBlake2bSectorRangeProof(root, skylinkData, offset, fetchSize, merkleProof);
    if (errVBSRP !== null) {
        log("lifecycle", "merkle proof verification error", skylinkData.length, offset, fetchSize);
        return [null, true, addContextToErr(errVBSRP, "provided Merkle proof is not valid")];
    }
    // The organization of the skylinkData is always:
    // 	layoutBytes || fanoutBytes || metadataBytes || fileBytes
    //
    // The layout is always exactly 99 bytes. Bytes [1,8] of the layout
    // contain the exact size of the fileBytes. Bytes [9, 16] of the layout
    // contain the exact size of the metadata. And bytes [17,24] of the
    // layout contain the exact size of the fanout. To get the offset of
    // the fileData, we need to extract the sizes of the metadata and
    // fanout, and then add those values to 99 to get the fileData offset.
    let fileSizeBytes = skylinkData.slice(1, 9);
    let mdSizeBytes = skylinkData.slice(9, 17);
    let fanoutSizeBytes = skylinkData.slice(17, 25);
    let [fileSize, errFSDN] = decodeNumber(fileSizeBytes);
    if (errFSDN !== null) {
        return [null, false, addContextToErr(errFSDN, "unable to decode filesize")];
    }
    let [mdSize, errMDDN] = decodeNumber(mdSizeBytes);
    if (errMDDN !== null) {
        return [null, false, addContextToErr(errMDDN, "unable to decode metadata size")];
    }
    let [fanoutSize, errFODN] = decodeNumber(fanoutSizeBytes);
    if (errFODN !== null) {
        return [null, false, addContextToErr(errFODN, "unable to decode fanout size")];
    }
    if (skylinkData.length < 99 + fileSize + mdSize + fanoutSize) {
        // return [null, false, new Error("provided data is too short to contain the full skyfile")]
    }
    let fileData = skylinkData.slice(99 + mdSize + fanoutSize, 99 + mdSize + fanoutSize + fileSize);
    return [fileData, false, null];
};
// downloadSkylinkHandleFetch will process the response to a fetch call that
// downloads a skylink. We need the helper so that the verification step can be
// recursive and make additional calls to progressiveFetch if it is determined
// that we need to try downloading from the next portal.
var downloadSkylinkHandleFetch = function (output, endpoint, u8Link) {
    return new Promise((resolve, reject) => {
        let response = output.response;
        // Check for 404s.
        if (response.status === 404) {
            resolve({
                response,
                fileData: null,
            });
            return;
        }
        // The only other response code we know how to handle
        // here is a 200, anything else should result in an
        // error.
        if (response.status !== 200) {
            log("portal", "unrecognized response status from portal\n", response);
            reject(new Error("unrecognized response status"));
            return;
        }
        // Get the link variables, we need these. Recomputing them is
        // cleaner than passing them in again.
        let [version, offset, fetchSize, errBF] = parseSkylinkBitfield(u8Link);
        if (errBF !== null) {
            reject(addContextToErr(errBF, "skylink bitfield is invalid"));
            return;
        }
        // Helper function for readability.
        let continueFetch = function () {
            progressiveFetch(endpoint, null, output.remainingPortals, output.first4XX)
                .then(output => {
                downloadSkylinkHandleFetch(output, endpoint, u8Link)
                    .then(output => {
                    resolve(output);
                })
                    .catch(err => {
                    reject(err);
                });
            })
                .catch(err => {
                reject(addContextToErr(err, "downloadSkylink failed"));
            });
        };
        // If the skylink was a resolver link (meaning the
        // version is 2), check the 'skynet-proof' header to
        // verify that the registry entry is being resolved
        // correctly.
        if (version === 2) {
            // Grab the proof header.
            let proofJSON = response.headers.get("skynet-proof");
            if (proofJSON === null) {
                log("portal", "response did not include resolver proofs", response);
                continueFetch();
                return;
            }
            let [proof, errPH] = parseJSON(proofJSON);
            if (errPH !== null) {
                log("portal", "error validating the resolver link proof", errPH);
                continueFetch();
                return;
            }
            // Verify the proof.
            let errVRLP;
            [u8Link, errVRLP] = verifyResolverLinkProofs(u8Link, proof);
            if (errVRLP !== null) {
                log("portal", "received corrupt resolver proofs", errVRLP);
                continueFetch();
                return;
            }
            // Update the version/offset/fetchsize.
            [version, offset, fetchSize, errBF] = parseSkylinkBitfield(u8Link);
            if (errBF !== null) {
                log("portal", "received invalid final skylink\n", u8Link, "\n", errBF);
                continueFetch();
                return;
            }
            // Verify the final link is a v1 link.
            if (version !== 1) {
                log("portal", "received final skylink that is not V1");
                continueFetch();
                return;
            }
        }
        // At this point we've confirmed that the headers and resolver
        // proofs are valid. We've also got an updated u8Link and
        // version/offset/fetchsize to match our download, so we can
        // use those values to read the text.
        response.arrayBuffer()
            .then(buf => {
            // Verify the data that we have downloaded from the
            // server.
            let [fileData, portalAtFault, errVD] = verifyDownload(u8Link.slice(2, 34), offset, fetchSize, buf);
            if (errVD !== null && portalAtFault) {
                log("lifecycle", "received invalid download from portal", errVD);
                continueFetch();
                return;
            }
            if (errVD !== null && !portalAtFault) {
                log("lifecycle", "received valid download, but data is corrupt");
                reject(addContextToErr(errVD, "the requested download is corrupt"));
                return;
            }
            // Download is complete, the fileData is verified, we
            // can return it.
            resolve({
                response: response,
                fileData: fileData,
            });
        })
            .catch(err => {
            log("portal", "downloadSkylink response parsed unsuccessfully\n", response, "\n", err);
            continueFetch();
        });
    });
};
// downloadSkylink will perform a download on the provided skylink, verifying
// that the link is valid. If the link is a content link, the data returned by
// the portal will be verified against the hash. If the link is a resolver
// link, the registry entry proofs returned by the portal will be verified and
// then the resulting content will also be verified.
var downloadSkylink = function (skylink) {
    return new Promise((resolve, reject) => {
        // Verify that the provided skylink is a valid skylink.
        let [u8Link, err64] = b64ToBuf(skylink);
        if (err64 !== null) {
            reject(addContextToErr(err64, "unable to decode skylink"));
            return;
        }
        if (u8Link.length !== 34) {
            reject(new Error("input skylink is not the correct length"));
            return;
        }
        let [version, offset, fetchSize, errBF] = parseSkylinkBitfield(u8Link);
        if (errBF !== null) {
            reject(addContextToErr(errBF, "skylink bitfield is invalid"));
            return;
        }
        // Establish the endpoint that we want to call on the portal and the
        // list of portals we want to use.
        let endpoint = "/skynet/trustless/basesector/" + skylink; // + "/"
        let portalList = preferredPortals();
        progressiveFetch(endpoint, null, portalList, null)
            .then(output => {
            downloadSkylinkHandleFetch(output, endpoint, u8Link)
                .then(output => {
                resolve(output);
            })
                .catch(err => {
                reject(addContextToErr(err, "unable to download skylink"));
            });
        })
            .catch(err => {
            reject(addContextToErr(err, "unable to download skylink"));
        });
    });
};
var defaultKernelResolverLink = "AQD-tF2or749PlOpcgFaaTLjO2m9pNDBAwUDjE_SvX_TEQ";
// Establish a promise that will block until the kernel is loaded. Messages
// that are received will wait to be processed until the kernel has finished
// bootstrapping. Messages that are required for kernel bootstrapping will
// bypass the block.
//
// The kernelHasLoaded variable is used by the handleMessage function to make
// sure that messages aren't stuck in an infinite loop.
var kernelLoaded;
var blockUntilLoaded = new Promise(resolve => { kernelLoaded = resolve; });
var kernelHasLoaded = false;
// getUserSeed will return the seed that is stored in localStorage. This is the
// first function that gets called when the kernel iframe is openend. The
// kernel will not be loaded if no seed is present, as it means that the user
// is not logged in.
var getUserSeed = function () {
    // Pull the string version of the seed from localstorage.
    let userSeedString = window.localStorage.getItem("v1-seed");
    if (userSeedString === null) {
        return [null, new Error("no user seed in local storage")];
    }
    // Parse the string into a Uint8Array and return the result.
    let userSeed = Uint8Array.from([...userSeedString].map(ch => ch.charCodeAt(0)));
    return [userSeed, null];
};
// downloadDefaultKernel will download the default kernel.
var downloadDefaultKernel = function () {
    return new Promise((resolve, reject) => {
        downloadSkylink(defaultKernelResolverLink)
            .then(output => {
            // Handle the success case.
            if (output.response.status === 200) {
                let [text, errBTS] = bufToStr(output.fileData);
                if (errBTS !== null) {
                    reject(addContextToErr(errBTS, "kernel data is invalid"));
                    return;
                }
                resolve(text);
                return;
            }
            // Handle every other response status.
            log("lifecycle", "portal response not recognized", output.response);
            reject("response not recognized when reading default kernel");
            return;
        })
            .catch(err => {
            reject(addContextToErr(err, "unable to download default portal"));
        });
    });
};
// processUserKernelDownload handles the result of attempting to download the
// kernel stored at the user's seed. This is a 'success' response, meaning that
// the network query succeeded without any malice from the portals. That is
// still not the same as the download completing, the result of the query may
// have been a 404, for example.
var processUserKernelDownload = function (output) {
    return new Promise((resolve, reject) => {
        // Handle the success case.
        let response = output.response;
        if (response.status === 200) {
            let [text, errBTS] = bufToStr(output.fileData);
            if (errBTS !== null) {
                reject(addContextToErr(errBTS, "kernel data is invalid"));
                return;
            }
            resolve(text);
            return;
        }
        // Handle the 404 case, which invovles writing the default
        // kernel to the user's kernel registry entry and then
        // downloading the default kernel and returning it. We write
        // the default kernel as the user's kernel because we want the
        // user to have a consistent experience between browsers. If
        // the first kernel they ever used was of a particular
        // distribution, we want the next time they log in (even if on
        // a different device with a different extension) to use the
        // same kernel.
        if (response.status === 404) {
            log("lifecycle", "user has no established kernel, trying to set the default");
            // Perform the registry write.
            let [defaultKernelSkylink, err64] = b64ToBuf(defaultKernelResolverLink);
            if (err64 !== null) {
                log("lifecycle", "could not convert defaultKernelSkylink to a uin8array");
                reject(addContextToErr(err64, "could not convert defaultKernelSkylink"));
                return;
            }
            writeNewOwnRegistryEntry("v1-skynet-kernel", "v1-skynet-kernel-datakey", defaultKernelSkylink)
                .then(response => {
                log("lifecycle", "succesfully set the user's kernel to the default kernel");
            })
                .catch(err => {
                log("lifecycle", "unable to set the user's kernel\n", err);
            });
            // Need to download and eval the default kernel.
            downloadDefaultKernel()
                .then(text => {
                resolve(text);
            })
                .catch(err => {
                reject(addContextToErr(err, "unable to download default kernel"));
            });
            return;
        }
        // Handle every other response status.
        log("lifecycle", "response not recognized when reading user kernel\n", response);
        reject("response not recognized when reading user's kernel");
        return;
    });
};
// downloadUserKernel will download the user's kernel, falling back to the
// default if necessary.
var downloadUserKernel = function () {
    return new Promise((resolve, reject) => {
        // Get the resolver link for the user's kernel.
        let [skylink, errDRL] = deriveResolverLink("v1-skynet-kernel", "v1-skynet-kernel-datakey");
        if (errDRL !== null) {
            reject(addContextToErr(errDRL, "unable to get resovler link for user's portal prefs"));
            return;
        }
        // Attempt the download.
        downloadSkylink(skylink)
            .then(output => {
            processUserKernelDownload(output)
                .then(kernel => resolve(kernel))
                .catch(err => {
                reject(addContextToErr(err, "unable to download kernel for the user"));
            });
        })
            .catch(err => {
            reject(addContextToErr(err, "unable to download user's kernel"));
        });
    });
};
// kernelDiscoveryFailed defines the callback that is called in
// readRegistryAndLoadKernel after we were unable to read the user's registry
// entry from Skynet. Note that this is different from a 404, it means that we
// could not get a reliable read at all.
//
// If we can't figure out what kernel the user wants to load, we are going to
// abort and send an error message to the parent, because we don't want the UX
// of loading the default kernel for the user if there's a different kernel
// that they are already used to.
var kernelDiscoveryFailed = function (err) {
    // Set kernelLoading to false. This needs to happen before the call to
    // postMessage so that when the parent initiates a new kernel load, the
    // attempt will not be blocked.
    kernelLoading = false;
    // Log the error and send a failure notification to the parent.
    log("auth", "unable to load user's kernel", err);
    window.parent.postMessage({
        method: "kernelAuthStatus",
        data: {
            userAuthorized: true,
            err: err.message,
        },
    }, window.parent.origin);
    kernelLoaded();
    kernelHasLoaded = true;
};
// evalKernel will call 'eval' on the provided kernel code.
var evalKernel = function (kernel) {
    // The eval will throw if the userSeed is not available. This shouldn't
    // happen, but we catch the throw here anyway.
    try {
        eval(kernel);
    }
    catch (err) {
        logErr("kernel could not be loaded", err);
        return;
    }
    log("lifecycle", "user kernel successfully loaded");
    // Only send a message indicating that the kernel was successfully
    // loaded if the auth status hasn't changed in the meantime.
    if (authChangeMessageSent === false) {
        window.parent.postMessage({
            method: "kernelAuthStatus",
            data: {
                userAuthorized: true,
                err: null,
            },
        }, window.parent.origin);
        kernelLoaded();
        kernelHasLoaded = true;
    }
};
// loadSkynetKernel handles loading the the skynet-kernel from the user's
// skynet storage. We use 'kernelLoading' to ensure this only happens once. If
// loading fails, 'kernelLoading' will be set to false, and an error will be
// sent to the parent, allowing the parent a chance to fix whatever is wrong
// and try again. Usually a failure means the user is not logged in.
var kernelLoading = false;
var loadSkynetKernel = function () {
    // Check the loading status of the kernel. If the kernel is loading,
    // block until the loading is complete and then send a message to the
    // caller indicating a successful load.
    if (kernelLoading) {
        return;
    }
    kernelLoading = true;
    // Load the user's preferred portals from their skynet data. Add a
    // callback which will load the user's preferred kernel from Skynet
    // once the preferred portal has been established.
    initUserPortalPreferences()
        .then(nil => {
        return downloadUserKernel();
    })
        .then(kernel => {
        evalKernel(kernel);
        log("auth", "kernel is loaded");
    })
        .catch(err => {
        log("auth", "unable to load kernel", err);
        kernelDiscoveryFailed(err);
    });
};
// handleSkynetKernelRequestOverride is defined for two pages when the user
// hasn't logged in: the home page, and the authentication page.
var handleSkynetKernelRequestOverride = function (event) {
    // Define the headers that need to be injected when responding to the
    // GET request. In this case (pre-auth), the headers will be the same
    // for all pages that we inject.
    let headers = [
        {
            name: "content-type",
            value: "text/html; charset=utf8",
        },
    ];
    // Define a helper function for returning an error.
    let data = event.data;
    let respondErr = function (err) {
        event.source.postMessage({
            nonce: data.nonce,
            method: "response",
            err,
        }, event.origin);
    };
    let respondBody = function (body) {
        let msg = {
            nonce: data.nonce,
            method: "response",
            err: null,
        };
        if (body === null) {
            msg["data"] = {
                override: false,
            };
        }
        else {
            msg["data"] = {
                override: true,
                headers,
                body,
            };
        }
        event.source.postMessage(msg, event.origin);
    };
    // Input checking.
    if (!("data" in data) || !("url" in data.data) || typeof data.data.url !== "string") {
        respondErr("no url provided: " + JSON.stringify(data));
        return;
    }
    if (!("method" in data.data) || typeof data.data.method !== "string") {
        respondErr("no data.method provided: " + JSON.stringify(data));
        return;
    }
    // Handle the auth page.
    //
    // TODO: Change the authpage to a v2link so that we can update the
    // without having to modify the file.
    let url = data.data.url;
    if (url === "http://kernel.skynet/auth.html") {
        downloadSkylink("OAC7797uTAoG25e9psL6ejA71VLKinUdF4t76sMkYTj8IA")
            .then(result => {
            respondBody(result.fileData);
        })
            .catch(err => {
            respondErr("unable to fetch skylink for kernel page: " + err);
        });
        return;
    }
    respondBody(null);
};
// handleSkynetKernelProxyInfo responds to a DNS query. The default kernel
// always responds that there should be no proxy for the given domain - the
// background script already has special carveouts for all required domains.
var handleSkynetKernelProxyInfo = function (event) {
    event.source.postMessage({
        nonce: event.data.nonce,
        method: "response",
        err: null,
        data: {
            proxy: false,
        },
    }, event.origin);
};
// handleTest responds to the 'test' method.
var handleTest = function (event) {
    event.source.postMessage({
        nonce: event.data.nonce,
        method: "response",
        err: null,
        data: {
            version: "v0.0.1",
        },
    }, event.origin);
};
// Establish the event listener for the kernel. There are several default
// requests that are supported, namely everything that the user needs to create
// a seed and log in with an existing seed, because before we have the user
// seed we cannot load the rest of the skynet kernel.
var handleMessage = function (event) {
    // Establish some error handling helpers.
    let respondUnknownMethod = function (method) {
        event.source.postMessage({
            nonce: event.data.nonce,
            method: "response",
            err: "unrecognized method (user may need to log in): " + method,
        }, event.origin);
    };
    // Check that there's a nonce.
    if (!("nonce" in event.data)) {
        return;
    }
    if (!("method" in event.data)) {
        respondUnknownMethod("[no method provided]");
        return;
    }
    // Establish a debugging handler that a developer can call to verify
    // that round-trip communication has been correctly programmed between
    // the kernel and the calling application.
    if (event.data.method === "test") {
        handleTest(event);
        return;
    }
    // Create default handlers for the requestOverride and proxyInfo
    // methods.  These methods are important during bootloading to ensure
    // that the default login page can be loaded for the user.
    //
    // TODO: Only select versions of these methods should actually run, we
    // don't want to do everything prior to boostrap just the requests that
    // directly pertain to the bootstrapping process.
    if (event.data.method === "requestOverride") {
        handleSkynetKernelRequestOverride(event);
        return;
    }
    if (event.data.method === "proxyInfo") {
        handleSkynetKernelProxyInfo(event);
        return;
    }
    // This message is not supposed to be handled until the kernel has
    // loaded. If the kernel is already loaded, then we respond with an
    // error. If the kernel has not yet loaded, we wait until the kernel is
    // loaded. Then we call 'handleMessage' again because the full kernel
    // will overwrite the function, and we want to use the new rules.
    if (kernelHasLoaded === true) {
        respondUnknownMethod(event.data.method);
    }
    else {
        blockUntilLoaded
            .then(x => {
            handleMessage(event);
        });
    }
};
window.addEventListener("message", event => { handleMessage(event); });
// Establish a storage listener for the kernel that listens for any changes to
// the userSeed storage key. In the event of a change, we want to emit an
// 'kernelAuthStatusChanged' method to the parent so that the kernel can be
// refreshed.
var authChangeMessageSent = false;
var handleStorage = function (event) {
    // A null key indicates that storage has been cleared, which also means
    // the auth status has changed.
    if (event.key === "v1-seed" || event.key === null) {
        authChangeMessageSent = true;
        window.parent.postMessage({ method: "kernelAuthStatusChanged" }, window.parent.origin);
    }
};
window.addEventListener("storage", event => (handleStorage(event)));
// Send a message indicating that the kernel has loaded.
window.parent.postMessage({
    method: "kernelReady",
    data: {},
}, window.parent.origin);
// If the user seed is in local storage, we'll load the kernel. If the user seed
// is not in local storage, we'll report that the user needs to perform
// authentication.
let [userSeed, errGSU] = getUserSeed();
if (errGSU !== null) {
    // Send a message indicating the auth status.
    log("auth", "user is not logged in\n", errGSU);
    window.parent.postMessage({
        method: "kernelAuthStatus",
        data: {
            userAuthorized: false,
            err: null,
        },
    }, window.parent.origin);
    kernelLoaded();
    kernelHasLoaded = true;
}
else {
    log("auth", "user is logged in, attempting to load kernel");
    loadSkynetKernel();
}

},{}]},{},[1]);
