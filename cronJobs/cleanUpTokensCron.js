const cron = require("node-cron");

module.exports = (tokenModel) => {
	// Run every day at midnight
	cron.schedule("0 0 * * *", async () => {
		try {
			const overstayDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 days ago (see Note 1)
			const deleted = await tokenModel.deleteExpiredTokens(overstayDate);
			console.log(`[CRON] Deleted ${deleted} expired tokens.`);
		} catch (err) {
			console.error("[CRON] Error cleaning up tokens:", err.message);
		}
	});
};

/*
    NOTES

    Note 1

        This is a workaround where I do not need to store the expiry date in the tokens table. Instead, I rely on the updated_at which comes 
        by default since I included timestamps in the token. 
        
        Scenario 1 (default):
            Default scenario, when you login the first time, you're updated_at = created_at by default.
        
        Scenario 2:
            You somehow managed to log in twice. Let's say refresh token lasts 1 day. You logged in again before that day has finished FROM THE 
            SAME DEVICE (incognito window counts as a separate device). In an actual website, we won't view the login button for you after you're 
            logged in/authenticated, but still, as a proper backend engineer, we also handle cases where the user can use Postman for instance. So 
            basically now, we managed to update that refresh token for you, and you're updated_at date is now counted as the new timer for your token's 
            expiry.

        So, let's say I designed refresh tokens to last one day. Here's the thing, the .deleteExpiredTokens() method is comparing against your updated_at 
        times, but you can conceptualize that as your created_at time to make it more intuitive. In other words, we are always comparing against when your 
        refreshToken has been issued or last renewed, NOT WHEN IT EXPIRES. That's why, we are comparing the updated_at in the cronjob to 1 day ago, NOT AT 
        THE CURRENT MOMENT THE CRONJOB IS RUNNING. We do that by saying Date.now() - 1 * 24 * 60 * 60 * 1000. If we were to use Date.now(), as opposed to 
        one day ago, to compare, I would need to be comparing against the expiry date, not the date it was issued (reflected by updated_at in scenario 1 
        since it's equal to created_at) or last renewed (also reflected by updated_at in scenario 2).

        Imagine it like this:

                                       updated_at -------> 1 day from now (actual expiry)
            1 day ago <--------- cronjob interval (now) [checks updated_at against 1 day ago]

            time passes:
                            updated_at -------> 16 hours from now
            1 day ago <--------- cronjob interval (now) [checks updated_at against 1 day ago]
            
            time passes:

                    updated_at -------> 8 hours from now (actual expiry)
                1 day ago <--------- cronjob interval (now) [checks updated_at against 1 day ago]
            
            time passes:

                updated_at -------> 2 hours from now (actual expiry)
                            1 day ago <--------- cronjob interval (now) [checks updated_at against 1 day ago]
            
            time passes:

                    updated_at -------> now (actual expiry)
                                        1 day ago <--------- cronjob interval (now) [checks updated_at against 1 day ago]

                BOOM, they finally meet!
                    

        Here's a sample scenario with sample dates to help better explain the idea. A user logged in at 18:00 on Jan 01, the updated_at field would 
        now be assigned to that time. If I set the expiry date of the cookie to be one day, his cookie cannot last longer than 18:00 Jan 02. So, 
        let's say my cronjob will run every midnight. At 00:00 Jan 02 is the first run, has the overstayed date been reached? Well, let's see, we're 
        checking for one day ago from now. That would be 00:00 on Jan 01. Compare that with updated_at date (which is actually when he logged in) => 
        00:00 on Jan 01 < 18:00 Jan 01. He hasn't overstayed, keep his token. Now let's fast forward to the next run of my cronjob, 00:00 on Jan 03. 
        Let's say homeboy never logged out and his refreshToken is still floating around in my db, but it is no longer on his browser either (either 
        because it expired or it got deleted if he logged in from an incognito window and closed the window without logging out). In such a scenario, 
        my cronjob would compare this zombie refreshToken in my db's updated_at field with the over stay date. Now one day ago would have been 00:00 
        on Jan 02. Let's compare that with his updated_at date => 00:00 on Jan 02 > 18:00 Jan 01. He has overstayed his welcome and since I designed 
        cookies to last just 1 day, my minimum threshold for overstaying has to be 1. That's why const overstayDate = new Date(Date.now() - 1 * 24 * 60 
        * 60 * 1000). But you can be more lenient (for no reason though) and make it longer than 1, but 1 is the minimum.
*/
