// Replace with your token and channel ID
const token = "TOKEN_HERE"; // Your user token that has access to the channel
const channelId = "CHANNEL_ID"; // The channel ID you want to save (You need access)
const FilePath = "output"; // The name of the output file (auto adds .txt at the end)

const Discord = require("discord.js-selfbot-v13");
const fs = require("fs");

// Initialize the bot
const client = new Discord.Client({
  checkUpdate: false,
});

const logFilePath = `${FilePath}.txt`;

// Login the selfbot
client.login(token);

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}\nStarting to fetch messages`);

  try {
    const channel = await client.channels.fetch(channelId);

    let fetchedMessages = [];
    let lastMessageId = null;

    // Fetch all messages in batches (Discord limits fetch to 100 messages per request)
    while (true) {
      const options = { limit: 100 };
      if (lastMessageId) {
        options.before = lastMessageId;
      }

      const messages = await channel.messages.fetch(options);
      fetchedMessages = fetchedMessages.concat(Array.from(messages.values()));

      if (messages.size < 100) {
        break;
      }

      lastMessageId = messages.last().id;
    }

    console.log(
      `Fetched ${fetchedMessages.length} messages. Writing to file...`
    );

    // Format and write messages to file
    const messageLog = fetchedMessages
      .map((message) => {
        const timestamp = new Date(message.createdTimestamp).toISOString();
        const authorTag = `${message.author.tag}`;
        const content = message.content || "[No content]";

        return `${timestamp} | ${authorTag}\n${content}\n`;
      })
      .join("\n");

    fs.writeFileSync(logFilePath, messageLog, { encoding: "utf8" });

    console.log(`Messages saved to ${logFilePath}`);
  } catch (error) {
    console.error("Error fetching messages:", error);
  }

  client.destroy(); // Log out the selfbot after fetching
});
