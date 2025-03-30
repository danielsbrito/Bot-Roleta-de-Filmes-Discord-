const { Client, Events, GatewayIntentBits, Collection } = require('discord.js');

const dotenv=require('dotenv');
const { error } = require('node:console');
dotenv.config()

const{TOKEN, CLIENT_ID, GUILD_ID} = process.env

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection()

//importação dos comandos
const fs = require("node:fs")
const path = require("node:path")

const commandsPath = path.join(__dirname,"commands")
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"))

for (const file of commandFiles)
    {
        const filePath = path.join(commandsPath, file)
        const command = require(filePath)
        if ("data" in command && "execute" in command)
            {
                client.commands.set(command.data.name, command)
            }else
            {
                console.log('Esse comando em ${filePath} está com data ou execute errado')
            }
    }

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.login(TOKEN);

//listener de interações com o bot
client.on(Events.InteractionCreate, async interaction=>
{
    if(!interaction.isChatInputCommand())return
    const command = interaction.client.commands.get(interaction.commandName)
    if(!command)
        {
            console.error("Comando não encontrado")
            return
        }
        try{
            await command.execute(interaction)
        }
        catch{
            console.error(error)
            await interaction.reply("Houve um erro ao executar esse comando!")
        }
})
