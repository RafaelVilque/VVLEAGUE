import { SlashCommandBuilder } from 'discord.js';
import { getSetting, setSetting } from '../database.js';

const STAFF_ROLE_ID_DEFAULT = '1470554662687215741';

const UNIT_MULTIPLIERS = { seconds: 1, minutes: 60, hours: 3600 };

export const data = new SlashCommandBuilder()
    .setName('setdodgecooldown')
    .setDescription('Set how long a guild is under dodge grace period after a dodge (Admin only)')
    .addIntegerOption(o => o
        .setName('duration')
        .setDescription('Duration value (e.g. 30, 24, 7)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(99999))
    .addStringOption(o => o
        .setName('unit')
        .setDescription('Unit of time')
        .setRequired(true)
        .addChoices(
            { name: 'Seconds', value: 'seconds' },
            { name: 'Minutes', value: 'minutes' },
            { name: 'Hours', value: 'hours' },
        ));

export async function execute(interaction, db) {
    await interaction.deferReply({ ephemeral: true });

    const member = await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);
    const staffRoleId = getSetting(db, `${interaction.guildId}_staff_role_id`) || STAFF_ROLE_ID_DEFAULT;
    const hasPermission = !!member?.permissions.has('Administrator') || !!member?.roles.cache.has(staffRoleId);

    if (!hasPermission) {
        await interaction.editReply({ content: '❌ You do not have permission to use this command.' });
        return;
    }

    const duration = interaction.options.getInteger('duration', true);
    const unit = interaction.options.getString('unit', true);
    const totalSeconds = duration * UNIT_MULTIPLIERS[unit];

    setSetting(db, 'dodge_cooldown_seconds', totalSeconds.toString());

    const unitLabel = duration === 1 ? unit.slice(0, -1) : unit; // remove trailing 's' if singular
    await interaction.editReply({
        content: `✅ Dodge grace period set to **${duration} ${unitLabel}**.\nFrom now on, any dodging guild will be unable to be challenged for **${duration} ${unitLabel}** after a dodge.`,
    });
}
