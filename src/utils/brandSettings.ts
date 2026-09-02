// Brand Settings helper

export function getDiscordUrl(): string {
  try {
    const custom = localStorage.getItem('valuenet_custom_discord_url');
    if (custom) return custom;
  } catch {
    // ignore
  }
  return 'https://discord.gg/np4sVrpypF';
}

export function setDiscordUrl(url: string): void {
  try {
    localStorage.setItem('valuenet_custom_discord_url', url);
  } catch {
    // ignore
  }
}
