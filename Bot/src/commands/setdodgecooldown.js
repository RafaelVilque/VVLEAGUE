import { SlashCommandBuilder } from 'discord.js';
import { getSetting, setSetting } from '../database.js';

const STAFF_ROLE_ID_DEFAULT = '1470554662687215741';

export const data = new SlashCommandBuilder()
    .setName('setdodgecooldown')
    .setDescription('Set how long a guild is under dodge grace period after a dodge (Admin only)')
    .addIntegerOption(o => o
        .setName('hours')
        .setDescription('Duration in hours (e.g. 24 = 1 day, 72 = 3 days)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(336));

export async function execute(interaction, db) {
    await interaction.deferReply({ ephemeral: true });

    const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
    const staffRoleId = getSetting(db, `${interaction.guildId}_staff_role_id`) || STAFF_ROLE_ID_DEFAULT;
    const hasPermission = !!member?.permissions.has('Administrator') || !!member?.roles.cache.has(staffRoleId);

    if (!hasPermission) {
        await interaction.editReply({ content: '❌ You do not have permission to use this command.' });
        return;
    }

    const hours = interaction.options.getInteger('hours', true);
    setSetting(db, 'dodge_cooldown_hours', hours.toString());

    const days = hours / 24;
    const durationStr = hours % 24 === 0 ? `${days} day${days !== 1 ? 's' : ''}` : `${hours} hour${hours !== 1 ? 's' : ''}`;

    await interaction.editReply({
        content: `✅ Dodge grace period set to **${durationStr}**.\nFrom now on, any dodging guild will be unable to be challenged for **${durationStr}** after a dodge.`,
    });
}
