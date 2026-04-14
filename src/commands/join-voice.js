const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join-voice')
    .setDescription('دخول قناة صوتية والبقاء فيها 24/7')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('القناة الصوتية').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');

    if (!channel.isVoiceBased()) {
      return interaction.reply({ content: '❌ يرجى اختيار قناة صوتية.', flags: 64 });
    }

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: interaction.guildId,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          connection.destroy();
        }
      });

      await interaction.reply({ content: `✅ تم الدخول إلى **${channel.name}** وسيبقى البوت فيها 24/7! 🎙️`, flags: 64 });
    } catch (err) {
      await interaction.reply({ content: `❌ فشل الدخول: ${err.message}`, flags: 64 });
    }
  }
};
