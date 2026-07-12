import { SlashCommandBuilder } from 'discord.js';
import { deleteOrg } from '../siteapi.js';
import { getSetting } from '../database.js';
export const data = new SlashCommandBuilder()
    .setName('deleteteam')
    .setDescription('Delete a guild from the site (staff only)')
    .addStringOption(o => o.setName('tag').setDescription('Guild tag (e.g. VVS)').setRequired(true));
export async function execute(interaction, db) {
    const isAdmin = interaction.memberPermissions?.has('Administrator');
    const staffRoleId = getSetting(db, `${interaction.guildId}_staff_role_id`);
    if (!isAdmin && staffRoleId && interaction.guild) {
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member?.roles.cache.has(staffRoleId)) {
            await interaction.editReply('❌ No permission.');
            return;
        }
    }
    const tag = interaction.options.getString('tag', true).toUpperCase();
    try {
        await deleteOrg(tag);
        await interaction.editReply(`✅ Guild **[${tag}]** has been deleted from the site.`);
    }
    catch (e) {
        await interaction.editReply(`❌ ${e.message}`);
    }
}
//# sourceMappingURL=deleteteam.js.map
