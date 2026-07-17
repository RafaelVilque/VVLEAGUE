import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getAllDodgeRecords, getSetting } from '../database.js';

const HOSTER_ROLE_IDS_DEFAULT = ['1470554662687215741', '1470554664238845962'];

export const data = new SlashCommandBuilder()
    .setName('dodgelist')
    .setDescription('View all guilds that have dodged, grace periods, and ELO penalties (Staff only)');

export async function execute(interaction, db) {
    const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
    const isAdmin = !!member?.permissions.has('Administrator');
    const hosterRoleId = getSetting(db, `${interaction.guildId}_hoster_role_id`);
    const hasPermission = isAdmin || (!!member && (hosterRoleId
        ? member.roles.cache.has(hosterRoleId)
        : HOSTER_ROLE_IDS_DEFAULT.some(id => member.roles.cache.has(id))));

    if (!hasPermission) {
        await interaction.editReply({ content: '❌ You do not have permission to use this command.' });
        return;
    }

    const records = getAllDodgeRecords(db);

    if (!records.length) {
        await interaction.editReply({ content: '✅ No dodge records found.' });
        return;
    }

    const now = Date.now();

    // Group by guild_id — show most recent dodge per guild first, then older ones
    const lines = records.map(r => {
        const dodgeTs = Math.floor(new Date(r.dodged_at).getTime() / 1000);
        const graceEnd = new Date(r.grace_until);
        const graceActive = graceEnd.getTime() > now;
        const graceTs = Math.floor(graceEnd.getTime() / 1000);

        const graceStr = graceActive
            ? `⏳ Grace active — ends <t:${graceTs}:R>`
            : `✅ Grace expired <t:${graceTs}:R>`;

        const eloStr = r.elo_penalty_applied ? '⚠️ -25 ELO applied' : '';

        return `**${r.guild_name || r.guild_id}** — dodged <t:${dodgeTs}:f>\n${graceStr}${eloStr ? ' · ' + eloStr : ''}`;
    });

    // Split into pages of 10 to avoid embed limits
    const pageSize = 10;
    const pages = [];
    for (let i = 0; i < lines.length; i += pageSize) {
        pages.push(lines.slice(i, i + pageSize));
    }

    const embed = new EmbedBuilder()
        .setTitle('⚔️ Dodge History')
        .setColor(0x5BADFF)
        .setDescription(pages[0].join('\n\n'))
        .setFooter({ text: `${records.length} total dodge record(s)` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}
