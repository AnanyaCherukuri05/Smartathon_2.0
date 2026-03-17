const express = require('express');
const axios = require('axios');

const router = express.Router();

// Base (English) strings are the source of truth.
// We translate this whole bundle on-demand per requested language.
// eslint-disable-next-line import/no-unresolved
const en = require('../i18n/en.json');

const normalizeLang = (lang) => {
    if (!lang) return 'en';
    return String(lang).toLowerCase().split('-')[0];
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const bundleCache = new Map(); // lang -> { ts: number, data: object }
const pending = new Map(); // lang -> Promise<object>

const protectMustache = (text) => {
    const placeholders = [];
    const protectedText = String(text).replace(/{{\s*[^}]+\s*}}/g, (m) => {
        const token = `__KS_VAR_${placeholders.length}__`;
        placeholders.push({ token, raw: m });
        return token;
    });
    return { protectedText, placeholders };
};

const unprotectMustache = (text, placeholders) => {
    let result = String(text);
    for (const { token, raw } of placeholders) {
        result = result.split(token).join(raw);
    }
    return result;
};

const chunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

const translateBatchAzure = async ({ texts, to }) => {
    const key = process.env.AZURE_TRANSLATOR_KEY;
    const region = process.env.AZURE_TRANSLATOR_REGION;
    const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';

    if (!key || !region) {
        const err = new Error('Translation API not configured. Set AZURE_TRANSLATOR_KEY and AZURE_TRANSLATOR_REGION.');
        err.code = 'TRANSLATION_NOT_CONFIGURED';
        throw err;
    }

    const url = `${endpoint.replace(/\/$/, '')}/translate?api-version=3.0&to=${encodeURIComponent(to)}`;

    const response = await axios.post(
        url,
        texts.map((Text) => ({ Text })),
        {
            headers: {
                'Ocp-Apim-Subscription-Key': key,
                'Ocp-Apim-Subscription-Region': region,
                'Content-Type': 'application/json',
            },
            timeout: 20000,
        }
    );

    // Response shape: [{ translations: [{ text: '...', to: 'xx' }] }, ...]
    return response.data.map((item) => item?.translations?.[0]?.text ?? '');
};

const buildTranslatedBundle = async (lang) => {
    if (lang === 'en') return en;

    const entries = Object.entries(en);
    const protectedEntries = entries.map(([key, value]) => {
        const { protectedText, placeholders } = protectMustache(value);
        return { key, protectedText, placeholders };
    });

    // Azure allows arrays; keep chunks conservative.
    const chunks = chunk(protectedEntries, 80);
    const translated = [];

    for (const c of chunks) {
        const translatedChunk = await translateBatchAzure({
            texts: c.map((x) => x.protectedText),
            to: lang,
        });
        translated.push(...translatedChunk);
    }

    const out = {};
    for (let i = 0; i < protectedEntries.length; i++) {
        const { key, placeholders } = protectedEntries[i];
        out[key] = unprotectMustache(translated[i] || en[key], placeholders);
    }

    // Keep brand/title stable even if the translator tries to localize it.
    if (typeof en.app_title === 'string') out.app_title = en.app_title;

    return out;
};

router.get('/i18n/:lng', async (req, res) => {
    const lang = normalizeLang(req.params.lng);

    const cached = bundleCache.get(lang);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return res.json(cached.data);
    }

    if (pending.has(lang)) {
        try {
            const data = await pending.get(lang);
            return res.json(data);
        } catch (e) {
            return res.json(en);
        }
    }

    const work = (async () => {
        try {
            const data = await buildTranslatedBundle(lang);
            bundleCache.set(lang, { ts: Date.now(), data });
            return data;
        } catch (error) {
            console.warn('i18n translation failed; falling back to English:', error?.message || error);
            bundleCache.set(lang, { ts: Date.now(), data: en });
            return en;
        } finally {
            pending.delete(lang);
        }
    })();

    pending.set(lang, work);

    const data = await work;
    return res.json(data);
});

module.exports = router;
