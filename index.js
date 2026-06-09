require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const WATCH_CHANNEL_NAME  = process.env.WATCH_CHANNEL_NAME  || "General";
const ALERT_CHANNEL_NAME  = process.env.ALERT_CHANNEL_NAME  || "notifications";
const TIMEZONE            = process.env.TIMEZONE            || "America/Los_Angeles";

//  Discord client 
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

function isWatchedChannel(channel) {
  return channel?.name.toLowerCase() === WATCH_CHANNEL_NAME.toLowerCase();
}

function formatTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIMEZONE,
  });
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

  const time = formatTime();

  if (joinedWatched && !leftWatched) {
    // Someone joined
    const count = joinedChannel.members.size;
    const peopleStr = count === 1 ? "1 person" : `${count} people`;
    const msg = `🟢 **${displayName}** joined **#${WATCH_CHANNEL_NAME}** at ${time} — ${peopleStr} now in the channel`;
    await alertChannel.send(msg);
    console.log(`[JOIN]  ${displayName} → #${WATCH_CHANNEL_NAME} (${peopleStr}) at ${time}`);

  } else if (leftWatched && !joinedWatched) {
    // Someone left
    const count = leftChannel.members.size;
    const peopleStr = count === 0 ? "channel now empty" : count === 1 ? "1 person remaining" : `${count} people remaining`;
    const msg = `🔴 **${displayName}** left **#${WATCH_CHANNEL_NAME}** at ${time} — ${peopleStr}`;
    await alertChannel.send(msg);
    console.log(`[LEAVE] ${displayName} ← #${WATCH_CHANNEL_NAME} (${peopleStr}) at ${time}`);
  }
});

client.once("ready", () => {
  console.log(`\n✅ Logged in as ${client.user.tag}`);
  console.log(`👂 Watching voice channel : "${WATCH_CHANNEL_NAME}"`);
  console.log(`📢 Sending alerts to      : "#${ALERT_CHANNEL_NAME}"\n`);
});

client.on("error", (err) => console.error("Discord error:", err.message));

client.login(process.env.DISCORD_BOT_TOKEN);
