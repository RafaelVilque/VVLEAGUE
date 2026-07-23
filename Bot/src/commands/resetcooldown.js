import { SlashCommandBuilder } from 'discord.js';
import { clearCooldown, getSetting } from '../database.js';

export const data = new SlashCommandBuilder()
    .setName('resetcooldown')
    .setDescription("Reset a player's signing cooldown (staff only)")
    .addUserOption(opt =>
        opt.setName('player')
            .setDescription('The player whose cooldown to reset')
            .setRequired(true)
    );

export async function execute(interaction, db) {
    const staffRoleId = interaction.guildId ? getSetting(db, `${interaction.guildId}_staff_role_id`) : null;
    const isAdmin = interaction.memberPermissions?.has('Administrator');
    const isStaff = staffRoleId && interaction.member?.roles?.cache?.has(staffRoleId);
    if (!isAdmin && !isStaff) {
        await interaction.editReply({ content: '❌ Only staff can use this command.' });
        return;
    }

    const target = interaction.options.getUser('player');
    clearCooldown(db, target.id);
    await interaction.editReply({ content: `✅ Signing cooldown cleared for ${target}.` });
}
