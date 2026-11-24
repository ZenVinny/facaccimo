export default class DiscordWebhook {

    // Discord webhooks accept browser fetch calls directly (they send
    // Access-Control-Allow-Origin: *), so no proxy is needed.
    static async send(webhookUrl, payload, retries = 1) {
        if (!webhookUrl || !/^https?:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(webhookUrl)) return false;
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), 15000) : null;
        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller ? controller.signal : undefined
            });
            if (response.status === 429 && retries > 0) {
                let wait = 1000;
                try {
                    const body = await response.json();
                    if (body && typeof body.retry_after === 'number') {
                        wait = Math.ceil(body.retry_after * 1000);
                    }
                } catch (e) { /* ignore */ }
                if (timer) clearTimeout(timer);
                await new Promise(r => setTimeout(r, wait));
                return DiscordWebhook.send(webhookUrl, payload, retries - 1);
            }
            if (!response.ok) {
                console.error('Discord webhook failed: HTTP ' + response.status);
                return false;
            }
            return true;
        } catch (e) {
            console.error('Discord webhook failed:', e && e.message ? e.message : e);
            return false;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    // Send an array of embeds, splitting into multiple messages when the
    // total would exceed Discord's 2000-character message limit.
    static async sendAll(webhookUrl, embeds) {
        if (!webhookUrl || !embeds || embeds.length === 0) return;
        const messages = [];
        let current = [];
        let currentChars = 0;
        for (const embed of embeds) {
            const fieldChars = Array.isArray(embed.fields)
                ? embed.fields.reduce((s, f) => s + String(f && f.name || '').length + String(f && f.value || '').length, 0)
                : 0;
            const embedChars = (embed.title || '').length +
                (embed.description || '').length + fieldChars + 100;
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
        const safeTitle = String(title || '').slice(0, 256);
        const safeDiff = String(diff || '').slice(0, 3900);
        const embed = {
            title: safeTitle,
            color: color || 0x5e6ad2,
            description: '```diff\n' + safeDiff.replace(/```/g, "'''") + '\n```',
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
        const title = String((series && series.title) ? series.title : (series && series.name) || 'Untitled').slice(0, 256);
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
