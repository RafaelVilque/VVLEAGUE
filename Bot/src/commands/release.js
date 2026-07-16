import { SlashCommandBuilder } from 'discord.js';
import { getMemberByDiscordId, releaseMember } from '../siteapi.js';
import { setCooldown, getSetting, refreshGuildPanel, getGuildById } from '../database.js';
const GUILD_LEADER_ROLE_ID_DEFAULT = '1470554671944040605';
export const data = new SlashCommandBuilder()
    .setName('release')
    .setDescription('Release yourself from your current guild');
export async function execute(interaction, db) {
    const memberData = await getMemberByDiscordId(interaction.user.id);
    if (!memberData) {
        await interaction.editReply('❌ You are not registered in any guild on the site.');
        return;
    }
    // Find local guild before releasing so we can refresh its panel after
    const mainEntry = db.prepare('SELECT guildId FROM MainRosters WHERE userId = ?').get(interaction.user.id);
    const subEntry = db.prepare('SELECT guildId FROM SubRosters WHERE userId = ?').get(interaction.user.id);
    const managerEntry = db.prepare('SELECT guildId FROM Managers WHERE userId = ?').get(interaction.user.id);
    const localGuildId = mainEntry?.guildId || subEntry?.guildId || managerEntry?.guildId;
    // Remove from local bot DB rosters
    if (localGuildId) {
        db.prepare('DELETE FROM MainRosters WHERE userId = ?').run(interaction.user.id);
        db.prepare('DELETE FROM SubRosters WHERE userId = ?').run(interaction.user.id);
        db.prepare('DELETE FROM Managers WHERE userId = ?').run(interaction.user.id);
    }
    const result = await releaseMember(interaction.user.id);
    if (!result.removed) {
        await interaction.editReply('❌ Could not remove you from your guild.');
        return;
    }
    // Set cooldown with guild name
    const localGuildRecord = localGuildId ? getGuildById(db, localGuildId) : null;
    setCooldown(db, interaction.user.id, localGuildRecord?.name || memberData.org_name || '');
    // Remove guild role if set
    if (memberData.discord_role_id && interaction.guild) {
        try {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            await member.roles.remove(memberData.discord_role_id);
        }
        catch { /* ignore role removal errors */ }
    }
    // Remove guild name role
    if (memberData.org_name && interaction.guild) {
        try {
            const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
            const nameRole = interaction.guild.roles.cache.find(r => r.name === memberData.org_name);
            if (member && nameRole) await member.roles.remove(nameRole).catch(() => {});
        }
        catch { /* ignore */ }
    }
    // If user is a guild leader in the bot DB, also remove the guild leader Discord role
    if (interaction.guild) {
        const leaderGuild = db.prepare('SELECT id FROM Guilds WHERE leaderId = ?').get(interaction.user.id);
        if (leaderGuild) {
            try {
                const leaderRoleId = getSetting(db, `${interaction.guild.id}_guild_leader_role_id`) || GUILD_LEADER_ROLE_ID_DEFAULT;
                const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
                if (member) await member.roles.remove(leaderRoleId).catch(() => {});
            }
            catch { /* ignore */ }
        }
    }
    // Refresh guild panel so roster counts update immediately
    if (localGuildId) {
        await refreshGuildPanel(interaction.client, db, localGuildId).catch(() => {});
    }
    await interaction.editReply(`✅ You have been released from **${memberData.org_name}** [${memberData.tag}].`);
}
//# sourceMappingURL=release.js.map