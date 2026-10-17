export function config(env=process.env){
  const token=env.DISCORD_TOKEN?.trim(),application=env.DISCORD_APPLICATION_ID?.trim(),guild=env.DISCORD_GUILD_ID?.trim();
  if(!token||!/^\d{17,22}$/.test(application||'')||!/^\d{17,22}$/.test(guild||''))throw new Error('請先在 .env 填入 Bot Token、Application ID 與伺服器 ID。');
  return {token,application,guild,path:env.DISCORD_DB_PATH||'./data/careers.sqlite'};
}
