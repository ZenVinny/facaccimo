export default class DiscordWebhook {

    // Discord webhooks accept browser fetch calls directly (they send
    // Access-Control-Allow-Origin: *), so no proxy is needed.
    static async send(webhookUrl, payload) {
        if (!webhookUrl || !/^https?:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(webhookUrl)) return;
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), 15000) : null;
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller ? controller.signal : undefined
            });
            if (!response.ok) {
                console.error('Discord webhook failed: HTTP ' + response.status);
            }
        } catch (e) {
            console.error('Discord webhook failed:', e && e.message ? e.message : e);
        } finally {
            if (timer) clearTimeout(timer);
        }
        return;
    }

    // Send an array of embeds, splitting into multiple messages when the
    // total would exceed Discord's 2000-character message limit.
    static async sendAll(webhookUrl, embeds) {
        if (!webhookUrl || !embeds || embeds.length === 0) return;
        const messages = [];
        let current = [];
        let currentChars = 0;
        for (const embed of embeds) {
            const embedChars = (embed.title || '').length +
                (embed.description || '').length + 100;
            if (current.length >= 10 || (current.length > 0 && currentChars + embedChars > 1900)) {
                messages.push(current);
                current = [];
                currentChars = 0;
            }
            current.push(embed);
            currentChars += embedChars;
        }
        if (current.length > 0) messages.push(current);
        for (const batch of messages) {
            await DiscordWebhook.send(webhookUrl, { embeds: batch });
        }
    }

    // Build one embed per changed entry. Each embed has a title (e.g.
    // "Chapter 3" or "Metadata") and a description containing a ```diff
    // code block with the old/new values.
    static buildEntryEmbed(title, diff, color, series) {
        const embed = {
            title: title,
            color: color || 0x5e6ad2,
            description: '```diff\n' + String(diff || '').replace(/```/g, "'''") + '\n```',
            timestamp: new Date().toISOString()
        };
        if (series && series.cover) {
            embed.thumbnail = { url: series.cover };
        }
        return embed;
    }

    // Build a single summary embed (no diff) for simple events.
    static buildSummaryEmbed(series, action) {
        const color = action === 'delete' ? 0xa94438 : 0x5e6ad2;
        const title = (series && series.title) ? series.title : (series && series.name) || 'Untitled';
        const chapters = series && series.chapters && typeof series.chapters === 'object' ? Object.keys(series.chapters).length : 0;
        const volumes = series && series.chapters
            ? new Set(Object.values(series.chapters).map(c => c.volume).filter(v => v !== '' && v != null)).size
            : 0;
        return {
            title: title,
            color: color,
            fields: [
                { name: 'Chapters', value: String(chapters), inline: true },
                { name: 'Volumes', value: String(volumes), inline: true },
                { name: 'Action', value: action === 'delete' ? 'Deleted' : 'Saved', inline: true }
            ],
            timestamp: new Date().toISOString(),
            thumbnail: series && series.cover ? { url: series.cover } : undefined
        };
    }
}
