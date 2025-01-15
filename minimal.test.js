const jsrsasign = require("jsrsasign")
const fs = require('node:fs')
const path = require('node:path')
require('dotenv').config()

const SWISSRE_API_ROOT = "https://catnet.api.swissre.com"
const SWISSRE_API_IDENTITY_ENDPOINT = "https://identity.swissre.com/oauth2/ausa60949zNj4vEmp0i7/v1/token"


test("Can connect to CatNet, retrieve token, and make call", async () => {
    var currentTime = +new Date(); // the current time in milliseconds
    var currentTimeSeconds = currentTime / 1000;

    const { swissReClientId, swissRePrivateKey } = getCatnetDetails()
    if (!swissReClientId || !swissRePrivateKey) {
        expect(false).toBe(true)
        return
    }

    var issuedAtTimeSeconds = currentTimeSeconds;
    var expirationTimeSeconds = currentTimeSeconds + 3200;

    var header = {
        "typ": "JWT",
        "kid": undefined,
        "alg": "RS256"
    };


    var payload = {
        "iss": swissReClientId,
        "aud": SWISSRE_API_IDENTITY_ENDPOINT,
        "sub": swissReClientId,
        "exp": Math.ceil(expirationTimeSeconds),
        "iat": Math.ceil(issuedAtTimeSeconds)
    };

    const client_assertion = await jsrsasign.KJUR.jws.JWS.sign(header.alg, JSON.stringify(header), JSON.stringify(payload), swissRePrivateKey)
    // console.log(client_assertion)
    const urlencodedData = new URLSearchParams({
        client_assertion,
        grant_type: "client_credentials",
        client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    })
    const res = await fetch(SWISSRE_API_IDENTITY_ENDPOINT, {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: urlencodedData
    })

    if (res.status !== 200) {
        console.error("Error getting swissre token: " + await res.text())
    }
    expect(res.status).toBe(200)
    const newToken = await res.json()
    const tkn = newToken.token_type + " " + newToken.access_token
    const swissreres = await fetch(`${SWISSRE_API_ROOT}/v1/Layers`, {
        headers: {
            "Authorization": tkn
        }
    })

    if (res.status !== 200) {
        console.error("Had swissre token, however got a non-200 response from server: ["+swissreres.status+"] " + await swissreres.text())
    }
    expect(swissreres.status).toBe(200)
}, 20_000)


async function generateAssertation(header, payload, swissRePrivateKey) {
    return 
}

function getCatnetDetails() {
    const pathToKeyfile = path.join(__dirname, "private.key")
    const keystat = fs.statSync(pathToKeyfile)
    const swissReClientId = process.env.CATNET_CLIENT_ID
    if (!keystat.isFile() || !swissReClientId) {
        // we aren't configured to test, so skip
        return {}
    }
    const swissRePrivateKey = fs.readFileSync(pathToKeyfile).toString()
    return {swissReClientId, swissRePrivateKey}
}