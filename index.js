require("dotenv").config();

const axios = require("axios");
const Steam = require("steam");
const SteamGroups = require("steam-groups");

const steamClient = new Steam.SteamClient();
const steamUser = new Steam.SteamUser(steamClient);
const steamFriends = new Steam.SteamFriends(steamClient);
const steamGroups = new SteamGroups(steamClient);

steamClient.connect();
steamClient.on("connected", function() {
	steamUser.logOn({
		account_name: "nefelly",
		password: process.env.STEAM_PASSWORD,
	});
});

steamClient.on("logOnResponse", function(logonResp) {
	if (logonResp.eresult == Steam.EResult.OK) {
		steamFriends.setPersonaState(Steam.EPersonaState.Online);
	}
});

steamFriends.on("friend", async (friendSteamId, type) => {
	if (type == Steam.EFriendRelationship.RequestRecipient) {
		steamFriends.addFriend(friendSteamId);
	} else if (type == Steam.EFriendRelationship.Friend) {
		try {
			const userData = await axios.get("https://open.faceit.com/data/v4/players", {
				headers: {
					"Authorization": `Bearer ${process.env.FACEIT_API_TOKEN}`,
				},
				params: {
					game_player_id: friendSteamId,
					game: "csgo",
				},
			}).then(data => data.data);
			const userElo = userData.games.csgo.faceit_elo;
			if (userElo >= 3000) {
				setTimeout(() => {
					steamGroups.inviteUserToGroup("103582791467410012", friendSteamId);
					setTimeout(() => {
						steamFriends.sendMessage(friendSteamId, "You've been invited to the group, welcome 3k elo bot!");
						setTimeout(() => {
							steamFriends.removeFriend(friendSteamId);
						}, 1000);
					}, 1000);
				}, 1000);
			} else {
				const message = userElo >= 2900 ? "You're almost a 3k elo bot, keep going!" : userElo >= 2500 ? "Not even close, come back at 3k..." : `Bro, you're only ${userElo} elo 😂😂`;
				steamFriends.sendMessage(friendSteamId, message);
				setTimeout(() => {
					steamFriends.removeFriend(friendSteamId);
				}, 1000);
			}
		} catch (_) {
			steamFriends.sendMessage(friendSteamId, "Sorry, there was an error, wait a bit and try again");
			setTimeout(() => {
				steamFriends.removeFriend(friendSteamId);
			}, 1000);
		}
	}
});

steamClient.on("error", error => {
	console.error("error occured, retrying in 30 seconds...", error);
	setTimeout(() => {
		steamClient.connect();
	}, 30 * 1000);
});