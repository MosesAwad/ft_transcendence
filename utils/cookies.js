const crypto = require("crypto");
const cookie = require("cookie");

function parseCookies(rawCookieHeader) {
	return cookie.parse(rawCookieHeader || ""); // cookie.parse needs a string otherwise TypeError thrown, saw if rawCookieHeader is undefined, send ""
}

function verifySignedCookie(rawCookieHeader, cookieName, secret) {
	const cookies = parseCookies(rawCookieHeader);
	const rawValue = cookies[cookieName];

	if (!rawValue) {
		return null; // No cookie found
	}

	// Fastify signed cookie format: "<jwt>.<signature>"
	const lastDotPos = rawValue.lastIndexOf(".");
	if (lastDotPos === -1) {
		return null;
	}

	const value = rawValue.slice(0, lastDotPos);
	const signature = rawValue.slice(lastDotPos + 1);

	const sigBuf = Buffer.from(signature, "base64"); // This is standard base64 (which JWT uses) NOT base64url, there's a difference
	const expectedSig = crypto
		.createHmac("sha256", secret)
		.update(value)
		.digest("base64"); // ← STOP here
	const expectedBuf = Buffer.from(expectedSig, "base64"); // This is standard base64 (which JWT uses) NOT base64url, there's a difference

	if (sigBuf.length !== expectedBuf.length) {
		return null; // Not valid
	}

	if (crypto.timingSafeEqual(sigBuf, expectedBuf)) {
		return value; // Valid signature
	}
	return null; // tampered or invalid
}

module.exports = {
	verifySignedCookie,
};

/*
    NOTES

		function parseCookies(rawCookieHeader) {
			const cookies = {};
			if (!rawCookieHeader) {
				return cookies; // If no cookies, return empty object
			}

			rawCookieHeader.split(";")?.forEach((cookie) => {
				const [name, ...rest] = cookie.trim().split("="); // Note 1
				if (!name || rest.length === 0) {
					return;
				}
				cookies[name] = decodeURIComponent(rest.join("=")); // Note 1 (ibid)
			});
			return cookies;
		}

    NOTE 1
    
    In case the cookie somehow had an = inside the value (common with JWTs or base64 data), this tells it continue. Example:
        cookie = "signedCookie=value.with.equals=signs=inside";
        
        Then because we said ...rest, we get:

            rest = ["value.with.equals", "signs", "inside"]

        rest.join("=") then reconstructs it as:

            cookies[cookie] = "value.with.equals=signs=inside"
        
    Now why do we use decodeURIComponent? Because cookie values are often URL-encoded by browsers to safely transmit special characters 
    (like = or ;) over HTTP headers. However, this is a browser feature, so actually when the server originally signed the cookie (e.g., 
    using HMAC), it used the raw, unencoded value. So to properly verify the signature and compare hashes, we first need to decode the 
    cookie back to its original, raw form using decodeURIComponent. Example:

        Set-Cookie: theme=light%20mode
            Will show up in document.cookie or request headers as:
                "theme=light%20mode"
            
            If you just .split("=") and store it as-is, you get:
                cookies["theme"] = "light%20mode"
            
            But you really want:
                cookies["theme"] = "light mode"
            
            So you use:
                decodeURIComponent("light%20mode") // → "light mode"
*/
