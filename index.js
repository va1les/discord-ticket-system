const { Client, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require("discord.js")
const mongoose = require("mongoose")
const Guild = require("./models/Guild")
const User = require("./models/User")
const config = require("./config.json")
const client = new Client({
    allowedMentions: { parse: ["roles", "users"], repliedUser: false },
    intents: 131071
})
client.on('ready', () => {
    mongoose.connect(config.mongo_uri).then(x => console.log("Mongoose is connected"), y => console.log("Mongoose is not connected"))
    client.user.setActivity({ name: `!help`, type: 1 })
})

client.on('messageCreate', async (message) => {
    let args = message.content.slice(config.prefix.length).trim().split(" ");
    let command = args.shift()?.toLowerCase();
    if (!message.content.startsWith(config.prefix) || !command || command.length == 0) return;
    if (command == "ping") return message.reply(`${client.ws.ping}ms 🏓`)
    if (command == "help") return message.reply(`[] — Обязательная переменная\n() — Необязательная переменная\n\n**Команды:**\n> 📨 \`!setup [#tickets] [@moderator_role]\` — Установка системы Тикетов.\n> 🗣️ \`!block [@user]\` — пользователь не сможет создавать Тикеты.\n> 🗣️ \`!unblock [@user]\` — пользователь сможет создавать Тикеты.`);
    if (command == "setup") {
        let data = await Guild.findOne({ guildID: message.guild.id });
        if (!data) await Guild.create({ guildID: message.guild.id });
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply({ content: `> ⚠️ У вас недостаточно прав.`, ephemeral: true })
        if (!args[0]) return message.reply(`:asterisk: — Обязательная переменная\n#️⃣ — Необязательная переменная\n\n**Настройка:**\n> :asterisk: Пожалуйста, упомяните **канал** или введите **ID-канала**.\n> #️⃣ Введите роль, которая будет упоминаться при создание тикета.\n\n**Пример:**\n> 📨 \`!setup #tickets @moderator\``);
        let channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        if (!channel) return message.reply(`> ❌ Пожалуйста, упомяните **канал** или введите **ID-канала**.`);
        let role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        if (!role) return message.reply(`> ❌ Пожалуйста, упомяните **роль** или введите **ID-роли**.`);
        await Guild.updateOne({ guildID: message.guild.id }, { $set: { roleID: role.id } })
        channel.send({
            "embeds": [{
                "title": "Достучаться до Персонала 🗣️",
                "description": "Чтобы создать тикет, взаимодействуйте с помощью \"📨\"",
                "color": 5135764,
                "thumbnail": { "url": "https://cdn-icons-png.flaticon.com/512/320/320416.png" }
            }], components: [create_row]
        })
    }
    if (command == "block") {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply({ content: `> ⚠️ У вас недостаточно прав.`, ephemeral: true })
        let user = message.mentions.users.first() || message.guild.users.cache.get(args[0]);
        if (!user) return message.reply(`> ❌ Пожалуйста, упомяните **пользователя** или введите **ID-пользователя**.`);
        let data = await User.findOne({ guildID: message.guild.id, userID: user.id })
        if (data?.block == true) return message.reply(`> ⚠️ Пользователь уже заблокирован.`);
        if (!data) await User.create({ guildID: message.guild.id, userID: user.id })
        await User.updateOne({ guildID: message.guild.id, userID: user.id },
            {
                $set: {
                    "block": true
                }
            })
        message.reply("> ✅ Пользователь Заблокирован.")
    }
    if (command == "unblock") {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.reply({ content: `> ⚠️ У вас недостаточно прав.`, ephemeral: true })
        let user = message.mentions.users.first() || message.guild.users.cache.get(args[0]);
        if (!user) return message.reply(`> ❌ Пожалуйста, упомяните **пользователя** или введите **ID-пользователя**.`);
        let data = await User.findOne({ guildID: message.guild.id, userID: user.id })
        if (data?.block == false) return message.reply(`> ❌ Пользователь не заблокирован.`);
        if (!data) await User.create({ guildID: message.guild.id, userID: user.id })
        await User.updateOne({ guildID: message.guild.id, userID: user.id },
            {
                $set: {
                    "block": false
                }
            })
        message.reply("> ✅ Пользователь Разблокирован.")
    }
})
let create_btn = new ButtonBuilder().setCustomId("create").setLabel('Создать Тикет').setEmoji({ name: `📨` }).setStyle(ButtonStyle.Primary);
let create_row = new ActionRowBuilder().addComponents([create_btn])
let delete_btn = new ButtonBuilder().setCustomId("delete").setLabel('Удалить тикет').setEmoji({ name: `🗑️` }).setStyle(ButtonStyle.Danger).setDisabled(false)
let delete_row = new ActionRowBuilder().addComponents([delete_btn])
let time = new Set()
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton) {
        if (interaction.customId == "create") {
            if (time.has(interaction.user.id)) return interaction.reply({ content: `> ⏱️ Тикет можно создавать раз в 3-минуты.`, ephemeral: true });
            else { time.add(interaction.user.id); setTimeout(() => { time.delete(interaction.user.id) }, 180 * 1000); }
            let data = await User.findOne({ guildID: interaction.guild.id, userID: interaction.user.id })
            if (data?.block == true) return interaction.reply({ content: `> ❌ Вы не можете создать Тикет, так-как вы заблокированы.`, ephemeral: true });
            interaction.reply({ content: `> <a:load2:932324560370561075>Ожидайте..`, ephemeral: true });
            setTimeout(async () => {
                await interaction.guild.channels.create({ name: `ID: ${interaction.user.id}`, type: 0, permissionOverwrites: [{ id: interaction.guild.roles.everyone, deny: PermissionFlagsBits.ViewChannel }, { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel] }, { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }], }).then(async x => {
                    let newdata = await Guild.findOne({ guildID: interaction.guild.id });
                    x.send({
                        "content": `${newdata?.roleID ? `<@&${newdata?.roleID}>` : `Модеры`} — **${interaction.user.username}** зовёт!`,
                        "embeds": [{
                            "title": "Тикет открыт 🔓",
                            "description": `Дата — <t:${Math.round(interaction.createdTimestamp / 1000)}:F>\nОт кого: ${interaction.user}`,
                            "color": 5135764,
                            "thumbnail": { "url": "https://cdn-icons-png.flaticon.com/512/320/320416.png" }
                        }], components: [delete_row]
                    })
                    interaction.editReply({ content: `> 📨 Ваш тикет создан — ${x}` })
                })
            }, 2000);
        }
        if (interaction.customId == 'delete') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: `> ⚠️ У вас недостаточно прав.`, ephemeral: true })
            let reply = await interaction.channel.send({ content: `> ❗ Тикет был закрыт — **${interaction.user.tag}**` }).catch(() => null)
            delete_row.components[0].setDisabled(true)
            interaction.update({ components: [delete_row] })
            setTimeout(async () => {
                interaction.channel.delete().catch(() => reply.edit({ content: `> ❌ Я не могу удалить тикет. Пожалуйста, выдайте права Администратора.` }))
                delete_row.components[0].setDisabled(false)
            }, 5000);
        }
    }
})
client.login(config.token).then(x => console.log(`The application is running`), y => console.log(`The application is not running`))