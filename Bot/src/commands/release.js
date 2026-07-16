import { SlashCommandBuilder } from 'discord.js';
import { releaseMember } from '../siteapi.js';
import { setCooldown, getSetting, refreshGuildPanel, getGuildById } from '../database.js';

const GUILD_LEADER_ROLE_ID_DEFAULT = '1470554671944040605';

export const data = new SlashCommandBuilder()
    .setName('release')
    .setDescription('Release yourself from your current guild');

export async function execute(interaction, db) {
    const userId = interaction.user.id;

    // Check local bot DB — this is the primary source of truth, always works offline
    const mainEntry = db.prepare('SELECT guildId FROM MainRosters WHERE userId = ?').get(userId);
    const subEntry = db.prepare('SELECT guildId FROM SubRosters WHERE userId = ?').get(userId);
    const managerEntry = db.prepare('SELECT guildId FROM Managers WHERE userId = ?').get(userId);
    const localGuildId = mainEntry?.guildId || subEntry?.guildId || managerEntry?.guildId;
    const localGuildRecord = localGuildId ? getGuildById(db, localGuildId) : null;

    if (!localGuildId) {
        await interaction.editReply('❌ You are not registered in any guild.');
        return;
    }

    const guildName = localGuildRecord?.name || '';

    // Remove from local bot DB rosters
    db.prepare('DELETE FROM MainRosters WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM SubRosters WHERE userId = ?').run(userId);
    db.prepare('DELETE FROM Managers WHERE userId = ?').run(userId);

    // Apply cooldown immediately (before site sync, so it's never skipped)
    setCooldown(db, userId, guildName);

    // Sync removal to site (best-effort, fire-and-forget — don't await to avoid blocking)
    releaseMember(userId).catch(e => console.warn('[release] Site sync failed:', e?.message));

    // Remove Discord roles
    if (interaction.guild) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member) {
            // Remove guild name role
            if (guildName) {
                const nameRole = interaction.guild.roles.cache.find(r => r.name === guildName);
                if (nameRole) await member.roles.remove(nameRole).catch(() => {});
            }
            // Remove guild leader role if they were the leader
            const leaderGuild = db.prepare('SELECT id FROM Guilds WHERE leaderId = ?').get(userId);
            if (leaderGuild) {
                const leaderRoleId = getSetting(db, `${interaction.guild.id}_guild_leader_role_id`) || GUILD_LEADER_ROLE_ID_DEFAULT;
                await member.roles.remove(leaderRoleId).catch(() => {});
            }
        }
    }

    // Refresh guild panel
    await refreshGuildPanel(interaction.client, db, localGuildId).catch(() => {});

    await interaction.editReply(`✅ You have been released from **${guildName || 'your guild'}**.`);
}
