
const refreshDuration = 5 * 60 * 1000;

module.exports = async (tokenModel) => {
    const expiryThreshold = new Date(Date.now() - refreshDuration);

    const convertedExpiryDate = expiryThreshold.toISOString();
    const dotPosition = convertedExpiryDate.indexOf(".");
    const formattedExpiry = convertedExpiryDate.replace('T', ' ').substring(0, dotPosition);

    await tokenModel.invalidateExpiredTokens(formattedExpiry);
    console.log("🔊 Scanned the refresh tokens list to remove any stale tokens 🔊");
};
