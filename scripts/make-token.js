const crypto = require('crypto');

const SECRET = '7d0b4d51a76a93e7bfa48e8f1cb42d27bba8c9d7e5f164f8d6c4b9a17f3e8c52';

function bytesToBase64Url(buf) {
    return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encodeJson(value) {
    return bytesToBase64Url(Buffer.from(JSON.stringify(value), 'utf8'));
}

async function main() {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        user_id: '11287d21-7f7e-f111-b337-002248364078',
        username: 'gmedina',
        role: 'ADMIN',
        iat: now,
        exp: now + 60 * 60 * 24 * 7,
    };
    const body = `${encodeJson({ alg: 'HS256', typ: 'JWT' })}.${encodeJson(payload)}`;
    const signature = crypto.createHmac('sha256', SECRET).update(body).digest('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    console.log(`${body}.${signature}`);
}

main();
