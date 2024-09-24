const token = "TOKEN_WITH_VALID_ACCESS_TO_CHANEL";
const channelId = "CHANNEL_ID_YOU_WANT_TO_SAVE";
const FilePath = "output";

const Discord = require("discord.js-selfbot-v13");
const fs = require("fs");

// Initialize the bot
const client = new Discord.Client({
  checkUpdate: false,
});

const logFilePath = `${FilePath}.html`;

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
      `Fetched ${fetchedMessages.length} messages. Creating html page...`
    );

    // Reverse messages to display older messages at the top and newer at the bottom
    fetchedMessages.reverse();

    // Create HTML structure
    let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Discord Channel Messages</title>
      <style>
        body { 
          font-family: 'Whitney', 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #36393f;
          color: #dcddde;
          padding: 20px;
        }
        .message-container {
          max-width: 800px;
          margin: 0 auto;
        }
        .message {
          display: flex;
          margin-bottom: 20px;
          padding: 10px;
          border-radius: 5px;
        }
        .message img, .message video {
          max-width: 192px;
          max-height: 192px;
          border-radius: 5px;
          margin-top: 10px;
        }
        .message img {
          object-fit: contain;
        }
        .message video {
          width: 100%;
          height: auto;
        }
        .message-content {
          background-color: #40444b;
          padding: 10px 15px;
          border-radius: 8px;
          width: 100%;
        }
        .author {
          font-weight: bold;
          color: #fff;
          font-size: 1em;
        }
        .timestamp {
          font-size: 0.75em;
          color: #72767d;
          margin-left: 5px;
        }
        .content {
          margin-top: 5px;
          white-space: pre-wrap;
          font-size: 0.95em;
        }
        .attachment {
          margin-top: 10px;
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="message-container">
        <h1>Messages from ${channel.name || "dms"}</h1>
    `;

    // Regular expression to detect URLs from cdn.discordapp.com
    const discordCdnRegex =
      /https:\/\/cdn\.discordapp\.com\/attachments\/[^\s]+/g;

    // Format and append messages to HTML content
    for (const message of fetchedMessages) {
      const timestamp = new Date(message.createdTimestamp).toLocaleString();
      const authorTag = `${message.author.tag}`;
      const content = message.content || "[No content]";
      const avatarURL = message.author.displayAvatarURL({
        format: "png",
        size: 64,
      });

      let systemMessage = "";

      // Check if the message is a system message
      switch (message.type) {
        case "GUILD_MEMBER_JOIN":
          systemMessage = `${message.author.username} has joined the group.`;
          break;
        case "USER_PREMIUM_GUILD_SUBSCRIPTION":
          systemMessage = `${message.author.username} has boosted the server.`;
          break;
        case "CALL":
          const callDuration = message.call
            ? message.call.duration / 3600
            : "unknown";
          systemMessage = `${message.author.username} started a call that lasted ${callDuration} hours.`;
          break;
        case "GUILD_MEMBER_REMOVE":
          systemMessage = `${message.author.username} has left the group.`;
          break;
        default:
          break;
      }

      // Start message block
      htmlContent += `
        <div class="message">
          <img src="${avatarURL}" alt="${authorTag}'s avatar">
          <div class="message-content">
            <div>
              <span class="author">${message.author.username}</span>
              <span class="timestamp">${timestamp}</span>
            </div>`;

      // Append system message if any
      if (systemMessage) {
        htmlContent += `<div class="content">${systemMessage}</div>`;
      } else {
        // Append regular content
        htmlContent += `<div class="content">${content}</div>`;
      }

      // Check for cdn.discordapp.com links in the content
      const cdnLinks = content.match(discordCdnRegex);
      if (cdnLinks) {
        cdnLinks.forEach((link) => {
          const fileType = link.split(".").pop().split("?")[0]; // Extract file extension

          // Handle images (png, jpeg, gif)
          if (["png", "jpg", "jpeg", "gif"].includes(fileType)) {
            htmlContent += `<img class="attachment" src="${link}" alt="Image from Discord">`;
          }
          // Handle videos (mp4, mov)
          else if (["mp4", "mov"].includes(fileType)) {
            htmlContent += `<video class="attachment" controls>
                              <source src="${link}" type="video/${fileType}">
                              Your browser does not support the video tag.
                            </video>`;
          }
        });
      }

      // Append attachments if any
      if (message.attachments.size > 0) {
        message.attachments.forEach((attachment) => {
          const fileType = attachment.contentType;

          // Handle images (png, jpeg, gif)
          if (fileType && fileType.startsWith("image/")) {
            htmlContent += `<img class="attachment" src="${attachment.url}" alt="${attachment.name}">`;
          }

          // Handle videos (mp4, mov)
          else if (
            fileType &&
            (fileType === "video/mp4" || fileType === "video/quicktime")
          ) {
            htmlContent += `<video class="attachment" controls>
                              <source src="${attachment.url}" type="${fileType}">
                              Your browser does not support the video tag.
                            </video>`;
          }

          // Handle other file types by providing a download link
          else {
            htmlContent += `<a class="attachment" href="${attachment.url}" target="_blank">${attachment.name}</a>`;
          }
        });
      }

      // Close message block
      htmlContent += `</div></div>`;
    }

    // Close HTML structure
    htmlContent += `
      </div>
    </body>
    </html>
    `;

    // Write the HTML content to file
    fs.writeFileSync(logFilePath, htmlContent, { encoding: "utf8" });

    console.log(`Messages saved to ${logFilePath}`);
  } catch (error) {
    console.error("Error fetching messages:", error);
  }

  client.destroy(); // Log out the selfbot after fetching
});
