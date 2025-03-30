const {SlashCommandBuilder} = require("discord.js")


module.exports = { 
  data : new SlashCommandBuilder()
      .setName("roleta")
      .setDescription("Gira o tambor"),

  async execute(interaction){
       await interaction.reply("Pong!")
    }
}    