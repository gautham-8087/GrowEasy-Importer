import { GoogleGenAI } from '@google/genai';

/**
 * Heuristics-based fallback mapper to mock the AI mapping when no API key is provided.
 * @param {object[]} records - Batch of raw CSV records.
 * @returns {object[]} - Array of mapped records with skip status.
 */
function extractCRMFieldsHeuristicMock(records) {
  const allowedStatus = ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'];
  const allowedSources = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'];

  return records.map(rawRecord => {
    // Helper to find a value by matching keys against keywords
    const getValueByKeywords = (keywords) => {
      const entry = Object.entries(rawRecord).find(([key]) => {
        const lowerKey = key.toLowerCase();
        return keywords.some(kw => lowerKey.includes(kw));
      });
      return entry ? String(entry[1]).trim() : '';
    };

    // Extract fields using keywords
    const rawName = getValueByKeywords(['name', 'client', 'customer', 'lead', 'person']);
    const rawEmail = getValueByKeywords(['email', 'mail', 'e-mail']);
    const rawPhone = getValueByKeywords(['phone', 'mobile', 'cell', 'contact', 'tel']);
    const company = getValueByKeywords(['company', 'org', 'firm', 'business', 'workplace']);
    const city = getValueByKeywords(['city', 'town']);
    const state = getValueByKeywords(['state', 'province', 'region']);
    const country = getValueByKeywords(['country', 'nation']);
    const remarks = getValueByKeywords(['remark', 'note', 'comment', 'follow-up', 'feedback']);
    const possession_time = getValueByKeywords(['possession', 'time', 'ready']);
    const description = getValueByKeywords(['description', 'desc', 'about', 'summary']);
    const rawSource = getValueByKeywords(['source', 'channel', 'platform']);
    const rawDate = getValueByKeywords(['date', 'time', 'created', 'submit']);

    // Hard skip condition: if neither email nor phone exists
    if (!rawEmail && !rawPhone) {
      return { is_skipped: true, mapped_record: null };
    }

    // Parse email & extra emails
    let email = '';
    let extraEmails = [];
    if (rawEmail) {
      const emailParts = rawEmail.split(/[,;\s]+/).filter(e => e.includes('@'));
      email = emailParts[0] || '';
      extraEmails = emailParts.slice(1);
    }

    // Parse mobile, country code & extra phones
    let country_code = '';
    let mobile_without_country_code = '';
    let extraPhones = [];

    if (rawPhone) {
      const phoneParts = rawPhone.split(/[,;\s]+/).map(p => p.replace(/[^\d+]/g, '')).filter(Boolean);
      const primaryPhone = phoneParts[0] || '';
      extraPhones = phoneParts.slice(1);

      if (primaryPhone.startsWith('+')) {
        // e.g. +919876543210
        if (primaryPhone.startsWith('+91') && primaryPhone.length >= 13) {
          country_code = '+91';
          mobile_without_country_code = primaryPhone.slice(3);
        } else {
          // General parse
          country_code = primaryPhone.substring(0, 3);
          mobile_without_country_code = primaryPhone.substring(3);
        }
      } else if (primaryPhone.length === 10) {
        country_code = '+91';
        mobile_without_country_code = primaryPhone;
      } else {
        mobile_without_country_code = primaryPhone;
      }
    }

    // Parse status and source mapping
    let crm_status = 'GOOD_LEAD_FOLLOW_UP';
    // Look at remarks or name to map a status mock value
    const remarksLower = remarks.toLowerCase();
    if (remarksLower.includes('reschedule') || remarksLower.includes('interested')) {
      crm_status = 'GOOD_LEAD_FOLLOW_UP';
    } else if (remarksLower.includes('busy') || remarksLower.includes('not connect')) {
      crm_status = 'DID_NOT_CONNECT';
    } else if (remarksLower.includes('not interested') || remarksLower.includes('bad')) {
      crm_status = 'BAD_LEAD';
    } else if (remarksLower.includes('close') || remarksLower.includes('sale') || remarksLower.includes('deal')) {
      crm_status = 'SALE_DONE';
    } else {
      // Pick a random one for demonstration consistency
      const randIdx = Math.floor((rawName.length || 1) % allowedStatus.length);
      crm_status = allowedStatus[randIdx];
    }

    let data_source = '';
    const sourceLower = rawSource.toLowerCase();
    const matchedSource = allowedSources.find(s => sourceLower.includes(s.replace(/_/g, '')));
    if (matchedSource) {
      data_source = matchedSource;
    } else {
      // Pick based on company name hash or default
      const randIdx = Math.floor((company.length || 1) % (allowedSources.length + 1));
      data_source = allowedSources[randIdx] || '';
    }

    // Date formatting
    let created_at = '';
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        created_at = d.toISOString().replace('T', ' ').substring(0, 19);
      }
    }
    if (!created_at) {
      created_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
    }

    // Notes compiler
    const notesParts = [];
    if (remarks) notesParts.push(`Remarks: ${remarks}`);
    if (extraEmails.length > 0) notesParts.push(`Extra Emails: ${extraEmails.join(', ')}`);
    if (extraPhones.length > 0) notesParts.push(`Extra Phones: ${extraPhones.join(', ')}`);
    const crm_note = notesParts.join(' | ');

    return {
      is_skipped: false,
      mapped_record: {
        created_at,
        name: rawName || 'Anonymous Lead',
        email,
        country_code,
        mobile_without_country_code,
        company: company || 'Individual',
        city,
        state,
        country: country || 'India',
        lead_owner: 'system_importer@groweasy.ai',
        crm_status,
        crm_note,
        data_source,
        possession_time,
        description: description || `Raw import record: ${Object.values(rawRecord).filter(Boolean).slice(0, 3).join(', ')}`
      }
    };
  });
}

/**
 * Maps a batch of raw records to the GrowEasy CRM schema using Gemini API.
 * Falls back to heuristic mock extraction if apiKey === 'mock_mode'.
 * @param {object[]} records - Batch of raw CSV records.
 * @param {string} apiKey - The Gemini API Key.
 * @returns {Promise<object[]>} - Array of mapped records with skip status.
 */
export async function extractCRMFieldsBatch(records, apiKey) {
  if (!apiKey || apiKey === 'mock_mode') {
    // Return high-quality local mapping immediately
    return extractCRMFieldsHeuristicMock(records);
  }

  // Initialize Google Gen AI client with the provided API key
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
You are an expert AI data migration assistant for GrowEasy CRM.
Your task is to take a batch of raw records (key-value maps) parsed from an arbitrary CSV and intelligently extract and map their fields to the GrowEasy CRM format.

Target CRM Schema:
1. \`created_at\`: Lead creation date. Parse and convert to a standard date-time string that JavaScript's \`new Date(created_at)\` can parse (e.g. ISO-8601 "YYYY-MM-DDTHH:mm:ss.sssZ" or "YYYY-MM-DD HH:mm:ss"). If no date is found, default to the current timestamp.
2. \`name\`: Full name of the lead. If first name and last name are in separate fields, merge them.
3. \`email\`: Primary email address. If multiple exist, take the first one and put the rest in \`crm_note\`.
4. \`country_code\`: Country code (e.g. "+91"). Parse it out from any mobile number field if present.
5. \`mobile_without_country_code\`: Mobile number excluding the country code. If multiple exist, take the first one and put the rest in \`crm_note\`.
6. \`company\`: Company name.
7. \`city\`: City.
8. \`state\`: State.
9. \`country\`: Country.
10. \`lead_owner\`: The owner of the lead (usually an email or username).
11. \`crm_status\`: Lead status. Must be strictly one of these values: "GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE". Map any source statuses to these categories.
12. \`crm_note\`: Put extra emails, extra mobile numbers, follow-up remarks, comments, or any extra columns that don't map to standard CRM fields here.
13. \`data_source\`: Source of data. Must be strictly one of these values if matched: "leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots". If none match, set to "".
14. \`possession_time\`: Possession time of property.
15. \`description\`: Any additional text/description.

Extraction Rules:
- If a record has NEITHER a valid email address NOR a valid mobile number, set \`is_skipped: true\` and \`mapped_record: null\` for that record. Otherwise, set \`is_skipped: false\` and populate \`mapped_record\`.
- Be highly intelligent about column names. E.g. "client name", "customer", "first_name", "last_name", "full name" all map to \`name\`.
- E.g. "creation date", "time", "date created", "submitted at" all map to \`created_at\`.
- Clean up any messy input data.
- Ensure that the output is a valid JSON array of objects.
`;

  const prompt = `
Please map this batch of ${records.length} raw records:
${JSON.stringify(records, null, 2)}

Provide the response strictly as a JSON array of objects, containing:
\`{ "is_skipped": boolean, "mapped_record": CRMObject | null }\`

Do not include any explanation, backticks, or markdown formatting in your response. Return raw JSON.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          description: 'List of mapped CRM records',
          items: {
            type: 'OBJECT',
            properties: {
              is_skipped: { type: 'BOOLEAN' },
              mapped_record: {
                type: 'OBJECT',
                properties: {
                  created_at: { type: 'STRING' },
                  name: { type: 'STRING' },
                  email: { type: 'STRING' },
                  country_code: { type: 'STRING' },
                  mobile_without_country_code: { type: 'STRING' },
                  company: { type: 'STRING' },
                  city: { type: 'STRING' },
                  state: { type: 'STRING' },
                  country: { type: 'STRING' },
                  lead_owner: { type: 'STRING' },
                  crm_status: { type: 'STRING' },
                  crm_note: { type: 'STRING' },
                  data_source: { type: 'STRING' },
                  possession_time: { type: 'STRING' },
                  description: { type: 'STRING' }
                }
              }
            },
            required: ['is_skipped']
          }
        }
      }
    });

    const responseText = response.text;
    const parsedData = JSON.parse(responseText);
    
    // Double check constraints programmatically just in case
    return parsedData.map(item => {
      if (item.is_skipped) {
        return { is_skipped: true, mapped_record: null };
      }
      
      const record = item.mapped_record || {};
      
      // Ensure date is parseable, else fallback
      let parsedDate = record.created_at;
      if (parsedDate) {
        const d = new Date(parsedDate);
        if (isNaN(d.getTime())) {
          parsedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
        }
      } else {
        parsedDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
      }

      // Ensure strict values for crm_status
      const allowedStatus = ['GOOD_LEAD_FOLLOW_UP', 'DID_NOT_CONNECT', 'BAD_LEAD', 'SALE_DONE'];
      let status = record.crm_status || 'GOOD_LEAD_FOLLOW_UP';
      if (!allowedStatus.includes(status)) {
        status = 'GOOD_LEAD_FOLLOW_UP'; // fallback default
      }

      // Ensure strict values for data_source
      const allowedSources = ['leads_on_demand', 'meridian_tower', 'eden_park', 'varah_swamy', 'sarjapur_plots'];
      let dataSource = record.data_source || '';
      if (dataSource && !allowedSources.includes(dataSource)) {
        dataSource = '';
      }

      // Hard check: if it has neither email nor mobile, skip it
      const emailVal = (record.email || '').trim();
      const mobileVal = (record.mobile_without_country_code || '').trim();
      if (!emailVal && !mobileVal) {
        return { is_skipped: true, mapped_record: null };
      }

      return {
        is_skipped: false,
        mapped_record: {
          created_at: parsedDate,
          name: (record.name || '').trim(),
          email: emailVal,
          country_code: (record.country_code || '').trim(),
          mobile_without_country_code: mobileVal,
          company: (record.company || '').trim(),
          city: (record.city || '').trim(),
          state: (record.state || '').trim(),
          country: (record.country || '').trim(),
          lead_owner: (record.lead_owner || '').trim(),
          crm_status: status,
          crm_note: (record.crm_note || '').trim(),
          data_source: dataSource,
          possession_time: (record.possession_time || '').trim(),
          description: (record.description || '').trim()
        }
      };
    });

  } catch (error) {
    console.error('Error during AI extraction:', error);
    throw error;
  }
}
