const {SlashCommandBuilder} = require("discord.js")


module.exports = { 
  data : new SlashCommandBuilder()
      .setName("balas")
      .setDescription("Mostra lista de filmes que são as balas"),

  async execute(interaction){
       await interaction.reply("https://letterboxd.com/xenohart/list/roleta-russabala/")
    }
}    