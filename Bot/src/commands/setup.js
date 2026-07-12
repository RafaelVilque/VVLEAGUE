import { SlashCommandBuilder, ChannelType, EmbedBuilder, } from 'discord.js';
import { setSetting } from '../database.js';
export const data = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure all bot settings for this server in one command')
    // Roles
    .addRoleOption(o => o.setName('staff_role')
    .setDescription('Cargo com poder total (administração)')
    .setRequired(false))
    .addRoleOption(o => o.setName('hoster_role')
    .setDescription('Cargo de Hoster')
    .setRequired(false))
    .addRoleOption(o => o.setName('guild_leader_role')
    .setDescription('Cargo de Líder de Guild')
    .setRequired(false))
    .addRoleOption(o => o.setName('guild_co_leader_role')
    .setDescription('Cargo de Co-Líder de Guild')
    .setRequired(false))
    .addRoleOption(o => o.setName('guild_manager_role')
    .setDescription('Cargo de Manager de Guild')
    .setRequired(false))
    .addRoleOption(o => o.setName('guild_register_role')
    .setDescription('Cargo que pode registrar uma Guild')
    .setRequired(false))
    .addRoleOption(o => o.setName('guild_delete_role')
    .setDescription('Cargo que pode deletar uma Guild')
    .setRequired(false))
    // Channels
    .addChannelOption(o => o.setName('ticket_category')
    .setDescription('Categoria onde os tickets (wager/war) serão abertos')
    .addChannelTypes(ChannelType.GuildCategory)
    .setRequired(false))
    .addChannelOption(o => o.setName('wager_panel_channel')
    .setDescription('Canal onde o painel de Wager fica')
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(false))
    .addChannelOption(o => o.setName('war_panel_channel')
    .setDescription('Canal onde o painel de War fica')
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(false))
    .addChannelOption(o => o.setName('wager_dodge_channel')
    .setDescription('Canal de dodge de Wager')
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(false))
    .addChannelOption(o => o.setName('war_dodge_channel')
    .setDescription('Canal de dodge de War')
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(false))
    .addChannelOption(o => o.setName('wager_log_channel')
    .setDescription('Canal de vitórias/resultados de Wager')
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(false))
    .addChannelOption(o => o.setName('war_log_channel')
    .setDescription('Canal de vitórias/resultados de War')
    .addChannelTypes(ChannelType.GuildText)
    .setRequired(false))
    .addChannelOption(o => o.setName('guild_forum_channel')
    .setDescription('Canal de fórum onde as Guilds ficam registradas')
    .addChannelTypes(ChannelType.GuildForum)
    .setRequired(false));
export async function execute(interaction, db) {
    if (!interaction.memberPermissions?.has('Administrator')) {
        await interaction.editReply('❌ Apenas administradores podem usar este comando.');
        return;
    }
    const guildId = interaction.guildId;
    const saved = [];
    const skipped = [];
    function save(key, value, label, display) {
        if (value) {
            setSetting(db, `${guildId}_${key}`, value);
            saved.push(`✅ **${label}** → ${display}`);
        }
        else {
            skipped.push(`— ${label}`);
        }
    }
    // Roles
    const staffRole = interaction.options.getRole('staff_role');
    save('staff_role_id', staffRole?.id ?? null, 'Cargo de Staff', staffRole ? `<@&${staffRole.id}>` : '');
    const hosterRole = interaction.options.getRole('hoster_role');
    save('hoster_role_id', hosterRole?.id ?? null, 'Cargo de Hoster', hosterRole ? `<@&${hosterRole.id}>` : '');
    const leaderRole = interaction.options.getRole('guild_leader_role');
    save('guild_leader_role_id', leaderRole?.id ?? null, 'Líder de Guild', leaderRole ? `<@&${leaderRole.id}>` : '');
    const coLeaderRole = interaction.options.getRole('guild_co_leader_role');
    save('guild_co_leader_role_id', coLeaderRole?.id ?? null, 'Co-Líder de Guild', coLeaderRole ? `<@&${coLeaderRole.id}>` : '');
    const managerRole = interaction.options.getRole('guild_manager_role');
    save('guild_manager_role_id', managerRole?.id ?? null, 'Manager de Guild', managerRole ? `<@&${managerRole.id}>` : '');
    const registerRole = interaction.options.getRole('guild_register_role');
    save('guild_register_role_id', registerRole?.id ?? null, 'Cargo p/ Registrar Guild', registerRole ? `<@&${registerRole.id}>` : '');
    const deleteRole = interaction.options.getRole('guild_delete_role');
    save('guild_delete_role_id', deleteRole?.id ?? null, 'Cargo p/ Deletar Guild', deleteRole ? `<@&${deleteRole.id}>` : '');
    // Ticket category (sets both wager and war category)
    const ticketCategory = interaction.options.getChannel('ticket_category');
    if (ticketCategory) {
        setSetting(db, `${guildId}_wager_category_id`, ticketCategory.id);
        setSetting(db, `${guildId}_war_category_id`, ticketCategory.id);
        saved.push(`✅ **Categoria de Tickets** → ${ticketCategory.name}`);
    }
    else {
        skipped.push('⬜ Categoria de Tickets');
    }
    // Panel channels
    const wagerPanel = interaction.options.getChannel('wager_panel_channel');
    save('wager_channel_id', wagerPanel?.id ?? null, 'Canal de Painel Wager', wagerPanel ? `<#${wagerPanel.id}>` : '');
    const warPanel = interaction.options.getChannel('war_panel_channel');
    save('war_channel_id', warPanel?.id ?? null, 'Canal de Painel War', warPanel ? `<#${warPanel.id}>` : '');
    // Dodge channels
    const wagerDodge = interaction.options.getChannel('wager_dodge_channel');
    save('wager_dodge_channel_id', wagerDodge?.id ?? null, 'Canal Dodge Wager', wagerDodge ? `<#${wagerDodge.id}>` : '');
    const warDodge = interaction.options.getChannel('war_dodge_channel');
    save('war_dodge_channel_id', warDodge?.id ?? null, 'Canal Dodge War', warDodge ? `<#${warDodge.id}>` : '');
    // Log/victory channels
    const wagerLog = interaction.options.getChannel('wager_log_channel');
    save('wager_log_channel_id', wagerLog?.id ?? null, 'Canal Vitórias Wager', wagerLog ? `<#${wagerLog.id}>` : '');
    const warLog = interaction.options.getChannel('war_log_channel');
    save('war_log_channel_id', warLog?.id ?? null, 'Canal Vitórias War', warLog ? `<#${warLog.id}>` : '');
    // Guild forum
    const guildForum = interaction.options.getChannel('guild_forum_channel');
    save('guild_forum_channel_id', guildForum?.id ?? null, 'Fórum de Guilds', guildForum ? `<#${guildForum.id}>` : '');
    if (saved.length === 0) {
        await interaction.editReply({ content: '⚠️ Nenhuma configuração foi fornecida. Use as opções do comando para configurar o servidor.', embeds: [] });
        return;
    }
    const embed = new EmbedBuilder()
        .setTitle('⚙️ Configuração do Servidor')
        .setColor(0x2ecc71)
        .setTimestamp();
    if (saved.length > 0) {
        embed.addFields({ name: '✅ Configurações salvas', value: saved.join('\n') });
    }
    if (skipped.length > 0) {
        embed.addFields({ name: '— Não configuradas nesta chamada', value: skipped.join('\n') });
    }
    await interaction.editReply({ content: '', embeds: [embed] });
}
//# sourceMappingURL=setup.js.map