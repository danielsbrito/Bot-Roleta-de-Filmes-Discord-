const {SlashCommandBuilder} = require("discord.js")


module.exports = { 
  data : new SlashCommandBuilder()
      .setName("festim")
      .setDescription("Mostra lista de filmes que são de festim"),

  async execute(interaction){
       await interaction.reply("https://letterboxd.com/xenohart/list/bala-de-festim/")
    }
}    