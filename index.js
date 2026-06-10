require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const WATCH_CHANNEL_NAME  = process.env.WATCH_CHANNEL_NAME  || "General";
const ALERT_CHANNEL_NAME  = process.env.ALERT_CHANNEL_NAME  || "notifications";

const USER_A_ID = process.env.USER_A_ID;
const USER_B_ID = process.env.USER_B_ID; 


//  Discord client 
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

function getMentionForOther(userId) {
  if (userId === USER_A_ID) return USER_B_ID ? `<@${USER_B_ID}>` : null;
  if (userId === USER_B_ID) return USER_A_ID ? `<@${USER_A_ID}>` : null;
  return null; // someone else joined — no mention
}

function isWatchedChannel(channel) {
  return channel?.name.toLowerCase() === WATCH_CHANNEL_NAME.toLowerCase();
}

async function getAlertChannel(guild) {
  return guild.channels.cache.find(
    (c) => c.name.toLowerCase() === ALERT_CHANNEL_NAME.toLowerCase() && c.isTextBased()
  );
}


client.on("voiceStateUpdate", async (oldState, newState) => {
  const member       = newState.member || oldState.member;
  const displayName  = member?.displayName || "Someone";
  const guild        = newState.guild || oldState.guild;

  const leftChannel   = oldState.channel;
  const joinedChannel = newState.channel;

  const leftWatched   = isWatchedChannel(leftChannel);
  const joinedWatched = isWatchedChannel(joinedChannel);

  // Ignore moves within the same watched channel
  if (leftWatched && joinedWatched) return;
  // Ignore events unrelated to the watched channel
  if (!leftWatched && !joinedWatched) return;

  const alertChannel = await getAlertChannel(guild);
  if (!alertChannel) {
    console.error(`⚠️  Could not find text channel "#${ALERT_CHANNEL_NAME}"`);
    return;
  }


  if (joinedWatched && !leftWatched) {
    // Someone joined
    const count = joinedChannel.members.size;
    const peopleStr = count === 1 ? "1 person" : `${count} people`;
    const mention = getMentionForOther(member?.id);
    const mentionStr = mention ? ` — ${mention}` : "";
    const msg = `🟢 **${displayName}** joined **#${WATCH_CHANNEL_NAME}** — ${peopleStr} now in the channel${mentionStr}`;
    await alertChannel.send(msg);
    console.log(`[JOIN]  ${displayName} → #${WATCH_CHANNEL_NAME} (${peopleStr})`);

  } else if (leftWatched && !joinedWatched) {
    // Someone left
    const count = leftChannel.members.size;
    const peopleStr = count === 0 ? "channel now empty" : count === 1 ? "1 person remaining" : `${count} people remaining`;
    const msg = `🔴 **${displayName}** left **#${WATCH_CHANNEL_NAME}** — ${peopleStr}`;
    await alertChannel.send(msg);
    console.log(`[LEAVE] ${displayName} ← #${WATCH_CHANNEL_NAME} (${peopleStr})`);
  }
});

client.once("ready", () => {
  console.log(`\n✅ Logged in as ${client.user.tag}`);
  console.log(`👂 Watching voice channel : "${WATCH_CHANNEL_NAME}"`);
  console.log(`📢 Sending alerts to      : "#${ALERT_CHANNEL_NAME}"\n`);
  console.log(`👤 User A ID: ${USER_A_ID || "⚠️  NOT SET"}`);
  console.log(`👤 User B ID: ${USER_B_ID || "⚠️  NOT SET"}\n`);
});

client.on("error", (err) => console.error("Discord error:", err.message));

client.login(process.env.DISCORD_BOT_TOKEN);
