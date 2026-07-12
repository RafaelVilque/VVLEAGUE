import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAllOrgs } from '../siteapi.js';
export const data = new SlashCommandBuilder()
    .setName('teamstats')
    .setDescription('Show all guilds ranked by points');
export async function execute(interaction) {
    try {
        const orgs = await getAllOrgs();
        const active = orgs.filter((o) => o.status === 'active').sort((a, b) => (b.points || 0) - (a.points || 0));
        if (!active.length) {
            await interaction.editReply('No active guilds found.');
            return;
        }
        const medals = ['🥇', '🥈', '🥉'];
        const lines = active.map((o, i) => {
            const prefix = medals[i] || `**#${i + 1}**`;
            return `${prefix} **${o.name}** [${o.tag}] â€” ${o.wins}W ${o.losses}L · ${o.points || 0}pts · ${o.members?.length || 0} members`;
        }).join('\n');
        const embed = new EmbedBuilder()
            .setTitle('ðŸ† Guild Rankings')
            .setColor(0x5BADFF)
            .setDescription(lines.slice(0, 4096));
        await interaction.editReply({ embeds: [embed] });
    }
    catch (e) {
        await interaction.editReply(`âŒ Error: ${e.message}`);
    }
}
//# sourceMappingURL=teamstats.js.map