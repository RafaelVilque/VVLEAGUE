import { SlashCommandBuilder } from 'discord.js';
import { releaseMember, getMemberByDiscordId } from '../siteapi.js';
import { setCooldown, getSetting, refreshGuildPanel, getGuildById } from '../database.js';

const GUILD_LEADER_ROLE_ID_DEFAULT = '1470554671944040605';

export const data = new SlashCommandBuilder()
    .setName('release')
    .setDescription('Release yourself from your current guild');

export async function execute(interaction, db) {
    const userId = interaction.user.id;

    // Check local bot DB first
    const mainEntry = db.prepare('SELECT guildId FROM MainRosters WHERE userId = ?').get(userId);
    const subEntry = db.prepare('SELECT guildId FROM SubRosters WHERE userId = ?').get(userId);
    const managerEntry = db.prepare('SELECT guildId FROM Managers WHERE userId = ?').get(userId);
    const localGuildId = mainEntry?.guildId || subEntry?.guildId || managerEntry?.guildId;
    const localGuildRecord = localGuildId ? getGuildById(db, localGuildId) : null;

    // If not in local DB, check site as fallback (player was signed outside the bot)
    let memberData = null;
    let discordGuildRecord = null;
    if (!localGuildId) {
        try {
            memberData = await getMemberByDiscordId(userId);
        } catch (e) {
            console.warn('[release] Site API unavailable:', e?.message);
        }

        // Final fallback: if user has the configured guild_member_role OR a guild name role, detect their guild
        if (!memberData && interaction.guild) {
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (member) {
                const guildMemberRoleId = getSetting(db, `${interaction.guildId}_guild_member_role_id`);
                const hasGuildMemberRole = guildMemberRoleId && member.roles.cache.has(guildMemberRoleId);
                if (hasGuildMemberRole || !guildMemberRoleId) {
                    const allGuilds = db.prepare('SELECT * FROM Guilds').all();
                    discordGuildRecord = allGuilds.find(g => member.roles.cache.some(r => r.name === g.name)) || null;
                }
            }
        }

        if (!memberData && !discordGuildRecord) {
            await interaction.editReply('❌ You are not registered in any guild.');
            return;
        }
    }

    const guildName = localGuildRecord?.name || discordGuildRecord?.name || memberData?.org_name || '';

    // Remove from local bot DB rosters
    if (localGuildId) {
        db.prepare('DELETE FROM MainRosters WHERE userId = ?').run(userId);
        db.prepare('DELETE FROM SubRosters WHERE userId = ?').run(userId);
        db.prepare('DELETE FROM Managers WHERE userId = ?').run(userId);
    }

    // Apply cooldown
    setCooldown(db, userId, guildName);

    // Sync removal to site (fire-and-forget — best effort)
    if (memberData || discordGuildRecord) {
        releaseMember(userId).catch(e => console.warn('[release] Site sync failed:', e?.message));
    }

    // Remove Discord roles
    if (interaction.guild) {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member) {
            // Remove guild name role
            if (guildName) {
                const nameRole = interaction.guild.roles.cache.find(r => r.name === guildName);
                if (nameRole) await member.roles.remove(nameRole).catch(() => {});
            }
            // Remove generic guild member role
            const guildMemberRoleId = getSetting(db, `${interaction.guild.id}_guild_member_role_id`);
            if (guildMemberRoleId) await member.roles.remove(guildMemberRoleId).catch(() => {});
            const leaderGuild = db.prepare('SELECT id FROM Guilds WHERE leaderId = ?').get(userId);
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
