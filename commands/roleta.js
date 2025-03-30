const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const { LETTERBOXD_USER, LISTA_BONS, LISTA_RUINS } = process.env;

const listaCache = {
    ruins: null,
    bons: null,
    lastUpdated: null
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roleta')
        .setDescription('Gira o Tambor')
        .addIntegerOption(option =>
            option.setName('balas')
                .setDescription('Número de filmes ruins (1-5)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(5)),
    
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const balas = interaction.options.getInteger('balas');
            
            // Busca apenas informações básicas dos filmes (sem posters)
            const [filmesRuins, filmesBons] = await Promise.all([
                this.getFilmesBasicos(LISTA_RUINS, 'ruins').catch(() => []),
                this.getFilmesBasicos(LISTA_BONS, 'bons').catch(() => [])
            ]);

            if (filmesRuins.length === 0 || filmesBons.length === 0) { 
                throw new Error('Não foi possível carregar as listas de filmes');
            }

            // Seleciona aleatoriamente
            const selecaoRuins = this.selecionarAleatorios(filmesRuins, Math.min(balas, filmesRuins.length));
            const selecaoBons = this.selecionarAleatorios(filmesBons, Math.min(6 - balas, filmesBons.length));
            
            const todosFilmes = [...selecaoRuins, ...selecaoBons];
            const filmeSorteado = todosFilmes[Math.floor(Math.random() * todosFilmes.length)];
            const perdeu = selecaoRuins.includes(filmeSorteado);

            // SÓ AQUI construímos a URL do poster para o filme sorteado
            const filmeComPoster = await this.adicionarPoster(filmeSorteado);

            const embed = this.criarEmbed(filmeComPoster, balas, perdeu);
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Erro no comando /roleta:', error);
            await interaction.editReply({
                content: '❌ O serviço está instável no momento. Tente novamente mais tarde.',
                ephemeral: true
            });
        }
    },

    async getFilmesBasicos(nomeLista, tipo) {
        // Verifica cache primeiro
        if (listaCache[tipo] && listaCache.lastUpdated && 
            (Date.now() - listaCache.lastUpdated) < 3600000) {
            return listaCache[tipo];
        }

        try {
            const filmes = await this.scrapeListaBasica(nomeLista);
            
            // Atualiza cache
            listaCache[tipo] = filmes;
            listaCache.lastUpdated = Date.now();
            
            return filmes;
        } catch (error) {
            console.error(`Falha no scraping para ${tipo}:`, error);
            return listaCache[tipo] || [];
        }
    },

    async scrapeListaBasica(nomeLista) {
        try {
            const response = await axios.get(
                `https://letterboxd.com/${LETTERBOXD_USER}/list/${nomeLista}/`, 
                {
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
                    },
                    timeout: 50000
                }
            );

            console.log(`https://letterboxd.com/${LETTERBOXD_USER}/list/${nomeLista}/`)

            const $ = cheerio.load(response.data);
            const filmes = [];

            

            $('ul.poster-list li[data-film-slug]').each((i, element) => {
                try {
                    const filmSlug = $(element).attr('data-film-slug');
                    const filmName = $(element).attr('data-film-name');
                    const filmId = $(element).attr('data-film-id');
                    
                    if (!filmSlug || !filmName || !filmId) return;
    
                    filmes.push({
                        titulo: filmName.trim(),
                        url: `https://letterboxd.com/film/${filmSlug}`,
                        id: filmId,
                        slug: filmSlug
                    });
                } catch (e) {
                    console.error('Erro com novo seletor:', e);
                }
            });
    
            // Fallback para o seletor antigo se não encontrar nada
            if (filmes.length === 0) {
                $('li.poster-container').each((i, element) => {
                    try {
                        const posterDiv = $(element).find('div.poster');
                        const filmSlug = posterDiv.attr('data-film-slug');
                        const filmName = posterDiv.attr('data-film-name');
                        const filmId = posterDiv.attr('data-film-id');
                        
                        if (!filmSlug || !filmName || !filmId) return;
    
                        filmes.push({
                            titulo: filmName.trim(),
                            url: `https://letterboxd.com/film/${filmSlug}`,
                            id: filmId,
                            slug: filmSlug
                        });
                    } catch (e) {
                        console.error('Erro com fallback:', e);
                    }
                });
            }
    
            // Fallback adicional se ainda não encontrar
            if (filmes.length === 0) {
                $('.film-poster').each((i, element) => {
                    try {
                        const filmSlug = $(element).attr('data-film-slug');
                        const filmName = $(element).find('img').attr('alt');
                        const filmId = $(element).attr('data-film-id');
                        
                        if (filmSlug && filmName) {
                            filmes.push({
                                titulo: filmName.trim(),
                                url: `https://letterboxd.com/film/${filmSlug}`,
                                id: filmId || 'unknown',
                                slug: filmSlug
                            });
                        }
                    } catch (e) {
                        console.error('Erro no fallback secundário:', e);
                    }
                });
            }
    
            if (filmes.length === 0) {
                console.error('Nenhum filme encontrado. HTML:', response.data.substring(0, 1000));
                throw new Error('Nenhum filme encontrado na página');
            }
    
            return filmes;
        } catch (error) {
            console.error(`Erro no scraping: ${error.message}`);
            throw error;
        }
    },

    async adicionarPoster(filme) {
        if (!filme.id || !filme.slug) return filme;
        
        // Construir a URL do poster corretamente
        const idPath = filme.id.split('').join('/');
        filme.poster = `https://a.ltrbxd.com/resized/film-poster/${idPath}/${filme.id}-${filme.slug}-0-1000-0-1500-crop.jpg`;
        
        return filme;
    },

    selecionarAleatorios(array, quantidade) {
        if (!array || array.length === 0) return [];
        
        const copia = [...array];
        return Array.from({ length: Math.min(quantidade, copia.length) }, () => {
            const indice = Math.floor(Math.random() * copia.length);
            return copia.splice(indice, 1)[0];
        });
    },

    criarEmbed(filme, balas, perdeu) {
        const embed = new EmbedBuilder()
            .setTitle(`🎯 ${filme.titulo}`)
            .setColor(perdeu ? '#ff0000' : '#00ff00')
            .setURL(filme.url)
            .addFields(
                { 
                    name: perdeu ? '💀 Você perdeu!' : '🎉 Você sobreviveu!', 
                    value: `Configuração: ${balas} ruim${balas !== 1 ? 's' : ''} | ${6-balas} bom${6-balas !== 1 ? 's' : ''}`
                }
            );

        // Só adiciona a imagem se existir
        if (filme.poster) {
            embed.setImage(filme.poster);
        }

        return embed;
    }
};