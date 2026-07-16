import { SlashCommandBuilder } from 'discord.js';
import { releaseMember, getMemberByDiscordId } from '../siteapi.js';
import { setCooldown, getSetting, refreshGuildPanel, getGuildById } from '../database.js';

const GUILD_LEADER_ROLE_ID_DEFAULT = '1470554671944040605';

export const data = new SlashCommandBuilder()
    .setName('release')
    .setDescription('Release yourself from your current guild');

export async function execute(interaction, db) {
    // Check local bot DB first — works even when site is offline
    const mainEntry = db.prepare('SELECT guildId FROM MainRosters WHERE userId = ?').get(interaction.user.id);
    const subEntry = db.prepare('SELECT guildId FROM SubRosters WHERE userId = ?').get(interaction.user.id);
    const managerEntry = db.prepare('SELECT guildId FROM Managers WHERE userId = ?').get(interaction.user.id);
    const localGuildId = mainEntry?.guildId || subEntry?.guildId || managerEntry?.guildId;
    const localGuildRecord = localGuildId ? getGuildById(db, localGuildId) : null;

    // Also try to get site member data (best-effort — site may be sleeping)
    let memberData = null;
    try {
        memberData = await getMemberByDiscordId(interaction.user.id);
    } catch (e) {
        console.warn('[release] Site API unavailable:', e?.message);
    }

    if (!localGuildId && !memberData) {
        await interaction.editReply('❌ You are not registered in any guild.');
        return;
    }

    const guildName = localGuildRecord?.name || memberData?.org_name || '';

    // Remove from local bot DB rosters
    if (localGuildId) {
        db.prepare('DELETE FROM MainRosters WHERE userId = ?').run(interaction.user.id);
        db.prepare('DELETE FROM SubRosters WHERE userId = ?').run(interaction.user.id);
        db.prepare('DELETE FROM Managers WHERE userId = ?').run(interaction.user.id);
    }

    // Sync removal to site (best-effort)
    if (memberData) {
        try {
            await releaseMember(interaction.user.id);
        } catch (e) {
            console.warn('[release] releaseMember failed:', e?.message);
        }
    }

    // Set cooldown
    setCooldown(db, interaction.user.id, guildName);

    // Remove guild Discord roles
    if (interaction.guild) {
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (member) {
            // Remove org role (if stored on site data)
            if (memberData?.discord_role_id) {
                await member.roles.remove(memberData.discord_role_id).catch(() => {});
            }
            // Remove guild name role
            if (guildName) {
                const nameRole = interaction.guild.roles.cache.find(r => r.name === guildName);
                if (nameRole) await member.roles.remove(nameRole).catch(() => {});
            }
            // Remove guild leader role if they were a leader
            const leaderGuild = db.prepare('SELECT id FROM Guilds WHERE leaderId = ?').get(interaction.user.id);
            if (leaderGuild) {
                const leaderRoleId = getSetting(db, `${interaction.guild.id}_guild_leader_role_id`) || GUILD_LEADER_ROLE_ID_DEFAULT;
                await member.roles.remove(leaderRoleId).catch(() => {});
            }
        }
    }

    // Refresh guild panel
    if (localGuildId) {
        await refreshGuildPanel(interaction.client, db, localGuildId).catch(() => {});
    }

    await interaction.editReply(`✅ You have been released from **${guildName || 'your guild'}**.`);
}
